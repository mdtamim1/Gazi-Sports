import { Request, Response } from 'express';
import db from '../config/db';
import { cacheService } from '../services/cacheService';
import jwt from 'jsonwebtoken';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { logSecurityAction } from '../utils/auditLogger';

const logOrderHistory = (
  orderId: string,
  actionType: string,
  oldValue: string | null,
  newValue: string | null,
  performedBy: string
) => {
  db.run(
    `INSERT INTO order_history (order_id, action_type, old_value, new_value, performed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [orderId, actionType, oldValue, newValue, performedBy],
    (err) => {
      if (err) {
        console.error('Failed to log order history:', err);
      }
    }
  );
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    // ✅ PERFORMANCE: Cache orders list for 30 seconds — eliminates repeat full-table scans
    const cacheKey = 'orders:all';
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return res.json({ status: 'success', data: cached, _cached: true });
    }

    // ✅ PERFORMANCE: Single query with LEFT JOIN instead of 2 separate queries + JS filter
    // Uses GROUP_CONCAT to aggregate order items per order in one DB round-trip
    const query = `
      SELECT 
        o.*,
        e.first_name as assigned_first_name, 
        e.last_name as assigned_last_name,
        GROUP_CONCAT(oi.product_name || '||' || COALESCE(oi.color,'') || '||' || COALESCE(oi.size,'') || '||' || COALESCE(oi.code,'') || '||' || COALESCE(oi.quantity,1) || '||' || COALESCE(oi.price,0), ';;') as items_concat
      FROM orders o
      LEFT JOIN employees e ON o.assigned_to = e.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'pending_sync'
      GROUP BY o.id, e.first_name, e.last_name
      ORDER BY o.created_at DESC
    `;

    db.all(query, [], (err, orderRows: any[]) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!orderRows || orderRows.length === 0) {
        return res.json({ status: 'success', data: [] });
      }

      const ordersWithItems = orderRows.map(order => {
        // Prefer stored assigned_name; fallback to joined employee name
        const storedName = order.assigned_name;
        const joinedName = order.assigned_first_name && order.assigned_last_name
          ? `${order.assigned_first_name} ${order.assigned_last_name}`.trim()
          : null;

        // Parse the concatenated items string back into an array
        const productsList = order.items_concat
          ? order.items_concat.split(';;').filter(Boolean).map((raw: string) => {
              const [name, color, size, code, quantity, price] = raw.split('||');
              return { name, color, size, code, quantity: Number(quantity), price: Number(price) };
            })
          : [];

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { items_concat: _ic, assigned_first_name: _afn, assigned_last_name: _aln, ...rest } = order;
        return {
          ...rest,
          assigned_name: storedName || joinedName,
          productsList
        };
      });

      // Cache for 30 seconds (invalidated on create/update/status change)
      cacheService.set('orders:all', ordersWithItems, 30);

      res.json({ status: 'success', data: ordersWithItems });
    });
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getOrderById = (req: Request, res: Response) => {
  const { id } = req.params;
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order: any) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }
    // Fetch order items
    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], (err, items) => {
      res.json({
        status: 'success',
        data: {
          ...order,
          productsList: items || []
        }
      });
    });
  });
};

// Fetch orders matching customer email or phone (Public / Customer Account)
export const getMyOrders = (req: Request, res: Response) => {
  const email = (req.query.email || '').toString().trim().toLowerCase();
  const phone = (req.query.phone || '').toString().trim().replace(/[^0-9]/g, '');

  if (!email && !phone) {
    return res.status(400).json({ status: 'error', message: 'Email or phone parameter is required' });
  }

  const phoneSuffix = phone.length >= 10 ? phone.slice(-10) : phone;

  db.all(
    `SELECT * FROM orders 
     WHERE (LOWER(email) = ? AND ? != '') 
        OR (LOWER(phone) = ? AND ? != '')
        OR (REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '+88', '') LIKE ? AND ? != '')
        OR (REPLACE(REPLACE(REPLACE(email, '-', ''), ' ', ''), '+88', '') LIKE ? AND ? != '')
     ORDER BY created_at DESC`,
    [email, email, email, email, `%${phoneSuffix}%`, phoneSuffix, `%${phoneSuffix}%`, phoneSuffix],
    (err, orderRows: any[]) => {
      if (err) {
        console.error('Error fetching customer orders:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!orderRows || orderRows.length === 0) {
        return res.json({ status: 'success', data: [] });
      }

      // ✅ PERFORMANCE: Only fetch items for the matching orders (not full table)
      const orderIds = orderRows.map((o: any) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (err, itemRows: any[]) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        // Build a map for O(1) lookup instead of O(n) filter per order
        const itemsByOrderId = new Map<string, any[]>();
        (itemRows || []).forEach((item: any) => {
          if (!itemsByOrderId.has(item.order_id)) itemsByOrderId.set(item.order_id, []);
          itemsByOrderId.get(item.order_id)!.push(item);
        });

        const ordersWithItems = orderRows.map((order) => {
          const items = itemsByOrderId.get(order.id) || [];
          return {
            ...order,
            productsList: items.map((item) => ({
              name: item.product_name,
              color: item.color,
              size: item.size,
              code: item.code,
              quantity: item.quantity,
              price: item.price
            }))
          };
        });

        res.json({ status: 'success', data: ordersWithItems });
      });
    }
  );
};

export const createOrder = (req: Request, res: Response) => {
  const {
    customer,
    email,
    amount,
    items,
    paymentMethod,
    storeName,
    phone,
    address,
    courier,
    city,
    thana,
    area,
    customerNote,
    shopNote,
    paymentType,
    memoNumber,
    deliveryCharge,
    discount,
    paidAmount,
    subtotal,
    productsList,
  } = req.body;

  const id = 'ORD-' + Math.floor(10000 + Math.random() * 90000);

  let initialStatus = 'pending_sync';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded) {
        initialStatus = 'processing';
      }
    } catch (_e) {
      // invalid token, default to pending_sync
    }
  }

  db.run('BEGIN TRANSACTION', (txErr) => {
    if (txErr) {
      console.error('Failed to start transaction:', txErr);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    db.run(
      `INSERT INTO orders (
        id, customer, email, amount, items, payment_method, store_name, phone, address, 
        courier, city, thana, area, customer_note, shop_note, payment_type, memo_number, 
        delivery_charge, discount, paid_amount, subtotal, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, customer, email, amount, items, paymentMethod, storeName, phone, address,
        courier, city, thana, area, customerNote, shopNote, paymentType, memoNumber,
        deliveryCharge, discount, paidAmount, subtotal, initialStatus
      ],
      function (err) {
        if (err) {
          console.error('Error inserting order:', err);
          db.run('ROLLBACK', (rbErr) => {
            if (rbErr) console.error('Error rolling back transaction:', rbErr);
          });
          return res.status(500).json({ status: 'error', message: 'Failed to create order' });
        }

        // Insert order items
        if (productsList && Array.isArray(productsList) && productsList.length > 0) {
          const stmt = db.prepare(
            `INSERT INTO order_items (order_id, product_name, color, size, code, quantity, price) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          );
          
          let hasError = false;
          let pending = productsList.length;

          productsList.forEach((item: any) => {
            stmt.run(
              [id, item.name, item.color || 'Default', item.size || 'Free Size', item.code, item.quantity, item.price],
              (runErr: any) => {
                if (runErr) {
                  console.error('Error inserting order item:', runErr);
                  hasError = true;
                }
                pending--;
                if (pending === 0) {
                  stmt.finalize((finalizeErr: any) => {
                    if (hasError || finalizeErr) {
                      db.run('ROLLBACK', (rbErr) => {
                        if (rbErr) console.error('Error rolling back transaction:', rbErr);
                      });
                      return res.status(500).json({ status: 'error', message: 'Failed to insert order items' });
                    }
                    
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        console.error('Error committing transaction:', commitErr);
                        db.run('ROLLBACK', (rbErr) => {
                          if (rbErr) console.error('Error rolling back transaction:', rbErr);
                        });
                        return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
                      }
                      cacheService.del('dashboard:stats').catch(console.error);
                      cacheService.del('orders:all');
                      const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'Customer';
                      logOrderHistory(id, 'create', null, initialStatus, performedBy);

                      // Permanently disable used coupon code
                      const appliedCoupon = req.body.couponCode || req.body.discountCode || req.body.coupon;
                      if (appliedCoupon) {
                        const cleanCode = String(appliedCoupon).trim().toUpperCase();
                        db.run(`UPDATE coupons SET status = 'used' WHERE UPPER(code) = ?`, [cleanCode]);
                        db.run(`UPDATE customer_coupons SET status = 'used' WHERE UPPER(code) = ?`, [cleanCode]);
                      }

                      // Send confirmation email asynchronously
                      sendOrderConfirmationEmail(
                        email,
                        id,
                        customer,
                        productsList || [],
                        subtotal || amount,
                        deliveryCharge || 0,
                        discount || 0,
                        amount,
                        paymentMethod || 'Cash on Delivery',
                        phone,
                        address
                      ).catch(err => console.error('Failed to send confirmation email on commit:', err));

                      res.json({ status: 'success', message: 'Order created successfully', data: { id } });
                    });
                  });
                }
              }
            );
          });
        } else {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error('Error committing transaction:', commitErr);
              db.run('ROLLBACK', (rbErr) => {
                if (rbErr) console.error('Error rolling back transaction:', rbErr);
              });
              return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
            }
            cacheService.del('dashboard:stats').catch(console.error);
            cacheService.del('orders:all').catch(console.error);
            const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'Customer';
            logOrderHistory(id, 'create', null, initialStatus, performedBy);

            // Permanently disable used coupon code
            const appliedCoupon = req.body.couponCode || req.body.discountCode || req.body.coupon;
            if (appliedCoupon) {
              const cleanCode = String(appliedCoupon).trim().toUpperCase();
              db.run(`UPDATE coupons SET status = 'used' WHERE UPPER(code) = ?`, [cleanCode]);
              db.run(`UPDATE customer_coupons SET status = 'used' WHERE UPPER(code) = ?`, [cleanCode]);
            }

            // Send confirmation email asynchronously
            sendOrderConfirmationEmail(
              email,
              id,
              customer,
              [],
              amount,
              deliveryCharge || 0,
              discount || 0,
              amount,
              paymentMethod || 'Cash on Delivery',
              phone,
              address
            ).catch(err => console.error('Failed to send confirmation email on commit:', err));

            res.json({ status: 'success', message: 'Order created successfully', data: { id } });
          });
        }
      }
    );
  });
};

export const updateOrderStatus = (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  db.get(`SELECT status FROM orders WHERE id = ?`, [id], (err, row: any) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    const oldStatus = row ? row.status : 'unknown';

    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      // Invalidate dashboard stats cache AND orders list cache
      cacheService.del('dashboard:stats').catch(console.error);
      cacheService.del('orders:all');

      const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';
      logOrderHistory(id, 'status_change', oldStatus, status, performedBy);

      const actor = (req as any).user;
      logSecurityAction(
        actor?.id || null,
        actor?.email || null,
        'ORDER_STATUS_UPDATE',
        `Order ${id} status updated from ${oldStatus} to ${status}`,
        req
      );

      res.json({ status: 'success', message: 'Order status updated' });
    });
  });
};

export const updateOrder = (req: Request, res: Response) => {
  const id = req.params.id as string;
  const {
    customer,
    email,
    amount,
    items,
    paymentMethod,
    storeName,
    phone,
    address,
    courier,
    city,
    thana,
    area,
    customerNote,
    shopNote,
    paymentType,
    memoNumber,
    deliveryCharge,
    discount,
    paidAmount,
    subtotal,
    status,
    productsList,
  } = req.body;

  db.get(`SELECT status, shop_note FROM orders WHERE id = ?`, [id], (err, oldOrder: any) => {
    if (err) {
      console.error('Error fetching old order details:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    const oldStatus = oldOrder ? oldOrder.status : 'unknown';
    const oldShopNote = oldOrder ? oldOrder.shop_note : '';

    db.run('BEGIN TRANSACTION', (txErr) => {
      if (txErr) {
        console.error('Failed to start transaction:', txErr);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      db.run(
        `UPDATE orders 
         SET customer = ?, email = ?, amount = ?, items = ?, payment_method = ?, store_name = ?, phone = ?, address = ?, 
             courier = ?, city = ?, thana = ?, area = ?, customer_note = ?, shop_note = ?, payment_type = ?, memo_number = ?, 
             delivery_charge = ?, discount = ?, paid_amount = ?, subtotal = ?, status = ?
         WHERE id = ?`,
        [
          customer, email, amount, items, paymentMethod, storeName, phone, address,
          courier, city, thana, area, customerNote, shopNote, paymentType, memoNumber,
          deliveryCharge, discount, paidAmount, subtotal, status, id
        ],
        function (err) {
          if (err) {
            console.error('Error updating order:', err);
            db.run('ROLLBACK', (rbErr) => {
              if (rbErr) console.error('Error rolling back transaction:', rbErr);
            });
            return res.status(500).json({ status: 'error', message: 'Failed to update order in database' });
          }

          // Delete existing items for the order
          db.run('DELETE FROM order_items WHERE order_id = ?', [id], (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting order items:', deleteErr);
              db.run('ROLLBACK', (rbErr) => {
                if (rbErr) console.error('Error rolling back transaction:', rbErr);
              });
              return res.status(500).json({ status: 'error', message: 'Failed to update order items' });
            }

            // Insert new order items
            if (productsList && Array.isArray(productsList) && productsList.length > 0) {
              const stmt = db.prepare(
                `INSERT INTO order_items (order_id, product_name, color, size, code, quantity, price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              );
              
              let hasError = false;
              let pending = productsList.length;

              productsList.forEach((item: any) => {
                stmt.run(
                  [id, item.name, item.color || 'Default', item.size || 'Free Size', item.code, item.quantity, item.price],
                  (runErr: any) => {
                    if (runErr) {
                      console.error('Error updating order item:', runErr);
                      hasError = true;
                    }
                    pending--;
                    if (pending === 0) {
                      stmt.finalize((finalizeErr: any) => {
                        if (hasError || finalizeErr) {
                          db.run('ROLLBACK', (rbErr) => {
                            if (rbErr) console.error('Error rolling back transaction:', rbErr);
                          });
                          return res.status(500).json({ status: 'error', message: 'Failed to insert updated order items' });
                        }

                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) {
                            console.error('Error committing transaction:', commitErr);
                            db.run('ROLLBACK', (rbErr) => {
                              if (rbErr) console.error('Error rolling back transaction:', rbErr);
                            });
                            return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
                          }
                          cacheService.del('dashboard:stats').catch(console.error);
                          cacheService.del('orders:all').catch(console.error);

                          const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';
                          if (oldStatus !== status) {
                            logOrderHistory(id, 'status_change', oldStatus, status, performedBy);
                          }
                          if (oldShopNote !== shopNote) {
                            logOrderHistory(id, 'shop_note', oldShopNote || null, shopNote || null, performedBy);
                          }

                          const actor = (req as any).user;
                          logSecurityAction(
                            actor?.id || null,
                            actor?.email || null,
                            'ORDER_UPDATE',
                            `Order ${id} updated (Customer: ${customer}, Amount: ৳${amount}, Status: ${status})`,
                            req
                          );

                          res.json({ status: 'success', message: 'Order updated successfully' });
                        });
                      });
                    }
                  }
                );
              });
            } else {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  console.error('Error committing transaction:', commitErr);
                  db.run('ROLLBACK', (rbErr) => {
                    if (rbErr) console.error('Error rolling back transaction:', rbErr);
                  });
                  return res.status(500).json({ status: 'error', message: 'Failed to commit transaction' });
                }
                cacheService.del('dashboard:stats').catch(console.error);
                cacheService.del('orders:all').catch(console.error);

                const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';
                if (oldStatus !== status) {
                  logOrderHistory(id, 'status_change', oldStatus, status, performedBy);
                }
                if (oldShopNote !== shopNote) {
                  logOrderHistory(id, 'shop_note', oldShopNote || null, shopNote || null, performedBy);
                }

                res.json({ status: 'success', message: 'Order updated successfully' });
              });
            }
          });
        }
      );
    });
  });
};

// Sync orders: round-robin assign unassigned pending_sync orders to active Moderators
// If no active Moderators are online/active, fallback to the admin who clicked the sync button
export const syncOrders = (req: Request, res: Response) => {
  // Step 1: Get all active moderators
  db.all(
    `SELECT e.id, e.first_name, e.last_name, r.name as role
     FROM employees e 
     JOIN roles r ON e.role_id = r.id 
     WHERE e.status = 'active' AND r.name = 'Moderator'
     ORDER BY e.first_name ASC`,
    [],
    (err, activeModerators: any[]) => {
      if (err) {
        console.error('Error fetching active moderators:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      // If no active moderators, fallback to the logged-in admin user
      let assignees = activeModerators || [];
      const adminUser = (req as any).user;

      if (assignees.length === 0 && adminUser) {
        const nameParts = (adminUser.name || '').split(' ');
        assignees = [{
          id: adminUser.id,
          first_name: nameParts[0] || 'Admin',
          last_name: nameParts.slice(1).join(' ') || '',
          role: adminUser.role || 'Admin'
        }];
      }

      if (assignees.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No active moderator found and admin info is also unavailable.' });
      }

      // Step 2: Get orders in 'pending_sync' status
      db.all(
        `SELECT id FROM orders WHERE status = 'pending_sync' ORDER BY created_at ASC`,
        [],
        (err, unsyncedOrders: any[]) => {
          if (err) {
            console.error('Error fetching unsynced orders:', err);
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }

          if (!unsyncedOrders || unsyncedOrders.length === 0) {
            return res.json({ status: 'success', message: 'No unsynced orders found to sync', data: { assigned: 0 } });
          }

          // Step 3: Assign and update status inside a transaction
          db.run('BEGIN TRANSACTION', (txErr) => {
            if (txErr) {
              console.error('Failed to start transaction:', txErr);
              return res.status(500).json({ status: 'error', message: 'Database error' });
            }

            let completed = 0;
            let hasError = false;
            const totalOrders = unsyncedOrders.length;
            const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';

            unsyncedOrders.forEach((order, index) => {
              const employee = assignees[index % assignees.length];
              const assignedName = `${employee.first_name} ${employee.last_name}`.trim();
              
              db.run(
                `UPDATE orders SET status = 'processing', assigned_to = ?, assigned_name = ? WHERE id = ?`,
                [employee.id, assignedName, order.id],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error updating order for sync:', updateErr);
                    hasError = true;
                  } else {
                    // Log: Order was placed & marked as processing
                    logOrderHistory(order.id, 'create', null, 'processing', performedBy);
                    // Log: status changed from pending_sync to processing
                    logOrderHistory(order.id, 'status_change', 'pending_sync', 'processing', performedBy);
                    // Log: assignment details
                    logOrderHistory(order.id, 'assignment', null, assignedName, performedBy);
                  }
                  completed++;
                  
                  if (completed === totalOrders) {
                    if (hasError) {
                      db.run('ROLLBACK', (rbErr) => {
                        if (rbErr) console.error('Error rolling back:', rbErr);
                      });
                      return res.status(500).json({ status: 'error', message: 'Failed to sync some orders' });
                    }
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        console.error('Error committing:', commitErr);
                        db.run('ROLLBACK', (rbErr) => {
                          if (rbErr) console.error('Error rolling back:', rbErr);
                        });
                        return res.status(500).json({ status: 'error', message: 'Failed to commit sync' });
                      }
                      cacheService.del('dashboard:stats').catch(console.error);
                      cacheService.del('orders:all').catch(console.error);
                      res.json({
                        status: 'success',
                        message: `${totalOrders} new order(s) synced successfully and distributed among ${assignees.length} employee(s).`,
                        data: {
                          assigned: totalOrders,
                          employees: assignees.map(m => `${m.first_name} ${m.last_name}`.trim())
                        }
                      });
                    });
                  }
                }
              );
            });
          });
        }
      );
    }
  );
};

// Assign/reassign a single order to a specific employee
// Saves assigned_name permanently so it persists even if employee goes offline
export const assignOrder = (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { assignedTo } = req.body;

  db.get(`SELECT assigned_name FROM orders WHERE id = ?`, [id], (err, orderRow: any) => {
    const oldAssigneeName = orderRow ? orderRow.assigned_name : null;

    if (assignedTo) {
      // Fetch employee name first, then update order with both ID and name
      db.get(
        `SELECT first_name, last_name FROM employees WHERE id = ?`,
        [assignedTo],
        (err, emp: any) => {
          const assignedName = emp ? `${emp.first_name} ${emp.last_name}`.trim() : null;

          db.run(
            `UPDATE orders SET assigned_to = ?, assigned_name = ? WHERE id = ?`,
            [assignedTo, assignedName, id],
            function (updateErr) {
              if (updateErr) {
                console.error('Error assigning order:', updateErr);
                return res.status(500).json({ status: 'error', message: 'Failed to assign order' });
              }
              const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';
              logOrderHistory(id, 'assignment', oldAssigneeName, assignedName, performedBy);
              
              const actor = (req as any).user;
              logSecurityAction(
                actor?.id || null,
                actor?.email || null,
                'ORDER_ASSIGN',
                `Order ${id} assigned to ${assignedName || assignedTo} (was: ${oldAssigneeName || 'unassigned'})`,
                req
              );

              cacheService.del('orders:all').catch(console.error);
              res.json({
                status: 'success',
                message: 'Order assigned successfully',
                data: { assigned_to: assignedTo, assigned_name: assignedName }
              });
            }
          );
        }
      );
    } else {
      // Unassign: clear both fields
      db.run(
        `UPDATE orders SET assigned_to = NULL, assigned_name = NULL WHERE id = ?`,
        [id],
        function (err) {
          if (err) {
            console.error('Error unassigning order:', err);
            return res.status(500).json({ status: 'error', message: 'Failed to unassign order' });
          }
          const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'System';
          logOrderHistory(id, 'assignment', oldAssigneeName, 'Unassigned', performedBy);

          const actor = (req as any).user;
          logSecurityAction(
            actor?.id || null,
            actor?.email || null,
            'ORDER_ASSIGN',
            `Order ${id} unassigned (was: ${oldAssigneeName || 'unassigned'})`,
            req
          );

          cacheService.del('orders:all').catch(console.error);
          res.json({
            status: 'success',
            message: 'Order unassigned successfully',
            data: { assigned_to: null, assigned_name: null }
          });
        }
      );
    }
  });
};

export const getOrderHistory = (req: Request, res: Response) => {
  const { id } = req.params;
  db.all(
    `SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC`,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching order history:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      res.json({ status: 'success', data: rows || [] });
    }
  );
};

// =============================================
// Steadfast Courier Entry — Create parcel in Steadfast automatically
// =============================================
export const steadfastCourierEntry = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  // Fetch the order from DB
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], async (err, order: any) => {
    if (err) {
      console.error('DB error fetching order for Steadfast entry:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // If already entered into Steadfast, return tracking info
    if (order.steadfast_entry_done === 1 || order.steadfast_entry_done === true) {
      return res.json({
        status: 'already_done',
        message: 'Order already submitted to Steadfast',
        data: {
          tracking_code: order.steadfast_tracking_code,
          steadfast_entry_done: true
        }
      });
    }

    const STEADFAST_API_KEY = process.env.STEADFAST_API_KEY;
    const STEADFAST_SECRET_KEY = process.env.STEADFAST_SECRET_KEY;

    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      return res.status(500).json({ status: 'error', message: 'Steadfast API credentials not configured in server environment.' });
    }

    // Calculate COD amount (net payable)
    const subtotal = order.subtotal || order.amount || 0;
    const deliveryCharge = order.delivery_charge || 0;
    const discount = order.discount || 0;
    const paidAmount = order.paid_amount || 0;
    const codAmount = Math.max(0, Math.round((subtotal + deliveryCharge - discount) - paidAmount));

    // Clean phone number (Steadfast expects standard 11 digits e.g. 01XXXXXXXXX)
    let cleanPhone = String(order.phone || '').trim().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('880')) {
      cleanPhone = cleanPhone.slice(2);
    }

    const recipientAddress = [order.address, order.thana, order.area, order.city]
      .filter(Boolean).join(', ') || 'Dhaka, Bangladesh';

    // Build note from order products
    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], async (itemErr, items: any[]) => {
      const productNote = (items || [])
        .map((p: any) => `${p.product_name} (x${p.quantity})`)
        .join(', ');

      const note = [
        productNote || '',
        order.customer_note ? `Note: ${order.customer_note}` : '',
        order.shop_note ? `Shop Note: ${order.shop_note}` : ''
      ].filter(Boolean).join(' | ');

      const payload = {
        invoice: id,
        recipient_name: order.customer || 'Customer',
        recipient_phone: cleanPhone,
        recipient_address: recipientAddress,
        cod_amount: codAmount,
        note: note.substring(0, 500), // Steadfast note max 500 chars
      };

      try {
        const response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
          method: 'POST',
          headers: {
            'Api-Key': STEADFAST_API_KEY,
            'Secret-Key': STEADFAST_SECRET_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json();

        if (data.status === 200 && data.consignment) {
          const trackingCode = data.consignment.tracking_code || data.consignment.consignment_id;

          // Save tracking code and mark as done
          db.run(
            `UPDATE orders SET steadfast_tracking_code = ?, steadfast_entry_done = 1 WHERE id = ?`,
            [trackingCode, id],
            (updateErr) => {
              if (updateErr) {
                console.error('Failed to save Steadfast tracking code:', updateErr);
              }
            }
          );

          // Invalidate order cache
          cacheService.del('orders:all').catch(console.error);

          // Log history
          const performedBy = (req as any).user ? `${(req as any).user.name} (${(req as any).user.role})` : 'Admin';
          logOrderHistory(id, 'steadfast_entry', null, `Tracking: ${String(trackingCode || '')}`, performedBy);

          return res.json({
            status: 'success',
            message: `Order submitted to Steadfast! Tracking: ${trackingCode}`,
            data: {
              tracking_code: trackingCode,
              steadfast_entry_done: true,
              consignment: data.consignment
            }
          });
        } else {
          let errMsg = data.message || '';
          if (data.errors && typeof data.errors === 'object') {
            const errorDetails = Object.entries(data.errors)
              .map(([field, errList]: [string, any]) => `${field}: ${Array.isArray(errList) ? errList.join(', ') : errList}`)
              .join('; ');
            errMsg = errMsg ? `${errMsg} (${errorDetails})` : errorDetails;
          } else if (typeof data.errors === 'string') {
            errMsg = data.errors;
          } else if (!errMsg) {
            errMsg = JSON.stringify(data);
          }
          console.error('Steadfast API error:', errMsg);
          return res.status(400).json({
            status: 'error',
            message: `Steadfast rejected: ${errMsg}`
          });
        }
      } catch (fetchErr) {
        console.error('Failed to call Steadfast API:', fetchErr);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to connect to Steadfast API. Please check network.'
        });
      }
    });
  });
};

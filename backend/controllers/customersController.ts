import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-premium-jwt-secret-key-1283';

// Utility helper to split a name into first and last names
const parseName = (fullName: string) => {
  const parts = fullName.trim().split(' ');
  const first_name = parts[0] || '';
  const last_name = parts.slice(1).join(' ') || '';
  return { first_name, last_name };
};

// Helper function to grant 10% Welcome Coupon and Auto-Dispatch Campaigns to new customer
export const grantNewCustomerWelcomeAndAutoCoupons = (email: string) => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Generate 10% Welcome Coupon
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const welcomeCode = `WELCOME10-${randomSuffix}`;

  // Insert code into main coupons table (single use)
  db.run(
    `INSERT INTO coupons (code, type, value, expiry, status) VALUES (?, 'percentage', 10, '2030-12-31', 'active')`,
    [welcomeCode]
  );

  // Insert code into customer_coupons
  db.run(
    `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
     VALUES (?, ?, '🎉 নিউ অ্যাকাউন্ট ওয়েলকাম ১০% ছাড় (১ম অর্ডার)', 'percentage', 10, 'active', 'welcome_gift')`,
    [cleanEmail, welcomeCode]
  );

  // 2. Check for active Auto-Dispatch Campaigns stored in system_settings
  db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'auto_dispatch_coupons'`, [], (err, row: any) => {
    if (err || !row || !row.setting_value) return;

    try {
      const activeCampaigns: any[] = JSON.parse(row.setting_value);
      if (Array.isArray(activeCampaigns) && activeCampaigns.length > 0) {
        activeCampaigns.forEach((camp) => {
          if (camp && camp.enabled && camp.code) {
            db.run(
              `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
               VALUES (?, ?, ?, ?, ?, 'active', 'admin_gift')`,
              [
                cleanEmail,
                camp.code,
                camp.title || 'বিশেষ উপহার',
                camp.discount_type || 'fixed',
                Number(camp.discount_value) || 0
              ]
            );
          }
        });
      }
    } catch (e) {
      console.error('Error parsing auto_dispatch_coupons:', e);
    }
  });
};

// Register customer
export const registerCustomer = (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'Name, email, and password are required' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ status: 'error', message: 'অ্যাকাউন্ট তৈরি করার জন্য শুধুমাত্র আসল জিমেইল (@gmail.com) অ্যাকাউন্ট ব্যবহার করা যাবে।' });
  }

  // Check if customer already exists
  db.get('SELECT id FROM customers WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Error checking customer email:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (row) {
      return res.status(400).json({ status: 'error', message: 'এই ইমেইল দিয়ে অলরেডি অ্যাকাউন্ট তৈরি করা আছে' });
    }

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: 'Error hashing password' });
      }

      const { first_name, last_name } = parseName(name);
      const customerId = `cust-${Date.now()}`;

      db.run(
        `INSERT INTO customers (id, first_name, last_name, email, password_hash, phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [customerId, first_name, last_name, email, hash, phone || ''],
        function(err) {
          if (err) {
            console.error('Error creating customer:', err);
            return res.status(500).json({ status: 'error', message: 'Failed to create customer' });
          }

          // Grant 10% Welcome Coupon & active Auto-Dispatch Campaigns to new customer
          grantNewCustomerWelcomeAndAutoCoupons(email);

          // Return JWT
          const token = jwt.sign(
            { id: customerId, email, role: 'customer', name },
            JWT_SECRET,
            { expiresIn: '30d' }
          );

          res.json({
            status: 'success',
            data: {
              token,
              customer: {
                id: customerId,
                name,
                email,
                phone: phone || '',
                address: '',
                createdAt: new Date().toISOString(),
                addresses: []
              }
            }
          });
        }
      );
    });
  });
};

// Login customer
export const loginCustomer = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ status: 'error', message: 'লগইন করার জন্য শুধুমাত্র জিমেইল (@gmail.com) অ্যাকাউন্ট ব্যবহার করা যাবে।' });
  }

  db.get('SELECT * FROM customers WHERE email = ?', [email], (err, customer: any) => {
    if (err) {
      console.error('Error login customer:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (!customer) {
      return res.status(401).json({ status: 'error', message: 'আপনার ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়' });
    }

    if (customer.status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে' });
    }

    bcrypt.compare(password, customer.password_hash, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ status: 'error', message: 'আপনার ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়' });
      }

      // Fetch customer addresses
      db.all(
        'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
        [customer.id],
        (err, rows: any[]) => {
          const addresses = (rows || []).map(r => ({
            id: r.id,
            label: r.label,
            name: r.name,
            phone: r.phone,
            address: r.address,
            isDefault: r.is_default === 1
          }));

          const fullName = `${customer.first_name} ${customer.last_name}`.trim();
          const token = jwt.sign(
            { id: customer.id, email: customer.email, role: 'customer', name: fullName },
            JWT_SECRET,
            { expiresIn: '30d' }
          );

          res.json({
            status: 'success',
            data: {
              token,
              customer: {
                id: customer.id,
                name: fullName,
                email: customer.email,
                phone: customer.phone || '',
                address: customer.address || '',
                createdAt: customer.created_at,
                avatar: fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
                addresses
              }
            }
          });
        }
      );
    });
  });
};


// Get Customer Profile details
export const getCustomerProfile = (req: any, res: Response) => {
  const customerId = req.user.id;

  db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer: any) => {
    if (err || !customer) {
      return res.status(404).json({ status: 'error', message: 'Customer profile not found' });
    }

    db.all(
      'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [customerId],
      (err, rows: any[]) => {
        const addresses = (rows || []).map(r => ({
          id: r.id,
          label: r.label,
          name: r.name,
          phone: r.phone,
          address: r.address,
          isDefault: r.is_default === 1
        }));

        const fullName = `${customer.first_name} ${customer.last_name}`.trim();
        res.json({
          status: 'success',
          data: {
            id: customer.id,
            name: fullName,
            email: customer.email,
            phone: customer.phone || '',
            address: customer.address || '',
            createdAt: customer.created_at,
            avatar: fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            addresses
          }
        });
      }
    );
  });
};

// Update Customer Profile
export const updateCustomerProfile = (req: any, res: Response) => {
  const customerId = req.user.id;
  const { name, phone, address } = req.body;

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Name is required' });
  }

  const { first_name, last_name } = parseName(name);

  db.run(
    `UPDATE customers 
     SET first_name = ?, last_name = ?, phone = ?, address = ? 
     WHERE id = ?`,
    [first_name, last_name, phone || '', address || '', customerId],
    function(err) {
      if (err) {
        console.error('Error updating customer profile:', err);
        return res.status(500).json({ status: 'error', message: 'Update failed' });
      }

      res.json({
        status: 'success',
        message: 'Profile updated successfully'
      });
    }
  );
};

// Get Customer Addresses
export const getAddresses = (req: any, res: Response) => {
  const customerId = req.user.id;

  db.all(
    'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
    [customerId],
    (err, rows: any[]) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const addresses = (rows || []).map(r => ({
        id: r.id,
        label: r.label,
        name: r.name,
        phone: r.phone,
        address: r.address,
        isDefault: r.is_default === 1
      }));

      res.json({ status: 'success', data: addresses });
    }
  );
};

// Add customer address
export const addAddress = (req: any, res: Response) => {
  const customerId = req.user.id;
  const { label, name, phone, address, isDefault } = req.body;

  if (!label || !name || !phone || !address) {
    return res.status(400).json({ status: 'error', message: 'Label, Name, Phone, and Address are required' });
  }

  const addressId = `addr-${Date.now()}`;

  // Check if this is the first address. If so, it must be default.
  db.get('SELECT COUNT(*) as count FROM customer_addresses WHERE customer_id = ?', [customerId], (err, row: any) => {
    const isFirst = !err && row && row.count === 0;
    const shouldBeDefault = isFirst ? 1 : (isDefault ? 1 : 0);

    const insertAddress = () => {
      db.run(
        `INSERT INTO customer_addresses (id, customer_id, label, name, phone, address, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [addressId, customerId, label, name, phone, address, shouldBeDefault],
        function(err) {
          if (err) {
            console.error('Error adding address:', err);
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }

          res.json({
            status: 'success',
            data: { id: addressId, label, name, phone, address, isDefault: shouldBeDefault === 1 }
          });
        }
      );
    };

    if (shouldBeDefault === 1) {
      // Set all other addresses to non-default
      db.run('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId], (err) => {
        insertAddress();
      });
    } else {
      insertAddress();
    }
  });
};

// Update customer address
export const updateAddress = (req: any, res: Response) => {
  const customerId = req.user.id;
  const addressId = req.params.id;
  const { label, name, phone, address, isDefault } = req.body;

  const runUpdate = () => {
    db.run(
      `UPDATE customer_addresses 
       SET label = ?, name = ?, phone = ?, address = ?, is_default = ?
       WHERE id = ? AND customer_id = ?`,
      [label, name, phone, address, isDefault ? 1 : 0, addressId, customerId],
      function(err) {
        if (err) {
          console.error('Error updating address:', err);
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        res.json({ status: 'success', message: 'Address updated successfully' });
      }
    );
  };

  if (isDefault) {
    db.run('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId], (err) => {
      runUpdate();
    });
  } else {
    runUpdate();
  }
};

// Delete customer address
export const deleteAddress = (req: any, res: Response) => {
  const customerId = req.user.id;
  const addressId = req.params.id;

  // Check if the address to delete is the default one
  db.get(
    'SELECT is_default FROM customer_addresses WHERE id = ? AND customer_id = ?',
    [addressId, customerId],
    (err, row: any) => {
      if (err || !row) {
        return res.status(444).json({ status: 'error', message: 'Address not found' });
      }

      const wasDefault = row.is_default === 1;

      db.run(
        'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?',
        [addressId, customerId],
        function(err) {
          if (err) {
            return res.status(500).json({ status: 'error', message: 'Database error' });
          }

          if (wasDefault) {
            // Find another address and make it default
            db.get(
              'SELECT id FROM customer_addresses WHERE customer_id = ? LIMIT 1',
              [customerId],
              (err, another: any) => {
                if (another) {
                  db.run(
                    'UPDATE customer_addresses SET is_default = 1 WHERE id = ?',
                    [another.id]
                  );
                }
              }
            );
          }

          res.json({ status: 'success', message: 'Address deleted successfully' });
        }
      );
    }
  );
};

// Set default customer address
export const setDefaultAddress = (req: any, res: Response) => {
  const customerId = req.user.id;
  const addressId = req.params.id;

  db.run('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId], (err) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    db.run(
      'UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?',
      [addressId, customerId],
      function(err) {
        if (err) {
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }

        res.json({ status: 'success', message: 'Address set as default' });
      }
    );
  });
};

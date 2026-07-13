import { Request, Response } from 'express';
import db from '../config/db';
import { sendWelcomeEmail } from '../services/emailService';

// Get all coupons
export const getCoupons = (req: Request, res: Response) => {
  db.all(`SELECT * FROM coupons ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('Failed to get coupons:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', data: rows || [] });
  });
};

// Create a new coupon code
export const createCoupon = (req: Request, res: Response) => {
  const { code, type, value, expiry } = req.body;

  if (!code || !type || value === undefined || !expiry) {
    return res.status(400).json({ status: 'error', message: 'All coupon fields are required' });
  }

  const cleanCode = code.trim().toUpperCase();

  db.run(
    `INSERT INTO coupons (code, type, value, expiry, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [cleanCode, type, Number(value), expiry],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ status: 'error', message: 'এই কুপন কোডটি ইতিমধ্যে ডাটাবেজে রয়েছে।' });
        }
        console.error('Failed to create coupon:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      res.json({
        status: 'success',
        data: {
          code: cleanCode,
          type,
          value: Number(value),
          expiry,
          status: 'active'
        }
      });
    }
  );
};

// Delete coupon
export const deleteCoupon = (req: Request, res: Response) => {
  const { code } = req.params;

  db.run(`DELETE FROM coupons WHERE code = ?`, [String(code).toUpperCase()], function (err) {
    if (err) {
      console.error('Failed to delete coupon:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', message: 'Coupon deleted successfully' });
  });
};

// Validate coupon (Customer checkout validation with strict single-use check)
export const validateCoupon = (req: Request, res: Response) => {
  const { code } = req.params;
  const email = (req.query.email || '').toString().trim().toLowerCase();

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'Coupon code is required' });
  }

  const cleanCode = String(code).trim().toUpperCase();

  db.get(`SELECT * FROM coupons WHERE UPPER(code) = ?`, [cleanCode], (err, coupon: any) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (!coupon) {
      // Fallback check in customer_coupons for user-specific gifts or spin-win coupons
      db.get(
        `SELECT * FROM customer_coupons WHERE UPPER(code) = ?`,
        [cleanCode],
        (err, custCoupon: any) => {
          if (err || !custCoupon) {
            return res.status(404).json({ status: 'error', message: 'দুঃখিত, কুপন কোডটি সঠিক নয়।' });
          }
          if (custCoupon.status === 'used') {
            return res.status(400).json({ status: 'error', message: 'এই কুপনটি আপনি ইতিপূর্বে ১ বার ব্যবহার করে ফেলেছেন!' });
          }
          return res.json({
            status: 'success',
            data: {
              code: custCoupon.code,
              type: custCoupon.discount_type || 'percentage',
              value: custCoupon.discount_value
            }
          });
        }
      );
      return;
    }

    if (coupon.status !== 'active') {
      return res.status(400).json({ status: 'error', message: 'এই কুপন কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে অথবা নিষ্ক্রিয় করা হয়েছে।' });
    }

    const expiryTime = new Date(coupon.expiry).getTime() + (24 * 3600 * 1000);
    if (expiryTime < Date.now()) {
      db.run("UPDATE coupons SET status = 'expired' WHERE UPPER(code) = ?", [cleanCode]);
      return res.status(400).json({ status: 'error', message: 'এই কুপন কোডটির মেয়াদ শেষ হয়ে গেছে।' });
    }

    // If customer email is passed, check if they have already used this specific coupon
    if (email) {
      db.get(
        `SELECT status FROM customer_coupons WHERE LOWER(customer_email) = ? AND UPPER(code) = ?`,
        [email, cleanCode],
        (err, custCoupon: any) => {
          if (custCoupon && custCoupon.status === 'used') {
            return res.status(400).json({ status: 'error', message: 'এই কুপনটি আপনি ইতিপূর্বে ১ বার ব্যবহার করে ফেলেছেন!' });
          }
          res.json({
            status: 'success',
            data: {
              code: coupon.code,
              type: coupon.type,
              value: coupon.value
            }
          });
        }
      );
    } else {
      res.json({
        status: 'success',
        data: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value
        }
      });
    }
  });
};

// Get subscribers list
export const getSubscribers = (req: Request, res: Response) => {
  db.all(`SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('Failed to get subscribers:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', data: rows || [] });
  });
};

// Public: Subscribe email
export const subscribeEmail = (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ status: 'error', message: 'সঠিক ইমেইল এড্রেস প্রদান করুন।' });
  }

  const cleanEmail = email.trim().toLowerCase();

  db.run(
    `INSERT INTO newsletter_subscribers (email, status)
     VALUES (?, 'subscribed')`,
    [cleanEmail],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ status: 'error', message: 'আপনি ইতিমধ্যে আমাদের নিউজলেটারে সাবস্ক্রাইব করেছেন!' });
        }
        console.error('Failed to subscribe email:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      // Send welcome email asynchronously (don't block response)
      sendWelcomeEmail(cleanEmail).catch(console.error);

      res.json({ status: 'success', message: 'নিউজলেটার সাবস্ক্রিপশন সফল হয়েছে! ধন্যবাদ।' });
    }
  );
};

// Delete subscriber from log
export const deleteSubscriber = (req: Request, res: Response) => {
  const { id } = req.params;

  db.run(`DELETE FROM newsletter_subscribers WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Failed to delete subscriber:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', message: 'Subscriber removed' });
  });
};

// Get all campaigns from SQLite database
export const getCampaigns = (req: Request, res: Response) => {
  db.all(`SELECT * FROM campaigns`, [], (err, rows: any[]) => {
    if (err) {
      console.error('Failed to get campaigns:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    const mapped = (rows || []).map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      sent: Number(r.sent || 0),
      opened: Number(r.opened || 0),
      clicked: Number(r.clicked || 0),
      converted: Number(r.converted || 0),
      revenue: Number(r.revenue || 0.0),
      startDate: r.start_date || '',
      endDate: r.end_date || '',
      productIds: r.product_ids ? r.product_ids.split(',').filter(Boolean) : []
    }));
    res.json({ status: 'success', data: mapped });
  });
};

// Create a new campaign inside SQLite database
export const createCampaign = (req: Request, res: Response) => {
  const { id, name, type, status, sent, opened, clicked, converted, revenue, startDate, endDate, productIds } = req.body;

  if (!id || !name || !type) {
    return res.status(400).json({ status: 'error', message: 'Campaign ID, name, and type are required' });
  }

  const productIdsStr = Array.isArray(productIds) ? productIds.join(',') : '';

  db.run(
    `INSERT INTO campaigns (id, name, type, status, sent, opened, clicked, converted, revenue, start_date, end_date, product_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      type,
      status || 'active',
      sent || 0,
      opened || 0,
      clicked || 0,
      converted || 0,
      revenue || 0.0,
      startDate || '',
      endDate || '',
      productIdsStr
    ],
    function (err) {
      if (err) {
        console.error('Failed to create campaign:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      res.json({ 
        status: 'success', 
        data: { 
          id, name, type, status: status || 'active', sent: sent || 0, opened: opened || 0, clicked: clicked || 0, converted: converted || 0, revenue: revenue || 0.0, startDate, endDate, productIds 
        } 
      });
    }
  );
};

// Update campaign status in SQLite database
export const updateCampaign = (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ status: 'error', message: 'Status is required' });
  }

  db.run(`UPDATE campaigns SET status = ? WHERE id = ?`, [status, id], function (err) {
    if (err) {
      console.error('Failed to update campaign:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', message: 'Campaign status updated' });
  });
};

// Delete campaign from SQLite database
export const deleteCampaign = (req: Request, res: Response) => {
  const { id } = req.params;

  db.run(`DELETE FROM campaigns WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Failed to delete campaign:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    res.json({ status: 'success', message: 'Campaign deleted' });
  });
};

const DEFAULT_SPIN_WHEEL_CONFIG = {
  enabled: true,
  title: 'ঘুরে জিতুন স্পেশাল ডিসকাউন্ট!',
  subtitle: 'আজকের সৌভাগ্যজনক কুপন কোড জিততে চাকাটি ঘোরান!',
  respin_order_count_required: 1,
  slices: [
    { id: '1', label: '10% OFF', coupon_code: 'SPIN10', type: 'percentage', value: 10, weight: 40, color: '#7c3aed' },
    { id: '2', label: '৳100 OFF', coupon_code: 'SPIN100', type: 'fixed', value: 100, weight: 30, color: '#059669' },
    { id: '3', label: '15% OFF', coupon_code: 'VIP15', type: 'percentage', value: 15, weight: 15, color: '#d97706' },
    { id: '4', label: 'Free Delivery', coupon_code: 'FREEDEL', type: 'fixed', value: 60, weight: 10, color: '#e11d48' },
    { id: '5', label: '25% MEGA', coupon_code: 'MEGA25', type: 'percentage', value: 25, weight: 5, color: '#2563eb' }
  ]
};

export const getSpinWheelConfig = (req: Request, res: Response) => {
  db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'spin_wheel_settings'`, [], (err, row: any) => {
    if (err) {
      console.error('Error fetching spin wheel config:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    if (!row || !row.setting_value) {
      return res.json({ status: 'success', data: DEFAULT_SPIN_WHEEL_CONFIG });
    }

    try {
      const config = JSON.parse(row.setting_value);
      return res.json({ status: 'success', data: { ...DEFAULT_SPIN_WHEEL_CONFIG, ...config } });
    } catch (e) {
      return res.json({ status: 'success', data: DEFAULT_SPIN_WHEEL_CONFIG });
    }
  });
};

export const spinWheelPlay = (req: Request, res: Response) => {
  const customerEmail = (req.body?.customer_email || req.body?.email || '').trim().toLowerCase();

  // Enforce strict 1 spin per customer account / email
  if (customerEmail) {
    db.get(
      `SELECT id FROM customer_coupons WHERE LOWER(customer_email) = ? AND source = 'spin_wheel'`,
      [customerEmail],
      (checkErr, existingClaim: any) => {
        if (existingClaim) {
          return res.status(400).json({
            status: 'error',
            message: 'আপনি এই অ্যাকাউন্ট দিয়ে ইতিপূর্বে ১ বার স্পিন হুইল ব্যবহার করেছেন। প্রতি অ্যাকাউন্টে ১ বারই স্পিন প্রযোজ্য।'
          });
        }
        processSpin();
      }
    );
  } else {
    processSpin();
  }

  function processSpin() {
    db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'spin_wheel_settings'`, [], (err, row: any) => {
      let config = DEFAULT_SPIN_WHEEL_CONFIG;
      if (row && row.setting_value) {
        try {
          config = { ...DEFAULT_SPIN_WHEEL_CONFIG, ...JSON.parse(row.setting_value) };
        } catch (e) {}
      }

      if (!config.enabled || !config.slices || config.slices.length === 0) {
        return res.status(400).json({ status: 'error', message: 'স্পিন হুইল অফার আপাতত বন্ধ রয়েছে।' });
      }

      const totalWeight = config.slices.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0), 0);
      if (totalWeight <= 0) {
        const defaultSlice = config.slices[0];
        return res.json({ status: 'success', data: defaultSlice, winningIndex: 0 });
      }

      let randomWeight = Math.random() * totalWeight;
      let winningIndex = 0;

      for (let i = 0; i < config.slices.length; i++) {
        const sliceWeight = Number(config.slices[i].weight) || 0;
        if (randomWeight < sliceWeight) {
          winningIndex = i;
          break;
        }
        randomWeight -= sliceWeight;
      }

      const winningSlice = config.slices[winningIndex];

      // Generate Unique Single-Use Coupon Code
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const baseCode = (winningSlice.coupon_code || 'SPIN').toUpperCase();
      const uniqueCouponCode = `${baseCode}-${randomSuffix}`;

      // Insert single-use coupon into coupons table
      db.run(
        `INSERT INTO coupons (code, type, value, expiry, status) VALUES (?, ?, ?, '2030-12-31', 'active')`,
        [uniqueCouponCode, winningSlice.type || 'percentage', Number(winningSlice.value) || 10]
      );

      // Save coupon to Customer Account if email is provided
      if (customerEmail) {
        db.run(
          `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
           VALUES (?, ?, ?, ?, ?, 'active', 'spin_wheel')`,
          [
            customerEmail,
            uniqueCouponCode,
            winningSlice.label,
            winningSlice.type || 'percentage',
            Number(winningSlice.value) || 10
          ]
        );
      }

      return res.json({
        status: 'success',
        data: {
          ...winningSlice,
          coupon_code: uniqueCouponCode
        },
        winningIndex
      });
    });
  }
};

export const updateSpinWheelConfig = (req: Request, res: Response) => {
  const { enabled, title, subtitle, respin_order_count_required, slices } = req.body;

  const newConfig = {
    enabled: enabled !== undefined ? Boolean(enabled) : true,
    title: title || DEFAULT_SPIN_WHEEL_CONFIG.title,
    subtitle: subtitle || DEFAULT_SPIN_WHEEL_CONFIG.subtitle,
    respin_order_count_required: Number(respin_order_count_required) || 1,
    slices: Array.isArray(slices) ? slices : DEFAULT_SPIN_WHEEL_CONFIG.slices
  };

  const jsonVal = JSON.stringify(newConfig);

  db.run(
    `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, group_name, is_public)
     VALUES ('spin_wheel_settings', ?, 'marketing', 1)`,
    [jsonVal],
    function (err) {
      if (err) {
        console.error('Failed to update spin wheel config:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      res.json({ status: 'success', message: 'স্পিন হুইল সেটিংস সফলভাবে সেভ করা হয়েছে!', data: newConfig });
    }
  );
};

// Get Customer Coupons for Account Dashboard
export const getCustomerCoupons = (req: Request, res: Response) => {
  const email = (req.query.email || '').toString().trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Customer email is required' });
  }

  // 1. Fetch user's individual coupons from customer_coupons
  db.all(
    `SELECT * FROM customer_coupons WHERE LOWER(customer_email) = ? ORDER BY created_at DESC`,
    [email],
    (err, userRows: any[]) => {
      if (err) {
        console.error('Failed to fetch customer coupons:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      let couponsList: any[] = userRows || [];

      // Check if a welcome gift coupon already exists for this email
      const hasWelcomeGift = couponsList.some(c => c.source === 'welcome_gift' || (c.code || '').toUpperCase().startsWith('WELCOME10'));

      if (!hasWelcomeGift) {
        // Auto-generate unique 10% Welcome Coupon on the fly for this customer
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const welcomeCode = `WELCOME10-${randomSuffix}`;
        const welcomeTitle = '🎉 নিউ অ্যাকাউন্ট ওয়েলকাম ১০% ছাড় (১ম অর্ডার)';

        db.run(
          `INSERT INTO coupons (code, type, value, expiry, status) VALUES (?, 'percentage', 10, '2030-12-31', 'active')`,
          [welcomeCode]
        );

        db.run(
          `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
           VALUES (?, ?, ?, 'percentage', 10, 'active', 'welcome_gift')`,
          [email, welcomeCode, welcomeTitle]
        );

        couponsList.unshift({
          customer_email: email,
          code: welcomeCode,
          title: welcomeTitle,
          discount_type: 'percentage',
          discount_value: 10,
          status: 'active',
          source: 'welcome_gift',
          created_at: new Date().toISOString()
        });
      }

      // 2. ALSO auto-sync active global auto-dispatch campaigns from system_settings
      db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'auto_dispatch_coupons'`, [], (err, settingRow: any) => {
        if (!err && settingRow && settingRow.setting_value) {
          try {
            const activeCampaigns: any[] = JSON.parse(settingRow.setting_value);
            if (Array.isArray(activeCampaigns) && activeCampaigns.length > 0) {
              const existingCodes = new Set(couponsList.map((c) => (c.code || '').toUpperCase()));

              activeCampaigns.forEach((camp) => {
                if (camp && camp.enabled && camp.code) {
                  const cleanCode = camp.code.trim().toUpperCase();
                  if (!existingCodes.has(cleanCode)) {
                    // Deposit campaign on the fly for this customer
                    db.run(
                      `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
                       VALUES (?, ?, ?, ?, ?, 'active', 'admin_gift')`,
                      [
                        email,
                        cleanCode,
                        camp.title || 'বিশেষ উপহার',
                        camp.discount_type || 'fixed',
                        Number(camp.discount_value) || 0
                      ]
                    );

                    couponsList.unshift({
                      customer_email: email,
                      code: cleanCode,
                      title: camp.title || 'বিশেষ উপহার',
                      discount_type: camp.discount_type || 'fixed',
                      discount_value: Number(camp.discount_value) || 0,
                      status: 'active',
                      source: 'admin_gift',
                      created_at: new Date().toISOString()
                    });
                  }
                }
              });
            }
          } catch (e) {
            console.error('Error parsing auto_dispatch_coupons:', e);
          }
        }

        res.json({ status: 'success', data: couponsList });
      });
    }
  );
};

// Admin Direct Coupon Dispatcher (Extra Task & Auto-Dispatch)
export const dispatchDirectCoupon = (req: Request, res: Response) => {
  const { title, code, discount_type, discount_value, target, customer_email, auto_enroll_future } = req.body;

  if (!title || !code || discount_value === undefined) {
    return res.status(400).json({ status: 'error', message: 'কুপনের শিরোনাম, কোড এবং ছাড়ের পরিমাণ বাধ্যতামূলক।' });
  }

  const cleanCode = String(code).trim().toUpperCase();
  const type = discount_type || 'percentage';
  const val = Number(discount_value);

  // Default auto_enroll_future to TRUE when target === 'all' to ensure every customer receives it
  const shouldAutoEnroll = auto_enroll_future !== undefined ? Boolean(auto_enroll_future) : (target === 'all');

  // Insert code into main coupons table
  db.run(
    `INSERT OR REPLACE INTO coupons (code, type, value, expiry, status) VALUES (?, ?, ?, '2030-12-31', 'active')`,
    [cleanCode, type, val]
  );

  // If auto_enroll_future or target === 'all', save campaign to auto_dispatch_coupons in system_settings
  if (shouldAutoEnroll) {
    db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'auto_dispatch_coupons'`, [], (err, row: any) => {
      let existingCampaigns: any[] = [];
      if (row && row.setting_value) {
        try {
          existingCampaigns = JSON.parse(row.setting_value);
        } catch (e) {}
      }

      const newCampaign = {
        id: `auto-${Date.now()}`,
        title,
        code: cleanCode,
        discount_type: type,
        discount_value: val,
        enabled: true,
        created_at: new Date().toISOString()
      };

      // Filter out duplicate code
      existingCampaigns = existingCampaigns.filter((c: any) => c.code !== cleanCode);
      existingCampaigns.unshift(newCampaign);

      const jsonVal = JSON.stringify(existingCampaigns);
      db.run(
        `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, group_name, is_public)
         VALUES ('auto_dispatch_coupons', ?, 'marketing', 1)`,
        [jsonVal]
      );
    });
  }

  if (target === 'specific' && customer_email) {
    const email = String(customer_email).trim().toLowerCase();
    db.run(
      `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
       VALUES (?, ?, ?, ?, ?, 'active', 'admin_gift')`,
      [email, cleanCode, title, type, val],
      (err) => {
        if (err) {
          console.error('Failed to dispatch coupon:', err);
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }
        res.json({ status: 'success', message: `কুপন কোডটি ${email} একাউন্টে পাঠানো হয়েছে!` });
      }
    );
  } else {
    // Dispatch to ALL registered customers
    db.all(`SELECT email FROM customers`, [], (err, rows: any[]) => {
      if (err || !rows || rows.length === 0) {
        return res.json({ status: 'success', message: 'কুপন ডাটাবেজে তৈরি হয়েছে এবং কাস্টমার একাউন্টগুলোর জন্য অন করা হয়েছে!' });
      }

      rows.forEach((c) => {
        if (c.email) {
          db.run(
            `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
             VALUES (?, ?, ?, ?, ?, 'active', 'admin_gift')`,
            [c.email.trim().toLowerCase(), cleanCode, title, type, val]
          );
        }
      });

      const autoMsg = shouldAutoEnroll ? ' এবং সকল কাস্টমার একাউন্টে স্বয়ংক্রিয়ভাবে অন করা হয়েছে!' : '';
      res.json({ status: 'success', message: `সকল কাস্টমারের একাউন্টে কুপন পাঠানো হয়েছে${autoMsg}` });
    });
  }
};

// Fetch Auto-Dispatch Campaigns (Admin)
export const getAutoDispatchCoupons = (req: Request, res: Response) => {
  db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'auto_dispatch_coupons'`, [], (err, row: any) => {
    if (err || !row || !row.setting_value) {
      return res.json({ status: 'success', data: [] });
    }
    try {
      const data = JSON.parse(row.setting_value);
      return res.json({ status: 'success', data: Array.isArray(data) ? data : [] });
    } catch (e) {
      return res.json({ status: 'success', data: [] });
    }
  });
};

// Delete/Stop Auto-Dispatch Campaign (Admin)
export const deleteAutoDispatchCoupon = (req: Request, res: Response) => {
  const { id } = req.params;

  db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'auto_dispatch_coupons'`, [], (err, row: any) => {
    if (err || !row || !row.setting_value) {
      return res.json({ status: 'success', message: 'ক্যাম্পেইন রিমুভ করা হয়েছে' });
    }
    try {
      let existingCampaigns: any[] = JSON.parse(row.setting_value);
      existingCampaigns = existingCampaigns.filter((c: any) => c.id !== id);
      const jsonVal = JSON.stringify(existingCampaigns);

      db.run(
        `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, group_name, is_public)
         VALUES ('auto_dispatch_coupons', ?, 'marketing', 1)`,
        [jsonVal],
        function (err) {
          if (err) return res.status(500).json({ status: 'error', message: 'Database error' });
          res.json({ status: 'success', message: 'অটো-ডিচপ্যাচ ক্যাম্পেইন বন্ধ করা হয়েছে!' });
        }
      );
    } catch (e) {
      return res.status(500).json({ status: 'error', message: 'Failed to update' });
    }
  });
};

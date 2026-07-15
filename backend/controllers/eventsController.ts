import { Request, Response } from 'express';
import db from '../config/db';

// Get all events
export const getEvents = (req: Request, res: Response) => {
  db.all('SELECT * FROM events ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to fetch events' });
    }
    res.json({ status: 'success', data: rows });
  });
};

// Create an event (Admin only)
export const createEvent = (req: Request, res: Response) => {
  const { title, description, reward_coupon_code, start_date, end_date, image_url, video_url, quiz_data, discount_value, status } = req.body;

  if (!title || !reward_coupon_code) {
    return res.status(400).json({ status: 'error', message: 'Title and Reward Coupon Code are required' });
  }

  const id = `EVT-${Date.now()}`;
  const finalDiscountValue = parseInt(discount_value, 10) || 15;
  const finalQuizData = typeof quiz_data === 'string' ? quiz_data : JSON.stringify(quiz_data || []);

  db.run(
    `INSERT INTO events (id, title, description, reward_coupon_code, start_date, end_date, image_url, video_url, quiz_data, discount_value, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      description || '',
      reward_coupon_code.trim().toUpperCase(),
      start_date || new Date().toISOString().split('T')[0],
      end_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      image_url || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
      video_url || '',
      finalQuizData,
      finalDiscountValue,
      status || 'active'
    ],
    function (err) {
      if (err) {
        console.error('Error creating event:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to create event' });
      }

      // Automatically register coupon code in main coupons table with the configured discount value
      db.run(
        `INSERT OR REPLACE INTO coupons (code, type, value, expiry, status) VALUES (?, 'percentage', ?, '2030-12-31', 'active')`,
        [reward_coupon_code.trim().toUpperCase(), finalDiscountValue]
      );

      res.json({
        status: 'success',
        message: 'Event created successfully',
        data: { id, title, description, reward_coupon_code, start_date, end_date, image_url, video_url, quiz_data: finalQuizData, discount_value: finalDiscountValue, status }
      });
    }
  );
};

// Delete an event (Admin only)
export const deleteEvent = (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM events WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting event:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to delete event' });
    }
    res.json({ status: 'success', message: 'Event deleted successfully' });
  });
};

// Get achievements for active customer
export const getCustomerAchievements = (req: Request, res: Response) => {
  const customerEmail = req.query.email as string;

  if (!customerEmail) {
    return res.status(400).json({ status: 'error', message: 'Customer email query param is required' });
  }

  db.all(
    `SELECT ce.*, e.title as event_title, e.description as event_description 
     FROM customer_events ce
     JOIN events e ON ce.event_id = e.id
     WHERE ce.customer_email = ?`,
    [customerEmail.trim().toLowerCase()],
    (err, rows) => {
      if (err) {
        console.error('Error fetching customer achievements:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to fetch achievements' });
      }
      res.json({ status: 'success', data: rows });
    }
  );
};

// Add achievement / unlock coupon
export const addCustomerAchievement = (req: Request, res: Response) => {
  const { eventId, customerEmail } = req.body;

  if (!eventId || !customerEmail) {
    return res.status(400).json({ status: 'error', message: 'Event ID and Customer Email are required' });
  }

  const cleanEmail = customerEmail.trim().toLowerCase();

  // Enforce Gmail validation
  if (!cleanEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ status: 'error', message: 'ইভেন্ট রিওয়ার্ড পাওয়ার জন্য শুধুমাত্র জিমেইল (@gmail.com) ব্যবহার করতে হবে।' });
  }

  // 1. Fetch event detail
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event: any) => {
    if (err || !event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }

    // 2. Check if already achieved
    db.get(
      'SELECT id FROM customer_events WHERE customer_email = ? AND event_id = ?',
      [cleanEmail, eventId],
      (err, exists) => {
        if (err) {
          return res.status(500).json({ status: 'error', message: 'Database error' });
        }
        if (exists) {
          return res.status(400).json({ status: 'error', message: 'আপনি ইতিমধ্যে এই ইভেন্টের পুরস্কার ক্লেইম করেছেন।' });
        }

        // 3. Add to customer_events
        db.run(
          `INSERT INTO customer_events (customer_email, event_id, status, reward_code)
           VALUES (?, ?, 'achieved', ?)`,
          [cleanEmail, eventId, event.reward_coupon_code],
          function (err) {
            if (err) {
              console.error('Error recording achievement:', err);
              return res.status(500).json({ status: 'error', message: 'Failed to record achievement' });
            }

            // 4. Fetch the discount value from coupons table or fallback to event's discount_value
            db.get('SELECT * FROM coupons WHERE code = ?', [event.reward_coupon_code], (err, cp: any) => {
              const discType = cp?.type || 'percentage';
              const discVal = cp?.value || event.discount_value || 15;

              // 5. Add to customer_coupons
              db.run(
                `INSERT INTO customer_coupons (customer_email, code, title, discount_type, discount_value, status, source)
                 VALUES (?, ?, ?, ?, ?, 'active', 'event_achievement')`,
                [
                  cleanEmail,
                  event.reward_coupon_code,
                  `🏆 ইভেন্ট পুরস্কার: ${event.title}`,
                  discType,
                  discVal
                ],
                (err) => {
                  if (err) {
                    console.error('Error crediting coupon:', err);
                  }
                  
                  res.json({
                    status: 'success',
                    message: 'Congratulations! Achievement saved and reward credited.',
                    data: {
                      reward_code: event.reward_coupon_code,
                      event_title: event.title
                    }
                  });
                }
              );
            });
          }
        );
      }
    );
  });
};

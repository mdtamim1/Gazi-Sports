import { Request, Response } from 'express';
import db from '../config/db';

export const getChatHistory = (req: Request, res: Response) => {
  db.all('SELECT * FROM support_messages ORDER BY created_at ASC', [], (err, rows: any[]) => {
    if (err) {
      console.error('Failed to load support message logs:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    const chats = (rows || []).map(row => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      sender: row.sender,
      message: row.message,
      read: row.read === 1,
      timestamp: row.created_at
    }));

    res.json({ status: 'success', data: chats });
  });
};

export const markAsRead = (req: Request, res: Response) => {
  const { customerId } = req.params;

  db.run(
    `UPDATE support_messages 
     SET read = 1 
     WHERE customer_id = ? AND sender = 'customer' AND read = 0`,
    [customerId],
    function (err) {
      if (err) {
        console.error(`Failed to mark chats as read for customer ${customerId}:`, err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      res.json({ status: 'success', message: 'Messages marked as read' });
    }
  );
};

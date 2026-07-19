import { Request, Response } from 'express';
import db from '../config/db';
import { wssInstance } from '../websocket/chatSocket';

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

// HTTP fallback: send a chat message (used when WebSocket is unavailable)
export const sendChatMessage = (req: Request, res: Response) => {
  const { customerId, customerName, sender, message } = req.body;
  if (!customerId || !message) {
    return res.status(400).json({ status: 'error', message: 'customerId and message are required' });
  }

  const id = `msg-${Date.now()}`;
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO support_messages (id, customer_id, customer_name, sender, message, read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, customerId, customerName || 'Customer', sender || 'customer', message, timestamp],
    function (err) {
      if (err) {
        console.error('Failed to save HTTP chat message:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const msgPayload = JSON.stringify({
        type: 'message',
        data: { id, customerId, customerName: customerName || 'Customer', sender: sender || 'customer', message, timestamp, read: false }
      });

      // Broadcast to all connected WebSocket clients (admin panel)
      if (wssInstance) {
        wssInstance.clients.forEach((client: any) => {
          if (client.readyState === 1) client.send(msgPayload);
        });
      }

      res.json({ status: 'success', data: { id, customerId, customerName, sender, message, timestamp, read: false } });
    }
  );
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

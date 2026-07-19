import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import db from '../config/db';

export let wssInstance: WebSocketServer | null = null;

export const initChatSocket = (server: Server) => {
  const wss = new WebSocketServer({ noServer: true });
  wssInstance = wss;

  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    const pathname = url.pathname;

    if (pathname === '/ws/chat') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 New support chat WebSocket connection established.');

    ws.on('message', (messageData) => {
      try {
        const payload = JSON.parse(messageData.toString());

        if (payload.type === 'message') {
          const { customerId, customerName, sender, message } = payload;
          const id = `msg-${Date.now()}`;
          const timestamp = new Date().toISOString();

          // Save message to SQLite
          db.run(
            `INSERT INTO support_messages (id, customer_id, customer_name, sender, message, read, created_at)
             VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [id, customerId, customerName, sender, message, timestamp],
            (err) => {
              if (err) {
                console.error('Failed to save support chat message in SQLite:', err);
              }
            }
          );

          // Broadcast message to all active client sockets
          const response = JSON.stringify({
            type: 'message',
            data: {
              id,
              customerId,
              customerName,
              sender,
              message,
              timestamp,
              read: false
            }
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(response);
            }
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message content:', err);
      }
    });

    ws.on('close', () => {
      console.log('❌ Support chat WebSocket connection closed.');
    });
  });
};

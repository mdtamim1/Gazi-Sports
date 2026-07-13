"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initChatSocket = void 0;
const ws_1 = require("ws");
const db_1 = __importDefault(require("../config/db"));
const initChatSocket = (server) => {
    const wss = new ws_1.WebSocketServer({ noServer: true });
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
    wss.on('connection', (ws) => {
        console.log('🔌 New support chat WebSocket connection established.');
        ws.on('message', async (messageData) => {
            try {
                const payload = JSON.parse(messageData.toString());
                if (payload.type === 'message') {
                    const { customerId, customerName, sender, message } = payload;
                    const id = `msg-${Date.now()}`;
                    const timestamp = new Date().toISOString();
                    // Save message to Firestore
                    await db_1.default.collection('support_messages').doc(id).set({
                        customer_id: customerId,
                        customer_name: customerName || 'Guest',
                        sender,
                        message,
                        read: false,
                        created_at: timestamp
                    });
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
                        if (client.readyState === ws_1.WebSocket.OPEN) {
                            client.send(response);
                        }
                    });
                }
            }
            catch (err) {
                console.error('Error parsing/saving WebSocket message content:', err);
            }
        });
        ws.on('close', () => {
            console.log('❌ Support chat WebSocket connection closed.');
        });
    });
};
exports.initChatSocket = initChatSocket;
//# sourceMappingURL=chatSocket.js.map
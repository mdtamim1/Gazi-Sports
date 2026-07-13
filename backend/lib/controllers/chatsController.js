"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChatMessage = exports.markAsRead = exports.getChatHistory = void 0;
const db_1 = __importDefault(require("../config/db"));
const getChatHistory = async (req, res) => {
    try {
        const messagesSnapshot = await db_1.default.collection('support_messages').orderBy('created_at', 'asc').get();
        const chats = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerId: data.customer_id,
                customerName: data.customer_name,
                sender: data.sender,
                message: data.message,
                read: !!data.read,
                timestamp: data.created_at
            };
        });
        res.json({ status: 'success', data: chats });
    }
    catch (error) {
        console.error('Failed to load support message logs:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getChatHistory = getChatHistory;
const markAsRead = async (req, res) => {
    const { customerId } = req.params;
    try {
        const messagesSnapshot = await db_1.default.collection('support_messages')
            .where('customer_id', '==', customerId)
            .where('sender', '==', 'customer')
            .where('read', '==', false)
            .get();
        const batch = db_1.default.batch();
        messagesSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        res.json({ status: 'success', message: 'Messages marked as read' });
    }
    catch (error) {
        console.error(`Failed to mark chats as read for customer ${customerId}:`, error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.markAsRead = markAsRead;
const sendChatMessage = async (req, res) => {
    const { customerId, customerName, sender, message } = req.body;
    if (!customerId || !sender || !message) {
        return res.status(400).json({ status: 'error', message: 'Missing required chat message parameters' });
    }
    try {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const msgData = {
            customer_id: customerId,
            customer_name: customerName || 'Guest',
            sender,
            message,
            read: false,
            created_at: new Date().toISOString()
        };
        await db_1.default.collection('support_messages').doc(messageId).set(msgData);
        res.json({
            status: 'success',
            data: {
                id: messageId,
                customerId: msgData.customer_id,
                customerName: msgData.customer_name,
                sender: msgData.sender,
                message: msgData.message,
                read: msgData.read,
                timestamp: msgData.created_at
            }
        });
    }
    catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.sendChatMessage = sendChatMessage;
//# sourceMappingURL=chatsController.js.map
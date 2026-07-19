import { Router } from 'express';
import { getChatHistory, markAsRead, sendChatMessage } from '../controllers/chatsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Retrieve full support logs (admin only)
router.get('/', authenticateToken, getChatHistory);

// HTTP fallback: customer sends message (no auth needed — customer is not admin)
router.post('/send', sendChatMessage);

// Sync read flag status
router.put('/read/:customerId', authenticateToken, markAsRead);

export default router;

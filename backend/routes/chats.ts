import { Router } from 'express';
import { getChatHistory, markAsRead } from '../controllers/chatsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Retrieve full support logs
router.get('/', authenticateToken, getChatHistory);

// Sync read flag status
router.put('/read/:customerId', authenticateToken, markAsRead);

export default router;

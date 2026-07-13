import { Router } from 'express';
import { getAnalyticsStats } from '../controllers/analyticsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Protected analytics dashboard endpoints
router.get('/', authenticateToken, requireRole(['Super Admin', 'Admin']), getAnalyticsStats);

export default router;

import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff']), getDashboardStats);

export default router;

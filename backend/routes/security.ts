import { Router } from 'express';
import { getSecurityLogs } from '../controllers/securityController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Only Super Admins and Admins should be allowed to view security audit logs
router.get('/logs', authenticateToken, requireRole(['Super Admin', 'Admin']), getSecurityLogs);

export default router;

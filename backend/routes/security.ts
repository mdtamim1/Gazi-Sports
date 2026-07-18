import { Router } from 'express';
import { getSecurityLogs, downloadDatabaseBackup } from '../controllers/securityController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Only Super Admins and Admins should be allowed to view security audit logs
router.get('/logs', authenticateToken, requireRole(['Super Admin', 'Admin']), getSecurityLogs);

// Only Super Admin can download live database backups
router.get('/backup', authenticateToken, requireRole(['Super Admin']), downloadDatabaseBackup);

export default router;

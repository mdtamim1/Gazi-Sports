import { Router } from 'express';
import { getSettings, updateSettings, getStorefrontSettings, updateStorefrontSettings } from '../controllers/settingsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/storefront', getStorefrontSettings);
router.put('/storefront', authenticateToken, requireRole(['Super Admin', 'Admin']), updateStorefrontSettings);

router.get('/', authenticateToken, requireRole(['Super Admin', 'Admin']), getSettings);
router.put('/', authenticateToken, requireRole(['Super Admin', 'Admin']), updateSettings);

export default router;

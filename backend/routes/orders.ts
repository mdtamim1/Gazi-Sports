import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  syncOrders,
  assignOrder,
  getOrderHistory,
  getMyOrders,
  steadfastCourierEntry,
  getSteadfastSettings,
  saveSteadfastSettings,
  testSteadfastConnection
} from '../controllers/ordersController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Customer can place orders & lookup their orders directly
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);

// Steadfast Courier Settings & Test (Admin only — placed before :id)
router.get('/courier/steadfast-settings', authenticateToken, requireRole(['Super Admin', 'Admin']), getSteadfastSettings);
router.post('/courier/steadfast-settings', authenticateToken, requireRole(['Super Admin', 'Admin']), saveSteadfastSettings);
router.post('/courier/steadfast-test', authenticateToken, requireRole(['Super Admin', 'Admin']), testSteadfastConnection);

// Admin / staff / moderator can view orders
router.get('/', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrders);
router.get('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrderById);
router.get('/:id/history', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrderHistory);

// Admin can manage orders
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), updateOrder);
router.put('/:id/status', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), updateOrderStatus);

// Order sync and assignment (Admin only)
router.post('/sync', authenticateToken, requireRole(['Super Admin', 'Admin']), syncOrders);
router.put('/:id/assign', authenticateToken, requireRole(['Super Admin', 'Admin']), assignOrder);

// Steadfast Courier Entry — submit shipped order to Steadfast automatically
router.post('/:id/steadfast-entry', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), steadfastCourierEntry);

export default router;


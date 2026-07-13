import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus, updateOrder, syncOrders, assignOrder, getOrderHistory, getMyOrders } from '../controllers/ordersController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Customer can place orders & lookup their orders directly
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);

// Admin / staff / moderator can view orders
router.get('/', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrders);
router.get('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrderById);
router.get('/:id/history', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), getOrderHistory);

// Admin can manage orders
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff']), updateOrder);
router.put('/:id/status', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), updateOrderStatus);

// Order sync and assignment (Admin only)
router.post('/sync', authenticateToken, requireRole(['Super Admin', 'Admin']), syncOrders);
router.put('/:id/assign', authenticateToken, requireRole(['Super Admin', 'Admin']), assignOrder);

export default router;

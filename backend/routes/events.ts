import { Router } from 'express';
import {
  getEvents,
  createEvent,
  deleteEvent,
  getCustomerAchievements,
  addCustomerAchievement
} from '../controllers/eventsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public / Customer storefront routes
router.get('/', getEvents);
router.get('/achievements', getCustomerAchievements);
router.post('/achievements', addCustomerAchievement);

// Protected admin routes
router.post('/', authenticateToken, requireRole(['Super Admin', 'Admin']), createEvent);
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), deleteEvent);

export default router;

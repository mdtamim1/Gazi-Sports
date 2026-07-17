import { Router } from 'express';
import { login, logout, getProfile, verifyGoogleStep } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Step 1: Email + Password → Pre-Auth Token
router.post('/login', login);

// Step 2: Google OAuth verification → Full JWT
router.post('/verify-google', verifyGoogleStep);

router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

export default router;

import { Router } from 'express';
import { getBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog } from '../controllers/blogsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);

// Admin-only CRUD routes
router.post('/', authenticateToken, requireRole(['Super Admin', 'Admin']), createBlog);
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), updateBlog);
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Admin']), deleteBlog);

export default router;

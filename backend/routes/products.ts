import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getFacebookFeed } from '../controllers/productsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/facebook-feed', getFacebookFeed);
router.get('/:id', getProductById);
router.post('/', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), createProduct);
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), updateProduct);
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), deleteProduct);

export default router;

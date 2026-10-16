import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getFacebookFeed, getFacebookCsvFeed } from '../controllers/productsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);

// Meta / Facebook Product Catalog Feed (XML & CSV)
router.get('/facebook-feed', getFacebookFeed);
router.get('/facebook-feed.xml', getFacebookFeed);
router.get('/facebook-feed.csv', getFacebookCsvFeed);
router.get('/feed/facebook.xml', getFacebookFeed);
router.get('/feed/facebook.csv', getFacebookCsvFeed);

router.get('/:id', getProductById);
router.post('/', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), createProduct);
router.put('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), updateProduct);
router.delete('/:id', authenticateToken, requireRole(['Super Admin', 'Admin', 'Staff', 'Moderator']), deleteProduct);

export default router;

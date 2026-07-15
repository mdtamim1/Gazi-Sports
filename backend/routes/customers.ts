import { Router } from 'express';
import { 
  registerCustomer, 
  loginCustomer, 
  getCustomerProfile, 
  updateCustomerProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/customersController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Customer Authentication
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Customer Profile
router.get('/profile', authenticateToken, getCustomerProfile);
router.put('/profile', authenticateToken, updateCustomerProfile);

// Customer Addresses Book
router.get('/addresses', authenticateToken, getAddresses);
router.post('/addresses', authenticateToken, addAddress);
router.put('/addresses/:id', authenticateToken, updateAddress);
router.delete('/addresses/:id', authenticateToken, deleteAddress);
router.put('/addresses/:id/default', authenticateToken, setDefaultAddress);

export default router;

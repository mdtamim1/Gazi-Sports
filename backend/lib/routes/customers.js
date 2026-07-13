"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customersController_1 = require("../controllers/customersController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Customer Authentication
router.post('/register', customersController_1.registerCustomer);
router.post('/login', customersController_1.loginCustomer);
router.post('/login-gmail', customersController_1.loginGmailCustomer);
// Customer Profile
router.get('/profile', auth_1.authenticateToken, customersController_1.getCustomerProfile);
router.put('/profile', auth_1.authenticateToken, customersController_1.updateCustomerProfile);
// Customer Addresses Book
router.get('/addresses', auth_1.authenticateToken, customersController_1.getAddresses);
router.post('/addresses', auth_1.authenticateToken, customersController_1.addAddress);
router.put('/addresses/:id', auth_1.authenticateToken, customersController_1.updateAddress);
router.delete('/addresses/:id', auth_1.authenticateToken, customersController_1.deleteAddress);
router.put('/addresses/:id/default', auth_1.authenticateToken, customersController_1.setDefaultAddress);
exports.default = router;
//# sourceMappingURL=customers.js.map
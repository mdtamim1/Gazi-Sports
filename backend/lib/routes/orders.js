"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ordersController_1 = require("../controllers/ordersController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Customer can place orders directly
router.post('/', ordersController_1.createOrder);
// Admin / staff can view and manage orders
router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), ordersController_1.getOrders);
router.get('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), ordersController_1.getOrderById);
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), ordersController_1.updateOrder);
router.put('/:id/status', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), ordersController_1.updateOrderStatus);
exports.default = router;
//# sourceMappingURL=orders.js.map
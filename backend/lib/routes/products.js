"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productsController_1 = require("../controllers/productsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', productsController_1.getProducts);
router.get('/:id', productsController_1.getProductById);
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), productsController_1.createProduct);
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), productsController_1.updateProduct);
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin']), productsController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=products.js.map
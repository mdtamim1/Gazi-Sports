"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/stats', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin', 'Staff']), dashboardController_1.getDashboardStats);
exports.default = router;
//# sourceMappingURL=dashboard.js.map
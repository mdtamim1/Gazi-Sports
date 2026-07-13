"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin']), settingsController_1.getSettings);
router.put('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['Super Admin', 'Admin']), settingsController_1.updateSettings);
exports.default = router;
//# sourceMappingURL=settings.js.map
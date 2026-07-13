"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatsController_1 = require("../controllers/chatsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Retrieve full support logs
router.get('/', auth_1.authenticateToken, chatsController_1.getChatHistory);
// Sync read flag status
router.put('/read/:customerId', auth_1.authenticateToken, chatsController_1.markAsRead);
// Send message via HTTP (WebSocket fallback)
router.post('/', chatsController_1.sendChatMessage);
exports.default = router;
//# sourceMappingURL=chats.js.map
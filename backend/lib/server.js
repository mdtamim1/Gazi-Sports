"use strict";
// ============================================
// ULTRA PREMIUM VIP ADMIN — Node.js Backend
// Express + JWT + RBAC + Firestore
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const https_1 = require("firebase-functions/v2/https");
// Import config
const db_1 = require("./config/db"); // Initializes Firestore connection
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const customers_1 = __importDefault(require("./routes/customers"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const settings_1 = __importDefault(require("./routes/settings"));
const chats_1 = __importDefault(require("./routes/chats"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// --- Middleware ---
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /\.web\.app$/.test(origin) || /\.firebaseapp\.com$/.test(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// --- Health Check ---
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
// ========================================
// API ROUTES (v1)
// ========================================
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/products', products_1.default);
app.use('/api/v1/orders', orders_1.default);
app.use('/api/v1/dashboard', dashboard_1.default);
app.use('/api/v1/chats', chats_1.default);
// Fallback stubs for other routes to prevent breaks
app.use('/api/v1/customers', customers_1.default);
app.use('/api/v1/settings', settings_1.default);
app.use('/api/v1/vendors', (_req, res) => res.json({ status: 'success', data: [] }));
// Serve static assets from Vite build folder
const distPath = path_1.default.resolve(__dirname, '../dist');
app.use(express_1.default.static(distPath));
// For all other requests that are NOT API requests, serve the index.html from dist
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next(); // pass it to API error handler
    }
    res.sendFile(path_1.default.resolve(distPath, 'index.html'));
});
// ========================================
// Error Handling
// ========================================
app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
});
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});
// ========================================
// Seed Database & Run Server
// ========================================
(0, db_1.initializeDatabase)().catch(err => console.error('Database seeding failed:', err));
// Start server locally (not inside Firebase Functions)
if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
    server.listen(PORT, () => {
        console.log(`🚀 VIP Admin API Server running locally on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`📂 API Base: http://localhost:${PORT}/api/v1`);
    });
}
// Export HTTPS cloud function handler named 'api'
exports.api = (0, https_1.onRequest)({ cors: true, maxInstances: 10 }, app);
exports.default = app;
//# sourceMappingURL=server.js.map
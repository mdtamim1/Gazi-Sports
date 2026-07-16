// ============================================
// ULTRA PREMIUM VIP ADMIN — Node.js Backend
// Express + JWT + RBAC + SQLite
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config
import './config/db'; // Initializes DB connection

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import chatRoutes from './routes/chats';
import employeeRoutes from './routes/employees';
import marketingRoutes from './routes/marketing';
import analyticsRoutes from './routes/analytics';
import { initChatSocket } from './websocket/chatSocket';
import blogRoutes from './routes/blogs';

import eventRoutes from './routes/events';
import securityRoutes from './routes/security';

dotenv.config();

import { rateLimit } from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// --- Rate Limiting Config ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 2000, // Increased limit per 15 minutes to accommodate background polling
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static settings, health check, and coupon validation attempts
    return (
      req.path.includes('/settings') || 
      req.path.includes('/health') || 
      req.path.includes('/marketing/validate-coupon') ||
      req.path.includes('/chats')
    );
  },
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 login/auth attempts per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});


const getBaseDomain = (urlStr: string): string => {
  try {
    const hostname = new URL(urlStr).hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch (e) {
    return 'gazisports.com';
  }
};

const storeBaseDomain = getBaseDomain(process.env.STORE_URL || 'https://gazisports.com');

const connectSrcOrigins = [
  "'self'",
  "https://beauty-elegance-admin.onrender.com",
  `https://api.${storeBaseDomain}`,
  `https://${storeBaseDomain}`,
  `https://admin.${storeBaseDomain}`,
  "https://api.tamimglobal.com",
  "https://tamimglobal.com",
  "https://admin.tamimglobal.com",
  "http://localhost:5000",
  "ws:",
  "wss:"
];

// --- Middleware ---
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin || 
      /^http:\/\/localhost(:\d+)?$/.test(origin) || 
      origin.includes('beauty-elegance-ec88f') ||
      origin.includes('web.app') ||
      origin.includes('firebaseapp.com') ||
      (storeBaseDomain && origin.includes(storeBaseDomain)) ||
      origin.includes('tamimglobal.com')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: connectSrcOrigins,
      imgSrc: [
        "'self'",
        "data:",
        "https://picsum.photos",
        "https://*.picsum.photos",
        "https://images.unsplash.com",
        "https://*.unsplash.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Disable caching for all API responses to prevent browser caching of dynamic settings/data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/customers/login', authLimiter);

// --- Health Check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ========================================
// API ROUTES (v1)
// ========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/security', securityRoutes);



// Fallback stubs for other routes to prevent breaks
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/vendors', (_req, res) => res.json({ status: 'success', data: [] }));


// Serve static assets from Vite build folder
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Serve static uploaded files (product images, etc.) from uploads folder
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// For all other requests that are NOT API requests, serve the index.html from dist
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // pass it to API error handler
  }
  res.sendFile(path.resolve(distPath, 'index.html'));
});

// ========================================
// Error Handling
// ========================================
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ========================================
// Start Server / Export Firebase Function
// ========================================
initChatSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 VIP Admin API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📂 API Base: http://localhost:${PORT}/api/v1`);
});

export default app;

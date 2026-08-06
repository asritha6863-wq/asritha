const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const designationRoutes = require('./routes/designationRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// --- Security middleware ---
app.use(helmet());

// Allow any localhost origin in development, plus all Vercel deployment URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://asritha-self.vercel.app',
];
const vercelPreviewPattern = /^https:\/\/asritha-.*-asritha6863-6286s-projects\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Exact match against allowed list
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Pattern match for Vercel preview deployments
      if (vercelPreviewPattern.test(origin)) return callback(null, true);
      // Allow any localhost port in development
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(mongoSanitize()); // strips $ and . operators from req.body/query/params
app.use(xss()); // sanitizes user input from malicious HTML/JS
app.use(hpp()); // prevents HTTP parameter pollution

// Rate limit: 100 requests per 10 minutes per IP on API routes
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', apiLimiter);

// Stricter limiter for login to slow down brute force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// --- Body parsing & logging ---
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// --- Static uploads ---
const path = require('path');
app.use('/uploads', (req, res, next) => {
  // Let browsers open PDFs/images inline instead of forcing download
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.match(/\.(pdf)$/i)) res.setHeader('Content-Disposition', 'inline');
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/departments', departmentRoutes);
app.use('/api/admin/designations', designationRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;

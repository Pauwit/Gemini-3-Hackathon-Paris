/**
 * server.js — Main Express application.
 * Sets up middleware, authentication, routes, and starts the server.
 * All configuration comes from config.js; never hardcode values here.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const config = require('./config');
const { setupGoogleAuth } = require('./auth/google-auth');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth-routes');
const statusRoutes = require('./routes/status-routes');
const settingsRoutes = require('./routes/settings-routes');
const chatRoutes = require('./routes/chat-routes');
const insightsRoutes = require('./routes/insights-routes');
const scannerRoutes = require('./routes/scanner-routes');
const visioRoutes = require('./routes/visio-routes');

// Scanner
const { startScanner } = require('./services/scanner-service');

const app = express();

// CORS — allow frontend with cookies
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management — tokens and Gemini key stored here per user
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,        // set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// Google OAuth (Passport setup)
setupGoogleAuth(app);

// Routes
app.use(authRoutes);
app.use(statusRoutes);
app.use(settingsRoutes);
app.use(chatRoutes);
app.use(insightsRoutes);
app.use(scannerRoutes);
app.use(visioRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start background scanner
startScanner();

// Start server
app.listen(config.port, () => {
  logger.info(`DealBoard server running on http://localhost:${config.port}`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
  logger.info(`Google OAuth callback: ${config.google.callbackUrl}`);

  if (!config.google.clientId || !config.google.clientSecret) {
    logger.warn('WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. OAuth will not work.');
  }
});

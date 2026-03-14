/**
 * config.js — Centralized configuration for the DealBoard server.
 * All environment variables and constants are read here.
 * Never hardcode URLs, ports, or secrets anywhere else.
 */
require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace('3000', '3001') : 'http://localhost:3001'}/auth/google/callback`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar',
      'openid',
      'email',
      'profile',
    ],
  },
};

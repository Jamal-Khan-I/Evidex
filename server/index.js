const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and utility middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(logger);

// Dedicated favicon route for MetaMask and browser crawlers
const publicDir = path.resolve(__dirname, '../public');
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(publicDir, 'assets', 'evidex-icon.svg'), {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
});
app.use(express.static(publicDir, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Ensure accurate MIME types and cross-origin isolation support for webcam/face-api
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback route: serve public/index.html for client-side navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;

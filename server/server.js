let app;

try {
  require('dotenv').config();
  const express = require('express');
  const http = require('http');
  const { Server } = require('socket.io');
  const mongoose = require('mongoose');
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const path = require('path');

  const authRoutes = require('./routes/auth');
  const productRoutes = require('./routes/products');
  const bidRoutes = require('./routes/bids');
  const orderRoutes = require('./routes/orders');
  const chatRoutes = require('./routes/chat');
  const adminRoutes = require('./routes/admin');
  const initSocket = require('./socket/bidSocket');

  app = express();
  const server = http.createServer(app);

  // Global uncaught handlers to log on Vercel without silent process death
  process.on('uncaughtException', (err) => {
    console.error('🔥 Server uncaughtException:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('🔥 Server unhandledRejection:', reason);
  });

  // Socket.IO (active only for local persistent server, bypassed on Vercel serverless)
  if (!process.env.VERCEL && !process.env.NOW_REGION) {
    try {
      const io = new Server(server, {
        cors: {
          origin: process.env.CLIENT_URL || 'http://localhost:5173',
          credentials: true,
        },
      });
      app.set('io', io);
      initSocket(io);
    } catch (e) {
      console.warn('⚠️ Socket.io init notice:', e.message);
    }
  }

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Uploads serving
  const uploadsDir = (process.env.VERCEL || process.env.NOW_REGION)
    ? '/tmp/uploads'
    : path.join(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Instant health check (before DB middleware, responds immediately to /api/health, /health, /api, /)
  app.get(['/api/health', '/health', '/api', '/'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'vit-olx-server',
      timestamp: new Date().toISOString(),
      dbConnected: mongoose.connection.readyState === 1,
    });
  });

  // Database connection for Serverless / Cloud Functions
  let dbConnectingPromise = null;
  async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (!process.env.MONGO_URI) {
      console.warn('⚠️ MONGO_URI is not set in environment variables');
      return;
    }
    if (!dbConnectingPromise) {
      dbConnectingPromise = mongoose
        .connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
        })
        .then(() => {
          console.log('✅ MongoDB connected');
          dbConnectingPromise = null;
        })
        .catch((err) => {
          dbConnectingPromise = null;
          throw err;
        });
    }
    await dbConnectingPromise;
  }

  // Ensure DB is connected for serverless API routes
  app.use(async (req, res, next) => {
    if (req.path === '/api/health' || req.path === '/health' || req.path.endsWith('/health') || req.path === '/' || req.path === '/api') {
      return next();
    }
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('❌ Database connection failure:', err.message);
      res.status(500).json({
        message: 'Database connection failed. Please ensure MongoDB Atlas IP Access List allows 0.0.0.0/0 and MONGO_URI is set in Vercel.',
        error: err.message,
      });
    }
  });

  // Routes (support both /api/* and root /*)
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/bids', bidRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/auth', authRoutes);
  app.use('/products', productRoutes);
  app.use('/bids', bidRoutes);
  app.use('/orders', orderRoutes);
  app.use('/chat', chatRoutes);
  app.use('/admin', adminRoutes);

  // 404 handler
  app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Express error handler:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  });

  // Connect DB + start server in local dev
  const PORT = process.env.PORT || 5000;
  if (!process.env.VERCEL && !process.env.NOW_REGION && require.main === module) {
    if (process.env.MONGO_URI) {
      connectDB().catch(console.error);
    }
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  }
} catch (startupErr) {
  console.error('🚨 Fatal error during server.js evaluation:', startupErr);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'SERVER_BOOTSTRAP_FAILED',
      message: startupErr.message,
      stack: startupErr.stack,
    });
  });
}

module.exports = app;

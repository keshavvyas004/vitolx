require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const bidRoutes = require('./routes/bids');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const initSocket = require('./socket/bidSocket');

const app = express();
const server = http.createServer(app);

// Socket.IO (active only for local persistent server, bypassed on Vercel serverless)
if (!process.env.VERCEL) {
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
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
const path = require('path');
app.use(express.json());
app.use(cookieParser());
// On Vercel filesystem is read-only — serve uploads from /tmp, locally from uploads/
const uploadsDir = (process.env.VERCEL || process.env.NOW_REGION)
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Instant health check (before DB middleware)
app.get(['/api/health', '/health', '/api', '/'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'vit-olx-server',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Database connection for Serverless / Cloud Functions
let dbConnectingPromise = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
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

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/health' || req.path.endsWith('/health')) return next();

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Database connection failure:', err.message);
    res.status(500).json({
      message: 'Database connection failed. Please ensure MongoDB Atlas IP Access List allows 0.0.0.0/0 and MONGO_URI is set.',
      error: err.message,
    });
  }
});

// Routes (support both /api/* and root /* in case Vercel rewrites strip /api)
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

// Health check
app.get(['/api/health', '/health'], (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Connect DB + start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.MONGO_URI) {
      console.log('⏳ Connecting to MongoDB Atlas...');
      await connectDB();
    } else {
      console.warn('⚠️ No MONGO_URI provided in environment variables');
    }

    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// Only listen on port in local dev (do NOT call listen in Vercel serverless)
if (!process.env.VERCEL && !process.env.NOW_REGION && require.main === module) {
  startServer();
}

module.exports = app;

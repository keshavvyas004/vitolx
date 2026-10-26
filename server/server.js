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

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});
app.set('io', io);
initSocket(io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
const path = require('path');
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection for Serverless / Cloud Functions
let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log('✅ MongoDB Atlas connected');
  }
}

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('DB connection notice:', err.message);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

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
      try {
        console.log('⏳ Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 });
        console.log('✅ MongoDB Atlas connected');
      } catch (atlasErr) {
        console.warn('⚠️ Atlas connection failed (likely IP whitelist needed):', atlasErr.message);
        console.log('🔄 Starting fallback local in-memory MongoDB...');
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          const mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();
          await mongoose.connect(uri);
          console.log('✅ Fallback In-Memory MongoDB connected at:', uri);
        } catch (memErr) {
          console.warn('⚠️ In-memory MongoDB not available:', memErr.message);
        }
      }
    } else {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
        console.log('✅ In-Memory MongoDB connected');
      } catch (memErr) {
        console.warn('⚠️ In-memory MongoDB not available:', memErr.message);
      }
    }

    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

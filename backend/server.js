require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const officerRoutes = require('./routes/officers');
const adminRoutes = require('./routes/admin');
const departmentRoutes = require('./routes/departments');
const chatRoutes    = require('./routes/chat');
const slaRulesRoutes = require('./routes/slaRules');

const app = express();

// ✅ Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sla-rules', slaRulesRoutes);

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Civic Platform API is running',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ✅ MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  process.exit(1);
}

if (MONGODB_URI.includes('<username>') || MONGODB_URI.includes('<password>')) {
  console.error('❌ Please replace <username> and <password> in MONGODB_URI with your actual Atlas credentials!');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Atlas connected successfully');
  console.log(`📦 Database: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ MongoDB Atlas connection error:', err.message);
  console.error('💡 Make sure your Atlas URI is correct and your IP is whitelisted in Atlas Network Access');
  process.exit(1);
});

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

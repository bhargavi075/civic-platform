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
const chatRoutes = require('./routes/chat');

const app = express();

// ✅ CORS FIX (IMPORTANT)
app.use(cors({
  origin: "https://civic-platform-chi.vercel.app",
  credentials: true
}));

// ✅ Middleware
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

// ✅ Root route (to avoid "Not Found")
app.get('/', (req, res) => {
  res.send('CivicVoice Backend Running 🚀');
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Civic Platform API is running'
  });
});

// ✅ MongoDB connection (FIXED)
mongoose.connect(
  process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
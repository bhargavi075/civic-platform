# 🏙️ CivicVoice — AI-Based Multilingual Civic Issue Reporting Platform

A full-stack web application for citizens to report civic issues, track resolutions, and engage with local government departments.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- npm or yarn

---

## 📦 Installation

### 1. Clone / Download
```bash
cd civic-platform
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/civic_platform
JWT_SECRET=your_super_secret_key_change_this
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Copy the example:
```bash
cp backend/.env.example backend/.env
```

**Frontend** (`frontend/.env`) — optional for custom API URL:
```env
VITE_API_URL=http://localhost:5000/api
```

> If not set, the Vite proxy will forward `/api` requests to `localhost:5000` automatically.

### 5. Seed the Database (Optional but Recommended)
```bash
cd backend
node seed.js
```

This creates demo users:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | demo123 |
| Officer | officer@demo.com | demo123 |
| Citizen | citizen@demo.com | demo123 |

---

## 🏃 Running the App

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Backend runs at: `http://localhost:5000`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 🌐 Access the Portals

| Portal | URL | Description |
|--------|-----|-------------|
| Landing Page | http://localhost:5173 | Public homepage |
| Citizen Portal | http://localhost:5173/citizen | Report & track issues |
| Officer Dashboard | http://localhost:5173/officer | Manage complaints |
| Admin Panel | http://localhost:5173/admin | Full system control |
| Public Map | http://localhost:5173/citizen/map | View all issues |

---

## 🗂️ Project Structure

```
civic-platform/
├── backend/
│   ├── models/
│   │   ├── User.js          # User model (citizen/officer/admin)
│   │   ├── Complaint.js     # Complaint model with auto-classification
│   │   └── Department.js    # Department model
│   ├── routes/
│   │   ├── auth.js          # Login, register, JWT
│   │   ├── complaints.js    # CRUD, voting, duplicate check
│   │   ├── officers.js      # Officer-specific routes
│   │   ├── admin.js         # Admin routes + analytics
│   │   └── departments.js   # Department management
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── server.js            # Express app entry point
│   ├── seed.js              # Database seeder
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state
    │   ├── pages/
    │   │   ├── LandingPage.jsx    # Public homepage
    │   │   ├── citizen/
    │   │   │   ├── CitizenLogin.jsx
    │   │   │   ├── CitizenRegister.jsx
    │   │   │   ├── CitizenDashboard.jsx   # Feed + stats
    │   │   │   ├── ReportIssue.jsx        # Form with voice + map
    │   │   │   ├── ComplaintDetail.jsx    # Full complaint view
    │   │   │   └── MapView.jsx            # Interactive map
    │   │   ├── officer/
    │   │   │   ├── OfficerLogin.jsx
    │   │   │   └── OfficerDashboard.jsx
    │   │   └── admin/
    │   │       ├── AdminLogin.jsx
    │   │       └── AdminDashboard.jsx     # Analytics + management
    │   ├── components/
    │   │   └── Navbar.jsx
    │   ├── utils/
    │   │   └── api.js         # Axios API wrapper
    │   ├── App.jsx            # Router setup
    │   ├── main.jsx
    │   └── index.css          # Tailwind + custom styles
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ✨ Features

### Citizen Portal
- ✅ Register / Login with JWT
- ✅ Report issues with title, description, images, severity
- ✅ **Voice input** using browser SpeechRecognition API (14+ languages)
- ✅ **Interactive map** (OpenStreetMap/Leaflet) — click to pin location
- ✅ **Anonymous reporting** — identity hidden publicly
- ✅ **Real-time duplicate detection** (location + text similarity)
- ✅ Vote/support existing complaints
- ✅ Track complaint status (Pending → In Progress → Resolved)
- ✅ **AI Voice Assistant** — Text-to-Speech reads complaints aloud
- ✅ View all complaints on interactive map with filters

### Officer Dashboard
- ✅ View complaints assigned to department
- ✅ **AI classification** — keywords auto-route to correct department
- ✅ Priority sorting (votes + severity + SLA)
- ✅ SLA deadline tracking with breach warnings
- ✅ Update status (Pending → In Progress → Resolved)
- ✅ Upload resolution images + notes

### Admin Panel
- ✅ Analytics dashboard (totals, rates, trends)
- ✅ Category breakdown charts
- ✅ Officer performance tracking
- ✅ SLA breach monitoring
- ✅ Add/manage officers with department assignment
- ✅ Configure departments + SLA settings
- ✅ Assign complaints to officers
- ✅ View all citizens and complaints

---

## 🤖 AI Features

### Auto-Classification (Backend)
Complaints are automatically classified by keyword scanning:
- `pothole/road/street` → Roads Department
- `garbage/waste/trash` → Municipal Department  
- `streetlight/electricity/blackout` → Electricity Department
- `water/leak/pipe/drainage` → Water Department
- `park/tree/garden` → Parks Department

### Duplicate Detection
Checks new complaints against recent ones using:
- **Haversine distance** — location within 100 meters
- **Jaccard similarity** — 30%+ text match
- Shows popup: "This issue already exists. Support instead?"

### Voice Features
- **Speech-to-Text**: Report issues by speaking (14 languages including Hindi, Telugu, Tamil, etc.)
- **Text-to-Speech**: Read complaints aloud in the user's language

---

## 🚢 Deployment

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import to Vercel
3. Set env: `VITE_API_URL=https://your-backend.onrender.com/api`

### Backend → Render
1. Push `backend/` to GitHub  
2. Create Web Service on Render
3. Set env vars: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`
4. Build command: `npm install`
5. Start command: `node server.js`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register citizen |
| POST | /api/auth/login | Login any user |
| GET | /api/complaints | Get all complaints |
| POST | /api/complaints | Create complaint |
| POST | /api/complaints/check-duplicate | Check duplicates |
| POST | /api/complaints/:id/vote | Vote on complaint |
| PATCH | /api/complaints/:id/status | Update status |
| GET | /api/officers/complaints | Officer's complaints |
| GET | /api/admin/analytics | Analytics data |
| POST | /api/admin/officers | Create officer |
| GET | /api/departments | List departments |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Map | Leaflet + React-Leaflet + OpenStreetMap |
| Voice | Browser SpeechRecognition + SpeechSynthesis APIs |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📝 Notes

- Images are stored as base64 strings. For production, use AWS S3 or Cloudinary.
- Voice features require HTTPS in production (Chrome policy).
- Maps use free OpenStreetMap tiles — no API key needed.
- MongoDB Atlas free tier works perfectly for deployment.

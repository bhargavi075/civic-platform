import Chatbot from './components/Chatbot';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Pages
import LandingPage from './pages/LandingPage';
import CitizenLogin from './pages/citizen/CitizenLogin';
import CitizenRegister from './pages/citizen/CitizenRegister';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ReportIssue from './pages/citizen/ReportIssue';
import ComplaintDetail from './pages/citizen/ComplaintDetail';
import MapView from './pages/citizen/MapView';
import OfficerLogin from './pages/officer/OfficerLogin';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

/* ── Fun loading screen ──────────────────────────────────────────────────── */
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #e8eaff 0%, #fce4ff 50%, #e4eeff 100%)' }}>
    <div className="text-center animate-bounce-in">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
        <span className="text-white font-bold text-3xl font-display">CV</span>
      </div>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-purple-700 font-display font-semibold text-lg animate-gradient-text">Loading CivicVoice...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/${requiredRole}/login`} replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return <div className="page-wrapper">{children}</div>;
};

/* ── Page transition wrapper ─────────────────────────────────────────────── */
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-wrapper">
      <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/citizen/login" element={<CitizenLogin />} />
        <Route path="/citizen/register" element={<CitizenRegister />} />
        <Route path="/citizen" element={<ProtectedRoute requiredRole="citizen"><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/citizen/report" element={<ProtectedRoute requiredRole="citizen"><ReportIssue /></ProtectedRoute>} />
        <Route path="/citizen/complaint/:id" element={<ComplaintDetail />} />
        <Route path="/citizen/map" element={<MapView />} />
        <Route path="/officer/login" element={<OfficerLogin />} />
        <Route path="/officer" element={<ProtectedRoute requiredRole="officer"><OfficerDashboard /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
          <Chatbot />
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;

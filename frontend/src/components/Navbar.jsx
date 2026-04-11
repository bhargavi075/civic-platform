import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिंदी' },
  { code: 'te', label: 'తె', full: 'తెలుగు' },
];

const roleColors = {
  citizen: 'from-purple-500 to-purple-600',
  officer: 'from-emerald-500 to-emerald-600',
  admin:   'from-violet-500 to-purple-600',
};
const roleBg = {
  citizen: 'bg-purple-50 border-purple-100',
  officer: 'bg-emerald-50 border-emerald-100',
  admin:   'bg-violet-50 border-violet-100',
};

const Navbar = ({ role = 'citizen' }) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = {
    citizen: [
      { to: '/citizen',        label: t('dashboard') },
      { to: '/citizen/report', label: t('reportIssue') },
      { to: '/citizen/map',    label: t('mapView') },
    ],
    officer: [{ to: '/officer', label: t('dashboard') }],
    admin:   [{ to: '/admin',   label: t('dashboard') }],
  };

  const roleLabels = { citizen: t('citizen'), officer: t('officer'), admin: t('admin') };
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <nav
      className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 animate-slide-down"
      style={{ boxShadow: '0 2px 16px rgba(168,85,247,.08)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className={`w-8 h-8 bg-gradient-to-br ${roleColors[role]} rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
              style={{ boxShadow: '0 3px 10px rgba(168,85,247,.3)' }}
            >
              <span className="text-white font-bold text-sm font-display">CV</span>
            </div>
            <span className="font-display font-bold text-gray-900 text-lg hidden sm:block transition-colors group-hover:text-purple-700">
              CivicVoice
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {(navLinks[role] || []).map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 font-body hover:scale-105 ${
                    isActive
                      ? 'text-purple-700 bg-purple-50 font-semibold'
                      : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">

            {/* Language switcher */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-100 bg-white text-sm font-semibold text-gray-700 hover:bg-purple-50 transition-all duration-200 btn-press"
              >
                <span className="text-base">🌐</span>
                <span className="font-display">{currentLang.label}</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-36 bg-white border border-purple-100 rounded-2xl z-50 overflow-hidden py-1 animate-scale-in"
                    style={{ boxShadow: '0 8px 24px rgba(168,85,247,.15)' }}
                  >
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => { setLang(l.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150 ${
                          lang === l.code ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold w-6 text-center font-display">{l.label}</span>
                        <span className="font-body">{l.full}</span>
                        {lang === l.code && <span className="ml-auto text-purple-500 text-xs animate-scale-in">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className={`w-7 h-7 bg-gradient-to-br ${roleColors[role]} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 hover:rotate-12 animate-pulse-glow`}>
                    <span className="text-white text-xs font-bold">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate font-body">{user.name}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${roleColors[role]} text-white font-display font-semibold`}>
                    {roleLabels[role]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium px-3 py-1.5 rounded-xl hover:bg-red-50 font-body btn-press"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <Link to={`/${role}/login`} className="btn-primary text-sm py-2 px-4 btn-press">
                {t('signIn')}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-purple-50 transition-colors btn-press"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-purple-50 space-y-0.5 animate-fade-up">
            {(navLinks[role] || []).map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium font-body transition-colors ${
                  location.pathname === link.to
                    ? 'bg-purple-50 text-purple-700 font-semibold'
                    : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

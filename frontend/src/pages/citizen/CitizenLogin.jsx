import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

const EMOJIS = ['🏙️','🌟','✨','🎯','💫','🌈','🎉','🚀'];

const FloatingEmoji = ({ emoji, style }) => (
  <div className="absolute pointer-events-none text-2xl animate-float-a select-none" style={style}>
    {emoji}
  </div>
);

const LangSwitcher = ({ lang, setLang }) => {
  const LANGS = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'hi', label: 'हि', native: 'हिन्दी' },
    { code: 'te', label: 'తె', native: 'తెలుగు' },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border border-purple-100 rounded-xl p-1 shadow-sm">
      {LANGS.map(l => (
        <button key={l.code} type="button" title={l.native} onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${
            lang === l.code
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm scale-110'
              : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50 hover:scale-105'
          }`}>
          {l.label}
        </button>
      ))}
    </div>
  );
};

const CitizenLogin = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const { login }              = useAuth();
  const { t, lang, setLang }   = useLang();
  const navigate               = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'citizen') navigate('/citizen');
      else setError(t('citizenPortalOnly'));
    } catch (err) {
      setError(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-login flex items-center justify-center p-4 min-h-screen relative overflow-hidden">

      {/* Floating background emojis */}
      <FloatingEmoji emoji="🏙️" style={{ top: '8%', left: '5%', animationDelay: '0s', opacity: 0.4 }} />
      <FloatingEmoji emoji="⭐" style={{ top: '15%', right: '8%', animationDelay: '1s', opacity: 0.35 }} />
      <FloatingEmoji emoji="✨" style={{ bottom: '20%', left: '8%', animationDelay: '2s', opacity: 0.3 }} />
      <FloatingEmoji emoji="🌟" style={{ bottom: '30%', right: '6%', animationDelay: '3s', opacity: 0.35 }} />
      <FloatingEmoji emoji="💫" style={{ top: '45%', left: '3%', animationDelay: '1.5s', opacity: 0.25 }} />

      {/* Background blobs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-purple-400/20 blob animate-float-a" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/15 blob animate-float-b" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-pink-300/10 blob animate-float-a" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-md relative z-10 animate-bounce-in">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 animate-slide-down d1">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-fun transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <span className="text-white font-bold text-lg font-display">CV</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 group-hover:text-purple-600 transition-colors">CivicVoice</span>
          </Link>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-up d2">
          <div className="text-5xl mb-3 animate-heartbeat">👋</div>
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {t('welcomeBackCitizen')}
          </h1>
          <p className="text-gray-500 text-sm">{t('citizenLoginSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-purple-100/60 animate-slide-up-modal d3"
          style={{ boxShadow: '0 20px 60px rgba(168,85,247,.18), 0 4px 16px rgba(168,85,247,.08)' }}>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2 animate-bounce-in">
              <span className="animate-wiggle-loop">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`transition-transform duration-200 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display flex items-center gap-1">
                <span>📧</span> {t('emailAddress')}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                className="input-field" placeholder={t('emailPlaceholder')} />
            </div>

            <div className={`transition-transform duration-200 ${focusedField === 'password' ? 'scale-[1.01]' : ''}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display flex items-center gap-1">
                <span>🔒</span> {t('enterPassword')}
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  className="input-field pr-12" placeholder={t('passwordPlaceholder')} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-all duration-200 hover:scale-125">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3 text-base rounded-2xl">
              {loading
                ? <><div className="spinner" /> {t('signingIn')}</>
                : <><span>🚀</span> {t('signInBtn')}</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {t('dontHaveAccount')}{' '}
              <Link to="/citizen/register" className="text-purple-600 font-semibold hover:text-purple-700 transition-colors relative group">
                {t('registerHere')}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 group-hover:w-full transition-all duration-300" />
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
            <strong className="font-display">💡 {t('demoCredentials')}:</strong> citizen@demo.com / demo123
          </div>
        </div>

        {/* Officer / Admin links */}
        <div className="mt-6 text-center space-y-2 animate-fade-up d5">
          <p className="text-gray-500 text-sm">{t('officerAdminPortal')}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/officer/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-all hover:scale-105 hover:underline">
              {t('officerLoginTitle')}
            </Link>
            <span className="text-gray-300">·</span>
            <Link to="/admin/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-all hover:scale-105 hover:underline">
              {t('adminLoginTitle')}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CitizenLogin;

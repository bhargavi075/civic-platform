import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

const LangSwitcher = ({ lang, setLang }) => {
  const LANGS = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'hi', label: 'हि', native: 'हिन्दी' },
    { code: 'te', label: 'తె', native: 'తెలుగు' },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border border-indigo-100 rounded-xl p-1 shadow-sm">
      {LANGS.map(l => (
        <button key={l.code} type="button" title={l.native} onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${
            lang === l.code
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm scale-110'
              : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:scale-105'
          }`}>{l.label}
        </button>
      ))}
    </div>
  );
};

const AdminLogin = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');
  const { login }              = useAuth();
  const { t, lang, setLang }   = useLang();
  const navigate               = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else setError(t('adminPortalOnly'));
    } catch (err) {
      setError(err.response?.data?.message || t('loginFailed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ede9fe 100%)', backgroundSize: '300% 300%', animation: 'gradientShift 8s ease infinite' }}>

      {/* Animated blobs */}
      <div className="absolute -top-28 -left-28 w-80 h-80 bg-indigo-400/20 blob animate-float-a" />
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-violet-400/15 blob animate-float-b" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-300/10 blob animate-float-a" style={{ animationDelay: '4s' }} />

      {/* Floating icons */}
      {['⚙️','🔐','📊','🛡️','✨'].map((e, i) => (
        <div key={i} className="absolute pointer-events-none text-2xl animate-float-a select-none opacity-25"
          style={{ top: `${10 + i * 18}%`, left: i % 2 === 0 ? '3%' : '95%', animationDelay: `${i * 1.2}s` }}>
          {e}
        </div>
      ))}

      <div className="w-full max-w-md relative z-10 animate-bounce-in">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 animate-slide-down">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-fun transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
              <span className="text-white font-bold text-lg font-display">CV</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors">CivicVoice</span>
          </Link>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Icon + Title */}
        <div className="text-center mb-8 animate-fade-up d1">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-tilt shadow-fun">
            <span className="text-4xl">⚙️</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">{t('adminPortalTitle')}</h1>
          <p className="text-gray-500 text-sm">{t('adminLoginSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-indigo-100/60 animate-slide-up-modal d2"
          style={{ boxShadow: '0 20px 60px rgba(99,102,241,.18), 0 4px 16px rgba(99,102,241,.08)' }}>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2 animate-bounce-in">
              <span className="animate-wiggle-loop">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`animate-fade-up d3 transition-transform duration-200 ${focused === 'email' ? 'scale-[1.01]' : ''}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display flex items-center gap-1">
                <span>📧</span> {t('adminEmailLabel')}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                className="input-field" placeholder={t('adminEmailPlaceholder')} />
            </div>

            <div className={`animate-fade-up d4 transition-transform duration-200 ${focused === 'password' ? 'scale-[1.01]' : ''}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display flex items-center gap-1">
                <span>🔒</span> {t('enterPassword')}
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                  className="input-field pr-12" placeholder={t('passwordPlaceholder')} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-all hover:scale-125">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-base animate-fade-up d5 btn-press"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 6px 20px rgba(99,102,241,.4)' }}>
              {loading ? <><div className="spinner" /> {t('signingIn')}</> : <><span>🚀</span> {t('signInAsAdmin')}</>}
            </button>
          </form>

          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl text-xs text-indigo-700 animate-fade-up d6">
            <strong className="font-display">💡 {t('demoCredentials')}:</strong> admin@demo.com / demo123
          </div>
        </div>

        <div className="mt-6 text-center animate-fade-up d7">
          <Link to="/" className="text-gray-500 hover:text-indigo-600 text-sm transition-all hover:scale-105 inline-block">
            ← {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

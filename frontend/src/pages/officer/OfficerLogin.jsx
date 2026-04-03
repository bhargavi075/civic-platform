import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

/* ── Inline language switcher ────────────────────────────────────────────── */
const LangSwitcher = ({ lang, setLang }) => {
  const LANGS = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'hi', label: 'हि', native: 'हिन्दी' },
    { code: 'te', label: 'తె', native: 'తెలుగు' },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border border-teal-100 rounded-xl p-1 shadow-sm">
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          title={l.native}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
            lang === l.code
              ? 'bg-teal-500 text-white shadow-sm scale-105'
              : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

const OfficerLogin = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }              = useAuth();
  const { t, lang, setLang }   = useLang();
  const navigate               = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'officer') navigate('/officer');
      else setError(t('officerPortalOnly'));
    } catch (err) {
      setError(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">

        {/* Top bar: logo + language switcher */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold font-display">CV</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900">CivicVoice</span>
          </Link>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Title block */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {t('officerPortalTitle')}
          </h1>
          <p className="text-gray-500 text-sm">{t('officerLoginSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-teal-100"
          style={{ boxShadow: '0 8px 32px rgba(20,184,166,.12)' }}>

          <div className="flex items-center justify-center w-16 h-16 bg-teal-100 rounded-2xl mx-auto mb-6">
            <span className="text-3xl">👮</span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('officerEmailLabel')}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-field" placeholder={t('officerEmailPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('enterPassword')}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="input-field" placeholder={t('passwordPlaceholder')} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 mt-6">
              {loading
                ? <><div className="spinner" /> {t('signingIn')}</>
                : t('signInAsOfficer')}
            </button>
          </form>

          <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-700">
            <strong className="font-display">{t('demoCredentials')}:</strong> officer@demo.com / demo123
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-500 hover:text-gray-700 text-sm">
            {t('backToHome')}
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OfficerLogin;

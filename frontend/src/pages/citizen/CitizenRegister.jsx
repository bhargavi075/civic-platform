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
    <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border border-purple-100 rounded-xl p-1 shadow-sm">
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          title={l.native}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
            lang === l.code
              ? 'bg-purple-500 text-white shadow-sm scale-105'
              : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

const CitizenRegister = () => {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();
  const { t, lang, setLang }  = useLang();
  const navigate              = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError(t('passwordsMismatch'));
    if (form.password.length < 6)       return setError(t('passwordTooShort'));
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/citizen');
    } catch (err) {
      setError(err.response?.data?.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-login flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">

        {/* Top bar: logo + language switcher */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold font-display">CV</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900">CivicVoice</span>
          </Link>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Title block */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {t('createAccountTitle')}
          </h1>
          <p className="text-gray-500 text-sm">{t('citizenRegisterSubtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-purple-100"
          style={{ boxShadow: '0 8px 32px rgba(168,85,247,.12)' }}>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('fullName')}
              </label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="input-field" placeholder={t('fullNamePlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('emailAddress')}
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                className="input-field" placeholder={t('emailPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('enterPassword')}
              </label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required
                className="input-field" placeholder={t('atLeast6Chars')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                {t('confirmPassword')}
              </label>
              <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required
                className="input-field" placeholder={t('passwordPlaceholder')} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6 py-3">
              {loading
                ? <><div className="spinner" /> {t('creatingAccount')}</>
                : t('createAccount')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {t('alreadyHaveAccount')}{' '}
              <Link to="/citizen/login" className="text-purple-600 font-semibold hover:underline">
                {t('signInLink')}
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CitizenRegister;

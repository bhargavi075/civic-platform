import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

/* ── Confetti burst on success ───────────────────────────────────────────── */
const launchConfetti = () => {
  const colors = ['#a855f7','#6366f1','#f43f5e','#f97316','#22c55e','#eab308'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
};

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

/* ── Password strength indicator ─────────────────────────────────────────── */
const PasswordStrength = ({ password }) => {
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const labels = ['', '😟 Weak', '😐 Okay', '😊 Good', '🔥 Strong'];
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return password.length > 0 ? (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= strength ? colors[strength] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs mt-1 font-medium text-gray-500">{labels[strength]}</p>
    </div>
  ) : null;
};

const CitizenRegister = () => {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState('');
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
      setSuccess(true);
      launchConfetti();
      setTimeout(() => navigate('/citizen'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name',    label: t('fullName'),      icon: '👤', type: 'text',     placeholder: t('fullNamePlaceholder') },
    { name: 'email',   label: t('emailAddress'),  icon: '📧', type: 'email',    placeholder: t('emailPlaceholder') },
    { name: 'password',label: t('enterPassword'), icon: '🔒', type: showPass ? 'text' : 'password', placeholder: t('atLeast6Chars') },
    { name: 'confirm', label: t('confirmPassword'),icon: '✅', type: 'password', placeholder: t('passwordPlaceholder') },
  ];

  return (
    <div className="bg-login flex items-center justify-center p-4 min-h-screen relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-400/20 blob animate-float-b" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400/15 blob animate-float-a" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-pink-300/10 blob animate-float-b" style={{ animationDelay: '1.5s' }} />

      {/* Floating emojis */}
      {['🌟','✨','🎯','💫','🎉'].map((e, i) => (
        <div key={i} className="absolute pointer-events-none text-xl animate-float-a select-none opacity-30"
          style={{ top: `${15 + i * 17}%`, left: i % 2 === 0 ? '4%' : '94%', animationDelay: `${i * 0.8}s` }}>
          {e}
        </div>
      ))}

      <div className="w-full max-w-md relative z-10">

        {/* Success state */}
        {success && (
          <div className="text-center animate-bounce-in">
            <div className="text-8xl mb-4 success-pop inline-block">🎉</div>
            <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-gray-500">Redirecting you in...</p>
          </div>
        )}

        {!success && <>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 animate-slide-down">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-fun transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <span className="text-white font-bold text-lg font-display">CV</span>
              </div>
              <span className="font-display font-bold text-xl text-gray-900 group-hover:text-purple-600 transition-colors">CivicVoice</span>
            </Link>
            <LangSwitcher lang={lang} setLang={setLang} />
          </div>

          {/* Title */}
          <div className="text-center mb-6 animate-fade-up d1">
            <div className="text-5xl mb-3 animate-wiggle-loop">🎊</div>
            <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
              {t('createAccountTitle')}
            </h1>
            <p className="text-gray-500 text-sm">{t('citizenRegisterSubtitle')}</p>
          </div>

          {/* Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-purple-100/60 animate-slide-up-modal d2"
            style={{ boxShadow: '0 20px 60px rgba(168,85,247,.18), 0 4px 16px rgba(168,85,247,.08)' }}>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2 animate-bounce-in">
                <span className="animate-wiggle-loop">⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((f, i) => (
                <div key={f.name}
                  className={`animate-fade-up d${i + 2} transition-transform duration-200 ${focusedField === f.name ? 'scale-[1.01]' : ''}`}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display flex items-center gap-1">
                    <span>{f.icon}</span> {f.label}
                  </label>
                  <div className="relative">
                    <input
                      name={f.name} type={f.type} value={form[f.name]}
                      onChange={handleChange} required
                      onFocus={() => setFocusedField(f.name)}
                      onBlur={() => setFocusedField('')}
                      className="input-field" placeholder={f.placeholder}
                    />
                    {f.name === 'password' && (
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-all hover:scale-125">
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    )}
                    {f.name === 'confirm' && form.confirm && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg animate-pop-in">
                        {form.password === form.confirm ? '✅' : '❌'}
                      </span>
                    )}
                  </div>
                  {f.name === 'password' && <PasswordStrength password={form.password} />}
                </div>
              ))}

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2 text-base rounded-2xl animate-fade-up d6">
                {loading
                  ? <><div className="spinner" /> {t('creatingAccount')}</>
                  : <><span>🎉</span> {t('createAccount')}</>}
              </button>
            </form>

            <div className="mt-6 text-center animate-fade-up d7">
              <p className="text-gray-500 text-sm">
                {t('alreadyHaveAccount')}{' '}
                <Link to="/citizen/login" className="text-purple-600 font-semibold hover:text-purple-700 transition-colors relative group">
                  {t('signInLink')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 group-hover:w-full transition-all duration-300" />
                </Link>
              </p>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
};

export default CitizenRegister;

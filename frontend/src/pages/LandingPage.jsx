import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useCountUp, useInView, staggerDelay } from '../animations/useAnimations';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिंदी' },
  { code: 'te', label: 'తె', full: 'తెలుగు' },
];

// ── Animated stat number ───────────────────────────────────────────────────
const AnimatedStat = ({ value, label }) => {
  // Extract numeric part; keep suffix like '+'
  const numeric = parseInt(value.replace(/[^0-9]/g, ''), 10);
  const suffix  = value.replace(/[0-9,]/g, '');
  const count   = useCountUp(numeric, 1400);
  const [ref, inView] = useInView();

  return (
    <div ref={ref} className={`glass rounded-3xl p-5 text-center card-lift shadow-card ${inView ? 'animate-fade-up' : 'opacity-0'}`}>
      <div className="font-display font-bold text-3xl text-purple-700 mb-1 stat-card-num">
        {inView ? count.toLocaleString() + suffix : '0'}
      </div>
      <div className="text-gray-500 text-sm font-body">{label}</div>
    </div>
  );
};

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
const Reveal = ({ children, className = '', delay = 0 }) => {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`${className} ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
};

const LandingPage = () => {
  const { t, lang, setLang } = useLang();

  return (
    <div className="bg-login text-gray-900 overflow-hidden" style={{ minHeight: '100vh' }}>

      {/* ── Animated background orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-a" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-cyan-400/15 rounded-full blur-3xl animate-float-b" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-indigo-400/15 rounded-full blur-3xl animate-float-a" style={{ animationDelay: '4s' }} />
        <div className="absolute top-2/3 left-1/3 w-48 h-48 bg-violet-300/10 rounded-full blur-2xl animate-float-b" style={{ animationDelay: '1s' }} />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.08) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto bg-white/70 backdrop-blur-md border-b border-purple-100 animate-fade-in-slow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-300">
            <span className="text-white font-bold text-lg font-display">CV</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-gray-900">CivicVoice</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/70 border border-purple-100 rounded-xl p-1" style={{ boxShadow: '0 2px 8px rgba(168,85,247,.1)' }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 font-display ${
                  lang === l.code ? 'bg-purple-500 text-white shadow-sm scale-105' : 'text-gray-600 hover:text-gray-900 hover:scale-105'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Link to="/citizen/login" className="text-gray-600 hover:text-purple-700 transition-colors text-sm font-medium px-4 py-2 font-body nav-link">
            {t('signIn')}
          </Link>
          <Link to="/citizen/register" className="btn-primary text-sm px-5 py-2 btn-press">
            {t('reportAnIssue')}
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">

        {/* ── Hero ── */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-up d0 inline-flex items-center gap-2 bg-white/70 border border-purple-200 rounded-full px-4 py-1.5 text-sm text-purple-700 mb-8 backdrop-blur-sm font-display font-semibold shadow-card">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            {t('heroTag')}
          </div>

          {/* Hero title with animated gradient on accent word */}
          <h1 className="animate-fade-up d1 font-display font-bold text-5xl md:text-7xl leading-tight mb-6 text-gray-900">
            {t('heroTitle1')}<br />
            {t('heroTitle2')}<br />
            <span className="animate-gradient-text">{t('heroTitle3')}</span>
          </h1>

          <p className="animate-fade-up d2 text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-body">
            {t('heroDesc')}
          </p>

          <div className="animate-fade-up d3 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/citizen/register" className="btn-primary px-8 py-4 text-lg btn-press">
              {t('reportAnIssue')}
            </Link>
            <Link to="/citizen/map" className="btn-secondary px-8 py-4 text-lg btn-press">
              {t('viewComplaintsMap')}
            </Link>
          </div>
        </div>

        {/* ── Stats (count-up on scroll) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20">
          {[
            { label: t('issuesReported'), value: '12450+' },
            { label: t('resolved'),       value: '9200+' },
            { label: t('cities'),         value: '48' },
            { label: t('languages'),      value: '22' },
          ].map((stat, i) => (
            <div key={stat.label} className="animate-fade-up" {...staggerDelay(i, 90)}>
              <AnimatedStat value={stat.value} label={stat.label} />
            </div>
          ))}
        </div>

        {/* ── Portal cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          {[
            { title: t('citizenPortal'),    desc: t('citizenPortalDesc'),    icon: '🏘️', color: 'from-primary-50 to-white',  border: 'border-purple-200', link: '/citizen/login', cta: t('enterPortal') },
            { title: t('officerDashboard'), desc: t('officerDashboardDesc'), icon: '👮', color: 'from-teal-50 to-white',    border: 'border-teal-200',   link: '/officer/login', cta: t('officerLogin') },
            { title: t('adminPanel'),       desc: t('adminPanelDesc'),       icon: '⚙️', color: 'from-indigo-50 to-white',  border: 'border-indigo-200', link: '/admin/login',   cta: t('adminLogin') },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <div className={`glass bg-gradient-to-br ${card.color} border ${card.border} rounded-3xl p-6 card-lift shadow-card cursor-pointer`}>
                <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">{card.icon}</div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed font-body">{card.desc}</p>
                <Link to={card.link} className="text-purple-600 font-semibold text-sm hover:text-purple-700 flex items-center gap-1 transition-all group">
                  {card.cta}
                  <span className="transition-transform group-hover:translate-x-1 duration-200">→</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Features ── */}
        <div className="mt-20 text-center">
          <Reveal>
            <h2 className="font-display font-bold text-3xl text-gray-900 mb-12">{t('poweredByAI')}</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: '🎤', label: t('voiceReporting'),     desc: t('voiceReportingDesc') },
              { icon: '🗺️', label: t('interactiveMap'),     desc: t('interactiveMapDesc') },
              { icon: '🤖', label: t('aiClassification'),   desc: t('aiClassificationDesc') },
              { icon: '🔁', label: t('duplicateDetection'), desc: t('duplicateDetectionDesc') },
              { icon: '🔔', label: t('realTimeTracking'),   desc: t('realTimeTrackingDesc') },
              { icon: '🕵️', label: t('anonymousMode'),      desc: t('anonymousModeDesc') },
            ].map((f, i) => (
              <Reveal key={f.label} delay={i * 70}>
                <div className="glass rounded-2xl p-5 text-left card-lift shadow-card cursor-default">
                  <div className="text-2xl mb-2 transition-transform duration-300 hover:scale-110">{f.icon}</div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">{f.label}</div>
                  <div className="text-gray-500 text-xs font-body">{f.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-purple-100 py-8 text-center text-gray-500 text-sm bg-white/50 font-body animate-fade-in-slow">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
};

export default LandingPage;

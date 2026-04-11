import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useCountUp, useInView, staggerDelay } from '../animations/useAnimations';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिंदी' },
  { code: 'te', label: 'తె', full: 'తెలుగు' },
];

const AnimatedStat = ({ value, label, icon }) => {
  const numeric = parseInt(value.replace(/[^0-9]/g, ''), 10);
  const suffix  = value.replace(/[0-9,]/g, '');
  const count   = useCountUp(numeric, 1400);
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`glass rounded-3xl p-6 text-center tilt-card shadow-fun ${inView ? 'animate-bounce-in' : 'opacity-0'}`}>
      <div className="text-3xl mb-2 animate-float-a">{icon}</div>
      <div className="font-display font-bold text-3xl text-purple-700 mb-1 stat-card-num">
        {inView ? count.toLocaleString() + suffix : '0'}
      </div>
      <div className="text-gray-500 text-sm font-body">{label}</div>
    </div>
  );
};

const Reveal = ({ children, className = '', delay = 0 }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`${className} ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {children}
    </div>
  );
};

/* Floating emoji particle */
const FloatingIcon = ({ emoji, style }) => (
  <div className="absolute pointer-events-none select-none animate-float-a text-2xl opacity-30" style={style}>
    {emoji}
  </div>
);

const LandingPage = () => {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-login text-gray-900 overflow-hidden relative" style={{ minHeight: '100vh' }}>

      {/* ── Rich background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-500/15 blob animate-float-a" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-cyan-400/12 blob animate-float-b" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-indigo-400/12 blob animate-float-a" style={{ animationDelay: '4s' }} />
        <div className="absolute top-2/3 left-1/3 w-56 h-56 bg-pink-300/10 blob animate-float-b" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.12) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Floating emojis */}
      <FloatingIcon emoji="🏙️" style={{ top: '12%',  left:  '2%',  animationDelay: '0s'   }} />
      <FloatingIcon emoji="⭐"  style={{ top: '28%',  right: '3%',  animationDelay: '1.5s' }} />
      <FloatingIcon emoji="🌟"  style={{ top: '55%',  left:  '1%',  animationDelay: '3s'   }} />
      <FloatingIcon emoji="✨"  style={{ top: '70%',  right: '2%',  animationDelay: '2s'   }} />
      <FloatingIcon emoji="💫"  style={{ top: '88%',  left:  '4%',  animationDelay: '0.5s' }} />
      <FloatingIcon emoji="🎯"  style={{ top: '40%',  right: '1%',  animationDelay: '4s'   }} />

      {/* ── Sticky Navbar ── */}
      <nav className={`sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto transition-all duration-300 animate-slide-down ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-fun border-b border-purple-100' : 'bg-white/70 backdrop-blur-md border-b border-purple-100'
      }`}>
        <div className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-fun transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
            <span className="text-white font-bold text-lg font-display">CV</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-gray-900 group-hover:text-purple-600 transition-colors">CivicVoice</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/70 border border-purple-100 rounded-xl p-1" style={{ boxShadow: '0 2px 8px rgba(168,85,247,.1)' }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 font-display ${
                  lang === l.code
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm scale-110'
                    : 'text-gray-600 hover:text-gray-900 hover:scale-105'
                }`}>
                {l.label}
              </button>
            ))}
          </div>
          <Link to="/citizen/login" className="text-gray-600 hover:text-purple-700 transition-all text-sm font-medium px-4 py-2 font-body nav-link hover:scale-105">
            {t('signIn')}
          </Link>
          <Link to="/citizen/register" className="btn-primary text-sm px-5 py-2.5 rounded-xl">
            {t('reportAnIssue')} 🚀
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">

        {/* ── Hero ── */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-bounce-in d0 inline-flex items-center gap-2 bg-white/80 border border-purple-200 rounded-full px-4 py-2 text-sm text-purple-700 mb-8 backdrop-blur-sm font-display font-semibold shadow-fun">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-heartbeat" />
            {t('heroTag')} ✨
          </div>

          <h1 className="animate-fade-up d1 font-display font-bold text-5xl md:text-7xl leading-tight mb-6 text-gray-900">
            {t('heroTitle1')}<br />
            {t('heroTitle2')}<br />
            <span className="animate-gradient-text">{t('heroTitle3')}</span>
          </h1>

          <p className="animate-fade-up d2 text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-body">
            {t('heroDesc')}
          </p>

          <div className="animate-fade-up d3 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/citizen/register"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg rounded-2xl text-white font-semibold btn-press"
              style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 8px 24px rgba(168,85,247,.4)' }}>
              🎯 {t('reportAnIssue')}
            </Link>
            <Link to="/citizen/map"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg rounded-2xl font-semibold btn-press bg-white border-2 border-purple-200 text-purple-700 hover:border-purple-400"
              style={{ transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
              🗺️ {t('viewComplaintsMap')}
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20">
          {[
            { label: t('issuesReported'), value: '12450+', icon: '📢' },
            { label: t('resolved'),       value: '9200+',  icon: '✅' },
            { label: t('cities'),         value: '48',     icon: '🏙️' },
            { label: t('languages'),      value: '22',     icon: '🌐' },
          ].map((stat, i) => (
            <div key={stat.label} className="animate-fade-up" {...staggerDelay(i, 90)}>
              <AnimatedStat value={stat.value} label={stat.label} icon={stat.icon} />
            </div>
          ))}
        </div>

        {/* ── Portal cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          {[
            { title: t('citizenPortal'),    desc: t('citizenPortalDesc'),    icon: '🏘️', gradient: 'from-purple-50 to-white',  border: 'border-purple-200', link: '/citizen/login', cta: t('enterPortal'),  glow: 'rgba(168,85,247,.15)' },
            { title: t('officerDashboard'), desc: t('officerDashboardDesc'), icon: '👮', gradient: 'from-teal-50 to-white',    border: 'border-teal-200',   link: '/officer/login', cta: t('officerLogin'), glow: 'rgba(20,184,166,.15)' },
            { title: t('adminPanel'),       desc: t('adminPanelDesc'),       icon: '⚙️', gradient: 'from-indigo-50 to-white',  border: 'border-indigo-200', link: '/admin/login',   cta: t('adminLogin'),   glow: 'rgba(99,102,241,.15)' },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 120}>
              <div className={`glass bg-gradient-to-br ${card.gradient} border-2 ${card.border} rounded-3xl p-7 tilt-card cursor-pointer group`}
                style={{ boxShadow: `0 8px 32px ${card.glow}` }}>
                <div className="text-5xl mb-5 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 inline-block">
                  {card.icon}
                </div>
                <h3 className="font-display font-bold text-xl text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed font-body">{card.desc}</p>
                <Link to={card.link}
                  className="inline-flex items-center gap-1.5 text-purple-600 font-semibold text-sm hover:text-purple-700 transition-all group/link">
                  {card.cta}
                  <span className="transition-all duration-300 group-hover/link:translate-x-2 group-hover/link:scale-125">→</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ── Features ── */}
        <div className="mt-24 text-center">
          <Reveal>
            <h2 className="font-display font-bold text-4xl text-gray-900 mb-3">{t('poweredByAI')} 🤖</h2>
            <p className="text-gray-500 mb-12 text-lg">Everything you need to make your city better</p>
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
                <div className="glass rounded-2xl p-5 text-left tilt-card shadow-fun cursor-default group">
                  <div className="text-3xl mb-3 transition-all duration-300 group-hover:scale-125 group-hover:rotate-6 inline-block">{f.icon}</div>
                  <div className="font-display font-semibold text-gray-900 text-sm mb-1">{f.label}</div>
                  <div className="text-gray-500 text-xs font-body leading-relaxed">{f.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <Reveal className="mt-20">
          <div className="rounded-3xl p-10 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)' }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
            <div className="relative z-10">
              <div className="text-5xl mb-4 animate-heartbeat inline-block">🌟</div>
              <h2 className="font-display font-bold text-3xl text-white mb-3">Ready to make a difference?</h2>
              <p className="text-purple-200 mb-8 text-lg">Join thousands of citizens already using CivicVoice</p>
              <Link to="/citizen/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-bold rounded-2xl btn-press text-lg"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
                🚀 Get Started Free
              </Link>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="relative z-10 border-t border-purple-100 py-8 text-center text-gray-500 text-sm bg-white/50 font-body animate-fade-in-slow">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl animate-heartbeat">💜</span>
          <span>Made with love for better cities</span>
        </div>
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
};

export default LandingPage;

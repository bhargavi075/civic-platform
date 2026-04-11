import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { translateComplaints } from '../../utils/translateCache';
import { useCountUp } from '../../animations/useAnimations';

const statusColors  = { Pending: 'status-pending', InProgress: 'status-inprogress', Resolved: 'status-resolved' };
const categoryIcons = { Roads: '🛣️', Municipal: '🗑️', Electricity: '⚡', Water: '💧', Parks: '🌳', Other: '📋' };

// ── Priority badge ────────────────────────────────────────────────────────────
const priorityConfig = {
  High:   { cls: 'bg-red-100 text-red-700 border border-red-200',       icon: '🔴' },
  Medium: { cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: '🟡' },
  Low:    { cls: 'bg-green-100 text-green-700 border border-green-200', icon: '🟢' },
};

const PriorityBadge = ({ priority }) => {
  const cfg = priorityConfig[priority] || priorityConfig.Low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
      {cfg.icon} {priority || 'Low'}
    </span>
  );
};

// ── Officer Advice Panel (shown inside update modal) ──────────────────────────
const OfficerAdvicePanel = ({ advice }) => {
  const [expanded, setExpanded] = useState(false);
  if (!advice) return null;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-teal-800 flex items-center gap-1">
          🤖 AI Suggested Action
        </p>
        <button type="button" onClick={() => setExpanded(v => !v)}
          className="text-xs text-teal-500 hover:text-teal-700 font-semibold">
          {expanded ? '▲ Less' : '▼ Steps'}
        </button>
      </div>

      {advice.urgencyNote && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 mb-2">
          {advice.urgencyNote}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div className="bg-white rounded-lg p-2 border border-teal-100">
          <p className="text-teal-400 font-semibold mb-0.5">💡 Solution</p>
          <p className="text-gray-600 leading-snug">{advice?.solution ?? 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-teal-100">
          <p className="text-teal-400 font-semibold mb-0.5">⏱️ Time</p>
          <p className="text-gray-700 font-bold">{advice?.estimatedTime ?? 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-teal-100">
          <p className="text-teal-400 font-semibold mb-0.5">💰 Cost</p>
          <p className="text-gray-700 font-bold">{advice?.estimatedCost ?? 'N/A'}</p>
        </div>
      </div>

      {expanded && advice?.steps?.length > 0 && (
        <ol className="space-y-1 mt-2">
          {advice.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="flex-shrink-0 w-4 h-4 bg-teal-100 text-teal-700 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

// ── Animated stat card ────────────────────────────────────────────────────────
const StatCard = ({ opt, stats, filter, setFilter, index }) => {
  const isActive = filter === opt.value;
  const count = useCountUp(stats[opt.statKey] ?? 0, 1000);

  return (
    <button
      type="button"
      onClick={() => setFilter(opt.value)}
      className={[
        'card p-4 text-left w-full card-lift animate-fade-up',
        isActive ? opt.activeBg : opt.defaultBg,
        isActive ? opt.activeRing : '',
        'cursor-pointer transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
      ].join(' ')}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{opt.icon}</span>
        <span className={`font-display font-bold text-3xl ${opt.textColor} stat-card-num`}>{count}</span>
      </div>
      <p className="text-gray-500 text-xs font-medium">{opt.cardLabel}</p>
      {isActive && (
        <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.textColor} bg-white/70 animate-scale-in`}>
          ● Active filter
        </span>
      )}
    </button>
  );
};

// ── Update Modal — UPDATED: fetches and shows AI advice ──────────────────────
const UpdateModal = ({ complaint, onClose, onUpdate }) => {
  const { t } = useLang();
  const [status,       setStatus]      = useState(complaint.status);
  const [note,         setNote]        = useState(complaint.resolutionNote || '');
  const [images,       setImages]      = useState([]);
  const [loading,      setLoading]     = useState(false);
  const [advice,       setAdvice]      = useState(null);
  const [adviceLoading,setAdviceLoading] = useState(true);

  // Fetch full complaint detail (which includes officerAdvice) on modal open
  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        const { data } = await api.getComplaint(complaint._id);
        console.log('[OfficerModal] Complaint detail:', data);
        console.log('[OfficerModal] Officer Advice:', data.officerAdvice);
        setAdvice(data.officerAdvice || null);
      } catch (err) {
        console.error('[OfficerModal] Could not fetch advice:', err);
      } finally {
        setAdviceLoading(false);
      }
    };
    fetchAdvice();
  }, [complaint._id]);

  const handleImageUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages(imgs => [...imgs, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateOfficerComplaint(complaint._id, { status, resolutionNote: note, resolutionImages: images });
      onUpdate();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const statuses = [
    { value: 'Pending',    label: t('pending'),      activeClass: 'bg-amber-500 text-white'   },
    { value: 'InProgress', label: t('inProgress'),   activeClass: 'bg-blue-500 text-white'    },
    { value: 'Resolved',   label: t('resolvedStat'), activeClass: 'bg-emerald-500 text-white' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-up-modal my-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-gray-900">{t('updateComplaint')}</h3>
          <button type="button" onClick={onClose}
            className="p-2 hover:bg-purple-50 rounded-xl transition-colors btn-press">✕</button>
        </div>

        {/* Complaint summary with priority */}
        <div className="bg-white/70 rounded-2xl p-3 mb-4 border border-purple-50">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-800 text-sm">{complaint.title}</p>
            <PriorityBadge priority={complaint.priority} />
          </div>
          <p className="text-gray-500 text-xs line-clamp-2">{complaint.description}</p>
          {complaint.address && (
            <p className="text-gray-400 text-xs mt-1">📍 {complaint.address}</p>
          )}
        </div>

        {/* ── AI Officer Advice ────────────────────────────────────────── */}
        {adviceLoading ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 mb-4 flex items-center gap-2 text-xs text-teal-500">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            Loading AI suggestion…
          </div>
        ) : (
          <OfficerAdvicePanel advice={advice} />
        )}

        {/* Update form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">{t('updateStatus')}</label>
            <div className="flex gap-3">
              {statuses.map(s => (
                <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 btn-press ${
                    status === s.value ? s.activeClass + ' scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">{t('resolutionNoteLabel')}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="input-field resize-none input-glow" placeholder={t('resolutionNotePlaceholder')} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">{t('resolutionImages')}</label>
            <label className="block border-2 border-dashed border-purple-100 rounded-xl p-4 text-center cursor-pointer hover:border-teal-400 transition-all text-sm text-gray-500">
              {t('uploadBeforeAfter')}
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
            {images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-14 h-14 object-cover rounded-lg media-preview animate-scale-in" />
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 btn-press">
            {loading ? <><div className="spinner" /> {t('updating')}</> : t('updateStatusBtn')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Complaint list item ───────────────────────────────────────────────────────
const ComplaintItem = ({ c, index, getSlaStatus, setSelected, t }) => {
  const sla = getSlaStatus(c);
  return (
    <div
      className="p-5 hover:bg-purple-50/50 transition-colors animate-fade-up"
      style={{ animationDelay: `${index * 55}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{categoryIcons[c.category] || '📋'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display font-semibold text-gray-900 truncate">{c.title}</h3>
              <span className={statusColors[c.status]}>
                {c.status === 'InProgress' ? t('inProgress') : c.status === 'Pending' ? t('pending') : t('resolvedStat')}
              </span>
              {/* ── UPDATED: use PriorityBadge component ── */}
              <PriorityBadge priority={c.priority} />
              {sla && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sla.color}`}>{sla.label}</span>}
            </div>

            <p className="text-gray-500 text-sm line-clamp-2">{c.description}</p>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <span>📁 {c.department}</span>
              <span>👍 {c.votes} votes</span>
              <span>📅 {new Date(c.createdAt).toLocaleDateString()}</span>
              {c.citizenId && <span>👤 {c.isAnonymous ? t('anonymous') : c.citizenId?.name || t('citizen')}</span>}
              {c.slaDeadline && <span>⏰ Due: {new Date(c.slaDeadline).toLocaleDateString()}</span>}
              {/* ── UPDATED: show address if no GPS ── */}
              {c.address && !c.latitude && (
                <span className="truncate max-w-[160px]">📍 {c.address}</span>
              )}
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setSelected(c)}
          className="flex-shrink-0 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-xl transition-all btn-press">
          {t('update')}
        </button>
      </div>

      {c.images?.length > 0 && (
        <div className="flex gap-2 mt-3 ml-9">
          {c.images.slice(0, 3).map((img, i) => (
            <img key={i} src={img} alt="" className="w-14 h-14 object-cover rounded-lg media-preview" />
          ))}
          {c.images.length > 3 && (
            <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-xs text-gray-500">
              +{c.images.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const OfficerDashboard = () => {
  const { user }    = useAuth();
  const { t, lang } = useLang();

  const [rawComplaints,     setRawComplaints]     = useState([]);
  const [displayComplaints, setDisplayComplaints] = useState([]);
  const [stats,       setStats]       = useState({});
  const [loading,     setLoading]     = useState(true);
  const [translating, setTranslating] = useState(false);
  const [filter,      setFilter]      = useState('all');
  const [selected,    setSelected]    = useState(null);
  const prevLang = useRef(lang);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    if (rawComplaints.length > 0) applyTranslation(rawComplaints, lang);
  }, [lang, rawComplaints]);

  const applyTranslation = async (data, targetLang) => {
    if (targetLang === 'en') { setDisplayComplaints(data); return; }
    setTranslating(true);
    try {
      const translated = await translateComplaints(data, targetLang);
      setDisplayComplaints(translated);
    } catch {
      setDisplayComplaints(data);
    } finally {
      setTranslating(false);
    }
  };

  const fetchData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([api.getOfficerComplaints(), api.getOfficerStats()]);
      setRawComplaints(cRes.data);
      await applyTranslation(cRes.data, lang);
      setStats(sRes.data);
    } catch {}
    setLoading(false);
  };

  const getSlaStatus = (complaint) => {
    if (!complaint.slaDeadline || complaint.status === 'Resolved') return null;
    const hoursLeft = (new Date(complaint.slaDeadline) - new Date()) / (1000 * 60 * 60);
    if (hoursLeft < 0)  return { label: t('slaBreached'), color: 'text-red-600 bg-red-50' };
    if (hoursLeft < 24) return { label: `${Math.round(hoursLeft)}h left`, color: 'text-orange-600 bg-orange-50' };
    return null;
  };

  const filterOptions = [
    { value: 'all',        label: t('all'),          cardLabel: t('totalAssigned'), icon: '📋', statKey: 'total',      textColor: 'text-gray-700',    activeBg: 'bg-purple-100/80',  activeRing: 'ring-2 ring-purple-400',  defaultBg: 'bg-purple-50/50' },
    { value: 'Pending',    label: t('pending'),      cardLabel: t('pending'),       icon: '⏳', statKey: 'pending',    textColor: 'text-amber-700',   activeBg: 'bg-amber-100/80',   activeRing: 'ring-2 ring-amber-400',   defaultBg: 'bg-amber-50/70' },
    { value: 'InProgress', label: t('inProgress'),   cardLabel: t('inProgress'),    icon: '🔧', statKey: 'inProgress', textColor: 'text-blue-700',    activeBg: 'bg-sky-100/80',     activeRing: 'ring-2 ring-sky-400',     defaultBg: 'bg-sky-50/70' },
    { value: 'Resolved',   label: t('resolvedStat'), cardLabel: t('resolvedStat'),  icon: '✅', statKey: 'resolved',   textColor: 'text-emerald-700', activeBg: 'bg-emerald-100/80', activeRing: 'ring-2 ring-emerald-400', defaultBg: 'bg-emerald-50/70' },
  ];

  const filtered = displayComplaints.filter(c => filter === 'all' || c.status === filter);
  const activeOption = filterOptions.find(f => f.value === filter);

  return (
    <div className="min-h-screen bg-officer">
      <Navbar role="officer" />

      {selected && (
        <UpdateModal complaint={selected} onClose={() => setSelected(null)} onUpdate={fetchData} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-page-enter">
        <div className="mb-6 animate-fade-up d0">
          <h1 className="font-display font-bold text-2xl text-gray-900">{t('officerDashboardTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.department ? `${t('department')}: ${user.department}` : t('officerDashboardTitle')}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {filterOptions.map((opt, i) => (
            <StatCard key={opt.value} opt={opt} stats={stats} filter={filter} setFilter={setFilter} index={i} />
          ))}
        </div>

        {/* Active filter banner */}
        {filter !== 'all' && !loading && (
          <div className="flex items-center justify-between mb-3 px-4 py-2.5 rounded-xl bg-white border border-purple-100 shadow-sm animate-fade-up">
            <p className="text-sm font-semibold text-gray-700">
              Showing:&nbsp;
              <span className={activeOption?.textColor}>{activeOption?.cardLabel} complaints</span>&nbsp;
              <span className="text-gray-400 font-normal">({filtered.length} {filtered.length === 1 ? 'result' : 'results'})</span>
            </p>
            <button type="button" onClick={() => setFilter('all')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline">
              Show all
            </button>
          </div>
        )}

        {/* Complaints list */}
        <div className="card animate-fade-up" style={{ animationDelay: '280ms', animationFillMode: 'both' }}>
          <div className="p-5 border-b border-purple-100/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg text-gray-900">{t('assignedComplaints')}</h2>
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold">
                {filtered.length}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map(f => (
                <button key={f.value} type="button" onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 btn-press ${
                    filter === f.value ? 'bg-purple-500 text-white scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center animate-fade-in-slow">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('loadingComplaints')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center animate-scale-in">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-400 font-medium">{t('noComplaintsAssigned')}</p>
              {filter !== 'all' && (
                <button type="button" onClick={() => setFilter('all')}
                  className="mt-3 text-sm text-purple-500 hover:text-purple-700 underline transition-colors">
                  ← Show all complaints
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-purple-50">
              {filtered.map((c, idx) => (
                <ComplaintItem
                  key={c._id} c={c} index={idx}
                  getSlaStatus={getSlaStatus} setSelected={setSelected} t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;

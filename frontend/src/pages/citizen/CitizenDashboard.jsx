import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { speakText, speakComplaintAllLangs, buildText, cancelSpeak } from '../../utils/tts';
import { translateComplaints, translateText } from '../../utils/translateCache';
import { useCountUp, staggerDelay } from '../../animations/useAnimations';

const statusColors  = { Pending: 'status-pending', InProgress: 'status-inprogress', Resolved: 'status-resolved' };
const categoryIcons = { Roads: '🛣️', Municipal: '🗑️', Electricity: '⚡', Water: '💧', Parks: '🌳', Other: '📋' };
const priorityBadge = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };

/* ── Animated stat card (clickable filter) ──────────────────────────────── */
const StatCard = ({ icon, label, value, color, bg, activeBg, activeRing, filterValue, filter, setFilter, index }) => {
  const count   = useCountUp(value, 900);
  const isActive = filter === filterValue;
  return (
    <button
      type="button"
      onClick={() => setFilter(filterValue)}
      aria-pressed={isActive}
      className={[
        'card p-4 text-left w-full card-lift animate-fade-up transition-all duration-200',
        'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
        isActive ? (activeBg || bg) : '',
        isActive ? (activeRing || 'ring-2 ring-purple-400') : '',
      ].join(' ')}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
          <span className={`font-display font-bold text-xl ${color} stat-card-num`}>{count}</span>
        </div>
      </div>
      <p className="text-gray-500 text-xs font-medium">{label}</p>
      {isActive && (
        <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${color} bg-white/70 animate-scale-in`}>
          ● Active filter
        </span>
      )}
    </button>
  );
};

/* ── Confirm Delete Modal ── */
const DeleteModal = ({ complaint, onConfirm, onCancel, t }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up-modal">
      <div className="text-4xl text-center mb-3">🗑️</div>
      <h3 className="font-display font-bold text-lg text-gray-900 text-center mb-2">Delete Complaint?</h3>
      <p className="text-gray-500 text-sm text-center mb-1">
        "<span className="font-semibold text-gray-700">{complaint.title}</span>"
      </p>
      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center mt-3 mb-5">
        ⚠️ This action cannot be undone. Only pending complaints can be deleted.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-purple-100 text-gray-600 font-semibold text-sm hover:bg-purple-50/50 transition-colors btn-press">
          Cancel
        </button>
        <button type="button" onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors btn-press">
          Yes, Delete
        </button>
      </div>
    </div>
  </div>
);

/* ── Complaint row with entry animation ─────────────────────────────────── */
const ComplaintRow = ({ c, rawC, index, isOwner, canDelete, votingId, speakingId, handleVote, handleSpeak, handleSpeakAll, setDeleteTarget, t, lang, filter }) => {
  const allKey = 'all_' + c._id;
  return (
    <div
      className="p-5 hover:bg-purple-50/50 transition-colors animate-fade-up filter-list-enter"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0 mt-0.5">{categoryIcons[c.category] || '📋'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link to={`/citizen/complaint/${c._id}`}
                className="font-display font-semibold text-gray-900 hover:text-purple-700 truncate transition-colors">
                {c.title}
              </Link>
              <span className={statusColors[c.status]}>
                {c.status === 'InProgress' ? t('inProgress') : c.status === 'Pending' ? t('pending') : t('resolvedStat')}
              </span>
              <span className={priorityBadge[c.priority]}>{c.priority}</span>
            </div>
            <p className="text-gray-500 text-sm line-clamp-2">{c.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <span>📁 {c.department || c.category}</span>
              <span>👤 {c.reportedBy || t('citizen')}</span>
              <span>📅 {new Date(c.createdAt).toLocaleDateString()}</span>
              {c.address && <span className="truncate max-w-[150px]">📍 {c.address}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <button type="button" onClick={() => handleVote(c._id)} disabled={votingId === c._id}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-purple-50 transition-all group btn-press">
            <span className="text-lg group-hover:scale-110 transition-transform">
              {votingId === c._id ? '⏳' : '👍'}
            </span>
            <span className="text-xs font-bold text-gray-700">{c.votes}</span>
          </button>

          <button type="button" onClick={() => handleSpeak(c)}
            title={`Read aloud in ${lang.toUpperCase()}`}
            className={`p-2 rounded-xl transition-colors btn-press ${speakingId === c._id ? 'bg-amber-100 text-amber-700' : 'hover:bg-amber-50 text-gray-500'}`}>
            <span className="text-base">{speakingId === c._id ? '⏹️' : '🔊'}</span>
          </button>

          <button type="button" onClick={() => handleSpeakAll(rawC)}
            title="Read in EN + हि + తె"
            className={`p-2 rounded-xl transition-colors text-xs font-bold btn-press ${speakingId === allKey ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50 text-purple-400'}`}>
            {speakingId === allKey ? '⏹' : '🌐'}
          </button>

          {canDelete && (
            <button type="button" onClick={() => setDeleteTarget(rawC)}
              title="Delete complaint"
              className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors btn-press">
              <span className="text-base">🗑️</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [rawComplaints, setRawComplaints]         = useState([]);
  const [displayComplaints, setDisplayComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [translating, setTranslating] = useState(false);
  const [filter, setFilter]         = useState('all');
  const [votingId, setVotingId]     = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const prevLang = useRef(lang);

  useEffect(() => { fetchComplaints(); return () => cancelSpeak(); }, []);

  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    if (rawComplaints.length > 0) applyTranslation(rawComplaints, lang);
  }, [lang, rawComplaints]);

  const fetchComplaints = async () => {
    try {
      const { data } = await api.getComplaints();
      setRawComplaints(data);
      await applyTranslation(data, lang);
    } catch { console.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  const applyTranslation = async (complaints, targetLang) => {
    if (targetLang === 'en') { setDisplayComplaints(complaints); return; }
    setTranslating(true);
    try {
      const translated = await translateComplaints(complaints, targetLang);
      setDisplayComplaints(translated);
    } catch { setDisplayComplaints(complaints); }
    finally { setTranslating(false); }
  };

  const handleVote = async (id) => {
    setVotingId(id);
    try { await api.voteComplaint(id); fetchComplaints(); }
    catch (err) { console.error('Vote failed'); }
    finally { setVotingId(null); }
  };

  const handleSpeak = (complaint) => {
    if (speakingId === complaint._id) { cancelSpeak(); setSpeakingId(null); return; }
    setSpeakingId(complaint._id);
    const text = buildText(complaint, lang);
    speakText(text, lang, () => setSpeakingId(null));
  };

  const handleSpeakAll = (rawComplaint) => {
    const allKey = 'all_' + rawComplaint._id;
    if (speakingId === allKey) { cancelSpeak(); setSpeakingId(null); return; }
    setSpeakingId(allKey);
    speakComplaintAllLangs(rawComplaint, translateText, () => setSpeakingId(null));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteComplaint(deleteTarget._id);
      setDeleteTarget(null);
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete complaint');
    } finally { setDeleting(false); }
  };

  const filterOptions = [
    { value: 'all',        label: t('all') },
    { value: 'Pending',    label: t('pending') },
    { value: 'InProgress', label: t('inProgress') },
    { value: 'Resolved',   label: t('resolvedStat') },
  ];

  const filtered = displayComplaints.filter(c => filter === 'all' || c.status === filter);
  const stats = {
    total:      rawComplaints.length,
    pending:    rawComplaints.filter(c => c.status === 'Pending').length,
    inProgress: rawComplaints.filter(c => c.status === 'InProgress').length,
    resolved:   rawComplaints.filter(c => c.status === 'Resolved').length,
  };

  return (
    <div className="min-h-screen bg-citizen">
      <Navbar role="citizen" />

      {deleteTarget && (
        <DeleteModal
          complaint={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          t={t}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-page-enter">

        {/* Welcome */}
        <div className="flex items-center justify-between mb-6">
          <div className="animate-fade-up d0">
            <h1 className="font-display font-bold text-2xl text-gray-900">
              {t('welcomeBack')}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">{t('trackManage')}</p>
          </div>
          <Link to="/citizen/report" className="btn-primary flex items-center gap-2 btn-press animate-fade-up d1">
            <span>+</span> {t('reportIssue')}
          </Link>
        </div>

        {/* Stats — staggered count-up cards (each card is a filter button) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          {[
            { label: t('totalIssues'),  value: stats.total,      color: 'text-gray-700',    bg: 'bg-gray-100',       activeBg: 'bg-gray-100/80',    activeRing: 'ring-2 ring-gray-400',    icon: '📊', filterValue: 'all'        },
            { label: t('pending'),      value: stats.pending,    color: 'text-amber-700',   bg: 'bg-amber-50/70',    activeBg: 'bg-amber-100/80',   activeRing: 'ring-2 ring-amber-400',   icon: '⏳', filterValue: 'Pending'    },
            { label: t('inProgress'),   value: stats.inProgress, color: 'text-blue-700',    bg: 'bg-sky-50/70',      activeBg: 'bg-sky-100/80',     activeRing: 'ring-2 ring-sky-400',     icon: '🔧', filterValue: 'InProgress' },
            { label: t('resolvedStat'), value: stats.resolved,   color: 'text-emerald-700', bg: 'bg-emerald-50/70',  activeBg: 'bg-emerald-100/80', activeRing: 'ring-2 ring-emerald-400', icon: '✅', filterValue: 'Resolved'   },
          ].map((s, i) => (
            <StatCard key={s.label} {...s} index={i} filter={filter} setFilter={setFilter} />
          ))}
        </div>

        {/* Active filter banner */}
        {filter !== 'all' && !loading && (
          <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl bg-white border border-purple-100 shadow-sm animate-fade-up">
            <p className="text-sm font-semibold text-gray-700">
              Showing:&nbsp;
              <span className="text-purple-600">{filterOptions.find(f => f.value === filter)?.label} complaints</span>&nbsp;
              <span className="text-gray-400 font-normal">({filtered.length} {filtered.length === 1 ? 'result' : 'results'})</span>
            </p>
            <button type="button" onClick={() => setFilter('all')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline">
              Show all
            </button>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { to: '/citizen/report', icon: '📝', label: t('newReport') },
            { to: '/citizen/map',    icon: '🗺️', label: t('mapView') },
            { to: '/citizen/report', icon: '🎤', label: t('voiceReport') },
            { to: '/citizen/map',    icon: '📍', label: t('nearbyIssues') },
          ].map((q, i) => (
            <Link
              key={q.to + q.label}
              to={q.to}
              className="card p-4 flex items-center gap-3 card-lift animate-fade-up"
              style={{ animationDelay: `${200 + i * 70}ms`, animationFillMode: 'both' }}
            >
              <span className="text-2xl">{q.icon}</span>
              <span className="font-display font-semibold text-sm text-gray-700">{q.label}</span>
            </Link>
          ))}
        </div>

        {/* Complaints list */}
        <div className="card animate-fade-up" style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
          <div className="p-5 border-b border-purple-100/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg text-gray-900">{t('recentComplaints')}</h2>
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300">
                {filtered.length}
              </span>
              {translating && (
                <span className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                  <span className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin inline-block" />
                  Translating…
                </span>
              )}
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
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('loadingComplaints')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center animate-scale-in">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-400 font-medium">{t('noComplaintsFound')}</p>
              {filter !== 'all' ? (
                <button type="button" onClick={() => setFilter('all')}
                  className="mt-3 text-sm text-purple-500 hover:text-purple-700 underline transition-colors">
                  ← Show all complaints
                </button>
              ) : (
                <Link to="/citizen/report" className="text-purple-600 text-sm hover:underline mt-2 inline-block">
                  {t('beFirstToReport')}
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-purple-50">
              {filtered.map((c, idx) => {
                const rawC = rawComplaints.find(r => r._id === c._id) || c;
                const isOwner = rawC.isOwner === true;
                const canDelete = isOwner && rawC.status === 'Pending';
                return (
                  <ComplaintRow
                    key={c._id}
                    c={c} rawC={rawC} index={idx}
                    isOwner={isOwner} canDelete={canDelete}
                    votingId={votingId} speakingId={speakingId}
                    handleVote={handleVote} handleSpeak={handleSpeak}
                    handleSpeakAll={handleSpeakAll}
                    setDeleteTarget={setDeleteTarget}
                    t={t} lang={lang} filter={filter}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;

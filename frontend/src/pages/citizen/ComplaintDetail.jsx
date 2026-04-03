import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { speakText, speakComplaintAllLangs, buildText, cancelSpeak } from '../../utils/tts';
import { translateText } from '../../utils/translateCache';

const statusColors  = { Pending: 'status-pending', InProgress: 'status-inprogress', Resolved: 'status-resolved' };
const categoryIcons = { Roads: '🛣️', Municipal: '🗑️', Electricity: '⚡', Water: '💧', Parks: '🌳', Other: '📋' };

// ── Priority badge helper ─────────────────────────────────────────────────────
const priorityConfig = {
  High:   { cls: 'bg-red-100 text-red-700 border border-red-200',    icon: '🔴' },
  Medium: { cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: '🟡' },
  Low:    { cls: 'bg-green-100 text-green-700 border border-green-200', icon: '🟢' },
};

const PriorityBadge = ({ priority }) => {
  const cfg = priorityConfig[priority] || priorityConfig.Low;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      {cfg.icon} {priority || 'Low'}
    </span>
  );
};

// ── Media grid ────────────────────────────────────────────────────────────────
const MediaGrid = ({ media = [], images = [] }) => {
  const items = media.length > 0
    ? media
    : images.map(url => ({ url, type: 'image' }));

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-xl overflow-hidden bg-gray-900 group">
          {item.type === 'image' ? (
            <img src={item.url} alt={`Media ${i + 1}`} className="w-full h-32 object-cover" />
          ) : (
            <video src={item.url} className="w-full h-32 object-cover" controls preload="metadata" />
          )}
          <span className={`absolute top-1.5 left-1.5 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
            item.type === 'video' ? 'bg-indigo-600/90' : 'bg-black/40'
          }`}>
            {item.type === 'video' ? '▶ Video' : '🖼 Photo'}
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            ↗ Open
          </a>
        </div>
      ))}
    </div>
  );
};

// ── Officer Advice Panel (NEW) ────────────────────────────────────────────────
// Displays the AI-generated officer suggestion from GET /complaints/:id
const OfficerAdvicePanel = ({ advice }) => {
  const [expanded, setExpanded] = useState(false);

  if (!advice) return null;

  return (
    <div className="card p-5 border border-teal-200 bg-teal-50/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-teal-800 flex items-center gap-2">
          🤖 AI Officer Suggestion
        </h3>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-teal-600 hover:text-teal-800 font-semibold transition-colors"
        >
          {expanded ? '▲ Less' : '▼ More'}
        </button>
      </div>

      {/* Urgency note (shown when High priority) */}
      {advice.urgencyNote && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          {advice.urgencyNote}
        </div>
      )}

      {/* Core 3-column summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded-xl p-3 border border-teal-100">
          <p className="text-xs text-teal-500 font-semibold mb-1">💡 Suggested Solution</p>
          <p className="text-sm text-gray-700 font-medium leading-snug">
            {advice?.solution ?? 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-teal-100">
          <p className="text-xs text-teal-500 font-semibold mb-1">⏱️ Estimated Time</p>
          <p className="text-sm text-gray-700 font-bold">
            {advice?.estimatedTime ?? 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-teal-100">
          <p className="text-xs text-teal-500 font-semibold mb-1">💰 Estimated Cost</p>
          <p className="text-sm text-gray-700 font-bold">
            {advice?.estimatedCost ?? 'N/A'}
          </p>
        </div>
      </div>

      {/* Expandable step-by-step plan */}
      {expanded && advice?.steps?.length > 0 && (
        <div className="mt-1">
          <p className="text-xs font-semibold text-teal-700 mb-2">📋 Step-by-Step Action Plan</p>
          <ol className="space-y-1.5">
            {advice.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-100 text-teal-700 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-teal-400 mt-3">
        Generated by AI based on complaint category and keywords.
      </p>
    </div>
  );
};


const ComplaintDetail = () => {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { lang, t }   = useLang();

  const [rawComplaint, setRawComplaint] = useState(null);
  const [complaint,    setComplaint]    = useState(null);
  const [officerAdvice, setOfficerAdvice] = useState(null);  // ← NEW
  const [loading,      setLoading]      = useState(true);
  const [translating,  setTranslating]  = useState(false);
  const [voting,       setVoting]       = useState(false);
  const [speaking,     setSpeaking]     = useState(false);
  const [speakingAll,  setSpeakingAll]  = useState(false);
  const [readLang,     setReadLang]     = useState(lang);
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const prevLang = useRef(lang);

  useEffect(() => { fetchComplaint(); return () => cancelSpeak(); }, [id]);

  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    setReadLang(lang);
    if (rawComplaint) applyTranslation(rawComplaint, lang);
  }, [lang, rawComplaint]);

  const fetchComplaint = async () => {
    try {
      const { data } = await api.getComplaint(id);

      console.log('[ComplaintDetail] API response:', data);
      console.log('[ComplaintDetail] Priority:', data.priority);
      console.log('[ComplaintDetail] Officer Advice:', data.officerAdvice);

      // ── NEW: extract officerAdvice from response ────────────────────────
      if (data.officerAdvice) {
        setOfficerAdvice(data.officerAdvice);
      }

      setRawComplaint(data);
      await applyTranslation(data, lang);
    } catch {
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  const applyTranslation = async (c, targetLang) => {
    if (targetLang === 'en') { setComplaint(c); return; }
    setTranslating(true);
    try {
      const [title, description, resolutionNote] = await Promise.all([
        translateText(c.title,       'en', targetLang),
        translateText(c.description, 'en', targetLang),
        c.resolutionNote ? translateText(c.resolutionNote, 'en', targetLang) : Promise.resolve(''),
      ]);
      setComplaint({ ...c, title, description, resolutionNote });
    } catch {
      setComplaint(c);
    } finally {
      setTranslating(false);
    }
  };

  const handleVote = async () => {
    if (!user) return;
    setVoting(true);
    try { await api.voteComplaint(id); fetchComplaint(); } catch {}
    setVoting(false);
  };

  const handleSpeak = () => {
    if (!window.speechSynthesis) return alert('Text-to-speech not supported');
    if (speaking) { cancelSpeak(); setSpeaking(false); return; }
    setSpeaking(true);
    speakText(buildText(complaint, readLang), readLang, () => setSpeaking(false));
  };

  const handleSpeakAll = () => {
    if (!window.speechSynthesis) return alert('Text-to-speech not supported');
    if (speakingAll) { cancelSpeak(); setSpeakingAll(false); return; }
    if (speaking)    { cancelSpeak(); setSpeaking(false); }
    setSpeakingAll(true);
    speakComplaintAllLangs(rawComplaint, translateText, () => setSpeakingAll(false));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteComplaint(id);
      navigate('/citizen');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const getTimeline = () => [
    { label: t('pending'),      done: true,                                                  date: complaint?.createdAt },
    { label: 'Under Review',    done: ['InProgress', 'Resolved'].includes(complaint?.status) },
    { label: t('inProgress'),   done: ['InProgress', 'Resolved'].includes(complaint?.status) },
    { label: t('resolvedStat'), done: complaint?.status === 'Resolved',                      date: complaint?.resolvedAt },
  ];

  /* ── Loading state ── */
  if (loading) return (
    <div className="min-h-screen bg-citizen">
      <Navbar role="citizen" />
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  /* ── Not found ── */
  if (!complaint) return (
    <div className="min-h-screen bg-citizen">
      <Navbar role="citizen" />
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="font-display font-bold text-xl text-gray-800 mb-2">{t('complaintNotFound')}</h2>
        <Link to="/citizen" className="btn-primary">{t('backToDashboard')}</Link>
      </div>
    </div>
  );

  const isOwner   = rawComplaint?.isOwner === true;
  const canDelete = isOwner && rawComplaint?.status === 'Pending';

  // ── Safe map coords ────────────────────────────────────────────────────────
  const hasCoords = complaint.latitude != null && complaint.longitude != null;
  const mapCenter = hasCoords ? [complaint.latitude, complaint.longitude] : [17.385, 78.4867];

  return (
    <div className="min-h-screen bg-citizen">
      <Navbar role="citizen" />

      {/* Translating overlay */}
      {translating && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-5 flex items-center gap-4">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-display font-semibold text-gray-700">Translating…</p>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-display font-bold text-lg text-gray-900 text-center mb-2">Delete Complaint?</h3>
            <p className="text-gray-500 text-sm text-center mb-3">"{complaint.title}"</p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center mb-5">
              ⚠️ This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-purple-100 text-gray-600 font-semibold text-sm hover:bg-purple-50/50">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2">
                {deleting ? <><div className="spinner"></div> Deleting…</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/citizen" className="text-gray-400 hover:text-gray-600 transition-colors">{t('back')}</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 text-sm">{t('complaintDetails')}</span>
          </div>
          {canDelete && (
            <button type="button" onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors">
              🗑️ Delete
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Complaint header */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{categoryIcons[complaint.category] || '📋'}</span>
                  <div>
                    <h1 className="font-display font-bold text-xl text-gray-900">{complaint.title}</h1>
                    <p className="text-gray-400 text-xs mt-0.5">{complaint.department}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={statusColors[complaint.status]}>
                    {complaint.status === 'InProgress' ? t('inProgress') : complaint.status === 'Pending' ? t('pending') : t('resolvedStat')}
                  </span>
                  {/* ── NEW: Prominent priority badge ────────────────────── */}
                  <PriorityBadge priority={complaint.priority} />
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">{complaint.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/70 rounded-2xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('reportedBy')}</p>
                  <p className="font-semibold text-gray-700">
                    {complaint.reportedBy || (complaint.isAnonymous ? t('anonymous') : t('citizen'))}
                  </p>
                </div>
                <div className="bg-white/70 rounded-2xl p-3">
                  {/* ── UPDATED: Priority cell with coloured badge ─────── */}
                  <p className="text-gray-400 text-xs mb-1">{t('priority')}</p>
                  <PriorityBadge priority={complaint.priority} />
                </div>
                <div className="bg-white/70 rounded-2xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('reportedOn')}</p>
                  <p className="font-semibold text-gray-700">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-white/70 rounded-2xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{t('slaDeadline')}</p>
                  <p className="font-semibold text-gray-700">
                    {complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleDateString() : t('naLabel')}
                  </p>
                </div>
              </div>

              {/* TTS controls */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-purple-100/60 flex-wrap">
                <button type="button" onClick={handleVote} disabled={voting || !user}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-primary-100 text-purple-700 rounded-xl font-semibold text-sm transition-colors">
                  {voting ? '⏳' : '👍'} {t('support')} ({complaint.votes})
                </button>

                <div className="flex items-center rounded-xl overflow-hidden border border-purple-100">
                  <select value={readLang}
                    onChange={e => { setReadLang(e.target.value); if (speaking) { cancelSpeak(); setSpeaking(false); } }}
                    className="text-xs px-2 py-2 bg-gray-50 border-r border-purple-100 focus:outline-none cursor-pointer">
                    <option value="en">EN</option>
                    <option value="hi">हि</option>
                    <option value="te">తె</option>
                  </select>
                  <button type="button" onClick={handleSpeak}
                    className={`flex items-center gap-1.5 px-3 py-2 font-semibold text-sm transition-colors ${
                      speaking ? 'bg-amber-100 text-amber-700' : 'bg-white hover:bg-purple-50/50 text-gray-700'
                    }`}>
                    {speaking ? '⏹️ Stop' : '🔊 Read'}
                  </button>
                </div>

                <button type="button" onClick={handleSpeakAll}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm transition-colors border ${
                    speakingAll
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-white hover:bg-purple-50 text-purple-600 border-purple-200'
                  }`}>
                  {speakingAll ? '⏹️ Stop' : '🌐 Read All (EN+HI+TE)'}
                </button>
              </div>

              {speakingAll && (
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
                  <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                  Reading in English → Hindi → Telugu…
                </div>
              )}
            </div>

            {/* ── NEW: Officer Advice Panel ─────────────────────────────── */}
            <OfficerAdvicePanel advice={officerAdvice} />

            {/* Media section */}
            {((complaint.media && complaint.media.length > 0) || (complaint.images && complaint.images.length > 0)) && (
              <div className="card p-6">
                <h3 className="font-display font-semibold text-gray-800 mb-3">
                  📎 Issue Media
                  {complaint.media?.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({complaint.media.filter(m => m.type === 'image').length} photo
                      {complaint.media.filter(m => m.type === 'image').length !== 1 ? 's' : ''},&nbsp;
                      {complaint.media.filter(m => m.type === 'video').length} video
                      {complaint.media.filter(m => m.type === 'video').length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                <MediaGrid media={complaint.media} images={complaint.images} />
              </div>
            )}

            {/* Resolution note */}
            {complaint.status === 'Resolved' && complaint.resolutionNote && (
              <div className="card p-6 border border-emerald-200 bg-emerald-50">
                <h3 className="font-display font-semibold text-emerald-800 mb-2">{t('resolutionNote')}</h3>
                <p className="text-emerald-700 text-sm">{complaint.resolutionNote}</p>
                {complaint.resolvedAt && (
                  <p className="text-emerald-500 text-xs mt-2">
                    {t('resolvedOn')} {new Date(complaint.resolvedAt).toLocaleDateString()}
                  </p>
                )}
                {complaint.resolutionImages?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {complaint.resolutionImages.map((img, i) => (
                      <img key={i} src={img} alt="" className="rounded-xl w-full h-24 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Location map — ── UPDATED: null-safe ────────────────────── */}
            <div className="card p-6">
              <h3 className="font-display font-semibold text-gray-800 mb-3">{t('locationLabel')}</h3>

              {hasCoords ? (
                <div className="h-52 rounded-xl overflow-hidden mb-2">
                  <MapContainer center={mapCenter} zoom={15}
                    style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={mapCenter}>
                      <Popup>{complaint.title}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <div className="h-24 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 text-sm mb-2">
                  📍 Map unavailable — address-only complaint
                </div>
              )}

              {complaint.address && (
                <p className="text-xs text-gray-500">📍 {complaint.address}</p>
              )}
              {hasCoords && (
                <p className="text-xs text-gray-400 mt-1">
                  Coordinates: {complaint.latitude?.toFixed(6)}, {complaint.longitude?.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">

            {/* Status timeline */}
            <div className="card p-5">
              <h3 className="font-display font-semibold text-gray-800 mb-4">{t('statusTimeline')}</h3>
              <div className="space-y-3">
                {getTimeline().map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                      {step.date && <p className="text-xs text-gray-400">{new Date(step.date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned officer */}
            {complaint.officerId && (
              <div className="card p-5">
                <h3 className="font-display font-semibold text-gray-800 mb-3">{t('assignedOfficer')}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-lg">👮</div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{complaint.officerId.name}</p>
                    <p className="text-gray-400 text-xs">{complaint.officerId.department}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Issue info */}
            <div className="card p-5">
              <h3 className="font-display font-semibold text-gray-800 mb-3">{t('issueInfo')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('category')}</span>
                  <span className="font-medium">{complaint.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('department')}</span>
                  <span className="font-medium text-right max-w-[130px]">{complaint.department}</span>
                </div>
                {/* ── UPDATED: Priority row with badge ─── */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t('priority')}</span>
                  <PriorityBadge priority={complaint.priority} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('severity')}</span>
                  <span className="font-medium">{complaint.severity}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('votes')}</span>
                  <span className="font-medium">{complaint.votes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('anonymous')}</span>
                  <span className="font-medium">{complaint.isAnonymous ? t('yes') : t('no')}</span>
                </div>
              </div>
            </div>

            {/* AI suggestion summary (compact sidebar version) */}
            {officerAdvice && (
              <div className="card p-5 border border-teal-100">
                <h3 className="font-display font-semibold text-teal-800 mb-3 text-sm flex items-center gap-1">
                  🤖 AI Recommendation
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-teal-500 font-semibold">Time: </span>
                    <span className="text-gray-600">{officerAdvice?.estimatedTime ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-teal-500 font-semibold">Cost: </span>
                    <span className="text-gray-600">{officerAdvice?.estimatedCost ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-teal-500 font-semibold">Dept: </span>
                    <span className="text-gray-600">{officerAdvice?.department ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;

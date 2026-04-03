import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useLang } from '../../context/LanguageContext';

/* ─── Translation helper (unchanged from original) ──────────────────────────── */
const translateText = async (text, fromLang, toLang) => {
  if (!text || !text.trim() || fromLang === toLang) return text;
  const langMap = { en: 'en', hi: 'hi', te: 'te' };
  const from = langMap[fromLang] || 'en';
  const to   = langMap[toLang]   || 'en';
  try {
    const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) return data.responseData.translatedText;
    return text;
  } catch {
    return text;
  }
};

const SPEECH_LANGS = [
  { code: 'en-US', label: 'English',    short: 'en' },
  { code: 'hi-IN', label: 'हिंदी',     short: 'hi' },
  { code: 'te-IN', label: 'తెలుగు',   short: 'te' },
  { code: 'ta-IN', label: 'Tamil',      short: 'ta' },
  { code: 'mr-IN', label: 'Marathi',    short: 'mr' },
  { code: 'bn-IN', label: 'Bengali',    short: 'bn' },
  { code: 'gu-IN', label: 'Gujarati',   short: 'gu' },
  { code: 'kn-IN', label: 'Kannada',    short: 'kn' },
  { code: 'ml-IN', label: 'Malayalam',  short: 'ml' },
  { code: 'pa-IN', label: 'Punjabi',    short: 'pa' },
];

/* ─── Duplicate-found modal (unchanged) ─────────────────────────────────────── */
const DuplicateModal = ({ duplicate, onSupport, onDismiss, t }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
      <div className="text-4xl text-center mb-4">⚠️</div>
      <h3 className="font-display font-bold text-xl text-center text-gray-900 mb-2">{t('similarIssueFound')}</h3>
      <p className="text-gray-600 text-center text-sm mb-5">{t('similarIssueDesc')}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
        <p className="font-semibold text-gray-800 text-sm mb-1">{duplicate.title}</p>
        <p className="text-gray-500 text-xs line-clamp-2">{duplicate.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>👍 {duplicate.votes} votes</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onSupport} className="btn-primary flex-1">{t('supportThisIssue')}</button>
        <button type="button" onClick={onDismiss} className="btn-secondary flex-1">{t('reportAnyway')}</button>
      </div>
    </div>
  </div>
);

/* ─── Map click handler (unchanged) ─────────────────────────────────────────── */
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return position ? <Marker position={position} /> : null;
};

/* ─── Reusable voice-input button (unchanged) ───────────────────────────────── */
const VoiceButton = ({ onResult, speechLang, t }) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Speech recognition not supported in this browser.');
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang            = speechLang;
    rec.continuous      = false;
    rec.interimResults  = false;
    recRef.current      = rec;
    rec.onstart   = () => setListening(true);
    rec.onresult  = (e) => { onResult(e.results[0][0].transcript); };
    rec.onerror   = () => setListening(false);
    rec.onend     = () => setListening(false);
    rec.start();
  };

  return (
    <button type="button" onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
        listening
          ? 'bg-red-100 text-red-700 animate-pulse'
          : 'bg-primary-100 text-purple-700 hover:bg-primary-200'
      }`}>
      <span>{listening ? '⏹️' : '🎤'}</span>
      {listening ? t('stop') : t('voiceInput')}
    </button>
  );
};

// ─── UPDATED: helper that decides the preview type from a File object ─────────
/**
 * Returns 'image' or 'video' based on the MIME type of the given File.
 * @param {File} file
 * @returns {'image'|'video'}
 */
function getFileKind(file) {
  return file.type.startsWith('video/') ? 'video' : 'image';
}


const ReportIssue = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const [form, setForm] = useState({
    title: '', description: '', latitude: 17.385, longitude: 78.4867,
    address: '', isAnonymous: false, severity: 1, language: 'en'
  });

  // ─── UPDATED: mediaFiles stores { file: File, preview: string, kind: 'image'|'video' }
  // The old `images` state (base64 strings) is replaced with this structured array.
  const [mediaFiles, setMediaFiles] = useState([]);

  const [position,    setPosition]   = useState([17.385, 78.4867]);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState('');
  const [duplicate,   setDuplicate]  = useState(null);
  const [locationMode, setLocationMode] = useState('map');   // 'map' | 'address'
  const [speechLang,  setSpeechLang] = useState('en-US');
  const [inputLang,   setInputLang]  = useState('en');
  const [translating, setTranslating]= useState(false);
  const checkTimerRef = useRef(null);
  const prevLangRef   = useRef(lang);

  /* ── Geolocation on mount (unchanged) ───────────────────────────────────── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        reverseGeocode(lat, lng);
      }, () => {});
    }
  }, []);

  /* ── Update lat/lng when map pin moves (unchanged) ──────────────────────── */
  useEffect(() => {
    setForm(f => ({ ...f, latitude: position[0], longitude: position[1] }));
    reverseGeocode(position[0], position[1]);
  }, [position]);

  /* ── Auto-translate when UI language switches (unchanged) ───────────────── */
  useEffect(() => {
    const prevLang = prevLangRef.current;
    prevLangRef.current = lang;
    if (prevLang === lang) return;

    const hasTitle = form.title.trim().length > 0;
    const hasDesc  = form.description.trim().length > 0;
    if (!hasTitle && !hasDesc) return;

    const doTranslate = async () => {
      setTranslating(true);
      try {
        const [newTitle, newDesc] = await Promise.all([
          hasTitle ? translateText(form.title,       inputLang, lang) : Promise.resolve(form.title),
          hasDesc  ? translateText(form.description, inputLang, lang) : Promise.resolve(form.description),
        ]);
        setForm(f => ({ ...f, title: newTitle, description: newDesc }));
        setInputLang(lang);
      } catch {}
      setTranslating(false);
    };
    doTranslate();
  }, [lang]);

  /* ── Reverse geocode (unchanged) ────────────────────────────────────────── */
  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      setForm(f => ({ ...f, address: data.display_name || '' }));
    } catch {}
  };

  /* ── Form field handlers (unchanged) ────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if ((name === 'title' || name === 'description') && form.latitude && form.longitude) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(checkDuplicate, 1500);
    }
  };

  const handleTitleChange = (e) => {
    setForm(f => ({ ...f, title: e.target.value }));
    setInputLang(lang);
    clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(checkDuplicate, 1500);
  };

  const handleDescChange = (e) => {
    setForm(f => ({ ...f, description: e.target.value }));
    setInputLang(lang);
    clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(checkDuplicate, 1500);
  };

  const handleVoiceTitle = (transcript) => {
    const spokenLang = SPEECH_LANGS.find(l => l.code === speechLang)?.short || 'en';
    setForm(f => ({ ...f, title: f.title ? f.title + ' ' + transcript : transcript }));
    setInputLang(spokenLang);
  };

  const handleVoiceDesc = (transcript) => {
    const spokenLang = SPEECH_LANGS.find(l => l.code === speechLang)?.short || 'en';
    setForm(f => ({ ...f, description: f.description ? f.description + ' ' + transcript : transcript }));
    setInputLang(spokenLang);
  };

  /* ── Duplicate check (unchanged) ────────────────────────────────────────── */
  const checkDuplicate = async () => {
    if (!form.title || form.title.length < 10) return;
    try {
      const { data } = await api.checkDuplicate({
        title: form.title, description: form.description,
        latitude: form.latitude, longitude: form.longitude
      });
      if (data.isDuplicate) setDuplicate(data.existing);
    } catch {}
  };

  const handleSupportDuplicate = async () => {
    try { await api.voteComplaint(duplicate._id); navigate('/citizen'); } catch {}
  };

  // ─── UPDATED: handleMediaUpload ────────────────────────────────────────────
  // Accepts both image/* and video/* files selected by the user.
  // For each file it creates a local object-URL for preview, then stores
  // { file, preview, kind } in state.
  const handleMediaUpload = (e) => {
    const newFiles = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file),   // revoked on remove to avoid memory leaks
      kind:    getFileKind(file)             // 'image' | 'video'
    }));
    setMediaFiles(prev => [...prev, ...newFiles]);
    // Reset the input value so the same file can be re-selected if removed
    e.target.value = '';
  };

  // ─── UPDATED: removeMedia ─────────────────────────────────────────────────
  const removeMedia = (index) => {
    setMediaFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview); // free memory
      updated.splice(index, 1);
      return updated;
    });
  };

  // ─── UPDATED: handleSubmit ────────────────────────────────────────────────
  // Sends files via FormData (multipart/form-data) instead of base64 JSON,
  // matching the new backend route: upload.array('media', 10).
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();

      // Scalar fields
      formData.append('title',       form.title);
      formData.append('description', form.description);
      // Only send coordinates if they were captured (map mode or GPS)
      if (form.latitude != null && form.longitude != null) {
        formData.append('latitude',  form.latitude);
        formData.append('longitude', form.longitude);
      }
      formData.append('address', form.address || '');
      formData.append('isAnonymous', form.isAnonymous);
      formData.append('severity',    form.severity);
      formData.append('language',    form.language);

      // Media files – all appended under the key "media"
      // multer on the backend reads req.files when the key matches upload.array('media')
      mediaFiles.forEach(({ file }) => {
        formData.append('media', file);
      });

      await api.createComplaint(formData);
      navigate('/citizen');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  // ─── Cleanup object-URLs when component unmounts ──────────────────────────
  useEffect(() => {
    return () => {
      mediaFiles.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, []);

  return (
    <div className="min-h-screen bg-citizen">
      <Navbar role="citizen" />

      {duplicate && (
        <DuplicateModal
          duplicate={duplicate}
          onSupport={handleSupportDuplicate}
          onDismiss={() => setDuplicate(null)}
          t={t}
        />
      )}

      {/* Translating overlay (unchanged) */}
      {translating && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-display font-semibold text-gray-700">Translating your text…</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-gray-900">{t('reportACivicIssue')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('helpImprove')}</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Issue Details (unchanged) ─────────────────────────────────── */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-display font-semibold text-lg text-gray-800">{t('issueDetails')}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">🎤 {t('voiceInput')}:</span>
                <select value={speechLang} onChange={e => setSpeechLang(e.target.value)}
                  className="text-xs border border-purple-100 rounded-xl px-2 py-1.5 text-gray-600 focus:outline-none bg-gray-50">
                  {SPEECH_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700 font-display">
                    {t('issueTitle')} *
                  </label>
                  <VoiceButton onResult={handleVoiceTitle} speechLang={speechLang} t={t} />
                </div>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleTitleChange}
                  required
                  className="input-field"
                  placeholder={t('issueTitlePlaceholder')}
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700 font-display">
                    {t('description')} *
                  </label>
                  <VoiceButton onResult={handleVoiceDesc} speechLang={speechLang} t={t} />
                </div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleDescChange}
                  required
                  rows={4}
                  className="input-field resize-none"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              {(form.title || form.description) && (
                <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  🌐 <span>Switching the language in the navbar will <strong>auto-translate</strong> your text.</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">{t('severityLevel')}</label>
                  <select name="severity" value={form.severity} onChange={handleChange} className="input-field">
                    <option value={1}>1 - Minor</option>
                    <option value={2}>2 - Low</option>
                    <option value={3}>3 - Moderate</option>
                    <option value={4}>4 - High</option>
                    <option value={5}>5 - Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">{t('language')}</label>
                  <select name="language" value={form.language} onChange={handleChange} className="input-field">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="te">Telugu</option>
                    <option value="ta">Tamil</option>
                    <option value="mr">Marathi</option>
                    <option value="bn">Bengali</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl">
                <input type="checkbox" id="isAnonymous" name="isAnonymous" checked={form.isAnonymous}
                  onChange={handleChange} className="w-4 h-4 accent-purple-500" />
                <label htmlFor="isAnonymous" className="text-sm text-gray-700 font-medium cursor-pointer">
                  <span className="font-semibold">{t('reportAnonymously')}</span>
                  <span className="text-gray-500 ml-1">{t('reportAnonymouslyDesc')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Location — UPDATED: map + optional manual address ─────────── */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-lg text-gray-800 mb-2">📍 Location</h2>
            <p className="text-sm text-gray-500 mb-4">
              Choose your preferred method. Both methods can be used together.
            </p>

            {/* Toggle: Map vs Manual Address */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  locationMode === 'map'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                }`}
              >
                🗺️ Pick on Map
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('address')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  locationMode === 'address'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                }`}
              >
                ✏️ Type Address
              </button>
            </div>

            {/* Map Panel */}
            {locationMode === 'map' && (
              <div>
                <div className="h-64 rounded-xl overflow-hidden mb-3">
                  <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors' />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                {form.address && (
                  <p className="text-sm text-gray-500 bg-purple-50 rounded-lg px-3 py-2 mb-2">
                    📍 {form.address}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Coordinates: {form.latitude != null ? form.latitude.toFixed(6) : '—'},{' '}
                  {form.longitude != null ? form.longitude.toFixed(6) : '—'}
                </p>
              </div>
            )}

            {/* Manual Address Panel */}
            {locationMode === 'address' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your address or landmark
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. 12 MG Road, near Clock Tower, Hyderabad"
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Be as specific as possible — include street name, nearby landmark, and city.
                </p>

                {/* Optional: also show map below typed address */}
                <details className="mt-4">
                  <summary className="text-xs text-purple-600 cursor-pointer hover:underline select-none">
                    + Also pin on map (optional)
                  </summary>
                  <div className="h-48 rounded-xl overflow-hidden mt-3">
                    <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors' />
                      <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Coordinates: {form.latitude != null ? form.latitude.toFixed(6) : '—'},{' '}
                    {form.longitude != null ? form.longitude.toFixed(6) : '—'}
                  </p>
                </details>
              </div>
            )}
          </div>

          {/* ── UPDATED: Upload Media (Images + Videos) ───────────────────── */}
          <div className="card p-6">
            {/* Section heading changed from "Upload Images" → "Upload Media" */}
            <h2 className="font-display font-semibold text-lg text-gray-800 mb-1">
              📎 Upload Media (Images / Videos)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Attach photos or short video clips of the issue. Max 50 MB per file.
            </p>

            {/* Drop-zone / file picker */}
            <label className="block border-2 border-dashed border-purple-100 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-purple-50 transition-all">
              {/* Icon row */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-3xl">🖼️</span>
                <span className="text-2xl text-gray-300">|</span>
                <span className="text-3xl">🎬</span>
              </div>
              <p className="text-gray-600 font-medium text-sm">Click to upload photos or videos</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG, MP4, MOV, WEBM — up to 50 MB each</p>

              {/* UPDATED: accept both image/* and video/* */}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                className="hidden"
              />
            </label>

            {/* ── Preview grid ── */}
            {mediaFiles.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {mediaFiles.map((item, i) => (
                  <div key={i} className="relative group">

                    {/* Image preview */}
                    {item.kind === 'image' && (
                      <img
                        src={item.preview}
                        alt={`Upload ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border border-purple-100"
                      />
                    )}

                    {/* Video preview */}
                    {item.kind === 'video' && (
                      <video
                        src={item.preview}
                        className="w-24 h-24 object-cover rounded-xl border border-purple-100 bg-gray-900"
                        muted
                        playsInline
                        // Show first frame as poster; user can hover to play
                        onMouseEnter={e => e.currentTarget.play()}
                        onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    )}

                    {/* Type badge (bottom-left) */}
                    <span className={`absolute bottom-1 left-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                      item.kind === 'video' ? 'bg-indigo-600' : 'bg-purple-500'
                    }`}>
                      {item.kind === 'video' ? '▶ VID' : '🖼 IMG'}
                    </span>

                    {/* Remove button (top-right) */}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File count hint */}
            {mediaFiles.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} selected
                &nbsp;·&nbsp;
                {mediaFiles.filter(f => f.kind === 'image').length} image{mediaFiles.filter(f => f.kind === 'image').length !== 1 ? 's' : ''},&nbsp;
                {mediaFiles.filter(f => f.kind === 'video').length} video{mediaFiles.filter(f => f.kind === 'video').length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Submit / Cancel (unchanged) */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || translating}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              {loading
                ? <><div className="spinner"></div> {t('submitting')}</>
                : t('submitReport')}
            </button>
            <button type="button" onClick={() => navigate('/citizen')} className="btn-secondary px-6">
              {t('cancel')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ReportIssue;

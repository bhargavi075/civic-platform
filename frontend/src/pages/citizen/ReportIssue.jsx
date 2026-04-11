import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useLang } from '../../context/LanguageContext';

/* ─── Translation helper ──────────────────────────────────────────────────── */
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
  { code: 'en-US', label: 'English',   short: 'en' },
  { code: 'hi-IN', label: 'हिंदी',    short: 'hi' },
  { code: 'te-IN', label: 'తెలుగు',  short: 'te' },
  { code: 'ta-IN', label: 'Tamil',     short: 'ta' },
  { code: 'mr-IN', label: 'Marathi',   short: 'mr' },
  { code: 'bn-IN', label: 'Bengali',   short: 'bn' },
  { code: 'gu-IN', label: 'Gujarati',  short: 'gu' },
  { code: 'kn-IN', label: 'Kannada',   short: 'kn' },
  { code: 'ml-IN', label: 'Malayalam', short: 'ml' },
  { code: 'pa-IN', label: 'Punjabi',   short: 'pa' },
];

/* ─── Duplicate-found modal ──────────────────────────────────────────────── */
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

/* ─── Map click handler ──────────────────────────────────────────────────── */
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return position ? <Marker position={position} /> : null;
};

/* ─── Voice input button ─────────────────────────────────────────────────── */
const VoiceButton = ({ onResult, speechLang, t }) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Speech recognition not supported in this browser.');
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang           = speechLang;
    rec.continuous     = false;
    rec.interimResults = false;
    recRef.current     = rec;
    rec.onstart  = () => setListening(true);
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); };
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
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

function getFileKind(file) {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

const ReportIssue = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const [form, setForm] = useState({
    title: '', description: '',
    latitude: 17.385, longitude: 78.4867,
    address: '',
    isAnonymous: false, severity: 1, language: 'en'
  });

  const [manualAddress, setManualAddress] = useState(false);
  const [mediaFiles,    setMediaFiles]    = useState([]);
  const [position,      setPosition]      = useState([17.385, 78.4867]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [duplicate,     setDuplicate]     = useState(null);
  const [speechLang,    setSpeechLang]    = useState('en-US');
  const [inputLang,     setInputLang]     = useState('en');
  const [translating,   setTranslating]   = useState(false);
  const checkTimerRef = useRef(null);
  const prevLangRef   = useRef(lang);

  /* ── Geolocation on mount ──────────────────────────────────────────────── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        if (!manualAddress) reverseGeocode(lat, lng);
      }, () => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Update lat/lng + reverse geocode when map pin moves ──────────────── */
  useEffect(() => {
    setForm(f => ({ ...f, latitude: position[0], longitude: position[1] }));
    if (!manualAddress) reverseGeocode(position[0], position[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  /* ── Auto-translate when UI language switches ──────────────────────────── */
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
      } catch {
        // Translation failed silently — keep original text, unblock UI
      } finally {
        // Always clear translating: never leave the overlay stuck on screen
        setTranslating(false);
      }
    };
    doTranslate();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reverse geocode ───────────────────────────────────────────────────── */
  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      setForm(f => ({ ...f, address: data.display_name || '' }));
    } catch {}
  };

  /* ── Form field handlers ───────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if ((name === 'title' || name === 'description') && (form.latitude || form.address)) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(checkDuplicate, 1500);
    }
  };

  const handleAddressChange = (e) => {
    setManualAddress(true);
    setForm(f => ({ ...f, address: e.target.value }));
    clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(checkDuplicate, 1500);
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

  /* ── Duplicate check ───────────────────────────────────────────────────── */
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

  /* ── Media upload handlers ─────────────────────────────────────────────── */
  const handleMediaUpload = (e) => {
    const newFiles = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      kind:    getFileKind(file)
    }));
    setMediaFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    // Step 1: Always call preventDefault first — before any guard returns.
    // If this is missing, the browser performs a full page reload.
    e.preventDefault();

    // ── Debug checkpoint 1: confirm the handler actually fired ─────────────
    console.log('[ReportIssue] handleSubmit fired ✅');
    console.log('[ReportIssue] form state:', {
      title:       form.title,
      description: form.description,
      address:     form.address,
      latitude:    form.latitude,
      longitude:   form.longitude,
      severity:    form.severity,
      mediaCount:  mediaFiles.length,
    });

    // ── FIX BUG 4: Guard against submission while translation overlay is up ─
    // The translating overlay covers the full screen (fixed inset-0) which
    // blocks click events — the button's disabled={loading || translating}
    // handles the UI case, but a keyboard Enter on a focused input could still
    // trigger onSubmit while translating is true if the browser fires the
    // submit event before React processes the state update.
    if (translating) {
      console.warn('[ReportIssue] Submit blocked — translation in progress');
      return;
    }

    if (loading) {
      console.warn('[ReportIssue] Submit blocked — already submitting');
      return;
    }

    setLoading(true);
    setError('');

    // ── Validation ─────────────────────────────────────────────────────────
    if (!form.title || !form.title.trim()) {
      setError('Please enter an issue title.');
      setLoading(false);
      return;
    }
    if (!form.description || !form.description.trim()) {
      setError('Please enter a description.');
      setLoading(false);
      return;
    }

    const hasAddress = form.address && form.address.trim().length > 0;
    const hasCoords  = form.latitude != null && form.longitude != null;
    if (!hasAddress && !hasCoords) {
      setError('Please provide a location — either type an address or click on the map.');
      setLoading(false);
      return;
    }

    // ── Build FormData ──────────────────────────────────────────────────────
    try {
      const formData = new FormData();
      formData.append('title',       form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('address',     form.address || '');
      formData.append('latitude',    form.latitude  ?? '');
      formData.append('longitude',   form.longitude ?? '');
      formData.append('isAnonymous', form.isAnonymous ? 'true' : 'false');
      formData.append('severity',    form.severity);
      formData.append('language',    form.language);

      mediaFiles.forEach(({ file }) => formData.append('media', file));

      // ── Debug checkpoint 2: confirm axios call is about to fire ────────
      console.log('[ReportIssue] Calling api.createComplaint →', `${import.meta.env.VITE_API_URL || ''}/api/complaints`);
      console.log('[ReportIssue] Authorization header present:', !!localStorage.getItem('civic_token'));

      const { data } = await api.createComplaint(formData);

      // ── Debug checkpoint 3: confirm server responded ───────────────────
      console.log('[ReportIssue] ✅ Success — server response:', data);
      console.log('[ReportIssue] Assigned department:', data.department);
      console.log('[ReportIssue] Assigned priority:',   data.priority);
      console.log('[ReportIssue] ML info:',             data.mlInfo);

      navigate('/citizen');

    } catch (err) {
      // ── Debug checkpoint 4: log exactly what the server returned ───────
      console.error('[ReportIssue] ❌ Submission failed');
      console.error('[ReportIssue] HTTP status:',   err.response?.status);
      console.error('[ReportIssue] Server message:', err.response?.data);
      console.error('[ReportIssue] Raw error:',      err.message);

      if (err.response?.status === 409 && err.response?.data?.existingComplaint) {
        // Server-side duplicate detection during actual submission
        setDuplicate(err.response.data.existingComplaint);
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Please fill in all required fields.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Upload timed out. Try with smaller files or check your connection.');
      } else if (!err.response) {
        // Network error — request never reached the server
        setError('Cannot reach the server. Make sure the backend is running on port 5000.');
      } else {
        setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Cleanup object-URLs on unmount ────────────────────────────────────── */
  useEffect(() => {
    return () => { mediaFiles.forEach(({ preview }) => URL.revokeObjectURL(preview)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/*
        FIX BUG 4 (overlay): The translating overlay must NOT block the entire
        screen unconditionally. It's already conditionally rendered {translating && ...}
        which is correct — but we also add `aria-hidden` and ensure the spinner
        itself has pointer-events: none so it never captures clicks accidentally
        if React batches a state update slower than expected.
      */}
      {translating && (
        <div
          className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 flex items-center justify-center"
          aria-hidden="true"
          style={{ pointerEvents: 'all' }}
        >
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" style={{ pointerEvents: 'none' }}></div>
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

        {/*
          The form's onSubmit is the only submission trigger.
          The submit button has type="submit" — this is correct and must stay.
          Do NOT change it to type="button" with an onClick — that breaks
          keyboard Enter submission and native form validation.
        */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* ── Issue Details ─────────────────────────────────────────────── */}
          {/*
            IMPORTANT: These sections use className="card" NOT "card-interactive".
            .card no longer has a hover transform (fixed in index.css).
            If you add card-interactive here the hover lift will break clicks again.
          */}
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

          {/* ── Location ─────────────────────────────────────────────────── */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-lg text-gray-800 mb-1">{t('location')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Provide a location in <strong>any</strong> of three ways: type an address, click on the map, or let GPS detect your position.
              At least one is required.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                📝 Type Address Manually
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleAddressChange}
                className="input-field"
                placeholder="e.g. Near Charminar, Hyderabad, Telangana 500002"
              />
              <p className="text-xs text-gray-400 mt-1">
                💡 Typing here overrides the auto-detected address from GPS / map.
              </p>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-display">
                🗺️ Or Select on Map <span className="font-normal text-gray-400">(click to pin)</span>
              </label>
              <div className="h-64 rounded-xl overflow-hidden">
                <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors' />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>📍 Lat: {form.latitude?.toFixed(6) ?? 'N/A'}</span>
              <span>Lng: {form.longitude?.toFixed(6) ?? 'N/A'}</span>
              {manualAddress && (
                <span className="text-purple-500 font-semibold">✏️ Address entered manually</span>
              )}
            </div>

            {!form.address && !form.latitude && (
              <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                ⚠️ Please type an address or click on the map to set a location.
              </p>
            )}
          </div>

          {/* ── Upload Media ──────────────────────────────────────────────── */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-lg text-gray-800 mb-1">
              📎 Upload Media (Images / Videos)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Attach photos or short video clips of the issue. Max 50 MB per file.
            </p>

            <label className="block border-2 border-dashed border-purple-100 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-purple-50 transition-all">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-3xl">🖼️</span>
                <span className="text-2xl text-gray-300">|</span>
                <span className="text-3xl">🎬</span>
              </div>
              <p className="text-gray-600 font-medium text-sm">Click to upload photos or videos</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG, MP4, MOV, WEBM — up to 50 MB each</p>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                className="hidden"
              />
            </label>

            {mediaFiles.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {mediaFiles.map((item, i) => (
                  <div key={i} className="relative group">
                    {item.kind === 'image' && (
                      <img src={item.preview} alt={`Upload ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border border-purple-100" />
                    )}
                    {item.kind === 'video' && (
                      <video src={item.preview}
                        className="w-24 h-24 object-cover rounded-xl border border-purple-100 bg-gray-900"
                        muted playsInline
                        onMouseEnter={e => e.currentTarget.play()}
                        onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    )}
                    <span className={`absolute bottom-1 left-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                      item.kind === 'video' ? 'bg-indigo-600' : 'bg-purple-500'
                    }`}>
                      {item.kind === 'video' ? '▶ VID' : '🖼 IMG'}
                    </span>
                    <button type="button" onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mediaFiles.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} selected
                &nbsp;·&nbsp;
                {mediaFiles.filter(f => f.kind === 'image').length} image{mediaFiles.filter(f => f.kind === 'image').length !== 1 ? 's' : ''},&nbsp;
                {mediaFiles.filter(f => f.kind === 'video').length} video{mediaFiles.filter(f => f.kind === 'video').length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Submit / Cancel */}
          <div className="flex gap-4">
            {/*
              type="submit" is intentional and required.
              Do NOT change to type="button" — that breaks Enter-to-submit
              and native HTML5 form validation (required fields).
              The card hover transform fix in index.css ensures this button
              stays under the cursor when clicked.
            */}
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

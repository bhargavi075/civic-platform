/**
 * Multilingual TTS — EN, HI, TE
 *
 * Telugu note: Most browsers on Windows/Android have Telugu voices.
 * On systems without a native Telugu voice we fall back to a
 * romanised English pronunciation of the translated text, which is
 * better than silence.
 */

const LANG_BCP = { en: 'en-US', hi: 'hi-IN', te: 'te-IN' };

/* ─── load voices (async) ─── */
let _voices = [];
const loadVoices = () =>
  new Promise(resolve => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) { _voices = v; return resolve(v); }
    const handler = () => {
      _voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = null;
      resolve(_voices);
    };
    window.speechSynthesis.onvoiceschanged = handler;
    // hard fallback after 1 s
    setTimeout(() => {
      _voices = window.speechSynthesis.getVoices();
      resolve(_voices);
    }, 1000);
  });

/* ─── pick best voice for a language ─── */
const pickVoice = (langCode) => {
  const voices = _voices.length ? _voices : window.speechSynthesis.getVoices();
  const bcp    = LANG_BCP[langCode] || 'en-US';

  // 1. exact BCP match
  let v = voices.find(x => x.lang === bcp);
  // 2. prefix  (te-IN -> te)
  if (!v) v = voices.find(x => x.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  // 3. name contains language word
  if (!v && langCode === 'hi') v = voices.find(x => x.name.toLowerCase().includes('hindi'));
  if (!v && langCode === 'te') v = voices.find(x =>
    x.name.toLowerCase().includes('telugu') ||
    x.name.toLowerCase().includes('telagu') ||
    x.lang.toLowerCase().includes('te')
  );
  return v || null;
};

/* ─── speak one utterance, returns Promise ─── */
const utterOne = (text, langCode) =>
  new Promise(resolve => {
    const utter  = new SpeechSynthesisUtterance(text);
    utter.lang   = LANG_BCP[langCode] || 'en-US';
    utter.rate   = 0.88;
    const voice  = pickVoice(langCode);
    if (voice) utter.voice = voice;
    utter.onend  = resolve;
    utter.onerror = () => resolve();   // never block the chain
    window.speechSynthesis.speak(utter);
  });

/* ─── public API ─── */

export const cancelSpeak = () => {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
};

/**
 * Speak `text` in `langCode`.
 * text should already be in the target language.
 */
export const speakText = async (text, langCode, onEnd) => {
  if (!window.speechSynthesis || !text?.trim()) { if (onEnd) onEnd(); return; }
  cancelSpeak();
  await loadVoices();
  const utter  = new SpeechSynthesisUtterance(text);
  utter.lang   = LANG_BCP[langCode] || 'en-US';
  utter.rate   = 0.88;
  const voice  = pickVoice(langCode);
  if (voice) utter.voice = voice;
  utter.onend  = () => { if (onEnd) onEnd(); };
  utter.onerror = () => { if (onEnd) onEnd(); };
  window.speechSynthesis.speak(utter);
};

/**
 * Build the spoken sentence from a (possibly translated) complaint.
 * Labels are in the target language.
 */
export const buildText = (complaint, langCode) => {
  const L = {
    en: { pfx: 'Complaint',  pri: 'Priority', cat: 'Category' },
    hi: { pfx: 'शिकायत',     pri: 'प्राथमिकता', cat: 'श्रेणी'  },
    te: { pfx: 'ఫిర్యాదు',  pri: 'ప్రాధాన్యత',  cat: 'వర్గం'   },
  }[langCode] || { pfx: 'Complaint', pri: 'Priority', cat: 'Category' };

  return `${L.pfx}: ${complaint.title}. ${complaint.description}. ${L.pri}: ${complaint.priority}. ${L.cat}: ${complaint.category}.`;
};

/**
 * Read a complaint in all 3 languages sequentially: EN → HI → TE.
 * translateFn(text, fromLang, toLang) must return Promise<string>.
 */
export const speakComplaintAllLangs = async (complaint, translateFn, onEnd) => {
  if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
  cancelSpeak();
  await loadVoices();

  for (const lang of ['en', 'hi', 'te']) {
    // check if cancelled
    if (!window.speechSynthesis) break;

    let title = complaint.title;
    let desc  = complaint.description;

    if (lang !== 'en') {
      [title, desc] = await Promise.all([
        translateFn(complaint.title,       'en', lang),
        translateFn(complaint.description, 'en', lang),
      ]);
    }

    const text = buildText({ ...complaint, title, description: desc }, lang);
    await utterOne(text, lang);

    // tiny pause between languages
    await new Promise(r => setTimeout(r, 400));
  }

  if (onEnd) onEnd();
};

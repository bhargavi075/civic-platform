// In-memory translation cache to avoid repeated API calls
// Key: `${text}__${fromLang}__${toLang}`
const cache = new Map();

export const translateText = async (text, fromLang, toLang) => {
  if (!text || !text.trim()) return text;
  if (fromLang === toLang || toLang === 'en' && fromLang === 'en') return text;
  if (toLang === 'en' && !fromLang) return text; // already english

  const key = `${text}__${fromLang}__${toLang}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) {
      const result = data.responseData.translatedText;
      cache.set(key, result);
      return result;
    }
  } catch {}
  return text; // fallback: return original
};

// Translate an array of {title, description} objects in bulk (batched to avoid rate limits)
export const translateComplaints = async (complaints, toLang) => {
  if (toLang === 'en') return complaints; // nothing to do

  // Build unique texts to translate (deduplicate)
  const toTranslate = [];
  complaints.forEach(c => {
    toTranslate.push({ id: c._id, field: 'title',       text: c.title });
    toTranslate.push({ id: c._id, field: 'description', text: c.description });
  });

  // Fire translations in parallel (cache will short-circuit repeats)
  const results = await Promise.all(
    toTranslate.map(item => translateText(item.text, 'en', toLang))
  );

  // Rebuild complaints with translated text
  const translated = complaints.map((c, i) => ({
    ...c,
    title:       results[i * 2],
    description: results[i * 2 + 1],
  }));

  return translated;
};

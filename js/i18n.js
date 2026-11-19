// Tiny bilingual layer: every piece of copy is written as { ar, en } and
// rendered through L(). Switching language re-renders the current view.

export let lang = 'ar';

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'ar';
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function isRTL() {
  return lang === 'ar';
}

// L({ ar: '...', en: '...' }) -> string in the active language
export function L(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return String(obj);
  return obj[lang] || obj.ar || obj.en || '';
}

export function fmt(n) {
  const value = Number(n) || 0;
  return new Intl.NumberFormat('en-US').format(value);
}

// "12 March" style, stable across languages
export function dateLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  try {
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

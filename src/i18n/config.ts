export type Lang = "ar" | "en";

export const DEFAULT_LANG: Lang = "ar";
export const LANG_LOCKED = true;
export const SHOW_LANG_TOGGLE = false;

const STORAGE_KEY = "style-more-lang";

export function isRtl(lang: Lang): boolean {
  return lang === "ar";
}

export function localeFor(lang: Lang): string {
  return lang === "ar" ? "ar-SY" : "en-US";
}

export function applyDocumentLang(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = isRtl(lang) ? "rtl" : "ltr";
}

export function readStoredLang(): Lang {
  if (LANG_LOCKED) return DEFAULT_LANG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {
    // ignore
  }
  return DEFAULT_LANG;
}

export function storeLang(lang: Lang) {
  if (LANG_LOCKED) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

// i18n/index.js — language detection + a tiny translator.
//
// Detection order (per the product decision: browser-lang + manual switch):
//   1. an explicit choice the user made before (localStorage)
//   2. the browser's preferred languages (navigator.languages)
//   3. English
// Every lookup falls back to English key-by-key, so a partial locale never
// shows a blank — it just shows the English line until it's translated.
//
// IP-based detection was intentionally NOT chosen: it needs an edge function,
// misfires on VPNs/travelers, and navigator.language already reflects the user's
// actual preference. If we ever want a geo hint, it can seed step 2 only.
import { createContext, createElement, useContext, useState, useCallback, useMemo } from 'react'
import { DICTS, LANGS } from './strings.js'

const STORE = 'celestual:lang'
const FALLBACK = 'en'

export function detectLang() {
  try {
    const saved = localStorage.getItem(STORE)
    if (saved && LANGS[saved]) return saved
  } catch {
    /* private mode — ignore */
  }
  const prefs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || []
  for (const p of prefs) {
    if (!p) continue
    const base = p.toLowerCase().split('-')[0]
    if (LANGS[base]) return base
  }
  return FALLBACK
}

export function translate(lang, key, vars) {
  const dict = DICTS[lang] || DICTS[FALLBACK]
  let s = (dict && dict[key] != null ? dict[key] : DICTS[FALLBACK][key])
  if (s == null) return key // missing in English too → surface the key, never blank
  if (vars) {
    for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k])
  }
  return s
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)
  const setLang = useCallback((next) => {
    if (!LANGS[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORE, next)
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.lang = next
    } catch {
      /* ignore */
    }
  }, [])
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])
  const value = useMemo(() => ({ lang, setLang, t, langs: LANGS }), [lang, setLang, t])
  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

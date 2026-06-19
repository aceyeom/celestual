import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { submitStill, withdrawStill, suppressHandle, normHandle, isValidHandle } from './api/still.js'
import { getSession, signInWithMeta, resumeSession } from './api/auth.js'
import { canSealIndex, grantUnlocked, startCheckout as payStart } from './api/pay.js'
import { makeColors, PALETTE } from './theme.js'
import { GalaxyCanvas, WarmBg, StarTags, Liftoff, LanguageSwitcher } from './components/ui.jsx'
import {
  IntroScreen, LandingScreen, YouScreen, ThemScreen, SendoffScreen,
  RestingScreen, MatchScreen, PricingScreen, CheckoutScreen, PrivacyScreen, StarDetail,
} from './components/screens.jsx'
import { useI18n } from './i18n/index.js'

const MOTION = 20

const SCREENS = {
  intro: IntroScreen,
  landing: LandingScreen,
  you: YouScreen,
  them: ThemScreen,
  sendoff: SendoffScreen,
  resting: RestingScreen,
  // `match` is not reached from the live flow (deferred reveal, §2.3) — kept for
  // a future verified reveal link, and used as the intro's collision backdrop.
  match: MatchScreen,
  pricing: PricingScreen,
  checkout: CheckoutScreen,
  privacy: PrivacyScreen,
}

// Where the @ becomes a star (normalized screen coords) — module-constant so it
// doesn't re-fire the galaxy's setMode effect every render.
const SENDOFF_ORIGIN = { x: 0.5, y: 0.43 }

// One persistent background for the whole session. Each screen declares the
// galaxy mode + whether the calm overlay fades in on top.
const BG = {
  landing: { warm: false, mode: 'idle', dim: 0.62 },
  you: { warm: true, variant: 'quiet', mode: 'idle' },
  them: { warm: true, variant: 'low', mode: 'idle' },
  sendoff: { warm: false, mode: 'sendoff', origin: SENDOFF_ORIGIN },
  resting: { warm: false, mode: 'resting' },
  match: { warm: false, mode: 'match' },
  pricing: { warm: true, variant: 'quiet', mode: 'idle' },
  checkout: { warm: true, variant: 'quiet', mode: 'idle' },
  privacy: { warm: true, variant: 'quiet', mode: 'idle' },
}

const STORE = 'celeste:v1'
const INTRO_SEEN = 'celeste:introSeen'

// /demo (at any base path) = zero verification, zero paywall.
const isDemoPath = () => /(^|\/)demo\/?$/.test(window.location.pathname)

export default function App() {
  const { lang, setLang, langs, t } = useI18n()
  const C = useMemo(() => makeColors(PALETTE), [])

  const init = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {}
    } catch {
      return {}
    }
  }, [])

  const [demo, setDemo] = useState(isDemoPath)
  const [session, setSession] = useState(getSession)
  const verified = !!session?.verified

  // First screen: the landing hook — there's no sign-in wall anymore (identity is
  // confirmed at seal time). If they were mid-flow, resume there; a half-finished
  // send-off resolves to the resting sky. The explainer slideshow only plays on
  // "Find out" (or a replay via "how it works"), so it never appears unbidden.
  const firstScreen = () => (init.screen === 'sendoff' ? 'resting' : init.screen || 'landing')

  const [screen, setScreen] = useState(firstScreen)
  const [email, setEmail] = useState(init.email || session?.email || '')
  const [me, setMe] = useState(init.me || session?.handle || '')
  // SECRETS (who you pined for) — never persisted (§4.3); memory only.
  const [them, setThem] = useState('')
  const [sealedAt, setSealedAt] = useState(init.sealedAt || null)
  const [over18, setOver18] = useState(!!init.over18)
  const [sealCount, setSealCount] = useState(init.sealCount || 0)
  const [handles, setHandles] = useState([]) // memory-only, aligned by index
  // Registry dates are NOT identifying, so they persist — the interactive field
  // can show "sealed · <date>" even after a reload (handles stay memory-only).
  const [sealTimes, setSealTimes] = useState(init.sealTimes || [])
  const [error, setError] = useState('')
  const [morph, setMorph] = useState(null)
  const [introMode, setIntroMode] = useState('idle') // galaxy mode while intro plays
  // Where the slideshow hands off when it ends: 'you' when launched from
  // "Find out" (straight into the flow), 'landing' when replayed from "how it works".
  const [introNext, setIntroNext] = useState('you')
  const [focused, setFocused] = useState(null) // index of the star the camera holds
  const galaxyRef = useRef(null)

  useEffect(() => {
    // Persist only non-secret resume state — never the crush graph (§4.3).
    try {
      localStorage.setItem(STORE, JSON.stringify({ screen, email, me, sealedAt, over18, sealCount, sealTimes }))
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [screen, email, me, sealedAt, over18, sealCount, sealTimes])

  // Capture a returning OAuth session on load (the popup-blocked redirect
  // fallback path) — adopt it so the app resumes signed in. No navigation: people
  // pick up wherever they were; the seal-time gate sees them as verified.
  useEffect(() => {
    let live = true
    resumeSession().then((s) => {
      if (live && s) {
        setSession(s)
        if (s.email && !email) setEmail(s.email)
        if (s.handle && !me) setMe(s.handle)
      }
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Returning from hosted checkout: Stripe/Kakao/Toss send the browser back to
  // `…?paid=1` on success. Grant the credit, clean the URL, and drop them onto
  // the entry to seal the star they were adding. (For production hardening, a
  // provider webhook should be the source of truth — see SETUP-AUTH-AND-PAYMENTS.md.)
  useEffect(() => {
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get('paid') === '1') {
        grantUnlocked(1)
        u.searchParams.delete('paid')
        window.history.replaceState({}, '', u.pathname + u.search + u.hash)
        setThem('')
        setScreen('them')
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drive the camera from the focused-star state.
  useEffect(() => {
    const f = galaxyRef.current
    if (!f) return
    if (focused != null) f.focusStar(focused)
    else f.clearFocus()
  }, [focused])

  const go = useCallback((s) => {
    setFocused(null)
    setScreen(s)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  // ── demo ──
  const enterDemo = useCallback(() => {
    try {
      const base = window.location.pathname.replace(/\/+$/, '')
      window.history.replaceState({}, '', (base.endsWith('/demo') ? base : base + '/demo') || '/demo')
    } catch {
      /* ignore */
    }
    setDemo(true) // take effect this session (no reload) — bypasses sign-in + paywall
    go('landing')
  }, [go])

  // ── intro ──
  // "Find out" — the slideshow plays, then hands straight into the flow.
  const findOut = useCallback(() => {
    if (!over18) setOver18(true)
    setIntroNext('you')
    go('intro')
  }, [over18, go])
  // "how it works" — replay the slideshow, then return to the landing.
  const watchIntro = useCallback(() => {
    setIntroNext('landing')
    go('intro')
  }, [go])
  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN, '1')
    } catch {
      /* ignore */
    }
    go(introNext)
  }, [go, introNext])
  const onIntroStep = useCallback((i) => {
    // the last two beats are the two stars colliding into one
    setIntroMode(i >= 3 ? 'match' : 'idle')
  }, [])

  // Seal: record the one-way entry (server never reveals mutuality, §2.3).
  const seal = useCallback(async () => {
    setError('')
    if (!isValidHandle(me) || !isValidHandle(them)) {
      setError(t('them.errInvalid'))
      return
    }
    if (normHandle(me) === normHandle(them)) {
      setError(t('them.errSelf'))
      return
    }
    // Paywall: first star free, the rest gated (never on /demo).
    if (!canSealIndex(sealCount, { demo })) {
      go('checkout')
      return
    }
    // Confirm it's really you — at the moment of sealing, with Instagram. The
    // real provider opens a popup (this keeps the in-memory entry alive); the dev
    // stub resolves instantly. /demo and already-verified users skip it. This must
    // stay the first await after the click so the popup isn't blocked.
    if (!verified && !demo) {
      let s = null
      try {
        s = await signInWithMeta()
      } catch {
        s = null
      }
      if (!s) {
        setError(t('them.authCancelled'))
        return
      }
      setSession(s)
      if (s.email && !email) setEmail(s.email)
      if (s.handle) setMe(s.handle)
    }
    const now = Date.now()
    setSealedAt(now)
    setSealCount((n) => n + 1)
    setHandles((h) => [...h, normHandle(them)])
    setSealTimes((s) => [...s, now])
    setMorph({ handle: normHandle(them) })
    setTimeout(() => setMorph(null), 1250)
    go('sendoff')
    const minSuspense = new Promise((r) => setTimeout(r, 3200))
    try {
      const [res] = await Promise.all([submitStill({ me, ex: them, email }), minSuspense])
      const rollback = () => {
        setSealCount((n) => Math.max(0, n - 1))
        setHandles((h) => h.slice(0, -1))
        setSealTimes((s) => s.slice(0, -1))
      }
      if (res?.error === 'rate_limited') {
        setError(t('them.errRate'))
        rollback()
        go('them')
        return
      }
      if (res?.error === 'suppressed') {
        setError(t('them.errSuppressed'))
        rollback()
        go('them')
        return
      }
      go('resting')
    } catch (e) {
      console.error(e)
      setSealCount((n) => Math.max(0, n - 1))
      setHandles((h) => h.slice(0, -1))
      setSealTimes((s) => s.slice(0, -1))
      setError(t('them.errGeneric'))
      go('them')
    }
  }, [me, them, email, sealCount, demo, verified, go, t])

  // Multi-entry: gate the paywall here too (entering "more users"). First is free.
  const checkAnother = useCallback(() => {
    setThem('')
    setError('')
    if (!canSealIndex(sealCount, { demo })) {
      go('checkout')
      return
    }
    go('them')
  }, [sealCount, demo, go])

  const startCheckout = useCallback(async (provider) => {
    const r = await payStart(provider) // real provider redirects away; dev path grants locally
    if (r?.ok && (r.dev || !import.meta.env.VITE_PAY_ENABLED)) {
      setThem('')
      go('them')
    }
  }, [go])

  // Interactive field: tap → focus, remove → withdraw that star, close → zoom out.
  const onStarTap = useCallback((x, y) => {
    const f = galaxyRef.current
    if (!f) return
    const i = f.hitTest(x, y)
    if (i >= 0) setFocused(i)
  }, [])
  const closeStar = useCallback(() => setFocused(null), [])
  const removeStar = useCallback(
    async (i) => {
      const handle = handles[i]
      // Play the wink-out where the star sits, and start drifting the camera back
      // out, before the star is dropped from the set — so it's seen to vanish and
      // the field returns to the resting overview.
      const f = galaxyRef.current
      if (f && f.vanishStar) f.vanishStar(i)
      setFocused(null)
      // let the vanish animation finish, then remove the star and free its slot
      await new Promise((r) => setTimeout(r, 520))
      // Drop the SAME slot on the canvas that we drop from the handle/time arrays,
      // so every surviving star stays matched to its own @tag (the galaxy used to
      // trim its tail here, which slid every later star onto the wrong tag).
      if (f && f.removeSealAt) f.removeSealAt(i)
      setHandles((h) => h.filter((_, k) => k !== i))
      setSealTimes((s) => s.filter((_, k) => k !== i))
      // Releasing a star frees its registration slot — index 0 is always free, so
      // the person can always keep one star in the sky without paying (§ free star).
      setSealCount((n) => Math.max(0, n - 1))
      // Clear the last-entered handle so nothing stale (a ghost "@…") survives the
      // release; if this was the last star, the resting sky shows its empty state.
      setThem('')
      setError('')
      if (handle) {
        try {
          await withdrawStill({ me, ex: handle })
        } catch (e) {
          console.error(e)
        }
      }
    },
    [handles, me],
  )
  const starInfo = useCallback(
    (i) => (i == null ? null : { handle: handles[i] || null, time: sealTimes[i] || null }),
    [handles, sealTimes],
  )

  const forget = useCallback(() => {
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
    setEmail('')
    setMe('')
    setThem('')
    setSealedAt(null)
    setSealCount(0)
    setHandles([])
    setSealTimes([])
    setOver18(false)
    setError('')
    go('landing')
  }, [go])

  const affirmAge = useCallback(() => setOver18(true), [])
  const openConversation = useCallback(() => {
    const handle = normHandle(them)
    if (handle) window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer')
  }, [them])

  const ctx = {
    email, me, them, sealedAt, over18, error, demo, verified, sealCount,
    setEmail, setMe, setThem, go, seal, checkAnother, startCheckout,
    forget, affirmAge, suppressHandle, openConversation,
    enterDemo, findOut, watchIntro, finishIntro, onIntroStep,
    onStarTap, closeStar, removeStar,
    starCount: handles.length,
    zoomed: focused != null,
  }
  const Screen = SCREENS[screen] || SCREENS.landing

  const bg = BG[screen] || BG.landing
  const mode = screen === 'intro' ? introMode : bg.mode
  const warmVariant = useRef('quiet')
  if (bg.warm) warmVariant.current = bg.variant

  // Chrome: language switcher on the calm/entry screens; hidden during the
  // cinematic beats so nothing competes with the moment.
  const showSwitcher = !['intro', 'sendoff', 'match', 'checkout'].includes(screen)

  return (
    <div className="still-app">
      <GalaxyCanvas
        mode={mode}
        dim={bg.dim}
        origin={bg.origin}
        seals={sealCount}
        you={C.you}
        them={C.them}
        motion={MOTION}
        onReady={(f) => (galaxyRef.current = f)}
        style={{ position: 'fixed', zIndex: 0 }}
      />
      <StarTags fieldRef={galaxyRef} handles={handles} color={C.them} show={(screen === 'sendoff' || screen === 'resting') && focused == null} />
      <div
        aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: bg.warm ? 1 : 0, transition: 'opacity .6s ease' }}
      >
        <WarmBg C={C} variant={warmVariant.current} />
      </div>

      {showSwitcher && (
        <div style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', right: 'max(12px, env(safe-area-inset-right))', zIndex: 20 }}>
          <LanguageSwitcher C={C} lang={lang} langs={langs} onChange={setLang} />
        </div>
      )}

      <div key={screen} className="fade" data-screen={screen} style={{ position: 'relative', zIndex: 4 }}>
        <Screen C={C} ctx={ctx} lang={lang} />
      </div>

      {/* interactive field: the focused-star detail card */}
      {focused != null && screen === 'resting' && (
        <StarDetail C={C} lang={lang} info={starInfo(focused)} onRemove={() => removeStar(focused)} onClose={closeStar} />
      )}

      {morph && <Liftoff C={C} handle={morph.handle} />}
    </div>
  )
}

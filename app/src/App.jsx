import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  submitEntry, withdrawEntry, suppressHandle, normHandle, isValidHandle,
  checkMutuals, linkHandles, fetchSlots, requestReminder, FULL_SLOTS,
} from './api/celestual.js'
import { getSession, signInWithMeta, resumeSession } from './api/auth.js'
import { loadProfile, saveProfile, signOutUser, deleteAccount as deleteAccountApi } from './api/profile.js'
import { slotsRemaining } from './api/slots.js'
import { supabase } from './api/supabase.js'
import { makeColors, PALETTE } from './theme.js'
import { GalaxyCanvas, WarmBg, StarTags, Liftoff, LanguageSwitcher, ProfileButton } from './components/ui.jsx'
import {
  IntroScreen, LandingScreen, YouScreen, ThemScreen, SendoffScreen,
  RestingScreen, MatchScreen, OutOfSlotsScreen, PrivacyScreen, StarDetail, AccountSheet,
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
  // `match` is now reached live: with instant reveal, completing a mutual pair at
  // seal routes here. It's also the intro's collision backdrop.
  match: MatchScreen,
  outofslots: OutOfSlotsScreen,
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
  outofslots: { warm: true, variant: 'quiet', mode: 'idle' },
  privacy: { warm: true, variant: 'quiet', mode: 'idle' },
}

const STORE = 'celestual:v1'
const INTRO_SEEN = 'celestual:introSeen'

// /demo (at any base path) = zero verification, sandboxed (never writes real data).
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
  const screenRef = useRef(screen)
  const [email, setEmail] = useState(init.email || session?.email || '')
  const [me, setMe] = useState(init.me || session?.handle || '')
  const [displayName, setDisplayName] = useState(init.displayName || session?.name || '')
  // The user's OTHER Instagram @s (multi-account). The full identity set is
  // [me, ...altHandles]; being entered on ANY of them counts as them (§ identity).
  const [altHandles, setAltHandles] = useState(init.altHandles || [])
  const [accountOpen, setAccountOpen] = useState(false)
  // The entry-slot budget snapshot (server-authoritative; this drives the meter +
  // gates the entry button). Demo runs on a roomy local budget.
  const [slots, setSlots] = useState(FULL_SLOTS)
  // True only when the sky is actually backed by the encrypted database (a real
  // signed-in Supabase session), so the account UI never claims "saved to your
  // account" when it's really just on this device (e.g. the dev sign-in stub).
  const [synced, setSynced] = useState(false)
  // Becomes true once the initial profile/sky load has run, so the debounced saver
  // never writes the empty initial state over a stored sky before it's restored.
  const persistReady = useRef(false)
  // SECRETS (who you pined for) — never persisted (§4.3); memory only.
  const [them, setThem] = useState('')
  const [sealedAt, setSealedAt] = useState(init.sealedAt || null)
  const [over18, setOver18] = useState(!!init.over18)
  const [handles, setHandles] = useState([]) // memory-only, aligned by index
  // Registry dates are NOT identifying, so they persist — the interactive field
  // can show "sealed · <date>" even after a reload (handles stay memory-only).
  const [sealTimes, setSealTimes] = useState(init.sealTimes || [])
  // Normalized @s among `handles` that are now mutual (instant reveal at seal +
  // a group-aware re-check on load). Drives the in-app constellations view.
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [morph, setMorph] = useState(null)
  // Where the send-off starts: the actual @ textbox's center (measured at seal),
  // so the morph overlay and the galaxy drift share one origin. Falls back to a
  // sensible screen point if the field can't be measured.
  const [sendoffOrigin, setSendoffOrigin] = useState(SENDOFF_ORIGIN)
  const [introMode, setIntroMode] = useState('idle') // galaxy mode while intro plays
  // Where the slideshow hands off when it ends: 'you' when launched from
  // "Find out" (straight into the flow), 'landing' when replayed from "how it works".
  const [introNext, setIntroNext] = useState('you')
  const [focused, setFocused] = useState(null) // index of the star the camera holds
  const galaxyRef = useRef(null)

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    // Fast local resume state for first paint. The sky (the @handles, which used to
    // be memory-only) now persists separately and encrypted via api/profile.js.
    try {
      localStorage.setItem(STORE, JSON.stringify({ screen, email, me, displayName, altHandles, sealedAt, over18, sealTimes }))
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [screen, email, me, displayName, altHandles, sealedAt, over18, sealTimes])

  // Load the saved account + sky once on mount. When signed in this decrypts the
  // sky from the database; otherwise it restores from this device. A returning
  // visitor who has a sky lands on it.
  useEffect(() => {
    let live = true
    loadProfile()
      .then((p) => {
        if (!live) return
        // Reconcile the sky as one unit so the count, the dates and the @handles can
        // never drift apart (a legacy resume could leave a count with no handles).
        const sky = p && p.sky
        const h = sky && Array.isArray(sky.handles) ? sky.handles.map(normHandle).filter(Boolean) : []
        setHandles(h)
        setSealTimes(h.length ? (sky.times && sky.times.length === h.length ? sky.times : h.map(() => Date.now())) : [])
        if (h.length && screenRef.current === 'landing') go('resting')
        if (p) {
          const primary = p.handle ? normHandle(p.handle) : ''
          if (primary) setMe((m) => m || primary)
          if (Array.isArray(p.myHandles) && p.myHandles.length) {
            const own = p.myHandles.map(normHandle).filter(Boolean)
            setAltHandles((prev) => (prev.length ? prev : own.filter((x) => x && x !== primary).slice(0, 2)))
          }
          if (p.email) setEmail((e) => e || p.email)
          if (p.displayName) setDisplayName((n) => n || p.displayName)
          setSynced(p.source === 'db')
        }
      })
      .catch(() => {})
      .finally(() => {
        if (live) persistReady.current = true
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the account + sky whenever they change (debounced). Gated on the
  // initial load so it can't clobber a stored sky with the empty boot state.
  useEffect(() => {
    if (!persistReady.current) return
    const id = setTimeout(() => {
      // Re-check at fire time: a sign-out/delete between scheduling and firing flips
      // this off, and we must not write over an account that's being torn down.
      if (!persistReady.current) return
      const myHandles = [...new Set([me, ...altHandles].map(normHandle).filter(Boolean))]
      saveProfile({ me, myHandles, email, displayName, handles, times: sealTimes, sealCount: handles.length }).catch(() => {})
    }, 600)
    return () => clearTimeout(id)
  }, [me, altHandles, email, displayName, handles, sealTimes])

  // Keep the slot meter fresh for the current handle (server is the authority at
  // seal time; this feeds the meter + the out-of-slots countdown).
  useEffect(() => {
    if (demo) {
      setSlots(FULL_SLOTS)
      return
    }
    let live = true
    fetchSlots(me, { demo })
      .then((s) => {
        if (live && s) setSlots(s)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [me, demo])

  // Light up the constellations: which entered @s are mutual (group-aware on the
  // server). Re-checked when the sky or handle changes; instant reveals at seal
  // also add to this set directly.
  useEffect(() => {
    if (!handles.length || !normHandle(me)) {
      setMatches([])
      return
    }
    let live = true
    const id = setTimeout(() => {
      checkMutuals({ me, handles, demo })
        .then((m) => {
          if (live) setMatches(m.map(normHandle).filter(Boolean))
        })
        .catch(() => {})
    }, 400)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [me, handles, demo])

  // Register the user's own @s as one identity group, so being entered on any of
  // their accounts counts (multi-account, §ident). Debounced; only meaningful with
  // 2+ handles. Best-effort — failures just leave matching single-handle.
  useEffect(() => {
    if (!persistReady.current) return
    const uniq = [...new Set([me, ...altHandles].map(normHandle).filter(Boolean))]
    if (uniq.length < 2) return
    const id = setTimeout(() => {
      linkHandles(uniq, { demo }).catch(() => {})
    }, 700)
    return () => clearTimeout(id)
  }, [me, altHandles, demo])

  // Latest sky in refs, so the merge below can read it without stale closures.
  const handlesRef = useRef(handles)
  const timesRef = useRef(sealTimes)
  useEffect(() => {
    handlesRef.current = handles
  }, [handles])
  useEffect(() => {
    timesRef.current = sealTimes
  }, [sealTimes])

  // Union an incoming (server) sky with what's on screen — keyed by normalised
  // handle, server entries first. This is what makes signing in mid-flow ADOPT an
  // existing cross-device sky instead of overwriting it with the local one.
  const mergeSky = useCallback((p) => {
    if (!p) return
    const map = new Map()
    const dbH = (p.sky && p.sky.handles) || []
    const dbT = (p.sky && p.sky.times) || []
    dbH.forEach((h, i) => {
      const k = normHandle(h)
      if (k) map.set(k, { h: k, t: dbT[i] || Date.now() })
    })
    handlesRef.current.forEach((h, i) => {
      const k = normHandle(h)
      if (k && !map.has(k)) map.set(k, { h: k, t: timesRef.current[i] || Date.now() })
    })
    const arr = [...map.values()]
    setHandles(arr.map((x) => x.h))
    setSealTimes(arr.map((x) => x.t))
    if (p.handle) setMe((m) => m || normHandle(p.handle))
    if (Array.isArray(p.myHandles) && p.myHandles.length) {
      setAltHandles((prev) => {
        const set = new Set(prev.map(normHandle).filter(Boolean))
        p.myHandles.map(normHandle).filter(Boolean).forEach((x) => set.add(x))
        set.delete(normHandle(p.handle || ''))
        return [...set].slice(0, 2)
      })
    }
    if (p.email) setEmail((e) => e || p.email)
    if (p.displayName) setDisplayName((n) => n || p.displayName)
    if (p.source === 'db') setSynced(true)
  }, [])

  // When a real sign-in completes (e.g. the seal-time Instagram popup), pull the
  // server profile and merge it in — so an account's sky follows it across devices.
  useEffect(() => {
    if (!supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN') return
      loadProfile().then(mergeSky).catch(() => {})
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [mergeSky])

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
    setDemo(true) // take effect this session (no reload) — sandboxed, never writes
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

  // Seal: record the one-way entry. With instant reveal, a completed mutual routes
  // to the match screen; otherwise it rests in the sky.
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
    // Out of slots? The server is authoritative, but short-circuit a doomed seal.
    if (!demo && slotsRemaining(slots) <= 0) {
      go('outofslots')
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
    setHandles((h) => [...h, normHandle(them)])
    setSealTimes((s) => [...s, now])
    // Measure the live @ field NOW (it's still mounted) so the morph collapses from
    // exactly where the textbox is and the galaxy drift continues from that point.
    let origin = SENDOFF_ORIGIN
    let geom = null
    try {
      const el = document.querySelector('[data-sendoff-field]')
      if (el) {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        origin = { x: cx / window.innerWidth, y: cy / window.innerHeight }
        geom = { cx, cy, w: r.width, h: r.height }
      }
    } catch {
      /* ignore — fall back to the default origin */
    }
    setSendoffOrigin(origin)
    setMorph({ handle: normHandle(them), geom })
    setTimeout(() => setMorph(null), 1320)
    go('sendoff')
    const minSuspense = new Promise((r) => setTimeout(r, 3200))
    try {
      const [res] = await Promise.all([submitEntry({ me, ex: them, email, demo }), minSuspense])
      const rollback = () => {
        setHandles((h) => h.slice(0, -1))
        setSealTimes((s) => s.slice(0, -1))
      }
      if (res?.slots) setSlots(res.slots)
      if (res?.error === 'no_slots') {
        rollback()
        go('outofslots')
        return
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
      if (res?.mutual) {
        const mh = normHandle(res.match || them)
        setMatches((m) => (m.includes(mh) ? m : [...m, mh]))
        go('match')
        return
      }
      go('resting')
    } catch (e) {
      console.error(e)
      setHandles((h) => h.slice(0, -1))
      setSealTimes((s) => s.slice(0, -1))
      setError(t('them.errGeneric'))
      go('them')
    }
  }, [me, them, email, slots, demo, verified, go, t])

  // Multi-entry: gate on the slot budget here too (entering "more users").
  const checkAnother = useCallback(() => {
    setThem('')
    setError('')
    if (!demo && slotsRemaining(slots) <= 0) {
      go('outofslots')
      return
    }
    go('them')
  }, [slots, demo, go])

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
      // let the vanish animation finish, then remove the star
      await new Promise((r) => setTimeout(r, 520))
      // Drop the SAME slot on the canvas that we drop from the handle/time arrays,
      // so every surviving star stays matched to its own @tag (the galaxy used to
      // trim its tail here, which slid every later star onto the wrong tag).
      if (f && f.removeSealAt) f.removeSealAt(i)
      setHandles((h) => h.filter((_, k) => k !== i))
      setSealTimes((s) => s.filter((_, k) => k !== i))
      // Releasing a star does NOT refund the slot it cost (anti-fishing): the budget
      // is spent server-side at seal and never returned, so enter→peek→release can't
      // be cycled to sweep everyone you know.
      if (handle) setMatches((m) => m.filter((x) => x !== normHandle(handle)))
      // Clear the last-entered handle so nothing stale (a ghost "@…") survives the
      // release; if this was the last star, the resting sky shows its empty state.
      setThem('')
      setError('')
      if (handle) {
        try {
          await withdrawEntry({ me, ex: handle, demo })
        } catch (e) {
          console.error(e)
        }
      }
    },
    [handles, me, demo],
  )
  const starInfo = useCallback(
    (i) =>
      i == null
        ? null
        : { handle: handles[i] || null, time: sealTimes[i] || null, mutual: matches.includes(normHandle(handles[i] || '')) },
    [handles, sealTimes, matches],
  )

  // Reset local state to a clean slate (shared by sign-out and account deletion).
  // Does NOT touch the database — callers decide that.
  const wipeLocalState = useCallback(() => {
    try {
      localStorage.removeItem(STORE)
      localStorage.removeItem('celestual:sky')
    } catch {
      /* ignore */
    }
    setEmail('')
    setMe('')
    setDisplayName('')
    setAltHandles([])
    setThem('')
    setSealedAt(null)
    setHandles([])
    setSealTimes([])
    setMatches([])
    setOver18(false)
    setError('')
    setSlots(FULL_SLOTS)
    setSynced(false)
  }, [])

  const openAccount = useCallback(() => setAccountOpen(true), [])
  const closeAccount = useCallback(() => setAccountOpen(false), [])

  const signOut = useCallback(async () => {
    persistReady.current = false
    await signOutUser()
    setSession(null)
    wipeLocalState()
    setAccountOpen(false)
    go('landing')
    setTimeout(() => (persistReady.current = true), 800)
  }, [go, wipeLocalState])

  // Delete the whole account: erase the database rows + auth user, then wipe local.
  const deleteAccount = useCallback(async () => {
    persistReady.current = false
    try {
      await deleteAccountApi()
    } catch {
      /* ignore — clear locally regardless */
    }
    setSession(null)
    wipeLocalState()
    setAccountOpen(false)
    go('landing')
    setTimeout(() => (persistReady.current = true), 1000)
  }, [go, wipeLocalState])

  const affirmAge = useCallback(() => setOver18(true), [])
  const openConversation = useCallback(
    (handle) => {
      const h = normHandle(handle || them)
      if (h) window.open(`https://instagram.com/${h}`, '_blank', 'noopener,noreferrer')
    },
    [them],
  )

  // Add / remove one of the user's own alternate @s (multi-account; capped so the
  // identity set [me, ...alts] never exceeds 3).
  const addAltHandle = useCallback(
    (h) => {
      const n = normHandle(h)
      if (!n) return
      setAltHandles((prev) => {
        const set = [me, ...prev].map(normHandle).filter(Boolean)
        if (set.includes(n) || set.length >= 3) return prev
        return [...prev, n]
      })
    },
    [me],
  )
  const removeAltHandle = useCallback((h) => {
    const n = normHandle(h)
    setAltHandles((prev) => prev.filter((x) => normHandle(x) !== n))
  }, [])

  const ctx = {
    email, me, them, displayName, altHandles, sealedAt, over18, error, demo, verified, synced, slots, matches,
    slotsLeft: demo ? Infinity : slotsRemaining(slots),
    isMutual: (h) => matches.includes(normHandle(h)),
    matchCount: handles.filter((h) => matches.includes(normHandle(h))).length,
    setEmail, setMe, setThem, setDisplayName, addAltHandle, removeAltHandle,
    requestReminder: (em) => requestReminder({ me, email: em || email, demo }),
    go, seal, checkAnother, affirmAge, suppressHandle, openConversation,
    enterDemo, findOut, watchIntro, finishIntro, onIntroStep,
    onStarTap, closeStar, removeStar,
    openAccount, closeAccount, signOut, deleteAccount,
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
  const showSwitcher = !['intro', 'sendoff', 'match'].includes(screen)
  // The profile chip sits top-left, only where there's no back button to collide
  // with: the resting sky (always) and the landing once a handle is known.
  const showProfile = screen === 'resting' || (screen === 'landing' && !!me)

  return (
    <div className="celestual-app">
      <GalaxyCanvas
        mode={mode}
        dim={bg.dim}
        origin={screen === 'sendoff' ? sendoffOrigin : bg.origin}
        seals={handles.length}
        you={C.you}
        them={C.them}
        motion={MOTION}
        onReady={(f) => (galaxyRef.current = f)}
        style={{ position: 'fixed', zIndex: 0 }}
      />
      <StarTags fieldRef={galaxyRef} handles={handles} mutual={matches} color={C.them} matchColor={C.you} show={(screen === 'sendoff' || screen === 'resting') && focused == null} />
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

      {showProfile && (
        <div style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))', zIndex: 20 }}>
          <ProfileButton C={C} handle={me} onClick={openAccount} />
        </div>
      )}

      <div key={screen} className="fade" data-screen={screen} style={{ position: 'relative', zIndex: 4 }}>
        <Screen C={C} ctx={ctx} lang={lang} />
      </div>

      {/* interactive field: the focused-star detail card */}
      {focused != null && screen === 'resting' && (
        <StarDetail
          C={C}
          lang={lang}
          info={starInfo(focused)}
          onRemove={() => removeStar(focused)}
          onOpen={() => openConversation(handles[focused])}
          onClose={closeStar}
        />
      )}

      {morph && <Liftoff C={C} handle={morph.handle} geom={morph.geom} />}

      {accountOpen && <AccountSheet C={C} ctx={ctx} lang={lang} />}
    </div>
  )
}

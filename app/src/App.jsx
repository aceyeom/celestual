import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import {
  placePing, pingStatus, fetchMyPings, renewPing, retirePing, fetchSlots,
  suppressHandle, normHandle, isValidHandle, linkHandles, setWorlds,
  fetchCampus, preregisterCampus, SLOT_CAP, FULL_SLOTS,
} from './api/celestual.js'
import { standingCount } from './api/pings.js'
import { getSession, signInStub, markVerified, signOut as clearAuthSession, resumeSession } from './api/auth.js'
import { igVerifyEnabled, loadPending } from './api/igverify.js'
import { makeColors } from './theme.js'
import { GalaxyCanvas, ProfileButton, LoginButton, Liftoff } from './components/ui.jsx'
import {
  LandingScreen, OpenDoorScreen, WhoScreen, YouScreen, PlacedScreen, PingsScreen,
  DoorScreen, CampusScreen, WorldsScreen, MatchScreen, FourthSlotScreen, PrivacyScreen,
  SendoffScreen, AccountSheet, IgVerifySheet,
} from './components/screens.jsx'
import { DEMO_PINGS, DEMO_CAMPUS, DEMO_WORLDS, DEMO_ME } from './demoData.js'
import { useI18n } from './i18n/index.js'

// The screens — docs/ULTIMATE-PRODUCT-FRAMEWORK.md Part 4, one component each.
const SCREENS = {
  landing: LandingScreen, // 1 · the cold landing
  open: OpenDoorScreen, //    the personal open-door page (/@handle)
  who: WhoScreen, //        2 · the send
  you: YouScreen, //            identity (so the ping can resolve to you)
  sendoff: SendoffScreen, // the @ becomes a star and flies into the galaxy
  placed: PlacedScreen, //  3 · placed — the recruiter screen
  pings: PingsScreen, //    4 · your pings — the status page
  door: DoorScreen, //      5 · the open-door card
  campus: CampusScreen, //  6–7 · the campus window (/c/slug, optional launch tool)
  worlds: WorldsScreen, //  your worlds — communities + the fixed-100 stats
  match: MatchScreen, //    8 · the match
  fourth: FourthSlotScreen, // 9 · the fourth slot (dormant)
  privacy: PrivacyScreen, //    privacy + the public opt-out (/optout)
}

const STORE = 'celestual:v2'

// ── routes ────────────────────────────────────────────────────────────────────
// /demo         → the sandbox (auto-verify, hardcoded sample data)
// /@handle      → someone's open door, ping field prefilled (Loop B)
// /c/<slug>     → a campus window (Loop C)
// /optout       → the public opt-out page
const parseRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (/(^|\/)demo$/.test(path)) return { demo: true }
  const at = path.match(/^\/@([a-zA-Z0-9._]{1,30})$/)
  if (at) return { poster: normHandle(at[1]) }
  const campus = path.match(/^\/c\/([a-z0-9-]{1,64})$/i)
  if (campus) return { campus: campus[1].toLowerCase() }
  if (path === '/optout') return { optout: true }
  return {}
}

export default function App() {
  const { t } = useI18n()
  const C = useMemo(() => makeColors(), [])
  const route = useMemo(parseRoute, [])
  const [demo] = useState(!!route.demo)

  const init = useMemo(() => {
    if (route.demo) return {}
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {}
    } catch {
      return {}
    }
  }, [route.demo])

  // ── identity ──
  const [session, setSession] = useState(getSession)
  const [me, setMe] = useState(init.me || (demo ? DEMO_ME : '') || session?.handle || '')
  const [email, setEmail] = useState(init.email || '')
  const [altHandles, setAltHandles] = useState(init.altHandles || [])
  // Identity is proven for the CURRENT handle only — a DM session is bound to
  // the exact @ it verified, so editing `me` drops back to unverified.
  const verified =
    !!session?.verified &&
    (session.provider === 'instagram_dm'
      ? !!me.trim() && normHandle(session.handle) === normHandle(me)
      : true)

  // ── the pings (the whole product state) ──
  // [{ handle|null, time, expires_at, mutual, reachable, intent }]
  // Plaintext handles live HERE (and in localStorage) only — the server stores
  // hashes. `handle: null` rows are pings restored from another device.
  const [pings, setPings] = useState(() => (demo ? DEMO_PINGS.map((p) => ({ ...p })) : init.pings || []))
  const [them, setThem] = useState(route.poster || '')
  const [intent, setIntent] = useState('')
  const [error, setError] = useState('')
  const [lastPlaced, setLastPlaced] = useState(null) // { handle, reachable }
  const [match, setMatch] = useState(null) // { them, yourIntent, theirIntent }
  const [slots, setSlots] = useState(FULL_SLOTS)
  const [loginMode, setLoginMode] = useState(false)
  // sandbox only: whether the one-time fourth slot has been "bought" in the demo
  // checkout — raises the local cap to four so the preview is playable.
  const [demoFourthSlot, setDemoFourthSlot] = useState(false)
  const slotCap = demo && demoFourthSlot ? SLOT_CAP + 1 : SLOT_CAP

  // ── worlds (community counters) ──
  const [worlds, setWorldsState] = useState(() => (demo ? DEMO_WORLDS.map((w) => ({ ...w })) : init.worlds || []))

  // ── the campus window ──
  const [campus, setCampus] = useState(() => (demo ? { ...DEMO_CAMPUS } : null))
  const [campusJoined, setCampusJoined] = useState(false)

  // ── overlays ──
  const [accountOpen, setAccountOpen] = useState(false)
  // { handle, onDone } while the DM-verification overlay is up.
  const [verify, setVerify] = useState(null)

  // ── the send-off animation ──
  // When a ping is finalized the @ field collapses into a star (the Liftoff
  // overlay: { handle, geom }) and the galaxy plays its 'sendoff' drift from that
  // same origin, carrying the new star into the disk. `galaxyMode` drives the
  // canvas; `sendoffOrigin` is where the star ignites (normalized screen coords).
  const [morph, setMorph] = useState(null)
  const [galaxyMode, setGalaxyMode] = useState('idle')
  const [sendoffOrigin, setSendoffOrigin] = useState(null)
  const morphTimer = useRef(null)
  const sendoffTimer = useRef(null)
  useEffect(
    () => () => {
      if (morphTimer.current) clearTimeout(morphTimer.current)
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
    },
    [],
  )

  // What a completed verification should resume into: 'place' | 'prereg' | null.
  const pendingAction = useRef(null)

  const established = verified || demo || pings.length > 0

  // ── navigation ──
  const firstScreen = () => {
    if (route.poster) return 'open'
    if (route.campus) return 'campus'
    if (route.optout) return 'privacy'
    if (!demo && init.screen && SCREENS[init.screen] && !['match', 'placed', 'you', 'who', 'sendoff'].includes(init.screen)) return init.screen
    if (pings.length) return 'pings'
    return 'landing'
  }
  const [screen, setScreen] = useState(firstScreen)
  const screenRef = useRef(screen)
  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  // Swap the visible screen — cross-fades with the View Transitions API where
  // supported; instant swap otherwise.
  const applyScreen = useCallback((s) => {
    const apply = () => setScreen(s)
    const afterScroll = () => requestAnimationFrame(() => window.scrollTo(0, 0))
    const reduce =
      typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce && typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      try {
        document.startViewTransition(() => flushSync(apply))
        afterScroll()
        return
      } catch {
        /* fall through to an instant swap */
      }
    }
    apply()
    afterScroll()
  }, [])

  // Navigate + record a history entry so the OS Back button walks the in-app
  // screens instead of exiting the site.
  const go = useCallback(
    (s) => {
      try {
        if (s === screenRef.current) {
          window.history.replaceState({ celestualScreen: s }, '')
        } else {
          window.history.pushState({ celestualScreen: s }, '')
        }
      } catch {
        /* history unavailable — navigation still works */
      }
      applyScreen(s)
    },
    [applyScreen],
  )

  useEffect(() => {
    try {
      window.history.replaceState({ celestualScreen: screenRef.current }, '')
    } catch {
      /* ignore */
    }
    const onPop = (e) => {
      const s = e.state && e.state.celestualScreen
      if (s && SCREENS[s]) applyScreen(s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [applyScreen])

  // ── persistence (never in the sandbox) ──
  const persistReady = useRef(false)
  useEffect(() => {
    persistReady.current = true
  }, [])
  useEffect(() => {
    if (demo || !persistReady.current) return
    try {
      const identity = established ? { me, email, altHandles } : {}
      localStorage.setItem(
        STORE,
        JSON.stringify({ screen, ...identity, pings: established ? pings : [], worlds: established ? worlds : [] }),
      )
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [demo, screen, me, email, altHandles, pings, worlds, established])

  // ── verification (Instagram DM — the /demo variant auto-verifies) ──
  const openVerify = useCallback((handle, onDone) => {
    setVerify({ handle: normHandle(handle), onDone })
  }, [])
  const closeVerify = useCallback(() => setVerify(null), [])
  const onVerified = useCallback(
    (proof) => {
      if (!verify) return
      const s = demo
        ? { verified: true, provider: 'instagram_dm', handle: verify.handle, proof, email: '', name: '' }
        : markVerified(verify.handle, proof)
      setSession(s)
      const done = verify.onDone
      setVerify(null)
      if (done) done(proof)
    },
    [verify, demo],
  )

  // Resume a verification interrupted by the Instagram hand-off (mobile can
  // reload this tab; the saved code keeps polling instead of stranding them).
  useEffect(() => {
    if (demo || session?.verified || !igVerifyEnabled()) return
    const saved = loadPending()
    if (!saved || !saved.handle) return
    setMe((m) => m || saved.handle)
    setVerify({ handle: normHandle(saved.handle), onDone: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let live = true
    resumeSession().then((s) => {
      if (live && s) {
        setSession(s)
        if (s.handle && !me) setMe(s.handle)
      }
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── slots ──
  // The local count is always live; the server snapshot (proof-gated) can only
  // ever raise it (e.g. pings placed on another device).
  const slotsStanding = demo
    ? standingCount(pings)
    : Math.max(standingCount(pings), Number.isFinite(slots?.standing) ? slots.standing : 0)
  useEffect(() => {
    if (demo) return
    let live = true
    const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
    fetchSlots(me, { proof, demo })
      .then((s) => {
        if (live && s) setSlots(s)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [me, demo, session])

  // ── status refresh (Screen 4 stays true) ──
  // Sends the device-held plaintext list up; gets live state back. The server
  // can't produce the list itself — it stores hashes.
  useEffect(() => {
    if (demo) return
    const named = pings.filter((p) => p.handle).map((p) => p.handle)
    if (!named.length || !normHandle(me)) return
    let live = true
    const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
    const id = setTimeout(() => {
      pingStatus({ me, handles: named, proof, demo })
        .then((rows) => {
          if (!live || !rows.length) return
          setPings((prev) =>
            prev.map((p) => {
              const r = rows.find((x) => x.handle === normHandle(p.handle || ''))
              if (!r || !r.placed) return p
              return {
                ...p,
                expires_at: r.expires_at || p.expires_at,
                mutual: !!r.mutual || p.mutual,
                reachable: r.reachable != null ? !!r.reachable : p.reachable,
                intent: r.intent || p.intent,
              }
            }),
          )
        })
        .catch(() => {})
    }, 500)
    return () => {
      live = false
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, demo, pings.length, session])

  // Register the user's own @s as one identity group (multi-account).
  useEffect(() => {
    const uniq = [...new Set([me, ...altHandles].map(normHandle).filter(Boolean))]
    if (uniq.length < 2) return
    const id = setTimeout(() => {
      linkHandles(uniq, { demo }).catch(() => {})
    }, 700)
    return () => clearTimeout(id)
  }, [me, altHandles, demo])

  // ── the campus window ──
  useEffect(() => {
    if (demo || !route.campus) return
    let live = true
    fetchCampus(route.campus)
      .then((c) => {
        if (live) setCampus(c)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [demo, route.campus])

  // ── the send-off animation ──
  // Collapse the @ field into a star (Liftoff) and hand off to the galaxy's drift
  // from that same point, then reveal the result once the flight has played out
  // (~5s). Measured from the live @ field so the morph and the galaxy star share
  // one origin; falls back to a sensible center if the field can't be read.
  const runSendoff = useCallback(
    (handle, afterScreen) => {
      let origin = { x: 0.5, y: 0.42 }
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
        /* fall back to the default origin */
      }
      setSendoffOrigin(origin)
      setGalaxyMode('sendoff')
      setMorph({ handle, geom })
      go('sendoff')
      // the DOM morph is a one-shot ~1.25s gesture; drop it once it's played so
      // the galaxy star (now drifting from the same point) is all that remains.
      if (morphTimer.current) clearTimeout(morphTimer.current)
      morphTimer.current = setTimeout(() => {
        setMorph(null)
        morphTimer.current = null
      }, 1400)
      // after the full flight, settle the galaxy to idle and reveal the result.
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
      sendoffTimer.current = setTimeout(() => {
        setGalaxyMode('idle')
        go(afterScreen)
        sendoffTimer.current = null
      }, 4700)
    },
    [go],
  )

  // ── the flow ──
  const findOut = useCallback(() => {
    setLoginMode(false)
    setError('')
    // self @ first: a new, unidentified person names THEMSELVES before naming
    // anyone else — which also means the slot count we show them is real, not a
    // guess. once identified (or in the sandbox), go straight to the send.
    if (normHandle(me) && (verified || demo)) {
      go('who')
    } else {
      pendingAction.current = 'place'
      go('you')
    }
  }, [me, verified, demo, go])

  // From an open-door page: land two taps from a placed ping (field prefilled).
  const startFromDoor = useCallback(
    (poster) => {
      setThem(poster || '')
      setError('')
      go('who')
    },
    [go],
  )

  // Commit the placement once identity is settled. `proofOverride` comes from a
  // just-completed verification.
  const placeCommit = useCallback(
    async (proofOverride) => {
      const proof = proofOverride ?? (session?.provider === 'instagram_dm' ? session.proof : undefined)
      const target = normHandle(them)
      const chosen = intent || ''
      try {
        const res = await placePing({ me, them: target, email, proof, intent: chosen, demo })
        if (res?.slots) setSlots(res.slots)
        if (res?.error === 'no_slots') {
          go('fourth')
          return
        }
        if (res?.error === 'rate_limited') {
          setError(t('who.errRate'))
          go('who')
          return
        }
        if (res?.error === 'suppressed') {
          setError(t('who.errSuppressed'))
          go('who')
          return
        }
        if (res?.error === 'unverified') {
          clearAuthSession()
          setSession(null)
          setError(t('who.errUnverified'))
          go('who')
          return
        }
        // Recorded. Add/refresh the local row (the only plaintext there is).
        setPings((prev) => {
          const rest = prev.filter((p) => normHandle(p.handle || '') !== target)
          return [
            ...rest,
            {
              handle: target,
              time: Date.now(),
              expires_at: res.expires_at || new Date(Date.now() + 60 * 864e5).toISOString(),
              mutual: !!res.mutual,
              reachable: !!res.reachable,
              intent: chosen || null,
            },
          ]
        })
        setIntent('')
        if (res?.mutual) {
          setMatch({ them: target, yourIntent: chosen || null, theirIntent: res.match_intent || null })
          go('match')
          return
        }
        setLastPlaced({ handle: target, reachable: !!res.reachable })
        // the @ collapses into a star and flies into the galaxy, then 'placed'.
        runSendoff(target, 'placed')
      } catch (e) {
        console.error(e)
        setError(t('who.errGeneric'))
        go('who')
      }
    },
    [me, them, email, intent, demo, session, go, t, runSendoff],
  )

  // Preregister for the campus window ("count me in" — a full verified signup).
  const preregCommit = useCallback(
    async (proofOverride, emailOverride) => {
      const proof = proofOverride ?? (session?.provider === 'instagram_dm' ? session.proof : undefined)
      const em = emailOverride ?? email
      if (demo) {
        setCampus((c) => (c ? { ...c, count: Math.min(c.count + 1, c.threshold) } : c))
        setCampusJoined(true)
        go('campus')
        return
      }
      try {
        const res = await preregisterCampus({ slug: campus?.slug, me, email: em, proof, demo })
        if (res?.ok) {
          setCampusJoined(true)
          setCampus((c) => (c ? { ...c, count: res.count ?? c.count, status: res.status || c.status } : c))
        }
        go('campus')
      } catch (e) {
        console.error(e)
        go('campus')
      }
    },
    [campus, me, email, demo, session, go],
  )

  // Place — from the send screen. Runs the identity gate first when needed.
  const place = useCallback(async () => {
    setError('')
    if (!isValidHandle(them)) {
      setError(t('who.errInvalid'))
      return
    }
    if (normHandle(me) && normHandle(me) === normHandle(them)) {
      setError(t('who.errSelf'))
      return
    }
    // The three-slot rule, honored client-side too (the server is authority).
    // `slotCap` is three everywhere except the sandbox once the fourth is bought.
    if (standingCount(pings) >= slotCap) {
      go('fourth')
      return
    }
    if (!normHandle(me)) {
      pendingAction.current = 'place'
      setLoginMode(false)
      go('you')
      return
    }
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, (proof) => placeCommit(proof))
      return
    }
    if (!verified && !demo) setSession(signInStub())
    await placeCommit()
  }, [me, them, pings, demo, verified, go, t, placeCommit, openVerify])

  // From the identity step: prove the @, then resume whatever was waiting.
  const continueFromYou = useCallback(() => {
    if (!isValidHandle(me)) return
    const resume = (proof) => {
      const action = pendingAction.current
      pendingAction.current = null
      if (action === 'prereg') {
        preregCommit(proof)
        return
      }
      // identity settled. if a target is already chosen (an open-door link
      // pre-named them), finish placing; otherwise this was the self-@-first step
      // in the main funnel, so now go name the other person.
      if (normHandle(them)) placeCommit(proof)
      else go('who')
    }
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, resume)
      return
    }
    if (!verified && !demo) setSession(signInStub())
    resume()
  }, [me, them, demo, verified, openVerify, placeCommit, preregCommit, go])

  // The campus page's "count me in".
  const preregister = useCallback(
    async (em) => {
      if (em != null) setEmail(em)
      if (!normHandle(me)) {
        pendingAction.current = 'prereg'
        setLoginMode(false)
        go('you')
        return
      }
      if (!verified && (demo || igVerifyEnabled())) {
        openVerify(me, (proof) => preregCommit(proof, em))
        return
      }
      if (!verified && !demo) setSession(signInStub())
      await preregCommit(undefined, em)
    },
    [me, demo, verified, go, openVerify, preregCommit],
  )

  // ── sign back in (cross-device) ──
  const startLogin = useCallback(() => {
    setError('')
    setLoginMode(true)
    go('you')
  }, [go])

  const restorePings = useCallback(
    async (proofOverride) => {
      const proof = proofOverride ?? (session?.provider === 'instagram_dm' ? session.proof : undefined)
      try {
        const server = await fetchMyPings({ handle: me, proof, demo })
        if (server.length) {
          setPings((local) => {
            // Local plaintext wins. The server adds (a) mutual rows this device
            // hasn't seen and (b) anonymous standing rows — unmatched pings it
            // stores only as hashes, placed on some other device. Any local
            // unmatched named row already accounts for one server anonymous
            // row, so only the surplus becomes an anonymous row here.
            const localNamed = local.filter((p) => p.handle)
            const names = new Set(localNamed.map((p) => normHandle(p.handle)))
            const merged = [...localNamed]
            for (const s of server) {
              if (s.handle && !names.has(normHandle(s.handle))) merged.push({ ...s, reachable: true })
            }
            const serverAnon = server.filter((s) => !s.handle)
            const localUnmatched = localNamed.filter((p) => !p.mutual).length
            for (let i = 0; i < Math.max(0, serverAnon.length - localUnmatched); i++) {
              merged.push({ ...serverAnon[i], reachable: false })
            }
            return merged
          })
        }
      } catch {
        /* best-effort — land on whatever this device holds */
      }
      setLoginMode(false)
      go('pings')
    },
    [me, demo, session, go],
  )

  const login = useCallback(() => {
    if (!isValidHandle(me)) return
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, (proof) => restorePings(proof))
      return
    }
    if (!verified && !demo) setSession(signInStub())
    restorePings()
  }, [me, demo, verified, openVerify, restorePings])

  // ── the status page's actions ──
  const renew = useCallback(
    async (handle) => {
      const h = normHandle(handle)
      const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
      try {
        const res = await renewPing({ me, them: h, proof, demo })
        if (res?.ok) {
          setPings((prev) => prev.map((p) => (normHandle(p.handle || '') === h ? { ...p, expires_at: res.expires_at } : p)))
        }
      } catch (e) {
        console.error(e)
      }
    },
    [me, demo, session],
  )

  const letGo = useCallback(
    async (handle) => {
      const h = normHandle(handle)
      setPings((prev) => prev.filter((p) => normHandle(p.handle || '') !== h))
      try {
        await retirePing({ me, them: h, demo })
      } catch (e) {
        console.error(e)
      }
    },
    [me, demo],
  )

  const placeAnother = useCallback(() => {
    setThem('')
    setIntent('')
    setError('')
    if (standingCount(pings) >= slotCap) {
      go('fourth')
      return
    }
    go('who')
  }, [pings, slotCap, go])

  // ── sandbox: visualize a match ──
  // Flips a sample ping to mutual and plays the full match workflow.
  const simulateMutual = useCallback(
    (handle) => {
      if (!demo) return
      const h = normHandle(handle)
      const row = pings.find((p) => normHandle(p.handle || '') === h)
      setPings((prev) => prev.map((p) => (normHandle(p.handle || '') === h ? { ...p, mutual: true } : p)))
      setMatch({
        them: h,
        yourIntent: row?.intent || null,
        theirIntent: row?.intent === 'miss' ? 'unsaid' : 'miss',
      })
      go('match')
    },
    [demo, pings, go],
  )

  // ── sandbox: "buy" the one-time fourth slot ──
  // Flips the local cap to four so the checkout preview is playable end-to-end.
  // Never touches a server; production never reaches this (the fourth-slot screen
  // shows only the free door there).
  const buyFourthSlot = useCallback(() => {
    if (!demo) return
    setDemoFourthSlot(true)
  }, [demo])

  // After the sandbox checkout, go place the newly-held fourth. Raising the cap
  // and navigating in one step avoids the fourth-slot gate re-blocking on a stale
  // cap (the cap check reads the freshly-mounted send screen instead).
  const placeFourth = useCallback(() => {
    if (!demo) return
    setDemoFourthSlot(true)
    setThem('')
    setIntent('')
    setError('')
    go('who')
  }, [demo, go])

  // ── sandbox: a fresh match/stat lands in a community ──
  // Bumps a world's live weekly readout so the "active updates" read as live.
  const simulateWorldActivity = useCallback(
    (slug) => {
      if (!demo) return
      setWorldsState((prev) =>
        prev.map((w) => {
          if (w.slug !== slug || !w.week) return w
          return {
            ...w,
            count: Number(w.count) + 1,
            week: {
              ...w.week,
              matches: Number(w.week.matches || 0) + 1,
              pings: Number(w.week.pings || 0) + 3,
              joined: Number(w.week.joined || 0) + 1,
            },
          }
        }),
      )
    },
    [demo],
  )

  // ── sandbox: cycle the campus window through its three states ──
  const cycleCampus = useCallback(() => {
    if (!demo) return
    setCampus((c) => {
      if (!c) return c
      if (c.status === 'window') return { ...c, status: 'open', count: c.threshold, opened_at: new Date().toISOString() }
      if (c.status === 'open') return { ...c, status: 'revealed' }
      return { ...DEMO_CAMPUS }
    })
    setCampusJoined(false)
  }, [demo])

  // ── worlds ──
  const setWorldNames = useCallback(
    (names) => {
      const list = (names || []).map((n) => String(n || '').trim()).filter(Boolean).slice(0, 3)
      if (demo) {
        // keep the sample counters where names match; new names gather quietly
        setWorldsState(
          list.map((n) => DEMO_WORLDS.find((w) => w.name === n) || { slug: n, name: n, count: null }),
        )
        return
      }
      setWorldsState(list.map((n) => ({ slug: n, name: n, count: null })))
      const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
      setWorlds({ me, names: list, proof, demo })
        .then((res) => {
          if (res?.ok && Array.isArray(res.worlds)) setWorldsState(res.worlds)
        })
        .catch(() => {})
    },
    [demo, me, session],
  )

  // ── the exits ──
  const wipeLocalState = useCallback(() => {
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
    setMe('')
    setEmail('')
    setAltHandles([])
    setThem('')
    setIntent('')
    setError('')
    setPings([])
    setWorldsState([])
    setMatch(null)
    setLastPlaced(null)
    setSlots(FULL_SLOTS)
  }, [])

  const signOut = useCallback(async () => {
    persistReady.current = false
    clearAuthSession()
    setSession(null)
    wipeLocalState()
    setAccountOpen(false)
    go('landing')
    setTimeout(() => (persistReady.current = true), 800)
  }, [go, wipeLocalState])

  // Delete everything: the opt-out on your own handle (erases every ping you
  // placed, closes your door, blocks your handle) + a local wipe.
  const deleteEverything = useCallback(async () => {
    persistReady.current = false
    try {
      if (!demo && normHandle(me)) await suppressHandle(me)
    } catch {
      /* clear locally regardless */
    }
    clearAuthSession()
    setSession(null)
    wipeLocalState()
    setAccountOpen(false)
    go('landing')
    setTimeout(() => (persistReady.current = true), 1000)
  }, [demo, me, go, wipeLocalState])

  // The public opt-out, made demo-safe: the sandbox must never reach a server
  // (§4.4 — "in the demo nothing gets saved to the db"). suppressHandle() itself
  // only guards on `hasSupabase`, so the /demo opt-out page would otherwise write
  // for real; here it resolves locally instead.
  const suppress = useCallback(
    async (handle) => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 300))
        return { suppressed: normHandle(handle), erased: 0 }
      }
      return suppressHandle(handle)
    },
    [demo],
  )

  // ── outward ──
  // "go say it" — straight into the Instagram DM thread.
  const openConversation = useCallback((handle) => {
    const h = normHandle(handle)
    if (!h) return
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
    const url = mobile ? `https://ig.me/m/${h}` : `https://www.instagram.com/m/${h}`
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } catch {
      try {
        window.location.href = url
      } catch {
        /* ignore */
      }
    }
  }, [])

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

  const openAccount = useCallback(() => setAccountOpen(true), [])
  const closeAccount = useCallback(() => setAccountOpen(false), [])

  const ctx = {
    demo, me, them, email, error, verified, established, loginMode,
    pings, slotsStanding, slotsCap: slotCap,
    intent, setIntent,
    worlds, setWorldNames, simulateWorldActivity,
    lastPlaced, match,
    campus, campusJoined, preregister, cycleCampus,
    demoFourthSlot, buyFourthSlot, placeFourth,
    posterHandle: route.poster || '',
    verifyEnabled: igVerifyEnabled() || demo,
    setMe, setEmail, setThem,
    altHandles, addAltHandle, removeAltHandle,
    go, findOut, startFromDoor, place, continueFromYou, placeAnother,
    startLogin, login,
    renew, letGo, simulateMutual, openConversation, suppressHandle: suppress,
    openAccount, closeAccount, signOut, deleteEverything,
  }

  const Screen = SCREENS[screen] || SCREENS.landing

  // The profile chip sits top-left on the quiet screens, once an account is
  // established (never for a merely-typed @).
  const showProfile = established && !!me && ['pings', 'landing', 'campus', 'worlds'].includes(screen)
  // Its logged-out counterpart: a clear "log in" chip in the same corner, so a
  // returning person always has an obvious way back to their pings.
  const showLogin = !established && ['landing', 'open'].includes(screen)

  // Calm the living galaxy on the content screens so the foreground reads easily;
  // the sealed "your star" stays lit through it (it isn't scaled by dim), so a
  // soft glow keeps resting in the background behind the pings list. Landing keeps
  // the field bright; the send-off / match modes set their own dimming.
  const CALM_SCREENS = ['pings', 'who', 'you', 'placed', 'door', 'privacy', 'fourth', 'campus', 'worlds', 'open']
  const galaxyDim = CALM_SCREENS.includes(screen) ? 0.5 : 1

  return (
    <div className="celestual-app">
      <GalaxyCanvas
        mode={galaxyMode}
        dim={galaxyDim}
        origin={sendoffOrigin}
        seals={pings.length}
        you={C.you}
        them={C.them}
        style={{ zIndex: 0 }}
      />

      {(showProfile || showLogin) && (
        <div style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))', zIndex: 20 }}>
          {showProfile ? (
            <ProfileButton C={C} handle={me} onClick={openAccount} />
          ) : (
            <LoginButton C={C} label={t('landing.login')} onClick={startLogin} />
          )}
        </div>
      )}

      <div key={screen} className="fade" data-screen={screen} style={{ position: 'relative', zIndex: 4 }}>
        <Screen C={C} ctx={ctx} />
      </div>

      {/* the send-off morph: the @ field collapsing into a star (torn down by the
          morphTimer once its one-shot gesture has played). */}
      {morph && <Liftoff C={C} handle={morph.handle} geom={morph.geom} />}

      {accountOpen && <AccountSheet C={C} ctx={ctx} />}

      {/* Instagram DM verification — confirms the typed @ is really theirs,
          in-tab, no OAuth. The sandbox runs the same overlay, auto-verifying
          locally (real verification isn't wired there yet — it says so). */}
      {verify && <IgVerifySheet C={C} handle={verify.handle} demo={demo} onVerified={onVerified} onClose={closeVerify} />}
    </div>
  )
}

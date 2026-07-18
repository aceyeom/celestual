import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import {
  placePing, pingStatus, fetchMyPings, renewPing, retirePing, fetchSlots,
  suppressHandle, normHandle, isValidHandle, linkHandles, worldCounts, SLOT_CAP, FULL_SLOTS,
  SUB_SLOT_CAP, SUB_PING_DAYS,
} from './api/celestual.js'
import { standingCount } from './api/pings.js'
import { getSession, signInStub, markVerified, signOut as clearAuthSession, resumeSession } from './api/auth.js'
import { igVerifyEnabled, loadPending } from './api/igverify.js'
import { makeColors } from './theme.js'
import { GalaxyCanvas, CommunityGalaxyCanvas, ProfileButton, LoginButton, Liftoff, NavDock } from './components/ui.jsx'
import {
  LandingScreen, OpenDoorScreen, WhoScreen, YouScreen, PlacedScreen, PingsScreen,
  SkyCardScreen, CommunityScreen, WorldsScreen, SchoolsScreen, MatchScreen, FourthSlotScreen, PrivacyScreen,
  SendoffScreen, AccountSheet, IgVerifySheet, EduVerifySheet, PublicStarSheet, categoryOf,
  StarViewOverlay, CopyCodeScreen,
} from './components/screens.jsx'
import { CURATED, CURATED_SLUGS, isCurated, communityOpen, MATCH_FLOOR } from './communities.js'
import { DEMO_COMMUNITIES, DEMO_PUBLIC, DEMO_PINGS, DEMO_ME } from './demoData.js'
import { useI18n } from './i18n/index.js'

// The screens — docs/ULTIMATE-PRODUCT-FRAMEWORK.md Part 4, one component each.
const SCREENS = {
  landing: LandingScreen, // 1 · the cold landing
  open: OpenDoorScreen, //    the personal open-door page (/@handle)
  who: WhoScreen, //        2 · the send (crush @ first)
  you: YouScreen, //            identity (so the ping can resolve to you)
  schools: SchoolsScreen, //    new-user opt-in to affiliated communities
  sendoff: SendoffScreen, // the @ becomes a star and flies into the galaxy
  placed: PlacedScreen, //  3 · placed — the recruiter screen
  pings: PingsScreen, //    4 · your pings — the status page
  door: SkyCardScreen, //   5 · the open-sky community share card
  worlds: WorldsScreen, //  communities — the curated list
  community: CommunityScreen, // a community page (/c/slug) — the ring + weekly readout
  match: MatchScreen, //    8 · the match
  fourth: FourthSlotScreen, // 9 · the third-slot checkout (route key kept as 'fourth' for old sessions)
  privacy: PrivacyScreen, //    privacy + the public opt-out (/optout)
  copy: CopyCodeScreen, //   /copy#c=…: the verification email's copy button lands here
}

const STORE = 'celestual:v2'

// Seed the sandbox's live community numbers (progress + weekly readout) from the
// hardcoded demo overlay, keyed by curated slug. Ephemeral — never persisted, so
// it resets the moment the tab closes.
const seedDemoCommLive = () => {
  const o = {}
  for (const slug of CURATED_SLUGS) {
    const d = DEMO_COMMUNITIES[slug] || {}
    o[slug] = {
      open: d.open != null ? !!d.open : undefined, // sandbox-forced sky state (production: the countdown decides)
      members: Number(d.members || 0),
      pings: d.pings != null ? Number(d.pings) : null, // galaxy stars (null = withheld while gathering)
      matches: d.matches != null ? Number(d.matches) : null, // constellations
      week: d.week || null,
    }
  }
  return o
}

// ── routes ────────────────────────────────────────────────────────────────────
// /demo         → the sandbox (auto-verify, hardcoded sample data)
// /demo?seed    → the sandbox pre-seeded mid-story (pings placed, a community
//                 joined) — for design review and quick previews
// /@handle      → someone's open door, ping field prefilled (Loop B)
// /c/<slug>     → a curated community page (the ring + weekly readout)
// /optout       → the public opt-out page
const parseRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (/(^|\/)demo$/.test(path)) return { demo: true, seed: /(^|[?&])seed(=|&|$)/.test(window.location.search || '') }
  const at = path.match(/^\/@([a-zA-Z0-9._]{1,30})$/)
  if (at) return { poster: normHandle(at[1]) }
  const community = path.match(/^\/c\/([a-z0-9-]{1,64})$/i)
  if (community && isCurated(community[1].toLowerCase())) return { community: community[1].toLowerCase() }
  if (path === '/optout') return { optout: true }
  // /copy#c=1234 — the verification email's copy button. The code rides the
  // FRAGMENT so it never appears in a request line or a server log.
  if (path === '/copy') {
    const m = (window.location.hash || '').match(/c=(\d{4,8})/)
    return { copy: true, copyCode: m ? m[1] : '' }
  }
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
  const [session, setSession] = useState(() => (route.demo ? null : getSession()))
  const [me, setMe] = useState(init.me || session?.handle || (route.seed ? DEMO_ME : ''))
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
  const [pings, setPings] = useState(() => (demo ? (route.seed ? DEMO_PINGS : []) : init.pings || []))
  const [them, setThem] = useState(route.poster || '')
  const [intent, setIntent] = useState('')
  // who they are to you (crush / ex / friend / complicated) — drives which intent
  // lines the send screen offers. UI-only: the chosen intent id already carries
  // the category, so nothing extra is stored or sent.
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [lastPlaced, setLastPlaced] = useState(null) // { handle, reachable }
  const [match, setMatch] = useState(null) // { them, yourIntent, theirIntent }
  const [slots, setSlots] = useState(FULL_SLOTS)
  const [loginMode, setLoginMode] = useState(false)
  // sandbox only: the monetization preview state (docs/PRICING-REVENUE.md keeps
  // production dormant — the free two, one door, no money). `demoExtraSlots`
  // counts one-time $2.99 slots bought beyond the free two; `demoSubscribed` is
  // the $12.99/mo plan, which raises the cap to ten and (in placeCommit, below)
  // makes newly placed demo pings stand six months instead of sixty days.
  const [demoExtraSlots, setDemoExtraSlots] = useState(0)
  const [demoSubscribed, setDemoSubscribed] = useState(false)
  const slotCap = demo ? (demoSubscribed ? SUB_SLOT_CAP : SLOT_CAP + demoExtraSlots) : SLOT_CAP
  // sandbox only: which standing ping is mid-checkout for an extend ($2.99) —
  // set by startExtend when the status page's renew is tapped, cleared once the
  // checkout succeeds (finishExtend) or the moment the screen is left.
  const [extendHandle, setExtendHandle] = useState(null)

  // ── communities (the curated launch spaces) ──
  // Membership (which curated slugs you've joined) persists like a light
  // preference; the live numbers (progress, weekly readout) are ephemeral —
  // seeded in the sandbox, best-effort fetched in production. The onboarding
  // schools step is offered once (schoolsSeen). `openCommunity` is which one the
  // community page is showing.
  // Membership is SINGLE — you can be in exactly one community, the one you're
  // really at, proven by a .edu code (schoolCred). What it scopes is the SKY,
  // never the reach: your placed pings light up as stars in your community's
  // galaxy and count toward its weekly numbers, while the ping itself reaches
  // its person anywhere — same community, another one, or none (MASTER-GUIDE
  // §2.6: placing a ping never depends on any of this). Older saves may hold
  // several slugs; collapse to the first so the one-community rule holds
  // retroactively.
  const [joinedSlugs, setJoinedSlugs] = useState(() => (demo ? (route.seed ? [CURATED_SLUGS[0]] : []) : (init.memberships || []).slice(0, 1)))
  // The verified school credential for the joined community: { slug, email }. Kept
  // like a light preference (never the code — that lived only server-side).
  const [schoolCred, setSchoolCred] = useState(() => (demo ? null : init.schoolCred || null))
  const [commLive, setCommLive] = useState(() => (demo ? seedDemoCommLive() : {}))
  const [schoolsSeen, setSchoolsSeen] = useState(() => (demo ? !!route.seed : !!init.schoolsSeen))
  const [openCommunity, setOpenCommunity] = useState(route.community || CURATED_SLUGS[0])
  // The .edu gate overlay: { slug } while it's up. Verified → membership commits.
  const [eduVerify, setEduVerify] = useState(null)
  // The live engine of the app-wide backdrop when it's showing your community's
  // galaxy — so a placed ping can launch your own star into it. The ambient
  // field keeps its own handle for the same reason (the no-community sky).
  const homeGalaxyRef = useRef(null)
  const ambientGalaxyRef = useRef(null)

  // ── your @ in the sky (the public opt-in) ──
  // Off by default: your star is anonymous. Flipping it public (one warning
  // first — PublicStarSheet) rests your own @ above your star in your
  // community's sky, visible to anyone watching it. It announces that you're
  // HERE, never who you pinged — the double-blind is untouched. Reversible
  // anytime, persisted like a light preference.
  const [publicStar, setPublicStar] = useState(() => (demo ? false : !!init.publicStar))
  const [publicAsk, setPublicAsk] = useState(false)

  // The list handed to the UI: the curated registry, overlaid with live numbers
  // and your membership.
  const communities = useMemo(
    () =>
      CURATED.map((c) => {
        const live = commLive[c.slug] || {}
        return {
          ...c,
          open: live.open, // sandbox-only override; undefined in production, where the countdown decides
          members: Number(live.members || 0),
          pings: live.pings != null ? Number(live.pings) : null,
          matches: live.matches != null ? Number(live.matches) : null,
          week: live.week || null,
          joined: joinedSlugs.includes(c.slug),
        }
      }),
    [commLive, joinedSlugs],
  )

  // Your one community (the joined one), or null. Drives the app-wide backdrop
  // galaxy, the "your community" surfaces, and the sky-share card.
  const homeCommunity = useMemo(() => communities.find((c) => c.joined) || null, [communities])

  // The @s this device's pings hold, in ping order — the labels of your own
  // stars in whichever sky is behind the app, each carrying who that ping is to
  // you (the category tint its star wears). Plaintext lives here only.
  const mineLabels = useMemo(
    () => pings.filter((p) => p.handle).map((p) => ({ label: normHandle(p.handle), kind: categoryOf(p.intent) })),
    [pings],
  )
  // aligned by index with the ambient field's sealed stars (null = restored
  // from another device; that star stays unnamed)
  const sealLabels = useMemo(() => pings.map((p) => (p.handle ? normHandle(p.handle) : null)), [pings])
  // who each ping is to you, same alignment — the category tint each sealed
  // star wears in the ambient field (the same light the community sky uses)
  const sealKinds = useMemo(() => pings.map((p) => categoryOf(p.intent)), [pings])
  // The opted-in public @s resting in your community's sky. The sandbox seeds a
  // handful per community; production fills this from the server when the
  // opt-in ships its backend.
  const publicHandles = useMemo(() => {
    if (!homeCommunity) return []
    return demo ? DEMO_PUBLIC[homeCommunity.slug] || [] : []
  }, [demo, homeCommunity])
  const ownPublic = publicStar && normHandle(me) ? normHandle(me) : null

  // ── overlays ──
  const [accountOpen, setAccountOpen] = useState(false)
  // { handle, onDone } while the DM-verification overlay is up.
  const [verify, setVerify] = useState(null)

  // ── the dock ──
  // A screen can ask the dock to melt away while its sky takes the frame (the
  // community page's held zoom / find-your-star flight sets this).
  const [navHidden, setNavHidden] = useState(false)

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

  const established = verified || pings.length > 0

  // ── navigation ──
  const firstScreen = () => {
    if (route.poster) return 'open'
    if (route.community) return 'community'
    if (route.optout) return 'privacy'
    if (route.copy) return 'copy'
    if (!demo && init.screen && SCREENS[init.screen] && !['match', 'placed', 'you', 'who', 'sendoff', 'schools'].includes(init.screen)) return init.screen
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

  // Leaving the checkout screen any other way (back button, "not now", "let one
  // go") drops the pending extend — otherwise a later visit for an unrelated
  // reason (a fresh slot purchase) would wrongly re-open in extend mode.
  useEffect(() => {
    if (screen !== 'fourth' && extendHandle) setExtendHandle(null)
  }, [screen, extendHandle])

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
        JSON.stringify({ screen, ...identity, pings: established ? pings : [], memberships: joinedSlugs, schoolCred, schoolsSeen, publicStar }),
      )
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [demo, screen, me, email, altHandles, pings, joinedSlugs, schoolCred, schoolsSeen, publicStar, established])

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
    if (demo) return
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

  // ── community counts (production only; the sandbox seeds its own) ──
  // Best-effort: fill each curated community's progress from the server. The demo
  // owns its numbers locally, and everything degrades to "gathering" if the fetch
  // is empty, so nothing here blocks the communities UI.
  useEffect(() => {
    if (demo) return
    let live = true
    worldCounts(CURATED_SLUGS)
      .then((rows) => {
        if (!live || !rows || !rows.length) return
        setCommLive((prev) => {
          const next = { ...prev }
          for (const r of rows) {
            if (r && r.slug) next[r.slug] = { ...(next[r.slug] || {}), current: Number(r.count || 0) }
          }
          return next
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [demo])

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
      // after the full flight (coalesce + meteor + ignite, ~2.8s, plus a
      // breath of rest), settle the galaxy to idle and reveal the result.
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
      sendoffTimer.current = setTimeout(() => {
        setGalaxyMode('idle')
        go(afterScreen)
        sendoffTimer.current = null
      }, 3600)
    },
    [go],
  )

  // ── the star view (the status page's "see it in the sky") ──
  // Tapping one of your pings flies the backdrop camera to that ping's own star
  // and STAYS there — the foreground melts away, a designed overlay names the
  // star (the @ in the product's amber, its intent line beneath), and the hand
  // is free: drag orbits the whole galaxy around the held star, pinch pulls
  // closer. One clear close button glides the camera home to the pings page.
  // Works over both skies: the community galaxy's held dive, or the ambient
  // field's held focus when no community is joined.
  const [skyView, setSkyView] = useState(null) // { handle, intent, kind } while held
  const skyFlight = !!skyView
  const endSkyView = useCallback(() => {
    if (homeGalaxyRef.current && homeGalaxyRef.current.releaseDive) homeGalaxyRef.current.releaseDive()
    if (ambientGalaxyRef.current) {
      ambientGalaxyRef.current.clearFocus()
      if (ambientGalaxyRef.current.setNavEnabled) ambientGalaxyRef.current.setNavEnabled(false)
    }
    setSkyView(null)
  }, [])
  const locatePing = useCallback(
    (handle) => {
      const h = normHandle(handle)
      if (!h || skyView) return
      const row = pings.find((p) => normHandle(p.handle || '') === h)
      let ok = false
      if (homeCommunity && homeGalaxyRef.current) {
        ok = !!homeGalaxyRef.current.locateMine(h, { hold: true })
      } else if (ambientGalaxyRef.current) {
        const i = pings.findIndex((p) => normHandle(p.handle || '') === h)
        if (i >= 0) {
          ambientGalaxyRef.current.focusStar(i, { hold: true })
          if (ambientGalaxyRef.current.setNavEnabled) ambientGalaxyRef.current.setNavEnabled(true)
          ok = true
        }
      }
      if (!ok) return
      setSkyView({ handle: h, intent: (row && row.intent) || null, kind: categoryOf((row && row.intent) || '') })
    },
    [homeCommunity, pings, skyView],
  )

  // ── the public @ (announce yourself in your community's sky) ──
  // Turning it ON goes through the warning sheet; turning it OFF is one tap.
  const askPublicStar = useCallback(() => setPublicAsk(true), [])
  const confirmPublicStar = useCallback(() => {
    setPublicStar(true)
    setPublicAsk(false)
  }, [])
  const retractPublicStar = useCallback(() => setPublicStar(false), [])

  // ── the flow ──
  const findOut = useCallback(() => {
    setLoginMode(false)
    setError('')
    // crush @ first: a new person names who they're thinking about before naming
    // themselves. identity — and, for a new user, the affiliated-schools step —
    // comes after, on the way to placing.
    go('who')
  }, [go])

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
      // The sandbox subscription stands its pings six months instead of sixty
      // days (SUB_PING_DAYS) — production duration stays server-set.
      const days = demo && demoSubscribed ? SUB_PING_DAYS : undefined
      try {
        const res = await placePing({ me, them: target, email, proof, intent: chosen, demo, days })
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
        setCategory('')
        if (res?.mutual) {
          setMatch({ them: target, yourIntent: chosen || null, theirIntent: res.match_intent || null })
          go('match')
          return
        }
        // If you're in a community, this ping also lands in its sky: your own star
        // launches into the app-wide backdrop galaxy (marked as yours, carrying
        // its @ so it stays findable in the crowd), and — in the sandbox — the
        // community's live ping count ticks. The ping itself already reached its
        // person above, community or not: the sky is a lens, never a boundary.
        if (homeCommunity && homeGalaxyRef.current) homeGalaxyRef.current.launch(1, { mine: true, label: target, kind: categoryOf(chosen) })
        if (demo && homeCommunity && communityOpen(homeCommunity)) {
          setCommLive((prev) => {
            const cur = prev[homeCommunity.slug] || {}
            if (cur.pings == null) return prev
            return { ...prev, [homeCommunity.slug]: { ...cur, pings: Number(cur.pings) + 1 } }
          })
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
    [me, them, email, intent, demo, demoSubscribed, session, go, t, runSendoff, homeCommunity],
  )

  // ── communities (curated: join / leave, view, and the sandbox live feed) ──
  // A live membership mirror, so join/leave can read the current set without
  // depending on it (and re-creating the callback every join).
  const joinedRef = useRef(joinedSlugs)
  useEffect(() => {
    joinedRef.current = joinedSlugs
  }, [joinedSlugs])
  // Which fresh verification proof to carry through the onboarding schools step
  // into the final placement (the session state hasn't re-rendered yet).
  const onboardProof = useRef(undefined)

  // Commit membership once the .edu code is verified. SINGLE by construction: this
  // replaces any prior membership, and stamps the verified credential. In the
  // sandbox it also nudges the member count (you're now one of them).
  const commitMembership = useCallback(
    (slug, cred) => {
      if (!isCurated(slug)) return
      const already = joinedRef.current.includes(slug)
      setJoinedSlugs([slug])
      setSchoolCred(cred || { slug })
      if (demo && !already) {
        setCommLive((prev) => ({
          ...prev,
          [slug]: { ...(prev[slug] || {}), members: Number((prev[slug] && prev[slug].members) || 0) + 1 },
        }))
      }
    },
    [demo],
  )

  // Joining a community means proving you're at that school: open the .edu gate.
  // Already in it → no-op. The gate's success (onEduVerified) commits membership.
  const joinCommunity = useCallback(
    (slug) => {
      if (!isCurated(slug)) return
      if (joinedRef.current.includes(slug)) return
      setEduVerify({ slug })
    },
    [],
  )
  const onEduVerified = useCallback(
    ({ slug, email: eduEmail }) => {
      commitMembership(slug, { slug, email: eduEmail || '' })
      setEduVerify(null)
    },
    [commitMembership],
  )
  const leaveCommunity = useCallback((slug) => {
    setJoinedSlugs((prev) => prev.filter((s) => s !== slug))
    setSchoolCred((prev) => (prev && prev.slug === slug ? null : prev))
  }, [])
  const viewCommunity = useCallback(
    (slug) => {
      setOpenCommunity(isCurated(slug) ? slug : CURATED_SLUGS[0])
      go('community')
    },
    [go],
  )

  // Sandbox only: a live beat nudges the community it names, so the galaxy fills
  // and the weekly readout ticks as you watch. A ping adds a star; a match lights
  // a constellation; a join grows the membership. Counts only move on an OPEN
  // community (matches/pings stay withheld — null — while it's still gathering).
  const bumpCommunityActivity = useCallback(
    (slug, kind) => {
      if (!demo || !isCurated(slug)) return
      setCommLive((prev) => {
        const cur = prev[slug] || { members: 0, pings: null, matches: null, week: null }
        const next = { ...cur }
        if (kind === 'join') next.members = Number(cur.members || 0) + 1
        if (kind === 'ping' && cur.pings != null) next.pings = Number(cur.pings) + 1
        if (kind === 'match' && cur.matches != null) next.matches = Number(cur.matches) + 1
        if (cur.week && kind === 'join') next.week = { ...cur.week, joined: Number(cur.week.joined || 0) + 1 }
        return { ...prev, [slug]: next }
      })
    },
    [demo],
  )

  // The new-user schools step is done → mark it seen and place the held ping,
  // carrying the verification proof through from the identity step.
  const finishOnboarding = useCallback(() => {
    setSchoolsSeen(true)
    const proof = onboardProof.current
    onboardProof.current = undefined
    placeCommit(proof)
  }, [placeCommit])

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
    // The two-slot rule, honored client-side too (the server is authority).
    // `slotCap` is two everywhere except the sandbox, once a slot is bought or
    // the subscription raises it to ten.
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
      pendingAction.current = null
      // no target yet (login-free signup with no crush named) — go name one.
      if (!normHandle(them)) {
        go('who')
        return
      }
      // a target is chosen. for a first-time user, offer the affiliated schools
      // once (carrying the fresh proof through) before placing; otherwise place.
      if (!schoolsSeen) {
        onboardProof.current = proof
        go('schools')
        return
      }
      placeCommit(proof)
    }
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, resume)
      return
    }
    if (!verified && !demo) setSession(signInStub())
    resume()
  }, [me, them, demo, verified, schoolsSeen, openVerify, placeCommit, go])

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
    setCategory('')
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
        theirIntent: row?.intent === 'exMiss' ? 'crushThink' : 'exMiss',
      })
      go('match')
    },
    [demo, pings, go],
  )

  // ── sandbox: "buy" one more one-time slot, or subscribe ──
  // Neither ever touches a server; production never reaches this (the checkout
  // only renders in the sandbox — production keeps the single dormant "let one
  // go" door). Re-enterable: each one-time purchase adds another slot; sub=true
  // instead raises the cap straight to ten (SUB_SLOT_CAP).
  const buySlot = useCallback(
    (sub) => {
      if (!demo) return
      if (sub) setDemoSubscribed(true)
      else setDemoExtraSlots((n) => n + 1)
    },
    [demo],
  )

  // After the sandbox checkout, go place the newly-bought slot. Granting it and
  // navigating in one step avoids the paywall gate re-blocking on a stale cap
  // (the cap check reads the freshly-mounted send screen instead).
  const placeBoughtSlot = useCallback(
    (sub) => {
      if (!demo) return
      if (sub) setDemoSubscribed(true)
      else setDemoExtraSlots((n) => n + 1)
      setThem('')
      setIntent('')
      setCategory('')
      setError('')
      go('who')
    },
    [demo, go],
  )

  // ── sandbox: extend a near-lapse ping through the same checkout ──
  // Tapping renew on the status page lands here instead of renewing outright;
  // `finishExtend` performs the actual (free, unlimited) renew once the mock
  // payment succeeds. Production's renew is untouched — see PingCard in
  // screens.jsx, which only detours through this in the sandbox.
  const startExtend = useCallback(
    (handle) => {
      if (!demo) return
      setExtendHandle(normHandle(handle))
      go('fourth')
    },
    [demo, go],
  )

  const finishExtend = useCallback(async () => {
    if (!demo || !extendHandle) return
    await renew(extendHandle)
    setExtendHandle(null)
    go('pings')
  }, [demo, extendHandle, renew, go])

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
    setCategory('')
    setError('')
    setPings([])
    setJoinedSlugs([])
    setSchoolCred(null)
    setSchoolsSeen(false)
    setPublicStar(false)
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
    intent, setIntent, category, setCategory,
    communities, openCommunity, homeCommunity, homeGalaxyRef,
    viewCommunity, joinCommunity, leaveCommunity, bumpCommunityActivity, finishOnboarding,
    locatePing, skyFlight,
    publicStar, askPublicStar, retractPublicStar,
    lastPlaced, match,
    demoSubscribed, buySlot, placeBoughtSlot, extendHandle, startExtend, finishExtend,
    posterHandle: route.poster || '',
    copyCode: route.copyCode || '',
    verifyEnabled: igVerifyEnabled() || demo,
    setMe, setEmail, setThem,
    altHandles, addAltHandle, removeAltHandle,
    go, findOut, startFromDoor, place, continueFromYou, placeAnother,
    startLogin, login,
    renew, letGo, simulateMutual, openConversation, suppressHandle: suppress,
    openAccount, closeAccount, signOut, deleteEverything,
    setNavHidden,
  }

  const Screen = SCREENS[screen] || SCREENS.landing

  // The profile chip sits top-left on the quiet screens, once an account is
  // established (never for a merely-typed @).
  // Only on the screens with no back button of their own, so the chip never
  // stacks under a back arrow (the community screens carry their own back nav).
  const showProfile = established && !!me && ['pings', 'landing'].includes(screen)
  // Its logged-out counterpart: a clear "log in" chip in the same corner, so a
  // returning person always has an obvious way back to their pings.
  const showLogin = !established && ['landing', 'open'].includes(screen)

  // Calm the living galaxy on the content screens so the foreground reads easily;
  // the sealed "your star" stays lit through it (it isn't scaled by dim), so a
  // soft glow keeps resting in the background behind the pings list. Landing keeps
  // the field bright; the send-off / match modes set their own dimming.
  const CALM_SCREENS = ['pings', 'who', 'you', 'schools', 'placed', 'door', 'privacy', 'fourth', 'worlds', 'community', 'open']
  const galaxyDim = CALM_SCREENS.includes(screen) ? 0.5 : 1

  // The backdrop: once you've joined a community, the app-wide field IS your
  // community's living galaxy (the merge) — your pings land in it and your own
  // star stays findable in it. Otherwise it's the ambient procedural sky, which
  // still owns the send-off drift. On the community page your sky is the hero
  // (full bright); elsewhere it's calmed so the foreground reads.
  const homeOpen = homeCommunity ? communityOpen(homeCommunity) : false
  const homeMatches = homeCommunity && homeCommunity.matches != null ? Number(homeCommunity.matches) : 0
  const homePings = homeCommunity && homeCommunity.pings != null ? Number(homeCommunity.pings) : 0
  const communityDim = skyFlight ? 1 : screen === 'community' ? 1 : CALM_SCREENS.includes(screen) ? 0.4 : 0.72

  // ── the dock (the app's three places, one tap apart) ──
  // Lives on the resting hub screens only — the focused flows (the send, the
  // identity step, the send-off, the match) stay single-purpose. It melts, not
  // unmounts, during any cinematic (a star flight, a held zoom, the send-off),
  // and the screens pad their foot by --nav-pad so nothing sits under it.
  const NAV_SCREENS = ['pings', 'worlds', 'community', 'door']
  const navHere = NAV_SCREENS.includes(screen)
  const navMelt = skyFlight || navHidden || galaxyMode === 'sendoff' || !!morph

  return (
    <div className="celestual-app" style={{ '--nav-pad': navHere ? '84px' : '0px' }}>
      {homeCommunity ? (
        <CommunityGalaxyCanvas
          key={homeCommunity.slug}
          you={C.you}
          them={C.them}
          pings={homePings}
          matches={homeOpen && homeMatches >= MATCH_FLOOR ? homeMatches : 0}
          forming={!homeOpen}
          dim={communityDim}
          mine={mineLabels}
          publicHandles={publicHandles}
          ownPublic={ownPublic}
          onReady={(f) => (homeGalaxyRef.current = f)}
        />
      ) : (
        <GalaxyCanvas
          mode={galaxyMode}
          dim={skyFlight ? 1 : galaxyDim}
          origin={sendoffOrigin}
          seals={pings.length}
          sealLabels={sealLabels}
          sealKinds={sealKinds}
          you={C.you}
          them={C.them}
          onReady={(f) => (ambientGalaxyRef.current = f)}
          style={{ zIndex: 0 }}
        />
      )}

      {(showProfile || showLogin) && (
        <div style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))', zIndex: 20, opacity: skyFlight ? 0 : 1, transition: 'opacity .5s ease', pointerEvents: skyFlight ? 'none' : 'auto' }}>
          {showProfile ? (
            <ProfileButton C={C} handle={me} onClick={openAccount} />
          ) : (
            <LoginButton C={C} label={t('landing.login')} onClick={startLogin} />
          )}
        </div>
      )}

      {/* during a fly-to-a-star the foreground melts away so the sky is the
          whole screen; any tap brings it back. The entrance animation must be
          suppressed for the melt — its fill-mode would otherwise pin opacity
          at 1 and override the inline fade. */}
      <div
        key={screen}
        className="fade"
        data-screen={screen}
        style={{
          position: 'relative', zIndex: 4,
          animation: skyFlight ? 'none' : undefined,
          opacity: skyFlight ? 0.04 : 1,
          transition: 'opacity .55s ease',
          pointerEvents: skyFlight ? 'none' : 'auto',
        }}
      >
        <Screen C={C} ctx={ctx} />
      </div>

      {/* the dock — sky · communities · pings, always one tap apart */}
      {navHere && (
        <NavDock
          C={C}
          hidden={navMelt}
          items={[
            {
              id: 'sky',
              icon: 'star',
              label: t('nav.sky'),
              active: screen === 'community',
              // your community's living sky — or, before you've joined one,
              // the communities list so you can find yours
              onClick: () => (homeCommunity ? viewCommunity(homeCommunity.slug) : go('worlds')),
            },
            { id: 'worlds', icon: 'planet', label: t('nav.worlds'), active: screen === 'worlds', onClick: () => go('worlds') },
            { id: 'pings', icon: 'pings', label: t('nav.pings'), active: screen === 'pings', onClick: () => go('pings') },
          ]}
        />
      )}

      {/* the held star view: the @ resting in amber over its star, the intent
          line beneath, the hand free to orbit — and one clear way home. */}
      {skyView && <StarViewOverlay C={C} view={skyView} onClose={endSkyView} />}

      {/* the send-off morph: the @ field collapsing into a star (torn down by the
          morphTimer once its one-shot gesture has played). */}
      {morph && <Liftoff C={C} handle={morph.handle} geom={morph.geom} />}

      {accountOpen && <AccountSheet C={C} ctx={ctx} />}

      {/* Instagram DM verification — confirms the typed @ is really theirs,
          in-tab, no OAuth. The sandbox runs the same overlay, auto-verifying
          locally (real verification isn't wired there yet — it says so). */}
      {verify && <IgVerifySheet C={C} handle={verify.handle} demo={demo} onVerified={onVerified} onClose={closeVerify} />}

      {/* the public-@ warning — one honest stop before your handle goes up in
          your community's sky. confirming flips it; it's reversible anytime. */}
      {publicAsk && (
        <PublicStarSheet
          C={C}
          community={homeCommunity}
          handle={normHandle(me)}
          onConfirm={confirmPublicStar}
          onClose={() => setPublicAsk(false)}
        />
      )}

      {/* the .edu gate — join a community by proving you're at that school. The
          sandbox auto-confirms once a code is entered. */}
      {eduVerify && (
        <EduVerifySheet
          C={C}
          slug={eduVerify.slug}
          demo={demo}
          onVerified={onEduVerified}
          onClose={() => setEduVerify(null)}
        />
      )}
    </div>
  )
}

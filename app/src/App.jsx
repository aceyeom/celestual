import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import {
  placePing, pingStatus, fetchMyPings, renewPing, retirePing, fetchSlots,
  suppressHandle, eraseAccount, normHandle, isValidHandle, linkHandles, worldCounts, SLOT_CAP, FULL_SLOTS,
  SUB_SLOT_CAP, SUB_PING_DAYS, DEMO_CARD,
} from './api/celestual.js'
import { standingCount } from './api/pings.js'
import { getSession, signInStub, markVerified, signOut as clearAuthSession, resumeSession } from './api/auth.js'
import { igVerifyEnabled, loadPending } from './api/igverify.js'
import { bindRecovery, requestSignInLink, redeemSignInLink, beginSignIn } from './api/relogin.js'
import { makeColors } from './theme.js'
import { SENDOFF_SECONDS } from './galaxy.js'
import {
  GalaxyCanvas, CommunityGalaxyCanvas, Liftoff, Masthead, IndexColumn,
  useNarrow, rgba, INDEX_W,
} from './components/ui.jsx'
import {
  LandingScreen, OpenDoorScreen, WhoScreen, YouScreen, PlacedScreen, PingsScreen,
  SkyCardScreen, CommunityScreen, WorldsScreen, MutualScreen, FourthSlotScreen, PrivacyScreen,
  SendoffScreen, AccountSheet, IgVerifySheet, EduVerifySheet, PublicStarSheet,
  ComposeScreen, RevealScreen, CopyCodeScreen, SignInScreen, PaidScreen,
} from './components/screens.jsx'
import { makeCard, toWire, fromWire, tintOf } from './card/model.js'
import * as photos from './card/photos.js'
import { CardResolve } from './card/Resolve.jsx'
import {
  billingEnabled, planOffered, startCheckout, confirmCheckout, returnFromCheckout, scrubReturnUrl,
} from './api/billing.js'
import { TrialScreen } from './components/trial.jsx'
import { AdminScreen } from './components/admin.jsx'
import { rememberRef, loadRef, clearRef, countVisit, attributeSignup } from './api/recruit.js'
import { RESERVED_CODES } from './api/trial.js'
import { TRIAL_BANNER, TRIAL_DEADLINE } from './trialContent.js'
import { CURATED, CURATED_SLUGS, isCurated, communityOpen } from './communities.js'
import { DEMO_COMMUNITIES, DEMO_PUBLIC, DEMO_PINGS, DEMO_ME } from './demoData.js'
import { useI18n } from './i18n/index.js'

// The screens — docs/ULTIMATE-PRODUCT-FRAMEWORK.md Part 4, one component each.
const SCREENS = {
  landing: LandingScreen, // 1 · the cold landing
  open: OpenDoorScreen, //    the personal open-door page (/@handle)
  who: WhoScreen, //        2 · the send (crush @ first)
  compose: ComposeScreen, //    the card — the poster the ping carries
  you: YouScreen, //            identity (so the ping can resolve to you)
  sendoff: SendoffScreen, // the @ becomes a star and flies into the galaxy
  placed: PlacedScreen, //  3 · placed — the recruiter screen
  pings: PingsScreen, //    4 · your pings — the status page
  door: SkyCardScreen, //   5 · the open-sky community share card
  worlds: WorldsScreen, //  communities — the curated list
  community: CommunityScreen, // a community page (/c/slug) — the ring + weekly readout
  mutual: MutualScreen, //  8 · the match, announced and then gone
  reveal: RevealScreen, //      the spread: two stars fusing, two cards unsealing
  fourth: FourthSlotScreen, // 9 · the third-slot checkout (route key kept as 'fourth' for old sessions)
  privacy: PrivacyScreen, //    privacy + the public opt-out (/optout)
  copy: CopyCodeScreen, //   /copy#c=…: the verification email's copy button lands here
  signin: SignInScreen, //   /signin#t=…: the sign-back-in magic link redeems here
  trial: TrialScreen, //     /trial: the first light competition — the brief + entry
  admin: AdminScreen, //     /admin: the password-gated desk
  paid: PaidScreen, //       /paid: coming back from Stripe (docs/STRIPE-SETUP.md)
}

const STORE = 'celestual:v2'

// ── the card, on a ping row ──────────────────────────────────────────────────
// A ping's card lives with the ping: in `pings` (and therefore in localStorage,
// beside the plaintext handle it already keeps) and on the server as the sealed
// jsonb migration 0022 added. The PHOTOGRAPH does not — it is a blob in
// IndexedDB under this key, on the phone that took it, and nothing uploads it.
const photoKey = (handle) => (normHandle(handle) ? `card:${normHandle(handle)}` : null)

// What light this ping's star burns with. A colour, straight off its card; the
// four old category names still resolve for pings placed before the card
// existed (theme.js starTint), so an old sky does not go grey.
const starKind = (C, ping) =>
  ping && ping.card ? tintOf(C, ping.card.tone) : (ping && ping.intent) || ''

// Every photograph the current ping list references, as object URLs, minted
// once each (the store caches them) so a resolve running at sixty frames a
// second is not minting sixty object URLs a second.
function usePhotoUrls(pings) {
  const [urls, setUrls] = useState({})
  const ids = useMemo(
    () => [...new Set(pings.map((p) => p.photoId).filter(Boolean))].join('|'),
    [pings],
  )
  useEffect(() => {
    let live = true
    const want = ids ? ids.split('|') : []
    Promise.all(want.map((id) => photos.photoUrl(id).then((u) => [id, u])))
      .then((pairs) => {
        if (!live) return
        const next = {}
        for (const [id, u] of pairs) if (u) next[id] = u
        setUrls((prev) => {
          const same =
            Object.keys(next).length === Object.keys(prev).length &&
            Object.keys(next).every((k) => prev[k] === next[k])
          return same ? prev : next
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [ids])
  useEffect(() => () => photos.releaseUrls(), [])
  return urls
}

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
  // /r/<code> — an old-style tracking link (migration 0016), kept as an alias.
  // It lands on the ordinary cold landing; the code is remembered so the signup
  // it leads to is credited to its competitor.
  const ref = path.match(/^\/r\/([a-z0-9]{4,16})$/i)
  if (ref) return { ref: ref[1].toLowerCase() }
  // /trial — the first light competition: the brief, the doc, the entry.
  // /admin — the desk. /recruit (the retired 0016 flow) lands on the trial too,
  // so any link still out in a DM keeps working.
  if (path === '/trial' || path === '/recruit') return { trial: true }
  if (path === '/admin') return { admin: true }
  // /paid?s=<checkout session> — where Stripe sends someone back after the
  // hosted payment page (?c=1 if they backed out). The word is reserved in
  // api/trial.js so a competitor can never claim it as a four-letter code.
  if (path === '/paid') return { paid: true }
  // /copy#c=1234 — the verification email's copy button. The code rides the
  // FRAGMENT so it never appears in a request line or a server log.
  if (path === '/copy') {
    const m = (window.location.hash || '').match(/c=(\d{4,8})/)
    return { copy: true, copyCode: m ? m[1] : '' }
  }
  // /signin#t=<token> — the sign-back-in magic link (Fix B). The one-time token
  // rides the FRAGMENT so it never reaches a server log; the SignInScreen redeems
  // it for a fresh proof and restores the pings.
  if (path === '/signin') {
    const m = (window.location.hash || '').match(/t=([0-9a-fA-F]{16,128})/)
    return { signin: true, signinToken: m ? m[1] : '' }
  }
  // /<code> — a trial competitor's ROOT-LEVEL tracking link (migration 0017):
  // exactly four letters, chosen by them. Checked LAST so every named route
  // above wins first, and never for the words the router reserves.
  const four = path.match(/^\/([a-z]{4})$/i)
  if (four && !RESERVED_CODES.includes(four[1].toLowerCase())) return { ref: four[1].toLowerCase() }
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
  // the photographs this device holds for the cards above, as object URLs
  const cardUrls = usePhotoUrls(pings)
  const [error, setError] = useState('')
  const [lastPlaced, setLastPlaced] = useState(null) // { handle, reachable }
  const [match, setMatch] = useState(null) // { them } — what the mutual flash names
  const [slots, setSlots] = useState(FULL_SLOTS)
  const [loginMode, setLoginMode] = useState(false)
  // ── the identity router (migration 0015) ──
  // The identity screen has ONE field and ONE button; this holds the answer the
  // SERVER gave about the @ in it, so the screen never has to guess (or hedge in
  // print) about which way in this person takes.
  //   phase: 'idle' → nothing asked yet
  //          'checking' → the question is out
  //          'resolved' → `route` is 'signup' | 'dm' | 'email'; `to` is the
  //                       masked inbox the link actually went to
  const [identity, setIdentity] = useState({ phase: 'idle', route: '', to: '', fresh: false })
  // ── recruitment attribution (migration 0016) ──
  // The tracking code this visitor arrived through, if any. Held until they
  // finish verifying, at which point the signup is credited to that recruiter
  // once and the code is dropped. Nothing about the visitor is ever sent with it.
  const [ref, setRef] = useState(() => (demo ? '' : route.ref || init.ref || loadRef()))
  useEffect(() => {
    if (demo || !route.ref) return
    rememberRef(route.ref)
    countVisit(route.ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // sandbox only: the monetization preview state (docs/PRICING-REVENUE.md keeps
  // production dormant — the free two, one door, no money). `demoExtraSlots`
  // counts one-time $2.99 slots bought beyond the free two; `demoSubscribed` is
  // the $12.99/mo plan, which raises the cap to ten and (in placeCommit, below)
  // makes newly placed demo pings stand six months instead of sixty days.
  const [demoExtraSlots, setDemoExtraSlots] = useState(0)
  const [demoSubscribed, setDemoSubscribed] = useState(false)
  // In production the cap is the SERVER's answer (migration 0021: the free two
  // plus whatever this person holds, and ten while a plan is live), never a
  // client constant — a bought slot has to show up on every device the moment
  // it's paid for. SLOT_CAP is the floor for the no-backend fallback.
  const slotCap = demo
    ? (demoSubscribed ? SUB_SLOT_CAP : SLOT_CAP + demoExtraSlots)
    : Math.max(SLOT_CAP, Number(slots?.cap) || 0)
  // sandbox only: which standing ping is mid-checkout for an extend ($2.99) —
  // set by startExtend when the status page's renew is tapped, cleared once the
  // checkout succeeds (finishExtend) or the moment the screen is left.
  const [extendHandle, setExtendHandle] = useState(null)

  // ── communities (the curated launch spaces) ──
  // Membership (which curated slugs you've joined) persists like a light
  // preference; the live numbers (progress, weekly readout) are ephemeral —
  // seeded in the sandbox, best-effort fetched in production. The onboarding
  // `openCommunity` is which one the
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
    () => pings.filter((p) => p.handle).map((p) => ({ label: normHandle(p.handle), kind: starKind(C, p) })),
    [pings, C],
  )
  // aligned by index with the ambient field's sealed stars (null = restored
  // from another device; that star stays unnamed)
  const sealLabels = useMemo(() => pings.map((p) => (p.handle ? normHandle(p.handle) : null)), [pings])
  // The light each sealed star burns with, same alignment. It is the light of
  // the card that ping carries: measured off the photograph, or off the plate
  // it stands on. Nobody chose it from a list, which is the point.
  const sealKinds = useMemo(() => pings.map((p) => starKind(C, p)), [pings, C])
  // The opted-in public @s resting in your community's sky. The sandbox seeds a
  // handful per community; production fills this from the server when the
  // opt-in ships its backend.
  const publicHandles = useMemo(() => {
    if (!homeCommunity) return []
    return demo ? DEMO_PUBLIC[homeCommunity.slug] || [] : []
  }, [demo, homeCommunity])
  const ownPublic = publicStar && normHandle(me) ? normHandle(me) : null

  // ── when the next slot opens ────────────────────────────────────────────────
  // Scarcity is the sincerity mechanism, and a mechanism nobody can see the
  // clock on is just a wall. Every standing ping has a lapse date; the soonest
  // one IS the date a slot comes back, and it is a fact the product already
  // knows and was not saying anywhere.
  //
  // A restored row with no name still counts — the clock is real even when the
  // @ it belongs to lives only on the device that typed it.
  const nextSlot = useMemo(() => {
    const standing = pings.filter((p) => !p.mutual && p.expires_at)
    if (!standing.length) return null
    const soonest = standing.reduce((a, b) => (Date.parse(a.expires_at) <= Date.parse(b.expires_at) ? a : b))
    const at = Date.parse(soonest.expires_at)
    if (!Number.isFinite(at)) return null
    return {
      handle: soonest.handle ? normHandle(soonest.handle) : null,
      at: soonest.expires_at,
      days: Math.max(0, Math.ceil((at - Date.now()) / 864e5)),
    }
  }, [pings])

  // ── overlays ──
  const [accountOpen, setAccountOpen] = useState(false)
  // { handle, onDone } while the DM-verification overlay is up.
  const [verify, setVerify] = useState(null)

  // ── the index ──
  // The one navigation. A screen can ask it to melt away while its sky takes
  // the frame (the community page's held zoom / find-your-star flight sets
  // this).
  const [navHidden, setNavHidden] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const narrow = useNarrow()

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
  // Email recovery (and therefore the server-side identity router) is available
  // whenever the real backend is wired and we're not in the sandbox.
  const recoveryEnabled = igVerifyEnabled() && !demo

  // ── navigation ──
  const firstScreen = () => {
    if (route.poster) return 'open'
    if (route.community) return 'community'
    if (route.optout) return 'privacy'
    if (route.copy) return 'copy'
    if (route.signin) return 'signin'
    if (route.trial) return 'trial'
    if (route.admin) return 'admin'
    if (route.paid) return 'paid'
    if (!demo && init.screen && SCREENS[init.screen] && !['mutual', 'reveal', 'placed', 'you', 'who', 'compose', 'sendoff', 'signin', 'copy', 'agree', 'trial', 'admin', 'paid'].includes(init.screen)) return init.screen
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
      const who = established ? { me, email, altHandles } : {}
      localStorage.setItem(
        STORE,
        JSON.stringify({ screen, ...who, pings: established ? pings : [], memberships: joinedSlugs, schoolCred, publicStar, ref }),
      )
    } catch {
      /* private mode / quota — fine to skip */
    }
  }, [demo, screen, me, email, altHandles, pings, joinedSlugs, schoolCred, publicStar, ref, established])

  // ── verification (Instagram DM — the /demo variant auto-verifies) ──
  const openVerify = useCallback((handle, onDone) => {
    setVerify({ handle: normHandle(handle), onDone })
  }, [])
  const closeVerify = useCallback(() => setVerify(null), [])
  const onVerified = useCallback(
    (proof, adoptedHandle) => {
      if (!verify) return
      // Migration 0012: identity is the Meta-authenticated account that DM'd, not
      // the typed hint. Adopt that @ (falling back to the typed one for the demo
      // stub, which returns no adopted handle).
      const handle = normHandle(adoptedHandle) || verify.handle
      const s = demo
        ? { verified: true, provider: 'instagram_dm', handle, proof, email: '', name: '' }
        : markVerified(handle, proof)
      setSession(s)
      // Reconcile `me` to the adopted @ so `verified` (which compares
      // session.handle to me) holds and the ping's "from" is the real account.
      if (handle && normHandle(me) !== handle) setMe(handle)
      // Fix B: bind handle⇄email for DM-free recovery, but ONLY under this fresh
      // proof and only when an email exists to recover to. Best-effort, off the
      // critical path.
      const recoveryEmail = email && email.trim()
      if (!demo && proof && recoveryEmail) {
        bindRecovery({ handle, proof, email: recoveryEmail }).catch(() => {})
      }
      // If they arrived through a recruit's tracking link, this is the moment
      // that counts: a verified handle, credited once to the code that sent
      // them. Best-effort and off the critical path.
      if (!demo && handle && ref) {
        attributeSignup(handle).catch(() => {})
        setRef('')
      }
      const done = verify.onDone
      setVerify(null)
      if (done) done(proof, handle)
    },
    [verify, demo, me, email, ref],
  )

  // Resume a verification interrupted by the Instagram hand-off (mobile can
  // reload this tab; the saved code keeps polling instead of stranding them).
  useEffect(() => {
    if (demo || route.signin || session?.verified || !igVerifyEnabled()) return
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

  // ── the gap, and why it is now a visible thing ──────────────────────────────
  // A device that has never restored holds no ping rows, and the server still
  // answers the meter honestly: two of two held. So the ledger said "your slots
  // are full" over an empty list, and placing a ping failed with `no_slots` for
  // a reason nothing on screen could account for. That is the product calling
  // its own user a liar.
  //
  // Two things fix it, and both are needed. Below, `restoreLedger` runs on any
  // proven session rather than only at the moment somebody presses "log in", so
  // the list normally arrives on its own. And here, whatever is left over after
  // that — a restore that has not landed yet, or the pre-0010 rows whose targets
  // exist only as hashes and genuinely cannot be named — is counted, so the
  // ledger can DRAW those slots as held-elsewhere rather than leave the meter
  // asserting something the list does not show.
  const unaccounted = Math.max(0, slotsStanding - standingCount(pings))
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
              // A match that happened while this device was closed arrives
              // HERE, with their card on it. It lands sealed: `revealed` stays
              // false until the person opens it themselves on the status page.
              const theirs = r.their_card ? fromWire(r.their_card, { handle: normHandle(p.handle || '') }) : null
              return {
                ...p,
                expires_at: r.expires_at || p.expires_at,
                mutual: !!r.mutual || p.mutual,
                reachable: r.reachable != null ? !!r.reachable : p.reachable,
                // the server's copy of your own poster, for a device that has
                // the ping but not the card (a restore, a cleared browser)
                card: p.card || (r.card ? fromWire(r.card, { handle: normHandle(p.handle || ''), placed: r.time }) : null),
                theirCard: p.theirCard || theirs,
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
      // The flight reports its own arrival. This used to be a bare 3.6s timer
      // racing an animation neither side could see the other's clock for — so
      // the result screen could arrive over a camera still travelling, or leave
      // it sitting on a landed star with nothing to read. The sky knows when it
      // has landed; ask it.
      const done = () => {
        if (sendoffTimer.current) {
          clearTimeout(sendoffTimer.current)
          sendoffTimer.current = null
        }
        setGalaxyMode('idle')
        go(afterScreen)
      }
      const f = ambientGalaxyRef.current
      if (f) f.onSendoffDone = done
      setGalaxyMode('sendoff')
      setMorph({ handle, geom })
      go('sendoff')
      // the DOM morph is a one-shot ~1.25s gesture; drop it once it's played so
      // the galaxy star (now flying from the same point) is all that remains.
      if (morphTimer.current) clearTimeout(morphTimer.current)
      morphTimer.current = setTimeout(() => {
        setMorph(null)
        morphTimer.current = null
      }, 1400)
      // The deadline, not the schedule. A backgrounded tab stops rendering and
      // a lost GPU context stops it for good, and either one would otherwise
      // strand someone on a placement that never resolves.
      //
      // The margin is wide because the engine clamps dt at 50 ms for stability,
      // so a sky drawing below twenty frames a second plays its own animation
      // slower than wall time — and cutting a phone's flight short is a far
      // worse failure than making a genuinely broken one wait an extra second.
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
      sendoffTimer.current = setTimeout(() => {
        sendoffTimer.current = null
        if (f) f.onSendoffDone = null
        setGalaxyMode('idle')
        go(afterScreen)
      }, SENDOFF_SECONDS * 1000 + 3000)
    },
    [go],
  )

  // ── the star view (the status page's "see it in the sky") ──
  // Tapping one of your pings flies the backdrop camera to that ping's own star
  // and STAYS there. The foreground melts away, and what is waiting at the end
  // of the flight is the CARD: the star stops being a point of light and
  // becomes the surface it was made of all along (card/Resolve.jsx). The disc
  // grows out of the point at the rate the camera actually resolves it, so
  // there is no transition to write and nothing to time.
  //
  // Works over both skies: the community galaxy's held dive, or the ambient
  // field's held focus when no community is joined. Only the ambient field
  // publishes where each sealed star is on screen, so only there can the disc
  // grow out of the exact point; over a community sky it opens where the layout
  // says, which is where it was travelling anyway.
  const [skyView, setSkyView] = useState(null) // { handle, index, arrived } while held
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
      let ok = false
      let index = null
      // The card is READ off the camera every frame, so nothing here has to
      // guess how long the flight takes. `onArrive` is only the moment the
      // close button is allowed to appear.
      const onArrive = () => setSkyView((v) => (v && v.handle === h ? { ...v, arrived: true } : v))
      if (homeCommunity && homeGalaxyRef.current) {
        ok = !!homeGalaxyRef.current.locateMine(h, { hold: true, onArrive })
      } else if (ambientGalaxyRef.current) {
        const i = pings.findIndex((p) => normHandle(p.handle || '') === h)
        if (i >= 0) {
          ambientGalaxyRef.current.focusStar(i, { hold: true, onArrive })
          if (ambientGalaxyRef.current.setNavEnabled) ambientGalaxyRef.current.setNavEnabled(true)
          index = i
          ok = true
        }
      }
      if (!ok) return
      setSkyView({ handle: h, index, arrived: false })
    },
    [homeCommunity, pings, skyView],
  )

  // What the held star turns out to be. A ping placed before the card existed
  // (or restored onto a device that never held its photograph) still resolves
  // into a body: the plate, the limb, the @ and the date. A star with nothing
  // written on it is still a star, which is the same reason the photograph is
  // allowed to be optional.
  const skyCard = useMemo(() => {
    if (!skyView) return null
    const row = pings.find((p) => normHandle(p.handle || '') === skyView.handle)
    if (!row) return null
    return row.card
      ? { ...row.card, handle: skyView.handle, photoId: row.photoId || null }
      : makeCard({ handle: skyView.handle, words: '', placed: row.time })
  }, [skyView, pings])

  // ── the public @ (announce yourself in your community's sky) ──
  // Turning it ON goes through the warning sheet; turning it OFF is one tap.
  const askPublicStar = useCallback(() => setPublicAsk(true), [])
  const confirmPublicStar = useCallback(() => {
    setPublicStar(true)
    setPublicAsk(false)
  }, [])
  const retractPublicStar = useCallback(() => setPublicStar(false), [])

  // ── the flow ──
  // The composed card, on its way from the composer to the server. A ref and
  // not state: the identity gate can sit between those two moments for as long
  // as a DM takes to arrive, and nothing about a re-render in the middle of
  // that should be able to drop what somebody wrote.
  const draftCard = useRef(null)

  const findOut = useCallback(() => {
    setLoginMode(false)
    setError('')
    // crush @ first: a new person names who they're thinking about before naming
    // themselves. identity — and, for a new user, the affiliated-schools step —
    // comes after, on the way to placing.
    go('who')
  }, [go])

  // The @ is confirmed; now the card. Nothing has been committed to the handle
  // yet and nothing is until the poster is written, which is deliberate: the
  // words are the ping, and asking for them last would make them feel optional.
  const compose = useCallback(() => {
    setError('')
    if (!isValidHandle(them)) {
      setError(t('who.errInvalid'))
      return
    }
    if (normHandle(me) && normHandle(me) === normHandle(them)) {
      setError(t('who.errSelf'))
      return
    }
    go('compose')
  }, [them, me, go, t])

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
    async (proofOverride, meOverride) => {
      const proof = proofOverride ?? (session?.provider === 'instagram_dm' ? session.proof : undefined)
      // `meOverride` carries the just-adopted @ from a fresh verification, which
      // may differ from the typed `me` (migration 0012) and is what the proof is
      // bound to — so the ping's "from" must be it, not the stale typed value.
      const from = normHandle(meOverride) || normHandle(me)
      const target = normHandle(them)
      // The card the composer handed over on its way here. It is held in a ref
      // rather than in state because the identity gate can sit between the
      // composer and this call for as long as a DM takes to arrive, and a
      // re-render in the middle of that must not be able to lose the poster.
      const draft = draftCard.current
      const card = draft ? makeCard({ ...draft, handle: target }) : null
      // The sandbox subscription stands its pings six months instead of sixty
      // days (SUB_PING_DAYS) — production duration stays server-set.
      const days = demo && demoSubscribed ? SUB_PING_DAYS : undefined
      try {
        const res = await placePing({ me: from, them: target, email, proof, card: toWire(card), demo, days })
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
        // The photograph, if there is one: onto this device, under the key its
        // ping row points at, and nowhere else. Written before the row so the
        // disc never renders against a blob that has not landed yet.
        const photoId = draft && draft.blob ? photoKey(target) : null
        if (photoId) await photos.putPhoto(photoId, draft.blob)
        if (card) card.photoId = photoId
        // Their half, and it can only exist if the pair is already mutual.
        const theirCard = res?.mutual && res.match_card ? fromWire(res.match_card, { handle: target }) : null

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
              card,
              photoId,
              theirCard,
              // sealed. The spread is opened by hand, from the status page.
              revealed: false,
            },
          ]
        })
        draftCard.current = null
        if (res?.mutual) {
          // The announcement, and only that: two seconds, no buttons, then the
          // status page with a sealed mutual slot on it. What is IN the two
          // cards is not shown on the way past — it is opened deliberately or
          // it is not opened at all.
          setMatch({ them: target })
          go('mutual')
          return
        }
        // If you're in a community, this ping also lands in its sky: your own star
        // launches into the app-wide backdrop galaxy (marked as yours, carrying
        // its @ so it stays findable in the crowd), and — in the sandbox — the
        // community's live ping count ticks. The ping itself already reached its
        // person above, community or not: the sky is a lens, never a boundary.
        if (homeCommunity && homeGalaxyRef.current) {
          homeGalaxyRef.current.launch(1, { mine: true, label: target, kind: card ? tintOf(C, card.tone) : '' })
        }
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
    [me, them, email, demo, demoSubscribed, session, go, t, runSendoff, homeCommunity, C],
  )

  // ── communities (curated: join / leave, view, and the sandbox live feed) ──
  // A live membership mirror, so join/leave can read the current set without
  // depending on it (and re-creating the callback every join).
  const joinedRef = useRef(joinedSlugs)
  useEffect(() => {
    joinedRef.current = joinedSlugs
  }, [joinedSlugs])

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

  // Place — from the composer. `card` is what it composed:
  // { words, bg, face, pos, tone, blob } — the blob being the treated
  // photograph, which is put on this device and never sent anywhere.
  // Runs the identity gate first when needed.
  const place = useCallback(async (card) => {
    setError('')
    if (card) draftCard.current = card
    if (!isValidHandle(them)) {
      setError(t('who.errInvalid'))
      go('who')
      return
    }
    if (normHandle(me) && normHandle(me) === normHandle(them)) {
      setError(t('who.errSelf'))
      go('who')
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
      openVerify(me, (proof, handle) => placeCommit(proof, handle))
      return
    }
    if (!verified && !demo) setSession(signInStub())
    await placeCommit()
  }, [me, them, pings, demo, verified, go, t, placeCommit, openVerify])

  // From the identity step: prove the @, then resume whatever was waiting.
  //
  // This used to detour a first-time user through a whole "affiliated schools"
  // screen before their first ping ever landed — three forms deep before the
  // thing they came to do happened. Joining a community is not a prerequisite
  // for placing a ping (MASTER-GUIDE §2.6 is explicit about that), and the
  // placed screen already asks for it at the moment it starts to matter. So the
  // step is gone from this path: prove the @, place the ping.
  const continueFromYou = useCallback(() => {
    if (!isValidHandle(me)) return
    const resume = (proof, handle) => {
      pendingAction.current = null
      // no target yet (signed up without naming anyone) — go name one.
      if (!normHandle(them)) {
        go('who')
        return
      }
      // named, but nothing written yet: this is someone who signed up from the
      // send flow before the composer. Their ping is one screen away, not
      // placed behind their back.
      if (!draftCard.current) {
        go('compose')
        return
      }
      placeCommit(proof, handle)
    }
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, resume)
      return
    }
    if (!verified && !demo) setSession(signInStub())
    resume()
  }, [me, them, demo, verified, openVerify, placeCommit, go])

  // ── sign back in (cross-device) ──
  const startLogin = useCallback(() => {
    setError('')
    setIdentity({ phase: 'idle', route: '', to: '' })
    setLoginMode(true)
    go('you')
  }, [go])

  // Re-send the link that the router already sent once.
  const requestSignIn = useCallback(async () => {
    if (!isValidHandle(me)) return
    setError('')
    try {
      await requestSignInLink(me)
    } catch {
      /* the confirmation on screen stands regardless */
    }
  }, [me])

  // ── the ledger, restored ────────────────────────────────────────────────────
  // The one merge, used by every path that can bring pings back: the explicit
  // "log in", the magic link, and the quiet restore that runs on any proven
  // session below. It used to exist only inside the login flow, which is the
  // whole reason a second device could sit there holding two slots and showing
  // none of them: nothing but pressing "log in" ever asked the server what this
  // @ was holding.
  //
  // `ledger` is what the server said, already normalised by api/celestual.js.
  const mergeLedger = useCallback((server) => {
    setPings((local) => {
      // Local plaintext wins. The server adds (a) mutual rows this device
      // hasn't seen, (b) named standing rows it has not seen either, and (c)
      // anonymous standing rows — pings placed before migration 0010, whose
      // targets exist only as salted hashes and genuinely cannot be named on
      // any device but the one that typed them. Any local unmatched named row
      // already accounts for one server anonymous row, so only the surplus
      // becomes an anonymous row here.
      const localNamed = local.filter((p) => p.handle)
      const names = new Set(localNamed.map((p) => normHandle(p.handle)))
      // A restored row rebuilds its cards through the same clamps the composer
      // writes under, and comes back SEALED: a match this device has never seen
      // is still a match nobody has opened.
      const restore = (srv) => {
        const h = normHandle(srv.handle || '')
        return {
          ...srv,
          card: srv.card ? fromWire(srv.card, { handle: h, placed: srv.time }) : null,
          // the photograph stayed on the phone that took it, so this card
          // stands on its own ground — the same thing that happens when
          // somebody chooses not to add one
          photoId: null,
          theirCard: srv.theirCard ? fromWire(srv.theirCard, { handle: h }) : null,
          revealed: false,
        }
      }
      const merged = [...localNamed]
      for (const srv of server) {
        if (srv.handle && !names.has(normHandle(srv.handle))) merged.push({ ...restore(srv), reachable: true })
      }
      const serverAnon = server.filter((srv) => !srv.handle)
      const localUnmatched = localNamed.filter((p) => !p.mutual).length
      for (let i = 0; i < Math.max(0, serverAnon.length - localUnmatched); i++) {
        merged.push({ ...restore(serverAnon[i]), reachable: false })
      }
      return merged
    })
  }, [])

  // Ask the server what this @ is holding, and fold it in. Returns whether the
  // read actually landed, so the ledger can tell "nothing to restore" apart from
  // "we never got an answer" — the two look identical on screen and mean
  // opposite things.
  const [ledgerState, setLedgerState] = useState({ phase: 'idle' }) // idle | reading | read | failed
  const readLedger = useCallback(
    async (proofOverride, meOverride) => {
      const proof = proofOverride ?? (session?.provider === 'instagram_dm' ? session.proof : undefined)
      const handle = normHandle(meOverride) || normHandle(me)
      if (demo || !handle || !proof) return false
      setLedgerState({ phase: 'reading' })
      try {
        const server = await fetchMyPings({ handle, proof, demo })
        if (server.length) mergeLedger(server)
        setLedgerState({ phase: 'read' })
        return true
      } catch {
        setLedgerState({ phase: 'failed' })
        return false
      }
    },
    [me, demo, session, mergeLedger],
  )

  // ── the quiet restore ───────────────────────────────────────────────────────
  // Any device with a proven session reads the ledger on its own, without
  // anybody pressing anything. This is the actual fix for "my slots say two of
  // two and my list is empty": the meter was reading the server and the list was
  // reading the device, and only one of the two was ever asked.
  //
  // Keyed on the proven handle, so re-verifying as somebody else reads theirs.
  const ledgerRead = useRef('')
  useEffect(() => {
    if (demo) return
    const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
    const handle = normHandle(session?.handle) || normHandle(me)
    if (!proof || !handle || ledgerRead.current === handle) return
    ledgerRead.current = handle
    readLedger(proof, handle).catch(() => {})
  }, [demo, session, me, readLedger])

  // ── and it keeps trying ─────────────────────────────────────────────────────
  // One read at mount is not enough to promise "every ping shows up, whichever
  // phone placed it". The read can land before the session's proof does, it can
  // lose a race with a flaky connection, and the server's own count can arrive
  // after it. Any of those left a slot the meter counted and the list could not
  // name — and the product's answer used to be a card blaming a device and a
  // button asking the person to fix it by hand.
  //
  // So the gap is the trigger. While anything is unaccounted for, this re-reads
  // on its own: quickly at first, then further apart, and never more than a few
  // times, because past that the rows are genuinely pre-0010 (their target
  // exists only as a salted hash) and no number of retries can name them.
  const ledgerTries = useRef(0)
  useEffect(() => {
    if (demo) return undefined
    const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
    const handle = normHandle(session?.handle) || normHandle(me)
    if (!proof || !handle || unaccounted <= 0) {
      ledgerTries.current = 0
      return undefined
    }
    if (ledgerState.phase === 'reading' || ledgerTries.current >= 4) return undefined
    const n = ledgerTries.current++
    const id = setTimeout(() => readLedger(proof, handle).catch(() => {}), 900 * Math.pow(2, n))
    return () => clearTimeout(id)
  }, [demo, session, me, unaccounted, ledgerState.phase, readLedger])

  // The explicit door: read the ledger, then land on it. What "log in" does.
  const restorePings = useCallback(
    async (proofOverride, meOverride) => {
      await readLedger(proofOverride, meOverride)
      setLoginMode(false)
      go('pings')
    },
    [readLedger, go],
  )

  // The ledger's own "try that again", for the rows the meter counts and the
  // list cannot name yet.
  const restoreLedger = useCallback(() => readLedger(), [readLedger])

  const login = useCallback(() => {
    if (!isValidHandle(me)) return
    if (!verified && (demo || igVerifyEnabled())) {
      openVerify(me, (proof, handle) => restorePings(proof, handle))
      return
    }
    if (!verified && !demo) setSession(signInStub())
    restorePings()
  }, [me, demo, verified, openVerify, restorePings])

  // ── the identity router ──
  // One button on the identity screen calls this; the server answers which way
  // this @ gets in and we simply do it. The person is never asked to pick a
  // mechanism, and no sentence about their account is ever written in the
  // conditional.
  //
  // The two flows want different things from the same answer, and that is on
  // purpose:
  //   · SIGNING BACK IN — the email link is the good door: it crosses devices,
  //     and it is exactly what the bound address is for.
  //   · MID-PING (they've already named someone) — the DM is the good door: it
  //     completes in this tab, so the ping they are holding survives. Mailing a
  //     link here would strand it in another session.
  // Either way an @ we have never seen unfolds the signup panel instead.
  const resetIdentity = useCallback(() => {
    setIdentity((s) => (s.phase === 'idle' ? s : { phase: 'idle', route: '', to: '' }))
  }, [])

  const resolveIdentity = useCallback(async () => {
    if (!isValidHandle(me)) return
    setError('')
    const wantsEmail = loginMode && !verified
    // Nothing to ask when there's no backend (the sandbox, local dev): a device
    // that already holds pings is returning, anyone else is new.
    if (demo || !recoveryEnabled) {
      const route = established ? 'dm' : 'signup'
      setIdentity({ phase: 'resolved', route, to: '', fresh: loginMode && route === 'signup' })
      if (route === 'signup') setLoginMode(false)
      if (route === 'dm') (loginMode ? login : continueFromYou)()
      return
    }
    setIdentity({ phase: 'checking', route: '', to: '' })
    const r = await beginSignIn(me)
    if (r.route === 'signup') {
      // A new @ signs up here, whichever button they arrived through. `fresh`
      // remembers that they came in through "log in", so the screen can say the
      // one thing worth saying: we've never seen this @. Someone who arrived
      // through the send flow already knows they're new; the panel unfolding is
      // the whole message there.
      setIdentity({ phase: 'resolved', route: 'signup', to: '', fresh: loginMode })
      setLoginMode(false)
      return
    }
    if (r.route === 'email' && wantsEmail) {
      setIdentity({ phase: 'resolved', route: 'email', to: r.to || '' })
      requestSignInLink(me).catch(() => {})
      return
    }
    setIdentity({ phase: 'resolved', route: 'dm', to: '' })
    ;(loginMode ? login : continueFromYou)()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, demo, loginMode, verified, established, login, continueFromYou])

  // Redeem a magic-link token (the SignInScreen calls this on mount): mint a fresh
  // proof, adopt the recovered handle, and restore the pings — no DM. Defined
  // after restorePings so it can depend on it.
  const redeemSignIn = useCallback(
    async (token) => {
      const res = await redeemSignInLink(token)
      if (!res.ok) return { ok: false }
      const handle = normHandle(res.handle)
      setSession(markVerified(handle, res.proof))
      setMe(handle)
      setLoginMode(false)
      await restorePings(res.proof, handle)
      return { ok: true, handle }
    },
    [restorePings],
  )

  // ── the status page's actions ──
  // ── renewing ────────────────────────────────────────────────────────────────
  // One tap puts sixty more days on the clock, counted from NOW rather than
  // added to what is left. It is free, it is unlimited, and it does not spend a
  // slot or a ping: it is the same row, standing longer. That last part is what
  // was unclear, and the layout is why — the button sat between a slot meter and
  // a paywall, so it read as something that might cost one of the two.
  //
  // It hands the new lapse date back so the row can PRINT it. "Renewed" on its
  // own is a state; "stands until 14 oct" is an answer.
  const renew = useCallback(
    async (handle) => {
      const h = normHandle(handle)
      const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
      try {
        const res = await renewPing({ me, them: h, proof, demo })
        if (res?.ok) {
          setPings((prev) => prev.map((p) => (normHandle(p.handle || '') === h ? { ...p, expires_at: res.expires_at } : p)))
          return res.expires_at || null
        }
      } catch (e) {
        console.error(e)
      }
      return null
    },
    [me, demo, session],
  )

  const letGo = useCallback(
    async (handle) => {
      const h = normHandle(handle)
      setPings((prev) => prev.filter((p) => normHandle(p.handle || '') !== h))
      // the card goes with the ping, and so does its photograph. A blob left
      // behind after the row that pointed at it is gone is a picture of
      // somebody's night sitting in a browser store, unreachable and undeletable.
      photos.dropPhoto(photoKey(h)).catch(() => {})
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
    setError('')
    draftCard.current = null
    if (standingCount(pings) >= slotCap) {
      go('fourth')
      return
    }
    go('who')
  }, [pings, slotCap, go])

  // ── the reveal (the mutual slot, opened) ──
  // A match arrives sealed and stays sealed until it is opened, which is the
  // whole difference between being told and looking. Opening it hands the sky
  // its 'match' mode — the two stars fall into a shared orbit, the merger
  // flashes, the binary settles — and both cards unseal off that same clock
  // (card/Spread.jsx), together, because neither person moved second.
  const [reveal, setReveal] = useState(null) // { handle } while the spread is up
  const openReveal = useCallback(
    (handle) => {
      const h = normHandle(handle)
      const row = pings.find((p) => normHandle(p.handle || '') === h)
      if (!row || !row.mutual) return
      setReveal({ handle: h })
      setGalaxyMode('match')
      go('reveal')
    },
    [pings, go],
  )

  // Leaving marks it seen. From here on the slot holds the two cards, open, and
  // there is no second unsealing: it happened once.
  const closeReveal = useCallback(() => {
    const h = reveal && reveal.handle
    if (h) setPings((prev) => prev.map((p) => (normHandle(p.handle || '') === h ? { ...p, revealed: true } : p)))
    setGalaxyMode('idle')
    setReveal(null)
    go('pings')
  }, [reveal, go])

  // The status page's mutual flash is a two-second announcement with nothing to
  // press; this is what it lands on when it fades.
  const afterMutual = useCallback(() => {
    setMatch(null)
    go('pings')
  }, [go])

  // ── sandbox: visualize a match ──
  // Flips a sample ping to mutual, gives it the other half, and plays the real
  // workflow from the announcement onward.
  const simulateMutual = useCallback(
    (handle) => {
      if (!demo) return
      const h = normHandle(handle)
      setPings((prev) =>
        prev.map((p) =>
          normHandle(p.handle || '') === h
            ? { ...p, mutual: true, revealed: false, theirCard: p.theirCard || fromWire(DEMO_CARD, { handle: h }) }
            : p,
        ),
      )
      setMatch({ them: h })
      go('mutual')
    },
    [demo, go],
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

  // ── the production paid door (docs/PRICING-REVENUE.md §3 · docs/STRIPE-SETUP.md) ──
  // Dormant unless VITE_STRIPE_ENABLED=1, and never in the sandbox (which
  // previews the shape locally and must not reach a payment processor). What
  // `hold` does is small on purpose: ask the edge function for a Stripe-hosted
  // URL and follow it. No card is read here, no entitlement is written here, and
  // this browser is never the thing that decides a slot was paid for. That is
  // the webhook's job alone (migration 0021).
  const billingOn = useMemo(() => billingEnabled() && !demo, [demo])
  const planOn = useMemo(() => planOffered() && !demo, [demo])
  const [holdState, setHoldState] = useState({ phase: 'idle', error: '' })
  const hold = useCallback(
    async (kind) => {
      if (demo || !billingOn) return
      setHoldState({ phase: 'opening', error: '' })
      const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
      try {
        const res = await startCheckout({ handle: me, proof, kind, demo })
        if (res?.ok && res.url) {
          window.location.assign(res.url)
          return
        }
        setHoldState({ phase: 'error', error: res?.error || 'network' })
      } catch (e) {
        console.error(e)
        setHoldState({ phase: 'error', error: 'network' })
      }
    },
    [demo, billingOn, me, session],
  )

  // What Stripe sent us home with, read once (the id is dropped from the address
  // bar as soon as it's been confirmed).
  const paidReturn = useMemo(
    () => (route.paid ? returnFromCheckout() : { session: '', cancelled: false }),
    [route.paid],
  )

  // The /paid screen's one call. The webhook is the source of truth; this just
  // asks the same question from the returning tab so the meter is right
  // immediately. Idempotent server-side, so both arriving is fine.
  const confirmPaid = useCallback(
    async (sessionId) => {
      const res = await confirmCheckout(sessionId)
      scrubReturnUrl()
      if (res?.ok && res.paid) {
        const proof = session?.provider === 'instagram_dm' ? session.proof : undefined
        try {
          const s = await fetchSlots(me, { proof, demo })
          if (s) setSlots(s)
        } catch {
          /* the meter refreshes on its own on the next mount */
        }
      }
      return res
    },
    [me, demo, session],
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
    setError('')
    draftCard.current = null
    // the photographs are part of the device, so leaving the device takes them
    photos.wipePhotos().catch(() => {})
    setPings([])
    setJoinedSlugs([])
    setSchoolCred(null)
    setPublicStar(false)
    // a pending recruit attribution belongs to the person who arrived, so it
    // goes with them on a sign-out or a delete
    clearRef()
    setRef('')
    setMatch(null)
    setReveal(null)
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

  // Delete everything: erase every ping you placed and every record of you,
  // plus a local wipe. It does NOT block your handle any more (migration 0020).
  //
  // It used to call suppressHandle(me) — the public opt-out — on your own @.
  // That meant tidying up your account quietly barred the handle from ever
  // verifying again, permanently, with nothing in the product able to say so or
  // undo it. "Delete everything" is housekeeping; "never let anyone enter me"
  // is a different decision, lives on /privacy, and is chosen deliberately.
  const deleteEverything = useCallback(async () => {
    persistReady.current = false
    try {
      if (!demo && normHandle(me)) await eraseAccount(me)
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
    pings, slotsStanding, slotsCap: slotCap, unaccounted, ledgerState, restoreLedger, nextSlot,
    cardUrls, compose, openReveal, closeReveal, reveal, afterMutual, ambientGalaxyRef,
    communities, openCommunity, homeCommunity, homeGalaxyRef,
    viewCommunity, joinCommunity, leaveCommunity, bumpCommunityActivity,
    locatePing, skyFlight,
    publicStar, askPublicStar, retractPublicStar,
    lastPlaced, match,
    demoSubscribed, buySlot, placeBoughtSlot, extendHandle, startExtend, finishExtend,
    billingOn, planOn, holdState, hold, paidReturn, confirmPaid,
    // the first light notice, handed to the landing so it can set it in flow.
    // It used to be pinned to a viewport corner, which is where it collided
    // with whatever the page had at that corner — the login chip on one screen,
    // the colophon on another. A notice belongs on the page it is about.
    trial: !demo ? { line: TRIAL_BANNER, deadline: TRIAL_DEADLINE } : null,
    posterHandle: route.poster || '',
    copyCode: route.copyCode || '',
    signinToken: route.signinToken || '',
    verifyEnabled: igVerifyEnabled() || demo,
    recoveryEnabled,
    identity, resolveIdentity, resetIdentity,
    setMe, setEmail, setThem,
    altHandles, addAltHandle, removeAltHandle,
    go, findOut, startFromDoor, place, continueFromYou, placeAnother,
    startLogin, login, requestSignIn, redeemSignIn,
    renew, letGo, simulateMutual, openConversation, suppressHandle: suppress,
    openAccount, closeAccount, signOut, deleteEverything,
    setNavHidden,
  }

  const Screen = SCREENS[screen] || SCREENS.landing

  // The profile chip and its logged-out twin are gone. Both were fixed to the
  // top-left corner, both were the only thing on their screen aligned to
  // nothing, and between them they said "your account" on two screens and "log
  // in" on two others. The index carries both, on every screen, as entries.

  // Calm the living galaxy on the content screens so the foreground reads easily;
  // the sealed "your star" stays lit through it (it isn't scaled by dim), so a
  // soft glow keeps resting in the background behind the pings list. Landing keeps
  // the field bright; the send-off / match modes set their own dimming.
  const CALM_SCREENS = ['pings', 'who', 'compose', 'you', 'placed', 'door', 'privacy', 'fourth', 'worlds', 'community', 'open', 'trial', 'admin', 'paid']
  const galaxyDim = CALM_SCREENS.includes(screen) ? 0.5 : 1

  // The reveal happens IN the field: the sky plays the inspiral, the merger and
  // the binary that settles out of it, and the two cards unseal off that same
  // clock. So it takes the ambient galaxy even for someone whose backdrop is
  // normally their community's, because the community sky has no match to play.
  const inReveal = screen === 'reveal'

  // The backdrop: once you've joined a community, the app-wide field IS your
  // community's living galaxy (the merge) — your pings land in it and your own
  // star stays findable in it. Otherwise it's the ambient procedural sky, which
  // still owns the send-off drift. On the community page your sky is the hero
  // (full bright); elsewhere it's calmed so the foreground reads.
  const homeOpen = homeCommunity ? communityOpen(homeCommunity) : false
  const homePings = homeCommunity && homeCommunity.pings != null ? Number(homeCommunity.pings) : 0
  const communityDim = skyFlight ? 1 : screen === 'community' ? 1 : CALM_SCREENS.includes(screen) ? 0.4 : 0.72

  // ── the index (the one navigation) ──
  // This used to be four things. A fixed dock of two stations at the foot of
  // the two hub screens; a profile chip pinned to the top-left corner on some
  // screens; a "log in" chip in the same corner on others; and a set of ghost
  // links at the bottom of whichever page happened to need one. None of them
  // was aligned to anything else, they disagreed about where "back" lives, and
  // between them they still could not reach half the product.
  //
  // It is one bar now, across the head of every page, and behind it a COLUMN
  // the page makes room for. The index lists every destination the product has,
  // including the account — and it says what is on each page as well as where
  // it is, which is what an index in a book does.
  //
  // Two screens deliberately carry no chrome at all: the send-off (the ping is
  // in flight and there is nowhere to be but here) and the match announcement
  // (two seconds, nothing to press). The desk and the trial page are their own
  // documents and opt out too.
  const BARE_CHROME = ['sendoff', 'mutual', 'reveal', 'trial', 'admin']
  const chromeHere = !BARE_CHROME.includes(screen)
  const navMelt = skyFlight || navHidden || galaxyMode === 'sendoff' || !!morph

  // What the index lists, and it is four things. A product with four places
  // does not need them numbered, captioned, headed or signed off: the entry IS
  // the destination, and everything that used to sit around it was the index
  // describing itself.
  //
  // "place a ping" is not in here on purpose — it is the one primary action on
  // the ledger and on the landing, and a navigation that repeats the page's own
  // button is a navigation padding itself out.
  const indexItems = useMemo(
    () => [
      { key: 'pings', name: t('index.pings') },
      {
        key: 'community',
        name: t('index.community'),
        go: () => viewCommunity(homeCommunity ? homeCommunity.slug : openCommunity),
      },
      // The account is an entry like any other, and it is the only one that
      // opens a sheet rather than a page. Logged out, the same line is the way
      // back in, which is the thing somebody in that state is actually looking
      // for.
      established
        ? { key: 'account', name: t('index.account'), go: () => openAccount() }
        : { key: 'signin', name: t('index.login'), go: () => startLogin() },
      { key: 'privacy', name: t('index.legal') },
    ],
    [t, established, homeCommunity, openCommunity, viewCommunity, openAccount, startLogin],
  )

  const goIndex = useCallback(
    (item) => {
      setIndexOpen(false)
      if (item.go) item.go()
      else go(item.key)
    },
    [go],
  )

  // The index is a column rather than a dialog — it does not trap focus and it
  // does not scrim the page — but it is still a thing that is open, and escape
  // is what closes an open thing.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!indexOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setIndexOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [indexOpen])

  // ── /admin renders ALONE, above everything ──
  // The desk is a full-viewport white console with its own design; it is not one
  // of the app's screens and must not sit inside the screen wrapper. That
  // wrapper carries `.fade`, whose keyframes animate `transform` — and a
  // transformed ancestor becomes the containing block for `position: fixed`
  // descendants, so the desk's own fixed overlay was being laid out against a
  // mid-page box instead of the viewport. Returning it here skips the wrapper,
  // the galaxy, the dock and the chrome in one move, which is what it wants
  // anyway. (Every hook above has already run, so this early return is safe.)
  if (screen === 'admin') return <AdminScreen />

  // ── the page that gets no sky ──
  // /trial is a long read someone makes a week-long decision from. A galaxy
  // drifting behind it is motion competing with text that has to be understood,
  // and it is the one page people arrive at from a link, on data, on a phone.
  // Skipping the canvas outright (rather than dimming it) also means the page
  // stops paying for a full-screen animation loop it never uses.
  const BARE = screen === 'trial'

  return (
    <div className="celestual-app">
      {BARE ? (
        // A still field, not a dead one: one soft rise of colour off the
        // bottom-left so the page still feels like it belongs to us.
        <div
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 0, background: C.ink,
            backgroundImage: `radial-gradient(120% 80% at 12% 100%, ${rgba(C.star, 0.1)} 0%, transparent 58%), radial-gradient(90% 60% at 88% 0%, ${rgba(C.them, 0.07)} 0%, transparent 55%)`,
          }}
        />
      ) : homeCommunity && !inReveal ? (
        <CommunityGalaxyCanvas
          key={homeCommunity.slug}
          you={C.you}
          them={C.them}
          pings={homePings}
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
          dim={skyFlight || inReveal ? 1 : galaxyDim}
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

      {/* ── the masthead and the index ──────────────────────────────────────
          One bar, every page. The wordmark signs the page; the index opens the
          column. Both melt away whenever the sky takes the whole frame. */}
      {chromeHere && (
        <>
          <Masthead
            C={C}
            open={indexOpen}
            onToggle={() => setIndexOpen((v) => !v)}
            hidden={navMelt}
          />
          <IndexColumn
            C={C}
            open={indexOpen && !navMelt}
            items={indexItems}
            screen={screen}
            go={goIndex}
            narrow={narrow}
          />
        </>
      )}

      {/* During a fly-to-a-star the foreground melts away COMPLETELY, so the sky
          is the whole screen — any residual opacity reads as a ghost of the
          ledger floating over the star view. The entrance animation must be
          suppressed for the melt: its fill-mode would otherwise pin opacity at
          1 and override the inline fade.

          The page also makes ROOM for the index rather than sitting under it.
          On a wide screen that is a strip of padding the centred column
          re-solves itself inside; on a phone there is no width to give away, so
          the page steps aside instead. The transform is only ever SET when it
          is non-zero — a transformed ancestor becomes the containing block for
          every fixed child under it, and the held star view is fixed. */}
      <div
        onPointerDownCapture={() => indexOpen && setIndexOpen(false)}
        style={{
          position: 'relative',
          zIndex: 4,
          paddingRight: indexOpen && !narrow && !skyFlight ? INDEX_W : 0,
          transform: indexOpen && narrow && !skyFlight ? 'translateX(-24%)' : undefined,
          opacity: skyFlight || (indexOpen && narrow) ? 0 : 1,
          pointerEvents: skyFlight || (indexOpen && narrow) ? 'none' : 'auto',
          transition:
            'opacity .55s ease, padding-right .46s cubic-bezier(.16,.84,.28,1), transform .46s cubic-bezier(.16,.84,.28,1)',
        }}
      >
        <div key={screen} className="fade" data-screen={screen} style={{ animation: skyFlight ? 'none' : undefined }}>
          <Screen C={C} ctx={ctx} />
        </div>
      </div>

      {/* the held star view: the star resolves into the card it was made of.
          The @ and the date are set INSIDE the poster, so what arrives at the
          end of the dive is one object rather than an object with a caption,
          and the hand stays free to orbit it. */}
      {skyView && (
        <CardResolve
          C={C}
          card={skyCard}
          url={skyCard && cardUrls[skyCard.photoId]}
          index={skyView.index}
          open={!!skyView}
          fieldRef={homeCommunity ? homeGalaxyRef : ambientGalaxyRef}
          onClose={endSkyView}
        />
      )}

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

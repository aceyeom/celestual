// beta/App.jsx — the beta shell.
//
// The brand is new; the machine underneath is production's. This file is
// deliberately shaped like App.jsx: the same sky handle, the same send-off
// contract (the flight reports its own arrival and a deadline catches a
// backgrounded tab), the same held dive for "see it in the sky", the same
// sealed-star bookkeeping. If a mechanic reads differently here than it does in
// the demo, that is a bug rather than a decision.
//
// State is in memory, there is no server, and a reload starts the same seeded
// page every time, so what is being judged is the design.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './beta.css'
import { SENDOFF_SECONDS } from '../galaxy.js'
import { C, INDEX_W, FONT_HREF, normHandle, groundOf, sealLight } from './tokens.js'
import { Frame, Masthead, IndexColumn, Seal, useNarrow } from './ui.jsx'
import { Sky } from './Sky.jsx'
import { SealResolve } from './Resolve.jsx'
import { OpenScreen, SendScreen, WriteScreen, FlightScreen, PlacedScreen, PingsScreen, RevealScreen, PlateScreen } from './screens.jsx'

const SCREENS = {
  open: { c: OpenScreen, name: 'the title page' },
  send: { c: SendScreen, name: 'the send' },
  write: { c: WriteScreen, name: 'the card' },
  flight: { c: FlightScreen, name: null },
  placed: { c: PlacedScreen, name: 'the truth' },
  pings: { c: PingsScreen, name: 'your pings' },
  reveal: { c: RevealScreen, name: 'the reveal' },
  plate: { c: PlateScreen, name: 'the specimen' },
}

// Which pages let the field burn at full strength, and which pull it back so
// the foreground reads. Production's CALM_SCREENS, same idea.
const CALM = ['send', 'write', 'placed', 'pings', 'plate']

// What the index lists: every screen that has a name, numbered in the order
// they are declared above, which is the order you meet them.
const INDEX = Object.entries(SCREENS)
  .filter(([, v]) => v.name)
  .map(([key, v]) => ({ key, name: v.name }))

const days = (n) => new Date(Date.now() + n * 864e5).toISOString()

const SEED = [
  {
    handle: 'raines',
    state: 'standing',
    placed: Date.now() - 11 * 864e5,
    expires: days(49),
    opened: false,
    card: { handle: 'raines', words: 'you always took the window seat', ground: 'leaf', face: 'hand', placed: Date.now() - 11 * 864e5 },
    theirCard: { handle: 'you', words: 'i kept the receipt from that night', ground: 'chalk', face: 'plain', placed: Date.now() - 3 * 864e5 },
  },
  {
    handle: 'ilbagno',
    state: 'waiting',
    placed: Date.now() - 34 * 864e5,
    expires: days(26),
    opened: false,
    card: { handle: 'ilbagno', words: 'we said we would be roommates', ground: 'hide', face: 'stamp', placed: Date.now() - 34 * 864e5 },
    theirCard: { handle: 'you', words: 'i still take that street home', ground: 'leaf', face: 'hand', placed: Date.now() },
  },
]

const SLUGS = { open: 'title', send: 'send', write: 'card', placed: 'truth', pings: 'pings', reveal: 'reveal', plate: 'specimen' }
const BY_SLUG = Object.fromEntries(Object.entries(SLUGS).map(([k, v]) => [v, k]))
const fromHash = () => BY_SLUG[String(window.location.hash || '').replace(/^#/, '').toLowerCase()] || ''

export default function BetaApp() {
  const [screen, setScreen] = useState(() => fromHash() || 'open')
  const [pings, setPings] = useState(SEED)
  const [them, setThem] = useState(() => (fromHash() === 'write' ? 'oleander' : ''))
  const [last, setLast] = useState(() => (fromHash() === 'placed' ? SEED[0] : null))
  const [revealing, setRevealing] = useState('')
  const [mode, setMode] = useState('idle')
  const [origin, setOrigin] = useState(null)
  const [liftoff, setLiftoff] = useState(null)
  const [indexOpen, setIndexOpen] = useState(false)
  const narrow = useNarrow()
  const pending = useRef(null)
  const sky = useRef(null)
  const morphTimer = useRef(null)
  const sendoffTimer = useRef(null)
  const me = 'you'

  useEffect(() => {
    if (!document.getElementById('beta-faces')) {
      const l = document.createElement('link')
      l.id = 'beta-faces'
      l.rel = 'stylesheet'
      l.href = FONT_HREF
      document.head.appendChild(l)
    }
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', C.void)
    document.title = 'celestual — the bindery edition'
    return () => {
      if (morphTimer.current) clearTimeout(morphTimer.current)
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
    }
  }, [])

  const prepare = useCallback(
    (s) => {
      if (s === 'write') setThem((t) => t || 'oleander')
      if (s === 'placed') setLast((l) => l || pings[0] || null)
      if (s === 'reveal') {
        const already = pings.find((p) => p.state === 'mutual')
        const pick = already || pings[0]
        if (!pick) return
        if (!already) setPings((prev) => prev.map((p) => (p.handle === pick.handle ? { ...p, state: 'mutual' } : p)))
        setRevealing(pick.handle)
      }
    },
    [pings],
  )

  const swap = useCallback((s) => {
    setIndexOpen(false)
    const apply = () => setScreen(s)
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce && typeof document.startViewTransition === 'function') {
      try {
        document.startViewTransition(() => flushSync(apply))
        requestAnimationFrame(() => window.scrollTo(0, 0))
        return
      } catch {
        /* fall through to a plain swap */
      }
    }
    apply()
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }, [])

  const go = useCallback(
    (s) => {
      prepare(s)
      try {
        const hash = s === 'flight' ? '' : `#${SLUGS[s] || s}`
        window.history.pushState({ beta: s }, '', `${window.location.pathname}${hash}`)
      } catch {
        /* history unavailable — navigation still works */
      }
      swap(s)
    },
    [prepare, swap],
  )

  useEffect(() => {
    const onPop = () => {
      const s = fromHash() || 'open'
      prepare(s)
      swap(s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [prepare, swap])

  // The index is a column rather than a dialog — it does not trap focus and it
  // does not scrim the page — but it is still a thing that is open, and escape
  // is what closes an open thing.
  useEffect(() => {
    if (!indexOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIndexOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [indexOpen])

  useEffect(() => {
    if (!window.location.hash) {
      try {
        window.history.replaceState({ beta: screen }, '', `${window.location.pathname}#${SLUGS[screen] || screen}`)
      } catch {
        /* ignore */
      }
    }
    if (fromHash() === 'reveal') prepare('reveal')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── the send-off ───────────────────────────────────────────────────────────
  // Production's, exactly: the seal collapses to a point on the glass where it
  // was standing, a real star launches from that same point, and the camera
  // falls in behind its shoulder and rides it into the disk. The flight reports
  // its own arrival; the timer is only a deadline, because a backgrounded tab
  // stops rendering and a lost context stops it for good.
  const place = useCallback(
    (card) => {
      const handle = normHandle(them)
      if (!handle) return
      const standing = handle.length % 2 === 0
      pending.current = {
        handle,
        state: standing ? 'standing' : 'waiting',
        placed: Date.now(),
        expires: days(60),
        opened: false,
        card: { ...card, handle, placed: Date.now() },
        theirCard: { handle: me, words: 'i thought about it every time i passed', ground: 'leaf', face: 'hand', placed: Date.now() },
      }

      let o = { x: 0.5, y: 0.44 }
      try {
        const el = document.querySelector('[data-sendoff-field]')
        if (el) {
          const r = el.getBoundingClientRect()
          o = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
          setLiftoff({ card: pending.current.card, cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: r.width })
        }
      } catch {
        /* fall back to the middle of the glass */
      }
      setOrigin(o)

      const done = () => {
        if (sendoffTimer.current) {
          clearTimeout(sendoffTimer.current)
          sendoffTimer.current = null
        }
        const p = pending.current
        pending.current = null
        setMode('idle')
        if (!p) return
        setPings((prev) => [...prev.filter((x) => x.handle !== p.handle), p])
        setLast(p)
        setThem('')
        go('placed')
      }
      const f = sky.current
      if (f) f.onSendoffDone = done
      setMode('sendoff')
      go('flight')

      if (morphTimer.current) clearTimeout(morphTimer.current)
      morphTimer.current = setTimeout(() => setLiftoff(null), 1300)
      if (sendoffTimer.current) clearTimeout(sendoffTimer.current)
      sendoffTimer.current = setTimeout(() => {
        sendoffTimer.current = null
        if (f) f.onSendoffDone = null
        done()
      }, SENDOFF_SECONDS * 1000 + 3000)
    },
    [them, go],
  )

  // ── the held star (the ledger's "see it in the sky") ───────────────────────
  // Tapping a ping flies the backdrop camera to that ping's own star and STAYS
  // there. What is waiting at the end of the flight is the seal: the star stops
  // being a point of light and becomes the surface it was made of.
  const [skyView, setSkyView] = useState(null)
  const endSkyView = useCallback(() => {
    const f = sky.current
    if (f) {
      f.clearFocus()
      if (f.setNavEnabled) f.setNavEnabled(false)
    }
    setSkyView(null)
  }, [])
  const locate = useCallback(
    (handle) => {
      const h = normHandle(handle)
      const f = sky.current
      if (!h || skyView || !f || !f.focusStar) return
      const i = pings.findIndex((p) => p.handle === h)
      if (i < 0) return
      f.focusStar(i, { hold: true, onArrive: () => setSkyView((v) => (v && v.handle === h ? { ...v, arrived: true } : v)) })
      if (f.setNavEnabled) f.setNavEnabled(true)
      setSkyView({ handle: h, index: i, arrived: false })
    },
    [pings, skyView],
  )

  // A held dive melts the whole foreground away, so a screen change that left
  // one running would hand somebody an invisible, unclickable page. Leaving the
  // page releases the camera, always.
  useEffect(() => {
    if (!skyView) return
    endSkyView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const renew = useCallback((h) => setPings((prev) => prev.map((p) => (p.handle === h ? { ...p, expires: days(60) } : p))), [])
  const letGo = useCallback(
    (h) => {
      const i = pings.findIndex((p) => p.handle === h)
      // the star goes out where it stood, rather than the list simply being one
      // shorter the next time the sky is looked at
      if (i >= 0 && sky.current && sky.current.vanishStar) sky.current.vanishStar(i)
      setPings((prev) => prev.filter((p) => p.handle !== h))
    },
    [pings],
  )

  const simulate = useCallback(() => {
    setPings((prev) => {
      const i = prev.findIndex((p) => p.state !== 'mutual')
      if (i < 0) return prev
      const next = prev.slice()
      next[i] = { ...next[i], state: 'mutual', opened: false }
      return next
    })
  }, [])

  const open = useCallback(
    (h) => {
      setRevealing(h)
      setPings((prev) => prev.map((p) => (p.handle === h ? { ...p, opened: true } : p)))
      setMode('match')
      go('reveal')
    },
    [go],
  )
  const closeReveal = useCallback(() => {
    const f = sky.current
    if (f) f.clearFocus()
    setMode('idle')
    go('pings')
  }, [go])

  const openConversation = useCallback((h) => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
    const url = mobile ? `https://ig.me/m/${h}` : `https://www.instagram.com/m/${h}`
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } catch {
      /* ignore */
    }
  }, [])

  // ── the sealed stars ───────────────────────────────────────────────────────
  // One per ping, resting in the disk. The light each one burns with is its
  // card's ground, measured rather than picked, exactly as production measures
  // it off a photograph.
  const sealLabels = useMemo(() => pings.map((p) => p.handle), [pings])
  const sealKinds = useMemo(() => pings.map((p) => sealLight(groundOf(p.card && p.card.ground).tone)), [pings])

  const revealed = pings.find((p) => p.handle === revealing) || null
  const revealIndex = pings.findIndex((p) => p.handle === revealing)

  const ctx = {
    me, them, setThem, pings, standing: pings.length, last, revealing, revealed, revealIndex,
    canSimulate: pings.some((p) => p.state !== 'mutual'),
    skyRef: sky, skyFlight: !!skyView,
    go, place, renew, letGo, simulate, open, closeReveal, openConversation, locate,
  }

  const Screen = (SCREENS[screen] || SCREENS.open).c
  // The field burns at full strength on the pages that ARE the sky — the title
  // page, a held dive, the reveal — and is pulled well back everywhere there is
  // something to read.
  //
  // Further back than it used to be, for two compounding reasons: the ground
  // went to near-black and the exposure came up to meet it, so the same disk at
  // the old 0.38 is appreciably brighter than it was; and the setting is now
  // centred, so a working page runs straight down the middle of the frame
  // instead of clearing it to the left. The galaxy on a working page is a
  // ground, and a ground is not something you read a form over.
  const dim = screen === 'reveal' || skyView ? 1 : CALM.includes(screen) ? 0.2 : 1

  return (
    <div className="bindery">
      <Sky
        mode={mode}
        dim={dim}
        origin={origin}
        seals={pings.length}
        sealLabels={sealLabels}
        sealKinds={sealKinds}
        onReady={(f) => (sky.current = f)}
      />
      <Frame />

      {/* the masthead is on every page now, not only the two that used to carry
          the wordmark: it is where the index lives, and an index you can only
          reach from some of the book is not an index */}
      <Masthead open={indexOpen} onToggle={() => setIndexOpen((v) => !v)} hidden={!!skyView} />
      <IndexColumn open={indexOpen && !skyView} items={INDEX} screen={screen} go={go} narrow={narrow} />

      {/* The page makes room for the index rather than sitting under it. On a
          wide screen that is a strip of padding the centred column re-solves
          itself inside; on a phone there is no width to give away, so the page
          steps aside instead. The transform is only ever SET when it is
          non-zero — a transformed ancestor becomes the containing block for
          every fixed child under it, and the reveal's held seal is fixed. */}
      <div
        onPointerDownCapture={() => indexOpen && setIndexOpen(false)}
        style={{
          position: 'relative',
          zIndex: 4,
          paddingRight: indexOpen && !narrow && !skyView ? INDEX_W : 0,
          transform: indexOpen && narrow && !skyView ? 'translateX(-24%)' : undefined,
          opacity: skyView || (indexOpen && narrow) ? 0 : 1,
          pointerEvents: skyView || (indexOpen && narrow) ? 'none' : 'auto',
          transition:
            'opacity .55s ease, padding-right .46s cubic-bezier(.16,.84,.28,1), transform .46s cubic-bezier(.16,.84,.28,1)',
        }}
      >
        {/* during a flight the foreground melts away completely, so the sky is
            the whole screen. The entrance animation has to be suppressed for
            the melt or its fill-mode pins opacity at 1. */}
        <div key={screen} style={{ animation: skyView ? 'none' : undefined }}>
          <Screen ctx={ctx} />
        </div>
      </div>

      {/* the star, resolving into the seal it was made of */}
      {skyView && (
        <SealResolve
          card={(pings.find((p) => p.handle === skyView.handle) || {}).card}
          index={skyView.index}
          open={!!skyView}
          fieldRef={sky}
          onClose={endSkyView}
        />
      )}

      {/* the send-off's first beat: the seal collapses to the point the star
          launches from, so the hand-off from the page to the sky has nothing
          visible in it */}
      {liftoff && <Liftoff {...liftoff} />}
    </div>
  )
}

// ── the collapse ─────────────────────────────────────────────────────────────
// One shot, ~1.2s, torn down as soon as it has played. It is the same gesture
// production's Liftoff makes with the @ field, made with the object this brand
// actually hands over: the seal, pressed down to a point of light.
function Liftoff({ card, cx, cy, size }) {
  return (
    <div
      aria-hidden
      className="lift-off"
      style={{ position: 'fixed', left: cx - size / 2, top: cy - size / 2, width: size, height: size, zIndex: 5, pointerEvents: 'none' }}
    >
      <Seal card={card} size={size} />
    </div>
  )
}


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
import { C, FONT, S, R, LIGHT, FONT_HREF, rgba, normHandle, groundOf, sealLight } from './tokens.js'
import { Frame, Wordmark, Label, Rule, Seal } from './ui.jsx'
import { stitching } from './texture.js'
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
const MASTHEAD = ['open', 'flight']

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
  const dim = screen === 'reveal' || skyView ? 1 : CALM.includes(screen) ? 0.38 : 1

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

      {MASTHEAD.includes(screen) && !skyView && (
        <div
          style={{
            position: 'fixed',
            top: 'max(30px, calc(env(safe-area-inset-top) + 22px))',
            left: 'max(34px, calc(env(safe-area-inset-left) + 26px))',
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          <Wordmark size={13} />
        </div>
      )}

      {!skyView && <Ribbon open={indexOpen} onToggle={() => setIndexOpen((v) => !v)} screen={screen} go={go} />}

      {/* during a flight the foreground melts away completely, so the sky is the
          whole screen. The entrance animation has to be suppressed for the melt
          or its fill-mode pins opacity at 1. */}
      <div
        key={screen}
        style={{
          position: 'relative',
          zIndex: 4,
          animation: skyView ? 'none' : undefined,
          opacity: skyView ? 0 : 1,
          transition: 'opacity .55s ease',
          pointerEvents: skyView ? 'none' : 'auto',
        }}
      >
        <Screen ctx={ctx} />
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

// ── the ribbon ───────────────────────────────────────────────────────────────
function Ribbon({ open, onToggle, screen, go }) {
  const items = Object.entries(SCREENS).filter(([, v]) => v.name)
  return (
    <div style={{ position: 'fixed', top: 0, right: 'max(46px, calc(env(safe-area-inset-right) + 38px))', zIndex: 30 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="the index"
        style={{
          display: 'block',
          width: 34,
          height: open ? 112 : 96,
          backgroundColor: C.hide2,
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 1px, rgba(255,226,186,0.05) 1px 3px), linear-gradient(90deg, rgba(0,0,0,0.5) 0 2px, transparent 2px calc(100% - 2px), rgba(0,0,0,0.5) calc(100% - 2px) 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
          boxShadow: '0 10px 22px rgba(0,0,0,.5)',
          transition: 'height .28s cubic-bezier(.16,.84,.28,1)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: 16,
            transform: 'translateX(-50%)',
            writingMode: 'vertical-rl',
            fontFamily: FONT.sans,
            fontWeight: 400,
            fontSize: 9.5,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: rgba(C.ivory, 0.8),
            textShadow: '0 1px 0 rgba(0,0,0,.5)',
          }}
        >
          index
        </span>
      </button>

      {open && (
        <div
          className="rise-in"
          style={{
            position: 'absolute',
            top: 116,
            right: 0,
            width: 232,
            backgroundColor: C.hide,
            borderRadius: R.panel,
            boxShadow: LIGHT.rest,
            padding: `${S.md}px ${S.md}px ${S.sm}px`,
          }}
        >
          <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: R.panel, ...stitching({ inset: 6 }) }} />
          <div style={{ position: 'relative' }}>
            <Label style={{ marginBottom: S.sm }}>the index</Label>
            <Rule style={{ marginBottom: S.sm }} />
            {items.map(([key, v]) => {
              const on = key === screen
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => go(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 2px',
                    color: on ? C.ivory : rgba(C.ivory, 0.7),
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: on ? C.caramel : 'transparent',
                      border: on ? 'none' : `1px solid ${rgba(C.ivory, 0.24)}`,
                      flex: '0 0 auto',
                    }}
                  />
                  <span style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 13.5, letterSpacing: '0.02em' }}>{v.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// beta/App.jsx — the beta shell.
//
// Self-contained by design. It holds its own state in memory, talks to no
// server, imports nothing from the production app, and resets on reload, so
// every visit to /beta starts from the same known page and the brand is what is
// being judged rather than whatever happens to be in localStorage.
//
// The nav is a BOOKMARK RIBBON, not a dock. A dock is the single most generic
// object in mobile software and it would undo half of what the rest of this
// costs to build. A ribbon hanging out of the top of the case is what you
// actually put in a book to get back to a page, it is unmistakably this brand,
// and on an assessment build it does the one job a dock would have done better:
// it lets you jump straight to any page in any order.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './beta.css'
import { C, TEXT, FONT, S, R, LIGHT, FONT_HREF, rgba, normHandle, daysLeft, stamp } from './tokens.js'
import { leatherSurface, stitching } from './texture.js'
import { Frame, Wordmark, Label, Rule } from './ui.jsx'
import { Chart } from './Chart.jsx'
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

// How lit the chart is behind each page. The title page and the reveal get the
// field at full strength; anything with a paragraph on it gets it pulled back,
// because a sky competing with body copy is a sky that wins.
const DIM = { open: 1, flight: 1, reveal: 0.92, plate: 0.3 }

// Where the wordmark is set. The pages with a Head row of their own do not get
// it; the specimen sheet prints its own.
const MASTHEAD = ['open', 'flight', 'reveal']

const days = (n) => new Date(Date.now() + n * 864e5).toISOString()

// The page opens mid-story on purpose: one ping standing, one waiting, one slot
// open. An empty product cannot be assessed, and a seeded one shows the ledger,
// the two states, both card grounds and the empty slot in a single screen.
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

// The page named in the address, if it names one. Every page in the beta is
// deep-linkable (`/beta#the-card`), which an assessment build needs: a link to
// a page is how a design gets discussed, and "click begin, then type something,
// then press seal" is not a link.
const SLUGS = {
  open: 'title', send: 'send', write: 'card', placed: 'truth',
  pings: 'pings', reveal: 'reveal', plate: 'specimen',
}
const BY_SLUG = Object.fromEntries(Object.entries(SLUGS).map(([k, v]) => [v, k]))
const fromHash = () => BY_SLUG[String(window.location.hash || '').replace(/^#/, '').toLowerCase()] || ''

export default function BetaApp() {
  const [screen, setScreen] = useState(() => fromHash() || 'open')
  const [pings, setPings] = useState(SEED)
  const [them, setThem] = useState(() => (fromHash() === 'write' ? 'oleander' : ''))
  const [last, setLast] = useState(() => (fromHash() === 'placed' ? SEED[0] : null))
  const [revealing, setRevealing] = useState('')
  const [mode, setMode] = useState('idle')
  const [indexOpen, setIndexOpen] = useState(false)
  const pending = useRef(null)
  const me = 'you'

  // The three faces, fetched only for this route. Production never pays for a
  // font it does not set.
  useEffect(() => {
    if (document.getElementById('beta-faces')) return
    const l = document.createElement('link')
    l.id = 'beta-faces'
    l.rel = 'stylesheet'
    l.href = FONT_HREF
    document.head.appendChild(l)
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', C.void)
    document.title = 'celestual — the bindery edition'
  }, [])

  // Landing straight on a page must land on a page with something ON it. Jump
  // to the card with nobody named, or the reveal with nothing mutual, and the
  // screen would be technically correct and useless to look at, so each one
  // backfills whatever it needs first.
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
        // the flight is a moment, not a place: it never takes an address
        const hash = s === 'flight' ? '' : `#${SLUGS[s] || s}`
        window.history.pushState({ beta: s }, '', `${window.location.pathname}${hash}`)
      } catch {
        /* history unavailable — navigation still works */
      }
      swap(s)
    },
    [prepare, swap],
  )

  // The OS back button walks the pages instead of leaving the site.
  useEffect(() => {
    const onPop = () => {
      const s = fromHash() || 'open'
      prepare(s)
      swap(s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [prepare, swap])

  // and a page entered by address gets its address written back, once
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

  // ── placing ────────────────────────────────────────────────────────────────
  // The card is composed, the star is thrown, the chart scribes its ring, and
  // only then does the page change. The flight reports its own arrival rather
  // than being raced by a timer, which is the same contract the production sky
  // has with App.jsx.
  const place = useCallback(
    (card) => {
      const handle = normHandle(them)
      if (!handle) return
      // whether they are already here is the one thing this screen does not get
      // to decide, so the beta decides it the way a coin does
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
      setMode('sendoff')
      go('flight')
    },
    [them, go],
  )

  const arrived = useCallback(() => {
    const p = pending.current
    pending.current = null
    setMode('idle')
    if (!p) return
    setPings((prev) => [...prev.filter((x) => x.handle !== p.handle), p])
    setLast(p)
    setThem('')
    go('placed')
  }, [go])

  const renew = useCallback((h) => {
    setPings((prev) => prev.map((p) => (p.handle === h ? { ...p, expires: days(60) } : p)))
  }, [])

  const letGo = useCallback((h) => {
    setPings((prev) => prev.filter((p) => p.handle !== h))
  }, [])

  // The beta's one lever: turn a standing ping into a mutual one, so the reveal
  // can be looked at without two people and a real backend.
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
      go('reveal')
    },
    [go],
  )

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

  const ctx = {
    me,
    them,
    setThem,
    pings,
    standing: pings.length,
    last,
    revealing,
    canSimulate: pings.some((p) => p.state !== 'mutual'),
    error: '',
    go,
    place,
    renew,
    letGo,
    simulate,
    open,
    openConversation,
  }

  // What the chart is holding. The tick under each label is the same fact the
  // ledger prints, so the sky and the page never disagree.
  const chartPings = useMemo(
    () =>
      pings.map((p) => ({
        handle: p.handle,
        state: p.state,
        tick: p.state === 'mutual' ? 'mutual' : p.state === 'standing' ? `${daysLeft(p.expires)}d` : 'held',
      })),
    [pings],
  )

  const Screen = (SCREENS[screen] || SCREENS.open).c
  const dim = DIM[screen] != null ? DIM[screen] : 0.55

  return (
    <div className="bindery">
      <Chart
        pings={chartPings}
        dim={dim}
        mode={mode}
        origin={{ x: 0.24, y: 0.58 }}
        onSendoffDone={arrived}
      />
      <Frame />

      {/* the masthead, and it appears ONCE. A book carries its half-title on
          the first leaf and never again; the pages after it carry a running
          head of their own, which here is the Head row on each screen. Keeping
          the wordmark pinned to every page is a website's habit, and on a phone
          it lands directly on top of that running head. */}
      {MASTHEAD.includes(screen) && (
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

      <Ribbon open={indexOpen} onToggle={() => setIndexOpen((v) => !v)} screen={screen} go={go} />

      <div key={screen} style={{ position: 'relative', zIndex: 4 }}>
        <Screen ctx={ctx} />
      </div>
    </div>
  )
}

// ── the ribbon ───────────────────────────────────────────────────────────────
// A bookmark, hanging out of the top of the case, with a notched tail. Pulling
// it opens the index. It is the only piece of chrome in the product and it is
// the one place a small flourish is allowed, because a ribbon that did not look
// like a ribbon would be a tab.
function Ribbon({ open, onToggle, screen, go }) {
  const items = Object.entries(SCREENS).filter(([, v]) => v.name)
  return (
    <div style={{ position: 'fixed', top: 0, right: 'max(46px, calc(env(safe-area-inset-right) + 38px))', zIndex: 30 }}>
      {/* A ribbon is woven, not stitched: the first cut had saddle stitching
          round all four edges of a thirty-pixel strip, which at that width
          reads as engine turning. What a grosgrain ribbon actually has is a
          fine warp down its length and a darker selvedge at each edge. */}
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
          backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 1px, rgba(255,226,186,0.05) 1px 3px), linear-gradient(90deg, rgba(0,0,0,0.5) 0 2px, transparent 2px calc(100% - 2px), rgba(0,0,0,0.5) calc(100% - 2px) 100%)`,
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
            ...leatherSurface(C.hide),
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
                    color: on ? C.ivory : TEXT.quiet,
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

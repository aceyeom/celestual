// admin.jsx — the desk at celestual.us/admin.
//
// THE BACK OFFICE, NOT THE BOOK. Everything else in this product is the closed
// case: the engraved chart, ivory on leather, one light per screen. That is the
// register for the people we are for, and it is the wrong one for an operations
// console, where the job is reading numbers accurately at a glance and pressing
// destructive buttons without misreading which row you are on. So the desk keeps
// what it always kept: a LIGHT ground, dense tabular rows, tabular figures, and
// no animation that is not feedback. It paints itself over the whole viewport
// (position: fixed) so the chart behind it never shows through, and App.jsx
// skips rendering that canvas here at all.
//
// What changed is what it is made of. It used to be a white-and-indigo fintech
// dashboard in system UI — a perfectly good console belonging to no product at
// all. It is the almanac's back office now: LAID PAPER rather than white, the
// case's own ink rather than slate, the brand's one caramel light rather than an
// indigo accent, 2px corners rather than 8px, and the product's three faces.
// Same density, same legibility argument, same two-tap destructive buttons.
//
// The three state tints survive, and they are the one deliberate exception to
// the product's one-hue law. They are not decoration: a person under time
// pressure has to tell BANNED from OPTED OUT from fine, and form alone is not
// fast enough on a table of four hundred rows. They are pulled to a printed
// register — a ledger's red ink, a stamped green — rather than SaaS chips.
//
// The data is one call — celestual_admin_overview (migrations 0019 + 0020) —
// returning counts, users (one row per member), unverified (ONE ROW PER HANDLE,
// not per attempt), competitors, a 30-day growth series, and a unified activity
// log. Two block states are reported and shown separately, because they are not
// the same fact: BANNED (identity refused, cannot verify) and OPTED OUT (nobody
// may enter this @, but they may still sign up themselves).
// The password is checked only in the celestual-admin edge function; every data
// RPC behind it is service-role only, so nothing here is readable without it.
import * as React from 'react'
import { Sigil } from './ui.jsx'
import {
  adminOverview, adminDeleteUser, adminBanUser, adminUnbanUser,
  adminDeleteCompetitor, adminClearPending, adminVerifyUser, adminHandleStatus,
} from '../api/admin.js'

const PW_STORE = 'celestual:adminpw' // session-scoped; the server re-checks every call

// ── the desk's own palette ───────────────────────────────────────────────────
// The leaves, not the case: laid paper and the ink it is written in, the brand's
// one light for anything active, and three state tints that mean something. If a
// colour appears here it means something.
const A = {
  bg: '#EFE6D4', //      the desk: a shade under the leaf, so a sheet reads as a sheet
  surface: '#F7F1E3', // the leaf itself
  line: 'rgba(36,24,17,0.16)',
  lineSoft: 'rgba(36,24,17,0.08)',
  ink: '#241811', //     what you are meant to read
  body: '#4A3A2D', //    the quieter ink
  muted: '#7A6A5B', //   a pencil note
  faint: '#9C8F80',
  accent: '#8A5C33', //  saddle: dark enough to read AS ink on paper, and the
  accentSoft: '#E8DCC4', //  same light every lit thing in the product wears
  good: '#3F6B45', //    a stamped green, the colour of a ledger's approval
  goodSoft: '#E2E8DA',
  warn: '#8A5C33',
  warnSoft: '#EBDFC6',
  bad: '#8E3B2E', //     a ledger's red ink, not a browser error
  badSoft: '#EEDCD4',
}

// The product's three faces (theme.js FONT). Jost carries the mechanics here
// exactly as it does everywhere else; Courier carries every figure, which is
// what a back office actually wants — a tabular typewriter face.
const FONT = "'Jost', 'Futura', 'Century Gothic', system-ui, -apple-system, sans-serif"
const MONO = "'Courier Prime', 'Courier New', ui-monospace, monospace"
const SERIF = "'Cormorant Garamond', Georgia, serif"
const NUM = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }

// ── small primitives ─────────────────────────────────────────────────────────

function Btn({ children, onClick, kind = 'default', size = 'md', disabled, type, style }) {
  const [h, setH] = React.useState(false)
  const pal =
    kind === 'primary'
      ? { bg: A.accent, fg: A.surface, bd: A.accent, hov: '#6F4826' }
      : kind === 'danger'
        ? { bg: A.surface, fg: A.bad, bd: 'rgba(142,59,46,0.34)', hov: A.badSoft }
        : kind === 'good'
          ? { bg: A.surface, fg: A.good, bd: 'rgba(63,107,69,0.34)', hov: A.goodSoft }
          : { bg: A.surface, fg: A.body, bd: A.line, hov: A.accentSoft }
  return (
    <button
      type={type || 'button'}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: size === 'sm' ? '5px 10px' : '9px 16px',
        borderRadius: 2,
        border: `1px solid ${pal.bd}`,
        background: disabled ? A.bg : h ? pal.hov : pal.bg,
        color: disabled ? A.faint : pal.fg,
        fontFamily: FONT,
        fontSize: size === 'sm' ? 12.5 : 14,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .14s, border-color .14s, color .14s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// Two-tap destructive button: the first tap arms, the second fires. Keeps a
// mis-aimed click on a dense table from erasing somebody.
function Armed({ label, armedLabel, onFire, kind = 'danger' }) {
  const [armed, setArmed] = React.useState(false)
  React.useEffect(() => {
    if (!armed) return undefined
    const id = setTimeout(() => setArmed(false), 3200)
    return () => clearTimeout(id)
  }, [armed])
  return (
    <Btn
      size="sm"
      kind={armed ? 'primary' : kind}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onFire()
      }}
    >
      {armed ? armedLabel || 'confirm' : label}
    </Btn>
  )
}

function Card({ children, style, pad = 20 }) {
  return (
    <div
      style={{
        background: A.surface,
        border: `1px solid ${A.line}`,
        borderRadius: 3,
        padding: pad,
        boxShadow: '0 1px 2px rgba(13,19,33,.04)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Stat({ label, value, sub, tone }) {
  const col = tone === 'bad' ? A.bad : tone === 'good' ? A.good : tone === 'warn' ? A.warn : A.ink
  return (
    <Card pad={16} style={{ flex: '1 1 150px', minWidth: 140 }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: A.faint }}>
        {label}
      </div>
      <div style={{ marginTop: 7, fontSize: 27, fontWeight: 650, letterSpacing: '-0.025em', color: col, ...NUM }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 3, fontSize: 12.5, color: A.muted, ...NUM }}>{sub}</div>}
    </Card>
  )
}

function Pill({ children, tone }) {
  const map = {
    good: [A.goodSoft, A.good, 'rgba(63,107,69,0.3)'],
    warn: [A.warnSoft, A.warn, 'rgba(138,92,51,0.3)'],
    bad: [A.badSoft, A.bad, 'rgba(142,59,46,0.3)'],
    accent: [A.accentSoft, A.accent, 'rgba(138,92,51,0.3)'],
  }
  const [bg, fg, bd] = map[tone] || [A.bg, A.muted, A.line]
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 3,
        background: bg, color: fg, border: `1px solid ${bd}`,
        fontSize: 11.5, fontWeight: 500, letterSpacing: '-.005em', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function Table({ cols, children, empty }) {
  const kids = React.Children.toArray(children)
  if (kids.length === 0) {
    return <div style={{ padding: '30px 4px', textAlign: 'center', color: A.faint, fontSize: 13.5 }}>{empty || 'Nothing here yet.'}</div>
  }
  return (
    <div style={{ overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                style={{
                  textAlign: typeof c === 'object' && c.right ? 'right' : 'left',
                  padding: '0 12px 9px 0',
                  borderBottom: `1px solid ${A.line}`,
                  fontSize: 11.5, fontWeight: 500, letterSpacing: '.05em',
                  textTransform: 'uppercase', color: A.faint, whiteSpace: 'nowrap',
                }}
              >
                {typeof c === 'object' ? c.label : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Row({ children }) {
  const [h, setH] = React.useState(false)
  return (
    <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ background: h ? A.bg : 'transparent' }}>
      {children}
    </tr>
  )
}

const cell = (extra = {}) => ({
  padding: '11px 12px 11px 0',
  borderBottom: `1px solid ${A.lineSoft}`,
  color: A.body,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  ...extra,
})

function Handle({ children }) {
  return <span style={{ fontFamily: MONO, fontSize: 13, color: A.ink, fontWeight: 400 }}>@{children}</span>
}

function Code({ children }) {
  if (!children) return <span style={{ color: A.faint }}>—</span>
  return (
    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 650, letterSpacing: '.08em', color: A.accent }}>
      {children}
    </span>
  )
}

// ── dates ────────────────────────────────────────────────────────────────────
const fmtDate = (x) => {
  if (!x) return '—'
  try {
    return new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}
const fmtTime = (x) => {
  if (!x) return '—'
  try {
    return new Date(x).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}
const ago = (x) => {
  if (!x) return '—'
  const s = Math.max(0, (Date.now() - Date.parse(x)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const n = (x) => Number(x || 0).toLocaleString()

// ── the growth curve ─────────────────────────────────────────────────────────
// Cumulative members as an area, daily arrivals as faint bars behind it. One
// accent, no legend chrome: the two series are unambiguous by form alone.
function GrowthChart({ series }) {
  const W = 760
  const H = 210
  const P = { t: 14, r: 14, b: 26, l: 38 }
  const pts = Array.isArray(series) ? series : []
  if (pts.length < 2) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: A.faint, fontSize: 13.5 }}>Not enough history yet.</div>
  }
  const iw = W - P.l - P.r
  const ih = H - P.t - P.b
  const maxTotal = Math.max(1, ...pts.map((p) => Number(p.total || 0)))
  const maxDay = Math.max(1, ...pts.map((p) => Number(p.members || 0)))
  const x = (i) => P.l + (i / (pts.length - 1)) * iw
  const y = (v) => P.t + ih - (Number(v || 0) / maxTotal) * ih
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${(P.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(P.t + ih).toFixed(1)} Z`
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxTotal * f))
  const barW = Math.max(2, Math.min(10, iw / pts.length - 2))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="members over time">
      <defs>
        <linearGradient id="ce-grow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={A.accent} stopOpacity="0.16" />
          <stop offset="100%" stopColor={A.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tv, i) => {
        const yy = y(tv)
        return (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={yy} y2={yy} stroke={A.lineSoft} strokeWidth="1" />
            <text x={P.l - 8} y={yy + 3.5} textAnchor="end" fontFamily={FONT} fontSize="10.5" fill={A.faint} style={NUM}>
              {tv}
            </text>
          </g>
        )
      })}
      {pts.map((p, i) => {
        const hgt = (Number(p.members || 0) / maxDay) * (ih * 0.42)
        if (hgt <= 0) return null
        // clamp so the first and last bars sit inside the plot, not on the axis
        const bx = Math.min(Math.max(x(i) - barW / 2, P.l), W - P.r - barW)
        return (
          <rect
            key={`b${i}`}
            x={bx}
            y={P.t + ih - hgt}
            width={barW}
            height={hgt}
            rx={1.5}
            fill={A.accent}
            opacity="0.16"
          />
        )
      })}
      <path d={area} fill="url(#ce-grow)" />
      <path d={line} fill="none" stroke={A.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].total)} r="3.5" fill={A.accent} stroke="#fff" strokeWidth="2" />
      {pts.map((p, i) =>
        i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1 ? (
          <text key={`x${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontFamily={FONT} fontSize="10.5" fill={A.faint}>
            {fmtDate(p.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// THE DESK
// ═════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'logs', label: 'Activity log' },
]

export function AdminScreen() {
  const [password, setPassword] = React.useState(() => {
    try {
      return sessionStorage.getItem(PW_STORE) || ''
    } catch {
      return ''
    }
  })
  const [entered, setEntered] = React.useState('')
  const [data, setData] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [tab, setTab] = React.useState('overview')
  const [q, setQ] = React.useState('')
  const [lookup, setLookup] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const [flash, setFlash] = React.useState('')

  // The desk owns the whole page while it's mounted: white behind everything,
  // no galaxy bleeding through, no app scroll container fighting it.
  React.useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = A.bg
    return () => {
      document.body.style.background = prev
    }
  }, [])

  const load = React.useCallback(async (pw) => {
    if (!pw) return
    setBusy(true)
    setErr('')
    const r = await adminOverview(pw)
    setBusy(false)
    if (!r?.ok) {
      setData(null)
      setPassword('')
      try {
        sessionStorage.removeItem(PW_STORE)
      } catch {
        /* ignore */
      }
      setErr(r?.error === 'password' ? 'That password is not it.' : r?.error === 'rate' ? 'Too many tries. Give it an hour.' : 'The desk did not answer. Try again.')
      return
    }
    setPassword(pw)
    try {
      sessionStorage.setItem(PW_STORE, pw)
    } catch {
      /* ignore */
    }
    setData(r)
  }, [])

  React.useEffect(() => {
    if (password) load(password)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const say = (msg) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 3200)
  }

  const act = async (fn, handle, msg) => {
    if (busy) return
    setBusy(true)
    const r = await fn(password, handle)
    setBusy(false)
    if (!r?.ok) {
      setErr(r?.error === 'banned' ? 'That @ is banned. Lift the ban first.' : 'That did not go through. Try again.')
      return
    }
    say(msg.replace('{h}', '@' + handle))
    if (status?.handle === handle) checkHandle(handle)
    load(password)
  }

  const checkHandle = async (h) => {
    const v = String(h || '').trim().replace(/^@+/, '')
    if (!v) return
    setBusy(true)
    setErr('')
    const r = await adminHandleStatus(password, v)
    setBusy(false)
    if (!r?.ok) {
      setStatus(null)
      setErr('That lookup did not answer.')
      return
    }
    setStatus(r)
  }

  const lock = () => {
    setData(null)
    setPassword('')
    setEntered('')
    setStatus(null)
    try {
      sessionStorage.removeItem(PW_STORE)
    } catch {
      /* ignore */
    }
  }

  const page = (children) => (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto',
        background: A.bg, color: A.ink, fontFamily: FONT,
        WebkitFontSmoothing: 'antialiased', letterSpacing: '-0.011em',
      }}
    >
      {children}
    </div>
  )

  // ── the gate ──
  if (!data) {
    return page(
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <Card style={{ width: '100%', maxWidth: 380 }} pad={28}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 26, height: 26, borderRadius: 2, background: A.ink, display: 'grid', placeItems: 'center' }}>
              <Sigil size={11} cut="warm" ground={A.ink} />
            </span>
            <span style={{ fontSize: 15.5, fontWeight: 650, letterSpacing: '-0.02em' }}>Celestual</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: A.faint }}>Operations</span>
          </div>
          <div style={{ marginTop: 22, fontSize: 20, fontWeight: 650, letterSpacing: '-0.025em' }}>Sign in</div>
          <div style={{ marginTop: 5, fontSize: 13.5, color: A.muted, lineHeight: 1.5 }}>
            This console reads and edits live user data. The password is checked on the server.
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load(entered)
            }}
            style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 11 }}
          >
            <input
              type="password"
              value={entered}
              onChange={(e) => setEntered(e.target.value)}
              placeholder="Password"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 2,
                border: `1px solid ${A.line}`, outline: 'none', background: '#fff',
                fontFamily: FONT, fontSize: 15, color: A.ink,
              }}
            />
            {err && (
              <div style={{ fontSize: 13, color: A.bad, background: A.badSoft, border: `1px solid rgba(142,59,46,0.3)`, borderRadius: 2, padding: '8px 11px' }}>
                {err}
              </div>
            )}
            <Btn kind="primary" type="submit" disabled={busy || !entered} style={{ width: '100%' }}>
              {busy ? 'Checking…' : 'Open the desk'}
            </Btn>
          </form>
        </Card>
      </div>,
    )
  }

  // ── the desk ──
  const counts = data.counts || {}
  const users = Array.isArray(data.users) ? data.users : []
  const unverified = Array.isArray(data.unverified) ? data.unverified : Array.isArray(data.attempts) ? data.attempts : []
  const competitors = Array.isArray(data.competitors) ? data.competitors : []
  const logs = Array.isArray(data.logs) ? data.logs : []
  const growth = Array.isArray(data.growth) ? data.growth : []

  const hit = (s) => !q || String(s || '').toLowerCase().includes(q.trim().toLowerCase())
  const fUsers = users.filter((u) => hit(u.handle) || hit(u.via_code))
  const fUnver = unverified.filter((u) => hit(u.handle) || hit(u.code))
  const fComp = competitors.filter((c) => hit(c.handle) || hit(c.name) || hit(c.email) || hit(c.code))
  const fLogs = logs.filter((l) => hit(l.handle) || hit(l.kind) || hit(l.detail))

  const viaPill = (via) =>
    via === 'dm' ? <Pill tone="good">DM confirmed</Pill>
      : via === 'timeout' ? <Pill tone="warn">Assumed at 20s</Pill>
        : via === 'manual' ? <Pill tone="accent">Manual</Pill>
          : <Pill>No record</Pill>

  return page(
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 20px 60px' }}>
      {/* ── masthead ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '4px 0 18px' }}>
        <span style={{ width: 28, height: 28, borderRadius: 2, background: A.ink, display: 'grid', placeItems: 'center' }}>
          <Sigil size={12} cut="warm" ground={A.ink} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15.5, fontWeight: 650, letterSpacing: '-0.02em' }}>Celestual Operations</span>
          <span style={{ fontSize: 12, color: A.faint, ...NUM }}>
            {data.now ? `Updated ${fmtTime(data.now)}` : 'Live'}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
          {busy && <span style={{ fontSize: 12.5, color: A.faint }}>Working…</span>}
          <Btn size="sm" onClick={() => load(password)}>Refresh</Btn>
          <Btn size="sm" onClick={lock}>Lock</Btn>
        </div>
      </header>

      {(err || flash) && (
        <div
          style={{
            marginBottom: 16, fontSize: 13.5, borderRadius: 2, padding: '10px 13px',
            background: err ? A.badSoft : A.goodSoft,
            border: `1px solid ${err ? 'rgba(142,59,46,0.3)' : 'rgba(63,107,69,0.3)'}`,
            color: err ? A.bad : A.good,
          }}
        >
          {err || flash}
        </div>
      )}

      {/* ── tabs + search ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <nav style={{ display: 'flex', gap: 3, background: A.bg, padding: 3, borderRadius: 2, flexWrap: 'wrap' }}>
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              style={{
                padding: '7px 13px', borderRadius: 2, border: 'none', cursor: 'pointer',
                background: tab === x.id ? A.surface : 'transparent',
                color: tab === x.id ? A.ink : A.muted,
                boxShadow: tab === x.id ? '0 1px 2px rgba(13,19,33,.08)' : 'none',
                fontFamily: FONT, fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.01em',
              }}
            >
              {x.label}
            </button>
          ))}
        </nav>
        {tab !== 'overview' && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            style={{
              flex: '1 1 180px', minWidth: 140, maxWidth: 320, boxSizing: 'border-box',
              padding: '8px 12px', borderRadius: 2, border: `1px solid ${A.line}`,
              outline: 'none', background: A.surface, fontFamily: FONT, fontSize: 13.5, color: A.ink,
            }}
          />
        )}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Stat label="Members" value={n(counts.members)} sub={`+${n(counts.new_7d)} in 7 days`} />
            <Stat label="Pings placed" value={n(counts.pings)} sub={`+${n(counts.pings_7d)} in 7 days`} />
            <Stat label="Matches" value={n(counts.matches)} />
            <Stat label="Competitors" value={n(counts.competitors)} sub={`${n(counts.visits)} link opens`} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Stat label="Stuck unverified" value={n(counts.unverified)} tone={Number(counts.unverified || 0) > 0 ? 'warn' : undefined} sub="people, not attempts" />
            <Stat label="Assumed at 20s" value={n(counts.assumed)} tone={Number(counts.assumed || 0) > 0 ? 'warn' : undefined} sub="the closed grace — historical" />
            <Stat label="Manual admits" value={n(counts.manual)} sub="let in by hand" />
            {/* 0020 — two tiles, because they are two different facts. A ban
                refuses an identity; an opt-out only means "nobody may enter
                this @". Showing them as one number is the habit that let a
                self-erase read as a ban for a week. */}
            <Stat
              label="Banned"
              value={n(counts.banned != null ? counts.banned : counts.suppressed)}
              tone={Number(counts.banned != null ? counts.banned : counts.suppressed || 0) > 0 ? 'bad' : undefined}
              sub="cannot verify"
            />
            <Stat label="Opted out" value={n(counts.opted_out)} sub="un-pingable by choice" />
          </div>

          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em' }}>Members over time</div>
                <div style={{ fontSize: 12.5, color: A.muted, marginTop: 2 }}>
                  Running total, last 30 days. Bars are that day&rsquo;s arrivals.
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: A.faint, ...NUM }}>{n(counts.members)} total</div>
            </div>
            <GrowthChart series={growth} />
          </Card>

          {/* the triage tool — the answer to "my code is right and nothing happens" */}
          <Card>
            <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em' }}>Look up an @</div>
            <div style={{ fontSize: 12.5, color: A.muted, marginTop: 2, marginBottom: 12 }}>
              Banned, opted out, or neither. Whether it&rsquo;s a member, and what its last verification attempts did.
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                checkHandle(lookup)
              }}
              style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}
            >
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="handle"
                style={{
                  flex: '1 1 200px', minWidth: 0, boxSizing: 'border-box', padding: '9px 12px',
                  borderRadius: 2, border: `1px solid ${A.line}`, outline: 'none',
                  background: '#fff', fontFamily: MONO, fontSize: 14, color: A.ink,
                }}
              />
              <Btn kind="primary" type="submit" disabled={busy || !lookup.trim()}>Check</Btn>
            </form>

            {status && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.lineSoft}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Handle>{status.handle}</Handle>
                  {status.banned ? <Pill tone="bad">Banned</Pill> : <Pill tone="good">Can verify</Pill>}
                  {status.opted_out && <Pill tone="warn">Opted out</Pill>}
                  {status.member ? <Pill tone="accent">Member</Pill> : <Pill>Not a member</Pill>}
                  {status.member_since && <span style={{ fontSize: 12.5, color: A.muted }}>since {fmtDate(status.member_since)}</span>}
                </div>
                {status.banned && (
                  <div style={{ fontSize: 13, color: A.body, background: A.badSoft, border: `1px solid rgba(142,59,46,0.3)`, borderRadius: 2, padding: '10px 12px', whiteSpace: 'normal' }}>
                    Banned. Every code this @ takes will be refused at the DM, which since 0026 is the only way in
                    at all. This is what &ldquo;that code lapsed&rdquo; really means when the code was correct.
                  </div>
                )}
                {status.opted_out && (
                  <div style={{ fontSize: 13, color: A.body, background: A.warnSoft, border: `1px solid rgba(138,92,51,0.3)`, borderRadius: 2, padding: '10px 12px', whiteSpace: 'normal' }}>
                    Asked never to be entered. Nobody can place a ping on this @, but they can still sign up
                    themselves. This is not a ban and never blocks verification.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(status.banned || status.opted_out) && (
                    <Armed
                      kind="good"
                      label={status.banned ? 'Lift the ban' : 'Lift the opt-out'}
                      armedLabel="Confirm lift"
                      onFire={() => act(adminUnbanUser, status.handle, 'Lifted for {h}.')}
                    />
                  )}
                  {!status.member && <Armed kind="good" label="Admit by hand" armedLabel="Confirm admit" onFire={() => act(adminVerifyUser, status.handle, '{h} admitted manually.')} />}
                  <Armed label="Clear pending codes" armedLabel="Confirm clear" kind="default" onFire={() => act(adminClearPending, status.handle, 'Cleared pending codes for {h}.')} />
                </div>
                <Table cols={['Code', 'State', 'Via', 'Started', 'Verified']} empty="No verification has ever been started for this @.">
                  {(status.verifications || []).map((v, i) => (
                    <Row key={i}>
                      <td style={cell()}><Code>{v.code}</Code></td>
                      <td style={cell()}>
                        {v.status === 'verified' ? <Pill tone="good">Verified</Pill> : v.live ? <Pill tone="accent">Waiting</Pill> : <Pill>Lapsed</Pill>}
                      </td>
                      <td style={cell()}>{v.status === 'verified' ? viaPill(v.via) : <span style={{ color: A.faint }}>—</span>}</td>
                      <td style={cell({ color: A.muted, ...NUM })}>{fmtTime(v.created_at)}</td>
                      <td style={cell({ color: A.muted, ...NUM })}>{v.verified_at ? fmtTime(v.verified_at) : '—'}</td>
                    </Row>
                  ))}
                </Table>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em', marginBottom: 10 }}>Latest activity</div>
            <Table cols={['When', 'Event', 'Who', 'Detail']}>
              {logs.slice(0, 12).map((l, i) => (
                <Row key={i}>
                  <td style={cell({ color: A.muted, ...NUM })}>{ago(l.at)}</td>
                  <td style={cell()}><LogKind kind={l.kind} /></td>
                  <td style={cell()}>{l.handle ? <Handle>{l.handle}</Handle> : <span style={{ color: A.faint }}>—</span>}</td>
                  <td style={cell({ color: A.muted, fontFamily: MONO, fontSize: 12.5 })}>{l.detail}</td>
                </Row>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {/* ══ USERS ══ */}
      {tab === 'users' && (
        <Card>
          <SectionHead title="Users" sub={`${fUsers.length} of ${users.length} · one row per member`} />
          <Table cols={['Handle', 'Verified via', 'Code', 'Joined', 'Pings', 'In', 'Matches', 'Source', { label: 'Actions', right: true }]}>
            {fUsers.map((u) => (
              <Row key={u.handle}>
                <td style={cell()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Handle>{u.handle}</Handle>
                    {u.suppressed && <Pill tone="bad">Banned</Pill>}
                    {u.opted_out && <Pill tone="warn">Opted out</Pill>}
                    {u.competitor && <Pill tone="accent">Competitor</Pill>}
                  </div>
                </td>
                <td style={cell()}>{viaPill(u.via)}</td>
                <td style={cell()}><Code>{u.code}</Code></td>
                <td style={cell({ color: A.muted, ...NUM })}>{fmtDate(u.first_verified_at)}</td>
                <td style={cell(NUM)}>{n(u.pings)}</td>
                <td style={cell({ color: A.muted, ...NUM })}>{n(u.received)}</td>
                <td style={cell({ color: Number(u.matches || 0) > 0 ? A.good : A.muted, fontWeight: Number(u.matches || 0) > 0 ? 650 : 400, ...NUM })}>{n(u.matches)}</td>
                <td style={cell({ color: A.muted, fontFamily: MONO, fontSize: 12.5 })}>{u.via_code || '—'}</td>
                <td style={cell({ textAlign: 'right' })}>
                  <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Btn size="sm" onClick={() => { setLookup(u.handle); setTab('overview'); checkHandle(u.handle) }}>Inspect</Btn>
                    {u.suppressed
                      ? <Armed kind="good" label="Unban" armedLabel="Confirm" onFire={() => act(adminUnbanUser, u.handle, 'Ban lifted for {h}.')} />
                      : <Armed label="Ban" armedLabel="Confirm ban" onFire={() => act(adminBanUser, u.handle, '{h} erased and banned.')} />}
                    <Armed label="Delete" armedLabel="Confirm delete" onFire={() => act(adminDeleteUser, u.handle, '{h} erased.')} />
                  </div>
                </td>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      {/* ══ UNVERIFIED ══ */}
      {tab === 'unverified' && (
        <Card>
          <SectionHead
            title="Unverified"
            sub={`${fUnver.length} people who started and never finished · one row each, newest code shown`}
          />
          <Table cols={['Handle', 'Latest code', 'Attempts', 'First tried', 'Last tried', 'State', { label: 'Actions', right: true }]} empty="Nobody is stuck. Everyone who started got in.">
            {fUnver.map((u) => (
              <Row key={u.handle}>
                <td style={cell()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Handle>{u.handle}</Handle>
                    {u.suppressed && <Pill tone="bad">Banned</Pill>}
                  </div>
                </td>
                <td style={cell()}><Code>{u.code}</Code></td>
                <td style={cell({ ...NUM, color: Number(u.attempts || 0) > 2 ? A.warn : A.body, fontWeight: Number(u.attempts || 0) > 2 ? 650 : 400 })}>
                  {n(u.attempts != null ? u.attempts : 1)}
                </td>
                <td style={cell({ color: A.muted, ...NUM })}>{fmtTime(u.first_at || u.created_at)}</td>
                <td style={cell({ color: A.muted, ...NUM })}>{fmtTime(u.last_at || u.created_at)}</td>
                <td style={cell()}>{u.live ? <Pill tone="accent">Code live</Pill> : <Pill>All lapsed</Pill>}</td>
                <td style={cell({ textAlign: 'right' })}>
                  <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Btn size="sm" onClick={() => { setLookup(u.handle); setTab('overview'); checkHandle(u.handle) }}>Inspect</Btn>
                    {u.suppressed
                      ? <Armed kind="good" label="Lift ban" armedLabel="Confirm" onFire={() => act(adminUnbanUser, u.handle, 'Ban lifted for {h}.')} />
                      : <Armed kind="good" label="Admit" armedLabel="Confirm admit" onFire={() => act(adminVerifyUser, u.handle, '{h} admitted manually.')} />}
                    <Armed label="Clear" armedLabel="Confirm clear" kind="default" onFire={() => act(adminClearPending, u.handle, 'Cleared pending codes for {h}.')} />
                  </div>
                </td>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      {/* ══ COMPETITORS ══ */}
      {tab === 'competitors' && (
        <Card>
          <SectionHead title="Trial competitors" sub={`${fComp.length} signed · ranked by credited signups`} />
          <Table cols={['Name', 'Handle', 'Email', 'Code', 'Opens', 'Signups', 'Signed', { label: 'Actions', right: true }]}>
            {fComp.map((c) => (
              <Row key={c.handle}>
                <td style={cell({ color: A.ink, fontWeight: 400 })}>{c.name || '—'}</td>
                <td style={cell()}><Handle>{c.handle}</Handle></td>
                <td style={cell({ color: A.muted, fontSize: 12.5 })}>{c.email || '—'}</td>
                <td style={cell()}>
                  <a
                    href={`https://celestual.us/${c.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: MONO, fontSize: 13, fontWeight: 650, color: A.accent, textDecoration: 'none' }}
                  >
                    /{c.code}
                  </a>
                </td>
                <td style={cell(NUM)}>{n(c.visits)}</td>
                <td
                  style={cell({ ...NUM, color: Number(c.signups || 0) > 0 ? A.good : A.muted, fontWeight: Number(c.signups || 0) > 0 ? 650 : 400 })}
                  title={(c.signup_handles || []).map((h) => '@' + h).join('  ')}
                >
                  {n(c.signups)}
                </td>
                <td style={cell({ color: A.muted, ...NUM })}>{fmtDate(c.signed_at)}</td>
                <td style={cell({ textAlign: 'right' })}>
                  <Armed label="Remove" armedLabel="Confirm remove" onFire={() => act(adminDeleteCompetitor, c.handle, '{h} removed from the trial.')} />
                </td>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      {/* ══ LOGS ══ */}
      {tab === 'logs' && (
        <Card>
          <SectionHead title="Activity log" sub={`${fLogs.length} events · verifications, pings, matches, trial signups, lockouts, failed logins`} />
          <Table cols={['When', 'Event', 'Who', 'Detail']}>
            {fLogs.slice(0, 300).map((l, i) => (
              <Row key={i}>
                <td style={cell({ color: A.muted, ...NUM })} title={fmtTime(l.at)}>{ago(l.at)}</td>
                <td style={cell()}><LogKind kind={l.kind} /></td>
                <td style={cell()}>{l.handle ? <Handle>{l.handle}</Handle> : <span style={{ color: A.faint }}>—</span>}</td>
                <td style={cell({ color: A.muted, fontFamily: MONO, fontSize: 12.5 })}>{l.detail}</td>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      <div style={{ marginTop: 28, fontSize: 12, color: A.faint, textAlign: 'center' }}>
        Every action here is server-checked. Destructive buttons arm on the first tap and fire on the second.
      </div>
    </div>,
  )
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: A.muted, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function LogKind({ kind }) {
  const map = {
    verified: ['good', 'Verified'],
    code: [null, 'Code issued'],
    ping: ['accent', 'Ping'],
    match: ['good', 'Match'],
    trial: ['accent', 'Trial signup'],
    blocked: ['bad', 'Banned'],
    optout: ['warn', 'Opted out'],
    admin_fail: ['warn', 'Bad password'],
  }
  const [tone, label] = map[kind] || [null, kind]
  return <Pill tone={tone}>{label}</Pill>
}

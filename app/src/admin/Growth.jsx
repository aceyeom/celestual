// ── the graph ───────────────────────────────────────────────────────────────
//
// One chart, two views, and the controls a person actually reaches for: how
// far back, how fine, which lines. Drawn as SVG from the series migration 0039
// returns, with one axis, thin lines, a legend that is also the switch for
// each line, a crosshair that reads every visible series at once, and the
// same numbers as a table one press away, so nothing here is only reachable
// by pointing at it.
//
//   growth     people in total, and how many of them have proved a handle.
//              Running totals, so the line only ever goes up.
//   activity   what happened in each day, week or month: new people, handles
//              proved, pings placed, mutuals, letters written.
//
// The two are two views rather than one chart because a running total in the
// hundreds and a per day count in the ones cannot share an axis, and a second
// axis is the one thing a chart must never grow.
//
// The five series colours are the desk's own (desk.css, --ad-s1 to --ad-s5),
// chosen for a dark ground and checked for a colour blind reader as a set.
// Text never wears them: the swatch beside a word carries the identity.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deskGrowth } from '../api/admin.js'
import { Tabs, Btn, Empty } from './parts.jsx'

const VIEWS = {
  growth: {
    word: 'people, in total',
    series: [
      { key: 'users_total', word: 'people', color: 'var(--ad-s1)' },
      { key: 'handles_total', word: 'with a proved handle', color: 'var(--ad-s2)' },
    ],
  },
  activity: {
    word: 'what happened',
    series: [
      { key: 'users', word: 'new people', color: 'var(--ad-s1)' },
      { key: 'handles', word: 'handles proved', color: 'var(--ad-s2)' },
      { key: 'pings', word: 'pings placed', color: 'var(--ad-s3)' },
      { key: 'mutuals', word: 'mutuals', color: 'var(--ad-s4)' },
      { key: 'letters', word: 'letters written', color: 'var(--ad-s5)' },
    ],
  },
}

const RANGES = [
  { value: '7', label: '7 days', days: 7, grain: 'day' },
  { value: '30', label: '30 days', days: 30, grain: 'day' },
  { value: '90', label: '90 days', days: 90, grain: 'week' },
  { value: '365', label: 'a year', days: 365, grain: 'week' },
  { value: '0', label: 'all', days: 0, grain: 'month' },
]
const GRAINS = [
  { value: 'day', label: 'by day' },
  { value: 'week', label: 'by week' },
  { value: 'month', label: 'by month' },
]
const VIEW_TABS = [
  { value: 'growth', label: 'people, in total' },
  { value: 'activity', label: 'what happened' },
]

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function dateWord(t, grain) {
  const [y, m, d] = String(t).split('-').map(Number)
  if (grain === 'month') return `${MONTHS[m - 1]} ${y}`
  return `${MONTHS[m - 1]} ${d}`
}

// A clean ceiling for the axis: 1, 2, 5 times a power of ten, at or above the
// largest value, and never below 5 so an empty range still has a scale.
function niceCeil(v) {
  if (v <= 5) return 5
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p
  return 10 * p
}

export default function Growth({ password, onLock }) {
  const [view, setView] = useState('growth')
  const [range, setRange] = useState('30')
  const [grainPick, setGrainPick] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())
  const [table, setTable] = useState(false)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const seq = useRef(0)

  const r = RANGES.find((x) => x.value === range) || RANGES[1]
  const grain = grainPick || r.grain

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const out = await deskGrowth(password, { days: r.days, grain })
    if (mine !== seq.current) return
    if (out?.error === 'password') { onLock && onLock(); return }
    setData(out && out.ok ? out : { rows: [], error: out?.error || 'network' })
    setBusy(false)
  }, [password, r.days, grain, onLock])

  useEffect(() => { load() }, [load])

  const series = VIEWS[view].series
  const shown = series.filter((s) => !hidden.has(s.key))
  const rows = data?.rows || []

  const toggle = (key) => setHidden((h) => {
    const n = new Set(h)
    if (n.has(key)) n.delete(key); else if (shown.length > 1) n.add(key)
    return n
  })

  return (
    <div className="ad-chart">
      <div className="ad-chart-controls">
        <Tabs value={view} onChange={(v) => { setView(v); setHidden(new Set()) }} options={VIEW_TABS} />
        <Tabs value={range} onChange={(v) => { setRange(v); setGrainPick(null) }} options={RANGES.map(({ value, label }) => ({ value, label }))} />
        <Tabs value={grain} onChange={setGrainPick} options={GRAINS} />
        <Btn onClick={() => setTable((t) => !t)}>{table ? 'as a graph' : 'as a table'}</Btn>
      </div>

      {/* The legend is the switch for each line. It stays even with one line
          showing, because it is how the others come back. */}
      <div className="ad-legend" role="group" aria-label="the lines">
        {series.map((s) => (
          <button
            key={s.key} type="button" aria-pressed={!hidden.has(s.key)}
            className={`ad-legend-k${hidden.has(s.key) ? ' is-off' : ''}`}
            onClick={() => toggle(s.key)}
          >
            <span className="ad-swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.word}
          </button>
        ))}
      </div>

      {busy && !data ? <Empty>reading</Empty>
        : data?.error ? <Empty>the series could not be read.</Empty>
          : table ? <SeriesTable rows={rows} series={shown} grain={grain} />
            : <Chart rows={rows} series={shown} grain={grain} busy={busy} />}

      <p className="ad-chart-note">
        {view === 'growth'
          ? 'running totals: every person who ever proved something, and how many of them proved a handle.'
          : 'per ' + grain + '. pings and mutuals are counted off the live tables, and the sixty day sweep takes lapsed pings with it, so those two only reach back as far as the sweep lets them.'}
      </p>
    </div>
  )
}

function SeriesTable({ rows, series, grain }) {
  if (!rows.length) return <Empty>nothing in this range.</Empty>
  return (
    <div className="ad-scroll">
      <table className="ad-table is-series">
        <thead>
          <tr>
            <th>{grain}</th>
            {series.map((s) => <th key={s.key} className="is-num">{s.word}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice().reverse().map((row) => (
            <tr key={row.t}>
              <td><span className="ad-id is-dim">{dateWord(row.t, grain)}</span></td>
              {series.map((s) => <td key={s.key} className="is-num">{Number(row[s.key] || 0).toLocaleString()}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const H = 250
const PAD = { l: 44, r: 16, t: 14, b: 28 }

function Chart({ rows, series, grain, busy }) {
  const box = useRef(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const set = () => setW(Math.max(280, Math.round(el.clientWidth)))
    set()
    const ro = window.ResizeObserver ? new ResizeObserver(set) : null
    if (ro) ro.observe(el)
    return () => { if (ro) ro.disconnect() }
  }, [])

  const n = rows.length
  const max = useMemo(() => {
    let m = 0
    for (const row of rows) for (const s of series) m = Math.max(m, Number(row[s.key] || 0))
    return niceCeil(m)
  }, [rows, series])
  const empty = useMemo(() => rows.every((row) => series.every((s) => !Number(row[s.key] || 0))), [rows, series])

  const x = (i) => PAD.l + (n > 1 ? (i / (n - 1)) * (w - PAD.l - PAD.r) : (w - PAD.l - PAD.r) / 2)
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  // About five dates along the bottom, always including the first and last.
  const every = Math.max(1, Math.ceil(n / 5))
  const xLabels = rows.map((row, i) => ({ i, t: row.t })).filter((p) => p.i % every === 0 || p.i === n - 1)
    .filter((p, k, arr) => !(p.i === n - 1 && arr.length > 1 && n - 1 - arr[arr.length - 2].i < every / 2))

  // Direct labels at the right end, when there are few enough lines for them
  // to stay apart. Past three, the legend and the crosshair carry it.
  const ends = useMemo(() => {
    if (!n || series.length > 3) return []
    const pts = series.map((s) => ({ s, y: y(Number(rows[n - 1][s.key] || 0)), v: Number(rows[n - 1][s.key] || 0) }))
      .sort((a, b) => a.y - b.y)
    for (let i = 1; i < pts.length; i++) if (pts[i].y - pts[i - 1].y < 13) pts[i].y = pts[i - 1].y + 13
    return pts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, series, n, max, w])

  const onMove = (e) => {
    if (!n) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n > 1 ? Math.round(((px - PAD.l) / (w - PAD.l - PAD.r)) * (n - 1)) : 0
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const hv = hover != null && rows[hover] ? rows[hover] : null

  return (
    <div className={`ad-chart-box${busy ? ' is-busy' : ''}`} ref={box}>
      <svg
        width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img"
        aria-label={`${series.map((s) => s.word).join(', ')} over ${n} ${grain}s`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}
      >
        {/* the grid: hairlines, recessive */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} className="ad-grid" />
            <text x={PAD.l - 8} y={y(t) + 3.5} className="ad-axis" textAnchor="end">{t.toLocaleString()}</text>
          </g>
        ))}
        {xLabels.map((p) => (
          <text key={p.i} x={x(p.i)} y={H - 8} className="ad-axis" textAnchor={p.i === 0 ? 'start' : p.i === n - 1 ? 'end' : 'middle'}>
            {dateWord(p.t, grain)}
          </text>
        ))}

        {/* the lines, 2px, round joins */}
        {series.map((s) => (
          <path
            key={s.key}
            d={rows.map((row, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(row[s.key] || 0)).toFixed(1)}`).join(' ')}
            fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          />
        ))}

        {/* the end markers, ringed in the surface so they read over a crossing line */}
        {n ? series.map((s) => (
          <circle key={s.key} cx={x(n - 1)} cy={y(Number(rows[n - 1][s.key] || 0))} r="4" fill={s.color} className="ad-dot" />
        )) : null}

        {/* the end labels */}
        {ends.map((p) => (
          <text key={p.s.key} x={x(n - 1) - 8} y={p.y - 7} className="ad-axis is-end" textAnchor="end">
            {p.v.toLocaleString()} {p.s.word}
          </text>
        ))}

        {/* the crosshair */}
        {hv ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="ad-cross" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(Number(hv[s.key] || 0))} r="4.5" fill={s.color} className="ad-dot" />
            ))}
          </g>
        ) : null}
      </svg>

      {empty && !busy ? <div className="ad-chart-empty">nothing yet in this range.</div> : null}

      {hv ? (
        <div className="ad-tip" style={{ left: `${Math.min(Math.max(x(hover), 120), w - 120)}px` }} role="status" aria-live="polite">
          <div className="ad-tip-t">{dateWord(hv.t, grain)}</div>
          {series.map((s) => (
            <div key={s.key} className="ad-tip-row">
              <span className="ad-swatch" style={{ background: s.color }} aria-hidden="true" />
              <strong>{Number(hv[s.key] || 0).toLocaleString()}</strong>
              <span>{s.word}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── the desk's parts ────────────────────────────────────────────────────────
//
// Phase 7. Six small things, and they exist because six screens need the same
// six and a table that disagrees with the table next to it about what "removed"
// looks like is a table somebody misreads.
//
// The wall's own parts are used where they fit (Label, Rule, the mark). These
// are the ones a console needs and a product surface does not.
import { useEffect, useRef, useState } from 'react'

// ── when ────────────────────────────────────────────────────────────────────
// Two registers, and which one is used is a judgement about what the reader is
// doing. In a table: how long ago, because the question is "is this recent".
// Opened: the timestamp, because the question is "exactly when".
export function ago(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 60) return `${d}d`
  return `${Math.round(d / 30)}mo`
}

export function stamp(iso) {
  if (!iso) return 'never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function When({ at, exact = false }) {
  if (!at) return <span className="ad-when">never</span>
  return <span className="ad-when" title={stamp(at)}>{exact ? stamp(at) : ago(at)}</span>
}

// ── state ───────────────────────────────────────────────────────────────────
// One place that decides what a status word looks like, so the moderation queue
// and the report queue cannot drift apart about it.
const TONES = {
  live: 'is-live', pass: 'is-live', revealed: 'is-live', dismissed: 'is-live', open: 'is-hold',
  pending: 'is-hold', review: 'is-hold', hold: 'is-hold',
  rejected: 'is-stop', removed: 'is-stop', reject: 'is-stop', upheld: 'is-stop', blocked: 'is-stop',
}
export function State({ children, tone }) {
  const word = String(children || '')
  return <span className={`ad-state ${tone || TONES[word] || 'is-off'}`}>{word}</span>
}

// An absence, which is not a state and must not be drawn as one.
export function None({ children = 'none' }) {
  return <span className="ad-none">{children}</span>
}

// ── the ledger ──────────────────────────────────────────────────────────────
// Four columns, and the last row is padded with cells that draw nothing but
// their rule. Without the padding a group of ten ends on a half empty row with
// the hairline stopping in the middle of the page, which reads as a block that
// failed to finish rather than as a block that is ten long.
const COLS = 4
export function Ledger({ label, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  const pad = (COLS - (items.length % COLS)) % COLS
  return (
    <>
      {label ? <div className="wl-label ad-ledger-label">{label}</div> : null}
      <div className="ad-ledger">
        {items}
        {Array.from({ length: pad }, (_, i) => <div key={`pad${i}`} className="ad-fig is-pad" aria-hidden="true" />)}
      </div>
    </>
  )
}

export function Figure({ n, of, live = false }) {
  const zero = !n
  return (
    <div className="ad-fig">
      <span className={`ad-fig-n ${live && n ? 'is-live' : zero ? 'is-zero' : ''}`}>
        {typeof n === 'number' ? n.toLocaleString() : n}
      </span>
      <span className="ad-fig-t">{of}</span>
    </div>
  )
}

// ── the two tap button ──────────────────────────────────────────────────────
// A destructive action arms on the first press and acts on the second, and the
// armed label says what it is about to do. It disarms on its own after four
// seconds, so a person who walked away does not come back to a live trigger.
export function Arm({ children, armed: armedLabel, onAct, tone = 'stop', disabled = false, title }) {
  // tone 'quiet' arms the same way and carries no colour until it is armed. It
  // is for an act that costs something without destroying anything, like
  // spending one Apify call: nine red bordered buttons down the right edge of a
  // table stop meaning "careful" and start meaning "table".

  const [armed, setArmed] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function press() {
    if (armed) {
      clearTimeout(timer.current)
      setArmed(false)
      onAct()
      return
    }
    setArmed(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), 4000)
  }

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={press}
      className={`ad-btn ${tone === 'quiet' ? '' : `is-${tone}`} ${armed ? 'is-armed' : ''}`}
    >
      {armed ? armedLabel || 'sure?' : children}
    </button>
  )
}

export function Btn({ children, onClick, tone = '', disabled = false, title, type = 'button' }) {
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`ad-btn ${tone && `is-${tone}`}`}>
      {children}
    </button>
  )
}

// ── search ──────────────────────────────────────────────────────────────────
// Debounced, because every keystroke here is a database query behind an edge
// function, and a person typing a handle produces eleven of them.
export function Search({ value, onChange, placeholder = 'search', prefix = '' }) {
  return (
    <label className="ad-search">
      {prefix ? <span className="ad-search-k">{prefix}</span> : null}
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  )
}

export function useDebounced(value, ms = 320) {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return out
}

// ── filter ──────────────────────────────────────────────────────────────────
export function Tabs({ value, onChange, options }) {
  return (
    <div className="ad-tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.n === 'number' ? ` ${o.n}` : ''}
        </button>
      ))}
    </div>
  )
}

// ── the page ────────────────────────────────────────────────────────────────
export function Paging({ total, limit, offset, onOffset }) {
  const from = total ? offset + 1 : 0
  const to = Math.min(offset + limit, total)
  return (
    <div className="ad-paging">
      <span className="ad-count">{total ? `${from} to ${to} of ${total.toLocaleString()}` : 'nothing here'}</span>
      <Btn disabled={offset <= 0} onClick={() => onOffset(Math.max(0, offset - limit))}>back</Btn>
      <Btn disabled={to >= total} onClick={() => onOffset(offset + limit)}>next</Btn>
    </div>
  )
}

export function Empty({ children }) {
  return <div className="ad-empty"><p>{children}</p></div>
}

// ── a definition list ───────────────────────────────────────────────────────
export function Def({ items }) {
  return (
    <dl className="ad-def">
      {items.filter((i) => i).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v === null || v === undefined || v === '' ? 'none' : v}</dd>
        </div>
      ))}
    </dl>
  )
}

// The classifier's own words, kept and shown. Spec section 9 stores a rejection
// with its reason so a person can tell whether the screen is working, and a
// reason nobody can read is a reason nobody can check.
export function Json({ value }) {
  if (!value) return null
  return <pre className="ad-json">{JSON.stringify(value, null, 2)}</pre>
}

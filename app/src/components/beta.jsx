// beta.jsx — the /beta world: everything the beta route layers on top of the demo
// sandbox. Two features live here:
//
//   · the INTENT SIGNAL — an optional line sealed with a star, invisible while
//     one-sided, both revealed only on a mutual match. Every line is written to
//     survive a screenshot: you're giving something (an apology, an unsaid
//     truth), never begging. At the mutual moment the pronouns flip — you seal
//     "i owe them an apology", they read "i owe you an apology".
//   · CONSTELLATIONS — communities sharing one sky. Anyone can name one and
//     share one link; everyone who joins can share it again. There is NO
//     waitlist anywhere: a constellation is live the moment it exists. Matching
//     stays GLOBAL — a constellation is distribution and density, never a
//     matching boundary. Counts obey the 100 rule: hidden under 100, shown
//     large at 100+, plus an aggregate weekly pulse (never individuals).
//
// Design language: no bordered card stacks. Everything here is frameless and
// editorial — serif names, hairline rules, negative space, the living galaxy
// behind — matching the star readout, not a settings form. Each community gets
// a PROCEDURAL CONSTELLATION GLYPH: a unique star-pattern seeded from its name,
// so "pomona college" always draws the same tiny constellation and no two
// communities look alike.
//
// The wording rule from the referral-chains doc is load-bearing: the share copy
// talks about the community moving ("This is spreading in your world. Join it."),
// never about an individual's feelings. Keep it that way.
import * as React from 'react'
import { useI18n } from '../i18n/index.js'
import { rgba, RADIUS, SPACE, makeShadow } from '../theme.js'
import { Glisten, Brandmark, PrimaryButton, GhostButton, BackBtn, Icon } from './ui.jsx'

// The five intent lines (persona-mapped: the still-in-love, the apologizer, the
// one who never said it, the drifted friend, the closure-seeker). Ids resolve
// via `intent.<id>` (the pick form, third person) and `intent.<id>.r` (the
// reveal form shown to the other person, second person where it differs).
// Three of the five aren't romantic — the product carries EVERYTHING unsaid
// (apologies, lost friendships), not only crushes. These five are free forever.
export const INTENTS = ['miss', 'sorry', 'unsaid', 'drift', 'know']

// Nova's write-your-own line rides the same intent pipeline as 'custom:<text>' —
// sealed, hidden while one-sided, revealed only at a mutual match, exactly like
// the five. (The five stay free; only AUTHORING a new line is Nova's.)
export const isCustomIntent = (v) => typeof v === 'string' && v.startsWith('custom:')
export const customIntentText = (v) => (isCustomIntent(v) ? v.slice(7) : '')
// Resolve any intent value to its display line. `reveal` = the form the OTHER
// person reads at the mutual moment (pronouns flip where the canned line allows).
export const intentLine = (t, v, reveal) => {
  if (!v) return ''
  if (isCustomIntent(v)) return customIntentText(v)
  return t('intent.' + v + (reveal ? '.r' : ''))
}

// The 100 rule: a small number feels empty and can expose who's in it; a large
// number feels real and hides everyone inside it.
export const showCount = (n) => Number.isFinite(n) && n >= 100

// A join link carries only the constellation's name — the beta is sandboxed, so
// there's no server id to reference.
const shareLink = (name) => `${window.location.origin}/beta?c=${encodeURIComponent(name)}`

// ── seeded randomness (one hash stream per name) ──────────────────────────────
function hashStream(name) {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

// Deterministic, plausible size for a constellation arriving via an invite link
// (the sandbox has no server to ask). Spans the 100 rule so both states demo.
export function inviteCount(name) {
  const rnd = hashStream(name)
  return 40 + Math.floor(rnd() * 360)
}

// The aggregate weekly pulse for a visible (100+) constellation — community
// motion, never a person. Seeded so it's stable per name.
function weeklyPulse(name) {
  const rnd = hashStream(name + '·pulse')
  return 6 + Math.floor(rnd() * 34)
}

// THE WEEKLY FEELING — the community's most-sealed line this week ("this week
// here — 'i miss them'"). An AGGREGATE of intent categories, counts only, and
// gated by the 100 rule: under 100 members an aggregate could start pointing at
// people (I-1), so it simply never shows. At 100+ it's the constellation's
// heartbeat — and its most screenshottable line. Seeded per name in the sandbox;
// a live backend would return the real weekly aggregate.
function weeklyFeeling(name) {
  const rnd = hashStream(name + '·feel')
  return INTENTS[Math.floor(rnd() * INTENTS.length)]
}

// SEAL NIGHT — one night the whole constellation seals together. A community
// ritual (the strongest antidote to "doing this alone feels weak"), NEVER an
// expiring offer: no deadlines on feelings, nothing is lost if you miss it
// (I-5). Seeded 2–6 days out per name; stable within a visit.
function sealNight(name) {
  const rnd = hashStream(name + '·night')
  const days = 2 + Math.floor(rnd() * 5)
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}
function nightDay(name, lang) {
  try {
    return new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(sealNight(name)).toLowerCase()
  } catch {
    return ''
  }
}

// Seeded joinable constellations so the screen demos the whole loop cold.
const SUGGESTED = [
  { name: 'pomona college', count: 214 },
  { name: 'the marching band', count: 47 },
  { name: 'sf climbing gym', count: 131 },
]

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// ── THE CONSTELLATION GLYPH ────────────────────────────────────────────────────
// Every community draws as its own constellation: 4–7 stars placed by the name's
// hash, chained by hairlines in angular order (so the line arcs, never
// scribbles), one star burning in the warm accent. The same name always draws
// the same figure — a mark the community can recognize as its own.
function glyphPoints(name) {
  const rnd = hashStream(name.toLowerCase())
  const n = 4 + Math.floor(rnd() * 4)
  const pts = Array.from({ length: n }, () => ({ x: 0.14 + rnd() * 0.72, y: 0.14 + rnd() * 0.72 }))
  const cx = pts.reduce((a, p) => a + p.x, 0) / n
  const cy = pts.reduce((a, p) => a + p.y, 0) / n
  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  const main = Math.floor(rnd() * n)
  return pts.map((p, i) => ({ ...p, main: i === main }))
}

export function ConstellationGlyph({ C, name, size = 44 }) {
  const pts = React.useMemo(() => glyphPoints(name || '✦'), [name])
  const s = size
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * s).toFixed(1)} ${(p.y * s).toFixed(1)}`).join(' ')
  const rMain = Math.max(2.1, s * 0.028)
  const rDot = Math.max(1.1, s * 0.014)
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <path d={d} fill="none" stroke={rgba(C.cream, 0.22)} strokeWidth="1" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * s}
          cy={p.y * s}
          r={p.main ? rMain : rDot}
          fill={p.main ? C.you : rgba(C.cream, 0.72)}
          style={p.main ? { filter: `drop-shadow(0 0 ${Math.max(3, s * 0.05)}px ${rgba(C.you, 0.9)})` } : undefined}
        />
      ))}
    </svg>
  )
}

// ── small furniture (mirrors screens.jsx so beta reads identically) ────────────
function MonoLabel({ C, children, optional, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
      <span style={{ fontSize: 11, letterSpacing: '1.5px', fontFamily: "'Space Mono', monospace", color: C.muted, textTransform: 'uppercase' }}>{children}</span>
      {optional && (
        <span style={{ fontSize: 10.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(accent || C.you, 0.92), background: rgba(accent || C.you, 0.1), border: `1px solid ${rgba(accent || C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

function QuietHint({ C, icon, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: C.muted, fontSize: 12, lineHeight: 1.5, padding: '0 2px' }}>
      {icon && <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={13} color={color || C.muted} /></span>}
      <span>{children}</span>
    </div>
  )
}

// A hairline that fades at both ends — the same rule language as the account
// sheet and the star readout, instead of card borders.
function HairRule({ C }) {
  return (
    <span
      aria-hidden
      style={{ display: 'block', height: 1, width: '100%', background: `linear-gradient(90deg, transparent, ${rgba(C.cream, 0.13)} 18%, ${rgba(C.cream, 0.13)} 82%, transparent)` }}
    />
  )
}

// The tiny mono pill that marks the beta world (landing + constellations header).
export function BetaChip({ C }) {
  const { t } = useI18n()
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: rgba(C.you, 0.92), background: rgba(C.you, 0.08), border: `1px solid ${rgba(C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '3px 10px' }}>
      {t('beta.chip')}
    </span>
  )
}

// ── INTENT PICKER (them screen) ────────────────────────────────────────────────
// No boxes, no form chrome: the lines sit bare on the page in the headline serif
// italic — feelings, not fields. Tapping one ignites it (a rose ✦ and a soft
// glow); tapping again releases it. Reads like choosing an inscription.
//
// The sixth row is Nova's "write your own": the five canned lines are free
// forever; only AUTHORING is behind the tier. Locked, it's one quiet line with a
// small nova mark — never a box, never urgency; tapping it opens the Nova sheet.
export function IntentPicker({ C, value, onChange, nova, onNovaOpen }) {
  const { t } = useI18n()
  const customOn = isCustomIntent(value)
  const customRef = React.useRef(null)
  React.useEffect(() => {
    if (customOn && customRef.current) customRef.current.focus()
  }, [customOn])
  const line = (on) => ({
    fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17.5, lineHeight: 1.35,
    color: on ? C.cream : rgba(C.muted, 0.9),
    textShadow: on ? `0 0 24px ${rgba(C.them, 0.4)}` : 'none',
    transition: 'color .25s, text-shadow .25s',
  })
  const bullet = (on) => ({
    width: 13, flexShrink: 0, color: C.them, fontSize: 12, opacity: on ? 1 : 0.18,
    transition: 'opacity .25s, text-shadow .25s', textShadow: on ? `0 0 10px ${rgba(C.them, 0.85)}` : 'none',
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
      <MonoLabel C={C} optional={t('intent.optional')} accent={C.them}>{t('intent.label')}</MonoLabel>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '2px 0' }}>
        {INTENTS.map((id) => {
          const on = value === id
          return (
            <button
              key={id}
              onClick={() => onChange(on ? '' : id)}
              style={{ display: 'flex', alignItems: 'baseline', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '7px 2px' }}
            >
              <span aria-hidden style={bullet(on)}>{on ? '✦' : '·'}</span>
              <span style={line(on)}>{t('intent.' + id)}</span>
            </button>
          )
        })}
        {/* nova: write your own — additive only; nothing above is ever locked */}
        {nova && !nova.active ? (
          <button
            onClick={onNovaOpen}
            style={{ display: 'flex', alignItems: 'baseline', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '7px 2px' }}
          >
            <span aria-hidden style={bullet(false)}>·</span>
            <span style={line(false)}>{t('intent.custom')}</span>
            <span aria-hidden style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: rgba(C.you, 0.75), alignSelf: 'center' }}>
              ✧ nova
            </span>
          </button>
        ) : nova && nova.active && !customOn ? (
          <button
            onClick={() => onChange('custom:')}
            style={{ display: 'flex', alignItems: 'baseline', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '7px 2px' }}
          >
            <span aria-hidden style={bullet(false)}>·</span>
            <span style={line(false)}>{t('intent.custom')}</span>
          </button>
        ) : nova && nova.active && customOn ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 2px' }}>
            <span aria-hidden style={bullet(true)}>✦</span>
            <input
              ref={customRef}
              type="text"
              value={customIntentText(value)}
              onChange={(e) => onChange('custom:' + e.target.value.slice(0, 90))}
              onKeyDown={(e) => {
                // an emptied line releases back to "nothing chosen"
                if (e.key === 'Escape' || (e.key === 'Backspace' && customIntentText(value) === '')) onChange('')
              }}
              placeholder={t('intent.customPlaceholder')}
              aria-label={t('intent.custom')}
              maxLength={90}
              style={{
                flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none',
                borderBottom: `1px solid ${rgba(C.them, 0.35)}`, paddingBottom: 2,
                fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17.5, lineHeight: 1.35,
                color: C.cream, caretColor: C.them,
              }}
            />
          </div>
        ) : null}
      </div>
      <QuietHint C={C} icon="lock" color={rgba(C.them, 0.85)}>{t('intent.note')}</QuietHint>
    </div>
  )
}

// ── INTENT REVEAL (match screen) ───────────────────────────────────────────────
// The unsealing. Your line stays in your words ("i owe them an apology"); theirs
// arrives flipped to face you ("i owe you an apology") — the line they sealed
// about you, finally addressed to you. `youCol`/`themCol` carry each side's seal
// light — pure colour, no badge, no branding (I-4).
export function IntentReveal({ C, you, them, youCol, themCol }) {
  const { t } = useI18n()
  const rows = [
    you && { key: 'you', label: t('match.you'), col: youCol || C.you, line: intentLine(t, you) },
    them && { key: 'them', label: t('match.them'), col: themCol || C.them, line: intentLine(t, them, true) },
  ].filter(Boolean)
  if (!rows.length) return null
  return (
    <div className="enter" style={{ animationDelay: '.18s', marginTop: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, width: '100%' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted }}>
        {t('match.revealKicker')}
      </span>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: r.col }}>{r.label}</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.3, color: C.cream }}>“{r.line}”</span>
        </div>
      ))}
    </div>
  )
}

// ── CONSTELLATIONS ─────────────────────────────────────────────────────────────
// Shared centered column — same shell geometry as every other screen. Sits over
// the LIVE galaxy (App renders it behind), so the screen belongs to the cosmos
// instead of floating on a flat panel.
function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'max(40px, env(safe-area-inset-top)) clamp(20px, 5vw, 40px) max(28px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

// One constellation's size under the 100 rule, plus the aggregate weekly pulse
// once it's visible. Always the community moving — never a person.
function CountLine({ C, name, count, pulse }) {
  const { t } = useI18n()
  if (!showCount(count)) {
    return (
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.muted }}>
        ✦ {t('constel.gathering')}
      </span>
    )
  }
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.you }}>
      ✦ {t('constel.count', { n: count })}
      {pulse && <span style={{ color: C.muted }}> · {t('constel.pulse', { n: weeklyPulse(name) })}</span>}
    </span>
  )
}

// The weekly feeling, as its own quiet serif line — only ever for a 100+
// constellation (see weeklyFeeling above for why the gate is absolute).
function FeelingLine({ C, name, count, lang }) {
  const { t } = useI18n()
  if (!showCount(count)) return null
  const [pre, post] = t('constel.feeling', { line: '\u2028' }).split('\u2028')
  return (
    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>
      {pre}
      <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: rgba(C.cream, 0.85) }}>
        {intentLine(t, weeklyFeeling(name))}
      </em>
      {post}
    </span>
  )
}

// The seal-night chip — the ritual on the calendar, not a countdown clock.
function NightChip({ C, name }) {
  const { t, lang } = useI18n()
  const day = nightDay(name, lang)
  if (!day) return null
  return (
    <span style={{ alignSelf: 'flex-start', fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: rgba(C.you, 0.9), background: rgba(C.you, 0.07), border: `1px solid ${rgba(C.you, 0.25)}`, borderRadius: RADIUS.chip, padding: '2px 9px' }}>
      {t('constel.night', { day })}
    </span>
  )
}

// A community name input, visually the same family as Field (ink panel, hairline
// border, shared soft corner) but plain text — community names have spaces.
function NameField({ C, value, onChange, placeholder, autoFocus, onEnter }) {
  const [focus, setFocus] = React.useState(false)
  const SHADOW = makeShadow(C)
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus])
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', padding: '15px 17px',
        borderRadius: RADIUS.field, background: C.ink2,
        border: `1.5px solid ${focus ? rgba(C.you, 0.8) : C.line}`,
        boxShadow: focus ? SHADOW.focus(C.you) : 'none',
        transition: 'border-color .2s, box-shadow .25s',
      }}
    >
      <Icon name="star" size={18} color={rgba(C.you, 0.9)} stroke={1.7} />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s+/g, ' ').slice(0, 48))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, color: C.cream, letterSpacing: '.2px' }}
      />
    </div>
  )
}

// One frameless constellation entry: its glyph, its name in the headline serif,
// its count/pulse, and one quiet way to carry it further. The share link lives
// in the text column (not floated right) so the pulse line can wrap freely.
function ConstelRow({ C, c, copied, onShare }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 0' }}>
      <div style={{ paddingTop: 2 }}>
        <ConstellationGlyph C={C} name={c.name} size={46} />
      </div>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 21, lineHeight: 1.1, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: rgba(C.muted, 0.85), flexShrink: 0 }}>
            {c.role === 'created' ? t('constel.created') : t('constel.joined')}
          </span>
        </div>
        <CountLine C={C} name={c.name} count={c.count} pulse />
        <FeelingLine C={C} name={c.name} count={c.count} />
        <NightChip C={C} name={c.name} />
        <GhostButton C={C} onClick={onShare} style={{ alignSelf: 'flex-start', padding: '3px 0', fontSize: 12.5, color: copied ? C.you : rgba(C.you, 0.9) }}>
          {copied ? t('constel.shared') : <>{t('constel.share')} →</>}
        </GhostButton>
      </div>
    </div>
  )
}

export function ConstellationsScreen({ C, ctx }) {
  const { t } = useI18n()
  const [naming, setNaming] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [copiedId, setCopiedId] = React.useState('')
  const copyTimer = React.useRef(null)
  React.useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const mine = ctx.constellations
  const has = (name) => mine.some((c) => c.name.toLowerCase() === name.toLowerCase())
  const suggestions = SUGGESTED.filter((s) => !has(s.name))
  const invite = ctx.pendingJoin && !has(ctx.pendingJoin) ? ctx.pendingJoin : ''

  const create = () => {
    const n = draft.trim()
    if (n.length < 2) return
    ctx.createConstellation(n)
    setDraft('')
    setNaming(false)
  }
  // Share = the exact blessed message (community moving, never a person's
  // feelings) + this constellation's link. Native share sheet where it exists
  // (that's how it reaches an Instagram DM on a phone); clipboard otherwise.
  const share = async (c) => {
    const msg = `${t('constel.shareMsg')} ${shareLink(c.name)}`
    if (navigator.share) {
      try {
        await navigator.share({ text: msg })
        return
      } catch {
        /* dismissed or unsupported payload — fall through to copy */
      }
    }
    const ok = await copyText(msg)
    if (ok) {
      setCopiedId(c.id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedId(''), 2400)
    }
  }

  // ── THE INVITE CEREMONY ── a shared link lands HERE, and it gets the whole
  // screen: the community's own glyph over the live galaxy, its name in the
  // headline serif, the 100-rule count, one promise, one button. The report's
  // "short pitch, three beats" — not a card in a list.
  if (invite) {
    // A seeded community keeps its listed size, so the invite and the chart
    // never disagree about the same name.
    const n = SUGGESTED.find((s) => s.name.toLowerCase() === invite.toLowerCase())?.count ?? inviteCount(invite)
    return (
      <Shell>
        <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
          <Brandmark C={C} size={13} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
          <div className="floaty enter">
            <ConstellationGlyph C={C} name={invite} size={128} />
          </div>
          <span className="enter" style={{ animationDelay: '.06s', fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted }}>
            {t('constel.inviteKicker')}
          </span>
          <h1 className="enter" style={{ animationDelay: '.1s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(32px, 9vw, 42px)', lineHeight: 1.12, color: C.cream, textShadow: '0 4px 34px rgba(0,0,0,.7)', overflowWrap: 'anywhere' }}>
            {invite}
          </h1>
          <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <CountLine C={C} name={invite} count={n} pulse />
            <FeelingLine C={C} name={invite} count={n} />
            <span style={{ fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{t('constel.inviteBody')}</span>
          </div>
        </div>
        <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PrimaryButton C={C} onClick={() => { ctx.joinConstellation(invite, n); ctx.dismissInvite() }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              {t('constel.inviteCta')} <Icon name="arrow" size={16} color={C.onYou} stroke={2.1} />
            </span>
          </PrimaryButton>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={ctx.dismissInvite} style={{ padding: '2px 6px', fontSize: 12 }}>{t('constel.inviteDismiss')}</GhostButton>
          </div>
        </div>
      </Shell>
    )
  }

  // ── THE CHART ── your constellations as a star-chart listing: frameless rows
  // over the galaxy, separated by fading hairlines. No cards.
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.starCount ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: SPACE.xxl }}>
        {/* header */}
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingBottom: SPACE.xl }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(30px, 8vw, 36px)', lineHeight: 1.12, color: C.cream, textShadow: '0 4px 30px rgba(0,0,0,.6)' }}>
              {t('constel.title')}
            </h2>
            <BetaChip C={C} />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 340 }}>{t('constel.body')}</p>
        </div>

        <HairRule C={C} />

        {/* yours */}
        <div className="enter" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column' }}>
          {mine.length === 0 ? (
            <p style={{ margin: 0, padding: '18px 0', fontSize: 13, lineHeight: 1.6, color: C.muted }}>{t('constel.none')}</p>
          ) : (
            mine.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <HairRule C={C} />}
                <ConstelRow C={C} c={c} copied={copiedId === c.id} onShare={() => share(c)} />
              </React.Fragment>
            ))
          )}
        </div>

        <HairRule C={C} />

        {/* start one — a quiet line, not a box; expands into the name field */}
        <div className="enter" style={{ animationDelay: '.1s', padding: '16px 0' }}>
          {!naming ? (
            <GhostButton C={C} onClick={() => setNaming(true)} style={{ padding: '4px 2px', fontSize: 14, color: rgba(C.you, 0.92) }}>
              ✦ {t('constel.startTitle')}
            </GhostButton>
          ) : (
            <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <MonoLabel C={C}>{t('constel.startTitle')}</MonoLabel>
              <NameField C={C} value={draft} onChange={setDraft} placeholder={t('constel.namePlaceholder')} autoFocus onEnter={create} />
              {/* the figure it will draw, live while they type */}
              {draft.trim().length >= 2 && (
                <div className="fade" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 2px' }}>
                  <ConstellationGlyph C={C} name={draft.trim()} size={36} />
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: C.muted }}>{t('constel.glyphNote')}</span>
                </div>
              )}
              <QuietHint C={C} icon="eye">{t('constel.startNote')}</QuietHint>
              <PrimaryButton C={C} disabled={draft.trim().length < 2} onClick={create}>{t('constel.startCta')}</PrimaryButton>
            </div>
          )}
        </div>

        <HairRule C={C} />

        {/* near your world — seeded, joinable, same frameless language */}
        {suggestions.length > 0 && (
          <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', paddingTop: SPACE.lg, paddingBottom: SPACE.lg }}>
            <MonoLabel C={C}>{t('constel.suggested')}</MonoLabel>
            {suggestions.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0' }}>
                <ConstellationGlyph C={C} name={s.name} size={34} />
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, lineHeight: 1.1, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <CountLine C={C} name={s.name} count={s.count} />
                </div>
                <GhostButton C={C} onClick={() => ctx.joinConstellation(s.name, s.count)} style={{ padding: '4px 2px', fontSize: 12.5, color: rgba(C.you, 0.9), flexShrink: 0 }}>
                  {t('constel.join')} →
                </GhostButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

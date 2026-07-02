// beta.jsx — the /beta world: everything the beta route layers on top of the demo
// sandbox. Two features live here:
//
//   · the INTENT SIGNAL — an optional line sealed with a star ("i miss them", "i
//     never got to say something", …), invisible while one-sided, both revealed
//     only on a mutual match. It never gates matching.
//   · CONSTELLATIONS — communities sharing one sky (a campus, a team, a scene).
//     Anyone can name one and share one link; everyone who joins can share it
//     again. There is NO waitlist anywhere: a constellation is live the moment
//     it exists. Counts obey the 100 rule — hidden under 100, shown large at 100+.
//
// The wording rule from the referral-chains doc is load-bearing: the share copy
// talks about the community moving ("This is spreading in your world. Join it."),
// never about an individual's feelings. Keep it that way.
//
// All color derives from C (the single theme); all copy goes through useI18n().
import * as React from 'react'
import { useI18n } from '../i18n/index.js'
import { rgba, RADIUS, SPACE, makeShadow } from '../theme.js'
import { Glisten, Brandmark, PrimaryButton, GhostButton, OutlineButton, BackBtn, Icon } from './ui.jsx'

// The four intent lines (roadmap §Intent signal). Ids resolve via `intent.<id>`.
export const INTENTS = ['miss', 'unsaid', 'mend', 'always']

// The 100 rule: a small number feels empty and can expose who's in it; a large
// number feels real and hides everyone inside it.
export const showCount = (n) => Number.isFinite(n) && n >= 100

// A join link carries only the constellation's name — the beta is sandboxed, so
// there's no server id to reference.
const shareLink = (name) => `${window.location.origin}/beta?c=${encodeURIComponent(name)}`

// Deterministic, plausible size for a constellation arriving via an invite link
// (the sandbox has no server to ask). Spans the 100 rule so both states demo.
export function inviteCount(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return 40 + (h % 360)
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

// ── small furniture (mirrors screens.jsx so beta reads identically) ────────────
function MonoLabel({ C, children, optional, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
      <span style={{ fontSize: 11, letterSpacing: '1.5px', fontFamily: "'Space Mono', monospace", color: C.muted, textTransform: 'uppercase' }}>{children}</span>
      {optional && (
        <span style={{ fontSize: 9.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(accent || C.you, 0.92), background: rgba(accent || C.you, 0.1), border: `1px solid ${rgba(accent || C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
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

// The tiny mono pill that marks the beta world (landing + constellations header).
export function BetaChip({ C }) {
  const { t } = useI18n()
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: rgba(C.you, 0.92), background: rgba(C.you, 0.08), border: `1px solid ${rgba(C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '3px 10px' }}>
      {t('beta.chip')}
    </span>
  )
}

// ── INTENT PICKER (them screen — optional, one tap, tap again to clear) ────────
// The four lines read in the headline serif italic — they're feelings, not UI
// chrome — with the rose accent, since they're about them. Sealed until mutual.
export function IntentPicker({ C, value, onChange }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      <MonoLabel C={C} optional={t('intent.optional')} accent={C.them}>{t('intent.label')}</MonoLabel>
      {INTENTS.map((id) => {
        const on = value === id
        return (
          <button
            key={id}
            onClick={() => onChange(on ? '' : id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              width: '100%', padding: '12px 16px', borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
              background: on ? rgba(C.them, 0.1) : C.ink2,
              border: `1.5px solid ${on ? rgba(C.them, 0.75) : C.line}`,
              transition: 'border-color .2s, background .2s',
            }}
          >
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16.5, lineHeight: 1.3, color: on ? C.cream : C.muted, transition: 'color .2s' }}>
              {t('intent.' + id)}
            </span>
            {on && <Icon name="check" size={15} color={C.them} />}
          </button>
        )
      })}
      <QuietHint C={C} icon="lock" color={rgba(C.them, 0.85)}>{t('intent.note')}</QuietHint>
    </div>
  )
}

// ── INTENT REVEAL (match screen — both lines unsealed at the mutual moment) ────
export function IntentReveal({ C, you, them }) {
  const { t } = useI18n()
  const rows = [
    you && { key: 'you', label: t('match.you'), col: C.you, line: t('intent.' + you) },
    them && { key: 'them', label: t('match.them'), col: C.them, line: t('intent.' + them) },
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
// Shared centered column — same shell geometry as every other screen.
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

// One constellation's size, under the 100 rule.
function CountLine({ C, count }) {
  const { t } = useI18n()
  return showCount(count) ? (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.you, whiteSpace: 'nowrap' }}>
      ✦ {t('constel.count', { n: count })}
    </span>
  ) : (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.muted, whiteSpace: 'nowrap' }}>
      ✦ {t('constel.gathering')}
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

export function ConstellationsScreen({ C, ctx }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const [naming, setNaming] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [copiedId, setCopiedId] = React.useState('')
  const copyTimer = React.useRef(null)
  React.useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const mine = ctx.constellations
  const has = (name) => mine.some((c) => c.name.toLowerCase() === name.toLowerCase())
  const suggestions = SUGGESTED.filter((s) => !has(s.name))
  // The invite from a shared link (?c=…) — shown until joined or dismissed.
  const invite = ctx.pendingJoin && !has(ctx.pendingJoin) ? ctx.pendingJoin : ''

  const create = () => {
    const n = draft.trim()
    if (n.length < 2) return
    ctx.createConstellation(n)
    setDraft('')
    setNaming(false)
  }
  const joinInvite = () => {
    ctx.joinConstellation(invite, inviteCount(invite))
    ctx.dismissInvite()
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

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.starCount ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: SPACE.xl, paddingTop: SPACE.xxl }}>
        {/* header */}
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 8vw, 36px)', lineHeight: 1.12, color: C.cream }}>
              {t('constel.title')}
            </h2>
            <BetaChip C={C} />
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 380 }}>{t('constel.body')}</p>
        </div>

        {/* the invite a shared link carried in */}
        {invite && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 20px', borderRadius: RADIUS.card, background: rgba(C.ink2, 0.97), border: `1px solid ${rgba(C.you, 0.3)}`, boxShadow: SHADOW.rest(C.you) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Glisten C={C} size={14} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.muted }}>{t('constel.inviteKicker')}</span>
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(24px, 6vw, 30px)', lineHeight: 1.15, color: C.cream, overflowWrap: 'anywhere' }}>{invite}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <CountLine C={C} count={inviteCount(invite)} />
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>{t('constel.inviteBody')}</span>
            </div>
            <PrimaryButton C={C} onClick={joinInvite}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                {t('constel.inviteCta')} <Icon name="arrow" size={16} color="#1a0f0a" stroke={2.1} />
              </span>
            </PrimaryButton>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GhostButton C={C} onClick={ctx.dismissInvite} style={{ padding: '2px 6px', fontSize: 12 }}>{t('constel.inviteDismiss')}</GhostButton>
            </div>
          </div>
        )}

        {/* yours */}
        <div className="enter" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <MonoLabel C={C}>{t('constel.yours')}</MonoLabel>
          {mine.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>{t('constel.none')}</p>
          ) : (
            mine.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 17px', borderRadius: RADIUS.card, background: C.ink2, border: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15.5, fontWeight: 500, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted }}>
                      {c.role === 'created' ? t('constel.created') : t('constel.joined')}
                    </div>
                  </div>
                  <CountLine C={C} count={c.count} />
                </div>
                <OutlineButton C={C} onClick={() => share(c)} style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: 13 }}>
                  <Icon name={copiedId === c.id ? 'check' : 'share'} size={14} color={copiedId === c.id ? C.you : C.cream} stroke={2} />
                  {copiedId === c.id ? t('constel.shared') : t('constel.share')}
                </OutlineButton>
              </div>
            ))
          )}
        </div>

        {/* start one — the same quiet ghost-field pattern as the optional email */}
        <div className="enter" style={{ animationDelay: '.1s' }}>
          {!naming ? (
            <button
              onClick={() => setNaming(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '15px 17px',
                borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                background: C.ink2, border: `1px solid ${C.line}`,
                color: C.cream, fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Icon name="star" size={18} color={rgba(C.you, 0.9)} stroke={1.7} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{t('constel.startTitle')}</span>
              <Icon name="plus" size={16} color={rgba(C.you, 0.9)} stroke={2} />
            </button>
          ) : (
            <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <MonoLabel C={C}>{t('constel.startTitle')}</MonoLabel>
              <NameField C={C} value={draft} onChange={setDraft} placeholder={t('constel.namePlaceholder')} autoFocus onEnter={create} />
              <QuietHint C={C} icon="eye">{t('constel.startNote')}</QuietHint>
              <PrimaryButton C={C} disabled={draft.trim().length < 2} onClick={create}>{t('constel.startCta')}</PrimaryButton>
            </div>
          )}
        </div>

        {/* seeded, joinable — so the loop demos cold */}
        {suggestions.length > 0 && (
          <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingBottom: SPACE.lg }}>
            <MonoLabel C={C}>{t('constel.suggested')}</MonoLabel>
            {suggestions.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 17px', borderRadius: RADIUS.card, background: rgba(C.ink2, 0.7), border: `1px solid ${C.line}` }}>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 500, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <CountLine C={C} count={s.count} />
                </div>
                <OutlineButton C={C} onClick={() => ctx.joinConstellation(s.name, s.count)} style={{ flexShrink: 0, padding: '9px 18px', fontSize: 13 }}>
                  {t('constel.join')}
                </OutlineButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

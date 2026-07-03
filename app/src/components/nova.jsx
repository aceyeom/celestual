// nova.jsx — CELESTUAL NOVA, the tier. A nova is a star that suddenly brightens;
// the tier only ever DRESSES a person's sky: their own sealed line, the light
// their stars burn with, the colour of their night. It never touches mechanics.
//
// The load-bearing rules (docs/PRODUCT-FRAMEWORK.md §1, PRICING-REVENUE.md):
//   · Nothing mechanical is ever behind Nova — sealing, matching, the reveal,
//     withdrawal, suppression, reminders, the five intent lines: free, forever.
//   · Nova never buys probing capacity (I-2) — no slots, no refills, ever.
//     The referral reward is Nova months for the same reason: cosmetic only.
//   · At the mutual reveal the other person sees the seal style with NO badge
//     and NO branding (I-4) — beauty travels, commerce doesn't.
//   · No Nova surface on the out-of-slots screen, and no urgency copy (I-5).
//
// This round Nova exists only inside the /demo + /beta sandbox: subscribing is
// an instant local unlock (nothing is charged, and the sheet says so), stored in
// its own localStorage bucket so it can never bleed into real state. Stripe and
// the server-side entitlements table come later (see docs/PRICING-REVENUE.md).
import * as React from 'react'
import { useI18n } from '../i18n/index.js'
import { rgba, RADIUS, SPACE, makeShadow, SEAL_STYLES, SKY_THEMES, sealStyleById } from '../theme.js'
import { Glisten, GhostButton, PrimaryButton, Icon, HandleChip, useDialog } from './ui.jsx'

export const NOVA_STORE = 'celestual:nova:v1'
export const NOVA_PRICES = { month: '$3.99', year: '$19.99' }

export function loadNova() {
  try {
    const r = JSON.parse(localStorage.getItem(NOVA_STORE)) || {}
    return {
      active: !!r.active,
      plan: r.plan || '',
      sealStyle: r.sealStyle || 'ember',
      skyTheme: r.skyTheme || 'violet',
      since: r.since || null,
      referrals: r.referrals || 0,
    }
  } catch {
    return { active: false, plan: '', sealStyle: 'ember', skyTheme: 'violet', since: null, referrals: 0 }
  }
}

// ── instrumentation — COUNTS ONLY (FRAMEWORK §6: never handle-level analytics,
// that's an I-1 concern). The sandbox's calibration inputs for the pricing lab.
const METRICS = 'celestual:metrics:v1'
export function bumpMetric(key) {
  try {
    const m = JSON.parse(localStorage.getItem(METRICS)) || {}
    m[key] = (m[key] || 0) + 1
    localStorage.setItem(METRICS, JSON.stringify(m))
  } catch {
    /* private mode / quota — fine to skip */
  }
}

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

// A seal-style swatch: the style's own point of light, not a paint chip.
function SealSwatch({ C, style, on, onPick, label }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={on}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1,
        padding: '12px 4px 10px', background: 'none', cursor: 'pointer',
        border: `1px solid ${on ? rgba(style.color, 0.55) : 'transparent'}`, borderRadius: RADIUS.inner,
        transition: 'border-color .25s',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 9, height: 9, borderRadius: '50%', background: '#fff',
          boxShadow: `0 0 7px 2px #fff, 0 0 16px 5px ${rgba(style.color, 0.85)}, 0 0 34px 12px ${rgba(style.color, 0.3)}`,
        }}
      />
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.6px', color: on ? C.cream : C.muted }}>{label}</span>
    </button>
  )
}

// A sky-theme swatch: a sliver of that night.
function ThemeSwatch({ C, theme, on, onPick, label }) {
  const ink = (theme.tokens && theme.tokens.ink3) || C.ink3
  const base = (theme.tokens && theme.tokens.ink) || C.ink
  return (
    <button
      onClick={onPick}
      aria-pressed={on}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: 1,
        padding: '10px 4px', background: 'none', cursor: 'pointer',
        border: `1px solid ${on ? rgba(C.cream, 0.35) : 'transparent'}`, borderRadius: RADIUS.inner,
        transition: 'border-color .25s',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 40, height: 26, borderRadius: 7,
          background: `radial-gradient(26px 18px at 50% 0%, ${ink}, ${base})`,
          border: `1px solid ${C.line}`,
        }}
      />
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.6px', color: on ? C.cream : C.muted }}>{label}</span>
    </button>
  )
}

// ── THE NOVA SHEET ─────────────────────────────────────────────────────────────
// The tier's one home. Entered only from quiet places (the account sheet, the
// locked write-your-own row) — never from the out-of-slots screen, never at the
// reveal. Subscribing in the sandbox is an instant local unlock, labeled so.
export function NovaSheet({ C, nova, onSubscribe, onSeal, onTheme, onClose }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const [plan, setPlan] = React.useState(nova.plan || 'month')
  const [copied, setCopied] = React.useState(false)
  const dialogRef = useDialog(onClose)
  React.useEffect(() => {
    bumpMetric('nova_viewed')
  }, [])
  const referLink = `${window.location.origin}${window.location.pathname.includes('/beta') ? '/beta' : '/demo'}`
  const share = async () => {
    const ok = await copyText(referLink)
    if (ok) {
      setCopied(true)
      bumpMetric('referral_link_copied')
      setTimeout(() => setCopied(false), 2400)
    }
  }
  const features = [
    [t('nova.f1'), t('nova.f1b')],
    [t('nova.f2'), t('nova.f2b')],
    [t('nova.f3'), t('nova.f3b')],
  ]
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 34, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nova.kicker')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 410, margin: 'auto 0', background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '30px 26px 26px', display: 'flex', flexDirection: 'column', gap: 22, outline: 'none' }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Glisten C={C} size={14} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.muted }}>{t('nova.kicker')}</span>
              {nova.active && (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1px', color: rgba(C.you, 0.95) }}>· {t('nova.activeMark')}</span>
              )}
            </div>
            <div style={{ marginTop: 12, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 8vw, 34px)', lineHeight: 1.06, color: C.cream }}>{t('nova.title')}</div>
          </div>
          <button onClick={onClose} aria-label={t('nova.close')} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={15} color="currentColor" />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{t('nova.sub')}</p>

        {/* the three things it is */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {features.map(([head, body]) => (
            <div key={head} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <span aria-hidden style={{ marginTop: 3, color: rgba(C.you, 0.9), fontSize: 12, flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: C.muted }}>
                <span style={{ color: C.cream, fontWeight: 500 }}>{head}</span> — {body}
              </span>
            </div>
          ))}
        </div>

        {nova.active ? (
          <>
            {/* pickers — only live once Nova is yours */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: '1.5px', fontFamily: "'Space Mono', monospace", color: C.muted, textTransform: 'uppercase' }}>{t('nova.sealLabel')}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {SEAL_STYLES.map((s) => (
                  <SealSwatch key={s.id} C={C} style={s} on={nova.sealStyle === s.id} label={t('seal.' + s.id)} onPick={() => { onSeal(s.id); bumpMetric('nova_seal_chosen') }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: '1.5px', fontFamily: "'Space Mono', monospace", color: C.muted, textTransform: 'uppercase' }}>{t('nova.themeLabel')}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {SKY_THEMES.map((s) => (
                  <ThemeSwatch key={s.id} C={C} theme={s} on={nova.skyTheme === s.id} label={t('sky.' + s.id)} onPick={() => { onTheme(s.id); bumpMetric('nova_theme_set') }} />
                ))}
              </div>
            </div>

            {/* referrals — months, NEVER slots (I-2: probing capacity is sacred) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4, borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: C.cream }}>{t('nova.referTitle')}</span>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.muted }}>{t('nova.referBody')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <GhostButton C={C} onClick={share} style={{ padding: '3px 0', fontSize: 13, color: copied ? C.you : rgba(C.you, 0.9) }}>
                  {copied ? t('nova.referCopied') : <>{t('nova.referCta')} →</>}
                </GhostButton>
                {nova.referrals > 0 && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.muted }}>{t('nova.referCount', { n: nova.referrals })}</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* plan + the one button. No countdowns, no strikethrough anchors. */}
            <div style={{ display: 'flex', gap: 8 }}>
              {['month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  aria-pressed={plan === p}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '13px 8px',
                    borderRadius: RADIUS.inner, cursor: 'pointer',
                    background: plan === p ? rgba(C.you, 0.08) : 'none',
                    border: `1px solid ${plan === p ? rgba(C.you, 0.45) : C.line}`,
                    transition: 'border-color .2s, background .2s',
                  }}
                >
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted }}>{t('nova.' + p)}</span>
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, color: plan === p ? C.cream : C.muted }}>{t(p === 'month' ? 'nova.priceMonth' : 'nova.priceYear')}</span>
                </button>
              ))}
            </div>
            <PrimaryButton C={C} onClick={() => { onSubscribe(plan); bumpMetric('nova_unlocked') }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                {t('nova.cta')} <Icon name="arrow" size={16} color={C.onYou} stroke={2.1} />
              </span>
            </PrimaryButton>
            <p style={{ margin: '-8px 0 0', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.5px', color: C.muted }}>{t('nova.sandboxNote')}</p>
          </>
        )}

        {/* the trust line — the free-forever promise travels with the price tag */}
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: C.muted, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>{t('nova.trust')}</p>
      </div>
    </div>
  )
}

// ── THE MATCHED-PAIR KEEPSAKE ──────────────────────────────────────────────────
// Offered only AFTER the reveal has fully landed (I-4: upsells come after, if
// ever) and only as a quiet unfolding line — never a modal over the moment.
// Sandbox-only this round: "buying" it just keeps the card, nothing is charged.
export function KeepsakeOffer({ C, me, them, youSeal, themSeal, lang }) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [kept, setKept] = React.useState(false)
  const youCol = sealStyleById(youSeal).color
  const themCol = sealStyleById(themSeal).color
  const when = new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date())
  if (!open) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GhostButton C={C} onClick={() => { setOpen(true); bumpMetric('keepsake_viewed') }} style={{ padding: '2px 6px', fontSize: 12, color: C.muted }}>
          {t('keepsake.link')}
        </GhostButton>
      </div>
    )
  }
  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 6 }}>
      {/* the card itself — a small star-chart of the night */}
      <div
        style={{
          width: '100%', maxWidth: 320, borderRadius: RADIUS.card, border: `1px solid ${C.line}`,
          background: `radial-gradient(140% 90% at 50% 0%, ${C.ink3} 0%, ${C.ink} 70%)`,
          padding: '22px 20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted }}>{t('keepsake.title')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0' }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px 2px #fff, 0 0 14px 5px ${rgba(youCol, 0.85)}` }} />
          <span aria-hidden style={{ width: 30, height: 1, background: `linear-gradient(90deg, ${rgba(youCol, 0.7)}, ${rgba(themCol, 0.7)})` }} />
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: `0 0 6px 2px #fff, 0 0 14px 5px ${rgba(themCol, 0.85)}` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <HandleChip C={C} handle={me || 'you'} color={youCol} />
          <span aria-hidden style={{ color: C.muted, fontSize: 12 }}>✦</span>
          <HandleChip C={C} handle={them || 'them'} color={themCol} />
        </div>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.5px', color: C.muted }}>{when}</span>
      </div>
      {kept ? (
        <p className="fade" style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: C.you }}>{t('keepsake.kept')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <GhostButton C={C} onClick={() => { setKept(true); bumpMetric('keepsake_simulated_purchase') }} style={{ fontSize: 13, color: rgba(C.you, 0.92) }}>
            {t('keepsake.cta')}
          </GhostButton>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.5px', color: rgba(C.muted, 0.85) }}>{t('keepsake.sandboxNote')}</span>
        </div>
      )}
    </div>
  )
}

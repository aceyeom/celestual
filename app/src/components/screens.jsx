// screens.jsx — CELESTUAL's nine screens (docs/ULTIMATE-PRODUCT-FRAMEWORK.md
// Part 4, built to the letter; visual rules in docs/DESIGN.md).
//
// Every screen: deep navy field, generous emptiness, one warm star, exactly one
// primary action. Serif italic carries feeling; small sans carries mechanics;
// mono carries metadata. The backgrounds (the still night field) are owned by
// App so they never remount between screens — these shells only lay out the
// foreground.
//
// All user-facing copy comes through useI18n().t(); all color comes through C
// (the single theme). Nothing here defines its own hex or hard-codes strings.
import * as React from 'react'
import { normHandle } from '../api/celestual.js'
import { daysLeft, nearLapse } from '../api/pings.js'
import {
  startVerification, pollVerification, igDeepLink, igWebLink, igUsername,
  dmCode, savePending, loadPending, clearPending, genProof,
} from '../api/igverify.js'
import { useI18n } from '../i18n/index.js'
import { renderDoorCard, downloadDoorCard } from '../card.js'
import {
  Brandmark, StarMark, SchoolMark, Kicker, Rule, ProgressRing, StateDot, Sonar, GlassPanel,
  PrimaryButton, GhostButton, OutlineButton, Field, HandleChip, HandleSearchField,
  BackBtn, Icon, rgba, RADIUS, SPACE, makeShadow, useDialog,
} from './ui.jsx'
import { RING_LABELS, communityProgress } from '../communities.js'

// Shared centered column: at least one dynamic-viewport tall, capped to an
// intimate measure on wide monitors.
export function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'max(40px, env(safe-area-inset-top)) clamp(20px, 5vw, 40px) max(28px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

// A quiet hint line under a field.
function Hint({ C, icon, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: C.muted, fontSize: 12, lineHeight: 1.55, padding: '0 2px' }}>
      {icon && <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={13} color={color || C.muted} /></span>}
      <span>{children}</span>
    </div>
  )
}

// Smoothly reveals/hides children by animating grid-rows 0fr→1fr.
function Collapse({ open, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition: 'grid-template-rows .42s cubic-bezier(.2,.7,.2,1), opacity .36s ease',
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  )
}

function FieldLabel({ C, children, optional }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
      <Kicker C={C} style={{ fontSize: 11, letterSpacing: '1.5px' }}>{children}</Kicker>
      {optional && (
        <span style={{ fontSize: 10.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.92), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

// The sandbox badge — the demo says what it is, everywhere it matters.
export function SandboxChip({ C }) {
  const { t } = useI18n()
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: rgba(C.star, 0.92), background: rgba(C.star, 0.08), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 9px' }}>
      {t('demo.badge')}
    </span>
  )
}

// ── the intent row (the guide's exact five, §4.5 — optional, never free-text) ─
export const INTENTS = ['unsaid', 'think', 'again', 'clear', 'miss']
export const intentLine = (t, id, reveal) => (id && INTENTS.includes(id) ? t(reveal ? `intent.${id}.r` : `intent.${id}`) : '')

export function IntentPicker({ C, value, onChange }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <FieldLabel C={C} optional={t('intent.optional')}>{t('intent.label')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {INTENTS.map((id) => {
          const on = value === id
          return (
            <button
              key={id}
              onClick={() => onChange(on ? '' : id)}
              style={{
                padding: '8px 13px', borderRadius: RADIUS.chip, cursor: 'pointer',
                background: on ? rgba(C.star, 0.12) : 'transparent',
                border: `1px solid ${on ? rgba(C.star, 0.5) : C.line}`,
                color: on ? C.cream : C.muted,
                fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15.5,
                transition: 'all .2s',
              }}
            >
              {t(`intent.${id}`)}
            </button>
          )
        })}
      </div>
      <Hint C={C} icon="lock">{t('intent.note')}</Hint>
    </div>
  )
}

// The slot pips — one per slot, lit while free. Sits under the send field
// (framework Screen 2: "the visuals for the amount of pings left").
export function SlotPips({ C, standing, cap, compact }) {
  const { t } = useI18n()
  const free = Math.max(0, cap - standing)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {Array.from({ length: cap }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < standing ? C.star : 'transparent',
            border: `1px solid ${i < standing ? C.star : C.line}`,
            boxShadow: i < standing ? `0 0 8px ${rgba(C.star, 0.6)}` : 'none',
          }}
        />
      ))}
      {!compact && (
        <span style={{ marginLeft: 4, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.muted }}>
          {standing > 0 ? t('slots.holding', { n: standing, cap }) : t('slots.free', { n: free, cap })}
        </span>
      )}
    </div>
  )
}

// The hero line, typed a beat at a time (§4.1): put their @ in → they'll never
// know → unless they put you in too. Reworked so the mechanic is easy to follow:
// the first two beats type on stacked lines and STAY — you read them together —
// then they fade and the payoff (the warm third beat) enters on its own and
// holds longest. The @ lights amber as it lands; the payoff reads amber. Loops,
// calm; collapses to a static stack under reduced-motion.
const HERO_TYPE = () => 46 + Math.random() * 34
function HeroSequence({ C }) {
  const { t } = useI18n()
  const L1 = t('landing.type1')
  const L2 = t('landing.type2')
  const L3 = t('landing.type3')
  const reduce =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // stages: 0 type L1 · 1 type L2 (L1 held) · 2 fade the pair · 3 type L3 · 4 fade L3 → loop
  const [stage, setStage] = React.useState(reduce ? 3 : 0)
  const [n, setN] = React.useState(reduce ? L3.length : 0)

  React.useEffect(() => {
    if (reduce) return
    let id
    if (stage === 0) {
      id = n < L1.length ? setTimeout(() => setN(n + 1), HERO_TYPE()) : setTimeout(() => { setN(0); setStage(1) }, 300)
    } else if (stage === 1) {
      id = n < L2.length ? setTimeout(() => setN(n + 1), HERO_TYPE()) : setTimeout(() => setStage(2), 1700)
    } else if (stage === 2) {
      id = setTimeout(() => { setN(0); setStage(3) }, 620)
    } else if (stage === 3) {
      id = n < L3.length ? setTimeout(() => setN(n + 1), HERO_TYPE()) : setTimeout(() => setStage(4), 3000)
    } else if (stage === 4) {
      id = setTimeout(() => { setN(0); setStage(0) }, 620)
    }
    return () => clearTimeout(id)
  }, [stage, n, reduce, L1, L2, L3])

  const serif = { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(21px, 6.2vw, 28px)', lineHeight: 1.32 }
  const caret = (on) => on && <span className="tw-caret" aria-hidden style={{ color: rgba(C.star, 0.85), fontWeight: 300, marginLeft: 1 }}>|</span>
  // light the @ glyph amber in "put their @ in."
  const withAt = (s) => {
    if (!s.includes('@')) return s
    const [a, ...rest] = s.split('@')
    return (<>{a}<span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: C.star }}>@</span>{rest.join('@')}</>)
  }

  const pairShown = stage < 2
  const pairText1 = stage === 0 ? L1.slice(0, n) : L1
  const pairText2 = stage === 0 ? '' : stage === 1 ? L2.slice(0, n) : L2
  const payoffText = stage === 3 ? L3.slice(0, n) : L3

  return (
    <div
      className="enter"
      aria-label={`${L1} ${L2} ${L3}`}
      style={{ animationDelay: '.16s', position: 'relative', minHeight: 92, width: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '0 10px' }}
    >
      {reduce ? (
        // static stack — the whole mechanic, no motion
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ ...serif, color: C.cream }}>{withAt(L1)}</span>
          <span style={{ ...serif, color: C.cream }}>{L2}</span>
          <span style={{ ...serif, color: C.star }}>{L3}</span>
        </div>
      ) : (
        <>
          {/* the held pair — both lines stay up together, then fade as one */}
          <div
            style={{
              gridArea: '1 / 1', display: 'flex', flexDirection: 'column', gap: 2,
              opacity: stage === 2 ? 0 : pairShown ? 1 : 0, transition: 'opacity .55s ease',
            }}
          >
            <span style={{ ...serif, color: C.cream }}>{withAt(pairText1)}{caret(stage === 0)}</span>
            <span style={{ ...serif, color: C.cream, minHeight: pairText2 || stage >= 1 ? undefined : 0 }}>
              {pairText2}{caret(stage === 1)}
            </span>
          </div>
          {/* the payoff — enters alone, amber, holds longest */}
          <div style={{ gridArea: '1 / 1', opacity: stage === 3 || stage === 4 ? (stage === 4 ? 0 : 1) : 0, transition: 'opacity .55s ease' }}>
            <span style={{ ...serif, color: C.star }}>{payoffText}{caret(stage === 3)}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── 1 · THE COLD LANDING ──────────────────────────────────────────────────────
export function LandingScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div className="floaty"><Brandmark C={C} size={34} /></div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <h1
          className="enter"
          style={{ animationDelay: '.08s', margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8.5vw, 46px)', lineHeight: 1.16, color: C.cream, textWrap: 'balance' }}
        >
          <div>{t('landing.head1')}</div>
          <div style={{ color: C.star }}>{t('landing.head2')}</div>
        </h1>
        <HeroSequence C={C} />
      </div>

      <div className="enter" style={{ animationDelay: '.24s', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PrimaryButton C={C} onClick={ctx.findOut}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('landing.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: C.muted }}>{t('landing.safety')}</p>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>
          {t('landing.age')}{' '}
          <a href="/terms" target="_blank" rel="noopener" style={{ color: rgba(C.muted, 0.9), textDecoration: 'underline' }}>{t('landing.terms')}</a>.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 2, flexWrap: 'wrap' }}>
          {[
            ['/privacy', t('footer.privacy')],
            ['/terms', t('footer.terms')],
          ].map(([href, label], idx) => (
            <React.Fragment key={href}>
              {idx > 0 && <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />}
              <a href={href} target="_blank" rel="noopener" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.5px', color: C.muted, textDecoration: 'none' }}>
                {label}
              </a>
            </React.Fragment>
          ))}
          <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />
          <GhostButton C={C} onClick={() => ctx.go('privacy')} style={{ padding: 0, fontSize: 11.5, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>
            {t('footer.optout')}
          </GhostButton>
        </div>
        {ctx.demo && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
            <SandboxChip C={C} />
            <GhostButton C={C} onClick={() => ctx.go('worlds')} style={{ padding: 0, fontSize: 11.5, color: rgba(C.star, 0.85) }}>
              {t('demo.worlds')} →
            </GhostButton>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── the personal open-door landing (celestual.us/@handle) ────────────────────
export function OpenDoorScreen({ C, ctx }) {
  const { t } = useI18n()
  const poster = ctx.posterHandle
  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div className="floaty"><Brandmark C={C} size={30} /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <HandleChip C={C} handle={poster} big />
          <Kicker C={C}>{t('open.reach')}</Kicker>
        </div>
        <h1 className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 36px)', lineHeight: 1.2, color: C.cream, maxWidth: 360, textWrap: 'balance' }}>
          {t('open.line')}
        </h1>
        <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 320 }}>
          {t('open.mech')}
        </p>
      </div>
      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* the prefilled ping — two taps from Story to placed ping */}
        <PrimaryButton C={C} onClick={() => ctx.startFromDoor(poster)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('open.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.startFromDoor('')} style={{ fontSize: 12.5 }}>
            {t('open.else')}
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('landing.safety')}</p>
      </div>
    </Shell>
  )
}

// ── 2 · THE SEND ──────────────────────────────────────────────────────────────
export function WhoScreen({ C, ctx }) {
  const { t } = useI18n()
  const valid = ctx.them.trim().length >= 2 && normHandle(ctx.them) !== normHandle(ctx.me)
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const normd = normHandle(ctx.them)
  const onPlace = async () => {
    if (!valid || busy) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await ctx.place()
    } finally {
      setBusy(false)
    }
  }
  React.useEffect(() => {
    setConfirming(false)
  }, [ctx.them])

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          {/* the header, as a full serif headline — the accent line in rose (the
              "them" star), since this is the person you're reaching toward */}
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8.5vw, 38px)', lineHeight: 1.08, color: C.cream }}>
            {t('who.title1')}<br />
            <span style={{ color: C.them }}>{t('who.title2')}</span>
          </h2>
          {/* self @ first: the ping is FROM you — shown under the headline */}
          {normHandle(ctx.me) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Kicker C={C} style={{ fontSize: 10 }}>{t('who.fromLabel')}</Kicker>
              <HandleChip C={C} handle={normHandle(ctx.me)} />
            </span>
          )}
        </div>
        <div className="enter" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <div data-sendoff-field>
            <HandleSearchField C={C} value={ctx.them} onChange={ctx.setThem} placeholder={t('who.placeholder')} autoFocus onEnter={onPlace} />
          </div>
          {confirming && valid ? (
            <div key="confirm" className="fade" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 7px', color: C.muted, fontSize: 13, lineHeight: 1.5, padding: '0 2px' }}>
              <Icon name="lock" size={13} color={rgba(C.star, 0.85)} />
              <span>{t('who.confirm1')}</span>
              <HandleChip C={C} handle={normd} />
              <span>{t('who.confirm2')}</span>
            </div>
          ) : (
            <Hint C={C} icon="eye">{t('who.note')}</Hint>
          )}
          {ctx.error && <div style={{ color: rgba(C.star, 0.95), fontSize: 13, padding: '0 2px' }}>{ctx.error}</div>}
          {ctx.demo && <Hint C={C} icon="star" color={rgba(C.star, 0.85)}>{t('who.demoHint')}</Hint>}
        </div>

        {/* the optional intent — revealed only at a mutual match */}
        <Collapse open={valid}>
          <div className="fade" style={{ paddingTop: 2 }}>
            <IntentPicker C={C} value={ctx.intent} onChange={ctx.setIntent} />
          </div>
        </Collapse>

        {/* the slots — the weight under the act. only shown once we know who you
            are: before you've identified, your slot count is genuinely unknown. */}
        {ctx.established && (
          <div className="enter" style={{ animationDelay: '.12s', display: 'flex', justifyContent: 'center' }}>
            <SlotPips C={C} standing={ctx.slotsStanding} cap={ctx.slotsCap} />
          </div>
        )}
      </div>

      <PrimaryButton C={C} disabled={!valid || busy} onClick={onPlace}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {!busy && <Icon name="lock" size={16} color={C.onStar} stroke={2} />} {busy ? '…' : confirming ? t('who.ctaConfirm') : t('who.cta')}
        </span>
      </PrimaryButton>
    </Shell>
  )
}

// ── the identity step (your side — so the ping can resolve to you) ────────────
export function YouScreen({ C, ctx }) {
  const { t } = useI18n()
  const login = ctx.loginMode
  const emailVal = ctx.email.trim()
  const emailOk = emailVal === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const handleOk = ctx.me.trim().length >= 2
  // the 18+ hard gate (§4.4) — signup only. one tap to confirm; nothing about
  // age is ever sent up or stored (data minimization): we keep whether, not when.
  const [over18, setOver18] = React.useState(false)
  const valid = handleOk && emailOk && (login || over18)
  const submit = () => valid && (login ? ctx.login() : ctx.continueFromYou())
  const needsVerify = ctx.verifyEnabled && handleOk && !ctx.verified
  const [emailOpen, setEmailOpen] = React.useState(() => emailVal !== '')
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(login ? 'landing' : 'who')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8vw, 36px)', lineHeight: 1.12, color: C.cream }}>
          {login ? (
            <>{t('you.loginTitle1')}<br /><span style={{ color: C.star }}>{t('you.loginTitle2')}</span></>
          ) : (
            <>{t('you.title1')}<br /><span style={{ color: C.star }}>{t('you.title2')}</span></>
          )}
        </h2>

        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} autoFocus emphasis onEnter={submit} />
          {login && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.star, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('you.loginNote')}</Hint>
            )
          ) : ctx.verifyEnabled && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.star, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('verify.youHint')}</Hint>
            )
          ) : (
            <Hint C={C} icon="instagram">{t('you.handleNote')}</Hint>
          )}
        </div>

        {/* the 18+ hard gate (§4.4), signup only — now one tap, not a birthdate.
            checked here, never stored: we keep whether, not when. */}
        <Collapse open={handleOk && !login}>
          <div className="fade" style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <FieldLabel C={C}>{t('you.ageLabel')}</FieldLabel>
            <button
              onClick={() => setOver18((v) => !v)}
              aria-pressed={over18}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', padding: '15px 17px',
                borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                background: over18 ? rgba(C.star, 0.1) : C.ink2,
                border: `1.5px solid ${over18 ? rgba(C.star, 0.55) : C.line}`,
                color: C.cream, fontFamily: "'Space Grotesk', sans-serif", transition: 'all .2s',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: over18 ? C.star : 'transparent',
                  border: `1.5px solid ${over18 ? C.star : rgba(C.cream, 0.3)}`,
                  transition: 'all .2s',
                }}
              >
                {over18 && <Icon name="check" size={15} color={C.onStar} stroke={2.6} />}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500 }}>
                {over18 ? t('you.ageConfirmed') : t('you.ageConfirm')}
              </span>
            </button>
            <Hint C={C} icon="lock">{t('you.ageNote')}</Hint>
          </div>
        </Collapse>

        {/* email — optional, revealed after a handle exists (signup only) */}
        <Collapse open={handleOk && !login}>
          <div style={{ paddingTop: 4 }}>
            {!emailOpen ? (
              <button
                onClick={() => setEmailOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '15px 17px',
                  borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                  background: C.ink2, border: `1px solid ${C.line}`,
                  color: C.cream, fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Icon name="mail" size={18} color={rgba(C.star, 0.9)} stroke={1.7} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{t('you.emailAdd')}</span>
                <span style={{ fontSize: 10.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.92), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{t('you.emailOptional')}</span>
                <Icon name="plus" size={16} color={rgba(C.star, 0.9)} stroke={2} />
              </button>
            ) : (
              <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <FieldLabel C={C} optional={t('you.emailOptional')}>{t('you.emailLabel')}</FieldLabel>
                <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder={t('you.email')} autoFocus onEnter={submit} />
                <Hint C={C} icon="mail">{t('you.note')}</Hint>
              </div>
            )}
          </div>
        </Collapse>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={submit}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {needsVerify && <Icon name="instagram" size={16} color={C.onStar} stroke={2} />}
          {login ? t('you.loginCta') : needsVerify ? t('verify.continue') : t('you.continue')}
        </span>
      </PrimaryButton>
    </Shell>
  )
}

// ── 3 · PLACED — the recruiter screen (the most important in the product) ─────
export function PlacedScreen({ C, ctx }) {
  const { t } = useI18n()
  const placed = ctx.lastPlaced || { handle: ctx.them, reachable: false }
  const standing = !!placed.reachable
  // the communities you're in — a way your ping can travel to them
  const joinedComms = (ctx.communities || []).filter((c) => c.joined)
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        {standing ? (
          <>
            <div className="enter floaty"><StarMark C={C} size={82} /></div>
            <h1 className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(32px, 9vw, 42px)', lineHeight: 1.1, color: C.cream }}>
              {t('placed.standingTitle')}
            </h1>
            <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 330 }}>
              {t('placed.standingSub', { handle: placed.handle })}
            </p>
          </>
        ) : (
          <>
            {/* the quiet "held" mark — a calm sonar, not the bright match star */}
            <div className="enter" style={{ paddingBottom: 2 }}><Sonar C={C} size={30} /></div>
            {/* the handle itself, large, then the plain truth beneath it */}
            <h1 className="enter" style={{ animationDelay: '.06s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(38px, 11vw, 52px)', lineHeight: 1.02, color: C.cream, maxWidth: '92%' }}>
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontStyle: 'normal', fontSize: '0.72em', color: C.star }}>@</span>{placed.handle}
              </span>
              <span style={{ display: 'block', marginTop: 4, color: rgba(C.cream, 0.92) }}>{t('placed.waitingHead')}</span>
            </h1>
            <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 330 }}>
              {t('placed.waitingSub')}
            </p>
          </>
        )}

        {/* State B: the deniable playbook — every line literally true, forever */}
        {!standing && (
          <div className="enter" style={{ animationDelay: '.2s', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 0 2px', borderTop: `1px solid ${C.line}` }}>
            <Kicker C={C}>{t('placed.howTitle')}</Kicker>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left' }}>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>· {t('placed.how1')}</span>
              {joinedComms.map((c) => (
                <span key={c.slug} style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>
                  · {t('placed.howWorld', { name: c.name })}
                </span>
              ))}
              <span style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>· {t('placed.how3')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="enter" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {standing ? (
          // State A: the silence is pre-framed; one quiet secondary action.
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <GhostButton C={C} onClick={() => ctx.go('door')} style={{ fontSize: 14, color: C.cream }}>
              {t('placed.door')} →
            </GhostButton>
            <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>
              {t('placed.pings')}
            </GhostButton>
          </div>
        ) : (
          <>
            <PrimaryButton C={C} onClick={() => ctx.go('door')}>{t('placed.door')}</PrimaryButton>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>
                {t('placed.pings')}
              </GhostButton>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}

// ── 4 · YOUR PINGS — the status page ──────────────────────────────────────────
// A compact, clearly-labelled action button for a ping row. Real affordance —
// a bordered pill that hovers — instead of the old bare underlined text.
function RowBtn({ C, onClick, icon, children, tone = 'default' }) {
  const [h, setH] = React.useState(false)
  const accent = tone === 'accent'
  const col = accent ? C.star : tone === 'danger' ? rgba(C.cream, 0.72) : C.cream
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: RADIUS.chip,
        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: col,
        background: h ? rgba(accent ? C.star : C.cream, 0.1) : accent ? rgba(C.star, 0.08) : 'transparent',
        border: `1px solid ${accent ? rgba(C.star, h ? 0.6 : 0.4) : rgba(C.cream, h ? 0.28 : 0.14)}`,
        transition: 'all .18s',
      }}
    >
      {icon && <Icon name={icon} size={14} color="currentColor" stroke={1.9} />}
      {children}
    </button>
  )
}

// One ping, as a frosted glass card lifted off the galaxy. The state reads in
// plain words (active / not here yet / mutual) with a one-line explanation, and
// the actions are real buttons.
function PingCard({ C, ping, ctx }) {
  const { t } = useI18n()
  const [confirmGo, setConfirmGo] = React.useState(false)
  const [renewed, setRenewed] = React.useState(false)
  const days = daysLeft(ping.expires_at)
  const soon = !ping.mutual && nearLapse(ping.expires_at)
  const state = ping.mutual ? 'mutual' : ping.reachable ? 'standing' : 'waiting'
  const chipColor = ping.mutual ? C.star : ping.reachable ? rgba(C.star, 0.92) : C.muted
  const renew = async () => {
    await ctx.renew(ping.handle)
    setRenewed(true)
  }
  return (
    <GlassPanel C={C} style={{ padding: '15px 16px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <StateDot C={C} state={state} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Instrument Serif', serif", fontSize: 20, color: ping.handle ? C.cream : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ping.handle ? (
            <><span style={{ color: rgba(C.star, 0.9) }}>@</span>{ping.handle}</>
          ) : (
            <span style={{ fontStyle: 'italic', fontSize: 15 }}>{t('pings.elsewhere')}</span>
          )}
        </span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: chipColor, background: rgba(chipColor, 0.1), border: `1px solid ${rgba(chipColor, 0.32)}`, borderRadius: RADIUS.chip, padding: '3px 9px', flexShrink: 0 }}>
          {t(`pings.${state}`)}
        </span>
      </div>

      {ping.handle && t(`pings.${state}Sub`) && (
        <p style={{ margin: '8px 0 0', paddingLeft: 19, fontSize: 12.5, lineHeight: 1.5, color: rgba(C.muted, 0.92) }}>
          {t(`pings.${state}Sub`)}
        </p>
      )}
      {ping.intent && (
        <p style={{ margin: '7px 0 0', paddingLeft: 19, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14, color: rgba(C.cream, 0.7) }}>
          “{intentLine(t, ping.intent)}”
        </p>
      )}

      {(ping.handle || (!ping.mutual && days != null)) && (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${rgba(C.cream, 0.07)}` }}>
          {confirmGo ? (
            <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>{t('pings.letgoConfirm')}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <RowBtn C={C} tone="danger" icon="x" onClick={() => ctx.letGo(ping.handle)}>{t('pings.letgoYes')}</RowBtn>
                <RowBtn C={C} onClick={() => setConfirmGo(false)}>{t('pings.keep')}</RowBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!ping.mutual && days != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, color: soon ? rgba(C.star, 0.92) : rgba(C.muted, 0.8) }}>
                  {soon && <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: rgba(C.star, 0.9), boxShadow: `0 0 8px ${rgba(C.star, 0.6)}` }} />}
                  {days === 0 ? t('pings.today') : soon ? t('pings.expiringSoon', { n: days }) : t('pings.days', { n: days })}
                </span>
              )}
              <span style={{ flex: 1 }} />
              {ping.mutual && ping.handle ? (
                <RowBtn C={C} tone="accent" icon="message" onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowBtn>
              ) : ping.handle ? (
                <>
                  {renewed ? (
                    <span className="fade" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: rgba(C.star, 0.9) }}>
                      <Icon name="check" size={13} color={rgba(C.star, 0.9)} /> {t('pings.renewed')}
                    </span>
                  ) : (
                    <RowBtn C={C} tone={soon ? 'accent' : 'default'} icon="refresh" onClick={renew}>{t('pings.renew')}</RowBtn>
                  )}
                  <RowBtn C={C} tone="danger" icon="x" onClick={() => setConfirmGo(true)}>{t('pings.letgo')}</RowBtn>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {ctx.demo && !ping.mutual && ping.handle && (
        <div style={{ marginTop: 10, paddingLeft: 19 }}>
          <GhostButton C={C} onClick={() => ctx.simulateMutual(ping.handle)} style={{ padding: 0, fontSize: 11, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.8) }}>
            ✦ {t('pings.sim')}
          </GhostButton>
        </div>
      )}
    </GlassPanel>
  )
}

// An empty slot — a dashed glass placeholder holding a faint star, so the number
// of slots you have (and how many are open) is always visible at a glance.
function EmptySlotCard({ C, onClick }) {
  const { t } = useI18n()
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', textAlign: 'left', cursor: 'pointer',
        borderRadius: RADIUS.card,
        background: h ? rgba(C.ink2, 0.5) : rgba(C.ink2, 0.3),
        border: `1.5px dashed ${rgba(C.cream, h ? 0.26 : 0.15)}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'all .2s',
      }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', flexShrink: 0, border: `1px solid ${rgba(C.cream, 0.14)}`, opacity: h ? 1 : 0.7, transition: 'opacity .2s' }}>
        <Brandmark C={C} size={15} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: rgba(C.cream, 0.82) }}>{t('pings.slotEmpty')}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{t('pings.slotEmptySub')}</span>
      </span>
      <span style={{ flex: 1 }} />
      <Icon name="plus" size={16} color={rgba(C.star, 0.8)} stroke={2} />
    </button>
  )
}

// A mutual match on the status page — a resolved outcome, not a standing slot,
// so it lives in its own section and reads compact: the star, the handle, one
// action. It never counts against the three slots.
function MutualCard({ C, ping, ctx }) {
  const { t } = useI18n()
  return (
    <GlassPanel C={C} style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <StateDot C={C} state="mutual" />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: rgba(C.star, 0.9) }}>@</span>{ping.handle}
          </span>
          {ping.intent && (
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 13, color: rgba(C.cream, 0.62), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              “{intentLine(t, ping.intent)}”
            </span>
          )}
        </span>
        <RowBtn C={C} tone="accent" icon="message" onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowBtn>
      </div>
    </GlassPanel>
  )
}

// The communities gateway on the pings page: your ONE joined community (not a
// list) — tappable straight to its ring — plus a way to search for others. If
// you're not in a community yet, it's the same search field, so joining is one
// tap away. Never a wall of colleges.
function CommunityGateway({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const joined = communities.filter((c) => c.joined)
  const [searching, setSearching] = React.useState(false)
  const view = (slug) => ctx.viewCommunity(slug)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 8, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 2px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={13} color={rgba(C.star, 0.85)} stroke={2} />
          <Kicker C={C}>{joined.length ? t('communities.yourCommunity') : t('communities.findYours')}</Kicker>
        </div>
        {joined.length > 0 && (
          <GhostButton C={C} onClick={() => setSearching((s) => !s)} style={{ padding: 0, fontSize: 12, color: rgba(C.star, 0.85) }}>
            {t('communities.searchMore')}
          </GhostButton>
        )}
      </div>
      {joined.length > 0 ? (
        <>
          {joined.map((c) => (
            <CommunityCard key={c.slug} C={C} community={c} ctx={ctx} />
          ))}
          {searching && (
            <div className="fade" style={{ paddingTop: 2 }}>
              <CommunityFinder C={C} ctx={ctx} onPick={view} />
            </div>
          )}
        </>
      ) : (
        <CommunityFinder C={C} ctx={ctx} onPick={view} />
      )}
    </div>
  )
}

export function PingsScreen({ C, ctx }) {
  const { t } = useI18n()
  const pings = ctx.pings || []
  const cap = ctx.slotsCap
  const mutual = pings.filter((p) => p.mutual)
  const active = pings.filter((p) => !p.mutual)
  const used = Math.min(active.length, cap)
  const emptyCount = Math.max(0, cap - active.length)
  const empty = pings.length === 0
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingTop: 6 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Brandmark C={C} size={16} />
          <Kicker C={C}>{t('pings.kicker')}</Kicker>
          {ctx.demo && <SandboxChip C={C} />}
        </div>
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 20 }}>
        {empty ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 33px)', color: C.cream }}>
              {t('pings.emptyTitle')}
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{t('pings.emptyBody')}</p>
          </div>
        ) : (
          // the slot space — always exactly `cap` rows: standing pings, then open
          // slots. mutual matches are resolved and never sit here.
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 2px' }}>
              <Kicker C={C} style={{ fontSize: 10 }}>{t('pings.slotsUsed', { used, cap })}</Kicker>
              <SlotPips C={C} standing={used} cap={cap} compact />
            </div>
            {active.map((p, i) => (
              <PingCard key={(p.handle || 'anon') + i} C={C} ping={p} ctx={ctx} />
            ))}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <EmptySlotCard key={'e' + i} C={C} onClick={ctx.placeAnother} />
            ))}
          </>
        )}

        {/* mutual — its own section, so a match never crowds the slots */}
        {mutual.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: empty ? 0 : 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
              <Kicker C={C} color={rgba(C.star, 0.9)}>✦ {t('pings.mutualKicker')} · {mutual.length}</Kicker>
              <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${rgba(C.star, 0.22)}, transparent)` }} />
            </div>
            {mutual.map((p, i) => (
              <MutualCard key={'m' + (p.handle || i)} C={C} ping={p} ctx={ctx} />
            ))}
          </div>
        )}

        {pings.some((p) => !p.handle) && (
          <p style={{ margin: '4px 4px 0', fontSize: 11.5, lineHeight: 1.6, color: rgba(C.muted, 0.75) }}>{t('pings.elsewhereNote')}</p>
        )}

        {/* the communities gateway — your one community + a search for others */}
        <CommunityGateway C={C} ctx={ctx} />
      </div>

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20 }}>
        <PrimaryButton C={C} onClick={ctx.placeAnother}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="plus" size={16} color={C.onStar} stroke={2.1} /> {empty ? t('pings.emptyCta') : t('pings.add')}
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('door')} style={{ fontSize: 12.5 }}>
            {t('pings.door')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── 5 · THE OPEN-DOOR CARD ────────────────────────────────────────────────────
export function DoorScreen({ C, ctx }) {
  const { t } = useI18n()
  const [preview, setPreview] = React.useState(null)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const me = normHandle(ctx.me) || 'your.handle'
  const line = t('door.line')
  React.useEffect(() => {
    let live = true
    renderDoorCard({ handle: me, line })
      .then((url) => live && setPreview(url))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [me, line])
  const save = async () => {
    try {
      await downloadDoorCard({ handle: me, line })
      setSaved(true)
    } catch {
      /* the preview is still right there to screenshot */
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://celestual.us/@${me}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* ignore */
    }
  }
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Kicker C={C}>{t('door.kicker')}</Kicker>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 14 }}>
        <div className="enter" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.1, color: C.cream }}>
            {t('door.title1')} <span style={{ color: C.star }}>{t('door.title2')}</span>
          </h2>
          <p style={{ margin: '0 auto', fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 330 }}>{t('door.sub')}</p>
        </div>

        {/* the rendered card — the object itself, the hero of the screen */}
        <div
          className="enter"
          style={{
            position: 'relative', width: 'min(252px, 60vw)', aspectRatio: '9 / 16', borderRadius: 22, overflow: 'hidden',
            border: `1px solid ${rgba(C.star, 0.22)}`, boxShadow: `0 30px 90px rgba(0,0,0,.62), 0 0 46px ${rgba(C.star, 0.14)}`,
            background: C.ink2, animationDelay: '.06s',
          }}
        >
          {preview ? (
            <img src={preview} alt={t('door.line')} style={{ width: '100%', height: '100%', display: 'block' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Sonar C={C} size={20} /></div>
          )}
        </div>

        {/* the three steps — a clean numbered rail */}
        <div className="enter" style={{ animationDelay: '.12s', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Kicker C={C} style={{ fontSize: 10, paddingLeft: 2, marginBottom: 6 }}>{t('door.stepsKicker')}</Kicker>
          {[t('door.step1'), t('door.step2'), t('door.step3')].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 2px' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: rgba(C.star, 0.12), border: `1px solid ${rgba(C.star, 0.3)}`, color: C.star, fontFamily: "'Space Mono', monospace", fontSize: 12.5 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.45, color: rgba(C.cream, 0.86) }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.16s', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 18 }}>
        <PrimaryButton C={C} onClick={save}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="download" size={16} color={C.onStar} stroke={2} /> {saved ? t('door.saved') : t('door.save')}
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={copyLink} style={{ fontSize: 12.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name={copied ? 'check' : 'copy'} size={13} color="currentColor" /> {copied ? t('door.copied') : t('door.copy')}
            </span>
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.55, color: rgba(C.muted, 0.8) }}>{t('door.foot')}</p>
      </div>
    </Shell>
  )
}

// ── COMMUNITIES (the official, curated launch spaces) ─────────────────────────
// Communities are not user-created — the team owns the list (communities.js); a
// user only joins or leaves. Placing a ping never depends on any of this. Each
// community climbs toward a team-set threshold, shown as a ring; at the threshold
// it OPENS and its live weekly readout lights up. The demo seeds them live, with
// a rolling activity feed, and lets you join — all in-memory, gone on tab close.

// a small breathing amber dot — "this is live"
function LiveDot({ C }) {
  return <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: rgba(C.star, 0.95), boxShadow: `0 0 9px ${rgba(C.star, 0.7)}`, animation: 'breathe 3.6s ease-in-out infinite' }} />
}

// The live activity stack: a few anonymized beats at once, the newest at the
// bottom, older ones ageing (dimmer) above it before they drop off — so the
// campus reads as actively used, and a couple are always legible instead of one
// chip flickering. Each new beat also nudges the community it names
// (ctx.bumpCommunityActivity), so a watched ring climbs as you read. Filter the
// pool by slug at the call site to keep a community page's signal exclusive to it.
const BEAT_MS = 2800 // cadence between beats
const BEAT_LIFE = 8400 // how long one beat lingers before it drops off
function useLiveStack(active, pool, onBeat) {
  const [items, setItems] = React.useState([])
  const onBeatRef = React.useRef(onBeat)
  onBeatRef.current = onBeat
  const idRef = React.useRef(0)
  React.useEffect(() => {
    if (!active || !pool || !pool.length) {
      setItems([])
      return undefined
    }
    const timers = []
    const fire = () => {
      const b = pool[Math.floor(Math.random() * pool.length)]
      const id = ++idRef.current
      setItems((prev) => [...prev, { id, text: b.text }].slice(-3))
      if (onBeatRef.current) onBeatRef.current(b)
      timers.push(setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), BEAT_LIFE))
    }
    const first = setTimeout(fire, 700)
    const iv = setInterval(fire, BEAT_MS)
    return () => {
      clearTimeout(first)
      clearInterval(iv)
      timers.forEach(clearTimeout)
    }
  }, [active, pool])
  return items
}

// The stack itself — plain lines, no chip, no icon. The newest is brightest; the
// older lines dim by age. A fixed min-height reserves the space so nothing under
// it jumps as beats come and go.
function LiveStack({ C, items }) {
  const AGE = [0.94, 0.5, 0.26] // newest → oldest
  return (
    <div style={{ minHeight: 62, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
      {items.map((it, i) => {
        const age = items.length - 1 - i // 0 = newest (bottom)
        return (
          <span
            key={it.id}
            className="live-line"
            style={{
              display: 'block', textAlign: 'center', fontSize: 12.5, lineHeight: 1.4,
              fontFamily: "'Space Grotesk', sans-serif", color: rgba(C.cream, 0.9), opacity: AGE[age] ?? 0.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {it.text}
          </span>
        )
      })}
    </div>
  )
}

// The status a community wears: open (amber, live) or gathering (cool, waiting).
function CommunityStatus({ C, open }) {
  const { t } = useI18n()
  if (open) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: rgba(C.star, 0.95), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.3)}`, borderRadius: RADIUS.chip, padding: '4px 10px', flexShrink: 0 }}>
        <LiveDot C={C} /> {t('communities.open')}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: C.muted, background: rgba(C.cream, 0.05), border: `1px solid ${C.line}`, borderRadius: RADIUS.chip, padding: '4px 10px', flexShrink: 0 }}>
      <Sonar C={C} size={11} /> {t('communities.gathering')}
    </span>
  )
}

// One community as a list row: the seal, its name + status, a compact ring. The
// whole row opens the community; a joined one is marked.
function CommunityCard({ C, community, ctx }) {
  const { frac, open } = communityProgress(community)
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={() => ctx.viewCommunity(community.slug)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '14px 15px', borderRadius: RADIUS.card,
        background: rgba(C.ink2, h ? 0.72 : 0.6), border: `1px solid ${rgba(C.cream, h ? 0.16 : 0.1)}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', transition: 'background .2s, border-color .2s',
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={46} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
          {community.joined && <Icon name="check" size={13} color={rgba(C.star, 0.9)} />}
        </span>
        <CommunityStatus C={C} open={open} />
      </span>
      <ProgressRing C={C} frac={open ? 1 : frac} size={62} />
    </button>
  )
}

export function WorldsScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const feed = useLiveStack(ctx.demo, ctx.feedPool, (b) => ctx.bumpCommunityActivity(b.slug, b.kind))
  // joined first, then by how close each is to opening
  const ordered = [...communities].sort(
    (a, b) => (b.joined ? 1 : 0) - (a.joined ? 1 : 0) || communityProgress(b).frac - communityProgress(a).frac,
  )
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Kicker C={C}>{t('communities.kicker')}</Kicker>
          {ctx.demo && <SandboxChip C={C} />}
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
        <p style={{ margin: '0 2px', fontSize: 13, lineHeight: 1.55, color: C.muted }}>{t('communities.intro')}</p>
        {ctx.demo && feed.length > 0 && <LiveStack C={C} items={feed} />}
        {ordered.map((c) => (
          <CommunityCard key={c.slug} C={C} community={c} ctx={ctx} />
        ))}
      </div>

      <p style={{ margin: '16px 2px 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>{t('communities.foot')}</p>
    </Shell>
  )
}

// One shared launch moment for every curated campus: the upcoming midnight ~a
// day and a half out (24–48h), so each gathering community counts down to the
// SAME instant — "it all goes live together." Computed once per load so the
// countdown is stable across renders and screens.
const LAUNCH_AT = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 2)
  return d.getTime()
})()

function useCountdown(target) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, target - now)
  return {
    h: Math.floor(left / 3600000),
    m: Math.floor((left % 3600000) / 60000),
    s: Math.floor((left % 60000) / 1000),
    done: left <= 0,
  }
}

// The launch countdown that sits atop a gathering community's ring: every campus
// opens at one shared midnight, so this is a live count to that instant.
function LaunchCountdown({ C, target }) {
  const { t } = useI18n()
  const { h, m, s } = useCountdown(target)
  const pad = (n) => String(n).padStart(2, '0')
  const day = React.useMemo(() => {
    try {
      return new Date(target).toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase()
    } catch {
      return ''
    }
  }, [target])
  const Unit = ({ v, label }) => (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 40 }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 27, lineHeight: 1, color: C.cream, fontVariantNumeric: 'tabular-nums' }}>{pad(v)}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '1.4px', textTransform: 'uppercase', color: C.muted }}>{label}</span>
    </span>
  )
  const Colon = () => <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, color: rgba(C.star, 0.55), transform: 'translateY(-6px)' }}>:</span>
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320,
        padding: '15px 18px', borderRadius: RADIUS.card, background: rgba(C.ink2, 0.55),
        border: `1px solid ${rgba(C.star, 0.2)}`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <LiveDot C={C} />
        <Kicker C={C} color={rgba(C.star, 0.92)} style={{ fontSize: 10 }}>{t('communities.liveLabel')}</Kicker>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Unit v={h} label={t('communities.liveH')} />
        <Colon />
        <Unit v={m} label={t('communities.liveM')} />
        <Colon />
        <Unit v={s} label={t('communities.liveS')} />
      </div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.4px', color: rgba(C.cream, 0.72) }}>
        {t('communities.liveAt', { day })}
      </span>
    </div>
  )
}

// The community page (also the /c/<slug> destination). The big ring is the hero;
// a gathering community shows what opens at the threshold, an open one shows its
// live weekly readout. One primary action: join, or — once joined — place a ping.
export function CommunityScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const community = communities.find((c) => c.slug === ctx.openCommunity) || communities[0]
  // signal exclusive to THIS campus — filter the demo feed to this slug (memoized
  // so the stack's interval isn't torn down every render).
  const slug = community && community.slug
  const pool = React.useMemo(() => (ctx.feedPool || []).filter((b) => b.slug === slug), [ctx.feedPool, slug])
  const feed = useLiveStack(ctx.demo, pool, (b) => ctx.bumpCommunityActivity(b.slug, b.kind))
  if (!community) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackBtn C={C} onClick={() => ctx.go('worlds')} />
          <Brandmark C={C} size={18} />
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: C.muted }}>{t('communities.none')}</p>
        </div>
        <div />
      </Shell>
    )
  }
  const { frac, open } = communityProgress(community)
  const week = open ? community.week : null
  const matches = Number((week && week.matches) || 0)
  const showMatches = matches >= 10
  const joined = !!community.joined
  const locks = [t('communities.lock1'), t('communities.lock2'), t('communities.lock3')]
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('worlds')} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Kicker C={C}>{t('communities.kicker')}</Kicker>
          {ctx.demo && <SandboxChip C={C} />}
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <SchoolMark C={C} slug={community.slug} size={58} />
          <h1 style={{ margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 38px)', lineHeight: 1.1, color: C.cream }}>{community.name}</h1>
        </div>

        {/* the shared launch countdown — atop a still-gathering ring, all campuses
            open at the same midnight */}
        {!open && <LaunchCountdown C={C} target={LAUNCH_AT} />}

        <ProgressRing C={C} frac={open ? 1 : frac} size={188} label={open ? RING_LABELS.open : RING_LABELS.climbing} />

        {open && week ? (
          <div className="fade" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LiveDot C={C} />
              <Kicker C={C} style={{ fontSize: 10 }}>{t('communities.thisWeek')}</Kicker>
            </div>
            {showMatches ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span key={matches} className="fade" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(34px, 11vw, 46px)', lineHeight: 1, color: C.star, textShadow: `0 0 26px ${rgba(C.star, 0.28)}` }}>{matches.toLocaleString()}</span>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17, color: rgba(C.cream, 0.9) }}>{t('communities.matchedLabel')}</span>
              </div>
            ) : (
              <p style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: rgba(C.cream, 0.82) }}>{t('communities.matchFloor')}</p>
            )}
            {week.topReason && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
                {t('communities.reasonLabel')}{' '}
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15, color: rgba(C.cream, 0.9) }}>“{intentLine(t, week.topReason)}”</span>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap', fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.3px', color: rgba(C.muted, 0.9) }}>
              {week.pings != null && <span>{t('communities.pings', { n: Number(week.pings).toLocaleString() })}</span>}
              {week.pings != null && week.joined != null && <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />}
              {week.joined != null && <span style={{ color: rgba(C.star, 0.85) }}>{t('communities.joinedWeek', { n: Number(week.joined).toLocaleString() })}</span>}
            </div>
          </div>
        ) : (
          <div className="fade" style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.55, color: C.muted }}>{t('communities.gatheringBody')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {locks.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, color: rgba(C.muted, 0.78), fontSize: 12.5 }}>
                  <Icon name="lock" size={13} color={rgba(C.muted, 0.6)} /> <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* the campus's own live signal — a quiet stack, exclusive to this school */}
        {ctx.demo && feed.length > 0 && (
          <div style={{ width: '100%', maxWidth: 340, marginTop: 2 }}>
            <LiveStack C={C} items={feed} />
          </div>
        )}
      </div>

      <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
        {joined ? (
          <>
            <PrimaryButton C={C} onClick={ctx.findOut}>{t('communities.place')}</PrimaryButton>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GhostButton C={C} onClick={() => ctx.leaveCommunity(community.slug)} style={{ fontSize: 12.5 }}>{t('communities.leave')}</GhostButton>
            </div>
          </>
        ) : (
          <PrimaryButton C={C} onClick={() => ctx.joinCommunity(community.slug)}>{t('communities.join', { name: community.short })}</PrimaryButton>
        )}
        {ctx.demo && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={() => ctx.bumpCommunityActivity(community.slug, 'ping')} style={{ padding: 0, fontSize: 11, letterSpacing: '.5px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.8) }}>
              ✦ {t('communities.demoActivity')}
            </GhostButton>
          </div>
        )}
      </div>
    </Shell>
  )
}

// One result row inside the community finder's popup — its own component so the
// hover lift stays local.
function FinderRow({ C, community, onPick }) {
  const { t } = useI18n()
  const [h, setH] = React.useState(false)
  const { open } = communityProgress(community)
  return (
    <button
      onClick={() => onPick(community.slug)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: RADIUS.inner,
        border: 'none', cursor: 'pointer', textAlign: 'left', background: h ? rgba(C.star, 0.09) : 'transparent', transition: 'background .16s',
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={34} />
      <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.4px', textTransform: 'uppercase', color: open ? rgba(C.star, 0.9) : C.muted }}>
          {open ? t('communities.open') : t('communities.gathering')}{community.joined ? ` · ${t('communities.joinedTag')}` : ''}
        </span>
      </span>
      {community.joined ? (
        <Icon name="check" size={16} color={rgba(C.star, 0.9)} stroke={2.2} />
      ) : (
        <Icon name="plus" size={15} color={rgba(C.star, 0.85)} stroke={2} />
      )}
    </button>
  )
}

// The shared "find your community" control: a real search field that, on focus,
// pops open the curated schools. Picking one calls onPick(slug) — join it, or
// open its page, depending on the caller. Placing a ping never depends on any of
// this, so every use is skippable.
function CommunityFinder({ C, ctx, onPick, autoFocus }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [focus, setFocus] = React.useState(false)
  const boxRef = React.useRef(null)
  const SHADOW = makeShadow(C)
  const ql = q.trim().toLowerCase()
  const results = communities.filter(
    (c) => !ql || c.name.toLowerCase().includes(ql) || (c.short || '').toLowerCase().includes(ql) || c.slug.replace(/-/g, ' ').includes(ql),
  )
  React.useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const lit = focus || open
  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 16px', borderRadius: RADIUS.field,
          background: C.ink2, border: `1.5px solid ${lit ? rgba(C.star, 0.7) : C.line}`,
          boxShadow: lit ? SHADOW.focus(C.star) : 'none', transition: 'border-color .2s, box-shadow .25s', cursor: 'text',
        }}
      >
        <Icon name="search" size={19} color={rgba(C.star, 0.9)} stroke={1.9} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }}
          onBlur={() => setFocus(false)}
          placeholder={t('communities.searchPlaceholder')}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="none"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.cream, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, letterSpacing: '.2px' }}
        />
        <span aria-hidden style={{ display: 'grid', placeItems: 'center', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.75 }}>
          <Icon name="back" size={14} color={C.muted} stroke={1.9} />
        </span>
      </div>
      {open && (
        <div
          className="fade"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 25, padding: 6,
            borderRadius: RADIUS.card, background: rgba(C.ink2, 0.98), border: `1px solid ${rgba(C.star, 0.2)}`,
            boxShadow: SHADOW.menu, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', maxHeight: 320, overflowY: 'auto',
          }}
        >
          {results.length ? (
            results.map((c) => <FinderRow key={c.slug} C={C} community={c} onPick={(slug) => { onPick(slug); setOpen(false) }} />)
          ) : (
            <div style={{ padding: '14px 12px', fontSize: 13, lineHeight: 1.5, color: C.muted }}>{t('communities.searchNone')}</div>
          )}
        </div>
      )}
    </div>
  )
}

// A joined community shown as a removable chip (the onboarding step's selections).
function JoinedChip({ C, community, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 8px', borderRadius: RADIUS.chip, background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.4)}` }}>
      <SchoolMark C={C} slug={community.slug} size={20} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500, color: C.cream }}>{community.short || community.name}</span>
      <button
        onClick={onRemove}
        aria-label="remove"
        style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: rgba(C.cream, 0.7) }}
      >
        <Icon name="x" size={12} color="currentColor" />
      </button>
    </span>
  )
}

// ── AFFILIATED SCHOOLS (new-user onboarding, after identity) ──────────────────
// Shown once, between proving your @ and placing your first ping: a search that
// reveals the curated communities. Joining is optional — the ping places either
// way — but being in one makes the silence feel less lonely. One primary action
// places the ping; the search above it is a skippable extra.
export function SchoolsScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const joined = communities.filter((c) => c.joined)
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('you')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl, paddingTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center', alignItems: 'center' }}>
          <Kicker C={C}>{t('schools.kicker')}</Kicker>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.12, color: C.cream }}>
            {t('schools.title1')}<br /><span style={{ color: C.star }}>{t('schools.title2')}</span>
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 330 }}>{t('schools.sub')}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldLabel C={C} optional={t('communities.searchOptional')}>{t('communities.searchLabel')}</FieldLabel>
          <CommunityFinder C={C} ctx={ctx} onPick={(slug) => ctx.joinCommunity(slug)} />
          {joined.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
              {joined.map((c) => (
                <JoinedChip key={c.slug} C={C} community={c} onRemove={() => ctx.leaveCommunity(c.slug)} />
              ))}
            </div>
          ) : (
            <Hint C={C} icon="search" color={rgba(C.star, 0.85)}>{t('communities.searchOpen')}</Hint>
          )}
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.1s', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryButton C={C} onClick={ctx.finishOnboarding}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="lock" size={16} color={C.onStar} stroke={2} /> {joined.length > 0 ? t('schools.cta') : t('schools.ctaSkip')}
          </span>
        </PrimaryButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('schools.foot')}</p>
      </div>
    </Shell>
  )
}

// ── 8 · THE MATCH ─────────────────────────────────────────────────────────────
export function MatchScreen({ C, ctx }) {
  const { t } = useI18n()
  const m = ctx.match || {}
  const them = m.them || normHandle(ctx.them) || 'them'
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        {/* the one place the brand permits brightness — the star, larger than anywhere */}
        <div className="enter"><StarMark C={C} size={128} /></div>
        <h1 className="enter" style={{ animationDelay: '.1s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(38px, 11vw, 52px)', lineHeight: 1.05, color: C.cream }}>
          {t('match.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.18s', margin: 0, fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 320 }}>
          {t('match.sub', { them })}
        </p>
        {(m.theirIntent || m.yourIntent) && (
          <div className="enter" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 330 }}>
            {m.theirIntent && (
              <div style={{ border: `1px solid ${rgba(C.star, 0.35)}`, borderRadius: RADIUS.card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Kicker C={C} style={{ fontSize: 10 }}>{t('match.theySaid')}</Kicker>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 19, color: C.cream }}>
                  “{intentLine(t, m.theirIntent, true)}”
                </span>
              </div>
            )}
            {m.yourIntent && (
              <div style={{ border: `1px solid ${C.line}`, borderRadius: RADIUS.card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Kicker C={C} style={{ fontSize: 10 }}>{t('match.youSaid')}</Kicker>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 19, color: rgba(C.cream, 0.85) }}>
                  “{intentLine(t, m.yourIntent, true)}”
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="enter" style={{ animationDelay: '.32s', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryButton C={C} onClick={() => ctx.openConversation(them)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('match.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        {/* no share button, no confetti, no screenshot-bait: the story travels by
            telling, and the absence of a gotcha artifact IS the anti-humiliation
            architecture (framework Screen 8) */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('match.exit')}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12 }}>
            {t('placed.pings')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── THE SEND-OFF — the @ becomes a star and flies into the galaxy ─────────────
// The flight itself is drawn by the galaxy canvas (owned by App): the @ field
// collapses into a star (the Liftoff overlay), which coalesces at that point and
// drifts on into the disk. This shell only holds a calm line, low on the screen
// so it never sits under the flight path, while that ~5s plays out.
export function SendoffScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <Shell>
      <div style={{ flex: 1 }} />
      <div className="sendoff-line" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 'clamp(24px, 12vh, 90px)' }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(24px, 7vw, 30px)', color: C.cream }}>{t('sendoff.title')}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 12.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>
          <Sonar C={C} size={11} /> {t('sendoff.sub')}
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </Shell>
  )
}

// ── 9 · THE FOURTH SLOT ───────────────────────────────────────────────────────
// Production keeps ONE door — "let one go" — with no money anywhere, per
// docs/PRICING-REVENUE.md (Stripe stays plumbed and dormant until density is
// proven). The /demo build previews the one-time fourth slot behind a realistic
// checkout, so the eventual shape is visible without waking anything real. The
// checkout only ever appears here, at the moment a user runs out of slots.

// The card-brand marks that sit at the end of a Stripe card field — the two
// product stars double as the mastercard glyph, so no third hue enters.
function CardBrands({ C }) {
  const shell = { width: 26, height: 16, borderRadius: 3, border: `1px solid ${C.line}`, background: rgba(C.cream, 0.06), display: 'grid', placeItems: 'center', flexShrink: 0 }
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }} aria-hidden>
      <span style={{ ...shell, fontFamily: "'Space Mono', monospace", fontSize: 7, fontWeight: 700, letterSpacing: '.5px', color: rgba(C.cream, 0.55) }}>VISA</span>
      <span style={shell}>
        <span style={{ display: 'inline-flex' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rgba(C.them, 0.85) }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rgba(C.star, 0.85), marginLeft: -4 }} />
        </span>
      </span>
    </span>
  )
}

// One inert Stripe-style field. Typeable, but the value is never read or stored
// (the sandbox note says so); it exists to make the checkout read as real.
function PayField({ C, value, onChange, placeholder, mono, trailing, inputMode }) {
  const [focus, setFocus] = React.useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 13px', borderRadius: RADIUS.inner, background: C.ink, border: `1px solid ${focus ? rgba(C.star, 0.55) : C.line}`, transition: 'border-color .18s' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        inputMode={inputMode || 'numeric'}
        spellCheck={false}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.cream, fontFamily: mono ? "'Space Mono', monospace" : "'Space Grotesk', sans-serif", fontSize: 14.5, letterSpacing: mono ? '.5px' : '.2px' }}
      />
      {trailing}
    </div>
  )
}

// The sandbox checkout for the one-time fourth slot.
function FourthSlotPaywall({ C, ctx }) {
  const { t } = useI18n()
  const [phase, setPhase] = React.useState('form') // form | paying | done
  const [card, setCard] = React.useState('')
  const [exp, setExp] = React.useState('')
  const [cvc, setCvc] = React.useState('')
  const [zip, setZip] = React.useState('')
  const timer = React.useRef(null)
  React.useEffect(() => () => timer.current && clearTimeout(timer.current), [])
  const pay = () => {
    if (phase !== 'form') return
    setPhase('paying')
    // hold the flag until the user leaves the "done" state — flipping it now
    // would swap this screen out from under its own success view.
    timer.current = setTimeout(() => setPhase('done'), 1500)
  }
  const price = t('paywall.price')

  if (phase === 'done') {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 38 }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Kicker C={C}>{t('paywall.kicker')}</Kicker>
            <SandboxChip C={C} />
          </div>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
          <div className="enter floaty"><StarMark C={C} size={78} /></div>
          <div style={{ display: 'flex', gap: 11 }}>
            {[0, 1, 2, 3].map((i) => <Brandmark key={i} C={C} size={17} />)}
          </div>
          <h1 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', color: C.cream }}>{t('paywall.doneTitle')}</h1>
          <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{t('paywall.doneSub')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton C={C} onClick={ctx.placeFourth}>{t('paywall.donePlace')}</PrimaryButton>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={() => { ctx.buyFourthSlot(); ctx.go('pings') }} style={{ fontSize: 12.5 }}>{t('placed.pings')}</GhostButton>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('pings')} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Kicker C={C}>{t('paywall.kicker')}</Kicker>
          <SandboxChip C={C} />
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, paddingTop: 12 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', color: C.cream }}>{t('paywall.title')}</h1>
          <p style={{ margin: '0 auto', fontSize: 13, lineHeight: 1.55, color: C.muted, maxWidth: 320 }}>{t('paywall.sub')}</p>
        </div>

        {/* the checkout card */}
        <GlassPanel C={C} style={{ padding: '16px 16px 15px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <Brandmark C={C} size={16} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>{t('paywall.kicker')}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 17, fontWeight: 700, color: C.cream }}>{price}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.5px', textTransform: 'uppercase', color: C.muted }}>{t('paywall.priceUnit')}</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PayField C={C} value={card} onChange={setCard} placeholder={t('paywall.cardNumber')} mono trailing={<CardBrands C={C} />} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1.15, minWidth: 0 }}><PayField C={C} value={exp} onChange={setExp} placeholder={t('paywall.expiry')} mono /></div>
              <div style={{ flex: 1, minWidth: 0 }}><PayField C={C} value={cvc} onChange={setCvc} placeholder={t('paywall.cvc')} mono /></div>
              <div style={{ flex: 1, minWidth: 0 }}><PayField C={C} value={zip} onChange={setZip} placeholder={t('paywall.zip')} /></div>
            </div>
          </div>

          <PrimaryButton C={C} disabled={phase === 'paying'} onClick={pay}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              {phase === 'paying' ? t('paywall.paying') : <><Icon name="lock" size={15} color={C.onStar} stroke={2} /> {t('paywall.pay', { price })}</>}
            </span>
          </PrimaryButton>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.4px', color: rgba(C.muted, 0.85) }}>
            <Icon name="lock" size={11} color={rgba(C.muted, 0.75)} stroke={1.8} /> {t('paywall.secure')}
            <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />
            {t('paywall.stripe')}
          </div>
        </GlassPanel>

        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: rgba(C.star, 0.85) }}>{t('paywall.demoNote')}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>{t('paywall.letgo')}</GhostButton>
      </div>
    </Shell>
  )
}

export function FourthSlotScreen({ C, ctx }) {
  const { t } = useI18n()
  // sandbox only, and only until the fourth is actually held: the checkout
  // preview. everywhere else — production, or the demo once four are held — the
  // single dormant door.
  if (ctx.demo && !ctx.demoFourthSlot) return <FourthSlotPaywall C={C} ctx={ctx} />
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('pings')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
        {/* the slots, all held — shown as the product's own star icon */}
        <div style={{ display: 'flex', gap: 12 }}>
          {Array.from({ length: ctx.slotsCap }).map((_, i) => (
            <Brandmark key={i} C={C} size={18} />
          ))}
        </div>
        <h1 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8vw, 38px)', color: C.cream }}>
          {t('fourth.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.muted, maxWidth: 300 }}>
          {t('fourth.body')}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryButton C={C} onClick={() => ctx.go('pings')}>{t('fourth.cta')}</PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>
            {t('fourth.back')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── PRIVACY & THE OPT-OUT ─────────────────────────────────────────────────────
export function PrivacyScreen({ C, ctx }) {
  const { t } = useI18n()
  const [handle, setHandle] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const ok = handle.trim().length >= 2
  const submit = async () => {
    if (!ok || status === 'working') return
    setStatus('working')
    try {
      await ctx.suppressHandle(handle)
      setStatus('done')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }
  const H = ({ children }) => (
    <h3 style={{ margin: '20px 0 6px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>{children}</h3>
  )
  const P = ({ children }) => <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted }}>{children}</p>

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 }}>
        <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.16, color: C.cream }}>
          {t('privacy.title')}
        </h2>

        <H>{t('privacy.h1')}</H>
        <P>{t('privacy.p1')}</P>
        <H>{t('privacy.h2')}</H>
        <P>{t('privacy.p2')}</P>
        <H>{t('privacy.h3')}</H>
        <P>{t('privacy.p3')}</P>
        <H>{t('privacy.h4')}</H>
        <P>{t('privacy.p4')}</P>
        <H>{t('privacy.h6')}</H>
        <P>{t('privacy.p6')}</P>

        <H>{t('privacy.h5')}</H>
        <P>{t('privacy.p5')}</P>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field C={C} kind="handle" value={handle} onChange={setHandle} placeholder={t('privacy.removePlaceholder')} />
          <PrimaryButton C={C} disabled={!ok || status === 'working'} onClick={submit}>
            {status === 'working' ? t('privacy.removing') : t('privacy.removeCta')}
          </PrimaryButton>
          {status === 'done' && (
            <P>
              {t('privacy.removed1')} <HandleChip C={C} handle={normHandle(handle)} /> {t('privacy.removed2')}
            </P>
          )}
          {status === 'error' && <div style={{ fontSize: 13, color: rgba(C.star, 0.95) }}>{t('privacy.removeErr')}</div>}
        </div>

        <p style={{ margin: '22px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          {t('privacy.foot')} <a href="mailto:privacy@celestual.us" style={{ color: C.muted }}>privacy@celestual.us</a>.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          <a href="/privacy" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.fullPolicy')}</a>
          {' · '}
          <a href="/terms" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.tos')}</a>
          {' · '}
          <a href="/data-deletion" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.deleteData')}</a>
        </p>
      </div>
    </Shell>
  )
}

// ── ACCOUNT (identity, worlds, the exits) ─────────────────────────────────────
function AccountsEditor({ C, ctx }) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(ctx.altHandles.length > 0)
  const [draft, setDraft] = React.useState('')
  const total = 1 + ctx.altHandles.length
  const canAdd = total < 3
  const add = () => {
    const n = normHandle(draft)
    if (!n || n === normHandle(ctx.me)) {
      setDraft('')
      return
    }
    ctx.addAltHandle(n)
    setDraft('')
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: rgba(C.star, 0.9), fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}
      >
        <Icon name="plus" size={14} color="currentColor" stroke={2} /> {t('accounts.add')}
      </button>
    )
  }
  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <FieldLabel C={C} optional={t('accounts.optional')}>{t('accounts.label')}</FieldLabel>
      {ctx.altHandles.map((h) => (
        <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <HandleChip C={C} handle={h} />
          <button
            onClick={() => ctx.removeAltHandle(h)}
            aria-label={t('accounts.remove')}
            style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
          >
            <Icon name="x" size={13} color="currentColor" />
          </button>
        </div>
      ))}
      {canAdd && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field C={C} kind="handle" value={draft} onChange={setDraft} placeholder={t('accounts.placeholder')} onEnter={add} />
          </div>
          <OutlineButton C={C} onClick={add} style={{ flexShrink: 0 }}>{t('accounts.addBtn')}</OutlineButton>
        </div>
      )}
      <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('accounts.note')}</Hint>
    </div>
  )
}

// Communities are curated, so the account only SHOWS the ones you're in (join /
// leave lives on the community pages). A read-only summary + a way in.
function CommunitiesSummary({ C, ctx }) {
  const { t } = useI18n()
  const joined = (ctx.communities || []).filter((c) => c.joined)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <FieldLabel C={C}>{t('communities.label')}</FieldLabel>
        <GhostButton C={C} onClick={() => { ctx.closeAccount(); ctx.go('worlds') }} style={{ padding: 0, fontSize: 12, color: rgba(C.star, 0.85) }}>
          {t('communities.browse')} →
        </GhostButton>
      </div>
      {joined.length === 0 ? (
        <span style={{ fontSize: 13, lineHeight: 1.5, color: C.muted }}>{t('communities.summaryNone')}</span>
      ) : (
        joined.map((c) => {
          const { open } = communityProgress(c)
          return (
            <div key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <SchoolMark C={C} slug={c.slug} size={30} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.4px', textTransform: 'uppercase', color: open ? rgba(C.star, 0.9) : C.muted, flexShrink: 0 }}>
                {open ? t('communities.open') : t('communities.gathering')}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

export function AccountSheet({ C, ctx }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const [confirmDel, setConfirmDel] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const close = () => ctx.closeAccount()
  const dialogRef = useDialog(close)
  const onDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true)
      return
    }
    setDeleting(true)
    try {
      await ctx.deleteEverything()
    } finally {
      setDeleting(false)
    }
  }
  const standing = ctx.slotsStanding
  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.72), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('account.kicker')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 410, margin: 'auto 0', background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '30px 26px 26px', display: 'flex', flexDirection: 'column', gap: 24, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brandmark C={C} size={14} />
              <Kicker C={C}>{t('account.kicker')}</Kicker>
              {ctx.demo && <SandboxChip C={C} />}
            </div>
            <div style={{ marginTop: 12, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 9vw, 37px)', lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: C.star }}>@</span>{ctx.me || 'you'}
            </div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: ctx.verified ? rgba(C.star, 0.95) : C.muted }}>
              {ctx.verified && <Icon name="instagram" size={12} color={rgba(C.star, 0.95)} />}
              {ctx.verified ? t('account.verified') : t('account.localOnly')}
            </div>
          </div>
          <button onClick={close} aria-label={t('account.close')} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={15} color="currentColor" />
          </button>
        </div>

        <Rule C={C} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C}>{t('account.handleLabel')}</FieldLabel>
            <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder="your.handle" />
            {ctx.verifyEnabled && !ctx.verified && (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('account.reverifyNote')}</Hint>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C} optional={t('account.emailOptional')}>{t('account.emailLabel')}</FieldLabel>
            <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder="you@email.com" />
            <Hint C={C} icon="mail">{t('account.emailNote')}</Hint>
          </div>
          <AccountsEditor C={C} ctx={ctx} />
        </div>

        <Rule C={C} />

        {/* your worlds — the community counters you carry */}
        <CommunitiesSummary C={C} ctx={ctx} />

        <Rule C={C} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: standing ? C.cream : C.muted, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
            {standing > 0 && <StateDot C={C} state="standing" />} {standing > 0 ? t('account.pingsLine', { n: standing }) : t('account.pingsNone')}
          </span>
          <GhostButton C={C} onClick={() => { close(); ctx.go('pings') }} style={{ padding: 0, fontSize: 12.5, color: C.star }}>
            {t('account.pingsOpen')} →
          </GhostButton>
        </div>

        <Rule C={C} />

        {!confirmDel ? (
          // sign out / delete are available everywhere, including the sandbox
          // (there they reset the demo and land back on the cold landing — the
          // handlers are already demo-safe, nothing reaches a server).
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {ctx.demo && (
              <span style={{ fontSize: 12, lineHeight: 1.55, color: C.muted }}>{t('account.sandboxNote')}</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {(ctx.verified || ctx.demo) && (
                <GhostButton C={C} onClick={ctx.signOut} style={{ padding: 0, fontSize: 13, color: C.cream }}>
                  {t('account.signOut')}
                </GhostButton>
              )}
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: rgba(C.muted, 0.9) }}>
                {t('account.delete')}
              </GhostButton>
            </div>
          </div>
        ) : (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: C.cream }}>{ctx.demo ? t('account.deleteConfirmDemo') : t('account.deleteConfirm')}</span>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: C.star }}>
                {deleting ? t('account.deleting') : t('account.deleteYes')}
              </GhostButton>
              <GhostButton C={C} onClick={() => setConfirmDel(false)} style={{ padding: 0, fontSize: 13, color: C.muted }}>
                {t('account.cancel')}
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── INSTAGRAM DM VERIFICATION (prove the @ is yours — no OAuth) ────────────────
// Copy a code to the clipboard and DM it to our Instagram; Meta's webhook tells
// the backend who really sent it, and this overlay watches for the flip. It
// never navigates, so the in-memory ping survives underneath it. The /demo
// variant runs the same overlay but auto-verifies locally (real verification
// isn't wired in the sandbox — it says so on its face).

const VERIFIED_HOLD_MS = 2000

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent || '')
}

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

// Open Instagram WITHOUT stranding the user (desktop → wide popup; mobile /
// in-app webview → same-tab universal link; savePending resumes on return).
function openExternal(appUrl, webUrl = appUrl) {
  if (isInAppBrowser() || isMobile()) {
    try {
      window.location.href = appUrl
    } catch {
      /* ignore */
    }
    return
  }
  const url = webUrl
  try {
    const aw = window.screen?.availWidth || 1280
    const ah = window.screen?.availHeight || 800
    const w = Math.min(720, Math.max(560, aw - 80))
    const h = Math.min(840, ah - 60)
    const baseX = window.screenLeft ?? window.screenX ?? 0
    const baseY = window.screenTop ?? window.screenY ?? 0
    const vw = window.innerWidth || document.documentElement.clientWidth || w
    const vh = window.innerHeight || document.documentElement.clientHeight || h
    const left = Math.max(0, baseX + (vw - w) / 2)
    const top = Math.max(0, baseY + (vh - h) / 2)
    window.open(url, '_blank', `popup,noopener,width=${w},height=${h},left=${left},top=${top}`)
  } catch {
    try {
      window.location.href = url
    } catch {
      /* ignore */
    }
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
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

export function IgVerifySheet({ C, handle, demo, onVerified, onClose }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const ig = igUsername()
  const [phase, setPhase] = React.useState('starting') // starting | waiting | verified | expired | error
  const [token, setToken] = React.useState('')
  const [errCode, setErrCode] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const proofRef = React.useRef(null)
  const hashRef = React.useRef(null)
  const expiryRef = React.useRef(0)
  const pollRef = React.useRef(null)
  const doneRef = React.useRef(null)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  React.useEffect(() => () => { if (doneRef.current) clearTimeout(doneRef.current) }, [])

  const begin = React.useCallback(async () => {
    stopPoll()
    setPhase('starting')
    setErrCode('')
    setCopied(false)
    setToken('')
    // Demo: never touch the backend. Mint a local code + proof and let the
    // polling effect auto-confirm after a beat — the whole DM flow reads
    // end-to-end with no server (the auto-verify is the sandbox stand-in until
    // real verification is switched on).
    if (demo) {
      proofRef.current = genProof()
      hashRef.current = null
      expiryRef.current = Date.now() + 10 * 60 * 1000
      setToken(String(Math.floor(1000 + Math.random() * 9000)))
      setPhase('waiting')
      return
    }
    try {
      const r = await startVerification(handle)
      proofRef.current = r.proof
      hashRef.current = r.proofHash
      expiryRef.current = Date.parse(r.expiresAt) || Date.now() + 10 * 60 * 1000
      savePending({ handle, token: r.token, proofHash: r.proofHash, proof: r.proof, expiresAt: r.expiresAt })
      setToken(r.token)
      setPhase('waiting')
    } catch (e) {
      setErrCode(e?.code || 'error')
      setPhase('error')
    }
  }, [handle, demo])

  React.useEffect(() => {
    if (demo) {
      begin()
      return stopPoll
    }
    const saved = loadPending()
    if (saved && normHandle(saved.handle) === normHandle(handle)) {
      proofRef.current = saved.proof
      hashRef.current = saved.proofHash
      expiryRef.current = Date.parse(saved.expiresAt) || 0
      setToken(saved.token)
      setPhase('waiting')
      return stopPoll
    }
    begin()
    return stopPoll
  }, [begin, handle, demo])

  React.useEffect(() => {
    if (phase !== 'waiting') return
    if (demo) {
      const id = setTimeout(() => {
        setPhase('verified')
        const proof = proofRef.current
        doneRef.current = setTimeout(() => onVerified(proof), VERIFIED_HOLD_MS)
      }, 1800)
      return () => clearTimeout(id)
    }
    const tick = async () => {
      if (Date.now() > expiryRef.current) {
        stopPoll()
        clearPending()
        setPhase('expired')
        return
      }
      const status = await pollVerification(token, hashRef.current)
      if (status === 'verified') {
        stopPoll()
        clearPending()
        setPhase('verified')
        const proof = proofRef.current
        doneRef.current = setTimeout(() => onVerified(proof), VERIFIED_HOLD_MS)
      } else if (status === 'expired') {
        stopPoll()
        clearPending()
        setPhase('expired')
      }
    }
    pollRef.current = setInterval(tick, 2500)
    return stopPoll
  }, [phase, token, onVerified, demo])

  const copyAndOpen = () => {
    copyText(dmCode(token)).then(setCopied)
    // The sandbox must never leave the page — nothing external launches.
    if (demo) return
    openExternal(igDeepLink(), igWebLink())
  }
  const inApp = isInAppBrowser()
  const mobile = isMobile()

  const dismiss = () => {
    clearPending()
    onClose()
  }
  const dialogRef = useDialog(dismiss)

  const errMsg =
    errCode === 'rate_limited' ? t('verify.errRate') : errCode === 'busy' ? t('verify.errBusy') : t('verify.errGeneric')

  return (
    <div
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('verify.title')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: rgba(C.star, 0.12), flexShrink: 0 }}>
            <Icon name="instagram" size={20} color={C.star} stroke={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: C.cream, lineHeight: 1.1 }}>{t('verify.title')}</div>
            <div style={{ marginTop: 6 }}>
              <HandleChip C={C} handle={handle} />
            </div>
          </div>
          <button onClick={dismiss} aria-label={t('verify.cancel')} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={14} color="currentColor" />
          </button>
        </div>

        {phase === 'verified' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, padding: '26px 0 22px' }}>
            <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 66, height: 66 }}>
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}` }} />
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}`, animationDelay: '0.3s' }} />
              <span className="v-pop" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 60, height: 60, borderRadius: '50%', background: rgba(C.star, 0.16), border: `1px solid ${rgba(C.star, 0.5)}`, boxShadow: `0 0 30px ${rgba(C.star, 0.45)}` }}>
                <Icon name="check" size={30} color={C.star} stroke={2.4} />
              </span>
            </span>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 23, color: C.cream }}>{t('verify.verified')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '0.5px', color: rgba(C.star, 0.9) }}>
              <Sonar C={C} size={11} /> {t('verify.verifiedSub')}
            </div>
          </div>
        ) : phase === 'expired' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 21, color: C.cream }}>{t('verify.expiredTitle')}</div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>{t('verify.expiredBody')}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : phase === 'error' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: rgba(C.star, 0.95) }}>{errMsg}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{t('verify.sub')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <Kicker C={C}>{t('verify.code')}</Kicker>
              {phase === 'starting' || !token ? (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 38, letterSpacing: '10px', color: C.muted, paddingLeft: 10 }}>····</span>
              ) : (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 31, fontWeight: 700, letterSpacing: '4px', color: C.star, paddingLeft: 4, textShadow: `0 0 26px ${rgba(C.star, 0.4)}` }}>{dmCode(token)}</span>
              )}
            </div>

            <PrimaryButton C={C} disabled={phase === 'starting' || !token} onClick={copyAndOpen}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} color={C.onStar} stroke={2} />
                {copied ? t('verify.copied') : t('verify.copyOpen')}
              </span>
            </PrimaryButton>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[t('verify.step1'), t('verify.step2', { ig: '@' + ig }), t('verify.step3')].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', flexShrink: 0, background: rgba(C.star, 0.12), color: C.star, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: C.muted, fontSize: 12.5, fontFamily: "'Space Mono', monospace" }}>
              <Sonar C={C} size={12} /> {t('verify.waiting')}
            </div>

            {demo && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.demoNote')}</p>
            )}
            {!demo && inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.inApp')}</p>
            )}
            {!demo && !mobile && !inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.muted }}>{t('verify.desktop')}</p>
            )}

            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: C.muted }}>{t('verify.tosNote')}</p>
          </>
        )}
      </div>
    </div>
  )
}

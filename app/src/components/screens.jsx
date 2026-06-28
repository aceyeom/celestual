// screens.jsx — CELESTUAL (galaxy edition) screens. Responsive by construction:
// every shell fills the viewport and centers a capped column, so the same flow
// reads full-bleed on a phone and as an intimate centered column on the web. The
// backgrounds (the persistent galaxy + the calm overlay) are owned by App so
// they never remount between screens — these shells only lay out the foreground.
//
// All user-facing copy comes through useI18n().t(); all color comes through C
// (the single theme). Nothing here defines its own hex or hard-codes English.
import * as React from 'react'
import { normHandle } from '../api/celestual.js'
import { startVerification, pollVerification, igDeepLink, igUsername, dmCode, savePending, loadPending, clearPending } from '../api/igverify.js'
import { useI18n } from '../i18n/index.js'
import { nextSlotIn, slotsRemaining, slotsCap } from '../api/slots.js'
import {
  Brandmark, Glisten, PrimaryButton, GhostButton, OutlineButton, Field, HandleChip, HandleSearchField,
  StepDots, BackBtn, Icon, Sonar, rgba, RADIUS, SPACE, makeShadow,
} from './ui.jsx'

// Shared centered column: at least one dynamic-viewport tall (so the flex spacers
// fill phone and desktop alike), free to grow taller and scroll when content or
// an open keyboard demands it, and capped so it stays an intimate measure on wide
// monitors instead of stretching edge to edge.
function ShellInner({ children, onBackdropTap }) {
  return (
    <div
      onClick={onBackdropTap}
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

const GalaxyShell = ({ children, onBackdropTap }) => <ShellInner onBackdropTap={onBackdropTap}>{children}</ShellInner>
const WarmShell = ({ children }) => <ShellInner>{children}</ShellInner>

// ── shared field furniture (keeps YOU / THEM visually identical) ───────────────
// A quiet hint line that sits under a field.
function Hint({ C, icon, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: C.muted, fontSize: 12, lineHeight: 1.5, padding: '0 2px' }}>
      {icon && <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={13} color={color || C.muted} /></span>}
      <span>{children}</span>
    </div>
  )
}

// Smoothly reveals/hides its children by animating grid-rows 0fr→1fr (no fixed
// max-height guesswork, no layout pop). Used for the optional email "drop-down".
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

// A small mono section label, with an optional "optional" pill so required vs.
// optional reads at a glance (handle = no pill; email = pill).
function FieldLabel({ C, children, optional }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
      <span style={{ fontSize: 11, letterSpacing: '1.5px', fontFamily: "'Space Mono', monospace", color: C.muted, textTransform: 'uppercase' }}>{children}</span>
      {optional && (
        <span style={{ fontSize: 9.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.you, 0.92), background: rgba(C.you, 0.1), border: `1px solid ${rgba(C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

// A compact "stars left" meter: one pip per slot (filled = available), plus a
// "+1 in N days" line when the budget isn't full. Reads the server slot snapshot.
// Returns null on the demo's unlimited budget so it never shows a silly meter.
function SlotMeter({ C, slots, t, align = 'center' }) {
  const cap = slotsCap(slots)
  const left = slotsRemaining(slots)
  if (!Number.isFinite(cap) || cap > 12) return null
  const next = nextSlotIn(slots)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < left ? C.you : 'transparent',
              border: `1px solid ${i < left ? C.you : C.line}`,
              boxShadow: i < left ? `0 0 8px ${rgba(C.you, 0.6)}` : 'none',
            }}
          />
        ))}
        <span style={{ marginLeft: 4, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: left > 0 ? C.cream : C.them }}>
          {t('slots.left', { n: left })}
        </span>
      </div>
      {next && (
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Space Mono', monospace" }}>
          {t(`slots.next_${next.unit}`, { n: next.value })}
        </span>
      )}
    </div>
  )
}

// Multi-account editor — the user's own @s beyond their primary. A quiet,
// revealable feature: hidden behind "I have another account" so the common
// single-account case stays clean. Capped at 3 total (me + 2 alts). Used by both
// the YOU step and the account sheet.
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
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: rgba(C.you, 0.9), fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}
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
          <HandleChip C={C} handle={h} color={C.you} />
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
            <Field C={C} kind="handle" value={draft} onChange={setDraft} placeholder={t('accounts.placeholder')} accent={C.you} onEnter={add} />
          </div>
          <OutlineButton C={C} onClick={add} style={{ flexShrink: 0 }}>{t('accounts.addBtn')}</OutlineButton>
        </div>
      )}
      <Hint C={C} icon="instagram" color={rgba(C.you, 0.85)}>{t('accounts.note')}</Hint>
    </div>
  )
}

// The focal star for the close-up readout — THE single hero star of the zoomed
// view (the canvas point hands off to this, so they never double up). A close-up
// of one of the galaxy's own stars, NOT a UI lens-flare: no hard vector spikes,
// just a delicate white core breathing in light, wrapped in soft, scattered,
// blurred dust — amber folding into rose. Built from the cosmos' own tokens.
function StarMark({ C, size = 92 }) {
  return (
    <span className="starmark" style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      {/* broad nebula veil — a soft, off-center dust cloud so the glow reads
          scattered and organic, never a clean synthetic ring */}
      <span aria-hidden className="starmark-veil" style={{ position: 'absolute', inset: '-20%', borderRadius: '50%', background: `radial-gradient(circle at 42% 38%, ${rgba(C.you, 0.22)} 0%, ${rgba(C.them, 0.1)} 40%, transparent 66%)`, filter: 'blur(7px)' }} />
      {/* a second, offset dust cluster — gives the bloom a hand-scattered, stardust feel */}
      <span aria-hidden style={{ position: 'absolute', inset: '-6%', borderRadius: '50%', background: `radial-gradient(circle at 64% 66%, ${rgba(C.them, 0.16)} 0%, transparent 56%)`, filter: 'blur(9px)' }} />
      {/* inner warm bloom — a tighter, softly-blurred halo right around the core */}
      <span aria-hidden style={{ position: 'absolute', width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.you, 0.42)}, transparent 70%)`, filter: 'blur(2px)' }} />
      {/* the core — a delicate white point with layered bloom, breathing in light */}
      <span
        className="starmark-core"
        style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: `0 0 8px 2px #fff, 0 0 20px 6px ${rgba(C.you, 0.62)}, 0 0 46px 16px ${rgba(C.you, 0.22)}` }}
      />
    </span>
  )
}

// A hairline rule that fades at both ends and grows from its center on entrance.
function Rule({ C, delay = 0 }) {
  return (
    <span
      aria-hidden
      style={{
        height: 1, width: '76%', maxWidth: 230, margin: '0 auto',
        background: `linear-gradient(90deg, transparent, ${rgba(C.cream, 0.16)}, transparent)`,
        transformOrigin: 'center', animation: `ruleGrow .6s ease ${delay}s both`,
      }}
    />
  )
}

// ── 0.5 · INTRO (motion-graphic explainer for new users) ──────────────────────
// A short, staged story: you enter someone → an anonymous star drifts up → if
// they never enter you, nothing happens → if they do, the two stars collide and
// become one. The galaxy behind plays the matching mode; this layer narrates.
const INTRO_STEPS = ['intro.s1', 'intro.s2', 'intro.s3', 'intro.s4', 'intro.s5']
export function IntroScreen({ C, ctx }) {
  const { t } = useI18n()
  const [i, setI] = React.useState(0)
  const last = INTRO_STEPS.length - 1
  // Advance one beat — past the final beat the slideshow hands off into the flow.
  // Used by both the gentle auto-play timer and a tap anywhere on the field, so
  // tapping skips ahead through the slides (there is no separate "skip" control).
  // finishIntro() must be called OUTSIDE a setState updater (it sets App state);
  // calling it inside one triggers React's "update while rendering" warning.
  const advance = React.useCallback(() => {
    if (i >= last) ctx.finishIntro()
    else setI(i + 1)
  }, [i, last, ctx])
  React.useEffect(() => {
    const id = setTimeout(advance, i === 0 ? 3200 : 3800)
    return () => clearTimeout(id)
  }, [i, advance])
  // tell App which galaxy mode to play behind each beat (collision on the last two)
  React.useEffect(() => {
    ctx.onIntroStep?.(i)
  }, [i, ctx])
  return (
    <GalaxyShell onBackdropTap={advance}>
      <div style={{ minHeight: 34 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <p key={i} className="intro-line" style={{ margin: 0, maxWidth: 360, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(24px, 6.5vw, 32px)', lineHeight: 1.3, color: C.cream, textShadow: '0 4px 30px rgba(0,0,0,.6)' }}>
          {t(INTRO_STEPS[i])}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {INTRO_STEPS.map((_, k) => (
            <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: RADIUS.chip, background: k === i ? C.you : C.line, transition: 'all .3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.muted, letterSpacing: '.4px', fontFamily: "'Space Mono', monospace" }}>
          {i >= last ? t('intro.tapBegin') : t('intro.tapNext')}
        </span>
      </div>
    </GalaxyShell>
  )
}

// ── 1 · LANDING ──────────────────────────────────────────────
export function LandingScreen({ C, t: screenT, ctx }) {
  const { t } = useI18n()
  const head = [t('landing.head1'), t('landing.head2')]
  // "Find out" now opens the explainer slideshow, which hands into the flow.
  const start = () => ctx.findOut()
  return (
    <GalaxyShell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
        <Brandmark C={C} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <h1
          className="enter"
          style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(27px, 8vw, 44px)', lineHeight: 1.16, color: C.cream, textShadow: '0 4px 34px rgba(0,0,0,.7)', textWrap: 'balance' }}
        >
          {/* the tagline wraps gracefully now it's a longer, gentler line */}
          <div>{head[0]}</div>
          <div><em style={{ fontStyle: 'italic', color: C.you }}>{head[1]}</em></div>
        </h1>
      </div>

      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PrimaryButton C={C} onClick={start}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center', whiteSpace: 'nowrap' }}>
            {t('landing.cta')} <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12 }}>
            <Icon name="lock" size={13} color={C.muted} /> {t('landing.anon')}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.line }} />
          {/* sign back in — prove your @ and drop straight onto your saved sky */}
          <GhostButton C={C} onClick={() => ctx.startLogin()} style={{ padding: 0, fontSize: 12, color: C.you }}>
            {t('landing.login')} →
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: C.muted }}>
          {t('landing.age')}{' '}
          <button
            onClick={() => ctx.go('privacy')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.you, fontSize: 11, textDecoration: 'underline' }}
          >
            {t('landing.terms')}
          </button>
          .
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.enterDemo()} style={{ padding: '2px 6px', fontSize: 11, color: C.muted }}>
            {t('landing.demo')}
          </GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// ── 2 · YOU (your side — handle is who you are; email is optional) ─────────────
export function YouScreen({ C, ctx }) {
  const { t } = useI18n()
  const login = ctx.loginMode
  const emailVal = ctx.email.trim()
  // Email is optional now — valid if empty, or if it's a real-looking address.
  const emailOk = emailVal === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const handleOk = ctx.me.trim().length >= 2
  const valid = handleOk && emailOk
  // Signup advances through continueFromYou() (prove the @, then name someone);
  // login mode runs ctx.login() (prove the @, then restore the saved sky). Both
  // open the in-tab DM overlay when Instagram verification is on.
  const submit = () => valid && (login ? ctx.login() : ctx.continueFromYou())
  const needsVerify = ctx.verifyEnabled && handleOk && !ctx.verified
  // The email field is an OPTIONAL drop-down that only appears once a handle is
  // entered. It stays hidden until then; once a handle exists, a quiet "add email"
  // option drops down, and tapping it reveals the input. If they already gave an
  // email (returning to this step), open straight to the field.
  const [emailOpen, setEmailOpen] = React.useState(() => emailVal !== '')
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('landing')} />
        {login ? <Brandmark C={C} size={12} /> : <StepDots C={C} step={0} />}
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {login ? (
            <>{t('you.loginTitle1')}<br /><em style={{ color: C.you }}>{t('you.loginTitle2')}</em></>
          ) : (
            <>{t('you.title1')}<br /><em style={{ color: C.you }}>{t('you.title2')}</em></>
          )}
        </h2>

        {/* handle — the primary field (this is your star) */}
        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} accent={C.you} autoFocus emphasis onEnter={submit} />
          {/* One hint at a time so the field never stacks two lines of mono text:
              login mode says "prove it and your sky comes back"; otherwise once a
              handle is in and verification matters, the verify hint replaces the
              generic "we check Instagram" line. */}
          {login && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.you, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.you, 0.85)}>{t('you.loginNote')}</Hint>
            )
          ) : ctx.verifyEnabled && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.you, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.you, 0.85)}>{t('verify.youHint')}</Hint>
            )
          ) : (
            <Hint C={C} icon="instagram">{t('you.handleNote')}</Hint>
          )}
        </div>

        {/* email — an optional drop-down, revealed after a handle is set (signup
            only; signing back in needs nothing but the proven @) */}
        <Collapse open={handleOk && !login}>
          <div style={{ paddingTop: 4 }}>
            {!emailOpen ? (
              // A quiet "ghost field": same ink panel, hairline border, soft corner
              // and mail-icon layout as the real email Field it becomes on tap — so
              // it reads as one calm, optional affordance, not a busy bordered card.
              <button
                onClick={() => setEmailOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '15px 17px',
                  borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                  background: C.ink2, border: `1px solid ${C.line}`,
                  color: C.cream, fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Icon name="mail" size={18} color={rgba(C.you, 0.9)} stroke={1.7} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{t('you.emailAdd')}</span>
                <span style={{ fontSize: 9.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.you, 0.92), background: rgba(C.you, 0.1), border: `1px solid ${rgba(C.you, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{t('you.emailOptional')}</span>
                <Icon name="plus" size={16} color={rgba(C.you, 0.9)} stroke={2} />
              </button>
            ) : (
              <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <FieldLabel C={C} optional={t('you.emailOptional')}>{t('you.emailLabel')}</FieldLabel>
                <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder={t('you.email')} accent={C.you} autoFocus onEnter={submit} />
                <Hint C={C} icon="mail">{t('you.note')}</Hint>
              </div>
            )}
          </div>
        </Collapse>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={submit}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {needsVerify && <Icon name="instagram" size={16} color="#1a0f0a" stroke={2} />}
          {login ? t('you.loginCta') : needsVerify ? t('verify.continue') : t('you.continue')}
        </span>
      </PrimaryButton>
    </WarmShell>
  )
}

// ── 3 · THEM (with @ search typeahead; identity confirmed at seal) ─────────────
export function ThemScreen({ C, ctx }) {
  const { t } = useI18n()
  const valid = ctx.them.trim().length >= 2 && ctx.them.trim() !== ctx.me.trim()
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  // First star (or /demo) needs no sign-in; otherwise we confirm it's you at seal.
  const needsAuth = !ctx.verified && !ctx.demo
  const normd = normHandle(ctx.them)
  const onSeal = async () => {
    if (!valid || busy) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await ctx.seal() // gated on identity; opens the in-tab DM verify overlay if needed
    } finally {
      setBusy(false)
    }
  }
  React.useEffect(() => {
    setConfirming(false)
  }, [ctx.them])

  const sealLabel = busy
    ? needsAuth
      ? t('auth.signingIn')
      : '…'
    : confirming
      ? needsAuth
        ? t('them.sealAuth')
        : t('them.sealYes')
      : t('them.seal')
  const sealIcon = confirming && needsAuth ? 'instagram' : 'lock'

  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('you')} />
        <StepDots C={C} step={1} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {t('them.title1')}<br />
          <em style={{ color: C.them }}>{t('them.title2')}</em>
        </h2>
        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          {/* data-sendoff-field: App measures this exact box at seal time so the @ →
              star morph collapses from precisely where the field sits. */}
          <div data-sendoff-field>
            <HandleSearchField C={C} value={ctx.them} onChange={ctx.setThem} placeholder={t('them.handle')} accent={C.them} autoFocus onEnter={onSeal} />
          </div>
          {/* The note and the confirm prompt share this slot, crossfading in
              place — no bordered box popping over the layout. */}
          {confirming && valid ? (
            <div key="confirm" className="fade" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 7px', color: C.muted, fontSize: 13, lineHeight: 1.5, padding: '0 2px' }}>
              <Icon name="lock" size={13} color={rgba(C.them, 0.85)} />
              <span>{t('them.confirm1')}</span>
              <HandleChip C={C} handle={normd} color={C.them} />
              <span>{t('them.confirm2')}</span>
            </div>
          ) : (
            <Hint C={C} icon="eye">{t('them.note')}</Hint>
          )}
          {/* sign-in expectation, set before they commit (not on /demo or once verified) */}
          {needsAuth && !confirming && <Hint C={C} icon="instagram" color={rgba(C.you, 0.85)}>{t('them.authNote')}</Hint>}
          {ctx.error && <div style={{ color: C.them, fontSize: 13, padding: '0 2px' }}>{ctx.error}</div>}
          {!ctx.demo && (
            <div style={{ paddingTop: 2 }}>
              <SlotMeter C={C} slots={ctx.slots} t={t} align="left" />
            </div>
          )}
        </div>
      </div>

      <PrimaryButton C={C} disabled={!valid || busy} onClick={onSeal}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {!busy && <Icon name={sealIcon} size={16} color="#1a0f0a" stroke={2} />} {sealLabel}
        </span>
      </PrimaryButton>
    </WarmShell>
  )
}

// ── 4 · SENDOFF ───────────────────────────────────────────────
export function SendoffScreen({ C }) {
  const { t } = useI18n()
  const [show, setShow] = React.useState(false)
  React.useEffect(() => {
    const a = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(a)
  }, [])
  return (
    <GalaxyShell>
      <div style={{ flex: 1 }} />
      <div data-tag-keepout style={{ textAlign: 'center', minHeight: 92, transition: 'opacity .8s ease', opacity: show ? 1 : 0 }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: C.cream }}>{t('sendoff.sealed')}</div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>{t('sendoff.sub')}</div>
      </div>
      <div style={{ flex: 1 }} />
    </GalaxyShell>
  )
}

// ── 5 · RESTING (your sky — the home for every star you've sent) ───────────────
export function RestingScreen({ C, ctx }) {
  const { t } = useI18n()
  const zoomed = ctx.zoomed
  const hasStars = ctx.starCount > 0

  // LOADING — a resume can land here before the saved sky has decrypted/loaded.
  // Hold a calm placeholder (just the wordmark over the galaxy) so we never flash
  // the empty-state CTA for a frame and then pop to a populated sky.
  if (!hasStars && ctx.loadingSky) {
    return (
      <GalaxyShell>
        <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
          <Brandmark C={C} size={13} />
        </div>
        <div style={{ flex: 1 }} />
      </GalaxyShell>
    )
  }

  // EMPTY — nothing in the sky right now (first visit, or every star released).
  // A single, calm invitation; no stale handle, no orphan controls.
  if (!hasStars) {
    return (
      <GalaxyShell>
        <div className="enter" style={{ display: 'flex', justifyContent: 'center' }}>
          <Brandmark C={C} size={13} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
          <div className="floaty" style={{ marginBottom: 2 }}>
            <StarMark C={C} />
          </div>
          <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.14, color: C.cream }}>
            {t('resting.emptyTitle')}
          </h2>
          <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>
            {t('resting.emptyBody')}
          </p>
        </div>
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PrimaryButton C={C} onClick={() => ctx.checkAnother()}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              <Icon name="plus" size={16} color="#1a0f0a" stroke={2.1} /> {t('resting.emptyCta')}
            </span>
          </PrimaryButton>
          {!ctx.demo && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SlotMeter C={C} slots={ctx.slots} t={t} />
            </div>
          )}
        </div>
      </GalaxyShell>
    )
  }

  // HAS STARS — the living sky. Tap anywhere: if it lands on a star, the camera
  // drifts in. While zoomed, this whole layer fades out (and stops catching taps)
  // so it never sits over the close-up readout.
  const onBackdropTap = (e) => {
    if (e.target.closest('button, a, input')) return // don't hijack controls
    ctx.onStarTap(e.clientX, e.clientY)
  }
  const veil = {
    opacity: zoomed ? 0 : 1,
    transform: zoomed ? 'translateY(8px)' : 'none',
    pointerEvents: zoomed ? 'none' : 'auto',
    transition: 'opacity .5s ease, transform .5s ease',
  }
  return (
    <GalaxyShell onBackdropTap={zoomed ? undefined : onBackdropTap}>
      <div data-tag-keepout className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...veil }}>
        <Brandmark C={C} size={13} />
        <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.4px' }}>
          {t('resting.count', { n: ctx.starCount })}
        </span>
        {ctx.matchCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: C.you, fontFamily: "'Space Mono', monospace", letterSpacing: '.3px' }}>
            <Sonar C={C} color={C.you} size={11} /> {t('resting.mutual', { n: ctx.matchCount })}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 150 }} />

      <div data-tag-keepout style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 13, ...veil }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 7vw, 38px)', lineHeight: 1.14, color: C.cream }}>
          {t('resting.title')}
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 330 }}>
          {t('resting.body')}
        </p>
        <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.3px' }}>
          ✦ {t('resting.tapHint')}
        </span>
      </div>

      <div data-tag-keepout className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 28, ...veil }}>
        <OutlineButton C={C} onClick={() => ctx.checkAnother()}>
          <Icon name="plus" size={15} color={C.cream} stroke={2} /> {t('resting.another')}
        </OutlineButton>
        {!ctx.demo && <SlotMeter C={C} slots={ctx.slots} t={t} />}
      </div>
    </GalaxyShell>
  )
}

// The focused-star readout — rendered by App on top of the zoomed galaxy. NOT a
// bottom-sheet: a frameless close-up that belongs in the sky. A soft radial scrim
// lifts the text off the bright galaxy center; the tapped star holds at the top
// (the canvas zooms its real star in behind this), and below it the @handle and a
// "still waiting · sealed <date>" line read like a star-chart entry. It fades and
// settles into place (no slide-up, no grabber) and dismisses on a backdrop tap or
// "keep watching". Only ever shown while the camera is zoomed in.
export function StarDetail({ C, info, lang, onRemove, onOpen, onClose }) {
  const { t } = useI18n()
  const [removing, setRemoving] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  if (!info) return null
  const mutual = !!info.mutual
  const when = info.time ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(info.time)) : null
  // Both dismiss paths fade the readout out first (~200ms), then hand control back
  // to App — so the card eases away while the camera drifts back out, instead of
  // popping. Release additionally winks the star out on the canvas.
  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 200)
  }
  const remove = () => {
    if (closing || removing) return
    setRemoving(true)
    setClosing(true)
    setTimeout(onRemove, 200)
  }
  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 7vw, 48px)' }}
    >
      {/* radial scrim — readable text over the luminous core, no card needed */}
      <div
        className={closing ? 'scrim-out' : 'scrim-in'}
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: `radial-gradient(115% 80% at 50% 46%, transparent 0%, ${rgba(C.ink, 0.5)} 52%, ${rgba(C.ink, 0.86)} 100%)` }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={closing ? 'readout-out' : 'readout-in'}
        style={{ position: 'relative', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
      >
        <StarMark C={C} />

        <div style={{ marginTop: 22, fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: mutual ? C.you : C.muted }}>
          {mutual ? t('star.mutualKicker') : t('star.kicker')}
        </div>
        {/* The @ is the hero, so it's set in the same dramatic serif as the
            headlines (no pill, no border) — it simply breathes. The @ sign keeps
            the rose accent so the identity still reads as "them". */}
        <div style={{ marginTop: 10, marginBottom: 18, maxWidth: '100%' }}>
          {info.handle ? (
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 9vw, 38px)', lineHeight: 1.08, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: C.them }}>@</span>{info.handle}
            </div>
          ) : (
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: C.cream }}>✦</span>
          )}
        </div>

        <Rule C={C} delay={0.12} />

        {/* status — kept quiet and low-contrast: only the tiny sonar carries
            colour, the words themselves read in muted ink so the row sits as
            calm star-chart metadata, not a status badge. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '6px 11px', padding: '15px 0', fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.3px', color: C.muted }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Sonar C={C} color={mutual ? C.them : C.you} size={12} /> {mutual ? t('star.mutual') : t('star.waiting')}
          </span>
          {when && (
            <>
              <span aria-hidden style={{ width: 3, height: 3, borderRadius: '50%', background: rgba(C.cream, 0.22) }} />
              <span>{t('star.registered')} · {when}</span>
            </>
          )}
        </div>

        <Rule C={C} delay={0.16} />

        {/* actions, as a calm vertical stack. The one bright affordance is the
            mutual "open" CTA; everything else is a quiet text link. "keep
            watching" is the gentle way out, and the destructive "release" sits
            faintest of all at the very bottom — icon-less, low-contrast, so a
            deletion never screams in an otherwise ambient, poetic moment. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mutual ? 14 : 8, marginTop: 22, width: '100%' }}>
          {mutual && (
            <PrimaryButton C={C} onClick={onOpen}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                {t('star.open')} <Icon name="arrow" size={16} color="#1a0f0a" stroke={2.1} />
              </span>
            </PrimaryButton>
          )}
          <GhostButton C={C} onClick={close} style={{ fontSize: 13.5 }}>
            {t('star.keep')}
          </GhostButton>
          <GhostButton
            C={C}
            onClick={remove}
            style={{ padding: '4px 8px', fontSize: 12, letterSpacing: '.3px', color: rgba(C.muted, removing ? 0.5 : 0.78) }}
          >
            {removing ? t('star.removing') : t('star.remove')}
          </GhostButton>
        </div>
      </div>
    </div>
  )
}

// ── ACCOUNT (the personal area — opened from the profile chip) ─────────────────
// A quiet, frameless-feeling panel that reads like a page in a star journal:
// editorial type, hairline rules and negative space instead of boxed settings
// rows. Your @ is the hero; below it you can edit your email, link other accounts,
// glance at your sky, sign out, or delete everything. Data flows through App →
// api/profile.js (encrypted DB when signed in; local otherwise).
export function AccountSheet({ C, ctx }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const [confirmDel, setConfirmDel] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  // `synced` = really backed by the encrypted DB; `verified` = identity confirmed
  // (may be the dev stub). Messaging keys off synced so it's never misleading; the
  // sign-out control keys off verified so a stub session can still be cleared.
  const synced = !!ctx.synced
  const signedIn = !!ctx.verified
  const close = () => ctx.closeAccount()
  const onDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true)
      return
    }
    setDeleting(true)
    try {
      await ctx.deleteAccount()
    } finally {
      setDeleting(false)
    }
  }
  const skyLine = ctx.starCount === 0 ? t('account.skyEmpty') : ctx.starCount === 1 ? t('account.skyOne') : t('account.skyCount', { n: ctx.starCount })
  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.72), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 410, margin: 'auto 0', background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '30px 26px 26px', display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* header — the @ is the hero, set in the headline serif */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Glisten C={C} size={14} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.muted }}>{t('account.kicker')}</span>
            </div>
            <div style={{ marginTop: 12, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 9vw, 37px)', lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: C.you }}>@</span>{ctx.me || 'you'}
            </div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: synced ? rgba(C.you, 0.95) : C.muted }}>
              {synced && <Icon name="instagram" size={12} color={rgba(C.you, 0.95)} />}
              {synced ? t('account.signedInIg') : t('account.localOnly')}
            </div>
          </div>
          <button onClick={close} aria-label={t('account.close')} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={15} color="currentColor" />
          </button>
        </div>

        <Rule C={C} />

        {/* identity — @ + optional email, quietly editable; other accounts tuck
            behind one understated link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C}>{t('account.handleLabel')}</FieldLabel>
            <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder="your.handle" accent={C.you} />
            {ctx.verifyEnabled && !ctx.verified && (
              <Hint C={C} icon="instagram" color={rgba(C.you, 0.85)}>{t('account.reverifyNote')}</Hint>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C} optional={t('account.emailOptional')}>{t('account.emailLabel')}</FieldLabel>
            <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder="you@email.com" accent={C.you} />
            <Hint C={C} icon="mail">{t('account.emailNote')}</Hint>
          </div>
          <AccountsEditor C={C} ctx={ctx} />
        </div>

        <Rule C={C} />

        {/* sky — a single calm line + the entry budget + one way in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: ctx.starCount ? C.cream : C.muted, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
              {ctx.starCount > 0 && <Sonar C={C} color={C.you} size={12} />} {skyLine}
            </span>
            {ctx.starCount > 0 && (
              <GhostButton C={C} onClick={() => { close(); ctx.go('resting') }} style={{ padding: 0, fontSize: 12.5, color: C.you }}>
                {t('account.skyOpen')} →
              </GhostButton>
            )}
          </div>
          {ctx.matchCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.you, fontFamily: "'Space Mono', monospace" }}>
              <Sonar C={C} color={C.you} size={11} /> {t('account.skyMutual', { n: ctx.matchCount })}
            </span>
          )}
          {ctx.demo ? (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: rgba(C.you, 0.9) }}>{t('account.starsUnlimited')}</span>
          ) : (
            <SlotMeter C={C} slots={ctx.slots} t={t} align="left" />
          )}
          <OutlineButton C={C} onClick={() => { close(); ctx.checkAnother() }} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <Icon name="plus" size={15} color={C.cream} stroke={2} /> {t('account.starsAdd')}
          </OutlineButton>
          <Hint C={C} icon="lock" color={rgba(C.you, 0.8)}>{synced ? t('account.encryptedDb') : t('account.encryptedLocal')}</Hint>
        </div>

        <Rule C={C} />

        {/* sign out · delete — quiet text links, no boxed "danger zone" */}
        {!confirmDel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {signedIn && (
              <GhostButton C={C} onClick={ctx.signOut} style={{ padding: 0, fontSize: 13, color: C.cream }}>
                {t('account.signOut')}
              </GhostButton>
            )}
            <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: rgba(C.them, 0.85) }}>
              {t('account.delete')}
            </GhostButton>
          </div>
        ) : (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: C.cream }}>{t('account.deleteConfirm')}</span>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: C.them }}>
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

// ── 6 · MATCH ─────────────────────────────────────────────────
export function MatchScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <GalaxyShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 'min(420px, 56vh)' }}>
        <div className="enter" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '4px', textTransform: 'uppercase', color: C.you, marginBottom: 12 }}>{t('match.kicker')}</div>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 8vw, 42px)', lineHeight: 1.1, color: C.cream }}>
            {t('match.title1')}<br />
            <em style={{ color: C.them }}>{t('match.title2')}</em>
          </h1>
        </div>
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <HandleChip C={C} handle={ctx.me || 'you'} color={C.you} big />
          <span style={{ color: C.muted, fontSize: 15 }}>✦</span>
          <HandleChip C={C} handle={ctx.them || 'them'} color={C.them} big />
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryButton C={C} onClick={() => ctx.openConversation()}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('match.open')} <Icon name="arrow" size={17} color="#1a0f0a" stroke={2.1} />
          </span>
        </PrimaryButton>
        <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: C.muted }}>{t('match.note')}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('resting')}>{t('match.notyet')}</GhostButton>
        </div>
      </div>
    </GalaxyShell>
  )
}

// ── 7 · OUT OF SLOTS (every star is free; the weekly entry budget is spent) ────
// Replaces the old paywall. There's nothing to buy — the gentle limit is the slot
// budget itself. Shows when the next star unlocks and offers an optional email
// nudge when it does. (The reminder send is the celestual-remind function.)
export function OutOfSlotsScreen({ C, ctx }) {
  const { t } = useI18n()
  const next = nextSlotIn(ctx.slots)
  const nextLine = next ? t(`slots.next_${next.unit}`, { n: next.value }) : t('outofslots.soon')
  const [draft, setDraft] = React.useState(ctx.email || '')
  const [done, setDone] = React.useState(false)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.trim())
  const remind = async () => {
    if (!emailOk || done) return
    ctx.setEmail(draft.trim())
    try {
      await ctx.requestReminder(draft.trim())
    } catch {
      /* best-effort — the countdown is still accurate */
    }
    setDone(true)
  }
  const leave = () => ctx.go(ctx.starCount ? 'resting' : 'landing')
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={leave} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div className="floaty" style={{ alignSelf: 'center' }}><StarMark C={C} size={76} /></div>
        <h2 className="enter" style={{ margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(27px, 7vw, 35px)', lineHeight: 1.16, color: C.cream }}>
          {t('outofslots.title')}
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: C.muted }}>
          {t('outofslots.body')}
        </p>

        <div className="enter" style={{ animationDelay: '.1s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '16px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.muted }}>{t('outofslots.nextLabel')}</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, color: C.you }}>{nextLine}</span>
        </div>

        {/* optional email nudge for when the next star is ready */}
        {done ? (
          <p className="fade" style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: C.you }}>
            {t('outofslots.reminded')}
          </p>
        ) : (
          <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FieldLabel C={C} optional={t('you.emailOptional')}>{t('outofslots.remindLabel')}</FieldLabel>
            <Field C={C} kind="email" value={draft} onChange={setDraft} placeholder="you@email.com" accent={C.you} onEnter={remind} />
            <PrimaryButton C={C} disabled={!emailOk} onClick={remind}>{t('outofslots.remindCta')}</PrimaryButton>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GhostButton C={C} onClick={leave}>{t('outofslots.back')}</GhostButton>
      </div>
    </WarmShell>
  )
}

// ── 8 · PRIVACY & TERMS ───────────────────────────────────────
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
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.sealedAt ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 }}>
        <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.16, color: C.cream }}>
          {t('privacy.title')}
        </h2>

        <H>{t('privacy.h1')}</H>
        <P>{t('privacy.p1')}</P>
        <H>{t('privacy.h2')}</H>
        <P>{t('privacy.p2')}</P>
        <H>{t('privacy.h3')}</H>
        <P>{t('privacy.p3')}</P>
        <H>{t('privacy.h4')}</H>
        <P>
          {t('privacy.p4a')}{' '}
          <a href="mailto:privacy@celestual.us" style={{ color: C.you }}>privacy@celestual.us</a>.
        </P>

        <H>{t('privacy.h5')}</H>
        <P>{t('privacy.p5')}</P>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field C={C} kind="handle" value={handle} onChange={setHandle} placeholder={t('privacy.removePlaceholder')} accent={C.them} />
          <PrimaryButton C={C} disabled={!ok || status === 'working'} onClick={submit}>
            {status === 'working' ? t('privacy.removing') : t('privacy.removeCta')}
          </PrimaryButton>
          {status === 'done' && (
            <P>
              {t('privacy.removed1')} <HandleChip C={C} handle={normHandle(handle)} color={C.them} /> {t('privacy.removed2')}
            </P>
          )}
          {status === 'error' && <div style={{ fontSize: 13, color: C.them }}>{t('privacy.removeErr')}</div>}
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
    </WarmShell>
  )
}

// ── INSTAGRAM DM VERIFICATION (prove the @ is yours — no OAuth) ────────────────
// Copy a code to the native clipboard and DM it to our Instagram; Meta's webhook
// tells the backend who really sent it, and this overlay watches for the flip.
// It never navigates, so the in-progress entry survives underneath it.

// True inside an in-app webview (Instagram / Facebook), where window.open to a new
// tab is unreliable — used to fall back to a same-tab deep link and to warn gently.
function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent || '')
}

// Open an external URL in a new tab, keeping THIS tab alive so the verify overlay
// keeps polling underneath. Same-tab navigation is a fallback only inside in-app
// webviews, where a real new tab can't open.
function openExternal(url) {
  // In-app webviews (Instagram/Facebook/Line) can't open a real new tab, so navigate
  // this one — the saved pending record (savePending) lets the overlay resume polling
  // when the user comes back to celestual.
  if (isInAppBrowser()) {
    try {
      window.location.href = url
    } catch {
      /* ignore */
    }
    return
  }
  // Normal browser: open Instagram in a new tab and leave this tab where it is.
  //
  // IMPORTANT: we pass 'noopener', which makes window.open() return null *even on
  // success* (it deliberately hands back no window reference). So we must NOT treat a
  // null return as "blocked" and fall back to window.location — doing that redirected
  // this tab to Instagram on every click, stranding the verification overlay. A truly
  // blocked popup is recoverable (the code is already copied; the user can retry);
  // nuking this tab is not. We only fall back if the call actually throws.
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
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

export function IgVerifySheet({ C, handle, onVerified, onClose }) {
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
  // If the user closes the sheet during the post-success beat, don't resume behind
  // them — cancel the pending hand-off on unmount.
  React.useEffect(() => () => { if (doneRef.current) clearTimeout(doneRef.current) }, [])

  // (Re)issue a code and start watching. Also the "get a new code" action.
  const begin = React.useCallback(async () => {
    stopPoll()
    setPhase('starting')
    setErrCode('')
    setCopied(false)
    setToken('')
    try {
      const r = await startVerification(handle)
      proofRef.current = r.proof
      hashRef.current = r.proofHash
      expiryRef.current = Date.parse(r.expiresAt) || Date.now() + 10 * 60 * 1000
      // Stash the live proof + code so the trip to Instagram (which can reload or
      // replace this tab on mobile) doesn't strand the verification: on return we
      // resume THIS code instead of minting a fresh one the sent DM can't match.
      savePending({ handle, token: r.token, proofHash: r.proofHash, proof: r.proof, expiresAt: r.expiresAt })
      setToken(r.token)
      setPhase('waiting')
    } catch (e) {
      setErrCode(e?.code || 'error')
      setPhase('error')
    }
  }, [handle])

  // On open: resume a still-live verification for this handle if one was saved (the
  // user is back from Instagram, possibly after the tab reloaded), so we keep
  // watching the exact code they already DM'd. Otherwise start a fresh one.
  React.useEffect(() => {
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
  }, [begin, handle])

  // Poll for the DM while waiting; stop on success, expiry, or unmount.
  React.useEffect(() => {
    if (phase !== 'waiting') return
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
        clearPending() // consumed — don't let a later reload re-open this overlay
        setPhase('verified')
        const proof = proofRef.current
        doneRef.current = setTimeout(() => onVerified(proof), 950) // let the ✓ land before resuming
      } else if (status === 'expired') {
        stopPoll()
        clearPending()
        setPhase('expired')
      }
    }
    pollRef.current = setInterval(tick, 2500)
    return stopPoll
  }, [phase, token, onVerified])

  // Copy the code AND open the DM thread inside the same gesture, so mobile is
  // allowed to launch the Instagram app and write the clipboard.
  const copyAndOpen = () => {
    copyText(dmCode(token)).then(setCopied)
    // openExternal opens Instagram in a NEW tab and keeps this one open so the overlay
    // keeps polling. Inside an in-app webview (where new tabs don't work) it navigates
    // same-tab instead; the saved record (savePending, above) lets us resume polling
    // when they return to celestual.
    openExternal(igDeepLink())
  }
  const inApp = isInAppBrowser()

  // Cancelling for real (the X or the backdrop) abandons this attempt, so drop the
  // saved record — a later reload shouldn't reopen a verification the user dismissed.
  // (A reload from the Instagram hand-off never runs this; it just remounts and resumes.)
  const dismiss = () => {
    clearPending()
    onClose()
  }

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
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: rgba(C.you, 0.12), flexShrink: 0 }}>
            <Icon name="instagram" size={20} color={C.you} stroke={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: C.cream, lineHeight: 1.1 }}>{t('verify.title')}</div>
            <div style={{ marginTop: 6 }}>
              <HandleChip C={C} handle={handle} color={C.you} />
            </div>
          </div>
          <button onClick={dismiss} aria-label={t('verify.cancel')} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={14} color="currentColor" />
          </button>
        </div>

        {phase === 'verified' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 0' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: '50%', background: rgba(C.you, 0.14), border: `1px solid ${rgba(C.you, 0.4)}` }}>
              <Icon name="check" size={26} color={C.you} stroke={2.2} />
            </span>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: C.cream }}>{t('verify.verified')}</div>
          </div>
        ) : phase === 'expired' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 21, color: C.cream }}>{t('verify.expiredTitle')}</div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>{t('verify.expiredBody')}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : phase === 'error' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.them }}>{errMsg}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{t('verify.sub')}</p>

            {/* the code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.muted }}>{t('verify.code')}</span>
              {phase === 'starting' || !token ? (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 38, letterSpacing: '10px', color: C.muted, paddingLeft: 10 }}>····</span>
              ) : (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 31, fontWeight: 700, letterSpacing: '4px', color: C.you, paddingLeft: 4, textShadow: `0 0 26px ${rgba(C.you, 0.4)}` }}>{dmCode(token)}</span>
              )}
            </div>

            <PrimaryButton C={C} disabled={phase === 'starting' || !token} onClick={copyAndOpen}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} color="#1a0f0a" stroke={2} />
                {copied ? t('verify.copied') : t('verify.copyOpen')}
              </span>
            </PrimaryButton>

            {/* the three steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[t('verify.step1'), t('verify.step2', { ig: '@' + ig }), t('verify.step3')].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', flexShrink: 0, background: rgba(C.you, 0.12), color: C.you, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            {/* live status — auto-confirms the moment the DM lands */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: C.muted, fontSize: 12.5, fontFamily: "'Space Mono', monospace" }}>
              <Sonar C={C} color={C.you} size={12} /> {t('verify.waiting')}
            </div>

            {/* Inside Instagram's own in-app browser, the hand-off can be flaky —
                tell people they can come straight back, and offer the cleaner path. */}
            {inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.you, 0.9) }}>{t('verify.inApp')}</p>
            )}

            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: C.muted }}>{t('verify.tosNote')}</p>
          </>
        )}
      </div>
    </div>
  )
}

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
import { useI18n } from '../i18n/index.js'
import { PRICE_LABEL } from '../api/pay.js'
import {
  Brandmark, PrimaryButton, GhostButton, OutlineButton, Field, HandleChip, HandleSearchField,
  StepDots, BackBtn, Icon, Sonar, rgba,
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
        <span style={{ fontSize: 9.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.you, 0.92), background: rgba(C.you, 0.1), border: `1px solid ${rgba(C.you, 0.28)}`, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

// The focal star for the close-up readout — THE single hero star of the zoomed
// view (the canvas point hands off to this, so they never double up). A real
// star, not a notification ping: a soft amber→rose aura, slim crossed diffraction
// spikes, and a white core that only breathes in brightness (never scale-jumps,
// which read as cheap). Built from the cosmos' own tokens — no new colors.
function StarMark({ C, size = 92 }) {
  const spike = (vertical) => ({
    position: 'absolute',
    [vertical ? 'height' : 'width']: '100%',
    [vertical ? 'width' : 'height']: '1.5px',
    background: `linear-gradient(${vertical ? 180 : 90}deg, transparent 8%, ${rgba(C.you, 0.55)} 40%, #fff 50%, ${rgba(C.you, 0.55)} 60%, transparent 92%)`,
  })
  return (
    <span className="starmark" style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      {/* outer aura — static, soft, amber folding into rose */}
      <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.you, 0.32)} 0%, ${rgba(C.them, 0.12)} 40%, transparent 68%)` }} />
      {/* inner halo — a tighter warm bloom right around the core */}
      <span aria-hidden style={{ position: 'absolute', width: size * 0.42, height: size * 0.42, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.you, 0.5)}, transparent 70%)` }} />
      {/* diffraction spikes — slim crossed light, breathing very slowly */}
      <span aria-hidden className="starmark-spikes" style={{ position: 'absolute', width: '100%', height: '100%', placeItems: 'center', display: 'grid' }}>
        <span style={{ ...spike(false), gridArea: '1 / 1' }} />
        <span style={{ ...spike(true), gridArea: '1 / 1' }} />
      </span>
      {/* the core — a crisp white point with layered bloom, breathing in light */}
      <span
        className="starmark-core"
        style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', boxShadow: `0 0 9px 2px #fff, 0 0 22px 6px ${rgba(C.you, 0.72)}, 0 0 52px 18px ${rgba(C.you, 0.26)}` }}
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
  const advance = React.useCallback(() => {
    setI((n) => {
      if (n >= last) {
        ctx.finishIntro()
        return n
      }
      return n + 1
    })
  }, [ctx, last])
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
            <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 99, background: k === i ? C.you : C.line, transition: 'all .3s' }} />
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
          style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 'clamp(27px, 8vw, 44px)', lineHeight: 1.16, color: C.cream, textShadow: '0 4px 34px rgba(0,0,0,.7)' }}
        >
          <div style={{ whiteSpace: 'nowrap' }}>{head[0]}</div>
          <div style={{ whiteSpace: 'nowrap' }}><em style={{ fontStyle: 'italic', color: C.you }}>{head[1]}</em></div>
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
          {/* replaces the old "why it's free →" — a replayable intro instead */}
          <GhostButton C={C} onClick={() => ctx.watchIntro()} style={{ padding: 0, fontSize: 12 }}>
            {t('landing.watch')} →
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
  const emailVal = ctx.email.trim()
  // Email is optional now — valid if empty, or if it's a real-looking address.
  const emailOk = emailVal === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const handleOk = ctx.me.trim().length >= 2
  const valid = handleOk && emailOk
  const submit = () => valid && ctx.go('them')
  // The email field is an OPTIONAL drop-down that only appears once a handle is
  // entered. It stays hidden until then; once a handle exists, a quiet "add email"
  // option drops down, and tapping it reveals the input. If they already gave an
  // email (returning to this step), open straight to the field.
  const [emailOpen, setEmailOpen] = React.useState(() => emailVal !== '')
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('landing')} />
        <StepDots C={C} step={0} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {t('you.title1')}<br />
          <em style={{ color: C.you }}>{t('you.title2')}</em>
        </h2>

        {/* handle — the primary field (this is your star) */}
        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} accent={C.you} autoFocus emphasis onEnter={submit} />
          <Hint C={C} icon="instagram">{t('you.handleNote')}</Hint>
        </div>

        {/* email — an optional drop-down, revealed only after a handle is set */}
        <Collapse open={handleOk}>
          <div style={{ paddingTop: 4 }}>
            {!emailOpen ? (
              <button
                onClick={() => setEmailOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px',
                  borderRadius: 13, cursor: 'pointer', textAlign: 'left',
                  background: rgba(C.you, 0.05), border: `1px dashed ${rgba(C.you, 0.34)}`,
                  color: C.cream, fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: rgba(C.you, 0.12), flexShrink: 0 }}>
                  <Icon name="mail" size={16} color={C.you} stroke={1.7} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{t('you.emailAdd')}</span>
                  <span style={{ display: 'block', fontSize: 12, color: C.muted, marginTop: 2 }}>{t('you.emailAddNote')}</span>
                </span>
                <span style={{ color: rgba(C.you, 0.9), flexShrink: 0 }}><Icon name="plus" size={16} color="currentColor" stroke={2} /></span>
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
        {t('you.continue')}
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
      await ctx.seal() // opens the Instagram popup synchronously inside this gesture
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(32px, 8vw, 37px)', lineHeight: 1.12, color: C.cream }}>
          {t('them.title1')}<br />
          <em style={{ color: C.them }}>{t('them.title2')}</em>
        </h2>
        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: 11 }}>
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
      <div style={{ textAlign: 'center', minHeight: 92, transition: 'opacity .8s ease', opacity: show ? 1 : 0 }}>
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
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PrimaryButton C={C} onClick={() => ctx.checkAnother()}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              <Icon name="plus" size={16} color="#1a0f0a" stroke={2.1} /> {t('resting.emptyCta')}
            </span>
          </PrimaryButton>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={() => ctx.forget()} style={{ padding: 0, fontSize: 11, color: C.muted }}>
              {t('resting.forget')}
            </GhostButton>
          </div>
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
      <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...veil }}>
        <Brandmark C={C} size={13} />
        <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.4px' }}>
          {t('resting.count', { n: ctx.starCount })}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 150 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 13, ...veil }}>
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

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 28, ...veil }}>
        <OutlineButton C={C} onClick={() => ctx.checkAnother()}>
          <Icon name="plus" size={15} color={C.cream} stroke={2} /> {t('resting.another')}
        </OutlineButton>
        <GhostButton C={C} onClick={() => ctx.forget()} style={{ padding: 0, fontSize: 11, color: C.muted }}>
          {t('resting.forget')}
        </GhostButton>
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
export function StarDetail({ C, info, lang, onRemove, onClose }) {
  const { t } = useI18n()
  const [removing, setRemoving] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  if (!info) return null
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

        <div style={{ marginTop: 20, fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted }}>
          {t('star.kicker')}
        </div>
        <div style={{ marginTop: 12, marginBottom: 18 }}>
          {info.handle ? (
            <HandleChip C={C} handle={info.handle} color={C.them} big />
          ) : (
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: C.cream }}>✦</span>
          )}
        </div>

        <Rule C={C} delay={0.12} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '6px 12px', padding: '16px 0', fontFamily: "'Space Mono', monospace", fontSize: 12.5, letterSpacing: '.3px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.you }}>
            <Sonar C={C} color={C.you} size={13} /> {t('star.waiting')}
          </span>
          {when && (
            <>
              <span aria-hidden style={{ width: 3, height: 3, borderRadius: '50%', background: rgba(C.cream, 0.25) }} />
              <span style={{ color: C.muted }}>
                {t('star.registered')} · {when}
              </span>
            </>
          )}
        </div>

        <Rule C={C} delay={0.16} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 20 }}>
          <GhostButton
            C={C}
            onClick={remove}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: removing ? C.muted : C.them, fontSize: 13.5 }}
          >
            <Icon name="trash" size={15} color="currentColor" /> {removing ? t('star.removing') : t('star.remove')}
          </GhostButton>
          <GhostButton C={C} onClick={close} style={{ padding: '8px', fontSize: 12, color: C.muted }}>
            {t('star.keep')}
          </GhostButton>
        </div>
      </div>
    </div>
  )
}

// ── 6 · MATCH ─────────────────────────────────────────────────
export function MatchScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <GalaxyShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 420 }}>
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

// ── 7 · PRICING (first free, pay to add more — never on /demo) ─────────────
export function PricingScreen({ C, ctx }) {
  const { t } = useI18n()
  const Line = ({ label, note, value, accent, last }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '20px 0', borderBottom: last ? 'none' : `1px solid ${C.line}` }}>
      <div>
        <div style={{ fontSize: 15, color: C.cream, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{note}</div>
      </div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: accent || C.cream, whiteSpace: 'nowrap', lineHeight: 1 }}>{value}</div>
    </div>
  )
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.sealedAt ? 'resting' : 'landing')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.16, color: C.cream }}>
          {t('pricing.title1')} <em style={{ color: C.you }}>{t('pricing.titleEm')}</em>.
        </h2>

        <div className="enter" style={{ animationDelay: '.08s' }}>
          <Line label={t('pricing.firstLabel')} note={t('pricing.firstNote')} value={t('pricing.firstValue')} accent={C.you} />
          <Line label={t('pricing.moreLabel')} note={t('pricing.moreNote')} value={ctx.demo ? t('pricing.firstValue') : PRICE_LABEL} accent={ctx.demo ? C.you : C.them} />
          <Line label={t('pricing.revealLabel')} note={t('pricing.revealNote')} value={t('pricing.revealValue')} accent={C.you} last />
        </div>

        <p className="enter" style={{ animationDelay: '.12s', margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.muted }}>
          {ctx.demo ? t('pricing.demoNote') : t('pricing.foot')}
        </p>
      </div>

      <div className="enter" style={{ animationDelay: '.16s' }}>
        <PrimaryButton C={C} onClick={() => (ctx.sealedAt ? ctx.checkAnother() : ctx.go('you'))}>
          {ctx.sealedAt ? t('pricing.payCta') : t('pricing.startCta')}
        </PrimaryButton>
      </div>
    </WarmShell>
  )
}

// ── 7.5 · CHECKOUT (paywall — Stripe + Kakao/Toss) ────────────────────────
export function CheckoutScreen({ C, ctx }) {
  const { t } = useI18n()
  const [busy, setBusy] = React.useState('')
  const pay = async (provider) => {
    if (busy) return
    setBusy(provider)
    try {
      await ctx.startCheckout(provider)
    } catch (e) {
      console.error(e)
      setBusy('')
    }
  }
  const Method = ({ provider, label, brand }) => (
    <button
      onClick={() => pay(provider)}
      disabled={!!busy}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '15px 18px',
        borderRadius: 13, cursor: busy ? 'default' : 'pointer', border: 'none',
        background: brand, color: '#1a0f0a', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
        opacity: busy && busy !== provider ? 0.5 : 1,
      }}
    >
      {busy === provider ? '…' : label}
    </button>
  )
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('resting')} />
        <Brandmark C={C} size={12} />
        <div style={{ width: 38 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7vw, 36px)', lineHeight: 1.16, color: C.cream }}>
          {t('pay.title')}
        </h2>
        <p className="enter" style={{ animationDelay: '.06s', margin: 0, fontSize: 14, lineHeight: 1.55, color: C.muted }}>
          {t('pay.sub')} <span style={{ color: C.you, fontWeight: 600 }}>{PRICE_LABEL}</span>.
        </p>
        <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Method provider="stripe" label={t('pay.stripe')} brand={`linear-gradient(180deg, ${C.you}, ${rgba(C.you, 0.86)})`} />
          <Method provider="kakao" label={t('pay.kakao')} brand="#FEE500" />
          <Method provider="toss" label={t('pay.toss')} brand="#9BC1FF" />
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('pay.secure')}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GhostButton C={C} onClick={() => ctx.go('resting')}>{t('pay.cancel')}</GhostButton>
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

        <H>{t('privacy.h6')}</H>
        <div style={{ marginTop: 6 }}>
          <GhostButton C={C} onClick={() => ctx.forget()} style={{ padding: 0, fontSize: 13, color: C.you }}>
            {t('privacy.forget')}
          </GhostButton>
        </div>

        <p style={{ margin: '22px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          {t('privacy.foot')} <a href="mailto:privacy@celestual.us" style={{ color: C.muted }}>privacy@celestual.us</a>.
        </p>
      </div>
    </WarmShell>
  )
}

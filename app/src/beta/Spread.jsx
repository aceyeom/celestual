// beta/Spread.jsx — the fused spread.
//
// The most important frame in the product, and the one the plan spends its
// strictest sentence on: "both cards unseal in the same instant" (§3). Not one
// then the other, not yours-first-so-you-can-brace: the same instant, because
// the entire ethical architecture is that neither of you moved second.
//
// The sky does the physics and it already knows how. `setMode('match')` on the
// ambient field runs a decaying Keplerian inspiral — two stars falling into a
// shared orbit, angular speed rising as they close because Kepler's third law
// says it must, tidal streams bridging them, a merger flash that sends a light
// echo out through the surrounding gas — and settles into a BINARY: two
// distinct stars, amber and rose, in an orbit that does not decay. Production
// built that. Nothing here re-animates it.
//
// What this file adds is the moment after. The two stars resolve, together,
// into the two cards — and they resolve the same way a card always resolves in
// this product, by growing out of a point of light and sharpening as it grows.
// The grammar of the reveal is the grammar of the approach; the only difference
// is that this time you did not have to fly anywhere, and there are two.
//
// What it deliberately does NOT add: a share button that carries their words.
// The share sheet renders YOUR card and the mutual mark, and can never include
// theirs (§4, content & safety). Their words were written to one person.
import * as React from 'react'
import {
  rgba, SPACE, FONT, SIZE, PrimaryButton, GhostButton, Small, Icon,
} from '../components/ui.jsx'
import { Body } from './Disc.jsx'

// galaxy.js's own constants: the inspiral, then the touch. The frame the binary
// first exists on is the frame the surfaces appear on.
const INSPIRAL = 4.4
const FLASH = 0.55
const UNSEAL = INSPIRAL + FLASH

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── when to unseal ───────────────────────────────────────────────────────────
// Off the ENGINE's clock, not the wall's, and the difference is not academic.
// The sky advances its own time per frame and clamps dt at 50 ms for stability,
// so a device drawing at ten frames a second plays the inspiral at a fraction
// of wall speed. A setTimeout for 4.95 s — which is what this was — opened both
// cards while the two stars were still falling toward each other, and the
// merger flash then went off over the top of an already-revealed spread,
// washing it to white. It looked exactly as wrong as it was.
//
// The engine knows what time it is in the match it is playing. Ask it.
function useUnseal(fieldRef) {
  const [open, setOpen] = React.useState(() => reduced())
  React.useEffect(() => {
    if (reduced()) return undefined
    let raf = 0
    // If there is no match running at all — the canvas-2D fallback, a lost
    // context — nothing will ever report a time, and a reveal that never
    // arrives is far worse than one that arrives on a guess.
    const deadline = performance.now() + (UNSEAL + 6) * 1000
    const tick = () => {
      const f = fieldRef && fieldRef.current
      const t = f && f.match ? f.match.t : null
      if ((t != null && t >= UNSEAL) || performance.now() > deadline) {
        setOpen(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fieldRef])
  return open
}

// ── one half of the spread ───────────────────────────────────────────────────
// A disc and the words under it. The pair is offset in opposite directions on a
// tipped axis so the two read as bound rather than stacked, and the offset is
// the only thing that differs between them.
function Half({ C, card, url, tint, label, size, side, open, delay }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.lg,
        transform: `translateX(${side * size * 0.18}px)`,
        // the unseal: out of a point of light, sharpening as it grows. Same
        // curve the sky's approach runs, because it is the same event.
        opacity: open ? 1 : 0,
        scale: open ? '1' : '0.04',
        filter: open ? 'blur(0px)' : 'blur(10px)',
        transition: reduced()
          ? 'opacity .3s ease'
          : `opacity .5s ease ${delay}ms, scale 1.15s cubic-bezier(.16,.8,.3,1) ${delay}ms, filter .9s ease ${delay}ms`,
      }}
    >
      <Body C={C} card={card} url={url} size={size} tint={tint} label={label} glow={1.4} />
      {card && card.words && (
        <p
          style={{
            margin: 0, textAlign: 'center', maxWidth: Math.min(340, size * 1.5),
            fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.lead, lineHeight: 1.45,
            color: C.cream, textShadow: '0 2px 20px rgba(0,0,0,.8)',
          }}
        >
          {card.words}
        </p>
      )}
    </div>
  )
}

// ── the tidal bridge ─────────────────────────────────────────────────────────
// The engine draws one in three dimensions while the pair is closing, made of
// matter pulled off each star by the other. This is its quiet remainder: one
// hairline running between the two halves of the spread, rose at their end and
// amber at yours, drawn on after both have unsealed. It is the only mark on the
// screen that says these are two parts of one object rather than two cards that
// happen to be stacked.
function Bridge({ C, open }) {
  const id = React.useId()
  return (
    <svg
      aria-hidden width="2" height="40"
      viewBox="0 0 2 40" preserveAspectRatio="none"
      style={{
        display: 'block', overflow: 'visible',
        opacity: open ? 1 : 0, transition: 'opacity 1.1s ease .55s',
      }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.them} stopOpacity="0.8" />
          <stop offset="50%" stopColor={C.cream} stopOpacity="0.3" />
          <stop offset="100%" stopColor={C.you} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <line x1="1" y1="0" x2="1" y2="40" stroke={`url(#${id})`} strokeWidth="1" />
    </svg>
  )
}

// ── the spread ───────────────────────────────────────────────────────────────
// `theirs` and `yours` are two cards. `onSay` is the exit, and it is the loudest
// thing on the screen from this moment on, because celestual ends at the
// handoff (§1.6): there is no chat here, and the DM is not the product stopping
// short, it is the product working.
export default function Spread({ C, yours, theirs, yourUrl, theirUrl, fieldRef, onSay, onShare, onBack }) {
  const open = useUnseal(fieldRef)
  const size = Math.min(150, Math.round(window.innerWidth * 0.36))

  const them = (theirs && theirs.handle) || (yours && yours.handle) || ''

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `max(40px, env(safe-area-inset-top)) clamp(20px, 5vw, 40px) max(24px, env(safe-area-inset-bottom))`,
        gap: SPACE.xl,
      }}
    >
      {/* The reveal happens inside the event, and the event is bright: the
          merger flash and the light echo sweeping out behind it are the two
          loudest frames the renderer ever draws. Words set over them are not
          words. This is the veil that guarantees the one thing on this screen
          that must always be legible stays legible, and it fades in with the
          unseal so it never touches the inspiral. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
          background: `radial-gradient(120% 74% at 50% 46%, ${rgba(C.ink, 0.72)} 0%, ${rgba(C.ink, 0.5)} 58%, ${rgba(C.ink, 0.76)} 100%)`,
          opacity: open ? 1 : 0, transition: 'opacity 1.2s ease',
        }}
      />

      {/* The line arrives with the flash, before the surfaces do — you learn
          that it happened, and then you find out what was said. */}
      <div
        style={{
          textAlign: 'center', display: 'flex', flexDirection: 'column', gap: SPACE.md,
          opacity: open ? 1 : 0, transition: 'opacity .8s ease',
        }}
      >
        <h1 style={{ margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: SIZE.display, lineHeight: 1.05, color: C.cream }}>
          it’s mutual.
        </h1>
        {/* A statement, so it is set in the interface register, not the
            metadata one. As tracked uppercase mono it ran wider than the
            column, wrapped, and orphaned its last word — and it was never
            metadata to begin with. It is the sentence that says what happened. */}
        <p style={{ margin: '0 auto', maxWidth: 320, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted }}>
          you entered @{them}. @{them} entered you.
        </p>
      </div>

      {/* the pair. Theirs first: at a reveal, the only thing anyone wants is
          the half they could not see. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md, flex: 1, justifyContent: 'center' }}>
        <Half C={C} card={theirs} url={theirUrl} tint={C.them} label={`@${them}`} size={size} side={-1} open={open} delay={0} />
        <Bridge C={C} open={open} />
        <Half C={C} card={yours} url={yourUrl} tint={C.you} label="yours" size={size} side={1} open={open} delay={0} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: SPACE.md, opacity: open ? 1 : 0, transition: 'opacity .7s ease 1.1s' }}>
        <PrimaryButton C={C} onClick={onSay}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            go say it <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <Small C={C} align="center" color={C.muted}>the rest is yours.</Small>
        <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.xl, marginTop: SPACE.sm }}>
          {/* Shares YOUR card and the mutual mark. Never theirs, at any tier,
              for any reason — their words were written to one person, and a
              share sheet that could carry them is a share sheet that will. */}
          <GhostButton C={C} onClick={onShare} style={{ fontSize: SIZE.meta }}>share your card</GhostButton>
          <GhostButton C={C} onClick={onBack} style={{ fontSize: SIZE.meta }}>your sky</GhostButton>
        </div>
      </div>
    </div>
  )
}

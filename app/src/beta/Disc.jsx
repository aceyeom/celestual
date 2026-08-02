// beta/Disc.jsx — THE CARD.
//
// The card is a circle, and it is a circle for a reason that is already in this
// codebase rather than one invented for a moodboard.
//
// sky/body.js: "at the end of a dive a star stops being a point and becomes a
// surface." The engine already resolves a star into a limb-darkened,
// granulating photosphere when the camera gets close enough — an opaque disc
// that occludes the field behind it, because a body has a horizon and light
// does not. That resolve is the single most expensive thing in the renderer and
// it currently pays for nothing but a nice arrival.
//
// So the card IS that surface. Not a card floating near a star, not a modal a
// star opens: the photograph is what the star turns out to be made of when you
// get close enough to see it. The transition from ping to card is then not a
// transition at all — it is an approach, and the product already knows how to
// fly one.
//
// Everything below follows from that:
//
//   · LIMB DARKENING, per channel. You are looking through more atmosphere at a
//     shallower angle near the edge, so the rim is dimmer AND redder. This is
//     the one cue that turns a circle into a sphere; without it the card is a
//     coin. It is the same effect body.js computes in a shader, done here in
//     two stacked radial gradients.
//   · GRANULATION over everything, including the photographs. It is the "same
//     grain, every card" the plan asks for (§3.4) and it is also convection
//     cells, so a card with no photo and a card with one are the same object
//     wearing two surfaces.
//   · A CORONA outside the limb, in the card's own light, bleeding into the sky
//     so the disc is seated in the field instead of pasted over it.
//   · THE RIM LABEL — the @ set on the arc, mono, tracked, quiet. An
//     astronomical plate is labelled around its edge; so is this. It also
//     solves a real layout problem for free: the handle is metadata and wants
//     to be nowhere near the words, and the rim is as far from the center as a
//     circle has.
//
// The user chooses the content and never the design (the plan, §3.4). There is
// no size control, no crop, no filter, no font: every card in the product is
// this component at a different diameter.
import * as React from 'react'
import { rgba, FONT, SIZE, TRACK, SPACE } from '../components/ui.jsx'
import { stamp, tintOf } from './model.js'

// ── granulation ──────────────────────────────────────────────────────────────
// Real convection cells, generated rather than shipped: fractal noise at two
// octaves, desaturated to luminance, at an alpha you would have to be told
// about to notice on one card and could not miss across forty. Seeded per card
// so no two surfaces carry the same grain, memoized so the string is built once
// per seed rather than once per frame of a resolve.
const grainCache = new Map()
function grain(seed) {
  const key = seed % 64
  if (grainCache.has(key)) return grainCache.get(key)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">` +
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="${key}"/>` +
    `<feColorMatrix type="saturate" values="0"/></filter>` +
    `<rect width="220" height="220" filter="url(#g)" opacity="0.5"/></svg>`
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
  grainCache.set(key, url)
  return url
}

// A stable seed from the card's id, so the grain survives a reload.
const seedOf = (s) => {
  let h = 0
  for (let i = 0; i < String(s || '').length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── the surface ──────────────────────────────────────────────────────────────
// The disc alone: no rim label, no words. Split out because the story render
// and the spread both want the body without the lockup, and because it is the
// one piece that must be pixel-identical everywhere it appears.
export function Surface({ C, card, url, size, tint }) {
  const hue = tint || tintOf(C, card && card.tone)
  const seed = seedOf(card && card.id)
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        // The photosphere, for a card with no photograph. Not a placeholder and
        // not a grey hole: a star's actual surface, warm at the center and
        // cooling outward, which is what the disc shows when there is nothing on
        // it — because there IS something on it. It is a star.
        //
        // Kept dim: an unexposed plate, not a lit lamp. Brighter, an empty
        // composer was the loudest thing on the screen and a finished card read
        // as a dimming of it, which is backwards. The photograph is what turns
        // the light on.
        // OPAQUE, and that is not a detail. sky/body.js gives a resolved star
        // its own non-additive pass for exactly one reason: "a body has a
        // horizon", and the field behind it has to stop. Written with alpha in
        // the gradient stops alone, the disc let the galaxy shine straight
        // through itself and read as a soap bubble. The solid base under the
        // gradient is what makes it a surface.
        background: url
          ? '#0B0810'
          : `radial-gradient(circle at 42% 38%, ${rgba(hue, 0.26)} 0%, ${rgba(hue, 0.12)} 32%, ${rgba(C.ink3, 0.8)} 68%, ${C.ink} 100%), ${C.ink}`,
      }}
    >
      {url && (
        <span
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
      )}

      {/* granulation — over the photograph too, so every card carries one grain */}
      <span
        style={{
          position: 'absolute', inset: 0, backgroundImage: grain(seed), backgroundSize: `${Math.max(90, size * 0.34)}px`,
          mixBlendMode: 'overlay', opacity: url ? 0.16 : 0.3,
        }}
      />

      {/* limb darkening, per channel: the rim is dimmer, and it is redder,
          because blue falls off fastest through the longer path. Two gradients
          rather than one — the first takes the light out, the second puts the
          warmth back at the very edge. */}
      <span
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 58%, ${rgba(C.ink, 0.2)} 80%, ${rgba(C.ink, 0.58)} 95%, ${rgba(C.ink, 0.82)} 100%)`,
        }}
      />
      <span
        style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen',
          background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 58%, ${rgba(hue, 0.1)} 84%, ${rgba(hue, 0.22)} 100%)`,
        }}
      />
    </span>
  )
}

// ── the rim label ────────────────────────────────────────────────────────────
// The @ set on the arc, centered at the top, reading left to right. Mono,
// uppercase, tracked — the metadata register, as far from the words as the
// geometry allows.
function Rim({ C, handle, label, size, tint }) {
  const id = React.useId()
  // The rim names the card. Everywhere but the reveal that is the address on
  // the envelope — the @ this card is for. On the fused spread it is the author
  // instead, because the only question at a reveal is who wrote which one.
  const text = label != null ? label : `@${handle || ''}`
  // r is in the 100-unit viewBox; 43 leaves the type sitting just inside the
  // limb rather than riding on it.
  //
  // TWO semicircles, not one full-circle arc. An arc whose start and end points
  // are the same point is degenerate — the spec has to invent a center for it —
  // and the browser resolved it to a path running the other way, which put the
  // handle mirrored along the bottom of the disc. Splitting it at the top gives
  // both arcs unambiguous endpoints, and makes 50% of the path length land
  // exactly on twelve o'clock, which is where the label goes.
  //
  // Starting at the bottom with sweep=1 (increasing angle, which is clockwise
  // in SVG's y-down system) runs bottom → left → top, so the type reaches the
  // top travelling left to right and reads the right way up.
  const path = 'M 50,93 A 43,43 0 0,1 50,7 A 43,43 0 0,1 50,93'
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs><path id={id} d={path} fill="none" /></defs>
      {/* Below about a thumbnail there is no legible size for type on a curve —
          it becomes a ring of noise that reads as decoration, which is worse
          than no label. The limb and the light still identify the card at that
          size, and the list beside it is already carrying the @ in words. */}
      {size >= 120 && (
        <text
          fontFamily={FONT.mono}
          fontSize={4.1}
          letterSpacing={1.1}
          fill={rgba(tint, 0.82)}
          style={{ textTransform: 'uppercase' }}
        >
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      )}
      {/* the limb: a hairline at the edge of the body, and a brighter arc where
          the chromosphere catches. Drawn in SVG so it never gets clipped by the
          surface's own overflow. */}
      <circle cx="50" cy="50" r="49.4" fill="none" stroke={rgba(C.cream, 0.16)} strokeWidth="0.5" />
      <circle
        cx="50" cy="50" r="49.4" fill="none" stroke={rgba(tint, 0.7)} strokeWidth="0.7"
        strokeDasharray="52 260" strokeLinecap="round" transform="rotate(-128 50 50)"
        style={{ filter: `drop-shadow(0 0 ${Math.max(2, size * 0.012)}px ${rgba(tint, 0.6)})` }}
      />
    </svg>
  )
}

// ── the body ─────────────────────────────────────────────────────────────────
// Surface + corona + rim, with nothing under it. This is what the sky resolves
// into and what the spread puts two of; `Card` below adds the words.
export function Body({ C, card, url, size = 300, tint, label, glow = 1, style }) {
  const hue = tint || tintOf(C, card && card.tone)
  return (
    <span
      style={{
        position: 'relative', display: 'block', width: size, height: size, borderRadius: '50%',
        // the corona: the light that reaches past the limb, in the card's own
        // colour, seating the disc in the field rather than on top of it
        boxShadow: `0 0 ${size * 0.16}px ${rgba(hue, 0.24 * glow)}, 0 0 ${size * 0.5}px ${rgba(hue, 0.11 * glow)}, 0 ${size * 0.06}px ${size * 0.24}px rgba(0,0,0,.55)`,
        ...style,
      }}
    >
      <Surface C={C} card={card} url={url} size={size} tint={hue} />
      <Rim C={C} handle={card && card.handle} label={label} size={size} tint={hue} />
    </span>
  )
}

// ── the card ─────────────────────────────────────────────────────────────────
// The whole object, in the fixed layout every card in the product wears: the
// body, the words beneath it in serif italic on one intimate measure, and the
// tick under that in mono. Three registers, cast exactly as docs/DESIGN.md §3
// casts them, and not one size off the ladder.
export default function Card({ C, card, url, size = 300, tone, style, showTick = true }) {
  const hue = tintOf(C, card && card.tone)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.xl, ...style }}>
      <Body C={C} card={card} url={url} size={size} tint={hue} />

      {/* the words. The one place on the card a person's own voice appears, so
          it gets the emotional register and the full measure, and nothing is
          allowed to sit beside it competing. */}
      {card && card.words && (
        <p
          style={{
            margin: 0, textAlign: 'center', maxWidth: Math.min(360, size * 1.15),
            fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
            fontSize: SIZE.lead, lineHeight: 1.45, color: C.cream,
            textShadow: '0 2px 18px rgba(0,0,0,.7)',
          }}
        >
          {card.words}
        </p>
      )}

      {showTick && (
        <span
          style={{
            fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
            textTransform: 'uppercase', color: rgba(C.muted, 0.9),
          }}
        >
          {tone || stamp(card && card.placed)}
        </span>
      )}
    </div>
  )
}

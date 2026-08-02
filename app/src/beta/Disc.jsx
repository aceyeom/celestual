// beta/Disc.jsx — THE CARD.
//
// A type poster, cut round.
//
// The round part is not a shape choice. sky/body.js exists because at the end
// of a dive a star stops being a point of light and becomes a surface — a
// limb-darkened, granulating photosphere, drawn opaque so it occludes the field
// behind it, because a body has a horizon. The card is that surface. So it is a
// circle for the same reason a planet is.
//
// The poster part is everything inside the limb. The words are set ON the
// ground, centered, large, tight — the thing the card is, rather than a caption
// under an image. A circle is radially symmetric, so centered type is the
// honest answer to it; what makes it a poster instead of a caption is scale and
// restraint. One big voice, two small ones, a hairline between them, and
// nothing else.
//
//              @ W R E N M I L E S        mono, tracked, quiet
//                    ─────                a hairline
//
//                you always took          serif italic, large, tight
//                 the window seat
//
//                    A U G  2             mono, quieter still
//
// The ground is a photograph or one flat plate (model.js PLATES). Under a
// photograph the type gets an even scrim, so every card in the product sets its
// words at the same contrast no matter what is behind them — which is most of
// what makes forty of them read as one work.
//
// The user chooses the words and the ground. Nothing else: no size, no crop, no
// alignment, no face, no colour for the type.
import * as React from 'react'
import { rgba, FONT } from '../components/ui.jsx'
import { stamp, tintOf, plateOf, fitRatio, metaSize, TYPE_FLOOR } from './model.js'

// ── granulation ──────────────────────────────────────────────────────────────
// Fractal noise at three octaves, desaturated to luminance. It is convection
// cells on a photosphere and it is also the one grain every card shares, which
// is the same job done twice. Seeded per card, memoized per seed.
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

const seedOf = (s) => {
  let h = 0
  for (let i = 0; i < String(s || '').length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── the ground ───────────────────────────────────────────────────────────────
export function Surface({ C, card, url, size, tint }) {
  const hue = tint || tintOf(C, card && card.tone)
  const plate = plateOf(card && card.bg)
  const seed = seedOf(card && card.id)
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        // OPAQUE. sky/body.js gives a resolved star a non-additive pass for one
        // reason — a body has a horizon and the field behind it has to stop.
        // Written with alpha alone the disc let the galaxy through and read as
        // a soap bubble.
        background: plate.hex,
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

      {/* The scrim, and only over a photograph. Flat rather than a gradient,
          because the type is centered and any gradient shaped to sit behind it
          reads as a smudge on the picture. Its whole job is that every card
          sets its words at one contrast. */}
      {url && <span style={{ position: 'absolute', inset: 0, background: rgba(C.ink, 0.46) }} />}

      {/* A flat plate is a coin. This is the light falling on a body from one
          side, which is what keeps a card with no photograph in the same family
          as one with — and as everything else in the sky. */}
      {!url && (
        <span
          style={{
            position: 'absolute', inset: 0, mixBlendMode: 'screen',
            background: `radial-gradient(circle at 38% 32%, ${rgba(hue, 0.16)} 0%, ${rgba(hue, 0.05)} 42%, transparent 72%)`,
          }}
        />
      )}

      <span
        style={{
          position: 'absolute', inset: 0, backgroundImage: grain(seed), backgroundSize: `${Math.max(90, size * 0.34)}px`,
          mixBlendMode: 'overlay', opacity: url ? 0.14 : 0.24,
        }}
      />

      {/* Limb darkening, per channel: more atmosphere at a shallower angle near
          the edge, so the rim is dimmer AND redder. It is the one cue that
          turns a circle into a sphere; without it the card is a coin. */}
      <span
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 50%, ${rgba(C.ink, 0.3)} 78%, ${rgba(C.ink, 0.66)} 95%, ${rgba(C.ink, 0.88)} 100%)`,
        }}
      />
      <span
        style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen',
          background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 62%, ${rgba(hue, 0.08)} 86%, ${rgba(hue, 0.2)} 100%)`,
        }}
      />
    </span>
  )
}

// ── the limb ─────────────────────────────────────────────────────────────────
// The card's edge: a hairline where the body ends, and one brighter arc where
// the chromosphere catches. Drawn in SVG so nothing clips it.
function Limb({ C, size, tint }) {
  return (
    <svg
      aria-hidden viewBox="0 0 100 100"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
    >
      <circle cx="50" cy="50" r="49.4" fill="none" stroke={rgba(C.cream, 0.16)} strokeWidth="0.5" />
      <circle
        cx="50" cy="50" r="49.4" fill="none" stroke={rgba(tint, 0.7)} strokeWidth="0.7"
        strokeDasharray="52 260" strokeLinecap="round" transform="rotate(-128 50 50)"
        style={{ filter: `drop-shadow(0 0 ${Math.max(2, size * 0.012)}px ${rgba(tint, 0.6)})` }}
      />
    </svg>
  )
}

// ── the type ─────────────────────────────────────────────────────────────────
// The poster. `label` overrides the top line — everywhere but the reveal that
// line is the address on the envelope, and on the fused spread it is the author,
// because the only question at a reveal is who wrote which half.
//
// The measure is 72% of the diameter. A circle is widest at its middle, so a
// centered block that tall can afford more; 72% keeps the rag comfortably
// clear of the curve at every line and stops the longest cards from crowding
// the limb.
export function Poster({ C, card, size, label, placeholder, children }) {
  if (size < TYPE_FLOOR) return null
  const words = (card && card.words) || ''
  const ms = metaSize(size)
  const top = label != null ? label : `@${(card && card.handle) || ''}`
  return (
    <span
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${size * 0.13}px`, textAlign: 'center', pointerEvents: 'none',
      }}
    >
      {!!top && (
        <span
          style={{
            fontFamily: FONT.mono, fontSize: ms, letterSpacing: ms * 0.16,
            textTransform: 'uppercase', color: rgba(C.cream, 0.56), whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
          }}
        >
          {top}
        </span>
      )}
      <span
        aria-hidden
        style={{ width: size * 0.1, height: 1, background: rgba(C.cream, 0.2), margin: `${size * 0.038}px 0 ${size * 0.05}px` }}
      />

      {/* The words, or whatever the composer wants to put in their place. */}
      {children || (
        <span
          style={{
            fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
            fontSize: size * fitRatio(words), lineHeight: 1.18,
            color: words ? C.cream : rgba(C.cream, 0.34),
            maxWidth: size * 0.72,
          }}
        >
          {words || placeholder || ''}
        </span>
      )}

      <span
        style={{
          fontFamily: FONT.mono, fontSize: ms, letterSpacing: ms * 0.16,
          textTransform: 'uppercase', color: rgba(C.cream, 0.38),
          marginTop: size * 0.055,
        }}
      >
        {stamp(card && card.placed)}
      </span>
    </span>
  )
}

// ── the card ─────────────────────────────────────────────────────────────────
// Ground, poster, limb, corona. This is the whole object; there is nothing
// outside it. `children` lets the composer put a live field where the words go
// without duplicating a single value of the layout.
export default function Card({ C, card, url, size = 300, tint, label, placeholder, glow = 1, style, children }) {
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
      <Poster C={C} card={card} size={size} label={label} placeholder={placeholder}>
        {children}
      </Poster>
      <Limb C={C} size={size} tint={hue} />
    </span>
  )
}

// The old name, kept because the sky, the spread and the composer all reach for
// the body of a card rather than a card-plus-lockup. They are now the same
// thing: everything the card has is inside it.
export { Card as Body }

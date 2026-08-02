// card/Disc.jsx — THE CARD.
//
// A type poster, cut round.
//
// The round part is not a shape choice. sky/body.js exists because at the end
// of a dive a star stops being a point of light and becomes a surface — a
// limb-darkened, granulating photosphere, drawn opaque so it occludes the field
// behind it, because a body has a horizon. The card is that surface. So it is a
// circle for the same reason a planet is.
//
// The poster part is everything inside the limb, and it is a COMPOSITION rather
// than a stack. The words are a block with a place on the ground:
//
//   ┌──────────────────────┐      · where it starts is chosen by how much text
//   │   @wren · aug 2      │        there is (model.js autoPos). A short line
//   │                      │        takes the lower left, the way a poster puts
//   │                      │        a caption meant to be read after the
//   │   you always took    │        picture; only the longest text goes to the
//   │   the window seat    │        middle, because the middle is the only part
//   └──────────────────────┘        of a circle wide enough for six lines.
//
//                                  · after that the user moves it, and
//                                    everything else follows from where it
//                                    lands: alignment is read off the block's
//                                    own x, the measure is the real chord of
//                                    the circle at the block's edge, and the
//                                    credit line goes in the half the words
//                                    left empty, on their margin, in their
//                                    alignment.
//
// Nothing in here is a gradient. The ground is flat — a photograph or one plate
// — because a poster is printed, and a vignette on a circle reads as a lens
// artefact rather than a design. The type is small on purpose: the picture is
// the picture, and the words are what you find in it.
//
// The user chooses the words, the ground, the face and the place. Not the size,
// not the crop, not the colour, not the alignment: those are derived, which is
// what keeps forty of these looking like one series.
import * as React from 'react'
import { rgba, FONT } from '../components/ui.jsx'
import {
  stamp, tintOf, plateOf, faceOf, fitRatio, metaSize, TYPE_FLOOR,
  clampPos, autoPos, alignAt, measureAt, metaPos,
} from './model.js'

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
// Flat. A photograph or one plate, one even scrim over the photograph so every
// card in the product sets its words at the same contrast, and the grain that
// every card shares. No gradients: the limb darkening and the warm rim that
// used to live here made the disc read as a lens looking at a picture instead
// of a printed circle with a picture on it.
export function Surface({ C, card, url, size }) {
  const plate = plateOf(card && card.bg)
  // The grain is seeded off the card's own content, so the same card grains the
  // same way at every size it is ever drawn at — a thumbnail, a resolve, half a
  // spread — and two different cards never share a field.
  const seed = seedOf(card && `${card.handle || ''}${card.words || ''}`)
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        // OPAQUE. sky/body.js gives a resolved star a non-additive pass for one
        // reason — a body has a horizon and the field behind it has to stop.
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
      {url && <span style={{ position: 'absolute', inset: 0, background: rgba(C.ink, 0.32) }} />}
      <span
        style={{
          position: 'absolute', inset: 0, backgroundImage: grain(seed), backgroundSize: `${Math.max(90, size * 0.34)}px`,
          mixBlendMode: 'overlay', opacity: url ? 0.12 : 0.2,
        }}
      />
    </span>
  )
}

// A block placed at a normalized anchor, aligned by which side of the disc it
// sits on. `pos` is the block's centre; the transform is what turns an anchor
// into a left, centre or right hang without any of the three needing their own
// layout code.
function Block({ pos, align, width, size, children, style }) {
  const shift = align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%'
  return (
    <span
      style={{
        position: 'absolute', left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
        transform: `translate(${shift}, -50%)`,
        width: width * size, textAlign: align,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ── the poster ───────────────────────────────────────────────────────────────
// `label` overrides the handle — everywhere but the reveal that line is the
// address on the envelope, and on the fused spread it is the author, because
// the only question at a reveal is who wrote which half.
export function Poster({ C, card, size, label, placeholder, children }) {
  if (size < TYPE_FLOOR) return null
  const words = (card && card.words) || ''
  const pos = clampPos((card && card.pos) || autoPos(words))
  const align = alignAt(pos)
  const width = measureAt(pos)
  const mp = metaPos(pos)
  const face = faceOf(card && card.face)
  const ms = metaSize(size)
  const top = label != null ? label : `@${(card && card.handle) || ''}`
  const credit = [top, stamp(card && card.placed)].filter(Boolean).join('  ·  ')

  return (
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
      <Block pos={mp} align={align} width={width} size={size}>
        <span
          style={{
            fontFamily: FONT.mono, fontSize: ms, letterSpacing: ms * 0.16,
            textTransform: 'uppercase', color: rgba(C.cream, 0.62),
            textShadow: '0 1px 10px rgba(0,0,0,.55)', whiteSpace: 'nowrap',
          }}
        >
          {credit}
        </span>
      </Block>

      {/* The words. When the composer hands in a live field it goes HERE,
          inside the same block, at the same measure and alignment — one block,
          not a second one laid over the first. Pointer events open only for
          that case; a finished card is not something you can grab. */}
      <Block pos={pos} align={align} width={width} size={size} style={children ? { pointerEvents: 'auto' } : undefined}>
        {children || (
          <span
            style={{
              display: 'block',
              fontFamily: face.family, fontStyle: face.style, fontWeight: face.weight,
              fontSize: size * fitRatio(words) * face.scale,
              lineHeight: face.lead, letterSpacing: face.track, textTransform: face.transform,
              color: words ? C.cream : rgba(C.cream, 0.38),
              textShadow: '0 2px 16px rgba(0,0,0,.6)',
            }}
          >
            {words || placeholder || ''}
          </span>
        )}
      </Block>
    </span>
  )
}

// ── the card ─────────────────────────────────────────────────────────────────
// Ground, poster, light. This is the whole object; there is nothing outside it.
// `children` lets the composer put a live field where the words go without
// duplicating a single value of the layout.
//
// There is no drawn edge. A hairline ring and a bright chromosphere arc used to
// sit on the limb, and at the size a ping is actually seen — 38px in a list,
// 46px falling through the sky at a reveal — the ring WAS the object: a drawn
// circle with a photograph inside it, which is a badge, not a body. Nothing in
// a real sky has a stroke on it. What ends a star is the light falling off, so
// that is all that ends this one: the corona in the card's own colour, and a
// soft shadow under it that seats the disc in the field rather than on top of
// it. The photograph now runs all the way to its own edge, which is what makes
// two pings tell each other apart at a glance.
export default function Card({ C, card, url, size = 300, tint, label, placeholder, glow = 1, style, children }) {
  const hue = tint || tintOf(C, card && card.tone)
  return (
    <span
      style={{
        position: 'relative', display: 'block', width: size, height: size, borderRadius: '50%',
        boxShadow:
          `0 0 ${size * 0.06}px ${rgba(hue, 0.3 * glow)}, ` +
          `0 0 ${size * 0.2}px ${rgba(hue, 0.22 * glow)}, ` +
          `0 0 ${size * 0.56}px ${rgba(hue, 0.1 * glow)}, ` +
          `0 ${size * 0.05}px ${size * 0.2}px rgba(0,0,0,.5)`,
        ...style,
      }}
    >
      <Surface C={C} card={card} url={url} size={size} />
      <Poster C={C} card={card} size={size} label={label} placeholder={placeholder}>
        {children}
      </Poster>
    </span>
  )
}

export { Card as Body, Block }

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
import { rgba, FONT, TOKENS, LIGHT } from '../components/ui.jsx'
import { groundSurface } from '../texture.js'
import {
  stamp, tintOf, plateOf, faceOf, fitRatio, metaSize, TYPE_FLOOR, WORD_FLOOR, LEGEND_OFF,
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
// A photograph or one MATERIAL, drawn per pixel (texture.js): laid paper with
// its fibre and its mould's chain lines, a chalk card cast rather than couched,
// or the leather of the case itself. No gradients: the limb darkening and the
// warm rim that used to live here made the disc read as a lens looking at a
// picture instead of a struck seal with something printed on it.
//
// The granulation stays over both, and it is the same job done twice: it is
// convection cells on a photosphere, and it is the one grain every card in the
// product shares.
// Both the ground and the granulation are repeating background images, and a
// background image is rasterized again every time its `background-size`
// changes. Sized straight off a diameter that a dive animates, that is two
// full re-rasters of a noisy tile per frame, per card. The tile is noise: it
// has no scale anybody can name, so quantizing the size to a coarse step costs
// nothing visible and turns sixty rasterizations into two or three.
const step = (v, to) => Math.max(to, Math.round(v / to) * to)

export function Surface({ C, card, url, size }) {
  const g = plateOf(card && card.bg)
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
        ...groundSurface(g, { scale: step(Math.max(120, size * 0.9), 64) }),
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
      {/* one even scrim over a photograph, so every card in the product sets its
          words at the same contrast whatever was in front of the lens */}
      {url && <span style={{ position: 'absolute', inset: 0, background: rgba(TOKENS.ink, 0.4) }} />}
      <span
        style={{
          position: 'absolute', inset: 0, backgroundImage: grain(seed), backgroundSize: `${step(Math.max(90, size * 0.34), 32)}px`,
          mixBlendMode: 'overlay', opacity: url ? 0.12 : 0.14,
        }}
      />
    </span>
  )
}

// ── the keylines ─────────────────────────────────────────────────────────────
// A struck seal has a double keyline printed inside its trim — the outer one
// heavy, the inner one a whisper — and it is most of what separates a seal from
// a circular crop of a picture.
//
// Below the type floor they come off with the type. A card too small to print
// its own legend does not print it smaller; it stops being a card and becomes a
// token, and a token in a list is right.
function Keylines({ card, url, size }) {
  if (size < TYPE_FLOOR) return null
  const g = plateOf(card && card.bg)
  const light = url || g.id === 'hide'
  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none' }}>
      <span style={{ position: 'absolute', inset: size * 0.038, borderRadius: '50%', border: `1px solid ${light ? rgba(TOKENS.cream, 0.26) : rgba(TOKENS.onPaper, 0.24)}` }} />
      <span style={{ position: 'absolute', inset: size * 0.088, borderRadius: '50%', border: `1px solid ${light ? rgba(TOKENS.cream, 0.11) : rgba(TOKENS.onPaper, 0.1)}` }} />
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
export function Poster({ C, card, url, size, label, placeholder, children }) {
  if (size < WORD_FLOOR) return null
  // Below the legend's own floor the @ and the date come off and the words take
  // the room back, set larger and centred on the disc. That is the difference
  // between a seal at 88px in the ledger and a token: one of them still says
  // what somebody wrote.
  const legend = size >= TYPE_FLOOR
  const words = (card && card.words) || ''
  const pos = legend ? clampPos((card && card.pos) || autoPos(words)) : { x: 0.5, y: 0.5 }
  const align = legend ? alignAt(pos) : 'center'
  const width = legend ? measureAt(pos) : 0.74
  const mp = metaPos(pos)
  const face = faceOf(card && card.face)
  const g = plateOf(card && card.bg)
  const ms = metaSize(size)
  // A photograph is always dark under its scrim, and so is the leather. Paper
  // and chalk are not, and type set ivory on ivory is the one thing this card
  // may never do — so the ink comes off the ground rather than off the brand.
  const onDark = !!url || g.id === 'hide'
  const ink = onDark ? TOKENS.cream : g.ink
  const quiet = onDark ? rgba(TOKENS.cream, 0.62) : g.quiet
  const cast = onDark ? '0 1px 10px rgba(0,0,0,.55)' : 'none'
  const top = label != null ? label : `@${(card && card.handle) || ''}`
  const credit = [top, stamp(card && card.placed)].filter(Boolean).join('  ·  ')

  return (
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
      {legend && (
        <Block pos={mp} align={align} width={width} size={size}>
          <span
            style={{
              fontFamily: FONT.mono, fontSize: ms, letterSpacing: ms * 0.14,
              color: quiet, textShadow: cast, whiteSpace: 'nowrap',
            }}
          >
            {credit}
          </span>
        </Block>
      )}

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
              fontSize: size * fitRatio(words) * face.scale * (legend ? 1 : LEGEND_OFF),
              lineHeight: face.lead, letterSpacing: face.track, textTransform: face.transform,
              color: words ? ink : quiet,
              textShadow: onDark ? '0 2px 16px rgba(0,0,0,.6)' : 'none',
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
// Ground, keylines, poster, light. This is the whole object; there is nothing
// outside it. `children` lets the composer put a live field where the words go
// without duplicating a single value of the layout.
//
// It is a circle for the reason it has always been a circle in this product: a
// ping is a star, and this is the star's surface. It is a struck SEAL now — a
// double keyline printed inside the trim, one of three materials underneath,
// and a shadow that sits under it rather than around it.
//
// What it lost is the corona. Three stacked radial glows in the card's own
// colour used to end the disc, on the argument that what ends a star is light
// falling off. That is true of a star and untrue of the thing you are actually
// looking at, which is an object on a leather case: nothing in this brand
// emits, and a glowing circle in a list of them reads as a notification.
//
// So the light is where light is on a physical object: a catch along the top
// edge, a deeper shadow under the bottom, and the shadow it throws on what it
// is lying on. `glow` is kept as the caller's word for how proud of the case it
// sits (a thumbnail in a row sits nearly flat; a resolve at the end of a dive
// sits fully proud), and `tint` still decides the ONE warm edge — the light
// this card's star burns with, measured off its ground and never picked.
export default function Card({ C, card, url, size = 300, tint, label, placeholder, glow = 1, style, children }) {
  const hue = tint || tintOf(C, card && card.tone)
  const g = plateOf(card && card.bg)
  const dark = !!url || g.id === 'hide'
  const lift = Math.max(0, Math.min(1, glow))
  return (
    <span
      style={{
        position: 'relative', display: 'block', width: size, height: size, borderRadius: '50%',
        boxShadow:
          // the card's own light, and it is an EDGE rather than a halo: one
          // hairline of it round the trim, at the warmth its ground measured
          `0 0 0 1px ${rgba(hue, 0.34)}, ` +
          // the catch on the top, the shadow under the bottom
          `inset 0 1px 0 ${rgba('#FFFFFF', dark ? 0.05 : 0.4)}, ` +
          `inset 0 -2px 6px rgba(0,0,0,${dark ? 0.42 : 0.14}), ` +
          // and what it throws on the case it is lying on
          `0 ${size * 0.012 * lift}px ${size * 0.02 * lift}px rgba(0,0,0,${0.34 * lift}), ` +
          `0 ${size * 0.08 * lift}px ${size * 0.19 * lift}px rgba(0,0,0,${0.46 * lift})`,
        ...style,
      }}
    >
      <Surface C={C} card={card} url={url} size={size} />
      <Keylines card={card} url={url} size={size} />
      <Poster C={C} card={card} url={url} size={size} label={label} placeholder={placeholder}>
        {children}
      </Poster>
    </span>
  )
}

export { Card as Body, Block }

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  A PHONE'S LIGHT, TURNED                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A letter's screen lit in one colour becoming one lit in another, the way
// the door's and the mutual's phones become the rose letter as the pink
// spreads over their glass (screens/Join.jsx, screens/Reveal.jsx). Each
// colour the Screen paints with (looks.js `skinVars`, screen.css) is the
// first's mixed toward the second's by one number, `--mu-turn` (mutual.css),
// so what animates is a number and the colours follow. The second is itself
// a variable, `--mu-s-*`, the second colour's own unless something sets it
// (the mutual's drift), so the panel, the two bands, the glow and the light
// round the phone are always one light.
//
// The ink is not among them: the story carries its own (pixmark.js), and
// PixelStory reads the Screen's as a colour it can parse.

import { skinVars } from './looks.js'

export const TURNS = ['--s-top', '--s-top-2', '--s-bot', '--s-hi', '--s-mid', '--s-lo', '--s-lit', '--s-cur', '--s-bloom', '--s-glow', '--s-glow-2', '--s-edge', '--s-halo', '--s-halo-2']

export function turnStyle(from, to, base = {}) {
  const A = skinVars(from)
  const B = skinVars(to)
  const out = { ...base }
  for (const k of TURNS) out[k] = `color-mix(in srgb, ${A[k]}, var(--mu${k}, ${B[k]}) calc(var(--mu-turn) * 100%))`
  return out
}

// ── unsent, the film ────────────────────────────────────────────────────────
//
// Fifteen seconds, drawn from `t` and nothing else (index.jsx), so a frame
// is exactly what it is told and scripts/studio-film.mjs can photograph it
// a frame at a time. The motion is keyframes eased by GSAP's own curves
// (`ease`), read at `t`; nothing runs on a clock of its own.
//
//   0.0   the black room. A phone wakes, ice, and a note is typed on it to
//         kai, the cursor after the last word. `write it.`
//   3.7   `send` is pressed. The note goes, privately, and the phone goes to
//         sleep and steps back. `send it privately.` `they never know.`
//   6.0   another phone wakes, amber, and kai writes one back. `unless they
//         send you one.`
//   8.0   it goes. The first phone wakes with an envelope by its aerial, and
//         the two come together into one glass
//   8.6   the mutual's own film (pixmark.js `filmStory`, as Film.jsx tells
//         it): the two names credited, the two of them run in and are held,
//         the glass turns rose, the mark, `it's mutual.` typed in its cells
//  13.3   the phone steps back, and the line and the lockup sign it
//
// `L` is the layout, for the two cuts: 9:16 (films/unsent.jsx) and 4:5
// (films/unsent-45.jsx).

import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { Board, Phone, PixelStory, Lockup, Light, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import './film.css'

import { MS, A, B, T, rhythm, storyAt } from './film-time.js'

export { MS }

// ── the keyframes ───────────────────────────────────────────────────────────
// A track is [[ms, value], [ms, value, ease], ...]: the value at `t`, eased
// into each key by that key's curve (GSAP's names), held before the first
// and after the last.
const EASES = new Map()
const easeOf = (name) => {
  if (!EASES.has(name)) EASES.set(name, gsap.parseEase(name || 'power2.inOut'))
  return EASES.get(name)
}
export function at(track, t) {
  if (t <= track[0][0]) return track[0][1]
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, e] = track[i]
    if (t <= t1) {
      const [t0, v0] = track[i - 1]
      const u = easeOf(e)((t - t0) / Math.max(1, t1 - t0))
      return v0 + (v1 - v0) * u
    }
  }
  return track[track.length - 1][1]
}

// The way an old backlight came on: dark, a stutter, then lit
export function wake(t, from, ms = 420) {
  const u = (t - from) / ms
  if (u <= 0) return 0
  if (u >= 1) return 1
  if (u < 0.14) return 0.55 * (u / 0.14)
  if (u < 0.24) return 0.12
  if (u < 0.36) return 0.78
  if (u < 0.44) return 0.4
  return 0.4 + 0.6 * easeOf('power2.out')((u - 0.44) / 0.56)
}

// ── the typing ──────────────────────────────────────────────────────────────
// (the rhythm is film-time.js's, so the keys are heard where they land)
const typedAt = (times, t) => { let n = 0; while (n < times.length && times[n] <= t) n++; return n }

// The cursor keeps the phone's beat (screen.css `wl-blink`, 1.06s, half
// lit), and is held lit while a key was just pressed, as a caret is
const lit = (t, last) => t - last < 530 || Math.floor((t - last) / 530) % 2 === 1

// The words as they are being typed: laid out whole, so no word jumps a
// line as it is typed, with what is not typed yet there and unseen, and the
// cursor after the last typed character. At one size, the size the whole
// note fits the glass at (`fs`, in the screen's cqw).
function Typed({ text, n, cursor, fs }) {
  return (
    <div className="wl-scr-msg fm-typed" style={{ '--fs': `${fs}cqw` }}>
      {text.slice(0, n)}
      {cursor ? <span className="wl-scr-cur" aria-hidden="true" /> : <span className="fm-nocur" />}
      <span className="fm-rest">{text.slice(n)}</span>
    </div>
  )
}

// ── a phone with a note on it ───────────────────────────────────────────────
function NotePhone({ who, w, x, y, t, typeFrom, beat, sendAt, fs, sleep = 0, bright = 1, mail = false, opacity = 1 }) {
  const times = rhythm(who.text, typeFrom, beat)
  const n = typedAt(times, t)
  const last = n ? times[n - 1] : typeFrom
  const sent = t >= sendAt + 240
  const pressed = t >= sendAt && t < sendAt + 240
  const counter = `${260 - n}/1`
  const keys = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send', open: pressed } }
  return (
    <div className="fm-ph" style={{ opacity, filter: `brightness(${(bright * (1 - sleep * 0.9)).toFixed(3)})` }}>
      <Phone
        w={w} x={x} y={y} tint={who.tint} seed={who.seed} mode="bare" square
        top={{ counter, icon: 'pen', name: who.to, dear: true, bat: 4, mail }} keys={sent ? {} : keys}
      >
        {sent
          ? <ScreenNote glyph="env" title="sent privately." />
          : <Typed text={who.text} n={n} cursor={lit(t, last)} fs={fs} />}
      </Phone>
    </div>
  )
}


// ── the film ────────────────────────────────────────────────────────────────
export function Unsent({ t, L }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { readyFilm(A.name, B.name).then(() => setOk(true)) }, [])
  useHold(ok)
  const film = ok ? filmOf(A.name, B.name, 'rose') : null

  // the first phone: wakes, types, sends, sleeps and steps back, wakes again
  // with the envelope, and goes into the glass
  const aWake = wake(t, T.aWake, 460)
  const aSleep = at([[4400, 0], [5300, 1, 'power2.inOut'], [8000, 1], [8300, 0, 'power2.out']], t)
  const aX = at([[0, L.a.x], [4300, L.a.x], [5500, L.a2.x, 'power3.inOut'], [8150, L.a2.x], [8750, L.mid.x, 'power3.inOut']], t)
  const aY = at([[0, L.a.y], [4300, L.a.y], [5500, L.a2.y, 'power3.inOut'], [8150, L.a2.y], [8750, L.mid.y, 'power3.inOut']], t)
  const aW = at([[0, L.a.w * 0.985], [3500, L.a.w], [4300, L.a.w], [5500, L.a2.w, 'power3.inOut'], [8150, L.a2.w], [8750, L.mid.w, 'power3.inOut']], t)
  // the second: wakes, types, sends, and goes into the glass
  const bWake = wake(t, T.bWake, 420)
  const bX = at([[0, L.b.x], [8150, L.b.x], [8750, L.mid.x, 'power3.inOut']], t)
  const bY = at([[0, L.b.y], [8150, L.b.y], [8750, L.mid.y, 'power3.inOut']], t)
  const bW = at([[0, L.b.w], [8150, L.b.w], [8750, L.mid.w, 'power3.inOut']], t)
  // the two meet in the middle going dark, as a phone does between one
  // screen and the next, and the one glass wakes where they met
  const dim = at([[8350, 1], [8600, 0.04, 'power2.in']], t)
  const pair = t < T.glass - 20 ? 1 : 0
  const glass = wake(t, T.glass, 460)

  // the glass: the story at its own clock, the night turning rose with the
  // pink, and the step back at the end
  const st = storyAt(t)
  const turn = film ? Math.min(1, Math.max(0, (st - film.times.glow) / 700)) : 0
  const gW = at([[0, L.mid.w], [13300, L.mid.w], [14200, L.end.w, 'power3.inOut']], t)
  const gY = at([[0, L.mid.y], [13300, L.mid.y], [14200, L.end.y, 'power3.inOut']], t)
  const push = at([[8600, 0.985], [12900, 1.02, 'sine.inOut'], [13300, 1.02], [14200, 1, 'power3.inOut']], t)

  // the room's light: each phone's own, and the rose's when the glass turns
  const aLight = aWake * (1 - aSleep * 0.85) * pair * dim
  const bLight = bWake * pair * dim
  const gLight = glass * (0.35 + 0.65 * turn)

  // the words under the phones
  const cap = (track) => at(track, t)
  const lines = [
    { text: 'write it.', o: cap([[900, 0], [1250, 1, 'power2.out'], [3400, 1], [3700, 0, 'power2.in']]), y: L.cap },
    { text: 'send it privately.', o: cap([[3850, 0], [4200, 1, 'power2.out'], [5500, 1], [5800, 0, 'power2.in']]), y: L.cap },
    { text: 'they never know.', o: cap([[4750, 0], [5100, 1, 'power2.out'], [5500, 1], [5800, 0, 'power2.in']]), y: L.cap + L.capGap },
    { text: 'unless they send you one.', o: cap([[6150, 0], [6500, 1, 'power2.out'], [8100, 1], [8400, 0, 'power2.in']]), y: L.cap },
  ]
  const endO = at([[13550, 0], [14150, 1, 'power2.out']], t)
  const endO2 = at([[13800, 0], [14400, 1, 'power2.out']], t)
  const ink = skinVars('rose')

  return (
    <Board w={L.w} h={L.h} grain={0} className="fm-board">
      {aLight > 0.01 ? <Light x={aX} y={aY} size={aW * 2.6} tint={A.tint} strength={aLight} /> : null}
      {bLight > 0.01 ? <Light x={bX} y={bY} size={bW * 2.6} tint={B.tint} strength={bLight} /> : null}
      {gLight > 0.01 ? <Light x={L.mid.x} y={gY} size={gW * 2.8} colour={turn > 0.5 ? ink['--s-halo'] : skinVars('night')['--s-halo']} strength={gLight} /> : null}

      {pair > 0 && t >= T.aWake ? (
        <NotePhone
          who={A} w={aW} x={aX} y={aY} t={t} typeFrom={T.aType} beat={T.aBeat} sendAt={T.aSend} fs={L.fsA}
          sleep={aSleep} bright={aWake * dim} mail={t >= T.mail}
        />
      ) : null}
      {pair > 0 && t >= T.bWake ? (
        <NotePhone who={B} w={bW} x={bX} y={bY} t={t} typeFrom={T.bType} beat={T.bBeat} sendAt={T.bSend} fs={L.fsB} bright={bWake * dim} />
      ) : null}

      {film && glass > 0 ? (
        <div className="fm-ph" style={{ filter: `brightness(${glass.toFixed(3)})`, transform: `scale(${push})`, transformOrigin: `${L.mid.x}px ${gY}px` }}>
          <Phone
            w={gW} x={L.mid.x} y={gY} mode="bare" square seed="intro" tint="rose" className="is-story"
            screenStyle={{ '--mu-turn': turn, ...turnStyle('night', 'rose') }}
          >
            <PixelStory story={film} at={st} />
          </Phone>
        </div>
      ) : null}

      {lines.map((l) => (l.o > 0.002 ? (
        <p key={l.text} className="fm-cap" style={{ top: `${l.y}px`, fontSize: `${L.capSize}px`, opacity: l.o, transform: `translateY(${((1 - l.o) * 14).toFixed(2)}px)`, filter: `blur(${((1 - l.o) * 6).toFixed(2)}px)` }}>
          {l.text}
        </p>
      ) : null))}

      {endO > 0.002 ? (
        <div className="fm-end" style={{ top: `${L.endLine}px` }}>
          <p className="fm-line" style={{ fontSize: `${L.lineSize}px`, opacity: endO, filter: `blur(${((1 - endO) * 5).toFixed(2)}px)` }}>nothing happens unless it’s mutual.</p>
          <div className="fm-sign" style={{ marginTop: `${L.signGap}px`, opacity: endO2 }}>
            <Lockup cell={L.cell} />
            <span className="fm-url" style={{ fontSize: `${L.urlSize}px` }}>celestual.us</span>
          </div>
        </div>
      ) : null}

      <Grain opacity={0.085} seed={Math.floor(t / 66) % 12} />
      <span className="st-vignette" style={{ opacity: 0.55 }} aria-hidden="true" />
    </Board>
  )
}

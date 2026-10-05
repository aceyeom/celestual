// ── unsent, the film ────────────────────────────────────────────────────────
//
// Fifteen seconds, drawn from `t` and nothing else (index.jsx), so a frame
// is exactly what it is told and scripts/studio-film.mjs can photograph it
// a frame at a time. The motion is keyframes eased by GSAP's own curves
// (`ease`), read at `t`; every key is a moment of film-time.js's, which the
// sound is made from too.
//
//   0.0   a phone lit in the black room, a note to kai half typed on it, the
//         cursor after the last word. `write it.`
//   1.75  `send` is pressed, the words go up the glass, `sent privately.`,
//         and the phone goes to sleep and steps back. `send it privately.`
//   3.9   another phone wakes under it, amber, and kai writes one of their
//         own. `they only read it` `if they send you one.`
//   6.1   it goes, and that phone sleeps too. `saturday, 9pm pacific.`
//   6.9   the two come together going dark, and one glass wakes where they
//         met: the mutual's own film (pixmark.js `filmStory`, as Film.jsx
//         tells it), the names, the two of them held, the glass turning
//         rose, the mark, and `it's mutual.` typed in its cells
//  12.46  the phone steps back, and the line and the lockup sign it
//
// `L` is the layout, for the two cuts: 9:16 (films/unsent.jsx) and 4:5
// (films/unsent-45.jsx).

import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { Board, Phone, PixelStory, Lockup, Light, Grain, filmOf, readyFilm, useHold, turnStyle, skinVars } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import { MS, A, B, T, SEND, rhythm, storyAt } from './film-time.js'
import './film.css'

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

// a line in and out: [in from, in to, out from, out to]
const shown = (t, [a, b, c, d]) => at([[a, 0], [b, 1, 'power2.out'], [c, 1], [d, 0, 'power2.in']], t)

const typedAt = (times, t) => { let n = 0; while (n < times.length && times[n] <= t) n++; return n }
// The cursor keeps the phone's beat (screen.css `wl-blink`, 1.06s, half
// lit), and is held lit while a key was just pressed, as a caret is
const lit = (t, last) => t - last < 530 || Math.floor((t - last) / 530) % 2 === 1

// The words as they are being typed: laid out whole, so no word jumps a
// line as it is typed, with what is not typed yet there and unseen, and the
// cursor after the last typed character. At one size, the size the whole
// note fits the glass at (`fs`, in the screen's cqw). `lift` is how many
// lines they have gone up the glass, a line at a time, as an old screen
// scrolled.
function Typed({ text, n, cursor, fs, lift = 0 }) {
  return (
    <div className="wl-scr-msg fm-typed" style={{ '--fs': `${fs}cqw` }}>
      <span className="fm-lift" style={lift ? { transform: `translateY(${-lift * 1.02}em)` } : undefined}>
        {text.slice(0, n)}
        {cursor ? <span className="wl-scr-cur" aria-hidden="true" /> : <span className="fm-nocur" />}
        <span className="fm-rest">{text.slice(n)}</span>
      </span>
    </div>
  )
}

// ── a phone with a note on it ───────────────────────────────────────────────
function NotePhone({ who, w, x, y, t, typeFrom, beat, sendAt, fs, sleep = 0, bright = 1 }) {
  const times = rhythm(who.text, typeFrom, beat)
  const n = typedAt(times, t)
  const last = n ? times[n - 1] : typeFrom
  const since = t - sendAt
  const pressed = since >= 0 && since < SEND.key
  const lifting = since >= SEND.key && since < SEND.key + SEND.lift
  const sent = since >= SEND.key + SEND.lift
  const lift = lifting ? 1 + Math.floor(((since - SEND.key) / SEND.lift) * 3) : 0
  const keys = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send', open: pressed } }
  return (
    <div className="fm-ph" style={{ filter: `brightness(${(bright * (1 - sleep * 0.9)).toFixed(3)})` }}>
      <Phone
        w={w} x={x} y={y} tint={who.tint} seed={who.seed} mode="bare" square
        top={{ counter: `${260 - n}/1`, icon: 'pen', name: who.to, dear: true, bat: 4 }} keys={sent ? {} : keys}
      >
        {sent
          ? <ScreenNote glyph="env" title="sent privately." />
          : <Typed text={who.text} n={n} cursor={!lifting && lit(t, last)} fs={fs} lift={lift} />}
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
  const E = T.meet + 600

  // the first phone: lit from before the first frame; sends, sleeps and
  // steps up out of the way, all before the second wakes; then down into
  // the glass
  const aWake = wake(t, T.aWake, 460)
  const aSleep = at([[T.aSleep, 0], [T.aSleep + 800, 0.86, 'power2.inOut']], t)
  const aPos = (k) => at([[0, L.a[k] * (k === 'w' ? 0.985 : 1)], [T.aSend, L.a[k]], [T.aSleep, L.a[k]], [T.aSleep + 1000, L.a2[k], 'power3.inOut'], [T.meet, L.a2[k]], [E, L.mid[k], 'power3.inOut']], t)
  // the second: wakes under it, writes, sends, sleeps, and into the glass
  const bWake = wake(t, T.bWake, 420)
  const bSleep = at([[T.bSleep, 0], [T.bSleep + 600, 0.86, 'power2.inOut']], t)
  const bPos = (k) => at([[0, L.b[k]], [T.meet, L.b[k]], [E, L.mid[k], 'power3.inOut']], t)
  // the two meet going dark, as a phone does between one screen and the
  // next, and the one glass wakes where they met
  const dim = at([[T.dim, 1], [T.glass - 40, 0.03, 'power2.in']], t)
  const pair = t < T.glass ? 1 : 0
  const glass = wake(t, T.glass, 460)

  // the glass: the story at its own clock, the night turning rose with the
  // pink, and the step back at the end
  const st = storyAt(t)
  const turn = film ? Math.min(1, Math.max(0, (st - film.times.glow) / 700)) : 0
  const back = (k) => at([[0, L.mid[k]], [T.back, L.mid[k]], [T.back + T.step, L.end[k], 'power3.inOut']], t)
  const gW = back('w')
  const gY = back('y')
  const push = at([[T.glass, 0.985], [T.back, 1.02, 'sine.inOut'], [T.back + T.step, 1, 'power3.inOut']], t)

  // the room's light: each phone's own, and the rose's when the glass turns
  const aLight = aWake * (1 - aSleep * 0.85) * dim * pair
  const bLight = bWake * (1 - bSleep * 0.85) * dim * pair
  const gLight = glass * (0.35 + 0.65 * turn)

  // the words under the phones: what it is, in four lines, and the week
  const lines = [
    { k: 'w', text: 'write it.', o: shown(t, [100, 400, 1500, 1750]), row: 0 },
    { k: 's', text: 'send it privately.', o: shown(t, [1850, 2150, 3350, 3600]), row: 0 },
    { k: 'r', text: 'they only read it', o: shown(t, [3700, 4000, 5900, 6150]), row: 0 },
    { k: 'i', text: 'if they send you one.', o: shown(t, [4150, 4450, 5900, 6150]), row: 1 },
  ]
  const week = shown(t, [T.week, T.week + 300, T.glass + 650, T.glass + 950])
  const endO = at([[T.back + 250, 0], [T.back + T.step, 1, 'power2.out']], t)
  const endO2 = at([[T.back + 450, 0], [T.back + T.step + 200, 1, 'power2.out']], t)
  const night = skinVars('night')['--s-halo']
  const rose = skinVars('rose')['--s-halo']

  return (
    <Board w={L.w} h={L.h} grain={0} className="fm-board">
      {aLight > 0.01 ? <Light x={aPos('x')} y={aPos('y')} size={aPos('w') * 2.6} tint={A.tint} strength={aLight} /> : null}
      {bLight > 0.01 ? <Light x={bPos('x')} y={bPos('y')} size={bPos('w') * 2.6} tint={B.tint} strength={bLight} /> : null}
      {gLight > 0.01 ? <Light x={L.mid.x} y={gY} size={gW * 2.8} colour={turn > 0.5 ? rose : night} strength={gLight} /> : null}

      {pair ? (
        <NotePhone
          who={A} w={aPos('w')} x={aPos('x')} y={aPos('y')} t={t} typeFrom={T.aType} beat={T.aBeat} sendAt={T.aSend} fs={L.fsA}
          sleep={aSleep} bright={aWake * dim}
        />
      ) : null}
      {pair && bWake > 0.02 ? (
        <NotePhone
          who={B} w={bPos('w')} x={bPos('x')} y={bPos('y')} t={t} typeFrom={T.bType} beat={T.bBeat} sendAt={T.bSend} fs={L.fsB}
          sleep={bSleep} bright={bWake * dim}
        />
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
        <p key={l.k} className="fm-cap" style={{ top: `${L.cap + l.row * L.capGap}px`, fontSize: `${L.capSize}px`, opacity: l.o, transform: `translateY(${((1 - l.o) * 6).toFixed(2)}px)` }}>
          {l.text}
        </p>
      ) : null))}
      {week > 0.002 ? (
        <p className="fm-week" style={{ top: `${L.weekY}px`, fontSize: `${L.weekSize}px`, opacity: week }}>saturday, 9pm pacific.</p>
      ) : null}

      {endO > 0.002 ? (
        <div className="fm-end" style={{ top: `${L.endLine}px` }}>
          <p className="fm-line" style={{ fontSize: `${L.lineSize}px`, opacity: endO, transform: `translateY(${((1 - endO) * 6).toFixed(2)}px)` }}>
            nothing happens<br />unless it’s mutual.
          </p>
          <div className="fm-sign" style={{ marginTop: `${L.signGap}px`, opacity: endO2 }}>
            <Lockup cell={L.cell} />
            <span className="fm-url" style={{ fontSize: `${L.urlSize}px` }}>celestual.us</span>
          </div>
        </div>
      ) : null}

      <Grain opacity={0.06} seed={Math.floor(t / 133) % 12} />
      <span className="st-vignette" style={{ opacity: 0.55 }} aria-hidden="true" />
    </Board>
  )
}

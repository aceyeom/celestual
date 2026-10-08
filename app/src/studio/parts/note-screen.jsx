// ── a note, on its phone ────────────────────────────────────────────────────
//
// The composer of the reel's notes (reel.jsx), lin's and kai's, mid letter
// and then sent, at `t`: the words laid out whole, a letter landing at each
// of `times`. The wall's sheet (films/wall-atlas.jsx) photographs lin's from
// this same component, so the wall's cell and the phone over it in the reel
// are the same picture.
import { useLayoutEffect, useRef } from 'react'
import { Phone } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import './note-screen.css'

export const PW = 1000
export const typedAt = (times, t) => { let n = 0; while (n < times.length && times[n] <= t) n++; return n }
const blink = (t, last) => t - last < 530 || Math.floor((t - last) / 530) % 2 === 1

// The words laid out whole, a span a letter, what is not typed yet there and
// unseen, so no word jumps a line as it is typed and the cursor's place is
// the place of the next letter. `onMeasure` is handed every letter's place
// in the phone's own pixels, once.
function Typed({ text, n, cursor, fs, lift = 0, onMeasure = null }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!onMeasure || !ref.current) return
    const root = ref.current.closest('.st-phone')
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const spans = [...ref.current.querySelectorAll('[data-i]')]
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k } }
    onMeasure(spans.map(box), { w: root.offsetWidth, h: root.offsetHeight })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const chars = [...text]
  // the cursor takes no room on the line, as a caret takes none
  const cur = cursor ? <span className="wl-scr-cur rl-cur" aria-hidden="true" /> : null
  return (
    <div className="wl-scr-msg rl-typed" ref={ref} style={{ '--fs': `${fs}cqw` }}>
      <span className="rl-lift" style={lift ? { transform: `translateY(${-lift * 1.02}em)` } : undefined}>
        {chars.map((c, i) => (
          <span key={i} data-i={i} className={i < n ? undefined : 'rl-rest'}>{i === n ? cur : null}{c}</span>
        ))}
        <span data-i={chars.length}>{n >= chars.length ? cur : null}</span>
      </span>
    </div>
  )
}

// a note's phone: the composer, mid letter, then sent (`still` holds the
// cursor lit, for a photograph)
export function NoteScreen({ who, t, times, sendAt, fs, onMeasure, quiet = true, still = false }) {
  const n = typedAt(times, t)
  const last = n ? times[n - 1] : times[0]
  const since = t - sendAt
  const pressed = since >= 0 && since < 170
  const lifting = since >= 170 && since < 410
  const sent = since >= 410
  const lift = lifting ? 1 + Math.floor(((since - 170) / 240) * 3) : 0
  const keys = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send', open: pressed } }
  return (
    <Phone
      w={PW} tint={who.tint} seed={who.seed} mode="bare" square quiet={quiet}
      top={{ counter: `${260 - n}/1`, icon: 'pen', name: who.to, dear: true, bat: 4 }} keys={sent ? {} : keys}
    >
      {sent
        ? <ScreenNote glyph="env" title="sent privately." />
        : <Typed text={who.text} n={n} cursor={still || (!lifting && blink(t, last))} fs={fs} lift={lift} onMeasure={onMeasure} />}
    </Phone>
  )
}

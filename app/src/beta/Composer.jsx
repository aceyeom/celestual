// beta/Composer.jsx — the composer is the card.
//
// You type into the poster, at the size and in the face it will keep, and you
// drag the block to where you want it. Nothing is applied at the end and there
// is no preview, because the thing on screen is the artifact.
//
// Everything you can change lives in one panel under it, on a two-column grid
// with the controls labelled: ground, type. Two rows, both obvious, both
// finite. What is NOT there is as deliberate: no size, no colour, no alignment,
// no crop. Those are derived from what you did choose, which is the only reason
// forty of these can look like one series.
import * as React from 'react'
import {
  rgba, RADIUS, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, GlassPanel, Small,
} from '../components/ui.jsx'
import Card from './Disc.jsx'
import {
  MAX_WORDS, PROMPT, SEEDS, PLATES, FACES, plateOf, faceOf,
  clampWords, wordCount, fitRatio, autoPos, clampPos, alignAt,
} from './model.js'
import { prepare } from './photo.js'

// How far a pointer may travel before a tap on the text block becomes a drag of
// it. Under this it is someone reaching for the caret; over it they are moving
// the block. Both gestures start on the same pixel, so one of them has to be
// decided by distance.
const DRAG_SLOP = 6

// ── the control panel ────────────────────────────────────────────────────────
// A labelled grid, not a scatter of chips. The label column is a fixed width so
// the two rows share one left edge, which is most of why it reads as an
// instrument rather than as decoration that drifted under the card.
function Row({ C, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.lg, minHeight: 44 }}>
      <span
        style={{
          width: 54, flexShrink: 0, fontFamily: FONT.mono, fontSize: SIZE.micro,
          letterSpacing: TRACK.micro, textTransform: 'uppercase', color: rgba(C.muted, 0.9),
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function Controls({ C, bg, face, hasPhoto, busy, onPlate, onFace, onFile }) {
  const cam = React.useRef(null)
  const lib = React.useRef(null)
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = '' // so the same file twice in a row still fires
    if (f) onFile(f)
  }
  return (
    <GlassPanel C={C} style={{ width: '100%', padding: `${SPACE.md}px ${SPACE.lg}px` }}>
      <input ref={cam} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: 'none' }} />
      <input ref={lib} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />

      <Row C={C} label="ground">
        {PLATES.map((p) => {
          const on = !hasPhoto && bg === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlate(p.id)}
              aria-label={p.id}
              aria-pressed={on}
              style={{
                width: 24, height: 24, flexShrink: 0, borderRadius: '50%', cursor: 'pointer', padding: 0,
                background: p.hex,
                border: `1px solid ${rgba(C.cream, on ? 0.55 : 0.16)}`,
                boxShadow: on ? `0 0 0 2px ${C.ink2}, 0 0 0 3.5px ${rgba(C.cream, 0.75)}` : 'none',
                transition: 'box-shadow .2s ease, border-color .2s ease',
              }}
            />
          )
        })}
        <button
          type="button"
          onClick={() => (hasPhoto ? lib : cam).current?.click()}
          aria-pressed={hasPhoto}
          style={{
            height: 24, padding: '0 11px', flexShrink: 0, borderRadius: RADIUS.chip, cursor: 'pointer', marginLeft: SPACE.xs,
            fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro, textTransform: 'uppercase',
            color: hasPhoto ? C.onStar : rgba(C.cream, 0.82),
            background: hasPhoto ? C.star : 'transparent',
            border: `1px solid ${hasPhoto ? C.star : rgba(C.cream, 0.24)}`,
            opacity: busy ? 0.5 : 1,
            transition: 'background .2s ease, color .2s ease, border-color .2s ease',
          }}
        >
          photo
        </button>
      </Row>

      <div style={{ height: 1, background: rgba(C.cream, 0.08), margin: `${SPACE.xs}px 0` }} />

      <Row C={C} label="type">
        {FACES.map((f) => {
          const on = face === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFace(f.id)}
              aria-label={f.id}
              aria-pressed={on}
              style={{
                minWidth: 42, height: 30, flexShrink: 0, borderRadius: RADIUS.inner, cursor: 'pointer', padding: '0 10px',
                fontFamily: f.family, fontStyle: f.style, fontWeight: f.weight, fontSize: 16,
                color: on ? C.star : rgba(C.cream, 0.7),
                background: on ? rgba(C.star, 0.1) : 'transparent',
                border: `1px solid ${on ? rgba(C.star, 0.55) : rgba(C.cream, 0.16)}`,
                transition: 'background .2s ease, color .2s ease, border-color .2s ease',
              }}
            >
              Aa
            </button>
          )
        })}
      </Row>
    </GlassPanel>
  )
}

// ── the words ────────────────────────────────────────────────────────────────
// A textarea with no box of its own, laid exactly where the poster sets its
// words, in the face and at the ratio the finished card uses. The dashed
// boundary is the composer's only addition and it exists to say the block is a
// thing you can pick up.
function Words({ C, value, face, align, size, onChange, dragging }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, size, face, align])
  return (
    <span
      style={{
        display: 'block', borderRadius: RADIUS.inner,
        border: `1px dashed ${rgba(C.cream, dragging ? 0.4 : 0.16)}`,
        padding: `${size * 0.02}px ${size * 0.022}px`,
        margin: `-${size * 0.02}px -${size * 0.022}px`,
        transition: 'border-color .2s ease',
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(clampWords(e.target.value))}
        placeholder={PROMPT}
        rows={1}
        spellCheck
        aria-label={PROMPT}
        style={{
          display: 'block', width: '100%', resize: 'none', overflow: 'hidden',
          background: 'none', border: 'none', outline: 'none', padding: 0, textAlign: align,
          fontFamily: face.family, fontStyle: face.style, fontWeight: face.weight,
          // the prompt is set below the size real words get: at full size it
          // filled the block and read as a finished card saying the wrong
          // thing, and a placeholder has to look like an absence
          fontSize: size * (value ? fitRatio(value) : 0.05) * face.scale,
          lineHeight: face.lead, letterSpacing: face.track, textTransform: face.transform,
          color: C.cream, textShadow: '0 2px 16px rgba(0,0,0,.6)',
          cursor: dragging ? 'grabbing' : 'text',
        }}
      />
    </span>
  )
}

// ── the composer ─────────────────────────────────────────────────────────────
export default function Composer({ C, handle, onPlace, onBack }) {
  const [text, setText] = React.useState('')
  const [bg, setBg] = React.useState('ink')
  const [face, setFace] = React.useState('serif')
  const [pos, setPos] = React.useState(() => autoPos(''))
  const [moved, setMoved] = React.useState(false) // has the user placed it themselves
  const [dragging, setDragging] = React.useState(false)
  const [photo, setPhoto] = React.useState(null) // { blob, url, tone }
  const [busy, setBusy] = React.useState(false)
  const size = Math.min(320, Math.round(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.4)))
  const boxRef = React.useRef(null)

  React.useEffect(() => () => photo && photo.url && URL.revokeObjectURL(photo.url), [photo])

  // The block re-composes itself as the text grows, right up until the moment
  // the person moves it. After that it is theirs and nothing touches it again.
  React.useEffect(() => {
    if (!moved) setPos(autoPos(text))
  }, [text, moved])

  const take = React.useCallback(async (file) => {
    setBusy(true)
    try {
      const out = await prepare(file)
      if (out) {
        setPhoto((prev) => {
          if (prev && prev.url) URL.revokeObjectURL(prev.url)
          return { blob: out.blob, url: URL.createObjectURL(out.blob), tone: out.tone }
        })
      }
    } catch {
      /* an image that will not decode simply does not become one; the card
         stands on a plate instead, which is why the ground has two kinds */
    }
    setBusy(false)
  }, [])

  // Choosing a plate drops the photograph. The ground is one thing.
  const choosePlate = React.useCallback((id) => {
    setBg(id)
    setPhoto((prev) => {
      if (prev && prev.url) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  // ── moving the block ───────────────────────────────────────────────────────
  // The same pixel starts two gestures: a tap wants the caret, a drag wants the
  // block. Distance decides. Below the slop nothing is prevented, so the
  // textarea focuses the way any textarea would; past it the field is blurred
  // and the pointer is captured for the rest of the drag.
  const drag = React.useRef(null)
  const onDown = React.useCallback((e) => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    drag.current = { x0: e.clientX, y0: e.clientY, rect: r, live: false, id: e.pointerId }
  }, [])

  const onMove = React.useCallback((e) => {
    const d = drag.current
    if (!d) return
    if (!d.live) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_SLOP) return
      d.live = true
      setDragging(true)
      setMoved(true)
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
      try {
        e.currentTarget.setPointerCapture(d.id)
      } catch {
        /* capture is a convenience; the move handler still fires without it */
      }
    }
    e.preventDefault()
    setPos(clampPos({ x: (e.clientX - d.rect.left) / d.rect.width, y: (e.clientY - d.rect.top) / d.rect.height }))
  }, [])

  const onUp = React.useCallback(() => {
    drag.current = null
    setDragging(false)
  }, [])

  const draft = React.useMemo(
    () => ({
      id: 'draft', handle, words: text, bg, face, pos,
      tone: photo ? photo.tone : plateOf(bg).tone, placed: Date.now(),
    }),
    [handle, text, bg, face, pos, photo],
  )
  const left = MAX_WORDS - wordCount(text)
  const ready = wordCount(text) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.xl, width: '100%' }}>
      <div
        ref={boxRef}
        style={{ position: 'relative', opacity: busy ? 0.55 : 1, transition: 'opacity .3s ease' }}
      >
        <Card C={C} card={draft} url={photo && photo.url} size={size} glow={photo ? 1.1 : 0.85}>
          <span
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{ display: 'block', touchAction: 'none' }}
          >
            <Words
              C={C}
              value={text}
              onChange={setText}
              face={faceOf(face)}
              align={alignAt(pos)}
              size={size}
              dragging={dragging}
            />
          </span>
        </Card>
      </div>

      <Controls
        C={C}
        bg={bg}
        face={face}
        hasPhoto={!!photo}
        busy={busy}
        onPlate={choosePlate}
        onFace={setFace}
        onFile={take}
      />

      {/* A true number, and the only one on the screen. It arrives when it
          starts to matter rather than counting at you from the first keystroke. */}
      <span
        style={{
          fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro, textTransform: 'uppercase',
          color: left <= 4 ? rgba(C.star, 0.9) : rgba(C.muted, 0.7),
          opacity: left < MAX_WORDS && left <= 10 ? 1 : 0, transition: 'opacity .3s ease',
        }}
      >
        {left} left
      </span>

      {/* Three finished cards, in the register we want back. They teach by
          being the thing, and they go the moment there is anything to teach
          against. */}
      {!text && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'center' }}>
          {SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              style={{
                background: 'none', border: 'none', padding: `${SPACE.xs}px ${SPACE.md}px`, cursor: 'pointer',
                fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.body, lineHeight: 1.4,
                color: rgba(C.muted, 0.85), textAlign: 'center',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: SPACE.md, marginTop: 'auto', paddingTop: SPACE.md }}>
        <PrimaryButton
          C={C}
          disabled={!ready || busy}
          onClick={() =>
            onPlace({ words: text, bg, face, pos, blob: photo && photo.blob, tone: photo ? photo.tone : plateOf(bg).tone })
          }
        >
          place it
        </PrimaryButton>
        {/* The one sentence worth keeping here. It is not an instruction, it is
            the reason twenty honest words are safe to ask for at all. */}
        <Small C={C} align="center" color={rgba(C.muted, 0.75)}>
          sealed until you both enter each other
        </Small>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={onBack} style={{ fontSize: SIZE.meta }}>back</GhostButton>
        </div>
      </div>
    </div>
  )
}

// card/Composer.jsx — the composer is the card.
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
import { createPortal } from 'react-dom'
import {
  rgba, RADIUS, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, GlassPanel, Small, useDialog,
} from '../components/ui.jsx'
import Card from './Disc.jsx'
import {
  MAX_WORDS, PROMPT, SEEDS, PLATES, FACES, plateOf, faceOf,
  clampWords, wordCount, fitRatio, autoPos, clampPos, alignAt,
} from './model.js'
import { prepare } from './photo.js'
import { groundSurface } from '../texture.js'

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

// ── where a picture comes from ───────────────────────────────────────────────
// Three doors, because a phone has three and picking the wrong one for someone
// is a dead end they have to back out of. `capture` opens the camera straight
// away and CANNOT be undone from inside the sheet it opens, so a single button
// carrying it means anyone whose picture is already in their camera roll has to
// take a photo of nothing and start again. The gallery door drops `capture` and
// asks for images; the files door drops the filter too, for the picture that
// arrived as a download, sits in Drive, or came out of a chat.
//
// It is a menu rather than three chips in the panel for one reason: the panel is
// the card's own controls, and three ways to do one thing sitting next to the
// grounds would read as four grounds.
const SOURCES = [
  { id: 'camera', label: 'take a photo', accept: 'image/*', capture: 'environment' },
  { id: 'gallery', label: 'photo library', accept: 'image/*' },
  { id: 'files', label: 'browse files' },
]

// Through a portal, and that is not fussiness: the screen wrapper this composer
// lives inside carries `.fade`, whose keyframes animate `transform` with
// fill-mode `both`. A transformed ancestor becomes the containing block for
// every `position: fixed` descendant, so a sheet rendered in place would be
// laid out against a mid-page box instead of the viewport. App.jsx hit exactly
// this with the admin desk and left the note; this is the same trap.
function SourceSheet({ C, onPick, onClose }) {
  const ref = useDialog(onClose)
  return createPortal(
    <div
      onPointerUp={onClose}
      className="fade"
      style={{
        position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: rgba(C.ink, 0.62),
        padding: `0 clamp(12px, 4vw, 24px) max(18px, env(safe-area-inset-bottom))`,
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        onPointerUp={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="where the picture comes from"
        style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: SPACE.sm, outline: 'none' }}
      >
        <GlassPanel C={C} style={{ padding: 0, overflow: 'hidden' }}>
          {SOURCES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s)}
              style={{
                display: 'block', width: '100%', padding: '17px 20px', textAlign: 'center', cursor: 'pointer',
                background: 'none', border: 'none', borderTop: i ? `1px solid ${rgba(C.cream, 0.08)}` : 'none',
                fontFamily: FONT.sans, fontSize: SIZE.body, color: C.cream,
              }}
            >
              {s.label}
            </button>
          ))}
        </GlassPanel>
        <GlassPanel C={C} style={{ padding: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'block', width: '100%', padding: '17px 20px', textAlign: 'center', cursor: 'pointer',
              background: 'none', border: 'none', fontFamily: FONT.sans, fontSize: SIZE.body, color: rgba(C.cream, 0.7),
            }}
          >
            not now
          </button>
        </GlassPanel>
      </div>
    </div>,
    document.body,
  )
}

function Controls({ C, bg, face, hasPhoto, busy, onPlate, onFace, onFile }) {
  const input = React.useRef(null)
  const [asking, setAsking] = React.useState(false)
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = '' // so the same file twice in a row still fires
    if (f) onFile(f)
  }
  // One input, re-pointed. The attributes that decide which sheet the OS opens
  // are set the instant before the click, because a browser reads them then and
  // three permanent inputs would be three ways for a stale one to fire.
  const open = (source) => {
    setAsking(false)
    const el = input.current
    if (!el) return
    if (source.accept) el.setAttribute('accept', source.accept)
    else el.removeAttribute('accept')
    if (source.capture) el.setAttribute('capture', source.capture)
    else el.removeAttribute('capture')
    el.click()
  }
  return (
    <GlassPanel C={C} style={{ width: '100%', padding: `${SPACE.md}px ${SPACE.lg}px` }}>
      <input ref={input} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      {asking && <SourceSheet C={C} onPick={open} onClose={() => setAsking(false)} />}

      <Row C={C} label="ground">
        {/* the grounds are MATERIALS, so each swatch is the real surface at the
            real texture (texture.js draws it per pixel). Choosing one is
            looking at the thing rather than reading its name. */}
        {PLATES.map((p) => {
          const on = !hasPhoto && bg === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlate(p.id)}
              aria-label={p.name}
              title={p.name}
              aria-pressed={on}
              style={{
                width: 26, height: 26, flexShrink: 0, borderRadius: '50%', cursor: 'pointer', padding: 0,
                ...groundSurface(p, { scale: 90 }),
                border: 0,
                boxShadow: on
                  ? `0 0 0 1px ${C.star}, 0 0 0 4px ${rgba(C.star, 0.16)}`
                  : `0 0 0 1px ${rgba(C.cream, 0.14)}, 0 3px 9px rgba(0,0,0,.4)`,
                transition: 'box-shadow .16s linear',
              }}
            />
          )
        })}
        <button
          type="button"
          onClick={() => setAsking(true)}
          aria-pressed={hasPhoto}
          aria-haspopup="dialog"
          style={{
            height: 26, padding: '0 11px', flexShrink: 0, borderRadius: RADIUS.chip, cursor: 'pointer', marginLeft: SPACE.xs,
            fontFamily: FONT.sans, fontWeight: 400, fontSize: SIZE.micro, letterSpacing: TRACK.meta, textTransform: 'uppercase',
            color: hasPhoto ? C.onStar : rgba(C.cream, 0.82),
            background: hasPhoto ? C.star : 'transparent',
            border: `1px solid ${hasPhoto ? 'transparent' : rgba(C.cream, 0.24)}`,
            boxShadow: hasPhoto ? 'inset 0 -1px 0 rgba(0,0,0,.3)' : 'none',
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
                minWidth: 44, height: 30, flexShrink: 0, borderRadius: RADIUS.inner, cursor: 'pointer', padding: '0 10px',
                fontFamily: f.family, fontStyle: f.style, fontWeight: f.weight, fontSize: 16,
                color: on ? C.star : rgba(C.cream, 0.7),
                background: 'transparent',
                border: `1px solid ${on ? rgba(C.star, 0.55) : rgba(C.cream, 0.16)}`,
                boxShadow: on ? `inset 0 1px 0 rgba(255,226,186,0.06), inset 0 -1px 0 rgba(0,0,0,0.34)` : 'none',
                transition: 'color .2s linear, border-color .2s linear',
              }}
              title={f.name}
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
// The live field, laid exactly where the finished poster sets its words, in the
// same face and at the same ratio. `ground` is the material it is being written
// on, and the ink comes off THAT rather than off the brand — the composer is the
// one place in the product where you can watch a card being written, so type
// set ivory on ivory here is not a subtle bug, it is the whole screen going
// blank while somebody types into it.
function Words({ C, value, face, align, size, onChange, dragging, ground, onDark }) {
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
        border: `1px dashed ${onDark ? rgba(C.cream, dragging ? 0.4 : 0.16) : rgba(C.onPaper, dragging ? 0.42 : 0.18)}`,
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
        className={onDark ? 'ph-ivory' : 'ph-ink'}
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
          color: onDark ? C.cream : ground.ink,
          textShadow: onDark ? '0 2px 16px rgba(0,0,0,.6)' : 'none',
          caretColor: onDark ? C.cream : ground.ink,
          cursor: dragging ? 'grabbing' : 'text',
        }}
      />
    </span>
  )
}

// ── the composer ─────────────────────────────────────────────────────────────
// `locked` is the caller placing the ping: the button holds still while the
// server answers, and nothing on the card can be changed underneath it.
export default function Composer({ C, handle, busy: locked, onPlace, onBack }) {
  const [text, setText] = React.useState('')
  const [bg, setBg] = React.useState('leaf')
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
              ground={plateOf(bg)}
              onDark={!!photo || plateOf(bg).id === 'hide'}
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
          disabled={!ready || busy || locked}
          onClick={() =>
            onPlace({ words: text, bg, face, pos, blob: photo && photo.blob, tone: photo ? photo.tone : plateOf(bg).tone })
          }
        >
          {locked ? '…' : 'place it'}
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

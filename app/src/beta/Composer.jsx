// beta/Composer.jsx — the composer is the card.
//
// You type into the poster. Not into a field that later becomes one: the
// textarea sits where the words sit, in the face, size, colour and measure they
// will keep, inside the disc at the diameter it will hold. Nothing is applied
// at the end, and there is no moment where someone finds out what their card
// looks like, because they were looking at it the whole time.
//
// Everything else on the screen is one row: the ground. Five plates and a
// photograph, mutually exclusive, because that is the only design decision the
// user gets to make.
import * as React from 'react'
import { rgba, RADIUS, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, Small } from '../components/ui.jsx'
import Card from './Disc.jsx'
import { MAX_WORDS, PROMPT, SEEDS, PLATES, plateOf, clampWords, wordCount, fitRatio } from './model.js'
import { prepare } from './photo.js'

// ── the ground ───────────────────────────────────────────────────────────────
// One row: five plates, then the word "photo". A sixth swatch standing for a
// photograph would need a glyph to say so, and docs/DESIGN.md §3b is explicit
// that a screen wanting a sixth icon wants a word instead.
//
// The camera is opened with `capture` on a file input rather than getUserMedia:
// the site's Permissions-Policy disables the camera API outright, the native
// sheet is not governed by that header, and it is the better interaction on a
// phone anyway.
function Ground({ C, bg, hasPhoto, busy, onPlate, onFile }) {
  const cam = React.useRef(null)
  const lib = React.useRef(null)
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = '' // so the same file twice in a row still fires
    if (f) onFile(f)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.md, flexWrap: 'wrap' }}>
      <input ref={cam} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: 'none' }} />
      <input ref={lib} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />

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
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', padding: 0,
              background: p.hex,
              border: `1px solid ${rgba(C.cream, on ? 0.5 : 0.14)}`,
              boxShadow: on ? `0 0 0 2px ${rgba(C.ink, 1)}, 0 0 0 3.5px ${rgba(C.cream, 0.7)}` : 'none',
              transition: 'box-shadow .22s ease, border-color .22s ease',
            }}
          />
        )
      })}

      {/* A chip, not a button in a different shape: the ground is one control
          group, so the sixth option has to sit on the same baseline and the
          same height as the five beside it. A ghost button here overlapped the
          last swatch and read as unrelated chrome that had drifted into the
          row. */}
      <button
        type="button"
        onClick={() => (hasPhoto ? lib : cam).current?.click()}
        aria-pressed={hasPhoto}
        style={{
          height: 30, padding: '0 14px', borderRadius: RADIUS.chip, cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro, textTransform: 'uppercase',
          color: hasPhoto ? C.onStar : rgba(C.cream, 0.8),
          background: hasPhoto ? C.star : 'transparent',
          border: `1px solid ${hasPhoto ? C.star : rgba(C.cream, 0.22)}`,
          opacity: busy ? 0.5 : 1,
          transition: 'background .22s ease, color .22s ease, border-color .22s ease',
        }}
      >
        photo
      </button>
    </div>
  )
}

// ── the words ────────────────────────────────────────────────────────────────
// A textarea with no box, no border and no background, laid exactly where the
// poster sets its words. It has to be measured against the same ratio the
// finished card uses, or the type would jump at the moment of placing.
function Words({ C, value, onChange, size }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, size])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(clampWords(e.target.value))}
      placeholder={PROMPT}
      rows={1}
      spellCheck
      aria-label={PROMPT}
      style={{
        width: size * 0.72, maxHeight: size * 0.46, resize: 'none', overflow: 'hidden',
        background: 'none', border: 'none', outline: 'none', textAlign: 'center', padding: 0,
        fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
        // The prompt is set smaller than the words will be. At the size real
        // content gets it filled three lines of the disc and read as a finished
        // card that happened to say the wrong thing; a placeholder has to look
        // like an absence.
        fontSize: size * (value ? fitRatio(value) : 0.068),
        lineHeight: 1.18, color: C.cream,
        pointerEvents: 'auto',
      }}
    />
  )
}

// ── the composer ─────────────────────────────────────────────────────────────
export default function Composer({ C, handle, onPlace, onBack }) {
  const [words, setWords] = React.useState('')
  const [bg, setBg] = React.useState('ink')
  const [photo, setPhoto] = React.useState(null) // { blob, url, tone }
  const [busy, setBusy] = React.useState(false)
  const size = Math.min(310, Math.round(Math.min(window.innerWidth * 0.78, window.innerHeight * 0.42)))

  React.useEffect(() => () => photo && photo.url && URL.revokeObjectURL(photo.url), [photo])

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

  const draft = React.useMemo(
    () => ({ id: 'draft', handle, words, bg, tone: photo ? photo.tone : plateOf(bg).tone, placed: Date.now() }),
    [handle, words, bg, photo],
  )
  const left = MAX_WORDS - wordCount(words)
  const ready = wordCount(words) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.xl, width: '100%' }}>
      <div style={{ opacity: busy ? 0.55 : 1, transition: 'opacity .3s ease' }}>
        <Card C={C} card={draft} url={photo && photo.url} size={size} glow={photo ? 1.1 : 0.85}>
          <Words C={C} value={words} onChange={setWords} size={size} />
        </Card>
      </div>

      <Ground C={C} bg={bg} hasPhoto={!!photo} busy={busy} onPlate={choosePlate} onFile={take} />

      {/* A true number, and the only one on the screen. It appears when it
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
          being the thing. They go the moment there is anything to teach against. */}
      {!words && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'center' }}>
          {SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setWords(s)}
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

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: SPACE.md, marginTop: 'auto', paddingTop: SPACE.md }}>
        <PrimaryButton
          C={C}
          disabled={!ready || busy}
          onClick={() => onPlace({ words, bg, blob: photo && photo.blob, tone: photo ? photo.tone : plateOf(bg).tone })}
        >
          place it
        </PrimaryButton>
        {/* The one sentence worth keeping on this screen. It is not an
            instruction, it is the reason twenty honest words are safe to ask
            for at all. */}
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

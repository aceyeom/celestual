// beta/Composer.jsx — the composer is the card.
//
// There is no preview step here, and that is the whole idea. The plan says the
// card composes itself in the fixed layout and the user chooses content and
// never design (§3.4) — so the surface you are filling in IS the disc, at the
// size and with the treatment it will hold forever, and the line you are typing
// is set in the type it will be set in. Nothing is "applied" at the end. There
// is no moment where a person finds out what their card looks like, because
// they were looking at it the entire time.
//
// The two fields are split in time, and the labels say so out loud, because
// that split is the single change that makes the rest of the plan work:
//
//   the photo is NOW    — where you are, this minute, while you're thinking
//                         about them. Everyone is somewhere.
//   the words are THEN  — the small thing you still remember. Everyone
//                         remembers one small thing.
//
// The composer is never empty. Three real cards sit under the field, and
// tapping one writes it in. This is the highest-leverage thirty minutes in the
// plan (§2) and it is here because a blank canvas produces exactly two things —
// the joke card and the empty hedge — and no amount of instruction under a
// field prevents either.
import * as React from 'react'
import {
  rgba, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, Kicker, Small,
} from '../components/ui.jsx'
import { Body } from './Disc.jsx'
import { MAX_WORDS, PROMPT, PHOTO_PROMPT, SEEDS, clampWords, wordCount } from './model.js'
import { prepare } from './photo.js'

// ── the aperture ─────────────────────────────────────────────────────────────
// The disc, while it is still being filled. Tapping it opens the camera; the
// gallery is a quieter second door beneath, exactly the priority the plan sets
// (§3.2 — "camera opens first; gallery is the secondary option").
//
// getUserMedia is not used, and not for a prototype reason: the site's
// Permissions-Policy header disables the camera API outright. `capture` on a
// file input opens the native camera sheet, which that header does not govern,
// needs no permission dialog, and is the better interaction on a phone anyway.
function Aperture({ C, card, url, size, busy, onFile }) {
  const cam = React.useRef(null)
  const lib = React.useRef(null)
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    // reset, so choosing the same file twice in a row still fires a change
    e.target.value = ''
    if (f) onFile(f)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md }}>
      <input ref={cam} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: 'none' }} />
      <input ref={lib} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />

      <button
        type="button"
        onClick={() => cam.current && cam.current.click()}
        aria-label={PHOTO_PROMPT}
        style={{
          position: 'relative', width: size, height: size, borderRadius: '50%',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          opacity: busy ? 0.5 : 1, transition: 'opacity .3s ease',
        }}
      >
        <Body C={C} card={card} url={url} size={size} glow={url ? 1 : 0.7} />
        {/* the invitation, resting on the star's own surface. It leaves the
            moment there is a photograph, because a label on a finished card is
            a label on a finished card. */}
        {!url && (
          <span
            style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
              textTransform: 'uppercase', color: rgba(C.cream, 0.82), textShadow: '0 1px 10px rgba(0,0,0,.8)',
              padding: '0 22%', textAlign: 'center', lineHeight: 1.9, pointerEvents: 'none',
            }}
          >
            {PHOTO_PROMPT}
          </span>
        )}
      </button>

      <GhostButton C={C} onClick={() => lib.current && lib.current.click()} style={{ fontSize: SIZE.meta }}>
        {url ? 'use a different one' : 'or choose one'}
      </GhostButton>
    </div>
  )
}

// ── the words ────────────────────────────────────────────────────────────────
// A textarea with no box around it, set in the exact face, size, colour and
// measure the finished card sets its words in. A bordered field here would mean
// the card visibly changes at the moment of placing, which is the one thing
// this composer is built to avoid.
function Words({ C, value, onChange, size }) {
  const ref = React.useRef(null)
  // grow to fit, so the line never scrolls inside its own box
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  const left = MAX_WORDS - wordCount(value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md, width: '100%' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(clampWords(e.target.value))}
        placeholder={PROMPT}
        rows={2}
        spellCheck
        style={{
          width: '100%', maxWidth: Math.min(360, size * 1.15), resize: 'none', overflow: 'hidden',
          background: 'none', border: 'none', outline: 'none', textAlign: 'center',
          fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
          fontSize: SIZE.lead, lineHeight: 1.45, color: C.cream,
          textShadow: '0 2px 18px rgba(0,0,0,.7)', padding: 0,
        }}
      />
      {/* the count is metadata and reads as metadata. It is also exactly true,
          which is the only kind of number this product shows. */}
      <span
        style={{
          fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro,
          textTransform: 'uppercase', color: left <= 4 ? rgba(C.star, 0.9) : rgba(C.muted, 0.75),
          transition: 'color .3s ease',
        }}
      >
        {left} {left === 1 ? 'word' : 'words'} left
      </span>
    </div>
  )
}

// ── the seeds ────────────────────────────────────────────────────────────────
// Not placeholder text and not a tooltip: three finished cards, in the register
// we want back. They teach by being the thing, and tapping one is allowed —
// someone who sends "you always took the window seat" verbatim has still said
// something specific and true-shaped, and will almost always edit it.
function Seeds({ C, onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md }}>
      <Kicker C={C} micro>for instance</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'center' }}>
        {SEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            style={{
              background: 'none', border: 'none', padding: `${SPACE.xs}px ${SPACE.md}px`, cursor: 'pointer',
              fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.body, lineHeight: 1.4,
              color: rgba(C.muted, 0.88), textAlign: 'center',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── the composer ─────────────────────────────────────────────────────────────
export default function Composer({ C, handle, onPlace, onBack }) {
  const [words, setWords] = React.useState('')
  const [photo, setPhoto] = React.useState(null) // { blob, url, tone }
  const [busy, setBusy] = React.useState(false)
  const size = Math.min(232, Math.round(window.innerWidth * 0.54))

  // Release the preview URL when it is replaced or the composer leaves. The
  // stored card mints its own from the blob shelf; this one is scratch.
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
      /* a photo that will not decode simply does not become one; the card
         stands without it, which is the whole reason it is optional */
    }
    setBusy(false)
  }, [])

  // A live card, so the aperture is lit by the photograph the moment there is
  // one — the tint is the surface's own warmth (model.js), never a picker.
  const draft = React.useMemo(
    () => ({ id: 'draft', handle, words, tone: photo ? photo.tone : 1 }),
    [handle, words, photo],
  )
  const ready = wordCount(words) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.xl, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.sm }}>
        <Kicker C={C} micro>the photo is now</Kicker>
        <Aperture C={C} card={draft} url={photo && photo.url} size={size} busy={busy} onFile={take} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md, width: '100%' }}>
        <Kicker C={C} micro>the words are then</Kicker>
        <Words C={C} value={words} onChange={setWords} size={size} />
      </div>

      {!words && <Seeds C={C} onPick={setWords} />}

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: SPACE.md, marginTop: 'auto', paddingTop: SPACE.sm }}>
        <PrimaryButton
          C={C}
          disabled={!ready || busy}
          onClick={() => onPlace({ words, blob: photo && photo.blob, tone: photo ? photo.tone : 1 })}
        >
          place it
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={onBack} style={{ fontSize: SIZE.meta }}>back</GhostButton>
        </div>
        {/* The one thing worth saying on this screen, said once. It is the
            product's whole ethical position and it is what makes twenty honest
            words safe to ask for. */}
        <Small C={C} align="center" color={rgba(C.muted, 0.8)}>
          sealed until you both enter each other
        </Small>
      </div>
    </div>
  )
}

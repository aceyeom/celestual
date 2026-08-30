// handle.jsx — the resolver's readout, and the hook behind it.
//
// One object, drawn under every field in the product where somebody types an @.
// A person has typed a handle from memory; this puts the account itself under
// the line, so what they confirm against is a FACE AND A NAME rather than
// against their own spelling. That is the entire feature.
//
// ── why this is a separate file ──────────────────────────────────────────────
// ui.jsx is copy-free by construction: every string in it arrives as a prop, so
// the design system holds no sentences and no locale. This component needs both
// a sentence and a lookup, so it lives beside the system rather than inside it,
// the way screens.jsx does. It is built out of ui.jsx's parts and defines no
// hex, no font and no size of its own.
//
// ── the line, and what it is not ─────────────────────────────────────────────
// It is a LINE, not a card. Everything in here that names somebody is a line
// with a rule under it (HandleChip, the ledger rows, the index); a bordered
// panel with an avatar in it, under a ruled field, would be the one element in
// the product borrowed from a settings screen.
//
// AND IT SHOWS NO NUMBERS. Not followers, not posts, not a bio, not a link.
// This product does not tell anybody how popular anybody is, and a resolver
// that grew a stats line would have quietly turned the send screen into the
// profile page the whole thing exists to avoid.
import * as React from 'react'
import { normHandle } from '../api/celestual.js'
import { resolveHandle, peekHandle, resolveEnabled, IDLE } from '../api/handles.js'
import { useI18n } from '../i18n/index.js'
import {
  Icon, Sonar, rgba, SPACE, TOKENS, TEXT, HAIR, FONT, SIZE, TRACK,
} from './ui.jsx'

// The ask: debounced, deduped, and safe to abandon. Returns the four-state
// answer from api/handles.js and nothing else, so a caller that wants to know
// whether to warn reads `state === 'missing'` and needs to know nothing more.
export function useHandleResolve(value, { enabled = true } = {}) {
  const [out, setOut] = React.useState(IDLE)
  const seq = React.useRef(0)
  React.useEffect(() => {
    const h = normHandle(value)
    if (!enabled || !resolveEnabled || h.length < 2) {
      setOut({ state: 'idle', handle: h })
      return undefined
    }
    // Already answered in this tab: say so now. Debouncing a fact we are
    // holding would put a spinner over an answer we already have, every time
    // somebody walks back to a screen.
    const known = peekHandle(h)
    if (known) {
      setOut(known)
      return undefined
    }
    const mine = ++seq.current
    // Long enough that typing a thirty-character handle is one lookup rather
    // than thirty; short enough that the answer is on screen before the thumb
    // gets to the button.
    const id = setTimeout(async () => {
      if (mine === seq.current) setOut({ state: 'looking', handle: h })
      const r = await resolveHandle(h)
      if (mine === seq.current) setOut(r)
    }, 300)
    return () => clearTimeout(id)
  }, [value, enabled])
  return out
}

// The drawn stand-in: an account with no picture, or a picture that would not
// load. The first letter of the handle in the typewriter face, inside the same
// circle the real one uses. Never a grey silhouette of a person.
function Initial({ handle, size, onPaper }) {
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        color: onPaper ? TEXT.onPaperFaint : TEXT.faint,
      }}
    >
      {(handle || '@').slice(0, 1)}
    </span>
  )
}

export function HandleReadout({ C, at, size = 26, onPaper, style }) {
  const { t } = useI18n()
  const [broken, setBroken] = React.useState(false)
  const src = (at && at.avatar) || ''
  React.useEffect(() => {
    setBroken(false)
  }, [src])

  // IDLE AND UNKNOWN DRAW NOTHING, and the second one is the important one.
  // "Unknown" is the resolver failing to tell us anything (switched off, no
  // network, past the cap, provider refusing); reporting that as "no such
  // account" would be the product lying about somebody's account, which is the
  // one thing it is never allowed to do.
  if (!at || at.state === 'idle' || at.state === 'unknown') return null

  const handle = at.handle || ''
  const quiet = onPaper ? TEXT.onPaperFaint : TEXT.faint
  const read = onPaper ? TEXT.onPaper : TOKENS.cream
  const lit = (C && C.star) || TOKENS.star
  const rule = onPaper ? HAIR.onPaperFaint : HAIR.faint

  const row = { display: 'flex', alignItems: 'center', gap: SPACE.sm, minHeight: size, padding: '8px 2px 0', ...style }
  const disc = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    display: 'grid', placeItems: 'center',
  }

  if (at.state === 'looking') {
    return (
      <div style={row} aria-live="polite">
        <span style={{ ...disc, display: 'grid' }}>
          <Sonar C={C} size={14} />
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: TRACK.tick, textTransform: 'uppercase', color: quiet }}>
          {t('resolve.looking')}
        </span>
      </div>
    )
  }

  // Not found, and the act still goes through. This is the product's whole
  // answer to a handle nobody has heard of, and it is phrased as a fact about
  // our own lookup rather than as a verdict on a person.
  if (at.state === 'missing') {
    return (
      <div className="fade" style={row} aria-live="polite">
        <span aria-hidden style={{ ...disc, border: `1px dashed ${onPaper ? HAIR.onPaper : HAIR.strong}` }}>
          <Initial handle={handle} size={size} onPaper={onPaper} />
        </span>
        <span style={{ minWidth: 0, fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.4, color: quiet }}>
          {t('resolve.missing')}
        </span>
      </div>
    )
  }

  return (
    <div className="fade" style={row} aria-live="polite">
      <span
        aria-hidden
        style={{
          ...disc,
          background: onPaper ? rgba(TOKENS.onPaper, 0.06) : rgba(TOKENS.cream, 0.06),
          border: `1px solid ${rule}`,
        }}
      >
        {src && !broken ? (
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Initial handle={handle} size={size} onPaper={onPaper} />
        )}
      </span>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.25, color: read, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {at.name || handle}
          </span>
          {/* The badge, if the account carries one, drawn with the same check
              the product uses for every other confirmed thing. The icon set is
              six glyphs and this does not make it seven. */}
          {at.verified && <Icon name="check" size={11} color={lit} stroke={1.5} />}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: '.4px', color: quiet, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          @{handle}
          {at.private ? ` · ${t('resolve.private')}` : ''}
        </span>
      </span>
    </div>
  )
}

// The two halves together, for the call sites that have a plain Field and just
// want the line under it. Screens that already hold the answer (because the
// confirm step needs it too) use the hook and the component separately.
export function ResolvedHandle({ C, value, enabled = true, size, onPaper, style }) {
  const at = useHandleResolve(value, { enabled })
  return <HandleReadout C={C} at={at} size={size} onPaper={onPaper} style={style} />
}

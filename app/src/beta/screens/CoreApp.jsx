// /beta/app — CELESTUAL, THE CORE
//
// The flow has to land somewhere real. A wall that dissolves into a "coming
// soon" wastes the one moment where somebody has walked the entire argument and
// is ready to believe it — so this screen shows the actual mechanic: you place
// a ping, nothing happens, and if they placed one back you both find out at the
// same moment.
//
// Three parts, in the order the loop runs:
//   · the composer     — you release a point into the field
//   · the mutual       — a scripted state of what happens when two find each
//                        other. Scripted and labelled as a demonstration
//                        rather than faked as live, because the whole product
//                        is that this cannot be made to happen on demand.
//   · the inbox        — one item, proving the author side of the loop exists.

import { useEffect, useMemo, useState } from 'react'
import { ArrowLink, Display, Eyebrow, HandleField, Help, Paper, Rule } from '../parts.jsx'
import { atHandle, normHandle } from '../handles.js'
import { getState, patch } from '../store.js'

const WORD_MAX = 20
const words = (s) => s.trim().split(/\s+/).filter(Boolean)

export default function CoreApp({ setSkyMode }) {
  const [target, setTarget] = useState('')
  const [note, setNote] = useState('')
  const [released, setReleased] = useState(() => getState().pings.length)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { setSkyMode('ambient') }, [setSkyMode])

  const n = words(note).length
  const ready = normHandle(target).length >= 3 && n > 0 && n <= WORD_MAX

  function release() {
    if (!ready) return
    patch({ pings: [...getState().pings, { handle: normHandle(target), note: note.trim() }] })
    setReleased((v) => v + 1)
    setTarget('')
    setNote('')
  }

  // The two cards in the mutual. One is addressed to them and one is addressed
  // to you, which is the only arrangement that shows what mutual MEANS — two
  // cards both addressed to the same person would be a conversation, and this
  // product is not a conversation.
  const pair = useMemo(() => {
    const you = getState().handle || getState().query || 'you'
    const pings = getState().pings
    const them = pings.length ? pings[pings.length - 1].handle : 'sofiaaa.reyes'
    const now = new Date().toISOString()
    return {
      mine:   { id: 'mine',   targetHandle: them, body: 'I have started this message four times.', hasSeal: true, createdAt: now, expiresAt: now },
      theirs: { id: 'theirs', targetHandle: you,  body: 'I was going to say something in October and then I did not.', hasSeal: true, createdAt: now, expiresAt: now },
    }
  }, [released])

  return (
    <div className="beta-col">
      <div className="beta-lede-s" />

      <Eyebrow>CELESTUAL</Eyebrow>
      <Display size={34} style={{ marginTop: 14 }}>Place a ping.</Display>
      <Help style={{ marginTop: 16 }} small>
        They never find out. Unless they place one on you.
      </Help>

      <div style={{ marginTop: 32 }}>
        <HandleField value={target} onChange={setTarget} placeholder="" />
      </div>

      <textarea
        className="beta-area"
        style={{ marginTop: 22, minHeight: 110 }}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Twenty words"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 10 }}>
        <Help small dim>Twenty words.</Help>
        <span className={`beta-count${n > WORD_MAX ? ' is-over' : ''}`}>{n}/{WORD_MAX}</span>
      </div>

      {/* a frame, not an uploader. the demo does not need the bytes to make
          the point, and an upload control on a screen nobody asked to upload
          on is a control that has to be explained */}
      <div className="beta-frame" style={{ marginTop: 22 }}>
        <span className="beta-eyebrow">ONE PHOTOGRAPH</span>
      </div>

      <div style={{ marginTop: 22 }}>
        <ArrowLink onClick={release} disabled={!ready}>release it</ArrowLink>
      </div>
      {released > 0 && (
        <Help small dim style={{ marginTop: 10 }}>
          {released === 1 ? 'One point of yours is up there.' : `${released} points of yours are up there.`}
        </Help>
      )}

      <Rule style={{ margin: '44px 0 28px' }} />

      <Eyebrow>WHEN IT IS MUTUAL</Eyebrow>
      <div style={{ marginTop: 20 }}>
        {revealed ? (
          <>
            <div className="beta-pair beta-turn">
              <Paper letter={pair.mine} seal="You always folded the corner of page one." sealLifting compact />
              <Paper letter={pair.theirs} seal="Third row, aisle, always." sealLifting compact />
            </div>
            <Display as="p" size={34} style={{ marginTop: 26 }}>You were both looking.</Display>
            <div className="beta-mono" style={{ marginTop: 16, color: 'var(--ash)' }}>
              {atHandle(pair.theirs.targetHandle)} &nbsp;·&nbsp; {atHandle(pair.mine.targetHandle)}
            </div>
          </>
        ) : (
          <>
            <Help small>
              Two sealed cards, face down. If you both placed one they turn over at the same
              moment, and neither of you went first.
            </Help>
            <div style={{ marginTop: 20 }}>
              <ArrowLink onClick={() => setRevealed(true)} tone="secondary">show me</ArrowLink>
            </div>
          </>
        )}
      </div>

      <Rule style={{ margin: '44px 0 28px' }} />

      <Eyebrow>YOUR LETTERS</Eyebrow>
      <Help style={{ marginTop: 18 }}>Someone found the letter you wrote.</Help>
      <Help small dim style={{ marginTop: 8 }}>They asked who it was from. You have not answered.</Help>

      <div className="beta-push" style={{ minHeight: 56 }} />
    </div>
  )
}

// ── /berkeley/reveal/:handle — IT'S MUTUAL ──────────────────────────────────
//
// The screen the whole product exists to reach. Two people each put the
// other's name down without knowing the other had, and this is where each of
// them is told, on the same phone the letters are written on, that the other
// did.
//
// It was Main's (/reveal), in the room's language: a liquid metal seal, the
// sentence in the serif, two chalk cards. It is a sheet on the wall now, and
// the wall is the phone (DESIGN.md 2.6), so it is told the way the intro and
// the door tell the mechanic: on a letter's screen, the night one, in the black
// room a letter is read in.
//
// ── the order is the meaning ────────────────────────────────────────────────
//
//   1  the story         the two of them, named in the status row, run in
//                        from either edge of the glass, meet, and become the
//                        mark (pixmark.js `revealStory`). The screen is the
//                        one lit thing in the room.
//   2  the sentence      "it's mutual." typed out under it from the frame
//                        they touch, a character at a time, with the phone's
//                        caret after it. Exactly those words: no congratulations,
//                        no match (VOICE.md 2).
//   3  the two lines     what each of them wrote, on the phone's unlit
//                        panels, rising TOGETHER, never one before the other.
//                        A stagger would say one of them mattered more, and
//                        the whole premise is that neither did. Each side
//                        carries its own time and nothing carries the pair's:
//                        the server hands this person their own, so theirs is
//                        dated and the other is not.
//   4  the way on        `open @them`, the lit key, and a quiet way out that
//                        closes onto the wall and says nothing to anybody.
//
// A tap anywhere that is not a control lands the whole thing, and under
// reduced motion it is drawn landed. The screen reader hears the same four
// facts in order, from a line nobody sees.
//
// ── where the facts come from ───────────────────────────────────────────────
// Who this is, off the server's row (main/data.js `me`), and the handle the
// ping sheet and the account sheet place and read under (pings.js
// `myHandle`) where the row has none, so the three sheets agree about whose
// mutual this is. Then the pings this person has standing and which of them
// came back (`celestual_my_pings`, checked on the server against the proof
// this browser holds), and a copy of that answer held for a couple of
// minutes, so a tap on a mutual lands on a drawn screen and not a bare one
// while the server is asked again. A read that fails does not unsay a mutual
// already in hand.
//
// ── and when there is nothing to show ───────────────────────────────────────
// "nothing here." is said the same way whatever the reason, and its one key
// is the account sheet (screens/You.jsx), which is where each reason has its
// own words and its own way on: a proof this browser does not hold, one the
// server no longer takes, or no @ at all.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sheet, SheetHead, SheetFoot, Display, Pill, CloseQuiet, Who, useProfile } from '../parts.jsx'
import { Screen, Wait } from '../screen.jsx'
import PixelStory, { SQUARE } from '../PixelStory.jsx'
import { revealStory } from '../pixmark.js'
import { normHandle, atHandle } from '../data.js'
import { heldProof } from '../auth.js'
import { href } from '../router.js'
import { getSession } from '../../api/auth.js'
import { me } from '../../main/data.js'
import { myHandle, myPings, heldPings, sinceAgo } from '../pings.js'

// The mutual this address names, out of an answer already in hand. Null when
// there is none to read, which is not the same as "not a mutual".
function fromHeld(handle, them) {
  if (!handle || !them) return null
  const held = heldPings(handle)
  if (!held) return null
  return held.mutuals.find((m) => normHandle(m.to) === them) || null
}

// Who this browser is before the server has said: the handle its own proof
// is for, which is enough to read a held copy on the first frame.
function guessHandle() {
  const s = getSession()
  return s && s.handle ? normHandle(s.handle) : ''
}

const SAY = 'it’s mutual.'
const STORY = revealStory(250)
// the sentence from the frame they touch, a character every 70ms, which is
// how fast the phone put a message on its screen
const SAY_AT = STORY.times.touch
const TYPE_MS = 70
// the two lines once the mark has formed, and the way on a beat after
const PAIR_AT = STORY.times.done
const FOOT_AT = PAIR_AT + 360

const LOOK = { tint: 'night' }
const NO_KEYS = {}

// One side of it: the person, and what they wrote, on an unlit panel.
function Side({ handle, line, meta }) {
  return (
    <article className="wl-reveal-side">
      <Who handle={handle} size={30} meta={meta} />
      {line ? <p className="wl-reveal-line">{line}</p> : null}
    </article>
  )
}

function Mutual({ mine, them, mutual, reduce }) {
  const [landed, setLanded] = useState(!!reduce)
  const [typed, setTyped] = useState(reduce ? SAY.length : 0)
  const [stage, setStage] = useState(reduce ? 2 : 0)
  const t0 = useRef(performance.now()).current
  const timers = useRef([])
  const theirs = useProfile(them)

  useEffect(() => {
    if (landed) return undefined
    const at = (ms, fn) => timers.current.push(setTimeout(fn, Math.max(0, ms - (performance.now() - t0))))
    for (let i = 1; i <= SAY.length; i++) at(SAY_AT + i * TYPE_MS, () => setTyped(i))
    at(PAIR_AT, () => setStage(1))
    at(FOOT_AT, () => setStage(2))
    const all = timers.current
    return () => all.forEach(clearTimeout)
  }, [landed, t0])

  const land = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setLanded(true)
    setTyped(SAY.length)
    setStage(2)
  }, [])

  // a tap on the room, or a key, lands it; a press on a control is that
  // control's, and Escape is the sheet's way out
  useEffect(() => {
    if (landed) return undefined
    const onKey = (e) => { if (e.key !== 'Escape') land() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [landed, land])
  const onPress = (e) => { if (!landed && !e.target.closest('a, button')) land() }

  // Each side carries its own time and nothing carries the pair's
  // (celestual_my_pings hands this person their own and not the other's).
  const ago = sinceAgo(mutual.at)

  return (
    <div className={`wl-reveal-in is-at${stage}${landed ? ' is-landed' : ''}`} onPointerDown={onPress}>
      <div className="wl-reveal-card" aria-hidden="true">
        <Screen
          look={LOOK} seed={`mutual:${mine}:${them}`} top={{ name: atHandle(mine), handle: atHandle(them) }}
          keys={NO_KEYS} live={false} state={landed && reduce ? '' : 'waking'}
          className="wl-reveal-scr is-pair" style={SQUARE}
        >
          <PixelStory story={STORY} at={landed ? STORY.end : null} from={t0} />
        </Screen>
      </div>

      {/* The sentence, typed. What a screen reader hears is the sentence
          whole; what is seen is each character arriving on the phone's beat,
          laid out from the first frame so the line never moves as it fills,
          and the caret after the last one in. */}
      <Display size="l" as="h2" id="wl-reveal-h" className="wl-reveal-say">
        <span className="wl-sr">{SAY}</span>
        <span aria-hidden="true">
          {SAY.slice(0, typed)}
          <span className="wl-reveal-cur" />
          <span className="wl-reveal-rest">{SAY.slice(typed)}</span>
        </span>
      </Display>

      {/* Together, not staggered. See the note at the top of this file. */}
      <div className="wl-reveal-pair">
        <Side handle={mine} line={mutual.line} meta={ago ? `you, ${ago}` : 'you'} />
        <Side handle={them} line={mutual.theirLine} meta="them" />
      </div>

      <div className="wl-push" />

      <SheetFoot className="wl-reveal-foot">
        <p className="wl-reveal-mech">the rest is yours. celestual&#8217;s part is done.</p>
        <Pill tone="light" wide href={`https://instagram.com/${them}`} rel="noreferrer noopener" target="_blank">
          open {atHandle(them)}
        </Pill>
        <CloseQuiet>keep this to yourself</CloseQuiet>
      </SheetFoot>

      {/* the same facts, in the order they matter, for a reader that never
          sees the composition above */}
      <p className="wl-sr">
        it&#8217;s mutual with {theirs?.name ? `${theirs.name}, ${atHandle(them)}` : atHandle(them)}
        {theirs?.verified ? ', verified on Instagram' : ''}.
        {ago ? ` you placed yours ${ago}.` : ''}
      </p>
    </div>
  )
}

export default function Reveal({ id, go, up, back, upLabel = 'back to the wall', reduce, toWall = null }) {
  const them = normHandle(id)
  // who this is: null until the server has said, then the row (main/data.js)
  const [who, setWho] = useState(null)
  const [mutual, setMutual] = useState(() => fromHeld(guessHandle(), them) || undefined)

  useEffect(() => {
    let alive = true
    me().then((u) => { if (alive) setWho(u) })
    return () => { alive = false }
  }, [])

  const handle = !who ? ''
    : who.handleVerified && who.handle ? normHandle(who.handle)
    : myHandle()
  // The mutual itself, off the same RPC the list of pings reads. Asked here
  // as well so a shared or reloaded address lands on the screen, and so a
  // copy held from a moment ago is checked against the row. Nothing is said
  // until whoami has answered.
  useEffect(() => {
    if (!who) return undefined
    if (!handle || !them) { setMutual(null); return undefined }
    let alive = true
    const held = fromHeld(handle, them)
    setMutual(held || undefined)
    myPings({ handle, proof: heldProof(handle) }).then((out) => {
      if (!alive) return
      if (!out.ok && held) return
      setMutual(out.mutuals.find((m) => normHandle(m.to) === them) || null)
    })
    return () => { alive = false }
  }, [who, handle, them])

  // The quiet way out closes onto the wall, whatever the sheet was opened
  // from, and onto its names: a link that brought somebody here before the
  // wall was ever opened has its poster still up under the sheet, and it is
  // dropped as the sheet starts to go (index.jsx `toWall`), as the ping's
  // own way back does. The close mark, the scrim and Escape go back one
  // step, as every sheet's do.
  const way = useRef('')
  const onClosing = useCallback((by) => {
    way.current = by
    if (by === 'quiet' && toWall) toWall()
  }, [toWall])
  const onClose = useCallback(() => (way.current === 'quiet' ? back() : up()), [back, up])
  // Nothing to show, and the account sheet is where the reason is. A reveal
  // the browser opened on directly has nothing behind it, so its entry is
  // given to the wall first, as the door gives its own (Join.jsx `place`),
  // and the account sheet closes onto the names and not back onto this.
  const toYou = useCallback(() => {
    if (!window.history.state?.wallPushed) {
      window.history.replaceState({ ...window.history.state, wall: 'wall', wallDepth: 0 }, '', href('wall'))
    }
    go('you')
  }, [go])
  const mine = handle || guessHandle()

  return (
    <Sheet onClose={onClose} onClosing={onClosing} labelledBy="wl-reveal-h" className="is-reveal">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={up} label={upLabel} />
        {mutual === undefined ? (
          // asked, and not answered yet: the phone's hourglass, and nothing
          // said about it
          <div className="wl-reveal-wait">
            <h2 id="wl-reveal-h" className="wl-sr">it&#8217;s mutual</h2>
            <Wait scale={3} />
          </div>
        ) : mutual === null ? (
          // Not a mutual, or not this person's to see. Said flatly and
          // without a reason, because every reason this screen could give is
          // a fact about somebody else. The one key is this person's own
          // pings, where whatever is theirs to know is said.
          <div className="wl-reveal-none">
            <Display size="l" as="h2" id="wl-reveal-h">nothing here.</Display>
            <div className="wl-push" />
            <SheetFoot>
              <Pill tone="light" wide onClick={toYou}>your pings</Pill>
            </SheetFoot>
          </div>
        ) : (
          <Mutual mine={mine} them={them} mutual={mutual} reduce={reduce} />
        )}
      </div>
    </Sheet>
  )
}

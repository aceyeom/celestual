// ── /berkeley/ping, and /ping: PLACING A PING ───────────────────────────────
//
// The ping used to be a second product behind the wall's one door: a tab, a
// page explaining the tab, and then a full navigation out of the wall into
// Main's own flow at /place, drawn in the room's paper and metal, which ended
// on a screen with nothing on it that led back. A person who had just written
// to somebody walked out of the phone to ask the one question the letter had
// left them carrying, and never came back to where they had asked it.
//
// It is a sheet on the wall now, raised over the names like the composer and
// built out of the composer's own parts, so it is visibly the same phone: the
// black room, the step dots, the field in its body with the answer standing in
// the field's place, and then the screen itself, lit, with the line on it.
// When it is out the sheet goes, and the person is back on the wall they
// raised it over.
//
//     who     "who is it for?" The people this person has written to, each
//             in one press, with what their note is doing if there is one,
//             or that it is mutual and a note to them is a new one; or a new
//             @, typed, with the wall's own names under the field and the
//             resolver's answer standing where the field was.
//     line    the ping's own screen: a line they read if it is ever mutual,
//             and never otherwise. As long as a letter at most, and none at
//             all is a ping too.
//     proof   only when this person has no @ the server can vouch for: the
//             Instagram DM, the same door the gate draws. It is asked last,
//             once the person knows what for. A person who claimed their @
//             once, anywhere, and is signed in here by any proof, never sees
//             it: the proof comes back to this device from the server
//             (auth.js `restoreProof`, migration 0065).
//     done    "sent privately." and the saturday it reveals on, and nothing
//             else.
//
// ── somebody this person is already mutual with ─────────────────────────────
// Choosing a mutual, from the list or the field or a link, used to open the
// reveal instead of a screen, since a placement on a told pair wrote nothing
// and a mutual could never be written to again. Since 0072 a mutual is kept,
// on both lists, as it was told, and the owner asked that a person be able
// to write to that somebody again. So the sheet asks its list the two
// questions a handle has now (pings.js `liveOf`, `mutualOf`), and somebody
// this person is mutual with and has no note running on is the again mode:
// their screen, for a NEW note, under "write them a new note. they only read
// it if they send one too.", one line under it saying the mutual stays theirs
// to keep, and a quiet key that opens it. It spends a ping like any new note
// and goes out through `placeAgain`, since `place` on a mutual answers as the
// mutual and writes nothing, and it ends on the same "sent privately." A
// mutual with a note running beside it is only that note, and a running note
// is its own settings however its person was reached (below).
//
// The quiet key keeps the words on the screen for the way back (`AWAY`),
// which finds them by the person in the sheet's address, put there as they
// are chosen however they were reached (`choose`), and a sheet the mutual
// itself raised (the keepsake's "send … a new note") steps back down onto it
// rather than stacking a second telling over the first, where the browser
// can say what stands under this sheet (the Navigation API; where it cannot,
// a second one opens, and back unwinds both). The words were lost there, and
// the mutual stacked on itself, until the review of 28 September.
//
// ── the face it is written on (0073) ─────────────────────────────────────────
// The owner, 29 September: the line across the top of a private note and its
// battery are the writer's to set. The line is the composer's greeting
// (screen.jsx `Greet`, as screens/Write.jsx draws it): `dear` and their first
// name, or their @, until the writer changes it, forty characters, with the
// dotted line under it that says it is theirs. The battery is a key on the
// status row (screen.jsx `onBat`): each press takes a bar off, the empty one
// blinks as the phone's did, and the next comes round to full; it starts
// full. Neither is explained: the first time a note is written on a device
// one line under the screen says both are the writer's to set, and the first
// touch of either puts it away (store.js `faceSeen`).
//
// The face is kept with the note (pings.js `placing`, `card.greet` and
// `card.bat`) and goes wherever the words go: through the proof's pending
// record, a note waiting on pings, the words kept while the mutual is open,
// and a note's settings, which open on the face the note has. The server
// replaces a card whole, so every send with words carries the face, and a
// note with no words has none. The line is read at the keyboard by the list
// the words are read by (moderate.js `fault`), on its own and with the words,
// and a caught one refuses the send and puts the typing back in it; the
// server leaves a caught line off rather than refusing, so this is where the
// writer hears of it. A running note whose face alone is changed is sent as
// "the change", never as new words, and costs nothing, as new words never did.
//
// ── what this sheet never does ──────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have placed one on anybody, or whether anybody has placed one on them.
// The only pings it speaks about are this person's own, read with this
// person's own proof: a mutual it names is one on their own list. And it
// never announces a mutual on the way out, even when the placing made one:
// the reveal is its own sheet, and landing on it through a line of text on a
// confirmation would be the one lie this product could tell about its own
// mechanic. Writing again to a mutual tells the other person nothing either:
// to them the mutual is what it was, and the new note is sealed like any.
//
// The names under the field come from the wall's public index and from
// nowhere else (parts.jsx `useSuggest`), never from the resolver's cache,
// which is the list of everybody ever pinged.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, Display, Label, Pill, HandleField, Addressed, Light, Who, DmCode, VerifyHead,
  DoorHead, DoorFoot, useResolver, confirmWord, useSuggest, Suggest, useProfile,
} from '../parts.jsx'
import { Screen, ScreenDraft, ScreenNote, RoomLight } from '../screen.jsx'
import { Dots, Ecliptic, Provider } from '../art.jsx'
import { normHandle, validHandle, atHandle, loadMine } from '../data.js'
import { href } from '../router.js'
import { colourOf, stampOf } from '../looks.js'
import { heldProof, refresh } from '../auth.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../handoff.js'
import { signOut as dropProof } from '../../api/auth.js'
import { cardStep } from '../seed.js'
import { fault, phoneAcross } from '../moderate.js'
import { getState, patch } from '../store.js'
import {
  myHandle, canPlace, readyToPlace, myPings, heldPings, forgetPings, place, placeAgain, release, liveOf, mutualOf,
  writtenTo, stateWords, endsWords, nextReveal, heldAllowance, loadAllowance, pingWords, waitForPings, waitingNote, dropWaiting,
} from '../pings.js'
import { BuyPings } from './Pings.jsx'
// the greeting's field on the screen (screen.jsx `Greet`) is drawn by the
// composer's sheet, which this one has not always been opened after
import '../post.css'

// The card's own ceilings, which are the server's (celestual_card_clean):
// eighty words and 280 characters since 0063, when a note sent privately
// became as long as a letter on the wall. They were twenty words and a
// hundred and forty characters here after the server had moved, so the same
// private note had one ceiling from the composer's "send privately" and
// another from this sheet, and the refusal on the floor quoted a rule that
// no longer existed. There is no floor. A ping with no line on it is a ping,
// and the server has always taken one.
const MAX_WORDS = 80
const MAX_LINE = 280
// and the line across the top's: forty characters, as a letter's greeting
// (0073, and screens/Write.jsx `MAX_GREET`)
const MAX_GREET = 40
// the example on the empty screen, which is a line and not an instruction
const EXAMPLE = 'i have wanted to say this since the second week of term.'
// How many of the people written to are listed before the rest are behind
// one line, as the account sheet lists its letters.
const SHOWN = 4

// What the sheet says when it cannot go on, on the one line under the field
// or the screen: in the world, naming what happened, and the one next step
// (VOICE.md 5). Keyed, so the foot can tell the full slots apart from the
// rest and offer the way to them.
const SAY = {
  self: 'that is your own @',
  full: 'ten private notes in one week is the most. the next week starts after saturday’s reveal.',
  suppressed: 'that person has opted out of private notes.',
  rate: 'that is a lot of new private notes for now. try again later.',
  invalid: 'that handle does not look right.',
  night: 'it did not go through. give it a moment, then send it again.',
  // the card is read by the same list as a letter (0063): a link, an
  // address, a number or a slur, and nothing is placed
  card: 'that can’t go in a note as it is. take out links, addresses and numbers.',
  // and the line across the top, read by the same list at the keyboard, on
  // its own and with the words (a number split between them is a number);
  // the server leaves a caught one off rather than refusing (0073), so it
  // is refused here, where the writer can change it
  greet: 'the greeting can’t go in a note as it is. take out links, addresses and numbers.',
  // a note let go from its settings, when the letting go did not go through
  let: 'it did not go through. give it a moment, then try again.',
}

// The line under the screen saying the face is the writer's takes a line's
// height from the screen, which a window under 661 pixels tall has no more of
// to give (wall.css `.has-tip` stops at its least width there), so on the
// shortest phones it is not drawn and the lit key stays in view; the dotted
// lines under the greeting and the battery still say they are theirs
function tipFits() {
  try { return !window.matchMedia('(max-height: 660px)').matches } catch { return true }
}

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean)
}

// The face a note came back with, off whichever of the records that hold one
// (the proof's pending record, a note's settings, a note that waited on
// pings, the words kept while the mutual was open) holds its words, and
// otherwise the first there is: its line, or null to follow the name, and its
// battery, or a full one.
function faceOf(from) {
  const at = from.find((x) => x && x.line) || from.find(Boolean) || null
  return {
    greet: at && typeof at.greet === 'string' && at.greet ? at.greet.slice(0, MAX_GREET) : null,
    bat: at && Number.isInteger(at.bat) && at.bat >= 0 && at.bat <= 4 ? at.bat : 4,
  }
}
// what the line across the top goes out as: its spaces closed, as the server
// closes them (celestual_card_clean), and nothing while it follows the name
function greetOf(g) {
  return typeof g === 'string' ? g.replace(/\s+/g, ' ').trim().slice(0, MAX_GREET) : ''
}

// ── the proof's pending record ──────────────────────────────────────────────
// Opening Instagram leaves this page, and on a phone that often reloads or
// evicts it. The code, the proof, the name and the line all live in React
// memory, so without this the person comes back to an empty sheet while the
// DM they just sent is sitting against a verification nothing is watching any
// more. One record in one slot (api/igverify.js), filed under the use that
// minted it, so the gate never resumes a code minted here or the other way
// round. It lapses with the code (thirty minutes, 0018) and is cleared the
// moment it verifies, lapses or is abandoned.
function pending(use) {
  const p = loadPending()
  return p && p.use === use ? p : null
}
function clearOurs(use) {
  if (pending(use)) clearPending()
}

// A live code is resumed only for the ping it was minted for: somebody who
// follows a link to another person while an old code is still out is placing
// a different ping, and the address they arrived at wins.
// ── a note's settings ───────────────────────────────────────────────────────
// A note's own row on the account (screens/You.jsx) carries an edit key, and
// its screen a menu row, that open this sheet on that note with the words it
// has: not a new note to somebody, but the one that is out, and the sheet
// says so. Its heading says the note is being changed, and its lit key what
// happens to the words: a running note's change in place, the same pair and
// the same week, and cost nothing (0069 keeps them until the reveal and not
// after); a note that was not this time goes out again with them, on a ping,
// and meets the paywall as any send would. The quiet key under it lets the
// note go, asked once on the phone's own screen in the words the note's own
// screen asks it in, and closes back onto the private notes. The dots do not
// go back to who it is for, since the note is to one person. Until 28
// September this was only the words, sent again as if the note were new, and
// letting one go was on another screen; the owner asked for one place where
// a note is changed or taken down. Held for the one mount it is for.
//
// With the note as the screen that opened it drew it (`note`, the ping
// itself, optional), so the first frame knows which of the two it is before
// the list has come; the list, once it has, is the word on it. Opened with
// neither, the sheet says nothing it cannot know: "change your note. they
// only read it if it's mutual.", no date, no cost, and the key unlit until
// the list says which. Until the review of 28 September it took the note to
// be running, and a lapsed one opened after the held list had gone (pings.js
// `heldPings`) was told "it stays sealed till saturday" and "new words cost
// nothing" over a send that spent a ping.
//
// A running note reached any other way (the list of people written to, the
// field, a link, the keepsake's "send … a new note") is the same settings,
// since it is the same note and the owner asked for one place to change it:
// until that review it was drawn as a new one to them, "write them a note."
// and "send it privately", over words that only ever changed in place. It
// keeps the dot back to who it is for, since they were chosen from among
// others there, and a note let go from it closes the sheet onto whatever it
// was raised over.
//
// The note comes with its face (0073): the line across its top and the
// battery it was left on, which its writer set on this screen and changes
// here as they change the words. A note from before, or one left as it came,
// has neither, and the screen draws `dear` and the name and a full battery.
let EDIT = null
export function editNote(go, to, line, note = null) {
  const words = String(line || '')
  const greet = note && typeof note.greet === 'string' ? note.greet : ''
  const bat = note && Number.isInteger(note.bat) ? note.bat : null
  EDIT = {
    to: normHandle(to), line: words, greet, bat,
    note: note && note.state !== 'mutual'
      ? { to: normHandle(to), key: note.key || '', state: note.state, expires: note.expires || 0, at: note.at || 0, line: words, greet, bat }
      : null,
  }
  go('ping', to)
}
function takeEdit(prefill) {
  const e = EDIT
  EDIT = null
  return e && e.to === normHandle(prefill) ? e : null
}
// And the way back: a note's settings closed onto the private notes (sent,
// "your private notes", let go) say which row's note they were, so the
// account puts the focus back on that row's `edit` (screens/You.jsx), or on
// the frame's title when the row has gone. Fresh for as long as a press is,
// as the mutual's way back is (revealfrom.js `takeReturn`), so a sheet that
// closed somewhere else leaves nothing for the next time the account opens.
let NOTE_BACK = null
export function takeNoteBack() {
  const b = NOTE_BACK
  NOTE_BACK = null
  return b && performance.now() - b.at <= 1500 ? b.key : ''
}
// the words on a new note to a mutual, and the face they are on, kept while
// the mutual is open over them, for the one mount after it
let AWAY = null
function takeAway(prefill) {
  const a = AWAY
  AWAY = null
  return a && a.to === normHandle(prefill) ? a : null
}
// The address of the entry under this one, where the browser can say (the
// Navigation API), and '' where it cannot or the entry is not the wall's.
function underThis() {
  try {
    const nav = window.navigation
    const at = nav && nav.currentEntry ? nav.currentEntry.index : -1
    const e = at > 0 ? nav.entries()[at - 1] : null
    return e && e.url ? new URL(e.url).pathname.replace(/\/+$/, '') : ''
  } catch {
    return ''
  }
}

function resume(prefill) {
  const p = pending('ping')
  if (!p || !p.to) return null
  if (prefill && normHandle(p.to) !== normHandle(prefill)) return null
  return p
}

// ── THE PROOF ───────────────────────────────────────────────────────────────
// The one thing a ping needs that a letter does not: that the @ it is placed
// under is the person placing it. The Instagram DM code, run the way the gate
// runs it (screens/Gate.jsx): the code is minted against the handle typed, the
// person DMs it, and whoever DMs it is the identity (0012). A handle on the
// desk's pass list (0043) is proved on the spot and no code is drawn.
//
// A hook and a door, like the suggestions (parts.jsx `useSuggest`, `Suggest`),
// because two sheets ask it: this one, before a ping goes out, and the
// account sheet, which has nothing to show a person whose @ is not proved.
// `stash` rides on the pending record, so a reload on the way back from
// Instagram resumes what was on the glass; `onLanded` is told who DMd, who
// was asked for, and the proof.
export function useProve({ use, held = null, stash = null, onLanded }) {
  const [mine, setMine] = useState(() => held?.mine || myHandle())
  const [dm, setDm] = useState(held)
  // what the last DM to arrive said, when it was not the code (0041)
  const [note, setNote] = useState('')
  // a code is being minted: Enter held down or a double tap would otherwise
  // start two, and spend two of the handle's eight starts an hour (0018)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const landed = useRef(onLanded)
  landed.current = onLanded
  const me = normHandle(mine)
  const key = stash ? JSON.stringify(stash) : ''

  // the record kept current with what is on the glass
  useEffect(() => {
    if (dm && key) savePending({ ...dm, ...JSON.parse(key) })
  }, [dm, key])

  const drop = useCallback(() => { clearOurs(use); setDm(null); setNote('') }, [use])

  const ask = async (clash = '') => {
    if (dm || busy) return
    setSaid('')
    setNote('')
    if (!validHandle(me)) { setSaid('that handle does not look right'); return }
    if (clash && me === normHandle(clash)) { setSaid('that is the person you are sending it to'); return }
    setBusy(true)
    const out = await startHandoff(me)
    if (!alive.current) return
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'off' ? 'Instagram checks are off right now. try again later.'
          : out.error === 'banned' ? 'that @ has opted out of celestual.'
          : out.error === 'rate_limited' ? 'too many tries on that @. try again in an hour.'
          : 'it did not go through. try again.',
      )
      return
    }
    if (out.passed) { landed.current(normHandle(out.handle), me, out.proof); return }
    const rec = { ...out, use, mine: me, ...(stash || {}) }
    savePending(rec)
    setDm(rec)
  }

  useEffect(() => {
    if (!dm) return undefined
    let stop = false
    let polling = false
    let timer = 0
    // `polling` because two things drive this: the beat, and coming back to
    // the tab. Both firing at once asks the same question twice and can spend
    // the same verification twice.
    const tick = async () => {
      if (stop || polling) return
      polling = true
      const out = await pollHandoff(dm)
      polling = false
      if (stop || !alive.current) return
      if (out.ok) {
        // Stopped by the local flag and not by clearing `dm` first: clearing
        // it re-renders, the re-render tears this effect down, and the
        // teardown during the await below would call the landing off.
        stop = true
        clearTimeout(timer)
        clearOurs(use)
        setDm(null)
        setNote('')
        landed.current(normHandle(out.handle), normHandle(dm.mine), dm.proof)
        return
      }
      if (out.error === 'expired') { drop(); setSaid('that code has lapsed. ask for a new one.'); return }
      if (out.error) { drop(); setSaid('that did not go through. try again.'); return }
      if (out.note) setNote(out.note)
      timer = setTimeout(tick, 2500)
    }
    timer = setTimeout(tick, 2500)
    // Coming back from Instagram checks at once rather than up to a beat late,
    // and a background-throttled interval cannot strand the wait.
    const onReturn = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [dm]) // eslint-disable-line react-hooks/exhaustive-deps

  return { mine, setMine, me, dm, note, busy, said, setSaid, ask, drop }
}

// The door itself: the gate's shape exactly (DESIGN.md 8.5, every sign in on
// one shape), because proving an @ here is the same act as proving it there.
// The mark and the line that says what is asked, the field, and the one key;
// then, once a code is out, the one heading every screen sets over a code
// (`VerifyHead`) and the code.
export function ProveDoor({ p, headId, title, say, onAsk }) {
  return (
    <div className="wl-door">
      {p.dm ? (
        <div className="wl-door-head">
          <Ecliptic size={38} className="wl-door-mark" />
          <VerifyHead size="s" as="h2" id={headId} className="wl-door-title" />
        </div>
      ) : (
        <DoorHead id={headId} title={title} say={say} />
      )}
      <div className="wl-door-ways">
        {p.dm ? (
          <DmCode
            code={p.dm.code}
            status={p.note === 'wrong_code' ? 'that code didn’t match. send this one.'
              : p.note === 'expired_code' ? 'that code had lapsed. send this one.'
              : ''}
          />
        ) : (
          <>
            <HandleField
              value={p.mine} onChange={(v) => { p.setMine(v); p.setSaid('') }} onSubmit={onAsk}
              autoFocus centred size="lg" placeholder="yourhandle" label="your instagram handle" busy={p.busy}
            />
            <Pill
              tone="light" wide onClick={onAsk} disabled={p.busy || !validHandle(p.me)}
              icon={<Provider size={17} />} aria-busy={p.busy || undefined}
            >
              {p.busy ? 'one moment' : 'confirm with one DM'}
            </Pill>
          </>
        )}
      </div>
      <div className="wl-gate-fault" aria-live="polite">{p.said}</div>
    </div>
  )
}

// ── the people written to ───────────────────────────────────────────────────
// The composer's list of names, at the field's scale and in its place, so the
// list that stands under an empty field and the one that replaces it as a
// name is typed are one object. Each row is one press, and every press is
// that person's screen: a person with nothing out, for a note; a note that
// is standing, its settings, carrying its line, which changes in place to
// its reveal; and somebody this person is mutual with and has nothing
// running on, for a new note, which the row says (`rowOf`). That last one
// opened the reveal, until 0072 kept mutuals.
function Written({ people, rowOf, onPick }) {
  const [more, setMore] = useState(false)
  const [lit, setLit] = useState(-1)
  const cut = !more && people.length > SHOWN
  const shown = cut ? people.slice(0, SHOWN) : people
  return (
    <div className="wl-suggest wl-ping-wrote" role="group" aria-labelledby="wl-ping-wrote-lab">
      <Label as="span" tone="dim" className="wl-suggest-lab" id="wl-ping-wrote-lab">written to</Label>
      {shown.map((h, i) => {
        const r = rowOf(h)
        return (
          <button
            type="button" key={h}
            className={`wl-suggest-row${i === lit ? ' is-active' : ''}${r.news ? ' is-mutual' : ''}`}
            onClick={() => onPick(h)}
            onPointerEnter={() => setLit(i)} onPointerLeave={() => setLit(-1)}
            onFocus={() => setLit(i)} onBlur={() => setLit(-1)}
          >
            <Who handle={h} size={34} meta={r.meta || null} className="wl-suggest-who" />
          </button>
        )
      })}
      {cut ? (
        <button type="button" className="wl-quiet wl-ping-more" onClick={() => setMore(true)}>see more</button>
      ) : null}
    </div>
  )
}

export default function Ping({
  to: prefill = '', go, back, up = back, nested = false, upLabel = 'back to the wall', reduce = false, toWall = null,
}) {
  const pre = normHandle(prefill)
  const own = myHandle()
  const [held] = useState(() => resume(pre))
  // the note whose settings this is (`editNote`), until "send another"
  // turns the sheet to a note to somebody else
  const [edit, setEdit] = useState(() => takeEdit(pre))
  // the phone asking whether to let that note go, on its own screen
  const [ask, setAsk] = useState(false)
  // a note that waited on pings and was not sent (pings.js `waitForPings`):
  // opened again on its person, it has its words back
  const [kept] = useState(() => { const w = waitingNote(); return w && w.kind === 'send' && w.to === pre ? w : null })
  // and a new note to a mutual left for the mutual a moment ago (`AWAY`)
  const [away] = useState(() => takeAway(pre))
  const [to, setTo] = useState(() => held?.to || pre)
  const [line, setLine] = useState(() => held?.line || edit?.line || kept?.line || away?.line || '')
  // The face the words are written on (0073), which comes back with them
  // from wherever they came back from: the line across the top as its writer
  // set it, or null while it follows the name (`dear` and their first name,
  // or their @), and the battery, 0 to 4, full until it is pressed. Both are
  // kept with the note and read by the other person if it is ever mutual.
  const [greet, setGreet] = useState(() => faceOf([held, edit, kept, away]).greet)
  const [bat, setBat] = useState(() => faceOf([held, edit, kept, away]).bat)
  // which half of the face was touched on this person's screen, each on its
  // own, so the list arriving late puts a note's old line and battery on the
  // screen with its words except the half being set; a battery pressed does
  // not keep the note's own line off it, and the words then go out with the
  // line they had. Back to nothing when the person changes
  const faced = useRef({ greet: false, bat: false })
  // the greeting is where the typing is: the right key takes a character
  // back from it, and there is something there to take
  const [atGreet, setAtGreet] = useState(false)
  const greetRef = useRef(null)
  // the line under the screen saying the face is the writer's, until either
  // half of it is touched once on this device (store.js `faceSeen`); and
  // whether this screen made room for it, which it keeps after the line has
  // gone, so the line fades where it stood and nothing under it moves
  const [hint, setHint] = useState(() => !getState().faceSeen)
  const [tipRoom, setTipRoom] = useState(() => !getState().faceSeen && tipFits())
  // whose note had its words put on the screen (`editNote`, or a name chosen
  // with a note out on it): a line cleared of them takes them off the note.
  // A line that was only ever empty sends no words, and keeps what was there
  const shown = useRef(edit?.line ? edit.to : '')
  // when the note that just went out reveals (0069), off the placement's answer
  const [ends, setEnds] = useState(0)
  // who · line · proof · buy · done. A link with a person in it opens on
  // that person's screen, and one with this person's own @ in it on the
  // field. `buy` is the paywall, raised in place of the send when this
  // week's pings are spent (screens/Pings.jsx), the note waiting behind it.
  const [step, setStep] = useState(() => (held ? 'proof' : validHandle(pre) && pre !== own ? 'line' : 'who'))
  // Whether the resolver's answer is standing WHERE THE FIELD WAS (parts.jsx
  // `Addressed`), as on the composer: set by the press that commits a handle,
  // taken back by the X on that row, dropped the moment the handle changes.
  const [settled, setSettled] = useState(false)
  const [asking, setAsking] = useState(false)
  const [said, setSaid] = useState(() => (pre && pre === own ? 'self' : ''))
  const [placing, setPlacing] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [dip, setDip] = useState('')
  // Set when the DM came from an account other than the one typed. The
  // webhook's answer is the identity (0012), so the choice is not whether to
  // believe it: it is whether to place THIS ping under that name, and that
  // is the person's to answer.
  const [adopted, setAdopted] = useState(null)
  // this person's own pings, from the last answer held and then the server
  const [pings, setPings] = useState(() => (own ? heldPings(own) : null))
  const [rev, setRev] = useState(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const field = useRef(null)
  const lineRef = useRef(null)
  // the sheet's own way out, taken by this screen once the ping is out, and
  // how the sheet said it was leaving. `notes` is back onto the private notes
  // a note's settings were opened from: one step up, which is that sheet, or
  // the account raised afresh when nothing stands under this one, or when
  // what stands under it is something else (the keepsake's "your new note
  // to …", where one step up was the keepsake under a key that said "your
  // private notes"). Where the browser cannot say what is under it, up.
  const sheet = useRef(null)
  const by = useRef('')
  const leave = () => {
    if (pinned && edit.note?.key) NOTE_BACK = { key: edit.note.key, at: performance.now() }
    if (by.current === 'sent') return back()
    if (by.current !== 'notes') return up()
    const under = nested ? underThis() : ''
    return !nested || (under && under !== href('you')) ? go('you') : up()
  }

  // ── the door, taken ──
  // The funnel step a card is judged on last (seed.js `cardStep`, 0047):
  // somebody went from the wall into the rest of the product. Once per
  // device, which the step keeps for itself. And the letters this person has
  // put up, which is who they have written to.
  useEffect(() => { cardStep('handoff'); loadMine() }, [])

  // ── what they have out ──
  // Read with their own proof, the one this browser holds or the one the
  // server gives back to the person it is signed in as (pings.js `myPings`),
  // so each person written to can say whether a ping of theirs is standing
  // on them. Read again when the @ arrives, since a sheet opened cold is
  // drawn before the shell has asked who this is.
  useEffect(() => {
    const me = myHandle()
    if (!me) return undefined
    let on = true
    myPings({ handle: me, proof: heldProof(me) }).then((out) => { if (on && out.ok) setPings(out) })
    return () => { on = false }
  }, [rev, own])
  // What each of the people written to says under their name. A handle can
  // carry a mutual and a note beside it since 0072, and a lookup that took
  // the first ping on the list for a handle drew whichever came first, so it
  // asks the two questions (pings.js `liveOf`, `mutualOf`): what the note on
  // them is doing, or, with a mutual and nothing running, that it is mutual
  // and a note to them is a new one, in chalk, as the news on the list.
  const rowOf = useCallback((x) => {
    const n = liveOf(pings, x)
    if (mutualOf(pings, x) && n?.state !== 'standing') return { meta: 'it’s mutual · write a new note', news: true }
    return { meta: stateWords(n), news: false }
  }, [pings])
  // the week's pings: what this device was last told, then the server's own
  // answer, asked again each time the note's screen comes up, so a ping
  // bought on another phone is not met with the paywall here
  const [weekNow, setWeekNow] = useState(() => heldAllowance(own))
  useEffect(() => {
    if (step !== 'line' || !own) return undefined
    let on = true
    loadAllowance(own).then((a) => { if (on && a) setWeekNow(a) })
    return () => { on = false }
  }, [step, own])

  const h = normHandle(to)
  const people = writtenTo(own)
  const typing = to.trim().length > 0
  const tooLong = words(line).length > MAX_WORDS
  const floor = tooLong ? `eighty words, and that is ${words(line).length}` : ''
  const ready = canPlace()
  const total = ready || adopted ? 2 : 3
  // whether the sheet was opened on this person's note (`editNote`), from
  // the private notes
  const pinned = !!edit && edit.to === h
  // what this person has on the one on the screen: their note, running or
  // not this time, off the list, or as the screen that opened its settings
  // drew it until the list comes; and whether the two are mutual. Opened on
  // a note, it is that note, by its key: a handle can have one that was not
  // this time beside one running, and `liveOf` answers the running one, so
  // a lapsed note's edit opened the running note's settings and sent the
  // lapsed words over it
  const mine = pinned && edit.note?.key && pings
    ? (Array.isArray(pings) ? pings : pings.pings || []).find((p) => p && p.key === edit.note.key) : null
  const live = mine || liveOf(pings, h) || (pinned && !pings ? edit.note : null)
  // the again mode: mutual, and no note of theirs running, so what goes out
  // is a new note (`placeAgain`), under words that say so
  const again = !!mutualOf(pings, h) && live?.state !== 'standing'
  // a note's settings, while the note is there: opened on it, or a note
  // running on the person chosen. A list read since that has no note of
  // theirs on them (let go on another phone; one gone mutual is the reveal's,
  // below) turns the sheet into a note to them, which is what is true
  const editing = pinned ? !pings || !!live : step !== 'who' && live?.state === 'standing'
  // and one opened on its note is to that one person: no way back to who
  const alone = pinned && editing
  // settings opened before the list, with nothing to say which note it is
  const unsure = editing && !live
  const gone = editing && live?.state === 'lapsed'
  // a running note's own words, unchanged, are not sent, and the key that
  // would send them is not lit; cleared, they come off the note. Its face is
  // part of it (0073): a new line across the top or the battery pressed is a
  // change as new words are, and goes with the words it is on. A note with
  // no words has no face to change, since the face goes only with words
  const was = live ? live.line || '' : pinned ? edit.line : ''
  const greetOut = greetOf(greet)
  const wasGreet = live ? live.greet || '' : pinned ? edit.greet || '' : ''
  const wasBat = live ? (Number.isInteger(live.bat) ? live.bat : 4) : pinned && Number.isInteger(edit.bat) ? edit.bat : 4
  const sameWords = line.trim() === was.trim()
  const sameFace = !line.trim() || (greetOut === wasGreet && bat === wasBat)
  const same = editing && !gone && sameWords && sameFace
  const bare = editing && !gone && !unsure && !line.trim() && !!was.trim()
  // only the face changed: the key and the words over the screen say a
  // change, never new words
  const faceOnly = editing && !gone && sameWords && !sameFace
  // The line across the top, read at the keyboard by the list the server
  // reads the words with (moderate.js `fault`), on its own, and then for a
  // phone number cut in two across it and the words (`phoneAcross`), which is
  // still a number; only the number, since an address or a room read across
  // the join is two sentences meeting, and the server reads each apart.
  // A caught line refuses the send here: the server would leave it off and
  // send the note without it (0073). The words alone are the server's to
  // refuse, as they always were (`card`), and are read here too, first
  const caught = greetOut && fault(greetOut) ? 'greet'
    : line.trim() && fault(line) ? 'card'
    : greetOut && line.trim() && phoneAcross(greetOut, line) ? 'greet'
    : ''
  // this week's pings, as the server last said them, and whether sending to
  // this person spends one: a note already running on them is only new
  // words, and a new note to a mutual is a new note
  const week = weekNow
  const spends = editing ? gone : live?.state !== 'standing'
  const noneLeft = !!(week && spends && week.left <= 0)

  // ── who ──
  const them = useResolver(to)
  const resolving = asking || settled
  const sug = useSuggest(to, {
    skip: step !== 'who' || resolving || (them.at.state === 'found' && them.at.handle === h),
    exclude: h,
    handles: true,
    onPick: (t) => { setTo(t.handle); setSettled(false); setSaid('') },
  })
  const retype = useCallback((v) => { setTo(v); setSettled(false); setSaid('') }, [])
  const retry = useCallback(() => {
    setSettled(false)
    requestAnimationFrame(() => {
      const el = field.current
      if (!el) return
      el.focus()
      const n = el.value.length
      try { el.setSelectionRange(n, n) } catch { /* not a text input */ }
    })
  }, [])

  // A person, chosen: their screen, carrying the line of the note of theirs
  // on them if there is one, running or not this time, and a running one's
  // screen is its settings. Somebody this person is mutual with is their
  // screen too, for a new note; it used to open onto the reveal, when a
  // mutual could not be written to again. The person goes into the sheet's
  // address as they are chosen (the reverse of "send another"), so a way back
  // to this sheet, from the mutual its quiet key opened, comes back on their
  // screen with its words (`AWAY`), where an address with nobody in it came
  // back on "who is it for?" with the words gone.
  const choose = (x) => {
    const k = normHandle(x)
    if (!validHandle(k)) return
    if (k === myHandle()) { setSaid('self'); return }
    const n = liveOf(pings, k)
    window.history.replaceState(window.history.state, '', window.location.pathname.replace(/\/ping(?:\/[^/]*)?$/, `/ping/${k}`))
    setTo(k)
    setSaid('')
    // somebody else's screen is not the one a face was being set on
    if (k !== h) faced.current = { greet: false, bat: false }
    if (n && n.line && !line.trim()) { setLine(n.line); shown.current = k; putFace(n, k !== h) }
    setStep('line')
  }
  // a note's face, put on the screen with its words: each half unless the
  // writer is setting it on this screen (`fresh` for a screen just chosen)
  const putFace = (n, fresh = false) => {
    if (fresh || !faced.current.greet) setGreet(n.greet || null)
    if (fresh || !faced.current.bat) setBat(Number.isInteger(n.bat) ? n.bat : 4)
  }
  // A link to somebody with a note of theirs on them opens on that screen
  // before the list has come, and put nothing on it, so the note's words
  // were changed blind, a new line over words nobody could see. They are
  // put there once the list says what they are, as a press on the row puts
  // them, unless something is written there already or they were taken off.
  // The face comes with them, as it does off the row.
  useEffect(() => {
    if (step !== 'line' || edit || line || shown.current === h) return
    const n = liveOf(pings, h)
    if (n && n.line) { setLine(n.line); shown.current = h; putFace(n) }
  }, [pings, h, step]) // eslint-disable-line react-hooks/exhaustive-deps
  // A note's settings whose note went mutual after the screen that opened
  // them drew it (its reveal came in between) are no note to change, and a
  // mutual is not told by a line under a screen: the reveal tells it, as it
  // always has, once, and the way back from it is their screen for a new
  // note. It turned quietly into that screen, the words meant for the old
  // note on it and "the mutual stays yours to keep." the first word of it.
  const told = useRef(false)
  useEffect(() => {
    if (told.current || !pinned || !pings || liveOf(pings, h) || !mutualOf(pings, h)) return
    told.current = true
    go('reveal', h)
  }, [pings, pinned, h, go])

  // ── the proof ──
  const proof = useProve({
    use: 'ping', held,
    // the words and their face, for a reload on the way back from Instagram
    stash: { to: h, line: line.trim(), greet, bat },
    onLanded: async (got, asked, spent) => {
      // the bar and the list learn the handle before the ping goes
      await refresh()
      if (!alive.current) return
      setRev((n) => n + 1)
      setStep('line')
      if (got && got !== asked) { setAdopted({ handle: got, proof: spent }); return }
      send(got || asked, spent)
    },
  })

  const shake = () => {
    if (reduce) return
    setShaking(true)
    try { if (navigator.vibrate) navigator.vibrate(24) } catch { /* not a phone */ }
  }

  // ── placing it ──
  // The proof is the DM flow's secret and celestual_submit consumes it
  // (celestual_consume_ig_proof, 0023): without it the RPC answers
  // 'unverified' and nothing is placed, and the sheet asks for the DM again
  // rather than saying "prove it again" over a screen with no way to.
  //
  // A new note to a mutual goes through `placeAgain`, and which it is comes
  // off the list as it is at the press, read first when the sheet was
  // pressed before it had one (or the note goes out under another @ than the
  // one it was read for): `place` on a mutual writes nothing and answers as
  // the mutual, so a guess would have said "sent privately." over nothing.
  // A list that cannot be read is not guessed at either: the read's own no
  // is the send's, the DM asked again for a proof refused and the line to
  // send it again for the rest.
  async function send(from, spent) {
    const me = normHandle(from)
    if (placing) return
    setPlacing(true)
    setSaid('')
    const proofNow = spent || heldProof(me)
    const list = (me === myHandle() && pings) || await myPings({ handle: me, proof: proofNow })
    if (!alive.current) return
    const anew = list.ok && !!mutualOf(list, h) && liveOf(list, h)?.state !== 'standing'
    // the face goes with the words, and only with them (pings.js `placing`)
    const out = !list.ok ? list : await (anew ? placeAgain : place)({
      me, them: h, proof: proofNow, words: line.trim() || (shown.current === h ? '' : undefined),
      greet: greetOut || undefined, bat,
    })
    if (!alive.current) return
    setPlacing(false)
    if (!out.ok) {
      if (out.error === 'unverified') {
        dropProof()
        setAdopted(null)
        setStep('proof')
        proof.setSaid('your Instagram check has lapsed. one more DM confirms it again.')
        return
      }
      // no ping left to spend on this week: the paywall, in the send's
      // place, with the note kept for when the pings land
      if (out.error === 'no_pings' || out.error === 'no_slots' || out.error === 'cap') {
        waitForPings({ kind: 'send', to: h, line: line.trim() || (shown.current === h ? '' : null), greet: greetOut, bat })
        setStep('buy')
        return
      }
      setSaid(
        out.error === 'week_full' ? 'full'
          : out.error === 'self' ? 'self'
          : out.error === 'suppressed' ? 'suppressed'
          : out.error === 'rate_limited' ? 'rate'
          : out.error === 'invalid' ? 'invalid'
          : out.error === 'card' ? 'card'
          : 'night',
      )
      shake()
      return
    }
    clearOurs('ping')
    forgetPings()
    if (out.allowance) setWeekNow(out.allowance)
    if (waitingNote()?.to === h) dropWaiting()
    setAdopted(null)
    setEnds(out.expires_at ? Date.parse(out.expires_at) || nextReveal() : nextReveal())
    setStep('done')
    if (!reduce) setDip('dip')
  }

  async function next() {
    if (asking || placing) return
    if (step === 'who') {
      setSaid('')
      if (!validHandle(h)) return
      if (h === myHandle()) { setSaid('self'); return }
      if (!settled) {
        // The first press commits the handle, and the answer takes the
        // field's place; the next press agrees to a PERSON and says so on
        // the key (`confirmWord`). An answer we could not get replaces
        // nothing, and the same press goes on.
        setAsking(true)
        const r = await them.ask()
        if (!alive.current) return
        setAsking(false)
        if (r && (r.state === 'found' || r.state === 'missing')) { setSettled(true); return }
      }
      choose(h)
      return
    }
    if (step === 'line') {
      if (tooLong) { shake(); return }
      if (same || unsure || ask) return
      // a line or words the list catches go nowhere, and a caught line
      // gives the typing back to the line, where it is changed
      if (caught) {
        setSaid(caught)
        shake()
        const there = caught === 'greet' ? greetRef.current : lineRef.current
        if (there) there.focus({ preventScroll: true })
        return
      }
      // none left this week, as far as this device was last told: the
      // paywall now, rather than a send the server would refuse
      if (noneLeft && canPlace()) {
        waitForPings({ kind: 'send', to: h, line: line.trim() || (shown.current === h ? '' : null), greet: greetOut, bat })
        setStep('buy')
        return
      }
      if (adopted) { send(adopted.handle, adopted.proof); return }
      if (canPlace()) { send(myHandle()); return }
      // An @ this person claimed before, on another device or a month ago:
      // its proof comes back from the server, and the ping goes with no DM.
      if (myHandle()) {
        setPlacing(true)
        const back = await readyToPlace()
        if (!alive.current) return
        setPlacing(false)
        if (back) { send(myHandle(), back); return }
      }
      setSaid('')
      setStep('proof')
      return
    }
    if (step === 'proof') proof.ask(h)
  }

  // the dots: back to the name, back to the line. A note's settings opened
  // on it are to one person, so there they are the line and the proof, and
  // none at all when there is no proof to ask for, since one dot is no steps
  const dotAt = step === 'who' ? 0 : step === 'line' ? 1 : 2
  const goDot = (i) => {
    if (placing) return
    if (step === 'proof') proof.drop()
    setSaid('')
    setAdopted(null)
    if (i === 0 && !alone) { setSettled(false); setStep('who') }
    if (i === 1) setStep('line')
  }
  const dots = step === 'done' || step === 'buy' ? null
    : !alone ? <Dots n={total} at={dotAt} onGo={goDot} />
    : total > 2 ? <Dots n={total - 1} at={dotAt - 1} onGo={(i) => goDot(i + 1)} />
    : null

  // ── letting it go ──
  // From a note's settings: asked once on the phone's own screen, in the
  // words its screen on the account asks it in (screens/You.jsx), with the
  // answer on the phone's soft keys, the keeping one first under the focus
  // and under Escape. Then the sheet goes back onto the private notes, where
  // the note no longer is, or, reached from anywhere else, back onto what it
  // was raised over. A note that was not this time has spent its ping on the
  // night it was not, so only a running one says it gives it back, and one
  // not known yet to be either says nothing of it; and one that went mutual
  // as it was let go is not let go (0069), which the list it lands on tells.
  const letGo = async () => {
    if (placing) return
    setPlacing(true)
    setSaid('')
    const out = await release({ me: myHandle(), them: h })
    if (!alive.current) return
    setPlacing(false)
    if (!out.ok && out.error !== 'mutual') { setAsk(false); setSaid('let'); shake(); return }
    forgetPings()
    if (waitingNote()?.to === h) dropWaiting()
    if (pinned) toNotes()
    else if (sheet.current) sheet.current.dismiss('let')
    else up()
  }
  const toNotes = () => {
    if (sheet.current) sheet.current.dismiss('notes')
    else { by.current = 'notes'; leave() }
  }

  // ── the mutual, opened ──
  // The quiet key on a new note to a mutual (the file's header says why it
  // steps down rather than up when the mutual is what is under it). The
  // words go with it and come back with the next screen on them.
  const openMutual = () => {
    AWAY = { to: h, line, greet, bat }
    if (window.history.state?.wallPushed && underThis() === href('reveal', h)) {
      if (sheet.current) sheet.current.dismiss('mutual')
      else up()
      return
    }
    go('reveal', h)
  }
  useEffect(() => {
    if (!ask) return
    document.getElementById('wl-ping-keep')?.focus({ preventScroll: true })
  }, [ask])

  // ── the key that takes a character back ──
  // At the caret, as on the composer, without taking the focus off the line;
  // from the greeting while the typing is in it, and from the words
  // otherwise, where it took them from the words whichever it was in.
  const clearOne = () => {
    const g = greetRef.current
    const el = g && document.activeElement === g ? g : lineRef.current
    if (!el || document.activeElement !== el) {
      setLine(line.replace(/(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S])$/, ''))
      return
    }
    let a = el.selectionStart
    const b = el.selectionEnd
    if (a === b) {
      if (!a) return
      a -= 1
      if (a && /[\uDC00-\uDFFF]/.test(el.value[a])) a -= 1
    }
    el.setRangeText('', a, b, 'end')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // ── and back onto the wall ──
  // The wall the sheet was raised over drops its veil first, if a link
  // brought somebody here before the wall was ever opened (index.jsx
  // `toWall`), so what the sheet uncovers is the names and not the poster.
  const home = () => {
    if (toWall) toWall()
    if (sheet.current) sheet.current.dismiss('sent')
    else back()
  }
  // and on to somebody else, which a note's settings are not any more
  const another = () => {
    window.history.replaceState(window.history.state, '', window.location.pathname.replace(/\/ping\/[^/]*$/, '/ping'))
    setTo(''); setLine(''); setSettled(false); setSaid(''); setDip(''); setStep('who')
    setEdit(null); setAsk(false)
    setGreet(null); setBat(4); setAtGreet(false); setTipRoom(!getState().faceSeen && tipFits())
    faced.current = { greet: false, bat: false }
    shown.current = ''
    setRev((n) => n + 1)
  }

  // the name across the top of the screen, after "dear", as the composer
  // writes it: the first name the resolver has, with the handle beside it
  const prof = useProfile(step === 'who' ? '' : h)
  const first = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  const seed = `ping:${h || 'wall'}`

  // ── the face, set ──
  // The line across the top is the composer's greeting (screen.jsx `Greet`,
  // screens/Write.jsx): "dear" and the name until the writer changes it,
  // forty characters, a dotted line under it saying it is theirs. The battery
  // is a key on the status row (screen.jsx `onBat`): a press takes a bar off,
  // the empty one blinks as the phone's did, and the next comes round to full.
  // The first touch of either puts the line under the screen away for good.
  const defaultGreet = `dear ${first || atHandle(h)}`
  const greeting = greet === null ? defaultGreet : greet
  const seenFace = () => {
    if (!hint) return
    setHint(false)
    patch({ faceSeen: true })
  }
  const onGreet = (v) => {
    faced.current.greet = true
    setGreet(v === defaultGreet ? null : v)
    setSaid('')
  }
  const pressBat = () => {
    if (placing) return
    faced.current.bat = true
    seenFace()
    setBat((b) => (b + 4) % 5)
  }
  // The line saying the face is theirs stands on a note being written, and
  // not over a new note to a mutual, whose floor has two lines already. Its
  // room is kept for the screen it was made on, and the screen gives that
  // room up in its height so the key under it stays in view on a short
  // phone, as the mutual's line does (wall.css `.has-tip`), and keeps it
  // while the phone asks whether to let the note go, so the screen does not
  // move under the question
  const tipAt = tipRoom && step === 'line' && !(again && !editing)

  let body
  if (step === 'buy') {
    body = (
      <BuyPings
        out headId="wl-ping-h" backLabel="back to the note"
        onBack={() => { dropWaiting(); setStep('line') }}
      />
    )
  } else if (step === 'who') {
    body = (
      <>
        <Display size="s" as="h2" id="wl-ping-h" className="wl-write-h">who is<br />it for?</Display>
        <div className="wl-write-step wl-write-who wl-ping-who">
          <div className={`wl-write-body${resolving ? ' is-answering' : ''}`}>
            {resolving ? <Light on={asking} plate="none" /> : null}
            {resolving ? (
              <Addressed at={them.at} looking={asking} onClear={retry} label="not them. type it again" />
            ) : (
              <HandleField
                value={to} onChange={retype} onSubmit={next}
                autoFocus size="lg" inputRef={field}
                placeholder="theirhandle" label="their instagram handle"
                onKeyDown={sug.keyDown}
              />
            )}
          </div>
          <Suggest sug={sug} />
          {!typing && people.length ? <Written people={people} rowOf={rowOf} onPick={choose} /> : null}
          <div className="wl-write-floor" aria-live="polite">
            {said ? <Label className="wl-write-caught">{SAY[said]}</Label> : null}
          </div>
        </div>
      </>
    )
  } else if (step === 'proof') {
    body = (
      <div className="wl-write-step wl-ping-prove">
        <ProveDoor
          p={proof} headId="wl-ping-h" onAsk={next}
          title={<>confirm this is<br />your Instagram.</>}
          say="so we can tell you if it’s mutual. they never learn it was you unless it is."
        />
      </div>
    )
  } else {
    const done = step === 'done'
    // What the words over the screen say, in the ordinary line's three short
    // lines: a note to them; a new one to somebody this person is mutual
    // with, which only opens if they send a new one too; or, on a note's
    // settings, that it is that note being changed, running to its reveal,
    // or going out again after a night that was not this time, and before
    // the list has said which, only what is true of both. A running note
    // "stays sealed till this saturday" until the review of 28 September,
    // which read as if it opened then; it runs till then, and opens only if
    // it is mutual. And new words are new words: a note whose words were all
    // taken off went out as "new words, sent privately." over none, and one
    // whose face alone was changed (0073) is "the change", not new words.
    //
    // The face on the glass: the writer's to set while the note is written,
    // and once it is out, or while the phone asks whether to let it go, what
    // went, which is only what went with words: a note with none has no face
    // (0073), so it ends on `dear` and the name and a full battery.
    // The handle stands beside `dear` and their first name, as it always
    // has, and gives the row up to a line the writer set, which is theirs
    // whole, as a letter's greeting is.
    const worded = !!line.trim()
    const faceNow = done ? (worded ? { greet: greetOut, bat } : { greet: '', bat: 4 }) : { greet: greetOut, bat }
    const top = done || ask ? {
      ...(faceNow.greet ? { salutation: faceNow.greet } : { name: first || atHandle(h), dear: true, handle: first ? atHandle(h) : '' }),
      icon: 'pen', bat: faceNow.bat,
    } : {
      greet: {
        value: greeting, onChange: onGreet, max: MAX_GREET, placeholder: defaultGreet,
        label: 'the greeting. tap to change it', inputRef: greetRef,
        onFocus: () => { setAtGreet(true); seenFace() }, onBlur: () => setAtGreet(false),
        // done with the line, the typing goes on to the words
        onEnter: () => { if (lineRef.current) lineRef.current.focus({ preventScroll: true }) },
      },
      handle: greet === null && first ? atHandle(h) : '', icon: 'pen', bat, onBat: pressBat,
    }
    // what the right key takes a character back from: the greeting while
    // the typing is in it, and the words otherwise
    const clearing = atGreet ? !!greeting : !!line
    // the line saying the face is theirs (`tipAt`, below), unless something
    // that went wrong or the DM's question stands in the floor instead
    const tip = tipAt && !floor && !said && !adopted
    body = (
      <>
        <Display size="s" as="h2" id="wl-ping-h" className="wl-write-h">
          {done ? (editing && !gone && worded ? (faceOnly ? <>the change,<br />sent privately.</> : <>new words,<br />sent privately.</>) : <>sent privately.</>)
            : editing && gone ? <>send it again.<br />they only read it<br />if it&rsquo;s mutual.</>
            : editing && unsure ? <>change your note.<br />they only read it<br />if it&rsquo;s mutual.</>
            : editing ? <>change your note.<br />it runs till<br />{endsWords(live?.expires) || 'saturday'}.</>
            : again ? <>write them a new note.<br />they only read it<br />if they send one too.</>
            : <>write them a note.<br />they only read it<br />if it&rsquo;s mutual.</>}
        </Display>
        <div className="wl-write-step">
          <div
            className={`wl-write-card${shaking ? ' is-shaking' : ''}`}
            onAnimationEnd={(e) => { if (e.animationName === 'wl-shake') setShaking(false) }}
          >
            <span className="wl-write-light" aria-hidden="true">
              <RoomLight key={colourOf(null, seed).slug} look={null} seed={seed} />
            </span>
            {/* The ping's own screen, lit in the colour its own name picks,
                addressed to the person the way a letter is. The line on it
                is sealed on the server until both sides exist; the right key
                takes a character back, or, on an empty line, goes back to
                the name. Once it is out the screen says so, the way the
                phone said a message had gone, and asks nothing. By the
                battery, as on the composer, what the line has left while it
                is being written, and the day it was placed once it is out,
                as on a letter that is up (screen.jsx `stamp`), or, for words
                changed in place, the day the note itself went out. A note's
                settings opened on it have no way back to the name, and any
                note's settings ask on this glass whether to let the note go,
                answered on its soft keys. Across the top, the face the note
                is written on (`top`, above). */}
            <Screen
              look={null} seed={seed} live state={dip}
              top={{
                ...top,
                ...(done ? { stamp: stampOf(!spends && live?.at ? live.at : Date.now()) } : { counter: `${MAX_LINE - line.length}/1` }),
              }}
              keys={done ? {} : ask ? {
                l: { label: 'let it go', onClick: letGo, disabled: placing, aria: 'let it go' },
                r: { id: 'wl-ping-keep', label: 'keep it', onClick: () => setAsk(false), disabled: placing, aria: 'keep it' },
              } : {
                r: clearing
                  ? { label: 'clear', onClick: clearOne, keepFocus: true, aria: 'take a character back' }
                  : alone ? null
                  : { label: 'back', onClick: () => goDot(0), aria: `for ${atHandle(h)}. change who it is for` },
              }}
            >
              {done ? (
                <ScreenNote glyph="check" title={`till ${endsWords(ends) || 'saturday'}`}>
                  if they send you one by then, you both find out at 9pm pacific.
                </ScreenNote>
              ) : ask ? (
                <ScreenNote title="let it go?">
                  {live?.state === 'standing' ? 'this gives its ping back. they never find out you sent it.' : 'they never find out you sent it.'}
                </ScreenNote>
              ) : (
                <ScreenDraft
                  value={line} onChange={(v) => { setLine(v); setSaid('') }} max={MAX_LINE}
                  autoFocus inputRef={lineRef} placeholder={EXAMPLE} label={`your note to ${atHandle(h)}`}
                />
              )}
            </Screen>
            {/* Under the screen, what went wrong, or the question the DM
                put, or which ping the note spends, and nothing of it while
                a note's settings do not know yet whether it spends one. A
                new note to a mutual says first, in one line, that the mutual
                stays theirs as it was: the note is a new one beside it, not
                in its place. The first time a note is written on this device,
                one line under the rest says the greeting and the battery are
                the writer's to set, the way the composer's first letter says
                its greeting is (screens/Write.jsx `hint`), until either is
                touched, and then it fades where it stood, the last line, so
                the room it leaves is only a little more air over the key. A
                running note's change costs nothing, whether it is new words
                or a new face. */}
            <div className={`wl-write-floor${(again && !editing) || tip ? ' wl-ping-floor' : ''}`} aria-live="polite">
              {floor || said ? <Label className="wl-write-caught">{floor || SAY[said]}</Label>
                : adopted ? <Label className="wl-ping-ask">the code came from {atHandle(adopted.handle)}. send it from that account?</Label>
                : done || ask ? null
                : again && !editing ? (
                  <>
                    <Label tone="dim" className="wl-ping-kept">the mutual stays yours to keep.</Label>
                    {week ? <Label tone="dim" className="wl-ping-which">{pingWords(week)}</Label> : null}
                  </>
                ) : (
                  <>
                    {week && !unsure ? (
                      <Label tone="dim" className="wl-ping-which">
                        {spends ? pingWords(week) : 'already out. changing it costs nothing.'}
                      </Label>
                    ) : null}
                    {tip ? (
                      <Label tone="dim" className={`wl-write-hint wl-ping-face${hint ? '' : ' is-gone'}`}>
                        <span aria-hidden={hint ? undefined : 'true'}>the greeting and battery are yours to set.</span>
                      </Label>
                    ) : null}
                  </>
                )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── the foot ──
  // One lit key, and a quiet line under it when there is a second thing
  // worth doing. On the door the key stands in the door, as on the gate, and
  // the foot keeps only the way back out of it. On a note's settings the lit
  // key says what becomes of the words, and the quiet one lets the note go;
  // while the phone asks that, the foot keeps its place and shows nothing,
  // since the answer is on the phone's own keys. On a new note to a mutual
  // the quiet key opens the mutual, which stays where it was. A sheet opened
  // from the private notes goes back down to them, whatever it ended on;
  // the week full raised a second account over this one until the review of
  // 28 September.
  let act = null
  let quiet = null
  if (step === 'who') {
    act = (
      <Pill tone="light" onClick={next} disabled={!validHandle(h)} aria-busy={asking || undefined}>
        {asking ? 'looking' : settled ? confirmWord(them.at, 'next') : 'next'}
      </Pill>
    )
  } else if (step === 'line') {
    act = (
      <Pill
        tone="light" onClick={next} disabled={!validHandle(h) || same || unsure} aria-busy={placing || undefined}
        icon={!ready && !adopted && !placing ? <Provider size={17} /> : null}
      >
        {placing ? 'sending'
          : adopted ? `send it as ${atHandle(adopted.handle)}`
          : noneLeft && ready ? 'get more pings'
          : !ready ? 'next'
          : editing ? (gone ? 'send it again' : bare ? 'send it with no words' : faceOnly ? 'send the change' : 'send the new words')
          : 'send it privately'}
      </Pill>
    )
    quiet = adopted ? (
      <button type="button" className="wl-quiet" onClick={() => { setAdopted(null); setStep('proof') }}>not that account</button>
    ) : said === 'full' ? (
      <button type="button" className="wl-quiet" onClick={pinned ? toNotes : () => go('you')}>your private notes</button>
    ) : editing ? (
      <button type="button" className="wl-quiet" onClick={() => { setSaid(''); setAsk(true) }} disabled={placing}>let it go</button>
    ) : again ? (
      <button type="button" className="wl-quiet" onClick={openMutual}>open the mutual</button>
    ) : null
  } else if (step === 'proof') {
    quiet = proof.dm ? (
      <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
    ) : (
      <button type="button" className="wl-quiet" onClick={() => goDot(1)}>back to the note</button>
    )
  } else if (pinned) {
    act = <Pill tone="light" onClick={toNotes}>your private notes</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={another}>send another</button>
  } else {
    act = <Pill tone="light" onClick={home}>back to the wall</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={another}>send another</button>
  }

  return (
    <Sheet
      ref={sheet} onClose={leave} onClosing={(b) => { by.current = b }}
      onEscape={() => { if (!ask) return false; if (!placing) setAsk(false); return true }}
      tall labelledBy="wl-ping-h" className="is-write is-ping"
    >
      <div className={`wl-sheet-in wl-write wl-ping is-${step}${step === 'line' && again && !editing ? ' is-again' : ''}${tipAt ? ' has-tip' : ''}`}>
        <SheetHead onClose={leave} label={upLabel} lead={dots} />
        {body}
        {step === 'buy' ? null : (
          <div className={`wl-write-foot${ask ? ' is-held' : ''}`}>
            {act}
            {quiet}
          </div>
        )}
        {step === 'proof' ? <DoorFoot /> : null}
      </div>
    </Sheet>
  )
}

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
//     who     "who's on your mind." The people this person has written to,
//             each in one press, with what their ping is doing if there is
//             one; or a new @, typed, with the wall's own names under the
//             field and the resolver's answer standing where the field was.
//     line    the ping's own screen: a line they read if it is ever mutual,
//             and never otherwise. Twenty words at most, and none at all is a
//             ping too.
//     proof   only when this person has no @ the server can vouch for: the
//             Instagram DM, the same door the gate draws. It is asked last,
//             once the person knows what for. A person who claimed their @
//             once, anywhere, and is signed in here by any proof, never sees
//             it: the proof comes back to this device from the server
//             (auth.js `restoreProof`, migration 0065).
//     done    "it's out." and the sixty days, and nothing else.
//
// ── what this sheet never does ──────────────────────────────────────────────
// It does not say whether the person is on celestual. It does not say whether
// they have placed one on anybody, or whether anybody has placed one on them.
// The only pings it speaks about are this person's own, read with this
// person's own proof. And it never announces a mutual on the way out, even
// when the placing made one: the reveal is its own sheet, and landing on it
// through a line of text on a confirmation would be the one lie this product
// could tell about its own mechanic.
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
import { colourOf, stampOf } from '../looks.js'
import { heldProof, refresh } from '../auth.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../handoff.js'
import { signOut as dropProof } from '../../api/auth.js'
import { cardStep } from '../seed.js'
import {
  myHandle, canPlace, readyToPlace, myPings, heldPings, forgetPings, place, writtenTo, stateWords,
} from '../pings.js'

// The card's own ceilings: twenty words, which is what the server keeps
// (celestual_card_clean), and a hundred and forty characters on the screen,
// which is what the line was always given. There is no floor. A ping with no
// line on it is a ping, and the server has always taken one.
const MAX_WORDS = 20
const MAX_LINE = 140
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
  slots: 'every slot is in use. let one of your private notes go to free one.',
  suppressed: 'that person has opted out of private notes.',
  rate: 'that is a lot of private notes for one month. try again later.',
  invalid: 'that handle does not look right.',
  night: 'it did not go through. give it a moment, then send it again.',
  // the card is read by the same list as a letter (0063): a link, an
  // address, a number or a slur, and nothing is placed
  card: 'that can’t go in a note as it is. take out links, addresses and numbers.',
}

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean)
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
// name is typed are one object. Each row is one press: a person with nothing
// out goes straight to their screen; a mutual opens the reveal; a ping that
// is standing opens its screen again, since placing it again keeps it
// standing another sixty days and takes a new line if one is written.
function Written({ people, pingOf, onPick }) {
  const [more, setMore] = useState(false)
  const [lit, setLit] = useState(-1)
  const cut = !more && people.length > SHOWN
  const shown = cut ? people.slice(0, SHOWN) : people
  return (
    <div className="wl-suggest wl-ping-wrote" role="group" aria-labelledby="wl-ping-wrote-lab">
      <Label as="span" tone="dim" className="wl-suggest-lab" id="wl-ping-wrote-lab">written to</Label>
      {shown.map((h, i) => {
        const p = pingOf(h)
        const meta = stateWords(p) || null
        return (
          <button
            type="button" key={h}
            className={`wl-suggest-row${i === lit ? ' is-active' : ''}${p && p.state === 'mutual' ? ' is-mutual' : ''}`}
            onClick={() => onPick(h)}
            onPointerEnter={() => setLit(i)} onPointerLeave={() => setLit(-1)}
            onFocus={() => setLit(i)} onBlur={() => setLit(-1)}
          >
            <Who handle={h} size={34} meta={meta} className="wl-suggest-who" />
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
  to: prefill = '', go, back, up = back, upLabel = 'back to the wall', reduce = false, toWall = null,
}) {
  const pre = normHandle(prefill)
  const own = myHandle()
  const [held] = useState(() => resume(pre))
  const [to, setTo] = useState(() => held?.to || pre)
  const [line, setLine] = useState(() => held?.line || '')
  // who · line · proof · done. A link with a person in it opens on that
  // person's screen, and one with this person's own @ in it on the field.
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
  // how the sheet said it was leaving
  const sheet = useRef(null)
  const by = useRef('')
  const leave = () => (by.current === 'sent' ? back() : up())

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
  const pingOf = useCallback((x) => (pings?.pings || []).find((p) => p.to === normHandle(x)) || null, [pings])

  const h = normHandle(to)
  const people = writtenTo(own)
  const typing = to.trim().length > 0
  const tooLong = words(line).length > MAX_WORDS
  const floor = tooLong ? `twenty words, and that is ${words(line).length}` : ''
  const ready = canPlace()
  const total = ready || adopted ? 2 : 3

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

  // A person, chosen. A mutual is not placed again: it opens onto the
  // reveal, which is where a mutual is read. Anybody else is their screen,
  // carrying the line already standing on them if there is one.
  const choose = (x) => {
    const k = normHandle(x)
    if (!validHandle(k)) return
    if (k === myHandle()) { setSaid('self'); return }
    const p = pingOf(k)
    if (p && p.state === 'mutual') { go('reveal', k); return }
    setTo(k)
    setSaid('')
    if (p && p.line && !line.trim()) setLine(p.line)
    setStep('line')
  }

  // ── the proof ──
  const proof = useProve({
    use: 'ping', held,
    stash: { to: h, line: line.trim() },
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
  async function send(from, spent) {
    const me = normHandle(from)
    if (placing) return
    setPlacing(true)
    setSaid('')
    const out = await place({ me, them: h, proof: spent || heldProof(me), words: line.trim() })
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
      setSaid(
        out.error === 'no_slots' || out.error === 'cap' ? 'slots'
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
    setAdopted(null)
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
      // a link to somebody who has already placed one back is a mutual,
      // and a mutual is read on the reveal, not placed again
      if (pingOf(h)?.state === 'mutual') { go('reveal', h); return }
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

  // the dots: back to the name, back to the line
  const dotAt = step === 'who' ? 0 : step === 'line' ? 1 : 2
  const goDot = (i) => {
    if (placing) return
    if (step === 'proof') proof.drop()
    setSaid('')
    setAdopted(null)
    if (i === 0) { setSettled(false); setStep('who') }
    if (i === 1) setStep('line')
  }

  // ── the key that takes a character back ──
  // At the caret, as on the composer, without taking the focus off the line.
  const clearOne = () => {
    const el = lineRef.current
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
  const again = () => {
    window.history.replaceState(window.history.state, '', window.location.pathname.replace(/\/ping\/[^/]*$/, '/ping'))
    setTo(''); setLine(''); setSettled(false); setSaid(''); setDip(''); setStep('who')
    setRev((n) => n + 1)
  }

  // the name across the top of the screen, after "dear", as the composer
  // writes it: the first name the resolver has, with the handle beside it
  const prof = useProfile(step === 'who' ? '' : h)
  const first = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  const seed = `ping:${h || 'wall'}`

  let body
  if (step === 'who') {
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
          {!typing && people.length ? <Written people={people} pingOf={pingOf} onPick={choose} /> : null}
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
    body = (
      <>
        <Display size="s" as="h2" id="wl-ping-h" className="wl-write-h">
          {done ? <>sent privately.</> : <>write them a note.<br />they only read it<br />if it&rsquo;s mutual.</>}
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
                as on a letter that is up (screen.jsx `stamp`). */}
            <Screen
              look={null} seed={seed} live state={dip}
              top={{
                name: first || atHandle(h), handle: first ? atHandle(h) : '', dear: true, icon: 'pen',
                ...(done ? { stamp: stampOf(Date.now()) } : { counter: `${MAX_LINE - line.length}/1` }),
              }}
              keys={done ? {} : {
                r: line
                  ? { label: 'clear', onClick: clearOne, keepFocus: true, aria: 'take a character back' }
                  : { label: 'back', onClick: () => goDot(0), aria: `for ${atHandle(h)}. change who it is for` },
              }}
            >
              {done ? (
                <ScreenNote glyph="check" title="sixty days">
                  if they send you one in that time, you both find out.
                </ScreenNote>
              ) : (
                <ScreenDraft
                  value={line} onChange={(v) => { setLine(v); setSaid('') }} max={MAX_LINE}
                  autoFocus inputRef={lineRef} placeholder={EXAMPLE} label={`your note to ${atHandle(h)}`}
                />
              )}
            </Screen>
            <div className="wl-write-floor" aria-live="polite">
              {floor || said ? <Label className="wl-write-caught">{floor || SAY[said]}</Label>
                : adopted ? <Label className="wl-ping-ask">the code came from {atHandle(adopted.handle)}. send it from that account?</Label>
                : null}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── the foot ──
  // One lit key, and a quiet line under it when there is a second thing
  // worth doing. On the door the key stands in the door, as on the gate, and
  // the foot keeps only the way back out of it.
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
        tone="light" onClick={next} disabled={!validHandle(h)} aria-busy={placing || undefined}
        icon={!ready && !adopted && !placing ? <Provider size={17} /> : null}
      >
        {placing ? 'sending' : adopted ? `send it as ${atHandle(adopted.handle)}` : ready ? 'send it privately' : 'next'}
      </Pill>
    )
    quiet = adopted ? (
      <button type="button" className="wl-quiet" onClick={() => { setAdopted(null); setStep('proof') }}>not that account</button>
    ) : said === 'slots' ? (
      <button type="button" className="wl-quiet" onClick={() => go('you')}>your private notes</button>
    ) : null
  } else if (step === 'proof') {
    quiet = proof.dm ? (
      <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
    ) : (
      <button type="button" className="wl-quiet" onClick={() => goDot(1)}>back to the note</button>
    )
  } else {
    act = <Pill tone="light" onClick={home}>back to the wall</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={again}>send another</button>
  }

  return (
    <Sheet
      ref={sheet} onClose={leave} onClosing={(b) => { by.current = b }}
      tall labelledBy="wl-ping-h" className="is-write is-ping"
    >
      <div className={`wl-sheet-in wl-write wl-ping is-${step}`}>
        <SheetHead
          onClose={leave} label={upLabel}
          lead={step === 'done' ? null : <Dots n={total} at={dotAt} onGo={goDot} />}
        />
        {body}
        <div className="wl-write-foot">
          {act}
          {quiet}
        </div>
        {step === 'proof' ? <DoorFoot /> : null}
      </div>
    </Sheet>
  )
}

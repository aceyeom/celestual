// ── /berkeley/write — THE COMPOSER ──────────────────────────────────────────
//
// Two steps, and they are one sentence broken across them:
//
//     step 1   Someone at Berkeley you can't forget.      ← who
//     step 2   And what makes them so.                    ← the letter
//
// That is the entire brief, and it is the reason the wall fills up. An earlier
// build asked "what did you never say?", which is a question about the writer:
// it asks somebody to find a regret, decide it is worth publishing, and phrase
// it — three jobs, at a table, on a phone. This asks them to think of ONE
// PERSON, which everybody can do instantly, and then say why, which is the
// part that actually makes a letter worth finding.
//
// The card is live from the first keystroke of step 2. That is the single most
// important decision on this screen: a person typing into a plain box is
// filling in a form, and a person watching their own words settle onto the
// same kind of screen they were reading a minute ago is writing a letter. It
// is the component the wall renders (screen.jsx `Screen`), not a lookalike,
// in the colour and with the words that go up. It is not yet the same phone:
// the draft's quirks are seeded off the draft and not the letter, and the
// picture the letter will carry is not on it.
//
// ── the door, and what it does not change ──────────────────────────────────
// The composer is behind the berkeley.edu address, and it is the only thing on
// the wall that still is: reading opened to either proof in migration 0044, and
// writing did not. An anonymous letter about a named student, publishable by
// anybody on earth with a browser, is not anonymity. It is an open relay
// pointed at a person who never agreed to any of it.
//
// ── and three of them in any five days ─────────────────────────────────────
// A wall whose contents are decided by whoever writes the most is a wall about
// its most prolific writer, and the cheapest way to stop that is a number
// everybody can hold in their head. The number itself is never drawn, here or
// anywhere: while any letter is left the foot says nothing about it, and when
// none is, one line stands over the act saying when the next letter can go
// up, and the act goes dark (parts.jsx `Allowance`). Drafting goes on. The
// count and the date are the server's, from `wall_quota` (migrations 0044
// and 0051), so the letter somebody is refused on is the one the server
// refuses.
//
// The desk can switch the whole ration off (0052), and while it is off the
// server answers with an infinite allowance: `spent` is never true, the foot
// says nothing, and this screen needs no case of its own for it. Nothing else
// about writing moves — the campus gate, the screen at the keyboard and the
// classifier are all where they were.
//
// The address does not follow the letter anywhere. It is not read on this
// screen, it is not passed to `write`, and there is no author field in the
// corpus for it to land in (data.js) — so being let in and being known are
// still two different things, and only the first one happens here. What a
// person is asked for is a domain, once, on the way in; what the wall records
// is a handle, a body and a time.
//
// ── who: an @, or anything else (0053, 0055) ───────────────────────────────
// The first question has two answers and both stand on the rail over the
// field (parts.jsx `Segmented`): "instagram", which is open when the composer
// opens, because on this campus everybody knows everybody's @ and a letter
// to a handle is a letter one person can find; and "anything else", which
// is whatever the writer calls the person. A first name, a nickname, one
// letter, a number, the girl on the 51B. The field is the same field in
// either case: with the @ painted beside it and the identifier's face, or
// with the @ gone and the display face, because a name is something a
// person means and a handle is an identifier. No second field and no
// hidden one, and the wall never asks for the @ beside a name, here or
// anywhere: a writer who chose a name over the @ made a choice.
//
// ── and the whole question is ONE object ───────────────────────────────────
// It was three of them, stacked: a filled capsule with a ring round both
// answers and a glyph beside each, a bare baseline field under that, and —
// the moment a handle was committed — the resolver's answer as a THIRD
// framed card under THAT, with an arrow at its end. Three boxes down a sheet
// to ask one question, and an arrow pointing at a way on that is actually
// the capsule at the foot.
//
// Now the bookmark is attached to a BODY (wall.css `.wl-write-body`) and the
// field lives inside it: one ground, one hairline, one radius, with the tab
// joined to its top edge, so the tab and the thing it changes are one sheet
// of paper rather than a control floating over a control. And the answer does
// not arrive under the field, it REPLACES it inside that body (parts.jsx
// `Addressed`) — the same measure, the same ground, the same height.
//
// The wait is the light and nothing else: the point of light runs the body's
// own edge and two bars breathe where the answer will land, which is the
// animation the result card has always waited with. There is no line of words
// beside it saying that a lookup is happening; the light already says it, and
// the handle it is looking for is the handle the person just typed.
//
// The mark at the end of the answer is the close mark, not an arrow: what
// somebody wants from that row is out of it, back to the field with the
// handle still in it, and the way ON is where it is on every other screen
// here, at the foot, saying which person the press agrees to
// (`confirmWord`).
//
// It used to be one quiet line under the field, "a first name instead",
// which named one of the two choices, hid the other behind a sentence, and
// said "first name" about a choice that was never only that. The letter is
// keyed by a tilde and the folded name (`~sofia`, `~j`, `~51b`), which
// everybody written to under that spelling shares, and the name as typed is
// kept to print. The name goes through the same list as the body, here and
// on the server. Where the @ matters is the ping, and Main asks for it there
// (screens/Join.jsx).
//
// ── the look (0055) ────────────────────────────────────────────────────────
// The screen's left key, `colour`, opens the colours under it (Look.jsx):
// one pool of thirteen, each drawn as the small screen it makes, and a line
// naming the one chosen. The screen is the preview, because the screen is
// the real screen, and what goes up is what was seen. The look rides with
// the letter and is kept in the draft with the words, so it survives the
// sheet being closed over it. The name on the screen is the way back to
// the first question, and so are the dots in the head; the capsule that
// used to stand beside the act for it, "a different name", is gone, and
// the act stands alone in the middle of the foot.
//
// ── the screen, at the keyboard ────────────────────────────────────────────
// Layer 1 of the moderation runs against every keystroke of the letter
// (moderate.js) — slurs, links, phone numbers, addresses, room numbers. It is
// the ONE thing that stops a letter going up, and it says so here, naming the
// thing: the line under the card says what was caught while it is typed, and
// a press on the button with that line still there shakes the card and sends
// nothing. Everything else goes up the moment it is sent. The classifier
// reads the letter AFTER it is on the wall (celestual-wall-moderate), and
// only a letter it reads as severely malicious comes down, which the wall
// says in a card at its foot, with the words handed back to change
// (screens/Wall.jsx `Down`).
//
// ── and there is no screen after this one ──────────────────────────────────
// The press sends, the answer is the id, and the sheet goes: the wall under
// it receives the name, one pulse out from its disc and the disc rising among
// the others (screens/Wall.jsx, the arrival; Hive.jsx `pulse`). There used
// to be a page between the sending and the seeing, where the card was read
// under the mark, sealed into a disc and dropped onto a little wall of five
// faces. It was a room the letter had to be walked through to reach the wall
// it was already on, and the one thing in it worth keeping, the letter being
// seen to land, is on the wall now, which is where the landing actually is.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, Display, Label, Pill, Locked, Allowance,
  HandleField, Addressed, Light, useResolver, confirmWord,
  useSuggest, Suggest, Segmented, useProfile,
} from '../parts.jsx'
import { LookPanel } from '../Look.jsx'
import { Screen, ScreenDraft, RoomLight } from '../screen.jsx'
import { Dots } from '../art.jsx'
import {
  normHandle, validHandle, hash, allowance, loadQuota, write,
  isNameKey, nameKey, cleanName, nameFor, learnName, labelFor, atHandle,
} from '../data.js'
import { normaliseLook, freshLook, colourOf } from '../looks.js'
import { isMember } from '../auth.js'
import { fault } from '../moderate.js'
import { campus, needsCampus } from '../campus.js'
import { getState, patch, setAfterGate } from '../store.js'

// There is no floor. It was sixty characters, then thirty, and both were
// wrong in the same way: the true thing somebody wanted to say ("you gave me
// your umbrella and walked home in it") was being turned away for being
// short, and what got typed to clear the bar was padding. A letter is short
// because it is true. The one thing the wall asks is that something was
// written, and the screen (moderate.js) and the reader do the rest.
//
// The server's ceiling (wall_letters_body_ck, and wall_write's left(…, 280)).
// This said 320, so the last forty characters of a full letter were cut off
// the wall without a word to the writer.
const MAX_BODY = 280
// and the name's (wall_name_clean, 0055): thirty characters, five words
const MAX_NAME = 30

// The example under the empty card, and it is set on that campus: a place a
// person there has actually stood (campus.js `examples`). One line per handle
// rather than a rotation on a clock, so the same name gets the same example
// twice.
const EXAMPLES = () => campus().examples

// What the card says when the server's copy of the list caught what this
// browser's did not, and what this browser's own catch of a slur says
// (moderate.js `fault`): the same sentence, since to the writer it is the
// same fact.
const INAPPROPRIATE = 'that’s inappropriate for the wall.'

// The two answers to the first question, as two words and nothing else. Each
// of them used to carry a glyph — an `@` beside "instagram", a sparkle beside
// "anything else" — and neither said anything its word had not. The field
// under the rail paints the @ where an @ is actually being typed, which is
// the one place it means something.
const KINDS = [
  { value: 'handle', label: 'instagram' },
  { value: 'name', label: 'custom name' },
]

// Whether the composer is on a spread, where the colours stand beside the
// screen and not under it (wall.css, the composer's two columns). The same
// width as the stylesheet's.
const WIDE = '(min-width: 900px)'
function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(WIDE).matches)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const m = window.matchMedia(WIDE)
    const f = () => setWide(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

export default function Write({ to: prefill, go, back, up = back, upLabel = 'back to the wall', reduce = false }) {
  const draft = getState().draft || {}
  // A prefill that is a name key (`~sofia`, from "write to Sofia" on a
  // letter) opens the composer on the name, in name mode.
  const named = !!prefill && isNameKey(prefill)
  const [kind, setKind] = useState(() => (named ? 'name' : prefill ? 'handle' : (draft.kind === 'name' ? 'name' : 'handle')))
  const [to, setTo] = useState(() => (named ? '' : prefill || draft.to || ''))
  const [name, setName] = useState(() => (named ? nameFor(prefill) : draft.name || ''))
  const [body, setBody] = useState(() => draft.body || '')
  // the paper the letter is on, kept with the draft (0055)
  // a draft nobody has chosen a colour for yet is lit in one of its own, so
  // the wall is not a field of the same grey; it is kept with the draft
  const [look, setLook] = useState(() => normaliseLook(draft.look) || freshLook())
  // and the first colour a person sees is the one that stays: kept at once,
  // since the draft is otherwise only written once something changes
  useEffect(() => {
    const d = getState().draft
    if (!normaliseLook(d && d.look)) patch({ draft: { ...(d || {}), look } })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // whether the look panel is open under the card; on a spread it is always
  // there, beside it (`wide`)
  const [styling, setStyling] = useState(false)
  const wide = useWide()
  // the letter's own field, for the key that takes a character back
  const letterRef = useRef(null)
  // Somebody who tapped "write to @them" on a letter already answered the
  // first question.
  const [step, setStep] = useState(() => (prefill ? 1 : 0))
  // Whether the resolver's answer is standing WHERE THE FIELD WAS (parts.jsx
  // `Addressed`). Set by the press that commits a handle, taken back by the X
  // on that row, and dropped the moment the handle or the kind changes,
  // because a person shown under a handle they have since edited is the
  // wrong person.
  const [settled, setSettled] = useState(false)
  const field = useRef(null)
  const first = useRef(true)
  // the sheet's own way out, taken by this screen once the letter is up
  const sheet = useRef(null)
  // ── and where the way out lands ──
  // Closed by the mark, the scrim or the key, the composer goes back to
  // whatever it was raised over: the wall, or the letter whose pen opened
  // it (index.jsx `up`). Once the letter is up it goes to the wall, which
  // receives the name. `by` is how the sheet said it was leaving.
  const by = useRef('')
  const leave = () => (by.current === 'sent' ? back() : up())

  const h = normHandle(to)
  // the name as it will stand on the wall, or '' while it is not one yet
  const nm = cleanName(name)
  // what the letter is filed under: the handle, or the tilde key of the name
  const key = kind === 'name' ? nameKey(nm) : h
  // The first thing layer 1 objects to, said in words. One at a time: a list of
  // five complaints under a text box is a wall, and the writer only has to fix
  // one of them to find out whether the next one is real.
  //
  // This is the courtesy to the writer, not the control on the writer. The same
  // list runs again in celestual-wall-moderate, where it cannot be edited out
  // with a devtools console.
  const caught = body.trim() ? fault(body) : ''
  // The button is live from the first word, caught or not. A press with the
  // line still under the card is answered by the card (it shakes, below)
  // rather than by a button that will not press, which is a refusal with no
  // moment in it.
  const ok = [kind === 'name' ? !!nm : validHandle(h), body.trim().length > 0]
  const [asking, setAsking] = useState(false)
  // Whether the BODY holds the resolver rather than the field: while the
  // lookup is out, and once it has answered. One element across the two, so
  // the light going out and the answer arriving are one transition.
  const resolving = kind === 'handle' && (asking || settled)

  // ── the sending ──
  // `sending` while the request is out, which since the reading moved to
  // after the write is the write itself and nothing else. `said` is what the
  // server answered when it answered no, on the line under the card where the
  // screen's own word stands; a keystroke ends it, because it was about the
  // letter as it was. `shaking` is the card refusing a press.
  const [sending, setSending] = useState(false)
  const [said, setSaid] = useState('')
  const [shaking, setShaking] = useState(false)
  // Set on the way in as well as cleared on the way out, and a ref rather
  // than a closure variable: StrictMode mounts, unmounts and remounts every
  // component in development, and a flag captured in an effect's closure is
  // set false by the first cleanup and never true again.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  // The allowance. Asked once on mount and drawn out of the cache during
  // render like everything else on this surface; `null` until it lands, and
  // nothing is said about it until it is spent.
  useEffect(() => { loadQuota() }, [])
  const left = allowance()
  const spent = !!left && left.left <= 0

  // One draft under one key, so backing out of the sheet and coming back does
  // not cost somebody the forty words they just wrote. The look rides with
  // the words.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    patch({ draft: { to: h, body, kind, name, look } })
    setSaid('')
  }, [h, body, kind, name, look])

  // The resolver under the handle field: peeks while typing, asks on the
  // press. Never for a name: looking a person up by first name is an
  // inference.
  const them = useResolver(kind === 'name' ? '' : to)
  // the name across the top of the screen, after "dear": the first name the
  // resolver has for a handle, with the handle beside it; the handle alone
  // when it has none; and a first name as written
  const prof = useProfile(kind === 'name' ? '' : h)
  const profFirst = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  const toFirst = kind === 'name' ? nm : (profFirst || atHandle(h))
  const toHandle = kind === 'name' || !profFirst ? '' : atHandle(h)
  // And under that, the names already on the wall that match what is typed,
  // until the card has the person: a list under a settled card would list
  // them twice. Pressing a row takes that name, in whichever kind it is.
  const sug = useSuggest(kind === 'name' ? name : to, {
    skip: step !== 0 || asking || settled || (kind === 'handle' && them.at.state === 'found' && them.at.handle === h),
    exclude: key,
    onPick: (t) => {
      if (t.kind === 'name') { setKind('name'); setName(t.name || nameFor(t.handle)) }
      else { setKind('handle'); setTo(t.handle) }
    },
  })
  const pickKind = useCallback((k) => { setKind(k); setSaid(''); setSettled(false) }, [])

  // The handle, edited. Whoever was standing in the field's place was standing
  // there for the old spelling.
  const retype = useCallback((v) => { setTo(v); setSettled(false) }, [])

  // The X on that row: the field comes back with the handle still in it, and
  // the cursor in it, because the one thing a person pressing it wants is to
  // type. Spatially it is the same object returning to the same place, which
  // is the whole reason the answer replaced the field rather than stacking
  // under it.
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

  // The card refusing the press: it shakes, once, and the line under it is
  // the reason. Under reduced motion the line is the whole answer.
  const shake = useCallback(() => {
    if (reduce) return
    setShaking(true)
    try { if (navigator.vibrate) navigator.vibrate(24) } catch { /* not a phone */ }
  }, [reduce])

  // ── the press that sends ──
  // The letter goes to celestual-wall-moderate, which runs the list again,
  // writes it live and answers with the id; the classifier reads it after
  // this request has returned. So the answer is quick, and it is one of: up;
  // caught by the list, when the server's copy of it saw something this one
  // did not, which is the shake again; or not written, with a reason. The
  // store is written whether or not this sheet is still up, since a letter
  // that went up while somebody closed the sheet over it is still up.
  async function send() {
    if (sending) return
    setSending(true)
    setSaid('')
    // The flyer code this session arrived with rides along, so the desk can
    // say which piece of paper a letter came off. And the kind: a handle, or
    // a name with its spelling, and never both. And the look.
    if (kind === 'name') learnName(key, nm)
    const out = await write({ to: h, body: body.trim(), source: getState().source || null, kind, name: nm, look })
    if (alive.current) setSending(false)
    if (!out?.ok) {
      if (!alive.current) return
      const e = out?.error || 'network'
      if (e === 'gate' || e === 'no_session') { setAfterGate({ name: 'write', id: key }); go('gate'); return }
      // a cap is said by the foot (Allowance), which the write refreshed
      setSaid(e === 'removed' ? 'that name has come off the wall. nobody can write to it now.'
        : e === 'cap' ? ''
        : e === 'name' ? 'that is not something the wall can carry. a name, a nickname, a letter, a number.'
        : 'it did not go through. try again.')
      return
    }
    if (out.status === 'rejected') {
      // remembered as answered here, so the wall raises no notice about a
      // letter that never went up
      if (out.id) patch({ noticed: { ...(getState().noticed || {}), [out.id]: true } })
      if (!alive.current) return
      setSaid(INAPPROPRIATE)
      shake()
      return
    }
    const was = getState()
    // the key the server filed it under, which for a name is the tilde key
    const filed = out.handle || key
    patch({
      draft: null,
      written: [out.id, ...was.written].slice(0, 12),
      // and the key, so the account sheet can still list it after a reload
      // has taken the letter itself out of memory; and for a name, its
      // spelling, since a key alone cannot be printed as a name
      wroteTo: [filed, ...(was.wroteTo || []).filter((x) => x !== filed)].slice(0, 12),
      names: kind === 'name' ? { ...(was.names || {}), [filed]: out.name || nm } : (was.names || {}),
      // and the wall sends one pulse out from this name once the glass has
      // gone (screens/Wall.jsx)
      justPosted: filed,
    })
    if (!alive.current) return
    if (sheet.current) sheet.current.dismiss('sent')
    else back()
  }

  async function next() {
    if (!ok[step] || asking || spent || sending) return
    if (step === 0) {
      // a name has nothing to look up: nothing stands in the field's place and
      // the letter is the next thing. Its spelling is remembered first.
      if (kind === 'name') { learnName(key, nm); setStep(1); return }
      if (!settled) {
        // The first press commits the handle. An answer takes the field's
        // place and waits for the second press, which is the press that
        // agrees to a PERSON and says so on the capsule (`confirmWord`). An
        // answer we could not get — offline, capped, the provider down —
        // replaces nothing and the same press goes on, because telling
        // somebody we could not check is not worth a step and is never worth
        // reading as "no such person".
        setAsking(true)
        const r = await them.ask()
        setAsking(false)
        if (r && (r.state === 'found' || r.state === 'missing')) { setSettled(true); return }
      }
      setStep(1)
      return
    }
    if (caught) { shake(); return }
    send()
  }

  // back to the first question: from the dots, or from the name on the card
  const toWho = useCallback(() => { setStyling(false); setStep(0) }, [])

  // ── the key that takes a character back ──
  // At the caret, the way a field does, and without taking the focus off the
  // field (the key keeps it, screen.jsx `keepFocus`), so a phone's keyboard
  // stays up and a desk's next keystroke lands in the letter. A draft that is
  // not being edited, a phone that never tapped in or a key pressed from the
  // keyboard, loses its last character, which is what the phone's key did.
  // A pair of surrogates is one character.
  const clearOne = () => {
    const el = letterRef.current
    if (!el || document.activeElement !== el) {
      setBody(body.replace(/(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S])$/, ''))
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
    // through the field's own change: the body, the counter and the draft
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // Escape takes the colours down before it takes the sheet (parts.jsx
  // Sheet `onEscape`), and a focus that was in them goes back to their key.
  // On a spread they stay, and only the focus leaves them.
  const onEscape = () => {
    const inPanel = document.activeElement && document.activeElement.closest('.wl-look')
    if (wide ? !inPanel : !styling) return false
    if (!wide) setStyling(false)
    if (inPanel) document.querySelector('.wl-write-card .wl-sk.is-l')?.focus()
    return true
  }
  // the colours' key: on a spread the colours are already beside the
  // screen, so it takes the focus to the chosen one
  const colourKey = wide
    ? {
      label: 'colour', aria: 'choose the colour it is lit in',
      onClick: () => document.querySelector('.wl-write .wl-look-opt[aria-checked="true"]')?.focus(),
    }
    : {
      label: styling ? 'done' : 'colour', onClick: () => setStyling((v) => !v), on: styling, pressed: styling,
      aria: styling ? 'done with the colour' : 'choose the colour it is lit in',
    }
  // the draft's own phone, until the draft carries the letter's seed
  const seed = `draft:${key || 'wall'}`

  // ── the door ──
  // Instead of the composer, not in front of a disabled one. A greyed-out form
  // with an explanation beside it makes somebody read a sentence to find out
  // they cannot use the thing they are looking at.
  if (!isMember()) {
    return (
      <Sheet onClose={up} labelledBy="wl-write-h" className="is-write">
        <div className="wl-sheet-in wl-write">
          <SheetHead onClose={up} label={upLabel} />
          <Locked
            id="wl-write-h"
            title={needsCampus() ? `${campus().place} only.` : 'sign in to write.'}
            onOpen={() => { setAfterGate({ name: 'write', id: prefill || '' }); go('gate') }}
          >
            your information will stay anonymous.
          </Locked>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      ref={sheet} onClose={leave} onClosing={(b) => { by.current = b }} onEscape={onEscape}
      tall labelledBy="wl-write-h" className="is-write"
    >
      <div className="wl-sheet-in wl-write">
        <SheetHead onClose={leave} label="back"
          lead={<Dots n={2} at={step} onGo={(i) => (i === 0 ? toWho() : setStep(i))} />} />

        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">
          {step === 0 ? <>{campus().someone[0]}<br />{campus().someone[1]}</> : <>and what<br />makes them so.</>}
        </Display>

        {step === 0 ? (
          /* ── ONE OBJECT, AND ONE QUESTION ──
             The bookmark on its rail, and under the rail either the field or
             the person the field turned out to be. Never both, and never a
             third thing beside them: the rail is the top edge of the field,
             the answer arrives IN the field rather than under it, and what is
             left on the screen is the question, the thing being answered, and
             the act at the foot. */
          /* `--i` is which tab is open, and the body reads it for one thing:
             the corner the tab is standing on stays square and the other
             three round. A page with a tab on its top left corner does not
             round that corner, and the same page with the tab moved off it
             does. */
          <div className="wl-write-step wl-write-who" style={{ '--i': kind === 'name' ? 1 : 0 }}>
            {/* The two answers, as two words on the rail. The field under it
                is the same field in either kind: the painted @ and the
                identifier's face for a handle; the @ gone and the display
                face for anything else (parts.jsx HandleField `kind`). */}
            <Segmented
              className="wl-write-tabs" value={kind} onChange={pickKind} options={KINDS}
              label="who the letter is for, by their instagram or by anything else"
            />
            {/* A letter addressed to a mistyped handle is a letter about
                somebody nobody can ever find, and this is the only step where
                that is still fixable — so the handle is committed here, and
                the person it resolved to stands in the field's own place
                until the X hands the field back (parts.jsx `Addressed`).
                A name is never looked up: looking a person up by first name
                is an inference. And a name that has come off the wall is
                refused by the schema rather than by this screen — wall_write
                answers 'removed' and the line under the card says so. */}
            {/* the body the bookmark is attached to: one ground, one hairline
                and one radius, carrying the field or, once the handle has been
                committed, the resolver in its place */}
            <div className={`wl-write-body${resolving ? ' is-answering' : ''}`}>
              {/* the wait, and the only thing said about it: the point of
                  light running the body's own edge, with two bars breathing
                  where the answer will land. The body already has a ground,
                  so the light brings no plate of its own. */}
              {resolving ? <Light on={asking} plate="none" /> : null}
              {resolving ? (
                <Addressed at={them.at} looking={asking} onClear={retry} label="not them. type it again" />
              ) : (
                <HandleField
                  kind={kind}
                  value={kind === 'name' ? name : to}
                  onChange={kind === 'name' ? (v) => setName(v.slice(0, MAX_NAME)) : retype}
                  onSubmit={next}
                  autoFocus size="lg" inputRef={field}
                  placeholder={kind === 'name' ? 'whatever you call them' : 'theirhandle'}
                  label={kind === 'name' ? 'a name, a nickname, anything' : 'Instagram handle'}
                  onKeyDown={sug.keyDown}
                />
              )}
            </div>
            <Suggest sug={sug} />
          </div>
        ) : (
          <div className="wl-write-step">
            {/* The card and the line under it, in one frame, because the
                frame is what shakes: a press the screen refuses is refused by
                the letter, not by the sheet round it. */}
            <div
              className={`wl-write-card${shaking ? ' is-shaking' : ''}`}
              onAnimationEnd={(e) => { if (e.animationName === 'wl-shake') setShaking(false) }}
            >
              {/* the light the draft throws on the room, as the letter's
                  does, behind everything in the column (wall.css
                  `.wl-write-light`) */}
              <span className="wl-write-light" aria-hidden="true">
                <RoomLight key={colourOf(look, seed).slug} look={look} seed={seed} />
              </span>
              {/* The same screen the wall shows, in the colour the letter
                  goes up in and with the same words. The phone is the
                  draft's own for now (its quirks are seeded off the draft,
                  and the picture is not on it). The name across the top is
                  the person it is for; the left key opens the colours under
                  it, and the right one takes a character back, or, on an
                  empty draft, goes back to the first question. */}
              <Screen
                look={look} seed={seed} live
                top={{
                  name: toFirst, handle: toHandle, dear: true, icon: 'pen',
                  counter: `${MAX_BODY - body.length}/1`,
                }}
                keys={{
                  l: colourKey,
                  r: body
                    ? { label: 'clear', onClick: clearOne, keepFocus: true, aria: 'take a character back' }
                    : { label: 'back', onClick: toWho, aria: `for ${labelFor(key)}. change who it is for` },
                }}
              >
                <ScreenDraft
                  value={body} onChange={setBody} max={MAX_BODY} autoFocus inputRef={letterRef}
                  placeholder={EXAMPLES()[hash(key || 'wheeler') % EXAMPLES().length]}
                />
              </Screen>
              {/* One line under the card, and only when there is something to
                  say: the one thing the screen caught, named, or what the
                  server answered. There is no count under the card and no
                  "more characters" line, because the box is not a form field
                  with a floor. It is a letter, and a letter goes up the moment
                  there is one. */}
              <div className="wl-write-floor" aria-live="polite">
                {caught || said ? <Label className="wl-write-caught">{caught || said}</Label> : null}
              </div>
            </div>
            {/* the colours, under the screen while its left key is on, and
                beside it on a spread; the screen is the preview. Opened by
                the key, the panel is brought into view (Look.jsx `reveal`) */}
            {styling || wide ? <LookPanel look={look} onChange={setLook} seed={seed} reveal={styling && !wide} /> : null}
          </div>
        )}

        <div className="wl-write-foot">
          {/* Nothing over the act while any letter is left. When none is,
              the one line stands over it, saying when the next letter can
              go up, and the act is dark. */}
          {left ? <Allowance left={left.left} limit={left.limit} resets={left.resets} /> : null}
          {/* "send anonymously", not "put it up": the word on the button is
              the one fact a person hesitating over it wants, said at the
              moment they are deciding. The wall is anonymous by shape and
              the button says so in the writer's own frame. While the request
              is out it says so, and stays lit: the light running round it is
              the wait. Alone, in the middle of the foot. */}
          <Pill tone="light" onClick={next} disabled={!ok[step] || spent} aria-busy={sending || asking || undefined}>
            {step === 0
              ? (asking ? 'looking' : settled && kind === 'handle' ? confirmWord(them.at, 'next') : 'next')
              : sending ? 'sending' : 'send anonymously'}
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}

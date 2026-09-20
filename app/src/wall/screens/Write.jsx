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
// same cream card they were reading a minute ago is writing a letter. It is
// the same component the wall renders (parts.jsx `Paper`), not a lookalike, so
// what they see here is exactly what goes up.
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
// none is, one line stands over the act saying how many days to wait before
// drafting more, and the act goes dark (parts.jsx `Allowance`). The count and
// the date are the server's, from `wall_quota` (migrations 0044 and 0051), so
// the letter somebody is refused on is the one the server refuses.
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
// The first question has two answers and both stand over the field, on one
// rail (parts.jsx `Segmented`): "instagram", which is on when the composer
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
// The pen at the end of the card's letterhead opens the look panel under it
// (Look.jsx): a rail with the three things a paper can be changed about —
// texture, color, type — one grid under it for the one being changed, and a
// line naming the choice. The card is the preview, because the card is the
// real card and a look is its tokens moved, and what goes up is what was
// seen. The look rides with the letter and is kept in the draft with the
// words, so it survives the sheet being closed over it. The name on the
// card is the way back to the first question, and so are the dots in the
// head; the capsule that used to stand beside the act for it, "a different
// name", is gone, and the act stands alone in the middle of the foot.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet, SheetHead, Paper, Pen, Display, Label, Pill, Locked, Allowance, OpenFace, Addressee,
  HandleField, LetterField, HandleCard, useResolver, useSuggest, Suggest, Segmented,
} from '../parts.jsx'
import { LookPanel } from '../Look.jsx'
import { Dots, Sparkle } from '../art.jsx'
import {
  normHandle, validHandle, dateline, hash, allowance, loadQuota, write,
  isNameKey, nameKey, cleanName, nameFor, learnName, labelFor,
} from '../data.js'
import { normaliseLook } from '../looks.js'
import { isMember } from '../auth.js'
import { fault } from '../moderate.js'
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
// person there has actually stood. One line per handle rather than a rotation
// on a clock, so the same name gets the same example twice.
const EXAMPLES = [
  'You gave me your umbrella outside Wheeler and walked home in it. I still have it.',
  'You sat two rows ahead in Dwinelle all semester and never once turned round. I noticed anyway.',
  'You held the door at Moffitt at two in the morning and asked if I was okay. I was not, and then I was.',
  'You were the one singing on the 51B that night. I wanted the song to be about me.',
]

// What the card says when the server's copy of the list caught what this
// browser's did not, and what this browser's own catch of a slur says
// (moderate.js `fault`): the same sentence, since to the writer it is the
// same fact.
const INAPPROPRIATE = 'that’s inappropriate for the wall.'

// The two answers to the first question. The @ is the identifier's own
// glyph, painted here the way the field paints it; the sparkle is the
// product's mark for the open one.
const KINDS = [
  { value: 'handle', label: 'instagram', glyph: <span className="wl-seg-at">@</span> },
  { value: 'name', label: 'anything else', glyph: <Sparkle size={11} /> },
]

export default function Write({ to: prefill, go, back, reduce = false }) {
  const draft = getState().draft || {}
  // A prefill that is a name key (`~sofia`, from "write to Sofia" on a
  // letter) opens the composer on the name, in name mode.
  const named = !!prefill && isNameKey(prefill)
  const [kind, setKind] = useState(() => (named ? 'name' : prefill ? 'handle' : (draft.kind === 'name' ? 'name' : 'handle')))
  const [to, setTo] = useState(() => (named ? '' : prefill || draft.to || ''))
  const [name, setName] = useState(() => (named ? nameFor(prefill) : draft.name || ''))
  const [body, setBody] = useState(() => draft.body || '')
  // the paper the letter is on, kept with the draft (0055)
  const [look, setLook] = useState(() => normaliseLook(draft.look))
  // whether the look panel is open under the card
  const [styling, setStyling] = useState(false)
  // Somebody who tapped "write to @them" on a letter already answered the
  // first question.
  const [step, setStep] = useState(() => (prefill ? 1 : 0))
  const first = useRef(true)
  // the sheet's own way out, taken by this screen once the letter is up
  const sheet = useRef(null)

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
  const dl = useMemo(() => dateline(Date.now()), [])
  const [asking, setAsking] = useState(false)

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

  // The card under the handle field: peeks while typing, asks on the press.
  // Never for a name: looking a person up by first name is an inference.
  const them = useResolver(kind === 'name' ? '' : to)
  // And under that, the names already on the wall that match what is typed,
  // until the card has the person: a list under a settled card would list
  // them twice. Pressing a row takes that name, in whichever kind it is.
  const sug = useSuggest(kind === 'name' ? name : to, {
    skip: step !== 0 || (kind === 'handle' && them.at.state === 'found' && them.at.handle === h),
    exclude: key,
    onPick: (t) => {
      if (t.kind === 'name') { setKind('name'); setName(t.name || nameFor(t.handle)) }
      else { setKind('handle'); setTo(t.handle) }
    },
  })
  const pickKind = useCallback((k) => { setKind(k); setSaid('') }, [])

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
      // a name has nothing to look up: the card is skipped and the letter is
      // the next thing. Its spelling is remembered before the card draws it.
      if (kind === 'name') { learnName(key, nm); setStep(1); return }
      if (!them.settled) {
        // An answer draws the card and waits for the second press; no answer
        // at all (offline, capped, provider down) draws nothing and the same
        // press goes on.
        setAsking(true)
        const r = await them.ask()
        setAsking(false)
        if (r && r.state !== 'unknown') return
      }
      setStep(1)
      return
    }
    if (caught) { shake(); return }
    send()
  }

  // back to the first question: from the dots, or from the name on the card
  const toWho = useCallback(() => { setStyling(false); setStep(0) }, [])

  // ── the door ──
  // Instead of the composer, not in front of a disabled one. A greyed-out form
  // with an explanation beside it makes somebody read a sentence to find out
  // they cannot use the thing they are looking at.
  if (!isMember()) {
    return (
      <Sheet onClose={back} labelledBy="wl-write-h">
        <div className="wl-sheet-in wl-write">
          <SheetHead onClose={back} label="back to the wall" />
          <Display size="s" as="h2" id="wl-write-h">Berkeley only.</Display>
          <div className="wl-push" />
          <Locked onOpen={() => { setAfterGate({ name: 'write', id: prefill || '' }); go('gate') }}>
            Your information will stay anonymous.
          </Locked>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet ref={sheet} onClose={back} tall labelledBy="wl-write-h">
      <div className="wl-sheet-in wl-write">
        <SheetHead onClose={back} label="back to the wall"
          lead={<Dots n={2} at={step} onGo={(i) => (i === 0 ? toWho() : setStep(i))} />} />

        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">
          {step === 0 ? <>Someone at Berkeley<br />you can&rsquo;t forget.</> : <>And what<br />makes them so.</>}
        </Display>

        {step === 0 ? (
          <div className="wl-write-step">
            {/* The two answers, on one rail, the handle on by default. The
                field under it is the same field in either kind: the painted
                @ and the identifier's face for a handle; the @ gone and the
                display face for anything else (parts.jsx HandleField `kind`). */}
            <Segmented
              className="wl-write-kind" value={kind} onChange={pickKind} options={KINDS}
              label="who the letter is for, by their instagram or by anything else"
            />
            <HandleField
              kind={kind}
              value={kind === 'name' ? name : to}
              onChange={kind === 'name' ? (v) => setName(v.slice(0, MAX_NAME)) : setTo}
              onSubmit={next}
              autoFocus size="lg"
              placeholder={kind === 'name' ? 'whatever you call them' : 'theirhandle'}
              label={kind === 'name' ? 'a name, a nickname, anything' : 'Instagram handle'}
              onKeyDown={sug.keyDown}
            />
            {/* the account, under the line. A letter addressed to a mistyped
                handle is a letter about somebody that nobody can ever find, and
                this is the only step where that is still fixable. Pressing the
                person is the same act as the pill below. Not for a name. */}
            {/* A name that has come off the wall is refused by the schema
                rather than by this screen: wall_write returns 'removed' and
                the line under the card says so. Guessing here would mean
                asking the server about every handle anybody types. */}
            {kind === 'handle' ? <HandleCard at={them.at} onSelect={next} /> : null}
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
              {/* The same card the wall shows, letterhead included: the face
                  at the head of the paper beside the name, at the size the
                  letter sets it, on the paper the letter chose, so what is
                  being written on is what goes up and not a plainer copy of
                  it. The name is the way back to the first question, and the
                  pen at the end of the row opens the look. */}
              <Paper
                dateline={dl}
                look={look}
                crest={kind === 'name' ? null : <span className="wl-letter-crest"><OpenFace handle={key} size={34} look={look} /></span>}
                title={
                  <button
                    type="button" className="wl-paper-to" onClick={toWho}
                    aria-label={`for ${labelFor(key)}. change who it is for`} title="change who it is for"
                  >
                    <Addressee handle={key} />
                  </button>
                }
                aside={<Pen onClick={() => setStyling((s) => !s)} on={styling} label={styling ? 'done with the look' : 'change the look'} />}
                tone={body.trim() ? '' : 'empty'}
              >
                <LetterField
                  value={body} onChange={setBody} max={MAX_BODY} autoFocus count={false}
                  placeholder={EXAMPLES[hash(key || 'wheeler') % EXAMPLES.length]}
                />
              </Paper>
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
            {/* the look, under the card, while the pen is on: its texture,
                its colour and its type, one at a time, and the card above
                is the preview */}
            {styling ? <LookPanel look={look} onChange={setLook} /> : null}
          </div>
        )}

        <div className="wl-write-foot">
          {/* Nothing over the act while any letter is left. When none is,
              the one line stands over it, and the act is dark, and says
              how many days to wait. */}
          {left ? <Allowance left={left.left} limit={left.limit} resets={left.resets} /> : null}
          {/* "send anonymously", not "put it up": the word on the button is
              the one fact a person hesitating over it wants, said at the
              moment they are deciding. The wall is anonymous by shape and
              the button says so in the writer's own frame. While the request
              is out it says so, and stays lit: the light running round it is
              the wait. Alone, in the middle of the foot. */}
          <Pill tone="light" onClick={next} disabled={!ok[step] || spent} aria-busy={sending || undefined}>
            {step === 0 ? 'next' : sending ? 'sending' : 'send anonymously'}
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}

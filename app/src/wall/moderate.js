// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN — what runs before anything is published, and after a report ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three layers stand between a person typing and a name appearing on a public
// wall. This module is the browser's half of them, and it is deliberately the
// WEAKEST half: everything here is a courtesy to the writer, and the control
// on the writer is the same three layers re-run on the server
// (supabase/functions/celestual-wall-moderate) where they cannot be edited out
// with a devtools console.
//
//   1  DETERMINISTIC   regex — slurs, phone numbers, addresses, room numbers,
//                      links, email. Mirrored from the Edge Function so a
//                      writer is told at the keyboard rather than after they
//                      have committed forty words and pressed the button.
//   2  CLASSIFIER      one Haiku call per letter, against explicit categories.
//                      Not a vibe check: a decision against a list somebody
//                      can be held to.
//   3  HUMAN           anything the classifier calls ambiguous goes up at
//                      once, flagged, and a person reads it at the desk
//                      while it stands (migration 0050). Nobody is told
//                      which letters those are.
//
// ── the two clocks, and why they are different ──────────────────────────────
// PUBLISHING is screened on the way in and refused on the way in: a letter
// the screen refuses is stored and never shown, and the writer is told what
// it was read as (`said`, below) and handed the words back. The screenshot
// exists before you delete it, so a ninety-second exposure of a letter the
// screen could fault is the whole harm. What the screen merely cannot place
// is not held any more: it goes up flagged, because a letter held for hours
// with no word about why was its own harm, to the writer.
//
// REPORTING is the opposite and for the same reason: the letter comes down on
// the tap, before anybody reasons about anything, and the reasoning happens to
// a letter nobody can see. A report queue that leaves the letter up while a
// model thinks about it has understood the asymmetry backwards.
//
// ── where each layer actually is, as of Phase 6b ────────────────────────────
// Layer 1 runs here AND in the edge function. Layers 2 and 3 are the edge
// function's alone, and neither has a client half any more: `screen` and
// `triage` used to return the real endpoints' shape on a timer, and the screens
// that showed them printed a note saying so. Both stubs are gone. The composer
// posts to celestual-wall-moderate, which screens and writes in one request,
// and the report screen files a row for a person rather than drawing a model
// deliberating over it.

// ── layer 1 ─────────────────────────────────────────────────────────────────
// Kept byte-identical in spirit to the Edge Function's list. A slur that is
// caught in the browser and not on the server is a slur that ships; a slur
// caught on the server and not in the browser is a person who wrote a letter
// and was refused with no idea why.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]

// Each pattern carries the sentence the writer is shown. A refusal that says
// "this violates our guidelines" teaches nobody anything and reads as a
// machine being annoyed; a refusal that names the thing is one edit away from
// a letter that goes up.
const PATTERNS = [
  { id: 'url',     say: 'links do not go on the wall',              re: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   say: 'take the email address out',               re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // a run that looks like a number, then at least nine digits in it and no
  // full stop: "since 2019. 2020 was the year" is two years and a sentence
  { id: 'phone',   say: 'take the phone number out',                re: /(\+?\d[\d\s().-]{8,}\d)/, digits: 9 },
  { id: 'address', say: 'a street address cannot go on a public wall',
    re: /\b\d{2,5}\s+[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*)?\s+(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\b/i },
  { id: 'room',    say: 'a room or apartment number cannot go on a public wall',
    re: /\b(room|rm|apt|apartment|suite|ste|dorm)\s*#?\s*\d{1,4}[a-z]?\b|#\s?\d{3,4}\b/i },
]

// Leetspeak folded before the slur pass, because a filter that can be beaten by
// swapping an o for a zero is a filter that has been beaten.
function fold(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[0@]/g, 'o').replace(/1|!/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z\s]/g, '')
}

// Returns the first thing wrong, said in words, or ''. One fault at a time on
// purpose: a list of five complaints under a text box is a wall, and the writer
// only has to fix one of them to find out whether the next one is real.
export function fault(text) {
  const folded = fold(text)
  for (const s of SLURS) {
    if (new RegExp(`\\b${s}\\b`).test(folded)) return 'that word does not go on the wall'
  }
  for (const p of PATTERNS) {
    const m = String(text || '').match(p.re)
    if (!m) continue
    if (p.digits && (m[0].replace(/\D/g, '').length < p.digits || /\.\s/.test(m[0]))) continue
    return p.say
  }
  return ''
}

export function clean(text) { return !fault(text) }

// ── what the screen said, in words ──────────────────────────────────────────
// The classifier answers in category words (celestual-wall-moderate's six, and
// layer 1's pattern ids), and a writer whose letter came down is owed the
// reason in a sentence rather than a slug. One sentence, for the first reason
// the screen gave: the writer only has to change one thing to find out whether
// the next one was real, which is the same rule the composer's floor follows.
// Written here beside layer 1 because these are the screen's own words on the
// other side of the same decision.
const SAID = {
  sexual:  'the screen read it as sexual.',
  threat:  'the screen read it as a threat.',
  locate:  'the screen read it as a way to find them.',
  hate:    'the screen read it as cruelty.',
  minor:   'the screen read it as about somebody under eighteen.',
  contact: 'it has a way to reach them in it, and that cannot go on a public wall.',
  slur:    'a word in it does not go on the wall.',
  url:     'links do not go on the wall.',
  email:   'it has an email address in it, and that cannot go on a public wall.',
  phone:   'it has a phone number in it, and that cannot go on a public wall.',
  address: 'it has a street address in it, and that cannot go on a public wall.',
  room:    'it has a room number in it, and that cannot go on a public wall.',
}

export function said(reasons) {
  for (const r of reasons || []) {
    const key = String(r || '').toLowerCase().trim()
    if (SAID[key]) return SAID[key]
    // the model sometimes answers in a phrase rather than a word; the first
    // category named inside it is the one
    for (const k of Object.keys(SAID)) if (key.includes(k)) return SAID[k]
  }
  return ''
}

// Why a letter of this person's is not on the wall, as one sentence for the
// notice at the foot of the wall and for the screen after sending. `downBy`
// is the server's word for whose hand it was (api.js `mine`).
export function whyDown(downBy, reasons) {
  const s = said(reasons)
  switch (downBy) {
    case 'screen': return s || 'the screen held it back.'
    case 'desk':   return s ? `${s.replace(/\.$/, '')}, and a person agreed.` : 'a person read it and took it down.'
    case 'shut':   return 'the name has come off the wall, and nothing can be written to it now.'
    case 'lapsed': return 'it stood for its thirty days.'
    default:       return s || 'it is not on the wall.'
  }
}

// ── layer 2, drawn ──────────────────────────────────────────────────────────
// The shape the real endpoint returns — { verdict, reasons } — on the timing a
// real one takes. It is a timer and not a model, the screens that call it say
// so on the glass, and it exists so the SEQUENCE is walkable at a demo table:
// the beat where a letter is read before it is published is a product decision
// somebody has to be able to see, not a paragraph in a doc.

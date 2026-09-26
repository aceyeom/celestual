// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN — what runs at the keyboard, and after a report              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three layers stand between a person typing and a name appearing on a public
// wall. This module is the browser's half of them, and it is deliberately the
// WEAKEST half: everything here is a courtesy to the writer, and the control
// on the writer is the same layers re-run on the server
// (supabase/functions/celestual-wall-moderate) where they cannot be edited out
// with a devtools console.
//
//   1  DETERMINISTIC   regex — slurs, phone numbers, addresses, room numbers,
//                      links, email. Mirrored from the Edge Function so a
//                      writer is told at the keyboard rather than after they
//                      have committed forty words and pressed the button. It
//                      is the ONLY thing that stops a letter going up: the
//                      composer shakes and says so, and nothing is sent.
//   2  THE LEXICON     a wide, cheap list of the words a letter with a
//                      consequence in it nearly always carries: violence,
//                      sex, a minor, a routine, exposure. A letter matching
//                      none of them is passed without a model call, which is
//                      most letters. Server side only.
//   3  CLASSIFIER      one call to the cheapest model, for the letters the
//                      lexicon flagged, against a short list of CONSEQUENCES
//                      and never of tones: a threat, a way to find somebody,
//                      sexual content, a minor, a private fact exposed, hate
//                      by group, contact details. Heartbreak, anger, cruelty,
//                      roasting and profanity are the wall, and they pass. It
//                      runs AFTER the letter is on the wall; a reject takes
//                      it down and the writer is told on the wall.
//   4  HUMAN           anything the classifier calls ambiguous stays up,
//                      flagged, and a person reads it at the desk while it
//                      stands (migration 0050). Nobody is told which letters
//                      those are.
//
// ── the two clocks, and why they are different ──────────────────────────────
// PUBLISHING is instant. A letter goes up the moment it is written, and the
// reading happens to a letter that is already on the wall: a letter held for
// seconds with a spinner over it, or for hours with no word about why, was
// its own harm, to the writer, and the worst of what a letter can carry is
// caught by the list at the keyboard before anything is sent. What the
// classifier then reads as severely malicious comes down within the minute,
// and the writer is told, in one card at the foot of the wall, with their own
// words back to change.
//
// REPORTING is the opposite and for the same reason: the letter comes down on
// the tap, before anybody reasons about anything, and the reasoning happens to
// a letter nobody can see. A report queue that leaves the letter up while a
// model thinks about it has understood the asymmetry backwards.
//
// ── where each layer actually is ────────────────────────────────────────────
// Layer 1 runs here AND in the edge function. Layers 2 and 3 are the edge
// function's alone, and neither has a client half: the composer posts to
// celestual-wall-moderate, which runs the list, writes the letter live and
// answers, and reads it after; the wall asks `wall_mine` a few times over the
// next half minute and raises the notice if the reading took it down. A
// letter held for the desk is said on the wall too, while it waits and once
// it is refused (`neverUp`, screens/Wall.jsx `Down`).

// ── layer 1 ─────────────────────────────────────────────────────────────────
// Kept byte-identical in spirit to the Edge Function's list. A slur that is
// caught in the browser and not on the server is a slur that ships; a slur
// caught on the server and not in the browser is a person who wrote a letter
// and was refused with no idea why. Profanity is not on this list and never
// will be: a slur against a group is a consequence for the person named, and
// a swear word is a feeling.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]

// What a slur caught here says, and what a letter the server refused for one
// says (`whyNot`): the same sentence, since to the writer it is the same fact.
const INAPPROPRIATE = 'that’s inappropriate for the wall.'

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
    if (new RegExp(`\\b${s}\\b`).test(folded)) return INAPPROPRIATE
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

// ── why the wall said no, at the send ──────────────────────────────────────
// A letter read before it goes up (0066) can be refused on the spot, and the
// server answers with the reasons it had (celestual-wall-moderate: the list's
// own ids, or the reading's categories). The composer used to throw them away
// and say "that's inappropriate for the wall." whatever they were, so a
// writer did not know what to change and could send the same words and be
// refused again. Now it says the one thing, the way a catch at the keyboard
// does (the list's own sentence, above) and the way a refused reply does
// (replies-check.js `whyRefused`), with the one next step. The first reason
// it has words for wins; a reason it has none for, or none at all, is the
// server's own sentence and the step. The lexicon's `lex:` hits ride along
// for the desk and are not read here: they are what the letter might carry,
// not what the reading found.
const WHY_NOT = {
  threat: 'it reads as a threat.',
  locate: 'it says where somebody can be found.',
  sexual: 'it is sexual about a person.',
  minor: 'it is about somebody under 18.',
  expose: 'it shares something private about a person.',
  hate: 'it is hateful about a group.',
  contact: 'it carries contact details.',
}
export function whyNot(reasons) {
  const list = Array.isArray(reasons) ? reasons.map(String) : []
  for (const r of list) {
    if (r === 'slur') return INAPPROPRIATE
    const p = PATTERNS.find((x) => x.id === r)
    if (p) return `${p.say}.`
    if (WHY_NOT[r]) return `${WHY_NOT[r]} change it and send it again.`
  }
  return 'it can’t go up as it’s written. change it and send it again.'
}

// ── a letter that was held, and never went up ──────────────────────────────
// A letter from anybody is read before it goes up (0066), and one the reading
// is unsure of waits for a person at the desk: `wall_mine` answers
// `down_by: 'held'` for it while it waits. Two things can end that wait
// other than the wall: the desk refuses it, which leaves the row 'rejected'
// (the desk's key for a letter that went up is "take it down", which leaves
// it 'removed'), or a week passes with nobody deciding (0032 `wall_expire`,
// 'rejected' and 'lapsed').
// Either way it never stood, and the notice says it didn't go up rather than
// that it was taken down.
export function neverUp(l) {
  return !!l && l.status === 'rejected' && (l.downBy === 'desk' || l.downBy === 'lapsed')
}

// ── why a letter of this person's is not on the wall ───────────────────────
// One sentence for the notice at the foot of the wall. `downBy` is the
// server's word for whose hand it was (api.js `mine`). It names the terms
// and not the hand: a writer whose letter came down is owed the fact and the
// way back, not a machine explaining itself, and "the screen read it as" was
// a machine explaining itself. The category the reading gave is kept on the
// row for the desk, and never printed here. `held` is a letter that never
// went up (`neverUp`), for the one hand that reads differently for it: a
// letter that lapsed while it waited did not stand for thirty days.
export function whyDown(downBy, held = false) {
  switch (downBy) {
    case 'screen':
    case 'desk':   return 'it went against the terms of the wall. you can change it and put it up again.'
    case 'shut':   return 'the name has come off the wall, and nothing can be written to it now.'
    case 'lapsed': return held ? 'it waited a week without an answer. you can put it up again.' : 'it stood for its thirty days.'
    default:       return 'it is not on the wall.'
  }
}

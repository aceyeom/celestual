// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN — what runs before anything is published, and after a report ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three layers stand between a person typing and a name appearing on a public
// wall. This module is the browser's half of them, and it is deliberately the
// WEAKEST half: everything here is a courtesy to the writer, and the control
// on the writer is the same three layers re-run on the server
// (supabase/functions/celestual-beta-moderate) where they cannot be edited out
// with a devtools console.
//
//   1  DETERMINISTIC   regex — slurs, phone numbers, addresses, room numbers,
//                      links, email. Mirrored from the Edge Function so a
//                      writer is told at the keyboard rather than after they
//                      have committed forty words and pressed the button.
//   2  CLASSIFIER      one Haiku call per letter, against explicit categories.
//                      Not a vibe check: a decision against a list somebody
//                      can be held to.
//   3  HUMAN           anything the classifier calls ambiguous waits for a
//                      person. Nobody is told which.
//
// ── the two clocks, and why they are different ──────────────────────────────
// PUBLISHING is pre-moderated: a letter is written at pending, renders nowhere
// and becomes visible only after 1 and 2 pass. The screenshot exists before you
// delete it, so a ninety-second exposure window is not a small version of the
// harm, it is the whole harm.
//
// REPORTING is the opposite and for the same reason: the letter comes down on
// the tap, before anybody reasons about anything, and the reasoning happens to
// a letter nobody can see. A report queue that leaves the letter up while a
// model thinks about it has understood the asymmetry backwards.
//
// ── this build ──────────────────────────────────────────────────────────────
// Layer 1 is real and runs here. Layers 2 and 3 are drawn honestly and say so
// on the screen: there is no server in this prototype to call Haiku from and no
// desk to route a review to, so `screen` and `triage` return the shape the real
// endpoints return, on a timer, and every screen that shows one of them prints
// the beta note beside it.

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
  { id: 'phone',   say: 'take the phone number out',                re: /(\+?\d[\d\s().-]{8,}\d)/ },
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
  for (const p of PATTERNS) if (p.re.test(text)) return p.say
  return ''
}

export function clean(text) { return !fault(text) }

// ── layer 2, drawn ──────────────────────────────────────────────────────────
// The shape the real endpoint returns — { verdict, reasons } — on the timing a
// real one takes. It is a timer and not a model, the screens that call it say
// so on the glass, and it exists so the SEQUENCE is walkable at a demo table:
// the beat where a letter is read before it is published is a product decision
// somebody has to be able to see, not a paragraph in a doc.
export const SCREEN_MS = 1100

export function screen(body) {
  const f = fault(body)
  return new Promise((resolve) => {
    setTimeout(() => resolve(
      f ? { verdict: 'reject', reasons: [f] } : { verdict: 'pass', reasons: [] },
    ), SCREEN_MS)
  })
}

// ── the report's own triage ─────────────────────────────────────────────────
// The letter is already down by the time this runs. All this decides is which
// desk it lands on:
//
//   clear      the report names something the list already covers. It stays
//              down and a person confirms rather than adjudicates.
//   ambiguous  anything else, INCLUDING an empty box. A report with no reason
//              is not a weak report — the person who taps it is often the
//              person it is about, and requiring them to argue for their own
//              takedown is the same mistake as putting a login in front of it.
//
// Neither verdict deletes anything and neither is shown as a score. The person
// who reported it is told the same sentence either way, because a reporter who
// learns which words get a faster result is a reporter who has been taught to
// write them.
const NAMED = [
  'sexual', 'sex', 'threat', 'threaten', 'scary', 'scared', 'follow', 'following',
  'stalk', 'stalking', 'address', 'phone', 'number', 'where i live', 'where i work',
  'schedule', 'racist', 'racism', 'slur', 'mocking', 'mock', 'making fun',
  'joke', 'cruel', 'harass', 'minor', 'underage', 'not me', 'wrong person',
  'my handle', 'my name', 'private', 'outed', 'outing',
]

export const TRIAGE_MS = 1400

export function triage(reason) {
  const t = String(reason || '').trim().toLowerCase()
  const named = t.length > 0 && NAMED.some((w) => t.includes(w))
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      verdict: named ? 'clear' : 'ambiguous',
      // What the person is told. One sentence, the same weight either way.
      say: named
        ? 'A person confirms it and it stays down.'
        : 'A person reads it and decides.',
    }), TRIAGE_MS)
  })
}

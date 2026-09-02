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

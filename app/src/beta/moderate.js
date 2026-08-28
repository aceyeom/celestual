// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MODERATION — PRE-PUBLICATION, OR IT IS NOT MODERATION                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Nothing on this wall is ever visible before it clears. Post-hoc takedown is
// not a moderation strategy for a product like this one: the screenshot exists
// before you delete it, and the person it was about has already seen it. So a
// letter is written into `beta_letters` at status='pending' and it renders
// nowhere — the public view filters on status='live' — until all three layers
// have passed it.
//
// Three layers, in order, short-circuiting on reject:
//
//   1. DETERMINISTIC. Regex. Slurs, phone numbers, street addresses, dorm room
//      numbers, URLs, emails. No model call, no latency, no ambiguity. This
//      layer is fully implemented here and runs client-side as a first pass —
//      but a client-side check is a courtesy to the writer, not a control, so
//      the same list runs again in the Edge Function before anything is stored.
//   2. CLASSIFIER. One LLM call with explicit categories, not a vibe check.
//      Lives in supabase/functions/celestual-beta-moderate. In this build the
//      call is stubbed to pass after 2400ms; the real prompt is written and
//      commented as not-yet-deployed.
//   3. HUMAN QUEUE. Anything returning 'review' stays at status='pending' and
//      renders nowhere until a person moves it.
//
// The contract is one shape for all three:
//   POST /api/beta/moderate → { verdict: 'pass'|'review'|'reject', reasons: [] }

// A deliberately short, deliberately blunt list. It is not the interesting
// layer — the interesting layer is the classifier — and a long list here just
// produces false positives on the word 'ass' inside 'passed'. Word-boundaried,
// leet-folded, and it errs toward letting the classifier decide.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]

// Contact and location shapes. Every one of these turns a letter from a
// message into a way to find somebody.
const PATTERNS = [
  { id: 'url',     re: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  { id: 'phone',   re: /(\+?\d[\d\s().-]{8,}\d)/ },
  // "2134 Shattuck", "1600 Oxford St" — a number followed by a street word
  { id: 'address', re: /\b\d{2,5}\s+[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*)?\s+(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\b/i },
  // "room 412", "apt 3B", "unit 3 room 212", "#812" — a specific door
  { id: 'room',    re: /\b(room|rm|apt|apartment|suite|ste|dorm)\s*#?\s*\d{1,4}[a-z]?\b|#\s?\d{3,4}\b/i },
]

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[0@]/g, 'o').replace(/1|!/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z\s]/g, '')
}

// Layer 1. Synchronous, no network, runs on every keystroke's worth of text the
// caller wants to check.
export function deterministic(text) {
  const reasons = []
  const folded = fold(text)
  for (const s of SLURS) {
    if (new RegExp(`\\b${s}\\b`).test(folded)) { reasons.push('slur'); break }
  }
  for (const p of PATTERNS) if (p.re.test(text)) reasons.push(p.id)
  return { verdict: reasons.length ? 'reject' : 'pass', reasons }
}

// What a writer is told when layer 1 stops them. One sentence, no apology, no
// exclamation mark, and specific enough to be actionable — a writer who is told
// "something went wrong" edits at random and submits the same thing again.
export const REASON_COPY = {
  slur:    'That word keeps this off the wall.',
  url:     'Links stay off the wall.',
  email:   'Leave contact details out of it.',
  phone:   'Leave contact details out of it.',
  address: 'An address turns a letter into a way to find someone.',
  room:    'A room number turns a letter into a way to find someone.',
}

export function firstReason(reasons) {
  for (const r of reasons || []) if (REASON_COPY[r]) return REASON_COPY[r]
  return 'This one stays off the wall.'
}

// Layers 2–3, behind the shape they will keep in production. In this build the
// endpoint is not deployed and the classifier is stubbed to pass after 2400ms —
// which is also, not coincidentally, roughly what the real call costs, so the
// sealing interlude is timed against a real number rather than a guess.
const STUB_MS = 2400

export async function classify(input) {
  const local = deterministic(`${input.body}\n${input.sealedLine || ''}`)
  if (local.verdict === 'reject') return local

  const endpoint = import.meta.env?.VITE_BETA_MODERATE_URL || ''
  if (!endpoint) {
    await new Promise((r) => setTimeout(r, STUB_MS))
    return { verdict: 'pass', reasons: [] }
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return { verdict: 'review', reasons: ['unreachable'] }
    const out = await res.json()
    return { verdict: out.verdict || 'review', reasons: out.reasons || [] }
  } catch {
    // A classifier that cannot be reached does not get to fail open. Unreachable
    // means 'review', which means the letter sits at pending and renders
    // nowhere — the wall going quiet is a far better outcome than the wall
    // publishing something nobody looked at.
    return { verdict: 'review', reasons: ['unreachable'] }
  }
}

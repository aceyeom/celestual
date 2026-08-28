// CELESTUAL — celestual-beta-moderate  ·  NOT YET DEPLOYED
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  This file is written, reviewed and intentionally undeployed. The beta    ║
// ║  build ships with layer 1 running client-side and layers 2–3 stubbed to   ║
// ║  a hardcoded pass after 2400ms (app/src/beta/moderate.js). Nothing calls  ║
// ║  this endpoint until VITE_BETA_MODERATE_URL is set.                       ║
// ║                                                                           ║
// ║  Deploy:  supabase functions deploy celestual-beta-moderate                ║
// ║  Secrets: MODERATION_API_KEY, MODERATION_MODEL                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// ── WHY PRE-PUBLICATION, AND WHY THAT IS NOT NEGOTIABLE ─────────────────────
// The obvious cheap design is: publish immediately, let people report, take
// things down fast. That is the design every wall-shaped product reaches for
// and it does not work here, for one reason that has nothing to do with
// engineering: THE SCREENSHOT EXISTS BEFORE YOU DELETE IT. By the time a
// takedown runs, the letter has been seen, saved and forwarded, and the person
// it was about has already had the day it gave them. A ninety-second exposure
// window is not a small version of the harm. It is the whole harm.
//
// So a letter is written at status='pending', renders nowhere (the public view
// filters status='live'), and becomes visible only after all three layers pass.
//
//   1  DETERMINISTIC   regex. slurs, phones, addresses, room numbers, URLs,
//                      emails. mirrored from app/src/beta/moderate.js, and
//                      re-run HERE because a client-side check is a courtesy
//                      to the writer, not a control on the writer.
//   2  CLASSIFIER      one model call, explicit categories, below.
//   3  HUMAN           anything returning 'review' stays pending. A person
//                      moves it or it expires. Nobody is told which.
//
// Contract:  POST → { verdict: 'pass'|'review'|'reject', reasons: string[] }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// ── layer 1 ──────────────────────────────────────────────────────────────────
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]

const PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'url',     re: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  { id: 'phone',   re: /(\+?\d[\d\s().-]{8,}\d)/ },
  { id: 'address', re: /\b\d{2,5}\s+[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*)?\s+(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\b/i },
  { id: 'room',    re: /\b(room|rm|apt|apartment|suite|ste|dorm)\s*#?\s*\d{1,4}[a-z]?\b|#\s?\d{3,4}\b/i },
]

function fold(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/[0@]/g, 'o').replace(/1|!/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/[^a-z\s]/g, '')
}

function deterministic(text: string) {
  const reasons: string[] = []
  const folded = fold(text)
  for (const s of SLURS) {
    if (new RegExp(`\\b${s}\\b`).test(folded)) { reasons.push('slur'); break }
  }
  for (const p of PATTERNS) if (p.re.test(text)) reasons.push(p.id)
  return { verdict: reasons.length ? 'reject' : 'pass', reasons }
}

// ── layer 2 ──────────────────────────────────────────────────────────────────
// The real prompt. Written as explicit categories rather than as a request for
// judgement, because "is this letter okay?" gets you a model's median opinion
// about strangers on the internet, and what this wall needs is a decision
// against a list somebody can be held to.
//
// Two of these categories are the ones a generic safety filter will not catch,
// and they are the two that matter most here:
//
//   · PHYSICAL DESCRIPTION + LOCATION OR SCHEDULE. Individually innocuous, and
//     together it is a set of instructions for finding a specific person at a
//     predictable time. Every generic filter passes it. It is the single
//     highest-severity shape this wall can publish and it looks like a
//     compliment.
//   · VALENCE. This wall accepts longing, admiration, regret and apology. It
//     does not accept jokes at somebody's expense. A letter can break no rule,
//     name nothing, threaten nobody, and still be a public sentence about a
//     named person written to be laughed at — and it is a bad day for them
//     either way. A wall that only screens for policy violations becomes a
//     burn book with a nice typeface inside a month.
const SYSTEM_PROMPT = `You screen short anonymous letters before they are published on a public wall.
Each letter is addressed to a named Instagram handle at UC Berkeley. The person it is about did not consent to it and will read it.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

REJECT if any of the following is true:
1. sexual  — sexual content, sexual interest, or sexualised description about an identifiable person.
2. threat  — threats, intimidation, implied surveillance, or any suggestion of consequences.
3. locate  — a physical description of the person COMBINED WITH a location, a route, or a schedule. Treat this as the most serious category. It reads as a compliment and it functions as instructions for finding somebody. Reject even when the tone is warm.
4. mockery — mockery of appearance, body, race, ethnicity, disability, class, or accent. Reject regardless of how affectionate the framing is.
5. minor   — the subject is stated or implied to be under 18.
6. contact — phone numbers, addresses, room numbers, links, email addresses, or any other way to reach or find the person.
7. valence — the letter is a joke at the subject's expense, sarcastic, backhanded, contemptuous, or written to be laughed at rather than read. This wall accepts longing, admiration, regret and apology. It accepts nothing else, and a technically compliant but lukewarm letter about a real person is still a bad day for that person.

REVIEW (do not reject, do not pass) if:
- you are unsure which side of any category above it falls on
- it references a specific private event in a way that could identify a third party
- it is warm but names somebody other than the addressee

PASS only if the letter is unambiguously one of: longing, admiration, regret, apology.

Judge the letter and the sealed line together. The sealed line is private until the recipient asks for it, which makes it MORE sensitive, not less: it is the part that proves the writer knows them.

Err toward review. A letter held for a person to look at costs the writer a day. A letter published wrongly costs the subject much more than that, and cannot be taken back.`

async function classify(body: string, sealedLine: string | null) {
  const key = Deno.env.get('MODERATION_API_KEY')
  const model = Deno.env.get('MODERATION_MODEL') || 'claude-sonnet-5'
  // No key, no publication. Failing open here would mean the one control that
  // stands between this wall and its worst day is a missing environment
  // variable away from being off.
  if (!key) return { verdict: 'review', reasons: ['unconfigured'] }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `<letter>${body}</letter>\n<sealed_line>${sealedLine || ''}</sealed_line>`,
      }],
    }),
  })
  if (!res.ok) return { verdict: 'review', reasons: ['classifier_error'] }

  const data = await res.json()
  const text = (data?.content?.[0]?.text || '').trim()
  try {
    const out = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
    const v = out.verdict === 'pass' || out.verdict === 'reject' ? out.verdict : 'review'
    return { verdict: v, reasons: Array.isArray(out.reasons) ? out.reasons.slice(0, 6) : [] }
  } catch {
    return { verdict: 'review', reasons: ['unparsed'] }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ verdict: 'review', reasons: ['method'] }, 405)

  let payload: { body?: string; sealedLine?: string | null }
  try { payload = await req.json() } catch { return json({ verdict: 'review', reasons: ['malformed'] }, 400) }

  const body = String(payload.body || '').slice(0, 280)
  const sealed = payload.sealedLine ? String(payload.sealedLine).slice(0, 90) : null
  if (!body.trim()) return json({ verdict: 'reject', reasons: ['empty'] })

  // Short-circuit on reject: there is no reason to spend a model call on a
  // letter with a phone number in it.
  const layer1 = deterministic(`${body}\n${sealed || ''}`)
  if (layer1.verdict === 'reject') return json(layer1)

  try {
    return json(await classify(body, sealed))
  } catch {
    // Layer 3 by default. An unreachable classifier means the letter sits at
    // pending and renders nowhere. The wall going quiet for an afternoon is a
    // far better outcome than the wall publishing something nobody looked at.
    return json({ verdict: 'review', reasons: ['unreachable'] })
  }
})

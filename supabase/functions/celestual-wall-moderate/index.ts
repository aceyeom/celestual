// CELESTUAL: celestual-wall-moderate, the screen the wall publishes through.
//
// Renamed from celestual-beta-moderate in Phase 6a. The word "beta" described
// nothing (the surface is /berkeley), the function had never been deployed, and
// Q10 was already renaming the tables underneath it.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  This is the ONLY path a letter reaches the wall by. It writes the letter ║
// ║  at once, answers, and then reads it.                                     ║
// ║                                                                           ║
// ║  Deploy:  supabase functions deploy celestual-wall-moderate               ║
// ║  Secrets: MODERATION_API_KEY, optionally MODERATION_MODEL                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Contract:
//   POST { token, target, body, sealedLine?, source?, campus? }
//     { ok:true,  status:'live',     id }           on the wall, now
//     { ok:true,  status:'rejected', id, reasons }  caught by layer 1: stored,
//                                                   never shown, and the app
//                                                   says it is inappropriate
//     { ok:false, error }                           the write itself was refused
//     { ok:false, error:'cap', limit, used, resets_at }
//                                                   three in any five days, spent
//                                                   (seven until 0051)
//
// ── THE LETTER GOES UP FIRST, AND IS READ WHERE IT STANDS ───────────────────
// Two layers stand between a person typing and a name on a public wall, and
// since migration 0050 only the first one stands BEFORE the letter is up:
//
//   1  DETERMINISTIC   regex. slurs, phones, addresses, room numbers, URLs,
//                      emails. Mirrored from app/src/wall/moderate.js, where it
//                      runs at the keyboard and shakes the card, and re-run
//                      HERE because a client-side check is a courtesy to the
//                      writer, not a control on the writer. A catch is stored
//                      at rejected (spec section 9) and never published.
//   2  CLASSIFIER      one model call, explicit categories, below, run AFTER
//                      the letter has been written at live and the writer has
//                      been answered. A reject takes the letter down
//                      (`wall_screened`), and the wall tells the writer it came
//                      down for going against the terms and hands their words
//                      back. A review leaves it up, flagged for a person at
//                      the desk. A pass is recorded and nothing moves.
//
// It used to read before it wrote, and hold what it was unsure of: a writer
// waited on the model for every letter, and a letter the model could not
// place sat at pending for hours with no word about why. Now the wait is
// gone with the hold. What a reject costs is the seconds a letter stands
// before the model answers, and that is the trade this campus has chosen:
// the worst of it is still caught before anything is published, by layer 1,
// and the rest is caught within a breath of it.
//
// ── and when the classifier does not answer ─────────────────────────────────
// A missing key, a timeout, a provider that is down. The letter is already
// up. It is marked flagged with the failure as its reason, so the desk sees a
// run of `unscreened` rows and knows the classifier is off, and nothing
// about the wall stops.
//
// ── how the reading runs after the answer ───────────────────────────────────
// `EdgeRuntime.waitUntil` keeps the classifier call alive after the response
// has gone, which is what the platform provides for exactly this. Where that
// is not there (a local runtime), the call is awaited after the write instead:
// the letter is still on the wall before the model is asked, and the writer
// waits one call longer.
//
// Classifier contract:  → { verdict: 'pass'|'review'|'reject', reasons: string[] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const PATTERNS: Array<{ id: string; re: RegExp; digits?: number }> = [
  { id: 'url',     re: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // a run that looks like a number, then at least nine digits in it and no
  // full stop: "since 2019. 2020 was the year" is two years and a sentence
  { id: 'phone',   re: /(\+?\d[\d\s().-]{8,}\d)/, digits: 9 },
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
  for (const p of PATTERNS) {
    const m = text.match(p.re)
    if (!m) continue
    if (p.digits && (m[0].replace(/\D/g, '').length < p.digits || /\.\s/.test(m[0]))) continue
    reasons.push(p.id)
  }
  return { verdict: reasons.length ? 'reject' : 'pass', reasons }
}

// ── layer 2 ──────────────────────────────────────────────────────────────────
// The real prompt. Written as explicit categories rather than as a request for
// judgement, because "is this letter okay?" gets you a model's median opinion
// about strangers on the internet, and what this wall needs is a decision
// against a list somebody can be held to.
//
// ── and it passes by default ────────────────────────────────────────────────
// The first version of this prompt was written to err toward review: it
// passed only a letter that was "unambiguously" longing, admiration, regret
// or apology, rejected anything lukewarm or sarcastic under a category called
// valence, sent anything that named a place or a class to review as
// "locate", and held anything it was unsure of for a person to look at. On a
// live wall that was most letters. The composer's own example letters, the
// ones it prints under the empty card, would not have passed it: they name
// Wheeler, Dwinelle, Moffitt and the 51B.
//
// So the list is short and the bar is harm, not tone. A letter stays up
// unless it is one of the six things below, and review is for a letter the
// model genuinely cannot place on one side of one of them, not for a letter
// it merely would not have written. The letter is already up when the model
// reads it, so a REJECT is a takedown: the model is told that, and told that
// a review changes nothing on the wall, so a letter it is confident about is
// a reject and not a review. Two of the categories are still the ones a
// generic safety filter will not catch, and they are still the two that
// matter most here:
//
//   · A PHYSICAL DESCRIPTION WITH A ROUTINE. "You sit in Dwinelle" is a
//     campus letter. "Tall, red jacket, Dwinelle 155 every Tuesday at ten,
//     then the Moffitt second floor" is a set of instructions for finding a
//     specific person at a predictable time, and it reads as a compliment.
//     The line is the routine: a place is not a schedule.
//   · CONTEMPT DRESSED AS AFFECTION. Teasing is fine; a letter written so
//     that the person it is about is the joke, on a public wall, with their
//     handle on it, is not, whatever the framing.
const SYSTEM_PROMPT = `You screen short anonymous letters that have just been published on a public wall at UC Berkeley. Each letter is addressed to a named Instagram handle. The person it is about did not write it and will read it.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

The wall is for longing, admiration, gratitude, regret, apology, inside jokes and warm memories. Most letters are fine, and your default is PASS. Ordinary campus detail is fine: a class, a building, a bus line, a library, a party, a place somebody was once seen. Flirting is fine. Teasing is fine. Awkward, sad, short, clumsy or lukewarm letters are fine.

REJECT if one of these is clearly true:
1. sexual: explicit sexual content, or sexualised description of the person's body.
2. threat: a threat, intimidation, stalking, "I know where you live", or any promised consequence.
3. locate: a physical description of the person COMBINED WITH a recurring schedule or route, precise enough to find them at a predictable time. A place on its own is not this. A memory of one day is not this.
4. hate: slurs, or contempt for the person's race, ethnicity, religion, disability, body, gender or sexuality. Cruelty at the person's expense, written to humiliate them, whatever the framing.
5. minor: the person is stated or clearly implied to be under 18.
6. contact: a phone number, a street address, a room number, a link or an email address.

The letter is already on the wall. A REJECT takes it down at once; a REVIEW leaves it up and asks a person to read it; a PASS leaves it up. So a letter you are confident is one of the six is a REJECT, never a review. REVIEW only when you genuinely cannot tell which side of one of those six a letter falls on. Do not review a letter for being sarcastic, blunt, unromantic, mentioning a third person, or referring to a private moment: those pass.

Judge the letter and the sealed line together; the sealed line is private until the recipient asks for it.

Reasons: one or two words each, from the category names above, or [] on a pass.`

async function classify(body: string, sealedLine: string | null) {
  const key = Deno.env.get('MODERATION_API_KEY')
  // Spec section 9: use the cheapest available model. This is bulk filtering
  // of short letters against an explicit list, so cost per call matters more
  // than nuance, and the list is what carries the judgement rather than the
  // model's opinion about strangers.
  const model = Deno.env.get('MODERATION_MODEL') || 'claude-haiku-4-5-20251001'
  // No key is not a verdict on the letter. It is a fact about the deploy,
  // and it is written down as one so the desk can see it.
  if (!key) return { verdict: 'review', reasons: ['unconfigured'], model }

  // Bounded. The letter is up and the writer has been answered, so nobody is
  // waiting on this; the bound is so a provider that is not answering does
  // not hold the function's own slot for a minute per letter.
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
    signal: AbortSignal.timeout(15_000),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 120,
      // The same letter gets the same answer: a screen that flips a coin on
      // a borderline letter is a screen somebody can retry their way past.
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `<letter>${body}</letter>\n<sealed_line>${sealedLine || ''}</sealed_line>`,
      }],
    }),
    })
  } catch {
    return { verdict: 'review', reasons: ['classifier_timeout'], model }
  }
  if (!res.ok) return { verdict: 'review', reasons: ['classifier_error'], model }

  const data = await res.json()
  const text = (data?.content?.[0]?.text || '').trim()
  try {
    const out = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
    const v = out.verdict === 'pass' || out.verdict === 'reject' ? out.verdict : 'review'
    return { verdict: v, reasons: Array.isArray(out.reasons) ? out.reasons.slice(0, 6) : [], model }
  } catch {
    return { verdict: 'review', reasons: ['unparsed'], model }
  }
}

// The reading, after the answer: the model's verdict written onto the letter
// where it stands, and the letter taken down if the verdict is a reject
// (migration 0050 `wall_screened`). Nothing here can throw its way out of the
// function: a failure to record is logged and the letter stays as it was,
// which is up and unread, and the desk's live list still shows it.
// deno-lint-ignore no-explicit-any
async function readWhereItStands(supabase: any, id: string, body: string, sealed: string | null) {
  let out: { verdict: string; reasons: string[]; model: string }
  try {
    out = await classify(body, sealed)
  } catch {
    out = { verdict: 'review', reasons: ['unreachable'], model: '' }
  }
  const { error } = await supabase.rpc('wall_screened', {
    p_letter: id,
    p_verdict: out.verdict,
    p_reasons: out.reasons,
    p_model: out.model || null,
  })
  if (error) console.error('wall_screened failed', id, error.message)
}

// Work that outlives the response, where the runtime offers it.
function after(work: Promise<unknown>): Promise<unknown> | undefined {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt && typeof rt.waitUntil === 'function') { rt.waitUntil(work); return undefined }
  return work
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)

  let payload: {
    token?: string
    target?: string
    body?: string
    sealedLine?: string | null
    source?: string | null
    campus?: string | null
  }
  try { payload = await req.json() } catch { return json({ ok: false, error: 'malformed' }, 400) }

  const token = String(payload.token || '')
  const target = String(payload.target || '')
  const body = String(payload.body || '').slice(0, 280)
  const sealed = payload.sealedLine ? String(payload.sealedLine).slice(0, 90) : null
  const source = payload.source ? String(payload.source).slice(0, 32) : null
  const campus = String(payload.campus || 'berkeley')

  if (!body.trim()) return json({ ok: false, error: 'empty' })
  if (!target.trim()) return json({ ok: false, error: 'handle' })
  if (token.length < 16 || token.length > 256) return json({ ok: false, error: 'no_session' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── layer 1 ────────────────────────────────────────────────────────────────
  // A catch is written at rejected, with the pattern that caught it, and never
  // published. The app caught it at the keyboard first and shook the card;
  // this is the same list where nobody can edit it out.
  const layer1 = deterministic(`${body}\n${sealed || ''}`)
  const caught = layer1.verdict === 'reject'

  // ── the write ──────────────────────────────────────────────────────────────
  // wall_write is the authority on the gate, the name and the allowance: a
  // person outside the campus is told so, a name that came off the wall stays
  // off it, and the fourth letter in a week is refused in the same statement
  // that would have inserted it.
  const { data, error } = await supabase.rpc('wall_write', {
    p_token: token,
    p_target: target,
    p_body: body,
    p_seal: sealed,
    p_source: source,
    p_campus: campus,
    p_status: caught ? 'rejected' : 'live',
    p_moderation: caught
      ? { verdict: 'reject', reasons: layer1.reasons, flagged: false, at: new Date().toISOString(), model_layer: 1 }
      // up, and not yet read: the classifier writes its verdict over this
      : { verdict: 'unread', reasons: [], flagged: false, at: new Date().toISOString(), model_layer: 0 },
  })

  if (error) {
    console.error('wall_write failed', error.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!data?.ok) return json({ ok: false, error: String(data?.error ?? 'write') })

  if (caught) return json({ ok: true, status: 'rejected', id: data.id, reasons: layer1.reasons })

  // ── layer 2, after the answer ──────────────────────────────────────────────
  // The letter is on the wall. The writer hears so now, and the model reads
  // it where it stands.
  const reading = readWhereItStands(supabase, String(data.id), body, sealed)
  const inline = after(reading)
  if (inline) await inline

  return json({ ok: true, status: 'live', id: data.id })
})

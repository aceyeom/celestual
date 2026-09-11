// CELESTUAL: celestual-wall-moderate, the screen the wall publishes through.
//
// Renamed from celestual-beta-moderate in Phase 6a. The word "beta" described
// nothing (the surface is /berkeley), the function had never been deployed, and
// Q10 was already renaming the tables underneath it.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  This is now the ONLY path a letter reaches the wall by. It screens, and  ║
// ║  it writes. Both, in one request, because a screen whose verdict somebody ║
// ║  else has to act on is a screen with a gap in it.                         ║
// ║                                                                           ║
// ║  Deploy:  supabase functions deploy celestual-wall-moderate               ║
// ║  Secrets: MODERATION_API_KEY, optionally MODERATION_MODEL                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Contract:
//   POST { token, target, body, sealedLine?, source?, campus? }
//     { ok:true,  status:'live',     id }        published
//     { ok:true,  status:'pending',  id }        held for a person to look at
//     { ok:true,  status:'rejected', id, reasons }  stored, and visible only in admin
//     { ok:false, error }                        the write itself was refused
//     { ok:false, error:'cap', limit, used, resets_at }
//                                                three in any seven days, spent
//
// A REJECT IS STILL A WRITE. Spec section 9: rejected content is stored with a
// rejection reason so it appears in admin, not silently dropped. A letter
// nobody can see is still a letter somebody wrote, and being unable to read
// what the screen caught is being unable to tell whether the screen works.
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
//                      emails. mirrored from app/src/wall/moderate.js, and
//                      re-run HERE because a client-side check is a courtesy
//                      to the writer, not a control on the writer.
//   2  CLASSIFIER      one model call, explicit categories, below.
//   3  HUMAN           anything returning 'review' stays pending. A person
//                      moves it or it expires. Nobody is told which.
//
// Contract:  POST → { verdict: 'pass'|'review'|'reject', reasons: string[] }

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
// Wheeler, Dwinelle, Moffitt and the 51B. A screen that holds the product's
// own examples is not a screen, it is a closed door with a queue in front of
// it, and a letter held for a person to look at is a letter the writer
// watches not appear.
//
// So the list is short and the bar is harm, not tone. A letter goes up
// unless it is one of the six things below, and review is for a letter the
// model genuinely cannot place on one side of one of them, not for a letter
// it merely would not have written. Two of the categories are still the ones
// a generic safety filter will not catch, and they are still the two that
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
const SYSTEM_PROMPT = `You screen short anonymous letters before they are published on a public wall at UC Berkeley. Each letter is addressed to a named Instagram handle. The person it is about did not write it and will read it.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

The wall is for longing, admiration, gratitude, regret, apology, inside jokes and warm memories. Most letters are fine, and your default is PASS. Ordinary campus detail is fine: a class, a building, a bus line, a library, a party, a place somebody was once seen. Flirting is fine. Teasing is fine. Awkward, sad, short, clumsy or lukewarm letters are fine.

REJECT only if one of these is clearly true:
1. sexual: explicit sexual content, or sexualised description of the person's body.
2. threat: a threat, intimidation, stalking, "I know where you live", or any promised consequence.
3. locate: a physical description of the person COMBINED WITH a recurring schedule or route, precise enough to find them at a predictable time. A place on its own is not this. A memory of one day is not this.
4. hate: slurs, or contempt for the person's race, ethnicity, religion, disability, body, gender or sexuality. Cruelty at the person's expense, written to humiliate them, whatever the framing.
5. minor: the person is stated or clearly implied to be under 18.
6. contact: a phone number, a street address, a room number, a link or an email address.

REVIEW only when you genuinely cannot tell which side of one of those six a letter falls on. Do not review a letter for being sarcastic, blunt, unromantic, mentioning a third person, or referring to a private moment: those pass.

Judge the letter and the sealed line together; the sealed line is private until the recipient asks for it.

Reasons: one or two words each, from the category names above, or [] on a pass.`

async function classify(body: string, sealedLine: string | null) {
  const key = Deno.env.get('MODERATION_API_KEY')
  // Spec section 9: use the cheapest available model. This is bulk filtering
  // of short letters against an explicit list, so cost per call matters more
  // than nuance, and the list is what carries the judgement rather than the
  // model's opinion about strangers.
  const model = Deno.env.get('MODERATION_MODEL') || 'claude-haiku-4-5-20251001'
  // No key, no publication. Failing open here would mean the one control that
  // stands between this wall and its worst day is a missing environment
  // variable away from being off.
  if (!key) return { verdict: 'review', reasons: ['unconfigured'] }

  // Bounded, and short. A classifier that hangs used to hang the request
  // until the platform killed it, and the letter was never written, not even
  // as pending. A short letter against a short list is a one second call;
  // ten seconds is a provider that is not answering, and the writer has been
  // watching "read before it goes up" for all of them. A timeout is a
  // verdict of review: a person looks at it.
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
    signal: AbortSignal.timeout(10_000),
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
    return { verdict: 'review', reasons: ['classifier_timeout'] }
  }
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

  // ── the allowance, asked before anything is spent on the letter ────────────
  // Three in any seven days (migration 0044). wall_write is the authority and
  // refuses the fourth whatever this says, because a check here and a write
  // there is two requests that can both pass. This is only so a person who has
  // none left does not wait on a model call to be told so, and so nobody pays
  // for one.
  //
  // A read that fails is not a refusal. wall_write will ask again in the same
  // statement that inserts, so a flaky moment here costs nothing but the
  // classifier call this was trying to save.
  const { data: quota } = await supabase.rpc('wall_quota', { p_token: token })
  if (quota?.ok === true && Number(quota.left) <= 0) {
    return json({ ok: false, error: 'cap', limit: quota.limit, used: quota.used, resets_at: quota.resets_at })
  }

  // ── layer 1 ────────────────────────────────────────────────────────────────
  // Short-circuit on reject: there is no reason to spend a model call on a
  // letter with a phone number in it. It is still WRITTEN, at status rejected,
  // with the pattern that caught it.
  let verdict = 'review'
  let reasons: string[] = []

  const layer1 = deterministic(`${body}\n${sealed || ''}`)
  if (layer1.verdict === 'reject') {
    verdict = 'reject'
    reasons = layer1.reasons
  } else {
    // ── layer 2 ──────────────────────────────────────────────────────────────
    try {
      const out = await classify(body, sealed)
      verdict = out.verdict
      reasons = out.reasons
    } catch {
      // Layer 3 by default. An unreachable classifier means the letter sits at
      // pending and renders nowhere. The wall going quiet for an afternoon is a
      // far better outcome than the wall publishing something nobody looked at.
      verdict = 'review'
      reasons = ['unreachable']
    }
  }

  // 'review' is layer 3: the letter stays pending, a person moves it or
  // wall_expire() closes it out after seven days, and nobody is told which.
  const status = verdict === 'pass' ? 'live' : verdict === 'reject' ? 'rejected' : 'pending'

  const { data, error } = await supabase.rpc('wall_write', {
    p_token: token,
    p_target: target,
    p_body: body,
    p_seal: sealed,
    p_source: source,
    p_campus: campus,
    p_status: status,
    p_moderation: { verdict, reasons, at: new Date().toISOString(), model_layer: verdict === 'reject' && layer1.verdict === 'reject' ? 1 : 2 },
  })

  if (error) {
    console.error('wall_write failed', error.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!data?.ok) return json({ ok: false, error: String(data?.error ?? 'write') })

  // The writer is told the truth about a reject and nothing about a review.
  // "Held" and "published" have to read the same to the person who wrote it,
  // or the screen becomes a way to find out what gets through.
  return json(
    status === 'rejected'
      ? { ok: true, status, id: data.id, reasons }
      : { ok: true, status: 'live', id: data.id },
  )
})

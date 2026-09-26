// CELESTUAL: celestual-wall-moderate, the screen the wall publishes through.
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
//   POST { token, target, body, sealedLine?, source?, campus?, kind?, name?, look? }
//     campus is the wall the letter goes on: 'berkeley', or 'global' for the
//     wall at the root of the site (migration 0057). The gate is the
//     schema's (wall_write asks wall_gate); this function does not decide
//     who may write, only what may stand.
//     kind is 'handle' (the default) or 'name' (0053): a letter to a first
//     name, a nickname, a letter, a number, whatever the writer calls the
//     person (0055), with `name` as the writer typed it and `target`
//     ignored. No handle travels with a name letter, and none is stored
//     beside one.
//     look is the paper the letter chose (0055): `{ theme, tint, face }`,
//     each a short slug, or nothing. It is cleaned here to the same three
//     slugs the schema admits, and cleaned again by wall_write, so a fourth
//     key, a colour or a sentence never reaches a row.
//     { ok:true,  status:'live',     id }           on the wall, now
//     { ok:true,  status:'rejected', id, reasons }  caught by layer 1: stored,
//                                                   never shown, and the app
//                                                   says it is inappropriate
//     { ok:false, error }                           the write itself was refused
//     { ok:false, error:'cap', limit, used, resets_at }
//                                                   the allowance, spent
//
//   A request with `v: 2` is the one wall's (docs/ONE-WALL.md, migration
//   0063), and is answered by `v2()` below. Without it, everything here is
//   as it was.
//
// ── MODERATE THE CONSEQUENCE, NOT THE EMOTION ───────────────────────────────
// The wall is where people say the thing they never said, and a good deal
// of what they never said is unkind. Heartbreak, anger, a grudge, a roast, a
// letter that calls somebody a coward, a letter with every swear word in it:
// that is the product, and a screen that took those down would be taking
// down the wall. What comes down is a letter that can DO something to the
// person it names off the wall: get them found, get them hurt, out them,
// sexualise them, or say they are a child. The list is short and it is
// about consequence. Nothing on it is about tone.
//
// ── and it is cheap, because most letters are never read by a model ────────
// Three layers, and the expensive one runs on a minority of letters:
//
//   1  DETERMINISTIC   regex. slurs, phones, addresses, room numbers, URLs,
//                      emails. Mirrored from app/src/wall/moderate.js, where it
//                      runs at the keyboard and shakes the card, and re-run
//                      HERE because a client-side check is a courtesy to the
//                      writer, not a control on the writer. A catch is stored
//                      at rejected and never published. This is the only
//                      thing that stands BEFORE a letter is up.
//   2  THE LEXICON     a list of the words and shapes that a letter with a
//                      consequence in it nearly always carries: violence,
//                      sex, a minor, a routine, a place, exposure. A letter
//                      that matches none of them is passed without a model
//                      call and marked so. Most letters match none of them.
//                      This is what makes the screen cost a fraction of what
//                      one call per letter cost: the model reads only what
//                      the lexicon flagged.
//   3  CLASSIFIER      one call to the cheapest model, against the short
//                      list of consequences below, with a small output, run
//                      AFTER the letter has been written at live and the
//                      writer has been answered. A reject takes the letter
//                      down (`wall_screened`), and the wall tells the writer
//                      it came down for going against the terms and hands
//                      their words back. A review leaves it up, flagged for
//                      a person at the desk. A pass is recorded and nothing
//                      moves.
//
// It used to read every letter, before it wrote, against a list that made
// the tone the crime: lukewarm was a category, sarcasm was a review, and
// "contempt dressed as affection" was a reject. On a live wall that was most
// of the letters people wanted to write, and a model call for each of them.
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
// Slurs against a protected class are a consequence, not a tone: on a public
// wall under somebody's name they are harassment of that person, whatever
// the framing. Profanity is not on this list and never will be.
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
    if (p.digits && (m[0].replace(/\D/g, '').length < p.digits || /\.\s/.test(m[0])) ) continue
    reasons.push(p.id)
  }
  return { verdict: reasons.length ? 'reject' : 'pass', reasons }
}

// ── layer 2: the lexicon ─────────────────────────────────────────────────────
// What a letter with a consequence in it nearly always carries, in words.
// Each row is a category of consequence and the stems that suggest it; a
// letter matching any row goes to the model, and one matching none is
// passed here. The list is deliberately WIDE on purpose: its job is to be
// cheap and to miss nothing, and the model's job is to be right about the
// ones it sends. A false alarm here costs one small call. A miss here costs
// a letter standing.
//
// Not on it, on purpose: swearing, insults, "hate", "hurt" in the sense of
// feelings, "die" in "I could die", break-up words, mockery. Those are the
// wall.
const LEXICON: Array<{ id: string; re: RegExp }> = [
  // a threat or violence promised, or wished on somebody, or a weapon
  { id: 'threat',   re: /\b(kill|murder|stab|shoot|shot|gun|knife|blade|beat (you|him|her|them) up|hurt (you|him|her|them)|break (your|his|her) (legs|face|neck)|burn (your|his|her)|rape|assault|attack|choke|strangle|drown|poison|bomb|slit|bury you|find you|coming for you|watch(ing)? your back|you('ll| will) (pay|regret)|dead (to me|man|girl|woman)|end you|hunt)\b/i },
  // sexual content, or a body described that way
  { id: 'sexual',   re: /\b(sex|sexy|sexual|fuck(ed|ing)? (you|him|her|me)|blow ?job|hand ?job|dick|cock|pussy|cunt|tits?|boobs?|ass(hole)?|nude|naked|nudes|onlyfans|horny|orgasm|cum|slut|whore|hoe|thot|body count|virgin|thicc|thick thighs|rack|bulge|hooked up|hookup|one night|in bed|sleep with|slept with|moan)\b/i },
  // a minor, stated or implied
  { id: 'minor',    re: /\b(1[0-7] ?(years|yrs|yo|year old|y\/o)|(you'?re|you are|she'?s|she is|he'?s|he is|they'?re|only|just|turned|turning|is|are) 1[0-7]|1[0-2]th grade|grade 1[0-2]|under ?age|underage|minor|middle school|freshman in high|high school (freshman|sophomore|junior)|child|kid|little (girl|boy)|sixteen|fifteen|fourteen|thirteen|jailbait|loli)\b/i },
  // a routine, a schedule, a way to find somebody at a time
  { id: 'locate',   re: /\b(every (monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|night|day|week)|(mon|tues|wednes|thurs|fri|satur|sun)days|at \d{1,2}(:\d{2})? ?(am|pm|o'?clock)|\d{1,2}(:\d{2})? ?(am|pm) (every|each|on)|schedule|routine|(lives?|living|stays?|staying) (at|in|on|near)|(his|her|their|your) (place|apartment|dorm|house|room|address|building|floor|unit)|room ?\d|floor \d|unit \d|parking|license plate|plate number|follow(ed|ing)? (you|her|him|them) (home|back)|(bus|train|route|line) (home|to)|works? at|shift at|gym at|class at|section at)\b/i },
  // exposing a private fact: outing, health, status, papers, money
  { id: 'expose',   re: /\b(gay|lesbian|bi(sexual)?|trans(gender)?|queer|closet(ed)?|out (you|him|her|them)|outed|pregnan(t|cy)|abortion|miscarriage|hiv|aids|std|sti|herpes|chlamydia|positive for|diagnos(ed|is)|bipolar|schizo|anorexi|bulimi|eating disorder|rehab|overdose|self.?harm|cutting|suicid|kill (my|your|him|her)self|kys|undocumented|illegal (immigrant|alien)|deport|ice will|visa|green card|owes? money|debt|bankrupt|arrest(ed)?|charged with|felony|criminal record|dui|cheated on|affair|nudes? of|leak|revenge)\b/i },
  // a slur that the fold missed, or hatred by group
  { id: 'hate',     re: /\b(n[i1]gg|f[a4]gg?|tr[a4]nn|r[e3]t[a4]rd|k[i1]k[e3]|sp[i1]c|ch[i1]nk|w[e3]tb[a4]ck|towel ?head|sand ?n|go back to (your|ur) country|your kind|(all|every) (jews|muslims|blacks|asians|mexicans|indians|whites|arabs|gays|women|men) (are|should))\b/i },
]

function needsReading(text: string): string[] {
  const hits: string[] = []
  const t = String(text || '')
  for (const row of LEXICON) if (row.re.test(t)) hits.push(row.id)
  return hits
}

// ── layer 3 ──────────────────────────────────────────────────────────────────
// The real prompt. Written as a short list of consequences rather than as a
// request for judgement, because "is this letter okay?" gets you a model's
// median opinion about strangers on the internet, and what this wall needs
// is a decision against a list somebody can be held to. The list is what
// carries the judgement; the model applies it. It is told, plainly, what the
// wall is for, so that cruelty reads as the product and not as a category.
const SYSTEM_PROMPT = `You screen short anonymous letters that have just been published on a public wall. Each letter is addressed to a named Instagram handle, or to a first name or nickname. The person it is about did not write it and will read it. The addressee is given with the letter.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

THE WALL IS FOR THE THINGS PEOPLE NEVER SAID. Longing, admiration, gratitude, regret, apology, and also heartbreak, anger, grudges, break-ups, roasting, mockery, insults, contempt, and profanity. Cruelty is allowed. Calling somebody pathetic, a liar, a coward, ugly, fat, boring, a bad kisser, a terrible friend: allowed. Swearing at them: allowed. Sarcasm, bitterness, "I hope you're miserable", "you ruined my year": allowed. Ordinary detail is allowed: a class, a building, a bar, a party, a bus line, a job, a place somebody was once seen, a memory of one day. Your default is PASS, and most letters, including most unkind ones, are a PASS.

Moderate the CONSEQUENCE, not the emotion. REJECT only if one of these is clearly true:
1. threat: a threat of violence, a wish for their death or injury stated as intent or a promise, intimidation, "I know where you live", stalking, or any promised consequence to their body, home or safety.
2. locate: a physical description or their name COMBINED WITH a recurring schedule, route, address, workplace shift, or room, precise enough to find them at a predictable time. A place alone is not this. One remembered day is not this.
3. sexual: explicit sexual content about the person, a sexualised description of their body, or a claim about their sexual history stated as fact to humiliate.
4. minor: the person is stated or clearly implied to be under 18 in a sexual or romantic letter.
5. expose: a private fact disclosed about them that costs them something outside the wall: outing their sexuality or gender, a health or pregnancy or immigration or legal status, an addiction, a debt, or a threat to leak images or messages.
6. hate: a slur, or contempt for the person's race, ethnicity, religion, disability, gender or sexuality as such. Contempt for the PERSON is allowed; contempt for their group is not.
7. contact: a phone number, a street address, a room number, a link or an email address.

The letter is already on the wall. A REJECT takes it down at once; a REVIEW leaves it up and asks a person to read it; a PASS leaves it up. So a letter you are confident is one of the seven is a REJECT, never a review. REVIEW only when you genuinely cannot tell which side of one of those seven a letter falls on. Never review or reject a letter for being cruel, crude, sad, angry, sarcastic, unromantic, or embarrassing to the person: those pass.

Judge the letter and the sealed line together; the sealed line is private until the recipient asks for it.

Reasons: one word each, from the category names above, or [] on a pass.`

async function classify(body: string, sealedLine: string | null, addressee = '') {
  const key = Deno.env.get('MODERATION_API_KEY')
  // The cheapest available model. This is filtering of short letters
  // against an explicit list, so cost per call matters more than nuance,
  // and the list is what carries the judgement.
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
        // the answer is a verdict and a word or two, but sixty tokens cut a
        // few answers off mid-object; the schema below keeps it short anyway
        max_tokens: 256,
        // The same letter gets the same answer: a screen that flips a coin on
        // a borderline letter is a screen somebody can retry their way past.
        temperature: 0,
        system: SYSTEM_PROMPT,
        // Structured output: the answer is held to this schema by the API, so
        // it always parses. Asked for in the prompt alone, about a third of
        // the verdicts of 24 September came back as prose round the object or
        // cut off, and went to the desk as `unparsed`; with a name note read
        // before it goes up (docs/ONE-WALL.md), each of those would have held
        // a clean note back for a person.
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                verdict: { type: 'string', enum: ['pass', 'review', 'reject'] },
                reasons: { type: 'array', items: { type: 'string' } },
              },
              required: ['verdict', 'reasons'],
              additionalProperties: false,
            },
          },
        },
        messages: [{
          role: 'user',
          content: `<addressee>${addressee}</addressee>\n<letter>${body}</letter>\n<sealed_line>${sealedLine || ''}</sealed_line>`,
        }],
      }),
    })
  } catch {
    return { verdict: 'review', reasons: ['classifier_timeout'], model }
  }
  if (!res.ok) return { verdict: 'review', reasons: ['classifier_error'], model }

  const data = await res.json()
  // A refusal, or an answer cut off, is not a verdict: a person reads it
  if (data?.stop_reason === 'refusal') return { verdict: 'review', reasons: ['classifier_refused'], model }
  if (data?.stop_reason === 'max_tokens') return { verdict: 'review', reasons: ['unparsed'], model }
  const block = Array.isArray(data?.content) ? data.content.find((b: { type?: string }) => b?.type === 'text') : null
  const text = String(block?.text || '').trim()
  try {
    // the schema makes this the whole text; the object is still found inside
    // anything round it, so a model without structured output reads the same
    const whole = text.replace(/^```json\s*|\s*```$/g, '')
    const at = whole.indexOf('{')
    const end = whole.lastIndexOf('}')
    const out = JSON.parse(at >= 0 && end > at ? whole.slice(at, end + 1) : whole)
    const v = out.verdict === 'pass' || out.verdict === 'reject' ? out.verdict : 'review'
    return { verdict: v, reasons: Array.isArray(out.reasons) ? out.reasons.slice(0, 6).map(String) : [], model }
  } catch {
    return { verdict: 'review', reasons: ['unparsed'], model }
  }
}

// ── the look (0055) ──────────────────────────────────────────────────────────
// Three keys, each a short lower case slug, or nothing. The same rule
// wall_look_clean applies in the schema, so what leaves here is what the
// row will hold; `paper` is the plain paper and is nothing.
const SLUG = /^[a-z][a-z0-9-]{0,23}$/
function cleanLook(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const pick = (k: string) => (typeof r[k] === 'string' && SLUG.test(r[k] as string) ? (r[k] as string) : '')
  const out: Record<string, string> = {}
  const theme = pick('theme')
  if (theme && theme !== 'paper') out.theme = theme
  const tint = pick('tint')
  if (tint) out.tint = tint
  const face = pick('face')
  if (face) out.face = face
  return Object.keys(out).length ? out : null
}

// ── the wall, told ───────────────────────────────────────────────────────────
// A letter is up, or has come down: every browser on this wall is told the
// index moved, over Realtime's broadcast, and reads the public index again
// (app/src/wall/data.js watchWall). The message carries nothing but the
// fact: no letter, no name, no count, so the channel, which anybody can join,
// discloses nothing the index does not.
async function nudge(campus: string): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ topic: `wall:${campus}`, event: 'moved', payload: { at: new Date().toISOString() } }],
      }),
    })
    if (!res.ok) console.warn('wall nudge refused', res.status)
  } catch (e) {
    console.warn('wall nudge failed', String(e))
  }
}

// The reading, after the answer: the lexicon first, and the model only for a
// letter the lexicon flagged; the verdict written onto the letter where it
// stands, and the letter taken down if the verdict is a reject (migration
// 0050 `wall_screened`). Nothing here can throw its way out of the function:
// a failure to record is logged and the letter stays as it was, which is up
// and unread, and the desk's live list still shows it.
// deno-lint-ignore no-explicit-any
async function readWhereItStands(supabase: any, id: string, body: string, sealed: string | null, campus: string, addressee = '') {
  let out: { verdict: string; reasons: string[]; model: string }
  const hits = needsReading(`${addressee}\n${body}\n${sealed || ''}`)
  if (!hits.length) {
    // nothing in it that could carry a consequence: passed without a call,
    // and the row says which layer passed it
    out = { verdict: 'pass', reasons: [], model: 'lexicon' }
  } else {
    try {
      out = await classify(body, sealed, addressee)
    } catch {
      out = { verdict: 'review', reasons: ['unreachable'], model: '' }
    }
    // what the lexicon saw, kept beside the model's word, for the desk
    if (out.verdict !== 'pass') out.reasons = [...new Set([...out.reasons, ...hits.map((h) => `lex:${h}`)])].slice(0, 8)
  }
  const { error } = await supabase.rpc('wall_screened', {
    p_letter: id,
    p_verdict: out.verdict,
    p_reasons: out.reasons,
    p_model: out.model || null,
  })
  if (error) console.error('wall_screened failed', id, error.message)
  else if (out.verdict === 'reject') await nudge(campus)
}

// Work that outlives the response, where the runtime offers it.
function after(work: Promise<unknown>): Promise<unknown> | undefined {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt && typeof rt.waitUntil === 'function') { rt.waitUntil(work); return undefined }
  return work
}

const CAMPUS_SLUG = /^[a-z0-9-]{2,40}$/

// ── version 2: the one wall (docs/ONE-WALL.md, migration 0063) ──────────────
// A request carrying `v: 2`. Everything above this line is the version 1
// path, byte for byte, for a tab still on the old build.
//
//   request  { v: 2, token, kind: 'handle'|'name', target?, name?, salutation?,
//              look?, campus?: slug|null, nonce, source?, body }
//   ok       { ok: true, id, status: 'live'|'pending'|'rejected', handle, kind,
//              name, look, campus, school, verified, salutation, say?, reasons? }
//   error    { ok: false, error: 'edu' | 'campus' | 'throttle' | 'salutation'
//              | 'nonce' | 'no_session' | 'removed' | 'name' | 'handle'
//              | 'empty' | 'cap' | 'write', ... }
//
// An @-note goes up as version 1's letters do: layer 1 before, the write at
// `live`, and the reading after the answer. The schema decides who may write
// one (wall_write v2: `edu`, `campus`) and which school it carries.
//
// A name note is read BEFORE it is written, by the classifier itself: it
// needs no proof, so nothing stands between a stranger and the wall but the
// reading. A pass writes it `live`; a review, or no classifier configured,
// writes it `pending` for the desk; a reject writes it `rejected`. The lexicon
// that spares most @-notes a model call is not a pass here, because "no
// classifier configured" has to hold a note for the desk, not wave it up.
// Name notes are throttled, five a device and twenty an address a day,
// counted before the reading so a refused note is not a free retry.
//
// The same (device, nonce) answers the first send's answer before anything
// is read or counted, so a draft posted from two tabs is one letter, one
// reading and one throttle.
const NONCE = /^[A-Za-z0-9_-]{8,64}$/

function clientIp(req: Request): string | null {
  return req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null
}

// deno-lint-ignore no-explicit-any
function answerV2(a: any, extra: Record<string, unknown> = {}) {
  const status = String(a.status)
  const say = status === 'pending'
    ? `it's being read. it goes up once it passes.`
    : status === 'rejected' ? `it can't go up as it's written.` : undefined
  return json({
    ok: true,
    id: a.id,
    status,
    handle: a.handle ?? null,
    kind: a.kind ?? null,
    name: a.name ?? null,
    look: a.look ?? null,
    campus: a.campus ?? null,
    school: a.school ?? null,
    verified: a.verified === true,
    salutation: a.salutation ?? null,
    ...(say ? { say } : {}),
    ...(status === 'rejected' && Array.isArray(a.reasons) ? { reasons: a.reasons } : {}),
    ...extra,
  })
}

async function v2(p: Record<string, unknown>, req: Request): Promise<Response> {
  const token = String(p.token || '')
  const kind = p.kind === 'name' ? 'name' : 'handle'
  const target = kind === 'handle' ? String(p.target || '').trim() : ''
  const name = kind === 'name' ? String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 30) : null
  const body = String(p.body || '').slice(0, 280)
  const source = p.source ? String(p.source).slice(0, 32) : null
  const look = cleanLook(p.look)
  const pickRaw = p.campus == null ? '' : String(p.campus).toLowerCase()
  const pick = CAMPUS_SLUG.test(pickRaw) ? pickRaw : null
  const nonce = String(p.nonce || '')
  const salRaw = p.salutation == null ? '' : String(p.salutation).replace(/\s+/g, ' ').trim()
  const salutation = salRaw === '' ? null : salRaw

  if (!body.trim()) return json({ ok: false, error: 'empty' })
  if (kind === 'name' && !name) return json({ ok: false, error: 'name' })
  if (kind === 'handle' && !target) return json({ ok: false, error: 'handle' })
  if (!NONCE.test(nonce)) return json({ ok: false, error: 'nonce' })
  if (token.length < 16 || token.length > 256) return json({ ok: false, error: 'no_session' })
  if (salutation !== null && salutation.length > 40) return json({ ok: false, error: 'salutation' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── the same draft, again ──
  const { data: replay, error: replayErr } = await supabase.rpc('wall_write_replay', { p_token: token, p_nonce: nonce })
  if (replayErr) {
    console.error('wall_write_replay failed', replayErr.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (replay && replay.ok) return answerV2(replay, { replay: true })

  // ── the dear line goes through the same list as the words ──
  if (salutation !== null) {
    const s = deterministic(salutation)
    if (s.verdict === 'reject') return json({ ok: false, error: 'salutation', reasons: s.reasons })
  }

  // ── a name note is counted before it is read ──
  if (kind === 'name') {
    const { data: allowed, error: thErr } = await supabase.rpc('wall_name_throttle_take', {
      p_token: token,
      p_ip: clientIp(req),
    })
    if (thErr) {
      console.error('wall_name_throttle_take failed', thErr.message)
      return json({ ok: false, error: 'write' }, 500)
    }
    if (allowed !== true) return json({ ok: false, error: 'throttle' })
  }

  // ── layer 1, on the name, the dear line and the words ──
  const layer1 = deterministic(`${name || ''}\n${salutation || ''}\n${body}`)
  const caught = layer1.verdict === 'reject'
  const at = new Date().toISOString()
  const addressee = kind === 'name' ? String(name) : `@${target.replace(/^@+/, '')}`
  const reading = salutation ? `${salutation}\n${body}` : body

  let status: 'live' | 'pending' | 'rejected'
  let moderation: Record<string, unknown>
  if (caught) {
    status = 'rejected'
    moderation = { verdict: 'reject', reasons: layer1.reasons, flagged: false, at, model_layer: 1 }
  } else if (kind === 'name') {
    // read before it is written
    let out: { verdict: string; reasons: string[]; model: string }
    try {
      out = await classify(reading, null, addressee)
    } catch {
      out = { verdict: 'review', reasons: ['unreachable'], model: '' }
    }
    const hits = needsReading(`${addressee}\n${reading}`)
    if (out.verdict !== 'pass') {
      out.reasons = [...new Set([...out.reasons, ...hits.map((h) => `lex:${h}`)])].slice(0, 8)
    }
    status = out.verdict === 'pass' ? 'live' : out.verdict === 'reject' ? 'rejected' : 'pending'
    moderation = {
      verdict: out.verdict, reasons: out.reasons, flagged: out.verdict === 'review',
      at, screened_at: new Date().toISOString(), model_layer: 3, model: out.model || null, before: true,
    }
  } else {
    status = 'live'
    moderation = { verdict: 'unread', reasons: [], flagged: false, at, model_layer: 0 }
  }

  // ── the write: the schema decides who, where and whether ──
  const { data, error } = await supabase.rpc('wall_write', {
    p_token: token,
    p_kind: kind,
    p_target: kind === 'handle' ? target : null,
    p_name: name,
    p_salutation: salutation,
    p_body: body,
    p_look: look,
    p_campus_pick: pick,
    p_source: source,
    p_status: status,
    p_moderation: moderation,
    p_nonce: nonce,
  })
  if (error) {
    console.error('wall_write v2 failed', error.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!data?.ok) return json({ ...data, ok: false, error: String(data?.error ?? 'write') })
  if (data.replay) return answerV2(data, { replay: true })

  // ── told, and read where it stands ──
  if (data.status === 'live') {
    const topics = [...new Set([String(data.campus || 'global'), 'global'])]
    const work: Promise<unknown>[] = topics.map((t) => nudge(t))
    if (kind === 'handle') {
      // a reject takes it down and tells the one wall (`global`), which is
      // where the build that sent `v: 2` is listening
      work.push(readWhereItStands(supabase, String(data.id), reading, null, 'global', addressee))
    }
    const inline = after(Promise.all(work))
    if (inline) await inline
  }
  return answerV2(data, caught ? { reasons: layer1.reasons } : {})
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
    kind?: string | null
    name?: string | null
    look?: unknown
  }
  try { payload = await req.json() } catch { return json({ ok: false, error: 'malformed' }, 400) }
  if ((payload as { v?: unknown })?.v === 2) return await v2(payload as Record<string, unknown>, req)

  const token = String(payload.token || '')
  const target = String(payload.target || '')
  const body = String(payload.body || '').slice(0, 280)
  const sealed = payload.sealedLine ? String(payload.sealedLine).slice(0, 90) : null
  const source = payload.source ? String(payload.source).slice(0, 32) : null
  // which wall: the campus, or the one at the root (0057). The schema
  // refuses a slug it does not have a row for.
  const campusRaw = String(payload.campus || 'berkeley').toLowerCase()
  const campus = CAMPUS_SLUG.test(campusRaw) ? campusRaw : 'berkeley'
  // ── a name, or a handle (0053) ──
  const kind = payload.kind === 'name' ? 'name' : 'handle'
  const name = kind === 'name' ? String(payload.name || '').replace(/\s+/g, ' ').trim().slice(0, 30) : null
  // ── and the paper (0055) ──
  const look = cleanLook(payload.look)

  if (!body.trim()) return json({ ok: false, error: 'empty' })
  if (kind === 'name' && !name) return json({ ok: false, error: 'name' })
  if (kind === 'handle' && !target.trim()) return json({ ok: false, error: 'handle' })
  if (token.length < 16 || token.length > 256) return json({ ok: false, error: 'no_session' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── layer 1 ────────────────────────────────────────────────────────────────
  // A catch is written at rejected, with the pattern that caught it, and never
  // published. The app caught it at the keyboard first and shook the card;
  // this is the same list where nobody can edit it out. The name goes through
  // the list with the words: an addressee that is a slur, a number or a link
  // is caught here, before anything is up.
  const layer1 = deterministic(`${name || ''}\n${body}\n${sealed || ''}`)
  const caught = layer1.verdict === 'reject'

  // ── the write ──────────────────────────────────────────────────────────────
  // wall_write is the authority on the gate, the name and the allowance: a
  // person outside the wall's gate is told so, a name that came off the wall
  // stays off it, and the fourth letter in a week is refused in the same
  // statement that would have inserted it.
  const args = {
    p_token: token,
    p_target: target,
    p_body: body,
    p_seal: sealed,
    p_source: source,
    p_campus: campus,
    p_status: caught ? 'rejected' : 'live',
    p_moderation: caught
      ? { verdict: 'reject', reasons: layer1.reasons, flagged: false, at: new Date().toISOString(), model_layer: 1 }
      // up, and not yet read: the reading writes its verdict over this
      : { verdict: 'unread', reasons: [], flagged: false, at: new Date().toISOString(), model_layer: 0 },
  }
  // The eleven argument write (0055) carries the kind, the name and the
  // look; the ten argument one (0053) the kind and the name. A database that
  // is a migration behind answers that the function does not exist, and the
  // write steps down.
  let { data, error } = await supabase.rpc('wall_write', { ...args, p_kind: kind, p_name: name, p_look: look })
  if (error) {
    console.warn('wall_write with a look refused, trying the ten argument write', error.message)
    ;({ data, error } = await supabase.rpc('wall_write', { ...args, p_kind: kind, p_name: name }))
  }
  if (error && kind === 'handle') {
    console.warn('wall_write with a kind refused, trying the eight argument write', error.message)
    ;({ data, error } = await supabase.rpc('wall_write', args))
  }

  if (error) {
    console.error('wall_write failed', error.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!data?.ok) return json({ ok: false, error: String(data?.error ?? 'write') })

  // What the letter is filed under, said back: the key (a handle, or a tilde
  // and the folded name), the kind and the name as it will be printed, so the
  // browser can light the disc it is about without deriving the key itself.
  const filed = {
    handle: data.handle ?? (kind === 'handle' ? target : null),
    kind: data.kind ?? kind,
    name: data.name ?? name,
    look: data.look === undefined ? null : data.look,
  }

  if (caught) return json({ ok: true, status: 'rejected', id: data.id, reasons: layer1.reasons, ...filed })

  // ── the reading, after the answer ──────────────────────────────────────────
  // The letter is on the wall. The writer hears so now, every wall on the
  // campus is told the index moved, and the letter is read where it stands.
  const addressee = kind === 'name' ? String(name) : `@${target}`
  const work = Promise.all([nudge(campus), readWhereItStands(supabase, String(data.id), body, sealed, campus, addressee)])
  const inline = after(work)
  if (inline) await inline

  return json({ ok: true, status: 'live', id: data.id, ...filed })
})

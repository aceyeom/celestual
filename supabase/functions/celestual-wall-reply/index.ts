// CELESTUAL: celestual-wall-reply, the one way a reply goes under a letter.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Every reply is READ BEFORE IT IS WRITTEN. The list, the rule that it    ║
// ║  names nobody else, and then the classifier. A pass goes up, a review    ║
// ║  waits for a person, a reject is refused, and no classifier holds it.   ║
// ║                                                                          ║
// ║  Deploy:  supabase functions deploy celestual-wall-reply                 ║
// ║  Secrets: MODERATION_API_KEY, optionally MODERATION_MODEL (the same two  ║
// ║           celestual-wall-moderate reads)                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Contract (migration 0068):
//   POST { token, letter, body, nonce, accept? }
//     token   this device's session (api/identity.js `sessionToken`)
//     letter  the letter's id
//     body    up to 280 characters
//     nonce   /^[A-Za-z0-9_-]{8,64}$/, one per draft: the same (device,
//             nonce) answers the first send's answer and writes nothing new
//     accept  the person accepting the terms for replying with this send.
//             Needed once; without it a person who has not accepted is
//             answered `terms` and nothing is read. With it, the agreement
//             is kept before the reply is read, whatever the reading says
//   { ok: true, id, status: 'live'|'held'|'rejected', recipient, say?, reasons?, replay? }
//   { ok: false, error: 'edu'|'locked'|'closed'|'gone'|'terms'|'throttle'
//                      |'caught'|'empty'|'long'|'nonce'|'no_session'|'write', reasons? }
//
// ── why it reads before, when the letters read after ────────────────────────
// An @-note goes up at once and is read where it stands (celestual-wall-
// moderate), because a letter held with a spinner over it was its own harm
// to the writer. A reply is the other side of that: it lands under somebody
// else's letter, in a thread the person the letter is to may be reading, and
// a pile on is a crowd, not a writer. So it is read the way a name note is,
// before anything is stored, and a reply the reading is unsure of waits for a
// person and is shown to its writer alone while it does.
//
// ── nobody else ─────────────────────────────────────────────────────────────
// A reply is about the letter and the person it is to. It never names or tags
// anybody else: no @ at all, no word shaped like a handle, and no full name,
// which is two capitalised words side by side that are neither of them a
// word a sentence starts with or a place, or a first name followed by a
// surname. The same lists are in app/src/wall/replies-check.js, where the
// writer is told at the keyboard what was caught, and in the database
// (`wall_reply_caught`), where nothing can edit them out.
//
// ── the classifier ──────────────────────────────────────────────────────────
// celestual-wall-moderate's call, its model and its category schema, with a
// prompt written for a reply and two more names on the list: `third`, a
// person other than the addressee named or pointed at, and `pile`, a reply
// that is only abuse aimed at the addressee, which a person reads rather than
// a model refusing. The letter travels with the reply so the reading has
// what the reply is answering.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// ── layer 1: the letters' list ──────────────────────────────────────────────
// celestual-wall-moderate's, byte for byte. A slur, a link, an email, a phone
// number, a street address, a room.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]

const PATTERNS: Array<{ id: string; re: RegExp; digits?: number }> = [
  { id: 'url',     re: /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
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

function deterministic(text: string): string[] {
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
  return reasons
}

// ── layer 1: nobody else ────────────────────────────────────────────────────
// The lists, as app/src/wall/replies-check.js and 0068 `wall_reply_caught`
// carry them. A first name that is also a word (will, grace, may) and a
// surname that is (white, young, park) are left off on purpose: the rule has
// to catch "sarah kim" without catching "sam do it".
const FIRST = new Set(('aaron abby abigail adam adrian ahmed aidan aiden aisha alan alex alexa alexander alexis ali alice alicia alina alison alyssa amanda amelia amir amy ana andre andrea andrew andy angela anika anna annie anthony antonio arjun ari ariana ariel ashley austin ava aya ayesha bella ben benjamin beth bianca blake brandon brendan brian brianna brittany brooke bryan caleb cameron camila carlos carmen caroline carter catherine charlotte chelsea chloe chris christian christina christopher claire clara colin connor dani daniel daniela danielle darius david derek devin diana diego dominic dylan eduardo eli elena eliana elias elijah elizabeth ella ellie emily emma eric erica erik ethan evan evelyn farah fatima felix fernando gabby gabriel gabriela gabriella george gianna greg hailey hana hannah harry hassan hector henry hugo ian isaac isabel isabella isabelle ivan jacob jake james jamie jane jared jasmine jason javier jayden jen jenna jennifer jenny jeremy jesse jessica jin joel joey john jonah jonathan jordan jorge jose joseph josh joshua juan jules julia julian juliana julie justin kai karen karina kate katherine katie kayla kaylee keith kelly kenji kevin kim kimberly kyle laila laura lauren layla leah leila leo leon liam linda lisa logan lorenzo lucas lucia lucy luis luke lydia madeline madison marco marcus maria mariah mariana marissa martin mason matt matthew maya megan melissa mia michael michelle miguel mike mila mina mohamed mohammed muhammad nadia naomi natalia natalie nathan nicholas nick nicole nikhil nina noah noor nora nour olivia omar oscar owen pablo paige paul pilar priya rachel rafael rahul raj rebecca ren riley rohan ryan sabrina sam samantha samir samuel sara sarah sean sebastian serena shreya simon sofia sophia sophie stephanie steven tara taylor thom thomas tiffany timothy tony tyler valentina valeria vanessa victor victoria vivian wei william xavier yasmin yuki yusuf zach zachary zara zoe').split(' '))
const SURNAMES = new Set(('smith johnson williams brown jones garcia miller davis rodriguez martinez hernandez lopez gonzalez wilson anderson thomas taylor moore jackson martin lee perez thompson harris sanchez clark ramirez lewis robinson walker allen wright scott torres nguyen flores adams nelson baker rivera campbell mitchell carter roberts gomez phillips evans turner diaz parker cruz edwards collins reyes stewart morris morales murphy rogers gutierrez ortiz morgan cooper peterson bailey kelly howard ramos kim cox richardson watson chavez james bennett mendoza ruiz hughes alvarez castillo sanders patel myers ross foster jimenez chen wang li zhang liu yang huang zhao wu zhou xu lin guo luo tran pham huynh dang bui ngo duong choi jung kang cho yoon jang lim han seo shin kwon hwang ahn yoo singh kumar shah sharma gupta khan hussain cohen levy friedman schwartz silva santos oliveira costa rossi russo muller schmidt fischer weber meyer wagner becker tanaka suzuki sato takahashi watanabe ito yamamoto nakamura kobayashi kato echevarria okonkwo kwarteng haddad brandt iversen villarreal arroyo yeom').split(' '))
const STOP = new Set(("i im ive id ill the a an and but or so if then than this that these those there here it its you your youre yours we our us he she they them him her his hers my me mine is are was were be been am do did does dont not no yes yeah yep nope ok okay oh ah hi hey hello bye lol lmao omg wow ya yo what who why how when where which just also too very really love loved like liked happy merry thank thanks good great best dear god jesus christ lord mr mrs ms dr prof professor uc cal berkeley stanford oakland san francisco bay area california doe moffitt sproul sather wheeler dwinelle haas soda evans cory memorial glade gate hall library stadium plaza street st avenue ave road rd park campus college university school class dorm unit north south east west new york los angeles monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december christmas halloween valentine valentines easter thanksgiving birthday instagram insta google tiktok snapchat snap twitter facebook spotify netflix iphone apple english spanish french chinese korean japanese american asian african european mexican indian math physics chemistry biology econ history science go bears golden bear big game never always every everyone everybody someone somebody nobody all some one two please sorry same honestly literally anyway maybe well still nah idk tbh ngl fr pls plz congrats congratulations welcome sincerely xoxo miss missed hope hoping praying rip bless").split(' '))

const TITLE = /^[A-Z][a-z]+$/
const HANDLE = /^[a-z0-9]{2,}([._][a-z0-9]{2,})+$/i

function thirdParty(text: string): string[] {
  const t = String(text || '')
  const out: string[] = []
  if (t.includes('@')) out.push('tag')
  const words = t.trim().split(/\s+/).filter(Boolean)
  if (!out.includes('tag')) {
    for (const raw of words) {
      const w = raw.replace(/^[^A-Za-z0-9_.]+|[^A-Za-z0-9_.]+$/g, '').replace(/\.+$/, '')
      if (HANDLE.test(w) && /[a-z]/i.test(w)) { out.push('tag'); break }
    }
  }
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i]
    const b = words[i + 1]
    if (/[^A-Za-z'’]$/.test(a) || !/^[A-Za-z]/.test(b)) continue
    const aw = a.replace(/^[^A-Za-z]+/, '').replace(/['’]s$/, '')
    const bw = b.replace(/[^A-Za-z'’]+$/, '').replace(/['’]s$/, '')
    if (!aw || !bw) continue
    const al = aw.toLowerCase()
    const bl = bw.toLowerCase()
    const pair = TITLE.test(aw) && TITLE.test(bw) && !STOP.has(al) && !STOP.has(bl)
    const first = FIRST.has(al) && (SURNAMES.has(bl) || (TITLE.test(bw) && !STOP.has(bl)))
    if (pair || first) { out.push('name'); break }
  }
  return out
}

// ── layer 3: the classifier ─────────────────────────────────────────────────
// The letters' seven consequences, and two that only a reply can have.
const SYSTEM_PROMPT = `You screen short anonymous replies before they are posted under a letter on a public wall. The letter is addressed to one person, by an Instagram handle or a first name, and that person may read the replies. A reply is written by a verified student, or by the addressee themself. You are given the addressee, the letter, and the reply.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

REPLIES ARE FOR ANSWERING THE LETTER. Agreement, support, sympathy, teasing, jokes, disagreement, "say it to their face", "this is so sweet", and the addressee answering are all allowed. Rudeness, sarcasm and profanity are allowed. Your default is PASS, and most replies are a PASS.

Moderate the CONSEQUENCE, not the emotion. REJECT only if one of these is clearly true:
1. threat: a threat of violence, a wish for their death or injury stated as intent, intimidation, "I know where you live", stalking, or any promised consequence to their body, home or safety.
2. locate: a way to find the addressee or anybody else at a predictable time and place: a schedule, a route, an address, a room, a workplace shift.
3. sexual: explicit sexual content about a person, a sexualised description of their body, or a claim about their sexual history.
4. minor: a person is stated or clearly implied to be under 18 in a sexual or romantic reply.
5. expose: a private fact disclosed about a person that costs them something: their sexuality or gender, a health, pregnancy, immigration or legal status, an addiction, a debt, or a threat to leak images or messages.
6. hate: a slur, or contempt for a person's race, ethnicity, religion, disability, gender or sexuality as such.
7. contact: a phone number, a street address, a room number, a link, an email address or a social handle.
8. third: the reply names, tags or singles out a person other than the addressee: a full name, a handle, or a description precise enough to identify somebody else. The addressee's own first name is allowed.

REVIEW, never reject, for:
9. pile: a reply whose only content is abuse aimed at the addressee's body, looks or worth, or that urges others to go after them.

The reply has NOT been posted. A PASS posts it; a REVIEW holds it until a person reads it; a REJECT refuses it. REVIEW only for pile, or when you genuinely cannot tell which side of one of the eight a reply falls on. Never review or reject a reply for being blunt, crude, sad, angry, sarcastic or embarrassing.

Reasons: one word each, from the category names above, or [] on a pass.`

type Reading = { verdict: string; reasons: string[]; model: string }

async function classify(reply: string, letter: string, addressee: string): Promise<Reading> {
  const key = Deno.env.get('MODERATION_API_KEY')
  const model = Deno.env.get('MODERATION_MODEL') || 'claude-haiku-4-5-20251001'
  // No key is not a verdict on the reply. It is a fact about the deploy, the
  // reply waits for a person, and the desk sees why.
  if (!key) return { verdict: 'review', reasons: ['unconfigured'], model }

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      // Somebody is waiting on this one, so the bound is shorter than the
      // letters' reading after the fact
      signal: AbortSignal.timeout(12_000),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        temperature: 0,
        system: SYSTEM_PROMPT,
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
          content: `<addressee>${addressee}</addressee>\n<letter>${letter}</letter>\n<reply>${reply}</reply>`,
        }],
      }),
    })
  } catch {
    return { verdict: 'review', reasons: ['classifier_timeout'], model }
  }
  if (!res.ok) return { verdict: 'review', reasons: ['classifier_error'], model }

  const data = await res.json()
  if (data?.stop_reason === 'refusal') return { verdict: 'review', reasons: ['classifier_refused'], model }
  if (data?.stop_reason === 'max_tokens') return { verdict: 'review', reasons: ['unparsed'], model }
  const block = Array.isArray(data?.content) ? data.content.find((b: { type?: string }) => b?.type === 'text') : null
  const text = String(block?.text || '').trim()
  try {
    const whole = text.replace(/^```json\s*|\s*```$/g, '')
    const at = whole.indexOf('{')
    const end = whole.lastIndexOf('}')
    const out = JSON.parse(at >= 0 && end > at ? whole.slice(at, end + 1) : whole)
    const reasons = Array.isArray(out.reasons) ? out.reasons.slice(0, 6).map(String) : []
    // `pile` is a person's to decide, whatever the model said about it
    let v = out.verdict === 'pass' || out.verdict === 'reject' ? out.verdict : 'review'
    if (v === 'reject' && reasons.length && reasons.every((r: string) => r === 'pile')) v = 'review'
    return { verdict: v, reasons, model }
  } catch {
    return { verdict: 'review', reasons: ['unparsed'], model }
  }
}

const NONCE = /^[A-Za-z0-9_-]{8,64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// What the writer is told, in the product's words (design/VOICE.md).
function said(status: string): string | undefined {
  // The held reply is already in the thread, marked for its writer alone
  // (app/src/wall/Replies.jsx); what waits on the reading is everybody else.
  if (status === 'held') return `it's being read. others see it once it passes.`
  if (status === 'rejected') return `it can't go up as it's written.`
  return undefined
}

// deno-lint-ignore no-explicit-any
function answer(a: any, extra: Record<string, unknown> = {}) {
  const status = String(a.status)
  const say = said(status)
  return json({
    ok: true,
    id: a.id,
    status,
    recipient: a.recipient === true,
    ...(say ? { say } : {}),
    ...(status === 'rejected' && Array.isArray(a.reasons) ? { reasons: a.reasons } : {}),
    ...extra,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)

  let p: Record<string, unknown>
  try { p = await req.json() } catch { return json({ ok: false, error: 'malformed' }, 400) }

  const token = String(p.token || '')
  const letter = String(p.letter || '')
  const body = String(p.body || '').replace(/\r\n?/g, '\n').trim()
  const nonce = String(p.nonce || '')
  const accept = p.accept === true

  if (!UUID.test(letter)) return json({ ok: false, error: 'gone' })
  if (!body) return json({ ok: false, error: 'empty' })
  if (body.length > 280) return json({ ok: false, error: 'long' })
  if (!NONCE.test(nonce)) return json({ ok: false, error: 'nonce' })
  if (token.length < 16 || token.length > 256) return json({ ok: false, error: 'no_session' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── the same send, again ──
  const { data: replay, error: replayErr } = await supabase.rpc('wall_reply_replay', { p_token: token, p_nonce: nonce })
  if (replayErr) {
    console.error('wall_reply_replay failed', replayErr.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (replay && replay.ok) return answer(replay, { replay: true })

  // ── may this device reply here at all ──
  // Asked before anything is read, so a refusal never spends a reading.
  const { data: can, error: canErr } = await supabase.rpc('wall_reply_can', { p_token: token, p_letter: letter })
  if (canErr) {
    console.error('wall_reply_can failed', canErr.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!can?.ok) return json({ ok: false, error: String(can?.error || 'write') })
  if (!can.terms && !accept) return json({ ok: false, error: 'terms' })

  // ── the terms, agreed with this send ──
  // Kept now, before the list reads the reply. The write keeps them too, but
  // a reply the list catches is never written, and its writer, who agreed a
  // moment ago, was asked to agree again on the next send. A failure here is
  // not the reply's: the write asks for the agreement again and keeps it.
  if (!can.terms && accept) {
    const { error: agreeErr } = await supabase.rpc('wall_reply_agree', { p_token: token })
    if (agreeErr) console.error('wall_reply_agree failed', agreeErr.message)
  }

  // ── layer 1: the list, and nobody else ──
  const caught = [...deterministic(body), ...thirdParty(body)]
  if (caught.length) return json({ ok: false, error: 'caught', reasons: [...new Set(caught)] })

  // ── the reading ──
  let out: Reading
  try {
    out = await classify(body, String(can.letter_body || ''), String(can.addressee || ''))
  } catch {
    out = { verdict: 'review', reasons: ['unreachable'], model: '' }
  }
  const status = out.verdict === 'pass' ? 'live' : out.verdict === 'reject' ? 'rejected' : 'held'
  const moderation = {
    verdict: out.verdict,
    reasons: out.reasons,
    model: out.model || null,
    at: new Date().toISOString(),
    before: true,
  }

  // ── the write: the schema has the last word on who, where and whether ──
  const { data, error } = await supabase.rpc('wall_reply_write', {
    p_token: token,
    p_letter: letter,
    p_body: body,
    p_status: status,
    p_moderation: moderation,
    p_nonce: nonce,
    p_accept: accept,
  })
  if (error) {
    console.error('wall_reply_write failed', error.message)
    return json({ ok: false, error: 'write' }, 500)
  }
  if (!data?.ok) return json({ ...data, ok: false, error: String(data?.error ?? 'write') })
  return answer(data, data.replay ? { replay: true } : {})
})

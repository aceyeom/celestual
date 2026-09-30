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
// that urges others on or joins a crowd going after the addressee, which a
// person reads rather than a model refusing. A reply that is nothing but
// abuse hurled at the person is `abuse` since 30 September, and refused,
// as a letter would be. The letter travels with the reply so the reading has
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

// ── the words, folded flat ──────────────────────────────────────────────────
// app/src/wall/moderate.js `norm`, character for character, and the
// database's `celestual_text_norm` (migration 0078): lower case, NFKD with
// the accents off (fullwidth letters come out plain), the Cyrillic and Greek
// letters drawn like Latin ones as Latin, the few emoji that are sexual when
// aimed at a person as word tokens nobody types, apostrophes out, dots,
// underscores and hyphens to spaces, a run of three or more single letters
// joined ("n i g g e r", "k y s"), leet inside a word that has a letter in
// it and never in a bare number, everything else to a space, a run of three
// of one letter cut to two, and the spaces closed. Every rule below that
// reads words reads these; the contact patterns read the words as typed.
// scripts/check-moderation.mjs runs this block and moderate.js over the same
// tables and fails if they disagree.
const LOOK_FROM = 'авеёкмнорстухіїјѕԁɡһαβεηικνορτυχωγ'
const LOOK_TO = 'abeekmhopctyxiijsdghabeniknoptuxwy'
const EMOJI_WORDS: Array<[RegExp, string]> = [
  [/\u{1F449}\s*\u{1F44C}/gu, ' empoke '],
  [/\u{1F346}/gu, ' emeggplant '],
  [/\u{1F351}/gu, ' empeach '],
  [/\u{1F4A6}/gu, ' emdroplets '],
  [/\u{1F445}/gu, ' emtongue '],
]
function leet(w: string): string {
  if (!/[a-z]/.test(w)) return w
  return w.replace(/^[!|*@]+|[!|*@]+$/g, '')
    .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/\*/g, '')
}
function norm(s: string): string {
  let t = String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  t = t.replace(/[\u0080-\uffff]/g, (c) => { const i = LOOK_FROM.indexOf(c); return i < 0 ? c : LOOK_TO[i] })
  for (const [re, word] of EMOJI_WORDS) t = t.replace(re, word)
  t = t.replace(/['\u2019`]/g, '').replace(/[._-]/g, ' ')
  t = t.replace(/(^|[^a-z0-9@$!|])((?:[aiu] )?)((?:[a-z0-9@$!|] ){2,}[a-z0-9@$!|])(?![a-z0-9@$|])/g, (_m, a, lead, run) => a + lead + run.replace(/ /g, ''))
  t = t.replace(/[a-z0-9@$!|*]+/g, leet)
  return t.replace(/[^a-z0-9\s]/g, ' ').replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim()
}

// Slurs against a protected class are a consequence, not a tone: on a public
// wall under somebody's name they are harassment of that person, whatever
// the framing. Profanity is not on this list and never will be. Read over
// the folded words, every letter allowed to repeat and a plural on the end
// (30 September: "you niggers" and "faggots" went past the singular), with
// two idioms that carry a slur's letters and none of its meaning taken out.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'trannie', 'retard', 'retarded', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale',
]
const SLUR_RES = SLURS.map((s) => new RegExp(`\\b${s.split('').map((c) => `${c}+`).join('')}(?:s|es|z|ies)?\\b`))
const NOT_SLURS = /\bspick? (?:and|n) span\b|\bchinks? in (?:the|his|her|my|your|their) armou?r\b/g
function slurred(n: string): boolean {
  const t = n.replace(NOT_SLURS, ' ')
  return SLUR_RES.some((re) => re.test(t))
}

// Contact, read over the words as typed. Loosened on 30 September where it
// refused memories that carry no contact at all ("the same dorm 2 years
// ago", "#2019", "20 minutes each way", "23 points on court", "you.me",
// "1000000000 hugs"); a real address, room, link or number still comes off.
const COUNTED = 'minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|weeks?|months?|years?|yrs?|times?|people|points?|pts|miles?|km|feet|ft|steps?|dollars?|bucks|games?|goals?|reps?|laps?|kids?|friends?|percent|degrees?|pages?|words?|texts?|messages?|calls?|nights?|of'
const PATTERNS: Array<{ id: string; re: RegExp; digits?: number }> = [
  { id: 'url',     re: /(https?:\/\/|www\.|\b(?!(?:you|u|me|us|it|so|to|and|love|miss|home|time|here|there|this|that|with|for|all|see|call|text)\.(?:me|co|ly|io|gg)\b)[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // a run that looks like a number, then at least nine digits in it and no
  // full stop: "since 2019. 2020 was the year" is two years and a sentence
  { id: 'phone',   re: /(\+?\d[\d\s().-]{8,}\d)/, digits: 9 },
  { id: 'address', re: new RegExp(`\\b\\d{2,5}\\s+(?!(?:${COUNTED})\\b)[A-Za-z][A-Za-z.'-]*(\\s+[A-Za-z][A-Za-z.'-]*)?\\s+(?<!\\b(?:each|the|all|on|in|at|a|my|your|every|one|other|that|this|no|any|half|out|to|for|by|his|her|their|our)\\s)(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\\b`, 'i') },
  { id: 'room',    re: new RegExp(`\\b(room|rm|apt|apartment|suite|ste|dorm)\\s*#?\\s*\\d{1,4}[a-z]?\\b(?!\\s*(?:${COUNTED})\\b)|#\\s?(?!(?:19|20)\\d\\d\\b)\\d{3,4}\\b`, 'i') },
]
function phoneLike(m: string): boolean {
  const d = m.replace(/\D/g, '')
  return d.length >= 9 && !/\.\s/.test(m) && !/^\d(\d)\1+$/.test(d)
}

// What only public words may not carry (30 September): a sexual proposition
// aimed at the person in its surest shapes, and telling them to hurt
// themselves. Never the fuck word alone ("fuck you for leaving" goes up), and
// never in a private note's list (`celestual_text_caught`), where flirting is
// between two people who both asked. moderate.js has the long reasons.
const FK0 = '(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+)'
const FK = `${FK0}(?:ing|in|n|ed|s)?`
const LEADS = 'lets|let us|wanna|wana|want to|tryna|trying to|gonna|going to|finna|(?<!\\b(?:my|your|his|her|the|an|their|student|photo) )id|ill|i would|i will|we should|lemme|let me|can i|could i|come|down to|would you|will you'
const NOT_SEX = '(?!\\s+(?:up|around|about|off|over|with|it|this|that|shit|stuff|things|everything|the|my|his|her|their|our|them|us|school|class|work|your (?:life|shit|day|car|plans|world|stuff|game|chances))\\b)(?!\\s+(?:you|u|ya|me|him|her|them) (?:up|over)\\b)'
const AFTER = '(?=\\s*$|\\s+(?:tbh|ngl|lol|lmao|fr|ong|rn|tonight|already|babe|baby|honestly|and|but|anyway|though|tho)\\b)'
const EM = '(?:emeggplant|empeach|emdroplets|emtongue)'
const WALL_ONLY: Array<{ id: string; re: RegExp }> = [
  { id: 'sexual', re: new RegExp([
    `\\b(?:${LEADS})(?:\\s+(?:just|finally|so|really|already|now))?\\s+${FK0}\\b${NOT_SEX}`,
    `\\b${FK} me (?:daddy|mommy|mami|papi|baby|babe|harder|hard|senseless)\\b`,
    '\\bdtf\\b',
    '\\b(?:send|drop|show) (?:me )?(?:(?:your|ur|some) )?(?:nudes|noods|nudez|nude pics|naked pics|tits|titties|boobs|dick pics?|cock|pussy)\\b',
    '\\bsit on (?:my|your|ur) (?:face|dick|cock)\\b',
    '\\bride (?:my|your|ur) (?:face|dick|cock)\\b',
    '\\bsuck (?:my|me|your|ur) (?:dick|cock|balls|tits)\\b|\\bsuck (?:you|u|me) off\\b',
    '\\b(?:eat|lick) (?:you|u|me) out\\b|\\b(?:eat|lick) (?:your|ur|my) (?:pussy|cock|dick)\\b',
    '\\b(?:give|gimme) (?:me )?(?:head|a blowjob|a bj|a handjob)\\b',
    `\\b(?:${LEADS}|would)\\s+(?:smash|bang|rail|pipe|hit it|hit that|tap that|tap it|clap (?:you|ya|u|it|them cheeks|those cheeks))(?:\\s+(?:you|u|ya|that|it))?${AFTER}`,
    `\\b(?:${LEADS})\\s+${EM}`,
    '\\bempoke\\b',
    `\\b(?:emeggplant|empeach)\\b.*\\b${EM}\\b|\\b(?:emdroplets|emtongue)\\b.*\\b(?:emeggplant|empeach)\\b`,
  ].join('|')) },
  { id: 'harm', re: new RegExp([
    '\\bkys\\b',
    '^(?:kill|unalive|hang) (?:yourself|urself|your self|ur self)\\b',
    '\\b(?:go|just|pls|please|plz|should|shoulda|gotta|need to|hope you|hope u|why dont you|why dont u|can you|can u)\\s+(?:(?!dont|do|not|never|wont)[a-z]+\\s+)?(?:kill|unalive|hang|off|end|drown|shoot|hurt|cut) (?:yourself|urself|yourselves|your self|ur self|yoself)\\b',
    '\\b(?:go|pls|please|plz|just|should)\\s+(?:die|drink bleach|jump off (?:a|the) (?:bridge|building|roof|cliff)|slit your wrists|end it all)\\b',
  ].join('|')) },
]

// ── layer 1: the letters' list ──────────────────────────────────────────────
// celestual-wall-moderate's, byte for byte, the block above included: a
// slur, a link, an email, a phone number, a street address, a room, and the
// two rules only public words carry, since a reply is as public as the
// letter it sits under.
function deterministic(text: string): string[] {
  const reasons: string[] = []
  const n = norm(text)
  if (slurred(n)) reasons.push('slur')
  for (const p of PATTERNS) {
    const m = text.match(p.re)
    if (!m) continue
    if (p.digits && !phoneLike(m[0])) continue
    reasons.push(p.id)
  }
  for (const w of WALL_ONLY) if (w.re.test(n)) reasons.push(w.id)
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
// The letters' eight consequences, and two that only a reply can have.
// Rewritten with the letters' prompt on 30 September to the owner's ruling
// (celestual-wall-moderate has the long reasons): a proposition aimed at the
// person is sexual however short, `abuse` refuses a reply that is nothing but
// profanity or degradation hurled at the person, and a short block of
// examples sets the jokes that stay beside the replies that do not. `pile`
// keeps what is left of what it held, a reply that urges others on or joins
// a crowd going after the person, and is still a person's to decide.
const SYSTEM_PROMPT = `You screen short anonymous replies before they are posted under a letter on a public wall. The letter is addressed to one person, by an Instagram handle or a first name, and that person may read the replies. A reply is written by a verified student, or by the addressee themself. You are given the addressee, the letter, and the reply.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

REPLIES ARE FOR ANSWERING THE LETTER, and the thread has to stay fun. Agreement, support, sympathy, teasing, jokes, roasts, disagreement, "say it to their face", "this is so sweet", and the addressee answering are all allowed. Rudeness, sarcasm and swearing are allowed. Your default is PASS, and most replies are a PASS.

Always PASS:
- swearing inside a feeling or a joke: "fuck, this is so real", "shit this made me cry", "you're the fucking best for posting this"
- teasing and roasts with a point: "their playlist really is a war crime", "the way you just got exposed"
- flirting and innuendo that is not explicit: "kiss them already", "marry them", "you're so fine it's rude"
- comic hyperbole: "i'd fight a bear for this letter", "i could kill you for that haha"

Moderate the CONSEQUENCE, not the emotion. REJECT only if one of these is clearly true:
1. threat: a threat of violence, plainly or veiled ("watch your back", "i know where you live"), a wish for their death or injury stated as intent, intimidation, stalking, or any promised consequence to their body, home or safety. Obvious comic hyperbole is not a threat.
2. locate: a way to find the addressee or anybody else at a predictable time and place: a schedule, a route, an address, a room, a workplace shift.
3. sexual: a sexual proposition, invitation or request aimed at a person, however short, joking, misspelled or spaced out ("lets fuck", "dtf?", "sit on my face", "send nudes", "i'd smash"), including sexual emoji used that way (eggplant, peach, droplets, tongue); an explicit sex act; a sexualised description of their body; or a claim about their sexual history. Flirting and a kiss are not this.
4. minor: a person is stated or clearly implied to be under 18 in a sexual or romantic reply.
5. expose: a private fact disclosed about a person that costs them something: their sexuality or gender, a health, pregnancy, immigration or legal status, an addiction, a debt, or a threat to leak images or messages.
6. hate: a slur, or contempt for a person's race, ethnicity, religion, disability, gender or sexuality as such.
7. contact: a phone number, a street address, a room number, a link, an email address or a social handle.
8. third: the reply names, tags or singles out a person other than the addressee: a full name, a handle, or a description precise enough to identify somebody else. The addressee's own first name is allowed.
9. abuse: a reply whose whole content is profanity or degradation hurled at the addressee, with no joke, feeling or point in it ("fuck you bitch", "you stupid whore", "suck my dick loser"); telling them to kill or hurt themselves, plainly or veiled ("kys", "go jump off a bridge"); or a sexual or gendered slur (whore, slut, cunt) used as an attack. Teasing or cruelty with a point is not this.

REVIEW, never reject, for:
10. pile: a reply that urges others to go after the addressee, or joins a crowd going after their body, looks or worth, without being abuse outright.

Examples (letter / reply => answer):
fuck you for leaving / fuck, this is so real => pass
your playlist is a war crime / it really is lmao => pass
you're so fine it's rude / kiss them already => pass
you're so fine it's rude / babe lets fuck => reject ["sexual"]
you're so fine it's rude / 🍆🍑 => reject ["sexual"]
you ruined my year / fuck you bitch => reject ["abuse"]
you ruined my year / kys => reject ["abuse"]
you ruined my year / everyone go tell them how ugly they are => review ["pile"]

The reply has NOT been posted. A PASS posts it; a REVIEW holds it until a person reads it; a REJECT refuses it. REVIEW only for pile, or when you genuinely cannot tell which side of one of the nine a reply falls on. Never review or reject a reply for being blunt, crude, sad, angry, sarcastic, flirtatious or embarrassing.

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

// CELESTUAL: celestual-wall-moderate, the screen the wall publishes through.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  This is the ONLY path a letter reaches the wall by. It reads an open    ║
// ║  note before it writes it, and writes a verified one at once and reads   ║
// ║  it where it stands.                                                      ║
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
//     key, a colour or a sentence never reaches a row. Since 0076 it also
//     carries `bat`, the battery its writer left it on, 0 to 4.
//     { ok:true,  status:'live',     id }           on the wall, now
//     { ok:true,  status:'rejected', id, reasons }  caught by layer 1: stored,
//                                                   never shown, and the app
//                                                   says it is inappropriate
//     { ok:false, error }                           the write itself was refused
//     { ok:false, error:'cap', limit, used, resets_at }
//                                                   the allowance, spent
//
//   A request with `v: 2` is the one wall's (docs/ONE-WALL.md, migrations
//   0063 and 0066), and is answered by `v2()` below: since 0066 an @-note
//   can go with no proof at all, read before it is written, as a name note
//   is. Without `v: 2`, everything here is as it was.
//
// ── MODERATE THE CONSEQUENCE, NOT THE EMOTION ───────────────────────────────
// The wall is where people say the thing they never said, and a good deal
// of what they never said is unkind. Heartbreak, anger, a grudge, a roast, a
// letter that calls somebody a coward, a letter with every swear word in it
// and a reason under them: that is the product, and a screen that took those down would be taking
// down the wall. What comes down is a letter that can DO something to the
// person it names off the wall: get them found, get them hurt, out them,
// sexualise them or proposition them in public, tell them to hurt
// themselves, or say they are a child. The list is short and it is
// about consequence. Nothing on it is about tone.
//
// ── four layers, and the expensive one reads what it has to ────────────────
//
//   1  DETERMINISTIC   regex, over the words as typed and folded flat
//                      (`norm`): slurs, phones, addresses, room numbers,
//                      URLs, emails, and since 30 September a sexual
//                      proposition aimed at the person and telling them to
//                      hurt themselves, the two rules only public words
//                      carry. Mirrored from app/src/wall/moderate.js, where it
//                      runs at the keyboard and shakes the card, and re-run
//                      HERE because a client-side check is a courtesy to the
//                      writer, not a control on the writer. A catch is
//                      stored at rejected and never published.
//   2  THE LEXICON     a list of the words and shapes that a letter with a
//                      consequence in it nearly always carries: violence,
//                      sex, abuse, a minor, a routine, a place, exposure,
//                      read over the folded words too. On a verified @-note
//                      a letter that matches none of them is passed without
//                      a model call and marked so (`model: 'lexicon'`, which
//                      the desk prints); the model reads what it flagged. It
//                      is a gate, never a verdict.
//   3  CLASSIFIER      one call to the cheapest model, against the short
//                      list of consequences below, with a small output. An
//                      open note (a name note, or an @-note sent without the
//                      Berkeley proof, which is the composer's default) is
//                      read BEFORE it is written, whatever the lexicon says:
//                      a pass goes up, a review waits for the desk, a reject
//                      is refused and the writer is told why. A verified
//                      @-note is written at live and read after the answer:
//                      a reject takes it down (`wall_screened`), and the wall
//                      tells the writer it came down for going against the
//                      terms and hands their words back; a review leaves it
//                      up, flagged for a person at the desk.
//   4  THE DESK        a person, for everything the reading was unsure of.
//
// The line all four keep is the owner's, set on 30 September after "lets
// fuck babe" was read, passed and put up: the wall stays free for comedy,
// jokes, swearing inside a feeling and flirting, and only the plainly bad
// comes off. The list takes the narrowest, surest shapes; the reading takes
// the rest, with the owner's own jokes in its prompt as the ones that pass.
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
// the folded words, every letter allowed to repeat and the plural that stem
// really takes (30 September: "you niggers" and "faggots" went past the
// singular, and a first cut that let every stem take `es` refused "spices"),
// with three idioms that carry a slur's letters and none of its meaning
// taken out. moderate.js has the long reasons, "coon" and "dyke" among them.
const SLURS = [
  'nigger/s', 'nigga/s|z', 'faggot/s', 'fag/s', 'tranny/', 'trannie/s', 'retard/s', 'retarded/', 'kike/s',
  'spic/s', 'chink/s', 'gook/s', 'wetback/s', 'coon/', 'dyke/', 'shemale/s',
]
const SLUR_RES = SLURS.map((x) => {
  const [s, pl] = x.split('/')
  return new RegExp(`\\b${s.split('').map((c) => `${c}+`).join('')}${pl ? `(?:${pl})?` : ''}\\b`)
})
const NOT_SLURS = /\bspick? (?:and|n) span\b|\bchinks? in (?:the|his|her|my|your|their) armou?r\b|\bchinks? of (?:light|sunlight|daylight|sun|hope|blue)\b/g
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
// between two people who both asked. Narrowed the same day to shapes no joke
// could share ("you're gonna smash it", "i could just die" and "cut yourself
// some slack" go up), with everything a joke might share left to the lexicon
// and the reading. moderate.js has the long reasons, rule by rule.
const FK0 = '(?:f+u+c*k+|f+v+c*k+|f+c+k+|f+k+|ph+u+c*k+)'
const FK = `${FK0}(?:ing|in|n|ed|s)?`
const LEADS = 'lets|let us|wanna|wana|want to|tryna|trying to|gonna|going to|finna|(?<!\\b(?:my|your|his|her|the|an|their|student|photo) )id|ill|i would|i will|we should|lemme|let me|can i|could i|come|down to|would you|will you'
const NOT_SEX = '(?!\\s+(?:up|around|about|off|over|with|it|this|that|shit|stuff|things|everything|the|my|his|her|their|our|them|us|school|class|work|your (?:life|shit|day|car|plans|world|stuff|game|chances))\\b)(?!(?:\\s+\\S+){0,3}\\s+(?:up|over|around)\\b)'
const WANTS = '(?<!\\b(?:my|your|his|her|the|an|their|student|photo) )id|i would|i wanna|i want to|i tryna|i need to|i gotta|let me|lemme|can i|could i'
const AFTER = '(?=\\s*$|\\s+(?:tbh|ngl|lol|lmao|fr|ong|rn|tonight|already|babe|baby|honestly|and|but|anyway|though|tho)\\b)'
const EM = '(?:emeggplant|empeach|emdroplets|emtongue)'
const NEG = '(?<!\\b(?:dont|do not|never|not|wont|didnt|shouldnt|cant|no need)\\b.*)'
const NOT_ME = '(?<!\\b(?:i|im|ill|id|ive|we|lets|gonna|wanna|imma|finna|will|would|could|might|may|well|to|all|can|should|gotta|just|pls|please|plz|now|so|then)\\s)'
const SELF = '(?:yourself|urself|yourselves|your self|ur self|yoself)'
const WALL_ONLY: Array<{ id: string; re: RegExp }> = [
  { id: 'sexual', re: new RegExp([
    `\\b(?:${LEADS})(?:\\s+(?:just|finally|so|really|already|now))?\\s+${FK0}\\b${NOT_SEX}`,
    `\\b(?:lets|letus|letme|lemme|wanna|wana|tryna|wantto)${FK0}(?:you|u|me)?\\b`,
    `\\b${FK} me (?:daddy|mommy|mami|papi)\\b`,
    `^(?:(?:babe|baby|please|pls|plz|just|now|come on|so) )*${FK0} me(?: (?:harder|hard|senseless|baby|babe|already|now|tonight|rn|pls|please|plz|daddy|mommy|papi|mami))+$`,
    '\\bdtf\\b',
    '\\b(?:send|drop|show) (?:me )?(?:(?:your|ur|some) )?(?:nudes|noods|nudez|nude pics|naked pics|tits|titties|boobs|dick pics?|cock|pussy)\\b',
    '\\bsit on (?:my|your|ur) (?:face|dick|cock)\\b',
    '\\bride (?:my|your|ur) (?:face|dick|cock)\\b',
    '\\bsuck (?:my|me|your|ur) (?:dick|cock|balls|tits)\\b|\\bsuck (?:you|u|me) off\\b',
    '\\b(?:eat|lick) (?:you|u|me) out\\b|\\b(?:eat|lick) (?:your|ur|my) (?:pussy|cock|dick)\\b',
    '\\b(?:give|gimme) (?:me )?(?:head|a blowjob|a bj|a handjob)\\b(?!\\s+(?:pats?|scratches|rubs?|massages?|starts?|to toe|over heels|first|games?|space|phones?)\\b)',
    `\\b(?:${WANTS})(?:\\s+(?:so|totally|def|definitely|lowkey|highkey|honestly|really|just|fr))?\\s+(?:(?:smash|bang|rail|pipe)(?:\\s+(?:you|u|ya|her|him|them|that|dat))?|(?:hit|tap) (?:it|that|dat)|clap (?:you|ya|u|them cheeks|those cheeks|dem cheeks))${AFTER}`,
    `\\b(?:${LEADS})\\s+${EM}`,
    '\\bempoke\\b',
    '\\bemeggplant (?:empeach|emdroplets|emtongue)\\b|\\bempeach (?:emeggplant|emdroplets|emtongue)\\b|\\b(?:emdroplets|emtongue) (?:emeggplant|empeach)\\b',
  ].join('|')) },
  { id: 'harm', re: new RegExp([
    '\\bkys\\b',
    `${NEG}(?:^|\\b(?:go|pls|please|plz|just|you should|u should|you need to|u need to|you gotta|u gotta|why dont you|why dont u|hope you|hope u|you can|u can|you could|u could)\\s)(?:(?:just|go|and|fucking|fkn|fking|already|pls|please|ahead and|actually|really|seriously)\\s){0,3}(?:kill|unalive|hang|drown|end|shoot) ${SELF}\\b(?!\\s+(?:laughing|over|in the foot|trying|with|doing|for|on|by|out|off)\\b)`,
    `${NEG}\\b(?:you|u|ya) (?:(?:should|shoulda|need to|oughta)(?: just)?(?: go)?(?: and)?|can (?:just )?go) die\\b(?!\\s+(?:on|for|laughing|of|trying|inside|happy|a|in peace|in my arms|with|from|when|if|before|after)\\b)`,
    `${NEG}\\bwhy dont (?:you|u|ya) (?:just )?(?:go )?(?:and )?die\\b(?!\\s+(?:on|for|laughing|of|trying|inside|happy|a|with|from)\\b)`,
    `${NEG}${NOT_ME}(?:\\b(?:just|pls|please|plz|now|so|then) )?\\bgo die\\b(?=\\s*$|\\s+(?:already|pls|please|plz|lol|lmao|loser|bitch|asshole|idiot|in a (?:fire|ditch|hole))\\b)`,
    `${NEG}${NOT_ME}(?:\\b(?:just|pls|please|plz|now|so|then) )?\\bgo (?:drink bleach|jump off (?:a|the) (?:bridge|building|roof|cliff)|slit (?:your|ur) wrists)\\b`,
  ].join('|')) },
]

// ── layer 1 ──────────────────────────────────────────────────────────────────
// The list, read before anything is written: slurs, contact, and the two
// rules only public words carry. A catch is stored at rejected and never
// published, with the ids that caught it, which the composer turns into the
// same sentence the keyboard said (moderate.js `whyNot`).
function deterministic(text: string) {
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
// Not on it, on purpose: "hate", "hurt" in the sense of feelings, "die" on
// its own as in "i would die for you", break-up words, mockery. Those are
// the wall. Swearing is on
// it since 30 September, and only as a gate: a letter that said "lets fuck
// babe" matched no row (the row wanted "fuck you" with its pronoun), so on a
// verified @-note it would have gone up with no model ever reading it. The
// fuck word in any form, the propositions and their slang, the sexual emoji
// (as `norm` spells them) and a new row for abuse, the words a letter that is
// nothing but abuse is made of, now send a letter to the model, which passes
// "fuck you for leaving" and "you're a bad bitch" the way the prompt says.
// A hit is never a verdict: it costs one small call, and the call decides.
//
// Widened again the same evening, when the first layer was narrowed to the
// shapes no joke could share (moderate.js has the rule by rule), because
// every shape it gave up has to land here or it goes up unread on a verified
// @-note: "you should die", "just go die in a fire", "hope you die",
// "neck yourself", "jump off a bridge loser", "be careful walking home
// tonight", "it would be a shame if something happened to you", "wanna
// bone", "lets shag", "i want you inside me", "blow me", "fk u", "stfu
// loser", "you ugly fat pig" all matched no row. So did "l e t s f u c k",
// which folds to one word, "letsfuck", with no boundary before the f, so the
// sexual row now also reads the fuck word inside a longer word. Words like
// "ugly", "fat", "loser" and "be careful" send a great many harmless letters
// to the model, and that is the trade the gate is for: "i hope you die
// laughing at this" and "you're gonna smash it" cost a call each, and the
// call passes them.
//
// Every row reads the words as typed AND folded flat (`norm`), so "f*ck",
// "n i g g e r" and a Cyrillic letter reach the row they belong to, while
// the rows that need digits ("at 9pm", "16 years") still have them.
const LEXICON: Array<{ id: string; re: RegExp }> = [
  // a threat or violence promised, or wished on somebody, or a weapon
  { id: 'threat',   re: /\b(kill|murder|stab|shoot|shot|gun|knife|blade|beat (you|him|her|them) up|hurt (you|him|her|them)|break (your|his|her) (legs|face|neck)|burn (your|his|her)|rape|assault|attack|choke|strangle|drown|poison|bomb|slit|bury you|find you|coming for you|watch(ing)? your back|you('ll| will) (pay|regret|see)|know where you (live|sleep|are)|dead (to me|man|girl|woman)|end you|hunt|hope (you|u|ya) (\w+ )?(die|dies|rot|burn|suffer)|wish (you|u) (were|was) dead|(die|burn|rot) in (a )?(fire|hell|ditch|hole)|walking home|something (bad )?(happens?|happened) to (you|u)|shame if|be careful)\b/i },
  // sexual content, a body described that way, a proposition, or the emoji
  // that say it
  { id: 'sexual',   re: /\b(sex|sexy|sexual|f+u+c*k+\w*|f+v+c*k+\w*|f+c+k+\w*|f+c+u+k+\w*|f+k+\w*|ph+u+c*k+\w*|ph+k+\w*|\w+(f+u+c*k+|f+v+c*k+|ph+u+c*k+)\w*|bon(e|er|ed|ing)|shag\w*|inside (you|u|me)|go down on|ride (you|u)|blow me|(spread|open) (your|ur|those|them) legs|grind(ing)? on|dtf|smash|rail|bang|screw|hit (it|that)|tap (it|that)|sit on|bend (you )?over|suck|eat (you|u|me) out|ride (me|my|your)|breed|head|wet|hard for|blow ?job|hand ?job|bj|dick|cock|pussy|cunt|tits?|titties|boobs?|ass(hole)?|nude|naked|nudes|noods|clothes off|onlyfans|horny|orgasm|cum|slut|whore|hoe|thot|body count|virgin|thicc|thick thighs|rack|bulge|hooked up|hook up|hookup|one night|in bed|sleep with|slept with|moan|69|netflix and chill|emeggplant|empeach|emdroplets|emtongue|empoke)\b/i },
  // a letter that may be nothing but abuse: the gendered and sexual slurs
  // used as attacks, degradation, telling them to hurt themselves
  { id: 'abuse',    re: /\b(bitch(es|y)?|whore|slut|hoe|thot|skank|cunt|twat|dickhead|motherf\w*|piece of shit|eat shit|suck my|worthless|waste of (space|air|oxygen)|nobody (loves|likes|wants|will ever love) you|kys|(kill|hang|hurt|cut|shoot|off|end|drown|neck|unalive) (yo|ur|your)(self| self)|unalive|(go|just|pls|please|plz|should|u|you) (just )?(go )?die|hope (you|u|ya) (\w+ )?die|die alone|drink bleach|rope|jump off|slit|miss you if|better (off )?without you|ugly|fat|pig|loser|stupid|pathetic|disgusting|stfu|gtfo)\b/i },
  // a minor, stated or implied
  { id: 'minor',    re: /\b(1[0-7] ?(years|yrs|yo|year old|y\/o)|(you'?re|you are|she'?s|she is|he'?s|he is|they'?re|only|just|turned|turning|is|are) 1[0-7]|1[0-2]th grade|grade 1[0-2]|under ?age|underage|minor|middle school|freshman in high|high school (freshman|sophomore|junior)|child|kid|little (girl|boy)|sixteen|fifteen|fourteen|thirteen|jailbait|loli)\b/i },
  // a routine, a schedule, a way to find somebody at a time
  { id: 'locate',   re: /\b(every (monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|night|day|week)|(mon|tues|wednes|thurs|fri|satur|sun)days|at \d{1,2}(:\d{2})? ?(am|pm|o'?clock)|\d{1,2}(:\d{2})? ?(am|pm) (every|each|on)|schedule|routine|(lives?|living|stays?|staying) (at|in|on|near)|(his|her|their|your) (place|apartment|dorm|house|room|address|building|floor|unit)|room ?\d|floor \d|unit \d|parking|license plate|plate number|follow(ed|ing)? (you|her|him|them) (home|back)|(bus|train|route|line) (home|to)|works? at|shift at|gym at|class at|section at)\b/i },
  // exposing a private fact: outing, health, status, papers, money
  { id: 'expose',   re: /\b(gay|lesbian|bi(sexual)?|trans(gender)?|queer|closet(ed)?|out (you|him|her|them)|outed|pregnan(t|cy)|abortion|miscarriage|hiv|aids|std|sti|herpes|chlamydia|positive for|diagnos(ed|is)|bipolar|schizo|anorexi|bulimi|eating disorder|rehab|overdose|self.?harm|cutting|suicid|kill (my|your|him|her)self|kys|undocumented|illegal (immigrant|alien)|deport|ice will|visa|green card|owes? money|debt|bankrupt|arrest(ed)?|charged with|felony|criminal record|dui|cheated on|affair|nudes? of|leak|revenge)\b/i },
  // a slur, or hatred by group. The stems take any ending now: the row had
  // `n[i1]gg` closed by a word boundary, which no real word ever met
  { id: 'hate',     re: /\b(n+i+g+g+\w*|f+a+g+\w*|tr+a+n+n+\w*|r+e+t+a+r+d+\w*|k+i+k+e+s?|sp+i+c+k?s?|ch+i+n+k+s?|w+e+t+b+a+c+k+s?|c+o+o+n+s?|d+y+k+e+s?|towel ?heads?|sand ?n\w*|go back to (your|ur) country|your kind|(all|every) (jews|muslims|blacks|asians|mexicans|indians|whites|arabs|gays|women|men) (are|should))\b/i },
]

function needsReading(text: string): string[] {
  const hits: string[] = []
  const t = String(text || '')
  const n = norm(t)
  for (const row of LEXICON) if (row.re.test(t) || row.re.test(n)) hits.push(row.id)
  return hits
}

// ── layer 3 ──────────────────────────────────────────────────────────────────
// The real prompt. Written as a short list of consequences rather than as a
// request for judgement, because "is this letter okay?" gets you a model's
// median opinion about strangers on the internet, and what this wall needs
// is a decision against a list somebody can be held to. The list is what
// carries the judgement; the model applies it. It is told, plainly, what the
// wall is for, so that cruelty reads as the product and not as a category.
//
// Rewritten on 30 September to the owner's ruling, after it passed "lets fuck
// babe": its sexual rule named explicit content, a body and a history, and a
// two word proposition was none of those, while "swearing at them: allowed"
// and "never reject for being crude" told it the rest. Its threat rule took
// a death wish only "stated as intent or a promise", so a plain "hope you die
// in a fire" fit no rule and read as a pass beside "i hope you're
// miserable"; it now names the wish itself, with an example on each side. So the rule names a
// proposition aimed at the person, however short, joking or misspelled, and
// the sexual emoji; a new category, `abuse`, takes the letter that is nothing
// but profanity or degradation hurled at the person, telling them to hurt
// themselves, and a sexual or gendered slur used as an attack, and says in
// the same breath that cruelty with a point is not it; and a short block of
// examples sets the owner's jokes beside the letters that come off, since a
// line drawn in words alone is drawn a little differently every time. Its
// default is still PASS, reviews are still rare, and the addressee is judged
// with the words, since a name note's name is printed on the wall too.
const SYSTEM_PROMPT = `You screen short anonymous letters for a public wall. Each letter is addressed to a named Instagram handle, or to a first name or nickname. The person it is to did not write it and will read it. You are given the addressee, the letter, and sometimes a sealed line.

Return ONLY JSON: {"verdict":"pass"|"review"|"reject","reasons":[string]}

THE WALL IS FOR THE THINGS PEOPLE NEVER SAID, and it has to stay fun. Longing, admiration, gratitude, regret, apology, and also heartbreak, anger, grudges, break-ups, roasting, mockery, insults, contempt, jokes and swearing. Your default is PASS, and most letters, including most rude, crude and unkind ones, are a PASS. A wall that is too strict is a dead wall.

Always PASS:
- swearing inside a feeling, a story or a joke: "fuck you for leaving", "you're the fucking best", "shit i miss you"
- roasts, insults and cruelty with a point: "your playlist is a war crime", "you're a coward and you know why", "you were selfish to me all year and you know it"
- anger with a reason, heartbreak, "i hope you're miserable", "you ruined my year"
- flirting and attraction, and romantic innuendo that is not explicit: "you're so fine it's rude", "kiss me already", "marry me", "i think about your hands too much"
- comic hyperbole: "i'd fight a bear for you", "kill it at your recital", "i could kill you for that haha", "you're so cute i could just die", "you're gonna smash it"
- money jokes and ordinary detail: "you owe me $5", a class, a building, a bar, a party, a bus line, a job, one remembered day

Moderate the CONSEQUENCE, not the emotion. REJECT only if one of these is clearly true:
1. threat: a threat of violence, plainly or veiled ("watch your back", "i know where you live", "you'll see what happens to you"), a wish for their death or serious injury, whether stated as intent, a promise or a hope ("i hope you die", "hope you die in a fire", "you should die"), intimidation, stalking, or any promised consequence to their body, home or safety. Obvious comic hyperbole is not a threat, and "i hope you're miserable" is anger, not a death wish.
2. locate: a physical description or their name COMBINED WITH a recurring schedule, route, address, workplace shift, or room, precise enough to find them at a predictable time. A place alone is not this. One remembered day is not this.
3. sexual: a sexual proposition, invitation or request aimed at the person, however short, joking, misspelled or spaced out ("lets fuck", "babe lets fuck", "dtf?", "wanna fuck", "sit on my face", "send nudes", "i'd smash"), including sexual emoji used that way (eggplant, peach, droplets, tongue); an explicit sex act; a sexualised description of their body; or a claim about their sexual history. Flirting, attraction and a kiss are not this.
4. minor: the person is stated or clearly implied to be under 18 in a sexual or romantic letter.
5. expose: a private fact disclosed about them that costs them something outside the wall: outing their sexuality or gender, a health or pregnancy or immigration or legal status, an addiction, a debt, or a threat to leak images or messages. A joke about a small sum owed is not this.
6. hate: a slur, or contempt for the person's race, ethnicity, religion, disability, gender or sexuality as such. Contempt for the PERSON is allowed; contempt for their group is not.
7. contact: a phone number, a street address, a room number, a link or an email address.
8. abuse: a letter whose whole content is profanity or degradation hurled at the person, with no joke, feeling or story in it ("fuck you bitch", "you stupid whore", "suck my dick loser"); telling them to kill or hurt themselves, plainly or veiled ("kys", "go jump off a bridge"); or a sexual or gendered slur (whore, slut, cunt) used as an attack. Cruelty with a point, a reason or a joke in it is not this, and passes.

Examples (addressee: letter => answer):
@jules.k: fuck you for leaving without saying bye => pass
@jules.k: you're the fucking best, never change => pass
maya: your playlist is a war crime and i still miss you => pass
@ren.t: you're so fine it's rude. kiss me already => pass
@ren.t: i could kill you for that haha. you owe me $5 => pass
maya: i'd fight a bear for you => pass
maya: you're so cute i could just die => pass
@ren.t: babe lets fuck => reject ["sexual"]
@ren.t: dtf? => reject ["sexual"]
maya: 🍆🍑💦 tonight? => reject ["sexual"]
@ren.t: fuck you bitch => reject ["abuse"]
maya: kys => reject ["abuse"]
@ren.t: i know where you live. watch your back => reject ["threat"]
@ren.t: hope you die in a fire => reject ["threat"]

Judge the addressee too: a name or handle that is itself a slur, a proposition, abuse or a contact detail is part of the letter. Judge the sealed line with the letter; it is private until the recipient asks for it.

A REJECT keeps the letter off the wall, or takes it down if it is up; a REVIEW asks a person to read it; a PASS puts it up or leaves it up. So a letter you are confident is one of the eight is a REJECT, never a review. REVIEW only when you genuinely cannot tell which side of one of those eight a letter falls on. Never review or reject a letter for being cruel with a point, crude, sad, angry, sarcastic, flirtatious, unromantic, or embarrassing to the person: those pass.

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
// row will hold; `paper` is the plain paper and is nothing. And since 0076
// the writer's battery, `bat`, which the composer sets a bar at a time: a
// number, rounded and held to 0 to 4, and anything else left off, so a
// letter is never refused over its battery. Both paths, the v2 write and the
// v1 one, read the look through here.
const SLUG = /^[a-z][a-z0-9-]{0,23}$/
function cleanLook(raw: unknown): Record<string, string | number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const pick = (k: string) => (typeof r[k] === 'string' && SLUG.test(r[k] as string) ? (r[k] as string) : '')
  const out: Record<string, string | number> = {}
  const theme = pick('theme')
  if (theme && theme !== 'paper') out.theme = theme
  const tint = pick('tint')
  if (tint) out.tint = tint
  const face = pick('face')
  if (face) out.face = face
  if (typeof r.bat === 'number' && Number.isFinite(r.bat)) out.bat = Math.min(4, Math.max(0, Math.round(r.bat)))
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

// ── version 2: the one wall (docs/ONE-WALL.md, migrations 0063 and 0066) ────
// A request carrying `v: 2`. Everything above this line is the version 1
// path, byte for byte, for a tab still on the old build.
//
//   request  { v: 2, token, kind: 'handle'|'name', target?, name?, salutation?,
//              look?, campus?: slug|null, nonce, source?, body,
//              proof?: 'edu'|'none' }
//   ok       { ok: true, id, status: 'live'|'pending'|'rejected', handle, kind,
//              name, look, campus, school, verified, salutation, say?, reasons? }
//   error    { ok: false, error: 'edu' | 'campus' | 'throttle' | 'salutation'
//              | 'nonce' | 'no_session' | 'removed' | 'name' | 'handle'
//              | 'empty' | 'cap' | 'write', ... }
//
// Two kinds of note, and `proof` says which an @-note is (0066):
//
//   verified  an @-note with `proof: 'edu'`, or with no `proof` at all, which
//             is how a tab from before 0066 asks. It goes up as version 1's
//             letters do: layer 1 before, the write at `live`, and the reading
//             after the answer. The schema decides who may write one
//             (wall_write: `edu`, `campus`) and which school it carries, and
//             it carries that school's sticker.
//   open      a name note, always, and an @-note with `proof: 'none'`: anybody
//             may write one, with no proof, so nothing stands between a
//             stranger and the wall but the reading, and it is read BEFORE it
//             is written, by the classifier itself. A pass writes it `live`; a
//             review, or no classifier configured, writes it `pending` for the
//             desk; a reject writes it `rejected`. The lexicon that spares most
//             verified notes a model call is not a pass here, because "no
//             classifier configured" has to hold a note for the desk, not wave
//             it up. Open notes are throttled, five a device and twenty an
//             address a day between them, counted before the reading so a
//             refused note is not a free retry. An open @-note carries no
//             school and never the sticker.
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

// PostgREST's answer for a signature the database does not have: a database
// a migration behind, and nothing else, so a failure of any other kind is
// never mistaken for one and retried on the older write.
function noSuchWrite(e: { code?: string; message?: string }): boolean {
  return e?.code === 'PGRST202' || /could not find the function|does not exist/i.test(String(e?.message || ''))
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
  // read before it is written, and throttled: a name note, and an @-note
  // sent with no proof (0066). An @-note that says nothing is the verified
  // kind, which is what every @-note was before 0066.
  const open = kind === 'name' || p.proof === 'none'

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

  // ── an open note is counted before it is read ──
  if (open) {
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
  } else if (open) {
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
  // With its proof (0066). A database from before it has only the twelve
  // argument write, which is the verified path: a verified note or a name
  // note steps down to it and writes as it always did, and an open @-note,
  // which that database cannot take, is answered as it would have been then.
  const args = {
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
  }
  let { data, error } = await supabase.rpc('wall_write', { ...args, p_proof: open ? 'none' : 'edu' })
  if (error && noSuchWrite(error)) {
    if (kind === 'handle' && open) {
      console.warn('an open @-note needs 0066', error.message)
      return json({ ok: false, error: 'edu' })
    }
    console.warn('wall_write with a proof refused, trying the twelve argument write', error.message)
    ;({ data, error } = await supabase.rpc('wall_write', args))
  }
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
    if (!open) {
      // a verified note is read where it stands: a reject takes it down and
      // tells the one wall (`global`), which is where the build that sent
      // `v: 2` is listening. An open note was read before it was written.
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

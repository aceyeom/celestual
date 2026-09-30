// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCREEN: what runs at the keyboard, and what the server re-runs      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Four layers stand between a person typing and a name appearing on a public
// wall. This module is the browser's half of the first of them, and it is
// deliberately the WEAKEST half: everything here is a courtesy to the
// writer, and the control on the writer is the same list re-run on the
// server (supabase/functions/celestual-wall-moderate, and for a reply
// celestual-wall-reply) where it cannot be edited out with a devtools
// console.
//
//   1  DETERMINISTIC   regex over the words as a person typed them and over
//                      the same words folded flat (`norm`): slurs, phone
//                      numbers, addresses, room numbers, links, email, and
//                      since 30 September two narrow rules that only public
//                      words carry, a sexual proposition aimed at the person
//                      and telling them to hurt themselves (`caughtOnWall`).
//                      A catch is a hard refusal: the composer shakes and
//                      says the one thing, and nothing is sent. Mirrored
//                      from the edge functions so a writer is told at the
//                      keyboard rather than after they have committed forty
//                      words and pressed the button.
//   2  THE LEXICON     a wide, cheap list of the words a letter with a
//                      consequence in it nearly always carries, read over
//                      the folded words too: violence, sex, abuse, a minor,
//                      a routine, exposure. It is a gate and never a
//                      verdict: on a verified @-note it decides whether the
//                      model reads the letter at all, and a letter matching
//                      none of it is passed by the list alone, which the
//                      desk can see (admin/Letters.jsx). Server side only.
//   3  CLASSIFIER      one call to the cheapest model against a short list of
//                      CONSEQUENCES and never of tones: a threat, a way to
//                      find somebody, sexual content or a proposition aimed
//                      at them, a minor, a private fact exposed, hate by
//                      group, contact details, and abuse that is nothing but
//                      abuse. Heartbreak, anger, cruelty with a point,
//                      roasting, flirting and swearing are the wall, and they
//                      pass. An open note (every name note, and every @-note
//                      posted without the Berkeley proof, which is the
//                      default) is read BEFORE it is written (migration
//                      0066); a verified @-note goes up at once and is read
//                      where it stands, and a reject takes it down.
//   4  HUMAN           anything the classifier calls ambiguous is held for,
//                      or flagged to, a person at the desk (migrations 0050,
//                      0066). Nobody is told which letters those are.
//
// ── the balance, as the owner set it on 30 September ────────────────────────
// A letter that said "lets fuck babe" was read, passed and put up, and a
// person took it down eleven minutes later. The owner's ruling is the line
// this whole file keeps: the wall stays free for comedy, and only the plainly
// bad comes off. "fuck you for leaving", "you're the fucking best", "your
// playlist is a war crime", "i'd fight a bear for you", "you owe me $5",
// "kiss me already" all go up, and a proposition aimed at the person, however
// short or misspelled, a letter that is nothing but abuse hurled at them,
// telling them to hurt themselves, a slur used as an attack and a threat do
// not. The first layer takes only the narrowest, surest shapes of those, and
// everything that needs judgement is the reading's, because a regex that
// refuses a joke at the keyboard leaves the writer no way past it, and too
// strict kills the wall as surely as too loose.
//
// ── the two clocks, and why they are different ──────────────────────────────
// PUBLISHING a verified note is instant, and the reading happens to a letter
// that is already on the wall; an open note waits the second or two its
// reading takes, because nothing but the reading stands between a stranger
// and the wall. REPORTING is the opposite of both: the letter comes down on
// the tap, before anybody reasons about anything, and the reasoning happens
// to a letter nobody can see. No model reads a report; the desk does.

// ── the words, folded flat ──────────────────────────────────────────────────
// One fold, used by every rule below that reads words rather than digits, and
// the SAME fold in celestual-wall-moderate, celestual-wall-reply and the
// database (`celestual_text_norm`, migration 0078), because a trick that
// beats one copy of the list beats the wall. Until 30 September the fold was
// lower case and six leet digits, and it ran for the slurs alone: "n i g g e
// r", a Cyrillic i, fullwidth letters, a plural, "f*ck" and an eggplant went
// past all of it. In order:
//   lower case, then NFKD with the accents taken off, which also turns
//     fullwidth and other compatibility letters into their plain selves
//   the Cyrillic and Greek letters that are drawn like Latin ones, as Latin
//   the few emoji that are sexual when aimed at a person, as word tokens
//     nobody types (`emeggplant`, `empeach`, `emdroplets`, `emtongue`, and
//     `empoke` for the pointing finger into the ring)
//   apostrophes out, so "let's" is "lets" and "i'd" is "id"; dots,
//     underscores and hyphens to spaces, so "f.u.c.k" is four letters
//   a run of three or more single letters joined into one word, with a
//     leading "a", "i" or "u" left standing, so "you are a f a g" folds to
//     "you are a fag" and "k y s" to "kys"
//   leet inside a word that has a letter in it (0 and @ to o, 1 ! and | to
//     i, 3 to e, 4 to a, 5 and $ to s, 7 to t, a star dropped), and never in
//     a bare number, so "$5" stays a price and "n1gg3r" does not
//   anything else to a space, a run of three or more of one letter cut to
//     two ("fuuuuck", "bitchhhh"), and the spaces closed up
const LOOK_FROM = 'авеёкмнорстухіїјѕԁɡһαβεηικνορτυχωγ'
const LOOK_TO = 'abeekmhopctyxiijsdghabeniknoptuxwy'
const EMOJI_WORDS = [
  [/\u{1F449}\s*\u{1F44C}/gu, ' empoke '],
  [/\u{1F346}/gu, ' emeggplant '],
  [/\u{1F351}/gu, ' empeach '],
  [/\u{1F4A6}/gu, ' emdroplets '],
  [/\u{1F445}/gu, ' emtongue '],
]
function leet(w) {
  if (!/[a-z]/.test(w)) return w
  return w.replace(/^[!|*@]+|[!|*@]+$/g, '')
    .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/\*/g, '')
}
export function norm(s) {
  let t = String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  t = t.replace(/[\u0080-\uffff]/g, (c) => { const i = LOOK_FROM.indexOf(c); return i < 0 ? c : LOOK_TO[i] })
  for (const [re, word] of EMOJI_WORDS) t = t.replace(re, word)
  t = t.replace(/['\u2019`]/g, '').replace(/[._-]/g, ' ')
  t = t.replace(/(^|[^a-z0-9@$!|])((?:[aiu] )?)((?:[a-z0-9@$!|] ){2,}[a-z0-9@$!|])(?![a-z0-9@$|])/g, (m, a, lead, run) => a + lead + run.replace(/ /g, ''))
  t = t.replace(/[a-z0-9@$!|*]+/g, leet)
  return t.replace(/[^a-z0-9\s]/g, ' ').replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim()
}

// ── layer 1 ─────────────────────────────────────────────────────────────────
// Kept byte-identical in spirit to the edge functions' list. A slur that is
// caught in the browser and not on the server is a slur that ships; a slur
// caught on the server and not in the browser is a person who wrote a letter
// and was refused with no idea why. Profanity is not on this list and never
// will be: a slur against a group is a consequence for the person named, and
// a swear word is a feeling.
//
// Each slur is read over the folded words with every letter allowed to
// repeat and, since 30 September, the plural that stem really takes: "you
// niggers", "faggots" and "retards" went past a list that only knew the
// singular, and so did "niggerrr". The plural is written beside each stem
// (`stem/plural`, nothing after the slash for none) and not one suffix for
// all of them, because the first cut allowed `s`, `es`, `z` and `ies` after
// every stem and so read "spices" as spic and es, and refused a recipe as a
// slur with no way past it. "coon" and "dyke" take no plural at all: "Coons"
// and "Dykes" are surnames, "coons" are raccoons and "dykes" hold back the
// sea, and a plural used as a slur is still the reading's to see (the
// lexicon's `hate` row sends it). Three idioms that carry a slur's letters
// and none of its meaning are taken out before the read.
const SLURS = [
  'nigger/s', 'nigga/s|z', 'faggot/s', 'fag/s', 'tranny/', 'trannie/s', 'retard/s', 'retarded/', 'kike/s',
  'spic/s', 'chink/s', 'gook/s', 'wetback/s', 'coon/', 'dyke/', 'shemale/s',
]
const SLUR_RES = SLURS.map((x) => {
  const [s, pl] = x.split('/')
  return new RegExp(`\\b${s.split('').map((c) => `${c}+`).join('')}${pl ? `(?:${pl})?` : ''}\\b`)
})
const NOT_SLURS = /\bspick? (?:and|n) span\b|\bchinks? in (?:the|his|her|my|your|their) armou?r\b|\bchinks? of (?:light|sunlight|daylight|sun|hope|blue)\b/g
function slurred(n) {
  const t = n.replace(NOT_SLURS, ' ')
  return SLUR_RES.some((re) => re.test(t))
}

// What a slur caught here says, and what a letter the server refused for one
// says (`whyNot`): the same sentence, since to the writer it is the same fact.
const INAPPROPRIATE = 'that’s inappropriate for the wall.'

// Each pattern carries the sentence the writer is shown. A refusal that says
// "this violates our guidelines" teaches nobody anything and reads as a
// machine being annoyed; a refusal that names the thing is one edit away from
// a letter that goes up.
//
// Loosened on 30 September where the list refused jokes and memories that
// carry no contact at all: "we lived in the same dorm 2 years ago" and "room
// 4 of my heart" (a room is a number that is not then counted in years,
// people or "of"), "#2019 was ours" (a hash and a year is a year), "it's 20
// minutes each way" and "23 points on court" (a street needs a number that
// is not a count of something, and a street word that is not "each way" or
// "on court"), "i loved you.me? never" and "i miss you.co-star" (a short
// domain after an everyday word is a sentence missing its space), and "i owe
// you 1000000000 hugs" (a number that is one digit and then the same digit
// over and over is not a phone). A real address, a room, a link or a number
// still comes off exactly as before.
const COUNTED = 'minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|weeks?|months?|years?|yrs?|times?|people|points?|pts|miles?|km|feet|ft|steps?|dollars?|bucks|games?|goals?|reps?|laps?|kids?|friends?|percent|degrees?|pages?|words?|texts?|messages?|calls?|nights?|of'
const PATTERNS = [
  { id: 'url',     say: 'links do not go on the wall',
    re: /(https?:\/\/|www\.|\b(?!(?:you|u|me|us|it|so|to|and|love|miss|home|time|here|there|this|that|with|for|all|see|call|text)\.(?:me|co|ly|io|gg)\b)[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)\b)/i },
  { id: 'email',   say: 'take the email address out',               re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // a run that looks like a number, then at least nine digits in it and no
  // full stop: "since 2019. 2020 was the year" is two years and a sentence
  { id: 'phone',   say: 'take the phone number out',                re: /(\+?\d[\d\s().-]{8,}\d)/, digits: 9 },
  { id: 'address', say: 'a street address cannot go on a public wall',
    re: new RegExp(`\\b\\d{2,5}\\s+(?!(?:${COUNTED})\\b)[A-Za-z][A-Za-z.'-]*(\\s+[A-Za-z][A-Za-z.'-]*)?\\s+(?<!\\b(?:each|the|all|on|in|at|a|my|your|every|one|other|that|this|no|any|half|out|to|for|by|his|her|their|our)\\s)(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\\b`, 'i') },
  { id: 'room',    say: 'a room or apartment number cannot go on a public wall',
    re: new RegExp(`\\b(room|rm|apt|apartment|suite|ste|dorm)\\s*#?\\s*\\d{1,4}[a-z]?\\b(?!\\s*(?:${COUNTED})\\b)|#\\s?(?!(?:19|20)\\d\\d\\b)\\d{3,4}\\b`, 'i') },
]

// A match that is one digit and then another repeated ("1000000000") is a
// count said big, not a number anybody can ring.
function phoneLike(m) {
  const d = m.replace(/\D/g, '')
  return d.length >= 9 && !/\.\s/.test(m) && !/^\d(\d)\1+$/.test(d)
}

// ── what only public words may not carry (30 September) ─────────────────────
// Two rules, read over the folded words, that the wall and its replies run
// and a private note does not: a private note is read by one person, and only
// if they sent one back, so flirting there, however plain, is between two
// people who both asked (which is why the database's list for private notes,
// `celestual_text_caught`, has neither, and never will).
//
//   sexual  a proposition aimed at the person, in its surest shapes: "lets
//           fuck", "babe lets fuck", "wanna fuck", "i'd fuck you", "dtf",
//           "sit on my face", "send nudes", "i'd smash", "suck my dick", and
//           the emoji that say it (an eggplant or a peach right beside a
//           different one of them, one of them after a proposition's lead,
//           or the finger into the ring). The fuck word alone is never
//           this: "fuck you for leaving" and "you're the fucking best" pass,
//           and so does a lead that is not about sex ("lets fuck shit up",
//           "wanna fuck around and find out", "i'll fuck you up", "i'd smash
//           that exam"). What is subtler than these shapes is the reading's.
//   harm    telling them to kill themselves, aimed at them: "kys", "go kill
//           yourself", "you should kill yourself", "just go die", "you
//           should die". Not "don't kill yourself over finals", which is
//           care, and never the writer about themselves or a joke.
//
// Narrowed the same day, after a review ran the first cut against the kind
// of letter the wall is for and found it refusing, with no way past, "you're
// gonna smash it", "this song would bang", "lets hit it", "lets fuck some
// shit up", "this semester fucked me hard", "give me head pats", "you're a
// peach" with two peaches, "i made eggplant parm and peach cobbler" in
// emoji, "i could just die", "let's go die on this hill", "you should cut
// yourself some slack", "you just shoot yourself in the foot" and "don't
// go kill yourself over one exam". The rule this block keeps now is the
// owner's: a shape goes here only if no joke could plausibly share it, and
// anything a joke might share is left to the lexicon, which sends it to the
// reading, which reads what it means. So:
//   smash, bang and their like need a first person who wants to ("i'd",
//     "i wanna", "let me", "can i") and a person or nothing after, never
//     "it": "i'll smash it" is an exam, and "let me hit it" is still refused
//   fuck with a lead is not sex when up, over or around follows within
//     three words, whatever the words between ("fuck ur shit up at smash")
//   "fuck me" is sexual only as the bare imperative, the whole letter and
//     nothing after it but "harder", "baby" and their like, or beside
//     "daddy", so "fuck me, baby shark is stuck in my head" is a feeling
//   two different sexual emoji only when they touch, so a peach for
//     emphasis and a menu in emoji go up
//   killing yourself only after a lead that tells them to ("go", "just",
//     "you should", "hope you"), with no negation anywhere before it and no
//     "laughing", "over" or "in the foot" after it
//   dying only told to them: "go die" with nobody in the first person in
//     front of it and nothing after it but the end or an insult, or "you
//     should die", "why don't you just die" with no hill, no laughing and no
//     "for" after it. "hope you die" is not here; the reading has it, since
//     "i hope you die laughing at this" is a joke and the list cannot tell
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
const WALL_ONLY = [
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

// The first of the two a public text carries, as its id, or ''.
export function caughtOnWall(text) {
  const n = norm(text)
  for (const w of WALL_ONLY) if (w.re.test(n)) return w.id
  return ''
}

// Returns the first thing wrong, said in words, or ''. One fault at a time on
// purpose: a list of five complaints under a text box is a wall, and the writer
// only has to fix one of them to find out whether the next one is real. This
// is the list every text goes through, the private note's words and its line
// too (screens/Ping.jsx); the wall's own two rules are `wallFault`.
export function fault(text) {
  if (slurred(norm(text))) return INAPPROPRIATE
  for (const p of PATTERNS) {
    const m = String(text || '').match(p.re)
    if (!m) continue
    if (p.digits && !phoneLike(m[0])) continue
    return p.say
  }
  return ''
}

// The list, then the two rules only public words carry, said the way the
// server's refusal would say them (`whyNot`), so the keyboard and the server
// never tell a writer two different things about the same words.
export function wallFault(text) {
  const f = fault(text)
  if (f) return f
  const w = caughtOnWall(text)
  return w ? whyNot([w]) : ''
}

export function clean(text) { return !fault(text) }

// A number cut in two across two fields that are read apart (a private
// note's line across its top and its words, 0073): the phone's pattern alone,
// on the two joined by a space. Not the whole list: an address or a room read
// across the join is two sentences meeting ("to the one on the 51" and "the
// way you laughed"), which the server, reading each field on its own, would
// let through, and the keyboard refused it and blamed the line
export function phoneAcross(a, b) {
  const p = PATTERNS.find((x) => x.id === 'phone')
  const m = `${String(a || '')} ${String(b || '')}`.match(p.re)
  if (!m || !phoneLike(m[0])) return ''
  return p.say
}

// ── why the wall said no, at the send ──────────────────────────────────────
// A letter read before it goes up (0066) can be refused on the spot, and the
// server answers with the reasons it had (celestual-wall-moderate: the list's
// own ids, or the reading's categories). The composer used to throw them away
// and say "that's inappropriate for the wall." whatever they were, so a
// writer did not know what to change and could send the same words and be
// refused again. Now it says the one thing, the way a catch at the keyboard
// does (the list's own sentence, above) and the way a refused reply does
// (replies-check.js `whyRefused`), with the one next step. The first reason
// it has words for wins; a reason it has none for, or none at all, is the
// server's own sentence and the step. The lexicon's `lex:` hits ride along
// for the desk and are not read here: they are what the letter might carry,
// not what the reading found.
//
// `sexual` is the list's proposition and the reading's category alike, and
// its step is the honest one: the wall is public, and the same words can go
// to the person privately, where they are only read if that person sent one
// back. `abuse` (30 September) is a letter that is nothing but abuse, and its
// step is the thing that makes an angry letter a letter: what they did.
const WHY_NOT = {
  threat: 'it reads as a threat. change it and send it again.',
  locate: 'it says where somebody can be found. change it and send it again.',
  sexual: 'it’s sexual, and the wall is public. say it another way, or send it privately.',
  minor: 'it is about somebody under 18. change it and send it again.',
  expose: 'it shares something private about a person. change it and send it again.',
  hate: 'it is hateful about a group. change it and send it again.',
  contact: 'it carries contact details. change it and send it again.',
  abuse: 'it is only abuse. say what they did, and send it again.',
  harm: 'it tells them to hurt themselves. take that out, and send it again.',
}
export function whyNot(reasons) {
  const list = Array.isArray(reasons) ? reasons.map(String) : []
  for (const r of list) {
    if (r === 'slur') return INAPPROPRIATE
    const p = PATTERNS.find((x) => x.id === r)
    if (p) return `${p.say}.`
    if (WHY_NOT[r]) return WHY_NOT[r]
  }
  return 'it can’t go up as it’s written. change it and send it again.'
}

// ── a letter that was held, and never went up ──────────────────────────────
// A letter from anybody is read before it goes up (0066), and one the reading
// is unsure of waits for a person at the desk: `wall_mine` answers
// `down_by: 'held'` for it while it waits. Two things can end that wait
// other than the wall: the desk refuses it, which leaves the row 'rejected'
// (the desk's key for a letter that went up is "take it down", which leaves
// it 'removed'), or a week passes with nobody deciding (0032 `wall_expire`,
// 'rejected' and 'lapsed').
// Either way it never stood, and the notice says it didn't go up rather than
// that it was taken down.
export function neverUp(l) {
  return !!l && l.status === 'rejected' && (l.downBy === 'desk' || l.downBy === 'lapsed')
}

// ── why a letter of this person's is not on the wall ───────────────────────
// One sentence for the notice at the foot of the wall. `downBy` is the
// server's word for whose hand it was (api.js `mine`). It names the terms
// and not the hand: a writer whose letter came down is owed the fact and the
// way back, not a machine explaining itself, and "the screen read it as" was
// a machine explaining itself. The category the reading gave is kept on the
// row for the desk, and never printed here. `held` is a letter that never
// went up (`neverUp`), for the one hand that reads differently for it: a
// letter that lapsed while it waited did not stand for thirty days.
//
// `writer` is the writer's own hand (0074, the owner's ruling of 29
// September): they took it back themselves. The notice never rises for it
// (screens/Wall.jsx asks only after the four hands above), since a person
// does not need telling what they just did; the sentence is here so that
// anything that ever does print a reason for it prints theirs and not the
// terms'.
export function whyDown(downBy, held = false) {
  switch (downBy) {
    case 'writer': return 'you took it back.'
    case 'screen':
    case 'desk':   return 'it went against the terms of the wall. you can change it and put it up again.'
    case 'shut':   return 'the name has come off the wall, and nothing can be written to it now.'
    case 'lapsed': return held ? 'it waited a week without an answer. you can put it up again.' : 'it stood for its thirty days.'
    default:       return 'it is not on the wall.'
  }
}

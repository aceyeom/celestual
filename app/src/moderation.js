// moderation.js — the shoutout wall.
//
// A community's live chat lets people post anonymous shoutouts. In a product
// whose entire promise is "nothing is public but your own door," this is the one
// public surface, so its safety is not a nicety — it's load-bearing. Two things
// must never happen: a shoutout can't out a person (or a match), and it can't
// carry abuse. So every post runs this before it's shown, and the SAME rules are
// what the demo's seeded lines already obey.
//
// The posture: SANITIZE what we safely can (strip @handles, urls, contacts,
// names → the message survives, minus the identifying bit), and REJECT only what
// we can't make safe (empty, too long, or abusive). Rejections return a short,
// kind reason so the composer can say why. Pure + synchronous; no network.

export const MAX_LEN = 160

// A deliberately small, illustrative name list. Real moderation would use a far
// larger dictionary (and server-side checks); this is enough to make the "we
// keep it anonymous" promise visibly real when a demo user types a name in.
const NAMES = [
  'alex', 'sam', 'chris', 'jordan', 'taylor', 'morgan', 'jamie', 'riley', 'casey',
  'sofia', 'aria', 'maya', 'mia', 'emma', 'olivia', 'ava', 'noah', 'liam', 'ethan',
  'sofia', 'daniel', 'david', 'sarah', 'hannah', 'grace', 'lucas', 'jack', 'ryan',
  'nina', 'leo', 'max', 'ben', 'kate', 'anna', 'jenny', 'mike', 'josh', 'nick',
]

// Hard blocks — abuse/harassment. Tiny and illustrative; a real list is larger
// and maintained server-side. Kept as word-boundary matches so it can't nuke an
// innocent substring.
const BANNED = ['kill', 'slur', 'whore', 'slut', 'rape', 'die ', 'kys']

const RE_HANDLE = /@[a-z0-9._]+/gi
const RE_URL = /\b((https?:\/\/)|(www\.))\S+|\b[a-z0-9-]+\.(com|net|org|io|gg|co)\b/gi
const RE_EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi
const RE_PHONE = /\b(\+?\d[\d\s().-]{6,}\d)\b/g
const RE_INSTA = /\b(insta|ig|snap|snapchat|discord|number|text me|dm me)\b/gi

// Strip a leading first-name address ("sarah, i ...") or standalone names.
function stripNames(s) {
  return s.replace(/\b[a-z]+\b/gi, (w) => (NAMES.includes(w.toLowerCase()) ? '' : w))
}

// Sanitize + judge a shoutout. Returns { ok, text, reason }.
//   ok:false  → don't post; `reason` explains why (empty / too long / abusive).
//   ok:true   → post `text` (already stripped of handles, urls, contacts, names).
export function sanitizeShoutout(raw) {
  let s = String(raw || '')
  // hard length cap first (on the raw input, so a wall of text is caught early)
  if (s.length > MAX_LEN * 2) return { ok: false, text: '', reason: `keep it under ${MAX_LEN} characters.` }

  const lower = s.toLowerCase()
  for (const b of BANNED) {
    if (lower.includes(b)) return { ok: false, text: '', reason: 'let’s keep shoutouts kind.' }
  }

  // sanitize identifying content — the message survives, the identifier doesn't
  const hadHandle = RE_HANDLE.test(s) || RE_INSTA.test(s)
  s = s.replace(RE_URL, '').replace(RE_EMAIL, '').replace(RE_PHONE, '').replace(RE_HANDLE, '').replace(RE_INSTA, '')
  const beforeNames = s
  s = stripNames(s)
  const strippedName = beforeNames !== s
  // tidy whitespace + dangling punctuation left by the strips
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/^[\s,.:;]+/, '').trim()
  // drop orphan connector words left dangling at either end after a strip
  // ("…dm me on insta" → the "on" would otherwise linger)
  const ORPHAN = new Set(['on', 'at', 'to', 'in', 'my', 'me', 'the', 'a', 'an', 'and', 'dm', 'ig', 'of', 'with', 'via', 'or'])
  const trimOrphans = (str) => {
    let parts = str.split(/\s+/).filter(Boolean)
    while (parts.length && ORPHAN.has(parts[parts.length - 1].replace(/[^a-z]/gi, '').toLowerCase())) parts.pop()
    while (parts.length && ORPHAN.has(parts[0].replace(/[^a-z]/gi, '').toLowerCase())) parts.shift()
    return parts.join(' ')
  }
  s = trimOrphans(s).replace(/\s+([,.!?])/g, '$1').replace(/[\s,;:]+$/, '').replace(/^[\s,.:;]+/, '').trim()
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN).trim()

  if (!s || s.replace(/[^a-z0-9]/gi, '').length < 2) {
    return { ok: false, text: '', reason: hadHandle || strippedName ? 'shoutouts stay anonymous — no names or handles.' : 'say a little more.' }
  }
  return { ok: true, text: s, reason: hadHandle || strippedName ? 'kept it anonymous for you.' : '' }
}

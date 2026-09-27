// ── the schools, and the network each one's letters are on ─────────────────
//
// A letter written to an @ goes up from a verified school address, and it
// carries that school the way a phone carried the network it was on: the
// network's short name in the status row, beside the aerial, in the phone's
// own face and the school's colour, with the aerial lit in it and a small
// pixel star after it (screen.jsx `Screen`, Sticker.jsx, and the shared
// picture in share.js). This file is who the schools are: the short name
// each one's network goes by, and its colours.
//
// It was a die-cut sticker slapped over the phone's top right corner, over
// the battery, and it read as a thing stuck on from outside the phone. The
// network's name is the phone's own: every phone of the era said whose
// network it was on in that place, before the date and the battery, so a
// Berkeley letter reads as a phone on Berkeley's own network and nothing on
// the glass is covered.
//
// It is nobody's mark: the short name in the screen's own face, and the
// phone's own star (looks.js `PIX.star`). No script, no seal, no crest.
//
// `berkeley` is the one school posting to an @ today (docs/ONE-WALL.md). The
// rest are here so a school the server opens tomorrow is lit in its own
// colour on the first letter, and anything this file does not name is lit in
// the neutral one, with the short name the server gave it or its slug.

export const SCHOOLS = {
  berkeley: { short: 'CAL', name: 'UC Berkeley', domain: 'berkeley.edu', bg: '#003262', fg: '#FDB515' },
  stanford: { short: 'STANFORD', name: 'Stanford', domain: 'stanford.edu', bg: '#8C1515', fg: '#FFFFFF' },
  ucla: { short: 'UCLA', name: 'UCLA', domain: 'ucla.edu', bg: '#2774AE', fg: '#FFD100' },
  usc: { short: 'USC', name: 'USC', domain: 'usc.edu', bg: '#990000', fg: '#FFCC00' },
  nyu: { short: 'NYU', name: 'NYU', domain: 'nyu.edu', bg: '#57068C', fg: '#FFFFFF' },
  harvard: { short: 'HARVARD', name: 'Harvard', domain: 'harvard.edu', bg: '#A51C30', fg: '#FFFFFF' },
  mit: { short: 'MIT', name: 'MIT', domain: 'mit.edu', bg: '#A31F34', fg: '#FFFFFF' },
}

// the neutral one: the room's ink under the room's chalk
const NEUTRAL = { bg: '#1F2A44', fg: '#F4F1EA' }

const cleanSlug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

// The school a domain belongs to, by its registrable name: `berkeley.edu`,
// `eecs.berkeley.edu` and `cs.stanford.edu` are Berkeley, Berkeley and
// Stanford. The server's own answer (the `campus` on a verification) wins
// wherever there is one; this is for the places that only hold a domain.
export function slugOfDomain(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^.*@/, '')
  if (!d) return ''
  for (const [slug, s] of Object.entries(SCHOOLS)) {
    if (d === s.domain || d.endsWith(`.${s.domain}`)) return slug
  }
  const parts = d.split('.').filter(Boolean)
  return parts.length >= 2 ? cleanSlug(parts[parts.length - 2]) : cleanSlug(parts[0])
}

// Whether an address or a domain is at Berkeley: the domain itself, or any
// department's subdomain of it.
export function atBerkeley(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'berkeley') return true
  return slugOfDomain(s) === 'berkeley' && /(^|[.@])berkeley\.edu$/.test(s)
}

// Everything the mark and its label need, for a campus slug. `hint` is
// what the server said about the campus, when it said something (`short`,
// `name`, `domain`), and it fills in for a school this file does not know.
export function schoolOf(slug, hint = {}) {
  const k = cleanSlug(slug)
  if (!k || k === 'global') return null
  const known = SCHOOLS[k]
  const short = String((known && known.short) || hint.short || k).toUpperCase().replace(/[^A-Z0-9&. -]/g, '').trim().slice(0, 9) || k.slice(0, 4).toUpperCase()
  return {
    slug: k,
    short,
    name: (known && known.name) || String(hint.name || '') || k.charAt(0).toUpperCase() + k.slice(1),
    domain: (known && known.domain) || String(hint.domain || '') || '',
    bg: (known && known.bg) || NEUTRAL.bg,
    fg: (known && known.fg) || NEUTRAL.fg,
  }
}

// What a screen reader hears for the mark: who wrote it, said by the
// school's address when there is one.
export function stickerLabel(school) {
  if (!school) return ''
  return `written by a verified ${school.domain || school.name} student`
}

// ── what a letter carries ───────────────────────────────────────────────────
// For a letter as the wall reads it (api.js `shapeLetter`): the salutation
// its writer set, or nothing, in which case the screen says "dear" and the
// name; the school whose network it is on (`sticker`, the name it had when
// the mark was a sticker, kept so every screen that hands it on is
// unchanged), for a letter posted from a verified school address; and for a
// name note the writer tagged with a school, a plain tag, since a name note
// is never verified and never carries the mark. A letter from before the one
// wall carries none of these fields, and draws as it always did.
//
// ── and the tag is never the mark ──
// The tag was the short name, lower case: "cal", at the end of the "dear"
// line, a finger's width from where a verified letter says "CAL" in gold.
// Anybody can tag a name note with a school and nothing checks it, and the
// two read alike while meaning different things: a letter ABOUT somebody at
// Cal, and one written BY somebody who proved they are there. So the tag
// says the first in words, "at UC Berkeley", the school's own name as the
// composer's chip showed it when it was picked, and it cannot be taken for
// the network's name in the status row.
export function letterMarks(l) {
  if (!l) return { salutation: '', sticker: null, tag: '' }
  const salutation = l.salutation ? String(l.salutation) : ''
  const campus = l.campus && l.campus !== 'global' ? l.campus : ''
  if (l.verified && campus) {
    return { salutation, sticker: schoolOf(campus, { name: l.school || '' }), tag: '' }
  }
  const school = campus && l.kind === 'name' ? schoolOf(campus, { name: l.school || '' }) : null
  return { salutation, sticker: null, tag: school ? `at ${school.name}` : '' }
}

// ── the wall's data layer ───────────────────────────────────────────────────
//
// Everything here is in memory. This build is a visual prototype: it reaches
// no server, it stores nothing anybody typed anywhere but this tab, and it is
// meant to be walked through on a phone with no project provisioned behind it.
//
// The one thing it takes seriously anyway is the SHAPE of the guarantee the
// real wall has to keep, because the screens are the deliverable and screens
// built against a loose contract have to be rewritten against a tight one:
//
//   · `author` is never on anything a screen receives. Not blurred, not
//     redacted, not present. The wall says a letter exists; it never says who.
//   · `seal` is not on a letter either. It is behind unseal(), and what the
//     letter sheet renders before then is a DECOY of matching length, so the
//     real string is not sitting in the DOM under a blur filter waiting for
//     somebody to open the inspector at the demo table.
//
// Both hold here for the same reason they will hold in production — the value
// is somewhere the render path cannot reach — which means nothing about these
// screens has to change when a real backend arrives underneath them.

import { SEED } from './seed.js'

const DAY = 86400000

// ── handles ─────────────────────────────────────────────────────────────────
// Stored bare, displayed with an @, and normalised in exactly one place.
export function normHandle(raw) {
  return String(raw || '')
    .trim().toLowerCase()
    .replace(/^@+/, '')
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//, '')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 30)
}

export function atHandle(raw) {
  const h = normHandle(raw)
  return h ? `@${h}` : ''
}

export function validHandle(raw) {
  const h = normHandle(raw)
  return h.length >= 3 && h.length <= 30 && !h.startsWith('.') && !h.endsWith('.')
}

// ── determinism ─────────────────────────────────────────────────────────────
// Every derived quantity in this build — a letter's id, its age, where its
// handle sits on the wall, how big it is set, which constellation it draws —
// comes out of this hash. Nothing is Math.random(), because a wall that
// reshuffles on every refresh is a wall nobody can point at and say "that one".
export function hash(str) {
  let a = 0x9e3779b9, b = 0x85ebca6b
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 0x27d4eb2d) >>> 0
    b = Math.imul(b ^ (a >>> 13), 0x165667b1) >>> 0
  }
  return ((a ^ (b >>> 15)) >>> 0)
}

// A stable float in [0,1) from a key and a channel, so one letter can have a
// dozen independent-looking properties out of one hash.
export function rand(key, channel = 0) {
  return (hash(`${key}#${channel}`) % 100000) / 100000
}

function idFor(str) {
  const h = hash(str)
  const g = hash(str + ':g')
  return `l${h.toString(36)}${g.toString(36)}`.slice(0, 12)
}

// ── the corpus, built once ──────────────────────────────────────────────────
// Ages spread across a thirty-day window so the wall reads as something that
// has been accumulating rather than something that was installed this morning,
// and they are derived from the id so a letter is the same age on every reload.
// A timestamp that moves when you refresh is a timestamp nobody believes.

const AUTHORS = new Map()   // id -> author. Never leaves this module.
const SEALS = new Map()     // id -> seal.   Handed out one at a time by unseal().

const NOW = Date.now()

const LETTERS = SEED.map((row, i) => {
  const id = idFor(`${row.h}:${i}`)
  const ageH = 2 + Math.floor(rand(id, 1) * 30 * 24)
  if (row.s) SEALS.set(id, row.s)
  AUTHORS.set(id, `author:${i}`)
  return {
    id,
    to: row.h,
    body: row.b,
    // The screens get the SHAPE of the seal and nothing else: whether there is
    // one, and how long it is. That is enough to typeset the redaction and not
    // enough to read it.
    sealed: !!row.s,
    sealLen: row.s ? row.s.length : 0,
    at: NOW - ageH * 3600000,
  }
}).sort((x, y) => y.at - x.at)

// Anything written during a session is prepended here, so the wall a person
// walks away from is the wall their own letter is on.
const WRITTEN = []

function all() { return WRITTEN.concat(LETTERS) }

// ── the wall ────────────────────────────────────────────────────────────────
// The wall is a wall of HANDLES, not of letters: one tile per recipient,
// carrying however many letters that recipient has. A handle written to three
// times should read as heavier than one written to once, and it does — the
// tile's weight and scale come off the count.

export function wall() {
  const byHandle = new Map()
  for (const l of all()) {
    const cur = byHandle.get(l.to)
    if (cur) { cur.count += 1; if (l.at > cur.at) cur.at = l.at }
    else byHandle.set(l.to, { handle: l.to, count: 1, at: l.at })
  }
  return [...byHandle.values()]
    .map((t) => ({
      ...t,
      // Three weights, and the split is by count first and by luck second, so
      // the field has texture without a run of equal-looking rows.
      weight: t.count > 2 ? 2 : t.count > 1 ? 1 : rand(t.handle, 7) > 0.72 ? 1 : 0,
      seed: hash(t.handle),
    }))
    .sort((a, b) => b.at - a.at)
}

export function liveCount() { return all().length }
export function handleCount() { return new Set(all().map((l) => l.to)).size }

// ── reading ─────────────────────────────────────────────────────────────────

export function lettersFor(handle) {
  const h = normHandle(handle)
  return all().filter((l) => l.to === h)
}

export function letter(id) {
  return all().find((l) => l.id === id) || null
}

// The search. Exact handle first, then anything containing what was typed —
// so a person who half-remembers a handle still lands somewhere, and a person
// who types their own exact handle lands on their own letter and not on a list
// of near-misses.
export function search(query) {
  const q = normHandle(query)
  if (q.length < 2) return []
  const tiles = wall()
  const exact = tiles.filter((t) => t.handle === q)
  const near = tiles
    .filter((t) => t.handle !== q && t.handle.includes(q))
    .sort((a, b) => a.handle.indexOf(q) - b.handle.indexOf(q) || a.handle.length - b.handle.length)
  return exact.concat(near).slice(0, 24)
}

// The one door to a seal, and the only function in the module that reads the
// map. It takes the same shape it will take against a server — a promise, a
// letter id, a possible null — so the letter sheet does not learn a habit it
// has to unlearn later.
export function unseal(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SEALS.get(id) || null), 420)
  })
}

// What the sheet renders in a seal's place before it is unsealed. Same length,
// same word rhythm, none of the characters. The real string is never in the
// document, so there is nothing to reveal with a devtools toggle.
export function decoy(len) {
  let out = ''
  let run = 0
  for (let i = 0; i < len; i++) {
    // Word lengths that look like English rather than a block of one glyph.
    if (run > 2 && rand(`d${len}`, i) > 0.72) { out += ' '; run = 0; continue }
    out += '█'
    run += 1
  }
  return out
}

// ── writing ─────────────────────────────────────────────────────────────────
// Nothing leaves the tab. The letter is prepended to the corpus so the wall it
// goes back to is visibly one letter heavier, which is the entire payoff of
// the sealing screen and the reason the prototype bothers to keep a corpus in
// memory rather than rendering a static list.

export function write({ to, body, seal }) {
  const h = normHandle(to)
  const id = idFor(`${h}:${body}:${Date.now()}`)
  const row = {
    id,
    to: h,
    body: String(body || '').trim(),
    sealed: !!(seal && seal.trim()),
    sealLen: seal ? seal.trim().length : 0,
    at: Date.now(),
    mine: true,
  }
  if (row.sealed) SEALS.set(id, seal.trim())
  AUTHORS.set(id, 'author:you')
  WRITTEN.unshift(row)
  return row
}

// ── time, in words ──────────────────────────────────────────────────────────
// No library, and no "2h ago". The wall is a slow object and its clock should
// read like one.
export function ago(ts) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (mins < 60) return mins === 1 ? 'a minute ago' : `${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs === 1 ? 'an hour ago' : `${hrs} hours ago`
  const days = Math.round(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  const wks = Math.round(days / 7)
  return wks === 1 ? 'a week ago' : `${wks} weeks ago`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// The dateline on the paper card, set the way the reference sets it:
// "14. March 2026" on the left, "Thursday" on the right.
export function dateline(ts) {
  const d = new Date(ts)
  return { date: `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, day: DAYS[d.getDay()] }
}

export { DAY }

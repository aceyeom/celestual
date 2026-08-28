// The mock adapter. Default, and the reason this demo runs with zero backend:
// a flyer goes up on a Tuesday and the wall has to be walkable the same night,
// on a phone, in the dark, without a Supabase project existing yet.
//
// ── what the mock can and cannot honour ─────────────────────────────────────
// It honours the SHAPE of every guarantee: `authorHandle` is never returned by
// any method, `sealedLine` is never on a Letter, and `unlockSeal` is the only
// door to a seal. What it cannot honour is the guarantee itself — with no
// server, the seeded seals are in the JavaScript bundle, and a determined
// person with devtools can read them. That is a property of having no backend,
// not of this design, and it is exactly why the seal is rendered from a DECOY
// string of matching length rather than from the real one: the code path the
// screens use is the same path that is safe in production, so nothing has to
// change when the Supabase adapter takes over.

import { SEED, normSource } from './seed.js'
import { getState, patch } from '../store.js'
import { normHandle } from '../handles.js'
import { classify } from '../moderate.js'

const DAY = 86400000

// A stable, uuid-shaped id derived from the handle. Stable is the requirement,
// not random: /beta/letter/:id has to survive a refresh, a back button and a
// link pasted into a DM, and a re-seeded random id breaks all three.
function idFor(seedStr) {
  let a = 0x9e3779b9, b = 0x85ebca6b
  for (let i = 0; i < seedStr.length; i++) {
    a = Math.imul(a ^ seedStr.charCodeAt(i), 0x27d4eb2d) >>> 0
    b = Math.imul(b ^ (a >>> 13), 0x165667b1) >>> 0
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0')
  const raw = (hex(a) + hex(b) + hex(a ^ b) + hex(Math.imul(a, 3) ^ b)).slice(0, 32)
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`
}

// Ages spread across the window so the wall reads as something that has been
// accumulating rather than something that was installed. Derived from the id,
// so a letter is the same age on every reload — a countdown that resets when
// you refresh is a countdown nobody believes.
function agesFor(id) {
  const n = parseInt(id.slice(0, 6), 16)
  const ageDays = n % 27
  const created = Date.now() - ageDays * DAY - (n % 17) * 3600000
  return { createdAt: new Date(created).toISOString(), expiresAt: new Date(created + 30 * DAY).toISOString() }
}

// The mock's "server". Seals live here and are handed out one at a time by
// unlockSeal; nothing else in this module reads them, and no method returns
// this map or anything derived from it except that one call.
const SEALS = new Map()
const AUTHORS = new Map()

const LIVE = SEED.map((row, i) => {
  const id = idFor(row.h + ':' + i)
  const { createdAt, expiresAt } = agesFor(id)
  if (row.s) SEALS.set(id, row.s)
  // Seeded letters have authors too. They are set here so that no code path
  // can accidentally work only because the field happened to be empty.
  AUTHORS.set(id, `someone.${i}`)
  return { id, targetHandle: row.h, body: row.b, hasSeal: !!row.s, createdAt, expiresAt }
})

function written() {
  return getState().written.filter((l) => l.status === 'live')
}

function publicShape(l) {
  return {
    id: l.id,
    targetHandle: l.targetHandle,
    body: l.body,
    hasSeal: l.hasSeal,
    createdAt: l.createdAt,
    expiresAt: l.expiresAt,
  }
}

function all() {
  const removed = getState().removed
  return [...LIVE, ...written()].filter((l) => !removed[l.id] && new Date(l.expiresAt) > new Date())
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const mockRepo = {
  async logScan(sourceCode) {
    patch({ source: normSource(sourceCode) })
  },

  async findByHandle(handle) {
    const h = normHandle(handle)
    if (!h) return []
    await wait(240)
    return all().filter((l) => l.targetHandle === h).map(publicShape)
  },

  async getLetter(id) {
    await wait(140)
    const found = all().find((l) => l.id === id)
    return found ? publicShape(found) : null
  },

  async createLetter(input) {
    const verdict = await classify(input)
    if (verdict.verdict === 'reject') {
      return { id: '', status: 'rejected', reason: verdict.reasons[0] || 'rejected' }
    }
    const id = idFor(`${input.targetHandle}:${input.body}:${Date.now()}`)
    const createdAt = new Date().toISOString()
    const letter = {
      id,
      targetHandle: normHandle(input.targetHandle),
      body: input.body,
      hasSeal: !!input.sealedLine,
      createdAt,
      expiresAt: new Date(Date.now() + 30 * DAY).toISOString(),
      // 'review' holds at pending and renders nowhere, exactly as production
      // would. The screens must not treat pending as a failure — the letter is
      // real, it is queued, and a person will move it.
      status: verdict.verdict === 'pass' ? 'live' : 'pending',
    }
    if (input.sealedLine) SEALS.set(id, input.sealedLine)
    AUTHORS.set(id, normHandle(input.authorHandle))
    patch({ written: [...getState().written, letter] })
    return { id, status: 'pending' }
  },

  async joinWaitlist(handle, sourceCode) {
    await wait(500)
    patch({ waitlisted: true, handle: normHandle(handle), source: normSource(sourceCode || getState().source) })
  },

  // Shaped for the production path — an Instagram DM code delivered by
  // ManyChat — so the mock swaps out without touching a screen. The challenge
  // id is what the real flow returns, and the real flow's code never travels
  // through the client either.
  async startVerification(handle) {
    await wait(700)
    return { challengeId: idFor(`challenge:${normHandle(handle)}:${Date.now()}`) }
  },

  async confirmVerification(_challengeId, code) {
    await wait(1200)
    return { ok: /^\d{6}$/.test(String(code || '')) }
  },

  async claimLetter(letterId, handle) {
    await wait(200)
    const s = getState()
    patch({ claimed: { ...s.claimed, [letterId]: true }, handle: normHandle(handle) })
  },

  async requestReveal(letterId) {
    await wait(600)
    const s = getState()
    patch({ asked: { ...s.asked, [letterId]: true } })
    // Pending, and it stays pending. The whole product is that the other person
    // chooses; a demo that fakes an instant unlock here teaches the wrong
    // mechanic to the first hundred people who see it.
    return { status: 'pending' }
  },

  async unlockSeal(letterId) {
    await wait(300)
    return { sealedLine: SEALS.get(letterId) || '' }
  },

  // One tap, no questions, no appeal flow. Not in a footer, not behind a menu.
  // This is the single thing that keeps a wall of anonymous letters about named
  // people from reading as predatory, and it only works if it is visibly easy.
  async removeLetter(letterId) {
    await wait(400)
    const s = getState()
    patch({ removed: { ...s.removed, [letterId]: true } })
  },

  async liveCount() {
    return all().length
  },
}

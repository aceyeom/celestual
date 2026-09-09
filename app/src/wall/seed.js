// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PRINTED SURFACES                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// This file used to hold the wall's seeded corpus (seventy-two invented letters
// across sixty-six invented handles) and the seeded ledger the /berkeley/orbit
// stand-in drew. Neither has been read since Phase 6b put the wall on a server:
// the corpus came off wall_letters through api.js, and nothing imported SEED at
// all, while the orbit stand-in stayed reachable by typing its address and drew
// a core service with invented mutuals in it, dated 17.03.2026. The audit of
// 4 September removed the stand-in (screens/Core.jsx, orbit.js) and the data it
// stood on. What is left is what the live wall reads from here: which piece of
// paper somebody came in off, and how far they got once they were here.
import { CODES } from '../cards.js'
import { getState, push } from './store.js'
import { logStep } from './api.js'

// ── which piece of paper ────────────────────────────────────────────────────
// Every printed surface carries a code in its QR (/berkeley?s=flyer-a), read
// once by the shell, attached to the scan, the letter and the waitlist row it
// produces, and scrubbed out of the address. Which quote and which corner
// actually works is a question you only get to answer if you asked it before
// printing.
//
// The five ad cards are the registry in src/cards.js, because their codes are
// read by main.jsx before any of the wall is loaded and a second list of them
// here is a list that would drift. What is written out below is everything
// else that has ever been printed.
export const SOURCES = [...CODES, 'flyer-a', 'flyer-b', 'flyer-c', 'card', 'chalk', 'table', 'direct']

export function normSource(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  return SOURCES.includes(s) ? s : 'direct'
}

// ── the middle of the funnel ────────────────────────────────────────────────
// A scan says somebody pointed a phone at a piece of paper. It does not say
// whether the paper worked, and until migration 0047 nothing between the scan
// and a letter three days later was written down at all, so a card that put
// forty people on the wall read as worse than one nobody scanned.
//
// These four are what a card is actually judged on:
//
//   read     a letter was opened
//   gate     an address was given and a code asked for
//   joined   a proof landed. This one is onboarding
//   handoff  the door into the rest of the product was taken
//
// Once per device per card, which is what makes the counts read as people
// instead of as taps: the step is remembered in the same blob everything else
// on this surface is remembered in, and the one reset clears it with the rest.
// Nothing about a person goes up with it. The code, the step, the campus.
export function cardStep(name) {
  const state = getState()
  const code = state.source
  if (!code || code === 'direct') return
  const once = `${code}:${name}`
  if ((state.steps || []).includes(once)) return
  push('steps', once)
  logStep(code, name)
}

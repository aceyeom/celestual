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
// stood on. What is left is the one thing the live wall reads from here.
//
// ── which piece of paper ────────────────────────────────────────────────────
// Every printed surface carries a code in its QR (/berkeley?s=flyer-a), read
// once by the shell, attached to the scan, the letter and the waitlist row it
// produces, and scrubbed out of the address. Which quote and which corner
// actually works is a question you only get to answer if you asked it before
// printing.
export const SOURCES = ['flyer-a', 'flyer-b', 'flyer-c', 'card', 'chalk', 'table', 'direct']

export function normSource(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  return SOURCES.includes(s) ? s : 'direct'
}

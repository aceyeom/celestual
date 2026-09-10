// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE PRINTED CARDS, AND THE ROUTE THEY POINT AT                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Five ad cards went out. Each one carries its own code, and each code is a
// QR pointing at an address on this site rather than at the wall directly:
//
//     https://celestual.us/c/a   .. /c/e
//
// ── WHY THE CODES ARE ONE LETTER ─────────────────────────────────────────────
// Because the whole string is printed, and a shorter string is a smaller QR.
// `celestual.us/c/a` is sixteen characters, which fits the smallest symbol
// there is: fewer, fatter modules, read from further away, in worse light, by
// an older phone, at a worse angle. That is the entire argument, and on a card
// somebody scans while walking past it is not a small one.
//
// Set the URL in the QR in UPPERCASE (`HTTPS://CELESTUAL.US/C/A`) and it is
// smaller again: a QR encoder drops into its alphanumeric mode, which has no
// lowercase in it, and packs about a third more into the same symbol. A domain
// is case blind and `parse` below lowercases the code, so the address works
// either way. Nothing about this file has to change for it.
//
// ── WHY A ROUTE OF OUR OWN AND NOT `?s=` ON THE WALL ─────────────────────────
// Paper cannot be redeployed. A card printed with `/berkeley?s=a` on it is
// pointed at the wall for as long as the card exists, and every question that
// comes after printing (should card d go to the wall or to the front door,
// should the run of cards left in a drawer be pointed at the next campus, does
// this one still work now the wall is closed) is answered by reprinting.
//
// `/c/<code>` is one hop we own. `to` below is the only thing that decides
// where a card lands, it is one word in one file, and changing it is a deploy
// rather than a print run. The hop costs nothing: the rewrite happens in
// main.jsx before anything mounts, in the history rather than through a
// navigation, so a person who scans a card sees the wall and never sees this.
//
// ── AND THE CODE RIDES ON ────────────────────────────────────────────────────
// The route hands the code to the surface it lands on as `?s=<code>`, which is
// the attribution the wall has had since 0032: it is logged once as a scan,
// attached to any letter or waitlist row that session produces, and scrubbed
// out of the address so that a link somebody pastes to a friend does not
// attribute their scan to a card they never saw.
//
// ── WHERE THE OTHER HALF IS ──────────────────────────────────────────────────
// migration 0047. `wall_cards` holds the same five rows, `wall_card_events`
// holds what happened after the scan, and the desk's cards screen is where the
// five are read against each other. This file and that table are kept the same
// by hand: this one is what the browser reads, that one is what the desk reads.

// What goes on paper. The desk shows the link built from this rather than from
// the address the desk happens to be open at, because a card printed with a
// preview deployment's hostname on it is a card that stops working.
//
// It is also the one line to change for a shorter domain. A second, shorter
// name pointed at the same deployment would print as `<name>/c/a` and need
// nothing else in the app: this constant is what the desk copies out, and the
// route below is what the deployment answers.
export const SITE = 'https://celestual.us'

// The route. One letter, because it is read off a card by somebody standing up.
//
// It stays a prefix rather than becoming the whole path: `/a` would be four
// characters shorter and would spend five single letters out of the top level
// of the site, where every future route lives. `/c/` costs two characters and
// says what the address is.
export const BASE = '/c'

// ── the five ─────────────────────────────────────────────────────────────────
// The codes are a through e and they say nothing about the creative on purpose:
// a code named for the quote on the card is a code that is wrong the first time
// the quote changes, and the code is the one thing here that is printed.
//
// `label` is what the desk shows instead of the letter, and it and the card's
// place are editable there (celestual_desk_card_set), so what is written here
// is only the state they start in.
export const CARDS = [
  { code: 'a', label: 'card a', to: '/berkeley' },
  { code: 'b', label: 'card b', to: '/berkeley' },
  { code: 'c', label: 'card c', to: '/berkeley' },
  { code: 'd', label: 'card d', to: '/berkeley' },
  { code: 'e', label: 'card e', to: '/berkeley' },
]

export const CODES = CARDS.map((c) => c.code)

export function card(code) {
  const c = String(code || '').trim().toLowerCase()
  return CARDS.find((x) => x.code === c) || null
}

// The address that goes in the QR. Absolute, because it is printed.
export function link(code) {
  return `${SITE}${BASE}/${code}`
}

// Is this the card route, and if so which card. Anything else answers null and
// is left to the fork in main.jsx to route as it always has.
//
// An unknown code still lands: a person holding a piece of paper that says
// celestual.us on it has to arrive somewhere, and a not found drawn at somebody
// who did what the card asked is the worst possible answer to a scan. They go
// to the wall, unattributed, which is what an untracked card would have done
// anyway.
export function parse(pathname) {
  // The WHOLE path, lowered, not just the code on the end of it. A QR encoder
  // packs an uppercase string into a smaller symbol (its alphanumeric mode has
  // no lowercase in it), so the address printed on a card is very likely to be
  // `HTTPS://CELESTUAL.US/C/A`, and a route that lowered the code but matched
  // `/C/A` against `/c` sent every one of those scans to a not found. It is the
  // one route in the product that is case blind, and it is case blind because
  // it is the one route that arrives off a piece of paper.
  const p = String(pathname || '/').replace(/\/+$/, '').toLowerCase()
  if (p !== BASE && !p.startsWith(BASE + '/')) return null
  const code = p.slice(BASE.length + 1)
  const known = card(code)
  return { code: known ? known.code : '', to: known ? known.to : '/berkeley' }
}

// Where a scan of this path should end up, with the code riding along. Used by
// main.jsx, which puts it in the history before the first render.
export function landing(pathname, search = '') {
  const hit = parse(pathname)
  if (!hit) return null
  const q = new URLSearchParams(search || '')
  if (hit.code) q.set('s', hit.code)
  const rest = q.toString()
  return hit.to + (rest ? `?${rest}` : '')
}

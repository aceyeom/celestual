// ── the wall ────────────────────────────────────────────────────────────────
//
// The wall was one tree drawn for two walls: `/berkeley`, the campus wall it
// was built as, and `/`, the same wall for everybody. Since the rulings of
// 25 September there is one (docs/ONE-WALL.md). Every letter is on the wall
// at `/`, and a letter's campus is the school it CARRIES, not the wall it is
// on: an @-note posted by a verified Berkeley address carries Berkeley and
// its mark (schools.js), and a name note carries whichever school the
// writer picked, or none.
//
// So what is left here is the wall's own lines, in one row: the masthead,
// the composer's first question and the examples under its empty card, and
// the tab's title. The schools themselves (their names, their colours,
// which domain is which) are schools.js, and which campuses are open is the
// server's (`wall_campuses_open`, api.js `campuses`).
//
// `configure` is still called once, by the entry (main.jsx), before the
// shell mounts, because the router's base is read by everything that builds
// an address and has to be settled before the first one is built.
import { setBase } from './router.js'

export const WALL = {
  slug: 'global',
  base: '',
  // the word in the caption over the search, and in the composer
  name: 'celestual',
  place: '',
  domain: null,
  // the veil: the title, the line under it, and whether the mark stands
  // over it
  title: ['a wall of', 'the ones you', 'never told.'],
  sub: 'anonymous letters, to an Instagram or to a name. read them, or write one.',
  mark: true,
  // the composer's first question, and the examples under its empty card.
  //
  // They are LOWER CASE, like the wall they are examples of: VOICE.md exempts
  // what a person in the product WROTE, and these are not that, they are
  // the product demonstrating.
  someone: ['someone you', 'can’t forget.'],
  examples: [
    'you gave me your umbrella outside the station and walked home in it. i still have it.',
    'you sat two rows ahead all year and never once turned round. i noticed anyway.',
    'you held the door at two in the morning and asked if i was okay. i was not, and then i was.',
    'you were the one singing on the last train that night. i wanted the song to be about me.',
  ],
  docTitle: 'celestual · someone wrote something they never sent',
}

// The one row, under the name the old table used for it, so anything that
// still looks a wall up by slug finds it.
export const CAMPUSES = { global: WALL }

export function configure() {
  setBase(WALL.base)
  return WALL
}

// The wall this tree is drawn for.
export function campus() { return WALL }


// ── the campus ──────────────────────────────────────────────────────────────
//
// The wall is one tree drawn for two walls. `/berkeley` is the campus wall
// it was built as: a berkeley.edu address writes, and the cards printed with
// its address still land on it. `/` is the same wall for everybody: no
// campus, no domain, and anybody the product has proved may write, by their
// instagram, their google or an address with a code (migration 0057).
//
// Everything that differs between the two is a row here and nothing else:
// where it is mounted, which campus row the schema files it under, what the
// gate asks for, and the handful of lines that name the place. A screen that
// needs to know which wall it is on asks `campus()`; nothing under wall/
// spells a slug or a domain of its own.
//
// `configure` is called once, by the entry (main.jsx), before the shell
// mounts, because the router's base is read by everything that builds an
// address and has to be settled before the first one is built.
import { setBase } from './router.js'

export const CAMPUSES = {
  berkeley: {
    slug: 'berkeley',
    base: '/berkeley',
    // the word in the caption over the search, and in the composer
    name: 'berkeley',
    place: 'Berkeley',
    // the address that writes here, and how celestual-edu-verify knows it
    domain: 'berkeley.edu',
    eduSlug: 'uc-berkeley',
    // the veil: the title, the line under it, and whether the mark stands
    // over it
    title: ['a wall of', 'unforgettable', 'berkeley bears.'],
    sub: 'anonymous letters to the one you never told.',
    mark: false,
    // the composer's first question, and the examples under its empty card,
    // set on this campus: a place a person there has actually stood.
    //
    // They are LOWER CASE, like the wall they are examples of. They were
    // sentence case, and they are the same sentences the corpus carries in
    // lower case — so the model the product held up to a writer, on the one
    // screen where it is showing them what a letter looks like, was the one
    // piece of text on the wall that did not look like the wall. VOICE.md
    // exempts what a person in the product WROTE, and these are not that:
    // they are the product demonstrating. The place names keep their case.
    someone: ['someone at Berkeley', 'you can’t forget.'],
    examples: [
      'you gave me your umbrella outside Wheeler and walked home in it. i still have it.',
      'you sat two rows ahead in Dwinelle all semester and never once turned round. i noticed anyway.',
      'you held the door at Moffitt at two in the morning and asked if i was okay. i was not, and then i was.',
      'you were the one singing on the 51B that night. i wanted the song to be about me.',
    ],
    docTitle: 'celestual · berkeley · someone here wrote something they never sent',
  },
  global: {
    slug: 'global',
    base: '',
    name: 'celestual',
    place: '',
    domain: null,
    eduSlug: null,
    title: ['a wall of', 'the ones you', 'never told.'],
    sub: 'anonymous letters, addressed to an instagram. read them, or write one.',
    mark: true,
    someone: ['someone you', 'can’t forget.'],
    examples: [
      'you gave me your umbrella outside the station and walked home in it. i still have it.',
      'you sat two rows ahead all year and never once turned round. i noticed anyway.',
      'you held the door at two in the morning and asked if i was okay. i was not, and then i was.',
      'you were the one singing on the last train that night. i wanted the song to be about me.',
    ],
    docTitle: 'celestual · someone wrote something they never sent',
  },
}

let CURRENT = CAMPUSES.berkeley

export function configure(slug) {
  CURRENT = CAMPUSES[slug] || CAMPUSES.berkeley
  setBase(CURRENT.base)
  return CURRENT
}

// The wall this tree is drawn for.
export function campus() { return CURRENT }

// Whether writing here needs a campus address (a wall with a domain), or
// any proof the product takes (the wall at the root).
export function needsCampus() { return !!CURRENT.domain }

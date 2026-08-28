# `/beta` — the wall

The event surface, and a **visual prototype**. It reaches no server, it stores
nothing outside the tab it is open in, and it ships populated — seventy-two
letters across sixty-six handles — so the whole thing can be walked cold, on a
phone, by somebody who has never seen it.

Run it: nothing to configure. `npm run dev`, open `/beta`.

---

## The one rule everything else follows from

**The wall asks nobody who they are.**

No account. No sign-in. No handle to prove. No "is there one for me". No
notification to wait for and no mutual arriving. The wall does not know who is
reading it and has nothing to attach a reader to — which is what makes it safe
to hand out on a piece of paper, and what makes reading it cost nothing.

That is also why the letters are public all the way through. An earlier build
kept a second line on each one that only the person it was about could open,
which meant the wall had to know who you were, which meant a stranger who had
scanned a card thirty seconds ago was being asked to prove a handle before
they could finish reading. That was the moment it fell over. It is gone.

The core service is the opposite of all of it — accounts, identity, pings,
mutuals — and it is somewhere else. There is exactly one door between them.

## The event

Cards and flyers go out with a QR code on them. The code lands on the wall.

```
   scan ──▶ THE WALL ──┬──▶ a letter, in full, no questions asked
                       │         └──▶ write one to them
                       ├──▶ look for a name
                       │         └──▶ nobody has? be the first
                       └──▶ write one
                                  │
                                  ▼
                             it's up ──▶ back to the wall
                                              │
                                    ┌─────────┴──────────┐
                                    │  and only NOW, a   │
                                    │  tab at the bottom │
                                    └─────────┬──────────┘
                                              ▼
                            "Register to find out if they put you down too."
                                              │
                                              ▼
                                      THE CORE SERVICE
```

The tab is the only route out of the wall, and it does not exist until
somebody has put a letter up. Offering an account to a person who has not
written anything is asking them to register for a result they cannot receive.
Offering it thirty seconds after they have named somebody is asking the one
question they are now actually carrying.

## The screens

| Route | What it is |
| --- | --- |
| `/beta` | **the wall** — one inscription, sixty-six names at three weights |
| `/beta/letter/:id` | a letter, whole, over the dimmed wall |
| `/beta/find` | the search. Opens on the names carrying the most letters |
| `/beta/write` · `/beta/write/:handle` | the composer, two steps, written on the card itself |
| `/beta/posted` | three beats, and the wall really does gain the letter |
| `/beta/join` | **the one door** — the mechanism in three lines and one ornament |
| `/beta/orbit` · `/beta/orbit/:id` | the core service: the ledger, and the mutual reveal |

Three of those are **sheets, not pages**: `letter`, `find` and `write` rise off
the bottom edge over a wall that stays mounted, scrolled where it was, dimmed
and slightly out of focus behind them — and on a wide screen they become
centred dialogs instead, because a sheet dragged up from the bottom of a
1400px display is a phone gesture on furniture that is not a phone.

## Navigation

Three targets, in the same two places, on every screen of the wall, and not one
word among them:

| | |
| --- | --- |
| ✦ | the mark, top left. On the wall it goes to the top; off it, it grows a chevron and goes back to the wall |
| ☰ | **the wall** — four lines of unequal length, the inscription seen small |
| ⌕ | **look for a name** |
| ✎ | **write a letter** |

Where you are is said by the ground behind the glyph lighting, not by a label.
Every icon carries a `title` and an `aria-label`, so the bar is legible without
a word drawn on it and still navigable without sight. The glyphs are in
`parts.jsx` and none of them exists in an icon library.

## The layout

```
index.jsx    the shell — routing, the cut, the persistent star field, ?s=
wall.css     every rule scoped under .wl-root
router.js    seven routes, no dependency
art.jsx      the ornaments, all drawn here: sparkle, halftone sphere, ring
             system, bloom, per-handle constellation, the star field
parts.jsx    display · label · prose · arrow link · pill · paper · fields ·
             sheet · row · icons · the bar · step dots
data.js      handles, the deterministic hash everything derives from, the
             corpus, search, write
seed.js      the letters, the sources, the ledger
screens/     one file per screen
```

## The design, and where it comes from

Four reference sheets, read literally:

| reference | what it gave |
| --- | --- |
| the concert poster | a Didone set enormous with a terminal period; letterspaced monospace; nav as an arrow and a word; the four-point sparkle; the dotted sphere in a corner; step dots; grain |
| the journal | a cream card with a generous radius, a dateline across the top under a hairline, old-style serif beneath |
| the modal | one enormous soft blurred mass, a light capsule, and everything behind it dimmed rather than replaced |
| the journey view | a ring system bleeding off both edges; the date set enormous; **one** saturated capsule; rows of mark, name, meta and capsule; sections; a gradient off the bottom |

Two things are bright and both are rationed to **once per screen**. The
**bloom** is a luminance rather than a colour — warm white through a heavy blur
— and goes on the one object that matters most. The **ember** is the single
saturated colour in the build: search `wall.css` for `--ember` and there are
four uses, one of which is a 4px dot.

Nothing is downloaded. No icon set, no illustration, no stock anything — every
ornament in `art.jsx` is a path or a loop, and most are derived from a handle,
which an icon library cannot do because it does not know what it is next to.

## Three layouts

The phone is the one this was designed for and it does not change.

- **≥ 900px** — the wall becomes a spread: the masthead takes its own sticky
  column and the names run beside it, which is the shape the poster reference
  actually is. Sheets become centred dialogs. The core service puts its ring
  system beside its ledger.
- **landscape phone** (`max-height: 560px`, `min-width: 640px`) — the same
  spread, early, and every vertical measure that was buying atmosphere gives
  its space back. On 390px of height, atmosphere is just scrolling.
- **≥ 1280px** — the column stops growing. Past that the field around it is the
  design.

## What it touches

This tree, and one line elsewhere: `app/src/main.jsx` forks on `/beta` and
lazy-imports it. Nothing in production imports from `src/wall/`; the wall is a
separate chunk (~18 kB gzip of JS, ~8 kB of CSS) and the four Google faces it
needs are injected on mount and removed on unmount, so neither reaches anybody
who did not scan a piece of paper. No shared component, no global token, no
`vercel.json`, no `vite.config.js`.

## Known, and deliberately left

- **`supabase/migrations/0027_beta_wall.sql` and
  `supabase/functions/celestual-beta-moderate/` belong to an older build.**
  Undeployed and inert, and they describe a workflow that no longer exists —
  a wall queried one handle at a time, with a per-letter seal and a
  pre-publication moderation queue. They are **not** the schema for what is in
  this directory, and they should be replaced rather than extended.
- **`/beta` downloads the production entry chunk** (~188 kB gzip) because
  `main.jsx` is the single Vite entry and imports `App.jsx` statically. The
  real fix is a second Vite entry, which needs `vite.config.js` and
  `vercel.json`; lift that constraint and it is a `rollupOptions.input` key
  plus one rewrite.
- **Reduced motion is honoured by jumping, not by freezing.** Two sequences
  here (the posting's three beats, the door's four) are the only way those
  screens reach their final state, so the preference is read in JS and the
  screen starts at the last beat.

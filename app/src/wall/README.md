# `/beta` — the wall

The event surface, and a **visual prototype**. It reaches no server, it stores
nothing outside the tab it is open in, and it ships populated — seventy-two
letters across sixty-six handles, three pings in three states — so the whole
thing can be walked cold, on a phone, by somebody who has never seen it.

Run it: nothing to configure. `npm run dev`, open `/beta`.

---

## What the event is

Cards and flyers go out with a QR code on them. The code lands here.

The previous build opened on a title card and sent you to a field where you
typed your own handle and found out — nineteen times in twenty — that nothing
was there. That asks somebody who has just picked a card up off a table to
place a bet before they have seen the table.

**So the code lands on the wall itself.** Sixty-six names, already written to,
already up, readable and tappable in the first second. The search is a button
in the corner for the one person in twenty who came looking for themselves.
Everybody else browses, reads two letters, and is met by a composer already
half on screen under a gradient.

```
   scan ──▶ THE WALL ──┬──▶ a letter ──▶ open its seal ──▶ "so who wrote it?"
                       │                                            │
                       ├──▶ find ──▶ nothing under your name ───┐   │
                       │                                        │   │
                       └──▶ write one ◀───────────────────────── ┘  │
                                  │                                 │
                                  ▼                                 ▼
                             the seal ──▶ it's on the wall ──▶ THE MUTUAL BLIND
                                                                    │
                                                                    ▼
                                                              the product
```

Every road out of the wall arrives at the same place, and it is the product:
you can read what somebody wrote, you can find out the one detail only you
would know, and the one thing you can never learn is who — unless they write
yours. That is not a limitation the prototype apologises for. It is the hinge
the whole event turns on, and `screens/Blind.jsx` is where it is made.

## The screens

| Route | What it is |
| --- | --- |
| `/beta` | **the wall** — one inscription, sixty-six names at three weights |
| `/beta/letter/:id` | a letter, on paper, over the dimmed wall. The seal opens here |
| `/beta/find` | the search. Opens on the names carrying the most letters |
| `/beta/none` | **nobody wrote to you** — the hero of the build, not the fallback |
| `/beta/write` · `/beta/write/:handle` | the composer, three steps, written on the card itself |
| `/beta/sealed` | the seal: four beats, and the wall really does gain the letter |
| `/beta/blind` | the hand-off — the mechanism in three lines and one diagram |
| `/beta/orbit` · `/beta/orbit/:id` | the product, standing: the ledger, and the mutual reveal |

Three of those are **sheets, not pages**: `letter`, `find` and `write` rise off
the bottom edge over a wall that stays mounted, scrolled where it was, dimmed
and slightly out of focus behind them. That is why the composer reads as part
of the wall instead of a form the wall sent you away to fill in, and it is why
those three take no cut. Everything has an address anyway, because a prototype
whose job is to be walked by other people has to be deep-linkable.

## The layout

```
index.jsx    the shell — routing, the cut, the persistent field, ?s= attribution
wall.css     every rule scoped under .wl-root
router.js    eight routes, no dependency
art.jsx      the ornaments, all drawn here: sparkle, halftone sphere, ring
             system, bloom, per-handle constellation, the star field
parts.jsx    display · label · prose · arrow link · pill · paper · fields ·
             sheet · row · step dots
data.js      handles, the deterministic hash everything derives from, the
             corpus, search, write, the seal door
seed.js      the letters, the sources, the ledger
screens/     one file per screen
```

## The design, and where it comes from

Four reference sheets, read literally:

| reference | what it gave |
| --- | --- |
| the concert poster | a Didone set enormous with a terminal period; letterspaced monospace under it; nav as an arrow and a word; the four-point sparkle; the dotted sphere in a corner; step dots; grain |
| the journal | a cream card with a generous radius, a dateline across the top under a hairline, old-style serif beneath |
| the modal | one enormous soft blurred mass, a light capsule, and everything behind it dimmed rather than replaced |
| the journey view | a ring system bleeding off both edges; the date set enormous; **one** saturated capsule; rows of mark, name, meta and capsule; sections; a gradient off the bottom |

Two things are bright and both are rationed to **once per screen**. The
**bloom** is a luminance rather than a colour — warm white through a heavy blur
— and goes on the one object that matters most. The **ember** is the single
saturated colour in the build: search `wall.css` for `--ember` and there are
four uses, one of which is a 4px dot. A near-black interface with a warm accent
everywhere is the most recognisable machine-made look on the web, and this
brand cannot afford to look generated. The ration is the difference.

Nothing is downloaded. There is no icon set, no illustration and no stock
anything in the tree — every ornament in `art.jsx` is a path or a loop, and
most of them are derived from a handle, which is a thing an icon set cannot do
because an icon set does not know what it is next to.

## The two rules that are not style

**`author` never reaches a screen. `seal` does not until it is asked for.**

Not by a `select` list and not by a filter somebody could forget. The author is
in a `Map` inside `data.js` that no exported function reads, and the seal is
behind `unseal()` — the one door, and the only thing in the module that touches
that map. What the letter sheet renders before then is a **decoy** of matching
length generated at render time, so the real string is not in the document,
behind a blur or otherwise. Open the inspector at the demo table and there is
nothing there.

Both hold here the same way they will hold against a real backend — the value
is somewhere the render path cannot reach — so none of these screens has to
change when one arrives underneath them.

## What it touches

This tree, and one line elsewhere: `app/src/main.jsx` forks on `/beta` and
lazy-imports it. Nothing in production imports from `src/wall/`; the wall is a
separate chunk (~19 kB gzip of JS, ~7 kB of CSS) and the four Google faces it
needs are injected on mount and removed on unmount, so neither reaches anybody
who did not scan a piece of paper. No shared component, no global token, no
`vercel.json`, no `vite.config.js`.

## Known, and deliberately left

- **`supabase/migrations/0027_beta_wall.sql` and
  `supabase/functions/celestual-beta-moderate/` belong to the previous build.**
  Both are undeployed and inert, and both describe the old workflow (a wall you
  could not browse, queried one handle at a time, with a pre-publication
  moderation queue). They are **not** the schema for what is in this directory.
  Left in place rather than deleted, because a prototype's rewrite is not the
  moment to throw away backend work nobody asked to lose — but they should be
  replaced, not extended, when this goes to a server.
- **`/beta` downloads the production entry chunk** (~188 kB gzip) because
  `main.jsx` is the single Vite entry and imports `App.jsx` statically. Making
  that import dynamic would fix it and would cost every production visitor a
  round trip before first paint. The real fix is a second Vite entry, which
  needs `vite.config.js` and `vercel.json`. Lift that constraint and it is a
  `rollupOptions.input` key plus one rewrite.
- **Reduced motion is honoured by jumping, not by freezing.** Two sequences
  here (the seal's four beats, the hand-off's four) are the only way those
  screens reach their final state, so the preference is read in JS and the
  screen starts at the last beat. Switching the animations off wholesale would
  leave somebody looking at an empty page.

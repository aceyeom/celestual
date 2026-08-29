# `/beta` — the wall

The event surface, and a **visual prototype**. It reaches no server, it stores
nothing outside the tab it is open in, and it ships populated — seventy-two
letters across sixty-six handles — so the whole thing can be walked cold, on a
phone, by somebody who has never seen it.

Run it: nothing to configure. `npm run dev`, open `/beta`.

---

## The two rules everything else follows from

### 1 · The index is public. The letters are not.

The wall carries two different things and they cannot have the same rule.

| | |
| --- | --- |
| **the index** | sixty-six handles, the count against each one, and nothing else. **Open to everybody.** It is what somebody who has just scanned a code off a card has to be able to see in four seconds without answering anything, and it is how a person finds their own name in order to ask for it to come off. |
| **the letters** | what was actually written. **Behind a `berkeley.edu` address.** A wall of things students wrote about each other, readable by the open internet, is a different object from one readable by the campus it is about. |

So a letter arrives at a stranger **redacted** — the real letter, at its real
length, with every word struck out and nothing readable in the document — and
an address lifts it. Nothing else on the surface moves: the names, the counts,
the search and the composer are all still open, and the first time anybody is
asked for anything is the moment they try to read what somebody wrote.

The gate is on **reading**. Writing stays anonymous: the address is never
attached to a letter, the composer never reads it, and a letter still has three
fields with no fourth one to leak. Those two facts are independent on purpose.

### 2 · Anybody on the wall can take themselves off it, instantly, with no account.

Listing a handle on a public wall says, in public, that this person is being
written about, and not one of them agreed to it. So the way back off costs one
tap: no account, no address, no code, no form, no reason to give, no queue. The
name and every letter under it are gone before the sheet has finished
animating, and the name cannot be put back up.

A takedown behind a sign-up is a takedown that says *make an account first* to
the one person on the wall who never chose to be there. The obvious objection —
anybody can take down anybody — is the right trade and it is not close: a wrong
removal costs one name off a wall and can be asked for again, and a slow one
costs somebody the ability to get their own name off a public page about them.
The check that would fix it is a check that a person is who they say, and every
honest version of that is a login. The place for proof is **afterwards**, on
the way back on.

It is reachable from three places, none of them a footer: beside the name on
any letter (`this is me`), under the names on the wall itself, and from the
search.

The core service is the opposite of all of it — accounts, identity, pings,
mutuals — and it is somewhere else. There is exactly one door between them, and
it is not this one: the letter gate opens the wall's own letters and nothing
more.

## The event

Cards and flyers go out with a QR code on them. The code lands on the wall.

```
                     ┌──▶ a letter ──┬─ from berkeley? ──▶ read it whole
                     │               └─ otherwise ───────▶ redacted, and one
                     │                                     offer: an address
   scan ──▶ THE WALL ┼──▶ look for a name
     (no questions   │         └──▶ nobody has? be the first
      asked, ever)   ├──▶ that's my name ──▶ ONE TAP ──▶ off the wall, for good
                     │                                   (no account, no proof)
                     └──▶ write one
                                  │
                                  ▼
                             it's up ──▶ the wall, with it on
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

Two things called *register* live on this surface and they are not the same
thing. `/beta/gate` opens the wall's own letters and buys nothing else.
`/beta/join` is the door into the product — accounts, pings, mutuals — and it
is still gated on having put a letter up.

The tab is the only route out of the wall, and it does not exist until
somebody has put a letter up. Offering an account to a person who has not
written anything is asking them to register for a result they cannot receive.
Offering it thirty seconds after they have named somebody is asking the one
question they are now actually carrying.

## The screens

| Route | What it is |
| --- | --- |
| `/beta` | **the wall** — one inscription, sixty-six names at three weights |
| `/beta/letter/:id` | a letter over the dimmed wall. Whole, or redacted |
| `/beta/find` | the search. Opens on the names carrying the most letters |
| `/beta/write` · `/beta/write/:handle` | the composer, two steps, written on the card itself |
| `/beta/gate` | **the door on the letters** — an address and six digits, or the account |
| `/beta/remove` · `/beta/remove/:handle` | **off the wall** — one tap, nothing asked |
| `/beta/posted` | three beats, and the wall really does gain the letter |
| `/beta/join` | **the one door to the product** — three lines and one ornament |
| `/beta/orbit` · `/beta/orbit/:id` | the core service: the ledger, and the mutual reveal |

Five of those are **sheets, not pages**: `letter`, `find`, `write`, `gate` and
`remove` rise off the bottom edge over a wall that stays mounted, scrolled
where it was, dimmed and slightly out of focus behind them — and on a wide
screen they become centred dialogs instead, because a sheet dragged up from the
bottom of a 1400px display is a phone gesture on furniture that is not a phone.

Neither the gate nor the takedown is a place you go. A person sent away from
the names to answer something is a person who then has to find their way back
to them.

## Navigation

Four targets, in the same two places, on every screen of the wall, and not one
word among them:

| | |
| --- | --- |
| ✦ | **the mark**, top left. `Ecliptic`, at 21px. On the wall it goes to the top; off it, it grows a chevron and goes back |
| ☰ | **the wall** — four lines of unequal length, the inscription seen small |
| ⌕ | **look for a name** |
| ✎ | **write a letter** |
| ⚷ | **the letters** — a keyhole while they are shut, and once they are open, the constellation of the address that opened them |

Where you are is said by the ground behind the glyph lighting, not by a label.
Every icon carries a `title` and an `aria-label`, so the bar is legible without
a word drawn on it and still navigable without sight. The glyphs are in
`parts.jsx` and none of them exists in an icon library.

**Leaving is one object everywhere: a custom X.** It stands in its own hairline
ring, is drawn finer than the nav glyphs so it does not read as a fifth
destination, and turns a quarter under the pointer. It replaced *back to the
wall* typeset as a link on four screens — a sheet that closes is not a place
you navigate to, and setting the exit as a sentence made it the loudest thing
on each of them.

## The layout

```
index.jsx    the shell — routing, the cut, the persistent star field, ?s=,
             the tab's icon, and the overture
Overture.jsx the first second, on black. Once per tab, skippable on any key
wall.css     every rule scoped under .wl-root
router.js    nine routes, no dependency
art.jsx      ECLIPTIC (the mark, the lockup, the favicon string) and the
             ornaments: sparkle, halftone sphere, ring system, bloom,
             per-handle constellation, the star field
parts.jsx    display · label · prose · redaction · pill · paper · fields ·
             sheet · row · icons · the close mark · the bar · step dots
auth.js      the domain check, and what it does and does not buy
data.js      handles, the deterministic hash everything derives from, the
             corpus, search, write, and the removals
seed.js      the letters, the sources, the ledger
screens/     one file per screen
```

## The mark

**Ecliptic.** The four-point star of `SPARK` drawn slim, inside a ring that
passes behind it at the top of its circuit and in front of it at the bottom.
One object rather than two, and the only place in the build where anything
crosses anything. It is in the bar on every screen, on the gate, in the tab's
icon, and it is what the overture assembles.

Two things about it are load-bearing:

**The star is provably `SPARK`.** `starPath` at equal arms and `thick: 1`
redraws the constant the sparkle uses, byte for byte, and that is asserted on
every dev build rather than claimed in a comment. It ships at `thick: 0.8`,
which draws the arms thinner without moving a single point. Four vertices, four
cubics, one per concave sweep, no corner anywhere in it.

**The ring is a true annulus first, and modulated second.** A flat ring tilted
away from you projects *both* of its edges by the same cosine, so the band
reads full width at the ends of the long axis and foreshortened where it
crosses the body. Adding the band's width to the short axis un-scaled instead
makes it four and a half times too fat at exactly the point it passes over the
star — and a band widest where it crosses is a ribbon lying on the mark, not a
ring going round it. Drawn honestly it already varies two to one; `bias` and
`twist` take it to about three to one. Two limits are geometry rather than
taste: the inner edge must stay inside the outer or the band breaks open, and
every arm must finish clear of the band or it gets notched off as a floating
tip. On the shipped constants: edges closest at 0.075, side arms at 0.55 of the
hole, vertical arms at 3.86 of the outer edge.

The favicon is built from the same exported constants, so the drawing in the
tab cannot drift from the drawing on the screen.

## The overture

The mark assembling itself on an empty black screen, once per tab, before
anything else exists. Not a spinner and not a splash — nothing is loading
behind it and it never claims to be.

| | |
| --- | --- |
| `0ms` | black. A held frame before anything moves is what makes the first thing that moves land |
| `140ms` | **the circuit.** A mask runs a 24-unit stroke along the band's own centreline with its dash offset driven to zero, so the ring is *drawn* round its orbit rather than faded up. It travels the route the ring actually takes, because the mask path and the ring come out of the same constants |
| `440ms` | **the star**, arriving as the circuit closes behind it — up off nothing, with a few degrees bleeding out. A shape that settles reads as an object; a shape that fades in reads as an image of one |
| `660ms` | **the name.** The word wipes out to the right of the mark under a travelling sheen, and the whole lockup slides left by exactly half the word as it comes, so the composition is centred at the start, at the end, and at every frame between. That slide is the most expensive-looking thing here and it costs one transform |
| `1000ms` | assembled, and held. The hold is the point of the whole sequence |
| `1200ms` | **the lift.** The lockup drifts up and dissolves while the black goes with it, and the wall is mounted and already cascading underneath by the time the black is half gone. One movement, not two screens |

Everything that animates is a transform, an opacity or a dash offset; nothing
touches layout after the first frame. The name waits for the real Didone (up to
a 900ms cap) before it starts, because a word that arrives as Georgia and swaps
to Bodoni halfway through its own reveal gives the whole thing away. The slide
distance is measured rather than guessed, and re-measured once the face lands.

It is skippable on any tap or key, it never plays twice in a tab, and under
`prefers-reduced-motion` it renders assembled and lifts almost at once. A brand
animation that cannot be got out of is a toll gate.

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
- **Reduced motion is honoured by jumping, not by freezing.** Three sequences
  here (the overture's six beats, the posting's three, the door's four) are the
  only way those screens reach their final state, so the preference is read in
  JS and the screen starts at the last beat.
- **The takedown is real inside the tab and nowhere else.** It writes to the
  same one key everything else does, which means it survives a reload the way a
  real removal would and is cleared by the same reset. There is no server here
  to tell, and a build that mimed the removal instead would be the one thing on
  this surface it is least acceptable to fake.
- **The gate checks a domain, not a person.** Any `berkeley.edu` address opens
  the letters and any six digits pass, which the code step says on the screen.
  It is the shape of the real thing with the sending left out, and it is
  labelled rather than disguised.

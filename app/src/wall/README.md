# `/berkeley` — the wall

The campus surface. It lived at `/beta` while it was one; `main.jsx` still
rewrites that prefix onto this one at boot, because the cards already printed
with it cannot be redeployed.

**Its state is still in the browser.** It reaches no server, it stores nothing
outside the tab it is open in, and it ships populated — seventy-two letters
across sixty-six handles — so the whole thing can be walked cold, on a phone, by
somebody who has never seen it. Everything that has to change before it holds
real letters, in order, is **[../../../docs/WALL-LAUNCH.md](../../../docs/WALL-LAUNCH.md)**.

Run it: nothing to configure. `npm run dev`, open `/berkeley`.

---

## The two rules everything else follows from

### 1 · The index is public. The letters are not.

The wall carries two different things and they cannot have the same rule.

| | |
| --- | --- |
| **the index** | sixty-six handles, the count against each one, and nothing else. **Open to everybody.** It is what somebody who has just scanned a code off a card has to be able to see in four seconds without answering anything, and it is how a person finds their own name in order to ask for it to come off. |
| **the letters** | what was actually written, who may write one, and who may take one down. **Behind a `berkeley.edu` address.** |

So a letter arrives at a stranger **redacted** — the real letter, at its real
length, with every word struck out and nothing readable in the document — and
an address lifts it. The index does not move: the names, the counts and the
search stay open to everybody, forever, and the first time anybody is asked for
anything is the moment they reach for one of the three acts that touch what is
on the wall.

Those three are **reading**, **writing** and **reporting**. One door, opened
once:

| | |
| --- | --- |
| **reading** | a wall of things students wrote about each other, readable by the open internet, is a different object from one readable by the campus it is about |
| **writing** | an anonymous letter about a named student, publishable by anybody on earth with a browser, is not anonymity — it is an open relay pointed at a person who never agreed to any of it |
| **reporting** | a one-tap control over what is on a public page has to cost *something* to reach, or the wall's contents are decided by whoever is bored |

**Being let in is not being known.** The address is never attached to a letter,
the composer never reads it, and a letter still has three fields with no fourth
one to leak. Reading is gated; authorship stays absent; those two facts are
independent on purpose, and the second one is the product.

### 1a · Every letter is read before it is published, and a reported letter comes down first.

Publication is **pre-moderated** and takedown is **post-hoc**, and the same
asymmetry drives both: the screenshot exists before the decision does.

```
  writing        layer 1  regex — slurs, links, phones, addresses, room numbers.
                          Runs at the keyboard (moderate.js) and again on the
                          server, because a client-side check is a courtesy to
                          the writer, not a control on the writer.
                 layer 2  one Haiku call, against explicit categories.
                 layer 3  anything ambiguous waits for a person.
                          -> and only then is it on the wall.

  reporting      the tap  off the wall, the search and the count. Immediately.
                 the box  optional, three lines. Why.
                 the read Haiku decides only WHERE it lands — confirmed, or a
                          person looks at it. Never whether it comes down.
                          -> held, never deleted. A desk can put it back up.
```

A report queue that leaves the letter up while somebody decides whether the
complaint was fair has protected the wrong person. And a takedown that destroys
what it took down is one no review can ever be right about — which matters most
for the writer, since any signed-in reader can report any letter.

### 2 · Getting a letter down is free. Emptying a whole name is the one thing that asks.

Listing a handle on a public wall says, in public, that this person is being
written about, and not one of them agreed to it. So the way back off has to
cost them less than being on it does. There are two ways off, and they are not
the same act:

| | |
| --- | --- |
| **one letter** | `report it`, on the letter. Off the wall on the tap — no category, no severity, no case to make. Reversible by a person at a desk, and nothing is destroyed. This is the fast door and it is the one almost everybody wants, including the person the letter is about. |
| **a whole name** | `/berkeley/remove`. The handle goes, **every** letter written to it goes with it, and no desk can reverse it. It is the only irreversible thing on this surface, so it is the only one that asks who is asking — through Instagram, where the handle actually lives. One question, answered once, thrown away. |

An earlier build made the second one instant too, and argued for it: a takedown
behind a login says *make an account first* to the one person on the wall who
never chose to be there. That argument is right about the **cost** and wrong
about the **asymmetry**. Reporting a letter is undoable in a minute. Emptying a
name is undoable by nobody, ever, and what it destroys does not belong only to
the person asking — it is forty letters written by people who are not in the
room and cannot be asked. So the proof sits on the irreversible action and
nowhere else, and the person who just wants a letter about them gone is never
sent through it.

They are reachable from four places, none of them a footer: `this is me` and
`report it` beside the name on any letter, under the names on the wall itself,
and from the search.

The core service is the opposite of all of it — accounts, identity, pings,
mutuals — and it is somewhere else. There is exactly one door between them, and
it is not this one: the letter gate opens the wall's own letters and nothing
more.

## The event

Cards and flyers go out with a QR code on them. The code lands on the wall.

```
                     ┌──▶ a letter ──┬─ from berkeley? ──▶ read it whole
                     │               │                     └─▶ report it ──▶ off
                     │               │                        the wall NOW, then
                     │               │                        read by a person
                     │               └─ otherwise ───────▶ redacted, and one
                     │                                     offer: an address
   scan ──▶ THE WALL ┼──▶ look for a name
     (the names ask  │         └──▶ nobody has? be the first
      nothing, ever) ├──▶ that's my name ──▶ prove it (instagram) ──▶ the whole
                     │                                        name off, for good
                     └──▶ write one ── berkeley? ── screened ──┐
                                  │                            │
                                  ▼                            ▼
                             it's up ──▶ the wall, with it on ◀┘
                                              │
                                    ┌─────────┴──────────┐
                                    │  and only NOW, a   │
                                    │  tab at the bottom │
                                    └─────────┬──────────┘
                                              ▼
                             "Get notified if they put you down too."
                                              │
                                              ▼
                                      THE CORE SERVICE
```

Two things called *register* live on this surface and they are not the same
thing. `/berkeley/gate` opens the wall — its letters, its composer, its report
control — and buys nothing else. `/berkeley/join` is the door into the product — accounts, pings, mutuals — and it
is still gated on having put a letter up.

The tab is the only route out of the wall, and it does not exist until
somebody has put a letter up. Offering an account to a person who has not
written anything is asking them to register for a result they cannot receive.
Offering it thirty seconds after they have named somebody is asking the one
question they are now actually carrying.

## The screens

| Route | What it is |
| --- | --- |
| `/berkeley` | **the wall** — the inscription, the names at three weights, drifting in lanes you can pull |
| `/berkeley/letter/:id` | a letter over the dimmed wall. Whole, or redacted |
| `/berkeley/find` | the search. Opens on the names carrying the most letters |
| `/berkeley/write` · `/berkeley/write/:handle` | the composer, two steps, written on the card itself |
| `/berkeley/gate` | **the door on the wall** — an address and six digits, or the account |
| `/berkeley/report/:id` | **one letter, down** — the tap, the small box, the reading |
| `/berkeley/remove` · `/berkeley/remove/:handle` | **a whole name, off** — the Instagram handoff, then the tap |
| `/berkeley/posted` | three beats — the screening, the paper going, the landing |
| `/berkeley/join` | **the one door to the product** — three lines and one ornament |
| `/berkeley/orbit` | **the core service** — the orrery, the date, and the ledger |
| `/berkeley/orbit/place` | place a ping, or the door that says both slots are taken |
| `/berkeley/orbit/:id` | one ping — a mutual opened, or a standing one to renew or let go |

Six of those are **sheets, not pages**: `letter`, `find`, `write`, `gate`,
`report` and `remove` rise off the bottom edge over a wall that stays mounted, scrolled
where it was, dimmed and slightly out of focus behind them — and on a wide
screen they become centred dialogs instead, because a sheet dragged up from the
bottom of a 1400px display is a phone gesture on furniture that is not a phone.

None of the gate, the report or the takedown is a place you go. Each is a
question about something on the screen behind it, and a person sent away from
the names to answer one is a person who then has to find their way back to
them. The report in particular has to stay a sheet: the letter it is about is a
scroll position away, and a takedown screen that has replaced the thing it is
taking down makes somebody trust their memory instead of their eyes.

**Every sheet opens on the same header row** — what it is about on the left, the
way out on the right (`parts.jsx SheetHead`) — and closes on the same footer:
one primary, then whatever is quieter than it (`SheetFoot`). Six sheets used to
own six different tops, one of which was a lone close mark on an otherwise empty
line: the heaviest object on the screen, sitting on the emptiest row.

## Navigation

Three targets, in the same two places, on every screen of the wall, and not one
word among them:

| | |
| --- | --- |
| ✦ | **the mark**, top left. `Ecliptic`, at 26px and always chalk while the row around it is ash — it is the one object that says which product this is, and at the bar's own colour it was the faintest thing in the corner. On the wall it goes to the top; off it, it grows a chevron and goes back |
| ⌕ | **look for a name** |
| ✎ | **write a letter** |
| ⚷ | **the letters** — a keyhole while they are shut, and once they are open, the constellation of the address that opened them |

There used to be a fourth, a `wall` glyph at the head of the row, lit whenever
you were on the wall. On the wall itself, which is where almost everybody met
it, it was a lit target pointing at the page it was already on that did nothing
when pressed — and a control that answers a tap with nothing teaches somebody
that the bar is decorative, on the first screen of the product. The way back to
the wall is the mark.

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
router.js    ten routes, no dependency
art.jsx      ECLIPTIC (the mark, the lockup, the favicon string) and the
             ornaments: sparkle, halftone sphere, THE ORRERY, bloom,
             per-handle constellation (with its countdown gauge), the field
parts.jsx    display · label · prose · redaction · pill · paper · fields ·
             sheet · row · icons · the close mark · the bar · step dots
auth.js      the domain check, what it does and does not buy, and the
             Instagram handoff that stands on the one irreversible action
moderate.js  the screen: layer 1 for real, layers 2 and 3 drawn honestly, and
             the report's own triage
data.js      handles, the deterministic hash everything derives from, the
             corpus, search, write, the reports (held, never deleted) and the
             removals
seed.js      the letters, the sources, the seeded ledger
orbit.js     the core service's own data: ONE clock off the printed date, the
             ledger as a delta on the seed, the slots, and placing, renewing
             and letting go for real inside the tab
screens/     one file per screen
```

## The inscription

One run of names at three weights — not a grid of cards (a directory) and not a
tag cloud (analytics). Weight comes off how many letters a name carries, so a
name written to three times is set larger than one written to once and the wall
has a real topography rather than a decorative one.

It **drifts**, and it can be **pulled**. A static block of names is a
screenshot: it reads as a list that was printed once, and the one thing this
surface has to say in its first second is that people are still doing this. So
the run is broken into lanes, each lane travels at about the speed of a
departures board, and a finger dragged across any of it takes the whole field
with it and lets it coast to a stop.

One `requestAnimationFrame` in `screens/Wall.jsx` writes every lane's transform.
The drift, the drag and the throw are the same number, because a CSS animation
and a pointer handler fighting over the same track is a wall that tears in half
the moment somebody touches it.

- **It never ends and it never starts.** Each lane wraps on the modulo of its
  own **measured** cycle, so there is no first name, no last one, and no edge to
  hit — pull far enough either way and you come back round to where you began.
  The measurement is read back after layout and re-read when the faces land: an
  estimate decides how many copies to render, and a real face is never the face
  the arithmetic assumed.
- **A pull moves everything.** Every lane takes the same delta while a drag is
  live, so the wall reads as one surface being pushed rather than as lanes that
  happen to be stacked. The alternating drift resumes the instant it ends.
- **A pull is not a tap.** A press that travels more than 6px swallows the click
  it would have ended in. Every name is a target, and nothing is worse than a
  surface that opens a letter because you tried to look past it.
- **`touch-action: pan-y`** is the whole contract with the browser: vertical is
  the page's, horizontal is the wall's. A trackpad swiped sideways is taken too,
  and only when `deltaX` is the larger component.
- **Slow enough to read**, at one constant speed across every lane whatever it
  is carrying, with a few percent of jitter. Lanes at visibly different speeds
  read as a bug, not as parallax.
- **Alternating direction.** Every lane going one way is a stock crawl; lanes
  going opposite ways read as a field with weather in it.
- **The lane under the pointer stops**, drift and throw both, and the whole wall
  stops for a keyboard. Motion that will not hold still for the person trying to
  use it has forgotten what it is on top of.
- **The ends are masked, not cut.** A hard edge on a moving name is a box; a
  dissolve is a room the name walked out of.
- **Round-robin, not sliced in blocks**, so the heaviest names end up one per
  lane instead of stacked in the first two.

### It has to work at five names and at five hundred

The corpus is a live thing: on the first morning of a campaign the wall might
carry five handles and by the end of the week it carries hundreds. Both have to
look deliberate.

| | |
| --- | --- |
| **the lane count** | a ladder off the handle count (1 lane at ≤4, 2 at ≤10, 3 at ≤18, 4 at ≤30, 5 at ≤44, 6 at ≤60, 7 above), capped again by the room: a lane is 40px and the masthead, the takedown and the dock take about 430, so a short phone gets four and a tall one gets seven. A phone on its side is its own case and gets four |
| **the run** | repeats itself in **whole passes** through its lane's own names until it is wider than the lane. This is what makes five names work at all: the lane is full, it is simply full of the same five names, which is the truth |
| **the block** | is centred in whatever height is left over, so two lanes and seven lanes are both placed rather than one of them being dumped under the other |

Under `prefers-reduced-motion` the original wrapping inscription is rendered
instead, and none of the above runs.

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

## The core service

`/berkeley/orbit` is the other side of the line the wall draws. The wall has no
accounts and never asks who anybody is; this is the first point in the whole
prototype where somebody has an identity, and it is reached from exactly one
control — the tab at the bottom of the wall, which does not exist until a
letter has gone up.

So it shares none of the wall's furniture. No nav, no search over the names, no
writing a letter from here: one control leaves, and everything else is about
pings, which the wall has never heard of.

### The mechanism, in one screen

Two standing pings, sixty days each. Renewing is free and takes no slot.
Letting one go is the only irreversible act on this surface and it opens the
slot back up. A pair that closes is a **mutual**, and the two letters are
readable to those two people and to nobody else. A mutual does **not** hold a
slot: the slot rations pings nobody has answered yet, which is what makes
placing one mean something, and a pair that has closed is not waiting on
anybody.

Every one of those is real inside the tab. Placing, renewing and letting go
write through the same one key everything else does (`store.js`), so they
survive a reload and are cleared by the same reset.

### The orrery is a readout, not a picture of space

The first version of this screen drew three rings at arbitrary radii with three
moons drifting on three arbitrary periods. It was a picture. It said nothing,
it could not be wrong, and a diagram that cannot be wrong is one nobody reads.

Every quantity in it is now a quantity on the ledger beside it:

| | |
| --- | --- |
| the centre | you |
| a ring | one ping you are carrying |
| the drawn arc | how much of the sixty days it has spent |
| the dim arc | what is left |
| the moon | where it is on that circuit **right now**. Not a phase and not a period: `run` is spent/60 and the moon is at exactly that fraction |
| a closed ring | a mutual, carrying **two** moons, because that is what closed it |

A ping four days from lapsing has its ring drawn almost the whole way round
with its moon nearly home; one placed this morning is a short stroke at twelve
o'clock. Pointing at a row lights its ring, and focusing it with a keyboard
does the same, so the list and the diagram are one object.

**Each ring crosses the body**, far half behind and near half in front, which
is the gesture `ECLIPTIC` is built on and the only one this brand owns. The
first version stacked every ring behind the sphere, which is a hoop propped up
behind a ball.

Three of the numbers are pinned rather than chosen, and all three answer the
same question — *where can a moon be hidden*:

- **The circuit starts at twelve o'clock.** It started at the left vertex,
  which on a ring drawn wider than the phone is the one point off the screen —
  so the newest thing on the ledger was the one thing the hero could not show.
- **The lean is 0.42 and the body is 7.6 of 100.** At the 0.34 and 11.5 this
  began with, the inner ring's short radius was smaller than the sphere and a
  moon at twelve sat *behind* it. That is exactly where a ping four days from
  lapsing sits: the one thing the hero exists to show, hidden.
- **Radii are handed out from the outside in.** The slot cap is two, and the
  caller sorts mutuals first, so a ping that is not mutual can never land
  nearer than the second ring — which is what makes one clearance calculation
  enough to prove no countdown is ever occluded. It also means the silhouette
  does not jump when a ping is placed or let go.

The reference runs its ring system off both edges and this cannot, quite: a
ring wider than the screen has its long-axis ends off the screen, and a moon
reaches those ends a quarter and three quarters of the way through the sixty
days. So the ring is drawn to just past the edges and **the corona is what
actually bleeds**. Scale off the light; the ring stays somewhere a moon can be
seen.

### What the redesign was fixing

Three things made the first version read as a dashboard, and one made it not
work at all.

1. **The one enormous number was set in the UI sans**, at weight 600 — the face
   every product on the web sets a metric in, on the only screen in the build
   with no Didone on it. The date is now `Display size="xl"`: the same ramp,
   the same face, as the sentence on the front of the wall, because on this
   screen the date *is* the headline.
2. **The colour ration was spent on a capsule reading "today"**, beside a date
   that had just said so, while the one thing anybody had to act on — a ping
   four days from lapsing — competed with it in the same orange forty pixels
   below. The capsule stayed as composition and gave up the accent. The ember
   now marks the lapsing ping and nothing else, in the two places that one
   quantity is drawn: its moon, and the gauge on its own mark. When nothing is
   lapsing there is no saturated colour on the screen at all.
3. **Three sentences were set in the mono**, which uppercased them,
   letterspaced them, ran them to three ragged lines and uppercased a handle
   inside one of them. A handle is lower case and a sentence is sentence case;
   neither is a label. `.wl-say` is the one class for a quiet line here.
4. **Nothing was built.** `place a ping` called `go('orbit')` from
   `/berkeley/orbit`, which the router correctly refuses as a navigation to where
   you already are — so the primary control on the core service did nothing.
   There was no way to place, renew or let go of anything.

Point 4 has a second half worth keeping written down, because the same shape
bit the rebuild: `let it go` on the slots-full sheet finishes at
`/berkeley/orbit/place`, which is where it already is. The ledger lives in a blob
under a key and not in React, so freeing the slot changed nothing on screen and
the sheet went on saying both slots were taken over a ledger that now had one.
Every mutation on this surface is followed by one counter (`Core`'s `beat`),
and the ledger is read fresh on the render it causes.

### Balance

The empty slot is a **row**, not a number. Two slots is the whole of this
product's scarcity, and somebody who has to read "1 of 2" to find out they have
one left has been told about it rather than shown it.

On a spread both columns centre in the middle row and the dock sits directly
under the left one. Pinned to the top, the bottom half of a desktop screen was
blank under a date and two rows; pinned to the bottom the way the wall does it,
the dock was stranded three hundred pixels below the last thing on the screen
with nothing beside it. The wall can bottom-anchor its dock because its
right-hand column runs the full height. A four-row ledger cannot.

The rule under the date separates the masthead from the ledger, so on a spread
— where the ledger is in the other column — it goes.

## The overture

The mark assembling itself on an empty black screen, once per tab, before
anything else exists. Not a spinner and not a splash — nothing is loading
behind it and it never claims to be.

| | |
| --- | --- |
| `0ms` | black. A held frame before anything moves is what makes the first thing that moves land |
| `200ms` | **the circuit.** A mask runs a 24-unit stroke along the band's own centreline with its dash offset driven to zero, so the ring is *drawn* round its orbit rather than faded up. It travels the route the ring actually takes, because the mask path and the ring come out of the same constants. 900ms to close |
| `560ms` | **the star**, arriving while the circuit is still closing behind it — up off nothing, with a few degrees bleeding out. A shape that settles reads as an object; a shape that fades in reads as an image of one |
| `820ms` | **the name.** The word wipes out to the right of the mark under a travelling sheen, and the whole lockup slides left by exactly half the word as it comes, so the composition is centred at the start, at the end, and at every frame between. That slide is the most expensive-looking thing here and it costs one transform |
| `1380ms` | **assembled.** The wipe lands *on* this beat rather than after it, so the bloom reaching full and the word arriving whole are one event. Nothing moves again until the lift |
| `1640ms` | **the lift**, after 260ms of stillness. The lockup drifts up and dissolves while the black goes with it, and the wall is mounted and already cascading underneath by the time the black is half gone. One movement, not two screens |
| `2200ms` | the black is gone |

The whole cut is **2.2 seconds**, and 440ms of that is new. It used to run 1760
and the lift began 140ms *before* the word had finished wiping in — so the one
moment the mark was ever whole never existed on screen. That reads as fast
rather than as brief, which are not the same quality: fast is something you
missed, brief is something that was over. Almost none of the extra time went
into slowing the assembly down (that moved by ~180ms). It went into the hold,
which is the only frame in the sequence doing the actual job and the one the
old timing did not have.

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

The journey view is the one that is read against the product rather than
copied. Its ring system became a readout of the sixty-day clocks and stopped
bleeding past its own long axis, because a moon off the edge is a countdown
nobody can see (see `The core service`). Its saturated capsule became a
hairline, and the accent it was spending went to the ping that is running out.

Two things are bright and both are rationed to **once per screen**. The
**bloom** is a luminance rather than a colour — warm white through a heavy blur
— and goes on the one object that matters most. The **ember** is the single
saturated colour in the build: search `wall.css` for `--ember` and every use is
a warning that something is about to be refused or is about to run out. The
largest of them is a two-unit moon.

There used to be a filled ember capsule as well, and one thing in the build
used it: a pill reading **today**, beside a date that had just said so. A
screen with one unit of colour to spend was spending it on the least
load-bearing word on it. The role went with the caller.

Nothing is downloaded. No icon set, no illustration, no stock anything — every
ornament in `art.jsx` is a path or a loop, and most are derived from a handle,
which an icon library cannot do because it does not know what it is next to.

## Three layouts

The phone is the one this was designed for and it does not change.

- **≥ 900px** — the wall becomes a spread: the masthead takes its own sticky
  column and the lanes run beside it, bleeding off the right edge and centred
  vertically in their column — which is the shape the poster reference actually
  is, and which is why the empty field around the three objects reads as air
  rather than as a list that ran out. Sheets become centred dialogs. The core
  service puts its orrery beside its ledger, and centres both in the middle row
  with the dock under the left one: it cannot bottom-anchor the way the wall
  does, because the wall's right-hand column runs the full height and a
  four-row ledger does not.
- **landscape phone** (`max-height: 560px`, `min-width: 640px`) — the same
  spread, early, and every vertical measure that was buying atmosphere gives
  its space back. On 390px of height, atmosphere is just scrolling.
- **≥ 1280px** — the column stops growing. Past that the field around it is the
  design.

## What it touches

This tree, and one line elsewhere: `app/src/main.jsx` forks on `/berkeley` and
lazy-imports it. Nothing in production imports from `src/wall/`; the wall is a
separate chunk (~28 kB gzip of JS, ~10 kB of CSS) and the four Google faces it
needs are injected on mount and removed on unmount, so neither reaches anybody
who did not scan a piece of paper. No shared component, no global token, no
`vercel.json`, no `vite.config.js`.

## Known, and deliberately left

- **`supabase/migrations/0027_beta_wall.sql` belongs to an older build.**
  Undeployed and inert, and it describes a wall queried one handle at a time
  with a per-letter seal, an author column and a reveal request. It is **not**
  the schema for what is in this directory — there is no author on a letter
  here, no seal and no reveal — and it should be replaced rather than extended.
  What the shipped wall actually needs is spelled out in docs/WALL-LAUNCH.md.
  `supabase/functions/celestual-beta-moderate/` is the opposite case: its
  three-layer pre-publication design is exactly what this build now draws, and
  `moderate.js` mirrors its layer 1 deliberately so a writer is refused at the
  keyboard rather than after the button. It is still undeployed.
- **`/berkeley` downloads the production entry chunk** (~188 kB gzip) because
  `main.jsx` is the single Vite entry and imports `App.jsx` statically. The
  real fix is a second Vite entry, which needs `vite.config.js` and
  `vercel.json`; lift that constraint and it is a `rollupOptions.input` key
  plus one rewrite.
- **Reduced motion is honoured by jumping, not by freezing.** Three sequences
  here (the overture's six beats, the posting's three, the door's four) are the
  only way those screens reach their final state, so the preference is read in
  JS and the screen starts at the last beat. The wall's drift is the one thing
  that is *replaced* rather than jumped: under the preference it renders the
  original wrapping inscription, because a frozen banner would strand the names
  in eight ragged rows.
- **The takedown and the report are real inside the tab and nowhere else.**
  Both write to the same one key everything else does, so they survive a reload
  the way a real removal would and are cleared by the same reset — and a
  reported letter is genuinely gone from the wall, the search and the count a
  frame later. There is no server here to tell, and a build that mimed either
  would be the one thing on this surface it is least acceptable to fake.
- **Three things are drawn on a timer and every one of them says so on the
  glass.** The gate's six digits (any six pass), the classifier beat on
  `/berkeley/posted`, the report's reading, and the Instagram handoff (any handle
  comes back proven). Each is the shape of the real thing with the round trip
  left out, labelled rather than disguised, because a screen that mimes an OAuth
  handshake without saying so is teaching the wrong thing about what this build
  does with what it is given. Each label comes off the day its round trip is
  real, and not one day before — the order is in docs/WALL-LAUNCH.md.
- **The core service's ledger is real inside the tab and nowhere else.**
  Placing, renewing and letting go write through the same one key as
  everything else, so a ping placed at a demo table survives a reload and the
  ring for it is drawn at the front of its circuit. There is no server here.
- **The paid third slot is deliberately not drawn.** Production carries one
  behind a flag (`VITE_STRIPE_ENABLED`, one slot, bought once). The slots-full
  door here offers one thing, `let it go`, because a surface that shows somebody
  a price before it has shown them a mutual has taught them the wrong thing
  about what this is.
- **The core service's clock is fixed, and it is not the wall's.** `orbit.js`
  derives one epoch from the printed date (`seed.js TODAY`) and every day,
  dateline and countdown on that surface comes off it. The wall keeps
  `Date.now()`, which is right for a stream of letters and wrong for a
  sixty-day countdown that raises dated cards over the top of its own date.
- **The orrery is still under `prefers-reduced-motion`, and it was already
  still.** Every position in it is a quantity rather than an animation, so the
  preference removes one four-second opacity breathe and nothing else changes.
  That is the test a diagram should pass: if switching motion off loses
  information, the information was in the motion.
- **The gate checks a domain, not a person.** Any `berkeley.edu` address opens
  the wall. The Instagram handoff is the only place a *person* is checked, and
  it is asked once, about one handle, on the one action nobody can undo.

# `/` and `/berkeley` — the wall

One tree, drawn for two walls (`campus.js`). The wall at the root of the site
is the wall for everybody: no campus, and anybody the product has proved may
write, by their instagram, a google account or a mailed code (migration 0057,
`screens/Gate.jsx`). The wall at `/berkeley` is the campus surface it was
built as, where a `berkeley.edu` address writes; it lived at `/beta` while it
was one, and `main.jsx` still rewrites that prefix onto it at boot, because the
cards already printed with it cannot be redeployed. Everything below that
names a campus, a domain or a printed card is about that wall; everything
about the field, the sheets and the letters is about both.

Four things below are recorded as they were and are no longer so. **The bar**
carries the brand and the person; the act, `write a letter`, is a metal capsule at
the foot, and the campus and the count are one small caption over the search
plate rather than an ear of their own. **The letter** is a centred card with
one close mark in the corner of the glass, a pen beside the heart for writing
to the person, and no count; it rises and fades rather than opening out of
the disc (`morph.js` is gone). **The field names nobody**: the plate and the
ring on the disc nearest the middle came off. **Every disc on the glass turns
over on its own clock**, ten to forty seconds by its distance from the light,
a few at a time, rather than one disc every few seconds.

**As of Phase 6b of the rebuild it reaches a server.** The letters, the campus
gate, the handle proof, the reports and the takedowns are in the schema
(`supabase/migrations/0032_the_wall.sql`), reached through `wall/api.js`.
`wall/data.js` is a cache with the shape it always had, so the screens still
read it synchronously and none of them has to know a network exists. What is
still local is what should be: the draft, the names this browser wrote to, and
which letters it opened. The paragraph below describes the state before that.

**Its state was in the browser.** It reached no server, it stored nothing
outside the tab it is open in, and it ships populated — seventy-two letters
across sixty-six handles — so the whole thing can be walked cold, on a phone, by
somebody who has never seen it. Everything that has to change before it holds
real letters, in order, is **[../../../docs/launchsteps.md](../../../docs/launchsteps.md)**.

Run it: nothing to configure. `npm run dev`, open `/berkeley`.

---

## The two rules everything else follows from

### 1 · The index is public. The letters are not.

The wall carries two different things and they cannot have the same rule.

| | |
| --- | --- |
| **the index** | sixty-six handles, the count against each one, and nothing else. **Open to everybody.** It is what somebody who has just scanned a code off a card has to be able to see in four seconds without answering anything, and it is how a person finds their own name in order to ask for it to come off. |
| **the letters** | what was actually written, who may write one, and who may take one down. **Eight to anybody, then a proof.** |

Every browser is handed **eight whole letters** before it is asked for anything
(migration 0045, raised from five in 0049). After those, a letter arrives
**blurred** — the real letter, at its real length, with nothing readable in
the document — and a proof brings it back into focus. The eight are not
drawn: they stood as marks under every card, one struck per letter read, and
a meter over a letter is a countdown whatever it is called. The ninth card
arrives sealed and says so on its own rule, which is the moment the fact is
worth having. The index does not move: the names, the counts and the search
stay open to everybody, forever, and the first time anybody is asked for
anything is the moment they reach for a ninth letter, or for one of the two
acts that CHANGE what is on the wall.

The eight are counted by the database, not by the browser, for the same reason
the redaction is performed there: a count the client keeps is a count the
reader owns. What that costs is one row per (browser, letter), at most eight per
browser, carrying no identity, keyed on a hash that cannot be joined to a
session, never listed by anything, and deleted outright the moment its browser
passes the gate.

Those three are **reading**, **writing** and **reporting**, and since migration
0044 they stand behind **two** doors rather than one. It used to be one door,
and that was wrong in a way it took a live wall to see: a person who had proved
their Instagram handle, this product's own proof, arrived here signed in and
was handed a wall of struck-out words with no way to open one. That was
twenty-five of the twenty-seven people on the product, reading "sign in to read
the letters" on a surface they had signed in to.

| | | |
| --- | --- | --- |
| **reading** | the first eight are free to anybody. After that, either proof: a `berkeley.edu` address, or a handle verified by the DM code | a wall of things students wrote about each other, readable by the open internet, is a different object from one readable by people the product has actually proved. But a person asked to answer for something before they have read a sentence of it has been asked one decision too early, and the wall's own words are the only argument for signing in that was ever going to work |
| **reporting** | either proof, with reading | the subject of a letter is the likeliest reader to want it down and the least likely to hold a campus address at the moment they find their name. A one-tap control still has to cost *something*, and a proof is that |
| **writing** | the `berkeley.edu` address, and three letters in any five days (seven until migration 0051). The number is never drawn; once they are spent the composer says only how many days to wait before drafting more. Since 0052 both the number and whether it is counted at all are rows the desk holds, and the ration is **currently switched off** while the wall is being filled by the people who built it — the address is not | an anonymous letter about a named student, publishable by anybody on earth with a browser, is not anonymity. It is an open relay pointed at a person who never agreed to any of it. And a wall whose contents are decided by whoever writes the most is a wall about its most prolific writer |

**Being let in is not being known.** The address is never attached to a letter,
the composer never reads it, and a letter still has three fields with no fourth
one to leak. Reading is gated; authorship stays absent; those two facts are
independent on purpose, and the second one is the product.

### 1a · Every letter is read before it is published, nothing is held, and a reported letter comes down first.

The screen runs on the way in and refuses on the way in; what it is merely
unsure of is not held. Takedown is **post-hoc**, and the same asymmetry drives
both: the screenshot exists before the decision does.

```
  writing        layer 1  regex — slurs, links, phones, addresses, room numbers.
                          Runs at the keyboard (moderate.js) and again on the
                          server, because a client-side check is a courtesy to
                          the writer, not a control on the writer.
                          The ONLY thing that stops a letter going up: the
                          card shakes, the line under it says what was
                          caught, and nothing is sent.
                 layer 2  one Haiku call, against explicit categories, AFTER
                          the letter is on the wall. A pass and a review leave
                          it up. Only a letter it reads as severely malicious
                          comes down, and the writer is told on the wall that
                          it went against the terms, with their words back.
                 layer 3  anything ambiguous stays up, flagged, and a person
                          reads it at the desk while it stands. If that person
                          takes it down, the writer is told the same way.

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

**It used to hold, and then it used to read first.** Anything the classifier
answered `review` on sat at `pending`, rendering nowhere, until a person at
the desk moved it, and on a live wall that was a writer watching their letter
not appear, for hours, with no word about why. Then every letter waited on
the model before it went up, behind a screen drawn to hold the wait. Since
migration 0050 the order is turned round: the function runs the list, writes
the letter `live` and answers, and the classifier reads it after the answer
has gone back (`EdgeRuntime.waitUntil`). Its verdict lands on the row through
`wall_screened`: a pass changes nothing; a review flags it
(`moderation.flagged`) for the desk's flagged queue, where "looks fine" is a
decision that changes nothing but the queue; a reject takes it down, unless a
person at the desk has already decided about it. A letter taken down after it
went up, by the reading or by a person, tells its writer so, on the wall:
`wall_mine` answers a device about its own letters and whose hand took one
down, the wall asks it a few times over the half minute after a letter goes
up, and the notice at the foot of the wall says which letter, that it went
against the terms (`moderate.js whyDown`, which names the terms and never the
hand), and offers the words back on the composer. The notice is never raised
for a reader's report, because telling the writer would point them at the
person likeliest to have filed it. A classifier that does not answer leaves
the letter up, flagged `unscreened`.

### 2 · Getting a letter down is free. Emptying a whole name is the one thing that asks.

Listing a handle on a public wall says, in public, that this person is being
written about, and not one of them agreed to it. So the way back off has to
cost them less than being on it does. There are two ways off, and they are not
the same act:

| | |
| --- | --- |
| **one letter** | the flag in the corner of the letter, then `Report this letter`. Off the wall on the tap, with no category, no severity and no case to make. Reversible by a person at a desk, and nothing is destroyed. This is the fast door and it is the one almost everybody wants, including the person the letter is about. |
| **a whole name** | `/berkeley/remove`. The handle goes, **every** letter written to it goes with it, and no desk can reverse it. It is the only irreversible thing on this surface, so it is the only one that asks who is asking — through Instagram, where the handle actually lives. One question, answered once, thrown away. |

There is a third, and it is not a wall control at all: the product's opt out
at `/optout` bars the handle everywhere, and since migration 0046 that takes
every letter about it off the wall as part of the same act, on every campus,
with no desk able to put one back. The wall's own takedown says so on its last
screen, because somebody who wants the letters gone often wants the rest of it
gone too, and the wall is only half the product.

An earlier build made the second one instant too, and argued for it: a takedown
behind a login says *make an account first* to the one person on the wall who
never chose to be there. That argument is right about the **cost** and wrong
about the **asymmetry**. Reporting a letter is undoable in a minute. Emptying a
name is undoable by nobody, ever, and what it destroys does not belong only to
the person asking — it is forty letters written by people who are not in the
room and cannot be asked. So the proof sits on the irreversible action and
nowhere else, and the person who just wants a letter about them gone is never
sent through it.

They are reachable from three places, none of them a footer: the flag at the
foot of any letter, which opens both of them on one pane of glass standing
where the sheet's primary stood, `Report this letter` and `Take my name off
the wall`, each with what it does in one line under it; under the names on
the wall itself; and from the search.

The flag replaced a pair of bare capsules — `this is me` and `report it` — that
stood side by side at one weight. Between them they asked a person to choose
between the reversible act and the irreversible one before either had been
described, which is the one decision on this surface that must not be made by
guessing at a label. The flag then stood alone under the pill, a ring on the
void at the bottom of the sheet, which is where a control goes when nothing has
been decided about what it belongs to. It belongs to the letter: a flag is left
ON a thing. So it stands on the card now, at the end of its foot opposite the
heart, struck in the paper's ink at the heart's size, and the two acts it opens
each carry one line saying what they do, the reversible one first, because the
one decision on this surface that must not be made by guessing at a label is
the one between them. They were two bare outlined rows with an arrow each,
which is a form drawn in a hurry; the pane is one object and the rows are
parts of it.

The core service is the opposite of all of it — accounts, identity, pings,
mutuals — and it is somewhere else. There is exactly one door between them, and
it is not this one: the letter gate opens the wall's own letters and nothing
more.

## The event

Cards and flyers go out with a QR code on them. The code lands on the wall.

The five ad cards carry `celestual.us/c/<code>` rather than the wall's own
address: one hop the app owns, so a card printed on Tuesday can be pointed
somewhere else on Friday (`app/src/cards.js`). It logs the scan, hands the code
on to the surface as `?s=`, and the desk reads the five against each other on
its cards screen. What each card is judged on is not scans but `joined`: a
campus address or a handle proved after that code was scanned (migration 0047).

```
                     ┌──▶ a letter ──┬─ from berkeley? ──▶ read it whole
                     │               │                     └─▶ the flag ──▶ off
                     │               │                        the wall NOW, then
                     │               │                        read by a person
                     │               └─ otherwise ───────▶ redacted, and one
                     │                                     offer: an address
   scan ──▶ THE WALL ┼──▶ look for a name
     (the names ask  │         └──▶ nobody has? be the first
      nothing, ever) ├──▶ that's my name ──▶ prove it (instagram) ──▶ the whole
                     │                                        name off, for good
                     └──▶ write ─────── berkeley? ── screened ──┐
                                  │                            │
                                  ▼                            ▼
                             it's up ──▶ the wall, with it on ◀┘
                                              │
                                    ┌─────────┴──────────┐
                                    │  and only NOW, a   │
                                    │  tab at the bottom │
                                    └─────────┬──────────┘
                                              ▼
                             "get notified if they put you up too."
                                              │
                                              ▼
                                      THE CORE SERVICE
```

Two things called *register* live on this surface and they are not the same
thing. `/berkeley/gate` opens the wall — its letters, its composer, its report
control — and buys nothing else. `/berkeley/join` is the door into the product — accounts, pings, mutuals — and it
is still gated on having put a letter up.

The search ends on its results. Two capsules stood under them, `write instead`
and `take a name off`, and both were doors to other rooms on a sheet whose one
job is to find a name: the nib in the bar is the composer, and the way off the
wall stands under the flag on every letter.

The tab is the only offer the wall makes of the product, and it does not exist
until somebody has put a letter up. Offering an account to a person who has not
written anything is asking them to register for a result they cannot receive.
Offering it thirty seconds after they have named somebody is asking the one
question they are now actually carrying.

Before the tab there is a signpost and nothing more: one quiet line under the
composer's pill, `the rest of celestual`, a real anchor to `/`. It says there is
more and asks nothing, and it goes while the tab is up. It replaced an arrow
link beside the pill reading `place a ping`, set in the display face at the
pill's own height: two verbs on one row, in two vocabularies, and the second
one a word nobody who scanned a flyer had met. The brand in the bar goes to the
front too, and always has.

## The search, on the wall

The one in twenty who came here looking for themselves, and the nineteen who
came looking for one other name, are nearly everybody who scans the wall off a
flyer, and the way to look was a 40px glass in the corner of the bar a thumb
reaches last. It is the wall's own question now: a piece of glass under the
ear, an unlit LCD strip with the pixel lens in the place a field paints its
@, `look for a name` inside it, capped at the column's measure (`screens/Wall.jsx`
`Seek`, `parts.jsx` `HandleField kind="search"`). It is the phone's
(design/DESIGN.md 2.6): the panel at ninety percent under its pixel grid, a
one pixel bezel that lights while it has the focus, and the question in
Jersey. It was grey glass over a blur until 24 September, the last piece of
an Apple interface on a wall of phones.

And it answers in place. It used to behave as a door: any touch pushed
`/find` onto the history and a sheet came up over the wall carrying a SECOND
field, which is one question, two fields, a route and a keyboard handed
between them. The strip itself opens now: it is the head of a panel that
grows downward as the answers arrive, under a dotted seam, with the active
answer inverted the way a phone's menu showed the chosen line, and it folds
back when the field is emptied or left. While the answers come it says
`looking` beside the blinking hourglass. The head does not move while it
opens, not its height, not the lens, not the measure the question is set
in, so what is seen is one thing growing. A name is found and pressed from
the surface the names are on, which is the whole argument for the wall being
the landing. The sheet is still there at `/find`: a link into the search, and
the fuller answer for somebody who arrived looking rather than browsing.

The sheet hears what a person actually types (migration 0054): the query goes
to the server as typed, and the server matches the handle, the handle with
its dots out, and the folded name, which is the resolver's display name for a
handle and the name as written for a letter to a first name, then, from the
third character, a misspelling by trigram and a sound alike by metaphone.
Every candidate is a row of the public index and nothing else, so a profile
the resolver holds for a handle nobody has written to is never listed by any
spelling. Before anybody has typed, the sheet stands the six names most
recently written to: it used to be the six carrying the most letters, and a
top six by count with "most" on it is a rank of people with a label. The
caption over them has gone as well — `on the wall`, on the wall, under the
wall's own field, over names the wall had just answered with.

A miss states a fact about the index and offers the one thing the wall can
honestly offer: `nothing on the wall under @x`, then `write a letter`, which
opens the composer on its own first question, and under it, quieter, `write
to @x`, for the one who searched a friend. The quiet line is left out only
when the handle is one this browser has itself proved through the DM code.
Nobody is asked "is this you", nothing is recorded, nothing is shared from
here and nobody is offered a place on a list: the wall has no accounts and
cannot tell anybody anything later. The council that ruled all of this is
recorded in [../../../docs/THE-COUNCIL.md](../../../docs/THE-COUNCIL.md).

## Who a letter is for: an @, or anything else

The first question has two answers, and both stand over the field on one
rail (`parts.jsx` `Segmented`): `instagram`, on when the composer opens,
because on this campus everybody knows everybody's @ and a letter to a
handle is a letter one person can find; and `anything else`, which is
whatever the writer calls the person. A first name, a nickname, one letter,
a number, the girl on the 51B (migrations 0053 and 0055). The field is the
same field in either case: with the @ painted beside it and the identifier's
face, or with the @ gone and the display face, because a name is something a
person means and a handle is an identifier. The resolver's card stands down
for a name. No second field and no hidden one.

It used to be one quiet line under the field, `a first name instead`, which
named one of the two choices, hid the other behind a sentence, and said
"first name" about a choice that was never only that. A person deciding who
a letter is for should see both answers before they type, and the one that
is on should be lit from behind, which is how the bar says where you are.

On the wall a letter to a name is keyed by a tilde and the folded name,
`~sofia`, `~j`, `~51b`, a string no handle can be, so everybody written to
under one spelling shares one disc, a handle spelled the same is a different
disc, and every comparison in the schema that reads a verified handle
against a target stays correct by construction: no handle proof can claim,
seal or empty a name, because a name is not one person's to prove. The name
as written is kept to print, one to thirty characters and five words, and
nothing else is stored, not a handle in plain text and not a hash of one.
The name goes through the same list as the body, at the keyboard and on the
server, and the classifier is told the addressee.

It is drawn as every letter is drawn. In the hive a disc with the name
written on it whole when it fits and its monogram when it does not, the
plate reading `Sofia` in the name's face rather than the identifier's; on
the card `for Sofia` with nothing under it, the branch the addressee already
had for a handle the resolver never saw; in the search and the suggestions a
monogram, the name and the count. The resolver is never asked about a name
key (`api/handles.js` `isNameKey`), or a letter to Sofia would carry
@sofia's face.

Reporting a letter to a name is one tap, as for any letter. `Take my name
off the wall` is not offered on a name letter, since a first name is nobody's
to empty; only the desk shuts a name, and `wall_name_shut` applies only its
desk branch to a tilde key, so one Sofia's takedown does not shut every Sofia
and an opted out @sofia does not shut the first name either.

Where the @ matters is the ping, and Main asks for it there. The tab after a
letter is unchanged; `/berkeley/join` leaves for `/place/<handle>` when the
letter carried a handle and for `/place` when it carried a name, and `Who's
on your mind.` is the ask, made by the writer, on the surface where a ping
lives.

## The look of a letter

A letter is a phone screen left on in a dark room (`looks.js`, `screen.jsx`,
`screen.css`, and design/DESIGN.md 2.5): an unsent draft with the cursor
still after the last word. Every letter is the same screen, set in one face
(Jersey 10, the Series 40 grid):

| | |
| --- | --- |
| **the status rows** | the aerial, and by the battery (how long it has been sitting there unsaid) the day it went up, `09/24/26` (looks.js `stampOf`, the reader's own clock). While it is a draft that place is the characters left of 280, so on the tap that puts it up the count turns into the day; the composer's row carries no date beside it and a letter's no count. Then the pen, `dear` and the first name, and the handle. Where the resolver has no name it is `dear` and the handle alone. A sealed letter has a padlock where the pen is. The menus keep the letter's first row, and the shared picture carries the same one |
| **the words** | as large as the screen holds them, stepping down four sizes and then scrolling with the phone's own bar. A sealed letter is its stars |
| **the soft keys** | `options` (write to them, report it, take my name off, in a menu drawn the way the phone drew one), the heart and its count, and `share` (to someone, which hands the letter's picture to the share sheet on a device that has one; save the picture; copy the link). The picture is signed under the screen with the mark and `celestual.` (`share.js`) |

The only thing a writer chooses is the COLOUR it is lit in, from one list in
three groups (`Look.jsx`, under the composer's screen while its `colour` key
is on): six lit screens and the negative; six posters and four risos, which
keep their own ground; and the xerox. Each colour brings its treatment with
it, and every letter in it is still its own phone: its tilt, proportion,
backlight and the clouds in it, pixel pitch, the colour each pixel is lit a
little off (`rgbTile`) and dust come out of its id (`quirks`), so no two
letters are the same photograph and no letter is a different design. The
aerial, the battery and the pen are the one phone's, drawn at its sizes.

The room an opened letter stands in is black, with the screen's own light
falling on it (`.wl-room-light`); the wall goes out behind it. On the wall
each name is its newest letter's screen, small (`Tile`): the aerial across the
top, the battery how long since the last, an envelope blinks on a
name written to today, and the middle is the name's picture, in the screen's
own tones with some of the photograph's colour left in, or its monogram with
the cursor after it. Nothing on the wall is round.

Everything round the screens is the same phone (design/DESIGN.md 2.6,
`phone.css`): one face for every word but the brand's, square keys, unlit
panels with a one pixel bezel, the phone's pixel glyphs (`screen.jsx`
`PixIcon`), a lit key for the one act on a screen, and the chosen row
inverted. The brand, the mark at a door's head and the poured mark of the
intro are the only things on the wall that are not the phone. The shared
parts learn which surface they are on from `PhoneChrome` (`parts.jsx`), which
only the wall's root turns on, so Main draws them as it always has.

A letter reached from a link, before the tab has been to the wall, carries
the brand at its top left and `view the wall` under it (`Letter.jsx`
`LetterBrand`, `ViewWall`). Either one drops the wall's poster and closes
the letter onto the names; the close key still lands on the poster.

The one stamp a letter can carry is `sealed`, and only a SHUT letter carries
it: the gate under a sealed card says `read it` and not a word of policy,
because the card beside it has already said what it is.

It was forty-two papers, twenty-nine colours and twenty-four faces, on one
rail of three over a gallery. The papers, the faces and the rail went with the
screens; the concept is the "Screens in the Dark" study, applied, with its
six versions folded into the colour list and its three faces into one.

What the row keeps is 0055's shape, `{ theme, tint, face }`, cleaned by the
browser, by the function and by the schema (`wall_look_clean`, and a
constraint that holds every row to what it answers). The screens write one
key of it, `{ "tint": "teal" }`. What a slug DRAWS is the browser's: a new
colour is a row in `looks.js`, never a migration, and a row this build does
not know — a paper from before the screens — draws the colour its id picks.
Migration 0058 gave every letter already up a colour of its own and kept
what it had in `wall_look_backup_0058`.

**The screen of a name is the screen of its newest letter.** The index
carries the look of the newest letter under each key, so a name's small
screen on the wall is lit in that colour (`screen.jsx` `Tile`), with the
name's picture dithered into its ink or its monogram. The search rows, the
suggestions, the tab at the foot and the notice draw the name as its face, a
small square of the night LCD (`parts.jsx` `Face`). Every letter under a name
is read on its own screen, so a deck turned from a green letter to an older
amber one is two phones.

**And what it does not change.** A look is a choice from a menu that every
writer shares, structured and not written, so it is not a signature; the
list at the keyboard and the classifier still read every word; a takedown
takes the look with the letter; the desk sees the slugs beside the row; and
the letter's screen stays the one lit thing in the room, in whatever colour
the writer chose it. [../../../docs/WALL-FEATURES.md](../../../docs/WALL-FEATURES.md)
records the ruling, which reverses the one the document made before there
was a menu.

Two things came off the composer with it. `a different name`, the capsule
that stood beside the act in the foot, is gone: the way back to the first
question is the name on the card itself, which is a press, and the dots in
the head. And the act, `send anonymously`, stands alone in the middle of the
foot, at a width a thumb finds.

## The screens

| Route | What it is |
| --- | --- |
| `/berkeley` | **the wall**: the hive, the names as a crowd of faces bent by a lens, edge to edge and drifting, and the veil over it |
| `/berkeley/letter/:id` | a letter over the dimmed wall. Whole, or redacted, the heart on its foot with the count beside it, and under it the edges of the deck: every letter on the wall is one card in one deck, turned where the card is, by a swipe on the card, a chevron in each gutter or the arrow keys, and the header keeps the count over the whole wall |
| `/berkeley/find` | the search, raised by the field under the ear. It hears a name, a nickname, an accent and a misspelling as well as a handle (migration 0054), opens on the names most recently written to, and a miss offers the composer for somebody else and, quieter, a letter to the name typed |
| `/berkeley/write` · `/berkeley/write/:handle` | the composer, two steps, written on the card itself. The first step asks who, by two answers on one rail: an Instagram handle, on by default, or anything else the writer calls the person (migrations 0053 and 0055). The second is the letter, on the paper it chose: the pen on the card opens the look under it. It sends from the card: a letter the list catches shakes it and goes nowhere, and one that goes up closes the sheet onto the wall, where the name pulses and rises on its paper. There is no screen after it |
| `/berkeley/gate` | **the door on the wall** — an address and six digits, or the account |
| `/berkeley/report/:id` | **one letter, down** — the tap, the small box, the reading |
| `/berkeley/remove` · `/berkeley/remove/:handle` | **a whole name, off** — the Instagram handoff, then the tap |
| `/berkeley/join` | **the one door to the product** — three lines and one ornament, and `place a ping` leaves for Main: at `/place/<handle>` when the letter this device wrote last carried a handle, so the ping's target is already in the field, and at `/place` when it carried a first name, so Main asks `Who's on your mind.` with its own painted @. That field is where the @ is asked, and the only place |

`/berkeley/orbit`, `/berkeley/orbit/place` and `/berkeley/orbit/:id` are gone
(the audit of 4 September). They were a drawn stand-in for the core service
with a seeded ledger in it, still reachable by typing the address after the
wall went live; the core service is Main, and `/berkeley/join` sends people
there. Anything below that describes the orbit, `orbit.js`, `Core.jsx`, the
seeded ledger or the printed date is a record of what was built, not of what
runs.

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

Two targets on the right of the bar, in the same place on every screen of the
wall, and the only words among them are the name and the one act. The search
is not in the bar any more: it is the wall's own question, a field under the
ear (below):

| | |
| --- | --- |
| ✦ celestual. | **the brand**, top left. `Brand`: the mark at 26px and the name beside it, both chalk while the row around them is ash, and the same lockup every bar on Main carries. On the wall it grows the chevron and goes to the front, at `/`; on a sheet it goes back to the wall under it |
| write | **write a letter**. The one word in the bar besides the name, and the one primary on the wall: the metal capsule carrying the nib and the word (`wall/LiquidButton.jsx`), at the foot where a thumb is. It replaced a bare nib here and a wide `write anonymously` capsule docked over the foot of the field, which was a plate standing on the faces it was about; it was chalk with the running light inside it until the primary became a material |
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
index.jsx    the shell — routing, the cut, the ground, ?s=, the tab's icon,
             and the intro
Intro.jsx    the first two seconds, on black: the liquid mark. Once per tab,
             skippable on any key, and the same intro Main plays at `/`
Hive.jsx     the field: the lattice and its tile, the lens, the drift, the
             pull, the pointer, and the pool of slots that draws it
morph.js     the hand-off: the circle the wall leaves behind when a disc is
             pressed, claimed by the letter on the way in, which opens its
             own card out of it (screens/Letter.jsx)
ground.jsx   the room: the plasma, the halo, the field (field.js) and the
             grain. One component, mounted by this shell and by Main's
wall.css     every rule scoped under .wl-root
router.js    ten routes, no dependency
art.jsx      ECLIPTIC (the mark, the lockup, the favicon string) and the
             ornaments: sparkle, halftone sphere, THE ORRERY, bloom,
             per-handle constellation (with its countdown gauge), the field
looks.js     the colours a letter's screen can be lit in, what each is painted
             with, the quirks each letter's id gives its screen, the glyphs,
             and the memo of which colour each name was last written in
screen.jsx   the screen, at three sizes (the letter, the wall's tile, the
             panel's thumbnail), and a picture dithered into its ink
share.js     `share`: the letter drawn as a picture signed with the mark
             and the word, and the share sheet, the save and the copied link
phone.css    the wall as the phone: the tokens remapped for the wall's root,
             and the parts both surfaces share drawn as the phone
Look.jsx     the colour panel under the composer's screen
parts.jsx    display · label · prose · redaction · pill · paper · fields ·
             sheet · row · icons · the close mark · the bar · step dots
auth.js      the domain check, what it does and does not buy, and the
             Instagram handoff that stands on the one irreversible action
moderate.js  the screen: layer 1 for real, layers 2 and 3 drawn honestly, and
             the report's own triage
data.js      handles, the deterministic hash everything derives from, the
             corpus, search, write, the reports (held, never deleted) and the
             removals
seed.js      the printed sources and nothing else now: the corpus and the
             seeded ledger went with the orbit stand-in
screens/     one file per screen. Wall.jsx carries `Seek`, the search on the
             wall; Find.jsx the sheet it raises
```

## The hive

The names are a crowd of faces bent by a lens (`Hive.jsx`). One disc per
person written to, the picture the resolver has or a monogram until then,
laid on a hexagonal lattice that never ends in any direction — and then put
through one continuous function of how far a disc is from the light.

### One function, three effects

For every disc the loop computes `u`, its distance from the light in units of
the screen's own half-size. Everything the field looks like comes out of that
one number:

| | |
| --- | --- |
| **size** | full, and a hair over dead centre, out to a plateau; then a power curve down to about a quarter of that at the rim. |
| **spacing** | the lattice is pushed *outward* from the light as it goes, half again as far apart by the rim. The crowd thins as it leaves the middle. |
| **slack** | what is left over between a disc and its neighbour once the first two have had their say. It is the room a disc is allowed to wander in, and every wander is a fraction of it — so the middle, where there is no room, is ordered and still, and the rim, where there is a great deal, is scattered and adrift. Two discs can never collide, because neither can spend room that does not exist. |
| **air** | and the light on it. A disc half the size is also half the way into the room, so the far faces recede rather than sitting on the same plane at a smaller scale. |
| **focus** | and how sharp it is. Past about six tenths of the way to the window's own side a screen goes out of focus in six steps, each dimmer, the far ones lit by a round glow in their own colour, and a screen that reaches the side of the window is at least five steps out, so the frame never cuts a sharp card. Under a mouse the screens near the pointer are sharp; under the veil every screen is soft. The blur is written when a screen crosses a step or its scale has moved by an eighth, not on every frame. |

That third row is what stops this reading as a grid. A hexagonal lattice with
a size ramp on it is a grid with a size ramp on it; a lattice whose disorder
is exactly the space its own packing left over is a crowd. Nothing about the
size is stepped, either: the disc a name is set at is a log of its letter
count, and the lattice's own pitch is a function of the window rather than two
hard numbers either side of a breakpoint.

Nor is the lens. On a wide screen it is the ramp above: full at the light, a
quarter at the rim, the lattice half again as open by the edge. A phone held
upright has its two long edges a hand's width from the light, and the same
ramp put the rim of the lens on them — three discs from the middle the crowd
was already points a long way apart, and the sides of the screen were empty.
So on a narrow, tall window the lens is drawn taller than it is wide, its
fall is gentler, the rim is nearly half rather than a quarter, the lattice
barely opens and more light is left at the edge (`Hive.jsx lensFor`), and
the mask that dissolves the field's edges reaches past the glass. The edges
a phone actually has stand well inside the lens and the crowd runs to them.
The packing is untouched, so nothing can overlap that could not before.

### It is the whole screen

Not a panel between the bar and the pill. The field runs corner to corner,
behind the bar, behind the ear, behind the pill, out past the column's own
gutters to the edges of the glass, and it dissolves at every edge rather than
stopping at one. What keeps the type over it legible is not a box around the
field but two gradients over it — the shades — which pour the void back in at
the top and the bottom on a long ramp and are gone before the middle. A field
of faces inside a margin is a widget on a page.

The bar and the dock are the two strips that stay solid to the pointer. They
are chrome nobody is trying to look through, and they are also the only part
of the screen where a wheel or a finger still belongs to the page: the field
takes both wherever it is exposed, so if it were exposed everywhere there
would be no way left to scroll down to the foot of the site.

### One name, under the pointer

Nothing is written on the field at rest. Under a mouse the screen the pointer
is on brightens a little and says whose it is, on a small dark tag under it
(`.wl-cell-tag`). The tag is the cell's own hover, so one is up at a time, and
the loop writes it at the inverse of the disc's scale, so it reads at 15px
wherever the disc stands. Before this it was one tag per cell fading in and
out as a pointer swept past, two on the screen at once as often as not, and
then a single plate the loop moved to whoever the lens was reading, which read
as the wall picking somebody out over and over. A phone has no hover and
shows no tag.

Nothing else is written on the field: not the name, which the resolver knows
for a few people and not for most; not the count, which is the disc's size;
not the time since the last letter. Every one of those is behind the tap, on
the letters themselves. A field with a caption under every third face is a
directory, and the wall is a place where people are, not a list about them.

It replaced three lanes of handles crawling left and right. The lanes said
the wall was alive and nothing else about anybody on it, and a handle at
thirteen pixels sliding past is a handle nobody reads.

- **It drifts by itself, and every disc moves differently.** One slow drift,
  always, whose heading wanders so the field never runs one way for long; and
  on top of it every disc breathes on its own clock, by its own amount, in its
  own direction, inside the slack its neighbours leave it. A field that
  translates as one block is a picture being panned.
- **It answers the pointer.** A mouse is a second, smaller light: what is
  under it swells, the crowd parts around it to make the room that swelling
  needs, and the nearest disc is the one being named. The field's own light
  leans a little toward it, capped at a tenth of the screen, so the crowd is
  aware of where you are without the picture sliding under you. A finger gets
  none of this, because a finger is already the pull.
- **It can be pulled, in any direction.** The field takes the finger; a throw
  coasts on friction and eases back into the drift rather than stopping; a
  wheel or a trackpad pans it. Under a mouse the drift slows over the field
  and rests over a disc, so a name can be pressed. A keyboard walking the
  names brings each into the light as it lands on it.
- **And it can be opened out and closed up, within reason.** A pinch on a
  phone, the trackpad's pinch or a ctrl+wheel on a desktop, changes the
  pitch of the lattice about the point under the fingers, from about seven
  tenths of the window's own pitch to about half again (`Hive.jsx ZOOM`).
  Past either end the pinch is rubber banded, to about fifteen percent past
  the limit and no further, and eases back when it is let go. The discs are
  laid out at the window's pitch and the zoom rides on the loop's transform,
  so a pinch re-renders nothing; the cells it brings onto the glass take
  free slots, a couple of dozen a frame, and the pool grows by one for each
  it is short, so no disc already on the glass changes hands under the
  fingers (the pool, below).
- **A pull is not a tap.** A press that travels more than 6px swallows the
  click it would have ended in. Every disc is a target.
- **A name that has just arrived rises into the field.** A letter goes up, the
  index moves, and that person's disc comes up past its own size and settles
  while one ring leaves it and opens out into the crowd. It plays for a name
  that is new and for a name that has gained a letter, and never on the first
  reading of the wall — a wall that pops sixty times on load is a wall having
  a seizure.
- **Nobody moves when it does.** The index is ordered by when each name was
  last written to, so one letter posted while somebody is looking would push
  every other name one place along and reshuffle sixty faces to show one
  arrival. A name holds its seat for as long as it is on the wall; the ranked
  order only decides where somebody sits the first time. The seat is a cell
  of the tile and not a rank, so when the tile is cut larger for names that
  have arrived, everybody keeps the cell they had and only the arrivals take
  cells; and the tile is never smaller than four by four, so a wall of a
  handful of names is not re-cut for each of its first dozen letters.
- **It moves while you look at it.** The index is read again every three
  quarters of a minute while the tab is on the screen, the moment the tab
  comes back to it, and at once on a nudge from the campus's Realtime
  channel, which `celestual-wall-moderate` sends after a letter goes up or
  the reading takes one down (`data.js watchWall`, `api.js subscribeWall`).
  The nudge carries nothing: it says the index moved, and the read is the
  public read the wall makes on landing. A letter from another phone then
  rises in place, its name's disc coming up past its size and settling, and
  the count in the ear turns up one, when the ear carries it (The count,
  below). A project with Realtime off keeps the clock and loses the nudge.
- **The disc is placed by the loop and animated by the stylesheet, and they
  are two elements.** Two owners on one transform is how these end up fighting
  each other at 60Hz.
- **One `requestAnimationFrame`** writes every position, scale and opacity.
  React is told only when a slot changes hands or the lens moves to another
  person. Under a sheet the loop stops.
- **The ends dissolve, in every direction.** A hard edge on a moving face is
  a box; a fade is a room the face walked out of. The mask is on the faces and
  not on the plate naming somebody, because under a pointer near the rim that
  is exactly where the plate is standing.

### A name opens into the letter it carries

Pressing a disc does not cut to a sheet, and it does not wait. On the frame
of the press the letter's own card opens out of the circle that was pressed:
the wall leaves the disc's rectangle behind on the way out (`morph.js`), the
card claims it on the way in, and one transform puts the real card — words,
crest, dateline and all — where the disc was, at the disc's size, with the
paper's corner a circle's, and runs it out to where it stands on the
travelling curve the sheets move on (`screens/Letter.jsx`, 440ms). At the
same moment the wall answers the press the way it answers the tap that opens
the veil: the same pulse is sent out from the disc through the crowd and the
field travels to bring that disc into the light (`Hive.jsx tapAt`), both
running out under the sheet's glass, so the name is in the light when the
sheet comes down. It used to wait half a second for the crest to leave the
disc before the card opened, and half a second between a finger and anything
readable is the moment a surface stops feeling touched. The pulse's tail
runs out under the sheet's glass, because a crowd frozen in the middle of a
wave is a crowd that jumps when the sheet goes. And it closes the
same way: the mark, the scrim or the key sends the card back into the disc of
whichever name the deck is showing, if that disc is on the glass
(`morph.js locate`), while the glass fades in place instead of dropping.
Dragged down, the sheet falls the way every sheet falls.
The sheet's glass comes up under it in place rather than rising, and its
header and foot arrive a beat behind the card. The words are on the card from
the first frame, and there is no stand-in: the card the flight starts on is
the card the words land on, so a letter that arrives mid-flight arrives on a
card that is opening rather than under one that is hiding it.

It used to be a stand-in flown by hand from the disc to a card that was read
fresh every frame and switched on at the end, and it was glitchy for exactly
the reasons that design tried to handle: the destination moved when the words
landed, the sheet re-centred under it, the face inside the stand-in was a
monogram set at the disc's size inside a thirty pixel circle, and the real
card was invisible for two thirds of a second. The transform is measured once
now, against the card's own final box, and is relative to it: whatever the
layout does under the card, the card goes with it.

A deep link, a refresh, a back button, a turn of the deck or a reader who has
asked for less movement opens the ordinary way, because none of them has a
circle to open out of.

### The deck

Every letter on the wall is one card in one deck, and the deck is turned
where the card is. The order is the wall's own: the names in the order the
index carries them, newest first, and under each name its letters, so the
card after the last letter under a name is the first letter under the next
name and a swipe can be kept up from one end of the wall to the other. The
next name's letters are asked for while this one is being read, so the turn
onto them lands on its card and not on a request; the turn back lands on the
name before's last letter.

What says there is more is the deck itself: the edges of the next card and
the one after it stand under the card, drawn as two sheets of paper a step
darker than the letter's, hung from their bottom edges so the peek is the
peek whatever the card's height (`wall.css .wl-letter-stage::before`). A
swipe takes the card off the top, following the finger and tilting a little
with it, leaving the glass the way it was going, and the next rises from the
stack; a turn back slides in from the side it went to. A chevron in each
gutter says the same on a desktop and the arrow keys do the same, and the
header keeps the count over the whole wall, `3 / 19`. It used to stop at the
name, and a stack of one — which is most names — had no turn at all: a person
who swiped the card got a spring back and no way to read on.

The height goes with the strip. A short letter beside a long one is a card
beside a taller card, and the glass used to take the new height on the frame
the address changed: everything under the card jumped. The track's height
follows the strip instead, from this card's height toward the neighbour's by
how far the strip has gone, so the sheet is seen to grow or shrink with the
finger, a turn from a chevron carries its height on the same clock as its
travel, and the next card takes over at exactly the height the strip arrived
at (`Letter.jsx place`).

### It has to work at five names and at five hundred

The lattice is a torus: a tile of C by R cells that repeats in both axes, so
there is no first name, no last one and no edge to reach. The tile is the
smallest with room for every name (R even, so the offset rows line up across
the seam), and on the first seating the names are laid into it from its middle
outward in the order the index carries them, newest first, so the people most
recently written to sit together at the centre of the tile and the stalest at
its rim. Every later seating keeps everybody where they already were; seats
given up by names that have come down are handed to names that have just
arrived. Cells left over are filled from the heaviest names, in turn. A wall
of five is
a field of the same five, which is the truth, and a wall of three hundred
repeats only at a distance nobody sees twice. Past 240 names the rest are a
search away.

The DOM holds a pool of slots the size of the screen and no more, however
many names the wall carries. A cell of the lattice that comes onto the glass
takes a free slot and keeps it for as long as it is on the glass; a cell that
leaves gives its slot back; and when no slot is free the pool grows by one,
for good. So a disc changes hands only for a cell that has actually left and
one that has actually arrived, whatever the zoom, and the pool is exactly as
large as the most the screen has ever needed. It was a fixed grid of slots
addressed by the cell's coordinates modulo the grid, which was the right
size only for the zoom it was cut for: past that two cells shared a slot and
one of them was not drawn, and re-cutting the grid for a pinch handed every
disc on the field to a different element under the fingers, which is what a
pinch pulled hard looked like. About two hundred and sixty slots on a phone
and three hundred on a desktop to begin with, of which a hundred and seventy
and a hundred and ninety are on the glass at once, and the loop's own cost is
under a millisecond a frame on either.

Three things keep it there as the wall grows, and all three are about what
is NOT done on a frame:

- **The index is shaped once per reading** (`data.js wall`). It answers the
  same array until the index is read again, and a name that has not moved
  between two readings is the same object it was; so a revision of the corpus
  that did not touch the index, a letter's words landing, a heart, this
  person's own letters read again, costs the field nothing. It used to build
  sixty new objects on every call and the screen called it on every revision,
  which re-rendered every disc on the field for each of them: a press on a
  name, which asks for its letters, was answered with a hitch on the frame
  the card was opening.
- **A slot is handed a name and a count**, not the index's row, so a new
  reading of the index re-renders only the discs whose names actually moved.
- **The disc's layer is the size of the disc.** Every disc is its own
  compositor layer, and a layer is as large as everything painted in it,
  transparent or not. The halo behind the disc the lens is reading was drawn
  at nearly twice the disc's width on every disc, at nought opacity, which
  made every disc's layer three times the disc's area, all of it blank, for
  a glow on one person; it is held at half its size until it is lit and
  opens out as it comes up. Positions and opacities are written to
  the elements only when they have moved.
- **A name the index says the resolver never saw is not asked about again**
  for ten minutes (`api/handles.js learnHandle`). Every disc drawn as a
  monogram used to send a peek on mount and again a minute later, and a wall
  of three hundred names was a steady trickle of requests for faces the index
  had already said were not there.
- **The rest of the faces are fetched in idle time** once the field is up
  (`data.js warmRest`): the first thirty-two before the intro lifts, and the
  other two hundred a couple of dozen at a time, spaced out, so a pull, a
  pinch or an hour's drift brings pictures onto the glass and not forty
  monograms fading to faces at the rim.

### And it turns over while you are looking at it

Which follows from the section above. The wall carries more names than the
glass holds, and every one of them is somebody a letter was actually written
to, so the field does not hold one arrangement of them for as long as it is
looked at. Every couple of seconds one disc shrinks away and somebody else on
the same wall comes up in its place: about a second, the gap jittered between
two and five so it is never a beat, and the first one not until the wall has
been standing still long enough to be read. The wall is a crowd larger than
the screen rather than a photograph of the sixty people who happened to fit,
and a person who looks at it for a minute has seen a good deal more of the
campus than a person who looks at it for two seconds.

**It is not the arrival, and the difference is the point.** An arrival is a
CLAIM: a letter went up, to this person, just now. The only thing entitled to
make that claim is a letter that actually went up, and the wall makes it
loudly when one does — the disc pops past its own size, and a pulse goes out
through the crowd from it. A turn claims nothing, so it is drawn as nothing: it
recedes on the curve for travel that does not overshoot, the next face comes
up with no overshoot at all, and no ring, no light and no pulse go with it.
Nobody's seat in the tile moves, no count changes, no letter is implied, and
the index is not touched. Implied activity is the one lever this product does
not pull (`design/VOICE.md` §6 bans the words for it, and this is the same
rule drawn instead of written), and a field that faked arrivals to look busy
would be pulling it sixty times a minute.

Three questions, and the care over each of them is why it reads as a crowd
rather than as a glitch:

- **Who goes.** Never the disc the lens is reading, never one under the
  pointer, never the one a keyboard is standing on (a name that changes under
  somebody who is about to press it is the one thing here that would be worse
  than no movement at all), never a name this browser wrote to (that one is
  lit, and it is the one thing on the field that is about the person looking),
  never one that has just been written to, and never one already turning. Weighted into a band
  out of the light and in off the rim: nothing turns over dead centre, where
  the eye rests and the plate is standing, and nothing turns over at the rim,
  where it would be a movement nobody sees.
- **Who comes.** Somebody not on the glass at all, so the turn actually shows
  a face the screen did not have. On a wall small enough that everybody is
  already up, somebody whose nearest other disc stands at least three pitches
  away, so a face never arrives beside its own twin. And on a wall so small
  that the torus repeats inside three pitches — twenty names or so, where
  every name already has a twin three discs away wherever you stand —
  whoever stands farthest from themselves, because holding out for a distance
  the packing cannot offer means a small wall never turns over at all, and
  the honest rule is not to put a face nearer its own twin than the wall
  already puts it. Under a hard floor of about two and a half pitches it does
  not turn at all: two of one face with a disc between them reads as a fault,
  whatever the tile is doing, which on a wall of eight names or fewer is
  every pair on the field, and is why a wall that small stands still. Only ever a face the browser is
  already holding, too (`data.js warmRest`): a disc that came up as a monogram
  and faded to a picture a beat later is exactly the seam this movement exists
  to hide.
- **When.** Not under the veil, not under a sheet, not during the opening
  cascade, not while a pulse is crossing the field or the field is being
  pulled or thrown, and not at all under reduced motion. After any of those
  the wall stands still for longer than the ordinary gap, because a surface
  that starts moving again the instant a finger comes off it is a surface that
  was waiting for you to stop.

The face itself is changed at the one moment the disc is not on the glass —
inside the stretch of the animation where the orb is at nought opacity, which
is a hundred and fifty milliseconds wide so a commit landing a frame or two
late still lands inside it. What is written down is the cell's new name, by
handle and never by the index's row number (the index is ordered by when each
name was last written to, so one letter renumbers every row in it), and the
loop's own seating carries it from there: the person who arrives arrives with
their own picture, their own paper, their own letter count and the disc size
that count earns them. The name a turn covered is still on the wall, still at
its own seat in the tile, and comes back the next time that seat is drawn.

Two things follow from it, and both were already half broken.

The pulse the wall sends out when a letter lands (`Hive.jsx pulse`) used to
find a name only by its seat in the tile. The cycle can seat somebody where
the tile did not, so it looks first for a disc that is actually DRAWING that
name; without that, the wave travelled to one disc while the arrival played
on another a screen away, and if the field had to travel to the tile's own
seat, the cycle comes off that cell first so the disc it arrives on is them.

And the way both that and the locator a closing card comes home by (`morph.js
locate`) found a disc: through the slot's own row number. A slot keeps the row
number it was given on the last frame, and a pulse arrives on the one frame a
new reading of the index has just landed — the frame that letter moved its
name to the front and shifted every row behind it by one. Reading the index at
that row on that frame names the wrong person on every disc on the field, by
exactly one place. Both go through the cell now, which resolves the same way
the draw does.

### The veil, and the ear

The masthead is over the field, not above it. On a fresh load the whole
screen is the field, dimmed and out of focus — and still bent by the lens at
rather more than half strength, because a flat grid of faces under a title
is wallpaper and the poster wants its depth before anybody has pressed
anything — with the title, the one line
(`anonymous letters to the one you never told.`, in the reading face, the way
the front door runs one line of the mechanic under its own headline) and the
way in laid over it. The scrim is darkest where the type is and gone where it
is not, so the discs show through under the words as a texture, and it runs
up over the bar so it has no edge. The type stands in the middle of the
glass, centred, the way a poster's title block does; it used to hang off the
top left under the ear, and on a phone that put the wall's one headline in
the corner of the one screen built to be looked at. The scrim is itself the
way in, and the capsule under the line says so in words: `view the wall`,
the product's own primary with the running light inside it and nothing
drawn round it. It replaced an arrow link, which is the poster's nav voice
and read as a link to somewhere else rather than as the door into the thing
under it; and for a while a hairline ring left it every sixteen hundred
milliseconds and opened out into the field, which came off, because a ring
on a loop is a line drawn over the crowd on a screen whose whole job is to
be calm, and the light inside the capsule already says the door is live.

And that is the whole screen. Under the veil there is no composer's pill, no
foot under that and no glyphs in the bar: a poster with one door on it, over
a field that is plainly alive, and the brand in the corner as the way home.
Everything else is built once the door has been opened, because a person
reading the title has not decided anything yet, and a screen already
offering three controls and a footer has decided for them.

Lifting it is one movement, and it starts where it was touched. A tap
anywhere on the veil opens it as a pulse sent through the crowd (`Wall.jsx`,
`Hive.jsx`, `wall.css .wl-veil-mask`): the grey and the type are one masked
layer and a circle is cut out of both from under the finger, over a soft
shoulder, and the same front runs through the field under it. Every disc it
reaches swells, is pushed out ahead of it, drawn back a hair behind it and
settles, and the lens arrives with the light — inside the front a disc is
drawn at the field's full lens and outside it at the veiled one — so the
faces are seen to come up as the wave crosses them. Nothing is drawn on the
edge of the light: the edge is the crowd moving. The swell is the crest's
where the packing has room for it and the gap's where it has not, so at the
light a disc lifts a little and out toward the rim it swells whole, and
nothing is ever drawn over a face. The title is not faded on a clock of its
own: the circle takes it as it reaches it, so a tap under the title clears
the title first and a tap in the far corner clears it last. One number
drives the hole and the crest, written to the veil and to the wave on every
frame, so the light and the crowd moving under it cannot drift apart. It is
slow, on purpose: the front's clock is a function of how far it has to go,
the better part of two seconds on a phone and a little over on a spread, on
a shallow ease out, and the wave loses a little as it goes and dies at the
far corner a beat after the veil has gone. When the circle has cleared the
glass the rest of the wall arrives, a beat apart: the bar's glyphs, then the
pill, then the foot. It used to fade, and then it was a circle with a
hairline ring running out on its edge; a fade is the screen changing its
mind, a ring is a line drawn over the crowd, and a wave through the crowd is
the person touching it.

One line stays exactly where it was through all of it: the ear, under the
bar, the campus and the count in the identifier face at the size and the
tracking every dateline in the product is set at, the word in ash and the
figure in chalk. It is the same line the front door runs above its own
headline to point here, so the line on the door and the line on the wall
are one line, and it is what makes the veil and the field one masthead
rather than two: nothing at the top changes shape when the type goes. The
veil is up once per tab: coming back from a letter lands on the field. Under
reduced motion it goes without travelling.

The tower came off, and so did the count on flaps. The Campanile stood in
the masthead's corner and then on the count as its plinth, and it never
stopped reading as a thing put there: a drawing beside a headline that had
already said which campus this was. The flaps under it were a board, and a
board is furniture. The wall's one fact is a line of type now, in the ear,
and the wall's own light is in its field, on the person being read.

### The count

The one fact about this wall worth printing: `19 letters`, in the ear: a
dateline, the campus in the display face, the figure a step larger in chalk
with the word after it at the label's size. The term stood at the end of the
line for a while, dimmer, and came off, so the line above the search stays
quiet. The figure turns (`parts.jsx Roll`): each digit is a
window over a column of the ten, and a letter arriving, from this phone or
another, slides the last figure up one where it stands. It is drawn still at
the number it is given and moves only when the number does, so a figure
moving means a letter went up. An open wall with nothing on it yet says
`open now` in its place, the way the front door does, and not a nought; one
whose index did not load says so in the same place, because a wall that has
not loaded has no number; and while the index is still loading there is no
count at all, since a wall that has not answered is not a wall that is open
with nothing on it.

**It is off for now** (`screens/Wall.jsx COUNTED`, 25 September). While the
wall is young a small number over the question read as an empty room
rather than an open one, so the ear is the campus alone, the operator's
name an idle phone kept in that row. Everything above is still wired and
comes back with the switch: the figure, its roll and `open now`. The line a
wall that did not load says stays on either way, since it is not a count.
The `N letters` under a name in the search's rows is a different fact (how
many letters that one name has) and stays.

### What is not on the wall any more

Two controls stood under the names and both came off. `the rest of
celestual`, one quiet line under the composer's pill, went because a sign on
the road is still a sign and the wall is not a road: the brand in the bar
goes to the front, and that is the whole of the wall's pointing at the
product until a letter is up and the tab rises. `take your name off the
wall`, a hairline capsule under the names on every visit, went because on
the wall it was a control about a consequence nobody had met yet; it stands
in the search and under the flag on every letter, which is where a person
who has found their name is standing when they want it gone.

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

### The orrery is gone, and where its one honest number went

This screen used to open with a ring diagram: three ellipses, a moon on each at
`spent/60`, over a date set at the wall's headline size. Two rounds of work went
into making every quantity in it a quantity on the ledger beside it, and it was
still the wrong object — three axis-aligned hairline ellipses under a mark built
from a filled band at −19° whose width varies three to one. It shared no constant
with the logo it sat beneath, and it drew, in a picture, three numbers the rows
underneath already carried in words, more precisely.

The one thing in it worth keeping was the arc: a picture of how much of the sixty
days is left. That now lives **inside the count chip on the sill** as a fill, so
one object carries the figure, the proportion, and the tap that resets it. See
the orbit's design record, which went with the orbit on 4 September.

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

## The intro

The mark, poured, on an empty black screen, once per tab, before anything else
exists. Not a spinner and not a splash: nothing is loading behind it and it
never claims to be. It is `Intro.jsx`, and it is the same two seconds Main
plays at `/`: the wall used to open on an overture of its own, a flat mark
assembling beside the name with a bloom behind it, and the two surfaces of one
product opened on two different logos.

| | |
| --- | --- |
| `0ms` | black. A held frame before anything moves is what makes the first thing that moves land. Behind it the shell has already asked for the index and, off the index, for the pictures of the names that will stand in the light (`data.js warmWall`): the index carries every face since migration 0048, so the pictures are the next request and not the one after a peek |
| `180ms` | **the circuit.** A black cover over the liquid metal is cut away along the band's own centreline, so the ring is *uncovered* round its orbit rather than faded up. The cut travels the route the ring actually takes, because the mask path and the ring come out of the same constants, and its head is FEATHERED, so the metal lights along the orbit rather than being wiped by a rectangle: the cut used to be a straight chord across the band, and wherever the metal was bright under it the mark was drawn in with a blunt white wedge on the end of it. The blur is taken on the stroke and the band clips it afterwards, so the ring's own silhouette stays as sharp as it is drawn and only the front of the reveal is soft. 900ms to close. Not before the metal is there: the held frame stretches, up to 760ms from mount, until the shader has drawn a frame behind the cover (`LiquidMark onReady`), and the swap from the flat mark to the metal is instant while the cover is over it (`cut`). It used to run on the clock alone, and on a phone, where the compile takes longer than the held frame, the circuit was cut open over the chalk mark and the metal arrived a moment later on a ring already on the screen, which was a blink. Past the ceiling the sequence runs on the chalk mark and the metal fades in over it, gently, the designed state for a driver that is slow or never answers |
| `520ms` | **the star**, opening while the circuit is still closing behind it, up off nothing, with a few degrees bleeding out. Its hole in the cover is feathered too, and dilated by what the feather reaches: a crisp silhouette held at a third of its opacity is a crisp outline of the star, drawn in grey |
| `1180ms` | **assembled.** Nothing moves but the metal. The cover, black on black and doing nothing now, fades out here, while the veil is still opaque, so what lifts is the metal alone |
| `1560ms` | **the lift**, after a hold, and not before the wall is ready. The lift waits on the index and the first screen's faces having landed, with a ceiling at 4200ms from mount so a dead network is a wall of monograms and not a logo forever; on an ordinary connection they are there long before the clock is. The mark is the one thing in the product built to be looked at while something else finishes, and a wall drawn with sixty grey discs that fill in a second later is a wall that arrived too early. Then the mark drifts up and dissolves while the black goes with it, and the wall is mounted and already cascading underneath by the time the black is half gone, every face on it a picture from its first frame. One movement, not two screens |
| `2280ms` | the black is gone |

No name, because the name is in the bar of the page underneath; no bloom,
because a material with a current in it is already the light.

Everything that animates is a transform, an opacity or a dash offset; nothing
touches layout after the first frame. It is skippable on any tap or key, it
never plays twice in a tab, and under `prefers-reduced-motion` it renders
assembled and lifts almost at once. A brand animation that cannot be got out of
is a toll gate.

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

- **≥ 900px**: the wall becomes a poster. The ear under the bar, the field
  edge to edge of the screen and the whole middle of it, the veil's type over
  the left of the field, and the way in on the bottom row. It used to be a two column spread, a sticky masthead
  beside a column of lanes, and on any screen with height that was three
  short lanes floating in a void. Sheets become centred dialogs. The core
  service does **not** become a spread: it keeps its one flexible column and
  centres a 30rem measure in it, because a letter set to the width of a desktop
  is not a letter. The room goes around it rather than into it.
- **landscape phone** (`max-height: 560px`, `min-width: 640px`): the same
  spread, early. The ear and the dock in the left column, the field taking
  the right column's whole height with the veil over it, and every vertical
  measure that was buying atmosphere gives its space back. On 390px of
  height, atmosphere is just scrolling.
- **≥ 1280px** — the column stops growing. Past that the field around it is the
  design.

## What it touches

This tree, and one line elsewhere: `app/src/main.jsx` forks on `/berkeley` and
lazy-imports it. The wall is a separate chunk and the four faces it needs are
injected on mount and removed on unmount. Since the rebuild this tree is also
THE SYSTEM: Main imports its parts, its ground, its intro and its stylesheet,
which is what keeps the two surfaces one product.

## Known, and deliberately left

- **`supabase/migrations/0027_beta_wall.sql` belongs to an older build.**
  Undeployed and inert, and it describes a wall queried one handle at a time
  with a per-letter seal, an author column and a reveal request. It is **not**
  the schema for what is in this directory — there is no author on a letter
  here, no seal and no reveal — and it should be replaced rather than extended.
  What the shipped wall actually needs is spelled out in docs/launchsteps.md.
  `supabase/functions/celestual-wall-moderate/` is the opposite case: its
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
  JS and the screen starts at the last beat. The hive is the one thing
  that is *held* rather than jumped: under the preference the field is still
  with the lens on it, a pull moves it and leaves it, nothing drifts and nothing
  coasts, and the veil lifts without rising.
- **The takedown and the report are real inside the tab and nowhere else.**
  Both write to the same one key everything else does, so they survive a reload
  the way a real removal would and are cleared by the same reset — and a
  reported letter is genuinely gone from the wall, the search and the count a
  frame later. There is no server here to tell, and a build that mimed either
  would be the one thing on this surface it is least acceptable to fake.
- **Three things are drawn on a timer and every one of them says so on the
  glass.** The gate's six digits (any six pass), the report's reading, and the
  Instagram handoff (any handle comes back proven). Each is the shape of the real thing with the round trip
  left out, labelled rather than disguised, because a screen that mimes an OAuth
  handshake without saying so is teaching the wrong thing about what this build
  does with what it is given. Each label comes off the day its round trip is
  real, and not one day before — the order is in docs/launchsteps.md.
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
- **The core service under `prefers-reduced-motion` loses travel, not state.**
  The spread stops sliding between letters and jumps; the count still rolls to
  sixty, because that number IS the feedback that the tap worked. Nothing on the
  surface is only knowable by watching something move.
- **The write gate checks a domain, not a person.** Any `berkeley.edu` address
  may write. The Instagram handoff is the only place a *person* is checked; it
  opens reading (0044) and it is asked for again, about one handle, on the one
  action nobody can undo.

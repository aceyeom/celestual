# The council of 20 September 2026

Three questions about the wall at `/berkeley`, put to six seats, argued in
writing, and ruled on in one sitting. This is the record: what was asked,
what each seat argued, what was ruled, what was turned down and why, and
where each ruling landed in the code. It exists so the next person with the
same good idea reads this instead of building it, the way
[WALL-FEATURES.md](./WALL-FEATURES.md) exists for features.

The seats were not one voice asked six times. Each was given one lens, the
brief, and the repository, and told to argue its lens hard inside the hard
constraints: the three rules of [DESIGN.md](../design/DESIGN.md), the voice
in [VOICE.md](../design/VOICE.md), the nine gates of
[WALL-FEATURES.md](./WALL-FEATURES.md), and the two rules at the top of
[the wall's README](../app/src/wall/README.md). Where they converged the
ruling was easy. Where they split, the split is written down with the reason
the ruling went the way it did.

| Seat | The lens |
| --- | --- |
| the growth lead | the first ninety seconds off a scan, the nineteen of twenty who find nothing, what turns a searcher into a writer and a writer into a ping |
| the design system keeper | one bright thing per screen, the accent rationed, everything drawn from parts the build already has |
| the Target's advocate | the person a letter is about, who never agreed to be here, and the writer whose anonymity is structural |
| the interaction designer | the phone in one hand, standing, off a flyer: reach, the keyboard, what a control says before it is pressed |
| the engineer | what this schema and this client can carry today without breaking the live wall, and the exact shape |
| the student | a sophomore who scanned the flyer outside Dwinelle with one question, and who screenshots cringe |

---

## The three questions, as asked

1. **Placement.** People scan the wall to look for themselves, and the search
   was a small glyph in a corner of the bar. Where should the search live and
   what should it look like. A large glowing pill at the centre was floated.
2. **The miss.** Most people who look for their own name find nothing under
   it. What should stand there: a nudge that they are not on the wall, a way
   to spread the word around campus, an incentive, a funnel to writing to
   somebody else.
3. **A letter to a first name.** The handle stays the default, with a full
   option to address a letter to a first name or a nickname instead, the way
   the Unsent Project does. How does such a letter look on the wall, and what
   is the channel from writing a letter into placing a ping, given that the
   handle is what a ping needs.

And one instruction that was not a question: the search must hear a name, a
nickname and a misspelling, not only the exact handle.

---

## 1. Placement: the search is a question, not a door

**What was argued.** All six seats turned down the glowing pill at the
centre, for the same three reasons in different words: it is a second lit
capsule on a screen that already has one (`write`, in the bar), it stands on
the faces it is about, which is why `write anonymously` came off the foot of
the field once already, and on a phone the centre of the hive is the disc the
lens is reading. All six kept the veil as it is: a poster with one door, and
no keyboard over a crowd nobody has seen yet. The interaction seat made that
its veto, and the design seat made the second lit capsule its veto.

All six agreed the search should become a field, set as the system's bare
baseline, unlit. They split on where. Five put it under the ear, in the top
shade, where the eye lands after the veil goes and where type already stands
without a plate. The interaction seat put it in the dock at the foot, on
the tab's glass, for the thumb.

**The ruling.** Under the ear. The dock carries one thing at a time about
the person looking, the tab or the takedown notice, and a permanent field
there takes the one slot the tab needs and turns the foot of the wall from
"nothing until a letter" into "always a control". The thumb argument is real
and it is answered another way: the field is a real input, so the tap that
lands on it raises the keyboard, the focus opens the search sheet over the
wall, and the sheet's own field takes the focus on mount, so the keyboard the
tap raised is the keyboard the sheet keeps. One tap, no second tap, no dead
half second. That was the interaction seat's own mechanism and it is kept.

What stands on the wall after the veil lifts, on a phone at 390: the bar
with the brand, the chalk `write` capsule and the account ring; the ear; and
under it one baseline the column's full width, the glass in the place a field
paints its @, `look for a name` in the placeholder, mono at the field's large
size. On a desk at 1440 the same field, capped at the phone's column, under
the ear, with the hive running the whole window behind it. The glass ring
came off the bar. `write` stays the one bright thing.

Two things changed inside the sheet with it. The Didone heading `Look for a
name.` came off, since it stood over a field whose placeholder said the same
thing and on a phone with the keyboard up those fifty pixels are a row of
results. And the list the sheet opens on before anybody has typed is the six
names most recently written to, under `on the wall`, not the six carrying the
most letters under `written to most`: with the search promoted to the first
thing on the wall that list was the first list everybody saw, and a top six
by count with the word "most" on it is a rank of people with a label, which
is the edge of G1 and G6 the features document says the wall stands at and
must not cross.

**Turned down.** The glowing pill at the centre (above). A field on the
veil: the poster is the wall's one shareable and has one door, and a keyboard
over a greyed crowd spends the four seconds in which the wall proves other
people did this. A capsule in the dock: the tab's slot. The field in the bar
between the brand and the account: a 360 wide phone has no room for it.

Where it landed: `app/src/wall/screens/Wall.jsx` (`Seek`),
`app/src/wall/parts.jsx` (`TopBar`, `HandleField kind="search"`,
`focusOnTouch`), `app/src/wall/screens/Find.jsx`, `app/src/wall/wall.css`.

---

## 2. The miss: a letter to someone else, and nothing captured

**What was argued.** The empty state used to read `nobody has written to
@you` with a `be the first` pill that opened the composer addressed TO the
name searched, so nineteen people in twenty were offered a letter to
themselves. The student seat screenshotted it. Every seat replaced it.

Every seat refused, independently, the same four things. A waitlist, a
"leave your @ and we will tell you", in any phrasing: it is a list of people
hoping to be written to, indexed by identity, it is the notification the wall
promises never to send, delayed, and a true nudge is still a nudge (G2, and
the order the FTC made against NGL). The growth seat made this its veto and
would drop `wall_waitlist_add` from the schema. An incentive for being
written about, or for sharing: G6, and the self pump's scoreboard. The word
"yet", or "check back": implied activity, and a room to return to (G5). And a
door to Main from the miss, which four seats refused and one proposed: a
person who has just found nothing under their own name is the person most
tempted by the fishing frame, and the wall's one door is the tab, after a
letter.

The share split the council five to one. The growth seat argued the miss is
the other moment a person carries a private reason to hand the wall to their
followers, and that the door card carries no person so it passes the gates.
The other five said the same object offered as the answer to "nobody has
written to you" reads as "please write to me", which no confident person
posts, and that is the receiver face test in VOICE.md failing on the spot.

**The ruling.** A fact about the index, one primary, one quieter second, and
nothing captured or recorded:

```
nothing on the wall under
@sofia.reyes                        the echo: mono for a handle, the display face for a name as typed
[ write a letter ]                  the composer, on its own first question, with nothing filled in
write to @sofia.reyes               quieter, for the one who searched a friend
```

`write a letter` opens the composer empty. `Someone at Berkeley you can't
forget.` is the right sentence for somebody who has just learned nobody wrote
to them: it turns the search into the wall's second job, which is the only
growth the wall has. The quiet line is the old `be the first`, demoted to
where the person who searched a friend finds it and the person who searched
themselves walks past it. It is left out in exactly one case: when the handle
typed is one this browser has itself proved through the DM code. That is the
only fact about the searcher the wall honestly holds. Nobody is asked "is
this you", the words do not change for a self search, and nothing is written
anywhere. No share stands on the miss. The wall's one shareable, the poster
as a door card, keeps the place the features document gave it, after a letter
is up, and is not built by this change.

**Turned down.** The letter to yourself. The waitlist. The share at the
miss. `place a ping` as the primary. A branch on "is this your name".
Anything with "yet" in it.

Where it landed: `app/src/wall/screens/Find.jsx`.

---

## 3. A letter to a first name, and the channel to the ping

**What was argued.** All six kept the handle as the default and made the
name a quiet line under the field, `a first name instead`, that turns the
same field: the painted @ goes, the type changes to the display face, the
resolver's card stands down, and the line reads `their @ instead`. Not a
segmented control, not a second field. The student said what a student would
do: write to an @, because everybody knows everybody's @ and a letter to
"Sofia" is a letter to forty Sofias; and reach for a name for the person on
the 51B whose @ they never got.

On storage the council was unanimous in the direction and split on one
detail. Nothing about a handle is stored beside a name letter. The Target's
advocate would admit a salted hash of a handle for two checks only (the opt
out and the takedown); the engineer and the student vetoed even that, and the
growth, design and interaction seats stored nothing. The founder's "entering
the @ helps the mutual ping match" was read by every seat the same way: the
@ belongs on Main, typed as the ping's own target, by the writer, on the
surface where a ping lives. It is never asked on the wall's composer, never
posted to the moderation function and never kept in `wall_letters`. The
student said why in one line: the moment a name only letter asks for the @
anyway it is not a name only letter, it is the app collecting, and that ask is
the screenshot.

**The ruling.** Storage: two columns on `wall_letters`, `target_kind` and
`target_name`, and a key. A name letter's `target_handle` is a tilde and the
folded name, `~sofia`, a string no handle can be, so the index groups every
Sofia under one disc, a handle spelled the same is a different disc, and
every comparison in the schema that reads a verified handle against a target
stays correct by construction: no handle proof can claim, seal or empty a
first name, because a first name is not one person's to prove. The name as
written is kept to print. Nothing else is stored, plain or hashed.

Drawn: in the hive a monogram disc, the plate reading `Sofia` in the name's
face rather than the identifier's; on the card `for Sofia` with nothing under
it, the branch the addressee already had for a handle without a name; in the
search and the suggestions a monogram, the name, and the count. Every letter
still looks like every letter, and the resolver is never asked about a name
key, or a letter to Sofia would carry @sofia's face. The name goes through
the same list as the body at the keyboard and on the server, and the
classifier is told the addressee.

Takedown: reporting a letter to a name is one tap, as for any letter. `Take
my name off the wall` is not offered on a name letter, since a first name is
nobody's to empty; only the desk shuts a name, and `wall_name_shut` applies
only its desk branch to a tilde key, so one Sofia's takedown does not shut
every Sofia and an opted out @sofia does not shut the first name either.

The channel: the tab after a letter is unchanged and `/berkeley/join` keeps
its three lines. Its button reads `place a ping`, which is the product's word
and the act it performs; `register` sat in VOICE.md's never column. It leaves
for `/place/<handle>` when the letter this device wrote last carried a
handle, so Main opens with the person already in the field and the resolver's
card drawn against a face, and for `/place` when it carried a name, so Main
asks `Who's on your mind.` with its own painted @. That field is the ask.

**Turned down.** A hidden handle beside a name letter, plain or hashed. A
field for the @ on the join screen or the composer. A second field or a
segmented control. A nickname table, which decides that Alex is Alexandra
and is an inference about a person, not a fact about a string.

Where it landed: `supabase/migrations/0053_a_letter_to_a_first_name.sql`,
`supabase/functions/celestual-wall-moderate/index.ts`, `app/src/wall/api.js`,
`app/src/wall/data.js`, `app/src/api/handles.js`, `app/src/wall/store.js`,
`app/src/wall/parts.jsx` (`Face`, `Who`, `Addressee`, `OpenFace`,
`HandleField kind="name"`), `app/src/wall/Hive.jsx`,
`app/src/wall/screens/Write.jsx`, `Letter.jsx`, `Join.jsx`, `Gate.jsx`,
`Report.jsx`, `app/src/admin/Letters.jsx`, `People.jsx`, and
`scripts/sql/test-names.sql`.

---

## 4. The search hears a name

Every seat drew the shape the same way, and it is the shape of 0040 with
more strings on the right hand side. The browser sends the query as typed,
trimmed, and no longer strips the spaces and accents out of it. The server
folds it twice, as a handle through `celestual_norm` and as a name through
`wall_fold` (lower, accents out, punctuation to spaces), and matches every
row of `wall_index` three ways: the handle (exact, prefix, contains), the
handle with its dots out, and the folded name, which is the resolver's
display name for a handle and the name as written for a first name (exact, a
word that starts with what was typed, contains). From the third character
two kinds of nearness join: trigram similarity, so `soffia` and `sofiareyes`
land, and double metaphone word against word, so `sophia` hears `sofia` and
`reyez` hears `reyes`. Twelve rows, ranked exact, prefix, contains, near, and
inside a tier by nearness, letters, recency. One or two characters match a
prefix and nothing looser.

What it will never do is the line 0040 drew and every seat restated: list
the resolver's cache on its own. Every candidate is a row of the public
index, and the resolver's fields ride on those rows and never the other way
round, so a display name in `ig_profiles` for a handle nobody has written to
is never returned, by any spelling, at any similarity. The test pins it.

Where it landed: `supabase/migrations/0054_the_search_hears_a_name.sql`,
`scripts/sql/test-names.sql`, `app/src/wall/api.js`, `app/src/wall/data.js`,
`app/src/wall/parts.jsx` (`useSuggest`).

---

## 5. The vetoes, and whether the rulings honour them

| Seat | Would veto | Honoured |
| --- | --- | --- |
| growth | capturing the searcher's handle at the miss, in any form | yes. Nothing is captured, and `wall_waitlist_add` stays unwired |
| design | a second lit capsule anywhere on the wall | yes. The search is a field, unlit; `write` is the one bright thing |
| the Target | a plain handle stored beside a name letter | yes, and further: nothing is stored, not even the hash the seat would have allowed |
| interaction | a keyboard before the wave | yes. The veil is untouched and the search stands under the ear after it lifts |
| engineer | storing the subject's @ on a name letter, hidden or hashed | yes |
| student | a private @ attached to a name letter "to help the match" | yes. The @ is asked on Main, as the ping's target, or nowhere |

---

## 6. What is deliberately not built, and where it goes

- **The door card after a letter.** WALL-FEATURES section 5, item 2. The
  wall's one shareable, offered under the tab once a letter is up. This
  council placed the share nowhere on the miss; it did not build the card.
- **A ceiling on what one name can receive.** WALL-FEATURES section 5, item
  1. When it is built it must count tilde keys as it counts handles, since a
  first name that forty people share can gather forty letters in a night.
- **A subject's own report on a name letter as its own reason.** The
  Target's advocate proposed a `This is about me` row on a name letter that
  files the report under a reason the desk can cluster on. The tap already
  takes the letter down; the reason is desk tooling, and it waits with
  section 5, item 3.
- **`wall_waitlist_add`.** Wired, unused by any screen, and the growth seat
  would drop it. Left for a migration of its own.
- **A nickname table.** No.

---

## 7. How the council was run

A brief of about eighteen hundred words, written from the repository, named
the three decisions, the hard constraints, and the files each lens would need
by path and line. Each seat read the brief and its files and wrote its
opinion in the same six part shape: the lens, the three decisions with
rejected alternatives, the search, and one veto. The opinions were read
together, the convergences taken as rulings, the splits decided with the
reason written here, and the whole built the same day. The seat papers were
working documents and are not in the repository; this record is.

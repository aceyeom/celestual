# What goes on the wall, and what does not

The wall at `/berkeley` is a public surface about people who did not ask to be
on it. That one fact decides most of what can be added to it, and this document
writes the decision down once so it does not have to be re-argued every time
somebody has a good idea. It is the gate a proposal goes through before it is
built, the record of the proposals that have been through it, and the short
list of what the wall actually needs next.

It reads against three things that already exist and are not restated here:
`app/src/wall/README.md`, which is what the wall is and the two rules it
follows from; `docs/PERSONAS.md`, in particular the Target, who is a
stakeholder with a veto and never a customer; and `design/DESIGN.md`, whose
three rules and ban list apply to anything drawn.

---

## 1. Why a framework, and not a backlog

Every feature on a social product earns its place by the same three moves:
show people what is getting attention, let them react to it, and let them carry
it somewhere else. Those moves work. They are also, on a wall of anonymous
letters about named students, the exact machinery of a pile-on, and a campus
product that grows a pile-on is a campus product that is over by the end of the
semester, with the founders' names on the story. Yik Yak died of it twice.
Facemash was shut down in a week. The failure mode is not a bad feature; it is
a good feature on the wrong object.

So the question is never "would this be engaging". The wall is not here to be
engaging. It exists to do three things, in this order, and a feature is
weighed only against them:

1. **In four seconds, off a flyer, show that other people already did this.**
2. **Get a letter written.**
3. **After the letter, open the one door into the product.** The tab at the
   foot of the wall, `get notified if they put you up too.`, is the whole
   reason the wall exists. The letters are the argument for the product; the
   wall is not the product.

The product framework says the same thing from the other side: compulsive
checking is not a goal, engagement metrics buy nothing the business model needs,
and every number shown to anybody is exactly true or absent
(`docs/ULTIMATE-PRODUCT-FRAMEWORK.md`, Part 0 point 5, Part 6 point 2).

---

## 2. The gates

Nine questions. A proposal is put through all nine, and a **no** on any one of
them is the answer. There is no weighing a no against how much the feature
would buy, because each gate protects somebody who cannot be asked.

| | The gate | The question | Who it protects |
| --- | --- | --- | --- |
| G1 | **The subject's veto** | Does it add to what is said, shown, scored or inferred about a person who did not agree to be here? Their name and the count against it are already public, by the wall's first rule, and that is the whole of their exposure. Anything that ranks them, compares them, times them, or draws more attention to them than a letter does is new exposure they never agreed to. | the Target |
| G2 | **Silence in, silence out** | Does it tell anybody that a specific person did something, or tell a specific person that something was done about them? Who read, who hearted, who searched, whether the subject has seen their letters, that a letter exists for you. Counts only, never names, and never a nudge aimed at one person. This is the line the FTC took NGL apart for, and a true nudge is still a nudge. | the Target, the reader, the product |
| G3 | **Anonymity is structural** | Does it open a second channel from the wall back to the writer, or give a writer a way to be recognised by behaviour? A reply, a thread, a signature, a habit, a colour only they use, a face only they have. The author is absent from anything the browser can reach, and every letter is made of the same parts. A paper chosen from a short menu every writer shares is a choice, not a signature; a paper only one writer could produce is a signature (the ruling on customisable letters, below). | the writer |
| G4 | **The screen covers it** | Can every word or picture it adds go through the same three layers a letter does: the list at the keyboard and on the server, the classifier after it is up, and a person at the desk? Anything the list cannot read is a hole the size of the feature. Today the list reads text and nothing else. | the Target, the campus |
| G5 | **A door, not a room** | Does it make the wall somewhere to stay rather than somewhere to pass through? A feed to scroll, a thread to return to, a reason to check back. Every minute spent on the wall that is not reading, writing, or taking the tab is a minute taken from the product the wall exists to fill. | the product |
| G6 | **A fact, never a race** | Does it turn a number into a contest? The count against a name is a fact and it is public. A rank, a chart, a "most", a "trending", a velocity, a weekly winner, a number one: each of those is the same count with a finish line drawn on it, and a finish line is something a group of friends with three campus addresses can run at. | the Target, the wall |
| G7 | **Drawn, rationed, one bright thing** | Is every mark it adds drawn from the system's own numbers, does it spend the accent at most once, and does it leave the paper as the one bright thing? Emoji are on the ban list. A downloaded glyph, a catalogue of pictures, a second bright surface, a second saturated colour: no. | the design |
| G8 | **Off is cheaper than on** | Does getting a letter down, or a name off, stay as cheap as it is now, and does nothing it adds outlive a takedown? One tap takes a letter off the wall. If a feature has carried that letter somewhere the tap cannot reach, the tap is a lie. | the Target |
| G9 | **The desk can carry it** | Does it multiply what a person at the desk has to read? The desk is one person. A feature that adds a kind of content adds a queue, and a queue nobody reads is a queue where the harm lives. | the operator, the Target |

**Two things already stand at the edge of G1 and G6, and stay there.** The
search opens on the six names written to most, and the hive draws a disc
larger for a name with more letters. Both are the count as a fact, drawn once,
without a rank, a number beyond the count itself, a time window or a label. That
is the rule that keeps them on the right side of the line, and it is the rule
any extension of them would break: no ordinal, no "most" in the ear, no
arrow, no "this week". If either ever reads as a chart, it comes off.

---

## 3. The attacks, named

The gates are abstract. These are the concrete things somebody will try, so a
proposal can be checked against each one by name.

| The attack | What it looks like | What stops it today | What would make it easy |
| --- | --- | --- | --- |
| **The pile-on** | twenty people write to one name in one night. Some of it is warm, some of it is not, and the name is the biggest disc on the wall by morning. | nothing on the receiving side. The limit is per writer: three letters in any five days, from a campus address. | anything that rewards the biggest disc: a leaderboard, a trending list, a share that spreads "look at @them". |
| **The leaderboard** | the wall becomes a list of who is most written about, most hearted, or rising fastest. It is a hotness ranking of named students, and it is the Facemash lineage. | the index is ordered by recency, not weight; the search shows six names without ranks; hearts are on letters and never summed per name. | any sort by attention, any per-name total of hearts, any "top" surface. |
| **The unmasking** | a reader works out who wrote a letter: from a reply, a habit, a style, a paper nobody else has, the time it went up beside a class schedule. | the author exists nowhere the browser can reach, letters carry the same fields and no author, and a letter's paper is one of a short menu that every writer shares (0055): the menu is the mask. | comments and replies, a signature, a colour a writer typed, a picture, a face uploaded, a visible timestamp finer than "3 weeks ago". |
| **The proxy notification** | the wall never tells a subject a letter exists, so somebody else does it for the wall: a share card that says "someone wrote to @you", a button that sends the letter to them. | the wall makes no object with a subject's handle on it that is meant to leave the wall. | any shareable that carries the handle; any "send this to them". |
| **The picture** | a photo of the subject, a screenshot of a DM, a meme carrying a slur, a phone number or an address in an image, a QR code, a face of somebody under eighteen. | there are no pictures. The list reads text; the classifier reads text. | images, GIFs, stickers, drawings, any upload. |
| **The outside audience** | a letter leaves the wall and outlives its thirty days somewhere the tap cannot reach, in front of people who were never its readers. | letters lapse in thirty days, a report takes one down on the tap, a name comes off for good; a screenshot is the only way out, and it is not the wall's. | a first-party share of a letter. |
| **The self-pump** | a group writes to one of its own to make the name large, then to each other; or writes to a name to make it "trend". | a name's weight is a log of its count and tops out at seven letters, so the twentieth letter moves nothing; no surface rewards velocity. | trending, weekly charts, hearts per name. |
| **The desk flood** | more content than one person can read, so the flagged queue becomes the place harm waits. | one kind of content, screened before a person sees it. | every new kind of content. |

---

## 4. The proposals, weighed

| Proposal | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 | G9 | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| show which names are getting attention or likes | no | | | | no | no | no | | | **no** |
| a trending list | no | | | | no | no | | | | **no** |
| comments and replies | no | | no | | no | | | | no | **no** |
| more reactions, more emoji | no | | | | | | no | | | **no**. The heart stays the one mark |
| shareables: a letter | no | no | | | | | | no | | **yes**, by the owner's call on 23 September, over the no this row carried: `send` on every letter, a picture of its screen and its link. The ruling below says what it costs |
| shareables: the wall | | | | | | | | | | **yes**. The poster, as a card |
| a look for a letter: a colour from a menu, each carrying its own treatment | | | | | | | | | | **yes**, as a menu and never as an input. Migrations 0055 and 0058. The ruling below, which reverses the one it replaced |
| a colour a writer types, a picture on the card, an uploaded face | | | no | no | | | no | | no | **no**. Each is a signature, or a hole the list cannot read |
| GIFs, pictures, stickers | no | | | no | | | no | | no | **no** |
| the search as a field on the wall, under the ear | | | | | | | | | | **yes**. Unlit, a question and not a door. The council of 20 September |
| the search as a lit capsule at the centre | | | | | | | no | | | **no**. A second bright thing, on the faces |
| "leave your @ and we will tell you" at a search miss | | no | | | | | | | | **no**. A watcher list, and the notification by another name |
| share the wall from a search miss | | | | | | | | | | **no**, not there. It reads as "write to me". The card keeps its place after a letter |
| an incentive for being written about, or for sharing | | | | | no | no | no | | | **no** |
| a letter to a first name or nickname | | | | | | | | | | **yes**. Keyed so no handle can claim or empty it. Migration 0053 |
| a private @ stored beside a letter to a first name | no | no | | | | | | no | | **no**, plain or hashed. The @ is asked on the ping sheet, as the ping's target |
| the search hears names, accents and misspellings | | | | | | | | | | **yes**, over the public index only. Migration 0054 |
| a nickname table (Alex finds Alexandra) | no | | | | | | | | | **no**. An inference about a person, not a fact about a string |

What follows is the argument behind each row, because a table is a verdict and
not a reason.

### Attention, likes, and "which ones are getting attention"

The heart exists (migration 0042). It is a count on the letter's own foot, once
per person through the read gate, drawn in the paper's ink, and zero says
nothing at all. Nothing anywhere lists who hearted what, and nothing sums hearts
per name. That is the whole of what attention is allowed to be on the wall,
and it is right.

Every way of showing "which ones are getting attention" beyond that is a rank
of people. A heart count on the disc is a score on a person's face. A deck
sorted by hearts makes the wall about its most liked. A per-name total is a
leaderboard with the chart hidden. And the honest version of the request, "help
me find what is worth reading", already has the wall's answer: you look for a
name. The wall is a place where people are, not a list about them, and a
reader who arrives off a flyer is not browsing for the best letter; they are
looking for themselves, a friend, or the person they are about to write to.

One small thing would pass the gates and is not needed yet: under a name that
carries several letters, the deck could open on the most hearted rather than the
newest. That ranks letters about the same person, not people, and it costs the
subject nothing. Most names carry one or two letters, so it buys nothing today.
Recorded here so it is not re-invented as something larger.

### Trending

Trending is attention with a clock on it, which is the worst of both. On a
campus the size of one, "trending" is three letters in an hour, and three
letters in an hour is one friend group with three campus addresses. It is the
pile-on's reward and the self-pump's scoreboard, and it turns the count into a
race that can be run at a person.

The wall already carries the honest form of "what is moving", and it is not a
rank: the index is ordered by when each name was last written to, the newest
names sit at the centre of the tile, and a name that gains a letter rises in
place and sends a pulse through the crowd while everybody else holds their
seat. Recency is a fact about a letter. Trending is a claim about a person.
Keep the first; never build the second.

### Comments and replies

A comment on a letter is a second person speaking, in public, about somebody
who never agreed to the first. It is the room where pile-ons happen, it is the
channel through which writers get unmasked (a reply is a style, a habit and a
time of day), and it turns a letter into a thread and the wall into a feed.
It also multiplies the desk's reading by an order of magnitude, for content
that is about the letter rather than the person the wall exists to reach.

The one reply the wall should ever carry already exists, and it is private and
consented at both ends: the subject claims a letter with a verified handle
(`wall_claim`), asks the writer to reveal themselves (`wall_reveal_request`),
the writer says yes or no, and only a yes opens the sealed line
(`wall_letter_seal`). That is a dialogue between the two people a letter is
about, with nobody watching. Nothing else on the wall should talk back.

### More reactions, more emoji

Emoji are on the ban list (`design/DESIGN.md` section 10) and the reason is
not taste. Every reaction beyond the heart is a judgement that can be turned on
the subject: a laugh under a letter about somebody is a laugh at them, and a
skull, a pair of eyes or a "cringe" is ridicule with a count. The heart is the
one mark that cannot be pointed at a person, because a heart on "you gave me
your umbrella outside Wheeler" is warmth about the letter and nothing else.
Even a second warm mark dilutes it: two marks are a vote.

So the heart stays the tenth glyph, drawn on the icon set's grid, and the only
mark a reader leaves.

### Shareables

Two objects hide under one word.

**A letter, shared.** Shared with the subject's handle on it, it is the
notification the wall promises never to send, carried by proxy, and it is the
letter outliving its thirty days somewhere the report tap cannot reach. Shared
without the handle, as words on the wall's paper, it is a content object; and
the product framework is exact about who shares what: nobody shares as a
sender. A writer posting "I wrote this" to their own story is the humiliation
tax the whole design is built to avoid, and a reader posting somebody else's
letter is the outside audience. No.

**The wall, shared.** The flyer already is one: the title, the line and the
address. As a story card it is the door and nothing else, it carries no person,
it is the receiver-side object the framework says is the only public face,
and it reaches exactly the people the flyers cannot. `A wall of unforgettable
berkeley bears. anonymous letters to the one you never told.` and the address,
drawn on the void with the mark. Yes. It is the wall's one shareable, and it
is the same object printed and posted.

### Customisable letters, and to what degree

To the degree of a menu, and not one step past it. This ruling reverses the one
that stood here until 20 September, which said no to the card entirely, and it
is worth keeping both arguments in view, because the reversal is not a change
of mind about the gates. It is a change in what was proposed.

The old ruling was against customisation as an INPUT: a colour a writer types,
a face they upload, a doodle, a sticker. Each of those is a fingerprint, since
a colour only one person picks and a picture only one person has are a
signature by another name (G3); each is a thing the list at the keyboard
cannot read (G4); and each is a picture or a second bright surface (G7). That
ruling stands, on the row above, and it always will.

What is built (migrations 0055 and 0058, `app/src/wall/looks.js`) is a
LOOK, and as of 23 September it is one axis: the COLOUR a letter's screen is
lit in, one of thirteen, from a menu every writer on the wall shares, stored
as one slug and drawn by the browser. Every letter is the same phone screen
in the same face; a colour brings its own treatment with it (a lit LCD, the
negative, a poster's four inks, a riso's two drums, a xerox, and on a print
its own light), and what makes
one screen differ from the next is not the writer's at all: it is the
letter's own id (`quirks`), a tilt and a speck of dust nobody chose.

It was forty-two papers, twenty-nine colours and twenty-four faces, and
before that eight, twenty-three and twelve; nine and twelve when it shipped.
The count has moved six times and the reasoning below has not: what the
gates care about is that the menu is SHARED and CLOSED, not how long it is.
It got SHORTER on 23 September, which is the direction the ruling already
said the answer lies in: eighteen colours on one design meant every colour
was on a great many letters, and the combinations a regular writer could be
noticed by went from thirty thousand to eighteen. On 25 September five
prints left and it got shorter again, to thirteen in one pool (migration
0061 moved their letters to the colours nearest their hues). A print's
light came with that, and it is the colour's, not a second axis: a light
chosen apart from its colour would have multiplied the menu again.

Through the gates:

- **G3.** A look is a choice from a menu, the same menu for everybody, and
  the panel is a gallery of the whole of it: nothing about it is earned,
  bought, awarded or held back, so every paper on the wall is a paper anybody
  could have picked for the letter beside it. It is no more a signature than
  writing in lower case is. What would be one is a colour typed by hand or a
  face uploaded, and neither exists: the schema admits three slugs and
  refuses a fourth key, a colour and a sentence (`wall_look_clean`, and a
  constraint that holds every row to it).

  **And the menu is shorter than it was.** It grew to forty-two papers by
  thirty colour cells by twenty-four faces, about thirty thousand
  combinations, and the ruling said then that the next change to the menu
  had to argue how many letters each look would still carry. The screens
  answer it the easy way: one design, thirteen colours, so every colour is
  on a great many letters and none is a fingerprint. What makes two letters
  of one colour look different is the letter's own id, which is nobody's
  choice and so nobody's signature. **The next proposal to lengthen this
  menu still has to argue the same number, and the answer to a menu that
  has grown too long is to shorten it, never to let a writer add to it.**

  The line the old ruling drew holds exactly where it was drawn: a look may
  be chosen and never typed, drawn and never uploaded, and the menu is the
  product's to add to and nobody's to extend from a phone.
- **G4.** A look is structured, not written. The list and the classifier read
  every word they read before, the name and the body, and there is no new
  text for them to miss and no picture at all. The telegram sets its body
  upper case and the classifier still reads exactly what the writer typed:
  the case is a display rule and the row is the row.
- **G7.** Every part of a screen is drawn by the stylesheet or a canvas:
  the status glyphs are pixel grids in the source, the LCD's grid and moiré
  are repeating gradients, a print is an SVG filter over those, and the one
  face is a file served from this origin. Nothing is downloaded from anywhere.
  The one picture is the resolver's own picture of the ADDRESSEE, which the
  wall already drew beside every letter, now dithered into the screen's ink;
  a writer still cannot put a picture on a letter. The thirteen colours live
  in `looks.js` and design/DESIGN.md 2.5 fences them, and none of them is
  `--accent`.
- **G8.** The look is a column on the letter's row. A takedown takes it down
  with the letter, and nothing about it travels anywhere else.
- **G9.** The desk sees the slugs beside the row and reads nothing more.
- **G1, G2, G5, G6.** Untouched: a look says nothing about the subject, tells
  nobody anything, is chosen once while writing, and is not a number.

And the reason to build it at all: a letter is the one thing on the wall a
person makes, and the paper it is on is the first thing anybody sees of it.
The freedom the old ruling named, the words and the sealed line, is still the
whole of what a letter SAYS; the look is how it is dressed, and a menu of
dresses that everybody shares gives that freedom without giving anything away.

The line the ruling draws, for the next proposal: a look may be chosen and
never typed, drawn and never uploaded, the menu is the product's to add to and
nobody's to extend from a phone, and a proposal to lengthen it has to say how
many letters each paper will still carry.

### Sending a letter

The row above said no to sharing a letter, on G1, G2 and G8, and as of 23
September the owner has said yes: every letter's right soft key is `send`,
and it does what a phone's Send did — the share sheet with a picture of the
screen and the letter's link, the picture saved, or the link copied
(`app/src/wall/share.js`). What that costs, through the gates, so the call
is made knowing it:

- **G8** is the real one. A picture that has been sent is somewhere the
  takedown cannot reach, and one tap still takes the letter off the wall and
  its link to "that letter has come down", but not the picture. This was
  always true of a screenshot; a button makes it the easy thing rather than
  the deliberate one. What keeps it from being worse: the picture carries
  nothing the letter did not (no author, no reader, no count but the hearts),
  and a sealed letter sends as its stars, since the words are not in the
  page to be drawn.
- **G1.** A letter sent off the wall is more attention on the person it is
  about than a letter on it. The name travels with it, as it does on the
  wall.
- **G2.** Nothing is told to anybody: the send is not counted, logged or
  shown, and nobody learns their letter was sent.
- **G3, G4, G9.** Untouched: the picture is made on the phone that asked for
  it, from the row the page already had.

If this is revisited, the lever is G8: the picture could carry only the link
and no words, which would make the takedown true again.

### The search, the miss, and a letter to a first name

Ruled on 20 September by a council of six seats, recorded in full in
[THE-COUNCIL.md](./THE-COUNCIL.md). The short form, against the gates:

**The search on the wall.** A field under the ear, the glass in the place a
field paints its @, unlit. It passes every gate because it changes nothing
about what is said or shown about anybody: the same public index, reached
sooner. The lit capsule at the centre that was floated fails G7 twice: a
second bright thing beside `write`, and a plate standing on the faces, which
is the reason `write anonymously` came off the foot once already. The list
the search sheet opens on before anything is typed is the six names most
recently written to. It was the six carrying the most letters under `written
to most`, and with the search promoted to the first thing on the wall that
was the first list everybody saw: a top six by count with the word "most" on
it is the rank with a label this section's own edge case says the wall must
never cross. The caption `on the wall` that stood over those rows has gone
too — on the wall, under the wall's own field, over names the wall had just
answered with, it was three words to say where you already are.

**The miss.** `nothing on the wall under @x`, then `write a letter`, then,
quieter, `write to @x`. A fact about the index, the composer on its own first
question, and the letter to the name typed for the one who searched a
friend. The quiet line is left out only when the handle is one this browser
has itself proved through the DM code, which is the one fact about the
searcher the wall holds; nobody is asked "is this you" and nothing is
recorded. What is refused there, and why: a waitlist or "we will tell you"
(G2, and a watcher list indexed by identity); "yet" or "check back" (implied
activity, G5); an incentive (G6); a door to Main from a miss (pursuit, and
the wall's one door is the tab after a letter); and the share. The door card
is the wall's one shareable and it carries no person, and offered as the
answer to "nobody has written to you" it still reads as "please write to
me", which no confident person posts. It keeps the place item 2 below gives
it, after a letter.

**A letter to a first name.** The handle stays the default; one quiet line
under the field turns it into a name field. On the wall the letter is keyed
by a tilde and the folded name, `~sofia`, a string no handle can be, so
every Sofia shares one disc and no handle proof can claim, seal or empty it
(G8 holds: the report tap is unchanged, and only the desk shuts a name; an
opted out @sofia does not shut the first name, since they are not the same
person). Nothing about a handle is stored beside it, plain or hashed: a
hidden handle is a list of named people who cannot find their own entry by
the only key they own, the raw material for the notification the wall never
sends (G2), and a fact the report tap cannot reach (G8). The name passes the
same list as the body, at the keyboard and on the server, and the classifier
is told the addressee (G4). The paper is the same paper (G3). The resolver
is never asked about a name key, or a letter to Sofia would carry @sofia's
face (G1). Where the @ matters is the ping, and the ping sheet asks for it
there (`/berkeley/ping`): it lists the people this person wrote to by handle
and leaves a name out, and `who's on your mind.` over its field is the ask.
The ping is a sheet on the wall now and never a thing on the wall itself: a
person sees their own pings on their own account sheet (`/berkeley/you`) and
nobody else ever sees one (G2). A first name shared by forty people can gather forty letters in a
night, which is one more reason item 1 below counts name keys when it is
built.

### GIFs, pictures, stickers, "like Instagram"

No, and the comparison is the wrong one. Instagram is a broadcast surface
where the people in the pictures posted them. The wall is letters about people
who did not, and the mechanics that make a feed engaging are, one for one, the
mechanics that turn a wall about people into a pile-on. The design bar for the
wall is the concert poster and the journal, not the feed.

On their own terms, pictures fail three gates at once. The screen cannot read
them: a photo of the subject, a screenshot of a private message, a meme with a
slur in it, a phone number or a room number as an image, a face of somebody
under eighteen, all pass a text list unread. They are downloaded, from a
catalogue with a design of its own, onto paper that has one. And a picture of
a person on a wall about that person is a category of harm the product has no
answer to and should not acquire one.

---

## 5. What the wall does need

Ranked. Each passes the nine, and each is shaped so it stays inside them.

1. **A ceiling on what one name can receive.** Today's limit is on the writer:
   three letters in any five days. There is no limit on the receiving side, so
   twenty writers with one letter each is twenty letters to one person in a
   night, and the wall's own weighting puts that person at the centre of the
   glass. Add a per-name ceiling in `wall_write`, a handful a day (five, say),
   with the letter past it held `pending` for a person at the desk rather than
   refused, so a genuinely well-loved name still gets its letters and a pile-on
   gets a reader first. And a name that gathers two reports in a day goes on
   hold the same way. This is the one control the attack ledger says is missing,
   it is a few lines of SQL, and it protects the person the wall is least able
   to ask. Since 0053 a key can be a first name shared by many; the ceiling
   counts those keys exactly as it counts handles.

2. **The door, as a card.** The wall's one shareable, from section 4: the
   poster's title, line and address, drawn on the void with the mark, sized for
   a story, saved to the camera roll with the address ready to paste. Where the
   product already draws its open-door card is the model. It goes under the
   ear or on the tab, after a letter is up and never before, because a person
   who has just written is the person carrying the reason to share the door.

3. **The desk at scale.** The three layers hold if a person reads what the
   classifier is unsure of. As the wall grows, that person needs the flagged
   queue to sort by name so a cluster is seen as a cluster, a count of letters
   per name per day on the wall screen, and a report rate per name, so a
   pile-on is a line on a screen at the desk before it is a story on campus.
   This is tooling, not a feature, and it is what makes 1 real.

4. **A closed door for a name.** Between "report one letter" and "take my
   whole name off, forever" there is a middle a person will ask for: keep what
   is there, and let nobody write to me again. Behind the same Instagram proof
   as the takedown, reversible by the same person. It passes every gate and it
   is the one control on the subject's side the wall does not yet have.

5. **Under a name, the most hearted first.** Recorded in section 4. Not now.

Everything else on the list in the request is answered above, and the answer is
no. That is the framework working: the wall stays small on purpose, because
every feature it does not have is a feature that cannot be turned on somebody.

---

## 6. How to run the next proposal through this

1. Write the proposal in one sentence, naming the object it acts on: a letter,
   a name, a reader, a writer, the wall.
2. Put it through the nine gates in section 2, in order. Stop at the first no
   and write the no down in section 4's table, with the reason under it.
3. If it passes all nine, check it against every attack in section 3 by name,
   and write what stops each.
4. Then, and only then, weigh it against the three jobs in section 1. A feature
   that passes every gate and serves none of the three is still not built.
5. Add it to section 5 with its shape, or to section 4 with its no. Either way
   it is written down, so the next person with the same good idea reads this
   instead of building it.

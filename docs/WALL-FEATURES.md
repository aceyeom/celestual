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
   foot of the wall, `Get notified if they put you up too.`, is the whole
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
| G3 | **Anonymity is structural** | Does it open a second channel from the wall back to the writer, or give a writer a way to be recognised by behaviour? A reply, a thread, a signature, a choice of paper, a choice of face, a habit. The author is absent from anything the browser can reach, and every letter looks like every other letter. Uniform paper is a privacy feature. | the writer |
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
| **The unmasking** | a reader works out who wrote a letter: from a reply, a habit, a style, a choice of paper, the time it went up beside a class schedule. | the author exists nowhere the browser can reach, letters carry three fields and no fourth, and every letter is set on the same paper in the same face. | comments and replies, a signature, any customisation of the card, a visible timestamp finer than "3 weeks ago". |
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
| shareables: a letter | no | no | | | | | | no | | **no** |
| shareables: the wall | | | | | | | | | | **yes**. The poster, as a card |
| customisable letters | | | no | | | | no | | | **no** on the card. The words are the freedom |
| GIFs, pictures, stickers | no | | | no | | | no | | no | **no** |

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

To no degree on the card. The paper is the product's one bright surface and its
signature, and its uniformity is doing two jobs at once: it is the design, and
it is the anonymity. A handwriting face is a fingerprint. A choice of paper is
a habit somebody recognises. Colour is the one thing the system rations and a
coloured card spends it on every letter. Stickers and doodles are pictures, and
pictures are their own row below. A dateline finer than "3 weeks ago" or a place
line ("Doe, the third floor") is the room number the screen strips out.

The degree of freedom a writer has is the words, two hundred and eighty of
them, and the sealed line: up to ninety characters that only the person the
letter is for can ever open, with the writer's consent. That is a great deal
of freedom, and it is the only kind that cannot be used to find out who wrote
it.

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
   to ask.

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

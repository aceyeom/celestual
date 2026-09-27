# One wall: the rules of 25 and 26 September, and the contract they are built on

The owner's rulings of 25 September, the batch of 26 September that changed
several of them, and the one set of names the front end, the edge functions
and the database agree on. Anything that reads or writes a letter, a reply, a
proof or an alert under these rules follows this page.

The rules of 25 September are kept below as they were ruled, because the
record of a decision is worth more than a tidy page; where the 26th overruled
one, it says so under it, and the rulings of the 26th follow them.

## The rules

**One wall.** `/berkeley` is gone. Every letter, Berkeley's included, is on the
wall at `/`. The old addresses redirect: `/berkeley/<path>` → `/<path>`, `/beta` → `/`.
A letter's `campus` is no longer which wall it is on. It is the school it
carries.

**Posting: one composer, one choice.** The writer writes the note and picks
who it is for (an @, or a name). At submit there is one decision, framed as
how public the note is, never as which proof goes with which act:

- **Post on the Berkeley wall.** Public, and Berkeley students only when it is
  to an @, so it asks "confirm you're at Berkeley" (a berkeley.edu magic link,
  once per device). The letter carries `verified: true` and the Cal sticker.
  *Superseded on 26 September:* this is now `post as a Berkeley student`, one
  of three choices, and beside it `post on the wall` takes an @-note from
  anybody; and the letter carries Berkeley's network in its status row (`CAL`,
  the gold aerial and the star) where the die cut sticker stood over the
  battery.
- **Send privately.** Only they will ever know, and only if it is mutual, so it
  asks "confirm this is your Instagram" (the DM proof). It is a ping carrying
  the note as its card: they read it only if they send one back, and then
  both notes open at once. It needs an @.
- **Somebody not at Berkeley** can still post on the wall, to a name rather
  than an @. A name-only note needs no proof and always goes through
  moderation before it is published (the classifier first: a pass publishes,
  a review or no classifier waits for the desk, a reject never goes up). The
  writer picks a campus for it, or none, and it never carries the sticker.
  *Superseded on 26 September:* somebody not at Berkeley can write to an @ as
  well, on exactly these terms (read first, no school, never the mark), and
  a name note never carries the network mark.
- A name note can carry the person's @ as well (the nudge: without it there
  is a lower chance they end up reading it). With the @ it is an @-note, keyed
  to the handle, the custom name in its salutation.

Which schools may post to an @ is a flag on the campus (`handle_notes`), on
for `berkeley` alone. Any `.edu` still verifies as a proof for reading and
for alerts. *Since 26 September* the flag decides which school's letters go
up at once with the school's mark; anybody may post to an @ without one.
Reading needs no proof at all, and any `.edu` is what replying asks for,
unless the letter is to you.

Any `*.edu` domain proves a person and opens its campus (`berkeley.edu` →
`berkeley`, `cs.stanford.edu` → `stanford`), but only a campus with
`handle_notes` takes @-notes. A person proved at another school is answered
`campus`, and the composer offers the name instead.

**Sending privately is a ping** (`celestual_submit`) carrying the note as its
card: a card holds 280 characters and eighty words since 0063 (it was twenty
words), and is read by the same list as a letter's body (links, addresses,
phone numbers, street addresses, rooms, slurs); a caught card refuses the
ping with `{ recorded: false, error: 'card', reasons }` and places nothing.
The other side reads it whole on the mutual (`match_card.words`, and
`their_card.words` from `celestual_my_pings`).

**The salutation.** The `dear {name}` line is the writer's to edit: up to 40
characters, stored as `salutation`. With none stored, the line is
`dear {name}`. It goes through the same checks as the body.

**.edu verification.** A magic link, never a code. Verified once per device,
and the device's session is kept: sessions slide to a year on use. The
address becomes the alert email automatically. *Since 26 September* the same
link signs a person in by email (purpose `login`), and a link opened on a
device that did not ask for it asks for the number on the asking screen
(the contract, below).

**Instagram verification is ownership only.** It claims your own @. With it you
can:
- turn on "someone wrote about you" alerts
- remove a letter about you in one tap, with an undo
- take your name off for good
- ping and match (Main)

It no longer writes @-notes by itself. It still opens reading, as any proof does.
*Since 26 September* reading needs no proof, and the claim does one more
thing: the person a letter is to may reply under it, with no school address,
and shut or put away the replies (below). A person who signs in on another
device by any proof gets their @'s proof back from the session, with no
second DM (0065), but the DM is still the only thing that claims an @.

**Notifications,** by Resend, from `celestual <hello@celestual.us>`:
- a mutual-match alert: "it's mutual. you and @x both sent one. open it to read
  their note." (the last sentence only when a note waits). The note itself is
  never in an email
- "someone wrote you a letter", for a claimed @ that turned it on with a
  confirmed address, at most three a day
- every alert carries a one-tap removal link (for a letter) or a one-tap stop

## The rulings of 26 September

The owner's batch of 26 September, built in migrations 0065 to 0068, the new
edge function `celestual-wall-reply`, and new versions of three others
(`celestual-edu-verify`, `celestual-wall-moderate`, `celestual-admin`). Where
one of them overrules a rule above, that rule says so.

**Every letter is open, and reading only gets a nudge.** "Never hide or limit
how many letters a user can view. Only nudge them." It used to be eight whole
letters to any browser (0045, raised from five by 0049), counted by the
database, and then a ninth that arrived with every word struck out and one lit
key under it reading `read it`. That was a paywall with no price on it. Now
(0066) `wall_letters_for` and `wall_letter` hand every live letter's body to
anybody, proved or not, as many as they read. `wall_free_reads` is dropped with
its rows; the six `wall_free_*` functions stay and do nothing, so a read
restored from an older migration hands over every body rather than failing.
What is left of the door is a nudge (`app/src/wall/Nudge.jsx`): a small note
under the card, on the phone's unlit panel, shown only to somebody not signed
in, from the eighth letter this browser opens and then every twelve, with
`not now` remembered for three days and twelve letters. It is decided once, as
the letter's sheet opens, so the card never moves when it arrives. It says the
one thing a proof gets a reader that reading does not, and says it as the one
way it is true: `confirm your Instagram once and we'll email you, and only
you.`, over a key that opens the account on the Instagram DM and then asks
about the email. The report still asks for a proof (`wall_read_gate` is
unchanged).

**Anybody can write to an @, and it is read before it goes up.** "Allow
unverified users to write to a specific @." The composer's one question, how
public is it, has three answers for a letter to an @, in this order:

- **Post on the wall.** Anybody, with no proof: a device with no account gets a
  bare row. Public, and nobody sees who wrote it. It is read before it goes up,
  exactly as a name note is: a pass goes up, a review or no classifier waits
  for the desk at `pending`, a reject is written `rejected` and never shown.
  Open @-notes and name notes share one throttle, five a device and twenty an
  address a day. It carries no school and never the mark, since on an @-note
  the school is the proof, and a school beside an unproved @ would read as the
  mark without being it.
- **Post as a Berkeley student.** The path of 25 September: it asks for the
  berkeley.edu link, goes up at once, is read where it stands, is
  `verified: true`, and carries the Berkeley mark. Its way out, for somebody
  who is not at Berkeley, is `not at Berkeley? post it on the wall without the
  Berkeley mark.`, which posts the same letter to the same @, read first. It
  used to re-address the letter to a name.
- **Send privately.** Unchanged.

A name note offers the wall, with its school picker, and the private choice
dimmed until an @ is added. The draft keeps the choice as `proof`, so a draft
waiting on the Berkeley link posts with the mark wherever the link is opened,
and a draft held from before 0066, which has no `proof`, is the Berkeley kind.
While a letter waits for the desk its writer is told on the wall, `your letter
to X is being read.` and `it goes up once it passes.`; one the desk refuses, or
that lapses waiting, `didn't go up.`; and a refusal from the reading says what
to change (`app/src/wall/moderate.js` `whyNot`).

**The @ is never printed on a letter.** The letter's top row, the card while it
loads, the letters asleep either side of it in the deck, the composer's draft
and the shared picture all say `dear` and the writer's greeting, or the
resolver's first name for the @, or, with neither, `dear you`. The handle is
still the key: every letter is filed under it and `wall_search` still finds it
by it, typed with or without the @ and in any case.

**The Berkeley mark.** The die cut `CAL` sticker that sat over the battery is
gone. A letter from a verified Berkeley address is a phone on Berkeley's own
network, the way old phones named their carrier: in the status row, the aerial
lit in Cal gold, then `CAL` in the screen's own face and a seven pixel star,
with the date between them and the battery, and the battery never covered.
The whole phone carries two quieter signs in the same gold, a hairline round
the glass and a faint cast down the status band; a print strikes the name, the
star and the aerial in its palest ink, with no trim and no cast. A screen
reader hears one sentence, `written by a verified berkeley.edu student`. Off a
screen, on the composer and the verify page, the same row stands on a small
unlit plate (`Sticker.jsx`, which kept its name). A name note's school reads
`at UC Berkeley`, so it cannot be taken for the mark.

**Replies.** Every letter has a thread under it (0068, `celestual-wall-reply`,
`app/src/wall/Replies.jsx`), drawn under the phone in the phone's own language
and never on its screen, because the screen is the letter.

- **Who replies.** A person with a proved school address (any `.edu`, or an
  address on the desk's pass list), which is the accountability the @-notes
  keep; or the person the letter is to, proved by the Instagram claim, who
  needs nothing else. The recipient's replies carry a `recipient` badge and are
  the one thing on the thread lit in the letter's own colour. Somebody with
  neither is offered the school link under the thread, and, on a letter to an
  @, a quiet line asking whether the letter is to them.
- **Read before it is written.** The letters' list, then the rule that is the
  replies' own, that a reply names nobody else (no @, no word shaped like a
  handle, no full name), then the classifier, with two more names on its list:
  `third` (somebody other than the addressee named or pointed at) and `pile`
  (a reply that is only abuse aimed at the addressee), and a `pile` can only
  hold a reply, never refuse it. A pass goes up; a review, or no classifier,
  is held for the desk and shown to its writer alone; a reject is refused and
  kept for the desk. 280 characters. Forty replies a day, and six under one
  letter in ten minutes.
- **The recipient's say.** On any letter to their @ they can shut the replies
  (`stop new replies`: no new ones but theirs, the ones there stay) or put
  them away (`hide all replies`: nobody else sees the thread, and nobody
  replies, themselves included, until they open it again).
- **Reports.** Any device, once a reply. Three from three devices put a live
  reply out of sight until a person at the desk restores it or removes it; a
  report taken back brings the reply back, unless the desk has decided.
- **Anonymous to readers, not to the desk.** A thread never carries an author.
  Each writer is a creature on a small screen (`app/src/wall/avatars.js`:
  fifteen pixel creatures in the twelve colours' own inks, named `fond
  penguin` and the like), the same creature all the way down one thread and a
  different one under the next letter, because it comes from `who`, sixteen
  hex of a salted hash of the letter and the author. The desk sees who wrote
  each reply, because it has to be able to act on abuse.
- **The terms, once.** A person's first reply opens a sheet with the terms for
  replying, and agreeing is recorded on the server (`wall_reply_terms`),
  before the reply is read, so a first reply that is refused does not ask
  again.

**Hearts and likes are anybody's.** Likes are zero risk and add a lot of
interaction, so they are open to everybody. `wall_heart` takes any device
(0068): one the product has never seen gets a bare row and a session, so a
heart is still one per person, folded by a merge and gone with an erasure. A
like on a reply is the same.

**The filter.** "Add a filtering mechanism, to see only Berkeley, newest, most
liked, these kind of things. Make it clean." The field is looked at one of
four ways, kept for as long as the tab is: `all`; `newest`, the names written
to this week, newest first, and never fewer than the dozen newest; `most
liked`, the names whose letters carry a heart, most first, counting every heart
on every letter under the name the way each letter shows it; and `Berkeley`,
the names with a letter from a verified Berkeley address, the newest of those
first. It is a key at the end of the search strip, and its menu opens in the
strip's own panel. A filtered field is seated afresh, its first name in the
light, the deck turns through the names in the filter's order, and under a
name the letters follow it where it says something about letters (the most
hearted first, or the Berkeley ones first). It hides nothing inside a name.
The numbers are the server's (0067: `wall_index_all` gains `hearts`,
`berkeley` and `berkeley_at`).

**Signing in by email is our link.** The door's `continue with email` (0057)
ran on Supabase Auth: a code mailed from Supabase's own template, which on the
live project was undesigned and eight digits long, into a box that held six,
so nobody ever signed in that way. It is the product's own magic link now,
`celestual-edu-verify`'s `link` with the purpose `login` (0065): the address
signs the device that asked, and the device that opened the link, in as the
person who holds it, whoever proved it before by a login, a campus proof or a
google account. The Supabase template is deleted and the app no longer calls
Supabase Auth for email (Google still signs in through it).

**The number is typed, not printed.** 0064 showed a number from 10 to 99 on
the asking screen and printed the same number in the mail, so a careful reader
could tell their own request from somebody else's. That defended the careful
reader and nobody else, and a link confirms on whatever device opens it, so
anybody who could type somebody's address into the door and get them to tap
one link they never asked for was signed in as them: their @, their private
notes, their alerts. With `login` on every address, that was every account.
Now the number is on the asking screen and nowhere else. The link opened on
the device that asked confirms at once, as before; opened anywhere else, it
confirms nothing until the number on the asking screen is typed into the page
it opened, and a wrong number burns the link. A person who never asked has no
screen to read a number off, and the page tells them to close it.

**The @ comes back with the person.** A private note is read, placed and kept
with the DM flow's proof, which was minted in one browser and lived thirty
days, so a person who had DMd once and then signed in by email on a laptop was
asked for the DM again before their private notes would show. A signed in
session now gets that proof back from the server, for the verified @ its own
person already holds and no other (`celestual_session_handle_proof`, 0065).
The DM is still the only thing that claims an @.

## The contract

### `celestual-wall-moderate`, version 2

A request carrying `v: 2` follows the rules above. Without it the function
behaves exactly as before, so a tab still on the old build keeps working.

```
request  { v: 2, token, kind: 'handle'|'name', target?: 'handle', name?: 'Sofia',
           salutation?: string|null, look?: { tint }, campus?: slug|null,
           nonce: string /^[A-Za-z0-9_-]{8,64}$/, source?: string|null, body,
           proof?: 'edu'|'none' }
ok       { ok: true, id, status: 'live'|'pending'|'rejected', handle, kind, name,
           look, campus, school, verified, salutation, say? }
error    { ok: false, error: 'edu' | 'throttle' | 'salutation' | 'gate' | 'no_session'
           | 'removed' | 'name' | 'handle' | 'cap' | ... }
```

- `proof` (0066) says which kind an @-note is. `'edu'` is the Berkeley
  student's: it goes up at once and is read where it stands. `'none'` is the
  open one, anybody's: it is read before it is written, as a name note is, and
  can answer `pending` with `say` while the desk has it, or `rejected`. A
  request with no `proof` is `'edu'`, because that is what every @-note was
  before 0066 and what a tab on the old build means. A name note is always
  read first, whatever it says.
- `edu`: an @-note sent as `'edu'` from a device that is not edu-verified.
  Never an answer to `'none'`, except from a database without 0066, which has
  no open write and answers an open @-note as it would have then.
- `campus`: an @-note sent as `'edu'` from a device verified at a school whose
  campus does not take @-notes (not Berkeley). The composer offered the name
  instead; since 26 September it offers `post on the wall`.
- `throttle`: too many open notes (name notes and open @-notes, counted
  together) from this device or this address. It used to be name notes alone.
- The same `(author, nonce)` returns the first send's answer and writes nothing
  new, so a held draft that posts from two tabs is one letter.

### `celestual-edu-verify`, the link actions

The old `send` / `verify` code actions stay for old tabs.

```
link     { action: 'link', email, session, purpose: 'edu'|'alerts'|'login', campus?: 'berkeley' }
       → { ok: true, request, match, domain, campus, school }
       | { ok: false, error: 'email'|'domain'|'rate'|'send'|'taken' }
confirm  { action: 'confirm', token, session, match? }
       → { ok: true, purpose, request, campus, school, same_device }
       | { ok: false, error: 'invalid'|'expired'|'used'|'match'|'mismatch', purpose? }
status   { action: 'status', request, session }
       → { ok: true, verified, purpose, campus, school, expired }
```

- The link is `${SITE}/verify#t=<token>`. It works once and lasts 30 minutes.
- `match` is a number from 10 to 99, shown on the device that asked and
  nowhere else. It used to be printed in the email as well (0064), so a person
  could tell their own request from somebody else's before they tapped; that
  kept the careful reader safe and left everybody else one tap from handing
  their account to whoever typed their address. Since 0065 the mail never
  prints it: it says only that on another phone or computer the link asks for
  the number on the screen where you asked.
- **The number is typed on another device.** `confirm` from the session that
  asked needs no number and confirms at once. From any other session it needs
  `match`, the two digits typed off the asking screen: with none (or anything
  that is not two digits, which the function passes on as none) it answers
  `match` and spends nothing, so the page asks for the number; the right
  number confirms as before; a wrong one answers `mismatch` and burns the
  link for good, and the asking screen's `status` then reads `expired: true`
  and offers another. Every refusal about a link that exists names its
  `purpose`, so the page can say where to ask again. A person who never asked has no screen to read
  a number off, and the page tells them to close it.
- **A resend keeps its number.** A second link for the same address and
  purpose, asked from the same screen while the first is still pending and in
  its thirty minutes, carries the first one's number, so the screen shows one
  number and whichever mail is opened on another device takes it. It used to
  be a new number every time, and the older mail, the one that arrived late,
  burned on the number the screen was showing.
- With `campus`, the address must be at that campus's domain (or a
  subdomain) or on the pass list, else `domain`.
- `status` only answers the session that made the request.
- `confirm` for `edu` binds the address to the user of the session that asked,
  and to the session that clicked if it is a different one. It sets the campus
  up, and fills the alert email if it is empty.
- `confirm` for `alerts` confirms the alert email of the user that asked.
- `purpose: 'login'` (0065) takes any address, with no domain rule and never
  `taken`: a login moves the device onto whoever holds the address, it never
  refuses one. For a `.edu` address `link` answers `campus`, `school` and
  `domain` as an `edu` link does, and `status` its campus and school. `confirm` signs the
  session that asked, and then the session that opened the link, in as the
  person who holds the address (`celestual_user_bind_email_hash`): the one who
  proved it before by a login, as a campus address or as a google account.
  The device's own row is merged into them, the older surviving; where the two
  are two different people (different @s, campus addresses, google logins or
  proved login addresses) the device moves onto the one who holds the address
  and neither row changes. A `.edu` address proves its campus too, and the
  address fills an empty alert address. The mail says `tap to sign in.` and
  its key is `sign in`.

### The private send

A ping placed through the existing `celestual_submit` path (app/src/wall/pings.js,
api/celestual.js `placePing`), with the note as its card's `words`. The card
takes a note as long as a letter now: 280 characters, not twenty words. Since
26 September the ping sheet takes the same eighty words and 280 characters as
the composer; it stopped at twenty until then.

A private note is read, placed, kept and let go with the DM flow's proof. A
browser signed in by any proof whose person holds a verified @ gets that
proof from its session (`celestual_session_handle_proof`, below), so the
private notes show on a second device without a second DM.

### `celestual-wall-reply`, the replies (0068)

The one way a reply goes under a letter. Deployed with JWT verification on, as
`celestual-wall-moderate` is, and called the same way.

```
request  { token, letter, body, nonce: /^[A-Za-z0-9_-]{8,64}$/, accept?: boolean }
ok       { ok: true, id, status: 'live'|'held'|'rejected', recipient, say?, reasons?, replay? }
error    { ok: false, error: 'edu' | 'locked' | 'closed' | 'gone' | 'terms' | 'throttle'
           | 'caught' | 'empty' | 'long' | 'nonce' | 'no_session' | 'write', reasons? }
```

- The order: the same `(device, nonce)` answers the first send's answer with
  `replay: true` and reads nothing; then who may reply here; then the terms;
  then the list and the rule that a reply names nobody else; then the
  classifier; then the write, through `wall_reply_write`, which is the service
  role's alone and checks everything again.
- `edu`: neither a proved school address nor the person the letter is to.
  `locked`: the recipient shut the replies and this is not them. `closed`: the
  recipient put the replies away, which shuts them too. `gone`: the letter is
  not up.
- `terms`: this person has not accepted the terms for replying and did not
  send `accept: true`. With `accept`, the agreement is kept before the reply is
  read (`wall_reply_agree`), whatever the reading then says.
- `caught`: the list, or somebody else named, with `reasons`: the letters' own
  (`slur`, `url`, `email`, `phone`, `address`, `room`), `tag` for an @ or a
  word shaped like a handle, and `name` for a full name. `long` is over 280
  characters. `throttle` is forty a day, or six under one letter in ten
  minutes, and every reply that was read counts, so a refusal is not a free
  retry.
- `status: 'held'` carries `say`, `it's being read. others see it once it
  passes.`; `rejected` carries `say`, `it can't go up as it's written.`, and
  `reasons`. No classifier configured, or one that does not answer, holds.

### Database, read by the browser

- **`wall_index_all`** (view): `wall_index`'s columns, grouped by key alone
  (every campus). `campus` is the newest letter's, plus `verified`.
- **`wall_pulse_all()`**: `wall_pulse`'s answer, for every campus.
- **`wall_campuses_open()`** → `[{ slug, name, short, domain }]`: the open
  campuses, `global` excepted, for the name-only campus picker.
- **Letter objects** from `wall_letters_for`, `wall_letter`, `wall_mine` and
  `wall_search` gain `verified` (bool), `salutation` (text or null) and
  `school` (the campus's name, null for `global`). `wall_mine`'s gain `status`
  (`live`, `pending`, `rejected`, `removed`).
- **`wall_owner_remove(p_token, p_letter)`** → `{ ok, undo_until }`. The
  claimed owner of the letter's @ takes it down. This files no claim, so it
  shuts nothing else.
- **`wall_owner_restore(p_token, p_letter)`** → `{ ok }`, within 24 hours.
- **`wall_remove_by_token(p_token)`** → `{ ok, letter_id, undo_until }`, or
  errors `invalid`, `expired` (30 days) and `used`. The email's removal link.
- **`wall_restore_by_token(p_token)`** → `{ ok, letter_id }`, within 24 hours
  of the removal.
- **`celestual_alerts_get(p_token)`** →
  `{ ok, handle, claimed, email (masked), email_verified, wrote, mutual }`.
- **`celestual_alerts_set(p_token, p_wrote, p_mutual)`** → `{ ok }`, or errors
  `claim` (wrote needs a claimed @) and `email` (no confirmed address).
- **`celestual_alerts_off_by_token(p_token)`** → `{ ok }`.

What 26 September added and changed (0065 to 0068):

- **`wall_letters_for`, `wall_letter`** (0066): `body` on every live letter, to
  anybody, always, and `open: true`. Every key a letter carried is still
  there. The envelope no longer carries `gated` or `free`, which were the
  reader's place against the eight; a tab on the old build read them only for
  the seal's one line, and now reads a body on every letter and draws it
  whole.
- **`wall_write`** (0066) gains a thirteenth argument, `p_proof` (`'edu'` or
  `'none'`), written only by `celestual-wall-moderate`. The twelve argument
  write stands and is the `'edu'` path, so a function deployed before 0066
  writes what it always wrote.
- **`wall_index_all`** (0067) also carries, after every column it had:
  `hearts` (every heart on every standing letter under the name, the seeded
  and the pressed added, the number each letter shows, summed), `berkeley`
  (how many of the standing letters went up from a verified Berkeley address)
  and `berkeley_at` (when the newest of those did). Nothing a reader cannot
  count off the wall already; no author, no body, no heart's person.
- **`wall_heart(p_token, p_letter, p_on)`** (0068) needs no proof: any device,
  and one never seen gets a bare row and a session. It answers the same shape.
- **`wall_reply_thread(p_token, p_letter)`** (0068) →
  `{ ok, letter, state, count, recipient_replied, replies: [{ id, who,
  recipient, body, status, at, mine, likes, liked, reported }], me: { signed,
  recipient, edu, terms, who, can, why } }`, for anybody, about any live
  letter. Never an author: `who` is the salted hash. A live reply is
  everybody's; a held, hidden or removed one is its writer's alone; a closed
  thread shows nobody but the recipient anything (`count` 0). `state` is
  `open`, `locked` or `closed`; `why` is `edu`, `locked`, `closed` or `gone`.
- **`wall_reply_like(p_token, p_reply, p_on)`** → `{ ok, reply, likes, liked }`,
  any device, on a live reply in a thread that is not closed.
- **`wall_reply_report(p_token, p_reply, p_on)`** → `{ ok, reply, reported,
  hidden }`, any device, once a reply, never your own (`mine`). `p_on` false
  takes it back.
- **`wall_reply_thread_set(p_token, p_letter, p_state)`** → `{ ok, letter,
  state }`, `open`, `locked` or `closed`, for the recipient alone (`unverified`
  for anybody else).
- **`celestual_session_handle_proof(p_token, p_proof_hash)`** (0065) →
  `{ ok, handle }`, or errors `no_session`, `invalid`, `unclaimed`, `banned`
  and `rate`. The browser mints a secret and sends its sha256 with its
  session; when the session's person holds a verified @, the server writes the
  DM flow's proof for that @ under that hash (`verified_via = 'session'`,
  thirty days, sliding, a dozen an hour an @). It never claims an @.

The desk (`celestual-admin`, 0068): `desk_replies` (`status` `waiting`, the
held and the hidden together and the oldest first, or `held`, `hidden`,
`live`, `removed`, `rejected`, `all`), with who wrote each reply, and
`desk_reply_set` (`id`, `status` `live` or `removed`, `note`): `live` puts a
held reply up or a hidden one back and clears its reports.

### Addresses

| | |
| --- | --- |
| `/verify#t=` | the magic link: confirms, then posts the held draft if it is on this device. Since 0065 it also signs a person in (`you're in.`, with the way to the wall and to the private notes), and on a device that did not ask for the link it asks first for the number on the asking screen, two digits, and says `that number didn't match.` when it is wrong |
| `/r#t=` | the email's one-tap removal: takes the letter down on load, with an undo for a day |
| `/alerts#off=` | the email's stop link |

### Email links

| email | links |
| --- | --- |
| verify (a school address, an alert address, and since 0065 a login) | `/verify#t=` |
| wrote | read it `/letter/<id>`, remove it `/r#t=`, stop these `/alerts#off=` |
| mutual | open it `/reveal/<handle>`, stop these `/alerts#off=` |

## What the backend answers (builder B, migrations 0062 to 0064)

The contract above, as built, and every place it says more than the contract
did. Nothing here removes or renames anything above.

### `celestual-wall-moderate`, version 2

- Errors beyond the list: `campus` (a proved address at a school without
  `handle_notes`), `nonce` (missing, or not `/^[A-Za-z0-9_-]{8,64}$/`), `empty`
  (no body), `write` (the database refused; HTTP 500). `edu` is also the answer
  for an @-note from a device with no session at all (sent as `'edu'`, since
  0066; an open one gets a bare row, as a name note does). `salutation` is a dear line
  over forty characters, or one the list catches (with `reasons`). `cap` carries
  `limit`, `used`, `left` and `resets_at`, as in version 1.
- The answer to a repeated `(device, nonce)` is the first answer plus
  `replay: true`.
- `status: 'rejected'` carries `reasons`. `say` is set on `pending` ("it's being
  read. it goes up once it passes.") and `rejected`. Since 0066 an open @-note
  can answer either, as a name note always could; a verified one answers
  `live`, and is taken down after if the reading refuses it.
- `campus` on the request is only read for a name note; an @-note's campus is
  the writer's school. A pass (0043) writes @-notes from the picked campus if it
  takes them, and Berkeley otherwise.
- A letter that goes up nudges Realtime on `wall:global` and on
  `wall:<campus>` (event `moved`), so the one wall hears it.

### `celestual-edu-verify`

- `link` also takes `campus?` (a slug: the address must be at that campus's
  domain or under it, or on the pass list, else `domain`) and `draft?` (default
  true: false words the mail for a proof with no letter waiting). It errors
  `session` when the session token is missing.
- `link`'s `domain` is the school's registered domain (`stanford.edu` for
  `cs.stanford.edu`), and `campus` / `school` are the campus the address will
  open, named before it exists. For a passed address that is not a school's,
  `domain` is null.
- `confirm` can also error `taken` (the asking person already holds a
  different campus address). A second `confirm` from the device that confirmed
  is answered again rather than `used`.
- `status` also answers `expired`. Since 0065 a link burned by a wrong number
  (`refused` on the row) reads as `expired` too, so the asking screen says the
  link ran out and offers another.
- Since 0065 `link` answers the number the database kept, which on a resend
  from the same screen is the first link's (the contract, above).

### Database

- `wall_index_all` also has `school` (the newest letter's school, null on the
  root).
- `wall_campuses_open()` answers `short` as the name when no short word is set.
- `wall_search` rows carry `verified`, `school` and `salutation` (the newest
  standing letter's), and read `wall_index_all`, so a key is one row.
- `wall_mine` letters also carry `campus`. A letter its owner took down reads
  `down_by: 'report'`, as a claim always did, which tells the writer nothing
  about who.
- `wall_owner_remove` errors `no_session`, `gone` (not up) and `unverified` (not
  the claimed owner, or a name note). Twice is ok. `wall_owner_restore` errors
  `no_session`, `unverified`, `gone` and `expired`.
- `wall_remove_by_token` can also error `gone` (the letter was already down, by
  another hand). `used` carries `letter_id` and `undo_until`, so the page can still
  offer the undo on a reload.
- `celestual_alerts_off_by_token` answers `{ ok, scope }` (`wrote` or `mutual`:
  a stop link stops the kind of mail it came in) and errors `invalid` and
  `expired` (a year). Pressed twice, it answers ok twice.
- `celestual_alerts_set` treats a null as "leave it", and answers
  `{ ok, wrote, mutual }`. It errors `no_session` too.
- `celestual_alerts_get` errors `no_session`.

### Mail

Every mail is `_shared/mails.ts` on `_shared/mail.ts`, from
`celestual <hello@celestual.us>`, with a stop link and `List-Unsubscribe`
(https and mailto, and one click). The mutual mail goes to the person's
confirmed alert address when they have one, else to the address they left on
the ping, as before. The letter alert waits for the screen's reading, so a
letter the screen takes down is never mailed about; at most three a day, never
to the person who wrote it.

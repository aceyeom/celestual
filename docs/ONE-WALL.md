# One wall: the rules of 25 September, and the contract they are built on

The owner's rulings of 25 September, and the one set of names the front end,
the edge functions and the database agree on. Anything that reads or writes a
letter, a proof or an alert under these rules follows this page.

## The rules

**One wall.** `/berkeley` is gone. Every letter, Berkeley's included, is on the
wall at `/`. The old addresses redirect: `/berkeley/<path>` → `/<path>`, `/beta` → `/`.
A letter's `campus` is no longer which wall it is on. It is the school it
carries.

**Posting.**
- An **@-note** (a letter to an Instagram handle) needs a verified **.edu**
  address, asked for at submit, after the note is written ("confirm you're at
  Berkeley"). Any `*.edu` domain proves a person and opens its campus (`berkeley.edu`
  → `berkeley`, `cs.stanford.edu` → `stanford`), but only a campus with
  `handle_notes` takes @-notes, and on 25 September that is **Berkeley alone**
  (owner, later the same day). A person proved at another school is answered
  `campus`; they can still write to names. The letter carries `verified: true`,
  and the wall draws the school's sticker on it (Berkeley's is a Cal sticker).
- A **name-only note** needs no proof. It always goes through moderation
  before it is published: the classifier reads it first, and it publishes on a
  pass, waits for the desk on a review (or when no classifier is configured),
  and never goes up on a reject. The writer picks a campus, or none. It never
  carries the verified sticker.
- A name-only note can carry the person's Instagram @ as well. With the @ it
  is an @-note (keyed to the handle, the custom name in its salutation) and
  follows the @-note rule.
- **Two ways to send, one choice at submit** (owner, later on 25 September):
  "post on the Berkeley wall" (public; an @-note needs "confirm you're at
  Berkeley") or "send privately" (only they'll know, only if mutual; needs
  "confirm this is your Instagram"). **Sending privately is a ping**
  (`celestual_submit`) carrying the note as its card: a card holds 280
  characters and eighty words since 0063 (it was twenty words), and is read by
  the same list as a letter's body (links, addresses, phone numbers, street
  addresses, rooms, slurs); a caught card refuses the ping with
  `{ recorded: false, error: 'card', reasons }` and places nothing. The other
  side reads it whole on the mutual (`match_card.words`, and `their_card.words`
  from `celestual_my_pings`).

**The salutation.** The `dear {name}` line is the writer's to edit: up to 40
characters, stored as `salutation`. With none stored, the line is
`dear {name}`. It goes through the same checks as the body.

**.edu verification.** A magic link, never a code. Verified once per device,
and the device's session is kept: sessions slide to a year on use. The
address becomes the alert email automatically.

**Instagram verification is ownership only.** It claims your own @. With it you
can:
- turn on "someone wrote about you" alerts
- remove a letter about you in one tap, with an undo
- take your name off for good
- ping and match (Main)

It no longer writes @-notes by itself. It still opens reading, as any proof does.

**Notifications,** by Resend, from `celestual <hello@celestual.us>`:
- a mutual-match alert: "it's mutual. you and @x both sent one. open it to read
  their note." (the last sentence only when a note waits). The note itself is
  never in an email
- "someone wrote you a letter", for a claimed @ that turned it on with a
  confirmed address, at most three a day
- every alert carries a one-tap removal link (for a letter) or a one-tap stop

## The contract

### `celestual-wall-moderate`, version 2

A request carrying `v: 2` follows the rules above. Without it the function
behaves exactly as before, so a tab still on the old build keeps working.

```
request  { v: 2, token, kind: 'handle'|'name', target?: 'handle', name?: 'Sofia',
           salutation?: string|null, look?: { tint }, campus?: slug|null,
           nonce: string /^[A-Za-z0-9_-]{8,64}$/, source?: string|null, body }
ok       { ok: true, id, status: 'live'|'pending'|'rejected', handle, kind, name,
           look, campus, school, verified, salutation, say? }
error    { ok: false, error: 'edu' | 'throttle' | 'salutation' | 'gate' | 'no_session'
           | 'removed' | 'name' | 'handle' | 'cap' | ... }
```

- `edu`: an @-note from a device that is not edu-verified.
- `throttle`: too many name-only notes from this device or this address.
- The same `(author, nonce)` returns the first send's answer and writes nothing
  new, so a held draft that posts from two tabs is one letter.

### `celestual-edu-verify`, the link actions

The old `send` / `verify` code actions stay for old tabs.

```
link     { action: 'link', email, session, purpose: 'edu'|'alerts' }
       → { ok: true, request, match, domain, campus, school }
       | { ok: false, error: 'email'|'domain'|'rate'|'send'|'taken' }
confirm  { action: 'confirm', token, session }
       → { ok: true, purpose, request, campus, school, same_device }
       | { ok: false, error: 'invalid'|'expired'|'used' }
status   { action: 'status', request, session }
       → { ok: true, verified, purpose, campus, school }
```

- The link is `${SITE}/verify#t=<token>`. It works once and lasts 30 minutes.
- `match` is a number from 10 to 99, shown on the device that asked and printed
  in the email. It is how a person tells their own request from somebody
  else's.
- `status` only answers the session that made the request.
- `confirm` for `edu` binds the address to the user of the session that asked,
  and to the session that clicked if it is a different one. It sets the campus
  up, and fills the alert email if it is empty.
- `confirm` for `alerts` confirms the alert email of the user that asked.

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

### Addresses

| | |
| --- | --- |
| `/verify#t=` | the magic link: confirms, then posts the held draft if it is on this device |
| `/r#t=` | the email's one-tap removal: takes the letter down on load, with an undo for a day |
| `/alerts#off=` | the email's stop link |

### Email links

| email | links |
| --- | --- |
| verify | `/verify#t=` |
| wrote | read it `/letter/<id>`, remove it `/r#t=`, stop these `/alerts#off=` |
| mutual | open it `/reveal/<handle>`, stop these `/alerts#off=` |

## What the backend answers (builder B, migrations 0062 to 0064)

The contract above, as built, and every place it says more than the contract
did. Nothing here removes or renames anything above.

### `celestual-wall-moderate`, version 2

- Errors beyond the list: `campus` (a proved address at a school without
  `handle_notes`), `nonce` (missing, or not `/^[A-Za-z0-9_-]{8,64}$/`), `empty`
  (no body), `write` (the database refused; HTTP 500). `edu` is also the answer
  for an @-note from a device with no session at all. `salutation` is a dear line
  over forty characters, or one the list catches (with `reasons`). `cap` carries
  `limit`, `used`, `left` and `resets_at`, as in version 1.
- The answer to a repeated `(device, nonce)` is the first answer plus
  `replay: true`.
- `status: 'rejected'` carries `reasons`. `say` is set on `pending` ("it's being
  read. it goes up once it passes.") and `rejected`.
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
- `status` also answers `expired`.

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

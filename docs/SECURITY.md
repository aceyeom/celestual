# CELESTUAL — security & privacy model

Celestual lets someone place a one-way "ping" at @them and only ever reveals
anything when it is **mutual**. Because a person can name a **non-consenting
third party**, the whole design is built to leak nothing about who pinged whom —
and, since migration 0006, to make the stored data itself unreadable. This
document is the source of truth for that model; code comments reference its
`§` sections. The product rationale lives in
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) (esp. Part 6).

## Threat model in one line

The dangerous capabilities are: *"enter a handle that isn't mine and learn
something about them"* and *"read the map of unrequited longing out of the
database."* Every control below exists to make both worthless.

## The controls

### §1 — No client access to the data
All tables (`celestual_entries`, `celestual_keepsakes`, `celestual_matches`,
`celestual_notifications`, `celestual_ping_spends`,
`celestual_attempts`, `celestual_suppressions`, `celestual_placements`,
`celestual_members`, `celestual_handle_links`, `celestual_ig_verifications`,
`celestual_recovery`, `celestual_relogin_tokens`, `celestual_settings`,
`celestual_communities`, `celestual_community_members`, `celestual_campuses`,
`celestual_campus_prereg`, `celestual_campus_mail`) have **RLS enabled with zero
policies**, and all privileges are revoked from `anon`/`authenticated`. The
browser literally cannot `select` from them. The only entry points are the
`SECURITY DEFINER` RPCs (`celestual_submit`, `celestual_withdraw`,
`celestual_renew`, `celestual_mutual_again`, `celestual_mutual_forget`,
`celestual_ping_status`, `celestual_my_pings`,
`celestual_slots_for`, `celestual_suppress`, `celestual_link`,
`celestual_set_worlds`, `celestual_world_counts`, `celestual_campus`,
`celestual_campus_preregister`, `celestual_start_ig_verification`,
`celestual_poll_ig_verification`, `celestual_bind_recovery`), which return only
small status objects — never other people's rows. Internal helpers
(`celestual_group`, `celestual_hash_handle`, `celestual_is_member`,
`celestual_consume_ig_proof`, `celestual_ig_required`, `celestual_client_ip`,
and since 0072 `celestual_place`, `celestual_mutual_keep` and
`celestual_keepsake_forget`)
and the operator / service-role paths (`celestual_complete_ig_verification`,
`celestual_relogin_store`, `celestual_relogin_redeem`, `celestual_campus_reveal`,
`celestual_purge_expired`) are **not** granted to clients.

### §2 — Hashed shadow data (the 0006 centerpiece)
The server stores **who a ping points at only as a salted SHA-256 hash**
(`to_hash`; salt in `celestual_settings`, never client-visible). Matching runs
hash-to-hash, group-aware. Consequences, by design:

- A database dump cannot read anyone's targets. The plaintext exists only on
  the sender's own device (localStorage) — and, once mutual, as
  `matched_handle`, which both people already know.
- The status page works by the device sending its own plaintext list up
  (`celestual_ping_status`, owner-proof-gated, capped at 10) and getting state
  back; the server cannot produce the list itself.
- Cross-device restore (`celestual_my_pings`) returns named rows only for
  mutual pings; unmatched pings restore as anonymous standing rows. This is a
  feature, not a gap.

**Corrected 29 September: the bullets above are the design of 0006, and they
stopped being true in 0010.** Since 0010 `celestual_entries.to_handle` keeps
the normalised target in plaintext beside the hash, so a person's notes
restore BY NAME on any device they verify on (`celestual_my_pings` names
every row, running, not this time and mutual). Matching and suppression
still run on the salted hash, and the plaintext is never returned to anybody
but the note's own sender behind their proof, but a database dump does read
who each running note is to, and the renewal mail could name one (none does:
§mail). The row goes with the note: let go, erased, or swept a week after it
was not this time. Read the bullets above with that in mind.
- The opt-out registry (`celestual_suppressions`) is itself hashed.
- The renewal email can name no handle — the server doesn't know one.

### §3 — The two-slot rule + the sixty-day lapse
A person holds at most **3 standing (unresolved, unlapsed) pings**, counted
across their identity group. Each ping stands **60 days**, then lapses;
`celestual_purge_expired` (run hourly by celestual-remind) deletes lapsed
unmatched rows entirely — retention minimisation doing legal work (GDPR/PIPA)
as well as product work. Renewal is free and one tap (`celestual_renew`).
Retiring ("let it go", `celestual_withdraw`) frees the slot immediately.

Because retiring now frees the slot, enter→peek→retire cycling is bounded by a
**placement cadence cap**: at most **6 new placements per rolling 30 days**
per handle (`celestual_placements`), on top of the hourly rate limits. Honest
use never feels it; a sweep trips it fast.

**Since 0071 (pings by the week)** the standing slots are gone: one free ping
a reveal, more bought, ten at most, and letting a note go gives its ping
back. A bought ping has to be spendable, so the cadence cap above is gone
too, with nothing in its place but the hourly limits (§4). What made the cap
necessary was the one bit a placement answered at once, `reachable` (§5):
with the ping given back, send, read, let go could be run without end. So
the bit is answered only of a pair already told, and a note sent and let go
before its reveal learns nothing a single note would not (a sealed pair
answers as an unanswered one, 0069). docs/PINGS-BY-THE-WEEK.md section 8.

**Since 0075 (a night that was not mutual) a note costs a ping only when it
is mutual.** Every ping a Saturday held for a note that was not mutual comes
back at the night: a bought one on hand, a free one as one extra free ping
for the week after, at most one a person a week across their linked @s, so
it cannot compound (docs/PINGS-BY-THE-WEEK.md section 9). That makes a note
free to send whatever it learns, which is why nothing it learns may be a bit
about the other person: the night's answer (`celestual_my_pings`' `cost` and
`returned`) is read only off the sender's own ledger and whether the pair was
told, and is the same, byte for byte, whether the other person never wrote,
wrote and let go before the night, or is not reachable here
(scripts/sql/test-pings-by-the-week.sql section 11d). The settlement is not
conditioned on membership, since a refund that depended on it would itself be
the bit.

### §4 — Rate limiting
`celestual_submit` enforces trailing-hour caps: **per-IP (40/hr)**,
**per-`from` handle (20/hr)**, **per-target (60/hr, compared by hash)**.
Attempt logs store the target hashed and are pruned on a rolling ~2-hour
basis. `celestual_suppress` is rate-limited per IP (10/hr) against mass-wipe
griefing and, since 0039, takes the DM proof, so a refusal costs the same
quota as a real opt-out and says nothing about the name; since 0046 it also
reaches the wall, taking every letter written ABOUT the handle down on every
campus and shutting the name to future writes (the letters written BY it
already went with the identity row's cascade); verification starts
are capped per IP and per handle. Since 0009 the
"per-IP" identity comes from `celestual_client_ip()`, which prefers
`cf-connecting-ip` (written by Cloudflare itself — a client cannot forge it)
over the spoofable first `x-forwarded-for` hop, so rotating fake XFF values no
longer resets the caps. The edu-verify edge function uses the same preference
order.

### §5 — Loop A's one bit, anti-scan
After (and only after) placing a ping, the sender learns whether the target is
**reachable** (has ever verified — `celestual_members` — and hasn't opted
out). Membership is the flattering receiver-side identity; still, it's a bit,
so it is guarded: no lookup without a placed ping, three slots, the cadence
cap, and the hourly limits make enumeration cost slots, time, and identity.
**Since 0071 the bit is not answered before the reveal at all**: a placement
and `celestual_ping_status` say `reachable` only of a pair already told, where
it is true by definition. Before the night a note says nothing about whether
its @ has an account, which is what lets a note be sent and let go for
nothing (§3).
`celestual_ping_status` returns reachability only for targets the caller has
actually placed.

**And it is never answered for a note that was not mutual (0075, the owner's
ruling of 29 September).** The owner asked what happens when the other person
is not on celestual. The ruling is that nobody is ever told whether they are:
the wall says, on the night, that they didn't send one by saturday 9pm or
aren't reachable here yet, and that celestual never says which, on purpose.
Two reasons, either enough. Every ping of a night that was not mutual now
comes back, so a bit answered at the night would be a free lookup of ten @s a
week, the scan this section exists to prevent. And the answer would say
something about a person who has agreed to nothing: that they are here and
did not write back is a fact about them, told to somebody else. 0071's header
said `reachable` was "answered at the reveal and not before"; no code ever
answered it for a note that was not mutual, and none does now. It is said
only of a pair already told, where both already know.

### §suggest — What a typeahead may list (0040)
The wall's search and composer suggest names as a person types. They read
`wall_index`, which is public by design (§campus), and join the resolver's
display name and face onto the names already on it. The resolver's cache
(`ig_profiles`) is never listed on its own: it is the set of handles people
have pinged, and listing it by prefix would enumerate ping targets. Main's
front door suggests nothing about anybody else for the same reason; it peeks
the cache only for a handle typed in full. The line is in the migration and in
`docs/HANDLE-RESOLVER.md` §10.

### §verify — Handle-ownership verification (Instagram DM)
Load-bearing since 0004: a one-time 4-digit code DM'd to `@celestual.us`; Meta's
authenticated sender identity (relayed by ManyChat's External Request — setup in
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) — or the direct Meta webhook — see
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md)) decides who is verified. The
browser mints a 256-bit proof, stores only its hash server-side, and presents
the raw proof at placement; `celestual_consume_ig_proof` makes the server the
authority. **No match can fire to an unverified claimant** — the impersonation
fix the framework calls non-negotiable (§6.5). Gated by
`celestual_settings.require_ig_verification`; with it on, the proof also gates
`celestual_ping_status`, `celestual_my_pings`, `celestual_slots_for`,
`celestual_renew`, `celestual_set_worlds` and `celestual_campus_preregister`.

**The code is a pure correlation id (0012).** Identity is *never* a typed claim:
the 4-digit code only links "this incoming DM" ↔ "this browser session", and
whoever DMs a live code is verified as *that* Meta-authenticated account, which
the site then adopts. This removes the entire `handle_mismatch` class (a typo or
a second logged-in account used to dead-end at "that code was started for a
different @") and is strictly *more* secure — you can only ever verify the
account you actually control. `celestual_poll_ig_verification` returns the
adopted @ to the proof-holder (and only the proof-holder) so the browser can
adopt it. The one residual — a stray/guessed DM that matches *someone else's*
live code, which would adopt the DMing account onto their session — is bounded
three ways: the code is **6 digits** with a **30-minute TTL** (0014, so the
live-code pool is small and a collision is ~1-in-a-million per stray DM), the
unique-pending-code index means a code maps to at most one session at a time,
and the browser shows a **"sign in as @X?" confirm** whenever the adopted @
differs from the one typed, so an unexpected identity can never commit silently.

**The twenty-second grace is closed (0026).** 0017 opened a temporary door
because the relay was dropping DMs: a browser that had shown its code and waited
twenty seconds could call `celestual_ig_verify_timeout` and be admitted **as the
typed @**, with those rows stamped `verified_via = 'timeout'` so the desk could
see whose identity had been assumed rather than proven. The relay works, so the
door is shut — the function is revoked from every client role *and* emptied to a
refusal, and the client's timer is gone with it. Existing `'timeout'` accounts
stay verified and the desk still names them ("Assumed at 20s"); what cannot
happen any more is a new one. Nothing but a Meta-authenticated DM verifies now,
which is the only thing that ever proved anything here — and it matters more
since 0025, because on the other side of that door is another person's sealed
card *and their photograph*.

Session lifetime (0009): a completed verification stands **30 days, sliding**
— each successful proof use extends it another 30, so an active person never
re-verifies while an abandoned proof still dies. The exposure profile is that
of a long-lived session cookie: the proof lives only in that browser's
localStorage, signing out destroys it, and a leaked proof still can't move the
verification to another handle. Both relay paths DM instant feedback to the
sender (verified ✓ / already-verified / expired) inside Meta's 24-hour standard
messaging window. The `/demo` sandbox runs the same overlay but auto-verifies
locally and never touches the backend.

**Durable, DM-free recovery (0013).** A verified session used to be reachable
*only* through the proof in that one browser's localStorage — so losing it
(Instagram's in-app browser, iOS ITP, a new device) forced a fresh DM, which is
the repetitive pattern Instagram throttles (the root cause in
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) §8). Now, at the one-time DM
verification the browser binds `handle ⇄ email` under its fresh proof
(`celestual_bind_recovery` — writable *only* with a live proof). A later "sign
back in" emails a one-time magic link (`celestual-relogin`, the same Resend path
as the other mail) whose token is stored only as a hash, is single-use, and
lasts 20 minutes; opening it mints a fresh proof client-side and a full 30-day
session (`celestual_relogin_redeem`, service-role only) with no DM. The DM is a
one-time step; email ownership carries every return, cross-device. Both writers
are service-role-only, so the browser can never mint its own proof. **Email is
required at signup** (not optional): it is both the mutual-match reveal channel
(§mutual) and this recovery anchor, so every account can be reached and can
return without a DM. School (`.edu`) addresses are encouraged — the core
audience — and double as community setup.

**The proof comes back from the session (0065).** "The browser can never mint
its own proof" stopped being true with 0065, on purpose, and the line it holds
now is narrower and still the one that matters: **the browser only ever gets a
proof for the @ its own session's person already holds verified, and only the
DM claims an @.** The sign-back-in link above was never deployed and went in
Phase 4a (`celestual-relogin`, docs/open-questions.md Q4), and nothing turned
the identity row's `handle_verified_at` back into a proof on another device,
so a person who had DMd once and then signed in by email on a laptop, or came
back after thirty idle days, was asked for the DM again before their private
notes would show. 0065 is that recovery, finally wired.
`celestual_session_handle_proof(token, proof_hash)` is browser-callable: the
browser mints a fresh secret and sends its SHA-256 with its session token, and
the server looks the session up and, only if the person it resolves to holds a
verified @ that is not banned, writes a verified proof row for THAT @ under
that hash (`verified_via = 'session'`, thirty days sliding like every proof,
idempotent per hash, a dozen an hour an @). It takes no @ as an argument: the
@ is the one the person's row holds. The session token was already
the key to everything the @ owns on the wall (taking letters about it down,
0063; its alerts, 0064), and is bound to a person only by a proof (the DM, a
campus link, Google, the login link), so a thirty-day proof minted from it
gives nothing the session did not already hold. `celestual_user_bind_handle`,
the one writer of `handle_verified_at`, is untouched.

### §link — The mailed link, which signs in only the browser that opens it (0064, 0065, 0070)
Three things are proved by one mailed link (`celestual-edu-verify`,
docs/EDU-VERIFICATION.md): a campus address, an alert address, and since 0065
a login, for any address, which signs a browser in as whoever holds the
address. The token is 32 random bytes, in the URL's fragment, stored only as
its SHA-256, single-use and thirty minutes long, and the sessions on either
end are stored as hashes. What a link can do is what the address can do, and
with `login` on every address that is every account.

**The link signs in the browser that opened it, and no other.** The attack is
plain: type somebody's address into the door on your own phone, get them to
tap the link that arrives ("is this you?"), and, if the link signs in the
browser that ASKED, your phone is signed in as them, with their @, their
private notes and their alerts. 0064 answered it with a number printed in the
mail and on the asking screen, which protected the careful and nobody else.
0065 kept the number on the asking screen only and made a link opened on any
other device wait for it to be typed there; nearly everybody arrives from
Instagram's in-app browser and reads the mail in another, so nearly everybody
was asked. Since 0070 there is no number: a link confirms at once for the
browser that opened it (`confirmed_session_hash`), and the asking browser is
signed in only when it is that same browser. The victim's tap signs in the
victim's own browser, as themselves; the stranger's browser is told
`elsewhere` and holds nothing. An alerts link still confirms the asking
account's address wherever it is opened: the most a stranger gets from that
is their own alerts mailed to an inbox that can stop them in one tap.

**A carried letter is shown, never posted, on the tap.** A campus link can
carry the waiting draft to the browser that opens it (0070 `carry`), since
that browser, not the one that asked, is the one proved. It is handed over
once, cleared when used or run out, service role only on the row, and it goes
up only on a press of `post it` on /verify, after it is shown: somebody who
only tapped a link they never asked for never has a stranger's letter posted
under their address. It posts with the draft's own nonce, so it is one letter
wherever it goes up from.

### §ident — Multi-account identity
A person can link up to 3 of their own @s (`celestual_link`); matching and the
slot count are **group-aware**. Claiming is first-come, never steals an @ from
another group, capped at 3. With verification enforced, the budget and claims
key on a proven identity.

### §mutual — The reveal and the exfil-safe email
`celestual_submit` returns mutuality instantly to the completer; the earlier
entrant is emailed **only at the address they themselves stored** — never the
address on the triggering request — via the `celestual_notifications` queue
(retry + dead-letter in celestual-notify). Withdrawal tears down the match row
and any still-pending notification, but never un-tells anyone already mailed;
since 0069 a mutual is not withdrawn at all, and since 0072 withdrawal takes a
match row only when it un-tells the half of a pair from before the weekly
reveal, never a kept pair's. A blocked/opted-out handle can never match:
suppression is checked (by hash) before anything records.

### §keep — A mutual kept, and written to again (0072)
A mutual used to be two matched rows in `celestual_entries`, forever, and a
table of one row per pair can hold a note or a mutual, never both, so nobody
could write to somebody they were mutual with again. Now a told pair can be
**kept**: each side's row is frozen into `celestual_keepsakes` and the two
rows leave `celestual_entries`, so a new note from either side is a new note
in every way (a ping spent, sealed until the Saturday reveal, told only if
the other side writes a new one too).

- **What a keepsake holds.** Whose list it is on (the from handle), the @ it
  names and that @'s salted hash, the owner's own words and the other side's
  words as they were told (both cards, with the photograph under each where
  one was ever stored), when the note went out, the end it carried, and the
  night it was told, and the @ the other side's words were read off (with two
  handles linked as one, 0036, not always the @ it names). One row per person
  per told mutual. Nothing a keepsake holds was not already on the owner's
  list, and the other side's words in it are the words their
  `celestual_counterpart_card` already returned to the owner at the reveal.
- **Who can read it.** Its owner, and nobody else: RLS on, zero policies,
  every grant revoked, and read only inside the owner's proof gated
  functions (`celestual_my_pings`, `celestual_ping_status`,
  `celestual_card_photo`, and the answer `celestual_submit` gives a told
  pair). The operator reads it as they read `celestual_entries`, and it is
  the same crown jewel: a keepsake joins the @ in plaintext to the words,
  which a told pair's `matched_handle` already did.
- **Writing again tells the other person nothing.** Keeping happens only
  inside `celestual_mutual_again` (which places the new note in the same
  transaction, and keeps nothing when the note is refused) and
  `celestual_mutual_forget`. After it, every door the other person can knock
  on about the pair answers exactly as it did while the pair was told: their
  list (the same in every field), the status, an ordinary placement on the
  pair (it's mutual, their words, nothing spent, nothing written), letting go
  ('mutual'), keeping for next week, the photographs, and the week's pings.
  With two handles linked as one (0036), a placement from the @ that was not
  told, or to the other side's other @, was told again at once while the pair
  was told, and on a kept pair it still is, into a keepsake of its own, with
  the same ping spent and given back and the same refusals, so the one
  placing cannot learn from it that the other side wrote again or took
  theirs off. The new note is sealed like any other (0069), so even when both
  write again nothing is said before the night.
  `scripts/sql/test-mutual-kept.sql` compares every one of those answers byte
  for byte, before and after.
- **Taking one off is one person's.** `celestual_mutual_forget` removes the
  caller's keepsakes of the pair, and the news of it still on its way to
  them; the other person keeps theirs and is told nothing. It takes only the
  nights the caller could have been shown (told before the call, and none
  after the night their list drew), so a mutual told since, which the other
  side is being told of, is never taken off unseen; and a 'none' changes
  nothing.
- **A pair told twice is told twice.** `celestual_matches` is unique on the
  pair among the rows not kept (`kept_at`), so a second mutual writes its own
  row and its own mail and DM to both, and a kept pair's row, with any news
  still owed, is never dropped to make room.
- **Erasure.** Keepsakes follow the rows they were: the erase, the opt out
  and the desk's delete take the person's own and every other person's
  keepsake about them, their words with it (through
  `celestual_billing_forget`, with the ping ledger), and their words and
  photograph out of a keepsake that names another @ linked with theirs, which
  stays with nothing of theirs in it. The broom takes none; a keepsake lasts,
  as a mutual did, until its owner takes it off.

### §card — What a ping carries, and what holds it shut (0022)
Every ping now carries a **card**: a short message on a ground, in one of three
faces, with the block where the person left it, plus one number for the light it
burns with. It lives in `celestual_entries.card`.

- **Rebuilt, never accepted.** `celestual_card_clean` constructs the stored
  jsonb from scratch on every write — eighty words and 280 characters (since
  0063, when a private note became as long as a letter; it was twenty words), a
  known plate, a known face, a position clamped inside the disc, a tone in
  range — so an unknown key cannot ride along inside the object and come back
  out at a reveal. Since 0063 the words are also read by the letters' list
  (`celestual_text_caught`), and a card it catches places nothing.
- **The face is rebuilt too, and a caught line is left off, not refused**
  (0073). A card can carry the line across its top (`greet`) and the battery
  its writer left it on (`bat`), and only with words. The line is a string,
  its spaces closed and cut to forty, and the same list reads it: a line it
  catches is dropped and the note goes with its words, so nothing the list
  catches is ever stored, in the line or the words. Refusing is the
  composer's, at the keyboard, where the writer can change it (screens/Ping.jsx
  and Write.jsx read the line on its own and with the words, so a number split
  between the two is caught; the server reads each on its own). The battery is
  matched against the numbers' regular expression before it is cast, then
  rounded and clamped to 0 to 4, so a hostile value can neither raise inside
  the write path nor ride along. The validator reads the service role's list
  now and is revoked from `public`, `anon` and `authenticated`; its one caller
  is `celestual_place`, which is SECURITY DEFINER.
- **One door, and it is locked to a matched row.**
  `celestual_counterpart_card` is the only function that returns a card its
  caller did not write, it is **not granted to `anon` or `authenticated`**, and
  its `where` clause carries `matched_at is not null` on the row *being read*.
  There is no argument to it, and no shape of call to anything else, that
  returns the words on an unanswered ping.
- **The photograph travels, on the card's own seal** (migration 0025). It used
  not to: there was no column, no bucket and no upload path, and the picture's
  safety was a *fact about the network* rather than a policy — the bytes could
  not arrive anywhere because nothing sent them. That was the stronger
  guarantee and it cost the product the thing it was for, because the half of
  the card people spend the most care on was the half nobody would ever see and
  the half a new phone could not get back. So it is a column on the ping now
  (`celestual_entries.photo`, base64 of the treated, EXIF-stripped JPEG the
  browser makes), written only through `celestual_card_photo_put` and released
  by exactly one function, `celestual_counterpart_photo`, which is **not
  granted to `anon` or `authenticated`** and carries the same
  `matched_at is not null` clause the words' door carries. Below a mutual a
  photograph is as unreadable as the words beside it.
- **Nothing about where the picture was taken travels with it.** Every image is
  decoded and re-encoded through a canvas before it is stored (`card/photo.js`),
  which drops every EXIF block — the GPS fix, the capture timestamp, the device
  serial, the orientation flag. There is no path in the repo by which the
  original bytes survive, so the location leak the old design avoided by never
  uploading is avoided here by never *having* it.
- **Deleted by every path that deletes a ping.** The sixty-day purge, "let one
  go", "delete everything" and the opt-out all work on whole rows, and the
  photograph is a column on the row — so none of them needed a line of new
  cleanup. Letting a ping go also drops both cached copies from IndexedDB.
  Since 0072 a told pair that is kept copies both cards, and the photograph
  under each, into the two sides' keepsakes (§keep), and every erasure takes
  those as it takes the rows; and `celestual_card_photo_put` writes onto a
  running note only, so a told note's photograph stays what the other side
  saw, as its words have since 0069.

Two things follow that are worth stating rather than discovering. A card is
plaintext at rest in `celestual_entries` — the target handle beside it is a
salted hash, the words are not, and they cannot be, because the other person has
to be able to read them. And a card sits in `localStorage` on the device that
placed it, exactly as the plaintext handles already do. The card system's
design record went with the retired design on 4 September; 0022's header
carries the seal rule.

### §replies — Anonymous to readers, not to the desk (0068)
A letter has a thread of replies under it, and a reply is the one place on the
wall where one anonymous writer answers another in public, under a letter the
person it is to may be reading. So the model is the letters' with three things
added.

- **The author is kept, and never leaves the database.** `wall_replies` carries
  `author_id`, because the desk has to be able to act on abuse. Nothing a
  browser can call returns it: `wall_reply_thread` names each writer by `who`,
  sixteen hex of the SHA-256 of a salt, the letter and the author. The salt is
  a row in `celestual_settings` (`wall_reply_salt`, 24 random bytes) the desk
  never lists. So one person is one creature all the way down one thread, and a
  different one under the next letter, and nobody can follow them from one
  thread to another or join a creature to a person. `mine` tells a device which
  replies are its own and nothing about anybody else's. The desk's queue
  (`celestual_desk_replies`, service role, behind the desk password) does show
  the author, the @ they proved and their school address.
- **Who may reply is narrow, and the rest is read first.** A proved school
  address (`edu_verified_at`, which includes the desk's pass list), the same
  accountability the @-notes keep, or the person the letter is to, proved by
  the Instagram claim, whose replies are marked as theirs. Every reply is read
  before it is written: the letters' list, a rule that it names nobody else
  (no @, no word shaped like a handle, no full name, checked at the keyboard,
  in the edge function and again in the database by `wall_reply_caught`, where
  nothing can edit it out), then the classifier. A doubt is held for a person;
  the writer alone sees a held reply. The write, `wall_reply_write`, is the
  service role's alone, so there is no path from a browser to the table that
  skips the reading. Forty a day and six under one letter in ten minutes, and a
  refused reply counts, so the classifier is not a free retry.
- **The crowd can put a reply out of sight, and the person it is about can
  shut the thread.** Three reports from three devices hide a live reply until
  the desk restores or removes it; a device reports a reply once, ever, and
  never its own. The recipient can stop new replies or put the thread away so
  nobody else sees it, on any letter to their @.

Every reply table has RLS on and every grant revoked; the browser reads a
thread, likes, reports and, as the recipient, shuts, through four definer
functions, and nothing else. The terms for replying are accepted once and
recorded on the server (`wall_reply_terms`).

### §optout — The public escape hatch
`celestual_suppress` is the opt-out any handle owner — user or not — can use
without an account: it hashes the handle into the block list and erases
**everything** referencing it (pings both directions, matches, pending mail,
the mutuals kept on its own list and on anybody else's about it (0072),
membership, worlds, campus preregistrations, the identity row). Free,
immediate, never behind a login, rate-limited against griefing. Since 0039 it
takes the same one-DM proof placing a ping takes: anybody who holds the
Instagram account can prove it, user or not, and without the proof nothing is
read and the refusal is the same whether or not the name was ever on the
books. Before that, anybody could type any handle into `/optout` and make it
un-pingable for good, erasing its owner's pings on the way. It is also how "delete everything" works
for a user's own handle. Reachable at `/optout` and documented on
`/data-deletion`.

### §campus — Windows and truth
Campus rows are operator-created only. Preregistration requires a verified
handle (it *is* the signup). The meter count is the true count. Opening at
threshold is atomic and mails everyone at once. Week-one aggregates are
**snapshotted** by `celestual_campus_reveal` (service-role, run by the
operator after eyeballing) so published numbers stay exactly true forever.
Nothing in the schema can inflate a number without lying in SQL — and nothing
may (framework §6.2: the forbidden lever).

### §counters — The 100-floor
Community counters are computed server-side and return `null` below 100
members (`celestual_world_counts`, `celestual_set_worlds`). Small counts both
feel empty and de-anonymize; the floor is enforced at the source of truth,
never in the client.

### §mail — What email can ever say
Three emails exist: *it's mutual* (to the earlier entrant's own address),
*your ping lapses soon* (about the sender's own action; names no handle —
§2), and the campus *open/reveal* notes (to preregistrants). None of them can
state or imply anything about any other person's activity. That line is
load-bearing legally (FTC v. NGL) and is pre-committed here in writing. The
transactional mails — the `.edu` join code and the sign-back-in magic link —
speak only to the recipient about their own action and name no one else. So
does the one mailed link that has replaced them (§link: a campus address, an
alert address, a login), which since 0065 carries no number either, and since
0070 asks for none.

### §age — Adults
The landing states the 18+ condition on the primary action; marketing is
college-and-up only; suspected-minor accounts are purged fast. Boring
conservatism on purpose (framework §6.7).

### §recruit — The recruitment program (0016)
A reel comment mints an invite; signing mints a personal tracking link whose
opens and signups are counted. The whole program is deliberately **walled off
from the ping graph**: no table here has a join to `celestual_entries`, so it
cannot see, infer or leak who pinged whom.

- **Identity comes from Meta**, not a form. `celestual_recruit_invite` is
  service-role only and is reachable solely through the edge function, which
  authenticates ManyChat with the shared secret; the username is the one
  ManyChat read from Meta's API.
- **Two hashed secrets**, both minted outside Postgres: the one-time invite
  token (14 days, in the DM link's fragment) and the recruit's dashboard key
  (minted in their browser at signing, like the DM `proof`). Only SHA-256 is
  stored. Losing the key costs the dashboard, not the code.
- **An open is one integer per code per day.** No IP, no user agent, no visitor
  id, nothing to profile with. Rate-limited per IP through `celestual_attempts`
  so a loop cannot inflate a recruiter's numbers.
- **A signup requires a real verified handle.** `celestual_recruit_attribute`
  refuses a handle with no `celestual_members` row, refuses self-crediting, and
  the `(code, handle)` primary key makes double-counting impossible.
- **The opt-out reaches it.** `celestual_suppress` erases the person's recruit
  record, the traffic counted against their code, and any credit they gave
  someone else.
- **The agreement is versioned.** A signature stores the version it signed, so
  changing the rules never silently re-points an old signature at new terms.

### Response headers (`vercel.json`)

HSTS (2 years, preload), `nosniff`, a strict `Referrer-Policy`, a
`Permissions-Policy` that turns off camera / mic / geolocation / payment / USB,
and a CSP with no `unsafe-eval`, no `unsafe-inline` script, `object-src 'none'`
and `base-uri 'self'`. `connect-src` is limited to self, the Supabase project and
Google Fonts.

**Framing is `'self'`, not `'none'`.** It was `X-Frame-Options: DENY` +
`frame-ancestors 'none'`, which is the right default and was also a bug the moment
`/trial` started showing the competition doc in a same-origin iframe: `DENY`
forbids framing by *anyone*, including us, so the doc sheet would have rendered
blank in production while looking fine in `vite preview` (which applies none of
these headers). It is now `X-Frame-Options: SAMEORIGIN` +
`frame-src 'self'; frame-ancestors 'self'`. Cross-origin framing is still refused,
so the clickjacking posture is unchanged; only our own pages may frame our own
pages. If the doc viewer is ever removed, put this back to `'none'`.

## Residual risks, named

- **Instant reveal is an oracle bounded, not removed** — 3 slots + 6
  placements/30 days + hourly caps bound "fishing for who likes me" to a slow
  trickle. If it ever proves too loose, the single lever is delaying the
  completer-side reveal; the seam is isolated in `celestual_submit`'s return.
- **The salt is a secret** — anyone with the service role can hash candidate
  handles and test membership. Hashing protects against dumps and honest-
  operator reads, not against a fully compromised operator. Encrypt at rest,
  log access, treat `celestual_entries` as the crown jewels regardless.
- **Meta platform risk** — verification rides Meta's webhook surface; keep the
  bio-code/ManyChat fallback maintained forever (framework §6.6).
- **Email is a recovery factor (0013)** — once a handle binds a recovery email,
  whoever controls that inbox can re-login as the handle via the magic link. This
  is the standard magic-link tradeoff and the same address already trusted for
  the mutual/lapse mail; the binding is only ever written under a live DM proof,
  the link is single-use + short-TTL + hash-only at rest, and the opt-out wipes
  the binding and any live tokens. Treat `celestual_recovery` as sensitive.
- **Any address is a login (0065)** — whoever controls an inbox can sign in as
  the person who proved that address, by a login, as a campus address or as a
  Google account, and gets their @'s proof back from the session (§verify).
  This is the same magic-link tradeoff, now on every account rather than on a
  recovery path. What bounds it is §link: the link is single-use, thirty
  minutes, hash-only at rest, and signs in only the browser that opened it
  (0070), so a link its owner never asked for signs in nobody but its owner.
- **The identity router answers "is this @ registered?" (0015)** —
  `celestual_handle_route` tells the caller whether a handle is known, which is
  how the sign-in screen stopped hedging in print. This discloses nothing new:
  `celestual_submit` already returns `reachable` for any handle you place a ping
  on, so membership has always been observable by design (it is Loop A's own
  readout). The bound address is never returned in full — Postgres masks it to
  its first letter and domain before it leaves. The RPC is service-role only, so
  it is reachable only through the edge function, where rate limiting lives.
  (Since 0071 `celestual_submit` answers `reachable` only of a pair already
  told, and since 0075 a night that was not mutual never answers it at all,
  §5; the router's answer to a person signing in is their own @, and stays
  as bounded as it was.)
- **A card is readable by the operator (0022)** — the words are stored in
  plaintext, because the person they were written to must be able to read them
  at a mutual and a hash cannot be un-hashed. The target handle beside them is
  still a salted hash, so a dump of `celestual_entries` gives you what somebody
  wrote and not who they wrote it to; the pair is only ever joined for a
  reciprocal that already exists. Treat the column as sensitive in the same
  breath as the salt: encrypt at rest, log access.
- **Pre-enforcement window** — while `require_ig_verification` is `'false'`
  (dev default), identity is the typed handle. Flip it on before any real
  launch; the operator checklist below makes it a release gate.

## Operator checklist

- [ ] All migrations applied (`0001`–`0022`); RLS **on**, **zero policies**,
      on every `celestual_*` table.
- [ ] `anon` has **execute** only on the §1 public RPC list — and **not** on
      `celestual_group`, `celestual_hash_handle`, `celestual_is_member`,
      `celestual_complete_ig_verification`, `celestual_consume_ig_proof`,
      `celestual_ig_required`, `celestual_relogin_store`,
      `celestual_relogin_redeem`, `celestual_campus_reveal`,
      `celestual_purge_expired`.
- [ ] `celestual-relogin` deployed (the sign-back-in magic link) and reachable;
      it reuses `RESEND_API_KEY` / `CELESTUAL_FROM_EMAIL`.
- [ ] `handle_salt` exists in `celestual_settings` (0006 seeds it) and is
      never logged or exported.
- [ ] Edge-function secrets set in Supabase, never in the front-end bundle
      (`RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `MANYCHAT_SHARED_SECRET` or
      the direct-Meta trio).
- [ ] `celestual-remind` scheduled hourly (lapse warnings + the sixty-day
      broom + campus mail); `celestual-notify` wired to the notifications
      insert or cron.
- [ ] Only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` + feature flags in
      the browser env; the service-role key never appears in `app/`.
- [ ] **Release gate:** `celestual_settings.require_ig_verification = 'true'`
      before any campus window opens.
- [ ] **Release gate:** `CELESTUAL_SANDBOX_GMAIL=0` on `celestual-edu-verify`
      before any real launch (the pre-launch default accepts a gmail address on
      `demo:true` requests so the pipeline is testable without a .edu inbox).

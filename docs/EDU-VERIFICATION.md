# EDU EMAIL VERIFICATION: the magic link, end to end

How a person proves a school address on celestual, since the rulings of 25
September (docs/ONE-WALL.md): **a magic link, never a code**, verified once per
device, and the device's session kept a year. The address it proves becomes the
person's alert address. The same link confirms an address for alerts alone,
and since 26 September (migration 0065) it is also how anybody signs in by
email: a third purpose, `login`, for any address.

Two things about the number changed with 0065, and both are below. It is
**typed, not printed**: it stands on the asking screen and nowhere else, and a
link opened on another device confirms only once it is typed there. And a
**resend from the same screen keeps it**.

The six digit code (`send` / `verify`) still runs for a tab on the old build.
It is described at the end.

---

## 1 · What a proof opens

| A proved address at | It opens |
| --- | --- |
| any `.edu` (or under one: `cs.stanford.edu`) | a campus for that school, opened on the first proof (`celestual_campus_for_domain`: `cs.stanford.edu` is the campus `stanford`), replying under a letter (0068), and reporting one, as any proof does. It used to open reading the wall too; since 0066 reading needs no proof at all |
| a school with `handle_notes` (Berkeley alone today) | writing **@-notes that go up at once**: letters to an Instagram handle, which carry `verified: true` and the school's mark, Berkeley's network in the status row (`CAL`, the gold aerial and the star). It used to be the school's sticker, and it used to be the only way to write to an @ at all |
| an address on the pass list (0043) | whatever a Berkeley address opens, whatever its domain |
| any address, by the `login` link (0065) | signing in as the person who holds the address, and, for a `.edu`, its campus as well |

A name note needs no proof at all, and since 0066 neither does an @-note sent
as `post on the wall`: both are read before they go up, and carry no school
and never the mark. A person proved at a school without `handle_notes` who
posts an @-note as a student is answered `campus`, and one with no proof is
answered `edu` (`wall_write`, migrations 0063 and 0066).

---

## 2 · The flow

```
asking device                         celestual-edu-verify                     inbox
─────────────                         ────────────────────                     ─────
{ action:'link', email, session,  →   checks the address, mints 32 random
  purpose:'edu', campus?:'berkeley',  bytes (the token) and a number 10–99,
  draft?: true }                      keeps sha256(token), sha256(session),
                                      the number (or the first link's, on a  →  "tap to confirm your
← { ok, request, match: 47,           resend: celestual_edu_link_open), mails     school email."
    domain, campus, school }          ${SITE}/verify#t=<token>                    no number in it.

shows "your number 47", polls                                                 the person taps the
{ action:'status', request, session } → answers the asking session only           link on any device
← { ok, verified: false, … }                                                          │
                                                                                      ▼
                                      { action:'confirm', token, session,   ←  /verify#t=<token>
                                        match? }                                (opening device; on
                                      celestual_edu_link_confirm:               any but the asking
                                        another device with no number:          one, "type the number
                                          'match', nothing spent; with the      on the screen where
                                          wrong one: 'mismatch', link burned;   you asked", then
                                        then binds the address to the asking    confirm again with
                                        session's person, and to the opening    match: 47)
                                        session's if it is another device;
                                        opens the campus; fills the alert
                                        address if empty
                                      → { ok, purpose, request, campus,
                                          school, same_device }
← { ok, verified: true, campus,
    school }   (next status poll)
posts the held draft
```

- **The number** is shown on the asking screen and nowhere else, labelled
  `your number`, with the line `tap the link in the mail. on another phone or
  computer, it asks for this number.` It used to be printed in the email as well
  (0064: "your screen shows 47. if it doesn't, ignore this email."), so a
  person could tell their own request from somebody else's before they tapped.
  That kept the careful reader safe and nobody else: a link confirms on
  whatever device opens it, so anybody who could type somebody's address and
  get them to tap one link they never asked for was proved, or since `login`
  signed in, as them. Since 0065 the number is **typed**. Opened on the device
  that asked (the same session), the link confirms at once, as before. Opened
  anywhere else, the page asks for the number on the asking screen and
  `confirm` is sent again with `match`: no number answers `match` and spends
  nothing (anything that is not two digits is passed on as no number, so it
  asks again and never burns the link); the right one confirms; a wrong one
  answers `mismatch`, marks the link `refused` and runs its clock out, so it is
  spent for good and the asking screen's `status` reads `expired: true` and
  offers another. A number typed anyway has one chance in ninety, once a
  link, five links an address an hour. The mail says only where the number is: "on another phone or computer,
  it asks for the number on the screen where you asked."
- **A resend keeps the number.** A second link for the same address and
  purpose, asked from the same screen while an earlier one is still pending and
  in its thirty minutes, carries the earlier one's number, and `link` answers
  with it. The screen shows one number, and whichever of the mails is opened on
  another device takes it. It used to be a new number every time, and the
  older mail, which is the one that arrives late, burned on the number the
  screen was showing. The composer's Berkeley door also listens for every link
  it has sent for the address, the newest and up to four before it, so any of
  them tapped posts the letter.
- **The link** is `${SITE}/verify#t=<token>`. The token is in the fragment, so it
  never reaches a server log on the way to the page. It lasts **thirty minutes**
  and works **once**. A second open answers `used`, except to the device that
  confirmed it (a page loaded twice), which is answered again.
- **`status`** answers only the session that asked (`session_hash` must match).
- **`same_device`** tells the opening page whether it is the device that asked,
  so it knows whether a held draft is on it ("/verify#t= confirms, then posts
  the held draft if it is on this device").
- **`campus`** on `link` (optional, a slug): the address must be at that campus's
  domain or under it, or on the pass list, else `domain`. The composer sends
  `campus: 'berkeley'` for an @-note.
- **`draft`** on `link` (optional, default true for `edu`): false words the mail
  for a proof with no letter waiting (the key `confirm` rather than `confirm
  and post`, and no "your letter goes up"). It said `verify` until 26
  September, when a school address became confirmed, not verified, in the
  mail as on the wall. The composer leaves it true; the replies' school form
  sends it false.
- **`purpose: 'alerts'`** takes any address, mails "tap to confirm this address."
  with the same link and the same number on the asking screen, and `confirm`
  sets the asking person's `alert_email` and `alert_email_verified_at` (and
  takes the address off the stop list).
- **`purpose: 'login'`** (0065) is the door's `continue with email`. It used to
  be Supabase Auth's code (0057), mailed from Supabase's own template, which on
  the live project was undesigned and eight digits long, into a box that held
  six, so nobody ever signed in that way. It takes any address, with no domain
  rule and never `taken`, and mails "tap to sign in." with the key `sign in`.
  For a `.edu` address `link` names the campus, the school and the domain as an
  `edu` link does (`celestual_campus_peek`), and `status` names the campus
  and the school. `confirm` signs the asking session, and then the opening
  session, in as the person who holds the address, by `celestual_user_bind_email_hash`: whoever proved it
  before, by a login (`email` with `email_verified_at`), as a campus address
  (`edu_email`) or as a google account (`google_email`). The device's own row
  is merged into that person, the older row surviving (`bind_email`); where
  the two are two different people (different @s, campus addresses, google
  logins or proved login addresses) the device moves onto the person who holds
  the address and neither row changes. Nobody holding it, it lands on the
  device's person, unless that person already signs in with a different
  address, and then on a new one. A `.edu` address also proves its campus, and
  the address fills an empty alert address. `/verify` says `you're in.`, with
  the way to the wall and to the private notes.

### Errors

| action | error | meaning |
| --- | --- | --- |
| link | `email` | not an address |
| link | `session` | no session token (16 to 256 characters) |
| link | `domain` | not a .edu (or not under the campus asked for), and not on the pass list |
| link | `taken` | this device is already proved at a different campus address (`edu` only) |
| link | `rate` | five an address, or fifteen a network address, in the hour (codes and links together, every purpose) |
| link | `send` | the mail could not be sent (Resend refused, or no key) |
| confirm | `invalid` | no such link |
| confirm | `expired` | past thirty minutes |
| confirm | `used` | already confirmed, by another device |
| confirm | `taken` | the bind refused (a different campus address on the asking person); rare, since `link` checks it first |
| confirm | `match` | opened on a device that did not ask for it, with no number: nothing is spent, and the page asks for the number (0065) |
| confirm | `mismatch` | the wrong number, or a link a wrong number already burned: it is spent for good (0065) |
| status | `invalid` | no such request for this session |

Since 0065 a refusal about a link that exists (`expired`, `used`, `match`,
`mismatch`) names the link's `purpose`, so the page can say where to ask
again: back to the letter for a draft, the account for an alert address, the
door to sign in again for a login.

---

## 3 · The security model

- **The token is a secret and is only in the email.** 32 random bytes, base64url.
  Only its SHA-256 is stored (`celestual_edu_verifications.link_hash`, unique). A
  dump of the table confirms nothing.
- **Sessions are hashes too.** The asking session and the confirming session are
  kept as SHA-256 (`session_hash`, `confirmed_session_hash`), the same trust model
  as every session since 0030. The bind by hash (`celestual_user_bind_edu_hash`)
  is how a link opened on a laptop proves the phone that asked.
- **What a link can do is what the address can do.** Whoever opens the link is
  bound to the address's person, and since `login` that is signing in as them.
  That is the nature of a magic link, and the number is the defence. It used to
  be printed in the mail, and the defence was a person reading it against their
  screen and ignoring a link their screen did not ask for, which protected the
  careful and nobody else. Since 0065 the number is only on the asking screen,
  and a link opened on any other device confirms only once it is typed there.
  A person sent a link they never asked for (somebody typed their address and
  says "is this you?") has no screen to read it off, so their tap signs nobody
  in; a number typed anyway has one chance in ninety, and a wrong one burns
  the link.
- **Service role only.** `celestual_edu_link_open`, `_confirm` (both the three
  argument form and the two argument one the function deployed before 0065
  calls, which is the same check with no number, so it fails closed),
  `_status` and the binds (`celestual_user_bind_edu_hash`,
  `celestual_user_bind_email_hash`) are not callable by a browser; the
  function is the only caller.
- **Rate limited** as the code always was: five an address and fifteen a network
  address an hour, counted across codes and links, in `celestual_edu_link_open`.
- **Nobody sees the address.** The wall never shows one; the alert address comes
  back to its owner masked (`celestual_alerts_get`: `s***@berkeley.edu`).

---

## 4 · The schema (migrations 0063, 0064, 0065)

`celestual_edu_verifications` (0007) gains, in 0064:

| column | |
| --- | --- |
| `kind` | `code` (default) or `link` |
| `purpose` | `edu` (default) or `alerts`, and since 0065 `login` |
| `session_hash` | sha256 of the asking session |
| `link_hash` | sha256 of the token, unique |
| `match` | the number, 10 to 99, shown on the asking device and only there (0065); a resend from the same session for the same address and purpose takes the pending one's |
| `confirmed_session_hash` | sha256 of the session that opened it |
| `campus` | the campus asked for, then the campus proved |

`code_hash` is nullable now; a check holds a code row to its hash and a link row
to its link hash, session hash and number. `token` stays the correlation id: it
is the `request` a link answers with. `status` is `pending`, `verified`, and
since 0065 `refused`: a link opened on another device with the wrong number,
which is then spent.

`celestual_user_bind_email_hash(hash, email)` (0065, service role) is the
login's bind, described under `purpose: 'login'` above.

`celestual_users` gains `alert_email`, `alert_email_verified_at`, `alerts_wrote`
(off) and `alerts_mutual` (on). Every bind of a campus address (the link, the code,
a google login at a .edu) fills an empty alert address.

`wall_campuses` gains `short` (the sticker's word, `Cal`; the network's name a
letter draws in its status row since 26 September, `CAL`, is the browser's,
`app/src/wall/schools.js`) and `handle_notes`
(0063), and `celestual_campus_for_domain(domain)` finds the campus of a domain or
under it, or opens one keyed on the registrable domain and slugged by its label
(a taken slug takes a number: `ucsd-2`).

---

## 5 · Turning it on

1. Apply migrations 0062, 0063 and 0064, and then 0065 (docs/launchsteps.md
   has the order).
2. Deploy the function: `supabase functions deploy celestual-edu-verify`
   (`verify_jwt = false` in `config.toml`). With 0065 applied and the function
   from before it still deployed, a link opened on the device that asked
   confirms as it always did, and one opened anywhere else answers `match` and
   waits: the old function never passes a number. So 0065, this function and
   the front end that asks for the number go out together.
3. Secrets on the function (Supabase → Edge Functions → Secrets):

   | secret | value |
   | --- | --- |
   | `RESEND_API_KEY` | the Resend key |
   | `CELESTUAL_FROM_EMAIL` | `celestual <hello@celestual.us>` (the code's default; set it anyway). Needs `celestual.us` verified in Resend |
   | `CELESTUAL_SITE_URL` | `https://celestual.us` (the link and the images point here) |

4. The site serves `/verify` (the page that reads `#t=` and calls `confirm`),
   `/fonts/jersey-10-normal-400-latin.woff2` and `/mail/head.png`.

### Testing it by hand

```sh
# ask (the session is any 16+ character string the browser would hold)
curl -s "$SUPABASE_URL/functions/v1/celestual-edu-verify" -H 'Content-Type: application/json' \
  -d '{"action":"link","email":"you@berkeley.edu","session":"test-session-0000000001","purpose":"edu","campus":"berkeley"}'
# → { ok, request, match, domain: "berkeley.edu", campus: "berkeley", school: "UC Berkeley" }

# open the link from the email in a browser, or confirm with its token. From
# another session it wants the number the ask answered with; without it the
# answer is { ok: false, error: "match" } and nothing is spent
curl -s ... -d '{"action":"confirm","token":"<token from the link>","session":"test-session-0000000002","match":47}'

# the asking session sees it
curl -s ... -d '{"action":"status","request":"<request>","session":"test-session-0000000001"}'
```

`scripts/sql/test-mail.sql` exercises every rule above against a local database
(`scripts/verify-migrations.sh --test`), and `scripts/sql/test-login-link.sql`
the login and the number: the same device, another device with no number,
the right one and a wrong one, for a login, a campus link and an alerts link.

---

## 6 · The code, for the old build

`{ action:'send', email, slug }` mails a six digit code (hash stored, six tries,
the try spent before the code is compared, ten minutes) to an address at one of
the curated schools (`SCHOOLS` in the function: `uc-berkeley`, `wesleyan`, `cmu`),
or on the pass list; `{ action:'verify', token, code, session? }` checks it and
binds through `celestual_user_bind_edu`. The mail is the same design as the rest
(`codeMail` in `_shared/mails.ts`). Nothing on the one wall uses it; it stays so a
tab that loaded the old build before a deploy still gets through.

The `@gmail.com` sandbox carve-out (`demo: true` with `CELESTUAL_SANDBOX_GMAIL=1`)
still exists on `send` for a test rig, off by default.

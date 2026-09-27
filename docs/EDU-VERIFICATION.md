# EDU EMAIL VERIFICATION: the magic link, end to end

How a person proves a school address on celestual, since the rulings of 25
September (docs/ONE-WALL.md): **a magic link, never a code**, verified once per
device, and the device's session kept a year. The address it proves becomes the
person's alert address. The same link confirms an address for alerts alone,
and since 26 September (migration 0065) it is also how anybody signs in by
email: a third purpose, `login`, for any address.

Since 27 September (migration 0070) **the link is enough**: nothing is typed.
Opened in any browser, it confirms at once for the browser that opened it,
and signs in the browser that asked only when that is the same one. The
number 0064 printed and 0065 asked for is gone (section 3 says why that is
safe), and a campus link carries the letter waiting on it to the browser that
opens it.

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
asking browser                        celestual-edu-verify                     inbox
──────────────                        ────────────────────                     ─────
{ action:'link', email, session,  →   checks the address, mints 32 random
  purpose:'edu', campus?:'berkeley',  bytes (the token), keeps sha256(token),
  draft?: true, carry? }              sha256(session) and the carry
                                      (celestual_edu_link_open), mails     →  "tap to confirm your
← { ok, request, domain,              ${SITE}/verify#t=<token>                    school email."
    campus, school }                                                          nothing to type.

polls                                                                         the person taps the
{ action:'status', request, session } → answers the asking session only           link in any browser
← { ok, verified: false, … }                                                          │
                                                                                      ▼
                                      { action:'confirm', token, session } ←  /verify#t=<token>
                                      celestual_edu_link_confirm: binds the     (the opening browser)
                                        address to the OPENING session's
                                        person, opens the campus, fills the
                                        alert address if empty
                                      → { ok, purpose, request, campus,     →  the same browser: the
                                          school, same_device, carry }          held draft goes up.
                                                                                another: the carried
same browser:                                                                   letter is shown, with
← { ok, verified: true, … }  (next poll), posts the held draft                  one key, "post it"
another browser:
← { ok, verified: false, elsewhere: true, expired: true },
  says "you opened it somewhere else", offers a new link
```

- **Nothing is typed.** The link confirms for the browser that opened it, at
  once. Opened in the browser that asked (the same session), that is the
  asking browser, as it always was. Opened in any other, that other one is
  proved (or, for `login`, signed in) and the asking browser is **not**. That
  is the whole defence against a link somebody never asked for (section 3).
- **The number, and why it went.** 0064 printed a number from 10 to 99 in the
  mail and on the asking screen. 0065 stopped printing it and asked for it
  instead: a link opened on another device waited for the number on the
  asking screen to be typed there. Nearly everybody arrives from Instagram, in
  Instagram's own browser, and the mail's link opens in Safari or in Gmail's,
  so nearly everybody was asked for a number on a screen in an app they had
  just left. 0070 signs in the browser that opened the link rather than the
  one that asked, which needs no number. A function from before 0070 still
  answers `match` for a link opened elsewhere; the page after 0070 says "open
  it where you asked" rather than asking for a number nothing shows.
- **Opened elsewhere, the asking screen is told.** `status` answers
  `elsewhere: true` (and `expired: true` beside it, so a screen from before
  0070 stops waiting and offers another link), and the screen says the link
  was opened somewhere else, where it signed in, with a new link to open
  here. One case is `verified` instead: the two browsers are already the same
  person.
- **The letter goes with the link.** The composer sends `carry: { letter }`,
  the draft as it stands (nonce and all), with a campus link; the replies'
  school form sends `carry: { reply: { letter: <id> } }`. The row keeps it
  (`carry`, jsonb, 4 kB at most, a campus link's only) while the link is live.
  `confirm` hands it to a browser that is not the one that asked, and lets go
  of it at once, on that link and every other link the same screen asked for;
  a link that ran out lets go of it at the next sweep (any link asked for, its
  own screen's poll, or a pg_cron job every ten minutes). `/verify` shows the
  carried letter on the screen it goes up on, with one key, `post it`, and a
  quiet `change it first`: shown first because whoever opens a link is not
  always who asked for it, and a stranger's letter must never go up under the
  address of somebody who only tapped. It posts through the composer's own
  path (`postDraft`) with the draft's nonce, so it is one letter wherever it
  goes up from (`wall_letters` is unique on author and nonce). A carried reply
  says `you can reply from here` and opens the letter.
- **A resend** leaves the earlier link alive for its thirty minutes. The
  composer's Berkeley door listens for every link it has sent for the address,
  the newest and up to four before it, so any of them tapped in this browser
  posts the letter.
- **The link** is `${SITE}/verify#t=<token>`. The token is in the fragment, so it
  never reaches a server log on the way to the page. It lasts **thirty minutes**
  and works **once**. A second open answers `used`, except to the device that
  confirmed it (a page loaded twice), which is answered again.
- **`status`** answers only the session that asked (`session_hash` must match).
- **`same_device`** tells the opening page whether it is the browser that
  asked, so it knows whether a held draft is in it ("/verify#t= confirms, then
  posts the held draft if it is in this browser"), or whether to look at
  `carry`.
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
  with the same link, and `confirm`, from whatever browser opens it, sets the
  asking person's `alert_email` and `alert_email_verified_at` (and takes the
  address off the stop list). It signs no browser in, so it is `verified` to
  the asking screen wherever it was opened.
- **`purpose: 'login'`** (0065) is the door's `continue with email`. It used to
  be Supabase Auth's code (0057), mailed from Supabase's own template, which on
  the live project was undesigned and eight digits long, into a box that held
  six, so nobody ever signed in that way. It takes any address, with no domain
  rule and never `taken`, and mails "tap to sign in." with the key `sign in`.
  For a `.edu` address `link` names the campus, the school and the domain as an
  `edu` link does (`celestual_campus_peek`), and `status` names the campus
  and the school. `confirm` signs the opening session (since 0070, and only
  it) in as the person who holds the address, by `celestual_user_bind_email_hash`: whoever proved it
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
| confirm | `invalid` | no such link, or no session to confirm it for (nothing is spent) |
| confirm | `expired` | past thirty minutes, or a link a wrong number burned under 0065 |
| confirm | `used` | already confirmed, by another browser |
| confirm | `taken` | the bind refused (a different campus address on the opening person) |
| confirm | `match` | only from a database before 0070: opened in a browser that did not ask for it; the page says to open it where it was asked for |
| status | `invalid` | no such request for this session |

A refusal about a link that exists names the link's `purpose`, so the page can
say where to ask again: back to the letter for a draft, the account for an
alert address, the door to sign in again for a login.

---

## 3 · The security model

- **The token is a secret and is only in the email.** 32 random bytes, base64url.
  Only its SHA-256 is stored (`celestual_edu_verifications.link_hash`, unique). A
  dump of the table confirms nothing.
- **Sessions are hashes too.** The asking session and the confirming session are
  kept as SHA-256 (`session_hash`, `confirmed_session_hash`), the same trust model
  as every session since 0030. The bind by hash (`celestual_user_bind_edu_hash`)
  is how a link opened on a laptop proves the phone that asked.
- **A link signs in only the browser that opened it.** Whoever opens the link
  is bound to the address's person, and since `login` that is signing in as
  them. Under 0064 the link signed in the browser that ASKED, so anybody who
  could type somebody's address and get them to tap one link they never asked
  for ("is this you?") was signed in as them: their @, their private notes,
  who they like. 0064 defended it with a number printed in the mail, which
  kept the careful reader safe and nobody else; 0065 with the number typed on
  the opening device, which asked nearly everybody for it. Since 0070 the tap
  signs in the browser that made it, which is in the hands of whoever reads
  that inbox, and the browser that asked is signed in only when it is that
  same browser. The stranger's browser gets `elsewhere` and nothing else.
- **A carried letter is shown before it is posted.** The browser that opens
  the link may belong to somebody who never asked for it, so the letter it
  carries goes up only on a press of `post it` there, never on the tap. It is
  the asker's own words handed to whoever reads the inbox they typed, which
  is what they asked for; it is service-role only on the row, handed over
  once, and cleared when the link is used or runs out.
- **Service role only.** `celestual_edu_link_open` (both forms: with `p_carry`,
  and the one with the number the function before 0070 calls, which carries
  nothing), `_confirm` (the three argument form, whose number is never read,
  and the two argument one), `_status` and the binds
  (`celestual_user_bind_edu_hash`, `celestual_user_bind_email_hash`) are not
  callable by a browser; the function is the only caller.
- **Rate limited** as the code always was: five an address and fifteen a network
  address an hour, counted across codes and links, in `celestual_edu_link_open`.
- **Nobody sees the address.** The wall never shows one; the alert address comes
  back to its owner masked (`celestual_alerts_get`: `s***@berkeley.edu`).

---

## 4 · The schema (migrations 0063, 0064, 0065, 0070)

`celestual_edu_verifications` (0007) gains, in 0064:

| column | |
| --- | --- |
| `kind` | `code` (default) or `link` |
| `purpose` | `edu` (default) or `alerts`, and since 0065 `login` |
| `session_hash` | sha256 of the asking session |
| `link_hash` | sha256 of the token, unique |
| `match` | the number, 10 to 99, an asking screen showed (0064, 0065); null since 0070, when nothing asks for it |
| `confirmed_session_hash` | sha256 of the session that opened it, which since 0070 is the one it signed in |
| `campus` | the campus asked for, then the campus proved |
| `carry` | (0070) what a campus link hands the browser that opens it when that is not the one that asked: `{ letter }` or `{ reply: { letter } }`, jsonb, 4 kB at most; cleared when handed over or run out |

`code_hash` is nullable now; a check holds a code row to its hash and a link row
to its link hash and session hash. `token` stays the correlation id: it
is the `request` a link answers with. `status` is `pending`, `verified`, and
`refused`: a link a wrong number burned under 0065, which nothing makes now.

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

1. Apply migrations 0062, 0063 and 0064, then 0065, then 0070
   (docs/launchsteps.md has the order).
2. Deploy the function: `supabase functions deploy celestual-edu-verify`
   (`verify_jwt = false` in `config.toml`). 0070, the function and the front
   end go out in any order. 0070 alone makes every link confirm for the
   browser that opened it, whatever calls it (the function before it passes a
   number, which is never read). The function after it asks for the open with
   `carry` and falls back to the one with a number on a database before 0070,
   answering that number only then, for the page before 0070. The page after
   it shows no number, and meets a database before 0070 (`match`) with "open
   it where you asked". Best: 0070, then the function, then the front end.
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
# → { ok, request, domain: "berkeley.edu", campus: "berkeley", school: "UC Berkeley" }

# open the link from the email in a browser, or confirm with its token. From
# another session it confirms THAT session, and hands it any carry
curl -s ... -d '{"action":"confirm","token":"<token from the link>","session":"test-session-0000000002"}'

# the asking session sees it: verified from the same session, elsewhere from another
curl -s ... -d '{"action":"status","request":"<request>","session":"test-session-0000000001"}'
```

`scripts/sql/test-mail.sql` exercises every rule above against a local database
(`scripts/verify-migrations.sh --test`), `scripts/sql/test-login-link.sql` the
login, the same browser and another, and the attack the number stopped, for a
login, a campus link and an alerts link, and `scripts/sql/test-link-is-enough.sql`
the carry.

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

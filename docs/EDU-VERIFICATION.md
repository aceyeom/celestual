# EDU EMAIL VERIFICATION: the magic link, end to end

How a person proves a school address on celestual, since the rulings of 25
September (docs/ONE-WALL.md): **a magic link, never a code**, verified once per
device, and the device's session kept a year. The address it proves becomes the
person's alert address. The same link confirms an address for alerts alone.

The six digit code (`send` / `verify`) still runs for a tab on the old build.
It is described at the end.

---

## 1 · What a proof opens

| A proved address at | It opens |
| --- | --- |
| any `.edu` (or under one: `cs.stanford.edu`) | reading the wall, as any proof does, and a campus for that school, opened on the first proof (`celestual_campus_for_domain`: `cs.stanford.edu` is the campus `stanford`) |
| a school with `handle_notes` (Berkeley alone today) | writing **@-notes**: letters to an Instagram handle, which carry `verified: true` and the school's sticker |
| an address on the pass list (0043) | whatever a Berkeley address opens, whatever its domain |

A name note needs no proof at all. A person proved at a school without
`handle_notes` who tries an @-note is answered `campus`, and one with no proof
is answered `edu` (`wall_write` v2, migration 0063).

---

## 2 · The flow

```
asking device                         celestual-edu-verify                     inbox
─────────────                         ────────────────────                     ─────
{ action:'link', email, session,  →   checks the address, mints 32 random
  purpose:'edu', campus?:'berkeley',  bytes (the token) and a number 10–99,
  draft?: true }                      keeps sha256(token), sha256(session),
                                      the number                              →  "tap to verify your
← { ok, request, match: 47,           (celestual_edu_link_open), mails            school email."
    domain, campus, school }          ${SITE}/verify#t=<token>                    your screen shows 47.

shows 47, polls                                                               the person taps the
{ action:'status', request, session } → answers the asking session only           link on any device
← { ok, verified: false, … }                                                          │
                                                                                      ▼
                                      { action:'confirm', token, session }  ←  /verify#t=<token>
                                      celestual_edu_link_confirm:               (opening device)
                                        binds the address to the asking
                                        session's person, and to the opening
                                        session's if it is another device;
                                        opens the campus; fills the alert
                                        address if empty
                                      → { ok, purpose, request, campus,
                                          school, same_device }
← { ok, verified: true, campus,
    school }   (next status poll)
posts the held draft
```

- **The number** is shown on the asking screen and printed in the email. A link
  confirms on whatever device opens it, so the number is how a person tells their
  own request from somebody else's: the email says "your screen shows 47. if it
  doesn't, ignore this email."
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
  for a proof with no letter waiting ("verify", and no "your letter goes up").
- **`purpose: 'alerts'`** takes any address, mails "tap to confirm this address."
  with the same number and link, and `confirm` sets the asking person's
  `alert_email` and `alert_email_verified_at` (and takes the address off the
  stop list).

### Errors

| action | error | meaning |
| --- | --- | --- |
| link | `email` | not an address |
| link | `session` | no session token (16 to 256 characters) |
| link | `domain` | not a .edu (or not under the campus asked for), and not on the pass list |
| link | `taken` | this device is already proved at a different campus address |
| link | `rate` | five an address, or fifteen a network address, in the hour (codes and links together) |
| link | `send` | the mail could not be sent (Resend refused, or no key) |
| confirm | `invalid` | no such link |
| confirm | `expired` | past thirty minutes |
| confirm | `used` | already confirmed, by another device |
| confirm | `taken` | the bind refused (a different campus address on the asking person); rare, since `link` checks it first |
| status | `invalid` | no such request for this session |

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
  bound to the address's person. That is the nature of a magic link, and the
  number is the defence: a person who opens a link their screen did not ask for
  is told, in the mail, to ignore it.
- **Service role only.** `celestual_edu_link_open`, `_confirm`, `_status` and the
  binds are not callable by a browser; the function is the only caller.
- **Rate limited** as the code always was: five an address and fifteen a network
  address an hour, counted across codes and links, in `celestual_edu_link_open`.
- **Nobody sees the address.** The wall never shows one; the alert address comes
  back to its owner masked (`celestual_alerts_get`: `s***@berkeley.edu`).

---

## 4 · The schema (migrations 0063, 0064)

`celestual_edu_verifications` (0007) gains, in 0064:

| column | |
| --- | --- |
| `kind` | `code` (default) or `link` |
| `purpose` | `edu` (default) or `alerts` |
| `session_hash` | sha256 of the asking session |
| `link_hash` | sha256 of the token, unique |
| `match` | the number, 10 to 99 |
| `confirmed_session_hash` | sha256 of the session that opened it |
| `campus` | the campus asked for, then the campus proved |

`code_hash` is nullable now; a check holds a code row to its hash and a link row
to its link hash, session hash and number. `token` stays the correlation id: it
is the `request` a link answers with.

`celestual_users` gains `alert_email`, `alert_email_verified_at`, `alerts_wrote`
(off) and `alerts_mutual` (on). Every bind of a campus address (the link, the code,
a google login at a .edu) fills an empty alert address.

`wall_campuses` gains `short` (the sticker's word, `Cal`) and `handle_notes`
(0063), and `celestual_campus_for_domain(domain)` finds the campus of a domain or
under it, or opens one keyed on the registrable domain and slugged by its label
(a taken slug takes a number: `ucsd-2`).

---

## 5 · Turning it on

1. Apply migrations 0062, 0063 and 0064 (docs/launchsteps.md has the order).
2. Deploy the function: `supabase functions deploy celestual-edu-verify`
   (`verify_jwt = false` in `config.toml`).
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

# open the link from the email in a browser, or confirm with its token:
curl -s ... -d '{"action":"confirm","token":"<token from the link>","session":"test-session-0000000002"}'

# the asking session sees it
curl -s ... -d '{"action":"status","request":"<request>","session":"test-session-0000000001"}'
```

`scripts/sql/test-mail.sql` exercises every rule above against a local database
(`scripts/verify-migrations.sh --test`).

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

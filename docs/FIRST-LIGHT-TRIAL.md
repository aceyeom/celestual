# First Light — the trial, the links, the admin dashboard

The First Light launch replaces the ManyChat comment→DM recruitment loop
(docs/RECRUITMENT.md, now retired) with three surfaces:

| Surface | Where | What it is |
| --- | --- | --- |
| the trial page | `celestual.us/trial` | the competition brief (the official doc distilled), the doc itself to view/download, and self-serve entry: email verification → in-app signature → a chosen four-letter code |
| root tracking links | `celestual.us/<code>` | each competitor's personal link — exactly four letters, chosen by them. Opens and credited signups count exactly as 0016 did (`/r/<code>` still works as an alias) |
| the admin dashboard | `celestual.us/admin` | password-gated operations console: users, unverified people, competitors, growth and an activity log, with delete / ban / unban / manual admit |

It also ships the **20-second DM grace** (temporary): the Instagram DM
verification flow is unchanged, but a browser that has waited 20+ seconds on
"waiting for your dm…" is let in as the typed @, recorded
`verified_via='timeout'`, and listed on the admin dashboard with the DM code it held so
each can be checked by hand in the Instagram DMs. Remove
`celestual_ig_verify_timeout` (0017) and the sheet's timer once the relay is
fixed.

## Going live — the order of operations

1. **Paste the migrations.** SQL editor → run, in order,
   `supabase/migrations/0017_first_light_trial.sql`,
   `0018_verification_lockout.sql`, then `0019_four_digit_and_desk.sql`.
   Everything is `create or replace` / `if not exists`; safe to re-run.

   0018 closes the lockout that made correct codes read as lapsed ones: a
   suppressed @ was refused by both completion paths while `start()` happily
   kept minting codes for it. See the migration header for the whole trace.
   0019 puts the DM code back to **four digits** and gives the desk its data:
   deduplicated users, one row per stuck handle, a 30-day growth series, and a
   unified activity log.
   **0020 empties `celestual_suppressions` once** (everyone unbanned) and splits
   the flag in two so it can't happen again. See "The two doors" below before
   running it.
2. **Wipe the old user data** (you said you'd do this by hand):
   SQL editor → run `supabase/wipe-all-user-data.sql`. ⚠ Irreversible. It
   erases every account and everything accounts produced, and deliberately
   KEEPS `celestual_suppressions` (opt-outs stay honored), `celestual_settings`
   (including `handle_salt` — the suppression hashes need it), and the
   operator-created communities/campuses. Delete your ManyChat contacts
   separately in ManyChat itself.
3. **Deploy the two edge functions** (already deployed via MCP if this branch
   was shipped agentically; otherwise):

   ```bash
   supabase functions deploy celestual-trial
   supabase functions deploy celestual-admin
   ```

4. **Secrets.** `celestual-trial` reuses the existing Resend secrets
   (`RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL`).
   `celestual-admin` reads `CELESTUAL_ADMIN_PASSWORD`; without it the dashboard
   opens with the launch password (`acedavid123`). **Set the secret and rotate
   that password once the trial is over** — it has been shared in plain text.
5. **Deploy the app** (merge to main; Vercel builds `dist/`).

Nothing breaks if the order slips: the trial page's email step just answers
"the code didn't go out" until the function + migration exist, and the
20-second grace silently keeps polling (the RPC returns `early`) until 0017 is
applied.

## What the trial entry records

One row in `celestual_recruits` (the same table 0016 used, so the counting
RPCs are untouched): the typed name as the signature, the agreement version
(`challenge-v1` since 0020; rows signed earlier keep `first-light-v1`), the
@ they entered, the verified email, the chosen code,
`source='trial'`. The email-ownership codes live hashed in
`celestual_trial_emails`, written only by the edge function.

The account page's numbers ride the 0016 stats RPC
(`celestual_recruit_stats`), gated on the same browser-held dashboard key —
losing the device only costs the dashboard; logging back in on the trial page
with the same email re-binds it and returns the same code. A competitor's code
can never silently change once minted.

Four-letter codes are `[a-z]{4}`, minus the reserved words
(`celestual_trial_code_ok` server-side, `RESERVED_CODES` client-side — keep
them in step). Named routes always win over `/<code>`.

## The two doors (0020)

`celestual_suppressions` was doing two unrelated jobs under one flag, and a
third by accident:

| | What it means | Blocks pings? | Blocks verifying? |
| --- | --- | --- | --- |
| `kind = 'optout'` | "nobody may enter my @" — the privacy-policy opt-out, for any handle owner, user or not | yes | **no** |
| `kind = 'ban'` | "not welcome here" — the admin ban | yes | yes |

The accident was **"delete everything"** in the account screen: it called
`celestual_suppress` on your own handle, so tidying up your account quietly
opted you out — and because every identity check read the flag without asking
which kind it was, that handle could never verify again. Permanently, with
nothing in the product able to say so or undo it. That is the bug behind
"that code lapsed" on a live, correct code.

What changed:

- **The list was emptied once.** Every handle unbanned, every accidental
  self-lock lifted. The wipe is guarded by a `suppressions_reset_0020` marker in
  `celestual_settings`, so re-applying the migration can never erase opt-outs
  recorded later. **Do not remove that guard** — those rows are people who asked
  never to be entered, and honouring that is a published promise.
- **Identity checks ask `celestual_is_banned()`**, which reads `kind = 'ban'`
  only. One function, four callers (start, complete, the 20-second grace, the
  trial claim), so they can never drift apart again.
- **Ping-blocking is unchanged** and still reads the whole table: both kinds
  mean "do not enter this @" (`celestual_is_member`, `celestual_submit`).
- **`celestual_erase_account`** is new and client-callable: the same erasure
  `celestual_suppress` performs, minus the flag. "Delete everything" calls this
  now. Same 10-per-IP-per-hour limit; it erases strictly less than the opt-out
  already did for the same input, so it opens no new exposure.
- **Copy, in three places** — the account screen ("your @ stays yours, you can
  come back and verify again any time", with a link to the opt-out for anyone who
  wanted the other thing), `/privacy`, and `data-deletion.html`. Both pages now
  say plainly that opting out is about not being *entered*, is reversible on
  request, and never stops you signing up yourself.

## The admin dashboard

`/admin` is a **white, light-mode operations console** and shares nothing with
the rest of the app — not the palette, not `ui.jsx`, not the type scale. It
lives in `app/src/components/admin.jsx`, and `App.jsx` returns it *before* the
app shell so it gets no galaxy, no dock, and no screen wrapper. (That wrapper
carries `.fade`, whose keyframes leave a `transform` in place; a transformed
ancestor is the containing block for `position: fixed`, which is why anything
full-screen must escape it.)

Five tabs: **Overview** (KPI tiles, the members-over-time curve, the @-lookup
triage tool, latest activity), **Users**, **Unverified**, **Competitors**,
**Activity log**. Every tab past Overview has a filter box. Destructive buttons
arm on the first tap and fire on the second.

### What it shows

- **trial competitors** — name, @, email, code, link, opens, credited signups
  (hover the count for the handles), signed date; remove (trial row only).
- **users** — every member and HOW they verified:
  - `dm confirmed` — the webhook really saw the DM (`verified_via='dm'`).
  - `assumed at 20s` — admitted by the grace, with the DM code they held, so
    you can search the Instagram inbox for it and verify by hand.
  - `no dm record` — legacy/campus rows with no verification row.
  Plus delete (erase, may return) and ban (erase + suppress; the 0017 ban
  checks keep a banned @ from verifying back in).
- **look up an @** (0018, on the Overview tab) — the triage tool. Is this @ suppressed, is it a
  member, and what did its last twenty verification attempts do. Start here
  whenever someone says their code is correct and nothing happens; a suppressed
  @ is refused by both completion paths and used to be invisible from every
  surface we had. A **lift** button undoes it, necessary because before 0020 the
  account screen's "delete everything" suppressed your own @ and nothing in the
  product could ever take it back out.
- **banned** and **opted out** (two counters, 0020) — how many hashes sit in
  `celestual_suppressions` of each kind. Shown apart on purpose: one refuses an
  identity, the other only means "nobody may enter this @". Showing them as one
  number is how the 0018 bug survived a week.
- **unverified** — people who started and never finished, **one row per
  handle** (0019). It used to be one row per pending *row*, so somebody who
  retried four times filled four lines and the list read as four people. Each
  row now carries the attempt count and the *latest* code — the one you actually
  want when searching the Instagram inbox — plus first/last tried and whether
  anything is still live. Admit, lift a lockout, or clear their stale codes
  from the row.
- **activity log** — one feed across verifications, codes issued, pings,
  matches, trial signups, lockouts and failed admin logins.
- **members over time** — the running total for the last 30 days, with each
  day's arrivals as bars behind it.

The password is checked only in the edge function; the data RPCs are
service-role only, so nothing is readable from the browser without it. Wrong
tries are rate limited per IP (20/hour).

## The doc on the trial page

Three files in `app/public`, all the same document:

| File | What it's for |
| --- | --- |
| `celestual-challenge.docx` | the original, byte-for-byte as supplied. The one people download, print, and sign. |
| `celestual-challenge.html` | the readable edition. `/trial`'s viewer sheet loads this in an iframe, so the doc opens **in place** instead of sending someone to a new tab mid-decision (which, on a phone, is where the decision ends). |
| `celestual-challenge.pdf` | rendered from the `.html` above, so the two can't drift. |

To regenerate the PDF after editing the HTML:

```bash
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=app/public/celestual-challenge.pdf \
  file://$PWD/app/public/celestual-challenge.html
```

`app/src/trialContent.js` is the poster — the page's own distillation of the
doc. It is NOT the doc. If the document changes, change the `.docx`, the
`.html`, the regenerated `.pdf`, **and** `trialContent.js`.

The HTML edition is deliberately exempt from `npm run lint:voice` (see the
`EXEMPT` set in `scripts/voice-lint.mjs`): it reproduces the competition
document's own voice, and that document is signed. Style rules do not get to
edit an agreement.

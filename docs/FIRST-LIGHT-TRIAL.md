# First Light — the trial, the links, the admin dashboard

The First Light launch replaces the ManyChat comment→DM recruitment loop
(docs/RECRUITMENT.md, now retired) with three surfaces:

| Surface | Where | What it is |
| --- | --- | --- |
| the trial page | `celestual.us/trial` | the competition brief (the official doc distilled), the doc itself to view/download, and self-serve entry: email verification → in-app signature → a chosen four-letter code |
| root tracking links | `celestual.us/<code>` | each competitor's personal link — exactly four letters, chosen by them. Opens and credited signups count exactly as 0016 did (`/r/<code>` still works as an alias) |
| the admin dashboard | `celestual.us/admin` | password-gated overview of competitors and users, with delete / ban |

It also ships the **20-second DM grace** (temporary): the Instagram DM
verification flow is unchanged, but a browser that has waited 20+ seconds on
"waiting for your dm…" is let in as the typed @, recorded
`verified_via='timeout'`, and listed on the admin dashboard with the DM code it held so
each can be checked by hand in the Instagram DMs. Remove
`celestual_ig_verify_timeout` (0017) and the sheet's timer once the relay is
fixed.

## Going live — the order of operations

1. **Paste the migration.** SQL editor → run
   `supabase/migrations/0017_first_light_trial.sql`. Everything is
   `create or replace` / `if not exists`; safe to re-run.
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
(`first-light-v1`), the @ they entered, the verified email, the chosen code,
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

## What the admin dashboard shows

- **trial competitors** — name, @, email, code, link, opens, credited signups
  (hover the count for the handles), signed date; remove (trial row only).
- **users** — every member and HOW they verified:
  - `dm confirmed` — the webhook really saw the DM (`verified_via='dm'`).
  - `assumed at 20s` — admitted by the grace, with the DM code they held, so
    you can search the Instagram inbox for it and verify by hand.
  - `no dm record` — legacy/campus rows with no verification row.
  Plus delete (erase, may return) and ban (erase + suppress; the 0017 ban
  checks keep a banned @ from verifying back in).
- **unfinished verifications** — codes started but never completed (waiting or
  lapsed), each with the typed @ and its code.

The password is checked only in the edge function; the data RPCs are
service-role only, so nothing is readable from the browser without it. Wrong
tries are rate limited per IP (20/hour).

## The doc on the trial page

`app/public/first-light.docx` and `first-light.pdf` are what /trial serves.
They are a faithful regeneration of the official doc with three deliberate
touches: the apply step also names the trial page, the example link matches
the four-letter format, and one typo ("pplght") is fixed. To serve the
original byte-for-byte instead, overwrite those two files.

# Launch steps

Everything you have to do by hand, outside the repo. Ordered.

I do not execute anything in this file. Spec section 0: I never touch Supabase
secrets, environment variables, or production data.

Each phase appends to this file as it completes. A step that is not yet written
is marked `PENDING <phase>`.

**Status: every phase is complete.** Nothing in this repository has been
applied to production. The migrations are written and verified against a bare
PostgreSQL; section 2 says in what order to apply them, and section 11 is the
checklist to work through on the day.

Three steps in here are irreversible and are marked where they appear. The free
tier has no point in time recovery.

---

## 0. Before anything

- [x] Supply `design/source/eclipse.html`. Done. Committed from the "Ecliptic"
      artifact.
- [x] Decide the beta data wipe. Done, Q2: only the `beta_*` tables, which are
      empty, so nothing is deleted.
- [x] Decide Stripe. Done, Q3: out of scope, nothing touched.
- [x] Answer Q21, the accent colour conflict. Done: blue `#74C7DE` from the
      build wins. `--ash` and `--hair` follow the build too. Phase 2 unblocked.
- [x] Answer Q1, the `tsc` gate. Done: the production build plus eslint plus
      `npm run lint:voice` stand in for it. See section 12 below.
- [x] Answer Q4 (migration 0015), Q5 and Q6 (the merge rule). Done: all eight
      of Q4 through Q11 answered on their recommendations.
- [ ] Approve the remaining groups in `docs/deletions.md`. Groups C and I are
      closed and need no approval.

---

## 0c. What Phase 6b inherited from Phase 3. DONE.

All four are handled. Kept here because each one records a decision rather than
a task:

- **The two signature surfaces are promoted.** The hero is `/` and the reveal is
  `/reveal/<handle>`, reached from the sky and from nowhere else.
  `/signature` still resolves, unchanged, because it is where Phase 3 was
  approved and it costs one dynamic import nobody loads by accident.
- **The hero's primary capsule has a destination.** Main's own flow, at
  `/place`, or `/sky` for somebody who already has pings out.
- **`app/index.html` no longer fetches production's three faces on every
  route.** `App.jsx` injects them, which is the shell that reads them.
- **The wall's four faces come off `/fonts` rather than off Google.** It was the
  wall's only third party request.

The original note follows.

Nothing to do now. Recorded here so it is not rediscovered later.

- **The two signature surfaces live at `/signature` and `/signature/reveal`.**
      That is a preview address. Phase 6b promotes the hero to `/` and folds the
      reveal into the core service. The fork is one block in `app/src/main.jsx`
      and it happens before `App.jsx` sees the path, because App's route table
      ends with a bare four letter matcher that would otherwise claim the word.
- **The hero's primary capsule has no destination yet.** It is the door into
      Main's own flow, which Phase 6b builds. The wall gate beside it is a real
      link to `/berkeley` and works today.
- **`app/index.html` still fetches production's three faces from Google on
      every route,** including the two signature ones, which use none of them.
      It is the only third party request the surfaces make and the only console
      error they produce when that host is unreachable. Phase 6b or Phase 8
      retires it with the bindery.
- **The wall at `/berkeley` still injects the Google stylesheet at runtime.**
      The same four faces are now files in `app/public/fonts/`. Switching it is
      a two line change in `app/src/wall/index.jsx` and it belongs with the
      Phase 6b rebuild of that surface, not before it.

---

## 0b. Nothing to do for Phase 2 or Phase 3

Neither phase touches Supabase, an environment variable, a secret, a migration
or production data. Both are files in this repository.

Two things Phase 2 added that need no action from you, recorded so they are not
a surprise later:

- **The four faces are now files** in `app/public/fonts/`, fetched by
  `node scripts/fetch-faces.mjs`. Nothing renders from fonts.googleapis.com in
  the design system or in the Phase 3 surfaces. The wall at `/berkeley` still
  injects the Google stylesheet at runtime, and Phase 6b is where that switches
  over. No CSP change is needed either way: the fonts are served from this
  origin now.
- **Playwright and eslint are dev dependencies.** `npm run shots` needs a
  Chromium. It uses Playwright's own, or one already on the machine if
  `CHROMIUM_PATH` or `PLAYWRIGHT_BROWSERS_PATH` points at it.

---

## 1. Backup before any destructive step

Q2 and Q3 removed every planned data deletion, so no user data is destroyed by
this rebuild. Migrations still alter schema, so the dump is still worth taking.

Supabase is on the free tier. There is no point in time recovery.

- [ ] Take a full database dump before the first migration is applied.
      Supabase dashboard, Database, Backups, or `pg_dump` against the connection
      string. Store it off Supabase.
- [ ] Confirm the dump restores into a scratch project before deleting anything.

Project ref: `vwbsjwaqnycyghvwlxhd`. Region `us-west-2`.

---

## 2. Migration apply order

### 2a. Phase 4a. Reconciliation. DONE IN THE REPO, TWO APPLIES FOR YOU.

Phase 4a compared the repo's migration set against production by applying every
file to an empty PostgreSQL and hashing both schemas object by object. Re-run it
any time with:

```
scripts/verify-migrations.sh
```

**What matched, byte for byte:** 239 columns, 66 constraints, 85 indexes, 2
policies, 1 view, 83 execute grants, 37 table grant and RLS states. The repo's
migrations now produce production's schema.

**What the audit expected and did not find.** `lock_internal_helpers` needs no
file. Its revokes are already carried by `0006_ping_model.sql` and
`0009_verification_hardening.sql`, and the grant fingerprint proves it: every one
of the 83 execute grants and 37 table grants produced by the repo's set matches
production exactly. `docs/plan.md` section 4a said two files had to be written.
Only one did.

**What was written.** `supabase/migrations/0029_adopt_sender_and_email_login.sql`,
transcribed from the live definitions of five objects that existed in production
with no file behind them: tables `celestual_email_identities` and
`celestual_login_links`, functions `celestual_bind_login_email`,
`celestual_login_lookup` and `celestual_redeem_login`.

**What was removed,** per your answer to Q4: `0015_identity_start.sql` and
`supabase/functions/celestual-relogin/`. Neither was ever applied or deployed.

- [ ] **Apply `0029_adopt_sender_and_email_login.sql` to production.** It is
      written entirely as `if not exists` and `create or replace`, so against
      production it is a no-op that rewrites three function bodies to the text
      they already hold. Applying it is what puts the row in
      `supabase_migrations.schema_migrations` so the history stops lying.
      Supabase dashboard, SQL editor.

- [ ] **Apply `0024_the_bindery.sql` to production, or decide not to.** This is
      the one real behavioural drift Phase 4a found. Production runs the
      `0022_the_card.sql` version of `celestual_card_clean`, which defaults a
      card ground to `ink` and rejects `leaf`, `chalk` and `hide`. The repo's
      0024 version accepts all eight and defaults to `leaf`. 0024 was never
      applied. It changes nothing else.
      Note that `docs/plan.md` finding 1.9 retires the bindery design, so you may
      prefer to leave production as it is and let Phase 6b settle it. Either way
      it is your call, not mine, and until you make it the repo and production
      disagree on this one function.

**Two things about production that no migration can carry, recorded so a rebuild
from this repo does not silently lose them:**

1. **A Database Webhook on `celestual_dm_outbox`.** Production has a trigger
   `celestual_dm_outbox_push`, AFTER INSERT FOR EACH ROW, calling
   `supabase_functions.http_request` against
   `https://<project-ref>.functions.supabase.co/celestual-mutual-dm`. It was
   created through the dashboard, it embeds the project ref, and it is in no
   migration file. `docs/MANYCHAT-MUTUAL-DM.md` section on delivery describes
   setting it up. If you ever rebuild the database from this repo, recreate it by
   hand or the mutual DM stops going out on match.

2. **The migration history table is not a record of what ran.**
   `supabase_migrations.schema_migrations` holds five rows against twenty-nine
   files, and 66 of the 83 function bodies in production carry CRLF line endings
   that no file in this repo has. Most of this schema was applied by hand through
   the dashboard SQL editor. Treat that table as a hint and the schema itself as
   the authority.

The five rows it does hold, for reference:

| version | name |
| --- | --- |
| 20260704035758 | ping_model |
| 20260704040149 | lock_internal_helpers |
| 20260717010302 | verification_hardening |
| 20260719082701 | adopt_sender_and_email_login |
| 20260830143432 | handle_resolver |

### 2b. Phase 4b. Identity and session.

- [ ] **Apply `0030_identity.sql` to production.** Apply it after 0029.
      It creates four tables (`celestual_users`, `celestual_sessions`,
      `celestual_user_merges`, `celestual_merge_conflicts`), eight functions, and
      backfills the users table from the people already here.

      The backfill is the part to read before you run it. It reads
      `celestual_members` (37 rows today) for the handles, takes the verification
      date from `celestual_ig_verifications`, and gives every verified `.edu`
      address in `celestual_edu_verifications` (1 row today) a row of its own with
      no handle. It is `not exists`-guarded throughout, so running it twice adds
      nobody. It creates 38 rows against production as it stands.

      It does not join any `.edu` row to any handle row. Nothing in the old
      schema links the two, so any join would be a guess. The merge rule makes
      that link later, once, when the person authenticates both in one session.

- [ ] **Redeploy `celestual-edu-verify`.** Its `verify` action now also calls
      `celestual_user_bind_edu`, which is what makes a verified campus address an
      identity rather than just a row in a verification table. The function is
      already deployed, so this is a redeploy, and it must happen **after** 0030
      is applied or the RPC will not exist.
      `supabase functions deploy celestual-edu-verify`

- [ ] **Add `celestual_sessions_prune()` to the scheduled sweep.** See section 8.
      Expired sessions are dead weight; nothing breaks if this is late.

Nothing else in Phase 4b needs anything from you. No secret, no environment
variable, no bucket, no DNS.

### 2c. Phase 5. The resolver.

- [ ] **Apply `0031_apify_resolver.sql`,** after 0030. The rest of what Phase 5
      needs from you is in section 3, in the order to do it.

### 2d. Phase 6a. The wall gets a server.

- [ ] **Apply `0032_the_wall.sql`,** after 0031.

      **Read this one before you run it.** It DROPS the five `beta_*` tables,
      the `beta_letters_public` view and `beta_remove_letter`, and rebuilds them
      as `wall_*`. That is Q10's rename, and it is safe for one reason only:
      all five tables hold zero rows and nothing has ever written to them. If
      that has changed since this was written, stop and tell me. Confirm with:

      ```sql
      select 'beta_letters' t, count(*) from beta_letters
      union all select 'beta_claims', count(*) from beta_claims
      union all select 'beta_reveal_requests', count(*) from beta_reveal_requests
      union all select 'beta_waitlist', count(*) from beta_waitlist
      union all select 'beta_scans', count(*) from beta_scans;
      ```

      Every count must be zero.

- [ ] **Add `select wall_expire();` to the scheduled jobs.** Section 8.

### 2e. Phase 6b. No migration.

Phase 6b is UI. It adds no schema, so there is nothing here to apply. What it
needs from you is in section 10, and it is one environment variable.

### 2f. Phase 7. The desk, and the campaign comes down.

Two migrations, in this order, and **one of them is irreversible**.

- [ ] **`0033_the_desk.sql`.** Adds eleven `celestual_desk_*` functions and
      nothing else. No table, no column, no drop. Safe to apply at any time.
      Every one of them is `service_role` only, so applying it changes nothing
      a browser can reach.

- [ ] **Before `0034`, export the four rows.** Q12 answered: the whole campaign
      goes. Two of those rows are in `celestual_recruits` and three in
      `celestual_trial_emails`, and they belong to real people who entered a
      competition. The free tier has no point in time recovery, so once 0034
      runs there is no copy anywhere unless you make one now.

      In the SQL editor, run both and save the output somewhere off Supabase:

      ```sql
      select * from celestual_recruits;
      select * from celestual_trial_emails;
      select * from celestual_recruit_visits;
      select * from celestual_recruit_signups;
      ```

- [ ] **Undeploy `celestual-trial` before applying 0034.** The function's source
      is already deleted from the repo, and after 0034 the RPCs it calls do not
      exist. Leaving it deployed leaves an endpoint that errors on every
      request rather than one that is gone.

      ```
      supabase functions delete celestual-trial
      ```

- [ ] **`0034_retire_the_campaign.sql`.** Drops eleven trial and recruit
      functions, `celestual_admin_delete_competitor`, and the four tables. It
      also redefines `celestual_admin_overview` and
      `celestual_admin_delete_user`, because both read the dropped tables and
      would break the moment they went.

      **This is the only irreversible step in the rebuild so far.**

- [ ] `supabase functions deploy celestual-admin` (section 7). Do this after
      0033 and 0034, not before: the new desk actions call functions 0033
      creates, and the old `delete_competitor` action calls one 0034 drops.

**What breaks on purpose.** Every competitor tracking link already printed or
sent in a DM. The four letter `/abcd` matcher and `/r/<code>` are gone from the
router, so those addresses fall through to the ordinary landing rather than
crediting anybody. That was stated with Q12 and accepted with the answer.

### 2g. Phase 8. The communities come down.

One migration, and it is the last one.

- [ ] **`0035_retire_the_communities.sql`.** Q15 answered: retire it. Drops five
      tables and six functions, and rewrites the three erasure paths that
      deleted from those tables, because all three would fail on their first
      call otherwise.

      **All five tables are empty** and were empty at the Phase 1 audit, so
      unlike 0034 there is nothing here to export first. It is still a drop, so
      take the backup in section 1 before it.

      `celestual_is_member` deliberately survives: `celestual_submit` and
      `celestual_my_pings` both call it, and it reads no community table.

- [ ] `supabase functions deploy celestual-edu-verify` and
      `supabase functions deploy celestual-notify` (section 7). Both carry the
      rebuilt mail.

### 2h. The whole apply order, in one list

Every migration this rebuild adds, in the order they go in. Steps that are
irreversible are marked.

```
0029_adopt_sender_and_email_login.sql    section 2a. already live, see note
0030_identity.sql                        section 2b
0031_apify_resolver.sql                  section 2c
0032_the_wall.sql                        section 2d
0033_the_desk.sql                        section 2f
0034_retire_the_campaign.sql             section 2f   IRREVERSIBLE, export first
0035_retire_the_communities.sql          section 2g   IRREVERSIBLE, empty tables
```

---

## 3. Apify

Phase 5 is built. Actor is `shu8hvrXbJbY3Eb9W`, per spec section 5.

**Do these in order.** The resolver is live in production today on the old
provider, and it stays working until the last step, so nothing is dark in
between.

- [ ] Apply `0031_apify_resolver.sql`, after 0029 and 0030. It creates
      `ig_profiles` and `handle_search_events`, carries the profiles across from
      `celestual_handle_cache`, and drops `celestual_handle_lookups`.
      It does **not** drop `celestual_handle_cache`. See section 4b below.
- [ ] Create the `avatars` bucket first. Section 5. The function cannot store a
      face without it, and every card will render as a monogram until it exists.

- [ ] Create the Apify account and note the plan and its included event quota.
- [ ] Create an API token scoped to that actor only.
- [ ] Set it as a Supabase edge function secret named **`APIFY_TOKEN`**.
      Supabase dashboard, Edge Functions, Secrets. The function answers
      `{ ok:false, error:'off' }` without it, which the UI draws as nothing,
      so a missing token is safe rather than broken.
      Optionally `APIFY_ACTOR_ID` if you ever move off the actor above.
- [x] The actor input sets the post limit to zero. Built in:
      `resultsType: 'details'`, `resultsLimit: 0`, `addParentData: false`. Profile
      metadata only, no posts, comments, or reels. Verify it in the pilot below.
- [ ] Deploy the function:
      `supabase functions deploy celestual-resolve --no-verify-jwt`
      The `--no-verify-jwt` is not optional. The browser now reaches this
      function through the `/api/resolve` rewrite as a plain POST with no
      Supabase key on it, and without that flag the platform rejects it.
- [ ] Confirm the `/api/resolve` rewrite in `vercel.json` points at **this**
      project. Its destination is a literal URL carrying the project ref,
      because a Vercel rewrite destination cannot read an environment variable.
      If the project ref ever changes, this line has to change with it.
- [ ] Set `VITE_HANDLE_RESOLVE=1` in Vercel and redeploy, **last**, after the
      pilot below.

### 3b. The 10 handle billing pilot

Spec section 5 requires this before opening the resolver to users. Do it after
Phase 5 deploys and before Phase 6b ships the search UI.

- [ ] Resolve exactly 10 distinct handles that are not already in `ig_profiles`.
- [ ] Read the Apify console billed event count for that run.
- [ ] Confirm it equals 10. If it is higher, the actor input is requesting more
      than profile metadata. Stop and tell me before opening it to users.
- [ ] Resolve the same 10 handles a second time. Confirm the billed count does
      not move, because cache hits must not reach Apify.
- [ ] **Also confirm the fields actually landed.** This is new and it matters.
      `select handle, display_name, is_verified, avatar_path from ig_profiles;`
      after the first pass. Every row should have a `display_name`, and any
      handle with a picture should have `avatar_path` set.

      The reason to check: the actor's output field names are read defensively
      (`fullName` or `full_name` or `name`, and four spellings for the picture),
      because Apify's Instagram actors have not been consistent about them and
      the actor's page is not reachable from the build environment. If a run
      comes back with rows whose `display_name` is empty and whose
      `avatar_path` is null, the actor is returning a spelling the function does
      not know. Send me one raw dataset item from the Apify console and it is a
      one line fix in `fromApify`.
- [ ] Confirm a rate limit reads correctly. Resolve 21 distinct handles from one
      anonymous browser; the 21st should return 429 and the UI should show a
      wait time rather than an error.

---

## 4. HikerAPI secrets to remove

`Confirmed by Phase 1.` Remove after Phase 5 deploys, not before.

Supabase dashboard, Edge Functions, Secrets. Delete:

- [ ] `HIKER_API_KEY`
- [ ] `HIKER_API_BASE`, if set. It is optional and defaults to
      `https://api.hikerapi.com`.
- [ ] `IG_PUBLIC_LOOKUP`, if set. It gates the Instagram public endpoint, which
      is the other provider being removed.

Do not remove these while the current `celestual-resolve` is still deployed. It
is live and serving. Removing the key first degrades it to the Instagram public
endpoint only.

- [ ] Cancel the HikerAPI subscription once Phase 5 is live and verified.

Nothing in the repository refers to any of these any more. Phase 5 removed the
provider, its keys, its types and its comments, and rewrote
`docs/HANDLE-RESOLVER.md` around Apify. The name survives in exactly three
places, all of them deliberate: `docs/rebuild-spec.md`, which is your document
and which I do not edit; this section, because spec section 5 requires the
secrets listed here by name; and the Phase 1 audit and `docs/deletions.md`,
which are the record of the removal.

### 4b. The old cache table, when you are ready

- [ ] `drop table celestual_handle_cache;`

Not in a migration, and not yet. `0031` reads it to carry the 40 profiles across
and then nothing reads it again, but Q7 authorised migrating out of it rather
than dropping it, the free tier has no point in time recovery, and keeping the
source until the new path has answered in production is the cheap kind of
caution. Run this once `ig_profiles` is serving and you are happy.

---

## 5. Supabase Storage

Phase 5 needs this and cannot create it. Spec section 0 keeps me out of the
project's configuration, and a bucket is configuration.

This project has zero storage buckets today. `avatars` will be the first.

**Do this before deploying the function.** Without the bucket every download
fails, which is not an outage (`ig_profile_put` stores nothing and the card
draws a monogram) but it does mean every card is faceless and every miss costs
an Apify call that produced no picture.

- [ ] Create bucket `avatars`. **Public read.**
      Supabase dashboard, Storage, New bucket, tick Public bucket.
- [ ] Nothing else to configure. A public bucket already allows anonymous read,
      and writes go through the service role key the edge function holds, so
      there is no insert policy to add and none should exist.
- [ ] The path layout is `ig/<handle>.jpg`, enforced by a check constraint on
      `ig_profiles.avatar_path`, so a row can never point at another handle's
      picture. Nothing for you to set up; it is here so the layout is written
      down somewhere you will look.
- [ ] No CSP change is needed. `vercel.json` already allows
      `img-src 'self' data: blob: https://*.supabase.co`, which is where the
      faces are served from.
- [ ] Optional, later: the bucket grows by one small JPEG per distinct handle
      ever resolved and nothing prunes it. At tens of KB each that is a long way
      from mattering, but if you ever want it swept, delete objects whose handle
      has no row in `ig_profiles`.

---

## 6. Resend

Q13 answered. The domain was read off the account and is already done:
`celestual.us`, verified, sending enabled, created 2026-07-10. There are no
stored templates on the account and there will not be: every template is code,
in `supabase/functions/_shared/mail.ts`.

- [x] The sending domain is verified. Nothing to do.
- [ ] **Set `CELESTUAL_FROM_EMAIL` to `celestual <hello@celestual.us>`** as a
      Supabase edge function secret. It is unset today, which means every sender
      falls back to `celestual <onboarding@resend.dev>`, Resend's shared sandbox
      domain. That address is rate limited, is not yours, and reads as a test
      harness in somebody's inbox.
- [ ] Make sure `hello@celestual.us` actually receives mail. The address invites
      a reply and the mail says so.
- [ ] Set `RESEND_API_KEY` as a Supabase edge function secret if it is not
      already set.

---

## 7. Edge function deploys

Two functions exist in the repo and are not deployed:
`celestual-beta-moderate` and `celestual-remind`. `celestual-relogin` was
deleted in Phase 4a per Q4. `celestual-search` is still there, still off, and
still nobody's decision; see `docs/deletions.md` group D.

**Redeploys Phases 4b and 5 need:**

- [ ] `supabase functions deploy celestual-edu-verify`
      Phase 4b. Its `verify` action now binds the campus to an identity row.
      Must happen after `0030_identity.sql` is applied.
- [ ] `supabase functions deploy celestual-resolve --no-verify-jwt`
      Phase 5. Rewritten for Apify. Must happen after `0031` is applied and
      after the `avatars` bucket exists. The `--no-verify-jwt` is required: the
      browser reaches it through the `/api/resolve` rewrite with no Supabase key
      on the request.

**Deploys Phase 6a needs:**

- [ ] `supabase functions deploy celestual-wall-moderate`
      Renamed from `celestual-beta-moderate` in Phase 6a. It had never been
      deployed and the word "beta" described nothing, so the rename was free.
      Must happen after `0032` is applied.

      This function is now the **only** path a letter reaches the wall by. It
      screens and it writes, in one request, because a screen whose verdict
      somebody else has to act on is a screen with a gap in it.

- [ ] Set `MODERATION_API_KEY` as a Supabase edge function secret. An Anthropic
      API key. **Without it every letter is held at pending and nothing is ever
      published.** That is deliberate: failing open would mean the one control
      standing between this wall and its worst day is a missing environment
      variable away from being off.
- [ ] `MODERATION_MODEL` is optional and defaults to
      `claude-haiku-4-5-20251001`, which is what spec section 9 asks for.
      Confirm the model id is still current when you deploy.

**Deploys Phase 7 needs:**

- [ ] `supabase functions deploy celestual-admin`
      Rewritten for the desk. It gains eleven `desk_*` actions over the
      rebuild's own tables and loses `delete_competitor` with the campaign.
      **Must happen after `0033` and `0034` are both applied**, in that order:
      the new actions call functions 0033 creates, and the removed one called a
      function 0034 drops.

- [ ] `supabase functions delete celestual-trial`
      Its source is gone from the repo and after 0034 its RPCs do not exist.
      Do this before applying 0034 (section 2f).

- [ ] Consider setting `CELESTUAL_ADMIN_PASSWORD`. It is not new, and the
      function still falls back to the launch password when the secret is
      unset, which means the desk is reachable by anybody who reads a commit
      from before this repository was private. The desk now shows every letter
      body, every campus address and every report on the wall, so the fallback
      is worth more than it used to be.

**Still to come:**

- [ ] Nothing until Phase 8.



---

## 8. Scheduled jobs

One cron job exists today: `celestual-mutual-dm`.

- [ ] **`select celestual_sessions_prune();`** daily. Added by Phase 4b. Deletes
      sessions a day past their thirty day expiry. Nothing breaks if it never
      runs; the table just grows.

- [ ] **`select wall_expire();`** daily. Added by Phase 6a. Closes out letters
      that have sat at `pending` for more than seven days, which happens when
      the classifier was unreachable the day they were written. Without it a
      letter can sit in the queue forever and nobody is told.

- [ ] **`select handle_search_prune();`** daily. Added by Phase 5. Deletes
      `handle_search_events` rows older than 48 hours, which is twice the
      counting window. Spec section 5. Nothing breaks if it is late; the
      counting query is bounded by its own 24 hour window either way.

---

## 9. DNS and routing

Nothing here needs DNS. What it needs is one deploy, because two of the four
changes below are in `vercel.json` and take effect only when it ships.

- [x] The `/api/resolve` rewrite. Done in Phase 5, Q8 option B, so the
      resolver's `device_id` cookie is first party rather than a cookie on
      `*.supabase.co` that Safari and Chrome drop. Its destination is a literal
      URL carrying the project ref, because a Vercel rewrite cannot read an
      environment variable: **if the project ref ever changes, this is one of
      the two places to change it** (the other is `app/vite.config.js`).
- [x] **The CSP now allows the self hosted faces.** `font-src` read
      `https://fonts.gstatic.com` and nothing else, and because `font-src` is
      set explicitly it does not fall back to `default-src 'self'`. Phase 2 self
      hosted the four faces at `/fonts`, so in production every one of them was
      blocked and the wall, Main and the signature surfaces all fell back to a
      system serif, which spec 7.2 forbids outright. It is
      `font-src 'self' https://fonts.gstatic.com` now. **This shipped broken and
      the fix needs a deploy to take effect.**
- [x] The `/beta` to `/berkeley` rewrite stays. Printed cards and flyers carry
      the old address and cannot be redeployed. It is handled in
      `app/src/main.jsx` rather than in `vercel.json`, so it survives as long as
      that file does.
- [x] `/privacy`, `/terms` and `/data-deletion` still rewrite onto the rebuilt
      static pages, and `app/vite.config.js` now mirrors those three rewrites in
      development. Without that the dev server served the SPA for every legal
      address, which is how a screenshot of `/data-deletion` came back showing
      the landing page.

**Addresses that stop resolving.** All of these fall through to the not found
page now, which is deliberate and was accepted with Q12, Q15 and Q16:

```
/trial   /recruit   /r/<code>   /<four letters>   /c/<slug>   /demo
```

The four letter matcher is the one worth naming twice: every competitor
tracking link already printed or sent in a DM stops crediting anybody. It still
loads the site.

---

## 10. Vercel environment variables

Current flags in `app/.env.example`. Each turns a scaffolded integration from its
local fallback into real behaviour.

| Variable | Now | After rebuild |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | set | unchanged |
| `VITE_SUPABASE_ANON_KEY` | set | unchanged |
| `VITE_IG_VERIFY_ENABLED` | 0 | must become 1. Spec section 4 makes the DM flow the only source of `handle_verified_at`. |
| `VITE_IG_USERNAME` | celestual.us | unchanged |
| `VITE_HANDLE_SEARCH` | 0 | leave at 0. `celestual-search` is a different feature, never deployed, and no answered question authorised deleting it |
| `VITE_HANDLE_RESOLVE` | 0 | must become 1 after the Phase 5 pilot passes |
| `VITE_RESOLVE_ENDPOINT` | unset | **leave unset.** The default `/api/resolve` is the rewrite, and the rewrite is what makes the resolver's device cookie first party. Set it only on a preview that is not behind the rewrite |

Phase 6b changes nothing in that table except which of them now matter. Three
were flagged as being `0` in production and all three are load bearing now:

- `VITE_IG_VERIFY_ENABLED` gates the DM code flow, which is the only thing that
  proves a handle. With it at `0` the takedown, the reveal and placing a ping
  are all unreachable.
- `VITE_EDU_VERIFY_ENABLED` gates the campus code. With it at `0` nobody gets
  through the wall's gate and every letter reads redacted.
- `VITE_HANDLE_RESOLVE` gates the result card and the ticker. With it at `0`
  both draw nothing, which is a designed state rather than a broken one: the
  card is a confirmation and the product works without it.

Turn the first two on with the rebuild. Turn the third on after the billing
pilot in section 3b.
| `VITE_EDU_VERIFY_ENABLED` | 0 | must become 1. Spec section 3 requires a verified `.edu` for the Wall. |
| `VITE_STRIPE_ENABLED` | 0 | blocked on Q3 |
| `VITE_STRIPE_PLAN` | 0 | blocked on Q3 |

Three of these being `0` in production is worth flagging now: the Instagram DM
verification, the `.edu` gate, and the handle resolver are all currently off.
The rebuild depends on all three being on.

---

## 10b. The visual loop, and how to re-run it

Not a launch step. Here because it is how the screenshots in `design/shots` were
made and how the next person makes them again.

```
npm run dev                      in one terminal
node scripts/preview.mjs         every route, both viewports
node scripts/preview.mjs hero    one of them
```

`scripts/shots.mjs` shoots a route as the dev server serves it, which without a
Supabase project behind it means every surface draws its empty state.
`scripts/preview.mjs` intercepts the network instead and answers from fixtures
carrying the shapes migrations 0030, 0031 and 0032 actually return, so what gets
looked at is a populated wall rather than eleven empty ones.

It expects `app/.env.local` (gitignored) pointing the integrations at a host
that does not exist, so nothing escapes the interception:

```
VITE_SUPABASE_URL=http://127.0.0.1:9/fake
VITE_SUPABASE_ANON_KEY=preview-anon-key
VITE_HANDLE_RESOLVE=1
VITE_EDU_VERIFY_ENABLED=1
VITE_IG_VERIFY_ENABLED=1
```

---

## 11. Final launch checklist

Work down it. Every step is somewhere above with the detail; this is the order.

### Before you touch anything

- [ ] **Take the backup.** Section 1. Two of the steps below cannot be undone
      and the free tier has no point in time recovery.
- [ ] **Export the four campaign rows.** Section 2f. They belong to real people
      who entered a competition and after 0034 there is no copy anywhere.
- [ ] Approve the groups still open in `docs/deletions.md`. Groups D, G and H
      are the ones nobody has answered.

### The database, in order

- [ ] `0033_the_desk.sql`. Additive, safe at any time.
- [ ] `supabase functions delete celestual-trial`.
- [ ] `0034_retire_the_campaign.sql`. **Irreversible.**
- [ ] `0035_retire_the_communities.sql`. **Irreversible**, and every table it
      drops is empty.
- [ ] The three earlier ones if they are not applied yet: `0030`, `0031`,
      `0032`, in that order, with the storage bucket from section 5 before
      `0031` is exercised.

### The functions

- [ ] `supabase functions deploy celestual-admin`. After 0033 and 0034.
- [ ] `supabase functions deploy celestual-resolve --no-verify-jwt`.
- [ ] `supabase functions deploy celestual-wall-moderate`.
- [ ] `supabase functions deploy celestual-edu-verify`.
- [ ] `supabase functions deploy celestual-notify`.

### The secrets

- [ ] `APIFY_TOKEN`. Section 3.
- [ ] `MODERATION_API_KEY`. Section 7. **Without it every letter is held at
      pending and nothing publishes**, which is the correct failure.
- [ ] `CELESTUAL_FROM_EMAIL` = `celestual <hello@celestual.us>`. Section 6.
- [ ] `RESEND_API_KEY`, if it is not already set.
- [ ] `CELESTUAL_ADMIN_PASSWORD`. Section 7. It falls back to a password that is
      in this repository's history, and the desk now shows every letter body and
      every campus address on the wall.
- [ ] Remove the HikerAPI secrets. Section 4.

### The scheduled jobs

- [ ] `celestual_sessions_prune()` daily.
- [ ] `handle_search_prune()` daily.
- [ ] `wall_expire()` daily.
- [ ] Section 8 has the rest, and the one Database Webhook that no migration
      can carry.

### The storage

- [ ] Create the public `avatars` bucket and its read policy. Section 5.

### The deploy

- [ ] Ship it. **The CSP fix in `vercel.json` only takes effect on a deploy**,
      and until it does every self hosted face is blocked in production
      (section 9).
- [ ] Turn on `VITE_IG_VERIFY_ENABLED` and `VITE_EDU_VERIFY_ENABLED`. Section
      10. Without the first, nothing can prove a handle; without the second,
      nobody gets through the wall's gate.
- [ ] Leave `VITE_HANDLE_RESOLVE` at `0` until the billing pilot passes.

### Then, and only then

- [ ] **The ten handle billing pilot.** Section 3b. Confirm the billed event
      count matches the handle count before opening the resolver to anybody.
- [ ] Turn on `VITE_HANDLE_RESOLVE`.
- [ ] Walk the routes in section 11b once, on a phone.

### 11b. The addresses to walk

Every one of these should render, and none should show the retired design.

```
/                 the hero
/place            placing one, and the result card under the field
/sky              signed out, and signed in
/berkeley         the wall, and /find, /write, /gate, /join
/optout           type a handle you do not mind losing, on a staging project
/terms  /privacy  /data-deletion
/admin            the door, then the seven sections
/nothing-here     the not found
```

---

## 12. The gates, and what they are today

Spec section 15 opens with `tsc`. There is no TypeScript in the app and adding
it is not in any phase, so Q1 substituted three commands. All three run from the
repository root.

| Command | What it checks |
| --- | --- |
| `npm run build` | the production build, which is the real compile gate |
| `npm run lint` | eslint over `app/`, with the config added in Phase 2 |
| `npm run lint:voice` | the copy tripwire, `design/VOICE.md` section 6 |

`npm run lint` reports **17 errors in 12 files** as of Phase 2, every one of
them pre-existing and every one in code the rebuild retires later:

| File | Errors |
| --- | --- |
| `app/src/components/screens.jsx` | 3 |
| `app/src/App.jsx` | 2 |
| `app/src/card/Disc.jsx` | 2 |
| `app/src/sky/gl.js` | 2 |
| `app/src/api/recruit.js`, `api/relogin.js`, `card/model.js`, `communityGalaxy.js`, `components/admin.jsx`, `galaxy.js`, `sky/engine.js`, `wall/index.jsx` | 1 each |

Sixteen were unused bindings. One is real and still open: `App.jsx` calls
`setIntent` and `setCategory` in the old landing screen, and neither is defined
in that scope. That screen is unreachable by address now, since Main owns `/`,
so it is recorded here rather than fixed inside the retired design.

Phase 8 also put `app/src/wall`, `app/src/main` and `app/src/admin` into the
voice lint, which reads **58 files** rather than 14. Those three surfaces write
their copy inline, and between them they are now most of the product's words.
It found two em dashes in aria-labels the first time it ran.

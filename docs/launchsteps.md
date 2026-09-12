# Launch steps

Everything you have to do by hand, outside the repo. Ordered.

I do not execute anything in this file. Spec section 0: I never touch Supabase
secrets, environment variables, or production data.

Each phase appends to this file as it completes. A step that is not yet written
is marked `PENDING <phase>`.

**Status: every phase is complete, and most of the schema is live.** This line
used to say nothing in the repository had been applied. That is no longer true
and had stopped being true some time ago: the database carries every migration
through 0045 and, since 9 September 2026, 0047.

Two are NOT recorded as applied, and this is the first place to look when
something in here does not match the database:

- **0038, the audit.** Not in the migration history, and yet part of it is
  live: `wall_index` is `security_invoker = false` in production, which is
  0038 line 33 and nothing else. So the history is a record of what was pushed,
  not a complete record of what was run. Read the database, not this file, when
  the answer matters.
- **0046, the opt out reaching the wall.** Not applied. Until it is, taking a
  handle off at `/optout` still leaves every letter written ABOUT that person
  standing on the wall under their name.

The migrations are written and verified against a bare PostgreSQL; section 2
says in what order to apply them, and section 11 is the checklist to work
through on the day.

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
0036_close_the_open_doors.sql            section 2i   apply FIRST, it needs nothing above
0037_resolver_cache_and_ceiling.sql      section 3a   after 0031. STOPS A LIVE BILLING LEAK
```

### 2i. The audit. Four doors that were open, and one gate that was shut.

Found by the publish-readiness audit after Phase 8. None of these wait on the
rebuild: `0036` depends only on `0001`→`0026`, which production already runs,
so it can and should go in **before** anything else in this section.

- [ ] **Apply `0036_close_the_open_doors.sql`.** Four client-callable functions
      from `0001`→`0006` are live in production today with no proof on them:
      `celestual_withdraw` (an oracle: anybody can ask whether @a pinged @b,
      be told, and delete it in the same call), `celestual_link` (anybody can
      bind a stranger's @ into their own identity group and be matched with
      whoever pinged that stranger), `celestual_erase_account` (anybody can
      wipe anybody, ten an hour), and `celestual_suppress`, which answered with
      a count of what it erased. After 0036: withdraw and erase demand the DM
      proof, link is service role only, suppress says the handle and nothing
      else. `scripts/sql/test-doors.sql` asserts all of it.

      Rows already in `celestual_handle_links` are left as they are. There is
      no way to tell which were made by their owners; the desk can look.

- [ ] **`celestual_settings.require_ig_verification` must be `'true'`.**
      `docs/SECURITY.md` has called this the release gate since 0004 and
      the wall audit of 30 August recorded it as `'false'`, and it was still
      `'false'` on 4 September. While it is false the
      server places a ping for any typed handle with no proof at all, whatever
      the client sends. One statement, SQL editor:

      ```sql
      update celestual_settings set value = 'true' where key = 'require_ig_verification';
      ```

- [ ] **Redeploy `celestual-edu-verify`.** Two reasons now. The Phase 4b bind
      (section 2b), and the sandbox's gmail carve-out, which defaulted ON and
      let one crafted `demo:true` POST verify a gmail address as Berkeley
      against the real gate. It is OFF unless `CELESTUAL_SANDBOX_GMAIL=1`.
      The `CELESTUAL_SANDBOX_GMAIL=0` step in section 11 is no longer needed.

- [ ] **Set `CELESTUAL_ADMIN_PASSWORD` BEFORE redeploying `celestual-admin`.**
      The fallback password is gone from the source. With the secret unset the
      desk refuses everybody and says so in the function log.

- [ ] **Redeploy `celestual-manychat`.** One reply still promised the
      twenty-second grace that 0026 closed.

- [ ] **The wall's gate accepted six digits and the function mints four.**
      Fixed in the client (`wall/auth.js`, `screens/Gate.jsx`); it ships with
      the front end and needs nothing from you. Until it ships, nobody can
      enter the code they were mailed.

**What the client does about a database that is behind it.** Until 0030 is
applied, `celestual_user_bind_handle` and `celestual_whoami` do not exist.
The DM proof does (it is 0004's), and it is what `celestual_submit` and
`celestual_my_pings` actually check. So the client now keeps the proof and
carries on when the identity RPC is missing, and Main reads the device's own
verified session when the server has no row. Placing a ping, the sky and the
reveal work on the layer production runs today; the wall does not, because
its tables are 0032's, and nothing client side can stand in for a table.

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
- [ ] `/api/resolve` is now `api/resolve.js`, a Vercel function, not a
      rewrite. It reads the project from `VITE_SUPABASE_URL`, which Vercel
      already has, and falls back to the ref written in the file. Nothing to
      set for that. It ships with the next deploy.
- [ ] **Set `RESOLVE_PROXY_SECRET`, the same value in two places:** a Vercel
      environment variable (all environments) and a Supabase edge function
      secret. Any long random string. Until both are set the edge function
      counts Vercel's egress as every visitor's address, which is what the
      audit found it had been doing all along: `docs/HANDLE-RESOLVER.md` 6b.
- [ ] Set `VITE_HANDLE_RESOLVE=1` in Vercel and redeploy, **last**, after the
      pilot below.

### 3a. The 4 September audit. Apply these now; the resolver is live.

`VITE_HANDLE_RESOLVE` has been `1` since 30 August, so everything below is
running on production traffic.

- [x] **Apply `0037_resolver_cache_and_ceiling.sql`.** Applied 4 September, 03:35 UTC. It stops the leak: a row
      whose picture never downloaded was stale from birth and re-ran the actor
      on every lookup. 30 of the 50 rows were in that state; `supabase` had
      been billed 8 times, `david` 6, `ace` 4. After 0037 a face-less row is a
      cache hit and retries its picture weekly at most. It also adds the
      `global` key, 1000 calls a day across everybody, the first thing that
      bounds the bill rather than one actor.
- [x] **Redeploy `celestual-resolve`.** Version 9, 4 September. Counts misses, distinguishes a timeout
      from a miss, gives the run a 30 second timeout on Apify's side so an
      abandoned run is killed rather than billed, sends `maxItems=1`, refuses
      to cache an empty item, reports `provider` beside `cached`, and reads the
      proxy secret.
- [ ] **Deploy the app.** Merges with PR #98. Brings `api/resolve.js`, and the rule that a field
      asks Apify only when a person presses: typing only peeks the cache.
- [ ] **Set `RESOLVE_PROXY_SECRET`** on both sides, above.
- [ ] Then read the `ip` rows in `handle_search_events` after a lookup from a
      phone: they should be the phone's address, not an AWS one.

### 3b. The 10 handle billing pilot

Spec section 5 requires this before opening the resolver to users. Do it after
Phase 5 deploys and before Phase 6b ships the search UI.

- [ ] Resolve exactly 10 distinct handles that are not already in `ig_profiles`.
- [ ] Read the Apify console billed event count for that run.
- [ ] Confirm it equals 10. If it is higher, the actor input is requesting more
      than profile metadata. Stop and tell me before opening it to users.
- [ ] Resolve the same 10 handles a second time. Confirm the billed count does
      not move, because cache hits must not reach Apify. Every second pass
      answer should carry `provider: false`; that field, not `cached`, is the
      one that says whether Apify was reached. The first pilot, before 0037,
      showed 12 billed for 10 handles: `vercel` once more because its first run
      blew the timeout and was billed anyway, `supabase` once more because its
      face-less row was never a cache hit.
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

- [x] `/api/resolve`. Done in Phase 5, Q8 option B, so the resolver's
      `device_id` cookie is first party rather than a cookie on `*.supabase.co`
      that Safari and Chrome drop. It was a rewrite; since the 4 September
      audit it is `api/resolve.js`, a Vercel function, because a rewrite handed
      the edge function Vercel's egress as every visitor's address (section
      3a). The function reads the project from `VITE_SUPABASE_URL`. **If the
      project ref ever changes**, `app/vite.config.js` reads the same variable
      and the fallback literal in `api/resolve.js` is the one line to update.
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
| `VITE_RESOLVE_ENDPOINT` | unset | **leave unset.** The default `/api/resolve` is the Vercel function, and that is what makes the resolver's device cookie first party and its address the visitor's. Set it only on a preview that is not behind it |
| `RESOLVE_PROXY_SECRET` | unset | **must be set**, and the same value set as a Supabase edge function secret. Section 3a |

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

- [ ] `0036_close_the_open_doors.sql`. Section 2i. Needs nothing else applied
      first, and closes three doors that are open right now.
- [ ] `update celestual_settings set value = 'true' where key = 'require_ig_verification';`
- [ ] `0033_the_desk.sql`. Additive, safe at any time.
- [ ] `supabase functions delete celestual-trial`.
- [ ] `0034_retire_the_campaign.sql`. **Irreversible.**
- [ ] `0035_retire_the_communities.sql`. **Irreversible**, and every table it
      drops is empty.
- [ ] The three earlier ones if they are not applied yet: `0030`, `0031`,
      `0032`, in that order, with the storage bucket from section 5 before
      `0031` is exercised.

### The functions

Every function deployed today predates the rebuild (deployed 30 July to 30
August; every rebuild phase was committed 2 and 3 September), so all of these
are real redeploys, not formalities.

- [ ] `supabase functions deploy celestual-admin`. After 0033 and 0034, and
      after `CELESTUAL_ADMIN_PASSWORD` is set (section 2i).
- [x] `supabase functions deploy celestual-resolve --no-verify-jwt`. After
      0037. Section 3a. Deployed 4 September (version 9), with
      `celestual-manychat` (19) and `celestual-ig-webhook` (17) for the
      verified DM's new wording.
- [ ] `supabase functions deploy celestual-wall-moderate`.
- [ ] `supabase functions deploy celestual-edu-verify`.
- [ ] `supabase functions deploy celestual-notify`.
- [ ] `supabase functions deploy celestual-manychat`.

### The secrets

- [ ] `APIFY_TOKEN`. Section 3.
- [ ] `RESOLVE_PROXY_SECRET`, in Supabase and in Vercel. Section 3a.
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


---

## The audit of 4 September (migration 0038)

Everything the audit found in the repository is fixed in the repository; three
things have to happen outside it.

1. **Apply `0038_the_audit.sql`.** `supabase db push`, or paste it into the SQL
   editor. It is `create or replace`, `alter` and guarded blocks only; it creates
   no table. Until it is applied, the wall at `/berkeley` draws **zero names for
   every visitor** (the `wall_index` view was `security_invoker` over tables
   `anon` cannot read), and every one tap report fails. Those two alone make
   this the first thing to do.
2. **Redeploy three functions**, after the migration:
   `celestual-notify` (it claims rows through `celestual_notify_take` now and
   answers 500 without it), `celestual-edu-verify` (six digit codes, the try
   spent before the code is compared) and `celestual-wall-moderate` (the
   classifier call is bounded; a timeout is a review). The client accepts a four
   or six digit campus code, so the order of the client deploy and the function
   deploy does not matter.
3. **Check the release flag.** `require_ig_verification` is what makes
   `celestual_submit` demand the DM proof. This audit made the proof
   unconditional in `celestual_renew`, `celestual_ping_status`,
   `celestual_card_photo` and `celestual_card_photo_put` (0038 §7), but
   `celestual_submit` still reads the flag, and this document has said since
   section 2 that it must be `true` before any real launch:

   ```sql
   select value from celestual_settings where key = 'require_ig_verification';
   -- if it is not 'true', anybody can place a ping as anybody:
   update celestual_settings set value = 'true' where key = 'require_ig_verification';
   ```

4. **Set the secrets the wall and the mail depend on.** Under Edge Functions →
   Secrets (or `supabase secrets set`). Without `MODERATION_API_KEY` (an
   Anthropic Console key) `celestual-wall-moderate` answers `review` for every
   letter, so every letter lands as `pending` and nothing reaches the wall
   until somebody publishes it at `/admin`; that is by design, and it is also
   why a wall with no key on it looks empty. Without `RESEND_API_KEY` and
   `CELESTUAL_FROM_EMAIL` (a sender on a verified Resend domain) no campus code
   is mailed, so nobody passes the gate, and no mutual mail goes out. As of
   this audit, production has sent one campus code ever and verified none, so
   check those two first. `MODERATION_MODEL` is optional and defaults to the
   cheapest current model.

The sweeps (`celestual_purge_expired`, `wall_expire`, `celestual_sessions_prune`,
`handle_search_prune`) are scheduled by 0038 itself where `pg_cron` is installed;
on Supabase that is `create extension pg_cron` under Database → Extensions,
before the migration runs, or run the migration's last block again after.

Still open, and not in the repository's power to close:

- **The sign in link is dead.** `/signin` redeems `celestual_redeem_login`, which
  0029 grants to `service_role` only, and nothing mints a row in
  `celestual_login_links` or mails one. Every link says "lapsed". Section 9 above
  is what closing it needs; until then the page is honest about the four things
  that can happen and the comment in `api/relogin.js` says why.
- **`npm run lint` is green** for the first time since Phase 2. Keep it that way:
  it is the typecheck substitute Q1 agreed to.

---

## The desk's second sitting (migration 0039)

Everything is in the repository; three things have to happen outside it, in
this order.

1. **Apply `0039_the_desk_second_sitting.sql`.** `supabase db push`, or paste
   it into the SQL editor. It drops the one-argument `celestual_suppress` and
   creates the two-argument one, creates `celestual_desk_log`, and is otherwise
   `create or replace`. Until it is applied the desk's new screens answer "the
   database did not answer", `/optout` refuses everybody (the client sends a
   proof the old function does not take), and `/signin` still refuses every
   link.
2. **Redeploy two functions.** `supabase functions deploy celestual-admin` and
   `supabase functions deploy celestual-resolve --no-verify-jwt`. The admin
   function carries the new actions and writes the log; the resolver honours
   the switch.
3. **Deploy the app.** Vercel, as usual. Nothing new in its environment: the
   resolver switch and the caps are rows now, not variables.

Then, on the desk: settings, and confirm the release gate reads as you mean
it. The first sign in link you mint is the test of the whole path: open it in
a private window and the sky should be yours.

## The wall suggests (migration 0040)

One migration and the app. Nothing to redeploy on the function side.

1. **Apply `0040_the_wall_suggests.sql`.** `supabase db push`, or paste it
   into the SQL editor. It re-emits `wall_search` (from the first character,
   ranked, with the resolver's name and face joined on for every name it
   lists) and adds `wall_pulse`. Both are readable by the browser; both read
   the public index and nothing else. Until it is applied the wall's search
   still works on the old function, without faces in one request, and the
   front door shows no notice, because there is no pulse to read.
2. **Deploy the app.** Vercel, as usual. The front door's bar no longer
   links to the wall: the notice at the foot of the fold does, while the
   campus is open, and it comes down on its own when the desk closes the
   campus.

## The code that did not match (migration 0041)

One migration, two functions, and the app.

1. **Apply `0041_the_code_that_did_not_match.sql`.** `supabase db push`, or
   paste it into the SQL editor. It adds two columns to
   `celestual_ig_verifications` and re-emits `celestual_complete_ig_verification`
   and `celestual_poll_ig_verification`. Until it is applied a wrong code from
   an account that has ever verified is still answered "already verified", and
   the app cannot be told about a wrong code at all.
2. **Redeploy `celestual-manychat` and `celestual-ig-webhook`.** The replies
   changed: each one now describes the DM that was sent, and the wrong-digits
   case has a line of its own on the direct webhook where it used to be silent.
   `supabase functions deploy celestual-manychat --no-verify-jwt` and
   `supabase functions deploy celestual-ig-webhook --no-verify-jwt`.
3. **Deploy the app.** Vercel, as usual. The proof step draws "that code
   didn't match. send this one." under the code when the poll carries the
   note; an app deployed before the migration draws nothing there, and an app
   deployed after it against an unmigrated database does the same.

The test of the whole path: mint a code on the site, DM a different four
digits from the same account, and read the same sentence on Instagram and
under the code on the screen. Then send the right one.

## The five cards (migration 0047)

Five printed ad cards, a code each, a route of our own in the QR, and a screen
on the desk that says which of them actually brought somebody in. One
migration, the admin function, and the app.

**Why.** The attribution the wall has had since 0032 counts scans and letters
and nothing between them, which is not enough to choose between five pieces of
paper: a card that put forty people on the wall and no letters up read as worse
than one nobody scanned. And the cards carried `/berkeley?s=<code>` in the QR,
which pointed them at one surface for as long as the paper existed.

The addresses, one per card, and they are what goes in the QR:

```
https://celestual.us/c/a
https://celestual.us/c/b
https://celestual.us/c/c
https://celestual.us/c/d
https://celestual.us/c/e
```

Sixteen characters, which is the smallest QR symbol there is: fatter modules,
read from further away by a worse phone. Encode the string in UPPERCASE
(`HTTPS://CELESTUAL.US/C/A`) and it is smaller again, because a QR encoder has
an alphanumeric mode with no lowercase in it that packs about a third more into
the same symbol. A domain is case blind and the route lowercases the code, so
both forms work. A shorter domain pointed at the same deployment would print as
`<name>/c/a` and needs one line changed: `SITE` in `app/src/cards.js`.

**Status: applied on 9 September 2026.** The migration is in the database
(recorded as `the_five_cards`) and `celestual-admin` is deployed with it
(version 15). What is left is the app deploy, step 3.

1. **Apply `0047_the_five_cards.sql`. DONE.** It adds `wall_cards` (the
   registry, seeded with `a` through `e`),
   `wall_card_events` (the four steps between a scan and a letter),
   `wall_card_step` for the browser, and `celestual_desk_cards` and
   `celestual_desk_card_set` for the desk. Nothing existing is changed and no
   data is touched. Verified by `scripts/verify-migrations.sh --test`
   (`test-cards.sql`, 30 assertions).
2. **Redeploy `celestual-admin`. DONE.** It gains `desk_cards` and
   `desk_card_set`. The deployed source was read back and matches this
   repository byte for byte; `verify_jwt` is still on.
3. **Deploy the app.** Vercel, as usual. `/c/<code>` resolves before anything
   mounts and needs no rewrite rule: `vercel.json` already sends every path to
   the SPA. Until this lands, the five addresses draw the wall's own not found:
   the database is ready and the route is not there yet.

Everything is additive and the order is forgiving. An app deployed before the
migration lands still routes every card to the wall and still logs the scan;
the four steps are answered `logged: false` until the registry exists. A desk
opened before the app is deployed shows the five rows with the funnel on them.

Checked against the live database after the apply: five cards seeded and no
sixth, `celestual_desk_cards` answering five rows, the browser able to log a
step and unable to read either table or the desk, RLS on both, and a code that
is not one of the five answered `logged: false` with nothing written.

Then, on the desk: open **the cards** under the wall, name each card and say
where it is standing, and read the table. It is ordered best first, and best
is `joined`: a campus address or a handle proved after that code was scanned.
Scans alone measure the corridor the card is taped to.

The test of the whole path: open `celestual.us/c/a` on a phone, land on the
wall, open a letter, and put an address into the gate. Three rows appear
against card a on the desk within the minute: the scan, `read one`, and
`asked`. Type the code back and `joined` follows.

**To point a card somewhere else**, change its `to` in `app/src/cards.js` and
deploy. The paper stays good, which is the whole reason the route exists.

## The opt out reaches the wall (migration 0046)

Taking a handle off celestual takes it off both surfaces. One migration and the
app. No new tables.

**Why.** The opt out is the one irreversible promise this product makes to
somebody who never asked to be in it, and it reached half of it. On Main it
erased the pings both ways, the mutuals, the membership and the identity row.
On the wall it erased what that person had written, through the cascade off
`celestual_users`, and left every letter written about them standing under
their own name on a public index. The person the opt out exists for could take
their @ off, read a screen saying every ping was gone, and still find their
name drifting in the inscription.

1. **Apply `0046_the_opt_out_reaches_the_wall.sql`.** `supabase db push`, or
   paste it into the SQL editor. It re-emits four functions and adds no tables:
   `celestual_suppress` (takes every letter to the handle down, on every
   campus), `wall_name_shut` (the suppression list first, so `wall_write`
   refuses the name for good), `celestual_desk_letter_set` and
   `celestual_desk_report_resolve` (neither can put such a letter back up).
   Verified by `scripts/verify-migrations.sh --test`
   (`test-optout-wall.sql`, 21 assertions).
2. **Deploy the app.** Vercel, as usual. `/optout` says the wall is included,
   the wall's own takedown offers the fuller door, and the three legal pages
   say what the act now covers.

Order does not matter much: the migration alone is the whole behaviour, and
the app alone only changes what four screens say. Applying the migration first
is the honest way round, since the pages describe what it does.

The test of the whole path: put a letter up to a spare handle at
`/berkeley/write`, confirm the name is on the wall, take that handle off at
`/optout` from the account that owns it, and reload `/berkeley`. The name
should be gone from the inscription and from the search, and writing to it
again should be refused.

## Eight before the door (migration 0049)

The free reads go from five to eight. One migration, and no app change: the
allowance is one function (`wall_free_allowance()`) and everything 0045 built
reads its ceiling from it, so the meter, the key and the reads are as they
were and a browser that has spent five has three left.

1. **Apply `0049_eight_before_the_door.sql`.** Applied 12 September 2026, and the
   moderation function redeployed the same day. `supabase db push`, or paste it
   into the SQL editor. Re-runnable. Nothing else has to move.

## Five before the door (migration 0045)

The first five letters anybody reads are free, whoever they are, and the sixth
is blurred with the gate on it. One migration and the app. No function changes.

**Why.** 0044 opened reading to either proof and left everybody else at a wall
of struck-out words, which asks somebody to answer for something before they
have read a sentence of it. The wall's own words are the only argument for
signing in that was ever going to work, so it gets to make it five times first.

1. **Apply `0045_five_before_the_door.sql`.** `supabase db push`, or paste it
   into the SQL editor. It adds `wall_free_reads` (one row per browser key per
   letter, at most five per browser, no identity on it) and six service-role
   functions around it, and re-emits `wall_letters_for` and `wall_letter` to
   spend one per letter handed over. Both stop being `stable`: spending a read
   is a write, and it happens on the read that hands the letter over. Verified
   end to end by `scripts/verify-migrations.sh --test`
   (`test-free-reads.sql`, 39 assertions).
2. **Deploy the app.** Vercel, as usual. It draws five marks under the letter,
   struck as they go, and blurs the redaction rather than striking it out.

Order matters slightly here, and only in one direction: an app deployed before
the migration asks for keys the old functions do not return, draws no meter,
and behaves exactly as 0044 left it. A migration applied before the app opens
five letters to every visitor immediately and the meter arrives with the
deploy, which is the harmless way round.

The test of the whole path: open `/berkeley` in a private window, walk six
different names, and watch the marks go out one at a time. The fifth card
should say "that was the last free one" and the sixth should arrive blurred
with "read it" under it. Sign in, and the sixth comes back.

If a browser needs its five back for a demo, clearing site data is the
supported way. There is deliberately no function that resets somebody else's.

## The reading room, and three a week (migration 0044)

Two changes pulling opposite ways: the door to reading opens, and the door to
writing gets a meter. One migration, one function, and the app.

**Why.** `wall_gate` answered three questions and should have answered one.
A person who had proved their Instagram handle, this product's own proof,
arrived at `/berkeley` signed in and was handed a wall of struck-out words with
no way to open one, under the line "sign in to read the letters". That was
twenty-five of the twenty-seven identity rows in production.

1. **Apply `0044_the_reading_room_and_the_three.sql`.** `supabase db push`, or
   paste it into the SQL editor. It adds `wall_read_gate(user, campus)`, which
   takes either proof (a campus address, a subdomain of it or a pass, OR
   `handle_verified_at`), and re-emits `wall_letters_for`, `wall_letter`,
   `wall_heart` and `wall_report` to ask it. `wall_gate` is untouched and is
   the WRITE gate alone. It also adds the allowance:
   `wall_letter_allowance()`, `wall_letter_window()`, `wall_letters_spent()`
   and the client-callable `wall_quota(token)`, and re-emits `wall_write` to
   refuse the fourth letter in seven days with `cap`. Verified end to end by
   `scripts/verify-migrations.sh --test` (`test-reading-room.sql`, 36
   assertions).
2. **Redeploy `celestual-wall-moderate`.** It asks `wall_quota` before it
   spends a classifier call, so a writer with none left is told at once and
   nobody pays for the model call. `supabase functions deploy
   celestual-wall-moderate`. `wall_write` refuses the fourth either way, so
   an old function against the new schema is correct and only slower.
3. **Deploy the app.** Vercel, as usual.

Order does not matter much: an app deployed before the migration draws no
meter (`wall_quota` is missing, the read fails, and the composer simply does
not draw a number) and reads exactly as it did. A migration applied before the
app opens the letters to every handle-verified person immediately, which is
the point.

The test of the whole path: sign in on Main with the DM code, open
`/berkeley`, and read a letter without ever giving an address. Then open the
composer: it should still say the letters are written by Berkeley. On a campus
address, write three letters: the composer's foot says nothing about the
count while any are left, and after the third it says the limit is reached
and the act goes dark; a fourth press is refused before it is written.

## The pass list (migration 0043)

Who is let through without the campus code's domain rule or the DM. One
migration, two functions, and the app. Everything is additive: until the
migration lands the desk's access screen says the list could not be read and
every attempt is asked for the real thing.

1. **Apply `0043_the_pass_list.sql`.** `supabase db push`, or paste it into
   the SQL editor. It adds `celestual_passes` and the desk's three calls on
   it, re-emits `celestual_user_bind_edu`, `wall_gate` and
   `celestual_desk_signin` to take an address on the list as a campus one,
   loosens the shape check on `celestual_users.edu_email` to any well formed
   address (the bind function is the rule now), and re-emits
   `celestual_start_ig_verification` to write a passed handle's verification
   on the spot, marked `pass`. Verified end to end by
   `scripts/verify-migrations.sh --test` (`test-pass.sql`, 29 assertions).
2. **Redeploy `celestual-admin`.** It gains `desk_passes`, `desk_pass_add`
   and `desk_pass_remove`. `supabase functions deploy celestual-admin`.
3. **Redeploy `celestual-edu-verify`.** An address that is not at the campus
   is asked of the list before it is refused, and the code goes to that
   inbox. `supabase functions deploy celestual-edu-verify`.
4. **Deploy the app.** Vercel, as usual.

Then, on the desk's access screen, put your own address on the list. The
wall's gate takes a whole address typed with its @, mails the code to it,
and opens once the code is typed back. Put a handle on the list and the
third step of placing a ping, the sky's sign in, the opt out and the wall's
takedown all prove it the moment it is typed, with no DM. Take a row off and
the next attempt is asked for the real thing again.

## The hearts and the faces (migration 0042), and the private account

One migration, one function, and the app. Everything is additive: an app
deployed before the migration draws no hearts and peeks one face at a time,
exactly as it did.

1. **Apply `0042_the_hearts_and_the_faces.sql`.** `supabase db push`, or
   paste it into the SQL editor. It adds `wall_hearts` and `wall_heart`,
   re-emits `wall_letters_for`, `wall_letter` and `celestual_my_pings` with
   the resolver's name, badge and face beside every handle they name (and
   `hearts` and `hearted` on every letter), and adds `ig_profile_peek` for the
   service role. Verified end to end by `scripts/verify-migrations.sh --test`
   (`test-hearts.sql`, 31 assertions).
2. **Redeploy `celestual-resolve`.** Two things changed in it.
   `supabase functions deploy celestual-resolve --no-verify-jwt`.
   - **The private account** (docs/HANDLE-RESOLVER.md section 4b). An item
     the first actor could not see into is no longer read as "no account by
     that name": it is put to a second actor, `apify~instagram-profile-scraper`,
     which reads the profile header Instagram keeps public for a private
     account. No new secret is needed; the same `APIFY_TOKEN` runs it.
     `APIFY_PROFILE_ACTOR_ID` is optional, to point the second look at another
     actor or to switch it off with an empty string. Check the token is
     allowed to run actors under `apify/`, which a token scoped to one actor
     may not be.
   - **The batched peek.** `{ handles: [...], peek: true }` answers up to
     twenty-four handles from the cache in one call, and a single peek no
     longer resolves the session token before reading the cache. Against a
     database without 0042 the batch answers every handle as unknown, and the
     app draws monograms until the migration lands.
3. **Deploy the app.** Vercel, as usual.

The test of the whole path: open a letter on the wall through the gate and
press the heart, then open the same letter from another verified browser and
read the count; and type a private account's handle into the front door and
watch the card come back as that person.

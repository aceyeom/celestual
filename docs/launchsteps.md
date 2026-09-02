# Launch steps

Everything you have to do by hand, outside the repo. Ordered.

I do not execute anything in this file. Spec section 0: I never touch Supabase
secrets, environment variables, or production data.

Each phase appends to this file as it completes. A step that is not yet written
is marked `PENDING <phase>`.

Status: Phases 2 and 3 complete, Phase 3 approved. Phase 4a complete.
Everything else fills in as phases land.

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

## 0c. What Phase 6b inherits from Phase 3

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

### 2e. Phase 6b and later

`PENDING.` New migrations from Phase 6b onward are listed here in apply order as
each phase lands.

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

`PENDING Phase 8.` Blocked on Q13.

- [ ] Confirm the sending domain and from address.
- [ ] Verify the domain. DNS records, SPF and DKIM.
- [ ] Confirm which of the five senders in
      `supabase/functions/_shared/mail.ts` survive the rebuild.
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

**Still to come:**

- [ ] Nothing until Phase 7.



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

`PENDING Phase 8.`

- [ ] If Q8 resolves to option B, add a Vercel rewrite so the resolver is reached
      through `celestual.us` and its `device_id` cookie is first party.
- [ ] Keep the `/beta` to `/berkeley` rewrite. Printed cards and flyers carry the
      old address and cannot be redeployed. It is handled in `app/src/main.jsx`,
      not in `vercel.json`, so it survives as long as that file does.
- [ ] Confirm `/privacy`, `/terms`, and `/data-deletion` rewrites still point at
      the rebuilt pages.

---

## 10. Vercel environment variables

`PENDING Phase 6b.`

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
| `VITE_EDU_VERIFY_ENABLED` | 0 | must become 1. Spec section 3 requires a verified `.edu` for the Wall. |
| `VITE_STRIPE_ENABLED` | 0 | blocked on Q3 |
| `VITE_STRIPE_PLAN` | 0 | blocked on Q3 |

Three of these being `0` in production is worth flagging now: the Instagram DM
verification, the `.edu` gate, and the handle resolver are all currently off.
The rebuild depends on all three being on.

---

## 11. Final launch checklist

`PENDING Phase 8.`

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

Sixteen are unused bindings. One is real and worth carrying forward: `App.jsx`
lines 1544 and 1545 call `setIntent` and `setCategory`, neither of which is
defined in that scope. It is in the old landing screen, which Phase 6b rebuilds,
so it is recorded here rather than fixed out of phase.

The gate for a phase is that this number does not go up. Phases 2 and 3 add
none.

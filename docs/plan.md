# Celestual rebuild plan

Companion to `docs/rebuild-spec.md`. Read both before any phase.

Phase 1 is an audit. Nothing below has been executed. No application code,
migration, config, or database object was created, modified, or deleted.

---

## 1. What the audit found

Nine findings change the shape of the plan. Each is evidenced.

### 1.1 The addresses in the spec are stale

Spec section 1 says the new work is at `/beta` and `/orbit`.

In the repo it is at `/berkeley`. `app/src/wall/router.js:23` sets
`BASE = '/berkeley'` and `LEGACY_BASE = '/beta'`. `app/src/main.jsx:44` rewrites
`/beta` onto `/berkeley` in history before mount, because printed cards carry the
old address.

`/orbit` is not a top level route. It is `/berkeley/orbit/:id`, one of nine
sub-routes of the wall (`app/src/wall/router.js:42`).

Everywhere this plan says "the Wall" it means `/berkeley`. Everywhere it says
"Orbit" it means `/berkeley/orbit`.

### 1.2 The Wall and Orbit reach no server at all

This is the largest finding.

`app/src/wall/data.js:3` states it directly: "Everything here is in memory. This
build is a visual prototype: it reaches no server, it stores nothing anybody
typed anywhere but this tab."

`app/src/wall/orbit.js:28` repeats it for the core service: "They reach no
server, because there is no server here."

`app/src/wall/auth.js:47` says the same about the `.edu` gate: "Nothing is sent
and no code is checked."

`app/src/wall/moderate.js:37` says the same about moderation: layer 1 regex runs
in the browser, "Layers 2 and 3 are drawn honestly and say so on the screen."

State lives in one `localStorage` key, `celestual.wall.v5`
(`app/src/wall/store.js:9`), seeded from `app/src/wall/seed.js`.

The `beta_*` tables exist in production and hold zero rows. Nothing writes to
them. The wall has never persisted a byte.

Consequence: spec Phase 6 is described as "wiring the approved signature
surfaces to real data". For the Wall there is no data layer to wire to. It has
to be built. This is the single biggest underestimate in the spec's phase
breakdown.

### 1.3 The repo migrations do not describe production

The repo has 28 numbered migrations, `0001` through `0028`. Production's
migration history has five rows, with different names and different versions:

| version | name |
| --- | --- |
| 20260704035758 | ping_model |
| 20260704040149 | lock_internal_helpers |
| 20260717010302 | verification_hardening |
| 20260719082701 | adopt_sender_and_email_login |
| 20260830143432 | handle_resolver |

Two of those five names have no corresponding file in the repo at all:
`lock_internal_helpers` and `adopt_sender_and_email_login`.

Comparing every table and function in the repo migrations against every table and
function in production:

**In production, created by no migration file in this repo:**

- table `celestual_email_identities`
- table `celestual_login_links`
- function `celestual_bind_login_email(text, text, text)`
- function `celestual_login_lookup(text)`
- function `celestual_redeem_login(text, text)`

**In the repo, absent from production:**

- function `celestual_handle_route(text)`, defined in
  `supabase/migrations/0015_identity_start.sql:45`

Nine other repo objects are absent from production correctly, because
`0006_ping_model.sql` drops them on purpose (`celestual_profiles`,
`celestual_user_keys`, `celestual_slots`, `celestual_reminders`,
`celestual_check_many`, `celestual_my_sky`, `celestual_delete_me`,
`celestual_request_reminder`, `celestual_touch_updated_at`). Those are not drift.

Consequence: `0015_identity_start.sql` was never applied. Applying the repo's
migration set to a fresh database does not reproduce production, and applying it
to production would fail or diverge. Spec section 11 says "migrations must be
current". Making them current requires a reconciliation step before any new
schema is written. That step is not in the spec's Phase 4.

### 1.4 Four edge functions in the repo are not deployed

Repo has 14 function directories. Production has 10.

Not deployed: `celestual-beta-moderate`, `celestual-relogin`, `celestual-remind`,
`celestual-search`.

`celestual-beta-moderate` is the server half of wall moderation. Spec section 9
depends on it. It exists as source and has never run.

`celestual-relogin` is the only caller of `celestual_handle_route`, which is the
function missing from production. Both halves of that feature are dark, which is
consistent rather than broken.

### 1.5 There is no TypeScript in the application

`app/` contains zero `.ts` or `.tsx` files and no `tsconfig.json`. The SPA is
`.js` and `.jsx`, built by Vite with `@vitejs/plugin-react`. There is no
`typescript` dependency and no typecheck script.

The only TypeScript in the repo is the Deno edge functions under
`supabase/functions/`, which Supabase typechecks at deploy.

Spec section 0 says "Build and typecheck must pass before you commit". Spec
section 15 says "`tsc` passes with no new errors". Neither is satisfiable as
written. See open question Q1.

### 1.6 No Supabase Storage bucket exists

`storage.buckets` holds zero rows. No code anywhere calls `storage.from(...)`.

Card photographs are not stored in Storage. They go through the RPCs
`celestual_card_photo_put` and `celestual_card_photo` as encoded text on a table
row.

Consequence: the `avatars` bucket in spec section 5 is the first bucket the
project will ever have. Its creation, its public read policy, and the CSP change
to allow it are all new work, and the CSP in `vercel.json` already allows
`img-src https://*.supabase.co`, so that part is covered.

### 1.7 The handle resolver already exists, with different rules

Spec section 5 reads as greenfield. It is not.

`supabase/functions/celestual-resolve/index.ts` is deployed and live. It backs
two production tables:

- `celestual_handle_cache`, 40 rows. Columns `handle, found, display_name,
  is_verified, is_private, pic_url, source, fetched_at`.
- `celestual_handle_lookups`, 41 rows. Columns `id, device, ip, handle, billed,
  created_at`.

Its behaviour differs from the spec on five points:

| | Existing | Spec section 5 |
| --- | --- | --- |
| Providers | Instagram public endpoint, then HikerAPI | Apify only |
| Avatar | Proxied live on every request, never stored | Downloaded once, stored in Storage |
| Cache TTL | 24h on a hit, 1h on a miss, swept at 7 days | Kept indefinitely |
| Device cap | 30 distinct handles per day | 20 per day |
| IP cap | 300 per hour and 1500 per day | 200 per day |

The existing function already implements the spec's most important rate limiting
rule. `overCap` at `celestual-resolve/index.ts:285` counts only rows with
`billed = true`, so cache hits are free. That logic transfers.

The spec's tables `ig_profiles` and `handle_search_events` are renames and
reshapes of the two live tables, not new concepts.

Note also that the existing function keeps `is_private`, which the spec's field
list drops. See open question Q9.

### 1.8 Production holds user data that is not obviously fake

Spec section 11 says "All existing beta user data is fake. Delete it."

The `beta_*` tables, which are the only tables named "beta", are all empty.

The tables that hold data are the old production product:

| table | rows |
| --- | --- |
| celestual_ig_verifications | 49 |
| celestual_placements | 40 |
| celestual_members | 36 |
| celestual_handle_lookups | 41 |
| celestual_handle_cache | 40 |
| celestual_dm_contacts | 31 |
| celestual_entries | 30 |
| celestual_dm_outbox | 12 |
| celestual_attempts | 8 |
| celestual_matches | 7 |
| celestual_notifications | 4 |
| celestual_settings | 4 |
| celestual_trial_emails | 3 |
| celestual_purchases | 2 |
| celestual_edu_verifications | 1 |
| celestual_recruits | 1 |
| celestual_suppressions | 1 |

`celestual_purchases` holding 2 rows is the one that stops this phase. Those may
be real Stripe payments by real people. Supabase is on the free tier with no
point in time recovery, so a delete is final.

Nothing is deleted until you answer Q2 and Q3 and approve `docs/deletions.md`.

### 1.9 Two design systems already exist. RESOLVED: the Wall's is the one.

`docs/DESIGN.md` is 68KB and mature. It documents the production system by name,
"the bindery": a leather case, one hue, materials drawn per pixel in
`app/src/texture.js`, three type registers, and an anti generic checklist.

The Wall is deliberately a second, different brand. `app/src/main.jsx:30` says so:
"It is a second brand for the same reason the first one was: a blue-black void,
four different faces, a field of drifting points, and a cream card that is the
only bright object in it. None of that belongs in the almanac."

The same comment records that a judgement was already made between them and that
production won: "That judgement was made and the Bindery won."

Spec section 2 says the opposite, that the old design is retired and the new work
is promoted.

Spec section 7 names `design/source/eclipse.html` as the real source of truth.
That file has since been supplied and committed. Its own comment calls its
palette "The wall's own tokens and faces", and its `--void` and `--chalk` values
match `app/src/wall/wall.css` exactly.

So the question is settled: the design system being promoted is the Wall's, and
`docs/DESIGN.md` describes the system being retired. The two inputs to Phase 2
are `design/source/eclipse.html` for the mark and `app/src/wall/wall.css` for
the tokens, with the accent conflict in B4 to resolve first.

---

## 2. Blockers

Two of these stop work outright. The spec instructs a stop for the first.

### B1. RESOLVED. `design/source/eclipse.html` is in the repo.

You supplied the "Ecliptic" artifact. It is committed at
`design/source/eclipse.html`, runtime wrapper stripped, otherwise verbatim.

It is a specimen sheet for the mark, generated from `app/src/wall/art.jsx`
rather than traced from it. I verified the `ECL` constants match the build
exactly. Full detail in `docs/open-questions.md` Q0.

Superseded by B4 below, which came out of reading it.

### B4. RESOLVED. The accent is blue `#74C7DE`.

The artifact sets `--ember: #F2661E`, orange. The build sets
`--ember: var(--accent)` where `--accent: #74C7DE`, pale blue
(`app/src/wall/wall.css:79`).

Commit `d0670bf` is titled "Seven things come off, and the accent stops being
orange", so the repo moved off the artifact's orange deliberately.

`wall.css:74` states that `--accent` is the whole chromatic budget of the
product. Picking wrong repaints every coloured pixel.

Answered: the build wins. The artifact is authoritative for the mark's geometry
only. `--ash` and `--hair` follow the build with it. See `docs/open-questions.md`
Q21, and `design/DESIGN.md` section 2.4.

### B2. RESOLVED. The gate is the build, eslint and the voice lint.

Q1 answered with option A. Phase 2 added the eslint config the `lint` script
never had, and `docs/launchsteps.md` section 12 records the three commands and
the 17 error baseline a phase must not increase.

### B3. Data deletion is unresolved. Blocks Phase 4's destructive half.

See finding 1.8 and open questions Q2 and Q3. Schema work can proceed. No delete
runs until the manifest is approved.

---

## 3. Revised phase breakdown

The spec's eight phases become ten. Three changes, each justified.

- Phase 4 splits into 4a and 4b. Finding 1.3: the migration set has to be
  reconciled with production before new schema is layered onto it. Writing new
  migrations on top of a set that does not describe the database produces
  migrations that cannot be applied.
- Phase 6 splits into 6a and 6b. Finding 1.2: the Wall has no backend. Building
  one is not the same task as rebuilding a UI, and bundling them hides the size
  of the first.
- Phase 2 gains an explicit gate on B1.

Ordering is otherwise the spec's, including Phase 3 before backend work.

| Phase | Name | Depends on | Blocked by |
| --- | --- | --- | --- |
| 1 | Audit | none | done |
| 2 | Design system | 1 | done |
| 3 | Signature surfaces | 2 | done, approved |
| 4a | Migration reconciliation | 1 | done |
| 4b | Identity and session schema | 4a | none, Q5 and Q6 answered |
| 5 | Apify in, HikerAPI out | 4b | none, Q7 to Q9 answered |
| 6a | Wall backend | 4b, 5 | none, Q10 and Q11 answered |
| 6b | Wall and Main UI | 3, 6a | none |
| 7 | Admin | 6a | Q12 |
| 8 | Email, legal, routing | 6b | Q13 |

### Phase 1. Audit

Read only. Output `docs/plan.md`, `docs/deletions.md`, `docs/open-questions.md`,
skeleton `docs/launchsteps.md`, and `docs/rebuild-spec.md`. Stop.

Status: complete. No code, migration, config, or database object touched.

### Phase 2. Design system. COMPLETE.

What landed, against what this section planned:

| Planned | Landed |
| --- | --- |
| `design/DESIGN.md` | written fresh for the wall's system. The bindery text is replaced, not archived, per your answer |
| `design/VOICE.md` | rewritten. Shorter, and matched to what `voice-lint.mjs` actually enforces |
| `design/components.html` | one page, linking `wall.css` and `faces.css` rather than restating them |
| logo exports | `design/logo/`, 14 files, all generated by `scripts/export-mark.mjs` |
| Playwright | installed, plus `scripts/shots.mjs` for the 7.3 loop |

Three things this section did not anticipate:

1. **The faces had to come off the CDN.** fonts.googleapis.com is not reachable
   from the screenshot browser, so the loop was critiquing a fallback serif.
   `scripts/fetch-faces.mjs` now writes `app/public/fonts/`, 12 files and a
   `faces.css`. Spec 7.2 wants the display face subset and self hosted anyway.
   The wall itself still injects the Google stylesheet; Phase 6b switches it.
2. **The mark's geometry moved to `app/src/wall/mark.js`.** Node cannot import
   JSX, and a second copy of the constants in the exporter is a copy that
   drifts. `art.jsx` re-exports every name, so no import anywhere changed.
3. **The `lint` script had no config and no dependency**, so finding 1.5's
   "the `lint` script already exists" was true but useless. `app/eslint.config.js`
   is new, and the baseline is in `docs/launchsteps.md` section 12.

The original plan for this phase follows.

`eclipse.html` is in place.

Create `design/`. Move `docs/DESIGN.md` and `docs/VOICE.md` to `design/DESIGN.md`
and `design/VOICE.md`, rewritten against `eclipse.html`. Both are currently
referenced by `README.md` and by `scripts/voice-lint.mjs`, so those update too.

Build `design/components.html` as one standalone page: every component, color,
type scale, and state.

Export the logo as PNG plus vector. The mark is generated code, not a drawn
asset: `ECL`, `starPath` and `ringPath` in `app/src/wall/art.jsx`, specimened in
`design/source/eclipse.html`. So both exports are deterministic at any size,
and there is no vector to hunt for. `app/public/star.svg` and `app/public/og.svg`
are the older marks and are superseded.

Install Playwright and add the screenshot script the visual loop in spec 7.3
needs. Chromium is already present in this environment at
`/opt/pw-browsers/chromium`.

Exit: the three files exist, the ban list in 7.1 is encoded as a reviewable
checklist, and `components.html` has been screenshotted and viewed.

### Phase 3. Signature surfaces. APPROVED.

Two surfaces, at `/signature` and `/signature/reveal`:

| Surface | What it is |
| --- | --- |
| the Main hero | one sentence, one moving object, two doors, a great deal of room |
| the mutual reveal | the mark forming, the sentence, both cards together, the handle |

The hero's object is the mark taken apart: two orbits, drawn from the same
`ringPath()` the logo is drawn from, closing on one another until they coincide
and the star between them comes up. It answers a fine pointer and runs on its
own nine second clock where there is not one.

Q14 is answered by what got built. See `docs/open-questions.md`.

The original plan for this phase follows.

Exit condition is your approval of screenshots, not a passing build.

Two surfaces only: the Main hero, and the ping or reveal moment. Static, real
data shapes, no backend.

The existing WebGL sky under `app/src/sky/` (13 modules, roughly 4,300 lines,
with a 2D fallback in `fallback2d.js`) is a candidate to keep rather than
rewrite. Spec 7.2 asks for a WebGL point field with drift and pointer parallax.
That engine already exists and already ships a `prefers-reduced-motion` path. See
Q14 before deleting any of it.

Present and wait.

### Phase 4a. Migration reconciliation. COMPLETE.

The method changed and two findings came out of it that this section did not
anticipate. Both are recorded in `docs/launchsteps.md` section 2a.

**Method.** There is no Docker in the rebuild container, so `supabase start` was
not available. `scripts/verify-migrations.sh` stands up a bare PostgreSQL 16
under a shim supplying what a hosted project provides before the first migration
runs: the four roles, `extensions` with pgcrypto in it, an `auth` schema with the
two objects our SQL references, and Supabase's default privileges on `public`.
It applies every migration in order, then hashes the resulting schema object by
object. The same query runs against production and the two hashes are compared.

What that verifies: SQL validity, ordering, columns, constraints, indexes,
policies, grants, RLS and function bodies. What it does not: anything depending
on the real auth or storage services, or on PostgREST.

**Result.** Nine of the ten object classes match byte for byte.

| class | count | matches production |
| --- | --- | --- |
| columns | 239 | yes |
| constraints | 66 | yes |
| indexes | 85 | yes |
| policies | 2 | yes |
| views | 1 | yes |
| execute grants | 83 | yes |
| table grants and RLS | 37 | yes |
| triggers | 0 vs 1 | no, see below |
| function bodies | 83 | three differ, see below |

**Finding: `lock_internal_helpers` needed no file.** This section assumed two
migrations had to be written. Only one did. The revokes that migration performed
are already carried by `0006_ping_model.sql` and `0009_verification_hardening.sql`,
and the grant fingerprint proves it: all 83 execute grants and all 37 table grant
states produced by the repo's set match production exactly.

**Finding: `0024_the_bindery.sql` was never applied.** Production runs the
`0022_the_card.sql` version of `celestual_card_clean`, which defaults a card
ground to `ink` and rejects `leaf`, `chalk` and `hide`. This is the only real
behavioural drift in the whole schema. 0024 does nothing else, so the file stays
in the repo and applying it is a step in `launchsteps.md` rather than a decision
taken here. Finding 1.9 retires the bindery design, so it may end up moot.

**Finding: a Database Webhook that no migration can carry.** Production has a
trigger `celestual_dm_outbox_push` on `celestual_dm_outbox` calling
`supabase_functions.http_request` against the `celestual-mutual-dm` function URL.
Dashboard-created, embeds the project ref, in no file. Recorded in
`launchsteps.md` so a rebuild from this repo does not lose the mutual DM.

**Finding: the migration history table is not a record of what ran.** Five rows
against twenty-nine files, and 66 of 83 function bodies in production carry CRLF
line endings that no file here has. Most of this schema was applied by hand
through the dashboard SQL editor. The two `celestual_campus_*` functions in
production are also missing two comment lines the repo has, which is the same
cause and changes no behaviour.

**What landed.**

| Item | What |
| --- | --- |
| `supabase/migrations/0029_adopt_sender_and_email_login.sql` | the missing migration, transcribed from the live definitions of two tables and three functions |
| `scripts/verify-migrations.sh` | the harness above, re-runnable by every later phase |
| `supabase/migrations/0015_identity_start.sql` | deleted, per Q4 |
| `supabase/functions/celestual-relogin/` | deleted, per Q4 |

Deleting `celestual-relogin` orphans two live RPCs, `celestual_relogin_store` and
`celestual_relogin_redeem`, which stay in the database because Q4 did not ask for
their removal and no deletion manifest covers them. It also leaves
`app/src/api/relogin.js` invoking a function that no longer has source here. That
is deliberate and bounded: the function was never deployed, so `/signin` was
already dark, and Phase 6b rebuilds that route on the shipped
`celestual_login_lookup` and `celestual_redeem_login` path.

No production writes. Nothing was applied. The output is files plus a verified
diff.

The original plan for this phase follows.

Produce a migration set that, applied to an empty database, reproduces production
exactly. Concretely:

1. Write the two missing migrations for `adopt_sender_and_email_login` and
   `lock_internal_helpers` by reading the live definitions out of production.
2. Decide `0015_identity_start.sql`. It is in the repo, never applied, and its
   only consumer is an undeployed function. See Q4.
3. Verify by applying the full set to a local Supabase instance and diffing
   against a production schema dump.

### Phase 4b. Identity and session schema. COMPLETE.

`supabase/migrations/0030_identity.sql`, plus the browser half and the one edge
function change that makes the session real rather than a dead RPC.

**What landed.**

| Object | What |
| --- | --- |
| `celestual_users` | the row. Handle unique and canonical, `edu_email` separate, `email` a note, `edu_domain` generated as the campus key |
| `celestual_sessions` | one token across both surfaces, browser-minted, sha256 stored, thirty days |
| `celestual_user_merges` | every merge, with both rows verbatim before anything moved |
| `celestual_merge_conflicts` | the stop-and-ask, written where Phase 7 can show it |
| `celestual_user_bind_handle` | the only writer of `handle_verified_at`, and only against a live DM proof |
| `celestual_user_bind_edu` | service role only. The one caller entitled to take an address on trust |
| `celestual_user_set_email` | attaches, never merges, never looks anybody up by address. Q5 |
| `celestual_user_merge` | the rule. Older row survives. Refuses on two handles or two campuses |
| `celestual_whoami` | client-callable. The null shape for a first visit rather than an error |
| `app/src/api/identity.js` | the browser half: mint the token, hold it, and the two surface rules said once |
| `celestual-edu-verify` | its `verify` action now binds the campus to an identity |

**How content follows its identity.** Q6 says it does, and the merge finds every
foreign key pointing at `celestual_users(id)` in the catalogue rather than from a
list written here. Phase 6a's wall tables and Phase 7's reports are covered the
moment they declare the reference. A hand-maintained list would be wrong the
first day somebody forgot it and the failure would be silent. A composite
reference raises rather than being skipped, for the same reason.

**How a merge that cannot finish behaves.** The whole thing is one exception
block. A unique violation while moving content abandons the merge entire, leaves
both rows exactly as they were, and writes the pair to
`celestual_merge_conflicts`. There is no partial merge state to recover from.

**Tested, not reasoned about.** `scripts/sql/test-identity.sql` is 54
assertions run by `scripts/verify-migrations.sh --test`: the backfill and its
idempotency, both bind paths, the genuine two-row merge and the update that
looks like one, session survival through a merge, Q5's no-merge-on-plain-email,
Q6's two stop conditions in both their forms, content following through the
catalogue, the tombstone, and every check constraint.

**One place the spec is silent and the code assumed.** A session whose row
already holds a verified handle, proving a second different one, is treated as a
switch of account rather than a merge or a conflict. See Q23. It is one branch of
one function if you want it the other way.

**Reconciled against what already existed,** as this section planned. The DM code
flow is untouched, per spec section 4: `celestual_start_ig_verification`,
`celestual_complete_ig_verification`, `celestual_poll_ig_verification` and
`celestual_consume_ig_proof` are not modified, wrapped or replaced.
`celestual_members`, `celestual_ig_verifications`, `celestual_edu_verifications`,
`celestual_email_identities`, `celestual_handle_links` and `celestual_recovery`
all stand: the new table is layered over them and backfilled from them rather
than replacing them, so nothing that works today stops working. Q3's billing call
chain is untouched.

The original plan for this phase follows.

Spec sections 3 and 11.

New `users` table per spec section 3, with the merge rule. The merge rule needs
Q5 and Q6 answered before it can be implemented safely.

Reconcile against what already exists. Identity is currently spread across
`celestual_members`, `celestual_ig_verifications`, `celestual_edu_verifications`,
`celestual_email_identities`, `celestual_handle_links`, and `celestual_recovery`.
The spec's single `users` table replaces some of that and not all of it.

The DM code flow stays. Spec section 4 is explicit. It is
`celestual_start_ig_verification`, `celestual_complete_ig_verification`,
`celestual_poll_ig_verification`, `celestual_consume_ig_proof`, and the deployed
`celestual-ig-webhook` and `celestual-manychat` functions. Do not touch them
beyond pointing `handle_verified_at` at their result.

No destructive half. Q2 answered: only the `beta_*` tables, which are empty.
The existing 36 `celestual_members` and 49 `celestual_ig_verifications` rows are
kept, so the new `users` table is backfilled from them rather than created
empty, and the merge rule runs against real data on day one. Q5 and Q6 gate
this.

### Phase 5. Apify in, HikerAPI out. COMPLETE.

`supabase/migrations/0031_apify_resolver.sql`, a rewritten
`supabase/functions/celestual-resolve`, a rewritten `app/src/api/handles.js`,
the `/api/resolve` rewrite in `vercel.json` and its dev-server twin, and
`docs/HANDLE-RESOLVER.md` rewritten around the new provider.

**What changed, against what this section planned.** The plan was to rework the
function rather than replace it, keeping its billed-only rate limiting, IP
header trust ordering, provider timeouts, image size guard and normalisation.
All five of those survived. Four things went further than planned:

1. **The avatar proxy is gone, not adapted.** The old `GET ?avatar=<handle>`
   endpoint existed only because a stored CDN URL expires. With the bytes in our
   own bucket there is nothing to proxy, so the second endpoint came out
   entirely and the browser fetches the face from Supabase directly.
2. **There is no negative cache.** 0028 cached a miss for an hour. With the
   cache now permanent a stored miss would be permanent too, and the account
   somebody registers tomorrow would read as missing until a human forced it.
   Misses are held in the edge function's memory for ten minutes instead, which
   keeps a person backspacing over a typo from paying per keystroke and lets the
   fact expire on its own.
3. **`billed` is gone as a column.** The old ledger flagged which rows counted.
   The new one cannot contain a free lookup, because only a call that actually
   reached Apify ever writes a row. The rule is the same and there is less of it.
4. **The private flag came off two screens.** Spec section 5's card is avatar,
   handle, display name, badge. `is_private` is kept in the database on Q9 and
   is no longer sent to the browser, so `components/handle.jsx` and
   `wall/parts.jsx` lost the branch that drew it and the unused `resolve.private`
   string came out of `i18n/strings.js`.

**Q8 answered B, and it needed two files not one.** `vercel.json` gets the
`/api/resolve` rewrite; `app/vite.config.js` gets the same rewrite as a dev
proxy, so local development exercises the path the browser actually takes rather
than a second code path that only works on a laptop. The rewrite destination is
a literal URL carrying the project ref, because a Vercel rewrite cannot read an
environment variable. That is recorded in `launchsteps.md` as a thing to change
if the ref ever does.

**Tested.** `scripts/sql/test-resolver.sql`, 39 assertions: the three limits,
the permanent cache, the thirty day picture boundary from both sides, a failed
download keeping yesterday's face, the path constraint that stops one profile
pointing at another's picture, all three counters including that signing in does
not spend the device allowance and writes no device row, the rolling window, the
48 hour prune, and that `anon` can reach none of it.

**HikerAPI.** Gone from all code, config and runbooks. The name survives in
three places on purpose: `docs/rebuild-spec.md`, which is not mine to edit;
`launchsteps.md` section 4, because spec section 5 requires the secrets listed
there by name; and the Phase 1 audit plus `docs/deletions.md`, which are the
record of the removal. Spec section 15's criterion is read as no HikerAPI code,
client, type, call site, or comment implying it is still wired in, which is
satisfied. A literal zero-mention reading would contradict spec section 5's own
instruction to list the secrets.

**What is deliberately not done here.** The result card. Spec section 5 describes
it and spec section 8 lists it under UI scope, and this plan puts UI in Phase 6b.
Phase 5 delivers what the card renders from: a display name, a badge, and a
Supabase URL for a face that does not expire, plus `monogram()` in
`api/handles.js` for the fallback. The card itself is Phase 6b.

`celestual-search` is untouched. It contains no HikerAPI code, so spec section 5
does not reach it, and no answered question authorises deleting it. It stays
behind its off flag and stays in `deletions.md` group D.

The original plan for this phase follows.

Spec section 5.

HikerAPI's footprint is small and fully enumerated. Four files, listed in
`docs/deletions.md`. There is no HikerAPI database object: the `source` column on
`celestual_handle_cache` holds the string `hiker`, which is data, not schema.

Rework `celestual-resolve` rather than replacing it. It already implements
billed-only rate limiting, IP header trust ordering, provider timeouts, an image
size guard, and the normalisation that mirrors `celestual_norm()`. Those stay.

What changes: the provider becomes Apify, the avatar is downloaded once into the
`avatars` bucket instead of proxied live, the cache becomes permanent, the
counters move to `handle_search_events` with the spec's three key types, and the
device id moves from a client supplied string to an httpOnly cookie the function
issues.

Note the device id change is a real behaviour change. Today the client sends
`device` in the POST body (`celestual-resolve/index.ts:445`). The spec wants an
httpOnly cookie. See Q8.

`celestual-search` is dead and proposed for deletion. It is a different feature,
typeahead rather than resolution, never deployed, and behind a flag that is off.

### Phase 6a. Wall backend

New phase. Justification is finding 1.2.

Everything the Wall does in `localStorage` today has to exist on the server:
letters, claims, reveal requests, the waitlist, scan attribution, the `.edu`
gate, reporting, and takedown.

The schema exists already, unused: `beta_letters`, `beta_claims`,
`beta_reveal_requests`, `beta_waitlist`, `beta_scans`, the `beta_letters_public`
view, and `beta_remove_letter`. `0027_beta_wall.sql` is careful work. Its central
property, that the client has no grant on `beta_letters` and the view it can read
does not contain `author_handle` or `sealed_line`, is worth preserving exactly.

Deploy `celestual-beta-moderate` and put the real Haiku call behind it per spec
section 9, with rejection reasons stored rather than dropped.

Wire the real `.edu` gate to the deployed `celestual-edu-verify`.

See Q10 and Q11 on table naming and on whether the `beta_` prefix survives.

### Phase 6b. Wall and Main UI

Spec sections 6 and 8. Every page rebuilt in the Phase 2 system, wired to Phase
6a and Phase 5.

Routes in scope, current addresses:

| Route | Source | Status |
| --- | --- | --- |
| `/` | `App.jsx` landing | old design |
| `/@handle` | `App.jsx` open door | old design |
| `/berkeley` | `wall/screens/Wall.jsx` | new design, no backend |
| `/berkeley/find` | `wall/screens/Find.jsx` | new design, no backend |
| `/berkeley/letter/:id` | `wall/screens/Letter.jsx` | new design, no backend |
| `/berkeley/write/:id` | `wall/screens/Write.jsx` | new design, no backend |
| `/berkeley/gate` | `wall/screens/Gate.jsx` | new design, stub auth |
| `/berkeley/posted` | `wall/screens/Posted.jsx` | new design, no backend |
| `/berkeley/report/:id` | `wall/screens/Report.jsx` | new design, no backend |
| `/berkeley/remove/:id` | `wall/screens/Remove.jsx` | new design, no backend |
| `/berkeley/join` | `wall/screens/Join.jsx` | new design, no backend |
| `/berkeley/orbit/:id` | `wall/screens/Core.jsx` | new design, no backend |
| `/beta/*` | `main.jsx` rewrite | keep, printed cards depend on it |
| `/c/:slug` | `App.jsx` community | old design, see Q15 |
| `/optout` | `App.jsx` privacy | old design, keep |
| `/signin` | `App.jsx` signin | old design, backend not deployed |
| `/copy` | `App.jsx` copy | old design |
| `/trial`, `/recruit` | `components/trial.jsx` | proposed for deletion |
| `/:code` four letters | `App.jsx` ref | proposed for deletion |
| `/r/:code` | `App.jsx` ref | proposed for deletion |
| `/paid` | `App.jsx` paid | see Q3 |
| `/admin` | `components/admin.jsx` | Phase 7 |
| `/demo` | `App.jsx` sandbox | see Q16 |
| `/privacy`, `/terms`, `/data-deletion` | static HTML in `app/public/` | Phase 8 |

The ticker wall in spec section 8 has no current implementation. It is new.

### Phase 7. Admin

Spec section 10. Rebuild `/admin` for a non developer, covering user records,
the resolution cache, the moderation queue with rejection reasons, rate limit
status, wall submissions, and reports.

Current admin is `app/src/components/admin.jsx`, 907 lines, backed by the
deployed `celestual-admin` function and nine `celestual_admin_*` RPCs. The
reporting to removal path in the spec does not exist yet.

### Phase 8. Email, legal, routing, final launchsteps

Resend templates and the share thumbnail. The one email design is
`supabase/functions/_shared/mail.ts`, 184 lines, five senders.

Terms and Privacy rewritten. They are static files at `app/public/terms.html`,
`app/public/privacy.html`, `app/public/data-deletion.html`, served through
rewrites in `vercel.json`.

Final routing pass and the completed `docs/launchsteps.md`.

---

## 4. What Phase 1 did not do

Stated explicitly because the spec asks for it.

- No application code created, modified, or deleted.
- No migration created, modified, or deleted.
- No config file changed.
- No database object created, modified, or deleted.
- No Supabase secret or environment variable read, written, or removed.
- No production data read beyond schema metadata and row counts. No row contents
  were queried.
- Nothing deployed.

Files added by Phase 1, all under `docs/`: `rebuild-spec.md`, `plan.md`,
`deletions.md`, `open-questions.md`, `launchsteps.md`.

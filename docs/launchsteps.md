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

### 2b. Phase 4b and later

`PENDING.` New migrations from Phase 4b onward are listed here in apply order as
each phase lands.

---

## 3. Apify

`PENDING Phase 5.` Actor is `shu8hvrXbJbY3Eb9W`, per spec section 5.

- [ ] Create the Apify account and note the plan and its included event quota.
- [ ] Create an API token scoped to that actor only.
- [ ] Set it as a Supabase edge function secret. Name to be confirmed in Phase 5,
      expected `APIFY_TOKEN`.
      Supabase dashboard, Edge Functions, Secrets.
- [ ] Confirm the actor input sets the post limit to zero. Profile metadata only,
      no posts, comments, or reels.

### 3b. The 10 handle billing pilot

Spec section 5 requires this before opening the resolver to users. Do it after
Phase 5 deploys and before Phase 6b ships the search UI.

- [ ] Resolve exactly 10 distinct handles that are not already in `ig_profiles`.
- [ ] Read the Apify console billed event count for that run.
- [ ] Confirm it equals 10. If it is higher, the actor input is requesting more
      than profile metadata. Stop and tell me before opening it to users.
- [ ] Resolve the same 10 handles a second time. Confirm the billed count does
      not move, because cache hits must not reach Apify.

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

---

## 5. Supabase Storage

`PENDING Phase 5.`

This project has zero storage buckets today. `avatars` will be the first.

- [ ] Create bucket `avatars`. Public read.
- [ ] Confirm the path layout `ig/<handle>.jpg` per spec section 5.
- [ ] Set the read policy. Public read, service role write only. The edge
      function writes with the service role key, so no anon insert policy is
      needed and none should exist.
- [ ] No CSP change is needed. `vercel.json` already allows
      `img-src 'self' data: blob: https://*.supabase.co`.

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

`PENDING Phases 5, 6a, 7.`

Four functions exist in the repo and are not deployed:
`celestual-beta-moderate`, `celestual-relogin`, `celestual-remind`,
`celestual-search`.

- [ ] `celestual-beta-moderate` gets deployed in Phase 6a. It is the server half
      of wall moderation and spec section 9 depends on it.
- [ ] The other three are proposed for deletion or hold in `docs/deletions.md`
      group D. Nothing to deploy unless Q4 says otherwise.

Moderation needs an Anthropic key, per spec section 9, target model
`claude-haiku-4-5-20251001`.

- [ ] Set `ANTHROPIC_API_KEY` as a Supabase edge function secret.
- [ ] Confirm the model id is current at the time Phase 6a lands.

---

## 8. Scheduled jobs

`PENDING Phase 5.`

One cron job exists today: `celestual-mutual-dm`.

- [ ] Add the prune for `handle_search_events`, rows older than 48 hours, per
      spec section 5.

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

`PENDING Phases 5 and 6b.`

Current flags in `app/.env.example`. Each turns a scaffolded integration from its
local fallback into real behaviour.

| Variable | Now | After rebuild |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | set | unchanged |
| `VITE_SUPABASE_ANON_KEY` | set | unchanged |
| `VITE_IG_VERIFY_ENABLED` | 0 | must become 1. Spec section 4 makes the DM flow the only source of `handle_verified_at`. |
| `VITE_IG_USERNAME` | celestual.us | unchanged |
| `VITE_HANDLE_SEARCH` | 0 | removed with `celestual-search`, deletions group D |
| `VITE_HANDLE_RESOLVE` | 0 | must become 1 after the Phase 5 pilot passes |
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

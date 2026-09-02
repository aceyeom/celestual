# Launch steps

Everything you have to do by hand, outside the repo. Ordered.

I do not execute anything in this file. Spec section 0: I never touch Supabase
secrets, environment variables, or production data.

Each phase appends to this file as it completes. A step that is not yet written
is marked `PENDING <phase>`.

Status: Phase 1 complete. Steps below are what Phase 1 already knows about.
Everything else fills in as phases land.

---

## 0. Before anything

- [x] Supply `design/source/eclipse.html`. Done. Committed from the "Ecliptic"
      artifact.
- [x] Decide the beta data wipe. Done, Q2: only the `beta_*` tables, which are
      empty, so nothing is deleted.
- [x] Decide Stripe. Done, Q3: out of scope, nothing touched.
- [ ] Answer Q21, the accent colour conflict. Orange `#F2661E` from the artifact
      against blue `#74C7DE` in the build. This now blocks Phase 2.
- [ ] Answer Q1 (the `tsc` gate), Q4 (migration 0015), Q5 and Q6 (the merge
      rule).
- [ ] Approve the remaining groups in `docs/deletions.md`. Groups C and I are
      closed and need no approval.

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

`PENDING Phase 4a and 4b.`

Phase 4a has to reconcile the repo's 28 migration files against production's five
applied migrations before any new migration is written. See `docs/plan.md`
section 1.3.

Known now, ahead of that work:

- Two migrations exist in production with no file in this repo, and Phase 4a
  writes them from the live definitions: `lock_internal_helpers` and
  `adopt_sender_and_email_login`.
- `0015_identity_start.sql` is in the repo and was never applied. Q4 decides
  whether it is applied or dropped.

The applied set in production today, for reference:

| version | name |
| --- | --- |
| 20260704035758 | ping_model |
| 20260704040149 | lock_internal_helpers |
| 20260717010302 | verification_hardening |
| 20260719082701 | adopt_sender_and_email_login |
| 20260830143432 | handle_resolver |

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

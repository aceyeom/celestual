# Supabase backend

The backend for **CELESTUAL** — the ping model
([../docs/ULTIMATE-PRODUCT-FRAMEWORK.md](../docs/ULTIMATE-PRODUCT-FRAMEWORK.md)).

Everything is named `celestual_*`. The raw data is never readable by the
client: `anon` / `authenticated` get no table privileges and no RLS policy, so
the only way in is the `SECURITY DEFINER` RPCs, which return small status
objects. Since 0006, **who a ping points at is stored only as a salted hash** —
even a full dump can't read the map. See [../docs/SECURITY.md](../docs/SECURITY.md).

## Apply the schema

Idempotent migrations, applied in order:

- `migrations/0001_celestual.sql` — the original matching core (entries,
  matches, notifications, rate limiting, suppressions).
- `migrations/0002_user_accounts.sql` — the old Supabase-Auth profile layer
  (superseded; 0006 drops it).
- `migrations/0003_production_hardening.sql` — the old weekly slot budget +
  multi-account identity groups + instant reveal (slot model superseded by 0006;
  `celestual_handle_links` and group-aware matching live on).
- `migrations/0004_ig_verification.sql` — **Instagram DM handle-ownership
  verification** (no OAuth): codes + proof hashes, the `require_ig_verification`
  flag, start/poll RPCs, the service-role completion path, and the proof gate
  in `celestual_submit`.
- `migrations/0005_cross_device_sky.sql` — the old owner-gated read-back
  (superseded by `celestual_my_pings` in 0006).
- `migrations/0006_ping_model.sql` — **the current model.** Three standing
  pings, sixty-day lapse + purge, salted-hash targets, hashed opt-out,
  members/reachability, the intent line, community counters (100-floor),
  assurance-contract campus windows, and every current RPC.
- `migrations/0007_edu_verification.sql` — the school (.edu) email gate:
  one-time codes for community membership, hash-stored, service-role only
  (see docs/EDU-VERIFICATION.md).
- `migrations/0008_edu_hardening.sql` — per-IP send accounting for the .edu
  gate, so code email can't be sprayed from one machine.
- `migrations/0009_verification_hardening.sql` — **the auth-audit pass**:
  spoof-resistant rate-limit IPs (`celestual_client_ip` prefers
  `cf-connecting-ip` over the forgeable x-forwarded-for first hop), the
  verified DM session raised from 24 h to a **30-day sliding window** (active
  users never redo the DM dance), `celestual_norm` capped at Instagram's
  30-char handle max, and a token index for poll reads.

- `migrations/0010_verification_rerun_and_named_restore.sql` — **the re-run
  fix + named restore**: `celestual_complete_ig_verification` now answers
  `already_verified` / `code_expired` when nothing is pending (so a re-sent DM
  gets an honest reply instead of a dead-end — half of the "verification works
  once, then never again" report; the other half is the ManyChat Default-Reply
  trigger trap, documented in docs/MANYCHAT-SETUP.md), restates 0009's 30-day
  sliding sessions for databases that stopped earlier, and retires the
  device-locked ping restore: `celestual_submit` stores the normalised
  plaintext target beside its hash, and `celestual_my_pings` returns every
  live ping NAMED to the DM-proven owner (matching/suppression still run on
  hashes; pre-0010 rows stay anonymous until re-placed).

- `migrations/0011_pending_ttl_24h.sql` — raises the pending-code TTL from
  10 minutes to 24 hours (captures a live hand-edit into git).

- `migrations/0012_ig_code_pure_correlation.sql` — **the code becomes a pure
  correlation id (Fix C).** `celestual_complete_ig_verification` now adopts the
  Meta-authenticated DMing account as the identity (overwriting the typed hint)
  instead of demanding username == typed handle, and
  `celestual_poll_ig_verification` returns that adopted @ to the proof-holder.
  Removes the entire `handle_mismatch` class (the "different @" reply is gone).

- `migrations/0013_durable_relogin.sql` — **durable, DM-free recovery (Fix B).**
  New `celestual_recovery` (handle⇄email, written only under a live proof via
  `celestual_bind_recovery`) and `celestual_relogin_tokens` (hash-stored,
  single-use, 20-min magic-link tokens). `celestual_relogin_store` /
  `celestual_relogin_redeem` (service-role only) issue and redeem the link,
  minting a fresh 30-day proof with no DM. The opt-out wipe now covers both.

**Which migrations are live vs. historical:** the schema is append-only — every
file still applies cleanly in order, but 0002 (Supabase-Auth profiles) and 0005
(`celestual_my_sky`) were dropped/superseded by 0006, the 0003 slot model was
replaced by 0006's ping model, and 0009+0010 carry the current definitions of
`celestual_norm`, `celestual_submit`, `celestual_suppress` and the four
IG-verification functions. When reading for current behaviour: **0006 + 0007 +
0008 + 0009 + 0010** are the truth; 0001/0004 for the tables they created.

**SQL Editor:** paste each file's contents and Run, in order.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push   # applies every migration in order
```

Re-running is safe (`if not exists` / `create or replace` / guarded alters).

## Edge functions

| Function | What it does | Required secrets |
| --- | --- | --- |
| `functions/celestual-notify` | drains `celestual_notifications` and emails "celestual: it's mutual." to the earlier entrant (retry + dead-letter) | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-remind` | the hourly caretaker: lapse warnings ("still feel it?"), the sixty-day purge (`celestual_purge_expired`), and the campus open/reveal mail queue — schedule hourly with pg_cron | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-search` | optional server-side Instagram @ typeahead proxy | `HANDLE_SEARCH_URL`, `HANDLE_SEARCH_KEY` |
| `functions/celestual-manychat` | **(recommended)** receives the Instagram DM relayed by ManyChat's External Request (sender username + code), authenticated by a shared secret, calls `celestual_complete_ig_verification`, and returns a `reply` ManyChat DMs back (the verified-feedback message) — no Meta developer portal. **Full setup guide: [../docs/MANYCHAT-SETUP.md](../docs/MANYCHAT-SETUP.md)** | `MANYCHAT_SHARED_SECRET` |
| `functions/celestual-ig-webhook` | alternative: receives Instagram DMs from Meta's Messaging webhook directly (verifies `X-Hub-Signature-256`, re-fetches the sender username, adopts it as the identity, DMs verified/already-verified/expired feedback back — `IG_CONFIRM_DM`, on by default) | `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN` |
| `functions/celestual-relogin` | durable, DM-free re-login (Fix B): `request` emails a one-time magic link to the bound recovery address; `redeem` mints a fresh 30-day proof from the link — the sign-back-in path that survives storage loss and works cross-device | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Deploy with `supabase functions deploy <name>`. JWT verification is disabled
for these in `config.toml` because anonymous visitors (or Meta's webhook) call
them; each enforces its own checks. See
[../docs/DEBUG-IG-WEBHOOK.md](../docs/DEBUG-IG-WEBHOOK.md).

## Data model (post-0006)

- **`celestual_entries`** — one ping: `from_handle` (the verified sender),
  `to_hash` (**salted hash** of the target — plaintext is never stored),
  optional `from_email` + `intent`, the sixty-day `expires_at` clock,
  `matched_at` / `matched_handle` (plaintext only once mutual — both sides
  know by then), `renew_notified_at`.
- **`celestual_matches`** — one row per mutual pair (canonical ordering).
- **`celestual_notifications`** — outbound mutual-mail queue (retry /
  dead-letter), drained by `celestual-notify`.
- **`celestual_attempts`** — short-lived rate-limit log (targets hashed;
  auto-pruned).
- **`celestual_placements`** — rolling placement log: the 6-per-30-days
  cadence cap + the week-one campus aggregates (pruned past ~40 days).
- **`celestual_suppressions`** — the opt-out registry, **hashed**.
- **`celestual_members`** — who is reachable (has ever verified, by DM or by
  campus preregistration); powers Loop A's one honest bit.
- **`celestual_handle_links`** — multi-account identity groups; matching and
  the slot count are group-aware.
- **`celestual_ig_verifications`** / **`celestual_settings`** — DM ownership
  proofs; operator flags (`require_ig_verification`, `handle_salt`).
- **`celestual_recovery`** / **`celestual_relogin_tokens`** — durable, DM-free
  recovery (0013): the handle⇄email binding written only under a live proof, and
  the hash-stored, single-use, short-TTL magic-link tokens.
- **`celestual_communities`** / **`celestual_community_members`** — "your
  worlds"; counters are floored at 100 server-side.
- **`celestual_campuses`** / **`celestual_campus_prereg`** /
  **`celestual_campus_mail`** — assurance-contract windows: threshold, true
  count, auto-open at threshold, snapshotted week-one numbers, and the
  everyone-at-once mail queue.

### RPCs (the only public surface)

`celestual_submit` (place a ping: proof gate, hashed suppression check, the
three-slot rule, the cadence cap, hashed group-aware matching, instant mutual
result + reachability + slot snapshot) · `celestual_withdraw` ("let it go";
frees the slot) · `celestual_renew` (another sixty days, free) ·
`celestual_ping_status` (the status page: device sends its plaintext list up,
owner-gated) · `celestual_my_pings` (cross-device restore; unmatched rows come
back anonymous by design) · `celestual_slots_for` (owner's slot snapshot) ·
`celestual_suppress` (the public opt-out) · `celestual_link` ·
`celestual_set_worlds` / `celestual_world_counts` (counters, 100-floor) ·
`celestual_campus` / `celestual_campus_preregister` ·
`celestual_start_ig_verification` / `celestual_poll_ig_verification` ·
`celestual_bind_recovery` (bind handle⇄email under a live proof, for DM-free
re-login) · `celestual_norm`.

**Operator-only (service role):** `celestual_complete_ig_verification` (the
webhook's completion path — adopts the DMing account as the identity),
`celestual_relogin_store` / `celestual_relogin_redeem` (issue + redeem the
sign-back-in magic link), `celestual_campus_reveal` (snapshot + publish week
one), `celestual_purge_expired` (the sixty-day broom).

### Operator playbook

```sql
-- open a campus window
insert into celestual_campuses (slug, name, threshold) values ('reed', 'Reed', 300);

-- seven days after it opens, after eyeballing the numbers:
select celestual_campus_reveal('reed');

-- the release gate before any real launch:
update celestual_settings set value = 'true' where key = 'require_ig_verification';
```

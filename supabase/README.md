# Supabase backend

The backend for **CELESTUAL**. Apply to a dedicated Supabase project per
[../docs/GO-LIVE.md](../docs/GO-LIVE.md).

Everything is named `celestual_*`. The raw "who entered whom" data is never
readable by the client: `anon` / `authenticated` get no table privileges and no
RLS policy, so the only way in is the `SECURITY DEFINER` RPCs, which return just a
status object. See [../docs/SECURITY.md](../docs/SECURITY.md).

## Apply the schema

Three idempotent migrations, applied in order:

- `migrations/0001_celestual.sql` — the anonymous matching core (entries, matches,
  notifications, rate limiting, suppressions, and the `SECURITY DEFINER` RPCs).
- `migrations/0002_user_accounts.sql` — the signed-in-user layer: per-user
  profiles, the **encrypted sky**, the owner-only encryption keys, and self-serve
  account deletion. Owner-scoped by RLS on `auth.uid()`.
- `migrations/0003_production_hardening.sql` — the integrity layer: the weekly
  **slot budget** (`celestual_slots`), **multi-account** identity groups
  (`celestual_handle_links` + group-aware matching), instant reveal from
  `celestual_submit`, the constellations check, opt-in reminders, and a
  rate-limited `celestual_suppress`. Drops the old paywall entitlements.

**SQL Editor:** paste each file's contents and Run (0001, then 0002, then 0003).

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push   # applies every migration in order
```

Re-running is safe (`if not exists` / `create or replace` / `drop policy if exists`).

## Edge functions

| Function | What it does | Required secrets |
| --- | --- | --- |
| `functions/celestual-notify` | drains `celestual_notifications` and emails the mutual-match reveal via Resend | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-remind` | drains `celestual_reminders` and emails "a new star is ready" when a slot regenerates (schedule hourly with pg_cron) | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-search` | optional server-side Instagram @ typeahead proxy | `HANDLE_SEARCH_URL`, `HANDLE_SEARCH_KEY` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Deploy
with `supabase functions deploy <name>`. JWT verification is disabled for these in
`config.toml` because anonymous visitors call them; each enforces its own checks.
See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) and
[../docs/SETUP-AUTH.md](../docs/SETUP-AUTH.md).

## Data model

- **`celestual_entries`** — one directed entry (from_handle "still thinks about"
  to_handle). Locked down; only the RPCs read/write it.
- **`celestual_matches`** — one row per mutual pair (canonical ordering).
- **`celestual_notifications`** — outbound email queue (with retry / dead-letter),
  drained by `celestual-notify`.
- **`celestual_attempts`** — minimal log for rate limiting (auto-pruned).
- **`celestual_suppressions`** — handles that opted out of ever being entered.
- **`celestual_slots`** (0003) — the per-handle weekly entry budget (3, +1/week,
  no refund on withdrawal). Enforced inside `celestual_submit`.
- **`celestual_handle_links`** (0003) — multi-account identity groups; matching is
  group-aware so being entered on any of a person's linked @s counts.
- **`celestual_reminders`** (0003) — opt-in "tell me when my next star is ready".
- **RPCs:** `celestual_submit` (record an entry; enforces the budget, matches
  across groups, returns the **instant** mutual result + slot snapshot),
  `celestual_withdraw` (un-send; never refunds a slot), `celestual_suppress`
  (rate-limited self-service erasure / block), `celestual_link` (group your own
  @s), `celestual_check_many` (which entered @s are mutual — the constellations
  view), `celestual_slots_for` (slot snapshot for display),
  `celestual_request_reminder`, and `celestual_norm` (handle normalisation).

### Accounts layer (0002 — owner-scoped via RLS)

- **`celestual_profiles`** — one row per `auth.users` id: account fields (handle,
  email, display name) plus the **encrypted sky** (`sky_cipher` / `sky_nonce`), an
  opaque AES-GCM blob the client encrypts before it ever leaves the browser.
- **`celestual_user_keys`** — the per-user AES key, readable ONLY by its owner, so
  the sky blob in `celestual_profiles` is useless without that user's live session.
- **RPC:** `celestual_delete_me` — wipes the caller's own rows + auth user.

> The sky is stored encrypted so a leak of `celestual_profiles` alone — or any
> other user — can't read who you entered. The decryption key lives in a separate
> owner-only table. This is at-rest / least-privilege protection, not
> zero-knowledge (an operator with both tables + service role could still join
> them). See `app/src/api/vault.js` and `app/src/api/profile.js`.

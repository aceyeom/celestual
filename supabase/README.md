# Supabase backend

The backend for **CELESTUAL**. Apply to a dedicated Supabase project per
[../docs/GO-LIVE.md](../docs/GO-LIVE.md).

Everything is named `celestual_*`. The raw "who entered whom" data is never
readable by the client: `anon` / `authenticated` get no table privileges and no
RLS policy, so the only way in is the `SECURITY DEFINER` RPCs, which return just a
status object. See [../docs/SECURITY.md](../docs/SECURITY.md).

## Apply the schema

Two idempotent migrations, applied in order:

- `migrations/0001_celestual.sql` — the anonymous matching core (entries, matches,
  notifications, rate limiting, suppressions, and the `SECURITY DEFINER` RPCs).
- `migrations/0002_user_accounts.sql` — the signed-in-user layer: per-user
  profiles, the **encrypted sky**, the owner-only encryption keys, entitlements,
  and self-serve account deletion. Owner-scoped by RLS on `auth.uid()`.

**SQL Editor:** paste each file's contents and Run (0001 first, then 0002).

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
| `functions/celestual-checkout` | the paywall — first star free, pay to add more | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (and/or Kakao/Toss keys) |
| `functions/celestual-search` | optional server-side Instagram @ typeahead proxy | `HANDLE_SEARCH_URL`, `HANDLE_SEARCH_KEY` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Deploy
with `supabase functions deploy <name>`. JWT verification is disabled for these in
`config.toml` because anonymous visitors call them; each enforces its own checks.
See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) and
[../docs/SETUP-AUTH-AND-PAYMENTS.md](../docs/SETUP-AUTH-AND-PAYMENTS.md).

## Data model

- **`celestual_entries`** — one directed entry (from_handle "still thinks about"
  to_handle). Locked down; only the RPCs read/write it.
- **`celestual_matches`** — one row per mutual pair (canonical ordering).
- **`celestual_notifications`** — outbound email queue (with retry / dead-letter),
  drained by `celestual-notify`.
- **`celestual_attempts`** — minimal log for rate limiting (auto-pruned).
- **`celestual_suppressions`** — handles that opted out of ever being entered.
- **RPCs:** `celestual_submit` (record an entry, deferred reveal),
  `celestual_withdraw` (un-send an entry), `celestual_suppress` (self-service
  erasure / block), `celestual_norm` (handle normalisation).

### Accounts layer (0002 — owner-scoped via RLS)

- **`celestual_profiles`** — one row per `auth.users` id: account fields (handle,
  email, display name) plus the **encrypted sky** (`sky_cipher` / `sky_nonce`), an
  opaque AES-GCM blob the client encrypts before it ever leaves the browser.
- **`celestual_user_keys`** — the per-user AES key, readable ONLY by its owner, so
  the sky blob in `celestual_profiles` is useless without that user's live session.
- **`celestual_entitlements`** — paid-star count; the client reads it, only the
  service role (the payment webhook) writes it.
- **RPC:** `celestual_delete_me` — wipes the caller's own rows + auth user.

> The sky is stored encrypted so a leak of `celestual_profiles` alone — or any
> other user — can't read who you entered. The decryption key lives in a separate
> owner-only table. This is at-rest / least-privilege protection, not
> zero-knowledge (an operator with both tables + service role could still join
> them). See `app/src/api/vault.js` and `app/src/api/profile.js`.

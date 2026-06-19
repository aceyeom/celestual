# Supabase backend

The backend for **CELESTUAL**. Apply to a dedicated Supabase project per
[../docs/GO-LIVE.md](../docs/GO-LIVE.md).

Everything is named `celestual_*`. The raw "who entered whom" data is never
readable by the client: `anon` / `authenticated` get no table privileges and no
RLS policy, so the only way in is the `SECURITY DEFINER` RPCs, which return just a
status object. See [../docs/SECURITY.md](../docs/SECURITY.md).

## Apply the schema

One idempotent migration holds the complete, hardened schema:
`migrations/0001_celestual.sql`.

**SQL Editor:** paste its contents and Run.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push
```

Re-running is safe (`if not exists` / `create or replace`).

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

# Supabase backend

The backend for **CELESTUAL**. Apply to a dedicated Supabase project (Seoul
region recommended) per [../DEPLOYMENT.md](../DEPLOYMENT.md).

Everything lives under a `still_*` prefix (the project's internal codename) —
tables, RPCs, and RLS. The raw "who entered whom" data is never readable by the
client: `anon`/`authenticated` get no table privileges and no RLS policy, so the
only way in is the `SECURITY DEFINER` RPCs, which return just a yes/no.

## Files (run in this order)

| # | File | What it does |
| --- | --- | --- |
| 1 | `migrations/0001_still.sql` | tables, `still_submit` RPC, RLS |
| 2 | `migrations/0002_still_safety.sql` | rate limiting + anti-exfiltration on the match email |
| 3 | `migrations/0003_still_deferred_reveal.sql` | deferred reveal, per-`to` rate cap, withdraw/suppress erasure, email dead-letter |

All are idempotent (`if not exists` / `create or replace`), so re-running is safe.

## Apply

**SQL Editor (simplest):** paste each file's contents and Run, in order.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push                              # applies migrations/
```

## Edge functions

| Function | What it does |
| --- | --- |
| `functions/still-notify` | drains the `still_notifications` queue and emails the mutual-match reveal via Resend |
| `functions/still-checkout` | the paywall — first star free, pay to add more |
| `functions/still-search` | server-side Instagram @ typeahead proxy |

See [../DEPLOYMENT.md](../DEPLOYMENT.md) and
[../SETUP-AUTH-AND-PAYMENTS.md](../SETUP-AUTH-AND-PAYMENTS.md) for deploying these
and their environment variables.

## Model

- **`still_entries`** — one directed entry (from_handle "still thinks about"
  to_handle). Locked down; only the `still_submit` RPC writes/reads it.
- **`still_matches`** — one row per mutual pair (canonical ordering).
- **`still_notifications`** — outbound email queue, drained by `still-notify`.
- **`still_attempts`** — minimal log for rate limiting (auto-pruned).
- **`still_suppressions`** — handles that opted out of ever being entered.
- **RPCs:** `still_submit` (record an entry, deferred reveal), `still_withdraw`
  (un-send an entry), `still_suppress` (self-service erasure / block),
  `still_norm` (handle normalisation).

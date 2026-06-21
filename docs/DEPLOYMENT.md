# CELESTUAL — Deployment reference

Detailed reference for the services behind **https://celestual.us/**. For the
ordered, do-this-then-that checklist, see **[GO-LIVE.md](./GO-LIVE.md)** — this
doc is the per-layer detail.

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | one build → CELESTUAL at `/` |
| Database | **Supabase** | three migrations: `0001` core · `0002` accounts · `0003` slot budget + multi-account |
| Match email | **Supabase Edge Function** → **Resend** | `celestual-notify` |
| Sign-in | **Supabase Auth** | optional/postponed, see [SETUP-AUTH.md](./SETUP-AUTH.md) |
| Domain | **Vercel** | `celestual.us` |

---

## 1. Supabase — apply the schema

The backend is three idempotent migrations, applied **in order**. Apply either way:

**SQL Editor:** paste the contents of each and **Run** in order —
[`0001_celestual.sql`](../supabase/migrations/0001_celestual.sql) (matching core),
[`0002_user_accounts.sql`](../supabase/migrations/0002_user_accounts.sql) (accounts +
encrypted sky), then
[`0003_production_hardening.sql`](../supabase/migrations/0003_production_hardening.sql)
(slot budget, multi-account, instant reveal).

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push   # applies all three in order
```

`0001` creates `celestual_entries`, `celestual_matches`, `celestual_notifications`,
`celestual_attempts`, `celestual_suppressions`, the `celestual_submit` /
`celestual_withdraw` / `celestual_suppress` RPCs, and `celestual_norm`. `0003` adds
`celestual_slots` (the weekly entry budget), `celestual_handle_links` (multi-account
identity), `celestual_reminders`, and their RPCs. Every table has RLS on and no
policies, so the RPCs are the only way in. It's re-runnable
(`if not exists` / `create or replace`).

Sanity check (note: `celestual_submit` NEVER reveals a match — it returns only
`{"recorded": true}`; the mutual "yes" is delivered solely by the email queued to
the **earlier** entrant):

```sql
select celestual_submit('@me','@you','early@example.com');  -- {"recorded":true,"mutual":false,...} (earlier entrant)
select celestual_submit('@you','@me','live@example.com');   -- {"recorded":true,"mutual":true,"match":"me",...} (instant reveal)
select * from celestual_matches;                             -- one row (recorded server-side)
-- ONE notification, to the EARLIER entrant (me / early@example.com).
-- the address typed on the triggering call (live@example.com) is never queued.
select self_handle, to_email from celestual_notifications;   -- me | early@example.com
-- erasure: block + wipe a handle (third-party opt-out / privacy screen):
select celestual_suppress('@you');                           -- {"suppressed":"you","erased":N}
-- clean up the test rows when done:
select celestual_suppress('@me');
```

## 2. Supabase — match-notification emails (Resend)

1. Create a [Resend](https://resend.com) account; verify a sender on `celestual.us`
   (or use `onboarding@resend.dev` for testing). Copy your **API key**.
2. Set the function secrets — Supabase → **Edge Functions → Secrets**:
   - `RESEND_API_KEY` = your key
   - `CELESTUAL_FROM_EMAIL` = `CELESTUAL <hello@celestual.us>` (a verified sender)
   - `CELESTUAL_SITE_URL` = `https://celestual.us`

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
3. Deploy the function:
   ```bash
   supabase functions deploy celestual-notify
   ```
4. Trigger it when a match is queued. Either:
   - **Database Webhook** (simplest): Supabase → **Database → Webhooks** → Create →
     table `celestual_notifications`, event **INSERT** → HTTP POST to the
     `celestual-notify` function URL. The function drains all pending rows per call.
   - **or pg_cron** every minute (Supabase → Integrations → cron) calling the
     function via `pg_net` — useful as a backstop.

> No webhook yet? Matches still work in the app; emails just sit in
> `celestual_notifications` until the function runs. You can invoke it manually any
> time to flush the queue.

For optional Instagram sign-in and the `celestual-search` typeahead, see
[SETUP-AUTH.md](./SETUP-AUTH.md). The optional `celestual-remind` function (the
out-of-slots email nudge) uses the same Resend secrets as `celestual-notify` and
should be scheduled hourly with pg_cron.

## 3. Vercel

Import the repo into Vercel → **Settings → General**:

- **Root Directory:** repo root.
- **Build Command / Output:** taken from `vercel.json` automatically
  (`npm run build` → `dist`). Leave the framework preset on **Other**.
- **Environment Variables:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (see [`app/.env.example`](../app/.env.example)).

Redeploy. Verify `https://celestual.us/` serves CELESTUAL.

## 4. Domain

Point `celestual.us` at Vercel (Vercel → **Settings → Domains**, then add the DNS
records your registrar requires). The deploy serves CELESTUAL at the root over
HTTPS.

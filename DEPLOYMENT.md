# CELESTUAL — Go-Live Guide

Putting **CELESTUAL** live at **https://celestual.us/** on Supabase + Vercel.

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | one build → CELESTUAL at `/` |
| Database | **Supabase** | run the `migrations/` (the `still_*` objects) |
| Match email | **Supabase Edge Function** → **Resend** | `still-notify` |
| Domain | **Vercel** | points at celestual.us |

---

## 1. Supabase — apply the schema

SQL Editor → New query → paste and **Run**, in order:

```
supabase/migrations/0001_still.sql
supabase/migrations/0002_still_safety.sql
supabase/migrations/0003_still_deferred_reveal.sql
```

`0001` creates `still_entries`, `still_matches`, `still_notifications`, the
`still_submit` RPC, and `still_norm`. `0002` adds rate limiting +
anti-exfiltration. `0003` adds deferred reveal, erasure, and email dead-letter.
All are idempotent (`if not exists` / `create or replace`).

Sanity check it works (note: after `0003` the RPC NEVER reveals a match — it
returns only `{"recorded": true}`; the mutual "yes" is delivered solely by the
email queued to the earlier entrant):

```sql
select still_submit('@me','@you','early@email.com');  -- {"recorded": true}  (earlier entrant, leaves the app)
select still_submit('@you','@me','live@email.com');   -- {"recorded": true}  (live submitter — no reveal on screen)
select * from still_matches;                            -- one row (mutual, recorded server-side)
-- ONE notification, to the EARLIER entrant (me / early@email.com).
-- the address typed on the triggering call (live@email.com) is never queued.
select self_handle, to_email from still_notifications;  -- me | early@email.com
-- erasure: block + wipe a handle (third-party opt-out / privacy screen):
select still_suppress('@you');                          -- {"suppressed":"you","erased":N}
-- clean up the test rows when done:
delete from still_entries where from_handle in ('me','you');
delete from still_matches where handle_a in ('me','you') or handle_b in ('me','you');
delete from still_attempts where from_handle in ('me','you');
delete from still_suppressions where handle in ('me','you');
```

## 2. Supabase — match-notification emails (Resend)

1. Create a [Resend](https://resend.com) account; verify a sender on `celestual.us`
   (or use `onboarding@resend.dev` for testing). Copy your **API key**.
2. Set the function secrets — Supabase → **Edge Functions → Secrets**:
   - `RESEND_API_KEY` = your key
   - `STILL_FROM_EMAIL` = `CELESTUAL <hello@celestual.us>` (a verified sender — the
     `STILL_*` var name is the internal codename only)
   - `STILL_SITE_URL` = `https://celestual.us`
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
3. Deploy the function:
   ```bash
   supabase functions deploy still-notify
   ```
4. Trigger it when a match is queued. Either:
   - **Database Webhook** (simplest): Supabase → **Database → Webhooks** → Create →
     table `still_notifications`, event **INSERT** → HTTP POST to the
     `still-notify` function URL. The function drains all pending rows on each call.
   - **or pg_cron** every minute (Supabase → Integrations → cron) calling the
     function via `pg_net` — useful as a backstop.

> No webhook yet? Matches still work in the app; emails just sit in
> `still_notifications` until the function runs. You can invoke it manually any
> time to flush the queue.

For the Instagram sign-in and paywall (the `still-checkout` / `still-search`
functions), see [SETUP-AUTH-AND-PAYMENTS.md](./SETUP-AUTH-AND-PAYMENTS.md).

## 3. Vercel

Import the repo into Vercel → **Settings → General**:

- **Root Directory:** repo root.
- **Build Command / Output:** taken from `vercel.json` automatically
  (`npm run build` → `dist`). Leave the framework preset on **Other**.
- **Environment Variables:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (see [`still-app/.env.example`](./still-app/.env.example)).

Redeploy. Verify `https://celestual.us/` serves CELESTUAL.

## 4. Done

Point `celestual.us` at Vercel (Vercel → **Settings → Domains**, then add the
DNS records your registrar requires). The deploy serves CELESTUAL at the root.

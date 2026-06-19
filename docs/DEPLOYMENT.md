# CELESTUAL — Deployment reference

Detailed reference for the services behind **https://celestual.us/**. For the
ordered, do-this-then-that checklist, see **[GO-LIVE.md](./GO-LIVE.md)** — this
doc is the per-layer detail.

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | one build → CELESTUAL at `/` |
| Database | **Supabase** | one migration: `supabase/migrations/0001_celestual.sql` |
| Match email | **Supabase Edge Function** → **Resend** | `celestual-notify` |
| Sign-in / pay | **Supabase Auth / Edge Functions** | optional, see [SETUP-AUTH-AND-PAYMENTS.md](./SETUP-AUTH-AND-PAYMENTS.md) |
| Domain | **Vercel** | `celestual.us` |

---

## 1. Supabase — apply the schema

The entire backend is one idempotent migration. Apply it either way:

**SQL Editor:** paste the contents of
[`supabase/migrations/0001_celestual.sql`](../supabase/migrations/0001_celestual.sql)
and **Run**.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push
```

It creates `celestual_entries`, `celestual_matches`, `celestual_notifications`,
`celestual_attempts`, `celestual_suppressions`, the `celestual_submit` /
`celestual_withdraw` / `celestual_suppress` RPCs, and `celestual_norm` — with RLS
on and no policies, so the RPCs are the only way in. It's re-runnable
(`if not exists` / `create or replace`).

Sanity check (note: `celestual_submit` NEVER reveals a match — it returns only
`{"recorded": true}`; the mutual "yes" is delivered solely by the email queued to
the **earlier** entrant):

```sql
select celestual_submit('@me','@you','early@example.com');  -- {"recorded": true}  (earlier entrant)
select celestual_submit('@you','@me','live@example.com');   -- {"recorded": true}  (live submitter, no on-screen reveal)
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

For the Instagram sign-in and paywall (the `celestual-checkout` /
`celestual-search` functions), see
[SETUP-AUTH-AND-PAYMENTS.md](./SETUP-AUTH-AND-PAYMENTS.md).

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

# STILL. — Go-Live Guide

Putting **STILL.** live at **https://dolbomi.app/** while keeping the archived
DOLBOMI app reachable at **https://dolbomi.app/dolbomi** — on the existing stack
(same Vercel project, same Supabase project). Nothing in the live DOLBOMI
database is dropped or modified; STILL. only **adds** the `still_*` objects.

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | one build → STILL. at `/`, dolbomi at `/dolbomi` |
| Database | **Supabase** (same project) | run migration `0006_still.sql` |
| Match email | **Supabase Edge Function** → **Resend** | `still-notify` |
| Domain | **Spaceship → Vercel** | unchanged — already points at dolbomi.app |

---

## 1. Supabase — add the STILL. schema (additive)

SQL Editor → New query → paste and **Run**:

```
supabase/migrations/0006_still.sql
```

This creates `still_entries`, `still_matches`, `still_notifications`, the
`still_submit` RPC, and `still_norm`. It is idempotent and touches no existing
table. (No seed needed.)

Then run the safety hardening (rate limiting + anti-exfiltration), and the
deferred-reveal + erasure + email dead-letter migration — both idempotent and
`CREATE OR REPLACE` `still_submit`:

```
supabase/migrations/0007_still_safety.sql
supabase/migrations/0008_still_deferred_reveal.sql
```

Sanity check it works (note: after 0008 the RPC NEVER reveals a match — it
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

1. Create a [Resend](https://resend.com) account; verify a sender on `dolbomi.app`
   (or use `onboarding@resend.dev` for testing). Copy your **API key**.
2. Set the function secrets — Supabase → **Edge Functions → Secrets**:
   - `RESEND_API_KEY` = your key
   - `STILL_FROM_EMAIL` = `CELESTE <hello@dolbomi.app>` (a verified sender — the
     brand users see is **CELESTE**; the `STILL_*` var name is internal only)
   - `STILL_SITE_URL` = `https://dolbomi.app`
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

## 3. Vercel — point the project at the repo root

The build now lives at the **repo root** (it builds both apps), not in
`dolbomi-app/`. In the existing Vercel project → **Settings → General**:

- **Root Directory:** clear it / set to repo root (was `dolbomi-app`).
- **Build Command / Output:** taken from `vercel.json` automatically
  (`npm run build` → `dist`). Leave the framework preset on **Other**.
- **Environment Variables:** ensure `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` are still set (STILL. uses the same two).

Redeploy. Verify:
- `https://dolbomi.app/` → STILL.
- `https://dolbomi.app/dolbomi` → the archived DOLBOMI app (still fully working
  against its existing tables).

## 4. Done

DNS is unchanged — Spaceship already points `dolbomi.app` at Vercel. The first
redeploy after the Root Directory change flips the homepage to STILL.

---

### Rollback

To bring DOLBOMI back to the homepage: set Vercel **Root Directory** back to
`archive/dolbomi-app` and redeploy. The `still_*` tables can stay — they're
inert without the STILL. frontend.

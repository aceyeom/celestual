# CELESTUAL — Go-Live: the manual steps

This is the **checklist of things only you can do** to take CELESTUAL from this
repo to a live, secure site at **https://celestual.us**. Everything in the code is
ready; these steps connect it to your accounts (Supabase, Vercel, the domain, and
email).

Work top to bottom. The **core product is live after Part 4** — Instagram sign-in
(Part 6) is an optional add-on you can switch on later. There is no paywall: every
star is free, gated only by a server-side weekly slot budget (3 slots, +1/week).

You'll need accounts at: **Supabase**, **Vercel**, your **domain registrar** (for
`celestual.us`), and **Resend** (for the match emails). The
[Supabase CLI](https://supabase.com/docs/guides/cli) is recommended but optional —
every step also works in the dashboard.

---

## Part 1 — Supabase project

1. Create a Supabase project (a region near your users; Seoul if Korea-first).
2. Project Settings → **Data API / API Keys**, copy:
   - **Project URL** → `https://<project-ref>.supabase.co`
   - **anon / public** key (safe to ship in the browser)
   - **service_role** key (⚠️ **secret** — server only, never in `app/`)

## Part 2 — Apply the database schema

This creates every table, RPC, and row-level-security lock. It is the whole
backend.

**Option A — dashboard (simplest):** SQL Editor → New query → paste the full
contents of each migration **in order** and **Run** each:
[`0001_celestual.sql`](../supabase/migrations/0001_celestual.sql) (matching core),
[`0002_user_accounts.sql`](../supabase/migrations/0002_user_accounts.sql) (accounts +
encrypted sky),
[`0003_production_hardening.sql`](../supabase/migrations/0003_production_hardening.sql)
(slot budget, multi-account, instant reveal), then
[`0004_ig_verification.sql`](../supabase/migrations/0004_ig_verification.sql)
(Instagram DM handle verification — enforcement off by default).

**Option B — CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push   # applies all four migrations in order
```

**Verify it's secure** (paste in the SQL Editor):
```sql
-- both should return 'true' for every celestual_* table, with NO policies:
select relname, relrowsecurity from pg_class
 where relname like 'celestual_%' and relkind = 'r';
select count(*) as policies from pg_policies where tablename like 'celestual_%';  -- expect 0

-- smoke-test matching (instant reveal on the SECOND, completing entry):
select celestual_submit('@me','@you','early@example.com');  -- {"recorded":true,"mutual":false,...}
select celestual_submit('@you','@me','live@example.com');   -- {"recorded":true,"mutual":true,"match":"me",...}
select self_handle, to_email from celestual_notifications;  -- ONE row → me | early@example.com (the EARLIER entrant)
-- clean up the test rows:
select celestual_suppress('@me'); select celestual_suppress('@you');
```
The notification must go to the **earlier** entrant (`early@example.com`), never to
the address on the triggering call — that's the anti-exfiltration rule. See
[SECURITY.md](./SECURITY.md).

## Part 3 — Match-notification email (Resend)

The mutual "yes" is delivered **only** by email, so this is required for the
product to do its one job.

1. Create a [Resend](https://resend.com) account. Verify a sender on
   `celestual.us` (or use `onboarding@resend.dev` while testing). Copy the **API
   key**.
2. Supabase → **Edge Functions → Secrets**, set:
   - `RESEND_API_KEY` = your Resend key
   - `CELESTUAL_FROM_EMAIL` = `CELESTUAL <hello@celestual.us>` (a verified sender)
   - `CELESTUAL_SITE_URL` = `https://celestual.us`

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
3. Deploy the function:
   ```bash
   supabase functions deploy celestual-notify
   ```
4. Trigger it on new matches — **Database → Webhooks → Create**: table
   `celestual_notifications`, event **INSERT**, HTTP **POST** to the
   `celestual-notify` function URL. (The function drains all pending rows each
   call, so a per-minute pg_cron job is a good backstop.)

> No webhook yet? Matches still work; emails just queue in
> `celestual_notifications` until the function runs. You can invoke it manually to
> flush the queue any time.

## Part 4 — Deploy the front-end (Vercel)

1. Import this repo into Vercel.
2. **Settings → General:** Root Directory = repo root; leave the framework preset
   on **Other** (build command + output come from `vercel.json`:
   `npm run build` → `dist`).
3. **Settings → Environment Variables**, add (from
   [`app/.env.example`](../app/.env.example)):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. **Deploy.** The build output serves CELESTUAL at the root.

✅ **At this point the core product is live and secure on the Vercel URL.**

## Part 5 — Point the domain at Vercel

1. Vercel → **Settings → Domains** → add `celestual.us` (and `www.celestual.us`).
2. At your registrar, add the DNS records Vercel shows (typically an `A` record
   for the apex and a `CNAME` for `www`). DNS can take up to a few hours.
3. Visit **https://celestual.us/** — it should serve CELESTUAL over HTTPS
   (Vercel provisions the certificate automatically).

---

## Part 6 — (Optional) Instagram DM handle verification

Off by default (`VITE_IG_VERIFY_ENABLED=0` → a verified stub keeps the flow
testable). This proves the `@` a person types is really theirs — **no OAuth, no
login, and no Meta developer portal** — by having them DM a one-time code to your
Instagram account (`@celestual.us`), relayed by **ManyChat** (an official Meta
partner). It closes the impersonation gap tracked in [SECURITY.md](./SECURITY.md).

Full walkthrough (Instagram pro account → ManyChat → the `celestual-manychat`
function, migration `0004`, and the final enforcement flip):
**[SETUP-IG-VERIFY.md](./SETUP-IG-VERIFY.md)**. In short: connect Instagram to
ManyChat, deploy the function + set `MANYCHAT_SHARED_SECRET`, add a ManyChat Default
Reply → External Request, set `VITE_IG_VERIFY_ENABLED=1` /
`VITE_IG_USERNAME=celestual.us` in Vercel, then flip
`celestual_settings.require_ig_verification` to `'true'`. (Prefer Meta's portal
directly? Appendix A in that doc.)

> 🔁 **(Optional) reminder emails.** The out-of-slots screen lets people opt in to
> an email when their next star regenerates. To actually send them, deploy
> `celestual-remind` (same secrets as `celestual-notify`) and schedule it hourly
> with pg_cron. Without it, the in-app countdown still works.

---

## Where each secret lives (quick reference)

| Secret / value | Where it goes | Exposed to browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel env vars | ✅ yes (safe) |
| `VITE_IG_VERIFY_ENABLED`, `VITE_IG_USERNAME`, `VITE_HANDLE_SEARCH` | Vercel env vars | ✅ yes (flags + a public handle) |
| Supabase **service_role** key | injected into edge functions only | ❌ never |
| `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` | Supabase function secrets | ❌ never |
| `MANYCHAT_SHARED_SECRET` (or `IG_APP_SECRET` / `IG_VERIFY_TOKEN` / `IG_ACCESS_TOKEN`) | Supabase function secrets (verification relay) | ❌ never |

**Rule of thumb:** only `VITE_*` values are ever safe in the front-end. Anything
labelled *secret* lives in Supabase. After changing any `VITE_*` value in Vercel,
**redeploy** for it to take effect.

## Done

- [ ] All four migrations applied + RLS verified (Part 2)
- [ ] `celestual-notify` deployed + secrets set + webhook wired (Part 3)
- [ ] Front-end deployed with Supabase env vars (Part 4)
- [ ] `celestual.us` resolves over HTTPS (Part 5)
- [ ] (optional) Instagram DM verification on + enforcement flipped (Part 6 / SETUP-IG-VERIFY.md)
- [ ] (optional) `celestual-remind` deployed + scheduled for reminder emails (Part 6)

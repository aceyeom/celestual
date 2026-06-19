# CELESTUAL — Go-Live: the manual steps

This is the **checklist of things only you can do** to take CELESTUAL from this
repo to a live, secure site at **https://celestual.us**. Everything in the code is
ready; these steps connect it to your accounts (Supabase, Vercel, the domain, and
email).

Work top to bottom. The **core product is live after Part 4** — sign-in and
payments (Parts 6–7) are optional add-ons you can switch on later.

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
contents of [`supabase/migrations/0001_celestual.sql`](../supabase/migrations/0001_celestual.sql)
→ **Run**.

**Option B — CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Verify it's secure** (paste in the SQL Editor):
```sql
-- both should return 'true' for every celestual_* table, with NO policies:
select relname, relrowsecurity from pg_class
 where relname like 'celestual_%' and relkind = 'r';
select count(*) as policies from pg_policies where tablename like 'celestual_%';  -- expect 0

-- smoke-test matching (deferred reveal: nothing is revealed on screen):
select celestual_submit('@me','@you','early@example.com');  -- {"recorded": true}
select celestual_submit('@you','@me','live@example.com');   -- {"recorded": true}
select self_handle, to_email from celestual_notifications;  -- ONE row → me | early@example.com
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

## Part 6 — (Optional) Instagram sign-in

Off by default (`VITE_META_ENABLED=0` → a verified stub keeps the flow testable).
To turn on real Instagram/Meta sign-in, follow
[SETUP-AUTH-AND-PAYMENTS.md § 1](./SETUP-AUTH-AND-PAYMENTS.md#1-instagram-sign-in-meta),
then set `VITE_META_ENABLED=1` in Vercel and redeploy.

## Part 7 — (Optional) Payments for extra stars

Off by default (`VITE_PAY_ENABLED=0` → extra stars granted locally). The first
star is always free. To charge for additional stars, follow
[SETUP-AUTH-AND-PAYMENTS.md § 2](./SETUP-AUTH-AND-PAYMENTS.md#2-payments-stripe),
deploy `celestual-checkout`, set the provider secrets, and set
`VITE_PAY_ENABLED=1`.

> 💳 **Before taking real money,** make a provider webhook the source of truth for
> entitlements instead of the interim client-side `?paid=1` grant — see
> [SETUP-AUTH-AND-PAYMENTS.md § 2.6](./SETUP-AUTH-AND-PAYMENTS.md#26-hardening-for-real-money-recommended).

---

## Where each secret lives (quick reference)

| Secret / value | Where it goes | Exposed to browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel env vars | ✅ yes (safe) |
| `VITE_META_ENABLED`, `VITE_PAY_ENABLED`, `VITE_HANDLE_SEARCH` | Vercel env vars | ✅ yes (flags only) |
| Supabase **service_role** key | injected into edge functions only | ❌ never |
| `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` | Supabase function secrets | ❌ never |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, Kakao/Toss keys | Supabase function secrets | ❌ never |
| Meta App ID / Secret | Supabase Auth → Facebook provider | ❌ never |

**Rule of thumb:** only `VITE_*` values are ever safe in the front-end. Anything
labelled *secret* lives in Supabase. After changing any `VITE_*` value in Vercel,
**redeploy** for it to take effect.

## Done

- [ ] Schema applied + RLS verified (Part 2)
- [ ] `celestual-notify` deployed + secrets set + webhook wired (Part 3)
- [ ] Front-end deployed with Supabase env vars (Part 4)
- [ ] `celestual.us` resolves over HTTPS (Part 5)
- [ ] (optional) Instagram sign-in on (Part 6)
- [ ] (optional) Payments on + webhook-hardened (Part 7)

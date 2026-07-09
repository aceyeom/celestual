# EDU EMAIL VERIFICATION — connecting it, end to end

How a `.edu` gate actually works in celestual, and the exact steps to turn it
from its safe local stub into the real, email-backed thing in production.

A ping only ever reaches people from your own community, so **membership has to
be real, not self-declared.** Joining a curated school requires proving you're
there: a 6-digit code is emailed to an address at that school's domain, and you
enter it back to confirm. This doc is the operator playbook for wiring that up.

---

## 1 · How it works today (the moving parts)

The whole flow is already built and shipping in the repo. It runs in one of two
modes depending on a single flag:

| Mode | When | What happens |
| --- | --- | --- |
| **Stub** (default) | `VITE_EDU_VERIFY_ENABLED` unset/`0`, or no Supabase env, or `/demo` | The join sheet accepts any plausibly-formatted school address, waits a beat, accepts any 6 digits, and joins. **Nothing is emailed or stored.** Keeps dev + preview fully testable. |
| **Live** | `VITE_EDU_VERIFY_ENABLED=1` **and** Supabase URL/anon key set | Real code emailed via Resend, hashed + stored in Postgres, verified server-side. |

The pieces that make the **live** mode work:

```
app/src/components/screens.jsx  ·  EduVerifySheet   the join UI (email → code → verified)
app/src/api/eduverify.js        ·  send / verify    calls the edge function; picks stub vs live
app/src/communities.js          ·  CURATED[]        the curated schools + their email domains
supabase/functions/
    celestual-edu-verify/index.ts                    the edge function (the only writer)
supabase/migrations/
    0007_edu_verification.sql                        the celestual_edu_verifications table
```

**The security model (why it's shaped this way):**

- The 6-digit code is a **secret**. It is emailed, **never returned to the
  browser**, and only its **SHA-256 hash** is stored. A dump of the table reveals
  no live codes. (This is the opposite of the Instagram DM code, which the user
  re-sends to us — see `docs/DEBUG-IG-WEBHOOK.md`.)
- The table is **RLS-locked to the service role**: `anon`/`authenticated` get
  nothing. Only the edge function (running as the service role) reads or writes
  it. The browser only ever holds a random correlation `token`, never a secret.
- **Rate limited:** max **5** fresh codes per address per hour. Codes live **10
  minutes** and die after **6** wrong guesses. Expired rows self-sweep.
- A subdomain counts as the school (`andrew.cmu.edu` ⊂ `cmu.edu`).

**The request shape** (one endpoint, two actions):

```
POST celestual-edu-verify  { action:'send',   email, slug }  → { ok, token, expires_at } | { ok:false, error }
POST celestual-edu-verify  { action:'verify', token, code }  → { ok, email, slug }        | { ok:false, error }
```

Error slugs the UI localizes: `domain` · `email` · `rate` · `send` · `code` ·
`expired`.

---

## 2 · What you need before you start

1. The Supabase project already linked to this repo (the same one the `celestual_*`
   tables live in). `supabase link --project-ref <ref>` if it isn't.
2. The **Supabase CLI** installed and logged in (`supabase login`).
3. A **[Resend](https://resend.com)** account — this is what actually sends the
   code email. (The function calls the Resend REST API directly; no SDK.)
4. Access to the DNS for your sending domain (to verify it in Resend).

---

## 3 · The steps to go live

### Step 1 — apply the database migration

Creates `celestual_edu_verifications` (one row per code issued) with RLS on and
no client grant.

```bash
supabase db push          # applies supabase/migrations/0007_edu_verification.sql
```

Verify it exists and is locked down:

```sql
select tablename, rowsecurity from pg_tables where tablename = 'celestual_edu_verifications';
-- rowsecurity should be true
```

### Step 2 — set up Resend (the email sender)

1. Create a Resend account and **add + verify your sending domain** (e.g.
   `celestual.us`) by adding the DNS records Resend gives you (SPF/DKIM). Until the
   domain is verified, sends will fail.
2. Create an **API key** (Resend → API Keys).
3. Decide your **From** address. It must be on the verified domain, e.g.
   `celestual <hello@celestual.us>`.

> Without a verified domain you can still smoke-test using Resend's sandbox
> sender `onboarding@resend.dev` (the function's built-in fallback), but it only
> delivers to your own Resend account email — never ship on it.

### Step 3 — set the edge-function secrets

```bash
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
supabase secrets set CELESTUAL_FROM_EMAIL="celestual <hello@celestual.us>"
# optional — only used in the email footer link; defaults to https://celestual.us
supabase secrets set CELESTUAL_SITE_URL="https://celestual.us"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — you
do **not** set those.

### Step 4 — confirm the function config

`supabase/config.toml` must declare the function public (it's called by anonymous
visitors with the anon key; it does its own checks). This is already in the repo:

```toml
[functions.celestual-edu-verify]
verify_jwt = false
```

### Step 5 — deploy the edge function

```bash
supabase functions deploy celestual-edu-verify
```

Confirm it's live: `supabase functions list` should show it deployed.

### Step 6 — turn the flag on in the frontend

Set the flag wherever the app is built. **Vercel → Project → Settings →
Environment Variables** (and, for local testing, `app/.env.local`):

```
VITE_EDU_VERIFY_ENABLED=1
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Redeploy the frontend so the new build picks up the flag. Live mode only engages
when the flag is `1` **and** the Supabase env vars are present.

### Step 7 — keep the schools list in sync

The curated schools live in **two** places that must agree on `slug` → `domain`:

- `app/src/communities.js` → `CURATED[]` (frontend)
- `supabase/functions/celestual-edu-verify/index.ts` → `SCHOOLS` (backend)

To add or change a school, edit **both**, then redeploy the function. If they
disagree, the frontend pre-check and the server check will diverge and users get
a confusing `domain` error. Current set: `uc-berkeley` (`berkeley.edu`),
`wesleyan` (`wesleyan.edu`), `cmu` (`cmu.edu`).

---

## 4 · Verify it end to end

1. On production (flag on), open a curated community and tap **join**.
2. Enter an address that is **not** on the school's domain → expect the "that's
   not a `<domain>` address" (`domain`) error, no email sent.
3. Enter a **real** address on the school's domain → a code email should arrive
   within seconds (check spam the first time; a verified Resend domain fixes
   deliverability).
4. Enter the wrong code → `code` error; the correct one → **verified**, and you're
   a member.
5. Spot-check the table (service role / SQL editor):

```sql
select email, slug, status, attempts, created_at, verified_at
from celestual_edu_verifications order by created_at desc limit 5;
```

You should see a `verified` row, and **no plaintext code anywhere** — only
`code_hash`.

### If something's off

| Symptom | Likely cause |
| --- | --- |
| Sheet auto-accepts any code in prod | Flag not `1`, or Supabase env missing → app fell back to the stub. Check the built env. |
| `send` error, no email | `RESEND_API_KEY` unset/invalid, or the From domain isn't verified in Resend. Check `supabase functions logs celestual-edu-verify`. |
| Email in spam / not delivered | Resend domain not fully verified (SPF/DKIM), or you're on the `resend.dev` sandbox sender. |
| `domain` error for a valid student | The school's `domain` differs between `communities.js` and the function's `SCHOOLS`, or the student uses a subdomain not covered. |
| 401 / auth error calling the function | `verify_jwt` not `false` for this function, or it wasn't redeployed after the config change. |

Logs are your friend:

```bash
supabase functions logs celestual-edu-verify --tail
```

---

## 5 · Operating it

- **Tuning:** code TTL (`CODE_TTL_MIN`, 10), max guesses (`MAX_ATTEMPTS`, 6), and
  sends-per-hour (`SEND_PER_EMAIL_HOUR`, 5) are constants at the top of the edge
  function. Change + redeploy to adjust.
- **Cleanup:** expired rows are swept opportunistically on ~20% of sends, so the
  table stays small on its own. No cron needed. (Add one only if you ever want
  verified rows purged on a schedule — the current design keeps them as the
  membership record.)
- **Privacy:** the table stores the school address in plaintext (it's the
  membership claim), lowercased, plus the code **hash**. Fold it into the same
  retention + deletion story as the rest of `celestual_*` (see `docs/SECURITY.md`).
- **Adding schools at launch:** edit both lists (§3, Step 7), redeploy the
  function, ship the frontend. No migration needed — the table is school-agnostic.

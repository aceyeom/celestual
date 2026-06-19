# DOLBOMI — Go-Live Guide (Vercel + Supabase + Spaceship)

This is the **exact, click-by-click** path to put DOLBOMI live at
**https://dolbomi.app** on the production stack:

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend (SPA) | **Vercel** | static Vite build of `dolbomi-app/` |
| Database + Auth | **Supabase** (Postgres + Auth) | region **Seoul / ap-northeast-2** |
| Domain / DNS | **Spaceship** | nameservers stay at Spaceship; we add records |

You do this once. Budget ~30–40 minutes. Order matters: **Supabase first**
(so you have the keys), then **Vercel**, then **Spaceship DNS**.

---

## 0. Prerequisites

- This repo pushed to GitHub (you have it).
- Accounts: [supabase.com](https://supabase.com), [vercel.com](https://vercel.com),
  and your Spaceship account that owns `dolbomi.app`.

---

## 1. Supabase — create the project (Seoul)

1. Supabase dashboard → **New project**.
2. **Name:** `dolbomi` · **Database password:** generate and save it.
3. **Region: `Northeast Asia (Seoul)`** ← this is the one the brief asks for.
4. Create. Wait ~2 minutes for it to provision.

### 1a. Run the schema + seed + logic

Open **SQL Editor** (left sidebar) → **New query**, then run these **three files
in order**, each as its own query (copy the file contents, paste, **Run**):

1. `supabase/migrations/0001_init.sql`  → tables + row-level security
2. `supabase/seed.sql`                  → the opportunity catalog / benefits / titles
3. `supabase/migrations/0002_functions.sql` → the game-logic RPCs

> Re-runnable: all three are safe to run again (they use `if not exists` /
> `create or replace` / `truncate`). If you later edit `dolbomi-app/src/data`,
> regenerate the seed with `npm run gen:seed` and re-run `seed.sql`.

(Prefer CLI? `supabase link` then `supabase db push` applies `migrations/`, and
`psql "$DB_URL" -f supabase/seed.sql` loads the seed.)

### 1b. Configure Auth for the demo

**Authentication → Sign In / Providers → Email**: make sure **Email** is enabled.

**Authentication → Sign In / Providers → Email → "Confirm email":** turn this
**OFF** for the demo week. With it off, a sign-up returns a session immediately,
so demo users can start in one tap. (Turn it back on before scaling to thousands.)

**Authentication → URL Configuration:**
- **Site URL:** `https://dolbomi.app`
- **Redirect URLs:** add `https://dolbomi.app/**` and your Vercel preview URL
  `https://*.vercel.app/**` (you can add the exact preview URL after step 2).

### 1c. Grab the two keys you'll paste into Vercel

**Project Settings → API** (or **Data API**):
- **Project URL** → e.g. `https://abcdefgh.supabase.co`
- **anon / public key** (the long `eyJ…` JWT, *not* the service_role key)

Keep these two — they are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
They are safe to expose in a browser (RLS protects the data).

---

## 2. Vercel — deploy the SPA

1. Vercel → **Add New… → Project** → **Import** your `dolbomi.app` GitHub repo.
2. **Root Directory:** click **Edit** and set it to **`dolbomi-app`**.
   (The app lives in that subfolder; `vercel.json` there handles SPA routing.)
3. **Framework Preset:** Vite (auto-detected). Build `npm run build`, output `dist`.
4. **Environment Variables** — add both, for *Production* and *Preview*:
   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL from 1c |
   | `VITE_SUPABASE_ANON_KEY` | your anon key from 1c |
5. **Deploy.** You'll get `https://<something>.vercel.app`. Open it — you should
   see the DOLBOMI sign-up screen. Create an account and confirm the home screen
   loads. (If it shows the offline demo persona, the env vars aren't set — re-check.)

> Go back to Supabase **1b** and add this exact `*.vercel.app` URL to the
> redirect list if you didn't use the wildcard.

---

## 3. Spaceship — point dolbomi.app at Vercel

In Vercel: **Project → Settings → Domains → Add** → enter `dolbomi.app`. Add
`www.dolbomi.app` too and set it to redirect to the apex. Vercel will show the
records to create. Then, in **Spaceship → your domain → Advanced DNS / DNS
records**, add them. Keep Spaceship's nameservers (no transfer needed):

| Type | Host / Name | Value | Notes |
| --- | --- | --- | --- |
| `A` | `@` | `76.76.21.21` | apex → Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com` | www → Vercel |

- Delete any conflicting existing `A`/`AAAA`/`CNAME` on `@` or `www` (e.g. a
  Spaceship parking record), or the domain won't verify.
- If Vercel shows **different** values than above, use **Vercel's** values — they
  are authoritative.

DNS propagates in minutes to a few hours. Vercel auto-issues the HTTPS
certificate once it sees the records; the domain flips to **Valid / Production**.

> Alternative (hands-off DNS): in Spaceship set the **nameservers** to Vercel's
> (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) instead of adding records. Use one
> approach **or** the other, not both.

---

## 4. Verify it's live

1. Visit **https://dolbomi.app** → sign-up screen, padlock (valid HTTPS).
2. **Create an account** (email + password + name/rank/branch/guardian).
3. Complete a quest in **오늘 밤의 3** → the "+XP" celebration fires and a stat
   visibly grows; the guardian's evolution bar moves.
4. **Check in** → tonight's quests regenerate to your energy; the streak ticks
   up once for the day.
5. Reload → you're still signed in and your progress persisted.
6. In Supabase **Table Editor** → `profiles`, `stats`, `activity` show your rows.

That's a live, multi-user prototype. Hand the URL to your demo users.

---

## 5. After the demo (scaling toward the stores)

- **Turn email confirmation back on** (1b) and add a password-reset email
  template before opening to thousands.
- Consider Supabase **Auth rate limits** and a **custom SMTP** sender so
  confirmation/reset mail isn't throttled.
- The reference catalog is small and read-mostly; no extra indexes needed yet.
  When you add user-authored content, revisit indexes and RLS.
- Native wrappers (App Store / Play): the SPA can be embedded in a Capacitor
  shell pointing at the same Supabase project — no backend change required.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| App shows the demo persona, can't sign up | `VITE_SUPABASE_*` env vars missing/typo'd in Vercel → redeploy after fixing |
| Sign-up "confirm email" message appears | Confirm-email is still ON (1b) — turn it off for the demo |
| Quests toggle but don't persist | `0002_functions.sql` not run, or RLS blocked — re-run migrations; check the row exists in `tonight_quests` |
| `permission denied for table …` | RLS policy missing — re-run `0001_init.sql` |
| Domain stuck "Invalid Configuration" | A stale `@`/`www` DNS record is conflicting — delete it; wait for propagation |

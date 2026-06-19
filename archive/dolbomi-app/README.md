# DOLBOMI — 군인 자기개발 앱 (SPA)

A gamified self-development app for Korean military service members. Soldiers
grow six stats (전투력/정신력/자산력/숙련도/지휘력/담력) by completing quests drawn
from a real opportunity catalog (certifications, contests, savings programs),
climb a **vacation ladder**, browse a **benefits hub**, and watch a **live 3D
guardian creature** evolve as their total XP rises. Accounts, progress, streaks,
and titles persist in **Supabase**.

This directory is the **Vite + React SPA**, deployed to **Vercel**. The backend
is **Supabase** (Postgres + Auth, Seoul region) — there is no separate server.
To put it live, follow **[../DEPLOYMENT.md](../DEPLOYMENT.md)**.

## Tech stack

- **Vite + React 19** — SPA build (Three.js runs in a clean client context)
- **@supabase/supabase-js** — Auth (email/password) + Postgres reads + RPC writes
- **zustand** — global store: session, the live snapshot, prefs, optimistic mutations
- **Three.js** — live 3D guardian avatar with a per-vertex gold shader
- **CSS custom properties** — 3 palettes (골드/택티컬/스틸) × light/dark themes

## Run locally

```bash
npm install
cp .env.example .env.local   # paste your Supabase URL + anon key (optional)
npm run dev                  # Vite dev server
```

Without `.env.local` the app runs in **offline demo mode** against the bundled
`src/data` (no sign-in, no persistence) — handy for design/dev. With the two
Supabase vars set, you get the full online experience: sign up, persistence,
multi-user.

### Scripts

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # production build → dist/  (what Vercel runs)
npm run preview      # serve the production build
npm run lint         # eslint
npm run test:smoke   # SSR-renders every screen + overlay; fails on any runtime error
npm run gen:seed     # regenerate ../supabase/seed.sql from src/data
```

## How it connects

```
src/api/supabase.js   the @supabase/supabase-js client (null when env unset → offline)
src/api/client.js     auth + fetchSnapshot() (reference ⨯ per-user assembly) + RPC wrappers
src/store.js          bootstrap() → onAuthChange → fetchSnapshot; mutations → RPC → refetch
src/data/index.js     SINGLE SOURCE OF TRUTH: reference catalog/benefits/titles + offline fallback
```

On boot the store reads the Supabase session (or shows `AuthScreen`), then
`fetchSnapshot()` provisions the user (`app_ensure_profile`) and merges the
per-user state with the reference catalog into the shapes screens consume.
Writes go through `SECURITY DEFINER` RPCs (`app_toggle_tonight`,
`app_toggle_subquest`, `app_add_tonight`, `app_checkin`, `app_equip_title`) so
the game logic — stat growth, the streak guard, title awards, energy-based
regeneration — runs server-side and can't be forged. See
[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full map.

## Reference data is single-sourced

`src/data/index.js` defines the opportunity catalog, benefits, titles, the quest
pool, and the stat targets. `npm run gen:seed` emits `../supabase/seed.sql` from
it, so the database and the offline fallback can never silently diverge. Edit the
catalog there, regenerate, and re-run the seed in Supabase.

## External assets & graceful fallbacks

| Asset | Source | Fallback |
| --- | --- | --- |
| Guardian GLB models (ram, fox) | `static.poly.pizza` | procedural marble creature (`buildFallback()` in `3d/creature.js`) |
| Pretendard font | `cdn.jsdelivr.net` | system font stack |
| Opportunity photos | Unsplash | tinted gradient on error |

For a fully self-contained deploy, vendor the `.glb` files into `public/` and
self-host Pretendard.

# DOLBOMI — Engineering Documentation

This `docs/` folder is the **engineering source of truth** for the implemented app
in [`dolbomi-app/`](../dolbomi-app). It was written by reading the code top-to-bottom
(frontend store, screens, 3D engine, Express API, SQLite schema/seed) and the
design handoff material (`chats/`, `project/`).

The app is a **gamified self-development app for Korean military service members**
("군인 자기개발 앱"): six stats grow as you complete quests pulled from a real
opportunity catalog, a 3D guardian creature evolves with your XP, and you climb a
vacation-leave ladder and browse a benefits hub.

> ✅ **Now functional.** What used to be a high-fidelity *shell* is now a working
> prototype on **Vercel + Supabase**: real accounts, the closed XP→evolution loop,
> an adaptive daily check-in, persistence, and honest copy. See the **Resolution
> status** table in [LOGIC-GAPS.md](./LOGIC-GAPS.md) for exactly what's fixed,
> partial, or deferred, and [../DEPLOYMENT.md](../DEPLOYMENT.md) to put it live.

## Documents

| File | What it covers |
| --- | --- |
| **[../DEPLOYMENT.md](../DEPLOYMENT.md)** | Step-by-step go-live: Supabase (Seoul) → Vercel → Spaceship DNS for dolbomi.app. |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | The current Vercel + Supabase stack: repo layout, the SPA↔Supabase seam, RPC surface, schema/RLS, the 3D creature, build/run. |
| **[WORKFLOW-LOGIC.md](./WORKFLOW-LOGIC.md)** | Every core loop's intended vs. (original) actual behaviour. Predates the migration; useful as design intent. |
| **[LOGIC-GAPS.md](./LOGIC-GAPS.md)** | The original defect catalogue **plus a resolution-status table** of what the migration fixed. |

## What changed in the migration

- **Closed the core loop.** Completing a quest/subquest now writes `stats.cur`
  (server-side, via RPC), so the guardian evolves, the gilding shader moves, and
  the celebration reflects a real stat gain.
- **Real backend.** Express + SQLite + Render were dropped for **Supabase**
  (Postgres + Auth, Seoul) reached directly from the SPA with RLS; the SPA is on
  **Vercel**.
- **Real accounts & onboarding.** Supabase Auth sign-up collects name/rank/branch/
  guardian path; data is per-user via RLS.
- **Adaptive check-in.** Once-per-day streak guard + 오늘 밤의 3 regenerated from a
  quest pool sized to your energy.
- **Settings that persist**, a working branch filter, auto-awarded/equippable
  titles, live D-day, D-90 gating, real share, derived recap, single-sourced
  reference data.

_The original "TL;DR of findings" is preserved as the Resolution-status table in
LOGIC-GAPS.md._

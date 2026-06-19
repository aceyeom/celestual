# dolbomi.app

This repo now hosts **two** sites on the one domain:

| Path | Site | Folder | Status |
| --- | --- | --- | --- |
| **`/`** | **STILL.** — "does your ex still think about you?" | [`still-app/`](./still-app) | **live** |
| **`/dolbomi`** | **DOLBOMI** — 군인 자기개발 앱 (archived, still works) | [`archive/dolbomi-app/`](./archive/dolbomi-app) | paused |

Both are Vite + React SPAs talking directly to **the same Supabase project**
(no app server). A single repo-root build outputs both:

```bash
npm run build        # STILL → dist/ , dolbomi → dist/dolbomi/
```

`vercel.json` serves `dist/` at the root and rewrites `/dolbomi/*` to the
archived app. STILL. only **adds** the `still_*` tables — none of DOLBOMI's
database is dropped or modified.

---

## STILL. (the live site)

You enter your Instagram @ and your ex's @. You only find out it's mutual if
**they** independently enter **you** — anonymous, zero-rejection. One-sided
entries are never revealed.

- **Code & local dev:** [`still-app/README.md`](./still-app/README.md)
- **Go live:** [`DEPLOYMENT-STILL.md`](./DEPLOYMENT-STILL.md)
- **Backend:** `supabase/migrations/0006_still.sql` (RPC + RLS) and
  `supabase/functions/still-notify/` (match emails via Resend)

```bash
cd still-app && npm install && npm run dev   # demo mode: enter @demo to see a match
```

---

## DOLBOMI (archived)

A gamified self-development app for Korean military service members — six stats,
a real opportunity catalog, a vacation ladder, a benefits hub, and a 3D guardian
creature that evolves with XP. Fully functional; just no longer the homepage.

- **Code:** [`archive/dolbomi-app/`](./archive/dolbomi-app)
- **Original go-live guide:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
  (note: the Vercel **Root Directory** is now the repo root, not `dolbomi-app/` —
  see [`DEPLOYMENT-STILL.md`](./DEPLOYMENT-STILL.md))
- **Docs:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
  [`docs/LOGIC-GAPS.md`](./docs/LOGIC-GAPS.md),
  [`docs/WORKFLOW-LOGIC.md`](./docs/WORKFLOW-LOGIC.md)

```bash
cd archive/dolbomi-app && npm install && npm run dev
```

---

## Repository layout

```
still-app/            STILL. — the live Vite + React SPA (served at /)
archive/
  dolbomi-app/        DOLBOMI SPA — archived (served at /dolbomi)
  project/            DOLBOMI design-tool mockups (reference only)
  scripts/            DOLBOMI seed generator
supabase/
  migrations/         0001–0005 = DOLBOMI · 0006_still = STILL. (additive)
  functions/          still-notify edge function (match emails)
  seed.sql            DOLBOMI reference content (generated)
docs/                 DOLBOMI engineering docs
package.json          repo-root build (both apps → dist/)
vercel.json           routing: / → STILL., /dolbomi → DOLBOMI
DEPLOYMENT-STILL.md   STILL. go-live
DEPLOYMENT.md         DOLBOMI go-live (original)
```

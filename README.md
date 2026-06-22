# CELESTUAL

**CELESTUAL** — *"does your ex still think about you?"* — is an anonymous,
reciprocal matching site. Live at **https://celestual.us/**.

You enter your Instagram @ and your ex's @. You only find out it's mutual if
**they** independently enter **you** — anonymous, zero-rejection. One-sided
entries are never revealed to anyone.

It's a Vite + React single-page app talking directly to **Supabase** (Postgres
RPCs + edge functions); there is no separate app server.

---

## Repository layout

```
celestual/
├── app/              the Vite + React SPA (served at celestual.us/)
│   ├── src/
│   │   ├── api/      celestual.js (RPCs), supabase.js, auth.js, igverify.js, slots.js, profile.js, vault.js
│   │   ├── components/ screens.jsx, ui.jsx
│   │   ├── i18n/     translations + language switching
│   │   ├── App.jsx · galaxy.js · theme.js · styles.css
│   │   └── main.jsx
│   └── .env.example  front-end environment (Supabase URL + anon key, flags)
├── supabase/         the backend
│   ├── config.toml   Supabase CLI config
│   ├── migrations/   0001 matching core · 0002 accounts + encrypted sky · 0003 slot budget, multi-account, instant reveal · 0004 Instagram DM verification
│   └── functions/    celestual-notify · celestual-remind · celestual-search · celestual-ig-webhook
├── docs/             all the guides (see below)
├── package.json      repo-root build (app → dist/)
└── vercel.json       SPA routing
```

Everything — tables, RPCs, edge functions, env vars — is named `celestual` /
`celestual_*`. There is no longer any `celeste` or `still` codename.

## Quick start (local dev)

```bash
cd app
npm install
npm run dev          # demo mode (no backend): enter @demo as the ex to see a match
```

Without Supabase env vars the app runs fully in **demo mode**. To talk to a real
backend, copy `app/.env.example` to `app/.env.local` and paste your Supabase URL +
anon key.

## Build

```bash
npm run build        # from repo root → CELESTUAL into dist/
```

`vercel.json` serves `dist/` at the root.

## Going live

The whole manual setup — domain, Supabase, Vercel, email, optional sign-in — is
in **[docs/GO-LIVE.md](./docs/GO-LIVE.md)**. Start there. There is no paywall;
every star is free, gated only by a server-side weekly slot budget.

## Documentation

| Doc | What it covers |
| --- | --- |
| **[docs/GO-LIVE.md](./docs/GO-LIVE.md)** | **The manual checklist to connect everything and ship.** Start here. |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Detailed Supabase + Vercel + email deploy reference |
| **[docs/SETUP-IG-VERIFY.md](./docs/SETUP-IG-VERIFY.md)** | **Instagram DM handle verification (no OAuth) — prove the typed @ is really theirs.** |
| [docs/SETUP-AUTH.md](./docs/SETUP-AUTH.md) | Legacy Meta/Facebook sign-in notes — **superseded** by SETUP-IG-VERIFY.md |
| [docs/SECURITY.md](./docs/SECURITY.md) | The anonymity / safety model, the integrity controls, and an operator checklist |
| [app/README.md](./app/README.md) | Front-end architecture & flow |
| [supabase/README.md](./supabase/README.md) | Schema, RPCs, RLS, and edge functions |

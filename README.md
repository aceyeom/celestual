# CELESTUAL

**CELESTUAL** — *"is that special somebody still thinking about you?"* — is an
anonymous, reciprocal matching site. Live at **https://celestual.us/**.

You enter your Instagram @ and the @ of someone you can't stop thinking about.
You only find out it's mutual if **they** independently enter **you** —
anonymous, zero-rejection. One-sided entries are never revealed to anyone.

Signing back in is just your @ again: prove it's yours with the same one-time
Instagram DM and your sky — every star you've sent — comes back on any device.

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
│   └── functions/    celestual-notify · celestual-remind · celestual-search · celestual-manychat · celestual-ig-webhook
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

**`/beta`** is the same sandbox as `/demo` plus the beta features: the **intent
signal** (an optional "why them?" line sealed with a star, both sides revealed
only on a mutual match) and **constellations** (communities sharing one sky —
create one, join one, share one link that carries it; counts follow the 100
rule: hidden under 100, shown at 100+; no waitlists). A join link looks like
`/beta?c=<community name>`. Everything beta lives in `app/src/components/beta.jsx`
and persists only to `localStorage` (`celestual:beta:v1`) — nothing reaches the
server.

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
| **[docs/PRODUCT-FRAMEWORK.md](./docs/PRODUCT-FRAMEWORK.md)** | **The product assessment framework** — invariants, metrics, persona matrix, stress tests, growth loops |
| [docs/PERSONAS.md](./docs/PERSONAS.md) | The seven personas (incl. the non-customer ones) the design is scored against |
| [docs/PRICING-REVENUE.md](./docs/PRICING-REVENUE.md) | Pricing strategy (what can never be sold, what can), revenue model + scenarios, cost/breakeven |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Detailed Supabase + Vercel + email deploy reference |
| **[docs/SETUP-IG-VERIFY.md](./docs/SETUP-IG-VERIFY.md)** | **Instagram DM handle verification (no OAuth) — prove the typed @ is really theirs.** |
| [docs/SECURITY.md](./docs/SECURITY.md) | The anonymity / safety model, the integrity controls, and an operator checklist |
| [app/README.md](./app/README.md) | Front-end architecture & flow |
| [supabase/README.md](./supabase/README.md) | Schema, RPCs, RLS, and edge functions |

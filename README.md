# CELESTUAL

**celestual** — *"you still think about them. what if they think about you?"* —
is a double-blind, mutual-reveal site. Live at **https://celestual.us/**.

You enter someone's Instagram handle ("placing a ping"). They are never
notified. If and only if they independently enter yours, you both learn of the
match at the same instant. If it is never mutual, nothing is ever revealed to
anyone — and since the server stores who you entered only as a salted hash,
nothing ever *can* be.

The product direction is fixed by one document —
**[docs/ULTIMATE-PRODUCT-FRAMEWORK.md](./docs/ULTIMATE-PRODUCT-FRAMEWORK.md)**
(the masterguide) — and the whole repo implements it:

- **Three standing pings, sixty days each.** Renewal is free and one tap;
  letting one go frees the slot; lapsed unmatched pings are purged. Scarcity
  is the sincerity mechanism, not a paywall.
- **Loop A — the recruiter screen.** The moment a ping is placed you're told
  the truth: *standing* (they're reachable on celestual) or *waiting* (they
  aren't yet — and they'll never know you had anything to do with it), plus
  the deniable playbook.
- **Loop B — the open-door card.** Everyone gets a personal page
  (`celestual.us/@handle`) and a Story card in the receiver's voice ("if
  there's something you never said to me, it's safe here now"). A viewer taps
  through and lands two taps from their own first ping.
- **Loop C — campus windows.** A campus never opens half-empty: it
  preregisters toward a visible threshold (`/c/<campus>`), opens for everyone
  at once, and publishes exact week-one aggregates.
- **No monetization.** Nothing is for sale anywhere; the only thing that will
  ever be considered is a one-time fourth slot, dormant until density is
  proven (docs/PRICING-REVENUE.md).
- **Everything shown to anyone is literally true, always.** That truth is the
  legal and ethical margin the entire design lives inside.

It's a Vite + React single-page app talking directly to **Supabase** (Postgres
RPCs + edge functions); there is no separate app server.

---

## Repository layout

```
celestual/
├── app/              the Vite + React SPA (served at celestual.us/)
│   ├── src/
│   │   ├── api/      celestual.js (RPCs) · pings.js · supabase.js · auth.js · igverify.js
│   │   ├── components/ screens.jsx (the nine screens) · ui.jsx (primitives)
│   │   ├── i18n/     the canonical copy (strings.js)
│   │   ├── App.jsx · card.js (the Story card) · demoData.js · theme.js · styles.css
│   │   └── main.jsx
│   └── .env.example  front-end environment (Supabase URL + anon key, flags)
├── supabase/         the backend
│   ├── migrations/   0001–0005 history · 0006 the ping model (current)
│   └── functions/    celestual-notify · celestual-remind · celestual-search ·
│                     celestual-manychat · celestual-ig-webhook
├── docs/             the guides (see below)
├── scripts/          voice-lint.mjs (the copy tripwire)
├── package.json      repo-root build (app → dist/)
└── vercel.json       SPA routing (/@handle, /c/*, /optout all resolve in-app)
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | the cold landing → the send flow |
| `/@handle` | someone's open door — ping field prefilled (Loop B) |
| `/c/<campus>` | a campus window: the meter, then "it's open.", then week one (Loop C) |
| `/optout` | the public opt-out — any handle owner, no account needed |
| `/demo` | the sandbox (below) |
| `/privacy` · `/terms` · `/data-deletion` | the static legal pages |

## Quick start (local dev)

```bash
cd app
npm install
npm run dev
```

Without Supabase env vars the app runs with safe local fallbacks. To talk to a
real backend, copy `app/.env.example` to `app/.env.local` and paste your
Supabase URL + anon key.

**`/demo`** is the sandbox: nothing reaches a server. It ships with hardcoded
sample data to show what a school launch looks like — two sample pings (one
*standing*, one *waiting* and near its lapse), sample community counters, and
a campus window for "Reed" at 214 of 300 with a control that cycles it through
*window → open → week-one reveal*. Every non-mutual row carries **"sandbox:
they enter you back"**, which plays the full match reveal. Identity
verification in the demo runs the real overlay but **auto-verifies locally**
(the stand-in until DM verification is wired there).

## Build

```bash
npm run build        # from repo root → dist/
npm run lint:voice   # the copy tripwire (docs/VOICE.md §6)
```

`vercel.json` serves `dist/` at the root.

## Documentation

| Doc | What it covers |
| --- | --- |
| **[docs/ULTIMATE-PRODUCT-FRAMEWORK.md](./docs/ULTIMATE-PRODUCT-FRAMEWORK.md)** | **The masterguide.** The mechanism (Loops A/B/C), the screens, monetization posture, honest odds, failure modes. Everything else implements this. |
| [docs/DESIGN.md](./docs/DESIGN.md) | The living design system — the night, the one warm star, the three type registers, the anti-generic checklist |
| [docs/VOICE.md](./docs/VOICE.md) | The living voice guide — vocabulary, registers, the four frames, the banned list |
| [docs/SECURITY.md](./docs/SECURITY.md) | The privacy/safety model: hashed shadow data, the three-slot rule, the sixty-day purge, verification, the opt-out |
| [docs/PERSONAS.md](./docs/PERSONAS.md) | The seven people the design is scored against |
| [docs/PRICING-REVENUE.md](./docs/PRICING-REVENUE.md) | The monetization posture: nothing, deliberately, until density — then a one-time fourth slot |
| [docs/DEBUG-IG-WEBHOOK.md](./docs/DEBUG-IG-WEBHOOK.md) | Debugging the Instagram DM verification relay |
| [app/README.md](./app/README.md) | Front-end architecture & flow |
| [supabase/README.md](./supabase/README.md) | Schema, RPCs, RLS, edge functions, operator playbook |

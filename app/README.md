# CELESTUAL — does your ex still think about you?

The CELESTUAL front-end ("galaxy edition"). You enter your Instagram @ and your
ex's @. You only ever find out it's mutual if **they** independently enter **you**
back — so it's anonymous, zero-rejection, and a little addictive. One-sided
entries are never revealed to anyone.

Live at **https://celestual.us/**. The UI is fully responsive: full-bleed on a
phone, and the same intimate column centered over the 3D starfield on the web.

It's a Vite + React SPA that talks directly to Supabase. The safety/anonymity
model is documented in [`../docs/SECURITY.md`](../docs/SECURITY.md); the `§`
references in the code point there.

## Highlights

- **One color kit.** All color derives from a single source of truth,
  [`src/theme.js`](./src/theme.js) — the React UI, the canvas galaxy, and
  `styles.css` all read it, so the whole product is one cosmic-violet world.
- **All languages.** Browser-language auto-detection + a manual switcher
  (top-right), with curated, fallback-safe translations in
  [`src/i18n/`](./src/i18n). English is canonical; partial locales fall back
  key-by-key. Add a language by dropping a partial dict into `strings.js`.
- **Motion-graphic intro.** A short staged explainer for new users (replayable
  via "how it works") ending in two stars colliding into one.
- **Interactive resting field.** Tap any star → the camera drifts in and zooms; a
  detail card shows its state, the registry date, and a remove action; close to
  zoom back out (`galaxy.js` `focusStar` / `hitTest`).
- **`/demo`.** `celestual.us/demo` runs with **zero verification and zero
  paywall** — everything unlocked and free.
- **Optional integrations** behind `VITE_*` flags (off by default, safe local
  fallbacks): Meta sign-in ([`src/api/auth.js`](./src/api/auth.js)), a paywall —
  first star free, pay for more ([`src/api/pay.js`](./src/api/pay.js) +
  `supabase/functions/celestual-checkout`), and @ search typeahead
  (`searchHandles()` + `supabase/functions/celestual-search`). See
  [`.env.example`](./.env.example).

## Flow

A short guided flow over an animated starfield (`src/galaxy.js`):

| Screen | What it does |
| --- | --- |
| **Landing** | The hook + "Find out". |
| **You** | Captures your email **first and emphasized**, then your handle — so a match that lands after you leave can always reach you (§2.3 / §4.3). |
| **Them** | The one person you can't stop thinking about. "Seal it" records the entry. |
| **Send-off** | The galaxy payoff while the lookup runs (min ~3.2s suspense). |
| **Resting** | Where everyone lands. **There is no on-screen result** — a mutual match is revealed only by a private email (deferred reveal, §2.3). Also offers withdraw + "forget on this device". |
| **Pricing** | The reveal is always free (§2.2). |
| **Privacy** | Privacy & terms + self-service erasure: remove/block any handle, forget this device (§2.5 / §4.3 / §4.6). |

> **Deferred reveal (§2.3):** the app never tells you on screen whether it's
> mutual — that would let an attacker probe whether someone secretly entered them.
> The "yes" arrives only as an email to the earlier entrant. The `Match` screen
> component is kept for a future verified reveal link but isn't reached from the
> live flow.

State persists in `localStorage`, but **only the minimum to resume** — never the
handles you entered or whether anything matched (§4.3). Those live in memory.

## Stack

| Layer | Service |
| --- | --- |
| Frontend SPA | Vite + React, this folder |
| Match logic | Supabase `celestual_submit` RPC (`SECURITY DEFINER`, deferred reveal) |
| Match emails | Supabase Edge Function (`celestual-notify`) → Resend |

The backend lives in [`../supabase/`](../supabase): one schema migration
(`migrations/0001_celestual.sql`) plus the edge functions
(`celestual-notify`, `celestual-checkout`, `celestual-search`).

## How matching works

1. The browser calls one RPC: `celestual_submit(p_from, p_to, p_email)`.
2. It records the one-way entry and checks for the reciprocal entry.
3. It returns **only** `{ recorded: true }` — never whether it's mutual (deferred
   reveal, §2.3). The client can never read who entered whom (RLS on, zero
   policies; the only way in is the `SECURITY DEFINER` RPC).
4. On a mutual match it queues an email to the **earlier** entrant. It never emails
   the address supplied on the triggering request (anti-exfiltration).
5. The `celestual-notify` edge function sends queued emails via Resend, with
   exponential-backoff retries and a dead-letter mark after repeated failures
   (§5.1).

Full safety rationale: [`../docs/SECURITY.md`](../docs/SECURITY.md).

## Run it locally

```bash
npm install
cp .env.example .env.local   # paste Supabase URL + anon key (optional)
npm run dev                  # demo mode if no env (enter @demo to see a match)
```

Without env vars the app runs in **demo mode**: enter `demo` as the ex's @ to see
the mutual reveal; anything else shows the resting/pending state.

## Build

The repo-root build (`../package.json`) produces the app into `../dist`:

```bash
cd .. && npm run build       # CELESTUAL → dist/
```

See [`../docs/GO-LIVE.md`](../docs/GO-LIVE.md) for the go-live steps.

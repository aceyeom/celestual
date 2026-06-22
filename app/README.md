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
- **Free, with a gentle limit.** No paywall — every star is free. A server-side
  weekly **slot budget** (3, +1/week, never refunded on withdrawal) keeps people
  intentional and blocks "fish for who likes me" sweeps
  ([`src/api/slots.js`](./src/api/slots.js); enforced in `celestual_submit`).
- **Multi-account.** People can link up to 3 of their own @s; being entered on any
  of them counts (group-aware matching, `celestual_handle_links`).
- **`/demo`.** `celestual.us/demo` is **fully sandboxed** — zero verification and
  never writes to the real backend (enter `@demo` as the ex to see a match).
- **Instagram DM verification** (no OAuth, no Meta dev portal) behind
  `VITE_IG_VERIFY_ENABLED` (off by default → a local verified stub keeps the flow
  testable). People prove the `@` they type is theirs by DMing a one-time code to
  your Instagram account, relayed by **ManyChat** to `supabase/functions/celestual-manychat`
  (or Meta's webhook directly via `celestual-ig-webhook`). Front-end:
  [`src/api/igverify.js`](./src/api/igverify.js). See
  [`../docs/SETUP-IG-VERIFY.md`](../docs/SETUP-IG-VERIFY.md).
- **Optional @ search typeahead** behind `VITE_HANDLE_SEARCH` (off by default):
  `searchHandles()` + `supabase/functions/celestual-search`. See
  [`.env.example`](./.env.example).

## Flow

A short guided flow over an animated starfield (`src/galaxy.js`):

| Screen | What it does |
| --- | --- |
| **Landing** | The hook + "Find out". |
| **You** | Your handle (your star's label); optionally add an email and any other accounts you own (a quiet, revealable field). |
| **Them** | The one person you can't stop thinking about. "Seal it" records the entry and spends a slot. |
| **Send-off** | The galaxy payoff while the lookup runs (min ~3.2s suspense). |
| **Resting** | Your sky. Each entry rests as a star; mutual ones glow amber (the constellations view), and a slot meter shows how many you have left. |
| **Match** | Shown **instantly** when you complete a mutual pair — open the conversation, or not. |
| **Out of slots** | When the weekly budget is spent: a countdown to the next star + an optional email nudge. No paywall. |
| **Privacy** | Privacy & terms + self-service erasure: remove/block any handle (§2.5 / §4.6). |

> **Reveal model (§2.3):** completing a mutual pair reveals it **instantly**
> in-app (a deliberate product choice). The tight slot budget — not deferral — is
> what keeps that from becoming a "who likes me" fishing oracle. The earlier
> entrant is still emailed, and the constellations view also surfaces mutuals on
> return visits.

The in-progress entry (`them`) lives in **memory only** (§4.3). Your sky — the
stars you've sealed — persists, AES-GCM **encrypted** when signed in (and locally
otherwise); see [`src/api/profile.js`](./src/api/profile.js) and
[`src/api/vault.js`](./src/api/vault.js).

## Stack

| Layer | Service |
| --- | --- |
| Frontend SPA | Vite + React, this folder |
| Match logic | Supabase `celestual_submit` RPC (`SECURITY DEFINER`, instant reveal + slot budget) |
| Match emails | Supabase Edge Function (`celestual-notify`) → Resend |

The backend lives in [`../supabase/`](../supabase): three migrations
(`0001` core · `0002` accounts · `0003` slot budget + multi-account) plus the edge
functions (`celestual-notify`, `celestual-remind`, `celestual-search`).

## How matching works

1. The browser calls one RPC: `celestual_submit(p_from, p_to, p_email)`.
2. It enforces the weekly slot budget (new people only; re-submits are free), then
   records the one-way entry and checks for the reciprocal **across identity
   groups** (multi-account).
3. The client can never read who entered whom (RLS on, zero policies; the only way
   in is the `SECURITY DEFINER` RPC).
4. It returns whether the pair is mutual (**instant reveal**) plus the live slot
   snapshot. On a mutual match it also queues an email to the **earlier** entrant —
   never the address supplied on the triggering request (anti-exfiltration).
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

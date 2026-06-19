# CELESTUAL — does your ex still think about you?

A viral web app ("galaxy edition"). You enter your Instagram @ and your ex's @.
You only ever find out it's mutual if **they** independently enter **you** back —
so it's anonymous, zero-rejection, and a little addictive. One-sided entries are
never revealed to anyone.

Live at **https://celestual.us/**. The UI is fully responsive: full-bleed
on a phone, and the same intimate column centered over the 3D starfield on the web.

> **Name:** the product is **CELESTUAL**. The Supabase objects, this `still-app/`
> folder, and the `still-notify` function keep their `still_*` codenames for
> continuity with the database — only the brand/UI is CELESTUAL.

## What's new (galaxy edition v2)

- **One color kit.** All color now derives from a single source of truth,
  [`src/theme.js`](./src/theme.js) — the React UI, the canvas galaxy, and
  `styles.css` all read it, so the whole product is one cosmic-violet world on
  every screen (no more orange-loading vs. purple-galaxy clash). The inconsistent
  "LISTENING" corner badge and the old "why it's free →" link are gone.
- **All languages.** Browser-language auto-detection + a manual switcher
  (top-right), with curated, fallback-safe translations in
  [`src/i18n/`](./src/i18n). English is canonical; partial locales fall back
  key-by-key. Add a language by dropping a partial dict into `strings.js`.
- **Motion-graphic intro.** A short staged explainer for new users (replayable
  via "how it works") ending in two stars colliding into one.
- **Interactive resting field.** Tap any star → the camera drifts in and zooms;
  a detail card shows its state (still waiting), the registry date, and a remove
  action; close to zoom back out (`galaxy.js` `focusStar`/`hitTest`).
- **`/demo`.** `celestual.us/demo` (and `…/demo`) runs with **zero verification
  and zero paywall** — everything unlocked and free.
- **Meta auth up front** (scaffold, [`src/api/auth.js`](./src/api/auth.js)),
  **paywall** — first star free, pay to add more via Stripe / KakaoPay / TossPay
  (scaffold, [`src/api/pay.js`](./src/api/pay.js) +
  `supabase/functions/still-checkout`), and **@ search** typeahead (scaffold,
  `searchHandles()` + `supabase/functions/still-search`). All three are behind
  the `VITE_*` flags in [`.env.example`](./.env.example) and ship **off** by
  default (safe local fallbacks) until their backends + keys are wired.

## Flow

A short guided flow over an animated starfield (`src/galaxy.js`), built from the
galaxy-edition design and the recommendations in [`PRODUCT-ANALYSIS.md`](./PRODUCT-ANALYSIS.md):

| Screen | What it does |
| --- | --- |
| **Landing** | The hook + "Find out". |
| **You** | Captures your email **first and emphasized**, then your handle — so a match that lands after you leave can always reach you (memo §2.3 / §4.3). |
| **Them** | The one person you can't stop thinking about. "Seal it" records the entry. |
| **Send-off** | The galaxy payoff while the lookup runs (min ~3.2s suspense). |
| **Resting** | Where everyone lands. **There is no on-screen result** — a mutual match is revealed only by a private email (deferred reveal, memo §2.3). Also offers withdraw + "forget on this device". |
| **Pricing** | **Free while we're early** — monetization isn't built yet, and the reveal is always free (memo §2.2). |
| **Privacy** | Privacy & terms + self-service erasure: remove/block any handle, forget this device (memo §2.5/§4.3/§4.6). |

> **Deferred reveal (memo §2.3):** for safety, the app never tells you on screen
> whether it's mutual — that would let an attacker probe whether someone secretly
> entered them. The "yes" arrives only as an email to the earlier entrant, the one
> owner-controlled channel. The `Match` screen component is kept for a future
> verified reveal link but is no longer reached from the live flow.

State persists in `localStorage`, but **only the minimum to resume** — never the
handles you entered or whether anything matched (memo §4.3). Those live in memory.

## Stack

Vite + React on Supabase. The `still_*` tables/RPC live in
`supabase/migrations/0001_still.sql` (hardened in `0002_still_safety.sql` and
`0003_still_deferred_reveal.sql`) plus edge functions under
`supabase/functions/` (`still-notify`, `still-checkout`, `still-search`).

| Layer | Service |
| --- | --- |
| Frontend SPA | Vite + React, in this folder |
| Match logic | Supabase `still_submit` RPC (`SECURITY DEFINER`, returns only yes/no) |
| Match emails | Supabase Edge Function → Resend |

## How matching works

1. The browser calls one RPC: `still_submit(p_from, p_to, p_email)`.
2. It records the one-way entry and checks for the reciprocal entry.
3. It returns **only** `{ recorded: true }` — never whether it's mutual (deferred
   reveal, §2.3). The client can never read who entered whom (the tables have RLS
   on and zero policies; the only way in is the `SECURITY DEFINER` RPC).
4. On a mutual match it queues an email to the **earlier** entrant (who has left
   the app). It never emails the address supplied on the request that triggers the
   match, which closes the instant email-exfiltration path (see Safety).
5. The `still-notify` edge function sends queued emails via Resend, with
   exponential-backoff retries and a dead-letter mark after repeated failures
   (memo §5.1).

## Safety

`0002_still_safety.sql` and `0003_still_deferred_reveal.sql` implement the
launch-blocking mitigations from the memo that don't need handle-ownership
verification:

- **Deferred reveal (§2.3)** — `still_submit` never returns whether a pair is
  mutual; it returns only `{ recorded: true }`. This closes the live "prober
  oracle" where an attacker submitting `from=<victim>, to=<target>` could read on
  screen whether the target privately entered the victim. The yes is delivered
  only by the exfil-safe match email.
- **Rate limiting (§4.1)** — per-IP (40/hr), per-`from` (20/hr), and per-`to`
  (60/hr) caps on `still_submit`. The per-`to` cap throttles a targeted prober who
  rotates the (attacker-controlled) `from` to dodge the per-`from` cap. The RPC
  returns `{ recorded: false, error: 'rate_limited' }` when throttled.
- **No email exfiltration** — the match email only ever goes to the earlier
  entrant, never to an address typed on the triggering request, so an impersonator
  can't have a target's private feeling mailed to their own inbox.
- **Erasure & suppression (§2.5/§4.6)** — `still_withdraw(from, to)` un-sends an
  entry; `still_suppress(handle)` is a public erasure endpoint that deletes all
  data referencing a handle and blocks it from ever being entered again (exposed
  on the in-app **Privacy & terms** screen).
- **18+ affirmation (§3)** and a **"forget on this device"** control (§4.3); the
  secrets (who you entered, any match state) are never written to `localStorage`.

The **complete** fix for impersonation is still handle-ownership verification —
Instagram OAuth or a one-time code — tracked as the next P0. With deferred reveal
in place, a determined impersonator no longer gets any live signal; the remaining
gap is that the triggering submitter isn't notified until ownership exists.

## Run it locally

```bash
cd still-app
npm install
cp .env.example .env.local   # paste Supabase URL + anon key (optional)
npm run dev                  # demo mode if no env (enter @demo to see a match)
```

Without env vars the app runs in **demo mode**: enter `demo` as the ex's @ to see
the mutual reveal; anything else shows the resting/pending state.

## Build

The repo-root build (`../package.json`) produces the app into `../dist`:

```bash
cd ..
npm run build        # CELESTUAL → dist/
```

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the go-live steps.

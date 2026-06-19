# CELESTUAL — Setup: Instagram Sign-in & Payments

An **easy, step-by-step** guide to turning on the two pieces that ship in a safe,
stubbed state today:

1. **Instagram sign-in** — confirms a person is real, at the moment they seal a star.
2. **Payments** — the first star is free for everyone; extra stars are a one-off charge.

You don't need to touch any code. Each feature is behind a flag that's **off by
default**, so the app stays fully testable until you flip it on. Until then:

- Sign-in resolves a local **verified stub** (the flow works, nobody's blocked).
- Extra stars are **granted locally** (so you can exercise the whole flow).

> New here? Do **[GO-LIVE.md](./GO-LIVE.md)** first (Supabase
> schema + the match-email function). This guide assumes the app is already live
> on Vercel + Supabase.

---

## 0. Where these settings live

Two places, both you already use:

| Thing | Where |
| --- | --- |
| **Front-end flags** (`VITE_*`) | Vercel → Project → **Settings → Environment Variables** (and `app/.env.local` for local dev) |
| **Secret keys** (Stripe, Meta) | Never in the front-end. They live in **Supabase** (Auth provider config + Edge Function secrets) |

The flags that matter here (all default `0` = off/stub):

```
VITE_META_ENABLED=0     # Instagram sign-in
VITE_PAY_ENABLED=0      # Payments (extra stars)
VITE_HANDLE_SEARCH=0    # @ search typeahead (optional, section 3)
```

After changing any `VITE_*` value in Vercel you must **redeploy** for it to take effect.

---

## 1. Instagram sign-in (Meta)

CELESTUAL uses **Supabase Auth's Facebook provider** (Meta owns Instagram; the
Facebook login proves a real identity). It runs in a **popup** at seal time, so the
in-progress entry is never lost. Budget ~20 minutes.

### 1.1 Create a Meta app
1. Go to **[developers.facebook.com](https://developers.facebook.com)** → **My Apps → Create App**.
2. Use case: **Authenticate and request data from users with Facebook Login**.
3. Give it a name (e.g. `CELESTUAL`) and create it.

### 1.2 Add Facebook Login
1. In the app dashboard → **Add Product** → **Facebook Login** → **Set up**.
2. Skip the quickstart; go to **Facebook Login → Settings**.
3. Leave **Client OAuth Login** and **Web OAuth Login** **on**. You'll add the
   redirect URL in step 1.4.

### 1.3 Get your App ID & Secret, and connect Supabase
1. In Meta: **App settings → Basic** → copy the **App ID** and **App Secret**.
2. In Supabase: **Authentication → Sign In / Providers → Facebook** → enable it,
   and paste the **App ID** (Client ID) and **App Secret**.
3. Supabase shows a **Callback URL** that looks like
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. **Copy it.**
4. Back in Meta → **Facebook Login → Settings → Valid OAuth Redirect URIs** →
   paste that Supabase callback URL. **Save.**

### 1.4 Add the app's own redirect URLs (incl. the popup callback)
In Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://celestual.us`
- **Redirect URLs:** add **all** of these (the popup hands the session back to the
  app at `…?auth=cb`, which must be allow-listed):
  ```
  https://celestual.us/**
  https://*.vercel.app/**        ← preview builds
  http://localhost:5173/**       ← local dev (vite default)
  ```
  The wildcard `/**` already covers the `?auth=cb` popup-callback URL.

### 1.5 Flip the flag
In Vercel → Environment Variables, set:
```
VITE_META_ENABLED=1
```
Redeploy.

### 1.6 Test it
1. Open the live site, click **Find out**, watch the intro, type your `@`, leave
   email blank, pick someone, and tap **Seal it** → **Confirm with Instagram & seal**.
2. A **popup** opens for Facebook login. Approve it.
3. The popup closes itself, the original tab stays exactly where it was, and the
   star seals. 🎉
4. **Allow popups** for the site if your browser blocks the first one. (If a popup
   is blocked, the app falls back to a full-page redirect; you'll return signed in
   and can re-enter — the popup path is the smooth one.)

### 1.7 About the *verified* Instagram handle (read this)
Facebook Login proves the person is real and gives their name/email. Reading their
**verified Instagram username** automatically needs **Instagram API access + Meta
App Review** (a business/creator-account permission). Until you complete that:

- The person **types their own `@`** on the "this is you" step (we keep that field
  regardless — it's their star's label).
- Sign-in confirms they're a real account; we don't overwrite their typed handle.

When you finish App Review, the verified handle Supabase returns will auto-fill —
no code change needed (see `app/src/api/auth.js → sessionFromUser`).

> **Going to production on Meta:** flip the Meta app from *Development* to *Live*
> (top bar toggle) and complete the brief Data Use Checkup. In Development mode,
> only accounts you add as **Testers** (App Roles → Roles) can sign in.

---

## 1.8 Accounts & your saved sky (encrypted)

Once a person signs in with Instagram, their **account and their sky** (the stars
they've sealed) are saved to the database and follow them across devices — so a
refresh no longer wipes anything. This needs one quick step:

### 1.8.1 Apply the accounts migration
In Supabase → **SQL Editor**, run **`supabase/migrations/0002_user_accounts.sql`**
(or `supabase db push` with the CLI). It adds, all owner-scoped by RLS on
`auth.uid()`:

- `celestual_profiles` — account fields + the **encrypted sky** blob,
- `celestual_user_keys` — the per-user encryption key, readable only by its owner,
- `celestual_entitlements` — paid-star count (written by the payment webhook),
- `celestual_delete_me()` — powers the account area's "delete account".

### 1.8.2 How the sky stays private
The list of @handles a user has entered is **AES-GCM encrypted in the browser**
before it's stored (see `app/src/api/vault.js`). The key lives in
`celestual_user_keys`, readable only by that signed-in user, so the ciphertext in
`celestual_profiles` can't be read by another user or by a dump of that table
alone. (It is *not* zero-knowledge: an operator with the service role could join
both tables — this is at-rest, least-privilege protection. Documented so nobody
over-trusts it.)

### 1.8.3 The account area
A small **profile chip** (top-left) shows who's signed in. Tapping it opens the
account sheet: edit handle / email / display name, see your sky, manage payments,
**sign out**, or **delete account**. No flag needed — it's always on; before
sign-in it saves to the device, and after sign-in to the encrypted account.

> **Before the backend is wired** (no Supabase env vars, or `VITE_META_ENABLED=0`):
> the sky is kept in `localStorage` so a refresh still doesn't wipe it. Signing in
> later adopts and merges that local sky into the account.

---

## 2. Payments (Stripe)

Product rule: **first star free, forever**; every star after that is one payment of
**$2.99** (`PRICE_LABEL` in `app/src/api/pay.js`). Checkout runs through the
**`celestual-checkout`** Supabase Edge Function so your secret key never touches the
browser. Budget ~20 minutes.

### 2.1 Create the Stripe product & price
1. Sign up at **[stripe.com](https://stripe.com)**. Stay in **Test mode** for now
   (toggle, top-right).
2. **Products → Add product** → name it `CELESTUAL — one more star`, set a
   **one-time** price of **$2.99** → **Save**.
3. Open the price → copy its **Price ID** (looks like `price_1AbC...`).
4. **Developers → API keys** → copy your **Secret key** (`sk_test_...`).

### 2.2 Deploy the checkout function
From the repo root, with the [Supabase CLI](https://supabase.com/docs/guides/cli)
linked to your project (`supabase link`):
```bash
supabase functions deploy celestual-checkout
```

### 2.3 Set the function secrets
Supabase → **Edge Functions → Secrets** (or via CLI):
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx STRIPE_PRICE_ID=price_xxx
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

### 2.4 Flip the flag
In Vercel:
```
VITE_PAY_ENABLED=1
```
Redeploy.

### 2.5 Test with a test card
1. Seal your **first** star (free). On the resting sky, tap **Enter someone else**.
2. Because the second star is paid, you land on **Unlock another star** → **Pay with card**.
3. You're sent to Stripe's hosted checkout. Use the test card **`4242 4242 4242 4242`**,
   any future expiry, any CVC/ZIP.
4. On success Stripe returns you to `…?paid=1`; the app grants the credit and drops
   you onto the entry to seal the new star. 🎉

### 2.6 Hardening for real money (recommended)
The interim flow above **grants the credit on the client** when it sees `?paid=1`.
That's fine for launch/testing but a determined user could self-grant. For real
revenue, make a **Stripe webhook** the source of truth:

1. Stripe → **Developers → Webhooks → Add endpoint**, event
   **`checkout.session.completed`**, pointing at a small Supabase function (you can
   extend `celestual-checkout` or add `celestual-paid`).
2. In that handler, record a paid credit for the buyer (a `celestual_entitlements`
   row), and have the client read entitlements at seal time instead of trusting
   `?paid=1`. The seam is already isolated in `app/src/api/pay.js`
   (`getUnlocked` / `canSealIndex`) — swap those to read the server.
3. Switch Stripe to **Live mode**, repeat 2.1/2.3 with live keys (`sk_live_…`),
   and complete Stripe's account activation.

### 2.7 Korea: KakaoPay & TossPay (optional)
The same function already scaffolds both. Add the matching secrets and the buttons
light up (they're always shown; they return a friendly error until configured):
```bash
# KakaoPay
supabase secrets set KAKAO_PAY_CID=xxx KAKAO_PAY_SECRET_KEY=xxx
# TossPay (widget is finished client-side; see the function's notes)
supabase secrets set TOSS_SECRET_KEY=xxx
# Price for KRW providers (default 3900)
supabase secrets set CELESTUAL_STAR_PRICE_KRW=3900
```

---

## 3. (Optional) @ search typeahead

The "their handle" field can show Instagram-style suggestions, but only via a
**server-side** source (a scraper key can never live in the browser, and suggesting
from entered handles would leak who's been entered). It's off by default — manual
entry + validation carries the flow. To enable later:

1. Implement a provider inside `supabase/functions/celestual-search` (proxy a vetted
   source) and `supabase functions deploy celestual-search`.
2. Set `VITE_HANDLE_SEARCH=1` in Vercel and redeploy. No UI change needed.

---

## 4. Env var quick reference

| Variable | Off (default) | On |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | offline demo | live data (required for auth/pay) |
| `VITE_META_ENABLED` | verified **stub** at seal | real Instagram popup sign-in |
| `VITE_PAY_ENABLED` | extra stars granted **locally** | real Stripe/Kakao/Toss checkout |
| `VITE_HANDLE_SEARCH` | manual @ entry only | live search suggestions |

The `/demo` route (e.g. `https://celestual.us/demo`) always bypasses **both**
sign-in and the paywall — handy for showing the full flow to anyone.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sign-in popup opens then "redirect URI" error | The Supabase callback URL isn't in Meta's **Valid OAuth Redirect URIs** (step 1.3), or your site URL isn't in Supabase **Redirect URLs** (step 1.4). |
| "URL not allowed" after sign-in | Add `https://your-domain/**` (and the preview/localhost variants) to Supabase **Redirect URLs**. |
| Popup is blocked | Allow popups for the site. The seal button is wired to open it inside your tap so most browsers permit it; the redirect fallback also works. |
| Only certain accounts can sign in | The Meta app is still in **Development** mode — add testers, or switch it to **Live** (step 1.7). |
| Sign-in seems to do nothing | `VITE_META_ENABLED` isn't `1`, or Supabase env vars are missing → it's using the stub. Re-check Vercel and redeploy. |
| "Pay with card" shows an error | `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` not set on the function, or the function isn't deployed (steps 2.2–2.3). |
| Paid but no extra star | You returned without `?paid=1` (check Stripe's **success URL** is `…?paid=1`), or `VITE_PAY_ENABLED` isn't `1`. |
| Everything's free even though `VITE_PAY_ENABLED=1` | You're on the `/demo` route — it never paywalls. Use the normal URL. |

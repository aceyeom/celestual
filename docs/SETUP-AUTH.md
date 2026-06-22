# CELESTUAL — Setup: Instagram Sign-in (legacy)

> ## ⚠️ Superseded — read [SETUP-IG-VERIFY.md](./SETUP-IG-VERIFY.md) instead
>
> CELESTUAL **no longer uses Facebook/Meta OAuth.** Handle ownership is now proven
> with an **Instagram DM code** (no OAuth, no popup, no password) — see
> **[SETUP-IG-VERIFY.md](./SETUP-IG-VERIFY.md)**. The Facebook-provider flow below is
> kept only for historical reference; `VITE_META_ENABLED` and `api/auth.js`'s OAuth
> popup have been removed. Section **1.8** (accounts + the encrypted sky) is still
> accurate background.

An **easy, step-by-step** guide to turning on Instagram sign-in, which confirms a
person is real at the moment they seal a star.

> **Status:** sign-in is **postponed** for the current launch — the app runs on a
> local **verified stub** so the flow works and nobody is blocked. This guide is
> here for when you're ready to switch on real Meta sign-in; nothing in it is
> required to ship.

There's no paywall to set up: **every star is free.** The only limit is a weekly
**entry-slot budget** (3 slots, +1/week), enforced server-side in
`celestual_submit` — see [SECURITY.md](./SECURITY.md).

You don't need to touch any code. Sign-in is behind a flag that's **off by
default**, so the app stays fully testable until you flip it on.

> New here? Do **[GO-LIVE.md](./GO-LIVE.md)** first (Supabase
> schema + the match-email function). This guide assumes the app is already live
> on Vercel + Supabase.

---

## 0. Where these settings live

Two places, both you already use:

| Thing | Where |
| --- | --- |
| **Front-end flags** (`VITE_*`) | Vercel → Project → **Settings → Environment Variables** (and `app/.env.local` for local dev) |
| **Secret keys** (Meta) | Never in the front-end. They live in **Supabase** (Auth provider config + Edge Function secrets) |

The flags that matter here (all default `0` = off/stub):

```
VITE_META_ENABLED=0     # Instagram sign-in
VITE_HANDLE_SEARCH=0    # @ search typeahead (optional, section 2)
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

- `celestual_profiles` — account fields (incl. your linked accounts) + the **encrypted sky** blob,
- `celestual_user_keys` — the per-user encryption key, readable only by its owner,
- `celestual_delete_me()` — powers the account area's "delete account".

Also apply **`0003_production_hardening.sql`** — it adds the weekly slot budget,
multi-account identity groups, and the instant-reveal matching. (`supabase db push`
applies both in order.)

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
account sheet: edit handle / email / display name, add your other accounts, see
your sky and your stars budget, **sign out**, or **delete account**. No flag needed
— it's always on; before sign-in it saves to the device, and after sign-in to the
encrypted account.

> **Before the backend is wired** (no Supabase env vars, or `VITE_META_ENABLED=0`):
> the sky is kept in `localStorage` so a refresh still doesn't wipe it. Signing in
> later adopts and merges that local sky into the account.

---

## 2. (Optional) @ search typeahead

The "their handle" field can show Instagram-style suggestions, but only via a
**server-side** source (a scraper key can never live in the browser, and suggesting
from entered handles would leak who's been entered). It's off by default — manual
entry + validation carries the flow. To enable later:

1. Implement a provider inside `supabase/functions/celestual-search` (proxy a vetted
   source) and `supabase functions deploy celestual-search`.
2. Set `VITE_HANDLE_SEARCH=1` in Vercel and redeploy. No UI change needed.

---

## 3. Env var quick reference

| Variable | Off (default) | On |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | offline demo | live data (required for real entries) |
| `VITE_META_ENABLED` | verified **stub** at seal | real Instagram popup sign-in |
| `VITE_HANDLE_SEARCH` | manual @ entry only | live search suggestions |

The `/demo` route (e.g. `https://celestual.us/demo`) is fully sandboxed — it
bypasses sign-in and never writes to the real backend — handy for showing the
full flow to anyone. Every star is free; the only limit is the weekly slot budget.

---

## 4. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sign-in popup opens then "redirect URI" error | The Supabase callback URL isn't in Meta's **Valid OAuth Redirect URIs** (step 1.3), or your site URL isn't in Supabase **Redirect URLs** (step 1.4). |
| "URL not allowed" after sign-in | Add `https://your-domain/**` (and the preview/localhost variants) to Supabase **Redirect URLs**. |
| Popup is blocked | Allow popups for the site. The seal button is wired to open it inside your tap so most browsers permit it; the redirect fallback also works. |
| Only certain accounts can sign in | The Meta app is still in **Development** mode — add testers, or switch it to **Live** (step 1.7). |
| Sign-in seems to do nothing | `VITE_META_ENABLED` isn't `1`, or Supabase env vars are missing → it's using the stub. Re-check Vercel and redeploy. |
| "Your stars are resting" right away | That's the slot budget (3, +1/week), not an error — it's spent. The countdown shows when the next one unlocks. |

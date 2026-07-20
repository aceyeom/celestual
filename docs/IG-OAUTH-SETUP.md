# CELESTUAL — Instagram Login (OAuth 2.0) setup, end to end

This wires the **scale path** for handle verification: the person taps **"Continue with
Instagram,"** logs in, and Meta tells us their real username — no DM, no ManyChat, no
Facebook Page. Read [OAUTH-SCALING-STRATEGY.md](./OAUTH-SCALING-STRATEGY.md) for *why*.

Written for a beginner — follow top to bottom. ~30 minutes (plus App Review to go Live).

> **Your specific values** (fill in as you go):
>
> | Thing | Value |
> | --- | --- |
> | Instagram account | `@celestual.us` (a **Professional** account) |
> | Supabase project ref | `vwbsjwaqnycyghvwlxhd` |
> | OAuth function URL (the redirect target) | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth` |
> | Where the app lives | `https://celestual.us` |
> | Secrets it needs | `IG_OAUTH_CLIENT_ID`, `IG_OAUTH_CLIENT_SECRET`, `IG_OAUTH_REDIRECT_URI`, `CELESTUAL_SITE_URL` |

---

## 0. The 30-second mental model

```
  Your site                 Supabase                      Instagram / Meta
  ─────────                 ────────                      ────────────────
  tap "continue with IG" ─▶ celestual_start_ig_oauth
       (mints proof)         → random `state`
  redirect to consent ───────────────────────────────────▶ instagram.com/oauth/authorize
       user approves ◀───────────────────────────────────┘
                            celestual-ig-oauth  ◀── Instagram redirects ?code&state
                              ├─ code → token + user_id      (api.instagram.com)
                              ├─ token → real username       (graph.instagram.com/me)
                              └─ celestual_complete_ig_verification(state, username)
                                   ✔ real @ == claimed @ → row = 'verified'
  page polls state, flips to ✓ and seals with the same proof
```

The security gate is identical to the DM path: the row flips to `verified` **only** when
Meta's authenticated username equals the claimed handle. The browser holds the `proof`;
the function never sees it.

---

## 1. Prerequisites

1. **`@celestual.us` is a Professional account** (Instagram app → Settings → *Account
   type and tools* → *Switch to professional account*; Creator or Business is fine).
2. A **Meta app** at [developers.facebook.com](https://developers.facebook.com) with the
   **Instagram** product added, set up as **"API setup with Instagram login"** (the path
   that needs **no** Facebook Page). If you already did the DM webhook, you have this.
3. The **Supabase CLI** linked: `supabase login`, then
   `supabase link --project-ref vwbsjwaqnycyghvwlxhd`.

---

## 2. Get the OAuth client id + secret, and register the redirect URI

In the Meta App Dashboard → **Instagram → API setup with Instagram login**:

1. Find **"Instagram app ID"** and **"Instagram app secret"** — these are your
   `IG_OAUTH_CLIENT_ID` and `IG_OAUTH_CLIENT_SECRET`. (The secret may be the same value
   you already use as `IG_APP_SECRET`; copy it fresh to be sure.)
2. In the **"Business login settings"** (a.k.a. OAuth settings), set **Valid OAuth
   Redirect URIs** to **exactly**:

   ```
   https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth
   ```

   Meta compares this **verbatim** — scheme, host, path, trailing slash all must match
   what the function uses as `IG_OAUTH_REDIRECT_URI`. No trailing slash here → no trailing
   slash in the secret.

---

## 3. Deploy the function and set the four secrets

```bash
# from the repo root
supabase secrets set \
  IG_OAUTH_CLIENT_ID="your-instagram-app-id" \
  IG_OAUTH_CLIENT_SECRET="your-instagram-app-secret" \
  IG_OAUTH_REDIRECT_URI="https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth" \
  CELESTUAL_SITE_URL="https://celestual.us"

supabase functions deploy celestual-ig-oauth --no-verify-jwt
```

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected — don't set them. `--no-verify-jwt`
matters: Instagram's redirect carries no Supabase login token, and `config.toml` already
declares `verify_jwt = false` for this function.)

**Smoke test** — paste the function URL in a browser:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth
```

| Browser shows | Meaning |
| --- | --- |
| `{"ok":true,"service":"celestual-ig-oauth"}` | 🎉 deployed and reachable — continue |
| `{"code":401,"message":"Missing authorization header"}` / `Invalid JWT` | JWT still on — redeploy with `--no-verify-jwt` (or turn "Enforce JWT" off in the dashboard) |
| 404 | not deployed / wrong URL |

---

## 4. Apply the migration

Migration `0011_ig_oauth.sql` adds the one new RPC (`celestual_start_ig_oauth`). It's
additive and re-runnable.

```bash
supabase db push        # applies every migration in order
# or paste supabase/migrations/0011_ig_oauth.sql into the SQL editor and Run
```

---

## 5. Front-end env vars (Vercel → Project → Settings → Environment Variables)

```
VITE_IG_OAUTH_ENABLED=1
VITE_IG_OAUTH_CLIENT_ID=your-instagram-app-id
VITE_IG_OAUTH_REDIRECT_URI=https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth
```

(`VITE_IG_OAUTH_CLIENT_ID` and the redirect URI are **public** by nature — they appear in
the authorize URL. The **secret** lives only in Supabase.) Redeploy the site. The verify
sheet now shows **"Continue with Instagram"** above the code, with the DM code as the
fallback beneath it. You can run OAuth **with or without** `VITE_IG_VERIFY_ENABLED` — if
both are on, people get to choose; if only OAuth is on, the code fallback is hidden.

---

## 6. Test end to end

1. On the live site, enter a handle you control and reach the verify step.
2. Tap **Continue with Instagram** → approve on the consent screen.
3. Desktop: a popup finishes and the sheet flips to **Verified ✓** (the main tab never
   navigated away). Mobile: it returns to the tab with `?ig_oauth=ok`, resumes, and flips.

Watch **Supabase → Edge Functions → `celestual-ig-oauth` → Invocations/Logs**, and:

```sql
select handle, status, igsid, created_at, expires_at, verified_at
  from celestual_ig_verifications order by created_at desc limit 5;
```

---

## 7. Go Live (App Review) — the step that unlocks real users

While the app is in **Development**, only accounts with a **role** on the app (Admin /
Developer / Tester) can log in. To serve everyone else, submit **`instagram_business_basic`**
for **Advanced Access** via **App Review**, then switch the app to **Live**. This is the
same gate the DM path needs to leave Dev mode — do it once and both paths scale.

---

## 8. Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Consent screen shows **"Invalid redirect_uri"** | `IG_OAUTH_REDIRECT_URI` (and the front-end `VITE_IG_OAUTH_REDIRECT_URI`) must match the **Valid OAuth Redirect URIs** entry **exactly**. Re-copy; watch the trailing slash. |
| Returns to the app but stays "finishing…" then expires | The function couldn't exchange the code (wrong `IG_OAUTH_CLIENT_ID`/`SECRET`) or couldn't read the username. Check the function logs. |
| **"that's a different account"** | Working as designed: the account that logged in isn't the `@` typed on the site. Log in as that account, or start again. |
| Only your own account can log in | The app is still in **Development** — add the tester (and accept the invite), or go **Live** (§7). |
| Popup blocked on desktop | The flow falls back to a full-page redirect automatically; it still completes. |
| Nothing happens on tap | `VITE_IG_OAUTH_ENABLED` isn't `1`, or the client id / redirect env vars are missing — the button only renders when all are set. |

---

Back to: [OAUTH-SCALING-STRATEGY.md](./OAUTH-SCALING-STRATEGY.md) ·
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md) (the DM fallback) ·
[supabase/README.md](../supabase/README.md) · [SECURITY.md](./SECURITY.md)

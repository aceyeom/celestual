# CELESTUAL — Switching handle verification to Instagram Login (OAuth 2.0)

The complete, step-by-step guide to moving verification from the DM relay
(ManyChat / direct webhook) to **"Instagram API with Instagram Login"** — the OAuth 2.0
flow where the person taps once, logs into Instagram, and Meta hands us their real
username. No DM, no ManyChat, no Facebook Page, no per-contact firing limits.

Read [OAUTH-SCALING-STRATEGY.md](./OAUTH-SCALING-STRATEGY.md) for *why*. This file is the
*how* — accurate to Meta's 2026 platform, written to be followed top to bottom.

> **Should you switch once your Meta app is verified + Live?** **Yes — make OAuth the
> primary path, and keep the DM/ManyChat path configured as a fallback.** OAuth is
> lower-friction (one tap vs. copy-code-switch-DM-switch-back), it has none of the DM
> path's ceilings (message-requests routing, ManyChat's once-per-24h trigger trap, the
> single-inbox send cap, the 60-day token chore), and it scales cleanly to thousands.
> The DM path stays valuable only as insurance against a Meta/OAuth outage — platform
> risk is real (`SECURITY.md`). So: **switch primary, don't delete the fallback.**

---

## 0. What "verified and Live" actually means (and why it matters here)

Two separate Meta gates, both needed before *any* stranger can verify — DM **or** OAuth:

| Gate | What it is | Needed for |
| --- | --- | --- |
| **App Review → Advanced Access** | Meta reviews your use of a permission and grants it beyond your own testers. | `instagram_business_basic` (OAuth) — and, on the DM path, `instagram_business_manage_messages`. |
| **Business Verification** | Meta verifies your business/entity (docs, domain, etc.). | Required to get **Advanced Access** when your app serves users who don't have a role on it — i.e. real users. |
| **Live mode** | The app's master switch flipped from Development to Live. | Serving anyone who isn't an app Tester/Admin/Developer. |

You told me business verification hasn't started — that's the long pole. Start it early
(§6); Advanced Access can't be granted without it. **Good news:** OAuth needs only
`instagram_business_basic` (read profile), which is a *lighter* review than the DM path's
messaging permission — so switching to OAuth doesn't add review burden, it reduces it.

---

## 1. Prerequisites

1. **`@celestual.us` is a Professional account** (Business or Creator). Personal accounts
   have no API access at all since the Basic Display deprecation (Dec 2024).
2. A **Meta app** (type: *Business*) at [developers.facebook.com](https://developers.facebook.com)
   with the **Instagram** product added and set up as **"API setup with Instagram
   login"** — the path that needs **no Facebook Page**. (If you did the DM webhook, you
   already have the app; you're just turning on the login product.)
3. A public **privacy policy** URL and a **data-deletion** path (you already ship
   `app/public/privacy.html` and `app/public/data-deletion.html`).
4. **Supabase CLI** linked: `supabase login`, then `supabase link --project-ref vwbsjwaqnycyghvwlxhd`.

> Values used throughout:
>
> | Thing | Value |
> | --- | --- |
> | Supabase project ref | `vwbsjwaqnycyghvwlxhd` |
> | OAuth function URL (the redirect target) | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth` |
> | Site | `https://celestual.us` |

---

## 2. The flow, exactly (what the code does)

```
  browser                         Instagram / Meta                celestual-ig-oauth (edge fn)
  ───────                         ────────────────                ───────────────────────────
  mint proof + call
  celestual_start_ig_oauth  ───▶  (get a random `state`)
  redirect / popup to consent ──▶ www.instagram.com/oauth/authorize
                                  ?client_id&redirect_uri&response_type=code
                                  &scope=instagram_business_basic&state=…
       user approves ──────────▶  Instagram redirects back with ?code&state ─────────────▶ this fn
                                                                  POST api.instagram.com/oauth/access_token
                                                                    (code → short-lived token + user_id)
                                                                  GET graph.instagram.com/me?fields=username
                                                                  celestual_complete_ig_verification(state,…)
                                                                    ✔ real @ == claimed @ → row='verified'
  poll state → 'verified'  ◀───── postMessage / redirect back ◀───────────────────────────┘
  seal with the same proof
```

The security gate is byte-identical to the DM path: a row flips to `verified` **only**
when Meta's authenticated username equals the claimed handle. The browser holds the
256-bit `proof`; the function never sees it.

### The exact endpoints (accurate to the 2026 Instagram-Login API)

| Step | Call |
| --- | --- |
| **Authorize** | `GET https://www.instagram.com/oauth/authorize` — params `client_id` (your **Instagram app ID**), `redirect_uri`, `response_type=code`, `scope=instagram_business_basic`, `state`. |
| **Short-lived token** | `POST https://api.instagram.com/oauth/access_token` — `Content-Type: application/x-www-form-urlencoded`, body `client_id, client_secret, grant_type=authorization_code, redirect_uri, code`. Returns `{ access_token, user_id, permissions }` (valid ~1 hour). |
| **Read username** | `GET https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=…` → `{ user_id, username }`. |
| **(optional) Long-lived token** | `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=APP_SECRET&access_token=SHORT` → `{ access_token, expires_in: 5184000 }` (60 days). Only needed if you keep a token around; verification doesn't. |
| **(optional) Refresh** | `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=LONG` → a fresh 60-day token. |

The shipped `celestual-ig-oauth` function does the first three; it needs no long-lived
token because it reads the username once and completes. Only `instagram_business_basic`
is requested — the lowest-risk scope, enough for the username. You do **not** need any
messaging scope for verification.

---

## 3. Meta app configuration (Business login settings)

Meta App Dashboard → **Instagram → API setup with Instagram login**:

1. **Instagram app ID** and **Instagram app secret** → these become `IG_OAUTH_CLIENT_ID`
   and `IG_OAUTH_CLIENT_SECRET`.
2. Open **Business login settings** and set three URLs (Meta compares the redirect URI
   **verbatim**, and won't let you submit for review without the two callbacks):

   | Field | Value |
   | --- | --- |
   | **Valid OAuth Redirect URIs** | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth` |
   | **Deauthorize callback URL** | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth/deauthorize` |
   | **Data deletion request URL** | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth/data-deletion` |

   Click **Save**. (The two callbacks are required for a production/Live app. What they
   must *do*, and the handler CELESTUAL needs, is in §7 — build them before you submit for
   review.)

---

## 4. Deploy the function, migration, and env

**Secrets** (Supabase → Edge Functions → Secrets, or CLI):

```bash
supabase secrets set \
  IG_OAUTH_CLIENT_ID="your-instagram-app-id" \
  IG_OAUTH_CLIENT_SECRET="your-instagram-app-secret" \
  IG_OAUTH_REDIRECT_URI="https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth" \
  CELESTUAL_SITE_URL="https://celestual.us"
```

**Function + migration:**

```bash
supabase functions deploy celestual-ig-oauth --no-verify-jwt
supabase db push          # applies migration 0011 (celestual_start_ig_oauth); additive
```

`--no-verify-jwt` matters: Instagram's redirect carries no Supabase login token
(`config.toml` already declares `verify_jwt = false`). Smoke-test by opening the function
URL — you should get `{"ok":true,"service":"celestual-ig-oauth"}`.

**Front-end env** (Vercel → Settings → Environment Variables), then redeploy:

```
VITE_IG_OAUTH_ENABLED=1
VITE_IG_OAUTH_CLIENT_ID=your-instagram-app-id
VITE_IG_OAUTH_REDIRECT_URI=https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-oauth
```

(`CLIENT_ID` and the redirect URI are public by nature — they ride in the authorize URL.
The **secret** lives only in Supabase.) The verify sheet now shows **"Continue with
Instagram"** above the code. Run it **alongside** `VITE_IG_VERIFY_ENABLED` (people choose)
or **alone** (the DM fallback hides).

---

## 5. Test in Development mode

While the app is in Dev mode, only accounts with a **role** on it can log in:

1. App Dashboard → **App roles → Roles** → add your test Instagram accounts as
   **Instagram testers**; accept the invite from each account
   (instagram.com → Settings → *Website permissions / Apps and websites*).
2. On the live site, enter a handle you control → **Continue with Instagram** → approve.
   Desktop finishes in a popup (the main tab never navigates away); mobile returns with
   `?ig_oauth=ok` and resumes.
3. Watch **Supabase → `celestual-ig-oauth` → Invocations**, and:
   ```sql
   select handle, status, igsid, created_at, verified_at
     from celestual_ig_verifications order by created_at desc limit 5;
   ```

---

## 6. App Review + Business Verification → go Live

This is the gate that unlocks real users. Advanced Access for `instagram_business_basic`
requires, per Meta: **Business Verification, a Live-mode app, a privacy policy, a
data-deletion path, a scoped use-case description, and a screencast of the full flow.**

1. **Start Business Verification now** — App Dashboard → **App settings → Basic →
   Business verification** (or Meta Business Suite → Security Center). It takes days and
   blocks Advanced Access, so it's the long pole.
2. **Fill the app's basics** — privacy policy URL (`https://celestual.us/privacy.html`),
   the two callback URLs (§3, built per §7), app icon, category.
3. **Request Advanced Access** on `instagram_business_basic` — App Dashboard → **App
   Review → Permissions and Features**.
4. **Write the use-case** scoped to exactly what we do: *"Users prove they own the
   Instagram handle they enter on celestual.us by logging in with Instagram; we read only
   their username to confirm ownership. No posting, no messaging, no media."*
5. **Record the screencast** the reviewer needs — one continuous take:
   `enter a handle on celestual.us` → `tap Continue with Instagram` → **the Instagram
   consent screen** → approve → **back on celestual.us showing "Verified ✓."** Show the
   scope on the consent screen and the data (the confirmed @) rendering in the app.
6. **Submit.** On approval, flip the app to **Live**. Now anyone can verify.

---

## 7. The two required callbacks (build before submitting)

A Live OAuth app must honor these Meta callbacks. The shipped `celestual-ig-oauth`
handles the login redirect; add these two handlers (same function, distinct paths — the
URLs in §3 point at them) before review:

- **Deauthorize** (`/deauthorize`): Meta POSTs a `signed_request` (form field) when a user
  removes CELESTUAL. Verify it (HMAC-SHA256 of the payload with the **app secret**,
  base64url), read `user_id`, best-effort delete that igsid's verification rows, respond
  `200`.
- **Data deletion** (`/data-deletion`): same `signed_request`; verify, delete the user's
  data, and respond **JSON** `{ "url": "<status page>", "confirmation_code": "<code>" }`
  (Meta shows the user that URL). Point the status page at
  `https://celestual.us/data-deletion.html`.

CELESTUAL's per-user data is thin and handle-keyed — a delete resolves the igsid →
handle(s) via `celestual_ig_verifications`, then wipes them the same way
`celestual_suppress` already does. (Ask and I'll wire both handlers + the
`celestual_purge_igsid` RPC into the function — it's ~40 lines and one small migration.)
Until then you can satisfy a reviewer with the self-service deletion page you already
ship, but the programmatic callbacks are what a Live app is expected to expose.

---

## 8. The switch-over (and rollback)

Once OAuth is Live and healthy:

1. **Make OAuth primary** — it already renders **above** the code in the verify sheet, so
   it's the default action the moment `VITE_IG_OAUTH_ENABLED=1`.
2. **Keep the DM path as fallback.** Options, softest first:
   - Leave `VITE_IG_VERIFY_ENABLED=1` too → the DM code shows beneath the IG button as a
     "or send a code instead" escape hatch.
   - Or set `VITE_IG_VERIFY_ENABLED=0` → OAuth-only UI, but leave `celestual-manychat` /
     `celestual-ig-webhook` **deployed and paused** so you can re-enable in one env flip.
3. **ManyChat** can be cancelled once OAuth carries the load — it exists only to relay
   inbound DMs, which OAuth eliminates. (Downgrade to the free plan first as a bridge.)
4. **Rollback** is one variable: set `VITE_IG_OAUTH_ENABLED=0` and re-enable the DM flag.
   Because both paths share the same `celestual_complete_ig_verification` /
   `celestual_poll_ig_verification` and the same proof/seal machinery, switching between
   them changes nothing downstream — no data migration, no session invalidation.

---

## 9. Operating notes

- **No token to babysit.** Verification reads the username once per login; there's no
  long-lived `IG_ACCESS_TOKEN` to refresh every 60 days like the DM webhook needs.
- **Rate limits** are generous for this shape: the `/me` read is one light Graph call per
  verification, well under Business-Use-Case ceilings; there's no single-inbox send cap
  because there are no DMs. ([2026 rate limits](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026))
- **Monitor** `celestual-ig-oauth` invocations for `token exchange failed` /
  `username fetch failed` (usually a redirect-URI or secret mismatch after a config
  change).
- **Redirect URI drift** is the #1 breakage: if you ever change the function URL, update
  it in *three* places at once — the Meta **Valid OAuth Redirect URIs**, the
  `IG_OAUTH_REDIRECT_URI` secret, and `VITE_IG_OAUTH_REDIRECT_URI`.

---

## 10. Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| Consent screen: **"Invalid redirect_uri"** | The three redirect URIs must match **exactly** (scheme, host, path, trailing slash). |
| Returns, stays "finishing…", then expires | Code exchange failed (wrong `IG_OAUTH_CLIENT_ID`/`SECRET`) or username read failed — check function logs. |
| **"that's a different account"** | Working as designed: the account that logged in isn't the `@` typed. Log in as that account, or start again. |
| Only your own account can log in | Still in **Development** — add the tester + accept, or finish App Review and go **Live** (§6). |
| Popup blocked on desktop | Falls back to a full-page redirect automatically; it still completes. |
| Nothing happens on tap | `VITE_IG_OAUTH_ENABLED` isn't `1`, or the client-id / redirect env vars are missing — the button renders only when all are set. |
| App Review rejected | Almost always: Business Verification incomplete, or the screencast didn't show the consent screen **and** the data rendering. Re-record per §6.5. |

---

## Sources

- [Instagram API with Instagram Login — Meta](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Business Login for Instagram — Meta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Instagram Platform overview (no Facebook Page) — Meta](https://developers.facebook.com/docs/instagram-platform/overview/)
- [Data Deletion Callback — Meta](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)
- [Instagram API Advanced Access approval guide (2026)](https://singhamandeep.com/instagram-api-advanced-access-approval/)
- [Instagram API rate limits (2026) — Phyllo](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026)

Back to: [OAUTH-SCALING-STRATEGY.md](./OAUTH-SCALING-STRATEGY.md) ·
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) (the DM fallback) ·
[supabase/README.md](../supabase/README.md) · [SECURITY.md](./SECURITY.md)

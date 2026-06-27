# CELESTUAL — Setup: Instagram DM handle verification (the **native Meta** way)

**Goal of this guide:** turn on the feature that proves the Instagram `@` a person
types is *really theirs* — by having them DM a short code to your Instagram account.
This version does it **natively through Meta**: you create your own app on
`developers.facebook.com` and connect Instagram's official Messaging webhook directly.
**No ManyChat, no monthly third-party subscription.**

> **Which guide should I follow?**
> - **This file** = the direct, self-hosted Meta path. You own the whole pipe, there's
>   no third party, and the sender's username is re-fetched from a **Meta-signed**
>   payload (the strongest assurance). The trade-off: you create a Meta app and you
>   **refresh a token about every 60 days**.
> - **[SETUP-IG-VERIFY.md](./SETUP-IG-VERIFY.md)** = the ManyChat path. No Meta app, no
>   token to refresh, but you pay for ManyChat Pro and trust a shared-secret webhook.
>
> Both use the **same** database migration, the **same** `star-####` code, the **same**
> front-end switches, and the **same** enforcement flip. Only the "who delivers the DM
> to your backend" piece differs. **Pick one** — you don't run both.

This guide is written for a **beginner**. Every step says exactly where to click and
what to paste. Follow it top to bottom and don't skip. Budget **~45–60 minutes**.

> **The feature is OFF by default.** Nothing in the live app breaks while you set this
> up. The very last step (section 9) is what actually switches enforcement on.

### Your specific values (used throughout this guide)

Copy these somewhere handy — every step below uses them.

| Thing | Your value |
| --- | --- |
| Instagram account people DM | **`@celestual.us`** |
| Your live website | **`https://celestual.us`** |
| Supabase project URL | **`https://vwbsjwaqnycyghvwlxhd.supabase.co`** |
| Supabase project ref | **`vwbsjwaqnycyghvwlxhd`** |
| Your webhook URL (you'll deploy this) | **`https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook`** |
| The code people send | looks like **`star-1283`** (`star-` + 4 digits) |

> **Three values you'll create as you go and must NEVER write down in this file or any
> public place:** the **App Secret** (`IG_APP_SECRET`), your **Verify Token**
> (`IG_VERIFY_TOKEN`, you invent it), and the **Access Token** (`IG_ACCESS_TOKEN`, Meta
> gives it to you). These live only in **Supabase Edge Function secrets**. Keeping them
> private is the whole security of this system. Your Supabase **service-role key** is
> injected into the function automatically — you never copy it anywhere.

---

## What you're building (read this once — 60 seconds)

```
  Your website                 Supabase (your backend)            Meta / Instagram
  ────────────                 ───────────────────────            ────────────────
  person types @alice ─start─▶ make a code  →  "star-1283"
       ◀──── "star-1283" ──────┘ (stored as 4 digits + a hashed secret)
  they tap "Copy & open Instagram" ──────────────────────────▶ they DM "star-1283"
                                                                  to @celestual.us
                                                                       │
                      celestual-ig-webhook ◀── Meta sends the DM ──────┘  (signed)
                        ├─ is Meta's X-Hub-Signature-256 valid?  (App Secret)
                        ├─ re-fetch the sender's REAL @ from the Graph API
                        └─ does that @ == "alice"?  ✔ → verified
  the page polls and flips to "Verified ✓", and the star seals.
```

The one check that matters: **the real Instagram username of whoever sent the DM must
equal the `@` the person claimed.** Your function does **not** trust any name in the
incoming payload — it calls Meta's Graph API with the sender's id and reads the username
straight from Meta. The browser can't fake it, and a forged webhook is rejected because
it won't carry Meta's signature.

**Why the code starts with `star-`:** the front-end shows and copies the code as
`star-1283`. The webhook just pulls the 4 digits out of whatever text arrives, so the
`star-` prefix is friendly plumbing — it makes the DM look intentional and keeps the
format identical to the ManyChat path. Security never depends on the code or its prefix.

---

## Checklist (you'll tick each of these by the end)

- [ ] **1.** `@celestual.us` is an Instagram **professional** account.
- [ ] **2.** A **Meta app** exists with the **Instagram** product added.
- [ ] **3.** You generated an **Instagram access token** and copied your **App Secret**, and invented a **Verify Token**.
- [ ] **4.** Migration `0004_ig_verification.sql` applied in Supabase.
- [ ] **5.** The three secrets set in Supabase and the `celestual-ig-webhook` function deployed.
- [ ] **6.** The webhook **Callback URL + Verify Token** registered in Meta and subscribed to **`messages`**.
- [ ] **7.** Vercel env vars set (`VITE_IG_VERIFY_ENABLED=1`, `VITE_IG_USERNAME=celestual.us`) and redeployed.
- [ ] **8.** A real end-to-end test passes.
- [ ] **9.** Enforcement flipped on (the final go-live switch).

---

## 1. Get your Instagram account ready

People will DM the code to **`@celestual.us`**, so set that account up.

**1.1 — Make it a professional account.**
1. Open the **Instagram app** on your phone, on the `@celestual.us` account.
2. Tap your profile → the **☰ menu** (top right) → **Settings and activity**.
3. Tap **Account type and tools** → **Switch to professional account**.
4. Choose **Business** (or **Creator** — either works). It's free and reversible.

**1.2 — Allow message access** (the API needs this to deliver DMs):
1. Still in **Settings and activity** → **Messages and story replies**.
2. Tap **Message controls** → **Connected tools** (sometimes "Connected experiences").
3. Turn **Allow access to messages** → **ON**.

> **Do I need a Facebook Page?** With the modern **"Instagram API with Instagram
> login"** product you connect Instagram **directly** — no Facebook Page required. If
> Meta steers you to the older **"Instagram API with Facebook login"** product instead,
> you'll be asked to link a Facebook Page you admin; create a free one at
> **facebook.com → Pages → Create new Page** and link it to `@celestual.us`. Either
> product works with this function; the Instagram-login one is simpler, so prefer it.

✅ **Done when:** `@celestual.us` is a Business/Creator account with "Allow access to
messages" ON.

---

## 2. Create your Meta app

This is the "create app" step you asked for — you're making your own developer app that
owns the Instagram connection.

**2.1 — Register as a Meta developer (one time).**
1. Go to **[developers.facebook.com](https://developers.facebook.com)** and log in with
   the Facebook account that controls `@celestual.us` (or the Page linked to it).
2. If prompted, click **Get Started** and accept the developer terms. You may be asked
   to verify your account by phone/email — do it.

**2.2 — Create the app.**
1. Top-right menu → **My Apps** → **Create App**.
2. **What do you want your app to do?** Choose the option about **messaging / Instagram**
   — pick **"Other"** if unsure, then on the next screen choose app type **"Business"**.
3. Give it a name (e.g. `celestual-verify`), enter your contact email, and (if asked)
   select a **Business portfolio** — create one if you don't have it. Click **Create
   app**; re-enter your password if prompted.

✅ **Done when:** you land on the app's **Dashboard** at
`developers.facebook.com/apps/<your-app-id>/`.

---

## 3. Add Instagram and get your three secrets

You now collect the three values the webhook needs: **App Secret**, **Verify Token**,
and **Access Token**.

**3.1 — Add the Instagram product.**
1. On the app **Dashboard**, find **Add products to your app** (or left sidebar **+ Add
   product**).
2. On the **Instagram** tile, click **Set up**.
3. Choose **"Instagram API setup with Instagram login"** (the no-Page path). If your
   account only offers **"...with Facebook login"**, that's fine too — follow its prompts
   to pick the Page linked to `@celestual.us`.

**3.2 — Connect `@celestual.us` and generate the Access Token.**
1. In the Instagram setup screen, find **Generate access tokens** (sometimes under
   **API setup → 2. Generate access tokens**).
2. Click **Add account** / **Connect**, log into `@celestual.us`, and **approve** the
   permissions — they include **`instagram_business_basic`** and
   **`instagram_business_manage_messages`** (older naming: `instagram_manage_messages`,
   `instagram_basic`). These let the app read the sender's username and (optionally) send
   a confirmation DM.
3. Click **Generate token** next to the connected account. **Copy the long token** it
   shows — this is your **`IG_ACCESS_TOKEN`**. Keep it private (you'll paste it into
   Supabase in section 5).

> This token is short-/medium-lived at first. Section 10 shows how to exchange it for a
> **long-lived (~60-day)** token and refresh it. You can finish setup with the token you
> just got and upgrade it before it expires.

**3.3 — Copy your App Secret.**
1. Left sidebar → **App settings → Basic**.
2. Find **App secret** → **Show** (re-enter your password). **Copy it** — this is your
   **`IG_APP_SECRET`**. It's how your function proves an incoming webhook really came
   from Meta. Never expose it.

**3.4 — Invent your Verify Token.**
- This one **you make up** — any long random string. It's used **once**, during the
  webhook handshake in section 6, to prove the callback URL is yours. Generate one:
  ```bash
  openssl rand -hex 16
  ```
  Copy it and keep it private — this is your **`IG_VERIFY_TOKEN`**. (It does **not** come
  from Meta; you'll type the *same* value into Supabase **and** into Meta's webhook form.)

✅ **Done when:** you have all three in your private notes: **App Secret**, **Verify
Token**, **Access Token**.

---

## 4. Apply the database migration in Supabase

This adds the tables and functions that issue and check codes. *(Identical to the
ManyChat guide — if you already ran it, skip to section 5.)*

1. Go to **[supabase.com](https://supabase.com)** → open your project
   (`vwbsjwaqnycyghvwlxhd`).
2. Left sidebar → **SQL Editor** → **New query**.
3. Open [`supabase/migrations/0004_ig_verification.sql`](../supabase/migrations/0004_ig_verification.sql)
   from this repo, **copy its entire contents**, and paste into the SQL Editor.
4. Click **Run**. You should see *Success. No rows returned.*

> Safe to run more than once (`IF NOT EXISTS` / `CREATE OR REPLACE`). With the Supabase
> CLI, `supabase db push` does the same thing.

✅ **Done when:** the query runs without an error.

---

## 5. Set the secrets and deploy the webhook function

This is the small program Meta calls. It checks Meta's signature, re-fetches the
sender's username, and asks the database whether it matches the claim.

**5.1 — Store the three secrets in Supabase.**
1. Supabase → **Edge Functions** (left sidebar) → **Secrets** (a.k.a. *Manage secrets*).
2. Add these three:

   | Name | Value |
   | --- | --- |
   | `IG_APP_SECRET` | *(the App Secret from step 3.3)* |
   | `IG_VERIFY_TOKEN` | *(the Verify Token you invented in step 3.4)* |
   | `IG_ACCESS_TOKEN` | *(the Access Token from step 3.2)* |

3. *(Optional)* add `IG_CONFIRM_DM` = `1` to have the bot DM *"you're verified ✦"* back,
   and/or `IG_GRAPH_VERSION` to pin a Graph version (defaults to `v21.0`).
4. Save. (You do **not** set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` — Supabase
   injects those automatically.)

**5.2 — Deploy the function.** From a terminal at the repo root:

```bash
supabase functions deploy celestual-ig-webhook
```

> First time using the CLI? Install it (`npm i -g supabase`), then `supabase login` and
> `supabase link --project-ref vwbsjwaqnycyghvwlxhd`, then run the deploy above.

**5.3 — Confirm it's live.** The webhook answers Meta's handshake on `GET`. Test it with
your verify token in the URL:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=hello123
```

- Replace `YOUR_VERIFY_TOKEN` with the exact value you saved as `IG_VERIFY_TOKEN`.
- A correct token echoes back **`hello123`** (the challenge). A wrong/empty token returns
  **`forbidden`** with status 403 — which is also proof the function is deployed and the
  secret is wired.

✅ **Done when:** the correct-token URL returns `hello123`, and the three secrets are
saved in Supabase.

---

## 6. Register the webhook in Meta and subscribe to messages

Now you tell Meta where to deliver DMs.

**6.1 — Open the webhook config.**
1. Meta app → left sidebar → **Instagram → API setup / Webhooks** (the Instagram product
   has its own **Webhooks** section; use that, not the generic top-level one).
2. Click **Configure webhooks** (or **Edit subscription / Add callback URL**).

**6.2 — Enter your callback URL and verify token.**
- **Callback URL:**
  ```
  https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook
  ```
- **Verify token:** paste the **exact same** `IG_VERIFY_TOKEN` you saved in Supabase
  (step 3.4 / 5.1).
- Click **Verify and save**. Meta immediately calls your function's `GET` handshake; if
  the tokens match it shows a **green check / "Complete"**. (If it fails, the tokens
  don't match exactly, or the function isn't deployed — re-check section 5.)

**6.3 — Subscribe to the `messages` field.**
1. In the same Webhooks panel, find the list of Instagram fields you can subscribe to.
2. Tick **`messages`** → **Subscribe** (this is the field that delivers incoming DMs).
   You don't need any other field for verification.

> **Heads-up on the access token vs. the subscription:** the **`messages`** webhook
> field is what makes Meta *send* DMs to your URL; the **`IG_ACCESS_TOKEN`** is what your
> function uses to *read the sender's username* and (optionally) reply. You need both.

**6.4 — Development mode is fine.** While your app is in **Development**, the webhook
delivers DMs for accounts with a **role** on the app (you, plus any testers you add under
**App roles → Roles**). That's perfect for testing — and because **the only Instagram
account that ever needs to DM is `@celestual.us` itself** (people verify by DMing *you*),
you can run this in Development mode indefinitely. You only need **App Review / Live mode**
if you later want *arbitrary visitors' own* accounts to message your app directly, which
this design never requires.

✅ **Done when:** the Callback URL shows verified/green and **`messages`** is subscribed.

---

## 7. Turn the feature on in the website (front-end)

Now tell the app to show the verify step. *(Identical to the ManyChat guide.)*

1. Go to **[vercel.com](https://vercel.com)** → your CELESTUAL project →
   **Settings → Environment Variables**.
2. Add these two (for **Production**, and Preview/Development if you want):

   | Name | Value |
   | --- | --- |
   | `VITE_IG_VERIFY_ENABLED` | `1` |
   | `VITE_IG_USERNAME` | `celestual.us` |

   *(No `@` on the username.)*
3. **Redeploy:** Vercel → **Deployments** → the latest one → **⋯ → Redeploy**. Env-var
   changes only take effect after a redeploy.

> **For local testing**, put the same two lines in `app/.env.local` and restart
> `npm run dev`.

After redeploy, the "this is you" step shows a **Verify & continue** button that opens an
in-page overlay. It displays the code as **`star-1283`** and the **Copy & open
Instagram** button copies that exact text and deep-links to `ig.me/m/celestual.us`.

✅ **Done when:** the live site shows the verify overlay with a `star-####` code.

---

## 8. Test it end-to-end

Do this **before** flipping enforcement (section 9). Because the app is in Development
mode, test from `@celestual.us` itself, or from an account you've added under **App roles
→ Roles**.

1. Open **https://celestual.us** → **Find out** → type **`@celestual.us`** → **Verify &
   continue**.
2. The overlay shows a code like **`star-1283`**. Tap **Copy & open Instagram** —
   Instagram opens a DM thread with `@celestual.us`, and the code is on your clipboard.
3. **Paste and send** the DM. Within a second or two the overlay should flip to
   **Verified ✓** and continue. 🎉
4. Seal a star — it records normally.
5. **Negative test (important):** start a verification claiming an `@` you do *not*
   control, then send the code from a **different** account. It must **not** verify (the
   usernames don't match) — that's the whole point.

**If something's off, check the state in Supabase → SQL Editor:**
```sql
select handle, token, status, igsid, expires_at
  from celestual_ig_verifications
 order by created_at desc
 limit 5;
```
And open the function's **logs**: Supabase → **Edge Functions → `celestual-ig-webhook` →
Logs**. You'll see one line per DM — `no_username` (token problem), `matched:false`
(wrong sender), or `ok:true` (success). In Meta, **Instagram → Webhooks** has a **recent
deliveries / Test** view too.

✅ **Done when:** a real DM verifies, and a wrong-account DM does **not**.

---

## 9. Flip enforcement ON (the final go-live switch)

Until now the website *shows* the verify step, but the server still accepts entries
without proof (so testing never gets blocked). This makes the **server** require proof.
Do it **only after** section 8 passes. *(Identical to the ManyChat guide.)*

1. Supabase → **SQL Editor** → run:
   ```sql
   update celestual_settings
      set value = 'true', updated_at = now()
    where key = 'require_ig_verification';
   ```
2. From now on, sealing a star **requires** a verified `@`. Anyone who skips it gets
   `{ recorded: false, error: 'unverified' }`.

**To roll back**, set it to `'false'` the same way.

> **Order matters:** confirm a real verification *first*, then flip this. If you flip it
> too early, live users hit `unverified` before they can verify.

✅ **Done when:** the `update` runs and a fresh real entry still seals (because you verify
first).

---

## 10. Keeping it running — the 60-day token refresh

The **one ongoing chore** of the native path (the price of not paying ManyChat) is the
Instagram access token. Long-lived tokens last **~60 days**; refresh before they expire
or verification fails closed (nobody is wrongly verified — people just can't complete it).

**10.1 — Exchange your token for a long-lived one** (do this once, soon after setup). In
a terminal, with your current `IG_ACCESS_TOKEN` and `IG_APP_SECRET`:
```bash
curl -s "https://graph.instagram.com/access_token\
?grant_type=ig_exchange_token\
&client_secret=YOUR_APP_SECRET\
&access_token=YOUR_CURRENT_TOKEN"
```
It returns `{"access_token":"<long-lived>","expires_in":5184000}` (5,184,000 s ≈ 60
days). Save that `access_token` as the new **`IG_ACCESS_TOKEN`** in Supabase secrets, then
re-deploy is **not** needed for a secret change to take effect on the next invocation
(secrets are read at runtime), but re-deploying never hurts.

**10.2 — Refresh it (repeat every ~50 days)** so it never lapses:
```bash
curl -s "https://graph.instagram.com/refresh_access_token\
?grant_type=ig_refresh_token\
&access_token=YOUR_CURRENT_LONG_LIVED_TOKEN"
```
Each refresh returns a fresh 60-day token. Update the `IG_ACCESS_TOKEN` secret each time.

> **Set a reminder** (a calendar event ~every 50 days). If you'd rather automate it, a
> tiny scheduled job can call the refresh endpoint and write the new value — out of scope
> here, but the endpoints above are all you need.

Also keep:
- the Instagram account **connected** in the app (re-authorize if you ever change your
  Instagram/Facebook password — that invalidates tokens), and
- **"Allow access to messages"** ON (step 1.2).

---

## 11. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Meta's **Verify and save** fails | The **Verify Token** in Meta's form must exactly equal `IG_VERIFY_TOKEN` in Supabase, and the function must be deployed. Test the `GET` URL from step 5.3 — it must echo your `hub.challenge`. |
| `GET` URL returns `forbidden` (403) | Wrong/empty verify token, or `IG_VERIFY_TOKEN` not saved. Re-check both are the **same** string. |
| Function returns `401 bad_signature` on DMs | `IG_APP_SECRET` in Supabase doesn't match the app's **App settings → Basic → App secret**. Re-copy it. |
| Logs show `no_username` | The `IG_ACCESS_TOKEN` is missing/expired, or lacks the messaging permission. Re-generate it (3.2) and/or refresh it (section 10). |
| Logs show `matched:false` | Expected — the **sender's** real username didn't equal the claimed `@`. DM from the exact account you're verifying. |
| Nothing arrives when you DM a code | The **`messages`** field isn't subscribed (6.3), the app is in Development and the sender has no **role** on the app (6.4), or "Allow access to messages" is OFF (1.2). |
| The code shows without `star-` | Old front-end build — redeploy (section 7); the app prefixes the code automatically. |
| Live users get `unverified` | You flipped enforcement (section 9) too early. Set it back to `'false'`, confirm a real verification, then flip again. |
| Verification suddenly stops after weeks | The access token expired. Refresh it (section 10) and update the Supabase secret. |

---

## 12. Where every secret and flag lives (quick reference)

| Value | Where it lives | Safe in the browser? |
| --- | --- | --- |
| `IG_APP_SECRET` | Supabase **function secret** (from Meta App settings) | ❌ never |
| `IG_VERIFY_TOKEN` | Supabase **function secret** + Meta **webhook form** | ❌ never |
| `IG_ACCESS_TOKEN` | Supabase **function secret** (from Meta, refresh ~60 days) | ❌ never |
| `require_ig_verification` (`celestual_settings`) | Supabase **database** | ❌ never |
| `VITE_IG_VERIFY_ENABLED`, `VITE_IG_USERNAME` | Vercel **env vars** | ✅ yes (a flag + your public handle) |
| Supabase **service-role** key | injected into the function only | ❌ never |

**Rule of thumb:** only values that start with `VITE_` are ever safe to expose in the
front-end.

---

## 13. Why this is secure (and why it's the *stronger* path)

**The `star-1283` code is not a secret.** It's a *correlation id* linking one incoming DM
to one browser session. Ownership is decided by the **sender's username**, which your
function re-fetches from Meta's Graph API — never from the request body.

| Attack | Why it fails |
| --- | --- |
| **Claim someone else's @** | The username comes from `graph.instagram.com` keyed on the sender's Meta id — the *authenticated* sender. You can't make Meta report a handle you don't control. |
| **Forge a webhook** | Every POST must carry Meta's `X-Hub-Signature-256` (HMAC of the raw body with your App Secret), checked in near-constant time. No signature → `401`. |
| **Guess / brute-force the code** | A correct guess only completes a session whose claimed handle equals the **sender's own** username — i.e. you can only verify *yourself*. Nothing gained. |
| **Replay an old code** | Codes are unique among active pending sessions, single-use, and expire in ~10 minutes. A stale code matches no live session. |
| **Fake "verified" from the browser** | The verified flag is written only by the service-role RPC the webhook calls. The browser's calls are read-only. |
| **Steal proof from a DB dump** | Only `sha256(proof)` is stored; the raw proof lives in the browser. A table leak can't forge a submission. |

**Versus the ManyChat path:** there, the username arrives in the request body and is
trusted because of a shared secret. Here, the username is **re-fetched from a Meta-signed
source**, so there's no "trusted body" to protect — the signature and the Graph lookup do
the work. That's why this is the strongest assurance. The cost is the token refresh
(section 10).

**Anonymity is preserved:** verification only reads the sender's **username**. We never
post, follow, or read anyone's content, and the person you later *enter* is never told —
the [reveal model](./SECURITY.md) is untouched.

---

## 14. Instagram / Meta terms compliance

- You use Meta's **official Instagram Messaging API** via your own app — no scraping, no
  unofficial endpoints.
- The visitor performs a normal human action (sending a DM). Any reply happens only
  **after** they message you, inside Meta's 24-hour window.
- We read **only** the sender's username, solely to verify. No content, contacts, or
  graph is harvested.
- Keep a privacy policy describing this (you have `privacy@celestual.us` + the in-app
  privacy screen).

---

Back to the index: [README](../README.md) · ManyChat alternative:
[SETUP-IG-VERIFY.md](./SETUP-IG-VERIFY.md) · go-live checklist:
[GO-LIVE.md](./GO-LIVE.md) · safety model: [SECURITY.md](./SECURITY.md).
</content>
</invoke>

# CELESTUAL — Setup: Instagram DM handle verification (via ManyChat)

**Goal of this guide:** turn on the feature that proves the Instagram `@` a person
types is *really theirs* — by having them DM a short code to your Instagram account.
No `developers.facebook.com`, no OAuth, no passwords, no code editing.

This guide is written for a **beginner**. Every step says exactly where to click and
what to paste. Follow it top to bottom and don't skip. Budget **~30–45 minutes**.

> **The feature is OFF by default.** Nothing in the live app breaks while you set this
> up. The very last step (section 8) is what actually switches enforcement on.

### Your specific values (used throughout this guide)

Copy these somewhere handy — every step below uses them.

| Thing | Your value |
| --- | --- |
| Instagram account people DM | **`@celestual.us`** |
| Your live website | **`https://celestual.us`** |
| Supabase project URL | **`https://vwbsjwaqnycyghvwlxhd.supabase.co`** |
| Supabase project ref | **`vwbsjwaqnycyghvwlxhd`** |
| Your edge-function URL (you'll deploy this) | **`https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat`** |
| The code people send | looks like **`star-1283`** (`star-` + 4 digits) |

> **Two values you'll create as you go and must NEVER write down in this file or any
> public place:** the `MANYCHAT_SHARED_SECRET` (you'll generate it in section 4) and
> your Supabase **service-role key** (Supabase injects it automatically — you never
> copy it anywhere). Keeping those secret is the whole security of this system.

---

## What you're building (read this once — 60 seconds)

```
  Your website                    Supabase (your backend)         Instagram / ManyChat
  ────────────                    ───────────────────────         ────────────────────
  person types @alice ─start──▶ make a code  →  "star-1283"
       ◀──── "star-1283" ───────┘ (stored as 4 digits + a hashed secret)
  they tap "Copy & open Instagram" ───────────────────────────▶ they DM "star-1283"
                                                                   to @celestual.us
                                                                        │
                          celestual-manychat  ◀── ManyChat sends ───────┘  ManyChat fills in
                            ├─ is the secret header correct?               the sender's REAL @
                            └─ does the sender's @ == "alice"?  ✔ → verified
  the page polls and flips to "Verified ✓", and the star seals.
```

The one check that matters: **the real Instagram username of whoever sent the DM must
equal the `@` the person claimed.** ManyChat gets that username straight from Meta —
the browser can't fake it.

**Why the code starts with `star-`:** in section 5 you set up a ManyChat **Condition**
so it only calls your backend ("the db ping") when the DM contains `star-`. That way
random "hi" DMs to your account never hit your server — only real verification codes
like `star-1283` do. The app shows and copies the code in exactly this `star-1283`
form, so people send the right thing automatically.

---

## Checklist (you'll tick each of these by the end)

- [ ] **1.** `@celestual.us` is an Instagram **professional** account, linked to a Facebook Page.
- [ ] **2.** A **ManyChat Pro** account with `@celestual.us` connected.
- [ ] **3.** Migration `0004_ig_verification.sql` applied in Supabase.
- [ ] **4.** The `celestual-manychat` edge function deployed, with its secret set.
- [ ] **5.** A ManyChat automation that POSTs `star-` codes to your function.
- [ ] **6.** Vercel env vars set (`VITE_IG_VERIFY_ENABLED=1`, `VITE_IG_USERNAME=celestual.us`) and redeployed.
- [ ] **7.** A real end-to-end test passes.
- [ ] **8.** Enforcement flipped on (the final go-live switch).

---

## 1. Get your Instagram account ready

People will DM the code to **`@celestual.us`**, so set that account up.

**1.1 — Make it a professional account.**
1. Open the **Instagram app** on your phone, on the `@celestual.us` account.
2. Tap your profile → the **☰ menu** (top right) → **Settings and activity**.
3. Tap **Account type and tools** → **Switch to professional account**.
4. Choose **Business** (or **Creator** — either works). It's free and reversible.

**1.2 — Allow message access** (ManyChat needs this to read DMs):
1. Still in **Settings and activity** → **Messages and story replies**.
2. Tap **Message controls** → **Connected tools**.
3. Turn **Allow access to messages** → **ON**.

**1.3 — Link a Facebook Page.** Meta requires Instagram messaging automation to be
attached to a Facebook Page. (You still **never** visit `developers.facebook.com`.)
- If you already have a Facebook Page you manage: good, skip ahead.
- If not: go to **facebook.com → Pages → Create new Page** (free, ~2 minutes). Give it
  any name.
- Link it: Instagram app → **Settings and activity → Account → Sharing to other apps**
  (or do it inside **Meta Business Suite**). Connect your Page to `@celestual.us`.

✅ **Done when:** `@celestual.us` is a Business/Creator account, "Allow access to
messages" is ON, and it's linked to a Facebook Page you control.

---

## 2. Set up ManyChat and connect Instagram

ManyChat is the official Meta partner that owns the Instagram connection for you.

**2.1 — Create the account.**
1. Go to **[manychat.com](https://manychat.com)** → **Get Started**.
2. When asked which channel, choose **Instagram**.

**2.2 — Connect `@celestual.us`.**
1. Click **Connect via Meta** (sometimes labeled "Connect Instagram").
2. A Meta login window opens — log in with the **Facebook account that manages the
   Page linked to `@celestual.us`**.
3. Approve all the messaging permissions ManyChat asks for.
4. Check it worked: ManyChat → **Settings → Channels → Instagram** should show your
   account as **Connected**.

**2.3 — Upgrade to ManyChat Pro.**
- The **External Request** action (the thing that calls your backend, section 5) is a
  **Pro** feature. On the free plan it won't be available.
- ManyChat → **Settings → Billing** (or the upgrade prompt) → choose **Pro**.

> **Stuck connecting?** You must be a **full-admin** of the Facebook Page linked to
> `@celestual.us`, and "Allow access to messages" (step 1.2) must be ON. ManyChat's
> [connection guide](https://help.manychat.com/hc/en-us/articles/14281290924444) walks
> through fixes.

✅ **Done when:** ManyChat shows `@celestual.us` connected, and you're on **Pro**.

---

## 3. Apply the database migration in Supabase

This adds the tables and functions that issue and check codes.

1. Go to **[supabase.com](https://supabase.com)** → open your project
   (`vwbsjwaqnycyghvwlxhd`).
2. In the left sidebar, click **SQL Editor** → **New query**.
3. Open the file
   [`supabase/migrations/0004_ig_verification.sql`](../supabase/migrations/0004_ig_verification.sql)
   from this repo, **copy its entire contents**, and paste into the SQL Editor.
4. Click **Run** (bottom right). You should see *Success. No rows returned.*

> It's safe to run more than once (it uses `IF NOT EXISTS` / `CREATE OR REPLACE`). If
> you use the Supabase CLI instead, `supabase db push` does the same thing.

✅ **Done when:** the query runs without an error.

---

## 4. Deploy the relay function and set its secret

This is the small program ManyChat calls. It checks a shared secret and then asks the
database whether the sender's `@` matches.

**4.1 — Create the shared secret.** This is a long random password that only you,
Supabase, and ManyChat will know. Generate one in a terminal:

```bash
openssl rand -hex 32
```

Copy the long string it prints. **Keep it somewhere private for the next steps —
don't paste it into this file, the code, or any chat.**

**4.2 — Store the secret in Supabase.**
1. Supabase → **Edge Functions** (left sidebar) → **Secrets** (a.k.a. *Manage secrets*).
2. Add a new secret:

   | Name | Value |
   | --- | --- |
   | `MANYCHAT_SHARED_SECRET` | *(paste the string from step 4.1)* |

3. Save. (You do **not** need to set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` —
   Supabase injects those into the function automatically.)

**4.3 — Deploy the function.** In a terminal, from the repo root:

```bash
supabase functions deploy celestual-manychat
```

> First time using the CLI? Install it (`npm i -g supabase`), then `supabase login`
> and `supabase link --project-ref vwbsjwaqnycyghvwlxhd`, then run the deploy above.

**4.4 — Confirm it's live.** Open your function URL in a browser:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat
```

It should return:

```json
{"ok":true,"service":"celestual-manychat"}
```

✅ **Done when:** the URL above returns that JSON, and the secret is saved in Supabase.

---

## 5. Build the ManyChat automation

This is the part that listens for DMs and calls your backend — but **only** for real
codes that start with `star-`.

**5.1 — Create a new automation.**
1. ManyChat → **Automation → + New Automation** (or **Flows → New Flow**).
2. Add a trigger: **Default Reply**. *(This fires on any DM that doesn't match another
   keyword — it's what catches the dynamic `star-1283` codes.)* Make sure it's enabled.

**5.2 — Add the Condition (this is your `star-` gate).** Right after the trigger, add
a **Condition** block so you only call your backend for real codes:
1. Add **Action/Block → Condition**.
2. Set the rule: **`Last Text Input` → contains → `star-`**
   *(use ManyChat's field picker to insert "Last Text Input"; type `star-` as the
   value).*
3. The **"Yes / True"** branch will hold the request in step 5.3. Leave the
   **"No / False"** branch empty (or add a friendly *"Send me your code from the app to
   verify ✦"* message).

> Why this matters: without this gate, your function would be pinged on **every** DM
> anyone sends your account. With it, only messages like `star-1283` reach your
> backend — exactly what you want.

**5.3 — Add the backend call on the "Yes" branch.** On the True branch of the
Condition, add **Action → External Request** (under *Dev Tools / Pro*):

- **Method:** `POST`
- **Request URL:**
  ```
  https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat
  ```
- **Headers:** add one header —
  - **Key:** `X-Celestual-Token`
  - **Value:** *(paste the same `MANYCHAT_SHARED_SECRET` from step 4.1)*
- **Body → JSON:** paste exactly this, but use ManyChat's **`+` field picker** to
  insert the two `{{...}}` values so the merge tags are correct:
  ```json
  {
    "username": "{{instagram.username}}",
    "text": "{{last_text_input}}",
    "subscriber_id": "{{user.id}}"
  }
  ```
  - `{{instagram.username}}` = the **sender's real handle** (from Meta — this is the
    value that does the verifying).
  - `{{last_text_input}}` = the message they just sent, e.g. `star-1283`.

**5.4 — (Optional) Reply in the DM.** Map the response field `reply` to a ManyChat
field and add a **Send Message** showing it, so the DM gets a "Verified ✦ / try again"
note. You can skip this — the app confirms on its own. If you skip it, a simple
*"Got it ✦ — head back to CELESTUAL, you're verified in seconds."* message is a nice
touch.

**5.5 — Publish.** Click **Publish** (top right). An unpublished automation does
nothing.

> ManyChat External Requests time out after **10 seconds**; this function answers in a
> fraction of that, so you're fine.

✅ **Done when:** the automation is published with a `star-` Condition gating an
External Request to your function URL.

---

## 6. Turn the feature on in the website (front-end)

Now tell the app to show the verify step.

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

After redeploy, the "this is you" step shows a **Verify & continue** button that opens
an in-page overlay (no popup, nothing lost). It displays the code as **`star-1283`**
and the **Copy & open Instagram** button copies that exact text and deep-links to
`ig.me/m/celestual.us`.

✅ **Done when:** the live site shows the verify overlay with a `star-####` code.

---

## 7. Test it end-to-end

Do this **before** flipping enforcement (section 8).

1. Open **https://celestual.us** → **Find out** → type the **@ of a *second* account
   you control** (add it as a ManyChat tester first). **Don't type `@celestual.us`
   here** — the brand account can't DM the code to *itself*, so a self-DM never
   verifies. The handle you type must be the account you'll send the DM **from**.
2. The overlay shows a code like **`star-1283`**. Tap **Copy & open Instagram** —
   Instagram opens a DM thread with `@celestual.us`, and the code is on your clipboard.
   (The overlay stays open underneath; if your phone reloads the tab when it switches
   to Instagram, just reopen **celestual.us** — it resumes watching the same code.)
3. From that **second account**, **paste and send** the DM to `@celestual.us`. Within a
   second or two the overlay should flip to **Verified ✓** and continue. 🎉
4. Seal a star — it records normally.
5. **Negative test (important):** start a verification claiming an `@` you do *not*
   control, then send the code from a **different** account. It must **not** verify
   (the usernames don't match) — that's the whole point.

**If something's off, check the state in Supabase → SQL Editor:**
```sql
select handle, token, status, igsid, expires_at
  from celestual_ig_verifications
 order by created_at desc
 limit 5;
```
And in **ManyChat → your automation → the External Request block**, open its
**delivery logs** to see the recent response codes.

✅ **Done when:** a real DM verifies, and a wrong-account DM does **not**.

---

## 8. Flip enforcement ON (the final go-live switch)

Until now, the website *shows* the verify step, but the server still accepts entries
without proof (so testing never gets blocked). This step makes the **server** require
proof. Do it **only after** section 7 passes.

1. Supabase → **SQL Editor** → run:
   ```sql
   update celestual_settings
      set value = 'true', updated_at = now()
    where key = 'require_ig_verification';
   ```
2. From now on, sealing a star **requires** a verified `@`. Anyone who skips it gets
   `{ recorded: false, error: 'unverified' }`.

**To roll back** (if you need to), set it to `'false'` the same way.

> **Order matters:** get everything working and confirm a real verification *first*,
> then flip this. If you flip it too early, live users hit `unverified` before they
> can verify.

✅ **Done when:** the `update` runs and a fresh real entry still seals (because you
verify first).

---

## 9. Keeping it running

ManyChat holds the Instagram connection, so **there's no 60-day token for you to
refresh** — a real advantage. Just keep:

- your ManyChat **Pro** subscription active,
- the Instagram account **connected** in ManyChat (re-authorize if you ever change
  your Instagram/Facebook password), and
- **"Allow access to messages"** ON (step 1.2).

If any of those lapse, verification simply fails **closed** — nobody is wrongly
verified; people just can't complete it until you reconnect.

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Can't connect Instagram in ManyChat | Account must be **professional**, linked to a **Facebook Page you admin**, with "Allow access to messages" ON (sections 1–2). |
| No **External Request** option in ManyChat | It's a **ManyChat Pro** feature — upgrade (step 2.3). |
| Function returns `401 unauthorized` | The `X-Celestual-Token` header in ManyChat doesn't exactly match `MANYCHAT_SHARED_SECRET` in Supabase. Re-paste both with the same value. |
| DMs don't verify, function says `no_username`/`no_code` | The JSON body fields are wrong — re-insert `{{instagram.username}}` and `{{last_text_input}}` using ManyChat's **`+` field picker** (step 5.3). |
| `handle_mismatch` | Expected — the **sender's** username must equal the claimed `@`. DM from the exact account you're verifying. |
| Nothing happens when you DM a code | The automation isn't **published/enabled**, the **Condition** isn't matching (make sure it's *contains* `star-`, not *equals*), or another keyword automation is catching the DM first. |
| **I sent the DM but the app never says "Verified ✓"** | First confirm it isn't a setup miss: check the row's `status` in the SQL above and the ManyChat **delivery logs** (section 7). If the row flipped to `verified` but the app didn't, you opened Instagram in the **same browser tab** and it got torn down — return to **celestual.us** and the overlay resumes watching the **same** code automatically. Make sure you DM from the **exact account whose @ you typed** (not the brand account itself — a self-DM never verifies; see `handle_mismatch`). |
| The code shows without `star-` | You're on an old build — redeploy the front-end (section 6); the app prefixes the code automatically. |
| Live users get `unverified` | You flipped enforcement (section 8) before everything was live. Set it back to `'false'`, confirm a real verification, then flip it again. |

---

## 11. Where every secret and flag lives (quick reference)

| Value | Where it lives | Safe in the browser? |
| --- | --- | --- |
| `MANYCHAT_SHARED_SECRET` | Supabase **function secret** + ManyChat request **header** | ❌ never |
| `require_ig_verification` (`celestual_settings`) | Supabase **database** | ❌ never |
| `VITE_IG_VERIFY_ENABLED`, `VITE_IG_USERNAME` | Vercel **env vars** | ✅ yes (just a flag + your public handle) |
| Supabase **service-role** key | injected into the function only | ❌ never |

**Rule of thumb:** only values that start with `VITE_` are ever safe to expose in the
front-end.

---

## 12. Why this is secure (and the one honest trade-off)

**The `star-1283` code is not a secret.** It's just a *correlation id* that links one
incoming DM to one browser session. Ownership is decided by the **sender's username**,
which ManyChat fills from Meta's authenticated contact.

| Attack | Why it fails |
| --- | --- |
| **Claim someone else's @** | The username is `{{instagram.username}}` — the *authenticated sender's* handle, filled by ManyChat. You can't make ManyChat report a handle you don't control. |
| **Guess / brute-force the code** | A correct guess only completes a verification whose claimed handle equals the **sender's own** username — i.e. you can only verify *yourself*. Nothing is gained. |
| **Replay an old code** | Codes are unique among active pending sessions, single-use, and expire in ~10 minutes. A stale code matches no live session. |
| **Fake "verified" from the browser** | The verified flag is written only by a service-role function. The browser's calls are read-only. |
| **Steal proof from a DB dump** | Only `sha256(proof)` is stored; the raw proof lives in the browser. A table leak can't forge a submission. |
| **POST fake verifications to the function** | Rejected without the `MANYCHAT_SHARED_SECRET` (checked in constant time). |

**The one honest trade-off vs. the direct-Meta path:** with ManyChat, the username
arrives in the request body and the request is trusted because of the **shared
secret** — a standard "trusted webhook" model. So that secret is load-bearing. Protect
it by:

- keeping `MANYCHAT_SHARED_SECRET` **only** in Supabase secrets + the ManyChat header
  (never in the browser, the repo, or logs), making it long and random, and
  **rotating** it occasionally;
- relying on the start-rate limits (15/hr per IP, 8/hr per handle) that bound how fast
  codes can be made.

For typical use this is solid. If you ever want the strongest possible assurance, the
direct-Meta path (Appendix A) re-fetches the username from a Meta-signed payload
instead of trusting the request.

**Anonymity is preserved:** verification only reads the sender's **username**. We never
post, follow, or read anyone's content, and the person you later *enter* is never told
— the [reveal model](./SECURITY.md) is untouched.

---

## 13. Scale notes (tens of thousands of requests)

- **Relay function:** stateless and autoscaled. Each DM is one secret check + one
  indexed database call — a few milliseconds.
- **ManyChat:** built for high-volume DM automation; it queues and delivers the
  requests (mind its 10-second timeout — we're well under).
- **Polling:** the browser polls only while the overlay is open (~every 2.5s), stopping
  at the ~10-minute code expiry.
- **Code space:** 4 digits = 10,000 codes, but only *pending* ones must be unique, and
  expired rows are pruned — so it never fills. Need more headroom? Widen to 6 digits in
  `0004_ig_verification.sql` (`10000`→`1000000`, `lpad(...,4`→`6`); the `star-` prefix
  and security don't depend on length.
- **Rate limits:** code creation is capped per IP (15/hr) and per handle (8/hr).

---

## 14. Instagram / Meta terms compliance

- ManyChat is an **official Meta Business/Tech Partner** using the sanctioned
  Instagram Messaging API — no scraping, no unofficial endpoints.
- The visitor performs a normal human action (sending a DM). Any reply happens only
  **after** they message you, inside Meta's 24-hour window.
- We read **only** the sender's username, solely to verify. No content, contacts, or
  graph is harvested.
- Keep a privacy policy describing this (you have `privacy@celestual.us` + the in-app
  privacy screen).

---

## Appendix A — Alternative: direct Meta webhook (no ManyChat)

If `developers.facebook.com` works for you and you want the stronger, self-hosted model
(it independently re-fetches the username from a Meta-signed payload), use the
**`celestual-ig-webhook`** function instead of `celestual-manychat`. You'll create a
Meta app with the **Instagram** product and set these function secrets:

| Secret | Purpose |
| --- | --- |
| `IG_APP_SECRET` | verify each webhook's `X-Hub-Signature-256` |
| `IG_VERIFY_TOKEN` | the GET subscription handshake |
| `IG_ACCESS_TOKEN` | long-lived token to re-fetch the sender's username (refresh ~every 60 days) |

Then subscribe the webhook to the `messages` field. Everything else (migration `0004`,
the `star-` code format, the front-end flags in section 6, the enforcement flip in
section 8) is identical. The code is already in
`supabase/functions/celestual-ig-webhook/index.ts`.

---

## Appendix B — Bridge to the encrypted cross-device sky (optional)

Verification proves ownership but does **not** create a Supabase Auth session, so a
person's **sky persists locally** (as today), not in the encrypted database. That's
intentional. To get the encrypted, cross-device sky later, mint a Supabase Auth session
for the verified handle in the completion step — `api/profile.js` switches to the DB
path automatically when a session appears. Additive, and out of scope for verification
itself.

---

Back to the index: [README](../README.md) · go-live checklist:
[GO-LIVE.md](./GO-LIVE.md) · safety model: [SECURITY.md](./SECURITY.md).

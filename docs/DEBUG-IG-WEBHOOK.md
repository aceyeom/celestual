# CELESTUAL — Fixing "I DM the code but it never verifies" (direct Meta webhook path)

**Read this if:** you set up Instagram verification the **Meta developer** way (you went
to `developers.facebook.com`, made an app, added the Instagram product, set the three
secrets `IG_APP_SECRET` / `IG_VERIFY_TOKEN` / `IG_ACCESS_TOKEN`, added testers), and now:

- codes **do** appear in Supabase when you start a verification, **but**
- when you DM the code (e.g. `star-1283`) from `@ace03d` to `@celestual.us`, the page
  **never flips to "Verified ✓".**

This is the symptom of a broken **webhook** — the one piece that carries the DM from
Instagram into your backend. The recommended production relay is the **ManyChat** path
(full setup guide: [MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md)); this file troubleshoots
the direct-Meta alternative. Written for a beginner — follow it top to bottom.

> Once a DM verifies on this path, the sender gets a "✦ verified" DM back
> automatically (`IG_CONFIRM_DM`, on by default — set `0` to disable, e.g. when
> ManyChat is also live and already sending the feedback DM).

> **⚠ "It verifies on an account's FIRST DM, then never again."** This is the
> message-requests folder, not your code. A person who doesn't follow `@celestual.us`
> lands in **Requests**; Meta delivers the first message but won't reliably deliver
> that account's *later* messages until the business **replies once** (which accepts
> the thread into the general inbox). The webhook now **always replies** to every
> inbound so the first contact accepts the thread — deploy the latest
> `celestual-ig-webhook` to get the fix. If you set `IG_CONFIRM_DM=0` (to avoid
> double-DMs with ManyChat), then ManyChat's reply must be what accepts the thread.
> The permanent scale answer is the OAuth path — no DMs, no Requests folder:
> [OAUTH-SCALING-STRATEGY.md](./OAUTH-SCALING-STRATEGY.md) ·
> [IG-OAUTH-SETUP.md](./IG-OAUTH-SETUP.md).

> **Your specific values** (used throughout):
>
> | Thing | Value |
> | --- | --- |
> | Instagram account people DM | `@celestual.us` |
> | Account you verify **from** in testing | `@ace03d` |
> | Your webhook function URL | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook` |
> | Supabase project ref | `vwbsjwaqnycyghvwlxhd` |
> | The 3 secrets it needs | `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN` |

---

## 0. The 30-second mental model (why it's not verifying)

```
  Your website            Supabase (backend)              Instagram / Meta
  ────────────            ──────────────────              ────────────────
  type @ace03d ─start──▶ make code "star-1283"   ✅ THIS WORKS (you see the code)
       ◀── "star-1283" ──┘ (row = 'pending')

  you DM "star-1283"  ───────────────────────────────────▶  @celestual.us gets the DM
  from @ace03d                                                       │
                                                                     ▼
                          celestual-ig-webhook  ◀──── Meta POSTs the DM here  ⬅ THE BROKEN STEP
                            ├─ 1. is Meta's signature valid? (IG_APP_SECRET)
                            ├─ 2. ask Meta: who really sent this? (IG_ACCESS_TOKEN)
                            └─ 3. does that real @ == "ace03d"?  ✔ → row = 'verified'
  page polls, sees 'verified', flips to ✓ ✅ (only happens if the webhook ran)
```

You confirmed **the left half works** (codes generate). So the failure is somewhere in
**"Meta POSTs the DM to your webhook, and the webhook processes it."** There are only a
handful of places that can break, and the next section finds yours in about 5 minutes.

---

## 1. The ONE test that tells you where it's broken

Do these **two checks**. Together they pinpoint the failure to a single cause.

### Check A — Is the webhook function even *reachable* by Meta? (the handshake test)

You can test this **from a browser, without Instagram at all.** Paste this URL into your
browser, but **replace `PUT_YOUR_VERIFY_TOKEN_HERE`** with the exact value you saved as
`IG_VERIFY_TOKEN` in Supabase:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook?hub.mode=subscribe&hub.verify_token=PUT_YOUR_VERIFY_TOKEN_HERE&hub.challenge=hello123
```

What you get back tells you a lot:

| Browser shows | Meaning | Go to |
| --- | --- | --- |
| `hello123` | 🎉 Function is reachable **and** your verify token matches. Handshake is healthy. | **Check B** |
| `forbidden` | Function is reachable, but the **verify token doesn't match** what's in Supabase. | **Fix #2** |
| A JSON error like `{"code":401,"message":"Missing authorization header"}` or `Invalid JWT` | Supabase is blocking Meta **before** your code runs. **JWT verification is still ON.** This alone breaks everything. | **Fix #1** |
| `{"error":"...not found"}` / 404 | The function isn't deployed (or wrong name/URL). | **Fix #6** |

> Why this works: your function answers Meta's GET "handshake" by echoing back
> `hub.challenge` **only if** `hub.verify_token` equals your `IG_VERIFY_TOKEN`. That's
> exactly what Meta does when you add the webhook — so this reproduces it by hand.

### Check B — Does sending a real DM actually *hit* the function?

1. In Supabase: **Edge Functions** (left sidebar) → click **`celestual-ig-webhook`** →
   the **Invocations** (or **Logs**) tab. Leave it open.
2. Start a fresh verification on the live site for **`@ace03d`**, get a code like
   `star-1283`.
3. From the **@ace03d** Instagram account, DM that exact code to **@celestual.us**.
4. Watch the Invocations/Logs tab for ~15 seconds and refresh.

| What you see | Meaning | Go to |
| --- | --- | --- |
| **No new invocation appears at all** | Meta is **not delivering** the DM to your backend. The webhook subscription/permissions aren't actually live. | **Section 2 (Fixes #3–#5)** — the most common case |
| A new invocation, but it **returns 401** | Meta reached you but the **signature failed** → `IG_APP_SECRET` is wrong. | **Fix #7** |
| A new invocation returns **200**, logs show `no_username` | Webhook ran but couldn't read the sender's name → `IG_ACCESS_TOKEN` is wrong/expired/missing a permission. | **Fix #8** |
| A new invocation returns **200**, logs show `handle_mismatch` | Working as designed — the **sending account's real @ ≠ the @ you typed.** DM from the exact account you're verifying. | **Fix #9** |
| A new invocation returns **200**, logs show `no_pending` | The code expired (>10 min) or was already used. Start fresh and DM within 10 minutes. | **Fix #10** |

Write down which row you landed on. Now jump to that fix.

---

## 2. The fixes (in order of how common they are)

### Fix #1 — Turn OFF "Verify JWT" on the deployed function ⭐ (top suspect)

Supabase Edge Functions, by default, reject any request that doesn't carry a Supabase
login token. **Meta doesn't send one** — so Meta gets a `401` and your code never runs.
The repo already declares this should be off (`supabase/config.toml` →
`[functions.celestual-ig-webhook] verify_jwt = false`), **but that only takes effect if
the function was deployed with a CLI that read that config.** If you deployed an older
way, it can still be ON in the cloud.

**Fix it (two ways — do either):**

- **Dashboard way (easiest):** Supabase → **Edge Functions** → `celestual-ig-webhook` →
  **Details / Settings** → find **"Enforce JWT verification"** (a.k.a. *Verify JWT with
  legacy secret*) → turn it **OFF** → Save.
- **CLI way:** from the repo root, redeploy with the flag explicit:
  ```bash
  supabase functions deploy celestual-ig-webhook --no-verify-jwt
  ```

Then re-run **Check A**. You should now get `hello123` (or `forbidden` if your token is
wrong — see Fix #2). Do **not** move on until Check A returns `hello123`.

> Same applies to `celestual-manychat` if you ever use that path — webhooks need JWT off.

### Fix #2 — Make the verify token match exactly

Check A returned `forbidden`, which means the function is up but the token you put in the
URL ≠ `IG_VERIFY_TOKEN` in Supabase.

1. Supabase → **Edge Functions → Secrets** → look at `IG_VERIFY_TOKEN`. (You can't see
   the saved value; if unsure, just re-set it to a known value you choose, e.g.
   `celestual-verify-9f3k`. No spaces, no quotes.)
2. Re-run **Check A** using that exact value. You must get `hello123`.
3. **This same token** must be typed into Meta's webhook setup as the **"Verify token"**
   when you add/re-add the callback URL (Section 3, step 3).

### Fix #3 — Subscribe to the **`messages`** field (not just paste the URL) ⭐

This is the #1 reason "no invocation ever appears." Pasting your Callback URL only tells
Meta *where* to send events — you must **also** subscribe to the **`messages`** field, a
separate switch. Without it, Meta verifies your URL and then sends you **nothing.**

Where the switch lives depends on your setup:

- **Instagram API with Instagram login** (newer; uses `graph.instagram.com`):
  App Dashboard → **Instagram → API setup with Instagram login** → the **Webhooks**
  / **"Configure webhooks"** step → make sure **`messages`** is checked/subscribed.
  Also confirm the **Callback URL** there is your function URL and shows **"Complete" /
  green**.
- **Webhooks product (older layout):** App Dashboard → **Webhooks** → choose
  **Instagram** in the dropdown → next to the **`messages`** field click **Subscribe**
  (it should flip to *Subscribed*).

After subscribing, re-run **Check B**. If an invocation now appears — you're basically
done; continue to the result-specific fixes only if it errors.

### Fix #4 — Turn ON "Allow access to messages" on @celestual.us ⭐

If Instagram itself isn't allowed to hand your DMs to connected apps, Meta has nothing to
forward. On the **phone**, logged into **@celestual.us**:

1. Profile → **☰ menu** → **Settings and activity**.
2. **Messages and story replies** → **Message controls** → **Connected tools**.
3. Turn **Allow access to messages** → **ON**.

(While you're here, confirm @celestual.us is a **Professional** account — Settings →
*Account type and tools* → *Switch to professional account* if not.)

Re-test (**Check B**).

### Fix #5 — Get past Development-mode + "message request" gotchas

Two related things stop the very first DMs from a stranger account:

1. **App in Development mode:** while your Meta app is in **Development**, webhooks only
   fire for messages involving accounts that have a **role** on the app (Admin /
   Developer / **Tester**). You said you added `@ace03d` and `@celestual.us` as testers
   and **accepted** the invites on each — good, that's required. Double-check both
   invites show **Accepted** under App Dashboard → **App roles → Roles**. (You do **not**
   need to go Live just to test — testers work in Development.)
2. **The DM landed in "Requests":** when `@ace03d` (which doesn't follow `@celestual.us`)
   messages it for the first time, Instagram may file it under **Message requests**, and
   delivery can be flaky until the conversation is "open." To rule this out:
   - On `@celestual.us`, open **Messages → Requests**, find the DM from `@ace03d`, and
     tap **Accept**. Then have `@ace03d` send the code **again**.
   - Easiest clean test: have the two accounts **follow each other once**, then retry.

Re-test (**Check B**). If invocations now appear, continue below only if they error.

### Fix #6 — The function isn't deployed (Check A gave 404)

From the repo root:

```bash
supabase functions deploy celestual-ig-webhook --no-verify-jwt
```

First time on the CLI: `npm i -g supabase`, then `supabase login`, then
`supabase link --project-ref vwbsjwaqnycyghvwlxhd`, then the deploy above. Re-run Check A.

### Fix #7 — Invocation returns 401 → fix `IG_APP_SECRET`

Meta reached your function, but the signature check failed (`bad_signature`). Your
`IG_APP_SECRET` in Supabase must equal your Meta app's **App secret** *exactly*.

1. Meta App Dashboard → **App settings → Basic** → **App secret** → **Show** → copy it.
2. Supabase → **Edge Functions → Secrets** → set **`IG_APP_SECRET`** to that exact value
   (no extra spaces/newlines). Save.
3. DM the code again, watch for a **200** in invocations.

### Fix #8 — Logs show `no_username` → fix `IG_ACCESS_TOKEN`

The webhook ran but couldn't ask Meta "who sent this?" — the access token is wrong,
expired, or lacks permission to read the sender's username.

1. Regenerate the token in the Meta dashboard:
   - **Instagram API with Instagram login:** Instagram → **API setup with Instagram
     login** → **Generate access token** for **@celestual.us** → copy the long token.
   - (It must be the token tied to the Instagram account that **receives** the DMs.)
2. Make sure the app/token has the messaging permission
   (**`instagram_business_manage_messages`**). In Development mode testers have this; if
   you went Live you may need App Review for it.
3. Supabase → **Edge Functions → Secrets** → set **`IG_ACCESS_TOKEN`** to the new token.
   Save. (These tokens expire ~every 60 days — re-generate when they lapse.)
4. DM the code again; the log line should change from `no_username` to `ok:true`.

> If you used the **older "Messenger API for Instagram"** product (Facebook-Login + a
> Facebook **Page** token) instead of "Instagram login", your token is a **Page access
> token** and the username is read from `graph.facebook.com`, **not** `graph.instagram.com`
> that this function uses. In that case, either switch your Meta app to **Instagram API
> with Instagram login** (recommended — matches this code), or tell me and I'll adapt the
> function to the Page-token/`graph.facebook.com` shape.

### Fix #9 — Logs show `handle_mismatch` → DM from the right account

This is the security check doing its job: the **real** username of whoever sent the DM
didn't equal the `@` you typed on the site. Most common causes:

- You typed `@ace03d` on the site but sent the DM from a **different** logged-in account
  (phones with multiple accounts switch silently). Confirm the sender is literally
  `@ace03d`.
- You typed `@celestual.us` on the site and tried to DM **from** `@celestual.us` — an
  account can't DM itself. Always verify **from a second account** (here, `@ace03d`).

Fix the account, start fresh, DM again.

### Fix #10 — Logs show `no_pending` → you raced the 10-minute clock

Codes are valid for **~10 minutes** and are single-use. If you took longer, or reused an
old code, you'll get `no_pending`. Start a brand-new verification and DM the new code
within a couple of minutes.

---

## 3. Clean full setup of the Meta webhook (do this if you want to redo it from scratch)

If the checks above leave you unsure what state things are in, set the webhook up cleanly
once. ~15 minutes.

**Step 1 — Confirm the 3 secrets exist in Supabase.**
Supabase → **Edge Functions → Secrets**. You need all three:

| Secret | What it is | Where to get it |
| --- | --- | --- |
| `IG_APP_SECRET` | Your Meta app's App secret | Meta → App settings → Basic → App secret |
| `IG_VERIFY_TOKEN` | A token **you invent** (any random string, no spaces) | You choose it, e.g. `celestual-verify-9f3k` |
| `IG_ACCESS_TOKEN` | Long-lived Instagram token for @celestual.us | Meta → Instagram → API setup → Generate access token |

(You do **not** set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase injects those.)

**Step 2 — Deploy the function with JWT off.**
```bash
supabase functions deploy celestual-ig-webhook --no-verify-jwt
```
Then run **Check A** (Section 1). Don't continue until it returns `hello123`.

**Step 3 — Add the webhook in Meta.**
1. Meta App Dashboard → your app → the **Instagram** product → the webhooks/callback step
   (in "API setup with Instagram login" it's the **Configure webhooks** box; in the
   classic layout it's the **Webhooks** product with **Instagram** selected).
2. **Callback URL:** `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-ig-webhook`
3. **Verify token:** the **exact** value you stored as `IG_VERIFY_TOKEN`.
4. Click **Verify and Save**. It should succeed (because Check A passed). If it fails,
   you're back to Fix #1 or #2.

**Step 4 — Subscribe the `messages` field.** (Fix #3 above.) This is the step people miss.
Confirm **`messages`** shows **Subscribed**.

**Step 5 — Permissions & roles.**
- @celestual.us is **Professional** + **Allow access to messages ON** (Fix #4).
- `@ace03d` and `@celestual.us` are **Testers** with invites **Accepted** (Fix #5).

**Step 6 — Test end-to-end** using **Check B**. Start a verification for `@ace03d`, DM the
`star-####` code from `@ace03d` to `@celestual.us`, watch the row flip.

---

## 4. Watching what's happening (your two windows)

**Supabase function logs** — *did Meta call us, and what did we answer?*
Supabase → **Edge Functions → `celestual-ig-webhook` → Invocations / Logs.** Each DM that
reaches you is one entry. The JSON response lists per-message results like
`{"ok":true,"handle":"ace03d"}`, or an error like `no_username` / `handle_mismatch`.

**Supabase SQL** — *what state is the verification row in?* Run in **SQL Editor**:
```sql
select handle, token, status, igsid, created_at, expires_at, verified_at
  from celestual_ig_verifications
 order by created_at desc
 limit 5;
```
- `status = 'pending'` and never changes → the webhook isn't completing it (Section 1/2).
- `status = 'verified'` but the page didn't flip → you sent the DM in a browser tab that
  got torn down; reopen **celestual.us** and it resumes polling the **same** code.

---

## 5. Quick reference — where each secret lives

| Value | Lives in | Must equal |
| --- | --- | --- |
| `IG_APP_SECRET` | Supabase function secret | Meta → App settings → Basic → **App secret** |
| `IG_VERIFY_TOKEN` | Supabase function secret | The **Verify token** you type into Meta's webhook box |
| `IG_ACCESS_TOKEN` | Supabase function secret | A live token for **@celestual.us** (re-gen ~60 days) |
| `verify_jwt` | Supabase function setting | must be **OFF** for this function |
| `messages` field | Meta webhook subscription | must be **Subscribed** |
| `VITE_IG_VERIFY_ENABLED=1`, `VITE_IG_USERNAME=celestual.us` | Vercel env vars | (front-end; you already set these) |

---

## 6. Most likely answer for *your* case

You reported: **codes generate, but the DM never verifies, and you suspect Meta isn't
calling your backend.** That points squarely at **Check B = "no invocation appears,"**
whose top three causes — in order — are:

1. **Fix #3** — the **`messages`** field was never actually *subscribed* (only the URL was
   saved). Most common.
2. **Fix #1** — the deployed function still **enforces JWT**, so Meta's calls are bounced
   with 401 before your code runs. (Run **Check A** — if you don't get `hello123`, this is
   it.)
3. **Fix #4** — **"Allow access to messages"** is OFF on `@celestual.us`.

Run **Check A** and **Check B** once; whichever row you land on names the exact fix. If
Check B shows an invocation that errors (`no_username` / `bad_signature`), it's a
secret/token mismatch — Fixes #7–#8.

---

Back to: [MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) (the recommended relay path) ·
[supabase/README.md](../supabase/README.md) (functions overview) ·
[README](../README.md) · [SECURITY.md](./SECURITY.md)

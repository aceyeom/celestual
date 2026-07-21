# CELESTUAL — Connecting ManyChat (the Instagram verification relay), end to end

**This is the recommended production path for Instagram DM verification.** It needs
no Meta developer portal, no app review, no webhook subscription — ManyChat (an
official Meta messaging partner) owns the Instagram connection and relays each
verification DM to your backend with one authenticated HTTP call.

It is the **temporary-but-kept-forever** path: use it now, before your own Meta app
passes review, and keep it maintained as the fallback even after the direct Meta
webhook goes live (platform risk is real — see `docs/SECURITY.md`, "Meta platform
risk"). The direct-Meta alternative is documented in
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md).

Written for a beginner — follow it top to bottom. ~30 minutes.

> **Your specific values** (used throughout):
>
> | Thing | Value |
> | --- | --- |
> | Instagram account people DM | `@celestual.us` |
> | Your ManyChat function URL | `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat` |
> | Supabase project ref | `vwbsjwaqnycyghvwlxhd` |
> | The 1 secret it needs | `MANYCHAT_SHARED_SECRET` |

---

## 0. The 30-second mental model

```
  Your website             Supabase (backend)             ManyChat        Instagram
  ────────────             ──────────────────             ────────        ─────────
  type @ace03d ──start──▶  make code "star-1283"
       ◀── "star-1283" ──┘  (row = 'pending')

  user DMs "star-1283" ────────────────────────────────────────────────▶ @celestual.us
                                                              ◀──────────┘
                                              automation fires:
                                              "message contains star-"
                                                     │
                           celestual-manychat ◀──────┘ External Request
                             ├─ 1. X-Celestual-Token header valid?  (the shared secret)
                             ├─ 2. does the sender's REAL @ == the @ the code was for?
                             └─ 3. yes → row = 'verified', returns { reply: "✦ verified…" }
                                                     │
                          user gets the feedback DM ◀┘ (ManyChat sends $.reply back)
  page polls, sees 'verified', flips to ✓
```

Security in one line: the 4-digit code is only a correlation id — the gate is the
**sender's real username**, which ManyChat gets from Meta's official API and your
backend compares to the claimed handle
(`celestual_complete_ig_verification`, service-role only). A guessed code from the
wrong account verifies nothing. The shared secret is what stops anyone else from
POSTing fake "DMs" at your function — treat it like a password.

---

## 1. What you need before you start

1. **@celestual.us switched to a Professional account** (Instagram app → Settings →
   *Account type and tools* → *Switch to professional account*; "Creator" is fine).
2. On that account: **☰ → Settings and activity → Messages and story replies →
   Message controls → Connected tools → "Allow access to messages" = ON.** Without
   this Instagram never hands DMs to ManyChat and nothing downstream can work.
3. A **ManyChat account** on the **Pro plan** (the Instagram channel + External
   Request actions are Pro features, ~$15/mo at time of writing).
4. The **Supabase CLI** linked to the project (`supabase login`, then
   `supabase link --project-ref vwbsjwaqnycyghvwlxhd`).

---

## 2. Set the shared secret and deploy the function

**Step 1 — mint a strong secret** (any long random string; this one command makes a
good one):

```bash
openssl rand -hex 32
```

Copy the output. You will paste it in exactly **two** places: Supabase (now) and the
ManyChat request header (Step 4). If they ever differ, every relay call gets `401`.

**Step 2 — store it in Supabase:**

```bash
supabase secrets set MANYCHAT_SHARED_SECRET="paste-the-64-hex-chars-here"
```

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — you do
**not** set those.)

**Step 3 — deploy with JWT verification OFF** (ManyChat doesn't carry a Supabase
login token; the shared secret is the auth):

```bash
supabase functions deploy celestual-manychat --no-verify-jwt
```

**Step 4 — smoke-test it's reachable.** Paste the function URL into a browser:

```
https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat
```

| Browser shows | Meaning |
| --- | --- |
| `{"ok":true,"service":"celestual-manychat"}` | 🎉 deployed and reachable — continue |
| `{"code":401,"message":"Missing authorization header"}` / `Invalid JWT` | JWT verification is still ON. Redeploy with `--no-verify-jwt`, or turn "Enforce JWT verification" OFF in Supabase → Edge Functions → celestual-manychat → Details. |
| 404 / not found | Not deployed (or wrong URL). Run the deploy again from the repo root. |

**Step 5 — full dry-run with curl** (no Instagram involved). Start a verification
on the live site for a test handle (say `@ace03d`), note the code (say
`star-1283`), then:

```bash
curl -sX POST "https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat" \
  -H "Content-Type: application/json" \
  -H "X-Celestual-Token: YOUR-SECRET-HERE" \
  -d '{"username":"ace03d","text":"star-1283"}'
```

You should get `{"ok":true,"status":"verified","handle":"ace03d","reply":"✦ @ace03d is verified…"}`
and the site should flip to ✓ within a couple of seconds. (This proves the entire
backend half before you touch ManyChat. A `401` here = the secret in the header ≠
the secret in Supabase.)

---

## 3. Connect Instagram to ManyChat

1. In ManyChat: **Settings → Channels → Instagram → Connect** (or "+ Add Channel").
2. Log in with **@celestual.us** and approve the permissions ManyChat asks for
   (it needs message access — that's the whole point).
3. ManyChat will re-check the two Instagram prerequisites from §1 (professional
   account, message access ON) and tell you if either is off.

---

## 4. Build the automation (the relay)

Goal: *when any DM containing `star-` arrives → POST it to the function → DM the
function's `reply` back.* Three nodes.

**Step 1 — the trigger.** Create a new Automation. Add the Instagram trigger:

- **Use the Keyword trigger** → condition **"message contains"** → `star-`.
  Keyword triggers fire on **every** matching message, which is exactly what
  verification needs — people verify more than once (new device, new session,
  a retry, a second handle).
- ⚠ **Do NOT build this on the Default Reply trigger.** Default Reply fires at
  most **once per contact per 24 hours** by default, which turns verification
  into a **one-and-done**: a person's first DM verifies instantly, and every
  later attempt is silently swallowed by ManyChat — the site just polls until
  the code dies. If you already built it that way, either rebuild on Keyword or
  open the Default Reply settings and set it to trigger **"Every time"**.

  The point of the `star-` gate either way: **ordinary DMs never reach your
  backend** — only ones carrying the `star-` marker.

**Step 2 — the External Request.** Add an **Action → External Request** node:

- **Request type:** `POST`
- **URL:** `https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-manychat`
- **Headers** (add both):
  - `Content-Type`: `application/json`
  - `X-Celestual-Token`: *the exact secret from §2* (no quotes, no spaces)
- **Body** — raw JSON, inserting ManyChat fields with the **`+` picker** (do not
  type the placeholders by hand; pick them, so they resolve):

  ```json
  {
    "username": "{{Instagram Username}}",
    "text": "{{Last Text Input}}",
    "subscriber_id": "{{Contact Id}}"
  }
  ```

  `username` and `text` are required; `subscriber_id` is optional (audit trail).

**Step 3 — map the response and send the feedback DM.** Still in the External
Request node, open **Response Mapping**:

- Map JSONPath **`$.reply`** → a new **custom field**, e.g. `celestual_reply`.

Then add a **Send Message** node right after the request, containing just
`{{celestual_reply}}`.

That message IS the verified-feedback DM: the function returns a human `reply` on
**every** outcome —

| Outcome | The DM the person gets |
| --- | --- |
| verified ✓ | `✦ @handle is verified on CELESTUAL — head back to the app to finish.` |
| wrong account | `That code was started for a different @. Start again from the app with this account.` |
| expired / already used / random code | `That code didn't match an active request. Get a fresh code in the app and send it here.` |
| no code found in the text | `Send the code exactly as the app shows it — like star-1234.` |

Because the DM is an immediate reply to a message the person just sent, it sits
inside **Meta's 24-hour standard messaging window** — fully ToS-compliant.

**Step 4 — set the automation LIVE.** Drafts don't fire. Flip the toggle.

---

## 5. Test end to end

1. Start a fresh verification on the live site for `@ace03d` → get `star-####`.
2. From the **@ace03d** Instagram account, DM that exact code to **@celestual.us**.
3. Within seconds: the site flips to **Verified ✓** and @ace03d receives the
   `✦ … verified` DM back.

Watch both sides while testing:

- **ManyChat:** Automation → the flow → each contact's journey shows whether the
  trigger fired and what the External Request returned.
- **Supabase:** Edge Functions → `celestual-manychat` → Invocations/Logs. And in
  the SQL editor:

  ```sql
  select handle, token, status, igsid, created_at, expires_at, verified_at
    from celestual_ig_verifications order by created_at desc limit 5;
  ```

---

## 6. Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| **Verification works ONCE per person, then never again** (first DM verifies; later DMs from the same account get no journey entry and no reply) | The automation is built on the **Default Reply** trigger, which fires once per contact per 24 h by default. Rebuild it on a **Keyword** trigger (`star-`), or set Default Reply to trigger **"Every time"** (§4 Step 1). |
| DM sent, nothing happens, no ManyChat journey entry | Automation not live, trigger doesn't match (`star-` missing/typo'd), or Instagram "Allow access to messages" is OFF (§1.2). |
| Journey shows the request fired, function log = `401 unauthorized` | Header secret ≠ Supabase secret. Re-set both to the same value (§2). The header name must be exactly `X-Celestual-Token`. |
| Function log = `no_username` | The `username` body field isn't mapped (typed by hand instead of the `+` picker). Re-insert it. |
| Function log = `no_code` | The `text` field isn't mapped, or the person sent only the digits with the prefix mangled. The function reads `star-1234`, `star 1234`, `star–1234`, and bare `1234`. |
| `status:"handle_mismatch"` | Working as designed: the sender's real @ ≠ the @ typed on the site. The person gets a DM telling them to retry from the right account. |
| `status:"no_match"` | Random/unknown digits. Fresh code, resend. (An expired code now answers `code_expired`; a re-sent code from someone already verified answers `already_verified` — both with an honest DM, so neither reads as broken.) |
| Function reachable but Meta's DMs are delayed | First-time DMs from strangers can land in **Message Requests**; open @celestual.us → Requests → Accept once, then it flows. |
| `{"code":401,"message":"Missing authorization header"}` on the health-check GET | JWT verification still on — redeploy `--no-verify-jwt` (§2 Step 4). |

---

## 7. Operating notes

- **Rotate the secret** if it ever leaks (or people leave the team): run §2 Steps
  1–2 with a new value, update the ManyChat header, done. There is no other consumer.
- **Running BOTH paths:** the direct Meta webhook (DEBUG-IG-WEBHOOK.md) and ManyChat
  can be live simultaneously — completion is idempotent (whichever arrives first
  wins; the second finds `no_pending`). But then the person may get **two**
  feedback DMs (ManyChat's `reply` + the webhook's confirm). If you run both, set
  `IG_CONFIRM_DM=0` on `celestual-ig-webhook` so ManyChat owns the feedback DM.
- **When your Meta app passes review**, you can switch primary to the direct
  webhook for lower latency and one less vendor — but keep this automation
  configured (paused is fine) so a webhook outage or app-review problem never takes
  verification down (SECURITY.md, "Meta platform risk").
- **Meta ToS position:** the visitor never OAuths anything; they voluntarily DM a
  business account; the business replies once inside the 24-hour window via an
  official Meta messaging partner. No scraping, no unsolicited messages, no
  password handling.

---

## 8. Root-cause investigation — "it only verifies the first time" & the "different @" reply

This section is the written record of a July 2026 investigation into two live
complaints:

1. **"The OAuth only works the first time for new users; after ~12–24 h it makes
   them do the DM again, and the repeat DM never verifies."**
2. **A user sent a code and got back:** *"That code was started for a different @.
   Start again from the app with this account."*

It is deliberately blunt about where the fault actually lies, because the
first-glance explanation (a code TTL that was too short, or "Instagram is
throttling us") is only the *last* link in the chain, not the cause.

### 8.1 What the data actually shows

Pulled from `celestual_ig_verifications` (production, `vwbsjwaqnycyghvwlxhd`):

| Handle | Attempts in ~30 h | Verified | Left pending (failed) |
| --- | --- | --- | --- |
| `ace03d` | **9** | 5 | 4 |
| `sogeum_in` | 3 | 1 | 2 |
| `aooo9290` | 3 | 1 | 2 |

The decisive fact: **`ace03d` verified five separate times in about thirty
hours.** A verified session is a **30-day sliding window** (migrations 0009/0010).
If the app trusted that session, `ace03d` would have DM'd **once** and never
again for a month. Five verifications in thirty hours means the app kept
**throwing the session away and forcing a fresh DM** — and *that* is what
manufactured the repeat-DM pattern in the first place.

The failed rows cluster exactly where you'd predict if Instagram were dropping
rapid repeats: `star-9866` verified after a 16-hour gap, then `star-7376` sent
**7.8 minutes later** never reached ManyChat at all (zero Edge Function
invocations, no ManyChat journey entry). The DM died in the Instagram→ManyChat
hop — Meta-side anti-spam suppression of repetitive automated-looking DMs to a
business account.

### 8.2 The real causal chain (surface → root)

```
  "works once, then fails"                          ← the complaint
        ▲
  Instagram throttles the repeat DM, drops it       ← Meta-side, uncontrollable
        ▲
  the user is FORCED to DM again and again          ← the actual bug lives here
        ▲
  the app lost its verified session and re-prompts  ← ROOT CAUSE
        ▲
  the session + its `proof` secret live ONLY in
  localStorage, with no server-backed recovery      ← the architectural gap
```

- **Root cause.** `getSession()` (app/src/api/auth.js) reads a verified session
  purely from `localStorage['celestual:auth']`, and `verified` in App.jsx is
  `session.verified && normHandle(session.handle) === normHandle(me)`. The moment
  that localStorage entry is gone — **Instagram's in-app browser sandbox** (the
  most common test/entry path, and it does not share storage with the real
  browser), **iOS Safari ITP** (script-writable storage is evicted after ~7 days
  of no interaction, sometimes sooner), private mode, a cleared browser, or simply
  **a different device** — the app has *no way* to know the handle is already
  verified. The 30-day verified row still sits happily in Postgres, but it is
  unreachable: the only key to it is the `proof` secret, and that secret also
  lived only in the localStorage that just vanished.
- **Second-order effect.** Because a lost session can only be recovered by DMing
  again, an active user (or a tester) generates many DMs from the same account in
  a short window. Instagram's integrity/anti-spam layer reads a stream of
  `star-####` DMs to a business account as automated spam and silently stops
  delivering them to ManyChat. Nothing downstream — not ManyChat, not the Edge
  Function, not the code TTL — can rescue a DM that Meta never delivers.
- **Why the code-TTL bump helped but did not fix it.** Raising the pending TTL
  from 10 minutes to 24 hours (done live, now captured in **migration
  `0011_pending_ttl_24h.sql`**) removes the "code died while it sat in Message
  Requests" failure, which is real and worth keeping. But it does nothing about a
  session that was discarded and has to be re-earned by DM. TTL was never the
  root cause.

### 8.3 The "That code was started for a different @" case

This is `handle_mismatch` in `celestual_complete_ig_verification`: a pending code
was found, but the **Meta-authenticated username of the account that DM'd it**
did not equal the **@ typed on the site** when the code was started. It is
*working as designed* as a security gate — a guessed code from the wrong account
must verify nothing — but it becomes a wall for legitimate people when:

- they **typo'd** their handle on the site (`sogeum_in` vs `soguem_in` both appear
  in the data), or
- they manage **several Instagram accounts** and DM'd from the wrong one, or
- during testing, a code is started for a throwaway handle (`p`, `0p32j8h`,
  `aooo9290`) and then DM'd from the real account (`ace03d`) — which is exactly
  what produced this reply in our logs.

The gate is sound; the **product shape** around it is what forces the mismatch:
the site asks the user to *type* the identity, then demands the DM prove that
exact typed string, so any drift between "what I typed" and "which account I'm
actually messaging from" is a dead end.

### 8.4 The fixes

Ordered from "already done / no decision" to "product decisions to confirm."

**A. Done — make git honest about the live TTL.** Migration
`0011_pending_ttl_24h.sql` restates `celestual_start_ig_verification` with the
24-hour pending TTL that was hand-edited into production, so a fresh
`supabase db reset` or a new environment matches production. The stale "codes
last about 10 minutes" copy in the `code_expired` reply is corrected to 24 hours.

**B. The real fix — a durable, recoverable verified session ("permanent login").**
**✅ SHIPPED** — migration `0013_durable_relogin.sql`, the `celestual-relogin`
edge function, `app/src/api/relogin.js`, and the `/signin` route. At the one-time
DM verification the browser binds `handle ⇄ email` under its fresh proof
(`celestual_bind_recovery`); a "sign back in" emails a one-time, hash-stored,
20-minute magic link (`${SITE}/signin#t=…`) that mints a fresh proof client-side
and a full 30-day session with no DM (`celestual_relogin_redeem`, service-role
only). The login screen leads with the email link and keeps a DM fallback for
handles with no bound address. The goal is that a handle is DM-verified **once,
ever**, and every later return — new session, evicted storage, new device —
restores that identity *without another DM*, so Instagram never sees a repeat
pattern to throttle. The building blocks:

  - **Trust an existing local session and stop re-prompting while it is valid.**
    Today several flows re-open the verify sheet even when a live session exists;
    a verified handle should sail straight through.
  - **A server-backed recovery that does not require a DM.** The robust,
    ToS-clean choice is an **email magic-link re-login**: on the one-time DM
    verification we bind `handle ⇄ email` (email is already collected), and a
    "sign back in" flow emails a link that re-issues a fresh `proof` bound to that
    handle. This survives any storage loss and works cross-device, using the
    existing `celestual-notify` / `celestual-remind` email infrastructure. It
    turns the DM into a one-time step instead of a recurring tax.

**C. Eliminate the "different @" wall — let the DMing account define identity.**
**✅ SHIPPED** — migration `0012_ig_code_pure_correlation.sql` plus the matching
edits to `celestual-ig-webhook`, `celestual-manychat`, `igverify.js` and the app.
The 4-digit code is now a **pure correlation id** and the verified identity is
*always* the Meta-authenticated account that actually sends the DM:
`celestual_complete_ig_verification` adopts that username (overwriting the typed
hint), and `celestual_poll_ig_verification` hands the adopted @ back to the
proof-holder so the site adopts it. This removes the entire `handle_mismatch`
class (there is nothing to mismatch against — the "that code was started for a
different @" reply is gone from both relays) and is strictly *more* secure,
because identity is never a typed claim.

**D. Delivery resilience — run the direct Meta webhook in parallel.** The direct
webhook (`celestual-ig-webhook`, see [DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md))
receives message events through a *different* Meta delivery path than the
third-party ManyChat relay and can be less aggressively throttled for the
repetitive pattern. Running it alongside ManyChat (with `IG_CONFIRM_DM=0` so
ManyChat still owns the feedback DM; completion is idempotent) is the
architecturally sound hedge the SECURITY.md "Meta platform risk" note already
recommends. Gate: it needs the Meta app to pass review. Once **B** lands, repeat
DMs become rare, so this is a resilience layer rather than a dependency.

### 8.5 Bottom line

The code TTL and the Instagram throttle are real, but they are symptoms. The
durable fix is **B** — stop discarding the verified session, and give it a
server-backed, DM-free recovery — with **C** removing the wrong-account wall.
**Both now ship** (migrations 0012 + 0013): the verified session survives storage
loss and returns by email magic link on any device, and identity is always the
Meta-authenticated account that DMs. The "one and done" complaint and the
"different @" reply are no longer reachable in normal use, and **D** (running the
direct Meta webhook in parallel) remains the optional hedge for residual
Meta-platform risk.

---

Back to: [supabase/README.md](../supabase/README.md) (functions overview) ·
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md) (the direct-Meta path) ·
[SECURITY.md](./SECURITY.md)

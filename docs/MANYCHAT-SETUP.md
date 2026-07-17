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

- Easiest: **Keyword** trigger → condition **"message contains"** → `star-`.
- Alternative (what the code comments describe): **Default Reply** trigger, then a
  **Condition** node checking *Last Text Input contains `star-`* before the request
  step. Either works; the point is that **ordinary DMs never reach your backend** —
  only ones carrying the `star-` marker.

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
| DM sent, nothing happens, no ManyChat journey entry | Automation not live, trigger doesn't match (`star-` missing/typo'd), or Instagram "Allow access to messages" is OFF (§1.2). |
| Journey shows the request fired, function log = `401 unauthorized` | Header secret ≠ Supabase secret. Re-set both to the same value (§2). The header name must be exactly `X-Celestual-Token`. |
| Function log = `no_username` | The `username` body field isn't mapped (typed by hand instead of the `+` picker). Re-insert it. |
| Function log = `no_code` | The `text` field isn't mapped, or the person sent only the digits with the prefix mangled. The function reads `star-1234`, `star 1234`, `star–1234`, and bare `1234`. |
| `status:"handle_mismatch"` | Working as designed: the sender's real @ ≠ the @ typed on the site. The person gets a DM telling them to retry from the right account. |
| `status:"no_match"` | Code expired (>10 min), already used, or random digits. Fresh code, resend. |
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

Back to: [supabase/README.md](../supabase/README.md) (functions overview) ·
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md) (the direct-Meta path) ·
[SECURITY.md](./SECURITY.md)

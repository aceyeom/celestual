# CELESTUAL — Setup: Instagram DM handle verification (via ManyChat)

How to turn on **handle-ownership verification** — proving the `@` a person types is
really theirs — **without touching developers.facebook.com, without any
OAuth/login/password.** People prove ownership by DMing a short code to your
Instagram account; **ManyChat** (an official Meta messaging partner) relays the
message — with the sender's verified username — to your backend.

> **Why ManyChat?** Meta's developer portal (app creation, webhook config, access
> tokens, App Review) is painful and sometimes just won't load. ManyChat owns the
> Meta connection for you: you connect your Instagram account inside ManyChat's UI
> and never create a Meta app. If you *can* use the Meta portal and want the
> strongest assurance, **Appendix A** documents the direct path instead.

> **Why this exists.** Until now CELESTUAL trusted whatever handle a person typed as
> their `from` — the *one remaining gap* in [SECURITY.md](./SECURITY.md). This closes
> it: every sealed entry's "from" side becomes a real, controlled account.

This is **off by default**. Nothing breaks before you wire it; flip it on as the
final go-live step. Budget ~30 minutes.

The Instagram account in this guide is **@celestual.us** (your handle). Wherever you
see `celestual.us`, that's the IG username people DM the code to.

---

## TL;DR checklist

- [ ] **@celestual.us** is an Instagram **professional** (Business/Creator) account.
- [ ] A **ManyChat** account with that Instagram connected (ManyChat **Pro** — needed for External Request).
- [ ] Apply migration **`0004_ig_verification.sql`** in Supabase.
- [ ] Deploy the **`celestual-manychat`** edge function; set the secret `MANYCHAT_SHARED_SECRET`.
- [ ] In ManyChat: a **Default Reply → External Request** that POSTs the username + code to the function.
- [ ] Vercel env: `VITE_IG_VERIFY_ENABLED=1`, `VITE_IG_USERNAME=celestual.us` → redeploy.
- [ ] Flip enforcement on: `update celestual_settings set value='true' where key='require_ig_verification';`
- [ ] Test end-to-end (section 7).

---

## 0. How it works (the 60-second model)

```
  Browser                         Supabase                         ManyChat / Instagram
  ───────                         ────────                         ────────────────────
  pick @alice ──start──▶ celestual_start_ig_verification
                          └─ issues 4-digit code, stores sha256(proof)
     ◀── code "4071" ─────┘
  Copy & open Instagram ───────────────────────────────────────▶ user DMs "4071" to @celestual.us
                                                                          │
                          celestual-manychat  ◀── External Request ───────┘  (ManyChat fills in the
                            ├─ check X-Celestual-Token (shared secret)         sender's REAL @ + the text)
                            └─ celestual_complete_ig_verification(code, igsid, "alice")
                                 └─ username == claimed handle?  ✔  → row = 'verified'
  poll(code, proofHash) ─▶ celestual_poll_ig_verification ─▶ "verified"
  seal ── proof ───────▶ celestual_submit(...,p_proof)
                            └─ celestual_consume_ig_proof → entry recorded
```

The decisive check is **`username == claimed handle`**. The username is supplied by
ManyChat from the **Meta-authenticated** contact — not by the browser or the message
body — and the request is authenticated to your backend by a **shared secret**.

---

## 1. Your Instagram account

People DM the code to this account, so use the one you want as CELESTUAL's public
Instagram — **@celestual.us**.

1. Make it a **professional** account: Instagram app → **Settings and activity →
   Account type and tools → Switch to professional account** → **Business** (or
   Creator). Free and reversible.
2. Allow message access (ManyChat needs this): **Settings and activity → Messages
   and story replies → Message controls → Connected tools → Allow access to
   messages → ON.**

> **Meta's one rule (not the dev portal):** Instagram messaging automation requires
> the professional account to be linked to a **Facebook Page**. If you don't have
> one, create a Page (free, ~2 min) and link it under **Instagram → Settings →
> Account → Sharing to other apps**, or in **Meta Business Suite**. This is a normal
> account setting — **you still never visit developers.facebook.com.** ManyChat's
> "Connect via Meta" handles the app, tokens, and permissions for you.

---

## 2. ManyChat — connect Instagram

1. Create an account at **[manychat.com](https://manychat.com)** and choose
   **Instagram** as the channel.
2. Click **Connect via Meta** (a.k.a. "Connect Instagram") and log into the
   Facebook/Instagram that manages **@celestual.us**. Grant the messaging
   permissions ManyChat requests. *(This is you connecting your own account to
   ManyChat — your visitors never log into anything.)*
3. Confirm the account shows as **connected** in ManyChat → **Settings → Channels →
   Instagram**.
4. **Upgrade to ManyChat Pro.** The **External Request** action (section 4) is a Pro
   feature; on the free plan you can't call your backend.

> Can't see your account to connect? You must be an **Admin (full control)** of the
> Facebook Page linked to @celestual.us, and "Allow access to messages" must be on
> (section 1). See ManyChat's
> [connection guide](https://help.manychat.com/hc/en-us/articles/14281290924444).

---

## 3. Supabase — migration + the relay function

### 3.1 Apply the migration
Adds the verification tables/RPCs and the (optional) ownership gate in
`celestual_submit`. Idempotent and safe to re-run. **SQL Editor:** run
[`supabase/migrations/0004_ig_verification.sql`](../supabase/migrations/0004_ig_verification.sql),
or `supabase db push`.

### 3.2 Set the shared secret + deploy
1. Make a long random secret and set it — Supabase → **Edge Functions → Secrets**:
   ```bash
   # generate one:
   openssl rand -hex 32
   ```
   | Secret | Value |
   | --- | --- |
   | `MANYCHAT_SHARED_SECRET` | the random string above (you'll paste the same value into ManyChat) |

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
2. Deploy:
   ```bash
   supabase functions deploy celestual-manychat
   ```
   Its URL is
   `https://<your-project-ref>.functions.supabase.co/celestual-manychat` — copy it
   for the next step. (Open it in a browser: it should return
   `{"ok":true,"service":"celestual-manychat"}`.)

---

## 4. ManyChat — the verification automation

Build one automation: when anyone DMs your account, send the username + their
message to the function.

1. **Automation → New Automation** (or **Flows → New Flow**). Add a trigger:
   **Default Reply** (fires on any message that doesn't match another keyword — this
   is what catches the dynamic code). Enable it.
2. In the flow, add an **Action → External Request** (Dev Tools). Configure:
   - **Method:** `POST`
   - **Request URL:** your `celestual-manychat` URL from §3.2.
   - **Headers:** add one —
     `X-Celestual-Token` : `<the MANYCHAT_SHARED_SECRET value>`
   - **Body** → **JSON**. Use the **`+` / personalization picker** to insert the
     fields so the exact merge tags are correct:
     ```json
     {
       "username": "{{instagram.username}}",
       "text": "{{last_text_input}}",
       "subscriber_id": "{{user.id}}"
     }
     ```
     `{{instagram.username}}` is the sender's real handle (from Meta, via ManyChat);
     `{{last_text_input}}` is the code they just typed.
3. *(Optional but nice)* **Response mapping + reply.** Map the response field
   `status` (and `reply`) to a custom user field, then add a **Send Message** showing
   it — so the DM gets a "Verified ✦ / try again" acknowledgement. You can skip this:
   the app confirms on its own by polling. If you skip it, add a simple Send Message
   like *"Got it ✦ — head back to CELESTUAL, you're verified in seconds."*
4. *(Optional)* Add a **Condition** before the request — only call it when
   `Last Text Input` looks like a code — to avoid pinging your backend on every
   unrelated DM. Not required; the function safely ignores non-codes.
5. **Publish** the automation.

> ManyChat External Requests **time out at 10 seconds**; this function responds in
> well under that.

---

## 5. Front-end — turn it on

In **Vercel → Settings → Environment Variables** (and `app/.env.local` locally):

```
VITE_IG_VERIFY_ENABLED=1
VITE_IG_USERNAME=celestual.us      # no @ — the account from section 1
```

**Redeploy.** The "this is you" step now shows **Verify & continue**, opening the
in-tab code overlay — no popup, no redirect, the in-progress entry is never lost.
"Copy & open Instagram" copies the code and deep-links to `ig.me/m/celestual.us`.

### Flip enforcement on (the loophole-closing step)

The front-end gate is UX; the **server** is the authority. Until you flip this, a
crafted direct RPC call could still submit an unverified `from`. Turn it on **after**
a real verification works (section 7):

```sql
update celestual_settings set value = 'true', updated_at = now()
 where key = 'require_ig_verification';
```

Now `celestual_submit` **rejects** any entry whose `from` hasn't been proven
(`{ recorded:false, error:'unverified' }`). Roll back by setting it to `'false'`.

> **Order matters:** get ManyChat + the function + the front-end working and confirm
> a real verification *first*, then flip enforcement — otherwise live users hit
> `unverified` before they can verify.

---

## 6. Keeping it running

ManyChat holds the Instagram connection, so there's **no 60-day access token for you
to refresh** (a real advantage over the direct-Meta path). Just keep:

- your ManyChat **Pro** subscription active,
- the Instagram account connected (re-auth in ManyChat if you ever change your
  Instagram/Facebook password), and
- "Allow access to messages" on.

If anything lapses, verification fails **closed** — nobody is wrongly verified; people
just can't complete it until you reconnect.

---

## 7. Test it end-to-end

1. Open the site → **Find out** → type **@celestual.us** (or any account you've added
   as a ManyChat tester) → **Verify & continue**.
2. The overlay shows a 4-digit code. Tap **Copy & open Instagram** — Instagram opens
   a DM thread with @celestual.us, the code on your clipboard.
3. Paste, send. ManyChat fires the External Request; within a second or two the
   overlay flips to **Verified ✓** and the flow continues. 🎉
4. Seal a star — it records normally.
5. **Negative test:** start a verification claiming an `@` you *don't* control, then
   DM the code from a *different* account. It must **not** verify (username mismatch).

Inspect server state (SQL Editor):
```sql
select handle, token, status, igsid, expires_at
  from celestual_ig_verifications order by created_at desc limit 5;
```
And ManyChat → your automation → the External Request block shows recent
**delivery logs / response codes** for debugging.

---

## 8. Security model — what holds, and the one trade-off

**The 4-digit code is not a secret.** It's a *correlation id* linking one incoming DM
to one browser session. Ownership is decided by the **sender's username**, which
ManyChat fills from the **Meta-authenticated** contact.

| Attack | Why it fails |
| --- | --- |
| **Claim someone else's @** | In normal operation the username is `{{instagram.username}}` — the *authenticated sender's* handle, filled by ManyChat. You can't make ManyChat report a handle you don't control. |
| **Brute-force the code** | A correct guess only completes a verification whose claimed handle equals the **sender's own** username — i.e. verify *yourself*. No privilege gained. |
| **Code collision / replay** | Codes are unique among active pending sessions, single-use, and expire (~10 min). A stale/duplicate code finds no live session. |
| **Client fakes "verified"** | The verified flag is written only by `celestual_complete_ig_verification` (service-role only). The browser's RPCs are read-only; it can't flip its own status. |
| **Steal the proof from a DB dump** | Only `sha256(proof)` is stored; the raw proof lives in the browser. A leak of the table can't forge a submission. |
| **Skip the UI, call `celestual_submit`** | With enforcement on, submit requires a live verified row whose hash matches `sha256(p_proof)`. No proof → `unverified`. |
| **POST fake verifications to the function** | Rejected without the `MANYCHAT_SHARED_SECRET` (checked constant-time). |

**The one honest trade-off vs. direct Meta.** With ManyChat, the username arrives in
the request body and the request is authenticated by the **shared secret** — a
standard "trusted webhook source" model. So the secret is *load-bearing*: anyone who
obtains `MANYCHAT_SHARED_SECRET` could call the endpoint directly with a chosen
username and a code they got by starting a verification for that handle. The direct-
Meta path (Appendix A) is cryptographically stronger because it independently
**re-fetches** the username from a Meta-signed payload. Mitigate the ManyChat model
by:

- keeping `MANYCHAT_SHARED_SECRET` **only** in Supabase secrets + the ManyChat header
  (never in the browser, the repo, or logs), making it long/random, and **rotating**
  it periodically;
- relying on the start RPC's rate limits (per IP 15/hr, per handle 8/hr) which bound
  how fast codes can be minted; and
- (optional) restricting the function to ManyChat's egress if you obtain their IP
  ranges.

For typical abuse this is solid; if you need maximum assurance, use Appendix A.

**Anonymity is preserved either way:** verification only reads the sender's
**username**. We never post, follow, or read anyone's content (ManyChat may send an
acknowledgement DM only because they messaged you first), and the person you later
*enter* is never told — the [reveal model](./SECURITY.md) is untouched.

---

## 9. Scale — tens of thousands of requests

- **Relay function:** stateless, autoscaled. Each DM is one secret check + one
  indexed RPC — a few milliseconds. Verification is event-driven, not polled.
- **ManyChat:** built for high-volume DM automation; it queues and delivers the
  External Requests. (Mind its 10-second per-request timeout — we're well under.)
- **Polling:** the browser polls `celestual_poll_ig_verification` every ~2.5s only
  while the overlay is open, stopping at the ~10-min TTL — one indexed lookup on
  `(token, proof_hash)`.
- **Token space:** 4 digits = 10 000 codes, but only *pending* ones must be unique
  (a unique partial index enforces it; generation retries on the rare collision),
  and rows are pruned as they expire — so it never fills. Need more headroom? Widen
  to 6 digits in `0004` (`10000`→`1000000`, `lpad(...,4`→`6`); security doesn't depend
  on length.
- **Rate limits:** code creation is capped per IP (15/hr) and per handle (8/hr).

---

## 10. Instagram / Meta Terms compliance

- ManyChat is an **official Meta Business/Tech Partner** using the sanctioned
  Instagram Messaging API — no scraping, no unofficial endpoints, no UI automation.
- The visitor performs a normal human action (sending a DM). Any acknowledgement
  reply happens only **after** they message you, inside Meta's 24-hour window.
- We read **only** the sender's username, for the sole purpose of verification. No
  content, contacts, or graph is harvested.
- Keep a privacy policy describing this (you have `privacy@celestual.us` + the in-app
  privacy screen).

---

## 11. Secrets & flags — where each lives

| Value | Where | Exposed to browser? |
| --- | --- | --- |
| `MANYCHAT_SHARED_SECRET` | Supabase **function secret** + ManyChat request **header** | ❌ never |
| `require_ig_verification` (`celestual_settings`) | Supabase **database** | ❌ never (no client read) |
| `VITE_IG_VERIFY_ENABLED`, `VITE_IG_USERNAME` | Vercel env vars | ✅ yes (a flag + your public handle — safe) |
| Supabase **service_role** key | injected into the function only | ❌ never |

**Rule of thumb:** only `VITE_*` values are ever safe in the front-end.

---

## 12. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Can't connect Instagram in ManyChat | Account must be **professional**, linked to a **Facebook Page** you **admin**, with "Allow access to messages" on (§1–2). |
| External Request option is missing | It's a **ManyChat Pro** feature — upgrade (§2.4). |
| Function returns `401 unauthorized` | The `X-Celestual-Token` header in ManyChat doesn't match `MANYCHAT_SHARED_SECRET`. Re-paste both. |
| DMs don't verify (`no_username`/`no_code`) | The JSON body fields are wrong — re-insert `{{instagram.username}}` and `{{last_text_input}}` with ManyChat's field picker (§4.2). |
| `handle_mismatch` | Expected — the **sender's** username must equal the claimed `@`. Message from the exact account you're verifying. |
| Nothing happens on a DM | The **Default Reply** automation isn't published/enabled, or a keyword is intercepting the message first (§4.1). |
| Live users get `unverified` | You flipped enforcement on before ManyChat/front-end were live. Verify a real account first, then enforce (§5). |

---

## Appendix A — Alternative: direct Meta webhook (no ManyChat)

If developers.facebook.com works for you and you want the stronger, self-hosted
model (independent username re-fetch + signed webhooks), use the
**`celestual-ig-webhook`** function instead of `celestual-manychat`. You'll create a
Meta app with the **Instagram** product (Instagram login — still no Facebook *user*
OAuth for visitors), and set these function secrets:

| Secret | Purpose |
| --- | --- |
| `IG_APP_SECRET` | verify each webhook's `X-Hub-Signature-256` |
| `IG_VERIFY_TOKEN` | the GET subscription handshake |
| `IG_ACCESS_TOKEN` | long-lived Instagram token to re-fetch the sender's username (refresh every ~60 days) |

Then subscribe the webhook to the `messages` field. Everything else (migration `0004`,
the front-end flags, the enforcement flip) is identical. This path's security table
is the same as section 8 **minus the shared-secret trade-off** — the username is
re-fetched from Meta, not trusted from the request. The code for it is already in
`supabase/functions/celestual-ig-webhook/index.ts`.

---

## Appendix B — Bridge to the encrypted cross-device sky (optional)

Verification proves ownership but does **not** create a Supabase Auth session, so a
person's **sky persists locally** (as with the previous launch stub), not in the
encrypted database. That's intentional and matches today's behaviour. To get the
encrypted, cross-device sky later, mint a Supabase Auth session for the verified
handle (e.g. in the completion step, create/find a user keyed on the IGSID and hand
the browser a session) — `api/profile.js` switches to the DB path automatically when
a session appears. Additive, and out of scope for verification itself.

---

Back to the index: [README](../README.md) · go-live checklist:
[GO-LIVE.md](./GO-LIVE.md) · safety model: [SECURITY.md](./SECURITY.md).

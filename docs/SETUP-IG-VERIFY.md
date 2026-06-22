# CELESTUAL — Setup: Instagram DM handle verification

How to turn on **handle-ownership verification** — proving the `@` a person types
is really theirs — **without any Facebook/Instagram OAuth, login, or password.**
People prove ownership by sending a short code to your Instagram account as a DM;
Meta's official Messaging webhook tells your backend who really sent it.

> **Why this exists.** Until now CELESTUAL trusted whatever handle a person typed as
> their `from`. That was the *one remaining gap* in [SECURITY.md](./SECURITY.md):
> the slot budget and multi-account claims were keyed on an **unverified** `@`. This
> closes it — every sealed entry's "from" side becomes a real, controlled account.

This is **off by default**. Nothing breaks before you wire it; flip it on as the
final go-live step. Budget ~30–40 minutes, most of it in the Meta dashboard.

---

## TL;DR checklist

- [ ] **Your side:** an Instagram **professional** (Business/Creator) account people DM the code to.
- [ ] **Meta app** with the **Instagram** product (Instagram login — *no Facebook Page*).
- [ ] Copy three values → Supabase function **secrets**: `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN`.
- [ ] Apply migration **`0004_ig_verification.sql`**.
- [ ] Deploy the **`celestual-ig-webhook`** edge function and **subscribe it to `messages`**.
- [ ] Vercel env: `VITE_IG_VERIFY_ENABLED=1`, `VITE_IG_USERNAME=<your_ig_handle>` → redeploy.
- [ ] Flip enforcement on: `update celestual_settings set value='true' where key='require_ig_verification';`
- [ ] Test end-to-end (section 8).

---

## 0. How it works (the 60-second model)

```
  Browser                         Supabase                         Meta / Instagram
  ───────                         ────────                         ────────────────
  pick @alice ──start──▶ celestual_start_ig_verification
                          └─ issues 4-digit code, stores sha256(proof)
     ◀── code "4071" ─────┘
  Copy & open Instagram ─────────────────────────────────────────▶ user DMs "4071" to @you
                                                                          │
                          celestual-ig-webhook  ◀── signed webhook ───────┘
                            ├─ verify X-Hub-Signature-256 (app secret)
                            ├─ GET /{senderIGSID}?fields=username  ──────▶ Meta returns "alice"
                            └─ celestual_complete_ig_verification(code, igsid, "alice")
                                 └─ username == claimed handle?  ✔  → row = 'verified'
  poll(code, proofHash) ─▶ celestual_poll_ig_verification ─▶ "verified"
  seal ── proof ───────▶ celestual_submit(...,p_proof)
                            └─ celestual_consume_ig_proof → entry recorded
```

The decisive check is **`username == claimed handle`**, and the username comes from
**Meta**, fetched server-side — never from the browser or the message body.

---

## 1. Your side — an Instagram professional account

People will DM the verification code to this account, so pick the one you want to be
CELESTUAL's public Instagram (e.g. `@celestual`).

1. In the Instagram app: **Settings → Account type and tools → Switch to
   professional account** → **Business** (or Creator). It's free and reversible.
2. Note the **username** (no `@`). You'll set it as `VITE_IG_USERNAME`.

> A **professional** account is required — Meta's Messaging API doesn't deliver DMs
> for personal accounts. Nothing else about the account needs to change.

---

## 2. Your side — a Meta app with the Instagram product

You create a Meta **app** (the API gateway), but there is **no Facebook Page and no
Facebook/Instagram login for your visitors** — only you connect your own account,
once.

1. Go to **[developers.facebook.com](https://developers.facebook.com)** → **My Apps
   → Create App**.
2. Pick the use case that lets you **manage Instagram messaging**. In the current
   dashboard this is the path that adds the **Instagram** product with **"Instagram
   API setup with Instagram login."** (If asked for a business portfolio, create or
   pick one — it doesn't require a Facebook Page.)
3. In the app → **Add product → Instagram → Set up**, open **API setup with
   Instagram login** and **connect your Instagram professional account** from
   section 1.
4. That panel gives you, for that account:
   - an **Instagram access token** with the scopes
     `instagram_business_basic` and `instagram_business_manage_messages`
     (generate a **long-lived** token — see §6 on refreshing it), and
   - the account's **Instagram-scoped ID**.
   Copy the **access token** → it becomes `IG_ACCESS_TOKEN`.
5. **App secret:** **App settings → Basic → App secret** → **Show**, copy it → it
   becomes `IG_APP_SECRET` (used to verify each webhook is genuinely from Meta).
6. **Verify token:** invent any random string (e.g. `openssl rand -hex 16`) → it
   becomes `IG_VERIFY_TOKEN` (a shared secret for the webhook subscription
   handshake; you choose it).

> **App Review / Live mode.** While your app is in **Development**, only Instagram
> accounts you add as **app roles/testers** can be verified. To verify the public,
> your app needs **Live** mode and Meta approval for
> `instagram_business_manage_messages`. Plan for Meta's review (screencast of this
> exact flow + your privacy policy). Until then, test with tester accounts.

---

## 3. Supabase — apply the migration

Adds the verification tables + RPCs, and extends `celestual_submit` to (optionally)
require ownership. It's idempotent and safe to re-run.

**SQL Editor:** paste and run
[`supabase/migrations/0004_ig_verification.sql`](../supabase/migrations/0004_ig_verification.sql).
**CLI:** `supabase db push`.

It creates `celestual_ig_verifications` (the codes/proofs), `celestual_settings`
(the enforcement flag, seeded **off**), the public RPCs
`celestual_start_ig_verification` / `celestual_poll_ig_verification`, the
service-role-only `celestual_complete_ig_verification`, and the internal gate
`celestual_consume_ig_proof` that `celestual_submit` now calls. Every table has RLS
on with **no policies** — clients can't read any of it.

---

## 4. Supabase — deploy the webhook function

1. Set the function **secrets** — Supabase → **Edge Functions → Secrets** (or
   `supabase secrets set KEY=value`):

   | Secret | Value |
   | --- | --- |
   | `IG_APP_SECRET` | the app secret from §2.5 |
   | `IG_VERIFY_TOKEN` | the random string from §2.6 |
   | `IG_ACCESS_TOKEN` | the long-lived Instagram token from §2.4 |
   | `IG_GRAPH_VERSION` | *(optional)* Graph version, default `v21.0` |
   | `IG_CONFIRM_DM` | *(optional)* `1` to DM "you're verified ✦" back |

   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

2. Deploy:
   ```bash
   supabase functions deploy celestual-ig-webhook
   ```
   Its public URL is
   `https://<your-project-ref>.functions.supabase.co/celestual-ig-webhook` — you'll
   need it next.

---

## 5. Meta — subscribe the webhook to `messages`

1. In your Meta app → the **Instagram** product → **Webhooks** (some dashboards show
   this under **App → Webhooks → Instagram**).
2. **Callback URL:** the function URL from §4.2.
   **Verify token:** the same `IG_VERIFY_TOKEN`.
   Click **Verify and save** — Meta does a `GET` handshake the function answers.
3. Under the Instagram object, **Subscribe** to the **`messages`** field.
4. Make sure your **Instagram account is subscribed to the app** for messaging (the
   API-setup panel has a "subscribe" / connected-account step). Without this, Meta
   won't deliver DMs.

> **In Instagram → Settings → Messages and story replies → Connected tools**, the
> "Allow access to messages" toggle must be **on** for your app to receive DMs.

---

## 6. Keep the access token alive

Long-lived Instagram tokens last **~60 days**. Refresh before expiry (any time the
token is ≥24h old) so the webhook can keep reading usernames:

```bash
curl "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$IG_ACCESS_TOKEN"
# → { "access_token": "…", "expires_in": 5183944 }   # store the new token as IG_ACCESS_TOKEN
```

Automate it (a monthly pg_cron job hitting a tiny refresh function, or a calendar
reminder). If the token ever lapses, verification fails **closed** — nobody is
wrongly verified; people just can't complete it until you refresh.

---

## 7. Front-end — turn it on

In **Vercel → Settings → Environment Variables** (and `app/.env.local` for local
dev):

```
VITE_IG_VERIFY_ENABLED=1
VITE_IG_USERNAME=your_ig_handle      # no @, the account from section 1
```

**Redeploy.** Now the "this is you" step asks people to **Verify & continue**, which
opens the in-tab code overlay — no popup, no redirect, the in-progress entry is
never lost.

### Flip enforcement on (the loophole-closing step)

The front-end gate is UX; the **server** is the authority. Until you flip this, a
crafted direct RPC call could still submit an unverified `from`. Turn it on:

```sql
update celestual_settings set value = 'true', updated_at = now()
 where key = 'require_ig_verification';
```

From now on `celestual_submit` **rejects** any entry whose `from` handle hasn't been
proven (returns `{ recorded:false, error:'unverified' }`). To roll back, set it to
`'false'`.

> **Order matters:** deploy the webhook and front-end *first*, confirm a real
> verification works, *then* flip enforcement — otherwise live users hit
> `unverified` before they can verify.

---

## 8. Test it end-to-end

1. Open the site → **Find out** → type **your own** professional account's `@` →
   **Verify & continue**.
2. The overlay shows a 4-digit code. Tap **Copy & open Instagram** — Instagram opens
   to a DM thread with your account, code on the clipboard.
3. Paste the code, send. Within a second or two the overlay flips to **Verified ✓**
   and the flow continues. 🎉
4. Seal a star — it records normally.
5. **Negative test:** start a verification claiming an `@` you *don't* control, then
   DM the code from a *different* account. It must **not** verify (username
   mismatch). With enforcement on, sealing as an unproven `@` returns `unverified`.

Inspect server state (SQL Editor):
```sql
select handle, token, status, igsid, expires_at
  from celestual_ig_verifications order by created_at desc limit 5;
```

---

## 9. Security model — why this has no loopholes

**The 4-digit code is not a secret.** It's a *correlation id* linking one incoming
DM to one browser session. Security rests entirely on the DM's **sender identity**,
which Meta authenticates and which we **re-fetch from the Graph API** server-side.

| Attack | Why it fails |
| --- | --- |
| **Claim someone else's @** (`@victim`) | The DM must come from an account whose Meta username is `victim`. The attacker can't send a DM *as* `@victim`. A guessed code only ever names a session; it can't change who sent the message. |
| **Brute-force the code** | Even a correct guess only completes a verification whose claimed handle equals the **sender's own** username — i.e. verify *yourself*, which you could do anyway. No privilege is gained. |
| **Code collision** (two people, same code) | Codes are unique among *active pending* sessions (DB index), and completion still requires username == handle, so a collision is a benign retry, never a cross-verify. |
| **Replay an old DM / screenshot** | Codes are single-use and expire (~10 min pending). A replayed code finds no pending session. |
| **Forge the webhook** | Every POST is checked against `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with your app secret). No valid signature → rejected. |
| **Client fakes "verified"** | The `verified` flag is written **only** by `celestual_complete_ig_verification` (service-role-only) after a Meta-authenticated DM. The browser's RPCs are read-only; it can't flip its own status. |
| **Steal the proof from a DB dump** | Only `sha256(proof)` is stored. The raw `proof` lives in the browser (like an auth token); a leak of `celestual_ig_verifications` can't forge a submission. |
| **Skip the UI, call `celestual_submit` directly** | With enforcement on, submit calls `celestual_consume_ig_proof`, which requires a live verified row whose stored hash matches `sha256(p_proof)`. No proof → `unverified`. |

**The proof secret.** The browser mints a random 256-bit `proof` at *start* and
sends only its SHA-256 hash. The server stores the hash; the browser keeps the
secret and presents it at *seal* time, where the server re-hashes and matches. So
the server — not the client — is the authority on "is this handle verified."

**Anonymity is preserved.** Verification only reads the **username** of whoever
sends the code. We never post, follow, message (unless you opt into the confirmation
DM), or read anyone's content, and the person you later *enter* is never told — the
[deferred/instant-reveal model](./SECURITY.md) is untouched.

---

## 10. Scale — tens of thousands of requests

- **Webhook:** stateless, autoscaled. Each DM is one signature check, one Graph
  read, one indexed RPC — a few milliseconds. Verifying instantly is webhook-driven,
  not polled.
- **Polling:** the browser polls `celestual_poll_ig_verification` every ~2.5s only
  while the overlay is open, and stops at the ~10-min TTL. The RPC is a single
  indexed lookup on `(token, proof_hash)`.
- **Token space:** 4 digits = 10 000 codes, but only **pending** ones must be unique
  (a unique partial index enforces it; generation retries on the rare collision).
  Concurrent pendings ≈ rate × 10 min — comfortably small. Rows are pruned as they
  expire, so the space never fills. If you ever want more headroom, widen to 6
  digits in `0004` (change `10000`→`1000000` and `lpad(...,4`→`6`) — security doesn't
  depend on the length.
- **Rate limits:** code creation is capped per IP (15/hr) and per handle (8/hr),
  reusing `celestual_attempts`. The existing per-IP/from/to submit caps still apply.
- **Connections:** use Supabase's pooled connection string for the functions under
  load; the webhook does tiny, short transactions.

---

## 11. Instagram / Meta Terms compliance

- Uses the **official Instagram Platform Messaging API + webhooks** — no scraping, no
  automation against the UI, no unofficial endpoints.
- The visitor performs a normal human action (sending a DM). We **do not** auto-DM
  them first (the optional confirmation reply only fires *after* they message us,
  inside Meta's 24-hour window, and is off by default).
- We request the **minimum** permission (`instagram_business_manage_messages`) and
  read **only** the sender's username. No content, contacts, or graph is harvested.
- Keep a privacy policy describing this (you have `privacy@celestual.us` and the
  in-app privacy screen) for App Review.

---

## 12. Secrets & flags — where each lives

| Value | Where | Exposed to browser? |
| --- | --- | --- |
| `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN` | Supabase **function secrets** | ❌ never |
| `require_ig_verification` (`celestual_settings`) | Supabase **database** | ❌ never (no client read) |
| `VITE_IG_VERIFY_ENABLED`, `VITE_IG_USERNAME` | Vercel env vars | ✅ yes (a flag + a public handle — safe) |
| Supabase **service_role** key | injected into the function only | ❌ never |

**Rule of thumb:** only `VITE_*` values are ever safe in the front-end. The app even
shipping `VITE_IG_USERNAME` is fine — it's just your public Instagram handle.

---

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Webhook "Verify and save" fails | The function isn't deployed, the URL is wrong, or `IG_VERIFY_TOKEN` differs between Meta and the secret. The function answers the `GET` handshake only when they match. |
| DMs never verify (`no_username` in logs) | `IG_ACCESS_TOKEN` is missing/expired, or lacks `instagram_business_manage_messages`. Refresh it (§6). |
| DMs never arrive at the function | The account isn't subscribed to the app, the `messages` field isn't subscribed, or "Allow access to messages" is off in Instagram (§5). |
| Verifies the wrong way / mismatch | Expected — the **sender's** Meta username must equal the claimed `@`. Message from the exact account you're verifying. |
| `401 bad_signature` in logs | `IG_APP_SECRET` is wrong, or something is re-encoding the body. It must be the app's secret and the raw body. |
| Live users get `unverified` | You flipped enforcement on before the webhook/front-end were live. Verify a real account first, then enforce (§7). |
| Only your own accounts verify | The Meta app is still in **Development** — add testers or go **Live** with App Review (§2). |
| Token keeps expiring | Long-lived tokens are ~60 days — automate the refresh (§6). |

---

## 14. Optional — bridge to the encrypted cross-device sky

Verification proves ownership but does **not** create a Supabase Auth session, so
(as with the previous launch stub) a person's **sky persists locally**, not in the
encrypted database. That's intentional and matches today's shipping behaviour.

If you later want the encrypted, cross-device sky (`celestual_profiles`, gated on
`auth.uid()`), mint a Supabase Auth session for the verified handle: in
`celestual_complete_ig_verification` (or a follow-on service-role step) create/find
a user keyed on the IGSID and hand the browser a session (e.g. via
`auth.admin.generateLink` / a signed one-time token). The front-end already adopts a
Supabase session anywhere it appears — `api/profile.js` switches to the DB path
automatically. This is additive and out of scope for verification itself.

---

Back to the index: [README](../README.md) · go-live checklist:
[GO-LIVE.md](./GO-LIVE.md) · safety model: [SECURITY.md](./SECURITY.md).

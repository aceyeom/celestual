# CELESTUAL — Instagram verification: scaling, OAuth, and the "only the first DM arrives" fix

This is the strategy note behind the July 2026 verification work. It answers four
questions in order:

1. **Why does the webhook only fire on an account's *first* DM?** (the bug)
2. **Does the DM-webhook architecture scale to thousands of users?**
3. **What is the official Instagram Login (OAuth 2.0) process — and do we still need ManyChat?**
4. **What other flaws are adding friction, and what's the plan?**

The short version: the DM path has a **structural ceiling** that no amount of code can
lift — while the Meta app is in Development mode it *cannot* verify strangers at all,
and once Live, stranger DMs route through Instagram's **message-requests** folder,
which only delivers reliably after you reply once. We've shipped a fix that makes the
webhook always reply (so threads get accepted and later DMs arrive), **and** we've
built the real scale answer: **Instagram Login (OAuth 2.0)** — a direct login that
proves handle ownership with no DM, no message-requests folder, no Facebook Page, and
**no ManyChat**. Adopt OAuth as the primary path; keep the (now-fixed) DM path as the
fallback.

---

## 1. Why "only the first DM from an account" verifies — the root cause

Your report: an account DMs `@celestual.us`, it verifies; that same account DMs again
later (a re-verify, a retry, a second device) and **the webhook never fires**. This is
not your code — it's how Instagram routes messages, compounded by one gap in ours.

**Three compounding causes:**

1. **The message-requests folder (the big one).** A person who doesn't follow
   `@celestual.us` is a *stranger* to it, so their DM lands in **Requests**, not the
   general inbox. Meta delivers a webhook for that **first** message, but the thread
   stays "pending acceptance" until the business **replies once**. Instagram does
   **not** reliably deliver webhooks for a stranger's *later* messages while the thread
   sits unaccepted. A reply is what moves the thread into the general inbox and opens
   it. ([Meta: Webhooks for Instagram Messaging](https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook/),
   [Meta: Instagram messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/))

2. **Our webhook wasn't always replying.** The old `celestual-ig-webhook` replied only
   on a *successful* verification, and only when `IG_CONFIRM_DM ≠ 0`. So a first contact
   that wasn't an instant success — a typo'd code, a bare "hi", a Graph read that briefly
   failed, **or the operator setting `IG_CONFIRM_DM=0` to avoid double-DMs when running
   ManyChat too** — got **no reply**, the thread stayed in Requests, and the person's
   re-send silently never webhooked. That is exactly "works once per account, then never
   again."

3. **Development mode.** While the Meta app is in **Development**, Instagram fires
   messaging webhooks **only** for accounts that hold a role on the app (Admin /
   Developer / Tester). Real users' DMs never webhook at all until the app passes **App
   Review** and goes **Live**. In testing this looks like "only *my* account works."

### What we shipped for the DM path

`celestual-ig-webhook` now sends **exactly one reply to every inbound it processes** —
success, mismatch, expired, unknown code, no code, even an unreadable sender — unless
replies are globally disabled (`IG_CONFIRM_DM=0`). That first reply **accepts the
thread out of Requests**, so Instagram keeps delivering the sender's later DMs. This
removes cause #2 for the direct-webhook path. Causes #1 and #3 are Meta's, and the only
true fixes are **replying** (now automatic) and **going Live** (App Review) — or
sidestepping DMs entirely with OAuth (§3).

> If you run **both** the direct webhook and ManyChat, keep exactly one of them owning
> replies (set `IG_CONFIRM_DM=0` on the webhook and let ManyChat's automation reply), so
> a thread still gets accepted but nobody gets two DMs. If you run **only** the direct
> webhook, leave replies on (the default).

---

## 2. Does the DM-webhook architecture scale to thousands of users?

**Not as the primary path.** The bottlenecks aren't your Postgres or the edge function —
they're Meta's messaging platform and the single-inbox design:

| Ceiling | What it means at thousands of users |
| --- | --- |
| **Development-mode wall** | Hard blocker. In Dev mode only ~25 role-holding testers can verify at all. You must pass **App Review** for the messaging permission and go **Live** before a single stranger can verify by DM. |
| **Message-requests routing** | At scale *almost every* verifier is a non-follower, so *almost every* verification starts in Requests and depends on the accept-reply working every time. Fragile by construction. |
| **Single-inbox chokepoint** | Every verifier DMs one account. Sending is capped at **100 text messages/second per Instagram professional account** and, in practice, tools pace to **~200 DMs/hour** to avoid anti-spam throttling. Thousands of simultaneous verifications serialize through that one inbox. ([rate limits](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026)) |
| **Graph API read limits** | Each DM verification does a `GET /{igsid}?fields=username` lookup, which counts against the Business-Use-Case budget (~**200 calls/user/hour** class limits). Bursty verification traffic can throttle; you'd need backoff + queueing. |
| **60-day token expiry** | `IG_ACCESS_TOKEN` lapses every ~60 days. Silent, total breakage unless you run a refresh job. |
| **ManyChat cost + limits** | If DMs relay through ManyChat, its pricing scales with **contacts**; thousands of verifiers = real monthly cost, plus ManyChat's own send caps and trigger-config traps. |

**OAuth has none of these inbox-shaped limits.** It's a standard web redirect: no
Requests folder, no per-inbox send cap, no ManyChat. Its only gate is a **one-time App
Review** of the low-risk `instagram_business_basic` scope, and its throughput is bounded
only by ordinary OAuth endpoint limits — comfortably into the thousands and beyond.

---

## 3. Official Instagram Login (OAuth 2.0) — the process, and ManyChat

**"Instagram API with Instagram Login"** (launched 2024) lets a person authorize your
app **directly with Instagram**. It replaced the deprecated Basic Display API and, unlike
the older "Instagram API with **Facebook** Login," it needs **no linked Facebook Page** —
just an Instagram **professional** (Business or Creator) account.
([Meta docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/),
[no Page required](https://developers.facebook.com/docs/instagram-platform/overview/))

### The flow (what we implemented — see `docs/IG-OAUTH-SETUP.md`)

```
  browser                         Instagram / Meta                celestual-ig-oauth (edge fn)
  ───────                         ────────────────                ───────────────────────────
  mint proof + call
  celestual_start_ig_oauth  ───▶  (get a random `state`)
  redirect to consent  ─────────▶ www.instagram.com/oauth/authorize
                                  ?client_id&redirect_uri&response_type=code
                                  &scope=instagram_business_basic&state=…
       user approves ──────────▶  Instagram redirects back with ?code&state ──────────────▶ this fn
                                                                  POST api.instagram.com/oauth/access_token
                                                                    (code → short-lived token + user_id)
                                                                  GET graph.instagram.com/me?fields=username
                                                                    (the authoritative username)
                                                                  celestual_complete_ig_verification(state, …)
                                                                    (SAME check as the DM path:
                                                                     real username == claimed @)
  poll state → 'verified'  ◀───── postMessage / redirect back ◀───────────────────────────┘
  seal with the same proof
```

- **Authorize:** `GET https://www.instagram.com/oauth/authorize` with `client_id`,
  `redirect_uri`, `response_type=code`, `scope=instagram_business_basic`, `state`.
- **Token exchange:** `POST https://api.instagram.com/oauth/access_token` (form body:
  `client_id, client_secret, grant_type=authorization_code, redirect_uri, code`) →
  `{ access_token, user_id }`.
- **Read identity:** `GET https://graph.instagram.com/me?fields=user_id,username` → the
  real `username`. That IS the proof of ownership.
- **Scopes:** only `instagram_business_basic` (read profile). You do **not** need the
  messaging scopes for verification.

### App Review

To serve users who aren't testers, `instagram_business_basic` needs **Advanced Access**
via **App Review** — a lighter review than the messaging permissions. Note the DM path
*also* needs App Review (`instagram_business_manage_messages`) to leave Dev mode, so
OAuth doesn't add review burden; if anything it's the easier approval.

### Do you still need ManyChat? **No.**

ManyChat exists in this codebase for exactly one reason: it's a **relay for inbound
DMs** — it owns the Instagram connection and forwards the verification DM to
`celestual-manychat` so you don't need your own Meta app/webhook. **OAuth has no DM to
relay.** It's a first-party Meta integration end to end. Adopting OAuth means:

- **No ManyChat** (no Pro subscription, no automation triggers, no per-contact cost).
- **No inbound webhook** for verification (`celestual-ig-webhook` / `celestual-manychat`
  become fallback-only, or retire once OAuth is Live).
- You *would* still need ManyChat/messaging **only** if you want to send outbound DMs for
  some *other* feature — which CELESTUAL doesn't.

---

## 4. Other flaws adding friction (and what each needs)

| # | Friction / flaw | Fix |
| --- | --- | --- |
| 1 | **The copy-code + app-switch dance.** Read a code, switch to IG, find the account, DM, switch back — heavy drop-off. | OAuth: one tap, one consent, done. Shipped, flag-gated. |
| 2 | **Requests-folder delivery** (see §1). | Webhook now always replies (shipped); OAuth removes it entirely. |
| 3 | **Development-mode wall** — can't verify real users at all. | App Review → Live (required for *any* path to serve strangers). |
| 4 | **Desktop is clunky** — `ig.me` is mobile-only; desktop falls back to `www.instagram.com/m/…` and requires being logged in. | OAuth is a normal desktop popup — no deep-link gymnastics. |
| 5 | **60-day `IG_ACCESS_TOKEN` expiry** silently breaks the DM webhook. | Run a token-refresh job, or move off the DM path to OAuth. |
| 6 | **10-minute code TTL races** — slow users hit `expired`. | OAuth has a 15-min round-trip window and no copy step to be slow at. |
| 7 | **Multi-account phones** — the DM goes from the wrong logged-in account → `handle_mismatch`. | OAuth verifies whichever account actually authorizes; mismatch is caught immediately with a clear message, not a silent failure. |
| 8 | **ManyChat as a single point of failure** + its Default-Reply-once-per-24h trap (documented in `MANYCHAT-SETUP.md`). | OAuth removes the dependency. |
| 9 | **Silent outbound-reply failures** left threads stuck in Requests. | Webhook now checks the reply's HTTP status and logs failures (shipped). |

---

## 5. Recommended migration path

1. **Now — deploy the DM fix.** `supabase functions deploy celestual-ig-webhook`. This
   stops the "only the first DM" bleed on the existing path immediately, no Meta changes
   needed.
2. **Now — apply migration `0011_ig_oauth.sql`.** Additive; adds one RPC, touches nothing
   existing.
3. **Set up Instagram Login** (`docs/IG-OAUTH-SETUP.md`): configure the app, deploy
   `celestual-ig-oauth`, set the four secrets, add the front-end env vars, flip
   `VITE_IG_OAUTH_ENABLED=1`. The verify sheet then offers **"Continue with Instagram"**
   above the code, with the DM code as the fallback beneath it.
4. **Submit for App Review** on `instagram_business_basic` and go **Live**. This is the
   step that unlocks real users at scale — for OAuth *and* for the DM fallback.
5. **Once OAuth is Live and healthy**, demote the DM path to a true fallback (or retire
   ManyChat). Keep the webhook configured but secondary — platform risk is real, and a
   working second path is cheap insurance (`docs/SECURITY.md`, "Meta platform risk").

Throughout, the **security model is unchanged**: the browser mints a 256-bit `proof` and
holds it; the server stores only its hash; verification flips a row to `verified` **only**
when Meta's authenticated username equals the claimed handle; sealing consumes the proof.
OAuth reuses the exact same `celestual_complete_ig_verification` / `celestual_poll_ig_verification`
path — it just delivers Meta's authenticated username by login instead of by DM.

---

## Sources

- [Webhooks for Instagram Messaging — Meta for Developers](https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook/)
- [Instagram messaging API (Instagram Login) — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/)
- [Instagram API with Instagram Login (overview) — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Business Login for Instagram — Meta for Developers](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Instagram API rate limits (2026) — Phyllo](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026)
- [Instagram DM automation stops working — CreatorFlow](https://creatorflow.so/blog/instagram-automation-stopped-working-fix/)

Back to: [DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md) · [MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) ·
[IG-OAUTH-SETUP.md](./IG-OAUTH-SETUP.md) · [SECURITY.md](./SECURITY.md) ·
[supabase/README.md](../supabase/README.md)

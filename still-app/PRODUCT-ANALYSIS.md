# CELESTE — Product Logic & Engineering Teardown

> A consultant-style teardown of the product **as it actually exists in the code today**,
> not as the pitch describes it. The goal is not to praise the idea but to **walk its
> logic step by step, find where it breaks, and propose a deep, evaluated fix for every
> break** — including the brand-new failures that the previous memo never caught because
> they only appeared once the app was built.
>
> **Method for each issue:** Observation (grounded in a file/line) → Why it matters →
> Stress test (where it fails) → Proposed solution → Evaluation (cost / tradeoff / what it
> does *not* fix). Nothing here is implemented; this document is the deliverable.
>
> Companion file: **[`MARKET-ANALYSIS.md`](./MARKET-ANALYSIS.md)** — the external/competitive/
> regulatory research this memo leans on for §3 and §10.

---

## 0. What CELESTE actually is (grounding from the code, not the pitch)

Reconstructed from the source as of this commit:

- **Brand:** the live product is now **CELESTE** (`still-app/README.md:1`), but the
  database objects, edge function, email template, footer copy, and half the repo still
  say **STILL.** (`supabase/functions/still-notify/index.ts:29`, `0006_still.sql`). The
  product has **two names in one shipping surface.** (See §2.1.)
- **Flow** (`src/App.jsx`, `src/components/screens.jsx`): landing → **you** (email
  emphasized, then your handle) → **them** (the one @) → **sendoff** (≥3.2 s suspense
  animation) → `match` | `resting`. State persists in `localStorage` under key
  `celeste:v1` (`App.jsx:41,81`).
- **The one call** (`src/api/still.js` → `still_submit` RPC, `supabase/migrations/0006_still.sql`,
  hardened in `0007_still_safety.sql`): a user records a *directed* entry `from → to`,
  optionally with an email. If the reverse entry `to → from` already exists, the pair is
  mutual; both directed rows are stamped, one `still_matches` row is written, and an email
  is queued **only to the earlier entrant** (`0007:142-146`).
- **Privacy model:** clients have zero table access (RLS on, no policies, grants revoked).
  The only door is the `SECURITY DEFINER` RPC, which returns just `{ matched: true|false }`
  for *your* pair. One-sided entries are "never revealed."
- **Safety so far** (`0007_still_safety.sql`): per-IP (40/hr) and per-`from_handle` (20/hr)
  rate limits, and the anti-exfiltration rule (never email the address supplied on the
  triggering request). Both are partial — see §4.
- **Monetization:** the Pricing screen advertises "first free · $2.99 per extra person"
  (`screens.jsx:289-333`). **There is no payment code anywhere in the repo.** `checkAnother()`
  (`App.jsx:136`) simply routes back to the `them` screen. Every "extra person" is currently
  free. The business model is copy, not software. (See §2.2.)
- **Growth model:** a share button (on `resting`) and word of mouth. Nothing else.

The whole product still rests on **one assumption**: *two specific people will, independently,
each type the other's handle into an obscure website.* Everything below pressure-tests that
assumption, the safety claim that wraps it, and — new this round — **the gap between what the
UI promises and what the code does.**

---

## 1. How to read this memo

Issues are grouped by how badly they block a real launch:

| Tier | Meaning |
|---|---|
| **P0 — Blocks launch** | Ships a lie, a legal exposure, or a safety hole that can hurt a real person. Do before any paid marketing. |
| **P1 — Core mechanic** | The product technically "works" but the core loop leaks value or fails silently. Fix before scaling spend. |
| **P2 — Growth / depth** | Levers on liquidity, retention, monetization. Valuable once P0/P1 are solid. |
| **P3 — Right thing / polish** | Correctness, hygiene, and good-citizen items. |

A running theme: **the previous memo's #1 recommendation — handle-ownership verification —
was never built.** It is still the keystone. Most P0/P1 items below either *are* that fix or
are *blocked on* it.

---

## 2. P0 — Things that block a launch

### 2.1 The product ships under two names — **brand integrity**
- **Observation.** The UI says CELESTE (`README.md:1`, `Brandmark`), the emails say
  "STILL." (`still-notify/index.ts:29-31,55`), the footer of the email says "you entered an
  @ on STILL." A matched user gets an email from a brand they never saw.
- **Why it matters.** The single highest-stakes touchpoint — the mutual-match email, the one
  moment the product delivers its payoff to someone who already left — arrives from an
  unknown sender ("STILL.") for a site they used as "CELESTE." It reads like phishing.
  Spam filters and humans both punish that mismatch, and the *entire payoff for the absent
  side depends on this email landing and being trusted.*
- **Stress test.** Half the marketing funnel (the email) actively undermines the other half.
  A user who shared "CELESTE" gets a friend asking "what's STILL.?" — the viral loop trips
  over its own name.
- **Proposed solution.** Pick one name and make it total. If CELESTE: rebrand the email
  template, subject line, `FROM` env default, and footer; leave the SQL object names
  (`still_*`) alone (they're invisible to users and renaming a live table is risk for no
  user benefit), but document the divergence in one place. Add a build-time check or a
  single `BRAND` constant the email function imports.
- **Evaluation.** Effort **S**. Pure win, no tradeoff. The only "cost" is deciding the name —
  which is a founder call, not an engineering one. Do not skip this as cosmetic: it sits on
  the revenue/retention path.

### 2.2 Monetization is a UI mockup, not a product — **ships a false promise**
- **Observation.** Pricing copy (`screens.jsx:323-325`) states "Each extra person — $2.99."
  `checkAnother()` (`App.jsx:136-141`) clears `them`, resets `matched`, and navigates. There
  is **no checkout, no Stripe/Toss/KakaoPay, no entitlement check, no server-side gate.** A
  grep for `stripe|checkout|payment|toss|kakaopay` across `still-app/` returns nothing.
- **Why it matters.** Two distinct failures: (a) **revenue is $0 by construction** — the
  business model doesn't exist in code; (b) **the price screen is a claim you don't honor.**
  Telling users they'll be charged $2.99 and then silently not charging is a small lie today,
  but the moment you *do* wire up billing, every analytics/forecast built on the current
  funnel is fiction because nobody has ever actually hit a paywall.
- **Stress test.** Worse: if you bolt on payment client-side only (a Stripe button that, on
  success, calls `checkAnother`), the gate is trivially bypassed — `still_submit` has no
  notion of entitlement, so anyone can call the RPC directly and submit unlimited pairs for
  free. The paywall would be **cosmetic and bypassable** unless enforced in the RPC.
- **Proposed solution (server-enforced from day one).**
  1. Decide the *unit*. "$2.99 per extra person" is an impulse-purchase model; the cleaner,
     higher-LTV unit is a small **pack of credits** ("3 more for $4.99") or a **$3.99/mo
     'watch as many as you want + instant notify'** subscription (see MARKET-ANALYSIS §
     monetization — NGL/Gas precedent favors subscription + a premium *reveal-speed* tier
     over per-action micro-charges).
  2. Enforce in the backend: introduce a lightweight identity/session token (the same one
     §2.3 needs for ownership), track entries-consumed and entitlements server-side, and have
     `still_submit` reject an over-quota free user with `{ error: 'payment_required' }`.
  3. Use **KakaoPay/Toss** if Korea-first, **Stripe** if global (MARKET-ANALYSIS § Korea).
- **Evaluation.** Effort **L** (payment + entitlement + identity are entangled). Tradeoff: a
  hard paywall reduces the *breadth* that drives liquidity (§3.2). Recommendation: keep the
  **reveal always free** (as the copy promises) and keep the **first 1–3 entries free** to
  protect virality, monetize only *additional breadth* and *speed*. Until billing exists,
  **change the copy** so the app stops promising a price it won't take — "early access: free
  while we're small" is honest and buys time. Do not launch paid ads against a $0 funnel.

### 2.3 No handle-ownership verification — the prober/impersonation hole (still open) — **safety-critical**
- **Observation.** `still_submit(p_from, p_to)` lets *anyone* claim to be *any* `from`. There
  is no identity. This was the previous memo's P0; `0007` added rate limits and email-exfil
  protection but explicitly leaves the core open (`0007:18-23`, README "Safety").
- **Why it matters.** To learn the secret "did Y enter X?", an attacker submits `from=X,
  to=Y`. If Y had privately entered X, the on-screen result is `matched: true` — the attacker
  has read someone else's one-sided, supposedly-secret feeling **without owning either
  handle.** The headline promise ("invisible unless they enter you back," `screens.jsx:164`)
  holds against a *passive* observer, not an *active prober*. For a "does my ex still think
  about me" tool, the prober is precisely the controlling-ex persona the product must design
  *against* (see §3, MARKET-ANALYSIS § stalking/T&S).
- **Stress test.** Rate limits (§4) slow a *wide sweep* but do nothing against a *targeted*
  prober checking one or two specific victims, which is the abuse case that actually hurts.
  And the per-`from_handle` limit is evadable (§4.1), so even the sweep defense is soft.
- **Proposed solution.** Bind a handle to a session before any reveal that involves it.
  Cheapest credible path, in order:
  1. **One-time code via Instagram DM/login is infeasible without Meta APIs.** Instead, use
     **Instagram OAuth (Meta Login)** to prove the *submitter* owns `from`. A match only
     "counts" / reveals / emails when **both** sides are ownership-verified handles.
  2. If OAuth friction is too high for the funnel, fall back to a **deferred-reveal** model:
     an unverified submission is *recorded* but never returns `matched:true` live and never
     emails; the reveal is delivered only through a **verified channel the owner controls**
     (the verified email magic-link in §2.4, or post-hoc OAuth). This removes the
     instant-confirmation oracle that makes probing useful.
  3. At absolute minimum (if neither ships pre-launch): **never return `matched:true`
     synchronously.** Always answer "we'll tell you if it's mutual" and deliver the yes only
     via the owner-controlled channel. This alone defangs the prober, because the prober
     never gets a live signal tied to a handle they don't control.
- **Evaluation.** Effort: OAuth **L**, deferred-reveal **M**, kill-synchronous-yes **S**.
  Tradeoff: OAuth dents conversion (a known funnel tax — MARKET-ANALYSIS § virality) but is
  the only *complete* fix and simultaneously unlocks the best features (multi-entry §6.1,
  "someone entered you" counts §6.3, server-enforced billing §2.2). The S-tier
  kill-synchronous-yes is the highest-leverage single change in this memo: it closes the
  oracle at the cost of the instant on-screen "it's mutual!" dopamine — which is real
  product loss, but the safety win dominates for launch. **Recommendation: ship the S-tier
  mitigation immediately, OAuth as the funded fix.**

### 2.4 The match can be permanently silent — the payoff leaks away — **core value lost**
- **Observation.** A mutual match emails only the **earlier** entrant, and only **if they
  supplied an email** (`0007:142-146`). The live submitter sees it on screen. So: if the
  earlier entrant gave no email, **they are never told** — the match exists in the database
  and dies there. If the live submitter closes the tab before the reveal renders, only
  `localStorage` saves them (§4.3), and only on the same device/browser.
- **Why it matters.** The emotional climax — the *entire point* — can happen and reach
  nobody. For the absent side, the email is the only bridge, and it's optional and
  unverified.
- **Stress test.** The privacy-cautious crowd this app attracts (the people most likely to
  *not* give an email) are exactly the people whose matches go silent. The product's payoff
  rate is gated by its least-trusting users' willingness to hand over contact info up front.
- **Proposed solution.** A **frictionless, verified "remember me" channel** that doubles as
  the ownership proof (§2.3): a one-tap email magic-link ("we'll only use this to tell you if
  it's mutual; click to confirm it's you"). Verifying the email at capture (a) makes it a
  trustworthy notification vector, (b) provides a lightweight ownership signal, (c) lets the
  reveal be *deferred* safely. Make the value unmistakable on the `resting` screen: "Leave a
  verified email or you may never hear back." Consider Web Push as a no-email fallback.
- **Evaluation.** Effort **M**. This is the single best fix for the payoff problem and it
  composes with §2.3. Tradeoff: email verification adds a step; mitigate by making it
  *post-seal* (verify while the suspense animation plays) so it doesn't gate the magic
  moment. Does **not** fix the cold-start problem (§3.2) — it only ensures that the rare
  match, when it happens, actually lands.

### 2.5 Processing a non-consenting third party's data — **legal exposure**
- **Observation.** Every entry stores a *second person's* Instagram handle (`to_handle`,
  `raw_to`) — someone who never used the app, never consented, and whom the app links to an
  inferable romantic/sexual interest. Stored in plaintext (§4.2). No privacy policy, ToS,
  consent flow, or erasure path exists in the repo.
- **Why it matters.** Under GDPR this is processing personal data of a data subject with **no
  lawful basis and no notice**, and the inference ("X is an object of Y's romantic longing")
  plausibly touches **Article 9 special-category data** (data concerning sex life /
  orientation). Korea's **PIPA** treats this as sensitive information requiring explicit
  consent. The third party has **access and erasure rights** over data they don't know
  exists. (Full analysis: MARKET-ANALYSIS § GDPR/PIPA.)
- **Stress test.** A single "what do you have on me / delete it" request from a non-user you
  can't authenticate is operationally and legally awkward, and a regulator-friendly headline
  ("app secretly logs who you have a crush on") writes itself.
- **Proposed solution.** (1) **Data minimization:** store a salted **hash** of handles for
  matching, not plaintext (§4.2), so the raw "who-likes-whom" graph isn't sitting readable.
  (2) Publish a **privacy policy + ToS** stating purpose, retention, and rights, with a
  **public erasure/suppression endpoint** ("remove my handle / block my handle from ever
  being entered"). (3) **Auto-expire** entries (e.g. 90 days) so the standing corpus of
  third-party data shrinks. (4) Geo-gate or add a consent interstitial for EU/EEA/Korea until
  compliant. (5) Get counsel review before EU/Korea marketing.
- **Evaluation.** Effort **M** (hashing + expiry + policy pages) plus **legal review**
  (external). Tradeoff: hashing handles complicates features that need the raw handle (typo
  suggestions §5.3, displaying the @ back). Keep a **reversible-by-owner** path only for the
  verified owner's *own* handle; everything about the *other* person stays hashed. This is
  not optional polish — it's the difference between "novelty app" and "data-protection
  incident."

### 2.6 A fake "demo · see a match" button ships to real users — **deceptive-pattern risk**
- **Observation.** The `resting` screen renders a live button "demo · see a match"
  (`screens.jsx:229-248`) wired to `previewMatch()` (`App.jsx:143-147`), which fabricates a
  mutual match (`setMatched(true)`) with no real reciprocity. The code comment says "Remove
  before launch" — it is still here.
- **Why it matters.** Showing an emotionally vulnerable user a **fabricated** "it's mutual"
  reveal is exactly the dark pattern that drew **FTC + California enforcement against NGL
  Labs (2024, ~$5M)** for fake/AI-generated messages that simulated real engagement
  (MARKET-ANALYSIS § FTC/NGL). A "see a match" button that manufactures the payoff is the
  same category of deception — and here the payoff is a person's feelings.
- **Stress test.** If §2.3's "never confirm live" mitigation is adopted, a *fake* live
  confirmation is doubly damaging: you've removed honest instant-yes for safety, then handed
  users a *dishonest* one for demo convenience.
- **Proposed solution.** **Delete `previewMatch` and the button before any public traffic.**
  If a demo of the reveal is needed for marketing, host it on a clearly-labeled `/demo`
  route with sample data and a visible "example" watermark — never inside the real flow on
  the real result screen.
- **Evaluation.** Effort **S** (deletion). No tradeoff. This is a one-line-of-conscience fix
  with outsized regulatory and trust downside if left in.

---

## 3. Ethics & safety (the bounding constraints — non-optional for this category)

A "find out if your ex still thinks about you" tool sits one design decision away from a
stalking/abuse aid. These constraints **bound every feature below**, which is why they come
before the feature list.

- **Weaponization (the prober, §2.3).** Ownership verification — or at minimum killing the
  synchronous yes — is the mitigation, not a nice-to-have. A controlling ex confirming a
  victim's private feeling is the worst-case outcome and it is currently reachable.
- **No fabricated signals (§2.6, and any future count).** The NGL precedent is explicit:
  fake engagement = enforcement. Never fabricate a match, a count, or a "hint."
- **Variable-reward harm.** A future "someone entered you" counter (§6.3) is a slot machine
  pointed at loneliness. If built: cap frequency, never manufacture scarcity, never invent
  counts.
- **Duty on the reveal.** A mutual reveal lands on emotionally vulnerable people. Soften it,
  offer an "I don't want to act on this" exit, and never editorialize ("go text them!").
  Today the Match screen jumps straight to "Open the conversation" (`screens.jsx:274`) — give
  a graceful "not yet" that is more than a route back (it exists, `screens.jsx:280`, but
  carries no support).
- **Minors & consent.** No age gate exists. Dating-adjacent + anonymous draws heavy
  regulatory scrutiny (UK AADC, EU DSA, COPPA, Korea youth-protection — MARKET-ANALYSIS §
  minors). Add an age affirmation and keep under-18s out.

---

## 4. P1 — The core mechanic leaks or fails silently

### 4.1 Rate limiting fails open and is evadable — **safety defense is soft**
- **Observation.** The IP limit only applies when `v_ip` is non-null (`0007:84-91`); if the
  `x-forwarded-for` GUC isn't present or parses empty, `v_ip` is null and **no IP limit
  runs**. The per-handle limit keys on `from_handle` (`0007:92-97`) — which is
  **attacker-controlled**: a prober rotates the claimed `from` and resets their own counter.
- **Why it matters.** The one safety control that exists today (§2.3 relies on it) can be
  bypassed by (a) any deployment where the forwarded header isn't wired through to the GUC
  (fails fully open on IP), and (b) trivially, by varying the `from` handle.
- **Stress test.** The defense holds only against the *naïve* sweeper who keeps one `from`
  and comes from one detectable IP. The motivated abuser — the one who matters — evades both.
- **Proposed solution.** (1) Make IP **required**: if the forwarded IP is unavailable, treat
  it as a configuration error and fail *closed* for high-risk actions, or move rate limiting
  to the edge (Vercel/Supabase edge middleware) where the real client IP is reliable. (2) Add
  a limit keyed on the **(verified) session/identity** from §2.3, not the claimed handle.
  (3) Add a **per-`to_handle`** limit — cap how many distinct `from`s can probe a single
  target per hour — which directly throttles the targeted prober regardless of how they
  rotate `from`. (4) Consider a proof-of-work / hCaptcha on burst.
- **Evaluation.** Effort **M**. The per-`to_handle` cap is the cheapest high-value add and
  doesn't need identity. Tradeoff: aggressive caps risk false positives during a viral spike
  (many real people legitimately enter one popular handle); tune with a higher `to_handle`
  ceiling than the `from`/IP ones, and alert rather than hard-block at the edge.

### 4.2 Everything is stored in plaintext — handles, emails, the crush graph — **privacy at the data layer**
- **Observation.** `still_entries` stores `from_handle`, `to_handle`, `from_email`,
  `raw_from`, `raw_to` as plaintext (`0006:35-45`). The entire "who secretly longs for whom,
  and their email" graph is one DB read away for anyone with database access (a breach, a
  misconfigured backup, an insider, a subpoena).
- **Why it matters.** The product's whole promise is secrecy. A plaintext table of secret
  crushes + contact emails is the single most sensitive dataset the product could hold, and
  it's stored as if it were a newsletter list.
- **Stress test.** RLS protects against the *client* (good), but RLS is irrelevant to a
  service-role key leak, a Supabase project compromise, or legal compulsion. "We never reveal
  one-sided entries" is true at the API but false at the storage layer.
- **Proposed solution.** Store **salted hashes** of normalized handles for matching
  (matching is equality-only, so a deterministic keyed hash/HMAC with a server-held pepper
  works — same input → same hash, so reciprocity still detectable, but the raw handle isn't
  recoverable from the table). Keep `raw_*` only transiently or drop it. **Encrypt emails at
  rest** (or store only a hash + a separately-encrypted contact blob). Hold the pepper
  outside the DB (edge env/secret manager). Auto-expire rows (§2.5).
- **Evaluation.** Effort **M**. Tradeoff: keyed-hash matching means you can't do fuzzy/typo
  matching on the server (§5.3) and can't display the other person's raw @ from the table —
  acceptable, because you should only ever display the *owner's own* handle and the *live
  submitter's typed* value, never reconstruct the other side. A keyed hash is also vulnerable
  to offline brute force *if the pepper leaks* (handle space is small) — so the pepper's
  secrecy is load-bearing; document it as such.

### 4.3 localStorage leaks the secret on a shared device — **the secrecy promise breaks locally**
- **Observation.** `App.jsx:81` persists `{ email, me, them, matched, handles, ... }` to
  `localStorage` (`celeste:v1`) in plaintext, including **every handle the user entered**
  (`handles` array) and their email.
- **Why it matters.** The product is used late-night, impulsively, often on shared or
  borrowed devices (a partner's laptop, a family iPad). Anyone who opens the site next, or
  the browser's devtools/Application tab, sees exactly who the user has been secretly pining
  for. For an app whose pitch is "no alert, no trace" (`screens.jsx:164`), there is a very
  visible trace.
- **Stress test.** This is the *jealous-partner-finds-out* scenario — arguably more likely to
  cause real-world harm than the server-side prober, because it needs no skill.
- **Proposed solution.** (1) Offer (or default to) an **incognito-friendly ephemeral mode**:
  keep only the *minimum* state needed to resume (current screen + a server-side opaque
  resume token), not the list of handles. (2) Add a prominent **"clear / forget on this
  device"** control on the resting and match screens. (3) Never persist the full `handles`
  array in cleartext; if star-tags need it for the animation, hold it in memory only and
  reconstruct from server on resume for a verified user. (4) Add a "private device?" hint.
- **Evaluation.** Effort **S–M**. Tradeoff: less local persistence means a refresh on an
  unverified device loses the resting-field tags — acceptable, and arguably correct given the
  threat model. The "forget" button is pure S-tier win.

### 4.4 The `resting` screen is a near-dead end for 99% of users — **retention**
- **Observation.** Almost everyone lands on `resting` (matches are rare — §3.2). The actions
  are: share, "check someone else" (which is the unbuilt paywall, §2.2), the why-it's-free
  link, and the fake demo button (§2.6). No durable reason to come back.
- **Why it matters.** Retention rests entirely on whether `resting` gives a reason to return.
  Today it gives a promise ("we'll tell you the moment they look back") whose delivery is
  itself broken (§2.4).
- **Proposed solution.** Turn `resting` into a genuine forward-loop: the verified watch
  (§2.4) so "we'll tell you" is *true*; a tasteful, honest status ("listening since X"); and —
  once safe — the "someone may have entered you" count (§6.3). Replace the fake demo with a
  real, earned hook.
- **Evaluation.** Effort **S–M** (mostly composing §2.4 and §6.3). Tradeoff: none, as long as
  every hook is honest (§3). The biggest retention unlock is making the existing promise real,
  not adding new promises.

### 4.5 Silent match-killers: handle typos & non-existent handles
- **Observation.** `normHandle`/`isValidHandle` (`still.js:11-22`) only sanitize characters and
  length; nothing checks the handle *exists* or matches what the user meant. `@jon_smith` vs
  `@jonsmith` never match; a typo'd ex is a permanent dead entry.
- **Why it matters.** Users blame the app ("it's broken / they don't think about me") when the
  real cause is a one-character mismatch they can't see. This silently depresses the match
  rate that the whole product is judged on.
- **Proposed solution.** **Confirmation echo:** show the normalized handle back before sealing
  ("you'll be matched as **@jonsmith** — right?"). It's cheap and catches most typos. True
  existence-checking needs Instagram APIs (infeasible/ToS-fraught — MARKET-ANALYSIS § Meta
  platform terms); the echo is the 80/20.
- **Evaluation.** Effort **S**. Pure win. Note it composes awkwardly with hashed storage
  (§4.2) only if you wanted server-side suggestions — but a *client-side* echo of the value
  the user already typed needs no server and no raw storage.

### 4.6 No withdraw / delete — wrong for a privacy-first product, likely a legal requirement
- **Observation.** Once you enter someone, there's no un-submit, no delete, no withdraw
  (reconciliation, regret, safety, or just changing your mind). The RPC only inserts/updates.
- **Why it matters.** A product whose pitch is privacy/consent must let people revoke; it's
  also a GDPR/PIPA erasure expectation (§2.5) and a safety necessity (you reconciled, or you
  realize entering them was a mistake).
- **Proposed solution.** A "withdraw this entry" action: for the current session
  (localStorage-known) immediately; for the durable case, via the verified email magic-link
  (§2.4). Add the third-party suppression endpoint from §2.5 ("never let me be entered").
- **Evaluation.** Effort **S–M**. No real tradeoff beyond a new RPC path. Withdrawing a *matched*
  entry needs a defined rule (does it un-match the other side? recommend: stop future
  notifications, don't retroactively "un-tell" someone — and document it).

---

## 5. P2/P3 — Correctness, hygiene, and the things that bite later

### 5.1 (P3) Email-queue has no retry ceiling, alerting, or scheduler in-repo
- **Observation.** `still-notify` (`index.ts`) processes `sent_at is null` rows in batches of
  100, logs failures, and leaves them pending (`index.ts:62-88`). What *invokes* it (webhook
  vs pg_cron) is documentation, not code; a permanently-failing address is retried forever;
  there's no dead-letter, no alert, no backoff.
- **Proposed solution.** Add an attempt counter + max-retries → dead-letter, surface failures
  to an alert (the payoff email failing silently means the product silently fails its one
  job), and commit the cron/webhook config to the repo.
- **Evaluation.** Effort **S**. Low risk, real reliability gain on the critical path.

### 5.2 (P3) No observability / abuse monitoring
- **Observation.** No analytics, no funnel instrumentation, no abuse dashboard. You can't see
  the conversion through you→them→seal, the match rate, the silent-match rate (§2.4), or a
  probing spike (§2.3/4.1).
- **Proposed solution.** Privacy-respecting, **aggregate-only** instrumentation (counts, not
  identities — §3): funnel completion, seal rate, match rate, email-capture rate, rate-limit
  trips. This is also how you'll know if any fix here worked.
- **Evaluation.** Effort **S–M**. Tradeoff: instrumentation in a privacy product must be
  aggregate and PII-free by construction, or it becomes its own §2.5 liability.

### 5.3 (P2) Accessibility & performance of the galaxy
- **Observation.** A persistent WebGL/canvas starfield runs the whole session (`App.jsx:167`,
  `galaxy.js`). No evidence of `prefers-reduced-motion` handling, and a constant animation is
  a battery/perf cost on low-end phones (the dominant device for this audience).
- **Proposed solution.** Honor `prefers-reduced-motion` (static/low-motion fallback), pause the
  canvas when the tab is hidden, and budget for low-end GPUs. Audit color contrast of the muted
  text on the dark field for WCAG AA.
- **Evaluation.** Effort **S–M**. Tradeoff: the galaxy *is* the brand; a reduced-motion fallback
  must still feel like CELESTE, not a blank page.

### 5.4 (P2) The copy over-promises a single meaning — sets up the intention layer (§6.4)
- **Observation.** "still think about you" reads as *wants me back* to the hopeful and *just
  lingering* to the closure-seeker; the binary match can't tell them apart, and the Match
  screen pushes straight to "Open the conversation."
- **Why it matters.** A mutual reveal can create false hope or false alarm. This is the exact
  gap the "intention" idea (§6.4) is meant to fill — but only if done safely.

---

## 6. Growth & depth features — each stress-tested

Format: **Idea → Hypothesis → Risk / where it fails → Verdict.** All of these widen the blast
radius of §2.3, so **none ships before ownership verification (or the kill-synchronous-yes
mitigation) is in place.**

### 6.1 Multi-entry (enter several people)
- **Hypothesis.** Letting a user enter 3–10 people multiplies match surface — the most direct
  attack on the liquidity problem (§3.2 below).
- **Risk.** Amplifies the prober vector (more pairs per session) and is exactly what §2.2 wants
  to monetize. Must ship behind §2.3 + a real paywall.
- **Verdict.** **High value, gate it.** Biggest single lever on the core problem; also the
  natural monetization unit (§2.2).

### 6.2 Relationship-type tag (ex · crush · situationship · friend · lost-touch)
- **Hypothesis.** The mechanic is really about *unspoken mutual interest*, not just exes;
  tagging expands TAM and cleans up matching.
- **Risk.** Fragments already-thin liquidity if you hard-partition by type. Mitigate by
  matching on the pair and *revealing* type compatibility, not partitioning.
- **Verdict.** **Worth testing**, watch fragmentation. The low-risk half of the "intention"
  idea (§6.4).

### 6.3 "Someone entered you" — count-only signal
- **Hypothesis.** Show a *verified* user an anonymous count ("3 people still think about you —
  enter them to find out which are mutual"). Solves the `resting` dead-end (§4.4), creates a
  return + monetization loop, preserves anonymity (count ≠ identity).
- **Risk.** A loneliness slot machine (§3); re-introduces probing if the count is farmable;
  must be gated behind §2.3 ownership and frequency caps; **counts must be real** (NGL
  precedent — MARKET-ANALYSIS § FTC).
- **Verdict.** **Strongest retention/monetization lever and the most ethically loaded.** Counts
  only, never identities, never fabricated, never without verified ownership.

### 6.4 The "pick an intention/message" idea — full stress test
The idea: as you write someone down, choose a simple intention — "I miss you," "closure,"
"let's try again." It's the most interesting idea and the one most in tension with the core
promise.

- **Decompose it.** Two features hide here: (a) a low-risk **relationship/intent *type*** label
  (§6.2), and (b) a high-risk **emotional *message* payload** (a disclosure). They have
  opposite risk profiles; treating them as one is the first mistake.
- **The core problem.** Intentions make "match" two-dimensional. On a mutual match, do you
  reveal each other's intention? *Reveal both* → "try again" meeting "closure" re-introduces the
  exact rejection the app was built to remove (breaks zero-rejection — some users now get hurt
  *by a match*). *Hide them* → decorative. *Gate the match on compatibility* → silently hides
  real mutual feeling because labels didn't line up (worse than binary).
- **Recommended design: tiered, double-opt-in reveal.**
  - **Tier 0 — existence (unchanged).** "You both still think about each other." Always shown
    first; preserves zero-rejection.
  - **Tier 1 — intention, double-opt-in.** Each side *optionally* attaches an intention. On a
    mutual match, a side's intention is revealed **only if both chose to share one.** If either
    left it blank, neither is revealed; the match still stands at Tier 0. The disclosure is
    itself reciprocal — the app's founding logic, one level deeper.
  - **Framing.** Show intentions as *orientation*, never a verdict: "You said *discuss more.*
    They said *try again.*" No score, no editorializing.
- **Message set.** Curate ~5–7 options (no free text — abuse/de-anonymization), each phrased as
  one's own stance, not a demand: "I miss you," "I'd want to talk again," "I'm open to trying
  again," "I just want closure," "I hope you're well," "Just curious — no pressure." Survivable
  to *receive* even from someone you feel less for.
- **Residual risks.** Disclosure pressure (keep it visibly optional); a non-match must never
  leak whether the other side attached an intention; treat the intention as the most sensitive
  field in the system (it deepens the §2.5/§4.2 exposure).
- **Verdict.** **Good instinct, only in its double-opt-in Tier-1 form.** As "pick a message and
  we show it," it quietly re-creates rejection and undermines the one thing that makes the
  product safe. Ship §6.2 first to learn; ship §6.4(b) only with the double-opt-in guardrail
  and only after §2.3.

### 6.5 Targeted-but-anonymous reach ("make sure it reaches them")
- **Hypothesis.** Let a user nudge their *specific* ex anonymously to convert `resting` into a
  real shot at a match.
- **Risk.** The most dangerous idea here: directed messaging to a named person = a
  spam/harassment/de-anonymization vector (timing alone can reveal the sender). Trivially
  abused for "I know you're thinking about me."
- **Verdict.** **Default no / extreme caution.** Prefer untargeted virality. If ever built:
  rate-limit hard, never reveal sender or timing, require the target to be reachable only
  through a channel they opted into, and run it past trust-&-safety review.

### 6.6 Internationalization / share channel
- **Hypothesis.** Korea-first ⇒ Kakao share + Korean copy outperform native share + English
  (MARKET-ANALYSIS § Korea).
- **Verdict.** Cheap to test, plausibly high ROI given the Korea-rooted lineage. Validate the
  launch market first; it also changes the payment rail (§2.2) and the legal regime (§2.5).

---

## 7. The two problems that decide whether any of this matters

### 7.1 Cold-start / two-sided liquidity — **the make-or-break**
A match needs *both* people to independently find the app and enter *each other specifically*.
For a given dyad the probability is near zero until the app is huge inside a shared social
graph. `resting` is the near-universal outcome, so word-of-mouth is carried by an *unfulfilled*
promise. Even viral reach doesn't help a specific user unless their *specific* ex is among the
entrants. **Mitigations:** multi-entry (§6.1) to widen each user's surface; a Korea-first,
single-social-graph launch (§6.6) to concentrate density; and making the rare match *land*
(§2.4) so the few payoffs that happen become the loudest marketing. Treat growth features as
core mechanics, not marketing. (Quantified in MARKET-ANALYSIS § liquidity/cold-start.)

### 7.2 The payoff is rare *and* currently leaks — compounding failure
§3.2's rarity is survivable only if every match that *does* occur is delivered and celebrated.
Today the rare match can be silent (§2.4) or fake (§2.6). Fixing delivery (§2.4) and removing
the fake (§2.6) is therefore not P1 polish — it's what makes the core bet payable at all.

---

## 8. Prioritization

Impact = effect on the core problems (launch-readiness, liquidity §7.1, payoff delivery §7.2,
safety §3, legality §2.5).

| Priority | Item | Why now | Effort |
|---|---|---|---|
| **P0** | Remove fake demo match (§2.6) | Ships a deceptive fabricated payoff; NGL-class risk | S |
| **P0** | Kill synchronous "matched:true" / defer reveal (§2.3) | Closes the prober oracle without OAuth; highest safety leverage | S |
| **P0** | Fix the brand split (§2.1) | The payoff email reads as phishing; breaks the viral loop | S |
| **P0** | Stop promising a price you don't charge (§2.2 copy) | Don't ship a false price; unblocks honest forecasting | S |
| **P0** | Privacy policy + ToS + erasure/suppression (§2.5) | Non-consenting third-party data with no lawful basis | M + legal |
| **P0** | Verified "remember me" channel (§2.4) | Makes the rare payoff actually land; doubles as ownership signal | M |
| **P1** | Hash handles / encrypt emails / expiry (§4.2, §2.5) | The crush graph is plaintext; secrecy fails at the data layer | M |
| **P1** | Rate-limit fail-open + per-`to_handle` cap (§4.1) | The only live safety control is soft and evadable | M |
| **P1** | localStorage secrecy leak + "forget" button (§4.3) | Shared-device exposure — likeliest real-world harm | S–M |
| **P1** | Handle confirmation echo (§4.5) | Cheap; kills a silent match-killer | S |
| **P1** | `resting` forward-loop made honest (§4.4) | Turns the 99% case from dead-end into real retention | S–M |
| **P1** | Withdraw / delete (§4.6) | Right thing; legal expectation; safety | S–M |
| **P0-when-monetizing** | Server-enforced billing + identity (§2.2 full) | Revenue is $0 by construction; client gate is bypassable | L |
| **P1** | Ownership verification via IG OAuth (§2.3 full) | The complete fix; unlocks §6.1/§6.3/§2.2 | L |
| **P2** | Multi-entry (§6.1) | Biggest liquidity lever — but only after §2.3 | M |
| **P2** | "Someone entered you" count (§6.3) | Strongest retention/monetization; most ethically loaded | M |
| **P2** | Intention layer, double-opt-in (§6.4) | High emotional value; needs §2.3 + care | M |
| **P2** | Relationship-type tag (§6.2) | TAM + cleaner matching; watch fragmentation | S–M |
| **P2** | Reduced-motion / perf / a11y (§5.3) | Low-end phones are the core device | S–M |
| **P3** | Email-queue retry/alerting (§5.1) | The payoff email failing silently fails the product | S |
| **P3** | Aggregate observability (§5.2) | You can't fix what you can't see; keep it PII-free | S–M |
| **P3** | i18n / Kakao share (§6.6) | Cheap test; lineage suggests upside | S–M |
| **Hold** | Targeted reach (§6.5) | Abuse vector; only with T&S review | — |

**Sequencing logic.** The four S-tier P0s (§2.6 delete, §2.3 kill-sync-yes, §2.1 brand, §2.2
copy) are a single afternoon and make the app *honest and not-actively-harmful* — do them
before any traffic. Then the M-tier P0s (§2.4 payoff delivery, §2.5 legal) make it *deliver and
defensible*. Only then spend on growth, because multi-entry, counts, and the intention reveal
all widen the §2.3 blast radius and must not precede its fix. Billing (§2.2 full) and OAuth
(§2.3 full) are the two large investments that unlock everything in §6 and turn the funnel from
$0 to real.

---

## 9. The minimal honest launch (if you must ship this week)

The smallest set that makes the current build truthful and not harmful, all S-tier:
1. **Delete** the fake demo match (§2.6).
2. **Defer the reveal** — never return `matched:true` synchronously; deliver only via a
   contact channel the owner controls (§2.3 minimal).
3. **One brand** everywhere a user sees, especially the email (§2.1).
4. **Honest pricing copy** — "free while we're early," remove the $2.99 claim until billing
   exists (§2.2).
5. A **"forget on this device"** button (§4.3) and a barebones **privacy notice + erasure
   email** (§2.5 minimal).

This ships a product that tells the truth, can't be trivially used to out a victim live, and
doesn't fabricate feelings — which is the floor for a product about feelings.

---

## 10. Open questions for the founder

1. **Name.** CELESTE or STILL.? One decision unblocks §2.1 and every external surface.
2. **Identity stance.** Willing to add Instagram OAuth? This single call gates safety (§2.3),
   billing (§2.2), and the best features (§6.1/§6.3).
3. **Launch market & rail.** Korea-first (Kakao share, KakaoPay/Toss, PIPA) or global (IG/TikTok,
   Stripe, GDPR/CCPA)? Changes growth, payment, and legal at once (§2.5, §6.6).
4. **Monetization unit.** Per-person ($2.99), credit packs, or a subscription that monetizes
   *speed + breadth*? (MARKET-ANALYSIS favors the latter.) And is "reveal always free"
   inviolable?
5. **Reveal philosophy.** Is "zero-rejection" an inviolable principle? If yes, the intention
   layer *must* be Tier-1 double-opt-in (§6.4), never a compatibility score.
6. **Legal appetite.** Who owns the privacy policy, the third-party-data posture, and the
   trust-&-safety review before any directed-reach or count feature ships?

---

*This memo only analyzes and recommends; no product code was changed. Companion external
research: [`MARKET-ANALYSIS.md`](./MARKET-ANALYSIS.md).*

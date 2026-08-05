# CELESTUAL — test coverage: where we are, and what to cover first

The current coverage is **zero**. There are no test files, no test runner in
either `package.json`, and no `.github/` directory — so nothing runs on a push,
including the one check that already exists (`npm run lint:voice`).

This document is the proposal for changing that. It is deliberately ordered by
*what it costs us when it breaks*, not by what is easy to reach.

## What the code actually is

| Layer | Size | Testability | Stakes |
| --- | --- | --- | --- |
| `supabase/migrations/*.sql` — ~70 `SECURITY DEFINER` functions | 8.1k LOC | needs a Postgres | **the product lives here** |
| `supabase/functions/*` — Deno edge functions | 2.2k LOC | pure-ish, mockable | money + auth |
| `app/src/api/*` — the RPC client | ~1.2k LOC | pure, trivial | correctness of the client half |
| `app/src/{card,i18n,theme,communities}` | ~2k LOC | pure, trivial | copy + card rules |
| `app/src/{sky,galaxy,communityGalaxy}` — WebGL2 | ~5k LOC | expensive, low signal | cosmetic |
| `app/src/components/*.jsx` — the nine screens | ~6k LOC | needs a DOM | flow correctness |

The shape that matters: **the business logic is in SQL, not in JavaScript.** Any
test plan that starts with React components is testing the thin part.

---

## Tier 1 — the invariants that fail silently

These share a property that makes them the whole priority: when they break,
**nothing throws.** No error surfaces, no alert fires. The product simply starts
telling people things it promised never to tell them, and we find out from a
user or not at all.

### 1.1 The mutual-reveal gate

`celestual_submit` (0022, ~200 lines of plpgsql, redefined **8 times** across
migrations) decides whether `match_card` — another person's words — is returned
to a browser. `celestual_counterpart_card` (0022) is a *second, independent*
path to that same secret. Two implementations of one invariant, both untested.

SECURITY.md calls this the margin the entire design lives inside. Cases to pin:

- one-sided ping → `mutual:false`, `match:null`, `match_card:null`
- mutual pair → both sides get the counterpart card, and `matched_at` is set on
  both rows before either can read (the "neither moved second" guarantee)
- counterpart expired (`expires_at < now()`) and unmatched → no reveal
- target suppressed → `recorded:false, error:'suppressed'`, and **no row written**
- the self-match guard: `not (e.from_handle = nf and e.to_hash = nh)` is one line
  standing between a linked alt and matching yourself
- re-placing an existing pair refreshes the clock without consuming a slot

### 1.2 Identity grouping

`celestual_group(h)` is six lines with a self-referential subquery, and it widens
the reciprocal match on *both* sides of `celestual_submit`. It is the highest-
severity function in the repo by blast radius: if it ever returns a handle that
isn't in the caller's group, that person matches against pings that were never
for them. Pin the group expansion directly — a handle with no links returns only
itself; a linked pair returns both; an unlinked third party never appears.

### 1.3 Suppression / opt-out

`celestual_suppress` is redefined **9 times** — the most-churned function in the
schema, which is exactly the profile of code that wants a regression test. Opt-out
is a public legal commitment (any handle owner, no account needed). Assert that a
suppressed handle cannot be pinged *through every path that writes*, not just
through `celestual_submit`.

### 1.4 The Stripe webhook signature

`celestual-stripe-webhook/index.ts:71` verifies Stripe signatures with hand-rolled
Web Crypto — header parsing, `safeEqual`, a 300s tolerance window. It is the sole
grantor of paid entitlement. Hand-rolled HMAC verification on the money path,
with no test, is the classic place a later refactor introduces a bypass nobody
notices.

It is currently dormant (`VITE_STRIPE_ENABLED=0`), which makes **now the cheapest
moment in the product's life to test it** — before it carries real money. Cases:
valid signature passes; tampered body fails; stale timestamp fails; missing `v1`
fails; multiple `v1` candidates (Stripe's key-rotation shape) still passes.

---

## Tier 2 — cross-language parity, which is already drifting

The same rules are written twice, once in JS and once in SQL, with nothing
pinning them together. This is not hypothetical — the divergences are live today:

| Rule | JavaScript | SQL | Status |
| --- | --- | --- | --- |
| handle normalization | `normHandle()` `api/celestual.js:21` — no length cap | `celestual_norm()` 0009 — returns `NULL` above 30 chars | **diverged**, masked by `isValidHandle` |
| card clamp | `toWire()` `card/model.js:236` — 20 words | `celestual_card_clean` 0022 — 20 words **and** `left(v_words, 400)` | **diverged** |
| free slot cap | `SLOT_CAP = 2` `api/celestual.js:34` | `celestual_free_cap() = 2` 0021:128 | agree — but both disagree with README.md:16 and the framework doc, which still say three |

The card one has a user-visible consequence: twenty long words serialize fine in
the browser and are silently truncated at 400 characters server-side, so the card
the sender sees is not the card that was stored — and they only find out at a
match, if ever.

A single parity suite that runs the same input table through both
implementations kills this entire class permanently. It is also the cheapest
suite to write.

---

## Tier 3 — the demo/production fork

There are 11 `if (demo)` short-circuits in `app/src/api/`. Each one is a place
where production could take the sandbox path, or where a sandbox change quietly
stops mirroring production. `placePing` fabricates a guaranteed mutual for
`@demo`. Two assertions cover the risk: demo mode never touches Supabase, and
production mode never returns fabricated data.

---

## What we should *not* test

Honesty about ROI matters more than a coverage number:

- **`sky/`, `galaxy.js`, `communityGalaxy.js`** (~5k LOC) is WebGL rendering.
  Unit tests are expensive and prove almost nothing about what the user sees.
  The exceptions are `sky/blackbody.js` and `starSprites.js` — pure math, worth
  pinning. For the rest, one smoke test that the engine initializes and that
  `fallback2d.js` takes over when WebGL2 is absent buys more than a hundred
  assertions about buffer contents.
- **Screen-by-screen React tests** for all nine screens. Later, and only for the
  flows that carry a decision (slots exhausted, verification, opt-out).
- **Chasing a coverage percentage.** The 5k LOC of untestable rendering means the
  number will look bad forever, and optimizing it would push effort exactly the
  wrong way.

---

## Suggested order

**Phase 0 — infrastructure (half a day).** Vitest in `app/`, `deno test` for the
edge functions, and a `.github/workflows/ci.yml` that runs both plus the existing
`npm run lint:voice`. Wiring the voice tripwire into CI is the single cheapest
win in the repo: the check is already written and nothing pulls it.

**Phase 1 — Tier 2 + pure modules.** Fast, no database, no DOM. The parity table
above, plus `card/model.js`, `i18n/index.js` fallback behavior, `theme.js`,
`communities.js`, `blackbody.js`.

**Phase 2 — Tier 1 SQL.** Needs `supabase start` and a migration-replay harness
(pgTAP, or plain SQL assertions run through `psql` — the latter is lower
ceremony and enough here). This is the phase that actually protects the product.

**Phase 3 — edge functions.** Signature verification first, then the trial/admin
password paths.

Phases 1 and 3 need no new infrastructure beyond Phase 0. Phase 2 is the one
that costs real setup time, and it is also the one worth paying for.

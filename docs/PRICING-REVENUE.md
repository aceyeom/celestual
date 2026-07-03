# CELESTUAL — Pricing strategy & revenue model

What CELESTUAL can charge for without breaking itself, who pays
(persona-weighted, see [PERSONAS.md](./PERSONAS.md)), and a forecasting model
that produces a *defensible* picture of expected profit. Constraints inherit
from [PRODUCT-FRAMEWORK.md](./PRODUCT-FRAMEWORK.md) §1 and
[SECURITY.md](./SECURITY.md).

**One honesty note up front:** no pre-launch spreadsheet produces an
"accurate" profit number — anyone who hands you one is guessing with
confidence. What *does* produce accuracy is §4: a small parameterized model
whose eight inputs are all measurable in the live funnel, re-run monthly with
real numbers. Month 1 gives you a wide range; month 4 gives you a forecast you
can plan against. This doc supplies the model, launch-phase priors from
comparable consumer products, and the calibration loop.

---

## §1 — The constraint that shapes everything

**The obvious monetization is forbidden.** The slot budget (3 stars, +1/week)
is the product's primary security control against "enter everyone I know and
map my admirers" (SECURITY.md §4.0). The persona most willing to pay — the
Checker (P2) — wants to buy exactly that. Selling slots, refills, faster
regeneration, withdrawal refunds, or any "see more, sooner" is **selling the
attack** (invariant I-2). This is not a pricing choice; it's a security
boundary, and it's permanent.

Corollaries:

- "Everything mechanical is free" is not a loss — it's a **trust asset** the
  Skeptic (P5) verifies and the Yearner (P1) relies on. It should stay in the
  marketing copy forever, even after monetization ships.
- Suppression/erasure is never paywalled (I-3), and nothing commercial touches
  the reveal moment (I-4).
- Therefore: **monetize meaning and community, never mechanics.**

## §2 — The pricing plan

### Phase 0 (now → real density): deliberately free

Monetizing before the cold-start problem is solved (FRAMEWORK T-3) taxes the
exact growth the product needs, for revenue that rounds to zero. Costs are
~$20–90/month depending on ManyChat tier (§5) — this phase is cheap to hold.
**Triggers to move to Phase 1:** MAU > ~20k, or ≥1 constellation organically
past 100 members, or infra > $250/month.

The whole Phase-1 monetization surface is **already built and simulated in the
`/demo` + `/beta` sandbox** (localStorage entitlements, instant unlock,
counts-only instrumentation) — the lab measures attach/interest *now*, and
Stripe + a server entitlements table drop in at the trigger (§2.1).

### Phase 1: three lines — peaks, organizers, identity

**Line A — Keepsakes (one-off at the emotional peaks, P1 Yearner / P3
Reconnector).** Sell the *artifact of the feeling*, priced like a small gift,
not an app fee:

- **Matched-pair keepsake** (~$9–14 one-off; $11 in the model and the demo): a
  beautiful shareable/printable record of a mutual match — offered *after* the
  reveal, never during (I-4). The buying moment is the emotional peak of the
  entire product, and the match story is also its best advertising
  (FRAMEWORK §5.3).
- **Sky keepsake** (~$9 one-off): a rendered print/export of your sky —
  monetizes the 95% who never match by honoring the feeling itself (the T-1
  empty-sky population becomes a market instead of pure churn).
- Basic share cards stay **free forever** — they're the growth engine
  (FRAMEWORK §5.1); charging for them would be taxing your own marketing.

**Line B — Constellation Pro (subscription, P4 Ringleader; paper-only until
density).** ~$4.99/month per constellation for community expression: custom
glyph and colors, reserved name, larger capacity, event tooling around seal
nights. Charges the organizer for *status and tooling*, adds zero probing
capacity, and the payer is the persona whose success also solves your density
problem — the incentives point the same direction.

**Line C — Celestual Nova (personal subscription, $3.99/mo or $19.99/yr,
P1/P3).** The identity/expression layer — a nova is a star that suddenly
brightens. Strictly *additive*; the free product loses nothing:

- **Write-your-own sealed line** — the five canned intent lines stay free
  forever; Nova adds authoring a line in your own words, sealed and revealed
  exactly like the five.
- **Seal styles** — the light your own stars burn with; at a mutual reveal the
  *other person* sees your star in that light, with **no badge and no branding
  there, ever** (I-4) — beauty travels, commerce doesn't. The dressed reveal is
  also Nova's only "ad": the happiest moment in the product quietly shows the
  receiving side that expression exists.
- **Sky themes** — the colour of your night (violet / dawn / deep field).
- **Hard placement rules:** no Nova surface on the out-of-slots screen (nothing
  for sale may sit next to the slot budget — I-2 adjacency), nothing commercial
  at or before the reveal, no urgency copy anywhere (I-5).

Expect honest cosmetic-subscription conversion (0.5–2%, §3): Nova is the
recurring-identity layer of the model, not its engine. Revenue concentration
stays where the attach rates are — the peaks (A) and the organizers (B) — and
above all in density.

### Referrals: months, never slots

The viral ask ("share your link") gets rewarded in **Nova months** — give a
month, get a month. Never in slots, pings, or entries: a share-for-slots loop
would let anyone *mint probing capacity* by spamming links, which is worse than
selling the attack (I-2) — it's giving it away for distribution. Cosmetic-only
rewards also seed the paid tier socially.

### What stays free, explicitly, forever

Sealing, matching, the reveal, withdrawal, suppression/erasure, reminders,
verification, **the five intent lines**, basic share cards, basic
constellations. (This list *is* the trust page bullet — it now ships verbatim
on the in-app privacy screen.)

### Deliberately rejected

| Idea | Why rejected |
| --- | --- |
| Paid slots / refills / faster regen | Sells the attack (I-2) |
| "See if they're active" / any info about the other side | Leaks one-sided state (I-1) |
| Referral rewards in slots/pings | Mints the attack for virality — I-2, worse than selling it |
| Ads | Torches intimacy for pennies at this scale; Meta-adjacent data optics (T-2) |
| Pay-to-unseal-early, urgency mechanics | I-5; poisons sincerity |
| Charging the Bystander for anything | I-3 |

**The precedent worth naming:** this category's proven money-printer is exactly
the rejected row two — Gas monetized "who liked you" hints ("God Mode") to
~$7M/yr, and NGL monetized the same promise so deceptively it paid a **$5M FTC
settlement** and took the category's trust down with it. Celestual deliberately
forgoes that revenue. The honest consequence: money here comes from the peaks,
the organizers, and identity — and the real engine is density, not price.

## §3 — Priors: what conversion realistically looks like

Launch-phase assumptions from comparable consumer products (cosmetic-only
freemium converts 0.5–2%; one-off emotional purchases at peak moments attach
5–15%). Replace every one of these with measured data (§4):

| Parameter | Low | Base | High |
| --- | --- | --- | --- |
| Nova/cosmetic conversion (% of MAU paying/mo) | 0.3% | 0.8% | 1.5% |
| Constellation Pro uptake (% of active constellations) | 2% | 5% | 10% |
| Matched-pair keepsake attach (% of matches) | 5% | 12% | 20% |
| Sky keepsake attach (% of MAU, one-off, /mo) | 0.1% | 0.3% | 0.6% |
| Sealed entries per MAU per month (slot-capped ≤ ~4) | 0.4 | 0.7 | 1.2 |
| Match rate (mutual ÷ entries) — *density-driven* | 1% | 4% | 8% |
| Monthly MAU churn | 45% | 35% | 25% |
| K-factor (new users per active user) | 0.15 | 0.35 | 0.6 |

Note the shape this implies: **revenue is a function of density and retention,
not price.** Moving match rate from 1%→4% (by winning one campus) does more
for revenue than doubling every price — because matches drive the
highest-value purchase *and* the best word of mouth. Pricing effort is capped;
density effort compounds. Allocate accordingly.

## §4 — The revenue model (re-run monthly with real inputs)

### Growth engine

```
MAU(t+1) = MAU(t) × (1 − churn) + MAU(t) × K + organic(t)
```

### Revenue per month

```
matches(t)    = MAU(t) × entries_per_MAU × match_rate
revenue(t)    = MAU(t) × nova_conv × $3.99                  (Line C — Nova; blended
              + constellations(t) × pro_uptake × $4.99       toward ~$3.30 effective
              + matches(t) × keepsake_attach × $11           with annual + referral
              + MAU(t) × sky_keepsake_rate × $9              months)   (Lines B, A)
profit(t)     = revenue(t) − costs(t)                       (costs: §5)
```

### Twelve-month scenarios (Phase 1 prices, priors from §3)

**Conservative** — no viral moment, slow organic (K=0.15, churn 45%,
match rate 1%): MAU crawls to ~2–3k by month 12. Revenue ≈ **$60–120/month**
by year-end — roughly break-even against §5 costs. Verdict: the product is a
sustainable hobby, not yet a business; stay in Phase 0 posture and fix
density, not pricing.

**Base** — the cluster strategy works: 2–3 campuses/fandoms reach real density
(K=0.35, churn 35%, match rate 4%, one modest spike mid-year). MAU ≈ 20–30k
by month 12. At 25k MAU: Nova (0.8% × $3.99) ≈ $800, Constellation Pro (≈250
active constellations × 5%) ≈ $60, matched keepsakes (25k × 0.7 × 4% = 700
matches × 12% × $11) ≈ $920, sky keepsakes ≈ $675 → **≈ $2.0–2.5k/month run-rate**,
≈ $10–14k cumulative first-year revenue, costs still < $200/month → first-year
profit ≈ **$8–12k**, with the real prize being a proven density playbook.

**Viral** — a genuine TikTok moment plus surviving retention work (spike to
300–500k cumulative visitors, K spikes >1 briefly, month-12 MAU ≈ 80–120k
after decay, match rate 6% inside dense clusters): run-rate
**≈ $8–15k/month** by month 12. Costs rise (Supabase/email scale, ~$500–1k/mo)
but margin stays >85%. This scenario is not plannable — it's *catchable*, and
only if T-4 retention surfaces shipped first.

Treat these as brackets, not predictions: the honest year-one statement today
is "between break-even and ~$15k/month, with the base case around
$2k/month run-rate by month 12 — dominated by whether cluster density works."

### The calibration loop (where accuracy actually comes from)

1. Instrument the eight §3 parameters (they map 1:1 to the FRAMEWORK §6 event
   list — this is the same work).
2. Use `/beta` cohorts now for the free-behavior parameters (entries per
   user, share rate, constellation join rate) — before any pricing exists.
3. When Phase 1 ships, A/B the keepsake price point ($9 vs $14) — one-off
   purchases tolerate testing; subscriptions churn if repriced.
4. First of each month: paste measured values into the §4 formulas, recompute
   the three scenarios, and write down which scenario reality is tracking.
   After ~3 months of data the range collapses to a usable forecast; that
   document becomes the profit picture this file can only bracket.

## §5 — Cost model & breakeven

| Item | Now | At base-case scale (~25k MAU) |
| --- | --- | --- |
| Supabase | $0–25 | $25–75 (DB + edge functions + egress) |
| Vercel | $0–20 | $20 |
| Resend (match + reminder email) | $0 | $20 (volume-priced; matches are rare) |
| ManyChat (verification relay) | $15 | $15–25 |
| Domain / misc | ~$2 | ~$2 |
| **Total** | **≈ $20–60/mo** | **≈ $80–150/mo** |

No paid staff assumed. Breakeven at Phase 1 prices ≈ **~1.5–3k MAU** in the
base parameter set — i.e., a single genuinely dense campus constellation
plausibly pays for the entire product. Everything past that is margin: the
architecture (SPA + Supabase, no app servers) makes ~90% gross margins the
default, which is why this doc spends its words on growth parameters instead
of cost control.

## §6 — Decision summary

1. **Now:** stay free; the whole Phase-1 surface (Nova + the matched-pair
   keepsake) runs *simulated* in `/demo` + `/beta` with counts-only metrics
   (`nova_viewed/unlocked`, `keepsake_viewed/simulated_purchase`,
   `referral_link_copied`, plus the FRAMEWORK §6 set) — measure interest while
   spending all real effort on density (Ringleaders/constellations, seal
   nights, the weekly feeling) and retention (empty-sky value).
2. **At a Phase-1 trigger:** wire payments in the proven order — keepsakes
   (Line A) first (one-offs, peak attach), Constellation Pro (Line B) second,
   Nova (Line C) as the recurring identity layer. Server side: an entitlements
   table keyed on handle/`group_id` (via `celestual_handle_links`), RLS enabled
   with zero policies, read through a proof-gated `SECURITY DEFINER` RPC,
   written only by a `celestual-billing` edge function (Stripe webhook, service
   role — the `celestual_complete_ig_verification` pattern); an `intent` column
   on `celestual_entries` threaded through `celestual_submit` so custom
   inscriptions + seal styles travel to the reveal.
3. **Never:** slots, probes, other-side info, ads, urgency, referral-slots, or
   anything the Checker would thank you for.
4. **Monthly:** recompute §4 with measured inputs; let the forecast tighten
   itself.

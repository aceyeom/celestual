# CELESTUAL — Monetization posture

What celestual charges for: **nothing, deliberately, until density is proven.**
This document replaces the earlier pricing strategy (Nova subscription,
keepsakes, Constellation Pro — all deleted with the repositioning) and encodes
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) Part 3, which
is the binding decision. Constraints inherit from
[SECURITY.md](./SECURITY.md) and [PERSONAS.md](./PERSONAS.md).

## §1 — The argument, in full (why $0 is the strategy)

The company's binding constraint is **density, not revenue**. Two founders in
the military, a web-only product with trivial infrastructure cost (§4), no
salaries — the burn rounds to zero, so revenue solves no live problem.
Meanwhile every dollar-shaped surface in the flow taxes the two behaviors that
*are* the live problem:

- **Pings.** Each suppressed ping is a lost latent match, and matches are the
  story engine — the only marketing that compounds.
- **Shares.** The open-door card is the distribution channel; charging
  anywhere near it taxes your own growth.

The prior design's subscription contradicted the company's own thesis:
celestual is episodic — a few moments a year — and episodic products fit
per-job pricing, never recurring charges. A $4.99/month subscription on
something used a few times a year is a churn-and-chargeback machine that also
re-imports the retention anxiety the episodic framing dissolves.

The "paid signals legitimacy" argument is real but weak: trust on a
2,000-person campus comes from a warm named brand, a real ambassador, visible
safety architecture, and truthful numbers — not from a Stripe checkout.

**Posture: keep Stripe plumbed and dormant. Nothing in the production product
mentions money. The fourth-slot screen shows one door ("let one go") and no
other.** The `/demo` sandbox is the one exception, deliberately: when a user
runs out of slots there, it previews a realistic one-time fourth-slot checkout
so the eventual shape is visible without waking anything real (no card is read,
nothing is charged, the sandbox says so on its face). Production stays dormant.

**Where the plumbing now stands (migration 0021).** "Plumbed and dormant" is
literal as of the Stripe build: the entitlement layer, the two edge functions and
Screen 9's second door all exist and are all **off**, behind
`VITE_STRIPE_ENABLED=0`. Production still shows one door and still mentions money
nowhere. Turning the flag on is the wake decision below, taken deliberately and
recorded here; turning it back off is one variable and a redeploy, and costs
nobody what they already bought. The step-by-step is
[STRIPE-SETUP.md](./STRIPE-SETUP.md).

## §2 — What is free, explicitly, forever

Placing, matching, the reveal, renewing, letting go, the opt-out and all
erasure, identity verification, the five intent lines, the open-door card and
personal page, campus preregistration, communities and their weekly stats (the
fixed-100 unlock is a reward gate on a *feature*, never a charge). This list
ships verbatim on the in-app privacy screen and in /terms §5 — it is a trust
asset the Skeptic verifies and the Sender relies on, and it survives
monetization whenever that wakes.

## §3 — When money enters (post-density, post-proof)

The only shape that fits the mechanism is already sitting in the three-slot
rule:

- **A fourth slot — one-time.** Reachable only from the fourth-slot screen
  (Screen 9), only when a user holding three tries to place a fourth. Two
  equal doors: "let one go" (free, always) and "hold a fourth — $X, once."
- **Hold-indefinitely — one-time.** "Keep this ping standing without
  renewals." Same screen family, same one-off shape.

Priced as a small dignity-preserving one-off. This monetizes **intensity of
feeling**, never access to the core act; it never blocks anyone (slots can
always be freed by retiring); it needs no anchoring theater; and it touches
neither the share loop nor the first-ping experience. It will make less money
than a subscription in year one. That is the correct trade, and it is
reversible later; a poisoned first impression on a 2,000-person campus is not.

**Wake triggers** (any one, and only after at least one campus has properly
opened): a real density proof (a week-one reveal with numbers worth
retelling), or infrastructure costs exceeding ~$250/month, or repeated organic
user requests to hold a fourth. Waking is a deliberate decision recorded here,
not a growth-week improvisation.

**Implementation — built, and built exactly to that spec (migration 0021).** A
one-time Stripe checkout; `celestual_entitlements` keyed on the identity group
(via `celestual_handle_links`); every write service-role only, the grant coming
from a signature-verified webhook function (the
`celestual_complete_ig_verification` pattern); `c_standing_cap` gone, replaced by
per-person `celestual_cap_for()`. Prices: **$2.99** for one more standing ping,
one time, repeatable to a ceiling of ten. The free cap is 2, which is what the
client had always shown. Runbook: [STRIPE-SETUP.md](./STRIPE-SETUP.md).

**The one place the shipped shape argues with §1 and §5: the monthly plan.**
`$12.99/month` for ten standing pings, each held six months, has been in the
`/demo` sandbox for a while and is now buildable in production behind its own
second flag (`VITE_STRIPE_PLAN`, default `0`). §1 argues against exactly this and
§5 rejects "any subscription" outright, on grounds that have not changed: an
episodic product does not fit a recurring charge, and churn on a few-moments-a-year
product is a resentment machine. So the plan is **not** endorsed by this
document. It exists, it is off, and turning it on is a separate decision from
waking the one-time slot. If it does go on and the churn argument proves right,
the exit is the same one variable — and the honest thing then is to let existing
subscribers ride out what they paid for, which
`celestual_billing_plan_sync` already does.

The third shape §3 names, **hold-indefinitely**, is deliberately **not built**:
renewing is free and one tap, so a paid renewal sells what the free product
already gives. The sandbox previews it; production has no such door and no such
price.

## §4 — Costs (why $0 revenue is survivable indefinitely)

| Item | Now | At one dense campus |
| --- | --- | --- |
| Supabase | $0–25 | $25 |
| Vercel | $0–20 | $20 |
| Resend (match/lapse/campus mail) | $0 | ~$20 |
| ManyChat (verification relay) | $15 | $15–25 |
| Domain / misc | ~$2 | ~$2 |
| Stripe | $0 | $0 fixed, 2.9% + 30¢ per charge |
| **Total** | **≈ $20–60/mo** | **≈ $80–100/mo** |

Stripe deserves its own line only to name the one number that matters at this
price point: on a $2.99 charge the fee is about 39¢, so **roughly 13% of it is
Stripe's**. That is the cost of selling something this small, it is survivable
because there are no staff behind it, and it is another reason the answer is one
deliberate purchase rather than a stream of tiny ones.

No paid staff assumed. The architecture (SPA + Supabase, no app servers) makes
~90% gross margins the default whenever revenue does arrive.

## §5 — Deliberately rejected, permanently

| Idea | Why rejected |
| --- | --- |
| Any subscription (incl. the old Nova) | Recurring charge on an episodic product; churn + resentment; contradicts the thesis. **Still the position** — and the `$12.99/month` plan now sitting built-but-off in the code is the open argument with it, flagged in §3 rather than quietly dropped from this list |
| Paid slots as refills / faster pacing | Sells the Checker the attack |
| "See if they're active" / any info about the other side | The forbidden lever (FTC v. NGL); breaks the double-blind |
| Referral rewards in slots or pings | Mints probing capacity for distribution — worse than selling it |
| Cosmetic tiers (seal styles, themes, keepsakes) | Reintroduces monetization surfaces into emotional moments; the design now has one accent and zero variation on purpose |
| Ads | Torches intimacy for pennies; Meta-adjacent data optics |
| Urgency mechanics, pay-to-reveal-early | Poisons sincerity; banned at the copy level (VOICE §5) |
| Charging the Target for anything (incl. opt-out) | Existential violation |

## §6 — What to measure instead of revenue

The numbers that decide everything (framework Part 5): **ping resolution
rate** (the governing metric — the fraction of pings whose target is or
becomes present), match rate inside an opened campus, meter velocity per
window, door-card save → viewer-visit → placement conversion, renewal vs.
lapse rate. Revenue is a lagging function of exactly these; price work is
capped, density work compounds. Allocate accordingly.

# CELESTUAL — Product assessment framework

How to decide what the optimal CELESTUAL looks like — features, design,
functions, workflow, and pricing — and how to know you're right. Companion
docs: **[PERSONAS.md](./PERSONAS.md)** (who we're designing for) and
**[PRICING-REVENUE.md](./PRICING-REVENUE.md)** (monetization + forecasting).

## The plan we started from, and how this improves it

The original plan: *define personas → assess features/design/functions/workflow/
pricing per persona → stress test what breaks or loses customers → identify what
attracts users or makes it viral → price it.*

That's a solid skeleton. Four upgrades make it actually decide things:

1. **Constraints come before personas.** CELESTUAL has hard invariants (the
   anonymity model, the slot budget as a *security* control, the single reveal
   channel). Any feature or price that violates them is dead on arrival no
   matter how much a persona wants it — so filter first, then evaluate. §1.
2. **Metrics come before opinions.** "Would this persona like it?" is
   unfalsifiable. Every persona gets 2–3 measurable behaviors (activation,
   return, share), and every design question becomes "which option moves that
   number?" §2.
3. **The non-customer is a first-class persona.** CELESTUAL's most dangerous
   stakeholder is the person who gets *entered* without ever visiting the site.
   A framework that only scores paying/using personas will optimize into a
   trust collapse. §4, and the Bystander in PERSONAS.md.
4. **Stress tests get severity × likelihood scores and a named mitigation**, not
   a brainstorm list — so they turn into a ranked backlog. §4.

The sequence:

```
§1 invariants → §2 north-star metrics → §3 persona × dimension matrix
→ §4 stress tests (ranked) → §5 growth loops → §6 prioritize + instrument
→ §7 validate on /beta → repeat monthly
```

---

## §1 — Invariants: the lines no feature or price may cross

Score nothing until it passes these. Each maps to [SECURITY.md](./SECURITY.md).

| # | Invariant | Why it's absolute |
| --- | --- | --- |
| I-1 | **One-sided entries are never revealed, hinted at, or inferable** — not via UI, timing, counts, emails, or pricing tiers. | The entire brand is "zero-rejection, zero-leak." One credible violation ends the product (§4, T-2). |
| I-2 | **Probing capacity is never for sale.** The slot budget (SECURITY.md §4.0) is the anti-fishing control. Selling slots, slot refills, or faster regeneration sells the attack. | Monetization must come from elsewhere — see PRICING-REVENUE.md §2. |
| I-3 | **A named non-user costs nothing and risks nothing.** Suppression stays free, public, and discoverable. | The Bystander persona can destroy us in one press cycle. |
| I-4 | **The reveal moment stays sacred.** A mutual match is the product's single emotional payoff; nothing commercial interrupts it (upsells come *after*, if ever). | Cheapening the payoff cheapens every star sealed before it. |
| I-5 | **No dark-pattern urgency on longing.** No "she's about to expire," no fake activity signals. | The product monetizes sincerity; manufactured anxiety poisons the well and invites press disaster. |

Feature/pricing test: *"Does this let anyone learn anything about a one-sided
entry, buy more probes, or tax a bystander?"* If yes in any form, reject.

## §2 — Success metrics (define before designing)

**North star: sincere mutual matches per week.** Everything upstream exists to
produce this; everything downstream (retention, sharing, revenue) is produced by
it or by credible hope of it.

Supporting funnel — instrument every step (these become the calibration inputs
in PRICING-REVENUE.md §4):

| Stage | Metric | Definition |
| --- | --- | --- |
| Acquire | Visit → start | % of visitors who begin the flow |
| Activate | **Seal rate** | % of starters who seal ≥1 star |
| Verify | Verification completion | % who finish the IG DM step when it's on (measure drop-off *before* flipping enforcement) |
| Retain | D7 / D30 return | % who come back to their sky |
| Hope | Reminder opt-in | % of out-of-slots users who ask to be emailed — the cleanest "I still care" signal in the product |
| Payoff | Match rate | mutual matches ÷ sealed entries (density-dependent — track *per constellation*, not just globally) |
| Spread | K-factor | new users caused per active user (see §5) |

## §3 — The persona × dimension matrix

For each persona in [PERSONAS.md](./PERSONAS.md), score each product dimension
1–5 on *"does the current design serve this persona's job?"*, and attach the
metric that would prove it. Re-score monthly against real numbers.

Dimensions:

- **Features** — does the persona's job-to-be-done have a complete path?
  (e.g. the Yearner's job "hold a torch safely" is complete; the Ringleader's
  job "rally my group" is only as complete as constellations are.)
- **Design** — does the aesthetic *earn the sincerity*? The galaxy/keepsake
  framing is a differentiator: it converts "no match yet" from failure into
  ambiance. Score how well each screen sustains that (especially the empty sky).
- **Functions** — reliability of the few moments that matter: seal, verify,
  match email delivery (if the email lands in spam, the product silently fails
  at its one job), suppression.
- **Workflow** — count steps and abandonment at each: type @ → intent line →
  age gate → (verify) → seal. Every added step is measured against seal rate.
- **Pricing** — willingness to pay *and* whether charging this persona violates
  an invariant. (The Checker will pay the most — for exactly the thing I-2
  forbids selling. That cell is permanently ✗.)

Blank matrix to fill from live data:

| Persona → | Yearner | Checker | Reconnector | Ringleader | Skeptic | Tourist | Bystander |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Features | | | | | | | |
| Design | | | | | | | |
| Functions | | | | | | | |
| Workflow | | | | | | | |
| Pricing | | ✗ (I-2) | | | n/a | | ✗ (I-3) |

## §4 — Stress tests: what breaks, what loses customers

Each threat gets **Severity (1–5) × Likelihood (1–5)**, a leading indicator to
watch, and a mitigation. Ranked by score. This is the risk backlog.

### T-1 · Empty-sky silence — the #1 churn engine (S5 × L5 = 25)
Most users will *never* get a match (a 5% match rate means 95% of stars are
one-sided forever). The default experience is: seal a star → nothing happens →
never return. **Indicator:** D30 return among users with zero matches.
**Mitigations:** make the sky itself the retained value (keepsake framing,
anniversary-of-sealing moments, constellation ambient activity); set honest
expectations at seal time ("most stars stay quiet — that's the point"); the
reminder email as a sanctioned re-entry point. Never fake activity (I-5).

### T-2 · Trust collapse (S5 × L2 = 10, but severity is terminal)
One credible story — a leak, a perceived leak, or a viral *fake* "the site told
me who entered me" screenshot — and the sincere personas evaporate overnight.
**Indicator:** social mentions questioning anonymity; suppression-rate spikes.
**Mitigations:** the RLS/no-policies architecture (already strong); a public,
plain-language trust page derived from SECURITY.md; make match reveals visually
distinctive enough that fakes are recognizable; pre-written incident response.

### T-3 · Cold start / network density (S5 × L4 = 20 at launch)
Match rate scales with the *square* of density inside a social cluster. A
thousand users spread across a country ≈ zero matches ≈ T-1 for everyone.
**Indicator:** match rate per constellation vs. global. **Mitigation:** launch
cluster-by-cluster (a campus, a fandom, a city scene), not broadly —
constellations are the wedge; a constellation with 100+ members is a density
machine. Say no to broad press before density exists to pay it off.

### T-4 · Novelty-spike decay (S4 × L4 = 16)
The likely growth shape is a viral spike (TikTok/IG story moment) followed by a
cliff. The spike is only worth what week-4 cohort retention says it is.
**Indicator:** cohort curves per acquisition spike. **Mitigation:** have the
retention surfaces (T-1 mitigations, constellations) live *before* courting the
spike; capture emails (reminder opt-in) during it.

### T-5 · Creepiness optics / harassment framing (S4 × L3 = 12)
"A site where anyone can enter your name without consent" is one uncharitable
headline away. **Indicator:** suppression volume; press/social sentiment.
**Mitigations:** suppression is prominent and instant (already rate-limited
against griefing); the 18+ gate; marketing language always centers *your own*
feeling, never surveillance of others ("name them yourself" — never "find out
who likes you," which is the fishing frame and both a T-2 and I-2 violation
in spirit).

### T-6 · Verification friction at the seal moment (S3 × L4 = 12)
The IG DM step lands at peak emotional momentum; every extra minute costs seals.
**Indicator:** verify-step abandonment (measurable now while enforcement is
off). **Mitigation:** keep `require_ig_verification` off until impersonation is
*observed*, not theoretical; when it flips, verify once per handle, not per star.

### T-7 · Platform dependency (S4 × L3 = 12)
Meta tokens expire (~60 days), ManyChat is a third party, IG policy can shift,
and Resend deliverability decides whether the product's one payoff arrives.
**Indicator:** verification failure rate; email bounce/dead-letter count
(already surfaced by `celestual-notify`). **Mitigation:** token-expiry calendar;
the direct-Meta webhook as fallback path (already built); SPF/DKIM hygiene and a
`/match` in-app fallback view for when email fails.

### T-8 · Slot frustration vs. intentionality (S2 × L4 = 8)
The 3+1/week budget is load-bearing (I-2) but will annoy the Checker and some
Tourists. **Indicator:** out-of-slots screen views → reminder opt-in ratio (an
*opt-in* is frustration converted to retention; a bounce is churn).
**Mitigation:** the countdown + reminder flow (shipped); frame scarcity as
meaning ("a star should cost you something") — never apologize for it.

### T-9 · Ghost constellations (S3 × L3 = 9)
A constellation with 12 silent members reads as a dead room and *anti-markets*
the product. **Indicator:** members-per-constellation distribution.
**Mitigation:** the 100-rule (counts hidden under 100) already ships — extend
the principle: no activity feeds or timestamps that can look stale; ambient
visuals instead of counters.

## §5 — Growth: what attracts users and what makes it viral

**The structural insight: CELESTUAL's core loop is anonymity-blocked.** In a
classic viral product, using it invites someone. Here, the one person you most
want to invite is the one person you must never signal (I-1). So the entry
itself has a K-factor of ~0, and virality must come from **broadcast surfaces**
around the loop:

1. **The share card** ("I sealed a star tonight" — beautiful, anonymous,
   IG-story-native). Broadcasts *that* you yearn without *who*. Every viewer is
   a prospect, and the sender's crush might be in the audience — the honest
   version of the invite. Highest-leverage growth feature; also free
   marketing that money can't buy. Keep it free forever (see PRICING-REVENUE.md).
2. **Constellation links** (`/beta?c=name`) — the group-invite loop. One
   Ringleader importing a friend group or campus is worth hundreds of solo
   visitors *and* solves T-3 density. This is the loop to invest in most.
3. **The match story** — a mutual match is the most tellable story in the
   product ("we'd both entered each other for months"). Matched pairs are rare
   but their word-of-mouth conversion is near-total. Give them a beautiful,
   *optional* artifact to tell it with.
4. **The curiosity loop** — hearing about CELESTUAL makes you wonder if someone
   entered you; the only way to know is to name them yourself. Powerful, but
   market it as sincerity ("name them"), never surveillance ("find out who") —
   see T-5.

K-factor bookkeeping: `K = (share actions per active user) × (viewers per
share) × (visitor conversion)`. Instrument each factor separately per surface;
double down on whichever surface's K is highest rather than guessing.

**What attracts (vs. what spreads):** the aesthetic (a product that feels like a
keepsake, not an app), zero-rejection safety, and radical honesty about privacy
are the *conversion* assets — they turn arrivals into sealed stars. Sharing
surfaces are the *reach* assets. Don't confuse the two when prioritizing.

## §6 — Prioritization + instrumentation

Score every candidate change: **ICE = Impact on north star (1–5) × Confidence
(1–5) × Ease (1–5)**, with two gates before scoring: passes all §1 invariants,
and names the §2 metric it should move. Ship, measure that metric, keep or
revert. Anything scoring ≥ T-1 or T-3 mitigation should outrank new features by
default — retention and density fix compound problems; features don't.

Minimum event instrumentation (privacy-safe — counts only, never handle-level
analytics; that's an I-1 concern): visit, flow_start, sealed, verify_started /
verify_done / verify_abandoned, out_of_slots_viewed, reminder_optin, sky_return,
share_card_created, constellation_created / joined, match_revealed,
suppression. This list is exactly the calibration set PRICING-REVENUE.md needs.

## §7 — Validation cadence

- **/beta is the lab.** Intent lines and constellations live there,
  localStorage-only — perfect for measuring workflow abandonment and share
  behavior with zero backend risk. Graduate a beta feature only when its §2
  metric beats the control.
- **Monthly:** re-score the §3 matrix and §4 likelihoods with live data;
  recompute the PRICING-REVENUE.md model with measured funnel numbers.
- **Per spike:** run cohort curves (T-4) before spending on the next one.

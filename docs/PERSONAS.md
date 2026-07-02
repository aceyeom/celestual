# CELESTUAL — Personas

The seven people CELESTUAL must be designed around. Used by
[PRODUCT-FRAMEWORK.md](./PRODUCT-FRAMEWORK.md) (the §3 matrix and §4 stress
tests) and [PRICING-REVENUE.md](./PRICING-REVENUE.md) (persona-weighted
revenue). Three of the seven are not customers in the usual sense — the
Checker is a semi-adversary, the Skeptic is a gatekeeper, and the Bystander
never visits at all — but designing without them is how this category of
product dies.

Estimated mix = share of *visitors* (not users; the Bystander doesn't visit).
These are launch-phase priors — replace with measured data as instrumentation
(FRAMEWORK §6) comes online.

---

## P1 · The Yearner — the core user (~30% of visitors)

Someone quietly carrying a feeling — an unspoken crush, months or years old —
that they can't act on and can't put down. Often found the site late at night
via a friend's story share.

- **Job to be done:** *"Give this feeling somewhere safe to live, and a
  nonzero chance of an answer, with zero risk of humiliation."*
- **What delights them:** the keepsake aesthetic; the seal ritual; the intent
  line ("why them?") as a private confession; the absolute promise that a
  one-sided star is invisible.
- **What breaks them (loses the customer):** *any* doubt about anonymity
  (T-2 — they churn instantly and warn friends); a cheap or gamified tone;
  commercial interruption of the emotional moments (I-4/I-5); the empty-sky
  silence if the product gives them no reason to revisit (T-1).
- **Virality contribution:** medium-high — the share card is made for them;
  they broadcast the *feeling*, never the name.
- **Willingness to pay:** moderate, for meaning: sky cosmetics, keepsake
  exports, a supporter tier. Never for mechanics.
- **Metrics:** seal rate, D30 sky return, share-card creation rate.

## P2 · The Checker — the fisher (~20%)

Came to find out *who likes them*, not to confess. Wants to enter five likely
admirers and read the answers. The slot budget (SECURITY.md §4.0) exists
because of this persona; at the extreme they shade into the abuser the whole
security model targets.

- **Job to be done:** *"Map who's into me, cheaply."*
- **What frustrates them:** exactly the things that must not change — 3 slots,
  +1/week, no refund on withdrawal. Good. The design goal is not to satisfy
  this job but to *convert* it: a Checker who spends a scarce slot on the one
  person they actually care about has become a Yearner.
- **What loses them acceptably:** slot walls (T-8). What loses them
  *unacceptably:* nothing — some Checker churn is the security model working.
- **Virality contribution:** high in dark-pattern form ("find out who likes
  you!") — which is banned framing (T-5). Modest in honest form.
- **Willingness to pay:** the highest in the product — for slots, refunds, and
  probes. **Permanently unmonetizable (I-2).** Any revenue model that leans on
  the Checker has sold the attack.
- **Metrics:** out-of-slots views, withdraw-then-resubmit patterns,
  rate-limit hits.

## P3 · The Reconnector — the ex (~15%)

It ended, but maybe not really. They want to know if their ex still thinks
about them without being the one who reached out first. The product tagline
("is that special somebody still thinking about you?") speaks to them directly.

- **Job to be done:** *"Reopen a door without knocking."*
- **What delights them:** mutual-only reveal is *precisely* the post-breakup
  contract — neither side loses face; the reminder email that respects that
  they'll check back for months.
- **What breaks them:** anything that could tip off the ex to a one-sided
  entry (I-1 — for them the stakes are social circles, not just embarrassment);
  the multi-account linking failing them when the ex knows their old handle.
- **Virality contribution:** low broadcast, high whisper — they tell one
  best friend, who is usually another Reconnector or Yearner.
- **Willingness to pay:** highest *emotional* stake per star; strong keepsake
  and supporter-tier candidate, especially post-match.
- **Metrics:** reminder opt-in, long-horizon return (D60/D90), match rate on
  entries older than 30 days.

## P4 · The Ringleader — the community catalyst (~5%, worth 10× their share)

The social organizer: creates the constellation for the dorm, the friend
group, the fandom, the office. Doesn't necessarily seal a star themselves —
their product is the *event* of everyone doing it together.

- **Job to be done:** *"Give my group a shared thing that's exciting tonight."*
- **What delights them:** one link that carries the whole community
  (`/beta?c=name`); the constellation feeling *theirs* (name, glyph); the
  100-rule building mystique instead of exposing a small count.
- **What breaks them:** ghost-town signals (T-9) — a constellation that looks
  dead embarrasses *them* personally, and they never bring a group again;
  clunky joining (every extra step multiplies across their whole group).
- **Virality contribution:** **the highest-leverage persona in the product.**
  One Ringleader = dozens–hundreds of arrivals *in the same social cluster*,
  which is what makes matches actually happen (T-3 density). Growth strategy
  is largely "find and arm Ringleaders."
- **Willingness to pay:** the best *clean* monetization target: constellation
  pro features (custom glyphs, naming, capacity, event modes) charge for
  community expression, not probing — fully I-2-compatible.
- **Metrics:** constellations created, members per constellation, joins per
  shared link, match rate inside vs. outside constellations.

## P5 · The Skeptic — the privacy gatekeeper (~10%)

Reads the privacy page before typing anything. Often the friend the Yearner
asks "wait, is this safe?" — which makes them a *gatekeeper for other
personas' conversion*, not just their own.

- **Job to be done:** *"Prove to me this can't leak before I put a name in."*
- **What delights them:** the real architecture (RLS, no client reads,
  suppression, no paywall on erasure) — *if it's legible*. A plain-language
  trust page derived from SECURITY.md converts this persona.
- **What breaks them:** vague privacy copy; any dark pattern anywhere (they
  generalize instantly); requiring more identity than the product needs.
- **Virality contribution:** negative if unconvinced (they actively
  warn people off), quietly positive if convinced ("I checked it out,
  it's actually legit" is the highest-trust referral that exists).
- **Willingness to pay:** low, and irrelevant — their value is unlocking
  everyone they gatekeep.
- **Metrics:** privacy/terms page views → seal conversion; suppression rate.

## P6 · The Tourist — the spike rider (~20% baseline, ~80% during a viral spike)

Arrived from a TikTok or a story share, curious, zero investment. Will give
the product ninety seconds.

- **Job to be done:** *"Show me the thing everyone's talking about."*
- **What delights them:** the intro motion graphic; instant comprehension;
  `/demo` and `/beta` letting them feel the whole loop without commitment.
- **What breaks them:** any friction before the aha (verification at first
  seal = T-6; long copy; sign-up walls the product correctly doesn't have).
- **Virality contribution:** high volume, low depth — they *are* the spike
  (T-4). The job is converting a few percent into Yearners before they
  evaporate; the reminder opt-in is the net.
- **Willingness to pay:** ~zero. Don't design monetization around them.
- **Metrics:** visit → seal conversion, week-4 cohort survival per spike.

## P7 · The Bystander — the named non-user (not a visitor; ~1 per entry)

Every sealed star names one. They didn't sign up, may never hear of the site,
and were entered without consent. **Not a customer — a stakeholder with veto
power over the product's existence** (T-2, T-5, I-3).

- **Job to be done (when they do show up):** *"Get me out of this, now,
  completely, for free."*
- **What the product owes them:** never learning they were entered (one-sided
  invisibility protects them as much as the sender); instant free suppression
  and erasure; never being marketed to off the back of being named.
- **What breaks everything:** a Bystander-turned-victim story in public — the
  uncharitable headline writes itself (T-5). Suppression being hard to find,
  rate-limited into uselessness, or — worst of all — ever paywalled.
- **Willingness to pay:** the question itself is an I-3 violation.
- **Metrics:** suppression volume and latency; zero successful
  entry-inference attempts, forever.

---

## Reading the mix

- **Design for:** P1 Yearner (soul of the product) and P3 Reconnector
  (deepest stakes).
- **Grow through:** P4 Ringleader (density + distribution) and P6 Tourist
  (volume to convert).
- **Monetize:** P1/P3 (meaning) and P4 (community tools) —
  see PRICING-REVENUE.md.
- **Defend against / for:** P2 Checker (contain, convert, never monetize)
  and P7 Bystander (protect absolutely).
- **Convert via:** P5 Skeptic (make the real security legible).

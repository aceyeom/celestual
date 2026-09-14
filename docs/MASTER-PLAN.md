# The master plan

**Berkeley, autumn 2026 through autumn 2027.** This document replaces the
operating manual dated September 2026. It keeps one idea from it, kills four,
and rebuilds the rest on numbers that survive being checked.

It reads against, and does not restate,
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) (the growth
mechanism and its honest odds), [WALL-FEATURES.md](./WALL-FEATURES.md) (the
nine gates every proposal passes), [PERSONAS.md](./PERSONAS.md) (the Target,
who has a veto and is never a customer), [PRICING-REVENUE.md](./PRICING-REVENUE.md)
(why the answer has been nothing, deliberately) and
[`app/src/wall/README.md`](../app/src/wall/README.md) (what the wall actually
is). Where this document disagrees with one of those, it says so and argues it.
Where it agrees, it does not re-derive.

Every number below is labelled **measured** (read off the repo or a cited
source), **derived** (arithmetic from measured numbers, shown) or **estimated**
(a prior with a date attached, to be replaced by the first night's data).

---

## 00 · The one-page version

The operating manual found something real and then attached it to the wrong
purpose.

**What it found.** The product's own framework names its most likely killer in
one line: *most users' complete experience is that they entered someone and
heard nothing, forever* (framework Fact 2, failure mode 1). Marriage Pact beats
this by guaranteeing a payoff — fill in the survey, receive a name. Celestual
has never had one. A dated room fixes that exactly: write a letter, and the
person you wrote about is invited somewhere, on a date, where you will also be.
The letter stops being a lottery ticket and becomes an act with a consequence.
**That is the best idea anyone has had about this product and it is the spine of
everything below.**

**What it got wrong.** It made the room the revenue engine. Once it did that,
five things followed that each break independently:

1. The ceremony that is the whole reason people come **fires for 0.5 couples**
   in a 200-person room under the manual's own design. Simulated, §03.
2. The venue economics assume a 21+ bar. **Sixty percent of Berkeley
   undergraduates cannot legally stand in one**, and a bar will not pay per head
   for a crowd that cannot drink. §05.1.
3. Charging the person who was written about **is the one thing this product's
   constitution forbids**, and the model it creates pays the operator more the
   more people are written about without consent. §06.4.
4. A public wall of scraped faces stops being expressive content and starts
   being **commercial solicitation using non-consenting likenesses** the moment
   there is a cover charge behind it. §05.3.
5. The campaign cannot legally run the way it is written, and costs **four to
   five times** what the manual budgets. §05.4, §06.1.

**What to do instead.** Run the room at break-even on purpose. Its output is
density, verified students, film and proof — not margin. Fund it with one small
local sponsor pre-sold before night one, a cover charge on people who chose to
come, and a 21+ bar leg that starts after the ceremony ends. Charge no student
for anything that happens inside the app, ever. The corrected business tops out
near **$2,600 a night**, not $5,900, and needs about **$6,000 of float** to
reach the night where it stops losing money. That is a good small business
attached to a product that finally works, and it is the honest shape of this.

---

## 01 · Verdict on the operating manual, line by line

| From the manual | Verdict | Where |
| --- | --- | --- |
| The room manufactures a reason to show up | **Keep. It is the thesis.** | §02 |
| Optimise for letters, not matches | **Keep.** The repo agrees; density is the constraint | — |
| Entry costs a letter, so the room has its own material | **Keep the instinct, rebuild the mechanism.** One letter is not enough and the door cannot take a letter today | §03, §07.2 |
| Recipient handles never displayed | **Reject as written, adopt the half that matters.** The index is load-bearing and shipped. The *faces* come off | §05.3 |
| Pre-publication LLM review | **Already shipped, and shipped better.** The letter goes up first and the classifier reads after (0050). Do not undo this | §04 |
| 21-day campaign, party revealed on day 11 | **Keep the shape, halve the confidence, move it off campus** | §08 |
| $7 to reply, refunded in seven days | **Kill.** Charges the Target; inverts the safety incentive; the Stripe hold expires at exactly seven days | §06.4 |
| $2 "tell me if it happens" | **Kill.** It is NGL Pro's structure with the deception removed, sold at the most vulnerable moment. The free version already exists and is the front door | §06.4 |
| Mutual reveal as the jackpot, not the required path | **Keep, and give it an engine.** There is no mutual-letter object in the schema | §03, §07.3 |
| Ambassadors DM 400 named people individually | **Keep the labour, fix the channel.** Cold DMs land silently in Requests and 80 each will trip action blocks | §05.2 |
| One guest each, not two | **Keep.** Correct and well-argued | §09 |
| Venue pays $8 a head, performance-only | **Keep the deal, halve the head count it applies to.** It is a 21+ deal | §05.1, §09.2 |
| $15 cover for anyone not on the list | **Keep at $10–12.** This is the only defensible consumer charge in the product | §06.3 |
| Sponsor ladder, film as the differentiator | **Keep. Re-sequence: pre-sell one small one before night one** | §10 |
| Run two nights unsponsored | **Reject.** You cannot afford to, and a $750 local sponsor needs no track record | §10 |
| Net $5,900 on a sponsored night | **Wrong by ~2.2×.** Corrected model in §06 | §06 |
| $23,000/month across four cities | **Wrong by ~2.2×, and each city needs a body on a Tuesday** | §06.5 |
| Kill criteria set in writing, in advance | **Keep, and tighten.** Excellent discipline | §12 |
| The engine is yours, the room is theirs | **Keep. It is the only honest reading of the constraint** | §13 |

Four things the manual does not contain at all, and each is load-bearing:

- **The Named Card.** The strongest growth object available to this product,
  and it is not in the document. §07.1.
- **The guaranteed floor.** The ceremony needs something that fires for
  everybody, not only for the lucky. §03.
- **The registered-student-organisation gate**, which decides whether any of
  the campaign is legal this semester. §05.4.
- **A cycle.** Letters lapse in thirty days. A monthly night with a 21-day
  campaign empties the wall between events unless the two clocks are set
  against each other. §08.4.

---

## 02 · The one idea worth keeping, stated properly

The framework's honest odds section is unusually candid about where this
product dies:

> *Most users' complete experience: enter someone, hear nothing, forever. The
> design mitigates but cannot cure.* — framework, Part 6, failure mode 1
>
> *Marriage Pact worked in large part because it guaranteed a payoff… Celestual's
> expected payoff per user is a fraction of that. This gap is real, it is
> structural.* — framework, Part 1, Fact 2

Every mitigation the framework offers is a consolation: expectation-setting at
the send moment, aggregate reveals, a renewal email. They soften silence. None
of them converts it into an event.

A dated room does. Trace what changes for the person writing:

| | Before the room | With the room |
| --- | --- | --- |
| What writing buys | a chance, of unknown size, at an unknown time | **a named person invited to a place, on a date, where you will be** |
| When you find out | possibly never | a date you can count down to |
| What you can tell a friend | nothing, without confessing | "the thing on the 8th" |
| Whether the act is social | private, and slightly lonely | an act inside a shared campus event |

That is the Marriage Pact property, obtained without a survey and without
promising anybody a match. And it converts the product's worst structural
feature — that the outcome is probabilistic — into a scheduling problem, which
is a solvable kind of problem.

**The room is therefore not a side business. It is the missing half of the
product**, and it should be funded and measured as product, not as an events
company with an app attached. Everything in §06 follows from taking that
seriously.

---

## 03 · The arithmetic that kills the ceremony, and what replaces it

The manual's 01:00 unlock is the reason people are supposed to come. It does not
work, and the reason is arithmetic rather than execution.

### 3.1 The number

Take a room of *n* people. Each writes *m* letters aimed at someone in the
room. Write *r* for the real chance that the person you wrote about
independently wrote about you — the assortative rate, well above the random
baseline of *m*/(*n*−1), because people write about people they are actually
drawn to.

Expected mutual pairs ≈ (*n* · *m* · *r*) / 2, and under pure chance (*r* = 0)
it collapses to **≈ *m*² / 2 — independent of room size.** A bigger room does
not help. Simulated over 4,000 nights per cell, *n* = 200 — run it yourself with
`node scripts/mutual-yield.mjs`:

| letters each | *r* = 0 (chance) | *r* = 0.05 | *r* = 0.08 | *r* = 0.12 | got no letter at all |
| --- | --- | --- | --- | --- | --- |
| **1** — the manual's design | **0.5 pairs** | 10.5 | 16.4 | 24.4 | **34–37%** |
| **2** | 2.0 | 21.8 | 33.6 | 49.1 | 10–13% |
| **3** | 4.5 | 33.9 | 51.2 | 74.0 | 3–5% |

Read the first row. Under the manual's own design — one letter at the door — if
nothing but chance is operating, **one couple in the whole room** gets a reveal,
and **more than a third of the room gets no letter at all**, stands there at
01:00 holding a phone that does nothing, and goes home having watched other
people have a moment.

The manual anticipates the symptom ("Room full, no connections") and diagnoses
it as an enforcement failure: *the door writing station was not enforced.* It
was not an enforcement failure. Enforcing one letter perfectly still yields
0.5 pairs at chance. The lever is not compliance. It is *m*.

### 3.2 The two fixes, both required

**Fix one: three letters at the door, aimed at the room.** Going from one to
three moves chance-only mutuals from 0.5 to 4.5 and — the number that matters
more — takes the share of the room that receives nothing from 37% to 4%. The
composer must therefore suggest from the people who are actually present, not
from the wall at large: a letter about somebody who is not in the building
cannot resolve tonight. §07.2 has the mechanism.

**Fix two: stop making the mutual the payoff.** Even at three letters and a
generous *r*, the reveal fires for a minority. A ceremony whose payoff reaches a
minority is a ceremony that teaches the majority they were extras in somebody
else's evening.

So the hour has two movements, in this order:

> **The count, then the reveal.** Every phone in the room lights at the same
> second with one true sentence: *tonight, N people in this room wrote about
> you.* That fires for 88–96% of the room at *m* = 2–3. Then, and only then,
> the mutual pairs resolve — ten to twenty of them, thirty to fifty people, a
> real and visible fraction of the floor.

A guaranteed floor and a rare ceiling. It is the Marriage Pact structure exactly
— everybody receives something, a few receive something extraordinary — and it
is the difference between a ceremony and a raffle.

### 3.3 Does the count pass the gates

It must be checked against G2, *silence in, silence out*, which forbids telling
a specific person that something was done about them. Three things make it pass,
and all three must hold:

1. **The information is already theirs.** Anyone can search their own handle and
   learn a letter exists. The count adds delivery, not disclosure.
2. **It is a count and never a name**, which is the line G2 actually draws.
3. **It is consented, explicitly, at the door.** Writing at the door is also
   opting into the hour. One line on the writing station: *at 1:00 you'll see
   how many people here wrote about you tonight.* Somebody who does not want
   that does not write, and does not receive it.

The third is not decoration. It is what separates this from a notification
pushed at a person who never asked, which is the thing that must never exist.
**The count fires only for people who wrote at the door.** No exceptions, and it
is enforced in the data model, not in the run of show.

---

## 04 · What is actually built, against what the manual assumes

The manual is written as though the wall is a sketch. It is not. Measured, from
the repo:

| The manual assumes | Shipped reality |
| --- | --- |
| "Handle search with live resolution — you already built this" | **True.** Apify resolver, permanent cache, three caps, stored face (0031/0037) |
| "Pre-publication LLM review; nothing appears until it clears" | **Superseded, deliberately.** 0050 turned the order round: regex refuses at the keyboard and on the server, the letter goes up, the classifier reads after and can take it down, a person at the desk holds the ambiguous. A letter is never held waiting on a model. **Do not reinstate pre-publication holding** — it was tried and it was a writer watching nothing appear for hours |
| "Opt-out list, checked at submission" | **Built (0046), not applied.** Until it is applied, `/optout` leaves every letter *about* that person standing. This is the highest-priority outstanding migration in the repo |
| "Ship a one-tap removal path, no account" | **Shipped.** The flag on every letter; `/berkeley/remove` for a whole name behind an Instagram proof |
| "Email fallback for verification" | **Shipped and is the primary.** `berkeley.edu` + six digits is the write gate; the Instagram DM proof is the second door (0044) |
| "Letter numbering, jump-to-letter field" | **Not built.** The deck turns by swipe and the header carries `3 / 19`. A printed number that is also a search query does not exist |
| "$7 reply channel" | **A better version is shipped and free**: `wall_claim` → `wall_reveal_request` (one ask per letter, ever) → `wall_letter_seal`. Consented at both ends, nobody watching |
| "Mutual reveal when two people wrote about each other" | **Does not exist, in any form.** `mutual` belongs to Main's pings. There is no mutual-letter object, no pairing function, nothing. The ceremony's engine is unbuilt |
| "Everyone writes at the door, sixty seconds" | **False today.** `wall_write` calls `wall_gate`, which requires a verified `berkeley.edu` address: enter address → receive mail → enter six digits → write. Three to five minutes on venue wifi, not sixty seconds. And the allowance is three letters in any five days (0051), which the door would spend in one night |
| "Tell me if it happens — $2" | **The free version is shipped and is the whole point of the wall.** The tab at the foot, and `wall_waitlist`, whose own migration comment calls it *"commercially the most valuable table here"* |
| An event, a guest list, an RSVP, a door | **Nothing. Zero rows, zero tables, zero routes.** Everything the room needs is unbuilt |

Two conclusions. The app is further along than the manual credits, and the
*room* is further behind than the manual credits. The build list in §07 is the
gap, and it is smaller than it looks because four of the five pieces are small
additions to mechanisms that already exist.

---

## 05 · The five things that break it

### 5.1 Sixty percent of the population cannot enter the venue

A California **Type 48** licence — the ordinary bar and nightclub licence — bars
anyone under 21 *from the premises*, not merely from drinking. A **Type 47**
licence, held by a bona fide eating place, admits them. ([CA ABC licence
types](https://www.abc.ca.gov/licensing/license-types/); [Type
48](https://www.liquorlicenseagents.com/california-liquor-license-type-48/))

**Sixty percent of UC Berkeley's 33,122 undergraduates are 18–21.**
([UnivStats](https://www.univstats.com/colleges/university-of-california-berkeley/student-population/);
[UC Berkeley OPA](https://opa.berkeley.edu/campus-data/uc-berkeley-quick-facts))
The manual's own sponsor email says *average age 20*. An average of 20 in a room
that requires 21 is a contradiction sitting in the pitch.

And the second half is worse than the first. **A bar pays per head because it
makes the money back at the bar.** A crowd that cannot legally buy a drink
generates no bar revenue, so there is nothing to pay you out of. This is not a
negotiating problem; it is where the money comes from. Venues that run 18+
nights profitably do it on the **cover charge** instead — Providence's 18+ clubs
run on $10 at the door — which means an 18+ deal is a *door split*, never a
per-head payment.
([Boston.com](https://www.boston.com/news/the-boston-globe/2023/08/31/why-does-providence-have-so-many-18-plus-nightclubs/))

The manual's $2,000 venue line assumes 250 people, all 21+, at $8. Corrected: at
a 200-person Berkeley room, roughly 85 are 21+, and the realistic per-head band
is $5–10. **$425–850, not $2,000.**

**The fix is a two-leg night, and it is better than what it replaces.**

- **Leg one, 20:00–22:45, all ages.** The wall, the writing, the projection, the
  count, the reveals, the film. A venue with no Type 48 problem: a room you rent
  or partner into. The whole population is eligible. This is the product.
- **Leg two, 23:00–close, 21+.** The subset that can drink walks five minutes to
  a bar that has agreed a per-head deal. They arrive as one group, pre-warmed,
  at the hour a Tuesday bar is dying — which is a *more* attractive proposition
  to a bar than a trickle, and is exactly what promoters sell.

You get the whole campus at the part that makes the product work, and the bar
money from the part that can pay for it. Night one runs leg one only; the bar
leg is added at night two, once you have a head count to sell.

### 5.2 The invitation does not arrive

The manual's funnel turns 400 named people into 300 reached, and calls 30%
attendance from reached "the key unknown". The unknown is upstream of that.

**A DM from someone you do not follow lands in Message Requests, and Instagram
sends no push notification.** It sits there silently until the person happens to
open the Requests folder. Instagram additionally routes anything it reads as
bulk or promotional into *Hidden Requests*, one level deeper.
([Pallyy](https://pallyy.com/blog/how-to-see-message-requests-on-instagram);
[Hooleft](https://hooleft.me/blog/instagram-dm-requests-from-non-followers))

So the manual's highest-leverage step delivers its message into a folder with no
doorbell. And the volume compounds it: safe cold-DM throughput is roughly
**10–50 a day** on an established personal account, with new accounts blocked
after 5–10; eighty each over three days is about 27 cold DMs a day per
ambassador, right at the edge where action blocks start.
([Flowgent](https://flowgent.ai/blog/instagram-dm-limits-how-many-messages-you-can-send-daily);
[Wave](https://www.usewave.co/blog/instagram-dm-limits))

Then the last leg: **free events lose 28–50% of confirmed RSVPs to no-shows**,
and free events no-show at roughly 1.5× paid ones.
([Nunify](https://www.nunify.com/blogs/event-attendance-rate);
[Metabase](https://www.metabase.com/metrics/rsvp-to-attendance-conversion))

**Fix, in order of leverage.**

1. **Follow first, DM second.** An ambassador who follows an account and waits
   a day is frequently followed back; a DM from a follower lands in the primary
   inbox with a notification. Rate-limit the follows too, but this single change
   is worth more than doubling the DM count.
2. **Prefer the people who can be reached without a DM.** Named people who
   already hold a verified handle or a campus address are reachable by mail,
   which arrives. Rank the ambassador list by that.
3. **Make the wall do the reaching.** The index is public. On a campus, "go
   search your @ on that thing" travels faster than 400 DMs and costs nothing.
   The manual treats DMs as the reach channel; on a dense campus, **word of
   mouth is the reach channel and the DM is the closer.**
4. **Cap it honestly.** Forty DMs per ambassador over five days, from accounts
   at least six months old, never from the brand account. Five ambassadors
   reaches 200 well rather than 400 badly.
5. **A free list is a soft commitment.** Confirm on the day, in the morning, in
   one line. The manual's "invites go out D18–20, list closes at noon D21" is
   right; the morning-of touch is what converts the RSVP.

### 5.3 The wall of faces becomes commercial the day there is a cover charge

The hive draws **one disc per person written to, carrying the profile picture
the resolver has** — scraped, via Apify, of people who did not consent to any
part of it.

Today that is defensible: a public wall of anonymous letters is expressive
content, and expressive content about identifiable people has strong protection.
**A cover charge changes the character of it.** California Civil Code §3344
creates liability for knowingly using a readily identifiable person's photograph
"for purposes of advertising or soliciting purchases of… services" without
consent, with **statutory damages of $750 per plaintiff plus attorney's fees**,
and California added injunctive relief in 2025 (SB 683).
([FindLaw](https://codes.findlaw.com/ca/civil-code/civ-sect-3344/);
[Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-adds-injunctive-relief-to-its-right-of-publicity-statute-and-extends-liability-to-digital-replicas))

Whether a given use is "directly connected" to the solicitation is a question of
fact. That is exactly the kind of question you do not want to be answering, with
several hundred identifiable plaintiffs available, about a business run by two
people.

**Two changes remove the exposure entirely, and both are cheap.**

- **The faces come off before the first ticketed night.** Monograms only. The
  hive already renders a monogram whenever the resolver has no picture, so this
  is a flag, not a rewrite — and the field's whole design is a function of
  distance from the light, which is untouched by what is inside the disc. Keep
  the resolver: it is still how a person confirms they have the right account in
  the search. Stop putting it on the public field.
- **Nothing commercial ever appears on the wall.** The repo already holds half
  of this rule — *the sponsor appears in the room and in the film, never on the
  wall* — and it should be widened to everything: not the sponsor, not the
  ticket, not the price, not the date. The event is announced in the DM, on the
  event page, and on the flyer. **The wall never sells anything.** That keeps it
  expressive content, which is what keeps it protected, and it happens to be the
  same rule the design already wanted for aesthetic reasons.

One more from the same family: **UNC's system banned Yik Yak, Fizz, Sidechat and
Whisper across sixteen universities** at the network level.
([TechCrunch](https://techcrunch.com/2024/03/07/anonymous-social-apps-face-another-reckoning-as-unc-system-to-ban-yik-yik-fizz-sidechat-whisper/))
The manual's answer to university objection — *nothing happens on campus
property* — does not address a DNS block, because a block does not require the
university to have jurisdiction over anything but its own network. The defence
is the safety architecture and the speed of the takedown, documented and ready
to send to Student Affairs on the day they ask. Which is §11.

### 5.4 The campaign as written cannot legally run, and the fix is a partner

Berkeley campus regulations: organisations **may not leave flyers unattended on
campus grounds or in classrooms**, nothing may be attached to doors, buildings
or posts, flyers go on bulletin boards and kiosks only, chalking is defacement,
and a table must be staffed at all times by a member of the **sponsoring
organisation**. ([Campus regulations](https://sa.berkeley.edu/campus-regulations);
[Promote your org](https://lead.berkeley.edu/student-orgs/manage-your-org/promote-your-org/))

Cafeteria tables, library carrels and under dorm doors — the manual's three
placements — are, in order: unattended on campus grounds, unattended on campus
grounds, and affixed to doors in buildings with their own residential rules.

And the obvious remedy is closed. Becoming a registered student organisation
means a **semester-long advising programme**, with applications due **1 July or
1 December**. ([New organisation
programme](https://lead.berkeley.edu/student-orgs/create-a-new-student-org/))
There is no path to being an RSO this autumn. RSO status is also what carries
Sproul tabling, campus room reservation, **free insurance for most on-campus
events**, and the right to post flyers at all.

**Two moves, both available now.**

1. **Partner with an RSO that already exists.** Berkeley has over a thousand.
   One of your ambassadors is plausibly already an officer of one, and if not,
   one wants a free event with a film crew. The partner books the room, tables
   on Sproul, posts the flyers and carries the on-campus insurance; Celestual
   brings the product, the campaign and the money. **This is the single highest-
   leverage operational move in the plan** and it converts every row above from
   blocked to routine. Check the partner's own rules on outside sponsorship
   before anything is printed.
2. **Run everything else off campus property.** Telegraph, Bancroft and
   Durant sidewalks are city right-of-way. Off-campus apartment buildings, the
   co-ops, coffee shops with the manager's yes, bookshops, laundromats. A card
   handed to a person beats a card left on a surface anyway, and it is the
   difference between a flyer and litter — which is the manual's own good
   instinct, correctly applied.

**File the RSO application by 1 December 2026.** It unlocks spring 2027, which
is the semester before the founder is back, which is when the real offensive
starts. §12.

### 5.5 The cost model is missing most of the costs

The manual's night costs $875 and its worst case nets +$800. Three whole
categories are absent.

- **Insurance.** No venue confirms a booking without a certificate naming it as
  additional insured, typically **$1M per occurrence / $2M aggregate**, and host
  liquor coverage wherever there is alcohol. A one-day California policy at this
  size runs roughly **$250–400 dry, $500–750 with liquor liability**.
  ([Eventure](https://www.eventureinsurance.com/coi);
  [Inszone](https://inszoneinsurance.com/blog/understanding-special-event-insurance-california);
  [Insureon](https://www.insureon.com/small-business-insurance/special-event/cost))
  This is a blocking cost, not a prudent one.
- **The campaign.** Twenty seed posters at $50–200 is **$1,000–4,000**, and it
  appears in §03 of the manual but in none of its P&Ls. Nor do the cards, the
  physical wall, or the ambassadors — who are asked for the campaign's highest-
  leverage labour and are not in any budget.
- **The room itself**, once it is all-ages. The $875 works only because the
  manual assumes a bar absorbs every fixed cost. An all-ages venue does not; it
  charges rent.

Corrected in §06. The headline: **night one is roughly a $3,900 loss, not an
$800 profit.**

---

## 06 · The money, honestly

### 6.1 Night one — Berkeley, all ages, one leg, no sponsor

*Derived. 200 heads, built from the funnel in §06.2.*

| Out | | | In | |
| --- | --- | --- | --- | --- |
| Venue (partner room or small private space) | $400 | | Cover, 20 walk-ups × $10 | $200 |
| Insurance, GL $1M/$2M, dry | $250 | | Sponsor | $0 |
| Door ×2, writing station ×1, floor lead | $325 | | Bar leg | — |
| Camera | $150 | | | |
| Print, projector hire, contingency | $350 | | | |
| **Night** | **$1,475** | | | |
| Cards, 3,000 across 6 variants | $220 | | | |
| Physical wall, two weekends | $180 | | | |
| 20 seed posters | $1,500 | | | |
| 5 ambassadors | $750 | | | |
| **Campaign** | **$2,650** | | | |
| **Total out** | **$4,125** | | **Total in** | **$200** |

**Night one: −$3,925.** That is the number, and it is the most important
correction in this document. Night one is an investment in a proof, and it
should be approved as one.

### 6.2 Where the two hundred come from

*Derived, with every rate labelled.* The manual's funnel is 500 → 400 → 300 →
90 → 200. This one starts from what a cold campaign actually produces and is
roughly 40% more conservative at every joint.

| | Count | Rate applied | Basis |
| --- | --- | --- | --- |
| Card scans over 21 days | 3,000 | — | estimated; 6 variants, distinct QR paths |
| Searched a handle | 600 | 20% of scans | estimated |
| **Letters written** | **400** | — | estimated; the reveal on D11 is what makes writing rational |
| Distinct writers | 260 | 1.5 letters each | derived; cap is 3 per 5 days |
| Distinct handles named | 330 | — | derived |
| Named people reached | 180 | **55%**, not 75% | §05.2. Wall + word of mouth + 200 well-aimed DMs |
| Named who attend | 50 | **28% of reached** | estimated; high for an event, low for a personally-addressed one |
| Writers who attend | 90 | 35% | estimated |
| +1s taken | 56 | 40% of the 140 free | estimated |
| Walk-ups paying | 20 | — | estimated |
| Less overlap (a writer who is also named) | −16 | — | derived |
| **In the room** | **200** | | |

The manual's 200 is defensible. The path it draws to 200 is not. If letters come
in at 400 and the room comes in at 200, the model is working; if letters come in
at 400 and the room comes in at 90, the reach leg is broken and §05.2 is where
to look.

### 6.3 Nights two through five

| | Heads | Cover | Bar leg | Sponsor | Out | **Net** |
| --- | --- | --- | --- | --- | --- | --- |
| **1** all ages, one leg | 200 | $200 | — | $0 | $4,125 | **−$3,925** |
| **2** + 21+ bar leg | 250 | $720 | $595 | $750 | $2,400 | **−$335** |
| **3** first real sponsor | 280 | $840 | $665 | $2,000 | $2,400 | **+$1,105** |
| **5** steady state | 300 | $900 | $750 | $3,000 | $2,000 | **+$2,650** |

Bar leg: 34% of the room is 21+, of whom 75% walk over, at $7 a head. Cover:
$12 from night two, paid only by people not on the list.

**Cumulative cash to the first profitable night: about $6,000**, and the
trough is after night one. That is the real ask. It is findable — six months of
two people's savings, or one pre-sold local sponsor, or a parent — but it has to
be named before anything is printed, because discovering it on the morning after
night one is how this ends.

### 6.4 Why nothing inside the app is for sale

The manual sells two things. Both are rejected, and the second argument is the
one that matters.

**$7 to reply.** It charges the person who was written about. The product's own
persona document is unambiguous: the Target is *"not a customer — a stakeholder
with veto power over the product's existence"*, and their willingness to pay is
*"the question itself is a violation."* Beyond the constitution, four practical
objections:

1. **It inverts the safety incentive.** Revenue scales with the number of people
   written about without their consent. Every one of the nine gates in
   WALL-FEATURES.md then stands against the direction the money is pulling, and
   under a bad month the gates lose. A cover charge has the opposite property:
   it pays you for people who *chose to come*, which is why it is safe to take.
2. **It taxes the payoff**, which is the moment somebody tells their friends.
   You would be charging admission to your own word of mouth.
3. **A better version is already shipped, and free**: claim, one ask per letter
   ever, the writer answers or does not, the sealed line opens on a yes.
4. **The mechanism does not hold.** An uncaptured Stripe PaymentIntent is
   cancelled **seven days after creation by default** — the manual's refund
   window is exactly the expiry, with no margin, and the hold shows on a
   student's debit card as a real $7 gone for a week.
   ([Stripe](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method))

**$2 for "tell me if it happens."** This is NGL Pro's structure with the
deception removed: a payment taken at the most emotionally invested moment, for
an outcome that may never arrive. The FTC's $5M order against NGL turned on fake
messages, a paid reveal that revealed nothing, and undisclosed recurring
charges; ours would be none of those, and it would still be *the same shape*,
sold to the same demographic, by a product whose only real moat is that it can be
trusted. ([FTC, July
2024](https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-order-will-ban-ngl-labs-its-founders-offering-anonymous-messaging-apps-kids-under-18-halt))
The framework already pre-committed against exactly this: *the forbidden lever
will tempt you, by name, when growth stalls.*

And it is unnecessary. **The free notification already exists**, it is the tab at
the foot of the wall, it is the whole reason the wall was built, and
`wall_waitlist` — the table that holds everybody who searched and found nothing —
carries a comment in its own migration calling it *"commercially the most
valuable table here."* It is valuable because those people come back, not because
they can be charged $2.

Worth knowing where the category stands: **Marriage Pact has 600,000 students
across 109 schools, a $5M seed from Bain Capital Ventures, and no revenue.**
([Inverse](https://www.inverse.com/input/culture/standfor-university-marriage-pact-dating-algorithm-liam-mcgregor);
[Crunchbase](https://www.crunchbase.com/organization/marriage-pact)) The closest
comparable that exists has not found a way to charge students, and has decided
not to force it. The room is the way this product gets paid, and the room gets
paid by people who bought a ticket to something.

**The permanent list.** Free forever, and it ships on the privacy screen:
writing, reading, searching your handle, the notification, verification, the
claim, the reveal request, the sealed line, every takedown, the opt-out, and
entry for anybody who was written about or who wrote.

**The only things anyone pays for**, ever:

| | | Who pays |
| --- | --- | --- |
| Cover | $10–12 | somebody who chose to come and was not written about |
| Second guest | $10 | the third person in a group; the first +1 is always free |
| Bar leg per head | $5–10 | the venue, to you |
| Partnership | $750–3,000 | a brand |

### 6.5 What this is worth at the top

One city, one night a month, at steady state: **about $2,650**. Four cities:
about $10,600 a month, and each city needs a person physically present on a
Tuesday — which is the one thing that does not scale and the manual says so
correctly.

The manual's $23,000 is 2.2× high, and the error is almost entirely the venue
line: it assumes 250 drinking-age heads at $8 where the real figure is ~100 at
$7. Correcting that one number corrects the business.

**So do not run this for the margin.** At $2,650 a night it is a good small
business and a bad venture; the compounding asset is not the night, it is what
the night leaves behind — verified students, letters, film, and a campus where
the reflex is installed. Run the room at or near break-even on purpose, spend
the surplus on the next city, and let the framework's own conclusion stand:
price work is capped, density work compounds.

---

## 07 · What to build, in order

Five things. Two are new tables, three are screens. Nothing here is more than a
week of work, and the order is by leverage.

### 7.1 The Named Card — build this first

**The strongest growth object available to this product, and it is not in the
manual at all.**

The framework's Loop B is the open-door card: *"if there's something you never
said to me, there's a safe place to say it."* It works, but it asks somebody to
make a claim about themselves, and the framework names the risk honestly — the
sincere register may not clear the posting bar.

The wall produces something far stronger, because it is **a fact conferred by
somebody else**. A person who searches their handle, verifies, and finds a letter
has just received the most flattering piece of information a person can receive.
Give them a card that says so.

```
                    ✦

              somebody at berkeley
              wrote about you.

              you're on the list
              for the 8th.  +1.

              celestual.us
```

Never who. Never a word of the letter. Only the fact, which is already theirs,
and the door.

**Why it beats every other share object in the product.** It is receiver-side by
construction, so it confesses nothing (VOICE §4, the four frames). It is a flex
that is *true* and *unearned by the poster*, which is the strongest social
currency available. And it is aimed: it reaches the poster's Berkeley followers,
who see it and go and search their own handle — and most of them will find
nothing, which routes them to the free notification, which is the front door.

**It passes the nine gates**, checked individually because this is the kind of
proposal the gates exist to stop:

| | |
| --- | --- |
| G1 subject's veto | the subject **is** the sharer. Nothing is published about anybody else |
| G2 silence in, silence out | carries no third-party handle, no count about anyone else, no nudge. The named attack is *a card that says "someone wrote to @them"* — this says "someone wrote about **me**", posted by me |
| G3 anonymity structural | the writer appears nowhere and is not narrowed |
| G4 the screen covers it | no free text. Every glyph is drawn from system values |
| G5 a door, not a room | it leaves the wall; it does not create a reason to stay on it |
| G6 a fact, never a race | no count, no rank, no comparison. "A letter exists" is binary |
| G7 drawn, rationed | the mark, the accent once, the paper. Where the open-door card already is |
| G8 off is cheaper than on | it carries nothing a takedown must reach — it is about the poster, published by the poster |
| G9 the desk can carry it | no queue. Nothing to read |

Nine passes. Build it.

### 7.2 The door — a night pass, and three letters

`wall_write` requires `wall_gate`, which requires a verified `berkeley.edu`
address. At a door, that is three to five minutes on venue wifi, and then the
three-in-five-days allowance is spent in one night.

**A night pass.** One table, modelled on `celestual_passes` (0043), which is
already the shape of "let this person through the proof":

```
wall_night_passes
  id, campus, code, opens_at, closes_at, max_uses, uses, created_at
```

A person at the door types one short code. It grants write access for that
night, on that campus, with its own allowance — **three letters**, separate from
the five-day rolling window, expiring when the night does. The door has already
verified them by a better method than email: a human looked at them and let them
in.

Three things this must carry, and each is doing real work:

- **Aim at the room.** The composer suggests from the night's attendee list
  rather than the wall at large. A letter about somebody who is not in the
  building cannot resolve tonight, and §03 says that is the whole game.
- **Consent, on the same screen.** One line: *at 1:00 you'll see how many people
  here wrote about you tonight.* Writing is consenting; the count fires for
  nobody else.
- **Screening unchanged.** The regex at the keyboard and on the server, the
  classifier after, the desk behind it. A night pass changes who may write. It
  changes nothing about what may be written.

### 7.3 The hour — a pairing function and one subscription

The engine the ceremony does not have.

```
wall_night_reveal(p_night uuid) returns jsonb
  -- for every person who wrote tonight, under that night's pass:
  --   count   how many letters written tonight name them        (the floor)
  --   pairs   handles A and B where each wrote about the other  (the ceiling)
  -- fires once, at a set time, to everybody at once, over Realtime
```

Realtime already carries the wall's nudge after a letter goes up
(`api.js subscribeWall`); the hour is the same channel with a different payload.
The count is private to the person. A pair is disclosed **only to the two people
in it**, and simultaneously — which is the double-blind, applied to letters, and
it is the same contract Main has always made about pings.

One rule, and it is not negotiable: **a person who did not write at the door
receives nothing.** Not a count, not a zero, not a "no one this time." They
watch, which is fine, and they know why, which is the point.

### 7.4 The list

```
wall_nights          id, campus, name, starts_at, venue, capacity
wall_night_invites   night_id, handle, source (named|wrote|worked|walkup),
                     invited_at, confirmed_at, arrived_at, plus_one
```

The door checks a handle, not a name — the manual is right about that, and it is
also what makes the arrival data worth having. `arrived_at` is what turns an
anecdote into a sponsor deck, and it cannot be collected retroactively.

### 7.5 The two outstanding migrations, before anybody is invited

Both are written and neither is applied. Neither is optional now.

- **0046, the opt-out reaching the wall.** Today, taking a handle off at
  `/optout` leaves every letter *about* that person standing under their name.
  That is the single worst thing in the repo and it is one apply away from
  fixed. **Do this first, before anything else in this document.**
- **0038, the audit.** Partly live, not recorded. Read the database, not the
  history.

Add one more, small, from WALL-FEATURES §5.1: **a per-name ceiling.** The
allowance is on the writer, never the receiver, so twenty writers with one letter
each is twenty letters to one person in a night. Five a day, with the sixth held
`pending` for the desk rather than refused. A few lines of SQL, and it is the
one control the attack ledger says is missing — which matters far more the moment
the wall is attached to a party.

---

## 08 · The campaign

The manual's 21-day shape is right — build a mystery, resolve it on day 11 — and
the tactics under it need replacing per §05.4. Twenty-one days from the day the
RSO partner says yes; not before, because the partner is what makes days 1–7
legal.

| | | |
| --- | --- | --- |
| **D −7** | **Find the partner** | One existing RSO. They book, they table, they post, they carry on-campus insurance. You bring the product, the campaign and the money. Everything downstream is blocked on this |
| **D 1–7** | **Only the wall exists** | Cards, one line, a QR, no explanation and no party. Handed to people on Telegraph, Bancroft and Durant; on bulletin boards and kiosks through the partner; in coffee shops, bookshops and the co-ops with a yes from the manager. Never left unattended on campus grounds |
| **D 8–10** | **Seed, and build the wall** | Twenty posters at $50–200, chosen for social capital, posting a letter card and not their own participation. The physical wall goes up on the Saturday, letters printed and posted live, filmed. The footage is the ad for week two and for every city after |
| **D 11** | **The rule** | One line, everywhere: *if somebody wrote about you, you're on the list.* The wall stops being an art project and becomes a guest list |
| **D 12–17** | **Volume** | The steepest part of the curve, because writing now has a consequence. Second weekend installation. Ambassadors begin **following** the named, not DMing them |
| **D 18–20** | **Reach** | Forty DMs each, from six-month-old personal accounts, to people already followed back. Mail to anybody with a verified address. §05.2 |
| **D 21** | **The night** | List closes at noon. Confirm in the morning, one line. Publish the count, never a ticket link |

### 8.1 The card

One line, a QR, nothing else. Second person, specific to Berkeley.

> **front** — somebody at berkeley wrote about you and never sent it.
>
> **back** — celestual.us — search your @

Six variants, six QR paths through `/c/<code>`, which already logs the scan and
already judges a card on **`joined`** rather than scans (0047). The manual asks
how to track this; it is shipped.

### 8.2 The DM

Follow first. Then, from a personal account, never the brand:

> hey — someone wrote about you on the berkeley wall. you can read it at
> celestual.us, search your @
>
> also you're on the list for the 8th. you get a +1 if you want one

Lower case, no full stop at the end, no exclamation, no branding. It reads as a
person telling you something because that is what it is. The manual has this
exactly right and it should not be touched.

### 8.3 What to read daily

| | |
| --- | --- |
| **Letters written** | the only leading indicator. Everything else is a ratio applied to it |
| Handle searches | awareness. High searches and low letters means willing to look, unwilling to write |
| Search-to-found | density. If almost nobody who searches finds one, narrow the pool — one dorm, one department, one year |
| Verification completions | the costliest leak. Found a letter and abandoned means the gate is broken, and the fallback is live the same day |
| **Named reached who opened** | new, and the one §05.2 says will surprise you |

If letters stall, the fix is almost never more flyers. It is a narrower pool. A
campaign aimed at one dorm of four hundred produces a far higher search-to-found
rate than one aimed at 45,000, and found letters are the only kind that generate
word of mouth.

### 8.4 The two clocks, and why they must be set against each other

**Letters lapse in thirty days** (`wall_letters.expires_at`). Nothing in the
manual accounts for it, and on a monthly cadence it is the difference between a
wall that compounds and a wall that empties.

A letter written on D1 is gone on D31 — ten days after the night, three weeks
before the next one. Run it naively and every cycle starts from an emptier wall
than the last, and the search-to-found rate, which is what drives word of mouth,
falls every month.

Set the clocks like this:

- **The night sits on D21**, so the newest letters are three weeks from lapsing
  and the oldest are one week from it. The wall is at its fullest on the night.
- **Letters written at the door are the next cycle's seed.** They lapse on
  D51 — a week after the next night. The room refills the wall it just emptied,
  which is the compounding loop and it is free.
- **Never extend the thirty days to make a wall look busier.** The lapse is
  doing privacy work (framework, risk 3: unresolved longing data self-destructs
  instead of accumulating into a toxic archive). If the wall looks thin, that is
  information, and the response is a narrower pool.

---

## 09 · The night

### 9.1 The door

Two lanes, and the difference between them is the whole product.

- **On the list** — named, wrote a letter, or worked the campaign. Free, plus
  one guest. Checked against handle, not name: they show the profile on their
  phone. A second guest is $10.
- **Not on the list** — $10 at night one, $12 after. No gatekeeping theatre. The
  cover is normal and the reason it exists is visible to everybody.

**Everybody writes, both lanes, three letters, aimed at the room.** Not a
gimmick — §03 is the entire argument, and one letter instead of three is the
difference between fifty people having a moment and one couple having one. Three
charged phones at the station for anybody whose battery is dead. The consent line
is on the same screen as the composer.

### 9.2 Run of show

| | | |
| --- | --- | --- |
| **20:00** | Doors, two lanes, writing station | Two on list-check, one on the station, one floor lead. Letters projected from the first minute |
| **21:30** | The room fills | Projection cycles new letters as they are written. No announcements. It should feel like a party, not an activation |
| **22:30** | One announcement | The only time anybody speaks into a microphone. What happens at 22:45, and that they need their phone in their hand |
| **22:45** | **The count, then the reveal** | Every phone lights at once with one true sentence. Then the pairs resolve. Music drops for exactly the length of it |
| **22:50** | Back to the party | Do not stretch it. The ceremony is short and then it is a party again |
| **23:00** | The 21+ leg | Whoever can, walks five minutes to the bar. One ambassador leads the walk. The bar counts heads at its own door |

The manual puts the hour at 01:00. **Move it to 22:45.** Four reasons, and none
of them is caution: an all-ages room does not hold a Tuesday until one in the
morning; the film is better with a full room than a thinned one; the 21+ leg
needs the bar's dying hour, which is 23:00, not 01:30; and a Tuesday ceremony
that ends at 23:00 is one people come back to.

### 9.3 Cost

| | | |
| --- | --- | --- |
| Door and list check | 2 | $150 |
| Writing station | 1 | $75 |
| Floor lead | 1 | $100 |
| Camera | 1 | $150 |
| Venue | — | $400 |
| **Insurance, GL $1M / $2M** | — | **$250** |
| Print, projection hire, contingency | — | $350 |
| **Total** | **5** | **$1,475** |

The insurance line is the one the manual omits and the one without which no
venue confirms a booking.

---

## 10 · The sponsor

The manual's section 7 is the strongest part of it and needs two changes.

**Pre-sell one small one before night one.** The manual says run two nights
unsponsored because *you cannot sell an activation you have never run*. True of
a $3,000 regional deal; false of a $750 local one. A boba shop, a gym, a bar, a
bookshop within a mile of campus will take *"you are the first partner, you are
named on all three nights, $750"* — precisely because there is no track record
and the price reflects it. That single yes takes night one's loss from $3,925 to
$3,175, and more importantly it lets you use the word *partner* in the next
conversation. Sell risk, cheap, to somebody local, before you have anything.

**Sell the guarantee, not the party.** What is actually for sale is two hundred
*verified* students in a room, a head count taken at the door, and a film. The
verification is the part nobody else selling campus attention has, and it should
be the first line of the page.

| | | |
| --- | --- | --- |
| **$500–1,500** | **Local** | The bar, the boba shop, the gym. Its only job is to exist so that you can say *clients* in the next conversation |
| **$2,500–5,000** | **Regional or DTC** | Energy drinks, a Gen Z fintech, a clothing label. Cold email to a field marketing manager. Realistic after two documented nights |
| **$8,000–15,000** | **National** | Needs a case study with real numbers, real footage, three nights of history. Do not chase it before you have it |

For calibration: agency-executed campus activations run **$10,000–35,000 at the
entry end**, which is the budget line you are undercutting and the reason a field
marketing manager can say yes to $3,000 without asking anybody.
([Barnastics](https://www.barnastics.com/news/experiential-marketing-activation-cost-2026);
[Air Fresh](https://www.airfreshmarketing.com/blog/how-much-does-it-cost-to-sponsor-brand-activation))

**In writing, every time:** the head count guarantee and its make-good as a
number; film delivery date, revision count and usage window; half on signature,
half on delivery; FTC disclosure and talent releases from anybody identifiable
on camera; one named approver. And the rule that does not bend — **the sponsor
appears in the room and in the film, and never on the wall.** §05.3 now makes
that a legal rule as well as a taste one.

---

## 11 · What breaks

| Failure | The signature | The response |
| --- | --- | --- |
| Not enough letters | flat after D7 despite flyer volume | Narrow the pool. One dorm, one department, one year. A found letter is worth fifty unfound ones |
| Letters written, nobody knows | high submissions, low search-to-found | Reach is the bottleneck. Move ambassadors from flyering to following and DMing now |
| **The named never see the DM** | high sends, near-zero opens | **§05.2.** Follow first. Mail anybody with a verified address. Lean on word of mouth |
| Verification drop-off | found a letter, never opened it | The costliest leak. Fall back to the second door the same day rather than debugging live |
| **The hour fires for nobody** | few pairs, many blank phones | **Not enforcement — arithmetic. §03.** Check letters-per-person at the door and how many were aimed at people present. If *m* < 2, that is the whole answer |
| Invited, absent | under 15% of reached | Move the invite to 72 hours out, add the morning-of line, test another weekday before concluding the model fails |
| Venue withdraws | a week out, no signed contract | Always a second venue warm. Never announce a location until the first has confirmed in writing |
| **No insurance certificate** | venue will not confirm | Buy it before you announce. $250–400 dry. Blocking, not optional |
| A letter causes harm | a complaint, or a screenshot circulating | Down within the hour, handle opted out, one brief public response. Speed is the only thing that matters |
| **The university objects** | mail from Student Affairs | Expected. Answer in a day with the safety architecture: screening at the keyboard and on the server, the classifier, the desk, one-tap takedown with no account, permanent opt-out, thirty-day lapse. Do not argue jurisdiction |
| **The university blocks the domain** | traffic from campus wifi falls off a cliff | UNC did this to four apps at once. Nothing prevents it. Mitigation is the document above, delivered before it is asked for |
| **A §3344 letter arrives** | a named person's lawyer | Faces must already be off. §05.3. If they are, this is a takedown and an opt-out, which are one tap each |
| Sponsor withdraws late | signature never arrives | Never spend against unsigned money. Half on signature exists for this |
| Instagram resolution breaks | handle lookups failing at scale | Outside your control and in your only product. The mail path must already be primary — it is |
| **Ambassadors quit** | two of five stop replying | The most fragile asset in the plan and the manual does not mention it. Recruit seven, pay them, give them the first film, and never let the campaign depend on any one |

### Kill criteria

Set now, in writing, before the first night. Criteria decided after the result is
known are not criteria.

- **Under 200 letters by D18.** The demand engine does not work and the room has
  no material. Stop, do not book, do not spend the night budget.
- **Under 120 heads on night one.** The room does not fill and the app is a
  hobby.
- **Under 25% of reached people open their letter.** The wall is not landing and
  nothing downstream matters.
- **Fewer than five mutual pairs at the hour, with *m* ≥ 2 confirmed.** The
  ceremony does not exist, and the ceremony is the reason people came. This one
  kills the *room*, not the product — the wall survives it.
- **Ten venue conversations with no all-ages room under $600.** There is no room
  business at Berkeley and the studio is the asset left.

---

## 12 · The calendar

The framework already reached this conclusion independently, from the other
direction: *the real opening offensive aimed at autumn 2027 — the first semester
you can stand on a campus yourself.* The manual tries to compress it into
twenty-one days. Both can be true: autumn 2026 has a real job, and it is a
smaller and sharper one than a 250-person club night.

| | | |
| --- | --- | --- |
| **Now — 30 Sep 2026** | Apply **0046**. Faces off the field. Named Card built. Per-name ceiling. Find the RSO partner | Nothing is announced |
| **Oct 2026** | Night pass, the hour, the list. One 21-day campaign. **Night one, all ages, one leg** | Proof, not profit. −$3,900 |
| **Nov 2026** | **Night two**, bar leg added, first local sponsor at $750 | Roughly break-even |
| **1 Dec 2026** | **File the RSO application.** The deadline, and there is not another until 1 July | Unlocks spring |
| **Spring 2027** | RSO live: Sproul, campus rooms, free on-campus insurance, legal flyering. Nights three and four. First regional sponsor | First profitable nights |
| **Apr 2027** | Founder returns | The constraint in §13 lifts |
| **Autumn 2027** | Second campus. A body on the ground for each | The offensive the framework always pointed at |

Autumn 2026's job, stated plainly: **prove that a room fills off the back of
letters, and that the hour fires.** Two numbers — heads, and pairs. Everything
else is preparation for a semester when the founder is in the country and the
organisation can legally stand on the campus it is about.

---

## 13 · Who owns what

The room needs a body in America on a Tuesday. The founder is in Korea until
April 2027. That is not a scheduling inconvenience; it is a structural fact
about which layers can be personally owned, and pretending otherwise produces a
plan that quietly depends on somebody being somewhere they cannot be.

| | |
| --- | --- |
| **The engine — Ace** | The wall, verification, the Named Card, the night pass, the hour, moderation, the desk, the numbers. All remote-buildable, and all of it decides how many people walk through a door |
| **The room — Tristan and David** | The RSO partner, the venue, the door, staffing, the sponsor, the film. None of it doable from Korea |
| **The campaign — the ambassadors** | Seven, not five. Paid. Named in the credits of the first film. The most fragile asset in the plan |

This division also settles the gap-year asymmetry. If the revenue is room
revenue and the rooms fill because of an engine built remotely, then that
contribution has a number attached — **heads delivered per night, traceable
through the night's invite list to the letters that produced them**, which
`wall_night_invites.source` records for exactly this reason. Put that
measurement into whatever is signed, alongside ownership of the codebase and the
verification infrastructure, so that a year of work leaves somebody holding
something whether or not the product ever monetises.

---

## What is still a guess

Five numbers in here are estimates rather than findings, and the first night
measures four of them:

1. **Letters written** in a 21-day cold campaign. Anchored at 400. Everything
   downstream is a ratio applied to it.
2. **The share of named people actually reached.** Anchored at 55%, against the
   manual's 75%, and §05.2 argues the manual's is too high. This is the number
   most likely to disappoint.
3. **Attendance from reached.** Anchored at 28%.
4. ***r*, the reciprocity rate** — how often the person you wrote about wrote
   about you. Anchored at 5–12%. **There is no comparable for this number and
   it decides whether the hour exists.** Night one is the experiment that runs
   it, and it is the single most interesting thing this product will learn.
5. **What a Berkeley venue pays per head** for a 21+ walk-over. Anchored at $7.

The sixth is not measurable on night one and should be said anyway: whether a
room, once it has happened, makes people write letters *without* a room being
scheduled. If it does, this is a product. If it does not, it is an events
company with a very good flyer.

Treat every figure above as a hypothesis with a date attached, and rewrite this
document the morning after.

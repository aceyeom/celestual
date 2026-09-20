# Decision memo — 15 September 2026

**Read before the cards move.** This memo supersedes the campaign described in
the September operating manual and corrects three recommendations in
[MASTER-PLAN.md](./MASTER-PLAN.md). [`decision-memo.html`](./decision-memo.html)
is the same document, set.

Produced by an eight-lens diagnostic of the strategy actually being executed
(1,000 printed cards, campus dispersal, paid UGC, physical wall, party), and a
six-stance strategy bake-off scored by eighteen independent judges.

---

## The call

**Do not pivot the company. Pivot the denominator, and add a publishing surface
that the product feeds.**

Run the wall exactly as built into **one house of 40–70 people who already eat
together**. Publish that house's letters, with the handle stripped at
publication, as the distribution channel. Two branches, one engine, **$0 revenue
planned through 30 April 2027**, six dated kill switches.

Growth decays and this is hard to make profitable. Both are true and neither is
fixed by pivoting. Decay is a property of a mechanic applied to a population;
unprofitability is designed in and permanent, so the correct response is to
build something that never needs a float — not to go looking for revenue the
constitution has already correctly banned.

---

## 1 · The number that decides everything

1,000 cards dispersed across 33,122 undergraduates:

| | |
| --- | --- |
| cards handed out | 1,000 |
| actually scan | ~38 |
| search a handle | ~12 |
| clear the `.edu` gate | ~3 |
| **write a letter** | **~1** |

The plan needs 400. Dispersal is short by two orders of magnitude and more paper
does not close it. Three compounding reasons:

- **The wall the cards point at is empty.** The seventy-two seeded letters were
  deleted in the 4 September audit; `app/src/wall/seed.js` now holds card
  attribution and nothing else. Every scan lands on a near-empty wall and finds
  its own handle printed under the word *nobody*.
- **Search-to-found campus-wide is 0.79%** even at 400 letters. A 20% found-rate
  across Berkeley needs ~23,600 letters. Inside a house of 60 it needs fifteen.
  **Concentration beats dispersal by 30–83×** on the only rate that drives word
  of mouth.
- **The cold-start fixed point is zero at every concentration.** No letters →
  nobody finds anything → nobody writes. It does not begin on its own. Someone
  sits down with twenty people and asks them to write, by hand, before any card
  moves.

Every operator who has done this — Bier (tbh, Gas), Marriage Pact, Tinder, Fizz
— began by making one enumerable group who see each other daily adopt on the
same day, by hand. The plan has no such moment anywhere in it.

## 2 · Stop this week

| | |
| --- | --- |
| **Paying creators to say it's trending** | 16 CFR Part 465 (in force Oct 2024) covers disseminating testimonials known to be false, at **>$50,000 civil penalty per violation**. Self-detecting on one campus. Already banned by `VOICE.md §4` by name as "the pattern the FTC took NGL apart for." Write the prohibition into the repo permanently. |
| **Dispersing the cards** | §1 is the arithmetic reason. It is also against campus regulations as written: nothing unattended on campus grounds or in classrooms, nothing affixed to doors. RSO status takes a semester; next deadline 1 December. |
| **The 200-person party, this autumn** | Cancelled, with the venue search, insurance quotes and $6,000 float. Ceremony engine unbuilt, mutual maths needs three letters each aimed at people in the room, and an unfunded $3,925 loss on night one is a wish. Returns twice, small (§5). |
| **The wall of printed handle-addressed letters** | Breaks G8: paper outlives the one-tap takedown, so the tap is a lie. Returns in November made of published, de-named letters — lawful, and better film. |

## 3 · The cards — $65 and they are fine

Sunk cost is $25–80, which buys them no claim on the strategy. What makes them
worth keeping is the `/c/<code>` hop, built for exactly this.

1. **Tell the truth.** A matte sticker roll (~$24) covers the printed line,
   which is false for ~998 of 1,000 holders. Two replacements, because there are
   two jobs: `letters people never sent. berkeley.` for a stranger (true for
   100%), and `somebody wrote a letter for you` for a named recipient inside a
   seeded house (true for ~95% of that room — the Named Card, printed).
2. **Repoint, don't reprint.** One commit in `app/src/cards.js`. One code per
   **population**, not per creative variant: `c/a` house one, `c/b` house two,
   `c/c` hand-to-hand on city sidewalk, `c/d` the reading, `c/e` held. Migration
   0047 then yields scan → read → asked → joined per population inside a known
   denominator. Five creative variants at this volume is statistically inert.
3. **Hand them, never leave them.** ~150 in house one, 100 at the reading, 300
   hand-to-hand, ~450 held until the RSO clears in spring. Paper does not expire.

## 4 · The best idea here is one database field

The category's dividing line: **does a piece of content have value to a reader it
does not name?** A Yik Yak post does. An Unsent Project message does. A letter
addressed to `@sarahkim03` does not — so it cannot travel and network effects
never form.

That is a property of one column, not of the content. The composer already
proves it; these ship in `Write.jsx` today:

> You gave me your umbrella outside Wheeler and walked home in it. I still have it.
>
> You were the one singing on the 51B that night. I wanted the song to be about me.

**The body already carries its own address.**

> ### The fifty / one rule
> Every **published** letter is addressed to a description that at least fifty
> people could believe is them, and no more than one can prove is them.

The Unsent Project's mechanic exactly — enough to self-identify, not enough to
resolve. Enforceable by regex plus one classifier pass. Into `VOICE.md` as a
section, `WALL-FEATURES.md` as a tenth gate, and the voice linter.

**But do not drop the handle from the product.** Two load-bearing reasons:
`wall_claim` authorises the entire claim → reveal-request → sealed-line dialogue
on exactly one condition — verified handle matches the letter's target — so
nulling it turns a cryptographic proof into an assertion any verified stranger
can make about any letter, aimed at a writer promised anonymity. And nobody
searches for a building: "search your own @" is the whole funnel and the only
free reach channel.

**So: the handle is composed, never published.** Written, then rewritten at
publication. Two objects, one corpus — one column and one editorial pass.

## 5 · The party, answered

**"Would people care about a stupid app when they're out to party?"** No. That is
the design constraint, not the objection. The app must be invisible; any moment
someone looks at a phone is a design failure. What Celestual can uniquely do is
tell one person *somebody here wrote about you* — a reason to attend no other
event can manufacture.

**"How do we make it not cringe?"** Cringe comes from the event being about the
product. Never name the night after the company. Attending must be deniable —
"someone wrote about me" is conferred status; "I'm here looking for love" is the
cringe version. And students read *other people's* letters aloud: the Mortified /
PostSecret Live mechanic frees the reader from shame and the room to react
without anyone being exposed.

**"How do we get people out on a weekday?"** You are not competing with a better
party — Greek parties are Friday and Saturday. You are competing with study
hours. **Put the end time in the headline:** *tuesday, 8:00–9:15. you'll be back
at the library by half nine.* Then actually stop at 9:15.

| | |
| --- | --- |
| **The house night** · early Oct · ~$150 | 40–70 people at their own dinner, their own lounge. No venue, insurance, licence problem, door or cover. Ninety seconds of explanation, everyone writes three letters aimed at people in the room, then **everyone searches their own handle at the same time.** Zero new code. |
| **The reading** · Nov · ~$150 | Forty people, a bookshop back room. A hundred published, de-named letters on the walls; strangers read them aloud. One camera. Fifteen minutes of footage of real people reading real letters is the highest-value asset this plan can manufacture. |

**Kill the simultaneous count reveal** — this corrects MASTER-PLAN §03. A private
number delivered at the same second to people standing next to each other becomes
a public comparison, and a public zero for everyone it misses. Pairs only, or
nothing.

Two free things the plan is missing: **get paid to show up** (an RSO partner
applies to ASUC/SUPERB/residence-hall programming for $400–1,500 — how PostSecret
Live has run at hundreds of campuses for two decades), and **the Big Game bonfire
rally queue** on Fri 20 Nov, ~10,000 students with forty minutes of nothing to do,
free, public sidewalk approach.

## 6 · The macro call — two branches, one engine

| | |
| --- | --- |
| **Branch A** · clock: weeks | The wall exactly as built. Nothing about the product changes; only the population, from 33,122 to one bounded group with a roster, a room and a recurring meal. |
| **Branch B** · clock: years | One letter a day, handle stripped, address rewritten as place and moment, published permanently. A hundred-line extension of `export-og.mjs` plus two hours a week of editing. |

A produces B's material. B produces A's reach, and B's only call to action is
"the wall is at celestual.us/berkeley — search your @."

**The answer to decay:**

- Decay is a property of a mechanic applied to a **population**. Campus-wide you
  get one novelty clock; house by house there are seventeen co-ops, sixty-odd
  chapters and dozens of floors, each with a clock that starts when you walk in.
  You buy a new one every few weeks for $150.
- **The thirty-day lapse is the calendar, not a bug.** A house saturates on night
  one and empties thirty days later; its own monthly meal is the rewrite trigger.
- **The corpus does not decay, because it names nobody.** The lapse exists to
  protect a named non-consenting person; strip the name and permanence is free.
  Branch A shrinks by design; Branch B only grows. That asymmetry is the only
  real answer to decay — not a better growth plan, but an asset whose value is
  not a function of growth.
- **Schedule the peak instead of suffering it.** The 6–12 week peak is
  unavoidable. Do not spend it with both founders 5,500 miles away and $60 in
  the bank.

`ULTIMATE-PRODUCT-FRAMEWORK.md` reached this independently: *"content is the only
loop that works at zero density, which makes it the correct primary activity
during the military window."* That is already written down, and it is not being
done.

**One operational fact nobody has used:** Korea is 16 hours ahead of Pacific, so
**Berkeley's peak risk hours (19:00–22:00 PT) are 11:00–14:00 KST.** The
moderation desk can be staffed live by a founder, from a barracks, at no cost.

## 7 · The money

**$0 revenue through 30 April 2027.**

| | |
| --- | --- |
| Ambassadors — $75/mo each × 3 × 9 months, plus $100 per delivered night | $2,400 |
| Infrastructure (Supabase, Vercel, domain) | $480 |
| Apify resolver | $200 |
| ManyChat relay — the handle-ownership proof, kept alive | $180 |
| Three or four house nights, and the reading | $600 |
| Print, stickers, postage, Haiku | $260 |
| **Total — about $340/month** | **$4,120** |

The shape matters more than the total: **no float, ever, and no experiment
conditional on raising money.** Fundraising is the one activity neither founder
can do from Korea, so an experiment needing $6,000 is conditional on the
capability they structurally lack.

**Pay the ambassadors from today, backdated to 1 September.** They are the asset
that cannot be rebuilt, they have been working unpaid on a plan about to be
cancelled, and three independent judges flagged that they walk otherwise. If
$340/month is too much, cut ambassador pay to $50 each — not to zero.

**The only permitted revenue line** is a printed object sold to people who chose
to buy it: *Never Sent: Berkeley*, 150–250 published letters, print-on-demand,
zero inventory risk, on sale 14 Feb 2027. Realistic: $1,000–3,500. A **licence
line on the composer** ships first — "may we print this, with no name on it,
after it lapses" — because you cannot sell a book of strangers' letters off an
intake form with no rights grant, and *"they sold my letter"* is the one
accusation a trust-only brand does not survive.

**Never, permanently:** anything inside the app, and specifically no B2B sale of
"verified activations" — that makes the Target inventory, and `PERSONAS.md` P7
says the Target is a stakeholder with a veto and never a customer.

## 8 · The next fourteen days

| | |
| --- | --- |
| **Tue 15 Sep** | Three phone calls, individually, before any written memo: what is cancelled, why, that they are paid from today, and the one named job each holds. Then **apply 0046** — until it lands, `/optout` still leaves letters about that person standing under their name. |
| **Wed 16 Sep** | Per-name ceiling (five a day, sixth held for the desk) — ships *before* the room, because concentration multiplies pile-on risk as fast as search-to-found. Faces off the hive: monograms remove the §3344 surface permanently, and it is a flag not a rewrite. |
| **Thu 17 Sep** | Fifty/one rule into VOICE, WALL-FEATURES and the linter. Order the sticker roll. |
| **Fri 18 Sep** | Publish the nine gates at `/gates`. One afternoon, $0. It turns the house ask into a five-minute yes and is the answer to Student Affairs on the day they write — which is the day before they consider a network block. (UNC blocked four anonymous apps system-wide.) |
| **Sat 19 Sep** | The ask. Each ambassador approaches one bounded group they belong to. Rank by "does an ambassador eat there," never by size. One yes in writing by Fri 25 Sep, or go to the next three. |
| **Sun 20 – Mon 21** | Batch letter renderer. The publish opt-in and licence checkbox. |
| **Tue 22 Sep** | The first fourteen letters — written by you, and **labelled founder-written on the about page, permanently.** Never present a seeded letter as a submission. |
| **Wed 23 Sep** | Account live, 09:00 KST. **Render 21 ahead before posting the first** — a field rotation with no phone must not kill it. |
| **Thu 24 Sep** | Pre-verify the house at a meal, days early. Deletes the door-verification problem and the entire night-pass table, for $0. |
| **Fri 25 Sep** | **Hand-seed.** Twenty+ distinct verified members write real letters aimed at people in the house, before a single card moves. Never authored by an ambassador. |
| **Sat 26 – Sun 27** | Sticker the cards. Desk rehearsal, Berkeley 19:00–22:00 PT = 11:00–14:00 KST. |
| **Mon 28 Sep** | House night confirmed for Fri 2 Oct. Kill numbers written down before the result exists. |

## 9 · Kill dates

| | | |
| --- | --- | --- |
| **The room fills** | Sat 3 Oct | 60% of the roster wrote ≥1 letter and search-to-found inside the house is >70%. Fail = writing itself is the blocker. Cost to find out: $150, eighteen days. |
| **The content carries** | Tue 6 Oct | Fourteen letters in fourteen days, $0 promotion. Any two of: median 1,500 views; best 20,000; 40 inbound; 400 followers. One re-test, read 27 Oct. Two failures → archive, not strategy. |
| **The room self-feeds** | Mon 16 Nov | **The most important number in the business.** In the thirty days after, with nobody organising, did 15% of the house write unprompted? Fail = Celestual is a ritual you run for groups, not a network — a real and defensible thing to be (Marriage Pact chose it), but it must then be run as one and never described as a product. |
| **The ambassadors are still here** | Tue 1 Dec | All three replying, paid, and with a visible Berkeley-shaped thing they did last month. |
| **The bridge to 2027 is real** | Sun 31 Jan | ≥15% of inbound campus-resolvable, and 200+ handle searches attributable to the publication. If the audience contains no Berkeley, the 2027 handoff is fiction — run the publication as a hobby and revert to Branch A alone. |
| **One letter causes real harm and is not down within the hour** | no date | The desk cannot carry this density. Stop the same day. |

## 10 · Still uncertain

- **Whether a room self-feeds once seeded.** Nobody knows, for any product in
  this category. Gate 3 is the whole question.
- **Whether campus-addressed letters travel, and whether they pull Berkeley
  specifically.** Two different questions. The Unsent Project is both proof and
  warning: eleven years, five million submissions, zero density anywhere.
  "Become a smaller Unsent Project" is not a strategy and typography is not a
  differentiator. The only real difference is that this corpus has a *place*.
- **The reciprocity rate.** The most interesting number this product will ever
  learn, and **not worth building for this autumn** — the simultaneous search is
  already a ceremony that fires for nearly everyone with zero new code.
- **What Ace does with the other 2,700 engineering hours.** The honest weak point
  of every version of this plan. The finite list is ~250 hours. Do not spend the
  rest adding features to the wall. The real risk is not the ambassadors
  quitting — it is two founders with idle evenings drifting away from a codebase
  with nothing urgent in it.

---

Twelve months out: ~50% that three or four rooms have run, 500–900 students have
written or been written about, the account is 3,000–25,000 across four surfaces,
and a book has sold 150–600 copies — $1,500–5,000 revenue against ~$4,000 burn.
~15% something breaks out. ~35% it does not carry and you stop, having spent
under $1,500 and four months of evenings.

The framework put "durable multi-year company" at 5–10%; nothing here moves that
much — call it 8–12%. **What changes is the floor.** Under the plan being
executed now the downside is $6,000 gone, three burnt-out ambassadors, an FTC
exposure and a false claim on a thousand cards. Under this one the downside is a
published archive, a mailing list, a playbook, and a very specific piece of
knowledge about whether people write letters to each other when nobody is asking.

# CELESTUAL — Personas

The seven people celestual must be designed around, re-based on the masterguide
([ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md)). Three of
the seven are not customers in the usual sense — the Checker is a
semi-adversary, the Skeptic is a gatekeeper, and the Target never has to visit
at all — but designing without them is how this category of product dies.

Estimated mix = share of *visitors* (the Target needn't visit). Launch-phase
priors — replace with measured data as the campus windows produce real numbers.

---

## P1 · The Sender — the core user (~30% of visitors)

Someone quietly carrying a feeling — an unspoken crush, an unsent apology,
months or years old. Places a ping at 2am. The moment it's placed, the product
tells them the truth (Loop A): standing, or waiting — and if waiting, they
become the product's most motivated recruiter, aimed at exactly one human.

- **Job to be done:** *"Give this feeling a nonzero chance of an answer, with
  zero risk of humiliation."*
- **What delights them:** the weight of the three-slot rule (the act means
  something); the honest placed screen; the intent line as a private
  confession; the absolute promise that a one-sided ping is invisible — and
  now unreadable even in our own database.
- **What breaks them:** *any* doubt about the double-blind (they churn
  instantly and warn friends); implied-activity copy anywhere; the silence, if
  the product hasn't pre-framed it ("silence, which is the point") and given
  them agency (the door, the worlds line).
- **Growth contribution:** the highest-leverage act in the product — a waiting
  ping manufactures a recruiter with a named target (framework Fact 1). The
  open-door card is their deniable ammunition.
- **Willingness to pay:** the only monetizable want that will ever be honored:
  a fourth slot, once (dormant until density is proven — Part 3).
- **Metrics:** pings placed, **ping resolution rate** (the governing metric),
  door-card saves, renewal rate vs. lapse rate.

## P2 · The Checker — the fisher (~20%)

Came to find out *who likes them*, not to say anything. Wants to enter five
likely admirers and read the answers. The three-slot rule, the 6-per-30-days
cadence cap, and the rate limits exist because of this persona; at the extreme
they shade into the prober the whole security model targets.

- **Job to be done:** *"Map who's into me, cheaply."*
- **What frustrates them:** exactly what must not change — three standing
  slots, the cadence cap on retire-and-replace, reachability shown only after
  a placed ping. Good. The design goal is conversion, not satisfaction: a
  Checker who spends a scarce slot on the one person they actually care about
  has become a Sender.
- **What loses them acceptably:** the slot wall and the pace. Some Checker
  churn is the security model working.
- **Willingness to pay:** the highest in the product — for slots, refunds,
  probes, "see if they're active." **Permanently unmonetizable.** Any revenue
  model that leans on the Checker has sold the attack.
- **Metrics:** fourth-slot screen views, cadence-cap hits, retire-then-replace
  patterns, rate-limit hits.

## P3 · The Reconnector — the one it ended with (~15%)

It ended, but maybe not really. They want to know whether the other person
still thinks about them without being the one who knocked. The sixty-day
lapse gives their feeling a shape: renew it as long as it's alive, or let it
go — a small, private act of moving on that the product treats as an outcome,
not a failure.

- **Job to be done:** *"Resolve a door I can't knock on."*
- **What delights them:** mutual-only reveal is precisely the post-breakup
  contract — neither side loses face; the renewal note ("still feel it?")
  respects that this takes months.
- **What breaks them:** anything that could tip off the other side to a
  one-sided ping; pursuit-flavored copy ("win them back" is banned — VOICE §4;
  the architectural block list must hold even against their own curiosity).
- **Metrics:** renewal rate, lapse-with-peace rate (let-go actions), match
  rate on pings older than 30 days.

## P4 · The Ambassador — the campus catalyst (~5%, worth 10× their share)

The organizer who runs a campus window: puts the meter QR on the dining-hall
wall, posts the threshold line on Fizz, gets the count from 214 to 300. Their
product is the *event* — the whole campus finding out together.

- **Job to be done:** *"Give my campus a moment that's mine to have made."*
- **What delights them:** the assurance contract doing the persuading (the
  meter is the campaign); preregistration as herd cover; the week-one reveal
  landing with real numbers they can screenshot into every group chat.
- **What breaks them:** a window that visibly stalls (choose thresholds
  honestly — 10–15% of the student body, tuned); any number that later proves
  padded would end them socially along with the product.
- **Growth contribution:** the highest-leverage human in the machine. One
  Ambassador = one atomic network (framework §2.3).
- **Willingness to pay:** never asked. Ambassadors are armed, not charged.
- **Metrics:** meter velocity per campus, threshold-hit rate, week-one pings
  and matches (snapshotted, exact).

## P5 · The Skeptic — the privacy gatekeeper (~10%)

Reads the privacy page before typing anything. Often the friend the Sender
asks "wait, is this safe?" — a *gatekeeper for other personas' conversion*.

- **Job to be done:** *"Prove to me this can't leak before anyone types a name."*
- **What delights them:** the real architecture, legible: RLS with zero
  policies, salted-hash targets ("even a breach can't read who you entered"),
  the sixty-day purge, the no-login opt-out, verification before any match can
  fire. The plain-language privacy screen converts this persona.
- **What breaks them:** vague privacy copy; any dark pattern anywhere (they
  generalize instantly); a single implied-activity notification would turn
  them into the product's loudest enemy.
- **Metrics:** privacy/opt-out page views → placement conversion; opt-out
  volume and latency.

## P6 · The Viewer — two taps from the door (~20% baseline, more during a spike)

Arrived from someone's open-door Story card or a piece of content. Curious,
zero investment, ninety seconds of attention. Lands on `/@poster` with the
ping field prefilled — the poster is the most likely first ping they have —
and beneath it, the private redirect: "someone else on your mind? enter anyone."

- **Job to be done:** *"Show me the thing I just tapped."*
- **What delights them:** instant comprehension (the three mechanics lines);
  two taps from Story to placed ping; `/demo` letting them feel the whole loop
  — including a visualized match and a campus opening — without commitment.
- **What breaks them:** any friction before the aha; long copy; walls.
- **Growth contribution:** they *are* Loop B's yield. The job is converting a
  few percent into Senders before they evaporate.
- **Metrics:** door-page visits → placement conversion, viewer → own-door
  posting rate (the second-generation share).

## P7 · The Target — the named non-user (not a visitor; ~1 per ping)

Every ping names one. They didn't sign up, may never hear of the site, and
were entered without consent. **Not a customer — a stakeholder with veto power
over the product's existence.**

- **What the product owes them, structurally:** never learning they were
  entered (silence in, silence out); their handle stored only as a salted
  hash; the record self-destructing in sixty days unless renewed; the no-login
  permanent opt-out; never being marketed to off the back of being named.
- **What breaks everything:** a Target-turned-victim story in public. The
  uncharitable headline writes itself; the architecture above exists so it
  can't be written truthfully.
- **Willingness to pay:** the question itself is a violation.
- **Metrics:** opt-out volume and latency; zero successful entry-inference
  attempts, forever.

---

## Reading the mix

- **Design for:** P1 Sender (the soul) and P3 Reconnector (the deepest stakes).
- **Grow through:** P4 Ambassador (density — Loop C) and P6 Viewer (Loop B's
  yield), with content as the third channel requiring nothing from anyone.
- **Monetize:** nobody, yet. Later: P1's fourth slot, once (Part 3).
- **Defend against / for:** P2 Checker (contain, convert, never monetize) and
  P7 Target (protect absolutely).
- **Convert via:** P5 Skeptic (make the real security legible).

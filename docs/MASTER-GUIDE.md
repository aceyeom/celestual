# CELESTUAL — THE MASTER GUIDE

*A decision record. Version 1.0, July 2026.*

This document is the single source of truth for Celestual. It is written to be
read cold: a CMO, a technical cofounder, or a brand-new hire can build their
part of the company from this document alone. Every element is stated as a
settled decision in the present tense. Under each decision sits a block titled
**"Why this, and what was rejected,"** containing the reasoning and the
alternatives that were killed, with cause of death. Read only the decisions and
you know what to build. Read the reasoning and you know why.

Sources are cited inline. Where a decision rests on a real comparable case, the
case is named. Where it rests on argument without direct proof, that is said
plainly. Confidence is never averaged into one number; the honest odds per
component are in Section 11.

Five constraints are fixed and appear throughout as walls, not choices: (1)
Celestual is a double-blind mutual-reveal tool, defined in Section 1. (2) There
is no advertising budget; growth is organic or it does not happen. (3) The
product is density-dependent; local density beats scattered user count. (4)
Both founders serve in the Korean military until approximately April 2027 and
execute remotely through campus ambassadors until then. (5) Hard lines that are
law, not taste: no notification or implication that a specific person entered
anyone; no faked or inflated numbers, ever; no marketing to minors; no
deceptive storage or exposure of a non-user's data. Comparable products were
fined for crossing exactly these lines (FTC v. NGL Labs, 2024: a $5M order and a
ban on serving minors).

> **Where this sits in the repo.** This is the canonical decision record — it
> sits above [`ULTIMATE-PRODUCT-FRAMEWORK.md`](./ULTIMATE-PRODUCT-FRAMEWORK.md)
> (the mechanism spec the code was built to) and governs it. The visual language
> is locked separately in [`DESIGN.md`](./DESIGN.md) (the galaxy edition); where
> this guide still uses the earlier "deep navy" vocabulary, DESIGN.md's
> cosmic-violet galaxy is the canonical look and wins. Copy discipline is
> [`VOICE.md`](./VOICE.md). An [implementation record](#implementation-record)
> at the end logs what the code actually does today.

---

## SECTION 1 · WHAT CELESTUAL IS

Celestual is a **double-blind mutual-reveal tool**. A user privately enters
another person's Instagram handle. That person is never notified. If, and only
if, they independently enter the first person back, both are told at the same
instant. If it is never mutual, nothing is ever revealed to anyone. This entry
is called a **ping**: one privately held statement of "I think about you,"
pointed at one handle.

Celestual is a **resolution tool, not a dating app**. It exists to resolve the
relationships people are too proud or too scared to resolve themselves: the new
spark never acted on, the reconnection never attempted, the air never cleared.
Romance is the largest use case, not the definition.

Celestual is an **event company, not a viral-loop app**. It grows in step
changes, through synchronized campus openings, the way Marriage Pact does
(Stanford, 2017 to present), not through compounding self-referral. Its sharing
mechanics amplify events; they do not replace them.

The governing metric is **ping resolution rate**: the fraction of pings whose
target is present on the platform, or joins during the ping's lifetime. Not
signups, not downloads, not K-factor.

The single sentence the whole company engineers toward, the one a real user says
to a friend unprompted:

> "Just put their @ in. They never find out. Unless they put you in too, then
> you both find out at the same second."

Every landing page, every content CTA, every ambassador pitch converges on those
three beats: **they never find out, unless mutual, same second.**

**Why this, and what was rejected.**

The identity claims are load-bearing, not cosmetic. "Resolution tool, not dating
app" is what separates Celestual from the graveyard of its own mechanic:
chickenlove, Mutual, and Gas-adjacent crush tools all positioned as juvenile
crush toys and died of it, and Bang With Friends (2013) died specifically of
brand cringe. "Not a dating app" also widens the honest market to reconnection
and conflict resolution, which forces the intent feature in Section 2 and the
copy discipline in Section 5. Rejected: "the anti-dating-app" as public
positioning. Cause of death: defining yourself against a category keeps you
inside it; Celestual names what it is for, not what it is not.

"Event company" is a ruling on a live contradiction in the source material. The
prior design correctly rejected K-factor as the governing equation, then still
leaned on loop language. The measured reality: the Story-card loop's local k,
estimated honestly, is 0.05 to 0.2 (posting rate of 2 to 20% of pingers, times
0.1 to 1 verified signup per posted card; the component estimates are reasoned,
not grounded, and the derivation is in Section 6). Every generation is 5 to 20
percent the size of the last; the loop dies in two hops. Only campus windows
create the density step-changes the product needs, and Marriage Pact proves an
event-shaped company in this exact demographic can run for nearly a decade
without ever being "viral." Rejected: budgeting any plan on the loop compounding
by itself. Cause of death: the arithmetic above.

"Ping resolution rate" is the metric because the value of a new user is entirely
graph-local: a new user in Ohio does nothing for a sender in Seoul. K-factor
math assumes users are interchangeable, which is false here. Ten thousand users
spread thin are worth less than eight hundred on one campus. (Sources: Rogers,
*Diffusion of Innovations*, on local adoption clusters; Chen, *The Cold Start
Problem*, 2021, on atomic networks; Schelling, *Micromotives and
Macrobehavior*, 1978, on critical mass.) Rejected: viral coefficient K as the
governing metric. Cause of death: it measures the wrong thing and optimizing it
produces worthless scattered growth.

The one sentence is the product spec compressed into speakable advice. It is
deniable even when the speaker is the pining one, because recommending a tool
confesses nothing. The landing page exists to write this sentence into visitors'
mouths. Rejected: "secret society" framing ("you're being let in"). Cause of
death: the mystique of the invitation opens onto a single text field; the gap
produces a disappointment spike, and disappointed arrivals do not produce
second-generation shares.

Two structural facts sit under everything and every section honors them. **Fact
1:** every ping manufactures a motivated recruiter with a named target. The
product is worthless to a sender until their person arrives, which is the
strongest self-interested growth motive in consumer software (the contacts-graph
asymmetry per Chen, 2021), and it collides with the privacy constraint: the
sender can never say "join, because I entered you." The central design problem of
the company is therefore: how does a sender cause their target to join, through a
channel that cannot implicate the sender? Sections 2 and 6 are the answer.
**Fact 2:** the product's honest promise is probabilistic silence. For most
users, most of the time, the truthful experience is: you entered someone, and
nothing happened, possibly forever. Silence is the safety, and it is also the
single largest growth and retention threat. Marriage Pact guarantees every
participant a name; Celestual does not, and that structural discount is priced
into the odds in Section 11 and mitigated, never cured, by the
expectation-setting, aggregate reveals, and renewal touchpoints below.

---

## SECTION 2 · THE COMPLETE MECHANISM

### 2.1 The ping

A user enters one Instagram handle. This places a ping: private, silent,
revealed to no one unless it becomes mutual. A match fires when two verified
users each hold a standing ping pointed at the other; both are notified at the
same instant and nobody else is ever notified of anything.

All pings are private, permanently. There is no public ping. There is no counter
of how many people have entered you. There is no share gate that unlocks
information about pings pointed at you. This question arrived open in the source
material and it leaves this document closed.

**Why this, and what was rejected.** Rejected: the founder's proposed
public/private ping option, in which a sender could mark a ping "public,"
incrementing a "how many people have publicly celest'd you" counter on the
receiver, unlockable only after the receiver shared Celestual to three friends
who joined. Cause of death, four independent and each sufficient:

1. **It crosses the company's own hard line.** A count of people who entered you
   is an implication that people entered you. At a count of one or two inside a
   bounded campus community, it is near-identifying. This is the perimeter the
   FTC drew around NGL (FTC v. NGL Labs, 2024), and it destroys the product's
   foundational promise: silence in, silence out.
2. **It rebuilds the engine this design already rejected.** An admirer counter
   unlocked by taking actions is Gas's God Mode and NGL's hint mechanic: the
   variable-reward "who likes me" checking loop, explicitly cut because
   engineering compulsive checking into an episodic product buys an engagement
   metric the business does not need at real ethical cost.
3. **The share gate is forced virality with a deception instruction attached.**
   "Make sure those three friends join or it doesn't create value for us" is
   verified-install gating, and "frame it so we are not doing an obvious
   marketing scheme" is, read plainly, an instruction to disguise one. Truth is
   the entire legal and ethical margin; that sentence cannot exist inside it.
4. **It corrupts the match signal.** Once pings are social currency, friends
   burn slots flattering each other, and "it's mutual" stops meaning someone
   spent a scarce slot on you.

The legitimate goal inside the rejected idea — receiver-side pull (a reason to
join before you have pinged anyone; Gas proved "someone likes you" is the
strongest install driver in this category) — is served by the only honest
version that exists: aggregate numbers, above published floors, at the community
level, delivered as the week-one reveal (2.7). Individual-level receiver pull is
permanently off the table.

### 2.2 The three-slot cap

A user holds at most three standing pings at once. A fourth requires retiring one
(or, when monetization wakes, purchasing a fourth slot; Section 3).

**Why this, and what was rejected.** Scarcity is what makes the gesture mean
something. A product where you can enter forty people is a scanning tool; a
product where you hold three is a place for the people who actually occupy your
head. The cap enforces sincerity, protects the receiving side's trust in what a
match means, and blocks enumeration: you cannot sweep a campus three handles at a
time. (Source: costly-signaling logic; a signal is credible in proportion to
what it costs to send.) Rejected: uncapped pings, and the referral-currency
economy that rewarded shares with more pings. Cause of death: pings are not
scarce to a user; most people have one to three humans they would ever enter. An
uncapped supply has near-zero marginal value as a reward, and where it has value
it attracts exactly the scanning behavior the cap exists to prevent.

### 2.3 The sixty-day ping and renewal

Every ping stands for sixty days, then silently expires unless renewed. Renewal
is free, unlimited, and one tap, triggered by an email a few days before lapse. A
lapsed ping's record is purged. The renewal email speaks only about the sender's
own action, never about the target's activity.

**Why this, and what was rejected.** Four functions in one rule. It is the
product's recurring trigger, attached to a real event in the user's emotional
life ("do you still feel it?") rather than a manufactured ritual. It is a
re-recruitment moment. It is privacy hygiene: unresolved longing data
self-destructs instead of accumulating into a toxic archive, which materially
shrinks the breach and GDPR/PIPA surface (Section 10). And it gives closure a
shape: letting a ping lapse is a small private act of moving on, which is
on-thesis for a resolution product. The "sender's own action only" rule on the
email is load-bearing legally: any hint of target activity is the NGL pattern.
Rejected: engagement feeds, streaks, or any surface that rewards checking. Cause
of death: episodic thesis; nothing happens here until everything does.

### 2.4 Verification and identity

No match ever fires to an unverified handle claimant. Verification at launch is
the **bio-code flow**: the product issues a short one-time code, the user places
it in their public Instagram bio, the product confirms it, the user removes it.
Matches are keyed to the verified account identity, not to the handle string, and
identity is re-confirmed at match-fire time: if a handle changed hands or was
renamed since verification, the match holds until re-verification passes, and
fires only after it does.

Meta OAuth is not used in production until Celestual passes a legitimate Meta app
review filed under the company's own entity after the founders' discharge. The
bio-code path is maintained permanently as the fallback even after OAuth exists.

**Why this, and what was rejected.** An unverified match is the cruelest possible
failure: someone claims your ex's handle, enters you back, and manufactures a
fake "it's mutual." One screenshot of that ends a campus. Re-confirmation at
match-fire closes the quieter version of the same failure: A pings @handle, the
target renames, a stranger later claims @handle and verifies legitimately, and a
technically true match fires to the wrong human. Handle strings are mutable;
identities are not. Rejected: launching verification through a borrowed Facebook
developer account belonging to a friend, which was the standing plan. Cause of
death: it is a Terms of Service violation waiting for one enforcement pass,
sitting on an asset the company does not own, underneath a product Meta has
already cloned once (Secret Crush, Facebook Dating, 2019). A production
dependency Meta can kill in an afternoon is not scaffolding, it is a fuse. This
overrules the prior plan on the record.

> **Implementation note (2026-07):** production today runs the **Instagram-DM
> verification** flow (send a one-time code by DM; a webhook confirms the
> sender), not the bio-code flow — there was no OAuth to begin with. The DM flow
> satisfies the same hard line (no match to an unverified claimant, no borrowed
> dev account) and is the pragmatic path until the bio-code backend is wired. See
> the [implementation record](#implementation-record).

### 2.5 The block list and the opt-out page

Blocking is architectural. A user who blocks a handle can never match with it, in
either direction, and the block survives the blocker's own later curiosity: if
the blocker enters the blocked handle, no match ever fires. Blocks are permanent
by default and reversible only through a deliberate settings flow with a
confirmation.

A public opt-out page exists at `celestual.us/optout`, usable by anyone, user or
not. The visitor verifies handle ownership by the same bio-code method and
becomes permanently un-pingable and un-storable: their hash joins a denylist, all
standing pings pointed at them are purged immediately, and the handle can never
be entered again. A sender whose ping is purged this way sees one truthful,
reason-free line: "one of your pings ended. nothing was ever revealed." Attempts
to enter a denylisted handle return: "this handle can't be entered on celestual,"
with no reason given.

**Why this, and what was rejected.** The double-blind is genuinely protective
against stalking: a ping never notifies, so the product cannot contact someone
who cut contact. The block list closes the residual edge where a manipulative ex
who matches gains legitimized re-entry, and it must survive the blocker's
curiosity because the whole point is protection from a moment of weakness. The
opt-out page is simultaneously the legal escape hatch (a non-user's right to be
out of the system entirely, which GDPR and Korea's PIPA effectively require) and
the harassment escape hatch. The reason-free copy is a ruled trade: purging
instantly leaks one bit to the sender (their ping ended early, so the target
probably opted out), and the alternative — showing a false "waiting" state —
breaks the literal-truth rule. Truth wins; the opted-out person's rights win; the
one-bit leak is accepted and documented. Rejected: conditioning opt-out on
account creation. Cause of death: a data-subject right cannot require joining the
system that holds the data.

### 2.6 Communities: canonical tags, counters, and links

At signup, a user optionally tags up to three real communities: their school plus
up to two scenes. Tagging is canonicalized: the user searches an autocomplete
list of communities that already exist for their campus and picks one. Creating a
new community is the rare path, gated behind "no matching community found, name a
new one." An internal admin merge tool lets the founders view all tags per
campus, sorted by size, and merge duplicates; this is a five-minute weekly human
task at current scale.

Every canonical community automatically gets a counter and a shareable, trackable
link the instant it exists: `celestual.us/c/korean-intl-students`. No user
creates, names, owns, or manages anything. Counters are hidden below 100 members
and visible above; the 100-floor applies to every number the product ever
displays, everywhere, with one disclosed exception in 2.7. Counter velocity is
internal telemetry: a community heating up organically is the signal to point the
ambassador machine at it.

The community line shown to senders (on the placed screen, 4.6) appears only when
the counter is above the floor and reads: "your worlds: korean intl students.
2,341 in."

**Why this, and what was rejected.** Canonicalization is the founder's own
revision and it stands: free-text tags fragment ("Korean intl students" and
"korean international alumni network" are the same fifty humans, split into two
counters both stuck under the floor), and full user-created chains reintroduce
naming disputes, ownership, and moderation for no additional function. The
auto-generated `/c/` link restores the one thing counters alone lacked: a
trackable artifact a person can hand to a whole scene, giving real referral
attribution for rollout telemetry. Rejected: user-managed named chains. Cause of
death: build cost and concept overhead with zero surviving unique function.
Rejected: the founder's proposed share copy "This is growing in your community,
it's your time to join it." Cause of death: the claim is false exactly when the
sender most needs the link (a just-created community with twelve members is not
growing), and generic FOMO copy is off-register for a brand whose margin is
literal truth. The link survives; the copy does not.

### 2.7 Campus windows: the assurance contract

A campus does not dribble onto Celestual; it opens. The mechanism is an assurance
contract: nothing starts until a threshold number of people commit, so no early
joiner ever experiences an empty room (Bagnoli & Lipman, 1989, the mechanism
behind Kickstarter). The playbook per campus:

- The threshold is 10 to 15 percent of the student body: roughly 200 to 350
  people at a 1,500-to-2,500-student residential college. It is tuned per campus
  toward the point where a median user's person has a real chance of being
  present.
- Preregistration is the full signup including handle verification, so opening
  day has real verified density.
- The campus page shows the school name, a live meter ("214 of 300"), the line
  "celestual opens at [school] when 300 are in," the reassurance "preregistering
  reveals nothing about you. it just opens the door for everyone at once," and,
  from day one, a visible close date.
- Every window has a hard 28-day close. If the threshold is not reached by the
  close date, the window sunsets: the page retires quietly, and every
  preregistrant receives one honest email: "[school] didn't reach 300 this
  semester. your preregistration stands for next time, unless you'd rather we
  delete it," with a one-tap delete.
- Physical posters carry only the school name, the threshold line, and a QR code
  to the campus page. The meter is the campaign.
- At threshold, every preregistrant gets the opening email and the campus goes
  live at once.

**The week-one reveal.** Seven days after opening, the campus page and an email
to all participants publish the aggregates: pings placed and mutual matches.
Every published number is exactly true. Two floors govern publication, both
disclosed on the campus page before opening: **pings placed publishes only at 100
or above** (the standard floor), and **the match count publishes only at 10 or
above.** Below 10 matches, the reveal publishes pings placed and the pre-stated
line: "match counts publish at ten and above, so no match can ever be guessed
at."

**Why this, and what was rejected.** Critical-mass theory says a
density-dependent product launched thin delivers its worst experience, universal
silence, to its earliest and loudest users (Schelling, 1978; Granovetter,
"Threshold Models of Collective Behavior," AJS, 1978). Preregistration is herd
cover: joining a live confession platform signals "I have someone," but
preregistering for a campus-wide event signals nothing, like signing the Marriage
Pact survey, and Marriage Pact's penetration (majorities of some undergraduate
classes) proves synchronized, deadline-shaped, whole-campus formats clear the
embarrassment bar that ambient adoption does not. The hard close date is a
correction to the source design, which left windows open-ended: assurance
contracts work because of deadlines, and a meter frozen at 214 of 300 forever is
a permanent public failure artifact. Rejected: open-ended windows. Cause of
death: each stalled meter is standing anti-proof on a public URL.

The match floor is the ruling on a contradiction the source document named but
did not resolve: it promised the reveal unconditionally and admitted that four
matches would embarrass rather than ignite. Deciding what to do after seeing bad
numbers is exactly the "reasonable experiment" trap; quietly not publishing would
break the truth brand the moment anyone asked. A floor announced before opening
is truthful by construction and doubles as privacy protection, consistent with
the 100-floor's own de-anonymization logic. Rejected: unconditional publication
and silent non-publication. Cause of death: the first embarrasses with small true
numbers; the second is a lie of omission against a brand whose only margin is
truth.

Joke matches are accepted as residual noise, undetected and undetectable. Two
friends mutually pinging as a bit will happen. The dampeners are structural: each
joke costs both parties one of three scarce slots for sixty days, verification
makes it cost identity, and the send screen's weight (Section 4) makes the act
feel like setting something down, not firing off a gag. Rejected: algorithmic
joke-match detection. Cause of death: there is no honest signal to detect on, and
a false positive, suppressing a real match as a suspected joke, is crueler than
the disease.

### 2.8 Target-status disclosure

After placing a ping, and only after, the sender sees the target's platform
status: "standing" if the target is a verified user, "waiting" if not. Lookups
are rate-limited, and the three-slot cap makes enumeration cost slots, time, and
identity. Status framing platform-wide presents membership as the receiver
identity, findable and door-open, which is the flattering side of the product.

**Why this, and what was rejected.** The disclosure leaks one bit about the
target: membership. It is accepted because Loop A (Section 6) cannot run without
it, because the receiver framing makes membership like having DMs open rather
than like a confession, and because the anti-scanning architecture prices
enumeration out. Rejected: hiding status entirely. Cause of death: it converts
the sender's recruitment energy, the strongest motive in the system, into
undirected helplessness.

### 2.9 How the loops mesh

A person feels the feeling, installed by content or arriving organically. They
place a ping. The placed screen tells them the truth and hands them the playbook
(Loop A, the recruiter loop). They post their open-door card (Loop B, the
deniable artifact, Section 6), which is simultaneously their flex and their
targeted delivery. Viewers arrive two taps from a placed ping and become senders
themselves. Density rises, counters climb, campus meters fill. Windows open (Loop
C), reveals fire, matches happen. Matches become stories with consent, stories
become content, and content installs the reflex in the next community. The
engagement loop and the growth loop are the same loop, achieved without a token
economy.

---

## SECTION 3 · MONETIZATION

Celestual does not monetize during the density phase. Stripe is plumbed and
dormant. Monetization wakes no earlier than the semester after the third campus
opens at threshold, and never mid-window.

When it wakes, the product is one thing: a fourth ping slot, $4.99, one time. It
is reachable only when a user holding three standing pings tries to place a
fourth, and never appears at the first ping, in the share loop, or anywhere else.
There is no subscription, no per-ping charge, no advertising, ever within this
document's authority.

**Why this, and what was rejected.**

The company's binding constraint is density, not revenue. Two founders in the
military, a web product with trivial infrastructure cost, no salaries: the burn
rounds to zero, so revenue solves no live problem, while every dollar-shaped
surface taxes the two behaviors that are the live problem, pings and shares. Each
suppressed ping is a lost latent match, and matches are the story engine. The
fourth slot monetizes intensity of feeling rather than access to the core act,
never blocks anyone (a slot can always be freed by retiring a ping), and touches
neither the first-ping experience nor the share loop. It will make less money
than a subscription in year one. That is the correct trade, and it is reversible;
a poisoned first impression on a 2,000-person campus is not.

Rejected: the $4.99/month subscription with the $2.99 anchor-and-decoy paywall.
Cause of death: Celestual's own thesis. The product is episodic, pest control
rather than social media, used a few moments a year; recurring charges on
episodic products are a churn-and-chargeback machine that re-imports the
retention anxiety the episodic framing dissolves.

Rejected: per-ping pricing. Cause of death: it converts the product's most
valuable act into its revenue extraction point, maximally efficient and maximally
corrosive.

Rejected: "keep this ping standing indefinitely" as a purchasable, which the
source material left on the menu next to the fourth slot. Cause of death: selling
permanence sells away two load-bearing systems at once. The sixty-day purge is
the privacy and legal hygiene (Section 2.3), and the renewal email is the
product's only honest recurring trigger. No price justifies buying back a toxic
data archive and deleting your own trigger.

Rejected: advertising. Cause of death: the database is a map of unrequited
longing; an ad model built over it is radioactive to the exact trust the product
sells, and "paid signals legitimacy" is answered by the truth that campus trust
comes from a warm named brand, a real ambassador, and truthful numbers, not a
checkout page.

---

## SECTION 4 · THE FULL PRODUCT, SCREEN BY SCREEN

Global rules that govern every screen: deep field, generous empty space, the
single warm star as the accent (the galaxy edition lights it with **two** stars —
amber `you`, rose `them`; see DESIGN.md). Serif italics carry the emotional
voice; small quiet sans-serif carries the mechanical voice; letterspaced mono
carries metadata. All product copy is lowercase except handles. Every screen has
exactly one primary action. Every sentence shown to any user is literally true,
always. The felt register everywhere is quiet, adult, certain: the 2am message,
never the carnival.

### 4.1 Cold landing (celestual.us)

The cold landing carries the one sentence, written into the visitor's mouth. Its
hero names the feeling ("you still think about them. what if they think about
you?"). Below it, the mechanism is set as a **three-beat constellation**, not a
flat stack of muted lines: three nodes down a warming rail —

1. **the ping** — "put their @ in." (the `@` lit in the handle's own amber)
2. **the silence** — "they never find out."
3. **the reveal** — "unless they put you in too — *then you both find out, in the
   same second.*" (the lone lit line, serif italic, echoing the match screen)

The nodes escalate: a sent-signal amber dot, a hollow ring of silence, then the
✦ where the two stars meet. One primary action ("find out"), the safety line
("no profiles. no browsing. nothing happens unless it's mutual."), the age line,
and the quiet footer beneath.

**Why this, and what was rejected.** The earlier landing rendered the mechanism
as three small grey sans lines — dull and off-brand for a product whose margin is
a single memorable sentence. Rejected: keeping the flat three-line stack. Cause
of death: it read as boilerplate, and the "enter their instagram handle" line in
particular carried none of the weight of the act. The constellation keeps every
line literally true, casts the registers correctly (mechanics in sans, the reveal
payoff in serif italic), stays inside the locked galaxy vocabulary (DESIGN.md),
and encodes the two-star metaphor in the reveal node. Rejected: a generic
gradient/hero-card treatment. Cause of death: DESIGN.md §9 (no glassmorphism
panels, no gradient buttons, no icon grids); the drama comes from layout and the
two stars, never from decoration.

### 4.2 Referred landing (celestual.us/@poster)

Reached from a poster's Story card. The poster's handle at top. Line: "@poster is
reachable on celestual." A ping field prefilled with the poster's handle, two
taps from Story to placed ping. Beneath, small: "someone else on your mind? enter
anyone."

**Why this, and what was rejected.** The prefill collapses curiosity to core
action, and the poster-directed ping is the single most likely first ping a
viewer has; they tapped for a reason. The small second line is the quiet redirect
to whoever the visitor actually thinks about at 2am. Rejected: any indication of
how many people have viewed or entered the poster. Cause of death: Section 2.1.

### 4.3 Campus window page (pre-open and open states)

**Pre-open:** school name top in label style. The meter, a thin horizontal line
filling with warm light, count in large numerals: "214 of 300." Above: "celestual
opens at reed when 300 are in." Below: "preregistering reveals nothing about you.
it just opens the door for everyone at once." The close date, small but visible:
"window closes december 5." One button: "count me in," which runs full signup and
verification. Bottom, small: "when it opens, everyone finds out together." The
floors are disclosed here, before opening. The page is composed to screenshot
cleanly at phone aspect ratio with the school name and count legible at
group-chat thumbnail size, and the link unfurls with a clean preview card in
iMessage and KakaoTalk.

**Open state:** "it's open. 300 of your campus is in. and counting." with the
send field right there.

**Reveal state, day seven:** "reed, week one: 1,940 pings placed. 63 mutual
matches. every one of them found out something true." Numbers only, exactly
accurate, governed by the floors in 2.7, with the floor rule printed on the page
before opening. Below 10 matches, the match number is replaced by "match counts
publish at ten and above — so no match can ever be guessed at."

### 4.4 Signup and verification

Signup: email (magic-link, no passwords), **birthdate**, Instagram handle. Under
the birthdate field: "celestual is for adults. you must be 18." Under-18
birthdates hard-stop with: "not yet. celestual is 18 and up." The birthdate is
only checked, never stored (data minimization).

Verification screen (bio-code, the canonical production method per 2.4): "prove
@handle is yours. put this code in your instagram bio, then come back: ✦ Code.
you can delete it the moment we've seen it." One button: "check my bio." Success:
"verified. the code can come down now." The code check runs against the public
bio; nothing else is read or stored.

The **/demo sandbox** mirrors the main product exactly — the same screens, the
same workflow — except **nothing is ever written to the database**, and handle
verification auto-confirms locally (the production Instagram-DM flow, sandboxed).
Every write path resolves to a local no-op in the demo, including the public
opt-out.

**Why this, and what was rejected.** Magic-link kills the stored-password breach
surface for a two-person team. The age gate is a hard line (Section 10). Rejected:
social login via the borrowed developer account. Cause of death: Section 2.4.

### 4.5 The send screen

One centered input with the `@` prefix, placeholder "their handle." Above, small
and calm: "who is it?" Below the field, the optional intent row, preset chips,
select one or none:

- "i never got to say something"
- "i think about you"
- "i want to try again"
- "i want to clear the air"
- "i miss you"

Beneath, the slot line: "you're holding 1 of 3." The act should feel like setting
something down carefully, not firing off a DM: weight, not friction. One field and
nothing else, because the action must be executable inside a wave of courage
before it passes (Fogg, "A Behavior Model for Persuasive Design," 2009: ability
high, trigger present, motivation fleeting).

**Why this, and what was rejected.** The intent row is what widens the product
beyond romance without forcing self-categorization, and revealing it only at
match gives the match its narrative payload. Rejected: free-text intent. Cause of
death: a free-text line revealed at the most emotionally open moment in the
product is an unmoderatable harassment and doxxing vector at two-person-team
scale. Five presets carry the full width, new spark to conflict resolution, with
zero abuse surface.

### 4.6 The placed screen (the most important screen in the product)

**State A, target is a verified user:** the star, then serif italic: "it's
standing." Mechanical sub-line: "@them is on celestual. if they ever enter you,
you'll both know in the same moment. until then, silence. which is the point."
One quiet secondary action: "post your door."

**State B, target has not joined:** the star, then: "it's waiting." Sub-line:
"@them isn't on celestual yet. your ping can only resolve if they join. and they
will never know you had anything to do with it." Then a short titled block, "how
people do it," three lines: "post your door to your story. it says nothing except
that you're reachable" / the community line when above the floor: "your worlds:
korean intl students. 2,341 in" with the community link one tap away / "or wait.
this is spreading on its own." Primary button: "post your door."

**Why this, and what was rejected.** This is Loop A, the recruitment ask placed at
the moment of peak motivation, powered entirely by truth and aimed by
self-interest (Fogg, 2009, on trigger placement; Chen, 2021, on the
contacts-graph motive). The copy pre-frames the coming silence as the product
working, not the product being dead, which is the Fact 2 mitigation applied at the
moment expectations form. Every sentence on this screen must remain literally true
forever. Rejected: "more pings unlock when you share," the prior design's reward
at this moment. Cause of death: nobody here wants more pings; they want this ping
to have a chance. Rejected: "this is growing in your community, it's your time to
join it." Cause of death: Section 2.6.

### 4.7 Your pings (the status page)

A quiet list, at most three rows. Each row: the handle, the state word (standing
with a faint warm dot, waiting in cooler grey), days remaining of sixty, and a
small "let it go" affordance with one confirmation: "this frees the slot. nothing
was ever revealed." Near lapse a row gains one line: "lapses in 4 days. keep it
standing?" with one-tap renewal. No activity feed, no engagement bait, nothing
that rewards checking. Deliberately boring by design: nothing happens here until
everything does. If a ping was purged by an opt-out, its row is replaced once by:
"one of your pings ended. nothing was ever revealed."

### 4.8 The door card

"Post your door" renders the user's personal Story card: the field, the star, the
user's handle small at the bottom, the personal link, and the receiver-voice line
in the register the user selects with one toggle:

- **Sincere:** "if there's something you never said to me, it's safe here now."
- **Wry:** "i'm on celestual. do with that what you will."

One button renders the card to the camera roll sized for Stories, with the link
ready to paste as the Story's link sticker. Instagram does not allow reliable
third-party direct-to-Story posting, so download-plus-sticker is the honest flow,
and the card must be beautiful enough to be worth the two steps. In-product
guidance says main Story, and never suggests Close Friends.

**Why this, and what was rejected.** The card is Loop B, the deniable artifact,
fully argued in Section 6. The two registers exist because the register question
is empirically open and the test in Section 5 decides the default. The main-Story
rule is structural: Close Friends is a curated audience, and a target who sees the
card there knows they were selected, which collapses the deniability the card
exists to provide. Rejected: a Close Friends posting flow. Cause of death:
deniability is a main-Story property, not a card property.

### 4.9 The match

Both parties, same instant, by email. Subject, quiet and unmistakable: "celestual:
it's mutual." The screen: the star, slightly larger than anywhere else in the
product, the one place the brand permits brightness. Serif italic: "it's mutual."
Then: "you entered @them. @them entered you. this only ever happens when it's real
on both sides." If either attached an intent, it is revealed now, quoted in a
bordered block: they said: "i never got to say something." One button: "go say
it," deep-linking to the Instagram DM thread. Beneath, small, the exit line: "the
rest is yours. celestual's part is done."

No share button, no confetti, no screenshot-bait artifact.

**Why this, and what was rejected.** The story travels by telling, which forces
the brand to travel with it (Berger's Trojan-horse test, *Contagious*, 2013), and
the absence of a gotcha artifact is the anti-humiliation architecture. The product
stepping back at exactly the right moment is itself the detail people retell.
Rejected: any share affordance on this screen. Cause of death: it converts the
product's sacred moment into marketing surface and hands both parties a
humiliation risk.

### 4.10 The fourth slot (dormant)

Reachable only when a user holding three standing pings tries to place a fourth.
Copy: "you're holding three. you can let one go. or hold a fourth." Until
monetization wakes, one door: "let one go," routing to the status page. When it
wakes: the second door appears, "hold a fourth. $4.99, once."

### 4.11 Block and settings

Settings contains: block a handle, manage pings, delete account, opt out. Block
flow: enter handle, confirm: "blocked. @them can never match with you, even if you
enter them someday. this is permanent unless you undo it here." Delete account
purges all pings and personal data and confirms by email.

### 4.12 The opt-out page (celestual.us/optout)

Public, linked in the site footer, usable by non-users. Copy: "want out? verify
your handle and it becomes permanently un-enterable on celestual. anything ever
pointed at it is deleted. this works whether or not you've ever used celestual."
Verification is the bio-code flow. Confirmation: "done. @handle can never be
entered on celestual, and nothing about it remains."

### 4.13 The emails

All transactional email sends from a warmed dedicated domain with SPF, DKIM, and
DMARC configured from day one, through an established provider. Subjects are plain
and short; emotionally-worded subjects from a new domain are spam-filter bait, and
the match email silently failing is the product's one magic moment silently
failing.

- **Renewal:** subject "your ping lapses friday." Body: "your ping for @them
  lapses friday. still feel it? keep it standing. one tap. if not, let it go.
  nothing was ever revealed either way."
- **Window open:** subject "reed is open." Body: "300 of your campus is in.
  celestual is live at reed, now." One button: "go."
- **Reveal:** subject "reed, week one." Body: the reveal numbers, exactly as on
  the page.
- **Match:** subject "celestual: it's mutual." Body: the match screen link and
  nothing else.
- **Sunset:** subject "reed, this semester." Body: "reed didn't reach 300 this
  semester. your preregistration stands for next time, unless you'd rather we
  delete it." One-tap delete link.

**Why this, and what was rejected.** Match notification, window-open, and renewal
all ride email, and students do not read email reliably; deliverability
engineering is unglamorous and day-one. Rejected: SMS as the primary channel.
Cause of death: cost, international complexity from Korea, and phone numbers are
more data to hold for a company whose discipline is to hold less.

---

## SECTION 5 · BRAND AND VOICE

### 5.1 The visual system

The canonical look is the galaxy edition (DESIGN.md): one deep cosmic-violet
field with a living galaxy behind every screen, lit by two warm stars —
starlight-amber (`you`) and rose (`them`). Serif italic for the emotional voice,
small quiet sans-serif for the mechanical voice, letterspaced mono for metadata,
all lowercase except handles. Generous empty space; one primary action per
screen. The brand at its brightest is the match screen; everywhere else it is a
held breath.

### 5.2 The tone

Quiet, literary, intimate, adult, certain. The reference feeling: the 2am message
you almost sent. Celestual speaks about resolution, never pursuit. It dignifies
silence instead of apologizing for it. It never pleads, never hypes, never
congratulates itself.

### 5.3 The register ruling: sincere interior, tested exterior

The product interior is sincere, always. Every in-product line, email, and
legal-adjacent sentence stays in the quiet literary register. This is not tested;
it is the brand.

The public-facing door card ships in two registers, sincere and wry, and a seeded
test decides the default before any campus window. The test: finalize both cards,
seed to 30 people across the founders' orbits, measure sincere-card posting within
72 hours. Decision rule, locked now: below 15 percent sincere posting, the wry
card is the default and sincere remains the toggle option; at or above 15 percent,
sincere is the default. The rule is set before the sends so the data decides, not
the mood after.

**Why this, and what was rejected.** The founder's instinct that the sincere card
is "too cringe" for adults to post is directionally right and priced at 25 to 40
percent cold posting (reasoned, Section 11), but the middle-school comparison
misdiagnoses it: NGL and Sendit cards were posted en masse by 18-to-22-year-old
college students in 2021 and 2022, so age is not the barrier; irony was the
lubricant and sincerity is the risk. The cohort's documented convention (the
"delulu" and manifesting vocabulary, longing voiced through self-aware comedy)
means wry is the native dialect, not a fallback. The original design's
counterpoint also stands: the mechanism is register-independent, and sincerity
from a poster with social standing reads magnetic, not thirsty. Nobody in this
argument has data; the test is cheaper than being wrong on a campus. Rejected:
shipping sincere-only. Cause of death: it bets the only distribution channel of
the military window on the less likely register. Rejected: deciding by taste
without the test. Cause of death: dueling intuitions between founder and analysis,
resolvable for zero dollars in one week.

### 5.4 The voice guide

Principles: short sentences. Lowercase. Say the true thing plainly and stop. Name
the feeling, never the demographic. Silence is dignified, not apologized for. The
product recedes; the two humans are the story. No exclamation marks, no emojis in
product, no urgency theater, no "unlock," no "boost," no "don't miss out," and the
word "app" is not used; Celestual is a place.

**Lines to imitate, sincere register:**
- "there's someone you never said it to."
- "until then, silence. which is the point."
- "this only ever happens when it's real on both sides."
- "the rest is yours. celestual's part is done."
- "still feel it? keep it standing."
- "say it before everyone scatters."

**Lines to imitate, wry register (card and content only, never product
interior):**
- "i'm on celestual. do with that what you will."
- "worst case, nothing happens and no one ever finds out. best case is the best
  case."
- "be honest. there's one name."
- "delulu is a strategy now."
- "you've drafted the text forty times. this isn't the text."

**Lines that are never written, in any register:**
- anything implying a specific person entered anyone ("someone's thinking about
  you…")
- anything with manufactured urgency ("only 3 spots left!")
- anything pleading ("we'd love it if you shared!")
- anything about the user base that is not exactly true
- anything addressed to or about minors

---

## SECTION 6 · THE GROWTH ENGINE

### 6.1 The demographic the engine is designed against

The primary persona: a 19-to-21-year-old woman, sophomore or junior, at a small
residential college in the US. Instagram-native, TikTok-fed. The secondary persona
is the Korean international student scene member, where the founders have unfair
access; design for her, and the scene comes along.

Why her: eight in ten US adults 18 to 29 use Instagram, and women out-use men on
Instagram (55 vs 44 percent) and TikTok (Pew Research Center, Americans' Social
Media Use, 2025: grounded). Women disproportionately drive early adoption of
campus matching formats; Marriage Pact's campus coverage has repeatedly reported
female-skewed signups, and dating products treat female adoption as the constraint
that unlocks male adoption (observed pattern, and reasoned in its application
here). She is the network node that matters: more group chats, more Stories, and
her presence is what makes the platform credible for everyone else.

Her surfaces, and the design rules they force:

- **Her grid is a museum, not a diary** (a few curated posts a semester; observed,
  consistent with Mosseri's public acknowledgment that feed posting has migrated
  away from young users). Nothing in this plan asks for a grid post, ever.
- **Her main Story is the deniable broadcast surface.** Stories rank on recency
  and relationship and serve existing followers (grounded, Instagram's published
  ranking guidance), which is a weakness for reach and a strength for Celestual:
  the target is a follower, and a target who occasionally views the sender's
  profile has exactly the engagement history that surfaces the sender's Story
  early in their tray. The door card is main-Story only. Close Friends implies
  selection and collapses deniability (Section 4.8).
- **Her default gesture is the send, not the post.** More rich media is shared in
  Instagram DMs than in Stories, and more in Stories than in feed (Mosseri, 20VC
  interview: grounded), and DM sends are the platform's most heavily weighted
  distribution signal (Mosseri, January 2025: grounded). Every artifact in this
  engine must be sendable, not merely postable.
- **Public pursuit is the one thing she never posts.** The soft-launch convention
  (relationships revealed only after they are secured, through deliberate
  ambiguity; observed, documented in trend press since roughly 2021) encodes the
  rule: desire is displayed only after reciprocation. Celestual's core act sits on
  the wrong side of that line, so every mechanic below routes around her exposure,
  never through it. The sharer always comes out desirable, plugged-in, or helpful.
  Never pining. Any proposed mechanic that fails this bar is dead on arrival, by
  rule.
- **She voices longing publicly only in irony armor** ("delulu," manifesting
  jokes, third-person memes; observed). Wry is the native dialect; sincerity is
  the foreign accent. This is why the register test exists.
- **TikTok installs the feeling; Instagram holds her people.** 62 percent of
  18-to-29-year-olds use TikTok and roughly half daily (Pew, 2025: grounded), but
  she consumes far more than she posts there. TikTok gets content only; no share
  mechanic lives on a graphless surface.
- **For the Korean intl scene, the group-chat organ is KakaoTalk.** Every drop
  artifact must unfurl a clean link preview in KakaoTalk or it dies in transit.

### 6.2 STEPPS, applied (Berger, *Contagious*, 2013)

**Social Currency (conditional, and the hinge).** People share what makes them
look good. Using Celestual as a sender is exposure, so the public face of
Celestual is always the receiver face: the door card says "I am reachable," a mild
flex that confesses nothing. The mechanic: the two-register door card (4.8), whose
deeper function is the quiet heart of the whole design. A sender whose target has
not joined posts their own card to their main Story; the target, a follower, sees
it and gets curious; to the world and to the target, the sender posted a generic
flex to all their followers, and only the sender knows the card was aimed. The
genuinely open poster and the covertly targeting one are indistinguishable, which
is what makes it safe for both. This is the answer to the central design problem
in Section 1.

**Triggers (natively weak; the structural hole).** Top of mind is tip of tongue,
and the canonical fix is pairing the product to an existing recurring cue
(Berger's Kit Kat and coffee case, the 2007 Chorak campaign). Celestual owns no
daily moment, so it owns the calendar instead. The mechanic: the semester
deadline. Twice a year, every campus produces real, un-manufactured urgency: the
last two weeks before summer and before winter break, plus graduation and
study-abroad departures. The line: "say it before everyone scatters." Windows open
into these weeks, renewal pushes schedule against them, and content hammers them.
The ambient secondary trigger: the brand colonizes 2am in content (the phrase, the
posting time, the caption convention), pairing Celestual to the late-night scroll
that already exists in her life. The personal-level trigger is the 60-day renewal
email (2.3).

**Emotion (natively strong).** High-arousal emotions, awe, anticipation, anxiety,
drive transmission; low-arousal sadness kills it (Berger & Milkman, JMR, 2012).
The mechanic: the week-one reveal engineered as an awe artifact, one screen, the
school name, two enormous true numbers, built to be screenshot. The discipline
rule for all content: every piece ends on anticipation, the held breath, never on
loss.

**Public (natively weak by design).** Observability drives imitation (Berger's
Movember case). Celestual is deliberately invisible, so the compensating layer is
the campus meter and the community counters. The mechanic: the meter page as a
drop object (4.3), composed to screenshot cleanly and unfurl cleanly, because the
meter is Celestual's Movember mustache and the forward is the gesture.

**Practical Value (natively strong, and the cringe-router).** Useful things get
shared (Berger's "News You Can Use"). The person best positioned to spread
Celestual is not the pining user; it is the pining user's best friend. Every
friend group contains one person who will not shut up about someone and one friend
tired of hearing it. Recommending Celestual to that friend confesses nothing,
helps visibly, and makes the recommender look clever. The mechanic: the
friend-forward content format, a standing content format built for the DM forward
with the CTA convention the cohort already obeys ("send this to the friend who
still checks their story"), whose payload is the one sentence. Zero code. It is
the only mechanic that works at zero density.

**Stories (the strongest principle).** The Trojan-horse test: does the story die
without the brand in it? A Celestual match story is untellable without the
mechanism ("we both entered each other and it told us at the same second"). The
mechanic: the consented match-story pipeline. Fourteen days after a match, one
email: "did it turn into something? tell us. we'll only ever tell it if you both
say yes." Enthusiastic double consent, then it feeds the content engine. The match
screen's exit line is already engineering the retell.

### 6.3 The mechanics, ranked by impact per unit of effort

1. **The friend-forward content format.** Zero code; content-team execution; works
   during the military window at zero density; directly rehearses the one
   sentence. This is built first. Success metric: sends per reach against the
   account baseline.
2. **The door-card register test, both variants.** Card design plus 30 seeds; it
   gates everything built downstream of the card (rule in 5.3).
3. **The meter page as a drop object.** A design constraint written into the
   window spec now; near-zero effort; dormant until the first window.
4. **The semester-deadline rhythm.** Scheduling and copy; locked now, fired at the
   first window.
5. **The reveal as an awe artifact.** One screen's design; contingent on an
   opening and on match rate.
6. **The match-story consent pipeline.** One email flow; compounds for years;
   built after the first opening.

**Why this ranking, and what was rejected.** The ranking is impact divided by
effort under the binding constraint that nothing requiring a campus can fire
before one exists. Rejected as share mechanics, with cause: any mechanic asking
the sender to identify themselves as a sender (dead by the exposure rule in 6.1);
the share-gated admirer counter (dead in Section 2.1); broadcast referral
incentives (dead in 2.2); the "growing in your community" push copy (dead in 2.6).
The estimated funnel this engine feeds, stated so it can be argued with: organic
impression to landing 0.1 to 0.5 percent, Story link-sticker tap-through 1 to 3
percent of viewers, landing to verified signup 5 to 15 percent (verification is
the heaviest self-inflicted leak, paid for impersonation defense), signup to first
ping 60 to 85 percent, ping to posted card 2 to 10 percent cold and 15 to 30
percent under window herd cover, posted card to new verified signup 0.1 to 1. All
reasoned estimates, none grounded; the leakiest step is the share, which is why
mechanics 1 and 2 exist.

---

## SECTION 7 · THE CONTENT ENGINE

### 7.1 Role and register

Content is the third recruitment channel, the one requiring nothing from any
sender, and the only loop that works at zero density, which makes it the primary
activity of the military window. When content installs the reflex broadly, some
fraction of targets arrive on their own, and every standing ping quietly gains
resolution probability.

The register is high-arousal anticipation, never melancholy (Berger & Milkman,
JMR, 2012). Longing is filmed as a held breath, not a wound. Every piece ends on
possibility. A piece that ends deflated is re-cut or killed.

Six of every seven weekly posts are organic, building the audience around the
feeling with no product mention. At most one in seven carries the product, and
when it does, it carries it as advice (the friend-forward format), never as an ad.

### 7.2 Cadence and ownership

Seven posts per week, crossposted to Reels, TikTok, and Shorts, posted 9 to 10pm
US Eastern (10 to 11am KST next day, inside the founders' workable hours):

- 2 street interviews. Standing prompt: "tell me about the one person you can't
  stop thinking about."
- 2 skits.
- 1 talk-to-camera advice piece.
- 1 wildcard, on-brand.
- 1 DM Story Series post, sourcing real reconnection stories from followers with
  consent.

The fallback floor is 4 posts per week (2 interviews, 1 advice, 1 DM Series) for
any week skits cannot ship. Consistency trains the algorithm toward a specific
audience; sends per reach is the top-weighted distribution signal (Mosseri,
January 2025), so the metric for every piece is sends, then saves, then follows.
Volume beats perfection.

Geography discipline: content targets the US campus cohort; posting times,
references, and captions are hers. Scattered non-target virality is accepted as
cost and never chased. Composite-character rule: every "ex," "roommate," or
"friend" in any script is fictionalized and composite; no real, nameable
individual is ever depicted.

**Why this, and what was rejected.** The structure's single point of failure is
the on-camera performer, not the founders, so every format is documented to be
performable by a substitute, and the two founder-runnable formats (DM Series, and
faceless text-on-screen edits) are the hedge. Rejected: a daily posting demand.
Cause of death: unmeetable under military constraint, and a broken streak trains
inconsistency. Rejected: engagement-bait CTAs asking viewers to comment names or
handles. Cause of death: soliciting third-party handles publicly is a privacy
foot-gun pointed at exactly the people the product promises to protect; comment
CTAs ask for feelings or emoji, never names.

### 7.3 Hooks (the first two seconds, ready to film)

Each hook is one to two lines as it appears on screen or is spoken, labeled by
angle. All work faceless (text-on-screen over b-roll) unless noted.

- *(relatable)* "you didn't lose feelings. you just lost the nerve."
- *(curiosity)* "the answer to 'do they ever think about me' exists. you just
  can't see it."
- *(dare)* "be honest. there's one name."
- *(relatable)* "it's been eight months and you still check who viewed your
  story."
- *(funny)* "me: i'm so over it. also me at 2:14am: [typing their @]"
- *(confession, on-camera)* "my roommate and her ex both never said it. for three
  years. both of them."
- *(FOMO, window weeks only)* "your whole campus is about to find out at the same
  time."
- *(helper/dare)* "send this to the friend who won't shut up about them."
- *(relatable)* "the door isn't closed. you just never knocked."
- *(curiosity)* "there's a version of tonight where you already know."

Top two to film first: hook 8, because it is the friend-forward engine itself and
the send is the metric; and hook 5, because self-aware irony is the native dialect
and it earns the send without asking for it.

### 7.4 Two scripts, ready to shoot

**Script A. Organic, no product.** SHORT, roughly 25 seconds, about 70 words.
On-camera or faceless over night-drive b-roll.

> okay so nobody talks about this part. you don't miss them at like, noon. you're
> fine at noon. it's 2:14am and you're holding your phone and their name is just.
> right there. and you type it and delete it and type it and delete it. and then
> you put the phone down and tell yourself that counts as moving on. it doesn't.
> but you'll be back tomorrow. same time.

On-screen text: "2:14am again." CTA: "comment 🕯️ if you know the exact time."
Audio direction: slowed ambient, low. Ends on anticipation: "same time" is the
held breath, not a wound.

**Script B. The friend-forward, product-carrying.** MID, roughly 45 seconds,
about 120 words. Talk-to-camera.

> this is for you if your best friend has one person they cannot shut up about.
> you know the one. every playlist, every "should i text them," every story-view
> autopsy. okay. there's a site called celestual. here's the whole thing: your
> friend puts in that person's @. the person never finds out. not a notification,
> nothing, ever. unless. that person puts your friend in too. and then, only then,
> both of them find out at the same second. if it's not mutual, it just stays
> silent forever, and nobody ever knows. so no, i'm not telling you to confess
> anything. i'm telling you to send this to the friend, so they can stop drafting
> that text.

On-screen text: "for the friend who won't shut up about them." CTA: "send this to
them. you know who." Note the sentence inside it: they never find out, unless
mutual, same second. The speaker is the helper; nobody in the video is the pining
one.

**Why this, and what was rejected.** Scripts are written spoken-first, as a person
talks at 1am, never as thesis sentences; each contains one unmistakably specific
detail (2:14am, the story-view autopsy), because specificity is the share
multiplier. Rejected: scripts that resolve ("…and that's why I finally texted him
and we're together now") outside the consented match-story pipeline. Cause of
death: unearned resolution reads fake, and fake stories are the one content crime
a truth-margin company cannot commit.

---

## SECTION 8 · THE ROLLOUT

Time-anchored from July 2026. Founders discharge approximately April 2027.

**Phase 1: July to December 2026. Hardening and the audience.** This week: the
friend-forward format goes live (zero code). The register test cards are finalized
and seeded by mid-August; the 5.3 rule decides the default card. The build list
for the semester, in order: verification (identity-keyed matching, re-confirm at
match-fire), salted-hash storage of unmatched targets, the 60-day purge job, the
opt-out page and denylist, architectural block, email infrastructure (warmed
domain, SPF/DKIM/DMARC), screens 4.1 through 4.9, the canonical community system
and `/c/` links, and the window page built to the drop-object spec. Content runs
the 7.2 cadence continuously. Nothing else ships. No campus window opens in fall
2026.

**Phase 2: January to May 2027. One calibration window.** One campus. Selection
criteria, in order of weight: an ambassador the founders would hire (the
ambassador gates the campus, never the reverse); 1,500 to 2,500 students,
residential; a live campus-app culture (Fizz or equivalent) for the meter drop; an
academic calendar with finals in late April or early May. Ambassador signed by
February 1 under the written agreement in 8.5. Posters up roughly March 23. The
28-day window closes roughly April 20, timed so the open and the week-one reveal
land inside the pre-summer "before everyone scatters" weeks, with the founders
discharging into the tail of it. The window is publicly a launch and internally a
calibration: its job is to produce the first real values of preregistration
velocity, open-day ping volume, and match rate.

**Phase 3: June to August 2027. Harvest and reload.** Postmortem against the
Section 9 metrics. Match-story pipeline runs on whatever the calibration produced.
Ambassadors recruited and signed for four fall campuses. Content compounds.

**Phase 4: September to December 2027. The offensive.** Four campuses, sequenced,
founders on the ground for each open: two windows opening late September to
mid-October, two timed so the open and reveal land in the pre-winter-break
deadline weeks. Each campus runs the full playbook: ambassador seeding, posters
and campus-app posts pointing at the meter, the drop artifact in group chats, the
reveal on day seven.

**Why this, and what was rejected.** The sequencing honors the source's own
finding that campus windows feed on ground energy the founders cannot supply until
discharge, and prices the remote-execution discount into the odds (Section 11)
instead of pretending it away. Rejected: any fall 2026 window. Cause of death: the
product is unhardened, the register question is undecided, the ambassador pipeline
does not exist, and a failed meter is a permanent public artifact; the expected
information value does not cover the expected reputation cost. Rejected: two or
more calibration windows in spring 2027. Cause of death: the second attempt
doubles public-failure surface while the founders can stand on neither campus, and
produces almost no information the first does not. Rejected: aiming the first real
offensive at anything earlier than fall 2027. Cause of death: the military window
buys understanding, not traction, and a quiet 2026 is the plan working, not
failing.

### 8.5 Ambassador operations

One ambassador per campus plus one named backup, always. Ambassadors sign a
one-page written agreement covering: they represent the mechanism truthfully and
never imply anyone entered anyone; all public materials (posters, campus-app
posts, scripts) come from HQ and nothing self-made is posted without approval; the
age line is absolute, 18 and up, no high schools, no exceptions, and the marketing
rule is age-based, not campus-based, because a meaningful share of college
freshmen are 17; and either side can end the relationship with one message.
Cadence: one 20-minute call per week during a live window. Kill criteria, decided
now: an ambassador who spams, misrepresents the mechanic, or touches the age line
is removed the same day, and the backup steps in or the window sunsets early.

**Why this, and what was rejected.** Ambassadors are borrowed, fragile assets and
the company's face; a single ambassador incident is the company's first headline.
Unpaid remote ambassador programs have high flake rates, hence the standing
backup. Rejected: paying ambassadors cash during the density phase. Cause of
death: no budget, and paid evangelism reads as paid on a small campus. The
compensation is the real one: first-mover status, the title, and a documented
operator role.

---

## SECTION 9 · THE METRICS

### 9.1 The governing number

Ping resolution rate: the fraction of pings whose target is a verified user at
placement, or becomes one within the ping's sixty-day life. This is the number
that decides whether the thesis is working, because it measures the only thing the
product sells: the person you are thinking about being present. It is graph-local
by construction; scattered signups cannot inflate it.

### 9.2 The working metrics, by owner

- **Content:** sends per reach first (the top-weighted distribution signal,
  Mosseri, January 2025), then saves per reach, then link taps to the landing
  page. Follower count is vanity and is not reported.
- **Growth and windows:** preregistration velocity per campus per week; percent of
  threshold at day 14 and day 21 (day-21 pace predicts whether a window makes its
  close); poster-QR scans; `/c/` link attribution (which community links produce
  verified signups).
- **Product:** verification completion rate (started to verified; this is the
  funnel's heaviest self-inflicted leak and the first thing to instrument); signup
  to first ping rate; door-card downloads per placed ping, split by register;
  day-60 renewal rate; opt-outs, blocks, and reports as a trust line.

Per opened campus, the two numbers that decide everything: ping resolution rate
inside the campus, and match rate, the fraction of pings that resolve mutual
inside a dense community. Match rate has no comparable case anywhere; the first
opening exists to measure it.

### 9.3 Failure signatures, named in advance

- The reveal is the peak: strong week one, then the campus goes quiet, and no
  second campus ignites from the first's stories. This is the silence problem
  winning.
- Cold card-posting rounds to zero in both the seeded test and live. Loop B is an
  amplifier that is not amplifying; weight shifts to windows and content.
- A window stalls below 70 percent of threshold at day 21. Pace at day 21 decides
  whether the last week gets ambassador surge effort or the window is allowed to
  sunset on schedule.
- Scattered-signup ratio: if fewer than 40 percent of new verified signups sit on
  target campuses or tagged communities, content is buying the wrong audience and
  its geography discipline gets tightened.
- Match rate inside a properly dense campus is structurally tiny. This is the
  gravest signature and it indicts the product thesis, not the growth design; it
  triggers a founder-level re-examination, not a marketing push.

**Why this, and what was rejected.** Every metric above changes a named decision;
anything that does not is not tracked. Rejected: K-factor as a reported number
(Section 1), downloads and follower counts as success measures (vanity), and any
engagement metric that rewards checking (Section 2.3).

---

## SECTION 10 · RISKS AND THE LINES WE HOLD

Named without softening, each with the commitment that answers it. This is a risk
register, not legal advice, and the founders retain a lawyer before monetization
wakes.

- **The silence problem is the most likely killer.** Most users' complete
  experience: enter someone, hear nothing, forever. Commitments: expectation-
  framing at the placed screen, aggregate reveals, renewal touchpoints, episodic
  positioning. It is mitigated, never cured, and it is priced into Section 11.
- **The forbidden lever will tempt, by name, when growth stalls.** "Notify people
  someone entered them," "imply activity," "pad a counter": the NGL pattern, a $5M
  FTC order and a minors ban (FTC v. NGL Labs, 2024). Commitment, pre-committed in
  writing in the founders' operating agreement: no individual implication, no
  inflated numbers, ever, under any growth pressure. Every number Celestual
  displays is legal because it is true; truth is the entire margin.
- **Shadow data on non-users is live GDPR and PIPA exposure.** A ping at a
  non-user stores a third party's identifiable data attached to the most sensitive
  inference imaginable. Commitments, all day-one: unmatched target handles stored
  salted-and-hashed, plaintext rendering only in the sender's own view; purge on
  the sixty-day expiry; the public opt-out page. Korea's PIPA applies to the
  founders while operating from Korea; GDPR arrives with the first EU user.
- **A breach is company-ending.** The unmatched-ping table is a map of unrequited
  longing indexed by real identities. Commitments: encrypt at rest, minimize
  retention (the expiry is doing legal work), log access, store nothing the
  mechanism does not strictly need, no passwords held (magic-link auth).
- **Impersonation and false matches are the cruelest failure.** Commitment: no
  match ever fires to an unverified claimant, and identity is re-confirmed at
  match-fire so handle renames and recycled handles cannot produce a
  technically-true match with the wrong human (Section 2.4).
- **Meta risk sits under the whole company, twice.** First, verification: the
  borrowed developer account is rejected outright (2.4); bio-code is production, a
  legitimate app review comes post-discharge, and bio-code remains the permanent
  fallback. Second, distribution: Instagram suppresses link domains it flags as
  spammy, and NGL-pattern link volume is exactly what gets flagged. Commitments:
  link volume grows with real users only, never automated; a reserve domain is
  registered and kept warm; and strategically, Meta cloning the mechanic is
  already priced in (Secret Crush, 2019 proved the mechanic without distribution
  is inert), which is why the moats are density-in-communities and brand.
- **Minors are a hard line, and "college-only" does not clear it.** A meaningful
  share of college freshmen are 17. Commitments: hard 18+ gate at signup, the rule
  stated age-based everywhere, fast purge on suspected-minor accounts, ambassadors
  bound in writing, no high school touched for any reason.
- **Stalking and harassment.** The double-blind is genuinely protective: silence
  in, silence out. Residual edges and their commitments: copy speaks resolution,
  never pursuit; the block is architectural and survives the blocker's curiosity;
  the opt-out page is the universal escape hatch, user or not.
- **The register cringe risk.** If the card reads thirsty, Loop B dies the Bang
  With Friends death (2013). Commitment: the two-register card and the pre-ruled
  seeded test (5.3) before anything downstream is built.
- **Joke matches and Sybil pairs can poison the reveal.** Commitments: slot
  scarcity and verification as structural dampeners, the match-count floor, and
  acceptance of the residual as noise rather than building a false-positive-prone
  detector (2.7).
- **A failed window is a public artifact.** Commitment: the 28-day hard close, the
  quiet page retirement, and the honest sunset email (2.7). No meter is ever left
  frozen in public.
- **A bad week-one number is a trap with no good improvisation.** Commitment: the
  match-count floor of 10, disclosed on the campus page before opening, decided
  here and not after seeing data.
- **Email is the single payoff channel and students do not read it.** Commitment:
  warmed dedicated domain, SPF/DKIM/DMARC from day one, plain subjects, an
  established provider, and deliverability checked before the first window.
- **Ambassadors are the company's face and its most fragile asset.** Commitments:
  the written agreement, HQ-approved materials only, the standing backup, weekly
  calls during windows, same-day removal on any line touch (8.5).
- **Content geography and density geography do not overlap, and the performer is a
  single point of failure.** Commitments: geography discipline and the
  scattered-signup metric (9.3); every format documented to be performable by a
  substitute; the two founder-runnable formats as the hedge.
- **The founders' active-duty status may restrict operating a business**,
  separately from availability. Korean active-duty service members face
  outside-activity restrictions whose exact scope is not asserted here because it
  is not known here. Commitment: verified with a Korean lawyer before monetization
  wakes and before any public founder-facing operation.
- **The non-romantic use cases carry zero behavioral evidence.** The long-term TAM
  story (reconnection, conflict resolution) is currently an argument, not a fact.
  Commitment: the intent-chip distribution at real matches is the first evidence
  either way, and no company claim outruns it.

---

## SECTION 11 · THE HONEST ODDS

Per component. Grounded means a real comparable case exists and is named; reasoned
means coherent argument without direct proof. These are never averaged, because
the design fails at its weakest live link.

- **That the Story-card pipe can distribute at scale:** grounded, 85 percent or
  better. The link-in-Story loop carried NGL and Sendit to tens of millions of
  installs with this demographic on this platform (2021 to 2022). The pipe is
  about as proven as anything in consumer growth.
- **That the sincere card clears the cold posting bar:** reasoned, 25 to 40
  percent. Below the source's 40 to 60, because there is no herd cover during the
  military window and the cohort's irony convention cuts against sincerity. Under
  window herd cover: 50 to 65 percent, reasoned. The wry fallback makes this
  survivable either way, and the test in 5.3 converts the uncertainty into data
  for free.
- **That one remotely-run assurance-contract window hits threshold:** grounded on
  the format (Marriage Pact; Bagnoli & Lipman, 1989), reasoned on the remote
  discount: 20 to 35 percent per attempt. Across the five attempts scheduled
  through 2027, the odds at least one campus opens properly: 60 to 75 percent, and
  one true opening is the proof the whole thesis needs.
- **That an opened campus's match rate is high enough that the reveal ignites
  rather than embarrasses:** reasoned only, 20 to 50 percent, stated wide on
  purpose. There is no comparable case for this number anywhere; the first opening
  is the experiment that produces it. Anyone pretending precision here is lying.
- **That the mechanic alone spreads:** grounded, and the evidence is against it:
  under 5 percent. Facebook shipped this exact mechanic at infinite density
  (Secret Crush, 2019) and it made no cultural dent; Bang With Friends (2013)
  spiked and died of cringe. The mechanic is necessary and has never once been
  sufficient. Everything rides on the wrapper: the windows, the reveals, the
  register, the content.
- **That the content engine builds a compounding audience that meaningfully seeds
  a campus before mid-2027:** reasoned, 30 to 50 percent. It is mostly a bet on
  execution consistency under the military constraint, hedged by the fallback
  floor.
- **That Celestual becomes a durable multi-year company:** reasoned, 5 to 10
  percent from here. The honest base rate for pre-traction consumer social with a
  two-person team, adjusted up for a coherent thesis and near-zero burn, down for
  founders non-deployable until April 2027 and for the non-romantic TAM having
  zero behavioral evidence. Conditional on one true opening with a week-one reveal
  that clears its floor: 25 to 40 percent. The realistic good outcome of the next
  twelve months is one opened campus, one honest reveal, and a compounding content
  engine, and that outcome moves the number substantially.

---

## SOURCES

- Bagnoli, M. & Lipman, B. (1989). "Provision of Public Goods." *Review of
  Economic Studies.* Assurance contracts.
- Berger, J. (2013). *Contagious.* STEPPS; Social Currency; the Trojan-horse test;
  the Kit Kat trigger case (Chorak, 2007).
- Berger, J. & Milkman, K. (2012). "What Makes Online Content Viral?" *Journal of
  Marketing Research* 49(2). High-arousal transmission.
- Chen, A. (2021). *The Cold Start Problem.* Atomic networks; contacts-graph
  motives.
- Fogg, B.J. (2009). "A Behavior Model for Persuasive Design." Trigger at peak
  motivation.
- FTC v. NGL Labs (2024). $5M order; fake-notification deception; ban on serving
  minors. The category's legal perimeter.
- Granovetter, M. (1978). "Threshold Models of Collective Behavior." *American
  Journal of Sociology* 83(6).
- Marriage Pact (Stanford, 2017 to present). The proven comp for synchronized,
  windowed, whole-campus matching events.
- Mosseri, A. 20VC interview (DM-first sharing) and January 2025 ranking-signal
  statements (sends per reach).
- NGL and Sendit growth histories (2021 to 2022). The Story-link loop as a proven
  channel. Facebook Secret Crush (2019). Bang With Friends (2013). Gas (2022) and
  TBH (2017). The mechanic's full cautionary record.
- Pew Research Center (2025). Americans' Social Media Use. Platform adoption for
  18-to-29-year-olds.
- Rogers, E. *Diffusion of Innovations.* Local adoption clusters; observability.
- Schelling, T. (1978). *Micromotives and Macrobehavior.* Critical mass and
  tipping.

---

## IMPLEMENTATION RECORD

*What the code does today, and where it deliberately differs from the guide above.
Added 2026-07-04 alongside the changes this document prompted.*

The React/Supabase app already implements the bulk of Sections 2 and 4: the ping,
the three-slot cap, the sixty-day ping + renewal, handle verification (no match to
an unverified claimant), the block/opt-out + denylist, the canonical communities +
`/c/` links with the 100-floor, the campus windows (window / open / reveal), the
placed recruiter screen, the door card, the no-share match screen, and the dormant
fourth slot. This pass changed:

1. **Cold landing (§4.1)** — replaced the flat three-line mechanic block with the
   three-beat constellation (the ping / the silence / the reveal), the reveal's
   payoff in lit serif italic, inside the locked galaxy vocabulary
   (`app/src/components/screens.jsx`, `app/src/i18n/strings.js`,
   `docs/DESIGN.md`).
2. **Intent chips (§4.5)** — aligned the five presets to the guide's exact set
   (`i never got to say something / i think about you / i want to try again / i
   want to clear the air / i miss you`).
3. **18+ hard gate (§4.4, §10)** — added a birthdate field to the signup identity
   step that hard-stops under-18 and only enables continue at 18+. The date is
   checked, never stored or sent up (data minimization).
4. **Campus match-count floor (§2.7, §4.3)** — the week-one reveal publishes the
   match number only at 10+; below it, the pre-stated floor line stands in its
   place. The floors are disclosed on the pre-open campus page.
5. **Demo write-safety (§4.4)** — the public opt-out is now demo-aware, so the
   `/demo` sandbox never reaches the database on any path (it already
   short-circuited every other write; auto-verify already stands in for the DM
   flow, sandboxed).

**Deliberate differences from the guide, pending a product decision:**

- **Verification method.** The guide names bio-code as the production method
  (§2.4). Production currently runs the **Instagram-DM** verification flow (there
  was never any OAuth to migrate off). The DM flow honors the same hard line and
  is the pragmatic path until the bio-code backend (a public-bio reader) is wired;
  the demo keeps the DM flow, sandboxed. Switching production to bio-code is a
  backend project, not a copy change.
- **Magic-link signup.** The guide names magic-link auth (§4.4). The app's session
  model is built around DM-verified handle ownership rather than email magic-links;
  this is unchanged here.
- **Demo showcase data.** The guide says the demo "mirrors main exactly except
  nothing saves to the DB." The demo keeps its curated sample pings + campus
  preview (a better showcase) rather than starting empty, while now fully honoring
  the no-DB-writes guarantee.

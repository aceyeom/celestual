# CELESTUAL — LAUNCH STRATEGY: A STRESS TEST

A brutal read of the Launch V1 brief against what is actually built, what is actually
in the production database, and what a college student would actually do at 11pm.

Written 2026-08-15. Sources: `celestual-launch-brief`, `Celestual Vision Sheet (READ)`,
`LAC playbook`, `Feedback on MVP`, `dev docs` (Drive); `docs/MASTER-GUIDE.md`,
`docs/MANYCHAT-MUTUAL-DM.md`, `docs/EDU-VERIFICATION.md`; migrations `0001`–`0026`;
the thirteen edge functions; and read-only queries against the live project.

---

## 0. THE SHORT VERSION

Four conclusions, each of which contradicts something in the current plan:

1. **Two of the three identifiers should never be asked for.** The Instagram handle is the
   product. The `.edu` email is redundant the moment someone stands in a room. The phone
   number solves a problem that timing already solves for free.
2. **The morning prompt can ride Instagram DM alone** — the brief's open question — because
   a check-in DM at 10pm opens a window that is still open at 10am. No entity, no SMS, no
   10DLC registration.
3. **The QR-to-webform check-in is the wrong shape.** The check-in must *be* an Instagram DM,
   because only an inbound DM opens the window the morning prompt depends on. This also
   deletes the verification round trip entirely.
4. **The brief's success floors are unreachable at the cluster sizes it recommends.** Mutual
   rate falls as `1/M`. The 15% floor silently specifies a ~70-person cluster, and above
   ~150 people it is mathematically impossible rather than merely hard.

The through-line: the launch is more buildable than the brief thinks in some places
(per-host links already exist) and less buildable in others (the check-in tool being offered
to hosts does not exist at all).

---

## 1. GROUND TRUTH

### 1.1 The production database

Read-only queries against the live project. This is the entire company as of today.

| Metric | Value | Reading |
| --- | --- | --- |
| IG-verified members | 25 | The whole user base |
| Pings placed | 20 | — |
| Mutual matches | 6 | — |
| **Pings whose target is not on the app** | **10 / 20 = 50%** | Half of all intent hits a wall |
| **Pings per sender** | **1.18** | Brief's floor is 2+. This is the quadratic term (§5) |
| **Senders who left an email** | **4 / 20 = 20%** | 80% have no channel outside the IG window |
| IG DM verification, median | **21 s** (min 7, max 688) | Verification is genuinely fast |
| IG verification completion | **31 / 37 = 84%** | Six people started and never finished |
| Communities / campuses / community members | **0 / 0 / 0** | Never populated |
| **`.edu` verifications, all time** | **0** | This path has never run in production, once |
| Recruit (host) codes / attributed signups | 1 / 0 | Built, never used |

Two caveats that matter. The 25 members are overwhelmingly founders and friends testing in
daylight while sober and motivated — **21 seconds is a best case, not a forecast.** And at
n=20 pings, the 50% off-app rate and the 1.18 pings-per-sender are directionally real but
not precise. They are the only real numbers that exist, so they are what the plan is built
against, but the sample should not be over-read.

### 1.2 What is already built

The brief lists **per-host links** as a hard blocker. They exist. `celestual_recruit_visit(code)`
and `celestual_recruit_attribute(code, handle)` in `0016_recruit_program.sql` give per-code
per-day visit counts and one-row-per-`(code, handle)` signup attribution, routed at `/r/<code>`
(`app/src/App.jsx:168`). One row, never exercised — but written and locked down.

Also present and directly reusable:

- The ping / match / reveal core (`0001_celestual.sql`, `0006_ping_model.sql`)
- Instagram DM identity via ManyChat (`celestual-manychat`, `celestual-ig-webhook`)
- `celestual_communities` + `celestual_community_members` (`0006`)
- `celestual_campuses` with per-campus thresholds and `window / open / revealed` states
- `celestual_dm_outbox` with 23-hour-window awareness (`celestual_dm_due`, `0023_the_mutual_dm.sql`)
- Email via Resend, and an hourly cron caretaker (`celestual-remind`) already draining queues
- Stripe slots (`0021_stripe_slots.sql`), which the brief correctly says not to use yet

### 1.3 What is genuinely absent

Any events / rooms / check-in concept. QR handling. Rosters. The morning prompt itself.
And anything touching phone numbers: `grep -riE "twilio|sms|phone_number|otp"` across
`supabase/` and `app/src` returns nothing but false positives on the word "checking".

### 1.4 A contradiction to settle before it reaches a host

`docs/EDU-VERIFICATION.md` opens with "a ping only ever reaches people from your own community."
`docs/MASTER-GUIDE.md` §2.6, updated later (2026-07-09), says "a ping is global, full stop" —
community scopes **the sky, not the reach**. The master guide is current; the edu doc is stale.
Two people briefing two hosts off two documents will describe two different products.

---

## 2. THE FRICTION PROBLEM: THREE IDENTIFIERS, THREE DIFFERENT JOBS

The stated worry is that asking for an `.edu` address, an Instagram handle and a phone number
together is unsurvivable friction. It is. But the fix is not a cleverer sequence.

| Identifier | Its actual job | Can anything else do that job? |
| --- | --- | --- |
| **Instagram handle** | The **address**. It is the thing you ping. | No. This is the product. |
| **`.edu` email** | Proof you belong to the cluster. | **Yes — standing in the room.** |
| **Phone number** | A delivery channel outside the IG 24-hour window. | **Yes — timing (§3).** |

An `.edu` address proves a school admitted you at some point. **A check-in at a host-run event
proves you are in the cluster right now**, which is strictly the stronger claim, and it costs
the user nothing because they are already standing there. For anyone arriving through an event,
the email is pure friction with zero informational gain.

So: **only one identifier is ever requested at launch**, and §4 shows how to capture even that
one in a single action with no typing.

`.edu` verification stays in the codebase, switched off. It is already off by default
(`VITE_EDU_VERIFY_ENABLED` unset ⇒ stub mode, per `docs/EDU-VERIFICATION.md` §1) and has zero
production rows. It becomes the join route for people who hear about a cluster remotely, in a
later cohort. It is not on the launch path.

**A note on what this costs.** Dropping `.edu` means an outsider can claim membership of a
cluster they are not in. At launch scale this is acceptable: the room is the gate, the host
knows the room, and a ping is global anyway (§1.4) so a false member gains nothing but a star
in the wrong sky. It becomes a real problem only when clusters carry published stats — which,
at the sizes recommended in §5, they will not.

---

## 3. THE 24-HOUR WINDOW DECIDES EVERYTHING

`docs/MANYCHAT-MUTUAL-DM.md` §1 establishes, with Meta policy citations, that **a business
cannot DM an Instagram user outside a 24-hour window opened by that user messaging first.**
Not with `HUMAN_AGENT`, not with standard message tags, not with the Marketing Messages API.
The doc's own conclusion: *"there is no compliant way to make a match ring somebody's phone the
instant it happens. Anybody who tells you otherwise is describing something that will get the
Instagram account restricted."*

The brief asks whether the morning prompt can ride Instagram DM alone. It can, and the
arithmetic is not close:

> Check in by DM at **10pm Saturday** → window open until **10pm Sunday**.
> Morning prompt at **10am Sunday** lands **12 hours inside it.**
> Even a **2am** check-in leaves **9 hours** of margin against a 10am send.

**The event mechanic is DM-native by construction. The door opens the window.**

### 3.1 Two constraints this imposes

- **The check-in must be an inbound DM, not a QR scan to a web page.** A web form opens no
  window. Under the brief's current shape — scan, type handle, receive code, switch to
  Instagram, send code — anyone who abandons midway is checked in and *unreachable the next
  morning*. At 84% completion in ideal conditions that is one in six lost, and far worse in a
  dark room. §4 fixes this by inverting the order.
- **Check-in must happen at the event, not before it.** A Thursday pre-registration for a
  Saturday party is a closed window by Sunday morning. This rules out advance sign-up links
  as the primary mechanism.

### 3.2 Why phone numbers are wrong even beyond being unnecessary

Set aside the timeline risk (A2P 10DLC registration needs the EIN, still in flight per
`dev docs`, and takes days to weeks — against a late-August door). The deeper problem is a
**brand contradiction**. This product's entire promise is *nothing is revealed, no trace, it
never happened*. A phone number is the most trust-expensive field in consumer software. The
Vision doc names this exact failure mode as a top-three risk:

> *"On a small campus, people might assume some creep built this to figure out who likes who."*

Do not pay a trust cost, denominated in the exact currency the product is made of, to buy a
capability that timing provides for free.

There is a real upside to being able to say at a door: **no email, no phone, no password.**

### 3.3 The channel that is genuinely unsolved

The **event** mechanic is covered. The **reconnection engine** — pings resolving days or weeks
later, outside any window — is not, and 80% of senders currently leave no email. Ranked:

1. **A promised time, not a notification.** The LAC playbook already found this with its 1am
   simultaneous fire: an announced shared moment does the job a push notification would do.
   Free, needs no permission, and it is the only mechanism that reaches everyone. This should
   be the primary design device for the reconnection layer.
2. **Raise email capture at the right moment.** Ask once, immediately after a ping is placed —
   the highest-investment second in the funnel — framed as a backup rather than a signup.
   One optional field. 20% → plausibly 50%+.
3. **The reply carrier, already built.** `celestual_dm_take` attaches pending news to the next
   inbound DM from that person. It works; only its timing is unpredictable.
4. **Web push** — free, no entity needed, but iOS requires Add-to-Home-Screen, which is more
   friction than it saves. Not for launch.

---

## 4. INVERT THE CHECK-IN: THE DM *IS* THE IDENTITY

The highest-leverage change available, and nearly free, because the architecture already
assumes it.

`supabase/functions/celestual-ig-webhook/index.ts:11-14`:

> *"We do NOT trust any username in the payload. We re-fetch the sender's REAL username from
> the Graph API using the sender's Instagram-scoped id (IGSID). That Meta-authenticated
> username IS the identity. The 4-digit code is a pure correlation id."*

Migration `0012_ig_code_pure_correlation.sql` made that official. **The code exists only to
link a DM back to a browser session that started first.** Put the DM first, and there is no
session to correlate — so the code is unnecessary.

| | Brief's plan (and today's flow) | Proposed |
| --- | --- | --- |
| 1 | Scan QR → web page | See the word on a wristband / table card |
| 2 | Type your handle | **DM `PHIDELT` to `@celestual.us`** |
| 3 | Receive a 4-digit code | *(done — Meta authenticated you)* |
| 4 | Switch to Instagram, find the account | |
| 5 | Send the code | |
| 6 | Switch back to the browser | |
| **Apps involved** | **Two, with a round trip** | **One** |
| **Typos possible** | Handle, and the code | **None** |
| **24h window opened** | Only if all six steps complete | **At step 2, always** |
| **Steps after intent** | Five | One |

The handle cannot be mistyped because it is never typed. The window cannot fail to open,
because opening it *is* the check-in. And DMing a word to an account to get a link is
behaviour Gen Z performs constantly — it is more native than a QR into a web form.

**QR codes keep one job: a shortcut into the DM thread** (`ig.me/m/celestual.us`), never a
route to a web form. The printed word is primary and is the fallback for every phone whose
camera is uncooperative in a dark room.

### 4.1 The door is the wrong place, whatever the mechanism

The physics at 11pm are hostile: dark, loud, one hand holding a drink, low battery, a queue
behind you, social pressure to move. A 21-second median in daylight is realistically
**60–120 seconds** at a door. At 80 people that is a **40-minute queue** — and you have broken
the host's party, which is the single relationship the brief is right to protect.

Instead:

- Put the word **everywhere in the venue** — wristbands, hand stamps, table cards, the mirror
  above the bathroom sink, the wall by the drinks.
- Run **one mic moment** (LAC playbook §8.1 — music dips, "phones out") where the room does it
  together. The shared moment removes the social risk of being seen using this alone, and it is
  the money shot for filming.
- **Nobody is ever blocked from entering.** The door stays a door.

### 4.2 The one thing that gets harder

Losing the browser-first flow means losing the moment where the app explains itself before
asking for anything. A person who DMs a word cold has less context than someone who read a
landing page. The reply DM has to carry that weight in one or two sentences, and the link it
returns lands on a screen that explains the product before asking for a ping. This is a copy
problem, not a structural one, but it is real and should not be discovered on launch night.

---

## 5. THE MATH: WHY THE BRIEF'S FLOORS CANNOT BE MET AT PARTY SCALE

The brief sets penetration ~40%, mutual rate ~15%, pings per active 2+. **These are not
independent numbers. Together they silently determine the cluster size, and nothing in the
brief says so.**

For a mutual, two people must ping *each other*. With `M` reachable members each placing `k`
in-cluster pings, uniformly at random among the others:

```
P(A pings B)              = k / (M-1)
E[mutual pairs]           = M·k² / (2(M-1))     ≈ k²/2   — independent of M
Share of members matched  ≈ k² / (M-1)          — falls as 1/M
```

The first result is counter-intuitive and load-bearing: **the number of matches barely depends
on how big the cluster is — only on how many pings each person places.** Which means the *rate*,
the thing the brief measures, collapses as the cluster grows.

**Share of members who get at least one match (random-pinging floor):**

| Reachable members `M` | k=1 | k=2 | k=3 (slot cap) |
| --- | --- | --- | --- |
| 20 | 5.3% | **21.1%** | 47.4% |
| 30 | 3.4% | 13.8% | 31.0% |
| 50 | 2.0% | 8.2% | **18.4%** |
| 100 | 1.0% | 4.0% | 9.1% |
| 200 | 0.5% | 2.0% | 4.5% |

### 5.1 Three consequences

**(a) The 15% floor implies a ~70-person cluster.** Solving `k²/(M-1) = 0.15` at `k=2` gives
`M ≈ 28`; at 40% penetration that is a cluster of **~70 people**. That is the size the brief's
own metrics describe — far smaller than the Greek houses it points hosts toward first.

**(b) Above ~150 people the floor is impossible, not merely hard.** Pings are capped at three
slots. Even at `k=3` with *every ping landing in-cluster*, 15% requires `M ≤ 61` — a cluster of
**≤152 people at 40% penetration**. Past that, a host could execute perfectly, every user could
max out every slot, and the launch would still be recorded as a miss. **A 200-person party
cannot clear the brief's own bar.**

**(c) Leakage is currently destroying the term that matters most.** Today 50% of pings target
someone not on the app, and `k = 1.18` — so effective in-cluster `k ≈ 0.59`. At `M = 50` that
is `0.59² / 49 = 0.7%`, against a 15% floor.

Because the rate goes as `k²`, **moving pings-per-person from 1.18 to 2.5 is a 4.5× improvement**
— larger than any plausible gain from more attendees, more hosts, or more spend. It is the
highest-leverage number in the entire launch and it is currently unmanaged.

### 5.2 The honest caveat, which does not change the conclusion

This is a random-pinging **floor**, not a prediction. Real attraction is reciprocal well above
chance — call the multiplier `r`. With `r = 3`, an 80-member cluster at `k = 2` reaches ~15%.
So a big room *can* clear the bar if reciprocity is strong.

But `r` is itself **higher in small, high-context clusters.** A 40-person studio cohort has known
each other for a year; 200 people at a party mostly have not met. Small clusters win on both
terms at once, which is why this is a recommendation rather than a coin flip.

There is a second effect in large rooms that the LAC playbook already admits: pings concentrate
on a few popular people (preferential attachment). That raises the match rate for those few and
lowers it for everyone else, producing exactly the *"median kid gets nothing"* outcome §8.2 of
that playbook plans around. Small clusters flatten this too.

**This vindicates the brief's own aside** — *"cultural orgs, studio cohorts, club sports and dorm
floors often score higher and are far less gatekept"* — and contradicts the sentence immediately
before it, that Greek houses are "the obvious answer." They are the obvious answer for headcount
and the wrong answer for mutual rate.

---

## 6. TWO PRODUCT CHANGES THAT FALL OUT OF THE MATH

### 6.1 The room roster — search only, never browse

In a room where people have checked in, let a sender type the first letters of a name and
autocomplete against **people present**. This attacks both failing terms simultaneously: it
eliminates handle typos, and it pushes pings in-cluster, raising effective `k` instead of
leaking 50% into the void.

**Search, never browse. No scrollable grid of faces.** You must already know who you are looking
for. This preserves the product's soul — the Vision doc is emphatic that this is not a dating
app, that *"the person isn't a stranger. They're already in your life"* — whereas a browsable
roster turns it into precisely the meat-market the brand is defined against.

On anonymity: appearing in a room list reveals only that you are at a party you are visibly
standing in. It reveals nothing about who you pinged, and the mutual-only reveal is untouched.
Opt-out available; default on for event rooms.

Without this, the person who saw someone across the room and never got their handle is served
by nothing in the entire launch. See §7.

**Note:** do not route this through `celestual-search`. That function is an external Instagram
scraper proxy with a different trust model and its own ToS caveats (its header says so). The
room roster is first-party, consent-based, and strictly safer.

### 6.2 Prompt all three slots, by category

People place 1.18 pings because they think of one person. The `Feedback on MVP` categories —
Crush / Ex / Friend / Complicated — are the unlock: *"the friend you fell out with"* is a
different memory than *"your crush,"* and asking separately surfaces people the user would never
have volunteered unprompted.

Given the `k²` relationship, **this single screen is worth more than any amount of field spend.**

---

## 7. THE WORKFLOWS, WALKED AS THE PEOPLE WHO WOULD ACTUALLY USE THEM

**The girl who saw someone across the room, 11pm.** She never got his handle. Under the brief as
written she can do nothing tonight, and a morning prompt telling her 84 people were there does
not give her his name. She is lost. **Only the roster search saves her** — if he checked in, she
finds him by first name. This persona is a large share of the real emotional target and the
current plan serves her not at all.

**The guy with the ex, hearing about it from a friend.** He is not at the party. He pings her;
she is not on the app — the 50% case. Nothing happens, ever. The app already tells him the truth
and offers the invite link, which is the right behaviour. **Do not build outbound reach to
non-users for launch.** The brief flags it as the largest lever and the largest risk; it is
precisely the NGL failure mode, and it is how the Instagram account gets reported.

**The sophomore who checked in and matched with nobody.** The median attendee. The LAC playbook's
answer — *"your school is live now, pings run all year"* — is honest but thin. And there is a real
conflict here: the framework's weekly community stats unlock at **100 members** (MASTER-GUIDE §2.6),
and a 40-person cluster never reaches it. **That floor exists for de-anonymization safety and must
not be lowered.** So the return reason for small clusters has to be something else — room-scoped
and safe, e.g. *"three more people from Thursday joined"* — never a match count that could be
de-anonymized in a room where everyone knows everyone. This needs solving before the second
cluster, not the first.

**The host.** The brief says to lead with the check-in tool because *"guest lists and door control
are a real problem, and solving it puts you at the door instead of interrupting the room."*
**There is no check-in tool. Nothing in the repo does this.** Do not promise one — the brief's own
non-negotiables say *"nothing unshipped gets promised to a host or an organizer."* What the room
mechanic yields for free — a live count, a roster, and a morning recap of who came — *is* a light
door tool, and it is real. Lead with that.

**The skeptic.** Asked to DM a brand account from their real Instagram. Mitigated by a genuine
content presence, the founder origin story, and the fact that this flow asks for no email, no
phone, and no password.

**The person who gets pinged and is not on the app.** Never knows anything. That is the design,
and it is correct.

---

## 8. THE PERMUTATIONS, SCORED

| Dimension | Options | Verdict |
| --- | --- | --- |
| **Entry** | QR → web form | ✗ Opens no window (§3.1); five abandonment steps |
| | **DM a room word** | ✓ **Chosen.** One step, no typos, window guaranteed |
| | QR → DM thread (`ig.me`) | ✓ Keep as a shortcut to the above |
| | Host posts link in group chat | ~ Good supplement, no room attribution |
| **Membership proof** | `.edu` code | ✗ Redundant at an event; 0 prod rows ever |
| | **Physical check-in** | ✓ **Chosen.** Stronger claim, zero friction |
| | Self-declared | ~ Fallback for remote joiners |
| **Morning prompt channel** | **IG DM in window** | ✓ **Chosen.** Free, built, compliant |
| | SMS | ✗ Needs EIN + 10DLC; brand contradiction; solves nothing timing doesn't |
| | Email | ~ Backup only — 20% capture today |
| | Web push | ✗ iOS needs Add-to-Home-Screen |
| | Promised time | ✓ **Chosen for the reconnection layer** (§3.3) |
| **Where check-in happens** | The door | ✗ 40-min queue at 80 people |
| | **Venue-wide + one mic moment** | ✓ **Chosen** |
| **Ping timing** | At the party only | ✗ Low-stakes pings, weak mutual rate |
| | Morning after only | ✗ Wastes the room's social proof |
| | **Both, weighted to the morning** | ✓ **Chosen.** The event installs the account; the morning collects the ping |
| **Target selection** | Free text only | ✗ 50% leak, typos |
| | Browsable roster | ✗ Turns it into a dating app |
| | **Roster search + free-text fallback** | ✓ **Chosen** |
| **Cluster size** | 150+ | ✗ Makes the 15% floor unreachable (§5.1b) |
| | **30–80, high-context** | ✓ **Chosen** |
| **Launch count** | Five in parallel | ✗ Five first impressions on one untested rail (§10.1) |
| | **One, then stagger** | ✓ **Chosen** |

### 8.1 The recommended sequence, per cluster

1. **At the event — the job is to install the account, not to harvest pings.** Word on
   wristbands and table cards; one mic moment; nobody blocked at the door. Target: verified
   members ≥ 40% of a named denominator.
2. **Next morning, ~10am — the prompt lands by DM**, inside a window opened hours earlier.
   This is the highest-intent moment in the funnel: alone, hungover, with a name already in
   their head. The brief is right that this is the wedge; it just needs to be engineered rather
   than assumed.
3. **Same screen — prompt all three slots by category, roster search first** (§6).
4. **~1 week later — reconnection opens for the cohort**, announced as a *promised time*, which
   is what substitutes for a push notification.

### 8.2 What the morning prompt is allowed to say

The governing rule, from the LAC playbook and repeated in the brief's non-negotiables:
**every number shown and every claim made is literally true.** No fake counters, no
*"someone entered you,"* no implied individual interest. This is a legal line (FTC v. NGL),
not a style preference.

So: *"someone at that party is thinking about you"* is **forbidden** — it is false whenever it
is false, which is most of the time, and it is the exact claim NGL was penalised for.

What is true, and lands on the same feeling:

> *you didn't say anything to them last night. you can now, without saying anything.*

Plus the counts, which are true and carry their own pull: *84 people from Thursday are on here.*

All new user-facing copy must pass `npm run lint:voice` (`scripts/voice-lint.mjs` — banned
phrases, emoji, exclamation marks).

---

## 9. WHAT TO BUILD

Ordered by whether a door can open without it. Assumes the founder building part-time
(`dev docs` records restricted hours), which is exactly why reuse matters more than elegance.

### Blocking

1. **`celestual_rooms` + `celestual_room_members`** — `code` (the DM word), `host_code`
   (FK to the existing `celestual_recruits.code`), `cluster_name`, `denominator`, `starts_at`,
   `ends_at`. Model on `celestual_communities` (`0006_ping_model.sql`) and lock down identically:
   RLS on, no `anon` / `authenticated` grants, SECURITY DEFINER RPCs only.
2. **DM-first check-in** — a ManyChat keyword automation per room word, relaying into the
   existing `celestual-manychat` function. Extend it to recognise a room word rather than only a
   `star-` code, upsert `celestual_members`, join the room, and reply with the app link. The
   identity path is unchanged — the Meta-authenticated username is already trusted (`0012`), so
   **no new verification code is needed at all.**
3. **Morning prompt job** — extend `celestual-remind` (the hourly caretaker; already idempotent,
   already draining `celestual_campus_mail`). Queue room digests into `celestual_dm_outbox` and
   let the existing `celestual_dm_due` 23-hour filter enforce the window it was written for.
   Anyone outside the window falls through to email, the same pattern as the mutual DM.
4. **Room roster search** — a room-scoped RPC over `celestual_room_members`, prefix-matched,
   returning at most a handful of rows. Not via `celestual-search` (§6.1).
5. **Three-slot category prompt** — client-side, on the placed screen and in the morning prompt.
   Highest impact-to-effort ratio in the list, given `k²`.

### Non-blocking but wanted

6. **Host recap** — reuse `celestual_recruit_stats`, add room counts. The honest version of the
   "check-in tool."
7. **Email capture on the placed screen** — one optional field, framed as a backup. Targets the
   80%-unreachable problem.
8. **Fix `docs/EDU-VERIFICATION.md`** to match `MASTER-GUIDE.md` §2.6 (§1.4).

### Explicitly deferred

- `.edu` verification — leave off (§2).
- Stripe / paid slots — the brief is right not to paywall density.
- Campus threshold windows — superseded by the room mechanic for launch.
- Outbound reach to non-users — the NGL failure mode. Not at launch (§7).

---

## 10. RISKS, RANKED

**10.1 The whole launch rides on one Instagram account and a third-party automation that has
already failed twice.** `dev docs` records both failures in testing: the Meta OAuth silently
losing the *"Manage and access messages"* permission, and the ManyChat Default Reply trigger
firing only once per contact. Either failure at 11pm on launch night is **silent and total** —
no check-ins, no windows opened, no morning prompt, and nothing recoverable the next day because
the windows never existed. Mitigations: a health check the host can run from a phone before the
mic moment; a monitored fallback path; and **one cluster first, not five**, so the first failure
costs one room rather than five simultaneous first impressions.

**10.2 Meta rate-limiting or spam heuristics.** Eighty DMs to one account in thirty minutes from
one location is a pattern Meta may flag, and it is untested at this volume. The mic moment
concentrates the spike further. Spreading check-in across the night reduces it.

**10.3 A host picks a big room** and the 15% floor becomes unreachable (§5.1b). Fix by putting a
cluster-size ceiling in the host kit, not by relitigating it on launch night.

**10.4 `k` stays at 1.18**, in which case nothing else matters, because the rate is quadratic in it.

**10.5 The median attendee matches with nobody** and there is no safe stats unlock at small `M`
(§7). Needs a room-scoped return reason before the second cluster.

**10.6 The cold-DM context gap** (§4.2) — a person who DMs a word has less context than one who
read a landing page. A copy problem, but one to solve before launch night, not during it.

---

## 11. REVISED MEASUREMENT

The brief's floors are internally inconsistent unless the cluster is ~70 people. Rather than
retuning the floors, **record the cluster size and read the floors against it.**

- **Penetration** ≥40% of a stated denominator — keep as is. It is the honest test of whether
  the cluster was real, and it is the one number that does not depend on cluster size.
- **Mutual rate** — compare against `k²/(M-1)` for that cluster's actual `M`, **not** a flat 15%.
  A 21% result at `M=20` and a 5% result at `M=100` are the *same performance*. Reading them
  against one number would retire a working mechanic.
- **Pings per active** — **promote to the headline number.** It is the only lever with quadratic
  returns and it is currently unmanaged at 1.18.
- **In-cluster ping share** — new, and it belongs beside pings-per-active. Currently 50% leaks.
- **Check-in → DM completion** — the real conversion, replacing "scanned." 84% in ideal conditions;
  expect worse in a dark room.
- **Organic share** ≥30% — keep unchanged. The brief is right that this is the one that matters.

---

## 12. THE BRIEF'S FOUR OPEN DECISIONS, ANSWERED

| Open decision | Answer |
| --- | --- |
| Whether a ping can reach someone who isn't a user yet | **No, not at launch.** Largest lever and largest risk; it is the NGL failure mode and the fastest route to a reported Instagram account. Tell the sender the truth and give them the invite link — which the app already does. |
| Whether the morning prompt can ride Instagram DM alone | **Yes.** The check-in DM opens a 24-hour window; a 10am prompt lands ~12 hours inside it. This only holds if check-in *is* a DM (§3, §4). |
| Whether an entity gets formed now so SMS is available | **Not for this.** SMS solves nothing that timing does not, costs weeks of EIN and 10DLC lead time, and contradicts the brand at the exact point of maximum trust sensitivity (§3.2). Form the entity for its own reasons; do not let the launch depend on it. |
| The spend ceiling for the launch | Out of scope here, but §5 changes the shape: smaller clusters mean cheaper events, and **one cluster first** (§10.1) means the ceiling question can be deferred until the rail is proven. |

---

## 13. WHAT WOULD CHANGE MY MIND

- **If the roster search reads as creepy in testing.** It is the load-bearing fix for both the
  50% leak and the girl-across-the-room persona (§7). If five real students recoil at it, the
  in-cluster ping problem needs a different answer and the mutual-rate forecast drops hard.
- **If reciprocity `r` turns out to be much higher than 3.** Large clusters become viable and the
  small-cluster recommendation weakens (§5.2). One launch produces enough data to estimate it.
- **If ManyChat proves unreliable at volume.** Then the DM-first design is a single point of
  failure rather than an elegance, and the web-form path has to be rebuilt as a first-class
  fallback with its own delivery channel — which brings SMS back onto the table.
- **If a host with a 200-person room is already contracted.** The math does not change, but the
  correct response is to lower the floors for that specific cluster in advance and say so in
  writing, not to pretend the cluster is smaller than it is.

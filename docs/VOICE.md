# CELESTUAL — Voice & tone (the living document)

How celestual writes so that nothing in it reads as template output — neither
generic-SaaS ("Oops, something went wrong. Upgrade to Pro.") nor generic-AI
(uniform enthusiasm, filler adjectives, decorative emoji). This file is the
writing half of the pair; [DESIGN.md](./DESIGN.md) is the visual half. **Both
are living documents: any copy change ships with an edit here when it bends a
rule.** The register is set by the masterguide
([ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) Part 4):
*quiet, adult, certain — the 2am message, never the carnival.*

Enforced mechanically where possible: `npm run lint:voice` (see §6).

## §1 — The voice in one paragraph

Celestual speaks in **lowercase composure**. It says less, trusts the reader,
and lets negative space carry weight. It is never excited, never apologetic,
never selling. It states mechanics flat ("they never find out.") and dignifies
feeling without dramatizing it ("it's standing."). It treats the reader as
someone with dignity doing something brave — not someone lonely doing
something desperate. And it is **literally true in every sentence, always** —
truth is the product's entire legal and ethical margin (framework §6.2). Where
the tone dimensions land: serious (but tender, not somber) · casual (lowercase
intimacy; legalese only at /terms) · respectful (always; irony never) ·
matter-of-fact (a match simply *is*; the product never hypes itself).

## §2 — Vocabulary: the product's own physics

Words are the cheapest place to look generic. Celestual has its own nouns and
verbs — use them, never their app-generic equivalents.

| Say | Never |
| --- | --- |
| place a ping / place it | submit, send, post, enter (as the act), seal |
| standing / waiting | active, pending, in progress |
| it's mutual | match found, congratulations, you matched |
| let it go | delete, remove, withdraw (in product copy) |
| keep it standing / renew | extend, refresh, resubscribe |
| lapses | expires (urgency word — banned) |
| your door / post your door | share, invite, refer a friend |
| reachable | registered, signed up, on the app |
| your worlds | groups, communities (in-product), tags |
| count me in | sign up, join the waitlist, register |
| the opt-out | unsubscribe, blacklist, suppression (user-facing) |
| slot | credit, token, quota |

Notes: "ping" is the mechanism noun and is used plainly — never cutesified
("send a lil ping"). The old star/sky/seal/constellation vocabulary is
**retired** with the galaxy edition; if a line reaches for it, rewrite the
line.

## §3 — Register: which font is allowed to feel

The type system is the tone system (DESIGN.md §3):

- **Instrument Serif, italic** — feelings, states, the intent lines, the hero
  sentences. Anything a person *means*.
- **Space Grotesk** — mechanics, explanations, buttons.
- **Space Mono, uppercase, letterspaced** — kickers, labels, counts, clocks.
  Never feelings.

Rules that follow: an intent line may never render in mono; a count may never
render in serif; a button label never gets an exclamation mark (nothing does —
§5). Product copy is lowercase, including sentence starts; the legal pages and
proper nouns (Instagram, Meta, campus names in headers) may keep their case.

## §4 — The four frames every public line must survive

1. **Self-respect.** Placing a ping is a boundary, not a hiding place. Write
   "if it's ever mutual, i'll know", never "too scared to tell them?".
   Courage-deficit framing is banned everywhere, including marketing.
2. **Receiver-face in public.** The only public identity is the flattering
   one: *reachable, door open* ("if there's something you never said to me,
   it's safe here now"). Nobody ever shares as a sender; sender-side copy
   exists only on private screens. The hard test for every public surface:
   **"would a confident person post this?"** If not, rewrite it.
3. **Truth, exactly.** Every count, meter, state and claim shown to anyone is
   exactly accurate or absent. No "people are talking about you", no padded
   numbers, no implied activity — that is the NGL pattern and it is banned at
   the copy level, not just the policy level (framework §6.2).
4. **Resolution, never pursuit.** Copy is about settling a feeling ("find
   out", "say the unsaid thing"), never about chasing a person ("win them
   back", "reconnect with your ex"). The silence is framed as the product
   working: "silence, which is the point."

## §5 — Error voice & the banned list

Errors stay in-world, name what happened, give the one next step, keep
composure: "the night didn't answer. give it a moment, then place it again." —
never "Something went wrong. Try again."

Banned everywhere (enforced by the linter):

- "something went wrong", "oops", "uh oh", "whoops" — generic-error voice
- "unlock", "premium", "pro tier", "upgrade", "go pro", "subscribe" — paywall
  voice (nothing is for sale; when the fourth slot ever wakes it is bought
  "once", not unlocked)
- Exclamation marks in product copy (legal pages included)
- Emoji in product copy — the only glyphs are `✦` `✧` `·` and they are ritual
- Urgency: "hurry", "expires", "last chance", "don't miss", "act now" (a ping
  "lapses", calmly, and renewal is a question — "still feel it?")
- The fishing frame: "find out who likes you", "see who entered you"
- Implied activity: "someone entered you", "people are looking at you" — the
  forbidden lever, in any phrasing

## §6 — Enforcement: `npm run lint:voice`

`scripts/voice-lint.mjs` scans the canonical copy (`app/src/i18n/strings.js`)
and the static pages (`app/public/*.html`) for the §5 banned list, emoji
ranges, and exclamation marks, and fails the build on a hit. It is
deliberately dumb — a tripwire, not a critic. The interesting judgments
(register, frames, vocabulary) belong in review, with this file open.

## §7 — Litmus lines (calibrate by example)

- Landing safety line: "no profiles. no browsing. nothing happens unless it's
  mutual." ✓ — not "Your privacy is our top priority."
- Placed, target absent: "it's waiting." ✓ — not "We couldn't find them —
  invite them to join!"
- Status row near lapse: "lapses in 4 days — still feel it?" ✓ — not "Your
  entry expires soon. Renew now."
- Retire confirmation: "this frees the slot. nothing was ever revealed." ✓ —
  not "Are you sure you want to delete?"
- The match: "the rest is yours. celestual's part is done." ✓ — not "Start
  chatting now."
- Campus poster: "celestual opens at reed when 300 are in. current count:
  214." ✓ — not "Join the hottest new app on campus."

## §8 — Changelog

- **2026-07-03** — Rewritten for the ping model: vocabulary table replaced
  (star/sky/seal/constellation retired), lowercase register made explicit,
  frames updated (receiver-face, truth-exactly, resolution-never-pursuit),
  banned list extended with implied-activity phrasing; Nova/keepsake language
  removed with the monetization surfaces themselves.

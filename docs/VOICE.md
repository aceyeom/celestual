# CELESTUAL — Voice, tone & anti-generic framework

How Celestual writes and designs so that nothing in it reads as template output —
neither generic-SaaS ("Oops! Something went wrong 😅 Upgrade to Pro!") nor
generic-AI (uniform enthusiasm, filler adjectives, decorative emoji). The method
is borrowed from the two standard tools for this — a Mailchimp-style voice &
tone guide plus Nielsen Norman's four tone dimensions — but every rule below is
**derived from Celestual's own best existing copy**, so the guide describes the
product's voice rather than imposing one.

Enforced mechanically where possible: `npm run lint:voice` (see §6).

## §1 — The voice in one paragraph

Celestual speaks in **poetic minimalism with complete composure**. It says less,
trusts the reader, and lets negative space carry weight. It is never excited,
never apologetic, never selling. It describes feelings as objects with mass
("seal it", "your star", "it's out there now") and treats the reader as someone
with dignity doing something brave — not someone lonely doing something
desperate. Where the tone dimensions land: serious (but tender, not somber) ·
casual (lowercase intimacy, no legalese outside /terms) · respectful (always;
irony never) · matter-of-fact (the product never hypes itself — a match simply
*is*).

## §2 — Vocabulary: the product's own physics

Words are the cheapest place to look generic. Celestual has its own nouns and
verbs — use them, never their app-generic equivalents.

| Say | Never |
| --- | --- |
| seal / seal it | submit, send, post, save |
| your star, their star | entry, record, item |
| your sky | dashboard, home, feed, list |
| release a star | delete, remove (for stars) |
| the reveal, it's mutual | match found!, congratulations! |
| constellation | group, community (in-product), channel |
| a new star opens | your quota resets |
| Nova, dress your sky | Premium, Pro, Plus, upgrade, unlock |
| sealed line / inscription | message, note, comment |

The stigma-frames rule (§4) governs how these words aim: always at *your own*
feeling ("name them yourself"), never at surveillance of others ("find out who
likes you" is banned framing — PRODUCT-FRAMEWORK T-5).

## §3 — Register: which font is allowed to feel

The type system is the tone system. Breaking register is how screens start
looking assembled-by-template:

- **Instrument Serif, italic** — the emotional register. Feelings, inscriptions,
  headlines, the intent lines. Anything a person *means*.
- **Space Grotesk** — the interface register. Buttons, body copy, explanations.
- **Space Mono, uppercase, letterspaced** — the metadata register. Kickers,
  labels, counts, dates, statuses. Never feelings.

Rules that follow: an intent line may never render in mono; a count may never
render in serif; a button label never gets an exclamation mark (nothing does —
see §5). Color: only the tokens in `app/src/theme.js`; the two accents (amber
"you", rose "them") are the *only* accents, and `✦` is reserved for ritual
moments (sealing, mutuality, constellations) — it is not a bullet point.

## §4 — The four stigma frames (writing rules, not marketing)

The product's existential copy risk: reading as *a substitute for courage*
("too scared to tell them? use this"). Every public-facing line must survive
these four frames:

1. **Self-respect.** Sealing is a boundary, not a hiding place. Write "I don't
   chase — if it's mutual, I'll know", never "couldn't say it to their face?".
   Courage-deficit framing is banned everywhere, including marketing.
2. **Consideration.** The mutual gate protects *them* from an awkward
   conversation they never asked for — not you from rejection. Copy may say so.
3. **Mystery, never longing** (public surfaces). Share cards, invites, OG
   images express intrigue ("a star was sealed tonight"), never neediness. The
   hard test for every public surface: **"would a confident person screenshot
   this?"** If not, rewrite it.
4. **Ritual over solo.** Collective surfaces (constellations, seal nights, the
   weekly feeling) always speak as *the community moving* ("this is spreading
   in your world"), never as an individual's feelings.

## §5 — Error voice & the banned list

Errors stay in-world and specific: name what happened and the one next step,
with composure. "The sky didn't answer. Give it a moment, then seal again." —
never "Something went wrong. Try again."

Banned everywhere (enforced by the linter):

- "Something went wrong", "Oops", "Uh oh", "Whoops" — generic-error voice
- "unlock", "premium", "pro tier", "upgrade now", "go pro" — paywall voice
  (Nova "dresses your sky"; it never "unlocks" anything, because nothing is locked)
- Exclamation marks in product copy (legal pages included)
- Emoji in product copy — the only glyphs are `✦`/`✧`/`·` and they are ritual
- Urgency: "hurry", "expires", "last chance", "don't miss" (also invariant I-5)
- The fishing frame: "find out who likes you", "see who entered you" (T-5/I-2)

## §6 — Enforcement: `npm run lint:voice`

`scripts/voice-lint.mjs` scans the canonical English copy
(`app/src/i18n/strings.js`) and the static pages (`app/public/*.html`) for the
§5 banned list, emoji ranges, and exclamation marks, and fails the build on a
hit. It is deliberately dumb — a tripwire, not a critic. The interesting
judgments (register, frames, vocabulary) belong in review, with this file open.

Design-side enforcement already exists in `app/src/theme.js`: TOKENS is the
single color source (nothing defines its own hex), SPACE is the spacing scale,
RADIUS the shape language. A change that adds a raw hex or a novel font size is
the visual version of "Oops!" — send it back.

## §7 — Litmus lines (calibrate by example)

- Empty state: "Your sky is clear." ✓ — not "No entries yet! Get started 🚀"
- Limit reached: "Your stars are resting." ✓ — not "You're out of credits"
- Reminder set: "Done — when the next star is ready, a quiet email will find
  you." ✓ — not "Success! Notification enabled."
- The tier: "A nova is a star that suddenly brightens." ✓ — not "Upgrade to
  Celestual Premium to unlock exclusive features!"

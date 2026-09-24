# Celestual voice

How the product writes. `design/DESIGN.md` is the visual half.

Enforced where it can be: `npm run lint:voice`.

---

## 1. The register

Lowercase composure. It says less, trusts the reader, and lets space carry
weight. Never excited, never apologetic, never selling. It states mechanics flat
and dignifies feeling without dramatising it. It is literally true in every
sentence, because truth is this product's whole legal and ethical margin.

It treats the reader as somebody with dignity doing something brave, not as
somebody lonely doing something desperate.

Product copy is lowercase, including sentence starts. Legal pages and proper
nouns keep their case.

---

## 2. The product's own words

Words are the cheapest place to look generic. Use these, never the app generic
equivalent.

| Say | Never |
| --- | --- |
| place a ping, place it | submit, send, post, enter |
| write a letter, put it up | post, publish, share |
| share it (a letter passed on: its picture, its link) | send, export, forward |
| standing, waiting | active, pending, in progress |
| it's mutual | match found, congratulations, you matched |
| let it go | delete, remove, withdraw |
| keep it standing, renew | extend, refresh, resubscribe |
| lapses | expires |
| the wall | the feed, the board, the community |
| sealed, shut | locked, hidden, private |
| reachable | registered, signed up, on the app |
| count me in | sign up, join the waitlist, register |
| slot | credit, token, quota |

A ping is a ping. Never a "lil ping".

`share` is never the word for putting a letter up, and `send` is never the word
for passing one on. The composer's act is `send anonymously`; the key on a
letter that hands its picture to somebody, saves it or copies its link is
`share`. That key read `send` until 24 September: one word for two acts, a few
centimetres apart.

---

## 3. Which face is allowed to feel

The type system is the tone system. `design/DESIGN.md` section 4.

| Face | Carries |
| --- | --- |
| Newsreader, display cut | feeling. Hero lines, intents, anything a person means |
| Newsreader, text cut | reading. Letters, and the explanation of the mechanic |
| Inter Tight | mechanics. Buttons, explanation, meta |
| Geist Mono | identifiers. Handles, counts, dates, codes. Never a feeling |

Rules that fall out: an intent line never renders in mono, a count never renders
in a serif, and a handle keeps its case wherever it is set.

That table is Main's. On the wall one face sets every word (Jersey 10,
`design/DESIGN.md` 2.6), so the face cannot carry the register there and the
words have to: an intent line is still written as one, a count is still a
figure and never a feeling, and a handle still keeps its case.

---

## 4. The four frames

Every public line has to survive all four.

**Self respect.** Placing a ping is a boundary, not a hiding place. Write "if
it's ever mutual, i'll know". Never "too scared to tell them?". Courage deficit
framing is banned everywhere, marketing included.

**Receiver face in public.** The only public identity is the flattering one:
reachable, door open. Nobody ever shares as a sender. The test for a public
surface is whether a confident person would post it. If not, rewrite it.

**Truth, exactly.** Every count, state and claim shown to anybody is exactly
accurate or absent. No implied activity, no padded numbers, no "people are
talking about you". That is the pattern the FTC took NGL apart for, and it is
banned at the copy level, not only the policy level.

**Resolution, never pursuit.** Copy is about settling a feeling, never about
chasing a person. Silence is the product working, not a failure of it.

---

## 5. Errors

Stay in world, name what happened, give the one next step, keep composure.

Write: "the night didn't answer. give it a moment, then place it again."

Never: "Something went wrong. Try again."

---

## 6. The banned list

The linter enforces all of these on the canonical copy.

| Banned | Why |
| --- | --- |
| something went wrong, oops, uh oh, whoops | generic error voice |
| unlock, premium, pro tier, upgrade, go pro, subscribe now | paywall voice. Nothing is for sale |
| hurry, expires soon, last chance, don't miss, act now | urgency. A ping lapses, calmly |
| find out who likes you, see who entered you | the fishing frame |
| someone entered you, someone pinged you, people are talking about you | implied activity, in any phrasing |
| exclamation marks | including on the legal pages |
| emoji | the only glyphs are the sparkle and the middot, and they are marks, not emoji |
| em and en dashes | see below |

**Dashes.** Not one, anywhere. A dash is a writer stalling: it welds two
thoughts together instead of choosing one, and a page of them reads as machine
written. Use a full stop, or cut the second half. The rebuild spec extends this
to everything written for this repository, code comments and docs included.

---

## 7. Nothing explains the interface

A sentence under a control telling you what the control is for is a confession
that the control is unclear. Fix the control.

| Cut | What carries it now |
| --- | --- |
| "your instagram @, so the ping can resolve to you." | the label, and the painted `@` in the field |
| "for adults. tap to confirm. nothing is stored." | the tap itself: *i'm 18 or older* |
| "drag to orbit, pinch to zoom" | a sky you can drag is discovered by dragging it |
| the panel explaining the countdown | the one line that mattered, moved into the panel already there |

And never write about somebody's own account in the conditional. The server
knows whether there is an email on file, so the screen names the inbox it sent
to rather than guessing at one.

---

## 8. Calibrate by example

| Write | Not |
| --- | --- |
| no profiles. no browsing. nothing happens unless it's mutual. | Your privacy is our top priority. |
| it's waiting. | We couldn't find them. Invite them to join. |
| lapses in 4 days. still feel it? | Your entry expires soon. Renew now. |
| this frees the slot. nothing was ever revealed. | Are you sure you want to delete? |
| the rest is yours. celestual's part is done. | Start chatting now. |
| celestual opens at reed when 300 are in. current count: 214. | Join the hottest new app on campus. |

---

## 9. Enforcement

`scripts/voice-lint.mjs` scans the three surfaces that write their copy inline
— `app/src/wall/`, `app/src/wall/screens/`, `app/src/main/` and
`app/src/admin/` — and the static pages under `app/public/`. It blanks comments
first, so a comment explaining a rule cannot trip it. It is a tripwire, not a
critic.

It used to say it scanned `app/src/i18n/strings.js` and the card's copy under
`app/src/card/`. Both went with the retired design; the lint has read the
rebuild's own directories since Phase 8 and this paragraph had not caught up,
which is worth saying because a stale note about what is enforced is worse than
no note at all.

It checks two things now. **Section 6**, the banned list, emoji, exclamation
marks and the dash. And **section 1**, the case: a JSX text node that opens in
sentence case is a failure unless it is a proper noun, an all-caps label or a
two-character specimen. That half was judgement until thirty-four capitalised
strings shipped across the wall and Main — "Sign in to write.", "Your
information will stay anonymous.", "Your sky did not load." — beside a product
that says "write a letter" and "send anonymously". Mixed case is the register
changing halfway down a screen, and it reads as two products. Strings in props
are deliberately not checked: most of them are not copy at all, and a lint that
cries about `className` is a lint people switch off.

Register, frames, vocabulary and section 7 are judgement, and they belong in
review with this file open.

Run it: `npm run lint:voice`.

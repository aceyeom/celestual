# DOLBOMI — Survey Analysis, Strategic Findings & Prioritized Backlog

> **Source:** field survey of serving soldiers (~11 responses per open question),
> 2026-06. **Method:** every distinct signal below is grounded against the
> *actual current codebase* (not the design docs' intent), so "problem" means a
> real gap, and "already shipped" is flagged where the complaint is about an
> older build.
>
> **Status of this doc:** strategy + prioritized backlog. **Analysis only — no
> code changes.** Decisions marked **[OWNER]** were set with the product owner;
> decisions marked **[PROPOSED]** are recommendations awaiting sign-off.

---

## 0. TL;DR

The survey contains one fatal critique and a pile of fixable nits. The fatal
critique is about **why anyone would open this daily**:

> "미래 생각 없는 애는 봐도 안 바뀌고, 생각 있는 애는 매일 들어올 필요 없다."
> "누구를 타겟하는지 모르겠다."

This is not a UI problem. It says the app is positioned as a *daily habit toy*
built on top of *generic, already-knowable content*, and neither half earns a
daily open. The fix is a **repositioning**, decided with the owner:

1. **Stop being a daily quest app. Become an opportunities tool first.** The hero
   of the product is *"여기 네가 몰랐던 기회가 있고, 끝내면 휴가가 나온다."*
   Quests become the *execution layer under a chosen opportunity*, not the
   reason to open the app.
2. **Stop being a jack of all trades.** Six stats is overload. Collapse to one
   or two things the app is genuinely great at (fitness / mental), and let the
   opportunity catalog carry the rest.
3. **Demote the avatar; make progress the hero.** Users liked leveling/stats,
   were lukewarm on the guardian. The guardian is a candidate for removal.

The rest of the survey (tone, complexity, unit-specific 휴가, minigames,
likes/comments, special-day gifts, body-spec-based workouts) maps cleanly onto a
prioritized backlog in §6.

There is **one unresolved strategic tension** the owner should rule on
explicitly — see §3 (military focus vs. "holistic app for everyone").

---

## 1. What the survey actually says

Grouped by theme, with representative quotes. Noise ("응원합니다", "화이팅",
"수익 10%를 찌훈이형한테") omitted from analysis.

### A. Positioning / value prop — **the critical theme**
- "누구를 타겟하는지 잘 모르겠다."
- "관심이 있었더라면 진작에 알고있을 내용이 많았다."
- "미래 생각 안 하는 친구가 봐도 안 바뀌고… 생각 있는 사람이면 굳이 매일
  들어가면서까지 할 필요는 없다."

**Reading:** content is perceived as *commodity self-help* (discoverable
elsewhere), and the daily-use model fits neither the unmotivated (won't change)
nor the motivated (don't need it). The app has no defensible reason-to-return.

### B. Stickiness / fun
- "별로 흥미롭거나 매력적이지 않다" (owner's summary of sentiment).
- "미니게임 같은 것을 추가하면 더 재밌게 쓸 것 같다."

### C. Avatar / stats (split signal)
- Owner summary: *people liked leveling & stats, did not see the avatar as
  necessary.*
- "아바타 모델을 좀 더 다양화해서 선택하는 것도 괜찮을 것 같다."

### D. Cognitive load
- "화면이 너무 복잡한 느낌이 있다."
- "한 눈에 들어오게 만들면 좋겠다."

### E. Tone / copy
- "말투를 바꿨으면 좋겠다 (너무 번역체 같다)."
- "~해볼까요? 라든지 응원해주는 말투면 좋겠다."

### F. Personalization depth (fitness)
- "몸 스펙을 물어보고 좀 더 개인 맞춤형 운동이 있으면 좋겠다."

### G. Realism / configurability
- "휴가 받는 게 정해져 있는데 부대마다 다르니, 본인이 설정할 수 있게 해달라."

### H. Social proof
- "장병 선호도(좋아요/싫어요)와 댓글을 각 항목에 넣으면 좋겠다."

### I. Delight / hooks
- "특별한 날에 선물."

### J. Platform / environment
- "light mode 지원."
- "뒤로가기 누르니까 설문이 초기화됐어" — *about the survey form*, but a
  warning sign for in-app navigation state loss (see §6, P2).

### K. Positive / retain
- "만족", "유지만 해도 완벽" — a real minority finds current value. Don't
  break what they like (the leveling loop, the opportunity content).

---

## 2. Reconciling survey complaints with the actual code

Two complaints are **already implemented** in the current tree, which means the
respondents tested an older deploy *or* the intent isn't landing. This changes
how we treat them — they are *deploy/perception* problems, not build problems:

| Complaint | Code reality | Implication |
| --- | --- | --- |
| "light mode 지원" | `DEFAULT_PREFS = { theme: 'light', … }` (`store.js:29`); migration `0005` sets light/green defaults. Light **is** the default. | Respondents were on an old build, **or** light mode is reachable but the surveyed build shipped dark. **Verify the live deploy.** Likely zero new work. |
| "말투가 너무 번역체" | Catalog copy is already clean 해요체 ("…이에요", "…좋아요" — `catalog.js:1098+`); design pass V4 claims a full 해요체 sweep. | The *content* copy is fine; the **system/UI strings and guardian lines** are the likely offenders. Audit those specifically (§6, P1) — and note the owner wants warmer, *encouraging* tone ("~해볼까요?"), which is a step beyond neutral 해요체. |

Everything else in §1 is a genuine gap or strategic decision.

---

## 3. Strategic findings (the deep analysis)

### F1. Reposition: opportunities + 휴가 first, quests second **[OWNER]**

**Decision:** the app is no longer a daily quest app. The primary surface is the
**opportunity catalog** — *"기회를 발견하고, 그걸 끝내면 휴가가 나온다."* Quests
are the **execution checklist under a chosen opportunity**, not the front door.

**Why this is the right answer to the §1-A critique (analysis):**
- The catalog is the *only* asset that defeats "진작에 알았을 내용." Generic
  "read 10 pages" advice is commodity; "정보처리산업기사 군 위탁 무료검정, 응시료
  0원, 필기 D-day, 부대 안에서 응시, 합격 시 포상휴가 2~5일" is **not knowable
  without research** and is **not served by any other app**. The repo already
  holds 40 such dossiers with `eligibility`, `applyWhere`, `verified` date, and
  milestone breakdowns (`catalog.js`).
- 휴가 is the **strongest possible payoff** in a conscript's life and is
  **structurally exclusive to the military context**. 11 of 40 catalog entries
  already carry a `kind: '휴가'` reward. Leading with the 휴가 a soldier can
  *earn* converts the app from "self-improvement nag" to "휴가 vending machine
  with homework" — a far more compelling open.
- This reframes daily-use honestly: you don't open it daily to "grow a stat,"
  you open it when there's a deadline, a new opportunity, or a step due. That's
  a **tool cadence**, which matches what real users said they want.

**What changes structurally:**
- Home/hero = **opportunities + a 휴가 ledger** ("이번 분기에 딸 수 있는 휴가 N
  일", "확보 X일 / 진행 Y일"), not the guardian stage.
- The nightly check-in/streak loop is **demoted from the spine to an optional
  habit aid** for users actively running a track. It must not gate the catalog.
- "오늘 밤의 3" stops being the product's identity; it becomes "지금 해야 할
  다음 스텝" pulled from started opportunities.

**Risk:** a pure tool has weaker daily retention than a habit toy. Mitigation:
deadline/opportunity **push notifications** (PushNotification seam) replace the
streak as the return trigger — "you don't open daily, the 휴가 deadline pulls
you back." This is the honest version of retention for this product.

### F2. Collapse the six stats → one or two **[OWNER, spec PROPOSED]**

**Decision (owner):** six skills is overload and is the literal embodiment of
"jack of all trades." Reduce.

**Analysis & proposed spec:**
- The current six (체력/정신/자산/기술/관계/도전 — `data/index.js:113`) force a
  user to learn a 6-axis mental model before any screen makes sense. The radar
  is pretty but it is *cognitive load* (theme D) with no proven payoff.
- Opportunities already each carry a single `stat` tag, so the catalog does not
  *need* six axes to function — tags can stay as quiet filters.
- **[PROPOSED] Option A (recommended): two axes — 체력 & 정신.** Matches the
  owner's "really good at fitness or mental." The fitness track gets the
  body-spec personalization users asked for (F-theme); mental gets
  focus/study/mindset. Money/기술/관계/도전 content survives **inside the
  opportunity catalog** (a cert is just an opportunity), not as a tracked stat.
- **[PROPOSED] Option B: a single "성장 게이지"** — one progress number, no
  radar at all. Simplest; risks losing the "leveling" feel users *liked* (theme
  C/K). 
- **Recommendation:** Option A. Keep the *leveling feel* people liked, kill the
  6-axis tax people didn't understand. Two heroic bars beat one radar of six.

**Migration note:** stats are seeded with non-zero `cur` (`62/55/48/71/40/28`)
but `base: 0` and zero-start was a prior design decision (D1.1) — any collapse
should re-derive from completed-opportunity history, not re-seed fake numbers.

### F3. Demote the avatar; make stats/progress the hero **[OWNER]**

**Decision (owner):** make the stat the heroic element, demote the avatar; the
guardian is a candidate for **removal**.

**Analysis — three options, with a recommendation:**

| Option | What it means | Pros | Cons |
| --- | --- | --- | --- |
| **A. Remove guardian entirely** | Delete `creature.js` 3D + GuardianCard from the hero; hero becomes the 휴가 ledger + progress bars. | Maximum simplicity (kills theme D); aligns with "tool, not toy"; removes the asset/perf weight; nobody called the avatar *necessary*. | Loses the only emotional/identity hook and the evolution payoff that *some* users liked; onboarding "수호신 선택" moment disappears. |
| **B. Demote to a small mascot** | Guardian shrinks to a corner/profile companion that reacts to progress; stats + 휴가 are the hero. | Keeps emotional thread cheaply; reversible; satisfies "demote avatar, elevate stats." | Still carries 3D weight; half-measure. |
| **C. Keep + add variety** | More models, customization (the "아바타 다양화" request). | Pleases the avatar-likers. | Directly contradicts the owner's simplification goal; *invests* in the part users said was unnecessary. **Not recommended now.** |

**Recommendation:** **B now, A as the fast-follow if metrics confirm the avatar
adds nothing.** Demote immediately (low risk, high alignment); instrument
whether the guardian correlates with retention; if not, remove. Do **not** do C
(variety) until/unless the avatar earns its place — spending effort there now
optimizes the wrong thing.

### F4. The unresolved tension: military focus vs. "holistic app for everyone" **[NEEDS OWNER RULING]**

The owner floated: *market it as a holistic self-development app for everyone,
with a track selector — "군인 트랙" (military opportunities) vs. "사회 트랙"
(jobs, internships, hackathons, competitions).* This deserves a hard look
because **it conflicts with every other decision above.**

**The conflict:**
- F1–F3 all say **focus**: do one or two things, for one audience, extremely
  well. The wedge is *military opportunities → 휴가*.
- "Holistic app for everyone with a civilian track" says **broaden**: more
  audiences, more content domains.
- **You cannot simultaneously narrow the feature set and broaden the audience**
  without landing right back in "jack of all trades / nothing special" — the
  thing the survey punished.

**Why the civilian track is weak *as a launch move* (analysis):**
1. **It throws away the moat.** 휴가 — the single best hook — **does not exist
   for civilians**. A civilian "finish this hackathon" has no 휴가 payoff, so the
   civilian track is just another opportunity board.
2. **It enters a red ocean with no edge.** Civilian jobs/internships/hackathons
   are owned by 링커리어 / 원티드 / 사람인 / 잡코리아 / 위비티. A new entrant with
   a thin catalog loses on day one. The military catalog wins precisely
   *because the incumbents ignore it.*
3. **It re-triggers the survey critique.** "관심 있었으면 진작 알았을 내용" is
   *false* for in-unit cert dates but *true* for "여기 채용공고 있어요" — which
   everyone already knows where to find.

**Recommended resolution [PROPOSED]:** treat it as **phasing, not a launch
decision.**
- **Phase 1 (now):** be the undisputed best at **military opportunities →
  휴가/자격증**, for serving soldiers. Win a beachhead the incumbents don't
  contest. This is where the existing data, the 휴가 hook, and the surveyed
  audience all are.
- **Phase 2 (post-PMF):** the *natural* civilian expansion is **the same users
  at 전역** — "전역 후 트랙" (취업/편입/자격증 이어가기). The repo already has a
  `unlockDday: 90` window for post-discharge prep. Expanding to *your graduating
  soldiers' civilian life* is defensible (you have the relationship and their
  history); launching a generic civilian app for the open market is not.
- **Don't** build a parallel civilian catalog for the general public before the
  military product has retention. That is the broaden-while-narrowing trap.

> **Owner decision needed:** accept Phase-1-first (recommended), or insist on a
> dual-track launch (and accept the moat/competition risk above)?

### F5. Target user **[derived from F1/F4]**

Given F1/F4, the **primary target is the serving conscript with a deadline or a
휴가 to chase** — *not* "everyone," and *not* (yet) the post-discharge civilian.
Within that, design for the **drifting majority**: the app's job is to make
*starting* an opportunity effortless and the 휴가 payoff obvious, so a soldier
who "wasn't really planning anything" backs into a cert because the휴가 math is
right in front of them. The already-motivated user is served by the same tool as
an efficient tracker; we don't need a separate cohort for them.

---

## 4. The new product in one paragraph

> A serving soldier opens Dolbomi and sees **the휴가 and 자격증 they could
> actually earn this quarter** — hand-verified, in-unit-doable, with deadlines
> ticking. They pick one. The app breaks it into the next concrete step and
> (optionally) nudges them through it. Two progress bars (체력·정신) and a 휴가
> ledger show momentum. No six-axis radar to decode, no daily nag, no
> unnecessary avatar — just *"몰랐던 기회 + 끝내면 나오는 휴가,"* delivered in one
> glance.

---

## 5. What we must NOT break

The minority who said "만족 / 유지만 해도 완벽" value: (a) the **leveling/progress
feel**, and (b) the **opportunity content itself**. The repositioning *keeps both*
— it elevates the content and preserves leveling as 1–2 heroic bars. Verify in
testing that simplification doesn't read as "they removed the fun."

---

## 6. Prioritized problem → solution backlog

Priority key: **P0** = unblocks the repositioning / fixes the fatal critique ·
**P1** = high impact, in-scope now · **P2** = worthwhile, after P0/P1 ·
**P3** = defer / validate first. Effort: S/M/L.

| # | Problem (survey theme) | Solution | Pri | Effort |
| --- | --- | --- | --- | --- |
| 1 | No reason to open daily; positioned as habit toy on commodity content (A) | **Reposition to opportunities-first** (F1): hero = 휴가 ledger + opportunity catalog; quests become per-track execution; check-in/streak demoted to optional. | **P0** | L |
| 2 | "Jack of all trades," 6-stat overload (A, D) | **Collapse 6 stats → 2 (체력·정신)** (F2, Option A); other domains live as catalog opportunities, not tracked stats. | **P0** | M |
| 3 | Avatar seen as unnecessary; stats liked (C) | **Demote guardian to small mascot, make 2 stat bars + 휴가 ledger the hero** (F3, Option B); instrument for later removal. | **P0** | M |
| 4 | "누구 타겟인지 모르겠다" + holistic/civilian-track idea (A) | **Ratify Phase-1 = serving soldiers, military opps→휴가** (F4/F5); document civilian track as post-PMF "전역 후" expansion. *Owner ruling needed.* | **P0** | S (decision) |
| 5 | 휴가 is hard-coded but varies by unit; users want to set their own (G) | Make 휴가 reward **a range + user-editable actual**: per-opportunity `maxDays` already exists; add a per-user "우리 부대 기준" setting that overrides the displayed/ledgered days. Keep "부대 내규" disclaimer. | **P1** | M |
| 6 | Tone reads as 번역체; wants warm "~해볼까요?" encouragement (E) | Audit **system/UI strings + guardian lines** (content copy is already 해요체). Rewrite to warm, encouraging 해요체; add light coaching voice on empty/complete states. | **P1** | S |
| 7 | "화면이 너무 복잡 / 한 눈에 들어오게" (D) | Falls out of #1–#3 (radar gone, one hero, progressive disclosure). Add an explicit "one-glance home" acceptance check. | **P1** | (rolls up) |
| 8 | Fitness too generic; wants body-spec-based custom workouts (F) | Onboarding adds optional **체력 baseline** (키/몸무게/푸시업·윗몸·3km 기록); 체력 track (특급전사 standard) generates graded targets from it. This is the depth that earns the "great at fitness" claim. | **P1** | L |
| 9 | Wants 좋아요/싫어요 + 댓글 per opportunity (H) | Add lightweight **장병 평가** to each opportunity: aggregate 👍/👎 + short tips. Strong social proof; directly fights "진작 알았을 내용" by showing peer validation. (Needs moderation plan.) | **P2** | L |
| 10 | Wants minigames for fun (B) | Defer as a *retention experiment*, not core. If pursued, tie to the loop (e.g., a quick 체력 mini-challenge that logs a real rep count), never a detached arcade game. Validate demand first. | **P3** | M+ |
| 11 | "특별한 날에 선물" (I) | Milestone/calendar **gift moments**: 입대 100일, D-100 전역, 생일, 첫 자격증 → a title, palette unlock, or 휴가-tip card. Cheap delight + a non-nag return trigger. | **P2** | S |
| 12 | Light mode requested but already default (J) | **Verify the live deploy** serves light mode; if so, close as no-op. If an old build shipped dark, ship the current default. | **P1** | S (verify) |
| 13 | Back button reset the survey; risk of in-app state loss (J) | Audit SPA navigation/state persistence so back/refresh doesn't wipe onboarding or in-progress input. | **P2** | M |
| 14 | Honest retention without a streak (A, risk from F1) | **Deadline/opportunity push notifications** as the primary return trigger (PushNotification seam): "D-7: 정보처리 필기 접수 마감", "이번 주 끝낼 수 있는 휴가 1건". | **P1** | M |

---

## 7. Open questions for the owner

1. **F4 ruling:** Phase-1-military-first (recommended) vs. dual military/civilian
   launch? Everything downstream depends on this.
2. **F2:** Two stats (체력·정신, recommended) or a single growth gauge?
3. **F3:** Demote-then-measure (recommended) or remove the guardian outright now?
4. **#9 평가/댓글:** are we willing to own **moderation** of soldier-generated
   content (👍/👎 is low-risk; free-text 댓글 is not)?
5. **#5 휴가 editing:** show a conservative range only, or let users set an exact
   per-unit number (better realism, but self-reported 휴가 ledgers can mislead)?

## 8. What to validate next (cheap experiments before building)

- **Deploy check (#12):** confirm what build the surveyed users actually saw —
  several complaints may already be fixed.
- **Concept test:** show 5 soldiers an opportunities-first mock (no avatar, 2
  bars, 휴가 ledger) vs. current home; measure which they'd open weekly.
- **Catalog freshness:** the moat is *verified dates*. Confirm the
  `verified`/`unlockDday` data is current for 2026 before leaning the whole
  pitch on it — stale dates destroy the one advantage.

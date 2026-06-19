# DOLBOMI — Design Review & Decision Record

Three layers, matching the project's three passes:

1. **Part I — Design revamp v2 (current, 2026-06-11):** the full product-design
   audit done after the first design pass. Identity, visual language, copy,
   per-screen redesigns, and the content-depth roadmap. Every issue:
   **Problem → Decision → Spec/Status.** All decisions were made interactively
   with the product owner.
2. **Part II — Design review v1 (archive):** the first design pass
   (zero-XP start, 4-tab nav, goal templates, guardian permanence).
3. **Part III — Logic-gap history (archive):** the original catalogue of broken
   logic and how the Supabase migration resolved it.

**Status legend:** ✅ shipped (this pass) · ◐ partial · 📋 specified, build next
pass · ⏸ deliberately deferred.

---

# Part I — Design revamp v2

The first design pass fixed the *logic* of the experience (honest XP, clear
nav, real choices). This pass asked the harder questions:

- **Identity:** the app was a jack of all trades — a mediocre fitness app +
  finance tracker + career planner + benefits browser, good at none.
- **Visual:** generic icon-and-card "AI slop" styling, no affordances, walls
  of text causing cognitive overload, broken/cringy Korean.
- **Interaction:** quests with abbreviations nobody understands and no way to
  ask "what is this?"; boring rows of boxes where the core loop should feel
  alive.

The standard this pass designs to: **an App-Store-quality, minimal,
illustration-driven mobile app** — one job per screen, one glance per
decision, show-don't-tell.

## 1. Identity — what Dolbomi is

**I1. Jack of all trades → service-life companion. 📋 (architecture ✅, content next pass)**

*Problem:* the app had fitness quests but no training plan, money quests but
no financial substance, career quests but no real path. Each domain was a thin
veneer; a user serious about any one of them would leave for a real app.

*Decision:* Dolbomi's core identity is the one thing no other app can be:
**"don't waste your 18 months."** Fitness, money, and study are not app
pillars — they are **tracks** inside the service-life frame. Depth comes from
curated, conscription-specific tracks with externally meaningful goals, not
from competing with 전용 apps.

The three anchor tracks (template for all future depth):

| Track | Anchor | Why it works in-service |
| --- | --- | --- |
| **체력 — 특급전사 트랙** | 체력검정 특급 기준 (푸시업·윗몸·3km) | The standard every conscript already knows; graded multi-week progression toward a measurable test; payoff is real (포상휴가, pride at 검정). |
| **자산 — 금융 문해력 커리큘럼** | Sequenced lesson track: 기초 → 예적금·금리 → 주식·ETF → 분산·리스크 → 세금·계좌 | First salary of their lives; 2–3 min card lessons + 1-question check per unit, completing units grants XP like any subquest. **Education only — never name stocks to buy.** 장병내일준비적금 is lesson #1 (a ~10% risk-free instrument they already hold). Lives as a track in the 금융 category of 탐색 — no new nav. |
| **진로 — 자격증 트랙 + 편의 도시에** | Real cert exams taken in service (정보처리, 컴활, 지게차·굴착기, 한국사, TOEIC…) | The differentiator is **convenience, not goal-setting**: hand-curated dossiers per cert — 2026 exam windows, application site + fee, eligibility, what's doable from inside the 부대 (군 e-러닝, 시험일 휴가 필요 여부), pass criteria, study-hour estimates — baked into the opportunity detail so the user never has to search. |

*Constraints decided:* no cap on concurrent tracks — instead every started
track is **bookmarked and resumable** (see Q4 horizontal resume cards), so
many goals coexist without daily overload. Wrong exam dates are worse than
no dates: dossier data ships hand-verified, with a `verified_at` field and an
update cadence noted in the data file.

*Status:* track/subquest machinery, resume surface, and detail sheets ship in
this pass; the three content tracks (특급전사 progression
data, ~20 finance lessons, cert dossiers) are **📋 next pass** — they are pure
data + one lesson-card UI.

## 2. Visual language

**V1. Theme: light, green primary + gold reward. ✅**

*Problem:* default was light + gold everywhere; gold-as-chrome reads heavy,
and the owner wants green as the app's color.
*Decision:* **two-color system — green is the interface, gold is the
achievement.** Light mode default on every screen. Green (#16A34A family)
drives actions, nav, progress, links; gold survives exclusively where it means
*earned*: guardian gilding, XP numbers, titles, evolution glow.
*Shipped:* `tokens.css` light theme rebuilt around green primary + gold
`--xp` accent; `DEFAULT_PREFS.theme = 'light'`, default palette `청록` (green);
migration `0005` updates `profiles.theme`/`profiles.palette` defaults.

**V2. Generic icon slop → real illustration system. ✅ (system + core art)**

*Problem:* every surface used the same thin-stroke generic icon set; opp cards
hotlinked random Unsplash photos (visually incoherent, and the host is
unreachable in some deploys); avatar choice at onboarding was a plain icon.
*Decision:* **hybrid asset pipeline.**
- **Spot/category/mood art:** Microsoft **Fluent 3D emoji** (MIT) — committed
  into the repo (`src/assets/3d/`), one consistent dimensional style for quest
  categories, moods, empty states, rewards. No runtime hotlinking; Unsplash
  removed entirely.
- **Emotional core (guardians, onboarding heroes):** bespoke **layered SVG
  illustrations in 단청-inspired Korean folk-art style** — 해치 and 청룡 as
  majestic mythical-beast linework with ornamental patterns, authored in-repo,
  recolorable by palette. Onboarding presents them as **large illustration
  cards** (choice feels like choosing a companion, not a radio button); the
  live 3D model appears *after* choosing as the "it's alive" payoff.
- An asset **manifest** (`src/assets/manifest.js`) maps semantic keys →
  files so Midjourney/commissioned art can replace any piece later without
  touching components.

**V3. Text overload → progressive disclosure + show-don't-tell. ✅**

*Problem:* explanatory sentences everywhere (TipBanners, double-line subtitles
on every card, captions under section headers, parenthetical coaching); each
screen made the user *read* its logic instead of *seeing* it.
*Decision (stacked):*
1. **Progressive disclosure** — each screen answers one question above the
   fold; details move behind taps (bottom sheets).
2. **Show, don't tell** — visual states replace prose: the empty radar *is*
   the zero-start explanation; a locked illustration with a small condition
   line *is* the unlock rule.
*Shipped:* per-screen rebuilds below; TipBanner coaching survives only where
a state can't speak for itself, at one line max.

**V4. Broken/cringy Korean → clean 해요체. ✅**

*Problem:* the UI mixed forced-반말 ("오늘의 체크인이 기다려", "퀘스트가 다시
뽑혀"), joke labels ("시스템 털기"), and ungrammatical fragments.
*Decision:* **Toss-grade clean 해요체** for all functional UI. Two exemptions:
the auth manifesto **"우리 억울하지 말자."** stays 반말 (manifestos may break
the politeness rule), and the guardian's own short lines may be 반말 (it's
*your* companion). Joke labels are cut.
*Shipped:* full copy pass across every screen (see per-screen sections).

**V5. Stat vocabulary was invented military jargon. ✅**

*Problem:* 전투력·정신력·자산력·숙련도·지휘력·담력 forced users to learn six
made-up words before any screen made sense (지휘력 = leadership? 담력 = ?).
*Decision:* plain primary names — **체력 · 정신 · 자산 · 기술 · 관계 · 도전**.
The military flavor survives only as theming inside the guardian/radar context,
never as the functional label.
*Shipped:* `stat_defs` rename (data + UI), military names kept in `mil` field
for flavor surfaces only.

## 3. Quests — the core loop

**Q1. Boring rows → big illustrated quest cards. ✅**

*Problem:* 오늘 밤의 3 rendered as three thin gray rows — the heart of the app
looked like a checklist utility; nothing eye-catching, custom, or alive.
*Decision:* **big stacked cards** — each of tonight's quests is a full-width
card with its **category illustration** (per-category art, ~10 pieces from
the 3D set), large title, XP chip, and **one context chip** explaining why it
was picked for *you* ("관심사 · 코딩", "도전 부족", "어제 이어서") — one chip
max, derived from real data. Custom-feeling without paragraphs.

**Q2. Unclear quests (abbreviations, hidden requirements) → detail bottom sheet. ✅**

*Problem:* pool entries like "LC 음원 15분 쉐도잉", "NCS 모듈형 1세트",
"K-MOOC 1강" assume vocabulary many users lack; multi-step quests had no
visible steps; nothing was tappable for "what is this?"
*Decision:* **tap → app-store-style bottom sheet** for every quest: plain-
language explanation (abbreviation spelled out), how to do it, why it was
picked (full sentence), steps/subquests when present, XP + verify bonus.
Completion is a *separate* deliberate gesture so learning never accidentally
completes. Pool data gains `desc` (+ optional `how`) fields.

**Q3. Completion feel → hold-to-complete. ✅**

Press-and-hold (~0.7s): green fill sweeps the card, burst, XP flies toward the
stat. Tap stays free for the detail sheet; no accidental completes, so the old
3-second un-complete confirm state simplifies. Un-complete lives in the sheet.

**Q4. Many concurrent tracks → horizontal resume cards. ✅**

진행 중인 도전 becomes a horizontally scrollable row of **resume cards** —
progress ring + exactly one next step each — so any number of bookmarked goals
stays one glance high. Tap card → track plan.

## 4. Per-screen redesigns

**S1. 홈 → guardian stage. ✅**
Top ~55% is the guardian on an illustrated stage (sky shifts with time of
day); below it **one status pill** (오늘 2/3 · 🔥 12일) and **one button**
(체크인 → / 이어서 하기). Identity row moves to 프로필; next-unlock moves into
the guardian sheet; 오늘의 한 줄 becomes a short speech bubble *from the
guardian* (반말 allowed, V4).

**S2. 퀘스트 tab. ✅**
Order: check-in state (one compact line once done) → tonight's big cards (Q1)
→ horizontal resume cards (Q4) → 오늘의 기록 (unchanged, trimmed). Blur-gate
before check-in stays (it's show-don't-tell at its best).

**S3. 체크인 → guardian ritual. ✅**
Full-screen takeover: the guardian asks "오늘 어떠셨어요?" → four illustrated
mood choices (3D faces, not bare emoji) → tonight's cards are dealt with a
flip animation. The nightly 60 seconds is the app's signature moment, not a
utility modal. Energy sizing logic unchanged.

**S4. 기회 — 탐색. ✅**
Catalog cards carried up to 7 overlaid badges on random photos — the noisiest
surface in the app. Now: **category illustration + title + ONE chip**
(priority: D-day ≤14 → 해금 → 맞춤; never more than one) + reward line;
progress bar only when started. 주목/sub-text/next-step/status-dot/pace-marker
all move into the detail sheet. Header card and filter chips simplified.

**S5. 기회 — 휴가/혜택 segments. ✅**
Kept as segments, halved in ink: 휴가 = one big number + single recommended
path + simple list ("시스템 털기" cut); 혜택 = clean claim-checklist rows.

**S6. 프로필 → receipt + link list. ✅**
Three things only: identity header (rank/D-day/title) → **전역 리시트** (Gap
radar + total XP — the emotional core, ambient) → an iOS-settings-style link
list (진화 로드맵 · 칭호 · 기록 · 목표 조정 · 내 등록 기회 · 설정). Each link
opens its own sheet/page. Roadmap/titles/records render fully there, not
inline.

**S7. 온보딩 → 4 steps. ✅**
이름·복무 정보 → **수호신 선택 (folk-art illustration cards, V2)** → 목표
한 가지 (template+interests in one question) → done, straight into the first
check-in. The 4-card FirstRunGuide is deleted; its teaching moves into first
real actions (empty states, the blur gate, the first evolution toast).

**S8. 인증(Auth). ✅**
Manifesto "우리 억울하지 말자." stays as the hero (V4 exemption); the rest of
the screen converts to 해요체 and loses decoration.

## 5. Open items (specified, next passes)

| Item | Spec | Where it slots |
| --- | --- | --- |
| 특급전사 track data | graded weekly targets per 종목, test-sim milestones, 포상휴가 reward link | `catalog.js` track + dossier |
| Finance curriculum (~20 lessons) | I1 table; lesson-card swipe UI; quiz = 1 question/unit; education-only guardrail | 금융 track whose subquests are lessons |
| Cert dossiers (hand-verified 2026 dates) | I1 table; `dossier` field on opportunities; `verified_at` | OppDetail sheet |
| LLM quest selection + guardian lines | unchanged seam: replace `app_pick_pool` via Edge Function | migration `0004` comment |
| Journal → quest, Sunday Letter, squad/social | post-PMF per spec | spec Part V |
| Per-stage 3D model variants | gilding + aura carry stages for now | `creature.js` |
| Real leave-day ledger | needs verification story | H3 archive |

---

# Part II — Design review v1 (archive, 2026-06-11 first pass)

The technical loop works (quests grant XP, the creature evolves, streaks guard
by day). This pass asked: is the product clear, honest, and worth opening at
21:00 on an exhausted day? Decisions that still stand (superseded items point
to Part I):

- **D1.1 Zero-XP start ✅** — all six stats begin at 0; `base = 0`
  (migration `0004`). "Every pixel is something you did" is true from minute one.
- **D1.2 Evolution bands rebalanced ✅** — 각성기 0 → 성장기 40 → 성체 140 →
  정예 300 → 수호신 480; first evolution lands in week 1.
- **D1.3 Goal templates set targets ✅** — 취업 준비형/체력 단련형/자산
  형성형/창업 도전형 set discharge-day targets at onboarding; adjustable in
  profile (`app_set_targets`, clamped server-side).
- **D1.4 Cosmetic/prestige roadmap ✅** — unlocks are never feature gates:
  성장기 팔레트 · 성체 동료 수호신 · 정예/수호신 칭호. Starter title 「첫 걸음」
  at 10 XP.
- **D2.1 One guardian, real choice ✅** — 봉황/백호 cut (were reskins);
  해치/청룡 chosen permanently at onboarding; the other unlocks as a companion
  at 성체. Per-stat gilding stays.
- **D2.2 Collection model rejected** — one identity carries the 18 months.
- **D3.1 Quest pool ✅/📋** — 7-day no-repeat rotation (`quest_history`,
  `app_pick_pool` v2: fresh → interest-match → random); pool ~60. LLM layer
  deferred; the seam is `app_pick_pool` only. *Presentation superseded by
  Part I Q1–Q3.*
- **D3.2 4 tabs, one job each ✅** — 홈/퀘스트/기회/프로필; check-in gates the
  quest list. *Surfaces redesigned in Part I S1–S6.*
- **D3.4 Un-complete confirm ✅** — *superseded by hold-to-complete (Q3).*
- **D4.1 FirstRunGuide + TipBanners ✅** — *largely superseded by Part I V3/S7.*
- **D4.2 Streak-break toast ✅** — `app_checkin` returns `streak_before`.
- **D5.1 Light default ✅** — *superseded by V1 (green + gold).*
- **D5.2 Status-bar overlay ate taps ✅** — `pointerEvents:'none'` (`IOSFrame`).
- **D6.1 Profile as Receipt + hub ✅** — *layout superseded by S6.*
- **D7 Copy honesty ✅** — no "AI" claims until real; "퀘스트" mislabel → 경로
  보기; verified bonus explained where it applies.

---

# Part III — Logic-gap history (archive, first pass)

The original catalogue of **broken, non-functional, dead, or misleading
logic** in the prototype, and how the Vercel + Supabase migration resolved it.
File references predate the migration (the Express `server/` was removed;
write logic now lives in `supabase/migrations/0002+`, read assembly in
`src/api/client.js`).

| Group | Outcome |
| --- | --- |
| **A. XP/Evolution** — stats never increased, "+XP" cosmetic | ✅ `app_toggle_tonight`/`app_toggle_subquest` write `stats.cur` from reference XP; evolution, gilding, radar, celebrations all move. A5 partial (no full history recompute) |
| **B. Check-in/AI** — check-in changed nothing, streak unguarded | ✅ `app_checkin`: one bump per Seoul day, regenerates 오늘 밤의 3 by energy. B5 (real LLM) deferred — Part I §5 |
| **C. Fake AI surfaces** — hardcoded lines, no-op 재계획 | ✅ derived from data; honest labels |
| **D. Quest creation** — "추가" buttons were no-ops | ✅ `app_add_tonight` + user-opportunity CRUD (private → submitted → published) |
| **E. Verified bonus** — only a checkmark color | ✅ +50% XP server-side |
| **F. Settings/Theme/Path** — nothing persisted | ✅ real settings + auth + onboarding; persists to profile + localStorage |
| **G. Accounts** — single hardcoded demo login | ✅ Supabase Auth + RLS + `app_ensure_profile` |
| **H. Vacation** — "확보" was a constant | ✅ derives from completed vacation opps; H3 (real leave ledger) deferred |
| **I. Catalog** — frozen D-days, no gating | ✅ absolute deadlines, D-90 unlock server-side |
| **J. Titles/Recap/Share** — pre-owned titles, fake Wrapped | ✅ auto-award from requirements; recap derives from activity |
| **K. Persistence** — no refresh after mutations | ✅ mutations refetch snapshot. K3 (offline sync-back) accepted |
| **L. Misc** — dual data sources | ✅ `src/data` is the single source (seed.sql generated). L3 accepted |

The full item-by-item catalogue (A1–L3 with `file:line` references) lives in
this file's git history (`git log --follow docs/LOGIC-GAPS.md`) and in
[WORKFLOW-LOGIC.md](./WORKFLOW-LOGIC.md).

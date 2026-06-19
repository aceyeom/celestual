# DOLBOMI — Workflow & Logic

> **Historical note:** this document describes the pre-migration app (Express +
> SQLite, demo-only login). The "Actual" ❌/⚠️ notes were the starting point; most
> are now resolved on the Vercel + Supabase stack — see the **Resolution status**
> table in [LOGIC-GAPS.md](./LOGIC-GAPS.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
> for current behaviour. Kept here as the record of design intent.

This walks every core loop **as designed (intended)** vs **as implemented (actual)**.
It is deliberately logic-heavy. Each "Actual" note links to the corresponding entry
in [LOGIC-GAPS.md](./LOGIC-GAPS.md) where a fix is described.

Legend: ✅ works · ⚠️ partially works / misleading · ❌ does not work.

---

## 1. Boot & session

**Intended:** App opens, authenticates the soldier, loads their personalized state.

**Actual (✅ for demo, ❌ for real accounts):**
1. `App` mounts → `bootstrap()` (store.js:27).
2. `ensureSession()` → if no JWT in `localStorage`, `POST /auth/login` with the
  hardcoded `demo/dolbomi` credentials (client.js:33).
3. `GET /api/state` → snapshot → store populated; else offline fallback.

There is no login screen, no signup, no logout, no account switching. Everyone is
the same seeded soldier. → **LOGIC-GAPS #G (Accounts/Auth).**

---

## 2. The progression loop — XP, stats, and creature evolution

This is the spine of the product and the example the brief calls out
("how do the 6 skills level up the selected avatar"). It is also the **most
broken** loop.

**Intended:**
- Six stats — 전투력/정신력/자산력/숙련도/지휘력/담력 (body/mind/money/craft/people/edge).
- Completing a quest awards XP to the quest's `stat`, raising that stat's `cur`.
- The guardian's **evolution stage** is a function of total XP across the six stats:
  bands at 0 / 150 / 270 / 390 / 500 = 각성기 → 성장기 → 성체 → 정예 → 수호신
  (`BANDS`, GuardianCard.jsx:6).
- As stats rise, the creature visually gilds and evolves (head gold from
  mind+money, bulk from body, etc. — fully implemented in `creature.js`).

**How "leveling the avatar" is wired today:**
```
evolutionOf(stats) = sum(stats[i].cur) → which band → stage/label/progress%
                          ▲
                          │  stats[i].cur comes from the DB `stats` table
                          │
        toggleTonight / toggleSubquest only flip `done` flags + log activity
                          │
                          └── they NEVER write stats.cur
```

**Actual (❌):**
- `stats.cur` is seeded once and **never changes**. No mutation path updates it
  (mutations.js has no `stats` UPDATE). → **LOGIC-GAPS #A1.**
- Therefore `evolutionOf` always returns the same stage; the **creature never
  evolves** regardless of how many quests you finish. → **#A2.**
- The `QuestComplete` overlay counts up `+{xp} XP` and says
  "{stat} 경험치 성장", but **no XP is stored anywhere** — pure animation. → **#A3.**
- Per-stat `cur/tgt` shown in `StatBar`/`SkillDetail` are static seed numbers, not a
  count of completed quests. → **#A5.**
- The only thing that updates the creature live is the `milestones` count
  (App.jsx:79 → `setMilestones`), which changes **particle/orbit counts only**, not
  stage/XP/stats. → **#A7.**

> **Net effect:** the six skills do **not** level up the avatar. The avatar is a
> static, beautifully rendered snapshot of the seed stats.

---

## 3. Daily check-in (mood / energy) → "AI-customized goals"

The brief asks: *"how does answering 'how exhausted are you today' affect the AI-powered customized goals?"* Answer: **it doesn't.**

**Intended (per design chats):** an adaptive quest engine reads mood+energy and
tonight's three quests are tailored — low energy → 5-minute micro-quests, high
energy → push harder. An AI companion calibrates tone.

**Actual (❌):**
1. `CheckInSheet` collects `mood` + `energy` and shows hardcoded encouragement text
   ("에너지 바닥이네. 오늘은 5분짜리 미니 퀘스트만 줄게.") — Overlays.jsx:54.
2. On confirm → `storeCheckin(mood, energy)` → `POST /api/checkin`.
3. Server `addCheckin` (mutations.js:41): inserts a `checkins` row, **increments
   streak**, logs an activity row, returns a fresh snapshot.
4. **Tonight's quests are never regenerated.** They are 3 fixed seed rows. The
   home card claims "오늘 밤 퀘스트가 기분에 맞춰졌어" ("tonight's quests were matched
   to your mood") — this is false. → **LOGIC-GAPS #B1.**
5. `energy` is stored but **never read** by anything. → **#B3.**
6. `mood` lives only in local React state for the home-card label; not read back
   from the server, resets on reload. → **#B2.**
7. There is **no LLM/AI** in the codebase at all. The "AI companion" and "Sunday
   Letter" from the design docs are unimplemented. → **#B5.**
8. Streak increments on **every** check-in with no once-per-day guard. → **#B4.**

---

## 4. "오늘 밤의 3" (tonight's three quests)

**Intended:** a short, daily, adaptive list; you can add quests to it from
opportunities/benefits.

**Actual (⚠️):**
- Toggling a quest works and persists: `toggleQuest` → `storeToggleTonight` →
  `POST /api/tonight/:id/toggle`; completing one triggers the `QuestComplete`
  overlay (App.jsx:85). ✅ (the toggle itself).
- But the list is a **fixed set of 3 seed rows**. There is no endpoint or UI to
  add/remove/reorder/generate quests. → **LOGIC-GAPS #D2.**
- Every **"오늘 밤의 3에 추가"** button (OppDetail, OppPlan) and the Benefits
  **"퀘스트"** button do **not** add anything — they just navigate Home
  (`setPushed(null); setTab('home')`, App.jsx:106/109) or open the opp detail
  (`makeQuest`, App.jsx:94). → **#D1.**
- After completing a tonight quest, the activity log won't reflect it until a full
  reload (the toggle returns only `{ tonight }`, not the refreshed activity). → **#K2.**

---

## 5. Opportunities & structured plans

**Intended:** browse a catalog, open an opportunity, follow an AI-built milestone
plan of subquests, watch progress and pacing.

**Actual (✅ mostly, with ⚠️ on "AI"):**
- `RadarScreen` lists the catalog with a category filter. ✅ (but filter list omits
  the `교육` category, so `naeil` only shows under "전체" → **#I1**; header
  "육군 · 상병 프로필 기준" is hardcoded, not personalized → **#C3**).
- `OppDetail` / `OppPlan` render milestones and subquests; toggling a subquest
  persists via `toggleSubquest` and recomputes the opportunity's `fill` %. ✅
- The `OppProgressBar` "behind/on-pace" status is computed locally from `fill` vs a
  static `expectedPct` (OppPlan.jsx:9). ⚠️ `expectedPct` never moves with time.
- **"마감까지 다시 짜기 (AI 재계획)"** only sets local `replanned=true` and shows
  canned text; it does not change the plan and resets on navigation
  (OppPlan.jsx:58). → **LOGIC-GAPS #C2.**
- **"인증 +보너스"** (verified completion) only changes a checkmark color/tag; no
  bonus XP is awarded (xp is fixed by size). → **#E1.**
- Locked / D-90 opportunities (`started:false`, e.g. cheongnyeon/naeil) are not
  actually gated — you can open and toggle their subquests freely. → **#I3.**

---

## 6. Vacation ladder

**Intended:** aggregate every leave-earning opportunity; show days already secured
and the max additional days in progress.

**Actual (⚠️):**
- `VacationScreen` derives recommended/in-progress/future from the catalog and sums
  `MAXD` for "진행 중 다 따면 +N일". ✅ (display logic).
- **"지금 확보 N일"** comes from `getVacation.secured`, which only counts
  **fully-completed** vacation opps and otherwise returns a hardcoded `4`
  (state.js:108). In practice it shows `4` permanently. → **LOGIC-GAPS #H1.**
- `MAXD` is duplicated in `state.js:100` and `VacationScreen.jsx:6` (drift risk). → **#H2.**
- Even if an opp fully completes, the secured days are a **displayed number only** —
  nothing adds leave to the soldier or changes `dday`. → **#H3.**
- `store.vacation` is only refreshed by a full `getState`/`checkin`; toggling a
  subquest updates `catalog` but not `vacation`, so the ladder can lag the catalog
  until reload. → **#K1.**

---

## 7. Benefits hub

**Intended:** branch-aware list of military benefits grouped by category.

**Actual (⚠️):**
- Benefits render, grouped into 금융 / 자격증·어학 / 교육·학점 / 전역 준비. ✅
- The **branch filter (육군/해군/공군/해병대)** updates `branch` state but the grouped
  list never filters on it — selecting 해군 changes nothing (all benefits are tagged
  `전군`). This is the closest thing to a "병과/군별" control and it is a no-op.
  → **LOGIC-GAPS #F6.**
- A benefit's **"퀘스트"** button calls `onMakeQuest(oppId)` → just opens the opp
  detail; it does not create a quest. → **#D1.**

---

## 8. Theming, palette & avatar path ("settings", 조직, 병과, light/dark)

**Intended (per design):** users pick a palette and theme, choose/evolve a guardian
path, and presumably set identity (unit/organization, branch).

**Actual (❌ for end users):**
- There is **no settings screen.** Theme (다크/라이트), palette (골드/택티컬/스틸),
  creature path (해치/청룡/봉황/백호), icon stroke, "게임성", stat color, and the
  "오늘의 한 줄" toggle all live in the **developer `TweaksPanel`** (App.jsx:177).
- `TweaksPanel` only renders when it receives a `__activate_edit_mode`
  `postMessage` **from a parent frame** (the design-canvas host) — TweaksPanel.jsx:163,
  `if (!open) return null;` (line 198). In a standalone production deploy there is no
  such parent, so **the panel never opens** and users can change none of it.
  → **LOGIC-GAPS #F1, #F2.**
- Tweak values are React state initialized from `TWEAK_DEFAULTS` every load and are
  **not persisted** (no localStorage / server). They reset on refresh and only
  `postMessage` to the parent. → **#F3.**
- **Light/dark mode** is therefore not user-togglable and never persists. → **#F4.**
- **Avatar/path selection:** the in-card **"길 바꾸기"** picker (GuardianCard.jsx:59)
  *does* work at runtime (not gated by the panel) and swaps the live model — but
  it's not persisted and there's **no first-run avatar choice / onboarding**. → **#F5.**
- Only **two 3D models** back the four paths (`ANIMAL_FOR_PATH`, App.jsx:33): 봉황
  looks identical to 해치, 백호 identical to 청룡. → **#F7.**
- **조직 선택 (unit):** `soldier.unit` is hardcoded `제3보병사단`; no UI to set it. → **#F8.**

---

## 9. Titles, monthly recap, activity, sharing

**Actual:**
- **Titles** are static seed ownership; no logic awards a title on reaching a
  threshold (e.g. "철벽 · 전투력 60 돌파" is pre-owned). Equipped title never
  changes. → **LOGIC-GAPS #J1.**
- **Monthly Wrapped** is 100% hardcoded (`wrapped` in data/index.js) — 42 quests,
  +3 전투력, etc. — not derived from activity/checkins. → **#J2.**
- **Activity log** *does* gain rows server-side on quest completion and check-in
  (good), but every new row is labeled `day:'오늘'` with no real date, so the
  timeline collapses over multiple days. Offline, nothing logs. → **#J3.**
- **"카톡에 공유" / "친구에게 같이 하자고 보내기"** are `onClick={() => {}}` no-ops; the
  referral system from the design docs is absent. → **#J4.**

---

## 10. Data-flow summary (what actually mutates)

| User action | Persists? | Updates stats/XP? | Updates creature? | Notes |
| --- | --- | --- | --- | --- |
| Toggle tonight quest | ✅ (online) | ❌ | ❌ | logs activity server-side; client only refreshes `tonight` |
| Toggle subquest | ✅ (online) | ❌ | only `fill` % | `vacation`/`activity` not refreshed until reload |
| Check-in (mood/energy) | ✅ row + streak | ❌ | ❌ | energy unused; quests unchanged; streak not day-guarded |
| "AI 재계획" | ❌ (local only) | ❌ | ❌ | canned text; resets on nav |
| Change path / theme / palette | ❌ (memory only) | ❌ | path: live, not saved | theme/palette panel unreachable in prod |
| "추가 / 퀘스트 / 공유 / 인증" buttons | ❌ | ❌ | ❌ | navigate or no-op |

The honest one-line model: **toggling completion flags persists; everything that
would make those flags *mean something* (XP, evolution, leave, titles, adaptive
quests, AI) is not wired.**

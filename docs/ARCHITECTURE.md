# DOLBOMI — Architecture

How the app is built and wired **as of the Vercel + Supabase migration**. For
the behavioural intent vs. reality audit see [LOGIC-GAPS.md](./LOGIC-GAPS.md);
for the go-live steps see [../DEPLOYMENT.md](../DEPLOYMENT.md).

## 1. Stack at a glance

```
Browser ──┬─ Vercel (static Vite SPA, dolbomi-app/)
          └─ Supabase (Seoul):  Auth (email/password)  +  Postgres (RLS)  +  RPCs
```

There is **no application server**. The SPA talks to Supabase directly with
`@supabase/supabase-js`: Supabase Auth issues the session, Postgres Row-Level
Security scopes every read/write to the signed-in user, and all *write* game
logic lives in `SECURITY DEFINER` Postgres functions so XP can't be forged from
the client. (The old Express + SQLite server and the Render deploy were removed.)

## 2. Repository layout

```
dolbomi.app/
├── DEPLOYMENT.md           # go-live: Supabase + Vercel + Spaceship DNS
├── README.md               # top-level orientation
├── chats/                  # original design-tool transcripts (design intent)
├── project/                # original HTML/JSX mockups (reference only)
├── docs/                   # engineering docs (this folder)
├── scripts/
│   └── gen-supabase-seed.mjs   # src/data → supabase/seed.sql (single source of truth)
├── supabase/
│   ├── migrations/0001_init.sql       # schema + RLS
│   ├── migrations/0002_functions.sql  # game-logic RPCs
│   └── seed.sql                       # GENERATED reference content
└── dolbomi-app/            # the SPA
    ├── vercel.json         # SPA rewrites + build config
    ├── .env.example        # VITE_SUPABASE_URL / _ANON_KEY
    └── src/
```

## 3. Frontend module map

```
src/
├── main.jsx                 # React entry
├── App.jsx                  # shell: auth gate → tab router → push-nav → overlays
├── store.js                 # zustand: session + snapshot + prefs + optimistic mutations
├── api/
│   ├── supabase.js          # createClient(URL, anon); hasSupabase flag
│   └── client.js            # auth + fetchSnapshot (assembly) + RPC mutation wrappers
├── data/index.js            # SINGLE SOURCE OF TRUTH for reference content + offline fallback
├── util/share.js            # Web Share API helper
├── icons.jsx                # Icon(), STAT_C, STATUS
├── styles/tokens.css        # palettes × light/dark
├── 3d/creature.js           # Three.js guardian (gilding shader driven by stats)
├── components/              # ui, SkillDetail, Badges, ActivityLog, Overlays, creature/*…
└── screens/
    ├── AuthScreen.jsx        # sign in / sign up + onboarding (name, rank, branch, path)
    ├── SettingsScreen.jsx    # theme, palette, guardian path, sign out (persisted)
    ├── HomeScreen.jsx        # guardian, check-in, 오늘 밤의 3, stat bars, derived "오늘의 한 줄"
    ├── RadarScreen.jsx       # opportunity feed (full category set, D-90 lock badges)
    ├── OppDetail.jsx / OppPlan.jsx   # detail + plan + subquest toggles + locked gating
    ├── VacationScreen.jsx    # vacation ladder (real secured days)
    ├── BenefitsScreen.jsx    # benefits hub + working branch filter
    └── ProfileScreen.jsx     # identity, radar, equippable titles, recap/activity, settings link
```

### Navigation & gating (`App.jsx`)
- **Auth gate:** while `!authReady` a spinner shows; `needsAuth` → `AuthScreen`;
  otherwise the app. Offline (no Supabase env) skips auth and loads the demo.
- 5 bottom tabs (`home/radar/vacation/benefits/profile`) + a single **push layer**
  for detail screens (`opp`, `oppPlan`, `wrapped`, `settings`). A gear button and
  a profile link both open Settings.
- Theme / palette / guardian path come from **store `prefs`** (persisted to the
  profile online and `localStorage` offline), not the dev TweaksPanel.

## 4. The frontend ↔ Supabase seam

```
src/api/supabase.js   the client (or null when env is unset → offline mode)
src/api/client.js     auth (signIn/signUp/signOut), fetchSnapshot(), RPC wrappers
src/store.js          bootstrap() → onAuthChange → fetchSnapshot; mutations → RPC → refetch
src/data/index.js     reference catalog/benefits/titles + offline fallback
```

`bootstrap()`:
1. If no Supabase env → load `OFFLINE_SNAPSHOT` from `src/data` (dev/SSR/demo).
2. Else subscribe to `onAuthStateChange` and read the current session.
3. Session present → `fetchSnapshot()`; none → `needsAuth` (show `AuthScreen`).

`fetchSnapshot()` calls the idempotent `app_ensure_profile()` RPC (provisions a
new user's profile + stats + starter quests), then reads the per-user tables and
**merges them with the reference catalog from `src/data`** to build the exact
snapshot shape the screens consume (`getCatalog`-equivalent fill %, vacation
ladder, activity day labels, etc.). Reference structure stays in one place;
Supabase stores only per-user mutable state.

### RPC surface (`supabase.rpc(...)`)

| RPC | Does | Returns |
| --- | --- | --- |
| `app_ensure_profile()` | provision profile/stats/tonight if missing (reads auth metadata) | `{provisioned}` |
| `app_toggle_tonight(id)` | flip + grow/shrink the stat + log + award titles | `{tonight,stats,delta,stat}` |
| `app_toggle_subquest(opp,sq,verified)` | flip + XP (+50% if verified) + gate locked opps | `{subquests,stats,delta}` |
| `app_add_tonight(opp)` | add an opp's next step to 오늘 밤의 3 | `{tonight}` |
| `app_checkin(mood,energy)` | once-per-day streak + regenerate tonight by energy | `{tonight,streak,mood}` |
| `app_equip_title(name)` | equip an owned title | `{title}` |

Mutations are **optimistic locally, then RPC, then a full `fetchSnapshot()`
refresh** — so derived data (vacation, activity, awarded titles, evolution) stays
consistent in one place.

## 5. Database (`supabase/`)

- **Reference tables** (`stat_defs`, `opportunities`, `milestones`, `subquests`,
  `benefits`, `titles`, `quest_pool`): RLS `select` to authenticated users; never
  written via the API. Generated from `src/data` by `npm run gen:seed`.
- **Per-user tables** (`profiles`, `stats`, `tonight_quests`, `user_subquests`,
  `user_titles`, `checkins`, `activity`): RLS `using (user_id = auth.uid())` — a
  user can only see/modify their own rows.
- **Game logic** is `SECURITY DEFINER` PL/pgSQL: stat growth reads XP from the
  reference tables, the streak guard uses Asia/Seoul dates, titles auto-award on
  threshold, the check-in regenerates tonight from `quest_pool` sized to energy.

## 6. The 3D guardian (`src/3d/creature.js`)

`create({container, path, animal, stats, milestones, …})` builds a Three.js scene
and returns an imperative API (`setStats`, `setMilestones`, `pulse`, `dispose`…).
`applyStats()` gilds the model from stat values; `pulse()` runs the quest-complete
camera push. Because **stats now actually change at runtime** (§5), the gilding
and evolution that were always implemented are finally visible in normal use.

## 7. Build, run, test

```bash
cd dolbomi-app
npm install
cp .env.example .env.local      # paste your Supabase URL + anon key (optional for offline dev)
npm run dev                      # Vite dev server (offline demo if no env)
npm run build                    # production build → dist/  (what Vercel runs)
npm run test:smoke               # SSR-renders every screen to catch runtime errors
npm run gen:seed                 # regenerate supabase/seed.sql from src/data
```

With no `.env.local`, the app runs fully against the bundled `src/data` demo —
useful for design/dev and for the SSR smoke test.

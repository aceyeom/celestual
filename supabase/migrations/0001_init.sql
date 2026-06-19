-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOLBOMI · 0001 — schema, reference tables, per-user tables, RLS    ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Target: Supabase Postgres (Seoul / ap-northeast-2). Run order:
--   1) this file        (schema + RLS)
--   2) seed.sql         (reference content, generated from src/data)
--   3) 0002_functions.sql (game logic as SECURITY DEFINER RPCs)
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE.

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- REFERENCE TABLES (shared, read-only to authenticated users)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists stat_defs (
  key   text primary key,
  mil   text not null,
  en    text not null,
  real  text not null,
  tgt   integer not null,
  base  integer not null,   -- starting `cur` for a brand-new account
  ord   integer not null
);

create table if not exists opportunities (
  id           text primary key,
  cat          text not null,
  stat         text not null,
  title        text not null,
  hot          boolean not null default false,
  sub          text,
  what         text,
  eligibility  text,
  apply_where  text,
  source       text,
  verified     text,
  cost         text,
  deadline     date,            -- absolute → D-day decrements with real time
  unlock_dday  integer,         -- opp opens only when discharge is within N days
  started      boolean not null default false,
  reward       jsonb not null,
  why          text,
  expected_pct integer not null default 0,
  status       text not null default 'on',
  img          text,
  ord          integer not null
);

create table if not exists milestones (
  opp_id     text not null references opportunities(id) on delete cascade,
  id         text not null,
  title      text not null,
  date_label text,
  ord        integer not null,
  primary key (opp_id, id)
);

create table if not exists subquests (
  opp_id       text not null references opportunities(id) on delete cascade,
  id           text not null,
  milestone_id text not null,
  text         text not null,
  size         text not null,
  xp           integer not null,
  stat         text not null,
  default_done boolean not null default false,
  service      jsonb,
  ord          integer not null,
  primary key (opp_id, id)
);

create table if not exists benefits (
  id        text primary key,
  title     text not null,
  icon      text not null,
  tone      text,
  value     text,
  where_    text,
  branches  jsonb not null default '["전군"]'::jsonb,
  opp_id    text,
  headline  boolean not null default false,
  ord       integer not null
);

create table if not exists titles (
  name      text primary key,
  descr     text not null,
  rarity    text not null,
  legendary boolean not null default false,
  req       jsonb,            -- {kind:'stat',stat,val} | {kind:'streak',val} | {kind:'manual'}
  ord       integer not null
);

create table if not exists quest_pool (
  id   bigint generated always as identity primary key,
  stat text not null,
  txt  text not null,
  min  integer not null,
  xp   integer not null,
  hard boolean not null default false
);

-- ──────────────────────────────────────────────────────────────────────
-- PER-USER TABLES (keyed off Supabase Auth `auth.uid()`)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  name               text not null default '병사',
  rank               text not null default '이병',
  rank_en            text not null default 'PVT',
  title              text not null default '새내기',
  unit               text not null default '미지정',
  branch             text not null default '육군',
  enlist_date        date not null default (now() at time zone 'Asia/Seoul')::date - 180,
  discharge_date     date not null default (now() at time zone 'Asia/Seoul')::date + 540,
  streak             integer not null default 0,
  last_checkin_date  date,
  last_mood          text,
  theme              text not null default 'dark',
  palette            text not null default '골드',
  path               text not null default 'haechi',
  created_at         timestamptz not null default now()
);

create table if not exists stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  key     text not null,
  mil     text not null,
  en      text not null,
  real    text not null,
  cur     integer not null,
  tgt     integer not null,
  ord     integer not null,
  primary key (user_id, key)
);

create table if not exists tonight_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  id      uuid not null default gen_random_uuid(),
  stat    text not null,
  txt     text not null,
  min     integer not null,
  xp      integer not null,
  hard    boolean not null default false,
  done    boolean not null default false,
  ord     integer not null,
  primary key (user_id, id)
);

create table if not exists user_subquests (
  user_id     uuid not null references auth.users(id) on delete cascade,
  opp_id      text not null,
  subquest_id text not null,
  done        boolean not null default false,
  verified    boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, opp_id, subquest_id)
);

create table if not exists user_titles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  title_name text not null references titles(name) on delete cascade,
  owned      boolean not null default false,
  equipped   boolean not null default false,
  awarded_at timestamptz not null default now(),
  primary key (user_id, title_name)
);

create table if not exists checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mood_key   text not null,
  energy     integer,
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  stat       text,
  text       text not null,
  xp         integer,
  amount     bigint,
  streak     integer,
  opp        text,
  legendary  boolean,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_created_idx on activity (user_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────

-- Reference tables: any signed-in user may read; nobody writes via the API.
do $$
declare t text;
begin
  foreach t in array array['stat_defs','opportunities','milestones','subquests','benefits','titles','quest_pool']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists read_all on %I', t);
    execute format('create policy read_all on %I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Per-user tables: a user may only see/!modify their own rows.
do $$
declare t text;
begin
  foreach t in array array['stats','tonight_quests','user_subquests','user_titles','checkins','activity']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format($f$create policy own_rows on %I
      for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t);
  end loop;
end $$;

alter table profiles enable row level security;
drop policy if exists own_profile on profiles;
create policy own_profile on profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

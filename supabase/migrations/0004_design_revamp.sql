-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOLBOMI · 0004 — design revamp                                      ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Implements the design-review decisions (docs/LOGIC-GAPS.md):
--   · true-zero start: new accounts begin with 0 XP in every stat
--   · default theme: light + gold
--   · goal templates: per-user discharge-day targets (the Gap / Receipt)
--   · quest rotation: 7-day no-repeat memory for "오늘 밤의 3"
--   · titles: total-XP requirements (evolution roadmap prestige titles)
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE.

set check_function_bodies = off;

-- ── true-zero start ─────────────────────────────────────────────────────
-- Existing accounts keep their earned XP; only the seed for new accounts
-- changes. (seed.sql is regenerated from src/data with base = 0 as well.)
update stat_defs set base = 0;

-- ── default theme: light + gold ─────────────────────────────────────────
alter table profiles alter column theme set default 'light';

-- ── goal template (전역 목표 아키타입) ──────────────────────────────────
alter table profiles add column if not exists goal text not null default '';

-- ── quest rotation memory ───────────────────────────────────────────────
-- Every quest served into "오늘 밤의 3" is recorded; the picker skips quests
-- a user has seen in the last 7 days so the pool stops feeling repetitive.
create table if not exists quest_history (
  user_id   uuid not null references auth.users(id) on delete cascade,
  txt       text not null,
  served_on date not null default (now() at time zone 'Asia/Seoul')::date,
  primary key (user_id, txt, served_on)
);
alter table quest_history enable row level security;
drop policy if exists own_rows on quest_history;
create policy own_rows on quest_history
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function app_record_tonight(uid uuid) returns void
language sql security definer set search_path = public as $$
  insert into quest_history (user_id, txt, served_on)
  select uid, txt, app_seoul_date() from tonight_quests where user_id = uid
  on conflict do nothing
$$;

-- ── quest picking v2: interests first, recent repeats last ──────────────
-- ┌─ LLM SEAM ──────────────────────────────────────────────────────────┐
-- │ This function is the single place tonight's quests are selected.    │
-- │ A future model-backed generator (Edge Function calling the Claude   │
-- │ API to select + rephrase from this curated pool, bounded by the     │
-- │ same row shape) replaces only this function — callers are stable.   │
-- └─────────────────────────────────────────────────────────────────────┘
create or replace function app_pick_pool(uid uuid, n integer, p_hard boolean)
returns setof quest_pool
language sql stable security definer set search_path = public as $$
  select (s.q).* from (
    select q,
      -- fresh quests (not served in the last 7 days) strictly first
      case when exists (
        select 1 from quest_history h
        where h.user_id = uid and h.txt = q.txt and h.served_on > app_seoul_date() - 7
      ) then 1 else 0 end as seen,
      -- then interest matches
      case when q.tags ?| coalesce(
        (select array(select jsonb_array_elements_text(interests)) from profiles where id = uid),
        '{}'::text[]) then 0 else 1 end as pref,
      random() as r
    from quest_pool q
    where q.hard = p_hard
  ) s
  order by s.seen, s.pref, s.r
  limit n
$$;

-- ── per-stat discharge targets (the Gap) ────────────────────────────────
-- Targets come from a goal template at onboarding and stay user-editable.
-- Clamped server-side; never trusted raw.
create or replace function app_set_targets(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  k text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(p->'targets') = 'object' then
    for k in select jsonb_object_keys(p->'targets') loop
      if k in ('body','mind','money','craft','people','edge') then
        update stats set tgt = least(100, greatest(20, coalesce(((p->'targets')->>k)::int, tgt)))
          where user_id = uid and key = k;
      end if;
    end loop;
  end if;
  if nullif(p->>'goal', '') is not null then
    update profiles set goal = p->>'goal' where id = uid;
  end if;
  return jsonb_build_object('stats', app_stats_json(uid));
end $$;

-- ── titles: support total-XP requirements (roadmap prestige titles) ─────
create or replace function app_award_titles(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t record;
  met boolean;
  v integer;
  s text;
  cur_streak integer;
  total_xp integer;
begin
  select streak into cur_streak from profiles where id = uid;
  select coalesce(sum(cur), 0) into total_xp from stats where user_id = uid;
  for t in
    select tt.name, tt.req, tt.legendary
    from titles tt
    where tt.req is not null and (tt.req->>'kind') in ('stat','streak','total')
      and not exists (select 1 from user_titles ut where ut.user_id = uid and ut.title_name = tt.name and ut.owned)
  loop
    met := false;
    if (t.req->>'kind') = 'stat' then
      s := t.req->>'stat'; v := (t.req->>'val')::int;
      met := exists (select 1 from stats where user_id = uid and key = s and cur >= v);
    elsif (t.req->>'kind') = 'streak' then
      met := coalesce(cur_streak,0) >= (t.req->>'val')::int;
    elsif (t.req->>'kind') = 'total' then
      met := total_xp >= (t.req->>'val')::int;
    end if;

    if met then
      insert into user_titles (user_id, title_name, owned, equipped)
      values (uid, t.name, true, false)
      on conflict (user_id, title_name) do update set owned = true;
      insert into activity (user_id, type, text, legendary)
      values (uid, 'title', '칭호 획득 · ' || t.name, coalesce(t.legendary,false));
    end if;
  end loop;
end $$;

-- ── onboarding v2: + goal template targets, + rotation record ───────────
create or replace function app_complete_onboarding(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform app_ensure_profile();

  update profiles set
    name           = coalesce(nullif(trim(p->>'name'), ''), name),
    rank           = coalesce(nullif(p->>'rank', ''), rank),
    rank_en        = coalesce(nullif(p->>'rankEn', ''), rank_en),
    branch         = coalesce(nullif(p->>'branch', ''), branch),
    unit           = coalesce(nullif(trim(p->>'unit'), ''), unit),
    mos            = coalesce(nullif(p->>'mos', ''), mos),
    enlist_date    = coalesce((p->>'enlistDate')::date, enlist_date),
    discharge_date = coalesce((p->>'dischargeDate')::date, discharge_date),
    interests      = case when jsonb_typeof(p->'interests') = 'array' then p->'interests' else interests end,
    path           = case when p->>'path' in ('haechi', 'dragon') then p->>'path' else path end,
    onboarded      = true
  where id = uid;

  -- discharge-day targets from the chosen goal template
  perform app_set_targets(p);

  -- regenerate "오늘 밤의 3" so the very first quests already match the
  -- interests that were just chosen
  delete from tonight_quests where user_id = uid;
  insert into tonight_quests (user_id, stat, txt, min, xp, hard, ord)
  select uid, stat, txt, min, xp, hard, row_number() over () - 1
  from (
    select stat, txt, min, xp, hard from app_pick_pool(uid, 2, false)
    union all
    select stat, txt, min, xp, hard from app_pick_pool(uid, 1, true)
  ) s;
  perform app_record_tonight(uid);

  return jsonb_build_object('onboarded', true);
end $$;

-- ── check-in v3: + rotation record, + streak_before for break notices ───
create or replace function app_checkin(p_mood text, p_energy integer default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := app_seoul_date();
  prof record;
  new_streak integer;
  qcount integer;
  hard_n integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select streak, last_checkin_date into prof from profiles where id = uid;

  if prof.last_checkin_date = today then
    new_streak := prof.streak;                          -- already counted today
  elsif prof.last_checkin_date = today - 1 then
    new_streak := coalesce(prof.streak, 0) + 1;         -- consecutive day
  else
    new_streak := 1;                                    -- new / broken streak
  end if;

  update profiles set streak = new_streak, last_checkin_date = today, last_mood = p_mood
    where id = uid;

  -- regenerate "오늘 밤의 3" sized to energy (0..3), tailored to interests
  qcount := case coalesce(p_energy, 1) when 0 then 2 when 3 then 4 else 3 end;
  hard_n := case when coalesce(p_energy, 1) >= 2 then 1 else 0 end;

  delete from tonight_quests where user_id = uid;
  insert into tonight_quests (user_id, stat, txt, min, xp, hard, ord)
  select uid, stat, txt, min, xp, hard, row_number() over () - 1
  from (
    select stat, txt, min, xp, hard from app_pick_pool(uid, qcount - hard_n, false)
    union all
    select stat, txt, min, xp, hard from app_pick_pool(uid, hard_n, true)
  ) s;
  perform app_record_tonight(uid);

  insert into checkins (user_id, mood_key, energy) values (uid, p_mood, p_energy);
  insert into activity (user_id, type, text, streak)
    values (uid, 'checkin', '오늘의 컨디션 체크인', new_streak);
  perform app_award_titles(uid);

  return jsonb_build_object(
    'tonight',       app_tonight_json(uid),
    'streak',        new_streak,
    'streak_before', coalesce(prof.streak, 0),
    'mood',          p_mood,
    'energy',        p_energy);
end $$;

-- Expose the new RPC to signed-in users.
grant execute on function app_set_targets(jsonb) to authenticated;

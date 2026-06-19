-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOLBOMI · 0003 — onboarding profile, interests, user opportunities ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Adds: 병과(mos) + interests + onboarded flag + admin role on profiles,
-- interest tags on the quest pool / catalog, user-created opportunities
-- (private → submitted → published) and the RPCs that drive all of it.
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE.

set check_function_bodies = off;

-- ── profile: onboarding fields ──────────────────────────────────────────
alter table profiles add column if not exists mos       text  not null default '';
alter table profiles add column if not exists interests jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists onboarded boolean not null default false;
alter table profiles add column if not exists role      text  not null default 'user';

-- accounts provisioned before this migration already chose their fields at
-- signup — don't force them back through the wizard if they have a real unit.
update profiles set onboarded = true where unit <> '미지정' and name <> '병사';

-- ── interest tags on reference content ──────────────────────────────────
alter table quest_pool    add column if not exists tags jsonb not null default '[]'::jsonb;
alter table opportunities add column if not exists tags jsonb not null default '[]'::jsonb;

-- ── user-created opportunities (base-local events etc.) ─────────────────
-- payload mirrors the catalog entry shape the SPA consumes. Lifecycle:
--   private   → visible only to the author
--   submitted → author asked for it to be shared; admins can review
--   published → copied into the shared `opportunities` reference tables
create table if not exists user_opportunities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  payload    jsonb not null,
  status     text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

alter table user_opportunities enable row level security;
drop policy if exists own_rows on user_opportunities;
create policy own_rows on user_opportunities
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists admin_read on user_opportunities;
create policy admin_read on user_opportunities
  for select to authenticated using (app_is_admin());

-- ── interest-weighted quest picking ─────────────────────────────────────
-- Quests whose tags overlap the soldier's interests come first; the rest
-- fill in at random, so a thin interest still yields a full set.
create or replace function app_pick_pool(uid uuid, n integer, p_hard boolean)
returns setof quest_pool
language sql stable security definer set search_path = public as $$
  select q.* from quest_pool q
  where q.hard = p_hard
  order by
    case when q.tags ?| coalesce(
      (select array(select jsonb_array_elements_text(interests)) from profiles where id = uid),
      '{}'::text[]) then 0 else 1 end,
    random()
  limit n
$$;

-- ── complete onboarding: profile fields + interest-tailored tonight ─────
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

  return jsonb_build_object('onboarded', true);
end $$;

-- ── daily check-in (replaces 0002): interest-weighted regeneration ──────
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

  insert into checkins (user_id, mood_key, energy) values (uid, p_mood, p_energy);
  insert into activity (user_id, type, text, streak)
    values (uid, 'checkin', '오늘의 컨디션 체크인', new_streak);
  perform app_award_titles(uid);

  return jsonb_build_object(
    'tonight', app_tonight_json(uid),
    'streak',  new_streak,
    'mood',    p_mood,
    'energy',  p_energy);
end $$;

-- ── save (create/update) a user opportunity ─────────────────────────────
-- The payload is REBUILT server-side: ids are assigned, XP comes only from
-- the size table, and enums are validated — a client can never forge XP.
create or replace function app_save_user_opp(p_payload jsonb, p_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_title text := left(trim(coalesce(p_payload->>'title', '')), 80);
  v_cat text := coalesce(p_payload->>'cat', '교육');
  v_stat text := coalesce(p_payload->>'stat', 'edge');
  v_deadline date;
  v_kind text := coalesce(p_payload->'reward'->>'kind', 'cert');
  v_finish text := left(coalesce(p_payload->'reward'->>'finish', '완료'), 40);
  v_max integer := least(10, greatest(0, coalesce((p_payload->'reward'->>'maxDays')::int, 0)));
  ms jsonb := '[]'::jsonb;
  steps jsonb;
  step jsonb;
  subs jsonb := '[]'::jsonb;
  i integer := 0;
  v_size text;
  v_xp integer;
  clean jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if v_title = '' then raise exception '제목이 필요해'; end if;
  if v_cat not in ('금융','자격증','어학','학점','교육','대회','체력','취업','창업') then v_cat := '교육'; end if;
  if v_stat not in ('body','mind','money','craft','people','edge') then v_stat := 'edge'; end if;
  if v_kind not in ('휴가','cert','money') then v_kind := 'cert'; end if;
  v_deadline := coalesce((p_payload->>'deadline')::date, app_seoul_date() + 60);

  steps := case when jsonb_typeof(p_payload->'steps') = 'array' then p_payload->'steps' else '[]'::jsonb end;
  if jsonb_array_length(steps) < 1 then raise exception '실행 단계가 최소 1개 필요해'; end if;
  for step in select * from jsonb_array_elements(steps) loop
    i := i + 1;
    if i > 12 then exit; end if;
    v_size := case when step->>'size' in ('S','M','L') then step->>'size' else 'M' end;
    v_xp := case v_size when 'S' then 15 when 'M' then 38 else 90 end;
    subs := subs || jsonb_build_object(
      'id', 's' || i, 'text', left(trim(coalesce(step->>'text', '단계 ' || i)), 80),
      'size', v_size, 'xp', v_xp, 'stat', v_stat, 'done', false, 'service', null);
  end loop;
  ms := jsonb_build_array(jsonb_build_object(
    'id', 'm1', 'title', '실행', 'date', '~마감', 'subquests', subs));

  clean := jsonb_build_object(
    'id', 'u-' || v_id,
    'cat', v_cat, 'stat', v_stat, 'title', v_title, 'hot', false,
    'sub', left(coalesce(p_payload->>'sub', '직접 등록한 기회'), 80),
    'what', left(coalesce(p_payload->>'what', ''), 400),
    'eligibility', left(coalesce(p_payload->>'eligibility', '본인 확인'), 120),
    'applyWhere', left(coalesce(p_payload->>'applyWhere', ''), 120),
    'source', '직접 등록', 'verified', to_char(now(), 'YYYY.MM'),
    'cost', left(coalesce(p_payload->>'cost', '무료'), 60),
    'deadline', to_char(v_deadline, 'YYYY-MM-DD'),
    'started', false,
    'reward', jsonb_build_object('kind', v_kind, 'finish', v_finish, 'maxDays', v_max,
      'label', v_finish, 'note', '직접 등록 · 부대 내규 확인'),
    'why', left(coalesce(p_payload->>'why', ''), 160),
    'expectedPct', 0, 'status', 'on',
    'tags', case when jsonb_typeof(p_payload->'tags') = 'array' then p_payload->'tags' else '[]'::jsonb end,
    'milestones', ms, 'mine', true);

  insert into user_opportunities (id, user_id, payload, status, updated_at)
  values (v_id, uid, clean, 'private', now())
  on conflict (id) do update set payload = excluded.payload, updated_at = now()
    where user_opportunities.user_id = uid and user_opportunities.status <> 'published';

  return jsonb_build_object('id', 'u-' || v_id);
end $$;

create or replace function app_delete_user_opp(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from user_opportunities where id = p_id and user_id = uid;
  delete from user_subquests where user_id = uid and opp_id = 'u-' || p_id;
end $$;

-- author asks for their opportunity to be shared with everyone
create or replace function app_submit_user_opp(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update user_opportunities set status = 'submitted', updated_at = now()
    where id = p_id and user_id = uid and status = 'private';
  if not found then raise exception 'not submittable'; end if;
  return jsonb_build_object('status', 'submitted');
end $$;

-- admin review: approve copies the entry into the shared reference catalog
create or replace function app_review_user_opp(p_id uuid, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  row_rec record;
  ref_id text;
  m jsonb; s jsonb;
  mi integer := 0; si integer := 0;
begin
  if not app_is_admin() then raise exception 'admin only'; end if;
  select * into row_rec from user_opportunities where id = p_id and status = 'submitted';
  if not found then raise exception 'not in review'; end if;

  if not p_approve then
    update user_opportunities set status = 'private', updated_at = now() where id = p_id;
    return jsonb_build_object('status', 'private');
  end if;

  ref_id := 'c-' || replace(left(p_id::text, 13), '-', '');
  insert into opportunities (id, cat, stat, title, hot, sub, what, eligibility, apply_where,
                             source, verified, cost, deadline, unlock_dday, started, reward,
                             why, expected_pct, status, img, ord, tags)
  values (
    ref_id,
    row_rec.payload->>'cat', row_rec.payload->>'stat', row_rec.payload->>'title', false,
    row_rec.payload->>'sub', row_rec.payload->>'what', row_rec.payload->>'eligibility',
    row_rec.payload->>'applyWhere', '커뮤니티 등록 · 관리자 승인', to_char(now(), 'YYYY.MM'),
    row_rec.payload->>'cost', (row_rec.payload->>'deadline')::date, null, false,
    row_rec.payload->'reward', row_rec.payload->>'why', 0, 'on', null,
    (select coalesce(max(ord), 0) + 1 from opportunities),
    coalesce(row_rec.payload->'tags', '[]'::jsonb))
  on conflict (id) do nothing;

  for m in select * from jsonb_array_elements(row_rec.payload->'milestones') loop
    mi := mi + 1;
    insert into milestones (opp_id, id, title, date_label, ord)
    values (ref_id, m->>'id', m->>'title', m->>'date', mi)
    on conflict do nothing;
    for s in select * from jsonb_array_elements(m->'subquests') loop
      si := si + 1;
      insert into subquests (opp_id, id, milestone_id, text, size, xp, stat, default_done, service, ord)
      values (ref_id, s->>'id', m->>'id', s->>'text', s->>'size', (s->>'xp')::int, s->>'stat', false, null, si)
      on conflict do nothing;
    end loop;
  end loop;

  update user_opportunities set status = 'published', updated_at = now() where id = p_id;
  return jsonb_build_object('status', 'published', 'refId', ref_id);
end $$;

-- ── toggle a subquest (replaces 0002): also supports user opportunities ──
create or replace function app_toggle_subquest(p_opp_id text, p_subquest_id text, p_verified boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_xp integer;
  v_stat text;
  v_text text;
  prev record;
  prev_done boolean;
  prev_verified boolean;
  next_done boolean;
  next_verified boolean;
  o record;
  dday integer;
  bonus integer;
  delta integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  if p_opp_id like 'u-%' then
    -- user-created opportunity: read xp/stat from the (server-built) payload
    select (sq.val->>'xp')::int, sq.val->>'stat', sq.val->>'text'
      into v_xp, v_stat, v_text
    from user_opportunities uo,
         lateral jsonb_array_elements(uo.payload->'milestones') as ms(val),
         lateral jsonb_array_elements(ms.val->'subquests') as sq(val)
    where uo.user_id = uid and uo.id = substring(p_opp_id from 3)::uuid
      and sq.val->>'id' = p_subquest_id
    limit 1;
    if v_xp is null then raise exception 'subquest not found'; end if;
  else
    select xp, stat, text into v_xp, v_stat, v_text
    from subquests where opp_id = p_opp_id and id = p_subquest_id;
    if not found then raise exception 'subquest not found'; end if;

    -- gate D-90 / locked opportunities (LOGIC-GAPS I3)
    select o2.unlock_dday into o from opportunities o2 where o2.id = p_opp_id;
    if o.unlock_dday is not null then
      select (discharge_date - app_seoul_date()) into dday from profiles where id = uid;
      if dday is not null and dday > o.unlock_dday then
        raise exception 'opportunity locked until D-%', o.unlock_dday;
      end if;
    end if;
  end if;

  select done, verified into prev from user_subquests
    where user_id = uid and opp_id = p_opp_id and subquest_id = p_subquest_id;
  prev_done     := coalesce(prev.done, false);
  prev_verified := coalesce(prev.verified, false);
  next_done     := not prev_done;
  next_verified := next_done and coalesce(p_verified, false);

  insert into user_subquests (user_id, opp_id, subquest_id, done, verified, updated_at)
  values (uid, p_opp_id, p_subquest_id, next_done, next_verified, now())
  on conflict (user_id, opp_id, subquest_id)
  do update set done = excluded.done, verified = excluded.verified, updated_at = now();

  if next_done then
    bonus := case when next_verified then ceil(v_xp * 0.5) else 0 end;
    delta := v_xp + bonus;
    update stats set cur = least(app_stat_cap(), cur + delta) where user_id = uid and key = v_stat;
    insert into activity (user_id, type, stat, text, xp, opp)
      values (uid, 'quest', v_stat, v_text, delta, p_opp_id);
    perform app_award_titles(uid);
  else
    bonus := case when prev_verified then ceil(v_xp * 0.5) else 0 end;
    delta := -(v_xp + bonus);
    update stats set cur = greatest(0, cur + delta) where user_id = uid and key = v_stat;
  end if;

  return jsonb_build_object(
    'subquests', app_subquests_json(uid, p_opp_id),
    'stats',     app_stats_json(uid),
    'stat',      v_stat,
    'delta',     delta);
end $$;

-- Expose the new RPCs to signed-in users.
grant execute on function
  app_is_admin(), app_complete_onboarding(jsonb),
  app_save_user_opp(jsonb, uuid), app_delete_user_opp(uuid),
  app_submit_user_opp(uuid), app_review_user_opp(uuid, boolean)
to authenticated;

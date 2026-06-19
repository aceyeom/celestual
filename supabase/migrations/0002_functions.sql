-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOLBOMI · 0002 — game logic as SECURITY DEFINER RPCs               ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- All write logic lives here so a malicious client cannot forge XP: the
-- amount of XP a quest grants is read from the reference tables, never trusted
-- from the caller. Every function scopes to auth.uid().

set check_function_bodies = off;

-- Stat cap: a stat's `cur` is clamped to 100; six 100s = the top evolution band.
create or replace function app_stat_cap() returns integer language sql immutable as $$ select 100 $$;

create or replace function app_seoul_date() returns date language sql stable as $$
  select (now() at time zone 'Asia/Seoul')::date
$$;

-- ── snapshot helpers (jsonb in the exact shapes the SPA consumes) ──────
create or replace function app_stats_json(uid uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'key',key,'mil',mil,'en',en,'real',real,'cur',cur,'tgt',tgt) order by ord), '[]'::jsonb)
  from stats where user_id = uid
$$;

create or replace function app_tonight_json(uid uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'stat',stat,'txt',txt,'min',min,'xp',xp,'hard',hard,'done',done) order by ord), '[]'::jsonb)
  from tonight_quests where user_id = uid
$$;

create or replace function app_subquests_json(uid uuid, p_opp text) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'opp_id',opp_id,'subquest_id',subquest_id,'done',done,'verified',verified)), '[]'::jsonb)
  from user_subquests where user_id = uid and opp_id = p_opp
$$;

-- ── award titles whose requirement is now met (LOGIC-GAPS J1) ──────────
create or replace function app_award_titles(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t record;
  met boolean;
  v integer;
  s text;
  cur_streak integer;
begin
  select streak into cur_streak from profiles where id = uid;
  for t in
    select tt.name, tt.req, tt.legendary
    from titles tt
    where tt.req is not null and (tt.req->>'kind') in ('stat','streak')
      and not exists (select 1 from user_titles ut where ut.user_id = uid and ut.title_name = tt.name and ut.owned)
  loop
    met := false;
    if (t.req->>'kind') = 'stat' then
      s := t.req->>'stat'; v := (t.req->>'val')::int;
      met := exists (select 1 from stats where user_id = uid and key = s and cur >= v);
    elsif (t.req->>'kind') = 'streak' then
      met := coalesce(cur_streak,0) >= (t.req->>'val')::int;
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

-- ── idempotent provisioning: create profile + stats + tonight if missing ──
-- Called by the SPA right after a session is established. Reads onboarding
-- fields from the user's auth metadata so signup is a single round-trip.
create or replace function app_ensure_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  meta jsonb;
  has_profile boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select (raw_user_meta_data) into meta from auth.users where id = uid;
  meta := coalesce(meta, '{}'::jsonb);

  select exists(select 1 from profiles where id = uid) into has_profile;
  if not has_profile then
    insert into profiles (id, name, rank, rank_en, unit, branch, path, title,
                          discharge_date, enlist_date)
    values (
      uid,
      coalesce(nullif(meta->>'name',''), '병사'),
      coalesce(nullif(meta->>'rank',''), '이병'),
      coalesce(nullif(meta->>'rank_en',''), 'PVT'),
      coalesce(nullif(meta->>'unit',''), '미지정'),
      coalesce(nullif(meta->>'branch',''), '육군'),
      coalesce(nullif(meta->>'path',''), 'haechi'),
      '새내기',
      coalesce((meta->>'discharge_date')::date, app_seoul_date() + 540),
      coalesce((meta->>'enlist_date')::date, app_seoul_date() - 180)
    );
    -- six stats from the reference defs, starting at `base`
    insert into stats (user_id, key, mil, en, real, cur, tgt, ord)
    select uid, key, mil, en, real, base, tgt, ord from stat_defs;
    -- starter "오늘 밤의 3": two easy + one stretch from the pool
    insert into tonight_quests (user_id, stat, txt, min, xp, hard, ord)
    select uid, stat, txt, min, xp, hard, row_number() over () - 1
    from (
      (select stat,txt,min,xp,hard from quest_pool where not hard order by random() limit 2)
      union all
      (select stat,txt,min,xp,hard from quest_pool where hard order by random() limit 1)
    ) s;
  end if;

  return jsonb_build_object('provisioned', not has_profile);
end $$;

-- ── toggle one of tonight's quests; grows the matching stat (LOGIC-GAPS A1) ──
create or replace function app_toggle_tonight(p_quest_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q record;
  next_done boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into q from tonight_quests where user_id = uid and id = p_quest_id;
  if not found then raise exception 'quest not found'; end if;

  next_done := not q.done;
  update tonight_quests set done = next_done where user_id = uid and id = p_quest_id;

  if next_done then
    update stats set cur = least(app_stat_cap(), cur + q.xp) where user_id = uid and key = q.stat;
    insert into activity (user_id, type, stat, text, xp) values (uid, 'quest', q.stat, q.txt, q.xp);
    perform app_award_titles(uid);
  else
    update stats set cur = greatest(0, cur - q.xp) where user_id = uid and key = q.stat;
  end if;

  return jsonb_build_object(
    'tonight', app_tonight_json(uid),
    'stats',   app_stats_json(uid),
    'stat',    q.stat,
    'delta',   case when next_done then q.xp else -q.xp end);
end $$;

-- ── toggle a subquest; verified completion grants a +50% bonus (E1) ─────
create or replace function app_toggle_subquest(p_opp_id text, p_subquest_id text, p_verified boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ref record;
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
  select xp, stat into ref from subquests where opp_id = p_opp_id and id = p_subquest_id;
  if not found then raise exception 'subquest not found'; end if;

  -- gate D-90 / locked opportunities (LOGIC-GAPS I3)
  select o2.unlock_dday into o from opportunities o2 where o2.id = p_opp_id;
  if o.unlock_dday is not null then
    select (discharge_date - app_seoul_date()) into dday from profiles where id = uid;
    if dday is not null and dday > o.unlock_dday then
      raise exception 'opportunity locked until D-%', o.unlock_dday;
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
    bonus := case when next_verified then ceil(ref.xp * 0.5) else 0 end;
    delta := ref.xp + bonus;
    update stats set cur = least(app_stat_cap(), cur + delta) where user_id = uid and key = ref.stat;
    insert into activity (user_id, type, stat, text, xp, opp)
      values (uid, 'quest', ref.stat,
              (select text from subquests where opp_id = p_opp_id and id = p_subquest_id), delta, p_opp_id);
    perform app_award_titles(uid);
  else
    bonus := case when prev_verified then ceil(ref.xp * 0.5) else 0 end;
    delta := -(ref.xp + bonus);
    update stats set cur = greatest(0, cur + delta) where user_id = uid and key = ref.stat;
  end if;

  return jsonb_build_object(
    'subquests', app_subquests_json(uid, p_opp_id),
    'stats',     app_stats_json(uid),
    'stat',      ref.stat,
    'delta',     delta);
end $$;

-- ── add an opportunity's next step to tonight (LOGIC-GAPS D1) ───────────
create or replace function app_add_tonight(p_opp_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nx record;
  next_ord integer;
  min_for text;
  xp_for integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  -- next undone subquest in this opportunity
  select s.id, s.text, s.size, s.stat
    into nx
  from subquests s
  left join user_subquests us
    on us.user_id = uid and us.opp_id = s.opp_id and us.subquest_id = s.id
  where s.opp_id = p_opp_id and coalesce(us.done, false) = false
  order by s.ord
  limit 1;

  if found then
    -- skip if an identical open tonight quest already exists
    if not exists (select 1 from tonight_quests where user_id = uid and txt = nx.text and not done) then
      select coalesce(max(ord), -1) + 1 into next_ord from tonight_quests where user_id = uid;
      min_for := case nx.size when 'S' then 5 when 'M' then 20 else 45 end;
      xp_for  := case nx.size when 'S' then 2 when 'M' then 3 else 5 end;
      insert into tonight_quests (user_id, stat, txt, min, xp, hard, ord)
      values (uid, nx.stat, nx.text, min_for::int, xp_for, nx.size = 'L', next_ord);
    end if;
  end if;

  return jsonb_build_object('tonight', app_tonight_json(uid));
end $$;

-- ── daily check-in: once-per-day streak + energy-based regeneration ─────
-- Fixes B1 (tonight tailored to energy), B3 (energy used), B4 (streak guard).
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

  -- regenerate "오늘 밤의 3" sized to energy (0..3)
  qcount := case coalesce(p_energy, 1) when 0 then 2 when 3 then 4 else 3 end;
  hard_n := case when coalesce(p_energy, 1) >= 2 then 1 else 0 end;

  delete from tonight_quests where user_id = uid;
  insert into tonight_quests (user_id, stat, txt, min, xp, hard, ord)
  select uid, stat, txt, min, xp, hard, row_number() over () - 1
  from (
    (select stat,txt,min,xp,hard from quest_pool where not hard order by random() limit (qcount - hard_n))
    union all
    (select stat,txt,min,xp,hard from quest_pool where hard order by random() limit hard_n)
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

-- ── equip an owned title (LOGIC-GAPS J1) ───────────────────────────────
create or replace function app_equip_title(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from user_titles where user_id = uid and title_name = p_name and owned) then
    raise exception 'title not owned';
  end if;
  update user_titles set equipped = (title_name = p_name) where user_id = uid;
  update profiles set title = p_name where id = uid;
  return jsonb_build_object('title', p_name);
end $$;

-- Expose RPCs to signed-in users.
grant execute on function
  app_ensure_profile(), app_toggle_tonight(uuid),
  app_toggle_subquest(text, text, boolean), app_add_tonight(text),
  app_checkin(text, integer), app_equip_title(text)
to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0059: the hearts the wall began with.
--
-- Every letter already on the wall is given a number of hearts to start from,
-- once, and every letter written after this has run starts from none. The
-- count a letter shows is that number and the hearts people pressed, added
-- together, on every read that carries a count: the wall's letters, one
-- letter, the heart's own answer, and the writer's list of their own letters.
--
-- ── what it is, said plainly ────────────────────────────────────────────────
-- These are not hearts anybody pressed. design/VOICE.md holds every count to
-- "exactly accurate or absent", and a seeded count is neither. The product
-- asked for it by name, for the letters that are up today and for none that
-- come after, knowing that. So it is kept apart from the real hearts rather
-- than mixed into them, it is recorded as it was drawn, and it comes out in
-- one statement:
--
--   update wall_letters set hearts_seed = 0;
--
-- and goes back, exactly as it was first drawn, from the record below:
--
--   update wall_letters l set hearts_seed = s.seed
--     from wall_hearts_seed_0059 s where s.id = l.id;
--
-- ── a number on the letter, and not rows ────────────────────────────────────
-- A heart is a row in wall_hearts, one per person per letter (0042), and a row
-- needs a person. Seeding rows would mean inventing people in celestual_users,
-- and every invented person would then be folded by a merge, counted by the
-- desk and erased by nobody. So the number lives on the letter, `hearts_seed`,
-- and nothing reads it but the four functions below, and never on its own:
-- each of them answers the sum, so no browser can tell the seeded part from
-- the pressed part, and no function anywhere returns the seed by itself. A
-- letter written after this runs takes the column's default, which is nought.
--
-- ── the draw ────────────────────────────────────────────────────────────────
-- Most at nought, and a ceiling: 12 on the campus wall at berkeley, 30 on the
-- wall at the root. A letter is given nothing 35 times in a hundred; otherwise
-- it is given the size of a draw from a normal curve centred on nought and a
-- third of the ceiling wide, rounded down and held under the ceiling. That is
-- the bell folded at nought, so the counts pile up at the bottom and thin out
-- towards the top, and the ceiling is almost never reached. On the root wall
-- about four letters in ten get none and half get two or fewer; at berkeley
-- about half get none and six in ten get one or fewer. `random()` and
-- `random_normal()` are volatile, so every letter draws its own.
--
-- ── once, and never again ───────────────────────────────────────────────────
-- The draw runs the first time this file runs, on the letters that exist at
-- that moment, and a row in celestual_settings says it has. A second run
-- finds the row and draws nothing, so a letter written in between is never
-- given a number; the same holds for a database built from these files, where
-- the first run finds no letters at all and every letter after it is real.
-- The row's key is not on the desk's list (0039 `celestual_desk_setting_set`),
-- so the desk can neither show it nor change it.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the column ────────────────────────────────────────────────────────────
alter table wall_letters add column if not exists hearts_seed smallint not null default 0;
alter table wall_letters drop constraint if exists wall_letters_hearts_seed_ck;
alter table wall_letters add constraint wall_letters_hearts_seed_ck check (hearts_seed between 0 and 30);

comment on column wall_letters.hearts_seed is
  '0059: hearts a letter that was already up was given to start from, once. Added to the pressed hearts on every read that carries a count, and never read on its own. Nought on every letter written after. Out with: update wall_letters set hearts_seed = 0;';

-- ── 2. the record ────────────────────────────────────────────────────────────
-- What each letter was given, with its wall, kept so the seed can be taken
-- out and put back and so anybody can see exactly what was drawn. The service
-- role's alone, like 0058's record: no grant, and row level security on with
-- no policy. It goes with the letter when the letter is deleted.
create table if not exists wall_hearts_seed_0059 (
  id       uuid primary key references wall_letters (id) on delete cascade,
  seed     smallint not null,
  campus   text not null,
  saved_at timestamptz not null default now()
);
alter table wall_hearts_seed_0059 enable row level security;
revoke all on wall_hearts_seed_0059 from public, anon, authenticated;
comment on table wall_hearts_seed_0059 is
  '0059: the hearts each letter already up was given to start from, as drawn, once. The record the seed is taken out and put back from.';

-- ── 3. the draw ──────────────────────────────────────────────────────────────
-- One draw for one letter on one wall. A function of its own so the shape of
-- the curve can be read and tested in one place (scripts/sql/test-hearts-seed.sql);
-- nothing calls it but the block below, and the browser cannot.
create or replace function wall_hearts_seed_draw(p_campus text)
returns smallint
language plpgsql volatile set search_path = public as $$
declare
  v_cap integer := case when p_campus = 'berkeley' then 12 else 30 end;
begin
  if random() < 0.35 then return 0; end if;
  return least(v_cap, floor(abs(random_normal(0, v_cap / 3.0))))::smallint;
end;
$$;

revoke all on function wall_hearts_seed_draw(text) from public, anon, authenticated;
grant execute on function wall_hearts_seed_draw(text) to service_role;

comment on function wall_hearts_seed_draw(text) is
  '0059: one seeded count for one letter: nought 35 times in 100, otherwise the size of a normal draw a third of the ceiling wide, under the ceiling (12 at berkeley, 30 elsewhere).';

-- ── 4. once ──────────────────────────────────────────────────────────────────
do $$
declare
  v_first integer;
begin
  insert into celestual_settings (key, value) values ('wall_hearts_seeded_0059', now()::text)
    on conflict (key) do nothing;
  get diagnostics v_first = row_count;
  if v_first = 0 then
    raise notice '0059: the hearts were seeded on an earlier run; nothing is drawn now';
    return;
  end if;

  insert into wall_hearts_seed_0059 (id, seed, campus)
  select l.id, wall_hearts_seed_draw(l.campus), l.campus
    from wall_letters l
  on conflict (id) do nothing;

  update wall_letters l
     set hearts_seed = s.seed
    from wall_hearts_seed_0059 s
   where s.id = l.id;
end $$;

-- ── 5. the four reads that carry a count ─────────────────────────────────────
-- Each is its latest definition, word for word (wall_letters_for and
-- wall_letter from 0055, wall_mine from 0056, wall_heart from 0044), with one
-- change: the count is `hearts_seed` and the pressed hearts, added. Whether
-- this caller is one of them (`hearted`) is still the pressed hearts alone.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh      text := wall_target_key(p_handle);
  v_me    uuid := celestual_session_user(p_token);
  v_key   text := wall_free_key(p_token);
  v_gate  boolean;
  v_open  boolean := false;
  v_rows  jsonb   := '[]'::jsonb;
  v_kind  text    := case when left(coalesce(nh, ''), 1) = '~' then 'name' else 'handle' end;
  v_name  text;
  p       ig_profiles%rowtype;
  l       wall_letters%rowtype;
  v_can   boolean;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  select bool_or(wall_read_gate(v_me, x.campus)) into v_gate
    from wall_letters x
   where x.target_handle = nh and x.status = 'live' and x.expires_at > now();
  if v_gate is null then
    v_gate := exists (select 1 from wall_campuses c where c.is_open and wall_read_gate(v_me, c.slug));
  end if;

  if v_gate then
    perform wall_free_clear(v_key);
  end if;

  for l in
    select * from wall_letters
     where target_handle = nh and status = 'live' and expires_at > now()
     order by created_at desc
  loop
    v_can := v_gate or wall_free_take(v_key, l.id);
    v_open := v_open or v_can;
    if v_name is null then v_name := l.target_name; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
      'look',     l.look,
      'body',     case when v_can then l.body end,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
  end loop;

  if v_kind = 'handle' then
    select * into p from ig_profiles where handle = nh;
  end if;

  return jsonb_build_object(
    'ok', true, 'open', v_open, 'gated', v_gate, 'handle', nh, 'letters', v_rows,
    'kind', v_kind, 'name', v_name,
    'free', wall_free_state(v_key, v_gate),
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path
  );
end;
$$;

create or replace function wall_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  v_key  text := wall_free_key(p_token);
  l      wall_letters%rowtype;
  p      ig_profiles%rowtype;
  v_gate boolean;
  v_open boolean;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_gate := wall_read_gate(v_me, l.campus);
  if v_gate then perform wall_free_clear(v_key); end if;
  v_open := v_gate or wall_free_take(v_key, l.id);

  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  if l.target_kind = 'handle' then
    select * into p from ig_profiles where handle = l.target_handle;
  end if;

  return jsonb_build_object('ok', true, 'open', v_open, 'gated', v_gate,
    'free', wall_free_state(v_key, v_gate),
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path,
    'letter', jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
      'look',     l.look,
      'body',     case when v_open then l.body end,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
end;
$$;

-- The heart's own answer is the number the letter will show once it lands
-- (app/src/wall/data.js `heart`), so it is the same sum.
create or replace function wall_heart(p_token text, p_letter uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v_n  integer;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if not wall_read_gate(v_me, l.campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  if coalesce(p_on, true) then
    insert into wall_hearts (letter_id, user_id) values (l.id, v_me)
      on conflict (letter_id, user_id) do nothing;
  else
    delete from wall_hearts where letter_id = l.id and user_id = v_me;
  end if;

  v_n := l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id);
  return jsonb_build_object('ok', true, 'letter', l.id, 'hearts', v_n, 'hearted', coalesce(p_on, true));
end;
$$;

-- The writer's own list says what the letter says, so the account sheet and
-- the letter agree about the same letter.
create or replace function wall_mine(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  v_rows jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'handle', l.target_handle,
    'kind', l.target_kind,
    'name', l.target_name,
    'look', l.look,
    'body', l.body,
    'status', l.status,
    'at', l.created_at,
    -- how many hearted it. A count and never a list, the way every other
    -- read of the count is (0042), and the same sum they answer (0059).
    'hearts', l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
    'flagged', (l.status = 'live'
                and l.moderation->>'verdict' = 'review'
                and not (l.moderation ? 'desk')),
    'reasons', coalesce(l.moderation->'reasons', '[]'::jsonb),
    'down_by', case
      when l.status = 'live' and l.expires_at > now() then null
      when l.status = 'live' then 'lapsed'
      when l.moderation #>> '{desk,via}' in ('desk_shut', 'optout') then 'shut'
      when l.moderation #>> '{desk,via}' = 'report_upheld' then 'report'
      when l.status = 'removed' and l.moderation #>> '{desk,status}' in ('removed', 'rejected') then 'desk'
      when l.status = 'rejected' and l.moderation #>> '{desk,status}' = 'rejected' then 'desk'
      when l.status = 'removed' then 'report'
      when l.status = 'rejected' and (l.moderation->'reasons') ? 'expired_in_review' then 'lapsed'
      when l.status = 'rejected' then 'screen'
      when l.status = 'pending' then 'held'
      else null
    end
  ) order by l.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from wall_letters
     where author_id = v_me
       and created_at > now() - interval '30 days'
     order by created_at desc
     limit 12
  ) l;

  return jsonb_build_object('ok', true, 'letters', v_rows);
end;
$$;

-- `create or replace` keeps the grants; restated so this file stands on its own.
revoke all on function wall_letters_for(text, text)      from public;
revoke all on function wall_letter(text, uuid)           from public;
revoke all on function wall_heart(text, uuid, boolean)   from public;
revoke all on function wall_mine(text)                   from public;
grant execute on function wall_letters_for(text, text)    to anon, authenticated;
grant execute on function wall_letter(text, uuid)         to anon, authenticated;
grant execute on function wall_heart(text, uuid, boolean) to anon, authenticated;
grant execute on function wall_mine(text)                 to anon, authenticated;

comment on function wall_heart(text, uuid, boolean) is
  '0042, 0044, 0059: a heart on a letter, or off it, behind the read gate. Answers the count the letter now shows: the seeded hearts (0059) and the pressed ones, added.';
comment on function wall_mine(text) is
  '0056, 0059: the caller''s own letters, where each stands, whose hand took it down, and how many hearted it (the seeded hearts and the pressed ones, added). Answers about the caller only.';

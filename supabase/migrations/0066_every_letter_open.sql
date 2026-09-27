-- ─────────────────────────────────────────────────────────────────────────────
-- 0066: every letter open, and an @ for anybody.
--
-- The owner's two rulings of 26 September:
--
--   "Never hide or limit how many letters a user can view. Only nudge them."
--   "Allow unverified users to write to a specific @."
--
-- ── 1. the reads ────────────────────────────────────────────────────────────
-- Every browser was handed eight whole letters (0045, 0049), and the ninth
-- arrived with its words withheld by the database until a proof. That is gone.
-- wall_letters_for and wall_letter return every live letter's body to anybody,
-- proved or not, as many as they like, forever. What asks a reader to sign in
-- now is a nudge in the browser, which never withholds a word
-- (app/src/wall/Nudge.jsx).
--
-- Each read is its 0063 definition with the gate and the count taken out, so
-- the letter object is what it was, every key it carried, and `body` never
-- null. `open` is always true. The envelope loses `gated` and `free`, which
-- were the reader's place against the eight: a tab still on the old build
-- held them for the seal's one line and read them for nothing else
-- (app/src/wall/data.js), and it now reads a body on every letter and draws
-- it whole, which is the whole of what it needs.
--
-- ── 2. the readership record goes ───────────────────────────────────────────
-- 0045 kept a row per (browser, letter) for the eight, and said it should
-- stop existing the moment it stopped doing a job. It has stopped: the table
-- goes, rows and all. The six functions that kept it stay, answering as
-- though every letter were free, which is now simply true. Nothing calls them
-- after this file, but a read restored from an older one still would (0059
-- is run again by scripts/sql/test-hearts-seed.sql, and any file from 0045 to
-- 0063 could be run again by hand), and a restored read should hand over
-- every body rather than fail or count.
--
-- ── 3. writing to an @ without a proof ──────────────────────────────────────
-- An @-note needed a verified address at a school that takes them (0063).
-- It still can be, and that is the special one: it carries the school's
-- sticker, `verified`, and goes up at once, read where it stands. Beside it
-- now, anybody can write to an @ with no proof at all, and that note is
-- treated exactly as a name note is: the edge function reads it BEFORE it is
-- written (a pass writes it `live`, a review waits at `pending` for the desk,
-- a reject is written `rejected` and never shown), the device and the address
-- are throttled as for a name note, and it is never `verified`. It carries no
-- school: on an @-note the school is the proof, and a picked school beside an
-- unproved @ would read as the sticker without being it.
--
-- The write says which with a thirteenth argument, `p_proof`: 'edu' is the
-- 0063 path, and 'none' is the open one (a name note is always 'none',
-- whatever it says). The twelve argument write stands, and is the 'edu' path,
-- so the edge function already deployed writes exactly what it wrote.
--
-- Backward compatible: the reads answer what they answered, less the two
-- keys about the eight, and a body on every letter; the old write signatures
-- stand. Re-runnable: create or replace, and the drop is `if exists`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the reads ─────────────────────────────────────────────────────────────
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh      text := wall_target_key(p_handle);
  v_me    uuid := celestual_session_user(p_token);
  v_rows  jsonb   := '[]'::jsonb;
  v_kind  text    := case when left(coalesce(nh, ''), 1) = '~' then 'name' else 'handle' end;
  v_name  text;
  p       ig_profiles%rowtype;
  l       wall_letters%rowtype;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  for l in
    select * from wall_letters
     where target_handle = nh and status = 'live' and expires_at > now()
     order by created_at desc
  loop
    if v_name is null then v_name := l.target_name; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
      'look',     l.look,
      'body',     l.body,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me),
      'verified',   l.verified,
      'salutation', l.salutation,
      'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
    ));
  end loop;

  if v_kind = 'handle' then
    select * into p from ig_profiles where handle = nh;
  end if;

  return jsonb_build_object(
    'ok', true, 'open', true, 'handle', nh, 'letters', v_rows,
    'kind', v_kind, 'name', v_name,
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
  l      wall_letters%rowtype;
  p      ig_profiles%rowtype;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  if l.target_kind = 'handle' then
    select * into p from ig_profiles where handle = l.target_handle;
  end if;

  return jsonb_build_object('ok', true, 'open', true,
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
      'body',     l.body,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   l.hearts_seed + (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me),
      'verified',   l.verified,
      'salutation', l.salutation,
      'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
    ));
end;
$$;

-- `create or replace` keeps the grants; restated so this file stands on its own.
revoke all on function wall_letters_for(text, text) from public;
revoke all on function wall_letter(text, uuid)      from public;
grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;

comment on function wall_letters_for(text, text) is
  '0066: every live letter under a key, whole, to anybody. No gate and no count: the body always travels.';
comment on function wall_letter(text, uuid) is
  '0066: one live letter, whole, to anybody, and whether the caller holds its verified @ (mine).';

-- ── 2. the readership record goes ────────────────────────────────────────────
-- The six, answering for a wall with no allowance: none to count against
-- (the allowance is null, nothing has been used), every letter free to take,
-- nothing to clear, and no state to report. None of them reads the table, so
-- the table can go.
create or replace function wall_free_allowance()
returns int
language sql immutable set search_path = public as $$ select null::int $$;

create or replace function wall_free_used(p_key text)
returns integer
language sql immutable set search_path = public as $$ select 0 $$;

create or replace function wall_free_take(p_key text, p_letter uuid)
returns boolean
language sql immutable set search_path = public as $$ select true $$;

create or replace function wall_free_clear(p_key text)
returns void
language plpgsql immutable set search_path = public as $$ begin return; end; $$;

create or replace function wall_free_state(p_key text, p_gated boolean)
returns jsonb
language sql immutable set search_path = public as $$ select null::jsonb $$;

-- wall_free_key is a hash and nothing more, and stays as 0045 wrote it.

revoke all on function wall_free_allowance()           from public, anon, authenticated;
revoke all on function wall_free_used(text)            from public, anon, authenticated;
revoke all on function wall_free_take(text, uuid)      from public, anon, authenticated;
revoke all on function wall_free_clear(text)           from public, anon, authenticated;
revoke all on function wall_free_state(text, boolean)  from public, anon, authenticated;

comment on function wall_free_take(text, uuid) is
  '0045, 0066: every letter is free to read. Answers true and writes nothing; kept for a read restored from an older file.';
comment on function wall_free_allowance() is
  '0045, 0049, 0066: there is no allowance on reading. Null.';

drop table if exists wall_free_reads;

-- ── 3. writing to an @ without a proof ───────────────────────────────────────
-- The 0063 write with `p_proof`. SERVICE ROLE ONLY: the status is the screen's
-- decision, and an open note's is made before it is written.
--
--   'edu'   an @-note from a verified address at a school that takes them:
--           no session or no address is `edu`, the wrong school `campus`.
--           The school's campus, `verified`. As 0063.
--   'none'  an @-note from anybody, or a name note (always this). The author
--           is the session's user, or a bare row for a device never seen. A
--           name note takes the picked campus if it is open, else the root;
--           an @-note the root. Never verified.
--   both    the nonce is required and makes the write idempotent; the key is
--           checked against every campus; the allowance as before (0052); the
--           dear line cleaned or refused.
create or replace function wall_write(
  p_token       text,
  p_kind        text,
  p_target      text,
  p_name        text,
  p_salutation  text,
  p_body        text,
  p_look        jsonb,
  p_campus_pick text,
  p_source      text,
  p_status      text,
  p_moderation  jsonb,
  p_nonce       text,
  p_proof       text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_kind     text := case when p_kind = 'name' then 'name' else 'handle' end;
  v_open     boolean;
  v_name     text;
  v_sal      text;
  v_look     jsonb := wall_look_clean(p_look);
  v_source   text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source end;
  v_nonce    text := case when p_nonce ~ '^[A-Za-z0-9_-]{8,64}$' then p_nonce end;
  v_pick     text := lower(btrim(coalesce(p_campus_pick, '')));
  v_body     text := left(btrim(coalesce(p_body, '')), 280);
  nh         text;
  v_me       uuid;
  v_id       uuid;
  v_campus   text;
  v_verified boolean := false;
  v_spent    jsonb;
  v_used     int;
  v_limit    int := wall_letter_allowance();
begin
  if lower(coalesce(p_proof, 'edu')) not in ('edu', 'none') then
    return jsonb_build_object('ok', false, 'error', 'proof');
  end if;
  v_open := v_kind = 'name' or lower(coalesce(p_proof, 'edu')) = 'none';

  if v_kind = 'name' then
    v_name := wall_name_clean(p_name);
    if v_name is null then return jsonb_build_object('ok', false, 'error', 'name'); end if;
    nh := wall_name_key(v_name);
  else
    nh := celestual_norm(p_target);
    if nh is null or char_length(nh) < 3 then
      return jsonb_build_object('ok', false, 'error', 'handle');
    end if;
  end if;
  if v_body = '' then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  if v_nonce is null then return jsonb_build_object('ok', false, 'error', 'nonce'); end if;
  if nullif(btrim(coalesce(p_salutation, '')), '') is not null then
    v_sal := wall_salutation_clean(p_salutation);
    if v_sal is null then return jsonb_build_object('ok', false, 'error', 'salutation'); end if;
  end if;
  if p_status not in ('pending', 'live', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  -- who
  if v_open then
    v_me := celestual_session_user_or_new(p_token);
    if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  else
    v_me := celestual_session_user(p_token);
    if v_me is null then return jsonb_build_object('ok', false, 'error', 'edu'); end if;
  end if;

  -- the same draft, sent again: the first send's answer, and nothing new
  select id into v_id from wall_letters where author_id = v_me and nonce = v_nonce;
  if v_id is not null then
    return wall_letter_answer(v_id) || jsonb_build_object('replay', true);
  end if;

  -- where it stands
  if not v_open then
    if not exists (select 1 from celestual_users where id = v_me and edu_verified_at is not null) then
      return jsonb_build_object('ok', false, 'error', 'edu');
    end if;
    v_campus := wall_handle_campus(v_me, v_pick);
    if v_campus is null then return jsonb_build_object('ok', false, 'error', 'campus'); end if;
    v_verified := true;
  elsif v_kind = 'name' then
    v_campus := case when v_pick <> '' and exists (select 1 from wall_campuses where slug = v_pick and is_open)
                     then v_pick else 'global' end;
  else
    v_campus := 'global';
  end if;

  if wall_name_shut_any(nh) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  if p_status <> 'rejected' and wall_letter_cap_on() then
    v_spent := wall_letters_spent(v_me);
    v_used  := coalesce((v_spent->>'used')::int, 0);
    if v_used >= v_limit then
      return jsonb_build_object(
        'ok', false, 'error', 'cap',
        'limit', v_limit, 'used', v_used, 'left', 0,
        'resets_at', (v_spent->>'oldest')::timestamptz + wall_letter_window());
    end if;
  end if;

  insert into wall_letters (target_handle, target_kind, target_name, body, author_id, campus,
                            source_code, status, moderation, look, verified, salutation, nonce)
  values (nh, v_kind, v_name, v_body, v_me, v_campus,
          v_source, p_status, p_moderation, v_look, v_verified, v_sal, v_nonce)
  on conflict (author_id, nonce) where nonce is not null do nothing
  returning id into v_id;

  if v_id is null then
    -- a second tab won the same moment: its answer is this one's
    select id into v_id from wall_letters where author_id = v_me and nonce = v_nonce;
    return wall_letter_answer(v_id) || jsonb_build_object('replay', true);
  end if;

  return wall_letter_answer(v_id);
end;
$$;

-- The 0063 write, as it was called: the 'edu' path, so the edge function
-- already deployed keeps writing exactly what it wrote.
create or replace function wall_write(
  p_token       text,
  p_kind        text,
  p_target      text,
  p_name        text,
  p_salutation  text,
  p_body        text,
  p_look        jsonb,
  p_campus_pick text,
  p_source      text,
  p_status      text,
  p_moderation  jsonb,
  p_nonce       text
) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select wall_write(p_token, p_kind, p_target, p_name, p_salutation, p_body, p_look,
                    p_campus_pick, p_source, p_status, p_moderation, p_nonce, 'edu')
$$;

revoke all on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
revoke all on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text)
  to service_role;
grant execute on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)
  to service_role;

comment on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text) is
  '0066: the v2 write with its proof. ''edu'': an @-note from a verified address at a school with handle_notes, verified and up at once (0063). ''none'': anybody, read before it is written, never verified; a name note is always this. Idempotent on (author, nonce). Service role only.';
comment on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text) is
  '0063, 0066: the v2 write as first deployed, which is the ''edu'' path of the thirteen argument write. Service role only.';

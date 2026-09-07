-- ─────────────────────────────────────────────────────────────────────────────
-- 0044_the_reading_room_and_the_three.sql
--
-- Two changes, and they pull in opposite directions on purpose: the door to
-- READING opens, and the door to WRITING gets a meter on it. Re-runnable:
-- every statement is create or replace or guarded.
--
--   1  wall_read_gate: a proven person may read
--   2  the reads, the heart and the report, asking the new gate
--   3  the three a week
--   4  wall_quota: how many are left, for the screen that has to say so
--   5  wall_write, as 0039 wrote it, spending one
--
-- ── 1. why reading opens ──────────────────────────────────────────────────────
-- One gate answered three different questions and it should never have. Until
-- this migration a person who had proved their Instagram handle — the product's
-- OWN proof, the expensive one, the one that costs a DM and a code — arrived at
-- /berkeley signed in and was handed a wall of struck-out words with no way to
-- read one. Twenty-five of the twenty-seven people on the product were in
-- exactly that state. "Sign in to read the letters" was on the screen, they had
-- signed in, and nothing happened. That is not a gate; that is a door with the
-- wrong sign on it.
--
-- So the gate splits along the line it was always two things on either side of:
--
--   wall_read_gate   who may READ a letter, heart it, or report it. Anybody
--                    this product has actually proved: a verified campus
--                    address, or a verified handle. Being proved is the cost,
--                    and either proof is a real one.
--   wall_gate        who may WRITE one. Unchanged, and campus only. An
--                    anonymous letter about a named person, publishable by
--                    anybody on earth with a browser, is not anonymity — it is
--                    an open relay pointed at a student, and the berkeley.edu
--                    address is the room the letters are worth reading because
--                    of. Writing is the act that door was built for.
--
-- What does NOT change: the index stays public and asks nothing; the redaction
-- still happens in the database, so a person who edits anything in devtools
-- still gets a wall with no words on it; and nothing anywhere gains an author.
-- The two facts auth.js keeps apart stay apart — reading is gated, authorship
-- is absent.
--
-- ── 3. why three ──────────────────────────────────────────────────────────────
-- A wall whose contents are decided by whoever writes the most is a wall about
-- its most prolific writer. Three letters in any seven days is more than
-- anybody with something to say uses and far fewer than somebody working
-- through a list uses, and it is a number a person can hold in their head. It
-- is a rolling window rather than a lifetime allowance: the wall wants people
-- to come back, and an account spent forever on a Tuesday is an account that
-- never does.
--
-- A letter the screen REJECTED does not spend one. That is not generosity, it
-- is the only honest arithmetic: a reject is already told to the writer in
-- words, so it leaks nothing to leave the count alone, and charging somebody
-- for a letter that never existed anywhere would be charging them for the
-- screen's opinion. Everything else counts, including a letter held for review
-- and a letter later taken down — otherwise a report would hand its author a
-- fresh slot, which is the wrong way round.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wall_read_gate(user, campus) ──────────────────────────────────────────
-- May this person read this campus's letters.
--
-- The campus half is wall_gate's, word for word, so the two cannot drift on
-- what a campus address means: the domain out of wall_campuses, a subdomain of
-- it counting as it (0038), and the desk's pass list (0043). The handle half is
-- the DM proof, which is the only thing anywhere that writes handle_verified_at
-- (celestual_user_bind_handle, 0030).
--
-- Both halves still require the campus to be OPEN. A closed wall is closed to
-- everybody, and that is what wall_campuses.is_open is for.
create or replace function wall_read_gate(p_user uuid, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from celestual_users u
      join wall_campuses c on c.slug = p_campus and c.is_open
     where u.id = p_user
       and u.merged_into is null
       and (
         -- the campus, a subdomain of it, or the desk's list
         (u.edu_verified_at is not null
          and (u.edu_domain = c.edu_domain
               or u.edu_domain like '%.' || c.edu_domain
               or celestual_pass_email(u.edu_email)))
         -- or the handle, proved by the DM the product already asks for
         or u.handle_verified_at is not null
       )
  );
$$;

revoke all on function wall_read_gate(uuid, text) from public, anon, authenticated;
grant execute on function wall_read_gate(uuid, text) to service_role;

comment on function wall_read_gate(uuid, text) is
  '0044: who may READ a campus wall — a verified campus address (or a pass) OR a verified handle. wall_gate stays the WRITE gate, and stays campus only.';

-- ── 2. the reads, asking the new gate ────────────────────────────────────────
-- As 0042, with wall_read_gate in place of wall_gate and nothing else touched.
-- The redaction rule is unchanged: the body is null outside the gate, and the
-- word and character counts are sent either way so a redaction can be drawn at
-- the right size.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  nh     text := celestual_norm(p_handle);
  v_me   uuid := celestual_session_user(p_token);
  v_open boolean;
  v_rows jsonb;
  p      ig_profiles%rowtype;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  select bool_or(wall_read_gate(v_me, l.campus)) into v_open
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();
  v_open := coalesce(v_open, false);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',       l.id,
           'handle',   l.target_handle,
           'body',     case when v_open then l.body end,
           'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
           'chars',    char_length(l.body),
           'has_seal', l.sealed_line is not null,
           'campus',   l.campus,
           'at',       l.created_at,
           'expires',  l.expires_at,
           'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
           'hearted',  v_me is not null and exists (
                         select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
         ) order by l.created_at desc), '[]'::jsonb)
    into v_rows
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();

  select * into p from ig_profiles where handle = nh;

  return jsonb_build_object(
    'ok', true, 'open', v_open, 'handle', nh, 'letters', v_rows,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path
  );
end;
$$;

create or replace function wall_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  l      wall_letters%rowtype;
  p      ig_profiles%rowtype;
  v_open boolean;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_open := wall_read_gate(v_me, l.campus);
  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  select * into p from ig_profiles where handle = l.target_handle;

  return jsonb_build_object('ok', true, 'open', v_open,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path,
    'letter', jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'body',     case when v_open then l.body end,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
end;
$$;

-- A heart on a letter you could not read is a heart on a redaction, so the
-- heart follows reading rather than writing. As 0042, on the new gate.
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

  select count(*)::int into v_n from wall_hearts h where h.letter_id = l.id;
  return jsonb_build_object('ok', true, 'letter', l.id, 'hearts', v_n, 'hearted', coalesce(p_on, true));
end;
$$;

-- And the report follows reading too, which is the direction that protects the
-- person the letter is about. Somebody who can see a letter about them has to
-- be able to take it down, and now that a proved handle can read, a proved
-- handle can report: the subject of a letter is the likeliest person on the
-- surface to hold one and the least likely to hold a berkeley.edu address at
-- the moment they find their own name. It stays cheap to undo — a report is a
-- status change a person at the desk reverses in a minute — and the twenty an
-- hour cap 0038 put on it is unchanged.
create or replace function wall_report(p_token text, p_letter uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v_n  int;
  c_reports_per_hour constant int := 20;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if not wall_read_gate(v_me, l.campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  select count(*) into v_n from wall_reports
   where reporter_id = v_me and created_at > now() - interval '1 hour';
  if v_n >= c_reports_per_hour then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into wall_reports (letter_id, reporter_id, reason)
  values (p_letter, v_me, left(coalesce(nullif(btrim(p_reason), ''), 'unspecified'), 400));

  update wall_letters set status = 'removed' where id = p_letter and status = 'live';
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 3. the three a week ──────────────────────────────────────────────────────
-- One number, one window, in one place, so the screen that draws the meter and
-- the function that refuses the fourth letter cannot disagree about either.
create or replace function wall_letter_allowance()
returns integer
language sql immutable set search_path = public as $$ select 3 $$;

create or replace function wall_letter_window()
returns interval
language sql immutable set search_path = public as $$ select interval '7 days' $$;

-- What this person has spent, and when the oldest of it falls out of the
-- window. Internal: every caller is a security definer function below.
create or replace function wall_letters_spent(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'used',   count(*)::int,
    'oldest', min(l.created_at)
  )
  from wall_letters l
  where l.author_id = p_user
    and l.status <> 'rejected'
    and l.created_at > now() - wall_letter_window();
$$;

revoke all on function wall_letter_allowance()  from public, anon, authenticated;
revoke all on function wall_letter_window()     from public, anon, authenticated;
revoke all on function wall_letters_spent(uuid) from public, anon, authenticated;
grant execute on function wall_letter_allowance()  to service_role;
grant execute on function wall_letter_window()     to service_role;
grant execute on function wall_letters_spent(uuid) to service_role;

-- ── 4. wall_quota(token) ─────────────────────────────────────────────────────
-- Client-callable, and it answers about the CALLER and nobody else. There is no
-- argument for a person here and there never will be: how much somebody has
-- written is a fact about them, and a function that could be asked it about
-- another handle would be a way to ask whether a particular person has been
-- writing letters, which is nobody's business.
--
-- It answers for a browser with no session too, with used 0 and the full
-- allowance, because the composer draws the meter before it knows who is
-- holding it and a null there would be a blank space where a number goes.
--
-- `resets_at` is when the oldest spent letter falls out of the window, which is
-- the moment one comes back. Null when nothing has been spent.
create or replace function wall_quota(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me    uuid := celestual_session_user(p_token);
  v_limit int  := wall_letter_allowance();
  v_spent jsonb;
  v_used  int;
begin
  if v_me is null then
    return jsonb_build_object('ok', true, 'signed_in', false,
      'limit', v_limit, 'used', 0, 'left', v_limit, 'resets_at', null);
  end if;

  v_spent := wall_letters_spent(v_me);
  v_used  := coalesce((v_spent->>'used')::int, 0);

  return jsonb_build_object(
    'ok', true, 'signed_in', true,
    'limit', v_limit,
    'used',  v_used,
    'left',  greatest(v_limit - v_used, 0),
    'resets_at', case
      when v_used = 0 or (v_spent->>'oldest') is null then null
      else (v_spent->>'oldest')::timestamptz + wall_letter_window()
    end
  );
end;
$$;

revoke all on function wall_quota(text) from public;
grant execute on function wall_quota(text) to anon, authenticated;

comment on function wall_quota(text) is
  '0044: three letters in any seven days. Answers about the caller only — there is no argument for anybody else.';

-- ── 5. wall_write, spending one ──────────────────────────────────────────────
-- As 0039 wrote it, plus the allowance. The order matters: the campus gate
-- first, then the name, then the count, so a person outside the gate is told
-- they are outside the gate rather than told how many letters they have left.
--
-- The check is here and not only in the edge function because the edge function
-- checks and then writes, and two requests that both check before either writes
-- both pass. This is the statement that actually inserts, so this is where the
-- fourth letter has to be refused.
create or replace function wall_write(
  p_token   text,
  p_target  text,
  p_body    text,
  p_seal    text,
  p_source  text,
  p_campus  text,
  p_status  text,
  p_moderation jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh   text := celestual_norm(p_target);
  v_me uuid := celestual_session_user(p_token);
  v_id uuid;
  v_source text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source end;
  v_spent  jsonb;
  v_used   int;
  v_limit  int := wall_letter_allowance();
begin
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if p_status not in ('pending', 'live', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  if not wall_gate(v_me, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  if wall_name_shut(nh, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  -- A letter the screen is about to reject is written anyway (spec section 9:
  -- rejected content is stored so it appears at the desk) and does not spend
  -- one, so it is not counted here either.
  if p_status <> 'rejected' then
    v_spent := wall_letters_spent(v_me);
    v_used  := coalesce((v_spent->>'used')::int, 0);
    if v_used >= v_limit then
      return jsonb_build_object(
        'ok', false, 'error', 'cap',
        'limit', v_limit, 'used', v_used, 'left', 0,
        'resets_at', (v_spent->>'oldest')::timestamptz + wall_letter_window());
    end if;
  end if;

  insert into wall_letters (target_handle, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status);
end;
$$;

-- The grants are unchanged and `create or replace` keeps them; restated so this
-- file stands on its own. wall_write stays service role only: the browser may
-- not write a letter, it may only ask celestual-wall-moderate to.
revoke all on function wall_write(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function wall_letters_for(text, text)   to anon, authenticated;
grant execute on function wall_letter(text, uuid)        to anon, authenticated;
grant execute on function wall_heart(text, uuid, boolean) to anon, authenticated;
grant execute on function wall_report(text, uuid, text)  to anon, authenticated;

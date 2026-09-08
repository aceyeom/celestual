-- ─────────────────────────────────────────────────────────────────────────────
-- 0045_five_before_the_door.sql
--
-- Five letters, then the door. Re-runnable: every statement is create or
-- replace or guarded.
--
--   1  wall_free_reads, and why the count is on the server
--   2  the five questions asked of it, including the one the gate answers
--   3  wall_letters_for and wall_letter, spending them
--
-- ── what this is ─────────────────────────────────────────────────────────────
-- 0044 opened reading to either of the product's proofs and left everybody
-- else at a wall of struck-out words. That is one decision too early. Somebody
-- who has just scanned a code off a flyer has been asked to answer for
-- something before they have read a single sentence of the thing they are
-- being asked to answer for, and the four seconds the index buys are spent
-- looking at a redaction.
--
-- So: FIVE whole letters to anybody, proved or not. The sixth is blurred and
-- the door is on it. By then the wall has made its own case in its own words,
-- which is the only argument for signing in that was ever going to work.
--
-- ── why the count is on the server, and what that costs ─────────────────────
-- A count in localStorage is not a count. It is a number the reader owns, and
-- a body already in the document is a body already read: the whole reason the
-- redaction lives in the database (0032) is that a redaction the client
-- performs is not a redaction. Same rule, same place.
--
-- So there is a row per (browser, letter), and that is a readership record
-- where there was none. It is kept as small as a thing like that can be:
--
--   at most five rows per browser  nothing is written once the five are spent,
--                                  so the table cannot grow past 5n.
--   no identity of any kind        no user id, no handle, no address, no IP.
--   a key that cannot be joined    the browser's token is hashed with its own
--                                  domain separator (wall_free_key), so the
--                                  stored value is NOT celestual_sessions'
--                                  token_hash and a reader of the database
--                                  cannot put the two tables side by side.
--                                  Same trick, and same reason, as the salted
--                                  handle hash in docs/SECURITY.md.
--   nothing reads it back          no function returns which letters a browser
--                                  read. wall_free_used returns a count and
--                                  wall_free_take returns a boolean.
--   it dies twice over             on delete cascade with the letter, and
--                                  deleted outright the moment its browser
--                                  passes the gate, because a record that has
--                                  stopped doing a job should stop existing.
--
-- Clearing site data gives somebody five more. That is true of every other
-- thing this product holds in a browser (identity.js says so about the session
-- token) and it is the right trade: the alternative is fingerprinting a reader,
-- which is a much larger thing to do to somebody than let them read a sixth
-- letter.
--
-- ── the letters a name carries, all at once ─────────────────────────────────
-- wall_letters_for answers every live letter under one handle in one call, and
-- the screen pages through them without asking again. So it spends the free
-- reads greedily, in the order it returns them: the first ones come back whole
-- until the allowance runs out and the rest come back null. Five reads are five
-- letters actually handed over, whichever names they were under.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the table ─────────────────────────────────────────────────────────────
create table if not exists wall_free_reads (
  token_key  text        not null,
  letter_id  uuid        not null references wall_letters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (token_key, letter_id),
  constraint wall_free_reads_key_ck check (char_length(token_key) = 64)
);

create index if not exists wall_free_reads_letter_idx on wall_free_reads (letter_id);

alter table wall_free_reads enable row level security;
revoke all on wall_free_reads from anon, authenticated;

comment on table wall_free_reads is
  '0045: the five letters a browser may read before the door. One row per (browser key, letter), at most five per browser, no identity on it, and nothing returns which letters they were.';

-- ── 2. the questions asked of it ─────────────────────────────────────────────
-- How many a browser gets. One number, one place.
create or replace function wall_free_allowance()
returns integer
language sql immutable set search_path = public as $$ select 5 $$;

-- The key. Deliberately NOT the session's token_hash: the same secret, hashed
-- with its own prefix, so the free reads cannot be joined to an identity by
-- anybody reading the database. A token too short to be one of ours has no key
-- and therefore no free reads, which is the honest answer for a caller that
-- sent nothing.
create or replace function wall_free_key(p_token text)
returns text
language sql immutable set search_path = public, extensions as $$
  select case
    when p_token is null or length(p_token) < 16 or length(p_token) > 256 then null
    else encode(digest('wall.free.v1:' || p_token, 'sha256'), 'hex')
  end
$$;

create or replace function wall_free_used(p_key text)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select count(*)::int from wall_free_reads where token_key = p_key), 0)
$$;

-- Spend one on a letter, and answer whether this browser may read it.
--
-- Idempotent by (browser, letter): a letter already spent on stays readable
-- forever and costs nothing to open again, which is what makes walking back to
-- something you have read not a punishment. The insert is what enforces the
-- ceiling, so two calls racing each other cannot both be the fifth.
create or replace function wall_free_take(p_key text, p_letter uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
begin
  if p_key is null or p_letter is null then return false; end if;

  if exists (select 1 from wall_free_reads where token_key = p_key and letter_id = p_letter) then
    return true;
  end if;

  select count(*) into v_n from wall_free_reads where token_key = p_key;
  if v_n >= wall_free_allowance() then return false; end if;

  insert into wall_free_reads (token_key, letter_id) values (p_key, p_letter)
    on conflict (token_key, letter_id) do nothing;
  return true;
end;
$$;

-- Everything about the free reads is internal. The browser learns how many it
-- has left from the reads below and from nowhere else, and nothing anywhere
-- answers WHICH letters they were.
revoke all on function wall_free_allowance()      from public, anon, authenticated;
revoke all on function wall_free_key(text)        from public, anon, authenticated;
revoke all on function wall_free_used(text)       from public, anon, authenticated;
revoke all on function wall_free_take(text, uuid) from public, anon, authenticated;
grant execute on function wall_free_allowance()      to service_role;
grant execute on function wall_free_key(text)        to service_role;
grant execute on function wall_free_used(text)       to service_role;
grant execute on function wall_free_take(text, uuid) to service_role;

-- What the screen is told. A count, a ceiling and what is left. Never a list: no function anywhere
-- returns which letters a browser has read, and there is no argument here for
-- asking about another browser.
create or replace function wall_free_state(p_key text, p_gated boolean)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_gated, false) or p_key is null then
      jsonb_build_object('limit', wall_free_allowance(), 'used', 0, 'left', wall_free_allowance())
    else (
      select jsonb_build_object(
        'limit', wall_free_allowance(),
        'used',  wall_free_used(p_key),
        'left',  greatest(wall_free_allowance() - wall_free_used(p_key), 0))
    )
  end
$$;

-- The rows exist to ration something this browser is no longer rationed on, so
-- passing the gate deletes them. It costs one statement on a read that was
-- already going to happen, and it means the readership record does not outlive
-- the reason it was kept.
create or replace function wall_free_clear(p_key text)
returns void
language sql security definer set search_path = public as $$
  delete from wall_free_reads where p_key is not null and token_key = p_key
$$;

revoke all on function wall_free_state(text, boolean) from public, anon, authenticated;
revoke all on function wall_free_clear(text)          from public, anon, authenticated;
grant execute on function wall_free_state(text, boolean) to service_role;
grant execute on function wall_free_clear(text)          to service_role;

-- ── 3. the reads ─────────────────────────────────────────────────────────────
-- As 0044, plus the five. Both functions stop being `stable`, because spending
-- a free read is a write and it happens on the read that hands the letter over.
-- Nothing else about them changes: the body is still withheld by the database,
-- the word and character counts still travel either way so a redaction can be
-- drawn at the right size, and no letter has ever carried an author.
--
-- Three new keys on the answer, and the screen draws its meter off them:
--
--   gated  whether this reader is through wall_read_gate. When true the five
--          are irrelevant and `left` is the whole allowance.
--   free   { limit, used, left }, a count and never a list.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh      text := celestual_norm(p_handle);
  v_me    uuid := celestual_session_user(p_token);
  v_key   text := wall_free_key(p_token);
  v_gate  boolean;
  v_open  boolean := false;
  v_rows  jsonb   := '[]'::jsonb;
  p       ig_profiles%rowtype;
  l       wall_letters%rowtype;
  v_can   boolean;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  select bool_or(wall_read_gate(v_me, x.campus)) into v_gate
    from wall_letters x
   where x.target_handle = nh and x.status = 'live' and x.expires_at > now();
  -- A name with nothing under it used to answer `open: false` whoever asked,
  -- which was harmless while openness was one boolean about the whole read.
  -- It is not harmless now: `free` and `gated` are about the READER, and a
  -- signed in person opening an empty name would be told they were counting
  -- down free reads. With no letter to ask about, ask the campus.
  if v_gate is null then
    v_gate := exists (select 1 from wall_campuses c where c.is_open and wall_read_gate(v_me, c.slug));
  end if;

  -- The rows stop meaning anything the moment somebody is through the gate.
  if v_gate then
    perform wall_free_clear(v_key);
  end if;

  -- A row at a time, newest first, because whether a body travels is now a
  -- question per letter rather than per reader, and the allowance is spent in
  -- the order the screen will draw them.

  for l in
    select * from wall_letters
     where target_handle = nh and status = 'live' and expires_at > now()
     order by created_at desc
  loop
    v_can := v_gate or wall_free_take(v_key, l.id);
    v_open := v_open or v_can;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'body',     case when v_can then l.body end,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
  end loop;

  select * into p from ig_profiles where handle = nh;

  return jsonb_build_object(
    'ok', true, 'open', v_open, 'gated', v_gate, 'handle', nh, 'letters', v_rows,
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
  select * into p from ig_profiles where handle = l.target_handle;

  return jsonb_build_object('ok', true, 'open', v_open, 'gated', v_gate,
    'free', wall_free_state(v_key, v_gate),
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

grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0049_the_audit_of_ten_september.sql
--
-- What docs/BERKELEY-AUDIT.md found, in the schema. Re-runnable: every
-- statement is create or replace.
--
--   1  wall_can_write: the gate, askable before a model call is spent
--   2  wall_search, scoped to a campus
--   3  wall_remove_handle: a name comes off in one statement
--   4  the reads: one free letter per request, one gate check, hearts joined
--
-- ── what sent this file ──────────────────────────────────────────────────────
-- Two letters of the four ever written to this wall were sitting at `pending`
-- when the audit ran, and the classifier's own recorded reasons said why: the
-- sealed line was empty. Nothing in the product collects a sealed line, so it
-- was empty on every request, and the model read a field it had been told to
-- judge as evidence somebody had withheld. That fix is in the edge function.
-- What is here is everything underneath it that the same read turned up.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. wall_can_write(token, campus, handle) ─────────────────────────────────
-- The order of operations in celestual-wall-moderate was: shape checks, the
-- allowance, layer 1, THE PAID MODEL CALL, and only then wall_write — which is
-- where wall_gate has always lived. So a caller with no session at all reached
-- the classifier: any sixteen characters satisfied the token check, and
-- wall_quota answers `left: 3` to a token it has never seen, by design, because
-- the composer draws its meter before it knows who is holding the phone.
--
-- One anonymous request, one Haiku call, refused afterwards. No rate limit on
-- that path and CORS on '*'. This function is what the edge function asks
-- first, so being refused costs a query rather than a call.
--
-- It answers about the CALLER, like wall_quota, and it is SERVICE ROLE ONLY —
-- which wall_quota is not, and the difference is `shut`. Whether a handle is
-- closed is a fact about that person (they may have opted out, migration 0046),
-- and a browser that could ask it about any handle would have a way to ask
-- whether somebody has left the product. The edge function may ask; a browser
-- may not, and learns the same thing from being refused with 'removed'.
create or replace function wall_can_write(p_token text, p_campus text, p_handle text default null)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_me    uuid := celestual_session_user(p_token);
  nh      text := celestual_norm(p_handle);
  v_limit int  := wall_letter_allowance();
  v_spent jsonb;
  v_used  int;
begin
  -- No session is a complete answer, and it is the cheap one: nothing else is
  -- worth looking up about a caller who cannot write whatever else is true.
  if v_me is null then
    return jsonb_build_object('ok', true, 'session', false, 'gate', false, 'shut', false,
      'limit', v_limit, 'used', 0, 'left', 0, 'resets_at', null);
  end if;

  v_spent := wall_letters_spent(v_me);
  v_used  := coalesce((v_spent->>'used')::int, 0);

  return jsonb_build_object(
    'ok',      true,
    'session', true,
    'gate',    wall_gate(v_me, p_campus),
    'shut',    nh is not null and wall_name_shut(nh, p_campus),
    'limit',   v_limit,
    'used',    v_used,
    'left',    greatest(v_limit - v_used, 0),
    'resets_at', case
      when v_used = 0 or (v_spent->>'oldest') is null then null
      else (v_spent->>'oldest')::timestamptz + wall_letter_window()
    end
  );
end;
$$;

revoke all on function wall_can_write(text, text, text) from public, anon, authenticated;
grant execute on function wall_can_write(text, text, text) to service_role;

comment on function wall_can_write(text, text, text) is
  '0049: the write gate, asked by celestual-wall-moderate BEFORE it spends a classifier call. Service role only — `shut` is a fact about the handle and a browser may not ask it.';


-- ── 2. wall_search, scoped to a campus ───────────────────────────────────────
-- 0040's body with one predicate added. The search joined wall_index without
-- looking at `campus`, while every other read filters on it: the index select
-- does (api.js), wall_pulse does, wall_letters_for does by way of the letters.
--
-- One campus is open, so this changes nothing today. That is exactly why it is
-- worth doing today: the schema's whole claim is that a second campus is a row
-- in wall_campuses rather than a migration (0032), and on the day that row is
-- inserted an unscoped search starts answering Berkeley with the other campus's
-- names, silently, with no code change anywhere to make anybody look.
-- The two-argument form carries NO default, and that is load-bearing rather than
-- a style choice. With one, `wall_search('x')` matches both this function
-- filling its default and the one-argument form below, and Postgres refuses the
-- call outright: "function wall_search(unknown) is not unique". PostgREST calling
-- it with {p_query} — which is what the deployed client sends — would have hit
-- exactly the same wall, so the search would have been dead the moment this
-- landed. Postgres will not remove a default in place either, hence the drop.
drop function if exists wall_search(text, text);

create function wall_search(p_query text, p_campus text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.rank, t.letters desc, t.last_at desc, t.len), '[]'::jsonb)
  from (
    select i.target_handle                         as handle,
           i.letters,
           i.last_at,
           i.campus,
           (p.handle is not null)                  as known,
           p.display_name,
           coalesce(p.is_verified, false)          as is_verified,
           p.avatar_path,
           case when i.target_handle = q.h then 0
                when left(i.target_handle, char_length(q.h)) = q.h then 1
                else 2 end                          as rank,
           char_length(i.target_handle)            as len
      from (select celestual_norm(p_query) as h,
                   lower(btrim(coalesce(p_campus, 'berkeley'))) as c) q
      join wall_index i on strpos(i.target_handle, q.h) > 0 and i.campus = q.c
      left join ig_profiles p on p.handle = i.target_handle
     where q.h is not null and char_length(q.h) >= 1
     order by rank, i.letters desc, i.last_at desc, len
     limit 12
  ) t;
$$;

-- 0040's one-argument form stays callable so a browser that has not shipped yet
-- is not broken by the deploy order. It is the new one at the default campus,
-- and it is a separate function rather than a default for the reason above.
create or replace function wall_search(p_query text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select wall_search(p_query, 'berkeley')
$$;

revoke all on function wall_search(text)       from public;
revoke all on function wall_search(text, text) from public;
grant execute on function wall_search(text)       to anon, authenticated, service_role;
grant execute on function wall_search(text, text) to anon, authenticated, service_role;


-- ── 3. wall_remove_handle(token, handle) ─────────────────────────────────────
-- A whole name, off, in one statement.
--
-- There was no such operation. screens/Remove.jsx looped wall_remove_letter
-- over whatever the cache held, and data.js reloaded the entire index after
-- each one — so a name with twelve letters cost twelve removal calls and twelve
-- five-hundred-row index reads, serially, on the one screen in this product
-- that must not feel broken.
--
-- Worse than slow: not atomic. A letter written between the screen reading the
-- list and the loop reaching the end was never removed, and the first
-- successful removal files a claim, which shuts the name — so that straggler
-- stood on the wall for good, under a handle nobody could write to any more,
-- after a screen had told its subject every letter was gone.
--
-- The claim goes in first, on every letter about to come down, so wall_name_shut
-- holds the name even if nothing else in this transaction did. And there is no
-- expiry filter on the update: an expired letter is already invisible, but a
-- name coming off should come off clean.
create or replace function wall_remove_handle(p_token text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  nh   text := celestual_norm(p_handle);
  v_n  int;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;

  -- The verified handle, and nothing else. A campus address says you are from
  -- this campus; it says nothing about whether this @ is yours, and this is the
  -- one act on the surface that turns entirely on that question.
  if not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = nh
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  insert into wall_claims (letter_id, user_id)
  select l.id, v_me from wall_letters l
   where l.target_handle = nh and l.status = 'live'
  on conflict (letter_id, user_id) do nothing;

  update wall_letters set status = 'removed'
   where target_handle = nh and status = 'live';
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'handle', nh, 'removed', v_n);
end;
$$;

revoke all on function wall_remove_handle(text, text) from public;
grant execute on function wall_remove_handle(text, text) to anon, authenticated;

comment on function wall_remove_handle(text, text) is
  '0049: every live letter to one handle, down, in one statement, from the verified handle. Replaces a client-side loop that was neither atomic nor complete.';


-- ── 4. the reads ─────────────────────────────────────────────────────────────
-- Three things, and the first one is a behaviour change people will feel.
--
-- ── ONE FREE LETTER PER REQUEST, NOT ONE PER LETTER ──
-- 0045 loops every live letter under a handle and calls wall_free_take on each,
-- so opening one name with six letters spent the whole allowance in a single
-- request — before the reader had read a second sentence, and with every other
-- name on the wall blurred from then on. The migration's own words are "five
-- reads are five letters actually handed over", and that is what it implemented;
-- but the README describes "five marks under every card, one struck per letter
-- read", and the README is describing the product. A reader who taps the
-- largest disc on the field — which is the one the hive draws largest, so it is
-- the one people tap first — should not lose their whole allowance to it.
--
-- So: at most one per call, on the newest letter this browser has not already
-- been handed, which is the one the sheet opens on. The pager's own
-- wall_letter(id) calls spend the rest, one at a time, as somebody turns the
-- stack. A letter already spent on stays open forever and costs nothing, which
-- is unchanged and is what makes walking back to something not a punishment.
--
-- ── ONE GATE CHECK ──
-- It was bool_or(wall_read_gate(v_me, l.campus)) over every live letter under
-- the name: a security definer exists() against celestual_users joined to
-- wall_campuses, once per row, all of them asking the same question about the
-- same campus.
--
-- ── AND THE HEARTS JOINED RATHER THAN SUBQUERIED ──
-- Two correlated subqueries per row inside a plpgsql loop. A name with forty
-- letters cost roughly forty gate checks and a hundred and sixty small queries
-- to answer one tap. The loop is gone: one statement builds the array.
--
-- Nothing about the redaction changes. The body is still withheld by the
-- database, the word and character counts still travel either way so a
-- redaction can be drawn at the right size, and no letter has ever carried an
-- author.

-- Has this browser already been handed this letter? Asked without spending one,
-- which wall_free_take cannot do. Internal, like everything else about the five.
create or replace function wall_free_has(p_key text, p_letter uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_key is not null and exists (
    select 1 from wall_free_reads where token_key = p_key and letter_id = p_letter)
$$;

revoke all on function wall_free_has(text, uuid) from public, anon, authenticated;
grant execute on function wall_free_has(text, uuid) to service_role;

-- 0045's body, counting once. It called wall_free_used twice in one expression.
create or replace function wall_free_state(p_key text, p_gated boolean)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_gated, false) or p_key is null then
      jsonb_build_object('limit', wall_free_allowance(), 'used', 0, 'left', wall_free_allowance())
    else (
      select jsonb_build_object(
        'limit', wall_free_allowance(),
        'used',  u,
        'left',  greatest(wall_free_allowance() - u, 0))
      from (select wall_free_used(p_key) as u) s
    )
  end
$$;

revoke all on function wall_free_state(text, boolean) from public, anon, authenticated;
grant execute on function wall_free_state(text, boolean) to service_role;


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
  v_spend uuid;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  -- The gate, once per distinct campus this name has letters on — which is one.
  -- A name with nothing under it asks about every open campus instead, because
  -- `gated` and `free` are facts about the READER, and a signed in person
  -- opening an empty name must not be told they are counting down free reads.
  select coalesce(bool_or(wall_read_gate(v_me, x.slug)), false) into v_gate
    from (
      select distinct l.campus as slug
        from wall_letters l
       where l.target_handle = nh and l.status = 'live' and l.expires_at > now()
      union
      select c.slug
        from wall_campuses c
       where c.is_open
         and not exists (select 1 from wall_letters
                          where target_handle = nh and status = 'live' and expires_at > now())
    ) x;

  if v_gate then
    -- The rows exist to ration something this browser is no longer rationed on.
    perform wall_free_clear(v_key);
  elsif v_key is not null and wall_free_used(v_key) < wall_free_allowance() then
    -- ONE. The newest letter this browser has not already been handed, which is
    -- the one the sheet opens on.
    select l.id into v_spend
      from wall_letters l
     where l.target_handle = nh and l.status = 'live' and l.expires_at > now()
       and not wall_free_has(v_key, l.id)
     order by l.created_at desc
     limit 1;
    if v_spend is not null then perform wall_free_take(v_key, v_spend); end if;
  end if;

  -- One statement. The spend above is already visible to it, so the left join
  -- to wall_free_reads is what decides whether each body travels.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',       l.id,
           'handle',   l.target_handle,
           'body',     case when v_gate or f.letter_id is not null then l.body end,
           'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
           'chars',    char_length(l.body),
           'has_seal', l.sealed_line is not null,
           'campus',   l.campus,
           'at',       l.created_at,
           'expires',  l.expires_at,
           'hearts',   coalesce(hc.n, 0),
           'hearted',  mh.user_id is not null
         ) order by l.created_at desc), '[]'::jsonb),
         coalesce(bool_or(v_gate or f.letter_id is not null), false)
    into v_rows, v_open
    from wall_letters l
    left join wall_free_reads f
           on v_key is not null and f.token_key = v_key and f.letter_id = l.id
    left join lateral (select count(*)::int as n from wall_hearts h where h.letter_id = l.id) hc on true
    left join wall_hearts mh on mh.letter_id = l.id and mh.user_id = v_me
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();

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
  v_me    uuid := celestual_session_user(p_token);
  v_key   text := wall_free_key(p_token);
  l       wall_letters%rowtype;
  p       ig_profiles%rowtype;
  v_gate  boolean;
  v_open  boolean;
  v_mine  boolean;
  v_hearts int;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_gate := wall_read_gate(v_me, l.campus);
  if v_gate then perform wall_free_clear(v_key); end if;
  -- One letter, one read. This is the call the pager makes as somebody turns
  -- the stack, so this is where the second, third and fourth free reads go.
  v_open := v_gate or wall_free_take(v_key, l.id);

  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  select count(*)::int into v_hearts from wall_hearts h where h.letter_id = l.id;
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
      'hearts',   v_hearts,
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
end;
$$;

grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;

comment on function wall_letters_for(text, text) is
  '0049: every live letter to one handle. One gate check, hearts joined, and at most ONE free read spent per request rather than one per letter.';

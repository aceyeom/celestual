-- ─────────────────────────────────────────────────────────────────────────────
-- 0053: a letter to a first name.
--
-- The composer has asked for an Instagram handle since the wall was built,
-- and a handle is still the default. This migration lets a letter be
-- addressed to a first name or a nickname instead, the way the Unsent
-- Project addresses its letters: "for Sofia", with no @ under it, one disc on
-- the wall shared by every Sofia anybody wrote to.
--
-- ── the one rule everything else follows from ───────────────────────────────
-- A name letter is keyed by a string that can never be a handle. Its
-- `target_handle` is a tilde and the folded name: `~sofia`, `~sofiareyes`.
-- A handle matches `^[a-z0-9._]{3,30}$` and cannot carry a tilde, so every
-- comparison in the schema that reads `instagram_handle = target_handle`
-- stays correct by construction: a name letter can never be claimed, sealed
-- or emptied by a handle proof, because a first name is not one person's to
-- prove. The index groups on the same column it always has, and a name and a
-- handle of the same spelling are two discs, never one.
--
-- ── what is stored, and what is not ─────────────────────────────────────────
-- `target_kind` says which of the two a letter is. `target_name` is the name
-- as the writer typed it, case kept, so the wall can print "Sofia" and not
-- "sofia". NOTHING ELSE. The council that ruled this (docs/THE-COUNCIL.md)
-- was unanimous on one point: no handle is stored beside a name letter, not
-- in plain text and not as a hash. A hidden handle is a list of named people
-- who cannot find their own entry by the only key they own, it is the raw
-- material for the notification the wall promises never to send, and the tap
-- that takes a letter down could not reach it. The handle a writer might
-- know belongs on Main, typed as the ping's own target, where the writer
-- takes it themselves.
--
-- ── what a name letter can and cannot do ────────────────────────────────────
--   read      like any letter: eight free, then either proof (0044, 0045)
--   report    like any letter: one tap, off the wall, a person reads it after
--   claim     never. wall_claim, wall_remove_letter, wall_reveal_request and
--             wall_letter_seal answer `unverified` for a tilde key, unchanged
--   shut      only by the desk. wall_name_shut applies its desk_shut branch
--             to a name key and nothing else: one Sofia's takedown must never
--             shut every Sofia, and an opted out @sofia must not shut the
--             name either, because the two are not the same person
--   resolve   never. The browser must not peek the resolver for a name key,
--             or a letter to "Sofia" draws @sofia's face. The key's tilde is
--             what the client branches on (app/src/api/handles.js).
--
-- ── the shape ───────────────────────────────────────────────────────────────
--   wall_fold(text)         lower, accents folded, punctuation to spaces
--   wall_name_key(text)     '~' and the folded name with its spaces out
--   wall_name_clean(text)   the name as it will be printed, or null
--   wall_target_key(text)   a tilde string to a name key, anything else
--                           through celestual_norm. Every reader that took
--                           celestual_norm(p_handle) takes this now
--   wall_letters            + target_kind, + target_name, the handle check
--                           widened to admit the tilde key for kind = name
--   wall_index              + kind, + name, appended (0048's rule)
--   wall_write              a ten argument overload with p_kind and p_name;
--                           the eight argument one stays and calls it
--   wall_letters_for, wall_letter, wall_mine, celestual_desk_letters
--                           carry kind and name beside the handle
--   wall_name_shut          the guard above
--
-- Re-runnable: create or replace, add column if not exists, and the
-- constraints are dropped before they are added.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. folding a name ────────────────────────────────────────────────────────
-- No extension: a translate table over the accented letters a campus roster
-- actually carries, so the fold is the same on a bare PostgreSQL and on the
-- platform, and immutable, so the search (0054) can lean on it.
create or replace function wall_fold(p text)
returns text
language sql immutable set search_path = public as $$
  select btrim(regexp_replace(
           regexp_replace(
             lower(translate(btrim(coalesce(p, '')),
               'àáâãäåāăąçćčďđèéêëēėęěìíîïīįıñńňòóôõöøōőùúûüūůűýÿžźżšśğłřťţÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ',
               'aaaaaaaaacccddeeeeeeeeiiiiiiinnnoooooooouuuuuuuyyzzzssglrttaaaaaaceeeeiiiinoooooouuuuy')),
             '[^a-z0-9]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

create or replace function wall_name_key(p text)
returns text
language sql immutable set search_path = public as $$
  select case when k is null or char_length(k) < 2 then null else '~' || left(k, 40) end
    from (select nullif(regexp_replace(wall_fold(p), '[^a-z0-9]', '', 'g'), '')) s(k)
$$;

-- The name as it will stand on the wall: trimmed, one space between words,
-- two to thirty characters, at most three words, and none of the characters
-- that make a string a handle, a number or a link. Null when it is not a name.
create or replace function wall_name_clean(p text)
returns text
language sql immutable set search_path = public as $$
  select case
    when n is null then null
    when char_length(n) < 2 or char_length(n) > 30 then null
    when array_length(regexp_split_to_array(n, ' '), 1) > 3 then null
    when n ~ '[0-9@#$%^&*_=+<>{}\[\]|\\/:;"`~]' then null
    when n ~ '[[:cntrl:]]' then null
    when wall_name_key(n) is null then null
    else n end
  from (select nullif(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '')) s(n)
$$;

create or replace function wall_target_key(p text)
returns text
language sql immutable set search_path = public as $$
  select case when left(btrim(coalesce(p, '')), 1) = '~'
              then wall_name_key(substr(btrim(p), 2))
              else celestual_norm(p) end
$$;

-- ── 2. the two columns ───────────────────────────────────────────────────────
alter table wall_letters
  add column if not exists target_kind text not null default 'handle',
  add column if not exists target_name text;

alter table wall_letters drop constraint if exists wall_letters_handle_ck;
alter table wall_letters drop constraint if exists wall_letters_kind_ck;
alter table wall_letters drop constraint if exists wall_letters_name_ck;
alter table wall_letters add constraint wall_letters_kind_ck
  check (target_kind in ('handle', 'name'));
alter table wall_letters add constraint wall_letters_name_ck
  check ((target_kind = 'name') = (target_name is not null)
         and (target_name is null or char_length(target_name) between 2 and 30));
alter table wall_letters add constraint wall_letters_handle_ck
  check ((target_kind = 'handle' and target_handle ~ '^[a-z0-9._]{3,30}$')
      or (target_kind = 'name'   and target_handle ~ '^~[a-z0-9]{2,40}$'));

-- ── 3. the index ─────────────────────────────────────────────────────────────
-- Two columns appended, as 0048 requires of a replaced view. `name` is the
-- spelling on the newest letter under the key, so three letters to Sofia,
-- sofia and SOFIA stand under the one the wall saw last.
create or replace view wall_index
  with (security_invoker = false) as
  select l.target_handle,
         l.campus,
         count(*)::int                    as letters,
         max(l.created_at)                as last_at,
         (p.handle is not null)           as known,
         coalesce(p.display_name, '')     as display_name,
         coalesce(p.is_verified, false)   as is_verified,
         p.avatar_path,
         min(l.target_kind)               as kind,
         (array_agg(l.target_name order by l.created_at desc))[1] as name
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
    left join ig_profiles p on p.handle = l.target_handle and l.target_kind = 'handle'
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, l.campus, p.handle, p.display_name, p.is_verified, p.avatar_path;

grant select on wall_index to anon, authenticated;

comment on view wall_index is
  '0032, 0038, 0048, 0053: the public index. A key (a handle, or a tilde and a folded first name), a count, when the last letter arrived, the resolver''s name, badge and face path for a handle, and the kind and the name as written for a first name. No body, no author, no seal, ever.';

-- ── 4. writing ───────────────────────────────────────────────────────────────
-- The ten argument form holds the body. The eight argument form every caller
-- and every test already uses stays, and is a handle letter. Neither has a
-- default, so a call with eight keys matches one function and a call with ten
-- matches the other, and PostgREST is never asked to choose.
create or replace function wall_write(
  p_token   text,
  p_target  text,
  p_body    text,
  p_seal    text,
  p_source  text,
  p_campus  text,
  p_status  text,
  p_moderation jsonb,
  p_kind    text,
  p_name    text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_kind text := case when p_kind = 'name' then 'name' else 'handle' end;
  v_name text;
  nh   text;
  v_me uuid := celestual_session_user(p_token);
  v_id uuid;
  v_source text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source end;
  v_spent  jsonb;
  v_used   int;
  v_limit  int := wall_letter_allowance();
begin
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
  -- one, so it is not counted here either. Neither is anything at all while
  -- the desk's switch is off (0052).
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

  insert into wall_letters (target_handle, target_kind, target_name, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, v_kind, v_name, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status, 'handle', nh, 'kind', v_kind, 'name', v_name);
end;
$$;

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
language sql security definer set search_path = public, extensions as $$
  select wall_write(p_token, p_target, p_body, p_seal, p_source, p_campus, p_status, p_moderation, 'handle', null);
$$;

revoke all on function wall_write(text, text, text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb, text, text) to service_role;
revoke all on function wall_write(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb) to service_role;

-- ── 5. a name that has come off ──────────────────────────────────────────────
-- The suppression branch is a handle's: a name key has no hash on the opt out
-- list and must not be looked up there. The letters branch, for a name key,
-- is the desk's shutting of the name and nothing else: a report upheld on one
-- letter to "Sofia" and a claim (which a name cannot carry) do not empty a
-- first name that forty people share.
create or replace function wall_name_shut(p_handle text, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select k.k is not null and (
         (left(k.k, 1) <> '~' and exists (
            select 1 from celestual_suppressions s
             where s.handle_hash = celestual_hash_handle(k.k)))
      or exists (
           select 1 from wall_letters l
            where l.target_handle = k.k and l.campus = p_campus
              and l.status = 'removed'
              and case when left(k.k, 1) = '~'
                       then l.moderation #>> '{desk,via}' = 'desk_shut'
                       else (exists (select 1 from wall_claims c where c.letter_id = l.id)
                          or exists (select 1 from wall_reports r where r.letter_id = l.id and r.status = 'upheld')
                          or l.moderation #>> '{desk,via}' in ('desk_shut', 'optout')) end))
    from (select wall_target_key(p_handle) as k) k
$$;

-- ── 6. reading ───────────────────────────────────────────────────────────────
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
    -- the spelling on the newest letter is the name the wall prints
    if v_name is null then v_name := l.target_name; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'kind',     l.target_kind,
      'name',     l.target_name,
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

  -- the resolver is asked about a handle and never about a name key
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

  -- a tilde key never equals a verified handle, so a name letter is nobody's
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
    'body', l.body,
    'status', l.status,
    'at', l.created_at,
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

-- ── 7. the desk ──────────────────────────────────────────────────────────────
-- The letters screen carries the kind and the name, and its search reads the
-- name as written as well as the key, so "Sofia" finds the letters to her.
create or replace function celestual_desk_letters(
  p_status text default null,
  p_query  text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s   text := nullif(btrim(coalesce(p_status, '')), '');
  v_q   text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_flag boolean := false;
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('pending', 'live', 'rejected', 'removed', 'flagged') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;
  if v_s = 'flagged' then v_flag := true; v_s := 'live'; end if;
  if v_q is not null then v_q := lower(regexp_replace(v_q, '^@', '')); end if;

  select count(*) into v_n
    from wall_letters l
   where (v_s is null or l.status = v_s)
     and (not v_flag or (l.moderation->>'verdict' = 'review' and not (l.moderation ? 'desk')))
     and (v_q is null or l.target_handle like '%' || v_q || '%'
          or lower(coalesce(l.target_name, '')) like '%' || v_q || '%'
          or lower(l.body) like '%' || v_q || '%');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'target_handle', l.target_handle,
    'target_kind', l.target_kind,
    'target_name', l.target_name,
    'body', l.body,
    'sealed_line', l.sealed_line,
    'status', l.status,
    'flagged', (l.status = 'live' and l.moderation->>'verdict' = 'review' and not (l.moderation ? 'desk')),
    'moderation', l.moderation,
    'campus', l.campus,
    'source_code', l.source_code,
    'created_at', l.created_at,
    'expires_at', l.expires_at,
    'author_id', l.author_id,
    'author_handle', u.instagram_handle,
    'author_campus', u.edu_domain,
    'claims',  (select count(*)::int from wall_claims c where c.letter_id = l.id),
    'reports', (select count(*)::int from wall_reports r where r.letter_id = l.id),
    'reports_open', (select count(*)::int from wall_reports r
                      where r.letter_id = l.id and r.status = 'open'),
    'ask', (select rq.status from wall_reveal_requests rq where rq.letter_id = l.id)
  ) order by l.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from wall_letters l2
     where (v_s is null or l2.status = v_s)
       and (not v_flag or (l2.moderation->>'verdict' = 'review' and not (l2.moderation ? 'desk')))
       and (v_q is null or l2.target_handle like '%' || v_q || '%'
            or lower(coalesce(l2.target_name, '')) like '%' || v_q || '%'
            or lower(l2.body) like '%' || v_q || '%')
     order by l2.created_at desc
     limit v_lim offset v_off
  ) l
  left join celestual_users u on u.id = l.author_id;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

comment on function wall_write(text, text, text, text, text, text, text, jsonb, text, text) is
  '0053: the write, with a kind. A handle letter as before, or a letter to a first name keyed by a tilde and the folded name, with the name as written kept to print. No handle is ever stored beside a name letter.';
comment on function wall_name_key(text) is
  '0053: a first name as a key that can never be a handle: a tilde, then the folded name with its spaces out.';
comment on function wall_target_key(text) is
  '0053: what every reader normalises a target through. A tilde string is a name key; anything else goes through celestual_norm.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 0055: the letter has a look, and a name can be anything.
--
-- Two things, and both are the composer's.
--
-- ── a name of any kind ──────────────────────────────────────────────────────
-- 0053 admitted a first name or a nickname: two to thirty characters, three
-- words, and no digit, because a digit made a string look like a handle, a
-- number or a link. The composer asks for an Instagram handle by default and,
-- as its one other choice, whatever the writer calls the person: a first
-- name, a nickname, one letter, a number, the girl on the 51B. So the name is
-- widened to one to thirty characters and five words, digits and the letters
-- of any alphabet are admitted, and only the characters that make a string a
-- handle, a link or a shell command stay out. The key stays what it was: a
-- tilde and the folded name, `~j`, `~51b`, `~thegirlonthe51b`, a string no
-- handle can be, shared by everybody written to under that spelling. The
-- name still goes through the list at the keyboard and on the server, and
-- the classifier is still told the addressee: a name that is a body, a
-- schedule or a room number is caught where the words would be.
--
-- The fold admits any letter (`[[:alnum:]]` rather than `[a-z0-9]`), so a
-- name written in another alphabet keeps its key rather than folding to
-- nothing. On a database whose collation is C that class is ASCII only, which
-- is what the test cluster runs; on the platform it is the letters of the
-- language.
--
-- ── the look ────────────────────────────────────────────────────────────────
-- A letter can choose its paper: one of a handful of looks the composer
-- draws (the night, the y2k gloss, the nokia screen, a receipt, a notebook
-- page, a terminal, candy, gold), a colour for it, and a face for the type.
-- What the row keeps is three slugs, `{theme, tint, face}`, in one jsonb
-- column, `look`, null for the plain paper. The catalogue of what a slug
-- draws lives in the browser (app/src/wall/looks.js): a new look is a client
-- change and not a migration, and a slug this build does not know draws the
-- plain paper. `wall_look_clean` is the whole of the schema's opinion: an
-- object, three keys, each a short lower case slug, and nothing else. The
-- constraint holds every row to what it answers, so a look can never be a
-- string, a colour, a URL or a fourth key.
--
-- On the wall the newest letter's look under a key is the key's look
-- (`wall_index.look`, appended, 0048's rule), so a name's disc carries the
-- paper of the letter that arrived last; every read of a letter carries its
-- own. What this changes about what the wall discloses: nothing. A look is a
-- choice from a menu that every writer shares, it is structured and not
-- written, the list and the classifier still read every word, a takedown
-- takes it with the letter, and the desk sees the slug beside the row.
-- docs/WALL-FEATURES.md records the ruling.
--
-- ── the shape ───────────────────────────────────────────────────────────────
--   wall_fold, wall_name_key, wall_name_clean    widened, above
--   wall_look_clean(jsonb)                       the one opinion on a look
--   wall_letters                                 + look, the two checks widened
--   wall_index                                   + look, appended
--   wall_write                                   an eleven argument overload
--                                                with p_look; the ten and the
--                                                eight argument ones stay and
--                                                call it
--   wall_letters_for, wall_letter, wall_mine, wall_search,
--   celestual_desk_letters                       carry look
--
-- Re-runnable: create or replace, add column if not exists, and the
-- constraints are dropped before they are added.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. a name of any kind ────────────────────────────────────────────────────
create or replace function wall_fold(p text)
returns text
language sql immutable set search_path = public as $$
  select btrim(regexp_replace(
           regexp_replace(
             lower(translate(btrim(coalesce(p, '')),
               'àáâãäåāăąçćčďđèéêëēėęěìíîïīįıñńňòóôõöøōőùúûüūůűýÿžźżšśğłřťţÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ',
               'aaaaaaaaacccddeeeeeeeeiiiiiiinnnoooooooouuuuuuuyyzzzssglrttaaaaaaceeeeiiiinoooooouuuuy')),
             '[^[:alnum:]]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

create or replace function wall_name_key(p text)
returns text
language sql immutable set search_path = public as $$
  select case when k is null or char_length(k) < 1 then null else '~' || left(k, 40) end
    from (select nullif(regexp_replace(wall_fold(p), '[^[:alnum:]]', '', 'g'), '')) s(k)
$$;

-- The name as it will stand on the wall: trimmed, one space between words,
-- one to thirty characters, at most five words, and none of the characters
-- that make a string a handle, a link or a command. Null when it is not one.
create or replace function wall_name_clean(p text)
returns text
language sql immutable set search_path = public as $$
  select case
    when n is null then null
    when char_length(n) < 1 or char_length(n) > 30 then null
    when array_length(regexp_split_to_array(n, ' '), 1) > 5 then null
    when n ~ '[@#$%^&*_=+<>{}\[\]|\\/:;"`~]' then null
    when n ~ '[[:cntrl:]]' then null
    when wall_name_key(n) is null then null
    else n end
  from (select nullif(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '')) s(n)
$$;

alter table wall_letters drop constraint if exists wall_letters_handle_ck;
alter table wall_letters drop constraint if exists wall_letters_name_ck;
alter table wall_letters add constraint wall_letters_name_ck
  check ((target_kind = 'name') = (target_name is not null)
         and (target_name is null or char_length(target_name) between 1 and 30));
alter table wall_letters add constraint wall_letters_handle_ck
  check ((target_kind = 'handle' and target_handle ~ '^[a-z0-9._]{3,30}$')
      or (target_kind = 'name'   and target_handle ~ '^~[[:alnum:]]{1,40}$'));

-- ── 2. the look ──────────────────────────────────────────────────────────────
-- Three keys, each a short lower case slug, or nothing. `paper` is the plain
-- paper and is not a look, so a browser that sends it stores null. Anything
-- else the browser sends, a fourth key, a colour, a sentence, is dropped
-- here and never reaches a row.
create or replace function wall_look_clean(p jsonb)
returns jsonb
language sql immutable set search_path = public as $$
  select case
    when p is null or jsonb_typeof(p) <> 'object' then null
    else nullif(jsonb_strip_nulls(jsonb_build_object(
      'theme', case when p->>'theme' ~ '^[a-z][a-z0-9-]{0,23}$' and p->>'theme' <> 'paper' then p->>'theme' end,
      'tint',  case when p->>'tint'  ~ '^[a-z][a-z0-9-]{0,23}$' then p->>'tint' end,
      'face',  case when p->>'face'  ~ '^[a-z][a-z0-9-]{0,23}$' then p->>'face' end)), '{}'::jsonb)
    end
$$;

alter table wall_letters add column if not exists look jsonb;
alter table wall_letters drop constraint if exists wall_letters_look_ck;
-- `is not distinct from`, not `=`: a look that cleans to nothing, a bare
-- string say, would compare equal to null as null, and a check that answers
-- null passes. This one answers false.
alter table wall_letters add constraint wall_letters_look_ck
  check (look is not distinct from wall_look_clean(look));

-- ── 3. the index ─────────────────────────────────────────────────────────────
-- One column appended, as 0048 requires of a replaced view: the look on the
-- newest letter under the key, which is the paper the name's disc draws.
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
         (array_agg(l.target_name order by l.created_at desc))[1] as name,
         (array_agg(l.look order by l.created_at desc))[1]        as look
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
    left join ig_profiles p on p.handle = l.target_handle and l.target_kind = 'handle'
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, l.campus, p.handle, p.display_name, p.is_verified, p.avatar_path;

grant select on wall_index to anon, authenticated;

comment on view wall_index is
  '0032, 0038, 0048, 0053, 0055: the public index. A key (a handle, or a tilde and a folded name), a count, when the last letter arrived, the resolver''s name, badge and face path for a handle, the kind and the name as written for a name, and the look of the newest letter under it. No body, no author, no seal, ever.';

-- ── 4. writing ───────────────────────────────────────────────────────────────
-- The eleven argument form holds the body. The ten argument form (0053) and
-- the eight argument form (0032) stay, and call it, so every caller and every
-- test written against either still matches exactly one function.
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
  p_name    text,
  p_look    jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_kind text := case when p_kind = 'name' then 'name' else 'handle' end;
  v_name text;
  v_look jsonb := wall_look_clean(p_look);
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
                            source_code, status, moderation, look)
  values (nh, v_kind, v_name, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation, v_look)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status, 'handle', nh,
                            'kind', v_kind, 'name', v_name, 'look', v_look);
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
  p_moderation jsonb,
  p_kind    text,
  p_name    text
) returns jsonb
language sql security definer set search_path = public, extensions as $$
  select wall_write(p_token, p_target, p_body, p_seal, p_source, p_campus, p_status, p_moderation, p_kind, p_name, null::jsonb);
$$;

revoke all on function wall_write(text, text, text, text, text, text, text, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb, text, text, jsonb) to service_role;
revoke all on function wall_write(text, text, text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb, text, text) to service_role;

-- ── 5. reading ───────────────────────────────────────────────────────────────
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
      'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
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
    'look', l.look,
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

-- ── 6. the search ────────────────────────────────────────────────────────────
-- 0054's search, with the look riding on every row it answers, off the
-- index, so a row in the search draws the same disc the wall draws.
create or replace function wall_search(p_query text)
returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with q as (
    select celestual_norm(p_query)                                              as h,
           nullif(wall_fold(p_query), '')                                       as f,
           regexp_replace(coalesce(celestual_norm(p_query), ''), '[._]', '', 'g') as hd,
           char_length(coalesce(nullif(wall_fold(p_query), ''), celestual_norm(p_query), '')) as n
  ),
  rows as (
    select i.target_handle, i.campus, i.letters, i.last_at, i.known, i.display_name,
           i.is_verified, i.avatar_path, i.kind, i.name, i.look,
           q.h, q.f, q.hd, q.n,
           regexp_replace(i.target_handle, '[._~]', '', 'g')                         as ihd,
           wall_fold(case when i.kind = 'name' then i.name else i.display_name end)  as iname
      from wall_index i, q
     where q.h is not null or q.f is not null
  ),
  scored as (
    select r.*,
      case
        when r.h is not null and r.target_handle = r.h                                  then 0
        when r.f is not null and r.iname <> '' and r.iname = r.f                        then 0
        when r.h is not null and left(r.target_handle, char_length(r.h)) = r.h          then 1
        when r.f is not null and r.iname <> ''
             and (left(r.iname, char_length(r.f)) = r.f or r.iname like '% ' || r.f || '%') then 1
        when r.h is not null and strpos(r.target_handle, r.h) > 0                       then 2
        when r.hd <> '' and strpos(r.ihd, r.hd) > 0                                     then 2
        when r.f is not null and r.iname <> '' and strpos(r.iname, r.f) > 0             then 2
        when r.n >= 3 and r.f is not null and r.iname <> ''
             and word_similarity(r.f, r.iname) >= 0.45                                  then 3
        when r.n >= 3 and r.hd <> '' and similarity(r.hd, r.ihd) >= 0.35                then 3
        when r.n >= 3 and r.f is not null and r.iname <> '' and exists (
               select 1
                 from unnest(string_to_array(r.iname, ' ')) w(word),
                      unnest(string_to_array(r.f, ' '))     v(typed)
                where char_length(v.typed) >= 3
                  and char_length(dmetaphone(v.typed)) >= 2
                  and dmetaphone(v.typed) = dmetaphone(w.word))                        then 3
        else null end as rank,
      greatest(
        case when r.f is not null and r.iname <> '' then word_similarity(r.f, r.iname) else 0 end,
        case when r.hd <> '' then similarity(r.hd, r.ihd) else 0 end) as score
    from rows r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'handle',       s.target_handle,
           'letters',      s.letters,
           'last_at',      s.last_at,
           'campus',       s.campus,
           'known',        s.known,
           'display_name', case when s.known then s.display_name end,
           'is_verified',  s.is_verified,
           'avatar_path',  s.avatar_path,
           'kind',         s.kind,
           'name',         s.name,
           'look',         s.look)
         order by s.rank, s.score desc, s.letters desc, s.last_at desc, char_length(s.target_handle)), '[]'::jsonb)
    from (
      select * from scored
       where rank is not null
       order by rank, score desc, letters desc, last_at desc, char_length(target_handle)
       limit 12
    ) s;
$$;

revoke all on function wall_search(text) from public;
grant execute on function wall_search(text) to anon, authenticated, service_role;

-- ── 7. the desk ──────────────────────────────────────────────────────────────
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
    'look', l.look,
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

comment on function wall_write(text, text, text, text, text, text, text, jsonb, text, text, jsonb) is
  '0055: the write, with a kind, a name and a look. The look is cleaned to three slugs or null before it is stored; the catalogue of what a slug draws is the browser''s.';
comment on function wall_look_clean(jsonb) is
  '0055: the schema''s one opinion on a look: an object of up to three short lower case slugs, theme, tint and face, or null. `paper` is the plain paper and stores as null.';
comment on function wall_name_clean(text) is
  '0055: a name as it will be printed: one to thirty characters, five words, any letter or digit, none of the characters that make a string a handle, a link or a command. Null when it is not one.';
comment on column wall_letters.look is
  '0055: {theme, tint, face}, each a slug, or null for the plain paper. Held to wall_look_clean by wall_letters_look_ck.';

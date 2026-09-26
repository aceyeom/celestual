-- ─────────────────────────────────────────────────────────────────────────────
-- 0063: one wall.
--
-- The owner's rulings of 25 September (docs/ONE-WALL.md). `/berkeley` is gone
-- and every letter is on the wall at `/`. A letter's `campus` is no longer
-- which wall it stands on: it is the school it carries, and on an @-note the
-- school the writer proved.
--
-- ── what changes for a writer ───────────────────────────────────────────────
--   an @-note     a letter to an Instagram handle. Needs a verified campus
--                 address at a school that takes @-notes (`handle_notes`,
--                 Berkeley alone today), or a pass. The school is the
--                 campus, and the letter carries `verified`, so the wall
--                 draws the school's sticker on it.
--   a name note   a letter to a name. Needs no proof. The edge function reads
--                 it before it is written and writes it `live` on a pass,
--                 `pending` for the desk on a review, `rejected` on a
--                 reject. The writer picks a campus or none. Never verified.
--   the dear line `salutation`, up to forty characters, the writer's to
--                 edit. Null draws `dear {name}`.
--   the nonce     a draft carries one, and the same (author, nonce) is one
--                 letter however many tabs send it.
--
-- ── the shape ───────────────────────────────────────────────────────────────
--   1  wall_campuses        + short, + handle_notes; celestual_campus_for_domain
--                           finds or opens the campus of a .edu domain
--   2  wall_letters         + verified, + salutation, + nonce; the verified
--                           backfill; ember's letters move to amber
--   3  wall_index_all, wall_pulse_all(), wall_campuses_open()
--   4  the four reads       + verified, + salutation, + school; wall_search
--                           reads the one wall
--   5  sessions             slide to a year on use; celestual_session_user_or_new
--   6  wall_write           the v2 overload, its replay and the name throttle
--   7  wall_owner_remove, wall_owner_restore: the claimed owner takes a
--                           letter down with no claim filed, and puts it back
--   8  wall_cards           land on `/`
--   9  the private note     a ping's card is as long as a letter and is read
--                           by the same list the letter's body is
--
-- Backward compatible: every old signature, the `wall_index` view and the
-- behaviour of the old writes stand, and every read answers a superset of
-- what it answered. Re-runnable: create or replace, if not exists, and every
-- constraint dropped before it is added.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the campuses ──────────────────────────────────────────────────────────
-- `short` is the word on a sticker ('Cal'). `handle_notes` is whether a
-- verified address there may write to an Instagram handle: the owner's ruling
-- of 25 September opens it at Berkeley alone. Any .edu still proves a person
-- (reading, alerts), and a campus is still opened for it.
alter table wall_campuses add column if not exists short text;
alter table wall_campuses add column if not exists handle_notes boolean not null default false;
alter table wall_campuses drop constraint if exists wall_campuses_short_ck;
alter table wall_campuses add constraint wall_campuses_short_ck
  check (short is null or char_length(short) between 1 and 16);

update wall_campuses set short = coalesce(short, 'Cal'), handle_notes = true where slug = 'berkeley';

comment on column wall_campuses.short is
  '0063: the word on the school''s sticker, ''Cal''. Null draws the name.';
comment on column wall_campuses.handle_notes is
  '0063: a verified address here may write to an Instagram handle. Berkeley alone on 25 September.';

-- The registrable label of a .edu domain: `cs.stanford.edu` is `stanford`.
-- Every .edu is registered one level under the suffix, so it is the label
-- before `.edu` and never a guess from a list.
create or replace function wall_campus_label(p_domain text)
returns text
language sql immutable set search_path = public as $$
  select case when d ~ '^[a-z0-9.-]+\.edu$'
              then nullif(btrim((string_to_array(d, '.'))[array_length(string_to_array(d, '.'), 1) - 1], '-'), '')
         end
    from (select lower(btrim(coalesce(p_domain, ''))) as d) s
$$;

-- What a domain's campus is, or would be, without opening one. The link
-- action answers with it before the address is proved, so nothing is written
-- for an address nobody has shown they read.
create or replace function celestual_campus_peek(p_domain text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d  text := lower(btrim(coalesce(p_domain, '')));
  c  wall_campuses%rowtype;
  lb text;
begin
  if d !~ '^[a-z0-9.-]+\.edu$' then return null; end if;
  select * into c from wall_campuses w
   where w.edu_domain is not null and (d = w.edu_domain or d like '%.' || w.edu_domain)
   order by char_length(w.edu_domain) desc limit 1;
  if found then
    return jsonb_build_object('slug', c.slug, 'name', c.name, 'short', coalesce(c.short, c.name),
                              'domain', c.edu_domain, 'handle_notes', c.handle_notes, 'known', true);
  end if;
  lb := wall_campus_label(d);
  if lb is null then return null; end if;
  return jsonb_build_object(
    'slug', case when char_length(lb) >= 2 then left(lb, 40) else lb || '-edu' end,
    'name', case when char_length(lb) <= 4 then upper(lb) else initcap(lb) end,
    'short', case when char_length(lb) <= 4 then upper(lb) else initcap(lb) end,
    'domain', lb || '.edu', 'handle_notes', false, 'known', false);
end;
$$;

-- The campus a proved .edu domain belongs to: the domain's own, or the one
-- it is a subdomain of, and otherwise a new open campus keyed on the
-- registrable domain, its slug the label (`stanford`, then `stanford-2`
-- should that be taken) and its name the label. Null for anything that is
-- not a .edu domain: a passed gmail address opens no campus.
--
-- Only ever called with an address somebody has proved (the link's confirm,
-- a bind, an @-note's writer), so a campus is never opened for a domain
-- nobody reads mail at.
create or replace function celestual_campus_for_domain(p_domain text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  d      text := lower(btrim(coalesce(p_domain, '')));
  v_hit  text;
  v_lb   text;
  v_base text;
  v_name text;
  v_slug text;
  n      int := 1;
begin
  if d !~ '^[a-z0-9.-]+\.edu$' then return null; end if;
  select slug into v_hit from wall_campuses w
   where w.edu_domain is not null and (d = w.edu_domain or d like '%.' || w.edu_domain)
   order by char_length(w.edu_domain) desc limit 1;
  if v_hit is not null then return v_hit; end if;

  v_lb := wall_campus_label(d);
  if v_lb is null then return null; end if;
  v_base := case when char_length(v_lb) >= 2 then left(v_lb, 36) else v_lb || '-edu' end;
  v_name := case when char_length(v_lb) <= 4 then upper(v_lb) else initcap(v_lb) end;

  while n <= 20 loop
    v_slug := case when n = 1 then v_base else v_base || '-' || n end;
    insert into wall_campuses (slug, name, edu_domain, is_open)
    values (v_slug, v_name, v_lb || '.edu', true)
    on conflict do nothing
    returning slug into v_hit;
    if v_hit is not null then return v_hit; end if;
    -- the domain opened by somebody else in the same moment, or the slug taken
    select slug into v_hit from wall_campuses where edu_domain = v_lb || '.edu';
    if v_hit is not null then return v_hit; end if;
    n := n + 1;
  end loop;
  return null;
end;
$$;

revoke all on function wall_campus_label(text)           from public, anon, authenticated;
revoke all on function celestual_campus_peek(text)       from public, anon, authenticated;
revoke all on function celestual_campus_for_domain(text) from public, anon, authenticated;
grant execute on function wall_campus_label(text)           to service_role;
grant execute on function celestual_campus_peek(text)       to service_role;
grant execute on function celestual_campus_for_domain(text) to service_role;

comment on function celestual_campus_for_domain(text) is
  '0063: the campus of a proved .edu domain: its own or its parent''s, else a new open campus on the registrable domain, slugged by its label. Null for a domain that is not .edu.';

-- ── 2. the letter's three new columns ────────────────────────────────────────
-- `verified`: the letter was written by a person proved at a school that
-- takes @-notes, and the wall draws that school's sticker on it.
-- `salutation`: the dear line as the writer set it, or null.
-- `nonce`: the draft's own id, so a draft posted from two tabs is one letter.
alter table wall_letters add column if not exists verified   boolean not null default false;
alter table wall_letters add column if not exists salutation text;
alter table wall_letters add column if not exists nonce      text;

-- The dear line as it will be printed: one line, trimmed, one space between
-- words, no control characters, one to forty characters. Null for nothing,
-- and null for anything longer, which the write refuses rather than cuts.
create or replace function wall_salutation_clean(p text)
returns text
language sql immutable set search_path = public as $$
  select case when s is null or char_length(s) > 40 then null else s end
    from (select nullif(btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]]', ' ', 'g'),
                                             '\s+', ' ', 'g')), '')) x(s)
$$;
revoke all on function wall_salutation_clean(text) from public, anon, authenticated;
grant execute on function wall_salutation_clean(text) to service_role;

alter table wall_letters drop constraint if exists wall_letters_salutation_ck;
alter table wall_letters add constraint wall_letters_salutation_ck
  check (salutation is null or salutation = wall_salutation_clean(salutation));
alter table wall_letters drop constraint if exists wall_letters_nonce_ck;
alter table wall_letters add constraint wall_letters_nonce_ck
  check (nonce is null or nonce ~ '^[A-Za-z0-9_-]{8,64}$');
create unique index if not exists wall_letters_author_nonce_uidx
  on wall_letters (author_id, nonce) where nonce is not null;

comment on column wall_letters.verified is
  '0063: written by a person proved at a school that takes @-notes. The wall draws the school''s sticker on it.';
comment on column wall_letters.salutation is
  '0063: the dear line as the writer set it, up to forty characters. Null draws dear {name}.';
comment on column wall_letters.nonce is
  '0063: the draft''s id. (author_id, nonce) is unique, so one draft is one letter.';

-- Every @-note already up that was written from a campus was written through
-- the campus gate, which is a verified campus address: they carry the sticker.
-- A name note never does, and nothing on the wall at the root was proved at a
-- school. Once: a second run finds nothing false that should be true, and a
-- letter written after this carries whatever its write gave it.
update wall_letters set verified = true
 where target_kind = 'handle' and campus <> 'global' and not verified;

-- ── ember goes to amber ──────────────────────────────────────────────────────
-- Ember left the colours on 25 September, so the composer's panel is two even
-- rows of six (design/DESIGN.md 2.5), and the browser already draws an ember
-- letter as amber. The rows follow, as 0061 moved the five retired prints,
-- and the move is kept the way 0061 kept its own: every ember look copied
-- with its id, once, before it is touched. To put ember back:
--
--   update wall_letters l set look = b.look
--     from wall_look_backup_0063 b where b.id = l.id;
create table if not exists wall_look_backup_0063 (
  id       uuid primary key,
  look     jsonb,
  saved_at timestamptz not null default now()
);
alter table wall_look_backup_0063 enable row level security;
revoke all on wall_look_backup_0063 from public, anon, authenticated;
comment on table wall_look_backup_0063 is
  '0063: the look of every letter lit in ember, as it was before it moved to amber, so the move can be undone.';

insert into wall_look_backup_0063 (id, look)
select id, look from wall_letters where look->>'tint' = 'ember'
on conflict (id) do nothing;

update wall_letters set look = '{"tint":"amber"}'::jsonb where look->>'tint' = 'ember';

-- ── 3. the one wall's index ──────────────────────────────────────────────────
-- wall_index's columns, grouped by the key alone, so a name written to from
-- two schools is one disc. `campus`, `verified` and `school` are the newest
-- letter's, as `name` and `look` already are (0053, 0055). `school` is the
-- campus's name, and null on the wall at the root, which is no school.
-- `wall_index` stands as it was, for a tab still on the old build.
create or replace view wall_index_all
  with (security_invoker = false) as
  select l.target_handle,
         (array_agg(l.campus order by l.created_at desc))[1]      as campus,
         count(*)::int                                            as letters,
         max(l.created_at)                                        as last_at,
         (p.handle is not null)                                   as known,
         coalesce(p.display_name, '')                             as display_name,
         coalesce(p.is_verified, false)                           as is_verified,
         p.avatar_path,
         min(l.target_kind)                                       as kind,
         (array_agg(l.target_name order by l.created_at desc))[1] as name,
         (array_agg(l.look order by l.created_at desc))[1]        as look,
         (array_agg(l.verified order by l.created_at desc))[1]    as verified,
         (array_agg(case when c.edu_domain is not null then c.name end
                    order by l.created_at desc))[1]               as school
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
    left join ig_profiles p on p.handle = l.target_handle and l.target_kind = 'handle'
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, p.handle, p.display_name, p.is_verified, p.avatar_path;

grant select on wall_index_all to anon, authenticated;

comment on view wall_index_all is
  '0063: the one wall''s index. wall_index''s columns grouped by the key alone, with the newest letter''s campus, verified and school. No body, no author, no seal, ever.';

-- wall_pulse's answer, for the one wall.
create or replace function wall_pulse_all()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok',      true,
    'campus',  null,
    'name',    'celestual',
    'open',    exists (select 1 from wall_campuses where is_open),
    'names',   (select count(*)                    from wall_index_all),
    'letters', (select coalesce(sum(letters), 0)   from wall_index_all),
    'last_at', (select max(last_at)                from wall_index_all)
  );
$$;
revoke all on function wall_pulse_all() from public;
grant execute on function wall_pulse_all() to anon, authenticated, service_role;

-- The open campuses, the wall at the root excepted, for the name note's
-- picker. The schools that take @-notes first.
create or replace function wall_campuses_open()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', c.slug, 'name', c.name, 'short', coalesce(c.short, c.name), 'domain', c.edu_domain)
         order by c.handle_notes desc, lower(c.name), c.slug), '[]'::jsonb)
    from wall_campuses c
   where c.is_open and c.edu_domain is not null;
$$;
revoke all on function wall_campuses_open() from public;
grant execute on function wall_campuses_open() to anon, authenticated, service_role;

comment on function wall_pulse_all() is
  '0063: wall_pulse''s answer for every campus at once: how many names and letters stand on the one wall.';
comment on function wall_campuses_open() is
  '0063: the open campuses, the root wall excepted, as [{slug, name, short, domain}], for the name note''s campus picker.';

-- ── 4. the four reads ────────────────────────────────────────────────────────
-- Each is its latest definition (0059, and wall_search 0055) word for word,
-- with three keys on every letter: `verified`, `salutation` and `school`.
-- wall_mine already carried `status` and already listed a held letter, which
-- is how a writer sees a name note being read; it gains `campus` as well.
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
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me),
      'verified',   l.verified,
      'salutation', l.salutation,
      'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
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
    end,
    'campus',     l.campus,
    'verified',   l.verified,
    'salutation', l.salutation,
    'school',     (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null)
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

-- The search reads the one wall's index, so a key written to from two
-- schools is one answer, and every answer carries the newest letter's
-- `verified`, `school` and dear line.
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
           i.is_verified, i.avatar_path, i.kind, i.name, i.look, i.verified, i.school,
           q.h, q.f, q.hd, q.n,
           regexp_replace(i.target_handle, '[._~]', '', 'g')                         as ihd,
           wall_fold(case when i.kind = 'name' then i.name else i.display_name end)  as iname
      from wall_index_all i, q
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
           'look',         s.look,
           'verified',     s.verified,
           'school',       s.school,
           'salutation',   (select l.salutation from wall_letters l
                             where l.target_handle = s.target_handle
                               and l.status = 'live' and l.expires_at > now()
                             order by l.created_at desc limit 1))
         order by s.rank, s.score desc, s.letters desc, s.last_at desc, char_length(s.target_handle)), '[]'::jsonb)
    from (
      select * from scored
       where rank is not null
       order by rank, score desc, letters desc, last_at desc, char_length(target_handle)
       limit 12
    ) s;
$$;

-- `create or replace` keeps the grants; restated so this file stands on its own.
revoke all on function wall_letters_for(text, text) from public;
revoke all on function wall_letter(text, uuid)      from public;
revoke all on function wall_mine(text)              from public;
revoke all on function wall_search(text)            from public;
grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;
grant execute on function wall_mine(text)              to anon, authenticated;
grant execute on function wall_search(text)            to anon, authenticated, service_role;

-- ── 5. sessions ──────────────────────────────────────────────────────────────
-- A device is verified once and kept (docs/ONE-WALL.md): a session slides to a
-- year on use. The write that moves it happens once a month at most, when
-- under 335 days are left, so a busy session is not rewritten on every read.
-- A bind opens a session at a year for the same reason.
create or replace function celestual_session_bind(p_user uuid, p_token_hash text)
returns void
language sql security definer set search_path = public as $$
  insert into celestual_sessions (token_hash, user_id, expires_at)
  values (lower(p_token_hash), p_user, now() + interval '365 days')
  on conflict (token_hash) do update
    set user_id      = excluded.user_id,
        last_seen_at = now(),
        expires_at   = excluded.expires_at;
$$;

create or replace function celestual_session_user(p_token text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_user uuid;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then return null; end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  update celestual_sessions
     set last_seen_at = now(),
         expires_at   = case when expires_at < now() + interval '335 days'
                             then now() + interval '365 days' else expires_at end
   where token_hash = v_hash and expires_at > now()
   returning user_id into v_user;
  if v_user is null then return null; end if;
  return celestual_user_live(v_user);
end;
$$;

-- SERVICE ROLE ONLY. The user of a device, and for a device the product has
-- never seen, a bare row and a session on it: a name note needs no proof, but
-- it needs an author, and the writer's own list (wall_mine) needs to find it.
-- A bare row proves nothing (celestual_user_proved is false on it), so it
-- opens no reading and writes no @-note.
create or replace function celestual_session_user_or_new(p_token text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_me   uuid;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then return null; end if;
  v_me := celestual_session_user(p_token);
  if v_me is not null then return v_me; end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  -- two tabs of one new device in the same moment make one row
  perform pg_advisory_xact_lock(hashtextextended(v_hash, 63));
  v_me := celestual_session_user(p_token);
  if v_me is not null then return v_me; end if;
  insert into celestual_users default values returning id into v_me;
  perform celestual_session_bind(v_me, v_hash);
  return v_me;
end;
$$;

revoke all on function celestual_session_bind(uuid, text)      from public, anon, authenticated;
revoke all on function celestual_session_user(text)            from public, anon, authenticated;
revoke all on function celestual_session_user_or_new(text)     from public, anon, authenticated;
grant execute on function celestual_session_user_or_new(text)  to service_role;

comment on function celestual_session_user(text) is
  '0030, 0063: the raw token in, the live user out. Slides the session to a year when under 335 days are left.';
comment on function celestual_session_user_or_new(text) is
  '0063: service role only. The device''s user, or a bare row and a session for a device never seen. For name notes, which need an author and no proof.';

-- ── 6. writing, version 2 ────────────────────────────────────────────────────
-- A name, whatever its campus, is shut if it came off anywhere: there is one
-- wall now, and a name the desk took off at /berkeley must not come back on
-- it through the root.
create or replace function wall_name_shut_any(p_handle text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wall_campuses c where wall_name_shut(p_handle, c.slug))
$$;
revoke all on function wall_name_shut_any(text) from public, anon, authenticated;
grant execute on function wall_name_shut_any(text) to service_role;

-- The answer a v2 write gives about a letter, said in one place so a replay
-- answers exactly what the first send did.
create or replace function wall_letter_answer(p_letter uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true, 'id', l.id, 'status', l.status, 'handle', l.target_handle,
    'kind', l.target_kind, 'name', l.target_name, 'look', l.look,
    'campus', l.campus,
    'school', (select c.name from wall_campuses c where c.slug = l.campus and c.edu_domain is not null),
    'verified', l.verified, 'salutation', l.salutation,
    'reasons', case when l.status = 'rejected' then coalesce(l.moderation->'reasons', '[]'::jsonb) end)
    from wall_letters l where l.id = p_letter
$$;
revoke all on function wall_letter_answer(uuid) from public, anon, authenticated;
grant execute on function wall_letter_answer(uuid) to service_role;

-- The first send's answer for a (device, nonce), or null. The edge function
-- asks before it reads a name note, so a second tab never spends a second
-- reading, and never a second throttle.
create or replace function wall_write_replay(p_token text, p_nonce text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid;
  v_id uuid;
begin
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{8,64}$' then return null; end if;
  v_me := celestual_session_user(p_token);
  if v_me is null then return null; end if;
  select id into v_id from wall_letters where author_id = v_me and nonce = p_nonce;
  if v_id is null then return null; end if;
  return wall_letter_answer(v_id) || jsonb_build_object('replay', true);
end;
$$;
revoke all on function wall_write_replay(text, text) from public, anon, authenticated;
grant execute on function wall_write_replay(text, text) to service_role;

-- The name notes a device and an address may send in a day: five and twenty
-- by default, and the desk's to change (celestual_settings). Every send the
-- classifier reads is counted, whatever it answers, so a refused note is not
-- a free retry. A small table, and nothing in it outlives two days.
create table if not exists wall_name_throttle (
  id          bigserial   primary key,
  device_hash text        not null,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists wall_name_throttle_device_idx on wall_name_throttle (device_hash, created_at);
create index if not exists wall_name_throttle_ip_idx     on wall_name_throttle (ip, created_at);
alter table wall_name_throttle enable row level security;
revoke all on wall_name_throttle from public, anon, authenticated;
comment on table wall_name_throttle is
  '0063: one row per name note a device sent, with its address, for the daily throttle. Pruned after two days.';

create or replace function wall_name_throttle_take(p_token text, p_ip text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_dev text;
  v_ip  text := nullif(left(btrim(coalesce(p_ip, '')), 64), '');
  v_n   int;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then return false; end if;
  v_dev := encode(digest(p_token, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('wall_name_throttle:' || v_dev, 63));
  select count(*) into v_n from wall_name_throttle
   where device_hash = v_dev and created_at > now() - interval '1 day';
  if v_n >= celestual_setting_int('wall_name_per_device', 5) then return false; end if;
  if v_ip is not null then
    select count(*) into v_n from wall_name_throttle
     where ip = v_ip and created_at > now() - interval '1 day';
    if v_n >= celestual_setting_int('wall_name_per_ip', 20) then return false; end if;
  end if;
  insert into wall_name_throttle (device_hash, ip) values (v_dev, v_ip);
  if random() < 0.02 then
    delete from wall_name_throttle where created_at < now() - interval '2 days';
  end if;
  return true;
end;
$$;
revoke all on function wall_name_throttle_take(text, text) from public, anon, authenticated;
grant execute on function wall_name_throttle_take(text, text) to service_role;

-- The campus an @-note carries: the writer's school, when it takes @-notes.
-- A pass (0043) writes from the school the writer picked if it takes them,
-- and Berkeley otherwise. Null is the refusal: the writer is proved at a
-- school where the wall does not take @-notes yet.
create or replace function wall_handle_campus(p_user uuid, p_pick text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  u      celestual_users%rowtype;
  v_slug text;
begin
  select * into u from celestual_users where id = p_user and merged_into is null;
  if not found or u.edu_verified_at is null then return null; end if;
  v_slug := celestual_campus_for_domain(u.edu_domain);
  if v_slug is not null
     and exists (select 1 from wall_campuses where slug = v_slug and is_open and handle_notes) then
    return v_slug;
  end if;
  if celestual_pass_email(u.edu_email) then
    select slug into v_slug from wall_campuses
     where is_open and handle_notes
     order by (slug = coalesce(p_pick, '')) desc, (slug = 'berkeley') desc, created_at
     limit 1;
    return v_slug;
  end if;
  return null;
end;
$$;
revoke all on function wall_handle_campus(uuid, text) from public, anon, authenticated;
grant execute on function wall_handle_campus(uuid, text) to service_role;

-- The v2 write (docs/ONE-WALL.md, `celestual-wall-moderate` version 2).
-- SERVICE ROLE ONLY: the status is the screen's decision.
--
--   an @-note   the author is the session's user, never a new one. No
--               session or no verified campus address is `edu`; a verified
--               address at a school without @-notes is `campus`. The campus
--               is the school's, and the letter is `verified`.
--   a name note the author is the session's user, or a bare row for a new
--               device. The campus is the pick if it is open, else the
--               root. Never verified.
--   both        the nonce is required and makes the write idempotent; the
--               name is checked against every campus; the allowance as
--               before (0052); the dear line cleaned or refused.
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
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_kind     text := case when p_kind = 'name' then 'name' else 'handle' end;
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
  if v_kind = 'name' then
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
  if v_kind = 'handle' then
    if not exists (select 1 from celestual_users where id = v_me and edu_verified_at is not null) then
      return jsonb_build_object('ok', false, 'error', 'edu');
    end if;
    v_campus := wall_handle_campus(v_me, v_pick);
    if v_campus is null then return jsonb_build_object('ok', false, 'error', 'campus'); end if;
    v_verified := true;
  else
    v_campus := case when v_pick <> '' and exists (select 1 from wall_campuses where slug = v_pick and is_open)
                     then v_pick else 'global' end;
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

revoke all on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)
  to service_role;

comment on function wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text) is
  '0063: the v2 write. An @-note needs a verified address at a school with handle_notes (edu, campus) and is verified; a name note needs no proof and takes the picked campus or the root. Idempotent on (author, nonce). Service role only.';

-- ── 7. the owner takes it down, and puts it back ─────────────────────────────
-- wall_remove_letter (0032) files a claim, and a claim shuts the whole name
-- (wall_name_shut). That was right when the only way down was "this is about
-- me, take it all off", and it is wrong for one letter a person would rather
-- was not up: the next letter to them would be refused as `removed`. So the
-- claimed owner's one tap files nothing. It sets the letter `removed` with
-- `moderation.desk.via = 'owner'`, keeps whatever the desk had said under
-- `desk.prev`, and can be undone for a day.
--
-- Between the two of them and the email's link (0064) these are the only
-- writers of `via = 'owner'`. The desk still sees the letter and the mark,
-- and the writer's list says `report`, as it did for a claim, which tells
-- the writer nothing about who.
create or replace function wall_owner_down(p_letter uuid, p_by text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l       wall_letters%rowtype;
  v_until timestamptz := now() + interval '24 hours';
begin
  select * into l from wall_letters where id = p_letter for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.status = 'removed' and l.moderation #>> '{desk,via}' = 'owner' then
    return jsonb_build_object('ok', true, 'letter_id', l.id,
                              'undo_until', (l.moderation #>> '{desk,undo_until}')::timestamptz);
  end if;
  if l.status <> 'live' then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  update wall_letters
     set status = 'removed',
         moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', jsonb_strip_nulls(jsonb_build_object(
             'via', 'owner',
             'by', p_by,
             'at', now(),
             'undo_until', v_until,
             'prev', moderation->'desk')))
   where id = l.id;
  return jsonb_build_object('ok', true, 'letter_id', l.id, 'undo_until', v_until);
end;
$$;

create or replace function wall_owner_up(p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l wall_letters%rowtype;
begin
  select * into l from wall_letters where id = p_letter for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.status = 'live' then return jsonb_build_object('ok', true, 'letter_id', l.id); end if;
  if l.status <> 'removed' or coalesce(l.moderation #>> '{desk,via}', '') <> 'owner' then
    return jsonb_build_object('ok', false, 'error', 'gone');
  end if;
  if (l.moderation #>> '{desk,undo_until}')::timestamptz < now() or l.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  update wall_letters
     set status = 'live',
         moderation = case when l.moderation #> '{desk,prev}' is null then moderation - 'desk'
                           else jsonb_set(moderation, '{desk}', l.moderation #> '{desk,prev}') end
   where id = l.id;
  return jsonb_build_object('ok', true, 'letter_id', l.id);
end;
$$;

revoke all on function wall_owner_down(uuid, text) from public, anon, authenticated;
revoke all on function wall_owner_up(uuid)         from public, anon, authenticated;
grant execute on function wall_owner_down(uuid, text) to service_role;
grant execute on function wall_owner_up(uuid)         to service_role;

-- Client-callable. The session's user must hold the verified @ the letter is
-- written to. A name note has no owner and answers `unverified`.
create or replace function wall_owner_remove(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v    jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.target_kind <> 'handle' or not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  v := wall_owner_down(l.id, 'owner');
  if not (v->>'ok')::boolean then return v; end if;
  return jsonb_build_object('ok', true, 'undo_until', v->'undo_until');
end;
$$;

create or replace function wall_owner_restore(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v    jsonb;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.target_kind <> 'handle' or not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  v := wall_owner_up(l.id);
  if not (v->>'ok')::boolean then return v; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function wall_owner_remove(text, uuid)  from public;
revoke all on function wall_owner_restore(text, uuid) from public;
grant execute on function wall_owner_remove(text, uuid)  to anon, authenticated;
grant execute on function wall_owner_restore(text, uuid) to anon, authenticated;

comment on function wall_owner_remove(text, uuid) is
  '0063: the claimed owner of the letter''s @ takes it down. Files no claim, so it shuts nothing else. Undoable for 24 hours.';
comment on function wall_owner_restore(text, uuid) is
  '0063: puts back a letter its owner took down, within 24 hours.';

-- ── 8. the cards land on the one wall ────────────────────────────────────────
alter table wall_cards alter column landing set default '/';
update wall_cards set landing = '/' where landing = '/berkeley';

-- ── 9. the private note ──────────────────────────────────────────────────────
-- "send privately" is a ping (celestual_submit) carrying the note as its card
-- (0022). The card was twenty words, which is the Bindery's poster and not a
-- letter, so the words go to eighty and the characters to 280, a letter's
-- length. And a card was read by nothing on the server: the list the wall
-- reads a letter's body against (celestual-wall-moderate, layer 1) reads a
-- card now too, here, before anything is stored. A caught card refuses the
-- ping with `error: 'card'` and the list's words, and stores nothing.
--
-- The list, ported from the edge function's `deterministic()`, pattern for
-- pattern: the slurs on the folded text, a link, an address, a phone number
-- (nine digits and no sentence break inside it), a street address, a room.
-- On a database whose collation is C the classes are ASCII, as they are in
-- the edge function's own regular expressions.
create or replace function celestual_text_caught(p text)
returns text[]
language plpgsql immutable set search_path = public as $$
declare
  t text := coalesce(p, '');
  f text;
  m text;
  s text;
  r text[] := '{}';
begin
  f := regexp_replace(translate(lower(t), '0@1!3457', 'ooiieast'), '[^a-z[:space:]]', '', 'g');
  foreach s in array array['nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded', 'kike',
                           'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'shemale'] loop
    if f ~ ('\m' || s || '\M') then r := r || 'slur'::text; exit; end if;
  end loop;
  if t ~* '(https?://|www\.|(^|[^[:alnum:]_])[a-z0-9-]+\.(com|net|org|io|co|edu|gg|me|ly)([^[:alnum:]_]|$))' then
    r := r || 'url'::text;
  end if;
  if t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    r := r || 'email'::text;
  end if;
  m := substring(t from '(\+?[0-9][0-9[:space:]().-]{8,}[0-9])');
  if m is not null and char_length(regexp_replace(m, '[^0-9]', '', 'g')) >= 9 and m !~ '\.[[:space:]]' then
    r := r || 'phone'::text;
  end if;
  if t ~* '\m[0-9]{2,5}[[:space:]]+[a-z][a-z.''-]*([[:space:]]+[a-z][a-z.''-]*)?[[:space:]]+(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pl|place|terrace)\M' then
    r := r || 'address'::text;
  end if;
  if t ~* '(\m(room|rm|apt|apartment|suite|ste|dorm)[[:space:]]*#?[[:space:]]*[0-9]{1,4}[a-z]?\M|#[[:space:]]?[0-9]{3,4}\M)' then
    r := r || 'room'::text;
  end if;
  return r;
end;
$$;
revoke all on function celestual_text_caught(text) from public, anon, authenticated;
grant execute on function celestual_text_caught(text) to service_role;

comment on function celestual_text_caught(text) is
  '0063: the wall''s layer 1 list (celestual-wall-moderate deterministic()) in SQL: slur, url, email, phone, address, room. Empty when nothing is caught.';

-- The validator, as 0024 wrote it, with the two ceilings moved: eighty words
-- and 280 characters, a letter's length. Everything else is unchanged, and a
-- stored card is never re-cut: this only runs on what a browser sends.
create or replace function celestual_card_clean(p jsonb)
returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  v_words text;
  v_list  text[];
  v_bg    text;
  v_face  text;
  v_x     numeric;
  v_y     numeric;
  v_tone  numeric;
  c_num constant text := '^-?[0-9]+(\.[0-9]+)?$';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;

  v_words := btrim(regexp_replace(coalesce(p->>'words', ''), '\s+', ' ', 'g'));
  if v_words = '' then return null; end if;

  -- Eighty words and 280 characters (0063): a note sent privately is as long
  -- as a letter on the wall. The word ceiling is generous on purpose, so the
  -- characters are what a writer meets.
  v_list := regexp_split_to_array(v_words, ' ');
  if array_length(v_list, 1) > 80 then
    v_words := array_to_string(v_list[1:80], ' ');
  end if;
  v_words := rtrim(left(v_words, 280));

  v_bg := lower(coalesce(p->>'bg', 'leaf'));
  if v_bg not in ('leaf', 'chalk', 'hide', 'ink', 'violet', 'ember', 'rose', 'blue') then
    v_bg := 'leaf';
  end if;

  v_face := lower(coalesce(p->>'face', 'serif'));
  if v_face not in ('serif', 'sans', 'mono') then v_face := 'serif'; end if;

  v_x := case when p->>'x' ~ c_num then least(1, greatest(0, (p->>'x')::numeric)) else 0.5 end;
  v_y := case when p->>'y' ~ c_num then least(1, greatest(0, (p->>'y')::numeric)) else 0.5 end;
  v_tone := case when p->>'tone' ~ c_num then least(1, greatest(0, (p->>'tone')::numeric)) else 1 end;

  return jsonb_build_object(
    'words', v_words,
    'bg', v_bg,
    'face', v_face,
    'x', round(v_x, 4),
    'y', round(v_y, 4),
    'tone', round(v_tone, 4));
end;
$$;

comment on function celestual_card_clean(jsonb) is
  '0022, 0024, 0063: the card validator. Rebuilds every card from scratch: eighty words and 280 characters, one of the grounds, one of the three faces, a position inside the disc and a tone in range. A client is a suggestion.';

-- celestual_submit, as 0023 wrote it, with one check added straight after the
-- card is cleaned: a card the list catches refuses the ping, before the proof,
-- the rate limits or anything else is read or written.
create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_card jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  nh text;                                   -- hash of the target
  nc jsonb;                                  -- validated card
  v_caught text[];                           -- what the list caught in it (0063)
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_placed30 int;
  v_existing_id uuid;
  v_standing int;
  reciprocal_from   text;
  reciprocal_email  text;
  reciprocal_card   jsonb;
  reciprocal_id     uuid;
  reciprocal_tohash text;
  v_counterpart text;                        -- which of MY handles they entered
  v_match_id uuid;
  v_mutual boolean := false;
  v_cap int;
  v_expires timestamptz;
  v_my_card jsonb;                           -- the card THEY will find waiting
  v_my_email text;                           -- my bound recovery address, if any
  v_their_email text;                        -- theirs: their ping's, else bound
  ha text;
  hb text;
  c_ip_per_hour    constant int := 40;
  c_from_per_hour  constant int := 20;
  c_to_per_hour    constant int := 60;
  c_place_per_30d  constant int := 6;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if nf = nt then raise exception 'same handle'; end if;
  nh := celestual_hash_handle(nt);
  nc := celestual_card_clean(p_card);

  -- 0063: the card is read by the list a letter body is read by, before
  -- anything else here is read or written. A caught card refuses the ping.
  if nc is not null then
    v_caught := celestual_text_caught(nc->>'words');
    if cardinality(v_caught) > 0 then
      return jsonb_build_object('recorded', false, 'error', 'card', 'reasons', to_jsonb(v_caught));
    end if;
  end if;

  -- ── HANDLE OWNERSHIP (Instagram DM verification, §verify) ───────────
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;

  -- Never record a ping against an opted-out handle (checked by hash).
  if exists (select 1 from celestual_suppressions where handle_hash = nh) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- The cap and the standing window are this person's, not the product's
  -- (0021): the free two, plus anything bought, and six months instead of
  -- sixty days while a plan is live.
  v_cap := celestual_cap_for(nf);
  v_expires := now() + celestual_ping_window(nf);

  v_ip := celestual_client_ip();

  -- Trailing-hour rate limits (IP / from / to) — the burst backstop.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  -- The per-target cap compares hashes (attempts store the hashed target).
  select count(*) into v_ton from celestual_attempts
   where to_handle = nh and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Re-placing an existing pair? Free — it just refreshes email/card and
  -- renews the sixty-day clock (re-placing IS still feeling it).
  select id into v_existing_id
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

  if v_existing_id is null then
    -- ── THE SLOT RULE (per person: the free two, plus what they hold) ──
    select count(*) into v_standing
      from celestual_entries e
     where e.from_handle in (select celestual_group(nf))
       and e.matched_at is null
       and e.expires_at > now();
    if v_standing >= v_cap then
      return jsonb_build_object(
        'recorded', false, 'error', 'no_slots',
        'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap));
    end if;

    -- ── CADENCE CAP (anti-sweep: retiring frees the slot, so bound the churn) ──
    select count(*) into v_placed30
      from celestual_placements
     where handle = nf and created_at > now() - interval '30 days';
    if v_placed30 >= c_place_per_30d then
      return jsonb_build_object('recorded', false, 'error', 'rate_limited');
    end if;
  end if;

  -- Log this attempt (target hashed), then prune old rows ~2% of the time.
  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
    delete from celestual_placements where created_at < now() - interval '40 days';
  end if;

  -- Record / refresh the ping. Hash for the mechanism, plaintext for the
  -- owner's own cross-device restore (see 0010 §2), and the card for the
  -- reveal that only ever happens if both sides exist.
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, card, expires_at)
  values (nf, nh, nt, ne, nc, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        card       = coalesce(excluded.card, celestual_entries.card),
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_entries.matched_at is null then excluded.expires_at
                          else celestual_entries.expires_at end,
        renew_notified_at = null;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── GROUP-AWARE RECIPROCAL, BY HASH ─────────────────────────────────
  select e.id, e.from_handle, e.from_email, e.card, e.to_hash
    into reciprocal_id, reciprocal_from, reciprocal_email, reciprocal_card, reciprocal_tohash
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and not (e.from_handle = nf and e.to_hash = nh)   -- never self-match a linked alt
     and (e.matched_at is not null or e.expires_at > now())
   order by e.created_at asc
   limit 1;

  if reciprocal_id is not null then
    v_mutual := true;
    select g into v_counterpart
      from celestual_group(nf) g
     where celestual_hash_handle(g) = reciprocal_tohash
     limit 1;

    update celestual_entries
       set matched_at = coalesce(matched_at, now()), matched_handle = nt
     where from_handle = nf and to_hash = nh;
    update celestual_entries
       set matched_at = coalesce(matched_at, now()),
           matched_handle = coalesce(matched_handle, v_counterpart)
     where id = reciprocal_id;

    ha := least(nf, reciprocal_from);
    hb := greatest(nf, reciprocal_from);
    insert into celestual_matches (handle_a, handle_b) values (ha, hb)
      on conflict (handle_a, handle_b) do nothing
      returning id into v_match_id;

    if v_match_id is not null then
      -- The card the OTHER person will find waiting is the one now standing on
      -- my row — which is `nc` when this request carried one, and whatever was
      -- already there when it didn't (re-placing never blanks a poster).
      select e.card into v_my_card
        from celestual_entries e
       where e.from_handle = nf and e.to_hash = nh;

      -- Addresses. Only ever one a person stored themselves.
      --
      -- Mine: the address I bound under a live DM proof (0013), falling back to
      -- the one on this request — which is mine, on my own row, and carries a
      -- reveal this very call already returned to me in `match_card`. That is
      -- the whole of why the fallback is allowed here and nowhere else: the
      -- rule was never "distrust p_email", it was "never let one request name
      -- where SOMEBODY ELSE'S reveal gets sent", and that rule is untouched
      -- below.
      select r.email into v_my_email from celestual_recovery r where r.handle = nf;
      v_my_email := coalesce(v_my_email, ne);
      v_their_email := coalesce(
        reciprocal_email,
        (select r.email from celestual_recovery r where r.handle = reciprocal_from));

      -- The mail says a match happened and nothing about what either card
      -- says; the words are read in the product, by the person they were
      -- written to, once.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_their_email, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null, now()
       where v_their_email is not null;

      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_my_email, nf, nt, reciprocal_card is not null, now()
       where v_my_email is not null;

      -- And the Instagram half, for both. Queued, never pushed from here:
      -- whether it can be delivered now or has to wait for their next message
      -- is decided by celestual_dm_due / celestual_dm_take, not by us.
      perform celestual_dm_queue(v_match_id, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null);
      perform celestual_dm_queue(v_match_id, nf, nt, reciprocal_card is not null);
    end if;
  end if;

  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    'match', case when v_mutual then nt else null end,
    -- their half, and this is the instant it becomes readable. Both rows were
    -- matched two statements ago, so both sides now get the same answer at the
    -- same moment: whichever of them asks next, neither moved second.
    'match_card', case when v_mutual then reciprocal_card else null end,
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap)
  );
end;
$$;

revoke all on function celestual_submit(text, text, text, text, jsonb) from public;
grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;

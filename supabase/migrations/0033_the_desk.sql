-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0033 · THE DESK                                                     ║
-- ║  Everything the rebuild built, readable and actionable by a person   ║
-- ║  who does not write SQL.                                             ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Phase 7. Spec section 10.
--
-- ── WHY A SECOND SET OF FUNCTIONS AND NOT AN EDIT TO THE FIRST ───────────────
-- `celestual_admin_*` (0017 through 0020) reads the OLD identity layer:
-- celestual_members, celestual_ig_verifications, celestual_suppressions,
-- celestual_entries, celestual_matches. Phase 4b deliberately did not replace
-- that layer. It layered celestual_users over it and backfilled from it, so
-- both halves are live and the DM code flow still writes the old one.
--
-- So the desk has two halves because the product does. The legacy calls stay
-- exactly as they are and keep doing the job they do (ban, unban, clear a stuck
-- code, admit somebody by hand). These are the other half: the row, the cache,
-- the queue, the caps, the wall and the reports.
--
-- ── WHAT SPEC SECTION 10 ASKS FOR, AND WHERE EACH ONE LANDS ──────────────────
--   user records                    celestual_desk_users, celestual_desk_user
--   handle resolution cache         celestual_desk_profiles, _profile_forget
--   moderation queue and reasons    celestual_desk_letters, _letter_set
--   rate limit status               celestual_desk_overview.limits
--   wall submissions                celestual_desk_letters
--   reports, and report to removal  celestual_desk_reports, _report_resolve
--
-- ── THE ONE RULE EVERY FUNCTION HERE FOLLOWS ─────────────────────────────────
-- service_role only. Not one of these is granted to anon or authenticated, and
-- the celestual-admin edge function is the only thing in the product holding
-- that key. The password is checked there, once, and nothing below is reachable
-- without it. That is the same arrangement 0017 chose and it is still right:
-- a desk whose reads are client-callable is a desk with a second door.
--
-- ── AND THE ONE THING THE DESK IS NOT ALLOWED TO DO ──────────────────────────
-- It cannot verify a handle. `handle_verified_at` has exactly one writer,
-- celestual_user_bind_handle, and it demands a live DM proof (spec section 4).
-- An admin screen that could stamp it would make the proof optional, so the
-- desk reads that column and never writes it. Admitting somebody by hand is
-- still possible through the legacy celestual_admin_verify_user, which stamps
-- verified_via='manual' on the OLD layer and is honest about what it is.

-- ── celestual_desk_overview() ────────────────────────────────────────────────
-- The one call the desk opens with. Everything here is either a count or a
-- small bounded list, so it is cheap and it is the whole shape of the product
-- in one screen: how many people, how many letters and in what state, what the
-- screen caught, who is against a cap, and whether a merge stopped to ask.
create or replace function celestual_desk_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limits    jsonb;
  v_conflicts jsonb;
  v_scans     jsonb;
  v_campuses  jsonb;
begin
  -- ── rate limit status ──
  -- Spec section 5's three counters, read the way the enforcement reads them:
  -- rows in the last 24 hours, per key. Only keys that have actually spent
  -- something appear, and `remaining` is what the next request would find.
  -- The key value is shown because that is the whole point of the screen: a
  -- person looking at this is answering "why did this stop working for them".
  select coalesce(jsonb_agg(x order by x.spent desc), '[]'::jsonb) into v_limits
  from (
    select e.key_type,
           e.key_value,
           count(*)::int                                   as spent,
           handle_search_limit(e.key_type)                 as cap,
           greatest(0, handle_search_limit(e.key_type) - count(*))::int as remaining,
           min(e.created_at)                               as oldest,
           max(e.created_at)                               as newest,
           count(*) >= handle_search_limit(e.key_type)     as blocked
      from handle_search_events e
     where e.created_at >= now() - interval '24 hours'
     group by e.key_type, e.key_value
     order by count(*) desc
     limit 200
  ) x;

  -- ── the stop and ask ──
  -- 0030 refuses a merge that would join two verified handles or two campuses,
  -- writes the pair here, and changes nothing. This is the screen that comment
  -- promised.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'a_id', c.a_id, 'b_id', c.b_id,
    'detail', c.detail, 'created_at', c.created_at, 'resolved_at', c.resolved_at
  ) order by c.created_at desc), '[]'::jsonb)
  into v_conflicts
  from (select * from celestual_merge_conflicts order by created_at desc limit 100) c;

  -- ── which flyer ──
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_code', s.source_code, 'campus', s.campus,
    'scans', s.n, 'letters', coalesce(l.n, 0), 'last_at', s.last_at
  ) order by s.n desc), '[]'::jsonb)
  into v_scans
  from (select source_code, campus, count(*)::int as n, max(created_at) as last_at
          from wall_scans group by source_code, campus) s
  left join (select source_code, count(*)::int as n
               from wall_letters where source_code is not null group by source_code) l
    on l.source_code = s.source_code;

  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', c.slug, 'name', c.name, 'edu_domain', c.edu_domain, 'is_open', c.is_open,
    'letters', (select count(*)::int from wall_letters w where w.campus = c.slug and w.status = 'live'),
    'waitlist', (select count(*)::int from wall_waitlist w where w.campus = c.slug)
  ) order by c.slug), '[]'::jsonb)
  into v_campuses
  from wall_campuses c;

  return jsonb_build_object(
    'ok', true,
    'now', now(),
    'limits', v_limits,
    'conflicts', v_conflicts,
    'scans', v_scans,
    'campuses', v_campuses,
    'counts', jsonb_build_object(
      'users',            (select count(*) from celestual_users where merged_into is null),
      'handle_verified',  (select count(*) from celestual_users
                            where merged_into is null and handle_verified_at is not null),
      'edu_verified',     (select count(*) from celestual_users
                            where merged_into is null and edu_verified_at is not null),
      'with_email',       (select count(*) from celestual_users
                            where merged_into is null and email is not null),
      'merged',           (select count(*) from celestual_users where merged_into is not null),
      'sessions_live',    (select count(*) from celestual_sessions where expires_at > now()),
      'users_7d',         (select count(*) from celestual_users
                            where merged_into is null and created_at > now() - interval '7 days'),

      'letters',          (select count(*) from wall_letters),
      'letters_live',     (select count(*) from wall_letters where status = 'live'),
      'letters_pending',  (select count(*) from wall_letters where status = 'pending'),
      'letters_rejected', (select count(*) from wall_letters where status = 'rejected'),
      'letters_removed',  (select count(*) from wall_letters where status = 'removed'),
      'letters_7d',       (select count(*) from wall_letters
                            where created_at > now() - interval '7 days'),
      'claims',           (select count(*) from wall_claims),
      'asks_open',        (select count(*) from wall_reveal_requests where status = 'pending'),
      'revealed',         (select count(*) from wall_reveal_requests where status = 'revealed'),
      'waitlist',         (select count(*) from wall_waitlist),
      'scans',            (select count(*) from wall_scans),

      'reports_open',     (select count(*) from wall_reports where status = 'open'),
      'reports',          (select count(*) from wall_reports),

      'profiles',         (select count(*) from ig_profiles),
      'profiles_faced',   (select count(*) from ig_profiles where avatar_path is not null),
      'profiles_stale',   (select count(*) from ig_profiles
                            where avatar_fetched_at is null
                               or avatar_fetched_at < now() - interval '30 days'),
      'searches_24h',     (select count(*) from handle_search_events
                            where created_at >= now() - interval '24 hours'),
      'conflicts_open',   (select count(*) from celestual_merge_conflicts where resolved_at is null)
    )
  );
end;
$$;

-- ── celestual_desk_users(query, limit, offset) ───────────────────────────────
-- The rows. Spec section 3 makes the handle the identity, so that is what the
-- query matches first, and an address matches too because the person at the
-- desk is usually holding one of the two.
--
-- Tombstones are included and marked rather than hidden. A merge that went the
-- wrong way is exactly the thing somebody comes to this screen to see.
create or replace function celestual_desk_users(
  p_query  text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_q    text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim  integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off  integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n    bigint;
begin
  if v_q is not null then
    v_q := lower(regexp_replace(v_q, '^@', ''));
  end if;

  select count(*) into v_n
    from celestual_users u
   where v_q is null
      or u.instagram_handle like '%' || v_q || '%'
      or u.edu_email        like '%' || v_q || '%'
      or u.email            like '%' || v_q || '%'
      or u.id::text = v_q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'handle', u.instagram_handle,
    'handle_verified_at', u.handle_verified_at,
    'edu_email', u.edu_email,
    'edu_domain', u.edu_domain,
    'edu_verified_at', u.edu_verified_at,
    'email', u.email,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'merged_into', u.merged_into,
    'merged_at', u.merged_at,
    'sessions', (select count(*)::int from celestual_sessions s
                  where s.user_id = u.id and s.expires_at > now()),
    'letters', (select count(*)::int from wall_letters w where w.author_id = u.id),
    'claims',  (select count(*)::int from wall_claims c where c.user_id = u.id),
    'reports', (select count(*)::int from wall_reports r where r.reporter_id = u.id)
  ) order by u.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from celestual_users u2
     where v_q is null
        or u2.instagram_handle like '%' || v_q || '%'
        or u2.edu_email        like '%' || v_q || '%'
        or u2.email            like '%' || v_q || '%'
        or u2.id::text = v_q
     order by u2.created_at desc
     limit v_lim offset v_off
  ) u;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

-- ── celestual_desk_user(id) ──────────────────────────────────────────────────
-- One person, whole: the row, every merge it was part of in either direction,
-- and the letters it wrote with their state. The bodies are here on purpose.
-- A person handling a report has to read what was written, and this function is
-- already behind the password and the service key.
create or replace function celestual_desk_user(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_u celestual_users; v_letters jsonb; v_merges jsonb; v_claims jsonb;
begin
  select * into v_u from celestual_users where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'target_handle', l.target_handle, 'body', l.body,
    'has_seal', l.sealed_line is not null, 'status', l.status,
    'moderation', l.moderation, 'campus', l.campus,
    'created_at', l.created_at, 'expires_at', l.expires_at
  ) order by l.created_at desc), '[]'::jsonb)
  into v_letters
  from (select * from wall_letters where author_id = p_id order by created_at desc limit 200) l;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'survivor_id', m.survivor_id, 'absorbed_id', m.absorbed_id,
    'reason', m.reason, 'moved', m.moved_json, 'created_at', m.created_at
  ) order by m.created_at desc), '[]'::jsonb)
  into v_merges
  from celestual_user_merges m
  where m.survivor_id = p_id or m.absorbed_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'letter_id', c.letter_id, 'target_handle', l.target_handle, 'created_at', c.created_at
  ) order by c.created_at desc), '[]'::jsonb)
  into v_claims
  from wall_claims c join wall_letters l on l.id = c.letter_id
  where c.user_id = p_id;

  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', v_u.id,
      'handle', v_u.instagram_handle,
      'handle_verified_at', v_u.handle_verified_at,
      'edu_email', v_u.edu_email,
      'edu_domain', v_u.edu_domain,
      'edu_verified_at', v_u.edu_verified_at,
      'email', v_u.email,
      'created_at', v_u.created_at,
      'updated_at', v_u.updated_at,
      'merged_into', v_u.merged_into,
      'merged_at', v_u.merged_at,
      'sessions', (select count(*)::int from celestual_sessions s
                    where s.user_id = v_u.id and s.expires_at > now())
    ),
    'letters', v_letters,
    'merges', v_merges,
    'claims', v_claims
  );
end;
$$;

-- ── celestual_desk_profiles(query, limit, offset) ────────────────────────────
-- The resolution cache. Spec section 5 keeps these rows forever and refreshes
-- them only when a resolve is explicitly forced, which makes this screen the
-- only place that forcing can happen from.
--
-- `avatar_path` is returned rather than a URL. The bucket is public read and the
-- desk builds the URL itself, exactly as the browser does, so this function does
-- not have to know the project's own address.
create or replace function celestual_desk_profiles(
  p_query  text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_q   text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  if v_q is not null then v_q := lower(regexp_replace(v_q, '^@', '')); end if;

  select count(*) into v_n from ig_profiles p
   where v_q is null or p.handle like '%' || v_q || '%' or lower(p.display_name) like '%' || v_q || '%';

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', p.handle,
    'display_name', p.display_name,
    'is_verified', p.is_verified,
    'is_private', p.is_private,
    'avatar_path', p.avatar_path,
    'avatar_fetched_at', p.avatar_fetched_at,
    'resolved_at', p.resolved_at,
    'stale', p.avatar_fetched_at is null or p.avatar_fetched_at < now() - interval '30 days',
    'searches', (select count(*)::int from handle_search_events e where e.handle = p.handle)
  ) order by p.resolved_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from ig_profiles p2
     where v_q is null or p2.handle like '%' || v_q || '%' or lower(p2.display_name) like '%' || v_q || '%'
     order by p2.resolved_at desc
     limit v_lim offset v_off
  ) p;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

-- ── celestual_desk_profile_forget(handle) ────────────────────────────────────
-- The forced resolve, spec section 5. It deletes the cache row rather than
-- marking it, because the next lookup of that handle is then an ordinary cache
-- miss and takes the ordinary path: one Apify call, one avatar download, one
-- row written. A "force" flag threaded through the edge function would be a
-- second code path to the same place.
--
-- The stored picture is deliberately NOT deleted here. Storage is not reachable
-- from SQL, and a bucket object with no row pointing at it is overwritten by the
-- next resolve at the same path anyway, since the path is a function of the
-- handle. Nothing is orphaned.
create or replace function celestual_desk_profile_forget(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_h text := celestual_norm(p_handle); v_n integer;
begin
  if v_h is null or v_h = '' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  delete from ig_profiles where handle = v_h;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'handle', v_h, 'forgotten', v_n > 0);
end;
$$;

-- ── celestual_desk_letters(status, query, limit, offset) ─────────────────────
-- The moderation queue and the wall's submissions, which are the same table
-- read two ways. Spec section 9 stores a rejection with its reason so it appears
-- here; `moderation` is the classifier's own words and is returned whole.
--
-- The author's handle is joined in. It is never sent to a browser by any other
-- function in this schema, and that rule is about the wall's readers, not about
-- the person deciding whether a letter comes down.
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
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('pending', 'live', 'rejected', 'removed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;
  if v_q is not null then v_q := lower(regexp_replace(v_q, '^@', '')); end if;

  select count(*) into v_n
    from wall_letters l
   where (v_s is null or l.status = v_s)
     and (v_q is null or l.target_handle like '%' || v_q || '%' or lower(l.body) like '%' || v_q || '%');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'target_handle', l.target_handle,
    'body', l.body,
    'sealed_line', l.sealed_line,
    'status', l.status,
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
       and (v_q is null or l2.target_handle like '%' || v_q || '%' or lower(l2.body) like '%' || v_q || '%')
     order by l2.created_at desc
     limit v_lim offset v_off
  ) l
  left join celestual_users u on u.id = l.author_id;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

-- ── celestual_desk_letter_set(id, status, note) ──────────────────────────────
-- A person's decision on one letter, and the four states are the four states
-- the table already has. The note is kept inside `moderation` next to whatever
-- the classifier said, so the record reads as one history rather than as a
-- machine verdict with a human one hidden somewhere else.
--
-- Publishing from here is a real publish. It is the deliberate escape from
-- layer 3 in celestual-wall-moderate: anything the classifier returns 'review'
-- for sits at pending until a person moves it, and this is the person moving it.
create or replace function celestual_desk_letter_set(p_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l wall_letters;
begin
  if p_status not in ('pending', 'live', 'rejected', 'removed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  update wall_letters
     set status = p_status,
         moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', jsonb_build_object(
             'status', p_status,
             'note', nullif(btrim(coalesce(p_note, '')), ''),
             'at', now()
           ))
   where id = p_id
  returning * into v_l;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  return jsonb_build_object('ok', true, 'id', v_l.id, 'status', v_l.status, 'moderation', v_l.moderation);
end;
$$;

-- ── celestual_desk_reports(status, limit, offset) ────────────────────────────
-- Spec section 10's reporting mechanism, from the desk's side. The letter is
-- already down when the report arrives: wall_report sets it to 'removed' in the
-- same statement that files the report, because the screenshot exists before you
-- delete it. So this queue is not "should this come down". It is "should this go
-- back up", which is a question a person can take their time over.
create or replace function celestual_desk_reports(
  p_status text default 'open',
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s   text := nullif(btrim(coalesce(p_status, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('open', 'upheld', 'dismissed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select count(*) into v_n from wall_reports r where v_s is null or r.status = v_s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'reason', r.reason,
    'resolution', r.resolution,
    'created_at', r.created_at,
    'resolved_at', r.resolved_at,
    'reporter_id', r.reporter_id,
    'reporter_handle', ru.instagram_handle,
    'letter_id', l.id,
    'letter_status', l.status,
    'letter_body', l.body,
    'letter_target', l.target_handle,
    'letter_campus', l.campus,
    'letter_created_at', l.created_at,
    'author_id', l.author_id,
    'author_handle', au.instagram_handle,
    'letter_reports', (select count(*)::int from wall_reports r2 where r2.letter_id = l.id)
  ) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from wall_reports r2 where v_s is null or r2.status = v_s
     order by r2.created_at desc limit v_lim offset v_off
  ) r
  join wall_letters l on l.id = r.letter_id
  left join celestual_users ru on ru.id = r.reporter_id
  left join celestual_users au on au.id = l.author_id;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

-- ── celestual_desk_report_resolve(id, uphold, note) ──────────────────────────
-- The action path spec section 10 asks for, and it is two words long because the
-- removal already happened.
--
--   uphold    the report was right. The letter stays removed, permanently, and
--             the report closes.
--   dismiss   the report was wrong. The letter goes back to live and the report
--             closes.
--
-- Dismissal only restores a letter that is 'removed'. A letter the screen
-- rejected, or one a person took down from the queue, does not come back up
-- because somebody's report about it was dismissed: those are two different
-- decisions and only one of them is being made here.
--
-- Every report on the same letter closes together. Three people reporting one
-- letter is one decision, and leaving the other two open would mean the same
-- letter arriving in the queue twice more with nothing left to decide.
create or replace function celestual_desk_report_resolve(
  p_id     uuid,
  p_uphold boolean,
  p_note   text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_r wall_reports;
  v_letter uuid;
  v_restored boolean := false;
  v_closed integer;
begin
  select * into v_r from wall_reports where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_r.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'already_resolved'); end if;

  v_letter := v_r.letter_id;

  update wall_reports
     set status = case when p_uphold then 'upheld' else 'dismissed' end,
         resolution = nullif(btrim(coalesce(p_note, '')), ''),
         resolved_at = now()
   where letter_id = v_letter and status = 'open';
  get diagnostics v_closed = row_count;

  if not p_uphold then
    update wall_letters
       set status = 'live',
           moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
             'desk', jsonb_build_object(
               'status', 'live',
               'note', nullif(btrim(coalesce(p_note, '')), ''),
               'via', 'report_dismissed',
               'at', now()
             ))
     where id = v_letter and status = 'removed';
    v_restored := found;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'letter_id', v_letter,
    'upheld', p_uphold,
    'closed', v_closed,
    'restored', v_restored
  );
end;
$$;

-- ── celestual_desk_waitlist(limit, offset) ───────────────────────────────────
-- The nineteen of twenty who looked and found nothing. 0032 calls it the most
-- commercially valuable table in the schema and the one with the least in it,
-- and it had nowhere to be read from until now.
create or replace function celestual_desk_waitlist(
  p_limit  integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lim integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  select count(*) into v_n from wall_waitlist;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', w.handle, 'campus', w.campus, 'source_code', w.source_code,
    'created_at', w.created_at,
    'letters_now', (select count(*)::int from wall_letters l
                     where l.target_handle = w.handle and l.status = 'live')
  ) order by w.created_at desc), '[]'::jsonb)
  into v_rows
  from (select * from wall_waitlist order by created_at desc limit v_lim offset v_off) w;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

-- ── celestual_desk_conflict_resolve(id, note) ────────────────────────────────
-- Closing a stop-and-ask. It records that a person looked; it does not perform
-- the merge. 0030 refuses those two merges on purpose and a button here that
-- overrode it would put the spec's "stop and ask" behind one click.
create or replace function celestual_desk_conflict_resolve(p_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_c celestual_merge_conflicts;
begin
  update celestual_merge_conflicts
     set resolved_at = now(),
         detail = detail || jsonb_build_object(
           'desk_note', nullif(btrim(coalesce(p_note, '')), ''), 'resolved_at', now())
   where id = p_id and resolved_at is null
  returning * into v_c;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'id', v_c.id);
end;
$$;

-- ── the grants ───────────────────────────────────────────────────────────────
-- service_role and nothing else, for every one of them. The celestual-admin
-- edge function is the only holder of that key and it checks the password
-- before it makes any of these calls.
revoke all on function celestual_desk_overview()                            from public, anon, authenticated;
revoke all on function celestual_desk_users(text, integer, integer)         from public, anon, authenticated;
revoke all on function celestual_desk_user(uuid)                            from public, anon, authenticated;
revoke all on function celestual_desk_profiles(text, integer, integer)      from public, anon, authenticated;
revoke all on function celestual_desk_profile_forget(text)                  from public, anon, authenticated;
revoke all on function celestual_desk_letters(text, text, integer, integer) from public, anon, authenticated;
revoke all on function celestual_desk_letter_set(uuid, text, text)          from public, anon, authenticated;
revoke all on function celestual_desk_reports(text, integer, integer)       from public, anon, authenticated;
revoke all on function celestual_desk_report_resolve(uuid, boolean, text)   from public, anon, authenticated;
revoke all on function celestual_desk_waitlist(integer, integer)            from public, anon, authenticated;
revoke all on function celestual_desk_conflict_resolve(uuid, text)          from public, anon, authenticated;

grant execute on function celestual_desk_overview()                            to service_role;
grant execute on function celestual_desk_users(text, integer, integer)         to service_role;
grant execute on function celestual_desk_user(uuid)                            to service_role;
grant execute on function celestual_desk_profiles(text, integer, integer)      to service_role;
grant execute on function celestual_desk_profile_forget(text)                  to service_role;
grant execute on function celestual_desk_letters(text, text, integer, integer) to service_role;
grant execute on function celestual_desk_letter_set(uuid, text, text)          to service_role;
grant execute on function celestual_desk_reports(text, integer, integer)       to service_role;
grant execute on function celestual_desk_report_resolve(uuid, boolean, text)   to service_role;
grant execute on function celestual_desk_waitlist(integer, integer)            to service_role;
grant execute on function celestual_desk_conflict_resolve(uuid, text)          to service_role;

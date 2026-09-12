-- ─────────────────────────────────────────────────────────────────────────────
-- 0050: the letter goes up first.
--
-- The screen used to have three outcomes, and the middle one was a hold: a
-- letter the classifier passed went up, a letter it refused was stored
-- refused, and a letter it was unsure of sat at `pending`, rendering nowhere,
-- until a person at the desk moved it. On a live wall that middle outcome was
-- a writer watching their letter not appear, for hours, with no word about
-- why, and a desk that had to be sat at before the wall could move.
--
-- So the hold is gone. celestual-wall-moderate now publishes a letter the
-- classifier is unsure of at once and FLAGS it: `moderation.flagged` is true,
-- `moderation.verdict` is 'review', and a person reads it at the desk while it
-- stands. A refusal is still a refusal, stored and never published, and the
-- writer is now told what the screen read it as and handed their words back.
--
-- Nothing about the letters table changes: `pending` stays a status the desk
-- can put a letter into by hand ("hold it back"), and wall_expire still closes
-- out anything left there. What this migration adds is the three things the
-- new shape needs to be seen:
--
--   1  wall_mine(token)                this person's own letters, and where
--                                      each stands: live, or down, and by
--                                      whose hand. It is how the wall tells a
--                                      writer that a letter of theirs came
--                                      down after it went up, and the only
--                                      function that returns a body to its
--                                      own author.
--   2  celestual_desk_letters('flagged') the desk's queue, which used to be
--                                      the held letters and is now the live
--                                      ones a person has not looked at.
--   3  celestual_desk_overview()        counts the flagged, so the desk's
--                                      rail and its first screen can say how
--                                      many are waiting to be read.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wall_mine(token) ──────────────────────────────────────────────────────
-- The caller's own letters, newest first, over the last thirty days, which is
-- as long as a letter stands. About the CALLER only: there is no argument for
-- anybody else, for the same reason wall_quota has none.
--
-- `down_by` is whose hand took a letter down, read off the record every
-- takedown already leaves in `moderation`:
--
--   null      it is up
--   'screen'  refused on the way in (status rejected, the classifier's verdict)
--   'desk'    a person took it down after it stood, or rejected it by hand
--   'report'  a reader took it down, whether or not the desk has since agreed
--   'shut'    the name itself came off the wall: a takedown, or the opt out
--   'lapsed'  it stood for its thirty days, or aged out of a hold
--   'held'    at pending, by the desk's hand
--
-- The wall shows the writer a notice for 'screen', 'desk' and 'shut', and
-- deliberately not for 'report': a letter a reader took down is a matter
-- between that reader and the desk, and telling the writer would point them
-- at the person likeliest to have done it.
--
-- `reasons` are the classifier's category words, which the app says as a
-- sentence. `flagged` is whether the letter is up and still waiting for a
-- person; it is returned so a future screen can draw it, and the wall today
-- shows the writer nothing about it.
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

revoke all on function wall_mine(text) from public;
grant execute on function wall_mine(text) to anon, authenticated;

comment on function wall_mine(text) is
  '0050: the caller''s own letters and where each stands, with whose hand took it down. The only function that returns a body to its author, and it answers about the caller only.';

-- ── 2. the desk's queue is the flagged letters ───────────────────────────────
-- As 0033 wrote it, plus one more word `p_status` takes: 'flagged', which is
-- a live letter the classifier answered 'review' on and no person has yet
-- decided about. A decision of any kind writes `moderation.desk`, and that is
-- what takes a letter out of this queue: "looks fine" is celestual_desk_
-- letter_set(id, 'live'), which changes no status and leaves the mark.
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
     and (v_q is null or l.target_handle like '%' || v_q || '%' or lower(l.body) like '%' || v_q || '%');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'target_handle', l.target_handle,
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
       and (v_q is null or l2.target_handle like '%' || v_q || '%' or lower(l2.body) like '%' || v_q || '%')
     order by l2.created_at desc
     limit v_lim offset v_off
  ) l
  left join celestual_users u on u.id = l.author_id;

  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

revoke all on function celestual_desk_letters(text, text, integer, integer) from public, anon, authenticated;
grant execute on function celestual_desk_letters(text, text, integer, integer) to service_role;

comment on function celestual_desk_letters(text, text, integer, integer) is
  '0033, 0050: the wall''s submissions, by status. ''flagged'' is the queue: live letters the classifier was unsure of that no person has decided about.';

-- ── 3. the overview counts the flagged ───────────────────────────────────────
-- celestual_desk_overview is a hundred and thirty lines the desk opens on, and
-- one more count is not a reason to write them out a third time. The function
-- that stands is renamed once, to say which sitting wrote it, and the name the
-- desk calls becomes a wrapper that asks it and adds the one figure. The
-- rename is guarded so this file runs twice without complaint.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'celestual_desk_overview')
     and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = 'celestual_desk_overview_0039') then
    alter function celestual_desk_overview() rename to celestual_desk_overview_0039;
  end if;
end $$;

create or replace function celestual_desk_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v jsonb := celestual_desk_overview_0039();
  n int;
begin
  select count(*)::int into n
    from wall_letters
   where status = 'live'
     and moderation->>'verdict' = 'review'
     and not (moderation ? 'desk');
  return jsonb_set(v, '{counts,letters_flagged}', to_jsonb(n), true);
end;
$$;

revoke all on function celestual_desk_overview_0039() from public, anon, authenticated;
revoke all on function celestual_desk_overview()      from public, anon, authenticated;
grant execute on function celestual_desk_overview_0039() to service_role;
grant execute on function celestual_desk_overview()      to service_role;

comment on function celestual_desk_overview() is
  '0039, 0050: what the desk opens on, plus `counts.letters_flagged`: the live letters the screen was unsure of that nobody has read yet.';

-- ── what did not change, said so it is not looked for ────────────────────────
-- wall_write still takes 'pending', 'live' and 'rejected', and still refuses
-- 'removed'. wall_expire still closes out a hold after seven days. The public
-- index and every read still filter on status = 'live', so a flagged letter
-- is on the wall exactly as a passed one is, and a person deciding "take it
-- down" at the desk takes it down the way a report does. The writer's notice
-- about that is wall_mine, above.

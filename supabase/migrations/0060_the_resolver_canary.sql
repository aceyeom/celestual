-- ─────────────────────────────────────────────────────────────────────────────
-- 0060: the resolver canary.
--
-- Once a day the resolver asks Apify about one account that always exists,
-- past the cache, and writes down what came back. The desk reads it, and a
-- check that failed is a line at the top of every screen there until one
-- passes.
--
-- ── why ─────────────────────────────────────────────────────────────────────
-- A handle the resolver cannot look up draws nothing, on purpose: a provider
-- failure is not a miss, and the card never says a friend does not exist
-- because Apify did not answer (docs/HANDLE-RESOLVER.md, 9). The cost of that
-- rule is that an outage is silent. A token that stopped working, an account
-- out of credit, or an actor whose answer changed shape all look exactly like
-- a quiet day, and the only record of any of them was a line in the edge
-- function's log that nobody reads. This is the record, and the desk is where
-- it is read.
--
-- ── how ─────────────────────────────────────────────────────────────────────
-- celestual-resolve takes `{ canary: true }` (the function's DAILY CHECK) and
-- runs the first look on RESOLVER_CANARY_HANDLE, @instagram unless told
-- otherwise, with no cache, no caps, no remembered miss, no row written to the
-- cache and no face stored. It opens a row here before it asks and closes it
-- with the answer: whether it passed, Apify's own status and words when it
-- did not, how long it took, how many tries, and whether the face would have
-- downloaded. The call is counted in the ledger like every other one, on the
-- `global` key alone, so the day's count is still the day's bill.
--
-- pg_cron ticks every hour and pg_net posts to the function only when
-- `resolver_canary_due` says a check is owed: a day after the last one that
-- passed, three hours after one that did not, and never while the desk has
-- the resolver switched off. So a healthy week costs seven calls, and a line
-- goes by itself within three hours of Apify answering again. Anybody can
-- post `{ canary: true }` to the function; what they get is the check that
-- was owed anyway, or nothing. The desk's "check it now" goes through
-- celestual-admin, which calls the function with the service role key, and
-- that one runs whenever it is asked, a minute apart at most.
--
-- ── the shape ───────────────────────────────────────────────────────────────
--   resolver_canary_runs        one row per check, kept ninety days
--   resolver_canary_due()       whether the hourly tick should post
--   resolver_canary_begin()     opens a row, or says why not
--   resolver_canary_finish()    closes it with the answer
--   resolver_canary_status()    what the desk reads: the state, the last
--                               check, the streak and the latest runs
--   celestual_desk_overview()   0050's, word for word, and `canary`
--   the hourly job              celestual-resolver-canary
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the record ────────────────────────────────────────────────────────────
-- `ok` is null while a check is running. A check that never closed (the
-- function was cut off, or the platform timed it out) is read as failed once
-- three minutes have passed, and is closed as one the next time a check opens.
create table if not exists resolver_canary_runs (
  id          bigserial   primary key,
  ran_at      timestamptz not null default now(),
  finished_at timestamptz,
  source      text        not null default 'cron',
  handle      text        not null,
  ok          boolean,
  status      text        not null default 'running',
  http_status integer,
  latency_ms  integer,
  attempts    smallint    not null default 0,
  face_ok     boolean,
  detail      jsonb,
  constraint resolver_canary_source_ck check (source in ('cron', 'desk')),
  constraint resolver_canary_status_ck check (status in
    ('running', 'ok', 'shape', 'missing', 'unclear', 'timeout', 'refused', 'off', 'error')),
  constraint resolver_canary_handle_ck check (char_length(handle) between 1 and 30)
);
create index if not exists resolver_canary_runs_at_idx on resolver_canary_runs (ran_at desc);
alter table resolver_canary_runs enable row level security;
revoke all on resolver_canary_runs from public, anon, authenticated;
revoke all on sequence resolver_canary_runs_id_seq from public, anon, authenticated;

comment on table resolver_canary_runs is
  '0060: one row per daily check on Apify: what the resolver asked, what came back, how long it took. Read by the desk; written only by the functions below.';

-- One row as the desk reads it. A row still open past three minutes is a
-- check that did not finish, and it says so rather than saying `running`.
create or replace function resolver_canary_json(r resolver_canary_runs)
returns jsonb
language sql stable set search_path = public as $$
  select to_jsonb(r) || case
    when r.ok is null and r.ran_at <= now() - interval '3 minutes' then jsonb_build_object(
      'ok', false, 'status', 'error',
      'detail', coalesce(r.detail, '{}'::jsonb) || jsonb_build_object('said', 'the check did not finish'))
    else '{}'::jsonb
  end
$$;

-- ── 2. whether one is owed ───────────────────────────────────────────────────
-- Asked by the hourly job before it posts anything, and by the function
-- before it opens a row for a caller without the service key. The margins
-- are ten minutes short of the day and of the three hours, because the tick
-- lands on the same minute every hour and the row is written a few seconds
-- after it: a full twenty four hours would skip a day, and a full three hours
-- would wait four.
create or replace function resolver_canary_due()
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  r resolver_canary_runs%rowtype;
begin
  if celestual_setting('resolver_enabled', 'true') <> 'true' then return false; end if;
  select * into r from resolver_canary_runs order by ran_at desc, id desc limit 1;
  if not found then return true; end if;
  if r.ok is null and r.ran_at > now() - interval '3 minutes' then return false; end if;
  if r.ok then return r.ran_at < now() - interval '23 hours 50 minutes'; end if;
  return r.ran_at < now() - interval '2 hours 50 minutes';
end;
$$;

-- ── 3. a check opens ─────────────────────────────────────────────────────────
-- `p_trusted` is the function's word that the caller held the service role
-- key, which only celestual-admin does. A trusted check runs whenever it is
-- asked, one at a time and a minute apart; anybody else gets the check that
-- was owed, or `not_due`. One at a time is held by a lock for the length of
-- this call, so two ticks that land together open one row between them.
create or replace function resolver_canary_begin(p_trusted boolean, p_source text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_trusted boolean := coalesce(p_trusted, false);
  v_id      bigint;
begin
  perform pg_advisory_xact_lock(hashtext('resolver_canary'));

  update resolver_canary_runs
     set ok = false, status = 'error', finished_at = now(),
         detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('said', 'the check did not finish')
   where ok is null and ran_at <= now() - interval '3 minutes';

  if v_trusted then
    if exists (select 1 from resolver_canary_runs where ok is null) then
      return jsonb_build_object('ok', false, 'error', 'running');
    end if;
    if exists (select 1 from resolver_canary_runs where ran_at > now() - interval '1 minute') then
      return jsonb_build_object('ok', false, 'error', 'too_soon');
    end if;
  elsif not resolver_canary_due() then
    return jsonb_build_object('ok', false, 'error', 'not_due');
  end if;

  insert into resolver_canary_runs (source, handle)
  values (case when v_trusted and p_source = 'desk' then 'desk' else 'cron' end,
          left(coalesce(nullif(celestual_norm(p_handle), ''), 'instagram'), 30))
  returning id into v_id;

  delete from resolver_canary_runs where ran_at < now() - interval '90 days';

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ── 4. and closes ────────────────────────────────────────────────────────────
-- Only a row still open, so a late answer cannot overwrite a check the next
-- one already closed as unfinished. `detail` is taken key by key and clipped,
-- so what is kept is what the desk draws and nothing an actor sent besides.
create or replace function resolver_canary_finish(
  p_id bigint, p_ok boolean, p_status text, p_http integer, p_latency_ms integer,
  p_attempts integer, p_face_ok boolean, p_detail jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d jsonb := case when jsonb_typeof(p_detail) = 'object' then p_detail else '{}'::jsonb end;
  r resolver_canary_runs%rowtype;
begin
  update resolver_canary_runs
     set ok          = coalesce(p_ok, false) and coalesce(p_status, '') = 'ok',
         status      = case when p_status in ('ok', 'shape', 'missing', 'unclear', 'timeout', 'refused', 'off', 'error')
                            then p_status else 'error' end,
         http_status = case when p_http between 100 and 599 then p_http end,
         latency_ms  = case when p_latency_ms >= 0 then least(p_latency_ms, 600000) end,
         attempts    = least(greatest(coalesce(p_attempts, 0), 0), 9),
         face_ok     = p_face_ok,
         detail      = jsonb_strip_nulls(jsonb_build_object(
                         'said',         left(d->>'said', 300),
                         'type',         left(d->>'type', 80),
                         'display_name', left(d->>'display_name', 120),
                         'answered_as',  left(d->>'answered_as', 30),
                         'verified',     case when jsonb_typeof(d->'verified') = 'boolean' then d->'verified' end,
                         'missing',      case when jsonb_typeof(d->'missing') = 'array'
                                              then (select jsonb_agg(left(x, 40)) from (
                                                     select jsonb_array_elements_text(d->'missing') as x limit 4) m)
                                         end,
                         'actor',        left(d->>'actor', 80))),
         finished_at = now()
   where id = p_id and ok is null
  returning * into r;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'run', resolver_canary_json(r));
end;
$$;

-- ── 5. what the desk reads ───────────────────────────────────────────────────
--   state          never     no check has finished
--                  failing   the last one did not pass
--                  stale     the last one passed, thirty six hours ago or more
--                  ok        the last one passed, inside the day and a half
--                  paused    never or stale while the resolver is switched
--                            off, when no check is owed. A failure stays a
--                            failure with the switch off: it is still true
--   last           the newest check with an answer, or that should have one
--   last_ok_at     the newest that passed
--   fails          how many have failed since then, and failing_since the
--                  first of them
--   running        a check is open right now
--   runs           the newest `p_limit`, up to sixty
create or replace function resolver_canary_status(p_limit integer default 7)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_lim   integer := least(greatest(coalesce(p_limit, 7), 0), 60);
  v_on    boolean := celestual_setting('resolver_enabled', 'true') = 'true';
  v_last  jsonb;
  v_ok_at timestamptz;
  v_fails integer;
  v_since timestamptz;
  v_state text;
  v_runs  jsonb;
begin
  select resolver_canary_json(r) into v_last
    from resolver_canary_runs r
   where r.ok is not null or r.ran_at <= now() - interval '3 minutes'
   order by r.ran_at desc, r.id desc
   limit 1;

  select max(ran_at) into v_ok_at from resolver_canary_runs where ok;

  select count(*)::int, min(ran_at) into v_fails, v_since
    from resolver_canary_runs
   where (ok = false or (ok is null and ran_at <= now() - interval '3 minutes'))
     and (v_ok_at is null or ran_at > v_ok_at);

  v_state := case
    when v_last is null then 'never'
    when not (v_last->>'ok')::boolean then 'failing'
    when (v_last->>'ran_at')::timestamptz < now() - interval '36 hours' then 'stale'
    else 'ok'
  end;
  if not v_on and v_state in ('never', 'stale') then v_state := 'paused'; end if;

  select coalesce(jsonb_agg(resolver_canary_json(r) order by r.ran_at desc, r.id desc), '[]'::jsonb)
    into v_runs
    from (select * from resolver_canary_runs order by ran_at desc, id desc limit v_lim) r;

  return jsonb_build_object(
    'state',         v_state,
    'enabled',       v_on,
    'now',           now(),
    'running',       exists (select 1 from resolver_canary_runs
                              where ok is null and ran_at > now() - interval '3 minutes'),
    'last',          v_last,
    'last_ok_at',    v_ok_at,
    'fails',         v_fails,
    'failing_since', v_since,
    'runs',          v_runs
  );
end;
$$;

revoke all on function resolver_canary_json(resolver_canary_runs)                   from public, anon, authenticated;
revoke all on function resolver_canary_due()                                        from public, anon, authenticated;
revoke all on function resolver_canary_begin(boolean, text, text)                   from public, anon, authenticated;
revoke all on function resolver_canary_finish(bigint, boolean, text, integer, integer, integer, boolean, jsonb)
  from public, anon, authenticated;
revoke all on function resolver_canary_status(integer)                              from public, anon, authenticated;
grant execute on function resolver_canary_json(resolver_canary_runs)                to service_role;
grant execute on function resolver_canary_due()                                     to service_role;
grant execute on function resolver_canary_begin(boolean, text, text)                to service_role;
grant execute on function resolver_canary_finish(bigint, boolean, text, integer, integer, integer, boolean, jsonb)
  to service_role;
grant execute on function resolver_canary_status(integer)                           to service_role;

comment on function resolver_canary_due() is
  '0060: whether the hourly tick owes a check: a day after one that passed, three hours after one that did not, never with the resolver switched off.';
comment on function resolver_canary_begin(boolean, text, text) is
  '0060: opens a check, or says why not (running, too_soon, not_due). Trusted means the caller held the service role key.';
comment on function resolver_canary_finish(bigint, boolean, text, integer, integer, integer, boolean, jsonb) is
  '0060: closes an open check with what Apify answered.';
comment on function resolver_canary_status(integer) is
  '0060: the daily check as the desk reads it: never, failing, stale, ok or paused, the last check, the streak, and the latest runs.';

-- ── 6. the overview carries it ───────────────────────────────────────────────
-- 0050's wrapper, word for word, with the check added, so every screen of the
-- desk has it from the one call it already makes.
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
  v := jsonb_set(v, '{counts,letters_flagged}', to_jsonb(n), true);
  return v || jsonb_build_object('canary', resolver_canary_status(7));
end;
$$;

revoke all on function celestual_desk_overview() from public, anon, authenticated;
grant execute on function celestual_desk_overview() to service_role;

comment on function celestual_desk_overview() is
  '0039, 0050, 0060: what the desk opens on, plus `counts.letters_flagged` and `canary`, the daily check on Apify.';

-- ── 7. the hourly tick ───────────────────────────────────────────────────────
-- Shaped like 0038's sweeps: nothing here without pg_cron and pg_net, and said
-- so; the job unscheduled by name and scheduled again, so a second run leaves
-- one job. It posts only when a check is owed. pg_net hangs up after five
-- seconds unless told otherwise, and a check can take a minute and a quarter
-- (two tries of thirty three seconds, and the face), so it is given two.
--
-- The project's address is written out, as it is in api/resolve.js
-- `FALLBACK_PROJECT` and in the mutual DM job (docs/MANYCHAT-MUTUAL-DM.md, 7).
-- A move to another project is a change to this line.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_cron or pg_net is not installed: the resolver canary is not scheduled here';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'celestual-resolver-canary';
  perform cron.schedule('celestual-resolver-canary', '41 * * * *', $job$
    select net.http_post(
      url                  := 'https://vwbsjwaqnycyghvwlxhd.functions.supabase.co/celestual-resolve',
      body                 := jsonb_build_object('canary', true),
      headers              := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 120000
    )
    where resolver_canary_due()
  $job$);
end $$;

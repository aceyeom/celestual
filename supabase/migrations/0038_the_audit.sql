-- ─────────────────────────────────────────────────────────────────────────────
-- 0038_the_audit.sql
--
-- The audit of 4 September. Everything in this file was found by reading the
-- shipped schema against the shipped client and then proving each claim on a
-- migrated database (scripts/verify-migrations.sh --test), so each block below
-- says what was wrong, how it was shown, and what changed. Nothing here creates
-- a table. Re-runnable: every statement is create or replace, alter, or guarded.
--
--   1  wall_index was unreadable by the browser
--   2  the one tap report always failed
--   3  one report shut a name for good
--   4  upholding a report did not take the letter down
--   5  the identity row survived every erasure
--   6  withdrawing a mutual left the other side matched to nobody
--   7  four reads were only proof gated while the flag was on
--   8  a departmental berkeley address verified and was then locked out
--   9  the resolver's ledger was append only, with the handle in plain text
--  10  two mails for one mutual, under a concurrent drain
--  11  the desk's call counts were rows, not calls
--  12  two tables kept the platform's default grants
--  13  nothing ever swept
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wall_index ─────────────────────────────────────────────────────────────
-- 0032 made the public index a security_invoker view over tables anon has no
-- grant on, so a select on it as anon answered "permission denied for table
-- wall_letters" and the wall drew zero names for everybody. The search worked,
-- because wall_search is a definer function reading the same view as its owner,
-- which is the signature that found it. The view exposes a handle, a campus, a
-- count and a timestamp and nothing else, so definer semantics are the
-- redaction, and the test suite now reads it as anon (scripts/sql/test-wall.sql).
alter view wall_index set (security_invoker = false);

-- ── 2, 3 and the reporter cap: wall_report ────────────────────────────────────
-- The screen's first step is one tap with no reason (screens/Report.jsx), and
-- the client sent p_reason as ''. coalesce only replaces a null, so '' reached
-- wall_reports_reason_ck (1 to 400 characters) and the insert raised, which the
-- client read as "it did not go through". Every one tap report failed.
--
-- And there was no cap. One campus address could take every letter off the
-- wall in a loop. Twenty an hour is more than anybody with a real grievance
-- files and fewer than a script does.
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
  if not wall_gate(v_me, l.campus) then
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

-- ── 3. wall_write ─────────────────────────────────────────────────────────────
-- "A name that has come off the wall stays off it" was checked as "any removed
-- letter under this handle", and a report sets a letter removed on the tap. So
-- one report on one of three letters to @x refused every future letter to @x,
-- while the other two stayed up, and the writer was told the name was off the
-- wall. The block now means what the sentence meant: the subject took it down
-- (wall_remove_letter files a claim in the same breath), or the desk upheld a
-- report on it. A report somebody has not looked at yet blocks nothing.
--
-- And the source code is checked here rather than trusted: a value outside the
-- pattern hit wall_letters_source_ck and the letter was lost to a 500.
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

  if exists (
    select 1 from wall_letters l
     where l.target_handle = nh and l.status = 'removed' and l.campus = p_campus
       and (exists (select 1 from wall_claims c where c.letter_id = l.id)
            or exists (select 1 from wall_reports r where r.letter_id = l.id and r.status = 'upheld'))
  ) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  insert into wall_letters (target_handle, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status);
end;
$$;

-- ── 4. celestual_desk_report_resolve ──────────────────────────────────────────
-- Upholding closed the report and touched nothing else. If the desk had put the
-- letter back up from the wall tab in the meantime, "uphold, and it stays down"
-- closed the report over a live letter. Uphold now takes it down as well.
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

  if p_uphold then
    update wall_letters
       set status = 'removed',
           moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
             'desk', jsonb_build_object(
               'status', 'removed',
               'note', nullif(btrim(coalesce(p_note, '')), ''),
               'via', 'report_upheld',
               'at', now()
             ))
     where id = v_letter and status = 'live';
  else
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

-- ── 5. the identity row, on erasure ───────────────────────────────────────────
-- celestual_erase_account and celestual_admin_delete_user deleted the DM flow's
-- records and every ping, and left celestual_users alone: the row, its
-- sessions, its letters, its claims. So the erased person's browser was still
-- signed in, and the next person to prove the same handle (Instagram recycles
-- them) was bound to the old row and answered whoami with the previous owner's
-- email and campus. Both now delete the row; the foreign keys 0030 and 0032
-- declared carry the sessions, the letters, the claims and the reveal requests
-- with it, and the merge trail that quotes the row verbatim is scrubbed.
--
-- The public opt out (celestual_suppress) is deliberately NOT changed. It takes
-- no proof, and a stranger typing a handle into /optout must be able to make
-- that handle un-pingable, not to delete the letters somebody else wrote.
create or replace function celestual_user_forget(p_handle text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_ids uuid[];
  v_n integer := 0;
begin
  if nh is null then return 0; end if;
  select coalesce(array_agg(id), '{}') into v_ids
    from celestual_users where instagram_handle = nh;
  if coalesce(array_length(v_ids, 1), 0) = 0 then return 0; end if;

  delete from celestual_user_merges
   where survivor_id = any(v_ids) or absorbed_id = any(v_ids);
  delete from celestual_merge_conflicts
   where a_id = any(v_ids) or b_id = any(v_ids);
  -- tombstones that pointed at the row keep their own history but lose the pointer
  update celestual_users set merged_into = null where merged_into = any(v_ids);
  delete from celestual_users where id = any(v_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function celestual_user_forget(text) from public, anon, authenticated;
grant execute on function celestual_user_forget(text) to service_role;

create or replace function celestual_erase_account(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_ip text;
  v_n  int;
  c_erase_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  hh := celestual_hash_handle(nh);

  v_ip := celestual_client_ip();
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:erase' and created_at > now() - interval '1 hour';
    if v_n >= c_erase_per_hour then
      return jsonb_build_object('erased', 0, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:erase', hh);
  end if;

  if not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('erased', 0, 'error', 'unverified');
  end if;

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;
  perform celestual_user_forget(nh);

  return jsonb_build_object('erased', v_erased, 'handle', nh);
end;
$$;

create or replace function celestual_admin_delete_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  hh := celestual_hash_handle(nh);

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;
  perform celestual_user_forget(nh);

  return jsonb_build_object('ok', true, 'handle', nh, 'erased', v_erased);
end;
$$;

-- ── 6. celestual_withdraw ─────────────────────────────────────────────────────
-- Withdrawing one half of a mutual deleted the caller's row and the match row
-- and left the other person's entry stamped matched_at and matched_handle. That
-- row then read as mutual forever with no counterpart card, never expired,
-- could not be renewed, and a fresh ping from the withdrawer re-matched it and
-- re-queued the mail. The counterpart goes back to standing, with a fresh
-- window if its old one ran out while it was matched.
create or replace function celestual_withdraw(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ha text;
  hb text;
  v_deleted int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;

  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('withdrawn', false, 'error', 'unverified');
  end if;

  delete from celestual_entries
   where from_handle = nf and to_hash = celestual_hash_handle(nt);
  get diagnostics v_deleted = row_count;

  update celestual_entries e
     set matched_at = null,
         matched_handle = null,
         expires_at = greatest(e.expires_at, now() + celestual_ping_window(e.from_handle))
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and e.matched_at is not null;

  ha := least(nf, nt);
  hb := greatest(nf, nt);
  delete from celestual_notifications n
   using celestual_matches m
   where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb
     and n.sent_at is null;
  delete from celestual_matches where handle_a = ha and handle_b = hb;

  return jsonb_build_object('withdrawn', v_deleted > 0);
end;
$$;

-- ── 7. the proof, unconditionally ─────────────────────────────────────────────
-- 0036 made withdraw and erase demand the proof whatever the release flag says,
-- on the argument that a destructive act cannot be looser than a read. Four
-- functions that read or change a person's own rows were still gated on the
-- flag: with require_ig_verification at false, anybody could read anybody's
-- pings and card words (celestual_ping_status), renew or clear anybody's card
-- photo, and read one. The proof is unconditional in all four now; the flag
-- keeps its one job, which is whether celestual_submit demands it.
create or replace function celestual_renew(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  v_expires timestamptz;
  v_n int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  v_expires := now() + celestual_ping_window(nf);
  update celestual_entries
     set expires_at = v_expires, renew_notified_at = null
   where from_handle = nf and to_hash = celestual_hash_handle(nt)
     and matched_at is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0,
    'expires_at', case when v_n > 0
      then to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end);
end;
$$;

create or replace function celestual_ping_status(p_from text, p_to text[], p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  v_to text[];
  v_out jsonb := '[]'::jsonb;
  t text;
  e record;
begin
  if nf is null or p_to is null then return jsonb_build_object('ok', false, 'pings', '[]'::jsonb); end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
  end if;
  v_to := p_to[1:10];

  foreach t in array v_to loop
    continue when celestual_norm(t) is null;
    select e2.id, e2.created_at, e2.expires_at, e2.matched_at, e2.card,
           e2.photo is not null as has_photo
      into e
      from celestual_entries e2
     where e2.from_handle in (select celestual_group(nf))
       and e2.to_hash = celestual_hash_handle(t)
     limit 1;
    if not found then
      v_out := v_out || jsonb_build_object('handle', celestual_norm(t), 'placed', false);
    else
      v_out := v_out || jsonb_build_object(
        'handle', celestual_norm(t),
        'placed', true,
        'time', (extract(epoch from e.created_at) * 1000)::bigint,
        'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'mutual', e.matched_at is not null,
        'card', case when e.card is null then null
                     else e.card || jsonb_build_object('photo', e.has_photo) end,
        'their_card', case when e.matched_at is not null
                           then celestual_counterpart_card(nf, t) end,
        'reachable', e.matched_at is not null or celestual_is_member(t));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;

create or replace function celestual_card_photo_put(
  p_from text, p_to text, p_proof text default null, p_photo text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  nh text;
  v_photo text;
  v_id uuid;
begin
  if nf is null or nt is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  nh := celestual_hash_handle(nt);
  v_photo := celestual_photo_clean(p_photo);

  update celestual_entries
     set photo = v_photo
   where from_handle = nf and to_hash = nh
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_ping');
  end if;
  return jsonb_build_object('ok', true, 'photo', v_photo is not null);
end;
$$;

create or replace function celestual_card_photo(
  p_me text, p_them text, p_proof text default null, p_mine boolean default true)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_photo text;
begin
  if nf is null or nt is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  if coalesce(p_mine, true) then
    select e.photo into v_photo
      from celestual_entries e
     where e.from_handle in (select celestual_group(nf))
       and e.to_hash = celestual_hash_handle(nt)
     limit 1;
  else
    v_photo := celestual_counterpart_photo(nf, nt);
  end if;

  return jsonb_build_object('ok', true, 'photo', v_photo);
end;
$$;

-- ── 8. wall_gate ──────────────────────────────────────────────────────────────
-- celestual-edu-verify accepts any host under berkeley.edu, and 0030 stores the
-- full host as the campus key. The gate compared it for equality with
-- 'berkeley.edu', so grad@eecs.berkeley.edu verified, was told the wall was
-- open, and got a null body on every letter. A subdomain of the campus is the
-- campus.
create or replace function wall_gate(p_user uuid, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from celestual_users u
      join wall_campuses c on c.slug = p_campus and c.is_open
     where u.id = p_user
       and u.merged_into is null
       and u.edu_verified_at is not null
       and (u.edu_domain = c.edu_domain or u.edu_domain like '%.' || c.edu_domain)
  );
$$;

-- ── 9. handle_search_record ───────────────────────────────────────────────────
-- 0031 pruned the resolver's ledger inside this function; 0037 rewrote it
-- without the prune and called the table append only. The rows carry the
-- signed in person's id beside the handle they typed, in plain text, which is
-- the one map docs/SECURITY.md says the server never holds. The caps count a
-- 24 hour window, so nothing older than 48 hours has a reader. Pruned here,
-- one call in twenty, and by the sweep below every hour.
create or replace function handle_search_record(p_user uuid, p_device text, p_ip text, p_handle text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into handle_search_events (key_type, key_value, handle)
  select k.key_type, k.key_value, left(p_handle, 30) from (
    values
      ('user_id',   case when p_user is not null then p_user::text end),
      ('device_id', case when p_user is null then nullif(left(p_device, 64), '') end),
      ('ip',        nullif(left(p_ip, 64), '')),
      ('global',    'all')
  ) as k(key_type, key_value)
   where k.key_value is not null and p_handle is not null and length(p_handle) > 0;
  if random() < 0.05 then
    delete from handle_search_events where created_at < now() - interval '48 hours';
  end if;
end;
$$;

-- ── 10. celestual_notify_take ─────────────────────────────────────────────────
-- celestual-notify selected the pending rows and sent before it stamped, with
-- no lease, and celestual_submit queues two rows per match. A webhook firing
-- once per insert, or a cron overlapping itself, sent the same mail twice.
-- The function now claims its rows here, under skip locked, and the claim
-- pushes next_attempt_at ten minutes out so a concurrent drain sees nothing.
-- A send that fails writes its own backoff over that; one that succeeds stamps
-- sent_at. celestual_dm_due (0023) has done it this way since it was written.
create or replace function celestual_notify_take(p_limit integer default 100)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rows jsonb;
begin
  with due as (
    select id from celestual_notifications
     where sent_at is null and failed_at is null
       and (next_attempt_at is null or next_attempt_at <= now())
     order by created_at
     limit least(greatest(coalesce(p_limit, 100), 1), 500)
     for update skip locked
  ), claimed as (
    update celestual_notifications n
       set next_attempt_at = now() + interval '10 minutes'
      from due
     where n.id = due.id
    returning n.id, n.to_email, n.self_handle, n.other_handle, n.has_card, n.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'to_email', c.to_email, 'self_handle', c.self_handle,
    'other_handle', c.other_handle, 'has_card', c.has_card, 'attempts', c.attempts
  )), '[]'::jsonb) into v_rows from claimed c;
  return v_rows;
end;
$$;
revoke all on function celestual_notify_take(integer) from public, anon, authenticated;
grant execute on function celestual_notify_take(integer) to service_role;

-- ── 11. the desk's counts ─────────────────────────────────────────────────────
-- handle_search_events holds one row per key per call, three or four rows for
-- one Apify run, and the desk summed the rows and called it the day's calls.
-- The global key is written exactly once per call since 0037, so that is the
-- number. Rows older than 48 hours are gone (9 above), so the per profile
-- count is a two day window and the desk says so.
create or replace function celestual_desk_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limits    jsonb;
  v_conflicts jsonb;
  v_scans     jsonb;
  v_campuses  jsonb;
begin
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'a_id', c.a_id, 'b_id', c.b_id,
    'detail', c.detail, 'created_at', c.created_at, 'resolved_at', c.resolved_at
  ) order by c.created_at desc), '[]'::jsonb)
  into v_conflicts
  from (select * from celestual_merge_conflicts order by created_at desc limit 100) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source_code', s.source_code, 'campus', s.campus,
    'scans', s.n, 'letters', coalesce(l.n, 0), 'last_at', s.last_at
  ) order by s.n desc), '[]'::jsonb)
  into v_scans
  from (select source_code, campus, count(*)::int as n, max(created_at) as last_at
          from wall_scans group by source_code, campus) s
  left join (select source_code, campus, count(*)::int as n
               from wall_letters where source_code is not null group by source_code, campus) l
    on l.source_code = s.source_code and l.campus = s.campus;

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
                            where key_type = 'global'
                              and created_at >= now() - interval '24 hours'),
      'conflicts_open',   (select count(*) from celestual_merge_conflicts where resolved_at is null)
    )
  );
end;
$$;

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
    'searches', (select count(*)::int from handle_search_events e
                  where e.handle = p.handle and e.key_type = 'global')
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

-- ── 12. the two tables with the platform's defaults ───────────────────────────
-- 0029 transcribed them from production without tidying, and the platform's
-- default privileges gave anon and authenticated select and insert on both. RLS
-- with no policy hides the rows today; the first policy anybody adds would
-- expose the address to handle map. Revoked like every other table.
revoke all on celestual_email_identities from anon, authenticated;
revoke all on celestual_login_links     from anon, authenticated;

-- ── 13. the sweep ─────────────────────────────────────────────────────────────
-- Four functions had no caller anywhere: celestual_purge_expired (the sixty day
-- broom SECURITY.md rests on), wall_expire, celestual_sessions_prune and
-- handle_search_prune. celestual-remind was written to run the first and was
-- never deployed. On a platform with pg_cron they are scheduled here, hourly,
-- each as its own job so one failing cannot stop the others; anywhere else this
-- block does nothing and says so.
do $$
declare j text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed: the four sweeps are not scheduled here';
    return;
  end if;
  foreach j in array array[
    'celestual-purge-expired', 'celestual-wall-expire',
    'celestual-sessions-prune', 'celestual-search-prune'
  ] loop
    perform cron.unschedule(jobid) from cron.job where jobname = j;
  end loop;
  perform cron.schedule('celestual-purge-expired', '7 * * * *',  'select celestual_purge_expired()');
  perform cron.schedule('celestual-wall-expire',   '13 * * * *', 'select wall_expire()');
  perform cron.schedule('celestual-sessions-prune','19 * * * *', 'select celestual_sessions_prune()');
  perform cron.schedule('celestual-search-prune',  '23 * * * *', 'select handle_search_prune()');
end $$;

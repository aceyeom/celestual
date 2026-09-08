-- ─────────────────────────────────────────────────────────────────────────────
-- 0046_the_opt_out_reaches_the_wall.sql
--
-- One act, both surfaces. Re-runnable: every statement is create or replace.
--
--   1  wall_name_shut: a handle on the opt out list is shut, on every campus
--   2  celestual_suppress: the same call takes the name off the wall
--   3  the two desk paths that could put such a letter back up, refusing to
--
-- ── what was wrong ───────────────────────────────────────────────────────────
-- The opt out is the one irreversible promise this product makes to somebody
-- who never asked to be in it: the handle can never be entered again, and
-- everything pointing at it is erased. It reached half the product.
--
-- On Main it erased the pings both ways, the mutuals, the membership, the
-- verifications, the mail and the identity row. On the wall it erased what
-- that person had WRITTEN, by way of the cascade off celestual_users, and left
-- every letter written ABOUT them standing on a public wall under their name.
--
-- So the one person the opt out exists for could take their @ off, read a
-- screen saying every ping was gone, and then find their own name still
-- drifting in the inscription with four letters under it. Two doors with two
-- answers to the same question is not two features. It is a promise that is
-- untrue on one of the two surfaces a person meets it on.
--
-- ── what "off the wall" means here ───────────────────────────────────────────
-- The same thing it means when the person themselves does it from
-- /berkeley/remove, and by the same mechanism: the letters go to `removed`,
-- which takes them out of wall_index, out of the search, out of every read,
-- and off the count. Nothing is destroyed, because a takedown that destroys
-- what it took down is one no review can ever be right about, and what it
-- would destroy belongs to authors who are not in the room.
--
-- What is new is that this one cannot be undone. A desk can put back a letter
-- it took down in a report; it cannot put back a letter whose subject has left
-- the product entirely, because there is nobody left to ask and the answer was
-- already given. Section 3 is that rule, on both paths that could reach it.
--
-- ── and the name stays shut ──────────────────────────────────────────────────
-- Taking the letters down is not enough on its own: the next person to write
-- to that handle would put the name straight back on the wall. wall_write
-- already asks wall_name_shut before it writes, so the opt out list is now the
-- first thing that function looks at. A suppressed handle is shut on every
-- campus, whether or not it has ever had a letter, which is the same rule the
-- suppression list already enforces on Main for a handle nobody ever pinged.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wall_name_shut ────────────────────────────────────────────────────────
-- 0039's body, with the opt out list in front of it. The campus argument is
-- deliberately not consulted by the new branch: an opt out is a person saying
-- they want nothing to do with this product, and it does not hold at Berkeley
-- and lapse at the next campus.
create or replace function wall_name_shut(p_handle text, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from celestual_suppressions s
            where s.handle_hash = celestual_hash_handle(p_handle))
      or exists (
           select 1 from wall_letters l
            where l.target_handle = celestual_norm(p_handle) and l.campus = p_campus
              and l.status = 'removed'
              and (exists (select 1 from wall_claims c where c.letter_id = l.id)
                   or exists (select 1 from wall_reports r where r.letter_id = l.id and r.status = 'upheld')
                   or l.moderation #>> '{desk,via}' in ('desk_shut', 'optout')))
$$;
revoke all on function wall_name_shut(text, text) from public, anon, authenticated;
grant execute on function wall_name_shut(text, text) to service_role;

comment on function wall_name_shut(text, text) is
  '0046: shut if the handle is on the opt out list, or if a letter to it came down by claim, upheld report, desk or opt out.';

-- ── 2. celestual_suppress ────────────────────────────────────────────────────
-- 0039's body, unchanged down to the last delete, plus the wall. The order
-- matters: the letters written ABOUT the handle are taken down here, and the
-- letters written BY it go a line later with celestual_user_forget, which
-- deletes the identity row that wall_letters.author_id cascades from.
create or replace function celestual_suppress(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_ip text;
  v_n  int;
  v_wall int := 0;
  c_suppress_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  hh := celestual_hash_handle(nh);

  v_ip := celestual_client_ip();
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:suppress' and created_at > now() - interval '1 hour';
    if v_n >= c_suppress_per_hour then
      return jsonb_build_object('suppressed', null, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:suppress', hh);
  end if;

  -- The proof, before a single row is read. A refusal must look the same
  -- whether or not the handle was ever on the books.
  if not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('suppressed', null, 'error', 'unverified');
  end if;

  insert into celestual_suppressions (handle_hash, reason, kind)
  values (hh, 'asked never to be entered', 'optout')
  on conflict (handle_hash) do update set kind = 'optout', reason = 'asked never to be entered';

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
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

  -- ── the wall, on every campus ──
  -- Rejected letters are left alone: they were never published, they are the
  -- moderation record of something that failed the screen, and moving one to
  -- `removed` would say it had been on the wall.
  if to_regclass('public.wall_letters') is not null then
    update wall_letters
       set status = 'removed',
           moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
             'desk', coalesce(moderation -> 'desk', '{}'::jsonb) || jsonb_build_object(
               'status', 'removed',
               'via', 'optout',
               'at', now()
             ))
     where target_handle = nh and status <> 'rejected';
    get diagnostics v_wall = row_count;
  end if;

  -- Last, because the cascade off this row is what takes the letters this
  -- handle wrote, its hearts, its claims and its reports with it.
  perform celestual_user_forget(nh);

  return jsonb_build_object('suppressed', nh, 'wall_letters', v_wall);
end;
$$;

revoke all on function celestual_suppress(text, text) from public;
grant execute on function celestual_suppress(text, text) to anon, authenticated;

comment on function celestual_suppress(text, text) is
  '0046: the opt out, proof gated, and it reaches both surfaces. Main is erased, every letter to the handle comes off the wall, and the name stays shut on every campus.';

-- ── 3. the two ways back up, closed for an opt out ───────────────────────────
-- celestual_desk_letter_set is the desk's general escape from the screen: it
-- can move any letter to any status, which is what publishing a held letter
-- is. celestual_desk_report_resolve restores a letter when a report is
-- dismissed. Both are right, and neither may reach a letter whose subject has
-- taken their handle off the product.
create or replace function celestual_desk_letter_set(p_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_l wall_letters;
begin
  if p_status not in ('pending', 'live', 'rejected', 'removed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select * into v_l from wall_letters where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if p_status in ('pending', 'live')
     and exists (select 1 from celestual_suppressions s
                  where s.handle_hash = celestual_hash_handle(v_l.target_handle)) then
    return jsonb_build_object('ok', false, 'error', 'optout');
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

  return jsonb_build_object('ok', true, 'id', v_l.id, 'status', v_l.status, 'moderation', v_l.moderation);
end;
$$;

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
  v_target text;
  v_shut boolean := false;
  v_restored boolean := false;
  v_closed integer;
begin
  select * into v_r from wall_reports where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_r.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'already_resolved'); end if;

  v_letter := v_r.letter_id;
  select l.target_handle into v_target from wall_letters l where l.id = v_letter;
  v_shut := exists (select 1 from celestual_suppressions s
                     where s.handle_hash = celestual_hash_handle(v_target));

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
  elsif not v_shut then
    -- Dismissing a report puts the letter back, unless the person it is about
    -- has left. Then the report is still answered and the letter stays down:
    -- the opt out already decided this letter, and it decided it for good.
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
    'restored', v_restored,
    'optout', v_shut
  );
end;
$$;

revoke all on function celestual_desk_letter_set(uuid, text, text)          from public, anon, authenticated;
revoke all on function celestual_desk_report_resolve(uuid, boolean, text)   from public, anon, authenticated;
grant execute on function celestual_desk_letter_set(uuid, text, text)        to service_role;
grant execute on function celestual_desk_report_resolve(uuid, boolean, text) to service_role;

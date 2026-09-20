-- ─────────────────────────────────────────────────────────────────────────────
-- 0054: reveal night.
--
-- A mutual used to open the instant the second ping landed: celestual_submit
-- stamped both rows, queued the mail and the DM, and handed the placer the
-- other card in the same call. It opens on Saturday night now. A pair that
-- becomes mutual is held, and both people find out at the next reveal night,
-- one instant for everybody, Saturday at nine in the evening in California by
-- default.
--
-- ── the rule ────────────────────────────────────────────────────────────────
-- A second timestamp beside matched_at: reveal_at. One predicate, written once
-- in celestual_revealed() and used by every reader:
--
--   revealed  =  matched_at is not null and (reveal_at is null or reveal_at <= now())
--
-- Null means revealed, so every match already in the database stays open and
-- nothing that was true yesterday stops being true.
--
-- ── what must not leak ──────────────────────────────────────────────────────
-- Until the night, a held pair has to look and behave exactly like two
-- standing pings, to both people. So:
--
--   the sky            the row reads standing, with its days left
--   the slot meter     still counts it. The slot frees on the night
--   renewing           works, like any standing ping. A refusal would be the leak
--   letting go         works. The other side goes quietly back to unmatched and
--                      their days left do not move
--   placing again      resets the window like any re-placement
--   the mail, the DM   written on the night by celestual_reveal_sweep(), not at
--                      the match, so nothing lands early
--   celestual_submit   answers a held match as an ordinary placement. Nothing
--                      about the other side rides the wire
--
-- One honest edge. A ping in its last week that gets matched has its lapse
-- moved out to the night (greatest(expires_at, reveal_at)), so it can never
-- read "lapses today" for days without lapsing. Days left can only go up.
--
-- ── the night, and where it is set ──────────────────────────────────────────
-- Four rows in celestual_settings, all on the desk:
--
--   reveal_night   'true' | 'false'. Off, a match opens at once, as before.
--   reveal_dow     0 (Sunday) to 6. Default 6.
--   reveal_hour    0 to 23. Default 21.
--   reveal_tz      an IANA zone. Default America/Los_Angeles.
--
-- celestual_next_reveal() does the arithmetic on the wall clock of that zone
-- and converts back, which is what keeps it right across a daylight change. A
-- change at the desk takes for matches made after it; a pair already scheduled
-- keeps its night.
--
-- ── the night itself ────────────────────────────────────────────────────────
-- Nothing has to run for the reveal to happen: the sky reads reveal_at against
-- now(). What has to run is the mail and the DM, and celestual_reveal_sweep()
-- writes those rows for every match whose night has come, once, and the insert
-- webhooks that already drive celestual-notify and celestual-mutual-dm fire
-- exactly as they do today. It is scheduled with pg_cron every five minutes
-- where pg_cron exists, and the two functions call it first thing as well, so
-- a missing cron delays a mail by at most one webhook.
--
-- Re-runnable. Safe on top of 0001 to 0053.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the columns ──────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists reveal_at timestamptz;
alter table celestual_matches add column if not exists reveal_at timestamptz;
alter table celestual_matches add column if not exists queued_at timestamptz;

create index if not exists celestual_matches_unqueued_idx
  on celestual_matches (reveal_at) where queued_at is null;

comment on column celestual_entries.reveal_at is
  '0054: when this pair opens. Null on a row matched before reveal night existed, which reads as open.';
comment on column celestual_matches.queued_at is
  '0054: when the mail and the DM for this pair were written. Null until the night.';

-- ── 2. the rule ─────────────────────────────────────────────────────────────
create or replace function celestual_revealed(p_matched timestamptz, p_reveal timestamptz)
returns boolean
language sql stable as $$
  select p_matched is not null and (p_reveal is null or p_reveal <= now())
$$;

revoke all on function celestual_revealed(timestamptz, timestamptz) from public, anon, authenticated;

comment on function celestual_revealed(timestamptz, timestamptz) is
  '0054: whether a matched pair is open. Null reveal_at reads as open.';

-- What this person has standing: everything out that is not an open mutual.
-- A held pair counts, on purpose; that is the whole of the meter not moving.
create or replace function celestual_standing_count(h text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
    from celestual_entries e
   where e.from_handle in (select celestual_group(h))
     and not celestual_revealed(e.matched_at, e.reveal_at)
     and e.expires_at > now()
$$;

revoke all on function celestual_standing_count(text) from public, anon, authenticated;

-- ── 3. the night, and where it is set ───────────────────────────────────────
create or replace function celestual_reveal_on() returns boolean
language sql stable security definer set search_path = public as $$
  select celestual_setting('reveal_night', 'true') = 'true'
$$;

create or replace function celestual_reveal_tz() returns text
language sql stable security definer set search_path = public as $$
  select celestual_setting('reveal_tz', 'America/Los_Angeles')
$$;

create or replace function celestual_reveal_dow() returns int
language sql stable security definer set search_path = public as $$
  select least(greatest(celestual_setting_int('reveal_dow', 6), 0), 6)
$$;

create or replace function celestual_reveal_hour() returns int
language sql stable security definer set search_path = public as $$
  select least(greatest(celestual_setting_int('reveal_hour', 21), 0), 23)
$$;

-- The next night strictly after p_from. Done on the wall clock of the zone and
-- turned back into an instant with `at time zone`, so the hour is the hour on
-- the wall whichever side of a daylight change the week falls. A zone name the
-- row holds that PostgreSQL does not know falls back to Los Angeles rather
-- than refusing a ping.
create or replace function celestual_next_reveal(p_from timestamptz default now())
returns timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz   text := celestual_reveal_tz();
  v_dow  int  := celestual_reveal_dow();
  v_hour int  := celestual_reveal_hour();
  v_local timestamp;
  v_cand  timestamp;
  v_days  int;
begin
  if not celestual_reveal_on() then return p_from; end if;
  begin
    v_local := p_from at time zone v_tz;
  exception when others then
    v_tz := 'America/Los_Angeles';
    v_local := p_from at time zone v_tz;
  end;
  v_days := (v_dow - extract(dow from v_local)::int + 7) % 7;
  v_cand := date_trunc('day', v_local) + make_interval(days => v_days, hours => v_hour);
  if v_cand <= v_local then v_cand := v_cand + interval '7 days'; end if;
  return v_cand at time zone v_tz;
end;
$$;

revoke all on function celestual_reveal_on()   from public, anon, authenticated;
revoke all on function celestual_reveal_tz()   from public, anon, authenticated;
revoke all on function celestual_reveal_dow()  from public, anon, authenticated;
revoke all on function celestual_reveal_hour() from public, anon, authenticated;
revoke all on function celestual_next_reveal(timestamptz) from public, anon, authenticated;
grant execute on function celestual_reveal_on()   to service_role;
grant execute on function celestual_reveal_tz()   to service_role;
grant execute on function celestual_reveal_dow()  to service_role;
grant execute on function celestual_reveal_hour() to service_role;
grant execute on function celestual_next_reveal(timestamptz) to service_role;

-- What the sky draws for everybody who is signed in, whether or not anything
-- is waiting for them. The same answer for everyone, which is what makes it
-- safe to draw: no personal data, nothing about any pair.
create or replace function celestual_reveal_night()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'enabled', celestual_reveal_on(),
    'next', case when celestual_reveal_on()
      then to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
    'tz',   celestual_reveal_tz(),
    'dow',  celestual_reveal_dow(),
    'hour', celestual_reveal_hour());
end;
$$;

revoke all on function celestual_reveal_night() from public;
grant execute on function celestual_reveal_night() to anon, authenticated;

comment on function celestual_reveal_night() is
  '0054: when the next reveal night is. The same answer for everyone; nothing personal rides on it.';

-- ── 4. the desk holds it ────────────────────────────────────────────────────
-- As 0053 wrote them, with the four keys added.
create or replace function celestual_desk_settings()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'ok', true,
    'settings', jsonb_build_object(
      'require_ig_verification', celestual_setting('require_ig_verification', 'false'),
      'resolver_enabled',        celestual_setting('resolver_enabled', 'true'),
      'wall_letter_cap',         celestual_setting('wall_letter_cap', 'true'),
      'wall_letter_allowance',   celestual_setting_int('wall_letter_allowance', 3),
      'billing_enabled',         celestual_setting('billing_enabled', 'false'),
      'billing_plan_enabled',    celestual_setting('billing_plan_enabled', 'false'),
      'reveal_night',            celestual_setting('reveal_night', 'true'),
      'reveal_dow',              celestual_reveal_dow(),
      'reveal_hour',             celestual_reveal_hour(),
      'reveal_tz',               celestual_reveal_tz(),
      'cap_user',                celestual_setting_int('cap_user', 20),
      'cap_device',              celestual_setting_int('cap_device', 20),
      'cap_ip',                  celestual_setting_int('cap_ip', 200),
      'cap_global',              celestual_setting_int('cap_global', 1000)
    ),
    'defaults', jsonb_build_object(
      'require_ig_verification', 'false',
      'resolver_enabled', 'true',
      'wall_letter_cap', 'true',
      'wall_letter_allowance', 3,
      'billing_enabled', 'false',
      'billing_plan_enabled', 'false',
      'reveal_night', 'true',
      'reveal_dow', 6, 'reveal_hour', 21, 'reveal_tz', 'America/Los_Angeles',
      'cap_user', 20, 'cap_device', 20, 'cap_ip', 200, 'cap_global', 1000
    ),
    'next_reveal', case when celestual_reveal_on()
      then to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
    'updated', (
      select coalesce(jsonb_object_agg(key, updated_at), '{}'::jsonb)
        from celestual_settings
       where key in ('require_ig_verification', 'resolver_enabled',
                     'wall_letter_cap', 'wall_letter_allowance',
                     'billing_enabled', 'billing_plan_enabled',
                     'reveal_night', 'reveal_dow', 'reveal_hour', 'reveal_tz',
                     'cap_user', 'cap_device', 'cap_ip', 'cap_global')
    )
  );
end;
$$;

create or replace function celestual_desk_setting_set(p_key text, p_value text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_value, ''));
  v_probe timestamp;
begin
  if p_key in ('require_ig_verification', 'resolver_enabled', 'wall_letter_cap',
               'billing_enabled', 'billing_plan_enabled', 'reveal_night') then
    if v not in ('true', 'false') then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  elsif p_key in ('cap_user', 'cap_device', 'cap_ip', 'cap_global') then
    if v !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  -- One letter is the smallest allowance worth having (0052).
  elsif p_key = 'wall_letter_allowance' then
    if v !~ '^[1-9][0-9]{0,5}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  elsif p_key = 'reveal_dow' then
    if v !~ '^[0-6]$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  elsif p_key = 'reveal_hour' then
    if v !~ '^([0-9]|1[0-9]|2[0-3])$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  -- A zone the server can convert with. Asked of PostgreSQL rather than
  -- matched against a list, so a name it would refuse later is refused here.
  elsif p_key = 'reveal_tz' then
    if v !~ '^[A-Za-z0-9_+/-]{1,64}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
    begin
      v_probe := now() at time zone v;
    exception when others then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end;
  else
    return jsonb_build_object('ok', false, 'error', 'bad_key');
  end if;

  insert into celestual_settings (key, value, updated_at) values (p_key, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true, 'key', p_key, 'value', v);
end;
$$;

revoke all on function celestual_desk_settings()               from public, anon, authenticated;
revoke all on function celestual_desk_setting_set(text, text)  from public, anon, authenticated;
grant execute on function celestual_desk_settings()                to service_role;
grant execute on function celestual_desk_setting_set(text, text)   to service_role;

-- ── 5. celestual_submit, holding the match ──────────────────────────────────
-- As 0023 wrote it, with reveal_at set on the match, the standing count asking
-- celestual_standing_count, the frozen window only on an open pair, the mail
-- and the DM written only when the night is already now, and nothing about
-- the other side in the answer until the night.
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
  v_reveal timestamptz;
  v_open boolean := false;                   -- mutual, and the night is now
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

  -- ── HANDLE OWNERSHIP (Instagram DM verification) ─────────────────────
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;

  -- Never record a ping against an opted-out handle (checked by hash).
  if exists (select 1 from celestual_suppressions where handle_hash = nh) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- The cap and the standing window are this person's (0021, 0053): the free
  -- two plus anything bought, no ceiling on a pass, six months on a pass.
  v_cap := celestual_cap_for(nf);
  v_expires := now() + celestual_ping_window(nf);

  v_ip := celestual_client_ip();

  -- Trailing-hour rate limits (IP / from / to), the burst backstop.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  select count(*) into v_ton from celestual_attempts
   where to_handle = nh and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Re-placing an existing pair is free: it refreshes the email and the card
  -- and renews the clock (re-placing IS still feeling it).
  select id into v_existing_id
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

  if v_existing_id is null then
    -- ── THE SLOT RULE (per person). A held pair counts as standing. ──
    v_standing := celestual_standing_count(nf);
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

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
    delete from celestual_placements where created_at < now() - interval '40 days';
  end if;

  -- Record or refresh the ping. The window is frozen only on an OPEN pair; a
  -- held pair re-placed resets like any standing ping, which is what a person
  -- who does not know it is held would expect to see.
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, card, expires_at)
  values (nf, nh, nt, ne, nc, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        card       = coalesce(excluded.card, celestual_entries.card),
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_revealed(celestual_entries.matched_at, celestual_entries.reveal_at)
                          then celestual_entries.expires_at
                          else greatest(excluded.expires_at, coalesce(celestual_entries.reveal_at, excluded.expires_at)) end,
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
    v_reveal := celestual_next_reveal(now());
    v_open := v_reveal <= now();
    select g into v_counterpart
      from celestual_group(nf) g
     where celestual_hash_handle(g) = reciprocal_tohash
     limit 1;

    -- Both rows: matched, scheduled, and never lapsing before the night. A
    -- pair already scheduled keeps its night (coalesce).
    update celestual_entries
       set matched_at = coalesce(matched_at, now()),
           matched_handle = nt,
           reveal_at = coalesce(reveal_at, v_reveal),
           expires_at = greatest(expires_at, coalesce(reveal_at, v_reveal))
     where from_handle = nf and to_hash = nh;
    update celestual_entries
       set matched_at = coalesce(matched_at, now()),
           matched_handle = coalesce(matched_handle, v_counterpart),
           reveal_at = coalesce(reveal_at, v_reveal),
           expires_at = greatest(expires_at, coalesce(reveal_at, v_reveal))
     where id = reciprocal_id;

    ha := least(nf, reciprocal_from);
    hb := greatest(nf, reciprocal_from);
    insert into celestual_matches (handle_a, handle_b, reveal_at) values (ha, hb, v_reveal)
      on conflict (handle_a, handle_b) do nothing
      returning id into v_match_id;

    -- The mail and the DM. Written here only when the night is already now
    -- (reveal night off); otherwise celestual_reveal_sweep() writes them on
    -- the night, from the rows, and nothing about the pair leaves this call.
    if v_match_id is not null and v_open then
      select e.card into v_my_card
        from celestual_entries e
       where e.from_handle = nf and e.to_hash = nh;

      -- Addresses. Only ever one a person stored themselves (0023).
      select r.email into v_my_email from celestual_recovery r where r.handle = nf;
      v_my_email := coalesce(v_my_email, ne);
      v_their_email := coalesce(
        reciprocal_email,
        (select r.email from celestual_recovery r where r.handle = reciprocal_from));

      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_their_email, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null, now()
       where v_their_email is not null;

      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_my_email, nf, nt, reciprocal_card is not null, now()
       where v_my_email is not null;

      perform celestual_dm_queue(v_match_id, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null);
      perform celestual_dm_queue(v_match_id, nf, nt, reciprocal_card is not null);

      update celestual_matches set queued_at = now() where id = v_match_id;
    end if;
  end if;

  v_standing := celestual_standing_count(nf);

  return jsonb_build_object(
    'recorded', true,
    -- A held match answers exactly as a placement that matched nothing.
    'mutual', v_mutual and v_open,
    'match', case when v_mutual and v_open then nt else null end,
    'match_card', case when v_mutual and v_open then reciprocal_card else null end,
    'reachable', (v_mutual and v_open) or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap)
  );
end;
$$;

grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;

-- ── 6. the readers ──────────────────────────────────────────────────────────
-- 6a. the sky's rows (as 0042, with the rule). A held row is a standing row:
-- the name the person typed, no other card, no seal.
create or replace function celestual_my_pings(p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_pings jsonb;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'handle', r.shown,
           'time',   (extract(epoch from r.created_at) * 1000)::bigint,
           'expires_at', to_char(r.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', r.open,
           'revealed_at', case when r.open
             then to_char(greatest(r.matched_at, coalesce(r.reveal_at, r.matched_at)) at time zone 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
           'card', case when r.card is null then null
                        else r.card || jsonb_build_object('photo', r.has_photo) end,
           'their_card', case when r.open then celestual_counterpart_card(nh, r.shown) end,
           'known',        p.handle is not null,
           'display_name', coalesce(p.display_name, ''),
           'is_verified',  coalesce(p.is_verified, false),
           'avatar_path',  p.avatar_path
         ) order by r.created_at), '[]'::jsonb)
    into v_pings
    from (
      select e.created_at, e.expires_at, e.matched_at, e.reveal_at, e.card,
             e.photo is not null as has_photo,
             celestual_revealed(e.matched_at, e.reveal_at) as open,
             case when celestual_revealed(e.matched_at, e.reveal_at)
                  then coalesce(e.matched_handle, e.to_handle)
                  else coalesce(e.to_handle, e.matched_handle) end as shown
        from celestual_entries e
       where e.from_handle in (select celestual_group(nh))
         and (e.matched_at is not null or e.expires_at > now())
    ) r
    left join ig_profiles p on p.handle = r.shown;

  return jsonb_build_object('ok', true, 'pings', v_pings);
end;
$$;

grant execute on function celestual_my_pings(text, text) to anon, authenticated;

-- 6b. the counterpart's card (as 0025, sealed until the night)
create or replace function celestual_counterpart_card(p_me text, p_them text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_card jsonb;
  v_has boolean := false;
begin
  if nf is null or nt is null then return null; end if;
  select e.card, e.photo is not null into v_card, v_has
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and celestual_revealed(e.matched_at, e.reveal_at)
   order by e.created_at asc
   limit 1;
  if v_card is null then return null; end if;
  return v_card || jsonb_build_object('photo', coalesce(v_has, false));
end;
$$;

revoke all on function celestual_counterpart_card(text, text) from public, anon, authenticated;

-- 6c. the status read (as 0038, with the rule)
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
           e2.photo is not null as has_photo,
           celestual_revealed(e2.matched_at, e2.reveal_at) as open
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
        'mutual', e.open,
        'card', case when e.card is null then null
                     else e.card || jsonb_build_object('photo', e.has_photo) end,
        'their_card', case when e.open then celestual_counterpart_card(nf, t) end,
        'reachable', e.open or celestual_is_member(t));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;

grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;

-- 6d. the two slot reads, counting a held pair as standing
create or replace function celestual_slots_for(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
begin
  if nf is null or not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('standing', 0, 'cap', celestual_free_cap());
  end if;
  return jsonb_build_object('standing', celestual_standing_count(nf), 'cap', celestual_cap_for(nf));
end;
$$;

grant execute on function celestual_slots_for(text, text) to anon, authenticated;

create or replace function celestual_billing_status(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_until timestamptz;
  v_plan text;
begin
  if nf is null or not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object(
      'ok', false,
      'enabled', celestual_billing_on(),
      'plan_offered', celestual_billing_plan_on(),
      'standing', 0, 'cap', celestual_free_cap(),
      'free_cap', celestual_free_cap(), 'extra', 0, 'plan', null, 'ping_days', 60);
  end if;

  v_until := celestual_plan_until(nf);
  v_plan := case when v_until is not null and v_until > now() then 'steady' end;

  return jsonb_build_object(
    'ok', true,
    'enabled', celestual_billing_on(),
    'plan_offered', celestual_billing_plan_on(),
    'standing', celestual_standing_count(nf),
    'cap', celestual_cap_for(nf),
    'free_cap', celestual_free_cap(),
    'extra', celestual_extra_slots(nf),
    'plan', v_plan,
    'plan_until', case when v_plan is not null
      then to_char(v_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
    'ping_days', (extract(epoch from celestual_ping_window(nf)) / 86400)::int
  );
end;
$$;

grant execute on function celestual_billing_status(text, text) to anon, authenticated;

-- ── 7. renewing, and letting go ─────────────────────────────────────────────
-- A held row renews like a standing one; a refusal here would say it is held.
-- The window a renewal grants is sixty days or more, so it never lands before
-- the night.
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
     set expires_at = greatest(v_expires, coalesce(reveal_at, v_expires)), renew_notified_at = null
   where from_handle = nf and to_hash = celestual_hash_handle(nt)
     and not celestual_revealed(matched_at, reveal_at);
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0,
    'expires_at', case when v_n > 0
      then to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end);
end;
$$;

grant execute on function celestual_renew(text, text, text) to anon, authenticated;

-- Letting go of a held pair puts the other side quietly back to unmatched, and
-- leaves their days left alone: nothing on their sky may move. An open pair
-- keeps 0038's behaviour, a fresh window for the side that was left.
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
     set expires_at = case when celestual_revealed(e.matched_at, e.reveal_at)
                           then greatest(e.expires_at, now() + celestual_ping_window(e.from_handle))
                           else e.expires_at end,
         matched_at = null,
         matched_handle = null,
         reveal_at = null
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

grant execute on function celestual_withdraw(text, text, text) to anon, authenticated;

-- ── 8. the desk sees the night ──────────────────────────────────────────────
-- As 0039, plus `reveal_at` and `open` on every row. The desk is the operator:
-- a held pair is listed as mutual with the night it opens on.
create or replace function celestual_desk_pings(
  p_state  text default null,
  p_query  text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s   text := nullif(btrim(coalesce(p_state, '')), '');
  v_q   text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('standing', 'mutual', 'lapsed') then
    return jsonb_build_object('ok', false, 'error', 'bad_state');
  end if;
  if v_q is not null then v_q := lower(regexp_replace(v_q, '^@', '')); end if;

  select count(*) into v_n from celestual_entries e
   where (v_s is null
          or (v_s = 'standing' and e.matched_at is null and e.expires_at > now())
          or (v_s = 'mutual'   and e.matched_at is not null)
          or (v_s = 'lapsed'   and e.matched_at is null and e.expires_at <= now()))
     and (v_q is null or e.from_handle like '%' || v_q || '%'
          or (e.matched_at is not null and e.matched_handle like '%' || v_q || '%'));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'from_handle', e.from_handle,
    'state', case when e.matched_at is not null then 'mutual'
                  when e.expires_at > now() then 'standing' else 'lapsed' end,
    'matched_handle', case when e.matched_at is not null then e.matched_handle end,
    'matched_at', e.matched_at,
    'reveal_at', e.reveal_at,
    'open', celestual_revealed(e.matched_at, e.reveal_at),
    'created_at', e.created_at,
    'expires_at', e.expires_at,
    'days_left', greatest(0, ceil(extract(epoch from (e.expires_at - now())) / 86400))::int,
    'has_line', e.card is not null,
    'has_email', e.from_email is not null,
    'reminded', e.renew_notified_at is not null
  ) order by e.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from celestual_entries e2
     where (v_s is null
            or (v_s = 'standing' and e2.matched_at is null and e2.expires_at > now())
            or (v_s = 'mutual'   and e2.matched_at is not null)
            or (v_s = 'lapsed'   and e2.matched_at is null and e2.expires_at <= now()))
       and (v_q is null or e2.from_handle like '%' || v_q || '%'
            or (e2.matched_at is not null and e2.matched_handle like '%' || v_q || '%'))
     order by e2.created_at desc
     limit v_lim offset v_off
  ) e;

  return jsonb_build_object(
    'ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows,
    'counts', jsonb_build_object(
      'standing',   (select count(*) from celestual_entries where matched_at is null and expires_at > now()),
      'mutual',     (select count(*) from celestual_entries where matched_at is not null),
      'held',       (select count(*) from celestual_entries where matched_at is not null and not celestual_revealed(matched_at, reveal_at)),
      'pairs',      (select count(*) from celestual_matches),
      'lapsed',     (select count(*) from celestual_entries where matched_at is null and expires_at <= now()),
      'placed_7d',  (select count(*) from celestual_entries where created_at > now() - interval '7 days'),
      'mutual_7d',  (select count(*) from celestual_matches where matched_at > now() - interval '7 days'),
      'lapsing_7d', (select count(*) from celestual_entries
                      where matched_at is null and expires_at > now()
                        and expires_at <= now() + interval '7 days'),
      'with_line',  (select count(*) from celestual_entries where card is not null),
      'senders',    (select count(distinct from_handle) from celestual_entries)
    )
  );
end;
$$;

revoke all on function celestual_desk_pings(text, text, integer, integer) from public, anon, authenticated;
grant execute on function celestual_desk_pings(text, text, integer, integer) to service_role;

-- ── 9. the night: the sweep ─────────────────────────────────────────────────
-- For every match whose night has come and whose news has not been written:
-- the two mail rows and the two DM rows, exactly as celestual_submit used to
-- write them at the match, from the rows as they stand now. Then queued_at,
-- so it is written once. The insert webhooks on both queues fire as they
-- always have, so the mail and the push go out on the night, and the reply
-- path carries the DM to anybody whose window is shut.
--
-- SERVICE ROLE ONLY. Run by pg_cron every five minutes, and by celestual-notify
-- and celestual-mutual-dm first thing, so a missing cron costs one webhook.
-- Returns: { ok, queued }
create or replace function celestual_reveal_sweep()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m record;
  v_n int := 0;
  a_card jsonb; a_email text; a_to text;
  b_card jsonb; b_email text; b_to text;
begin
  for m in
    select id, handle_a, handle_b
      from celestual_matches
     where queued_at is null
       and reveal_at is not null
       and reveal_at <= now()
     order by reveal_at
       for update skip locked
  loop
    -- a's row on b, and b's row on a. `matched_handle` is the name each one
    -- typed, which is the name the mail addresses the other side by.
    select e.card, e.from_email, e.matched_handle into a_card, a_email, a_to
      from celestual_entries e
     where e.from_handle = m.handle_a and e.matched_at is not null
       and e.to_hash in (select celestual_hash_handle(g) from celestual_group(m.handle_b) g)
     order by e.created_at asc limit 1;
    select e.card, e.from_email, e.matched_handle into b_card, b_email, b_to
      from celestual_entries e
     where e.from_handle = m.handle_b and e.matched_at is not null
       and e.to_hash in (select celestual_hash_handle(g) from celestual_group(m.handle_a) g)
     order by e.created_at asc limit 1;

    -- Addresses. Only ever one a person stored themselves (0023): their own
    -- ping's, else the recovery address they bound under a live proof.
    a_email := coalesce(a_email, (select r.email from celestual_recovery r where r.handle = m.handle_a));
    b_email := coalesce(b_email, (select r.email from celestual_recovery r where r.handle = m.handle_b));

    insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
    select m.id, a_email, m.handle_a, coalesce(a_to, m.handle_b), b_card is not null, now()
     where a_email is not null;
    insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
    select m.id, b_email, m.handle_b, coalesce(b_to, m.handle_a), a_card is not null, now()
     where b_email is not null;

    perform celestual_dm_queue(m.id, m.handle_a, coalesce(a_to, m.handle_b), b_card is not null);
    perform celestual_dm_queue(m.id, m.handle_b, coalesce(b_to, m.handle_a), a_card is not null);

    update celestual_matches set queued_at = now() where id = m.id;
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'queued', v_n);
end;
$$;

revoke all on function celestual_reveal_sweep() from public, anon, authenticated;
grant execute on function celestual_reveal_sweep() to service_role;

comment on function celestual_reveal_sweep() is
  '0054: writes the mail and the DM for every pair whose night has come, once. Service role only; the reveal itself never waits on it.';

-- ── 10. and it is scheduled ─────────────────────────────────────────────────
-- Every five minutes where pg_cron exists (0038's pattern). Anywhere else this
-- block does nothing and says so; the two functions still call the sweep.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed: the reveal sweep is not scheduled here';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'celestual-reveal-sweep';
  perform cron.schedule('celestual-reveal-sweep', '*/5 * * * *', 'select celestual_reveal_sweep()');
end $$;

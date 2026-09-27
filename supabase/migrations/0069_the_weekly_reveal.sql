-- ─────────────────────────────────────────────────────────────────────────────
-- 0069_the_weekly_reveal.sql
--
-- A private note runs for a week, and everybody finds out on the same night.
--
-- ── the owner's ruling of 27 September ──────────────────────────────────────
-- Private notes expire every week, on Saturday night, California time, and
-- that night everybody finds out whether theirs was mutual or not. A note can
-- be kept for the next week. It used to stand sixty days and resolve the
-- instant the second of a pair was placed, which made the product a thing
-- you checked, alone, at any hour; now it is a night everybody has, together.
--
-- ── the rules ───────────────────────────────────────────────────────────────
--   the reveal     Saturday, 21:00 in America/Los_Angeles, daylight saving
--                  and all (`celestual_next_reveal`). One place to move it.
--   a note's run   a note ends at the first reveal at least a day after it is
--                  sent (`celestual_note_ends`): one sent on Saturday
--                  afternoon runs to the Saturday after, rather than lasting
--                  three hours. It lapses at that reveal if it is not mutual.
--   a match        found the moment the second note of a pair is placed, as
--                  it always was, and SEALED rather than told: both rows carry
--                  the other's id and the reveal it opens at (`sealed_with`,
--                  `reveal_at`). At that reveal the pair is made mutual
--                  (`celestual_reveal_due`): `matched_at` is set to the reveal
--                  itself, the match row is written, and the mail and the DM
--                  go out of the queues they always went out of. So every
--                  function that reads `matched_at` as "mutual", the desk's
--                  included, keeps meaning what it meant, and a sealed pair is
--                  in none of them until the night.
--   keeping it     `celestual_renew` keeps a standing note for the week after
--                  its own, once ahead: a person who will not look on
--                  Saturday says so on Wednesday. A note that has lapsed is
--                  sent again with `celestual_submit`, which is where the slot
--                  rule and the matching are, and that costs its slot again.
--   what is shown  a note that lapsed is kept, and shown to its sender as not
--                  mutual, for a week after its reveal, so they can send it
--                  again; then the broom takes it as it always did.
--
-- ── the ways it could have told somebody early, closed ──────────────────────
-- A sealed pair has to be indistinguishable, to both people, from two notes
-- that are not a pair, until the reveal, or the week is a thing you can ask
-- the server about on Tuesday. So, for a sealed row:
--   the list       answers `mutual: false`, no counterpart card, and the
--                  expiry it always had (`celestual_my_pings`, `_ping_status`)
--   the placement  answers `mutual: false` and no card, the same shape as a
--                  note nobody answered (`celestual_submit`)
--   the slots      a sealed row is `matched_at is null`, so it still holds its
--                  slot: a person with both slots full who suddenly has room
--                  would have learned something
--   keeping it     `celestual_renew` said no to a matched row, from its row
--                  count; a sealed row is not matched, so it is kept like any
--                  other and says yes
--   letting go     deletes the row and unseals the other side, which lapses or
--                  stands as an unanswered note would, and nobody is told
--   editing it     placing the same pair again changes the words until the
--                  reveal, sealed or not; after it, the words are what the
--                  other person read, and they stay
--   the mail/DM    written at the reveal and not before: the match row that
--                  queues them does not exist until then
--
-- ── not depending on the clock job ──────────────────────────────────────────
-- The reveal happens on the first read after its moment whether or not a job
-- ran: every function a person can call that answers about their notes calls
-- `celestual_reveal_due` first. pg_cron, where it is installed, calls it every
-- five minutes as well, so the mails and the DMs go at the reveal and not at
-- the next person's read.
--
-- ── the notes already out ───────────────────────────────────────────────────
-- A note standing when this applies keeps what it had, moved onto the
-- reveal at or after its end and no later than the second from now: nobody's
-- note is cut short, every note ends on a Saturday night, and within a
-- fortnight everybody is on the week. Pairs already mutual stay mutual.
--
-- Idempotent, like every migration here.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the columns ───────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists sealed_with uuid;
alter table celestual_entries add column if not exists sealed_at   timestamptz;
alter table celestual_entries add column if not exists reveal_at   timestamptz;
comment on column celestual_entries.sealed_with is
  '0069: the other half of a pair found before its reveal. Both rows point at each other until celestual_reveal_due makes them mutual.';
comment on column celestual_entries.reveal_at is
  '0069: the reveal a sealed pair opens at. matched_at is set to it.';
create index if not exists celestual_entries_sealed_idx
  on celestual_entries (reveal_at) where sealed_with is not null and matched_at is null;

-- ── 2. the calendar ──────────────────────────────────────────────────────────
-- The first reveal strictly after a moment, and the last one at or before it,
-- worked out in California's own wall time so a change of the clocks moves
-- nothing.
create or replace function celestual_next_reveal(p_at timestamptz default now())
returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  loc timestamp := p_at at time zone 'America/Los_Angeles';
  d date := loc::date;
  cand timestamp := (d + ((6 - extract(dow from d)::int + 7) % 7)) + time '21:00';
begin
  if cand <= loc then cand := cand + interval '7 days'; end if;
  return cand at time zone 'America/Los_Angeles';
end;
$$;

create or replace function celestual_last_reveal(p_at timestamptz default now())
returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  loc timestamp := p_at at time zone 'America/Los_Angeles';
  d date := loc::date;
  cand timestamp := (d - ((extract(dow from d)::int + 1) % 7)) + time '21:00';
begin
  if cand > loc then cand := cand - interval '7 days'; end if;
  return cand at time zone 'America/Los_Angeles';
end;
$$;

-- where a note sent at this moment ends: the first reveal a day or more away
create or replace function celestual_note_ends(p_at timestamptz default now())
returns timestamptz
language sql stable set search_path = public as $$
  select celestual_next_reveal(p_at + interval '1 day')
$$;

grant execute on function celestual_next_reveal(timestamptz) to anon, authenticated;
grant execute on function celestual_last_reveal(timestamptz) to anon, authenticated;
grant execute on function celestual_note_ends(timestamptz) to anon, authenticated;

-- ── 3. the reveal ────────────────────────────────────────────────────────────
-- Every sealed pair whose night has come, made mutual: both rows matched at
-- the reveal, the match row written (which queues the alert mail, 0064), the
-- address each side left on its ping told, and the DM queued for both. A row
-- whose other half has gone (let go, opted out, erased) is simply unsealed
-- and is an unanswered note from here. Safe to run at any moment, as often
-- as anybody likes: it only ever does what is owed.
--
-- One runs at a time. At nine on Saturday the clock job and every open phone
-- ask for it in the same second, and one that comes while another is running
-- waits for it and then finds nothing left. Passing the other's rows by
-- would read their pairs as notes nobody answered ("not this time", to
-- somebody whose note was mutual), and could take one half of a pair while
-- the other run held the other half, and deadlock with it. The rest of the
-- week nothing is due and nothing waits.
create or replace function celestual_reveal_due()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  e celestual_entries%rowtype;
  r celestual_entries%rowtype;
  a_target text;
  b_target text;
  v_match uuid;
  v_n int := 0;
begin
  if not exists (select 1 from celestual_entries
                  where sealed_with is not null and matched_at is null and reveal_at <= now()) then
    return 0;
  end if;
  perform pg_advisory_xact_lock(hashtext('celestual_reveal_due'));

  -- read after the lock, so a run that waited sees what the one before it did
  for e in
    select * from celestual_entries
     where sealed_with is not null and matched_at is null and reveal_at <= now()
     order by sealed_at, id
     for update
  loop
    -- the other half may have been taken by this same run already
    continue when not exists (select 1 from celestual_entries where id = e.id and sealed_with is not null and matched_at is null);

    -- The other half answers e when it points back at it. With handles linked
    -- as one person (celestual_group) it may since have been sealed to another
    -- of e's own handles, noting the same person the same week, or been told
    -- through one already in this run: then e is that person's note to the
    -- same person, and is told with it rather than lapsing beside it.
    select * into r from celestual_entries where id = e.sealed_with for update;
    if not found or (r.sealed_with is distinct from e.id and not (
         r.to_hash in (select celestual_hash_handle(g) from celestual_group(e.from_handle) g)
         and (r.matched_at is not null
              or exists (select 1 from celestual_entries s
                          where s.id = r.sealed_with and s.from_handle in (select celestual_group(e.from_handle)))))) then
      update celestual_entries set sealed_with = null, sealed_at = null, reveal_at = null where id = e.id;
      continue;
    end if;

    -- what each side typed for the other, as the placement recorded it
    a_target := coalesce(e.to_handle,
      (select g from celestual_group(r.from_handle) g where celestual_hash_handle(g) = e.to_hash limit 1),
      r.from_handle);
    b_target := coalesce(r.to_handle,
      (select g from celestual_group(e.from_handle) g where celestual_hash_handle(g) = r.to_hash limit 1),
      e.from_handle);

    if r.sealed_with is distinct from e.id then
      -- told on the same night, and quietly: the pair that holds the seal
      -- writes the match row, and so the mail and the DM, for both people
      update celestual_entries
         set matched_at = e.reveal_at, matched_handle = coalesce(matched_handle, a_target),
             sealed_with = null, sealed_at = null
       where id = e.id;
      continue;
    end if;

    update celestual_entries
       set matched_at = coalesce(matched_at, e.reveal_at), matched_handle = coalesce(matched_handle, a_target),
           sealed_with = null, sealed_at = null
     where id = e.id;
    update celestual_entries
       set matched_at = coalesce(matched_at, e.reveal_at), matched_handle = coalesce(matched_handle, b_target),
           sealed_with = null, sealed_at = null
     where id = r.id;

    insert into celestual_matches (handle_a, handle_b)
    values (least(e.from_handle, r.from_handle), greatest(e.from_handle, r.from_handle))
    on conflict (handle_a, handle_b) do nothing
    returning id into v_match;

    if v_match is not null then
      -- the address each side left, told THAT it is mutual and whether a note
      -- waits, never a word of it (0023, and 0064 moves it to the outbox)
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match, x.email, e.from_handle, a_target, r.card is not null, now()
        from (select coalesce((select c.email from celestual_recovery c where c.handle = e.from_handle), e.from_email) as email) x
       where x.email is not null;
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match, x.email, r.from_handle, b_target, e.card is not null, now()
        from (select coalesce((select c.email from celestual_recovery c where c.handle = r.from_handle), r.from_email) as email) x
       where x.email is not null;
      perform celestual_dm_queue(v_match, e.from_handle, a_target, r.card is not null);
      perform celestual_dm_queue(v_match, r.from_handle, b_target, e.card is not null);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function celestual_reveal_due() from public;
revoke all on function celestual_reveal_due() from anon, authenticated;
grant execute on function celestual_reveal_due() to service_role;

-- ── 4. placing one ───────────────────────────────────────────────────────────
-- celestual_submit, as 0063 wrote it, with the week in it: a note ends at its
-- week's reveal, a lapsed note sent again takes a slot again (it used to be
-- "free", because any row for the pair counted as already standing), the
-- cadence cap is for new pairs only, and a pair found is sealed for its
-- reveal rather than told.
create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_card jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  nh text;
  nc jsonb;
  v_caught text[];
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_placed30 int;
  v_existing_id uuid;
  v_live boolean := false;
  v_standing int;
  v_mine uuid;
  v_my_matched timestamptz;
  v_my_sealed uuid;
  reciprocal_card jsonb;
  reciprocal_id   uuid;
  reciprocal_matched timestamptz;
  v_mutual boolean := false;
  v_cap int;
  v_expires timestamptz;
  v_reveal timestamptz;
  c_ip_per_hour    constant int := 40;
  c_from_per_hour  constant int := 20;
  c_to_per_hour    constant int := 60;
  c_place_per_30d  constant int := 6;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if nf = nt then raise exception 'same handle'; end if;
  nh := celestual_hash_handle(nt);
  nc := celestual_card_clean(p_card);

  if nc is not null then
    v_caught := celestual_text_caught(nc->>'words');
    if cardinality(v_caught) > 0 then
      return jsonb_build_object('recorded', false, 'error', 'card', 'reasons', to_jsonb(v_caught));
    end if;
  end if;

  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;
  -- the reveal after the proof, as every other door here takes them: the
  -- proof's row and then the reveal's lock, in that order, everywhere, or a
  -- placement and a read by the same person queued behind a running reveal
  -- each hold what the other is waiting for
  perform celestual_reveal_due();

  if exists (select 1 from celestual_suppressions where handle_hash = nh) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  v_cap := celestual_cap_for(nf);
  v_expires := celestual_note_ends(now());

  v_ip := celestual_client_ip();
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

  -- The pair as it stands: a note still running (or mutual) is changed in
  -- place and costs nothing; one that lapsed at a reveal is sent again, and
  -- takes a slot like any note going out.
  select id, (matched_at is not null or expires_at > now())
    into v_existing_id, v_live
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

  if not coalesce(v_live, false) then
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
  end if;
  if v_existing_id is null then
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

  -- Record, change or send again. The words change until the reveal and not
  -- after it; a running note keeps the later of its two ends; a lapsed one
  -- starts a new week.
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, card, expires_at)
  values (nf, nh, nt, ne, nc, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        card       = case when celestual_entries.matched_at is not null then celestual_entries.card
                          else coalesce(excluded.card, celestual_entries.card) end,
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_entries.matched_at is not null then celestual_entries.expires_at
                          when celestual_entries.expires_at > now()
                            then greatest(celestual_entries.expires_at, excluded.expires_at)
                          else excluded.expires_at end,
        renew_notified_at = null
  returning id, matched_at, sealed_with into v_mine, v_my_matched, v_my_sealed;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── the other half, by hash ──
  select e.id, e.card, e.matched_at
    into reciprocal_id, reciprocal_card, reciprocal_matched
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and not (e.from_handle = nf and e.to_hash = nh)
     and (e.matched_at is not null or e.expires_at > now())
   order by e.created_at asc
   limit 1;

  if reciprocal_id is not null then
    if v_my_matched is not null then
      -- a pair already told, placed again: it answers as it always did
      v_mutual := true;
    elsif reciprocal_matched is not null then
      -- their half was told and this one had gone: it is told again at once,
      -- since the other side already knows
      update celestual_entries set matched_at = now(), matched_handle = nt, sealed_with = null, sealed_at = null, reveal_at = null
       where id = v_mine;
      v_mutual := true;
    elsif v_my_sealed is distinct from reciprocal_id then
      -- found: sealed for the reveal, both halves on the same night, and
      -- neither lapses before it
      v_reveal := celestual_next_reveal(now());
      update celestual_entries
         set sealed_with = case when id = v_mine then reciprocal_id else v_mine end,
             sealed_at = now(), reveal_at = v_reveal,
             expires_at = greatest(expires_at, v_reveal)
       where id in (v_mine, reciprocal_id);
    end if;
  end if;

  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();

  select expires_at into v_expires from celestual_entries where id = v_mine;

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    'match', case when v_mutual then nt else null end,
    'match_card', case when v_mutual then reciprocal_card else null end,
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'reveal_at', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap)
  );
end;
$$;
revoke all on function celestual_submit(text, text, text, text, jsonb) from public;
grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;

-- ── 5. the list ──────────────────────────────────────────────────────────────
-- celestual_my_pings, as 0042 wrote it, with the week: the reveal is run
-- first, a note that lapsed at a reveal is listed for a week after it
-- (`lapsed`), a mutual carries the night it was told (`revealed_at`), and the
-- answer says when the next reveal is and when the last one was, so every
-- device counts down to the same moment. A sealed row is never said to have
-- lapsed: past its night it is one whose reveal has not landed for this read
-- (sealed by a placement still committing when the reveal above ran), and it
-- is mutual on the next.
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
  perform celestual_reveal_due();

  select coalesce(jsonb_agg(jsonb_build_object(
           'handle', coalesce(e.matched_handle, e.to_handle),
           'time',   (extract(epoch from e.created_at) * 1000)::bigint,
           'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', e.matched_at is not null,
           'lapsed', e.matched_at is null and e.sealed_with is null and e.expires_at <= now(),
           'revealed_at', case when e.matched_at is not null
                               then to_char(e.matched_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
           'card', case when e.card is null then null
                        else e.card || jsonb_build_object('photo', e.photo is not null) end,
           'their_card', case when e.matched_at is not null
                              then celestual_counterpart_card(nh, coalesce(e.matched_handle, e.to_handle)) end,
           'known',        p.handle is not null,
           'display_name', coalesce(p.display_name, ''),
           'is_verified',  coalesce(p.is_verified, false),
           'avatar_path',  p.avatar_path
         ) order by e.created_at), '[]'::jsonb)
    into v_pings
    from celestual_entries e
    left join ig_profiles p on p.handle = coalesce(e.matched_handle, e.to_handle)
   where e.from_handle in (select celestual_group(nh))
     and (e.matched_at is not null or e.expires_at > now() - interval '7 days');

  return jsonb_build_object(
    'ok', true, 'pings', v_pings,
    'next_reveal', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'last_reveal', to_char(celestual_last_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;

-- ── 6. keeping one for next week ─────────────────────────────────────────────
-- A running note is kept for the week after its own, and no further ahead
-- than that: a second press answers yes and changes nothing. A note that has
-- lapsed is not this function's (it is sent again, `celestual_submit`). A
-- sealed note is a running note like any other, and is answered the same.
create or replace function celestual_renew(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  v_cap timestamptz;
  v_expires timestamptz;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  v_cap := celestual_next_reveal(celestual_note_ends(now()));
  update celestual_entries
     set expires_at = least(greatest(expires_at, celestual_next_reveal(expires_at)), v_cap),
         renew_notified_at = null
   where from_handle = nf and to_hash = celestual_hash_handle(nt)
     and matched_at is null and expires_at > now()
  returning expires_at into v_expires;
  if v_expires is null then
    return jsonb_build_object('ok', false,
      'error', case when exists (select 1 from celestual_entries
                                  where from_handle = nf and to_hash = celestual_hash_handle(nt)
                                    and matched_at is null) then 'lapsed' else 'none' end);
  end if;
  return jsonb_build_object('ok', true,
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;
grant execute on function celestual_renew(text, text, text) to anon, authenticated;

-- ── 7. letting one go ────────────────────────────────────────────────────────
-- celestual_withdraw, as 0038 wrote it, and a sealed other half unsealed, so
-- it stands or lapses as a note nobody answered. A mutual whose other side
-- lets go is a running note again, ending on a reveal like any other: one
-- told before this, whose sixty days end at any hour, is moved onto one as
-- section 10 moves the notes already out.
create or replace function celestual_withdraw(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ha text;
  hb text;
  v_ids uuid[];
  v_deleted int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;

  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('withdrawn', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();

  with gone as (
    delete from celestual_entries
     where from_handle = nf and to_hash = celestual_hash_handle(nt)
    returning id
  ) select array_agg(id) into v_ids from gone;
  v_deleted := coalesce(cardinality(v_ids), 0);

  if v_deleted > 0 then
    update celestual_entries set sealed_with = null, sealed_at = null, reveal_at = null
     where sealed_with = any(v_ids);
  end if;

  update celestual_entries e
     set matched_at = null,
         matched_handle = null,
         expires_at = least(celestual_next_reveal(greatest(e.expires_at, celestual_note_ends(now())) - interval '1 microsecond'),
                            celestual_next_reveal(celestual_note_ends(now())))
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

-- ── 8. the status of a few ───────────────────────────────────────────────────
-- celestual_ping_status, as 0038 wrote it, with the reveal run first and a
-- lapsed note said to be one, never a sealed one (as in the list).
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
  perform celestual_reveal_due();
  v_to := p_to[1:10];

  foreach t in array v_to loop
    continue when celestual_norm(t) is null;
    select e2.id, e2.created_at, e2.expires_at, e2.matched_at, e2.sealed_with, e2.card,
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
        'lapsed', e.matched_at is null and e.sealed_with is null and e.expires_at <= now(),
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
grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;

-- ── 9. the broom ─────────────────────────────────────────────────────────────
-- A lapsed note is kept a week past its reveal, for its sender to see how
-- the night went and send it again, and then taken, as it always was. A
-- sealed row is never taken: its reveal is run first.
create or replace function celestual_purge_expired()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  perform celestual_reveal_due();
  delete from celestual_entries
   where matched_at is null and sealed_with is null
     and expires_at < now() - interval '7 days';
  get diagnostics v_n = row_count;
  return jsonb_build_object('purged', v_n);
end;
$$;

-- ── 10. the notes already out ────────────────────────────────────────────────
-- Every note still running is moved onto a reveal: the first at or after the
-- end it had, and no later than the second from now. A note from before this
-- ended sixty days after it was sent, at whatever hour of the week that was.
-- Left there it would lapse on a Tuesday, and a seal (`greatest(expires_at,
-- v_reveal)` in celestual_submit) would move it to Saturday, telling its
-- sender days early that the other side had answered. On a reveal a seal
-- moves nothing.
update celestual_entries
   set expires_at = least(celestual_next_reveal(expires_at - interval '1 microsecond'),
                          celestual_next_reveal(celestual_note_ends(now())))
 where matched_at is null and expires_at > now()
   and expires_at <> least(celestual_next_reveal(expires_at - interval '1 microsecond'),
                           celestual_next_reveal(celestual_note_ends(now())));

-- ── 11. the night, on the clock ──────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not installed: the reveal runs on the first read after it';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'celestual-reveal';
  perform cron.schedule('celestual-reveal', '*/5 * * * *', 'select celestual_reveal_due()');
end $$;

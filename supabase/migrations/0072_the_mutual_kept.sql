-- ─────────────────────────────────────────────────────────────────────────────
-- 0072_the_mutual_kept.sql
--
-- A mutual is kept, and the pair can be found again.
--
-- ── the owner's ruling of 28 September ──────────────────────────────────────
-- Two things a person could not do. They could not write a new private note
-- to somebody they were mutual with: celestual_submit, on a pair already
-- told, answers as it always did and changes nothing, so a pair found once
-- could never be found again. And they could not take a mutual off their own
-- list: celestual_withdraw refuses one ('mutual', 0069), because it was told
-- to both and a mutual never lapses. Both are theirs to do now, and neither
-- tells the other person anything.
--
-- ── the keepsake ────────────────────────────────────────────────────────────
-- A mutual was two rows of celestual_entries, one a side, matched, forever,
-- and a table of one row per (from handle, pair) holds a note or a mutual for
-- a pair, never both. So a told pair is KEPT: each side's row is frozen into
-- `celestual_keepsakes`, holding everything that side's list shows for it
-- (whose list it is on, the @ it names and its hash, their own words and the
-- other side's as they were told, the photograph under each (0025), when it
-- went out, the end it carried and the night it was told), and then both rows
-- leave celestual_entries. Nothing is left there for the pair, so a note from
-- either side is a new note in every way: it spends a ping (0071), it is
-- sealed if the other side has written a new one too, and it is told at a
-- reveal only then (0069).
--
--   keeping        `celestual_mutual_keep`, internal. Both sides at once, the
--                  way the reveal tells them: every told row from one of the
--                  person's @s to one of the other's, both ways
--                  (celestual_group), each side keeping its own words and the
--                  other's. The match row stays, marked `kept_at`, so a mail
--                  or a DM of it still on its way goes on.
--   writing again  `celestual_mutual_again(from, to, proof, card, email)`: the
--                  proof, the reveal, the pair kept and the new note placed,
--                  in one transaction, answered exactly as celestual_submit
--                  answers a placement. A refusal (no pings, the week full,
--                  the words caught, the hourly limits) keeps nothing: the pair
--                  is as it was and the answer says why. With nothing told or
--                  kept between them it is simply a note.
--   taking it off  `celestual_mutual_forget(from, to, proof)`: the pair kept if
--                  it is still told, then this person's keepsakes of it gone,
--                  and the news of it still on its way to them (a mail not
--                  sent, a DM not handed over). The other side's keepsake is
--                  not touched, and they are told nothing. After it a note to
--                  them is a new note, as above.
--   a second one   told at a reveal as the first was, and to both people the
--                  same way. celestual_matches was unique on the pair, and the
--                  reveal's `on conflict do nothing` would have written no row
--                  for a pair told twice, and so no mail and no DM. It is
--                  unique on the pair among the rows not kept now: a pair told
--                  again has a row of its own, and the first one's row, with
--                  any news of it still owed, stands where it was.
--
-- ── why it is nobody else's business ────────────────────────────────────────
-- The other person must not learn that anybody wrote again, and the one who
-- did must learn nothing about the other by doing it. Every door a person can
-- knock on about a pair answers a kept one exactly as a told one:
--   the list       celestual_my_pings lists a keepsake as the mutual it was,
--                  the same in every field the wall reads, the other side's
--                  words frozen as they were told (they could not change after
--                  the night anyway, 0069); one mutual for each person on the
--                  other side, from each of their own @s, the latest told, and
--                  a told row still here wins over an older keepsake. A person
--                  who wrote again sees their new note beside it, as any
--                  running note.
--   the placement  celestual_submit, on a pair that is kept and with no note of
--                  their own to it since, answers as a told pair placed again
--                  always has: mutual, the other side's words, nothing spent,
--                  nothing written but the attempt. Only
--                  `celestual_mutual_again` writes a new note to a mutual, so
--                  the ordinary placement cannot tell anybody the pair was
--                  kept by answering differently once it was.
--   letting go     celestual_withdraw answers 'mutual' for a kept pair as for a
--                  told one, and no longer takes a match row it did not
--                  un-tell (a new note let go took the kept pair's row, and
--                  the news of it, with it).
--   the status     celestual_ping_status answers from the keepsake where there
--                  is no row.
--   the photograph celestual_card_photo reads a keepsake where there is no row,
--                  and celestual_card_photo_put writes onto a running note
--                  only: a told note's photograph stays what the other side
--                  saw, as its words have since 0069, kept or not.
--   the ledger     keeping spends and gives back nothing, so the allowance
--                  says what it said.
--
-- ── erasure ─────────────────────────────────────────────────────────────────
-- A keepsake goes the way the row it was would have gone. An erasure, the opt
-- out and the desk's delete (and so the ban) take every row from the handle
-- and every row about it (0038, 0046), and they take the keepsakes the same
-- way: the person's own, and every other person's keepsake about them, their
-- words in it with it, as the other person's row about them always went. All
-- of them come through celestual_billing_forget after the rows, which 0071
-- taught the ping ledger and this file teaches the keepsakes. The broom takes
-- none: a keepsake lasts, as a mutual row did, until its owner takes it off or
-- an erasure takes it.
--
-- ── the desk ────────────────────────────────────────────────────────────────
-- The desk counted mutuals as matched rows. A kept pair is two keepsakes, and
-- is counted and listed as the two mutual rows it was (celestual_desk_pings,
-- celestual_desk_overview). The pairs, and a week's mutuals, come from
-- celestual_matches, where a pair told twice is two rows, as it should be.
--
-- Idempotent, like every migration here.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the keepsakes ─────────────────────────────────────────────────────────
create table if not exists celestual_keepsakes (
  id           uuid        primary key default gen_random_uuid(),
  handle       text        not null,
  other_hash   text        not null,
  other_handle text,
  card         jsonb,
  photo        text        check (photo is null or length(photo) <= 1400000),
  their_card   jsonb,
  their_photo  text        check (their_photo is null or length(their_photo) <= 1400000),
  placed_at    timestamptz not null,
  expires_at   timestamptz not null,
  told_at      timestamptz not null,
  kept_at      timestamptz not null default now(),
  unique (handle, other_hash, told_at)
);
comment on table celestual_keepsakes is
  '0072: a told mutual as one side''s list shows it, once its two rows have left celestual_entries so the pair can be found again. One row per person per told mutual. Read only through its owner''s proof gated reads. Service role only.';
comment on column celestual_keepsakes.handle is
  '0072: whose list it is on: the from handle of the row it was.';
comment on column celestual_keepsakes.other_hash is
  '0072: the salted hash of the @ the row was addressed to, as its to_hash.';
comment on column celestual_keepsakes.other_handle is
  '0072: the @ the list names it by (matched_handle, else to_handle), and the key its face is joined on.';
comment on column celestual_keepsakes.card is
  '0072: the owner''s own words as the list said them, the photograph''s flag in it.';
comment on column celestual_keepsakes.their_card is
  '0072: the other side''s words as they were told (celestual_counterpart_card at the keeping).';
comment on column celestual_keepsakes.told_at is
  '0072: the night it was told: the row''s matched_at.';
-- a person's own are found by the unique key's front, (handle, other_hash);
-- the two below are erasure's, by the @ and by its hash
create index if not exists celestual_keepsakes_hash_idx  on celestual_keepsakes (other_hash);
create index if not exists celestual_keepsakes_other_idx on celestual_keepsakes (other_handle);
alter table celestual_keepsakes enable row level security;
revoke all on celestual_keepsakes from anon, authenticated;

-- ── 2. a pair told twice ─────────────────────────────────────────────────────
-- The match row of a kept pair stays, marked, and the pair is unique among
-- the rows not kept. The uniqueness was written inline in 0001, so its name is
-- Postgres's; any unique constraint on exactly the pair is found and dropped,
-- and the partial index stands in its place.
alter table celestual_matches add column if not exists kept_at timestamptz;
comment on column celestual_matches.kept_at is
  '0072: the pair this row told was kept (celestual_mutual_keep) and can be found again. The row stays, so a mail or a DM of it still owed goes on; a pair told again has a row of its own.';

do $$
declare
  c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'celestual_matches'::regclass and contype = 'u'
              and pg_get_constraintdef(oid) = 'UNIQUE (handle_a, handle_b)'
  loop
    execute format('alter table celestual_matches drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists celestual_matches_told_uidx
  on celestual_matches (handle_a, handle_b) where kept_at is null;
create index if not exists celestual_matches_pair_idx
  on celestual_matches (handle_a, handle_b);

-- ── 3. keeping a pair ────────────────────────────────────────────────────────
-- Both sides of a told pair, frozen into keepsakes and taken out of
-- celestual_entries, and its match row marked kept. Internal: the caller has
-- checked the proof and run the reveal, so a pair whose night has come is told
-- before it is kept, and a sealed pair is not told and not kept. Answers how
-- many keepsakes it wrote; nothing told between the two is 0 and writes
-- nothing. The rows are locked in the order they were placed in, so two
-- people keeping the same pair at once take turns, and the second finds the
-- rows gone and keeps nothing more.
create or replace function celestual_mutual_keep(p_me text, p_them text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  e celestual_entries%rowtype;
  v_other text;
  v_ids uuid[];
  v_one int;
  v_n int := 0;
begin
  if nf is null or nt is null then return 0; end if;

  select coalesce(array_agg(x.id order by x.created_at, x.id), '{}') into v_ids
    from (select id, created_at from celestual_entries
           where matched_at is not null
             and ((from_handle in (select celestual_group(nf))
                   and to_hash in (select celestual_hash_handle(g) from celestual_group(nt) g))
               or (from_handle in (select celestual_group(nt))
                   and to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)))
           order by created_at, id
           for update) x;
  if cardinality(v_ids) = 0 then return 0; end if;

  -- each side's list as celestual_my_pings drew it: its own words with the
  -- photograph's flag, and the other side's through the one door to them,
  -- read while both rows are still here
  for e in select * from celestual_entries where id = any(v_ids) order by created_at, id loop
    v_other := coalesce(e.matched_handle, e.to_handle);
    insert into celestual_keepsakes (handle, other_hash, other_handle, card, photo, their_card, their_photo,
                                     placed_at, expires_at, told_at)
    values (e.from_handle, coalesce(e.to_hash, celestual_hash_handle(v_other)), v_other,
            case when e.card is null then null
                 else e.card || jsonb_build_object('photo', e.photo is not null) end,
            e.photo,
            celestual_counterpart_card(e.from_handle, v_other),
            celestual_counterpart_photo(e.from_handle, v_other),
            e.created_at, e.expires_at, e.matched_at)
    on conflict (handle, other_hash, told_at) do nothing;
    get diagnostics v_one = row_count;
    v_n := v_n + v_one;
  end loop;

  delete from celestual_entries where id = any(v_ids);

  update celestual_matches m
     set kept_at = now()
   where m.kept_at is null
     and ((m.handle_a in (select celestual_group(nf)) and m.handle_b in (select celestual_group(nt)))
       or (m.handle_a in (select celestual_group(nt)) and m.handle_b in (select celestual_group(nf))));
  return v_n;
end;
$$;

-- ── 4. the reveal ────────────────────────────────────────────────────────────
-- celestual_reveal_due, as 0071 wrote it, and the match row written against
-- the pair's row that is not kept: a pair told again, after the first was
-- kept, gets a row of its own, and with it the mail and the DM to both, as
-- the first did. A pair still told has its row, and nothing is written twice.
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
  v_told_e timestamptz;
  v_told_r timestamptz;
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
      perform celestual_ping_refund(e.from_handle, e.to_hash, e.reveal_at);
      continue;
    end if;

    update celestual_entries
       set matched_at = coalesce(matched_at, e.reveal_at), matched_handle = coalesce(matched_handle, a_target),
           sealed_with = null, sealed_at = null
     where id = e.id
    returning matched_at into v_told_e;
    update celestual_entries
       set matched_at = coalesce(matched_at, e.reveal_at), matched_handle = coalesce(matched_handle, b_target),
           sealed_with = null, sealed_at = null
     where id = r.id
    returning matched_at into v_told_r;
    -- mutual: neither note runs past the night that told it, so a ping either
    -- held for a later reveal (kept for next week) goes back
    perform celestual_ping_refund(e.from_handle, e.to_hash, v_told_e);
    perform celestual_ping_refund(r.from_handle, r.to_hash, v_told_r);

    -- one row for the pair while it is told; a kept pair's row is not in the
    -- way of the next (0072)
    insert into celestual_matches (handle_a, handle_b)
    values (least(e.from_handle, r.from_handle), greatest(e.from_handle, r.from_handle))
    on conflict (handle_a, handle_b) where kept_at is null do nothing
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

-- ── 5. placing one ───────────────────────────────────────────────────────────
-- celestual_submit, as 0071 wrote it, moves whole into celestual_place, with
-- the one thing a keepsake asks of it: a pair that is kept, and with no note
-- of this person's to it since, placed again answers as a told pair placed
-- again always has (see the header) unless the placement is the new note
-- `celestual_mutual_again` writes (`p_again`). Internal; celestual_submit is
-- the browser's door to it, and answers what it answers.
create or replace function celestual_place(
  p_from text, p_to text, p_email text, p_proof text, p_card jsonb, p_again boolean)
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
  v_existing_id uuid;
  v_live boolean := false;
  v_kept celestual_keepsakes%rowtype;
  v_spent text;
  v_allowance jsonb;
  v_mine uuid;
  v_my_matched timestamptz;
  v_my_sealed uuid;
  reciprocal_card jsonb;
  reciprocal_id   uuid;
  reciprocal_matched timestamptz;
  v_mutual boolean := false;
  v_expires timestamptz;
  v_reveal timestamptz;
  c_ip_per_hour    constant int := 40;
  c_from_per_hour  constant int := 20;
  c_to_per_hour    constant int := 60;
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
  -- spends a ping like any note going out. The row is held from here (0072):
  -- a pair being kept by the other side in this same moment is waited for,
  -- and read as the keepsake it became, rather than the insert below finding
  -- the told row gone and writing a new note nobody paid for.
  select id, (matched_at is not null or expires_at > now())
    into v_existing_id, v_live
    from celestual_entries where from_handle = nf and to_hash = nh limit 1
     for update;

  -- A mutual that was kept, and no note of this person's to them since: it
  -- answers as the told pair it was, with the words the other side's row
  -- answered, the end this side's carried, nothing spent and nothing written
  -- but the attempt, which a told pair placed again records too.
  if v_existing_id is null and not coalesce(p_again, false) then
    select * into v_kept from celestual_keepsakes k
     where k.handle in (select celestual_group(nf))
       and k.other_hash in (select celestual_hash_handle(g) from celestual_group(nt) g)
     order by k.told_at desc, k.placed_at desc
     limit 1;
    if found then
      insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
      v_allowance := celestual_ping_allowance_for(nf);
      return jsonb_build_object(
        'recorded', true,
        'mutual', true,
        'match', nt,
        'match_card', v_kept.their_card - 'photo',
        'reachable', true,
        'expires_at', to_char(v_kept.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'reveal_at', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'slots', celestual_ping_slots(v_allowance),
        'allowance', v_allowance);
    end if;
  end if;

  if not coalesce(v_live, false) then
    v_spent := celestual_ping_spend(nf, nh, v_expires);
    if v_spent <> 'ok' then
      v_allowance := celestual_ping_allowance_for(nf);
      return jsonb_build_object(
        'recorded', false, 'error', v_spent,
        'slots', celestual_ping_slots(v_allowance),
        'allowance', v_allowance);
    end if;
  end if;

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
    delete from celestual_placements where created_at < now() - interval '40 days';
    -- the ledger's own broom, as celestual_purge_expired sweeps it, so it is
    -- kept short whether or not anything runs that on a clock
    delete from celestual_ping_spends where reveal_at < now() - interval '14 days';
  end if;

  -- Record, change or send again. The words change until the reveal and not
  -- after it: words sent empty ({"words": ""}) take them off, and no card at
  -- all keeps them, which is how a note is sent again. A running note keeps
  -- the later of its two ends; a lapsed one starts a new week.
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, card, expires_at)
  values (nf, nh, nt, ne, nc, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        card       = case when celestual_entries.matched_at is not null then celestual_entries.card
                          when excluded.card is null and jsonb_typeof(p_card) = 'object' and p_card ? 'words' then null
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
      -- since the other side already knows, and runs to no reveal, so the
      -- ping it just spent goes back
      update celestual_entries set matched_at = now(), matched_handle = nt, sealed_with = null, sealed_at = null, reveal_at = null
       where id = v_mine;
      perform celestual_ping_refund(nf, nh, now());
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

  v_allowance := celestual_ping_allowance_for(nf);

  select expires_at into v_expires from celestual_entries where id = v_mine;

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    'match', case when v_mutual then nt else null end,
    'match_card', case when v_mutual then reciprocal_card else null end,
    -- whether they have an account is theirs until the night: a placement
    -- that could be let go and sent again for nothing must not answer it
    'reachable', v_mutual,
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'reveal_at', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', celestual_ping_slots(v_allowance),
    'allowance', v_allowance
  );
end;
$$;

create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_card jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return celestual_place(p_from, p_to, p_email, p_proof, p_card, false);
end;
$$;

-- ── 6. writing again ─────────────────────────────────────────────────────────
-- A new private note to somebody this person is mutual with. The proof, then
-- the reveal, in the order every door here takes them (0069); then the pair is
-- kept and the note placed, the two in one savepoint, so a placement refused
-- (no pings, the week full, the words caught, the hourly limits, the @ opted
-- out) keeps nothing and answers why, exactly as celestual_submit would have.
-- The proof is taken always, as withdrawing and keeping take it, whatever the
-- release flag says: this is the one placement that changes what a pair is.
-- Answers celestual_submit's shapes: { recorded: true, mutual, match,
-- match_card, reachable, expires_at, reveal_at, slots, allowance }, or
-- { recorded: false, error, ... }. A new note is sealed like any other, so it
-- answers mutual: false until its night.
create or replace function celestual_mutual_again(
  p_from text, p_to text, p_proof text default null,
  p_card jsonb default null, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  v_out jsonb;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if nf = nt then raise exception 'same handle'; end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('recorded', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();

  begin
    perform celestual_mutual_keep(nf, nt);
    v_out := celestual_place(nf, nt, p_email, p_proof, p_card, true);
    if not coalesce((v_out->>'recorded')::boolean, false) then
      raise exception using errcode = 'CX072', message = 'the note was refused, so the pair stays told';
    end if;
  exception when sqlstate 'CX072' then
    -- the keeping is undone with the note, and the answer says why
    null;
  end;
  return v_out;
end;
$$;

-- ── 7. taking one off ────────────────────────────────────────────────────────
-- This person's mutual with somebody, off their own list for good. The pair is
-- kept first if it is still told (so the other side keeps theirs, the same in
-- every field), then this person's keepsakes of it go, across their linked
-- @s, and whatever news of it is still on its way to them: a DM not handed
-- over, a mail not sent (marked skipped, the way the outbox marks a mail it
-- will not send). The other side's news and keepsake are not touched, and
-- nothing is said to them. Answers { ok: true }, or { ok: false, error:
-- 'unverified' | 'none' }, 'none' when there was no mutual to take off.
create or replace function celestual_mutual_forget(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  v_n int;
  v_matches uuid[];
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  perform celestual_mutual_keep(nf, nt);

  delete from celestual_keepsakes k
   where k.handle in (select celestual_group(nf))
     and k.other_hash in (select celestual_hash_handle(g) from celestual_group(nt) g);
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'none');
  end if;

  select coalesce(array_agg(m.id), '{}') into v_matches
    from celestual_matches m
   where (m.handle_a in (select celestual_group(nf)) and m.handle_b in (select celestual_group(nt)))
      or (m.handle_a in (select celestual_group(nt)) and m.handle_b in (select celestual_group(nf)));
  delete from celestual_dm_outbox
   where match_id = any(v_matches) and handle in (select celestual_group(nf)) and sent_at is null;
  delete from celestual_notifications
   where match_id = any(v_matches) and self_handle in (select celestual_group(nf)) and sent_at is null;
  update celestual_mail_outbox
     set status = 'skipped', last_error = 'taken off'
   where kind = 'mutual' and match_id = any(v_matches)
     and handle in (select celestual_group(nf)) and status = 'queued';

  return jsonb_build_object('ok', true);
end;
$$;

-- ── 8. the list ──────────────────────────────────────────────────────────────
-- celestual_my_pings, as 0071 wrote it, with the keepsakes in it. A mutual is
-- a told row or a keepsake, drawn the same way, and each of the person's @s
-- lists one for each person on the other side (by the hash the note was
-- addressed to): the latest told, a told row before a keepsake told the same
-- night. Two @s linked as one person, told on one night, list one each, as
-- they did (test-weekly-reveal.sql, section 14). Every running or lapsed note
-- is listed beside it as before, so a handle can come back twice, a mutual
-- and a new note, and only ever to the person who wrote the new one.
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

  with told as (
    select e.from_handle as owner, coalesce(e.matched_handle, e.to_handle) as handle, e.to_hash as other_hash,
           e.created_at as placed_at, e.expires_at, e.matched_at as told_at, true as here,
           case when e.card is null then null
                else e.card || jsonb_build_object('photo', e.photo is not null) end as card,
           celestual_counterpart_card(nh, coalesce(e.matched_handle, e.to_handle)) as their_card
      from celestual_entries e
     where e.from_handle in (select celestual_group(nh))
       and e.matched_at is not null
    union all
    select k.handle, k.other_handle, k.other_hash, k.placed_at, k.expires_at, k.told_at, false, k.card, k.their_card
      from celestual_keepsakes k
     where k.handle in (select celestual_group(nh))
  ),
  latest as (
    select distinct on (t.owner, t.other_hash) t.*
      from told t
     order by t.owner, t.other_hash, t.told_at desc, t.here desc, t.placed_at desc
  ),
  shown as (
    select l.handle, l.placed_at, l.expires_at, true as mutual, false as lapsed, l.told_at,
           l.card, l.their_card
      from latest l
    union all
    select coalesce(e.matched_handle, e.to_handle), e.created_at, e.expires_at, false,
           e.sealed_with is null and e.expires_at <= now(), null::timestamptz,
           case when e.card is null then null
                else e.card || jsonb_build_object('photo', e.photo is not null) end,
           null::jsonb
      from celestual_entries e
     where e.from_handle in (select celestual_group(nh))
       and e.matched_at is null
       and e.expires_at > now() - interval '7 days'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'handle', s.handle,
           'time',   (extract(epoch from s.placed_at) * 1000)::bigint,
           'expires_at', to_char(s.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', s.mutual,
           'lapsed', s.lapsed,
           'revealed_at', case when s.mutual
                               then to_char(s.told_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
           'card', s.card,
           'their_card', s.their_card,
           'known',        p.handle is not null,
           'display_name', coalesce(p.display_name, ''),
           'is_verified',  coalesce(p.is_verified, false),
           'avatar_path',  p.avatar_path
         ) order by s.placed_at, s.mutual desc), '[]'::jsonb)
    into v_pings
    from shown s
    left join ig_profiles p on p.handle = s.handle;

  return jsonb_build_object(
    'ok', true, 'pings', v_pings,
    'next_reveal', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'last_reveal', to_char(celestual_last_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'allowance', celestual_ping_allowance_for(nh));
end;
$$;

-- ── 9. the status of a few ───────────────────────────────────────────────────
-- celestual_ping_status, as 0071 wrote it. A row answers as it always did;
-- with no row, the latest keepsake answers, as the told row it was. And a note
-- to somebody this person is kept mutual with says `reachable`: it is said of
-- a pair already told, where it is true anyway, and they were told. The row
-- is read before the keepsake, so a pair kept by the other side between the
-- two reads is found one way or the other, never neither.
create or replace function celestual_ping_status(p_from text, p_to text[], p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  v_to text[];
  v_out jsonb := '[]'::jsonb;
  t text;
  e record;
  v_row boolean;
  k celestual_keepsakes%rowtype;
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
    v_row := found;
    select * into k
      from celestual_keepsakes k2
     where k2.handle in (select celestual_group(nf))
       and k2.other_hash = celestual_hash_handle(t)
     order by k2.told_at desc, k2.placed_at desc
     limit 1;
    if v_row then
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
        'reachable', e.matched_at is not null or k.id is not null);
    elsif k.id is not null then
      v_out := v_out || jsonb_build_object(
        'handle', celestual_norm(t),
        'placed', true,
        'time', (extract(epoch from k.placed_at) * 1000)::bigint,
        'expires_at', to_char(k.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'mutual', true,
        'lapsed', false,
        'card', k.card,
        'their_card', k.their_card,
        'reachable', true);
    else
      v_out := v_out || jsonb_build_object('handle', celestual_norm(t), 'placed', false);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;

-- ── 10. letting one go ───────────────────────────────────────────────────────
-- celestual_withdraw, as 0071 wrote it, with two things a keepsake changes.
-- Nothing to let go on a pair that is kept answers 'mutual', as it did while
-- the pair was told, so the other side cannot learn from it that the pair was
-- kept. And the match row, and the news of it not yet sent, go only when this
-- un-tells a half that was told (a pair from before 0069, section 13 of
-- test-weekly-reveal.sql), and never a kept pair's: a new note let go must not
-- take the mutual before it with it.
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
  v_untold int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;

  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('withdrawn', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();

  with gone as (
    delete from celestual_entries
     where from_handle = nf and to_hash = celestual_hash_handle(nt)
       and matched_at is null
    returning id
  ) select array_agg(id) into v_ids from gone;
  v_deleted := coalesce(cardinality(v_ids), 0);

  if v_deleted = 0 then
    return jsonb_build_object('withdrawn', false,
      'error', case when exists (select 1 from celestual_entries
                                  where from_handle = nf and to_hash = celestual_hash_handle(nt))
                      or exists (select 1 from celestual_keepsakes
                                  where handle = nf and other_hash = celestual_hash_handle(nt))
                    then 'mutual' end);
  end if;

  perform celestual_ping_refund(nf, celestual_hash_handle(nt), now());

  update celestual_entries set sealed_with = null, sealed_at = null, reveal_at = null
   where sealed_with = any(v_ids);

  update celestual_entries e
     set matched_at = null,
         matched_handle = null,
         expires_at = least(celestual_next_reveal(greatest(e.expires_at, celestual_note_ends(now())) - interval '1 microsecond'),
                            celestual_next_reveal(celestual_note_ends(now())))
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and e.matched_at is not null;
  get diagnostics v_untold = row_count;

  if v_untold > 0 then
    ha := least(nf, nt);
    hb := greatest(nf, nt);
    delete from celestual_notifications n
     using celestual_matches m
     where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb and m.kept_at is null
       and n.sent_at is null;
    delete from celestual_matches where handle_a = ha and handle_b = hb and kept_at is null;
  end if;

  return jsonb_build_object('withdrawn', v_deleted > 0,
    'allowance', celestual_ping_allowance_for(nf));
end;
$$;

-- ── 11. the photograph ───────────────────────────────────────────────────────
-- celestual_card_photo_put, as 0038 wrote it, onto a running note only. A
-- told note's photograph is what the other side saw, and stays it, as its
-- words have since 0069; a told row and a kept one both answer 'told', so the
-- other side cannot tell them apart by it.
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
   where from_handle = nf and to_hash = nh and matched_at is null
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false,
      'error', case when exists (select 1 from celestual_entries where from_handle = nf and to_hash = nh)
                      or exists (select 1 from celestual_keepsakes where handle = nf and other_hash = nh)
                    then 'told' else 'no_ping' end);
  end if;
  return jsonb_build_object('ok', true, 'photo', v_photo is not null);
end;
$$;

-- celestual_card_photo, as 0038 wrote it, and a keepsake read where there is
-- no row: their own photograph, or the other side's as it was told.
create or replace function celestual_card_photo(
  p_me text, p_them text, p_proof text default null, p_mine boolean default true)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_photo text;
  v_found boolean := false;
begin
  if nf is null or nt is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  if coalesce(p_mine, true) then
    select e.photo, true into v_photo, v_found
      from celestual_entries e
     where e.from_handle in (select celestual_group(nf))
       and e.to_hash = celestual_hash_handle(nt)
     limit 1;
  else
    v_photo := celestual_counterpart_photo(nf, nt);
    v_found := exists (select 1 from celestual_entries e
                        where e.from_handle in (select celestual_group(nt))
                          and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
                          and e.matched_at is not null);
  end if;

  if not coalesce(v_found, false) then
    select case when coalesce(p_mine, true) then k.photo else k.their_photo end into v_photo
      from celestual_keepsakes k
     where k.handle in (select celestual_group(nf))
       and k.other_hash = celestual_hash_handle(nt)
     order by k.told_at desc, k.placed_at desc
     limit 1;
  end if;

  return jsonb_build_object('ok', true, 'photo', v_photo);
end;
$$;

-- ── 12. erasure ──────────────────────────────────────────────────────────────
-- Every keepsake of the handle and every keepsake about it, as erasure takes
-- every row from it and about it (0038). Internal.
create or replace function celestual_keepsake_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  delete from celestual_keepsakes
   where handle = nh or other_hash = celestual_hash_handle(nh) or other_handle = nh;
end;
$$;

-- celestual_billing_forget, as 0071 wrote it, and the keepsakes go with the
-- person. Erasure, the opt out and the desk's delete (and so the ban) all come
-- through here after the rows.
create or replace function celestual_billing_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  perform celestual_ping_forget(nh);
  perform celestual_keepsake_forget(nh);
  delete from celestual_entitlements where handle = nh;
  update celestual_purchases set handle = null where handle = nh;
end;
$$;

-- ── 13. the desk ─────────────────────────────────────────────────────────────
-- 0060's wrapper, word for word, and a kept pair counted as the two mutual
-- rows it was, its owners among the senders.
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
  v := jsonb_set(v, '{counts,pings_mutual}', to_jsonb(
         (select count(*) from celestual_entries where matched_at is not null)
       + (select count(*) from celestual_keepsakes)), true);
  v := jsonb_set(v, '{counts,senders}', to_jsonb(
         (select count(distinct s.h) from (select from_handle as h from celestual_entries
                                           union all select handle from celestual_keepsakes) s)), true);
  return v || jsonb_build_object('canary', resolver_canary_status(7));
end;
$$;

-- celestual_desk_pings, as 0039 wrote it, over the rows and the keepsakes
-- together: a keepsake is a mutual, `kept` says it is one, and it has no
-- address and no reminder, which it never keeps. Still shaped by SECURITY.md:
-- a mutual names both sides, because both sides already know.
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

  with pings as (
    select e.id, e.from_handle,
           case when e.matched_at is not null then 'mutual'
                when e.expires_at > now() then 'standing' else 'lapsed' end as state,
           case when e.matched_at is not null then e.matched_handle end as matched_handle,
           e.matched_at, e.created_at, e.expires_at,
           e.card is not null as has_line, e.from_email is not null as has_email,
           e.renew_notified_at is not null as reminded, false as kept
      from celestual_entries e
    union all
    select k.id, k.handle, 'mutual', k.other_handle, k.told_at, k.placed_at, k.expires_at,
           k.card is not null, false, false, true
      from celestual_keepsakes k
  ),
  hit as (
    select * from pings p
     where (v_s is null or p.state = v_s)
       and (v_q is null or p.from_handle like '%' || v_q || '%'
            or (p.state = 'mutual' and p.matched_handle like '%' || v_q || '%'))
  )
  select (select count(*) from hit),
         (select coalesce(jsonb_agg(jsonb_build_object(
            'id', h.id,
            'from_handle', h.from_handle,
            'state', h.state,
            'matched_handle', h.matched_handle,
            'matched_at', h.matched_at,
            'created_at', h.created_at,
            'expires_at', h.expires_at,
            'days_left', greatest(0, ceil(extract(epoch from (h.expires_at - now())) / 86400))::int,
            'has_line', h.has_line,
            'has_email', h.has_email,
            'reminded', h.reminded,
            'kept', h.kept
          ) order by h.created_at desc), '[]'::jsonb)
            from (select * from hit order by created_at desc limit v_lim offset v_off) h)
    into v_n, v_rows;

  return jsonb_build_object(
    'ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows,
    'counts', jsonb_build_object(
      'standing',   (select count(*) from celestual_entries where matched_at is null and expires_at > now()),
      'mutual',     (select count(*) from celestual_entries where matched_at is not null)
                    + (select count(*) from celestual_keepsakes),
      'pairs',      (select count(*) from celestual_matches),
      'lapsed',     (select count(*) from celestual_entries where matched_at is null and expires_at <= now()),
      'placed_7d',  (select count(*) from celestual_entries where created_at > now() - interval '7 days')
                    + (select count(*) from celestual_keepsakes where placed_at > now() - interval '7 days'),
      'mutual_7d',  (select count(*) from celestual_matches where matched_at > now() - interval '7 days'),
      'lapsing_7d', (select count(*) from celestual_entries
                      where matched_at is null and expires_at > now()
                        and expires_at <= now() + interval '7 days'),
      'with_line',  (select count(*) from celestual_entries where card is not null)
                    + (select count(*) from celestual_keepsakes where card is not null),
      'senders',    (select count(distinct s.h) from (select from_handle as h from celestual_entries
                                                      union all select handle from celestual_keepsakes) s)
    )
  );
end;
$$;

-- ── 14. grants ───────────────────────────────────────────────────────────────
-- The browser's: the two new doors, and the ones this file re-created, as
-- they were. The service role's: the reveal and the desk. Nobody's from
-- outside: keeping, placing underneath the door, and forgetting on erasure.
revoke all on function celestual_mutual_again(text, text, text, jsonb, text) from public;
grant execute on function celestual_mutual_again(text, text, text, jsonb, text) to anon, authenticated;
revoke all on function celestual_mutual_forget(text, text, text) from public;
grant execute on function celestual_mutual_forget(text, text, text) to anon, authenticated;

revoke all on function celestual_submit(text, text, text, text, jsonb) from public;
grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;
grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;
grant execute on function celestual_withdraw(text, text, text) to anon, authenticated;
grant execute on function celestual_card_photo_put(text, text, text, text) to anon, authenticated;
grant execute on function celestual_card_photo(text, text, text, boolean) to anon, authenticated;

revoke all on function celestual_reveal_due() from public;
revoke all on function celestual_reveal_due() from anon, authenticated;
grant execute on function celestual_reveal_due() to service_role;
revoke all on function celestual_desk_overview() from public, anon, authenticated;
grant execute on function celestual_desk_overview() to service_role;
revoke all on function celestual_desk_pings(text, text, integer, integer) from public, anon, authenticated;
grant execute on function celestual_desk_pings(text, text, integer, integer) to service_role;

revoke all on function celestual_mutual_keep(text, text)                          from public, anon, authenticated;
revoke all on function celestual_place(text, text, text, text, jsonb, boolean)    from public, anon, authenticated;
revoke all on function celestual_keepsake_forget(text)                            from public, anon, authenticated;
revoke all on function celestual_billing_forget(text)                             from public, anon, authenticated;

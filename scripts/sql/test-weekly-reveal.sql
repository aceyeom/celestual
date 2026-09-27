-- ─────────────────────────────────────────────────────────────────────────────
-- test-weekly-reveal.sql: exercises 0069_the_weekly_reveal.sql.
--
-- The calendar lands on Saturday night in California, through a change of the
-- clocks. A pair found mid-week is sealed, and to both people it looks like
-- two notes nobody answered, in every answer the server gives, until the
-- reveal, when it is mutual. Letting one half go unseals the other. A note
-- that lapsed is listed as lapsed for a week, cannot be kept, is sent again
-- through the slot rule, and is then swept. The words change until the
-- reveal and not after. One reveal runs at a time (the race itself is in
-- test-weekly-reveal-race.sql), and a sealed row is never read as lapsed. A
-- note from before the week is moved onto a reveal, so a seal moves no end,
-- and one person noting somebody from two linked handles is told on both.
-- Time is moved by moving the rows' own timestamps back. Run through
-- scripts/verify-migrations.sh --test; everything is rolled back at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function wr_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function wr_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function wr_row(p_from text, p_to text) returns celestual_entries
language sql as $$
  select * from celestual_entries where from_handle = p_from and to_hash = celestual_hash_handle(p_to)
$$;

create or replace function wr_list(p_handle text) returns jsonb
language sql as $$ select celestual_my_pings(p_handle, 'proof-' || p_handle) $$;

create or replace function wr_item(p_handle text, p_to text) returns jsonb
language sql as $$
  select x from jsonb_array_elements(wr_list(p_handle)->'pings') x where x->>'handle' = p_to limit 1
$$;

-- bring every sealed pair's night to now
create or replace function wr_night() returns int
language plpgsql as $$
begin
  update celestual_entries set reveal_at = now() - interval '1 second' where sealed_with is not null;
  return celestual_reveal_due();
end; $$;

select wr_proof(h) from unnest(array['wr_a', 'wr_b', 'wr_c', 'wr_d', 'wr_e', 'wr_f', 'wr_g', 'wr_h']) h;

-- ── 1. the calendar ─────────────────────────────────────────────────────────
select wr_ok('the next reveal is a Saturday at nine at night in California',
  extract(dow from celestual_next_reveal() at time zone 'America/Los_Angeles') = 6
  and (celestual_next_reveal() at time zone 'America/Los_Angeles')::time = time '21:00'
  and celestual_next_reveal() > now());
select wr_ok('and the last one was a week before it, give or take the clocks',
  celestual_last_reveal() <= now()
  and celestual_next_reveal() - celestual_last_reveal() between interval '167 hours' and interval '169 hours');
select wr_ok('at the reveal itself, the next one is the Saturday after',
  celestual_next_reveal('2026-10-03 21:00 America/Los_Angeles') = timestamptz '2026-10-10 21:00 America/Los_Angeles'
  and celestual_last_reveal('2026-10-03 21:00 America/Los_Angeles') = timestamptz '2026-10-03 21:00 America/Los_Angeles');
select wr_ok('across the end of summer time it stays nine at night',
  celestual_next_reveal('2026-11-01 12:00 America/Los_Angeles') = timestamptz '2026-11-07 21:00 America/Los_Angeles'
  and celestual_next_reveal('2026-11-07 12:00 America/Los_Angeles') - celestual_next_reveal('2026-10-31 12:00 America/Los_Angeles')
      = interval '169 hours');
select wr_ok('a note sent on Saturday afternoon runs to the Saturday after',
  celestual_note_ends('2026-10-03 15:00 America/Los_Angeles') = timestamptz '2026-10-10 21:00 America/Los_Angeles'
  and celestual_note_ends('2026-09-30 15:00 America/Los_Angeles') = timestamptz '2026-10-03 21:00 America/Los_Angeles');
select wr_ok('the reveal itself is the server''s alone to run',
  not has_function_privilege('anon', 'celestual_reveal_due()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_reveal_due()', 'EXECUTE'));

-- ── 2. a note ends at its week's reveal ─────────────────────────────────────
select celestual_submit('wr_a', 'wr_b', null, 'proof-wr_a', '{"words":"the bus stop, tuesday"}'::jsonb);
select wr_ok('a note placed ends at its week''s reveal',
  (wr_row('wr_a', 'wr_b')).expires_at = celestual_note_ends(now()));

-- ── 3. found, and sealed ────────────────────────────────────────────────────
create temp table wr_sub as
  select celestual_submit('wr_b', 'wr_a', null, 'proof-wr_b', '{"words":"i saw you too"}'::jsonb) as r;
select wr_ok('the second half answers as a note nobody answered',
  not ((select r from wr_sub)->>'mutual')::boolean
  and (select r from wr_sub)->'match' = 'null'::jsonb
  and (select r from wr_sub)->'match_card' = 'null'::jsonb);
select wr_ok('both rows are sealed to each other, on the same night',
  (wr_row('wr_a', 'wr_b')).sealed_with = (wr_row('wr_b', 'wr_a')).id
  and (wr_row('wr_b', 'wr_a')).sealed_with = (wr_row('wr_a', 'wr_b')).id
  and (wr_row('wr_a', 'wr_b')).reveal_at = (wr_row('wr_b', 'wr_a')).reveal_at
  and (wr_row('wr_a', 'wr_b')).reveal_at = celestual_next_reveal(now())
  and (wr_row('wr_a', 'wr_b')).matched_at is null
  and not exists (select 1 from celestual_matches where handle_a = 'wr_a' and handle_b = 'wr_b'));
select wr_ok('the list says nothing to either side',
  not (wr_item('wr_a', 'wr_b')->>'mutual')::boolean and wr_item('wr_a', 'wr_b')->'their_card' = 'null'::jsonb
  and not (wr_item('wr_b', 'wr_a')->>'mutual')::boolean and wr_item('wr_b', 'wr_a')->'their_card' = 'null'::jsonb
  and not (wr_item('wr_a', 'wr_b')->>'lapsed')::boolean);
select wr_ok('nor the status of a few',
  not (celestual_ping_status('wr_a', array['wr_b'], 'proof-wr_a')->'pings'->0->>'mutual')::boolean);
select wr_ok('the sealed note still holds its slot',
  (celestual_slots_for('wr_a', 'proof-wr_a')->>'standing')::int = 1);
select wr_ok('and is kept for next week like any other, saying yes',
  (celestual_renew('wr_a', 'wr_b', 'proof-wr_a')->>'ok')::boolean);
create temp table wr_edit as
  select celestual_submit('wr_a', 'wr_b', null, 'proof-wr_a', '{"words":"the bus stop, every tuesday"}'::jsonb) as r;
select wr_ok('the words can still change before the reveal',
  ((select r from wr_edit)->>'recorded')::boolean
  and (wr_row('wr_a', 'wr_b')).card->>'words' = 'the bus stop, every tuesday'
  and (wr_row('wr_a', 'wr_b')).sealed_with = (wr_row('wr_b', 'wr_a')).id);
select wr_ok('the reveal does nothing before its night', celestual_reveal_due() = 0);
select wr_ok('and takes no lock to do nothing, so a week of reads never queue',
  not exists (select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()));

-- ── 4. the night ────────────────────────────────────────────────────────────
select wr_ok('at the reveal the pair is made mutual', wr_night() = 1);
select wr_ok('both halves are matched at the reveal, and unsealed',
  (wr_row('wr_a', 'wr_b')).matched_at is not null
  and (wr_row('wr_a', 'wr_b')).matched_at = (wr_row('wr_b', 'wr_a')).matched_at
  and (wr_row('wr_a', 'wr_b')).sealed_with is null and (wr_row('wr_b', 'wr_a')).sealed_with is null
  and exists (select 1 from celestual_matches where handle_a = 'wr_a' and handle_b = 'wr_b'));
select wr_ok('each side reads the other''s words, and when it was told',
  (wr_item('wr_a', 'wr_b')->>'mutual')::boolean
  and wr_item('wr_a', 'wr_b')->'their_card'->>'words' = 'i saw you too'
  and wr_item('wr_b', 'wr_a')->'their_card'->>'words' = 'the bus stop, every tuesday'
  and wr_item('wr_a', 'wr_b')->>'revealed_at' is not null);
select wr_ok('the list says when the next reveal is and when the last one was',
  (wr_list('wr_a')->>'next_reveal')::timestamptz = celestual_next_reveal(now())
  and (wr_list('wr_a')->>'last_reveal')::timestamptz = celestual_last_reveal(now()));
create temp table wr_after as
  select celestual_submit('wr_a', 'wr_b', null, 'proof-wr_a', '{"words":"something else"}'::jsonb) as r;
select wr_ok('the words stay what the other side read',
  ((select r from wr_after)->>'mutual')::boolean
  and (wr_row('wr_a', 'wr_b')).card->>'words' = 'the bus stop, every tuesday');
select wr_ok('and a second night does nothing more', wr_night() = 0);

-- ── 5. letting one half go ──────────────────────────────────────────────────
select celestual_submit('wr_c', 'wr_d', null, 'proof-wr_c', null);
select celestual_submit('wr_d', 'wr_c', null, 'proof-wr_d', null);
select wr_ok('a second pair is sealed', (wr_row('wr_d', 'wr_c')).sealed_with is not null);
select wr_ok('letting one half go says yes, as it would for any note',
  (celestual_withdraw('wr_c', 'wr_d', 'proof-wr_c')->>'withdrawn')::boolean);
select wr_ok('and the other half is a note nobody answered',
  (wr_row('wr_d', 'wr_c')).sealed_with is null and (wr_row('wr_d', 'wr_c')).reveal_at is null
  and not (wr_item('wr_d', 'wr_c')->>'mutual')::boolean);
select wr_ok('whose night reveals nothing', wr_night() = 0);
select wr_ok('and tells nobody anything',
  (wr_row('wr_d', 'wr_c')).matched_at is null
  and not exists (select 1 from celestual_matches where handle_a = 'wr_c' and handle_b = 'wr_d'));

-- ── 6. a half that went another way ─────────────────────────────────────────
select celestual_submit('wr_g', 'wr_h', null, 'proof-wr_g', null);
select celestual_submit('wr_h', 'wr_g', null, 'proof-wr_h', null);
delete from celestual_entries where from_handle = 'wr_h';
select wr_ok('a sealed row whose other half has gone reveals nothing', wr_night() = 0);
select wr_ok('and is unsealed on its night',
  (wr_row('wr_g', 'wr_h')).sealed_with is null and (wr_row('wr_g', 'wr_h')).matched_at is null);

-- ── 7. keeping one for next week ────────────────────────────────────────────
select celestual_submit('wr_e', 'wr_f', null, 'proof-wr_e', null);
select wr_ok('kept, it says yes', (celestual_renew('wr_e', 'wr_f', 'proof-wr_e')->>'ok')::boolean);
select wr_ok('and runs to the reveal after its own',
  (wr_row('wr_e', 'wr_f')).expires_at = celestual_next_reveal(celestual_note_ends(now())));
select wr_ok('kept again, it says yes', (celestual_renew('wr_e', 'wr_f', 'proof-wr_e')->>'ok')::boolean);
select wr_ok('and goes no further, however often it is kept',
  (wr_row('wr_e', 'wr_f')).expires_at = celestual_next_reveal(celestual_note_ends(now())));

-- ── 8. a note that lapsed ───────────────────────────────────────────────────
update celestual_entries set expires_at = now() - interval '2 days' where from_handle = 'wr_e';
select wr_ok('it is listed, and said to have lapsed',
  (wr_item('wr_e', 'wr_f')->>'lapsed')::boolean and not (wr_item('wr_e', 'wr_f')->>'mutual')::boolean);
select wr_ok('it cannot be kept, only sent again',
  not (celestual_renew('wr_e', 'wr_f', 'proof-wr_e')->>'ok')::boolean
  and celestual_renew('wr_e', 'wr_f', 'proof-wr_e')->>'error' = 'lapsed');
select wr_ok('and it no longer holds a slot',
  (celestual_slots_for('wr_e', 'proof-wr_e')->>'standing')::int = 0);
-- two others take both free slots
select celestual_submit('wr_e', 'wr_g', null, 'proof-wr_e', null);
select celestual_submit('wr_e', 'wr_h', null, 'proof-wr_e', null);
select wr_ok('sending it again with both slots taken is refused',
  celestual_submit('wr_e', 'wr_f', null, 'proof-wr_e', null)->>'error' = 'no_slots');
select celestual_withdraw('wr_e', 'wr_h', 'proof-wr_e');
select wr_ok('with a slot free it goes out again',
  (celestual_submit('wr_e', 'wr_f', null, 'proof-wr_e', null)->>'recorded')::boolean);
select wr_ok('for a new week',
  (wr_row('wr_e', 'wr_f')).expires_at = celestual_note_ends(now())
  and not (wr_item('wr_e', 'wr_f')->>'lapsed')::boolean);
select wr_ok('a half placed after it went out again answers as unanswered',
  not (celestual_submit('wr_f', 'wr_e', null, 'proof-wr_f', null)->>'mutual')::boolean);
select wr_ok('and is sealed with it',
  (wr_row('wr_e', 'wr_f')).sealed_with = (wr_row('wr_f', 'wr_e')).id);

-- ── 9. the broom ────────────────────────────────────────────────────────────
update celestual_entries set expires_at = now() - interval '2 days' where from_handle = 'wr_d';
select celestual_purge_expired();
select wr_ok('a note lapsed less than a week ago is kept', (wr_row('wr_d', 'wr_c')).id is not null);
update celestual_entries set expires_at = now() - interval '8 days' where from_handle = 'wr_d';
select celestual_purge_expired();
select wr_ok('and one lapsed more than a week ago is taken',
  not exists (select 1 from celestual_entries where from_handle = 'wr_d'));
update celestual_entries set expires_at = now() - interval '8 days' where from_handle = 'wr_e' and to_handle = 'wr_g';
select wr_ok('a note lapsed more than a week ago is off the list even before it is swept',
  wr_item('wr_e', 'wr_g') is null and wr_item('wr_e', 'wr_f') is not null);
select wr_ok('a sealed row is never swept before its night',
  (select count(*) from celestual_entries where sealed_with is not null) = 2);

-- ── 10. one reveal at a time ────────────────────────────────────────────────
-- One session cannot race itself, so this reads the function; the race is
-- run in test-weekly-reveal-race.sql.
select wr_ok('a reveal waits on a lock for one already running, and passes no row by',
  (select prosrc ~ 'pg_advisory_xact_lock' and prosrc !~* 'skip\s+locked'
     from pg_proc where proname = 'celestual_reveal_due'));

-- ── 11. a night come, and its reveal not landed yet ─────────────────────────
-- A pair sealed by a placement still committing when a read's own reveal ran
-- is, to that read, past its night and not yet mutual. A reveal that does
-- nothing stands in for it here, and is taken back after.
select wr_proof(h) from unnest(array['wr_i', 'wr_j']) h;
select celestual_submit('wr_i', 'wr_j', null, 'proof-wr_i', null);
select celestual_submit('wr_j', 'wr_i', null, 'proof-wr_j', null);
savepoint wr_elsewhere;
create or replace function celestual_reveal_due() returns integer
language plpgsql security definer set search_path = public as $$ begin return 0; end; $$;
update celestual_entries set reveal_at = now() - interval '1 second', expires_at = now() - interval '1 second'
 where from_handle in ('wr_i', 'wr_j');
select wr_ok('a sealed note past its night is not said to have lapsed, in the list or the status',
  not (wr_item('wr_i', 'wr_j')->>'lapsed')::boolean
  and not (celestual_ping_status('wr_i', array['wr_j'], 'proof-wr_i')->'pings'->0->>'lapsed')::boolean);
rollback to savepoint wr_elsewhere;

-- ── 12. notes from before the week ──────────────────────────────────────────
-- A note placed before 0069 ended sixty days after it was sent, at whatever
-- hour of the week that was. Two are put back to such an end before the next
-- reveal and one to an end weeks away, and section 10 of the migration,
-- copied here as it is written there, is run over them.
create or replace function wr_onto_the_week() returns int
language plpgsql as $$
declare
  v_n int;
begin
  update celestual_entries
     set expires_at = least(celestual_next_reveal(expires_at - interval '1 microsecond'),
                            celestual_next_reveal(celestual_note_ends(now())))
   where matched_at is null and expires_at > now()
     and expires_at <> least(celestual_next_reveal(expires_at - interval '1 microsecond'),
                             celestual_next_reveal(celestual_note_ends(now())));
  get diagnostics v_n = row_count;
  return v_n;
end; $$;

select wr_proof(h) from unnest(array['wr_k', 'wr_l', 'wr_m', 'wr_n', 'wr_o']) h;
select celestual_submit('wr_k', 'wr_l', null, 'proof-wr_k', null);
select celestual_submit('wr_k', 'wr_m', null, 'proof-wr_k', null);
select celestual_submit('wr_n', 'wr_o', null, 'proof-wr_n', null);
update celestual_entries set expires_at = now() + (celestual_next_reveal(now()) - now()) / 2
 where from_handle = 'wr_k';
update celestual_entries set expires_at = now() + interval '50 days 7 hours' where from_handle = 'wr_n';
select wr_ok('the week takes in every note from before it', wr_onto_the_week() = 3);
select wr_ok('one that ended before the next reveal ends at it, cut short by nothing',
  (wr_row('wr_k', 'wr_l')).expires_at = celestual_next_reveal(now())
  and (wr_row('wr_k', 'wr_m')).expires_at = celestual_next_reveal(now()));
select wr_ok('one that ran on for weeks ends at the second reveal from now',
  (wr_row('wr_n', 'wr_o')).expires_at = celestual_next_reveal(celestual_note_ends(now())));
select wr_ok('and run again it moves nothing', wr_onto_the_week() = 0);
create temp table wr_legacy as select (wr_row('wr_k', 'wr_l')).expires_at as ends;
select wr_ok('the other side answers one of them, as a note nobody answered',
  not (celestual_submit('wr_l', 'wr_k', null, 'proof-wr_l', null)->>'mutual')::boolean
  and (wr_row('wr_k', 'wr_l')).sealed_with = (wr_row('wr_l', 'wr_k')).id);
select wr_ok('and the seal moves no end: the answered note and the unanswered one end together',
  (wr_row('wr_k', 'wr_l')).expires_at = (select ends from wr_legacy)
  and (wr_row('wr_k', 'wr_l')).expires_at = (wr_row('wr_k', 'wr_m')).expires_at);
select wr_ok('in the list and in the status alike',
  wr_item('wr_k', 'wr_l')->'expires_at' = wr_item('wr_k', 'wr_m')->'expires_at'
  and wr_item('wr_k', 'wr_l')->'lapsed' = wr_item('wr_k', 'wr_m')->'lapsed'
  and celestual_ping_status('wr_k', array['wr_l'], 'proof-wr_k')->'pings'->0->'expires_at'
      = celestual_ping_status('wr_k', array['wr_m'], 'proof-wr_k')->'pings'->0->'expires_at');
select wr_ok('and kept for next week, both run to the same reveal',
  celestual_renew('wr_k', 'wr_l', 'proof-wr_k')->'expires_at'
    = celestual_renew('wr_k', 'wr_m', 'proof-wr_k')->'expires_at');

-- ── 13. a mutual from before the week, let go of ────────────────────────────
select wr_proof(h) from unnest(array['wr_p', 'wr_q']) h;
select celestual_submit('wr_p', 'wr_q', null, 'proof-wr_p', null);
select celestual_submit('wr_q', 'wr_p', null, 'proof-wr_q', null);
-- told before 0069, with the sixty days a note had then
update celestual_entries
   set matched_at = now() - interval '10 days', sealed_with = null, sealed_at = null, reveal_at = null,
       expires_at = now() + interval '50 days 7 hours'
 where from_handle in ('wr_p', 'wr_q');
select celestual_withdraw('wr_q', 'wr_p', 'proof-wr_q');
select wr_ok('a mutual from before the week whose other side lets go is a note again, ending on a reveal',
  (wr_row('wr_p', 'wr_q')).matched_at is null
  and (wr_row('wr_p', 'wr_q')).expires_at = celestual_next_reveal(celestual_note_ends(now())));

-- ── 14. one person, two handles ─────────────────────────────────────────────
-- Handles linked as one person (celestual_handle_links, from before 0036 took
-- the linking away), noting the same person in one week. The later of the two
-- takes the other half's seal from the earlier; on the night both are told,
-- whether the night comes to the earlier one first or after its pair is told.
select wr_proof(h) from unnest(array['wr_s1', 'wr_s2', 'wr_t', 'wr_u1', 'wr_u2', 'wr_v']) h;
with g as (select gen_random_uuid() as s, gen_random_uuid() as u)
insert into celestual_handle_links (handle, group_id)
select h, case when h like 'wr\_s%' then g.s else g.u end
  from g, unnest(array['wr_s1', 'wr_s2', 'wr_u1', 'wr_u2']) h;
-- s1 and t are sealed, then s2 notes t
select celestual_submit('wr_s1', 'wr_t', null, 'proof-wr_s1', null);
select celestual_submit('wr_t', 'wr_s1', null, 'proof-wr_t', '{"words":"the green coat"}'::jsonb);
select celestual_submit('wr_s2', 'wr_t', null, 'proof-wr_s2', null);
-- u2 and v are sealed through the group, then u1 notes v
select celestual_submit('wr_u2', 'wr_v', null, 'proof-wr_u2', null);
select celestual_submit('wr_v', 'wr_u1', null, 'proof-wr_v', null);
select celestual_submit('wr_u1', 'wr_v', null, 'proof-wr_u1', null);
select wr_ok('the later handle takes the seal from the earlier',
  (wr_row('wr_t', 'wr_s1')).sealed_with = (wr_row('wr_s2', 'wr_t')).id
  and (wr_row('wr_s1', 'wr_t')).sealed_with = (wr_row('wr_t', 'wr_s1')).id
  and (wr_row('wr_v', 'wr_u1')).sealed_with = (wr_row('wr_u1', 'wr_v')).id
  and (wr_row('wr_u2', 'wr_v')).sealed_with = (wr_row('wr_v', 'wr_u1')).id);
-- the order the night takes them in: s1 before the pair holding t's seal,
-- and u2 after the pair holding v's
update celestual_entries set sealed_at = now() - interval '2 minutes'
 where from_handle = 'wr_s1' or (from_handle in ('wr_u1', 'wr_v') and sealed_with is not null);
update celestual_entries set sealed_at = now() - interval '1 minute'
 where from_handle = 'wr_u2' or (from_handle in ('wr_s2', 'wr_t') and sealed_with is not null);
select wr_night();
select wr_ok('on the night both handles'' notes are mutual, whichever held the seal',
  (select bool_and(matched_at is not null and sealed_with is null) and count(*) = 6
     from celestual_entries where from_handle in ('wr_s1', 'wr_s2', 'wr_t', 'wr_u1', 'wr_u2', 'wr_v')));
select wr_ok('and neither is listed as not this time',
  (select count(*) = 2 and bool_and((x->>'mutual')::boolean and not (x->>'lapsed')::boolean)
     from jsonb_array_elements(wr_list('wr_s1')->'pings') x where x->>'handle' = 'wr_t')
  and (select count(*) = 2 and bool_and((x->>'mutual')::boolean and not (x->>'lapsed')::boolean)
     from jsonb_array_elements(wr_list('wr_u1')->'pings') x where x->>'handle' = 'wr_v'));
select wr_ok('the other side is told once, by the pair that held the seal',
  (select count(*) from celestual_matches where 'wr_t' in (handle_a, handle_b)) = 1
  and (select count(*) from celestual_matches where 'wr_v' in (handle_a, handle_b)) = 1);

-- ── 15. every running note ends on a reveal ─────────────────────────────────
select wr_ok('after all of it, every note still running ends on a reveal',
  not exists (select 1 from celestual_entries
               where matched_at is null and expires_at > now()
                 and expires_at <> celestual_next_reveal(expires_at - interval '1 microsecond')));

rollback;

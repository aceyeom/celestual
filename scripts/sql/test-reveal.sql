-- ─────────────────────────────────────────────────────────────────────────────
-- test-reveal.sql: exercises 0054_reveal_night.sql.
--
-- A match is held until the night and, until then, looks like two standing
-- pings to both people: the sky, the meter, renewing, letting go, and the
-- answer celestual_submit gives. On the night it opens for both at once, and
-- the sweep writes the mail and the DM exactly once. Run through
-- scripts/verify-migrations.sh --test, inside one transaction that never
-- commits.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function r_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function r_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, verified_at, expires_at)
  values (p_handle, 'test' || substr(md5(p_proof), 1, 6), encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', now(), now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'reveal-salt')
  on conflict (key) do nothing;

-- ── the arithmetic ──────────────────────────────────────────────────────────
-- Defaults: Saturday, 21:00, America/Los_Angeles. 2026: daylight time starts
-- 8 March and ends 1 November.
select r_ok('defaults: saturday, nine in the evening, los angeles',
  celestual_reveal_dow() = 6 and celestual_reveal_hour() = 21 and celestual_reveal_tz() = 'America/Los_Angeles');
select r_ok('from a tuesday in july the night is saturday 9 pm pdt',
  celestual_next_reveal('2026-07-14T19:00:00Z') = '2026-07-19T04:00:00Z'::timestamptz);
select r_ok('from saturday 8:59 pm it is one minute away',
  celestual_next_reveal('2026-07-19T03:59:00Z') = '2026-07-19T04:00:00Z'::timestamptz);
select r_ok('from saturday 9 pm sharp it is next week',
  celestual_next_reveal('2026-07-19T04:00:00Z') = '2026-07-26T04:00:00Z'::timestamptz);
select r_ok('the saturday before the november change is still 04:00 utc',
  celestual_next_reveal('2026-10-30T19:00:00Z') = '2026-11-01T04:00:00Z'::timestamptz);
select r_ok('after the november change it is 05:00 utc',
  celestual_next_reveal('2026-11-02T20:00:00Z') = '2026-11-08T05:00:00Z'::timestamptz);
select r_ok('after the march change it is 04:00 utc',
  celestual_next_reveal('2026-03-09T20:00:00Z') = '2026-03-15T04:00:00Z'::timestamptz);
select r_ok('the next night is in the future', celestual_next_reveal() > now());

-- ── the desk ────────────────────────────────────────────────────────────────
select r_ok('desk: a bad zone is refused',
  (celestual_desk_setting_set('reveal_tz', 'Mars/Olympus')->>'error') = 'bad_value');
select r_ok('desk: a bad hour is refused',
  (celestual_desk_setting_set('reveal_hour', '24')->>'error') = 'bad_value');
select r_ok('desk: a bad day is refused',
  (celestual_desk_setting_set('reveal_dow', '7')->>'error') = 'bad_value');
select r_ok('desk: a real zone is taken',
  (celestual_desk_setting_set('reveal_tz', 'America/New_York')->>'ok')::boolean);
select r_ok('desk: the settings carry the night',
  (celestual_desk_settings()->'settings'->>'reveal_tz') = 'America/New_York'
  and (celestual_desk_settings()->>'next_reveal') is not null);
select celestual_desk_setting_set('reveal_tz', 'America/Los_Angeles');

select celestual_desk_setting_set('reveal_night', 'false');
select r_ok('off: the night is now',
  celestual_next_reveal('2026-07-14T19:00:00Z') = '2026-07-14T19:00:00Z'::timestamptz);
select r_ok('off: the public read says so',
  not (celestual_reveal_night()->>'enabled')::boolean and (celestual_reveal_night()->>'next') is null);
select celestual_desk_setting_set('reveal_night', 'true');

select r_ok('public: reveal_night answers for everyone',
  (celestual_reveal_night()->>'enabled')::boolean
  and (celestual_reveal_night()->>'tz') = 'America/Los_Angeles'
  and (celestual_reveal_night()->>'dow')::int = 6
  and (celestual_reveal_night()->>'next') is not null);
select r_ok('anon may read reveal night', has_function_privilege('anon', 'celestual_reveal_night()', 'execute'));
select r_ok('anon may not sweep', not has_function_privilege('anon', 'celestual_reveal_sweep()', 'execute'));
select r_ok('anon may not read the arithmetic',
  not has_function_privilege('anon', 'celestual_next_reveal(timestamptz)', 'execute'));

-- ── a pair, held ────────────────────────────────────────────────────────────
select r_proof('rv.ana', 'proof-ana');
select r_proof('rv.bo', 'proof-bo');

do $$
declare r jsonb; p jsonb;
begin
  r := celestual_submit('rv.ana', 'rv.bo', 'ana@example.test', 'proof-ana', jsonb_build_object('words', 'hi bo'));
  perform r_ok('ana places on bo: recorded, not mutual',
    (r->>'recorded')::boolean and not (r->>'mutual')::boolean);

  r := celestual_submit('rv.bo', 'rv.ana', 'bo@example.test', 'proof-bo', jsonb_build_object('words', 'hi ana'));
  perform r_ok('bo places on ana: recorded, and the match is held',
    (r->>'recorded')::boolean and not (r->>'mutual')::boolean
    and (r->>'match') is null and (r->'match_card') = 'null'::jsonb);
  perform r_ok('held: the meter still counts it as standing',
    (r->'slots'->>'standing')::int = 1);

  perform r_ok('held: both rows are matched and carry a night to come',
    (select count(*) from celestual_entries
      where from_handle in ('rv.ana', 'rv.bo') and matched_at is not null and reveal_at > now()) = 2);
  perform r_ok('held: the match row carries the night and is not queued',
    (select count(*) from celestual_matches
      where handle_a = 'rv.ana' and handle_b = 'rv.bo' and reveal_at > now() and queued_at is null) = 1);
  perform r_ok('held: nothing was mailed or queued',
    (select count(*) from celestual_notifications) = 0
    and (select count(*) from celestual_dm_outbox) = 0);

  p := celestual_my_pings('rv.ana', 'proof-ana');
  perform r_ok('held: ana sky reads standing, the name she typed, no other card',
    not (p->'pings'->0->>'mutual')::boolean
    and (p->'pings'->0->'their_card') = 'null'::jsonb
    and p->'pings'->0->>'handle' = 'rv.bo'
    and (p->'pings'->0->>'revealed_at') is null);
  p := celestual_my_pings('rv.bo', 'proof-bo');
  perform r_ok('held: bo sky reads standing', not (p->'pings'->0->>'mutual')::boolean);

  perform r_ok('held: the counterpart card is sealed', celestual_counterpart_card('rv.ana', 'rv.bo') is null);
  perform r_ok('held: ping_status says not mutual and no card',
    not (celestual_ping_status('rv.ana', array['rv.bo'], 'proof-ana')->'pings'->0->>'mutual')::boolean
    and (celestual_ping_status('rv.ana', array['rv.bo'], 'proof-ana')->'pings'->0->'their_card') = 'null'::jsonb);
  perform r_ok('held: standing count is one each',
    celestual_standing_count('rv.ana') = 1 and celestual_standing_count('rv.bo') = 1);
  perform r_ok('held: billing status counts it',
    (celestual_billing_status('rv.ana', 'proof-ana')->>'standing')::int = 1);
  perform r_ok('held: slots_for counts it',
    (celestual_slots_for('rv.ana', 'proof-ana')->>'standing')::int = 1);
  perform r_ok('held: the desk lists it as mutual, not yet open',
    exists (select 1 from jsonb_array_elements(celestual_desk_pings('mutual')->'rows') x
             where x->>'from_handle' = 'rv.ana' and not (x->>'open')::boolean and (x->>'reveal_at') is not null));

  r := celestual_renew('rv.ana', 'rv.bo', 'proof-ana');
  perform r_ok('held: renewing works', (r->>'ok')::boolean);

  r := celestual_reveal_sweep();
  perform r_ok('sweep: nothing before the night', (r->>'queued')::int = 0);
end $$;

-- ── the night comes ─────────────────────────────────────────────────────────
update celestual_entries set reveal_at = now() - interval '1 minute' where from_handle in ('rv.ana', 'rv.bo');
update celestual_matches set reveal_at = now() - interval '1 minute' where handle_a = 'rv.ana' and handle_b = 'rv.bo';

do $$
declare r jsonb; p jsonb;
begin
  p := celestual_my_pings('rv.ana', 'proof-ana');
  perform r_ok('open: ana sky reads mutual with the other card',
    (p->'pings'->0->>'mutual')::boolean
    and p->'pings'->0->'their_card'->>'words' = 'hi ana'
    and (p->'pings'->0->>'revealed_at') is not null);
  p := celestual_my_pings('rv.bo', 'proof-bo');
  perform r_ok('open: bo sky reads mutual with the other card',
    (p->'pings'->0->>'mutual')::boolean and p->'pings'->0->'their_card'->>'words' = 'hi bo');
  perform r_ok('open: the slot is free', celestual_standing_count('rv.ana') = 0);
  perform r_ok('open: the desk says open',
    exists (select 1 from jsonb_array_elements(celestual_desk_pings('mutual')->'rows') x
             where x->>'from_handle' = 'rv.ana' and (x->>'open')::boolean));

  r := celestual_reveal_sweep();
  perform r_ok('sweep: two mails and two DMs, once',
    (r->>'queued')::int = 1
    and (select count(*) from celestual_notifications) = 2
    and (select count(*) from celestual_dm_outbox) = 2);
  r := celestual_reveal_sweep();
  perform r_ok('sweep: a second pass writes nothing',
    (r->>'queued')::int = 0 and (select count(*) from celestual_notifications) = 2);
  perform r_ok('sweep: the mail names the right people and the cards',
    exists (select 1 from celestual_notifications
             where to_email = 'ana@example.test' and self_handle = 'rv.ana' and other_handle = 'rv.bo' and has_card)
    and exists (select 1 from celestual_notifications
             where to_email = 'bo@example.test' and self_handle = 'rv.bo' and other_handle = 'rv.ana' and has_card));
  perform r_ok('sweep: the DM names the right people',
    exists (select 1 from celestual_dm_outbox where handle = 'rv.ana' and other_handle = 'rv.bo')
    and exists (select 1 from celestual_dm_outbox where handle = 'rv.bo' and other_handle = 'rv.ana'));
  perform r_ok('open: renewing a mutual is refused, as before',
    not (celestual_renew('rv.ana', 'rv.bo', 'proof-ana')->>'ok')::boolean);
end $$;

-- ── letting go of a held pair ───────────────────────────────────────────────
select r_proof('rv.cy', 'proof-cy');
select r_proof('rv.di', 'proof-di');

do $$
declare r jsonb; e0 timestamptz; e1 timestamptz;
begin
  perform celestual_submit('rv.di', 'rv.cy', null, 'proof-di', null);
  select expires_at into e0 from celestual_entries where from_handle = 'rv.di';
  perform celestual_submit('rv.cy', 'rv.di', null, 'proof-cy', null);
  perform r_ok('second pair: matched and held',
    (select count(*) from celestual_entries
      where from_handle in ('rv.cy', 'rv.di') and matched_at is not null and reveal_at > now()) = 2);
  perform r_ok('second pair: sixty days is past the night, so di''s lapse did not move',
    (select expires_at from celestual_entries where from_handle = 'rv.di') = e0);

  r := celestual_withdraw('rv.cy', 'rv.di', 'proof-cy');
  perform r_ok('let go, held: withdrawn', (r->>'withdrawn')::boolean);
  select expires_at into e1 from celestual_entries where from_handle = 'rv.di';
  perform r_ok('let go, held: the other side is unmatched and its days left did not move',
    e1 = e0
    and (select matched_at is null and matched_handle is null and reveal_at is null
           from celestual_entries where from_handle = 'rv.di'));
  perform r_ok('let go, held: the match row is gone',
    (select count(*) from celestual_matches where handle_a = 'rv.cy' and handle_b = 'rv.di') = 0);
  perform r_ok('let go, held: di still reads standing on the sky',
    not (celestual_my_pings('rv.di', 'proof-di')->'pings'->0->>'mutual')::boolean);
end $$;

-- ── the last week edge ──────────────────────────────────────────────────────
select r_proof('rv.ed', 'proof-ed');
select r_proof('rv.fay', 'proof-fay');

do $$
begin
  perform celestual_submit('rv.ed', 'rv.fay', null, 'proof-ed', null);
  update celestual_entries set expires_at = now() + interval '1 hour' where from_handle = 'rv.ed';
  perform celestual_submit('rv.fay', 'rv.ed', null, 'proof-fay', null);
  perform r_ok('last week: the lapse moved out to the night',
    (select expires_at >= reveal_at and reveal_at > now() from celestual_entries where from_handle = 'rv.ed'));
  perform celestual_submit('rv.ed', 'rv.fay', null, 'proof-ed', null);
  perform r_ok('last week: re-placing a held pair resets the window like any standing ping',
    (select expires_at > now() + interval '59 days' and matched_at is not null and reveal_at > now()
       from celestual_entries where from_handle = 'rv.ed'));
end $$;

-- ── what was true yesterday ─────────────────────────────────────────────────
select r_proof('rv.old.a', 'proof-old');
insert into celestual_entries (from_handle, to_hash, to_handle, matched_at, matched_handle, expires_at)
values ('rv.old.a', celestual_hash_handle('rv.old.b'), 'rv.old.b', now() - interval '1 day', 'rv.old.b', now() + interval '50 days');
select r_ok('legacy: a null reveal_at reads as open', celestual_revealed(now() - interval '1 day', null));
select r_ok('legacy: the sky reads it mutual',
  (celestual_my_pings('rv.old.a', 'proof-old')->'pings'->0->>'mutual')::boolean);
select r_ok('legacy: an unmatched row is not open', not celestual_revealed(null, null));

-- ── the switch off: at once, as before ──────────────────────────────────────
select celestual_desk_setting_set('reveal_night', 'false');
select r_proof('rv.gil', 'proof-gil');
select r_proof('rv.hal', 'proof-hal');

do $$
declare r jsonb;
begin
  perform celestual_submit('rv.gil', 'rv.hal', 'gil@example.test', 'proof-gil', null);
  r := celestual_submit('rv.hal', 'rv.gil', 'hal@example.test', 'proof-hal', null);
  perform r_ok('off: the match opens at once', (r->>'mutual')::boolean and r->>'match' = 'rv.gil');
  perform r_ok('off: the mail is written at once and the pair is stamped queued',
    (select count(*) from celestual_notifications n
       join celestual_matches m on m.id = n.match_id
      where m.handle_a = 'rv.gil' and m.handle_b = 'rv.hal') = 2
    and (select queued_at is not null from celestual_matches where handle_a = 'rv.gil' and handle_b = 'rv.hal'));
  perform r_ok('off: the sweep has nothing to add',
    (celestual_reveal_sweep()->>'queued')::int = 0);
  perform r_ok('off: the sky reads it mutual',
    (celestual_my_pings('rv.hal', 'proof-hal')->'pings'->0->>'mutual')::boolean);
end $$;

rollback;

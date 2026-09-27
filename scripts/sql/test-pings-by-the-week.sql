-- ─────────────────────────────────────────────────────────────────────────────
-- test-pings-by-the-week.sql: exercises 0071_pings_by_the_week.sql.
--
-- One free ping a reveal, the free one spent first, bought ones after it, ten
-- at the most, across every @ one person has linked. Changing the words of a
-- running note spends nothing; letting one go gives its pings back, free or
-- bought; keeping one spends next week's; a pair made mutual gives back what
-- it held for a reveal after its night. Buying three grants three, once; a
-- refund takes them back, in proportion to the money, never below zero. The
-- allowance is the proof's alone. Erasure takes the ledger, and a note to the
-- erased @ gives its sender's ping back. The broom takes the ledger a
-- fortnight after its reveal, new pairs are bounded at thirty a week, and a
-- slot bought before is a ping on hand.
-- Time is moved by moving the rows' own timestamps back, the ledger's with
-- the notes'. Run through scripts/verify-migrations.sh --test; everything is
-- rolled back at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function pw_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function pw_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function pw_row(p_from text, p_to text) returns celestual_entries
language sql as $$
  select * from celestual_entries where from_handle = p_from and to_hash = celestual_hash_handle(p_to)
$$;

create or replace function pw_send(p_from text, p_to text, p_card jsonb default null) returns jsonb
language plpgsql as $$
begin
  return celestual_submit(p_from, p_to, null, 'proof-' || p_from, p_card);
end; $$;

create or replace function pw_allow(p_handle text) returns jsonb
language plpgsql as $$
begin
  return celestual_ping_allowance(p_handle, 'proof-' || p_handle)->'allowance';
end; $$;

create or replace function pw_spend(p_from text, p_to text, p_reveal timestamptz) returns celestual_ping_spends
language sql as $$
  select * from celestual_ping_spends
   where handle = p_from and to_hash = celestual_hash_handle(p_to) and reveal_at = p_reveal
$$;

create or replace function pw_spends(p_from text) returns int
language sql as $$ select count(*)::int from celestual_ping_spends where handle = p_from $$;

create or replace function pw_give(p_handle text, p_n int) returns void
language sql as $$
  insert into celestual_entitlements (handle, ping_credits) values (p_handle, p_n)
  on conflict (handle) do update set ping_credits = excluded.ping_credits
$$;

create or replace function pw_credits(p_handle text) returns int
language sql as $$
  select coalesce((select ping_credits from celestual_entitlements where handle = p_handle), 0)
$$;

create or replace function pw_rejects(p_sql text) returns boolean
language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when check_violation then
  return true;
end; $$;

-- the reveal a note sent now runs to, and the one after it
create temp table pw_r as
  select celestual_note_ends(now()) as r0, celestual_next_reveal(celestual_note_ends(now())) as r1;
create or replace function pw_r0() returns timestamptz language sql as $$ select r0 from pw_r $$;
create or replace function pw_r1() returns timestamptz language sql as $$ select r1 from pw_r $$;

select pw_proof(h) from unnest(array['pw_a', 'pw_t5', 'pw_c', 'pw_l', 'pw_buy', 'pw_g1', 'pw_g2',
                                     'pw_e', 'pw_x', 'pw_y', 'pw_o', 'pw_r']) h;

-- ── 1. the doors ────────────────────────────────────────────────────────────
select pw_ok('the allowance is the browser''s to ask for, and the ledger is nobody''s',
  has_function_privilege('anon', 'celestual_ping_allowance(text, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_ping_allowance(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_ping_spend(text, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_ping_spend(text, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_ping_refund(text, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_ping_allowance_for(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_ping_allowance_for(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_ping_forget(text)', 'EXECUTE')
  and not has_table_privilege('anon', 'celestual_ping_spends', 'SELECT')
  and not has_table_privilege('authenticated', 'celestual_ping_spends', 'INSERT')
  and (select relrowsecurity from pg_class where oid = 'celestual_ping_spends'::regclass));
select pw_ok('buying is the service role''s alone, and the old doors of three and two arguments are gone',
  not has_function_privilege('anon', 'celestual_billing_begin(text, text, text, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_billing_begin(text, text, text, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_billing_begin(text, text, text, integer)', 'EXECUTE')
  and to_regprocedure('celestual_billing_begin(text, text, text)') is null
  and not has_function_privilege('anon', 'celestual_billing_revoke(text, text, integer, integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_billing_revoke(text, text, integer, integer)', 'EXECUTE')
  and to_regprocedure('celestual_billing_revoke(text, text)') is null
  and not has_function_privilege('anon', 'celestual_billing_complete(uuid, text, text, integer, text, text, text, timestamptz)', 'EXECUTE'));
select pw_ok('the doors the browser had, it still has',
  has_function_privilege('anon', 'celestual_submit(text, text, text, text, jsonb)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_my_pings(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_renew(text, text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_withdraw(text, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_reveal_due()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_purge_expired()', 'EXECUTE'));

-- ── 2. the allowance, and who may read it ───────────────────────────────────
create temp table pw_nobody as select celestual_ping_allowance('pw_a', 'not-the-proof') as r;
select pw_ok('without the proof it answers nobody''s: the free ping, nothing bought, nothing sent',
  not ((select r from pw_nobody)->>'ok')::boolean
  and ((select r from pw_nobody)->'allowance'->>'free')::int = 1
  and ((select r from pw_nobody)->'allowance'->>'free_left')::int = 1
  and ((select r from pw_nobody)->'allowance'->>'credits')::int = 0
  and ((select r from pw_nobody)->'allowance'->>'sent')::int = 0
  and ((select r from pw_nobody)->'allowance'->'next'->>'free_left')::int = 1
  and ((select r from pw_nobody)->'allowance'->'next'->>'sent')::int = 0);
select pw_give('pw_a', 7);
select pw_ok('so a stranger never learns what a handle bought',
  ((celestual_ping_allowance('pw_a', 'not-the-proof'))->'allowance'->>'credits')::int = 0
  and ((celestual_ping_allowance('pw_a', null))->'allowance'->>'credits')::int = 0
  and (pw_allow('pw_a')->>'credits')::int = 7);
select pw_give('pw_a', 0);
create temp table pw_mine as select celestual_ping_allowance('pw_a', 'proof-pw_a') as r;
select pw_ok('with the proof it answers the handle''s own, in the contract''s shape',
  ((select r from pw_mine)->>'ok')::boolean
  and (select array_agg(k order by k) from jsonb_object_keys((select r from pw_mine)->'allowance') k)
      = array['ceiling', 'credits', 'free', 'free_left', 'next', 'price_cents', 'reveal_at', 'sent']
  and (select array_agg(k order by k) from jsonb_object_keys((select r from pw_mine)->'allowance'->'next') k)
      = array['free_left', 'reveal_at', 'sent']);
select pw_ok('the reveal is the one a note sent now runs to, and next the one after it',
  ((select r from pw_mine)->'allowance'->>'reveal_at')::timestamptz = pw_r0()
  and ((select r from pw_mine)->'allowance'->'next'->>'reveal_at')::timestamptz = pw_r1()
  and pw_r1() = celestual_next_reveal(pw_r0())
  and ((select r from pw_mine)->'allowance'->>'reveal_at') ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$');
select pw_ok('ten at the most, $2.99 each',
  ((select r from pw_mine)->'allowance'->>'ceiling')::int = 10
  and ((select r from pw_mine)->'allowance'->>'price_cents')::int = 299);
select pw_ok('the list carries the same allowance beside its two reveals',
  celestual_my_pings('pw_a', 'proof-pw_a')->'allowance' = pw_allow('pw_a')
  and celestual_my_pings('pw_a', 'proof-pw_a') ? 'next_reveal'
  and celestual_my_pings('pw_a', 'proof-pw_a') ? 'last_reveal');

-- ── 3. the first note of the week ───────────────────────────────────────────
create temp table pw_first as select pw_send('pw_a', 'pw_t1', '{"words":"the stairwell"}'::jsonb) as r;
select pw_ok('the first note of the week goes out on the free ping',
  ((select r from pw_first)->>'recorded')::boolean
  and (pw_spend('pw_a', 'pw_t1', pw_r0())).kind = 'free'
  and pw_spends('pw_a') = 1);
select pw_ok('and says so: the free one gone, one sent, and the slots drawn from it',
  ((select r from pw_first)->'allowance'->>'free_left')::int = 0
  and ((select r from pw_first)->'allowance'->>'sent')::int = 1
  and (select r from pw_first)->'slots' = '{"standing": 1, "cap": 1}'::jsonb);

-- ── 4. the second, with nothing bought ──────────────────────────────────────
create temp table pw_attempts0 as select count(*) as n from celestual_attempts where from_handle = 'pw_a';
create temp table pw_second as select pw_send('pw_a', 'pw_t2') as r;
select pw_ok('a second note in the same reveal is refused: no pings',
  not ((select r from pw_second)->>'recorded')::boolean
  and (select r from pw_second)->>'error' = 'no_pings'
  and ((select r from pw_second)->'allowance'->>'free_left')::int = 0
  and ((select r from pw_second)->'allowance'->>'credits')::int = 0
  and (select r from pw_second)->'slots' = '{"standing": 1, "cap": 1}'::jsonb);
select pw_ok('and the refusal wrote nothing: no note, no ping, no attempt, no placement',
  (pw_row('pw_a', 'pw_t2')).id is null
  and (pw_spend('pw_a', 'pw_t2', pw_r0())).id is null
  and (select count(*) from celestual_attempts where from_handle = 'pw_a') = (select n from pw_attempts0)
  and (select count(*) from celestual_placements where handle = 'pw_a') = 1);

-- ── 5. changing the words ───────────────────────────────────────────────────
create temp table pw_edit as select pw_send('pw_a', 'pw_t1', '{"words":"the stairwell, again"}'::jsonb) as r;
select pw_ok('changing the words of a running note spends nothing',
  ((select r from pw_edit)->>'recorded')::boolean
  and (pw_row('pw_a', 'pw_t1')).card->>'words' = 'the stairwell, again'
  and pw_spends('pw_a') = 1
  and ((select r from pw_edit)->'allowance'->>'sent')::int = 1);

-- ── 6. with three bought ────────────────────────────────────────────────────
select pw_give('pw_a', 3);
select pw_send('pw_a', 'pw_t2');
select pw_send('pw_a', 'pw_t3');
select pw_send('pw_a', 'pw_t4');
select pw_ok('with three bought, the second, third and fourth notes spend them',
  (select count(*) from celestual_ping_spends where handle = 'pw_a' and kind = 'paid' and reveal_at = pw_r0()) = 3
  and pw_credits('pw_a') = 0
  and (pw_allow('pw_a')->>'sent')::int = 4
  and (pw_allow('pw_a')->>'credits')::int = 0);
select pw_ok('and a fifth is refused, the slots full',
  pw_send('pw_a', 'pw_t5')->>'error' = 'no_pings'
  and pw_send('pw_a', 'pw_t5')->'slots' = '{"standing": 4, "cap": 4}'::jsonb);

-- ── 7. letting go ───────────────────────────────────────────────────────────
select pw_ok('letting a note go that spent a bought ping gives the bought ping back',
  (celestual_withdraw('pw_a', 'pw_t3', 'proof-pw_a')->>'withdrawn')::boolean
  and pw_credits('pw_a') = 1
  and (pw_spend('pw_a', 'pw_t3', pw_r0())).id is null
  and (pw_allow('pw_a')->>'sent')::int = 3);
create temp table pw_go as select celestual_withdraw('pw_a', 'pw_t1', 'proof-pw_a') as r;
select pw_ok('letting the free one go gives the week''s free one back, and the answer says so',
  ((select r from pw_go)->>'withdrawn')::boolean
  and ((select r from pw_go)->'allowance'->>'free_left')::int = 1
  and ((select r from pw_go)->'allowance'->>'sent')::int = 2
  and pw_credits('pw_a') = 1);
select pw_send('pw_a', 'pw_t5');
select pw_ok('the free one is spent before a bought one',
  (pw_spend('pw_a', 'pw_t5', pw_r0())).kind = 'free' and pw_credits('pw_a') = 1);

-- ── 8. keeping one for next week ────────────────────────────────────────────
create temp table pw_keep as select celestual_renew('pw_a', 'pw_t5', 'proof-pw_a') as r;
select pw_ok('keeping a note for next week spends next week''s ping, the free one first',
  ((select r from pw_keep)->>'ok')::boolean
  and ((select r from pw_keep)->>'expires_at')::timestamptz = pw_r1()
  and (pw_spend('pw_a', 'pw_t5', pw_r1())).kind = 'free'
  and pw_credits('pw_a') = 1);
select pw_ok('and the answer carries the allowance, next week''s free one gone',
  ((select r from pw_keep)->'allowance'->'next'->>'free_left')::int = 0
  and ((select r from pw_keep)->'allowance'->'next'->>'sent')::int = 1
  and ((select r from pw_keep)->'allowance'->>'sent')::int = 3);
select pw_ok('kept again, it says yes and spends nothing more',
  (celestual_renew('pw_a', 'pw_t5', 'proof-pw_a')->>'ok')::boolean
  and pw_spends('pw_a') = 4);
select pw_ok('the next keep spends a bought one',
  (celestual_renew('pw_a', 'pw_t2', 'proof-pw_a')->>'ok')::boolean
  and (pw_spend('pw_a', 'pw_t2', pw_r1())).kind = 'paid'
  and pw_credits('pw_a') = 0);
create temp table pw_nokeep as select celestual_renew('pw_a', 'pw_t4', 'proof-pw_a') as r;
select pw_ok('a keep that cannot be paid for is refused, says why, and changes nothing',
  not ((select r from pw_nokeep)->>'ok')::boolean
  and (select r from pw_nokeep)->>'error' = 'no_pings'
  and ((select r from pw_nokeep)->'allowance'->'next'->>'sent')::int = 2
  and (pw_row('pw_a', 'pw_t4')).expires_at = pw_r0()
  and (pw_spend('pw_a', 'pw_t4', pw_r1())).id is null);
select pw_ok('letting a kept note go gives back every ping it holds for a reveal to come',
  (celestual_withdraw('pw_a', 'pw_t2', 'proof-pw_a')->>'withdrawn')::boolean
  and pw_credits('pw_a') = 2
  and (pw_allow('pw_a')->'next'->>'sent')::int = 1
  and (pw_allow('pw_a')->>'sent')::int = 2);

-- ── 9. a pair made mutual ───────────────────────────────────────────────────
create temp table pw_before as select pw_allow('pw_a') as a;
select pw_send('pw_t5', 'pw_a');
select pw_ok('the other side answers, and the pair is sealed',
  (pw_row('pw_a', 'pw_t5')).sealed_with = (pw_row('pw_t5', 'pw_a')).id);
select pw_ok('sealed, the allowance says nothing new',
  pw_allow('pw_a') = (select a from pw_before));
-- the night comes: both notes, and the ping each spent on it, move to it
update celestual_entries set reveal_at = now() - interval '1 second'
 where from_handle in ('pw_a', 'pw_t5') and sealed_with is not null;
update celestual_ping_spends set reveal_at = now() - interval '1 second'
 where ((handle = 'pw_a' and to_hash = celestual_hash_handle('pw_t5'))
     or (handle = 'pw_t5' and to_hash = celestual_hash_handle('pw_a')))
   and reveal_at = pw_r0();
select celestual_reveal_due();
select pw_ok('on its night the pair is mutual',
  (pw_row('pw_a', 'pw_t5')).matched_at is not null and (pw_row('pw_t5', 'pw_a')).matched_at is not null);
select pw_ok('the ping kept for the week after comes back, and the one its night used stays used',
  (pw_spend('pw_a', 'pw_t5', pw_r1())).id is null
  and (pw_spend('pw_a', 'pw_t5', now() - interval '1 second')).kind = 'free'
  and (pw_spend('pw_t5', 'pw_a', now() - interval '1 second')).kind = 'free'
  and (pw_allow('pw_a')->'next'->>'free_left')::int = 1
  and (pw_allow('pw_a')->'next'->>'sent')::int = 0
  and pw_credits('pw_a') = 2);

-- ── 10. the ceiling ─────────────────────────────────────────────────────────
select pw_give('pw_c', 20);
do $$
begin
  for i in 1..10 loop
    perform celestual_submit('pw_c', 'pw_c' || lpad(i::text, 2, '0'), null, 'proof-pw_c', null);
  end loop;
end $$;
select pw_ok('ten go out in one reveal, one free and nine bought',
  (pw_allow('pw_c')->>'sent')::int = 10
  and pw_credits('pw_c') = 11
  and (select count(*) from celestual_ping_spends where handle = 'pw_c' and kind = 'free') = 1);
create temp table pw_full as select pw_send('pw_c', 'pw_c11') as r;
select pw_ok('the eleventh is refused as a full week, with pings still on hand',
  not ((select r from pw_full)->>'recorded')::boolean
  and (select r from pw_full)->>'error' = 'week_full'
  and (select r from pw_full)->'slots' = '{"standing": 10, "cap": 10}'::jsonb
  and ((select r from pw_full)->'allowance'->>'credits')::int = 11
  and (pw_row('pw_c', 'pw_c11')).id is null
  and pw_credits('pw_c') = 11);
-- next week filled to the ceiling (put there directly)
insert into celestual_ping_spends (handle, to_hash, reveal_at, kind)
select 'pw_c', celestual_hash_handle('pw_cx' || i), pw_r1(), 'paid' from generate_series(1, 10) i;
select pw_ok('and a keep into a full week is refused the same way',
  celestual_renew('pw_c', 'pw_c01', 'proof-pw_c')->>'error' = 'week_full'
  and (pw_row('pw_c', 'pw_c01')).expires_at = pw_r0());

-- ── 11. a note that was not this time ───────────────────────────────────────
select pw_give('pw_l', 1);
select pw_send('pw_l', 'pw_lt');
select pw_send('pw_l', 'pw_lu');
-- both lapse at a reveal two days ago
update celestual_entries set expires_at = now() - interval '2 days' where from_handle = 'pw_l';
update celestual_ping_spends set reveal_at = now() - interval '2 days' where handle = 'pw_l';
select pw_ok('it used its ping, and this week''s free one is there',
  (pw_allow('pw_l')->>'free_left')::int = 1
  and (pw_allow('pw_l')->>'sent')::int = 0
  and pw_credits('pw_l') = 0);
select pw_ok('let go after its night, it gives nothing back: the ping was used',
  (celestual_withdraw('pw_l', 'pw_lu', 'proof-pw_l')->>'withdrawn')::boolean
  and pw_credits('pw_l') = 0
  and pw_spends('pw_l') = 2);
select pw_ok('sent again, it spends a ping for its new reveal',
  (pw_send('pw_l', 'pw_lt')->>'recorded')::boolean
  and (pw_spend('pw_l', 'pw_lt', pw_r0())).kind = 'free'
  and (pw_row('pw_l', 'pw_lt')).expires_at = pw_r0()
  and pw_spends('pw_l') = 3);

-- ── 12. buying ──────────────────────────────────────────────────────────────
create temp table pw_b1 as select celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 3) as r;
select pw_ok('buying three writes a pending purchase for three',
  ((select r from pw_b1)->>'ok')::boolean
  and (select r from pw_b1)->>'kind' = 'pings'
  and ((select r from pw_b1)->>'quantity')::int = 3
  and (select quantity = 3 and status = 'pending' and handle = 'pw_buy'
         from celestual_purchases where id = ((select r from pw_b1)->>'purchase_id')::uuid));
select pw_ok('a quantity outside one to ten is refused',
  celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 0)->>'error' = 'quantity'
  and celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 11)->>'error' = 'quantity'
  and celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', null)->>'error' = 'quantity'
  and (celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings')->>'quantity')::int = 1);
select pw_ok('so is a kind nobody sells, and a buyer without the proof',
  celestual_billing_begin('pw_buy', 'proof-pw_buy', 'nope', 1)->>'error' = 'kind'
  and celestual_billing_begin('pw_buy', 'not-the-proof', 'pings', 1)->>'error' = 'unverified'
  and celestual_billing_begin('pw_buy', null, 'pings', 1)->>'error' = 'unverified');
create temp table pw_slot as select celestual_billing_begin('pw_buy', 'proof-pw_buy', 'slot', 5) as r;
select pw_ok('a slot, the old kind, is still taken, as one',
  ((select r from pw_slot)->>'ok')::boolean and ((select r from pw_slot)->>'quantity')::int = 1);

create temp table pw_paid as
  select celestual_billing_complete(((select r from pw_b1)->>'purchase_id')::uuid,
           'cs_pw_1', 'pi_pw_1', 897, 'usd', 'cus_pw', null, null) as r;
select pw_ok('paid, the three land',
  ((select r from pw_paid)->>'ok')::boolean
  and ((select r from pw_paid)->>'applied')::boolean
  and (select r from pw_paid)->>'kind' = 'pings'
  and ((select r from pw_paid)->>'quantity')::int = 3
  and ((select r from pw_paid)->>'credits')::int = 3
  and pw_credits('pw_buy') = 3);
select pw_ok('told twice, the second grants nothing',
  not (celestual_billing_complete(((select r from pw_b1)->>'purchase_id')::uuid,
         'cs_pw_1', 'pi_pw_1', 897, 'usd', 'cus_pw', null, null)->>'applied')::boolean
  and pw_credits('pw_buy') = 3);
select pw_ok('the slot lands as one',
  ((celestual_billing_complete(((select r from pw_slot)->>'purchase_id')::uuid,
      'cs_pw_s', 'pi_pw_s', 299, 'usd', 'cus_pw', null, null))->>'credits')::int = 4);
-- the free one and two bought are spent on notes
select pw_send('pw_buy', 'pw_bt1');
select pw_send('pw_buy', 'pw_bt2');
select pw_send('pw_buy', 'pw_bt3');
select pw_ok('two of them are spent', pw_credits('pw_buy') = 2);
select celestual_billing_revoke('pi_pw_s', null, null, null);
select pw_ok('the slot refunded takes its one back', pw_credits('pw_buy') = 1);
create temp table pw_back as select celestual_billing_revoke('pi_pw_1', null, 897, 897) as r;
select pw_ok('the three refunded take back what is on hand, never below zero',
  ((select r from pw_back)->>'applied')::boolean
  and ((select r from pw_back)->>'quantity')::int = 1
  and ((select r from pw_back)->>'credits')::int = 0
  and pw_credits('pw_buy') = 0
  and (select status = 'refunded' and refunded_quantity = 3 from celestual_purchases where stripe_payment_intent = 'pi_pw_1'));
select pw_ok('and leave the notes already out where they are',
  (pw_row('pw_buy', 'pw_bt2')).id is not null and (pw_row('pw_buy', 'pw_bt3')).id is not null
  and (pw_spend('pw_buy', 'pw_bt3', pw_r0())).kind = 'paid');
select pw_ok('told twice, the refund takes nothing more',
  not (celestual_billing_revoke('pi_pw_1', null, 897, 897)->>'applied')::boolean);

create temp table pw_b2 as select celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 3) as r;
select celestual_billing_complete(((select r from pw_b2)->>'purchase_id')::uuid, 'cs_pw_2', 'pi_pw_2', 897, 'usd', null, null, null);
select pw_ok('a second three land', pw_credits('pw_buy') = 3);
select pw_ok('and refunded untouched, all three go back',
  (celestual_billing_revoke('pi_pw_2')->>'quantity')::int = 3 and pw_credits('pw_buy') = 0);

create temp table pw_b3 as select celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 3) as r;
select celestual_billing_complete(((select r from pw_b3)->>'purchase_id')::uuid, 'cs_pw_3', 'pi_pw_3', 897, 'usd', null, null, null);
-- Partial refunds of one charge, as Stripe tells them: amount_refunded is
-- the charge's running total, and the unit price is what the purchase was
-- charged over its quantity (897 / 3 = 299).
create temp table pw_part as select celestual_billing_revoke('pi_pw_3', null, 299) as r;
select pw_ok('a first partial refund of one ping''s money takes one ping, and the purchase stands',
  ((select r from pw_part)->>'quantity')::int = 1
  and ((select r from pw_part)->>'applied')::boolean
  and pw_credits('pw_buy') = 2
  and (select status = 'paid' and refunded_quantity = 1 from celestual_purchases where stripe_payment_intent = 'pi_pw_3'));
create temp table pw_part2 as
  select celestual_billing_revoke('pi_pw_3', null, 299) as again,
         celestual_billing_revoke('pi_pw_3', null, 450) as more;
select pw_ok('the same refund told again takes nothing, and less than another ping''s worth takes nothing',
  ((select again from pw_part2)->>'quantity')::int = 0
  and ((select more from pw_part2)->>'quantity')::int = 0
  and pw_credits('pw_buy') = 2
  and (select status = 'paid' and refunded_quantity = 1 from celestual_purchases where stripe_payment_intent = 'pi_pw_3'));
create temp table pw_part3 as select celestual_billing_revoke('pi_pw_3', null, 598) as r;
select pw_ok('a second partial refund takes only the difference, one more, and the purchase still stands',
  ((select r from pw_part3)->>'quantity')::int = 1
  and pw_credits('pw_buy') = 1
  and (select status = 'paid' and refunded_quantity = 2 from celestual_purchases where stripe_payment_intent = 'pi_pw_3'));
create temp table pw_rest as select celestual_billing_revoke('pi_pw_3', null, 897, 897) as r;
select pw_ok('refunded the rest of the way, the last one goes and the purchase is refunded',
  ((select r from pw_rest)->>'quantity')::int = 1
  and pw_credits('pw_buy') = 0
  and (select status = 'refunded' and refunded_quantity = 3 from celestual_purchases where stripe_payment_intent = 'pi_pw_3'));
select pw_ok('and after that nothing more is taken, whatever is told',
  not (celestual_billing_revoke('pi_pw_3', null, 897)->>'applied')::boolean
  and pw_credits('pw_buy') = 0);

-- a refund of a purchase one of whose pings is already spent takes what is
-- on hand, never below none, and leaves the note out
create temp table pw_b4 as select celestual_billing_begin('pw_buy', 'proof-pw_buy', 'pings', 2) as r;
select celestual_billing_complete(((select r from pw_b4)->>'purchase_id')::uuid, 'cs_pw_4', 'pi_pw_4', 598, 'usd', null, null, null);
select pw_send('pw_buy', 'pw_bt4');
select pw_ok('one of two bought is spent on a note', pw_credits('pw_buy') = 1);
create temp table pw_b4back as select celestual_billing_revoke('pi_pw_4', null, 598) as r;
select pw_ok('refunded in full, it takes the one on hand and not the one sent',
  ((select r from pw_b4back)->>'quantity')::int = 1
  and pw_credits('pw_buy') = 0
  and (pw_row('pw_buy', 'pw_bt4')).id is not null
  and (pw_spend('pw_buy', 'pw_bt4', pw_r0())).kind = 'paid');

-- ── 13. one person, two handles ─────────────────────────────────────────────
-- Linked as one person (celestual_handle_links, from before 0036 took the
-- linking away).
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['pw_g1', 'pw_g2']) h;
select pw_send('pw_g1', 'pw_gt1');
select pw_ok('one person with two handles has one free ping between them',
  pw_send('pw_g2', 'pw_gt2')->>'error' = 'no_pings'
  and (pw_allow('pw_g2')->>'sent')::int = 1
  and (pw_allow('pw_g2')->>'free_left')::int = 0);
select pw_give('pw_g1', 1);
select pw_ok('and a ping bought on one is spent from the other',
  (pw_allow('pw_g2')->>'credits')::int = 1
  and (pw_send('pw_g2', 'pw_gt2')->>'recorded')::boolean
  and pw_credits('pw_g1') = 0
  and (pw_spend('pw_g2', 'pw_gt2', pw_r0())).kind = 'paid');
select pw_ok('let go, it comes back to the handle that spent it, and both see it',
  (celestual_withdraw('pw_g2', 'pw_gt2', 'proof-pw_g2')->>'withdrawn')::boolean
  and pw_credits('pw_g2') = 1
  and (pw_allow('pw_g1')->>'credits')::int = 1);

-- ── 14. erasure ─────────────────────────────────────────────────────────────
select pw_give('pw_e', 1);
select pw_send('pw_e', 'pw_et');
select pw_send('pw_e', 'pw_x');
select pw_send('pw_x', 'pw_xt');
select pw_ok('before it, a bought ping is spent on a note to the @ about to go', pw_credits('pw_e') = 0);
select celestual_erase_account('pw_x', 'proof-pw_x');
select pw_ok('erasing an account takes its ledger, and every row about it',
  not exists (select 1 from celestual_ping_spends
               where handle = 'pw_x' or to_hash = celestual_hash_handle('pw_x')));
select pw_ok('and a note to it that went with it gives its sender''s ping back',
  pw_credits('pw_e') = 1
  and (pw_spend('pw_e', 'pw_et', pw_r0())).kind = 'free');

-- the opt out erases at least as much
select pw_give('pw_y', 1);
select pw_send('pw_y', 'pw_yt');
select pw_send('pw_y', 'pw_o');
select pw_send('pw_o', 'pw_ot');
select pw_ok('before it, the @ opting out has spent, and somebody has spent a bought ping on it',
  pw_spends('pw_o') = 1 and pw_credits('pw_y') = 0
  and (pw_spend('pw_y', 'pw_o', pw_r0())).kind = 'paid');
select celestual_suppress('pw_o', 'proof-pw_o');
select pw_ok('opting out takes every ledger row of the @ and about it',
  not exists (select 1 from celestual_ping_spends
               where handle = 'pw_o' or to_hash = celestual_hash_handle('pw_o')));
select pw_ok('and the note to it that went gives its sender''s ping back',
  pw_credits('pw_y') = 1 and (pw_spend('pw_y', 'pw_yt', pw_r0())).kind = 'free');

-- ── 15. the broom ───────────────────────────────────────────────────────────
insert into celestual_ping_spends (handle, to_hash, reveal_at, kind) values
  ('pw_old', 'pw_hash_1', now() - interval '15 days', 'free'),
  ('pw_old', 'pw_hash_2', now() - interval '13 days', 'free');
select pw_ok('the broom sweeps the ledger too',
  (celestual_purge_expired()->>'spends')::int >= 1);
select pw_ok('taking a ping a fortnight past its reveal, and not one sooner',
  not exists (select 1 from celestual_ping_spends where handle = 'pw_old' and to_hash = 'pw_hash_1')
  and exists (select 1 from celestual_ping_spends where handle = 'pw_old' and to_hash = 'pw_hash_2'));

-- ── 16. new pairs, a week ───────────────────────────────────────────────────
insert into celestual_placements (handle, created_at)
select 'pw_r', now() - interval '1 hour' from generate_series(1, 30);
select pw_ok('thirty new pairs in a week is the most, refused as the hourly limits are, before a ping is spent',
  pw_send('pw_r', 'pw_rt')->>'error' = 'rate_limited'
  and pw_spends('pw_r') = 0);
update celestual_placements set created_at = now() - interval '8 days' where handle = 'pw_r';
select pw_ok('and a week on there is room again',
  (pw_send('pw_r', 'pw_rt')->>'recorded')::boolean and pw_spends('pw_r') = 1);

-- ── 17. what was bought before ──────────────────────────────────────────────
-- The fold in section 2 of the migration, copied here as it is written there.
create or replace function pw_fold() returns int
language plpgsql as $$
declare
  v int;
begin
  update celestual_entitlements
     set ping_credits = ping_credits + extra_slots, extra_slots = 0, updated_at = now()
   where extra_slots > 0;
  get diagnostics v = row_count;
  return v;
end; $$;
insert into celestual_entitlements (handle, extra_slots) values ('pw_f', 2);
create temp table pw_folded as select pw_fold() as n;
select pw_ok('a slot bought before becomes a ping on hand',
  (select n from pw_folded) = 1 and pw_credits('pw_f') = 2
  and (select extra_slots from celestual_entitlements where handle = 'pw_f') = 0);
select pw_ok('once: folded again, nothing moves', pw_fold() = 0 and pw_credits('pw_f') = 2);
select pw_ok('the ledger of purchases takes pings, one to ten of them, and a count on hand never below zero',
  not pw_rejects($q$insert into celestual_purchases (handle, kind, quantity) values ('pw_f', 'pings', 10)$q$)
  and pw_rejects($q$insert into celestual_purchases (handle, kind, quantity) values ('pw_f', 'pings', 11)$q$)
  and pw_rejects($q$insert into celestual_purchases (handle, kind, quantity) values ('pw_f', 'pings', 0)$q$)
  and pw_rejects($q$insert into celestual_purchases (handle, kind) values ('pw_f', 'gold')$q$)
  and pw_rejects($q$update celestual_entitlements set ping_credits = -1 where handle = 'pw_f'$q$));

rollback;

-- ─────────────────────────────────────────────────────────────────────────────
-- test-billing.sql: exercises 0053_the_paid_door.sql.
--
-- The desk's switch is real on the server: off, nothing can begin a purchase
-- and the status read says so; on, a purchase begins and the grant lands once.
-- "unlimited" is literal: a live pass has no cap. Run through
-- scripts/verify-migrations.sh --test, inside one transaction that never
-- commits.
--
-- The desk flip and every assertion after it are separate statements on
-- purpose: the switch helpers are `stable`, and a read inside the statement
-- that writes the row sees the row as it was.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function b_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- A live DM proof for a handle, the way the webhook leaves one.
create or replace function b_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, verified_at, expires_at)
  values (p_handle, 'test' || substr(md5(p_proof), 1, 6), encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', now(), now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'billing-salt')
  on conflict (key) do nothing;

select b_proof('buyer', 'proof-buyer');

-- ── off, by default ─────────────────────────────────────────────────────────
select b_ok('off: the switch reads off', not celestual_billing_on());
select b_ok('off: the plan reads off', not celestual_billing_plan_on());
select b_ok('off: status with a proof answers ok and enabled false',
  (celestual_billing_status('buyer', 'proof-buyer')->>'ok')::boolean
  and not (celestual_billing_status('buyer', 'proof-buyer')->>'enabled')::boolean);
select b_ok('off: status without a proof still carries enabled',
  not (celestual_billing_status('buyer', null)->>'ok')::boolean
  and (celestual_billing_status('buyer', null)->>'enabled') = 'false'
  and (celestual_billing_status('buyer', null)->>'cap')::int = 2);
select b_ok('off: begin answers off',
  (celestual_billing_begin('buyer', 'proof-buyer', 'slot')->>'error') = 'off');
select b_ok('off: nothing was written',
  (select count(*) from celestual_purchases where handle = 'buyer') = 0);

-- ── the desk ────────────────────────────────────────────────────────────────
select b_ok('desk: a bad value is refused',
  (celestual_desk_setting_set('billing_enabled', 'yes')->>'error') = 'bad_value');
select b_ok('desk: the settings carry both keys',
  (celestual_desk_settings()->'settings') ? 'billing_enabled'
  and (celestual_desk_settings()->'settings') ? 'billing_plan_enabled'
  and (celestual_desk_settings()->'defaults'->>'billing_enabled') = 'false');

select celestual_desk_setting_set('billing_enabled', 'true');

select b_ok('on: the switch reads on', celestual_billing_on());
select b_ok('on: the plan still reads off', not celestual_billing_plan_on());
select b_ok('on: begin without a proof answers unverified',
  (celestual_billing_begin('buyer', 'wrong-proof', 'slot')->>'error') = 'unverified');
select b_ok('on: begin steady answers off while the plan switch is off',
  (celestual_billing_begin('buyer', 'proof-buyer', 'steady')->>'error') = 'off');
select b_ok('on: an unknown kind is refused',
  (celestual_billing_begin('buyer', 'proof-buyer', 'gold')->>'error') = 'kind');

-- ── a slot, bought once ─────────────────────────────────────────────────────
do $$
declare r jsonb; pid uuid;
begin
  r := celestual_billing_begin('buyer', 'proof-buyer', 'slot');
  perform b_ok('slot: begin answers ok', (r->>'ok')::boolean and r->>'kind' = 'slot');
  pid := (r->>'purchase_id')::uuid;
  perform b_ok('slot: a pending row was written',
    exists (select 1 from celestual_purchases
             where id = pid and status = 'pending' and kind = 'slot' and handle = 'buyer'));
  perform b_ok('slot: status says enabled, no plan offered, cap 2',
    (celestual_billing_status('buyer', 'proof-buyer')->>'enabled')::boolean
    and not (celestual_billing_status('buyer', 'proof-buyer')->>'plan_offered')::boolean
    and (celestual_billing_status('buyer', 'proof-buyer')->>'cap')::int = 2);

  r := celestual_billing_complete(pid, 'cs_test_billing_1', 'pi_test_1', 299, 'usd', 'cus_test', null, null);
  perform b_ok('slot: the grant applies, cap 3', (r->>'applied')::boolean and (r->>'cap')::int = 3);
  r := celestual_billing_complete(pid, 'cs_test_billing_1', 'pi_test_1', 299, 'usd', 'cus_test', null, null);
  perform b_ok('slot: a second grant applies nothing', not (r->>'applied')::boolean and (r->>'cap')::int = 3);
  perform b_ok('slot: cap_for is 3', celestual_cap_for('buyer') = 3);
  perform b_ok('slot: status says cap 3, extra 1',
    (celestual_billing_status('buyer', 'proof-buyer')->>'cap')::int = 3
    and (celestual_billing_status('buyer', 'proof-buyer')->>'extra')::int = 1);
end $$;

-- ── the pass ────────────────────────────────────────────────────────────────
select celestual_desk_setting_set('billing_plan_enabled', 'true');

do $$
declare r jsonb; pid uuid;
begin
  perform b_ok('pass: offered', celestual_billing_plan_on());
  r := celestual_billing_begin('buyer', 'proof-buyer', 'steady');
  perform b_ok('pass: begin steady answers ok', (r->>'ok')::boolean and r->>'kind' = 'steady');
  pid := (r->>'purchase_id')::uuid;
  r := celestual_billing_complete(pid, 'cs_test_billing_2', null, 1299, 'usd', 'cus_test', 'sub_test_1', now() + interval '30 days');
  perform b_ok('pass: applied, and the cap is off', (r->>'applied')::boolean and (r->>'cap') is null);
  perform b_ok('pass: cap_for is null', celestual_cap_for('buyer') is null);
  perform b_ok('pass: status says cap null and plan steady',
    (celestual_billing_status('buyer', 'proof-buyer')->'cap') = 'null'::jsonb
    and celestual_billing_status('buyer', 'proof-buyer')->>'plan' = 'steady'
    and (celestual_billing_status('buyer', 'proof-buyer')->>'ping_days')::int = 180);
  perform b_ok('pass: a slot is refused with has_plan',
    (celestual_billing_begin('buyer', 'proof-buyer', 'slot')->>'error') = 'has_plan');
  perform b_ok('pass: a second pass is refused with has_plan',
    (celestual_billing_begin('buyer', 'proof-buyer', 'steady')->>'error') = 'has_plan');
end $$;

-- Ten standing, and an eleventh goes through: no ceiling on a pass. The
-- cadence cap counts celestual_placements, which these rows do not write.
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
select 'buyer', celestual_hash_handle('somebody.' || i), 'somebody.' || i, now() + interval '40 days'
  from generate_series(1, 10) i;

select b_ok('pass: ten standing and the eleventh is recorded',
  (celestual_submit('buyer', 'somebody.eleven', null, 'proof-buyer', null)->>'recorded')::boolean);
select b_ok('pass: the meter says eleven standing',
  (celestual_billing_status('buyer', 'proof-buyer')->>'standing')::int = 11);

-- ── the pass ends, the door shuts ───────────────────────────────────────────
select celestual_billing_plan_sync('sub_test_1', now() - interval '1 minute', false);
select b_ok('pass ended: the bought slot still counts, cap 3', celestual_cap_for('buyer') = 3);
select b_ok('pass ended: the plan switch reads on but the pass is gone',
  celestual_billing_plan_on() and celestual_billing_status('buyer', 'proof-buyer')->>'plan' is null);

select celestual_desk_setting_set('billing_enabled', 'false');
select b_ok('shut: begin answers off', (celestual_billing_begin('buyer', 'proof-buyer', 'slot')->>'error') = 'off');
select b_ok('shut: the plan reads off while the door is shut', not celestual_billing_plan_on());
select b_ok('shut: status says enabled false and plan_offered false',
  not (celestual_billing_status('buyer', 'proof-buyer')->>'enabled')::boolean
  and not (celestual_billing_status('buyer', 'proof-buyer')->>'plan_offered')::boolean);
select b_ok('shut: nobody who paid loses anything, cap 3', celestual_cap_for('buyer') = 3);

-- ── who may call what ───────────────────────────────────────────────────────
select b_ok('anon may read status',
  has_function_privilege('anon', 'celestual_billing_status(text,text)', 'execute'));
select b_ok('anon may not begin',
  not has_function_privilege('anon', 'celestual_billing_begin(text,text,text)', 'execute'));
select b_ok('anon may not read the switch',
  not has_function_privilege('anon', 'celestual_billing_on()', 'execute'));
select b_ok('anon may not read the cap',
  not has_function_privilege('anon', 'celestual_cap_for(text)', 'execute'));

rollback;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0053: the paid door, and the desk holds the switch.
--
-- 0021 built the money layer and left it dormant behind a client flag that the
-- September rebuild then deleted with the client. The layer itself never went:
-- celestual_submit still asks celestual_cap_for for the cap, the two Stripe
-- functions are still deployed, and the ledger still has its rows. This file
-- wakes the door the way 0052 lifted the letter cap: with a row the desk
-- writes and the product reads, so opening or shutting it is one tap and no
-- deploy.
--
--   billing_enabled        'true' | 'false'. Off, nothing is drawn and
--                          celestual_billing_begin refuses with 'off', so the
--                          switch is real on the server and not a courtesy of
--                          the client. Defaults off.
--   billing_plan_enabled   the monthly pass, its own decision (PRICING-REVENUE
--                          section 3). Reads off while billing is off. Defaults
--                          off.
--
-- ── the two things for sale, by the names people read ───────────────────────
-- In the ledger the kinds stay 'slot' and 'steady', because a check constraint
-- renamed buys nothing. What a person reads is "extra slot" (one more standing
-- ping, $2.99, once, to a ceiling of ten) and "unlimited" ($12.99 a month).
--
-- "unlimited" has to be literally true (ULTIMATE-PRODUCT-FRAMEWORK 6.2), so the
-- ten ceiling 0021 put on the plan comes off: celestual_cap_for answers null
-- while a pass is paid, and null is never full. What still holds for everyone
-- is the pacing rule in celestual_submit, six new placements in thirty days,
-- which is a rule against sweeping a list of names and not a slot. Slots
-- bought one at a time keep the ceiling of ten.
--
-- ── one hardening ───────────────────────────────────────────────────────────
-- 0021 checked the buyer's proof only while require_ig_verification was on,
-- which tied money to the DM rollout gate. 0038 made every other read of a
-- person's own rows check the proof unconditionally; the two billing calls do
-- the same now. Without a live proof, status answers the free cap and begin
-- answers 'unverified', whatever the gate says.
--
-- Everything else in 0021 is untouched: the ledger, the webhook's grant, the
-- refund, the plan sync, what erasure does to the money.
--
-- Re-runnable. Safe on top of 0001 to 0052.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the switches ─────────────────────────────────────────────────────────
-- Read through 0039's helpers, so a missing row is the default and the default
-- is OFF, which is the safe direction for a row about money to be missing in.
create or replace function celestual_billing_on()
returns boolean
language sql stable security definer set search_path = public as $$
  select celestual_setting('billing_enabled', 'false') = 'true'
$$;

create or replace function celestual_billing_plan_on()
returns boolean
language sql stable security definer set search_path = public as $$
  select celestual_billing_on() and celestual_setting('billing_plan_enabled', 'false') = 'true'
$$;

revoke all on function celestual_billing_on()      from public, anon, authenticated;
revoke all on function celestual_billing_plan_on() from public, anon, authenticated;
grant execute on function celestual_billing_on()      to service_role;
grant execute on function celestual_billing_plan_on() to service_role;

comment on function celestual_billing_on() is
  '0053: whether the paid door is drawn and a checkout may begin. The desk''s switch, off by default.';
comment on function celestual_billing_plan_on() is
  '0053: whether the monthly pass is offered. Off while the door is off, whatever the row says.';

-- ── 2. the desk holds both ──────────────────────────────────────────────────
-- As 0052 wrote them, with the two keys added to the whitelist. The salt is
-- still not on the list and still cannot be added to it from the desk.
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
      'cap_user', 20, 'cap_device', 20, 'cap_ip', 200, 'cap_global', 1000
    ),
    'updated', (
      select coalesce(jsonb_object_agg(key, updated_at), '{}'::jsonb)
        from celestual_settings
       where key in ('require_ig_verification', 'resolver_enabled',
                     'wall_letter_cap', 'wall_letter_allowance',
                     'billing_enabled', 'billing_plan_enabled',
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
begin
  if p_key in ('require_ig_verification', 'resolver_enabled', 'wall_letter_cap',
               'billing_enabled', 'billing_plan_enabled') then
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

-- ── 3. unlimited is literal ─────────────────────────────────────────────────
-- As 0021, except that a live pass answers null: no ceiling. Every caller
-- already copes. celestual_submit compares standing against the cap and a
-- comparison with null is never true, so a pass holder is never full;
-- celestual_billing_complete and celestual_slots_for hand the cap back as a
-- number or as nothing; celestual_billing_begin below refuses a slot to a pass
-- holder outright rather than reading the ceiling.
create or replace function celestual_cap_for(h text) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_cap int := celestual_free_cap() + celestual_extra_slots(h);
  v_until timestamptz := celestual_plan_until(h);
begin
  if v_until is not null and v_until > now() then
    return null;
  end if;
  return least(v_cap, celestual_hard_cap());
end;
$$;

revoke all on function celestual_cap_for(text) from public, anon, authenticated;

comment on function celestual_cap_for(text) is
  '0021, 0053: the standing cap this person is held to. Null while a pass is paid, which is never full.';

-- ── 4. the client''s one billing read ────────────────────────────────────────
-- As 0021, plus two keys on every branch: `enabled` and `plan_offered`. Neither
-- is a secret, so the branch that refuses the proof carries them too, and a
-- browser can draw the right door for a signed out person without learning a
-- thing about anybody. The proof is checked whatever the release gate says.
-- Returns: { ok, enabled, plan_offered, standing, cap, free_cap, extra, plan,
--            plan_until, ping_days }, with cap null on a live pass.
create or replace function celestual_billing_status(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_standing int := 0;
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

  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();

  v_until := celestual_plan_until(nf);
  v_plan := case when v_until is not null and v_until > now() then 'steady' end;

  return jsonb_build_object(
    'ok', true,
    'enabled', celestual_billing_on(),
    'plan_offered', celestual_billing_plan_on(),
    'standing', v_standing,
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

-- ── 5. the door, on the server ──────────────────────────────────────────────
-- As 0021, with the switch asked before anything else and the proof asked
-- whatever the release gate says. A shut door never touches the verification
-- row. celestual-stripe passes the error slug straight to the browser, so
-- 'off' needs no function change.
-- Returns: { ok, purchase_id, kind }
--        | { ok:false, error:'off'|'handle'|'kind'|'unverified'|'suppressed'
--                            |'rate'|'at_cap'|'has_plan' }
create or replace function celestual_billing_begin(p_handle text, p_proof text, p_kind text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  nk text := case when p_kind in ('slot', 'steady') then p_kind end;
  v_n  int;
  v_id uuid;
  v_until timestamptz;
  v_cap int;
  c_begin_per_hour constant int := 12;
begin
  if nf is null then return jsonb_build_object('ok', false, 'error', 'handle'); end if;
  if nk is null then return jsonb_build_object('ok', false, 'error', 'kind'); end if;

  if not celestual_billing_on() then
    return jsonb_build_object('ok', false, 'error', 'off');
  end if;
  if nk = 'steady' and not celestual_billing_plan_on() then
    return jsonb_build_object('ok', false, 'error', 'off');
  end if;

  -- Ownership: the same bearer proof placing a ping needs. Money must never be
  -- attachable to an @ the buyer has not proven.
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  -- Nobody may buy anything on a handle that asked never to be entered.
  if exists (select 1 from celestual_suppressions
              where handle_hash = celestual_hash_handle(nf)) then
    return jsonb_build_object('ok', false, 'error', 'suppressed');
  end if;

  select count(*) into v_n from celestual_purchases
   where handle = nf and created_at > now() - interval '1 hour';
  if v_n >= c_begin_per_hour then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  -- Refuse to sell what the buyer already has: a slot to somebody with no
  -- ceiling, a slot at the ceiling, a second pass on top of a live one.
  v_until := celestual_plan_until(nf);
  if v_until is not null and v_until > now() then
    return jsonb_build_object('ok', false, 'error', 'has_plan');
  end if;
  v_cap := celestual_cap_for(nf);
  if nk = 'slot' and v_cap is not null and v_cap >= celestual_hard_cap() then
    return jsonb_build_object('ok', false, 'error', 'at_cap');
  end if;

  insert into celestual_purchases (handle, kind, status)
  values (nf, nk, 'pending')
  returning id into v_id;

  -- Opportunistically clear pending rows nobody ever paid (an abandoned tab).
  if random() < 0.1 then
    delete from celestual_purchases
     where status = 'pending' and created_at < now() - interval '2 days';
  end if;

  return jsonb_build_object('ok', true, 'purchase_id', v_id, 'kind', nk);
end;
$$;

revoke execute on function celestual_billing_begin(text, text, text) from anon, authenticated, public;
grant execute on function celestual_billing_begin(text, text, text) to service_role;

comment on function celestual_billing_begin(text, text, text) is
  '0021, 0053: proves the @, asks the desk''s switch, refuses what it should not sell, writes the pending purchase. Service role only.';

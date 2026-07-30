-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0021 — stripe wakes                                          ║
-- ║ the third ping, bought once. the entitlement lives here, not in a browser ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- WHAT THIS IS. docs/PRICING-REVENUE.md §3 named the one shape that fits the
-- mechanism and then said: keep Stripe plumbed and dormant until density is
-- proven. This migration is the plumbing, built exactly as that section
-- specified — "an entitlement column keyed on the identity group (via
-- celestual_handle_links), written only by a service-role webhook function (the
-- celestual_complete_ig_verification pattern); c_standing_cap becomes
-- per-group." Nothing here charges anyone and nothing here is visible until
-- VITE_STRIPE_ENABLED=1 turns the second door on in the client
-- (docs/STRIPE-SETUP.md is the runbook).
--
-- WHAT MONEY BUYS (and the only two things it ever buys):
--   'slot'   — one more standing ping, one time, repeatable. $2.99.
--   'steady' — ten standing pings, each held six months instead of sixty days,
--              $12.99 a month. Cancels in Stripe; the cap falls back on its own
--              when the paid-through date passes.
-- The free product is untouched: placing, matching, the reveal, renewing,
-- letting go, the opt-out, erasure, verification, communities. "Let one go" is
-- still one tap and still free, forever, on the same screen.
--
-- THE ONE BEHAVIOUR CHANGE: the free standing cap becomes 2, matching the
-- client that has shipped since the ping-model rework (app/src/api/celestual.js
-- SLOT_CAP = 2, and strings.js calls Screen 9 "the third slot"). The server had
-- stayed at 3 — slack the UI never offered — and a paid third ping is
-- meaningless while the third is free server-side. Nobody loses a ping they
-- already hold: the cap is only read when a NEW pair is placed, so a person
-- standing at three keeps all three until one lapses or is let go.
--
-- HOW A PURCHASE TRAVELS:
--   1. celestual-stripe (edge, service role) → celestual_billing_begin, which
--      proves handle ownership with the SAME DM proof placing uses and writes a
--      'pending' purchase. Its id rides the Checkout Session as metadata.
--   2. Stripe hosts the card page. Nothing about a card ever reaches us.
--   3. celestual-stripe-webhook (edge, service role, signature-verified) →
--      celestual_billing_complete, which grants the entitlement. Idempotent
--      twice over: the event id is a primary key here, and a purchase already
--      'paid' applies nothing a second time.
-- The browser is never trusted with any of it: every write below is service-role
-- only, and the client's single call (celestual_billing_status) is proof-gated
-- and read-only.
--
-- ERASURE STAYS ERASURE. "Delete everything" (0020) and the opt-out drop the
-- entitlement row with the rest of the account, so a paid slot does not survive
-- an erasure — the promise on /privacy outranks the purchase. The money record
-- survives with the handle nulled out (accounting needs the row; it does not
-- need the person). Refund by hand from the Stripe dashboard if someone erases
-- and asks; docs/STRIPE-SETUP.md §9 has the exact steps.
--
-- Re-runnable. Safe on top of 0001→0020.

-- ──────────────────────────────────────────────────────────────────────
-- ENTITLEMENTS — what a handle is owed. One row per handle, read as a GROUP
-- (celestual_handle_links): buy on one of your @s and every @ you have linked
-- gets the slot, because they are one person and the cap was always per-person.
-- No client can read or write this table; the RPCs below reach it as owner.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_entitlements (
  handle                 text primary key,        -- normalised @
  extra_slots            int  not null default 0, -- one-time slots, cumulative
  plan                   text,                    -- null | 'steady'
  plan_until             timestamptz,             -- paid through (plan is live while > now())
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists celestual_entitlements_sub_idx
  on celestual_entitlements (stripe_subscription_id);

-- ──────────────────────────────────────────────────────────────────────
-- PURCHASES — the money ledger, and the idempotency key of the whole flow.
-- A row is written 'pending' before the person ever sees Stripe's page, and
-- flipped 'paid' exactly once by the webhook. `stripe_session_id` is unique, so
-- a replayed session can never grant twice.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_purchases (
  id                     uuid primary key default gen_random_uuid(),
  handle                 text,                    -- nulled by erasure; the row stays
  kind                   text not null check (kind in ('slot', 'steady')),
  status                 text not null default 'pending'
                           check (status in ('pending', 'paid', 'void', 'refunded')),
  amount_cents           int,
  currency               text,
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  paid_at                timestamptz,
  refunded_at            timestamptz
);
create index if not exists celestual_purchases_handle_idx on celestual_purchases (handle);
create index if not exists celestual_purchases_pi_idx     on celestual_purchases (stripe_payment_intent);
create index if not exists celestual_purchases_sub_idx    on celestual_purchases (stripe_subscription_id);

-- ──────────────────────────────────────────────────────────────────────
-- STRIPE EVENTS — the replay guard. Stripe retries a webhook until it gets a
-- 2xx and can deliver the same event more than once even after one; every
-- mutating RPC below refuses an event id it has already seen.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_stripe_events (
  event_id    text primary key,
  type        text,
  received_at timestamptz not null default now()
);

alter table celestual_entitlements  enable row level security;
alter table celestual_purchases     enable row level security;
alter table celestual_stripe_events enable row level security;
revoke all on celestual_entitlements  from anon, authenticated;
revoke all on celestual_purchases     from anon, authenticated;
revoke all on celestual_stripe_events from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- THE CAP, PER GROUP. Internal helpers (SECURITY DEFINER, never granted to a
-- client — an entitlement read across a group would expose someone's other
-- accounts, exactly what celestual_group() exists to keep private).
--
--   free cap        2   what everyone has, always, for nothing
--   plan cap       10   while a 'steady' plan is paid through
--   hard cap       10   the ceiling either road reaches. celestual_ping_status
--                       and the client's own list are bounded at ten too.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_free_cap() returns int
language sql immutable set search_path = public as $$ select 2 $$;

create or replace function celestual_hard_cap() returns int
language sql immutable set search_path = public as $$ select 10 $$;

-- Slots bought outright anywhere in this person's identity group.
create or replace function celestual_extra_slots(h text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(e.extra_slots), 0)::int
    from celestual_entitlements e
   where e.handle in (select celestual_group(h))
$$;

-- The furthest paid-through date in the group, or null. A plan is live while
-- this is in the future — a cancelled subscription simply stops being renewed.
create or replace function celestual_plan_until(h text) returns timestamptz
language sql stable security definer set search_path = public as $$
  select max(e.plan_until)
    from celestual_entitlements e
   where e.handle in (select celestual_group(h))
     and e.plan is not null
$$;

-- The live standing cap for this handle. This is the number celestual_submit
-- enforces and the meter shows.
create or replace function celestual_cap_for(h text) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_cap int := celestual_free_cap() + celestual_extra_slots(h);
  v_until timestamptz := celestual_plan_until(h);
begin
  if v_until is not null and v_until > now() then
    v_cap := greatest(v_cap, celestual_hard_cap());
  end if;
  return least(v_cap, celestual_hard_cap());
end;
$$;

-- How long a newly placed or renewed ping stands: sixty days, or six months
-- while a plan is live (the client's SUB_PING_DAYS, decided server-side).
create or replace function celestual_ping_window(h text) returns interval
language plpgsql stable security definer set search_path = public as $$
declare
  v_until timestamptz := celestual_plan_until(h);
begin
  if v_until is not null and v_until > now() then
    return interval '180 days';
  end if;
  return interval '60 days';
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_status — the client's ONE billing read, proof-gated exactly
-- like celestual_slots_for (a stranger must not learn what a handle holds or
-- pays for). Returns the free-cap default when the proof doesn't stand, so an
-- unverified device still renders a truthful, if plain, meter.
-- Returns: { ok, standing, cap, free_cap, extra, plan, plan_until, ping_days }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_status(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_standing int := 0;
  v_until timestamptz;
  v_plan text;
begin
  if nf is null then
    return jsonb_build_object('ok', false, 'standing', 0, 'cap', celestual_free_cap(),
      'free_cap', celestual_free_cap(), 'extra', 0, 'plan', null, 'ping_days', 60);
  end if;
  if celestual_ig_required() and not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'standing', 0, 'cap', celestual_free_cap(),
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

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_begin — SERVICE ROLE ONLY (the celestual-stripe function).
-- Proves the handle is really theirs, refuses purchases that would buy nothing,
-- and writes the 'pending' purchase whose id travels with the Checkout Session.
-- Rate-limited per handle so a loop can't fill the ledger with dead rows.
-- Returns: { ok, purchase_id, kind }
--        | { ok:false, error:'handle'|'kind'|'unverified'|'suppressed'|'rate'|'at_cap'|'has_plan' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_begin(p_handle text, p_proof text, p_kind text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  nk text := case when p_kind in ('slot', 'steady') then p_kind end;
  v_n  int;
  v_id uuid;
  v_until timestamptz;
  c_begin_per_hour constant int := 12;
begin
  if nf is null then return jsonb_build_object('ok', false, 'error', 'handle'); end if;
  if nk is null then return jsonb_build_object('ok', false, 'error', 'kind'); end if;

  -- Ownership: the same bearer proof placing a ping needs. Money must never be
  -- attachable to an @ the buyer hasn't proven, or a purchase becomes a way to
  -- write to a stranger's account.
  if celestual_ig_required() and not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  -- Nobody may buy anything on a handle that asked never to be entered, or one
  -- the desk has refused (0020's two kinds — either one means no).
  if exists (select 1 from celestual_suppressions
              where handle_hash = celestual_hash_handle(nf)) then
    return jsonb_build_object('ok', false, 'error', 'suppressed');
  end if;

  select count(*) into v_n from celestual_purchases
   where handle = nf and created_at > now() - interval '1 hour';
  if v_n >= c_begin_per_hour then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  -- Refuse to sell what the buyer already has: a slot at the ceiling, or a
  -- second plan on top of a live one.
  v_until := celestual_plan_until(nf);
  if nk = 'slot' and celestual_cap_for(nf) >= celestual_hard_cap() then
    return jsonb_build_object('ok', false, 'error', 'at_cap');
  end if;
  if nk = 'steady' and v_until is not null and v_until > now() then
    return jsonb_build_object('ok', false, 'error', 'has_plan');
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

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_seen / celestual_billing_unsee — SERVICE ROLE ONLY. The
-- replay guard, in two halves so the webhook can stamp an event BEFORE acting on
-- it (that ordering is what makes a duplicate delivery cheap) and still let
-- Stripe retry when its own handling then fails: on any error path the webhook
-- unstamps the event, so the redelivery is treated as new. Without the second
-- half a transient database blip would consume the only delivery that mattered.
-- Returns true the FIRST time an event id is offered, false ever after.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_seen(p_event_id text, p_type text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  if p_event_id is null or length(p_event_id) = 0 then return true; end if;
  insert into celestual_stripe_events (event_id, type)
  values (p_event_id, p_type)
  on conflict (event_id) do nothing;
  v_new := found;
  if random() < 0.02 then
    delete from celestual_stripe_events where received_at < now() - interval '90 days';
  end if;
  return v_new;
end;
$$;

create or replace function celestual_billing_unsee(p_event_id text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event_id is null or length(p_event_id) = 0 then return; end if;
  delete from celestual_stripe_events where event_id = p_event_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_complete — SERVICE ROLE ONLY. The grant. Called by the
-- webhook on checkout.session.completed (and by the function's own `confirm`
-- action when a returning browser beats the webhook home, which happens).
--
-- Idempotent by construction: a purchase already 'paid' returns applied:false
-- and touches nothing. That is the whole reason the purchase row exists.
-- Returns: { ok, applied, kind, cap } | { ok:false, error:'unknown'|'no_handle' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_complete(
  p_purchase_id uuid,
  p_session_id text default null,
  p_payment_intent text default null,
  p_amount_cents int default null,
  p_currency text default null,
  p_customer text default null,
  p_subscription text default null,
  p_period_end timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p record;
begin
  select * into v_p from celestual_purchases where id = p_purchase_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  if v_p.handle is null then return jsonb_build_object('ok', false, 'error', 'no_handle'); end if;
  if v_p.status = 'paid' then
    return jsonb_build_object('ok', true, 'applied', false, 'kind', v_p.kind,
      'cap', celestual_cap_for(v_p.handle));
  end if;
  if v_p.status in ('void', 'refunded') then
    return jsonb_build_object('ok', true, 'applied', false, 'kind', v_p.kind,
      'cap', celestual_cap_for(v_p.handle));
  end if;

  update celestual_purchases
     set status = 'paid',
         paid_at = now(),
         amount_cents = coalesce(p_amount_cents, amount_cents),
         currency = coalesce(p_currency, currency),
         stripe_session_id = coalesce(p_session_id, stripe_session_id),
         stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent),
         stripe_customer_id = coalesce(p_customer, stripe_customer_id),
         stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id)
   where id = v_p.id;

  insert into celestual_entitlements (handle, extra_slots, stripe_customer_id)
  values (v_p.handle, 0, p_customer)
  on conflict (handle) do update
    set stripe_customer_id = coalesce(excluded.stripe_customer_id, celestual_entitlements.stripe_customer_id),
        updated_at = now();

  if v_p.kind = 'slot' then
    update celestual_entitlements
       set extra_slots = least(extra_slots + 1, celestual_hard_cap()),
           updated_at = now()
     where handle = v_p.handle;
  else
    -- 'steady': the plan is a paid-through date, never a boolean. If Stripe
    -- didn't hand us a period end (it always does for a subscription), stand it
    -- up for one month so a paying person is never left without what they bought.
    update celestual_entitlements
       set plan = 'steady',
           plan_until = greatest(coalesce(plan_until, now()), coalesce(p_period_end, now() + interval '31 days')),
           stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
           updated_at = now()
     where handle = v_p.handle;
  end if;

  return jsonb_build_object('ok', true, 'applied', true, 'kind', v_p.kind,
    'cap', celestual_cap_for(v_p.handle));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_plan_sync — SERVICE ROLE ONLY. Every later life event of a
-- subscription lands here: invoice.paid pushes the paid-through date out,
-- customer.subscription.deleted / unpaid pulls it back to now. The cap follows
-- the date, so nothing has to be swept — a lapsed plan simply stops counting.
-- Returns: { ok, handle, plan_until } | { ok:false, error:'unknown_sub' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_plan_sync(
  p_subscription text,
  p_period_end timestamptz default null,
  p_active boolean default true)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_handle text;
  v_until timestamptz;
begin
  if p_subscription is null then return jsonb_build_object('ok', false, 'error', 'unknown_sub'); end if;

  select handle into v_handle from celestual_entitlements
   where stripe_subscription_id = p_subscription limit 1;
  -- A first invoice can arrive before checkout.session.completed. Fall back to
  -- the purchase that opened this subscription so the payment is never orphaned.
  if v_handle is null then
    select handle into v_handle from celestual_purchases
     where stripe_subscription_id = p_subscription and handle is not null
     order by created_at desc limit 1;
  end if;
  if v_handle is null then return jsonb_build_object('ok', false, 'error', 'unknown_sub'); end if;

  insert into celestual_entitlements (handle, plan, stripe_subscription_id)
  values (v_handle, 'steady', p_subscription)
  on conflict (handle) do nothing;

  if p_active then
    update celestual_entitlements
       set plan = 'steady',
           stripe_subscription_id = p_subscription,
           plan_until = greatest(coalesce(plan_until, now()), coalesce(p_period_end, now() + interval '31 days')),
           updated_at = now()
     where handle = v_handle
     returning plan_until into v_until;
  else
    -- Ended. Honour whatever they already paid for (Stripe cancels at period
    -- end by default) but never past it.
    update celestual_entitlements
       set plan_until = least(coalesce(plan_until, now()), coalesce(p_period_end, now())),
           updated_at = now()
     where handle = v_handle
     returning plan_until into v_until;
  end if;

  return jsonb_build_object('ok', true, 'handle', v_handle,
    'plan_until', to_char(v_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_revoke — SERVICE ROLE ONLY. A refund or a won dispute takes
-- the thing back: the slot is given up (never below zero), a plan ends now.
-- Pings already standing are LEFT ALONE — retracting someone's ping because a
-- card was charged back would reveal, by absence, that they had placed one.
-- They simply can't place another until they're back under the free cap.
-- Returns: { ok, handle, kind } | { ok:false, error:'unknown' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_revoke(
  p_payment_intent text default null,
  p_subscription text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p record;
begin
  select * into v_p from celestual_purchases
   where (p_payment_intent is not null and stripe_payment_intent = p_payment_intent)
      or (p_subscription is not null and stripe_subscription_id = p_subscription)
   order by created_at desc limit 1;
  if not found or v_p.handle is null then
    return jsonb_build_object('ok', false, 'error', 'unknown');
  end if;
  -- Idempotent like every other write here: a second charge.refunded for the
  -- same charge must not take a second slot away.
  if v_p.status = 'refunded' then
    return jsonb_build_object('ok', true, 'applied', false, 'handle', v_p.handle, 'kind', v_p.kind);
  end if;

  update celestual_purchases
     set status = 'refunded', refunded_at = now()
   where id = v_p.id;

  if v_p.kind = 'slot' then
    update celestual_entitlements
       set extra_slots = greatest(extra_slots - 1, 0), updated_at = now()
     where handle = v_p.handle;
  else
    update celestual_entitlements
       set plan_until = least(coalesce(plan_until, now()), now()), updated_at = now()
     where handle = v_p.handle;
  end if;

  return jsonb_build_object('ok', true, 'applied', true, 'handle', v_p.handle, 'kind', v_p.kind);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_billing_forget — internal. What erasure does to the money: the
-- entitlement goes (erasure erases; a paid slot does not outlive the account),
-- the ledger row stays with its handle nulled out. Accounting keeps the number;
-- it does not keep the person.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_billing_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  delete from celestual_entitlements where handle = nh;
  update celestual_purchases set handle = null where handle = nh;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_code_ok (0021 revision) — 'paid' joins the reserved
-- four-letter words. /paid is where Stripe returns a buyer (the client's
-- RESERVED_CODES holds the same line); a competitor owning that code would
-- swallow every one of those returns into their tracking link.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_trial_code_ok(p_code text)
returns text
language plpgsql immutable as $$
declare
  nc text := lower(trim(coalesce(p_code, '')));
  c_reserved constant text[] := array[
    'demo','copy','priv','term','data','sign','page','home','root','help',
    'info','mail','news','blog','docs','shop','apps','star','ping','test',
    'paid'
  ];
begin
  if nc !~ '^[a-z]{4}$' then return 'format'; end if;
  if nc = any (c_reserved) then return 'reserved'; end if;
  return 'ok';
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit (0021 revision) — the 0010 body, with the cap and the
-- standing window now asked of the entitlement layer instead of being
-- constants. Everything else is byte-identical: the proof gate, the hashed
-- target, the rate limits, the cadence cap, the group-aware reciprocal, the
-- exfil-safe notification.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_intent text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  nh text;                                   -- hash of the target
  ni text;                                   -- validated intent id
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_placed30 int;
  v_existing_id uuid;
  v_standing int;
  reciprocal_from   text;
  reciprocal_email  text;
  reciprocal_intent text;
  reciprocal_id     uuid;
  reciprocal_tohash text;
  v_counterpart text;                        -- which of MY handles they entered
  v_match_id uuid;
  v_mutual boolean := false;
  v_cap int;
  v_expires timestamptz;
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
  ni := case when p_intent in ('miss', 'sorry', 'unsaid', 'drift', 'know') then p_intent end;

  -- ── HANDLE OWNERSHIP (Instagram DM verification, §verify) ───────────
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;

  -- Never record a ping against an opted-out handle (checked by hash).
  if exists (select 1 from celestual_suppressions where handle_hash = nh) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- The cap and the standing window are this person's, not the product's
  -- (0021): the free two, plus anything bought, and six months instead of
  -- sixty days while a plan is live.
  v_cap := celestual_cap_for(nf);
  v_expires := now() + celestual_ping_window(nf);

  v_ip := celestual_client_ip();

  -- Trailing-hour rate limits (IP / from / to) — the burst backstop.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  -- The per-target cap compares hashes (attempts store the hashed target).
  select count(*) into v_ton from celestual_attempts
   where to_handle = nh and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Re-placing an existing pair? Free — it just refreshes email/intent and
  -- renews the sixty-day clock (re-placing IS still feeling it).
  select id into v_existing_id
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

  if v_existing_id is null then
    -- ── THE SLOT RULE (per person: the free two, plus what they hold) ──
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

    -- ── CADENCE CAP (anti-sweep: retiring frees the slot, so bound the churn) ──
    select count(*) into v_placed30
      from celestual_placements
     where handle = nf and created_at > now() - interval '30 days';
    if v_placed30 >= c_place_per_30d then
      return jsonb_build_object('recorded', false, 'error', 'rate_limited');
    end if;
  end if;

  -- Log this attempt (target hashed), then prune old rows ~2% of the time.
  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
    delete from celestual_placements where created_at < now() - interval '40 days';
  end if;

  -- Record / refresh the ping. Hash for the mechanism, plaintext for the
  -- owner's own cross-device restore (see 0010 §2).
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, intent, expires_at)
  values (nf, nh, nt, ne, ni, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        intent     = coalesce(excluded.intent, celestual_entries.intent),
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_entries.matched_at is null then excluded.expires_at
                          else celestual_entries.expires_at end,
        renew_notified_at = null;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── GROUP-AWARE RECIPROCAL, BY HASH ─────────────────────────────────
  select e.id, e.from_handle, e.from_email, e.intent, e.to_hash
    into reciprocal_id, reciprocal_from, reciprocal_email, reciprocal_intent, reciprocal_tohash
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and not (e.from_handle = nf and e.to_hash = nh)   -- never self-match a linked alt
     and (e.matched_at is not null or e.expires_at > now())
   order by e.created_at asc
   limit 1;

  if reciprocal_id is not null then
    v_mutual := true;
    select g into v_counterpart
      from celestual_group(nf) g
     where celestual_hash_handle(g) = reciprocal_tohash
     limit 1;

    update celestual_entries
       set matched_at = coalesce(matched_at, now()), matched_handle = nt
     where from_handle = nf and to_hash = nh;
    update celestual_entries
       set matched_at = coalesce(matched_at, now()),
           matched_handle = coalesce(matched_handle, v_counterpart)
     where id = reciprocal_id;

    ha := least(nf, reciprocal_from);
    hb := greatest(nf, reciprocal_from);
    insert into celestual_matches (handle_a, handle_b) values (ha, hb)
      on conflict (handle_a, handle_b) do nothing
      returning id into v_match_id;

    if v_match_id is not null then
      -- Exfil-safe: email ONLY the earlier entrant, at the address THEY stored —
      -- never the address on this triggering request.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, reciprocal_email, reciprocal_from, coalesce(v_counterpart, nf), now()
       where reciprocal_email is not null;
    end if;
  end if;

  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    'match', case when v_mutual then nt else null end,
    'match_intent', case when v_mutual then reciprocal_intent else null end,
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_slots_for (0021 revision) — the meter now reads the real cap, so a
-- bought slot shows up on every device the moment it's paid for. Same proof
-- gate; the unproven answer is the free cap, which is true for almost everyone.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_slots_for(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_standing int := 0;
begin
  if nf is null then
    return jsonb_build_object('standing', 0, 'cap', celestual_free_cap());
  end if;
  if celestual_ig_required() and not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('standing', 0, 'cap', celestual_free_cap());
  end if;
  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();
  return jsonb_build_object('standing', v_standing, 'cap', celestual_cap_for(nf));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_renew (0021 revision) — still free, still unlimited, still one tap.
-- The only change: the window it grants is this person's (six months while a
-- plan is live). Renewal is NOT a product and never will be; the sandbox's
-- paid "keep it standing" preview has no production counterpart.
-- ──────────────────────────────────────────────────────────────────────
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
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'error', 'unverified');
    end if;
  end if;
  v_expires := now() + celestual_ping_window(nf);
  update celestual_entries
     set expires_at = v_expires, renew_notified_at = null
   where from_handle = nf and to_hash = celestual_hash_handle(nt)
     and matched_at is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0,
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_erase_account (0021 revision) — the 0020 body plus one line: the
-- money is forgotten too (celestual_billing_forget above says exactly how).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_erase_account(p_handle text)
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

  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;
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

  return jsonb_build_object('erased', v_erased, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress (0021 revision) — the 0020 body, same one added line. An
-- opt-out erases at least as much as an erasure always did.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_ip text;
  v_n  int;
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

  insert into celestual_suppressions (handle_hash, reason, kind)
  values (hh, 'asked never to be entered', 'optout')
  on conflict (handle_hash) do update set kind = 'optout', reason = 'asked never to be entered';

  -- Wipe everything referencing this handle, on either side.
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. One read for the browser (proof-gated), every write for the service
-- role only. The internal helpers stay unreachable from outside: a client that
-- could call celestual_extra_slots or celestual_cap_for on an arbitrary @ could
-- probe both what someone paid for and, through celestual_group, which other
-- accounts are theirs.
-- ──────────────────────────────────────────────────────────────────────
grant execute on function celestual_billing_status(text, text) to anon, authenticated;

grant execute on function celestual_billing_begin(text, text, text) to service_role;
grant execute on function celestual_billing_seen(text, text) to service_role;
grant execute on function celestual_billing_unsee(text) to service_role;
grant execute on function celestual_billing_complete(uuid, text, text, int, text, text, text, timestamptz) to service_role;
grant execute on function celestual_billing_plan_sync(text, timestamptz, boolean) to service_role;
grant execute on function celestual_billing_revoke(text, text) to service_role;

revoke execute on function celestual_billing_begin(text, text, text)    from anon, authenticated, public;
revoke execute on function celestual_billing_seen(text, text)           from anon, authenticated, public;
revoke execute on function celestual_billing_unsee(text)                from anon, authenticated, public;
revoke execute on function celestual_billing_complete(uuid, text, text, int, text, text, text, timestamptz) from anon, authenticated, public;
revoke execute on function celestual_billing_plan_sync(text, timestamptz, boolean) from anon, authenticated, public;
revoke execute on function celestual_billing_revoke(text, text)         from anon, authenticated, public;
revoke execute on function celestual_billing_forget(text)               from anon, authenticated, public;
revoke execute on function celestual_extra_slots(text)                  from anon, authenticated, public;
revoke execute on function celestual_plan_until(text)                   from anon, authenticated, public;
revoke execute on function celestual_cap_for(text)                      from anon, authenticated, public;
revoke execute on function celestual_ping_window(text)                  from anon, authenticated, public;
revoke execute on function celestual_free_cap()                         from anon, authenticated, public;
revoke execute on function celestual_hard_cap()                         from anon, authenticated, public;

-- The client-callable RPCs this file re-created keep the grants 0006/0010 gave
-- them; restated so a fresh database is correct in one pass.
grant execute on function celestual_submit(text, text, text, text, text) to anon, authenticated;
grant execute on function celestual_slots_for(text, text)                to anon, authenticated;
grant execute on function celestual_renew(text, text, text)              to anon, authenticated;
grant execute on function celestual_erase_account(text)                  to anon, authenticated;
grant execute on function celestual_suppress(text)                       to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0071_pings_by_the_week.sql
--
-- One free ping a week, and more for $2.99 each, as many as a person chooses.
--
-- ── the owner's ruling of 27 September ──────────────────────────────────────
-- A ping is one private note in one Saturday reveal. Everybody gets one free
-- ping for every reveal. More are bought, $2.99 each, one to ten at a time; a
-- bought ping never lapses and is spent only when it is used. Nobody has more
-- than ten pings in one reveal. It replaces the standing cap of two (0021,
-- 0069). docs/PINGS-BY-THE-WEEK.md is the contract this file keeps.
--
-- ── the rules, as the database keeps them ───────────────────────────────────
--   the ledger     `celestual_ping_spends`, one row per (from handle, pair,
--                  reveal) and what it cost, 'free' or 'paid'. A person is
--                  their identity group (`celestual_group`): the free ping and
--                  the ceiling are counted across every @ they have linked.
--   bought pings   `celestual_entitlements.ping_credits`, summed across the
--                  group on read, taken from a row of the group that has one
--                  (the spender's own first) on spend. `extra_slots` is folded
--                  in once, below, and read by nothing after.
--   which reveal   the reveal a note runs to (`celestual_note_ends`, 0069).
--   what spends    a note to somebody new, a note that was not this time sent
--                  again, and a note kept for next week (for the reveal it is
--                  kept to). The free one first, then a bought one. Changing
--                  the words of a running note spends nothing, and neither
--                  does sending a pair again that week: the spend is keyed on
--                  (handle, pair, reveal), so asking twice is asking once.
--   what returns   letting a note go returns every ping it holds for a reveal
--                  still to come; a note made mutual returns every ping it
--                  held for a reveal after the one that told it. A free one
--                  comes back as the week's free one (its row is simply gone),
--                  a bought one as a bought one on the spender's own row.
--   a refusal      `no_pings` (nothing left for that reveal) or `week_full`
--                  (ten already in it), and nothing written: the spend is the
--                  last check before the note, in the note's transaction.
--
-- ── the ways it could have told somebody, closed ────────────────────────────
--   a sealed pair  spends exactly as an unanswered note does, is kept for the
--                  same ping, and gets nothing back until its reveal, when it
--                  is mutual and told to both anyway. So the allowance says
--                  nothing on a Tuesday that the list does not.
--   letting go     returns the ping whether or not the note was sealed (0069:
--                  letting go before the reveal tells nobody anything).
--   the refund     of a card, by Stripe, takes bought pings back from what is
--                  on hand and never below zero, and never touches a note
--                  already out (0021's reason: its absence would say it had
--                  been sent).
--   the allowance  is proof gated like the list: a stranger learns nothing
--                  about what a handle holds, or bought, or which other @s
--                  are the same person.
--
-- ── where the contract was read the safe way (docs/PINGS-BY-THE-WEEK.md 8) ──
--   new pairs      the thirty day cadence cap (six new pairs) goes, as the
--                  contract says, and nothing takes its place but the hourly
--                  limits. Letting go gives the ping back, so a note can be
--                  sent and let go again and again, and that is safe only
--                  because it tells the sender nothing: a sealed pair answers
--                  as an unanswered note (0069), and `reachable`, whether the
--                  @ has an account, which a placement used to answer at
--                  once (SECURITY.md section 5), is answered at the reveal
--                  and not before (`celestual_submit`, `celestual_ping_status`
--                  below). The wall never drew it. With that bit gone before
--                  the night, a cycle of sends and let goes learns nothing a
--                  single note would not, and a bound on it would guard
--                  nothing.
--   notes already out when this applies hold no spend: they were sent under
--                  the old rule and cost nothing. They count toward nothing
--                  this week, letting one go returns nothing, and keeping one
--                  for next week spends a ping as any keep does.
--   'slot'         a purchase from before (one more standing ping, $2.99, the
--                  same price as a ping) grants one ping. 'steady', which the
--                  wall never offers, gives its payer the ceiling as free pings
--                  in every reveal while it is paid through, the nearest thing
--                  to the ten standing notes it was sold as.
--   a partial      refund takes back only the pings its money covers,
--                  floor(amount refunded / unit price), the unit price being
--                  what the purchase was charged over its quantity (0021 took
--                  everything on any refund, which with a quantity would take
--                  three pings for one refunded). `refunded_quantity` keeps
--                  the count, so refunds in parts take only the difference.
--   erasure        takes the person's ledger rows with them, and the rows of
--                  other people's notes to them (those notes go with the
--                  erasure, 0038): a ping those held for a reveal still to
--                  come goes back to its sender, who sees the note gone from
--                  their list anyway.
--   buying         takes the DM proof always, not only while
--                  `require_ig_verification` is on: money must never attach
--                  to an @ the buyer has not proven.
--
-- Idempotent, like every migration here.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the ledger ────────────────────────────────────────────────────────────
create table if not exists celestual_ping_spends (
  id          uuid primary key default gen_random_uuid(),
  handle      text        not null,
  to_hash     text        not null,
  reveal_at   timestamptz not null,
  kind        text        not null check (kind in ('free', 'paid')),
  created_at  timestamptz not null default now(),
  unique (handle, to_hash, reveal_at)
);
comment on table celestual_ping_spends is
  '0071: one row per (from handle, pair, reveal), and what the ping cost. The week''s allowance is read from here. Service role only.';
create index if not exists celestual_ping_spends_week_idx   on celestual_ping_spends (handle, reveal_at);
create index if not exists celestual_ping_spends_to_idx     on celestual_ping_spends (to_hash);
create index if not exists celestual_ping_spends_reveal_idx on celestual_ping_spends (reveal_at);
alter table celestual_ping_spends enable row level security;
revoke all on celestual_ping_spends from anon, authenticated;

-- ── 2. bought pings, and what was bought ─────────────────────────────────────
alter table celestual_entitlements
  add column if not exists ping_credits int not null default 0 check (ping_credits >= 0);
comment on column celestual_entitlements.ping_credits is
  '0071: bought pings on hand. Never lapse. Summed across the identity group on read.';

-- Every slot bought under 0021 becomes a ping on hand, once: the slots go to
-- zero as they are folded, so a second run finds nothing to fold.
update celestual_entitlements
   set ping_credits = ping_credits + extra_slots, extra_slots = 0, updated_at = now()
 where extra_slots > 0;

alter table celestual_purchases add column if not exists quantity int not null default 1;
alter table celestual_purchases add column if not exists refunded_quantity int not null default 0;
comment on column celestual_purchases.quantity is
  '0071: how many pings a purchase of kind pings is for, one to ten, fixed on Stripe''s page. 1 for slot and steady.';
comment on column celestual_purchases.refunded_quantity is
  '0071: how many of them a refund has taken back so far. The purchase reads refunded when it reaches quantity.';

-- The kind check was written inline in 0021, so its name is Postgres's; any
-- check on the kind is found and replaced by one that takes 'pings'.
do $$
declare
  c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'celestual_purchases'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ~ '\mkind\M'
  loop
    execute format('alter table celestual_purchases drop constraint %I', c.conname);
  end loop;
  alter table celestual_purchases
    add constraint celestual_purchases_kind_check check (kind in ('slot', 'steady', 'pings'));
  if not exists (select 1 from pg_constraint
                  where conrelid = 'celestual_purchases'::regclass
                    and conname = 'celestual_purchases_quantity_check') then
    alter table celestual_purchases
      add constraint celestual_purchases_quantity_check
      check (quantity between 1 and 10 and refunded_quantity between 0 and quantity);
  end if;
end $$;

-- ── 3. the numbers ───────────────────────────────────────────────────────────
create or replace function celestual_ping_ceiling() returns int
language sql immutable set search_path = public as $$ select 10 $$;

create or replace function celestual_ping_price_cents() returns int
language sql immutable set search_path = public as $$ select 299 $$;

-- The free pings in a reveal: one, or the ceiling while a 'steady' plan from
-- before is paid through (see the header).
create or replace function celestual_ping_free(h text) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_until timestamptz := celestual_plan_until(h);
begin
  if v_until is not null and v_until > now() then return celestual_ping_ceiling(); end if;
  return 1;
end;
$$;

-- Bought pings on hand, across the group.
create or replace function celestual_ping_credits(h text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(e.ping_credits), 0)::int
    from celestual_entitlements e
   where e.handle in (select celestual_group(h))
$$;

-- ── 4. the allowance ─────────────────────────────────────────────────────────
-- What a handle has for the reveal a note sent now runs to, and for the one
-- after it (where a note kept for next week goes). A null handle is nobody:
-- the free ping, nothing bought, nothing sent. Internal: the caller has
-- checked the proof.
create or replace function celestual_ping_allowance_for(p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  r0 timestamptz := celestual_note_ends(now());
  r1 timestamptz := celestual_next_reveal(celestual_note_ends(now()));
  v_free    int := 1;
  v_credits int := 0;
  v_sent0   int := 0;
  v_free0   int := 0;
  v_sent1   int := 0;
  v_free1   int := 0;
begin
  if nh is not null then
    v_free := celestual_ping_free(nh);
    v_credits := celestual_ping_credits(nh);
    select count(*) filter (where s.reveal_at = r0),
           count(*) filter (where s.reveal_at = r0 and s.kind = 'free'),
           count(*) filter (where s.reveal_at = r1),
           count(*) filter (where s.reveal_at = r1 and s.kind = 'free')
      into v_sent0, v_free0, v_sent1, v_free1
      from celestual_ping_spends s
     where s.handle in (select celestual_group(nh))
       and s.reveal_at in (r0, r1);
  end if;
  return jsonb_build_object(
    'reveal_at',   to_char(r0 at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'free',        v_free,
    'free_left',   greatest(v_free - v_free0, 0),
    'credits',     v_credits,
    'sent',        v_sent0,
    'ceiling',     celestual_ping_ceiling(),
    'price_cents', celestual_ping_price_cents(),
    'next', jsonb_build_object(
      'reveal_at', to_char(r1 at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'free_left', greatest(v_free - v_free1, 0),
      'sent',      v_sent1));
end;
$$;

-- The `slots` celestual_submit has always answered, drawn from the allowance:
-- `standing` is the pings spent on this reveal, and `cap` is what this reveal
-- allows in all, the ones spent and the ones that could still be (free left
-- and bought on hand), no more than the ceiling. So standing = cap is exactly
-- "nothing left this week".
create or replace function celestual_ping_slots(p_allowance jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'standing', (p_allowance->>'sent')::int,
    'cap', least((p_allowance->>'ceiling')::int,
                 (p_allowance->>'sent')::int + (p_allowance->>'free_left')::int
                   + (p_allowance->>'credits')::int))
$$;

-- ── 5. spending one ──────────────────────────────────────────────────────────
-- One ping for this pair in this reveal: 'ok' (spent now, or already spent on
-- this pair for this reveal), 'week_full' (ten in the reveal already, across
-- the group) or 'no_pings' (the free one gone and none bought). Writes nothing
-- unless it answers 'ok' having spent. One spend at a time per person: two
-- phones sending at once must not both take the one free ping. Its lock is of
-- the two key kind, so it never meets the reveal's (0069), which is one key.
create or replace function celestual_ping_spend(p_handle text, p_to_hash text, p_reveal timestamptz)
returns text
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_key text;
  v_sent int;
  v_free_spent int;
  v_from text;
begin
  if nh is null or p_to_hash is null or p_reveal is null then
    raise exception 'invalid ping';
  end if;
  if exists (select 1 from celestual_ping_spends
              where handle = nh and to_hash = p_to_hash and reveal_at = p_reveal) then
    return 'ok';
  end if;

  select min(g) into v_key from celestual_group(nh) g;
  perform pg_advisory_xact_lock(hashtext('celestual_ping_spend'), hashtext(v_key));
  -- read again after the lock: another phone of the same person may have
  -- spent on this very pair while this one waited
  if exists (select 1 from celestual_ping_spends
              where handle = nh and to_hash = p_to_hash and reveal_at = p_reveal) then
    return 'ok';
  end if;

  select count(*), count(*) filter (where kind = 'free')
    into v_sent, v_free_spent
    from celestual_ping_spends
   where handle in (select celestual_group(nh)) and reveal_at = p_reveal;
  if v_sent >= celestual_ping_ceiling() then
    return 'week_full';
  end if;

  if v_free_spent < celestual_ping_free(nh) then
    insert into celestual_ping_spends (handle, to_hash, reveal_at, kind)
    values (nh, p_to_hash, p_reveal, 'free');
    return 'ok';
  end if;

  select handle into v_from
    from celestual_entitlements
   where handle in (select celestual_group(nh)) and ping_credits > 0
   order by (handle = nh) desc, handle
   limit 1
   for update;
  if v_from is null then
    return 'no_pings';
  end if;
  update celestual_entitlements
     set ping_credits = ping_credits - 1, updated_at = now()
   where handle = v_from;
  insert into celestual_ping_spends (handle, to_hash, reveal_at, kind)
  values (nh, p_to_hash, p_reveal, 'paid');
  return 'ok';
end;
$$;

-- ── 6. giving them back ──────────────────────────────────────────────────────
-- Every ping this handle spent on this pair for a reveal after p_after goes
-- back: a free one by its row going (the week's free one is free again), a
-- bought one onto the handle's own entitlement row, made if it has none.
-- Answers how many came back.
create or replace function celestual_ping_refund(p_handle text, p_to_hash text, p_after timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_n int := 0;
  v_paid int := 0;
begin
  if nh is null or p_to_hash is null then return 0; end if;
  with gone as (
    delete from celestual_ping_spends
     where handle = nh and to_hash = p_to_hash and reveal_at > coalesce(p_after, now())
    returning kind
  ) select count(*), count(*) filter (where kind = 'paid') into v_n, v_paid from gone;
  if v_paid > 0 then
    insert into celestual_entitlements (handle, ping_credits)
    values (nh, v_paid)
    on conflict (handle) do update
      set ping_credits = celestual_entitlements.ping_credits + excluded.ping_credits,
          updated_at = now();
  end if;
  return v_n;
end;
$$;

-- What erasure does to the ledger (celestual_billing_forget calls it, and the
-- erasure, the opt out and the desk's delete all call that). Other people's
-- notes to this handle went with it, so what they held for a reveal still to
-- come goes back to them; then every row of the person, and every row about
-- them, goes.
create or replace function celestual_ping_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  s record;
begin
  if nh is null then return; end if;
  hh := celestual_hash_handle(nh);
  for s in select distinct handle from celestual_ping_spends
            where to_hash = hh and handle <> nh and reveal_at > now()
  loop
    perform celestual_ping_refund(s.handle, hh, now());
  end loop;
  delete from celestual_ping_spends where handle = nh or to_hash = hh;
end;
$$;

-- ── 7. asking what is left ───────────────────────────────────────────────────
-- Proof gated exactly as the list is (celestual_my_pings): no proof, and the
-- answer is nobody's allowance. The reveal is run after the proof, the order
-- every door here takes them in (0069).
create or replace function celestual_ping_allowance(p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'allowance', celestual_ping_allowance_for(null));
  end if;
  perform celestual_reveal_due();
  return jsonb_build_object('ok', true, 'allowance', celestual_ping_allowance_for(nh));
end;
$$;

-- ── 8. the reveal ────────────────────────────────────────────────────────────
-- celestual_reveal_due, as 0069 wrote it, and a note made mutual gives back
-- what it held for a reveal after the one that told it: every row told here,
-- by its own from handle and pair, whichever of the pair held the seal.
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

-- ── 9. placing one ───────────────────────────────────────────────────────────
-- celestual_submit, as 0069 wrote it, with the week's ping in place of the
-- standing cap. A pair that is live (running, sealed or mutual) is changed in
-- place and spends nothing; one that is new, or lapsed at a reveal, spends a
-- ping for the reveal it will run to. The spend is the last refusal before
-- anything is written, so `no_pings` and `week_full` write nothing, and it is
-- in the note's own transaction, so a note that fails after it spends nothing
-- either. The thirty day cadence cap is gone, and `reachable` is said only of
-- a pair already told (the header says why). `slots` stays, drawn from the
-- allowance (celestual_ping_slots), and `allowance` rides beside it.
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
  v_existing_id uuid;
  v_live boolean := false;
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
  -- spends a ping like any note going out.
  select id, (matched_at is not null or expires_at > now())
    into v_existing_id, v_live
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

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

-- ── 10. the list ─────────────────────────────────────────────────────────────
-- celestual_my_pings, as 0069 wrote it, with the allowance beside the two
-- reveals, so the private notes tab says what is left without asking twice.
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
    'last_reveal', to_char(celestual_last_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'allowance', celestual_ping_allowance_for(nh));
end;
$$;

-- ── 11. keeping one for next week ────────────────────────────────────────────
-- celestual_renew, as 0069 wrote it, and a keep spends a ping for the reveal
-- the note is kept to, unless one is already spent on this pair for it. A
-- keep that moves nothing (a note already kept as far as it goes) spends
-- nothing. A keep that cannot be paid for changes nothing and says why, with
-- the allowance, so the wall can open the paywall with the note waiting. A
-- sealed note is kept, and spends, exactly as any other (the ping comes back
-- at its reveal, when it is mutual).
create or replace function celestual_renew(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  nh text;
  v_cap timestamptz;
  v_id uuid;
  v_was timestamptz;
  v_keep timestamptz;
  v_spent text;
  v_expires timestamptz;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  nh := celestual_hash_handle(nt);
  v_cap := celestual_next_reveal(celestual_note_ends(now()));

  select id, expires_at into v_id, v_was
    from celestual_entries
   where from_handle = nf and to_hash = nh
     and matched_at is null and expires_at > now()
   for update;
  if v_id is null then
    return jsonb_build_object('ok', false,
      'error', case when exists (select 1 from celestual_entries
                                  where from_handle = nf and to_hash = nh
                                    and matched_at is null) then 'lapsed' else 'none' end,
      'allowance', celestual_ping_allowance_for(nf));
  end if;

  v_keep := least(greatest(v_was, celestual_next_reveal(v_was)), v_cap);
  if v_keep > v_was then
    v_spent := celestual_ping_spend(nf, nh, v_keep);
    if v_spent <> 'ok' then
      return jsonb_build_object('ok', false, 'error', v_spent,
        'allowance', celestual_ping_allowance_for(nf));
    end if;
  end if;

  update celestual_entries
     set expires_at = v_keep, renew_notified_at = null
   where id = v_id
  returning expires_at into v_expires;
  return jsonb_build_object('ok', true,
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'allowance', celestual_ping_allowance_for(nf));
end;
$$;

-- ── 12. letting one go ───────────────────────────────────────────────────────
-- celestual_withdraw, as 0069 wrote it, and every ping the note held for a
-- reveal still to come goes back, free or bought, sealed or not. A note let go
-- after its reveal (one that was not this time) gives back nothing: its ping
-- was used. The answer carries the allowance, so the ping is seen to land.
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
       and matched_at is null
    returning id
  ) select array_agg(id) into v_ids from gone;
  v_deleted := coalesce(cardinality(v_ids), 0);

  if v_deleted = 0 then
    return jsonb_build_object('withdrawn', false,
      'error', case when exists (select 1 from celestual_entries
                                  where from_handle = nf and to_hash = celestual_hash_handle(nt))
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

  ha := least(nf, nt);
  hb := greatest(nf, nt);
  delete from celestual_notifications n
   using celestual_matches m
   where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb
     and n.sent_at is null;
  delete from celestual_matches where handle_a = ha and handle_b = hb;

  return jsonb_build_object('withdrawn', v_deleted > 0,
    'allowance', celestual_ping_allowance_for(nf));
end;
$$;

-- ── 13. the broom ────────────────────────────────────────────────────────────
-- celestual_purge_expired, as 0069 wrote it, and the ledger's rows go a
-- fortnight after their reveal: no allowance reads a reveal that has passed,
-- and the week after one is kept for anybody reading how it went.
create or replace function celestual_purge_expired()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
  v_s int;
begin
  perform celestual_reveal_due();
  delete from celestual_entries
   where matched_at is null and sealed_with is null
     and expires_at < now() - interval '7 days';
  get diagnostics v_n = row_count;
  delete from celestual_ping_spends
   where reveal_at < now() - interval '14 days';
  get diagnostics v_s = row_count;
  return jsonb_build_object('purged', v_n, 'spends', v_s);
end;
$$;

-- ── 14. the two old meters ───────────────────────────────────────────────────
-- celestual_slots_for and celestual_billing_status read the standing cap of
-- 0021, which nothing enforces now. The wall calls neither, but a number
-- shown to anybody is exact or absent (VOICE.md section 4), so both answer
-- from the allowance. Both take the proof always now, as the list does, and
-- run the reveal after it. After this file nothing reads 0021's cap helpers
-- (celestual_cap_for, celestual_extra_slots, celestual_free_cap,
-- celestual_hard_cap, celestual_ping_window); they stay defined, ungranted,
-- so a caller nobody has found fails soft rather than on a missing function.
create or replace function celestual_slots_for(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_allowance jsonb;
begin
  if nf is null or not celestual_consume_ig_proof(nf, p_proof) then
    v_allowance := celestual_ping_allowance_for(null);
    return celestual_ping_slots(v_allowance) || jsonb_build_object('allowance', v_allowance);
  end if;
  perform celestual_reveal_due();
  v_allowance := celestual_ping_allowance_for(nf);
  return celestual_ping_slots(v_allowance) || jsonb_build_object('allowance', v_allowance);
end;
$$;

create or replace function celestual_billing_status(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_allowance jsonb;
  v_until timestamptz;
  v_plan text;
  v_ok boolean := false;
begin
  if nf is not null and celestual_consume_ig_proof(nf, p_proof) then
    v_ok := true;
    perform celestual_reveal_due();
    v_allowance := celestual_ping_allowance_for(nf);
    v_until := celestual_plan_until(nf);
    v_plan := case when v_until is not null and v_until > now() then 'steady' end;
  else
    v_allowance := celestual_ping_allowance_for(null);
  end if;
  return jsonb_build_object(
    'ok', v_ok,
    'standing', (celestual_ping_slots(v_allowance)->>'standing')::int,
    'cap', (celestual_ping_slots(v_allowance)->>'cap')::int,
    'free_cap', (v_allowance->>'free')::int,
    'extra', (v_allowance->>'credits')::int,
    'plan', v_plan,
    'plan_until', case when v_plan is not null
      then to_char(v_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
    'allowance', v_allowance);
end;
$$;

-- ── 15. buying ───────────────────────────────────────────────────────────────
-- celestual_billing_begin takes a quantity. 'pings' is one to ten of them,
-- anything else refused with 'quantity'; 'slot' is one ping (a purchase of
-- the old kind, the same product and price) and 'steady' the old plan, both
-- still accepted so nothing deployed breaks, neither offered by the wall.
-- Everything else as 0021: the handle, the kind, the proof (always, now), the
-- opt out list, the hourly limit, and a plan not sold twice.
-- Returns: { ok, purchase_id, kind, quantity }
--        | { ok:false, error:'handle'|'kind'|'quantity'|'unverified'|'suppressed'|'rate'|'has_plan' }
drop function if exists celestual_billing_begin(text, text, text);
create or replace function celestual_billing_begin(
  p_handle text, p_proof text, p_kind text, p_quantity int default 1)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  nk text := case when p_kind in ('pings', 'slot', 'steady') then p_kind end;
  nq int;
  v_n  int;
  v_id uuid;
  v_until timestamptz;
  c_begin_per_hour constant int := 12;
begin
  if nf is null then return jsonb_build_object('ok', false, 'error', 'handle'); end if;
  if nk is null then return jsonb_build_object('ok', false, 'error', 'kind'); end if;
  nq := case when nk = 'pings' then p_quantity else 1 end;
  if nq is null or nq < 1 or nq > 10 then
    return jsonb_build_object('ok', false, 'error', 'quantity');
  end if;

  -- Ownership: the same bearer proof placing a ping needs. Money must never be
  -- attachable to an @ the buyer hasn't proven, or a purchase becomes a way to
  -- write to a stranger's account.
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  if exists (select 1 from celestual_suppressions
              where handle_hash = celestual_hash_handle(nf)) then
    return jsonb_build_object('ok', false, 'error', 'suppressed');
  end if;

  select count(*) into v_n from celestual_purchases
   where handle = nf and created_at > now() - interval '1 hour';
  if v_n >= c_begin_per_hour then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  v_until := celestual_plan_until(nf);
  if nk = 'steady' and v_until is not null and v_until > now() then
    return jsonb_build_object('ok', false, 'error', 'has_plan');
  end if;

  insert into celestual_purchases (handle, kind, status, quantity)
  values (nf, nk, 'pending', nq)
  returning id into v_id;

  -- Opportunistically clear pending rows nobody ever paid (an abandoned tab).
  if random() < 0.1 then
    delete from celestual_purchases
     where status = 'pending' and created_at < now() - interval '2 days';
  end if;

  return jsonb_build_object('ok', true, 'purchase_id', v_id, 'kind', nk, 'quantity', nq);
end;
$$;

-- celestual_billing_complete: the grant, once. 'pings' and 'slot' add the
-- purchase's quantity to the buyer's pings on hand; 'steady' stands the plan
-- up as 0021 did. A purchase already paid, void or refunded applies nothing.
-- Returns: { ok, applied, kind, quantity, credits } | { ok:false, error:'unknown'|'no_handle' }
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
  if v_p.status in ('paid', 'void', 'refunded') then
    return jsonb_build_object('ok', true, 'applied', false, 'kind', v_p.kind,
      'quantity', v_p.quantity, 'credits', celestual_ping_credits(v_p.handle));
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

  if v_p.kind in ('pings', 'slot') then
    update celestual_entitlements
       set ping_credits = ping_credits + v_p.quantity,
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
    'quantity', v_p.quantity, 'credits', celestual_ping_credits(v_p.handle));
end;
$$;

-- celestual_billing_revoke: a refund or a lost dispute takes back what it
-- paid for. 'pings' and 'slot' by quantity: the pings the money that went
-- back covers, floor(amount refunded / unit price), the unit price being what
-- the purchase was charged (`amount_cents`) over its quantity, never more
-- than the quantity. `p_amount_refunded` is the charge's own cumulative
-- figure (Stripe's charge.amount_refunded); `p_amount`, the charge's amount,
-- stands in for `amount_cents` only on a purchase that never recorded one.
-- With no amount refunded given (a lost dispute, an older caller) it is all
-- of them. Taken from the pings on hand, the buyer's own row first and then
-- the rest of their group, never below zero; a ping already spent on a note
-- is left where it is. The purchase reads 'refunded' only once every ping it
-- bought is covered. 'steady' ends the plan now, as 0021 did. Idempotent
-- across successive partial refunds of one charge: the purchase counts what
-- refunds have covered so far (`refunded_quantity`) and each call takes only
-- the difference, so the same refund told twice takes nothing the second
-- time.
-- Returns: { ok, applied, handle, kind, quantity, credits } | { ok:false, error:'unknown' }
--   quantity is how many pings this call took back.
drop function if exists celestual_billing_revoke(text, text);
create or replace function celestual_billing_revoke(
  p_payment_intent text default null,
  p_subscription text default null,
  p_amount_refunded int default null,
  p_amount int default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_p record;
  v_paid int;
  v_target int;
  v_owed int;
  v_left int;
  v_n int;
  v_row record;
begin
  select * into v_p from celestual_purchases
   where (p_payment_intent is not null and stripe_payment_intent = p_payment_intent)
      or (p_subscription is not null and stripe_subscription_id = p_subscription)
   order by created_at desc limit 1
   for update;
  if not found or v_p.handle is null then
    return jsonb_build_object('ok', false, 'error', 'unknown');
  end if;
  if v_p.status = 'refunded' then
    return jsonb_build_object('ok', true, 'applied', false, 'handle', v_p.handle, 'kind', v_p.kind,
      'quantity', 0, 'credits', celestual_ping_credits(v_p.handle));
  end if;

  if v_p.kind = 'steady' then
    update celestual_purchases
       set status = 'refunded', refunded_at = now()
     where id = v_p.id;
    update celestual_entitlements
       set plan_until = least(coalesce(plan_until, now()), now()), updated_at = now()
     where handle = v_p.handle;
    return jsonb_build_object('ok', true, 'applied', true, 'handle', v_p.handle, 'kind', v_p.kind,
      'quantity', 0, 'credits', celestual_ping_credits(v_p.handle));
  end if;

  -- what the purchase was charged, the unit price being that over its quantity
  v_paid := coalesce(v_p.amount_cents, p_amount);
  v_target := case
    when p_amount_refunded is null or v_paid is null or v_paid <= 0 or p_amount_refunded >= v_paid
      then v_p.quantity
    else least(v_p.quantity,
               floor(greatest(p_amount_refunded, 0)::numeric * v_p.quantity / v_paid)::int)
  end;
  v_owed := greatest(v_target - v_p.refunded_quantity, 0);
  if v_owed = 0 then
    return jsonb_build_object('ok', true, 'applied', false, 'handle', v_p.handle, 'kind', v_p.kind,
      'quantity', 0, 'credits', celestual_ping_credits(v_p.handle));
  end if;

  update celestual_purchases
     set refunded_quantity = v_target,
         status = case when v_target >= quantity then 'refunded' else status end,
         refunded_at = case when v_target >= quantity then now() else refunded_at end
   where id = v_p.id;

  v_left := v_owed;
  for v_row in
    select handle, ping_credits from celestual_entitlements
     where handle in (select celestual_group(v_p.handle)) and ping_credits > 0
     order by (handle = v_p.handle) desc, handle
     for update
  loop
    exit when v_left <= 0;
    v_n := least(v_left, v_row.ping_credits);
    update celestual_entitlements
       set ping_credits = ping_credits - v_n, updated_at = now()
     where handle = v_row.handle;
    v_left := v_left - v_n;
  end loop;

  return jsonb_build_object('ok', true, 'applied', true, 'handle', v_p.handle, 'kind', v_p.kind,
    'quantity', v_owed - v_left, 'credits', celestual_ping_credits(v_p.handle));
end;
$$;

-- celestual_billing_forget, as 0021 wrote it, and the ledger of pings goes
-- with the person (celestual_ping_forget). Erasure, the opt out and the
-- desk's delete all come through here.
create or replace function celestual_billing_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  perform celestual_ping_forget(nh);
  delete from celestual_entitlements where handle = nh;
  update celestual_purchases set handle = null where handle = nh;
end;
$$;

-- ── 15b. the status of a few ─────────────────────────────────────────────────
-- celestual_ping_status, as 0069 wrote it, and `reachable` said only of a
-- pair already told, as the placement says it (section 9, and the header):
-- whether an @ has an account is not a thing a note sent and let go for
-- nothing may learn before its night.
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
        'reachable', e.matched_at is not null);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;
grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;

-- ── 16. grants ───────────────────────────────────────────────────────────────
-- The browser's: the allowance (new), and the doors this file re-created, as
-- they were. The service role's: the billing writes, and the reveal. Nobody's
-- from outside: the ledger's helpers, which read across a person's group.
revoke all on function celestual_ping_allowance(text, text) from public;
grant execute on function celestual_ping_allowance(text, text) to anon, authenticated;
revoke all on function celestual_submit(text, text, text, text, jsonb) from public;
grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;
grant execute on function celestual_renew(text, text, text) to anon, authenticated;
grant execute on function celestual_withdraw(text, text, text) to anon, authenticated;
grant execute on function celestual_slots_for(text, text) to anon, authenticated;
grant execute on function celestual_billing_status(text, text) to anon, authenticated;

revoke all on function celestual_reveal_due() from public;
revoke all on function celestual_reveal_due() from anon, authenticated;
grant execute on function celestual_reveal_due() to service_role;
revoke all on function celestual_purge_expired() from public, anon, authenticated;
grant execute on function celestual_purge_expired() to service_role;

revoke all on function celestual_billing_begin(text, text, text, int) from public, anon, authenticated;
grant execute on function celestual_billing_begin(text, text, text, int) to service_role;
revoke all on function celestual_billing_complete(uuid, text, text, int, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function celestual_billing_complete(uuid, text, text, int, text, text, text, timestamptz) to service_role;
revoke all on function celestual_billing_revoke(text, text, int, int) from public, anon, authenticated;
grant execute on function celestual_billing_revoke(text, text, int, int) to service_role;
revoke all on function celestual_billing_forget(text) from public, anon, authenticated;

revoke all on function celestual_ping_ceiling()                                 from public, anon, authenticated;
revoke all on function celestual_ping_price_cents()                             from public, anon, authenticated;
revoke all on function celestual_ping_free(text)                                from public, anon, authenticated;
revoke all on function celestual_ping_credits(text)                             from public, anon, authenticated;
revoke all on function celestual_ping_allowance_for(text)                       from public, anon, authenticated;
revoke all on function celestual_ping_slots(jsonb)                              from public, anon, authenticated;
revoke all on function celestual_ping_spend(text, text, timestamptz)            from public, anon, authenticated;
revoke all on function celestual_ping_refund(text, text, timestamptz)           from public, anon, authenticated;
revoke all on function celestual_ping_forget(text)                              from public, anon, authenticated;

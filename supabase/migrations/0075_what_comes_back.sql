-- ─────────────────────────────────────────────────────────────────────────────
-- 0075_what_comes_back.sql
--
-- A night that was not mutual gives its ping back.
--
-- ── the owner's ruling of 29 September ──────────────────────────────────────
-- "What is shown during the reveal if it's not mutual? And what if the other
-- person isn't on celestual? What if we gave them an extra ping for next week
-- and ask them to share it around so more people will join. And if a user
-- bought a ping, perhaps give back the ping. Find the best way to do this so
-- it looks like we're being honest." Until this file a note that was not
-- this time simply ran out: `celestual_reveal_due` touched only sealed pairs,
-- nothing happened to an unanswered note at its night, and the ping it spent
-- was used (0071, `celestual_withdraw`'s own comment: "its ping was used").
-- So a person paid for silence, and was told nothing about it. Now every ping
-- spent on a Saturday that was not mutual comes back, and the wall says so,
-- exactly, on the night (app/src/wall/Night.jsx).
--
-- ── the rules, as the database keeps them ───────────────────────────────────
--   the night      every row of `celestual_ping_spends` whose reveal has come
--                  is SETTLED once (`settled_at`), right after the reveal
--                  tells the pairs it tells, in the same transaction and under
--                  the same lock (`celestual_reveal_due`, then
--                  `celestual_ping_settle`). A row whose pair was told at that
--                  reveal (a row of the pair matched at that very moment, or
--                  its keepsake told then) was used by the mutual, and gives
--                  nothing back. Every other row gives back:
--   a bought one   comes back as a bought one, +1 on the spender's own
--                  entitlement row (`returned` 'kept'). It never lapses.
--   a free one     comes back as ONE extra free ping for the reveal after its
--                  own (`celestual_ping_extras`, `returned` 'extra'), and no
--                  more than one extra per person per reveal, counted across
--                  every @ they have linked (`celestual_group`). A second free
--                  ping that lapses the same night gives back nothing
--                  (`returned` null), and the wall says exactly that. So an
--                  extra that lapses in its turn comes back as the next
--                  week's extra, one, and never piles up.
--   which week     the extra is for the reveal after the night it came back
--                  from, which is the reveal a note sent the moment the night
--                  is over runs to; settled late (a database that was down
--                  over a Saturday), it is for the reveal a note sent now
--                  runs to, never one already gone.
--   kept notes     each Saturday's ping is judged on its own Saturday. A note
--                  kept for next week spent a ping for each of the two
--                  reveals it stands in; if the first is not mutual, that
--                  ping comes back that night and the note runs on, holding
--                  the second, which is judged on its own night. Each row is
--                  settled once and marked, so nothing is given back twice.
--   before it      letting a note go before its night gives its pings back,
--                  as it always has (0071), and a mutual told at a reveal uses
--                  its spend and gives back what it held for later ones, as it
--                  always has. A note from before 0071 holds no row, cost
--                  nothing, and gives nothing back.
--   the answer     `celestual_my_pings` says, on a note that is not mutual,
--                  what the night it last stood in cost it (`cost`: 'free',
--                  'paid' or null) and what came back (`returned`: 'extra',
--                  'kept' or null): for a note that lapsed, its own night; for
--                  one still running, the last reveal, if it held a ping for
--                  it (a note kept through that night, or one that lapsed and
--                  was sent again). And the allowance says the extra, `extra`,
--                  for this reveal and in `next` for the one after, and counts
--                  it in `free_left`; `free` stays the free pings every reveal
--                  gives.
--
-- ── what it never says ──────────────────────────────────────────────────────
-- Whether the other person is here. `celestual_members` could answer it, and
-- the owner asked what happens when they are not; the ruling is that nobody is
-- ever told. A night that was not mutual answers the same, byte for byte,
-- whether the other person never wrote, wrote and let go before the night, or
-- is not reachable here yet: the settlement reads only the sender's own
-- ledger and whether the pair was told, and the list carries no field that
-- could tell the three apart (scripts/sql/test-pings-by-the-week.sql
-- compares them). The wall says so in as many words ("celestual never says
-- which"). And it has to stay unsaid now more than ever: with every ping of a
-- night that was not mutual coming back, a note costs nothing unless it is
-- mutual, so a bit answered at the night would be a free lookup of ten @s a
-- week. 0071's header said `reachable` was "answered at the reveal and not
-- before"; no code ever answered it for a note that was not mutual, and none
-- does now. It is said only of a pair already told, where both know.
--
-- ── the broom, and erasure ──────────────────────────────────────────────────
-- Nothing is swept before it is settled. `celestual_purge_expired` runs the
-- reveal first, which settles every row whose night has come, and then sweeps
-- only settled rows a fortnight past their reveal; the two per cent sweep in
-- `celestual_place` (0072) runs after that function's own call to the reveal,
-- in the same transaction, so every row it can reach is settled by then, and
-- it is not written out again for it. The extras are swept a fortnight after
-- the reveal they were for. Erasure (`celestual_ping_forget`) settles the rows
-- about the erased @ whose night has come before it takes them: a pair about
-- to be erased was not told, since the reveal tells and settles in one
-- transaction and a row still unsettled is one no reveal has reached, so each
-- gives back to its sender as a night that was not mutual would. It takes no
-- lock of the reveal's to do it: erasure holds the rows it deleted, and a
-- reveal waiting on one of them while erasure waited on the reveal would be
-- the deadlock 0069 and 0071 warn about. The erased person's own extras go
-- with their ledger.
--
-- ── the locks ───────────────────────────────────────────────────────────────
-- The settlement runs inside `celestual_reveal_due`, after its telling, under
-- its advisory lock, which every door takes after the proof's row: proof,
-- then the reveal, then a person's spend lock (`celestual_ping_spend`), in
-- that order everywhere. The cheap check at the head of the reveal is widened
-- so a night with nothing sealed still settles: it returns at once only when
-- nothing sealed is due AND no spend is waiting to be settled (a partial
-- index answers the second). Two reveals at nine on Saturday take turns; the
-- second finds every row settled and does nothing. A resend queued behind a
-- running reveal waits for it, and spends from the allowance the settlement
-- has just given back (scripts/sql/test-what-comes-back-race.sql).
--
-- The spends already past when this applies are settled as it applies, the
-- same way (the last statement). Re-runnable: columns and tables if not
-- exists, functions created or replaced, the grants restated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the ledger learns what came back ─────────────────────────────────────
alter table celestual_ping_spends add column if not exists settled_at timestamptz;
alter table celestual_ping_spends add column if not exists returned   text;
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'celestual_ping_spends'::regclass
                    and conname = 'celestual_ping_spends_returned_check') then
    alter table celestual_ping_spends
      add constraint celestual_ping_spends_returned_check
      check (returned is null or (returned in ('extra', 'kept') and settled_at is not null));
  end if;
end $$;
comment on column celestual_ping_spends.settled_at is
  '0075: when the night this ping was for came and it was judged: used by a mutual told that night, or given back. Set once. Nothing unsettled is ever swept.';
comment on column celestual_ping_spends.returned is
  '0075: what came back at its night: ''extra'' (a free ping, back as one extra for the next reveal), ''kept'' (a bought one, back on hand) or null (used by a mutual, or the one extra a week already given).';
create index if not exists celestual_ping_spends_due_idx
  on celestual_ping_spends (reveal_at) where settled_at is null;

-- ── 2. the extras ────────────────────────────────────────────────────────────
-- One row per @ per reveal it is for; one per person per reveal is enforced
-- by the settlement across the group, and read no higher than one.
create table if not exists celestual_ping_extras (
  handle      text        not null,
  reveal_at   timestamptz not null,
  from_reveal timestamptz not null,
  created_at  timestamptz not null default now(),
  primary key (handle, reveal_at)
);
comment on table celestual_ping_extras is
  '0075: a free ping that came back from a night that was not mutual, as one extra free ping for the reveal after it. At most one per person per reveal. Service role only.';
comment on column celestual_ping_extras.reveal_at is
  '0075: the reveal the extra is for: the one after the night it came back from, or the one a note sent now runs to when settled late.';
comment on column celestual_ping_extras.from_reveal is
  '0075: the night whose free ping came back as it.';
create index if not exists celestual_ping_extras_reveal_idx on celestual_ping_extras (reveal_at);
alter table celestual_ping_extras enable row level security;
revoke all on celestual_ping_extras from anon, authenticated;

-- ── 3. the free pings of a reveal ────────────────────────────────────────────
-- What every reveal gives: one, or the ceiling while a 'steady' plan from
-- before is paid through (0071).
create or replace function celestual_ping_base(h text) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_until timestamptz := celestual_plan_until(h);
begin
  if v_until is not null and v_until > now() then return celestual_ping_ceiling(); end if;
  return 1;
end;
$$;

-- The extra a reveal holds for a person, across their group: 0 or 1.
create or replace function celestual_ping_extra(h text, p_reveal timestamptz) returns int
language sql stable security definer set search_path = public as $$
  select least(count(*), 1)::int
    from celestual_ping_extras x
   where x.handle in (select celestual_group(h)) and x.reveal_at = p_reveal
$$;

-- The free pings in one reveal: what every reveal gives, and its extra.
create or replace function celestual_ping_free(h text, p_reveal timestamptz) returns int
language sql stable security definer set search_path = public as $$
  select celestual_ping_base(h) + celestual_ping_extra(h, p_reveal)
$$;

-- 0071's one argument form, for any caller nobody has found: the free pings
-- of the reveal a note sent now runs to.
create or replace function celestual_ping_free(h text) returns int
language sql stable security definer set search_path = public as $$
  select celestual_ping_free(h, celestual_note_ends(now()))
$$;

-- ── 4. the allowance ─────────────────────────────────────────────────────────
-- celestual_ping_allowance_for, as 0071 wrote it, and the extra: `extra` for
-- this reveal and for the next, counted in each `free_left`. `free` is still
-- what every reveal gives, so a stranger's answer is what it was, and an
-- extra zero.
create or replace function celestual_ping_allowance_for(p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  r0 timestamptz := celestual_note_ends(now());
  r1 timestamptz := celestual_next_reveal(celestual_note_ends(now()));
  v_base    int := 1;
  v_extra0  int := 0;
  v_extra1  int := 0;
  v_credits int := 0;
  v_sent0   int := 0;
  v_free0   int := 0;
  v_sent1   int := 0;
  v_free1   int := 0;
begin
  if nh is not null then
    v_base := celestual_ping_base(nh);
    v_extra0 := celestual_ping_extra(nh, r0);
    v_extra1 := celestual_ping_extra(nh, r1);
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
    'free',        v_base,
    'extra',       v_extra0,
    'free_left',   greatest(v_base + v_extra0 - v_free0, 0),
    'credits',     v_credits,
    'sent',        v_sent0,
    'ceiling',     celestual_ping_ceiling(),
    'price_cents', celestual_ping_price_cents(),
    'next', jsonb_build_object(
      'reveal_at', to_char(r1 at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'extra',     v_extra1,
      'free_left', greatest(v_base + v_extra1 - v_free1, 0),
      'sent',      v_sent1));
end;
$$;

-- ── 5. spending one ──────────────────────────────────────────────────────────
-- celestual_ping_spend, as 0071 wrote it, with the reveal's own free pings:
-- the extra it holds, if any, is spent as a free one, after the free one it
-- always gave and before anything bought. Let go, a note that spent it gives
-- it back as any free one comes back, its row gone.
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

  if v_free_spent < celestual_ping_free(nh, p_reveal) then
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

-- ── 6. the night, settled ────────────────────────────────────────────────────
-- Every spend whose reveal has come and that is not settled yet, oldest night
-- first and in the order the pings went out, judged once: used, when its pair
-- was told at that reveal; otherwise given back, a bought one on hand and a
-- free one as the next reveal's extra, one a person. Answers how many rows it
-- settled.
--
-- Internal, and called two ways. With no argument by `celestual_reveal_due`,
-- after its telling and under its lock, which is the only way a told pair is
-- read as told: the reveal tells and settles in one transaction. With the
-- hash of an @ being erased (`p_gone`), by `celestual_ping_forget`, for the
-- rows about that @ alone, every one of them judged not told (the header
-- says why) and without the reveal's lock. Each row is locked as it is read
-- and marked in the same statement that gives it back, so two settlements
-- that meet give back once.
create or replace function celestual_ping_settle(p_gone text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  s celestual_ping_spends%rowtype;
  v_told boolean;
  v_for timestamptz;
  v_back text;
  v_n int := 0;
begin
  for s in
    select * from celestual_ping_spends
     where settled_at is null and reveal_at <= now()
       and (p_gone is null or to_hash = p_gone)
     order by reveal_at, created_at, id
     for update
  loop
    -- a settlement that waited on this row may find it settled already
    continue when exists (select 1 from celestual_ping_spends where id = s.id and settled_at is not null);

    v_told := p_gone is null and (
      exists (select 1 from celestual_entries e
               where e.from_handle = s.handle and e.to_hash = s.to_hash and e.matched_at = s.reveal_at)
      or exists (select 1 from celestual_keepsakes k
                  where k.handle = s.handle and k.other_hash = s.to_hash and k.told_at = s.reveal_at));
    v_back := null;

    if not v_told and s.kind = 'paid' then
      -- back on hand, on the spender's own row, as a note let go gives it
      insert into celestual_entitlements (handle, ping_credits)
      values (s.handle, 1)
      on conflict (handle) do update
        set ping_credits = celestual_entitlements.ping_credits + 1,
            updated_at = now();
      v_back := 'kept';
    elsif not v_told then
      -- the reveal after this night, or the one open now if that has gone by
      v_for := greatest(celestual_next_reveal(s.reveal_at), celestual_note_ends(now()));
      if not exists (select 1 from celestual_ping_extras x
                      where x.handle in (select celestual_group(s.handle)) and x.reveal_at = v_for) then
        insert into celestual_ping_extras (handle, reveal_at, from_reveal)
        values (s.handle, v_for, s.reveal_at)
        on conflict (handle, reveal_at) do nothing;
        if found then v_back := 'extra'; end if;
      end if;
    end if;

    update celestual_ping_spends
       set settled_at = now(), returned = v_back
     where id = s.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ── 7. the reveal ────────────────────────────────────────────────────────────
-- celestual_reveal_due, as 0072 wrote it, and then the night settled
-- (`celestual_ping_settle`) under the same lock, after every pair due is
-- told. It returns at once only when nothing sealed is due and no spend waits
-- to be settled, so a night with no pair in it still gives its pings back.
-- It still answers how many pairs it told.
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
                  where sealed_with is not null and matched_at is null and reveal_at <= now())
     and not exists (select 1 from celestual_ping_spends
                      where settled_at is null and reveal_at <= now()) then
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

  -- every pair due is told; now the night is settled, what it used and what
  -- comes back, in the same transaction, so nothing told is ever read as not
  perform celestual_ping_settle();
  return v_n;
end;
$$;

-- ── 8. the list ──────────────────────────────────────────────────────────────
-- celestual_my_pings, as 0072 wrote it, and on every note that is not mutual,
-- what the night it last stood in cost it and what came back (the header):
-- `cost` and `returned`, both null for a note that held no ping for that
-- night. A mutual's row is what it was, key for key, so a kept pair and a
-- told one still answer alike (test-mutual-kept.sql).
create or replace function celestual_my_pings(p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_last timestamptz;
  v_pings jsonb;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
  end if;
  perform celestual_reveal_due();
  v_last := celestual_last_reveal(now());

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
    select l.owner, l.other_hash, l.handle, l.placed_at, l.expires_at, true as mutual, false as lapsed,
           l.told_at, l.card, l.their_card, null::text as cost, null::text as returned
      from latest l
    union all
    select e.from_handle, e.to_hash, coalesce(e.matched_handle, e.to_handle), e.created_at, e.expires_at, false,
           e.sealed_with is null and e.expires_at <= now(), null::timestamptz,
           case when e.card is null then null
                else e.card || jsonb_build_object('photo', e.photo is not null) end,
           null::jsonb,
           s.kind, s.returned
      from celestual_entries e
      -- the night it last stood in: its own, once it lapsed; the last reveal,
      -- while it runs on past it
      left join celestual_ping_spends s
        on s.handle = e.from_handle and s.to_hash = e.to_hash and s.settled_at is not null
       and s.reveal_at = case when e.sealed_with is null and e.expires_at <= now() then e.expires_at
                              else v_last end
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
         ) || case when s.mutual then '{}'::jsonb
                   else jsonb_build_object('cost', s.cost, 'returned', s.returned) end
         order by s.placed_at, s.mutual desc, s.told_at, s.owner, s.other_hash), '[]'::jsonb)
    into v_pings
    from shown s
    left join ig_profiles p on p.handle = s.handle;

  return jsonb_build_object(
    'ok', true, 'pings', v_pings,
    'next_reveal', to_char(celestual_next_reveal(now()) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'last_reveal', to_char(v_last at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'allowance', celestual_ping_allowance_for(nh));
end;
$$;

-- ── 9. erasure ───────────────────────────────────────────────────────────────
-- celestual_ping_forget, as 0071 wrote it, with the night settled first for
-- the rows about the @ that is going (the header says why), so a sender whose
-- note went with it gets back what that night owed them, and the person's own
-- extras go with the rest of their ledger.
create or replace function celestual_ping_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  s record;
begin
  if nh is null then return; end if;
  hh := celestual_hash_handle(nh);
  perform celestual_ping_settle(hh);
  for s in select distinct handle from celestual_ping_spends
            where to_hash = hh and handle <> nh and reveal_at > now()
  loop
    perform celestual_ping_refund(s.handle, hh, now());
  end loop;
  delete from celestual_ping_spends where handle = nh or to_hash = hh;
  delete from celestual_ping_extras where handle = nh;
end;
$$;

-- ── 10. the broom ────────────────────────────────────────────────────────────
-- celestual_purge_expired, as 0071 wrote it: the reveal first, which settles
-- every night that has come, then the rows a fortnight past their reveal,
-- settled ones only, and the extras a fortnight past the reveal they were for.
create or replace function celestual_purge_expired()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
  v_s int;
  v_x int;
begin
  perform celestual_reveal_due();
  delete from celestual_entries
   where matched_at is null and sealed_with is null
     and expires_at < now() - interval '7 days';
  get diagnostics v_n = row_count;
  delete from celestual_ping_spends
   where reveal_at < now() - interval '14 days' and settled_at is not null;
  get diagnostics v_s = row_count;
  delete from celestual_ping_extras
   where reveal_at < now() - interval '14 days';
  get diagnostics v_x = row_count;
  return jsonb_build_object('purged', v_n, 'spends', v_s, 'extras', v_x);
end;
$$;

-- ── 11. grants ───────────────────────────────────────────────────────────────
-- The browser's: the list and the allowance, as they were, behind the proof.
-- The service role's: the reveal and the broom, which the clock runs. Nobody's
-- from outside: the settlement, the extras and the numbers under them.
revoke all on function celestual_my_pings(text, text) from public;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;
revoke all on function celestual_ping_allowance(text, text) from public;
grant execute on function celestual_ping_allowance(text, text) to anon, authenticated;

revoke all on function celestual_reveal_due() from public, anon, authenticated;
grant execute on function celestual_reveal_due() to service_role;
revoke all on function celestual_purge_expired() from public, anon, authenticated;
grant execute on function celestual_purge_expired() to service_role;

revoke all on function celestual_ping_settle(text)                   from public, anon, authenticated;
revoke all on function celestual_ping_base(text)                     from public, anon, authenticated;
revoke all on function celestual_ping_extra(text, timestamptz)       from public, anon, authenticated;
revoke all on function celestual_ping_free(text, timestamptz)        from public, anon, authenticated;
revoke all on function celestual_ping_free(text)                     from public, anon, authenticated;
revoke all on function celestual_ping_allowance_for(text)            from public, anon, authenticated;
revoke all on function celestual_ping_spend(text, text, timestamptz) from public, anon, authenticated;
revoke all on function celestual_ping_forget(text)                   from public, anon, authenticated;

-- ── 12. the nights already past ──────────────────────────────────────────────
-- Every spend whose reveal came before this applied is settled now, the same
-- way, through the reveal, so a pair still sealed and due is told first.
do $$
begin
  perform celestual_reveal_due();
end $$;

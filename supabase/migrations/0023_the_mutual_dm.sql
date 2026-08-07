-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0023 · THE MUTUAL DM                                                ║
-- ║  The reveal reaches the person who isn't looking at the app.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- WHAT THIS IS
--
-- A mutual is simultaneous by construction: both rows flip in the same
-- statement, and whoever asks next is told. But only ONE of the two people is
-- holding a phone at that moment — the one who just placed the ping. The other
-- one entered a handle days or weeks ago and has been living their life. Until
-- now the only thing that reached them was an email, and only if they had left
-- an address on that ping.
--
-- This migration adds the second channel: an Instagram DM, relayed by the same
-- ManyChat automation that already relays verification codes, saying the one
-- true thing —
--
--     ✦ You and @blah are mutual. They left a card for you.
--
-- and it fixes the email so it reaches more of the people it was always meant
-- to reach (docs/MANYCHAT-MUTUAL-DM.md is the operator's runbook).
--
-- THE HARD CONSTRAINT, NAMED UP FRONT
--
-- Meta will not let a business DM a person whenever it likes. An inbound
-- message from a person opens a 24-hour window; inside it you may reply freely,
-- and outside it a send is refused. The HUMAN_AGENT tag stretches that to seven
-- days but is, by Meta's own policy, for a human answering a person — not for
-- an automation, and misuse is detected and penalised. There is no compliant
-- "notify whenever" for Instagram.
--
-- So a match cannot simply push a DM. What it can do is what this schema does:
--
--   1. QUEUE the news the instant the match is made (celestual_dm_outbox).
--   2. PUSH it right away IF that person's window is open — i.e. they DM'd the
--      account inside the last 23 hours (celestual_dm_due → the
--      celestual-mutual-dm function → ManyChat's sending API).
--   3. Otherwise HOLD it, and hand it to them the next time they message the
--      account at all (celestual_dm_take, called by the celestual-manychat
--      relay, which is already replying to that message and is therefore always
--      inside the window). Verifying on a new device is a message. So is "hi".
--   4. And EMAIL it in parallel, to any address that person has stored, so the
--      DM is never the only carrier.
--
-- Nothing here ever sends an unsolicited message. Step 2 is a reply inside a
-- window the person opened; step 3 is a reply to a message they just sent.
--
-- WHAT THE DM MAY SAY
--
-- The same seal the email has carried since 0001: it names the pair, and it
-- never carries a single word of either card. The words are read in the
-- product, by the person they were written to, once (docs/STAR-CARDS.md). The
-- outbox stores a boolean — is there a card waiting — and nothing else about
-- it.
--
-- WHAT CHANGES
--
--   celestual_dm_contacts    new · handle ⇄ ManyChat contact id, and the one
--                            timestamp that decides whether a push is legal.
--   celestual_dm_outbox      new · one row per person per match. Delivered by
--                            push or by reply, whichever reaches them first.
--   celestual_dm_touch       new · every inbound DM refreshes the contact.
--   celestual_dm_take        new · the pull: hand a person their pending news.
--   celestual_dm_due         new · the push: rows whose window is open.
--   celestual_dm_sent/_failed/_prune/_forget   the bookkeeping.
--   celestual_notifications  + has_card
--   celestual_submit         0022's body, plus: queue both DMs, and queue the
--                            email for BOTH sides instead of one, from stored
--                            addresses only.
--   celestual_erase_account  + celestual_dm_forget
--   celestual_suppress       + celestual_dm_forget
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). Safe on top of 0001→0022.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- 1 · THE CONTACT
-- ──────────────────────────────────────────────────────────────────────
-- One row per handle we can reach on Instagram. `subscriber_id` is ManyChat's
-- contact id, handed to us on every relayed DM; `last_inbound_at` is the last
-- time that person messaged the account, which is the ONLY thing that decides
-- whether a push is inside Meta's window.
--
-- This table holds no message, no card, and nothing about who anyone pinged.
-- RLS-locked like everything else: the only readers are SECURITY DEFINER
-- functions and the service role.
create table if not exists celestual_dm_contacts (
  handle          text primary key,
  subscriber_id   text,                       -- ManyChat contact id (null until seen)
  channel         text not null default 'manychat',
  last_inbound_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists celestual_dm_contacts_inbound_idx
  on celestual_dm_contacts (last_inbound_at);

alter table celestual_dm_contacts enable row level security;
revoke all on celestual_dm_contacts from anon, authenticated;

comment on table celestual_dm_contacts is
  'handle ⇄ ManyChat contact id, plus the last time that person messaged us. '
  'last_inbound_at is what makes a push legal (Meta 24-hour window).';

-- ──────────────────────────────────────────────────────────────────────
-- 2 · THE OUTBOX
-- ──────────────────────────────────────────────────────────────────────
-- One row per PERSON per match — two rows for a mutual, because both halves
-- deserve to be told even though one of them was looking at the screen when it
-- happened.
--
-- `has_card` is the whole of what this table knows about a card. There is no
-- column for words here and there never will be: a queue is a place a message
-- sits in plaintext waiting to be read by an operator, and the words are not
-- ours to hold that way.
--
-- Cascades off celestual_matches, so every path that erases a match erases the
-- news of it.
create table if not exists celestual_dm_outbox (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references celestual_matches(id) on delete cascade,
  handle          text not null,              -- who is being told
  other_handle    text not null,              -- who they are mutual with
  has_card        boolean not null default false,
  attempts        int not null default 0,     -- PUSH attempts only
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  sent_at         timestamptz,
  sent_via        text,                       -- 'push' | 'reply'
  created_at      timestamptz not null default now()
);
-- A person is told about a match once. This index is the whole idempotency
-- story: re-placing a ping on an already-matched pair queues nothing new.
create unique index if not exists celestual_dm_outbox_once_uidx
  on celestual_dm_outbox (match_id, handle);
create index if not exists celestual_dm_outbox_pending_idx
  on celestual_dm_outbox (handle) where sent_at is null;
create index if not exists celestual_dm_outbox_due_idx
  on celestual_dm_outbox (next_attempt_at) where sent_at is null;

alter table celestual_dm_outbox enable row level security;
revoke all on celestual_dm_outbox from anon, authenticated;

comment on table celestual_dm_outbox is
  'Queued mutual-reveal DMs. Names the pair and whether a card is waiting; '
  'never a word of the card itself.';

-- The operator kill switch. Flip to false and matches stop queueing DMs
-- immediately, without a deploy:
--   update celestual_settings set value = 'false' where key = 'mutual_dm_enabled';
insert into celestual_settings (key, value) values ('mutual_dm_enabled', 'true')
  on conflict (key) do nothing;

create or replace function celestual_dm_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true' from celestual_settings where key = 'mutual_dm_enabled'), true)
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3 · THE EMAIL QUEUE LEARNS ABOUT CARDS
-- ──────────────────────────────────────────────────────────────────────
-- Same rule as the DM: a boolean, never the words.
alter table celestual_notifications add column if not exists has_card boolean not null default false;

-- ──────────────────────────────────────────────────────────────────────
-- 4 · celestual_dm_touch — every inbound DM refreshes the contact
-- ──────────────────────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. Called by celestual-manychat on every relayed message,
-- verification or not. The handle is the Meta-authenticated sender's username,
-- which since 0012 is the identity itself — nothing here is a typed claim.
--
-- A missing subscriber id (the ManyChat body field wasn't mapped) still counts
-- as an inbound message: the window opened even if we cannot push into it, and
-- the reply path does not need an id.
create or replace function celestual_dm_touch(p_handle text, p_subscriber_id text default null, p_channel text default 'manychat')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  sid text := nullif(btrim(coalesce(p_subscriber_id, '')), '');
  ch  text := coalesce(nullif(btrim(coalesce(p_channel, '')), ''), 'manychat');
begin
  if nh is null then return jsonb_build_object('ok', false); end if;
  -- A subscriber id is a short opaque integer string. Anything else is a
  -- mis-mapped field (we used to be passed the username here), and storing it
  -- would only produce failed pushes.
  if sid is not null and sid !~ '^[0-9]{4,24}$' then sid := null; end if;

  insert into celestual_dm_contacts (handle, subscriber_id, channel, last_inbound_at)
  values (nh, sid, ch, now())
  on conflict (handle) do update
    set subscriber_id   = coalesce(excluded.subscriber_id, celestual_dm_contacts.subscriber_id),
        channel         = excluded.channel,
        last_inbound_at = now(),
        updated_at      = now();

  return jsonb_build_object('ok', true, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 5 · celestual_dm_queue — a match posts the news
-- ──────────────────────────────────────────────────────────────────────
-- Internal (called from celestual_submit under the same guard that queues the
-- email). Not granted to anyone: a client that could call this could make
-- somebody's phone say they were mutual with a stranger.
create or replace function celestual_dm_queue(p_match_id uuid, p_handle text, p_other text, p_has_card boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  no text := celestual_norm(p_other);
begin
  if p_match_id is null or nh is null or no is null then return; end if;
  if not celestual_dm_enabled() then return; end if;
  insert into celestual_dm_outbox (match_id, handle, other_handle, has_card)
  values (p_match_id, nh, no, coalesce(p_has_card, false))
  on conflict (match_id, handle) do nothing;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 6 · celestual_dm_take — the pull (their next message carries it)
-- ──────────────────────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. Called by celestual-manychat while it is composing the
-- reply to a message this person just sent, which is why this path needs no
-- window arithmetic: replying to an inbound message is always inside it.
--
-- Group-aware (celestual_group), so a person who pinged from a linked alt and
-- messages us from their main is still told.
--
-- The rows are marked delivered as they are handed over, because this function
-- is the last point at which we know anything: whether ManyChat actually put
-- the reply in front of them is not observable from here. The consequence of
-- being wrong is not silence — the same news is in the app and, for anyone who
-- left an address, in their email.
create or replace function celestual_dm_take(p_handle text, p_limit int default 3)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_lim int := least(greatest(coalesce(p_limit, 3), 1), 10);
  v_rows jsonb;
  v_left int := 0;
begin
  if nh is null then return jsonb_build_object('ok', false, 'items', '[]'::jsonb, 'more', 0); end if;

  -- A shut door is shut in both directions. An opt-out has already had its
  -- outbox deleted, so this really only catches a ban, and it catches it
  -- BEFORE anything is marked delivered: the relay's `banned` reply carries no
  -- news, and there is no news taken from it to lose.
  if exists (select 1 from celestual_suppressions s where s.handle_hash = celestual_hash_handle(nh)) then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb, 'more', 0);
  end if;

  with pending as (
    select o.id, o.other_handle, o.has_card
      from celestual_dm_outbox o
     where o.handle in (select celestual_group(nh))
       and o.sent_at is null
     order by o.created_at asc
     limit v_lim
  ), taken as (
    -- `o.sent_at is null` is re-checked here, not just in `pending`: two
    -- messages arriving at once would both select the row, and the second
    -- update re-evaluates this clause against the row the first one committed.
    -- Nobody is told the same thing twice.
    update celestual_dm_outbox o
       set sent_at = now(), sent_via = 'reply'
      from pending p
     where o.id = p.id and o.sent_at is null
     returning o.other_handle, o.has_card, o.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'other', t.other_handle,
           'has_card', t.has_card) order by t.created_at), '[]'::jsonb)
    into v_rows
    from taken t;

  select count(*) into v_left
    from celestual_dm_outbox o
   where o.handle in (select celestual_group(nh))
     and o.sent_at is null;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb), 'more', v_left);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 7 · celestual_dm_due — the push (only where the window is open)
-- ──────────────────────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. The join to celestual_dm_contacts IS the compliance
-- check, and it is deliberately one hour tighter than Meta's 24: the timestamp
-- we hold is when ManyChat relayed the message, not when Meta received it, and
-- a queue drain that runs a minute late must not be what turns a legal reply
-- into a policy violation.
--
-- attempts < 5 stops a permanently unreachable contact from being retried
-- forever. It does NOT dead-letter the row: the reply path (celestual_dm_take)
-- ignores attempts entirely, so news that could never be pushed still reaches
-- the person the next time they message the account.
--
-- THIS IS A CLAIM, NOT A READ, and it has to be. A match inserts two rows, so a
-- Database Webhook on insert fires twice, and there is a cron sweeper besides —
-- concurrent drains are the normal case, not the edge case. Handing the same row
-- to two of them would put the same sentence in front of somebody twice, which
-- for this particular sentence is worse than being late. So the row is leased
-- as it is handed over:
--
--   • `skip locked` means a second drain does not even see a row the first one
--     is holding.
--   • `next_attempt_at <= now()` is repeated in the UPDATE, so if a second
--     drain gets there anyway it re-evaluates that clause against the row the
--     first one just committed, finds the lease in the future, and claims
--     nothing.
--   • the lease is five minutes. A drain that dies mid-send loses nothing; the
--     row simply comes back around.
--
-- `attempts` is counted HERE, at the claim, rather than at the failure — an
-- attempt that vanished with a crashed function is still an attempt, and the
-- point of the counter is to stop trying eventually.
create or replace function celestual_dm_due(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_rows jsonb;
  c_window constant interval := interval '23 hours';
  c_lease  constant interval := interval '5 minutes';
begin
  with due as (
    select o.id, c.subscriber_id
      from celestual_dm_outbox o
      join celestual_dm_contacts c on c.handle = o.handle
     where o.sent_at is null
       and o.attempts < 5
       and o.next_attempt_at <= now()
       and c.subscriber_id is not null
       and c.channel = 'manychat'
       and c.last_inbound_at > now() - c_window
     order by o.created_at
     limit v_lim
     for update of o skip locked
  ), claimed as (
    update celestual_dm_outbox o
       set attempts = o.attempts + 1,
           next_attempt_at = now() + c_lease
      from due d
     where o.id = d.id
       and o.sent_at is null
       and o.next_attempt_at <= now()
     returning o.id, o.handle, o.other_handle, o.has_card, o.created_at, d.subscriber_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', k.id,
           'subscriber_id', k.subscriber_id,
           'handle', k.handle,
           'other', k.other_handle,
           'has_card', k.has_card) order by k.created_at), '[]'::jsonb)
    into v_rows
    from claimed k;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 8 · The bookkeeping
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_dm_sent(p_id uuid, p_via text default 'push')
returns void
language sql security definer set search_path = public as $$
  update celestual_dm_outbox
     set sent_at = now(), sent_via = coalesce(nullif(btrim(coalesce(p_via, '')), ''), 'push')
   where id = p_id and sent_at is null;
$$;

-- Backoff on a failed push: ~2m, 10m, 1h, 6h, then stop pushing (the reply path
-- keeps the row alive). The count itself was already made at the claim, so this
-- only records what went wrong and replaces the five-minute lease with the
-- backoff proper — the drain is done with the row, so there is nothing left to
-- hold.
create or replace function celestual_dm_failed(p_id uuid, p_error text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_attempts int;
  c_backoff constant int[] := array[2, 10, 60, 360];
begin
  select attempts into v_attempts from celestual_dm_outbox where id = p_id;
  if v_attempts is null then return; end if;
  update celestual_dm_outbox
     set last_error = left(coalesce(p_error, ''), 500),
         next_attempt_at = now()
           + (c_backoff[least(greatest(v_attempts, 1), array_length(c_backoff, 1))] || ' minutes')::interval
   where id = p_id;
end;
$$;

-- Housekeeping, called by the drain. Delivered news is kept a month for the
-- logs; news nobody ever came back for is kept four months and then let go,
-- the same way an unanswered ping is.
create or replace function celestual_dm_prune()
returns void
language sql security definer set search_path = public as $$
  delete from celestual_dm_outbox
   where (sent_at is not null and sent_at < now() - interval '30 days')
      or (sent_at is null and created_at < now() - interval '120 days');
  delete from celestual_dm_contacts
   where last_inbound_at < now() - interval '400 days';
$$;

-- Erasure. Called by celestual_erase_account and celestual_suppress below.
create or replace function celestual_dm_forget(p_handle text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  delete from celestual_dm_outbox where handle = nh or other_handle = nh;
  delete from celestual_dm_contacts where handle = nh;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 9 · celestual_submit (0023 revision)
-- ──────────────────────────────────────────────────────────────────────
-- 0022's body, decision for decision: the proof gate, the hashed target, the
-- suppression check, the per-person cap and window, the three rate limits, the
-- cadence cap, the group-aware reciprocal, the card going in and the
-- counterpart's coming back. Two things are new, and both live inside the
-- `v_match_id is not null` guard that has always made the notification fire
-- exactly once per pair, ever:
--
--   • BOTH people are queued a DM (celestual_dm_queue).
--   • BOTH people are queued an email, where before only the earlier entrant
--     was. The exfil rule that made it one-sided is intact, because it was
--     never "distrust p_email" — it was "no request may name where SOMEBODY
--     ELSE'S reveal is sent". So: the earlier entrant's address is the one on
--     their own ping row, falling back to the recovery address they bound under
--     a live DM proof (0013), which is what now reaches people who placed a
--     ping without leaving an email. Nothing from this request can be
--     substituted for it. The triggering side's is their own bound recovery
--     address, falling back to the one they just put on their own row — their
--     address, their ping, and a reveal this same call already handed back to
--     them in `match_card`.
create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_card jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  nh text;                                   -- hash of the target
  nc jsonb;                                  -- validated card
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_placed30 int;
  v_existing_id uuid;
  v_standing int;
  reciprocal_from   text;
  reciprocal_email  text;
  reciprocal_card   jsonb;
  reciprocal_id     uuid;
  reciprocal_tohash text;
  v_counterpart text;                        -- which of MY handles they entered
  v_match_id uuid;
  v_mutual boolean := false;
  v_cap int;
  v_expires timestamptz;
  v_my_card jsonb;                           -- the card THEY will find waiting
  v_my_email text;                           -- my bound recovery address, if any
  v_their_email text;                        -- theirs: their ping's, else bound
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
  nc := celestual_card_clean(p_card);

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

  -- Re-placing an existing pair? Free — it just refreshes email/card and
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
  -- owner's own cross-device restore (see 0010 §2), and the card for the
  -- reveal that only ever happens if both sides exist.
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, card, expires_at)
  values (nf, nh, nt, ne, nc, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        card       = coalesce(excluded.card, celestual_entries.card),
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_entries.matched_at is null then excluded.expires_at
                          else celestual_entries.expires_at end,
        renew_notified_at = null;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── GROUP-AWARE RECIPROCAL, BY HASH ─────────────────────────────────
  select e.id, e.from_handle, e.from_email, e.card, e.to_hash
    into reciprocal_id, reciprocal_from, reciprocal_email, reciprocal_card, reciprocal_tohash
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
      -- The card the OTHER person will find waiting is the one now standing on
      -- my row — which is `nc` when this request carried one, and whatever was
      -- already there when it didn't (re-placing never blanks a poster).
      select e.card into v_my_card
        from celestual_entries e
       where e.from_handle = nf and e.to_hash = nh;

      -- Addresses. Only ever one a person stored themselves.
      --
      -- Mine: the address I bound under a live DM proof (0013), falling back to
      -- the one on this request — which is mine, on my own row, and carries a
      -- reveal this very call already returned to me in `match_card`. That is
      -- the whole of why the fallback is allowed here and nowhere else: the
      -- rule was never "distrust p_email", it was "never let one request name
      -- where SOMEBODY ELSE'S reveal gets sent", and that rule is untouched
      -- below.
      select r.email into v_my_email from celestual_recovery r where r.handle = nf;
      v_my_email := coalesce(v_my_email, ne);
      v_their_email := coalesce(
        reciprocal_email,
        (select r.email from celestual_recovery r where r.handle = reciprocal_from));

      -- The mail says a match happened and nothing about what either card
      -- says; the words are read in the product, by the person they were
      -- written to, once.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_their_email, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null, now()
       where v_their_email is not null;

      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, has_card, next_attempt_at)
      select v_match_id, v_my_email, nf, nt, reciprocal_card is not null, now()
       where v_my_email is not null;

      -- And the Instagram half, for both. Queued, never pushed from here:
      -- whether it can be delivered now or has to wait for their next message
      -- is decided by celestual_dm_due / celestual_dm_take, not by us.
      perform celestual_dm_queue(v_match_id, reciprocal_from, coalesce(v_counterpart, nf), v_my_card is not null);
      perform celestual_dm_queue(v_match_id, nf, nt, reciprocal_card is not null);
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
    -- their half, and this is the instant it becomes readable. Both rows were
    -- matched two statements ago, so both sides now get the same answer at the
    -- same moment: whichever of them asks next, neither moved second.
    'match_card', case when v_mutual then reciprocal_card else null end,
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', v_cap)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 10 · Erasure reaches the new tables
-- ──────────────────────────────────────────────────────────────────────
-- The 0021 bodies, restated with one added line each. A person who erases
-- themselves, or asks never to be entered, loses their queued news and the
-- contact row that could reach them — on both sides of the pair.
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

  perform celestual_dm_forget(nh);
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
  perform celestual_dm_forget(nh);
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

-- The desk's own delete (0017), same one added line. It never called
-- celestual_erase_account — it has its own list — so it needs telling about the
-- new tables directly. The outbox would have gone anyway when the matches did
-- (it cascades off celestual_matches); the contact row would not have, and a
-- handle ⇄ Instagram contact id is exactly the kind of thing an erasure is
-- supposed to take with it.
create or replace function celestual_admin_delete_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_code text;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  hh := celestual_hash_handle(nh);

  perform celestual_dm_forget(nh);
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
  select code into v_code from celestual_recruits where handle = nh;
  if v_code is not null then
    delete from celestual_recruit_visits where code = v_code;
    delete from celestual_recruit_signups where code = v_code;
  end if;
  delete from celestual_recruit_signups where handle = nh;
  delete from celestual_recruits where handle = nh;
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;

  return jsonb_build_object('ok', true, 'handle', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 11 · GRANTS
-- ──────────────────────────────────────────────────────────────────────
-- Nothing new is client-callable. The relay and the drain hold the service-role
-- key; the browser has no business anywhere near a queue that decides whose
-- phone lights up.
revoke execute on function celestual_dm_enabled()                       from anon, authenticated, public;
revoke execute on function celestual_dm_queue(uuid, text, text, boolean) from anon, authenticated, public;
revoke execute on function celestual_dm_forget(text)                    from anon, authenticated, public;

revoke execute on function celestual_dm_touch(text, text, text)         from anon, authenticated, public;
revoke execute on function celestual_dm_take(text, int)                 from anon, authenticated, public;
revoke execute on function celestual_dm_due(int)                        from anon, authenticated, public;
revoke execute on function celestual_dm_sent(uuid, text)                from anon, authenticated, public;
revoke execute on function celestual_dm_failed(uuid, text)              from anon, authenticated, public;
revoke execute on function celestual_dm_prune()                         from anon, authenticated, public;

grant execute on function celestual_dm_touch(text, text, text)          to service_role;
grant execute on function celestual_dm_take(text, int)                  to service_role;
grant execute on function celestual_dm_due(int)                         to service_role;
grant execute on function celestual_dm_sent(uuid, text)                 to service_role;
grant execute on function celestual_dm_failed(uuid, text)               to service_role;
grant execute on function celestual_dm_prune()                          to service_role;

-- Restated so a fresh database is correct in one pass.
grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function celestual_erase_account(text)                   to anon, authenticated;
grant execute on function celestual_suppress(text)                        to anon, authenticated;
revoke all on function celestual_admin_delete_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_delete_user(text) to service_role;

-- ──────────────────────────────────────────────────────────────────────
-- OPERATOR NOTES
--   • Turn the DM off without a deploy:
--       update celestual_settings set value='false' where key='mutual_dm_enabled';
--   • What is waiting to be told, and by which route it will go:
--       select o.handle, o.other_handle, o.has_card, o.attempts, o.sent_via,
--              (c.last_inbound_at > now() - interval '23 hours') as window_open
--         from celestual_dm_outbox o
--         left join celestual_dm_contacts c on c.handle = o.handle
--        where o.sent_at is null
--        order by o.created_at desc;
--   • There is deliberately NO backfill of celestual_dm_contacts from the old
--     verification rows. Their igsid is sometimes ManyChat's contact id and
--     sometimes Meta's own sender id, and every one of those timestamps is long
--     outside the 24-hour window, so a backfill would buy exactly nothing and
--     cost a queue of failing pushes. Contacts fill themselves in from the next
--     message each person sends, and the reply path works for everybody from
--     the moment this migration lands.
-- ──────────────────────────────────────────────────────────────────────

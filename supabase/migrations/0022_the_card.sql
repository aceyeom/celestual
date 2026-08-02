-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0022 · THE CARD                                                     ║
-- ║  A ping stops being a handle and becomes a poster.                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- WHAT THIS IS
--
-- Until now a ping carried one optional signal: an `intent`, chosen from a
-- fixed list of sixteen lines under a category (crush / ex / friend /
-- complicated). That list is gone. In its place every ping carries a CARD the
-- person composed: a short message set on a ground, in one of the product's
-- three faces, with the text block placed where they left it, and one measured
-- number saying what light the card burns with (docs/STAR-CARDS.md).
--
-- The whole of it is six fields, and they are the poster:
--
--     words   the message. Twenty words, hard.
--     bg      which of five dark plates the ground is
--     face    serif · sans · mono
--     x, y    where the text block sits inside the disc, 0..1
--     tone    0 = rose, 1 = amber. Measured off the photograph, or the plate's
--
-- THE PHOTOGRAPH IS NOT HERE, and there is no column waiting for it. A card's
-- picture is treated, stripped of EXIF and stored in IndexedDB on the device
-- that took it (app/src/card/photos.js). No code path in this repo uploads one.
-- At a mutual you are shown the other person's WORDS, on their ground, in their
-- light. You are not shown their room. This is the one guarantee in the product
-- that is still a fact about the network rather than a promise about a policy,
-- and it is worth what it costs.
--
-- THE SEAL
--
-- The card is exactly as sealed as the ping. `celestual_entries` already has RLS
-- on with zero client read policies — every read goes through a SECURITY DEFINER
-- RPC — so adding a column adds no reader. The single function that can return a
-- card belonging to somebody else is celestual_counterpart_card, and it will
-- only ever return one off a row whose `matched_at` is set. There is no argument
-- to it, and no shape of call to anything else, that returns the words on an
-- unanswered ping. Below a mutual, a card is as unreadable as the hash of the
-- handle it was addressed to.
--
-- WHAT CHANGES
--
--   celestual_entries        + card jsonb                (the poster)
--   celestual_card_clean     new · the validator. Everything a browser sends is
--                            re-clamped here: twenty words, a known plate, a
--                            known face, a position inside the disc, a tone in
--                            range. A client is a suggestion.
--   celestual_counterpart_card  new · the only door to somebody else's card, and
--                            it is a locked one: matched rows only.
--   celestual_submit         + p_card, and `match_card` in the answer. The
--                            5-argument form is DROPPED rather than kept
--                            alongside: PostgREST resolves overloads by argument
--                            name, and two candidates both satisfying a 5-name
--                            call is an ambiguity error. A browser still running
--                            yesterday's bundle calls this one and its card is
--                            simply null, which is a ping with no poster.
--   celestual_ping_status    + card / their_card
--   celestual_my_pings       + card / their_card
--
-- `intent` is left in place, unread and unwritten. Dropping the column would
-- destroy the only record of what the people who placed a ping before today
-- chose to say, and it costs nothing to keep. Nothing returns it any more.
--
-- The sixty-day purge, the erase, the opt-out and the suppression all work on
-- whole rows, so a card is deleted by every path that already deletes a ping.
-- Nothing in this migration needs a new cleanup.

-- ──────────────────────────────────────────────────────────────────────
-- 1 · THE COLUMN
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists card jsonb;

comment on column celestual_entries.card is
  'The poster this ping carries: {words,bg,face,x,y,tone}. Written only through '
  'celestual_card_clean. Readable by its author, and by the other person ONLY '
  'once matched_at is set (celestual_counterpart_card). No photograph is ever '
  'stored here or anywhere else on the server.';

-- ──────────────────────────────────────────────────────────────────────
-- 2 · THE VALIDATOR
-- ──────────────────────────────────────────────────────────────────────
-- Everything the browser sends is rebuilt here from scratch rather than checked
-- and passed through, so an unknown key cannot ride along inside the jsonb and
-- come back out at a reveal. The output of this function is the only shape the
-- column ever holds.
--
-- Numbers are matched against a regex BEFORE being cast. A cast of a hostile
-- string raises, and an exception block inside the write path of a ping is a
-- worse outcome than a card that lands in the middle of the disc.
create or replace function celestual_card_clean(p jsonb)
returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  v_words text;
  v_list  text[];
  v_bg    text;
  v_face  text;
  v_x     numeric;
  v_y     numeric;
  v_tone  numeric;
  c_num constant text := '^-?[0-9]+(\.[0-9]+)?$';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;

  -- The words are the card. Without them there is nothing to seal.
  v_words := btrim(regexp_replace(coalesce(p->>'words', ''), '\s+', ' ', 'g'));
  if v_words = '' then return null; end if;

  -- Twenty words, hard (card/model.js MAX_WORDS). Not a character count: a
  -- character count teaches people to write shorter sentences, a word count
  -- teaches them to write one true thing. The 400-character ceiling under it is
  -- only so that one "word" cannot be a novel.
  v_list := regexp_split_to_array(v_words, ' ');
  if array_length(v_list, 1) > 20 then
    v_words := array_to_string(v_list[1:20], ' ');
  end if;
  v_words := left(v_words, 400);

  v_bg := lower(coalesce(p->>'bg', 'ink'));
  if v_bg not in ('ink', 'violet', 'ember', 'rose', 'blue') then v_bg := 'ink'; end if;

  v_face := lower(coalesce(p->>'face', 'serif'));
  if v_face not in ('serif', 'sans', 'mono') then v_face := 'serif'; end if;

  v_x := case when p->>'x' ~ c_num then least(1, greatest(0, (p->>'x')::numeric)) else 0.5 end;
  v_y := case when p->>'y' ~ c_num then least(1, greatest(0, (p->>'y')::numeric)) else 0.5 end;
  v_tone := case when p->>'tone' ~ c_num then least(1, greatest(0, (p->>'tone')::numeric)) else 1 end;

  return jsonb_build_object(
    'words', v_words,
    'bg', v_bg,
    'face', v_face,
    'x', round(v_x, 4),
    'y', round(v_y, 4),
    'tone', round(v_tone, 4));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3 · THE ONLY DOOR TO SOMEBODY ELSE'S CARD
-- ──────────────────────────────────────────────────────────────────────
-- Group-aware on both sides, the same way the reciprocal lookup in
-- celestual_submit is: any of my linked @s being entered by any of theirs is
-- the same mutual.
--
-- The `matched_at is not null` clause is the seal. It is a WHERE on the row
-- being read, not a check on the caller's row, because those two facts are set
-- in the same statement and reading the one that actually holds the words is
-- the check that cannot be got around.
--
-- NOT granted to anon or authenticated. It is called from inside the RPCs that
-- have already spent a DM proof; there is no reason for it to have a door of
-- its own.
create or replace function celestual_counterpart_card(p_me text, p_them text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_card jsonb;
begin
  if nf is null or nt is null then return null; end if;
  select e.card into v_card
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and e.matched_at is not null
   order by e.created_at asc
   limit 1;
  return v_card;
end;
$$;

revoke all on function celestual_counterpart_card(text, text) from public, anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 4 · celestual_submit (0022 revision)
-- ──────────────────────────────────────────────────────────────────────
-- The 0021 body, unchanged in every part that decides anything: the proof gate,
-- the hashed target, the suppression check, the per-person cap and window, the
-- three rate limits, the cadence cap, the group-aware reciprocal, the exfil-safe
-- notification. What is new is the card going in, and the counterpart's card
-- coming back on a mutual.
--
-- Re-placing an existing pair overwrites the card, deliberately: re-placing IS
-- still feeling it, and the message a person means today is the one that should
-- be waiting. A card is never overwritten with nothing, so a client that has
-- forgotten how to compose one cannot blank a poster that is already standing.
drop function if exists celestual_submit(text, text, text, text, text);

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
      -- Exfil-safe: email ONLY the earlier entrant, at the address THEY stored —
      -- never the address on this triggering request. The mail says a match
      -- happened and nothing about what either card says; the words are read in
      -- the product, by the person they were written to, once.
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

grant execute on function celestual_submit(text, text, text, text, jsonb) to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 5 · celestual_ping_status (0022 revision)
-- ──────────────────────────────────────────────────────────────────────
-- The status page's read. Same proof gate, same ten-row bound; it now also
-- hands back this device's own card (so a card survives a cleared browser) and,
-- on a matched row only, theirs.
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
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
    end if;
  end if;
  v_to := p_to[1:10];   -- two slots; ten bounds even a hoarded local list

  foreach t in array v_to loop
    continue when celestual_norm(t) is null;
    select e2.id, e2.created_at, e2.expires_at, e2.matched_at, e2.card
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
        'card', e.card,
        -- the seal, again: null unless this row is already answered
        'their_card', case when e.matched_at is not null
                           then celestual_counterpart_card(nf, t) end,
        'reachable', e.matched_at is not null or celestual_is_member(t));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;

grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 6 · celestual_my_pings (0022 revision)
-- ──────────────────────────────────────────────────────────────────────
-- The cross-device restore. A ping restored onto a new phone now comes back
-- with the poster it was placed with, minus its photograph — that stayed on the
-- phone that took it, and the card stands on its plate instead, which is the
-- same thing that happens when someone chooses not to add one.
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

  select coalesce(jsonb_agg(jsonb_build_object(
           'handle', coalesce(e.matched_handle, e.to_handle),
           'time',   (extract(epoch from e.created_at) * 1000)::bigint,
           'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', e.matched_at is not null,
           'card', e.card,
           'their_card', case when e.matched_at is not null
                              then celestual_counterpart_card(nh, coalesce(e.matched_handle, e.to_handle)) end
         ) order by e.created_at), '[]'::jsonb)
    into v_pings
    from celestual_entries e
   where e.from_handle in (select celestual_group(nh))
     and (e.matched_at is not null or e.expires_at > now());

  return jsonb_build_object('ok', true, 'pings', v_pings);
end;
$$;

grant execute on function celestual_my_pings(text, text) to anon, authenticated;

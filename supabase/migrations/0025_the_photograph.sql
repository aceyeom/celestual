-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0025 · THE PHOTOGRAPH                                               ║
-- ║  The other half of the card travels, on the card's own seal.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- WHAT THIS CHANGES, AND WHY IT IS A DECISION AND NOT A DRIFT
--
-- 0022 split a card in two. The WORDS rode on the ping row, sealed, released
-- only to the counterpart of a row that was already matched. The PHOTOGRAPH did
-- not travel at all: it was treated, stripped of EXIF, and left in IndexedDB on
-- the phone that took it, and 0022's header says out loud that there is no
-- column waiting for it.
--
-- That was a real guarantee and it had a real cost, and the cost turned out to
-- be the product: a person composes a card on a photograph of where they are,
-- places it, matches — and the other half of the pair is shown words on a bare
-- plate. The half of the card the composer spent the most care on is the half
-- nobody was ever going to see, and on a new device it was not even theirs any
-- more. "It never left your phone" and "it was never saved" are the same
-- sentence from two sides, and the second one is what people actually met.
--
-- So the photograph now rides the row, on the same seal the words ride:
--
--   · It is stored on the ping row it belongs to, as base64 of the TREATED
--     JPEG the browser already makes (card/photo.js — square, resampled,
--     re-encoded through a canvas, which is what drops every EXIF block, so
--     no GPS, no capture time and no device serial ever reaches this column).
--   · celestual_entries has RLS on with zero client read policies. Every read
--     is a SECURITY DEFINER RPC, so a column adds no reader.
--   · The ONLY door to somebody else's photograph is
--     celestual_counterpart_photo, and it carries the same `matched_at is not
--     null` WHERE clause that celestual_counterpart_card has carried since
--     0022. Below a mutual a photograph is exactly as unreadable as the words
--     beside it and as the hash of the handle they were addressed to.
--   · Every path that deletes a ping deletes its photograph with it, because it
--     is a column on the ping: the sixty-day purge, "let one go", the erase, the
--     opt-out and the suppression all work on whole rows and none of them needs
--     a line of new cleanup.
--
-- What is given up, precisely: the photograph used to be safe as a FACT about
-- the network (the bytes could not arrive anywhere because nothing sent them)
-- and is now safe as a POLICY the server keeps (the bytes are here, and one
-- WHERE clause decides who may read them). That is a weaker guarantee, it is
-- the same guarantee the words have had since 0022, and it is the one the
-- product needs in order to be the thing it says it is. docs/SECURITY.md and
-- docs/STAR-CARDS.md say so in the same words.
--
-- WHAT CHANGES
--
--   celestual_entries          + photo text            (base64, treated JPEG)
--   celestual_photo_clean      new · the validator: base64 alphabet only, a
--                              hard ceiling, and nothing else gets in.
--   celestual_card_photo_put   new · write (or clear) the photograph on YOUR
--                              ping row. Proof-gated, like everything the owner
--                              does. It is a second call rather than an
--                              argument to celestual_submit deliberately: a
--                              third of a megabyte has no business inside the
--                              statement that decides a mutual, and a photo
--                              that fails to land must never cost somebody
--                              their ping.
--   celestual_counterpart_photo new · the only door to somebody else's, and it
--                              is locked the same way the card's is.
--   celestual_card_photo       new · the read. Yours whenever you ask; theirs
--                              only off a matched row.
--   celestual_counterpart_card + `photo`: a BOOLEAN saying one is waiting.
--   celestual_ping_status      + the same boolean on your own card
--   celestual_my_pings         + the same, both sides
--
-- The boolean is the whole reason the reads stay cheap: a ledger of two pings
-- draws four seals and must not pull a megabyte to do it. The bytes are fetched
-- once, by the one screen that is about to draw them, and cached on the device.
--
-- Re-runnable: every function is CREATE OR REPLACE, the column and the
-- constraint are IF NOT EXISTS. Nothing is dropped and no data is moved.

-- ──────────────────────────────────────────────────────────────────────
-- 1 · THE COLUMN
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists photo text;

comment on column celestual_entries.photo is
  'The card''s photograph: base64 of the treated, EXIF-stripped JPEG the browser '
  'makes (card/photo.js). Written only through celestual_card_photo_put. Readable '
  'by its author, and by the other person ONLY once matched_at is set '
  '(celestual_counterpart_photo). Deleted with the row by every purge, erase, '
  'opt-out and withdrawal that already deletes a ping.';

-- A ceiling in the schema as well as in the validator. 1.4 million base64
-- characters is a little over a megabyte of JPEG — several times what a treated
-- 1024px card actually weighs, and low enough that no single row can be used as
-- storage for something that is not a photograph.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'celestual_entries_photo_len'
       and conrelid = 'celestual_entries'::regclass
  ) then
    alter table celestual_entries
      add constraint celestual_entries_photo_len
      check (photo is null or length(photo) <= 1400000);
  end if;
end
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2 · THE VALIDATOR
-- ──────────────────────────────────────────────────────────────────────
-- The same posture celestual_card_clean takes: a client is a suggestion. What
-- arrives is checked against the base64 alphabet in full — one regex over the
-- whole string, not a sample — so nothing that is not base64 can be stored, and
-- therefore nothing stored can come back out of a reveal as anything but an
-- image the browser decodes or refuses.
--
-- It does NOT try to prove the bytes are a JPEG. That check belongs to the
-- decoder on the way out (an <img> that will not decode simply shows no
-- photograph, which is the same as not adding one), and a magic-number test
-- here would be a security theatre that a crafted file passes anyway.
create or replace function celestual_photo_clean(p text)
returns text
language plpgsql immutable set search_path = public as $$
declare
  v text;
begin
  if p is null then return null; end if;
  -- strip anything a data: URI would have carried in front of the payload, plus
  -- the line breaks some encoders insert; both are ordinary and neither is data
  v := regexp_replace(p, '^data:[^,]*,', '');
  v := regexp_replace(v, '\s', '', 'g');
  if v = '' then return null; end if;
  if length(v) > 1400000 then return null; end if;
  if v !~ '^[A-Za-z0-9+/]+={0,2}$' then return null; end if;
  -- base64 is four characters per three bytes; anything else is truncated or
  -- hand-made
  if length(v) % 4 <> 0 then return null; end if;
  return v;
end;
$$;

comment on function celestual_photo_clean(text) is
  'The photograph validator: base64 alphabet, correct padding, a 1.4M ceiling. '
  'Returns null for anything else, so a card simply stands on its own ground.';

-- ──────────────────────────────────────────────────────────────────────
-- 3 · WRITING ONE
-- ──────────────────────────────────────────────────────────────────────
-- Proof-gated exactly like placing. It writes onto a ping that already exists
-- and never creates one: the slot rule, the cadence cap and the suppression
-- check all live in celestual_submit, and a second door into celestual_entries
-- that skipped them would be a way to hold a slot without passing any of them.
--
-- Passing null CLEARS the photograph, and the client calls this on every place
-- — with the picture, or with null when there is not one. That is what keeps a
-- re-placed card honest: new words on a plate must not come back wearing the
-- photograph the last version of the card was written on.
create or replace function celestual_card_photo_put(
  p_from text, p_to text, p_proof text default null, p_photo text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  nh text;
  v_photo text;
  v_id uuid;
begin
  if nf is null or nt is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'error', 'unverified');
    end if;
  end if;

  nh := celestual_hash_handle(nt);
  v_photo := celestual_photo_clean(p_photo);

  update celestual_entries
     set photo = v_photo
   where from_handle = nf and to_hash = nh
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_ping');
  end if;
  return jsonb_build_object('ok', true, 'photo', v_photo is not null);
end;
$$;

grant execute on function celestual_card_photo_put(text, text, text, text) to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 4 · THE ONLY DOOR TO SOMEBODY ELSE'S
-- ──────────────────────────────────────────────────────────────────────
-- A line-for-line mirror of 0022's celestual_counterpart_card, including the
-- part that matters: `matched_at is not null` is a WHERE on the row being READ,
-- not a check on the caller's own row. Those two facts are set in the same
-- statement, and reading the one that actually holds the bytes is the check
-- that cannot be got around.
--
-- Group-aware on both sides, so any of my linked @s being entered by any of
-- theirs is the same mutual — the same rule the reciprocal lookup in
-- celestual_submit runs.
--
-- NOT granted to anon or authenticated: it is called from inside the RPC below,
-- which has already spent a proof.
create or replace function celestual_counterpart_photo(p_me text, p_them text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_photo text;
begin
  if nf is null or nt is null then return null; end if;
  select e.photo into v_photo
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and e.matched_at is not null
   order by e.created_at asc
   limit 1;
  return v_photo;
end;
$$;

revoke all on function celestual_counterpart_photo(text, text) from public, anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 5 · READING ONE
-- ──────────────────────────────────────────────────────────────────────
-- One call, two sides. `p_mine` true is your own photograph coming back to a
-- device that does not hold it (a new phone, a cleared browser) — the same
-- restore the words already get. `p_mine` false is theirs, and it can only ever
-- answer off a matched row.
--
-- It is deliberately NOT batched. A photograph is fetched by the one screen
-- about to draw it, one at a time, and a call that could return every
-- photograph a person holds in a single response is a call worth attacking.
create or replace function celestual_card_photo(
  p_me text, p_them text, p_proof text default null, p_mine boolean default true)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_photo text;
begin
  if nf is null or nt is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_handle');
  end if;
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'error', 'unverified');
    end if;
  end if;

  if coalesce(p_mine, true) then
    select e.photo into v_photo
      from celestual_entries e
     where e.from_handle in (select celestual_group(nf))
       and e.to_hash = celestual_hash_handle(nt)
     limit 1;
  else
    v_photo := celestual_counterpart_photo(nf, nt);
  end if;

  return jsonb_build_object('ok', true, 'photo', v_photo);
end;
$$;

grant execute on function celestual_card_photo(text, text, text, boolean) to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 6 · SAYING THAT ONE IS THERE
-- ──────────────────────────────────────────────────────────────────────
-- Every read that returns a card now says whether a photograph is waiting on
-- it, as a boolean on the card itself. Nothing else about the shape changes,
-- and the flag is computed rather than stored — celestual_card_clean still
-- rebuilds the poster from scratch and still has no idea a photograph exists,
-- which is what keeps the two halves independent.

-- 6a · the counterpart's card (0022 §3, with the flag)
create or replace function celestual_counterpart_card(p_me text, p_them text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_me);
  nt text := celestual_norm(p_them);
  v_card jsonb;
  v_has boolean := false;
begin
  if nf is null or nt is null then return null; end if;
  select e.card, e.photo is not null into v_card, v_has
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and e.matched_at is not null
   order by e.created_at asc
   limit 1;
  if v_card is null then return null; end if;
  return v_card || jsonb_build_object('photo', coalesce(v_has, false));
end;
$$;

revoke all on function celestual_counterpart_card(text, text) from public, anon, authenticated;

-- 6b · the status read (0022 §5, with the flag on your own card)
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
    select e2.id, e2.created_at, e2.expires_at, e2.matched_at, e2.card,
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
        'card', case when e.card is null then null
                     else e.card || jsonb_build_object('photo', e.has_photo) end,
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

-- 6c · the cross-device restore (0022 §6, with the flag on both halves)
-- A ping restored onto a new phone now comes back with the WHOLE card it was
-- placed with — the words, the ground, and the photograph it was written on.
-- That sentence is the change this migration exists to make.
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
           'card', case when e.card is null then null
                        else e.card || jsonb_build_object('photo', e.photo is not null) end,
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

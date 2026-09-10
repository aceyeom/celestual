-- ─────────────────────────────────────────────────────────────────────────────
-- 0047_the_five_cards.sql
--
-- Five printed cards, five codes, and one screen that says which of them
-- actually brought somebody in. Re-runnable: every statement is create if not
-- exists or create or replace.
--
--   1  wall_cards         the registry. One row per printed card
--   2  wall_card_events   what happened after the scan, per card
--   3  wall_card_step     the browser logs one step, once
--   4  celestual_desk_cards, celestual_desk_card_set   the desk's read and its
--                         one write
--
-- ── WHAT WAS ALREADY HERE, AND WHAT WAS MISSING ──────────────────────────────
-- 0032 built the attribution the wall has today and it is good as far as it
-- goes: `?s=<code>` on the address, one row in wall_scans, and the same code
-- copied onto any letter or waitlist row that session produces. The desk reads
-- it on the waiting screen as "which flyer": scans, and letters.
--
-- Two scans and one letter is not enough to choose between five pieces of
-- paper. The question a card is printed to answer is not how many people
-- pointed a phone at it. It is how many of them came through the door: read
-- something, gave an address, proved a handle, wrote, walked over to the rest
-- of the product. Everything between the scan and the letter was unrecorded,
-- which meant a card that put forty people on the wall and no letters up read
-- as worse than one nobody scanned.
--
-- So this migration adds the middle of the funnel, and nothing else. The scan
-- stays in wall_scans, the letters stay on wall_letters.source_code, the
-- waitlist row stays where it is. Nothing here is a second copy of a fact that
-- already has a home: wall_card_events holds the four steps that had none.
--
-- ── WHAT A CARD EVENT IS, AND WHAT IT IS NOT ─────────────────────────────────
-- A step is a fact about a piece of paper, exactly as a scan is. There is no
-- person in this table, no session, no device, no address, and nothing that
-- could be joined to one. It says "somebody who came in off card b opened a
-- letter", and it can never be made to say who.
--
-- That is also its limit and it is worth writing down: the browser is what
-- reports these, the browser is not trusted, and a person who wanted to could
-- report a hundred. They are attribution, in the same class as the scan, and
-- the letters and the waitlist rows underneath them are the facts that cannot
-- be inflated from a console. The desk shows both.
--
-- ── THE ROUTE ────────────────────────────────────────────────────────────────
-- The cards do not carry `?s=`. They carry `celestual.us/c/a`, a route the app
-- owns, which logs the scan and hands the visitor on to wherever that card is
-- pointed. `landing` here is what the desk reads; app/src/cards.js is what the
-- browser reads, and the two are kept the same by hand. The reason the route
-- exists at all is that paper cannot be redeployed: a card printed on Tuesday
-- can be pointed somewhere else on Friday.
--
-- The codes are one letter because the whole address is printed and a shorter
-- string is a smaller QR: sixteen characters fits the smallest symbol there is,
-- which means fatter modules and a scan that survives a worse phone at a worse
-- angle. What each letter means is the `label` beside it, which is a word the
-- desk can change; the letter is the part that cannot be changed, because it
-- has been printed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the registry ──────────────────────────────────────────────────────────
-- One row per printed surface. It exists so that a card with no scans on it is
-- still a row on the desk: five cards went out, and "card d has nothing against
-- it" is the single most useful thing this table can say. A funnel assembled
-- out of the scans alone can only ever show the cards that worked.
--
-- `label` and `place` are the two things a person at the desk needs and the
-- database cannot know: what is printed on this one, and where it went. Both
-- are set from the desk (celestual_desk_card_set), because a name that can only
-- be changed by writing a migration is a name that stays wrong.
create table if not exists wall_cards (
  code       text        primary key,
  label      text        not null,
  place      text,
  campus     text        not null references wall_campuses (slug),
  landing    text        not null default '/berkeley',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  -- The same shape wall_scans and wall_letters.source_code already enforce, so
  -- a code is one thing everywhere it is written down.
  constraint wall_cards_code_ck    check (code ~ '^[a-z0-9_-]{1,32}$'),
  constraint wall_cards_label_ck   check (char_length(label) between 1 and 80),
  constraint wall_cards_place_ck   check (place is null or char_length(place) <= 80),
  -- A path on this site, and only a path. A landing that could hold an absolute
  -- URL would make the desk a way to point a printed card at somebody else's
  -- server.
  constraint wall_cards_landing_ck check (landing ~ '^/[A-Za-z0-9/_-]{0,60}$')
);

-- ── the five ─────────────────────────────────────────────────────────────────
-- Named a through e because the codes went on the paper before anybody could
-- know which quote would work, and a code that describes the creative is a code
-- that is wrong the first time the creative changes. What each one says and
-- where it stands is the label and the place, and both are edited on the desk.
insert into wall_cards (code, label, place, campus, landing) values
  ('a', 'card a', null, 'berkeley', '/berkeley'),
  ('b', 'card b', null, 'berkeley', '/berkeley'),
  ('c', 'card c', null, 'berkeley', '/berkeley'),
  ('d', 'card d', null, 'berkeley', '/berkeley'),
  ('e', 'card e', null, 'berkeley', '/berkeley')
on conflict (code) do nothing;

-- ── 2. the steps ─────────────────────────────────────────────────────────────
-- Four, and deliberately only four. Each one is a thing a person DID that the
-- scan cannot be read as, and each one is the next place somebody falls out:
--
--   read     a letter was opened. The wall was worth four seconds
--   gate     an address was given and a code asked for. Intent, before proof
--   joined   a proof landed: the campus address, or the handle through the DM.
--            This is onboarding. Everything else on this list is on the way to
--            it or after it
--   handoff  the door into the rest of the product was taken
--
-- Writing and the waitlist are not on the list because they are already rows
-- with the code on them (wall_letters, wall_waitlist), and a second count of a
-- fact is a count that can disagree with it.
create table if not exists wall_card_events (
  id         bigserial   primary key,
  code       text        not null references wall_cards (code) on delete cascade,
  step       text        not null,
  campus     text        not null references wall_campuses (slug),
  created_at timestamptz not null default now(),
  constraint wall_card_events_step_ck check (step in ('read', 'gate', 'joined', 'handoff'))
);
create index if not exists wall_card_events_idx on wall_card_events (code, step, created_at);

-- ── and the codes this file used to seed ─────────────────────────────────────
-- An earlier draft of this migration seeded `card-a` through `card-e`, and the
-- codes went to one letter before anything was printed. A database that took
-- the first draft would otherwise carry ten rows and show five empty cards on
-- the desk for good.
--
-- Only ever a row nothing has happened to. A code that has been scanned once is
-- a code that is out in the world on a piece of paper, whatever this file now
-- says, and deleting it would take its scans with it.
delete from wall_cards c
 where c.code in ('card-a', 'card-b', 'card-c', 'card-d', 'card-e')
   and not exists (select 1 from wall_card_events e where e.code = c.code)
   and not exists (select 1 from wall_scans s where s.source_code = c.code);

-- Deny by default, like every other table on the wall. Both of these are
-- reached through the SECURITY DEFINER functions below and through nothing
-- else, and the registry in particular is not public: which cards exist and
-- where they are standing is ours.
alter table wall_cards        enable row level security;
alter table wall_card_events  enable row level security;
revoke all on wall_cards        from anon, authenticated;
revoke all on wall_card_events  from anon, authenticated;

-- ── 3. wall_card_step(code, step, campus) ────────────────────────────────────
-- One step, from the browser, with no session and nothing about a person in it.
--
-- A code that is not one of ours is answered ok and written nowhere. It is not
-- an error worth telling a browser about: the only thing a caller learns from
-- the difference is which codes exist, and the only thing the app would do with
-- the answer is nothing. The client dedupes a step to once per device, so the
-- counts read as people rather than as taps.
create or replace function wall_card_step(p_code text, p_step text, p_campus text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c text := lower(nullif(left(btrim(coalesce(p_code, '')), 32), ''));
  s text := lower(nullif(left(btrim(coalesce(p_step, '')), 16), ''));
begin
  if c is null or c !~ '^[a-z0-9_-]{1,32}$' then
    return jsonb_build_object('ok', false, 'error', 'code');
  end if;
  if s is null or s not in ('read', 'gate', 'joined', 'handoff') then
    return jsonb_build_object('ok', false, 'error', 'step');
  end if;
  if not exists (select 1 from wall_campuses where slug = p_campus) then
    return jsonb_build_object('ok', false, 'error', 'campus');
  end if;
  if not exists (select 1 from wall_cards where code = c) then
    return jsonb_build_object('ok', true, 'logged', false);
  end if;
  insert into wall_card_events (code, step, campus) values (c, s, p_campus);
  return jsonb_build_object('ok', true, 'logged', true);
end;
$$;

revoke all on function wall_card_step(text, text, text) from public;
grant execute on function wall_card_step(text, text, text) to anon, authenticated;

-- ── 4. celestual_desk_cards() ────────────────────────────────────────────────
-- The whole funnel, one row per card, best first. service_role only like every
-- other desk read.
--
-- "Best" is `joined`: proofs that landed, out of scans. Not scans, which is a
-- measure of how many people walked past the wall the card is taped to, and not
-- letters, which are three days of a person's own nerve after the scan. The
-- order is set here rather than in the screen so that the answer to "which card
-- won" is the same in the desk, in a SQL console and in a screenshot of either.
--
-- Every count is a left join off the registry, so a card nobody has scanned is
-- a row of zeros rather than an absence.
create or replace function celestual_desk_cards()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_rows jsonb;
begin
  select coalesce(jsonb_agg(x order by x.joined desc, x.scans desc, x.code), '[]'::jsonb)
    into v_rows
  from (
    select c.code,
           c.label,
           c.place,
           c.campus,
           c.landing,
           c.is_active,
           coalesce(s.n, 0)                                   as scans,
           s.first_at,
           s.last_at,
           coalesce(e.read, 0)                                as read,
           coalesce(e.gate, 0)                                as gate,
           coalesce(e.joined, 0)                              as joined,
           coalesce(e.handoff, 0)                             as handoff,
           coalesce(l.n, 0)                                   as letters,
           coalesce(l.live, 0)                                as letters_live,
           coalesce(w.n, 0)                                   as waiting
      from wall_cards c
      left join (
        select source_code,
               count(*)::int     as n,
               min(created_at)   as first_at,
               max(created_at)   as last_at
          from wall_scans group by source_code
      ) s on s.source_code = c.code
      left join (
        select code,
               count(*) filter (where step = 'read')::int    as read,
               count(*) filter (where step = 'gate')::int    as gate,
               count(*) filter (where step = 'joined')::int  as joined,
               count(*) filter (where step = 'handoff')::int as handoff
          from wall_card_events group by code
      ) e on e.code = c.code
      left join (
        select source_code,
               count(*)::int                                  as n,
               count(*) filter (where status = 'live')::int    as live
          from wall_letters where source_code is not null group by source_code
      ) l on l.source_code = c.code
      left join (
        select source_code, count(*)::int as n
          from wall_waitlist where source_code is not null group by source_code
      ) w on w.source_code = c.code
  ) x;

  return jsonb_build_object(
    'ok', true,
    'now', now(),
    'rows', v_rows,
    'totals', jsonb_build_object(
      'cards',    (select count(*)::int from wall_cards),
      'scans',    (select count(*)::int from wall_scans
                    where source_code in (select code from wall_cards)),
      'joined',   (select count(*)::int from wall_card_events where step = 'joined'),
      'letters',  (select count(*)::int from wall_letters
                    where source_code in (select code from wall_cards)),
      -- Every scan of something that is not one of the five. The old flyer
      -- codes are still live and still land in wall_scans, and a totals block
      -- that ignored them would make the five cards look like the whole
      -- campaign.
      'other_scans', (select count(*)::int from wall_scans
                       where source_code not in (select code from wall_cards))
    )
  );
end;
$$;

-- ── the one write ────────────────────────────────────────────────────────────
-- What a card says, where it stands, and whether it is still out. The code, the
-- campus and the landing are not editable from here on purpose: the code is
-- printed on paper, and the landing is read by the browser out of
-- app/src/cards.js, so a desk that could change it would move the row and not
-- the card.
create or replace function celestual_desk_card_set(
  p_code text, p_label text default null, p_place text default null, p_active boolean default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code  text := lower(btrim(coalesce(p_code, '')));
  v_label text := nullif(btrim(coalesce(p_label, '')), '');
  v_place text := btrim(coalesce(p_place, ''));
  v_c     wall_cards;
begin
  if v_code = '' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  update wall_cards
     set label     = coalesce(left(v_label, 80), label),
         -- An empty string is how the desk clears a place. A null is how it
         -- says it is not changing one, and the two cannot be the same value.
         place     = case when p_place is null then place
                          when v_place = '' then null
                          else left(v_place, 80) end,
         is_active = coalesce(p_active, is_active)
   where code = v_code
  returning * into v_c;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'code', v_c.code, 'label', v_c.label,
                            'place', v_c.place, 'is_active', v_c.is_active);
end;
$$;

revoke all on function celestual_desk_cards()                         from public, anon, authenticated;
revoke all on function celestual_desk_card_set(text, text, text, boolean) from public, anon, authenticated;
grant execute on function celestual_desk_cards()                          to service_role;
grant execute on function celestual_desk_card_set(text, text, text, boolean) to service_role;

comment on table wall_cards is
  'One row per printed card. The registry exists so a card with no scans is still a row on the desk.';
comment on table wall_card_events is
  'The four steps between a scan and a letter, per card. No person, no session, no device: a fact about a piece of paper.';
comment on function wall_card_step(text, text, text) is
  'Browser-reported attribution. Trusted like the scan is trusted, which is to say not much: the letters underneath it are the facts.';

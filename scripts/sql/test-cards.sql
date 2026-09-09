-- ─────────────────────────────────────────────────────────────────────────────
-- test-cards.sql: exercises 0047_the_five_cards.sql.
--
-- Run through scripts/verify-migrations.sh --test. One transaction that never
-- commits, so the five cards go back to zero scans before the next file looks.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function cd_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- ── 1. the registry ─────────────────────────────────────────────────────────
select cd_ok('five cards are seeded', (select count(*) from wall_cards) = 5);
select cd_ok('every card is on the open campus and points at the wall',
  (select bool_and(campus = 'berkeley' and landing = '/berkeley' and is_active) from wall_cards));
select cd_ok('the codes are a through e',
  (select array_agg(code order by code) from wall_cards)
    = array['card-a', 'card-b', 'card-c', 'card-d', 'card-e']);

-- A landing may not leave the site: the desk is not a way to point printed
-- paper at somebody else's server.
do $$
begin
  begin
    insert into wall_cards (code, label, campus, landing)
    values ('card-x', 'x', 'berkeley', 'https://elsewhere.example/x');
    raise exception 'FAIL  an absolute landing was accepted';
  exception when check_violation then
    raise notice 'PASS  an absolute landing is refused';
  end;
end $$;

-- ── 2. the steps ────────────────────────────────────────────────────────────
select cd_ok('a step lands',
  (wall_card_step('card-a', 'joined', 'berkeley')->>'logged')::boolean);
select cd_ok('a step under an unknown code is answered ok and written nowhere',
  (wall_card_step('no-such-card', 'joined', 'berkeley')->>'ok')::boolean
    and not (wall_card_step('no-such-card', 'joined', 'berkeley')->>'logged')::boolean);
select cd_ok('an invented step is refused',
  (wall_card_step('card-a', 'converted', 'berkeley')->>'error') = 'step');
select cd_ok('a step on a campus that does not exist is refused',
  (wall_card_step('card-a', 'read', 'stanford')->>'error') = 'campus');
select cd_ok('an empty code is refused',
  (wall_card_step('', 'read', 'berkeley')->>'error') = 'code');
select cd_ok('the code is taken case blind',
  (wall_card_step('CARD-A', 'read', 'berkeley')->>'logged')::boolean);
select cd_ok('nothing invented was written',
  (select count(*) from wall_card_events where code not in (select code from wall_cards)) = 0);

-- ── 3. the funnel ───────────────────────────────────────────────────────────
-- card-b: scanned twice, one letter, one name looked for and not found, and
-- nobody through the door. card-a: two steps above, one of them a proof.
insert into wall_scans (source_code, campus) values
  ('card-a', 'berkeley'), ('card-b', 'berkeley'), ('card-b', 'berkeley'),
  ('flyer-a', 'berkeley');

do $$
declare u uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('cards.writer@berkeley.edu', now()) returning id into u;
  insert into wall_letters (target_handle, body, author_id, campus, source_code, status)
    values ('someone.oncard', 'forty words, or fewer.', u, 'berkeley', 'card-b', 'live');
end $$;

insert into wall_waitlist (handle, campus, source_code)
values ('nobody.wrote.yet', 'berkeley', 'card-b') on conflict do nothing;

select cd_ok('every card is a row, scanned or not',
  jsonb_array_length(celestual_desk_cards()->'rows') = 5);

select cd_ok('the card with a proof against it is first',
  (celestual_desk_cards()#>>'{rows,0,code}') = 'card-a');

select cd_ok('the scans, the steps, the letter and the waitlist row all land on the right card',
  (select r->>'scans' = '2' and r->>'letters' = '1' and r->>'letters_live' = '1'
      and r->>'waiting' = '1' and r->>'joined' = '0'
     from jsonb_array_elements(celestual_desk_cards()->'rows') r
    where r->>'code' = 'card-b'));

select cd_ok('card a carries its two steps',
  (select r->>'joined' = '1' and r->>'read' = '1'
     from jsonb_array_elements(celestual_desk_cards()->'rows') r
    where r->>'code' = 'card-a'));

select cd_ok('a card nobody scanned is zeros rather than absent',
  (select r->>'scans' = '0' and r->>'joined' = '0' and r->>'letters' = '0'
     from jsonb_array_elements(celestual_desk_cards()->'rows') r
    where r->>'code' = 'card-e'));

select cd_ok('the flyer that is not a card is counted apart',
  (celestual_desk_cards()#>>'{totals,other_scans}') = '1'
    and (celestual_desk_cards()#>>'{totals,scans}') = '3');

-- ── 4. the desk's one write ─────────────────────────────────────────────────
select cd_ok('a card can be named and placed',
  (celestual_desk_card_set('card-c', 'the quiet one', 'moffitt, 4th floor')->>'ok')::boolean);
select cd_ok('the name and the place are kept',
  (select label = 'the quiet one' and place = 'moffitt, 4th floor' from wall_cards where code = 'card-c'));
-- Each call is its own statement, and the read that checks it is the next one.
-- A statement sees one snapshot: a subquery beside the call would be reading
-- the row as it was before the call ran, and would pass whatever happened.
select celestual_desk_card_set('card-c', 'the quiet one');
select cd_ok('a null leaves the place alone',
  (select place from wall_cards where code = 'card-c') = 'moffitt, 4th floor');

select cd_ok('an empty place is accepted',
  (celestual_desk_card_set('card-c', null, '')->>'ok')::boolean);
select cd_ok('an empty string clears the place',
  (select place is null from wall_cards where code = 'card-c'));

select cd_ok('a card can be taken out of circulation',
  (celestual_desk_card_set('card-c', null, null, false)->>'ok')::boolean);
select cd_ok('a card out of circulation is still a row on the desk',
  (select not is_active from wall_cards where code = 'card-c')
    and jsonb_array_length(celestual_desk_cards()->'rows') = 5);
select cd_ok('a code that is not a card is not found',
  (celestual_desk_card_set('card-z', 'nothing')->>'error') = 'not_found');

-- ── 5. the doors ────────────────────────────────────────────────────────────
select cd_ok('the browser may log a step',
  has_function_privilege('anon', 'wall_card_step(text, text, text)', 'execute'));
select cd_ok('the browser may not read the desk',
  not has_function_privilege('anon', 'celestual_desk_cards()', 'execute'));
select cd_ok('the browser may not name a card',
  not has_function_privilege('anon', 'celestual_desk_card_set(text, text, text, boolean)', 'execute'));
select cd_ok('the registry is not readable from a browser',
  not has_table_privilege('anon', 'wall_cards', 'select'));
select cd_ok('the steps are not readable from a browser',
  not has_table_privilege('anon', 'wall_card_events', 'select'));

rollback;

-- ─────────────────────────────────────────────────────────────────────────────
-- test-pass.sql: exercises 0043_the_pass_list.sql.
--
-- Run through scripts/verify-migrations.sh --test. One transaction that never
-- commits, so the list it fills is gone before the next file looks.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function ps_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'pass-salt')
  on conflict (key) do nothing;
update wall_campuses set is_open = true where slug = 'berkeley';

-- ── the list ────────────────────────────────────────────────────────────────
-- One call per statement. An uncorrelated exists() in the same expression
-- as the call is planned as an init plan and reads the table before the call.
select ps_ok('an address goes on the list as an address',
  (celestual_desk_pass_add(' Ayeom28@Gmail.com ', 'the founder')->>'kind') = 'email');
select ps_ok('lowercased and trimmed',
  exists (select 1 from celestual_passes where kind = 'email' and value = 'ayeom28@gmail.com' and note = 'the founder'));
select ps_ok('twice is refused',
  (celestual_desk_pass_add('ayeom28@gmail.com')->>'error') = 'exists');
select ps_ok('a handle goes on as a handle, normalised',
  (celestual_desk_pass_add('@Ace03D', null)->>'value') = 'ace03d');
select ps_ok('and is filed as one',
  exists (select 1 from celestual_passes where kind = 'handle' and value = 'ace03d'));
select ps_ok('nothing is refused',
  (celestual_desk_pass_add('   ')->>'error') = 'bad_input');
select ps_ok('the desk lists both',
  jsonb_array_length(celestual_desk_passes()->'rows') = 2);
select ps_ok('and the two questions answer',
  celestual_pass_email('AYEOM28@gmail.com') and celestual_pass_handle('@ace03d')
  and not celestual_pass_email('somebody@gmail.com') and not celestual_pass_handle('nobody'));

-- ── the campus gate ─────────────────────────────────────────────────────────
select ps_ok('a passed address binds as a campus address',
  (celestual_user_bind_edu('pass-session-0000000000000000', 'ayeom28@gmail.com')->>'ok')::boolean);
select ps_ok('and the row carries it',
  exists (select 1 from celestual_users where edu_email = 'ayeom28@gmail.com' and edu_verified_at is not null));
select ps_ok('and the wall is open to it',
  wall_gate(celestual_session_user('pass-session-0000000000000000'), 'berkeley'));
select ps_ok('an address off the list is still refused',
  (celestual_user_bind_edu('pass-session-1111111111111111', 'somebody@gmail.com')->>'error') = 'email');
select ps_ok('a campus address still binds',
  (celestual_user_bind_edu('pass-session-2222222222222222', 'grad@eecs.berkeley.edu')->>'ok')::boolean);
select ps_ok('and still opens the wall',
  wall_gate(celestual_session_user('pass-session-2222222222222222'), 'berkeley'));
select ps_ok('the desk sign in link takes a passed address',
  (celestual_desk_signin(null, 'ayeom28@gmail.com', null, 'test')->>'ok')::boolean);
select ps_ok('and refuses one off the list',
  (celestual_desk_signin(null, 'somebody@gmail.com', null, 'test')->>'error') = 'email');

-- ── the handle ──────────────────────────────────────────────────────────────
do $$
declare
  v_proof text := 'the-proof-for-ace03d';
  v_hash  text := encode(extensions.digest('the-proof-for-ace03d', 'sha256'), 'hex');
  v_start jsonb;
  v_poll  jsonb;
  v_bind  jsonb;
begin
  v_start := celestual_start_ig_verification('ace03d', v_hash);
  perform ps_ok('a passed handle starts already verified',
    (v_start->>'ok')::boolean and (v_start->>'passed')::boolean and v_start->>'token' is not null);
  perform ps_ok('and the record says pass',
    exists (select 1 from celestual_ig_verifications
             where handle = 'ace03d' and status = 'verified' and verified_via = 'pass'
               and proof_hash = v_hash and expires_at > now() + interval '29 days'));
  v_poll := celestual_poll_ig_verification(v_start->>'token', v_hash);
  perform ps_ok('the poll answers verified at once',
    v_poll->>'status' = 'verified' and v_poll->>'handle' = 'ace03d');
  v_bind := celestual_user_bind_handle('pass-session-3333333333333333', 'ace03d', v_proof);
  perform ps_ok('and the proof binds the handle',
    (v_bind->>'ok')::boolean
    and exists (select 1 from celestual_users where instagram_handle = 'ace03d' and handle_verified_at is not null));
  perform ps_ok('and the proof spends',
    celestual_consume_ig_proof('ace03d', v_proof));
  perform ps_ok('the handle is a member',
    exists (select 1 from celestual_members where handle = 'ace03d'));

  v_start := celestual_start_ig_verification('nobody.passed', v_hash);
  perform ps_ok('a handle off the list gets a code to send',
    (v_start->>'ok')::boolean and v_start->'passed' is null
    and exists (select 1 from celestual_ig_verifications where handle = 'nobody.passed' and status = 'pending'));
end $$;

-- ── off the list ────────────────────────────────────────────────────────────
select ps_ok('a pass comes off',
  (celestual_desk_pass_remove((select id from celestual_passes where value = 'ayeom28@gmail.com'))->>'ok')::boolean);
select ps_ok('and the question says no',
  not celestual_pass_email('ayeom28@gmail.com'));
select ps_ok('and the wall shuts to that address',
  not wall_gate(celestual_session_user('pass-session-0000000000000000'), 'berkeley'));
select ps_ok('and a row that is gone is not found',
  (celestual_desk_pass_remove(gen_random_uuid())->>'error') = 'not_found');
select ps_ok('the handle comes off',
  (celestual_desk_pass_remove((select id from celestual_passes where value = 'ace03d'))->>'ok')::boolean);
select ps_ok('and mints a code again',
  (celestual_start_ig_verification('ace03d', repeat('ab', 32))->'passed') is null);

rollback;

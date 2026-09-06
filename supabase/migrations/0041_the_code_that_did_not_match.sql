-- ─────────────────────────────────────────────────────────────────────────────
-- 0041_the_code_that_did_not_match.sql
--
-- A DM that carries the wrong code is told so, on Instagram and in the app.
--
-- ── what was wrong ───────────────────────────────────────────────────────────
-- celestual_complete_ig_verification (0020) answered a code that matched no
-- pending row by asking, first, whether the SENDER had ever verified:
--
--     if exists (... where handle = nu and status = 'verified' ...) then
--       return ... 'already_verified'
--
-- That is the wrong question in the wrong order. A person who verified last
-- week, and who mistypes today's code, was told "@you is already verified on
-- CELESTUAL. Head back to the app, it's waiting on you, not on this DM." Every
-- word of that is true about their account and none of it is true about the
-- DM they just sent: the app was sitting on a live code, watching for a DM
-- that would never match it, and the one message they got told them to stop
-- sending. The same branch fired for a lapsed code from a verified account.
--
-- 'already_verified' has exactly one honest meaning: THIS code, re-sent by the
-- account it verified. The relay races Meta's webhook, ManyChat retries, and
-- people press send twice; that is the case the answer was written for, and
-- it is the only case that gets it now.
--
-- ── the order, now ───────────────────────────────────────────────────────────
--   1  the code is pending and live         verify, as before
--   2  the code verified THIS sender        already_verified
--   3  the code was pending and has lapsed  code_expired
--   4  otherwise                            no_pending: the digits are wrong
--
-- ── and the app is told ──────────────────────────────────────────────────────
-- A wrong code matches no row, so until now nothing on the server could
-- connect it to the browser that was waiting. The one thing that can is the
-- handle: the browser started its verification under the sender's own @ as
-- the hint (0004), and the relay knows the sender's @ from Meta. So on cases 3
-- and 4 the sender's own live pending rows are marked with what arrived, and
-- celestual_poll_ig_verification hands that note back to the one browser that
-- holds the proof for that row. The screen says "that code didn't match. send
-- this one." under the code that should have been sent.
--
-- What the note can leak, stated plainly: a browser that typed handle X as its
-- own, and holds a live code under it, learns that X sent a non-matching DM to
-- the celestual account within the last thirty minutes. That is somebody
-- typing another person's handle as their own at the same moment that person
-- is verifying, and what they learn is that a DM arrived, not what was in it.
-- The note carries no handle, no digits and no timestamp beyond the row's own.
--
-- Nothing else moves. Grants are restated so a fresh apply lands correct.
-- ─────────────────────────────────────────────────────────────────────────────

alter table celestual_ig_verifications
  add column if not exists last_dm_note text,
  add column if not exists last_dm_at   timestamptz;

comment on column celestual_ig_verifications.last_dm_note is
  'what the last DM under this handle said while this row was pending and it was not this code: wrong_code | expired_code. Read back by celestual_poll_ig_verification to the proof holder only.';

create or replace function celestual_complete_ig_verification(p_token text, p_igsid text, p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_expired boolean;
  nu text := celestual_norm(p_username);
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or nu is null then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  if celestual_is_banned(nu) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  select id into v_id
    from celestual_ig_verifications
   where token = p_token and status = 'pending' and expires_at > now()
   limit 1;

  if v_id is null then
    -- 2. This code, re-sent by the account it verified. The only case that
    --    is honestly "already verified": the person is in, and this DM was
    --    the same one again.
    if exists (select 1 from celestual_ig_verifications
                where token = p_token and handle = nu
                  and status = 'verified' and expires_at > now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending',
                                'already_verified', true, 'handle', nu);
    end if;

    -- 3. A code that was live and is not any more.
    v_expired := exists (select 1 from celestual_ig_verifications
                          where token = p_token and status = 'pending'
                            and expires_at <= now());

    -- Tell the browser that is waiting under this handle what just arrived.
    -- Live pending rows only, and only this sender's: the note is read back
    -- through the proof, so nobody but that browser ever sees it.
    update celestual_ig_verifications
       set last_dm_note = case when v_expired then 'expired_code' else 'wrong_code' end,
           last_dm_at   = now()
     where handle = nu and status = 'pending' and expires_at > now();

    if v_expired then
      return jsonb_build_object('ok', false, 'error', 'no_pending', 'code_expired', true);
    end if;
    -- 4. The digits are wrong.
    return jsonb_build_object('ok', false, 'error', 'no_pending');
  end if;

  update celestual_ig_verifications
     set handle = nu, status = 'verified', verified_via = 'dm', igsid = p_igsid,
         verified_at = now(), expires_at = now() + c_session_ttl,
         last_dm_note = null, last_dm_at = null
   where id = v_id;

  insert into celestual_members (handle, handle_hash)
  values (nu, celestual_hash_handle(nu))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', nu);
end;
$$;

-- The poll: 0012's, plus the note while the row is pending. Still requires
-- BOTH the code AND the matching proof hash, so only the browser that started
-- this verification (and holds the secret) can read anything back.
-- Returns: { status: 'pending'|'verified'|'expired'|'none', handle?, note? }
create or replace function celestual_poll_ig_verification(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status  text;
  v_expires timestamptz;
  v_handle  text;
  v_note    text;
begin
  if p_token is null or p_proof_hash is null then
    return jsonb_build_object('status', 'none');
  end if;
  select status, expires_at, handle, last_dm_note
    into v_status, v_expires, v_handle, v_note
    from celestual_ig_verifications
   where token = p_token and proof_hash = lower(p_proof_hash)
   order by created_at desc
   limit 1;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;
  if v_expires < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  -- Only hand the handle back once it's actually verified (the proof-holder
  -- adopting their real @); a pending row's `handle` is only the typed hint.
  return jsonb_build_object(
    'status', v_status,
    'handle', case when v_status = 'verified' then v_handle else null end,
    'note',   case when v_status = 'pending'  then v_note   else null end
  );
end;
$$;

revoke all on function celestual_poll_ig_verification(text, text) from public;
grant execute on function celestual_poll_ig_verification(text, text) to anon, authenticated;
revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;

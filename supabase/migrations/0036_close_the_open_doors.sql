-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0036 — four doors that were open to anybody                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- The product's one promise is that nobody learns anything until both sides
-- have spoken. Three client-callable functions from 0001–0006 break it, and a
-- fourth leaks a count it has no reason to return. All four are granted to
-- `anon`, all four are in production, and none of them asks for the proof the
-- rest of the product has demanded since 0004.
--
--   celestual_withdraw(from, to)     deletes A's ping on B and answers
--                                    `withdrawn: true|false` — so anybody can
--                                    ask "did @a ping @b?", get a truthful
--                                    answer, and destroy the ping in the same
--                                    call. No proof, no rate limit. This is an
--                                    oracle on the exact fact the product
--                                    exists to keep.
--   celestual_link(handles[])        binds up to three handles into one identity
--                                    group with no proof of owning any of them.
--                                    celestual_submit matches ACROSS a group, so
--                                    anybody who links a stranger's @ to their
--                                    own is matched with whoever pinged that
--                                    stranger, and reads their card. Once
--                                    linked, an @ is never moved out again.
--   celestual_erase_account(handle)  wipes every row about a handle. Ten per IP
--                                    per hour, no proof, and it answers with the
--                                    number of rows it found.
--   celestual_suppress(handle)       is the public opt-out and MUST work with no
--                                    proof (refusing the product must not require
--                                    using it first). But it answers `erased: n`,
--                                    which tells the caller whether that @ had
--                                    anything on the books. It keeps working; it
--                                    stops counting out loud.
--
-- What changes:
--   · withdraw and erase take a proof and refuse without one. Always, not only
--     while require_ig_verification is on: celestual_my_pings has demanded the
--     proof unconditionally since 0025, and the owner's destructive actions
--     should not be looser than the owner's reads.
--   · link is revoked from every client role. Nothing in the shipped product
--     calls it (the retired design did, best-effort, behind a catch). Rows
--     already in celestual_handle_links are left alone: there is no way to tell
--     which were made by their owners, and the desk can look.
--   · suppress returns the handle and nothing else.
--
-- The two-argument celestual_withdraw is DROPPED rather than overloaded, so a
-- caller that never learned about the proof gets an error instead of the old
-- door.
--
-- Re-runnable. Safe on top of 0001→0035. Asserted by scripts/sql/test-doors.sql.

-- ── withdraw: the owner's, and only the owner's ──────────────────────────────
drop function if exists celestual_withdraw(text, text);

create or replace function celestual_withdraw(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ha text;
  hb text;
  v_deleted int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;

  -- The proof first, before a single row is read: a refusal must look the same
  -- whether or not the ping exists, or the refusal is the oracle.
  if not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('withdrawn', false, 'error', 'unverified');
  end if;

  delete from celestual_entries
   where from_handle = nf and to_hash = celestual_hash_handle(nt);
  get diagnostics v_deleted = row_count;

  ha := least(nf, nt);
  hb := greatest(nf, nt);
  delete from celestual_notifications n
   using celestual_matches m
   where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb
     and n.sent_at is null;
  delete from celestual_matches where handle_a = ha and handle_b = hb;

  return jsonb_build_object('withdrawn', v_deleted > 0);
end;
$$;

revoke all on function celestual_withdraw(text, text, text) from public;
grant execute on function celestual_withdraw(text, text, text) to anon, authenticated;

-- ── link: off the client ─────────────────────────────────────────────────────
revoke all on function celestual_link(text[]) from public, anon, authenticated;
grant execute on function celestual_link(text[]) to service_role;

-- ── erase: the owner's ───────────────────────────────────────────────────────
-- The 0035 body, with the proof asked for first. The rate limit stays: it is
-- what bounds a stolen proof, and a refusal still costs the same quota as a
-- real erase so probing burns it at the same rate.
drop function if exists celestual_erase_account(text);

create or replace function celestual_erase_account(p_handle text, p_proof text default null)
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

  if not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('erased', 0, 'error', 'unverified');
  end if;

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
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

revoke all on function celestual_erase_account(text, text) from public;
grant execute on function celestual_erase_account(text, text) to anon, authenticated;

-- ── suppress: still open to everybody, and quieter ───────────────────────────
-- The 0035 body minus the count. The opt-out has to work for a person who has
-- never used the product, so it takes no proof; what it must not do is tell
-- that person, or anybody typing a name that is not theirs, whether the name
-- was on the books.
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
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

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  delete from celestual_members where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);

  return jsonb_build_object('suppressed', nh);
end;
$$;

revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;

comment on function celestual_withdraw(text, text, text) is
  '0036: the owner''s proof is required, and checked before any row is read, so a refusal cannot say whether the ping existed.';
comment on function celestual_erase_account(text, text) is
  '0036: the owner''s proof is required. The rate limit is what bounds a stolen one.';
comment on function celestual_suppress(text) is
  '0036: the public opt-out. No proof, and no count of what it erased.';

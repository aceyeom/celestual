-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0035 · THE COMMUNITIES COME DOWN                                    ║
-- ║  The curated launch spaces, the campus windows, and the schema       ║
-- ║  underneath both.                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Phase 8. Open question Q15, answered: retire it. Group E in
-- `docs/deletions.md`.
--
-- ── WHAT THIS IS SAFE TO DO ─────────────────────────────────────────────────
-- All five tables are empty and were empty at the Phase 1 audit. The feature
-- had a full server half and never had a way in: `app/src/api/celestual.js`
-- carried a comment saying so and said the choice was to finish the entry point
-- or retire the whole thing, tables, RPCs and the hourly mail drain together.
-- That is the choice being made.
--
-- ── WHAT STAYS, AND WHY ─────────────────────────────────────────────────────
-- `celestual_is_member`. `docs/deletions.md` group E marks it CHECK with "may be
-- called from inside other functions. Verify with a pg_get_functiondef scan
-- before deleting." It is: `celestual_submit` and `celestual_my_pings` both call
-- it to answer whether a handle is reachable. It reads `celestual_members` and
-- `celestual_suppressions` and touches no community table, so nothing about it
-- changes here.
--
-- `celestual_slug` goes, because every caller it had is dropped below.
--
-- ── AND THE THREE FUNCTIONS THAT HAVE TO BE REWRITTEN ───────────────────────
-- The erasure paths delete a person's community membership and campus
-- preregistration as part of erasing them. Three of them do, and all three
-- would fail on the first call after the tables went:
--
--   celestual_erase_account     "delete everything", from the account sheet
--   celestual_suppress          the public opt-out at /optout
--   celestual_admin_delete_user the desk's erase
--
-- Each is reproduced below exactly as 0034 left it, minus the two deletes. This
-- is a subtraction, not a rewrite: a diff against 0023 and 0034 shows only the
-- two lines.

-- ── the functions, first ─────────────────────────────────────────────────────
drop function if exists celestual_campus(text);
drop function if exists celestual_campus_preregister(text, text, text, text);
drop function if exists celestual_campus_reveal(text);
drop function if exists celestual_world_counts(text[]);
drop function if exists celestual_set_worlds(text, text[], text);
drop function if exists celestual_slug(text);

-- ── the three erasure paths, without the two deletes ─────────────────────────
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
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

create or replace function celestual_admin_delete_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
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
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;

  return jsonb_build_object('ok', true, 'handle', nh, 'erased', v_erased);
end;
$$;

-- ── the tables, last ─────────────────────────────────────────────────────────
-- Dependents before the thing they depend on. No cascade anywhere: a cascade
-- drops whatever else happened to reference these, silently, and silence is the
-- one thing a destructive migration cannot afford.
drop table if exists celestual_community_members;
drop table if exists celestual_communities;
drop table if exists celestual_campus_prereg;
drop table if exists celestual_campus_mail;
drop table if exists celestual_campuses;

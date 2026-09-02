-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0029 · ADOPT SENDER AND EMAIL LOGIN                                 ║
-- ║  The way back in that actually shipped, written down at last.        ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- ── WHAT THIS FILE IS ────────────────────────────────────────────────────────
-- This migration creates nothing new. Every object below already exists in
-- production and has since 2026-07-19, applied under the name
-- `adopt_sender_and_email_login` with no file behind it in this repository.
-- Phase 4a of the rebuild found the gap and this file closes it.
--
-- So the whole file is `if not exists` and `create or replace`. Applied to
-- production it is a no-op that rewrites three function bodies to the text
-- they already hold. Applied to an empty database it produces the five
-- objects production has and the repository could not.
--
-- Every definition below was read out of the live database with
-- `pg_get_functiondef` and transcribed. Nothing here is a reconstruction from
-- memory or an improvement on what shipped. If a line looks like it wants
-- tidying, that is deliberate: the point of this file is fidelity, and a
-- reconciliation migration that quietly improves what it is reconciling is
-- worse than no reconciliation at all.
--
-- ── WHY THE FILE WENT MISSING ────────────────────────────────────────────────
-- `supabase_migrations.schema_migrations` in production holds five rows against
-- twenty-eight files here, and sixty-six of the eighty function bodies in
-- production carry CRLF line endings that no file in this repository has. Both
-- facts point the same way: most of this schema was applied by hand through the
-- dashboard SQL editor rather than by the migration runner. The history table is
-- not a record of what ran. Treat it as a hint, never as an authority.
--
-- ── WHAT IT DOES ─────────────────────────────────────────────────────────────
-- An email address becomes a second way to reach a handle you already proved you
-- own. The DM code flow is still the only thing that proves ownership: nothing
-- below sets a verification, it only remembers an address against a handle whose
-- proof is already good, and later trades a link sent to that address for a
-- fresh session on the same handle.
--
-- Three functions, in the order a person meets them:
--
--   celestual_bind_login_email  you are verified now, remember this address
--   celestual_login_lookup      this address, which handles does it reach
--   celestual_redeem_login      this link was clicked, mint the session
--
-- This is the shipped answer to the problem `0015_identity_start.sql` was
-- reaching for and never landed. Open question Q4 chose this path and 0015 and
-- its edge function `celestual-relogin` come out of the repository with it.

-- ── the address book ─────────────────────────────────────────────────────────
-- One row per (email, handle) pair, so one address can reach several handles and
-- one handle can be reached from several addresses. That is deliberate: a person
-- with two accounts should not have to pick which one their email belongs to,
-- and an address that changes should not orphan the handle behind it.
--
-- `last_seen` is bumped on every re-bind, and `celestual_login_lookup` orders by
-- it, so the handle you most recently proved is the one offered first.
create table if not exists celestual_email_identities (
  email      text        not null,
  handle     text        not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (email, handle)
);

create index if not exists celestual_email_identities_email_idx
  on celestual_email_identities (email);

-- ── the links ────────────────────────────────────────────────────────────────
-- One row per magic link issued. `token_hash` is the hash, never the token: the
-- token exists only in the mail that was sent and in the URL the person clicks,
-- so a reader of this table cannot sign in as anybody.
--
-- `used_at` is the single-use latch. `celestual_redeem_login` sets it in the
-- same UPDATE that reads the row, so two clicks on one link race in the database
-- rather than in the edge function, and the loser gets nothing.
create table if not exists celestual_login_links (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  handle     text        not null,
  token_hash text        not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists celestual_login_links_email_idx
  on celestual_login_links (email, created_at);

-- ── the grants, as they actually stand in production ─────────────────────────
-- RLS on, and no policy on either table. With RLS enabled and no policy, anon
-- and authenticated can do nothing with these rows whatever they ask PostgREST
-- for, so the table grants that Supabase's default privileges hand out are
-- inert. Production leaves those default grants in place rather than revoking
-- them, unlike the pattern 0028 uses, and this file reproduces production rather
-- than tidying it. The three functions below are SECURITY DEFINER and reach the
-- tables past RLS, which is the only path in.
alter table celestual_email_identities enable row level security;
alter table celestual_login_links      enable row level security;

-- ── celestual_bind_login_email(handle, proof, email) ─────────────────────────
-- Remembers an address against a handle. Requires a live verification proof for
-- that handle, so an address can only ever be bound by somebody already holding
-- the session it would recover. Without that check this function would be an
-- account takeover: type a stranger's handle, bind your own address, request a
-- link.
create or replace function celestual_bind_login_email(p_handle text, p_proof text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nh text := celestual_norm(p_handle);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_hash text;
begin
  if nh is null or p_proof is null or length(p_proof) = 0 then
    return jsonb_build_object('ok', false);
  end if;
  if ne is null or ne !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  v_hash := encode(digest(p_proof, 'sha256'), 'hex');
  if not exists (
    select 1 from celestual_ig_verifications
     where handle = nh and status = 'verified' and proof_hash = v_hash and expires_at > now()
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  insert into celestual_email_identities (email, handle)
  values (ne, nh)
  on conflict (email, handle) do update set last_seen = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- ── celestual_login_lookup(email) ────────────────────────────────────────────
-- Which handles does this address reach. SERVICE ROLE ONLY, and that matters:
-- it maps an email to the Instagram handles behind it, which is exactly the
-- disclosure the product must never make to a caller who merely knows somebody's
-- address. Only the edge function that is about to send mail to that address
-- ever calls it.
--
-- Capped at five. An address bound to more handles than that is a person with a
-- lot of accounts or a person doing something else, and neither needs a longer
-- list.
create or replace function celestual_login_lookup(p_email text)
returns table(handle text)
language sql
security definer
set search_path = public
as $$
  select handle from celestual_email_identities
   where email = nullif(trim(lower(coalesce(p_email, ''))), '')
   order by last_seen desc
   limit 5;
$$;

-- ── celestual_redeem_login(token_hash, proof_hash) ───────────────────────────
-- A clicked link becomes a session. SERVICE ROLE ONLY.
--
-- The single-use latch is the UPDATE itself: `used_at is null` in the WHERE and
-- `used_at = now()` in the SET, returning the handle. Two simultaneous clicks
-- both run it, one row is returned once, and the second gets a null handle and
-- the same 'invalid' the expired case gets. Nothing distinguishes a spent link
-- from a wrong one to the caller, which is the correct amount to say.
--
-- The session it mints is a row in celestual_ig_verifications with an igsid of
-- `email:<handle>`, which is how the rest of the schema can tell a session that
-- came in through mail from one that came in through a DM code, without either
-- path needing to know about the other.
create or replace function celestual_redeem_login(p_token_hash text, p_proof_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_token  text;
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token_hash is null or p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  update celestual_login_links
     set used_at = now()
   where token_hash = lower(p_token_hash) and used_at is null and expires_at > now()
   returning handle into v_handle;
  if v_handle is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (v_handle, v_token, lower(p_proof_hash), 'verified', 'email:' || v_handle, now(), now() + c_session_ttl);

  insert into celestual_members (handle, handle_hash)
  values (v_handle, celestual_hash_handle(v_handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', v_handle);
end;
$$;

-- ── the execute grants, as they stand in production ──────────────────────────
-- bind is callable by the browser, because the browser is holding the proof it
-- checks. lookup and redeem are not, because both disclose or mint. Supabase's
-- default privileges grant execute on new functions to anon and authenticated,
-- so the two service-role functions are revoked back down rather than granted
-- up. `from public` on bind matches production, where the PUBLIC grant is off
-- and the two role grants are on.
revoke all on function celestual_bind_login_email(text, text, text) from public;
grant execute on function celestual_bind_login_email(text, text, text) to anon, authenticated;

revoke all on function celestual_login_lookup(text)        from public, anon, authenticated;
grant execute on function celestual_login_lookup(text)     to service_role;

revoke all on function celestual_redeem_login(text, text)  from public, anon, authenticated;
grant execute on function celestual_redeem_login(text, text) to service_role;

comment on function celestual_bind_login_email(text, text, text) is
  'Binds an email to a handle whose verification proof is currently live. Does not verify anything itself.';
comment on function celestual_login_lookup(text) is
  'Service role only. Maps an email to up to five handles, most recently proved first.';
comment on function celestual_redeem_login(text, text) is
  'Service role only. Trades a single-use link token for a fresh 30 day session on the handle behind it.';

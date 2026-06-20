-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0002 — user accounts, encrypted sky, entitlements       ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- Adds the signed-in-user layer that 0001 deliberately left out, so a person's
-- account and their "sky" (the stars they've sealed) survive a refresh and follow
-- them across devices — WITHOUT weakening 0001's anonymous matching model.
--
-- Identity comes from Supabase Auth (Instagram/Meta via the Facebook provider).
-- Every table here is OWNER-SCOPED by RLS on auth.uid(): a user can only ever read
-- or write their OWN row, and anon gets nothing.
--
-- PRIVACY OF THE SKY (the crush graph):
--   The list of @handles a user has entered is sensitive. It is stored ONLY as an
--   AES-GCM ciphertext blob (sky_cipher) that the client encrypts before it ever
--   leaves the browser. The decryption key lives in celestual_user_keys, which is
--   readable ONLY by its owner (auth.uid()). So:
--     • another user, the anon role, and a dump of celestual_profiles alone
--       cannot read anyone's sky;
--     • the plaintext who-entered-whom is never sent to the server in this layer
--       (the matching path in 0001 is separate and already exfil-safe).
--   This is the "save my sky, encrypted, readable only by my logged-in session"
--   model. (An operator with both tables + service role could still join them; this
--   is at-rest / least-privilege protection, not zero-knowledge — documented so
--   nobody over-trusts it.)

-- ──────────────────────────────────────────────────────────────────────
-- PROFILE — one row per auth user. Non-secret account fields + the opaque,
-- client-encrypted sky blob.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       text,                          -- their own IG @ (their star's label), normalised
  email        text,                          -- contact email for the mutual-match note
  display_name text,
  sky_cipher   text,                          -- AES-GCM ciphertext (base64) of the sky JSON — opaque to the server
  sky_nonce    text,                          -- AES-GCM IV (base64)
  star_count   int  not null default 0,       -- non-secret count, for quick reads / display
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- USER KEYS — the per-user AES key that decrypts the sky blob. Readable ONLY by
-- the owner, so the ciphertext in celestual_profiles is useless without a valid
-- session for that exact user.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_user_keys (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  wrapped_key text not null,                  -- base64 raw AES-GCM key (owner-only via RLS)
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- ENTITLEMENTS — how many paid (beyond-the-free) stars a user owns. The client
-- READS this; only the service role (the Stripe/Kakao/Toss webhook) WRITES it, so
-- a user can't self-grant. Mirrors app/src/api/pay.js.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_entitlements (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  paid_stars int not null default 0,
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — owner-only. Enable RLS, lock anon out, grant the authenticated role the
-- privileges RLS then narrows to its own rows.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_profiles     enable row level security;
alter table celestual_user_keys    enable row level security;
alter table celestual_entitlements enable row level security;

revoke all on celestual_profiles     from anon, authenticated;
revoke all on celestual_user_keys    from anon, authenticated;
revoke all on celestual_entitlements from anon, authenticated;

grant select, insert, update, delete on celestual_profiles  to authenticated;
grant select, insert, update, delete on celestual_user_keys to authenticated;
grant select                         on celestual_entitlements to authenticated;

drop policy if exists "own profile" on celestual_profiles;
create policy "own profile" on celestual_profiles
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own key" on celestual_user_keys;
create policy "own key" on celestual_user_keys
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own entitlement" on celestual_entitlements;
create policy "own entitlement" on celestual_entitlements
  for select to authenticated
  using (auth.uid() = user_id);

-- Keep updated_at honest on every write.
create or replace function celestual_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists celestual_profiles_touch on celestual_profiles;
create trigger celestual_profiles_touch before update on celestual_profiles
  for each row execute function celestual_touch_updated_at();

-- ──────────────────────────────────────────────────────────────────────
-- celestual_delete_me — self-serve account deletion (the account area's "delete").
-- Wipes the caller's own rows and their auth user. SECURITY DEFINER so it can
-- reach auth.users; auth.uid() still resolves to the caller, so it can only ever
-- delete the account making the request.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_delete_me()
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from celestual_entitlements where user_id = uid;
  delete from celestual_user_keys    where user_id = uid;
  delete from celestual_profiles     where user_id = uid;
  -- Remove the auth user too (cascades are already handled above). Best-effort:
  -- if the function's owner lacks the privilege, the data is still wiped.
  begin
    delete from auth.users where id = uid;
  exception when others then
    null;
  end;
  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function celestual_delete_me() from public;
grant execute on function celestual_delete_me() to authenticated;

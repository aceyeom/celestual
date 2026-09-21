-- ─────────────────────────────────────────────────────────────────────────────
-- 0057: the wall for everybody, and the login.
--
-- Two things, and the second exists for the first.
--
-- ── 1. a wall with no campus ─────────────────────────────────────────────────
-- The wall at the root of the site is a row in wall_campuses like the one at
-- /berkeley, and the only thing different about it is that it has no domain:
-- nobody is at it, so nobody proves an address to write on it. What writes
-- there is any proof the product takes. `edu_domain` goes nullable for that
-- one row; the campus wall's gate reads exactly as it did.
--
-- ── 2. two more proofs of a person ───────────────────────────────────────────
-- The product proved a person two ways: the DM code, which proves an @, and
-- the campus code, which proves an address at a school. Neither is something
-- a person off campus without an instagram can give. Two more, both through
-- Supabase Auth, which the product uses for nothing else:
--
--   google   the account Google vouches for. Its subject is Supabase's own
--            user id for that login, which is stable per account; its
--            address is what Google says it is. A google address at a .edu
--            domain also proves that campus, since Google is the campus's
--            own mail: a berkeley.edu google opens the campus wall's composer
--            with no code to type.
--   email    an address a six digit code was mailed to and typed back.
--
-- Both are bound to the product's OWN row (0030) by one function, and the
-- function trusts nothing the browser typed: it is called with the Supabase
-- session's JWT as its authorization and reads the provider, the subject and
-- the address off `auth.jwt()`. Nothing on the wall becomes a Supabase Auth
-- user; the session is spent on the bind and let go (app/src/api/login.js).
--
-- ── 3. the gates ─────────────────────────────────────────────────────────────
-- READING, on every wall, is open to anybody the product has proved by any
-- of the four. WRITING on a wall with a domain is the campus address, as it
-- was; writing on the wall with none is any of the four. Neither door is
-- attached to a letter: the wall is anonymous by shape, and this adds two
-- ways in and no field to leak into.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the wall at the root ──────────────────────────────────────────────────
alter table wall_campuses alter column edu_domain drop not null;
alter table wall_campuses drop constraint if exists wall_campuses_domain_ck;
alter table wall_campuses
  add constraint wall_campuses_domain_ck check (edu_domain is null or edu_domain ~ '^[a-z0-9.-]+\.edu$');

insert into wall_campuses (slug, name, edu_domain, is_open)
values ('global', 'celestual', null, true)
on conflict (slug) do update set is_open = true, name = excluded.name;

comment on column wall_campuses.edu_domain is
  '0032, 0057: the address that writes here. Null for the wall at the root, where any proof of a person writes.';

-- ── 2. the two proofs, on the row ────────────────────────────────────────────
alter table celestual_users
  add column if not exists google_sub         text,
  add column if not exists google_email       text,
  add column if not exists google_verified_at timestamptz,
  add column if not exists email_verified_at  timestamptz;

create unique index if not exists celestual_users_google_sub_idx
  on celestual_users (google_sub) where google_sub is not null;

alter table celestual_users drop constraint if exists celestual_users_google_ck;
alter table celestual_users
  add constraint celestual_users_google_ck
    check ((google_sub is null) = (google_verified_at is null));
alter table celestual_users drop constraint if exists celestual_users_email_verified_ck;
alter table celestual_users
  add constraint celestual_users_email_verified_ck
    check (email_verified_at is null or email is not null);

comment on column celestual_users.google_sub is
  '0057: the Supabase Auth user id of the google login bound to this person. Stable per google account.';
comment on column celestual_users.email_verified_at is
  '0057: when `email` was proved by a code mailed to it. Null while it is only a note (0030).';

-- the one shape the client is handed, with the two proofs and the address a
-- login vouched for. The campus address still comes back as its domain only.
create or replace function celestual_user_public(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',              u.id,
    'handle',          u.instagram_handle,
    'handle_verified', u.handle_verified_at is not null,
    'email',           u.email,
    'edu_verified',    u.edu_verified_at is not null,
    'campus',          u.edu_domain,
    'google_verified', u.google_verified_at is not null,
    'email_verified',  u.email_verified_at is not null,
    'login_email',     coalesce(u.google_email, case when u.email_verified_at is not null then u.email end)
  )
  from celestual_users u
  where u.id = p_user and u.merged_into is null;
$$;

-- ── celestual_user_bind_login(token) ─────────────────────────────────────────
-- Client-callable, BY A SUPABASE AUTH SESSION. The caller's JWT is the whole
-- of the evidence: the provider, the subject and the address are read off
-- `auth.jwt()`, which the platform verified, and never off an argument. A
-- call with no session is refused. `p_token` is the browser's own session
-- token (0030), which is what the proof is bound to.
--
-- The shape is celestual_user_bind_edu's: a proof already owned by another
-- row moves this session onto that row, or merges the two by the merge rule
-- (0030), and a proof nobody owns lands on this session's row, or on a new
-- one when the session has none.
create or replace function celestual_user_bind_login(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_uid      uuid := auth.uid();
  v_claims   jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  v_provider text;
  v_email    text;
  v_sub      text;
  v_me       uuid;
  v_owner    uuid;
  v_a        uuid;
  v_b        uuid;
  v_res      jsonb;
  v_edu      jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_login');
  end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_provider := lower(coalesce(v_claims #>> '{app_metadata,provider}', 'email'));
  v_email    := nullif(lower(btrim(coalesce(v_claims ->> 'email', ''))), '');
  v_sub      := v_uid::text;
  if v_provider not in ('google', 'email') then
    return jsonb_build_object('ok', false, 'error', 'provider');
  end if;
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;

  v_me := celestual_session_user(p_token);

  -- who already owns this proof
  if v_provider = 'google' then
    select id into v_owner from celestual_users
     where google_sub = v_sub and merged_into is null;
  else
    select id into v_owner from celestual_users
     where email = v_email and email_verified_at is not null and merged_into is null;
  end if;

  if v_owner is null then
    if v_me is null then
      insert into celestual_users default values returning id into v_me;
    end if;
  elsif v_me is null or v_me = v_owner then
    v_me := v_owner;
  else
    -- two rows, one person: the merge rule decides, or stops and asks
    select case when x.created_at <= y.created_at then x.id else y.id end,
           case when x.created_at <= y.created_at then y.id else x.id end
      into v_a, v_b
      from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner;
    v_res := celestual_user_merge(v_a, v_b, 'bind_login');
    if not (v_res->>'ok')::boolean then
      return jsonb_build_object('ok', false, 'error', 'conflict');
    end if;
    v_me := v_a;
  end if;

  -- the proof, written on the row it landed on
  if v_provider = 'google' then
    update celestual_users
       set google_sub = coalesce(google_sub, v_sub),
           google_email = v_email,
           google_verified_at = coalesce(google_verified_at, now()),
           updated_at = now()
     where id = v_me;
  else
    update celestual_users
       set email = coalesce(email, v_email),
           email_verified_at = case when email is null or email = v_email then now() else email_verified_at end,
           updated_at = now()
     where id = v_me;
  end if;

  perform celestual_session_bind(v_me, encode(digest(p_token, 'sha256'), 'hex'));

  -- ── and a campus, when google says so ──
  -- A google address at a .edu domain is the campus's own mail, so it proves
  -- the campus the way the mailed code does, through the same function, on
  -- the same row. A refusal there (a different campus already on the row) is
  -- not a refusal here: the google login stands either way.
  if v_provider = 'google' and v_email ~ '\.edu$'
     and coalesce(v_claims #>> '{user_metadata,email_verified}', 'true') <> 'false' then
    begin
      v_edu := celestual_user_bind_edu(p_token, v_email);
    exception when others then
      v_edu := null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'user', celestual_user_public(celestual_session_user(p_token)));
end;
$$;

revoke all on function celestual_user_bind_login(text) from public, anon;
grant execute on function celestual_user_bind_login(text) to authenticated, service_role;

comment on function celestual_user_bind_login(text) is
  '0057: bind the calling Supabase Auth session''s google account or mailed-code address to the browser''s own row. Reads the proof off auth.jwt() and nothing else.';

-- ── 3. the gates ─────────────────────────────────────────────────────────────
-- Any of the four proofs, on one row.
create or replace function celestual_user_proved(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from celestual_users u
     where u.id = p_user
       and u.merged_into is null
       and (u.handle_verified_at is not null
            or u.edu_verified_at is not null
            or u.google_verified_at is not null
            or u.email_verified_at is not null)
  );
$$;
revoke all on function celestual_user_proved(uuid) from public, anon, authenticated;
grant execute on function celestual_user_proved(uuid) to service_role;

-- who may WRITE. A wall with a domain: the campus address, a subdomain of
-- it, or the desk's list (0043), as before. A wall with none: any proof.
create or replace function wall_gate(p_user uuid, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from celestual_users u
      join wall_campuses c on c.slug = p_campus and c.is_open
     where u.id = p_user
       and u.merged_into is null
       and (
         (c.edu_domain is null and celestual_user_proved(u.id))
         or
         (c.edu_domain is not null
          and u.edu_verified_at is not null
          and (u.edu_domain = c.edu_domain
               or u.edu_domain like '%.' || c.edu_domain
               or celestual_pass_email(u.edu_email)))
       )
  );
$$;

comment on function wall_gate(uuid, text) is
  '0057: who may WRITE on a wall. A campus address (or a pass) on a wall with a domain; any proof of a person on the wall with none.';

-- who may READ. Any proof, on any open wall.
create or replace function wall_read_gate(p_user uuid, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from celestual_users u
      join wall_campuses c on c.slug = p_campus and c.is_open
     where u.id = p_user
       and u.merged_into is null
       and celestual_user_proved(u.id)
  );
$$;

comment on function wall_read_gate(uuid, text) is
  '0057: who may READ a wall: anybody the product has proved, by the DM, the campus code, google or a mailed code.';

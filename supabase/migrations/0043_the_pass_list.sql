-- ─────────────────────────────────────────────────────────────────────────────
-- 0043_the_pass_list.sql
--
-- The pass list. A short list, kept from the desk, of the addresses and the
-- handles that are let through the product's two proofs as if they had passed
-- them. Re-runnable: every statement is create or replace, create if not
-- exists, or guarded.
--
--   1  the table, and the two questions asked of it
--   2  the desk: list, add, remove
--   3  an address on the list passes the campus gate
--   4  a handle on the list is verified the moment it asks
--
-- ── what a pass is, and what it is not ────────────────────────────────────────
-- The team does not have campus addresses, and the people the product is
-- shown to before launch often do not either. The desk's sign in link (0039)
-- signs one browser in once; a pass is the standing version of that, for a
-- person rather than a browser: put an address on the list and the wall's
-- code goes to that inbox, whatever its domain, and the address opens the
-- wall once the code checks out. Put a handle on the list and the DM step is
-- skipped: the verification is written as verified the moment it is started,
-- and the browser that started it holds a proof exactly as it would after a
-- DM. Everything else is unchanged. The code is still mailed and still
-- checked, the proof is still a browser held secret, and every read still
-- goes through the same functions.
--
-- Nothing here stamps handle_verified_at. A passed handle's verification row
-- is the same row the webhook writes, marked verified_via = 'pass' so the
-- records say how the person got in, and the browser still binds through
-- celestual_user_bind_handle, the one writer.
--
-- Service role and nothing else, for every function that changes the list.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the table ──────────────────────────────────────────────────────────────
create table if not exists celestual_passes (
  id         uuid        primary key default gen_random_uuid(),
  kind       text        not null,
  value      text        not null,
  note       text,
  created_at timestamptz not null default now(),
  constraint celestual_passes_kind_ck  check (kind in ('email', 'handle')),
  constraint celestual_passes_value_ck check (
    (kind = 'email'  and value = lower(btrim(value))
                     and value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                     and char_length(value) <= 200)
    or
    (kind = 'handle' and value = celestual_norm(value))
  ),
  constraint celestual_passes_note_ck check (note is null or char_length(note) <= 120)
);
create unique index if not exists celestual_passes_uidx on celestual_passes (kind, value);
alter table celestual_passes enable row level security;
revoke all on celestual_passes from anon, authenticated;

comment on table celestual_passes is
  '0043: the pass list. An address here passes the campus gate whatever its domain; a handle here skips the DM. Kept from the desk.';

-- The two questions. Stable, and read from inside the security definer
-- functions below, so they run as the owner wherever they are called.
create or replace function celestual_pass_email(p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from celestual_passes
     where kind = 'email' and value = lower(btrim(coalesce(p_email, '')))
  )
$$;

create or replace function celestual_pass_handle(p_handle text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from celestual_passes
     where kind = 'handle' and value = celestual_norm(p_handle)
  )
$$;

revoke all on function celestual_pass_email(text)  from public, anon, authenticated;
revoke all on function celestual_pass_handle(text) from public, anon, authenticated;
grant execute on function celestual_pass_email(text)  to service_role;
grant execute on function celestual_pass_handle(text) to service_role;

-- ── 2. the desk ───────────────────────────────────────────────────────────────
create or replace function celestual_desk_passes()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_rows jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'value', p.value, 'note', p.note, 'created_at', p.created_at
  ) order by p.created_at desc), '[]'::jsonb)
  into v_rows
  from celestual_passes p;
  return jsonb_build_object('ok', true, 'rows', v_rows);
end;
$$;

-- One field on the desk takes either. An @ or a handle shaped string is a
-- handle; anything with an @ in the middle is an address. The kind is decided
-- here so the desk cannot file an address as a handle.
create or replace function celestual_desk_pass_add(p_value text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  raw    text := btrim(coalesce(p_value, ''));
  v_kind text;
  v_val  text;
  v_id   uuid;
begin
  if raw ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    v_kind := 'email';
    v_val  := lower(raw);
  else
    v_kind := 'handle';
    v_val  := celestual_norm(raw);
  end if;
  if v_val is null or char_length(v_val) < 1 or char_length(v_val) > 200 then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  insert into celestual_passes (kind, value, note)
  values (v_kind, v_val, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (kind, value) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'exists');
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'kind', v_kind, 'value', v_val);
end;
$$;

create or replace function celestual_desk_pass_remove(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p celestual_passes;
begin
  delete from celestual_passes where id = p_id returning * into v_p;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'kind', v_p.kind, 'value', v_p.value);
end;
$$;

revoke all on function celestual_desk_passes()                from public, anon, authenticated;
revoke all on function celestual_desk_pass_add(text, text)    from public, anon, authenticated;
revoke all on function celestual_desk_pass_remove(uuid)       from public, anon, authenticated;
grant execute on function celestual_desk_passes()                 to service_role;
grant execute on function celestual_desk_pass_add(text, text)     to service_role;
grant execute on function celestual_desk_pass_remove(uuid)        to service_role;

-- ── 3. an address on the list passes the campus gate ──────────────────────────
-- Three places said ".edu" and all three have to agree.
--
-- The schema's own shape check on edu_email said the address is a campus one
-- at all. It says the address is an address now; whether it is a campus one
-- or a passed one is the bind function's decision, below, and it is the only
-- writer of the column.
alter table celestual_users drop constraint if exists celestual_users_edu_shape_ck;
alter table celestual_users add constraint celestual_users_edu_shape_ck
  check (edu_email is null or edu_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- celestual_user_bind_edu, as 0030 wrote it, taking a .edu or an address on
-- the list. Still service role only: it takes the address on trust, and the
-- only callers are celestual-edu-verify after its code has checked out and
-- the desk's sign in link.
create or replace function celestual_user_bind_edu(p_token text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne      text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_me    uuid;
  v_owner uuid;
  v_a     uuid;
  v_b     uuid;
  v_res   jsonb;
begin
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if ne !~ '\.edu$' and not celestual_pass_email(ne) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_me := celestual_session_user(p_token);
  select id into v_owner from celestual_users where edu_email = ne and merged_into is null;

  if v_owner is null then
    if v_me is null then
      insert into celestual_users (edu_email, edu_verified_at) values (ne, now())
      returning id into v_me;
    elsif (select edu_email from celestual_users where id = v_me) is null then
      update celestual_users set edu_email = ne, edu_verified_at = now(), updated_at = now()
       where id = v_me;
    else
      insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
      values ('edu', v_me, v_me, jsonb_build_object('existing',
              (select edu_domain from celestual_users where id = v_me),
              'incoming', split_part(ne, '@', 2), 'reason', 'bind_edu'));
      return jsonb_build_object('ok', false, 'error', 'conflict_edu');
    end if;

  elsif v_me is null or v_me = v_owner then
    v_me := v_owner;

  else
    select case when x.created_at <= y.created_at then x.id else y.id end,
           case when x.created_at <= y.created_at then y.id else x.id end
      into v_a, v_b
      from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner;

    v_res := celestual_user_merge(v_a, v_b, 'bind_edu');
    if not (v_res->>'ok')::boolean then
      return v_res;
    end if;
    v_me := v_a;
  end if;

  perform celestual_session_bind(v_me, encode(digest(p_token, 'sha256'), 'hex'));
  return jsonb_build_object('ok', true, 'user', celestual_user_public(v_me));
end;
$$;

-- wall_gate, as 0038 wrote it, plus the list. A passed address opens every
-- wall that is open; there is one, and a pass is for the team and the people
-- it is showing the product to.
create or replace function wall_gate(p_user uuid, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from celestual_users u
      join wall_campuses c on c.slug = p_campus and c.is_open
     where u.id = p_user
       and u.merged_into is null
       and u.edu_verified_at is not null
       and (u.edu_domain = c.edu_domain
            or u.edu_domain like '%.' || c.edu_domain
            or celestual_pass_email(u.edu_email))
  );
$$;

-- The desk's sign in link (0039), taking a passed address for its campus half
-- the way the gate does.
create or replace function celestual_desk_signin(
  p_handle    text default null,
  p_edu_email text default null,
  p_email     text default null,
  p_note      text default null
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh  text := celestual_norm(p_handle);
  ne  text := nullif(lower(btrim(coalesce(p_edu_email, ''))), '');
  npe text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_login   text;
  v_session text;
  v_res     jsonb;
  c_ttl constant interval := interval '1 hour';
begin
  if nh is null and ne is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if nh is not null and celestual_is_banned(nh) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;
  if ne is not null and ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if ne is not null and ne !~ '\.edu$' and not celestual_pass_email(ne) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;

  if nh is not null then
    v_login := encode(gen_random_bytes(24), 'hex');
    insert into celestual_login_links (email, handle, token_hash, expires_at)
    values ('desk:' || coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'sign in link'),
            nh, encode(digest(v_login, 'sha256'), 'hex'), now() + c_ttl);
  end if;

  if ne is not null then
    v_session := encode(gen_random_bytes(32), 'hex');
    v_res := celestual_user_bind_edu(v_session, ne);
    if not coalesce((v_res->>'ok')::boolean, false) then
      return v_res;
    end if;
    if npe is not null then
      perform celestual_user_set_email(v_session, npe);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'handle', nh,
    'edu_email', ne,
    'login_token', v_login,
    'session_token', v_session,
    'expires_at', now() + c_ttl
  );
end;
$$;

-- ── 4. a handle on the list is verified the moment it asks ────────────────────
-- celestual_start_ig_verification, as 0020 wrote it, with one branch in front
-- of the code: a passed handle gets its row written verified, under the proof
-- hash the browser sent, and the answer says `passed` so the browser can go
-- straight to the poll rather than draw a code nobody has to send. The row is
-- the same row the webhook leaves, thirty days, marked 'pass'. The per handle
-- limit is not spent on it: the limit exists to stop a stranger burning a
-- handle's eight starts, and a passed handle is the team's own.
create or replace function celestual_start_ig_verification(p_handle text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_ip text;
  v_n  int;
  v_token text;
  v_try int := 0;
  c_pending_ttl      constant interval := interval '30 minutes';
  c_session_ttl      constant interval := interval '30 days';
  c_start_per_ip     constant int := 15;   -- per IP / hour
  c_start_per_handle constant int := 8;    -- per handle / hour
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid proof';
  end if;

  v_ip := celestual_client_ip();

  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
    if v_n >= c_start_per_ip then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  end if;

  -- Bans only (0020). An opt-out no longer stops anyone signing up.
  if celestual_is_banned(nh) then
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  -- The pass. Written verified, and nothing to send.
  if celestual_pass_handle(nh) then
    v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    insert into celestual_ig_verifications
      (handle, token, proof_hash, status, igsid, verified_via, verified_at, expires_at)
    values (nh, v_token, lower(p_proof_hash), 'verified', 'pass:' || nh, 'pass',
            now(), now() + c_session_ttl);
    insert into celestual_members (handle, handle_hash)
    values (nh, celestual_hash_handle(nh))
    on conflict (handle) do nothing;
    return jsonb_build_object(
      'ok', true,
      'passed', true,
      'token', v_token,
      'expires_at', to_char((now() + c_session_ttl) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
  end if;

  select count(*) into v_n from celestual_attempts
    where to_handle = nh and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
  if v_n >= c_start_per_handle then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '7 days';
  end if;

  -- Four digits (0019). Unique among currently-pending rows.
  loop
    v_try := v_try + 1;
    v_token := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into celestual_ig_verifications (handle, token, proof_hash, expires_at)
      values (nh, v_token, lower(p_proof_hash), now() + c_pending_ttl);
      exit;
    exception when unique_violation then
      if v_try >= 30 then
        return jsonb_build_object('ok', false, 'error', 'busy');
      end if;
    end;
  end loop;

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', to_char((now() + c_pending_ttl) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

comment on function celestual_start_ig_verification(text, text) is
  '0043: mints a DM code, or, for a handle on the pass list, writes the verification at once and answers passed.';

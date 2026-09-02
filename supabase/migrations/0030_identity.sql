-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0030 · IDENTITY                                                     ║
-- ║  One row per person, one session across both surfaces.               ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Spec sections 3 and 11. Open questions Q5, Q6 and Q11.
--
-- ── THE SHAPE ────────────────────────────────────────────────────────────────
-- The handle is the identity. The email is a convenience. Those are not equal
-- and the schema should not pretend they are:
--
--   instagram_handle    canonical. Unique. Proved by the DM code flow and by
--                       nothing else, ever.
--   edu_email           separate field, separate proof, separate purpose. Only
--                       a verified .edu address ever lands here.
--   email               a plain address nobody checked. It is a way to reach
--                       somebody, not a way to be somebody.
--
-- Two of those three are identifiers. The third is a note.
--
-- ── WHY A SESSION TABLE AND NOT THE PROOF ────────────────────────────────────
-- The product already has a session: `proof`, a browser-held secret whose
-- sha256 lives in celestual_ig_verifications. It works and it stays. What it
-- cannot do is represent a person who has verified a .edu address and has no
-- handle yet, because every row in that table is keyed on a handle.
--
-- Spec section 3 says Berkeley Wall and Main are one session and that
-- authenticating anything in either surface is enough to get a row. A person
-- who opens the wall with a berkeley.edu address and never touches Instagram is
-- exactly that case, and the proof cannot hold them. So: one session table,
-- pointing at a user row rather than at a handle.
--
-- The token is browser-minted and only its sha256 is stored, which is the same
-- trust model `proof` already uses. A reader of this table cannot become
-- anybody.
--
-- ── WHAT THIS MIGRATION DOES NOT TOUCH ───────────────────────────────────────
-- The DM code flow. Spec section 4 is explicit that it stays, so
-- celestual_start_ig_verification, celestual_complete_ig_verification,
-- celestual_poll_ig_verification and celestual_consume_ig_proof are not
-- modified, not wrapped and not replaced. celestual_user_bind_handle below
-- reads their result and writes handle_verified_at from it. That is the only
-- relationship between the old flow and the new table.
--
-- Nothing in the billing chain is touched either, per Q3. celestual_submit
-- still calls celestual_cap_for and that call chain is intact.

-- ── the person ───────────────────────────────────────────────────────────────
-- `instagram_handle` is nullable because spec section 3 says a row may exist
-- with an edu_email and no handle yet, and unique because two rows holding the
-- same handle is the duplicate the merge rule exists to prevent. A partial
-- unique index gives both: nulls do not collide with each other, and two rows
-- can never hold the same @.
--
-- `handle_verified_at` is not a convenience timestamp. It is the whole claim.
-- One function writes it, celestual_user_bind_handle, and that function will
-- not write it without a live proof from the DM flow. Spec section 4: resolving
-- a handle through Apify proves nothing about who is holding the browser, so
-- nothing on the resolution path may reach this column.
--
-- `edu_domain` is generated rather than stored by hand. Q11 chose berkeley.edu
-- only for launch with the schema shaped for per-campus walls later, and this
-- column is that shape: the campus key is already here, already indexed, and
-- opening a second campus is a change to the gate rather than a migration.
create table if not exists celestual_users (
  id                 uuid        primary key default gen_random_uuid(),

  instagram_handle   text,
  handle_verified_at timestamptz,

  email              text,

  edu_email          text,
  edu_verified_at    timestamptz,
  edu_domain         text generated always as
                       (nullif(split_part(lower(edu_email), '@', 2), '')) stored,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Set when this row was absorbed by a merge. A tombstone, not a delete: the
  -- free tier has no point in time recovery, so a merge that got it wrong has
  -- to be readable afterwards. Its identifiers are moved to the survivor and
  -- nulled here, which is what frees them from the unique indexes below.
  merged_into        uuid references celestual_users (id) on delete set null,
  merged_at          timestamptz,

  -- The handle is stored in celestual_norm() form and nothing else. Every other
  -- table in this schema keys on that form, and a users table that held
  -- '@Name' while celestual_members held 'name' would be two identities.
  constraint celestual_users_handle_norm_ck
    check (instagram_handle is null or instagram_handle = celestual_norm(instagram_handle)),

  -- Spec section 3: only a verified .edu address populates edu_email. The gate
  -- decides which .edu; the schema decides that it is one at all.
  constraint celestual_users_edu_shape_ck
    check (edu_email is null or edu_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.edu$'),
  constraint celestual_users_edu_lower_ck
    check (edu_email is null or edu_email = lower(edu_email)),

  -- A verification timestamp without the thing it verifies is a lie, and the
  -- thing without the timestamp is an unproved claim sitting in the canonical
  -- identity column. Neither is allowed to exist.
  constraint celestual_users_handle_pair_ck
    check ((instagram_handle is null) = (handle_verified_at is null)),
  constraint celestual_users_edu_pair_ck
    check ((edu_email is null) = (edu_verified_at is null)),

  constraint celestual_users_email_shape_ck
    check (email is null or (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),

  constraint celestual_users_merge_pair_ck
    check ((merged_into is null) = (merged_at is null)),
  constraint celestual_users_merge_self_ck
    check (merged_into is null or merged_into <> id),
  -- A tombstone holds no identifiers. This is what makes the unique indexes
  -- below able to hand the @ to the survivor.
  constraint celestual_users_tombstone_ck
    check (merged_into is null or (instagram_handle is null and edu_email is null))
);

create unique index if not exists celestual_users_handle_uidx
  on celestual_users (instagram_handle) where instagram_handle is not null;
create unique index if not exists celestual_users_edu_uidx
  on celestual_users (edu_email) where edu_email is not null;
create index if not exists celestual_users_email_idx
  on celestual_users (email) where email is not null;
create index if not exists celestual_users_campus_idx
  on celestual_users (edu_domain) where edu_domain is not null;
create index if not exists celestual_users_created_idx
  on celestual_users (created_at);

alter table celestual_users enable row level security;
revoke all on celestual_users from anon, authenticated;

comment on table celestual_users is
  'One row per person. Handle is the identity, edu_email is a second identifier, email is a note. Reached only through the SECURITY DEFINER functions below.';
comment on column celestual_users.handle_verified_at is
  'Written by celestual_user_bind_handle and nothing else. Apify resolution must never reach this column.';
comment on column celestual_users.edu_domain is
  'Generated. The campus key for per-campus walls. Q11 launches on one campus with this already in place.';

-- ── the session ──────────────────────────────────────────────────────────────
-- One token, both surfaces. The browser mints it, sends it, and only ever sends
-- it; the sha256 is what lands here. Thirty days, which is the TTL the rest of
-- this schema already uses for a session (celestual_redeem_login, and the DM
-- flow's own proof).
create table if not exists celestual_sessions (
  token_hash   text        primary key,
  user_id      uuid        not null references celestual_users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  constraint celestual_sessions_hash_ck check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists celestual_sessions_user_idx    on celestual_sessions (user_id);
create index if not exists celestual_sessions_expires_idx on celestual_sessions (expires_at);

alter table celestual_sessions enable row level security;
revoke all on celestual_sessions from anon, authenticated;

-- ── the merge trail ──────────────────────────────────────────────────────────
-- Spec section 3 says never silently overwrite. A merge that leaves no record
-- of what it absorbed is exactly that, so every merge writes here first.
create table if not exists celestual_user_merges (
  id          uuid        primary key default gen_random_uuid(),
  survivor_id uuid        not null,
  absorbed_id uuid        not null,
  reason      text        not null,
  before_json jsonb       not null,   -- both rows, verbatim, before anything moved
  moved_json  jsonb       not null,   -- which fields and which rows actually moved
  created_at  timestamptz not null default now()
);
create index if not exists celestual_user_merges_survivor_idx on celestual_user_merges (survivor_id);
create index if not exists celestual_user_merges_absorbed_idx on celestual_user_merges (absorbed_id);

alter table celestual_user_merges enable row level security;
revoke all on celestual_user_merges from anon, authenticated;

-- ── the stop and ask ─────────────────────────────────────────────────────────
-- Spec section 3: "If the merge would join two rows that each already have a
-- different verified handle, stop and ask." Q6 adds two different verified
-- edu_email values to that.
--
-- "Stop and ask" inside a database function means: change nothing, and leave a
-- record somewhere a person will see it. This table is that record, and Phase 7
-- puts it on the admin screen. The alternative, picking one and continuing, is
-- the thing the spec forbids.
create table if not exists celestual_merge_conflicts (
  id          uuid        primary key default gen_random_uuid(),
  kind        text        not null,   -- 'handle' | 'edu' | 'content'
  a_id        uuid        not null,
  b_id        uuid        not null,
  detail      jsonb       not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint celestual_merge_conflicts_kind_ck check (kind in ('handle', 'edu', 'content'))
);
create index if not exists celestual_merge_conflicts_open_idx
  on celestual_merge_conflicts (created_at desc) where resolved_at is null;

alter table celestual_merge_conflicts enable row level security;
revoke all on celestual_merge_conflicts from anon, authenticated;

-- ── celestual_user_public(uuid) ──────────────────────────────────────────────
-- The one shape the client is ever handed. It carries what the browser needs to
-- draw the right screen and nothing that would let it learn about anybody else.
-- The edu address comes back as its domain only: the wall needs to know you are
-- at Berkeley, it does not need your address read back to you to prove it, and
-- a function that echoes an address is a function that can be used to test one.
create or replace function celestual_user_public(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',              u.id,
    'handle',          u.instagram_handle,
    'handle_verified', u.handle_verified_at is not null,
    'email',           u.email,
    'edu_verified',    u.edu_verified_at is not null,
    'campus',          u.edu_domain
  )
  from celestual_users u
  where u.id = p_user and u.merged_into is null;
$$;

-- ── celestual_user_live(uuid) ────────────────────────────────────────────────
-- Follows a tombstone to the row that absorbed it. A session minted before a
-- merge still points at the absorbed row, and rather than rewriting every
-- session at merge time and hoping none was in flight, every read comes through
-- here. Bounded to eight hops so a cycle cannot hang a request; a cycle should
-- be impossible, and "should be impossible" is not a reason to write an
-- unbounded loop in something every request calls.
create or replace function celestual_user_live(p_user uuid)
returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_id   uuid := p_user;
  v_next uuid;
  i      int  := 0;
begin
  while i < 8 loop
    select merged_into into v_next from celestual_users where id = v_id;
    if v_next is null then return v_id; end if;
    v_id := v_next;
    i := i + 1;
  end loop;
  return null;
end;
$$;

-- ── celestual_user_merge(survivor, absorbed, reason) ─────────────────────────
-- The merge rule, spec section 3, as answered by Q5 and Q6.
--
--   survivor    always the older row. The caller works that out, because the
--               caller is the one that knows which two rows are in play.
--   handle      moves if the survivor has none. Two different verified handles
--               is the spec's stop condition and this function refuses.
--   edu_email   same, per Q6.
--   email       the survivor's is kept and the absorbed one is discarded, per
--               Q6, because it is unverified and low value.
--   content     follows its identity into the survivor.
--
-- ── how content follows ──────────────────────────────────────────────────────
-- Every foreign key in the schema that points at celestual_users(id) is found
-- in the catalogue and repointed, rather than listed here by hand. Phase 6a
-- adds the wall's tables and Phase 7 adds reports; both are covered the moment
-- they declare the reference, and neither has to remember to edit this
-- function. A hand-maintained list of tables to move is a list that will be
-- wrong on the first day somebody forgets it, and the failure is silent.
--
-- If a repoint hits a unique violation, the two rows both hold something that
-- can only exist once per person, the merge is abandoned whole, and the pair is
-- written to celestual_merge_conflicts as kind 'content'. Nothing partial is
-- ever left behind: the exception block wraps every write this function makes.
create or replace function celestual_user_merge(p_survivor uuid, p_absorbed uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a       celestual_users%rowtype;   -- survivor
  b       celestual_users%rowtype;   -- absorbed
  v_moved jsonb := '{}'::jsonb;
  v_rows  jsonb := '[]'::jsonb;
  fk      record;
  n       bigint;
begin
  if p_survivor is null or p_absorbed is null or p_survivor = p_absorbed then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into a from celestual_users where id = p_survivor for update;
  if not found or a.merged_into is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into b from celestual_users where id = p_absorbed for update;
  if not found or b.merged_into is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- ── the two stop conditions ───────────────────────────────────────────────
  if a.instagram_handle is not null and b.instagram_handle is not null
     and a.instagram_handle <> b.instagram_handle then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('handle', a.id, b.id,
            jsonb_build_object('a_handle', a.instagram_handle, 'b_handle', b.instagram_handle,
                               'reason', p_reason));
    return jsonb_build_object('ok', false, 'error', 'conflict_handle');
  end if;

  if a.edu_email is not null and b.edu_email is not null and a.edu_email <> b.edu_email then
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('edu', a.id, b.id,
            jsonb_build_object('a_campus', a.edu_domain, 'b_campus', b.edu_domain,
                               'reason', p_reason));
    return jsonb_build_object('ok', false, 'error', 'conflict_edu');
  end if;

  begin
    -- ── the identifiers ─────────────────────────────────────────────────────
    -- Cleared on the absorbed row first, so the unique indexes are free when
    -- the survivor takes them a statement later.
    if a.instagram_handle is null and b.instagram_handle is not null then
      update celestual_users set instagram_handle = null, handle_verified_at = null where id = b.id;
      update celestual_users
         set instagram_handle = b.instagram_handle, handle_verified_at = b.handle_verified_at
       where id = a.id;
      v_moved := v_moved || jsonb_build_object('handle', b.instagram_handle);
    elsif b.instagram_handle is not null then
      -- Same handle on both rows. It is already where it belongs.
      update celestual_users set instagram_handle = null, handle_verified_at = null where id = b.id;
      -- Keep the earlier of the two proofs: it is when this person actually
      -- first proved the @, and the later row is a re-verification.
      update celestual_users
         set handle_verified_at = least(a.handle_verified_at, b.handle_verified_at)
       where id = a.id;
    end if;

    if a.edu_email is null and b.edu_email is not null then
      update celestual_users set edu_email = null, edu_verified_at = null where id = b.id;
      update celestual_users
         set edu_email = b.edu_email, edu_verified_at = b.edu_verified_at
       where id = a.id;
      v_moved := v_moved || jsonb_build_object('edu_domain', b.edu_domain);
    elsif b.edu_email is not null then
      update celestual_users set edu_email = null, edu_verified_at = null where id = b.id;
      update celestual_users
         set edu_verified_at = least(a.edu_verified_at, b.edu_verified_at)
       where id = a.id;
    end if;

    -- ── the note ────────────────────────────────────────────────────────────
    -- Q6: the survivor's plain email wins. The absorbed one is discarded unless
    -- the survivor has none, in which case there is nothing to lose by taking
    -- it and a way to reach somebody to gain.
    if a.email is null and b.email is not null then
      update celestual_users set email = b.email where id = a.id;
      v_moved := v_moved || jsonb_build_object('email', b.email);
    end if;

    -- ── the content ─────────────────────────────────────────────────────────
    -- Single-column references only. celestual_users has a single-column
    -- primary key, so every honest reference to it is one column; a composite
    -- one would be pointing at something else and this function has no basis
    -- for rewriting it. It is raised rather than skipped, because a merge that
    -- quietly left content behind is the failure this loop exists to prevent.
    if exists (
      select 1 from pg_constraint c
       where c.contype = 'f' and c.confrelid = 'celestual_users'::regclass
         and c.conrelid <> 'celestual_users'::regclass
         and array_length(c.conkey, 1) <> 1
    ) then
      raise exception 'composite foreign key to celestual_users, merge cannot follow content'
        using errcode = 'foreign_key_violation';
    end if;

    for fk in
      select c.conrelid::regclass::text as tbl,
             quote_ident(att.attname) as col
        from pg_constraint c
        join pg_attribute att
          on att.attrelid = c.conrelid and att.attnum = c.conkey[1]
       where c.contype = 'f'
         and c.confrelid = 'celestual_users'::regclass
         and c.conrelid <> 'celestual_users'::regclass
       order by 1
    loop
      execute format('update %s set %s = $1 where %s = $2', fk.tbl, fk.col, fk.col)
        using a.id, b.id;
      get diagnostics n = row_count;
      if n > 0 then
        v_rows := v_rows || jsonb_build_array(jsonb_build_object('table', fk.tbl, 'rows', n));
      end if;
    end loop;

    -- Sessions ride the same catalogue loop above, so a token minted against
    -- the absorbed row now points at the survivor and the person stays signed
    -- in through their own merge. celestual_user_live covers any that did not.

    update celestual_users
       set merged_into = a.id, merged_at = now(), updated_at = now()
     where id = b.id;
    update celestual_users set updated_at = now() where id = a.id;

    insert into celestual_user_merges (survivor_id, absorbed_id, reason, before_json, moved_json)
    values (a.id, b.id, p_reason,
            jsonb_build_object('survivor', to_jsonb(a), 'absorbed', to_jsonb(b)),
            jsonb_build_object('fields', v_moved, 'rows', v_rows));

  exception when unique_violation or foreign_key_violation then
    -- Everything above rolls back to the start of this block. Both rows stand
    -- exactly as they were and the pair goes on the admin screen instead.
    insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
    values ('content', p_survivor, p_absorbed,
            jsonb_build_object('reason', p_reason, 'sqlstate', sqlstate, 'message', sqlerrm));
    return jsonb_build_object('ok', false, 'error', 'conflict_content');
  end;

  return jsonb_build_object('ok', true, 'user', a.id, 'moved', v_moved, 'rows', v_rows);
end;
$$;

-- ── celestual_session_bind(user, token_hash) ─────────────────────────────────
-- Internal. Opens or refreshes a session on a row. Only ever called from the
-- two bind functions below, which is to say: only ever after something was
-- actually proved.
create or replace function celestual_session_bind(p_user uuid, p_token_hash text)
returns void
language sql security definer set search_path = public as $$
  insert into celestual_sessions (token_hash, user_id, expires_at)
  values (lower(p_token_hash), p_user, now() + interval '30 days')
  on conflict (token_hash) do update
    set user_id      = excluded.user_id,
        last_seen_at = now(),
        expires_at   = excluded.expires_at;
$$;

-- ── celestual_session_user(token) ────────────────────────────────────────────
-- Internal. The raw token in, the live user id out. The caller always sends the
-- token; this is the only place it is hashed, so the stored hash is never
-- itself a credential.
create or replace function celestual_session_user(p_token text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_user uuid;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then return null; end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  update celestual_sessions set last_seen_at = now()
   where token_hash = v_hash and expires_at > now()
   returning user_id into v_user;
  if v_user is null then return null; end if;
  return celestual_user_live(v_user);
end;
$$;

-- ── celestual_whoami(token) ──────────────────────────────────────────────────
-- Client-callable. Which person is this browser, and what have they proved.
-- Returns the null shape rather than an error for an unknown token, because an
-- unknown token is the ordinary state of a first visit and not a failure.
create or replace function celestual_whoami(p_token text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := celestual_session_user(p_token);
begin
  if v_user is null then
    return jsonb_build_object('ok', true, 'signed_in', false);
  end if;
  return jsonb_build_object('ok', true, 'signed_in', true, 'user', celestual_user_public(v_user));
end;
$$;

-- ── celestual_user_bind_handle(token, handle, proof) ─────────────────────────
-- Client-callable. The DM code flow has just finished and this is where its
-- result becomes an identity.
--
-- The proof is checked against celestual_ig_verifications exactly the way
-- celestual_bind_login_email checks it, because that is the shipped definition
-- of "this browser owns this @" and a second, subtly different definition of
-- ownership is how a product ends up with two answers to one question.
--
-- ── the case the spec does not name ──────────────────────────────────────────
-- A session whose row already carries a DIFFERENT verified handle is treated as
-- a switch of account, not a merge: the session moves to the row that owns the
-- newly proved @, and the first row is not touched.
--
-- The spec's stop-and-ask is scoped to a merge, "if the MERGE would join two
-- rows", and a switch joins nothing. It creates no duplicate and overwrites
-- nothing, so both of the rule's absolutes hold. The alternative reading, that
-- proving a second @ is a conflict, would make signing into a second account
-- from one browser impossible. See open question Q23: this is the one place in
-- Phase 4b where the spec is silent and the code had to assume.
create or replace function celestual_user_bind_handle(p_token text, p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh      text := celestual_norm(p_handle);
  v_hash  text;
  v_first timestamptz;
  v_me    uuid;
  v_owner uuid;
  v_a     uuid;
  v_b     uuid;
  v_res   jsonb;
begin
  if nh is null or p_proof is null or length(p_proof) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 256 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Ownership, and only ownership, sets handle_verified_at.
  v_hash := encode(digest(p_proof, 'sha256'), 'hex');
  select min(v.verified_at) into v_first
    from celestual_ig_verifications v
   where v.handle = nh and v.status = 'verified' and v.proof_hash = v_hash and v.expires_at > now();
  if v_first is null then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  v_me    := celestual_session_user(p_token);
  select id into v_owner from celestual_users
   where instagram_handle = nh and merged_into is null;

  if v_owner is null then
    -- Nobody holds this @ yet.
    if v_me is null then
      insert into celestual_users (instagram_handle, handle_verified_at)
      values (nh, coalesce(v_first, now()))
      returning id into v_me;
    elsif (select instagram_handle from celestual_users where id = v_me) is null then
      update celestual_users
         set instagram_handle = nh, handle_verified_at = coalesce(v_first, now()), updated_at = now()
       where id = v_me;
    else
      -- The switch described above. A new row, and the session follows it.
      insert into celestual_users (instagram_handle, handle_verified_at)
      values (nh, coalesce(v_first, now()))
      returning id into v_me;
    end if;

  elsif v_me is null or v_me = v_owner then
    v_me := v_owner;

  elsif (select instagram_handle from celestual_users where id = v_me) is not null then
    -- Both rows carry a verified @ and they are different: a switch, not a
    -- merge. The session moves and neither row changes.
    v_me := v_owner;

  else
    -- The session's row has no @ of its own, so this is a genuine merge:
    -- somebody who came in through the wall with a .edu address has now proved
    -- their Instagram. Older row survives, spec section 3.
    select case when x.created_at <= y.created_at then x.id else y.id end,
           case when x.created_at <= y.created_at then y.id else x.id end
      into v_a, v_b
      from celestual_users x, celestual_users y
     where x.id = v_me and y.id = v_owner;

    v_res := celestual_user_merge(v_a, v_b, 'bind_handle');
    if not (v_res->>'ok')::boolean then
      return v_res;
    end if;
    v_me := v_a;
  end if;

  perform celestual_session_bind(v_me, encode(digest(p_token, 'sha256'), 'hex'));
  return jsonb_build_object('ok', true, 'user', celestual_user_public(v_me));
end;
$$;

-- ── celestual_user_bind_edu(token, email) ────────────────────────────────────
-- SERVICE ROLE ONLY, and that is the whole security of the wall's gate. This
-- function takes an address on trust and marks it verified, so the only caller
-- that may ever hold it is celestual-edu-verify, after its own code has
-- checked out. A client-callable version of this is a wall anybody can read.
--
-- Which .edu is allowed is not decided here. Q11 launches on berkeley.edu and
-- the gate enforces it; the schema takes any .edu so that opening a second
-- campus is a change to the gate rather than a migration.
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
  if ne is null or ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.edu$' then
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
      -- This row already holds a different verified .edu. Q6 makes that a stop
      -- condition between two rows, and it is the same collision here: two
      -- campus identities on one person, and no basis in the spec for picking.
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

-- ── celestual_user_set_email(token, email) ───────────────────────────────────
-- Client-callable. Attaches a plain address to the row already in session and
-- to nothing else.
--
-- Q5 is the whole of this function: an unverified email never triggers a merge.
-- If it did, typing somebody else's address would join their row to yours, and
-- an identity system where the takeover vector is a text field is not one.
-- So there is no lookup by email here. There is nowhere for one to go.
--
-- Passing null clears it, because a person who gave an address should be able
-- to take it back without a second function to do it.
create or replace function celestual_user_set_email(p_token text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ne   text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_me uuid := celestual_session_user(p_token);
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if ne is not null and ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  update celestual_users set email = ne, updated_at = now() where id = v_me;
  return jsonb_build_object('ok', true, 'user', celestual_user_public(v_me));
end;
$$;

-- ── celestual_sessions_prune() ───────────────────────────────────────────────
-- Expired sessions are dead weight. Called from the scheduled sweep alongside
-- celestual_purge_expired.
create or replace function celestual_sessions_prune()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from celestual_sessions where expires_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── the grants ───────────────────────────────────────────────────────────────
-- Three functions are callable by the browser, and each of the three requires
-- the browser to already hold a credential: a session token, or the DM flow's
-- proof. Everything that mints, merges, or takes an address on trust is service
-- role only.
revoke all on function celestual_user_public(uuid)                  from public, anon, authenticated;
revoke all on function celestual_user_live(uuid)                    from public, anon, authenticated;
revoke all on function celestual_user_merge(uuid, uuid, text)       from public, anon, authenticated;
revoke all on function celestual_session_bind(uuid, text)           from public, anon, authenticated;
revoke all on function celestual_session_user(text)                 from public, anon, authenticated;
revoke all on function celestual_user_bind_edu(text, text)          from public, anon, authenticated;
revoke all on function celestual_sessions_prune()                   from public, anon, authenticated;

grant execute on function celestual_user_bind_edu(text, text)       to service_role;
grant execute on function celestual_sessions_prune()                to service_role;

revoke all on function celestual_whoami(text)                       from public;
revoke all on function celestual_user_bind_handle(text, text, text) from public;
revoke all on function celestual_user_set_email(text, text)         from public;
grant execute on function celestual_whoami(text)                       to anon, authenticated;
grant execute on function celestual_user_bind_handle(text, text, text) to anon, authenticated;
grant execute on function celestual_user_set_email(text, text)         to anon, authenticated;

comment on function celestual_user_bind_handle(text, text, text) is
  'The only writer of handle_verified_at. Requires a live proof from the DM code flow.';
comment on function celestual_user_bind_edu(text, text) is
  'Service role only. Takes the address on trust, so only celestual-edu-verify may call it.';
comment on function celestual_user_merge(uuid, uuid, text) is
  'Spec section 3 merge rule. Older row survives. Refuses on two different verified handles or two different verified edu addresses.';

-- ── the backfill ─────────────────────────────────────────────────────────────
-- Q2 kept every existing row, so this table is filled from the people already
-- here rather than created empty. They keep the handles they proved and the
-- dates they proved them.
--
-- celestual_members is the source for the handle, because membership is already
-- defined as "has completed a DM verification" and 0006 backfilled it from
-- exactly that. celestual_ig_verifications supplies the date.
--
-- Idempotent: `on conflict do nothing` against the unique index, so re-running
-- this migration adds nobody twice.
insert into celestual_users (instagram_handle, handle_verified_at, created_at)
select m.handle,
       coalesce((select min(v.verified_at) from celestual_ig_verifications v
                  where v.handle = m.handle and v.status = 'verified'),
                m.first_verified_at),
       m.first_verified_at
  from celestual_members m
 where celestual_norm(m.handle) = m.handle
   and not exists (select 1 from celestual_users u where u.instagram_handle = m.handle);

-- The plain address, where one was ever bound under a live proof. Both sources
-- are empty in production today and both are carried anyway, because a backfill
-- that only works on today's data is a backfill that breaks on a restore.
update celestual_users u
   set email = r.email
  from celestual_recovery r
 where r.handle = u.instagram_handle and u.email is null
   and r.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
   and r.email = lower(r.email);

update celestual_users u
   set email = e.email
  from (select distinct on (handle) handle, email
          from celestual_email_identities order by handle, last_seen desc) e
 where e.handle = u.instagram_handle and u.email is null
   and e.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
   and e.email = lower(e.email);

-- The verified .edu addresses. These get rows of their own with no handle,
-- which is exactly the case spec section 3 describes: "A user row may exist
-- with an edu_email and no handle yet."
--
-- They are deliberately NOT joined to any handle row here. Nothing in the old
-- schema links a verified .edu to a verified @, so any join would be a guess,
-- and the merge rule exists precisely so that the link can be made later by the
-- person themselves, once, when they authenticate both in one session.
insert into celestual_users (edu_email, edu_verified_at, created_at)
select distinct on (lower(e.email)) lower(e.email), e.verified_at, e.created_at
  from celestual_edu_verifications e
 where e.status = 'verified'
   and lower(e.email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.edu$'
   and not exists (select 1 from celestual_users u where u.edu_email = lower(e.email))
 order by lower(e.email), e.verified_at asc;

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0027 · THE WALL                                                     ║
-- ║  A public wall of unsent letters, at /beta, addressed by handle.     ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- STRICTLY ADDITIVE. Every object below is new and every table is prefixed
-- `beta_`. This migration does not ALTER or DROP one existing table, does not
-- touch one existing policy, and does not change one existing function. If the
-- wall is a failure it is dropped in one migration and production has never
-- known it existed.
--
-- ── WHAT THE WALL IS ─────────────────────────────────────────────────────────
-- Somebody scans a QR code on a flyer, types their own Instagram handle, and
-- finds out whether anyone wrote them a letter they never sent. Nineteen of
-- twenty find nothing, which is the point: the null state is where the product
-- is actually sold.
--
-- ── THE ONE SECURITY PROPERTY EVERYTHING ELSE RESTS ON ───────────────────────
-- Two columns on beta_letters must never reach a browser:
--
--   author_handle   NEVER. Not on any request, by any actor, ever. The entire
--                   product is that the writer chooses whether to be known. A
--                   wall that leaks its authors is a wall that got somebody
--                   harassed, and it only has to happen once.
--   sealed_line     Not until the person the letter is ABOUT has proven the
--                   handle is theirs and asked for it.
--
-- The enforcement is not a policy on beta_letters and not a careful `select`
-- list in the client. It is that the client has no grant on beta_letters at
-- all, and the view it does have a grant on DOES NOT HAVE THOSE COLUMNS. A
-- forgotten filter, a `select *`, a misjudged policy and a clever PostgREST
-- query all fail the same way: there is nothing there to return.

-- ── the letters ──────────────────────────────────────────────────────────────
create table if not exists beta_letters (
  id            uuid primary key default gen_random_uuid(),
  target_handle text not null,                        -- normalized: lowercase, no '@'
  body          text not null,                        -- <= 280 chars, public
  sealed_line   text,                                 -- <= 90 chars, never sent until unlocked
  author_handle text not null,                        -- never sent to a client, ever
  campus        text not null default 'berkeley',
  source_code   text,                                 -- which QR surface produced this
  status        text not null default 'pending',      -- pending | live | rejected | removed
  moderation    jsonb,                                -- classifier output, kept as an audit trail
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  constraint beta_letters_body_len   check (char_length(body) between 1 and 280),
  constraint beta_letters_seal_len   check (sealed_line is null or char_length(sealed_line) <= 90),
  constraint beta_letters_status_ck  check (status in ('pending', 'live', 'rejected', 'removed')),
  constraint beta_letters_handle_ck  check (target_handle ~ '^[a-z0-9._]{3,30}$')
);

-- ── claims ───────────────────────────────────────────────────────────────────
-- A claim is a handle asserting that a letter is about them. It is worth
-- nothing until verified_at is set by the Edge Function that saw a real
-- Instagram DM code come back.
create table if not exists beta_claims (
  id          uuid primary key default gen_random_uuid(),
  letter_id   uuid not null references beta_letters(id) on delete cascade,
  handle      text not null,
  verified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (letter_id, handle)
);

-- ── the ask ──────────────────────────────────────────────────────────────────
-- One ask per letter, ever, enforced by the unique constraint rather than by
-- the interface. The recipient asks once and the author answers or does not;
-- a person who can ask repeatedly is a person applying pressure, and the whole
-- claim of this product is that the author is under none.
create table if not exists beta_reveal_requests (
  id          uuid primary key default gen_random_uuid(),
  letter_id   uuid not null references beta_letters(id) on delete cascade,
  status      text not null default 'pending',        -- pending | revealed | declined
  created_at  timestamptz not null default now(),
  unique (letter_id),
  constraint beta_reveal_status_ck check (status in ('pending', 'revealed', 'declined'))
);

-- ── the nineteen ─────────────────────────────────────────────────────────────
-- Everybody who looked and found nothing. Commercially this is the most
-- valuable table in the migration.
create table if not exists beta_waitlist (
  handle      text primary key,
  source_code text,
  created_at  timestamptz not null default now()
);

-- ── attribution ──────────────────────────────────────────────────────────────
-- Which flyer, which quote, which corner. The cheapest question in the campaign
-- and the only one you cannot answer retroactively.
create table if not exists beta_scans (
  id          bigserial primary key,
  source_code text not null,
  created_at  timestamptz not null default now()
);

create index if not exists beta_letters_target_live_idx
  on beta_letters (target_handle) where status = 'live';
create index if not exists beta_letters_expiry_live_idx
  on beta_letters (expires_at) where status = 'live';

-- ── THE PUBLIC VIEW ──────────────────────────────────────────────────────────
-- The only thing a browser may read. `author_handle` and `sealed_line` are not
-- columns here — not nulled, not filtered, ABSENT — so there is no query that
-- produces them and no policy mistake that can. `has_seal` answers the only
-- question the interface needs to ask about a seal: whether one exists.
--
-- security_invoker so the view does not become a privilege-escalation path in
-- some later migration that adds RLS to the base table and forgets this exists.
create or replace view beta_letters_public
  with (security_invoker = true) as
  select id, target_handle, body, campus, created_at, expires_at,
         (sealed_line is not null) as has_seal
    from beta_letters
   where status = 'live' and expires_at > now();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Deny by default on all five tables. Two narrow grants for anon (a scan can be
-- logged, a handle can be kept), and nothing else: every other operation goes
-- through the Edge Function with the service key, where the checks that matter
-- can actually be made.
alter table beta_letters         enable row level security;
alter table beta_claims          enable row level security;
alter table beta_reveal_requests enable row level security;
alter table beta_waitlist        enable row level security;
alter table beta_scans           enable row level security;

-- No policy is declared on beta_letters, beta_claims or beta_reveal_requests.
-- With RLS on and no policy, anon and authenticated can do nothing at all with
-- them, which is exactly the intent. The service role bypasses RLS.

drop policy if exists beta_scans_insert on beta_scans;
create policy beta_scans_insert on beta_scans
  for insert to anon, authenticated with check (true);

drop policy if exists beta_waitlist_insert on beta_waitlist;
create policy beta_waitlist_insert on beta_waitlist
  for insert to anon, authenticated with check (char_length(handle) between 3 and 30);

-- Reading the waitlist back is a way to ask "is this person interested in
-- being written to", which is nobody's business. Insert only.

revoke all on beta_letters         from anon, authenticated;
revoke all on beta_claims          from anon, authenticated;
revoke all on beta_reveal_requests from anon, authenticated;
revoke all on beta_waitlist        from anon, authenticated;
grant  insert on beta_waitlist     to anon, authenticated;
grant  insert on beta_scans        to anon, authenticated;
grant  select on beta_letters_public to anon, authenticated;

-- ── the takedown ─────────────────────────────────────────────────────────────
-- One tap, no questions, no appeal flow, from a verified handle. Called by the
-- Edge Function after it has checked the claim, never by a browser. It is a
-- status change rather than a delete so that a person who removes a letter and
-- then wants it back has not been made to regret a tap forever, and so the
-- moderation record survives the removal.
create or replace function beta_remove_letter(p_letter uuid, p_handle text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  select exists (
    select 1 from beta_claims c
     where c.letter_id = p_letter
       and c.handle = lower(p_handle)
       and c.verified_at is not null
  ) into ok;

  if not ok then return false; end if;

  update beta_letters set status = 'removed' where id = p_letter;
  return true;
end;
$$;

revoke all on function beta_remove_letter(uuid, text) from public, anon, authenticated;

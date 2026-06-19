-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ STILL · 0006 — anonymous reciprocal "does your ex still think       ║
-- ║ about you?" matching. ADDITIVE: creates only new `still_*` objects. ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Lives in the SAME Supabase project as DOLBOMI and touches NONE of the
-- existing tables. Safe to run on the live database.
--
-- The whole product: a person records a one-way "I still think about @them".
-- They learn whether it's mutual — and ONLY whether THEIR pair is mutual. The
-- raw "who entered whom" data is never readable by the client: anon/auth roles
-- get no table privileges and no RLS policy, so the only way in is the
-- SECURITY DEFINER `still_submit` RPC, which returns just a yes/no.
--
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- NORMALISE — strip a leading @, lowercase, keep only IG-legal characters.
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_norm(h text) returns text
language sql immutable as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(h, ''))), '^@+', ''),
      '[^a-z0-9._]', '', 'g'
    ),
  '')
$$;

-- ──────────────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────────────
-- One directed entry: from_handle "still thinks about" to_handle.
create table if not exists still_entries (
  id          uuid primary key default gen_random_uuid(),
  from_handle text not null,          -- normalised submitter @
  to_handle   text not null,          -- normalised ex/crush @
  from_email  text,                   -- optional, for the mutual-match email
  raw_from    text not null,          -- as typed (display / audit)
  raw_to      text not null,
  matched_at  timestamptz,            -- set when this pair becomes mutual
  created_at  timestamptz not null default now(),
  unique (from_handle, to_handle)
);
create index if not exists still_entries_to_idx on still_entries (to_handle);

-- One row per mutual pair (canonical a<b ordering), so a match is recorded once.
create table if not exists still_matches (
  id         uuid primary key default gen_random_uuid(),
  handle_a   text not null,
  handle_b   text not null,
  matched_at timestamptz not null default now(),
  unique (handle_a, handle_b)
);

-- Outbound email queue (drained by the still-notify edge function).
create table if not exists still_notifications (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid references still_matches(id) on delete cascade,
  to_email     text not null,
  self_handle  text not null,   -- recipient's @
  other_handle text not null,   -- the @ that entered them back
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists still_notifications_pending_idx
  on still_notifications (created_at) where sent_at is null;

-- ──────────────────────────────────────────────────────────────────────
-- RLS — lock the tables down. No policies + RLS on = no direct client access.
-- still_submit runs as the table owner (SECURITY DEFINER) and so bypasses RLS;
-- the edge function uses the service-role key, which also bypasses RLS.
-- ──────────────────────────────────────────────────────────────────────
alter table still_entries      enable row level security;
alter table still_matches      enable row level security;
alter table still_notifications enable row level security;

revoke all on still_entries      from anon, authenticated;
revoke all on still_matches      from anon, authenticated;
revoke all on still_notifications from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- still_submit — record my one-way entry and tell me (only me) if it's mutual.
-- Returns: { "matched": bool, "them": "<as typed>" }
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_submit(p_from text, p_to text, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := still_norm(p_from);
  nt text := still_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  reciprocal boolean;
  v_match_id uuid;
  ha text;
  hb text;
begin
  if nf is null or nt is null then
    raise exception 'invalid handle';
  end if;
  if nf = nt then
    raise exception 'same handle';
  end if;

  -- Record / refresh this directed entry. Re-submitting the same pair keeps a
  -- previously-given email if the new submission omits one.
  insert into still_entries (from_handle, to_handle, from_email, raw_from, raw_to)
  values (nf, nt, ne, p_from, p_to)
  on conflict (from_handle, to_handle) do update
    set from_email = coalesce(excluded.from_email, still_entries.from_email),
        raw_from   = excluded.raw_from,
        raw_to     = excluded.raw_to;

  -- Did they already enter us?
  select true into reciprocal
    from still_entries
   where from_handle = nt and to_handle = nf
   limit 1;

  if not coalesce(reciprocal, false) then
    return jsonb_build_object('matched', false);
  end if;

  -- Mutual. Stamp both directed entries.
  update still_entries set matched_at = coalesce(matched_at, now())
   where (from_handle = nf and to_handle = nt)
      or (from_handle = nt and to_handle = nf);

  -- Record the match once (canonical ordering). If it already existed, the
  -- emails were already queued — do nothing, so nobody is mailed twice.
  ha := least(nf, nt);
  hb := greatest(nf, nt);
  insert into still_matches (handle_a, handle_b)
  values (ha, hb)
  on conflict (handle_a, handle_b) do nothing
  returning id into v_match_id;

  if v_match_id is not null then
    insert into still_notifications (match_id, to_email, self_handle, other_handle)
    select v_match_id, e.from_email, e.from_handle, e.to_handle
      from still_entries e
     where ((e.from_handle = nf and e.to_handle = nt)
         or (e.from_handle = nt and e.to_handle = nf))
       and e.from_email is not null;
  end if;

  return jsonb_build_object('matched', true, 'them', p_to);
end;
$$;

-- Only the RPC is exposed to the public roles.
revoke all on function still_submit(text, text, text) from public;
grant execute on function still_submit(text, text, text) to anon, authenticated;
grant execute on function still_norm(text) to anon, authenticated;

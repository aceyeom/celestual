-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0002 — safety: rate limiting + anti-exfiltration on the  ║
-- ║ mutual-match email. ADDITIVE & idempotent. Touches only still_*.     ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Closes the two cheapest attack surfaces from PRODUCT-ANALYSIS.md §2.1/§3
-- WITHOUT requiring handle-ownership verification (Instagram OAuth), which
-- remains the only *complete* fix and is tracked as the next P0:
--
--   1. Mass probing ("write everyone down to see who's into me"): the RPC
--      returns matched yes/no per pair, so an attacker can sweep many targets.
--      → Per-IP and per-handle rate limits make a wide sweep impractical.
--
--   2. Email exfiltration via impersonation: an attacker submits someone
--      else's handle as `from` with their OWN email; if the target already
--      entered that handle, the match email lands in the attacker's inbox,
--      naming the target.
--      → We now NEVER notify the email supplied on the request that *triggers*
--        the match. The submitter is live and already sees the result on
--        screen; only the other (earlier) entrant — who left the app — is
--        emailed. This removes the instant inbox-exfiltration path. (A handle
--        planted-and-waited still needs ownership verification to fully close;
--        see the note above.)
--
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE.

-- ──────────────────────────────────────────────────────────────────────
-- ATTEMPT LOG — minimal, for rate limiting only. Auto-pruned; locked down
-- like the other still_* tables (RLS on, no client policies/grants).
-- ──────────────────────────────────────────────────────────────────────
create table if not exists still_attempts (
  id          bigserial primary key,
  ip          text,
  from_handle text,
  to_handle   text,
  created_at  timestamptz not null default now()
);
create index if not exists still_attempts_ip_idx   on still_attempts (ip, created_at);
create index if not exists still_attempts_from_idx on still_attempts (from_handle, created_at);

alter table still_attempts enable row level security;
revoke all on still_attempts from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- still_submit — same contract as 0006, now rate-limited and exfil-safe.
-- Returns: { "matched": false } | { "matched": true, "them": "<as typed>" }
--          { "error": "rate_limited" } when throttled.
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_submit(p_from text, p_to text, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := still_norm(p_from);
  nt text := still_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_ip   text;
  v_ipn  int;
  v_fromn int;
  reciprocal boolean;
  v_match_id uuid;
  ha text;
  hb text;
  -- Tunable trailing-hour limits. Generous enough for honest use (you get a
  -- few free + paid pings), tight enough that sweeping a contact list trips it.
  c_ip_per_hour   constant int := 40;
  c_from_per_hour constant int := 20;
begin
  if nf is null or nt is null then
    raise exception 'invalid handle';
  end if;
  if nf = nt then
    raise exception 'same handle';
  end if;

  -- Best-effort client IP (PostgREST exposes the forwarded headers as a GUC).
  begin
    v_ip := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
    v_ip := nullif(trim(v_ip), '');
  exception when others then
    v_ip := null;
  end;

  -- Rate limit on the trailing hour. Same-pair resubmits are idempotent below,
  -- but each still counts here so a script can't grind one handle endlessly.
  if v_ip is not null then
    select count(*) into v_ipn
      from still_attempts
     where ip = v_ip and created_at > now() - interval '1 hour';
    if v_ipn >= c_ip_per_hour then
      return jsonb_build_object('matched', false, 'error', 'rate_limited');
    end if;
  end if;
  select count(*) into v_fromn
    from still_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then
    return jsonb_build_object('matched', false, 'error', 'rate_limited');
  end if;

  -- Log this attempt, then prune old rows ~2% of the time to keep it small.
  insert into still_attempts (ip, from_handle, to_handle) values (v_ip, nf, nt);
  if random() < 0.02 then
    delete from still_attempts where created_at < now() - interval '2 hours';
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
    -- Exfil-safe: notify ONLY the OTHER side (the earlier entrant, from_handle
    -- = nt). The current submitter (nf) is live and sees the result now, so we
    -- never email the address supplied on this triggering request.
    insert into still_notifications (match_id, to_email, self_handle, other_handle)
    select v_match_id, e.from_email, e.from_handle, e.to_handle
      from still_entries e
     where e.from_handle = nt and e.to_handle = nf
       and e.from_email is not null;
  end if;

  return jsonb_build_object('matched', true, 'them', p_to);
end;
$$;

revoke all on function still_submit(text, text, text) from public;
grant execute on function still_submit(text, text, text) to anon, authenticated;

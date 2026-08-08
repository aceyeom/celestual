-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · CLEAR ONE ACCOUNT (or a few) — the surgical reset            ║
-- ║ ⚠ DESTRUCTIVE. IRREVERSIBLE. Edit the handle list, then run it.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- NOT a migration — like wipe-all-user-data.sql this file lives outside
-- supabase/migrations on purpose, so no `db push` ever runs it by accident.
-- Paste it into the SQL editor yourself when you mean it.
--
-- Currently aimed at:  ace03d, sogeum_in   (the `handles` array below).
--
-- ── WHY THIS EXISTS, when two erasures already do ──────────────────────────
-- The product has two: `celestual_erase_account(@)` (the account screen's
-- "delete everything") and `celestual_admin_delete_user(@)` (the desk's, via
-- the celestual-admin function). Both are erasures — written to satisfy "take
-- my data off your servers" — and both leave three things behind that a person
-- carries back with them when they re-verify the same handle:
--
--   · celestual_placements  — the rolling 30-day cadence log. It is what caps
--     new pings at six per rolling 30 days, and it is keyed on the handle, so
--     it survives the erase. A handle that has spent its six is still spent
--     after a delete: the next placement comes back `rate_limited`, and nothing
--     on screen can explain why. For a test account this is the one that bites.
--   · celestual_handle_links — the identity group (up to three @s as one
--     person). A re-registered handle is still in its old group, so a linked
--     alt's standing pings still count against its cap and celestual_link will
--     not move it into a different group.
--   · celestual_recruits / celestual_recruit_signups — the First Light trial
--     row and tracking code. (The desk's delete does take these; the account
--     screen's erase does not.)
--
-- This script does everything either erasure does AND takes those three, so the
-- handle comes back genuinely at zero: no standing pings, no spent cadence, no
-- group, no membership, unverified, and owed nothing.
--
-- ── WHAT IT DELIBERATELY DOES NOT TOUCH ────────────────────────────────────
--   · celestual_suppressions — an opt-out is a promise, not account data. If
--     one of these handles asked never to be entered, that stands; the readback
--     at the end says so, and lifting it is a separate, deliberate line
--     (`celestual_admin_unban_user`), not a side effect of housekeeping.
--   · celestual_settings — the handle_salt above all. Every hash here is
--     computed with it; erase the salt and the incoming rows stop matching.
--   · celestual_purchases — the Stripe ledger row is kept and de-identified
--     (handle → null), exactly as celestual_billing_forget does it, so a
--     payment can still be reconciled against Stripe after the person is gone.
--     REFUND ANYTHING REAL IN STRIPE FIRST — the entitlement it bought IS
--     deleted here, and re-registering does not bring it back.
--
-- Every table is guarded with to_regclass, so this runs whether or not the
-- hand-applied identity tables (celestual_email_identities /
-- celestual_login_links) exist.

begin;

do $$
declare
  -- ── WHO ────────────────────────────────────────────────────────────────
  handles constant text[] := array['ace03d', 'sogeum_in'];

  -- ── AND THE PINGS OTHER PEOPLE PLACED AT THEM? ─────────────────────────
  -- true  = what both erasures do: the incoming rows go too, because the
  --         product's promise is that nothing referencing an erased handle
  --         survives anywhere. Note what that means to the sender — their ping
  --         disappears without a word, their slot silently frees, and the
  --         cadence they spent placing it does not come back.
  -- false = clear only what these accounts did and hold. Somebody else's
  --         standing ping at them survives, and matches the day they return.
  --         The honest choice for a test-account reset on a live database.
  c_take_inbound constant boolean := true;

  h    text;
  nh   text;
  hh   text;
  pair text[];
  n    bigint;
  per  bigint;
  total bigint := 0;
  v_code text;
  v_standing int;
  v_placed30 int;
  v_member   boolean;
  v_optout   boolean;
  v_linked   int;

  -- table, predicate. %1$L is the normalised handle, %2$L its salted hash.
  -- Children before parents so each count is the rows THIS step took, not the
  -- leftovers of a cascade (notifications and the DM outbox both cascade off
  -- celestual_matches).
  targets constant text[][] := array[
    -- the news of a match, and the ways to deliver it
    ['celestual_dm_outbox',         'handle = %1$L or other_handle = %1$L'],
    ['celestual_dm_contacts',       'handle = %1$L'],
    ['celestual_notifications',     'self_handle = %1$L or other_handle = %1$L'],
    ['celestual_matches',           'handle_a = %1$L or handle_b = %1$L'],
    -- the pings THEY placed (the incoming ones are a separate, flagged step)
    ['celestual_entries',           'from_handle = %1$L'],
    -- identity, membership, the ways back in
    ['celestual_members',           'handle = %1$L'],
    ['celestual_community_members', 'handle = %1$L'],
    ['celestual_campus_prereg',     'handle = %1$L'],
    ['celestual_recovery',          'handle = %1$L'],
    ['celestual_relogin_tokens',    'handle = %1$L'],
    ['celestual_ig_verifications',  'handle = %1$L'],
    ['celestual_email_identities',  'handle = %1$L'],
    ['celestual_login_links',       'handle = %1$L'],
    ['celestual_handle_links',      'handle = %1$L'],
    -- what they were owed
    ['celestual_entitlements',      'handle = %1$L'],
    -- the trial program
    ['celestual_recruit_signups',   'handle = %1$L'],
    ['celestual_recruits',          'handle = %1$L'],
    -- the counters that would otherwise follow them back
    ['celestual_placements',        'handle = %1$L'],
    ['celestual_attempts',          'from_handle = %1$L or to_handle = %2$L']
  ];
begin
  foreach h in array handles loop
    nh := celestual_norm(h);
    if nh is null then
      raise notice 'skip   % — not a legal handle', h;
      continue;
    end if;
    hh := celestual_hash_handle(nh);
    if hh is null then
      raise exception 'no handle_salt in celestual_settings — every hash here would be wrong';
    end if;
    per := 0;
    raise notice '── @% ─────────────────────────────────────────', nh;

    -- The pings placed AT them, first and on their own line, because this is
    -- the one step that reaches into other people's accounts.
    if c_take_inbound then
      delete from celestual_entries
       where (to_hash = hh or matched_handle = nh or to_handle = nh)
         and from_handle <> nh;
      get diagnostics n = row_count;
      per := per + n;
      raise notice '  %  incoming pings (other people''s rows)', lpad(n::text, 5);
    end if;

    -- Their trial code takes its own counters with it: a code that outlives its
    -- owner keeps counting opens and crediting signups to nobody.
    if to_regclass('public.celestual_recruits') is not null then
      select code into v_code from celestual_recruits where handle = nh;
      if v_code is not null then
        if to_regclass('public.celestual_recruit_visits') is not null then
          delete from celestual_recruit_visits where code = v_code;
          get diagnostics n = row_count;
          per := per + n;
          raise notice '  %  tracking-link days for code %', lpad(n::text, 5), v_code;
        end if;
        if to_regclass('public.celestual_recruit_signups') is not null then
          delete from celestual_recruit_signups where code = v_code;
          get diagnostics n = row_count;
          per := per + n;
          raise notice '  %  signups credited to code %', lpad(n::text, 5), v_code;
        end if;
      end if;
    end if;

    foreach pair slice 1 in array targets loop
      if to_regclass('public.' || pair[1]) is null then
        raise notice '  skip   % (table absent)', pair[1];
        continue;
      end if;
      execute format('delete from %I where %s', pair[1], format(pair[2], nh, hh));
      get diagnostics n = row_count;
      per := per + n;
      raise notice '  %  %', lpad(n::text, 5), pair[1];
    end loop;

    -- The ledger stays, de-identified — celestual_billing_forget's second half.
    if to_regclass('public.celestual_purchases') is not null then
      update celestual_purchases set handle = null where handle = nh;
      get diagnostics n = row_count;
      raise notice '  %  purchases kept, de-identified', lpad(n::text, 5);
    end if;

    total := total + per;
    raise notice '  = % rows cleared for @%', per, nh;
  end loop;

  raise notice '=== cleared: % rows. suppressions, settings and the Stripe ledger stand. ===', total;

  -- ── THE READBACK ───────────────────────────────────────────────────────
  -- What the product would now say about each handle. All zeroes and false,
  -- except `opted_out` if they had asked never to be entered — that survives
  -- on purpose, and it is the one flag worth seeing before you hand the
  -- account back.
  raise notice '── after ─────────────────────────────────────────';
  foreach h in array handles loop
    nh := celestual_norm(h);
    continue when nh is null;
    hh := celestual_hash_handle(nh);

    select count(*) into v_standing from celestual_entries
     where from_handle = nh and matched_at is null and expires_at > now();
    select count(*) into v_placed30 from celestual_placements
     where handle = nh and created_at > now() - interval '30 days';
    select exists (select 1 from celestual_members where handle = nh) into v_member;
    select exists (select 1 from celestual_suppressions where handle_hash = hh) into v_optout;
    select count(*) into v_linked from celestual_handle_links where handle = nh;

    raise notice '@% standing % · placed(30d) % · member % · linked % · opted_out %',
      rpad(nh, 18), v_standing, v_placed30, v_member, v_linked, v_optout;
  end loop;
end;
$$;

commit;

-- ── IF YOU ONLY WANT THE PRODUCT'S OWN ERASURE ─────────────────────────────
-- One line each, both re-runnable. Neither clears the cadence log or the
-- identity group, and the first also leaves the trial row — which is the whole
-- reason the block above exists.
--
--   select celestual_erase_account('ace03d');     -- what the account screen calls
--   select celestual_admin_delete_user('ace03d'); -- what the desk calls
--
-- ── AND IF ONE OF THEM IS OPTED OUT AND SHOULD NOT BE ──────────────────────
--   select celestual_admin_unban_user('ace03d');

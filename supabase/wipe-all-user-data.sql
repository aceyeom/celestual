-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · WIPE ALL USER DATA — the First Light reset                   ║
-- ║ ⚠ DESTRUCTIVE. IRREVERSIBLE. Run it deliberately, once, before launch.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- NOT a migration — this file lives outside supabase/migrations on purpose so
-- no `db push` ever runs it by accident. Paste it into the SQL editor yourself
-- when you mean it.
--
-- WHAT IT ERASES: every registered account and everything any account produced.
-- Pings, matches, the mutual-mail queue, members, DM verifications (successful
-- and pending), .edu codes, email identities and login links, recovery
-- bindings, magic-link tokens, multi-account links, the whole recruitment /
-- trial program (competitors, link counters, credited signups, trial email
-- codes), placement logs and rate-limit logs.
--
-- WHAT IT KEEPS, deliberately:
--   · celestual_suppressions — people who opted out STAY opted out. An opt-out
--     is a promise, not user data; wiping it would re-open doors people asked
--     to have closed.
--   · celestual_settings     — operator flags (require_ig_verification,
--     handle_salt). NOTE the salt especially: suppressions are stored as
--     salted hashes, so the salt must survive for them to keep matching.
--   · celestual_communities / celestual_campuses — operator-created spaces
--     (their member/prereg rows are user data and DO go).
--
-- Every table is guarded with to_regclass, so this runs cleanly whether or not
-- migration 0017 (celestual_trial_emails) or the hand-applied identity tables
-- (celestual_email_identities / celestual_login_links) exist.

begin;

do $$
declare
  t text;
  n bigint;
  total bigint := 0;
  tables constant text[] := array[
    -- the ping model
    'celestual_notifications',
    'celestual_matches',
    'celestual_entries',
    'celestual_placements',
    -- identity & verification
    'celestual_members',
    'celestual_handle_links',
    'celestual_ig_verifications',
    'celestual_edu_verifications',
    'celestual_recovery',
    'celestual_relogin_tokens',
    'celestual_email_identities',
    'celestual_login_links',
    -- communities & campuses (memberships only; the spaces themselves stay)
    'celestual_community_members',
    'celestual_campus_prereg',
    'celestual_campus_mail',
    -- the recruitment / trial program
    'celestual_recruit_visits',
    'celestual_recruit_signups',
    'celestual_recruits',
    'celestual_trial_emails',
    -- logs
    'celestual_attempts'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip   % (table absent)', t;
      continue;
    end if;
    execute format('delete from %I', t);
    get diagnostics n = row_count;
    total := total + n;
    raise notice 'wiped  % rows from %', n, t;
  end loop;
  raise notice '=== wipe complete: % rows erased. suppressions and settings preserved. ===', total;
end;
$$;

commit;

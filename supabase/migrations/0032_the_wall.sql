-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0032 · THE WALL, ON A SERVER                                        ║
-- ║  Everything the wall did in one tab, done where it survives.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Spec sections 6, 8 and 9. Open questions Q10 and Q11.
--
-- ── WHAT THIS REPLACES ───────────────────────────────────────────────────────
-- `app/src/wall/data.js` line 3 says it plainly: "Everything here is in memory.
-- This build is a visual prototype: it reaches no server, it stores nothing
-- anybody typed anywhere but this tab." The whole wall lives in one
-- localStorage key, `celestual.wall.v5`. It has never persisted a byte.
--
-- 0027 built five tables for it and nothing ever wrote to them. They are still
-- empty. So this migration is not a schema change to a running feature; it is
-- the first time the feature has had a schema that anything will use.
--
-- ── THE RENAME, AND WHY NOW ──────────────────────────────────────────────────
-- Q10: the `beta_` prefix goes. The word describes nothing (the surface is
-- `/berkeley`), the tables are empty, and renaming is free exactly once. The
-- five tables are dropped and rebuilt rather than renamed in place, because
-- three of them change shape as well as name and an empty table is the one
-- thing it is honest to drop.
--
-- ── WHAT 0027 GOT RIGHT, KEPT VERBATIM ───────────────────────────────────────
-- Its central property, and it is the reason the wall can exist:
--
--   The client has NO GRANT on the letters table, and the thing it can read
--   DOES NOT HAVE the columns that would hurt somebody. Not nulled, not
--   filtered: absent. A forgotten filter, a `select *`, a misjudged policy and
--   a clever PostgREST query all fail the same way, because there is nothing
--   there to return.
--
-- That property is preserved and extended. In 0027 the public view carried
-- `body`, which meant every letter on the wall was readable by the open
-- internet. `app/src/wall/auth.js` says the opposite in its own header: "THE
-- INDEX IS PUBLIC. THE LETTERS ARE NOT," and describes a letter arriving
-- redacted to a stranger and whole to somebody with a berkeley.edu address. The
-- view and the design disagreed, and the design is right. So:
--
--   wall_index          public. A handle and a count. No body, ever.
--   wall_letters_for()  the bodies, and only behind the campus gate.
--
-- ── THE AUTHOR IS A ROW NOW, NOT A STRING ────────────────────────────────────
-- 0027 held `author_handle text not null`, which could not be filled by
-- somebody who came in through the wall with a .edu address and no Instagram.
-- It is `author_id` referencing `celestual_users` instead. Three things fall
-- out of that and all three are wanted:
--
--   1. A wall writer needs a campus, not a handle, which is what the wall
--      actually requires of them.
--   2. The merge rule in 0030 follows every foreign key to `celestual_users`
--      through the catalogue, so a person's letters follow them through a merge
--      with nothing here to remember.
--   3. It is still never sent to a browser, by the same mechanism as before.
--
-- ── CAMPUS ───────────────────────────────────────────────────────────────────
-- Q11: berkeley.edu only for launch, with the schema shaped for per-campus
-- walls later. `wall_campuses` is that shape. It has one row today, the gate
-- reads the domain out of it rather than hardcoding one, and opening a second
-- campus is an insert.

-- ── out with the beta ────────────────────────────────────────────────────────
-- All five are empty in production. Verified at the time of writing, and the
-- drop is ordered so the dependent tables go before the one they reference.
drop view  if exists beta_letters_public;
drop table if exists beta_reveal_requests;
drop table if exists beta_claims;
drop table if exists beta_scans;
drop table if exists beta_waitlist;
drop table if exists beta_letters;
drop function if exists beta_remove_letter(uuid, text);

-- ── the campuses ─────────────────────────────────────────────────────────────
-- One row per wall. `edu_domain` is the whole of the gate: a session may read a
-- campus's letters when its verified address is at that domain, and the check
-- lives in one function rather than in every screen.
--
-- `is_open` is what lets a campus exist before it opens, which is how a second
-- one gets set up without being readable while it is being set up.
create table if not exists wall_campuses (
  slug       text        primary key,
  name       text        not null,
  edu_domain text        not null unique,
  is_open    boolean     not null default false,
  created_at timestamptz not null default now(),
  constraint wall_campuses_slug_ck   check (slug ~ '^[a-z0-9-]{2,40}$'),
  constraint wall_campuses_domain_ck check (edu_domain ~ '^[a-z0-9.-]+\.edu$')
);

insert into wall_campuses (slug, name, edu_domain, is_open)
values ('berkeley', 'UC Berkeley', 'berkeley.edu', true)
on conflict (slug) do nothing;

alter table wall_campuses enable row level security;
revoke all on wall_campuses from anon, authenticated;

-- ── the letters ──────────────────────────────────────────────────────────────
create table if not exists wall_letters (
  id            uuid        primary key default gen_random_uuid(),
  target_handle text        not null,                    -- normalised: lowercase, no @
  body          text        not null,                    -- <= 280 chars
  sealed_line   text,                                    -- <= 90, never sent until unlocked
  author_id     uuid        not null references celestual_users (id) on delete cascade,
  campus        text        not null references wall_campuses (slug),
  source_code   text,                                    -- which QR surface produced this
  status        text        not null default 'pending',  -- pending | live | rejected | removed
  moderation    jsonb,                                   -- the classifier's own words, kept
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  constraint wall_letters_body_len   check (char_length(body) between 1 and 280),
  constraint wall_letters_seal_len   check (sealed_line is null or char_length(sealed_line) <= 90),
  constraint wall_letters_status_ck  check (status in ('pending', 'live', 'rejected', 'removed')),
  constraint wall_letters_handle_ck  check (target_handle ~ '^[a-z0-9._]{3,30}$'),
  constraint wall_letters_source_ck  check (source_code is null or source_code ~ '^[a-z0-9_-]{1,32}$')
);

create index if not exists wall_letters_target_live_idx
  on wall_letters (target_handle) where status = 'live';
create index if not exists wall_letters_expiry_live_idx
  on wall_letters (expires_at) where status = 'live';
create index if not exists wall_letters_author_idx  on wall_letters (author_id);
create index if not exists wall_letters_pending_idx on wall_letters (created_at desc)
  where status in ('pending', 'rejected');

-- ── claims ───────────────────────────────────────────────────────────────────
-- A claim is a person saying a letter is about them. In 0027 it carried its own
-- `verified_at`, which was a second copy of a fact that now lives in one place:
-- a user row either has a verified handle or it does not. So the claim records
-- the act and the time, and whether it is worth anything is read live off the
-- user. Two copies of a verification is one copy that can be wrong.
create table if not exists wall_claims (
  id         uuid        primary key default gen_random_uuid(),
  letter_id  uuid        not null references wall_letters (id) on delete cascade,
  user_id    uuid        not null references celestual_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (letter_id, user_id)
);
create index if not exists wall_claims_user_idx on wall_claims (user_id);

-- ── the ask ──────────────────────────────────────────────────────────────────
-- One ask per letter, ever, enforced by the unique constraint rather than by
-- the interface. The recipient asks once and the author answers or does not; a
-- person who can ask repeatedly is a person applying pressure, and the whole
-- claim of this product is that the author is under none.
create table if not exists wall_reveal_requests (
  id          uuid        primary key default gen_random_uuid(),
  letter_id   uuid        not null references wall_letters (id) on delete cascade,
  asked_by    uuid        not null references celestual_users (id) on delete cascade,
  status      text        not null default 'pending',    -- pending | revealed | declined
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  unique (letter_id),
  constraint wall_reveal_status_ck check (status in ('pending', 'revealed', 'declined')),
  constraint wall_reveal_answer_ck check ((status = 'pending') = (answered_at is null))
);

-- ── the nineteen ─────────────────────────────────────────────────────────────
-- Everybody who looked and found nothing. Commercially the most valuable table
-- here, and the one with the least in it.
create table if not exists wall_waitlist (
  handle      text        not null,
  campus      text        not null references wall_campuses (slug),
  source_code text,
  created_at  timestamptz not null default now(),
  primary key (handle, campus),
  constraint wall_waitlist_handle_ck check (handle ~ '^[a-z0-9._]{3,30}$')
);

-- ── attribution ──────────────────────────────────────────────────────────────
-- Which flyer, which quote, which corner. The cheapest question in the campaign
-- and the only one that cannot be answered retroactively.
create table if not exists wall_scans (
  id          bigserial   primary key,
  source_code text        not null,
  campus      text        not null references wall_campuses (slug),
  created_at  timestamptz not null default now(),
  constraint wall_scans_source_ck check (source_code ~ '^[a-z0-9_-]{1,32}$')
);
create index if not exists wall_scans_source_idx on wall_scans (source_code, created_at);

-- ── reports ──────────────────────────────────────────────────────────────────
-- New. Spec section 10 asks for "a reporting mechanism for user-flagged content,
-- with an action path from report to removal", and there was no table for it.
--
-- The letter comes down on the tap, before anybody reasons about anything, and
-- the reasoning happens to a letter nobody can see.
-- `app/src/wall/moderate.js` argues it at length and it is the right way round:
-- publishing is pre-moderated because the screenshot exists before you delete
-- it, and reporting is post-moderated for exactly the same reason.
--
-- So `wall_report` sets the letter to 'removed' in the same statement that
-- files the report, and `status` here is about the REPORT, not the letter: open
-- until a person at the admin screen upholds it or dismisses it, and dismissing
-- it is what puts the letter back.
create table if not exists wall_reports (
  id          uuid        primary key default gen_random_uuid(),
  letter_id   uuid        not null references wall_letters (id) on delete cascade,
  reporter_id uuid        references celestual_users (id) on delete set null,
  reason      text        not null,
  status      text        not null default 'open',       -- open | upheld | dismissed
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  constraint wall_reports_reason_ck   check (char_length(reason) between 1 and 400),
  constraint wall_reports_status_ck   check (status in ('open', 'upheld', 'dismissed')),
  constraint wall_reports_resolve_ck  check ((status = 'open') = (resolved_at is null))
);
create index if not exists wall_reports_open_idx on wall_reports (created_at desc)
  where status = 'open';
create index if not exists wall_reports_letter_idx on wall_reports (letter_id);

-- ── THE PUBLIC INDEX ─────────────────────────────────────────────────────────
-- The only thing a browser reads without answering anything, and the only thing
-- with a select grant on it anywhere in this migration.
--
-- A handle, how many letters it carries, and when the last one arrived. Not
-- `body`, not `sealed_line`, not `author_id`, not `status`, not `moderation`.
-- Absent, not filtered.
--
-- This is what the wall of tiles is drawn from, and it is public on purpose:
-- somebody who has just scanned a code off a flyer has to be able to see the
-- wall in four seconds without answering anything, and a name has to be
-- findable by the person it belongs to before they can ask for it to come off.
--
-- security_invoker so this cannot become a privilege escalation path in some
-- later migration that adds a policy to wall_letters and forgets this exists.
create or replace view wall_index
  with (security_invoker = true) as
  select l.target_handle,
         l.campus,
         count(*)::int   as letters,
         max(l.created_at) as last_at
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, l.campus;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Deny by default on every table. One narrow policy, for the scan, because a
-- scan is a fact about a flyer rather than about a person and the QR path has
-- to work before anybody has answered anything. Everything else goes through
-- the SECURITY DEFINER functions below, where the checks that matter can be
-- made.
alter table wall_letters         enable row level security;
alter table wall_claims          enable row level security;
alter table wall_reveal_requests enable row level security;
alter table wall_waitlist        enable row level security;
alter table wall_scans           enable row level security;
alter table wall_reports         enable row level security;

revoke all on wall_letters         from anon, authenticated;
revoke all on wall_claims          from anon, authenticated;
revoke all on wall_reveal_requests from anon, authenticated;
revoke all on wall_waitlist        from anon, authenticated;
revoke all on wall_scans           from anon, authenticated;
revoke all on wall_reports         from anon, authenticated;

grant select on wall_index to anon, authenticated;

-- ── wall_gate(user, campus) ──────────────────────────────────────────────────
-- May this person read this campus's letters. The whole of Q11 lives here: the
-- domain is read out of wall_campuses rather than written into a function, so a
-- second campus is an insert and not a migration.
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
       and u.edu_domain = c.edu_domain
  );
$$;

-- ── wall_letters_for(token, handle) ──────────────────────────────────────────
-- Every live letter addressed to one handle.
--
-- A stranger gets the shape and not the words: the id, when it arrived, whether
-- it carries a seal, and `body` as null. Somebody through the gate gets the
-- words. That is `auth.js`'s "the letter arrives redacted to a stranger and
-- whole to somebody with a berkeley.edu address", and it is done here rather
-- than in the client because a redaction the client performs is not a redaction.
--
-- `sealed_line` is not in either shape. It has its own function and its own
-- rule, below.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  nh   text := celestual_norm(p_handle);
  v_me uuid := celestual_session_user(p_token);
  v_open boolean;
  v_rows jsonb;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  -- One campus is open today, so the gate is asked about that one. When there
  -- are several this takes the campus the letters are on, which is why the
  -- column is on every row rather than assumed.
  select bool_or(wall_gate(v_me, l.campus)) into v_open
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();
  v_open := coalesce(v_open, false);

  -- `words` and `chars` are sent whether or not the body is. A redaction has to
  -- be drawn at the right size or it is a grey box pretending to be a letter, and
  -- a person outside the gate should be able to see that somebody wrote forty
  -- words rather than four. Two integers is the least that buys that: the client
  -- invents the individual word lengths from the letter's own id, deterministically,
  -- so the same letter always redacts the same way and no word-level shape leaks.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',       l.id,
           'handle',   l.target_handle,
           'body',     case when v_open then l.body end,
           'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
           'chars',    char_length(l.body),
           'has_seal', l.sealed_line is not null,
           'campus',   l.campus,
           'at',       l.created_at,
           'expires',  l.expires_at
         ) order by l.created_at desc), '[]'::jsonb)
    into v_rows
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();

  return jsonb_build_object('ok', true, 'open', v_open, 'handle', nh, 'letters', v_rows);
end;
$$;

-- ── wall_letter(token, id) ───────────────────────────────────────────────────
-- One letter, same rule.
create or replace function wall_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  l      wall_letters%rowtype;
  v_open boolean;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_open := wall_gate(v_me, l.campus);
  -- Whether the reader is the person it is about. It changes the screen (the
  -- ask, the takedown) and it requires a verified handle, not a campus.
  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );

  return jsonb_build_object('ok', true, 'open', v_open, 'letter', jsonb_build_object(
    'id',       l.id,
    'handle',   l.target_handle,
    'body',     case when v_open then l.body end,
    'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
    'chars',    char_length(l.body),
    'has_seal', l.sealed_line is not null,
    'campus',   l.campus,
    'at',       l.created_at,
    'expires',  l.expires_at,
    'mine',     v_mine
  ));
end;
$$;

-- ── wall_search(query) ───────────────────────────────────────────────────────
-- Over the public index and nothing else, so it can be called before anybody
-- has answered anything. Exact handle first, then anything containing what was
-- typed, which is what `data.js` does today and for the reason it gives: a
-- person who half-remembers a handle still lands somewhere, and a person who
-- types their own exact handle lands on themselves and not on a list of
-- near-misses.
create or replace function wall_search(p_query text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.exact desc, t.pos, t.len), '[]'::jsonb)
  from (
    select i.target_handle as handle, i.letters, i.last_at, i.campus,
           (i.target_handle = celestual_norm(p_query))          as exact,
           strpos(i.target_handle, celestual_norm(p_query))     as pos,
           char_length(i.target_handle)                         as len
      from wall_index i
     where celestual_norm(p_query) is not null
       and char_length(celestual_norm(p_query)) >= 2
       and i.target_handle like '%' || celestual_norm(p_query) || '%'
     limit 24
  ) t;
$$;

-- ── wall_write(...) ──────────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. The screening decided the status, and the screening
-- happens in celestual-wall-moderate. A browser that could call this could
-- publish at status 'live'.
--
-- Spec section 9: rejected content is STORED with its reason so it appears in
-- admin, not silently dropped. So a reject is an insert like any other, with
-- `status = 'rejected'` and the classifier's own words in `moderation`. A
-- letter that nobody can see is still a letter somebody wrote, and the only way
-- to know whether the screen is working is to be able to read what it caught.
create or replace function wall_write(
  p_token   text,
  p_target  text,
  p_body    text,
  p_seal    text,
  p_source  text,
  p_campus  text,
  p_status  text,
  p_moderation jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh   text := celestual_norm(p_target);
  v_me uuid := celestual_session_user(p_token);
  v_id uuid;
begin
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if p_status not in ('pending', 'live', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  -- Writing is gated on the campus, same as reading. An anonymous letter about
  -- a named student, publishable by anybody on earth with a browser, is not
  -- anonymity: it is an open relay pointed at somebody.
  if not wall_gate(v_me, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  -- A name that has come off the wall stays off it. Otherwise the takedown is a
  -- delete button rather than a decision, and the next person to type the
  -- handle undoes it without ever knowing it happened.
  if exists (
    select 1 from wall_letters
     where target_handle = nh and status = 'removed' and campus = p_campus
  ) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  insert into wall_letters (target_handle, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, p_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status);
end;
$$;

-- ── wall_claim(token, letter) ────────────────────────────────────────────────
-- This letter is about me. Worth nothing without a verified handle that matches
-- the one it is addressed to, and that verification comes from the DM code flow
-- through 0030 rather than from anything here.
create or replace function wall_claim(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  insert into wall_claims (letter_id, user_id) values (p_letter, v_me)
  on conflict (letter_id, user_id) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── wall_reveal_request(token, letter) ───────────────────────────────────────
-- Asking the author to unseal the line. Once per letter for the life of the
-- letter, and the unique constraint is what enforces it rather than the screen.
create or replace function wall_reveal_request(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if l.sealed_line is null then return jsonb_build_object('ok', false, 'error', 'no_seal'); end if;

  if not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  insert into wall_reveal_requests (letter_id, asked_by) values (p_letter, v_me)
  on conflict (letter_id) do nothing;

  return jsonb_build_object('ok', true, 'status',
    (select status from wall_reveal_requests where letter_id = p_letter));
end;
$$;

-- ── wall_reveal_answer(token, letter, reveal) ────────────────────────────────
-- The author answers, once. Declining is a real answer and is recorded as one:
-- a request left pending forever and a request declined read differently to the
-- person who asked, and the difference is the point of the feature.
create or replace function wall_reveal_answer(p_token text, p_letter uuid, p_reveal boolean)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  v_st text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  if not exists (select 1 from wall_letters where id = p_letter and author_id = v_me) then
    return jsonb_build_object('ok', false, 'error', 'not_yours');
  end if;

  update wall_reveal_requests
     set status = case when p_reveal then 'revealed' else 'declined' end,
         answered_at = now()
   where letter_id = p_letter and status = 'pending'
   returning status into v_st;

  if v_st is null then return jsonb_build_object('ok', false, 'error', 'no_request'); end if;
  return jsonb_build_object('ok', true, 'status', v_st);
end;
$$;

-- ── wall_letter_seal(token, letter) ──────────────────────────────────────────
-- The sealed line, and the only function in the schema that returns it.
--
-- Three things must all be true: the caller holds the verified handle the
-- letter is addressed to, they asked, and the author said yes. Anything short
-- of all three answers the same way, which is to say it answers nothing.
create or replace function wall_letter_seal(p_token text, p_letter uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  v_line text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  select l.sealed_line into v_line
    from wall_letters l
    join wall_reveal_requests r on r.letter_id = l.id and r.status = 'revealed'
    join celestual_users u on u.id = v_me
   where l.id = p_letter
     and l.status = 'live'
     and u.merged_into is null
     and u.handle_verified_at is not null
     and u.instagram_handle = l.target_handle;

  if v_line is null then return jsonb_build_object('ok', false, 'error', 'sealed'); end if;
  return jsonb_build_object('ok', true, 'seal', v_line);
end;
$$;

-- ── wall_waitlist_add(handle, campus, source) ────────────────────────────────
-- The nineteen of twenty who looked and found nothing.
--
-- Insert only, and there is no function anywhere that reads it back. Reading it
-- is a way to ask "is this person interested in being written to", which is
-- nobody's business.
create or replace function wall_waitlist_add(p_handle text, p_campus text, p_source text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare nh text := celestual_norm(p_handle);
begin
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;
  if not exists (select 1 from wall_campuses where slug = p_campus and is_open) then
    return jsonb_build_object('ok', false, 'error', 'campus');
  end if;
  insert into wall_waitlist (handle, campus, source_code)
  values (nh, p_campus, nullif(left(coalesce(p_source, ''), 32), ''))
  on conflict (handle, campus) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── wall_scan(source, campus) ────────────────────────────────────────────────
-- A scan is a fact about a flyer, not about a person, and it has to work before
-- anybody has answered anything.
create or replace function wall_scan(p_source text, p_campus text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s text := lower(nullif(left(btrim(coalesce(p_source, '')), 32), ''));
begin
  if s is null or s !~ '^[a-z0-9_-]{1,32}$' then
    return jsonb_build_object('ok', false, 'error', 'source');
  end if;
  if not exists (select 1 from wall_campuses where slug = p_campus) then
    return jsonb_build_object('ok', false, 'error', 'campus');
  end if;
  insert into wall_scans (source_code, campus) values (s, p_campus);
  return jsonb_build_object('ok', true);
end;
$$;

-- ── wall_report(token, letter, reason) ───────────────────────────────────────
-- The letter comes down on the tap.
--
-- This is the opposite of the publishing rule and it is the opposite for the
-- same reason. Publishing is pre-moderated because the screenshot exists before
-- you delete it. Reporting is post-moderated because of that same fact: a
-- report queue that leaves the letter up while a model thinks about it has
-- understood the asymmetry backwards. So the status change and the report are
-- one statement, and the review happens to a letter nobody can see.
--
-- Reporting needs the campus gate and nothing more. A control that takes a
-- public letter down on one tap has to cost something to reach, or the wall's
-- contents are decided by whoever is bored; a campus address is the cheapest
-- thing that is not nothing.
create or replace function wall_report(p_token text, p_letter uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;
  if not wall_gate(v_me, l.campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  insert into wall_reports (letter_id, reporter_id, reason)
  values (p_letter, v_me, left(btrim(coalesce(p_reason, 'unspecified')), 400));

  update wall_letters set status = 'removed' where id = p_letter and status = 'live';
  return jsonb_build_object('ok', true);
end;
$$;

-- ── wall_remove_letter(token, letter) ────────────────────────────────────────
-- The takedown by the person the letter is about. One tap, no questions, no
-- appeal flow, from a verified handle.
--
-- A status change rather than a delete, so a person who removes a letter and
-- then wants it back has not been made to regret a tap forever, and so the
-- moderation record survives the removal. That was 0027's reasoning and it
-- still holds.
--
-- It also files the claim in the same breath, because reaching this function at
-- all means proving the handle, and making somebody do that twice for one act
-- is a worse product for no more safety.
create or replace function wall_remove_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  select * into l from wall_letters where id = p_letter;
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if not exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  ) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;

  insert into wall_claims (letter_id, user_id) values (p_letter, v_me)
  on conflict (letter_id, user_id) do nothing;

  update wall_letters set status = 'removed' where id = p_letter;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── wall_expire() ────────────────────────────────────────────────────────────
-- A letter stands for thirty days. Nothing here deletes one: the index and
-- every read already filter on `expires_at > now()`, so an expired letter is
-- invisible without being destroyed, and admin can still see what the wall
-- carried. This exists for the scheduled sweep to keep the pending queue from
-- silently holding a letter forever if a classifier was down the day it was
-- written.
create or replace function wall_expire()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update wall_letters set status = 'rejected',
         moderation = coalesce(moderation, '{}'::jsonb)
                      || jsonb_build_object('verdict', 'reject', 'reasons', jsonb_build_array('expired_in_review'))
   where status = 'pending' and created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── the grants ───────────────────────────────────────────────────────────────
-- The browser may: read the index (a view, granted above), search it, read
-- letters through the gate, claim, ask, answer, unseal, join the waitlist, log
-- a scan, report, and take its own letters down. Every one of those either
-- needs no credential at all (the index, search, the scan) or checks a session
-- inside the function.
--
-- The browser may NOT write a letter. wall_write is service role only, because
-- the status it takes is the screening's decision.
revoke all on function wall_gate(uuid, text)                                    from public, anon, authenticated;
revoke all on function wall_write(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function wall_expire()                                            from public, anon, authenticated;
grant execute on function wall_gate(uuid, text)                                 to service_role;
grant execute on function wall_write(text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function wall_expire()                                         to service_role;

revoke all on function wall_letters_for(text, text)        from public;
revoke all on function wall_letter(text, uuid)             from public;
revoke all on function wall_search(text)                   from public;
revoke all on function wall_claim(text, uuid)              from public;
revoke all on function wall_reveal_request(text, uuid)     from public;
revoke all on function wall_reveal_answer(text, uuid, boolean) from public;
revoke all on function wall_letter_seal(text, uuid)        from public;
revoke all on function wall_waitlist_add(text, text, text) from public;
revoke all on function wall_scan(text, text)               from public;
revoke all on function wall_report(text, uuid, text)       from public;
revoke all on function wall_remove_letter(text, uuid)      from public;

grant execute on function wall_letters_for(text, text)        to anon, authenticated;
grant execute on function wall_letter(text, uuid)             to anon, authenticated;
grant execute on function wall_search(text)                   to anon, authenticated;
grant execute on function wall_claim(text, uuid)              to anon, authenticated;
grant execute on function wall_reveal_request(text, uuid)     to anon, authenticated;
grant execute on function wall_reveal_answer(text, uuid, boolean) to anon, authenticated;
grant execute on function wall_letter_seal(text, uuid)        to anon, authenticated;
grant execute on function wall_waitlist_add(text, text, text) to anon, authenticated;
grant execute on function wall_scan(text, text)               to anon, authenticated;
grant execute on function wall_report(text, uuid, text)       to anon, authenticated;
grant execute on function wall_remove_letter(text, uuid)      to anon, authenticated;

comment on view wall_index is
  'The only thing on the wall a browser reads without answering anything. A handle and a count. No body, no author, no seal.';
comment on function wall_letter_seal(text, uuid) is
  'The only function that returns sealed_line. Requires the verified handle, a request, and the author having said yes.';
comment on function wall_write(text, text, text, text, text, text, text, jsonb) is
  'Service role only. The status is the screening decision, so a browser that could call this could publish unscreened.';

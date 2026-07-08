-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0007 — school (.edu) email verification for membership   ║
-- ║ prove you're at a school before you can ping into its community sky  ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- A ping only ever reaches people from your own community, so membership is real,
-- not self-declared: joining a school requires proving you're there with a one-time
-- code emailed to an address at that school's domain. This table backs the
-- celestual-edu-verify edge function, which is the ONLY thing that reads or writes
-- it (via the service role) — the browser never touches it directly.
--
-- The 6-digit code is a SECRET (unlike the Instagram DM correlation code): it is
-- emailed, never returned to the browser, and only its SHA-256 hash is stored here,
-- so a leak of this table reveals no live codes. Rows self-expire after ~10 minutes.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE).

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- EDU VERIFICATIONS — one row per code issued.
--   • status 'pending'  : code emailed, waiting for the user to enter it (TTL ~10m)
--   • status 'verified' : the code matched; the address→school claim is confirmed
-- `token` is a random correlation id handed to the browser (never a secret);
-- `code_hash` is sha256(code). Locked down: no client can read it — the edge
-- function uses the service role, which bypasses RLS.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_edu_verifications (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,          -- correlation id handed to the browser
  email       text not null,                 -- lowercased school address
  slug        text not null,                 -- community (school) being joined
  code_hash   text not null,                 -- sha256 hex of the 6-digit code
  attempts    int  not null default 0,       -- wrong guesses so far (capped)
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  verified_at timestamptz
);
create index if not exists celestual_edu_email_idx   on celestual_edu_verifications (email);
create index if not exists celestual_edu_expires_idx on celestual_edu_verifications (expires_at);

alter table celestual_edu_verifications enable row level security;
-- No client grant: only the service role (the celestual-edu-verify edge function)
-- ever reads or writes this table. Anon/authenticated get nothing.
revoke all on celestual_edu_verifications from anon, authenticated;

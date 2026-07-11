-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0008 — .edu verification hardening                       ║
-- ║ per-IP send accounting, so code email can't be sprayed               ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- 0007 rate-limits fresh codes per ADDRESS (5/hour), which stops hammering one
-- inbox but not spraying codes across many addresses from one machine. This adds
-- the sender's IP to each row so the celestual-edu-verify edge function can also
-- cap sends per IP per hour. The column is nullable (older rows, or a missing
-- x-forwarded-for, simply don't count against the cap).
--
-- Re-runnable (IF NOT EXISTS / guarded ALTER).

alter table celestual_edu_verifications add column if not exists ip text;
create index if not exists celestual_edu_ip_idx
  on celestual_edu_verifications (ip, created_at);

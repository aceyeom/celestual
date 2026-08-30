-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0028 · THE HANDLE RESOLVER                                          ║
-- ║  A typed @ becomes a face and a name before anybody presses send.    ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- STRICTLY ADDITIVE. Two new tables, both prefixed `celestual_handle_`. This
-- migration does not ALTER or DROP one existing table, does not touch one
-- existing policy, and does not change one existing function. Nothing already
-- in the product reads either table, so with the feature flag off the whole
-- thing is inert; drop both tables in one migration and production has never
-- known it existed.
--
-- ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
-- A ping is placed at a handle typed from memory. A typo resolves to nobody
-- and NOTHING IN THE PRODUCT CAN EVER SAY SO: the ping stands for sixty days
-- against an @ that does not exist, and the person who placed it reads the
-- silence as an answer. The two-tap confirm was the only guard, and it only
-- ever confirmed the spelling against itself.
--
-- So: show the account. A display name and a face under the field, fetched
-- server-side, and the person confirms against a person rather than against
-- their own typing.
--
-- ── THE TWO THINGS THIS TABLE IS NOT ─────────────────────────────────────────
-- It is not a directory. There is no read grant on it for anon, no RPC that
-- returns rows from it, and no way to enumerate it: the only reader is the
-- service role inside supabase/functions/celestual-resolve, and it only ever
-- answers about a handle somebody already typed in full. Nothing in here
-- discloses who uses celestual, who was pinged, or who looked anybody up.
--
-- It is not an image store. `pic_url` is a URL, not a picture. Instagram's CDN
-- URLs are signed and expire within hours, so a copied image would be a stale
-- 403 by tomorrow and a copied FILE would be us hosting somebody's face. The
-- edge function proxies the live URL on demand and keeps no bytes.

-- ── the cache ────────────────────────────────────────────────────────────────
-- One row per handle, keyed on the normalised (lowercased, bare) form, which
-- is the same key celestual_norm() produces everywhere else in the schema.
--
-- A miss is cached too, and that matters: without it, every keystroke of a
-- handle that does not exist is a fresh call to a metered provider. `found`
-- is the flag, and the two TTLs are different (see the edge function): a hit
-- is good for 24 hours, a miss for one, because a handle that does not exist
-- yet is exactly the kind of fact that changes.
create table if not exists celestual_handle_cache (
  handle        text primary key,
  found         boolean     not null default false,
  display_name  text,                                  -- the account's own display name
  is_verified   boolean     not null default false,    -- the badge, if the account has one
  is_private    boolean     not null default false,
  pic_url       text,                                  -- a URL, never an image. signed, expires.
  source        text,                                  -- which provider answered
  fetched_at    timestamptz not null default now(),
  constraint celestual_handle_cache_handle_ck check (handle ~ '^[a-z0-9._]{1,30}$'),
  constraint celestual_handle_cache_name_len  check (display_name is null or char_length(display_name) <= 120),
  constraint celestual_handle_cache_pic_len   check (pic_url is null or char_length(pic_url) <= 2048)
);

-- The sweeper's index. Rows older than the longest TTL are dead weight and get
-- deleted opportunistically rather than by a cron.
create index if not exists celestual_handle_cache_fetched_idx
  on celestual_handle_cache (fetched_at);

-- ── the ledger ───────────────────────────────────────────────────────────────
-- What was looked up, by which device, from which address, and when. It exists
-- for exactly one purpose: the caps below. It is not analytics, nothing reads
-- it but the rate limiter, and rows are swept once they are past every window.
--
-- `device` is a random opaque id the browser mints for itself and keeps in
-- localStorage. It is not an account, it is not derived from anything about
-- the person, it survives no reinstall, and it is trivially resettable. That is
-- the correct strength for what it does: it makes casual abuse cost something
-- without pretending to be identity.
--
-- `ip` is the second, much more lenient net, and it is deliberately loose. One
-- Berkeley address is a whole residence hall behind one NAT, so a strict IP cap
-- would lock out a floor because one person typed a lot. It is set high enough
-- to be invisible to a building and low enough to stop a script.
create table if not exists celestual_handle_lookups (
  id         bigserial   primary key,
  device     text,                               -- opaque, browser-minted, resettable
  ip         text,
  handle     text        not null,
  billed     boolean     not null default true,  -- false when a cache hit made it free
  created_at timestamptz not null default now(),
  constraint celestual_handle_lookups_device_len check (device is null or char_length(device) <= 64),
  constraint celestual_handle_lookups_handle_len check (char_length(handle) <= 30)
);

create index if not exists celestual_handle_lookups_device_idx
  on celestual_handle_lookups (device, created_at desc);
create index if not exists celestual_handle_lookups_ip_idx
  on celestual_handle_lookups (ip, created_at desc);
create index if not exists celestual_handle_lookups_created_idx
  on celestual_handle_lookups (created_at);

-- ── the grants, which is to say: none ────────────────────────────────────────
-- RLS on and NO policy declared on either table. With RLS enabled and no
-- policy, anon and authenticated can do nothing at all with these rows: no
-- select, no insert, no update, no delete, whatever they ask PostgREST for.
-- The service role bypasses RLS, and the service role is only ever held by the
-- edge function. There is no grant to revoke later because there is no grant.
alter table celestual_handle_cache   enable row level security;
alter table celestual_handle_lookups enable row level security;

revoke all on celestual_handle_cache   from anon, authenticated;
revoke all on celestual_handle_lookups from anon, authenticated;

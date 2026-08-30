# Supabase backend

The backend for **CELESTUAL** — the ping model
([../docs/ULTIMATE-PRODUCT-FRAMEWORK.md](../docs/ULTIMATE-PRODUCT-FRAMEWORK.md)).

Everything is named `celestual_*`. The raw data is never readable by the
client: `anon` / `authenticated` get no table privileges and no RLS policy, so
the only way in is the `SECURITY DEFINER` RPCs, which return small status
objects. Since 0006, **who a ping points at is stored only as a salted hash** —
even a full dump can't read the map. See [../docs/SECURITY.md](../docs/SECURITY.md).

## Apply the schema

Idempotent migrations, applied in order:

- `migrations/0001_celestual.sql` — the original matching core (entries,
  matches, notifications, rate limiting, suppressions).
- `migrations/0002_user_accounts.sql` — the old Supabase-Auth profile layer
  (superseded; 0006 drops it).
- `migrations/0003_production_hardening.sql` — the old weekly slot budget +
  multi-account identity groups + instant reveal (slot model superseded by 0006;
  `celestual_handle_links` and group-aware matching live on).
- `migrations/0004_ig_verification.sql` — **Instagram DM handle-ownership
  verification** (no OAuth): codes + proof hashes, the `require_ig_verification`
  flag, start/poll RPCs, the service-role completion path, and the proof gate
  in `celestual_submit`.
- `migrations/0005_cross_device_sky.sql` — the old owner-gated read-back
  (superseded by `celestual_my_pings` in 0006).
- `migrations/0006_ping_model.sql` — **the current model.** Three standing
  pings, sixty-day lapse + purge, salted-hash targets, hashed opt-out,
  members/reachability, community counters (100-floor),
  assurance-contract campus windows, and every current RPC.
- `migrations/0007_edu_verification.sql` — the school (.edu) email gate:
  one-time codes for community membership, hash-stored, service-role only
  (see docs/EDU-VERIFICATION.md).
- `migrations/0008_edu_hardening.sql` — per-IP send accounting for the .edu
  gate, so code email can't be sprayed from one machine.
- `migrations/0009_verification_hardening.sql` — **the auth-audit pass**:
  spoof-resistant rate-limit IPs (`celestual_client_ip` prefers
  `cf-connecting-ip` over the forgeable x-forwarded-for first hop), the
  verified DM session raised from 24 h to a **30-day sliding window** (active
  users never redo the DM dance), `celestual_norm` capped at Instagram's
  30-char handle max, and a token index for poll reads.

- `migrations/0010_verification_rerun_and_named_restore.sql` — **the re-run
  fix + named restore**: `celestual_complete_ig_verification` now answers
  `already_verified` / `code_expired` when nothing is pending (so a re-sent DM
  gets an honest reply instead of a dead-end — half of the "verification works
  once, then never again" report; the other half is the ManyChat Default-Reply
  trigger trap, documented in docs/MANYCHAT-SETUP.md), restates 0009's 30-day
  sliding sessions for databases that stopped earlier, and retires the
  device-locked ping restore: `celestual_submit` stores the normalised
  plaintext target beside its hash, and `celestual_my_pings` returns every
  live ping NAMED to the DM-proven owner (matching/suppression still run on
  hashes; pre-0010 rows stay anonymous until re-placed).

- `migrations/0011_pending_ttl_24h.sql` — raises the pending-code TTL from
  10 minutes to 24 hours (captures a live hand-edit into git).

- `migrations/0012_ig_code_pure_correlation.sql` — **the code becomes a pure
  correlation id (Fix C).** `celestual_complete_ig_verification` now adopts the
  Meta-authenticated DMing account as the identity (overwriting the typed hint)
  instead of demanding username == typed handle, and
  `celestual_poll_ig_verification` returns that adopted @ to the proof-holder.
  Removes the entire `handle_mismatch` class (the "different @" reply is gone).

- `migrations/0013_durable_relogin.sql` — **durable, DM-free recovery (Fix B).**
  New `celestual_recovery` (handle⇄email, written only under a live proof via
  `celestual_bind_recovery`) and `celestual_relogin_tokens` (hash-stored,
  single-use, 20-min magic-link tokens). `celestual_relogin_store` /
  `celestual_relogin_redeem` (service-role only) issue and redeem the link,
  minting a fresh 30-day proof with no DM. The opt-out wipe now covers both.

- `migrations/0014_ig_code_6digit_30min.sql` — **DM code tuning.** Widens the
  pending code from 4 to 6 digits (~100× smaller collision surface) and shortens
  its TTL from 24 h to 30 min (the durable re-login removed the repeat-DM pressure
  the long TTL guarded against). The relays parse `\d{4,6}` through the cutover.

- `migrations/0015_identity_start.sql` — **the identity router.**
  `celestual_handle_route(handle)` answers, read-only, which way in an @ takes:
  unknown (sign up), known with no bound address (prove it by DM), or known with
  one (mail the sign-in link, and hand back the address masked to
  `j•••@gmail.com`). Service-role only. This is what let the sign-in screen stop
  offering two doors and stop hedging in print about which one worked.

- `migrations/0016_recruit_program.sql` — **the recruitment program.**
  `celestual_recruits` (one row per person who commented under the recruitment
  reel: the invite, the signed agreement version, the name typed as a signature,
  their personal code), `celestual_recruit_visits` (one integer per code per day,
  no visitor identity of any kind) and `celestual_recruit_signups`
  `(code, handle)`, written only for a handle celestual has actually verified.
  Two hashed secrets: the one-time invite token and the recruit's own dashboard
  key, both minted outside Postgres. `celestual_suppress` extended to erase all
  three. Nothing here meets `celestual_entries`, so it can never see who pinged
  whom. **Setup: [../docs/RECRUITMENT.md](../docs/RECRUITMENT.md)** (retired —
  see 0017)

- `migrations/0017_first_light_trial.sql` — **the First Light trial.**
  Self-serve competitor signup on `/trial` replaces the 0016 comment→DM loop:
  email-ownership codes (`celestual_trial_emails`, hash-stored),
  `celestual_trial_claim` / `celestual_trial_login` / `celestual_trial_check`
  (service-role only, called by the `celestual-trial` function), trial columns
  on `celestual_recruits` (verified email, source, one email = one competitor)
  and CHOSEN four-letter codes at the site root. Plus the **20-second DM
  grace** (`celestual_ig_verify_timeout`, proof-gated, temporary — admitted the
  typed @ as `verified_via='timeout'` so the admin dashboard could list what was
  assumed; **closed by 0026** — revoked from every client role and emptied to a
  refusal, so only a real DM verifies now),
  `celestual_complete_ig_verification` v6 (stamps `verified_via='dm'`, refuses
  banned handles), and the **admin dashboard RPCs** (`celestual_admin_overview` /
  `_delete_user` / `_ban_user` / `_delete_competitor`, service-role only,
  password-gated in the `celestual-admin` function).
  **Runbook: [../docs/FIRST-LIGHT-TRIAL.md](../docs/FIRST-LIGHT-TRIAL.md)**

- `migrations/0018_verification_lockout.sql` → `0020_two_different_doors.sql` —
  the verification lockout, the four-digit code + the admin desk, and the split of
  "delete everything" from "never let anyone enter me" (`celestual_erase_account`
  alongside `celestual_suppress`, with `kind` on `celestual_suppressions`).

- `migrations/0021_stripe_slots.sql` — **the money layer, dormant.**
  `celestual_entitlements` (what a handle is owed, read across the identity
  group), `celestual_purchases` (the ledger, and the idempotency key of the whole
  flow), `celestual_stripe_events` (the webhook replay guard), and the
  `celestual_billing_*` RPCs — one proof-gated read for the browser
  (`celestual_billing_status`), every write service-role only. The constant
  `c_standing_cap` is gone: `celestual_submit`, `celestual_slots_for` and
  `celestual_renew` now ask `celestual_cap_for()` / `celestual_ping_window()`, so
  the cap is per person (the free two, plus what they bought, ten while a plan is
  live) and the standing window is theirs too (sixty days, or six months on a
  plan). Erasure and the opt-out forget the entitlement with the rest of the
  account (`celestual_billing_forget`); the ledger row survives with its handle
  nulled. `'paid'` joins the reserved four-letter codes.
  **Runbook: [../docs/STRIPE-SETUP.md](../docs/STRIPE-SETUP.md)**
- `migrations/0022_the_card.sql` — **the card.** `celestual_entries.card`, the
  `celestual_card_clean` validator, `celestual_counterpart_card` (the one door
  to somebody else's card, and it opens only on a matched row), and the three
  RPCs that changed shape: `celestual_submit` (now takes `p_card`, returns
  `match_card`), `celestual_ping_status` and `celestual_my_pings`. The old
  five-argument `celestual_submit` is DROPPED, not kept alongside — PostgREST
  resolves overloads by argument name and two candidates satisfying the same
  call is an ambiguity error. See ../docs/STAR-CARDS.md §5.
- `migrations/0023_the_mutual_dm.sql` — **the reveal reaches the person who
  isn't looking.** `celestual_dm_contacts` (handle ⇄ ManyChat contact id, and the
  last time they messaged us — the only thing that decides whether a push is
  inside Meta's 24-hour window) and `celestual_dm_outbox` (one row per person per
  match, delivered by push if that window is open and by the relay's next reply
  if it isn't), plus `celestual_dm_touch` / `_take` / `_due` / `_sent` /
  `_failed` / `_prune` / `_forget`, all service-role only. `celestual_submit`
  queues both DMs and now queues the match email for **both** sides rather than
  only the earlier entrant, reaching an address bound at verification (0013)
  when the ping itself carried none — while keeping the rule that no request can
  name where somebody else's reveal is sent. `celestual_notifications.has_card`
  lets the mail say a card is waiting without saying what it says. Erasure, the
  opt-out and the admin delete all take the two new tables with them.
  **Runbook: [../docs/MANYCHAT-MUTUAL-DM.md](../docs/MANYCHAT-MUTUAL-DM.md)**
- `migrations/0024_the_bindery.sql` — **the design transfer, on the one line the
  server has an opinion about.** A card's ground stopped being one of five flat
  dark plates and became one of three MATERIALS (`leaf`, `chalk`, `hide`), and
  `celestual_card_clean` is the only thing that ever writes that column. Left
  alone it would take a browser sending `leaf` and silently store `ink`, and the
  card would come back on a surface that no longer exists — so the whitelist is
  widened to accept both sets. **Nothing is rewritten.** The five old ids stay
  stored exactly as they are and are mapped onto the three at read time in the
  client (`card/model.js` `LEGACY_PLATES`), because a migration that rewrites the
  column destroys the only record of what somebody actually chose and cannot be
  undone. Re-runnable; the faces (`serif`/`sans`/`mono`) are untouched.
  **See [../docs/DESIGN.md](../docs/DESIGN.md) §11 and ../docs/STAR-CARDS.md.**

- `migrations/0028_handle_resolver.sql` — **the handle resolver.** Strictly
  additive: `celestual_handle_cache` (one row per lowercased handle — display
  name, badge, private flag, the picture's URL and when it was fetched; 24h for
  a hit, 1h for a miss) and `celestual_handle_lookups` (the caps' ledger). RLS
  on and **no policy and no grant** on either, so `anon` can do nothing at all
  with them and neither table can be enumerated: the only reader is the
  `celestual-resolve` function's service role. `pic_url` is a URL and never an
  image. **Runbook: [../docs/HANDLE-RESOLVER.md](../docs/HANDLE-RESOLVER.md)**

**The deliberate reset:** `wipe-all-user-data.sql` (this directory, OUTSIDE the
migration chain so `db push` can never run it) erases every account and
everything accounts produced, while keeping suppressions (opt-outs stay
honored), settings (the salt!), and operator-created communities/campuses.
Paste it into the SQL editor yourself, once, when you mean it.

**The surgical reset:** `clear-account.sql` (same directory, same reason it is
outside the migration chain) does the same thing to a named handful of handles —
edit the `handles` array at the top and run it. It goes past both of the
product's own erasures (`celestual_erase_account`, the account screen's; and
`celestual_admin_delete_user`, the desk's) in the three places that follow a
handle back when somebody re-verifies it: `celestual_placements` (the rolling
30-day cadence log — a handle that has spent its six new pings is still spent
after a delete, and the next placement comes back `rate_limited` with nothing on
screen able to say why), `celestual_handle_links` (the identity group, which
keeps a linked alt's pings counting against the cap), and the First Light trial
row. Suppressions, the salt, and the de-identified Stripe ledger stand; a
readback at the end prints what the product would now say about each handle. A
`c_take_inbound` flag decides whether the pings *other* people placed at these
handles go too (true matches the erasures; false is the kinder choice on a live
database).

**Which migrations are live vs. historical:** the schema is append-only — every
file still applies cleanly in order, but 0002 (Supabase-Auth profiles) and 0005
(`celestual_my_sky`) were dropped/superseded by 0006, the 0003 slot model was
replaced by 0006's ping model, and 0009+0010 carry the current definitions of
`celestual_norm`, `celestual_submit` and `celestual_suppress` (0016 re-extends
suppress). Of the IG-verification functions, **0017** now carries the current
`celestual_start_ig_verification` (7-day expired-row retention) and
`celestual_complete_ig_verification` (verified_via stamp + ban check); poll is
0012's. **0021 now carries the current `celestual_submit`, `celestual_slots_for`,
`celestual_renew`, `celestual_erase_account`, `celestual_suppress` and
`celestual_trial_code_ok`** (the money layer had to reach into the cap, the
standing window and erasure). When reading for current behaviour: **0006 + 0007 +
0008 + 0009 + 0010 + 0020 + 0021** are the truth; 0001/0004 for the tables they
created.

**SQL Editor:** paste each file's contents and Run, in order.

**CLI:**
```bash
supabase link --project-ref <ref>
supabase db push   # applies every migration in order
```

Re-running is safe (`if not exists` / `create or replace` / guarded alters).

## Edge functions

| Function | What it does | Required secrets |
| --- | --- | --- |
| `functions/celestual-notify` | drains `celestual_notifications` and emails "celestual: it's mutual." to each side of a match, at addresses they stored (retry + dead-letter). Says whether a card is waiting, never what it says | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-remind` | the hourly caretaker: lapse warnings ("still feel it?"), the sixty-day purge (`celestual_purge_expired`), and the campus open/reveal mail queue — schedule hourly with pg_cron | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-search` | optional server-side Instagram @ typeahead proxy | `HANDLE_SEARCH_URL`, `HANDLE_SEARCH_KEY` |
| `functions/celestual-resolve` | **the handle resolver** (0028): turns a typed @ into a display name, the verified badge and a face, so a person confirms against an account instead of against their own spelling. Instagram's public web profile first, HikerAPI (`x-access-key`) as the fallback for everything else. Caches 24h/1h, caps 30 distinct handles per device per day plus a lenient per-IP window, and proxies the picture live on `?avatar=<handle>` because Instagram's CDN URLs are signed and expire. Never stores an image, never blocks a ping. Deploy with `--no-verify-jwt` (an `<img>` cannot send an apikey). **Runbook: [../docs/HANDLE-RESOLVER.md](../docs/HANDLE-RESOLVER.md)** | `HIKER_API_KEY` (optional: `HIKER_API_BASE`, `IG_PUBLIC_LOOKUP`) |
| `functions/celestual-manychat` | **(recommended)** receives the Instagram DM relayed by ManyChat's External Request (sender username + code), authenticated by a shared secret, calls `celestual_complete_ig_verification`, and returns a `reply` ManyChat DMs back (the verified-feedback message) — no Meta developer portal. Since 0023 it also records the sender's contact + open window (`celestual_dm_touch`) and appends any waiting mutual news to that same reply (`celestual_dm_take`), which is how the reveal reaches somebody whose window closed weeks ago. **Full setup: [../docs/MANYCHAT-SETUP.md](../docs/MANYCHAT-SETUP.md) · [../docs/MANYCHAT-MUTUAL-DM.md](../docs/MANYCHAT-MUTUAL-DM.md)** | `MANYCHAT_SHARED_SECRET` |
| `functions/celestual-mutual-dm` | the push half of the mutual reveal: drains `celestual_dm_outbox` for the people whose 24-hour Instagram window is open and sends each their line through ManyChat's sending API. Everybody else's stays queued for `celestual-manychat` to hand over on their next message. No message tags, ever. **Runbook: [../docs/MANYCHAT-MUTUAL-DM.md](../docs/MANYCHAT-MUTUAL-DM.md)** | `MANYCHAT_API_TOKEN`, `CELESTUAL_SITE_URL` |
| `functions/_shared/mutual.ts` | not a function — the one copy of the mutual line and the ManyChat sender, imported by both of the above so the two carriers can never say different things | — |
| `functions/_shared/mail.ts` | not a function — the one email design, imported by every sender. The case blind-tooled, the mark, tooled rules, the ivory plate for the one action, the code struck into a well, and a colophon at the foot. There used to be five templates and no two agreed on a ground, an accent or a corner radius; each sender owns only its words now (**[../docs/DESIGN.md](../docs/DESIGN.md) §10**) | — |
| `functions/celestual-ig-webhook` | alternative: receives Instagram DMs from Meta's Messaging webhook directly (verifies `X-Hub-Signature-256`, re-fetches the sender username, adopts it as the identity, DMs verified/already-verified/expired feedback back — `IG_CONFIRM_DM`, on by default) | `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN` |
| `functions/celestual-relogin` | the way back in: `start` asks which door this @ takes (0015, read-only); `request` emails a one-time magic link to the bound recovery address; `redeem` mints a fresh 30-day proof from the link — the sign-back-in path that survives storage loss and works cross-device | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |

| `functions/celestual-trial` | the First Light trial's front door (`/trial`): emails the 6-digit ownership code (hash-stored), then `claim` (the in-app signature + the chosen four-letter code), `login` (back into an entry from any device) and `check` (code availability) through the service-role trial RPCs. **Runbook: [../docs/FIRST-LIGHT-TRIAL.md](../docs/FIRST-LIGHT-TRIAL.md)** | `RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `CELESTUAL_SITE_URL` |
| `functions/celestual-admin` | the admin dashboard behind `/admin`: every request carries the password, checked here against `CELESTUAL_ADMIN_PASSWORD` (falls back to the launch password — set the secret to rotate it); wrong tries rate limited per IP; fronts the service-role `celestual_admin_*` RPCs (overview, delete, ban, remove competitor) | `CELESTUAL_ADMIN_PASSWORD` |
| `functions/celestual-stripe` | the paid door's front half: `checkout` proves the @ through `celestual_billing_begin`, then opens a Stripe-hosted Checkout Session carrying only an opaque purchase id; `confirm` re-reads a session for a returning browser so the meter is right immediately. No card ever reaches us and no @ ever reaches Stripe. **Runbook: [../docs/STRIPE-SETUP.md](../docs/STRIPE-SETUP.md)** | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SLOT`, `STRIPE_PRICE_STEADY` (optional), `CELESTUAL_SITE_URL` |
| `functions/celestual-stripe-webhook` | **the only thing that grants a paid slot.** Verifies Stripe's signature by hand (HMAC-SHA256 over `<timestamp>.<raw body>`, constant-time, five-minute tolerance) before reading a field, guards replays on the event id, then calls `celestual_billing_complete` / `_plan_sync` / `_revoke`. Deploy with `--no-verify-jwt` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

`functions/celestual-recruit` was **deleted**. It was the comment→DM→invite front
door of the 0016 recruitment loop, which 0017 replaced with the self-serve
`/trial` signup: nothing invoked it, `/recruit` now redirects to `/trial`, and the
client half of that flow (`openInvite`, `signAgreement`) is gone too. 0016's
*counting* surfaces are untouched and still live — visits, credited signups and
the stats RPC are what the trial links run on. If you had it deployed, remove it:
`supabase functions delete celestual-recruit`.
Deploy with `supabase functions deploy <name>`. JWT verification is disabled
for these in `config.toml` because anonymous visitors (or Meta's webhook) call
them; each enforces its own checks. See
[../docs/DEBUG-IG-WEBHOOK.md](../docs/DEBUG-IG-WEBHOOK.md).

## Data model (post-0006)

- **`celestual_entries`** — one ping: `from_handle` (the verified sender),
  `to_hash` (**salted hash** of the target — plaintext is never stored),
  optional `from_email`, the **`card`** the ping carries (migration 0022 — the
  words, the ground, the face, the block's position and the tone, rebuilt by
  `celestual_card_clean` on the way in and readable by the other person only
  once `matched_at` is set), the **`photo`** it stands on (migration 0025 —
  base64 of the treated, EXIF-stripped JPEG, written only through
  `celestual_card_photo_put` and released by `celestual_counterpart_photo`
  under the same matched-row seal the card carries), the sixty-day
  `expires_at` clock, `matched_at` /
  `matched_handle` (plaintext only once mutual — both sides know by then),
  `renew_notified_at`. `intent` is a dead column kept for the pings placed
  before the card existed: nothing reads or writes it.
- **`celestual_matches`** — one row per mutual pair (canonical ordering).
- **`celestual_notifications`** — outbound mutual-mail queue (retry /
  dead-letter), drained by `celestual-notify`.
- **`celestual_attempts`** — short-lived rate-limit log (targets hashed;
  auto-pruned).
- **`celestual_placements`** — rolling placement log: the 6-per-30-days
  cadence cap + the week-one campus aggregates (pruned past ~40 days).
- **`celestual_suppressions`** — the opt-out registry, **hashed**.
- **`celestual_members`** — who is reachable (has ever verified, by DM or by
  campus preregistration); powers Loop A's one honest bit.
- **`celestual_handle_links`** — multi-account identity groups; matching and
  the slot count are group-aware.
- **`celestual_ig_verifications`** / **`celestual_settings`** — DM ownership
  proofs; operator flags (`require_ig_verification`, `handle_salt`).
- **`celestual_recovery`** / **`celestual_relogin_tokens`** — durable, DM-free
  recovery (0013): the handle⇄email binding written only under a live proof, and
  the hash-stored, single-use, short-TTL magic-link tokens.
- **`celestual_recruits`** / **`celestual_recruit_visits`** /
  **`celestual_recruit_signups`** — the recruitment program (0016): the signed
  agreement record, a per-day open count per code, and one row per attributed
  signup. Traffic is counted, people are not profiled; no join exists from here
  to a ping.
- **`celestual_communities`** / **`celestual_community_members`** — "your
  worlds"; counters are floored at 100 server-side.
- **`celestual_campuses`** / **`celestual_campus_prereg`** /
  **`celestual_campus_mail`** — assurance-contract windows: threshold, true
  count, auto-open at threshold, snapshotted week-one numbers, and the
  everyone-at-once mail queue.

### RPCs (the only public surface)

`celestual_submit` (place a ping: proof gate, hashed suppression check, the slot
rule — per person since 0021 — the cadence cap, hashed group-aware matching,
instant mutual result + reachability + slot snapshot) · `celestual_withdraw`
("let it go"; frees the slot) · `celestual_renew` (another sixty days, free.
Six months on a plan) · `celestual_billing_status` (proof-gated: standing, cap,
what was bought) ·
`celestual_ping_status` (the status page: device sends its plaintext list up,
owner-gated) · `celestual_my_pings` (cross-device restore; unmatched rows come
back anonymous by design) · `celestual_slots_for` (owner's slot snapshot) ·
`celestual_suppress` (the public opt-out) · `celestual_link` ·
`celestual_set_worlds` / `celestual_world_counts` (counters, 100-floor) ·
`celestual_campus` / `celestual_campus_preregister` ·
`celestual_start_ig_verification` / `celestual_poll_ig_verification` ·
`celestual_bind_recovery` (bind handle⇄email under a live proof, for DM-free
re-login) · `celestual_norm`.

**Operator-only (service role):** `celestual_complete_ig_verification` (the
webhook's completion path — adopts the DMing account as the identity),
`celestual_relogin_store` / `celestual_relogin_redeem` (issue + redeem the
sign-back-in magic link), `celestual_campus_reveal` (snapshot + publish week
one), `celestual_purge_expired` (the sixty-day broom),
`celestual_billing_begin` / `_complete` / `_plan_sync` / `_revoke` / `_seen` /
`_unsee` (0021: the paid slot, granted only by the signature-verified Stripe
webhook).

### Operator playbook

```sql
-- open a campus window
insert into celestual_campuses (slug, name, threshold) values ('reed', 'Reed', 300);

-- seven days after it opens, after eyeballing the numbers:
select celestual_campus_reveal('reed');

-- the release gate before any real launch:
update celestual_settings set value = 'true' where key = 'require_ig_verification';
```

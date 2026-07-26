# CELESTUAL — security & privacy model

Celestual lets someone place a one-way "ping" at @them and only ever reveals
anything when it is **mutual**. Because a person can name a **non-consenting
third party**, the whole design is built to leak nothing about who pinged whom —
and, since migration 0006, to make the stored data itself unreadable. This
document is the source of truth for that model; code comments reference its
`§` sections. The product rationale lives in
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) (esp. Part 6).

## Threat model in one line

The dangerous capabilities are: *"enter a handle that isn't mine and learn
something about them"* and *"read the map of unrequited longing out of the
database."* Every control below exists to make both worthless.

## The controls

### §1 — No client access to the data
All tables (`celestual_entries`, `celestual_matches`, `celestual_notifications`,
`celestual_attempts`, `celestual_suppressions`, `celestual_placements`,
`celestual_members`, `celestual_handle_links`, `celestual_ig_verifications`,
`celestual_recovery`, `celestual_relogin_tokens`, `celestual_settings`,
`celestual_communities`, `celestual_community_members`, `celestual_campuses`,
`celestual_campus_prereg`, `celestual_campus_mail`) have **RLS enabled with zero
policies**, and all privileges are revoked from `anon`/`authenticated`. The
browser literally cannot `select` from them. The only entry points are the
`SECURITY DEFINER` RPCs (`celestual_submit`, `celestual_withdraw`,
`celestual_renew`, `celestual_ping_status`, `celestual_my_pings`,
`celestual_slots_for`, `celestual_suppress`, `celestual_link`,
`celestual_set_worlds`, `celestual_world_counts`, `celestual_campus`,
`celestual_campus_preregister`, `celestual_start_ig_verification`,
`celestual_poll_ig_verification`, `celestual_bind_recovery`), which return only
small status objects — never other people's rows. Internal helpers
(`celestual_group`, `celestual_hash_handle`, `celestual_is_member`,
`celestual_consume_ig_proof`, `celestual_ig_required`, `celestual_client_ip`)
and the operator / service-role paths (`celestual_complete_ig_verification`,
`celestual_relogin_store`, `celestual_relogin_redeem`, `celestual_campus_reveal`,
`celestual_purge_expired`) are **not** granted to clients.

### §2 — Hashed shadow data (the 0006 centerpiece)
The server stores **who a ping points at only as a salted SHA-256 hash**
(`to_hash`; salt in `celestual_settings`, never client-visible). Matching runs
hash-to-hash, group-aware. Consequences, by design:

- A database dump cannot read anyone's targets. The plaintext exists only on
  the sender's own device (localStorage) — and, once mutual, as
  `matched_handle`, which both people already know.
- The status page works by the device sending its own plaintext list up
  (`celestual_ping_status`, owner-proof-gated, capped at 10) and getting state
  back; the server cannot produce the list itself.
- Cross-device restore (`celestual_my_pings`) returns named rows only for
  mutual pings; unmatched pings restore as anonymous standing rows. This is a
  feature, not a gap.
- The opt-out registry (`celestual_suppressions`) is itself hashed.
- The renewal email can name no handle — the server doesn't know one.

### §3 — The three-slot rule + the sixty-day lapse
A person holds at most **3 standing (unresolved, unlapsed) pings**, counted
across their identity group. Each ping stands **60 days**, then lapses;
`celestual_purge_expired` (run hourly by celestual-remind) deletes lapsed
unmatched rows entirely — retention minimisation doing legal work (GDPR/PIPA)
as well as product work. Renewal is free and one tap (`celestual_renew`).
Retiring ("let it go", `celestual_withdraw`) frees the slot immediately.

Because retiring now frees the slot, enter→peek→retire cycling is bounded by a
**placement cadence cap**: at most **6 new placements per rolling 30 days**
per handle (`celestual_placements`), on top of the hourly rate limits. Honest
use never feels it; a sweep trips it fast.

### §4 — Rate limiting
`celestual_submit` enforces trailing-hour caps: **per-IP (40/hr)**,
**per-`from` handle (20/hr)**, **per-target (60/hr, compared by hash)**.
Attempt logs store the target hashed and are pruned on a rolling ~2-hour
basis. `celestual_suppress` is rate-limited per IP (10/hr) against mass-wipe
griefing; verification starts are capped per IP and per handle. Since 0009 the
"per-IP" identity comes from `celestual_client_ip()`, which prefers
`cf-connecting-ip` (written by Cloudflare itself — a client cannot forge it)
over the spoofable first `x-forwarded-for` hop, so rotating fake XFF values no
longer resets the caps. The edu-verify edge function uses the same preference
order.

### §5 — Loop A's one bit, anti-scan
After (and only after) placing a ping, the sender learns whether the target is
**reachable** (has ever verified — `celestual_members` — and hasn't opted
out). Membership is the flattering receiver-side identity; still, it's a bit,
so it is guarded: no lookup without a placed ping, three slots, the cadence
cap, and the hourly limits make enumeration cost slots, time, and identity.
`celestual_ping_status` returns reachability only for targets the caller has
actually placed.

### §verify — Handle-ownership verification (Instagram DM)
Load-bearing since 0004: a one-time 4-digit code DM'd to `@celestual.us`; Meta's
authenticated sender identity (relayed by ManyChat's External Request — setup in
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) — or the direct Meta webhook — see
[DEBUG-IG-WEBHOOK.md](./DEBUG-IG-WEBHOOK.md)) decides who is verified. The
browser mints a 256-bit proof, stores only its hash server-side, and presents
the raw proof at placement; `celestual_consume_ig_proof` makes the server the
authority. **No match can fire to an unverified claimant** — the impersonation
fix the framework calls non-negotiable (§6.5). Gated by
`celestual_settings.require_ig_verification`; with it on, the proof also gates
`celestual_ping_status`, `celestual_my_pings`, `celestual_slots_for`,
`celestual_renew`, `celestual_set_worlds` and `celestual_campus_preregister`.

**The code is a pure correlation id (0012).** Identity is *never* a typed claim:
the 4-digit code only links "this incoming DM" ↔ "this browser session", and
whoever DMs a live code is verified as *that* Meta-authenticated account, which
the site then adopts. This removes the entire `handle_mismatch` class (a typo or
a second logged-in account used to dead-end at "that code was started for a
different @") and is strictly *more* secure — you can only ever verify the
account you actually control. `celestual_poll_ig_verification` returns the
adopted @ to the proof-holder (and only the proof-holder) so the browser can
adopt it. The one residual — a stray/guessed DM that matches *someone else's*
live code, which would adopt the DMing account onto their session — is bounded
three ways: the code is **6 digits** with a **30-minute TTL** (0014, so the
live-code pool is small and a collision is ~1-in-a-million per stray DM), the
unique-pending-code index means a code maps to at most one session at a time,
and the browser shows a **"sign in as @X?" confirm** whenever the adopted @
differs from the one typed, so an unexpected identity can never commit silently.

Session lifetime (0009): a completed verification stands **30 days, sliding**
— each successful proof use extends it another 30, so an active person never
re-verifies while an abandoned proof still dies. The exposure profile is that
of a long-lived session cookie: the proof lives only in that browser's
localStorage, signing out destroys it, and a leaked proof still can't move the
verification to another handle. Both relay paths DM instant feedback to the
sender (verified ✓ / already-verified / expired) inside Meta's 24-hour standard
messaging window. The `/demo` sandbox runs the same overlay but auto-verifies
locally and never touches the backend.

**Durable, DM-free recovery (0013).** A verified session used to be reachable
*only* through the proof in that one browser's localStorage — so losing it
(Instagram's in-app browser, iOS ITP, a new device) forced a fresh DM, which is
the repetitive pattern Instagram throttles (the root cause in
[MANYCHAT-SETUP.md](./MANYCHAT-SETUP.md) §8). Now, at the one-time DM
verification the browser binds `handle ⇄ email` under its fresh proof
(`celestual_bind_recovery` — writable *only* with a live proof). A later "sign
back in" emails a one-time magic link (`celestual-relogin`, the same Resend path
as the other mail) whose token is stored only as a hash, is single-use, and
lasts 20 minutes; opening it mints a fresh proof client-side and a full 30-day
session (`celestual_relogin_redeem`, service-role only) with no DM. The DM is a
one-time step; email ownership carries every return, cross-device. Both writers
are service-role-only, so the browser can never mint its own proof. **Email is
required at signup** (not optional): it is both the mutual-match reveal channel
(§mutual) and this recovery anchor, so every account can be reached and can
return without a DM. School (`.edu`) addresses are encouraged — the core
audience — and double as community setup.

### §ident — Multi-account identity
A person can link up to 3 of their own @s (`celestual_link`); matching and the
slot count are **group-aware**. Claiming is first-come, never steals an @ from
another group, capped at 3. With verification enforced, the budget and claims
key on a proven identity.

### §mutual — The reveal and the exfil-safe email
`celestual_submit` returns mutuality instantly to the completer; the earlier
entrant is emailed **only at the address they themselves stored** — never the
address on the triggering request — via the `celestual_notifications` queue
(retry + dead-letter in celestual-notify). Withdrawal tears down the match row
and any still-pending notification, but never un-tells anyone already mailed.
A blocked/opted-out handle can never match: suppression is checked (by hash)
before anything records.

### §optout — The public escape hatch
`celestual_suppress` is the opt-out any handle owner — user or not — can use
without an account: it hashes the handle into the block list and erases
**everything** referencing it (pings both directions, matches, pending mail,
membership, worlds, campus preregistrations). Free, immediate, never behind a
login, rate-limited against griefing. It is also how "delete everything" works
for a user's own handle. Reachable at `/optout` and documented on
`/data-deletion`.

### §campus — Windows and truth
Campus rows are operator-created only. Preregistration requires a verified
handle (it *is* the signup). The meter count is the true count. Opening at
threshold is atomic and mails everyone at once. Week-one aggregates are
**snapshotted** by `celestual_campus_reveal` (service-role, run by the
operator after eyeballing) so published numbers stay exactly true forever.
Nothing in the schema can inflate a number without lying in SQL — and nothing
may (framework §6.2: the forbidden lever).

### §counters — The 100-floor
Community counters are computed server-side and return `null` below 100
members (`celestual_world_counts`, `celestual_set_worlds`). Small counts both
feel empty and de-anonymize; the floor is enforced at the source of truth,
never in the client.

### §mail — What email can ever say
Three emails exist: *it's mutual* (to the earlier entrant's own address),
*your ping lapses soon* (about the sender's own action; names no handle —
§2), and the campus *open/reveal* notes (to preregistrants). None of them can
state or imply anything about any other person's activity. That line is
load-bearing legally (FTC v. NGL) and is pre-committed here in writing. The
transactional mails — the `.edu` join code and the sign-back-in magic link —
speak only to the recipient about their own action and name no one else.

### §age — Adults
The landing states the 18+ condition on the primary action; marketing is
college-and-up only; suspected-minor accounts are purged fast. Boring
conservatism on purpose (framework §6.7).

## Residual risks, named

- **Instant reveal is an oracle bounded, not removed** — 3 slots + 6
  placements/30 days + hourly caps bound "fishing for who likes me" to a slow
  trickle. If it ever proves too loose, the single lever is delaying the
  completer-side reveal; the seam is isolated in `celestual_submit`'s return.
- **The salt is a secret** — anyone with the service role can hash candidate
  handles and test membership. Hashing protects against dumps and honest-
  operator reads, not against a fully compromised operator. Encrypt at rest,
  log access, treat `celestual_entries` as the crown jewels regardless.
- **Meta platform risk** — verification rides Meta's webhook surface; keep the
  bio-code/ManyChat fallback maintained forever (framework §6.6).
- **Email is a recovery factor (0013)** — once a handle binds a recovery email,
  whoever controls that inbox can re-login as the handle via the magic link. This
  is the standard magic-link tradeoff and the same address already trusted for
  the mutual/lapse mail; the binding is only ever written under a live DM proof,
  the link is single-use + short-TTL + hash-only at rest, and the opt-out wipes
  the binding and any live tokens. Treat `celestual_recovery` as sensitive.
- **Pre-enforcement window** — while `require_ig_verification` is `'false'`
  (dev default), identity is the typed handle. Flip it on before any real
  launch; the operator checklist below makes it a release gate.

## Operator checklist

- [ ] All migrations applied (`0001`–`0014`); RLS **on**, **zero policies**,
      on every `celestual_*` table.
- [ ] `anon` has **execute** only on the §1 public RPC list — and **not** on
      `celestual_group`, `celestual_hash_handle`, `celestual_is_member`,
      `celestual_complete_ig_verification`, `celestual_consume_ig_proof`,
      `celestual_ig_required`, `celestual_relogin_store`,
      `celestual_relogin_redeem`, `celestual_campus_reveal`,
      `celestual_purge_expired`.
- [ ] `celestual-relogin` deployed (the sign-back-in magic link) and reachable;
      it reuses `RESEND_API_KEY` / `CELESTUAL_FROM_EMAIL`.
- [ ] `handle_salt` exists in `celestual_settings` (0006 seeds it) and is
      never logged or exported.
- [ ] Edge-function secrets set in Supabase, never in the front-end bundle
      (`RESEND_API_KEY`, `CELESTUAL_FROM_EMAIL`, `MANYCHAT_SHARED_SECRET` or
      the direct-Meta trio).
- [ ] `celestual-remind` scheduled hourly (lapse warnings + the sixty-day
      broom + campus mail); `celestual-notify` wired to the notifications
      insert or cron.
- [ ] Only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` + feature flags in
      the browser env; the service-role key never appears in `app/`.
- [ ] **Release gate:** `celestual_settings.require_ig_verification = 'true'`
      before any campus window opens.
- [ ] **Release gate:** `CELESTUAL_SANDBOX_GMAIL=0` on `celestual-edu-verify`
      before any real launch (the pre-launch default accepts a gmail address on
      `demo:true` requests so the pipeline is testable without a .edu inbox).

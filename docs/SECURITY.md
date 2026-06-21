# CELESTUAL — security & privacy model

CELESTUAL lets someone record a one-way "I still think about @them" and only ever
reveals a match when it is **mutual**. Because a person can name a **non-consenting
third party**, the whole design is built to leak nothing about who entered whom.
This document is the source of truth for that model; code comments reference its
`§` sections.

## Threat model in one line

The dangerous capability is: *"enter a handle that isn't mine and learn something
about them."* Every control below exists to make that worthless.

## The controls

### §2.1 — No client access to the data
All matching tables (`celestual_entries`, `celestual_matches`,
`celestual_notifications`, `celestual_attempts`, `celestual_suppressions`,
`celestual_slots`, `celestual_handle_links`, `celestual_reminders`) have **RLS
enabled with zero policies**, and all privileges are revoked from the `anon` /
`authenticated` roles. The browser literally cannot `select` from them. The only
entry points are the `SECURITY DEFINER` RPCs (`celestual_submit`,
`celestual_withdraw`, `celestual_suppress`, `celestual_link`,
`celestual_check_many`, `celestual_slots_for`, `celestual_request_reminder`), which
run as the table owner and return only small status objects — never rows. The
group-membership helper `celestual_group` is **not** granted to clients, so a
person's linked accounts aren't directly enumerable.

### §2.2 — Everything is free
There is no paywall. Every star — and the reveal — is free. The only limit is the
weekly entry-slot budget (§4.0): a non-monetary scarcity that keeps people
intentional, not a charge.

### §2.3 — Instant reveal + the slot budget (the product trade-off)
`celestual_submit` returns whether the just-completed pair is mutual, so the person
who completes a match finds out **immediately** in-app. This is a deliberate product
choice, and it re-opens — in principle — the "prober oracle" an earlier design had
closed by *deferring* the reveal: someone can enter a suspected admirer and read on
screen whether it's mutual.

What bounds it into a non-abusable channel is the **slot budget (§4.0)**: a person
can only enter 3 people, then 1 more per week, and withdrawing never refunds a slot.
So "fishing for who likes me" is capped at 3 checks, then 1/week — not a free,
unlimited probe. The people you enter are never told either way (one-sided entries
stay invisible), so no one is embarrassed by being checked.

> If instant reveal ever proves too loose, the single lever is to delay the reveal
> on the *completing* side (show the later entrant only after N hours). The seam is
> isolated in `celestual_submit`'s return + the client's match handling — flipping
> it doesn't touch anything else.

### §2.5 / §4.6 — Erasure & suppression
- `celestual_withdraw(from, to)` un-sends a one-way entry and tears down the match
  row + any *still-pending* notification (it never un-tells anyone already mailed).
  It does **not** refund the slot the entry cost (§4.0).
- `celestual_suppress(handle)` is a public erasure / "never let me be entered"
  endpoint: it blocks a handle from ever being entered and wipes all data
  referencing it. It's open by design (a non-user can't authenticate) and is
  privacy-positive. It is now **rate-limited per IP (10/hr)** to bound mass-wipe
  griefing; full ownership verification will gate it once sign-in ships.

### §ident — Multi-account identity (interim)
A person can link up to 3 of their own @s (`celestual_link` →
`celestual_handle_links`); matching is **group-aware**, so being entered on any of
them counts as them. Claiming is **first-come and never steals** an @ already in
another group, group size is capped at 3, and writes are rate-limited. Until
handle-ownership verification ships (Instagram sign-in), a claim is unverified — in
principle someone could claim an @ they don't own. The blast radius is bounded
(cap, no-steal, rate limits) and the feature is re-verified when sign-in lands.
Documented so nobody over-trusts it.

### §3 — Age affirmation
The flow requires an 18+ affirmation before a star can be sealed.

### §4.0 — The entry-slot budget (anti-fishing, anti-sweep)
With no paywall, the slot budget is the **primary** control against entering
everyone you know to map your admirers. Each submitter handle starts with **3
slots** and regains **1 per week** (capped at 3). Sealing a new person spends one;
**withdrawing never refunds one** (`celestual_withdraw` deliberately doesn't touch
`celestual_slots`), so enter→peek→withdraw→repeat can't cycle a single slot through
your whole contact list. It's enforced inside `celestual_submit`, keyed on the
handle, so clearing `localStorage`, a private window, or a new device can't reset
it. Re-submitting an existing pair (e.g. adding an email) is free.

> Interim limitation (closes with sign-in): pre-OAuth the budget is keyed on the
> *typed* `from` handle, so a determined abuser could fragment across several `from`
> handles for more slots — at the cost of splitting their own identity, and still
> bounded by the per-IP cap (§4.1). Ownership verification ties the budget to a
> real identity.

### §4.1 — Rate limiting
`celestual_submit` enforces trailing-hour caps as a burst backstop on top of the
budget: **per-IP (40/hr)**, **per-`from` handle (20/hr)**, and **per-`to` handle
(60/hr)**. The per-`to` cap throttles a targeted prober who rotates the
attacker-controlled `from` to dodge the per-`from` cap. Throttled calls return
`{ recorded: false, error: 'rate_limited' }`.

### §4.3 — Client persistence
The in-progress entry (who you're currently entering, `them`) lives in **memory
only** — it is never written anywhere. Your sky (the @s you've sealed) *does*
persist so it survives a refresh: **AES-GCM encrypted** in `celestual_profiles`
when signed in (the key is readable only by you), or in `localStorage` otherwise.
Account deletion wipes both. There is no longer a "forget on this device" control.

### Anti-exfiltration on the match email
The match email is sent **only to the earlier entrant** — never to the address
supplied on the request that triggers the match. This removes the instant
inbox-exfiltration path where an impersonator submits a victim's handle as `from`
with their own email and has the victim's private feeling mailed to them.

### §5.1 — Email dead-letter
`celestual_notifications` carries `attempts` / `next_attempt_at` / `failed_at`.
The `celestual-notify` function retries with exponential backoff up to 5 attempts,
then dead-letters a permanently-bad address and surfaces it in its response for
alerting.

## The one remaining gap (tracked)

The *complete* fix for impersonation is **handle-ownership verification** — proving
the person sealing a star actually owns the `@` they typed (Instagram OAuth or a
one-time code). It is **postponed** for this launch, and several controls are only
as strong as it: until it ships, identity is the *typed* handle, so

- the slot budget (§4.0) and multi-account claims (§ident) are keyed on an
  unverified `@` — mitigated by per-IP caps, no-steal claiming, and bounded blast
  radius, but not airtight; and
- with instant reveal on (§2.3), the slot budget is the main thing bounding a
  fishing oracle.

The Meta sign-in scaffold ([SETUP-AUTH.md](./SETUP-AUTH.md)) is the first step
toward closing it; the code is structured so turning it on tightens these controls
without a rewrite.

## Operator checklist

- [ ] All three migrations applied — confirm RLS is **on** and there are **no**
      policies on the `celestual_*` tables (Supabase → Database → Tables → RLS).
- [ ] Confirm `anon` has **execute** on the public RPCs (`celestual_submit`,
      `_withdraw`, `_suppress`, `_link`, `_check_many`, `_slots_for`,
      `_request_reminder`, `_norm`) and **nothing** else — and **not** on
      `celestual_group`.
- [ ] Edge-function secrets are set in Supabase, never in the front-end bundle.
- [ ] Only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (and the optional
      feature flags) are exposed to the browser — the anon key is safe to ship;
      the **service-role key must never** appear in `app/`.

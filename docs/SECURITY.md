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
All tables (`celestual_entries`, `celestual_matches`, `celestual_notifications`,
`celestual_attempts`, `celestual_suppressions`) have **RLS enabled with zero
policies**, and all privileges are revoked from the `anon` / `authenticated`
roles. The browser literally cannot `select` from them. The only entry points are
three `SECURITY DEFINER` RPCs (`celestual_submit`, `celestual_withdraw`,
`celestual_suppress`), which run as the table owner and return only a small status
object — never rows.

### §2.2 — The reveal is always free
Matching and the match email are never paywalled. Payments only ever gate adding
*extra* stars (see [SETUP-AUTH-AND-PAYMENTS.md](./SETUP-AUTH-AND-PAYMENTS.md)).

### §2.3 — Deferred reveal (the core safety property)
`celestual_submit` **never tells the caller whether the pair is mutual.** It
returns only `{ recorded: true }`. This closes the live "prober oracle": an
attacker who submits `from=<victim>, to=<target>` can no longer read on screen
whether the target privately entered the victim. The mutual "yes" is delivered
**only** as an email — the one owner-controlled channel.

### §2.5 / §4.6 — Erasure & suppression
- `celestual_withdraw(from, to)` un-sends a one-way entry and tears down the match
  row + any *still-pending* notification (it never un-tells anyone already mailed).
- `celestual_suppress(handle)` is a public erasure / "never let me be entered"
  endpoint: it blocks a handle from ever being entered and wipes all data
  referencing it. It's open by design (a non-user can't authenticate) and is
  privacy-positive; verification/rate-limiting can be layered on once handle
  ownership exists.

### §3 — Age affirmation
The flow requires an 18+ affirmation before a star can be sealed.

### §4.1 — Rate limiting
`celestual_submit` enforces trailing-hour caps: **per-IP (40/hr)**, **per-`from`
handle (20/hr)**, and **per-`to` handle (60/hr)**. The per-`to` cap throttles a
targeted prober who rotates the attacker-controlled `from` to dodge the per-`from`
cap. Throttled calls return `{ recorded: false, error: 'rate_limited' }`.

### §4.3 — Minimal client persistence
`localStorage` holds only the minimum needed to resume a session — **never** the
handles you entered, and never whether anything matched. Those secrets live in
memory only. A "forget on this device" control clears even the resume state.

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

The *complete* fix for impersonation is **handle-ownership verification** —
proving the person sealing a star actually owns the `@` they typed (Instagram
OAuth or a one-time code). Deferred reveal is the strongest mitigation available
without it: a determined impersonator gets no live signal. The documented
trade-off is that the live submitter isn't notified for a pair until ownership
verification ships. The Meta sign-in scaffold
([SETUP-AUTH-AND-PAYMENTS.md](./SETUP-AUTH-AND-PAYMENTS.md)) is the first step
toward closing it.

## Operator checklist

- [ ] Migration applied — confirm RLS is **on** and there are **no** policies on
      the `celestual_*` tables (Supabase → Database → Tables → RLS).
- [ ] Confirm `anon` has **execute** on the three RPCs and **nothing** else.
- [ ] Edge-function secrets are set in Supabase, never in the front-end bundle.
- [ ] Only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (and the optional
      feature flags) are exposed to the browser — the anon key is safe to ship;
      the **service-role key must never** appear in `app/`.

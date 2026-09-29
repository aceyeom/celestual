# Pings by the week

The owner's ruling of 27 September: **one free ping a week, and more for
$2.99 each, as many as a person chooses.** It replaces the standing cap of two
(0021, 0069) and the posture in PRICING-REVENUE.md that nothing is for sale.
This file is the contract the database (migration 0071), the edge functions
(`celestual-stripe`, `celestual-stripe-webhook`) and the wall
(`app/src/wall/`) agree on.

---

## 1. The rule, in one breath

A ping is one private note in one Saturday reveal. Everybody gets one free
ping for every reveal. A person who wants more buys pings, $2.99 each, in any
number from one to ten at a time; a bought ping never lapses and is spent only
when it is used. Nobody can have more than ten pings in one reveal.

## 2. Which week a ping belongs to

The reveal a note runs to (`celestual_note_ends`, 0069): the first Saturday
reveal, 9pm Pacific, at least a day after it is sent. So a note sent on
Saturday afternoon is next week's ping, and the allowance a screen shows is
always the allowance of the reveal a note sent now would run to.

## 3. What spends a ping, and what gives one back

| Act | Spends | Gives back |
| --- | --- | --- |
| Send a note to somebody new | one ping for its reveal | |
| Send again a note that was not this time | one ping for its new reveal | |
| Keep a note for next week | one ping for the reveal it is kept to | |
| Change the words of a running note | nothing | |
| Send the same pair again in the same week | nothing (the ping is already spent on them) | |
| Write again to somebody you are mutual with (0072) | one ping for its reveal, as a new note | |
| Let a running note go | | every ping it holds for a reveal still to come |
| A note that turns out mutual | | any ping it held for a reveal after the one that told it |
| A note that was not this time (0075) | | the ping its night held: a bought one back on hand, a free one as one extra for the week after (one a person a week) |

A ping that comes back is the free one if the free one was what it spent, and
a bought one otherwise. Since 0075 a note costs a ping only when it is mutual:
every ping a Saturday held for a note that was not mutual comes back at nine
that night (section 9), and the wall says what came back, exactly. Letting go before the reveal still tells nobody
anything (0069), so giving the ping back costs the double blind nothing.

The free ping is spent first. A bought ping is spent only once the week's free
one is gone.

## 4. The ledger

`celestual_ping_spends`: one row per (person, pair, reveal), what it cost.

```
id          uuid primary key
handle      text        the from handle, normalised (celestual_norm)
to_hash     text        the pair's target hash, as celestual_entries has it
reveal_at   timestamptz the reveal this ping is in
kind        text        'free' | 'paid'
created_at  timestamptz
unique (handle, to_hash, reveal_at)
```

A person is their identity group (`celestual_group`): the free ping and the
ceiling are counted across every @ they have linked, and bought pings are
summed across it. RLS on, no grants to anon or authenticated.

Bought pings on hand live on `celestual_entitlements.ping_credits` (a new
column, int, not null, default 0), summed across the group on read, and taken
from a row of the group that has one on spend. `extra_slots` from 0021 is
folded into `ping_credits` once by the migration and is then read by nothing.

## 5. The calls

### `celestual_ping_allowance(p_handle text, p_proof text)` → jsonb

Proof gated like `celestual_my_pings` (a stranger learns nothing about what a
handle holds). Answers:

```json
{
  "ok": true,
  "allowance": {
    "reveal_at": "2026-10-03T04:00:00Z",
    "free": 1,
    "free_left": 1,
    "credits": 0,
    "sent": 0,
    "ceiling": 10,
    "price_cents": 299,
    "next": { "reveal_at": "2026-10-10T04:00:00Z", "free_left": 1, "sent": 0 }
  }
}
```

`reveal_at` is the reveal a note sent now runs to; `next` is the reveal after
it, which is where a note kept for next week goes. With no proof it answers
`{ ok: false, allowance: <the same shape for nobody: free_left 1, credits 0, sent 0> }`.

The same `allowance` object rides on three more answers, so a screen never has
to ask twice:

* `celestual_my_pings` answers it beside `next_reveal` and `last_reveal`.
* `celestual_submit` answers it on every answer that carries `slots` now
  (a recorded placement, and `no_pings`), and `slots` stays, drawn from it:
  `{ standing, cap }` where cap is what this week allows.
* `celestual_renew` answers it on a keep and on a refusal.

### Refusals

`celestual_submit` and `celestual_renew` refuse a ping they cannot pay for with

```json
{ "recorded": false, "error": "no_pings", "allowance": { ... } }
```

(`ok: false` in place of `recorded: false` for `celestual_renew`), and a
person at the ceiling of ten with `"error": "week_full"`. The old
`no_slots` is never answered again. The thirty day cadence cap in
`celestual_submit` (six new pairs in thirty days) goes: the ceiling of ten a
week is the cadence cap now, and a bought ping must be spendable.

### Buying

`celestual_billing_begin(p_handle, p_proof, p_kind, p_quantity int default 1)`
takes `p_kind = 'pings'` and a quantity from one to ten, refuses anything else
with `error: 'quantity'`, and writes the pending purchase with its quantity
(`celestual_purchases.quantity`, int, not null, default 1; the kind check
takes `'pings'`). `'slot'` and `'steady'` stay accepted so nothing already
deployed breaks, and neither is offered by the wall.

`celestual_billing_complete` grants a `'pings'` purchase by adding its
quantity to `ping_credits`, once, as every grant here is once.
`celestual_billing_revoke` takes a refunded `'pings'` purchase back by the
pings the refunded money covers (all of them on a full refund, section 8 for
a partial one), never below zero, and never touches a note already out (0021's
reason: taking one back would tell somebody, by its absence, that it was
sent). `celestual_billing_forget` (erasure) goes with the credits.

The checkout (`celestual-stripe`, `{ action: 'checkout', kind: 'pings',
quantity }`) opens a Stripe Checkout Session for `STRIPE_PRICE_PING` (a one
time $2.99 price; `STRIPE_PRICE_SLOT` is read when it is not set, since it is
the same product) with `quantity` as the line item's quantity, fixed on
Stripe's page so the purchase row and the charge always agree. The buyer comes
back to `/paid?session={CHECKOUT_SESSION_ID}`, or `/paid?c=1` if they did not
pay, and the wall confirms it (`{ action: 'confirm', session_id }`), which
answers `{ ok, paid, applied, kind, quantity, credits }`. The parameter is
`session` and never `s`: `?s=` is the wall's flyer scan source, which the wall
strips and logs as a scan.

## 6. On the wall

* The composer (`screens/Ping.jsx`) says, on its last step, which ping this
  is: `your free ping this week`, or `1 of your 3 pings`, or, with none left,
  it shows the paywall in place of the send key.
* The paywall (`screens/Pings.jsx`) is one screen of the phone, lit in rose,
  and nothing else: the price of one across its top, the count and the total
  on its glass, its two soft keys the stepper from one to ten, and one lit
  key under it, `get 3 pings · $8.97`, with a quiet way back. Since 28
  September there is no heading over it in sight, no line under it and no
  fine print: the owner asked for the phone alone. A failure still takes the
  line under the phone, since a key that did nothing has to say why.
* It is reached two ways: on its own when a note cannot be paid for (sending,
  sending again, keeping), with the note waiting behind it and sent the
  moment the pings land; and from `add more pings` on the private notes tab,
  beside the week's pings, which is there only once none is left to spend.
* Coming back from Stripe (`/paid`), the wall confirms the session, says how
  many landed, and sends the note that was waiting, if one was.

## 7. What the words are

VOICE.md section 6 still bans the paywall voice: never `unlock`, `premium`,
`upgrade`, `go pro`, `subscribe`. A ping is bought, and the screen says
exactly that and exactly what it costs: `get 3 pings · $8.97`. The price is
drawn from `price_cents` where the server says it, and `$2.99` where it has
not yet, and the two must never disagree with Stripe (STRIPE-SETUP.md).

## 8. What the database settled (migration 0071)

Where this contract was silent, or would have cost somebody money or privacy
if read literally, 0071 took the reading below. Each is in the migration's
header too, and each is one place to change if the owner rules otherwise.

* **A note sent and let go learns nothing, so nothing bounds it but the hourly
  limits.** Letting a note go gives its ping back, so a note can be sent and
  let go again and again. The owner's question of 28 September was whether
  that does anything, since nothing is told before the reveal and nothing can
  be let go after it. It does nothing, with one exception that 0071 first
  guarded with a bound of thirty new pairs a rolling week: a placement
  answered `reachable`, whether the @ has an account (SECURITY.md section 5),
  at once. That bit is said now only of a pair already told, by
  `celestual_submit` and by `celestual_ping_status`, and the wall never drew
  it; a sealed pair already answers as an unanswered note (0069). With that,
  a cycle learns nothing a single note would not, and the bound came out.
  The hourly limits (twenty from a handle, sixty to a target, forty from an
  address) stand as they were.
* **Notes already out when 0071 applies hold no spend.** They were sent under
  the old rule and cost nothing then. They count toward nothing this week,
  letting one go gives nothing back, and keeping one for next week spends a
  ping as any keep does. So in the first week a person who already had notes
  running still has this week's free ping.
* **A keep that moves nothing spends nothing.** A note already kept as far as
  it goes (the reveal after next) answers `ok: true` again and spends nothing.
  On Saturday afternoon, a note running to that night's reveal is kept to the
  following one, which is `allowance.reveal_at` rather than `allowance.next`:
  the keep spends for the reveal the note is actually kept to, whichever that
  is, and the answer's `allowance` shows it.
* **A mutual gives back by row.** At the reveal every note made mutual gives
  back what its own from handle spent on its own pair for a reveal after the
  one that told it. A note told at once (the other half was already mutual,
  from an older build) runs to no reveal, so the ping it spent comes straight
  back in the same answer.
* **Erasure gives other people their pings back.** Erasing an account, the
  opt out and the desk's delete take every ledger row of the handle and every
  row about it (`to_hash`). The notes other people sent to it go with the
  erasure (0038), so a ping those held for a reveal still to come goes back to
  its sender, free or bought. They see the note gone from their list anyway,
  so the ping coming back tells them nothing more.
* **A partial refund takes back only what it covers.** Stripe tells a refund
  in parts as `charge.refunded` with the running total. The pings taken back
  are floor(amount refunded / unit price), the unit price being what the
  purchase was charged (`amount_cents`) over its quantity, never more than the
  quantity, never below zero on hand, and never a note already sent. The
  purchase keeps the count (`celestual_purchases.refunded_quantity`) and each
  refund takes only the difference, so a refund told twice takes nothing the
  second time; it reads `refunded` only when every ping it bought is covered.
  A lost dispute takes the whole purchase.
* **The old kinds.** A `'slot'` purchase (one more standing ping, $2.99, from
  0021) is one ping, bought or refunded. Slots already bought are folded into
  `ping_credits` once. A live `'steady'` plan (never offered by the wall, and
  there is no evidence anybody holds one) gives its payer the ceiling as free
  pings in every reveal while it is paid through, the nearest thing to the ten
  standing notes it was sold as; so `allowance.free` is 10 for them, not 1.
  Read `free`, never assume it.
* **Buying always takes the proof.** 0021 asked for it only while
  `require_ig_verification` is on. Money must never attach to an @ the buyer
  has not proven, so `celestual_billing_begin` asks for it always.
* **The two old meters tell the truth.** `celestual_slots_for` and
  `celestual_billing_status` read the standing cap of 0021, which nothing
  enforces now. The wall calls neither, but both answer from the allowance
  now and take the proof always.

### The answers, exactly

```
celestual_ping_allowance(p_handle text, p_proof text) -> jsonb       anon, authenticated
  { ok: true,  allowance: A }
  { ok: false, allowance: A for nobody }          no proof, or not this handle's
  raises 'invalid handle' when the handle is not one (as celestual_my_pings does)

A = { reveal_at, free, extra, free_left, credits, sent, ceiling: 10, price_cents: 299,
      next: { reveal_at, extra, free_left, sent } }
  reveal_at, next.reveal_at   'YYYY-MM-DDTHH:MM:SSZ'
  free                        1 (10 while an old 'steady' plan is paid through)
  extra, next.extra           0 or 1: the free ping a night that was not mutual
                              gave back for that reveal (0075), counted in its
                              free_left
  credits                     bought pings on hand, across the linked @s

slots = { standing: A.sent, cap: least(A.ceiling, A.sent + A.free_left + A.credits) }
  standing = cap means nothing is left this week

celestual_submit(p_from, p_to, p_email, p_proof, p_card) -> jsonb    anon, authenticated
  { recorded: true, mutual, match, match_card, reachable, expires_at, reveal_at,
    slots, allowance }
  { recorded: false, error: 'no_pings' | 'week_full', slots, allowance }
  { recorded: false, error: 'unverified' | 'suppressed' | 'rate_limited' }
  { recorded: false, error: 'card', reasons }

celestual_renew(p_from, p_to, p_proof) -> jsonb                      anon, authenticated
  { ok: true, expires_at, allowance }
  { ok: false, error: 'no_pings' | 'week_full' | 'lapsed' | 'none', allowance }
  { ok: false, error: 'unverified' }

celestual_withdraw(p_from, p_to, p_proof) -> jsonb                   anon, authenticated
  { withdrawn: true, allowance }
  { withdrawn: false, error: 'mutual' | null }
  { withdrawn: false, error: 'unverified' }

celestual_my_pings(p_handle, p_proof) -> jsonb                       anon, authenticated
  { ok: true, pings, next_reveal, last_reveal, allowance }
  { ok: false, pings: [] }
  since 0072 one handle can come back twice, a mutual (a told row or a
  keepsake, the latest told) and a new note to the same person
  since 0075 a row that is not mutual adds cost: 'free' | 'paid' | null and
  returned: 'extra' | 'kept' | null, for the night it last stood in; a
  mutual's row is unchanged, key for key

celestual_mutual_again(p_from, p_to, p_proof, p_card default null,
  p_email default null) -> jsonb                                       anon, authenticated
  0072: the pair kept and a new note placed, in one transaction; answered as
  celestual_submit answers, and a refusal keeps nothing
  { recorded: true, mutual: false, match: null, match_card: null, reachable,
    expires_at, reveal_at, slots, allowance }
  { recorded: false, error: 'no_pings' | 'week_full', slots, allowance }
  { recorded: false, error: 'unverified' | 'suppressed' | 'rate_limited' }
  { recorded: false, error: 'card', reasons }
  raises 'invalid handle' and 'same handle', as celestual_submit does

celestual_mutual_forget(p_from, p_to, p_proof, p_told default null) -> jsonb
                                                                       anon, authenticated
  0072: the caller's mutual with them, off the caller's own list: the nights
  told before the call, and none after p_told (the revealed_at the list drew),
  so a mutual told since stays, with its news
  { ok: true }
  { ok: false, error: 'unverified' | 'none' }, and 'none' changes nothing

celestual_slots_for(p_handle, p_proof) -> jsonb                      anon, authenticated
  { standing, cap, allowance }

celestual_billing_status(p_handle, p_proof) -> jsonb                 anon, authenticated
  { ok, standing, cap, free_cap, extra, plan, plan_until, allowance }

celestual_billing_begin(p_handle, p_proof, p_kind, p_quantity int default 1)   service role
  { ok: true, purchase_id, kind, quantity }
  { ok: false, error: 'handle' | 'kind' | 'quantity' | 'unverified' | 'suppressed'
                      | 'rate' | 'has_plan' }

celestual_billing_complete(p_purchase_id, p_session_id, p_payment_intent,
  p_amount_cents, p_currency, p_customer, p_subscription, p_period_end) service role
  { ok: true, applied, kind, quantity, credits }
  { ok: false, error: 'unknown' | 'no_handle' }

celestual_billing_revoke(p_payment_intent, p_subscription,
  p_amount_refunded int default null, p_amount int default null)       service role
  { ok: true, applied, handle, kind, quantity, credits }   quantity: taken by this call
  { ok: false, error: 'unknown' }

celestual-stripe { action: 'checkout', handle, proof, kind: 'pings', quantity: 1..10 }
  { ok: true, url } | { ok: false, error }   error adds 'quantity'; 'at_cap' is gone
celestual-stripe { action: 'confirm', session_id }
  { ok: true, paid, applied, kind, quantity, credits } | { ok: false, error }
```

## 9. A night that was not mutual (migration 0075)

The owner's ruling of 29 September: what is shown when it is not mutual, what
if the other person is not here, give an extra ping for next week and ask
people to share celestual, give a bought ping back, and do it so it is honest.
What the database and the wall settled:

* **Every ping a Saturday held for a note that was not mutual comes back.**
  At the reveal, in the same transaction that tells the pairs it tells and
  under the same lock, every ledger row whose night has come is settled once
  (`celestual_ping_settle`, `settled_at`). A row whose pair was told that
  night was used by the mutual. Every other row gives back: a bought one as a
  bought one, on the spender's own row, to keep (`returned` 'kept'); a free
  one as one extra free ping for the reveal after its night (`returned`
  'extra', `celestual_ping_extras`).
* **One extra a person a week, and never more.** The extra is counted across
  every @ a person has linked. A second free ping that lapses the same night
  gives back nothing (`returned` null), and the wall says exactly that: `one
  extra a week is the most, so nothing comes back for this one.` An extra that
  lapses in its turn comes back as the next week's extra, one, so nothing
  piles up and nothing compounds.
* **Each Saturday is judged on its own Saturday.** A note kept for next week
  holds a ping for each of the two reveals it stands in. If the first is not
  mutual, its ping comes back that night and the note runs on, holding the
  second, which is judged on its own night. Every row is settled once and
  marked, so nothing is given back twice.
* **Before the night, and after it.** Letting a note go before its night
  gives its pings back, as it always has. Letting one go after its night gives
  nothing more, since its night already gave back what it held. A mutual uses
  the ping of the night that told it. A note from before 0071 holds no row,
  cost nothing, and gives nothing back.
* **Late is never lost.** The reveal's cheap check returns at once only when
  nothing sealed is due and no row waits to be settled, so a night with no
  pair in it still settles. The broom (`celestual_purge_expired`, and the two
  per cent sweep in `celestual_place`) runs the reveal first and sweeps only
  settled rows. A night settled late (the database down over a Saturday) gives
  its extra for the reveal a note sent now runs to, never one already gone.
* **The answer never says who.** A night that was not mutual answers the same,
  byte for byte, whether the other person never wrote, wrote and let go
  before the night, or is not reachable here: the settlement reads only the
  sender's own ledger and whether the pair was told. Nothing says whether the
  other person is reachable, and the wall says so: `celestual never says
  which, on purpose.` (SECURITY.md section 5 has why.)
* **The share is generic.** The night's screen offers `share celestual`: the
  wall's how it works door (`/join`) and the line it opens on, never a name,
  never a word about who sent what. It is never a condition of anything.

The wall's side is `app/src/wall/Night.jsx`: the night's screen in the private
notes once a reveal (`NightCard`), and the same report on each note that was
not this time and at its own `/reveal/<handle>`.

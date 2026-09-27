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
| Let a running note go | | every ping it holds for a reveal still to come |
| A note that turns out mutual | | any ping it held for a reveal after the one that told it |
| A note that was not this time | | nothing: the ping was used |

A ping that comes back is the free one if the free one was what it spent, and
a bought one otherwise. Letting go before the reveal still tells nobody
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
`celestual_billing_revoke` takes a refunded `'pings'` purchase back by its
quantity, never below zero, and never touches a note already out (0021's
reason: taking one back would tell somebody, by its absence, that it was
sent). `celestual_billing_forget` (erasure) goes with the credits.

The checkout (`celestual-stripe`, `{ action: 'checkout', kind: 'pings',
quantity }`) opens a Stripe Checkout Session for `STRIPE_PRICE_PING` (a one
time $2.99 price; `STRIPE_PRICE_SLOT` is read when it is not set, since it is
the same product) with `quantity` as the line item's quantity, fixed on
Stripe's page so the purchase row and the charge always agree. The buyer comes
back to `/paid?s={CHECKOUT_SESSION_ID}`, or `/paid?c=1` if they did not pay,
and the wall confirms it (`{ action: 'confirm', session_id }`), which answers
`{ ok, paid, applied, kind, quantity, credits }`.

## 6. On the wall

* The composer (`screens/Ping.jsx`) says, on its last step, which ping this
  is: `your free ping this week`, or `1 of your 3 pings`, or, with none left,
  it shows the paywall in place of the send key.
* The paywall (`screens/Pings.jsx`) is one screen of the phone, lit in rose:
  the week's free ping and when the next one comes, a stepper from one to ten,
  the total, and one lit key, `get 3 pings · $8.97`. Under it, in the quiet
  line, that a bought ping never lapses and comes back if its note is let go.
* It is reached two ways: on its own when a note cannot be paid for (sending,
  sending again, keeping), with the note waiting behind it and sent the
  moment the pings land; and from `add more pings` on the private notes tab,
  beside what is left this week.
* Coming back from Stripe (`/paid`), the wall confirms the session, says how
  many landed, and sends the note that was waiting, if one was.

## 7. What the words are

VOICE.md section 6 still bans the paywall voice: never `unlock`, `premium`,
`upgrade`, `go pro`, `subscribe`. A ping is bought, and the screen says
exactly that and exactly what it costs: `get 3 pings · $8.97`. The price is
drawn from `price_cents` where the server says it, and `$2.99` where it has
not yet, and the two must never disagree with Stripe (STRIPE-SETUP.md).

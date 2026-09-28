# STRIPE: connecting it, end to end

> **27 September 2026.** The owner's ruling: one free ping a week, and more for
> $2.99 each, as many as a person chooses (docs/PINGS-BY-THE-WEEK.md, the
> contract; migration 0071). There is one product now, **celestual · pings**,
> sold in any number from one to ten at a time, the number chosen in the app.
> The steady plan of 0021 is not offered by the wall. This guide replaces the
> one written for 0021's "one more standing ping", whose client half was
> deleted with the retired design on 4 September (docs/deletions.md); the
> wall's paywall (`app/src/wall/screens/Pings.jsx`) is the client now.

Everything needed to take celestual from "no money anywhere" to "a person can
buy three pings for $8.97," with the exact product, the exact price, the exact
secrets, and the exact commands. Follow it top to bottom and nothing is left
to guess.

Three things stay true through all of it:

- **Everybody gets one free ping for every Saturday reveal**, forever, and a
  person who never buys anything still sends one private note a week, finds
  out on Saturday, lets a note go, opts out and erases everything. Letting a
  note go gives its ping back, free or bought.
- **A bought ping never lapses.** It is spent only when a note is sent, sent
  again or kept for next week, and only once the week's free one is gone. It
  comes back if its note is let go, or turns out mutual before a reveal it was
  kept for.
- **Nobody has more than ten pings in one reveal.** Buying more does not buy
  past that.

---

## 1 · What is for sale, exactly

One product. One price. The quantity is the buyer's.

| Product name in Stripe | What the buyer gets | Price | Billing | Price env var |
| --- | --- | --- | --- | --- |
| **celestual · pings** | Pings, one to ten at a time, the number chosen in the app and fixed on Stripe's page. Each is one private note in one Saturday reveal, spent only when used. | **$2.99 USD each** | **One time** | `STRIPE_PRICE_PING` |

`STRIPE_PRICE_SLOT` (0021's "one more ping", the same price) is read when
`STRIPE_PRICE_PING` is not set, so a project that already has the old price
keeps working. The steady plan ($12.99 a month, `STRIPE_PRICE_STEADY`) is
still understood by the server so nothing deployed breaks, and nothing offers
it: leave its price unset and it cannot be bought.

What the server enforces (`supabase/migrations/0071_pings_by_the_week.sql`):

| | Pings in a reveal |
| --- | --- |
| Free, always | 1 |
| Bought | as many as are on hand, spent after the free one |
| The ceiling | 10, across every @ one person has linked |

**The price also lives in the app**, as `price_cents` on the server's
allowance (`celestual_ping_price_cents()`, 299) and as `$2.99` in the wall
where it has not been told yet. The wall's key reads `get 3 pings · $8.97`.
Stripe is what actually charges. **If you change the price, change it in
Stripe, in `celestual_ping_price_cents()` and in the wall in the same
release.** Nothing checks this for you, and a key that says $2.99 while
Stripe charges $3.99 is the one kind of mistake this product cannot survive
(docs/ULTIMATE-PRODUCT-FRAMEWORK.md §6.2: everything shown to anyone is
literally true, always).

---

## 2 · How it works, once it is on

```
the wall's paywall (screens/Pings.jsx)     a stepper from one to ten, one key
   { action:'checkout', kind:'pings', quantity }
                                          ▼
                       supabase/functions/celestual-stripe          (service role)
                          · celestual_billing_begin → a 'pending' purchase row
                            for that many
                          · a Stripe Checkout Session carrying its id, the
                            line item's quantity fixed to the same number
                                          │
                              the browser leaves for Stripe's own page
                                          │
   ┌──────────────────────────────────────┴───────────────────────────────────┐
   ▼                                                                          ▼
Stripe → celestual-stripe-webhook          the buyer is sent to
  · verifies the signature                   /paid?session=cs_…
  · celestual_billing_complete               · the wall asks celestual-stripe
  · THE grant: the pings land on hand          'confirm' → the SAME idempotent
                                               grant, and sends the note that
                                               was waiting, if one was
```

Points worth holding onto:

- **The return is `/paid?session=`, never `?s=`.** `?s=` is the wall's flyer
  scan source, which the wall strips and logs as a scan. A buyer who backs out
  lands on `/paid?c=1`.
- **The browser can never grant itself a ping.** Every write lives in
  service-role-only RPCs (`celestual_billing_*`, migrations 0021 and 0071).
  The browser's reads, `celestual_ping_allowance` and the allowance riding on
  `celestual_my_pings`, `celestual_submit` and `celestual_renew`, are
  proof-gated and change nothing.
- **Buying requires the same proof sending a note requires**, the Instagram
  DM ownership secret, always (0071 made it unconditional). Money must never
  be attachable to an @ the buyer hasn't proven, or a purchase becomes a way
  to write to a stranger's account.
- **The quantity is fixed twice, and the two agree.** The purchase row holds
  it, and the Checkout Session's line item is set from that row, not
  adjustable on Stripe's page. The grant adds the row's quantity, so what was
  charged and what lands are the same number.
- **No card ever touches celestual.** Stripe hosts the payment page. Nothing
  in this repo reads, stores, or forwards a card number, which is also why the
  Content-Security-Policy in `vercel.json` needs no Stripe entry: the handoff
  is a top-level redirect, not an embedded frame or a script from another
  host.
- **Stripe never learns an @.** The Checkout Session carries an opaque
  purchase uuid, the kind and the quantity, and nothing else, so the payment
  record on their side cannot be joined to a person on ours. Stripe does of
  course learn the buyer's own card identity (it is a payment processor), but
  nothing about anyone's notes exists in any request this repo makes.
- **Everything is idempotent, twice over.** Stripe event ids are a primary key
  (`celestual_stripe_events`), and a purchase already `paid` grants nothing a
  second time. That is why the webhook and the returning browser can both
  confirm the same session safely. A refund is idempotent the same way: the
  purchase counts the pings refunds have covered (`refunded_quantity`), and
  each refund takes only the difference.

---

## 3 · Before you start

- A **Stripe account** with the business details filled in and payouts
  activated (Stripe → *Settings → Business*). Test mode works without this;
  live mode does not.
- The **Supabase CLI** linked to the project (`supabase link --project-ref …`),
  the same one the other functions deploy from.
- Migrations **0021** (the money layer) and **0069** (the weekly reveal)
  applied. 0071 needs both.
- `/paid` is a reserved route (0021 added `'paid'` to the reserved four-letter
  codes). Nothing to do unless somebody owned that code before 0021:

  ```sql
  select code, handle from celestual_recruits where code = 'paid';
  ```

  (0034 retired the recruit tables; if the query says the table does not
  exist, there is nothing to check.)

**Do the whole of §4 in Stripe *test mode* first.** Everything below is
written so that switching to live is a key swap and nothing else.

---

## 4 · The steps

### Step 1: apply the database migration

Supabase → *SQL Editor* → paste `supabase/migrations/0071_pings_by_the_week.sql`
and run it, or `supabase db push` if that is how this project applies
migrations. It is idempotent.

It creates `celestual_ping_spends` (the ledger: one row per note per reveal,
and whether it was the free ping or a bought one), adds
`celestual_entitlements.ping_credits` (bought pings on hand) and folds every
slot bought under 0021 into it once, adds `quantity` and `refunded_quantity`
to `celestual_purchases` and lets its kind be `'pings'`, adds
`celestual_ping_allowance`, and re-creates `celestual_submit`,
`celestual_renew`, `celestual_withdraw`, `celestual_my_pings`,
`celestual_reveal_due`, `celestual_purge_expired`, `celestual_slots_for`,
`celestual_billing_status`, `celestual_billing_begin` (now with
`p_quantity`), `celestual_billing_complete`, `celestual_billing_revoke` (now
with `p_amount_refunded` and `p_amount`) and `celestual_billing_forget`.

**Read this before running it:** from this moment the standing cap of two is
gone. Every person has one free ping for the reveal a note sent now runs to;
a second note that week is refused with `no_pings` until pings are bought.
Notes already out are left alone and hold no ping: they were sent under the
old rule. Sanity check afterwards:

```sql
select celestual_ping_allowance('someverifiedhandle', null);
--     → { "ok": false, "allowance": { "free": 1, "free_left": 1, "credits": 0,
--          "sent": 0, "ceiling": 10, "price_cents": 299, ... } }
--       (false because no proof was passed: nobody's allowance)
```

### Step 2: create the product in Stripe

Stripe Dashboard → *Product catalog* → **Add product**. The name is what the
buyer sees on Stripe's page, so keep it lowercase and calm, like the rest of
the product.

| Field | Value |
| --- | --- |
| Name | `celestual · pings` |
| Description | `private notes for saturday's reveal. a ping never lapses and comes back if its note is let go.` |
| Amount | `2.99` |
| Currency | `USD` |
| Billing | **One-off** (Stripe calls it "One time") |
| Tax behaviour | Inclusive, unless your accountant says otherwise |

The quantity is not set on the product. The checkout sets it per purchase,
from the number the buyer chose in the app, and Stripe charges the price
times it.

Then copy its **price id**: the `price_…` string on the price row, *not* the
`prod_…` product id. That distinction is the single most common mistake here;
a `prod_` id fails at session creation with an unhelpful error.

### Step 3: set the edge function secrets

Supabase → *Edge Functions → Secrets* (or the CLI, below). `sk_test_…` while
you are testing; swap to `sk_live_…` in Step 8.

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx \
  STRIPE_PRICE_PING=price_xxxxxxxxxxxxxxxxxxxxx \
  CELESTUAL_SITE_URL=https://celestual.us
```

| Secret | Used by | What it is |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | both functions | Stripe → *Developers → API keys* → secret key. Never the publishable one, and never in a `VITE_` var: it is a server credential. |
| `STRIPE_PRICE_PING` | `celestual-stripe` | the `price_…` for $2.99 one time. Falls back to `STRIPE_PRICE_SLOT` when unset. |
| `STRIPE_PRICE_SLOT` | `celestual-stripe` | 0021's price. Only needed if `STRIPE_PRICE_PING` is not set. |
| `STRIPE_PRICE_STEADY` | `celestual-stripe` | leave unset: the plan is not offered. |
| `CELESTUAL_SITE_URL` | `celestual-stripe` | where Stripe returns people. Must be the real origin, no trailing slash. |
| `STRIPE_WEBHOOK_SECRET` | `celestual-stripe-webhook` | Step 5 produces it |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.
Do not set them by hand.

### Step 4: deploy the two functions

```bash
supabase functions deploy celestual-stripe
supabase functions deploy celestual-stripe-webhook --no-verify-jwt
```

**The `--no-verify-jwt` on the webhook is not optional and not a loosening.**
Stripe cannot send a Supabase JWT, so with JWT verification on, every delivery
would be rejected before the function ran. That endpoint's authentication *is*
the Stripe signature, which it verifies itself (HMAC-SHA256 over
`<timestamp>.<raw body>`, constant-time compared, five-minute tolerance)
before reading a single field. Deploy it without the flag and payments will be
taken while no ping ever lands.

Either order with 0071 works: the function passes `p_quantity`, which a
database before 0071 does not take (the checkout then fails with `stripe` in
its logs, and nothing is charged), and a database after 0071 takes an older
function's call without it (quantity one).

### Step 5: create the webhook endpoint

Stripe → *Developers → Webhooks* → **Add endpoint**.

- **Endpoint URL**

  ```
  https://YOUR-PROJECT-REF.supabase.co/functions/v1/celestual-stripe-webhook
  ```

- **Events to send**:

  | Event | Why |
  | --- | --- |
  | `checkout.session.completed` | the purchase. this is the grant |
  | `checkout.session.async_payment_succeeded` | slower payment methods clearing later |
  | `charge.refunded` | a refund, whole or in part, takes back the pings it covers |
  | `charge.dispute.closed` | a lost dispute takes the purchase back |

  Only if an old steady plan is still being paid for somewhere, add
  `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`
  and `customer.subscription.deleted` too. Anything else is acknowledged and
  ignored on purpose, so an extra subscription in the dashboard is harmless
  rather than a retry loop.

- Reveal the endpoint's **signing secret** (`whsec_…`) and set it:

  ```bash
  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
  ```

  Then **redeploy the webhook function** so it picks the secret up:

  ```bash
  supabase functions deploy celestual-stripe-webhook --no-verify-jwt
  ```

Test and live mode have **different signing secrets**. Swapping keys in Step 8
means creating the live endpoint and setting its secret too.

### Step 6: ship the wall

The paywall is the wall's (`app/src/wall/screens/Pings.jsx`), reached on its
own when a note cannot be paid for and from `add more pings` on the private
notes tab, and it comes back from Stripe on `/paid`. Ship the build that has
it. Nothing on the server needs switching on: until a person runs out of
pings, nobody sees a price.

### Step 7: test the whole path in test mode

Use a real verified handle on a preview or production build with test keys.

1. Send one private note. It goes out on this week's free ping.
2. Send a second. The paywall appears, with the note waiting behind it.
3. Choose three and tap `get 3 pings · $8.97`. You land on Stripe's hosted
   page, showing three at $2.99. Pay with `4242 4242 4242 4242`, any future
   expiry, any CVC, any postcode.
4. You come back to `/paid?session=cs_…`, it confirms, says three landed, and
   the waiting note goes out on one of them.

Then verify each layer actually did its job:

```sql
-- the ledger of money: one paid row for three
select handle, kind, quantity, status, amount_cents, currency, paid_at
  from celestual_purchases order by created_at desc limit 3;

-- what is on hand: two, the third spent on the note that was waiting
select handle, ping_credits from celestual_entitlements where handle = 'yourhandle';

-- the ledger of notes: this week's free one and one bought
select to_hash, reveal_at, kind from celestual_ping_spends where handle = 'yourhandle';

-- what the app is told
select celestual_ping_allowance('yourhandle', 'the-proof-from-localStorage');
--     → { "ok": true, "allowance": { "free_left": 0, "credits": 2, "sent": 2, ... } }
```

- Stripe → *Webhooks → your endpoint* should show `200` for
  `checkout.session.completed`.
- Supabase → *Edge Functions → Logs* for both functions should be free of
  `billing_complete refused` and `bad signature`.

**And test the failure paths**, because they are real:

- Back out of Stripe's page (its back arrow). You land on `/paid?c=1`, and
  nothing in `celestual_purchases` flips to `paid`.
- Refund one ping's worth in Stripe (*Payments → the payment → Refund*,
  $2.99). Within seconds `ping_credits` drops by one and the purchase still
  reads `paid` with `refunded_quantity` 1. Refund the rest: the other one on
  hand goes, the one spent on a note stays spent, and the purchase reads
  `refunded`. Notes already sent are deliberately **left alone** by a refund:
  retracting one would reveal by absence that it had been sent.

### Step 8: go live

1. Stripe → toggle out of test mode. **Re-create the product and price in
   live mode** (test objects do not carry over) and copy the new `price_…` id.
2. Create the **live webhook endpoint** at the same URL, the same events, and
   reveal its own `whsec_…`.
3. Set the live values:

   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx \
     STRIPE_PRICE_PING=price_live_xxxxxxxxxxxxxxxxx \
     STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
   ```

4. Redeploy both functions (secrets are read at boot):

   ```bash
   supabase functions deploy celestual-stripe
   supabase functions deploy celestual-stripe-webhook --no-verify-jwt
   ```

5. Buy one ping with a real card, on your own account, and refund it. That is
   the only proof that live mode works, and it costs $2.99 for about a minute.

**Go-live checklist**

- [ ] the live price is $2.99, one time, and `celestual_ping_price_cents()` is 299
- [ ] the wall's key and its quiet line say $2.99 and nothing else
- [ ] webhook endpoint deployed `--no-verify-jwt`, showing `200`s
- [ ] `STRIPE_SECRET_KEY` is a `sk_live_…`, and is nowhere in any `VITE_` var
- [ ] a real purchase landed real pings, and a refund took them back
- [ ] `/terms` and the in-app privacy screen say what is free (one ping a
      reveal, letting go, the reveal, the opt out, erasure) and what is
      bought, and it is still true
- [ ] `npm run lint:voice` passes (it bans paywall voice: no "unlock", no
      "upgrade", no "premium")

---

## 5 · Turning it back off

Unset `STRIPE_PRICE_PING` (and `STRIPE_PRICE_SLOT`) and redeploy
`celestual-stripe`: every checkout answers `config`, and nothing is charged.
Nothing else changes: pings already bought stay on hand and keep being spent
as notes go out, because they live in `celestual_entitlements.ping_credits`
and the database spends them whatever Stripe is doing. Nobody who paid loses
anything by the door being closed again. The free ping every reveal does not
depend on Stripe at all.

---

## 6 · What each piece is

```
app/src/wall/screens/Pings.jsx             the paywall: a stepper, the total,
                                           one key; and /paid, coming back
supabase/functions/celestual-stripe/       creates Checkout Sessions; confirms a
                                           session for a returning browser
supabase/functions/celestual-stripe-webhook/  the ONLY thing that grants pings
supabase/migrations/0021_stripe_slots.sql  entitlements, the ledger, the event
                                           guard
supabase/migrations/0071_pings_by_the_week.sql
                                           the ping ledger, pings on hand, the
                                           allowance, the week's rule
```

The RPCs, and who may call them:

| RPC | Caller | What it does |
| --- | --- | --- |
| `celestual_ping_allowance` | the browser (proof-gated) | this reveal's free ping, what is on hand, what is sent, the ceiling, the price, and the next reveal |
| `celestual_billing_begin` | service role | proves the @, checks the kind and the quantity, writes the pending purchase |
| `celestual_billing_complete` | service role | **the grant.** Idempotent |
| `celestual_billing_revoke` | service role | a refund, whole or in part, or a lost dispute |
| `celestual_billing_plan_sync` | service role | an old plan's paid-through date |
| `celestual_billing_seen` / `_unsee` | service role | the webhook replay guard |
| `celestual_billing_forget` | internal | what erasure does to the money and the ledger (§9) |

---

## 7 · When something's off

| Symptom | Cause | Fix |
| --- | --- | --- |
| The checkout answers `config` | `STRIPE_SECRET_KEY` or both price ids unset | set them and redeploy `celestual-stripe` |
| The checkout answers `stripe` | Stripe refused the session (a `prod_…` id where a `price_…` belongs), or the database is before 0071 | Supabase → Function logs; apply 0071 |
| The checkout answers `quantity` | the app sent a number outside one to ten | a wall bug; the server refused it before Stripe was asked |
| The checkout answers `unverified` | the DM proof is stale (30 day sliding window, migration 0009) | confirm the Instagram again; the door opens straight after |
| Paid, but the pings never land | the webhook is not landing | Stripe → Webhooks: non-`2xx`? `bad signature` means `STRIPE_WEBHOOK_SECRET` is wrong or the function was deployed **with** JWT verification. Fix the secret, redeploy `--no-verify-jwt`, then hit **Resend** on the event in Stripe |
| `/paid` says it is still landing | the confirm call didn't see a paid session (usually a stale or reused session id) | harmless: the webhook grants it. Check the ledger, and Resend the event if it never turned `paid` |
| A second note says `week_full` | ten pings are already in that reveal | nothing to fix; it is the ceiling. Bought pings stay on hand for next week |
| Every delivery logs `duplicate` | the event guard already saw that id | expected for a genuine retry. **Resend** creates a new delivery of the same event id, so use Stripe's *Resend* only when the first attempt failed |

Reading the logs:

```bash
supabase functions logs celestual-stripe --tail
supabase functions logs celestual-stripe-webhook --tail
```

---

## 8 · Operating it

- **Where the money is.** Stripe's dashboard is the truth for payments;
  `celestual_purchases` is the truth for what each payment granted, and how
  many of those pings a refund has covered. They should agree row for row. If
  they don't, the webhook missed a delivery: Resend it.
- **Pings for someone by hand** (a support fix, a founder's own account). This
  is a deliberate, logged act, not a routine one:

  ```sql
  insert into celestual_entitlements (handle, ping_credits)
  values ('theirhandle', 1)
  on conflict (handle) do update
    set ping_credits = celestual_entitlements.ping_credits + 1, updated_at = now();
  ```

- **Linked accounts share what one of them buys.** Pings on hand are summed
  across the identity group (`celestual_handle_links`), and the free ping and
  the ceiling are counted across it, because it was always per person rather
  than per @.
- **A weekly glance is enough.** Payments in Stripe, then:

  ```sql
  select kind, status, count(*), sum(quantity) as pings, sum(refunded_quantity) as refunded,
         sum(amount_cents) / 100.0 as usd
    from celestual_purchases group by kind, status order by kind, status;
  ```

- **The measurements that matter are still not revenue** (docs/PRICING-REVENUE.md):
  note resolution rate, match rate, keep versus lapse.

---

## 9 · Refunds, erasure, and the honest edge

**The terms promise:** unused bought pings are refundable on request within 14
days; a refund or a chargeback takes back the pings it covers, never below
none, and never touches a note already sent.

**Refunding on request** needs nothing but the Stripe dashboard. Refund the
money for the pings not yet used: $2.99 for each (Stripe → *Payments → the
payment → Refund*, a partial amount). `charge.refunded` carries the running
total refunded, and `celestual_billing_revoke` takes back floor(refunded /
unit price) pings, the unit price being what the purchase was charged over
its quantity, minus what earlier refunds of the same charge already took. So a
purchase refunded in parts is taken back in parts, and the same refund told
twice takes nothing the second time. The purchase reads `refunded` only when
every ping it bought is covered. Notes already sent are never retracted by a
refund, on purpose: removing one would reveal by absence that it existed, and
the double blind holds even against our own billing.

**Erasing an account gives up what it bought.** "Delete everything", the
public opt out and the desk's delete all call `celestual_billing_forget`: the
pings on hand and the ledger of the account's notes go with the rest of it,
while the purchase row stays with its handle set to `null` (accounting needs
the number; it does not need the person). Other people's notes to the erased
@ go with it too, and a ping they held for a reveal still to come goes back to
their senders. This is the right way round (the erasure promise on `/privacy`
outranks a $2.99 purchase), but it means someone can erase and lose unused
pings with no way to restore them from our side, because there is nothing
left to key them to.

So, when someone erases and then asks:

1. Find the payment in Stripe by their card or email (our side no longer
   knows).
2. Refund it there. Stripe → *Payments → the payment → Refund*.
3. The `charge.refunded` webhook will find the purchase with no handle and
   answer `unknown`. That is fine and expected; the refund is the remedy.

---

## 10 · The decision this doc implements

docs/PRICING-REVENUE.md recorded, until 27 September, that nothing was for
sale and Stripe stayed plumbed and dormant. The owner's ruling of that day
(the dated section at the top of that document, and docs/PINGS-BY-THE-WEEK.md)
supersedes it: one free ping a week, and more at $2.99 each. This runbook is
that ruling's plumbing.

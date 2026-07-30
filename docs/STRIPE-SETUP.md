# STRIPE — connecting it, end to end

Everything needed to take celestual from "no money anywhere" to "a person can
hold one more ping for $2.99," with the exact products, the exact prices, the
exact secrets, and the exact commands. Follow it top to bottom and nothing is
left to guess.

Two things stay true through all of it:

- **The core product never costs anything.** Placing, matching, the reveal,
  renewing, letting one go, the opt-out, erasure, verification, communities and
  their weekly stats are free forever, and they say so on the privacy screen and
  in `/terms` §5 (docs/PRICING-REVENUE.md §2). Money only ever appears in front
  of someone who already holds their free two and is reaching for one more.
- **"Let one go" is always the first door.** It is the primary button on that
  screen and it is free. The paid door sits under it. If you ever find the paid
  door above the free one, that is a bug, and a serious one.

---

## 1 · What is for sale, exactly

Two products. Two prices. Nothing else, ever (docs/PRICING-REVENUE.md §3 and
§5 — no cosmetic tiers, no pay-to-reveal, no ads, and nothing at all charged to
the person being pinged).

| # | Product name in Stripe | What the buyer gets | Price | Billing | Price env var |
| --- | --- | --- | --- | --- | --- |
| 1 | **celestual · one more ping** | One extra standing ping slot, on top of the free two. Repeatable: a second purchase is a fourth slot, and so on, up to ten. | **$2.99 USD** | **One time** | `STRIPE_PRICE_SLOT` |
| 2 | **celestual · steady** | Ten standing pings, and every ping placed or renewed while it is live stands **six months** instead of sixty days. | **$12.99 USD / month** | **Recurring, monthly** | `STRIPE_PRICE_STEADY` |

The caps and windows those two buy, as the server enforces them
(`supabase/migrations/0021_stripe_slots.sql`):

| | Standing pings | Each ping stands |
| --- | --- | --- |
| Free, always | 2 | 60 days, renewable free, forever |
| Each "one more ping" bought | +1 (hard ceiling 10) | 60 days |
| While "steady" is paid through | 10 | 180 days |

**The two amounts also live in the copy**, at `paywall.price` (`$2.99`) and
`paywall.subPrice` (`$12.99`) in `app/src/i18n/strings.js`. Those strings are
what the buyer reads, and Stripe is what actually charges. **If you change a
price, change it in both places in the same commit.** Nothing checks this for
you, and a door that says $2.99 while Stripe charges $3.99 is the one kind of
mistake this product cannot survive (docs/ULTIMATE-PRODUCT-FRAMEWORK.md §6.2:
everything shown to anyone is literally true, always).

### A third price, deliberately not built

docs/PRICING-REVENUE.md §3 also names a one-time **"hold indefinitely"** ($2.99,
keeps one ping standing with no renewals). The `/demo` sandbox previews it as the
"keep it standing" checkout. **Production has no such door and no such price**,
because renewing is free and one tap, and a paid renewal would be selling
something the free product already does. If it ever wakes it needs its own kind
in `celestual_billing_begin`; do not point it at `STRIPE_PRICE_SLOT`.

---

## 2 · How it works, once it is on

```
                       app/src/api/billing.js        the only client-side money code
Screen 9 (screens.jsx) ─── hold('slot') ──┐         (HoldDoors, under "let one go")
                                          ▼
                       supabase/functions/celestual-stripe          (service role)
                          · celestual_billing_begin → a 'pending' purchase row
                          · creates a Stripe Checkout Session carrying its id
                                          │
                              the browser leaves for Stripe's own page
                                          │
   ┌──────────────────────────────────────┴───────────────────────────────────┐
   ▼                                                                          ▼
Stripe → celestual-stripe-webhook          the buyer is sent to /paid?s=cs_…
  · verifies the signature                   · PaidScreen asks celestual-stripe
  · celestual_billing_complete               · 'confirm' → the SAME idempotent
  · THE grant. the only one.                   grant, so the meter is right now
```

Points worth holding onto:

- **The browser can never grant itself a slot.** Every write lives in
  service-role-only RPCs (`celestual_billing_*`, migration 0021). The client's
  single billing read, `celestual_billing_status`, is proof-gated and read-only.
- **Buying requires the same proof placing a ping requires** — the Instagram-DM
  ownership secret. Money must never be attachable to an @ the buyer hasn't
  proven, or a purchase becomes a way to write to a stranger's account.
- **No card ever touches celestual.** Stripe hosts the payment page. Nothing in
  this repo reads, stores, or forwards a card number, which is also why the
  Content-Security-Policy in `vercel.json` needs no Stripe entry: the handoff is
  a top-level redirect, not an embedded frame or a script from another host.
- **Stripe never learns an @.** The Checkout Session carries an opaque purchase
  uuid and nothing else, so the payment record on their side cannot be joined to
  a person on ours. Stripe does of course learn the buyer's own card identity —
  it is a payment processor — but nothing about anyone's pings exists in any
  request this repo makes.
- **Everything is idempotent, twice over.** Stripe event ids are a primary key
  (`celestual_stripe_events`), and a purchase already `paid` grants nothing a
  second time. That is why the webhook and the returning browser can both
  confirm the same session safely.

---

## 3 · Before you start

- A **Stripe account** with the business details filled in and payouts
  activated (Stripe → *Settings → Business*). Test mode works without this; live
  mode does not.
- The **Supabase CLI** linked to the project (`supabase link --project-ref …`),
  the same one the other functions deploy from.
- **Access to Vercel's environment variables** for the site.
- The **migration 0021 pre-flight**, one query in the Supabase SQL editor. `/paid`
  is now a reserved route, so make sure no trial competitor already owns that
  four-letter code:

  ```sql
  select code, handle from celestual_recruits where code = 'paid';
  ```

  Zero rows is the expected answer, and then there is nothing to do. If it
  returns a row, that person's tracking link is about to stop resolving: give
  them a new code before you deploy (docs/FIRST-LIGHT-TRIAL.md), because
  `/paid` now belongs to the return-from-Stripe screen.

**Do the whole of §4 in Stripe *test mode* first.** Everything below is written
so that switching to live is a key swap and nothing else.

---

## 4 · The steps

### Step 1 — apply the database migration

Supabase → *SQL Editor* → paste `supabase/migrations/0021_stripe_slots.sql` and
run it, or `supabase db push` if that is how this project applies migrations. It
is idempotent and safe on top of 0001→0020.

It creates `celestual_entitlements`, `celestual_purchases` and
`celestual_stripe_events`, adds the `celestual_billing_*` RPCs, and re-creates
`celestual_submit` / `celestual_slots_for` / `celestual_renew` /
`celestual_erase_account` / `celestual_suppress` / `celestual_trial_code_ok`.

**Read this before running it:** the free standing cap becomes **2**, matching
the client that has been shipping since the ping-model rework (`SLOT_CAP = 2`,
and the copy calls Screen 9 "the third slot"). The server had been allowing 3 —
slack the UI never offered anyone. Nobody loses a ping they already hold: the cap
is only read when a *new* pair is placed, so a person standing at three keeps all
three until one lapses or they let it go. Sanity check afterwards:

```sql
select celestual_free_cap();                      -- 2
select celestual_billing_status('someverifiedhandle', null);
--     → { "ok": false, "cap": 2, ... }  (false because no proof was passed)
```

### Step 2 — create the two products in Stripe

Stripe Dashboard → *Product catalog* → **Add product**, twice. The names are what
the buyer sees on Stripe's page, so keep them lowercase and calm, like the rest
of the product.

**Product 1 — the one-time slot**

| Field | Value |
| --- | --- |
| Name | `celestual · one more ping` |
| Description | `one more standing ping. one time, never a subscription.` |
| Amount | `2.99` |
| Currency | `USD` |
| Billing | **One-off** (Stripe calls it "One time") |
| Tax behaviour | Inclusive, unless your accountant says otherwise |

**Product 2 — the monthly plan**

| Field | Value |
| --- | --- |
| Name | `celestual · steady` |
| Description | `ten pings a month. each stands six months.` |
| Amount | `12.99` |
| Currency | `USD` |
| Billing | **Recurring**, monthly |
| Free trial | none |

Then copy each one's **price id** — the `price_…` string on the price row, *not*
the `prod_…` product id. That distinction is the single most common mistake here;
a `prod_` id fails at session creation with an unhelpful error.

If you are only turning on the one-time slot for now, create Product 1 and skip
Product 2. Everything below tolerates a missing `STRIPE_PRICE_STEADY`: the plan
simply cannot be bought.

### Step 3 — set the edge-function secrets

Supabase → *Edge Functions → Secrets* (or the CLI, below). `sk_test_…` while you
are testing; swap to `sk_live_…` in Step 8.

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx \
  STRIPE_PRICE_SLOT=price_xxxxxxxxxxxxxxxxxxxxx \
  STRIPE_PRICE_STEADY=price_yyyyyyyyyyyyyyyyyyyyy \
  CELESTUAL_SITE_URL=https://celestual.us
```

| Secret | Used by | What it is |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | both functions | Stripe → *Developers → API keys* → secret key. Never the publishable one, and never in a `VITE_` var: it is a server credential. |
| `STRIPE_PRICE_SLOT` | `celestual-stripe` | the `price_…` for $2.99 one-time |
| `STRIPE_PRICE_STEADY` | `celestual-stripe` | the `price_…` for $12.99/month. Omit to keep the plan unbuyable. |
| `CELESTUAL_SITE_URL` | `celestual-stripe` | where Stripe returns people. Must be the real origin, no trailing slash. |
| `STRIPE_WEBHOOK_SECRET` | `celestual-stripe-webhook` | Step 5 produces it |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. Do
not set them by hand.

### Step 4 — deploy the two functions

```bash
supabase functions deploy celestual-stripe
supabase functions deploy celestual-stripe-webhook --no-verify-jwt
```

**The `--no-verify-jwt` on the webhook is not optional and not a loosening.**
Stripe cannot send a Supabase JWT, so with JWT verification on, every delivery
would be rejected before the function ran. That endpoint's authentication *is*
the Stripe signature, which it verifies itself (HMAC-SHA256 over
`<timestamp>.<raw body>`, constant-time compared, five-minute tolerance) before
reading a single field. Deploy it without the flag and payments will be taken
while no slot is ever granted.

### Step 5 — create the webhook endpoint

Stripe → *Developers → Webhooks* → **Add endpoint**.

- **Endpoint URL**

  ```
  https://YOUR-PROJECT-REF.supabase.co/functions/v1/celestual-stripe-webhook
  ```

- **Events to send** — exactly these eight:

  | Event | Why |
  | --- | --- |
  | `checkout.session.completed` | the purchase. this is the grant |
  | `checkout.session.async_payment_succeeded` | slower payment methods clearing later |
  | `invoice.paid` | how a monthly plan renews. nothing else has to run |
  | `invoice.payment_failed` | logged only; Stripe retries on its own |
  | `customer.subscription.updated` | a plan changing state |
  | `customer.subscription.deleted` | a plan ending |
  | `charge.refunded` | give the slot back |
  | `charge.dispute.closed` | a lost dispute gives the slot back too |

  Anything else is acknowledged and ignored on purpose, so an extra subscription
  in the dashboard is harmless rather than a retry loop.

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

### Step 6 — turn the door on in the frontend

Vercel → *Project → Settings → Environment Variables* (and `app/.env.local` for
local work):

```bash
VITE_STRIPE_ENABLED=1     # the paid door exists at all
VITE_STRIPE_PLAN=1        # also offer the $12.99 plan (needs STRIPE_PRICE_STEADY)
```

Both default to `0`, which is the dormant posture: Screen 9 shows one door, and
nothing in production mentions money. Set `VITE_STRIPE_ENABLED=1` alone to sell
the one-time slot only. Redeploy the site — Vite bakes these in at build time, so
changing the variable without a rebuild changes nothing.

### Step 7 — test the whole path in test mode

Use a real verified handle on a preview or production build with test keys.

1. Place two pings, so the free two are held.
2. Try a third. Screen 9 appears: **"let one go"** on top, and under it
   *"or hold a third for $2.99, once"*.
3. Tap it. You land on Stripe's hosted page. Pay with `4242 4242 4242 4242`, any
   future expiry, any CVC, any postcode.
4. You come back to `/paid`, it confirms, and it says **"one more, held."**
5. Tap **"place it"** and place a third ping. It should go through.

Then verify each layer actually did its job:

```sql
-- the ledger: one paid row
select handle, kind, status, amount_cents, currency, paid_at
  from celestual_purchases order by created_at desc limit 3;

-- the entitlement: one extra slot
select handle, extra_slots, plan, plan_until from celestual_entitlements;

-- the cap the product now enforces for that person
select celestual_billing_status('yourhandle', 'the-proof-from-localStorage');
--     → { "ok": true, "cap": 3, "extra": 1, "plan": null, "ping_days": 60 }
```

- Stripe → *Webhooks → your endpoint* should show `200` for
  `checkout.session.completed`.
- Supabase → *Edge Functions → Logs* for both functions should be free of
  `billing_complete refused` and `bad signature`.

**Test the plan too, if you are shipping it:** buy `steady` with the same test
card, then check `plan_until` is about a month out and that a newly placed ping's
`expires_at` is ~180 days away rather than ~60.

**And test the two failure paths**, because both are real:

- Back out of Stripe's page (its back arrow). You land on `/paid` reading
  *"nothing was charged."* Nothing in `celestual_purchases` flips to `paid`.
- Refund the test payment in Stripe (*Payments → the payment → Refund*). Within
  seconds `extra_slots` drops back and the purchase reads `refunded`. Standing
  pings are deliberately **left alone** by a refund: retracting someone's ping
  would reveal by absence that they had placed one.

### Step 8 — go live

1. Stripe → toggle out of test mode. **Re-create both products and prices in
   live mode** (test objects do not carry over) and copy the new `price_…` ids.
2. Create the **live webhook endpoint** at the same URL, same eight events, and
   reveal its own `whsec_…`.
3. Set the live values:

   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx \
     STRIPE_PRICE_SLOT=price_live_xxxxxxxxxxxxxxxxx \
     STRIPE_PRICE_STEADY=price_live_yyyyyyyyyyyyyyy \
     STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
   ```

4. Redeploy both functions (secrets are read at boot):

   ```bash
   supabase functions deploy celestual-stripe
   supabase functions deploy celestual-stripe-webhook --no-verify-jwt
   ```

5. Buy one slot with a real card, on your own account, and refund it. That is
   the only proof that live mode works, and it costs $2.99 for about a minute.

**Go-live checklist**

- [ ] `paywall.price` in `strings.js` matches the live Stripe amount to the cent
- [ ] `paywall.subPrice` matches too, or `VITE_STRIPE_PLAN=0`
- [ ] webhook endpoint deployed `--no-verify-jwt`, showing `200`s
- [ ] `STRIPE_SECRET_KEY` is a `sk_live_…`, and is nowhere in any `VITE_` var
- [ ] a real purchase granted a real slot, and a refund took it back
- [ ] Screen 9 still shows **"let one go"** as the primary action
- [ ] `/terms` §5 and the in-app privacy screen still list what is free, and it
      is still true (renewing is on that list, and renewing is still free)
- [ ] `npm run lint:voice` passes (it bans paywall voice: no "unlock", no
      "upgrade", no "premium")

---

## 5 · Turning it back off

`VITE_STRIPE_ENABLED=0` and a redeploy. The paid door disappears, Screen 9 goes
back to its single free door, and nothing else changes: slots already bought stay
bought (the entitlement rows are untouched and the cap still honours them), and
`celestual_submit` keeps enforcing whatever each person holds. Nobody who paid
loses anything by the door being closed again.

To stop *new* subscription charges as well, cancel the live subscriptions in
Stripe. Each cancellation arrives as `customer.subscription.deleted`, and
`celestual_billing_plan_sync` keeps that person's plan through the period they
already paid for and then lets it lapse on its own.

---

## 6 · What each piece is

```
app/src/api/billing.js                     the only client-side money code:
                                           startCheckout · confirmCheckout ·
                                           fetchBilling · the flags
app/src/components/screens.jsx             HoldDoors (Screen 9's second door)
                                           PaidScreen (coming back from Stripe)
app/src/i18n/strings.js                    hold.* and paid.* copy, and the two
                                           prices the buyer reads
supabase/functions/celestual-stripe/       creates Checkout Sessions; confirms a
                                           session for a returning browser
supabase/functions/celestual-stripe-webhook/  the ONLY thing that grants a slot
supabase/migrations/0021_stripe_slots.sql  entitlements, the ledger, the event
                                           guard, the per-person cap
```

The RPCs, and who may call them:

| RPC | Caller | What it does |
| --- | --- | --- |
| `celestual_billing_status` | the browser (proof-gated) | standing, cap, extra, plan, ping_days |
| `celestual_billing_begin` | service role | proves the @, refuses what it shouldn't sell, writes the pending purchase |
| `celestual_billing_complete` | service role | **the grant.** Idempotent |
| `celestual_billing_plan_sync` | service role | pushes or pulls a plan's paid-through date |
| `celestual_billing_revoke` | service role | refund or lost dispute |
| `celestual_billing_seen` / `_unsee` | service role | the webhook replay guard |
| `celestual_billing_forget` | internal | what erasure does to the money (§9) |

---

## 7 · When something's off

| Symptom | Cause | Fix |
| --- | --- | --- |
| The paid door never appears | `VITE_STRIPE_ENABLED` not `1` at **build** time, or you are looking at `/demo` (which is always the local preview) | set it in Vercel and redeploy; test outside `/demo` |
| Tapping it says *"that didn't open. nothing was charged."* | `celestual-stripe` returned an error | Supabase → Function logs. Usually a missing `STRIPE_SECRET_KEY`/price id (`config`), or a `prod_…` id where a `price_…` belongs (`stripe`) |
| *"prove your @ again, then this door opens."* | the DM proof is stale (30-day sliding window, migration 0009) | verify again; the door opens straight after |
| *"you're holding all ten already."* | the hard ceiling | nothing to fix; it is the ceiling |
| Paid, but the slot never arrives | the webhook is not landing | Stripe → Webhooks: non-`2xx`? `bad signature` means `STRIPE_WEBHOOK_SECRET` is wrong or the function was deployed **with** JWT verification. Fix the secret, redeploy `--no-verify-jwt`, then hit **Resend** on the event in Stripe |
| `/paid` says *"it's still landing."* | the confirm call didn't see a paid session (usually a stale or reused session id) | harmless: the webhook grants it. Check the ledger, and Resend the event if it never turned `paid` |
| Every delivery logs `duplicate` | the event guard already saw that id | expected for a genuine retry. **Resend** creates a new delivery of the same event id, so use Stripe's *Resend* only when the first attempt failed |
| A plan renewed but the cap fell back | `invoice.paid` is not subscribed in the dashboard | add the event; then Resend the missed invoice |

Reading the logs:

```bash
supabase functions logs celestual-stripe --tail
supabase functions logs celestual-stripe-webhook --tail
```

---

## 8 · Operating it

- **Where the money is.** Stripe's dashboard is the truth for payments;
  `celestual_purchases` is the truth for what each payment granted. They should
  agree row-for-row. If they don't, the webhook missed a delivery — Resend it.
- **A slot for someone by hand** (a support fix, a founder's own account). This is
  a deliberate, logged act, not a routine one:

  ```sql
  insert into celestual_entitlements (handle, extra_slots)
  values ('theirhandle', 1)
  on conflict (handle) do update
    set extra_slots = celestual_entitlements.extra_slots + 1, updated_at = now();
  ```

- **Linked accounts share what one of them buys.** The cap is read across the
  identity group (`celestual_handle_links`), because it always was per-person
  rather than per-@. Buying on one of your own @s covers all of them.
- **A weekly glance is enough.** Payments in Stripe, then:

  ```sql
  select kind, status, count(*), sum(amount_cents) / 100.0 as usd
    from celestual_purchases group by kind, status order by kind, status;
  ```

- **The measurements that matter are still not revenue** (docs/PRICING-REVENUE.md
  §6): ping resolution rate, match rate, renewal versus lapse. Price work is
  capped; density work compounds.

---

## 9 · Refunds, erasure, and the honest edge

**Erasing an account gives up what it bought.** "Delete everything" and the
public opt-out both call `celestual_billing_forget`: the entitlement row goes
with the rest of the account, while the purchase row stays with its handle set to
`null` (accounting needs the number; it does not need the person). This is the
right way round — the erasure promise on `/privacy` outranks a $2.99 purchase —
but it means someone can erase and lose a paid slot with no way to restore it
from our side, because there is nothing left to key it to.

So, when someone erases and then asks:

1. Find the payment in Stripe by their card or email (our side no longer knows).
2. Refund it there. Stripe → *Payments → the payment → Refund*.
3. The `charge.refunded` webhook will look for an entitlement to reduce and find
   none. That is fine and expected; the refund is the remedy.

**Refunds in the ordinary case** (no erasure) need nothing but the Stripe
dashboard: refund the payment and `celestual_billing_revoke` gives the slot back
within seconds. Standing pings are never retracted by a refund, on purpose:
removing one would reveal by absence that it existed, and the double-blind holds
even against our own billing.

---

## 10 · The decision this doc implements

docs/PRICING-REVENUE.md is the binding monetization document and it says: keep
Stripe plumbed and dormant until density is proven, then sell exactly one thing,
once. This runbook is that plumbing, and §3 there records the wake decision and
the one place where the shipped shape argues with the original argument — the
monthly plan, which §5 had rejected on principle and which the sandbox has been
previewing anyway. Read both before turning `VITE_STRIPE_PLAN=1` on: the
one-time slot is the shape the framework endorses, and it is the one that ships
on by default here.

# STRIPE — connecting it, end to end

Everything needed to take celestual from "no money anywhere" to "a person can
hold one more ping for $2.99," with the exact products, the exact prices, the
exact secrets, and the exact commands. Reveal night (migration 0054) ships in the
same pass and has its own steps below. Follow it top to bottom and nothing is
left to guess.

> **20 September 2026.** The client half is back, in `app/src/main/`
> (`Place.jsx` draws the two doors, `Sky.jsx` the meter and the quiet line,
> `Paid.jsx` the return from Stripe, `app/src/api/billing.js` the calls). The
> switch is at the desk, not in a build flag: migration 0053 replaced
> `VITE_STRIPE_ENABLED` and `VITE_STRIPE_PLAN` with `billing_enabled` and
> `billing_plan_enabled` in `celestual_settings`, read by the server on every
> request.

Two things stay true through all of it:

- **The core product never costs anything.** Placing, matching, the reveal,
  renewing, letting one go, the opt-out, erasure, verification and the wall are
  free, and they say so on the privacy page and in `/terms` §08
  (docs/PRICING-REVENUE.md §2). Money only ever appears in front of someone who
  already holds their cap and is reaching for one more.
- **"Let one go" is always the first door.** It is the primary button on that
  screen and it is free. The paid line sits under it. If you ever find the paid
  line above the free one, that is a bug, and a serious one.

---

## 1 · What is for sale, exactly

Two products. Two prices. Nothing else, ever (docs/PRICING-REVENUE.md §3 and
§5: no cosmetic tiers, no pay-to-reveal, no ads, and nothing at all charged to
the person being pinged).

| # | Product name in Stripe | What the buyer gets | Price | Billing | Price env var |
| --- | --- | --- | --- | --- | --- |
| 1 | **extra slot** | One more standing ping at a time, on top of the free two, kept for good. Repeatable: a second purchase is a fourth slot, and so on, up to ten. | **$2.99 USD** | **One time** | `STRIPE_PRICE_SLOT` |
| 2 | **unlimited** | No cap on standing pings, and every ping placed or renewed while it is paid stands **six months** instead of sixty days. | **$12.99 USD / month** | **Recurring, monthly** | `STRIPE_PRICE_STEADY` |

In the database the two kinds are still `'slot'` and `'steady'` (the names in
`celestual_purchases.kind`); only what people read changed.

The caps and windows those two buy, as the server enforces them (migrations 0021
and 0053):

| | Standing pings | Each ping stands |
| --- | --- | --- |
| Free, always | 2 | 60 days, renewable free, forever |
| Each extra slot bought | +1 (hard ceiling 10) | 60 days |
| While unlimited is paid through | no cap (`celestual_cap_for` answers null) | 180 days |

The pacing rule in `celestual_submit`, six new placements in any thirty days,
applies to everyone including a pass holder. It is a rule against sweeping a list
of names, not a slot.

**The two amounts also live in the copy**, as `SLOT_PRICE` (`$2.99`) and
`PLAN_PRICE` (`$12.99`) in `app/src/api/billing.js`. Those strings are what the
buyer reads on the letter and the sky, and Stripe is what actually charges. **If
you change a price, change it in both places in the same commit.** Nothing checks
this for you, and a door that says $2.99 while Stripe charges $3.99 is the one
kind of mistake this product cannot survive (docs/ULTIMATE-PRODUCT-FRAMEWORK.md
§6.2: everything shown to anyone is literally true, always).

### A third price, deliberately not built

docs/PRICING-REVENUE.md §3 also names a one-time **"hold indefinitely"**.
Production has no such door and no such price, because renewing is free and one
tap, and a paid renewal would be selling something the free product already does.
The renew button on the sky says **"sixty more days · free"** for exactly that
reason.

---

## 2 · How it works, once it is on

```
                       app/src/api/billing.js        the only client-side money code
Place.jsx, full  ─── startCheckout('slot') ──┐      (the two doors, under "let one go")
Sky.jsx, at the cap ─ startCheckout('slot') ──┤      (the quiet line)
                                              ▼
                       supabase/functions/celestual-stripe          (service role)
                          · celestual_billing_begin → asks the desk's switch,
                            proves the @, writes a 'pending' purchase row
                          · creates a Stripe Checkout Session carrying its id
                                              │
                              the browser leaves for Stripe's own page
                              (the letter is stashed first, use:'paid')
                                              │
   ┌──────────────────────────────────────────┴───────────────────────────────┐
   ▼                                                                          ▼
Stripe → celestual-stripe-webhook          the buyer is sent to /paid?s=cs_…
  · verifies the signature                   · Paid.jsx asks celestual-stripe
  · celestual_billing_complete               · 'confirm' → the SAME idempotent
  · THE grant. the only one.                   grant, so the meter is right now
                                             · "place it" reopens the letter
```

Points worth holding onto:

- **The browser can never grant itself a slot.** Every write lives in
  service-role-only RPCs (`celestual_billing_*`, migrations 0021 and 0053). The
  client's single billing read, `celestual_billing_status`, is proof-gated and
  read-only; it also says whether the door is on (`enabled`, `plan_offered`),
  which is not a secret, so a screen can draw the right door for anybody.
- **The switch is real on the server.** With `billing_enabled` off,
  `celestual_billing_begin` answers `'off'` before it reads a thing, whatever a
  client sends.
- **Buying requires the same proof placing a ping requires**, the Instagram-DM
  ownership secret, and since 0053 that is checked whatever the release gate
  says. Money must never be attachable to an @ the buyer has not proven.
- **No card ever touches celestual.** Stripe hosts the payment page. Nothing in
  this repo reads, stores, or forwards a card number, which is also why the
  Content-Security-Policy in `vercel.json` needs no Stripe entry: the handoff is
  a top-level redirect, not an embedded frame or a script from another host.
- **Stripe never learns an @.** The Checkout Session carries an opaque purchase
  uuid and nothing else.
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
- **The desk password**, for `/admin`.
- **`pg_cron`** on the project (Supabase → *Database → Extensions*). Reveal night
  writes its mail on the night with a scheduled sweep; without the extension the
  two delivery functions still run the sweep when they are invoked, so nothing is
  lost, but the mail can wait for the next webhook.

**Do the whole of §4 in Stripe *test mode* first.** Everything below is written
so that switching to live is a key swap and nothing else.

---

## 4 · The steps

### Step 1 — apply the two migrations

Supabase → *SQL Editor* → paste `supabase/migrations/0053_the_paid_door.sql` and
run it, then `0054_reveal_night.sql`, in that order (or `supabase db push` if
that is how this project applies migrations). Both are idempotent and safe on top
of 0001→0052.

0053 adds the two switches to the desk, re-creates `celestual_billing_status` and
`celestual_billing_begin` (the switch, the unconditional proof), and makes
`celestual_cap_for` answer null on a live pass. 0054 adds `reveal_at`, the four
reveal night settings, re-creates `celestual_submit` and every reader of a match,
and schedules `celestual_reveal_sweep()` where `pg_cron` exists.

Sanity check afterwards:

```sql
select celestual_billing_status('someverifiedhandle', null);
--     → { "ok": false, "enabled": false, "plan_offered": false, "cap": 2, ... }
select celestual_next_reveal();
--     → the coming Saturday at 04:00 UTC (9 pm PDT) or 05:00 UTC (9 pm PST)
select jobname from cron.job where jobname = 'celestual-reveal-sweep';
--     → one row. None means pg_cron was off when 0054 ran: enable it, then
--       re-run the last block of 0054 (the `do $$ … $$` at the end).
```

### Step 2 — create the two products in Stripe

Stripe Dashboard → *Product catalog* → **Add product**, twice. The names are what
the buyer sees on Stripe's page and on the receipt, so keep them lowercase and
calm, like the rest of the product.

**Product 1 — the extra slot**

| Field | Value |
| --- | --- |
| Name | `extra slot` |
| Description | `one more standing ping at a time, on celestual. once, never a subscription.` |
| Amount | `2.99` |
| Currency | `USD` |
| Billing | **One-off** (Stripe calls it "One time") |
| Tax behaviour | Inclusive, unless your accountant says otherwise |

**Product 2 — unlimited**

| Field | Value |
| --- | --- |
| Name | `unlimited` |
| Description | `no cap on standing pings, each held six months, on celestual.` |
| Amount | `12.99` |
| Currency | `USD` |
| Billing | **Recurring**, monthly |
| Free trial | none |

Then copy each one's **price id**, the `price_…` string on the price row, *not*
the `prod_…` product id. That distinction is the single most common mistake here;
a `prod_` id fails at session creation with an unhelpful error.

If you are only turning on the extra slot for now, create Product 1 and skip
Product 2. Everything below tolerates a missing `STRIPE_PRICE_STEADY`: the pass
simply cannot be bought, and its desk switch should stay off.

### Step 3 — set the edge-function secrets

Supabase → *Edge Functions → Secrets* (or the CLI, below). `sk_test_…` while you
are testing; swap to `sk_live_…` in Step 9.

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
| `STRIPE_PRICE_STEADY` | `celestual-stripe` | the `price_…` for $12.99/month. Omit to keep the pass unbuyable. |
| `CELESTUAL_SITE_URL` | `celestual-stripe` | where Stripe returns people. Must be the real origin, no trailing slash. |
| `STRIPE_WEBHOOK_SECRET` | `celestual-stripe-webhook` | Step 5 produces it |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. Do
not set them by hand.

### Step 4 — deploy the functions

```bash
supabase functions deploy celestual-stripe
supabase functions deploy celestual-stripe-webhook --no-verify-jwt
supabase functions deploy celestual-notify
supabase functions deploy celestual-mutual-dm --no-verify-jwt
```

**The `--no-verify-jwt` on the webhook is not optional and not a loosening.**
Stripe cannot send a Supabase JWT, so with JWT verification on, every delivery
would be rejected before the function ran. That endpoint's authentication *is*
the Stripe signature, which it verifies itself before reading a single field.
Deploy it without the flag and payments will be taken while no slot is ever
granted.

The last two are redeploys: since 0054 both run `celestual_reveal_sweep()` first
thing, so the night's mail and DMs are written even on a project with no
`pg_cron`. Deploy them after 0054 is applied.

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
  | `invoice.paid` | how the pass renews. nothing else has to run |
  | `invoice.payment_failed` | logged only; Stripe retries on its own |
  | `customer.subscription.updated` | a pass changing state |
  | `customer.subscription.deleted` | a pass ending |
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

Test and live mode have **different signing secrets**. Swapping keys in Step 9
means creating the live endpoint and setting its secret too.

### Step 6 — deploy the site

Merge the branch and let Vercel build it (or `npm run build` and deploy by
hand). **No new Vercel environment variable is needed**: the door is a row at
the desk, not a build flag. `app/.env.example` says so where the two old flags
used to be.

### Step 7 — turn the door on, at the desk

`/admin` → **settings** → **the money** → **the paid door**: on. It takes at once;
nothing is redeployed. Leave **unlimited** off unless you created Product 2 and
set `STRIPE_PRICE_STEADY`, and have read docs/PRICING-REVENUE.md §3 first.

While you are there, **reveal night** is on by default at Saturday 21:00,
America/Los_Angeles. Change the day, the hour or the zone if you want to; a
change takes for matches made after it, and a pair already scheduled keeps its
night. The sky, the letter's "It's out." and the front door read the night from
the server and follow the change on their own. Three places name Saturday in
static copy and need a commit if the day moves: the site description in
`app/index.html`, `/terms` §02, and the wall's join screen line in
`app/src/wall/screens/Join.jsx` says "on reveal night" and needs nothing.

### Step 8 — test the whole path in test mode

Use a real verified handle on a preview or production build with test keys, at a
quiet hour: the desk's switch is global.

**The slot**

1. Place two pings, so the free two are held. The sky reads **"2 of 2
   standing"** under the heading.
2. Write a third. On "place it" the screen changes to **"You're holding two."**
   with **"let one go"** as the pill and, under it, *"extra slot · $2.99, once"*.
3. Tap the line. You land on Stripe's hosted page. Pay with `4242 4242 4242 4242`,
   any future expiry, any CVC, any postcode.
4. You come back to `/paid`, it confirms, and it says **"One more, held."** with
   the session id gone from the address bar.
5. Tap **"place it"**. The letter opens again with the name, the words and the
   signature where they were. Place it. The sky reads **"3 of 3 standing"** and,
   under the list, the quiet line offers another.

Then verify each layer actually did its job:

```sql
-- the ledger: one paid row
select handle, kind, status, amount_cents, currency, paid_at
  from celestual_purchases order by created_at desc limit 3;

-- the entitlement: one extra slot
select handle, extra_slots, plan, plan_until from celestual_entitlements;

-- the cap the product now enforces for that person
select celestual_billing_status('yourhandle', 'the-proof-from-localStorage');
--     → { "ok": true, "enabled": true, "cap": 3, "extra": 1, "plan": null, ... }
```

- Stripe → *Webhooks → your endpoint* should show `200` for
  `checkout.session.completed`.
- Supabase → *Edge Functions → Logs* for both functions should be free of
  `billing_complete refused` and `bad signature`.
- The desk's log (**settings → what the desk did**) shows the flip.

**Test the pass too, if you are shipping it:** turn **unlimited** on at the desk,
buy it with the same test card, then check `plan_until` is about a month out,
that the sky reads **"3 standing · unlimited"**, and that a newly placed ping's
`expires_at` is ~180 days away rather than ~60.

**And test the two failure paths**, because both are real:

- Back out of Stripe's page (its back arrow). You land on `/paid` reading
  **"Nothing was charged."** with **"back to the letter"**, which reopens it.
  Nothing in `celestual_purchases` flips to `paid`.
- Refund the test payment in Stripe (*Payments → the payment → Refund*). Within
  seconds `extra_slots` drops back and the purchase reads `refunded`. Standing
  pings are deliberately **left alone** by a refund: retracting someone's ping
  would reveal by absence that they had placed one.

**Reveal night**

1. With two test handles you hold, place a ping each way. Both skies read the
   pair as **standing**, the meter still counts it, and `celestual_submit`
   answered `mutual: false` to the second placement.
2. `/admin → pings` lists the pair as mutual with **"opens …"** and the night.
3. At the desk, set **the hour** to the current hour plus one (in the zone
   shown), and wait for it. Both skies change to **"It's mutual."** together,
   with no reload if the tab was open, and both emails arrive within a few
   minutes (the sweep runs every five; the Instagram DM follows its own window
   rules, docs/MANYCHAT-MUTUAL-DM.md).
4. Put the hour back to 21.

```sql
-- a held pair: matched, scheduled, nothing queued yet
select from_handle, matched_at, reveal_at, expires_at from celestual_entries where matched_at is not null;
select handle_a, handle_b, reveal_at, queued_at from celestual_matches;
-- after the night: queued_at set, two mail rows, two DM rows
select celestual_reveal_sweep();
```

### Step 9 — go live

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

4. Redeploy both Stripe functions (secrets are read at boot):

   ```bash
   supabase functions deploy celestual-stripe
   supabase functions deploy celestual-stripe-webhook --no-verify-jwt
   ```

5. Buy one slot with a real card, on your own account, and refund it. That is
   the only proof that live mode works, and it costs $2.99 for about a minute.

**Go-live checklist**

- [ ] `SLOT_PRICE` in `app/src/api/billing.js` matches the live Stripe amount to the cent
- [ ] `PLAN_PRICE` matches too, or **unlimited** stays off at the desk
- [ ] webhook endpoint deployed `--no-verify-jwt`, showing `200`s
- [ ] `STRIPE_SECRET_KEY` is a `sk_live_…`, and is nowhere in any `VITE_` var
- [ ] a real purchase granted a real slot, and a refund took it back
- [ ] the letter's full screen still shows **"let one go"** as the pill, the paid line under it
- [ ] `/terms` §08 and `/privacy` §01 and §06 still say what is free and what is
      sold, and it is still true (renewing is free, and the button says so)
- [ ] `select jobname from cron.job` shows `celestual-reveal-sweep`, or you have
      accepted that the night's mail rides the next webhook
- [ ] `npm run lint:voice` passes (it bans paywall voice: no "unlock", no
      "upgrade", no "premium")

---

## 5 · Turning it back off

`/admin → settings → the money → the paid door`: off. It takes at once. The paid
line disappears from the letter and the sky, the full screen goes back to its one
line, `celestual_billing_begin` refuses with `'off'`, and nothing else changes:
slots already bought stay bought (the entitlement rows are untouched and the cap
still honours them), and `celestual_submit` keeps enforcing whatever each person
holds. Nobody who paid loses anything by the door being closed again.

To stop *new* pass charges as well, cancel the live subscriptions in Stripe. Each
cancellation arrives as `customer.subscription.deleted`, and
`celestual_billing_plan_sync` keeps that person's pass through the period they
already paid for and then lets it lapse on its own.

**Reveal night off**: `/admin → settings → reveal night → the night`: off. A match
made after that opens and mails the instant it happens, as before 0054. A pair
already scheduled keeps its night.

---

## 6 · What each piece is

```
app/src/api/billing.js                     the only client-side money code:
                                           fetchBilling · startCheckout ·
                                           confirmCheckout · the two prices
app/src/main/Place.jsx                     the full screen: "let one go", the paid
                                           line, the stash of the letter
app/src/main/Sky.jsx                       the meter, the reveal night line, the
                                           quiet paid line, "sixty more days · free"
app/src/main/Paid.jsx                      coming back from Stripe
app/src/admin/Settings.jsx                 the money, and reveal night
supabase/functions/celestual-stripe/       creates Checkout Sessions; confirms a
                                           session for a returning browser
supabase/functions/celestual-stripe-webhook/  the ONLY thing that grants a slot
supabase/migrations/0021_stripe_slots.sql  entitlements, the ledger, the event
                                           guard, the per-person cap
supabase/migrations/0053_the_paid_door.sql the desk's switches, the unconditional
                                           proof, no ceiling on a pass
supabase/migrations/0054_reveal_night.sql  reveal_at, the night's arithmetic, the
                                           held readers, the sweep
scripts/sql/test-billing.sql               the loop's proof of 0053
scripts/sql/test-reveal.sql                the loop's proof of 0054
```

The RPCs, and who may call them:

| RPC | Caller | What it does |
| --- | --- | --- |
| `celestual_billing_status` | the browser (proof-gated) | enabled, plan_offered, standing, cap, extra, plan, ping_days |
| `celestual_billing_begin` | service role | asks the switch, proves the @, refuses what it shouldn't sell, writes the pending purchase |
| `celestual_billing_complete` | service role | **the grant.** Idempotent |
| `celestual_billing_plan_sync` | service role | pushes or pulls a pass's paid-through date |
| `celestual_billing_revoke` | service role | refund or lost dispute |
| `celestual_billing_seen` / `_unsee` | service role | the webhook replay guard |
| `celestual_billing_forget` | internal | what erasure does to the money (§9) |
| `celestual_reveal_night` | the browser | when the next night is. The same answer for everyone |
| `celestual_reveal_sweep` | service role, pg_cron | writes the night's mail and DM rows, once per pair |

---

## 7 · When something's off

| Symptom | Cause | Fix |
| --- | --- | --- |
| The paid line never appears | `billing_enabled` is off at the desk, or the person is not at their cap, or they hold a pass (no ceiling, nothing to sell) | flip it at the desk; check `celestual_billing_status` for that handle |
| Tapping it says *"that door is not open"* | `celestual_billing_begin` answered `'off'`: the desk switch is off on the server | flip it at the desk |
| Tapping it says *"that did not open. nothing was charged."* | `celestual-stripe` returned an error | Supabase → Function logs. Usually a missing `STRIPE_SECRET_KEY`/price id (`config`), or a `prod_…` id where a `price_…` belongs (`stripe`) |
| *"that proof has lapsed. one more DM proves it again"* | the DM proof is stale (30-day sliding window, migration 0009) | verify again; the door opens straight after |
| *"you are holding all ten already."* | the hard ceiling on bought slots | nothing to fix; it is the ceiling |
| Paid, but the slot never arrives | the webhook is not landing | Stripe → Webhooks: non-`2xx`? `bad signature` means `STRIPE_WEBHOOK_SECRET` is wrong or the function was deployed **with** JWT verification. Fix the secret, redeploy `--no-verify-jwt`, then hit **Resend** on the event in Stripe |
| `/paid` says *"It's still landing."* | the confirm call didn't see a paid session (usually a stale or reused session id) | harmless: the webhook grants it. Check the ledger, and Resend the event if it never turned `paid` |
| Every delivery logs `duplicate` | the event guard already saw that id | expected for a genuine retry. Use Stripe's *Resend* only when the first attempt failed |
| A pass renewed but the cap came back | `invoice.paid` is not subscribed in the dashboard | add the event; then Resend the missed invoice |
| "It should have been mutual by now" | it is, and it is held: the night has not come | `/admin → pings` shows the pair with its night. Nothing to fix; the hold is the product |
| The night came and no mail went out | the sweep did not run: no `pg_cron`, and no webhook invoked either function since | `select celestual_reveal_sweep();` by hand, or enable `pg_cron` and re-run the last block of 0054 |
| The hero or the sky says "at once" while the night is on | the browser could not read `celestual_reveal_night` (an older database, or the RPC not granted) | apply 0054; `select celestual_reveal_night();` should answer as anon |

Reading the logs:

```bash
supabase functions logs celestual-stripe --tail
supabase functions logs celestual-stripe-webhook --tail
supabase functions logs celestual-notify --tail
```

---

## 8 · Operating it

- **Where the money is.** Stripe's dashboard is the truth for payments;
  `celestual_purchases` is the truth for what each payment granted. They should
  agree row-for-row. If they don't, the webhook missed a delivery: Resend it.
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

- **Reveal night, weekly.** Saturday after nine, Pacific: `select handle_a,
  handle_b, reveal_at, queued_at from celestual_matches where reveal_at > now() -
  interval '1 day';` should show every pair from the week with `queued_at` set.
- **The measurements that matter are still not revenue** (docs/PRICING-REVENUE.md
  §6): ping resolution rate, match rate, renewal versus lapse. Price work is
  capped; density work compounds.

---

## 9 · Refunds, erasure, and the honest edge

**Erasing an account gives up what it bought.** "Delete everything" and the
public opt-out both call `celestual_billing_forget`: the entitlement row goes
with the rest of the account, while the purchase row stays with its handle set to
`null` (accounting needs the number; it does not need the person). This is the
right way round, the erasure promise on `/privacy` outranks a $2.99 purchase, but
it means someone can erase and lose a paid slot with no way to restore it from
our side, because there is nothing left to key it to.

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

**One known edge on `/paid`.** Reopening an old `/paid?s=…` link after a refund
reads "One more, held.", because Stripe's session still says paid and the
server's "already applied" answer is also the normal "the webhook got there
first" answer. The meter on the sky is right; only that one screen is stale.

---

## 10 · The decision this doc implements

docs/PRICING-REVENUE.md is the binding monetization document. It kept Stripe
plumbed and dormant until density was proven, then sold exactly one thing, once;
§7 there records the wake on 20 September 2026. This runbook is that plumbing,
and the one place where the shipped shape argues with the original argument is
still the monthly pass, which §5 rejected on principle. Read both before turning
**unlimited** on: the extra slot is the shape the framework endorses, and it is
the one that ships on by default here.

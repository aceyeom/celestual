// CELESTUAL: celestual-stripe edge function.
//
// The front door of the one thing celestual sells (docs/PINGS-BY-THE-WEEK.md,
// migration 0071): pings, $2.99 each, one to ten at a time. The old kinds
// ('slot', one ping; 'steady', the plan) are still taken so a tab on an older
// build does not break, and neither is offered by the wall. Two actions on one
// endpoint, and no card ever touches us: Stripe hosts the payment page and we
// only ever hold a session id.
//
//   { action:'checkout', handle, proof, kind:'pings' (the default), quantity }
//        celestual_billing_begin proves the @ is really theirs (the SAME DM
//        proof placing a ping needs), writes a 'pending' purchase for that
//        many, and we open a Stripe Checkout Session carrying that purchase id,
//        the quantity fixed on Stripe's page so the row and the charge agree.
//        `quantity` is a whole number from 1 to 10 for 'pings' (missing is 1);
//        anything else is refused with 'quantity' before Stripe is asked.
//        Response: { ok:true, url } | { ok:false, error }
//   { action:'confirm', session_id }
//        The returning browser's own nudge. The webhook is the source of truth,
//        but it can land a second or two after the redirect home, and a person
//        who just paid should not watch a stale count. Reads the session
//        straight from Stripe and applies the SAME idempotent grant; if the
//        webhook already did it, this reports applied:false and changes nothing.
//        Response: { ok:true, paid, applied, kind, quantity, credits }
//                | { ok:false, error }
//        `credits` is the pings on hand now, across the buyer's linked @s.
//
// The buyer comes back to /paid?session={CHECKOUT_SESSION_ID}, or /paid?c=1
// when they did not pay. Not ?s=: that is the wall's flyer scan parameter.
//
// Errors are stable slugs the client localizes:
//   'handle' | 'kind' | 'quantity' | 'unverified' | 'suppressed' | 'rate'
//   | 'has_plan' | 'config' | 'stripe' | 'demo' | 'bad_input'
//
// WHAT STRIPE LEARNS: a purchase id (an opaque uuid), the kind and the
// quantity, and whatever the buyer types on Stripe's own page. No celestual @
// is ever sent as metadata, so the payment record on their side cannot be
// joined to a person on ours. Nothing about anyone's pings exists in this file.
//
// Required secrets (Supabase, Edge Functions, Secrets):
//   STRIPE_SECRET_KEY     sk_test_... while testing, sk_live_... in production
//   STRIPE_PRICE_PING     price id of "celestual · pings" ($2.99, one time).
//                         STRIPE_PRICE_SLOT is read when it is not set: the
//                         same product at the same price.
//   STRIPE_PRICE_STEADY   price id of "steady" ($12.99 / month), optional and
//                         never offered by the wall: without it the plan
//                         simply cannot be bought
//   CELESTUAL_SITE_URL    https://celestual.us (where Stripe sends people back)
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-stripe
// Runbook: docs/STRIPE-SETUP.md
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const PRICE_SLOT = Deno.env.get('STRIPE_PRICE_SLOT') ?? '';
const PRICE_PING = Deno.env.get('STRIPE_PRICE_PING') || PRICE_SLOT;
const PRICE_STEADY = Deno.env.get('STRIPE_PRICE_STEADY') ?? '';
const MOST_PINGS = 10;

// A whole number of pings from one to MOST_PINGS, or null. Missing is one.
function quantityOf(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 1;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MOST_PINGS) return null;
  return n;
}
const SITE = (Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us').replace(/\/+$/, '');

// Pinned so a dashboard-side API upgrade can never change the shape we read.
const STRIPE_VERSION = '2024-06-20';
const STRIPE_API = 'https://api.stripe.com/v1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

// Stripe's REST API is form-encoded, including nested keys (a[b][c]=v). Building
// the body by hand keeps this function to one dependency-free fetch.
function form(obj: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    p.append(k, String(v));
  }
  return p.toString();
}

async function stripe(
  path: string,
  init?: { method?: 'GET' | 'POST'; body?: string; idempotencyKey?: string },
): Promise<{ ok: boolean; status: number; data: Record<string, any> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_KEY}`,
    'Stripe-Version': STRIPE_VERSION,
  };
  if (init?.body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (init?.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body,
  });
  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    /* a non-JSON body from Stripe means something is very wrong; ok stays false */
  }
  if (!res.ok) console.error('stripe error', path, res.status, data?.error?.message ?? '');
  return { ok: res.ok, status: res.status, data };
}

// Unix seconds → ISO, for the paid-through date the entitlement stores.
const iso = (unix: unknown): string | null => {
  const n = Number(unix);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null;
};

// A subscription's period end. Older API versions carry it on the subscription;
// newer ones moved it onto the items, so read both rather than pick a side.
function periodEnd(sub: Record<string, any> | null): string | null {
  if (!sub) return null;
  return iso(sub.current_period_end) ?? iso(sub.items?.data?.[0]?.current_period_end);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!STRIPE_KEY) return json({ ok: false, error: 'config' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad_input' }, 400);
  }
  // The sandbox previews the shape locally and must never reach a payment
  // processor (README: in /demo nothing leaves the browser).
  if (body.demo === true) return json({ ok: false, error: 'demo' });

  const action = String(body.action || '');

  // ── CHECKOUT ────────────────────────────────────────────────────────────
  if (action === 'checkout') {
    const handle = String(body.handle || '');
    const proof = body.proof == null ? null : String(body.proof);
    const kind = String(body.kind || 'pings');
    if (kind !== 'pings' && kind !== 'slot' && kind !== 'steady') return json({ ok: false, error: 'kind' });

    // Only 'pings' comes in a number; a slot is one ping and a plan is one plan.
    const quantity = kind === 'pings' ? quantityOf(body.quantity) : 1;
    if (quantity === null) return json({ ok: false, error: 'quantity' });

    const price = kind === 'steady' ? PRICE_STEADY : kind === 'slot' ? PRICE_SLOT || PRICE_PING : PRICE_PING;
    if (!price) return json({ ok: false, error: 'config' });

    // The gate: ownership, the quantity, the opt-out list, the rate limit and
    // "you already have this" all live in SQL (migrations 0021 and 0071) so
    // this function holds no policy of its own beyond refusing early.
    const { data: begun, error: beginErr } = await supabase.rpc('celestual_billing_begin', {
      p_handle: handle,
      p_proof: proof,
      p_kind: kind,
      p_quantity: quantity,
    });
    if (beginErr) {
      console.error('billing_begin failed', beginErr.message);
      return json({ ok: false, error: 'stripe' });
    }
    if (!begun?.ok) return json({ ok: false, error: begun?.error || 'bad_input' });
    const purchaseId = String(begun.purchase_id);
    // The row is the truth of what is being bought; Stripe charges for exactly it.
    const lineQuantity = Number(begun.quantity) || quantity;

    // Only the purchase id, the kind and the count travel. Stripe never
    // learns the @.
    const payload: Record<string, string | number> = {
      mode: kind === 'steady' ? 'subscription' : 'payment',
      'line_items[0][price]': price,
      'line_items[0][quantity]': lineQuantity,
      // The session id rides the QUERY (Stripe substitutes the template there);
      // /paid confirms it and drops it from the address bar on arrival. It is
      // `session`, not `s`, which the wall reads as a flyer scan.
      success_url: `${SITE}/paid?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/paid?c=1`,
      client_reference_id: purchaseId,
      'metadata[purchase_id]': purchaseId,
      'metadata[kind]': kind,
      'metadata[quantity]': lineQuantity,
    };
    // Carry it onto the charge / subscription too, so a refund or a cancellation
    // arriving as its own event can still find its purchase.
    if (kind === 'steady') payload['subscription_data[metadata][purchase_id]'] = purchaseId;
    else payload['payment_intent_data[metadata][purchase_id]'] = purchaseId;

    const { ok, data } = await stripe('/checkout/sessions', {
      method: 'POST',
      body: form(payload),
      idempotencyKey: `celestual-checkout-${purchaseId}`,
    });
    if (!ok || !data?.url) return json({ ok: false, error: 'stripe' });

    await supabase
      .from('celestual_purchases')
      .update({ stripe_session_id: String(data.id) })
      .eq('id', purchaseId);

    return json({ ok: true, url: String(data.url) });
  }

  // ── CONFIRM (the returning browser) ─────────────────────────────────────
  if (action === 'confirm') {
    const sessionId = String(body.session_id || '');
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json({ ok: false, error: 'bad_input' });

    const { ok, data: session } = await stripe(`/checkout/sessions/${sessionId}`);
    if (!ok || !session) return json({ ok: false, error: 'stripe' });

    const purchaseId = String(session.metadata?.purchase_id || session.client_reference_id || '');
    if (!purchaseId) return json({ ok: false, error: 'bad_input' });

    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!paid) {
      return json({
        ok: true,
        paid: false,
        applied: false,
        kind: session.metadata?.kind ? String(session.metadata.kind) : null,
        quantity: Number(session.metadata?.quantity) || null,
        credits: null,
      });
    }

    let periodEndIso: string | null = null;
    if (session.subscription) {
      const { ok: subOk, data: sub } = await stripe(`/subscriptions/${String(session.subscription)}`);
      if (subOk) periodEndIso = periodEnd(sub);
    }

    const { data: applied, error: rpcErr } = await supabase.rpc('celestual_billing_complete', {
      p_purchase_id: purchaseId,
      p_session_id: sessionId,
      p_payment_intent: session.payment_intent ? String(session.payment_intent) : null,
      p_amount_cents: Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : null,
      p_currency: session.currency ? String(session.currency) : null,
      p_customer: session.customer ? String(session.customer) : null,
      p_subscription: session.subscription ? String(session.subscription) : null,
      p_period_end: periodEndIso,
    });
    if (rpcErr) {
      console.error('billing_complete failed', rpcErr.message);
      return json({ ok: false, error: 'stripe' });
    }
    if (!applied?.ok) return json({ ok: false, error: applied?.error || 'stripe' });

    return json({
      ok: true,
      paid: true,
      applied: !!applied.applied,
      kind: applied.kind ?? null,
      quantity: Number.isFinite(Number(applied.quantity)) ? Number(applied.quantity) : null,
      credits: Number.isFinite(Number(applied.credits)) ? Number(applied.credits) : null,
    });
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

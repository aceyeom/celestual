// CELESTUAL — celestual-stripe edge function.
//
// The front door of the one thing celestual sells (docs/PRICING-REVENUE.md §3,
// migration 0021): a third standing ping, bought once, or the 'steady' plan.
// Two actions on one endpoint, and no card ever touches us — Stripe hosts the
// payment page and we only ever hold a session id.
//
//   { action:'checkout', handle, proof, kind:'slot'|'steady' }
//        → celestual_billing_begin proves the @ is really theirs (the SAME DM
//          proof placing a ping needs), writes a 'pending' purchase, and we open
//          a Stripe Checkout Session carrying that purchase id.
//          Response: { ok:true, url } | { ok:false, error }
//   { action:'confirm', session_id }
//        → the returning browser's own nudge. The webhook is the source of truth,
//          but it can land a second or two after the redirect home, and a person
//          who just paid should not watch a stale meter. Reads the session
//          straight from Stripe and applies the SAME idempotent grant; if the
//          webhook already did it, this reports applied:false and changes nothing.
//          Response: { ok:true, paid, applied, kind, cap } | { ok:false, error }
//
// Errors are stable slugs the client localizes:
//   'handle' | 'kind' | 'unverified' | 'suppressed' | 'rate' | 'at_cap'
//   | 'has_plan' | 'config' | 'stripe' | 'demo' | 'bad_input'
//
// WHAT STRIPE LEARNS: a purchase id (an opaque uuid) and whatever the buyer
// types on Stripe's own page. No celestual @ is ever sent as metadata, so the
// payment record on their side cannot be joined to a person on ours. Nothing
// about anyone's pings exists in this file.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY     — sk_test_… while testing, sk_live_… in production
//   STRIPE_PRICE_SLOT     — price id of "one more ping" ($2.99, one time)
//   STRIPE_PRICE_STEADY   — price id of "steady" ($12.99 / month), optional:
//                           without it the plan simply cannot be bought
//   CELESTUAL_SITE_URL    — https://celestual.us (where Stripe sends people back)
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-stripe
// Runbook: docs/STRIPE-SETUP.md
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const PRICE_SLOT = Deno.env.get('STRIPE_PRICE_SLOT') ?? '';
const PRICE_STEADY = Deno.env.get('STRIPE_PRICE_STEADY') ?? '';
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
    const kind = String(body.kind || 'slot');
    if (kind !== 'slot' && kind !== 'steady') return json({ ok: false, error: 'kind' });

    const price = kind === 'steady' ? PRICE_STEADY : PRICE_SLOT;
    if (!price) return json({ ok: false, error: 'config' });

    // The gate: ownership, the opt-out list, the rate limit and "you already
    // have this" all live in SQL (migration 0021) so this function holds no
    // policy of its own.
    const { data: begun, error: beginErr } = await supabase.rpc('celestual_billing_begin', {
      p_handle: handle,
      p_proof: proof,
      p_kind: kind,
    });
    if (beginErr) {
      console.error('billing_begin failed', beginErr.message);
      return json({ ok: false, error: 'stripe' });
    }
    if (!begun?.ok) return json({ ok: false, error: begun?.error || 'bad_input' });
    const purchaseId = String(begun.purchase_id);

    // Only the purchase id travels. Stripe never learns the @.
    const payload: Record<string, string | number> = {
      mode: kind === 'steady' ? 'subscription' : 'payment',
      'line_items[0][price]': price,
      'line_items[0][quantity]': 1,
      // The session id rides the QUERY (Stripe substitutes the template there);
      // /paid confirms it and drops it from the address bar on arrival.
      success_url: `${SITE}/paid?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/paid?c=1`,
      client_reference_id: purchaseId,
      'metadata[purchase_id]': purchaseId,
      'metadata[kind]': kind,
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
    if (!paid) return json({ ok: true, paid: false, applied: false });

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
      cap: applied.cap ?? null,
    });
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

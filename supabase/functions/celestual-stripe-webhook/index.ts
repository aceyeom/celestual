// CELESTUAL — celestual-stripe-webhook edge function.
//
// The ONLY thing that grants a paid slot (migration 0021, and the pattern
// celestual_complete_ig_verification set: a service-role function is the sole
// writer of anything a browser could otherwise lie about). Stripe posts here;
// every request is signature-verified before a single field is read.
//
// Events acted on:
//   checkout.session.completed / .async_payment_succeeded
//        → celestual_billing_complete. Grants the one-time slot, or stands the
//          plan up to its paid-through date.
//   invoice.paid
//        → celestual_billing_plan_sync(active). Pushes the paid-through date out
//          a month. This is how a plan renews: nothing else has to run.
//   customer.subscription.updated / .deleted / .paused
//        → celestual_billing_plan_sync. A cancelled plan keeps what was paid for
//          and then simply stops counting; no sweep, no cron.
//   charge.refunded / charge.dispute.closed (lost)
//        → celestual_billing_revoke. The slot is given back. Pings already
//          standing are LEFT ALONE — retracting one would reveal by absence that
//          it existed.
// Anything else is acknowledged and ignored, on purpose: an unrecognised event
// must never make Stripe retry forever.
//
// SIGNATURE VERIFICATION is done by hand with Web Crypto (HMAC-SHA256 over
// "<timestamp>.<raw body>", compared in constant time, five-minute tolerance) —
// the same algorithm Stripe's SDK runs, without pulling the SDK into an edge
// runtime for one function. An unsigned or stale request gets 400 and never
// reaches the database.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY      — to read back a subscription's period end
//   STRIPE_WEBHOOK_SECRET  — whsec_… from the endpoint you create in Stripe
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy (the --no-verify-jwt matters — Stripe cannot send a Supabase JWT, and
// this endpoint's authentication IS the signature):
//   supabase functions deploy celestual-stripe-webhook --no-verify-jwt
// Runbook: docs/STRIPE-SETUP.md
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const STRIPE_VERSION = '2024-06-20';
const STRIPE_API = 'https://api.stripe.com/v1';
const TOLERANCE_S = 300; // how stale a signed timestamp may be

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const text = (body: string, status = 200) => new Response(body, { status });

// ── signature ────────────────────────────────────────────────────────────────
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Length-independent, early-exit-free comparison.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signedPayloadOk(raw: string, header: string): Promise<boolean> {
  if (!WEBHOOK_SECRET || !header) return false;
  let t = '';
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k?.trim() === 't') t = (v ?? '').trim();
    if (k?.trim() === 'v1') v1.push((v ?? '').trim());
  }
  if (!t || !v1.length) return false;
  const age = Math.floor(Date.now() / 1000) - Number(t);
  if (!Number.isFinite(age) || Math.abs(age) > TOLERANCE_S) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  return v1.some((candidate) => safeEqual(mac, candidate));
}

// ── stripe reads (only ever to fill in a period end) ─────────────────────────
async function stripeGet(path: string): Promise<Record<string, any> | null> {
  if (!STRIPE_KEY) return null;
  try {
    const res = await fetch(`${STRIPE_API}${path}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Stripe-Version': STRIPE_VERSION },
    });
    if (!res.ok) {
      console.error('stripe read failed', path, res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('stripe read threw', path, String(e));
    return null;
  }
}

const iso = (unix: unknown): string | null => {
  const n = Number(unix);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null;
};

// Older API versions carry the period end on the subscription, newer ones on its
// items. Read both rather than pin the product to one shape.
function periodEnd(sub: Record<string, any> | null | undefined): string | null {
  if (!sub) return null;
  return iso(sub.current_period_end) ?? iso(sub.items?.data?.[0]?.current_period_end);
}

// Hand an event back to Stripe. The guard stamps an event id before the handler
// runs (so a duplicate delivery is cheap), which would otherwise mean a
// transient failure burns the only delivery that mattered — so every error path
// unstamps first and then asks for the retry.
async function retry(eventId: string, why: string): Promise<Response> {
  console.error('handing back to stripe:', why);
  const { error } = await supabase.rpc('celestual_billing_unsee', { p_event_id: eventId });
  if (error) console.error('unsee failed — this delivery will read as duplicate', error.message);
  return text('retry', 500);
}

async function planSync(subscriptionId: string, periodEndIso: string | null, active: boolean) {
  const { data, error } = await supabase.rpc('celestual_billing_plan_sync', {
    p_subscription: subscriptionId,
    p_period_end: periodEndIso,
    p_active: active,
  });
  if (error) console.error('plan_sync failed', error.message);
  else if (!data?.ok) console.error('plan_sync refused', data?.error ?? '');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('method', 405);
  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — refusing every delivery');
    return text('config', 500);
  }

  // The RAW body is what the signature covers; it must be read before any parse.
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  if (!(await signedPayloadOk(raw, sig))) return text('bad signature', 400);

  let event: Record<string, any>;
  try {
    event = JSON.parse(raw);
  } catch {
    return text('bad json', 400);
  }

  const type = String(event.type || '');
  const eventId = String(event.id || '');

  // Replay guard. Stripe retries until it sees a 2xx and can deliver a duplicate
  // even after one; the event id is a primary key on our side.
  const { data: fresh, error: seenErr } = await supabase.rpc('celestual_billing_seen', {
    p_event_id: eventId,
    p_type: type,
  });
  if (seenErr) {
    // Never swallow this: a failed guard means we can't promise idempotency, so
    // let Stripe retry rather than risk granting twice.
    console.error('event guard failed', seenErr.message);
    return text('retry', 500);
  }
  if (fresh === false) return text('duplicate', 200);

  const obj = (event.data?.object ?? {}) as Record<string, any>;

  try {
    switch (type) {
      // ── the purchase lands ──
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const purchaseId = String(obj.metadata?.purchase_id || obj.client_reference_id || '');
        if (!purchaseId) {
          console.error('session with no purchase id', obj.id);
          break;
        }
        const paid = obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required';
        if (!paid) break; // an async method that hasn't cleared yet; its own event follows

        let periodEndIso: string | null = null;
        if (obj.subscription) {
          periodEndIso = periodEnd(await stripeGet(`/subscriptions/${String(obj.subscription)}`));
        }

        const { data, error } = await supabase.rpc('celestual_billing_complete', {
          p_purchase_id: purchaseId,
          p_session_id: obj.id ? String(obj.id) : null,
          p_payment_intent: obj.payment_intent ? String(obj.payment_intent) : null,
          p_amount_cents: Number.isFinite(Number(obj.amount_total)) ? Number(obj.amount_total) : null,
          p_currency: obj.currency ? String(obj.currency) : null,
          p_customer: obj.customer ? String(obj.customer) : null,
          p_subscription: obj.subscription ? String(obj.subscription) : null,
          p_period_end: periodEndIso,
        });
        if (error) {
          // Let Stripe redeliver; the grant itself is idempotent either way.
          return await retry(eventId, `billing_complete failed: ${error.message}`);
        }
        if (!data?.ok) console.error('billing_complete refused', data?.error ?? '');
        break;
      }

      // ── the plan renews (this is the whole renewal mechanism) ──
      case 'invoice.paid': {
        const subId = obj.subscription ? String(obj.subscription) : '';
        if (!subId) break;
        const lineEnd = iso(obj.lines?.data?.[0]?.period?.end);
        const end = lineEnd ?? periodEnd(await stripeGet(`/subscriptions/${subId}`));
        await planSync(subId, end, true);
        break;
      }

      // A failed payment is not an ending: Stripe retries on its own schedule and
      // the plan lapses by itself if the paid-through date passes. Logged only.
      case 'invoice.payment_failed':
        console.log('invoice payment failed', obj.id);
        break;

      // ── the plan changes or ends ──
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted': {
        const subId = String(obj.id || '');
        if (!subId) break;
        const status = String(obj.status || '');
        const active = type === 'customer.subscription.updated'
          && ['active', 'trialing', 'past_due'].includes(status);
        await planSync(subId, periodEnd(obj) ?? iso(obj.ended_at), active);
        break;
      }

      // ── the money goes back ──
      case 'charge.refunded': {
        const pi = obj.payment_intent ? String(obj.payment_intent) : '';
        if (!pi) break;
        const { data, error } = await supabase.rpc('celestual_billing_revoke', {
          p_payment_intent: pi,
          p_subscription: null,
        });
        if (error) console.error('revoke failed', error.message);
        else if (!data?.ok) console.error('revoke refused', data?.error ?? '');
        break;
      }

      case 'charge.dispute.closed': {
        if (String(obj.status || '') !== 'lost') break;
        const pi = obj.payment_intent ? String(obj.payment_intent) : '';
        if (!pi) break;
        const { error } = await supabase.rpc('celestual_billing_revoke', {
          p_payment_intent: pi,
          p_subscription: null,
        });
        if (error) console.error('revoke failed', error.message);
        break;
      }

      default:
        // Acknowledged and ignored. Subscribing to fewer event types in the
        // dashboard is the tidier fix; this makes the extra ones harmless.
        break;
    }
  } catch (e) {
    return await retry(eventId, `handler threw on ${type}: ${String(e)}`);
  }

  return text('ok', 200);
});

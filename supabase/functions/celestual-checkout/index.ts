// CELESTUAL — celestual-checkout edge function (the paywall).
//
// The product rule: the FIRST star is free for everyone, forever. Every star
// after that is a one-off payment. The /demo route never reaches this function
// (the client short-circuits the paywall in demo mode).
//
// This function creates a hosted-checkout session for one extra star and returns
// its URL; the client redirects the browser there. Secret keys NEVER reach the
// client — they live only in this function's Supabase secrets. Three providers
// are supported: Stripe (international cards), KakaoPay and TossPay (Korea).
//
// Entitlement is granted server-side by each provider's webhook/approval, which
// should record the paid credit against the buyer (see TODO in each branch). The
// client only ever trusts the server's read at seal time.
//
// Required secrets (Supabase → Edge Functions → Secrets), per provider you enable:
//   STRIPE_SECRET_KEY, STRIPE_PRICE_ID         — Stripe Checkout
//   KAKAO_PAY_CID, KAKAO_PAY_SECRET_KEY        — KakaoPay (ready endpoint)
//   TOSS_SECRET_KEY                            — Toss Payments
//   CELESTUAL_STAR_PRICE_KRW   (default 3900)      — price for Kakao/Toss
// Provided automatically: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-checkout
//
// NOTE: This is the integration scaffold. Each provider branch is wired to the
// real API shape but must be finished + tested with live keys and a matching
// webhook that grants the entitlement. Until keys exist the client runs a local
// dev-grant so the rest of the flow stays testable (see app/src/api/pay.js).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PRICE_KRW = Number(Deno.env.get('CELESTUAL_STAR_PRICE_KRW') ?? '3900')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// ── Stripe ────────────────────────────────────────────────────────────────
async function stripeCheckout(returnUrl: string) {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  const price = Deno.env.get('STRIPE_PRICE_ID')
  if (!key || !price) return json({ error: 'stripe_not_configured' }, 501)
  const form = new URLSearchParams()
  form.set('mode', 'payment')
  form.set('line_items[0][price]', price)
  form.set('line_items[0][quantity]', '1')
  form.set('success_url', `${returnUrl}?paid=1`)
  form.set('cancel_url', returnUrl)
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) return json({ error: 'stripe_error', detail: data }, 502)
  // TODO: a Stripe webhook (checkout.session.completed) should grant the credit.
  return json({ url: data.url })
}

// ── KakaoPay ──────────────────────────────────────────────────────────────
async function kakaoCheckout(returnUrl: string) {
  const cid = Deno.env.get('KAKAO_PAY_CID')
  const secret = Deno.env.get('KAKAO_PAY_SECRET_KEY')
  if (!cid || !secret) return json({ error: 'kakao_not_configured' }, 501)
  const res = await fetch('https://open-api.kakaopay.com/online/v1/payment/ready', {
    method: 'POST',
    headers: { Authorization: `SECRET_KEY ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cid,
      partner_order_id: crypto.randomUUID(),
      partner_user_id: 'celestual',
      item_name: 'CELESTUAL — one more star',
      quantity: 1,
      total_amount: PRICE_KRW,
      tax_free_amount: 0,
      approval_url: `${returnUrl}?paid=1`,
      cancel_url: returnUrl,
      fail_url: returnUrl,
    }),
  })
  const data = await res.json()
  if (!res.ok) return json({ error: 'kakao_error', detail: data }, 502)
  // TODO: persist tid and grant on the approval callback.
  return json({ url: data.next_redirect_pc_url ?? data.next_redirect_mobile_url })
}

// ── TossPay ───────────────────────────────────────────────────────────────
async function tossCheckout(returnUrl: string) {
  const secret = Deno.env.get('TOSS_SECRET_KEY')
  if (!secret) return json({ error: 'toss_not_configured' }, 501)
  // Toss confirms the payment client-side via its SDK using a successUrl; this
  // returns the parameters the client widget needs. A full integration uses
  // @tosspayments/payment-sdk on the client + a /confirm webhook here.
  return json({
    provider: 'toss',
    amount: PRICE_KRW,
    orderId: crypto.randomUUID(),
    successUrl: `${returnUrl}?paid=1`,
    failUrl: returnUrl,
    // url omitted on purpose: Toss opens its widget client-side, not a hosted URL.
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  let provider = 'stripe'
  let returnUrl = 'https://celestual.us'
  try {
    const body = await req.json()
    provider = body.provider ?? provider
    returnUrl = body.return_url ?? returnUrl
  } catch {
    /* keep defaults */
  }
  if (provider === 'kakao') return kakaoCheckout(returnUrl)
  if (provider === 'toss') return tossCheckout(returnUrl)
  return stripeCheckout(returnUrl)
})

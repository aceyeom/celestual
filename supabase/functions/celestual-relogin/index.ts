// CELESTUAL — celestual-relogin edge function.
//
// Durable, DM-free recovery of a verified session (docs/MANYCHAT-SETUP.md §8 "B",
// migration 0013). A DM-verified session lives 30 days in Postgres, but its key —
// the browser's `proof` secret — dies with localStorage (Instagram's in-app
// browser, iOS ITP, a new device). This function lets a returning person get a
// FRESH proof by email instead of re-DMing, so the DM is a one-time step.
//
// Two actions on one endpoint (mirrors celestual-edu-verify's shape):
//   { action:'request', handle }               → if a recovery email is bound to
//        the handle (celestual_bind_recovery wrote it under a live DM proof), mint
//        a one-time token, store ONLY its SHA-256 hash, and email a magic link
//        (${SITE}/signin#t=<token>) to that address. ALWAYS returns { ok:true }
//        regardless — the client is never told whether the handle is registered
//        (anti-enumeration); the UI offers a DM fallback so a handle with no bound
//        email is never stranded.
//        Response: { ok:true }
//   { action:'redeem', token, proof_hash }     → validate the token (live +
//        unused), burn it, and mint a fresh 30-day verified session bound to the
//        browser's new proof_hash. The raw proof stays in the browser.
//        Response: { ok:true, handle } | { ok:false, error }
//
// The token is a secret: emailed once, only its hash stored, single-use, 20-min
// TTL. Both DB writers (store/redeem) are service-role-only RPCs — the browser can
// never mint its own proof.
//
// Required secrets (Supabase → Edge Functions → Secrets) — the SAME ones the other
// mailers use, so this rides the existing Resend setup:
//   RESEND_API_KEY        — your Resend API key
//   CELESTUAL_FROM_EMAIL  — verified sender, e.g. "celestual <hello@celestual.us>"
// Optional: CELESTUAL_SITE_URL (default https://celestual.us — the magic-link host)
// Provided automatically: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-relogin
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const LINK_TTL_MIN = 20;

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

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// The sign-in email — the same galaxy the code email lives in (deep field, amber
// and rose nebulae resting in the corners so the center stays dark behind the
// words), one warm star for the logo. The magic link is the hero; the raw token
// rides its URL fragment, never a query, so it never lands in a server log.
function linkEmailHtml(handle: string, url: string) {
  const stars = (op: number, size: number) =>
    `color:rgba(243,236,246,${op});font-size:${size}px;letter-spacing:26px;line-height:1;font-family:Georgia,serif;`;
  return `
  <div style="background-color:#05040c;padding:26px 12px;margin:0">
    <div style="max-width:480px;margin:0 auto;padding:42px 22px 36px;text-align:center;border-radius:20px;
      border:1px solid rgba(243,236,246,0.08);
      background-color:#070b14;
      background-image:
        radial-gradient(circle at 10% 6%, rgba(255,158,107,0.17), transparent 34%),
        radial-gradient(circle at 92% 12%, rgba(230,116,158,0.13), transparent 36%),
        radial-gradient(circle at 88% 92%, rgba(126,107,168,0.18), transparent 40%),
        radial-gradient(circle at 6% 88%, rgba(167,194,255,0.11), transparent 38%);
      font-family:Georgia,serif;color:#f2eee5;">
      <div style="${stars(0.32, 12)}">&#10023; &#183; &#10022; &#183; &#10023;</div>
      <div style="font-size:34px;color:#ffa25c;margin:22px 0 0;text-shadow:0 0 22px rgba(255,158,107,0.85)">&#10022;</div>
      <h1 style="font-weight:400;font-style:italic;font-size:29px;line-height:1.25;margin:16px 0 0;color:#f2eee5">
        welcome back.
      </h1>
      <p style="color:#aeb6c6;font-size:14.5px;line-height:1.7;margin:14px auto 0;max-width:340px;font-family:Arial,sans-serif">
        tap below to sign back in as @${handle}. your pings come with you &mdash; no dm this time.
      </p>
      <div style="margin:26px 0 0">
        <a href="${url}"
          style="display:inline-block;background:#ffa25c;color:#1a0f0a;text-decoration:none;font-family:Arial,sans-serif;
          font-weight:700;font-size:14.5px;letter-spacing:0.3px;padding:14px 36px;border-radius:14px">
          sign back in
        </a>
      </div>
      <p style="color:#8b94a8;font-size:12px;font-family:Arial,sans-serif;margin:16px 0 0">this link lasts ${LINK_TTL_MIN} minutes and works once.</p>
      <div style="${stars(0.22, 11)};margin-top:30px">&#183; &#10023; &#183; &#183; &#10023;</div>
      <p style="color:#5b6377;font-size:11px;line-height:1.7;margin:26px auto 0;font-family:Arial,sans-serif;max-width:380px">
        you&rsquo;re reading this because someone asked to sign back in to celestual as @${handle}.
        if that wasn&rsquo;t you, ignore this and nothing happens. ${SITE}
      </p>
    </div>
  </div>`;
}

async function sendLinkEmail(to: string, handle: string, url: string) {
  if (!RESEND_API_KEY) throw new Error('no_email_provider');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: 'your celestual sign-in link',
      html: linkEmailHtml(handle, url),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad_input' }, 400);
  }
  const action = String(body.action || '');

  // ── REQUEST (send the magic link) ─────────────────────────────────────────
  if (action === 'request') {
    const handle = String(body.handle || '');
    // Anti-enumeration: whatever happens below, the client hears the same thing.
    // A handle with no bound email simply gets no email; the app shows a DM
    // fallback so no one is stranded.
    try {
      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const { data } = await supabase.rpc('celestual_relogin_store', {
        p_handle: handle,
        p_token_hash: tokenHash,
      });
      if (data?.ok && data.email) {
        const url = `${SITE}/signin#t=${token}`;
        await sendLinkEmail(String(data.email), String(data.handle || handle).replace(/^@+/, ''), url);
      }
    } catch (e) {
      // Never surface send/store failure to the client (it would leak existence);
      // log it for the operator instead.
      console.error('relogin request failed', String(e));
    }
    return json({ ok: true });
  }

  // ── REDEEM (open the link → fresh proof) ──────────────────────────────────
  if (action === 'redeem') {
    const token = String(body.token || '');
    const proofHash = String(body.proof_hash || '');
    if (!token || !/^[0-9a-fA-F]{64}$/.test(proofHash)) {
      return json({ ok: false, error: 'invalid' });
    }
    const tokenHash = await sha256Hex(token);
    const { data, error } = await supabase.rpc('celestual_relogin_redeem', {
      p_token_hash: tokenHash,
      p_proof_hash: proofHash,
    });
    if (error) {
      console.error('relogin redeem error', error.message);
      return json({ ok: false, error: 'invalid' });
    }
    return json(data ?? { ok: false, error: 'invalid' });
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

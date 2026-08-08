// CELESTUAL — celestual-relogin edge function.
//
// Durable, DM-free recovery of a verified session (docs/MANYCHAT-SETUP.md §8 "B",
// migration 0013). A DM-verified session lives 30 days in Postgres, but its key —
// the browser's `proof` secret — dies with localStorage (Instagram's in-app
// browser, iOS ITP, a new device). This function lets a returning person get a
// FRESH proof by email instead of re-DMing, so the DM is a one-time step.
//
// Three actions on one endpoint (mirrors celestual-edu-verify's shape):
//   { action:'start', handle }                 → THE ROUTER (migration 0015). The
//        server, not the person, decides how this @ gets in. Read-only; it sends
//        nothing. Answers one of:
//          { ok:true, route:'signup' }                     unknown @: collect an email
//          { ok:true, route:'dm' }                         known @, no address on file
//          { ok:true, route:'email', to:'j•••@gmail.com' } known @: mail the link
//        This replaces the screen that showed both doors and then hedged ("if @x
//        has an email on file…"). The masked address is a courtesy so the person
//        knows WHICH inbox to open; the plaintext never leaves Postgres here.
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
import * as mail from '../_shared/mail.ts';

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


// The sign-in email. The magic link is the hero, and the raw token rides its URL
// FRAGMENT rather than a query, so it never lands in a server log. The frame is
// _shared/mail.ts's, which is what makes this and the code email and the mutual
// email finally look like three notes from one desk.
function linkEmailHtml(handle: string, url: string) {
  return mail.frame({
    inner: `
      ${mail.title('welcome back.')}
      ${mail.body(`tap below to sign back in as @${handle}. your pings come with you, and there is no dm this time.`)}
      ${mail.plate(url, 'sign back in')}
      ${mail.tick(`this link lasts ${LINK_TTL_MIN} minutes and works once.`)}
      ${mail.colophon(
        `you&rsquo;re reading this because someone asked to sign back in to celestual as @${handle}. ` +
        `if that wasn&rsquo;t you, ignore this and nothing happens. ${SITE}`,
      )}`,
  });
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

  // ── START (the router: the server picks the way in) ───────────────────────
  // Side-effect free by design — it answers "which door?" so the screen can stop
  // showing two and hedging about which works. Sending the link is still
  // `request`, below, which the client calls once it has committed to the email
  // door. Falls back to the DM route on any failure: that path always works.
  if (action === 'start') {
    const handle = String(body.handle || '');
    try {
      const { data, error } = await supabase.rpc('celestual_handle_route', { p_handle: handle });
      if (error) throw error;
      if (!data?.ok) return json({ ok: true, route: 'dm' });
      if (!data.known) return json({ ok: true, route: 'signup' });
      if (!data.has_email) return json({ ok: true, route: 'dm' });
      return json({ ok: true, route: 'email', to: String(data.mask || '') });
    } catch (e) {
      console.error('relogin start failed', String(e));
      return json({ ok: true, route: 'dm' });
    }
  }

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

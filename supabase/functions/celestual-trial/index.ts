// CELESTUAL — celestual-trial edge function.
//
// The First Light trial's front door (celestual.us/trial). This replaces the
// ManyChat comment→DM→invite loop of 0016: candidates sign up on the site
// itself. The flow this serves:
//
//   1. They read the brief on /trial and enter their details.
//   2. { action:'start', email } — a 6-digit code goes to that address (Resend),
//      stored only as a SHA-256 hash. Returns a correlation `token`.
//   3. { action:'claim', token, code, name, handle, choice, dash_hash } — the
//      code checks out → the in-app signature lands (celestual_trial_claim):
//      agreement version, typed name, @, verified email, and their CHOSEN
//      four-letter code. Their link is celestual.us/<choice> from then on.
//   4. { action:'login', token, code, dash_hash } — the way back in from any
//      device: verify the email again, get the same code back, re-bind the
//      dashboard key. Stats then come from celestual_recruit_stats (0016),
//      gated on that key, exactly like before.
//   5. { action:'check', choice } — live availability for the code picker.
//
// The email code is a secret: emailed, never returned, only its hash stored.
// Errors are stable slugs the client localizes: 'email' | 'rate' | 'send' |
// 'code' | 'expired' | 'name' | 'invalid' | 'code_format' | 'code_reserved' |
// 'code_taken' | 'handle_taken' | 'banned' | 'unknown'.
//
// Required secrets (shared with celestual-edu-verify):
//   RESEND_API_KEY, CELESTUAL_FROM_EMAIL
// Provided automatically: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-trial
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as mail from '../_shared/mail.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CODE_TTL_MIN = 15; // the emailed code's life; also the claim window
const MAX_ATTEMPTS = 6;
const SEND_PER_EMAIL_HOUR = 5;
const SEND_PER_IP_HOUR = 15;

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

function sixDigit(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

function clientIp(req: Request): string | null {
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null
  );
}

// The code email, on the same frame as every other mail this product sends
// (_shared/mail.ts). The code is the hero, struck into a well; the copy button
// opens the app's one-tap /copy page, and the code rides the URL fragment rather
// than a query string so it never reaches a server log.
function codeEmailHtml(code: string) {
  return mail.frame({
    kicker: 'first light',
    inner: `
      ${mail.title('your code.')}
      ${mail.body('enter it back on the trial page to confirm this address is yours.')}
      ${mail.code(code)}
      ${mail.plate(`${SITE}/copy#c=${code}`, 'copy the code')}
      ${mail.tick(`it lasts ${CODE_TTL_MIN} minutes.`)}
      ${mail.colophon(
        `you&rsquo;re reading this because someone entered this address on celestual&rsquo;s first light ` +
        `trial page. if that wasn&rsquo;t you, ignore this and nothing happens. ${SITE}`,
      )}`,
  });
}

async function sendCodeEmail(to: string, code: string) {
  if (!RESEND_API_KEY) throw new Error('no_email_provider');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `${code} is your celestual code`,
      html: codeEmailHtml(code),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

// Load the email-code row for `token` and check `code` against its hash.
// Returns { ok:true, email } or { ok:false, error:'code'|'expired' }.
// A row already verified stays usable until its expiry so a claim rejected for
// a taken code can be retried without a second email.
async function verifyEmailCode(token: string, code: string) {
  const digits = String(code || '').replace(/\D/g, '');
  if (!token || digits.length !== 6) return { ok: false as const, error: 'code' };
  const { data: row, error } = await supabase
    .from('celestual_trial_emails')
    .select('id, email, code_hash, attempts, status, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !row) return { ok: false as const, error: 'code' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false as const, error: 'expired' };
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false as const, error: 'expired' };
  const hash = await sha256Hex(digits);
  if (hash !== row.code_hash) {
    await supabase
      .from('celestual_trial_emails')
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq('id', row.id);
    return { ok: false as const, error: 'code' };
  }
  if (row.status !== 'verified') {
    await supabase
      .from('celestual_trial_emails')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', row.id);
  }
  return { ok: true as const, email: row.email as string };
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

  // ── START — email the 6-digit code ──────────────────────────────────────
  if (action === 'start') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'email' });

    const ip = clientIp(req);
    const sinceIso = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from('celestual_trial_emails')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', sinceIso);
    if ((count ?? 0) >= SEND_PER_EMAIL_HOUR) return json({ ok: false, error: 'rate' });
    if (ip) {
      const { count: ipCount } = await supabase
        .from('celestual_trial_emails')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', sinceIso);
      if ((ipCount ?? 0) >= SEND_PER_IP_HOUR) return json({ ok: false, error: 'rate' });
    }
    if (Math.random() < 0.2) {
      await supabase
        .from('celestual_trial_emails')
        .delete()
        .lt('expires_at', new Date(Date.now() - 3600_000).toISOString());
    }

    const code = sixDigit();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();
    const { error: insErr } = await supabase.from('celestual_trial_emails').insert({
      token,
      email,
      code_hash: await sha256Hex(code),
      expires_at: expiresAt,
      status: 'pending',
      ip,
    });
    if (insErr) {
      console.error('trial insert failed', insErr.message);
      return json({ ok: false, error: 'send' });
    }
    try {
      await sendCodeEmail(email, code);
    } catch (e) {
      console.error('trial email failed', String(e));
      return json({ ok: false, error: 'send' });
    }
    return json({ ok: true, token, expires_at: expiresAt });
  }

  // ── CLAIM — the signature: code checks out → the competitor row lands ───
  if (action === 'claim') {
    const v = await verifyEmailCode(String(body.token || ''), String(body.code || ''));
    if (!v.ok) return json({ ok: false, error: v.error });
    const { data, error } = await supabase.rpc('celestual_trial_claim', {
      p_email: v.email,
      p_name: String(body.name || ''),
      p_handle: String(body.handle || ''),
      p_code: String(body.choice || ''),
      p_dash_hash: String(body.dash_hash || ''),
    });
    if (error) {
      console.error('trial claim failed', error.message);
      return json({ ok: false, error: 'invalid' });
    }
    return json(data);
  }

  // ── LOGIN — the way back into an account page, from any device ──────────
  if (action === 'login') {
    const v = await verifyEmailCode(String(body.token || ''), String(body.code || ''));
    if (!v.ok) return json({ ok: false, error: v.error });
    const { data, error } = await supabase.rpc('celestual_trial_login', {
      p_email: v.email,
      p_dash_hash: String(body.dash_hash || ''),
    });
    if (error) {
      console.error('trial login failed', error.message);
      return json({ ok: false, error: 'unknown' });
    }
    return json(data);
  }

  // ── CHECK — live availability for the four-letter code picker ───────────
  if (action === 'check') {
    const { data, error } = await supabase.rpc('celestual_trial_check', {
      p_code: String(body.choice || ''),
    });
    if (error) return json({ ok: false, error: 'invalid' });
    return json(data);
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

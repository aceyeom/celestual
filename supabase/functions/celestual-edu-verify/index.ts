// CELESTUAL — celestual-edu-verify edge function.
//
// School (.edu) email verification for community membership. Your ping only ever
// reaches people from your own community, so joining one requires proving you're
// there: a 6-digit code sent to an address at the school's domain.
//
// Two actions on one endpoint:
//   { action:'send',   email, slug }        → validate the address is at the
//        school's domain, rate-limit, mint a 6-digit code, store ONLY its SHA-256
//        hash, email the code via Resend, and return a random correlation `token`.
//        Response: { ok:true, token, expires_at } | { ok:false, error }
//   { action:'verify', token, code }        → compare the code to the stored hash
//        (never returning it); on a match mark the row verified and report back.
//        Response: { ok:true, email, slug } | { ok:false, error }
//
// The code is a secret: it is emailed, never returned to the browser, and only its
// hash is ever stored. Errors are stable slugs the client localizes:
//   'domain' | 'email' | 'rate' | 'send' | 'code' | 'expired'
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        — your Resend API key
//   CELESTUAL_FROM_EMAIL  — verified sender, e.g. "celestual <hello@celestual.us>"
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-edu-verify
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <onboarding@resend.dev>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// The curated schools' email domains — kept in step with app/src/communities.js.
// A subdomain of the domain counts as the school too (andrew.cmu.edu ⊂ cmu.edu).
const SCHOOLS: Record<string, { name: string; domain: string }> = {
  'uc-berkeley': { name: 'UC Berkeley', domain: 'berkeley.edu' },
  wesleyan: { name: 'Wesleyan', domain: 'wesleyan.edu' },
  cmu: { name: 'Carnegie Mellon', domain: 'cmu.edu' },
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 6; // guesses per code before it's dead
const SEND_PER_EMAIL_HOUR = 5; // fresh codes per address per hour

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

function emailDomain(email: string): string | null {
  const m = String(email || '').trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/);
  return m ? m[1] : null;
}

function matchesSchool(email: string, slug: string): boolean {
  const s = SCHOOLS[slug];
  const host = emailDomain(email);
  if (!s || !host) return false;
  return host === s.domain || host.endsWith('.' + s.domain);
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sixDigit(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

// The code email — the product's registers: deep navy field, serif feeling line,
// small sans mechanics, one warm star. The code itself is the hero, spaced wide.
function codeEmailHtml(code: string, schoolName: string) {
  const spaced = code.split('').join(' ');
  return `
  <div style="background:#070b14;padding:48px 24px;font-family:Georgia,serif;color:#f2eee5;text-align:center">
    <div style="font-size:13px;letter-spacing:6px;color:#8b94a8;font-family:Arial,sans-serif">CELESTUAL</div>
    <div style="font-size:26px;color:#ffa25c;margin:26px 0 4px">&#10022;</div>
    <h1 style="font-weight:400;font-style:italic;font-size:30px;line-height:1.2;margin:8px 0 0;color:#f2eee5">
      you&rsquo;re at ${schoolName}.
    </h1>
    <p style="color:#aeb6c6;font-size:15px;line-height:1.7;margin:18px auto 0;max-width:360px;font-family:Arial,sans-serif">
      enter this code back in celestual to join your community&rsquo;s sky.
    </p>
    <div style="font-family:'Courier New',monospace;font-size:40px;letter-spacing:12px;color:#ffa25c;margin:28px 0 6px;font-weight:700">
      ${spaced}
    </div>
    <p style="color:#8b94a8;font-size:12px;font-family:Arial,sans-serif;margin:0">it lasts ${CODE_TTL_MIN} minutes.</p>
    <p style="color:#5b6377;font-size:11px;line-height:1.7;margin-top:34px;font-family:Arial,sans-serif;max-width:400px;margin-left:auto;margin-right:auto">
      you&rsquo;re reading this because someone entered this address to join a community on celestual.
      if that wasn&rsquo;t you, ignore this and nothing happens. ${SITE}
    </p>
  </div>`;
}

async function sendCodeEmail(to: string, code: string, schoolName: string) {
  if (!RESEND_API_KEY) throw new Error('no_email_provider');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: 'celestual: your school code',
      html: codeEmailHtml(code, schoolName),
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

  // ── SEND ────────────────────────────────────────────────────────────────
  if (action === 'send') {
    const email = String(body.email || '').trim().toLowerCase();
    const slug = String(body.slug || '');
    const school = SCHOOLS[slug];
    if (!school) return json({ ok: false, error: 'domain' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'email' });
    if (!matchesSchool(email, slug)) return json({ ok: false, error: 'domain' });

    // Rate-limit fresh codes per address, and sweep expired rows opportunistically.
    const sinceIso = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from('celestual_edu_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', sinceIso);
    if ((count ?? 0) >= SEND_PER_EMAIL_HOUR) return json({ ok: false, error: 'rate' });
    if (Math.random() < 0.2) {
      await supabase.from('celestual_edu_verifications').delete().lt('expires_at', new Date(Date.now() - 60_000).toISOString());
    }

    const code = sixDigit();
    const codeHash = await sha256Hex(code);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();

    const { error: insErr } = await supabase.from('celestual_edu_verifications').insert({
      token,
      email,
      slug,
      code_hash: codeHash,
      expires_at: expiresAt,
      status: 'pending',
    });
    if (insErr) {
      console.error('edu insert failed', insErr.message);
      return json({ ok: false, error: 'send' });
    }

    try {
      await sendCodeEmail(email, code, school.name);
    } catch (e) {
      console.error('edu email failed', String(e));
      // Leave the row so a retry can reuse verify; report a send failure.
      return json({ ok: false, error: 'send' });
    }
    return json({ ok: true, token, expires_at: expiresAt });
  }

  // ── VERIFY ──────────────────────────────────────────────────────────────
  if (action === 'verify') {
    const token = String(body.token || '');
    const code = String(body.code || '').replace(/\D/g, '');
    if (!token || code.length !== 6) return json({ ok: false, error: 'code' });

    const { data: row, error } = await supabase
      .from('celestual_edu_verifications')
      .select('id, email, slug, code_hash, attempts, status, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (error || !row) return json({ ok: false, error: 'code' });
    if (row.status === 'verified') return json({ ok: true, email: row.email, slug: row.slug });
    if (new Date(row.expires_at).getTime() < Date.now()) return json({ ok: false, error: 'expired' });
    if ((row.attempts ?? 0) >= MAX_ATTEMPTS) return json({ ok: false, error: 'expired' });

    const codeHash = await sha256Hex(code);
    if (codeHash !== row.code_hash) {
      await supabase
        .from('celestual_edu_verifications')
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq('id', row.id);
      return json({ ok: false, error: 'code' });
    }

    await supabase
      .from('celestual_edu_verifications')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', row.id);
    return json({ ok: true, email: row.email, slug: row.slug });
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

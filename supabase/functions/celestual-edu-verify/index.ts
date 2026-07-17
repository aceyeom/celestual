// CELESTUAL — celestual-edu-verify edge function.
//
// School (.edu) email verification for community membership. Your ping only ever
// reaches people from your own community, so joining one requires proving you're
// there: a 4-digit code sent to an address at the school's domain. The code rides
// the email's SUBJECT line too, so the phone's notification alone is enough to
// read it and type it straight in.
//
// Two actions on one endpoint:
//   { action:'send',   email, slug, demo? }  → validate the address is at the
//        school's domain, rate-limit (per address AND per IP), mint a 4-digit
//        code, store ONLY its SHA-256 hash, email the code via Resend, and
//        return a random correlation `token`.
//        `demo: true` is the app's sandbox flag. The sandbox's @gmail.com
//        carve-out is ON BY DEFAULT for demo requests — the product owner has
//        no .edu inbox to test with — but it still requires `demo:true` on the
//        request; a non-demo request NEVER accepts gmail, no matter the env
//        var. An operator can explicitly turn the carve-out off server-side
//        with CELESTUAL_SANDBOX_GMAIL=0, which makes even demo requests need a
//        genuine school match.
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
// Operator opt-OUT for the sandbox's @gmail.com carve-out. ON by default, so
// demo requests work out of the box without an .edu inbox to test with; set
// CELESTUAL_SANDBOX_GMAIL=0 to disable it. HONEST CAVEAT: `demo` is client
// input, so while this default stands a crafted `demo:true` request could use
// a gmail address against the real gate too — acceptable for the pre-launch
// sandbox this serves, but set CELESTUAL_SANDBOX_GMAIL=0 before a real launch.
const SANDBOX_GMAIL = Deno.env.get('CELESTUAL_SANDBOX_GMAIL') !== '0';

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
const SEND_PER_IP_HOUR = 15; // fresh codes per IP per hour (anti-spray)

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

function matchesSchool(email: string, slug: string, demo: boolean): boolean {
  const s = SCHOOLS[slug];
  const host = emailDomain(email);
  if (!s || !host) return false;
  // The carve-out needs both the request's sandbox flag and the operator not
  // having disabled it server-side (see SANDBOX_GMAIL's caveat above).
  if (demo && SANDBOX_GMAIL && host === 'gmail.com') return true;
  return host === s.domain || host.endsWith('.' + s.domain);
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fourDigit(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10_000;
  return String(n).padStart(4, '0');
}

// The code email — a window into the product's own galaxy. Email can't run a
// canvas, so the sky is painted with layered CSS radial-gradients (amber and
// rose nebulae resting in the CORNERS — the center column stays deep and dark
// so nothing ever sits behind the headline or the code) plus rows of the
// product's ritual star marks drifting above and below the content. No
// wordmark: the one warm star IS the logo. The code is the hero, and a clear
// copy button opens the app's one-tap /copy page (an email can't reach the
// clipboard itself; the code travels in the URL fragment, never a query).
function codeEmailHtml(code: string, schoolName: string) {
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
        you&rsquo;re at ${schoolName}.
      </h1>
      <p style="color:#aeb6c6;font-size:14.5px;line-height:1.7;margin:14px auto 0;max-width:340px;font-family:Arial,sans-serif">
        enter this code back in celestual to join your community&rsquo;s sky.
      </p>
      <div style="margin:26px auto 0;max-width:250px;padding:18px 10px 15px;border-radius:16px;
        background:rgba(5,4,12,0.55);border:1px solid rgba(255,162,92,0.35);">
        <div style="font-family:'Courier New',monospace;font-size:44px;letter-spacing:12px;padding-left:12px;color:#ffa25c;font-weight:700;line-height:1;white-space:nowrap">
          ${code}
        </div>
      </div>
      <div style="margin:18px 0 0">
        <a href="${SITE}/copy#c=${code}"
          style="display:inline-block;background:#ffa25c;color:#1a0f0a;text-decoration:none;font-family:Arial,sans-serif;
          font-weight:700;font-size:14.5px;letter-spacing:0.3px;padding:13px 34px;border-radius:14px">
          copy the code
        </a>
      </div>
      <p style="color:#8b94a8;font-size:12px;font-family:Arial,sans-serif;margin:14px 0 0">it lasts ${CODE_TTL_MIN} minutes.</p>
      <div style="${stars(0.22, 11)};margin-top:30px">&#183; &#10023; &#183; &#183; &#10023;</div>
      <p style="color:#5b6377;font-size:11px;line-height:1.7;margin:26px auto 0;font-family:Arial,sans-serif;max-width:380px">
        you&rsquo;re reading this because someone entered this address to join a community on celestual.
        if that wasn&rsquo;t you, ignore this and nothing happens. ${SITE}
      </p>
    </div>
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
      // the code IS the title — the notification alone is enough to read it
      // and type it straight in
      subject: `${code} is your celestual code`,
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
    const demo = body.demo === true;
    const school = SCHOOLS[slug];
    if (!school) return json({ ok: false, error: 'domain' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'email' });
    if (!matchesSchool(email, slug, demo)) return json({ ok: false, error: 'domain' });

    // Rate-limit fresh codes per address AND per IP, and sweep expired rows
    // opportunistically. The IP guard stops one machine spraying codes across
    // many addresses (each send costs a real email). Prefer the proxy-set
    // headers a client can't forge (cf-connecting-ip is written by Cloudflare
    // itself); the first x-forwarded-for hop — which a client CAN prepend — is
    // the last resort only.
    const ip =
      req.headers.get('cf-connecting-ip')?.trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      null;
    const sinceIso = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from('celestual_edu_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', sinceIso);
    if ((count ?? 0) >= SEND_PER_EMAIL_HOUR) return json({ ok: false, error: 'rate' });
    if (ip) {
      const { count: ipCount } = await supabase
        .from('celestual_edu_verifications')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', sinceIso);
      if ((ipCount ?? 0) >= SEND_PER_IP_HOUR) return json({ ok: false, error: 'rate' });
    }
    if (Math.random() < 0.2) {
      await supabase.from('celestual_edu_verifications').delete().lt('expires_at', new Date(Date.now() - 60_000).toISOString());
    }

    const code = fourDigit();
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
      ip,
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
    if (!token || code.length !== 4) return json({ ok: false, error: 'code' });

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

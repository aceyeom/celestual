// CELESTUAL — celestual-edu-verify edge function.
//
// School (.edu) email verification, the confirmation of an alert address, and
// since 0065 the login by email. A school address proves a person is at that
// school: it opens reading, and at a school that takes @-notes (Berkeley) it
// writes them. It becomes the alert address when there is none.
//
// Five actions on one endpoint. The first two are the six digit code, kept for
// a tab on the old build; the last three are the magic link the one wall asks
// for (docs/ONE-WALL.md, docs/EDU-VERIFICATION.md, migrations 0064, 0065, 0070):
//   { action:'link', email, session, purpose:'edu'|'alerts'|'login', campus?, draft?, carry? }
//        → { ok:true, request, domain, campus, school }
//        | { ok:false, error:'email'|'domain'|'rate'|'send'|'taken'|'session' }
//   { action:'confirm', token, session, match? (the old page's, never read) }
//        → { ok:true, purpose, request, campus, school, same_device, carry }
//        | { ok:false, error:'invalid'|'expired'|'used'|'taken', purpose? }
//   { action:'status', request, session }
//        → { ok:true, verified, elsewhere, purpose, campus, school, expired }
//        | { ok:false, error:'invalid' }
//
// Since 0070 the link is enough: opened in any browser it confirms at once
// for that browser, and signs in the one that asked only when that is the
// same one. No number is asked for or shown.
//
// The code actions:
//   { action:'send',   email, slug, demo? }  → validate the address is at the
//        school's domain, rate-limit (per address AND per IP), mint a 4-digit
//        code, store ONLY its SHA-256 hash, email the code via Resend, and
//        return a random correlation `token`.
//        `demo: true` was the retired sandbox's flag. Its @gmail.com carve-out
//        is OFF unless CELESTUAL_SANDBOX_GMAIL=1 is set on the function, and
//        even then it needs `demo:true` on the request; a non-demo request
//        NEVER accepts gmail. Nothing in the product sends `demo` any more.
//        Response: { ok:true, token, expires_at } | { ok:false, error }
//   { action:'verify', token, code, session? } → compare the code to the stored
//        hash (never returning it); on a match mark the row verified, bind the
//        address to the caller's identity row through celestual_user_bind_edu
//        (migration 0030) if a session token came with it, and report back.
//        Response: { ok:true, email, slug, signed_in, user, identity_error? }
//                | { ok:false, error }
//
//        `session` is a browser-minted opaque token, at least 16 characters.
//        Only its sha256 reaches the database, the same trust model the DM
//        flow's `proof` already uses. Without one the address still verifies
//        and `signed_in` comes back false.
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
import { codeMail, type Mail, verifyMail } from '../_shared/mails.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CELESTUAL_FROM_EMAIL') ?? 'celestual <hello@celestual.us>';
const SITE = Deno.env.get('CELESTUAL_SITE_URL') ?? 'https://celestual.us';
// The sandbox's @gmail.com carve-out, OFF unless CELESTUAL_SANDBOX_GMAIL=1.
// It defaulted to on, and `demo` is client input: one crafted POST with
// `demo:true` and a gmail address verified as Berkeley against the real gate,
// which is the whole gate. /demo is retired (Q16) and nothing in the product
// sends `demo` any more, so the default is the safe one and a test rig that
// needs the carve-out turns it on deliberately.
const SANDBOX_GMAIL = Deno.env.get('CELESTUAL_SANDBOX_GMAIL') === '1';

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

// Six digits since the audit of 4 September. This code is a secret in a way
// the DM code is not: a guess binds the guesser's browser to the victim's
// identity row (celestual_user_bind_edu), which opens their letters, their
// claims and their reveal requests. Four digits under six tries was a real
// hole. The client and this function have disagreed about the length before
// and locked everybody out of the wall, so verify() below takes four or six
// while the two halves deploy in either order.
function sixDigit(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

// The mails. Their words and their room are _shared/mails.ts and
// _shared/mail.ts, so this function owns neither: the code mail for a tab on
// the old build, and the magic link for the one wall and for signing in.
async function sendMail(to: string, m: Mail) {
  if (!RESEND_API_KEY) throw new Error('no_email_provider');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    // A mail API that hangs must not hang the person at the gate.
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject: m.subject, html: m.html, text: m.text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

// ── the link (migration 0064) ────────────────────────────────────────────────
// 32 random bytes, base64url: the token is only ever in the email. Its sha256
// is what the database keeps.
function linkToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// The number 0065 put on the asking screen, 10 to 99. Nothing asks for it
// since 0070. It is minted only for a database from before that, whose open
// still wants one, and answered only then, for the page from before that,
// which asks for it on another device.
function matchNumber(): number {
  return 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90);
}

// What a campus link carries to the browser that opens it (0070): the draft
// waiting on the link, or the letter a reply waits under. Only the fields
// the posting path reads (app/src/wall/data.js `draftPost`), each held to
// its own shape, and nothing else: it is somebody's words handed to whoever
// reads the inbox, and the database holds it to 4 kB besides.
function carryOf(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
  if (c.letter && typeof c.letter === 'object' && !Array.isArray(c.letter)) {
    const d = c.letter as Record<string, unknown>;
    const body = str(d.body, 280);
    const nonce = str(d.nonce, 64);
    if (!body.trim() || !/^[A-Za-z0-9_-]{8,64}$/.test(nonce)) return null;
    const look = d.look && typeof d.look === 'object' && !Array.isArray(d.look)
      ? Object.fromEntries(
        Object.entries(d.look as Record<string, unknown>)
          .filter(([k, v]) => /^[a-z]{1,16}$/.test(k) && typeof v === 'string' && v.length <= 40)
          .slice(0, 6),
      )
      : null;
    return {
      letter: {
        kind: d.kind === 'name' ? 'name' : 'handle',
        to: str(d.to, 40),
        name: str(d.name, 40),
        at: str(d.at, 40),
        body,
        look,
        greet: typeof d.greet === 'string' ? d.greet.slice(0, 40) : null,
        school: typeof d.school === 'string' ? d.school.slice(0, 40) : null,
        proof: d.proof === 'none' ? 'none' : 'edu',
        nonce,
      },
    };
  }
  if (c.reply && typeof c.reply === 'object' && !Array.isArray(c.reply)) {
    const letter = str((c.reply as Record<string, unknown>).letter, 64);
    return /^[A-Za-z0-9-]{8,64}$/.test(letter) ? { reply: { letter } } : null;
  }
  return null;
}

// PostgREST's word for a function the database does not have (yet).
function missingFn(e: { code?: string; message?: string } | null): boolean {
  return !!e && (e.code === 'PGRST202' || /could not find the function/i.test(String(e.message || '')));
}

function clientIp(req: Request): string | null {
  return req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null;
}

// A host at a domain, or under it.
function under(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
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
    if (!matchesSchool(email, slug, demo)) {
      // The pass list (migration 0043). An address the desk put on it gets the
      // code at that inbox whatever its domain, and celestual_user_bind_edu
      // takes it on the same list once the code checks out. Nothing else about
      // the flow changes: the code is still mailed, hashed and checked.
      const { data: passed, error: passErr } = await supabase.rpc('celestual_pass_email', { p_email: email });
      if (passErr) console.error('pass list read failed', passErr.message);
      if (passed !== true) return json({ ok: false, error: 'domain' });
    }

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
      ip,
    });
    if (insErr) {
      console.error('edu insert failed', insErr.message);
      return json({ ok: false, error: 'send' });
    }

    try {
      await sendMail(email, codeMail({ code, school: school.name, minutes: CODE_TTL_MIN }));
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
    if (!token || (code.length !== 4 && code.length !== 6)) return json({ ok: false, error: 'code' });

    const { data: row, error } = await supabase
      .from('celestual_edu_verifications')
      .select('id, email, slug, code_hash, attempts, status, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (error || !row) return json({ ok: false, error: 'code' });
    if (row.status === 'verified') return json({ ok: true, email: row.email, slug: row.slug });
    if (new Date(row.expires_at).getTime() < Date.now()) return json({ ok: false, error: 'expired' });
    if ((row.attempts ?? 0) >= MAX_ATTEMPTS) return json({ ok: false, error: 'expired' });

    // ── the try is spent BEFORE the code is looked at ───────────────────────
    // A compare and swap on the counter: the update only lands if nobody else
    // has moved it since this request read it, and only while the row is still
    // pending. Of a thousand concurrent guesses that all read attempts = 0,
    // exactly one gets to compare; the rest are refused. It used to read, then
    // compare, then write, which let every guess in a burst compare against the
    // same counter and turned six tries into as many as fit in one second.
    const { data: taken } = await supabase
      .from('celestual_edu_verifications')
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq('id', row.id)
      .eq('attempts', row.attempts ?? 0)
      .eq('status', 'pending')
      .select('id');
    if (!taken || taken.length === 0) return json({ ok: false, error: 'code' });

    const codeHash = await sha256Hex(code);
    if (codeHash !== row.code_hash) return json({ ok: false, error: 'code' });

    // And the flip is guarded the same way: a code is verified once.
    const { data: flipped } = await supabase
      .from('celestual_edu_verifications')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id');
    if (!flipped || flipped.length === 0) return json({ ok: false, error: 'code' });

    // ── the identity half ───────────────────────────────────────────────────
    // The code checked out, so this browser is at this school. That is the only
    // moment in the product where a .edu address may be believed, and
    // celestual_user_bind_edu is service-role only for exactly that reason: it
    // takes the address on trust, and this is the one caller entitled to hand
    // it one. Migration 0030.
    //
    // `session` is a browser-minted token; only its sha256 is stored. A request
    // without one still verifies, because the verification is a fact about the
    // address either way, and answers `signed_in: false` so the caller knows no
    // identity was bound rather than assuming one was.
    const session = String(body.session || '');
    let user: unknown = null;
    let identityError: string | null = null;

    if (session.length >= 16 && session.length <= 256) {
      const { data: bound, error: bindErr } = await supabase.rpc('celestual_user_bind_edu', {
        p_token: session,
        p_email: row.email,
      });
      if (bindErr) {
        // The address is verified whatever happens here, so a failure to bind is
        // logged and reported, never allowed to un-verify what already checked out.
        console.error('edu bind failed', bindErr.message);
        identityError = 'identity';
      } else if (bound && bound.ok === false) {
        // The one case the schema refuses: this row already carries a different
        // verified campus. Spec section 3 says stop and ask, and 0030 has already
        // written the pair to celestual_merge_conflicts for the admin screen.
        identityError = String(bound.error ?? 'identity');
      } else if (bound) {
        user = bound.user ?? null;
      }
    }

    return json({
      ok: true,
      email: row.email,
      slug: row.slug,
      signed_in: user !== null,
      user,
      ...(identityError ? { identity_error: identityError } : {}),
    });
  }

  // ── LINK ────────────────────────────────────────────────────────────────
  // docs/ONE-WALL.md. An address, and the session of the device that asks.
  //   edu     any address at a .edu (or under one), or on the pass list; with
  //           `campus`, an address at that campus's domain (or under it), or
  //           on the pass list
  //   alerts  any address
  //   login   any address (0065): the door's "continue with email". It signs
  //           the browser that opens it in as the person who holds the
  //           address (0070), and a .edu address opens its campus as well,
  //           so the answer names the campus the way an `edu` link's does
  // The token goes in the email and nowhere else; the database keeps its hash
  // and the asking session's hash (celestual_edu_link_open, which also holds
  // the limits: five an address and fifteen a network address an hour, codes
  // and links together). `draft: false` words the mail for a proof with no
  // letter waiting on it. `carry` (0070, a campus link's) is the draft, or the
  // letter a reply waits under, handed to the browser that opens the link
  // when that is not the one that asked.
  if (action === 'link') {
    const email = String(body.email || '').trim().toLowerCase();
    const session = String(body.session || '');
    const purpose = body.purpose === 'alerts' ? 'alerts' : body.purpose === 'login' ? 'login' : 'edu';
    const campusRaw = body.campus == null ? '' : String(body.campus).toLowerCase();
    const draft = body.draft !== false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json({ ok: false, error: 'email' });
    if (session.length < 16 || session.length > 256) return json({ ok: false, error: 'session' });
    const host = emailDomain(email) ?? '';

    let campus: string | null = null;
    let school: string | null = null;
    let domain: string | null = host;
    if (purpose === 'edu') {
      const { data: passed, error: passErr } = await supabase.rpc('celestual_pass_email', { p_email: email });
      if (passErr) console.error('pass list read failed', passErr.message);
      const isPass = passed === true;
      if (campusRaw) {
        if (!/^[a-z0-9-]{2,40}$/.test(campusRaw)) return json({ ok: false, error: 'domain' });
        const { data: c } = await supabase
          .from('wall_campuses')
          .select('slug, name, edu_domain, is_open')
          .eq('slug', campusRaw)
          .maybeSingle();
        if (!c || !c.edu_domain || !c.is_open) return json({ ok: false, error: 'domain' });
        if (!under(host, c.edu_domain) && !isPass) return json({ ok: false, error: 'domain' });
        campus = c.slug;
        school = c.name;
        domain = isPass && !under(host, c.edu_domain) ? null : c.edu_domain;
      } else {
        if (!/\.edu$/.test(host) && !isPass) return json({ ok: false, error: 'domain' });
        const { data: peek } = await supabase.rpc('celestual_campus_peek', { p_domain: host });
        if (peek) {
          campus = String(peek.slug);
          school = String(peek.name);
          domain = String(peek.domain);
        } else {
          domain = null; // a passed address that is not a school's
        }
      }
    } else if (purpose === 'login' && /\.edu$/.test(host)) {
      // Named before it is proved, as the `edu` link names it: the campus
      // this address will open once the link is tapped.
      const { data: peek } = await supabase.rpc('celestual_campus_peek', { p_domain: host });
      if (peek) {
        campus = String(peek.slug);
        school = String(peek.name);
        domain = String(peek.domain);
      } else {
        domain = null;
      }
    } else {
      domain = null;
    }

    const token = linkToken();
    const args = {
      p_email: email,
      p_session: session,
      p_purpose: purpose,
      p_campus: purpose === 'login' ? null : (campusRaw || null),
      p_ip: clientIp(req),
      p_link_hash: await sha256Hex(token),
    };
    // The open that carries (0070), and on a database from before it the
    // open that wants a number, which the page from before 0070 then shows.
    let match: number | null = null;
    let { data: opened, error: openErr } = await supabase.rpc('celestual_edu_link_open', {
      ...args,
      p_carry: purpose === 'edu' ? carryOf(body.carry) : null,
    });
    if (missingFn(openErr)) {
      match = matchNumber();
      ({ data: opened, error: openErr } = await supabase.rpc('celestual_edu_link_open', { ...args, p_match: match }));
    }
    if (openErr) {
      console.error('edu link open failed', openErr.message);
      return json({ ok: false, error: 'send' });
    }
    if (!opened?.ok) return json({ ok: false, error: String(opened?.error ?? 'send') });

    try {
      await sendMail(email, verifyMail({ link: `${SITE}/verify#t=${token}`, purpose, domain, draft }));
    } catch (e) {
      console.error('edu link email failed', String(e));
      return json({ ok: false, error: 'send' });
    }
    return json({
      ok: true, request: opened.request, domain, campus, school,
      ...(match == null ? {} : { match: Number(opened.match) || match }),
    });
  }

  // ── CONFIRM ─────────────────────────────────────────────────────────────
  // The link, opened. `session` is the browser that opened it, and since 0070
  // it is the one the link signs in, whichever browser asked
  // (celestual_edu_link_confirm): a campus proved on it, or a login signed in
  // on it as whoever holds the address (celestual_user_bind_email_hash,
  // 0065); or, for alerts, the asking person's alert address confirmed. The
  // asking browser is signed in only when it is this one. `carry` comes back
  // to a browser that is not the one that asked.
  //
  // The page from before 0070 may still send `match`, the number typed off
  // an asking screen. It is passed on as two digits or not at all, and 0070
  // never reads it; it is only for a database from before 0070, which asks
  // for it on another browser and which the page from before then shows.
  // The page after 0070 sends none, and on that database is answered
  // 'match', and says to open the link where it was asked for.
  if (action === 'confirm') {
    const token = String(body.token || '');
    const session = String(body.session || '');
    const typed = body.match == null ? '' : String(body.match).trim();
    if (token.length < 16 || token.length > 128) return json({ ok: false, error: 'invalid' });
    const { data, error } = await supabase.rpc('celestual_edu_link_confirm', {
      p_token: token,
      p_session: session.length >= 16 && session.length <= 256 ? session : null,
      p_match: /^\d{2}$/.test(typed) ? Number(typed) : null,
    });
    if (error) {
      console.error('edu link confirm failed', error.message);
      return json({ ok: false, error: 'invalid' }, 500);
    }
    return json(data ?? { ok: false, error: 'invalid' });
  }

  // ── STATUS ──────────────────────────────────────────────────────────────
  // Whether the link was opened, answered to the session that asked for it and
  // to nobody else: the asking screen polls this while the person is in their
  // inbox, and moves on the moment it is `verified`, or says the link was
  // opened in another browser the moment it is `elsewhere` (0070).
  if (action === 'status') {
    const request = String(body.request || '');
    const session = String(body.session || '');
    if (!request || session.length < 16 || session.length > 256) return json({ ok: false, error: 'invalid' });
    const { data, error } = await supabase.rpc('celestual_edu_link_status', { p_request: request, p_session: session });
    if (error) {
      console.error('edu link status failed', error.message);
      return json({ ok: false, error: 'invalid' }, 500);
    }
    return json(data ?? { ok: false, error: 'invalid' });
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

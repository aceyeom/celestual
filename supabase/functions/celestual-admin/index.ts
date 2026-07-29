// CELESTUAL — celestual-admin edge function.
//
// The desk behind celestual.us/admin. The browser sends the password with every
// request; nothing is ever readable without it, because the data RPCs are
// service-role only and this function is the only thing holding that key.
//
//   { password, action:'overview' }                    → the whole desk in one
//        object: competitors (links, traffic, credited signups), users (how
//        each verified: 'dm', 'timeout' with its code, pending attempts).
//   { password, action:'delete_user', handle }         → erase one person.
//   { password, action:'ban_user', handle }            → erase + suppress; the
//        ban checks in 0017 keep the @ from verifying back in.
//   { password, action:'delete_competitor', handle }   → remove a trial row +
//        its link counters, leaving their ordinary user data alone.
//
// The password: CELESTUAL_ADMIN_PASSWORD (Edge Function secret). It falls back
// to the launch password so the desk works the moment this deploys; set the
// secret to rotate it without a redeploy. Wrong tries are rate limited per IP.
//
// Deploy:  supabase functions deploy celestual-admin
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_PASSWORD = Deno.env.get('CELESTUAL_ADMIN_PASSWORD') || 'acedavid123';
const FAILS_PER_IP_HOUR = 20;

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

function clientIp(req: Request): string | null {
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null
  );
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

  const ip = clientIp(req);

  // The gate. Hash both sides before comparing so the check runs in constant
  // time relative to the password's content.
  const given = String(body.password || '');
  const okPassword =
    given.length > 0 && (await sha256Hex(given)) === (await sha256Hex(ADMIN_PASSWORD));
  if (!okPassword) {
    if (ip) {
      const sinceIso = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await supabase
        .from('celestual_attempts')
        .select('ip', { count: 'exact', head: true })
        .eq('ip', ip)
        .eq('from_handle', 'celestual:admin')
        .gte('created_at', sinceIso);
      if ((count ?? 0) >= FAILS_PER_IP_HOUR) return json({ ok: false, error: 'rate' });
      await supabase
        .from('celestual_attempts')
        .insert({ ip, from_handle: 'celestual:admin', to_handle: 'fail' });
    }
    // logical errors ride a 200 like the app's other functions, so the
    // supabase-js client reads the slug instead of an opaque HTTP error
    return json({ ok: false, error: 'password' });
  }

  const action = String(body.action || '');
  const handle = String(body.handle || '');

  if (action === 'overview') {
    const { data, error } = await supabase.rpc('celestual_admin_overview');
    if (error) {
      console.error('admin overview failed', error.message);
      return json({ ok: false, error: 'server' });
    }
    return json(data);
  }

  if (action === 'delete_user' || action === 'ban_user' || action === 'delete_competitor') {
    if (!handle) return json({ ok: false, error: 'bad_input' }, 400);
    const rpc =
      action === 'delete_user'
        ? 'celestual_admin_delete_user'
        : action === 'ban_user'
          ? 'celestual_admin_ban_user'
          : 'celestual_admin_delete_competitor';
    const { data, error } = await supabase.rpc(rpc, { p_handle: handle });
    if (error) {
      console.error(`admin ${action} failed`, error.message);
      return json({ ok: false, error: 'server' });
    }
    return json(data);
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

// CELESTUAL: celestual-admin edge function.
//
// The desk behind celestual.us/admin. The browser sends the password with every
// request; nothing here is readable without it, because every data RPC is
// service-role only and this function is the only thing in the product holding
// that key.
//
// ── TWO HALVES, BECAUSE THE PRODUCT HAS TWO ─────────────────────────────────
// Phase 4b layered celestual_users over the old identity layer and backfilled
// from it rather than replacing it, so both are live and the DM code flow still
// writes the old one. The desk reads both.
//
//   THE DESK (0033, 0039)        the rebuild's own tables
//     desk_overview              counts, rate limit status, merge conflicts,
//                                scan attribution, campuses, the settings
//     desk_growth                the series the chart is drawn from
//     desk_users, desk_user      the person, and the person whole
//     desk_pings                 the ping ledger, without the map
//     desk_profiles              the Apify resolution cache
//     desk_profile_forget        force a re-resolve (spec section 5)
//     desk_letters               wall submissions and the moderation queue,
//                                with the classifier's own reasons
//     desk_letter_set            a person's decision on one letter
//     desk_reports               user-flagged content
//     desk_report_resolve        the action path: uphold, or dismiss and it
//                                goes back up
//     desk_name_shut, _open      every letter to a name down, and no more
//     desk_waitlist              everybody who looked and found nothing
//     desk_conflict_resolve      close a merge that stopped to ask
//     desk_signin                a sign in link: a browser as a handle, a
//                                campus, or both, with no DM and no mail
//     desk_settings, desk_setting_set
//                                the release gate, the resolver switch, the
//                                four caps
//     desk_campus_set, desk_campus_add
//     desk_log                   what the desk did, and when
//
//   Every write that goes through is written to celestual_desk_log by this
//   function, so the log is the function's and not the browser's.
//
//   THE LEGACY LAYER (0017 to 0020)   the DM flow's own records
//     overview                   members, unverified attempts, growth, log
//     delete_user, ban_user, unban_user, handle_status,
//     clear_pending, verify_user
//
// `delete_competitor` is gone. 0034 dropped the campaign it belonged to.
//
// ── WHAT THIS FUNCTION WILL NOT DO ──────────────────────────────────────────
// Stamp handle_verified_at. Spec section 4 gives that one writer, the DM code
// flow, and an admin action that set it would make the proof optional. The
// legacy verify_user still admits somebody by hand on the OLD layer, stamped
// verified_via='manual', which is honest about what it is.
//
// The password: CELESTUAL_ADMIN_PASSWORD (Edge Function secret), and nothing
// else. It used to fall back to a launch password written here in the source,
// which meant the desk — every letter body, every campus address, every report
// — opened to anybody who had read a commit of this repository. With the secret
// unset the desk refuses everyone and says why in the log. Set the secret
// BEFORE deploying this version. Wrong tries are rate limited per IP.
//
// Deploy:  supabase functions deploy celestual-admin
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_PASSWORD = Deno.env.get('CELESTUAL_ADMIN_PASSWORD') || '';
if (!ADMIN_PASSWORD) console.error('CELESTUAL_ADMIN_PASSWORD is not set: the desk is closed to everybody until it is');
const FAILS_PER_IP_HOUR = 20;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Where a stored avatar is read from. The desk builds the same URL the browser
// builds, from the same bucket and the same path, so a face that is broken on
// the wall is broken here too rather than being papered over by a second code
// path that happens to work.
const AVATAR_BASE = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/avatars/`;

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

// The two shapes the desk sends: a bounded page, and a string that is used in a
// LIKE. Both are clamped here as well as in SQL, because a limit of a million
// is a way to make the database do work on somebody else's behalf and the
// password is the only thing between a stranger and this function.
const num = (v: unknown, dflt: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), max) : dflt;
};
const str = (v: unknown, max = 120) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// Every desk read, as a map from the action the browser names to the RPC and the
// arguments it is allowed to pass. Written as data rather than as a switch so
// the whole surface of the desk is one readable list, and so an action the
// table does not name cannot reach a function by being spelled like one.
type Args = Record<string, unknown>;
const DESK: Record<string, (b: Record<string, unknown>) => [string, Args]> = {
  desk_overview: () => ['celestual_desk_overview', {}],
  desk_users: (b) => ['celestual_desk_users', {
    p_query: str(b.query), p_limit: num(b.limit, 50, 200), p_offset: num(b.offset, 0, 100000),
  }],
  desk_user: (b) => ['celestual_desk_user', { p_id: str(b.id, 64) }],
  desk_profiles: (b) => ['celestual_desk_profiles', {
    p_query: str(b.query), p_limit: num(b.limit, 50, 200), p_offset: num(b.offset, 0, 100000),
  }],
  desk_letters: (b) => ['celestual_desk_letters', {
    p_status: str(b.status, 16), p_query: str(b.query),
    p_limit: num(b.limit, 50, 200), p_offset: num(b.offset, 0, 100000),
  }],
  desk_reports: (b) => ['celestual_desk_reports', {
    p_status: str(b.status, 16), p_limit: num(b.limit, 50, 200), p_offset: num(b.offset, 0, 100000),
  }],
  desk_waitlist: (b) => ['celestual_desk_waitlist', {
    p_limit: num(b.limit, 100, 500), p_offset: num(b.offset, 0, 100000),
  }],
  desk_growth: (b) => ['celestual_desk_growth', {
    p_days: num(b.days, 30, 3650), p_grain: str(b.grain, 8) || 'day',
  }],
  desk_pings: (b) => ['celestual_desk_pings', {
    p_state: str(b.state, 16), p_query: str(b.query),
    p_limit: num(b.limit, 50, 200), p_offset: num(b.offset, 0, 100000),
  }],
  desk_settings: () => ['celestual_desk_settings', {}],
  desk_log: (b) => ['celestual_desk_log_list', {
    p_limit: num(b.limit, 100, 500), p_offset: num(b.offset, 0, 100000),
  }],
};

// The writes. Separate from the reads above so that reading the file tells you
// exactly which six calls can change anything.
const DESK_WRITE: Record<string, (b: Record<string, unknown>) => [string, Args]> = {
  desk_profile_forget: (b) => ['celestual_desk_profile_forget', { p_handle: str(b.handle, 40) }],
  desk_letter_set: (b) => ['celestual_desk_letter_set', {
    p_id: str(b.id, 64), p_status: str(b.status, 16), p_note: str(b.note, 400),
  }],
  desk_report_resolve: (b) => ['celestual_desk_report_resolve', {
    p_id: str(b.id, 64), p_uphold: b.uphold === true, p_note: str(b.note, 400),
  }],
  desk_conflict_resolve: (b) => ['celestual_desk_conflict_resolve', {
    p_id: str(b.id, 64), p_note: str(b.note, 400),
  }],
  desk_signin: (b) => ['celestual_desk_signin', {
    p_handle: str(b.handle, 40), p_edu_email: str(b.edu_email, 200),
    p_email: str(b.email, 200), p_note: str(b.note, 120),
  }],
  desk_setting_set: (b) => ['celestual_desk_setting_set', {
    p_key: str(b.key, 40), p_value: str(b.value, 40),
  }],
  desk_campus_set: (b) => ['celestual_desk_campus_set', {
    p_slug: str(b.slug, 40), p_open: b.open === true,
  }],
  desk_campus_add: (b) => ['celestual_desk_campus_add', {
    p_slug: str(b.slug, 40), p_name: str(b.name, 80), p_domain: str(b.domain, 80),
  }],
  desk_name_shut: (b) => ['celestual_desk_name_shut', {
    p_handle: str(b.handle, 40), p_campus: str(b.campus, 40), p_note: str(b.note, 400),
  }],
  desk_name_open: (b) => ['celestual_desk_name_open', {
    p_handle: str(b.handle, 40), p_campus: str(b.campus, 40),
  }],
};

// What a write is about, for the log: the one argument that names its target.
function targetOf(args: Args): string | null {
  for (const k of ['p_handle', 'p_id', 'p_key', 'p_slug', 'p_edu_email']) {
    const v = args[k];
    if (typeof v === 'string' && v) return `${k.slice(2)}:${v}`;
  }
  return null;
}

// The log row, after a write that went through. The sign in link's tokens
// are never written down: the row says a link was minted and for whom.
async function logWrite(action: string, args: Args, data: unknown) {
  const detail: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === 'p_note' || k === 'p_status' || k === 'p_uphold' || k === 'p_value' || k === 'p_open') detail[k.slice(2)] = v;
  }
  const d = data as Record<string, unknown> | null;
  if (d && typeof d === 'object') {
    for (const k of ['letters', 'closed', 'restored', 'erased', 'banned', 'handle', 'edu_email']) {
      if (k in d) detail[k] = d[k];
    }
  }
  const { error } = await supabase.rpc('celestual_desk_log_add', {
    p_action: action, p_target: targetOf(args), p_detail: detail,
  });
  if (error) console.error('desk log failed', error.message);
}

// The legacy layer, unchanged apart from delete_competitor coming off with the
// campaign it belonged to.
const HANDLE_ACTIONS: Record<string, string> = {
  delete_user: 'celestual_admin_delete_user',
  ban_user: 'celestual_admin_ban_user',
  unban_user: 'celestual_admin_unban_user',
  handle_status: 'celestual_admin_handle_status',
  clear_pending: 'celestual_admin_clear_pending',
  verify_user: 'celestual_admin_verify_user',
};

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
    ADMIN_PASSWORD.length > 0 && given.length > 0 && (await sha256Hex(given)) === (await sha256Hex(ADMIN_PASSWORD));
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

  // ── the desk ──
  const desk = DESK[action] || DESK_WRITE[action];
  if (desk) {
    const [rpc, args] = desk(body);
    // Every desk write and desk_user takes an id, and a missing one would reach
    // the database as a null and come back as an unhelpful not_found.
    if ('p_id' in args && !args.p_id) return json({ ok: false, error: 'bad_input' }, 400);
    if ('p_handle' in args && !args.p_handle) return json({ ok: false, error: 'bad_input' }, 400);

    const { data, error } = await supabase.rpc(rpc, args);
    if (error) {
      console.error(`admin ${action} failed`, error.message);
      return json({ ok: false, error: 'server' });
    }
    if (DESK_WRITE[action] && data && (data as { ok?: boolean }).ok !== false) {
      await logWrite(action, args, data);
    }
    // The desk sends paths, not URLs (0033 says why). The bucket's public base
    // is added on the way out, here, where the project's own address is known.
    return json(action === 'desk_profiles' ? withAvatars(data) : data);
  }

  // ── the legacy layer ──
  if (action === 'overview') {
    const { data, error } = await supabase.rpc('celestual_admin_overview');
    if (error) {
      console.error('admin overview failed', error.message);
      return json({ ok: false, error: 'server' });
    }
    return json(data);
  }

  if (HANDLE_ACTIONS[action]) {
    const handle = String(body.handle || '');
    if (!handle) return json({ ok: false, error: 'bad_input' }, 400);
    const { data, error } = await supabase.rpc(HANDLE_ACTIONS[action], { p_handle: handle });
    if (error) {
      console.error(`admin ${action} failed`, error.message);
      return json({ ok: false, error: 'server' });
    }
    // handle_status is a read; the other five change somebody's record.
    if (action !== 'handle_status' && data && (data as { ok?: boolean }).ok !== false) {
      await logWrite(action, { p_handle: handle }, data);
    }
    return json(data);
  }

  return json({ ok: false, error: 'bad_input' }, 400);
});

function withAvatars(data: unknown) {
  const d = data as { rows?: Record<string, unknown>[] } | null;
  if (!d || !Array.isArray(d.rows)) return data;
  return {
    ...d,
    rows: d.rows.map((r) => ({
      ...r,
      avatar: r.avatar_path ? AVATAR_BASE + String(r.avatar_path) : '',
    })),
  };
}

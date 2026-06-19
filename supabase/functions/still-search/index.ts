// CELESTUAL — still-search edge function (Instagram @ typeahead).
//
// The client cannot hold a scraper key and must never call a scraping API
// directly (key exposure + CORS + IP bans). This function is the server-side
// proxy: it takes a query, calls a configured provider, normalizes the result to
// { handle, full_name, avatar, verified }, and returns the top matches. The
// front-end's searchHandles() adapter (still-app/src/api/still.js) calls this
// only when VITE_HANDLE_SEARCH=1; otherwise manual entry + validation carries
// the flow with zero dependency.
//
// PROVIDER is intentionally pluggable — swapping search sources later is a change
// to THIS function only, not the app. Wire whichever vetted source you choose:
//   HANDLE_SEARCH_URL   — provider search endpoint (it receives ?q=)
//   HANDLE_SEARCH_KEY   — provider API key (sent as x-api-key; adjust as needed)
//   HANDLE_SEARCH_HOST  — optional host header (e.g. RapidAPI host)
//
// Caveats to weigh before enabling: most Instagram search sources operate against
// IG's ToS, are rate-limited, and can break without notice. Cache aggressively
// and fail soft (return []), which this does.
//
// Deploy:  supabase functions deploy still-search

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function norm(h: string) {
  return String(h || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '')
}

// Map a provider payload into our shape. Adjust the field paths to match the
// provider you pick; this covers the common "users: [{ username, full_name,
// profile_pic_url, is_verified }]" shape used by several IG search endpoints.
function shape(raw: any) {
  const users = raw?.users ?? raw?.results ?? raw?.data ?? []
  if (!Array.isArray(users)) return []
  return users
    .map((u: any) => ({
      handle: norm(u.username ?? u.handle ?? u.user?.username ?? ''),
      full_name: u.full_name ?? u.fullName ?? u.user?.full_name ?? '',
      avatar: u.profile_pic_url ?? u.avatar ?? u.user?.profile_pic_url ?? '',
      verified: !!(u.is_verified ?? u.verified ?? u.user?.is_verified),
    }))
    .filter((u: any) => u.handle.length >= 1)
    .slice(0, 8)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let q = ''
  try {
    q = norm((await req.json()).q)
  } catch {
    /* ignore */
  }
  if (q.length < 2) return json({ results: [] })

  const url = Deno.env.get('HANDLE_SEARCH_URL')
  const key = Deno.env.get('HANDLE_SEARCH_KEY')
  if (!url || !key) return json({ results: [] }) // not configured → manual entry only

  try {
    const target = new URL(url)
    target.searchParams.set('q', q)
    const headers: Record<string, string> = { 'x-api-key': key }
    const host = Deno.env.get('HANDLE_SEARCH_HOST')
    if (host) {
      headers['x-rapidapi-host'] = host
      headers['x-rapidapi-key'] = key
    }
    const res = await fetch(target.toString(), { headers })
    if (!res.ok) return json({ results: [] })
    return json({ results: shape(await res.json()) })
  } catch {
    return json({ results: [] }) // fail soft — never block manual entry
  }
})

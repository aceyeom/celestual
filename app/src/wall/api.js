// api.js: the wall, on a server.
//
// `data.js` line 3 has said the same thing since the wall was built:
// "Everything here is in memory. This build is a visual prototype: it reaches
// no server, it stores nothing anybody typed anywhere but this tab." This
// module is the end of that. Everything below reaches migration 0032.
//
// ── WHAT THE SERVER WILL AND WILL NOT SAY ────────────────────────────────────
// Worth having in front of you, because several of these functions look like
// they should return more than they do, and the missing parts are the product.
//
//   the index      public. A handle and a count. Anybody, no session, no
//                  answering anything, because somebody who just scanned a code
//                  off a flyer has to see the wall in four seconds.
//   the letters    behind the read gate. A stranger gets the shape of a letter
//                  and `body` as null; somebody this product has proved, by a
//                  campus address OR a verified handle, gets the words
//                  (wall_read_gate, migration 0044). The redaction happens in
//                  the database, because a redaction the client performs is
//                  not a redaction.
//   writing        behind the campus gate, which is a different and narrower
//                  door, and three letters in any seven days.
//   the seal       one function returns it, and only when the caller holds the
//                  verified handle it is addressed to, asked, and the author
//                  said yes.
//   the author     never. Not on any request, by any actor, ever. There is no
//                  column for it in anything a browser can reach.
//
// ── ERRORS ───────────────────────────────────────────────────────────────────
// Every function here answers `{ ok, ... }` and none of them throw. A wall that
// throws on a flaky connection is a wall that shows somebody a stack trace
// instead of a name. The screens branch on `ok` and on `error`, which is always
// one of a small set of slugs the UI can put words to.
import { supabase, hasSupabase } from '../api/supabase.js'
import { sessionToken } from '../api/identity.js'
import { avatarUrl, learnHandle } from '../api/handles.js'

// One campus is open. Q11: berkeley for launch, and the schema is shaped so a
// second one is a row in wall_campuses rather than a migration. It is a
// constant here rather than a hardcoded string in nine call sites.
export const CAMPUS = 'berkeley'

const OFFLINE = { ok: false, error: 'offline' }

// Every call goes through here, so there is one place that decides what a
// network failure looks like and one place that unwraps an RPC.
async function call(fn, args) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) return { ok: false, error: 'network' }
    return data ?? { ok: false, error: 'empty' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ── the index ────────────────────────────────────────────────────────────────
// The wall of tiles. One row per handle written to, with a count, which is what
// gives a tile its weight: a handle written to three times reads as heavier
// than one written to once.
//
// A direct select on the view rather than an RPC, because the view is the
// public thing and going through a function would only add a hop.
export async function wallIndex() {
  if (!hasSupabase) return { ok: false, error: 'offline', tiles: [] }
  try {
    const { data, error } = await supabase
      .from('wall_index')
      .select('target_handle, letters, last_at')
      .eq('campus', CAMPUS)
      .order('last_at', { ascending: false })
      .limit(500)
    if (error) return { ok: false, error: 'network', tiles: [] }
    return {
      ok: true,
      tiles: (data ?? []).map((r) => ({
        handle: r.target_handle,
        count: r.letters,
        at: new Date(r.last_at).getTime(),
      })),
    }
  } catch {
    return { ok: false, error: 'network', tiles: [] }
  }
}

// Exact handle first, then the names that start with what was typed, then
// the ones that contain it. The ordering is the server's (0040), for the
// reason `data.js` gives: somebody who half-remembers a handle still lands
// somewhere, and somebody who types their own exact handle lands on
// themselves rather than on a list of near-misses.
//
// Each row carries the resolver's answer for that name when there is one:
// `known` says whether there is, and the name, the badge and the face come
// with it, so a list of eight people is one request and not nine.
export async function wallSearch(query) {
  const rows = await call('wall_search', { p_query: String(query || '') })
  if (!Array.isArray(rows)) return []
  return rows.map((r) => ({
    handle: r.handle,
    count: r.letters,
    at: new Date(r.last_at).getTime(),
    known: !!r.known,
    name: String(r.display_name || ''),
    verified: !!r.is_verified,
    avatar: avatarUrl(r.avatar_path),
  }))
}

// ── the pulse ────────────────────────────────────────────────────────────────
// Whether this campus's wall is open and how much is on it, in one row. The
// front door pins the wall's poster up off this and takes it down when the
// campus closes. Anything short of an answer reads as closed.
export async function wallPulse() {
  const out = await call('wall_pulse', { p_campus: CAMPUS })
  if (!out || out.ok !== true) return { ok: false, error: out?.error || 'network', open: false, names: 0, letters: 0 }
  return {
    ok: true,
    open: !!out.open,
    names: Number(out.names) || 0,
    letters: Number(out.letters) || 0,
    at: out.last_at ? new Date(out.last_at).getTime() : 0,
  }
}

// ── the allowance ────────────────────────────────────────────────────────────
// Three letters in any seven days, and this is the only way to ask how many are
// left. It answers about the CALLER and takes no argument for anybody else:
// how much somebody has written is a fact about them, and a function that could
// be asked it about a handle would be a way to ask whether a particular person
// has been writing letters.
//
// A browser with no session is told the whole allowance rather than nothing, so
// the meter under the composer has a number to draw before it knows who is
// holding the phone.
export async function quota() {
  const out = await call('wall_quota', { p_token: sessionToken() })
  if (!out?.ok) return { ok: false, error: out?.error || 'network', limit: 3, used: 0, left: 3, resets: 0 }
  return {
    ok: true,
    signedIn: !!out.signed_in,
    limit: Number(out.limit) || 0,
    used: Number(out.used) || 0,
    left: Number(out.left) || 0,
    resets: out.resets_at ? new Date(out.resets_at).getTime() : 0,
  }
}

// ── reading ──────────────────────────────────────────────────────────────────
// `open` is the gate. When it is false every letter comes back with a null
// body, which is the redacted read, and the screen draws the shape of a letter
// with the words withheld rather than an empty state.
export async function lettersFor(handle) {
  const out = await call('wall_letters_for', {
    p_token: sessionToken(),
    p_handle: String(handle || ''),
  })
  if (!out?.ok) return { ok: false, error: out?.error || 'network', open: false, letters: [] }
  learnFace(out, out.handle)
  return {
    ok: true,
    open: !!out.open,
    handle: out.handle,
    letters: (out.letters ?? []).map(shapeLetter),
  }
}

export async function letter(id) {
  const out = await call('wall_letter', { p_token: sessionToken(), p_letter: id })
  if (!out?.ok) return { ok: false, error: out?.error || 'gone' }
  learnFace(out, out.letter?.handle)
  return { ok: true, open: !!out.open, letter: shapeLetter(out.letter) }
}

// The resolver's answer for the name the letters are under rides on the
// same read (0042), the way it rides on wall_search: the crest on the card
// and the disc in the bar draw from the memo and cost no request of their
// own. Only a name the resolver actually saw is learned.
function learnFace(out, handle) {
  if (!out?.known || !handle) return
  learnHandle({
    handle, known: true,
    name: String(out.display_name || ''),
    verified: !!out.is_verified,
    avatar: avatarUrl(out.avatar_path),
  })
}

function shapeLetter(l) {
  if (!l) return null
  return {
    id: l.id,
    to: l.handle,
    // Null when the reader is outside the gate. Not an empty string: the screen
    // has to be able to tell "withheld" from "somebody wrote nothing".
    body: l.body ?? null,
    // Sent whether or not the body is, so a redaction can be drawn at the right
    // size. Two integers, and the individual word lengths are invented from the
    // letter's id rather than sent, so no word-level shape leaks.
    words: l.words ?? 0,
    chars: l.chars ?? 0,
    hasSeal: !!l.has_seal,
    campus: l.campus,
    at: new Date(l.at).getTime(),
    expires: new Date(l.expires).getTime(),
    // Only ever true when the reader holds the verified handle the letter is
    // addressed to. It is what turns on the ask and the takedown.
    mine: !!l.mine,
    // How many hearted it, and whether this session is one of them (0042).
    // A count, never a list: nothing anywhere says who.
    hearts: Number(l.hearts) || 0,
    hearted: !!l.hearted,
  }
}

// ── writing ──────────────────────────────────────────────────────────────────
// Not an RPC. The letter goes to celestual-wall-moderate, which screens it and
// writes it in one request, because a screen whose verdict somebody else has to
// act on is a screen with a gap in it.
//
// Three outcomes, and two of them read identically to the writer on purpose:
//
//   live      it is on the wall
//   pending   a person will look at it. Reported back as 'live'.
//   rejected  it is not going up, and the reasons say why
//
// "Held" and "published" must read the same, or the screen becomes a way to
// find out what gets through by writing until something does.
//
// One more refusal since 0044: `cap`, when three letters are already spent in
// the last seven days. It carries `resets_at`, so the screen can say when one
// comes back rather than only that none is left. A rejected letter never
// spends one, so a person who has been screened is not also charged for it.
export async function write({ to, body, sealedLine, source }) {
  if (!hasSupabase) return OFFLINE
  try {
    const { data, error } = await supabase.functions.invoke('celestual-wall-moderate', {
      body: {
        token: sessionToken(),
        target: String(to || ''),
        body: String(body || ''),
        sealedLine: sealedLine ? String(sealedLine) : null,
        source: source ? String(source) : null,
        campus: CAMPUS,
      },
    })
    if (error) return { ok: false, error: 'network' }
    return data ?? { ok: false, error: 'network' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// ── the ask, and the answer ──────────────────────────────────────────────────
export const claim = (id) => call('wall_claim', { p_token: sessionToken(), p_letter: id })

export const askToReveal = (id) =>
  call('wall_reveal_request', { p_token: sessionToken(), p_letter: id })

export const answerReveal = (id, reveal) =>
  call('wall_reveal_answer', { p_token: sessionToken(), p_letter: id, p_reveal: !!reveal })

export const seal = (id) => call('wall_letter_seal', { p_token: sessionToken(), p_letter: id })

// ── the heart ────────────────────────────────────────────────────────────────
// On, or off. Behind the read gate like reading, and it answers the count
// so the screen draws the server's number and not its own arithmetic.
export const heart = (id, on) =>
  call('wall_heart', { p_token: sessionToken(), p_letter: id, p_on: !!on })

// ── the nineteen, and the flyer ──────────────────────────────────────────────
// Nothing reads either of these back. A function that could read the waitlist
// would be a way to ask whether somebody wants to be written to, which is
// nobody's business, and there is no such function in the schema.
export const joinWaitlist = (handle, source) =>
  call('wall_waitlist_add', {
    p_handle: String(handle || ''),
    p_campus: CAMPUS,
    p_source: source ? String(source) : null,
  })

export const logScan = (source) =>
  call('wall_scan', { p_source: String(source || ''), p_campus: CAMPUS })

// ── coming down ──────────────────────────────────────────────────────────────
// Both of these take the letter down in the same statement that files the
// record. Reporting is post-moderated, on purpose and for the same reason
// publishing is pre-moderated: the screenshot exists before you delete it, so a
// queue that leaves the letter up while somebody thinks about it has understood
// the asymmetry backwards.
// The first step of the report is one tap with no reason. The row's reason
// column is one to four hundred characters, so the tap goes up as
// 'unspecified' (which is also what 0038's wall_report writes for an empty
// string) rather than as '' against a database that is a migration behind.
export const report = (id, reason) =>
  call('wall_report', { p_token: sessionToken(), p_letter: id, p_reason: String(reason || '').trim() || 'unspecified' })

export const removeLetter = (id) =>
  call('wall_remove_letter', { p_token: sessionToken(), p_letter: id })

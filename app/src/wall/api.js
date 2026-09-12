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
//   the letters    five to anybody, then the read gate. Every browser is handed
//                  five whole letters before it is asked for anything (0045);
//                  after that a body travels only to somebody this product has
//                  proved, by a campus address OR a verified handle
//                  (wall_read_gate, 0044), and everything else arrives with
//                  `body` as null. The redaction happens in the database,
//                  because a redaction the client performs is not a redaction,
//                  and so does the counting, because a count the client keeps
//                  is a count the reader owns.
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
//
// ── and the face rides with the name ──
// Since 0048 the view carries the resolver's answer for every name on it,
// the way the search has since 0040: `known`, the display name, the badge
// and the path to the stored face. The wall used to draw sixty grey discs
// off this read and then ask a second question, a batched peek through the
// Vercel function into the edge function and back, before a single picture
// could start. One read now, and the pictures are the next request.
//
// The four columns are asked for by name, and a database that does not have
// them yet answers with an error rather than with a narrower row. So the read
// falls back to the four 0032 columns on that one error, and the wall draws
// its monograms the way it did: a deploy that lands before the migration is a
// slower wall, never a blank one.
const INDEX_COLS = 'target_handle, letters, last_at'
const INDEX_FACES = `${INDEX_COLS}, known, display_name, is_verified, avatar_path`
let indexCols = INDEX_FACES

export async function wallIndex() {
  if (!hasSupabase) return { ok: false, error: 'offline', tiles: [] }
  try {
    let { data, error } = await supabase
      .from('wall_index')
      .select(indexCols)
      .eq('campus', CAMPUS)
      .order('last_at', { ascending: false })
      .limit(500)
    if (error && indexCols !== INDEX_COLS) {
      indexCols = INDEX_COLS
      ;({ data, error } = await supabase
        .from('wall_index')
        .select(indexCols)
        .eq('campus', CAMPUS)
        .order('last_at', { ascending: false })
        .limit(500))
    }
    if (error) return { ok: false, error: 'network', tiles: [] }
    return {
      ok: true,
      tiles: (data ?? []).map((r) => ({
        handle: r.target_handle,
        count: r.letters,
        at: new Date(r.last_at).getTime(),
        known: !!r.known,
        name: String(r.display_name || ''),
        verified: !!r.is_verified,
        avatar: avatarUrl(r.avatar_path),
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
// Whether a body travels is a question per LETTER, not per reader (0045): a
// browser gets five whole ones before it is asked for anything, so the first
// five arrive with their words and the rest arrive redacted. `body === null` is
// the only thing a screen should branch on.
//
// Two facts about the reader ride alongside, and they are what the meter draws
// from. `gated` is whether this person is through wall_read_gate, in which case
// the five are irrelevant; `free` is { limit, used, left }, counted AFTER the
// read that answered it, which is the number a screen wants: somebody who has
// just been handed one letter is told four, not five.
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
    gated: !!out.gated,
    free: shapeFree(out.free),
    handle: out.handle,
    letters: (out.letters ?? []).map(shapeLetter),
  }
}

export async function letter(id) {
  const out = await call('wall_letter', { p_token: sessionToken(), p_letter: id })
  if (!out?.ok) return { ok: false, error: out?.error || 'gone' }
  learnFace(out, out.letter?.handle)
  return {
    ok: true,
    open: !!out.open,
    gated: !!out.gated,
    free: shapeFree(out.free),
    letter: shapeLetter(out.letter),
  }
}

// A count, a ceiling and what is left. Never a list: nothing anywhere says
// WHICH letters a browser has read, and there is no function that could be
// asked it about anybody else.
function shapeFree(f) {
  if (!f) return null
  return {
    limit: Number(f.limit) || 0,
    used: Number(f.used) || 0,
    left: Number(f.left) || 0,
  }
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
// Two outcomes since migration 0050, and one of them covers two cases on
// purpose:
//
//   live      it is on the wall. A letter the screen passed, and a letter it
//             was unsure of, which is up too and flagged for a person to read
//             while it stands. Reported back the same.
//   rejected  it is not going up, and the reasons say what the screen read it
//             as, in the category words the app says as a sentence
//
// "Flagged" and "published" must read the same, or the screen becomes a way
// to find out what gets through by writing until something does.
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

// ── this device's own letters ────────────────────────────────────────────────
// What this person put up and where each letter stands now: live, or down, and
// if it is down, by whose hand and for what (migration 0050 `wall_mine`). It
// answers about the CALLER's own rows and takes no argument for anybody else,
// for the same reason the allowance does. It is how the wall tells a writer
// that a letter of theirs came down after it went up, and hands them their own
// words back to change.
//
//   downBy   null while the letter is up; 'screen' when the screen refused it
//            on the way in; 'desk' when a person took it down after; 'report'
//            when a reader did; 'shut' when the name itself came off the wall;
//            'lapsed' when it aged out
//   reasons  the screen's own category words, when it named any
export async function mine() {
  const out = await call('wall_mine', { p_token: sessionToken() })
  if (!out?.ok) return { ok: false, error: out?.error || 'network', letters: [] }
  return {
    ok: true,
    letters: (out.letters ?? []).map((l) => ({
      id: l.id,
      to: l.handle,
      body: l.body ?? '',
      status: l.status,
      downBy: l.down_by || null,
      reasons: Array.isArray(l.reasons) ? l.reasons.map(String) : [],
      flagged: !!l.flagged,
      at: new Date(l.at).getTime(),
    })),
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

// ── and how far they got ─────────────────────────────────────────────────────
// The four steps between a scan and a letter (migration 0047). Nothing reads
// these back either: they are counted on the desk, per card, and there is no
// function that could tell a browser anything about them.
//
// Called through seed.js `cardStep`, which is what holds them to once per device.
// A code the registry does not know is answered ok and written nowhere, so a
// stale code in an old tab costs one request and changes no number.
export const logStep = (source, name) =>
  call('wall_card_step', {
    p_code: String(source || ''),
    p_step: String(name || ''),
    p_campus: CAMPUS,
  })

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

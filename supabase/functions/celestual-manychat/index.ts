// CELESTUAL — celestual-manychat edge function.
//
// The no-Meta-developer-portal path. ManyChat (an official Meta messaging partner)
// owns the Instagram connection; when someone DMs the verification code to your
// Instagram account, a ManyChat automation fires an "External Request" to THIS
// endpoint, passing the sender's real Instagram username and the message text.
// We trust the username because ManyChat obtained it from Meta's official API, and
// we authenticate that the request truly comes from YOUR ManyChat with a shared
// secret. The 4-digit code is only a correlation id (migrations 0004 + 0012): the
// Meta-authenticated sender IS the identity — whoever DMs a live code is verified
// as that account, so there is nothing to "mismatch" against.
//
// ManyChat External Request setup — full step-by-step in docs/MANYCHAT-SETUP.md:
//   • Trigger:   a KEYWORD trigger — "message contains star-" (people send
//                "star-1283"), so ordinary DMs never ping the backend. Keyword
//                triggers fire on EVERY matching message.
//                ⚠ Do NOT build this on the Default Reply trigger: Default Reply
//                fires at most ONCE PER CONTACT PER 24 HOURS by default, which
//                makes verification "one and done" — a person's first DM
//                verifies, and every later attempt is silently dropped by
//                ManyChat before it ever reaches this function. If you must use
//                Default Reply, set it to trigger "every time".
//   • Method: POST   URL: this function's URL
//   • Header:  X-Celestual-Token: <MANYCHAT_SHARED_SECRET>
//   • Body (JSON), inserting ManyChat fields with the "+" picker:
//       { "username": "{{instagram.username}}", "text": "{{last_text_input}}" }
//   • Response Mapping: map JSONPath $.reply to a text field and send that field
//     back as the next DM — that's the instant "you're verified ✦" feedback the
//     sender sees. Every verification outcome carries a `reply` (verified, wrong
//     account, expired code), so the automation never goes silent on somebody
//     who was actually trying to verify.
//     Replying immediately to a user-initiated DM sits inside Meta's 24-hour
//     standard messaging window, so this is ToS-clean.
//   • ALSO map JSONPath $.send to a field, and put a Condition on it before the
//     Send Message node. `send` is false exactly when `reply` is empty, which is
//     this function saying "there is nothing to tell this person — do not
//     message them". An automation that sends unconditionally will interrupt
//     strangers' conversations; see the check path below.
//
// THE MUTUAL DM (migration 0023, docs/MANYCHAT-MUTUAL-DM.md). This function is
// also the delivery route for the one piece of news the product exists to
// deliver. Two things were added and neither changes verification:
//
//   • Every relayed message refreshes the sender's contact row
//     (celestual_dm_touch) — their ManyChat contact id, and the moment they last
//     messaged us, which is the only thing that decides whether a push is inside
//     Meta's 24-hour window.
//   • Every reply carries any mutual news waiting for that account
//     (celestual_dm_take), appended to whatever the message was about. A person
//     verifying on a new phone is told in the same breath. A person who just
//     types "hi" is told too — set up a second automation for that, since the
//     `star-` keyword trigger will not fire on it (§4 of the guide).
//
// A second, optional trigger can ask for the news explicitly by POSTing
// { "action": "check", "username": … } — no code needed, nothing else changes.
// That trigger fires on ORDINARY DMs, from anyone, including people who have
// never heard of CELESTUAL and who are mid-conversation with a human. So it
// answers ONLY when there is real news: no news, empty `reply`, `send:false`,
// and the account says nothing at all.
//
// Required secret (Supabase → Edge Functions → Secrets):
//   MANYCHAT_SHARED_SECRET — a long random string you also set in the ManyChat
//                            request header. This is what stops anyone else from
//                            POSTing fake verifications, so keep it secret + rotate it.
// Optional:
//   CELESTUAL_SITE_URL     — where the mutual line sends people (default
//                            https://celestual.us)
// Injected automatically:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy celestual-manychat
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mutualBlock, type MutualItem } from '../_shared/mutual.ts';

const SHARED_SECRET = Deno.env.get('MANYCHAT_SHARED_SECRET') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Constant-time-ish compare so the secret can't be guessed byte-by-byte via timing.
function safeEqual(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Pull the correlation code out of the DM text. Codes are 4 digits again
// (migration 0019 — six bought nothing but friction, since the code is a pure
// correlation id and the Meta-authenticated sender is the identity). The
// \d{4,6} range is kept deliberately so any six-digit code still in flight from
// the 0014→0019 era resolves normally.
//
// The app tells people to send the prefixed form — "star-1283" — and your
// ManyChat automation's Condition only forwards messages containing "star-", so
// in practice that is the whole text. We read the prefixed form first
// (case-insensitive, separator optional), then fall back to any bare 4–6 digit
// run so a stray format still resolves. Parsing is never the security boundary
// — a wrong code just finds no pending session; the sender's username is the gate.
function codeCandidates(text: string): string[] {
  const s = String(text ?? '');
  const out: string[] = [];
  // Tolerate the dashes phone keyboards substitute (– —) in the prefixed form.
  for (const m of s.matchAll(/star[-–—\s]?(\d{4,6})/gi)) out.push(m[1]);
  for (const m of s.matchAll(/(?<!\d)(\d{4,6})(?!\d)/g)) out.push(m[1]);
  return [...new Set(out)];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Every answer also says, explicitly, whether ManyChat should send anything at
// all. A blank `reply` is a DELIBERATE SILENCE, not a failure — see the check
// path below for why that had to exist. ManyChat cannot reason about an empty
// custom field on its own, so map `$.send` to a field and put a Condition on it
// in front of the Send Message node (docs/MANYCHAT-MUTUAL-DM.md §8.2).
function answer(body: Record<string, unknown> & { reply?: string }, status = 200) {
  const text = typeof body.reply === 'string' ? body.reply : '';
  return json({ ...body, reply: text, send: text !== '' }, status);
}

// Any mutual news waiting for this account, rendered and MARKED DELIVERED — the
// reply we are composing is the delivery (migration 0023 §6 says why that is the
// honest place to draw the line). Never throws: a queue that is having a bad day
// must not be able to break verification, which is the thing the person is
// standing there waiting for.
async function mutualFor(username: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('celestual_dm_take', { p_handle: username, p_limit: 3 });
    if (error) {
      console.error('dm_take threw', JSON.stringify({ username, error: error.message }));
      return '';
    }
    const items: MutualItem[] = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) return '';
    console.log('dm_take', JSON.stringify({ username, told: items.length, more: data?.more ?? 0 }));
    return mutualBlock(items, Number(data?.more ?? 0));
  } catch (e) {
    console.error('dm_take failed', String(e));
    return '';
  }
}

// The news rides along with whatever this message was already about.
function withMutual(reply: string, news: string) {
  if (!news) return reply;
  return reply ? `${reply}\n\n${news}` : news;
}

Deno.serve(async (req) => {
  if (req.method === 'GET') return json({ ok: true, service: 'celestual-manychat' });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const raw = await req.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  // Authenticate the source (ManyChat) — header preferred, body field tolerated.
  const presented = req.headers.get('x-celestual-token') ?? body.secret ?? '';
  if (!SHARED_SECRET || !safeEqual(String(presented), SHARED_SECRET)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const text = typeof body.text === 'string' ? body.text : '';
  // "check" = a message that is not a verification at all; answer with whatever
  // is waiting. Anything else (including nothing) is the verification path.
  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  // ManyChat's contact id. Still optional in the sense that verification works
  // without it (it rides along as the igsid for audit), but since 0023 it is the
  // only way we ever learn which ManyChat contact a handle is — and therefore
  // the only way a match can be pushed to them. Map it.
  const subscriberId = body.subscriber_id != null ? String(body.subscriber_id) : '';
  if (!username) {
    return answer({ ok: false, status: 'no_username', reply: 'Something went sideways reading your account — get a fresh code in the app and send it again.' });
  }

  // This person just messaged us, so their 24-hour window is open and we know
  // which ManyChat contact they are. Both facts belong to the push path
  // (celestual-mutual-dm), and this is the only place either is observable.
  try {
    const { error } = await supabase.rpc('celestual_dm_touch', {
      p_handle: username,
      p_subscriber_id: subscriberId || null,
      p_channel: 'manychat',
    });
    if (error) console.error('dm_touch threw', JSON.stringify({ username, error: error.message }));
  } catch (e) {
    console.error('dm_touch failed', String(e));
  }

  // Whatever this message was, it is a chance to tell them the one thing worth
  // telling. Taken once, here, so every exit below can carry it.
  const news = await mutualFor(username);

  // An automation can ask for nothing else: a keyword trigger ("celestual",
  // "mutual", or a Default Reply set to fire every time) that POSTs
  // action:"check". Keep such a trigger's keyword narrow — ManyChat's "message
  // contains" is a raw substring match, so `hi` fires on "everything".
  if (action === 'check') {
    // NOTHING WAITING MEANS NOTHING TO SAY.
    //
    // This used to answer "Nothing waiting yet. If someone you entered enters
    // you back, this is where you'll hear it." — written for a curious visitor,
    // and wrong for everybody else. The check automation fires on ORDINARY
    // MESSAGES, most of them from people who have never touched CELESTUAL and
    // who are usually mid-conversation with a human. To them that sentence is a
    // robot interrupting, about a thing they never signed up for; it landed
    // under a real reply in a real recruiting thread, which is how this was
    // found. It also cannot be right by construction: this path has no idea
    // whether the sender is a member, so it cannot promise anybody anything.
    //
    // So the automation now speaks only when it has the one piece of news it
    // exists to deliver. Silence is the correct answer to "hi".
    if (!news) return answer({ ok: true, status: 'nothing_waiting', reply: '' });
    return answer({ ok: true, status: 'mutual', reply: news });
  }

  const candidates = codeCandidates(text);
  if (candidates.length === 0) {
    // No code, but we have something to say: say it.
    if (news) return answer({ ok: true, status: 'mutual', reply: news });
    // Same rule as the check path, for the same reason: only answer somebody
    // who was plainly TRYING to verify. The verification automation is supposed
    // to fire on "message contains star-" and nothing else, but a broad keyword
    // or a Default Reply pointed here would otherwise hand a stranger's ordinary
    // sentence a form letter about a code they never asked for.
    if (/star/i.test(text)) {
      return answer({ ok: false, status: 'no_code', reply: 'Send the code exactly as the app shows it — like star-1234.' });
    }
    return answer({ ok: true, status: 'nothing_waiting', reply: '' });
  }

  let alreadyVerified: string | null = null;
  let codeExpired = false;
  // 0018: three failures used to be indistinguishable from "unknown digits" —
  // a suppressed sender, an unreadable username, and a thrown RPC all fell
  // through to the no_match reply below. That is exactly how a live, correct
  // code came back as "didn't match an active request" for a week. Each now
  // carries its own flag, its own reply, and a log line.
  let banned = false;
  let badInput = false;
  let rpcFailed = false;
  for (const token of candidates) {
    const { data, error } = await supabase.rpc('celestual_complete_ig_verification', {
      p_token: token,
      p_igsid: subscriberId || username,
      p_username: username,
    });
    if (error) {
      console.error('complete rpc threw', JSON.stringify({ token, username, error: error.message }));
      rpcFailed = true;
      continue;
    }
    // Log EVERY outcome, not just thrown errors: a { ok:false } answer is the
    // interesting case and used to leave no trace at all in the logs.
    console.log('complete', JSON.stringify({ token, username, result: data }));
    if (data?.ok) {
      // ManyChat can map `reply` to a field and send it back as a DM (optional).
      // Someone verifying on a new phone may have had news waiting the whole
      // time; this is the first legal moment to hand it over.
      return answer({
        ok: true, status: 'verified', handle: data.handle, mutual: news !== '',
        reply: withMutual(`✦ @${data.handle} is verified on CELESTUAL — head back to the app to finish.`, news),
      });
    }
    if (data?.already_verified) alreadyVerified = typeof data.handle === 'string' ? data.handle : username;
    if (data?.code_expired) codeExpired = true;
    if (data?.error === 'banned') banned = true;
    if (data?.error === 'bad_input') badInput = true;
  }

  // From here down every exit carries `news` through withMutual, and that is
  // not decoration: celestual_dm_take has ALREADY marked those rows delivered,
  // so an exit that dropped them would be the one place the product silently
  // fails its one job. A failed code is no reason to withhold the answer to the
  // question the person actually came here with.
  //
  // Nothing was pending under any candidate code. Tell the sender the TRUTH
  // about their state instead of a dead-end: a re-sent code after a success
  // (or after the direct Meta webhook won the race) means they're already in.
  if (alreadyVerified) {
    return answer({ ok: true, status: 'already_verified', handle: alreadyVerified, mutual: news !== '', reply: withMutual(`✦ @${alreadyVerified} is already verified on CELESTUAL — head back to the app, it's waiting on you, not on this DM.`, news) });
  }
  // This sender is BANNED (since 0020 that is the only thing that reaches here —
  // an opt-out no longer blocks anyone from verifying). The code was fine, so
  // saying "it may have lapsed" sent people round the mint-a-new-code loop
  // forever. Name it, and point at the one thing that can undo it.
  //
  // No news can reach this branch: a ban erases the matches it would have come
  // from, and the outbox cascades off them (0023 §10).
  if (banned) {
    return answer({ ok: false, status: 'banned', reply: 'This account can’t be verified on CELESTUAL. If that’s a mistake, write to privacy@celestual.us and we’ll look at it.' });
  }
  if (codeExpired) {
    return answer({ ok: false, status: 'code_expired', mutual: news !== '', reply: withMutual('That code expired. Get a fresh one in the app and send it here — codes last about 30 minutes.', news) });
  }
  // The username ManyChat sent didn't survive normalisation (an unmapped or
  // mangled {{instagram.username}} field). The person can't fix this — say so
  // instead of blaming their code, and check the log line above.
  if (badInput) {
    return answer({ ok: false, status: 'bad_username', mutual: news !== '', reply: withMutual('Something went sideways reading your account — get a fresh code in the app and send it again.', news) });
  }
  if (rpcFailed) {
    return answer({ ok: false, status: 'rpc_error', mutual: news !== '', reply: withMutual('Our end hiccuped reading that code. Send it once more — if it happens again, the app will let you in on its own after twenty seconds.', news) });
  }
  // Genuinely unknown digits. (Since 0017 an expired-but-retained code answers
  // code_expired above for a full week, so landing HERE means a typo'd code or
  // a code older than that retention — every other failure now has its own
  // status above.)
  //
  // Unknown digits with no "star" anywhere are, most likely, not a code at all:
  // a sentence with a year or a follower count in it, relayed by a trigger that
  // is broader than it should be. Every other outcome above proves a real code
  // was involved and still speaks; this one doesn't, so it stays quiet unless
  // the sender wrote the prefix the app told them to. Verification is untouched
  // — a bare-digit code sent through a Default Reply setup either matches
  // (verified) or lands on one of the named failures, which all still answer.
  if (!/star/i.test(text) && !news) {
    console.log('silent', JSON.stringify({ username, status: 'no_match_no_prefix' }));
    return answer({ ok: true, status: 'nothing_waiting', reply: '' });
  }
  return answer({ ok: false, status: 'no_match', mutual: news !== '', reply: withMutual('That code didn’t match an active request — it may have lapsed. Get a fresh code in the app and send it here.', news) });
});

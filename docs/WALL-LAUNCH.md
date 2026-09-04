# `/berkeley`: what is live, and what you still have to do

> **Superseded.** This audit predates Phase 6b, which put the wall on a server
> (migration 0032, `celestual-wall-moderate`, `celestual-edu-verify`), and the
> audit of 4 September (migration 0038), which found that the public index was
> unreadable by the browser and that the one tap report always failed, and
> fixed both. Everything below that says the wall reaches no server, calls 0032
> the wrong schema, or proposes a `0028_the_wall.sql`, is history. The
> operational checklist that matters now is `docs/launchsteps.md`.

Audited **30 August 2026** against the running systems, not against this
repository: Supabase project `celestual` (`vwbsjwaqnycyghvwlxhd`, ACTIVE_HEALTHY)
and Vercel project `celestual` (celestual.us, www.celestual.us, production
deploy READY).

## The one-line answer

**The core product at `/` is operational and has real users. The wall at
`/berkeley` is not connected to anything.** It renders, it is complete, and
every letter, membership and takedown on it lives in the visitor's own browser.
Nothing it does reaches a server.

## What I verified

| | state |
| --- | --- |
| core product (`/`) | **live.** 34 members, 30 standing pings, 7 mutuals, 47 Instagram verifications, 2 purchases |
| Supabase | healthy, 27 migrations applied, **no error-level security advisories** |
| Vercel | production deploy ready, both domains attached |
| the wall's tables (`beta_*`) | applied, and **empty**. Nothing has ever written to them |
| the wall's client | `localStorage` only. No network call of any kind |
| cron | one job, `celestual-mutual-dm`, every 10 minutes, active |

---

## Four blockers, before a single card goes out

### 1. Anyone can be a Berkeley student

`/berkeley/gate` accepts **any six digits**. No mail is sent and no code is
checked. Anyone on earth can read every letter, write one, and report one down.
The screen says so out loud, which is honest and is not a fix.

You already own the fix: **`celestual-edu-verify` is deployed and works.** It
mails 6-digit codes to a school domain today (docs/EDU-VERIFICATION.md). It
needs a `berkeley.edu` caller and a session the wall can hold.

### 2. Nothing is screened before a letter is published

Layer 1 (the regex: slurs, phone numbers, addresses, room numbers, links) runs
in the browser. Layers 2 and 3 are an 1100ms timer. A check in the browser is a
courtesy to the writer, never a control on the writer: devtools removes it.

`supabase/functions/celestual-wall-moderate/` is written, reviewed, and **not
deployed**. Deploy it, set its two secrets, and call it before a letter goes
live rather than after.

### 3. The takedown proves nothing

`/berkeley/remove` empties a whole name **permanently**, and the Instagram
handoff in front of it is a 1500ms `setTimeout` that returns true for any handle
anybody types. Right now any visitor can erase any name and every letter under
it, and nobody can put it back.

This is the worst one on the list, because it is the one act on the surface that
is irreversible by design. `celestual-ig-webhook` is deployed and works (47
verifications through it), so the proof exists. It is simply not wired here.

### 4. There is no wall server at all

No edge function writes a letter, reads the wall, reports one or removes a name.
`celestual-wall-moderate` is a classifier and nothing else: it takes text and
returns a verdict. Everything else has to be built.

---

## The schema on disk is the wrong schema

`0032_the_wall.sql` is applied and describes an **older product**. It has
`author_handle`, `sealed_line`, `wall_claims` and `wall_reveal_requests`. The
wall that shipped has none of those: a letter is three fields (the handle it is
about, the body, the time), there is deliberately no author record anywhere, and
there is no seal and no reveal request. Replace it rather than extend it.

What a replacement needs, all deny-by-default with one edge function in front:

| table | holds |
| --- | --- |
| `letters` | target_handle, body, created_at, `status` (pending / live / held / removed), campus, source_code, moderation jsonb |
| `members` | hashed berkeley.edu address plus a session token. **Never stored beside a letter** |
| `reports` | letter_id, optional reason, created_at. Held, never deleted, so a desk can put a letter back |
| `removals` | handle, proven_at. Permanent |
| `scans` | source_code, created_at. Which flyer produced which scan |

**Keep one thing from 0027 exactly as it is:** the public view has no author
column at all. Not nulled, not filtered, absent. That is what makes a forgotten
`where` clause harmless instead of fatal.

---

## Next steps, in order

1. **Write and apply `0028_the_wall.sql`** with the five tables above. One
   migration, additive, and drop the `beta_*` tables in the same file since
   they are empty.
2. **Deploy `celestual-wall-moderate`.**
   `supabase functions deploy celestual-wall-moderate`
   Secrets: `MODERATION_API_KEY`, `MODERATION_MODEL` (defaults to
   `claude-sonnet-5`).
3. **Write one `celestual-wall` edge function**: write a letter, read the wall,
   report, remove, log a scan. Service role only. Every letter goes through
   step 2 before it is `live`.
4. **Point the gate at `celestual-edu-verify`** for `berkeley.edu`, and delete
   the "No mail yet" note on the screen the same day.
5. **Point the takedown at `celestual-ig-webhook`**, and delete the "Instagram
   is not connected yet" note the same day.
6. **Swap `src/wall/data.js` from memory to the function.** The module already
   has the right shape for it: `wall()`, `lettersFor()`, `letter()`,
   `search()`, `write()`, `report()`, `removeHandle()` are the whole surface.

---

## Keys and connections

| what | where it goes | status |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel env | already set (production is talking to Supabase) |
| `MODERATION_API_KEY`, `MODERATION_MODEL` | Supabase function secrets | **not set** |
| `VITE_BETA_MODERATE_URL` | Vercel env | **not set**. Rename it to `VITE_WALL_API_URL` when you build step 3 |
| `RESEND_API_KEY` and sender | Supabase function secrets | already working (edu-verify sends mail) |
| `VITE_EDU_VERIFY_ENABLED` | Vercel env | confirm it is `1`. I could not read Vercel env vars from here |
| `VITE_IG_VERIFY_ENABLED` | Vercel env | same, confirm it is `1` |

---

## Things I could not fix, and that need you

1. **`celestual-relogin` is not deployed.** The client calls it on the sign-in
   screen and on the "email me a link" recovery. When the call fails it falls
   back to the DM path, so nobody is locked out, but **"email me a sign-in
   link" has never worked once.** `celestual_recovery` and
   `celestual_relogin_tokens` are both empty, which is exactly what you would
   see if that function had never run. Deploy it or take the door off the
   screen.

2. **`celestual-remind` is not deployed and has no cron.** That function is the
   lapse warning, the sixty-day broom and the campus mail. **Your first pings
   lapse on 28 September 2026, and 20 of them lapse within the following two
   weeks.** With nothing running, nobody is warned and nothing is purged, and
   "unresolved longing self-destructs" quietly stops being true. Deploy it and
   add an hourly cron beside the `celestual-mutual-dm` one that already exists.

3. **`require_ig_verification` is `false` in `celestual_settings`.** The server
   does not require a DM proof to place a ping, whatever the client is doing.
   That is a deliberate switch, so I left it alone, but it is worth a decision
   rather than a default.

4. **The scan codes are collected and thrown away.** `/berkeley?s=flyer-a` is
   read, attached to the session and never sent anywhere, so you cannot tell
   which flyer worked. This is the cheapest question in the campaign and the
   only one you cannot answer retroactively. It is one insert, and it is worth
   doing before the cards are printed, not after.

5. **`/berkeley/orbit` is a drawn stand-in for the core service** and is still
   reachable by typing the URL. Nothing links to it any more: `register` now
   leaves the wall and lands on the product. Delete it or wire it in the next
   pass.

6. **Verify the two Vercel flags above.** I could not read Vercel environment
   variables from this session.

---

## Already fine, so do not redo it

- The Supabase project is healthy and has **no error-level security advisories**.
  The three `beta_*` "RLS enabled, no policy" notices are the intended posture:
  deny everything, let one edge function through.
- Handle targets are stored as salted hashes. A full dump cannot read who pinged
  whom.
- `celestual-mutual-dm` is running on its 10-minute cron.
- The wall's own privacy shape is right and needs no work: a letter has three
  fields, there is no author column to leak, and the member address is never
  read by the composer.
- `vercel.json` already rewrites every path to `index.html`, so `/berkeley` and
  its sheets need no routing change. The CSP already allows the four faces the
  wall injects.
- Old cards printed with `/beta` keep working: `main.jsx` rewrites the prefix
  onto `/berkeley` before anything mounts.

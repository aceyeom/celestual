# `/berkeley`: what is live, and what you still have to do

Re-audited **30 August 2026** against the running systems, not against this
repository: Supabase project `celestual` (`vwbsjwaqnycyghvwlxhd`, ACTIVE_HEALTHY)
and Vercel project `celestual` (`prj_AprSGA0skjRuvLhAcFFWnLNY2kbr`, celestual.us
and www.celestual.us, production deploy READY).

> **Reading this on a machine that is not this one?** Every number below was
> read live and the product is taking real traffic while you read it — the
> member count moved by one *during* this audit. Treat the counts as "roughly
> this, on 30 August"; treat the **states** (deployed / not deployed, wired /
> not wired, applied / not applied) as the load-bearing part. Those do not
> drift on their own.

## The one-line answer

**The core product at `/` is operational and has real users. The wall at
`/berkeley` is not connected to anything.** It renders, it is complete, and
every letter, membership and takedown on it lives in the visitor's own browser.
Nothing it does reaches a server.

## What I verified

| | state |
| --- | --- |
| core product (`/`) | **live.** 35 members, 30 pings placed (14 matched into 7 mutuals, 16 still standing), 48 Instagram verifications, 2 purchases, 40 placements |
| Supabase | healthy. **Zero error-level security advisories** (52 warnings, 32 notices — see the last section) |
| Vercel | production deploy READY, both apex and `www` attached |
| the wall's tables (`beta_*`) | **all five applied, all five empty.** Nothing has ever written to them |
| the wall's client | `localStorage` only. No network call of any kind |
| cron | exactly one job: `celestual-mutual-dm`, `*/10 * * * *`, active |
| edge functions | **9 deployed, 4 in this repo undeployed** — inventory below |

### The edge function inventory

This is the one table worth reading twice, because three of the four gaps are
things the client already calls.

| function | in repo | deployed | notes |
| --- | --- | --- | --- |
| `celestual-ig-webhook` | ✅ | ✅ v12 | 48 verifications through it, latest **13:28 today** |
| `celestual-edu-verify` | ✅ | ✅ v13 | see below — it has already verified a `berkeley.edu` address |
| `celestual-manychat` | ✅ | ✅ v14 | |
| `celestual-mutual-dm` | ✅ | ✅ v1 | the only thing on a cron |
| `celestual-notify` | ✅ | ✅ v1 | |
| `celestual-trial` | ✅ | ✅ v6 | |
| `celestual-admin` | ✅ | ✅ v6 | |
| `celestual-stripe` | ✅ | ✅ v5 | |
| `celestual-stripe-webhook` | ✅ | ✅ v6 | |
| `celestual-beta-moderate` | ✅ | ❌ | blocker 2 |
| `celestual-relogin` | ✅ | ❌ | "email me a sign-in link" has never worked |
| `celestual-remind` | ✅ | ❌ | no cron either — the lapse clock is unattended |
| `celestual-search` | ✅ | ❌ | called at `app/src/api/celestual.js:311`, gated behind `VITE_HANDLE_SEARCH`, fails soft to `[]`. Lowest-stakes of the four |

---

## Where migration 0028 is

**It does not exist.** `supabase/migrations/` ends at `0027_beta_wall.sql`.
Nothing named `0028_the_wall.sql` has been written, committed or applied — it is
step 1 of the plan below, not a thing you can go read. If you came here looking
for it, you were looking for a to-do.

### …and a hazard to know about before you write it

The Supabase migration ledger (`supabase_migrations.schema_migrations`) contains
**four rows**, not twenty-seven:

```
20260704035758  ping_model
20260704040149  lock_internal_helpers
20260717010302  verification_hardening
20260719082701  adopt_sender_and_email_login
```

The objects that `0001`–`0027` describe *are all present in the database* — I
confirmed the `beta_*` tables, the `celestual_*` tables and the `beta_letters_public`
view directly. But the CLI has no record of applying them, because they were
applied outside it.

**So `supabase db push` will try to replay `0001` onward and is not safe to run
blind.** Two ways through, pick one before step 1:

- **Repair the ledger first** — `supabase migration repair --status applied <version>`
  for each of `0001`…`0027`, then `db push` normally from `0028` on. This is
  the right fix if you intend to use the CLI from here.
- **Or keep applying by hand** — write `0028` as a file for the record, and
  apply it through the SQL editor or `apply_migration` the way `0001`–`0027`
  went in. Cheaper today, same problem tomorrow.

Either is fine. Doing neither and running `db push` is not.

---

## Four blockers, before a single card goes out

### 1. Anyone can be a Berkeley student

`/berkeley/gate` accepts **any six digits**. No mail is sent and no code is
checked — `app/src/wall/screens/Gate.jsx:210` says so on the screen, which is
honest and is not a fix. Anyone on earth can read every letter, write one, and
report one down.

You already own the fix, and it is further along than "deployed": **`celestual-edu-verify`
has already verified a real `berkeley.edu` address**, campus slug `uc-berkeley`,
status `verified`, at 05:47 **this morning**. The mail path, the code check and
the Berkeley domain are all proven live. What is missing is only that the
*wall's* gate does not call it and has no session to hold.

### 2. Nothing is screened before a letter is published

Layer 1 (the regex: slurs, phone numbers, addresses, room numbers, links) runs
in the browser. Layers 2 and 3 are an 1100ms timer (`moderate.js` `SCREEN_MS`).
A check in the browser is a courtesy to the writer, never a control on the
writer: devtools removes it.

`supabase/functions/celestual-beta-moderate/` is written, reviewed, and **not
deployed**. Deploy it, set its two secrets, and call it before a letter goes
live rather than after.

### 3. The takedown proves nothing

`/berkeley/remove` empties a whole name **permanently**, and the Instagram
handoff in front of it is a 1500ms `setTimeout` (`auth.js` `HANDOFF_MS`) that
resolves `true` for any handle anybody types. Right now any visitor can erase
any name and every letter under it, and nobody can put it back.

This is the worst one on the list, because it is the one act on the surface that
is irreversible by design. `celestual-ig-webhook` is deployed and busy — 48
verifications, most recent minutes ago — so the proof exists. It is simply not
wired here.

### 4. There is no wall server at all

No edge function writes a letter, reads the wall, reports one or removes a name.
`celestual-beta-moderate` is a classifier and nothing else: it takes text and
returns a verdict. Everything else has to be built.

---

## The schema on disk is the wrong schema — but less wrong than it looks

`0027_beta_wall.sql` is applied and describes an **older product**. Correcting
the earlier version of this document: it declares **five** tables, not three.

| table in 0027 | rows | verdict |
| --- | --- | --- |
| `beta_letters` | 0 | wrong shape — has `author_handle` and `sealed_line`, which the shipped wall has no concept of |
| `beta_claims` | 0 | drop. The shipped wall has no claim step |
| `beta_reveal_requests` | 0 | drop. There is no seal, so there is nothing to request |
| `beta_waitlist` | 0 | decide. Nothing on the wall writes to it today |
| `beta_scans` | 0 | **keep — it is already exactly right.** See below |

The wall that shipped has no author record anywhere, no seal and no reveal
request: a letter is three fields (the handle it is about, the body, the time).

What a replacement needs, all deny-by-default with one edge function in front:

| table | holds |
| --- | --- |
| `letters` | target_handle, body, created_at, `status` (pending / live / held / removed), campus, source_code, moderation jsonb |
| `members` | hashed berkeley.edu address plus a session token. **Never stored beside a letter** |
| `reports` | letter_id, optional reason, created_at. Held, never deleted, so a desk can put a letter back |
| `removals` | handle, proven_at. Permanent |
| `scans` | **already exists as `beta_scans`. Do not rewrite it — see the next section** |

**Keep one thing from 0027 exactly as it is:** `beta_letters_public` has no author
column at all. Not nulled, not filtered, absent, and the view is
`security_invoker`. That is what makes a forgotten `where` clause harmless
instead of fatal. Carry that property into whatever replaces it.

### The scan codes are cheaper to fix than this document previously said

`beta_scans` is applied, empty, and already carries an **anon insert grant and
policy**:

```sql
create policy beta_scans_insert on beta_scans
  for insert to anon, authenticated with check (true);
grant insert on beta_scans to anon, authenticated;
```

So logging which flyer produced which scan needs **no migration and no edge
function** — it is one insert from the browser against a table that is already
there and already permitted. It is the only question in the campaign you cannot
answer retroactively, and it is worth doing before the cards are printed.

The one thing it is not is free of consequence: the wall currently makes **zero**
network calls, and this would be its first. That is a deliberate property worth
spending on purpose rather than by accident, which is why I have flagged it here
rather than wiring it myself.

---

## Next steps, in order

1. **Settle the migration ledger** (see the hazard above). Five minutes, and it
   decides how every step below gets applied.
2. **Write and apply `0028_the_wall.sql`** with the tables above. One migration,
   and drop `beta_letters`, `beta_claims` and `beta_reveal_requests` in the same
   file since they are empty. **Leave `beta_scans` alone.**
3. **Deploy `celestual-beta-moderate`.**
   `supabase functions deploy celestual-beta-moderate`
   Secrets: `MODERATION_API_KEY`, `MODERATION_MODEL` (the function defaults to
   `claude-sonnet-5` at `index.ts:124` if the secret is unset). Deploying it
   *without* `MODERATION_API_KEY` set gets you a deployed function that fails on
   every call — set the secret first.
4. **Write one `celestual-wall` edge function**: write a letter, read the wall,
   report, remove, log a scan. Service role only. Every letter goes through
   step 3 before it is `live`.
5. **Point the gate at `celestual-edu-verify`** for `berkeley.edu`, and delete
   the "No mail yet" note at `Gate.jsx:210` the same day.
6. **Point the takedown at `celestual-ig-webhook`**, and delete the "Instagram
   is not connected yet" note the same day.
7. **Swap `src/wall/data.js` from memory to the function.** The module already
   has the right shape for it: `wall()`, `lettersFor()`, `letter()`, `search()`,
   `write()`, `report()`, `removeHandle()` are the whole surface.

---

## Keys and connections

| what | where it goes | status |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel env | already set (production is talking to Supabase) |
| `VITE_IG_VERIFY_ENABLED` | Vercel env | **confirmed `1`.** 48 verifications, most recent 13:28 today through the client path |
| `VITE_EDU_VERIFY_ENABLED` | Vercel env | **confirmed `1`.** A `berkeley.edu` address verified at 05:47 today through the client path |
| `RESEND_API_KEY` and sender | Supabase function secrets | already working (edu-verify sends mail) |
| `MODERATION_API_KEY`, `MODERATION_MODEL` | Supabase function secrets | **not set** |
| `CELESTUAL_FROM_EMAIL` | Supabase function secrets | needed by `celestual-remind`; falls back to `onboarding@resend.dev`, which you do not want on real mail |
| `VITE_BETA_MODERATE_URL` | Vercel env | **not set**. Rename it to `VITE_WALL_API_URL` when you build step 4 |
| `VITE_HANDLE_SEARCH` | Vercel env | only matters once `celestual-search` is deployed. Leave off until then |

Both flags that the previous version of this document could not confirm are now
confirmed — not by reading Vercel's env panel (still not readable from here) but
by the rows those code paths wrote today. A row in `celestual_ig_verifications`
timestamped this afternoon cannot exist unless the flag gating that call is on.

---

## Things I could not fix, and that need you

1. **`celestual-relogin` is not deployed.** The client calls it on the sign-in
   screen and on the "email me a link" recovery (`app/src/api/relogin.js`, three
   call sites). When the call fails it falls back to the DM path, so nobody is
   locked out, but **"email me a sign-in link" has never worked once.**
   `celestual_recovery` and `celestual_relogin_tokens` are both empty, which is
   exactly what you would see if that function had never run. Deploy it or take
   the door off the screen.

2. **`celestual-remind` is not deployed and has no cron.** That function is the
   lapse warning, the sixty-day broom and the campus mail. The dates, read off
   `celestual_entries` today:

   - first lapse **28 September 2026** (2 pings)
   - **20 pings lapse in the two weeks that follow** (through 12 October)
   - **all 30 have lapsed by 29 October 2026**
   - nothing has lapsed yet, so nothing has been missed — *yet*

   With nothing running, nobody is warned and nothing is purged, and "unresolved
   longing self-destructs" quietly stops being true. Deploy it, set
   `CELESTUAL_FROM_EMAIL`, and add an hourly cron beside the `celestual-mutual-dm`
   one that already exists. **You have about four weeks.**

3. **`celestual-search` is not deployed** and `app/src/api/celestual.js:311`
   calls it. It is gated behind `VITE_HANDLE_SEARCH` and returns `[]` on any
   failure, so nothing is broken today — but it is a dead call site, and the
   flag is a foot-gun for whoever flips it later without checking. Deploy it or
   delete the adapter.

4. **`require_ig_verification` is `false` in `celestual_settings`.** The server
   does not require a DM proof to place a ping, whatever the client is doing.
   That is a deliberate switch, so I left it alone, but it is worth a decision
   rather than a default.

5. **The scan codes are collected and thrown away.** `/berkeley?s=flyer-a` is
   read, attached to the session and never sent anywhere. As established above,
   the table and the grant already exist — this is one insert, and the only
   reason I did not write it is that it would be the wall's first network call
   and that is your decision to make, not mine.

6. **`/berkeley/orbit` is a drawn stand-in for the core service** and is still
   reachable by typing the URL (`router.js:51` → `screens/Core.jsx`). Nothing
   links to it any more: `register` now leaves the wall and lands on the
   product, and `Join.jsx:312` says so. Delete it or wire it in the next pass.

---

## Already fine, so do not redo it

- **Zero error-level security advisories.** The full breakdown, so nobody
  re-derives it: **0 ERROR, 52 WARN, 32 INFO.**
  - The 32 INFO are all `rls_enabled_no_policy` — and that is **every table in
    the schema**, not just the three `beta_*` ones an earlier version of this
    document named. RLS on with no policy means anon and authenticated can do
    nothing at all, and one edge function with the service role goes through.
    That is the intended posture across the board. Leave it.
  - The 52 WARN are **not** nothing, and are the one thing in this section that
    is worth a pass someday: 25 `anon_security_definer_function_executable` +
    25 `authenticated_security_definer_function_executable` (definer functions
    a browser can call directly), plus one `function_search_path_mutable` and
    one `extension_in_public` (`pg_net`). None of them block the launch. None
    of them are "already fine" either — they are "not today".
- Handle targets are stored as salted hashes (`handle_salt` in
  `celestual_settings`). A full dump cannot read who pinged whom.
- `celestual-mutual-dm` is running on its 10-minute cron, and it is the **only**
  cron job on the project.
- The wall's own privacy shape is right and needs no work: a letter has three
  fields, there is no author column to leak, and the member address is never
  read by the composer.
- `vercel.json` already rewrites every path to `index.html`, so `/berkeley` and
  its sheets need no routing change. The deployed CSP allows the four faces the
  wall injects — Bodoni Moda, EB Garamond, Geist Mono, Inter Tight — via
  `style-src … fonts.googleapis.com` and `font-src fonts.gstatic.com`. I read
  that header off the live response, not off the file.
- Old cards printed with `/beta` keep working: `main.jsx` rewrites the prefix
  onto `/berkeley` before anything mounts.

---

## What changed in this revision, and how it was checked

Every claim above came from the live systems: `list_migrations`,
`list_edge_functions`, `list_tables`, `get_advisors` and direct SQL against
Supabase; `get_project` and a fetch of the production deployment against Vercel;
and `grep` against this working tree. Corrections to the previous version:

- **Migration `0028` does not exist** — stated plainly, with the ledger hazard
  that makes step 1 non-trivial. This was the question that prompted the re-audit.
- **`0027` declares five tables, not three.** `beta_waitlist` and `beta_scans`
  were missing from the previous account.
- **`beta_scans` already exists with an anon insert policy**, so the scan-code
  fix needs no migration and no edge function. The previous version routed it
  through both.
- **`celestual-search` was missing** from the not-deployed list; `celestual-notify`
  was missing from the deployed list. Both are now in a complete inventory.
- **Both Vercel flags are resolved**, from rows written through those code paths
  today. The previous version listed them as unverifiable, and that item is gone.
- **The advisory counts are stated in full** (0/52/32), and the "three `beta_*`
  notices" claim is corrected to 32 across every table. The 52 warnings were
  previously unmentioned inside a section that said not to redo the security work.
- **Counts refreshed**: 35 members (was 34), 48 IG verifications (was 47).
  Both moved *during* this audit, hence the note at the top.
- **The lapse arithmetic held up exactly** — first lapse 28 September, 20 within
  the following two weeks — and now carries the full curve out to 29 October.
- **One code fix applied**: `app/src/wall/moderate.js` described layer 2 as "one
  Haiku call", but the Edge Function defaults to `claude-sonnet-5`. The comment
  now names the secret instead of guessing a model.

# THE HANDLE RESOLVER — showing the account behind the @

How a typed handle becomes a face and a name before anybody presses send, and
the exact steps to turn it from off (the default) into the real, provider-backed
thing in production.

---

## 1 · The problem it exists for

Every act in celestual starts with somebody typing an Instagram handle **from
memory**. And the product's own guarantees mean a typo is silent, permanent and
un-diagnosable:

- A ping placed at `@sarahmiIler` (capital i, not an l) stands for sixty days
  against an account that does not exist.
- Nothing can ever tell the person who placed it, because telling them would
  mean telling them something about who is and is not on the service, which is
  the one thing the double-blind model must never do.
- They read the silence as an answer. They think they weren't picked back.

The two-tap confirm was the only guard against that, and all it ever did was
confirm the spelling **against itself**. This makes the second tap confirm
against a person: a display name, a picture, and the badge if the account has
one.

## 2 · The rules it is held to

These are not implementation notes. They are the reason the feature is allowed
to exist at all, and anything that breaks one of them is a bug.

**It never blocks.** Not found is not a refusal. Our providers are imperfect,
Instagram refuses datacenter traffic often enough to matter, and somebody who
knows their friend's handle is right is right. A handle we cannot find still
places. The app says so once, in one line, and the button still works.

**It never browses.** There is no search, no suggestion list, no partial match.
It answers about a handle already typed **in full**, which is the difference
between confirming a name and shopping for one. (The separate opt-in typeahead
in `celestual-search` / `VITE_HANDLE_SEARCH` is a different feature with a
different flag, and this one does not touch it.)

**It shows no numbers.** A name, a face, the verified badge, and whether the
account is private. No followers, no posts, no bio, no link. This product does
not tell anybody how popular anybody is, and a resolver that grew a stats line
would have turned the send screen into the profile page the whole product exists
to avoid.

**It never says "no" when it means "I don't know."** Off, offline, past the cap,
provider down — all of those are `unknown`, and `unknown` draws **nothing**.
Reporting our own failure as "no such account" would be the product lying about
somebody's account.

**No key ever reaches the browser.** The client posts a handle and gets back a
name. It never learns which provider answered, never holds a key, and never
talks to Instagram.

## 3 · The shape of it

```
  a field where an @ is typed
        │
        │  POST { handle, device }
        ▼
  celestual-resolve  ──►  celestual_handle_cache   (24h hits · 1h misses)
   (edge function)   ──►  celestual_handle_lookups (the caps' ledger)
        │
        ├─ 1 · Instagram public web profile   (free, no key, refuses us often)
        └─ 2 · HikerAPI  x-access-key         (the paid fallback for the rest)
        │
        │  { found, display_name, is_verified, is_private, avatar }
        ▼
  the readout under the line
        │
        │  <img src=".../celestual-resolve?avatar=handle">
        ▼
  the same function, proxying the LIVE CDN url. No image is ever stored.
```

### Why the picture is proxied and not stored

Instagram's profile-picture URLs are **signed and expire within hours**. So:

- A stored URL is a broken image by tomorrow.
- A stored *file* is us hosting a stranger's face on our own disk, with
  everything that implies about consent, takedowns and storage cost.
- An `<img>` pointed straight at the CDN puts every viewer's IP in front of Meta
  on behalf of a handle somebody typed.

The cache holds the **URL**. The browser gets `?avatar=<handle>` on our own
function, which fetches the live URL at request time, streams the bytes through
and keeps none. If the signed URL has expired the proxy re-resolves once and
retries.

### The caps

| Net | Limit | Why that number |
| --- | --- | --- |
| Per device | **30 distinct handles / rolling day** | A person placing a ping looks up one or two accounts. Thirty is far past normal use and far short of a scrape. Cache hits are **free** and do not count. |
| Per IP | **300 / hour**, **1500 / day** | Deliberately lenient. One Berkeley address is a residence hall behind one NAT, and a cap tight enough to stop a script there would lock out a floor because one person typed a lot. |

`device` is a random opaque id the browser mints for itself and keeps in
`localStorage`. **It is not identity**: not derived from anything about the
person, never sent anywhere but the resolver, never joined to a handle, an
account or a ping, and gone the moment somebody clears their storage. It exists
so "thirty a day" is a number that means something. The IP net is what actually
holds when somebody resets it, which is why the IP window counts the avatar
endpoint too.

## 4 · Turning it on

**1. Apply the migration.**

```bash
supabase db push          # includes migrations/0028_handle_resolver.sql
```

Two new tables, `celestual_handle_cache` and `celestual_handle_lookups`. RLS on,
**no policy and no grant** on either, so `anon` can do nothing at all with them:
the only reader is the edge function's service role. Neither table is a
directory and neither can be enumerated.

**2. Set the secrets** (Supabase → Edge Functions → Secrets):

| Secret | Required | What it is |
| --- | --- | --- |
| `HIKER_API_KEY` | recommended | HikerAPI access key. Sent as the `x-access-key` header. Without it the resolver runs on provider 1 alone and will answer `unknown` whenever Instagram refuses us. |
| `HIKER_API_BASE` | no | Defaults to `https://api.hikerapi.com`. |
| `IG_PUBLIC_LOOKUP` | no | Set to `0` to skip provider 1 entirely and go straight to HikerAPI. Use this if the free endpoint starts costing more in latency than it saves in calls. |

**3. Deploy the function.**

```bash
supabase functions deploy celestual-resolve --no-verify-jwt
```

JWT verification must stay off: the avatar half is fetched by an `<img>` tag,
which cannot carry an `apikey` header at all. The function enforces its own caps
instead, and only ever answers about a handle somebody already typed in full.

**4. Turn on the flag** (Vercel → Project → Settings → Environment Variables):

```
VITE_HANDLE_RESOLVE=1
```

**5. Check the CSP.** `vercel.json` already allows the proxied picture:

```
img-src 'self' data: blob: https://*.supabase.co
```

If you serve the functions from a custom domain, add it there or the avatars
will silently not render (the readout falls back to a drawn initial, so the page
will look fine and you will not get an error).

## 5 · What it touches

Every field in the product where an @ is typed, and nothing else:

| Where | Field | What the readout adds |
| --- | --- | --- |
| Send (screen 2) | their handle | the account, plus the second tap's copy changes when we found nobody |
| Identity | your own handle | a typo in your OWN @ sends the ownership code to a stranger and files your pings under a name that is not yours |
| Account sheet | your handle, and the other @s you own | the same line |
| Privacy | the opt-out field | the one field where a typo shuts **somebody else** out, permanently |
| `/trial` | the competitor's handle | the @ the entry is judged under |
| `/beta` (the wall) | the letter's recipient | a letter to a mistyped handle is a letter nobody can ever find |

The wall is otherwise a build that reaches no server, so be exact about what
this adds there: **the handle being typed goes out, and nothing else.** Not the
writer's address, not their session, not the letter or a word of it. The wall
has no author field for any of that to come from.

## 6 · With it off

`VITE_HANDLE_RESOLVE` unset or `0`, or no Supabase configured, and:

- `resolveHandle()` answers `unknown` without a request.
- Every readout renders `null`.
- Every screen is byte-for-byte what it was before this existed.

That is the default, and it is what preview builds and local dev run on.

## 7 · Operating it

**The bill.** Provider 2 is metered. What keeps it small is the cache: a hit is
good for 24 hours and a miss for one. The miss TTL is short on purpose, because
"there is no account by that name" is exactly the kind of fact that changes.

**A rise in `unknown`.** Almost always Instagram refusing provider 1 while
`HIKER_API_KEY` is unset or exhausted. Set the key, or set `IG_PUBLIC_LOOKUP=0`
and run on the paid provider alone.

**Avatars not rendering, everything else fine.** CSP. See step 5.

**Clearing the cache** (after a provider change, say):

```sql
delete from celestual_handle_cache;
```

Safe at any time. Nothing depends on a row being there; the next lookup refills
it.

**The ledger** sweeps itself: rows older than a day are deleted opportunistically
on a small fraction of requests, and cache rows older than a week go with them.
There is no cron to schedule.

---

**Related:** [SECURITY.md](./SECURITY.md) ·
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) ·
[DESIGN.md](./DESIGN.md)

# THE HANDLE RESOLVER: showing the account behind the @

How a typed handle becomes a face and a name before anybody presses send, and
the exact steps to turn it from off (the default) into the real, provider-backed
thing in production.

Rewritten in Phase 5 of the rebuild. The provider is Apify, the face is ours,
and the cache is permanent. See `docs/rebuild-spec.md` section 5.

---

## 1. The problem it exists for

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

## 2. The rules it is held to

These are not implementation notes. They are the reason the feature is allowed
to exist at all, and anything that breaks one of them is a bug.

**It never blocks.** Not found is not a refusal. Our provider is imperfect, and
somebody who knows their friend's handle is right is right. A handle we cannot
find still places. The app says so once, in one line, and the button still works.

**It never browses.** There is no search, no suggestion list, no partial match.
It answers about a handle already typed **in full**, which is the difference
between confirming a name and shopping for one.

**It asks on commit.** Nothing that fires on a pause in the typing may reach
Apify. While a person types, the field only peeks the cache, which is free and
instant for any handle anybody has committed before. The lookup that costs
happens when they press: Enter, the button, or the card. That press draws the
card in its looking state, with a line under it saying so (and, after a few
seconds, that a first look takes a while), and the button goes quiet until the
answer lands. The answer is one of three cards: the person, "no account by that
name", or "could not check that one right now", and the button changes its
word to match: *yes, that's them*, *use it anyway*, *go on anyway*. The next
press, on the card or the button, is the act, and it is against what the card
says. Nothing moves on without that second press; a lookup that could not
answer used to let the same press through, which read as the flow skipping the
person. Two taps, and the second one is against a person. Faces drawn
elsewhere in the product (`useProfile`) peek too, and a handle that was never
committed draws its monogram.

So, to the question of when Apify is called: once per handle, on the person's
own press, and never again for that handle from any browser, because the
answer is cached for good. Typing costs nothing, backspacing costs nothing, a
handle anybody has looked up before costs nothing, and the day has a ceiling
the desk can lower. The desk can also switch the resolver off outright
(`resolver_enabled`, migration 0039), which stops the bill at once and leaves
cache hits answering.

**It shows no numbers.** A display name, a badge, a face. No followers, no post
count, no engagement. This product does not tell anybody how popular anybody is.

**It proves nothing.** Spec section 4 is explicit and it is the rule most likely
to be broken by accident. Resolving a handle looks up a public profile so the UI
can draw a card. It says nothing whatever about who is holding the browser.
Nothing on this path may set `handle_verified_at`, and nothing does: the only
writer of that column is `celestual_user_bind_handle`, and it will not write it
without a live proof from the Instagram DM code flow.

**It is not a directory.** There is no read grant on `ig_profiles` for `anon`,
no RPC that returns rows from it, and no way to enumerate it. The only reader is
the edge function's service role, answering about a handle somebody already
typed in full.

## 3. The shape

```
  browser
    │  POST /api/resolve   { handle, session? }        credentials: include
    ▼
  api/resolve.js, a Vercel function ────────────────────────────────┐
    │  same origin, so the device cookie below is FIRST PARTY        │
    │  forwards the visitor's address + the shared secret            │
    ▼                                                               │
  supabase/functions/celestual-resolve                              │
    │                                                               │
    ├─ ig_profile_get(handle)        the cache. permanent.          │
    │    hit  ──▶ answer. costs nothing. a missing face is a hit.   │
    │                                                               │
    ├─ handle_search_allow(user, device, ip)   four 24h windows     │
    │    over  ──▶ 429 { retry_after }                              │
    │                                                               │
    ├─ Apify actor shu8hvrXbJbY3Eb9W                                │
    │    resultsType: details, resultsLimit: 0                      │
    │    ?timeout=30&maxItems=1   killed on Apify's side, 1 result  │
    │                                                               │
    ├─ handle_search_record(user, device, ip, handle)  found or not │
    │                                                               │
    ├─ download the picture once, upload to Storage                 │
    │    bucket `avatars`, path `ig/<handle>.jpg`                   │
    │                                                               │
    └─ ig_profile_put(...)                                          │
                                                                    │
  browser ◀── { handle, display_name, is_verified, avatar,          │
                cached, provider } ─────────────────────────────────┘
              avatar is a Supabase Storage URL. It does not expire.
              provider says whether Apify was reached. cached says
              where the answer came from. They differ on one path.
```

## 4. The face

This is the part that changed most, and the reason is worth keeping.

Instagram's CDN URLs are **signed and expire within days**. A cache that stored
one would be a cache full of 403s by the weekend. The previous version of this
feature dealt with that by proxying the image live through the edge function on
every single view and keeping no bytes, which worked but meant every card draw
was a request to Instagram on somebody's behalf.

Now the bytes are pulled **once**:

1. On a cache miss, the actor returns a profile picture URL.
2. The edge function downloads it, checks it is an image and under 3 MB.
3. It uploads it to the public `avatars` bucket at `ig/<handle>.jpg`.
4. The stored row keeps the **path**, never a URL.
5. The browser is handed our own Supabase public URL and fetches it directly.

**No Instagram URL ever reaches a browser.** No viewer's IP is ever handed to
Meta on behalf of somebody they typed.

A picture refreshes only when it is more than **30 days** old and that handle is
resolved again. If the download fails, nothing is stored, the client gets an
empty `avatar`, and the card draws a monogram from the display name. **A missing
face never blocks a card.**

**And a missing face never empties the cache.** This was the leak the 4
September audit found. Under 0031 a row whose picture never downloaded was
reported stale from the moment it was written, the function treats stale as a
miss, and so every lookup of that handle ran the actor again, forever: 30 of
the 50 rows in production were in that state and `supabase` had been billed
eight times. Migration 0037 separates the two questions. A row with no face is
a fresh profile and a cache hit; the face is retried on the next lookup after
**7 days**, at most. A row with a face refreshes it at 30 days, as before. The
function also no longer caches an actor item that has neither a name nor a
picture URL, which is what the actor returns when Instagram turned it away
mid-run and is how those nameless rows got written in the first place.

## 5. The caps

Server side, in the database, never on the client. Three rolling 24 hour
windows, `handle_search_allow` in migration 0031:

| Key | Limit | Why |
| --- | --- | --- |
| `user_id` | 20 | signed in. Counted here and **not** on the device, so signing in never halves an allowance |
| `device_id` | 20 | anonymous, which is the majority case |
| `ip` | 200 | the backstop. Deliberately loose: one Berkeley address is a residence hall behind one NAT |
| `global` | 1000 | the ceiling on the day, counted on every call whoever made it. Migration 0037 |

**A cache hit costs nothing.** `handle_search_events` only ever receives a row
when a call reached Apify, so re-asking about a handle already in the cache is
free, and the bill is bounded by the number of distinct handles rather than by
traffic.

**A miss is counted.** It ran the actor. It used to be free here, which made it
unlimited: a stream of handles nobody has would run the actor once each and
never touch a cap. A miss is also remembered in the isolate for ten minutes so
the same missing handle is not asked for twice, and only a true miss is
remembered: a timeout or a refusal from Apify says nothing about the account and
is answered as `{ ok:false, error:'provider' }`, which the card draws as
nothing. Before that distinction, a run that blew the timeout read to a person
as "no account by that name". The pilot's `vercel` did exactly that.

**The day has a ceiling.** The three per-key caps keep one actor honest; none of
them bounds the bill, because a device cap is beaten by not sending the cookie
and an address cap by having more than one address. `global` is written on
every call and is the most the meter can run in 24 hours. Past it, cache hits
still answer, new handles draw nothing, and the act still goes through. Since
0039 all four numbers are rows in `celestual_settings` (`cap_user`,
`cap_device`, `cap_ip`, `cap_global`), read by `handle_search_limit` with the
numbers above as defaults, and the desk's settings screen writes them; a
change takes on the next call. The same screen has the switch
(`resolver_enabled`): off, `handle_search_allow` answers `off`, the function
answers `{ ok:false, error:'off' }`, the card draws nothing and nothing is
spent.

**The first lookup is slow.** The pilot measured 6 to 21 seconds on a cache
miss and under a second on a hit: actor startup dominates, and nothing in the
function can shorten it. The card's looking state is drawn for that wait. The
run is given 30 seconds on Apify's side (`timeout=30` on the run) so a run we
stop waiting for is killed rather than left to finish and bill; `maxItems=1`
caps a run at one billed result whatever the actor decides to return.

**Nothing is asked while somebody types.** The ledger showed `dav`, `davi`,
`david`, `david_`, `david_j`, `david_jh` and `david_jhmun` each run through the
actor on the way to a single typed name, because a debounce fires on every
pause for breath and nearly every short prefix is somebody's real account. A
debounce, at any length, cannot tell a pause from an end. So the field peeks
the cache while typing (`peek: true`, free, never Apify) and asks only on the
person's own press. See section 2, "It asks on commit".

On a limit the function answers **429** with `retry_after`, the seconds until the
oldest counted call ages out. The UI shows a plain message built from that
number. It never shows a raw error.

Rows are pruned at 48 hours, twice the counting window, by
`handle_search_prune()`. Add it to the scheduled jobs; see
`docs/launchsteps.md` section 8.

## 6. The device id

A UUID **the edge function issues**, in an httpOnly, SameSite=Lax, Secure
cookie. Not a fingerprint: not derived from anything about the person, not
joined to a handle or an account or a ping, and reset by clearing cookies.

It is first party **only because `/api/resolve` is on our origin**. A cookie
set by `*.supabase.co` on a page served from `celestual.us` is a third party
cookie, and Safari's ITP and Chrome's phase-out both drop it. That is why the
browser calls `/api/resolve` and `api/resolve.js`, a Vercel function, forwards
the request to the edge function. Open question Q8, answered B.

If you deploy somewhere that is not behind it, the cookie goes third party,
most anonymous users get a fresh device id per request, and they fall through
to the IP counter. That degradation is designed for rather than assumed away,
but it is a real reduction in protection. Keep the function.

## 6b. The proxy, and whose address is counted

`/api/resolve` was a bare `vercel.json` rewrite until the 4 September audit,
and the rewrite had a cost the cookie did not show: **the edge function saw
Vercel's egress as the connecting address.** The ledger had one device's ten
handles counted across four AWS addresses and the visitor's own address in
none of them. So the 200 a day backstop was shared by every visitor on the
same Vercel edge, and a visitor with no cookie was capped on Vercel rather
than on themselves.

The function fixes that. Vercel writes `x-forwarded-for` itself and does not
let a client forge it, so the first hop is the visitor. `api/resolve.js`
forwards it, and proves it is the proxy with a shared secret in
`x-resolve-proxy`. The edge function counts the forwarded address **only when
the secret matches**; otherwise it counts the connecting address, exactly as
before. A request straight to `*.supabase.co` is therefore counted on the
address it came from and cannot name a different one, and a proxy without the
secret can only make the caps as loose as the rewrite already was, never
looser.

The secret is `RESOLVE_PROXY_SECRET`, set in **both** places: a Vercel
environment variable (all environments) and a Supabase edge function secret.
Any long random string. Until both are set, the backstop counts Vercel.

## 7. Turning it on

In order. Every step is also in `docs/launchsteps.md`.

1. **Apply the migrations.** `0030_identity.sql` then `0031_apify_resolver.sql`.
   0031 carries the profiles from the old cache across and drops the old counter
   table.
2. **Create the Storage bucket.** Named `avatars`, **public read**. Nothing else
   in the project has ever used Storage, so this is the first bucket.
3. **Set the secret.** `APIFY_TOKEN`, in Supabase, Edge Functions, Secrets.
   Optionally `APIFY_ACTOR_ID` if you ever move off `shu8hvrXbJbY3Eb9W`.
4. **Deploy the function.**
   `supabase functions deploy celestual-resolve --no-verify-jwt`
   The `--no-verify-jwt` matters: the proxy forwards a plain browser POST with
   no Supabase key on it.
5. **Set the proxy secret.** `RESOLVE_PROXY_SECRET`, the same value in Vercel
   (all environments) and in Supabase edge function secrets. Section 6b.
   `api/resolve.js` reads the project from `VITE_SUPABASE_URL`, which Vercel
   already has; if that is ever unset it falls back to the ref written in the
   file.
6. **Run the billing pilot.** Ten handles, then confirm the billed event count in
   Apify matches. See `docs/launchsteps.md` section 3b. Do this before opening it
   to users.
7. **Turn it on.** `VITE_HANDLE_RESOLVE=1` in Vercel, then redeploy.

## 8. Config

| Name | Where | Required | What |
| --- | --- | --- | --- |
| `APIFY_TOKEN` | Supabase secret | yes | Apify API token. Without it the function answers `{ ok:false, error:'off' }` and the UI renders nothing |
| `APIFY_ACTOR_ID` | Supabase secret | no | Defaults to `shu8hvrXbJbY3Eb9W` |
| `RESOLVE_PROXY_SECRET` | Supabase secret **and** Vercel env | yes | The same value in both. Proves a request came through `api/resolve.js`, so the visitor's address is the one counted. Without it the backstop counts Vercel's egress |
| `VITE_HANDLE_RESOLVE` | Vercel env | yes | `1` to render the card. `0` and nothing about the product changes |
| `VITE_RESOLVE_ENDPOINT` | Vercel env | no | Leave unset. Defaults to `/api/resolve`, which is the function. Only set it on a preview that is not behind it |

## 9. When it misbehaves

**Every handle reads as unknown.** `APIFY_TOKEN` is unset or the token is
rejected. The function logs `apify run failed` with the status. Check the token
and that it is scoped to the actor.

**Cards render with no face, but the name and badge are right.** The download or
the upload failed. Check the `avatars` bucket exists and is public read; the
function logs `avatar upload failed` with the reason. The card is *supposed* to
render anyway, so this is a degradation and not an outage.

**Faces 404 in the browser.** The bucket exists but is not public read, or the
CSP is blocking it. `img-src` must allow `https://*.supabase.co`, which
`vercel.json` already does.

**Everyone on campus gets rate limited at once.** Either the device cookie is
not arriving, so everybody is being counted on one shared address, or the
proxy secret is not set and the edge function is counting Vercel's egress.
Check that the request goes to `/api/resolve` and not straight to
`*.supabase.co`, that the client sends `credentials: 'include'`, and that
`RESOLVE_PROXY_SECRET` is set on both sides. The `ip` rows in
`handle_search_events` should be visitors' addresses, not AWS ranges.

**Nothing resolves and the ledger has 1000 `global` rows in the last day.** The
ceiling. Somebody ran the meter to the top; the `ip` and `device_id` rows say
who. Cache hits still answer. It clears on its own as the oldest calls age out.

**The bill is higher than the number of distinct handles.** Something is writing
to `handle_search_events` on a cache hit, or the cache is not being read. A row
in that table is supposed to be a call that reached Apify and nothing else.
Check `provider` on the response: it is `true` only when Apify was reached, and
it is the field the billing pilot counts. `cached: true` with `provider: true`
is a refresh that failed and served yesterday's row.

**A handle that exists reads as "no account by that name".** It should not any
more: a timeout or an Apify refusal answers `{ ok:false, error:'provider' }`
and the card draws nothing. If it still happens, the actor returned an item
with an `error` field and no `username` for a real account, which is a miss as
far as the function can tell. The logs carry the status and the first 300
bytes of the body for every failed run.

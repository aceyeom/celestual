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
  vercel.json rewrite ──────────────────────────────────────────────┐
    │  same origin, so the device cookie below is FIRST PARTY        │
    ▼                                                               │
  supabase/functions/celestual-resolve                              │
    │                                                               │
    ├─ ig_profile_get(handle)        the cache. permanent.          │
    │    hit, face under 30 days  ──▶ answer. costs nothing.        │
    │                                                               │
    ├─ handle_search_allow(user, device, ip)   three 24h windows    │
    │    over  ──▶ 429 { retry_after }                              │
    │                                                               │
    ├─ Apify actor shu8hvrXbJbY3Eb9W                                │
    │    resultsType: details, resultsLimit: 0                      │
    │                                                               │
    ├─ download the picture once, upload to Storage                 │
    │    bucket `avatars`, path `ig/<handle>.jpg`                   │
    │                                                               │
    ├─ ig_profile_put(...)                                          │
    └─ handle_search_record(user, device, ip, handle)               │
                                                                    │
  browser ◀── { handle, display_name, is_verified, avatar } ────────┘
              avatar is a Supabase Storage URL. It does not expire.
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

## 5. The caps

Server side, in the database, never on the client. Three rolling 24 hour
windows, `handle_search_allow` in migration 0031:

| Key | Limit | Why |
| --- | --- | --- |
| `user_id` | 20 | signed in. Counted here and **not** on the device, so signing in never halves an allowance |
| `device_id` | 20 | anonymous, which is the majority case |
| `ip` | 200 | the backstop. Deliberately loose: one Berkeley address is a residence hall behind one NAT |

**A cache hit costs nothing.** `handle_search_events` only ever receives a row
when a call actually reached Apify, so it cannot contain a free lookup. That is
what keeps the bill bounded by the number of distinct handles rather than by
traffic, and what lets the caps stay generous for normal use.

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

It is first party **only because of the rewrite**. A cookie set by
`*.supabase.co` on a page served from `celestual.us` is a third party cookie,
and Safari's ITP and Chrome's phase-out both drop it. That is why the browser
calls `/api/resolve` on our own origin and `vercel.json` rewrites it onto the
function. Open question Q8, answered B.

If you deploy somewhere that is not behind the rewrite, the cookie goes third
party, most anonymous users get a fresh device id per request, and they fall
through to the IP counter. That degradation is designed for rather than assumed
away, but it is a real reduction in protection. Keep the rewrite.

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
   The `--no-verify-jwt` matters: the rewrite forwards a plain browser POST with
   no Supabase key on it.
5. **Check the rewrite.** `vercel.json` must contain the `/api/resolve` rule and
   its destination must be the current project's function URL.
6. **Run the billing pilot.** Ten handles, then confirm the billed event count in
   Apify matches. See `docs/launchsteps.md` section 3b. Do this before opening it
   to users.
7. **Turn it on.** `VITE_HANDLE_RESOLVE=1` in Vercel, then redeploy.

## 8. Config

| Name | Where | Required | What |
| --- | --- | --- | --- |
| `APIFY_TOKEN` | Supabase secret | yes | Apify API token. Without it the function answers `{ ok:false, error:'off' }` and the UI renders nothing |
| `APIFY_ACTOR_ID` | Supabase secret | no | Defaults to `shu8hvrXbJbY3Eb9W` |
| `VITE_HANDLE_RESOLVE` | Vercel env | yes | `1` to render the card. `0` and nothing about the product changes |
| `VITE_RESOLVE_ENDPOINT` | Vercel env | no | Leave unset. Defaults to `/api/resolve`, which is the rewrite. Only set it on a preview that is not behind the rewrite |

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

**Everyone on campus gets rate limited at once.** The device cookie is not
arriving, so everybody is being counted on one shared address. Check that the
request goes to `/api/resolve` and not straight to `*.supabase.co`, and that the
client sends `credentials: 'include'`.

**The bill is higher than the number of distinct handles.** Something is writing
to `handle_search_events` on a cache hit, or the cache is not being read. A row
in that table is supposed to be a call that reached Apify and nothing else.

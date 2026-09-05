# CELESTUAL — front-end

The Vite + React SPA. No app server: every call goes straight to Supabase's
`SECURITY DEFINER` RPCs and a handful of edge functions (see
[../supabase/README.md](../supabase/README.md)). The visual rules live in
[../design/DESIGN.md](../design/DESIGN.md) and the copy rules in
[../design/VOICE.md](../design/VOICE.md).

The retired design (`App.jsx` and the seventeen thousand lines under it: the
card system, the galaxy, the sky renderer, the old screens, the i18n layer) was
deleted on 4 September. It served `/paid`, a Stripe return that was never
turned on, and nothing else. What follows is the tree as it is.

## Architecture

```
src/
├── main.jsx           the fork. Which surface owns this address is decided
│                      before anything mounts, so a route is never rendered
│                      twice in two designs. Every surface is a dynamic import,
│                      so the entry chunk is small
├── main/              MAIN, at `/`. The product: hero, place, sky, reveal,
│                      optout, copy, signin, the not found. router.js is the
│                      route table; data.js shapes the ping RPCs for the screens
├── wall/              THE WALL, at `/berkeley`. Its own shell, router, store,
│                      data cache, api module and ten screens. parts.jsx is the
│                      shared component set BOTH surfaces draw from, and
│                      wall.css is the one system (README.md in there says more)
├── admin/             THE DESK, at `/admin`. Password checked server side,
│                      eleven screens in four groups (today, people, the wall,
│                      the team), a growth graph, its own stylesheet
├── signature/         where the two signature surfaces were approved. Static
├── api/               every call to Supabase, one module per concern:
│   ├── supabase.js    the client, and the no-backend fallback flag
│   ├── identity.js    one session token across both surfaces (0030)
│   ├── celestual.js   the ping RPCs (submit, my_pings, renew, withdraw, opt out)
│   ├── igverify.js    the Instagram DM proof: mint, poll, the pending record
│   ├── auth.js        the device's copy of a proven handle and its proof
│   ├── eduverify.js   the campus code, through celestual-edu-verify
│   ├── handles.js     the handle resolver's client half, through /api/resolve
│   ├── relogin.js     the sign in link (redeem only; nothing mints one yet)
│   └── admin.js       the desk's calls, every one carrying the password
└── styles.css         the reset, the ground, the cursor and the motion law
```

Anything referenced by string is live even when it looks dead: route names,
RPC names, edge function names and storage bucket names do not appear in an
import graph.

## The flow

`/` (the hero: their handle) → `/place/<handle>` (the line, then which @ is
yours, proved by one Instagram DM) → "It's out." → `/sky` (what you have out).
A mutual appears on the sky first and opens onto `/reveal/<handle>`.

Side doors: `/@handle` is `/place/<handle>` with the name already in it;
`/berkeley/join` on the wall lands on `/`; `/optout` is the public escape hatch
and needs no account; `/copy#c=…` and `/signin#t=…` are the two links a mail
sends somebody to.

## Privacy invariants the front-end holds

- The plaintext of who you entered lives on this device and in React state.
  The server keeps a salted hash for the mechanism and the normalised handle
  on your own row for your own restore (`celestual_my_pings`, 0010).
- Nothing in the app can display information about any other person's
  activity, and no copy implies it (the linter helps: `npm run lint:voice`).
- The proof (`celestual:auth`) is a bearer secret. Signing out of either
  surface removes it; so does clearing site data.

## Environment

See [.env.example](./.env.example). With no env vars the app boots on local
fallbacks: the wall shows an empty index, and Main's third step says the DM
door is not open, because there is no local stand-in for a proof.

## Gates

`npm run build`, `npm run lint` and `npm run lint:voice`, all from the
repository root. All three are green as of 4 September.

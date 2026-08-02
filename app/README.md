# CELESTUAL — front-end

The Vite + React SPA. No app server: every call goes straight to Supabase's
`SECURITY DEFINER` RPCs (see [../supabase/README.md](../supabase/README.md)).
The screens implement
[../docs/ULTIMATE-PRODUCT-FRAMEWORK.md](../docs/ULTIMATE-PRODUCT-FRAMEWORK.md)
Part 4 to the letter; the visual rules live in
[../docs/DESIGN.md](../docs/DESIGN.md) and the copy rules in
[../docs/VOICE.md](../docs/VOICE.md).

## Architecture

```
src/
├── App.jsx            state machine + routing (/@handle, /c/*, /optout, /demo),
│                      placement/renew/retire flows, verification gating,
│                      localStorage persistence (the ONLY place plaintext
│                      targets live — the server stores hashes)
├── card.js            the open-door Story card renderer (1080×1920 PNG). Not to
│                      be confused with card/ below: this one is the shareable
│                      about the PLACE, and it names nobody
├── card/              the star & card system — the poster every ping carries
│   ├── Disc.jsx       THE CARD: the ground, the type, the limb, the corona
│   ├── Composer.jsx   the composer, which IS the card being filled in
│   ├── Resolve.jsx    a held star resolving into its card, off the camera
│   ├── Spread.jsx     the mutual: two cards unsealing in the same instant
│   ├── model.js       the card as data, the prompt, the seeds, the tint, and
│   │                  the wire shape the server validates against
│   ├── photo.js       a photograph becomes a surface (strip EXIF, treat, measure)
│   ├── photos.js      the blob store. This device, and nowhere else: a card's
│   │                  words ride on its ping row, its picture never leaves
│   └── share.js       the story render — your card, never theirs
├── demoData.js        the sandbox's hardcoded world (sample pings, the Reed
│                      campus window, world counters)
├── theme.js           the single source of color/geometry (one warm star)
├── styles.css         reset, fonts, grain, keyframes
├── components/
│   ├── screens.jsx    the nine screens + verify sheet + account sheet
│   └── ui.jsx         primitives: NightField, StarMark, Meter, StateDot,
│                      buttons, fields, dialog a11y
├── api/
│   ├── celestual.js   the RPC calls (placePing, pingStatus, renewPing,
│   │                  retirePing, fetchMyPings, campuses, worlds, opt-out)
│   ├── pings.js       day-clock helpers for the sixty-day lapse
│   ├── igverify.js    Instagram-DM ownership proof (code + 256-bit proof)
│   ├── auth.js        the local verified-session record
│   ├── billing.js     the one paid door (OFF by default): a Stripe-hosted
│   │                  checkout for one more standing ping. No card is read
│   │                  here and no slot is granted here — see
│   │                  ../../docs/STRIPE-SETUP.md
│   └── supabase.js    the client (safe no-backend fallback)
└── i18n/              the canonical copy (English; key-by-key fallback kept
                       so future locales can land as partial objects)
```

## The flow

`landing → who (the send: the handle, confirmed) → compose (the card the ping
carries — see ../docs/STAR-CARDS.md) → you (identity + optional email; the DM
verify overlay gates placement) → placed (standing/waiting — the recruiter
screen) → pings (the quiet status page)`.

A mutual leaves that line: a two-second announcement, then the status page with
a **sealed** mutual slot on it. Tapping the slot plays the sky's match and
unseals both cards together; after that it stays open.

Side doors: `/@poster` prefills the send field (Loop B); `/c/slug` runs the
campus window (Loop C: count me in → verified preregistration; "it's open.";
the week-one numbers); the slots screen appears only when a placement is
attempted with every slot held (and carries the paid door under the free one
when `VITE_STRIPE_ENABLED=1`); `/paid` is where Stripe returns a buyer;
`/optout` is the public escape hatch.

## Privacy invariants the front-end holds

- The plaintext of who you entered lives in this device's localStorage and
  React state only. Status reads send the list up per call
  (`celestual_ping_status`); cross-device restore brings back mutual pings by
  name and unmatched ones as anonymous rows — by design.
- The in-flight target (`them`) is memory-only until placed.
- Nothing in the app can display information about any other person's
  activity, and no copy implies it (the linter helps: `npm run lint:voice`).

## The sandbox (`/demo`)

Sandboxed end to end — nothing reaches a server. Hardcoded sample data shows
the school-launch story: sample pings in every state, the Reed campus meter at
214/300 with a state-cycling control (window → open → reveal), sample world
counters, and per-row "sandbox: they enter you back" to visualize the full
match reveal. The verify overlay runs in auto-verify mode (its stand-in until
real DM verification is wired for the demo) and never leaves the page.

## Environment

See [.env.example](./.env.example). With no env vars the app runs on safe
local fallbacks; `VITE_IG_VERIFY_ENABLED=1` + a Supabase backend turns on real
DM verification.

# /beta — the wall of unsent letters

A campaign surface at `celestual.us/beta`, reached only by scanning a QR code on
paper. Somebody types their own Instagram handle and finds out whether anyone
wrote them a letter they never sent. Nineteen of twenty find nothing, which is
where the product is actually sold.

Run it: nothing to configure. `npm run dev` and open `/beta`.

---

## What it may touch

This build is strictly additive. One file outside this directory was edited:

- `app/src/main.jsx` — forks on `/beta` and lazy-imports this tree.

Nothing else. No shared component, no global CSS, no existing token, no existing
table, no existing policy, no `vercel.json`, no `vite.config.js`. Nothing in the
production app imports from `src/beta/`. Every new table is prefixed `beta_` and
every new environment variable is prefixed `VITE_BETA_`.

Verified rather than asserted: building with and without the `main.jsx` fork and
diffing the rendered DOM of `/`, `/demo`, `/demo?seed`, `/trial`, `/optout`,
`/c/uc-berkeley`, `/@handle` and `/paid` produces an identical skeleton, identical
text and an identical title on all eight. The production stylesheet is
byte-identical; the entry chunk differs only by Vite's dynamic-import preamble
and the fork itself, and carries no beta code.

## Environment

| Variable | Default | What it does |
|---|---|---|
| `VITE_BETA_DATA_SOURCE` | `mock` | `mock` \| `supabase`. Falls back to `mock` if Supabase is unconfigured. |
| `VITE_BETA_SUPABASE_URL` | — | Falls back to `VITE_SUPABASE_URL`. |
| `VITE_BETA_SUPABASE_ANON_KEY` | — | Falls back to `VITE_SUPABASE_ANON_KEY`. |
| `VITE_BETA_MODERATE_URL` | — | Unset means layers 2–3 are stubbed to pass after 2400ms. |

Left out of `app/.env.example` deliberately: that file already exists, and this
build does not edit files it did not create.

## Layout

```
beta.css      every rule scoped under .beta-root
index.jsx     layout — faces, the cut, the sky, ?s= attribution, routing
router.js     ten routes, no dependency
Sky.jsx       the field. each point is one live letter
parts.jsx     ArrowLink, Display, Eyebrow, HandleField, Paper, Bloom, ornament
handles.js    the one normalizer
store.js      all client state, one key: celestual.beta.v1
moderate.js   layer 1 (deterministic) + the layers 2–3 contract
data/         types.js (the contract) · mock.js (default) · supabase.js · seed.js
screens/      one file per screen
```

Backend, both undeployed:

- `supabase/migrations/0027_beta_wall.sql`
- `supabase/functions/celestual-beta-moderate/index.ts`

## The two rules that are not style

**`author_handle` never reaches a browser. `sealed_line` does not until the
person the letter is about has proven the handle is theirs and asked.**

Not enforced by a `select` list and not by a policy on the base table. The client
has no grant on `beta_letters` at all; it reads `beta_letters_public`, a view that
does not have those two columns. A forgotten filter, a `select *`, a misjudged
policy and a clever PostgREST query all fail the same way — there is nothing there
to return. The rendered seal is a decoy of matching length, so the real string is
not in the DOM even blurred.

**Moderation is pre-publication.** A letter is written at `status='pending'`,
renders nowhere, and goes live only after three layers pass. Post-hoc takedown is
not a strategy here: the screenshot exists before you delete it. Alongside it,
one-tap removal by any verified handle, on the letter screen, never behind a menu.

## Where this deviates from the brief, and why

1. **JSX, not TypeScript.** There is no tsconfig, no typecheck step and no TS
   anywhere in `app/src`. Adding a tsconfig changes how Vite compiles the
   existing app, which §1 forbids. The adapter contract is JSDoc in
   `data/types.js` — editors check it the same way.
2. **No React Router, no Tailwind.** Neither is a dependency of this project.
   The host routes by matching `location.pathname` (`App.jsx parseRoute`), so
   `router.js` does the same in sixty lines; layout is in `beta.css`.
3. **`WallRepo` gained two methods.** `removeLetter` — §3.4 mandates one-tap
   removal in the product but left it off the interface, and it cannot be built
   without it. `liveCount` — the sky's density is the wall's real size.
4. **Eyebrows are `--ash`, not `--ash-dim`.** `--ash-dim` on `--void` is 2.7:1.
   The token's own rule is "decorative and disabled only, never body copy", and
   an eyebrow is copy. `--ash-dim` is left to the arrow glyph, the painted `@`,
   the ornament strokes and disabled controls. Same for §5.4's
   "Or write one about someone else." — §7's floor outranks the colour note.
5. **The four-point star was built and removed.** See `parts.jsx`.

## Known cost

`/beta` downloads the production entry chunk (~187 kB gzip) because `main.jsx` is
the single Vite entry and imports `App.jsx` statically. Making that import dynamic
would fix it and would cost every production visitor a round trip before first
paint, which §1 forbids. The real fix is a second Vite entry, which needs
`vite.config.js` and `vercel.json` — both off limits here. Lift that constraint
and it is a `rollupOptions.input` key plus one rewrite.

Measured on this build, mobile emulation, font hosts blocked: FCP 2.1s, Speed
Index 2.1s, CLS 0, TBT ~10ms, accessibility 100, best practices 100. Every screen
and every state passes axe-core WCAG 2 A/AA with zero violations.

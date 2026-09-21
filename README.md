# CELESTUAL

A double blind, mutual reveal product. Live at **https://celestual.us**.

You place a ping on somebody's Instagram handle. They are never told. If and
only if they independently place one on you, you both find out at the same
moment. If it is never mutual, nothing is revealed to anybody, and because the
server stores who you entered only as a salted one way hash, nothing ever can
be.

---

## The two surfaces

**The wall**, at `/`. The front door is the wall for everybody: short anonymous
letters, each addressed to one Instagram handle or to a first name. The list
of names is public, and so are the first eight letters anybody reads. After
those, reading needs a proof of a person, any of the four the product takes: a
verified Instagram handle, a Google account, an address a code was mailed to,
or a campus address. Writing there needs the same. Every letter goes up at
once and is read where it stands, and what comes down is a letter with a
consequence in it, never a tone (`supabase/functions/celestual-wall-moderate`).

**The wall at Berkeley**, at `/berkeley`. The same wall for one campus, reached
by scanning a code off a flyer. Reading is the same; writing needs a
`berkeley.edu` address, proved by a mailed code or by the campus's own Google
account.

**Main**, at `/ping`. The product the wall hands off into: place a ping, hold
two at a time, sixty days each, and a reveal that happens to both people or to
neither.

They are one session. Any proof, on any surface, signs you in to all of them.

---

## Where things are

```
app/                the SPA. Vite + React, no router library
  src/main.jsx      the fork. Which surface owns this address, decided before
                    anything mounts, so a route is never rendered twice
  src/cards.js      the five printed cards, and where each one lands. Read by
                    the fork above, and by the desk
  src/main/         Main. hero (at /ping), place, sky, reveal, optout, copy,
                    signin
  src/wall/         the wall, drawn for two walls (campus.js): the one at /
                    and the one at /berkeley. ten screens, its own art and
                    its own store
  src/signature/    where the two signature surfaces were approved. static
  src/admin/        the desk at /admin
  src/api/          every call to Supabase, one module per concern
  public/           the legal pages, the faces, the mark, the share card

supabase/
  migrations/       0001 to 0057, in order. 0029 onward is the rebuild; 0038 is
                    the audit; 0057 is the wall at the root and the login
  functions/        the edge functions. celestual-resolve, -admin,
                    -wall-moderate, -edu-verify, -ig-webhook, -manychat,
                    -mutual-dm, -notify, -stripe, -stripe-webhook

design/             the design system. DESIGN.md is the source of truth
scripts/            the tooling: migrations, screenshots, the mark, the voice
docs/               the rebuild's own record, and the runbooks
```

Anything referenced by string is live even when it looks dead: route names,
Supabase RPC names, edge function names and storage bucket names do not appear
in an import graph.

---

## Running it

```
npm install
npm run dev            the app on :5173
npm run build          the production build
npm run lint           eslint over app/
npm run lint:voice     the copy tripwire (design/VOICE.md section 6)
```

`app/.env.example` documents every environment variable. Nothing needs a
backend to boot: with no Supabase configured the app runs on local fallbacks.

### The tooling

```
scripts/verify-migrations.sh --test    apply every migration to a bare
                                       PostgreSQL, then run scripts/sql/test-*
node scripts/preview.mjs               screenshot every route, with fixtures
node scripts/mail-preview.mjs          screenshot every email template
node scripts/shots.mjs /terms          screenshot one address or one file
node scripts/export-mark.mjs           the logo, out of the code that draws it
node scripts/export-liquid.mjs         the liquid metal mask, from the same geometry
node scripts/export-og.mjs             the share card, from the same source
```

---

## The rebuild

The product was rebuilt in eight phases against
**[docs/rebuild-spec.md](./docs/rebuild-spec.md)**, which is the source of truth
for it. **[docs/plan.md](./docs/plan.md)** records what each phase actually did
and what it found, **[docs/launchsteps.md](./docs/launchsteps.md)** is
everything that has to happen outside the repo, and
**[docs/open-questions.md](./docs/open-questions.md)** and
**[docs/deletions.md](./docs/deletions.md)** carry the decisions and the
deletions.

Most of the schema is live. The database carries every migration through 0045,
and 0047; **0038 and 0046 are not recorded as applied**, and
[docs/launchsteps.md](./docs/launchsteps.md) says what that means and in what
order to apply what is left.

---

## The documents

| | |
| --- | --- |
| [docs/rebuild-spec.md](./docs/rebuild-spec.md) | The rebuild: the phases, the visual bar, the definition of done |
| [docs/plan.md](./docs/plan.md) | What each phase did, and the nine things the audit found |
| [docs/launchsteps.md](./docs/launchsteps.md) | Everything to do outside the repo, in order |
| [docs/deletions.md](./docs/deletions.md) | Every file and database object proposed for deletion, and why |
| [docs/open-questions.md](./docs/open-questions.md) | Every decision the spec did not answer, and how it was answered |
| [design/DESIGN.md](./design/DESIGN.md) | The design system. Anything visual references this |
| [design/VOICE.md](./design/VOICE.md) | The copy rules, and what the voice lint enforces |
| [design/components.html](./design/components.html) | The system rendered: every component, colour, type size and state |
| [docs/SECURITY.md](./docs/SECURITY.md) | The privacy model: hashed targets, the slot rule, the purge, the opt out |
| [docs/HANDLE-RESOLVER.md](./docs/HANDLE-RESOLVER.md) | The resolver: Apify, the permanent cache, the three caps, the stored face |
| [docs/EDU-VERIFICATION.md](./docs/EDU-VERIFICATION.md) | The campus email gate, wired live |
| [docs/GOOGLE-AUTH-SETUP.md](./docs/GOOGLE-AUTH-SETUP.md) | Google sign in and the mailed code, step by step, for a first time |
| [docs/DEBUG-IG-WEBHOOK.md](./docs/DEBUG-IG-WEBHOOK.md) | Debugging the Instagram DM verification relay |
| [docs/MANYCHAT-SETUP.md](./docs/MANYCHAT-SETUP.md) | The DM relay |
| [docs/MANYCHAT-MUTUAL-DM.md](./docs/MANYCHAT-MUTUAL-DM.md) | Telling somebody on Instagram that it is mutual, inside Meta's rules |
| [docs/STRIPE-SETUP.md](./docs/STRIPE-SETUP.md) | Wiring Stripe live, and turning it back off. Dormant |
| [docs/PRICING-REVENUE.md](./docs/PRICING-REVENUE.md) | The monetization posture: nothing, deliberately |
| [docs/PERSONAS.md](./docs/PERSONAS.md) | The seven people the design is scored against |
| [docs/ULTIMATE-PRODUCT-FRAMEWORK.md](./docs/ULTIMATE-PRODUCT-FRAMEWORK.md) | The product direction |
| [docs/WALL-FEATURES.md](./docs/WALL-FEATURES.md) | What goes on the wall and what does not: the nine gates, the attacks by name, the proposals weighed, and what the wall needs next |
| [app/README.md](./app/README.md) | Front end architecture |
| [app/src/wall/README.md](./app/src/wall/README.md) | The wall, in detail |
| [supabase/README.md](./supabase/README.md) | Schema, RPCs, RLS, edge functions, the operator playbook |

---

## The addresses

| | |
| --- | --- |
| `/` | the wall for everybody, and its sheets under it: `/letter/<id>`, `/find`, `/write`, `/gate`, `/report/<id>`, `/remove/<handle>`, `/join` |
| `/ping` | Main. The hero, the ping's own front door |
| `/place`, `/place/<handle>`, `/@handle` | placing one |
| `/sky` | what you have out |
| `/reveal/<handle>` | a mutual, opened |
| `/berkeley` | the wall at Berkeley, and the same eight addresses under it |
| `/beta` | the wall's printed address. Rewritten onto `/berkeley` at boot |
| `/c/<code>` | what the five printed cards carry in their QR. Logs the scan, then hands the visitor to wherever that card is pointed |
| `/optout` | take a handle off, permanently, proved with one DM, no account |
| `/copy`, `/signin` | the two links a mail sends somebody to |
| `/admin` | the desk. Password checked server side. `#reports`, `#cards`, `#people=@handle` and the other section names in the fragment open a screen directly |
| `/signature`, `/signature/reveal` | where the two signature surfaces were approved |
| `/terms`, `/privacy`, `/data-deletion` | static, served by a rewrite |

Anything else draws a not found, in the current design.

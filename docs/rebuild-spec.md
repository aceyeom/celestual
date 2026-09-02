# Celestual Production Rebuild Spec

This file is the source of truth for the rebuild. Commit it to `docs/rebuild-spec.md`.
Every session reads this file plus `docs/plan.md`. Do not re-derive decisions that are stated here.

---

## 0. Execution rules

Apply these to every phase.

- Work on branch `rebuild/<phase-name>`. Never commit to `main`.
- If a decision is ambiguous or this spec is silent, stop and ask. Do not choose and continue.
- Never delete anything until the deletion manifest for that phase is approved. See Phase 1.
- Never modify Supabase project secrets, env vars, or production data. List what needs changing in `docs/launchsteps.md` and I will do it.
- No em dashes in any prose you write, in code comments, docs, UI copy, or commit messages.
- Explanations stay minimal. Short declarative sentences.
- End every phase with a commit. Build and typecheck must pass before you commit.

---

## 1. Current state

- Vite + React SPA, Supabase backend, live at celestual.us
- `/beta` and `/orbit` contain the new work. Everything else is the old design.
- Supabase is on the free tier. No point-in-time recovery. Treat all destructive DB operations as irreversible.
- An Instagram DM code verification flow already exists and works. It stays. See section 4.
- HikerAPI is currently wired in. It is being removed entirely. See section 5.

---

## 2. Goal

Promote `/beta` and `/orbit` to production. The old design is retired. Every page is rebuilt in the new design system.

---

## 3. Identity model

Handle is primary. Email is secondary and optional.

**Users table**

- `instagram_handle` is the canonical identity. Unique, not null once set.
- `email` is nullable. No verification required for a plain email.
- `edu_email` is nullable and separate from `email`. Only a verified `.edu` address populates it.
- `handle_verified_at` is nullable. Set only by the DM code flow. See section 4.
- A user row may exist with a handle and no email. A user row may exist with an `edu_email` and no handle yet.

**Session**

Berkeley Wall and Main are one session. A user who authenticates anything at any point in either surface gets a row and stays signed in across both.

**Requirements per surface**

- Berkeley Wall requires a verified `.edu` address. It does not require a handle.
- Main requires a verified handle. It accepts any email with no verification, and email is skippable.

**Merge rule**

If an authenticated identifier already belongs to another row, merge into the older row and keep both identifiers. Never create a duplicate. Never silently overwrite. If the merge would join two rows that each already have a different verified handle, stop and ask.

---

## 4. Handle resolution vs handle ownership

These are two different things. Do not conflate them.

- **Resolution** is Apify. It looks up a public profile so the UI can display an avatar, display name, and verification badge. It proves nothing about who is using the browser.
- **Ownership** is the existing Instagram DM code flow. It is the only thing that sets `handle_verified_at`.

A user searching and selecting a handle is not authenticated. Any flow that requires a verified own handle routes through the DM code flow.

---

## 5. Apify integration

Replace HikerAPI. Delete all HikerAPI code, clients, types, and call sites. List its Supabase env vars in `launchsteps.md` for me to remove. Do not remove them yourself.

Actor: `shu8hvrXbJbY3Eb9W` (Instagram scraper).
Reference: https://console.apify.com/actors/shu8hvrXbJbY3Eb9W/information/latest/readme

**Actor input**

Set the post limit to zero. We only want profile metadata. Do not request posts, comments, or reels.

**Fields captured**

`handle`, `display_name`, `is_verified`, `avatar`.

**Storage**

Table `ig_profiles`:

- `handle` (pk)
- `display_name`
- `is_verified`
- `avatar_path` (Supabase Storage path)
- `avatar_fetched_at`
- `resolved_at`

`handle`, `display_name`, and `is_verified` are kept indefinitely and served from cache forever. They are only refreshed if a resolve is explicitly forced.

**Avatars**

Do not return or store Instagram CDN URLs. They are signed and expire within days, which would break every cached card.

Instead, in the edge function:

1. On a cache miss, call Apify.
2. Download the avatar image server side.
3. Upload it to Supabase Storage bucket `avatars` at `ig/<handle>.jpg`. Bucket is public read.
4. Store the path in `avatar_path` and set `avatar_fetched_at`.
5. Return your own Supabase public URL to the client. The browser fetches it directly from Supabase.

Refresh the avatar only if `avatar_fetched_at` is older than 30 days and that handle is resolved again. If the download fails, store nothing and let the UI fall back to a monogram placeholder built from the display name. A missing avatar must never block the card from rendering.

**Rate limiting**

Enforced server side in the edge function. Never trust the client. Anonymous users are the majority case, so the anonymous path must work without a session.

Three counters, all rolling 24 hour windows:

| Key | Limit |
| --- | --- |
| `user_id` (signed in) | 20 |
| `device_id` (anonymous) | 20 |
| `ip` | 200 |

- `device_id` is a UUID the edge function issues in an httpOnly, SameSite=Lax cookie on first request. It is not a fingerprint.
- The IP counter is the backstop for cookie clearing. It is deliberately loose because campus networks share addresses.
- Signed-in users are counted on `user_id` only, not `device_id`.

**Cache hits do not count against any limit.** Only calls that actually hit Apify are counted. This keeps billing bounded and keeps the UX generous for normal use.

Implement as an append-only `handle_search_events` table with `key_type`, `key_value`, `created_at`, indexed on `(key_type, key_value, created_at)`. Count rows in the last 24 hours. Add a scheduled prune of rows older than 48 hours.

On limit, return 429 with the seconds remaining until the oldest counted event ages out. The UI shows a plain message with the reset time. It does not show a raw error.

**Result card**

Instagram-like card in the Celestual design system. Avatar, handle, display name, verification badge. Compact, consistent with the rest of the app. This card is the main affordance that makes the product read as professional, so it gets real design attention.

**Billing verification**

Do not attempt this yourself. Add to `launchsteps.md`: run a 10 handle pilot and confirm the billed event count matches the handle count before opening it to users.

---

## 6. Flows

### From Berkeley Wall into Main

`.edu` verified, user stays signed in.

- **Letter already sent** (one or many): offer a stack of the handles they already wrote to, plus the option to enter a new `@`.
- **No letter sent**: "Who's on your mind." They enter a new `@`, write a letter, and verify their own handle through the DM code flow.

### Straight to Main

- New hero page with decorative and interactive elements. Clear gateway into Berkeley Wall.
- Then identical to the "no letter sent" flow above.

---

## 7. Design system

Bundle everything under `design/`.

- `design/DESIGN.md` is the waypoint and semantic source of truth. Anything visual references this file.
- `design/VOICE.md` holds copy rules. No em dashes. Minimal text. Simple, direct guidance.
- `design/source/eclipse.html` is the exported branding artifact. Derive palette, type, and treatment from it. If this file is not present in the repo, stop and ask. Do not attempt to fetch it from a URL.
- `design/components.html` is a single standalone page rendering every UI component, color, type scale, and state, for a designer to review and for you to reference in later phases.
- Logo exported as a high quality PNG plus the source vector if one exists.

Layout, spacing, and element placement stay consistent across every page. No page invents its own system.

### 7.1 Visual bar

This is a B2C connection product. It has to feel sincere and made by a person. Generic SaaS chrome kills it.

You cannot see your own output, so you will default to the most common pattern in your training data unless constrained. These constraints are not stylistic preferences. Treat them as hard requirements.

**References are files, not adjectives.** Before writing any UI, open and view every file in `design/source/`. That folder holds `eclipse.html` plus reference images. If it is empty or missing, stop and ask. Do not proceed from a verbal description of the aesthetic.

**Banned outright.** If any of these appear, the phase is not done.

- Centered hero with headline, subhead, and two side by side buttons
- Three or four column feature card grid
- Icon plus title plus paragraph blocks
- Gradient filled buttons
- `box-shadow` utility classes used for depth
- Emoji used as iconography
- Stock vector illustration, undraw style figures, generic 3D blob renders
- Lorem ipsum or placeholder copy of any kind
- Literal button copy reading "Get started", "Learn more", or "Join the waitlist"
- Tailwind default palette values such as `slate-800` or `indigo-600`. Every color comes from a token in `DESIGN.md`
- `transition: all` with a default duration

**Signature surfaces.** Only two screens carry the artistry: the Main hero and the ping or reveal moment. Give them disproportionate effort. Everything else is quiet, consistent, and restrained. Do not spread ambition evenly across all pages. Even ambition produces uniformly mediocre pages.

### 7.2 Techniques for signature surfaces

Build these directly. Do not look for external assets, and do not substitute a static image where motion is specified.

- Point field rendered in WebGL for the void and stars. Slow autonomous drift plus pointer parallax. Real depth through parallax layers, not scaled opacity.
- Grain and texture via SVG `feTurbulence` or a canvas noise pass, generated in code, never a bitmap file.
- Pointer or scroll linked transforms on display type.
- Deliberate motion timing. Named easing curves, staggered entrances, durations chosen per element.
- A real serif display face, actually loaded and subset, for the emotional register. No system font fallback as the final state.

Non negotiable: 60fps on a mid range phone, and a composed static fallback under `prefers-reduced-motion`. If a technique cannot hit that, replace it with one that can and say so.

### 7.3 Visual feedback loop

Mandatory for every signature surface and every page in the UI phases.

1. Install Playwright in the repo.
2. Build the surface.
3. Run the dev server and screenshot at 390x844 and 1440x900.
4. Open both screenshots with the view tool and actually look at them.
5. Critique your own output against `design/source/`, `DESIGN.md`, and the ban list in 7.1. Write the critique down.
6. Revise and repeat.

Minimum three iterations before presenting anything. Include the final screenshots in the phase output. Do not report a surface as complete without having viewed it.

---

## 8. UI scope

Every page below is rebuilt in the new system.

- Berkeley Wall
- Main, with its own separate hero page
- Handle search and result card
- Ticker wall. Display `display_name`, `handle`, and verification badge only. Do not put avatars or counts in the ticker.
- Resend transactional email templates and the share thumbnail
- Terms and Privacy, rewritten concise and professional
- All routing

---

## 9. Moderation

Wall submissions are filtered by an LLM call before they appear publicly.

Use the cheapest available model. Target `claude-haiku-4-5-20251001`. This is bulk filtering, so cost per call matters more than nuance.

Filter runs server side. Rejected content is stored with a rejection reason so it appears in admin, not silently dropped.

---

## 10. Admin

Rebuild `/admin` for a non-developer.

- Match the new design system.
- Cover every new feature: user records, handle resolution cache, moderation queue and rejection reasons, rate limit status, wall submissions, reports.
- Reporting mechanism for user-flagged content, with an action path from report to removal.
- Delete the old marketing launch data and its UI.

---

## 11. Data and migrations

All existing beta user data is fake. Delete it.

- Migrations must be current and account for every change in this spec.
- Every Supabase function must be updated to match.
- Do not run migrations against production. Write them, verify them locally, and list the apply order in `launchsteps.md`.

---

## 12. Repo

- Make the repo easily routable. Clear top level structure, obvious entry points.
- Delete outdated markdown and dead code, subject to the deletion manifest rule in section 0.
- Treat anything referenced by string as live until proven otherwise. Route lookups, Supabase RPC names, edge function names, and storage bucket names do not appear in static import graphs and will look dead when they are not.

---

## 13. Phases

Phase 1 is read only. Produce these three files and stop.

1. **Audit.** No code changes. Output `docs/plan.md` with the phase breakdown, `docs/deletions.md` with every file and DB object proposed for deletion and why, and `docs/open-questions.md` with everything this spec does not answer. Also create a skeleton `docs/launchsteps.md` at this point so it exists even if later phases are interrupted.
2. Design system. Section 7.
3. **Signature surfaces.** The Main hero and the ping or reveal moment. Nothing else. Static, with real data shapes but no backend wiring. Sections 7.1 to 7.3. Exit condition is my approval of the screenshots, not a passing build. Present and wait.
4. Schema, migrations, identity and session model. Sections 3 and 11.
5. Apify integration and HikerAPI removal. Section 5.
6. Wall and Main rebuild, wiring the approved signature surfaces to real data. Sections 6 and 8.
7. Admin. Section 10.
8. Email, legal, routing, and final `launchsteps.md`. Sections 8 and 14.

Phase 3 comes before any backend work on purpose. It is the part that gets cut when it sits at the end of a long queue, and it is the part that decides whether the product reads as sincere or as a template.

Adjust this breakdown in `docs/plan.md` if the audit shows different seams in the actual repo. Say why.

---

## 14. launchsteps.md

Ordered, step by step, written for me to execute by hand. Include everything I have to do outside the repo:

- migration apply order
- Apify account setup and key placement
- HikerAPI secrets to remove from Supabase
- Supabase Storage bucket creation and policy
- the 10 handle billing pilot
- Resend domain and template setup
- DNS or routing changes
- anything else a phase surfaces

Append to this file as each phase completes. Do not leave it until the end.

---

## 15. Definition of done

A phase is done when:

- `tsc` passes with no new errors
- the production build succeeds
- every route in scope renders without console errors
- **no route in scope renders an empty shell, a TODO, an unstyled default, or placeholder copy.** A route that exists but is not built out counts as incomplete, not as partial credit
- **every page in scope has been screenshotted and viewed by you**, and nothing on the section 7.1 ban list appears
- no HikerAPI reference remains anywhere in the repo, including types and comments (Phase 5 onward)
- `launchsteps.md` reflects everything that phase added
- the work is committed on its branch

If you cannot meet a criterion, stop and say which one and why. Do not report the phase as done with a caveat buried in the summary.

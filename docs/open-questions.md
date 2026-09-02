# Open questions

Everything `docs/rebuild-spec.md` does not answer, or answers in a way the repo
contradicts.

Ordered by what blocks the most work. Each has my recommendation, so you can
answer with a yes rather than a paragraph.

Per spec section 0, I have not chosen and continued on any of these.

---

## Blocking now

### Q0. `design/source/eclipse.html` is not in the repo. Phases 2 and 3 cannot start.

There is no `design/` directory. No file matching `*eclipse*` exists anywhere in
the repo at this commit.

Spec section 7 says: "If this file is not present in the repo, stop and ask. Do
not attempt to fetch it from a URL." Section 7.1 repeats it for the folder.

This is the hard stop. Phase 2 derives the palette, type, and treatment from this
file, and Phase 3 derives both signature surfaces from Phase 2.

**Needed:** commit `design/source/eclipse.html` plus any reference images to the
repo. Or tell me to derive the system from `docs/DESIGN.md` instead, which is a
mature 68KB system already in the repo and already implemented in `theme.js` and
`texture.js`.

**Recommendation:** commit the file. `docs/DESIGN.md` describes the production
design that spec section 2 retires, so falling back to it contradicts the goal.

---

### Q1. There is no TypeScript in this project. What does "`tsc` passes" mean?

Spec section 0 requires typecheck to pass before every commit. Section 15 makes
`tsc` the first criterion for done.

`app/` has zero `.ts` or `.tsx` files, no `tsconfig.json`, and no `typescript`
dependency. It is `.js` and `.jsx` built by Vite. The only TypeScript is the Deno
edge functions, which Supabase typechecks at deploy time.

Options:

- **A.** Drop the `tsc` criterion. Substitute `npm run build` plus `eslint`. The
  `lint` script already exists in `app/package.json`.
- **B.** Add TypeScript in checkJS mode. Add `tsconfig.json` with `allowJs` and
  `checkJs`, plus JSDoc types. No file renames. Roughly a day, and it will
  surface real errors in 36,000 lines of untyped JSX.
- **C.** Migrate the app to TypeScript properly. This is weeks, and it is not in
  any phase in the spec.

**Recommendation:** A for Phases 2 and 3, which are visual and have no backend.
Then B at Phase 4b, where the identity and merge logic actually benefits from
types. C is out of scope.

---

### Q2. "All existing beta user data is fake. Delete it." Which data?

Spec section 11. The problem is that the tables named `beta_*` are the empty
ones.

- `beta_letters`, `beta_claims`, `beta_reveal_requests`, `beta_waitlist`,
  `beta_scans`: all zero rows. Nothing to delete.
- The data that exists is in the old production product: 49 handle
  verifications, 40 placements, 36 members, 31 ManyChat contacts, 30 entries, 7
  matches.

Which did you mean?

- **A.** The `beta_*` tables. Then this is already done, and the `celestual_*`
  user data stays.
- **B.** All user data everywhere, a full reset before relaunch.
  `supabase/wipe-all-user-data.sql` already exists for this.
- **C.** Something in between.

Two rows should survive any wipe regardless of your answer, and I will not delete
them without a separate instruction:

- `celestual_suppressions`, 1 row. That is a person's opt out. Deleting it
  re enables pings against someone who asked not to receive them.
- `celestual_settings`, 4 rows. Configuration, not user data.

**Recommendation:** B, minus those two tables, minus `celestual_purchases` until
Q3 is answered. Confirm the 7 matches and 40 placements are test data and not
real people.

---

### Q3. Is Stripe and monetization retired, kept, or out of scope?

The spec never mentions money. Not in the goal, the identity model, the UI scope,
or admin. Silence is not an instruction.

`celestual_purchases` holds 2 rows. If those are real payments by real people,
deleting them is a financial record deletion with no backup, because the project
is on the free tier with no point in time recovery.

Currently dormant: `VITE_STRIPE_ENABLED=0` and `VITE_STRIPE_PLAN=0`. Both
functions are deployed. `celestual_submit` calls `celestual_cap_for`, which calls
`celestual_extra_slots` and `celestual_plan_until`, so the billing layer is
wired into the core placement path and cannot simply be dropped.

- **A.** Delete it all. Requires confirming the 2 purchases are test data.
- **B.** Keep it dormant and untouched. Carry it through the rebuild.
- **C.** Out of scope. Leave the code and tables alone, do not rebuild the UI.

**Recommendation:** C for now, revisited at Phase 7. The rebuild is about
identity, the Wall, and design. Ripping out a billing layer that touches
`celestual_submit` adds risk to a phase that has none of its own.

---

### Q4. `0015_identity_start.sql` was never applied. Keep it or drop it?

The repo has it. Production does not have `celestual_handle_route`, the function
it defines. Its only caller is `celestual-relogin`, which is also not deployed.

Meanwhile production has `celestual_login_lookup`, `celestual_redeem_login`, and
`celestual_bind_login_email` from a migration named
`adopt_sender_and_email_login` that has no file in this repo. Those look like the
shipped answer to the same problem 0015 was solving.

- **A.** Drop 0015 and `celestual-relogin`. Write the missing migration file from
  the live definitions of the three functions that actually shipped.
- **B.** Keep 0015, apply it, deploy `celestual-relogin`.

**Recommendation:** A. Match the repo to what production actually runs. Spec
section 3 needs a durable cross surface session, and the shipped
`celestual_login_lookup` path is the one with production behind it.

---

## Blocking Phase 4b

### Q5. The merge rule. What is an "authenticated identifier"?

Spec section 3 says: "If an authenticated identifier already belongs to another
row, merge into the older row and keep both identifiers."

The spec defines two things as authenticated: a handle verified by the DM code
flow, and a verified `.edu` address. It also says plain `email` needs no
verification.

So: can an unverified plain `email` trigger a merge?

If yes, anyone can type someone else's email and merge into their row. If no, the
`email` field never merges and only ever attaches to the row already in session.

**Recommendation:** no. Only `handle_verified_at` and `edu_email` trigger a
merge. A plain `email` attaches to the current row and nothing else. Confirm.

### Q6. Merge conflicts other than two verified handles.

Spec section 3 names one stop condition: two rows that each have a different
verified handle.

It does not say what happens when:

- Both rows have a different `edu_email`, both verified.
- The older row has a verified handle, the newer has a verified `edu_email`, and
  both also have different plain `email` values. Which `email` survives?
- Both rows have pings, letters, or wall claims. Do those move to the surviving
  row?

**Recommendation:** stop and ask on two different verified `edu_email` values,
same as handles. For a plain `email` collision, keep the older row's and discard
the newer, since it is unverified and low value. Content follows its identity
into the surviving row. Confirm.

---

## Blocking Phase 5

### Q7. Migrate the 40 cached profiles, or drop and re acquire?

`celestual_handle_cache` holds 40 rows. Its `pic_url` column holds signed
Instagram CDN URLs, which the spec bans and which are expired or expiring.

The `handle`, `display_name`, and `is_verified` values are still good and would
seed `ig_profiles` for free, saving 40 Apify calls.

**Recommendation:** migrate `handle`, `display_name`, `is_verified` into
`ig_profiles` with a null `avatar_path`, so the avatars refill lazily on next
resolve. Drop `pic_url` and `is_private`. Drop `celestual_handle_lookups`
entirely, since it is only counters.

### Q8. `device_id` moves from a request body field to an httpOnly cookie.

Spec section 5: "`device_id` is a UUID the edge function issues in an httpOnly,
SameSite=Lax cookie on first request."

Today the client sends `device` in the POST body
(`celestual-resolve/index.ts:445`).

An httpOnly cookie set by a Supabase edge function is on the
`*.supabase.co` origin, not `celestual.us`. That makes it third party. Safari's
ITP and Chrome's third party cookie phase out both affect it. In practice a
meaningful share of anonymous users, which the spec says are the majority case,
will get a new `device_id` on every request and fall through to the IP counter.

The IP counter is 200 per day and shared across campus NAT, so the real limit for
those users becomes the IP one.

- **A.** Implement as specified, accept the degradation, rely on the IP backstop.
- **B.** Proxy the function through `celestual.us` so the cookie is first party.
  Needs a Vercel rewrite. Small change to `vercel.json`.
- **C.** Keep the current client generated device id in `localStorage` and accept
  that it is clearable.

**Recommendation:** B. It is a few lines in `vercel.json`, it makes the cookie
first party, and it also removes the direct `*.supabase.co` call from the browser.

### Q9. The spec drops `is_private`. Intentional?

Spec section 5 lists four captured fields: `handle`, `display_name`,
`is_verified`, `avatar`. The existing resolver also captures `is_private`.

A private account matters for this product: a ping or letter addressed to a
private account may never be reachable.

**Recommendation:** keep `is_private` on `ig_profiles` even though it is not
shown on the result card. It costs one boolean and the Apify actor returns it
anyway. Confirm.

---

## Blocking Phase 6a

### Q10. Do the `beta_*` tables keep their names?

`0027_beta_wall.sql` created five tables prefixed `beta_`, plus the
`beta_letters_public` view and `beta_remove_letter`. All are empty and unused.

The word "beta" no longer describes anything. The surface is `/berkeley`.

Renaming is free right now because the tables are empty. It will never be this
cheap again.

**Recommendation:** rename to `wall_letters`, `wall_claims`,
`wall_reveal_requests`, `wall_waitlist`, `wall_scans`, `wall_letters_public`,
`wall_remove_letter`. Confirm.

### Q11. Does the Wall stay Berkeley only?

`app/src/wall/router.js:17` says `/berkeley` was chosen so "the next campus should
be a sibling address rather than a second rewrite". The gate hardcodes
`berkeley.edu`.

Spec section 3 says "Berkeley Wall requires a verified `.edu` address", without
saying which `.edu`.

- **A.** Any `.edu`. One wall.
- **B.** `berkeley.edu` only. One wall, one campus.
- **C.** Per campus walls keyed on the email domain.

**Recommendation:** B for launch, with the schema shaped for C. A campus wall
readable by any student anywhere is a different and worse product than one
readable by the campus it is about, and `app/src/wall/auth.js` argues that at
length.

---

## Blocking Phase 7 and 8

### Q12. "Delete the old marketing launch data and its UI." Confirm scope.

Spec section 10. I read this as the First Light trial and the recruitment
program: `/trial`, `/recruit`, `/r/:code`, the bare four letter `/:code` route,
their tables, and their docs. Group B in `docs/deletions.md`.

Two consequences worth confirming:

- Four rows across `celestual_trial_emails` and `celestual_recruits` are real
  people who entered a competition.
- Deleting the four letter route matcher breaks every competitor tracking link
  already printed or sent in a DM.

**Recommendation:** confirm the competition is over, then delete the whole group.

### Q13. Resend. Which domain and which templates?

Spec section 8 lists "Resend transactional email templates and the share
thumbnail". Section 14 lists "Resend domain and template setup".

`supabase/functions/_shared/mail.ts` has one design and five senders. I need to
know which senders survive, and the sending domain and from address, before I can
write the launch steps.

There is a Resend connector available in this session. I have not called it. Tell
me if you want me to read the current domain and template state from it.

### Q14. Does the WebGL sky survive?

Spec 7.2 requires "Point field rendered in WebGL for the void and stars. Slow
autonomous drift plus pointer parallax."

`app/src/sky/` is 13 modules and roughly 4,300 lines that already do this,
including `fallback2d.js` for `prefers-reduced-motion` and a camera with
gestures.

- **A.** Keep and adapt it. Faster, and it is proven on real devices.
- **B.** Rewrite from scratch under the new design system.

**Recommendation:** A, adapted. The 60fps on a mid range phone requirement in 7.2
is much easier to hit with an engine that has already been tuned than with a new
one. Decided at Phase 3, after you see the surfaces.

### Q15. Communities, campuses, and `/c/:slug`. Retired?

Every table is empty. The spec never mentions the feature. `App.jsx` carries
roughly 200 lines of community state and `communityGalaxy.js` is 1,152 lines.

**Recommendation:** retire it. The Wall is the campus surface now. Confirm.

### Q16. Does `/demo` survive?

The sandbox at `/demo` runs the whole production flow against hardcoded data with
auto verification. It threads a `demo` boolean through `App.jsx`,
`api/celestual.js`, `card/photos.js`, and more.

It is a genuinely useful sales tool. It is also a second code path through every
flow, and removing it simplifies the rebuild considerably.

**Recommendation:** retire it. The new Main hero is the demo. Confirm.

### Q17. `MASTER-GUIDE.md` and `ULTIMATE-PRODUCT-FRAMEWORK.md`. Keep which?

86KB and 52KB. They overlap heavily. `README.md` calls the second one "the
masterguide" and does not list the first at all. `App.jsx:37` references the
second.

**Recommendation:** keep `ULTIMATE-PRODUCT-FRAMEWORK.md`, delete
`MASTER-GUIDE.md`. Confirm, since 86KB of product thinking is not something to
delete on my reading of a README table.

### Q18. Is the i18n layer kept?

`app/src/i18n/strings.js` is 619 lines and holds the canonical copy for the whole
product. There is one locale. `scripts/voice-lint.mjs` lints it.

Spec section 7 puts copy rules in `design/VOICE.md` and says nothing about
localisation.

- **A.** Keep the layer. All copy stays centralised and lintable.
- **B.** Drop it. Copy goes inline in components.

**Recommendation:** A. The voice lint tripwire is how the no em dashes rule stays
enforced automatically, and it needs one place to look.

---

## Process

### Q19. Branch naming conflict.

Spec section 0 says "Work on branch `rebuild/<phase-name>`."

My operating instructions for this session designate
`claude/rebuild-phase-1-audit-b8il00` and say never to push elsewhere without
explicit permission.

I used the designated branch. Say the word if you want `rebuild/<phase-name>` for
Phases 2 onward and I will use it.

### Q20. Do you want a pull request?

I have not opened one. Say so if you want one for this phase.

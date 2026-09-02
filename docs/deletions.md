# Deletion manifest

Nothing in this file has been deleted. Nothing gets deleted until you approve it
here, per `docs/rebuild-spec.md` section 0.

Approve by group. Write `APPROVED` next to a group heading, or reply with the
group letters you approve. A group with an open question against it cannot be
approved until that question is answered.

Supabase is on the free tier with no point in time recovery. Every database
deletion below is irreversible.

---

## Legend

| Mark | Meaning |
| --- | --- |
| SAFE | Verified unreferenced. No route, RPC name, function name, bucket name, or string lookup points at it. |
| CHECK | Referenced somewhere, or holds data. Reason stated. |
| HOLD | Do not delete under any circumstance until a specific question is answered. |

Per spec section 12, every candidate below was checked for string references as
well as imports. The method: grep for the bare name across `app/src`,
`supabase/`, `docs/`, `README.md`, `vercel.json`, and `app/.env.example`, plus a
check against the live database's function and table lists.

---

## Group A. HikerAPI. DONE in Phase 5. Required by spec section 5.

Total footprint: four files. There is no HikerAPI database object.

All four are handled. `celestual-resolve/index.ts` was rewritten rather than
edited, `app/.env.example` now documents `APIFY_TOKEN` and the resolver
endpoint, `docs/HANDLE-RESOLVER.md` was rewritten around Apify, and the
`supabase/README.md` row was rewritten. Nothing in the repository refers to the
old provider except this manifest, the Phase 1 audit, `docs/rebuild-spec.md`,
and `launchsteps.md` section 4, which spec section 5 requires by name.

| Item | Mark | Why |
| --- | --- | --- |
| `supabase/functions/celestual-resolve/index.ts` lines 33 to 34, 77 to 78, 191 to 219, 225 | CHECK | The `fromHiker` provider, the `HIKER_KEY` and `HIKER_BASE` constants, and the fallback chain. This is an edit, not a file deletion. The rest of the function is kept and reworked in Phase 5. |
| `app/.env.example` lines referencing `HIKER_API_KEY` | SAFE | Comment only. The key is a server side secret, never a Vite variable. |
| `docs/HANDLE-RESOLVER.md` | CHECK | Documents the two provider chain and the proxied avatar. Rewritten for Apify in Phase 5, not deleted. Linked from `README.md`. |
| `supabase/README.md` HikerAPI paragraph | CHECK | Edit. |

Not deleted, and worth being explicit about: the string `hiker` appears as a
value in the `source` column of `celestual_handle_cache` in production. That is
row data, not schema. It disappears with Group F.

Supabase secrets to remove are listed in `docs/launchsteps.md`. I will not remove
them. Spec section 0.

---

## Group B. The First Light trial and the recruitment program. DONE in Phase 7.

Q12 answered: the whole group. Everything below is deleted, with three
corrections found on the way and recorded in place:

- `app/src/growth.js` **stays.** It is marked CHECK with "verify its only
  consumer is the trial", and its consumer is `components/screens.jsx`, the
  placed screen. It was never the trial's.
- Dropping the tables meant redefining two live functions, not only dropping
  things. `celestual_admin_overview` returns `competitors` and counts visits and
  signups; `celestual_admin_delete_user` deletes a person's recruit rows as part
  of erasing them. `0034_retire_the_campaign.sql` rewrites both without them.
  `celestual_erase_account` and `celestual_suppress` look like they have the
  same problem and do not: 0023 already dropped their recruit deletes.
- The `trial.*` block in `app/src/i18n/strings.js`, 58 keys, is not on the list
  below and went with the screen that read them.

The four rows are exported before the drop, as `docs/launchsteps.md` section 2f.
Nothing here has been applied to production.


Spec section 10: "Delete the old marketing launch data and its UI."

I read that as this group. Confirm, because the phrase is ambiguous. See Q12.

### Files

| Item | Mark | Why |
| --- | --- | --- |
| `app/src/components/trial.jsx` | SAFE | 632 lines. `/trial` and `/recruit`. |
| `app/src/api/trial.js` | CHECK | 139 lines. Also exports `RESERVED_CODES`, imported by `App.jsx:32` and used by the four letter route matcher at `App.jsx:199`. That matcher goes with this group, so the export dies with it. |
| `app/src/api/recruit.js` | CHECK | 118 lines. `rememberRef`, `loadRef`, `countVisit`, `attributeSignup`, all imported by `App.jsx:31` and called at `App.jsx:262` and `App.jsx:566`. Those call sites are removed with it. |
| `app/src/trialContent.js` | SAFE | 83 lines. |
| `app/src/growth.js` | CHECK | 47 lines. Verify its only consumer is the trial before deleting. |
| `supabase/functions/celestual-trial/` | CHECK | 252 lines. Deployed and live. Undeploy before deleting the source. |
| `app/public/celestual-challenge.pdf` | SAFE | The competition brief. |
| `app/public/celestual-challenge.docx` | SAFE | Same. |
| `app/public/celestual-challenge.html` | SAFE | Same. |
| `docs/FIRST-LIGHT-TRIAL.md` | SAFE | Linked from `README.md`, which updates. |
| `docs/RECRUITMENT.md` | SAFE | Already marked RETIRED in the `README.md` doc table. |

### Routes

`/trial`, `/recruit`, `/r/:code`, and the bare four letter `/:code` matcher, all
in `App.jsx` `parseRoute` at lines 171 to 199.

Deleting the four letter matcher is a behaviour change worth naming. Any printed
or DM'd competitor link stops resolving. See Q12.

### Database objects

| Object | Rows | Mark |
| --- | --- | --- |
| table `celestual_trial_emails` | 3 | CHECK |
| table `celestual_recruits` | 1 | CHECK |
| table `celestual_recruit_visits` | 0 | SAFE |
| table `celestual_recruit_signups` | 0 | SAFE |
| function `celestual_trial_check` | | SAFE |
| function `celestual_trial_claim` | | SAFE |
| function `celestual_trial_code_ok` | | SAFE |
| function `celestual_trial_login` | | SAFE |
| function `celestual_recruit_attribute` | | SAFE |
| function `celestual_recruit_code` | | SAFE |
| function `celestual_recruit_invite` | | SAFE |
| function `celestual_recruit_open` | | SAFE |
| function `celestual_recruit_sign` | | SAFE |
| function `celestual_recruit_stats` | | SAFE |
| function `celestual_recruit_visit` | | SAFE |
| function `celestual_admin_delete_competitor` | | CHECK. Called by `components/admin.jsx`, which is rebuilt in Phase 7. |

The four rows in `celestual_trial_emails` and `celestual_recruits` are real
people who entered a competition. Deleting them is fine if the competition is
over. Confirm in Q12.

---

## Group C. Stripe and monetization. CLOSED. Nothing deleted.

Q3 answered: out of scope. Nothing in this group is touched, including the 2
rows in `celestual_purchases`. The rest of this section is kept as the record
of what was considered.

Original note:

The spec never mentions money. Not in the goal, not in the UI scope, not in the
identity model, not in admin. Silence is not an instruction to delete.

`celestual_purchases` holds 2 rows. Those may be real payments by real people.
Deleting a payment record is a financial and possibly legal act, and there is no
point in time recovery on this project.

Nothing in this group is deleted until Q3 is answered.

| Item | Rows | Mark |
| --- | --- | --- |
| `app/src/api/billing.js` | | HOLD |
| `supabase/functions/celestual-stripe/` | | HOLD. Deployed. |
| `supabase/functions/celestual-stripe-webhook/` | | HOLD. Deployed. |
| `docs/STRIPE-SETUP.md` | | HOLD |
| `docs/PRICING-REVENUE.md` | | HOLD |
| `PaidScreen`, `FourthSlotScreen` in `components/screens.jsx` | | HOLD |
| route `/paid` | | HOLD |
| table `celestual_purchases` | 2 | HOLD. Possible real payments. |
| table `celestual_entitlements` | 0 | HOLD |
| table `celestual_stripe_events` | 0 | HOLD |
| functions `celestual_billing_*`, nine of them | | HOLD |
| function `celestual_extra_slots`, `celestual_plan_until`, `celestual_cap_for` | | HOLD. Called by `celestual_submit`, which is core. |

---

## Group D. Dead server code.

| Item | Mark | Why |
| --- | --- | --- |
| `supabase/functions/celestual-search/` | CHECK | 85 lines. Instagram handle typeahead. Never deployed. Behind `VITE_HANDLE_SEARCH`, which is `0`. Superseded by Apify resolution in Phase 5. It is a generic pluggable proxy and contains no HikerAPI code, so it is a separate decision from Group A. Called via `functions.invoke('celestual-search')` in `app/src/api/handles.js`, which goes with it. |
| `app/src/api/handles.js` | CHECK | 134 lines. Only consumer of the above. Verify no other importer before deleting. |
| `supabase/functions/celestual-remind/` | CHECK | 180 lines. Never deployed. Its RPC `celestual_request_reminder` was dropped by `0006_ping_model.sql:207` and does not exist in production. Dead on both ends. |
| `supabase/functions/celestual-relogin/` | DELETED in Phase 4a | 192 lines. Never deployed. Q4 answered A: the shipped `celestual_login_lookup` path replaces it. Removing it orphans two live RPCs, `celestual_relogin_store` and `celestual_relogin_redeem`, which stay in the database because nothing here covers them. |
| `supabase/migrations/0015_identity_start.sql` | DELETED in Phase 4a | Never applied to production. Q4 answered A. Its only function, `celestual_handle_route`, existed nowhere but this file. |

---

## Group E. Communities and campuses.

Every table in this group is empty in production. The feature appears never to
have launched.

The spec does not mention communities, campuses, or `/c/:slug` anywhere.

| Item | Rows | Mark |
| --- | --- | --- |
| table `celestual_communities` | 0 | CHECK |
| table `celestual_community_members` | 0 | CHECK |
| table `celestual_campuses` | 0 | CHECK |
| table `celestual_campus_prereg` | 0 | CHECK |
| table `celestual_campus_mail` | 0 | CHECK |
| function `celestual_campus`, `celestual_campus_preregister`, `celestual_campus_reveal` | | CHECK |
| function `celestual_world_counts`, `celestual_set_worlds`, `celestual_is_member`, `celestual_slug` | | CHECK. `celestual_is_member` may be called from inside other functions. Verify with a pg_get_functiondef scan before deleting. |
| `app/src/communities.js` | | CHECK |
| `app/src/communityGalaxy.js` | | CHECK. 1,152 lines. |
| route `/c/:slug`, `CommunityScreen`, `WorldsScreen` | | CHECK |
| `app/public/schools/cmu.png`, `uc-berkeley.png`, `wesleyan.png` | | CHECK |

`celestual_members` is NOT in this group. It holds 36 rows and is the identity
table, not a community table. It is Phase 4b's problem.

Blocked on Q15.

---

## Group F. The old handle resolver tables. Replaced, not removed.

Spec section 5 defines `ig_profiles` and `handle_search_events`. These two tables
are what they replace.

| Object | Rows | Mark | Why |
| --- | --- | --- | --- |
| table `celestual_handle_cache` | 40 | MIGRATED, not dropped | Q7 answered: `handle`, `display_name` and `is_verified` are carried into `ig_profiles` by `0031`, with a null `avatar_path` so faces refill lazily. `pic_url` and `is_private` are not carried. The table itself is deliberately left standing: Q7 authorised migrating out of it and said nothing about dropping it, the free tier has no point in time recovery, and it is the source `0031` reads. Dropping it is `docs/launchsteps.md` section 4b, for once `ig_profiles` is answering. |
| table `celestual_handle_lookups` | 41 | DROPPED in Phase 5 | Q7 answered: counters only, against a window that no longer exists. `drop table if exists` at the foot of `0031`. |

---

## Group G. Documentation.

Twelve of the eighteen files in `docs/` are process history rather than
reference. The spec asks for a routable repo, section 12.

| Item | Size | Mark | Why |
| --- | --- | --- | --- |
| `docs/MASTER-GUIDE.md` | 86KB | CHECK | Not listed in the `README.md` doc table. Overlaps `ULTIMATE-PRODUCT-FRAMEWORK.md` heavily. Keep one. See Q17. |
| `docs/ULTIMATE-PRODUCT-FRAMEWORK.md` | 52KB | CHECK | Called "the masterguide" by `README.md`. Referenced by `App.jsx:37`. See Q17. |
| `docs/ORBIT-REDESIGN.md` | 32KB | CHECK | Design process record for a surface being rebuilt. |
| `docs/WALL-LAUNCH.md` | 9KB | CHECK | Same, for the Wall. Linked from `README.md` routes table. |
| `docs/STAR-CARDS.md` | 28KB | HOLD | Documents the card and reveal system. Spec 7.1 names the reveal moment as one of two signature surfaces. This is likely input to Phase 3, not deletion. |
| `docs/FIRST-LIGHT-TRIAL.md` | 12KB | SAFE | Group B. |
| `docs/RECRUITMENT.md` | 7KB | SAFE | Group B. Already marked retired. |
| `docs/STRIPE-SETUP.md` | 24KB | HOLD | Group C. |
| `docs/PRICING-REVENUE.md` | 9KB | HOLD | Group C. |
| `docs/PERSONAS.md` | 9KB | CHECK | Seven personas the design is scored against. May be input to Phase 2. |
| `docs/DEBUG-IG-WEBHOOK.md` | 19KB | HOLD | The DM code flow stays, spec section 4. This is its runbook. |
| `docs/EDU-VERIFICATION.md` | 11KB | HOLD | The `.edu` gate is required by spec section 3. This is its runbook. |
| `docs/MANYCHAT-SETUP.md` | 28KB | HOLD | Not in the `README.md` doc table. ManyChat carries the DM flow. |
| `docs/MANYCHAT-MUTUAL-DM.md` | 25KB | HOLD | Same. |
| `docs/SECURITY.md` | 23KB | CHECK | Describes the current privacy model. Rewrite rather than delete. |
| `docs/DESIGN.md` | 68KB | CHECK | Moves to `design/DESIGN.md` in Phase 2, rewritten. Not a deletion. |
| `docs/VOICE.md` | 12KB | CHECK | Moves to `design/VOICE.md`. Referenced by `scripts/voice-lint.mjs`, which updates. |
| `app/src/wall/README.md` | | CHECK | Prototype notes that stop being true once Phase 6a lands. |

---

## Group H. The old design surfaces. HOLD, pending Phase 3.

Spec section 2 retires the old design. But which modules die depends on what
Phase 3 builds, and spec 7.2 asks for a WebGL point field that already exists
here.

Nothing in this group is decided before Phase 3 is approved. Listed now so the
size is visible.

| Item | Lines | Note |
| --- | --- | --- |
| `app/src/components/screens.jsx` | 4,348 | Every old screen. Largest file in the repo. |
| `app/src/components/ui.jsx` | 1,770 | Primitives. Some may survive into the new system. |
| `app/src/galaxy.js` | 1,489 | |
| `app/src/communityGalaxy.js` | 1,152 | Also Group E. |
| `app/src/sky/` 13 modules | ~4,300 | The WebGL engine. Candidate to KEEP for spec 7.2. See Q14. |
| `app/src/card/` 9 modules | ~2,700 | The card and reveal system. Candidate to keep for the signature reveal surface. |
| `app/src/theme.js` | 376 | Replaced by design tokens. |
| `app/src/texture.js` | 290 | Procedural materials. Spec 7.2 wants generated grain, so this may survive. |
| `app/src/starSprites.js` | 156 | |
| `app/src/card.js` | 599 | |
| `app/src/demoData.js` | 94 | With `/demo`, see Q16. |
| `app/src/i18n/` | 691 | See Q18. |

---

## Group I. User data. CLOSED. Nothing deleted.

Q2 answered: only the `beta_*` tables, and all five hold zero rows. So no user
data is deleted anywhere. The table below is kept as the inventory, not as a
deletion list.

Original note:

Spec section 11 says "All existing beta user data is fake. Delete it."

The tables named `beta_*` are all empty. The data that exists belongs to the old
production product, and the spec does not say to delete that.

`supabase/wipe-all-user-data.sql` already exists in the repo for this purpose.
Reviewing and reusing it is likely better than writing a new script.

| Table | Rows | Note |
| --- | --- | --- |
| `celestual_ig_verifications` | 49 | Handle ownership proofs. |
| `celestual_handle_lookups` | 41 | Group F. |
| `celestual_placements` | 40 | Pings. |
| `celestual_handle_cache` | 40 | Group F. |
| `celestual_members` | 36 | Identity rows. |
| `celestual_dm_contacts` | 31 | ManyChat contact ids. Deleting these breaks the 24 hour DM window for those people. |
| `celestual_entries` | 30 | Hashed ping targets. |
| `celestual_dm_outbox` | 12 | Queued reveal DMs. |
| `celestual_attempts` | 8 | Rate limit rows. |
| `celestual_matches` | 7 | Mutual matches. Real connections between real people if the data is real. |
| `celestual_notifications` | 4 | |
| `celestual_settings` | 4 | Config, not user data. Do not delete. |
| `celestual_trial_emails` | 3 | Group B. |
| `celestual_purchases` | 2 | Group C. HOLD. |
| `celestual_edu_verifications` | 1 | |
| `celestual_recruits` | 1 | Group B. |
| `celestual_suppressions` | 1 | An opt out. Deleting this re enables pings against someone who asked not to receive them. Do not delete regardless of Q2. |
| all `beta_*` tables | 0 | Nothing to delete. |

Two rows in this group should survive any wipe on their own merits:
`celestual_suppressions`, because it records a person's opt out, and
`celestual_settings`, because it is configuration.

---

## Summary

| Group | Status | Blocked by |
| --- | --- | --- |
| A. HikerAPI | Ready, spec mandated | none |
| B. Trial and recruitment | Ready pending confirmation | Q12 |
| C. Stripe | CLOSED, nothing deleted | answered |
| D. Dead server code | Q4 items deleted in Phase 4a; `celestual-search` still open | `celestual-search` is Phase 5's |
| E. Communities and campuses | Ready pending confirmation | Q15 |
| F. Old resolver tables | Ready pending confirmation | Q7 |
| G. Documentation | Partly ready | Q17 |
| H. Old design surfaces | HOLD until Phase 3 approved | Q14, Q16, Q18 |
| I. User data | CLOSED, nothing deleted | answered |

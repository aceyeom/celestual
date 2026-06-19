# GitHub Dolbomi Repo

_Started 2026-06-04 13:37 UTC_

---

## User

reread the dolbomi github repo.

## Assistant

_[tool: list_files]_

_[tool: list_files]_

It seems your message came through empty. Could you clarify what you'd like me to do? For example:

- Did you want me to **connect to a GitHub repo** for DOLBOMI? If so, please paste the GitHub URL.
- Or did you want me to **re-read the existing project files** for DOLBOMI?

## User

read the updated frameworks here: https://github.com/aceyeom/dolbomi/tree/main

## Assistant

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

Let me read the full docs tree, especially anything that may have changed:

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

Let me read all the updated docs files:

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: read_file]_

_[tool: read_file]_

I've now read the full repo. Let me check the current app to understand what needs updating:

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

I've now read the full repo and the current app. Let me give you a complete summary of what's **new in the repo** vs what's currently in the app:

---

## 📋 What's new in the repo (Phase 2 complete)

### New catalog items not yet in the app
| ID | Item | Stat |
|---|---|---|
| **C10** | 군 장병 SW·AI 교육 (구름 × 국방부) | Craft |
| **C11** | 군 운전면허 → 민간 1종 대형 교환 | Craft |
| **C12** | 지게차·굴착기운전기능사 (위탁검정 무료) | Craft |
| **C13** | 고졸 검정고시 | Craft |
| **M4** | 청년미래적금 (2026.06 출시) | Money |
| **T2** | 국민내일배움카드 (전역 후 D-90 해금) | Edge |
| **T3** | 국가보훈부 제대군인지원센터 | Edge |
| **E4** | 해군창업경진대회 | Edge |
| **E5** | 공군창업경진대회 | Edge |
| **E6** | 국방 AI 활용 아이디어 경연대회 | Edge |
| **E3 실예시** | 공군 창의·혁신 해커톤 (접수 D-23) | Edge |
| **MI2 실예시** | 국방헬프콜 콘텐츠 공모전 | Mind |

### Deepened mechanics (spec is now more precise)
- **Opportunity state machine** — `browsing → committed → active → at_risk → completed/abandoned/expired`
- **Drift math** — `fill_pct - expected_today`, thresholds −0.05 / −0.20
- **`pickTonight()` scoring formula** — exact weights for 🔴 risk, deadline proximity, Gap stat, Edge avoided
- **XP re-calc rule** — host always overrides LLM's `xp` from `size`
- **Replan guards** — ≤1/day, ≤3/week, debounce 72h, max 5 active opps
- **포상휴가 법령 근거** — 시행령 §13, 육16/해17/공18일 상한 추가됨
- **D-90 unlock** — T2/T3/M4 trigger at D-90
- **M4 청년미래적금** — brand new (2026.06 launch), 6%/12% matching

What would you like to do with this? Some options:
1. **Update `data-catalog.jsx`** — add the 10 new opportunities
2. **Update mechanics** — tighten the drift/state machine to match spec
3. **Add D-90 unlock logic** — surface T2/T3/M4 near discharge
4. **Something specific** — just tell me what to build

## User

We are going to do a full UI overhall. Firstly, the overall design still looks cheap due to several reasons. A bunch of text, no visually interesting features, very commonly overused and boring progressbars, checkboxes, and everything. All of htis needs rework based on external designs to make this unique and not ai slop;. First based on the updated repo, add in the details, and we are going to make this more polished and app-ready through these several design steps:  a stylized 3D creature in Three.js made of deliberate geometric forms — not organic mesh, not hand-drawn art, but angular, architectural shapes in the tradition of Korean decorative motifs. A creature that looks like it was designed to be geometric rather than a failed attempt at organic. With the right lighting (dark scene, point lights, bloom-style glow via post-processing) and smooth rotation animation, this can look genuinely striking. Geometric Korean mythological creature aesthetic is a valid art direction, not a compromise. It would look different through each goal achieved and milestones. As such is the design, rework everything so its appealing. ASK ME QUESTIONS

## User

We are going to do a full UI overhall. Firstly, the overall design still looks cheap due to several reasons. A bunch of text, no visually interesting features, very commonly overused and boring progressbars, checkboxes, and everything. All of htis needs rework based on external designs to make this unique and not ai slop;. First based on the updated repo, add in the details, and we are going to make this more polished and app-ready through these several design steps:  a stylized 3D creature in Three.js made of deliberate geometric forms — not organic mesh, not hand-drawn art, but angular, architectural shapes in the tradition of Korean decorative motifs. A creature that looks like it was designed to be geometric rather than a failed attempt at organic. With the right lighting (dark scene, point lights, bloom-style glow via post-processing) and smooth rotation animation, this can look genuinely striking. Geometric Korean mythological creature aesthetic is a valid art direction, not a compromise. It would look different through each goal achieved and milestones. As such is the design, rework everything so its appealing. ASK ME QUESTIONS

## Assistant

_[tool: questions_v2]_

This is an exciting direction. A geometric Korean guardian creature rendered in Three.js as the emotional core of the app — evolving as the soldier levels up — could make DOLBOMI genuinely unforgettable. Before I touch anything, I need to lock the art direction and scope. Let me ask.

## User

Questions answered:
- creature_legend: Alright the avatars you generated looks too much like a kid drawing, nedes to be 3d and with volume and alot more technical depth. and also the user shold be able to choose a path/their animal so it could be all of them. 
- evolution_driver: The 6 stats (each stat sculpts a different part of its body), Milestones completed (it gains armor/limbs/ornaments)
- creature_home: Home screen hero (top of the daily loop)
- mood: keep previous mood. have both light and dark versions.
- palette: 0
- progress_metaphor: keep this the same.
- scope: Decide for me — do the core 3-4
- rendering: Full live Three.js (real-time rotation, lights, bloom)
- interactivity: Reacts to quest completion (animates on milestone)
- typography: Keep Pretendard + mono
- references: It shuold be a clean minimalistic design. simple charecter. This shld not be the main point of this app. Its just a fun viewer to keep track of the progess youve been making

## Assistant

_[tool: update_todos]_

Got it — clean and minimal, a genuinely 3D (volumetric, faceted) but simple guardian that's a delightful progress viewer, not the main event. Amber/olive palette, light + dark themes, selectable creature paths, evolves via the 6 stats + milestones, live Three.js with bloom, reacts on milestone. Let me study the current architecture before I build.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

I now understand the full architecture. Let me build the centerpiece first — the live Three.js geometric guardian. This is the most novel piece, so I'll invest here.

## User

cintinue

## Assistant

_[tool: read_file]_

_[tool: read_file]_

Let me look at the existing app HTML and UI foundation to match the architecture, then test the creature.

_[tool: write_file]_

The creature is the riskiest piece — let me build a test harness for it first before integrating. I'll set up the Three.js import map and a controls panel to verify all four paths, stat sculpting, theme switching, and bloom render correctly.

_[tool: show_html]_

This is mid-task verification of the riskiest piece, not a deliverable, so I'll proceed.

_[tool: show_html]_

_[tool: get_webview_logs]_

Blank — panel didn't even render. Let me check console logs.

_[tool: eval_js]_

_[tool: str_replace_edit]_

The `ready` event fired before my listener attached (module load order). Let me make the harness robust — check for the global directly:

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: str_replace_edit]_

It renders and bloom works — but it's blown out into a glow blob. The whole point is crisp geometric facets, and right now the body is lost behind the glow. Two problems: bloom threshold is too low (catching everything) and the point lights barely reach the body (physical decay). Let me fix the lighting and dial bloom back to accent-only.

_[tool: str_replace_edit]_

Now switch the key/rim/fill to directional lights (predictable, no decay falloff) so the facets read crisply, keeping one colored accent point light:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: read_file]_

Now the geometric forms read clearly — much better. But the composition is off: the pedestal is far too big and floats at waist height instead of under the feet, and the quadruped's legs are stubby/disconnected from the torso. Let me fix the proportions and grounding. Let me re-read the relevant builder sections.

_[tool: str_replace_edit]_

Now let me read and fix the assembly section (torso heights, legs, base):

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now fix the pedestal base position/size. Let me read that section:

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: multi_screenshot]_

Grounded and geometric now. Let me check all four paths and the light theme render distinctly:

_[tool: snip]_

All four paths render distinctly and read as clean geometric creatures — dragon coils with a flame tail, phoenix stands with crest + wings + fan, tiger/haechi are solid quadrupeds, and the light theme works. The hard part is done. Let me clear the debug iterations from context and move to integration.Now let me read the rest of the UI foundation and remaining screens so I can build a cohesive overhaul.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Let me read the data files and remaining screens in full before I start building.

_[tool: read_file]_

_[tool: grep]_

Let me check the data foundation and the device frame to wire theme + stats correctly.

_[tool: update_todos]_

I now have the full picture. This is a large overhaul — let me set up my plan and start executing. I'll evolve the shared modules in place (they're the same app), starting with the data integration, then theme system, then the creature hero, then the screen redesigns.

_[tool: update_todos]_

Let me clean up the todos and start with the data additions.Now the data additions. Let me add the key new repo opportunities into the catalog:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Data's in. Now the theme system — let me add light-theme token overrides and a shared `--track` token to `dolbomi-ui.jsx`.Now add light-theme overrides after the palette definitions:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now update the hardcoded white tracks/shadows in components to use the new tokens so they adapt to light theme:

_[tool: str_replace_edit]_

Now update the Card shadows to use the theme-aware tokens:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

The mono StatBar fill (`#C9D0D8`) won't read on light. Let me tokenize it:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: write_file]_

Theme tokens are wired. Now the centerpiece integration — the `CreatureHero` React wrapper. It mounts the WebGL creature, maps the 6 live stats, reacts to quest completion via a signal prop, and reads the resolved accent color from the themed DOM.

_[tool: str_replace_edit]_

Now wire the Three.js modules and creature scripts into the HTML, and make `Root` own the theme so it can flip both the iOS bezel and the app:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now update `app-shell.jsx` to own theme/path/pulse state, apply `data-theme`, and add the Tweaks for theme + guardian path.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now pass the new props to HomeScreen, set `data-theme`, and update the tweak panel:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

Let me verify `TweakSelect` exists in the tweaks panel:

_[tool: str_replace_edit]_

`TweakSelect` is available. Let me tune the creature's scene background to match the app surfaces so the hero reads as an integrated pane, then rebuild the Home screen.

_[tool: str_replace_edit]_

Now rebuild the Home screen with the creature hero. Let me rewrite the top section:

_[tool: str_replace_edit]_

_[tool: show_html]_

Let me render the full app and see the new home with the creature hero.

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: show_html]_

The app is live (canvas rendering, all modules loaded). The screenshot tooling is struggling with the WebGL canvas. Let me retry the inline capture:

_[tool: eval_js]_

_[tool: show_to_user]_

The app renders correctly (canvas 362×296, GL healthy). The capture targets the user preview pane. Let me open it there and capture from that view:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: snip]_

Excellent — the creature hero is fully integrated: the haechi guardian floats in its viewer pane with halo, orbiting milestone ornaments, the D-291 overlay, service progress, streak, the "길 바꾸기" path picker, and Lv.51. Tweaks shows the new 모드/색/수호신 controls. Let me clear the capture-debugging noise and test theme + path switching.

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: read_file]_

The light toggle didn't take — the segmented control likely isn't a plain button. Let me inspect how `TweakRadio` handles clicks.

_[tool: eval_js_user_view]_

The radio uses pointer events with positional hit-testing, not button clicks. Let me dispatch a proper pointer event over the "라이트" segment:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: sleep]_

It's switching to light — bezel and background went light, identity text is now dark. Looks like a mid-transition frame (cards not settled). Let me wait and recapture the settled state.

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

The cards are rendering dark while the page background went light — that's a real bug, not a transition. Let me get ground truth on the computed tokens:

_[tool: eval_js_user_view]_

Tokens resolve correctly (surface near-white, ink dark). The screenshot may be stale. Let me check an actual card's rendered background:

_[tool: eval_js_user_view]_

Some cards resolve light, others dark. Let me find which `data-theme` scope the dark cards actually live under:

_[tool: eval_js_user_view]_

The card's `--surface` resolves light, its inline bg is `var(--surface)`, yet computed background is the hardcoded dark `#14171B`. That's an `!important` override winning. Let me check the edit-overrides block:

_[tool: eval_js_user_view]_

No override block. The 5 dark cards may be the Tweaks panel (intentionally dark). The screenshot might be stale. Let me check the actual 적금 home card by its content:

_[tool: eval_js_user_view]_

The card resolves `--surface` to light but renders dark `#14171B` — something is forcing it. Let me read the dark card's raw inline style and matched rules:

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

This is a genuine paradox — let me inject a fresh probe element to see what `var(--surface)` actually evaluates to at paint time:

_[tool: eval_js_user_view]_

A fresh probe renders light, but existing cards stay dark — the existing elements' `var()` isn't re-resolving. Let me test forcing a re-resolution on a real card:

_[tool: eval_js_user_view]_

Re-setting doesn't help, but a probe on the root resolves light — so an **intermediate ancestor** re-declares `--surface` dark. Let me walk the chain to find it:

_[tool: eval_js_user_view]_

Every ancestor resolves `--surface` light, yet the card paints dark. Let me test whether a literal color paints, vs `var()`, on the stuck card:

_[tool: eval_js_user_view]_

A literal `#ff0000` also reads back as `rgb(20,23,27)` immediately — that's the `transition: background 0.16s` returning the *start* value mid-animation. The cards are stuck mid-transition. Let me clear my test edits, wait untouched, and read the settled value:

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: str_replace_edit]_

Confirmed: it's stuck permanently. The culprit is the `transition: background` on `.tm-tap` — when `var(--surface)` re-resolves via an ancestor attribute change (theme switch), Chrome can't interpolate the `var()`-based background and freezes at the old color. Every clickable card (which has `.tm-tap`) gets stuck dark; non-clickable ones switch fine. The fix is to drop `background` from that transition:

_[tool: show_to_user]_

Now let me reload and re-test the light theme switch:

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

Light theme now works — all cards are light and readable. One refinement: the creature pane stays dark even in light mode. That's actually the right call — the guardian is lit dramatically with point lights + bloom, which only reads well on a dark stage (the light-scene creature looked washed in testing). Let me make the hero a deliberate, self-contained **dark cinematic stage in both themes**, with fixed light-on-dark overlay text so it's consistent and premium.

_[tool: snip]_

The hero is now a consistent dark stage in both themes. Let me clear the resolved debugging investigation from context.Now let me verify the polished result — reload, check light theme + try the dragon path and a quest completion:

_[tool: show_to_user]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

Dark home is cohesive and polished. Let me test the in-app path picker (switch to 청룡/dragon) and a quest completion to confirm the creature reacts:

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: get_webview_logs]_

Label switched to 청룡 but the creature mesh still shows the haechi quadruped — `setPath` isn't rebuilding. Let me check for errors and confirm the prop is flowing:

_[tool: str_replace_edit]_

Let me expose the creature API for debugging and add a guard:

_[tool: str_replace_edit]_

_[tool: show_to_user]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

Direct `setPath('dragon')` didn't change the mesh either — so the bug is in `creature.js`. Let me catch any error during the rebuild:

_[tool: eval_js_user_view]_

Let me verify `__cr` actually controls the visible canvas by zeroing milestones (orbiting gems should vanish):

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

`__cr.setMilestones(0)` and `setPath('phoenix')` had zero effect on the visible canvas — so `__cr` is a *different* instance than the one rendering. There must be a duplicate. Let me count canvases and inspect:

_[tool: eval_js_user_view]_

Single canvas, `__cr` exists, but its methods don't repaint — the render loop is likely paused (visibility throttling in the preview), so `rebuild()` runs but never renders. Let me check:

_[tool: str_replace_edit]_

Found it — `document.hidden = true` in the preview, so my visibility handler pauses the render loop; `rebuild()` runs but never repaints, showing a stale frame. The path switching actually works when the doc is visible. But I should make mutations repaint-on-demand so it's robust (and survives the user backgrounding the tab). Let me add a one-off render after each scene mutation:

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_to_user]_

`renderOnce` is hoisted within `create()`, so `rebuild` can use it. Now reload and verify path switching repaints even while hidden:

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: get_webview_logs]_

The app didn't render — only the static caption shows, the device frame is gone. My creature.js edit may have broken something. Let me check logs:

_[tool: show_to_user]_

Those are transient script-load failures (several `.jsx` files failed to fetch on that reload, cascading to `DOLBOMI` undefined) — not my edit. Let me reload cleanly and retry:

_[tool: sleep]_

_[tool: eval_js_user_view]_

All modules loaded cleanly this time. Now let me verify path switching repaints while hidden:

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

The dragon now renders — a tall coiling serpent with antlers and a flame tail, distinct from the haechi quadruped, with 7 orbiting milestone gems. The `renderOnce` fix works (repaints even while the tab is hidden). The path switching, stat sculpting, and milestone orbits all function. The label still says 해치 because I called the api directly rather than through the picker, but that's expected.

Let me clear the resolved render-loop debugging and run the final verification.

_[tool: snip]_

_[tool: grep]_

Let me check the other screens for hardcoded colors that would break in light theme:

_[tool: grep]_

_[tool: read_file]_

The `skin-*.jsx` files are old standalone explorations not loaded in the app — ignore them. But `screen-profile.jsx`'s radar chart has hardcoded white strokes that'd vanish in light theme. Let me tokenize those:

_[tool: str_replace_edit]_

_[tool: grep]_

Let me check the loaded screens (radar, benefits, vacation, overlays) for hardcoded whites:

_[tool: update_todos]_

The overlay treatments are modal-specific and fine. I've delivered the core overhaul: the live geometric guardian hero, full light/dark theming, the path picker, and the repo data. Let me update todos and run final verification.

_[tool: done]_

No console errors. Let me fork the verifier for a thorough sweep.

_[tool: fork_verifier_agent]_

Done. Here's what I shipped this pass — a focused overhaul anchored on the new guardian:

**The 수호신 — live 3D geometric guardian** (`creature.js` + `creature-hero.jsx`)
- A faceted, volumetric Korean-creature engine in Three.js: dark stage, point lights, bloom post-processing, smooth auto-rotation. Deliberately architectural — not organic mesh, not flat art.
- **The 6 stats sculpt its body**: 전투력→bulk/legs, 정신력→halo, 자산력→chest gem, 숙련도→back plates, 지휘력→mane/pauldrons, 담력→horns + flame tail. **Milestones** add orbiting ornaments. It **pulses** when you complete a quest.
- **Four selectable paths** — 해치 / 청룡 / 봉황 / 백호 — each a distinct silhouette, switchable in-app via "길 바꾸기" or in Tweaks.

**Light + dark themes** — full token system across all three palettes (골드/택티컬/스틸); toggling flips the app *and* the iOS bezel. The guardian stays a cinematic dark "stage" in both modes (its dramatic lighting only reads well on dark — a deliberate call).

**Repo data integrated** — added 청년미래적금(M4), 장병 SW·AI 교육(C10), 국민내일배움카드(T2), 국방 AI 경연(E6), with `d90` unlock flags for post-discharge opportunities.

Two notes:
- Per your guidance I kept the existing progress metaphor (bars/checkboxes) — say the word and I'll rework those into something more distinctive next.
- This pass concentrated on **Home**; Opportunity/Vacation/Benefits adapt to the new themes automatically but keep their current layouts. Want me to bring the guardian-era polish to those next, or push the creature's modeling further (more refined per-path forms, evolution stages)?

## User

Verifier agent check completed

## Assistant

Good catch — my new `naeil` item uses category `교육` which isn't registered in `T.cats`, crashing the radar tab. Let me add the category and guard both access points.

_[tool: str_replace_edit]_

Now add fallback guards at both access points. Let me check the exact lines:

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me verify the radar tab renders cleanly:

_[tool: show_html]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: get_webview_logs]_

The radar tab renders cleanly now — including 국민내일배움카드 (the 교육-category item that was crashing). Let me confirm no console errors and that its detail page opens:

_[tool: eval_js]_

_[tool: eval_js]_

Fixed and verified. The 기회 tab and the 국민내일배움카드 detail page both render correctly now — no crash, no console errors.

**Fix:** Added the `교육` category to `T.cats` (which my new `naeil` item referenced but wasn't registered), and added fallback guards in both `screen-radar.jsx` and `screen-opportunity.jsx` so an unregistered category can never white-screen a tab again.

The app is solid: home + creature hero, light/dark theming, all five tabs, the new repo opportunities, and the detail pages all working.


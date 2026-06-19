# Opportunity Page Text Legibility

_Started 2026-06-05 10:35 UTC_

---

## User

in the opportunity page, the text looks blurred from the image background, can you fix this somehow, like a gradient or a opaqueness? also remove the discharge saving balance from the homescreen. Think about the product, the homepage shold be more direct and easy like toss.  and the 6 stats should be experience poitns that is tied to the avatar.  also translate the fixed design across the other pages, especially the profile needs work.

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: show_html]_

## User

in the opportunity page, the text looks blurred from the image background, can you fix this somehow, like a gradient or a opaqueness? also remove the discharge saving balance from the homescreen. Think about the product, the homepage shold be more direct and easy like toss.  and the 6 stats should be experience poitns that is tied to the avatar.  also translate the fixed design across the other pages, especially the profile needs work. SECONDLY, for the avatar,have like an appropriate background. forexample for the ram, add like a forest background thats best suited perhaps 3d generated assets?

## Assistant

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: show_to_user]_

_[tool: save_screenshot]_

_[tool: read_file]_

Let me read the key screen files to understand the structure.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: update_todos]_

I now understand the full architecture. Let me lay out the plan and start. The guardian is a 3D marble **ram** (creature.js), shared via `CreatureHero`. I'll tackle all five asks.

_[tool: str_replace_edit]_

Starting with the forest environment for the ram. Let me add the config and texture helper at module scope:Now add the bgGroup and buildEnvironment inside `create()`. First the group declarations:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire the call, mist animation, setTheme/setPath, and dispose:

_[tool: read_file]_

The forest is wired. Let me verify it renders before continuing — there's a `creature-test.html`:

_[tool: show_html]_

_[tool: write_file]_

The forest grove looks exactly right — misty conifers, warm glow pool, fireflies. Now let me build the shared `GuardianHero` component that both home and profile will use:

_[tool: str_replace_edit]_

Now wire the new script into the HTML:

_[tool: str_replace_edit]_

Now rewrite the Home screen — swap in the shared hero, drop the 적금 card, reframe the six stats as avatar XP:

_[tool: str_replace_edit]_

Now reframe the six-stats section on Home as the avatar's XP:

_[tool: str_replace_edit]_

Let me make the XP framing explicit in the shared `StatBar`:

_[tool: str_replace_edit]_

Now the profile rebuild — make the avatar its centerpiece. First pass the needed props from the shell:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the opportunity hero legibility — strengthen the scrim so the title reads on any image:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

Now let me render the full app and check it:

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: show_to_user]_

The app loads cleanly (no JS errors). The screenshot tool needs the user preview pane — let me open it there and capture:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

Home looks great — forest grove ram, evolution rail, 적금 removed, cleaner Toss-like flow. Let me check the profile page:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

Profile now leads with the avatar in its grove — strong identity. Let me make the evolution-rail label single-line to avoid any wrap, then check the opportunity page:

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

This is the list. Let me open an opportunity detail to verify the hero text fix:

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: update_todos]_

All five changes are in and verified visually — the opportunity title now reads cleanly over the darkened scrim. Let me finalize:

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Here's what changed across the DOLBOMI app:

**Avatar habitat (the ram).** The guardian now stands in a misty 3D conifer grove — gradient sky, fog, two depth-layers of trees, drifting mist bands, and a warm glow pooled at its feet. The grove re-tints per path (green grove for 해치, river-blue for 청룡, ember for 봉황, dawn-gold for 백호).

**Opportunity legibility.** Strengthened the hero scrim (deeper bottom ramp + a second soft gradient) and added a layered text-shadow, so the title reads cleanly on any photo.

**Home, Toss-direct.** Removed the 전역일 예상 적금 card. The flow is now: identity → guardian → 60s check-in → tonight's 3 → stats → one line.

**Six stats = avatar XP.** Relabeled to "능력치 · 경험치" with XP values, and the six stats' total XP now drives an **evolution rail** right on the hero (각성기 → 성장기 → 성체 → 정예 → 수호신), so the connection between effort and the creature is explicit.

**Profile rebuilt.** The avatar is now the identity — the same hero card (with name/rank/evolution) leads the page, followed by the XP radar and titles, unifying the design language.

Note: the four guardian paths still share the one ram mesh (tinted), so the grove is the main per-path differentiator for now — dedicated meshes would be a larger lift if you want distinct creatures later.


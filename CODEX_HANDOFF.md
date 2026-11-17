# Fromm Viewer — cross-account handoff

Last reviewed: 2026-11-17 (Asia/Seoul)

## Flat Replay/Channel header filters — 2026-11-17 (Asia/Seoul)

User explicitly authorized this filter adjustment plus merge/deployment (“상단바 … 필터 … 유리효과 … 빼고 … PR135번이랑 같이 병합배포”). PR #135 is already merged/deployed at `08385838b9817364577ed13e996ccb40776995ab`; documentation-only PR #136 has now also merged at `69fd5c05c70e6babf8ce25551a017be1c8d01a16`. Continue the existing feature branch from `e795c9685a2d9b178f5f9b49832b765a812b6398`; no open PR existed when this batch began. This explicit approval covers merging/deploying the current filter fix after its checks pass.

Removed both active and inactive `.replay-filter` pills from the control engine's discovery/selected selectors. Replay and Channel share these filters. Their native filtering, theme-token fill/text/border, selected state and hover remain; selected filters no longer gain the extra inset rim. Other header/action controls retain their existing optics. Updated only relevant stylesheet/module cache versions. Extended the existing collection-header regression to check no optical face/attribute, no backdrop filter and no shadow on active/inactive filters across all six palettes in both modes.

Validation: Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34. Units 278/278 passed. Full collection-header browser suite passed desktop 1440/900/760/701, installed 900, touch 390; native filtering/counts/selection/refresh/keyboard/sticky geometry retained. Full glass-controls browser suite passed PC 1440/760, installed 900, touch 390 and missing-observer fallback, including real synthetic downloads, other optical controls and lifecycle/reduced-motion cleanup. Complete diff and CRLF-aware whitespace checks pass. Synthetic fixtures only; no user data/cache operations. Actual signed-in service/CDN and physical Mac/Safari remain unverified. Local receipts: `/workspace/header-filter-20261117/{header,unit,glass-controls}.log`; public verification scripts are prepared there for after deployment.

Resume: locate the new PR with `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup`; wait for all fresh exact-head checks before the approved merge. Explicitly refresh main using `git fetch origin main:refs/remotes/origin/main`. After Pages deployment, run `NODE_USE_ENV_PROXY=1 node /workspace/header-filter-20261117/verify-production.cjs MERGE_SHA` and `NODE_USE_ENV_PROXY=1 node /workspace/header-filter-20261117/verify-filters.cjs MERGE_SHA`, then record the deployed receipt.

## Documentation organization — 2026-11-17 (Asia/Seoul)

User selected “문서·개발 자료부터 정리 (추천)”; JS/CSS/runtime reorganization is outside this batch. Continues on `codex/fromm-viewer-uiux-stabilization-20261114` from receipt `fa6e9f33c9473bd0b88647c3d75f192e34c1e692`; fetched production main remains PR #135 merge `08385838b9817364577ed13e996ccb40776995ab`. No open PR existed at the start. Locate the new review with `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup`. No new merge/deploy approval is implied by the completed prior release.

Moved 37 Markdown documents without deleting their content: 11 root feature guides into `docs/guides/`; six root development/verification notes into `docs/development/`; 17 old `docs/*_HANDOFF.md` records into `docs/development/handoffs/`; three review reports into `docs/development/reviews/`. Current `README.md`, `AGENTS.md` and `CODEX_HANDOFF.md` remain at root. Root Markdown files decrease from 20 to 3 (root files 56 to 39). Design/performance assets stay at their existing paths. Added document, development and prior-handoff indexes; root README now links the guides and explains the repository layout. Historical document bodies/statuses remain historical; only relative link destinations are rebased.

Validation: `/workspace/repo-docs-20261117/verify.py` confirms all 221 original local link destinations are preserved, new index links resolve, no broken local links exist, all 37 moved bodies are unchanged apart from links, and all 414 tracked non-Markdown files are byte-identical to the pre-cleanup head. This includes web entry/scripts/styles, manifest/service worker, assets, extension ZIP/source, native helper, vendor/licenses, tests and workflows. Markdown/path and CRLF-aware diff checks pass. No app/browser tests were rerun for this documentation-only change; runtime bytes have not changed. External historical URLs were not crawled. Receipt/move map: `/workspace/repo-docs-20261117/before.json`, `verification.json`, `verify.py`.

## PR #135 merged and production verified — 2026-11-17 (Asia/Seoul)

The user's explicit “일단 병합 배포해보자” approval has been fulfilled. PR https://github.com/fffdsaw/fromm-viewer/pull/135 merged at 2026-11-17T04:30:02Z. Exact tested head `e660ed057a1d71855f2958d64d13a81d30cc875a` passed all ten hosted checks after the obsolete menu-spring test expectation was corrected; no app code changed during that release correction. Production merge/main is `08385838b9817364577ed13e996ccb40776995ab`, whose tree matches the tested head exactly. This receipt is backed up on the existing feature branch after deployment. This completed approval does not authorize a later release.

Pages deployment https://github.com/fffdsaw/fromm-viewer/actions/runs/44017599654 and hosted public verification https://github.com/fffdsaw/fromm-viewer/actions/runs/44017601150 both succeeded. Separate local public verification compared 27 deployed HTML/CSS/JS assets against the merge commit's SHA-256 hashes, then checked fresh anonymous login, waveform/shared-player/playlist/glass modules, live preview and Classic persistence with zero page errors. One initial asset request returned transient HTTP 503; a complete retry passed all 27 assets and browser smoke. The first failure log is retained separately.

A second isolated Chromium session using actual production assets and synthetic state verified direct pointer alignment with unit scale/no settling; collapsed artist's single 2px outline with no extra face/fill/side marker; identical glass face/filter after scrolling away and returning; and selection/Save/clear controls. Zero page errors. Selection-toolbar visibility/animation remains unchanged, as item 6 was excluded. The release includes items 1–5 only. No real account/chat data, user cache deletion or external message sends were used. Physical Mac/high-refresh FPS, Safari and actual signed-in service/CDN behavior remain unverified.

Production: https://fffdsaw.github.io/fromm-viewer/?v=20261117-direct-optics . Receipts: `/workspace/deploy-135-20261117/` (`ci-final.json`, `merge-refs.json`, `merge-result.json`, `pr-merged.json`, `pages-final.json`, `production-135-verified.json`, `production-interactions.json`, screenshots/scripts/logs). Repeat checks: `NODE_USE_ENV_PROXY=1 node /workspace/deploy-135-20261117/verify-production-135.cjs 08385838b9817364577ed13e996ccb40776995ab`; same command with `verify-interactions.cjs`. Refresh main explicitly with `git fetch origin main:refs/remotes/origin/main` because the default fetch refspec selects only the feature branch.

## PR #135 release approved, regression expectation corrected — 2026-11-17

The user explicitly approved merging/deploying PR https://github.com/fffdsaw/fromm-viewer/pull/135 with “일단 병합 배포해보자”. This supersedes the review-only status below for this release. At code head `e5e812d44b7a9ce0573c907699a15b50d92fae41`, nine hosted checks passed; Channel browser run `44014479376` failed at `test/menu-settings-queue.browser.cjs` because that test still required spring-style intermediate movement after a completed hover input. The user explicitly requested removing that behavior.

Updated only the obsolete motion assertion: it now verifies direct target alignment, constant height, unit scale and no autonomous settling after the pointer stops. Native focus, unchanged artist markers, settings installation/viewport restoration and actual Replay/Channel sequential-download assertions remain intact. The complete menu-settings-queue suite passes locally (`/workspace/deploy-135-20261117/menu-test.log`). Other motion/spring assertions were searched: remaining spring assertions belong to the unchanged Save capsule; sidebar motion suites already cover direct input and real glyph refraction. No application code changed during this correction. Wait for fresh exact-head CI before merging. Production remains `516af31c0c0168358480362904a54ea8b9970df2` until the approved merge/deployment completes.

## Reused media optics and direct sidebar tracking — 2026-11-17 (Asia/Seoul)

User authorized items 1–5 only. Selection-toolbar visibility/animation changes (item 6) are explicitly excluded; its selection count, select-all, Save and clear behavior stay as deployed. Continues from feature receipt `8cc4e2660d8a8968278bef69ecdc9b69cd0c8f55`; production/main remains PR #134 merge `516af31c0c0168358480362904a54ea8b9970df2`. This is a new review batch, not approved for merge/deploy. Continue on `codex/fromm-viewer-uiux-stabilization-20261114`; no open PR existed at the start.

- Collapsed PC artist selection has one 2px theme-accent avatar outline, without the row fill, side marker or second optical face. The selected artist only owns a control engine while expanded; collapse removes it. Expanded styling and mobile layout remain intact.
- Media controls prewarm about one viewport ahead. Completed engine/filter objects remain attached to connected controls; distant filters suspend and nearby filters resume the same SVG map instead of destroying/recreating it. Cold unfinished builds resume through the app's guarded build path. Unmounted controls, engine OFF, accessibility/page lifecycle and theme changes still clean up engines. There is no engine count cap. Retention uses more map memory for still-mounted visited controls in exchange for avoiding repeated work; distant filters are detached from rendering.
- Discovery/observer registration runs on relevant DOM/state changes, not every intersection/pointer callback. Near candidates come from the intersection set, and engine membership uses a Set. The inactive mobile observer ignores PC decorative mutations. This removes work during media scrolling without changing scroll input, refresh rate, media loading or the conversation/cache engines.
- Sidebar optics again work on ordinary pointer movement. Position follows the actual input once per frame, including row gaps; no spring, scale/stretch, easing, settling loop or press-to-drag selection remains. Actual glyph refraction/RGB dispersion, flat selected menu, native click/keyboard routes and accessibility behavior remain. Engine face layers stay transparent across themes and press states; base selection colors remain.

Validation: Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34, synthetic data only. Units 278/278 pass. New `glass-scroll-reuse.browser.cjs` passes ahead-of-view preparation, parked filters, exact same-filter return, no builds/disposals across a warmed path, cached discovery, six clear palettes, one collapsed outline and unmount cleanup. In an isolated comparison against archived production `516af31`, repeating the same 180-card scroll path recreated/disposed 97 engines before versus 0 after. Raw CPU/layout/read metrics are external receipts, not claims of physical high-refresh FPS. Physical Mac/high-refresh scrolling, Safari and actual signed-in service/CDN remain unverified.

Passed browser regressions: rail-lens-refraction (three palettes, actual label pixel displacement/RGB split, direct input alignment, no scaling or post-input movement), rail-glyph-lens (desktop/PWA and unchanged expanded artist markers), rail-lens-spinner (PC/PWA/touch), glass-controls (PC/PWA/touch/no observer, real downloads/press/lifecycle), settings-themes (three viewports, AA/persistence/blocked storage), selection-gestures (desktop/mobile, real MP4 previews), media-action-dock (unchanged selection tools and cancellable top return), rail-focus (three configurations). Motion assertions now check direct pointer behavior instead of the removed spring; collapsed artist expectations match the new single-outline spec. Full original button-restoration assertions remain; the control test additionally waits for the exact CSS pose after SDK/CSS transitions settle rather than sampling at a fixed delay under CPU load. An initial parallel dock cancellation timing failure passed on rerun with the original cancellation assertion unchanged. Syntax and CRLF-aware diff checks pass. CI includes the new scroll regression; hosted checks must be verified after push.

Receipts: `/workspace/optics-scroll-20261117/` (`unit-final2.log`, `scroll-final5.log`, `refraction2.log`, `glyph-final.log`, `rail2.log`, `controls-final2.log`, `themes2.log`, `selection.log`, `dock2.log`, `focus.log`, benchmark JSON/scripts). Synthetic motion preview: `direct-lens.mp4`; collapsed screenshot `collapsed.png`. Repeat focused checks: `node test/glass-scroll-reuse.browser.cjs`; `node test/rail-lens-refraction.browser.cjs`; `node test/rail-glyph-lens.browser.cjs`; `node test/glass-controls.browser.cjs`. Public production remains unchanged until a future approved merge/deployment.

## PR #134 merged and production verified — 2026-11-17 (Asia/Seoul)

The user explicitly approved merging/deploying all work through the flat-hover/held-drag refinement. That authorization has now been fulfilled. PR https://github.com/fffdsaw/fromm-viewer/pull/134 merged at 2026-11-17T03:23:45Z. Reviewed code head `dd21e7b33f40b68e1ea382189078030ce3c15343` passed all ten hosted checks; production merge/main is `516af31c0c0168358480362904a54ea8b9970df2`. The merge tree exactly matches the reviewed head. Feature branch remains `codex/fromm-viewer-uiux-stabilization-20261114`; this receipt is saved there after deployment. Do not reinterpret this completed approval as authorization for a later release.

GitHub Pages build/deployment run https://github.com/fffdsaw/fromm-viewer/actions/runs/44009898115 and independent hosted verification https://github.com/fffdsaw/fromm-viewer/actions/runs/44009898921 both completed successfully. Separate local public checks compared 27 deployed HTML/CSS/JS assets byte-for-byte (SHA-256) against the merge commit. Fresh anonymous Chromium loaded login, waveform/shared player/playlist modules, glass controls and live preview; Classic persisted after reload. No page errors. A separate browser using the actual production assets and synthetic isolated state verified retained selection, matching flat hover, darker selected hover, glass only during a held drag, and release-to-select; no page errors. No real account/chat content, user cache deletion or external message sends were used. Actual signed-in service/API/CDN behavior and physical Apple/Mac/Safari remain unverified.

Production: https://fffdsaw.github.io/fromm-viewer/?v=20261117-sidebar-press . This release includes the playlist cursor-race fix, popup dismissal without playback toggling, startup menu intent, faster enlarged previews, normal/fullscreen idle cursor, themed headers and round reply controls, Save optics and final flat-hover/held-drag sidebar interaction. Channel photo fetching remains excluded.

Receipts: `/workspace/deploy-134-20261117/` (`ci-final.json`, `pr-merged.json`, `merge-result.json`, `pages-final.json`, `production-134-verified.json`, `production-134-login.png`, `production-sidebar.json`, `production-sidebar-held.png`, verification scripts/logs). Repeat public checks: `NODE_USE_ENV_PROXY=1 node /workspace/deploy-134-20261117/verify-production-134.cjs 516af31c0c0168358480362904a54ea8b9970df2`; same environment with `verify-sidebar.cjs` and that SHA. This checkout fetches only the feature branch by default; explicitly refresh main with `git fetch origin main:refs/remotes/origin/main` when comparing production.

## Flat hover and held-drag glass — 2026-11-17 (Asia/Seoul)

The user's Apple Calendar observation refines the previous behavior: keep the selected menu marker visible; ordinary pointer travel shows a second marker in the same flat theme-selected color; hovering the selected menu darkens its fill. The real optical face is hidden during ordinary hover, while remaining prewarmed. A primary fine-pointer press followed by at least 4px movement enables the existing single refractive/chromatic lens. Only the decoration stretches; pressed native menu buttons are explicitly kept at fixed geometry. Selected/hover fills share theme tokens across palettes; touch and accessibility behavior remain intact.

A held drag previews without navigating. Releasing over a menu invokes its existing click/route once; releasing outside, Escape, cancel/lost capture, blur, scroll, hidden page or resize clears the gesture. Only the mouse click generated by a canceled/completed drag is suppressed; the next physical press clears suppression, and keyboard-generated clicks remain allowed. Small row gaps retain tracking. No new SDK engine or count cap was added, and unrelated PR #134 fixes remain.

Validation: Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34; synthetic fixtures only. Units 278/278 passed. `rail-lens-refraction.browser.cjs` verifies flat hover, retained/darker selection, no optics before drag, actual glyph-pixel refraction/RGB separation only during held movement across glow/sky/classic, fixed targets, one reused map, release selection, outside/Escape cancellation and immediate subsequent mouse/keyboard actions. Existing `rail-lens-spinner` passes PC 1440/760, PWA900 and touch390. `rail-glyph-lens` passes desktop1440 and installed780; its original geometry, clear-centre, actual boundary displacement, one-map, route and artist assertions remain, now using a held drag and all three RGB paths. This also fixes the previous hosted Conversation glyph regression's outdated single-map selector. `glass-controls` passes PC/PWA/touch and missing-observer fallbacks with real downloads/lifecycle; rail focus passes three configurations; startup navigation passes six intent/identity cases; cards/sidebar passes three viewports. Syntax and CRLF-aware diff checks pass. Physical Apple Calendar/Mac/Safari and signed-in service/CDN have not been tested; this follows the user's described interaction.

Continues from `722b5de6e75f4a2e109045b8f20b9dc81603efae` on `codex/fromm-viewer-uiux-stabilization-20261114`; production main remains `c997b372b5fe6fd53fc44985146edbad326073bc`. Review PR: https://github.com/fffdsaw/fromm-viewer/pull/134 . Fresh hosted CI must verify this refinement; no merge/deploy has been performed for PR #134. Versions changed only for `web-glowme.js` and `themes.css`.

Receipts: `/workspace/sidebar-press-20261117/` (`unit-final.log`, `refraction-final2.log`, `glyph2.log`, `rail-final.log`, `glass-final.log`, `cards.log`, `focus.log`, `startup.log`). Actual synthetic preview `sidebar-hover-press.mp4` labels ordinary hover versus held movement; the caption exists only in the recording fixture. Resume: `gh pr view 134 --json headRefOid,statusCheckRollup`; `node test/rail-lens-refraction.browser.cjs`; `node test/rail-glyph-lens.browser.cjs`; `node test/rail-lens-spinner.browser.cjs`. No production merge or deployment without new explicit approval.

## Sidebar glass crossing glyphs — 2026-11-17 (Asia/Seoul)

The latest user clarification supersedes the connected/pinching lens interpretation below. The requested effect is the transparent glass boundary travelling across menu lettering, visibly refracting the actual glyphs and splitting their RGB edges. Removed the transient SVG membrane/source/neck altogether. The existing single SDK lens now shows a wider optical band during travel; its width follows spring velocity and narrows continuously as it settles. The stationary centre remains readable. Native menu targets/labels, flat selected row and all other PR #134 fixes remain unchanged.

The shallow sidebar-only optical profile uses 0.2 × the refraction preference and intrinsic 0.24 dispersion plus the chromatic preference, with zero blur. This avoids the deep control profile stretching whole glyphs into streaks. It introduces no upper clamp, global engine budget or new SDK instances; refraction zero still sets all displacement scales to zero. Other controls keep their existing settings. Asset/import versions are `glyph-refraction-20261117`.

Validation on Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34, synthetic fixtures only: web units 278/278 passed. New `rail-lens-refraction.browser.cjs` passes glow/sky/classic: samples an actual moving frame where the lens boundary crosses a label, then holds that geometry while comparing actual label screenshots against zero displacement and equal RGB displacement; both differences exceed pixel thresholds. It also verifies continuous travel, one reused engine, fixed targets, native click, pointer leave and accessibility fallbacks. It replaces the obsolete membrane-specific test because that requested behavior was removed. `rail-lens-spinner.browser.cjs` retains settled label clarity, displacement/specular, playback, lifecycle and fixed geometry checks; its zero-displacement comparison now zeroes/restores all three RGB paths. It passes PC 1440/760, installed PWA 900 and mobile 390. Glass settings passes seven viewport/storage cases, and control glass verifies real downloads/press/geometry/fallbacks. Syntax and CRLF whitespace checks pass. Actual signed-in API/CDN and physical Mac/Safari remain unverified.

Continues from feature head `46dff123f579633fd4248678b0ca6d32fb4a451a`, with production main still `c997b372b5fe6fd53fc44985146edbad326073bc`. PR: https://github.com/fffdsaw/fromm-viewer/pull/134 . Previous head's hosted Channel browser job failed (other nine checks passed); its job log endpoint was unavailable locally. Fresh CI must verify this replacement before merge. No merge or deployment is authorized/performed for this review batch.

Receipts: `/workspace/sidebar-refraction-20261117/` (`unit.log`, `refraction.log`, `rail-final.log`, `glass.log`, `settings.log`, glyph snapshots and actual motion `sidebar-refraction.mp4`). This video supersedes both earlier droplet previews. Resume: `gh pr view 134 --json headRefOid,statusCheckRollup`; `node test/rail-lens-refraction.browser.cjs`; `node test/rail-lens-spinner.browser.cjs`; `node test/glass-controls.browser.cjs`; `node test/glass-settings.browser.cjs`.

## Connected sidebar lens refinement — 2026-11-17 (Asia/Seoul)

The user's latest clarification supersedes the falling-droplet interpretation below. Moving between sidebar menus now pulls the existing lens away from its previous location: the old source stays anchored, contracts through a thinning connected neck, pinches off, then disappears as the moving lens settles. No separate falling drops remain. The transient union uses the existing SDK filter with a document-local rim mask and transparent center; it creates no extra SDK instances/maps per move. The flat selected row and all other PR #134 fixes remain intact. Click, leave/cancel, scroll, reduced motion, hidden page and page cleanup terminate the connection; decoration never owns hit targets.

Continues on `codex/fromm-viewer-uiux-stabilization-20261114` from `bf27bf7f3dd70ff3940c1dff2fe2bf356ed00d7d`; fetched production main remains `c997b372b5fe6fd53fc44985146edbad326073bc`. Existing review PR: https://github.com/fffdsaw/fromm-viewer/pull/134 . Previous head's ten hosted checks passed. This refinement needs fresh hosted checks after push. No merge/deploy has been performed for PR #134.

Validation: Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34, synthetic fixtures only. Unit suite 278/278 passed. `rail-lens-detach.browser.cjs` passes both adjacent directions in glow/sky/classic, with multiple connected frames, anchored source, moving destination, actual filter reuse, local SVG mask, visible pinch-off, fixed hit targets, click/leave cleanup and reduced-motion/forced-color behavior. `rail-lens-spinner.browser.cjs` passes all four PC/PWA/touch configurations, preserving its displacement/specular, text pixels, playback, geometry and engine lifecycle assertions. Existing layout stabilization waits remain; semantic settled-phase waits were added so those checks inspect the settled lens rather than its new transient membrane. `glass-controls.browser.cjs` also passes PC/PWA/touch and missing-observer fallbacks, real downloads, fixed press targets and engine cleanup. The former freefall test is replaced with the corrected connected-motion test in CI. Syntax and CRLF-aware whitespace checks pass. Physical Mac/Safari and actual signed-in API/CDN remain unverified.

Receipts and actual synthetic motion preview: `/workspace/lens-detach-20261117/` (`unit.log`, `detach-mask.log`, `rail-final.log`, `glass-final.log`, `sidebar-lens-detach.mp4`). The old `sidebar-droplets.mp4` is historical and no longer represents the design. Resume/check: `gh pr view 134 --json headRefOid,statusCheckRollup`; `node test/rail-lens-detach.browser.cjs`; `node test/rail-lens-spinner.browser.cjs`; `node test/glass-controls.browser.cjs`. Do not merge/deploy this review batch without new explicit approval.

## Playlist recovery, navigation intent and glass interactions — 2026-11-17 (Asia/Seoul)

New user-authorized refinement continues on `codex/fromm-viewer-uiux-stabilization-20261114` from `c5f6a7cb30c152feb255c7162b2cef46d166cfb5`; fetched main remains PR #133 production `c997b372b5fe6fd53fc44985146edbad326073bc`. No open PR existed at the start and both remote heads were rechecked unchanged before commit. This batch is for review; PR #133's earlier merge/deploy approval has already been fulfilled. Do not merge/deploy this batch without new approval. Locate the review PR using `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup` after push.

- Reproduced a Replay pagination race: a background prefetch can cache a page just before a simultaneous foreground fetch advances the cursor; the next queue load would consume that already-committed page and stop. Cached pages now must match the current raw cursor; an open Replay player also suppresses collection-screen idle prefetch scheduling, leaving sequential queue loading as the owner. Existing raw cursor, mixed/hidden post, true repeated-cursor, end-of-list and session guards remain. Deterministic unit regression failed before the fix and passed after it; actual 365-item browser loading reaches the real end without opening video details/files.
- Playlist outside clicks now dismiss in capture phase and consume only the video-surface click. Both playing and paused states survive dismissal in custom and enlarged native players; explicit play/other transport buttons still act. Player settings use the same capture-phase surface dismissal. The next ordinary surface click still toggles playback. Idle cursor follows transport visibility in normal and fullscreen large players; movement/pause restores it, and open drawers keep their normal cursor.
- Saved-room restoration no longer overrides LIVE/Replay/Channel or vote navigation, including after delayed profile identity resolution. Returning to All still restores the last room; no stored room, disk cache, reader checkpoint or history metadata is cleared. Six synthetic desktop/mobile startup cases plus existing full-cache and loading/latest reader suites pass.
- Reply match up/down controls are round 44px targets with rounded SVG arrows. Replay/Channel count text and both header separator lines use theme tokens, verified against all six palettes.
- Two reusable transparent, actual SDK-backed droplets detach briefly from the moving sidebar lens. Their separate inert overlay avoids changing menu hit boxes or scroll geometry; fixed faces reuse their maps across animation and respect engine OFF, reduced motion/transparency, forced colors, pointer leave and page cleanup. The single original lens and flat selected navigation remain. No global engine budget or color tint was introduced. Drop faces have their own class so the original main-lens identity and pixel-displacement checks remain intact.
- Active Save now receives actual clear optics on PC and mobile. A mobile decorative face preserves the base theme color and native button ownership; disabled/hidden/replaced/theme-changed faces are disposed. Existing save-only capsule pulse, download queue, file/picker handlers and fixed geometry remain. Mobile enabled Save has its palette accent instead of inheriting a transparent display-contents carrier.
- Media double-click opens with the already visible photo preview/video poster while original bytes load; successful images upgrade to the original, failures retain the preview with a caption. Enlarged-video queue preparation yields until after the first paint and is cancelled on close. Cold image opening avoids resetting an unused video element. Original media is still requested only on demand; this improves initial presentation rather than promising faster remote transfer or decode. Channel photo fetching remains excluded.

Validation: Node **24.22.1**, Playwright **1.62.1**, Chromium **151.0.7922.34**; all data/accounts/media are synthetic. Final web unit suite **278/278 passed**. Passed browser suites: video-playlist (three viewports, 365 Replay records, original 71-item Channel retry/permission/history/end coverage, native/custom dismissals and normal idle cursor); startup-navigation (six menu/identity cases); media-preview-opening (desktop/mobile held-original requests, instant preview/poster, deferred close and clear themed Save engines); rail-droplets (three palettes, real SVG filters, actions/geometry/accessibility cleanup); collection-header (six-palette counts/dividers plus PC/touch geometry and refresh); player-settings (Replay/Channel, three viewports, normal/settings interactions, fullscreen cursor); glowme-search-dock; rail-lens-spinner; glass-controls (PC/PWA/touch/missing observer, actual downloads/press/lifecycle); settings-themes (six palettes, AA, persistence, blocked storage); conversation-cache-restore (0 historical requests, 0px conflict-flush anchor movement); direct-selection; selection-gestures; chat-loading-latest; capsule-states; capsule-materialize. Syntax and CRLF-aware whitespace checks pass. Initial local fixture assertions about carrier color and main-lens selector identity were corrected to the real paint owner and distinct drop role; existing assertions/behaviors were retained. Hosted CI for the final pushed head remains to be checked. Actual signed-in API/CDN behavior and physical Mac/Safari are unverified.

Receipts: `/workspace/playlist-fixes-20261117/` (`race-before.log`, `race.log`, `unit-final.log`, `playlist-final.log`, `startup.log`, `preview4.log`, `droplets3.log`, `headers.log`, `settings2.log`, `dock.log`, `rail2.log`, `glass.log`, `themes.log`, `cache.log`, `selection.log`, `gestures.log`, `latest.log`, `capsule-states.log`, `capsule.log`). Synthetic motion preview: `sidebar-droplets.mp4` (recording script and intermediate files are external artifacts, not committed). CI includes the new startup, drop and preview browser regressions. Asset/import URLs were versioned. No credentials, user chat data/cache deletion, actual message sends or preview-site publication were used.

Resume: inspect `git status`, remote feature/main heads and the PR above; inspect final-head checks before an approved merge/deploy. Focused commands: `node --test test/replay-pagination.test.cjs`, `node test/video-playlist.browser.cjs`, `node test/startup-navigation.browser.cjs`, `node test/media-preview-opening.browser.cjs`, `node test/rail-droplets.browser.cjs`, `node test/player-settings.browser.cjs`; full units `node --test test/*.test.cjs`; whitespace `git -c core.whitespace=cr-at-eol diff --check`. Preserve the existing branch and history.

## PR #133 production deployment confirmed — 2026-11-17 (Asia/Seoul)

- User explicitly approved merge/deployment. [PR #133](https://github.com/fffdsaw/fromm-viewer/pull/133) merged into main at `c997b372b5fe6fd53fc44985146edbad326073bc`, including final tested head `ece90c4eb0bcdd2eeea8e629042b4d3121f6073e`. All **10/10 final-head CI checks passed**, including Windows Chrome/Edge, Chromium conversation/50k history, streamed downloads and the full media browser regression. The old-calendar-color assertion failure belongs to the earlier head; the final run passed.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43899545009) and [public verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43899546341) succeeded. Independent verification matched **27 public HTML/JS/CSS assets byte-for-byte**. Fresh anonymous production Chromium loaded the waveform helper, playlist exports/styles and shared player with no orphaned playlist controls, retained Classic across reload, loaded chromatic/real-preview controls and reported **zero page errors**. Login screenshot reviewed. Actual signed-in user data/CDN and physical Mac/Safari remain unverified.
- Production now includes waveform sound covers; playlist icon fade with transport; close after selection or outside pointer/touch; continuous automatic metadata loading without the 50-row pages; current-video row alignment; clean calendar/search surfaces and transparent X/navigation controls; round themed reply checkbox and themed calendar/vote states; accessible icon-only Replay/Channel Back/Download. Channel photo fetching remains excluded. Earlier authorized behavior and lifecycle/cache safeguards remain.
- Receipts: `/workspace/audio-waveform-20261116/ci-final.json`, `pages-runs.json`, `production-133-verified.json`, `production-133-login.png`, `verify-production-133.cjs`, plus the local logs/screenshots listed below. Verification command: `NODE_USE_ENV_PROXY=1 node /workspace/audio-waveform-20261116/verify-production-133.cjs c997b372b5fe6fd53fc44985146edbad326073bc`.
- Feature branch fast-forwarded to production; this documentation-only receipt is backed up on the existing feature branch. No real account/chat/token data, cache clearing or preview publication was used. Pending approval/CI/deployment notes below are historical and superseded by this receipt. Future main refresh: `git fetch origin refs/heads/main:refs/remotes/origin/main`.

## Audio covers, continuous playlists and clean themed search controls — 2026-11-17 (Asia/Seoul)

Latest refinement continues on `codex/fromm-viewer-uiux-stabilization-20261114` from `89baa938eb8773004c1d690eeca73a060d1f0471`; fetched production main remains PR #132 merge `25cddb1dcd6e374adabaee2e2bdac2262c7f14fd`. No open PR existed at the start. This batch is for review; the earlier merge/deploy approval was already fulfilled by PR #132. Do not merge/deploy this refinement without a new explicit approval. Implementation `ef1747895c9f7d3d1e19bb420c0e9600d1cd973f` is pushed in [PR #133](https://github.com/fffdsaw/fromm-viewer/pull/133). Inspect its latest remote head/checks before any approval step. Historical implementation/approval notes below are superseded by their production receipts.

- Gallery sound covers now use a palette-aware SVG waveform instead of the headphone emoji, including unavailable-URL fallback. Existing compact controls, audio loading and conversation waveform remain.
- Replay/Channel playlist icon lives in the existing seek/time control carrier, sharing its idle/focus fade exactly. Enlarged native-control media has a separate three-second idle icon fallback. Choosing a video (including previous/next/automatic next) closes the drawer. Pointer/touch outside closes without suppressing the underlying action or stealing its focus. Existing Escape, inside interactions and owner cleanup remain.
- Removed the 50-row presentation pages. Opening a finite-video queue sequentially fetches remaining metadata through the existing list owner until its actual end, with progress, retry and cursor-stall protection. Closing stops scheduling further pages after the in-flight page. No video/detail prefetch was added. Loaded rows are reused, keeping list scroll steady while metadata appends; existing rows remain selectable during loading. Reopening aligns the inner list to the currently playing row, including after selecting a later video or automatic next. Full-list pagination, permission checks and playback/history owners are retained.
- Calendar surface and footer now share the search panel card; resting date cells, navigation/title/today and close/clear X controls are transparent. Calendar dots, selected/today/focus states, search match navigation, text selection and circular native-semantic reply checkbox follow all six palettes. Vote list hover/focus/separators follow the same palette. Reply search functionality and date Move behavior are unchanged.
- Replay/Channel player header Back and Download are transparent icons with accessible labels; title/date, download progress feedback and action ownership remain. Asset query versions updated. Channel photo fetching is still excluded.

Validation uses synthetic accounts/messages/API replies and real local MP4/WAV decoding, Node **24.22.1**, Playwright **1.62.1**, Chromium **151.0.7922.34**. Final unit rerun: **275/275 passed**. A prior parallel-load unit run saw one timing-sensitive unchanged download cancellation assertion (late requests); the unchanged isolated download suite passed 18/18 and the unchanged complete rerun passed. Browser suites passed: compact-video-player (desktop/mobile), small-player-layout (seven viewports 320–1920, real audio/video/end/volume), votes and my-replies (desktop/mobile), search-calendar-panel (five desktop/mobile/landscape/PWA configurations, all six palettes and axe), player-settings (Replay/Channel in three viewports), channel-player and replay-player (1440x900, 390x844, 568x320), video-download-engine (desktop/PWA/mobile, real crypto/streams/files), and video-playlist (desktop/mobile/short landscape: actual end/next/off/last, fresh detail/403, full 71-item metadata loading and retry, no video prefetch, current-row alignment, late response/late module/history, enlarged media and cleanup). Final playlist rerun also passed native enlarged-media idle/reveal and every desktop/mobile/short-landscape case.

Receipts and synthetic screenshots: `/workspace/audio-waveform-20261116/` (`unit-final2.log`, `playlist-final.log`, `calendar-clean.log`, `settings-final.log`, `channel-final.log`, `replay-final.log`, `download-final.log`, `compact.log`, `layout.log`, `votes.log`, `replies3.log`; `waveform.png`, `calendar/palette-{sky,classic}.png`). Earlier failed timing/palette runs remain as diagnostics; do not describe them as passes. Clean Sky calendar, sound cover and mobile Replay header screenshots were reviewed. Physical Mac/Safari, actual signed-in service/CDN and production deployment of this batch remain unverified. No real user data, credentials, cache clearing or preview publication was used.

Initial PR #133 CI passed unit/regression and all three streamed-download browsers; its media browser job stopped at the older calendar navigation fixture expecting the previous fixed mint selection/text/hover colors. Updated only those three exact expected values to the current Glow palette, retaining all hover, today-ring, week-count, short-screen, latest-entry and reader-restoration assertions. The complete navigation fixture, search-dock suite (four widths) and settings-themes suite (three viewports, six palettes, AA, persistence and blocked storage) passed locally. Runtime code did not change in this correction. Follow-up exact-head CI must be checked; the initial failure must not be described as a passing run. The app PR-attachment helper did not respond and its wait was stopped after several minutes; PR #133 itself and successful remote push are verified.

Resume: inspect `git status` / feature and origin heads; `gh pr list --head codex/fromm-viewer-uiux-stabilization-20261114 --state open`; `gh pr view <number> --json headRefOid,statusCheckRollup,mergeStateStatus,url`; preserve the existing branch/history. Relevant reruns: `node --test test/*.test.cjs`, `node test/video-playlist.browser.cjs`, `node test/search-calendar-panel.browser.cjs`; CRLF-aware whitespace: `git -c core.whitespace=cr-at-eol diff --check`.

## PR #132 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- User explicitly approved merge/deployment and asked to continue verification. [PR #132](https://github.com/fffdsaw/fromm-viewer/pull/132) merged into main at `25cddb1dcd6e374adabaee2e2bdac2262c7f14fd`, including final tested head `0afe411f355055bc04302bcea2ccaf407b9d6663`. All **10/10 final-head CI checks passed**, including Windows Chrome/Edge, Chromium conversation/50k history, real HLS quality and the entire media regression job.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43885031569) and [public verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43885033493) succeeded. Independent verification matched **27 public HTML/JS/CSS assets byte-for-byte**, including `web-video-playlist.js` and `video-playlist.css`. Fresh anonymous production Chromium loaded the queue exports/styles without orphaned controls, retained Classic across reload, loaded prior chromatic/preview controls, and reported **zero page errors**. Login screenshot reviewed. Actual signed-in user chat/CDN and physical Mac/Safari remain unverified.
- Production includes approved items 1/2/3: fresh entry at latest (reload retains reading), completed compact audio/video reset to zero and pause, and slide-out finite-video queues for Replay/Channel/enlarged media. Channel photos remain excluded. Existing real-time LIVE and standalone shared URLs retain their separate behavior.
- Initial CI's media job found an old single-video quality fixture expecting the same element after end while default-on automatic-next selected another video. The fixture now turns next OFF through actual UI; all original rendition/buffering/end assertions remain. Runtime code was unchanged by this correction. The complete local five-viewport HLS suite and final hosted regression passed. Additional local live/PiP/comments/native diagnostics/votes/replies/extension suites passed. A three-run startup stress attempt during parallel HLS work saw one late-buffer event; the unchanged isolated eight-case CI profile and final hosted startup check passed. No assertions were weakened.
- Receipts: `/workspace/playlist-followup-20261116/ci-final.json`, `production-132-verified.json`, `production-132-login.png`, `verify-production-132.cjs`, and watch/local browser logs in the same directory. Public verification command: `NODE_USE_ENV_PROXY=1 node /workspace/playlist-followup-20261116/verify-production-132.cjs 25cddb1dcd6e374adabaee2e2bdac2262c7f14fd`.
- The feature branch was fast-forwarded to production and this documentation receipt is backed up there. No real accounts/comments, user cache deletion, photo API change or preview publication was used. Pending/approval notes in the implementation section below are historical and superseded. Future main refresh: `git fetch origin refs/heads/main:refs/remotes/origin/main` (the configured fetch refspec otherwise tracks only the feature branch).

## Fresh chat entry, completed small media and slide-out video queues — 2026-11-16

User explicitly approved items 1/2/3, excluding Channel photos. Continue on `codex/fromm-viewer-uiux-stabilization-20261114` from `f5ef749`; fetched production main is still `99555a5`. Implementation `abb9449aebfc712305451acd90703334b8ddfcef` is pushed in [PR #132](https://github.com/fffdsaw/fromm-viewer/pull/132), attached to this chat. The user has now explicitly approved merge/deployment; finish verification before merging. Initial hosted CI passed 9/10 checks, including the complete new playlist suite and all three conversation browsers. The remaining media job found that its existing HLS buffering test expected the same video element after playback ended, while default-on automatic next correctly replaced that element. The quality fixture now turns automatic next off through the real UI; all original quality/end/spinner assertions remain, and the separate playlist suite continues testing automatic next ON. Verify corrected final-head checks before merge. The full local quality suite now passes all five desktop/mobile/landscape viewports, including the non-Popover fallback, real HLS decode, highest/manual rendition, state retention, rotation, buffering/end spinner and signed URL recovery. No application behavior or existing assertion was weakened. Find the current PR with `gh pr list --head codex/fromm-viewer-uiux-stabilization-20261114`; do not replace the existing branch/history or publish the preview repository.

- Fresh document navigation now opens the last room at its latest message even when disk/session bookmarks point into history. Reload and browser history navigation still restore the reading message/offset. No cache clearing, full-history rescan or draft deletion. The browser regression keeps both stored bookmarks, leaves/revisits the page, checks the first rendered tails and confirms no historical requests; immediate and debounced reload restoration still pass.
- Conversation/gallery audio and compact video reset time/seek fill to zero and remain paused on real `ended`. Manual pause/seek, duration/volume, offscreen resume and resource cleanup remain. Large players retain end position when automatic next is off.
- New app-owned `web-video-playlist.js` / `video-playlist.css`: icon-only toggle; right slide overlay without shrinking video; close/Escape; theme tokens; current item; previous/next; default-on automatic next even while closed; actual queue end stops. Replay uses its selected channel, Channel its current page; enlarged conversation/gallery video uses the current filtered video's order. Real-time LIVE and standalone shared URLs have no archive queue. Channel photos remain unimplemented, awaiting actual photo API data/latest APK analysis.
- Reuses permission/detail, quality/HLS and navigation owners for each selection. Replay replaces the current player route so Back reaches the original list; Channel retains its existing replace-player route. Existing next-page APIs extend queues, preserving cursor/video on retry. Fifty rows per queue page bound DOM size; this does not limit collection availability. Stale response/tab/account/engine owners cannot restart a departed player. Normal engine disposal removes listeners/UI. A late presentation asset attaches to an already restored engine.
- Short landscapes use a viewport sheet in the browser top layer to avoid both a zero-height list and sticky-header occlusion; older browsers fall back to a body/fullscreen portal. Normal screens retain the stage overlay; reduced motion disables transition. Added fixture asset routing, browser CI coverage and eventual Pages asset hashes.

Validation uses synthetic API/account data and real local MP4/WAV decoding on local Chromium; no actual account/CDN or photo API verification. Unit tests: **326 pass, 1 Windows-only platform skip** (275 web + 51 native). Passed browser suites: conversation (1440/780 standalone simulation/390), conversation-audio (1440/780/390/320), small-player-layout (8 sizes, all palettes for shared controls), compact-video-player, channel-videos, player-settings, conversation-cache-restore, direct-selection, and chat-loading-latest. The loading suite had one timeout under parallel browser load; its complete unchanged rerun passed all desktop/PWA/mobile reader checks. New video-playlist suite covers desktop/mobile/short landscape, actual end→next, off/manual/last, fresh permission/403, unchanged player geometry, themed panels, long-list paging/503 retry, loading another page, late detail after leaving, late asset attachment, one-Back-to-list and enlarged-media cleanup. Logs/screenshots: `/workspace/playlist-followup-20261116/`; first chat/audio/small-player logs: `/workspace/{conversation,audio,small}-followup.log`. Inline/changed JS syntax and CRLF-aware diff checks pass. Inspect final-head hosted CI after the PR is pushed; do not describe running checks as passed. Physical Mac/Safari and actual service behavior remain unverified.

## PR #131 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- User explicitly approved merge/deploy. [PR #131](https://github.com/fffdsaw/fromm-viewer/pull/131) merged into main at `99555a5a340b907400ea2923ae0f38742bb3b687`, including final verified head `a1d2f21d0946cdb9d6eee345aada92b220ea296b`. All **10/10 final-head CI checks passed**, including Chromium/Windows Chrome/Edge and the complete media browser suites.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43839906361) and [public verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43839906329) succeeded. Independent verification matched **25 public HTML/JS/CSS assets byte-for-byte**, including `web-glass-material.js`, `web-glass-settings.js` and the patched vendor SDK. Fresh anonymous Chromium loaded login/shared player and the new chromatic control/real-preview DOM, Classic persisted across reload, and **zero page errors** occurred.
- Production includes the full reviewed scope: transparent top shortcut, cancellable animated virtual-chat return, unrestricted visible-engine policies and direct strengths, chromatic control (default 0), compact live settings/real preview without backdrop blur, and correctly filled themed range endpoints. Prior stabilization, cache/reader, player and palette work remains. No real account/comment/cache deletion, uploaded-media fixture or preview publication was used.
- Receipts: `/workspace/live-optics-20261116/production-131-verified.json` and `production-131-login.png`; local synthetic logs and `ci-final.json` are in the same directory. Physical Mac/Safari remains unverified locally. The feature branch was fast-forwarded to production; this documentation-only receipt needs no runtime deployment. Its remote fetch configuration tracks only the feature branch, so future main refreshes should use `git fetch origin refs/heads/main:refs/remotes/origin/main` explicitly.
- Pending CI/merge notes below are historical and superseded. Continue from the preserved feature history for future work.

## Full-strength live optics, settings and animated conversation start — 2026-11-16

User approved implementing the reviewed seven-item scope, including chromatic control. Work continues on `codex/fromm-viewer-uiux-stabilization-20261114` from `c7f2ca1323bad80249334fc4b8f8b706b6d31c2e`; fetched main remains PR #130 production `efc5d5cfcb8043af9862ac42ba6d0dfa97b90887`. No open PR existed at start. Implementation `745a9ce2a3262228d7200b280fdb255d185ed886` is pushed in [PR #131](https://github.com/fffdsaw/fromm-viewer/pull/131), attached to this chat. Exact-head CI is running; inspect its final result. This refinement is for review; do not merge/deploy without explicit approval for this refinement.

- Top shortcut has no theme fill, including hover. Full conversation and collections share a cancellable eased return. A virtual conversation adds only the first two chunks above the current window while preserving the current message offset, then reconciles to the true first window on arrival; manual interruption rebuilds around the visible message. Reduced motion remains instant. No whole-history DOM mount or cache/network semantics changed.
- Removed app eight-engine/two-build caps, priority exclusion of ordinary visible controls, low-memory/low-core suppression, video parking, mobile 800ms quiet/one-build gates and reduced mobile material scaling. Visible ownership, offscreen/page cleanup, explicit OFF, unsupported-browser fallback and user accessibility preferences remain.
- `web-glass-material.js` is an app-owned wrapper around pinned MIT Meapri: high quality, direct refraction/thickness/blur/specular preferences, full map sampling and paint-coalesced updates without size/profile reductions. SDK method overrides are documented for future vendor upgrades. Geometric model, canvas/color validity bounds and worker/cache lifecycle remain. Two small vendor fixes activate every positive chromatic value and preserve its configured RGB spread when refraction changes. No WebGL capture/backdrop source/content clone was introduced.
- Added persisted chromatic 0–100% (default 0), with old preferences migrating to zero. PC/mobile/save pulse share zero-alpha material preferences. Settings range fill normalizes `(value-min)/(max-min)` and paints native tracks, including nonzero minima and exact max fill. The 160ms settings throttle becomes per-paint live application.
- Settings are a compact right-side, draggable nonmodal desktop panel with horizontal categories, content-sized general page, corrected install heading/action order, no backdrop blur/dimming and a real SDK preview. Touch keeps native modal focus and responsive bounds. Last dragged position/category, storage failures, reset and theme behavior remain covered.
- Asset URLs, synthetic fixture asset routing, CI paths/new regressions and public hash verification include the new material module and patched vendor/settings CSS. No real accounts, chat/media fixtures, cache deletion or preview publication was used.

Local runtime: Node **24.22.1**, Playwright **1.62.1**, Chromium **151.0.7922.34**. Logs/screenshots: `/workspace/live-optics-20261116/`.

- Unit suite: **326 pass / 0 fail / 1 platform skip** (`unit.log`, final `unit-final.log`).
- Passed: `glass-settings` (four desktop/PWA sizes plus malformed/blocked preferences/mobile), `settings-themes` (desktop/short/mobile, six palettes, AA, drag/reload/reset), `glass-controls` (full serial pass, real displacement/downloads/interactions/fallback/touch), `live-optics-settings` (low-memory PC >8 live engines/mobile; actual 1%/50%/0% RGB filters, raw 80px refraction/6px blur, rendered track endpoint pixels, six clear top-button themes, actual preview and OFF/accessibility), `reply-start-top`, `scroll-top-motion` (desktop/mobile start-frame anchor, multi-frame monotone movement, bounded DOM, cancellation/reduced motion).
- The complete additional regression batch passed: `rail-lens-spinner`, `rail-glyph-lens`, `rail-startup`, `glass-settings-startup`, `capsule-materialize`, `header-glass-performance`, `uiux-review`, `glowme-phase3-a11y`, `chat-loading-latest`, `conversation-cache-restore`, `conversation-controls`, `chat-history-progressive`, `chat-history-scale` and the final `scroll-top-motion` rerun. The 50,000-message test kept 241 rendered rows, restored in 1.618s with no history requests, and its synthetic cold scan completed with chronological/deduplicated data and latest visible.
- Paired synthetic performance: median frames ~16.7ms ON/OFF; scrolling p95 ~33.3ms ON vs 16.7ms OFF; decoded video ON retained optics with **0/88 dropped frames** (OFF also 0/88). These are Linux headless synthetic samples, not physical GPU/Safari or real-service measurements.
- Initial exact-head CI found a legacy low-memory-OFF assertion in `glowme-phase3`. The test now requires actual SVG optics on low-memory devices while preserving unsupported-browser and accessibility checks. The paired visual benchmark now uses explicit OFF rather than a low-memory hint. Both the full phase3 suite and three-run benchmark passed locally (`phase3-full.log`, `phase3-perf.log`); `menu-settings-queue` also passed installation/general-page and viewport checks. Follow-up changes only align tests with the approved behavior; runtime implementation remains `745a9ce`.
- An initial parallel controls run missed its unchanged 400ms frame-count assertion; the isolated full suite passed. The new live test waits for the actual blur filter, not only synchronously saved preferences. Physical Mac/Safari/real account remain unverified locally; Windows Chrome/Edge CI is pending.

Local regression batch, JS syntax and CRLF-aware whitespace checks are complete. Resume: inspect/push feature head and retrieve its PR with `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup`; verify exact-head CI before any separately approved merge/deploy. Use `node test/live-optics-settings.browser.cjs`, `node test/scroll-top-motion.browser.cjs`, `node test/glass-settings.browser.cjs`, `node test/settings-themes.browser.cjs`, and `node test/header-glass-performance.cjs` for the focused paths.

## PR #130 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- User explicitly approved merge/deploy. [PR #130](https://github.com/fffdsaw/fromm-viewer/pull/130) merged into main at `efc5d5cfcb8043af9862ac42ba6d0dfa97b90887`, including final verified head `87f6876b6697c3e495a3a25c2045690fc09780f4`. All **10/10 final-head CI checks passed**, including Windows Chrome/Edge and the full media browser suite.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43807640220) and [public verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43807640213) succeeded. Independent verification matched **22 public HTML/JS/CSS assets byte-for-byte**, including `web-capsule-materialize.js`; fresh anonymous Chromium loaded the login/shared player, Classic persisted after reload, and **zero page errors** occurred.
- Production now has flat single-color sidebar selection and colorless PC/mobile/save-pulse optics, with theme base fills, real refraction/gloss, readable chat voice controls and existing functions preserved. All prior PR #129 stabilization/palette/reader changes remain in main. No real account/comment/cache deletion or preview publication was used.
- Receipts: `/workspace/clear-optics-20261116/production-130-verified.json` and `production-130-login.png`; synthetic sidebar screenshots and local logs are in the same directory. Physical Mac/Safari remains unverified locally. Feature branch was fast-forwarded to production; this documentation-only receipt needs no runtime deployment.
- Prior pending-review/deploy notes below are historical and superseded. Continue from the preserved feature history for later work.

## Flat navigation selection and colorless optics follow-up — 2026-11-16

User requested a single-color selected sidebar row and transparent engines across theme changes, then explicitly extended the transparency requirement to **other engine effects**. Implementation continues from clean feature head `df7cf907b8ba813b06ebaa59269c7e224a074336`; remote main was `362b064a8956c424856e7f3858907d8574ab327c`, no open PR. Existing production/deployment receipts below remain history. This new refinement is for review; do not claim it is deployed until an approved merge/deploy is completed.

- Selected navigation is a flat palette-selected fill with matching border, no inset leading stripe/shadow/gradient. Navigation buttons are excluded from PC/mobile SDK allocation; the single independent moving pointer lens remains. Artist markers, routes, layout and hit boxes stay intact.
- PC controls, mobile controls and the transient save capsule now pass **zero-alpha neutral tint** to the SDK in every palette. Decorative control/capsule faces and the cursor carrier are clear with neutral white/gray rims/highlights rather than green/blue/pink material. Base themed headers, surfaces, selected filters and save-button status colors remain. Preference brightness modulates neutral specular intensity instead of colored fill; refraction/blur/gloss, eight-engine budget, playback parking, reduced motion/transparency, forced colors, low-power and lifecycle guards remain.
- Resting voice faces match the clear post-initialization face. Theme foregrounds keep voice play/download glyphs readable on light chat cards. Glass OFF preserves its existing dark fallback. No playback/download/cache/conversation handlers changed. Changed asset/import URLs are versioned, including the save-capsule adapter.
- Existing browser assertions now require a flat selected row rather than its old stripe/engine; SVG/refraction tests target the independent cursor or a mobile header control. All actual maps, displacement, clear-label pixel comparisons, interactive/focus/press behavior, native routes, queues and engine budget checks are retained. Settings/themes explicitly check flat selection, zero-alpha PC/mobile SDK tint and transparent PC faces across all six palettes. Save-pulse inspection also requires clear decorative layers.

Local Node **24.22.1**, Playwright **1.62.1**, Chromium **151.0.7922.34**, synthetic fixtures only. Receipts/screenshots: `/workspace/clear-optics-20261116/`.

- Unit suite: **326 pass / 0 fail / 1 platform skip** (`unit.log`; final rerun `unit-final.log`).
- Passed: `settings-themes` (PC/short window/mobile, six palettes, persistence/blocked storage/AA), `glass-settings` (four PC/PWA sizes plus invalid/blocked/mobile preferences), `glass-controls` (three PC/PWA sizes, actual refraction/press/download/lifecycle + fallback/touch), `rail-lens-spinner`, `rail-glyph-lens`, `rail-startup`, `glowme-phase3`, `desktop-startup-reply-lists`, `menu-settings-queue`, `media-action-dock`, `capsule-materialize`, `uiux-review` (held-module first paint/ON/OFF/hover return), `header-glass` (solid base panes), `glowme-phase3-a11y` (zero axe violations), `conversation-audio` (four widths), `conversation-controls` (three widths), and `header-glass-performance` (~16.7ms median; engine-ON decoded video dropped zero frames).
- One-off Sky/Classic actual cursor inspection confirms flat selected row, clear carrier and zero-alpha SDK tint. `/workspace/clear-optics-20261116/sidebar-sky.png` and `sidebar-classic.png` were captured; Sky screenshot was inspected. Physical Mac/Safari and real-account service remain unverified locally. No uploaded/private media or real session was used.

Implementation `ac3ad757d7141b9d6c46cb147e3f8f02ece33565` is pushed in [PR #130](https://github.com/fffdsaw/fromm-viewer/pull/130), attached to this chat. This documentation-only checkpoint records the PR; inspect exact-head CI before merging. Keep production PR #129 intact until the next approved deployment. Resume with `node test/settings-themes.browser.cjs`, `node test/glass-controls.browser.cjs`, `node test/rail-lens-spinner.browser.cjs`, `node test/capsule-materialize.browser.cjs`.

## PR #129 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- User explicitly approved merge/deploy. [PR #129](https://github.com/fffdsaw/fromm-viewer/pull/129) merged into main at `362b064a8956c424856e7f3858907d8574ab327c`, with final verified head `4e62f40a6e4b8b3a5e11561c7ffec1a9a9e2f741`. All **10/10 final-head checks succeeded**, including Windows Chrome/Edge, Linux conversation and the complete media browser suite.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43799374908) and [public asset verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43799375305) both succeeded for the merge SHA. Independent verification matched **21 public HTML/JS/CSS files byte-for-byte**; fresh anonymous Chromium loaded the login/shared player, Classic persisted after reload, and **zero page errors** occurred.
- All twelve reviewed items are included: palette coverage, large volume tracks, Replay/Channel badges and outgoing name removal, stronger selected/hover navigation and palette-correct engines, green-bar isolation, rounded composer and first-entry/reload/late-layout reader behavior. Earlier stabilization history is preserved. No real account/comment, user cache deletion, uploaded media fixture or preview publication was used.
- Public receipts: `/workspace/review-20261116-followup/production-129-verified.json` and `production-129-login.png`; synthetic screenshots/logs are in the same directory. Physical Mac/Safari remains unverified locally. Feature branch was fast-forwarded to production; this documentation-only receipt needs no runtime deployment.
- The pending CI/merge instructions below are historical and superseded. Production is fully updated; future work continues from this preserved branch/history.

## Twelve-item palette, navigation and reader-position follow-up — 2026-11-16

The user reviewed/expanded a twelve-item list, explicitly withheld edits during review, then authorized implementation. Continue `codex/fromm-viewer-uiux-stabilization-20261114` from clean `97015cc90dd89f890221456c90b11d13d5f18057`; remote main is `0a7cac67ba75599ef7e56dbe007fe94799c55390`, and there was no open PR. This new scope is implemented in [PR #129](https://github.com/fffdsaw/fromm-viewer/pull/129); the user subsequently explicitly approved **merge and production deployment**. Complete after the final-head CI succeeds. Previous deployment receipts below are history.

- Palette: drag/scroll-selection border+fill, vote option/result surfaces, Replay/Channel group filter normal/active/hover, composer icons and rounded shell now use shared palette variables. Removed the shell from a high-specificity background group that painted square corners. Filter active rules likewise no longer lose to a grouped selector containing IDs. Visible controls, hit targets and handlers remain.
- Large-player seek/volume use the same selected accent; desktop/mobile volume now paint real native range tracks with a fill updated by volume/mute events. White thumbs and existing playback/settings/PiP remain. Pixel checks exercise decoded MP4, actual volume input and four palettes in Replay and Channel on desktop/mobile.
- Removed Replay/Channel card thumbnail name badges and outgoing chat '나' metadata; titles, dates, message content/time, selection and download/play controls remain.
- Sidebar: the selected row has a theme-filled background and accent rim/leading mark; the moving cursor lens has a separate tinted/rimmed appearance. Ordinary rows stay transparent. Theme changes destroy/recreate only the bounded active SDK engines so light/dark specular maps cannot remain from the old palette; motion/contrast/low-power/playback guards remain.
- The intermittent green-bar path was concrete: the engine prepends a decorative `span`, but both the badge selector and count updater targeted generic spans. A dedicated `.conversation-latest-count` owns count text/style now. The actual incoming-message regression checks the engine face stays empty, visible, unpadded and aligned at zero while the badge displays 1.
- First chat entry selects the newest virtual window and aligns synchronously before render returns. Return/reload uses a single message-ID + viewport-offset restore path, including late resizing. Browser raw-Y restoration no longer competes. Actual latest detection also requires reaching the end of the virtual list, preventing a middle window's bottom from being treated as latest.
- A per-tab, account/room-scoped session checkpoint contains only message ID, offset and latest flag, with no message text/token. It closes the async IndexedDB debounce/pagehide gap, respects disabled/blocked storage and leaves existing cache records intact. Existing IndexedDB metadata is the fallback. A sticker canvas is reserved before decoding. Resize/load following is bounded to four seconds and cancels on user movement; explicit artist clicks still open latest, reload restores reading position, and incoming messages preserve history readers.

Local verification uses **Node 24.22.1 / Playwright 1.62.1 / Chromium 151.0.7922.34** and synthetic fixtures only. Logs/screenshots live outside Git at `/workspace/review-20261116-followup/`.

- Unit suite: **326 pass / 0 fail / 1 platform skip** (`unit-final.log`).
- Passed browser suites: `conversation` (1440, 780 PWA simulation, 390; real IndexedDB, immediate reload without explicit flush, incoming badge/engine isolation, reader anchor, manual artist/latest, send/IME/rules), `conversation-cache-restore`, `conversation-refresh-cache`, `chat-loading-latest` (synchronous latest entry and >1.8s late resize), `glowme-phase3-navigation` (actual user wheel before saving history), `reply-anchor-context`, `conversation-controls`, `conversation-emoticons`, `settings-themes`, `uiux-review`, `uiux-cards-sidebar`, `rail-lens-spinner` (light/dark engine recreation and bounded resources), `channel-videos` (desktop/mobile Back/Forward/reload), `player-settings` (1440/390, Replay+Channel actual volume track pixels), `glowme-phase3-a11y` and `header-glass-performance` (zero dropped video frames, ~16.7ms median).
- One-off six-palette desktop/mobile inspections passed selection/poll/filter/icon/corner styles and Replay badge/title/actions. Sky/Classic sidebar screenshots were reviewed. Initial verification caught real native track styling and grouped-selector specificity conflicts; these were corrected. Immediate-reload test setup lets a newly constructed virtual viewport paint before refresh, without waiting for the 500ms persistence debounce. No functional assertion was weakened.
- JavaScript syntax and `git -c core.whitespace=cr-at-eol diff --check` pass. Preserve mixed CRLF in `index.html`. Physical Mac/Safari/actual account service remain unverified locally; no user media/session or preview site was used.

Initial implementation head `e3eb77ec1a8e6e7259f3b63a79be67f81778e33b` is pushed in PR #129. Initial hosted CI found old transparent-selected-nav and rimless-carrier expectations in desktop startup, action-dock and rail-glyph suites. Their assertions now require the approved selected/hover separation and visible outer rim; optical face count, fixed hit boxes, actual displacement, clear label pixels and resource assertions remain. These three suites pass locally. The next hosted run reached the drag-autoscroll suite, which still expected the old fixed teal; it now checks actual border/RGBA fill across all six palettes during real pointer selection without removing autoscroll/download checks. The hosted run then reached a final old rimless-selected assertion in `menu-settings-queue`; it now requires the leading accent after a real click and the full suite passes locally. Remaining tests were searched for obsolete nav/marquee color/shadow expectations. The next run passed all nine other checks and the full media tests through desktop/mobile players, then caught the new volume pixel fixture sampling a fade-in at 844×390. The fixture now focuses the actual range and waits for full opacity, then samples its displayed bounding box from a complete viewport screenshot. A native-element screenshot scroll/crop in the short landscape viewport was sampling the underlying video instead. Pixel count/color assertions are unchanged, and the range is blurred before the unchanged fade/interaction tests. All six Replay/Channel desktop/mobile/landscape cases pass locally. Inspect final-head CI (10 checks). The user explicitly approved merge/deploy; proceed after successful validation and verify public assets. Resume with `node test/conversation.browser.cjs`, `node test/chat-loading-latest.browser.cjs`, `node test/rail-lens-spinner.browser.cjs` and `node test/player-settings.browser.cjs`.

## PR #128 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- [PR #128](https://github.com/fffdsaw/fromm-viewer/pull/128) merged into main at `0a7cac67ba75599ef7e56dbe007fe94799c55390`, including final implementation head `be9e40bf47ee2d838bf7c188c8d512f5f979b27f` and preserved stabilization history. All **10/10 final-head PR checks passed**, including Linux Chromium and Windows Chrome/Edge.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43740458224) and [public-file verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43740458824) both succeeded. Independent public verification matched **21 HTML/JS/CSS files byte-for-byte**, fresh anonymous login/shared player loaded, Classic persisted after reload with correct meta theme-color, **zero page errors**.
- This includes palette-matched actions/selection/dividers/seek/volume/scrollbars; transparent normal navigation and clearer moving lens; and the user-requested restoration of the original conversation waveform voice card. Gallery compact video/audio stay icon-only. No real session/comment, user cache mutation or preview publication was used.
- Receipts: `/workspace/replay-actions-20261116/production-128-verified.json`, `production-128-login.png`; restored card screenshot `restored/audio-ready-1440.png`. Local checks and remaining physical Mac/Safari limitation are recorded below.
- Feature branch fast-forwarded to production; this documentation-only checkpoint records completion and needs no further UI deployment. Runtime code is fully in main. The pending-check/deployment instructions below are historical and superseded.

## Complete palette synchronization and clearer navigation lens — 2026-11-16

This completes the previously approved theme-synchronization deployment. The user reported missed Replay/Channel actions, selection toolbar backgrounds/save state, header dividers, seek/volume tracks, scrollbars and separate sidebar menu pills, and requested a more visible moving lens. Continue the preserved feature branch from `c8798fdbe145d0badbff540f3ee6d155a17517a3`; production main was `2c380a99229e791b61045758f50089550fbca1b0`. Remote refs/open PRs were checked; there was no open PR for this branch.

- Replay/Channel back/download actions and decorative faces now use the selected palette. Classic shows white text on a dark surface. First fix is committed/pushed at `efa590313b8db8899816e98794072a39a3953b0d`.
- Header dividers/corner masks, selection toolbar idle/ready/save faces, small-player seek/volume fills and visible scrollbars now follow palette variables. Existing scrollbar visibility/width is preserved. Forced colors retains system colors. The independent pixel regression now expects each approved theme color instead of fixed mint, including real vertical volume input.
- Removed alternate-palette resting backgrounds/borders from unselected navigation buttons. The active row and moving highlight remain. Increased menu-only lens thickness/refraction/specular and visible rim; the clear label center, eight-engine budget, video-playback parking, reduced-motion and touch behavior remain intact. Asset URLs are bumped.
- Playback, download, cache, selection and LIVE/PiP handlers are unchanged; no user data or uploaded media was used.

Actual local runtime: Node **24.22.1**, Playwright **1.62.1**, Chromium **151.0.7922.34**. Evidence is outside the repo at `/workspace/replay-actions-20261116/`.

- Final unit suite rerun: **326 pass / 0 fail / 1 platform skip** (`unit-final.log`).
- Existing `settings-themes` passed all three sizes, saved Classic login and blocked storage. `replay-player` / `channel-player` passed real landscape/portrait decoding and Back at **1440×900 and 390×844**.
- `small-player-layout` passed all seven sizes, actual playback/seek/volume, rendered theme-colored tracks, shared geometry and complete profile visibility. `rail-lens-spinner` passed desktop/PWA/touch, real optics/label pixels, playback fallback, six palettes and cleanup. `capsule-materialize` passed pulse/selection/reselect/cleanup/reduced/fallback/layout scenarios. `header-glass-performance` showed zero dropped video frames and unchanged ~16.7ms median frame time.
- One-off actual-renderer action inspection covered 40 button cases across Replay/Channel, desktop/mobile and five alternate palettes; minimum measured contrast **9.79:1**, Back/download-handler clicks pass, zero page errors. Another one-off inspection passed five palettes for transparent normal navigation, actual selection idle/ready save colors, both divider colors and scrollbar colors; screenshots inspected. No new permanent CSS-only test was added.

The user subsequently supplied before/after screenshots and explicitly requested restoring the conversation voice card. Conversation audio now again uses its original light themed bubble, 21 decorative waveform bars, round glass play button, horizontal volume/mute control, and lower seek + round download row. Gallery video/audio retain the approved icon-only shared layout and palette-colored tracks. Shared metadata/playback/repair/visibility lifecycle and selection propagation protection remain. Existing relevant assertions were restored to the requested conversation design; gallery checks remain intact. `web-chat-audio.js` now branches presentation on the existing `gallery` option, and voice optics excludes gallery `.small-player-button` controls.

Restoration verification: 326 units pass / 1 platform skip; `conversation-audio` real WAV/lifecycle/seek/volume/mute/error across four widths; `conversation-controls` actual download/layout across three widths; `small-player-layout` all seven sizes plus original conversation geometry and gallery track pixels; `settings-themes`; `uiux-review` held-module reload/first paint/disabled/on/hover color return; `glass-controls` real voice optics and cleanup all passed locally. Screenshot `/workspace/replay-actions-20261116/restored/audio-ready-1440.png` was visually inspected against the supplied original. Initial tests exposed gallery sharing the same enhancer; presentation was scoped with `gallery` before the final passing runs. PR #128 contains this completion; read checks against the final restoration head, not earlier `45f7fbc` results.

Continue the previously authorized merge/deploy after exact-head CI succeeds, then verify actual public assets. Preserve mixed CRLF in `index.html`; use `git -c core.whitespace=cr-at-eol diff --check`. Earlier deployment notes below remain history.

## PR #127 production deployment confirmed — 2026-11-16 (Asia/Seoul)

- User explicitly approved merge/deploy. [PR #127](https://github.com/fffdsaw/fromm-viewer/pull/127) is merged into main at `2c380a99229e791b61045758f50089550fbca1b0`, containing final implementation/test head `e1c163a6cab20cf366192273a4427f93c7022d0b` and all earlier stabilization history.
- All **10/10 final PR checks passed**, including Linux Chromium, Windows Chrome/Edge and the full Channel browser suite (16m30s). Classic login text/placeholder colors fixed the initial hosted-browser contrast failure; no assertion was relaxed.
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43734855406) and [public-file verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43734855717) both succeeded for this merge SHA.
- An independent public check matched **21 HTML/JS/CSS assets byte-for-byte**, including new themes/composer/optics and existing conversation/cache/download/PiP modules. A fresh anonymous Chromium session loaded the login/shared helper; Classic persisted after reload and matched meta theme-color `#171a21`; **zero page errors**. No real user session or comment was used.
- Local receipts are `/workspace/review-20261116/production-127-verified.json` and `/workspace/review-20261116/production-127-login.png`. Network checks use `NODE_USE_ENV_PROXY=1`; no credentials are recorded.
- Feature branch was fast-forwarded to production, then saved with this documentation-only checkpoint. All runtime changes are already in main; this receipt does not require another UI deployment. The in-progress notes below are historical and superseded.

## Icon-only compact controls, LIVE composer, sidebar and palette follow-up — 2026-11-16

This is the current checkpoint. Work continues on `codex/fromm-viewer-uiux-stabilization-20261114` from clean `07612090f54b814158b5b1f7dade8ebfaca7cf60` (production `93cdd01bb74777811d5469e6d6a62ceea4d5ce46` plus the prior deployment receipt). Remote refs/open PRs were checked before editing; main remained unchanged. The user first requested a summary, corrected the menu-effect scope, then authorized implementation and added the theme follow-up. The user subsequently explicitly approved merging/deploying PR #127. Pre-merge CI passed 9/10 checks; Channel found low-contrast Classic login placeholders on the hosted browser. Login fields now explicitly use palette surfaces/text/placeholders, with direct typed-text and placeholder AA assertions in addition to axe. The strengthened settings/theme suite and all seven login-startup scenarios pass locally after the fix. Read final checks against the follow-up fix SHA before merging. Find the replacement PR with `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup`.

- Compact video/audio play and volume are icon-only: no circle, background, border, shadow or optical engine. Existing 38px/44px hit targets, layout, handlers, mint tracks, white knobs/time/glyphs, volume popup, source repair and metadata limits remain. Separate download controls keep their existing behavior/material. Expanded players are unchanged.
- The missing cursor effect is in the navigation above the artist list (photos/video/LIVE/etc.), not artist hover. Decoded video intentionally parks expensive optics; a visible lightweight moving highlight now remains during playback. Alternate palettes also stop the active menu background from covering that carrier. Reduced-motion, touch and engine budgets remain intact.
- Artist rows now distribute through the available height, keeping the last avatar/selection rim inside the list and reducing excess bottom padding. Avatar size remains 32px. Very short lists remain grouped; longer lists retain scrolling. Seven sizes (320×600–1920×1080), 9/12/30 profiles, initial and final rows, collapsed/expanded rails are covered.
- LIVE send retains input focus by making a pending draft read-only instead of disabling/blurring it. The clicked/keyboard submit focuses the composer; ACK clears/unlocks it. Policy blocking, Korean IME, one POST, uncertain-send duplicate protection, ACK/real echo and cancellation stay authoritative.
- LIVE has a 24-choice ordinary Unicode emoji picker with current-selection insertion, the existing 500-unit limit, arrow/Escape keyboard handling, outside close, fullscreen/viewport fitting and focus return. Opening/inserting never posts; explicit send uses the existing normal-comment endpoint. Tests check the actual emoji in the synthetic POST body.
- Only `.live-head #livePipBtn` is hidden in CSS, including the offline header. The controller/DOM handler and PiP button inside the player are untouched; real PiP/browser lifecycle tests pass.
- Added Classic gray/pink based on the original dark root palette. Alternate palettes synchronize sidebar/header/pseudo rims, controls/selected states, fields, reading surfaces, settings and PWA theme-color/color-scheme. PC/mobile optical tints refresh from palette variables without leaking engines. Sidebar outline/seam/pseudo decorations and alternate-palette shadow/menu borders are removed. Dark media controls remain white/mint. Classic reply/unavailable-media/login text is readable; system contrast colors remain respected.

Actual local verification: Node **24.22.1**, Playwright **1.62.1**, Linux Chromium **151.0.7922.34**, synthetic fixtures only. Evidence/logs are outside the repository at `/workspace/review-20261116/`.

- `node --test test/*.test.cjs native-live/test/*.test.cjs`: **326 pass / 0 fail / 1 platform skip** (`unit-final.log`).
- Passed browser suites: `small-player-layout`, `settings-themes`, `uiux-review`, `rail-lens-spinner`, `live-chat-probe`, `live-fit-comments`, `live-ui-pip`, `compact-video-player`, `conversation-audio`, `conversation-controls`, `glass-controls`, `header-glass`, `rail-focus`, `rail-startup`, `glowme`, `glowme-phase3-a11y`, `chat-download-selection`, `direct-selection`, `selection-gestures`, `replay-player`, `channel-player`, `player-settings`.
- New checks exercise cursor visibility during parked playback across all six themes; actual decoded video/audio with icon-only controls; shared palette values/borderless sidebar; Classic reload/meta-color; full conversation and fresh anonymous login AA; emoji insert/limit/Escape/actual POST; send focus; fullscreen picker; offline header shortcut hidden while full PiP controls/lifecycle keep working.
- Initial checks caught a popup inheriting `pointer-events:none`, dark-theme hardcoded text and a sampled in-flight row background transition. The popup owns pointer events, palette text is corrected, and artist color changes apply synchronously. Final unchanged function/contrast expectations pass; no test was removed.
- JS syntax and `git -c core.whitespace=cr-at-eol diff --check` pass. Preserve mixed CRLF in `index.html`. Current remote CI must be checked against the new PR SHA, not PR #126's historical green checks.

Physical Windows/Mac/Safari and real-account LIVE service are not locally verified. No real comments, user sessions, cache changes or experimental-site changes were used. The user explicitly approved PR #127 merge/deployment; complete it after its final CI succeeds. Preserve the prior PR #126 stabilization/deployment history.

Resume: inspect status/remote head/PR checks; run `node test/small-player-layout.browser.cjs`, `node test/settings-themes.browser.cjs`, `node test/rail-lens-spinner.browser.cjs`, `node test/live-chat-probe.browser.cjs`, and `node test/live-fit-comments.browser.cjs`. Keep prior stabilization history and do not clear user caches.

## Production deployment confirmed — 2026-11-15 (Asia/Seoul)

- User explicitly approved merge/deploy. [PR #126](https://github.com/fffdsaw/fromm-viewer/pull/126) is merged; production main commit is `93cdd01bb74777811d5469e6d6a62ceea4d5ce46`, containing implementation/test head `409e0c8e3953a6b1c065b54c9b567f861e673410` and the earlier stabilization history.
- All **10/10 PR checks passed**, including Linux Chromium and Windows Chrome/Edge conversation/download checks, media bulk save, and the complete Channel browser suite (17m36s).
- [Pages deployment](https://github.com/fffdsaw/fromm-viewer/actions/runs/43726544799) and [public-file verification](https://github.com/fffdsaw/fromm-viewer/actions/runs/43726544708) both succeeded for the production merge SHA.
- An independent public check matched **14 HTML/JS/CSS assets byte-for-byte**, including shared controls, sidebar, conversation/cache and download code. A fresh anonymous Chromium session showed the login form, loaded the shared player helper, and raised **zero page errors**. No user session or private data was used.
- Local synthetic/evidence receipts: `/workspace/integration-results/production-126-verified.json` and `/workspace/integration-results/production-126-login.png`. Network checks in this environment use the configured proxy (`NODE_USE_ENV_PROXY=1` for Node fetch); no credentials are recorded.
- The existing feature branch was fast-forwarded to production and then saved with this documentation-only checkpoint. Runtime changes are all in main; the checkpoint itself does not require a new UI deployment. Historical in-progress sections below are superseded.

## Approved shared small-player layout and complete artist rows — 2026-11-15

This checkpoint supersedes the earlier gallery-native/waveform/eight-profile notes below. PR #123 was merged into production main at `3e8259489a06fcb9ed36d3af8507ba9ccf38780b` after explicit user approval. This follow-up starts from that commit (`git merge --ff-only origin/main`) on the preserved branch `codex/fromm-viewer-uiux-stabilization-20261114`. The approved scope explicitly includes **both video and audio**, in media cards and conversations. The replacement PR targets `main`; retrieve its current URL/head/checks with `gh pr view codex/fromm-viewer-uiux-stabilization-20261114 --json url,headRefOid,statusCheckRollup`.

- `web-small-player.js` supplies shared markup, transparent vertical volume interaction and filled-track progress. Existing video/audio controllers retain playback, metadata concurrency, source repair, downloads, selection and offscreen cleanup. Gallery audio keeps the headphone cover and existing cover ratio; conversation voice replaces its decorative waveform with the approved seek layout.
- Every small player uses one row: play → long seek → volume, with time above the seek. There is no compact fullscreen icon; video F/double-click preview behavior remains. Expanded Replay/Channel/LIVE controls are unchanged.
- Volume rises above the speaker, with no visible percentage, popup panel, border or shadow. Seek/volume filled segments are mint `#72ddbd`; remaining tracks are translucent white with white thumbs. Mobile legacy MVC styles are explicitly overridden for this shared layout. Touch adjustment keeps the popup open until an outside interaction/Escape; keyboard focus and desktop hover work without hiding during a drag.
- Artist fitting now uses the actual list length and navigation margins rather than an eight-row cap. All nine avatars fit at 1536×838/1440×900. Shorter/longer lists reserve whole rows, expose scrolling, and leave the final profile fully reachable. Bottom breathing room is outside the scrollport, preventing a sliver of the next avatar. Avatar size stays 32px.
- Asset versions include the new helper. Conversation and Channel CI cover the change; the new decoded-media/pixel regression runs in Channel CI. Pages verification hashes the new helper and compact assets. Synthetic fixtures only; no attached/private media is committed.

Local environment: Node **24.22.1**, Playwright **1.62.1**, Linux Chromium **151.0.7922.34**. Verification evidence is outside the repository at `/workspace/integration-results/`.

- Unit suite `node --test test/*.test.cjs native-live/test/*.test.cjs`: **326 pass / 0 fail / 1 platform skip**.
- `small-player-layout.browser.cjs`: actual MP4/WAV playback, seek, vertical pointer/touch volume, mute, popup appearance, rendered mint pixels, themes, shared gallery/conversation geometry; initial/full-end avatar checks with 9/12/30 profiles at six sizes from 320×600 to 1536×838. The range-aware synthetic video response is necessary for real Chromium seeking.
- Passed browser suites: `compact-video-player`, `conversation-audio`, `conversation-controls`, `uiux-review`, `uiux-cards-sidebar`, `settings-themes`, `glass-controls`, `header-glass`, `rail-focus`, `rail-startup`, `rail-lens-spinner`, `chat-download-selection`, `replay-player`, `channel-player`, `player-settings`.
- JS syntax and `git -c core.whitespace=cr-at-eol diff --check` pass. Preserve the mixed CRLF shell when editing `index.html`.
- An initial no-screenshot conversation-controls run hit the existing latest-shortcut disappearance timing; the CI-equivalent screenshot-enabled run and the final run passed unchanged shortcut behavior. A real touch volume test exposed premature popup closure; the shared adapter was fixed and the actual touch regression passes.

The user explicitly approved merging and deploying this follow-up after PR #126 was created. Pre-merge CI exposed insufficient contrast on missing-file audio placeholders: the dark voice surface is now limited to cards containing an actual shared player, preserving the regular placeholder palette. The unchanged `glowme` and `glowme-phase3-a11y` browser suites now pass locally; `conversation-audio` also passes all four widths after the fix. On `2ecc398`, nine remote checks passed and Channel passed the new compact/media suites before its legacy direct-selection test still expected speaker-click muting. Both direct-selection and selection-gestures now exercise the approved popup/volume input, retain M muting, and assert unchanged selection; both pass locally on desktop/mobile without changing runtime behavior. Read final remote checks against the subsequent test-alignment commit. Remote CI must be read against the replacement PR SHA, not PR #123's historical green checks. Physical Windows/Mac/Safari remain unverified locally; CI covers Chromium and Windows Chrome/Edge for the relevant conversation regressions. Preview auto-deployment was disabled earlier, but unpublishing the existing preview site was blocked by GitHub integration permissions (403); production and preview are separate repositories.

Resume: inspect `git status --short --branch`, `git rev-parse HEAD`, `git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114`, and the current PR/checks. For this UI change run `node test/small-player-layout.browser.cjs`, `node test/compact-video-player.browser.cjs`, `node test/conversation-audio.browser.cjs`, `CONVERSATION_DIR=/tmp/fromm-conversation node test/conversation-controls.browser.cjs`, and `node test/uiux-review.browser.cjs`. Do not clear user caches or publish to the experimental repository.

## Screenshot/video review follow-up — five display regressions

This is the latest implementation checkpoint and supersedes the older gallery/audio and sidebar descriptions below. Continue the same feature branch and draft PR #123. Starting local/remote/PR HEAD was `1c7bb5019180d37549abb6b12cfc09c729de1dc5`, with a clean checkout; remote refs and the existing PR discussion were inspected before editing. Main remains `fe010e5dc263ac45ef44171c90722f185c433af5`.

- Gallery voice cards restore the production headphone cover and native bottom audio controls. The original image/video cover ratio, lazy loading, repair, selection and download behavior remain. Conversation voice bubbles retain their custom waveform and Meapri controls; gallery-only custom styling/enhancement was removed at the gallery call site.
- Expanded Replay/Channel MVC buttons are excluded from the optics selector. Compact video controls and other existing small controls retain their effects. Both actual expanded-player suites assert that no glass faces/buttons are mounted.
- Desktop navigation fits up to eight unchanged 44px artist rows by adapting navigation row height within 34–42px, keeping avatars at 32px. Shorter/mobile viewports and longer lists remain scrollable. The old test only checked the last avatar after scrolling; the new regression checks the initial eight-row layout at 1536×838 and 1440×900, collapsed and expanded. Fractional feedback from clientHeight rounding caused an intermediate unstable layout; rect measurements and integer row heights fixed it before final verification.
- Sidebar artist separator is removed for every palette; themes no longer apply a new border color to the sidebar. The existing borderless outer panel and disabled seam pseudo-element remain intact.
- Conversation voice buttons paint their resting glass material before asynchronous optics initialization. Resting faces suppress nearby-pointer illumination. Mouse focus on a voice button no longer retains the interaction-only engine after pointer leave, while keyboard focus remains supported. The eight-engine budget is unchanged.

### Additional CI findings resolved before the final checkpoint

The first revision `3d16904` was pushed successfully, then its new CI exposed two real compatibility gaps. Conversation Chromium/Windows Chrome/Edge expected the original flat voice controls when glass was explicitly disabled; the first-paint material now reads the saved disabled setting in the synchronous shell and tracks the shared preference class. The unchanged disabled-style assertions pass locally. A new held-module reload verifies saved OFF before/after module initialization and ON restoration.

Adding background-color to the actual face comparison also reproduced the reported hover tint latch: Meapri destroy leaves its inline tint behind. Engine release now clears that owned background color. The original gradient, color, border and shadow all return after pointer leave. The existing eight-engine budget remains unchanged.

Channel CI also caught text touching the old fixed 6px rim mask after a short-window navigation row shrank. The mask narrows with the actual capsule radius, retaining the original 6px rim on regular rows; menu radius/options refresh when height changes. The unchanged pixel test passes at 1440, 760 and 900×700 PWA, plus touch cleanup. No old assertion was relaxed.

### Actual verification for this follow-up

Environment: Node **24.22.1**, Playwright **1.62.1**, Linux Chromium **151.0.7922.34**; synthetic data/local WAV/MP4 only.

- `node --test test/*.test.cjs native-live/test/*.test.cjs`: **326 pass / 0 fail / 1 platform-specific skip**.
- Passed: `uiux-review`, `uiux-cards-sidebar`, `settings-themes`, `compact-video-player`, `conversation-audio`, `glass-controls`, `header-glass`, `chat-download-selection`, `replay-player`, `channel-player`, `player-settings`, `rail-focus`, `rail-startup`, `rail-lens-spinner`, `glass-settings-startup`, `conversation-controls` browser suites.
- New review suite covers gallery cover ratios/native light controls at 1536×838, 1440×900, 1280×720, 900×560, 390×844; eight-artist initial display and short-viewport scrolling; every theme; a genuine reload with the optics module held back; identical resting gradient/color/border/shadow before/after initialization and press/leave restoration for play and download, plus saved OFF/ON restoration.
- The new suite fails on archived baseline `1c7bb50`: at 1536×838 the final avatar extends to y=865 while its scroll area ends at y=814. It passes on the revised implementation.
- Native gallery playback/pause/seek/volume/mute are exercised against decoded WAV. The WAV fixture now supports byte ranges for native seeking. Conversation playback separately verifies that icon replacement preserves its actual decorative lens. Existing compact video, selection/download and expanded player behavior tests are retained.
- A repeat unit run under simultaneous browser load hit the existing 25ms cancellation timing assertion (325 pass / 1 fail / 1 skip); an isolated serial rerun passed 326/0/1. No downloader code/test was changed.
- JS syntax and `git -c core.whitespace=cr-at-eol diff --check` passed. Browser evidence is synthetic and stored locally outside the repository; user attachments were not committed.
- Conversation CI now runs the new regression on Linux Chromium and Windows Chrome/Edge. Remote results must be checked against the newly pushed SHA; historical 10/10 results below belong to older SHAs.

Physical Mac/Windows devices and Safari remain unverified locally. The existing Mac layout is covered through viewport checks only. No production/Preview deployment, main merge, cache clearing or experimental-repository change is authorized or performed. Keep PR #123 draft.

Resume: inspect `git status --short --branch`, `git rev-parse HEAD`, and `git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114`; compare with PR #123 HEAD and its current checks. Install the CI browser dependencies if needed and run `node test/uiux-review.browser.cjs` plus the affected suites listed above.

## Final integration checkpoint — 2026-11-15 (Asia/Seoul)

**This section supersedes all earlier in-progress status notes below; those notes are preserved as history.**

- Branch: `codex/fromm-viewer-uiux-stabilization-20261114`; [draft PR #123](https://github.com/fffdsaw/fromm-viewer/pull/123).
- Verified implementation SHA: `3588097218b6c76ecac3d279f60e1a6530ffe08a`. The final handoff/report commit changes documentation and synthetic evidence only; its SHA and matching remote/PR HEAD are recorded in the PR completion comment. Obtain the checkout's latest SHA with `git rev-parse HEAD` and compare `git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114`.
- Production main remains `fe010e5dc263ac45ef44171c90722f185c433af5`. Experimental #124 remains `9e0f1e841ad8f7aaabafa454c3ed98045c2d5c6d`; #125 remains `dc561e219c1a20c94fe71111b8d01d1cc022a271`. No merge, force push, branch deletion, user-data clearing or deployment was performed.

### All 13 items

| Item | Final implementation / verification |
|---|---|
| 01 Cache refresh | Retained; synthetic complete/partial/503/cache-preservation browser checks |
| 02 Chat audio glass | Real Meapri lens; actual lens node retained through play/pause; download feedback preserved |
| 03 Hover restoration | Pointer/press/release/leave and resting lens bounds; compact stale-hover hold fixed |
| 04 Reply navigation glass | Real Meapri maps and original reply/quote navigation regressions |
| 05 Header glass | Token/logout/refresh real optical faces; indicator cannot enter button pressed state |
| 06 Sidebar avatar clipping | Existing 32px avatar/selection retained; final avatar fully inside scroller at desktop/short/mobile sizes |
| 07 Text/reply cards | Repeated incoming artist name removed, unified mint/aqua padding/border, time and reply jumps retained |
| 08 Scroll restoration | Existing cache/virtual anchors and latest-follow retained; refresh/resize/tab-return regressions |
| 09 Common players | Compact/expanded/audio retained and completed; real fixture playback/seek/volume/fullscreen/PiP/selection/download/cleanup |
| 10 Audio tab icon | Existing alignment/size with waveform SVG |
| 11 Type badges | Removed from media/photo/video/audio markup; download/select/save unchanged |
| 12 Settings | General/Theme/Glass/Advanced; bounded drag/location, modal focus/Escape, visible keyboard switch focus, actual mobile optical settings, preserved preferences/reset/install |
| 13 Themes | Glow ME default + Aqua/Sky/Lavender/Neutral; preview/persist/reload/reset, AA text contrast and bounded optical resources |

“Verified” means the synthetic fixtures and environments listed here, **not** authenticated production-service verification.

### Final checks

- Local Node 24.19.0: `node --test test/*.test.cjs native-live/test/*.test.cjs` — **326 passed, 0 failed, 1 platform-specific skipped**. Syntax and CRLF-aware whitespace checks passed.
- Local Playwright 1.62.1 / Chromium 151.0.7922.34: scoped card/settings/theme/Meapri/compact/audio/Channel/Replay/LIVE/selection/cache/browser regressions recorded in the report. Actual MP4/WAV and fullscreen enter/exit exercised. Touch/PWA are emulations.
- Exact implementation `3588097218b6c76ecac3d279f60e1a6530ffe08a`: **all 10 GitHub Actions checks passed**. [Conversation 43683927488](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927488), [Video 43683927496](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927496), [Media 43683927492](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927492), [Channel 43683927501](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927501). Conversation includes Windows Chrome/Edge and Chromium settings/themes/cards, actual mobile optical on/off/refraction and visible keyboard focus, plus Linux 50k. Channel includes the full browser suite and Xvfb Back/Forward. No remaining failed check on this implementation SHA.
- Local complete Channel workflow status: **52/52 command executions passed** at the development checkpoint; final exact-head Actions are authoritative. Additional mobile renderer/focus/collection palette cases passed locally and in all three CI browsers.
- Corrected failures are preserved in earlier checkpoints: native-control expectation; legacy outside-settings install expectation; partial-cache fixture race on Windows; stale compact hover; optical faces removed by whole-button icon replacement. No tests were deleted or relaxed to hide broken behavior.

### Evidence, limitations and approval gate

- [Korean integration report](docs/development/reviews/UIUX_STABILIZATION_20261115.md), desktop/mobile/settings/chat screenshots and paired performance JSON are committed. The glass benchmark compares ON/OFF in short synthetic scenes; it is not an engine-version speedup claim. Added CPU cost, small video frame drops and GPU/heap measurement limits are explicitly reported.
- Real Fromm login, authenticated API contract, actual user caches/LIVE, physical Android/iOS and Safari are **unverified**. Windows Chrome/Edge coverage is from CI, not a local Windows desktop session.
- PR #124 enhanced optics and #125 Meapri×ybouane research are separate and unchanged; no experimental optical modes were imported.
- Keep PR #123 draft. **Main merge and all public/Preview deployments require the user's new final approval**, even if every check is green. Do not interpret historical approvals lower in this file as current authorization.
- Next authorized work: review this exact PR/HEAD with the user; make requested revisions on this branch and rerun affected checks. Do not restart from main or redo the completed cache/scroll work.

Resume in another account:
```sh
git fetch origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114:refs/remotes/origin/codex/fromm-viewer-uiux-stabilization-20261114
git switch --track origin/codex/fromm-viewer-uiux-stabilization-20261114
# If already checked out, inspect status first and use a fast-forward-only pull.
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114
gh pr view 123 --repo fffdsaw/fromm-viewer
fromm_head=$(git rev-parse HEAD)
gh api "repos/fffdsaw/fromm-viewer/commits/${fromm_head}/check-runs"
```
Read `AGENTS.md`, this top section, the consolidated report, latest PR completion comment, and latest-head Checks before acting. Browser workflow commands remain in `.github/workflows/`; external local dependencies are optional and not committed. No production credentials are needed for fixture tests.

## Completed mobile-glass follow-up — 2026-11-15

- Additional final inspection found mobile settings saved values but the legacy mobile Meapri renderer still used fixed options and ignored the enabled switch. This follow-up is included in the verified implementation above. No deployment/merge was performed.
- `web-glass.js` now subscribes to the same preference singleton as PC controls, tears down mobile engines when disabled, and updates existing mobile instances when settings change. Role-scaled values reproduce the original default mobile material exactly (16 refraction / 18 thickness / 2.5 blur / 110 saturation / .42 tint / .3 gloss); balanced quality, map ratio, low-power/accessibility/idle guards remain. No high-performance/experimental mode or vendor code was imported. The panel explains mobile strength scaling.
- A new actual-renderer mobile check in `settings-themes.browser.cjs` reproduces the old enabled-switch failure, then passes with the fix: real SVG map ready, switch off removes optical resources, switch on recreates them, refraction increases the actual displacement scale, saved values/restore remain correct. It also includes existing desktop/mobile/blocked-storage/collection palette checks. Local 1440/900/390 all passed. Existing settings and PC glass regressions also passed; Node/native 326 passed, 0 failed, 1 platform-specific skip. New exact-head CI passed all 10 checks, including all three browser UI matrices.
- The settings switch also keeps a visible focus ring on its track at narrow/touch widths; the transparent native input must not hide keyboard focus. The full settings/theme suite passed at 1440/900/390 with actual Tab navigation, mobile on/off/map updates and collection colors.
- Entry/control/preference imports share the new `mobile-preferences-20261115` version, preventing duplicate settings objects. Preserve the existing historical completion records below as evidence for their exact SHAs, not as proof for this follow-up.

## Historical verified integration checkpoint — fc32bc9

Historical evidence for `fc32bc9`, before the additional mobile-renderer/focus follow-up. Use the final checkpoint at the top for the current implementation.

- Branch: `codex/fromm-viewer-uiux-stabilization-20261114`; [draft PR #123](https://github.com/fffdsaw/fromm-viewer/pull/123).
- Verified implementation SHA: `fc32bc99168ca628c79e1a8899df8b24c070b033`. The final handoff/report commit changes documentation and synthetic evidence only; its SHA and matching remote/PR HEAD are recorded in the PR completion comment. Obtain the checkout's latest SHA with `git rev-parse HEAD` and compare `git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114`.
- Production main remains `fe010e5dc263ac45ef44171c90722f185c433af5`. Experimental #124 remains `9e0f1e841ad8f7aaabafa454c3ed98045c2d5c6d`; #125 remains `dc561e219c1a20c94fe71111b8d01d1cc022a271`. No merge, force push, branch deletion, user-data clearing or deployment was performed.

### All 13 items

| Item | Final implementation / verification |
|---|---|
| 01 Cache refresh | Retained; synthetic complete/partial/503/cache-preservation browser checks |
| 02 Chat audio glass | Real Meapri lens; actual lens node retained through play/pause; download feedback preserved |
| 03 Hover restoration | Pointer/press/release/leave and resting lens bounds; compact stale-hover hold fixed |
| 04 Reply navigation glass | Real Meapri maps and original reply/quote navigation regressions |
| 05 Header glass | Token/logout/refresh real optical faces; indicator cannot enter button pressed state |
| 06 Sidebar avatar clipping | Existing 32px avatar/selection retained; final avatar fully inside scroller at desktop/short/mobile sizes |
| 07 Text/reply cards | Repeated incoming artist name removed, unified mint/aqua padding/border, time and reply jumps retained |
| 08 Scroll restoration | Existing cache/virtual anchors and latest-follow retained; refresh/resize/tab-return regressions |
| 09 Common players | Compact/expanded/audio retained and completed; real fixture playback/seek/volume/fullscreen/PiP/selection/download/cleanup |
| 10 Audio tab icon | Existing alignment/size with waveform SVG |
| 11 Type badges | Removed from media/photo/video/audio markup; download/select/save unchanged |
| 12 Settings | General/Theme/Glass/Advanced; bounded drag, saved location, native modal focus/Escape, mobile, existing preferences/reset/install |
| 13 Themes | Glow ME default + Aqua/Sky/Lavender/Neutral; preview/persist/reload/reset, AA text contrast and bounded optical resources |

“Verified” means the synthetic fixtures and environments listed here, **not** authenticated production-service verification.

### Final checks

- Local Node 24.19.0: `node --test test/*.test.cjs native-live/test/*.test.cjs` — **326 passed, 0 failed, 1 platform-specific skipped**. Syntax and CRLF-aware whitespace checks passed.
- Local Playwright 1.62.1 / Chromium 151.0.7922.34: scoped card/settings/theme/Meapri/compact/audio/Channel/Replay/LIVE/selection/cache/browser regressions recorded in the report. Actual MP4/WAV and fullscreen enter/exit exercised. Touch/PWA are emulations.
- Exact implementation `fc32bc99168ca628c79e1a8899df8b24c070b033`: **all 10 GitHub Actions checks passed**. Conversation [43681382970](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382970): Chromium/Windows Chrome/Windows Edge, including new settings/themes/cards and Linux 50k. Video [43681382886](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382886): all three browsers. Media [43681382776](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382776): unit/browser. Channel [43681382814](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382814): unit/full browser/actual Xvfb Back and Forward. No remaining failed check on this implementation SHA.
- Local complete Channel workflow status: **52/52 command executions passed**. Local complete run started at the development checkpoint; the final exact-head Actions above are authoritative. New collection palette regression also passed locally before push and in the Windows/Chromium matrix.
- Corrected failures are preserved in earlier checkpoints: native-control expectation; legacy outside-settings install expectation; partial-cache fixture race on Windows; stale compact hover; optical faces removed by whole-button icon replacement. No tests were deleted or relaxed to hide broken behavior.

### Evidence, limitations and approval gate

- [Korean integration report](docs/development/reviews/UIUX_STABILIZATION_20261115.md), desktop/mobile/settings/chat screenshots and paired performance JSON are committed. The glass benchmark compares ON/OFF in short synthetic scenes; it is not an engine-version speedup claim. Added CPU cost, small video frame drops and GPU/heap measurement limits are explicitly reported.
- Real Fromm login, authenticated API contract, actual user caches/LIVE, physical Android/iOS and Safari are **unverified**. Windows Chrome/Edge coverage is from CI, not a local Windows desktop session.
- PR #124 enhanced optics and #125 Meapri×ybouane research are separate and unchanged; no experimental optical modes were imported.
- Keep PR #123 draft. **Main merge and all public/Preview deployments require the user's new final approval**, even if every check is green. Do not interpret historical approvals lower in this file as current authorization.
- Next authorized work: review this exact PR/HEAD with the user; make requested revisions on this branch and rerun affected checks. Do not restart from main or redo the completed cache/scroll work.

Resume in another account:
```sh
git fetch origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114:refs/remotes/origin/codex/fromm-viewer-uiux-stabilization-20261114
git switch --track origin/codex/fromm-viewer-uiux-stabilization-20261114
# If already checked out, inspect status first and use a fast-forward-only pull.
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114
gh pr view 123 --repo fffdsaw/fromm-viewer
fromm_head=$(git rev-parse HEAD)
gh api "repos/fffdsaw/fromm-viewer/commits/${fromm_head}/check-runs"
```
Read `AGENTS.md`, this top section, the consolidated report, latest PR completion comment, and latest-head Checks before acting. Browser workflow commands remain in `.github/workflows/`; external local dependencies are optional and not committed. No production credentials are needed for fixture tests.

## Earlier continuation — 2026-11-15 (historical checkpoints)

- Active branch: `codex/fromm-viewer-uiux-stabilization-20261114`; draft PR [#123](https://github.com/fffdsaw/fromm-viewer/pull/123). Resume here, not the historical PR #121 branch below.
- Starting remote HEAD: `ad7c01c8cd3c7ef27acc28f5e7029d328379e01e`; main `fe010e5dc263ac45ef44171c90722f185c433af5`. Main is an ancestor (0 main-only / 42 feature-only commits). Both pre-existing local checkouts were clean; work continues in a separate worktree preserving them.
- Reviewed PRs #121–125 and their scopes. PR #121 is already in this branch ancestry; #122 remains an independent button experiment. #124 (`9e0f1e8`) and #125 (`dc561e2`) remain separate optical experiments/research based on `ad7c01c`; no changes were merged from them. No conflicting main-only commits exist at this audit. Shared player/control files make wholesale experimental merges a semantic conflict risk even without textual conflicts.
- Exact-start CI: Conversation 43566270606 (Chromium/Chrome/Edge), Video 43566270588 (all three), and Media 43566270602 passed. Channel 43566270607 unit passed, browser failed at `chat-download-selection.browser.cjs:23` (`null !== ''`). Reproduced locally before changes. Visible videos intentionally replace native controls with compact controls; updated the assertion to require the labeled custom group, play/sound/fullscreen/seek and unchanged selection. Real individual download bytes, drag selection, preview, breakpoint and gallery restoration checks remain intact. Updated older browser fixture asset allowlist so player regressions exercise the actual compact module/CSS instead of silently omitting them.
- Baseline local `node --test test/*.test.cjs`: **275 passed**, Node **24.19.0**. Local Playwright **1.62.1 / Chromium** now starts successfully on Linux; the macOS limitation in older notes does not apply here.
- Updated selection test passed at 1440 / 760 / 900 PWA and 390 touch emulation. `glass-controls.browser.cjs` passed all three desktop/PWA sizes, no-IntersectionObserver fallback and 390 touch. It verifies real SVG displacement changes pixels, nonzero maps, pointer state restoration, audio/header/reply controls, map budget, repeated mount cleanup and reduced-motion teardown. The resting-size assertion now waits for the intentional hover expansion to settle (bounded 1.5s), rather than inspecting mid-transition.
- Phase 2 (02/03/04/05): synthetic browser evidence above; no claim about real Fromm account screens. Phase 3 (09) remains **in progress**: existing compact/audio waveform implementation confirmed; additional playback/lifecycle tests exposed hover-fade and offscreen-fixture issues under investigation. Phase 4 (06/07/10/11) and Phase 5 (12/13) remain in progress. Phase 1 (01/08) code untouched and retained; rerun affected integration regressions before final completion.
- No real login/API, personal data, Windows desktop, physical mobile or Safari was exercised in this checkpoint. **No merge or deployment (including preview) is authorized.** Keep PR draft pending final user approval.

### Phase 3 local checkpoint

- Compact controls already existed at `ad7c01c`; retained their streaming/native fallback boundaries. Fixed a stale hover flag after layout/pointer changes which could indefinitely prevent auto-hide. Document pointer movement now reconciles the actual CSS hover state. Offscreen test scrolls to the center so composer clipping cannot leave its target outside the visible area.
- `test/compact-video-player.browser.cjs`: **passed** real local 12s MP4 and 24s WAV playback/pause/seek/volume/mute, keyboard, idle fade, touch controls, gallery + conversation, decorative waveform (`aria-hidden`), offscreen cleanup and no overflow. The prior failures and fix were reproduced locally, not suppressed.
- Full Node + native contract suite: **326 passed, 0 failed, 1 platform-specific skipped** (327 total), Node 24.19.0. Expanded Channel/Replay/LIVE verification and whole-branch CI remain in progress; do not mark item 09 fully verified until their completion.
- This checkpoint is pushed separately from remaining card/settings changes. Use `git log -1` and `git ls-remote` for its exact remote SHA.

### Phase 4 local checkpoint

- Items 06/07/10/11 implemented: bounded artist scroller end padding retains the 32px avatar and selection rim; incoming text/reply cards omit repetitive sender names while retaining footer times and quote navigation; audio tab uses waveform SVG; media/photo/video/audio kind badges removed from render markup (including missing-source cards), download/select handlers retained.
- `test/uiux-cards-sidebar.browser.cjs`: **passed** 1440×900, 900×560 and 390×844. Checks the actual last avatar rectangle against its scroll container, retained avatar size, waveform, absence of text sender label/presence of timestamp, quote accent, all four badge-free galleries, selection/save and no overflow. Its initially invalid fixture video URLs produced unavailable cards without downloads; the fixture was corrected to usable synthetic media URLs, without changing unavailable-card behavior.
- Expanded Channel and Replay suites passed real fixture decode/controls across desktop, narrow, portrait and landscape viewports. `live-fit-comments.browser.cjs` passed at 1440/760/900 PWA/390, preserving portrait ratio/height, bottom composer and fast synthetic comment echo. `conversation-audio.browser.cjs` passed at 1440/780 PWA/390/320: visible metadata probe bound, 24s decode, unknown/before/play/seek/end, volume/mute and cleanup. No authenticated API was exercised.
- Phase 5 settings/themes are separate work in progress. Whole-branch CI still gates final completion.

### Phase 3 selection compatibility follow-up

- Loading the real compact controls in legacy fixtures exposed an integration risk: video picture click/double-click listeners competed with existing selection/lightbox handlers. Removed the newly added picture listeners; explicit compact buttons and stage keyboard actions own playback, existing card handlers retain selection/preview semantics.
- `direct-selection.browser.cjs` and `selection-gestures.browser.cjs` both passed desktop/mobile with actual compact assets: single selection, double-click real-MP4 preview, controls not selecting, Shift ranges, drag/autoscroll, bulk bytes/names, account/channel isolation and logout. Their bottom-native-control clicks now target the actual compact mute button and assert it mutes the media without changing selection.

### Phase 5 local checkpoint — settings and themes

- Items 12/13 implemented without experimental PR #124/#125 optics: existing `fromm.pcGlass.v1` settings/defaults preserved, bounded native dialog with General/Theme/Glass/Advanced tabs, titlebar drag, retained position, viewport/visualViewport clamp, keyboard tab navigation/focus, touch layout and installation inside General. Touch gets a reachable rail footer action; desktop retains its rail-header action. Range/input/button events do not drag the window. Presentation reset changes only theme/glass/position, never IndexedDB/account data.
- Added `web-themes.js`, `themes.css`, `settings-panel.css`. Glow ME uses its original cascade; Aqua/Sky/Lavender/Neutral override shared surface/text/selection/accent variables. Synchronous theme restoration precedes rendering; selection persists, storage errors leave usable in-window settings. Playback surfaces remain dark; new palettes affect card/background/rail/header/progress/settings. All changed asset URLs are versioned; both module imports refer to the exact same glass-preference singleton.
- `settings-themes.browser.cjs` **passed** at 1440×900, 900×560, 390×844: all four categories with axe WCAG A/AA checks, measured text contrast ≥4.5 in settings and chat for every theme, theme preview/persistence, glass setting retention, bounded engine counters, drag/clamp/last-position restore, resizing to 390×500, slider non-drag, keyboard focus/reset, preserved 180 synthetic messages, blocked storage fallback. Resize bounds are awaited with a 3s bound to observe the actual resize event instead of asserting before dispatch. Reviewed desktop/mobile screenshots.
- Existing `glass-settings.browser.cjs` passed desktop/760/PWA/short-window, actual renderer slider changes, focus, saved-value normalization, unavailable storage, engine teardown and mobile selection/save. Updated the mobile assertion because settings now intentionally exist on touch layouts. Existing startup and menu/installation/download-queue suites passed; mobile installation is now tested inside General rather than its former outside position.
- Phase 1 regression reruns passed: complete/partial refresh, simulated 503/cache preservation, cache restore/merge/dedup (zero historical requests), reader anchor **0.00px** delta on conflict-flush dock resize, latest-follow after tab return at 1440/900 PWA/390.
- All 13 items are now implemented with the scoped synthetic/browser checks above; **final integrated CI and broad regressions are pending**, so this is not a release approval. Real API, physical mobile and Safari remain unverified.

### Integration validation checkpoint

- Added [the consolidated Korean report](docs/development/reviews/UIUX_STABILIZATION_20261115.md), desktop/mobile synthetic screenshots, and raw paired glass-performance JSON. Node 24.19.0 / Playwright 1.62.1 / Chromium 151.0.7922.34.
- Final local unit/native repeat: **326 passed, 0 failed, 1 platform-specific skipped**. Actual compact fullscreen enter/exit (not merely button presence) passed. Repeated full glass-controls suite passed all sizes/fallbacks after the settings singleton/version change.
- Paired OFF/ON synthetic glass samples: gallery p95 16.70/16.73ms, expanded rail 16.70/16.80ms, video 16.70/16.80ms. Gallery main-thread sample median 182.8/541.1ms: glass costs additional CPU and is not free. Video samples had 1/88 vs 3/88 dropped frames; short emulated samples do not establish device performance. Max sampled JS heap 4.28MiB, not total process/GPU memory. Eight-map budget and zero optical maps while video plays remained enforced. See report for exact limits.
- Settings/theme and card suites passed again; screenshots visually reviewed. Current all-13 implementation is complete against the scoped local fixtures. **Exact-head whole-branch Actions remain the final acceptance gate**. On pushed code `e54ee9be1da067200f5cfd0e794c36a65429278d`, runs: Channel 43679020720, Conversation 43679020715, Video 43679020707, Media 43679020705 (in progress at this checkpoint). A later final record will identify completed CI rather than claiming these have passed prematurely.

### Integration follow-up — CI synchronization and persistent lenses

- Exact-code `e54ee9b`/`4362cc8` Channel CI reached an old mobile install test that clicked the now-hidden former sidebar button directly. Updated `glowme.browser.cjs` to open General settings and still assert the real install prompt invocation; its PWA/cache/axe checks passed locally.
- Windows Chrome/Edge on `e54ee9b` timed out at refresh test line 87 while waiting for the transient 20-row partial state. Added a fixture-only gate on older history until the 20 cached rows are visible and the refresh button is clicked. This also ensures the fixture's `partialBase` has been assigned before producing server rows. All original exact message/count/cursor/cache-preservation assertions remain. Local gated refresh passed; Windows reruns pending. No cache production code was changed to mask a test timing issue.
- Real icon changes previously rewrote button `innerHTML`, removing its optical face. Audio, compact, expanded and LIVE controls now replace only their direct SVG glyph; compact also avoids redundant SVG updates on timeupdate. Actual-engine audio and compact tests assert the *same lens node* survives play/pause and seek/time/volume changes. Local compact/fullscreen, audio (all four sizes), LIVE PiP and full Node/native suites passed; assets re-versioned.
- Final integrated CI is still pending after these follow-ups. Do not interpret earlier local passes as a passing latest-head Actions run.

### Cross-browser UI matrix checkpoint

- Implementation `91f4c5e` passed Conversation on Windows Chrome/Edge and Chromium (including 50k), all three Video Download jobs, both Media jobs and Channel unit; the long Channel browser job remains in progress at this checkpoint.
- Added the new settings/theme and card/sidebar scenarios to the existing Conversation CI matrix, with `PLAYWRIGHT_CHANNEL` honored. This makes the new UI directly exercise Windows Chrome/Edge as well as Linux Chromium; it does not claim a physical phone or Safari test. Local versions of both new suites already passed; final matrix results remain pending.

### Media contrast preservation

- Kept the original light download-ring foreground on media controls across alternate palettes. Themes still color seek/progress tracks and accents; they do not replace the readable image-overlay progress ring with a dark text accent. No download behavior or animation changed.

### Collection palette follow-up

- Final palette comparison found Replay/Channel selected card bodies retained the old mint fill while media cards used the chosen theme. Added a real-renderer regression: selects Replay and Channel cards, renders a selected media card alongside, and compares their actual background colors in Aqua/Sky/Lavender/Neutral. It reproduced the mismatch (`rgb(239,249,243)` vs Aqua `rgb(196,232,229)`) before the CSS fix.
- Added collection bodies/selected bodies to the existing alternate-palette variables and matched audio seek thumbs to their track accent. Glow ME's original cascade and artist selection markers are unchanged. Expanded settings/theme suite passed at 1440×900, 900×560, 390×844 plus blocked storage. This new scenario is in the Windows/Chromium Conversation matrix.
- Local complete Channel workflow finished: **52 command executions passed**, including real media, LIVE/PiP, downloads, cache/navigation/accessibility, votes, reply rules and the loopback-only extension TLS send contract. Generated test artifacts were retained in `/tmp` and removed from the worktree, not committed wholesale.
- Prior product head `91f4c5e` passed **all 10** Actions checks. Latest-before-this-follow-up `75a806d` passed 9/10 with Channel browser still running. Final acceptance uses the new exact-head CI; no merge/deployment is authorized.

Resume:
```sh
git fetch origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114:refs/remotes/origin/codex/fromm-viewer-uiux-stabilization-20261114
git switch codex/fromm-viewer-uiux-stabilization-20261114
git status --short --branch
git log -8 --oneline
git ls-remote origin refs/heads/codex/fromm-viewer-uiux-stabilization-20261114
```
Use latest remote HEAD/Actions and the newest checkpoint above the preserved historical notes. Runtime dependencies are external to the worktree; local browser runs use `NODE_PATH=/workspace/.fromm-env/node_modules:/workspace/scratch/fromm-phase3/deps/node_modules`.

## Historical integrated UI/UX stabilization track — 2026-11-14

This section is the current continuation point for the 13-item Fromm Viewer integration request. The older PR #121 notes below are historical and remain useful for the cache implementation details; use this section for the active branch and priorities.

### Phase 0 audit

- Production `main` was `fe010e5dc263ac45ef44171c90722f185c433af5` (PR #120) when audited. It remains untouched.
- PR #121 (`07456870fc9901c6dfad6bc2e830efc4cadfecb5`) is open, unmerged, and based on that `main`. Its recent-first cache, progressive collection, duplicate/timestamp protection, and scroll-anchor work is retained as the base of this integration branch. Its then-current Conversation, Video, Channel, and Media CI runs passed.
- PR #122 (`25a84c64076ebfccef175683754083d4ca1bb623`) is open as a draft and unmerged. It is not used as the integration base. Its latest Channel browser run failed with `voice uses the Replay dark underlay without disabling its lens`; its Conversation, Video, and Media runs passed. Reuse only after reviewing individual changes.
- The production preview `https://fffdsaw.github.io/fromm-viewer/` and separate experimental preview `https://fffdsaw.github.io/fromm-viewer-preview/` returned HTTP 200. The experimental preview is managed separately and must not be changed as part of this task. The latest preview workflow inspected was successful; a reachable preview is not proof that this branch has been deployed there.
- `git merge-tree --write-tree origin/pr/121 origin/pr/122` reported no textual tree conflict, but this is not a reason to merge PR #122 wholesale; both PRs remain untouched.
- PR #123 (`https://github.com/fffdsaw/fromm-viewer/pull/123`) is the active draft against `main`, based on PR #121. Current branch: `codex/fromm-viewer-uiux-stabilization-20261114`. Latest pushed code checkpoint at this update: `4be69e3d89f97407ab6289bc1a46b18e6bc73586`.

### 13-item implementation status

1. **01 — cache-aware refresh: complete and browser-verified.** Code is in `9611791`. A complete synthetic cache retains its rows and merges only the latest response; a partial cache resumes from its saved older cursor; the refresh handler no longer clears room caches or resets the reader view; media-tab refresh merges new items; a simulated 503 leaves the cache intact. The dedicated browser scenario passed on Chromium, Chrome, and Edge.
2. **08 — conversation scroll restoration: complete against the synthetic browser cases; real Fromm data remains unverified.** PR #121's anchor/cache restoration remains intact. Existing browser cases cover saved-anchor restoration, tab return during progressive loading, media layout and viewport changes, and latest-follow behavior at desktop, narrow desktop/PWA simulation, and 390px mobile layout. The new refresh case also checks anchor position across viewport-height shrink and restore. Chromium, Chrome, and Edge passed.
3. **02–07, 09–13:** not implemented in this branch yet. Next: Meapri controls, hover/lifecycle, reply arrows, header glass; then common player; sidebar/text cards/waveform/badges; settings panel and themes.

### Current validation and next actions

- Local Node suite passed: 275 passed, 0 failed. JavaScript syntax and `git diff --check` passed.
- Local Playwright Chromium/Chrome could not start in this macOS sandbox (Mach port rendezvous permission error). Treat this as an environment limitation; use the repository browser CI and report it separately from assertion failures.
- No Fromm login or authenticated live API was available. All new refresh/browser fixtures use synthetic messages; live service behavior remains unverified.
- Exact-head browser Actions run `43558987337` passed all Conversation jobs: Chromium retry job `132339438643`, Chrome `132339439858`, and Edge `132339440476`. The first Chromium attempt failed once at the pre-existing `<1px` cache-anchor assertion in `conversation-cache-restore.browser.cjs`; the same test passed on the complete Chromium rerun and also passed on Chrome and Edge. Treat that first failure as not reproduced, and keep the test under observation. The cache-aware refresh test passed on all three browsers. The Chromium synthetic scale run reported 10,000 cached rows restored in 287ms and 50,000 rows in 1,138ms, with 241 virtual rows in both cases; the 50,000-message cold synthetic scan first displayed in 95ms and completed in 62,973ms. This is synthetic performance evidence, not a live service measurement.
- Same-head Channel `43558987275`, Media `43558987179`, and Video `43558987218` runs also passed. The refresh scenario has a dedicated named CI step and checks viewport-height shrink/restore, gallery anchor, partial cursor continuation, and cache preservation after a simulated 503. Prior runs exposed stale assertions and synthetic fixture mistakes; the current head corrects those test assumptions and fixture namespace/setup issues.
- **Phase 1 checkpoint:** items 01 and 08 are complete for the tested synthetic/browser scenarios. Current code checkpoint before this handoff update: `4be69e3d89f97407ab6289bc1a46b18e6bc73586`. Commit this handoff update as the Phase 1 documentation checkpoint; then begin Phase 2.
- Keep PR #123 draft. Do not merge `main`, deploy, delete branches, or clear real user data without explicit user approval.
- Keep PR #123 draft. Do not merge `main`, deploy, delete branches, or clear real user data without explicit user approval.

## Historical PR #121 project and Git state

- Production repository: <https://github.com/fffdsaw/fromm-viewer>
- Production site: <https://fffdsaw.github.io/fromm-viewer/>
- Experimental repository: <https://github.com/fffdsaw/fromm-viewer-preview> (do not change for production work; its separate PR #121 test branch is updated only for the user's authorized account testing).
- Working branch: `codex/timestamp-pagination`.
- PR: #121 — <https://github.com/fffdsaw/fromm-viewer/pull/121>, open against `main`.
- Latest verified `origin/main`: `fe010e5dc263ac45ef44171c90722f185c433af5` (PR #120).
- The current branch merges that main through `d03a306`; the recovered four stabilization commits remain in ancestry: `b3b3c84`, `0e3760f`, `a61fa43`, `5f73e9a`.
- Work commits include `843a418` (progressive recent-first history) and `214f500` (pagination and browser regressions). Read `git log -10 --oneline` for the current HEAD; this document avoids embedding its own commit SHA.
- The branch is pushed to `origin` and PR #121 is open with the requested title. Current code follow-up `5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1` preserves reply navigation after quoted-original jumps; compare local `HEAD` with `git ls-remote origin refs/heads/codex/timestamp-pagination` after each push. The latest handoff commit can be checked with `git log -1`.
- The original untracked `HANDOFF.md` from the backup is intentionally preserved. Do not overwrite or delete it.
- Do not merge this PR or deploy without the user's explicit approval.

## Completed implementation

- Restored the backup repository, retained its four cache-stability commits, and merged current production `main` without conflicts.
- Full and partial IndexedDB cache restoration, interrupted-save recovery, ID-conflict candidate protection, and account scoping are retained from the restored commits.
- The chat exposes the newest 300 messages while earlier history is collected in the background. Complete cache restoration avoids a historical rescan; partial cache restoration remains visibly incomplete.
- Historical pages preserve the exact timestamp boundary and deduplicate overlap by message ID. Sorted batches are merged instead of sorting the full message array after every page.
- Repeated/saturated timestamp boundaries that cannot prove completeness remain incomplete. Search labels partial records; date navigation refuses to report a complete result when the history is incomplete.
- Completion preserves the visible chat window, latest-following behavior, or the reader's current message anchor.
- Existing send, realtime, reply, media, LIVE, Replay, Channel, Glow ME, and Liquid Glass code paths were retained and covered by regressions.

### Main changed files

- `index.html`: partial/recent view, history cursor, background scan, merge, and completion behavior.
- `web-conversation.js`: cache restore, live/push startup with partial history, and sorted message merge.
- `web-conversation-core.js`: incremental-feed guard for saturated same-timestamp watermarks.
- `web-view-state.js`: view anchor and follow-latest preservation.
- `conversation.css`: keep search/date/reply focus shadows visible on artist text cards.
- `test/`: progressive loading, cache, recovery, conflict, pagination, search/accessibility, and synthetic scale regressions.
- `.github/workflows/conversation.yml`: runs the browser checks with Playwright/axe-core; the synthetic 50k scale test runs on Linux Chromium only, while the functional regressions remain in the Chromium, Chrome, and Edge matrix.
- `AGENTS.md` and `CODEX_HANDOFF.md`: project workflow and cross-account continuation instructions.

## Validation and measurements

### Unit tests

- Re-run on this branch after the final code fix: `node --test test/*.test.cjs` — **275 passed, 0 failed** (Node 22.23.5).
- A full browser pass exposed a view-state regression: switching from chat to a media tab reset the saved “follow latest” intent, so completing the history scan restored a reader anchor instead of the newest item. `web-view-state.js` now saves that intent with the per-filter position. The dedicated `chat-loading-latest.browser.cjs` passed at 1440px, 900px PWA, and 390px after the fix.
- Earlier during finalization, a Node VM fixture also lacked `window` after completion began consulting viewport state. The fixture was updated, and the full unit suite passed.

### Browser tests

This verification pass used Node 22.23.5, Playwright 1.62.1, Chromium 151.0.7922.34, and axe-core 4.14.0. The full synthetic Chromium suite passed: `conversation.browser.cjs` (desktop/tablet/mobile), `conversation-state.browser.cjs`, cache restore, cache conflicts, interrupted storage recovery, emoticons, conversation controls, send focus, audio, unread rail, progressive history, 10k/50k scale, my replies, search/calendar accessibility, and rail glyph lens. The state test passed 12 consecutive runs after changing its partial-cache fixture to use a fresh synthetic account key and keeping every server-history request blocked until explicit release; it verifies at least one request is still pending while the six cached rows are visible. The my-replies test and search/calendar accessibility test also passed locally on installed Chrome 157.0.8103.52, with desktop/mobile and desktop/PWA viewports respectively. The full 275-test unit suite passed (0 failures). No live Fromm API or user account was used.

### Synthetic 50,000-message measurements

These are test-fixture Chromium results, not measurements from Fromm's service or a user's account:

| Measure | Result |
|---|---:|
| Select to first recent messages | 41 ms |
| Full historical scan | 37,456 ms |
| History requests during scan | 102 |
| Wait for IndexedDB flush after scan | 15,835 ms |
| Direct synthetic write of 50k cached messages | 22,107 ms |
| Complete 50k cache restoration | 583 ms |
| Historical requests after complete restore | 0 |
| Incremental requests after complete restore | 1 |
| Scroll rAF sample | mean 8.6 ms; worst 16.7 ms |
| Measured JS heap | 17.1 MB |

There is no same-fixture before/after baseline, so do not state an improvement percentage. An earlier handoff's ~37 ms cache restore used a different test condition and is not directly comparable.

### GitHub Actions before the current local fix

On pushed head `dec92eb9706ef07274d0227e7249a57c33c9e077`, run [43242129564](https://github.com/fffdsaw/fromm-viewer/actions/runs/43242129564) failed Conversation/Chromium in the partial-cache re-entry check. The prior fixture cleared `holdHistory` as soon as the first `/messages` request observed it; it did not guarantee that the request held was the re-entry's history request or that all later pages remained blocked. The local fix keeps the gate active for every `/messages` request until explicit release, counts requests held, and asserts a history request is still pending while the six cached rows are visible. This is a test synchronization defect; no production cache change was made.

On that same run, Conversation/Chrome and Conversation/Edge passed through `chat-history-progressive.browser.cjs` but did not finish before the 15-minute job timeout. The old combined step emitted no per-script completion markers for `my-replies`, `search-calendar-panel`, or `rail-glyph-lens`, so the stalled script was not identifiable. Those three final checks are now separate named steps with a three-minute step limit. `my-replies` and `search-calendar-panel` now honor `PLAYWRIGHT_CHANNEL`; both passed locally on Chrome 157. The 50k scale test remains Linux Chromium only.

### GitHub Actions on the prior code commit

All PR checks passed on code commit `0361c0c669f48aa7c113a70e08c7f363f23371f3`; after the handoff-only commit, the same checks also passed on `864879aa50972e38ef3540050cac3415baf2dfa7`:

- Conversation receive/send/persistence, run [43388885791](https://github.com/fffdsaw/fromm-viewer/actions/runs/43388885791): Chromium, Chrome, and Edge passed. Chromium included the synthetic 50k scale/cache restore check.
- Media bulk save regression, run [43388885884](https://github.com/fffdsaw/fromm-viewer/actions/runs/43388885884): unit regression and browser jobs passed.
- Channel videos regression, run [43388885915](https://github.com/fffdsaw/fromm-viewer/actions/runs/43388885915): unit regression and full browser suite passed.
- Video download engine, run [43388885800](https://github.com/fffdsaw/fromm-viewer/actions/runs/43388885800): Chromium, Chrome, and Edge passed.

These checks exercised synthetic/local fixtures only. They do not verify the authenticated Fromm API pagination contract.

### IndexedDB room-metadata write errors

The final metadata transaction in `web-conversation-core.js` calls `transact(db, ['rooms'], 'readwrite', callback)`. Its callback previously accepted only `tx`, but both synchronous `rooms.put()` error handlers called `set.fail(error)`. A browser regression injected a synchronous `QuotaExceededError` and reproduced the defect: the caller received a generic `AbortError` (`Uncaught exception in event handler.`), not the original error object. The callback now accepts `(tx, set)`, allowing `transact` to abort and reject with the original error.

`test/conversation-cache-conflicts.browser.cjs` covers both metadata-write branches: a normal complete snapshot and a conflicted snapshot that must remain incomplete. Both assertions verify that the exact injected error object reaches the caller and that the previously committed message, metadata, and conflict candidate remain intact. The red test reproduced the old failure; it passes with the scope fix.

### Large-history quoted-original navigation

The real-account report described a quoted original that could not be found, followed by an unresponsive tab and calendar controls that stopped responding. A new synthetic 50,000-message regression reproduced the rendering risk: navigating from a recent reply to a midpoint quote caused the old handler to append 25,320 message rows to the DOM before reaching the target. On slower devices this can stall the main thread.

`index.html` now waits for history completion before deciding that an original is absent, reports incomplete history separately, and jumps directly to the target with the existing virtualized message window. When the complete fetched history does not contain the original, the current rendered view is preserved and the app shows the existing not-found warning without expanding the DOM. Opening a quoted original while “내 글에 온 답장” is active now keeps that navigation mode and anchors its current position to the reply that was clicked, so the up/down reply controls remain available at the original and can continue to another reply. `test/reply-anchor-context.browser.cjs` exercises this behavior in 50,000 synthetic messages, verifies at most 600 rendered rows, then checks that an unavailable original still leaves the calendar responsive and both month-navigation arrows continue to work.

The follow-up regression reported that the jump succeeded but the reply arrows disappeared. The quote click now passes its replying message ID into the navigation helper, which retains the reply filter and selects that clicked reply as the current arrow-navigation position. Local validation on Node.js 22.23.5 / Playwright 1.62.1 / Chromium 151.0.7922.34: `node --test test/*.test.cjs` passed all 275 tests; `reply-anchor-context.browser.cjs`, `reply-start-top.browser.cjs`, `my-replies.browser.cjs`, and `search-calendar-panel.browser.cjs` passed on desktop/mobile. The live account payload still determines whether a particular quoted original is actually present in server history.

Latest CI on code commit `5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1`: all PR checks passed. Conversation run [43419093771](https://github.com/fffdsaw/fromm-viewer/actions/runs/43419093771) passed Chrome, Chromium, and Edge; Video download run [43419093662](https://github.com/fffdsaw/fromm-viewer/actions/runs/43419093662) passed Chrome, Chromium, and Edge; Channel run [43419093659](https://github.com/fffdsaw/fromm-viewer/actions/runs/43419093659) passed its 16-minute browser suite; Media bulk save run [43419093801](https://github.com/fffdsaw/fromm-viewer/actions/runs/43419093801) passed unit and browser checks. The isolated preview deployment at [run 43419597212](https://github.com/fffdsaw/fromm-viewer-preview/actions/runs/43419597212) passed storage/migration and PR regressions and deployed the test site. A prior preview attempt timed out on the cache-restore test's 3-second reader-anchor wait; that test passed alone locally and in the successful full retry. No real account/API was exercised.

On PR handoff head `ad05377867ba76f2f3c6aa5ad36ef75f9014e75d`, run [43421678801](https://github.com/fffdsaw/fromm-viewer/actions/runs/43421678801) initially failed only Chromium's existing `conversation-cache-restore.browser.cjs` post-flush reader-anchor assertion at line 91; the same failed Chromium job passed on rerun. Chrome, Edge, Channel, Media, and Video download were green. The modified quote-navigation path does not touch cache flush or reader-anchor code. Record the first attempt and rerun rather than treating the flaky assertion as never having occurred.

Local verification on Node 22.23.5, Playwright 1.62.1, Chromium 151.0.7922.34: `node --test test/*.test.cjs` passed all 275 tests; `conversation-cache-conflicts.browser.cjs`, `conversation-storage-recovery.browser.cjs`, and `conversation-state.browser.cjs` passed. `conversation-cache-restore.browser.cjs` failed its 1px scroll-anchor assertion when launched concurrently with other Chromium tests, then passed when rerun alone. The change does not touch view or scroll code.

GitHub Actions on code commit `85b58e606ce12de3405545739511acdd79240d1f` passed all Conversation (Chromium/Chrome/Edge), Media bulk save, Video download (Chromium/Chrome/Edge), and Channel checks. The first Channel browser attempt failed at the unrelated `video-quality.browser.cjs` circular-spinner animation timing assertion; rerunning the failed job on the same SHA passed the entire Channel browser job (attempt 2, 16m03s). The source change does not touch that test or video UI.

## Known limitations and risks

- The actual Fromm API's `findStartAt`, `findEndAt`, `limit`, and same-millisecond tie contract is unverified. No authenticated live API call was made. Do not infer undocumented server behavior from the saved Fromm Chat HTML.
- If a boundary page is saturated or repeats without a definitive completion signal, history remains incomplete. This protects against silent omissions but can prevent full-history features from completing until the API contract is understood.
- The ~36.6 s 50k synthetic full scan is background work; do not present it as a real-service latency measurement.
- No cache deletion/reset was performed. Tests use synthetic messages; no personal chat content or authentication material should enter commits or logs.

## Historical PR #121 environment and resume steps

CI expects Node.js 22, Playwright 1.62.1, Chromium, and axe-core 4.14.0. This verification used Node 22.23.5 and Chromium 151.0.7922.34. Local shell `node`/`npm` may not be on `PATH`; install the CI versions locally without committing lockfiles or dependencies.

From a new checkout:

```sh
git fetch origin
git switch --track origin/codex/timestamp-pagination
git status --short
git log -10 --oneline
```

If the branch already exists locally, use `git switch codex/timestamp-pagination` and `git pull --ff-only origin codex/timestamp-pagination` after confirming there are no local changes.

Run the unit suite:

```sh
node --test test/*.test.cjs
```

Install browser tools and run the core progressive/cache/accessibility checks:

```sh
npm install --no-save --package-lock=false playwright@1.62.1 axe-core@4.14.0
npx playwright install chromium
node test/conversation.browser.cjs
node test/conversation-state.browser.cjs
node test/conversation-cache-restore.browser.cjs
node test/conversation-cache-conflicts.browser.cjs
node test/conversation-storage-recovery.browser.cjs
node test/chat-history-progressive.browser.cjs
node test/chat-history-scale.browser.cjs
node test/my-replies.browser.cjs
node test/search-calendar-panel.browser.cjs
```

Use `git -c core.whitespace=cr-at-eol diff --check` because `index.html` uses CRLF. The full browser workflow is in `.github/workflows/conversation.yml`; broader Channel/Replay/LIVE checks are in `.github/workflows/channel-videos.yml`.

## Historical PR #121 priority list

1. Confirm the latest handoff commit is pushed and that PR #121 head matches it; review the Actions attached to that exact head.
2. Review every PR check and its logs; resolve failures only when attributable to this change, and keep unrelated existing failures documented.
3. Investigate the timestamp pagination contract from authoritative, non-sensitive sources. Do not make live requests with guessed credentials. Keep ambiguous boundaries incomplete.
4. Review the PR diff for cache migration/data-loss risks and verify the original four commits remain ancestors.
5. Obtain explicit user approval before merging into `main` or deploying.

## Push and PR record

- Code follow-up commit `0361c0c669f48aa7c113a70e08c7f363f23371f3` contains the partial-cache request gate, CI step split, and browser-channel selection. Its required GitHub Actions checks passed, as did handoff-only commit `864879aa50972e38ef3540050cac3415baf2dfa7`. Room-metadata error handling was fixed in code commit `85b58e606ce12de3405545739511acdd79240d1f`; all PR checks passed on that SHA. The initial Channel browser failure was an unrelated timing assertion and passed when rerun.
- PR URL/number: #121 — <https://github.com/fffdsaw/fromm-viewer/pull/121>, open, base `main`.
- PR title: `Stabilize conversation cache and optimize progressive history loading`.
- PR description must cover the original cache commits, progressive loading, timestamp guard, regression results, synthetic performance and limits, unverified live API contract, these two project documents, and production review requirements.
- GitHub Actions on code commit `85b58e606ce12de3405545739511acdd79240d1f`: all PR workflows passed. Conversation run [43393498664](https://github.com/fffdsaw/fromm-viewer/actions/runs/43393498664); Media run [43393498567](https://github.com/fffdsaw/fromm-viewer/actions/runs/43393498567); Video download run [43393498580](https://github.com/fffdsaw/fromm-viewer/actions/runs/43393498580); Channel run [43393498661](https://github.com/fffdsaw/fromm-viewer/actions/runs/43393498661), whose successful browser job is rerun attempt 2. Do not call a local test a GitHub Actions result.

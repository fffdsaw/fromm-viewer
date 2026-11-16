# Fromm Viewer — cross-account handoff

Last reviewed: 2026-11-16 (Asia/Seoul)

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

- [Korean integration report](docs/UIUX_STABILIZATION_20261115.md), desktop/mobile/settings/chat screenshots and paired performance JSON are committed. The glass benchmark compares ON/OFF in short synthetic scenes; it is not an engine-version speedup claim. Added CPU cost, small video frame drops and GPU/heap measurement limits are explicitly reported.
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

- [Korean integration report](docs/UIUX_STABILIZATION_20261115.md), desktop/mobile/settings/chat screenshots and paired performance JSON are committed. The glass benchmark compares ON/OFF in short synthetic scenes; it is not an engine-version speedup claim. Added CPU cost, small video frame drops and GPU/heap measurement limits are explicitly reported.
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

- Added [the consolidated Korean report](docs/UIUX_STABILIZATION_20261115.md), desktop/mobile synthetic screenshots, and raw paired glass-performance JSON. Node 24.19.0 / Playwright 1.62.1 / Chromium 151.0.7922.34.
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

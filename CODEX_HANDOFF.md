# Fromm Viewer — cross-account handoff

Last reviewed: 2026-11-14 (Asia/Seoul)

## Current integrated UI/UX stabilization track — 2026-11-14

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

## Project and Git state

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

## Environment and resume steps

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

## Next account's priority list

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

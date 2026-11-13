# Fromm Viewer — cross-account handoff

Last reviewed: 2026-11-13 (Asia/Seoul)

## Project and Git state

- Production repository: <https://github.com/fffdsaw/fromm-viewer>
- Production site: <https://fffdsaw.github.io/fromm-viewer/>
- Experimental repository: <https://github.com/fffdsaw/fromm-viewer-preview> (out of scope; do not modify).
- Working branch: `codex/timestamp-pagination`.
- PR: #121 — <https://github.com/fffdsaw/fromm-viewer/pull/121>, open against `main`.
- Latest verified `origin/main`: `fe010e5dc263ac45ef44171c90722f185c433af5` (PR #120).
- The current branch merges that main through `d03a306`; the recovered four stabilization commits remain in ancestry: `b3b3c84`, `0e3760f`, `a61fa43`, `5f73e9a`.
- Work commits include `843a418` (progressive recent-first history) and `214f500` (pagination and browser regressions). Read `git log -10 --oneline` for the current HEAD; this document avoids embedding its own commit SHA.
- The branch is pushed to `origin` and PR #121 is open with the requested title. The latest code commit verified by GitHub Actions is `0361c0c669f48aa7c113a70e08c7f363f23371f3`; compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/codex/timestamp-pagination` after each push.
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

### GitHub Actions on the current code commit

All PR checks passed on code commit `0361c0c669f48aa7c113a70e08c7f363f23371f3`:

- Conversation receive/send/persistence, run [43386732919](https://github.com/fffdsaw/fromm-viewer/actions/runs/43386732919): Chromium, Chrome, and Edge passed. Chromium included the synthetic 50k scale/cache restore check.
- Media bulk save regression, run [43386732906](https://github.com/fffdsaw/fromm-viewer/actions/runs/43386732906): unit regression and browser jobs passed.
- Channel videos regression, run [43386733129](https://github.com/fffdsaw/fromm-viewer/actions/runs/43386733129): unit regression and full browser suite passed.
- Video download engine, run [43386732935](https://github.com/fffdsaw/fromm-viewer/actions/runs/43386732935): Chromium, Chrome, and Edge passed.

These checks exercised synthetic/local fixtures only. They do not verify the authenticated Fromm API pagination contract.

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

- Code follow-up commit `0361c0c669f48aa7c113a70e08c7f363f23371f3` contains the partial-cache request gate, CI step split, and browser-channel selection. Its required GitHub Actions checks all passed (run links above). A later documentation-only commit may update this handoff; the code tested by these runs remains the same.
- PR URL/number: #121 — <https://github.com/fffdsaw/fromm-viewer/pull/121>, open, base `main`.
- PR title: `Stabilize conversation cache and optimize progressive history loading`.
- PR description must cover the original cache commits, progressive loading, timestamp guard, regression results, synthetic performance and limits, unverified live API contract, these two project documents, and production review requirements.
- GitHub Actions on code commit `0361c0c669f48aa7c113a70e08c7f363f23371f3`: all Conversation (Chromium/Chrome/Edge), Channel, Media bulk-save, and Video download jobs passed. See the run links above. Do not call a local test a GitHub Actions result.

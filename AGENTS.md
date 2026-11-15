# Fromm Viewer development instructions

## Repository and data

- The production repository is `https://github.com/fffdsaw/fromm-viewer`; the production site is `https://fffdsaw.github.io/fromm-viewer/`.
- `https://github.com/fffdsaw/fromm-viewer-preview` is an experiment repository. Do not modify or publish to it for production work.
- Continue from the existing task branch and preserve its history and worktree changes. Do not start over from `main` or replace the recovered cache-stabilization commits.
- Use synthetic messages and fixtures in tests. Never commit or print actual chat messages, account identifiers, tokens, cookies, passwords, or API response bodies.
- Never clear or recreate a user's IndexedDB cache as a troubleshooting step. Preserve conflicting message candidates and incomplete-history state.

## Work and Git workflow

For each Fromm Viewer code-change request:

1. Inspect `git status`, the current branch, recent commits, remote refs, and any existing PR before editing. Fetch and compare remote changes; do not overwrite unexpected work.
2. Make the smallest change to the existing implementation that satisfies the request. Keep the Glow ME interface and unrelated features intact.
3. Run the relevant unit and browser tests, inspect the complete diff, and record actual results and limitations in `CODEX_HANDOFF.md`.
4. Stage only task-related files, create a descriptive local commit, and push the current feature branch to `origin`.
5. If that branch already has an open PR, update it. Otherwise create a PR to `main`, then verify the remote branch head and PR checks. A local commit without a successful push is not a completed backup.

Exceptions: do not create empty commits for questions or analysis-only work; do not claim incomplete or failed tests passed; keep a safe local checkpoint and record failures when work cannot be completed.

## Protected operations

- Never work directly on or push to `main`.
- Never merge a PR into `main` or deploy the production site without the user's explicit approval for that action.
- Never force-push, rewrite existing commits, use destructive reset/clean commands, or remove another contributor's changes.
- Never commit backup ZIPs, credentials, personal chat content, or unrelated generated artifacts.
- Do not delete tests or weaken assertions merely to make a run pass.

## Conversation/cache correctness

- A timestamp-only history cursor can be ambiguous when many messages share a millisecond. Do not mark history complete when the server response cannot prove the boundary is complete.
- Keep ID-conflict candidates separate from canonical messages and out of normal search, reply, and media results.
- Preserve completed IndexedDB metadata when a later save is interrupted. Treat partial memory/disk history as partial until completion is verified.
- Keep history fetching in the background after the recent messages are visible. Preserve the current reader position and avoid rescanning a complete cache.
- Do not assume Fromm Chat's request limits or cursor behavior are guaranteed by the Fromm Viewer API.

## Tests and handoff

- CI uses Node.js 22, Playwright 1.62.1, Chromium, and axe-core 4.14.0. Local runtimes may differ; report the actual runtime and browser used.
- Run `node --test test/*.test.cjs` for the unit suite. Run the relevant browser suites from `.github/workflows/conversation.yml` and `.github/workflows/channel-videos.yml`; the 50,000-message scale test is synthetic and takes longer.
- Preserve the backup's `HANDOFF.md`. Maintain `CODEX_HANDOFF.md` as the current cross-account status, including branch/PR, commits, tests, measurements, known gaps, and exact resume commands. Do not record credentials or user data.
- For whitespace checks on the CRLF `index.html`, use `git -c core.whitespace=cr-at-eol diff --check`.

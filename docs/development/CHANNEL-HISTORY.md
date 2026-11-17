# Channel navigation verification

PR #29 added a player `pushState`, but did not record the Channel list entry.
It also treated any persisted `frommChannel` state as proof that Back would reach
a list. Both Replay and Channel pushed synchronously before detail requests;
moving the push before the request alone cannot explain or fix this report.
Replay's rendering and playback functions are unchanged by this fix.

Reproduced defects in PR #29's state model:

- Opening a new player after a reload can inherit a persisted player as its
  predecessor. Back then opens that player rather than the list.
- Opening another video during playback stacks players, so one Back is not a
  return to the list.
- The in-page button calls Back on an orphan/legacy player marker, even when
  its predecessor is outside Viewer.
- Forward is ignored if the current live-center tab is Replay or LIVE.
- An asynchronous filter restoration needs a navigation generation check so
  a late result cannot reopen a video after another Back or a new play action.

The fix records the actual filter/scroll position in an explicit list entry
before pushing a player in the same user gesture. Subsequent player opens
replace that player. Only a list relationship created in the current document
allows the in-page button to call Back; legacy/restored states use an in-page
list fallback. Popstate restores Channel and checks the navigation generation.
Leaving Channel clears its marker on the current entry so a subsequent Replay
player's Back still reaches the Replay list.

## What the automated checks cover

- `test/channel-history.test.cjs`: explicit list predecessor, stale state,
  consecutive videos, re-entry, orphan button fallback, pending detail and
  filter restoration races. Four cases fail against PR #29.
- `test/channel-videos.browser.cjs`: production UI with synthetic API/media,
  Back/Forward, tab/filter restoration, reload/re-entry, consecutive videos,
  error cleanup and existing Channel/Replay/LIVE behavior.
- The same browser fixture runs headful under Xvfb with X11 Alt+Left/Right.
  These are Chromium browser navigation accelerators, exercising browser
  history traversal instead of only Playwright's CDP `page.goBack()` path.
- Existing local MP4 decode/layout, Replay, selection, download, LIVE/PiP,
  chat and Native LIVE contract suites remain enabled in CI.
- After main changes, `Verify GitHub Pages` waits for a successful Pages run
  for that SHA and requires the public HTML SHA-256 to exactly match the commit.

## Limits and Android device checklist

Mobile viewport/touch emulation runs in desktop Chromium. Xvfb accelerators
are desktop browser UI tests. Neither is an Android OS Back test. This workspace
has no connected Android device or real Fromm login, so authenticated production
playback, Android's navigation button/gesture, Chrome toolbar Back and fullscreen
Back behavior require device verification. Chrome can consume the first Back to
exit fullscreen; check the following Back returns to the list.

On Android Chrome, open the deployed URL (refresh to receive the new HTML), then:

1. Enter Channel, select an artist, scroll, open a video and use Android Back.
   Confirm the same artist/list position and stopped audio.
2. Use Chrome Forward, then the in-page `← Channel` button. Repeat several times.
3. Reopen another video; verify Back returns to the list and the old Forward
   branch is discarded. Repeat after reloading a player page.
4. Test rapid Back while loading, failed detail requests, landscape/fullscreen,
   and switching Replay/LIVE before Forward.
5. Play Replay and LIVE, and save individual/selected media with the real account.

No exact cause of the reported physical-device exit to Chrome home can be
claimed without that device trace. Chrome's history-skipping intervention and
stale cached HTML are additional possibilities; a passing deployment alone does
not rule them out. The UI-accelerator tests and public-byte deployment check
cover those boundaries more directly than PR #29's emulation-only tests.

# Media bulk save: first-click destination and bounded streaming

Baseline: main `9057c02393610c67a2da86ff4df1321997910164`. Branch: `codex/media-bulk-save`.
Open PRs inspected: #10 (Native diagnostics), #11 (Electron prototype), #20 (LIVE heading/PiP, head `f8450d5`). This work starts from main and does not include or modify those PRs. Leave this PR unmerged and undeployed per the current request.

## Cause and behavior

`saveSelectedToFolder` previously awaited full message history before calling `showDirectoryPicker`. Long preparation exhausts transient user activation; the picker throws and the old handler silently returns. A second click can succeed because history is already loaded. A trusted Chrome click with a synthetic 5.5-second history lookup reproduced a real native API `SecurityError`, inactive activation, zero media requests and preserved selection.

The folder picker now starts with `{mode:"readwrite"}` in the original click stack, before any await or history lookup. A selected-ID snapshot survives selection changes while the picker/preparation runs. Cancellation preserves selection and previous retry data, starts no history/media request, and unlocks controls. Other picker/permission failures are shown with sanitized details. A room/account/generation change stops further work and prevents stale results.

Preparation still loads full history for the existing filename rules. It waits for an ongoing loader and stops if history remains incomplete. The entire backup root is inspected before fetching media; an unreadable/deep tree stops saving rather than returning a partial index. Empty entries left by an aborted first write are eligible for download again. Completed nonempty backups keep existing type-aware current/v59/v60 duplicate detection.

## Bottlenecks and speed changes

Ordinary chat photos/videos/audio resolve their original URL directly from message data. This path has no per-item media-detail or signed-URL API to cache. Existing room/history caching and message-ID dedup remain; no persistent URL or full-file Blob cache was added. Channel/Replay use separate detail/HLS download paths and are unchanged.

The previous folder loop ran one file at a time and waited another 80 ms after each file. Folder saves and failed-only retries now use at most three workers. They retain streamed writes with per-file backpressure and completed-item aggregate progress. HTTP 429 stops new scheduling; already-started work is bounded and unscheduled items remain in the failed-only retry list. Retry requests write permission in its click stack. No automatic aggressive retries or entitlement changes were added.

The extension-compatible XHR fallback buffers a whole response. Its single slot is held until disk commit/abort, so parallel folder workers cannot buffer several XHR files simultaneously. This still buffers one complete file; it does not make XHR streaming. Reader cancellation/release and writable abort handle fetch/write/session failures. Empty bodies cannot be reported as successful saves.

The browser-download/mobile path remains sequential with its original inter-download delay and Blob behavior. It now locks before preparation, freezes selection/names, and prevents old-room media from being emitted after a room/account change. Existing-file resume remains skip-completed-files and retry-whole-failed-item; byte-range resume was not present and was not introduced.

## Same-condition benchmark

Windows, fresh installed browser profiles, actual OPFS files, synthetic throttled localhost HTTP, no Fromm account. Each paired trial uses an empty destination and 12 mixed files: 4 photos at 256 KiB, 4 videos at 1 MiB and 4 audio files at 256 KiB (6 MiB total). Identical 200 ms history delay, 45 ms response delay and 12 ms/64 KiB chunk timing; three baseline/updated pairs per browser. Both variants wrote identical filenames, sizes and byte counts with 12 requests and one history lookup.

| Browser | Baseline trials (ms) | Updated trials (ms) | Median | Change |
| --- | --- | --- | --- | --- |
| Chrome 155.0.8059.39 | 3448, 3454, 3469 | 1088, 1091, 1098 | 3454 → 1091 ms | 3.17x throughput; 68.4% less time |
| Edge 155.0.4283.45 | 3453, 3457, 3486 | 1090, 1080, 1093 | 3457 → 1090 ms | 3.17x throughput; 68.5% less time |

Response-header wait summed across files remained about 0.8–0.85 seconds; streamed file-write sums remained about 0.86–0.92 seconds. Those sums overlap in the updated pipeline and are not additive wall time. Empty-root scan time rounded to 0 ms; this benchmark does not measure a large existing archive scan. Observed active streams/writers rose from one to three. Application-held pending chunks rose from 64 KiB to 192 KiB; sampled JS heap stayed around 10 MB. These measurements exclude browser/network/OS buffers and are not whole-process memory bounds.

## Validation and limits

- 116 Node tests passed: new media regressions plus existing selection, Channel/Replay and Native 0.4.0 contracts. Cases include photos/videos/audio and mixed selection, picker cancel/denial, history failure/loading, legacy/nonempty duplicates, aborted empty entries, failed-only retry, 429, bounded concurrency, buffered XHR serialization, empty bodies, 256 MiB generated streaming, backpressure, reader/writable cleanup, and room/session changes in folder/mobile flows.
- All four existing browser fixtures passed locally using installed Chrome/Edge: Channel features, 12 viewport local-video playback/layout, direct selection/mobile behavior and selection gestures.
- New Chrome/Edge browser fixtures use trusted clicks, mock directory picker outcomes, and real OPFS writes. They verify picker-before-history with activation active even when the subsequent lookup exceeds five seconds, cancellation/permission outcomes, mixed names/bytes, completed duplicate skip, partial failures, and 72 MiB streamed saves.
- Native LIVE/helper/extension files are untouched; existing production login/request, LIVE, Replay, Channel and Native frame/audio/ACK contracts pass. These are regression evidence, not real broadcast evidence.
- Real Fromm service downloads, actual signed URL expiry/rate-limit behavior, real broadcast playback and user-selected external-directory success are **UNCONFIRMED**. The new actual native picker screen/cancellation test is also **UNCONFIRMED**: Computer Use stopped because it could not determine the browser URL with enough confidence to enforce policy. No permission prompt was automated. Mock activation plus OPFS success must not be described as a completed native external-folder UX test.

Reproduce dependency-free checks with `node --test test/*.test.cjs native-live/test/*.test.cjs`. With Playwright installed, run `node test/media-bulk-save.browser.cjs`; set `PLAYWRIGHT_CHANNEL=chrome` or `msedge` on Windows. `--benchmark` requires `MEDIA_BASELINE_HTML` pointing to the baseline file. Native picker verification is an interactive optional mode (`--native-picker`); cancel it manually. No authentication values or real media URLs should be printed or recorded.

# Native LIVE receive and pipeline diagnostics (0.5.0)

## Integration and compatibility

PR #10 (`codex/live-receive-diagnostics`, last commit `2da8d71`) was based on the pre-0.4.0 visible/2D benchmark player. Main subsequently introduced hidden SDK rendering, audio playout/lifecycle verification and configurable 360×640/720×1280 synthetic fixtures. The conflicts were in the Windows workflow, frame benchmark, player preload and browser cache URL.

The two diagnostic implementation commits were reused on main `5f47f97`. Conflict resolution retains the **0.4.0 hidden player, Agora renderer input, audio, teardown/recreation and 30fps/ACK paths**. The current chat/media/vote/Replay/Channel application is preserved. The old PR #10 branch is not rebased: PR #11 depends on it and remains a separate unmerged prototype. Its head and base are preserved.

The optional diagnostic command extends Native protocol version 3 without changing join/authentication/ACK inputs. Native 0.4.0 plus extension 1.0.7/1.0.8 remains playback-compatible. Collection requires **Native 0.5.0 + extension 1.0.9**; capability negotiation prevents sending the new command to an older host. The extension ID/key remains the same.

## Operation and privacy

Open **LIVE 진단** under the Native LIVE video to enable collection. It starts closed. Closing it disables Native measurement callbacks/timer and web timing aggregation. There is no additional encoder, unbounded frame queue or per-frame diagnostic IPC: samples are bounded interval sum/count/max aggregates, emitted every five seconds. The display refreshes at most once per second while enabled. Existing frame/ACK transport continues independently.

**진단 JSON 복사** copies only allowlisted numeric/boolean measurements and constant descriptions. Console: `FrommLiveMetrics()`. Missing fields, no reception, stopped sessions and samples older than 6.5 seconds are unavailable; audio/video/pipeline freshness is independent. Collapse, stop, disconnect and reconnect clear samples. No original sender resolution is inferred.

No raw SDK callback, uid, channel/room identity, Device ID, account, credentials, tokens, encryption key/salt, RTC authorization or personal messages are exported. SDK console output/file logging remains disabled. Error paths use fixed stage/code values. The UI copy payload does not include the video frame itself.

## Meaning and source

| Measurement | Source / limits |
| --- | --- |
| Received resolution | `RemoteVideoStats.width/height`, pixels of the **received** stream. Original broadcaster resolution **UNAVAILABLE**. |
| Decoder / Native renderer FPS | `decoderOutputFrameRate` / `rendererOutputFrameRate`; SDK output counters, distinct from capture and web updates. |
| Video bitrate | `receivedBitrate`, **Kbps**, not bytes/s. |
| Loss | SDK `frameLossRate` and `packetLossRate`, %. SDK describes the latter after anti-loss techniques. |
| High / Low | `rxStreamType`, enum 0 / 1; absent values are unavailable. |
| Capture + JPEG | FramePump capture start through synchronous canvas JPEG completion; interval average/max ms. Canvas copy and encoding are combined, not separately measured. |
| Native IPC | Player IPC send timestamp → Native main receipt; host clock estimate in ms. |
| Frame delivery | Native main receipt → web page message receipt, including serialization/relay/extension. Cross-process clock estimate; **not** network or camera-to-screen latency. Negative/outlier intervals are discarded. |
| Image load/decode | Page receipt → image onload + completed `decode()`; explicit `decode()` wait reported separately, not the entire decoder CPU cost. |
| Repaint wait | Last decoded image → coalesced `requestAnimationFrame`. Actual compositor/monitor presentation time **UNAVAILABLE**. |
| Web display FPS | Decoded-image rAF update frequency over five seconds, a page update proxy. Several images decoded before one repaint count once. Not original broadcast FPS. |
| ACK RTT | Native capture/send completion → matching returned ACK; includes IPC/extension/image decoding, excludes capture time and later rAF wait. Late ACKs cannot release newer frames. |
| Audio receiving | SDK `onRemoteAudioStateChanged`, when observed during collection. Audio bitrate/stats provide separate evidence; no claim of physical speaker audibility. |
| Audio delays | `RemoteAudioStats.networkTransportDelay`, `jitterBufferDelay`, `e2eDelay`, ms. Jitter-buffer delay is not a network-jitter measurement and SDK documents audience-mode limitations. |
| Video E2E | `RemoteVideoStats.e2eDelay`, SDK Native capture-to-render estimate, excludes the later JPEG/web path. |
| Native AV sync | `avSyncTimeMs`, ms: positive means audio leads video, negative means audio lags video. Does **not** measure the eventual web-image/PC-audio offset. |

Synthetic pipeline samples carry `synthetic: true` and are never labeled as authenticated LIVE measurements. Synthetic tests do not fabricate RTC receive stats.

## Validation

- Node tests cover actual 4.6.2 declarations (mandatory when installed on Windows), field units, redaction, bounded aggregates, matching/stale ACKs, timeout, shutdown/recreation, default-off/legacy compatibility, independent expiry, disconnect and opt-in.
- Chromium desktop/mobile tests run the production page/adapter with synthetic bridge data, real 720×1280 JPEG decode/ACK, collapsed controls, clipboard JSON, secret rejection and reconnect/stop. Existing LIVE comments/PiP, Replay, Channel, chat/search/votes, background metadata, save filename/duplicate and selection tests remain enabled.
- Windows Actions runs the Native self-test and relay handshake; a 360×640 SDK renderer/audio/30fps frame benchmark **with diagnostics off and on using the same gates**; and a full **720×1280 delivery-only** run. The latter checks real decoded dimensions/changing frames/lifecycle on a software VM, with `throughputValidated:false`; it does not relax or replace the existing 30fps throughput gates. All reports label synthetic input and unverified physical audio.
- Actual Fromm broadcast resolution/FPS/loss/latency/AV measurements, physical hardware audio/AV sync and real-server encrypted reception remain **unverified**. No account data or live credentials are used in automated validation.

## Deployment

GitHub Pages updates the web code only. The Windows workflow builds a new `native-live-0.5.0` Release ZIP from the merged commit after Windows tests; it never replaces the 0.4.0 release/tag. The standalone extension ZIP is updated to 1.0.9.

To update the PC: close LIVE/browser sessions, download the **Release ZIP** (not GitHub source ZIP), extract to a fixed folder, run `native-live/Install-Web-LIVE.cmd`, replace/reload the bundled `chrome_extension` (1.0.9), then Ctrl+F5 Viewer. Pages deployment does not update installed binaries. Reverting to the preserved 0.4.0 package keeps playback but disables the new diagnostic capability.

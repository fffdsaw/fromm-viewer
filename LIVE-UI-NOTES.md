# LIVE header and video PiP

Base: main `9057c02393610c67a2da86ff4df1321997910164`.
Branch: `codex/live-header-video-pip`. On 2026-10-16 the user explicitly approved merging PR #20 and deploying it. The branch now incorporates main `43e73695ac230503728febc1f7acd86418734565`, including the separate media bulk-save fixes.

## Behavior

- Desktop: LIVE badge, title and artist/start time share one compact row. Long text uses ellipsis with the full original text retained in the DOM and title tooltip.
- Narrow screens: title and metadata can occupy two compact lines without colliding with the badge or PiP button.
- Native JPEG LIVE: `web-live-pip.js` uses Document PiP to display a separate image. It observes the original JPEG source without moving the player or changing its load/decode/ACK handlers. The PiP document contains only an image, with no title, artist labels, comments or input.
- Web video LIVE: uses the browser's video PiP API when the actual decoded video supports it.
- Unsupported browsers or a stream that has not arrived keep PiP disabled. Closing PiP keeps the original player; leaving LIVE, stopping playback or replacing the source closes PiP. A delayed PiP request is discarded after a room, connection or screen change.
- The helper 0.4.0, extension, Native adapter, audio and 30fps background configuration remain byte-for-byte unchanged. Mirroring adds a JPEG decode in the PiP window; actual broadcast performance still needs a live-account check.

Document PiP follows [Chrome's official API documentation](https://developer.chrome.com/docs/web-platform/document-picture-in-picture): secure top-level context, user activation and window pagehide cleanup.

## Official LIVE comments investigation

The supplied official screenshot requires comments over the bottom of the normal LIVE video and an input at its bottom. PiP must continue to contain only video.

The locally retained official Android APK 1.50.2 / 15002 was checked against its decompiled and bytecode sources. SHA256: `C0AC34D98CD017149CB02D420A01ED307893C819401F49C38A13A46544D8AEA5`. This identifies the analyzed APK; it does not establish the latest app release or current server support.

- A separate `https://live-chat-api.frommyarti.com` service and chat-token bearer interceptor exist in `p225w8/a.java` and `LiveChatHeaderInterceptor.java`.
- `ChannelApiService.joinAgoraLiveChat` declares the ordinary-room `/live/agora/rooms/{liveRoomId}/live-chat/join` POST. `/enter` separately returns `chatProvider`, `liveChat` and `liveChatError`.
- `LiveChatApiService` declares cursor-based `GET /live-chat/{liveChatRoomId}/messages` and ordinary-viewer `POST /live-chat/messages/normal`. The normal body contains `liveChatRoomId`, `content` and `chatToken`; the official client parses a message ID from the response body using `XmlParser`.
- The receive bytecode confirms polling with returned messages, deleted messages and cursor. Room/user models include frozen, mute, ban and message policies.
- Current Viewer account auth, trusted API origins, extension CORS rules and Native transport allowlists do not establish this separate service's browser support. Reusing the existing account-token request helper for chat would use the wrong authentication contract.

No chat endpoint was guessed, no real comment was sent, and no fake messages, successful send state or active input was added. Actual comments are deferred to a separate PR after a normal authenticated account establishes the current provider, separate chat token, room permissions, response format, cursor/deletion behavior and browser transport. Real sending also needs explicit user authorization for a test message.

## Validation and limits

The regression suite includes original login/request, Replay/download, Channel, selection, Native protocol and lifecycle checks. The new tests exercise compact headings, long text, narrow screens, video-only Document PiP, source preservation, decoded JPEG ACKs and stale window requests.

Local Node checks: 134 passed after integrating the latest main and media bulk-save fixes (the initial UI-only check had 92). All four existing browser fixtures passed, including local MP4 decoding at 12 viewport sizes. Forty tracked Native helper, extension and adapter files match the original main Git blobs and SHA256 hashes. At 1440x900 in the same installed Chrome test, header height fell from 74.618px to 50.889px and stage height increased from 604.049px to 627.778px. Installed Chrome and Edge opened actual Document PiP windows using synthetic JPEGs; only an image was present and the original source/ACK route remained active.

Browser fixtures intercept network requests and use synthetic 720x1280 JPEG frames with the actual unchanged Native web adapter. They do not authenticate or connect to a real Fromm RTC broadcast and do not play Native audio.

No authenticated Viewer tab was exposed through the available browser connection. On 2026-10-16 the user ran the deployed chat probe in their normal account and supplied successful room/message GET results and three received message objects. Chat read transport and nonempty receipt are now confirmed for that session; see LIVE-CHAT-CHECK.md. Real Fromm broadcast video/audio, live PiP performance, the new overlay's real-account presentation and sending remain **UNCONFIRMED**.

## Resume

The working copy and root `work/RESUME.md` preserve the implementation, checks, PR and CI state. After final checks and CI, merge PR #20 and verify the Pages deployment and public header/PiP assets. Remaining live-account work is the real broadcast/PiP check and the separately scoped comments verification above.

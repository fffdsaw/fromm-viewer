# Native LIVE 수신 계측

기준 main: `d4d9c2f` (PR #1, #4, #5, #6–#9 확인). 기존 30fps FramePump, decode 후 ACK, repaint coalescing, BFCache 복구를 유지한다. 인증·구독 확인과 `/enter`, 키 전달 코드는 변경하지 않았다.

## 사용하는 방법

업데이트된 Windows 도구와 웹을 함께 사용한다. LIVE 영상 아래의 작은 **LIVE 진단**을 펼치거나 기존 고급 옵션의 호환성 진단을 복사한다. `FrommLiveMetrics()`도 동일한 안전한 스냅샷을 반환한다. 기본 화면은 진단을 접어 둔다. 연결 종료, 수신자 이탈, 6.5초 이상 오래된 RTC 통계는 `UNAVAILABLE`이다.

## 실제 SDK 통계

Agora Electron SDK **4.6.2**의 `onRemoteVideoStats(connection, stats)` / `onRemoteAudioStats(connection, stats)`에서 영상 캡처 대상인 첫 번째 remote tile의 숫자 항목만 가져온다. SDK 콜백 원본, uid, connection, channel, account, token, key, salt는 진단으로 전달하지 않는다. 통계는 SDK의 약 2초 주기에 따라 갱신된다.

| 진단 필드 | SDK 필드 / 의미 |
| --- | --- |
| receivedWidth / receivedHeight | width / height, 수신 video stream 픽셀 |
| decoderFps | decoderOutputFrameRate, remote decoder 출력 fps |
| rendererFps | rendererOutputFrameRate, Native remote renderer 출력 fps |
| receivedBitrateKbps | receivedBitrate, Kbps (Mbps = Kbps / 1000) |
| frameLossPercent | frameLossRate, SDK가 정의한 복구 전 packet loss % |
| packetLossPercent | packetLossRate, anti-packet-loss 적용 후 loss % |
| rxStreamType | high/low 수신 stream enum |
| videoE2eDelayMs | e2eDelay, Native 수신·render까지 SDK 추정 end-to-end ms |
| nativeAvSyncMs | avSyncTimeMs, Native에서 audio가 video보다 앞서는 ms, 음수면 뒤짐 |
| videoFrozenMs / videoFrozenPercent | totalFrozenTime / frozenRate |
| audioNetworkDelayMs | networkTransportDelay, audio 송신→수신 network delay |
| audioJitterBufferMs | jitterBufferDelay, audio jitter buffer까지 지연 (network jitter와 다름; SDK audience 조건에서 무효일 수 있음) |
| audioLossPercent / audioBitrateKbps / audioE2eDelayMs | audioLossRate / receivedBitrate / e2eDelay |

이 API는 broadcaster 원본 source width/height나 송출 encoder 설정을 제공하지 않는다. `Source UNAVAILABLE`을 유지하며 **Received 720×1280**이 보고되어도 source 720p 고정이라고 단정하지 않는다. SDK에서 누락된 값은 0으로 만들지 않고 생략한다. Native render fps는 JPEG/web fps와 별개다.

## 구간별 성능

5초 구간별 평균·최대·sample 수를 기록하고 매 구간 초기화한다. 프레임이나 secret 원문을 진단 버퍼에 보관하지 않는다.

| 항목 | 범위 / 제한 |
| --- | --- |
| captureEncode | canvas 조회 + 기존 동기 `toDataURL(JPEG, 0.65)` + async 함수 반환. Canvas readback과 JPEG encode는 API 내부 합산이며 각각은 UNAVAILABLE |
| nativeIpc | player IPC send 직전 → Electron main 수신, ms |
| transport | main 수신 → 웹 message 수신. Main 전달, named pipe, relay, Native Messaging, extension 포함. 개별 구간 분리는 UNAVAILABLE |
| imageLoadDecode | 웹 message 수신 → 이미지 load 및 decode() 완료 |
| imageDecode | onload → decode() resolve. 이미 load 과정에서 decode가 수행될 수 있어 순수 decoder 작업 시간이 아님 |
| repaintWait | 최신 decode 완료 → coalesced requestAnimationFrame callback. 실제 compositor/모니터 표시 완료는 UNAVAILABLE |
| ackRoundTrip | player가 frame 전송 직전에 pending 설정 → player에 matching ACK 도착. IPC/transport/web decode/ACK return 포함; repaint는 기다리지 않음 |
| captureFps | 캡처·전송한 JPEG 개수/구간, 같은 RTC 장면을 반복할 수 있어 LIVE fps가 아님 |
| displayFps | coalesced rAF callback/구간, 웹 표시 scheduling proxy. 실제 RTC receive FPS가 아님 |
| ackWaitTicks / ackTimeouts / captureMisses | ACK에 막힌 tick 수 / 500ms ACK timeout 수 / canvas 없음·크기 초과 등 capture 미반환 수 |

각 프로세스 내부 latency와 ACK RTT는 monotonic clock을 사용한다. 프로세스 간 `nativeIpc`/`transport`는 `performance.timeOrigin + performance.now()`를 비교한 추정값이다. clock 조정/불일치로 음수 또는 60초 초과이면 sample을 버린다. Native A/V sync 통계에는 **추가 JPEG/web 지연이 포함되지 않는다**. 웹 영상과 Native 소리의 실제 동기화는 다음 LIVE에서 별도로 관찰해야 한다.

`native-rtc-video-stats`, `native-pipeline-performance`, `native-web-performance`를 분리한다. Synthetic benchmark 프레임은 `synthetic: true`이며 실제 LIVE 수신 통계를 생성하지 않는다. 첫 rAF는 시간 기준점으로만 사용해 첫 프레임으로 인한 fps 과대계산을 줄였다.

## 현재 확인 결과와 한계

- 웹 inline target: **30fps**, 기존 구조 유지.
- 이전 PR #5 Windows synthetic benchmark: **30.2fps**, 12초 355프레임, capture 평균 약 7ms, ACK 평균 약 4ms. 과거 결과이며 실제 RTC·Chrome Native Messaging·A/V sync 검증은 아님.
- 이번 실제 Fromm LIVE FPS: **UNCONFIRMED**. 실제 LIVE 세션 없음.
- 이번 실제 Fromm LIVE resolution: **UNCONFIRMED**. 사용자 제공 과거 Android 1280×720 수신 기록과 대부분 720p Replay는 참고 정황이며 이번 관측이 아님.
- 720p 원인: **UNCONFIRMED**. 앱 encoder 고정 / 서버 변환 / adaptive 정책 / 서비스 표준 중 어느 것도 확정하지 않음.
- **C:\fromm-analysis에 접근할 수 없어 broadcaster 송출 코드 분석은 수행하지 못함**. 이 환경은 Linux이며 Windows 드라이브/분석 폴더가 mount되어 있지 않음. APK 1.50.2의 `setVideoEncoderConfiguration`, dimensions/fps/bitrate/orientation, 720p/1080p profile, 서버 transcoding/adaptive 단서를 확인하지 못함.
- 현재 실제 LIVE 병목: **UNCONFIRMED**. 과거 합성 경로의 동기 capture 7ms와 ACK 4ms는 당시 30fps budget 내였으며 hidden `toBlob` 약 1초는 과거 측정이다. 이번 실제 경로의 병목으로 단정하지 않는다.

## 다음 실제 LIVE 체크리스트

정상 로그인·구독과 정상 `/enter`만 사용한다. secret을 공유하지 않고 안전한 숫자 진단을 기록한다.

- Source width/height는 API가 제공하는지 확인; 없으면 UNAVAILABLE. Received width/height를 시작 직후 및 방송 중 비교.
- Decoder fps / Native renderer fps / Web display fps를 같은 구간에 기록.
- Received Kbps, frame loss %, packet loss %, high/low stream 변화 기록.
- Capture+JPEG 합산 평균/최대, Native IPC, 이후 transport 평균/최대 기록. 독립 capture/JPEG 시간은 UNAVAILABLE 유지.
- Image load/decode, decode() resolve, repaint callback wait, ACK RTT 평균/최대와 samples 기록.
- ACK timeout/wait와 capture misses 확인. 창 최소화/탭 숨김/복귀 및 종료 후 stale frame 거부 확인.
- Native avSyncTimeMs와 실제 웹 영상·Native 소리의 입 모양/박수 등 동기 확인. 수치가 없으면 미확인으로 남김.
- 로그인/로그아웃, 채팅, media 저장, Replay 재생 회귀 확인.
- broadcaster 분석 자료가 있는 Windows에서 encoder 설정과 서버 정책 단서를 별도로 조사.

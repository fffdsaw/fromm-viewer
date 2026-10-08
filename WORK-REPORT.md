# 작업 결과 (2026-10-08)

## 기준과 저장소 상태

작업 시작과 종료 시 원격 main은 `d4d9c2f`다. PR #1의 실제 Native 영상·음성 성공 기록, #4의 30fps/ACK FramePump, #5의 decode/repaint 안정화, 이후 #6–#9 설치 안내·BFCache·LIVE UI 정리를 확인했다. 이미 구현된 Native LIVE를 재구현하지 않았다.

- 최소 계측 브랜치: `codex/live-receive-diagnostics`.
- 별도 통합 앱 실험 브랜치: `codex/desktop-single-exe`.
- main 직접 변경/merge/publish 없음. GitHub Pages와 기존 설치 방식 유지.
- Git push, 연결된 GitHub branch 생성, PR 생성 모두 **403 / Resource not accessible by integration**으로 거부됨. 원격 branch/PR은 생성하지 못했고 변경은 로컬 commit과 Git bundle로 제공한다. 권한 거부를 성공으로 보고하지 않는다.

## 필수 결과

| 항목 | 결과 |
| --- | --- |
| 1. 현재 실제 설치 | Release ZIP 다운로드 → 압축 해제 → 확장 1.0.8 수동 로드 → Install-Web-LIVE.cmd host 등록 → Pages 접속·로그인. 다음부터 helper 자동 실행 |
| 2. 간소화 범위 | 배포본은 그대로. 실험 앱은 EXE 다운로드·실행·정상 로그인으로 줄임. 확장, host 등록, CMD, 별도 웹 접속 제거 |
| 3. 최종 권장 배포 | A: Electron 통합 앱. Portable EXE로 Windows 회귀 검증 후 코드 서명/업데이트 체계 추가. 웹 fallback 유지 |
| 4. 웹 inline target FPS | **30fps**, 기존 FramePump·ACK·repaint coalescing 유지 |
| 5. Synthetic benchmark FPS | 이전 PR #5 Windows 경로 **30.2fps**. 이번 Linux Chromium 웹 전용 최종 샘플 **27.8 / 29.9fps**. Windows Native pipeline의 이번 재측정은 수행 못함 |
| 6. 실제 Fromm LIVE FPS | **UNCONFIRMED**. 이번 실제 세션 없음; 과거 영상·음성 성공을 fps 확인으로 바꾸지 않음 |
| 7. 실제 LIVE resolution | 이번 관측 **UNCONFIRMED**. 사용자 제공 과거 Android 1280×720 수신 및 대부분 720p Replay는 참고 근거. 이번 720×1280은 synthetic fixture 크기 |
| 8. 720p 원인 | **UNCONFIRMED**. Broadcaster encoder 고정, 서버 변환, adaptive 정책, 서비스 표준 중 어느 것도 확정 못함 |
| 9. C:\fromm-analysis 접근 | **실패 / 접근 불가**. Linux 실행 환경에 Windows 자료 mount 없음 |
| 10. 확인하지 못한 분석 | Fromm 1.50.2 APK/decompiled/native broadcaster의 setVideoEncoderConfiguration, dimensions/fps/bitrate/orientation, profile와 transcoding/adaptive 정책 |
| 11. 추가 RTC stats | Received width/height, decoder output fps, renderer output fps, Kbps, 복구 전/후 loss %, high/low stream, freeze, video E2E, Native A/V sync, audio network/jitter buffer/E2E/loss/bitrate |
| 12. RTC와 Web FPS 차이 | Native SDK decoder/renderer callback 값과 웹 coalesced rAF displayFps를 별도 event로 기록. CaptureFps도 반복 JPEG 수이며 RTC fps 아님 |
| 13. 병목 | 실제 LIVE **UNCONFIRMED**. 이번 웹 전용 synthetic에서는 draw+JPEG, load/decode, rAF 대기가 관측됨. Native/Chrome IPC 병목은 포함하지 않은 테스트이므로 추정하지 않음 |
| 14. 설치 간소화 산출물 | Windows용 `Fromm Viewer.exe` cross-build, 최신 Viewer와 기존 Native SDK 포함. 실제 Windows 실행/LIVE는 미검증 |
| 15. 다음 LIVE 체크리스트 | 아래와 LIVE-DIAGNOSTICS.md에 모든 필수 값·동기화 체크 포함 |

**C:\fromm-analysis에 접근할 수 없어 broadcaster 송출 코드 분석은 수행하지 못함**

## 계측 구현

SDK 4.6.2의 실제 `onRemoteVideoStats` / `onRemoteAudioStats`를 등록했다. Callback object 전체를 보내지 않고 숫자 allowlist만 전달하며 UID/계정/room/channel/token/key/salt/raw error를 추가하지 않는다. 기존 정상 `/enter`와 entitlement 확인, 원문 encryptionKey 전달은 유지한다.

LIVE 화면에 접힌 **LIVE 진단**을 추가했다. `FrommLiveMetrics()`와 기존 호환성 진단에도 안전한 값이 들어간다. 수신 해상도는 `Received`로 표시하고 SDK가 제공하지 않는 broadcaster `Source`는 `UNAVAILABLE`이다. RTC 통계가 없거나 오래되면 실제 값을 만들어내지 않는다.

5초마다 평균/최대/sample 수: capture+JPEG 합산, Native IPC, 이후 transport, image load+decode, decode() wait, repaint callback wait, matching ACK RTT. ACK blocked tick, timeout, capture miss도 별도 집계한다. Native FPS, capture FPS, Web display FPS는 서로 대체하지 않는다. 실제 compositor 표시 완료와 별도 canvas/JPEG 시간, 개별 Native Messaging 내부 단계는 UNAVAILABLE이다.

## 테스트·빌드

- 시작 main의 **26개 기존 테스트 모두 통과**. 삭제하지 않았다.
- 최종 실험 브랜치: **38개 테스트 모두 통과**. 원문 키 유지, SDK 필드/단위, secret allowlist, latency reset, matching ACK, 기존 hidden repaint/BFCache, desktop scoped IPC, arbitrary RTC 입력/잘못된 sender/iframe 거부, 403 `/enter` 후 join 거부, Storage 메모리 처리, 최신 UI snapshot 보존을 포함한다.
- 최소 계측 브랜치는 dependency 없는 checkout에서 **31 pass / 1 SDK schema check skip**. SDK 설치 환경에서는 schema check까지 실행한다.
- JS/CJS syntax, HTML inline script syntax, workflow YAML 및 `git diff --check` 검증.
- Chromium **151**에서 최신 Viewer 1.08 + desktop adapter 로드: page error **0**, 로그인/Replay/채팅/저장 함수 보존과 transport 로드 확인. 정상 로그인/Replay 재생/채팅 송수신/media 저장을 실제 서비스로 검증한 것은 아님.
- Windows portable EXE build 성공. 패키지 내부 최신 UI/adapter/main/player source 일치 및 공식 Agora addon/DLL 포함을 정적 확인. Windows PE runtime을 빠뜨린 build는 hook에서 거부한다.
- Windows Native addon self-test와 Windows named-pipe frame benchmark: **이번 실행 불가**. Linux 환경이고 Windows runtime 실행 수단 없음. 원격 CI도 쓰기 권한 거부로 실행 못함. Windows self-test/UI smoke/packaged synthetic benchmark용 CI 정의를 추가했다.
- EXE는 현재 **서명/자동 업데이트 미구현**인 실험 빌드. Windows에서 검증 전 일반 배포에 올리지 않는다.

## 이번 웹 전용 synthetic 수치

12초 동안 720×1280 이동 패턴을 같은 Chromium renderer에서 draw→JPEG→postMessage→실제 web adapter image decode→rAF→ACK로 보냈다. Fromm 연결이나 Native RTC, Electron IPC, Windows pipe, Native Messaging, audio는 포함하지 않았다.

| 항목 | 최종 측정 |
| --- | --- |
| 프레임 / ACK / 시간 | 344 / 343 / 12002ms (종료 시 마지막 1개가 비행 중) |
| Web display FPS, 5초 구간 | 27.8 / 29.9 |
| Draw+JPEG 평균 / 최대 | 10.1 / 28.5ms; draw 비용도 포함해 Native capture와 직접 비교 불가 |
| PostMessage transport 평균 / 최대 | 1.0 / 2.9ms, 다음 구간 0.9 / 11.2ms |
| Image load+decode 평균 / 최대 | 14.3 / 44.2ms, 다음 구간 13.3 / 21.4ms |
| Decode() wait 평균 / 최대 | 9.5 / 27.2ms, 다음 구간 8.7 / 17.5ms |
| Repaint callback wait 평균 / 최대 | 11.0 / 38.1ms, 다음 구간 10.6 / 21.9ms |
| RTC receive, Native render/IPC/ACK RTT, A/V sync | UNAVAILABLE |

첫 실행에서는 동시에 EXE 압축이 실행되는 CPU 부하 아래 **21.1 / 22.8fps**였고 draw+JPEG 평균 13.1ms, load+decode 평균 19.9/17.8ms였다. UI smoke의 채팅 함수 이름 점검을 수정하고 EXE 압축 종료 후 재검증한 결과가 위 최종 샘플이다. Windows 경로의 성능 향상 수치로 해석하지 않는다.

## 다음 실제 LIVE

정상 로그인·구독·`/enter`를 사용해 동일한 5초 구간의 다음 값을 기록한다. 예상치를 미리 기입하지 않는다.

- Source width/height: SDK에 없으면 UNAVAILABLE. Received width/height는 숫자로 기록.
- Decoder fps, Native renderer fps, Web display fps, capture fps를 비교.
- Received bitrate Kbps/Mbps, 복구 전/후 packet loss %, high/low stream 변화.
- Capture+JPEG 평균/최대. 독립 canvas capture/JPEG encode는 구분 불가 상태를 명시.
- Native IPC와 이후 transport 평균/최대/sample 수.
- Image load+decode, decode() wait, repaint callback wait 평균/최대.
- ACK RTT 평균/최대와 timeout/blocked ticks/capture misses.
- Native A/V sync ms와 웹 영상·Native audio의 실제 동기 상태. Native sync 수치에 추가 web delay가 포함되지 않음을 명시.
- Native 창 최소화, 웹 탭 숨김/복귀, LIVE 종료·이동·로그아웃 후 stale frame/통계 제거.
- Windows EXE의 로그인, 채팅, 미디어 재생/저장, Replay 회귀 검증.

구간 정의는 [LIVE-DIAGNOSTICS.md](LIVE-DIAGNOSTICS.md), 설치 A/B 비교·전송 후보·빌드 방법은 [DESKTOP-PROTOTYPE.md](DESKTOP-PROTOTYPE.md)를 참고한다.

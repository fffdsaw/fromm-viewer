# Native LIVE 0.4.0 백그라운드 검증

2026-10-12, Windows x64, Electron 44.6.0 / Agora Electron SDK 4.6.2.
최신 main `149e8f4`에서 별도 브랜치로 작업했다. PR #10(수신 진단)과 #11(draft 데스크톱 Viewer)을 검토했으며, 웹과 Windows 연결 도구 경로에 필요한 변경만 적용했다.

## 변경

- 기본 플레이어: `show:false`, `skipTaskbar:true`, `paintWhenInitiallyHidden:true`, `backgroundThrottling:false`, `offscreen:true`, `setFrameRate(30)`, `startPainting()`. GPU 가속을 유지한다.
- Chromium background timer/renderer/occlusion throttling 해제 스위치를 유지한다.
- Agora 렌더 주기는 기본 15fps에서 30fps로 명시한다. 기존 30fps FramePump, 동기 JPEG 캡처, 이미지 해독 후 ACK, 한 프레임 대기 제한은 유지한다.
- 정상 LIVE 연결과 소리 재개는 창을 표시하지 않는다. `FROMM_NATIVE_DEBUG=1` 또는 `--show-native-player`를 지정한 개발자 실행만 일반 창을 표시한다.
- 종료는 FramePump 중지 → SDK leave/release → renderer `left` → 숨긴 창 파괴 순서다. 무응답 시 1.5초 후 파괴한다. 다음 입장은 새 숨긴 플레이어를 생성한다. Native Messaging 종료 시 진행 중인 입장 요청을 취소하고 SDK 종료 후 프로세스를 닫는다.
- 웹은 인증 전달 전에 `backgroundPlayer` capability를 확인한다. 구 도구는 0.4.0 업데이트 안내를 받는다.
- 현재 웹 `index.html`, Replay/Channel UI, 확장, FramePump 소스는 변경하지 않았다.

## Windows 실제 실행 결과

`node native-live/test/run-background-check.cjs --require-loopback` 최종 실행 성공.

| 검사 | 결과 |
| --- | --- |
| 공식 executable/addon/DLL, SDK 자체 검사 | PASS; AES_256_GCM2, 변경 없는 64바이트 키/32바이트 salt, remote renderer cache |
| 실제 relay → Electron → named pipe hello/leave/EOF | PASS; 도구0.4.0, backgroundPlayer/ACK/30fps capability |
| Native 창 비표시 | PASS; 35초 측정에서 360회 확인, show 이벤트 없음 |
| Native SDK renderer | 실제 WebGLRenderer 28.1fps, 합성 I420 입력 |
| Native requestAnimationFrame | 30.0fps |
| 웹 표시 | 평균30.0fps, 최소5초 집계29.5fps |
| JPEG 전달 / 이미지 해독 ACK | 1,050 / 1,049 (마지막 측정 경계의 1프레임 차이) |
| 변경된 JPEG / 변경된 해독 픽셀 | 917 / 916; 픽셀 변화26.2fps, 잘못된 해독0 |
| 동기 JPEG / ACK 평균 | 7.8ms / 7.1ms |
| backgroundThrottling / audioMuted | false / false |
| Native SDK 음원 진행 | PASS; playing 상태와 위치33,970ms 진행 |
| Windows 실제 출력 장치 loopback | PASS; 697Hz 합성음 39/49개 1초 구간, 48kHz stereo |
| 종료 후 음원 중단 | PASS; 마지막3초 구간에서 합성음 미검출 |
| 종료와 재생성 | PASS; 창 파괴, 전달 프레임 중단, 새 숨긴 창 생성과 재종료 |
| Node 회귀 | 73/73 PASS; LIVE/Replay/Channel 계약, 취소/재입장/IPC/EOF |
| JS syntax / whitespace | PASS |

`show:false`와 기존 anti-throttling 설정만 사용한 첫 측정에서는 웹30.3fps와 SDK28.3fps여도 Native rAF가 **1fps**였다. 실제 Windows 결과를 근거로 offscreen 렌더링을 추가한 뒤 30fps를 확인했다. [Electron offscreen 렌더링](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering)과 [frame rate API](https://www.electronjs.org/docs/latest/api/web-contents#contentssetframeratefps)를 사용한다. offscreen 모드는 GPU bitmap readback 비용이 있으므로 PC 성능에 따라 실제 FPS는 달라질 수 있다.

## 증거 범위와 다시 실행

벤치마크는 SDK의 프레임 입력 경계만 합성 I420로 바꾸며 실제 RendererCache 타이머·renderFrame·WebGL/YUV 변환, Canvas → JPEG → IPC → Windows named pipe → production 웹 이미지 해독/표시 → ACK를 실행한다. Native SDK의 로컬 WAV playout과 Windows WASAPI 재생 장치의 tone 진폭을 검사한다. 합성 음원은 90초로 50초 loopback 검사보다 길어, 파일이 자연 종료해서 음원이 사라지는 경우를 종료 성공으로 오인하지 않는다. 마이크를 열거나 PCM을 저장하지 않는다.

일반 검사: `node native-live/test/run-background-check.cjs`. 실제 출력 장치가 있는 Windows에서는 `--require-loopback`을 추가한다. hosted CI의 검사는 숨김 렌더링과 SDK 음원 진행까지이며, 실제 장치 출력 증거는 위 로컬 실행 결과다.

사용자가 현재 시청 가능한 방송이 없다고 확인했으므로, **업데이트 후 실제 Fromm `/enter`·RTC join·수신 영상·수신 음성·A/V sync는 UNCONFIRMED**이다. 합성 검증을 실제 방송 성공으로 간주하지 않는다. 다음 시청 가능한 방송에서 웹 인라인 영상·음성, 새 창 비표시, LIVE 종료 후 음성과 프로세스 종료, 재입장을 확인해야 한다. 실행할 날짜를 예약하지 않았다.

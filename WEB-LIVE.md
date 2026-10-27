# 웹 LIVE 적용

웹은 Viewer 1.08로 업데이트된다. 로그인·채팅·미디어·Replay는 기존 UI를 유지한다. 62바이트 이하 키는 기존 Agora Web 경로로 재생하고, 64바이트 키 방송은 정상 로그인 계정으로 `/enter`하는 Windows Native 도구를 사용한다. 원본 1.06은 Git 기록과 `native-live/vendor/index.html`에 보존했다.

## 한 번 설치

1. [Windows LIVE 연결 도구 0.5.0](https://github.com/fffdsaw/fromm-viewer/releases/download/native-live-0.5.0/fromm-native-live-windows-x64.zip)를 내려받아 고정된 폴더에 압축을 푼다.
2. `native-live/Install-Web-LIVE.cmd`를 실행한다. 현재 사용자 Chrome/Edge에 Native Messaging host를 등록한다. 관리자 권한은 필요하지 않다.
3. Chrome 확장 관리에서 기존 Fromm 확장프로그램을 끄고, 개발자 모드의 **압축해제된 확장프로그램을 로드**로 함께 받은 `chrome_extension` 폴더를 선택한다. 이 버전은 1.0.9이다. 기존 폴더의 파일을 갱신했다면 확장 관리의 새로고침 버튼을 눌러 다시 로드한다.
4. [Fromm Viewer 1.08](https://fffdsaw.github.io/fromm-viewer/?v=1.08)을 Ctrl+F5로 새로고침한다.

그 다음부터 웹에서 로그인하고 LIVE 방송을 선택한다. PC 도구가 정상 `/enter`로 시청 권한을 확인하고 Native SDK로 수신한다. 웹 LIVE 화면에는 Native에서 출력한 영상 프레임이 표시되고 소리는 PC 도구에서 나온다. **0.4.0부터 Native 플레이어는 백그라운드에서 실행되며 별도 창이 표시되지 않는다.** 웹 LIVE를 떠나거나 웹 탭을 닫으면 SDK와 숨긴 플레이어가 종료된다. 채팅은 기존 폰 앱에서 사용할 수 있다.

웹 영상 전달은 JPEG 30fps를 목표로 한다. 웹이 이전 이미지를 해독한 뒤 ACK를 보내야 다음 이미지를 전송하므로 오래된 영상이 쌓이지 않는다. 응답이 늦으면 프레임을 건너뛰고, 숨겨진 웹의 타이머/화면 갱신 정책과 PC 성능에 따라 실제 fps는 낮아질 수 있다. 방송 원본이 30fps보다 낮으면 새로운 장면을 30개 만들어내는 기능은 아니다. Native Canvas는 offscreen 렌더링·초기 숨김 렌더링·backgroundThrottling 해제로 계속 갱신하고, compositor와 SDK 렌더 주기도 30fps로 설정한다. Windows 도구가 없는 브라우저에는 설치 안내가 표시된다. 모바일의 기존 기능은 유지되지만 64바이트 LIVE의 Native 재생은 Windows PC에서만 지원한다.

## 기존 사용자 업데이트

1. 재생 중인 LIVE를 종료하고 Fromm Viewer 탭을 닫는다.
2. 새 0.5.0 ZIP을 새 고정 폴더에 압축 해제하고 `native-live/Install-Web-LIVE.cmd`를 실행한다. 새 경로가 Chrome/Edge에 등록된다. 소스 ZIP에는 실행 런타임이 없으므로 위 Release ZIP을 사용한다.
3. 기존 확장 폴더를 사용하는 경우 함께 받은 `chrome_extension` 파일로 갱신하고 확장 관리에서 새로고침한다. 새 폴더를 로드한다면 이전 Fromm 확장은 끈다. 확장 버전은 1.0.9이다.
4. Viewer를 열어 Ctrl+F5로 새로고침한다. 새 웹은 입장 정보 전달 전에 백그라운드 실행 지원 여부를 확인하며, 구 도구에는 업데이트 안내를 표시한다.

자동 업데이트는 제공하지 않는다. 등록한 새 폴더를 이동했다면 설치 명령을 다시 실행한다.

## 개발자 진단 창

일반 시청에서는 Native 창을 열지 않는다. 진단이 필요할 때만 `FROMM_NATIVE_DEBUG=1` 환경 변수를 설정한 터미널에서 Chrome/Edge를 시작한다. 이미 실행 중인 브라우저 프로세스는 새 환경을 물려받지 않으므로 먼저 브라우저를 종료한다. 진단 종료 후 환경 변수를 제거하고 브라우저를 다시 시작한다. Electron을 직접 실행하는 개발자는 `--show-native-player`를 지정할 수도 있다. 웹의 소리 재개 버튼이나 일반 `show` 요청만으로는 진단 모드가 켜지지 않는다.

기존 0.3.0의 2D Canvas 합성 측정은 12초 동안 355프레임, 약 30.2fps였다. 0.4.0은 실제 Agora SDK 렌더러에 합성 I420 프레임을 공급해 숨긴 Canvas 갱신, JPEG 변화, IPC → Windows named pipe → 웹 이미지 해독/표시 → ACK, rAF 주기, 종료와 재생성까지 검사한다. 동기 JPEG 캡처와 프레임당 ACK는 유지한다. 이 검사는 Fromm 인증이나 실제 RTC 수신을 검증하지 않는다. 세부 결과와 음성 검증 범위는 [백그라운드 검증 기록](native-live/BACKGROUND-VALIDATION.md)에 기록한다.

## 연결과 인증

웹 → 해당 웹의 top frame content script → 확장 service worker → Chrome 공식 Native Messaging → 로컬 relay → Windows named pipe → 격리된 Electron player preload → Agora Native SDK.

웹과 Native 사이에 공개 HTTP/WebSocket 서버를 열지 않는다. 확장은 `https://fffdsaw.github.io/fromm-viewer/` top frame만 받으며 host는 고정된 확장 ID만 허용한다. 웹이 Native 도구에 보내는 값은 본인의 로그인 token/device ID와 선택한 room/channel이다. Native는 이 세션으로 `/enter`를 요청하고 그 응답의 RTC token/문자열 계정/키/salt만 사용한다. 임의 RTC token이나 키를 제출하는 API는 제공하지 않는다.

secret/token은 메모리 통신만 사용하며 파일·URL·명령줄·로그에 저장하지 않는다. 웹으로 반환하는 것은 제한된 진단 단계와 영상 JPEG 프레임뿐이다. 키를 truncate/hash/decode/변형하지 않는다. salt만 Base64 decode 후 first 32 bytes를 사용한다. 인증·구독 권한은 Fromm 서버가 결정한다.

## 배포와 검증

GitHub Pages는 main의 웹 파일을 사용한다. Windows 패키지는 main 적용 시 GitHub Actions가 공식 Electron/Agora SDK를 설치해 release `native-live-0.5.0`으로 빌드한다. 진단에는 도구 0.5.0과 확장 1.0.9를 함께 사용해야 ACK가 전달된다. 구버전이면 입장 정보 전달 전에 업데이트 안내를 표시한다.

자동 검증은 원본 보존, 키/salt/RTC identity, Native Messaging framing, 웹/Native 라우팅, 모바일 경계, 악성 origin/iframe 거부와 숨긴 창의 종료·재입장·개발자 표시 제어를 포함한다. PR에서도 Windows SDK 자체 검사와 숨김 렌더링 벤치마크를 실행한다. 2026-10-12에는 시청 가능한 실제 방송이 없으므로 업데이트 후 Fromm LIVE의 영상·소리·싱크는 미검증이다.

공식 근거: [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [Agora Electron SDK](https://github.com/AgoraIO-Extensions/Electron-SDK), [EncryptionConfig](https://api-ref.agora.io/en/video-sdk/electron/4.x/API/class_encryptionconfig.html), [Electron 숨김 렌더링과 Page Visibility](https://www.electronjs.org/docs/latest/api/browser-window#page-visibility).

확장은 API/미디어와 LIVE 연결을 함께 제공하는 1.0.9 하나를 사용한다. 페이지가 BFCache에 들어갈 때 content/background의 onDisconnect에서 runtime.lastError를 소비하고 기존 연결을 정리한다. 복귀하면 확장 통신만 다시 연결하며 로그인 정보나 기존 join 요청을 저장하거나 재전송하지 않는다. LIVE는 상단 새로고침해 다시 연결한다. 웹은 기존 1.0.7과 수정 버전 1.0.8 모두 같은 30fps 프로토콜로 허용한다.

## LIVE 진단 (0.5.0)

웹 LIVE의 **LIVE 진단**을 펼치면 수집을 켜고 접으면 끕니다. **진단 JSON 복사**로 출처·단위·평균/최대/표본 수를 복사할 수 있습니다. 미수신·중단·6.5초 이상 오래된 값은 UNAVAILABLE입니다. 원본 송출 해상도는 알 수 없으며 웹 FPS는 rAF 갱신 지표입니다. [측정 의미와 검증 한계](LIVE-DIAGNOSTICS.md)를 참고하세요.

기존 0.4.0은 같은 30fps/ACK 프로토콜로 재생할 수 있지만 새 진단에는 0.5.0과 확장 1.0.9가 필요합니다. **Pages 새로고침만으로 PC 도구는 업데이트되지 않습니다.** LIVE를 닫고 새 Release ZIP을 고정 폴더에 풀어 `native-live/Install-Web-LIVE.cmd`를 실행한 뒤, 포함된 확장을 다시 로드하고 웹을 Ctrl+F5 합니다.

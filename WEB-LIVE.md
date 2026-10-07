# 웹 LIVE 적용

웹은 Viewer 1.08로 업데이트된다. 로그인·채팅·미디어·Replay는 기존 UI를 유지한다. 62바이트 이하 키는 기존 Agora Web 경로로 재생하고, 64바이트 키 방송은 정상 로그인 계정으로 `/enter`하는 Windows Native 도구를 사용한다. 원본 1.06은 Git 기록과 `native-live/vendor/index.html`에 보존했다.

## 한 번 설치

1. [Windows LIVE 연결 도구 0.3.0](https://github.com/fffdsaw/fromm-viewer/releases/download/native-live-0.3.0/fromm-native-live-windows-x64.zip)를 내려받아 고정된 폴더에 압축을 푼다.
2. `native-live/Install-Web-LIVE.cmd`를 실행한다. 현재 사용자 Chrome/Edge에 Native Messaging host를 등록한다. 관리자 권한은 필요하지 않다.
3. Chrome 확장 관리에서 기존 Fromm 확장프로그램을 끄고, 개발자 모드의 **압축해제된 확장프로그램을 로드**로 함께 받은 `chrome_extension` 폴더를 선택한다. 이 버전은 1.0.7이다. 기존 폴더의 파일을 갱신했다면 확장 관리의 새로고침 버튼을 눌러 다시 로드한다.
4. [Fromm Viewer 1.08](https://fffdsaw.github.io/fromm-viewer/?v=1.08)을 Ctrl+F5로 새로고침한다.

그 다음부터 웹에서 로그인하고 LIVE 방송을 선택한다. PC 도구가 정상 `/enter`로 시청 권한을 확인하고 Native SDK로 수신한다. 웹 LIVE 화면에는 Native에서 출력한 영상 프레임이 표시되고 소리는 PC 도구에서 나온다. Native 창은 최소화해도 되며, 닫으면 재생이 종료된다. 웹 LIVE를 떠나거나 웹 탭을 닫으면 연결도 종료된다. 채팅은 기존 폰 앱에서 사용할 수 있다.

웹 영상 전달은 JPEG 30fps를 목표로 한다. 웹이 이전 이미지를 해독한 뒤 ACK를 보내야 다음 이미지를 전송하므로 오래된 영상이 쌓이지 않는다. 응답이 늦으면 프레임을 건너뛰고, 숨겨진 웹의 타이머/화면 갱신 정책과 PC 성능에 따라 실제 fps는 낮아질 수 있다. 방송 원본이 30fps보다 낮으면 새로운 장면을 30개 만들어내는 기능은 아니다. Native 원본 영상 창에서는 SDK 원래 프레임률로 볼 수 있다. Windows 도구가 없는 브라우저에는 설치 안내가 표시된다. 모바일의 기존 기능은 유지되지만 64바이트 LIVE의 Native 재생은 Windows PC에서만 지원한다.

이 PC에서 생성한 720×1280 영상으로 실제 Electron 캔버스 → JPEG → IPC → Windows named pipe의 공식 framing → 웹 이미지 해독/표시 → ACK 경로를 12초 측정해 358프레임, 표시 약 30.4fps, 이미지 변환 평균 7ms, ACK 평균 2ms를 확인했다. 이 테스트는 합성 영상이며 Fromm 인증, 실제 RTC 영상 수신, Chrome 확장의 실제 Native Messaging 호출이나 소리 싱크를 검증하지 않는다. 실제 LIVE 검증은 다음 방송에 진행한다. Native 창의 비동기 toBlob은 숨겨진 상태에서 평균 약 1초가 걸려, 측정된 동기 JPEG 캡처를 사용한다.

## 연결과 인증

웹 → 해당 웹의 top frame content script → 확장 service worker → Chrome 공식 Native Messaging → 로컬 relay → Windows named pipe → 격리된 Electron player preload → Agora Native SDK.

웹과 Native 사이에 공개 HTTP/WebSocket 서버를 열지 않는다. 확장은 `https://fffdsaw.github.io/fromm-viewer/` top frame만 받으며 host는 고정된 확장 ID만 허용한다. 웹이 Native 도구에 보내는 값은 본인의 로그인 token/device ID와 선택한 room/channel이다. Native는 이 세션으로 `/enter`를 요청하고 그 응답의 RTC token/문자열 계정/키/salt만 사용한다. 임의 RTC token이나 키를 제출하는 API는 제공하지 않는다.

secret/token은 메모리 통신만 사용하며 파일·URL·명령줄·로그에 저장하지 않는다. 웹으로 반환하는 것은 제한된 진단 단계와 영상 JPEG 프레임뿐이다. 키를 truncate/hash/decode/변형하지 않는다. salt만 Base64 decode 후 first 32 bytes를 사용한다. 인증·구독 권한은 Fromm 서버가 결정한다.

## 배포와 검증

GitHub Pages는 main의 웹 파일을 사용한다. Windows 패키지는 main 적용 시 GitHub Actions가 공식 Electron/Agora SDK를 설치해 release `native-live-0.3.0`으로 빌드한다. 도구 0.3.0과 확장 1.0.7을 함께 사용해야 ACK가 전달된다. 구버전이면 입장 정보 전달 전에 업데이트 안내를 표시한다.

자동 검증: 원본 보존, 키/salt/RTC identity 검증, Native Messaging framing, 웹/Native 라우팅, 모바일 경계, 악성 origin/iframe 거부. 실제 Windows에서 relay ↔ Electron handshake와 공식 Native addon 설정을 확인했다. 별도 프로토타입에서 실제 LIVE의 Native 영상·소리 재생을 검증했고, 웹 연결 후의 실제 로그인/inline 영상·소리 검증은 별도로 기록한다.

공식 근거: [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), [Agora Electron SDK](https://github.com/AgoraIO-Extensions/Electron-SDK), [EncryptionConfig](https://api-ref.agora.io/en/video-sdk/electron/4.x/API/class_encryptionconfig.html).

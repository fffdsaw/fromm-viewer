# Fromm Viewer 단일 EXE 실험

이 변경은 `codex/desktop-single-exe` 실험 브랜치에만 있다. `codex/live-receive-diagnostics`의 최소 계측 변경을 기반으로 한다. main과 GitHub Pages 배포는 변경하지 않았다. 기존 브라우저 방식은 fallback으로 남긴다.

## 현재 실제 배포본 설치

main README 기준: Windows LIVE tool ZIP 다운로드 → 고정 폴더에 압축 해제 → 확장 1.0.8 수동 로드 → `native-live/Install-Web-LIVE.cmd`로 host 등록 → GitHub Pages 접속·정상 로그인 → LIVE 선택. 이후에는 웹이 helper를 자동 실행한다. 배포본의 설치 단계는 아직 그대로다.

## 실험 앱의 사용 단계

`Fromm Viewer.exe` 다운로드 → 실행 → 정상 로그인 → Viewer 사용. 별도 ZIP 해제, Chrome 확장, Native Messaging 등록, CMD 실행, 웹 주소 접속이 필요 없다. Portable EXE가 Electron/SDK 파일을 임시 위치에 자동으로 풀어 실행한다. 설치 레지스트리나 관리자 권한은 필요 없다. 계정의 정상 구독·시청 권한과 정상 `/enter` 검증은 유지한다.

이것은 **Windows x64 실행 프로토타입**이며, Linux에서 Windows 타깃으로 빌드했다. Windows에서 이 EXE를 직접 실행하거나 실제 로그인/Replay/채팅/미디어 저장/LIVE를 확인하지 못했다. 실제 사용자 기능 성공을 주장하지 않는다. Windows 검증 전 main 배포에 넣지 않는다.

로그인/Device ID와 Viewer의 Storage 호출은 앱 메모리로 처리한다. 앱을 종료하거나 페이지를 재로드하면 다시 로그인해야 한다. 실제 auth/RTC token/key/salt/account를 파일·URL·명령줄·로그에 기록하는 기능을 추가하지 않았다. 미디어 저장은 기존 UI의 선택된 파일 저장 기능을 재사용한다.

## A/B 비교와 권장 배포

| 기준 | A: Electron 통합 앱 | B: 기존 helper 단일 installer |
| --- | --- | --- |
| 사용자 편의 | EXE 실행과 로그인; 확장/host 설정 없음 | 파일/host 자동 설치 가능하지만 Chrome 확장 최초 로드는 남음 |
| 유지보수 | 같은 index.html과 web adapter를 빌드 때 묶음; Electron/SDK 패치 필요 | 웹은 즉시 업데이트; helper/확장/host 버전 조합 관리 필요 |
| 보안 | Viewer sandbox/contextIsolation/webSecurity, Native SDK 격리, IPC sender 검증, 공식 API host 제한, 메모리 로그인 | 기존 origin/extension ID 제한과 native host 등록 유지; 브라우저와 확장 경계 추가 |
| 업데이트 | 현재 EXE 교체 방식; 자동 업데이트는 미구현 | installer 갱신과 확장 reload 필요; 웹 UI는 자동 갱신 |
| 코드 복잡도 | 기존 Electron main/preload와 30fps adapter 재사용, packaging/UI snapshot 추가 | installer code는 작지만 기존 다단계 연결 구조 유지 |

**권장: A, Electron 통합 앱.** 먼저 단일 portable EXE로 Windows 회귀/LIVE 검증을 통과시킨 뒤 코드 서명과 검증된 업데이트 체계를 추가한다. 장기 설치/업데이트 관리가 필요하면 동일 통합 앱의 서명된 Setup.exe를 선택할 수 있다. B의 helper installer는 긴급 대안이며 확장 수동 설정 문제를 완전히 없애지 못한다. 현재 프로토타입은 코드 서명과 자동 업데이트를 구현하지 않았다.

## 기존 코드 재사용 범위

- 최신 root `index.html`을 build-time snapshot으로 포함한다. 원본 1.06 `native-live/vendor/index.html`은 변경하지 않는다.
- 최신 LIVE UI, 로그인, 채팅, media, Replay 코드 전체는 유지하고 API fetch adapter만 `<head>`에 더한다. Native messaging 없이 제한된 Electron IPC를 사용한다.
- Native SDK는 기존 player-preload에서 구동한다. Viewer renderer에는 Node 접근을 주지 않는다. 기존 정상 `/enter` 응답을 main에서 검증·캐시해야 `live:join`이 성공한다. Renderer는 room ID만 요청하고 임의 RTC/key를 제출하지 않는다.
- LIVE inline JPEG, FramePump 30fps 목표, image decode 후 ACK, hidden tab repaint coalescing을 재사용한다. Player→main→Viewer IPC 경로이므로 Chrome/relay/named-pipe 단계가 없다. 동일 기능 개선이 두 UI에 적용되며 기존 웹 연결은 유지한다.
- Bulk save의 사용자 directory picker와 direct-media fallback을 보존한다. Fullscreen/diagnostic clipboard 외 camera/microphone 등은 허용하지 않는다. Native SDK는 기존 receive-only 설정을 유지한다.

## 더 효율적인 전송 후보

| 후보 | 예상 비용/이점 | 현재 결정 |
| --- | --- | --- |
| 현재 Electron IPC JPEG | Chrome/Native Messaging hop 제거; JPEG와 decode는 남음 | 프로토타입에서 적용, Windows 실제 이득 미확인 |
| Viewer renderer preload의 SDK 직접 표시 | Canvas readback/JPEG/ACK hop 제거 가능 | SDK를 Viewer 프로세스에 넣는 격리 변경, 아직 적용하지 않음 |
| WebCodecs + encoded transport | JPEG 대신 효율적 inter-frame codec 가능 | SDK encoded-frame observer format/timestamps/lifetime 검증 필요; 미구현 |
| Shared memory raw frame | Base64/JSON 비용 줄일 수 있음 | 720×1280 RGBA 30fps 약 110.6MB/s; 메모리 수명·동기화·색 변환 필요 |
| Shared texture | CPU readback/JPEG 제거 가능 | Windows GPU handle/fence와 Chromium renderer 통합이 커서 미구현 |
| Native window/embed | 기존 Native render FPS 유지 가능 | DPI/resize/focus/z-order와 두 화면 UX 관리 필요; 별도 창 fallback은 기존 기능 재사용 가능 |

숫자상 이득은 아직 확인하지 않았다. 기존 30fps 경로를 지우거나 main에 대규모 전송 변경을 넣지 않는다.

## 개발자 빌드와 검증

Windows x64에서:

```powershell
cd native-live
npm ci
node node_modules/electron/install.js
npm run prepare-ui
npm test
npm run self-test
node_modules\electron\dist\electron.exe . --ui-smoke
node_modules\electron\dist\electron.exe . --frame-benchmark
npm run desktop:build
```

출력: `native-live/dist/Fromm Viewer.exe`. Build hook는 Windows SDK addon, AgoraRtcWrapper.dll, agora_rtc_sdk.dll 존재와 PE header를 검사해 Native SDK가 빠진 EXE 생성을 거부한다. `.node`/DLL은 `app.asar.unpacked`로 풀며 임의 재빌드를 하지 않는다.

`.github/workflows/desktop-prototype-windows.yml`은 UI smoke, packaged addon self-test, EXE artifact 생성용이다. release를 publish하지 않는다. GitHub 쓰기 권한 거부로 이번 작업에서 원격 브랜치/PR/새 workflow 실행을 만들지 못했다.

Windows EXE는 공식 Electron 44.6.0과 기존 release `native-live-0.3.0`에 포함된 Agora Electron 4.6.2 Windows addon/DLL로 cross-build했다. SDK 다운로드 스크립트가 이 환경의 proxy를 사용하지 못해, 정상 proxy를 통해 기존 공개 release ZIP에서 같은 버전의 runtime만 가져왔다. LIVE 데이터나 credential은 없었다.

최종 검증 결과 및 실행 파일 경로는 [작업 보고서](WORK-REPORT.md), 계측 정의와 다음 LIVE 체크리스트는 [LIVE-DIAGNOSTICS.md](LIVE-DIAGNOSTICS.md)에 기록한다.

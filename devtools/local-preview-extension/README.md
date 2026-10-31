# Fromm Viewer 실험용 Chrome 연결 (개발자 전용)

이 폴더는 **Fromm Viewer 로컬 UI 미리보기 전용 확장**입니다. 기존 배포용 `chrome_extension`과 혼동하지 마세요. 배포하거나 `main`에 병합하면 안 됩니다.

## 왜 필요한가?

공식 Chrome 확장 1.0.9의 CORS 규칙은 `https://fffdsaw.github.io`에서 시작된 요청을 위해 작성되어 있습니다. VS Code Live Server의 `http://127.0.0.1:5500`은 다른 origin(출처)이므로 공식 확장은 로컬 사이트의 로그인 응답을 허용하지 않습니다. 게다가 뷰어의 `index.html`은 기본적으로 localhost의 API 요청을 `/__fromm_proxy`로 전송하므로 Live Server에서 이메일 확인이 실패합니다.

## 실행 순서 (macOS Chrome, 다른 컴퓨터도 동일)

1. VS Code에서 **실험 브랜치 `experiment/glowme-phase3-chat-layout`** 로 전환하고 Git: Pull(변경 사항 가져오기) 실행.
2. Live Server의 주소가 정확히 **`http://127.0.0.1:5500/`** 인지 확인. **`localhost`, 포트 5501 등은 이 실험 확장의 허용 출처와 일치하지 않음.** 필요하면 Live Server 설정에서 `liveServer.settings.host`를 `127.0.0.1`, `liveServer.settings.port`를 `5500`으로 지정.
3. Chrome 주소창에 `chrome://extensions` 입력 → **개발자 모드 ON** → **압축해제된 확장 프로그램 로드**. 아래 폴더 **그 자체**를 선택:
   `<Git으로 복제한 fromm-viewer>/devtools/local-preview-extension`
4. 확장 목록에 **Fromm Viewer Local Preview Bridge (DEV ONLY)** 가 표시되는지 확인. 본 확장에는 Native LIVE 연결 기능이 **없음**(macOS에서는 Windows Native LIVE 미지원).
5. 브라우저에서 **`http://127.0.0.1:5500/?previewBridge=1`** 열기. 이 URL에서는 로컬 프록시 대신 브라우저의 직접 HTTPS 요청과 실험 확장 규칙을 사용.
6. **이메일 확인**을 눌러 정상 계정 인식 여부 검사. 로그인은 직접 설치한 신뢰 가능한 로컬 소스에서만 수행하고, 화면/로그에 **비밀번호, 토큰, 기기 ID를 공유하지 말 것.**
7. 문제가 있으면 **고급 옵션 → 호환성 진단**에서 상태 코드와 오류 단계만 확인. 콘솔 `FrommDiag()`도 민감한 응답 본문을 출력하지 않도록 설계되어 있음.
8. 실험을 마치면 `chrome://extensions`에서 **DEV ONLY 확장을 비활성화**. 배포용 확장은 수정하거나 다시 설치할 필요 없음.

## 범위 및 보안

- DNR(declarativeNetRequest, 브라우저 요청 헤더 규칙) 기능만 포함하며, 백그라운드 스크립트·브라우징 정보 수집·Native Messaging·페이지 자바스크립트 주입을 **포함하지 않음**.
- 원래 공식 확장의 네트워크 변경 규칙 4개를 복제하되 요청 개시 도메인 `127.0.0.1`로 제한하고 Access-Control-Allow-Origin(응답 출처 허용)을 `http://127.0.0.1:5500`으로 바꿨음.
- `https://*/*`는 이미지·미디어 CDN 등 다양한 호스트의 응답을 허용할 때 필요한 기존 확장과 유사한 광범위 호스트 권한임. **127.0.0.1에서 시작한 요청에만** 규칙이 적용되지만, 이 컴퓨터에서 다른 로컬 웹사이트를 사용할 때 영향을 줄 수 있음. 반드시 로컬 테스트 후 비활성화할 것.
- `?previewBridge=1` 스위치는 `127.0.0.1`에서만 의미가 있으며, 일반 공식 웹사이트와 기존 프로젝트 배포 코드는 영향을 받지 않음.
- **실제 Chrome 설치·라이브 Fromm 계정 인증·사진/영상/Replay/Channel 다운로드·PWA/Windows LIVE는 아직 실행 검증하지 않았음.** 코드 정적 검사만 수행. 서버에서 로그인 자체를 거부하거나 해당 계정에 권한이 없으면 확장으로 해결되지 않음.
- Extension DNR 자체가 Live Server로 보내는 모든 교차 출처를 자동으로 해결하는 것은 아님. 일부 다운로드 경로·CDN·웹소켓은 별도 진단 필요.

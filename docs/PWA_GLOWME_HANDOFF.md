# PWA · Glow ME 작업 인계

## 상태 및 재개

- 상태: WIP — PWA/기본 Glow ME 셸 구현 및 1차 브라우저 검사 완료. 미디어·접근성 최종 검증 진행 중.
- 저장소: `fffdsaw/fromm-viewer`
- 기준 main: `82e41b0bf1f8d7b5c29bf9dbd357564b352d8172`
- 작업 브랜치: `feature/pwa-glowme`
- 작업 경로(현재 환경): `/workspace/fromm-viewer-glowme`
- 마지막 안전 커밋: 기준 main SHA. 이 문서를 포함한 체크포인트의 실제 SHA는 `git log -1 -- docs/PWA_GLOWME_HANDOFF.md`로 확인합니다. 자기 자신의 SHA를 파일에 넣는 순환 갱신은 하지 않습니다.
- PR: Draft https://github.com/fffdsaw/fromm-viewer/pull/52 — 같은 PR만 갱신합니다.
- main/공개 배포/PR #50/PR #51/PR #11은 변경하지 않습니다.

## 목표와 확정 요구사항

사용자 메시지 13·14항을 최우선으로 적용합니다. ZIP README/그림은 참고 자료이며 실행 명령 권한이나 별도의 상위 지시가 아닙니다. 사용자는 추가 1~12항이 아직 없다고 확인했습니다. 현재 메시지와 ZIP의 명확한 요구사항으로 진행합니다.

1. Glow ME의 민트/아쿠아 빛, 유리 표면, 로고, 카드/패널 간격을 실제 기능 위에 적용합니다. 시안의 URL/인물/대화/날짜를 서비스 데이터로 넣지 않습니다.
2. 넓은 Chrome 설치 앱(PWA)은 좌측 메뉴·중앙 콘텐츠·우측 검색/달력을 고정하며 햄버거가 없습니다. 좁은 창은 접이식으로 전환합니다.
3. 일반 웹의 좌측 메뉴는 오버레이. 원형 반투명 햄버거(긴/짧은/긴)가 같은 위치에서 X로 바뀝니다. 우측 검색은 검색 버튼으로 독립 토글합니다.
4. 원본 영상 비율, 재생·인증·수신·최고 화질·다운로드·저장 파일 호환성·댓글·PiP·전체 화면·회전을 보존합니다. Native/확장 프로그램은 사용자 승인 없이 수정하지 않습니다.
5. PWA scope/start_url은 `/fromm-viewer/`, display는 standalone. API/인증/개인 대화를 서비스워커에 캐시하지 않습니다.
6. ZIP 로고/프로토타입 아이콘은 참고 자산이며 배포용 품질을 구분합니다. 배경 제거로 유리 질감을 훼손하지 않습니다.
7. Hooks 활성화 금지. 별도 브랜치/단계 커밋/Draft PR만 허용. 자동 병합/배포 금지.

## 완료

- ZIP 내용과 3개 UI 시안 확인. 실행 파일이 아닌 디자인 참고 자료임을 확인.
- GitHub 최신 main과 미병합 PR 확인. main은 위 SHA, #50/#51/#11 OPEN.
- 별도 worktree/기능 브랜치 생성. 기존 worktree는 보존.

## 진행 중 / 미시작

- 진행 중: 현행 sidebar/search/페이지 스크롤 구조 및 회귀 테스트 조사.
- 미시작: 안전한 PWA 등록·정적 자산 정책, Glow ME 자산/스타일, 설치 앱 3단 및 웹 패널 제어, 브라우저/회귀 검사, Draft PR.

## 변경 파일

- `docs/PWA_GLOWME_HANDOFF.md`: 요구사항/체크포인트/재개 절차. 앱 변경 없음(현재 체크포인트).

## 테스트 / 오류

- `git status`, `git fetch origin main`, GitHub main/열린 PR 조회: 성공.
- 자동/브라우저 검사: 구현 전이므로 아직 미실행. 기존 성공 기록을 이번 브랜치 검사로 간주하지 않습니다.
- 알려진 실패: 없음. 추가 요구사항 1~12는 아직 없다는 사용자 확인을 받았습니다.

## 직접 검증 필요

- 실제 Chrome 설치·업데이트·독립창/OS 아이콘/모바일 설치 UX.
- 인증한 실제 Fromm LIVE/Replay/Channel 스트림, Native/Chrome 확장 연결, 권한 확인, 실제 파일 저장.
- 물리적 모바일/iOS/Safari, OS 전체 화면/PiP. 합성 데이터 검사를 실방송 검증으로 보고하지 않습니다.

## 다음 작업 / 재개 절차

1. `git fetch origin` 후 `origin/feature/pwa-glowme`와 PR 상태 확인. 브랜치가 없으면 임의 대체 브랜치를 만들지 말고 복구 가능 여부 보고.
2. 이 파일, `git status --short`, `git log -5 --oneline`을 대조. 미커밋 변경을 덮어쓰지 않습니다.
3. 새 main과의 차이를 먼저 분석하며 무조건 reset/merge하지 않습니다. #51 변경을 임의로 섞지 않습니다.
4. 위 진행 중 항목부터 이어서 구현. 각 단계 테스트 명령·결과·실패 원인·파일 목록을 여기 기록하고 커밋합니다.
5. 부족한 검증만 실행합니다. 코드 변경 없이 이미 통과한 검사를 반복하지 않습니다.
6. 중단할 때 WIP/완료/실패/미검증과 다음 단계를 구분하고 브랜치·커밋·동일 PR 주소를 보고합니다.

인증 토큰·비밀번호·계정·개인 대화·API 응답은 이 문서/스크린샷/로그에 기록하지 않습니다.

## 체크포인트 1 — PWA 기반

- 이전 안전 커밋: `be09944` (초기 요구사항 기록). 이 단계 커밋은 아래 git 명령으로 확인합니다.
- 추가: `manifest.webmanifest`, `web-pwa.js`, `sw.js`, `assets/glowme/*`, `test/pwa.test.cjs`.
- `index.html`: manifest/favicon/theme-color 및 설치 전용 JS 링크만 추가. 인증·재생 로직은 그대로입니다.
- 서비스워커는 정확한 공개 이미지 URL 4개만 취급합니다. HTML/JS/CSS/API/미디어/쿼리 URL/Authorization/Range/비GET 요청은 가로채지 않습니다. 강제 skipWaiting/재생 중 새로고침 없음. 오프라인 앱 제공을 주장하지 않습니다.
- 테스트: `/workspace/.fromm-env/node_modules/node/bin/node --test test/pwa.test.cjs` → 4/4 통과, 실패/스킵 0.
- 아이콘은 제공된 시험용 원본 그대로이며 maskable로 선언하지 않았습니다. 배포용 정제는 미완료로 표시합니다.
- 다음: 실제 sidebar/검색 DOM을 재사용하는 설치 앱/웹 셸, Glow ME CSS 및 브라우저 검사.

## 체크포인트 2 — 실제 UI 셸

- 이전 안전 커밋: `e75e04f` (PWA 기반).
- 추가: `glowme.css`, `web-glowme.js`, `test/glowme.browser.cjs`.
- `index.html`: 외부 스타일/셸 링크, 설치 앱에서 패널을 닫지 않는 UI 가드, 패널 위치 계산 위임, 메뉴/검색 독립 토글만 변경. 재생/인증 구현은 변경하지 않음.
- 일반 웹: 원형 긴/짧은/긴 → X 버튼, 고정 헤더, 독립 좌우 패널. 설치 앱(standalone + 1200px 이상): 왼쪽/오른쪽 고정, 햄버거 제거. 좁아지면 원래 웹 패널 상태 복원.
- 실제 기존 검색 DOM/달력/이벤트 재사용. 비대화 화면에서 검색 fieldset을 비활성화해 재생 중 의도치 않은 화면 전환을 방지.
- Glow ME 민트/유리 셸 적용. 영상/플레이어·라이트박스는 읽기 쉬운 검정 표면 유지. 원본 제공 로고 사용.
- `/workspace/.fromm-env/node_modules/node/bin/node --check web-glowme.js`: 통과.
- `AGORA_TYPES_PATH=/tmp/agora-462/package/types/Private/IAgoraRtcEngine.d.ts ...node --test test/*.test.cjs native-live/test/*.test.cjs`: 277/277 통과, 실패/스킵 0.
- `NODE_PATH=/workspace/.fromm-env/node_modules:/tmp/fromm-ui-deps/node_modules GLOWME_SCREENSHOT_DIR=/tmp/fromm-glowme-check ...node test/glowme.browser.cjs`: 통과. 320/390/844/1440px 웹, 독립 패널, 버튼 위치, 모의 standalone 넓음/좁음, 실제 HTTP 서비스워커 범위 검증. JS 오류/가로 넘침 없음.
- 화면 증거(현재 환경): `/tmp/fromm-glowme-check/`의 before/web/login/menu/search/installed PNG 및 geometry.json. 합성 데이터만 포함.
- 초기 실패/수정: 테스트 seed의 존재하지 않는 renderRooms 호출 제거(테스트 오류); 844px 스크롤 후 기존 relative 헤더 때문에 토글이 숨는 문제를 sticky 헤더로 수정. 재실행 통과.
- 다음: 실제 영상 재생/다크 컨트롤, 추가 로그인/카드/투표 표면 대비, 접근성 검사, CI 연결 및 Draft PR 검증.

## 체크포인트 3 — 실제 자산 및 미디어 회귀 검사

- 이전 안전 커밋: `d8b21af` (Glow ME 셸). PR #52 생성 완료. 현재 최종 CI 전 WIP.
- 기존 브라우저 fixture가 새 JS에 HTML을 반환해 첫 CI 브라우저 job이 `Unexpected token '<'`로 실패했습니다. 공통 `test/helpers/shell-assets.cjs`로 실제 CSS/JS/로고를 읽도록 기존 브라우저 검사를 연결했습니다. 앱 오류를 무시/억제한 것이 아닙니다.
- `.github/workflows/channel-videos.yml`: 새 자산/테스트 경로와 axe 4.11.1, Glow ME 실제 HTTP 브라우저 검사/스크린샷을 CI에 연결했습니다.
- 새 스타일의 input selector 우선순위가 seek 트랙 배경에 간섭하는 것을 화면에서 발견해 :where로 범위를 바로잡았습니다. 영상 컨트롤은 기존 검정/흰색 대비를 유지합니다.
- 로그인 고급 옵션 대비 2.45:1 문제를 수정. 새 Chromium/axe WCAG A/AA 검사에서 login-390, menu-390, installed-1440 위반 0. 전체 서비스의 접근성 완전성을 주장하지 않습니다.
- 실제 worker CacheStorage는 공개 이미지 4개만 포함함을 확인. 비밀/대화/API/미디어 캐시 없음.
- 완료: 실제 정적 자산으로 아이콘(1440/390), Channel MP4(12개 viewport, 가로·세로), Replay MP4(12개 viewport), 설정/회전/상태 유지/페이드(1440/390/844), 실제 합성 HLS 최고/수동 화질(5개 viewport), Channel 브라우저 내비게이션 검사 통과.
- LIVE 페이드 검사의 강제 hover가 sticky 헤더 뒤의 좌표를 가리키던 테스트 문제를 수정: elementFromPoint로 실제 노출된 플레이어 지점을 사용. LIVE/PiP 재실행 통과(실방송 아님).
- 메뉴 동작 후 검색 패널이 유지되므로 본인 답장 retry 검사는 닫혔을 때만 열도록 수정. 개인 식별/답장 로직은 변경하지 않았습니다.
- main 대비 14개 핵심 함수(서명 HLS/화질/저장/연결/기존 라우트) 및 Native/확장/LIVE 보조 JS가 동일함을 확인. 증거: `/tmp/fromm-glowme-source-preservation.json`.
- 진행 중: 나머지 기존 브라우저 회귀 배치와 설치 앱 모의 영상 검사. 원격 최종 CI는 다음 커밋 후 확인 필요.
- 알려진 제약: 앱 설치/물리 기기/실방송은 미검증. 제공된 프로토타입 아이콘의 정식 16px/maskable 검수는 미완료. 기능 코드는 배포하지 않음.

# Glow ME 3차 — ChatGPT 병행 UI 실험 인계 (2026-10-31)

> **경고: 실험 브랜치이며 검증/병합/배포되지 않음.** Codex의 기존 작업을 절대 덮어쓰지 말 것.

## 원본 및 보호 범위

- 저장소: `fffdsaw/fromm-viewer`
- **원본 Codex 브랜치:** `feature/glowme-uiux-phase3`
- **원본 Draft PR:** https://github.com/fffdsaw/fromm-viewer/pull/53
- **원본 P1 완료 체크포인트:** `26dfda93cfe3160c6869cf0ad4f59c1c91177a7e`
- **이 실험 브랜치:** `experiment/glowme-phase3-chat-layout`
- `main` 및 PR #53에 대한 직접 쓰기/병합/배포는 수행하지 않았음
- 기존 작업 환경 `/workspace/fromm-viewer-phase3`의 **로컬 미커밋 수정은 확인하지 못함**. 재개 시 최우선 확인

## 실험 브랜치에서 작성한 항목

1. `web-glowme-phase3-experiment.js` — 기존 Glow ME 셸 로드 후 별도로 실행되는 9개 탐색 메뉴, 아티스트 목록 사진/이름 장식, 접힘·확장 처리, 현재 콘텐츠 안내 문구, 통계의 헤더 재배치
2. `glowme-phase3-experiment.css` — 좁은 플로팅 레일, 메뉴 고정, 아티스트 목록 전용 overflow 스크롤, 블록형 아티스트 배경 제거, B안 v3.3(아티스트 이름 + 기존 데이터 기반 통계), 기존 중복 필터 탭 숨김, 선택 0개 도구 숨김, 헤더 틈 배경 차폐, 민트·그린 팔레트
3. `web-glowme.js` — 독립 CSS/JS 파일 로더 추가, 레이아웃 전환 시 기존 사이드바가 inert 처리되지 않도록 부분 조정, 기존 햄버거 버튼 숨김

**수정 범위:** HTML 11,000줄짜리 기존 `index.html`이나 데이터/인증/미디어 재생 엔진은 직접 수정하지 않음.

## 중요 설계 의도

- 기존 `#counts` DOM 요소를 아티스트 이름 바로 아래로 이동함. `renderCountsOnly()`가 기존 데이터를 기준으로 계속 갱신하므로 통계를 하드코딩하지 않음
- 기존 데이터 접근·`setFilter()`·`selectRoom()`·`setLiveCenterMode()` 재사용
- `loadRooms()`가 비동기로 만든 아티스트 버튼에 프로필 사진과 이름만 추가하므로 원래 onclick 핸들러는 유지
- 접힌 상태에는 항상 아이콘 메뉴 9개 접근 가능, 펼쳐진 상태에는 9개 메뉴 고정 + `#rooms`만 스크롤
- 기존 햄버거/X 대신 독립 레일 트리거와 Hover/Keyboard/Touch 이벤트. 낮은 가로 화면은 3열 메뉴로 구성
- Liquid Glass 실제 Meapri 소스 연동은 **아직 수행하지 않음**. 3차 또는 검증된 별도 실험으로 미룬 상태

## 실제 수행 및 검증 범위

- GitHub API를 통한 별도 브랜치 생성·소스 파일 생성·커밋까지 수행
- 코드의 기존 DOM 구조·전환 함수·카운트 갱신 함수·사이드바 상태 함수를 정적 분석
- **실제 브라우저 실행, 시각 스크린샷, JavaScript 구문 검사, 자동화 테스트는 수행하지 못함**
- 따라서 아래 기능은 모두 **실행 미검증**: 메뉴 전환, 비동기 아티스트 리스트, 로고 렌더링, 모바일 가로 회전, 스크롤·초점·Escape, 검색 패널·PWA 고정 패널·다운로드, 화면 레이아웃 안정성
- 브라우저 실행 환경에서 반드시 `node --check web-glowme-phase3-experiment.js`, `node --check web-glowme.js`, Playwright/Chromium 테스트, 기존 회귀 테스트, 실제 스크린샷 비교 수행
- 실험용 코드가 미완성·부적합하다면 `web-glowme.js`의 experiment CSS/JS 로더를 제거하고 본 브랜치를 폐기 가능

## Codex 복구 후 합치는 순서

1. 기존 Codex 작업 디렉터리에서 `git status --short`, `git branch --show-current`, `git log -5 --oneline`, `git diff`를 읽고 **미커밋 작업을 먼저 안전하게 보존**
2. 기존 `feature/glowme-uiux-phase3`와 Draft PR #53의 최신 원격 상태와 `docs/GLOWME_PHASE3_HANDOFF.md` 확인
3. 별도 실험 브랜치 `experiment/glowme-phase3-chat-layout`의 변경만 비교: `git diff 26dfda9..experiment/glowme-phase3-chat-layout -- web-glowme.js web-glowme-phase3-experiment.js glowme-phase3-experiment.css`
4. 작동·접근성·성능·스타일 충돌 테스트. 그대로 병합하지 말고 필요한 코드만 선택 적용
5. 최종 v3.3 UI 요구사항을 충족하고 1차를 완료하면 2차 검색·스크롤, 3차 Meapri Regular, 4차 통합 검증 순서로 진행
6. 원본 PR #53의 인계 문서를 업데이트하고 단계별 커밋을 남길 것. **`main` 병합 및 공개 배포 금지**

## 특히 검토할 위험

- 기존 `web-glowme.js`가 PWA 넓은 화면에서 강제하는 좌측 고정 패널/검색 패널 상태와 실험 레일의 상호작용
- 기존 `setSidebarOpen()`가 관리하는 `aria-hidden`, inert, 본문 오버레이 상태
- 기존 헤더·툴바 높이 가정과 `#counts` 위치 변경
- 아티스트 목록이 긴 경우, 844×390 등 모바일 가로, 로그인 gate의 배경 inert 처리
- `#counts`가 투표/LIVE 화면에서 최신 통계를 유지하는 동작 및 데이터 로딩 중 부분 통계임을 표시하는 방식
- 서비스 워커가 새 정적 실험 파일을 최초 로딩/갱신 시 정상 배포하는지
- 중복 사이드바 탐색과 기본 필터 UI를 제거하지 않고 숨기는 방식의 접근성 영향

## 2026-10-31 후속 시각 조정 — 로고 및 마우스 추적 물방울

- 사용자 스크린샷 피드백: 상단의 독립된 이탤릭 소문자 `f` 버튼은 중복/어색함. 해당 버튼의 텍스트를 **기존 `assets/glowme/logo.png` 로고 이미지**로 교체하고, 펼친 메뉴에 있던 중복 로고 `.brand`는 표시하지 않음. 버튼의 접근성 이름·탭 초점·터치 클릭 확장/접기 기능 유지
- `glowme-follow-bubble`는 탐색 메뉴 뒤에서 9개 항목의 호버/키보드 초점을 부드럽게 따라가는 **민트 유리 선택 렌즈**. 포인터의 항목 내 상대 위치로 하이라이트 광원과 약한 가로 이동을 조정. 마우스가 메뉴를 벗어나면 실제 `aria-current=page` 항목으로 복귀
- 기본 선택 상태는 얇은 좌측 민트 선으로도 구분하므로, 커서가 다른 항목을 가리킬 때 실제 선택 상태가 사라지지 않음
- `prefers-reduced-motion`에서 이동 애니메이션 비활성화, `prefers-reduced-transparency`에서 투명 광택 제거
- GitHub 커밋: `11c6ed1`(JS), `67b9da3`(CSS)
- **JS 소스 구문 검사(컴파일)만 통과. 브라우저 렌더링·로그인·회귀 테스트는 미수행**
- 사용자의 기존 VS Code ZIP 디렉터리는 원격 변경에 자동 동기화되지 않으므로, 새 ZIP을 받거나 차이 파일만 별도 반영해야 새 효과 확인 가능

## 2026-10-31 후속 — 메뉴 축소 동기화·간격·아티스트 스크롤 샘플

사용자의 실제 브라우저 스크린샷 피드백을 반영하여 **실험 브랜치에만** 다음 수정 추가:
- `glowme-follow-bubble`의 JavaScript 픽셀 너비 설정을 제거하고 CSS `width:calc(100% - 2px)`로 변경. 사이드바 너비와 함께 직접 리플로우하며 별도 width 전환 지연을 제거. 세로 메뉴 이동 애니메이션과 커서 하이라이트는 유지
- 로고 버튼의 테두리·캡슐 배경·그림자를 없애고, 기존 PNG 로고가 레일 너비에 맞춰 `clamp()`로 비례 확대/축소되게 구현. 원래 중복 로고는 숨김 유지
- 데스크톱 메뉴 행 높이 37→33px, 간격 3→1px, 로고 높이·구역 여백 축소. 터치 입력 장치에서는 44px 높이 유지. 아티스트 구역 시작 위치 상승
- 로그인되지 않은 `localhost`/`127.0.0.1`에서만 `샘플 아티스트 01~32`를 `#rooms`에 표시하고 전용 스크롤 검증 가능. 전부 **가상 데이터**, 네트워크 인증·실제 채팅방 클릭/선택은 하지 않음. 실제 API에서 채팅방을 가져오면 기존 `loadRooms()`가 `#rooms`를 비우므로 샘플 자동 소멸
- 키보드 Escape 후 로고 버튼으로 포커스 이동 시 레일이 즉시 재확장되는 문제 방지를 위해 로고 자체 focusin은 강제 확장 예외로 처리
- JS 정적 구문 검사 통과, CSS 중괄호 개수 검사 통과. 실제 Chrome/Edge/모바일 회귀 및 스크롤·모션 시각 검증은 아직 미실행

커밋: `b38b3ab` (JS), `42d0244` (CSS). 이 문서 변경 후 마지막 HEAD는 별도 확인.

## 2026-10-31 레이아웃 위치 수정 — 사이드바를 **상단 헤더+중간바 아래**로

- 사용자의 의도는 메뉴 간격만 축소하는 게 아니라 사이드바 **전체의 시작 위치를 위쪽 두 개 바 아래로 이동**하는 것임
- `web-glowme-phase3-experiment.js`에서 `.viewer-header`와 `.toolbar`의 실제 `getBoundingClientRect().bottom` 값을 비교해 아래 8px부터 `--glow-rail-top`을 설정함. 헤더/툴바 ResizeObserver 및 창 resize/scroll에서도 requestAnimationFrame으로 재동기화
- `glowme-phase3-experiment.css` 끝에서 기존 `top:10px` 및 모바일/pinned 예외를 덮어쓰도록 `top:var(--glow-rail-top,176px)!important`, `bottom:8px!important` 적용
- 탐색 메뉴는 사이드바 상단에 고정하고 `#rooms`만 남는 높이에서 별도 스크롤
- 작은 화면에서 헤더가 화면 바깥으로 스크롤되면 top 값을 화면 안에 제한함. `innerHeight - 120px` 안전한도이므로 *아주 낮은 화면에서는 헤더 아래에 완전히 못 놓일 수 있음*; 추가 브라우저 검증 필요
- 커밋: JS `1983fb3`, CSS `a46f167`. JS 정적 파싱 및 CSS 구조 점검. 실제 레이아웃 렌더링/스크린샷 미검증

## 2026-10-31 디자인 v3.3 정정 — 중간바 완전 제거 (시각 UI)

**사용자가 강조한 확정 설계:** 아티스트 정보가 있는 상단 헤더만 유지하며 `전체 대화 · 미디어 · 사진 · 영상 · 음성 · 투표` 탭 및 중간바 자체는 화면에서 제거. 왼쪽 플로팅 레일은 9개 항목을 담당. **대화 검색 돋보기는 전체 대화 화면에서만 독립적인 플로팅 버튼**. 원래 중간바를 단순히 아래로 내려서는 안 됨.

변경 내역:
- `glowme-phase3-experiment.css`: `.viewer-header > .toolbar {display:none!important}` 및 헤더/중앙 영역을 1단으로 수정. 비표시 중간바의 DOM은 기존 JS 이벤트와 상태 로직을 위해 보존. Chrome PWA에 붙던 좌/우 3단 여백도 가운데 폭에 맞춤
- `web-glowme.js`: 실험 모드에서 숨겨진 툴바 슬롯 대신 실제 헤더 bottom + 10px을 기준으로 돋보기 절대/고정 위치 계산. 전체 대화 외 메뉴에서는 돋보기가 표시되지 않으며 이미 열린 검색 패널도 숨김. PWA의 자동 검색패널 오픈 방지
- `web-glowme-phase3-experiment.js`: `#sortControls`는 갤러리 위의 좁은 문맥별 정렬 버튼으로 이동. `#selectedCount`, `#selectAllBtn`, `#saveSelectedBtn`은 다운로드 항목을 선택할 때만 나타나는 독립 저장 도구로 이동. `#chatMatchNav`는 검색 패널에 넣고 검색 제목은 "대화 찾기"로 정정. LIVE/기존 접근성·인증 기능 코드 유지
- 기존의 `#scanState`는 DOM에서 보존하고 데이터 로딩 중에만 헤더의 보조 텍스트로 노출. 별도 중간바 없음
- 사이드바 상단 좌표는 전체 `.viewer-header`의 실제 하단을 측정. 이제 바 하나만 남았으므로 **상단 아티스트 헤더 아래**에서 시작
- 수정 커밋: `00524a9` (독립 컨트롤 JS), `a053347` (CSS), `b7f505b` (원래 shell의 실험 분기).
- 실험 모드에만 적용, 원본 Draft PR #53과 `main` 불변. 실제 브라우저/UI 테스트는 미실행이므로 PWA/모바일/검색 열고 닫기/선택 저장/정렬 검증 필요

## 2026-10-31 19시대 — 전체 너비 상단바 + 로컬 전용 Chrome 실험 연결

- 사용자 요청: **상단 헤더를 뷰포트 좌우에 꽉 차게** 만들고, 실험 UI에서도 기존 확장프로그램을 활용한 실제 로그인/미디어 확인 가능성을 열 것
- `glowme-phase3-experiment.css`: 메인 대화 영역은 왼쪽 축소 레일용 margin을 유지하되, `main > .viewer-header`만 viewport 가장자리(데스크톱 12px, 모바일 8px)까지 넓힘. `100vw` 오버플로 대신 부모 width/여백 기반 CSS 산식 사용. PWA pinned 레이아웃의 기존 넓이 제약도 override
- `index.html`: 로컬 `http://127.0.0.1`에서 **명시적으로 `?previewBridge=1`** 로 실행할 때만 기존 `/__fromm_proxy` 라우팅 우회. 공식 배포 사이트 및 스위치 없는 Live Server는 기존 코드 그대로
- `devtools/local-preview-extension/manifest.json` + `rules.json`: 배포용 `chrome_extension/` 수정 없이, 기존 DNR 규칙 4개의 initiatorDomains를 `127.0.0.1`로 제한하고 Access-Control-Allow-Origin을 `http://127.0.0.1:5500`으로 변경한 별도 DEV 확장 작성. Native bridge/백그라운드/content-script 없음. 독립 확장 ID
- `devtools/local-preview-extension/README.md`: 설치·테스트·해제 절차와 광범위 권한 위험/실행 미검증 상태 표시
- **주의:** 실제 Chrome 확장 설치 및 Fromm 서비스 인증 결과는 확인되지 않았음. 실제 로그인이나 미디어·LIVE 완전 동작을 보장하지 말 것. DNR/확장 권한 에러와 CORS 문제를 Chrome DevTools Network에서 사용자 직접 검증 필요
- PR #53과 main 절대 수정하지 않았으며, 실험 브랜치에서만 작업. 병합 전 반드시 로컬 확장 파일을 실제 배포에 포함할 것인지 보안 검토하고 devtools 경로를 보호해야 함

## 2026-10-31 사용자의 실로그인 UI 검증에서 발견한 기능 회귀 수정

실제 사용자 Chrome/Live Server `127.0.0.1:5500/index.html?previewBridge=1`에서 **로그인과 채팅 기록이 표시된 스크린샷**을 바탕으로 확인한 문제: 아티스트 선택 직후 좌측 9개 메뉴 반응 없음, 상단 상태 문자열 잔류, 검색/내 답장 기능 탐색 곤란, 검색/답장 ↑·↓ 이동바 부재, 미디어 선택 도구 부재, 선택 분홍색 잔류. 실제 사용자 계정/토큰은 저장하거나 조회하지 않음.

수정/원인:
- `index.html`의 원래 `selectRoom()`는 `setSidebarOpen(false)`를 호출함. 원래 `setSidebarOpen`은 `#sidebar.inert=true`, `aria-hidden=true`까지 만들어 **새 9개 메뉴가 보이지만 클릭/키보드 사용 불가**인 결정적 원인. 실험 클래스가 있을 때 `setSidebarOpen`이 레일을 항상 열려 있는 상태로 유지하고, 별도 `data-rail-expanded`가 64px⇄298px 모션만 제어하게 수정 (`90cde2b`).
- `index.html` 검색 밖 클릭 조건에 독립 플로팅 검색 버튼/패널/결과 독을 추가하여 새 구조의 outside-click 이벤트 보호. 설치형 PWA에서는 검색 패널을 완전히 닫을 수 있도록 실험에서만 기존 `pinned` 제한 해제 (`90cde2b`).
- 아티스트 변경 때 이전 아티스트의 `#counts` 문구(예: 내 글에 온 답장 n개)가 네트워크 작업 중 잠시 남지 않도록 새 방 선택 시 "대화 불러오는 중…"으로 즉시 초기화. 이후 기존 `renderCountsOnly()`가 갱신 (`2115e4e`).
- `web-glowme-phase3-experiment.js`: 기존 검색 매칭 ↑·↓ `#chatMatchNav` 컨트롤을 팝업 내부에서 **항상 읽기 화면에 남는 하단 플로팅 문맥 독**으로 분리. `syncChatMatchControls()`의 `hidden` 속성으로 자동 노출/숨김. 기존 `onclick`은 그대로 유지. 선택 시 기존 `#selectedCount`의 `has-selection`을 기준으로 `#selectAllBtn`/`#saveSelectedBtn` 포함 독 표시 (`8ecb491`).
- `glowme-phase3-experiment.css`: 채팅 키워드 검색/내 글에 온 답장 매칭 독에 화살표, 건수, 버튼 스타일. 미디어 카드 선택·채팅 선택·Replay/Channel 선택에서 분홍 잔재를 민트색 `#428e7a` 톤으로 override. 내 답장 활성화 상태/인용 강조도 민트색 (`48899fd`).
- **검증 상태**: 변환된 인라인 3개 JS 코드 구문 파싱 통과, CSS 괄호 균형 통과. 사용자 브라우저의 수정된 버전에서 직접 클릭/실제 Fromm 응답 테스트는 아직 하지 못했으므로 "완전 해결"이라고 단정하지 말 것.

다음 재검증 체크리스트: (1) 아티스트 클릭 후 좌측 사진·영상 탭 진입, (2) 전체대화로 돌아오기, (3) 돋보기 눌러 키워드 입력하고 하단 ↑·↓ 표시·이동, (4) 내 글 답장 on/off 확인 및 헤더 문구 복귀, (5) 미디어 카드 클릭 선택 → 하단 저장 독 노출/전체 선택/취소, (6) 선택 시 민트색, (7) Replay/Channel 컨텍스트 저장, (8) macOS Chrome/PWA 및 모바일/터치 키보드 시나리오. 기존 PR #53/`main`는 손대지 않음.

## 2026-10-31 실제 계정 화면 버그 수정 — 사이드바·검색·선택 도구

사용자가 Chrome `127.0.0.1:5500/index.html?previewBridge=1`에 실제 로그인한 스크린샷을 제공했으며, **대화 자체는 로딩 성공**했으나 아래 UI 회귀가 확인됨:

- 아티스트 선택 후 새 9개 사이드 메뉴가 클릭 불가: 원본 `selectRoom()`이 `setSidebarOpen(false)`를 호출해 사이드바에 `inert=true` 부여한 것이 원인. `index.html`에서 Phase 3인 경우 기존 드로어 닫기를 건너뜀. 실험 JS는 추후 레거시 경로가 `inert`를 다시 지정하더라도 MutationObserver로 `inert=false`, `aria-hidden=false` 복구
- 축소 레일 아래 실제 구독 아티스트가 보이지 않음: 기존 CSS가 `[data-rail-expanded!="true"] .glowme-artist-section { display:none; }`로 구역 전체를 숨겼고 JS도 `roomSection.inert=!expanded` 지정. 이제 CSS는 아티스트 구역을 항상 보이게 하되 축소시 `.glowme-room-avatar`만 노출하고 이름을 숨김. `#rooms` 독립 스크롤 유지, 원래 `loadRooms` 버튼 및 API 데이터 그대로 사용, 기존 클릭 핸들러 보존
- 검색, 내 답장, ↑·↓ 부동 도구: 기존 검색 패널 내부 독립 상태를 클릭 시 직접 열고 닫도록 통합. `#chatMatchNav` 원본 버튼은 이미 이 실험 브랜치의 독립 `.glowme-chat-match-dock`으로 이동한 상태이므로 조작/카운트 기능 보존. 패널 `inert`도 `.open`과 동기화. 외부 클릭/Escape로 닫음
- 미디어 선택 도구: `.glowme-selection-actions`를 이미지/미디어/영상/음성/Replay/Channel 진입 시부터 노출하고, 실제 선택 개수 0인 동안 `저장`만 비활성화. 원래 전체선택 및 저장 핸들러를 재사용. 전체 대화에서는 실제 선택된 미디어가 있을 때만 노출
- 상태 표시: 아티스트 이름 아래 문맥(전체대화/검색 중/내 답장/사진·영상·LIVE 등) + 기존 동적 카운트 배치. `#counts` 업데이트 감지로 검색/답장 취소 시 문맥 복원, `vote`에서는 이전 카운트가 남지 않도록 `index.html` Phase 3 분기에서 "투표 목록" 표시
- 선택 색상: 선택된 사진/채팅/Replay/Channel/영역 선택 및 검색 강조가 Glow ME 민트 계열 `#428e7a`가 되도록 CSS 우선 순위 재조정. 실제 미디어 데이터·저장 파일 처리 코드는 수정하지 않음
- 현재 최근 관련 커밋: `dc4c402` (원래 아티스트 선택 시 닫기 방지), `969f013` (상호작용 동기화), `068fff8` (축소 프로필·민트 색상), `58107c5` (투표 전환 상태 문구)
- **검증:** JS 소스 구문 및 HTML 인라인 스크립트 컴파일 검사, CSS 중괄호 구조 검사. **실제 브라우저 E2E는 미실행**. 사용자 수동 확인 필요: 로그인 후 9개 메뉴 왕복 → 아티스트 선택 후에도 메뉴 동작 → 축소 프로필 클릭/스크롤 → 검색어와 내 답장 및 ↑·↓ → 미디어 전체선택·선택 저장 → 분홍색 미잔존 확인. PWA·모바일·Windows Native LIVE 회귀 미검증

기존 `main`, `feature/glowme-uiux-phase3`, Draft PR #53을 변경하지 않음. 이 변경을 본 PR에 직접 합치지 말고 사용자 검증 뒤 Codex 인계 및 별도 통합 테스트 필요.


## 2026-10-31 Fromm Viewer 3 — Glow ME 미니멀 디자인 시험판

사용자 승인으로 **`experiment/glowme-phase3-chat-layout`에서만** 변경. `main`, 원본 `feature/glowme-uiux-phase3`, Draft PR #53, 인증·다운로드·재생 엔진, 공개 배포 모두 변경하지 않음. 되돌리기용 브랜치 `backup/glowme-phase3-before-minimal-ui-20261031` (시작점 `ffce5fd`) 생성.

사용자가 제공한 Glow ME 이미지만 유채색 레퍼런스로 사용:
- 밀키 민트 `#EAFBE8`, 라이트 그린 `#96E999`, 비비드 그린 `#3EEA34`, 아쿠아 `#64DC9F`, 하늘색 `#79D2F4`. 강한 연두는 넓은 면적에 사용하지 않고, 글자는 가독성 확보용 짙은 중립 녹색 허용.
- 기존 `glowme.css`는 다른 뷰의 안정성을 위해 보존, 새 `glowme-phase3-experiment.css` **마지막 override**로 실험 모드 상단 `.topbar`·사이드 `#sidebar` 물결 사진을 표시하지 않음. 두 영역의 `::before/::after` 물 효과도 해제하고, 단색 민트와 얇은 테두리만 사용. 기존 유리 흉내의 강한 하이라이트는 최소화.
- 기존 `.title-line`의 고정 높이 및 `overflow:hidden` 때문에 제목 상단이 잘릴 가능성을 줄이도록 `.artist-copy`, `#artistTitle`의 높이·줄 높이·정렬 조정.
- 축소 레일은 로고/9개 메뉴/아티스트 구획 간격을 조정, 아티스트 독립 스크롤과 실제 프로필 이미지 표시 구조 유지. 최초 화면의 프로필 8개는 eager 로딩해 초기화/가상화와 관계된 지연을 줄이도록 시도; 이미지 로드 실패 시 기존 이니셜 대체는 보존. **실계정 이미지 로딩 성공은 미검증**.
- 메뉴 클릭으로 DOM 포커스가 남아도 마우스가 사이드바 밖으로 나가면 닫도록 수정. 키보드 `:focus-visible` 상태에서는 레일 유지.
- `web-glowme-phase3-experiment.js`: 원래 `#selectedCount`, `#selectAllBtn`, `#saveSelectedBtn` 및 `#sortControls` DOM 요소/핸들러를 재사용하면서 한 개의 `.glowme-context-sort`에 배치. 우측 `#sortControls`는 항상 마지막 항목으로 남고 선택도구는 왼쪽에서 `max-width`/투명도 이동 애니메이션으로 확장. 실제 선택 개수가 0인 경우 저장 버튼 비활성 유지. 미디어/사진/영상/음성/Replay/Channel에서 선택 도구를, 기존 정렬이 노출되는 뷰에서는 최신순 정렬을 표시. 전체 대화에 실제 선택 항목이 있으면 선택 도구만 표시할 수 있음.
- 기존 하단 미디어 저장 플로팅 바는 제거(동일 노드의 위치만 바꿔 기능 재활용). `#scrollTopBtn`은 오른쪽 하단 독립 배치, 기존 스크롤 임계값/클릭 로직 유지. 검색 일치 ↑↓ 플로팅 독은 기존 동작 유지.
- Meapri Liquid Glass **Regular 엔진 미적용**. 기능·배치 완료 이후 최종 마감 단계에서 다시 검토.

관련 커밋: JS `33ea355`, CSS `ef5a78d` (최종 SHA는 브랜치 로그 확인).

**정적 확인 수행:** 변환 JS `new Function()` 구문 파싱 성공, CSS 중괄호 균형 통과. **실제 Chrome 화면, hover/클릭, 프로필 이미지 네트워크, 모바일, 스크롤 충돌, 접근성 및 기존 회귀 테스트는 미실행**. 사용자에게 동작 검증 완료로 안내하면 안 됨.

**다음 Codex/브라우저 수동 테스트:**
1. 1440px 데스크톱에서 제목 전체·상태문구·통계가 잘리지 않는지, 로고·민트 단색 헤더와 레일에 물 이미지가 남지 않는지 확인.
2. 사이드바 마우스 hover → 미디어 선택 → 커서를 본문으로 이동 → 축소 확인. Tab 키보드 초점 시만 열린 상태 유지, Escape 및 모바일 터치 동작 확인.
3. 실제 구독 아티스트 10명 이상 프로필(확장/축소/스크롤)의 이미지 로드 성공 및 에러 fallback 확인.
4. 사진/영상/음성/미디어/Replay/Channel을 오가며 최신순이 **오른쪽에 항상 남는지**, 전체선택·저장 기능과 카운트 반영, 왼쪽 확장 270ms 애니메이션 확인.
5. 스크롤 650px 이상에서 `#scrollTopBtn`이 우하단에 보이고, 저장 도구/검색 ↑↓와 겹치지 않는지 확인.
6. 390px 세로 모바일, 844×390 가로 화면, 축소동작 선호(`prefers-reduced-motion`), 브라우저 새로고침 후 새 CSS/JS가 적용되는지 확인. 리그레션 테스트 및 성능 측정 후 원본 Draft PR과 비교.

로컬 VS Code/Live Server에는 원격 실험 브랜치 업데이트가 **자동 반영되지 않음**. 브랜치 최신 코드로 pull한 뒤 `127.0.0.1:5500/index.html?previewBridge=1`에서 확인. 계정·토큰을 채팅이나 GitHub에 제출하지 말 것.


## 2026-10-31 재검증 사진 — 아티스트 없음 / 내비게이션 호버 떨림
사용자 새 시험판 ZIP 화면: 확장된 사이드 레일에 9개 메뉴와 '아티스트' 제목은 보이지만 목록이 비어 있음. 메뉴 상단에서 마우스 이동 시 선택 렌즈가 떨림. **아티스트 원인 미확정**: 인증/확장프로그램 연결/서버 요청 실패 또는 실제 방 목록 렌더 미실행을 브라우저에서 구분해야 함. 데이터가 없는 상황에서 샘플 아티스트를 실제 프로필처럼 생성하지 않음.

실험 브랜치 후속 변경:
- `web-glowme-phase3-experiment.js`: 메뉴 선택 렌즈 업데이트를 `pointermove` 기반 매 픽셀 광원·레이아웃 갱신에서 `pointerover/out` 기반 행 전환으로 축소. 실제 활성 메뉴 및 `:focus-visible` 키보드 초점 존중. hover 종료 시 활성 항목으로 복귀.
- 같은 파일: `#rooms`에 실제 `.room` 요소가 하나도 없으면 확장 사이드바에서 로그인/목록 상태 문구를 보여주고, 로그인 세션이 있을 때만 '목록 다시 불러오기' 버튼 제공. 버튼은 기존 `loadRooms()`를 호출해 원래 API/DOM 로직을 재시도하며 원본 클릭 핸들러와 저장된 계정 데이터를 건드리지 않음. 메시지는 `#rooms` 바깥에 배치해 기존 인덱스 기반 `selectRoom` 연결 보호.
- `glowme-phase3-experiment.css`: 부드러운 행 간 선택 표시 및 재시도 안내 스타일 적용. 강한 파동/광원 추적 효과 불사용. 접근성의 reduced-motion 존중.
- 새 화면 실제 렌더 및 네트워크 인증 테스트는 **미실행**. 브라우저에서는 1) 헤더의 로그인 상태 2) 로컬 Chrome 확장프로그램 정상 활성화 3) 같은 URL `127.0.0.1:5500/index.html?previewBridge=1` 4) 확장된 레일의 '목록 다시 불러오기' 클릭 결과 5) hover/click 시 선택 위치 흔들림 6) 선택 아티스트 사진 확인.
- 기존 ZIP 디렉터리 삭제/이동 시 unpacked Chrome 확장프로그램의 참조 경로도 사라질 수 있음. 설치된 확장 위치 유지 여부 확인.
- `main`, 원본 Draft PR #53, 배포, 기존 확장프로그램 소스 변경 없음. 최신 HEAD는 GitHub 브랜치에서 확인.

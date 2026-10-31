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

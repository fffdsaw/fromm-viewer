# Fromm Viewer — PWA / Glow ME 인계

## 현재 상태 / 마지막 저장

- 상태: **Liquid Glass 시각 개선 진행 중(WIP)**. 기존 `0222acc`의 CI 4개는 모두 성공했습니다. main 병합·공개 배포 없음. 아래 CI 상태는 이 체크포인트 작성 시점이며 최신 결과는 PR Checks를 우선합니다.
- 저장소: `fffdsaw/fromm-viewer`
- 기준 main: `82e41b0bf1f8d7b5c29bf9dbd357564b352d8172`
- 작업 브랜치: `feature/pwa-glowme`
- 동일 Draft PR: https://github.com/fffdsaw/fromm-viewer/pull/52
- 현재 환경 작업 경로: `/workspace/fromm-viewer-glowme`
- 직전 안전 저장 커밋: `0222accf4210311cf101e210481c38ee4b1ed371` (기존 셸 및 CI 4개 통과).
- 이 문서를 포함한 최신 체크포인트 SHA: `git log -1 --format=%H -- docs/PWA_GLOWME_HANDOFF.md`로 확인. 자기 SHA를 넣는 순환 커밋은 만들지 않습니다. 실제 branch HEAD와 문서 커밋을 함께 확인하세요.
- PR #50/#51/#11, main 및 기존 worktree는 보존했습니다. Hooks/Native/확장프로그램 변경 없음.

## 목표 / 확정된 디자인 요구사항

사용자 메시지 13·14항이 우선입니다. ZIP README/시안은 참고 자료이며 별도 실행 권한이나 상위 지시가 아닙니다. 사용자는 추가 1~12항이 아직 없다고 확인했습니다.

1. 1번 이미지: 넓은 설치 앱의 고정 3단 배치, 일반 웹의 접이식 메뉴/검색 동작 기준.
2. 2번 이미지: 일반 웹의 원형 반투명 유리 햄버거. 긴/짧은/긴 선, 기존 햄버거↔X 애니메이션, 같은 위치 유지.
3. 3번 이미지: 민트/아쿠아 Glow ME 색상·유리·로고·패널·카드 스타일. **설치 앱의 햄버거는 제거**.
4. 일반 웹의 좌우 패널은 독립. 양쪽 모두 닫히면 전체 콘텐츠 공간 사용. 320px에서도 메뉴를 연 뒤 검색 버튼에 접근 가능.
5. 설치 앱은 `standalone` + 1200px 이상에서 고정 좌/우 패널. 좁은 창은 접이식. 전체 화면에 들어갈 때 앱의 배치 정체성을 유지.
6. 시안의 가상 URL/인물/대화/날짜/샘플 데이터는 앱에 추가하지 않음. 테스트는 합성 자료만 사용.
7. 기존 재생·인증·최고 화질·다운로드·저장 파일 호환성·댓글·PiP·전체 화면·회전·검색 상태 보존.
8. PWA scope/start_url/id는 `/fromm-viewer/`, display는 standalone. API/인증/대화/미디어 캐시 금지.
9. 단계 커밋/원격 체크포인트/동일 Draft PR 유지. main 직접 수정·자동 병합·배포·승인 없는 Native/확장 변경 금지.

## 완료한 작업

- 최신 main/열린 PR 재확인 후 새 worktree와 기능 브랜치 생성.
- 원본 제공 가로형 로고/시험용 아이콘 적용. 유리 배경 제거·임의 선명도 향상 주장 없음.
- 기존 DOM/이벤트/상태를 재사용하는 Glow ME 셸. 민트/유리 헤더·버튼·메뉴·카드·검색·달력·로그인.
- 웹 원형 햄버거/X와 검색 버튼을 실제 헤더 슬롯에 고정. 메뉴/검색을 어느 순서로 열고 닫아도 다른 패널 상태 유지. 스크롤 후 위치도 검사.
- 넓은 설치 앱의 3단 배치 및 햄버거 제거. 좁아졌을 때 웹 패널 상태 복원.
- 기존 검색/달력 컨트롤을 실제 DOM 그대로 재배치. 비대화 화면은 검색 fieldset 비활성화로 재생을 방해하지 않음.
- 영상/오류/로딩/LIVE 스테이지 및 컨트롤은 기존 어두운 배경과 밝은 글자 유지. 영상 비율·크롭·화질 정책 변경 없음.
- 설치 manifest, 사용자가 누를 때만 실행하는 설치 안내 버튼, 경로 제한 SW 등록.
- 서비스워커: 정확한 공개 이미지 URL 4개만 캐시. HTML/JS/CSS/API/미디어/쿼리 URL/Authorization/Range/비GET 요청을 가로채지 않음. 강제 skipWaiting/새로고침 없음. 오프라인 앱을 제공한다고 주장하지 않음.
- 실제 정적 자산을 읽는 Chromium 검사, axe/캐시 검사, 기존 회귀 fixture/CI 연결, 수정 전후 스크린샷 생성.

## 수정한 파일

- `index.html`: manifest/favicon/theme-color/CSS/JS 링크, 고정 패널 UI 가드, 토글 위치, 패널 위치 계산 위임, 독립 메뉴 클릭 처리만 변경.
- `glowme.css`: 새 셸/민트·유리 스타일/반응형/플레이어 어두운 표면 보호.
- `web-glowme.js`: DOM 재사용, 메뉴 내 기존 라우트 호출, standalone/창 크기 배치, 접근성 상태, 명시적 설치 버튼.
- `manifest.webmanifest`, `web-pwa.js`, `sw.js`: 설치·정적 이미지 전용 캐시.
- `assets/glowme/`: 제공 로고/시험용 192·512·favicon32·참고 ICO 및 출처/제약 문서. **정식 maskable/16px 아이콘은 아직 아님**.
- `test/pwa.test.cjs`, `test/glowme.browser.cjs`, `test/helpers/shell-assets.cjs`: 새 안전성/실제 자산/셸 검사.
- 기존 `test/*.browser.cjs`: API fixture와 별도로 실제 새 CSS/JS를 읽게 연결. 확장 CORS 전용 fixture는 앱을 렌더링하지 않으므로 원본 유지.
- `test/helpers/player-controls-fade.cjs`: 강제 hover 대신 실제 노출 좌표로 검사.
- `test/my-replies.browser.cjs`: 메뉴 동작 후 열린 상태를 유지한 검색 패널을 불필요하게 다시 닫지 않게 검사.
- `.github/workflows/channel-videos.yml`: 자산/테스트 변경 감지, 전체 Git 이력(전후 화면 기준 필요), axe, 새 셸 및 설치 앱 모의 미디어 검사/스크린샷.
- 본 문서: 요구/체크포인트/실패 원인/재개 기록.

## 실행한 테스트 / 결과

로컬 명령은 Node 22 및 기존 Playwright Chromium, ffmpeg, axe-core 4.11.1 설치가 필요합니다. 이 환경의 node는 `/workspace/.fromm-env/node_modules/node/bin/node`, 의존 경로는 `NODE_PATH=/workspace/.fromm-env/node_modules:/tmp/fromm-ui-deps/node_modules`입니다. 새 환경에서 경로를 그대로 가정하지 마세요.

- `node --test test/*.test.cjs native-live/test/*.test.cjs`: **277/277 통과, 실패/스킵 0**. `AGORA_TYPES_PATH=/tmp/agora-462/package/types/Private/IAgoraRtcEngine.d.ts`를 제공해 SDK 타입 검사 포함. CI에서는 기존 SDK 미설치 항목이 skip될 수 있음.
- `node --test test/pwa.test.cjs`: **4/4 통과**(위 277에 포함). manifest/아이콘 크기·캐시 경계·인증/서명 요청 제외·자기 캐시만 정리.
- `GLOWME_SCREENSHOT_DIR=... node test/glowme.browser.cjs`: 통과. 웹 320/390/844/1440, 양방향 독립 패널, 스크롤 후 토글 위치, 모의 standalone 넓음/좁음/표시 모드 전환, Chrome manifest 파서, 명시적 설치 이벤트, 실제 HTTP SW와 공개 이미지 4개 캐시 확인. JS 오류/가로 넘침 없음.
- 위 검사 내 axe WCAG A/AA: 로그인390/메뉴390/설치 앱 대화1440 **위반 0**. 전체 제품·스크린리더 적합성 인증은 아님.
- `node test/ui-icons.browser.cjs`: 1440/390 통과.
- `node test/channel-player.browser.cjs`, `node test/replay-player.browser.cjs`: 각각 12개 뷰포트의 실제 로컬 MP4 가로·세로 재생/탐색/컨트롤/목록 복귀 통과.
- `GLOWME_INSTALLED_MODE=1 node test/channel-player.browser.cjs`, 같은 Replay 명령: 설치 앱 배치 모의 모드에서 동일 MP4 검사 통과. 물리 Chrome 설치를 뜻하지 않음.
- `node test/player-settings.browser.cjs`: PC/모바일 설정·회전·재생 상태·페이드·터치 유지·전체 화면·축소 모션 통과.
- `node test/video-quality.browser.cjs`: 1920/1440/1366/390/844의 실제 합성 HLS 최고/수동/단일 화질·상태 유지 통과.
- `STARTUP_RUNS=1 node test/video-startup.browser.cjs`: 기존 보통/느린 네트워크 시작·재개/요청 회귀 검사 통과. 이번 디자인 작업의 전후 성능 향상을 주장하지 않음.
- `node test/channel-videos.browser.cjs`: 내비게이션/탭·필터·선택/오류/로그아웃/Replay·LIVE 분리 통과.
- `node test/video-list-autoload.browser.cjs`: 페이지 추가·중복/스크롤/선택/아티스트 변경/로그아웃 통과.
- `node test/direct-selection.browser.cjs`, `node test/selection-gestures.browser.cjs`, `node test/media-bulk-save.browser.cjs`: 선택·기존 파일/이름·저장 통과.
- `node test/live-ui-pip.browser.cjs`, `node test/native-diagnostics.browser.cjs`: 합성 LIVE 컨트롤/프레임/PiP/복귀·정리 통과.
- `node test/live-chat-probe.browser.cjs`, `node test/live-chat-probe-extension.browser.cjs`: 합성 댓글 및 실제 로컬 TLS/CORS/DNR/POST·ACK 통과. 프로덕션 확장 규칙 원본 사용.
- `node test/votes.browser.cjs`, `node test/my-replies.browser.cjs`: 투표/검색·답장·날짜·오류·계정 전환 통과.
- `git -c core.whitespace=cr-at-eol diff --check`: 통과.
- 기준 main과 HLS/저장/연결/기존 라우트 핵심 14개 함수 및 Native/확장/LIVE 보조 JS 동일성 확인. UI 가드 외 핵심 로직 변경 없음.

## 실패 기록 / 해결

- 초기 fixture의 없는 renderRooms 호출: 테스트 seed 수정, 해결.
- 첫 CI: 새 JS 요청에 fixture가 HTML을 반환해 `Unexpected token '<'`. 실제 자산 helper 연결 후 로컬 해결.
- 다음 CI: shallow checkout에 기준 main 객체가 없어 수정 전 화면 생성 실패. browser checkout을 fetch-depth 0으로 수정.
- 새 공통 input 스타일이 seek 배경을 덮음: selector 우선순위 수정, 실제 화면에서 4px 트랙 확인.
- 로그인 고급 옵션 대비 2.45:1: 민트 테마용 진한 텍스트로 수정, axe 재검사 통과.
- LIVE 검정 스테이지가 밝은 셸의 진한 글자를 상속: 어두운 스테이지 전용 토큰 적용, 밝은 글자 회귀 검사 추가.
- LIVE 페이드 강제 hover가 sticky 헤더 뒤를 가리킴: 실제 노출 지점으로 검사, 재실행 통과.
- 답장 검사에서 이미 열린 검색을 다시 닫음: 독립 패널 정책에 맞게 조건부 열기, 재실행 통과.
- 로컬 확장 preflight 검사: 불필요한 Playwright route가 실제 OPTIONS에 간섭. 앱 자산 연결이 필요 없는 확장 fixture를 원본으로 복원, 실제 OPTIONS/POST/ACK 재실행 통과.
- 스크롤 직후 토글 좌표 비교: scroll 이벤트/rAF를 기다리게 수정. 기존 메뉴 top clamp도 새 셸에서는 적용하지 않아 고정 위치 유지.
- 설치 앱에서 메뉴를 고정하면서 일반 웹의 저장된 메뉴 설정을 덮는 문제: pinned 상태에서는 기존 SIDEBAR_STATE_KEY를 쓰지 않게 수정하고 회귀 검사 추가. UI 설정만 취급하며 인증 저장은 변경하지 않음.
- 원격 CI(489ead9) 마지막 투표 검사에서 최초 innerText가 빈 문자열: 기존 `.msg {content-visibility:auto}`의 첫 화면 그리기 전에 즉시 읽는 검사였음. 실제 카드로 스크롤하고 화면의 문구가 나타날 때까지 기다리도록 수정. 문구/기존 추가 요청 0 검증은 유지. 일반 실행과 CPU 6배 저속 모의 실행 모두 1440/390 통과. 투표 앱 구현은 변경하지 않음. 같은 CI에서 이전 영상·화질·LIVE·PiP·댓글 검사는 통과.
- 현재 알려진 로컬 차단 실패: 없음. 최종 원격 CI 결과는 PR Checks에서 확인 필요.

## 남은 작업 / 직접 검증 / 위험

- 진행 중: 이 체크포인트 commit의 GitHub CI. 이미 성공한 로컬 검사를 이유 없이 반복하지 말고 실패한 step만 우선 조사.
- 미시작(실기/사용자 검토): 실제 Chrome 설치·업데이트·독립창·OS 아이콘, 물리 모바일/iOS/Safari, 실방송/실인증 Replay·Channel, Native/확장 연결 및 실제 파일 저장.
- 프로토타입 아이콘: 원본 해상도/작은 favicon/Windows ICO 품질과 정식 maskable 안전 영역은 디자인 검토가 남음. 현재 `purpose:any`이며 maskable이라고 오인시키지 않음.
- API/미디어/앱 HTML을 오프라인 캐시하지 않으므로 네트워크 없이 새 대화를 여는 기능은 제공하지 않음.
- 공개 아트워크를 바꾸면 `sw.js` CACHE_NAME도 갱신할 것. 재생 중 강제 reload/skipWaiting/clients.claim을 추가하지 말 것.
- PR #51 접근성 개선은 미병합 별도 작업. 이번 브랜치에 전체를 임의로 합치지 않았음. 나중에 두 PR을 통합할 때 공통 UI 부분을 비교해야 함.
- 기존 전체 서비스 접근성/실기 동작까지 모두 검증했다고 보고하지 말 것.

## 다음 세션에서 가장 먼저 할 일

1. GitHub `feature/pwa-glowme`와 **기존 PR #52** 상태를 확인. 브랜치를 찾지 못하면 대체 브랜치 생성 전에 복구 가능 여부 보고.
2. 이 문서, `git status --short`, `git log -5 --oneline`, PR 최신 HEAD/Checks를 대조. 저장된 변경을 덮어쓰지 말 것.
3. 최종 CI가 성공이면 구현/검사 반복 없이 사용자 디자인 검토와 위 실기 미검증 항목만 정리. 실패하면 해당 step 로그만 읽고 필요한 부분 수정·검사·체크포인트.
4. 새 main이 생겼어도 변경 차이를 먼저 분석. 무조건 reset/merge하지 않음. 같은 브랜치/같은 Draft PR에서 계속.
5. main 직접 수정·자동 병합·공개 배포·승인 없는 Native/확장 변경·Hooks 활성화 금지.
6. 끝나거나 중단할 때 브랜치·PR·실제 최신 SHA·완료/실패/미검증·다음 순서를 보고.

## 단계 기록

- `be09944`: 요구사항/복구 문서 초기화 후 원격 저장.
- `e75e04f`: PWA 설치/공개 이미지 전용 캐시, 4개 테스트 통과.
- `d8b21af`: Glow ME 셸/독립 패널, Node 277 및 1차 실제 자산 브라우저 검사.
- `c17ebb7`: 미디어/실제 자산/접근성 회귀/CI 연결.
- `6c4f3a3`: 양방향 패널 접근/스크롤 고정/전체 화면 배치 보호, 실기·아이콘 제약 기록.
- `489ead9`: 설치 앱이 일반 웹의 메뉴 저장 상태를 변경하지 않도록 보호.
- 현재 문서 포함 checkpoint: 투표 카드 첫 화면 렌더링 대기 검사 보강. 최신 CI는 PR Checks 확인.

민감정보(인증 토큰·비밀번호·계정·개인 대화·API 응답)는 문서/로그/스크린샷에 기록하지 않습니다. 화면 증거는 합성 자료만 사용합니다.


## Liquid Glass 후속 요청 — 시작 체크포인트

- 사용자 요청: 기존 기능/웹·앱 배치를 그대로 유지하며 실제 물 같은 반사·굴절·두께 표현을 강화. 새 PR/main 병합/배포 금지. 기존 PR #52와 feature/pwa-glowme만 사용.
- 기준: `0222accf4210311cf101e210481c38ee4b1ed371`. 기존 CI 4개 성공 확인, 작업 트리 깨끗함 확인.
- 시각 분석: 현재 거의 불투명한 밝은 민트 면/균일 1px 선/대칭적 약한 그림자로 깊이 부족. 목표는 비균일 반사 띠, 밝은 내측 모서리와 어두운 굴절 테두리, 볼록한 버튼의 위·아래 반사광. 텍스트 뒤의 거친 무늬와 대화 영역의 과장된 효과는 피함.
- 계획: 헤더(강한 물결/원본 생성 광학 텍스처), 사이드바(두꺼운 가장자리/반사), 활성 버튼(볼록한 광택), 검색/달력(약한 유리/불투명한 입력 표면), 본문·영상(기존 가독성/화면 유지).
- 공식 앨범아트/로고 복제 금지. 기존 사용자가 제공한 로고·PWA 아이콘은 변경하지 않음. 새 재료 텍스처는 독창적인 추상 물/유리 소재로 제작하며 UI/인물/글자를 넣지 않음.
- 진행 중: 전후 동일 크기/상태 캡처 및 정적 재료 텍스처 준비. 변경은 CSS/정적 장식 자산/검사/인계 문서 중심. 인증·수신·재생·저장/PWA 제어 JS는 수정하지 않음.
- 미시작: 재료/테두리 적용, 전후 시각 재검토, PC 웹/모의 설치 앱/모바일·가독성/성능 검사, 필요한 회귀/최종 CI.
- 기존 실기 미검증 범위는 유지. CSS는 실제 광선 추적이 아니므로 광학 굴절을 정적 재료와 경계 반사로 근사하며 이를 실제 실시간 굴절 엔진으로 주장하지 않음.


### Liquid Glass 재료 체크포인트 — WIP

- 독창적인 추상 물/유리 재료 생성 후 `assets/glowme/liquid-header.webp` 1600×600 / 61,810 bytes로 웹 전송용 인코딩. 공식 앨범아트/로고 복제 없음. 기존 로고/아이콘 변경 없음.
- `glowme.css`: 헤더 광학 소재, 안팎 테두리 반사, 사이드바 내측 가장자리, 활성 버튼 곡면 하이라이트. 본문/영상/기능 JS는 그대로.
- 1차가 너무 짙고 복잡한 헤더여서 밝고 청량한 베일 및 곡면 반사로 재조정. 모바일 dimmer가 유리 뒤를 회색으로 물들이지 않게 유리 바깥에만 적용.
- `test/liquid-glass.browser.cjs`: 같은 데이터/크기의 0222acc CSS와 현재 CSS 비교, 5개 화면 상태 레이아웃 동일성/장식 1요청/배경 픽셀 대비/3회 스크롤 측정. 테스트 자산 서버 WebP 지원 및 CI 연결.
- 320px 안내문 대비 3.96:1 발견 → 글자색 조정 후 샘플 최저 4.81:1. 모든 5개 화면 비교 통과. 초기 가로 화면의 최소 라벨 개수 검사만 실제 노출 영역에 맞게 수정; 실제 대비 기준 4.5:1 유지.
- `test/glowme.browser.cjs`: 최종 5개 뷰포트/독립 패널/PWA 기본 동작/axe 통과.
- Node 전체 277/277 통과(실제 Agora 타입 포함), 실패/스킵 0.
- **미해결 성능:** 첫 3회 측정에서 웹/모바일은 16.7ms 유지, 고정 앱은 16.7→33.3ms. 새로 추가한 고정 사이드바/검색 패널 블러로 의심. 다음 단계: 고정 배치에서는 불필요한 블러 제거, 전후 재측정. 이 WIP를 최종 성능 검증 완료로 보고하지 않음.
- 설치 앱은 standalone 모의 렌더링으로 확인. 임시 프로필의 실제 설치를 CDP로 시도했으나 제공 Chromium에서 `PWA.install` 프로토콜이 없어 수행 불가. 우회/다른 도구 설치 없음. 실제 OS 설치/물리 기기 검증은 기존 미검증 유지.
- 현재 증거: `/tmp/fromm-liquid-final/`, `/tmp/fromm-liquid-round1/`, `/tmp/fromm-liquid-round2/`. 출력은 합성 자료만 포함.

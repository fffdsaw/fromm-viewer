# Glow ME UI·UX 3차 — 재개 기록

## 현재 체크포인트
- 기준 main: `552bc556d8eaacbcc589cb9bfabab6383b9d4dba` (2026-10-31 원격 재확인; PR #52 병합 완료).
- 브랜치: `feature/glowme-uiux-phase3`; 작업 경로 `/workspace/fromm-viewer-phase3`.
- Draft PR: https://github.com/fffdsaw/fromm-viewer/pull/53 (Draft, 동일 PR 유지).
- 마지막 원격 완료 커밋: `e1a5540053cb4e75a19d2ed4a0ad717fe7b0ad74` (2차). 이 문서를 포함한 체크포인트는 `git log -1 --format=%H -- docs/GLOWME_PHASE3_HANDOFF.md`와 실제 HEAD를 함께 확인. 자기 SHA를 넣는 순환 커밋을 만들지 않음.
- 상태: P1·1차·2차 저장 완료. 3차 기본 구현·시험 적용 저장 완료 / 4차 최종 검증 진행 중. 아래 최신 기록 우선.

## 목표와 경계
- #EDF8F0 배경 / #94D9C4 물결 / #428E7A 강조 / 흰 반사광. 민트·그린의 자연스러운 Meapri Regular 유리. 상대 실험값을 CSS에 그대로 복사하지 않음.
- 좁은 플로팅 레일 → hover/키보드/터치 확장. 본문 밀림·어두운 backdrop 없음. 9개 탐색 고정, 아티스트만 독립 스크롤. 낮은 화면은 메뉴를 그리드로 구성.
- 프로필·아티스트 이름·실데이터 통계 헤더. 그룹명·중복 탭/통계 제거. 필수 LIVE/토큰/새로고침/로그아웃 유지.
- 대화 화면 전용 검색/달력/답장 패널, 아티스트·필터별 스크롤 복원, 실제 선택이 있을 때 저장 도구, 모바일 터치 및 초점 개선.
- 정적 번들·라이선스 보존, 작은 표면에 굴절 제한. 비지원/접근성 대체 효과, 영상/대형 목록에는 굴절 없음.
- 인증·수신·HLS/화질·다운로드·Native·확장 코어 보존. Hooks 변경 금지. 새 브랜치의 동일 Draft PR만 사용. main 병합/공개 배포/기존 PR 병합 금지.

## 기존 PR 중복
- #50 OPEN: Impeccable 스킬/설정/Hooks 설치. 이 브랜치로 병합하지 않음. 기존 별도 worktree의 스킬만 사용 가능.
- #51 OPEN (`8bbacbf`): index.html의 모바일 터치/카드 접근성/탭 ARIA/플레이어 배치와 일부 검사 변경. 이번 작업의 터치/초점 영역과 충돌 가능. 통째로 가져오지 않고 현 main에서 요구사항을 독립 구현; 후속 병합 시 해당 UI hunk 수동 비교 필요.
- #52 MERGED: 기존 브랜치/인계 기록은 과거 증거로 보존, 새 변경 추가하지 않음.

## 단계·검증 기록
1. P1: 인용문 대비 및 로그인 모달 focus/inert — 진행 예정.
2. 1차: 레일/아티스트/헤더/겹침/Meapri 시험 — 미시작.
3. 2차: 검색/스크롤/선택/터치 — 미시작.
4. 3차: 유리/투표/보조 스타일 — 미시작.
5. 4차: 실제 Chromium 비교, 회귀/성능/Impeccable — 미시작.
- 테스트: 기존 검사는 기준 기록만 확인했으며 새 코드에 대해 아직 실행하지 않음. 실패 없음(미실행).
- 미검증: 실제 인증 서버·실방송·Windows Native/확장 연결, 물리 모바일/iOS, Windows Edge/macOS Safari, OS PWA 설치/업데이트, 실제 GPU 사용량.
- 스크린샷/측정은 합성 데이터만 사용. 토큰·계정·개인 대화 저장 금지.

## 다음 세션 시작 순서
1. 원격 브랜치/동일 Draft PR 확인 → 이 문서 → git status/log/diff 대조.
2. 마지막 완료 단계/테스트를 반복하지 말고 진행 중 항목부터 재개. main 변경은 차이 분석 후 판단.
3. 단계마다 테스트·문서·커밋·푸시. 실패/미완성 체크포인트는 WIP 명시.

재개 프롬프트: `fffdsaw/fromm-viewer의 feature/glowme-uiux-phase3와 기존 Draft PR에서 docs/GLOWME_PHASE3_HANDOFF.md를 읽고 마지막 체크포인트부터 이어서 1~4차 구현·검증을 완료해 줘. 기존 변경 보존, 새 PR/기존 PR 병합/main 병합/공개 배포/Hooks·Native·확장 변경 금지.`

## P1 체크포인트
- `web-ui-a11y.js`: 로그인 gate의 dialog 의미/초기 초점/Tab 순환/배경 inert/복귀. `index.html`은 UI 표시 함수에서 동기화 및 스크립트 연결만 변경. 인증·토큰 흐름 동일.
- `glowme.css`: 인용 원문 #244c42. 보수적인 밝은 배경 #d2e6dc 대비 계산 및 실제 Chromium computed color 확인.
- `test/glowme-phase3-a11y.browser.cjs`: 390px 초기 초점·양방향 Tab·재개방/복귀·inert 해제·인용 대비·로그인 axe 통과. 로그 `/tmp/fromm-phase3/p1.log`.
- 다음: 플로팅 레일/헤더/독립 스크롤, Meapri 소형 컨트롤 시험.

## 1차 레이아웃 체크포인트 (2026-11-04 재개)
- `/tmp` 파일은 실행 환경 갱신으로 사라짐. 추적 파일/커밋은 보존되었으며 최신 원격은 여전히 main 552bc55 / Draft #53. 새 증거는 `/workspace/scratch/fromm-phase3/`에 기록. 이전 검사를 완료했다고 새로 주장하지 않음.
- `web-glowme.js`: 9개 고정 탐색 레일, hover 지연/터치/키보드/Escape, 아티스트 프로필·독립 스크롤, 실제 데이터 헤더, 중복 상단 탭 제거. 넓은 PWA도 레일 정책 사용, 대화에서만 오른쪽 검색 고정.
- `index.html`: 셸 초점/헤더/탐색 연결만 추가. 인증·영상·다운로드 코어 미변경. 헤더는 문서 흐름을 사용하여 유리 모서리 아래 비침 제거. 창 스크롤 기반 날짜/미디어 이동을 유지하며 불투명 마스크/사진 클리핑을 추가하지 않음.
- `glowme.css`: 고정된 좁은 레일/겹쳐 확장/낮은 화면 3×3 탐색/남은 아티스트 공간. 민트·그린 헤더, 실 통계. 단순 색상 모의가 아닌 Meapri Regular SVG 굴절은 현재 레일 토글/검색 버튼에만 시험 적용.
- `vendor/meapri/`: MIT LICENSE 및 출처/재현 빌드 기록. 고정 upstream 1613f831. ESM/Worker 정적 자산. WebGL/backdropSource/인증 콘텐츠 캡처 없음. SW의 공개 이미지 allowlist는 유지, 엔진을 오프라인 캐시한다고 주장하지 않음.
- `web-glass.js`: 2개 소형 컨트롤, balanced 단일 굴절·색수차0, 감소 모션/투명도/고대비/숨김 문서 제외. 브라우저 fallback 유지.
- `test/glowme-phase3.browser.cjs` + fixture: 실제 HTTP Chromium 320/390/844×390/1440/설치 배치 모의 통과. 본문 너비 불변, 9개 메뉴, 아티스트 스크롤 복원, 키보드 진입/복귀, 실제 SVG filter 적용, 모션 감소 해제 확인. 가로 넘침/JS 오류 없음.
- P1 재검증 통과: 새 레일 초기 inert 상태가 로그인 복귀를 막던 문제 수정. quote 7.36:1 계산/로그인 axe 0.
- 화면 `/workspace/scratch/fromm-phase3/layout-*.png` 확인. 초기에 기존 CSS 고정 height가 헤더 통계를 잘랐고 hidden span이 아이콘을 밀었음 → auto height/접힌 span display:none으로 수정 후 재촬영.
- 다음: 2차 스크롤 복원/실 선택 도구/검색 초점·가로 터치. 기존 브라우저 검사의 삭제된 중복 탭 selector는 새 레일로 갱신 필요(기능 기대는 유지).

## 2차 탐색·스크롤 체크포인트
- 1차 Node 회귀: 277 중 276 통과/실패0/skip1 (실행 환경 갱신 후 Agora 타입 파일 미설치). 이전 실 SDK 검증을 이번 실행으로 주장하지 않음.
- `web-view-state.js`: 아티스트/필터별 메모리 전용 위치(최대120), 페이지 변경과 재렌더 연결, 충분한 갤러리 배치를 준비한 후 복원, 긴 대화는 기존 renderChatWindow 재사용. 날짜·검색 결과/사용자 휠·터치/키 입력이 비동기 복원보다 우선. 계정 초기화 시 삭제, 메시지 내용 저장 없음.
- 원인: 전체 대화 재진입 autoTop과 DOM 재생성, 갤러리 첫 배치가 짧아 저장 위치가 바닥으로 clamp됨. 위치가 도달 가능할 때까지 기존 append를 재사용하며 무조건 scrollTo 차단하지 않음.
- 대화 전용 검색/날짜/답장 통합, Escape 초점 복귀. 실제 선택 시에만 일괄 도구를 겹쳐 표시해 본문 이동 방지. 아티스트 변경의 기존 선택 초기화 유지.
- `glowme.css`: 가로/터치 플레이어 버튼44px 목표와 탐색/음량28px 입력영역, 표시 트랙4px 유지. 작은 화면 컨트롤 줄바꿈. 날짜·검색 강조 민트. 영상 원본 비율/검정 배경 유지.
- Chromium 1440/390 필터 왕복: 대화1800→1800, 사진1200→1200, 선택 도구/날짜·검색/초점 검사 통과. `/workspace/scratch/fromm-phase3/navigation.log`.
- 기존 Channel 12개/Replay 13개 뷰포트 가로·세로 MP4 디코딩/컨트롤/목록 복귀 통과(터치 입력영역 최종 CSS 후 조작 회귀는 4차에서 재확인). 로그 channel.log/replay.log.
- 기존 검사 클릭 경로만 새 레일 helper로 변경. 삭제된 상단 중복 탭 대신 실제 레일 내비게이션을 검증. 모든 핵심 재생/저장 assertions 유지.
- 다음: 3차 제한된 Meapri 확대/투표/색상·테두리 정리 후 4차 전체 회귀 및 화면·성능 비교.

## 중단 작업 복구 (2026-11-04)
- 로컬 HEAD/원격 e1a5540, main 552bc55, Draft #53 재확인. 7개 파일 미커밋 변경을 보존하고 `/workspace/scratch/fromm-phase3/recovered-e1a5540.patch`로 별도 저장.
- 최신 디자인: 헤더·사이드바의 복잡한 물결 텍스처 제거. 차분한 민트/아쿠아 단색·최소 그라데이션, 소형 컨트롤에만 Meapri Regular. 이전 물결 중심 요구보다 우선.
- 복구된 변경: Meapri 최대 5개 작은 컨트롤, 투표/보조 글자/스크롤바, 실제 헤더 통계 재동기화, 카드 선택 버튼을 독립시킨 접근성 개선, 최신 레이아웃에 맞춘 PWA 검사.
- CI e1a5540 실패: 기존 glowme.browser의 분리형 중간 탭 바 전제. 최신 설계에서는 중복 탭이 제거되어 해당 기대가 무효. 새 레일·가변 선택 도구·실제 320px 기하/접근성/PWA 검증으로 대체하며 기능 검사는 유지. 로컬 PWA+axe 통과.
- 추가 브라우저 회귀: ui-icons, video-list-autoload, channel-videos, direct-selection, media-bulk-save, live-ui-pip, native-diagnostics, live-chat-probe, background-media, video-quality 통과. selection-gestures(드래그), votes(스크롤바 기대), my-replies(이전 파란색 기대), video-startup(썸네일 요청 상한) 실패 분석 중.
- 아직 미완료: 최신 미니멀 스타일, 4개 회귀 원인 해결, 전후 화면/성능 비교, 최종 Node·브라우저·CI 및 Critique, 체크포인트 푸시.
- `/tmp` 이전 결과 대신 `/workspace/scratch/fromm-phase3` 로그를 사용. 실제 서버/Native/물리 모바일/OS 설치 PWA/GPU는 미검증.

## 2026-11-05 복구 WIP 체크포인트
- 마지막 완료 원격은 e1a5540. 이 체크포인트는 3차 미커밋 구현을 보존하는 WIP이며 최종 검증 완료가 아님. main/PR50/PR51 미변경.
- 복구 확인: 헤더 물결 제거, 저사양(메모리/코어 2 이하) Meapri 대체 표현, 선택 도구 별도 오버레이(정렬바 위치 보존), 독립 선택 버튼으로 중첩 인터랙션 해소, 아티스트 lazy 이미지 DOM 삽입, 날짜 이동 12프레임 이내 보정과 사용자 입력 취소.
- 추가 실제 결함: 모바일 검색 패널이 좁은 레일을 가려 `my-replies` 미디어 전환 클릭 실패. 다음 수정 대상. 날짜 1440px 검사는 수정 후 통과.
- 완료 검사: Node 277 중276 통과/skip1/실패0 (마지막 날짜 보정 이전 실행); votes, thumbnail startup(8조건), selection gestures(데스크톱/모바일), phase3 5개뷰포트 및 저사양/Safari-UA 대체, navigation 1440/390, P1 대비/초점, PWA/axe. 로그는 `/workspace/scratch/fromm-phase3/`에 보존.
- Chromium 전후 1440/390/844×390/PWA 모의 캡처와 3회 비교 스크립트 추가. 마지막 프로필/날짜 수정 이전 캡처는 최종 증거로 사용하지 않고 재촬영할 것. 예비 측정은 visual/metrics.json.
- Impeccable A는 사용량 한도 오류로 미완료. B는 critique-b/detect.raw.json 등 중간 파일만 존재; 완성된 dual-agent 보고서 없음. CLI 결과 유효성 확인 후 재사용하고 A/브라우저 증거를 마무리할 것. Hooks 미변경.
- 다음: 검색 패널-레일 겹침 수정 → my-replies/접근성 → 최종 화면/성능 → Impeccable → 영향받은 회귀 및 정확한 HEAD CI → 최종 문서·동일 Draft53 업데이트.

## 3차 기본 구현·시험 적용 체크포인트 (2026-11-05)
- 이전 WIP 보존 커밋: `9efcd638507b9646a9042f74d285a3621b1bfbbb` (원격 푸시 확인).
- 모바일 검색 패널이 항상 좁은 레일 오른쪽에 머물도록 최대 폭 제한. 펼친 레일은 검색 패널 위에서 조작 가능. 겹침 없는 레일 접근 검사를 추가.
- my-replies 전체 검사 1440/390 통과: 3000개 대화, 날짜 첫 행, 원문 이동, 검색/달력/답장 문맥, 재시도/로그아웃 늦은 응답. phase3 320/390/844×390/1440/PWA 모의 및 PWA/axe 재검사 통과.
- Node 최종 277 중276 통과/skip1/실패0. skip은 Agora SDK 타입 미설치; 실제 Native 검증 아님.
- `docs/design-review/glowme-phase3/`에 기준 main/현재 코드의 동일 데이터·크기 실제 Chromium PNG 12개 저장. 마지막 프로필/날짜/모바일 검색 패널 수정 반영. 합성 대화·영상만 포함.
- 인증·HLS·화질·저장 핵심 함수16개와 Native/확장/기존 LIVE 연결 파일이 main과 동일함을 확인. UI 상태 연결·날짜 화면 보정만 변경.
- 4차 진행 중: 독립 Impeccable A/B 재개(기존 B CLI는 재사용), 플레이어 최종 조작 및 정확한 HEAD CI, 최종 3회 성능 측정. 이전 성능 로그는 프로필 수정 전이므로 잠정치로만 보존.
- 다음 시작: 현재 git status/PR53 확인, 4차 검사 결과 수합. 1·2차를 재구현하지 말 것. 미검증 환경은 기존 목록 유지.

## 4차 실제 결함 수정 체크포인트
- 이전 안전 커밋: `9afb22c562022fe77586f1af5cf7c3f1f62639da`. 실제 전후 PNG 저장 완료.
- **Meapri Regular는 제한적 시험 적용이다. 4차 검증 완료는 엔진 최종 본격 적용·시각 마감 완료를 뜻하지 않는다. 해당 시각 마감은 별도 후속 작업으로 남긴다.**
- 독립 Impeccable A/B 평가 완료. A 초기26/40: 검색 결과 화살표 가림, 숨겨진 기록 중단 안내(P1), 가로 달력 노출/중복 아이콘(P2). B: CLI36건 재사용, 3화면 HTTP overlay 성공, axe 확정 위반0이나 incomplete 존재; 실제 빈 상태/미디어 없음 대비2.0/2.3:1 확인. 보고서는 design-review 아래 보존.
- 수정: 검색 중 이동 컨트롤은 열린 검색 패널 내부로 이동, 닫히면 플로팅 복귀; 기록 중단/로딩 안내 표시; 가로 달력 열기 시 첫 날짜가 보이도록 패널 내부 스크롤; 9개 메뉴 SVG 구분; 빈 상태/파일 없음 텍스트를 #48675e로 수정. 데이터 검색·날짜 의미·재생 코어는 유지.
- 새 review 검사 320/844/PWA1440의 실제 화살표 클릭, 상태 안내, 대비4.5이상, 달력 노출 통과. my-replies 1440/390 전체 통과. phase3 휠 경계 격리·레이아웃, navigation 통과.
- 9afb22c CI 실패는 레일 닫힘 200ms 애니메이션 도중 폭을 읽은 테스트 경쟁 상태. 실제 축소 완료 조건을 기다리도록 수정하고 동일 기하 조건 유지.
- 플레이어 설정 전체(1440/390/844)와 기존 확장프로그램 로컬 TLS/POST/ACK/CORS 경계 검사 통과. 실제 Native/서버 연결 통과로 해석하지 말 것.
- 남은 4차: 수정 후 최종 PNG/3회 성능 비교/최신 HEAD CI. 기존 인증·LIVE·저장 핵심 보존 검사는 유효. main 병합·배포 금지.

# PC three-panel layout — 승인 범위

- 브랜치 `feature/pc-three-panel-layout`, 기준 main `6dad252c93a13d1f918529a082f332b579a67085`.
- 사용자 검토 후 오케이 승인: PC 고정 full-height 사이드바, 아티스트 헤더 76–84px, LIVE/Replay/Channel 전용 56–64px 헤더, 기존 도구 줄에 선택 캡슐, 민트 위계.
- **이번 승인에는 버전 번호 변경·main 병합·공개 배포가 포함되지 않는다. 이전 자동 병합 승인보다 이 제한이 우선한다.** React/새 의존성/엔진 개편/모바일 개편 없음.
- 현재 web-glowme.js / glowme.css만 제품 코드 수정. index.html, 버전 query, 인증·저장·영상·Native·확장은 변경하지 않음.
- 원래 필터/개수/새로고침 DOM과 이벤트를 PC 헤더로 옮긴다. 목록 renderer 진입 전 원위치에 돌려 기존 incremental patch/이벤트 바인딩을 보존한다. 선택 컨트롤은 재사용하며 복제하지 않는다.
- sidebar top12/bottom12, 브랜드 행 높이 고정. header는 sidebar 오른쪽. PC 전용 CSS/기존 breakpoint 사용. 모바일 DOM/배치는 유지.
- 미디어 도구 줄은 48px, collection 헤더 60px. 목록 위치를 움직이는 여백 애니메이션 없음. 캡슐 enter180ms/exit140ms, 4px, inert/초점 복귀, reduced motion 지원.
- 로딩 상태/오류는 기존 state에 연결. 진행 상태에만 spinner. 완료 시 숨김. PC 통계 줄을 높이 고정해 버튼 이동 방지. 기존 요청 generation/cancel 로직 보존.
- 로컬 PC1440,900,760 새 UI 검사 중: 각 모드 높이/사이드바 안정성, 선택·해제 시 카드/다운로드 위치, 숫자 자릿수/재선택/필터 핸들러/목록 재렌더/스크롤/로딩·오류 확인. 900/760 통과. 모바일390 대화·미디어 넘침/헤더 기본 검사 통과.
- Node 전체 281 중 280 pass, 1 skip(Agora 타입 미설치), 0 fail.
- 기존 geometry 검사는 새 승인 구조(rail beside header / capsule inside header)에 맞게 갱신하며 기존 조작/포커스/캐시/재생 검사는 보존.
- 증거/로그 `/workspace/scratch/fromm-pc-layout/`. 수정 전 화면은 `fromm-viewer-list-polish`의 이전 정상 코드와 동일한 합성 데이터/뷰포트로 촬영. 실제 계정/대화/토큰 사용 안 함.
- 다음: 변경된 geometry 검사와 필수 CI → 실제 화면 재확인 → 인계/스크린샷/PR 갱신. 병합·배포 금지.

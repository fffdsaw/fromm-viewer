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


## 로컬 검증 완료 체크포인트

- 구현 체크포인트 `4e54fc1`은 원격 저장 완료. 후속 PC CSS 수정: 커서 추적 중 배경 하나만 표시, 펼친 레일 z-index500으로 헤더480 위에서 조작 가능.
- 새 PC 검사: 1440 / 900 / 760 px에서 대화·미디어·Replay·Channel·LIVE, 선택 전후/스크롤/숫자 자릿수/연속 선택해제/초점/필터 이벤트/로딩·완료·오류·room generation 변경 통과.
- 영향받는 브라우저 검사 8개 통과: conversation-header-rail, media-action-dock, unified-actions, desktop-startup-reply-lists, glowme-phase3-navigation, glowme-search-dock, channel-videos, pc-layout. 처음 실패했던 hover의 중복 배경 및 펼친 레일 가림은 CSS 수정 후 재실행 통과. 예전 레이아웃 좌표 assertion은 승인된 새 구조와 실제 sticky header inset으로 갱신했고, 조작/스크롤/초점 검사는 유지.
- PC 전체 대화 axe WCAG2A/AA·2.1AA 자동 검사 위반 0. 접근성 자동 검사만으로 전반적인 실사용 접근성을 보증하지 않음.
- 모바일 최소 확인: 390px 대화·미디어의 기존 헤더/기본 조작/넘침 확인. 기존 필수 Channel 회귀 검사의 모바일 기본 사례도 통과. 모바일 디자인 변경 없음.
- 상태 검증은 합성 데이터 및 로딩/오류 상태, 기존 요청 generation/cancel 회귀 검사 기반. 실제 Fromm 계정/인증 스트림/Native LIVE/물리 Windows·Mac·모바일/PWA 설치 실기는 미검증.
- 제품 변경은 web-glowme.js/glowme.css 두 파일. index.html/버전 query/SW/manifest/패키지 파일 변경 없음.

## 동일 화면 전후 비교

모두 Chromium, 동일 합성 콘텐츠 및 뷰포트. 실제 사용자 대화/토큰/앨범 아트는 저장하지 않음. 좁은 PC의 두 번째 채널은 새 자동 검사에서 별도로 확인.

| 화면 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 대화 1440 | [전](design-review/pc-three-panel/before-1440-all.png) | [후](design-review/pc-three-panel/after-1440-all.png) |
| 미디어 1440 | [전](design-review/pc-three-panel/before-1440-image.png) | [후](design-review/pc-three-panel/after-1440-image.png) |
| 미디어 선택 1440 | [전](design-review/pc-three-panel/before-1440-image-selected.png) | [후](design-review/pc-three-panel/after-1440-image-selected.png) |
| Channel 선택 전 | [전](design-review/pc-three-panel/before-1440-channel.png) | [후](design-review/pc-three-panel/after-1440-channel.png) |
| Channel 선택 후 | [전](design-review/pc-three-panel/before-1440-channel-selected.png) | [후](design-review/pc-three-panel/after-1440-channel-selected.png) |
| LIVE 1440 | [전](design-review/pc-three-panel/before-1440-live.png) | [후](design-review/pc-three-panel/after-1440-live.png) |
| 좁은 PC 900 | [전](design-review/pc-three-panel/before-900-channel-selected.png) | [후](design-review/pc-three-panel/after-900-channel-selected.png) |

다음 시작: 이 브랜치의 Draft PR/최신 head CI 확인, 실패 시 실제 원인 수정. CI 성공 후에도 Draft 유지. 사용자 별도 승인 없이 병합·배포·버전 변경 금지.


## Draft PR 및 CI 설계 조건 갱신

- Draft PR https://github.com/fffdsaw/fromm-viewer/pull/63. Draft 유지, 병합·배포 금지.
- 최초 CI regression 통과. browser는 `glowme-phase3-review.browser.cjs`의 "스크롤 시 헤더가 화면 밖으로 사라진다"는 이전 조건에서 실패. 이제 고정 PC 헤더의 보이는 소형 렌즈 유지 및 실제 hidden 컨트롤의 렌즈 정리를 나눠 확인하고, 모바일의 기존 offscreen 정리 검사는 유지함. 엔진 제품 코드는 변경하지 않음.
- 변경한 review 검사 로컬320/844/1440 PWA 통과. 필수 CI가 포함한 기존 모바일 사례를 유지한 것이며 모바일 스타일 개편은 하지 않음.
- 캡슐 내부는 고정 폭 안에서 버튼 간격을 고르게 정돈. 변경 후 새 PC1440/900/760 및 모바일390 대화·미디어 최소 검사 재통과. 전후 PNG의 수정 후 화면 재촬영.
- 다음: 최신 커밋의 전체 CI 결과 확인 후 PR에 최종 결과 기록. main/public 상태는 변경하지 않는다.

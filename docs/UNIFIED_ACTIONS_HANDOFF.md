# 작은 고정 헤더와 목록 저장바 통일

- PR: https://github.com/fffdsaw/fromm-viewer/pull/61 (초안). 구현 체크포인트 `5e215f5b2c24c673ef1e5d3659041e33506670b7`.
- 기준 main `7db27710ddc4aa60cb97feae7a1761e264fe7964`, 브랜치 `fix/compact-sticky-unified-actions`.
- PC 중심. 통계와 로딩 상태를 같은 줄에 배치하고 상단바 축소. 미디어/사진/영상/음성에서 헤더를 sticky로 유지하며 카드가 헤더 모서리 뒤로 비치지 않도록 배경 계층 적용.
- 아티스트 목록은 휠/터치/키보드 스크롤을 유지하고 PC 스크롤바만 숨김.
- Media/Replay/Channel 목록 저장바를 같은 상단 캡슐로 통일. 별도 체크 토글 DOM 제거. 실제 선택이 있을 때 자동 표시하고 0개면 숨김. 플레이어 진입 시 상단 저장바 제외.
- 선택 해제는 접근성 이름/툴팁/기존 기능을 유지하는 X SVG 버튼. 파일 저장·API·재생·중복 방지·파일명 처리·Native·확장 코드는 변경하지 않음.
- 캐시 혼합 방지를 위해 CSS/UI/View 파일 버전 query를 `unified-actions-20261107`로 함께 변경.
- Node 281 중 280 통과, 실패0, skip1(Agora 타입 미설치). 기존 media-action 브라우저 검사는 체크 토글 제거/헤더 고정이라는 새 요구에 맞게 갱신하여 PC 및 모바일 기본 배치 검사 통과.
- 신규 unified-actions 브라우저 검사에서 PC 로딩 문구 위치/헤더 높이/스크롤 고정/스크롤바 숨김/X 기능/양 영상 목록 상단 저장바 통과. 초기 공통 scrollbar CSS가 새 숨김 규칙을 덮는 문제는 PC 규칙 우선순위를 수정해 재검사 통과.
- 증거 `/workspace/scratch/fromm-unified-actions/`; 개인 계정 데이터 없이 Chromium 합성 데이터로 실행. 실계정·실방송·물리 Mac/모바일·OS 설치형 PWA 미검증.
- 기존 사용자 지시대로 전체 CI 통과 및 충돌 없음 확인 후 이 PR만 병합·Pages 배포·공개 확인. 현재는 구현/로컬 검사 체크포인트이며 전체 CI와 배포는 아직 미완료.

## 브라우저 화면 증거

합성 데이터 Chromium 1440×900: [통계 옆 로딩](design-review/unified-actions/header-loading.png), [스크롤 후 고정 헤더·미디어 저장바](design-review/unified-actions/media-scrolled.png), [Replay 저장바](design-review/unified-actions/replay.png), [Channel 저장바](design-review/unified-actions/channel.png). 마지막 polish 후 신규 검사 재실행 통과. 목록 scrollbar 숨김 이후 실제 scrollTop 변경도 검증.

## 재개 순서

이 브랜치 최신 커밋과 동일 head의 PR/CI 상태부터 확인한다. 전체 검사가 성공하면 기존 사용자 승인 범위에서 이 변경 PR만 병합하고 Pages 및 공개 자산 hash를 확인한다. 실패가 있으면 원인을 수정하고 이 문서를 갱신한다. Meapri는 기존 제한적 시험 적용 상태를 유지한다.

## 후속 수정 — 빈 줄 제거·영상 목록 헤더 고정·숨김 전환

- 기준 main/복구 지점 `40e1f62508b56fedae32b73d1a3b311a3bbb7524`. 브랜치 `fix/list-header-selection-exit`.
- 사용자 1번 관련: 이전 sticky 대상이 media/image/video/sound뿐이어서 Replay/Channel은 빠져 있었음. 이제 PC 영상 목록도 같은 작은 고정 헤더를 적용. 통계 오른쪽 로딩 상태는 기존 구현 유지.
- Replay/Channel의 media-action-gap을 제거. 저장 캡슐은 기존 목록 필터·영상 개수 줄 오른쪽에 배치하며 선택 중에 개수·새로고침 자리를 사용. 선택 여부로 줄 높이나 영상 위치를 변경하지 않음. 목록 toolbar도 헤더 바로 아래에서 sticky 유지. LIVE/영상 플레이어에는 적용하지 않음.
- 목록 live-card의 overflow:hidden이 toolbar sticky에 별도 스크롤 기준을 만드는 것을 확인하여 PC 영상 목록에만 overflow:clip 적용. 둥근 모서리 클리핑 유지.
- 선택 해제 시 180ms opacity/translate 종료 애니메이션. 즉시 inert로 조작 차단, 전환 종료 후 hidden. 다시 선택하면 종료 취소, 모드 변경 시 전환 정리. prefers-reduced-motion은 즉시 숨김. 중복 컨트롤/복제 DOM을 사용하지 않음.
- web-glowme.js, glowme.css, index.html의 정적 query(list-polish-20261107), 영향받는 unified-actions 브라우저 검사 수정. 데이터/인증/저장/재생/Native/확장 로직 변경 없음.
- 로컬 Chromium unified-actions 및 media-action-dock 통과. Replay/Channel 24개 합성 목록, 선택 전후 위치·종료 애니메이션·inert·동작 감소·스크롤 후 고정 헤더 확인. 기존 media PC 동작 및 390px 기본 깨짐 검사 통과. 전체 Node/브라우저 검사는 CI에서 검증 예정.
- 화면: docs/design-review/list-polish/ (channel/replay-empty 및 선택 후 스크롤). 로컬 로그 /workspace/scratch/fromm-list-polish/.
- Work에 물어볼 프롬프트는 사용자에게 먼저 제공했으며 외부 메시지 전송은 하지 않음.
- 재개: 이 브랜치의 PR과 최신 head CI 확인 → 실제 결함 해결 → 전체 성공 시 기존 사용자 승인대로 해당 PR만 병합 → Pages/공개 자산 및 PC 재검증. 실계정·실방송·물리 OS/모바일·OS 설치 PWA는 미검증. Meapri 시험 적용 상태 유지.

- 보강: 저장 컨트롤 DOM은 body의 기존 고정 dock에 유지하고 위치만 목록 toolbar 줄에 맞춤. 목록 재렌더링이 버튼 DOM/ID를 제거하지 않게 함. PR https://github.com/fffdsaw/fromm-viewer/pull/62.

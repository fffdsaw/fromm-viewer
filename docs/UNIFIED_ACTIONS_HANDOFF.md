# 작은 고정 헤더와 목록 저장바 통일

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

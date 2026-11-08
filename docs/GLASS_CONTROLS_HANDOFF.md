# PC 유리 컨트롤과 사이드바 물방울

- 기준 main `df63ef4`(PR82), 브랜치 `feat/glass-droplet-controls`.
- 요청: 펼치기 시작부터 사이드바 굴절 유지, 커서/선택 메뉴/선택 아티스트의
  물방울 렌즈, 탭별 다운로드/재생/공통 버튼에 데모 Controls 질감과 눌림.
- `web-header-glass.js`: rail motion suspend→destroy→idle rebuild 경로 제거.
  같은 인스턴스/실제 SVG 필터를 전 프레임 유지하고 SDK ResizeObserver가
  맵을 갱신. 영상 재생/접근성/미지원 대체는 유지.
- `web-glass-controls.js`: pinned MIT Meapri `LiquidGlass`, `LiquidInteractive`,
  core PointerField 재사용. 근거는 upstream demo Controls, `Interactive.ts`,
  `styles/liquid-glass.css`; `LiquidSelection`은 클릭 상태를 소유하므로 기존
  메뉴/아티스트 라우팅을 보존하기 위해 사용하지 않음. 기존 단일 hover 표시에
  실제 렌즈를 연결하고 선택 메뉴/아티스트에도 별도 장식 면을 붙임.
- 글자/아이콘 및 실제 클릭 요소는 변형하지 않음. 장식 면만 포인터 기울기,
  빛 번짐, CSS 스프링 눌림/복원. 모션 감소는 정적 기본 면.
- 화면 내 버튼은 같은 기본 유리 외형을 사용. 동시 소형 SDK 인스턴스는8개로
  제한(커서/키보드 대상, 선택 레일 표시 우선). 모든 버튼에 맵을 상시 붙이지
  않으며 나머지는 기본 면. 사용 대상이 바뀌면 제한 안에서 실제 렌즈를 배정.
  영상 재생 중 소형 렌즈도 해제. 화면 밖/로그인/페이지 종료 시 정리.
- 새 의존성/CDN/프레임워크/앱 버전 변경 없음. vendor/worker/MIT 바이너리,
  인증/다운로드/플레이어 코어/선택 범위/배치/모바일 디자인 변경 없음.
- `glowme.css`: 실제 배경 면 z0와 콘텐츠 z1을 명시하여 Chromium에서
  중첩한 소형 필터가 부모의 글자를 샘플링하지 않게 함. 고정 영역/모서리
  주변 가림 유지. relative 앵커는 기존 static 버튼에만 적용.
- `web-glowme.js`: ResizeObserver로 펼치기 도중 hover 배경 폭도 추적.
- 소형 렌즈 DOM 관찰은 style을 제외하고 실제 의미 있는 변경만 반영.
  새 버튼 위치 측정은 DOM 추가 전 일괄 실행해 스크롤 중 layout 반복 방지.
- 새 `test/glass-controls.browser.cjs`:1440/760/900 standalone 레이아웃,
  펼치기 전 프레임 SVG/동일 인스턴스, hover 정렬/잔상, 실제 다운로드,
  고정 hit box/선택 배치, Replay/Channel/chat/sticky, 빠른 전환/자원 정리,
  모션 감소/390 touch 최소 확인. 기존 raw 전체 SVG 개수 검사는 pane의
  실제 filter ID로 범위를 한정. 지연 import 검사는 로그인 전 route를 설정.
- 로컬 Node285PASS/기존 Agora 타입 선언 관련 SKIP1. 설정/header 광학/초기
  로딩/채널 필터/개별 다운로드/저장 캡슐 및 신규 동작 검사 PASS.
  실제 다운로드 버튼의 displacement를0으로 바꾼 픽셀 비교도 PASS.
- 실제 macOS/Windows 설치 PWA, Safari/Firefox 물리 환경, 실계정/물리 GPU는
  미확인. standalone은 Chromium 표시 모드 시뮬레이션. 합성 파일/로컬 MP4 사용.
- 검토 자료와 최종 성능: `docs/design-review/glass-controls/`.
- 기존 승인 범위: 필수 CI 통과 후 이번 PR만 main 병합→기존 Pages 배포→
  공개 화면/런타임 자산 hash/신규 PC·모바일 검사. 다른 PR은 손대지 않는다.

- 첫 서버 CI는 채널의 IntersectionObserver 미지원 대체 검사에서 새 어댑터가
  무조건 생성자를 호출해 실패했다. 지원 확인/null 안전 정리를 보완하고
  원래 버튼을 유지하는 경로를 신규 회귀 검사에 추가. 로컬 채널/신규 효과/
  Node 검사를 다시 통과한 뒤 보완 커밋의 전체 CI로 재검증한다.

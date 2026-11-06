# 상단 검색·첫 화면 테마 수정

- 브랜치: `fix/glowme-search-startup`, 기준 main `c10739d8f01d78c4cba1982e1f1b3fa6be8020bd`.
- 초기 HTML에 Glow ME 클래스를 선언해 외부 셸 JavaScript를 기다리는 동안에도 민트 테마로 표시. CSS 로딩은 기존 render-blocking 방식 유지.
- 하단 검색 버튼을 오른쪽 상단 고정 도크로 이동. ‘내 글에 온 답장’에서만 같은 도크에 이전/다음·위치 표시를 펼침. 일반 텍스트 검색 화살표는 열린 검색 패널 안에서 유지. 넓은 설치 PWA의 고정 검색 패널 동작 유지.
- 버튼 위치가 이동하지 않는 200ms 펼침, 모션 감소 설정, 최소44px 화살표 버튼, 접힌 영역 inert. 모바일 상단 정보·검색 패널과 겹치지 않도록 배치.
- 원본 답장 판별·검색·날짜·재생·인증·다운로드 함수 미변경. PR53은 재사용하지 않으며 main 배포 승인 없음.

## 검증

- Node 277 중276 통과/1skip(Agora 타입 미설치), 실패0.
- `glowme-search-dock.browser.cjs`: 셸 JS를 지연시킨 실제 Chromium 첫 화면의 민트 색상 확인,320/390/980/1440 상단 위치·버튼 고정·답장 전용 펼침·패널 간격·감소 모션 통과.
- `glowme-phase3-review.browser.cjs`:320/844/PWA1440 검색 실제 클릭·오류 안내·대비·달력 통과.
- `my-replies.browser.cjs`:1440/390 실제 답장·검색·날짜·문맥·3000개 이동·늦은 응답·로그아웃 회귀 통과.
- `glowme-phase3-a11y.browser.cjs`:로그인 초점·inert·대비7.36·axe 위반0.
- `glowme-phase3.browser.cjs`:320/390/844/1440/PWA 레이아웃·레일·유리 대체 검사 통과(모바일 상단 추가 여백 이전 검사, 이후 관련 변경은 위 도크·접근성·답장 검사로 검증).
- 980px는 모바일 데스크톱 모드의 넓은 CSS viewport를 근사한 검사이며 실제 Android Chrome 데스크톱 모드 실기 검증은 아님. 실제 Fromm 계정/방송·물리 모바일 미검증.

## 실제 브라우저 캡처

전부 합성 데이터. 상태 확인 중의 0/0 예시이며 실제 계정 정보가 아님.

- [셸 JavaScript 실행 전 민트 화면](startup-before-shell.png)
- [390px 답장 도크](reply-dock-390.png)
- [980px 넓은 viewport](reply-dock-980.png)

재개 시 이 브랜치와 최신 git status/동일 PR/CI를 확인하고, 완료한 수정은 재작성하지 않는다. 추가 CI 실패만 원인 분석한다. main 병합·배포는 별도 승인 필요.

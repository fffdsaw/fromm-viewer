# PC 목록의 둥근 스크롤 경계

사진 탭과 같은 안쪽 여백과 고정 헤더 아래의 둥근 목록 경계를 Replay·Channel에 적용.
기준 main `cd0ec7a`(PR85)의 불투명 민트 헤더/현재 버튼/다운로드 진행 링을 유지한다.

| 기준/화면 | 수정 전 | 수정 후 |
|---|---|---|
| [사진 기준](reference-photo.png) | | |
| Replay | [이전](before-replay.png) | [수정](after-replay.png) |
| Channel | [이전](before-channel.png) | [수정](after-channel.png) |

[좁은 PC](narrow-channel.png). 실제 Chromium, 합성 메시지/채널/이미지.

- 같은 기존 토큰 사용: 목록 좌우 inset8px, 경계 반경12px.
- PC 목록에서만 적용. LIVE·플레이어·모바일 배치/기능/새 의존성/버전 변경 없음.
- 기존 한 줄 헤더의 장식 pseudo-element를 경계 가림에 재사용하고 이전 광택
  테두리/그림자를 초기화. 추가 DOM/예약 행/overflow 변경 없음.
- 1440/760/900 standalone 모드에서 사진·Replay·Channel의 스크롤 경계를 확인.
  [픽셀 기록](edge-pixels.json): 양 끝은 페이지 배경, 중앙은 그대로 투과하며
  세 탭의8px inset/실제 경계 픽셀이 동일. standalone은 표시 모드 시뮬레이션.
- 기존 PC 레이아웃/채널 헤더 검사 PASS: 필터·개수·선택·고정 도구·로그아웃/새로고침
  배치 및390 touch 대표 화면 유지. Node286PASS/기존 선택적 Agora 타입 SKIP1.

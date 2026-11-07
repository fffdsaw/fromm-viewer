# Replay / Channel 공통 PC 헤더

기준: main `431ca252fb30e85ab40852fb69d7efcff543950f`. 모두 로컬 Chromium 합성 데이터이며 실계정 자료가 아닙니다.

| 화면 | 이전 | 변경 후 |
|---|---|---|
| Channel | [이전](before-channel.png) | [선택 0개](1440-channel-zero.png) · [선택 후](1440-channel-selected.png) |
| Replay | [전체 필터가 있던 이전](before-replay.png) | [현재 채널만](1440-replay-zero.png) |
| 좁은 PC | | [701px](701-replay-zero.png) · [760px 스크롤](760-channel-scrolled.png) |
| 설치형 배치 모의 | | [900px 선택 후](pwa-900-channel-selected.png) |

헤더 외곽/카드 목록 시작선, 제목 그룹 폭, 필터 시작점, 선택·숫자 전환 시 기하 고정을 실제 좌표로 검증했습니다. 원형 새로고침은 원래 Channel 버튼과 핸들러를 이동하며 paused/emptyPages 초기화와 API 재요청을 확인했습니다. 범위는 PC 반응형 분기이고 모바일390의 두 탭은 공통 데이터 변경에 따른 넘침/조작 영향만 확인했습니다. 실제 OS 설치형 PWA·Safari/Windows 실기·실계정 스트림은 미검증입니다. Meapri 엔진 전면 본격 적용으로 간주하지 않습니다.

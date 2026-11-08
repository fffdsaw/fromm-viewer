# LIVE 높이·댓글·콘솔 진단

기준 main `6e2cd88`. 실제 계정/방송 대신 기존 Native 브리지 fixture로720×1280
JPEG를 전달하고 실제 Chromium에서 decode/ACK·전체화면·PiP·회전을 확인했다.

- Native 웹 이미지의 `max-height:75vh`를 플레이어 높이100%로 수정했다.
  사용자 선택대로 비율/contain을 유지한다. 세로 영상의 좌우 여백은 유지하며,
  일반·전체화면에서 인위적인 아래 빈 영역을 제거한다.
- 하단 LIVE 배지를 제거하고 댓글 입력창을 하단10px 패딩에 붙였다. 댓글을
  켜면 재생 조작은 오른쪽 위에 표시해 입력/설정/PiP/전체화면 접근을 유지한다.
  위쪽 설정 버튼의 팝업은 공간이 있으면 아래로 열린다.
- LIVE 진단 details/복사 UI와 표시용 타이머를 제거했다. 수집 기본값은 꺼짐이다.
  콘솔에서 `await FrommSetLiveDiagnostics(true)` → `FrommLiveMetrics()`로
  확인하고 `await FrommSetLiveDiagnostics(false)`로 끈다. 기존 redaction과
  disconnect/stop 정리는 유지한다. Native helper/확장/프레임·ACK 로직은 그대로다.
- 댓글의 최초 조회 기준을 읽을 수 있는 서비스 Date 기준으로 잡는다. Date가
  CORS로 공개되지 않은 기존 확장에서는 PC 시각 기준 최근2분을 포함한다.
  이후에는 서버 cursor를 그대로 따르고, 기존100개 저장/중복·삭제·취소 처리와
  1초 polling, 새 권한 확인, 단일 POST·실제 GET echo 규칙을 유지한다.
- PC 시각이 서비스보다1분 앞선 경우 기존 최초 cursor는 최근 댓글과 own echo를
  제외할 수 있었다. 이 조건을 재현하고 첫 응답에서 최근 댓글을 읽는 것을 검증했다.
  이것이 사용자의 실방송 지연 원인이라고 확정한 것은 아니다. 공급자의 큐/목록
  반영 지연은 클라이언트에서 줄일 수 없으며 실계정 재확인이 필요하다.

댓글 콘솔 진단: `FrommChatProbe()`의 `send.acceptedAfterMs`는 제출~ACK,
`send.echoAfterAckMs`는 ACK~서버 GET 목록에서 확인까지의 시간이다.
각 sample의 `requestMs`, `cursorLeadMs`, `newestMessageAgeMs`와 최초
`clockSource`도 제공한다. age/lead는 선택한 시계 기준의 추정이며 최대24시간으로
제한한다. Date가 공개되지 않으면 PC 시각 차이도 포함된다. ID/토큰/댓글 내용,
절대 cursor 시각은 진단에 포함하지 않는다. ACK로 댓글 행을 만들어내지 않는다.

[전 일반](before-1440-normal.png) · [후 일반](after-1440-normal.png) ·
[전 전체화면](before-1440-fullscreen.png) · [후 전체화면](after-1440-fullscreen.png) ·
[좁은 PC](after-760-normal.png) · [PWA 모드](after-900-pwa-normal.png) ·
[모바일 대표](after-390-fullscreen.png) · [연속 영상](demo.mp4).
전 스크린샷은 기준 커밋의4개 관련 파일로 같은 합성 장면을 렌더링한 것이다.

검증: Node291PASS/0FAIL/기존 선택적 Agora 선언SKIP1. 기존 LIVE/PiP/회전,
댓글 읽기/전송/IME/중복·오류/취소, 콘솔 진단 redaction 검사 통과.
1440/760/900standalone/390에서 높이·contain·하단 composer·버튼 분리,
클라이언트 시각+1분의 최초 수신과 ACK/실제 GET echo5초 이내를 확인했다.
이는 합성 서버 검증이다. 실제 LIVE 수신/실제 댓글 전송·서비스 반영 지연 및
물리 OS 설치는 미확인이다. 앱/확장 버전 변경이나 helper 재배포는 없다.

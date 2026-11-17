# Replay 저장·LIVE 로딩·영상 PiP 보완

기준 main: `377ce0f`. 사용자가 제공한 네 이미지의 중복 저장/긴 파일명, 멈춘 연결 spinner, YouTube 형태의 PiP 요청을 반영한다.

## 저장

원인은 개별 저장은 `날짜 제목.ts`, 일괄 저장은 `날짜 제목 (채널UUID-게시물UUID).ts`를 사용하면서 일괄 저장이 후자만 검사했던 점이다. 동일한 영상이 다른 이름으로 저장될 수 있었다.

개별·일괄 모두 같은 파일명 함수를 사용한다. 기본은 `날짜 제목.ts`이고, 불러온 목록에서 같은 이름의 서로 다른 영상이 있을 때만 안정적인 16자리 식별자를 덧붙인다. 폴더 저장은 새 이름과 예전 긴 괄호 이름의 비어 있지 않은 파일을 검사하고 상세 API/다운로드 전에 건너뛴다. 기존 파일도 선택을 해제하며, 0바이트 실패 잔여물은 다시 저장한다. 읽기 권한 오류는 덮어쓰지 않고 실패로 처리한다. Replay/Channel 개별·일괄 작업이 겹치지 않도록 잠금을 공유한다.

이미 존재하는 중복 파일은 삭제하거나 이름을 변경하지 않는다. 일반 브라우저 다운로드에는 기존 다운로드 폴더를 읽을 권한이 없어 동일한 중복 검사를 보장하지 않는다. 새 제목 충돌이 나중에 추가되거나 사용자가 파일명을 바꾼 경우에도 파일명만으로 기존 파일의 영상 ID를 확정할 수 없다.

## 로딩

`.live-spinner`가 존재하지 않는 `spin` keyframes를 가리키고 있었다. 이미 정의된 `ui-spin`을 사용한다. 단순 스타일 검사가 아닌 시간에 따른 실제 transform 변화로 회전을 검증한다. 이는 연결 화면 표시 수정이며 RTC 연결 성공이나 미디어 수신을 뜻하지 않는다.

## PiP

Chrome/Edge에서 Native JPEG의 디코딩된 원본 이미지를 640×360 canvas에 원본 비율로 그린 뒤 영상 PiP에 전달한다. 넓은 16:9 창과 영상 위 브라우저 조작부를 사용하며 세로 영상은 검은 여백 안에 전체 표시한다. 큰 Document PiP 제목줄이 붙은 별도 HTML 창은 canvas/video PiP 미지원 시에만 기존 대안으로 남는다.

각 이미지 load에서 `captureStream(0)`/`requestFrame()`으로만 갱신한다. 별도 반복 타이머/rAF, 재입장, 오디오 캡처 또는 댓글 복사는 없다. 원본 img의 onload/decode ACK와 Native helper 0.4.0의 프레임/오디오 경로는 변경하지 않는다. 창 닫기·영상 중지·룸/계정/탭 변경 시 capture track/video를 정리하며 늦게 완료된 PiP 요청도 닫는다.

이 LIVE PiP는 되감기 가능한 영상이 아니다. 소리는 기존 PC helper에서 출력되며 재생/일시정지·볼륨·탐색용 가짜 컨트롤이나 Media Session 핸들러를 추가하지 않는다. 브라우저가 제공하는 창 조작 UI는 버전에 따라 다를 수 있다. [Chrome 공식 PiP 설명](https://developer.chrome.com/blog/watch-video-using-picture-in-picture/)과 [canvas 프레임 요청 문서](https://developer.mozilla.org/en-US/docs/Web/API/CanvasCaptureMediaStreamTrack/requestFrame)를 참고했다.

검증: Node 167/167 통과. 합성 JPEG를 실제 설치된 Chrome/Edge 영상 PiP에 전달해 16:9 창 크기·디코딩 픽셀, 원본/ACK 보존, 창 닫기/중지 시 capture track 정리와 rAF 독립성을 확인했다. 실제 테스트 브라우저 창을 최소화한 상태에서도 프레임이 증가한다. 활성 PiP 때문에 document.visibilityState가 visible인 환경은 hidden으로 보고하지 않는다. 브라우저의 별도 PiP 창 chrome 전체를 촬영한 결과는 아니며, 창 API·실제 디코딩된 영상 픽셀로 검증한다. 실제 방송·Native 오디오/PiP 성능은 실계정 검증 전까지 UNCONFIRMED다.

기존 Channel/로컬 MP4 12개 viewport·선택 gesture·미디어 저장 브라우저 검사도 통과했다. 실제 계정 API/실제 사용자 저장 폴더는 사용하지 않았으며, HLS·권한·파일 핸들 응답은 합성 fixture다.

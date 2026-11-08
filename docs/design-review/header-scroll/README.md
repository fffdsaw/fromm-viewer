# 스크롤 중에도 상단바 굴절 유지

PR80에서 스크롤 시 SVG를 꺼서 frost로 바꾸던 동작을 제거했습니다.
PC 실험 주소는 그대로 `?headerGlass=regular`이며 기본 주소/모바일 디자인은 유지합니다.
같은 Meapri Regular/bar 굴절 맵을 스크롤 내내 연결합니다. 스크롤 이벤트에서
엔진을 끄거나, JS로 프레임마다 효과를 갱신하거나, 맵을 재생성하지 않습니다.

굴절 강도(1328×120 기준 10.2px)와 민트 가독성 면은 그대로입니다.
계산 부담을 줄이기 위해 Gaussian blur를 0으로, 추가 specular 맵/블렌드를 끕니다.
CSS 가장자리 하이라이트와 실제 SVG displacement는 유지합니다.
vendor/worker/MIT 라이선스는 변경하지 않았습니다.

- [실제 마우스 휠 녹화](header-scroll.mp4): 124개 관찰 프레임 모두 SVG 유지,
  suspend/맵 재생성 0회. [프레임별 원시 기록](scroll-trace.json).
- [스크롤 중 화면](scroll-wheel.png), [1440px](1440-scroll.png),
  [760px](760-scroll.png), [900px standalone 배치 모의](900-pwa-scroll.png).
- 이전 [스크롤 중 frost](../header-regular/1440-scroll.png)는 과거 기록입니다.
- 실제 굴절: [체커보드 scale 활성](1440-refraction.png)과
  [동일 SVG의 scale만 0](1440-zero-refraction.png), [픽셀 차이](pixel-proof.json).
  중앙의 글자/버튼 영역 PNG는 동일합니다. 체커보드는 양 축 변위를 확인하기 위한
  테스트 전용 배경이며 제품에 캡처/복제 기능을 추가하지 않습니다.

## 검증

넓은 PC/좁은 PC/standalone 모의에서 스크롤 매 프레임 실제 url(#lg-filter)가
연결되고 suspended=false이며 맵 생성 횟수가 일정한지 검사합니다.
기존 선택·저장·X, 고정 위치, 탭/높이 전환, 렌즈 1개 수명 관리,
감소 모션/투명도·고대비·저사양·모바일·실패 대체 경로도 통과했습니다.
Node 286개 중 285 PASS, 0 FAIL, 기존 Agora 타입 미설치 SKIP1입니다.

단독 실행한 3쌍 표본의 중앙값([원시 결과](performance.json), 각 약 1.2초):

| 장면 | 실험 끔 → 켬 |
|---|---|
| 갤러리 스크롤 frame p95 | 16.8 → 16.8ms |
| 갤러리 main thread 누적 | 106.3 → 117.7ms |
| 갤러리 JS heap | 2.277 → 2.291MiB |
| 영상+레일 조작 frame p95 | 16.7 → 16.7ms |
| 영상 dropped / frames | 0 / 87 → 0 / 89 |

스크롤 중 효과를 끄는 완화는 더 이상 사용하지 않습니다. 기존의 영상 재생 중
기본 민트 전환과 사이드바 크기 애니메이션 중 frost는 유지합니다.
영상 종료/일시정지 및 사이드바 크기 안정 후 SVG를 복원합니다.

Linux headless Chromium의 합성 이미지/MP4 표본이며 실기 60fps 보장이 아닙니다.
녹화와 성능 검사는 별도 실행했습니다. 실제 Windows/macOS 설치형 PWA,
Safari/Firefox, 실계정 방송, 물리 GPU 사용률/총 GPU 메모리는 미확인입니다.
병합/배포/공개 URL 최종 검증은 해당 수정 PR의 완료 기록에 남깁니다.

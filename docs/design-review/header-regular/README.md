# 상단바 Regular 실험 검토

`?headerGlass=regular` PC 전용 opt-in. 기본 URL은 비교 기준으로 유지합니다.
같은 실험 컨텍스트에서 QA setPaused로 **헤더 광학만** 끄고 켠 전후입니다.
다른 컨트롤/저장 렌즈 장식은 이 주소에서 정적으로 유지해 엔진 중첩을 피합니다.
모든 대화/이미지/MP4는 합성이며 실계정 자료가 아닙니다.

- [전](1440-off.png) · [후](1440-on.png) · [짧은 실제 Chromium 녹화](header-trial.mp4)
- 스크롤 [가벼운 frost](1440-scroll.png) → [멈춘 후 실제 SVG 복원](1440-scroll-restored.png)
- [좁은 PC760](760-on.png) · [900 standalone 배치 모의](900-pwa-on.png)
- 영상 [재생 중 기본 민트](video-playing-fallback.png) · [일시정지 후 SVG](video-paused-glass.png)
- 실제 광학 진단: [scale10.2](1440-refraction.png) · [scale0](1440-zero-refraction.png) · [픽셀 변화](pixel-proof.json).
  SVG의 같은 feDisplacementMap scale만 바꾸면 가장자리9845px가 바뀌고 중앙 PNG는 동일합니다.
  테스트의 정적 줄무늬 씬이며 제품에 배경 캡처/그림 복제 기능을 추가하지 않았습니다.

Meapri Regular/bar의 실제 native backdrop SVG 렌즈입니다. 읽기 영역은 불투명 민트,
광학은 가장자리에 집중합니다. 상단 여백/둥근 모서리 밖은 벡터 surround mask로 가립니다.
텍스트/버튼 부모에 필터·변형을 적용하지 않으며 실제 클릭 영역/헤더 높이는 전후 동일합니다.
vendor/worker/MIT 라이선스는 변경하지 않았습니다.

## 성능에 따라 적용한 제한

연속 SVG 표본에서는 갤러리 p95 50ms, 영상+UI조작 p95 166.6ms로 악화되어
그 방식은 채택하지 않았습니다. [원시 결과](performance-continuous-svg.json)를 보존합니다.
스크롤/메뉴 모션에는 public suspend()/resume() +3px CSS frost를 사용하고,
영상 재생 중에는 엔진을 해제해 기본 민트로 전환합니다. 멈춘 후/영상 일시정지·종료 후에
idle 복원합니다. 크기 동일 시 스크롤마다 맵을 재생성하지 않습니다.

최종 3쌍 비교의 중앙값([원시 결과](performance.json), 각 표본 약1.2초):

| 장면 | 헤더 끔→적응형 실험 켬 |
|---|---|
| 갤러리 frame p95 | 16.8→16.7ms |
| 갤러리 main thread 누적 | 106.0→142.6ms |
| 갤러리 JS heap | 2.292→2.333MiB |
| 영상+레일 조작 frame p95 | 16.8→16.7ms |
| 영상 드롭/프레임 | 0/89→0/88 |
| 영상 JS heap | 3.229→3.232MiB |

Linux headless Chromium의 합성 MP4/스크롤 표본입니다. GPU 프로세스 CPU시간은 원시에
수록했으나 하드웨어 GPU 점유율이나 총 GPU 메모리를 뜻하지 않습니다. 물리 기기/실방송 FPS
보장이 아닙니다. FCP312ms, 첫 렌즈 준비 표본1363ms이며 그동안 기존 민트 헤더로 표시됩니다.

## 검사와 미확인

Regular/bar API/resolved 확인, 실제 픽셀 굴절/중앙 불변, 선택/고정/크기/빠른 탭/렌즈 회수,
감소 모션·투명도/forced colors/저사양/모바일/실패·늦은 import 대체 경로 PASS.
기본 URL의 기존 rail/capsule 회귀와 Node285 PASS(기존 SDK타입 미설치 skip1).
Safari/Firefox는 엔진 대체 경로를 Chromium UA모의로 확인했으며 실제 브라우저 실기 검증이
아닙니다. 실제 OS 설치형 PWA, Windows/macOS 실기, 실제 Fromm 방송/계정은 미검증입니다.
이것은 상단바 실험이며 사이트 전체의 최종 Liquid Glass 적용 완료가 아닙니다.

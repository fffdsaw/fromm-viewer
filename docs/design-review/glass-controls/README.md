# PC 유리 컨트롤 검토

기준 PR82 main `df63ef4`. 합성 메시지/이미지/채널을 사용한 실제 Chromium 화면.

| 전 | 후 |
|---|---|
| [미디어](before-media.png) | [미디어 버튼](1440-media.png) |
| [사이드바](before-sidebar.png) | [커서·메뉴·아티스트 물방울](1440-sidebar.png) |

[약17초 동작 영상](controls.mp4): 사이드바 펼침, 커서 이동, 버튼 눌림,
다운로드/목록 조작. 외형/위치 및 실제 클릭 영역은 별도로 브라우저 검사.

[Replay](1440-replay.png) · [Channel](1440-channel.png) ·
[스크롤](1440-channel-scrolled.png) · [좁은 PC](760-channel.png) ·
[standalone 레이아웃](900-standalone-channel.png).

- 기존 Meapri LiquidGlass/LiquidInteractive/PointerField 사용. vendor/MIT 변경 없음.
- PC용 기본 유리 면은 보이는 모든 해당 버튼에 적용. 실제 소형 굴절 렌즈는
  최대8개로 제한하며 커서/키보드 대상과 선택 표시를 우선함.
- 렌즈가 없는 나머지 버튼, 저사양/미지원/영상 재생 중에는 같은 기본 유리 면.
  동작 감소 설정에서는 기울기/스프링 없이 상태를 표시.
- 1440/760/900 standalone: 펼치기 첫 프레임부터 같은 sidebar SVG 유지,
  hover 정렬/단일 표시, native 클릭 영역 고정, 실제 파일 다운로드,
  선택/해제와 목록 위치, 빠른 탭 전환/자원 정리/접근성 대체 검사 PASS.
- 390 touch 대표 화면: PC 장식/엔진 없음, 기존 선택/다운로드/화면 폭 유지.
- 설정/헤더 실제 광학/저장 캡슐/채널 필터 기존 검사와 Node285PASS/기존SKIP1.

[성능 원시](performance.json)는 기존 단독 Chromium/합성 MP4 검사 결과.
header/sidebar on/off 비교이며 소형 컨트롤은 양쪽에 유지한다. 최종 표본:
일반 스크롤 중앙값16.7ms/p95 33.4ms, 펼친 사이드바 중앙값33.3ms/p95 50ms.
영상 재생은 경량 면으로 전환해 두 표본 모두 드롭0/88프레임.
하드웨어 GPU 수치가 아니며 펼친 유리의 스크롤 비용은 남는다.

실제 macOS/Windows 설치 PWA/실계정 미디어/실제 Safari·Firefox는 미확인.
standalone은 display-mode 시뮬레이션이며 모바일 전체 기기 검증은 하지 않음.

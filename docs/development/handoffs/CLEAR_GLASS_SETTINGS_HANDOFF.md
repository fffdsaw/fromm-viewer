# PC 투명 유리와 설정

후속 사이드바/버튼 작업: [GLASS_CONTROLS_HANDOFF.md](GLASS_CONTROLS_HANDOFF.md).

- 사용자 요청: 민트는 페이지 배경에 유지하고 상단바/사이드바는 투명 유리로 변경.
  사이드바에도 기존 Meapri 엔진 적용, 데모처럼 웹 설정에서 굴절 등을 조절.
- 기준 main `3263c6a`(PR81). 브랜치 `feat/clear-glass-settings`, 작업 폴더
  `/workspace/fromm-viewer-capsule-states`. 시작 clean. 다른 PR/브랜치 및
  인증/다운로드/Native/플레이어 코어는 수정하지 않는다. 새 의존성/버전 변경 없음.
- 현재 PC 기본 화면에 유리를 켜며 실험 URL 플래그가 필요하지 않다.
  설정의 스위치로 기존 민트 화면으로 복귀 가능. 모바일은 기존 UI/소형 광학 유지.
- `web-glass-settings.js`: 기존 PC 미디어쿼리, 사이드바 하단 톱니바퀴/접근 가능한
  native dialog. enabled/refraction/thickness/blur/saturation/opacity/specular만
  `fromm.pcGlass.v1`에 저장. 범위 검증/자동 저장/복원/리셋/탭 간 동기화/저장 불가 대체.
- `web-header-glass.js`: 같은 public LiquidGlass를 header/sidebar 장식 면에 각각1개.
  불투명 중앙 민트 face 제거, 흰 중성 tint. 스크롤 중 SVG 유지, 텍스트/버튼 부모는
  필터 없음. public update()로 설정 변경을160ms 주기로 반영. specular 토글은
  vendor 내부 재구성을 기다리며 실제 filter ID 유효성을 확인한다.
- 데모 근거: 로컬 `/workspace/scratch/fromm-meapri/demo/demo.ts`67–110,
  pinned1613f831. 실제 wire()→LiquidGlass.update()와 blur/refraction/thickness/
  saturation/specularIntensity를 확인. vendor/worker/MIT 바이너리 변경 없음.
- 기존 영상 재생 시 기본 유리, 사이드바 크기 변경 시 일시적 기본 유리,
  접근성/저사양/미지원 대체 유지. Header는 레일 크기 변경만으로 끄지 않는다.
  모바일 DOM/CSS 변화는 PC 쿼리 안에 제한하며 공통 Esc는 새 dialog만 예외 처리.
- 기본값: 굴절34/두께28/흐림0/채도108/중성 흰 밝기28%/추가 광택0.
  UI는 raw 옵션 값이며 실제 bar 프로필은 자체 스케일/상한을 적용한다.
- 진행: Node285PASS/기존SKIP1, 수정한 header 광학/PC·모바일 phase3/review와
  기존 민트 모드 cold rail 검사 PASS. 설정 검사는 focus 순환을 보완했고,
  테스트의 fieldset 선택자를 새 dialog에 한정해 재검증 중.
- 다음: 설정 전체/실제 스크롤·중앙 투명도·성능(접힌/펼친 사이드바)/짧은 녹화 →
  시각 검토/필수 검사 → PR/CI → 기존 승인 범위에서 해당 PR만 병합/배포 →
  공개 화면/저장·복원 검증. 최종 결과는 이 문서/PR에 남긴다.
- 원시 로그/전후/초기 시안: `/workspace/scratch/fromm-clear-glass/`.
  실제 Windows/macOS 설치 PWA/Safari/Firefox/실계정 방송/물리 GPU는 미확인.

- 최종 대상 검사 모두 PASS: 설정4개PC폭/높이·실제API·연속드래그·복원·리셋·탭동기화·
  저장차단·값검증·axe0, 신규cold-start/짧은PC hover정렬, header 광학/중앙투명도·
  대체경로·스크롤, 기존capsule materialize/phase3/review/민트 모드rail, Node285/skip1.
  실제 휠 녹화50프레임은 두SVG/동일맵을 유지하고 페이지 오류0.
- 전후/녹화/최종·미채택성능 원시를 `docs/design-review/clear-glass-settings/`에 보존.
  이제 코드/자료를 커밋하고 PR/필수CI 후 기존 승인 범위 배포·공개 검증으로 진행한다.

- 최종 결정: public SDK에 장식 면마다 직접 연결. blur를 밖으로 옮기거나
  rim 분할하는 시제품은 성능 개선이 일정하지 않아 제외했고 관련 코드/파일은 제거.
  기본 흐림0/추가광택0, 흰 tint28%. 최종 단독 표본: 일반 스크롤 p95
  16.8→16.8ms, 펼친 사이드바16.8→33.4ms, 영상0/89→0/87드롭.
  영상 재생 시 기본 흰 투명 오버레이의 backdrop blur도 제거해 재생 우선.
- 연속 드래그 중 옵션 갱신, 전체 설정/초기화/복원/저장 불가/모바일,
  새 PC cold-start(로그인에서 vendor미요청, 다운로드 대기 중 rail/선택 동작) PASS.
  최종 파일 기준의 대상 검사/녹화를 마치고 PR/CI로 진행할 것.

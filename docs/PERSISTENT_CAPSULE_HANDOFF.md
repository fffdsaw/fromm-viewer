# PC 상시 저장 캡슐 — 재개 기록

- Branch `fix/pc-capsule-persistent-states`, worktree `/workspace/fromm-viewer-capsule-states`, base main `2ddd5557dd28b3cbf1654c898d2055f0a8bd9863` (민트 로그인 배포 후). 현재 저장 SHA: `git log -1 --format=%H`. Draft PR은 같은 브랜치로 생성하며 PR 설명에 최신 SHA/CI/배포 상태를 기록한다.
- **이번 요청에는 필요한 검증 후 main 병합·기존 Pages 배포까지 사용자 승인이 포함돼 있다.** 이전 작업 승인과 혼동하지 않는다. PR50/51·실험 브랜치·인증/토큰/Native 코어는 건드리지 않는다.
- 확정 동작: PC 미디어 정렬 행의 최신순 왼쪽에 항상 표시. Replay/Channel은 기존 헤더의 같은 공용 도구를 사용. 0개에서는 전체선택 사용 가능, 저장·X native disabled. 선택 수 자릿수/선택·해제에 캡슐·버튼·정렬·목록·스크롤 위치 고정. 실제 전체선택/저장 범위와 진행·실패 처리를 재사용.
- 디자인: 전체 간격7px(좁은 창6px), 캡슐301px/좁은 창248px, 고정 숫자88px/76px. 균등 분산 제거. 저장만 활성 청록·흰 글자. X 클릭 영역34px/좁은 창30px. 바깥 캡슐은 항상 고정된 옅은 민트 면.
- `web-glowme.js`: 기존 선택 상태에 표시/disabled를 연결, busy 상태를 보존. 공용 저장 버튼을 형제 장식층이 있는 작은 wrapper에 이동해 원래 onclick/다운로드 textContent 갱신 유지. PC만 상시 표시하며 모바일은 기존 조건부 도구 유지. 이전 캡슐 전체 퇴장 타이머 제거. 재생 화면에서는 목록 캡슐 숨김/inert 유지.
- `web-capsule-materialize.js`: 기존 공개 Meapri flexRefraction + spring을 저장 버튼 안쪽에 한정. 0→양수 때만 짧은 효과; 숫자 변경/선택 유지 상태의 화면 복귀에는 재시작하지 않음. 정착 후140ms에 렌즈 해제, 해제 시140ms fade. 글자·실제 클릭 영역은 변형하지 않음. 맵 두께8px/설정 굴절12px, 실제 광선 추적/매 프레임 맵 재생성 아님. 감소 모션·투명도·저사양·미지원은 정적 색상 대체. vendor binary/MIT 미변경.
- `glowme.css`: 기존 PC breakpoint 안에서 배치/disabled/활성/효과 스타일. wrapper 바깥 키보드 초점 선 보존. 헤더·사이드바 위치·모바일 전용 스타일 변경 없음.
- 검사 변경: 기존 사라짐 검증을 새 승인 동작인 상시 표시+native disabled로 교체하되 스크롤/초점/다운로드/레이아웃 검사는 유지. 신규 capsule-states 브라우저 매트릭스와 기존 실제 SVG/cleanup/헤더 비침/지연 로딩/감소 모션 검사를 CI에 연결. Media workflow도 저장 UI 변경 시 실행.
- 로컬 통과: PC 웹/standalone 배치 모의 각1440/900/760의 0·1·여러 개·X·실제 전체선택·숫자 폭·busy·감소 모션; 모바일390 기존 선택/저장 조건/넘침; 실제 SVG 저장 버튼 범위·짧은 자원 정리·빠른 재선택·복귀/지연/대체; PC 레이아웃·대화/미디어 스크롤 복원·Replay/Channel 공용 도구·실제 bulk bytes/names/실패 처리·direct selection 데스크톱/모바일. Node281 중280 PASS/0 FAIL/기존 Agora 타입 미설치 skip1. 대상 헤더 axe 0 violations, color-contrast incomplete는 전체 WCAG 통과로 간주하지 않음.
- 로그/PNG/실제 Chromium 상단 녹화: `/workspace/scratch/fromm-capsule-states/`. 검토용 자료는 `docs/design-review/persistent-capsule/`에 보존. 모두 합성 자료, 실계정/개인 대화 사용 없음.
- 미확인: 실제 OS 설치형 PWA·Windows/macOS 실브라우저·실계정 방송. standalone 테스트는 배치 모의이다. 알려진 로컬 실패 없음. 남은 것: 원격 필수 CI → 복구점 기록 → 이 PR만 병합 → Pages 성공 및 실제 공개 자산/브라우저 확인 → PR 설명에 완료 기록. 불필요한 기존 단계 재구현 금지.
- 재개: `fix/pc-capsule-persistent-states의 PR과 이 인계 문서, 마지막 커밋/작업 트리를 확인해 이어서 진행해 줘. 최신 필수 CI가 통과하면 사용자가 승인한 main 병합/Pages 배포를 완료하고 공개 화면을 확인해 줘. 기존 변경 보존, 인증/토큰/다른 PR/실험 브랜치 변경 금지.`

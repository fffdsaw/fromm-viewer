# Replay / Channel 공통 헤더 — 인계

- 브랜치: `fix/pc-capsule-persistent-states`, 작업 경로 `/workspace/fromm-viewer-capsule-states`. 기준 main/배포 복구점 `431ca252fb30e85ab40852fb69d7efcff543950f`. 이전 PR66은 완료; 현재 변경은 같은 브랜치의 후속 PR로 진행한다. 최신 저장 SHA는 `git log -1 --format=%H`, PR 링크/최종 CI/병합/배포 SHA는 해당 PR 설명에 기록한다.
- 사용자 승인: 검증 완료 후 main 병합과 기존 GitHub Pages 배포. PR50/51, 실험 브랜치, 인증/토큰/Native 코어는 변경하지 않는다. 초기 GitHub401은 재확인 후 해소되었고 최신 main431ca25를 확인했다.
- 구현 완료: Replay 전체 필터 제거. 두 탭에서 유효한 기존 구독 선택 유지, all/invalid는 첫 구독 채널, 0구독은 기존 빈 상태. 구독 목록 미확정 시 pending 선택 보존. 요청/표시/페이지 추가 로딩/전체선택은 현재 채널 기준. 구독 변경 시 필터 DOM도 갱신하되 기존 카드 유지. 키보드 선택 복귀 및 가로 스크롤 보존.
- PC 헤더: 같은 62px 민트 면 안에 제목+보조 개수/필터/여백/상시 캡슐/구분선/로그아웃/원형 새로고침. 제목 그룹 폭 및 숫자 폭 고정, 버튼34px 같은 중심. 실제 Channel 새로고침 컨트롤과 onclick을 이동해 paused 초기화/새 데이터 요청 유지. 원래 renderer 앞에 도구를 잠시 복원해 증분 렌더링 계약 유지. 모바일 원래 헤더/조작 유지.
- 캡슐: 선택 수 개별 테두리 제거, 전체선택 약한 면, 활성 저장만 청록 강조. 기존 저장 버튼 안쪽의 첫 선택 Meapri flexRefraction 짧은 효과 그대로 재사용. 엔진 확대·vendor 변경 없음; Meapri Regular 전면 본격 적용은 여전히 별도 시각 마감 작업이다.
- 변경 파일: index.html(공유 선택 규칙/대상/복원 및 구독 필터 갱신), web-glowme.js(PC 제목/개수/실제 도구 이동과 초점/스크롤 유지), glowme.css(PC 공통 헤더/필터/캡슐 토큰), test/collection-header.browser.cjs(0/1/다수 구독·legacy all·복원·데이터/선택 범위·정렬·키보드·고정·실제 새로고침·mobile 영향), 기존 direct-selection/pc-layout 및 Node 계약 검사(승인된 데이터 표시 변경만 반영), CI에 새 검사 연결.
- 로컬 통과: Node286 중285 PASS/0 FAIL/기존 Agora4.6.2 타입 패키지 미설치 SKIP1. PC1440/900/760/701 및900 standalone 배치 모의, 0·1·다수 구독, legacy all/유효/삭제된 구독 복원, 현재 목록13개 전체선택·X·숫자1,000개 고정, 키보드 선택, sticky, overflow. 실제 Replay loader의 지연 구독 복원 및 legacy all 요청 대상 검증, 실제 Channel 새로고침의 페이지 재개/집계 PASS. 자동 로딩 기존1440/390 두 탭 PASS. 실제 일괄 bytes/파일명·중복·현재 채널 분리/로그아웃 기존 desktop/mobile PASS. pc-layout1440/900/760+390 PASS. 새 스크린샷은 최종 캡슐 색 정착 후 재촬영 중.
- 자료: `/workspace/scratch/fromm-collection-header/`의 합성 데이터 로그/전후 PNG, 검토용 스크린샷은 `docs/design-review/collection-header/`. 실계정·개인 대화·토큰 저장 없음.
- 미확인: 실제 Windows/macOS 브라우저, 실제 OS 설치형 PWA와 실계정 스트림. Chromium standalone은 배치 모의이며 OS 실기 검증으로 간주하지 않는다. 현재 알려진 제품 실패 없음.
- 다음: 전후/선택/좁은 창 스크린샷 최종 확인 → 후속 Draft PR 및 필수 CI 전체 확인 → 복구 태그 기록 → 사용자 승인 범위의 이 PR만 병합 → Pages 배포/공개 자산 해시 및 공개 UI 확인. CI 실패 시 원인 수정 후 체크포인트 갱신. 공개 검증 전 완료 주장 금지.
- 재개 프롬프트: `COLLECTION_HEADER_HANDOFF.md와 같은 브랜치의 git status/log 및 후속 PR을 확인하고 기존 변경을 보존해 이어서 진행해 줘. 필수 CI 통과 후 승인된 main 병합/Pages 배포와 공개 화면 검증까지 완료해 줘. 다른 PR·실험 브랜치·인증/Native 변경 금지.`

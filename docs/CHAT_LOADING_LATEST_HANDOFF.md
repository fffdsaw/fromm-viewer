# 전체대화 로딩 중 탭 복귀 시 최신 대화 유지

- 기준 main `c9ee3c275641765fcfb701c707fba40c81e349bf` (PR75의 PC 미디어 스크롤 가장자리 수정 포함), 브랜치 `fix/chat-latest-during-loading`, 작업 경로 `/workspace/fromm-viewer-capsule-states`. 시작 작업 트리 clean. PR73/74/75·달력 변경 보존.
- 사용자 요구: 전체대화 첫 로딩 중 미디어/사진 등을 다녀와도 준비 완료 시 최신 대화부터 보여야 한다. 실제로 읽던 메시지/날짜·답장 이동/수동 스크롤 의도는 보존. 데이터/API/인증/다운로드 처리 변경 금지.
- 발견 경로: web-view-state.capture가 로딩/빈 안내 DOM의 y0를 실제 읽던 위치처럼 저장, enter가 이를 유효 복원으로 판단해 chatAutoTopPending을 취소. beforeRender도 capture 결과 없이 y fallback 복원 작업을 만든다. 재현 검사 먼저 실행 예정.
- 다음: 로딩 중 반복 탭 왕복/완료 후 최신 창·최신행 가시성/유효한 기존 읽기 위치 유지 검사를 재현 → 최소 위치 캡처 경계 수정 → 기존 탐색/답장·날짜 회귀 → 화면/체크포인트 → 후속 PR CI → 기존 승인 범위의 병합/Pages/공개 화면 확인. 모바일은 공통 기능 영향만 최소 확인.
- 인계 체크포인트와 PR/최종 CI/병합/배포는 이 문서와 후속 PR에 기록한다. 실제 계정/토큰/개인 대화 저장 금지. Meapri 본격 적용과 무관하다.
- 재개: 현재 브랜치 status/log와 이 문서 및 후속 PR을 확인하고 변경을 보존해 전체대화 로딩 중 탭 왕복 후 최신 진입 회귀를 이어서 완료한다.

- 재현 확인: 수정 전 로딩 중 사진/미디어 왕복 후 `windowStart=0, latestVisible=false, y=0`으로 오래된 대화가 표시됨(before.log/PNG). 수정 후 실제 탐색 버튼 클릭으로 PC1440/900 standalone 배치 모의/모바일390 모두 `latestVisible=true`, 스크롤 최하단으로 복귀. 유효한 기존 읽기 메시지/offset 저장 후 다시 로딩·탭 왕복해도 원래 anchor 유지 PASS.
- 변경 완료: web-view-state.js에서 준비되지 않은 대화/초기 최신 정렬 대기/메시지 없는 안내 화면 capture를 거부하고, beforeRender는 성공한 capture만 복원 작업으로 등록. 기존 유효한 저장 위치는 삭제하지 않는다. index.html은 로딩 문구 및 view-state 자산 캐시 키만 갱신. API·메시지 순서·전체 기록 준비·인증·다운로드는 변경하지 않음.
- 검증 PASS: Node286 중285 PASS/0 FAIL/기존 Agora 타입 미설치 SKIP1. 기존 navigation(PC/mobile 최초 최신 진입, 실제 읽기 위치, 갤러리 스크롤, 검색·날짜·초점 및 달력짧은화면) PASS. reply-anchor-context의 실제 답장/검색 및 지연 미디어 정렬 PC/mobile PASS. 새 로딩 검사 CI 연결.
- 초기 native 반복 테스트는 대기 중 disabled된 동일 버튼을 다시 클릭하는 잘못된 전제로 timeout이 났으며, 정상적인 사진/미디어 왕복 클릭 시나리오로 교정했다. 제품의 버튼 disabled 정책은 변경하지 않았다. 현재 로컬 검사 실패 없음.
- 로그/전후 합성 PNG: `/workspace/scratch/fromm-chat-loading/`, 검토 자료 `docs/design-review/chat-loading-latest/`. 실제 OS 설치형 PWA/Windows·Safari/실계정 대화는 미검증이며 standalone은 배치 모의이다. 다음은 체크포인트/PR/필수 CI → 기존 승인 범위의 병합·Pages·공개 origin 합성 재검증.

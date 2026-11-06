# 전체 대화 기반 결과 이동·헤더·사이드바 후속 수정

- 기준 main: `d8a8b84c340428cc3c7b88794effbb64e6d472d5` (PR #57 병합).
- 작업 브랜치: `fix/conversation-context-header-rail`. 이번 후속 수정의 main 병합·공개 배포는 별도 승인 전 수행하지 않음.
- 목표: ‘전체 대화 함께 보기’ 옵션을 제거하고 답장/검색 결과를 항상 전체 대화에서 탐색. 헤더는 왼쪽 레일 영역까지 채우고 사이드바는 헤더 아래에 배치. 맨 위 화살표 제거. 사용자 확인 결과 커서 반응은 메뉴 자동 확장이 아니라 메뉴 내부 선택 배경·빛 추적을 의미함.
- 보호: 작성자 판별·인증·기록 조회·LIVE·Replay·Channel·다운로드·Native·확장·Meapri 시험 적용 범위 유지.

## 시작 상태

최신 main에서 새 작업 트리 `/workspace/fromm-viewer-context-rail` 생성. 기존 PR #57 브랜치의 변경은 보존. 수정 전 Chromium 화면은 `/workspace/scratch/fromm-context-rail/before-*.png`에 수집 중.

## 진행 순서

1. 전체 대화 결과 이동으로 단일화 및 기존/신규 회귀 검사.
2. 전체 너비 헤더·아래쪽 레일·화살표 없는 키보드/터치 진입·커서 배경/빛 반응.
3. PC/모바일/가로/PWA 모의 화면 및 영향받는 회귀 검사.
4. 테스트 결과·스크린샷·남은 한계 기록, 커밋·푸시, 새 Draft PR.

## 첫 체크포인트

- ‘전체 대화 함께 보기’ UI/상태 제거. 답장/검색은 항상 전체 대화 안의 이동 대상이며 작성자 판별 및 일치 수 계산은 그대로 유지. 필터 해제 시 맨 위 이동을 예약하지 않음.
- 변경: `index.html`, 검색 패널 조립의 `web-glowme.js`, 해당 요구사항이 바뀐 답장·달력 테스트.
- `node --test test/my-replies.test.cjs`: 12/12 통과.
- `node test/reply-anchor-context.browser.cjs`: 1440/390 전체 문맥·첫 답장/검색 이동·지연 행 변화·수동 휠 우선 통과.
- `node test/reply-start-top.browser.cjs`: 1440/390 통과.
- `node test/my-replies.browser.cjs`: 1440 통과. 390의 일반 날짜 정렬 assertion 실패(날짜 top -9.64px, 기대 6~24px); 모바일 위치 보정/검사 시점 원인을 추가 조사해야 함. 검사를 삭제하거나 통과로 기록하지 않음.
- 다음: 헤더·사이드바·커서 배경/빛 구현 → 날짜 실패 재현/해결 및 최종 통합 검사. 아직 최종 완료 아님.

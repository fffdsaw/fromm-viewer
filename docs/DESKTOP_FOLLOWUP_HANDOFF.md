# PC 재접속·탐색·목록 후속 수정

- 브랜치: `fix/desktop-startup-reply-lists`
- 기준 main: `338ab900d5edf54a6f299457efe03dab3353cc2a` (PR #58 병합).
- 요청: Chrome 재시작 후 초기 사이드바 깨짐, 선택/hover 두 강조의 불일치, 본인 답장 이동, 로고 중앙 정렬, Channel/Replay 마지막 목록 안내. Channel 사진의 API 지원 여부도 조사.
- 최신 범위는 PC 중심. 모바일 전용 디자인 작업은 추가하지 않고 공통 기능 파손만 확인. 기존 인증·LIVE·Replay·Channel 재생·최고화질·다운로드·Native·확장은 보호.
- 새 작업 트리에서 기존 작업을 보존. main/다른 PR 변경 없음. 최근 사용자 지시인 ‘CI 다 되면 병합·배포’를 적용해, 이 후속 수정도 전체 CI 통과 및 충돌 없음 확인 후 같은 절차로 진행. 실패 검사나 확인 불가능한 기능을 완료로 간주하지 않음.

## 시작 조사

- 초기 HTML은 phase3 CSS가 적용되지만 사이드바 메뉴/아바타 변환은 마지막 `web-glowme.js` 실행 후 생성. 그 앞의 Native/LIVE 스크립트가 parser를 막으면 전통 사이드바가 좁은 레일 너비로 렌더될 수 있음. 느린 스크립트 로딩으로 재현할 예정.
- 답장 이동과 이전 화면 스크롤 복원의 rAF 경합 가능성 조사. 기존 fixture가 실제 `FrommViewState.enter()`로 활성화된 화면을 충분히 재현하는지 확인.
- Channel은 `/media/posts` 응답에서 `type === video`만 보존하는 영상 전용 경로. 사진의 실제 응답 모델·별도 엔드포인트는 아직 확인 전이며 추측해 구현하지 않음.
- 증거/로그: `/workspace/scratch/fromm-desktop-followup/`.

## 구현 및 로컬 검사 체크포인트

- `index.html`: UI 초기화 파일을 Native/LIVE 보조 스크립트보다 앞에 배치하고 preload. Native/LIVE 내부 파일 및 내부 순서는 유지. UI가 준비되기 전 legacy 메뉴/탭을 좁은 레일에 표시하지 않고, UI 파일 네트워크 실패 시 새로고침 안내. `web-glowme.js`의 마지막 정상 초기화에서 ready 상태 선언.
- Chrome 콜드 로딩 모의: 기존 main의 Native 스크립트를 지연했을 때 `FrommGlowME` 미준비, legacy 텍스트 표시, 중복 탭 6개 재현. 수정 후 같은 지연 중에도 완성된 9개 탐색 메뉴를 표시. 자체 UI 파일 지연/실패 경우도 검사. 실제 macOS Chrome 프로세스 종료·재시작 검증은 아님.
- `glowme.css`: hover 중 선택된 메뉴의 큰 배경/렌즈/그림자를 제거하고 글자 굵기로 현재 위치 보존. hover 배경 하나만 이동하며 나가면 원래 선택 배경 복귀. PC 로고를 레일 헤더 가로 중앙 정렬.
- 답장: 실제 활성화된 `FrommViewState` 화면에서, 결과 이동 rAF보다 먼저 이전 스크롤 복원이 대상 DOM을 다른 창으로 바꾸는 경합 재현. `navigateChatMatch`가 대상 창을 구성하기 **전** 복원을 취소하도록 수정. 본인 판별 조건은 변경하지 않음. 합성 4,000행에서 수정 전 key=m2500/실제 대상 없음 → 수정 후 대상 유지/top≈11.86px. 기존 테스트에 없던 활성 view 복원 조건을 신규 검사에 추가.
- Channel/Replay: 실제 마지막 페이지까지 확인한 경우 ‘더 불러올 영상이 없습니다.’ 안내. 오류/재시도/미완료 페이지를 끝으로 표시하지 않음. 기존 자동 로딩·선택·재생·저장 경로 유지.
- `node --test test/*.test.cjs native-live/test/*.test.cjs`: 280개 중 279 통과, 실패0, skip1(Agora 타입 미설치).
- `node test/desktop-startup-reply-lists.browser.cjs`: PC 콜드 Native 지연·UI 지연/실패·로고/단일 강조·실제 view 복원과 답장 이동 경합·양 목록 정상 종료/부분/오류 상태 통과.
- `node test/my-replies.browser.cjs`: 기존 1440/390 작성자·검색·날짜·원문·대량 이동·프로필 오류/재시도·로그아웃 검사 통과.
- 신규 브라우저 검사를 Channel CI에 연결. 전체 CI는 새 PR에서 확인할 예정이며 아직 최종 통과로 간주하지 않음.
- 합성 Chromium 증거: `docs/design-review/desktop-followup/cold-before.png`, `sidebar-single-highlight.png`. 개인 대화/계정 정보 없음.

## Channel 사진 조사 및 한계

현재 제품과 공개 참고 사이트(rbtm0106)의 Channel 구현은 `/media/posts` 및 `/media/posts/{id}`를 사용하는 영상/Replay 경로임을 확인. 이 증거만으로 Channel 사진 게시글을 지원하거나 지원하지 않는다고 단정할 수 없음. 실제 사진 응답 모델·조회/원본 URL·권한 구조가 없어 사진 게시글 연결은 구현하지 않았으며 별도 확인 필요. 공개 참고 소스는 분석만 했고 복사하지 않음.

실제 Fromm 계정/누락 신고 payload/실방송/Native 실기/물리 macOS·모바일·iOS/OS 설치형 PWA는 미검증. 3번 사진의 다른 의미(받은 답장 개수 누락)는 아직 사용자 답변이 없으며, 현재 확인한 수정은 1/1이지만 이동하지 않는 경합에 해당함.

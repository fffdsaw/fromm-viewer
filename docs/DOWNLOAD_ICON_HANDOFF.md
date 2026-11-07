# PC 썸네일 다운로드 버튼 통일

- 기준 main `08dc826c2cb6b8217c9d582f4b7da13bb8405b9a`, 브랜치 `fix/unified-download-icons`, 작업 경로 `/workspace/fromm-viewer-capsule-states`. 시작 작업 트리 clean. PR73와 기존 달력 변경 보존.
- 사용자 요구: 현재 미디어 다운로드 버튼의 외형을 기준으로 다른 탭도 통일. PC 미디어/사진/영상/음성의 기존 카드 버튼을 기준으로 전체대화 사진·영상, Replay·Channel 썸네일 버튼의 외곽 크기/위치/바탕/테두리/⇩ 화살표를 맞춘다. 재생 화면의 텍스트 다운로드·오디오 native controls 같은 다른 조작 구조는 유지한다. 모바일 디자인은 기존대로이며 영향만 최소 확인.
- 다운로드 이벤트/진행률/완료·실패/재시도·파일명·권한 처리와 원본 썸네일을 보존. 엔진/앱 버전 변경 없음. 기존 승인에 따라 검사 후 후속 PR·CI·병합·Pages·공개 화면 검증까지 진행.
- 현재: 기준 스타일/핸들러 확인 완료, 구현 전. 다음은 최소 CSS·기존 화살표 수정 → 실제 좌표/스타일·진행 상태·클릭·스크린샷·모바일 영향 검사 → 체크포인트/원격 CI.
- 재개: 이 문서와 브랜치 status/log/후속 PR을 확인해 기존 변경을 보존하고 미디어 기준 다운로드 버튼 통일을 이어서 완료한다. 다른 PR/실험 브랜치/인증·Native 변경 금지.

- 구현 완료: PC 공통 토큰으로 기존 미디어 버튼의 반응형 외곽을 그대로 재사용(851px 이상34px/9px 여백/18px 글리프, 701~850px38px/10px 여백/20px 글리프). 바탕rgba(0,0,0,.68), 흰 테두리8%, ⇩ 글리프 및 중심 정렬 통일. Replay/Channel은 PC idle pseudo만 사용하므로 기존 퍼센트/✓/! 실제 텍스트를 가리지 않고 모바일 ↓도 유지한다. 다운로드 JS는 변경 없음, index는 CSS 캐시 키만 갱신. 기존 실제 다운로드 브라우저 검사는 새 반응형 좌표 기대만 갱신.
- 로컬 PASS: Chromium1440/760 및900 standalone 배치 모의의 7개 탭 computed style/크기/위치/화살표 일치, 키보드 focus 및 Replay/Channel 진행·완료·실패 글자 유지, 모바일390 기존 전체대화 텍스트 버튼/Replay·Channel36px ↓ 유지. 실제 chat-download-selection 검사(개별 다운로드 bytes/확대/선택·드래그/반응형 복귀/모바일 영향) PASS. 로그/PNG `/workspace/scratch/fromm-download-icons/`, 저장소 검토 자료 `docs/design-review/download-icons/`.
- 다음: 체크포인트/후속 PR → 필수 CI → 복구점 → 승인된 병합/Pages 및 공개 자산/화면 검증. 실제 OS 설치형 PWA/Windows·Safari·실계정 스트림 미검증. 엔진 본격 적용 여부 변화 없음.

- 구현 체크포인트 `0e48b35` 원격 저장 완료. 후속 Draft PR https://github.com/fffdsaw/fromm-viewer/pull/74 . 최종 HEAD는 `git log -1 --format=%H`로 확인. 로컬 검사 실패 없음; 필수 CI 진행 후 최종 병합/배포/복구 태그는 PR 설명의 실행 기록에 남긴다.

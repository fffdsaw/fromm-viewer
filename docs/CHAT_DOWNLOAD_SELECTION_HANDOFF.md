# PC 선택 표시 · 전체대화 개별 다운로드

- 시작 main: `6f1ff4bb4f09e0358bb76e66e9fe2b20d2adf884`. 현재 브랜치 `fix/pc-chat-download-selection`, 작업 경로 `/workspace/fromm-viewer-capsule-states`. 기존 작업 트리 clean에서 생성. PR67은 이미 병합되었고 이후 main의 달력 변경까지 보존한다.
- 사용자 추가 요구: 미디어 선택/스크롤 중 드래그 선택 색을 선명한 민트·청록으로 통일; PC 전체대화에서는 선택·일괄 저장 도구 대신 개별 다운로드만 제공; 사진/영상 다운로드를 채널처럼 오른쪽 위 원형 버튼으로 배치. 기존 PC 반응형 분기, 모바일 동작은 유지하고 공통 변경 영향만 최소 확인한다.
- 기존 승인: 검증 후 병합/기존 Pages 배포. 다른 PR/실험 브랜치/인증·Native/엔진/버전은 변경하지 않는다.
- 진행 중: 선택/드래그 및 전체대화 bind/download/render 경로 확인 완료. 구현·검증 미완료. 마지막 실제 저장은 위 main이며 로컬 이 문서는 아직 체크포인트 전이다.
- 다음: 최소 수정 → 선택/드래그 autoscroll·chat 개별 다운로드/preview·gallery선택 복귀·모바일 영향·기존 bulk검사 → 전후 PNG → 커밋/푸시/후속 PR → 필수 CI → 승인된 병합/Pages/공개 UI 검증. 완료 전 통과 주장 금지.
- 재개: `CHAT_DOWNLOAD_SELECTION_HANDOFF.md와 브랜치 status/log/후속 PR을 확인해 PC 선택 표시와 전체대화 개별 다운로드 수정을 이어서 진행해 줘. 기존 main 변경을 보존하고 검증 후 승인된 병합/Pages 배포를 완료해 줘.`

- 구현 완료: PC 미디어의 선택 정보 영역#c9e9da, 청록#147e69/3px 윤곽 및 유형 옆✓, 드래그 박스도 같은 청록20%로 통일. 원본 썸네일 필터 없음. PC 전체대화는 선택 바인딩/클릭/키보드/마퀴 진입 차단 및 저장 도구 hidden/inert. 모바일은 원래 동작 유지, 경계 변경 시 대화 재렌더로 올바른 바인딩 회복.
- 사진/영상의 원래 개별 downloadSingleMedia 호출을 오른쪽 위 원형 앵커에 연결. aria-label/키보드 focus/다운로드 busy 유지, 파일명 원래 footer 보존. 이미지/영상 preview 및 native controls 유지. 오디오 다운로드 UI는 기존 그대로. CSS/JS 자산의 캐시 키만 갱신, 앱 버전은 변경하지 않음.
- 검사 통과: Node286 중285 PASS/실패0/기존 Agora 타입 미설치 skip1. 새 브라우저 검사 PC1440/760 +900 standalone 배치 모의의 실제 드래그 autoscroll·선택색, 전체대화 무선택/도구 숨김, 원형 버튼 사진/영상 좌표, 실제 합성 사진 다운로드 bytes, 이미지 확대, 갤러리 선택 상태 복귀, 모바일390 기존 선택/텍스트 다운로드/넘침 PASS. 기존 direct-selection 및 실제 MP4 gestures desktop/mobile PASS. 새로운 반응형 경계 복귀 검사는 추가 검증 중.
- 변경: index.html(PC 대화 선택 경계/사진·영상 앵커/개별 다운로드 busy/preview), web-glowme.js(PC 대화 도구 숨김 및 breakpoint 재바인딩), glowme.css(PC 선택색·마퀴·원형 버튼), 새 chat-download-selection 브라우저/CI 및 기존 승인 동작 변경을 반영한 direct/gestures 검사. 다른 데이터/인증/다운로드 전송 코어 미변경.
- 로그/PNG: `/workspace/scratch/fromm-chat-download/`. 최종 스크린샷 검토 완료, 이전 baseline 대조 재촬영 및 체크포인트/후속 PR 준비 중. 실제 OS 설치형 PWA/Windows·Safari 실기/실계정 방송은 미검증. Meapri Regular 본격 적용 여부 변화 없음.

- 최종 로컬 화면 검토와 650px↔PC 경계 바인딩 복귀 PASS. 전후 합성 PNG/검토 설명은 `docs/design-review/chat-download/README.md`에 저장. Node 전체 285 PASS/0 FAIL/기존 SKIP1 재확인. 키보드 Enter로 실제 개별 다운로드를 확인하는 최종 브라우저 검사는 실행 중이며, 결과 후 원격 CI 진행.

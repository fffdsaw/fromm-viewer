# 로그인 검은 배경·초기 깜빡임 수정

- Branch: `fix/login-black-startup`, worktree `/workspace/fromm-viewer-login-startup`. Base main `fc4d3f59e6f44b7575171a6d03340b73597b70f4` (PR64 배포 후). 현재 저장 SHA는 `git log -1 --format=%H`로 확인한다. Draft PR은 `gh pr view fix/login-black-startup --repo fffdsaw/fromm-viewer`로 조회하며, 생성 후 PR 설명에 체크포인트·최신 CI를 기록한다.
- 요청: 로그인은 완전히 검은 배경, 저장된 로그인 복원/새로고침 중 입력창 깜빡임 제거. 공통 로그인 화면에만 적용한다. 로그인 후 PC/모바일 배치, 캡슐·헤더는 미변경.
- 원인: 초기 HTML에 로그인 입력창이 기본 노출되고 기존 `connectSavedAuth()`의 비동기 방 조회가 끝난 후에야 숨겨졌다.
- `index.html`: 첫 페인트 전 `auth-pending`으로 입력창을 가린 검은 확인 화면. 기존 show/hide 함수에서 표시 상태만 정리한다. `login-screen` 동안 배경 스크롤 잠금; 낮은 화면에서는 로그인 영역 자체가 스크롤된다. 토큰 읽기/유효시간/복원/요청/재시도/저장/암호화/로그아웃 로직 미변경. 줄바꿈 혼합 파일은 bytes 치환으로 최소 변경했다.
- `glowme.css`: 로그인 배경만 불투명 검정으로 분리. 저장 결과 모달 스타일 미변경.
- `web-ui-a11y.js`: visibility:hidden 입력창을 초점 후보에서 제외. 확인 중에는 gate에 초점을 두고 재로그인이 필요해지면 이메일로 이동. 기존 inert·초점 트랩·복귀 유지.
- `test/login-startup.browser.cjs`: 합성 저장값/API로 신규/정상 저장/실제 reload/401/만료/503/구형 키/저장소 차단을 확인. 정상 복원 중 및 완료 후 requestAnimationFrame에서 입력창 표시 프레임0. 확인 중 배경 inert·Tab·검정, 오류 시 이메일 초점, 844×390 짧은 화면 조작 접근, 390px 민트 스크롤 띠 없음 통과. 테스트를 기존 Channel CI에 추가했다.
- 로컬: 위 브라우저7경우 PASS. 기존 로그인 초점·인용 대비·axe 검사 PASS(위반0). Node281개 중280 PASS/0 FAIL/기존 Agora 타입 미설치 skip1. whitespace PASS. `/workspace/scratch/fromm-login-startup/` 로그 보존.
- [로그인 화면](design-review/login-startup/login.png), [복원 확인 화면](design-review/login-startup/restoring.png): 실제 Chromium 촬영, 합성 자료만 사용. 실제 계정·토큰·개인 대화 저장 없음.
- 알려진 로컬 실패 없음. 실제 계정 로그인/인증 서버, 물리 기기·OS 설치 PWA는 미검증. 전체 원격 CI 결과는 해당 PR Checks를 확인한다.
- 이 수정에 대한 병합·배포 승인은 아직 없음. 이전 승인은 PR64에 적용됐으며, 버전 변경 및 새 수정의 main 병합·공개 배포를 하지 않는다.
- 재개: `fix/login-black-startup의 Draft PR/Checks와 docs/LOGIN_STARTUP_HANDOFF.md를 읽고 마지막 커밋/작업 트리를 보존해 줘. 통과 검사를 불필요하게 반복하지 말고 남은 실제 CI 실패만 해결해 줘. 인증 로직 재작성, 승인 없는 병합·배포 금지.`

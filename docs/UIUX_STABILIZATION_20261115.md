# PR #123 통합 UI/UX 안정화 검증

작업일: 2026-11-15 (Asia/Seoul). 작업 브랜치: `codex/fromm-viewer-uiux-stabilization-20261114`.

[PR #123](https://github.com/fffdsaw/fromm-viewer/pull/123). 기준 main: `fe010e5dc263ac45ef44171c90722f185c433af5`. 재개 시점 HEAD: `ad7c01c8cd3c7ef27acc28f5e7029d328379e01e`. 설정/테마 코드 체크포인트: `e54ee9be1da067200f5cfd0e794c36a65429278d`. 최신 체크포인트·CI 상태는 `CODEX_HANDOFF.md`와 원격 PR HEAD를 확인한다.

## 항목별 구현과 증거

| 번호 | 결과 | 검증 |
|---|---|---|
| 01 | 기존 캐시 새로고침 보존 | 완성 캐시 과거 요청 0, 부분 캐시 이어받기, 503 후 유지 |
| 02 | 기존 실제 Meapri 음성 버튼 보존 | SVG 변위 맵, 재생/다운로드 렌즈, 포인터 복원 |
| 03 | Hover/Press/Release/Leave 복원 | 확대 애니메이션 복귀·실제 렌즈/정리 검증, 소형 플레이어 stale hover 수정 |
| 04 | 답장 탐색 실제 Meapri 보존 | 실제 맵/탐색 버튼, 기존 답장·인용 회귀 검사 |
| 05 | 유효시간/로그아웃/새로고침 렌즈 보존 | 실제 엔진 속성·변위, 비버튼 유효시간 Press 방지 |
| 06 | 마지막 아티스트 프로필 잘림 수정 | 32px 크기 유지, 마지막 아바타가 스크롤 영역 안에 들어옴 |
| 07 | 텍스트/답장 카드 통일 | 반복 아티스트명 제거, 시간 유지, 인용 카드·탐색 유지 |
| 08 | 기존 앵커·최신 따라가기 보존 | 캐시 복원 앵커 차이 0.00px, 로딩 중 탭 복귀, PWA/모바일 레이아웃 |
| 09 | 기존 공통 영상/음성 플레이어 완성 | 실제 로컬 MP4/WAV 재생/탐색/음량, 키보드/터치, 전체화면, 원래 선택/미리보기·다운로드, 리소스 정리 |
| 10 | 음성 탭 Waveform SVG | 크기/정렬 유지, 음파 path 검사 |
| 11 | 미디어 종류 배지 제거 | 미디어/사진/영상/음성, 다운로드/선택/저장 유지 |
| 12 | 카테고리형 플로팅 설정창 | 드래그/경계/위치 복원/모바일/키보드/즉시 적용/기존 값 유지/기본값 복원 |
| 13 | Glow ME + 4개 선택 테마 | 모든 테마 즉시 적용·재방문 복원, AA 텍스트 대비, 저장 차단 fallback |

위 표는 **구현 및 로컬 합성 브라우저 증거**다. 전체 GitHub Actions 결과와 실제 인증 서비스 검증을 동일시하지 않는다. 최신 통합 CI가 끝나기 전에는 전체 검증 완료로 표시하지 않는다.

## CI 실패와 추가 회귀 해결

기준 HEAD의 Channel run [43566270607](https://github.com/fffdsaw/fromm-viewer/actions/runs/43566270607)은 `chat-download-selection.browser.cjs:23`에서 `null !== ''`로 실패했다. 보이는 영상의 기본 컨트롤은 이미 커스텀 컨트롤로 교체돼 있었다. 테스트는 커스텀 그룹·재생/음량/전체화면/탐색 컨트롤과 기존 선택 상태를 요구하도록 변경했다. 다운로드 실제 바이트, 강한 선택 표시, 드래그·자동 스크롤, 미리보기, 갤러리 선택 복원 검사는 유지했다.

오래된 브라우저 fixture allowlist에 compact 모듈/CSS를 추가해 실제 배포 자산을 검증했다. 이 과정에서 영상 그림 클릭 이벤트가 선택/미리보기와 경쟁하는 위험을 발견했다. 영상 그림의 신규 핸들러는 제거하고 원래 선택/미리보기 동작을 유지하며, 명시적 재생 버튼과 키보드는 공통 플레이어가 처리한다. 실제 MP4 더블클릭 미리보기와 선택, 컨트롤 음소거의 선택 불변성이 데스크톱·모바일 검증을 통과했다.

레이아웃 변화로 Hover 상태가 남아 컨트롤이 자동으로 숨겨지지 않는 결함도 재현·수정했다. 실제 포인터 위치와 Hover 상태를 다시 일치시킨다. 유리 크기 검사는 확대 애니메이션 중간 대신 제한된 시간 안에 원래 크기로 돌아오는지 확인한다.

## 변경 파일

- `web-compact-player.js`, 기존 compact/선택 관련 브라우저 검사: 재생 컨트롤·Hover 복귀와 선택/미리보기 호환성.
- `index.html`, `conversation.css`, `glowme.css`, `web-glowme.js`: 카드·사이드바·음파 아이콘·배지 제거. 혼합 CRLF 보존.
- `web-glass-settings.js`, `settings-panel.css`: 기존 glass preference 키/값을 유지한 설정 UI 확장.
- `web-themes.js`, `themes.css`: 계정과 무관한 표시 테마 저장. Glow ME 기본 cascade 보존. 실험 광학값 추가 없음.
- `web-glass.js`, `web-glass-controls.js`: 같은 버전의 설정 singleton을 참조하도록 자산 버전 갱신. 엔진 교체 없음.
- `test/settings-themes.browser.cjs`, `test/uiux-cards-sidebar.browser.cjs`, fixture 및 CI: 새 기능과 원래 기능을 함께 검증.

## 로컬 검증

Node 24.19.0, Playwright 1.62.1, Linux headless Chromium 151.0.7922.34. CI는 Node 22와 Windows Chrome/Edge도 사용한다. 모든 데이터·네트워크 응답은 합성 fixture다.

- Node/native 전체: 327개 중 **326 통과, 실패 0, 플랫폼 한정 1개 건너뜀**.
- 새 설정/테마: 1440×900, 900×560, 390×844; 네 카테고리 axe WCAG A/AA; 모든 테마 설정/채팅 텍스트 실제 대비 ≥4.5; 미리보기/재방문/저장 차단/리셋/슬라이더/드래그/경계/포커스/메시지 보존.
- 사이드바/카드: 1440×900, 900×560, 390×844; 마지막 아바타/음파/시간/인용/배지 없는 네 갤러리/선택/저장.
- 기존 설정/시작/메뉴 큐: 실제 광학 슬라이더 적용, 재로드/접근성/정리/설치와 Replay·Channel 다운로드 대기 링.
- 공통 compact: 실제 MP4/WAV, 재생/일시정지/탐색/시간/음량/음소거/키보드/터치/전체화면, 여러 카드·화면 밖 정리.
- Channel/Replay 확대 플레이어: 여러 데스크톱/모바일/가로·세로 레이아웃에서 실제 영상 디코드/컨트롤/목록 복귀.
- LIVE: 비율 유지·높이 채우기/입력창 하단/진단 UI 제거/합성 댓글 echo.
- 음성: 1440/780 PWA/390/320, 24초 실제 WAV, 동시 metadata probe ≤3, 미확인 길이/재생 전/중/탐색/완료/음량/정리.
- 캐시 새로고침/캐시 복원/로딩 중 탭 복귀: 기존 동작 보존.
- 실제 SVG displacement on/off 픽셀 차이, header/reply/audio 렌즈, Hover 복귀·맵 한도·reduced-motion 정리.

[데스크톱 설정 화면](design-review/uiux-stabilization-20261115/settings-desktop.png) · [모바일 설정 화면](design-review/uiux-stabilization-20261115/settings-mobile.png)

## 제한된 광학 성능 측정

기존 `test/header-glass-performance.cjs`로 동일 브라우저 내 OFF/ON 쌍을 번갈아 측정했다(각 scene/state 3회, 1.2초 샘플). 엔진 업그레이드 전후 비교나 서비스 속도 측정이 아니다.

| 장면 | OFF / ON p95 프레임 간격 | OFF / ON 샘플 중앙 main-thread 시간 | OFF / ON 샘플 중앙 JS heap |
|---|---|---|---|
| 갤러리 | 16.70 / 16.73ms | 182.8 / 541.1ms | 3.38 / 3.32MiB |
| 사이드바 펼침 | 16.70 / 16.80ms | 218.5 / 463.4ms | 3.51 / 3.39MiB |
| 영상 재생 | 16.70 / 16.80ms | 98.7 / 154.4ms | 4.23 / 4.27MiB |

유리 효과는 추가 CPU 비용이 있다. 영상 재생 중 실제 광학 맵은 0으로 내려가며, 선택/조작 장면은 기존 한도 8을 지킨다. 짧은 영상 샘플에서 drop은 OFF 1/88, ON 3/88이었다. 이 표로 성능 부담이 없다고 주장하지 않는다. JS heap은 전체 프로세스/GPU 메모리가 아니다. 저사양 Windows·실기기의 장시간 영상/유리 효과 성능은 추가 확인이 필요하다.

[원본 합성 측정 JSON](design-review/uiux-stabilization-20261115/glass-performance.json)

## 승인 및 미검증 범위

- 실제 Fromm 로그인·전송·인증 API, 실제 계정의 대규모 캐시, 실제 LIVE 네트워크는 미검증.
- 모바일은 터치·viewport 에뮬레이션이며 물리 iOS/Android가 아니다. Safari는 미검증.
- PR #124 고성능/광학 제한 실험, #125 Meapri×ybouane 연구는 별도로 보존했으며 통합하지 않았다.
- 코드·테스트·인수인계는 지정 브랜치에 푸시한다. **사용자 최종 승인 전 main 병합, 공개 배포, Preview 배포를 하지 않는다.**

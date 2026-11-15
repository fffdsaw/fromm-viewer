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

위 표는 **구현 및 로컬 합성 브라우저 증거**다. 전체 GitHub Actions 결과와 실제 인증 서비스 검증을 동일시하지 않는다. 최종 구현 `3588097`의 통합 CI 10개가 모두 통과했다. 아래 마지막 CI 절이 최신 기준이며 이전 측정·검증 이력도 보존한다.

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

## 선행 통과 CI — fc32bc9

구현 커밋 `fc32bc99168ca628c79e1a8899df8b24c070b033` 기준 결과는 다음과 같다. 문서 최종 커밋의 원격 SHA와 Checks는 PR 최종 완료 댓글에 기록한다.

| 워크플로 | 결과 | 실행 |
|---|---|---|
| Conversation | Chromium + Windows Chrome + Windows Edge, 새 설정/테마/카드 검사 포함 | [43681382970](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382970) |
| Video download | Chromium + Windows Chrome + Windows Edge | [43681382886](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382886) |
| Media bulk save | 단위 + 브라우저 | [43681382776](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382776) |
| Channel videos | 단위 + 전체 브라우저 + Xvfb Back/Forward | [43681382814](https://github.com/fffdsaw/fromm-viewer/actions/runs/43681382814) |

**전체 10개 검사 성공, 실패 0.** 새 설정/테마/카드 및 Replay·Channel 선택 색 일치 검사도 세 브라우저 행렬에서 통과했다. 모든 13개 항목은 이 합성 검증 범위에서 완료됐으며, 실제 인증 서비스와 실기기 검증은 아래 한계대로 별도다.

추가 로컬 전체 Channel 브라우저 실행은 52개 명령을 모두 통과했다. 실행 명령·환경은 [검증 manifest](design-review/uiux-stabilization-20261115/local-browser-manifest.json)에 남겼다. 개발 체크포인트에서 진행한 로컬 회귀 결과와 최종 원격 커밋의 CI 결과를 구분한다. Windows 설정/테마 직접 검증도 최종 Conversation 행렬에 포함했다.

[기본 테마 대화·인용 카드](design-review/uiux-stabilization-20261115/chat-cards.png) · [기존 유리 설정 보존](design-review/uiux-stabilization-20261115/glass-settings.png)

동일 ON/OFF fixture를 최종 플레이어 보강 이후 한 번 더 실행한 결과도 [추가 JSON](design-review/uiux-stabilization-20261115/glass-performance-repeat.json)에 보존했다. 이 반복에서 갤러리 p95 OFF/ON 모두 16.70ms, main-thread 샘플 중앙 133.3/382.8ms, 영상 drop OFF 0/89·ON 0/88, 최대 샘플 JS heap 4.29MiB였다. 앞선 1/88·3/88 drop 측정도 삭제하지 않았다. 실행 간 부하 차이가 있으므로 두 실행을 엔진 버전 개선율로 비교하지 않는다.

## 모바일 설정 보완 및 최종 CI

모바일 유리 설정이 저장만 되고 기존 고정 렌더러에 전달되지 않는 누락을 추가 점검에서 발견했다. 기존 모바일 기본 재질과 balanced/저전력/접근성/idle 제약을 유지하면서, 같은 설정 singleton으로 enabled 및 광학값을 실제 엔진에 전달한다. 기존 인스턴스를 갱신하며 스위치를 끄면 렌즈를 해제한다. 모바일 크기에 맞춘 상대 강도 조절을 설정창에 안내한다. 투명 체크박스 대신 보이는 스위치 트랙에 키보드 포커스 표시도 적용했다.

실제 모바일 SVG 준비 → 끄기 후 리소스 0 → 켜기 후 재생성 → 굴절 증가 시 실제 displacement scale 증가를 검사했다. 저장·복원·기본값/키보드/Replay·Channel 선택 색/AA/저장 차단 검사도 유지했다. PC 유리 회귀와 Node/native 326 통과, 실패 0, 플랫폼 제한 1개 건너뜀을 다시 확인했다.

최종 구현 SHA: `3588097218b6c76ecac3d279f60e1a6530ffe08a`. **최종 코드의 전체 CI 10/10 성공, 실패 0.**

| 워크플로 | 결과 | 실행 |
|---|---|---|
| Conversation | 성공 · Chromium + Windows Chrome/Edge; 새 UI·모바일 실제 렌즈·포커스·50k 포함 | [43683927488](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927488) |
| Video | 성공 · 세 브라우저 다운로드 회귀 | [43683927496](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927496) |
| Media | 성공 · 단위 + 브라우저 | [43683927492](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927492) |
| Channel | 성공 · 단위 + 전체 브라우저 + Xvfb Back/Forward | [43683927501](https://github.com/fffdsaw/fromm-viewer/actions/runs/43683927501) |

최종 인수인계 문서 커밋은 실행 코드 변경이 없다. 문서 HEAD와 원격/PR 일치 및 자동 재검사 결과는 PR 완료 댓글에서 확인한다. 실서비스 인증, 물리 모바일, Safari는 계속 미검증이며, main 병합과 모든 배포는 사용자 최종 승인 대기다.

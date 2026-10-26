# 미디어 로딩·저장 성능

## 원인과 변경

기존에는 미디어가 최신 약 500개를 받고 스크롤할 때 추가 요청했으며, 전체 대화는 별도 커서로 처음부터 다시 가져왔다. 전체 대화를 이미 열었어도 저장 시 `stableSelectedMediaForSave()`가 미디어 쪽 `ensureAllHistory()`를 기다렸고, 파일명 순번을 다시 계산했다. 백업 폴더의 파일 크기 검사도 순차적으로 진행했다.

이제 스크롤·전체 대화·저장·백그라운드 작업이 같은 커서와 진행 중인 요청을 공유한다. 처음 약 500개 이후에는 스크롤하지 않아도 JSON 대화·미디어 메타데이터를 순서대로 준비한다. 전체 대화는 기존처럼 실제 가장 오래된 메시지부터 표시하며, 준비된 메타데이터를 미디어 탭과 함께 사용한다.

- 기록 API 요청은 동시에 **1개**. 요청 시작 간 최소 간격은 150ms, 데이터 절약/2G에서는 600ms다. 백그라운드는 응답 하나마다 800ms, 절약 모드는 2,400ms를 쉬며 UI에 작업 기회를 준다. 페이지당 500을 요청하고, 명시적인 잘못된 limit 응답(400/413/422)만 100으로 재시도한다.
- 숨겨진 페이지, LIVE/Replay/Channel 화면, 저장 중에는 추가 백그라운드 페이지를 미룬다. 아티스트 전환·로그아웃·새로고침 시 타이머와 진행 중인 기록/미리보기 요청을 취소하고 늦은 응답을 버린다. 기록 요청 제한 시간은 15초다.
- 기록 API의 429는 `Retry-After` 동안 재요청하지 않고 자동 작업을 멈춘다. 인증·네트워크·스키마 오류도 무제한 재시도하지 않는다. 커서가 진행되지 않으면 완료로 간주하지 않으며, 불완전한 파일명으로 저장하지 않는다.
- 선행 미리보기는 근처 최대 60항목·동시 2개, 절약 모드는 12항목·1개다. 낮은 우선순위의 별도 썸네일만 요청한다. 원본 사진·영상·음성 전체를 선행 다운로드하지 않는다. 화면에 표시되거나 직접 재생·확대·저장한 미디어는 기존 동작을 유지한다.
- 백그라운드 페이지 완료로 기존 갤러리 DOM을 교체하지 않는다. 선택과 읽던 위치를 유지하고 새 메타데이터는 다음 스크롤/탭에서 활용한다. 기존 렌더링 단위와 프레임 분할도 유지한다.
- 파일명 계산은 500메시지마다 이벤트 루프에 양보하고, 세 가지 순번표를 완성한 뒤 함께 적용한다. 완성된 순번표는 같은 기록·세대에서 재사용한다. 사진+영상의 일별 순번, audio 폴더 순번, 구버전 전체 미디어/타입별 순번과 동일하다.
- 저장 클릭의 첫 비동기 작업은 계속 폴더 선택이다. 그 뒤 남은 기록 준비와 **새 백업 폴더 검사**를 함께 진행한다. 로컬 파일 메타데이터 검사는 최대 4개만 동시 실행하며, 파일 내용은 읽지 않는다. 어느 한 폴더라도 검사하지 못하면 미디어 요청 전에 중단한다.
- 폴더 인덱스는 저장할 때마다 새로 검사한다. 이름·미디어 타입·구버전 폴더·브라우저 `(1)` 접미사와 0바이트 재시도를 유지한다. 검사 후 새로 생긴 같은 이름의 비어 있지 않은 파일도 writable을 열기 전에 다시 확인해 보호한다.
- 저장은 기존 **최대 3개 스트리밍**, 전체 응답을 버퍼링하는 XHR 대체 경로는 **1개**를 유지한다. 저장의 429 중단과 실패 항목 재시도도 유지한다. 준비 중에는 저장 버튼에 상태가 표시된다.

## 메모리와 데이터 사용

전체 메타데이터는 기록 수에 비례하는 O(n) 메모리를 사용한다. 전체 대화와 미디어가 같은 메시지 객체/배열을 공유하며, 아티스트 기록 캐시는 최대 2개로 제한한다. 전체 메타데이터를 DOM으로 한꺼번에 만들지 않는다. 미리보기 큐는 60개(절약 모드 12개), 중복 추적 URL은 최대 256개다. 순번표를 교체하는 짧은 동안에는 기존 표와 준비 중인 표가 함께 존재한다.

스크롤하지 않아도 남은 JSON을 요청하므로, 예전처럼 첫 화면만 보고 닫는 경우보다는 메타데이터 통신량이 늘어난다. 반면 전체 대화와 저장을 함께 사용할 때 같은 기록의 중복 요청을 제거한다. 이미지 바이너리 전체를 메모리에 누적하거나 모든 원본을 다운로드하는 방식은 사용하지 않는다.

## 자동 측정

실제 프로덕션 로더와 저장 핸들러를 Chromium에서 실행했다. 실제 서버/개인 데이터 대신 합성 메시지 3,000개, 기록 응답 지연 30ms, 실제 OPFS 백업 120개와 파일 메타데이터당 합성 지연 2ms를 사용했다. 최신 500개 → 전체 대화 준비 → 미디어 저장을 같은 조건에서 각각 3회 측정했다. 측정 구간은 저장 클릭부터 첫 원본 미디어 요청까지이며, 사람의 폴더 선택 시간과 전체 파일 전송 속도는 포함하지 않는다.

| 항목 | 개선 전 | 개선 후 |
| --- | ---: | ---: |
| 저장 준비 시간 중앙값 | 530.9ms | 82.5ms |
| 해당 흐름의 기록 요청 합계 | 14 | 7 |
| 저장 중 추가 기록 요청 | 6 | 0 |
| 저장 파일명 | `2026-10-20_999.jpg` | 동일 |

이 조건에서 준비 시간은 약 **84.5% 단축**됐다. 기록 준비가 아직 끝나지 않은 즉시 저장은 남은 페이지를 기다리므로 같은 속도를 보장하지 않는다. 실서버 지연·요청 제한·실제 기기 메모리 및 모바일 데이터 비용은 미검증이다.

데스크톱(1440px)·모바일(390px)에서 스크롤 없이 3,000개 기록 준비, 기존 DOM·선택·스크롤 유지, 탭간 메타데이터 재사용, 절약 모드, 원본 선행 요청 0회, 429 중단, 전환/로그아웃 취소를 검증한다. 별도 회귀 테스트는 구버전 파일명·중복 검사·읽기 실패·0바이트·저장 실패/재시도·늦게 생긴 파일 보호·사진/영상/음성·선택·LIVE 댓글/PiP·Replay·Channel·투표를 확인한다.

재현:

```sh
node --test test/*.test.cjs native-live/test/*.test.cjs
# Playwright Chromium 설치 후, 변경 전 main HTML을 별도 파일로 준비
MEDIA_PREP_BASELINE_HTML=/tmp/fromm-media-baseline.html \
MEDIA_PREP_REPORT_PATH=/tmp/preparation.json \
node test/background-media.browser.cjs
node test/media-bulk-save.browser.cjs
```

CI가 PR 기준 main의 HTML을 가져와 동일 비교를 수행하고 JSON 결과를 아티팩트로 보관한다. 기준 main에도 최적화가 들어간 후의 후속 PR에서는 동일 기능끼리 30% 단축을 요구하지 않으며, 데이터·파일명·요청 재사용 회귀 검사를 유지한다.

## 브랜치 정리 (2026-10-27 KST)

main `e1b1836d03583f04145927fae7e89a12597635bc`와 전체 PR 36개의 상태를 다시 확인했다. 원격 브랜치 끝이 병합 PR의 마지막 커밋과 같고 main의 조상인 경우에만 삭제했다. 커밋이 사이에 바뀌면 삭제가 거부되도록 예상 SHA를 지정한 원자적 삭제를 사용했다.

보존: `main`, PR #10의 `codex/live-receive-diagnostics`, PR #11의 `codex/desktop-single-exe`. 이 작업의 신규 브랜치도 병합 전에는 보존한다. 태그는 정리 전후 목록·SHA가 동일하다.

삭제한 병합 완료 브랜치 34개:

| PR | 브랜치 | 마지막 커밋 |
| --- | --- | --- |
| #1 | `codex/web-native-live` | `c96369830e48` |
| #2 | `codex/preserve-native-baseline-bytes` | `3878dedf931d` |
| #3 | `codex/verify-bundled-electron-runtime` | `d5c7239095a7` |
| #4 | `codex/web-live-30fps` | `85187bbd1fbb` |
| #5 | `codex/coalesce-live-frame-repaints` | `54eeaaa6b147` |
| #6 | `codex/readme-web-live-setup` | `4454e2e66f60` |
| #7 | `codex/readme-single-extension` | `adfec7d7c52f` |
| #8 | `codex/clean-live-controls` | `d283d763043f` |
| #9 | `codex/live-footer-errors-only` | `65e6baef0278` |
| #12 | `codex/channel-videos` | `85730d104772` |
| #13 | `codex/channel-pagination-fix` | `07e1a6113a66` |
| #14 | `codex/channel-player-viewport` | `547396f3b29d` |
| #15 | `codex/slim-channel-direct-selection` | `cc989f1d0bc5` |
| #16 | `codex/selection-preview-drag` | `fa1941690826` |
| #17 | `codex/photo-drag-start` | `e3bca58513cb` |
| #18 | `codex/drag-preserve-selection` | `cc7e9c021a0d` |
| #19 | `codex/native-live-background` | `e20bb4560c0e` |
| #20 | `codex/live-header-video-pip` | `77f189752766` |
| #21 | `codex/media-bulk-save` | `7977b6a9b0ed` |
| #22 | `codex/live-chat-read-probe` | `d5544bb04380` |
| #23 | `codex/live-comments-overlay` | `5406375e2980` |
| #24 | `codex/replay-save-loading-pip` | `9315bcd2a75d` |
| #25 | `codex/channel-player-fill` | `06a242253ac8` |
| #26 | `codex/replay-scroll-readme` | `4d39dce32f02` |
| #27 | `codex/live-comment-send` | `640dfe456b71` |
| #28 | `codex/live-comment-policy-fix` | `8320126e5038` |
| #29 | `fix/channel-browser-back-navigation` | `3855c22a0129` |
| #30 | `fix/channel-list-history-invariants` | `fabe76328e25` |
| #31 | `fix/live-comment-scroll` | `d428e7a5231e` |
| #32 | `feature/read-only-votes` | `64668f8bb0fc` |
| #33 | `fix/vote-artist-avatar` | `2e954a88df5e` |
| #34 | `feature/my-replies` | `a635e7e4c11c` |
| #35 | `feature/viewer-polish` | `1f559103dad7` |
| #36 | `fix/chat-highlight-style` | `b9b155965e52` |

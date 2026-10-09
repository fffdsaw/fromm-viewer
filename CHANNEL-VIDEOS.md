# Channel 업로드 영상

라이브 센터의 탭 순서는 데스크톱과 모바일 모두 **LIVE → Replay → Channel**이다. Channel에서 구독 채널을 선택하면 업로드 영상의 썸네일, 제목, 공개/업로드 표시 날짜(`displayStartAt`, 한국 시간), 재생과 다운로드를 제공한다. 기존 Replay는 `live_record` 전용이며 Channel은 `video` 전용이다. 채팅의 영상 탭과도 별개다.

## 기준과 진행 중인 PR

- 작업 기준: 2026-10-10 확인한 `main`, `d4d9c2fdb940a6e841c06bd97b876af4a3782fbe`.
- 작업 브랜치: `codex/channel-videos`, PR 대상은 `main`.
- [PR #10](https://github.com/fffdsaw/fromm-viewer/pull/10): open, main 기반 `codex/live-receive-diagnostics`, head `2da8d710421309d514391a7ca5b4e764012fc0f3`. Native 수신 통계/지연 계측 변경이다.
- [PR #11](https://github.com/fffdsaw/fromm-viewer/pull/11): open draft, #10 브랜치 기반 `codex/desktop-single-exe`, head `a7727819e7b0eaf5b1e165722a688d1f02ab5378`. Electron 단일 실행 파일 초안이다.
- 이번 변경은 #10/#11의 커밋을 포함하지 않는 main 기반 독립 변경이다. Native SDK, 30fps FramePump, decode ACK, 확장프로그램과 `web-native-live.js`를 수정하지 않는다. Channel JS/CSS도 `index.html`에 포함하므로 #11의 `prepare-ui.cjs`가 HTML을 복사할 때 함께 들어간다. 이 사실은 Electron의 실제 Windows 실행 검증과 다르다.
- 두 PR의 위 head를 대상으로 `git merge-tree --write-tree`를 각각 실행한 결과 충돌 없이 가상 병합 트리가 생성됐다. 실제 브랜치 병합, main 수정, PR #10/#11 수정은 수행하지 않았다. 향후 변경까지 호환됨을 보장하는 결과는 아니다.

## 참고 사이트 분석과 라이선스

[참고 저장소](https://github.com/rbtm0106/fromm-jaime-vraiment-pas), 분석 revision `14e09538f7dd0261800f3c906257b98f7a988471`.

| 참고 파일 | 확인한 흐름 | Viewer 구현 |
| --- | --- | --- |
| `channels.html` | `GET /channels`, `data.channels`의 `isSubscribed` 필터, 채널 ID로 영상 목록 이동 | 기존 라이브 센터의 구독 채널 캐시·이름/미디어 URL 정규화를 재사용한다. 늦은 계정 응답이 캐시를 채우지 않도록 요청 세대와 세션을 확인한다. |
| `videos.html` | `GET /media/posts?labelId=0&channelId=…&limit=50`, `postId`/`num`/`displayStartAt` 커서, `type === "video"`와 `live_record` 구분, `thumbnail.url`, `title`, `displayStartAt` | 채널별 독립 페이지 캐시에서 업로드 영상만 표시한다. 다음 커서는 필터 전 마지막 원본 게시물이다. 업로드가 없는 페이지에도 더 불러오기를 제공한다. 오류 페이지의 커서는 넘기지 않는다. |
| `player.html` | `GET /media/posts/{id}`에 채널 헤더, 서명 URL의 CloudFront 인증 파라미터, hls.js 재생. `live_record`에만 파일명 변환 적용 | 재생/다운로드마다 기존 `frommApiRequest`로 상세 권한과 서명 URL을 새로 받는다. `video` 주소에는 Replay 파일명 변환을 적용하지 않는다. 기존 HLS SDK·서명 파라미터 정규화·플레이리스트 해석을 재사용하며 Hls 인스턴스와 Blob URL은 Channel이 독립 소유한다. |
| `videos.html` 다운로드 | master/variant HLS 선택, AES-128 키와 조각 처리, TS 저장 | Viewer의 `createReplayDownloadSink`와 `downloadReplayStream`을 재사용한다. 기존 AES-CBC 처리, 조각 순서, 저장 위치 선택, 스트리밍 파일 쓰기/Blob fallback과 진행률을 유지한다. 저장 형식은 기존 다운로드와 같은 `.ts`다. |

참고 저장소의 추적 파일과 README, 분석 대상 HTML에서 LICENSE/COPYING/NOTICE 또는 명시적인 코드 재사용 라이선스를 찾지 못했다. Viewer의 main에도 LICENSE 파일이 없다. 참고 사이트의 JavaScript/CSS/HTML/번역/자막/에셋은 복사하지 않았다. API 경로와 응답 구조를 참고하여 Viewer 안에서 새 코드를 작성하고, 이 저장소의 기존 구현을 재사용했다. 별도의 참고 사이트 라이선스를 임의로 부여하지 않는다. 기존 hls.js 버전/로딩 경로와 의존성은 변경하지 않았다.

## 인증과 기존 기능 유지

- 정상 로그인 세션의 `Authorization`, 기존 Device ID(`uuid`)와 `channel-id`를 사용한다. 참고 사이트처럼 임의의 UUID를 매 요청 생성하지 않는다. 새 로그인 저장소나 인증 우회 경로를 추가하지 않는다.
- 구독 채널만 선택할 수 있으며 상세 API가 거절하거나 비공개/다시보기 게시물을 반환하면 플레이어/다운로드를 시작하지 않는다.
- Channel의 목록·선택·오류·요청 세대·플레이어·다운로드 상태는 Replay 목록/선택/플레이어 상태와 분리되어 있다. 공통 미디어 처리 함수와 짧은 HLS 플레이리스트 캐시는 재사용한다.
- 탭/아티스트/미디어 탭 이동, 로그아웃과 페이지 종료에서 Channel 재생을 정리한다. 늦은 상세·HLS 응답은 새 화면에 플레이어를 붙이지 않는다. 로그아웃 시 Channel 게시물 캐시도 비운다.
- API 오류는 기존 안전한 오류 표시를 사용한다. 토큰, UUID, 계정 또는 서명 URL을 새 로그/파일/영구 저장소에 기록하지 않는다.
- Replay 함수 전체, Native LIVE/30fps/확장프로그램 코드의 기준 버전 유지 여부를 회귀 테스트로 확인한다. 라이브 센터의 공통 탐색 함수와 로그인/아티스트/필터 정리 지점에만 Channel 분기를 추가한다.

## 검증

```sh
node --test test/channel-videos.test.cjs native-live/test/*.test.cjs
git -c core.whitespace=cr-at-eol diff --check
```

위 자동 테스트 **48개 통과**: Channel 22개, 기존 Native/LIVE 26개. inline JS 문법, 정확한 탭 순서, Replay 함수 보존, Native 코드 보존, 구독/타입/노출 필터, 원본 커서·중복·실패 페이지, 채널별 캐시, 로그인/전환 후 늦은 응답, 신규 상세 권한, 업로드 파일명 보존, 서명 파라미터·Blob 정리, AES-128 조각의 실제 복호화와 저장 순서, 다운로드 취소/거절, 기존 인증 헤더를 확인한다. 암호화 테스트 데이터는 모두 합성 값이다.

브라우저 테스트는 Playwright가 설치된 환경에서 다음과 같이 실행한다.

```sh
node test/channel-videos.browser.cjs
```

Windows에서는 `PLAYWRIGHT_CHANNEL=msedge`를 환경 변수로 지정할 수 있다. 별도 설치 경로의 Playwright는 `NODE_PATH`로 지정한다. `CHANNEL_SCREENSHOT_DIR`를 설정하면 화면 캡처를 저장한다.

이번 Windows Edge headless 실행에서 데스크톱 1440×1000, 모바일 390×844 화면이 통과했다. 탭의 시각적 순서, 썸네일/제목/날짜, 가로 넘침 없음, 채널 선택, 더보기, HLS 연결, 403 오류, 플레이어/Blob 정리, Replay 전용 목록, 로그아웃과 API 헤더를 확인했고 화면 캡처를 직접 검토했다. API/CDN과 Hls 엔진은 mock이며 실제 영상 디코딩 검증은 아니다.

**실제 서비스 미검증:** 실제 Fromm 로그인, 실제 채널 응답/구독 권한, 실제 CDN 재생·다운로드, Safari native HLS, Native LIVE 수신/30fps, 실제 채팅·Replay·미디어 저장은 이 작업에서 실행하지 않았다. 기존 코드 보존과 mock/합성 테스트를 실제 서비스 성공으로 주장하지 않는다. 정상 구독 계정으로 Channel 목록, 영상 재생, 저장된 TS 재생, Replay/LIVE·채팅/미디어 저장을 추가 확인해야 한다.

## 더 불러오기 개선

후속 변경 기준은 PR #12가 배포된 main `48c2ab3`, 브랜치는 `codex/channel-pagination-fix`다. 기존에는 미디어 피드 한 페이지가 다시보기·비공개 영상·이미 표시한 영상만 포함하면 클릭 후 그리드가 달라지지 않았다. 테스트 데이터로 이 조건을 재현했다. 사용자가 경험한 실제 API 응답은 수집하지 않았으므로 실제 장애 원인이 이 조건 하나였다고 단정하지 않는다.

- 한 번 클릭하면 새 업로드 영상이 추가되거나 목록 끝에 도달할 때까지 이어서 확인한다. 클릭당 성공 페이지는 최대 5개로 제한한다. 아직 영상을 못 찾았으면 안내를 표시하고 다음 클릭에 저장된 커서부터 이어 간다.
- 불러오기 버튼을 화면에 유지하고 비활성화·진행 상태를 표시한다. 같은 작업의 중복 클릭을 차단한다.
- 네트워크/서버 오류, 일시적인 빈 비종료 응답, 진전 없는 커서는 같은 요청을 최대 3회 시도한다. 권한/클라이언트 오류는 자동 반복하지 않는다. 요청당 15초 제한과 AbortSignal을 사용하며, 신호를 무시하는 전송도 Promise.race로 기다림을 끝낸다.
- 성공한 페이지의 커서만 저장한다. 중간 실패 때 기존 영상과 마지막 성공 지점을 유지하며 다시 시도 버튼을 제공한다. `isLast:false`인 빈 응답을 목록 끝으로 취급하지 않는다.
- 기존 공통 API 함수는 선택적인 `signal`만 받도록 확장했다. 다른 호출은 예전처럼 신호 없이 동작한다. Replay 함수, Native LIVE, 채팅, 재생·다운로드 함수는 변경하지 않았다.
- 추가 회귀 테스트는 여러 빈 페이지 자동 탐색, 처음 목록이 다시보기뿐인 경우, 5페이지 제한과 이어가기, 네트워크/503 회복, 중간 실패 커서 보존, 빈 비종료 응답, 종료 안내, 로그인 없음, timeout/abort를 포함한다. 데스크톱·모바일 mock 브라우저에서도 503 자동 회복, 불러오는 중 버튼 표시, 기존 카드 유지, 지속 실패 후 동일 지점 재시도를 확인했다.

# Replay·Channel 다운로드 엔진 검증 (2026-11-09)

기준 main: `da18d7b44316ccc42e3f3989acb4c3bcebc4bc75`.
비교 소스: [videos.html](https://github.com/rbtm0106/fromm-jaime-vraiment-pas/blob/f4ddeb7736a110da5bcef63048d31486a55d5d2a/videos.html#L184), `downloadVideo()`.

## 원인과 선택

기존 `downloadReplayStream()`은 PC 12개/모바일 6개를 요청한 뒤 배치 전체가 끝나야 다음 배치를 시작했다. 한 조각이 느리면 이미 끝난 작업자의 네트워크 슬롯도 쉬었다. 비교 사이트는 20개 작업자가 즉시 다음 조각을 가져오고 인덱스로 정렬하지만 전체 영상을 RAM에 모은다. 작업자 풀 구조만 참고해 독립 구현했으며 소스 코드를 복사하지 않았다. 비교 사이트의 화질·권한·파일 저장 경로는 가져오지 않았다.

새 엔진은 동시 요청과 순서 기록을 분리하고, 미기록 조각의 선행 범위와 바이트 예산을 모두 제한한다. 순서상 맨 앞 조각에 별도 예산을 남겨 느린 조각/크기 미상 응답 때문에 교착하지 않게 했다. 다운로드·AES 복호화 후 원래 순서대로 기존 writable에 기록한다. 키는 요청별 캐시를 재사용한다. 재생용 캐시·화질 선택·PiP·전체 화면 코드는 유지한다.

기본값은 **PC 16개, 모바일 기존 6개**다. 이 fixture에서 20개는 16개보다 일정 지연에서 약 4%, 혼합 지연에서 약 3% 빨랐지만 대역폭 제한에서는 같은 수준이었다. 25% 많은 동시 요청과 더 큰 재정렬 버퍼를 쓰므로 16개를 선택했다. 복잡한 적응형 정책은 추가하지 않았다.

## 성능 측정

Loopback HTTP fixture, 같은 160조각 × 64 KiB = 10 MiB, 실제 임시 파일에 순서 기록 후 fsync/close까지 측정했다. 각 조건 3회, 실행 순서를 바꿨다. 별도 Node 프로세스로 클라이언트 메모리와 fixture 서버를 분리했다. 시간·처리량은 중앙값, 메모리·요청은 3회 중 최댓값이다. RSS/ArrayBuffer는 5ms 표본이며 정밀한 브라우저 전체 메모리 측정은 아니다.

- uniform: 응답 지연 12ms.
- jitter: 결정적 8/45/140ms 혼합 지연.
- bandwidth: 같은 혼합 지연 + 서버 전체 4 MiB/s 제한.
- mobile 6 행은 같은 Linux Node 호스트에서 모바일 설정을 적용한 결과이며 실제 휴대전화 속도 측정이 아니다.
- 네트워크/CDN의 실제 인증 영상은 벤치마크하지 않았다. 실제 서비스 향상률로 일반화할 수 없다.

| 조건 | 엔진·동시성 | 시간 ms | MiB/s | 최대 RSS MiB | 최대 완료 버퍼 MiB | 최대 요청 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| uniform | batch 12 | 505 | 19.81 | 74.4 | 0.75 | 12 |
| uniform | pool 12 | 348 | 28.75 | 75.2 | 1.38 | 12 |
| uniform | pool 16 | 337 | 29.66 | 80.8 | 1.19 | 16 |
| uniform | pool 20 | 324 | 30.86 | 80.1 | 2.25 | 20 |
| uniform | batch 6 | 662 | 15.11 | 73.4 | 0.38 | 6 |
| uniform | pool 6 | 556 | 17.98 | 73.0 | 0.44 | 6 |
| jitter | batch 12 | 1375 | 7.27 | 74.5 | 0.75 | 12 |
| jitter | pool 12 | 803 | 12.46 | 73.4 | 1.50 | 12 |
| jitter | pool 16 | 750 | 13.34 | 77.5 | 2.00 | 16 |
| jitter | pool 20 | 727 | 13.75 | 81.5 | 2.50 | 20 |
| jitter | batch 6 | 1919 | 5.21 | 73.5 | 0.38 | 6 |
| jitter | pool 6 | 1380 | 7.25 | 73.1 | 0.75 | 6 |
| bandwidth | batch 12 | 2920 | 3.42 | 75.5 | 0.75 | 12 |
| bandwidth | pool 12 | 2663 | 3.75 | 76.6 | 0.75 | 12 |
| bandwidth | pool 16 | 2647 | 3.78 | 75.3 | 0.88 | 16 |
| bandwidth | pool 20 | 2647 | 3.78 | 77.3 | 1.19 | 20 |
| bandwidth | batch 6 | 3651 | 2.74 | 75.5 | 0.38 | 6 |
| bandwidth | pool 6 | 2987 | 3.35 | 72.6 | 0.50 | 6 |

PC 기존 batch 12 → pool 16: uniform **505 → 337ms**, jitter **1,375 → 750ms**, bandwidth **2,920 → 2,647ms**. 모바일 설정 batch 6 → pool 6: **662 → 556ms**, **1,919 → 1,380ms**, **3,651 → 2,987ms**.

PC RSS는 uniform **74.4 → 80.8 MiB**, jitter **74.5 → 77.5 MiB**, bandwidth **75.5 → 75.3 MiB**. 요청 선행으로 작은 영상에서 메모리가 늘기도 한다. 메모리 감소를 성능 개선으로 주장하지 않는다. 모든 54개 측정에서 원본 크기와 SHA-256이 일치했고 설정된 요청 수를 넘지 않았다. 원자료·ArrayBuffer 표본·각 회차 수치는 [benchmark.json](benchmark.json)에 있다.

재현:

```sh
# Node 22+, 저장소 전체 history 필요. 외부 미디어 서버 요청 없음.
VIDEO_BENCH_OUT=video-benchmark.json node test/benchmarks/video-download.cjs
node --test test/video-download-engine.test.cjs
# 기존 프로젝트의 Playwright 개발 도구 사용
node test/video-download-engine.browser.cjs
PLAYWRIGHT_CHANNEL=chrome node test/video-download-engine.browser.cjs
PLAYWRIGHT_CHANNEL=msedge node test/video-download-engine.browser.cjs
```

## 메모리·오류·취소 계약

- 파이프라인 예약 상한 PC **256 MiB**, 모바일 **160 MiB**. 선행 범위는 각각 최대 32/12조각. 한 조각은 최대 64 MiB. 암호문+복호화 출력/성장 복사 여유를 예약한다. 브라우저의 네트워크 내부 버퍼·GC·DOM·File 구현 메모리를 포함한 전체 프로세스 상한은 아니다.
- File System Access 직접 저장은 기존 사용자 파일/폴더 writable을 사용해 전체 영상 RAM 수집을 피한다.
- 직접 저장 미지원 시 OPFS가 있으면 앱 임시 파일로 스트리밍하고 File 스냅샷으로 브라우저 다운로드를 요청한다. 완료한 임시 파일은 브라우저가 읽는 동안 보존하고, 후속 다운로드에서 24시간 지난 앱 소유 파일만 정리한다(한 번에 최대 64개 점검). 디스크 여유·브라우저 quota가 필요하다.
- OPFS도 없으면 기존 Blob 다운로드를 사용하되 파일 RAM 수집은 PC **256 MiB**, 모바일 **128 MiB**까지만 허용한다. 초과하면 명시적 실패로 종료한다. 초대형 fallback을 무제한 메모리에 모으지 않는다. 총 메모리에는 이 파일 버퍼가 파이프라인 예산에 추가된다.
- HTTP 408/429/500/502/503/504, 네트워크 오류, 30초 무응답, 빈 조각만 최대 2회 재시도한다. 기본 250/500ms 지수 지연, Retry-After를 존중하되 8초 초과 대기를 요구하면 재시도하지 않는다. 401/403/404·AES·크기·디스크 오류는 반복하지 않는다.
- 실패·취소·계정 변경 시 요청/대기/미기록 버퍼를 중단하고 writable을 abort한다. 일괄 저장은 기존 채널/선택 범위 검증을 유지한다. 개별 다운로드가 이미 시작된 후 목록만 이동하면 계속 받고 진행 표시를 복원한다. 페이지 종료는 중단한다.
- 기존 파일명·날짜·실제 동명 충돌의 안정적 식별 코드는 유지한다. 같은 세션에서 먼저 정한 파일명을 최대 500항목까지 기억해 목록 탐색 중 뒤늦은 동명 발견이 같은 영상의 파일명을 바꾸지 않게 한다.
- 직접 writable close만 완료로 표시한다. Blob/OPFS 링크 전달은 기존 ‘브라우저에 다운로드 요청됨’ 상태이며 OS 최종 저장 완료로 단정하지 않는다.

## 수정 범위와 검증

`web-video-download.js`: bounded worker pool, 암호화/전송/재시도/취소/순서 기록.
`index.html`: `downloadReplayStream`, `resolveReplayMediaPlaylist`의 다운로드 전용 transport/cache 주입, OPFS staging, 개별·일괄 호출의 session 연결, 게시물별 진행 표시 복원, 파일명 예약.
레이아웃·Glow ME CSS·다운로드 버튼 디자인·선택 대상·플레이어·인증/서명 URL 파서·버전은 변경하지 않았다.

전용 Node 검사는 160조각 순서, 느린 선두와 선행 제한, 125조각 AES 키 변경·명시 IV·시퀀스, 일시 장애와 권한 오류·재시도 소진, 계정 변경·취소·backoff, 크기 미상 응답, 1,200조각 고정 버퍼, 디스크 오류·메모리 한도·각 저장 방식 무결성을 검증한다. 실제 브라우저 검사는 최고 화질 AES 파일의 해시, OPFS direct/staged 및 Blob handoff, 탭 재진입 진행 링/대기 복원, 폴더 일괄 저장·기존 파일 건너뛰기, 403·계정 변경을 검증한다. PC 1440px·PWA 모드 780px·모바일 대표 390px를 사용한다. PWA는 standalone 표시 모드 에뮬레이션이며 실제 앱 설치·OS 파일 선택창을 자동화하지 않는다. 브라우저 테스트는 사용자 파일 선택만 mock하고 실제 OPFS writable/파일 바이트를 확인한다.

최종 CI·배포 결과는 PR과 완료 보고에 기록한다. 실제 CDN 속도, 실제 모바일 장치·Safari, 수 GiB 실제 영상의 브라우저별 최고 메모리 및 수동 OS 저장창은 이 fixture로 확인하지 못한 항목이다.

로컬 전체 검사: **308개 중 307 통과, 실패 0, 선택적 Agora 설치 선언 검사 1개 건너뜀**. 다운로드 전용 16개는 모두 통과. 기존 direct-selection PC/모바일 브라우저 검사, 실제 HLS 최고/수동 화질·PiP·회전/설정 검사도 통과했다.

진행 표시 복원 전후(합성 데이터, 동일한 탭 재진입 상황): [변경 전](progress-before.png) · [변경 후](progress-after.png). 변경 전 다운로드는 계속되지만 버튼 상태가 초기화되는 것을 기존 main으로 재현했다. [로컬 브라우저 결과](browser-local.json)와 PR 자동 검사 아티팩트에 넓은 PC·좁은 standalone·모바일 대표 화면 결과가 있다.

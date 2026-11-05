# Assessment B — detector·browser evidence

> 증거 캡처 시점의 결과를 보존한 보고서입니다. 부모 에이전트가 `.media-missing` 및 `.artist-select-prompt` 대비 수정을 예정하고 있습니다. 수정 후의 확인은 부모가 수행하며, 아래 관찰을 수정 후 상태로 해석하면 안 됩니다. 이 보고서 작성 단계에서는 검사를 반복하지 않았습니다.

대상: `/workspace/fromm-viewer-phase3/index.html` (요청된 `feature/glowme-uiux-phase3`, Draft53). Assessment A 자료를 읽지 않은 독립 검토입니다. 저장소 수정·hook·commit·PR 작업을 수행하지 않았습니다. **Meapri는 제한적 시험 적용 상태이며, 본격 시각 마감은 별도 미완료**라는 최신 사용자 지시를 적용합니다. 이번 결과는 시각 마감 완료 판정이 아닙니다.

## 확정된 현재 화면 문제

1. **[P2] 비어 있는 화면과 미디어 오류 안내의 명도 대비가 낮습니다.**
   - `.artist-select-prompt`: `아티스트를 선택해주세요.`가 `#a8b0bd`이며 탐지 대비는 밝은 배경에서 약 **2.0:1**입니다. 로그인 화면에서 검출된 것은 모달 뒤 `inert` 영역이므로 로그인 자체의 결함은 아닙니다. 이후 동일 UI를 로그인 후 아티스트 미선택 상태로 직접 확인했으며, 안내가 실제로 보이고 `inert=false`입니다. 위치: `index.html:323`, 생성: `index.html:8607`. 증거: `no-artist-state.png`, `edge-state-evidence.json`.
   - `.media-missing`: `[영상 · 파일 URL 없음]`, `[음성 · 파일 URL 없음]`의 13px 글자가 `#9da6b5`이고 말풍선은 `rgba(246,250,252,.96)`입니다. 브라우저 탐지 대비 **2.3:1**이며 스크롤해 실제 보이는 오류 안내를 확인했습니다. 위치: `index.html:181`, 생성: `index.html:9222`. 증거: `missing-media-state.png`, `resolved-browser-findings.json`.
   - 미디어 오류 26개는 fixture가 영상·음성 URL을 제공하지 않아 같은 오류 상태를 반복 생성한 결과입니다. **26개 독립 결함이 아니라 동일 스타일 문제 1개**입니다. 실제 서비스에서 오류가 발생하는 빈도는 확인하지 않았습니다.
   - 권장: 이 두 안내를 현재 mint 테마의 충분히 짙은 보조 텍스트 색상으로 맞추고 일반 텍스트 기준 4.5:1을 확보합니다.

2. **[P2] 접힌 내비게이션에서 일부 목적지가 시각적으로 구분되지 않습니다.**
   - `영상`과 `LIVE`는 동일한 camera SVG를 사용하고, `미디어`와 `사진`도 작은 크기에서는 거의 같은 산 모양입니다. 기본 접힌 rail에는 텍스트가 보이지 않아 첫 이용자는 확장하거나 hover 해야 구분합니다. 데스크톱과 390px 모바일 화면에서 확인했습니다.
   - 위치: `web-glowme.js:10`의 icon mapping, `glowme.css:425`의 label 숨김. 증거: `chat-desktop.png`, `search-mobile.png`, `nav-accessibility.json`.
   - 모든 항목에 `aria-label`과 `title`이 있고 활성 항목에 `aria-current="page"`도 있으므로 **접근성 이름 누락으로 보고하지 않습니다**. 버튼 또는 rail을 확장하는 우회 방법이 있어 P2입니다. 권장: LIVE에는 방송 고유 표시를 사용하고 미디어/사진을 서로 구분할 수 있는 아이콘으로 바꿉니다.

## 재사용한 CLI 결과

원본 `/workspace/scratch/fromm-phase3/critique-b/detect.raw.json`을 재사용했습니다. 신규 CLI detector 실행은 하지 않았습니다. 원래 종료 코드 2, target slug `index-html`, ignore 목록 없음입니다.

| Rule | 개수 |
| --- | ---: |
| `low-contrast` — Low contrast text | 25 |
| `broken-image` — Broken or placeholder image | 2 |
| `tiny-text` — Tiny body text | 3 |
| `pulsing-dot` — Pulsing status dot | 1 |
| `marquee` — Auto-scrolling marquee | 4 |
| `dark-glow` — Glowing shadow accents | 1 |
| 합계 | **36** |

35 warnings + 1 advisory. 모든 항목의 파일은 `/workspace/fromm-viewer-phase3/index.html`이고 원본 detector의 줄 번호는 전부 **0**입니다. 유효한 소스 줄 번호처럼 인용하면 안 됩니다. 복사본은 `detect.reused.json`, 집계는 `detector-summary.json`입니다.

### 오탐·현재 화면에서 미확인인 항목

- CLI `low-contrast` 25개는 오래된 어두운 inline CSS 배경과 현재 텍스트 토큰을 조합한 결과를 포함합니다. 실제 현재 mint 화면의 적용된 CSS와 일치하지 않아 25개를 현재 화면 결함으로 합산하지 않습니다. 브라우저에서 확정한 대비 문제는 위의 별도 상태 두 종류입니다. 보호된 player 등 미검토 화면까지 모두 오탐이라고 단정하지 않습니다.
- `broken-image` 2개는 동적으로 채워지는 `#artistProfileImage`와 숨겨진 `#lightboxImage`의 초기 src 부재입니다 (`index.html:1370` 부근 및 `index.html:1505` 부근). 검사한 세 화면에서 보이는 broken image는 없었습니다.
- `tiny-text` 3개는 현재 일반 대화 본문 결함으로 재현되지 않았습니다. `.meta`는 현재 12px로 override됩니다 (`glowme.css:484`). 모바일 11px 토큰 잔여시간과 시각적으로 숨겨진 10.5px `#scanState`를 body text 결함으로 합산하지 않습니다. 다른 player 상세 화면은 이 검사 범위 밖입니다.
- `pulsing-dot`은 `.live-badge::before`의 실제 LIVE 상태 표시입니다 (`index.html:432`). 장식 목적의 가짜 liveness로 단정할 수 없습니다. 현재 세 화면에서는 해당 live badge가 나타나지 않았습니다.
- `marquee` 4개는 download indeterminate 및 toolbar loading progress animation입니다. 자동으로 흘러가는 콘텐츠 marquee가 아니라 진행 상황 표시이므로 의미상 오탐입니다.
- `dark-glow`는 이전 download progress span의 blue shadow입니다 (`index.html:76`). 현재 세 기본 화면에서는 보이지 않았으며, 현재 화면의 광범위한 glow 결함으로 취급하지 않습니다.

## 실제 브라우저 증거

노출된 native browser 도구가 없어 Playwright Chromium **151.0.7922.34**를 사용했습니다. 실제 localhost HTTP로 현재 저장소를 서빙하고 fixture의 합성 데이터와 차단된 외부 요청을 사용했습니다. 각 대표 상태는 별도 새 page/context에서 열었습니다.

먼저 title 변경·script element 추가·inline 실행 세 가지 mutable preflight가 모두 성공했습니다 (`preflight.json`). 이후 **저장소 밖** `critique-b-final`에서 설치된 CLI의 `live-server --background`를 실행하고, 세 페이지에 `http://localhost:8400/detect.js`를 주입하여 3초 후 console과 overlay를 기록했습니다.

| 상태 | 크기 | Console 결과 | 해석 |
| --- | --- | --- | --- |
| 로그인 | 1440×900 | `1 anti-pattern found` | 모달 뒤 inert `.artist-select-prompt`의 low contrast. 로그인 modal 문제로는 오탐이며 로그인 후 같은 empty state에서는 실제 문제입니다. |
| 대화 | 1440×900 | `27 anti-patterns found` | 실제 API 반환은 **27 요소 그룹 / 28 rule instances**: low-contrast 26 + side-tab 1 + nested-cards 1. Console은 요소 그룹 수를 출력합니다. |
| 모바일 검색 | 390×844 | `No anti-patterns found` | 주입 성공, detector 실행 성공, marker 0개. |

대화의 `side-tab`·`nested-cards`는 `.reply-quote` 하나에 붙었습니다. 원문 인용을 구분하는 3px 선과 중첩된 인용 영역이므로 유효한 대화 정보구조를 일반 장식 카드로 본 오탐입니다 (`index.html:163`).

`login-desktop.overlay.png`와 `chat-desktop.overlay.png`에 실제 주입된 marker가 기록되어 있습니다. **사용자가 보는 [Human] 브라우저를 열거나 유지한 것은 아닙니다.** Headless screenshot으로만 확인했고 브라우저를 종료했습니다. 사용자에게 현재 overlay가 눈앞의 탭에 보인다고 안내하면 안 됩니다.

추가 확인:

- 세 대표 페이지의 JavaScript page error **0**.
- 현재 390px 검색 panel은 x=68, width=310, right=378로 viewport 안에 들어갑니다. document/body scrollWidth는 390입니다. 이전 panel overflow는 이번 화면에서 재현되지 않습니다.
- `.selection-toggle`의 기본 1×1 크기는 숨겨진 keyboard control입니다. focus 시 실제 **56×36**, clip 없음, 2px outline으로 보이는 것을 확인했습니다. 작은 크기 오탐으로 분류합니다 (`selection-focus.json`, `chat-selection-keyboard-focus.png`).
- 사진·avatar는 fixture 자산이며 모두 로드됐습니다. 실제 외부 미디어 재생이나 서비스 로그인, 보호된 LIVE/Replay/Channel player 동작을 검증한 자료는 아닙니다.

## axe 결과와 범위

주입 전 로그인·대화·모바일 검색에 axe WCAG 2 A/AA 및 2.1 AA 검사를 수행하여 세 페이지 모두 **자동 확정 violation 0**이었습니다. 하지만 이 결과를 접근성 준수 판정으로 사용할 수 없습니다.

- 로그인: incomplete 없음.
- 대화: `color-contrast` incomplete **690 nodes**, `aria-prohibited-attr` incomplete 1 node.
- 모바일 검색: `color-contrast` incomplete **46 nodes**, `aria-prohibited-attr` incomplete 2 nodes.

반투명 표면·광학 효과 때문에 대비 자동 판정이 불완전합니다. 실제 low-contrast 상태는 위의 computed color·브라우저 detector·스크린샷으로 따로 확인했습니다. Meapri는 현재 제한적 실험 상태이며, 이 자료는 본격 시각 마감이나 광범위한 성능/접근성 검증 완료를 의미하지 않습니다.

## 정리 상태

- live server를 `stop --keep-inject`로 종료: exit 0. port 8400 closed 확인.
- fixture server 및 모든 browser/context 종료. 최초 fixture port 39751 closed 확인.
- 외부 임시 `.impeccable` 상태 폴더 및 복사된 `detect.js` 삭제.
- PNG, JSON, console/start/stop log와 재현 스크립트는 감사 증거로 `/workspace/scratch/fromm-phase3/critique-b-final/`에 의도적으로 유지.
- 저장소 파일 수정, commit, PR, hook 실행 없음. Assessment A의 자료를 읽거나 결과를 전달하지 않음.

핵심 파일: `browser-evidence.json`, `resolved-browser-findings.json`, `edge-state-evidence.json`, `detector-summary.json`, `cleanup.json`.

# 상단바 Meapri Regular 실험

현재 수정: `fix/header-live-scroll-glass`, 기준 main `83e810c`(PR80).
사용자가 스크롤 중 효과가 사라지는 방식을 거절하여 scroll→frost 처리를 제거했습니다.
실제 굴절은 스크롤 내내 연결하고 맵을 재사용합니다. blur=0/specular=false로
계산을 줄이며 굴절 강도는 유지합니다. 영상/레일 크기 변경 대체는 기존대로입니다.
현재 근거는 [header-scroll 검토](design-review/header-scroll/README.md)입니다.
아래 PR80의 scroll/frost 기록은 과거 정책이며 복원하면 안 됩니다.
Node285 PASS/기존SKIP1, PC1440/760/900standalone·모바일390·대체경로 검사 PASS,
단독 스크롤 p95 끔/켬16.8/16.8ms, 실제 휠 녹화124프레임 모두 SVG 유지.
최종 CI/병합/배포/공개 확인은 이번 수정 PR 완료 기록에 이어서 남깁니다.

- 기준: 최신 main `9d783c1004e0afdcb8dbf959bf747c76ca275270`(PR79 사이드바 레이어 수정 포함), 브랜치 `experiment/header-regular-glass`, worktree `/workspace/fromm-viewer-capsule-states`. 시작 clean, 기존 PR50/51·실험 브랜치·인증/미디어 코어 변경 금지.
- 사용자 요청: 실제 엔진을 상단바에만 실험 적용. 기존 Meapri MIT/핀1613f831 재사용, Regular/bar 프로필의 native SVG backdrop refraction. React/CDN/새 의존성/DOM·영상 캡처/WebGL 도입 없음.
- 결정: PC 전용 `?headerGlass=regular` 실험 주소에서 적용, 기본 주소는 비교 기준으로 유지. 상단바 외곽의 장식 면 1개에만 엔진, 글자/버튼 별도 전경. 중앙 민트 가독성 면과 상단 여백/둥근 모서리 바깥 가림 유지. 엔진 중첩을 피하려 실험 주소에서는 기존 소형 컨트롤/저장 하이라이트의 광학 장식만 정적 표현으로 유지(기능은 그대로).
- 사용자에게 전후 비교 실험 주소로 진행한다고 알림. 기존 세션의 CI 후 병합/배포 승인에 따라 기본 UI에 영향 없는 opt-in 실험 주소를 배포해 검토 가능하게 할 예정. 전체 사이트의 최종 엔진 적용 완료로 간주하지 않는다.
- 다음: 실제 adapter/수명·idle/접근성·대체 구현 → 굴절 맵이 실제로 배경 픽셀을 바꾸는 진단+실제 화면 전후/짧은 영상 → 초기/스크롤/영상재생 CPU·rAF·heap 비교 → 대상/필수 회귀 → 체크포인트/PR/CI → 복구 태그/기존 승인 범위 배포/공개 실험 URL 확인.
- 미검증 항목은 추후 기록. 실제 OS/Windows/Safari 실기/실계정 방송은 별도 확인 필요. 합성 자료만 저장한다.
- 재개: 이 문서와 브랜치 status/log/후속 PR부터 확인하고 미커밋 파일을 보존해 상단바 Regular 실험을 이어서 검증한다. 불필요한 재구현/엔진 확대 금지.

- 구현: web-header-glass.js가 기존 vendor Regular/bar를 idle시 1개 생성. PC 전용 opt-in `?headerGlass=regular`, 기본 주소는 그대로. 실제 native SVG는 장식층만, 가독성 중앙 민트 면/정확한 둥근 외곽 surround mask 사용. 레이아웃·클릭·키보드·영상코어 변경 없음. 실험 주소에서 기존 개별 컨트롤/저장 버튼의 렌즈 장식만 정적으로 고정해 중첩 방지.
- 실제 광학 증거: 진단 줄무늬 backdrop에서 같은 SVG의 feDisplacementMap scale을10.2→0으로 비교, 1440/760/900PWA에서 가장자리9845/5669/6507개 픽셀(차이2 초과)이 변함. 중앙 글자·버튼 영역 PNG는 바이트 동일. CSS tint만의 효과가 아니다. diagnostic scene은 테스트 DOM만 사용하며 제품에 추가하지 않음.
- 성능에서 결함 발견/수정: 연속 SVG는 갤러리 p95 16.7→50ms, 영상+UI조작 16.8→166.6ms로 악화. 최초의 병렬 실행 표본은 폐기하고, 단독 실행한 원시 결과 `performance-continuous-svg.json` 보존. 이를 배포하지 않고 실제 공개 suspend()/resume()로 스크롤/레일 모션 중3px CSS frost, 영상 재생 중 엔진 해제+기본 민트로 전환. 스크롤 후 동일 크기는 맵 재사용, resize/영상 종료 후 idle시 1개 재생성.
- 완화 후 첫 단독 표본: gallery p95 16.7→16.7ms, 영상 16.8→16.7ms 및 두 조건0 dropped frames. 최종 정책(영상은 항상0엔진)의 단독3쌍 성능 검사를 다시 실행 중. rAF/CDP main thread/JS heap/프로세스CPU시간은 VM 표본이며 실제 GPU 점유율/총 GPU 메모리는 미측정.
- 기능 검사 PASS: 1440/760/900standalone 실제SVG굴절/중앙선명도/전후도구좌표불변/선택/고정/스크롤맵재사용/빠른토글cleanup/감소모션/login. 모바일390, 저사양, forced-colors, 감소투명도, 미지원경로 UA모의, import/map실패, 늦은import와설정변경시 plain대체/선택정상 PASS. 실제 Safari/Firefox 엔진 실기 검증으로 간주하지 않음.
- 기본 URL의 기존 rail cold-start와 capsule-states 웹/PWA배치/모바일 검사 PASS. vendor JS/worker/MIT 라이선스 변경 없음. README에 요청/실효 매개변수 및 제한 기록. 영상 실제 재생은 기존 Channel play 경로와 합성MP4를 사용.
- 로그/원본 PNG/성능 JSON: `/workspace/scratch/fromm-header-glass/`. 다음: 최종 성능·짧은 영상 → 검사/스크린샷 검토 → 체크포인트·Draft PR → 필수 CI → 기존 승인 범위에서 opt-in URL 배포·공개 검증. 실제 OS 설치형 PWA/Windows/Safari/Firefox 실기/실계정 스트림 미검증.

- 최종 단독 성능: gallery p95 16.8→16.7ms, mainThread106.0→142.6ms/1.2초, JSheap2.292→2.333MiB; 영상 p9516.8→16.7ms, dropped0/89→0/88, heap3.229→3.232MiB. 전후/단계별PNG·실제 녹화 MP4·픽셀 증거·초기 악화/최종 성능 원시는 docs/design-review/header-regular/에 보존. Node285 PASS/0FAIL/기존SKIP1. 영상 내보내기 CLI의 ss 표기 오류를0.3으로 교정해 원래 녹화를 재사용했고 제품 변경은 없었다. 현재 알려진 검사 실패 없음.

- 구현 체크포인트 cefb797 원격 저장 완료. CI의2코어 힌트에서 광학 경로가 우연히 제외되지 않도록 테스트에만8GB/8코어 힌트를 고정했고 저사양 사례는 명시적2GB로 별도 검사했다. 동일 힌트 기능 검사 PASS. Draft PR https://github.com/fffdsaw/fromm-viewer/pull/80, 마지막 완료 체크포인트 `5c6be1647b45fcb38e078d3bea113d4213dd51c5`. 최종 HEAD는 git log로 확인; 필수 CI 진행 후 최종 복구/병합/배포/실험 URL/공개 검증은 PR 설명 완료 기록에 남긴다.

# PC 상시 캡슐 검토 자료

- [변경 전 0개](before-zero.png) / [변경 전 선택](before-selected.png): 기준 main2ddd555와 동일 트리인 8772d64 작업 디렉터리를 읽어 촬영.
- 변경 후 PC1440: [0개](web-1440-zero.png) / [첫 선택](web-1440-one.png) / [여러 개](web-1440-multiple.png) / [X 해제](web-1440-cleared.png).
- 좁은 standalone **배치 모의**760px: [0개](pwa-layout-760-zero.png) / [선택](pwa-layout-760-one.png). 실제 OS 설치 증거는 아니다.
- [저장 버튼 안쪽 유리 효과 실제 녹화](save-highlight.mp4): Chromium CDP 화면의 상단190px crop, 합성 애니메이션 아님. 바깥 캡슐·숫자·클릭 영역은 제자리에 있고 save 장식층만 짧게 움직인다. 계정/개인 대화 없이 합성 데이터 사용.

PC 웹/standalone 배치 각1440/900/760에서 0·첫 선택·여러 개·X·실제 전체선택·busy·감소 모션·키보드·숫자 변경 검사 통과. 카드/다운로드/도구/정렬/스크롤 좌표 동일. 실제 SVG scale 변경과 짧은 렌즈 해제, 진행 텍스트 갱신 시 장식층 보존, 활성 저장의 흰 글자 확인. 직접 선택 및 실제 bulk bytes/names/실패 처리 회귀 통과. 모바일390 기존 조건부 도구·저장·넘침 최소 확인 통과.

전체 CI/병합/공개 배포의 최신 상태는 해당 PR 설명을 따른다. [인계 문서](../../PERSISTENT_CAPSULE_HANDOFF.md).

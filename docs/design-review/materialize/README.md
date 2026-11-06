# PC 저장 캡슐 머티리얼라이즈 검증

[전후 비교·영상 보기](comparison.html) · [실제 브라우저 녹화](materialize.mp4) · [측정 표본](motion-sample.json)

실제 Linux Chromium에서 합성 아티스트·대화를 사용했다. 계정·토큰·개인 대화는 사용하지 않았다. 전후1440px 화면은 같은 데이터·선택·scrollY600이며, 기준 main `cbcc315`와 동일한 트리 `c668f32`의 기존 작업 디렉터리를 읽어 촬영했다. 현재 앱 파일을 덮어쓰지 않았다.

- `before-media.png` / `after-media.png`: 36px 선택바 → 46px 민트 캡슐, 24px 둥근 불투명 헤더. 헤더·도구 줄·목록 위치 유지.
- `after-replay-1440.png` / `after-channel-760.png`: 기존 상단 도구 줄의 실제 공용 선택 기능. 좁은 PC 필터는 가로 스크롤한다.
- `01`~`08`: 첫 선택, 렌즈 전환, 정착, 해제, 퇴장 중 재선택, 복귀, 숨김 순서. 화면 캡처 지연이 있어 프레임 번호를 정확한 시간으로 간주하지 않는다.
- `materialize.mp4`: Chromium CDP 실제 화면 녹화의 상단190px만 잘라 H264로 인코딩. 애니메이션 재현 영상이나 이미지 합성이 아니다. 원본 viewport900×700. 등장 → 수 증가 → 해제 → 재선택 → 해제 약2초.
- `motion-sample.json`: 실제 SVG `feDisplacementMap` scale0→40.81, 스프링 최대1.031, 정착 후 RAF 중지. 1회 관찰이며 기기별 성능 보장 자료가 아니다. 종료 시 인스턴스1개 생성/1개 해제, live0.
- `header-occlusion.png` / `header-probe.json`: 헤더 뒤에 자홍색 테스트 면을 두고 상단 y0와 두 둥근 모서리의 RGB240/248/243을 확인. 테스트용 면은 촬영 후 제거했다. 메뉴·초점 표시는 overflow로 자르지 않았다.

번들 Meapri 공개 `flexRefraction()`을 실제 사용한다. 글자·클릭 영역은 변형/필터하지 않는다. SVG 맵은 최종 너비에서 한 번 준비하고 두께16px를 유지한다. 렌즈 크기·가장자리의 시각적 두께감과 굴절 강도가 변하며, 물리적 광선 추적이나 두께 맵의 매 프레임 재계산은 아니다. 이 작업은 캡슐에 한정하며 앱 전체의 Meapri 최종 적용을 뜻하지 않는다.

로컬 검증: Node281개 중280성공/0실패/1skip(기존 Agora 타입 미설치), PC1440/900/760 레이아웃, 실제 굴절/빠른 반전/카운트 변경/아티스트·탭 전환/자원 정리/지연 로딩/감소 모션/저사양·UA 대체/standalone 배치 모의, 관련 브라우저 회귀7종 통과. 모바일390 대화·미디어 두 화면은 넘침·헤더·필수 도구의 최소 확인만 수행했다.

미확인: Windows/macOS 실브라우저, 실제 Safari/Firefox/Edge, OS 설치 PWA, 실제 계정·실방송·물리 GPU/CPU/배터리. Safari UA 대체와 standalone 모의 검사를 실제 OS 실기로 기록하지 않는다. 필수 CI 결과는 [인계 문서](../../CAPSULE_MATERIALIZE_HANDOFF.md)에 기록한다.

# Fromm Viewer v0.44 — GitHub Pages

이 폴더의 **내용물**을 GitHub 저장소 루트에 업로드한 뒤 GitHub Pages를 켜면 됩니다.

## GitHub Pages
1. 새 GitHub 저장소를 만듭니다. 예: `fromm-viewer`
2. 이 `github_pages` 폴더 안의 `index.html`, `.nojekyll`, `README.md`를 저장소 루트에 업로드합니다.
3. 저장소 `Settings → Pages`
4. `Deploy from a branch`
5. Branch `main`, Folder `/(root)` 선택 후 저장
6. 생성된 `https://사용자명.github.io/fromm-viewer/` 주소로 접속합니다.

## Chrome 확장프로그램
같이 제공된 `chrome_extension` 폴더를 Chrome에 로드해야 합니다.

1. Chrome 주소창에 `chrome://extensions`
2. 우측 상단 `개발자 모드` 켜기
3. `압축해제된 확장 프로그램을 로드` 선택
4. `chrome_extension` 폴더 선택

이 확장프로그램은 GitHub Pages에서 Fromm API/미디어에 접근할 때 필요한 CORS/Origin 헤더만 보조합니다.
토큰이나 Device ID를 읽어가거나 자동 추출하는 JavaScript는 포함하지 않습니다.

## 인증
v0.44는 v0.43과 동일하게 Access token + Device ID 방식입니다.
한 번 정상 연결되면 해당 GitHub Pages 도메인의 브라우저 localStorage에 저장됩니다.
토큰/Device ID를 GitHub 저장소 파일 안에 직접 적지 마세요.

## v0.43에서 유지되는 기능
- 전체 대화 / 미디어 / 사진 / 영상 / 음성
- 전체 대화 실제 오래된 순
- 날짜 검색 및 달력 메시지 표시
- 검색 / 답장 표시 / 이모티콘
- 사진 확대
- 대량 선택 저장
- 이미 저장된 파일 건너뛰고 새 파일만 저장
- 실패 파일 상세 표시 및 실패 항목만 재시도
- 스크롤 시 컴팩트 탭바
- 구형 음성 URL fallback 및 브라우저 MIME 재시도

## 달라진 점
- Python/server.py 없음
- 127.0.0.1 서버 없음
- Windows 자동실행 BAT/VBS 없음
- Fromm API를 GitHub Pages에서 직접 호출
- companion Chrome extension 필요

Chrome/Edge 계열 브라우저를 권장합니다. 폴더 저장/기존 파일 검사는 File System Access API를 사용합니다.

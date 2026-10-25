# Fromm Viewer

Fromm 대화·사진·영상·음성을 보고 저장하는 웹 뷰어입니다.

**[Viewer 열기](https://fffdsaw.github.io/fromm-viewer/)**

## 다운로드

| 용도 | 다운로드 |
| --- | --- |
| Windows LIVE 포함 | [확장 1.0.8 + LIVE 도구 0.4.0](https://github.com/fffdsaw/fromm-viewer/releases/download/native-live-0.4.0/fromm-native-live-windows-x64.zip) |
| 대화·미디어·Replay·Channel | [확장 1.0.8](https://raw.githubusercontent.com/fffdsaw/fromm-viewer/main/chrome_extension.zip) |

LIVE 패키지에도 같은 확장이 들어 있습니다. 확장은 하나만 설치하세요.

## 설치

1. ZIP을 계속 사용할 폴더에 압축 해제합니다.
2. Chrome의 `chrome://extensions` 또는 Edge의 `edge://extensions`에서 **개발자 모드 → 압축해제된 확장프로그램 로드 → chrome_extension 폴더**를 선택합니다. 기존 Fromm 확장은 끕니다.
3. **Windows LIVE를 사용할 때만** `native-live/Install-Web-LIVE.cmd`를 실행합니다. Windows 64비트 Chrome·Edge를 지원하며 관리자 권한·Node.js 설치는 필요 없습니다.
4. [Viewer](https://fffdsaw.github.io/fromm-viewer/)를 열어 **Ctrl+F5 → 이메일 확인 → 로그인**합니다.

설치 폴더는 그대로 두세요. 옮겼다면 확장을 다시 로드하고 LIVE 도구를 다시 등록합니다.

## 사용

- **☰:** 아티스트 선택. 대화의 돋보기로 내용·날짜 검색.
- **내 글에 온 답장:** 전체 대화 → 돋보기 → **내 글에 온 답장**. ↑·↓로 전체 대화 속 답장을 찾고, **전체 대화 함께 보기**를 끄면 답장만 봅니다. 달력에는 대화가 있는 날짜만 표시합니다. [판정 기준과 한계](MY-REPLIES.md)를 참고하세요.
- **사진·영상:** 더블클릭으로 확대·재생. 여러 항목을 선택한 뒤 **저장**하면 일괄 저장.
- **투표:** 전체 대화의 투표 카드 또는 상단 **투표** 목록에서 질문·선택지·공개된 득표율과 아티스트 선택을 확인합니다. 선택지 사진은 **사진 저장**으로 다운로드합니다. 결과 창은 바깥 클릭이나 Esc로 닫습니다. 투표 참여 기능은 제공하지 않습니다.
- **라이브:** 상단 라이브에서 **LIVE → Replay → Channel** 선택. LIVE는 진행 중인 방송, Replay는 다시보기, Channel은 업로드 영상입니다.
- **Windows LIVE:** 방송을 선택하면 도구가 백그라운드에서 실행됩니다. 영상은 웹, 소리는 PC에서 재생되며 LIVE를 떠나면 연결이 종료됩니다.
- **LIVE 댓글:** **댓글 보기**를 누르고 영상 아래 입력창에서 직접 전송합니다.

## 업데이트

새 ZIP의 파일로 교체한 뒤 LIVE 도구를 다시 등록하고, 확장 새로고침과 Viewer **Ctrl+F5**를 진행합니다.

자세한 LIVE 설치·문제 해결은 [웹 LIVE 안내](WEB-LIVE.md)를 참고하세요.

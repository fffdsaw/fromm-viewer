/* Optional Fromm mobile sync diagnostic.
 * Does not persist or expose message bodies, tokens or device IDs.
 * Selected room only, poll interval 20 seconds, maximum 3 minutes.
 */
(function () {
  "use strict";
  const DURATION = 180000, INTERVAL = 20000;
  const probe = {
    active:false, inFlight:false, pendingResume:false,
    started:0, hiddenStart:0, hiddenDuration:0,
    hiddenTicks:0, hiddenRequests:0, hiddenSuccess:0,
    visibleSuccess:0, resumeSuccess:0, failures:0, newMessages:0,
    maxGap:0, lastTick:0, room:"", account:"", seen:new Set(),
    initialized:false, timer:null, info:"시작 전", ending:"대기"
  };

  const styles = document.createElement("style");
  styles.textContent = [
    "#frommSyncProbe{position:fixed;bottom:12px;left:12px;z-index:1450;font:13px system-ui,-apple-system,sans-serif;color:#ecf0fa}",
    "#frommSyncProbe button{font:inherit;cursor:pointer}",
    "#syncProbeToggle{background:#263348;border:1px solid #6e82ab;color:white;padding:10px 12px;border-radius:20px}",
    "#syncProbePanel{display:none;width:min(360px,calc(100vw - 25px));max-height:70vh;box-sizing:border-box;overflow:auto;background:#1b2637;border:1px solid #61738f;border-radius:14px;padding:14px;margin-bottom:8px;box-shadow:0 5px 28px #0009;line-height:1.5}",
    "#syncProbePanel strong{font-size:16px}#syncProbePanel p{margin:8px 0}",
    "#syncProbePanel .hint{font-size:12px;color:#cad4e5}",
    "#syncProbePanel .report{white-space:pre-line;background:#111a27;padding:8px;border-radius:8px;font-variant-numeric:tabular-nums}",
    "#syncProbePanel button{margin:8px 6px 6px 0;padding:8px 12px;background:#586e9e;color:white;border:0;border-radius:8px}",
    "#syncProbePanel button:disabled{opacity:.5}"
  ].join("\n");
  document.head.appendChild(styles);
  const root = document.createElement("div");
  root.id = "frommSyncProbe";
  const pane = document.createElement("div");
  pane.id = "syncProbePanel";
  const title = document.createElement("strong");
  title.textContent = "모바일 동기화 테스트";
  const guide = document.createElement("p");
  guide.className = "hint";
  guide.textContent = "프롬웹에 로그인하고 멤버 한 명을 선택한 뒤 시작하세요. 프롬 공식 앱으로 1~2분 전환했다가 여기로 돌아와 백그라운드 조회 횟수를 확인합니다. 20초마다 최대 3분간 해당 대화방만 조회합니다.";
  const begin = document.createElement("button"); begin.textContent = "검사 시작";
  const halt = document.createElement("button"); halt.textContent = "중지";
  const summary = document.createElement("p"); summary.className = "report";
  const result = document.createElement("p"); result.className = "hint";
  const caveat = document.createElement("p");
  caveat.className = "hint";
  caveat.textContent = "검사 결과는 이 탭의 메모리에만 보관합니다. 메시지 원문·로그인 토큰은 기록하거나 외부 AI에 보내지 않습니다. 숨긴 동안 성공 기록이 있더라도 실시간 동작을 보장하지 않습니다. 탭이 재시작되면 결과도 사라집니다.";
  pane.append(title, guide, begin, halt, summary, result, caveat);
  const toggle = document.createElement("button"); toggle.id = "syncProbeToggle";
  toggle.textContent = "동기화 테스트";
  toggle.onclick = function () {
    const open = pane.style.display !== "block";
    pane.style.display = open ? "block" : "none";
    toggle.setAttribute("aria-expanded", String(open));
  };
  root.append(pane, toggle);
  document.body.appendChild(root);

  function fmt(ms) { return Math.round(Math.max(0,ms)/1000) + "초"; }
  function render() {
    begin.disabled = probe.active;
    halt.disabled = !probe.active;
    const hidden = probe.hiddenDuration + (probe.hiddenStart ? Date.now()-probe.hiddenStart : 0);
    summary.textContent = [
      "상태: " + (probe.active ? "검사 중" : probe.ending),
      "경과: " + fmt(probe.started ? Date.now()-probe.started : 0) + " / 180초",
      "프롬 앱 전환 중 숨김 시간: " + fmt(hidden),
      "숨김 상태 타이머 실행: " + probe.hiddenTicks + "회",
      "숨김 상태 API 요청 시작: " + probe.hiddenRequests + "회",
      "숨김 상태에서 API 응답 완료: " + probe.hiddenSuccess + "회",
      "화면 복귀 뒤 조회 성공: " + probe.resumeSuccess + "회",
      "일반 화면 조회 성공: " + probe.visibleSuccess + "회",
      "최장 타이머 간격: " + fmt(probe.maxGap),
      "새 아티스트 메시지 감지: " + probe.newMessages + "건",
      "오류: " + probe.failures + "회"
    ].join("\n");
    let verdict = "먼저 프롬웹에서 멤버를 선택해 검사하세요.";
    if (probe.started && probe.hiddenSuccess) verdict =
      "백그라운드 API 조회가 한 번 이상 확인됐지만, 장시간 안정성은 별도 검증이 필요합니다.";
    else if (probe.started && hidden > 45000 && !probe.active) verdict =
      "숨겨진 동안 조회 성공이 확인되지 않았습니다. 앱 자체의 동기화가 필요할 수 있습니다.";
    else if (probe.started) verdict =
      "프롬 공식 앱으로 전환했다가 돌아와 결과를 확인하세요.";
    result.textContent = probe.info + "\n\n판정: " + verdict;
  }

  function stop(reason) {
    if (!probe.active) return;
    probe.active = false; probe.ending = reason;
    if (probe.timer) clearInterval(probe.timer);
    probe.timer = null;
    if (probe.hiddenStart) {
      probe.hiddenDuration += Date.now() - probe.hiddenStart;
      probe.hiddenStart = 0;
    }
    render();
  }

  function keyOf(message) {
    return String(message?.messageId || message?.id || message?.starChatId ||
      [message?.createdAt, message?.type, message?.userType].join(":"));
  }

  async function check(reason) {
    if (!probe.active) return;
    if (probe.inFlight) {
      if (reason === "resume") probe.pendingResume = true;
      return;
    }
    if (probe.initialized && Date.now() - probe.started >= DURATION && reason !== "resume") {
      stop("3분 테스트 완료"); return;
    }
    const room = String(state?.room?.hostChatRoomId || "");
    const account = currentAccountScope();
    if (!room || room !== probe.room || account !== probe.account) {
      stop("대화방·계정 변경으로 중지");
      probe.info = "검사 중 대화방이나 계정이 변경됐습니다.";
      render(); return;
    }
    const beganHidden = document.visibilityState === "hidden";
    if (beganHidden) probe.hiddenRequests++;
    probe.inFlight = true;
    probe.info = "프롬 API에 최신 메시지 조회 요청 중...";
    render();
    try {
      const response = await frommApiJson(FROMM_COMPAT.endpoints.messages(probe.room),{
        findStartAt:"2000-01-01T00:00:00.000Z",
        findEndAt:new Date().toISOString(),
        limit:"40"
      });
      if (!probe.active) return;
      const messages = extractMessages(response);
      if (!Array.isArray(messages)) throw new Error("Message list unavailable");
      const keys = new Set();
      let fresh = 0;
      for (const message of messages) {
        const key = keyOf(message);
        if (!key) continue;
        if (probe.initialized && !probe.seen.has(key) && isArtist(message)) fresh++;
        keys.add(key);
      }
      probe.seen = keys;
      probe.initialized = true;
      probe.newMessages += fresh;
      if (beganHidden && document.visibilityState === "hidden") probe.hiddenSuccess++;
      else if (reason === "resume") probe.resumeSuccess++;
      else probe.visibleSuccess++;
      probe.info = "조회 성공 (원문 저장 없음)" + (fresh ? " · 새 아티스트 메시지 " + fresh + "건" : "");
    } catch(error) {
      if (!probe.active) return;
      probe.failures++;
      const status = Number(error?.status || error?.httpStatus || 0);
      probe.info = status ? "조회 실패: HTTP " + status :
        "조회 실패: 네트워크 연결 또는 API 접근 제한 여부를 확인해 주세요.";
    } finally {
      probe.inFlight = false;
      render();
      if (probe.active && probe.pendingResume) {
        probe.pendingResume = false;
        check("resume");
      } else if (probe.active && Date.now()-probe.started >= DURATION) {
        stop("3분 테스트 완료");
      }
    }
  }

  function tick() {
    if (!probe.active) return;
    const now = Date.now();
    if (probe.lastTick) probe.maxGap = Math.max(probe.maxGap,now-probe.lastTick);
    probe.lastTick = now;
    if (document.visibilityState === "hidden") probe.hiddenTicks++;
    check("timer");
  }

  begin.onclick = function () {
    const auth = currentAuth();
    const activeRoom = state?.room;
    if (!auth?.token || !auth?.uuid || !activeRoom?.hostChatRoomId) {
      probe.info = "로그인한 뒤 왼쪽에서 멤버 대화방을 먼저 선택해주세요.";
      render(); return;
    }
    Object.assign(probe, {
      active:true,inFlight:false,pendingResume:false,
      started:Date.now(),hiddenStart:0,hiddenDuration:0,
      hiddenTicks:0,hiddenRequests:0,hiddenSuccess:0,
      visibleSuccess:0,resumeSuccess:0,failures:0,newMessages:0,
      maxGap:0,lastTick:Date.now(),room:String(activeRoom.hostChatRoomId),
      account:currentAccountScope(),seen:new Set(),initialized:false,
      info:"첫 조회로 기준 메시지 확인 중...",ending:"대기"
    });
    probe.timer = setInterval(tick,INTERVAL);
    check("initial");
    render();
  };
  halt.onclick = function () {stop("사용자가 중지함");};
  document.addEventListener("visibilitychange",function () {
    if (!probe.active) return;
    if (document.visibilityState === "hidden") {
      if (!probe.hiddenStart) probe.hiddenStart=Date.now();
    } else {
      if (probe.hiddenStart) {
        probe.hiddenDuration += Date.now()-probe.hiddenStart;
        probe.hiddenStart=0;
      }
      check("resume");
    }
    render();
  });
  window.addEventListener("pagehide",function () {stop("페이지 종료");});
  render();
})();
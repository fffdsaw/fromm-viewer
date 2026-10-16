// Explicit, read-only LIVE chat check. No account/RTC token substitution or sends.
(() => {
  const origin = 'https://live-chat-api.frommyarti.com';
  class ProbeError extends Error {
    constructor(code, httpStatus = 0, shape = null) { super(code); this.code = code; this.httpStatus = httpStatus; this.shape = shape; }
  }
  const type = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const pause = (ms, signal) => new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ProbeError('cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, {once: true});
  });
  async function probe({roomId, token, signal, current = () => true, fetcher = fetch, wait = pause}) {
    if (typeof roomId !== 'string' || !roomId || roomId.length > 256 ||
        typeof token !== 'string' || !token || token.length > 16384 || /[\x00-\x20\x7f]/.test(token)) {
      throw new ProbeError('missing-chat-context');
    }
    const assertCurrent = () => { if (!current() || signal?.aborted) throw new ProbeError('cancelled'); };
    async function get(path, cursor) {
      assertCurrent();
      const url = new URL(path, origin);
      if (cursor !== undefined) url.searchParams.set('cursor', String(cursor));
      const response = await fetcher(url.href, {method: 'GET', credentials: 'omit', redirect: 'error',
        cache: 'no-store', signal, headers: {Accept: 'application/json', Authorization: 'Bearer ' + token}});
      assertCurrent();
      if (!response.ok) throw new ProbeError('http-error', response.status);
      if (Number(response.headers.get('content-length')) > 1048576) throw new ProbeError('response-too-large');
      const text = await response.text();
      assertCurrent();
      if (text.length > 1048576) throw new ProbeError('response-too-large');
      let envelope;
      try { envelope = JSON.parse(text); } catch { throw new ProbeError('unknown-response'); }
      if (envelope?.success !== true || !envelope.data || typeof envelope.data !== 'object') {
        throw new ProbeError('api-rejected', 0, {success: type(envelope?.success), data: type(envelope?.data)});
      }
      return envelope.data;
    }
    const id = encodeURIComponent(roomId);
    const room = (await get('/live-chat/rooms/' + id)).liveChatRoom;
    if (!room || typeof room.isFrozen !== 'boolean' ||
        (room.isBanned !== null && typeof room.isBanned !== 'boolean')) throw new ProbeError('unknown-room-response', 0,
          {room: type(room), frozen: type(room?.isFrozen), banned: type(room?.isBanned)});
    const policy = {frozen: room.isFrozen, banned: room.isBanned,
      mutePresent: room.muteExpiresAt !== null && room.muteExpiresAt !== undefined};
    if (policy.banned) return {status: 'banned', policy, samples: []};
    let cursor = Date.now();
    const samples = [];
    for (let index = 0; index < 2; index++) {
      if (index) { await wait(2000, signal); assertCurrent(); }
      const data = await get('/live-chat/' + id + '/messages', cursor);
      if (!Array.isArray(data.messages) || !Array.isArray(data.deletedMessages) ||
          data.messages.some(message => !message || typeof message !== 'object' || Array.isArray(message)) ||
          data.deletedMessages.some(message => typeof message !== 'string') ||
          !(data.cursor === null || (Number.isSafeInteger(data.cursor) && data.cursor >= 0))) {
        throw new ProbeError('unknown-messages-response', 0,
          {messages: type(data.messages), firstMessage: type(data.messages?.[0]), deletedMessages: type(data.deletedMessages), cursor: type(data.cursor)});
      }
      samples.push({messageCount: data.messages.length, deletedCount: data.deletedMessages.length,
        cursorPresent: data.cursor !== null});
      if (data.cursor !== null) cursor = data.cursor;
    }
    return {status: samples.some(sample => sample.messageCount > 0) ? 'messages-received' : 'connected-no-messages', policy, samples};
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {probe, ProbeError}; return; }
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  let controller = null, report = null;
  const labels = {
    'checking': '댓글 수신 확인 중…',
    'missing-chat-context': '현재 입장 응답에 채팅 토큰이 없습니다. 재생은 그대로 유지합니다.',
    'unsupported-room': '일반 LIVE의 정상 채팅 입장 정보가 있을 때 확인할 수 있습니다.',
    'unsupported-provider': '현재 입장 응답의 채팅 제공자를 확인해야 합니다. 진단을 복사해 알려주세요.',
    'messages-received': '공식 댓글 수신 확인됨',
    'connected-no-messages': '채팅 읽기 연결 확인 · 점검 중 새 댓글은 없었습니다.',
    'banned': '현재 계정의 채팅 이용이 제한되어 수신 확인을 중단했습니다.',
    'http-error': '채팅 서버가 요청을 거절했습니다. 진단을 복사해 알려주세요.',
    'network-error': '채팅 서버에 연결하지 못했습니다. 진단을 복사해 알려주세요.',
    'timeout': '채팅 확인 시간이 초과되었습니다.',
    'api-rejected': '채팅 API가 성공 응답을 반환하지 않았습니다.',
    'unknown-response': '채팅 응답 형식을 확인하지 못했습니다.',
    'unknown-room-response': '채팅 권한 응답 형식을 확인하지 못했습니다.',
    'unknown-messages-response': '댓글 목록 응답 형식을 확인하지 못했습니다.',
    'response-too-large': '채팅 응답이 점검 크기 제한을 초과했습니다.'
  };
  const isLive = () => state.filter === 'live' && state.live.centerMode === 'live';
  function cancel() { controller?.abort(); controller = null; report = null; }
  function sync() {
    const head = timeline.querySelector('.live-head');
    if (!head || !isLive()) return;
    let button = document.getElementById('liveChatProbeBtn');
    if (!button) {
      button = document.createElement('button'); button.id = 'liveChatProbeBtn';
      button.className = 'live-mini-btn'; button.type = 'button'; button.textContent = '댓글 확인';
      button.title = '공식 채팅 권한과 수신을 읽기 전용으로 확인합니다. 댓글은 전송하지 않습니다.';
      button.addEventListener('click', run); head.append(button);
    }
    button.disabled = !!controller || !state.live.config?.isStreaming || !!state.live.config?.mock;
  }
  function show() {
    const stage = timeline.querySelector('.live-stage');
    if (!stage || !report) return;
    let panel = document.getElementById('liveChatProbeStatus');
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'liveChatProbeStatus';
      panel.style.cssText = 'position:absolute;left:12px;right:12px;bottom:12px;z-index:5;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.78);color:#fff;font-size:12px;display:flex;align-items:center;gap:8px';
      const text = document.createElement('span'); text.className = 'live-chat-probe-text';
      text.style.cssText = 'flex:1;min-width:0;line-height:1.5'; text.setAttribute('role', 'status');
      const copy = document.createElement('button'); copy.className = 'live-mini-btn'; copy.textContent = '진단 복사'; copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); copy.textContent = '복사됨'; }
        catch { copy.textContent = '복사 실패'; }
      });
      const dismiss = document.createElement('button'); dismiss.className = 'live-mini-btn'; dismiss.textContent = '닫기'; dismiss.type = 'button';
      dismiss.addEventListener('click', () => { cancel(); panel.remove(); sync(); });
      panel.append(text, copy, dismiss); stage.append(panel);
    }
    const count = report.samples?.reduce((total, sample) => total + sample.messageCount, 0) || 0;
    const label = (labels[report.status] || labels['network-error']) + (count ? ' · ' + count + '개' : '') +
      (report.httpStatus ? ' (HTTP ' + report.httpStatus + ')' : '');
    const text = panel.querySelector('.live-chat-probe-text');
    if (text.textContent !== label) text.textContent = label;
  }
  async function run() {
    if (controller || !isLive() || !state.live.config?.isStreaming || state.live.config?.mock) return;
    const live = state.live, roomId = live.currentLiveRoomId, sequence = live.connectionSeq, generation = state.scanGeneration;
    const token = live.liveChat?.chatToken;
    report = {probeVersion: 1, status: 'checking', liveChatPresent: !!live.liveChat,
      chatTokenPresent: typeof token === 'string' && !!token, liveChatErrorPresent: !!live.liveChatError,
      provider: typeof live.chatProvider === 'string' && live.chatProvider.toLowerCase() === 'fromm' ? 'fromm' : live.chatProvider ? 'other' : 'missing'};
    if (live.entry?.kind !== 'channel' || typeof roomId !== 'string' || !roomId) {
      report.status = 'unsupported-room'; show(); return;
    }
    if (typeof token !== 'string' || !token) { report.status = 'missing-chat-context'; show(); return; }
    if (report.provider !== 'fromm') { report.status = 'unsupported-provider'; show(); return; }
    const owner = controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; owner.abort(); }, 15000);
    const current = () => controller === owner && isLive() && generation === state.scanGeneration &&
      sequence === live.connectionSeq && roomId === live.currentLiveRoomId && token === live.liveChat?.chatToken;
    sync(); show();
    try {
      // Keep the separate chat token out of the localhost account/API proxy.
      const fetcher = typeof nativeViewerFetch === 'function' ? nativeViewerFetch : fetch;
      const result = await probe({roomId, token, signal: owner.signal, current, fetcher});
      if (current()) Object.assign(report, result);
    } catch (error) {
      if (current()) {
        report.status = timedOut ? 'timeout' : error instanceof ProbeError && labels[error.code] ? error.code : 'network-error';
        if (error instanceof ProbeError && error.httpStatus) report.httpStatus = error.httpStatus;
        if (error instanceof ProbeError && error.shape) report.responseShape = error.shape;
      }
    } finally {
      clearTimeout(timeout);
      if (controller === owner) {
        if (!current()) { report = null; document.getElementById('liveChatProbeStatus')?.remove(); }
        controller = null; sync(); show();
      }
    }
  }
  const render = renderLiveView, stop = stopLivePlayback;
  renderLiveView = function (...args) { cancel(); const result = render.apply(this, args); sync(); return result; };
  stopLivePlayback = function (...args) { cancel(); document.getElementById('liveChatProbeStatus')?.remove(); const result = stop.apply(this, args); sync(); return result; };
  new MutationObserver(sync).observe(timeline, {childList: true, subtree: true});
  window.addEventListener('pagehide', cancel);
  window.FrommChatProbe = () => report ? JSON.parse(JSON.stringify(report)) : null;
  sync();
})();

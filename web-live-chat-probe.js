// Opt-in, read-only LIVE comments. No account/RTC token substitution or sends.
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
  async function probe({roomId, token, signal, current = () => true, fetcher = fetch, wait = pause, sampleLimit = 2, onPage = () => {}}) {
    if (typeof roomId !== 'string' || !roomId || roomId.length > 256 ||
        typeof token !== 'string' || !token || token.length > 16384 || /[\x00-\x20\x7f]/.test(token)) {
      throw new ProbeError('missing-chat-context');
    }
    const assertCurrent = () => { if (!current() || signal?.aborted) throw new ProbeError('cancelled'); };
    async function get(path, cursor) {
      assertCurrent();
      const url = new URL(path, origin);
      if (cursor !== undefined) url.searchParams.set('cursor', String(cursor));
      const request = new AbortController();
      const relay = () => request.abort();
      signal?.addEventListener('abort', relay, {once: true});
      let expired = false;
      const timer = setTimeout(() => { expired = true; request.abort(); }, 8000);
      try {
      const response = await fetcher(url.href, {method: 'GET', credentials: 'omit', redirect: 'error',
        cache: 'no-store', signal: request.signal, headers: {Accept: 'application/json', Authorization: 'Bearer ' + token}});
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
      } catch (error) {
        if (error instanceof ProbeError) throw error;
        throw new ProbeError(expired ? 'timeout' : signal?.aborted ? 'cancelled' : 'network-error');
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', relay); }
    }
    const id = encodeURIComponent(roomId);
    async function readPolicy() {
    const room = (await get('/live-chat/rooms/' + id)).liveChatRoom;
    if (!room || typeof room.isFrozen !== 'boolean' ||
        (room.isBanned !== null && typeof room.isBanned !== 'boolean')) throw new ProbeError('unknown-room-response', 0,
          {room: type(room), frozen: type(room?.isFrozen), banned: type(room?.isBanned)});
    return {frozen: room.isFrozen, banned: room.isBanned,
      mutePresent: room.muteExpiresAt !== null && room.muteExpiresAt !== undefined};
    }
    let policy = await readPolicy();
    if (policy.banned) return {status: 'banned', policy, samples: []};
    let cursor = Date.now();
    const samples = [];
    let received = false;
    for (let index = 0; index < sampleLimit; index++) {
      if (index) { await wait(2000, signal); assertCurrent(); }
      if (index && index % 15 === 0) {
        policy = await readPolicy();
        if (policy.banned) return {status: 'banned', policy, samples};
      }
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
      if (samples.length > 8) samples.shift();
      received ||= data.messages.length > 0;
      if (data.cursor !== null) cursor = data.cursor;
      assertCurrent();
      onPage({policy, samples: samples.map(sample => ({...sample})), messages: data.messages, deletedMessages: data.deletedMessages});
    }
    return {status: received ? 'messages-received' : 'connected-no-messages', policy, samples};
  }
  function messageStore() { return {items: new Map(), deleted: new Set(), seen: new Set(), version: 0}; }
  function applyMessages(store, messages, deletedMessages) {
    let invalidCount = 0, addedCount = 0;
    for (const id of deletedMessages) {
      if (store.items.delete(id)) store.version++;
      store.deleted.add(id);
    }
    while (store.deleted.size > 500) store.deleted.delete(store.deleted.values().next().value);
    for (const message of messages) {
      const {messageId, content, nickname, createdAt} = message;
      if (typeof messageId !== 'string' || !messageId || messageId.length > 256 ||
          typeof content !== 'string' || content.length > 20000 || typeof nickname !== 'string' || nickname.length > 500 ||
          !Number.isSafeInteger(createdAt) || createdAt < 0) { invalidCount++; continue; }
      if (store.deleted.has(messageId)) continue;
      const old = store.items.get(messageId);
      if (!old && store.seen.has(messageId)) continue;
      if (old && old.content === content && old.nickname === nickname && old.createdAt === createdAt) continue;
      if (!old) { addedCount++; store.seen.add(messageId); }
      store.items.set(messageId, {content, nickname, createdAt}); store.version++;
    }
    while (store.seen.size > 2000) store.seen.delete(store.seen.values().next().value);
    if (store.items.size > 100) {
      const oldest = [...store.items].sort((a, b) => a[1].createdAt - b[1].createdAt).slice(0, store.items.size - 100);
      for (const [id] of oldest) store.items.delete(id);
    }
    return {invalidCount, addedCount};
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {probe, ProbeError, messageStore, applyMessages}; return; }
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  const style = document.createElement('style');
  style.textContent = '.live-comments-overlay{--live-comments-max:48%}@media(max-width:700px){.live-comments-overlay{--live-comments-max:70%}}';
  document.head.append(style);
  let controller = null, report = null, comments = messageStore(), renderedVersion = -1;
  const labels = {
    'checking': '댓글 수신 확인 중…',
    'missing-chat-context': '현재 입장 응답에 채팅 토큰이 없습니다. 재생은 그대로 유지합니다.',
    'unsupported-room': '일반 LIVE의 정상 채팅 입장 정보가 있을 때 확인할 수 있습니다.',
    'unsupported-provider': '현재 입장 응답의 채팅 제공자를 확인해야 합니다. 진단을 복사해 알려주세요.',
    'messages-received': '공식 댓글 수신 확인됨',
    'connected-no-messages': '채팅 읽기 연결 확인 · 점검 중 새 댓글은 없었습니다.',
    'unrenderable-messages': '댓글은 수신됐지만 표시 형식을 확인해야 합니다. 진단을 복사해 알려주세요.',
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
  function cancel() { controller?.abort(); controller = null; report = null; comments = messageStore(); renderedVersion = -1; }
  function sync() {
    const head = timeline.querySelector('.live-head');
    if (!head || !isLive()) return;
    let button = document.getElementById('liveChatProbeBtn');
    if (!button) {
      button = document.createElement('button'); button.id = 'liveChatProbeBtn';
      button.className = 'live-mini-btn'; button.type = 'button';
      button.title = '영상 아래쪽에 실제 LIVE 댓글을 표시합니다. 현재는 댓글 보기만 지원합니다.';
      button.addEventListener('click', run); head.append(button);
    }
    const label = controller ? '댓글 숨기기' : '댓글 보기';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(!!controller));
    button.disabled = !state.live.config?.isStreaming || !!state.live.config?.mock;
  }
  function show() {
    const stage = timeline.querySelector('.live-stage');
    if (!stage || !report) return;
    let panel = document.getElementById('liveChatProbeStatus');
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'liveChatProbeStatus';
      panel.className = 'live-comments-overlay';
      panel.style.cssText = 'position:absolute;left:50%;width:min(100%,560px);transform:translateX(-50%);bottom:0;z-index:5;max-height:var(--live-comments-max);padding:24px 12px 10px;background:linear-gradient(transparent,rgba(0,0,0,.76));color:#fff;font-size:12px;display:flex;flex-direction:column;gap:8px;pointer-events:none';
      const list = document.createElement('div'); list.className = 'live-comments-list';
      list.setAttribute('aria-label', 'LIVE 댓글'); list.style.cssText = 'min-height:0;overflow:auto;display:flex;flex-direction:column;gap:7px;pointer-events:auto;text-shadow:0 1px 3px #000';
      const controls = document.createElement('div'); controls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;pointer-events:auto';
      const text = document.createElement('span'); text.className = 'live-chat-probe-text';
      text.style.cssText = 'flex:1;min-width:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'; text.setAttribute('role', 'status');
      const copy = document.createElement('button'); copy.className = 'live-mini-btn'; copy.textContent = '진단 복사'; copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); copy.textContent = '복사됨'; }
        catch { copy.textContent = '복사 실패'; }
      });
      const dismiss = document.createElement('button'); dismiss.className = 'live-mini-btn'; dismiss.textContent = '닫기'; dismiss.type = 'button';
      dismiss.addEventListener('click', () => { cancel(); panel.remove(); sync(); });
      const input = document.createElement('input'); input.type = 'text'; input.disabled = true;
      input.placeholder = '현재는 댓글 보기만 지원합니다'; input.setAttribute('aria-label', '댓글 전송은 아직 지원되지 않습니다');
      input.style.cssText = 'width:100%;min-width:0;box-sizing:border-box;height:34px;border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:0 12px;background:rgba(40,43,50,.82);color:#b8bec7;flex-shrink:0';
      controls.append(text, copy, dismiss); panel.append(list, controls, input); stage.append(panel);
    }
    if (renderedVersion !== comments.version) {
      const list = panel.querySelector('.live-comments-list');
      const follow = list.scrollHeight - list.clientHeight - list.scrollTop < 36;
      const rows = [...comments.items.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-30).map(message => {
        const row = document.createElement('div'); row.className = 'live-comment-row'; row.style.cssText = 'display:flex;gap:10px;flex:0 0 auto;line-height:1.5';
        const name = document.createElement('strong'); name.style.cssText = 'flex:0 0 28%;max-width:140px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
        name.textContent = message.nickname; name.title = message.nickname;
        const content = document.createElement('span'); content.style.cssText = 'min-width:0;white-space:pre-wrap;overflow-wrap:anywhere'; content.textContent = message.content;
        row.append(name, content); return row;
      });
      list.replaceChildren(...rows); if (follow) list.scrollTop = list.scrollHeight;
      renderedVersion = comments.version;
    }
    const baseLabel = controller && report.status === 'connected-no-messages' ? '새 댓글을 기다리고 있습니다' :
      controller && report.status === 'messages-received' ? '댓글 수신 중' : labels[report.status] || labels['network-error'];
    const label = baseLabel + (report.receivedCount ? ' · ' + report.receivedCount + '개' : '') +
      (report.httpStatus ? ' (HTTP ' + report.httpStatus + ')' : '');
    const text = panel.querySelector('.live-chat-probe-text');
    if (text.textContent !== label) { text.textContent = label; text.title = label; }
  }
  async function run() {
    if (controller) { cancel(); document.getElementById('liveChatProbeStatus')?.remove(); sync(); return; }
    if (!isLive() || !state.live.config?.isStreaming || state.live.config?.mock) return;
    const live = state.live, roomId = live.currentLiveRoomId, sequence = live.connectionSeq, generation = state.scanGeneration;
    const token = live.liveChat?.chatToken;
    comments = messageStore(); renderedVersion = -1;
    report = {probeVersion: 2, mode: 'read-only-comments', status: 'checking', receivedCount: 0, invalidMessageCount: 0, liveChatPresent: !!live.liveChat,
      chatTokenPresent: typeof token === 'string' && !!token, liveChatErrorPresent: !!live.liveChatError,
      provider: typeof live.chatProvider === 'string' && live.chatProvider.toLowerCase() === 'fromm' ? 'fromm' : live.chatProvider ? 'other' : 'missing'};
    if (live.entry?.kind !== 'channel' || typeof roomId !== 'string' || !roomId) {
      report.status = 'unsupported-room'; show(); return;
    }
    if (typeof token !== 'string' || !token) { report.status = 'missing-chat-context'; show(); return; }
    if (report.provider !== 'fromm') { report.status = 'unsupported-provider'; show(); return; }
    const owner = controller = new AbortController();
    const current = () => controller === owner && isLive() && generation === state.scanGeneration &&
      sequence === live.connectionSeq && roomId === live.currentLiveRoomId && token === live.liveChat?.chatToken;
    sync(); show();
    try {
      // Keep the separate chat token out of the localhost account/API proxy.
      const fetcher = typeof nativeViewerFetch === 'function' ? nativeViewerFetch : fetch;
      const result = await probe({roomId, token, signal: owner.signal, current, fetcher, sampleLimit: Infinity, onPage: page => {
        if (!current()) return;
        const updated = applyMessages(comments, page.messages, page.deletedMessages);
        report.receivedCount += updated.addedCount; report.invalidMessageCount += updated.invalidCount;
        Object.assign(report, {policy: page.policy, samples: page.samples,
          status: comments.items.size ? 'messages-received' : updated.invalidCount ? 'unrenderable-messages' : 'connected-no-messages'});
        if (updated.invalidCount) {
          const invalid = page.messages[0];
          report.messageShape = {messageId: type(invalid?.messageId), content: type(invalid?.content), nickname: type(invalid?.nickname), createdAt: type(invalid?.createdAt)};
        }
        show();
      }});
      if (current()) {
        if (result.status === 'banned') { comments = messageStore(); renderedVersion = -1; }
        Object.assign(report, result);
      }
    } catch (error) {
      if (current()) {
        report.status = error instanceof ProbeError && labels[error.code] ? error.code : 'network-error';
        if (error instanceof ProbeError && [401, 403].includes(error.httpStatus)) { comments = messageStore(); renderedVersion = -1; }
        if (error instanceof ProbeError && error.httpStatus) report.httpStatus = error.httpStatus;
        if (error instanceof ProbeError && error.shape) report.responseShape = error.shape;
      }
    } finally {
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

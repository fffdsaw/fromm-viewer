// Opt-in LIVE comments. Only explicit user submissions use the separate chat token.
(() => {
  const origin = 'https://live-chat-api.frommyarti.com';
  class ProbeError extends Error {
    constructor(code, httpStatus = 0, shape = null) { super(code); this.code = code; this.httpStatus = httpStatus; this.shape = shape; }
  }
  const type = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  function roomPolicy(room, code = 'unknown-room-response') {
    const shape = {room: type(room), frozen: type(room?.isFrozen), banned: type(room?.isBanned), mute: type(room?.muteExpiresAt)};
    if (!room || typeof room !== 'object' || Array.isArray(room) || typeof room.isFrozen !== 'boolean' ||
        (room.isBanned != null && typeof room.isBanned !== 'boolean')) throw new ProbeError(code, 0, shape);
    // Official Moshi adapter defaults omitted nullable fields to null. The domain
    // mapper bans only Boolean.TRUE; the repository treats non-null expiry as muted.
    return {frozen: room.isFrozen, banned: room.isBanned === true, mutePresent: room.muteExpiresAt != null};
  }
  const pause = (ms, signal) => new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new ProbeError('cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, {once: true});
  });
  // A local input bound, not a claim about the provider's maximum length.
  const inputLimit = 500;
  function parseSendAck(text) {
    // The official Android client reads SQS XML, not a JSON success envelope.
    // Accept only the bounded, plain SQS response grammar. Never process DTDs/entities.
    if (typeof text !== 'string' || text.length > 16384) throw new ProbeError('send-unconfirmed');
    const atom = '[A-Za-z0-9_-]{1,256}';
    const fields = '(?:<(?:MD5OfMessageBody|MD5OfMessageAttributes|MD5OfMessageSystemAttributes)>[a-fA-F0-9]{32}</(?:MD5OfMessageBody|MD5OfMessageAttributes|MD5OfMessageSystemAttributes)>\\s*|<SequenceNumber>[0-9]{1,128}</SequenceNumber>\\s*)*';
    const expression = new RegExp('^\\s*(?:<\\?xml\\s+version=["\\\']1\\.0["\\\'](?:\\s+encoding=["\\\']UTF-8["\\\'])?\\s*\\?>\\s*)?' +
      '<SendMessageResponse(?:\\s+xmlns=["\\\']https?:\\/\\/queue\\.amazonaws\\.com\\/doc\\/2012-11-05\\/["\\\'])?\\s*>\\s*' +
      '<SendMessageResult>\\s*' + fields + '<MessageId>(' + atom + ')</MessageId>\\s*' + fields + '</SendMessageResult>\\s*' +
      '(?:<ResponseMetadata>\\s*<RequestId>' + atom + '</RequestId>\\s*</ResponseMetadata>\\s*)?</SendMessageResponse>\\s*$');
    const match = expression.exec(text);
    if (!match) throw new ProbeError('send-unconfirmed');
    // Matching field names must agree, even for nonessential checksum fields.
    for (const field of text.matchAll(/<(MD5Of\w+)>[^<]*<\/(MD5Of\w+)>/g)) {
      if (field[1] !== field[2]) throw new ProbeError('send-unconfirmed');
    }
    return match[1];
  }
  async function sendNormalComment({roomId, token, content, signal, current = () => true, fetcher = fetch}) {
    if (typeof roomId !== 'string' || !roomId || roomId.length > 256 ||
        typeof token !== 'string' || !token || token.length > 16384 || /[\x00-\x20\x7f]/.test(token)) throw new ProbeError('missing-chat-context');
    if (typeof content !== 'string' || !content.trim() || content.length > inputLimit ||
        /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(content)) throw new ProbeError('invalid-comment');
    const assertCurrent = () => { if (!current() || signal?.aborted) throw new ProbeError('cancelled'); };
    let posted = false;
    async function request(path, options) {
      assertCurrent();
      const owner = new AbortController(), relay = () => owner.abort();
      signal?.addEventListener('abort', relay, {once: true});
      let expired = false;
      const timer = setTimeout(() => { expired = true; owner.abort(); }, 8000);
      try {
        if (options.method === 'POST') posted = true;
        const response = await fetcher(origin + path, {...options, credentials: 'omit', redirect: 'error', cache: 'no-store',
          signal: owner.signal, headers: {Authorization: 'Bearer ' + token, ...options.headers}});
        assertCurrent();
        if (!response.ok) {
          // 5xx may happen after a write; do not invite a duplicate retry.
          throw new ProbeError(posted && response.status >= 500 ? 'send-unconfirmed' : 'http-error', response.status,
            {stage: posted ? 'post-response' : 'policy-response', postStarted: posted});
        }
        if (Number(response.headers.get('content-length')) > 16384) throw new ProbeError(posted ? 'send-unconfirmed' : 'response-too-large');
        const text = await response.text(); assertCurrent();
        if (text.length > 16384) throw new ProbeError(posted ? 'send-unconfirmed' : 'response-too-large');
        return text;
      } catch (error) {
        if (error instanceof ProbeError && error.code !== 'cancelled') throw error;
        throw new ProbeError(posted ? 'send-unconfirmed' : signal?.aborted || !current() ? 'cancelled' : 'send-policy-unavailable', 0,
          {stage: posted ? 'post-request' : 'policy-request', postStarted: posted, reason: expired ? 'timeout' : owner.signal.aborted ? 'cancelled' : 'network-error'});
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', relay); }
    }
    // Never infer permission to write from successful reading. Recheck every submission.
    const policyText = await request('/live-chat/rooms/' + encodeURIComponent(roomId), {method: 'GET', headers: {Accept: 'application/json'}});
    let envelope;
    try { envelope = JSON.parse(policyText); } catch { throw new ProbeError('send-policy-unavailable', 0, {stage: 'policy-json', postStarted: false}); }
    if (envelope?.success !== true) throw new ProbeError('send-policy-unavailable', 0,
      {stage: 'policy-envelope', postStarted: false, success: type(envelope?.success), data: type(envelope?.data)});
    let policy;
    try { policy = roomPolicy(envelope?.data?.liveChatRoom, 'send-policy-unavailable'); }
    catch (error) {
      if (error instanceof ProbeError) error.shape = {stage: 'policy-schema', postStarted: false, ...error.shape};
      throw error;
    }
    if (policy.banned) throw new ProbeError('send-banned');
    if (policy.frozen) throw new ProbeError('send-frozen');
    if (policy.mutePresent) throw new ProbeError('send-muted');
    const text = await request('/live-chat/messages/normal', {method: 'POST', headers: {Accept: 'application/xml', 'Content-Type': 'application/json'},
      body: JSON.stringify({liveChatRoomId: roomId, content, chatToken: token})});
    return {messageId: parseSendAck(text)};
  }
  async function probe({roomId, token, signal, current = () => true, fetcher = fetch, wait = pause,
    now = () => performance.now(), sampleLimit = 2, onPage = () => {}}) {
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
    return roomPolicy(room);
    }
    let policy = await readPolicy();
    if (policy.banned) return {status: 'banned', policy, samples: []};
    let cursor = Date.now();
    const samples = [];
    let received = false, nextPollAt = now(), policyCheckedAt = now();
    for (let index = 0; index < sampleLimit; index++) {
      if (index) { const delay = Math.max(0, nextPollAt - now()); if (delay) await wait(delay, signal); assertCurrent(); }
      const cycleStarted = now();
      if (index && cycleStarted - policyCheckedAt >= 30000) {
        policy = await readPolicy();
        policyCheckedAt = now();
        if (policy.banned) return {status: 'banned', policy, samples};
      }
      const requestStarted = now();
      const data = await get('/live-chat/' + id + '/messages', cursor);
      if (!Array.isArray(data.messages) || !Array.isArray(data.deletedMessages) ||
          data.messages.some(message => !message || typeof message !== 'object' || Array.isArray(message)) ||
          data.deletedMessages.some(message => typeof message !== 'string') ||
          !(data.cursor === null || (Number.isSafeInteger(data.cursor) && data.cursor >= 0))) {
        throw new ProbeError('unknown-messages-response', 0,
          {messages: type(data.messages), firstMessage: type(data.messages?.[0]), deletedMessages: type(data.deletedMessages), cursor: type(data.cursor)});
      }
      samples.push({messageCount: data.messages.length, deletedCount: data.deletedMessages.length,
        cursorPresent: data.cursor !== null, requestMs: Math.max(0, Math.round(now() - requestStarted))});
      if (samples.length > 8) samples.shift();
      received ||= data.messages.length > 0;
      if (data.cursor !== null) cursor = data.cursor;
      assertCurrent();
      onPage({policy, samples: samples.map(sample => ({...sample})), messages: data.messages, deletedMessages: data.deletedMessages});
      // At most one poll per second; don't add a full interval after a slow response.
      nextPollAt = requestStarted + 1000;
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
  if (typeof module !== 'undefined' && module.exports) { module.exports = {probe, ProbeError, messageStore, applyMessages, sendNormalComment, parseSendAck, inputLimit}; return; }
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  const style = document.createElement('style');
  style.textContent = '.live-comments-overlay{--live-comments-max:48%}.live-comments-list{scrollbar-width:none;overscroll-behavior:contain;overflow-anchor:none}.live-comment-row{flex-shrink:0}.live-comments-unread{position:absolute;right:0;bottom:30px;white-space:nowrap;font-size:11px;background:#15171bd9;border-radius:10px;padding:2px 6px}.live-comments-unread:empty{display:none}.live-comments-list::-webkit-scrollbar{display:none}.live-comments-latest{position:absolute;right:4px;bottom:4px;width:28px;height:28px;border-radius:50%;border:1px solid #ffffff70;background:#15171bd9;color:#fff;padding:0;display:grid;place-items:center;cursor:pointer;pointer-events:auto}.live-comments-latest[hidden]{display:none}@media(max-width:700px){.live-comments-overlay{--live-comments-max:70%}}';
  document.head.append(style);
  let controller = null, report = null, comments = messageStore(), renderedVersion = -1;
  let sendController = null, session = null, composing = false, ackId = null;
  let uncertainAttempt = null, activeAttempt = null;
  let followLatest = true, unreadCount = 0;
  const sendLabels = {
    'sending': '댓글 전송 중…',
    'accepted': '서버 접수됨 · 댓글 표시를 기다립니다',
    'delivered': '보낸 댓글이 수신 목록에 표시됐습니다',
    'send-unconfirmed': '전송 결과를 확인하지 못했습니다. 댓글 목록을 확인하세요. 같은 내용은 다시 보내지 않습니다.',
    'send-policy-unavailable': '전송 권한을 확인하지 못했습니다. 잠시 후 직접 다시 눌러 주세요.',
    'send-banned': '현재 계정은 댓글 전송이 제한되어 있습니다.',
    'send-frozen': '방송에서 댓글 전송을 잠시 중지했습니다.',
    'send-muted': '현재 계정의 댓글 전송이 일시 제한되어 있습니다.',
    'invalid-comment': '공백을 제외한 댓글을 500자 이내로 입력해 주세요.',
    'http-error': '댓글 전송 요청이 거절됐습니다.',
    'cancelled': '댓글 전송을 취소했습니다.'
  };
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
  function cancel() {
    if (sendController && activeAttempt) uncertainAttempt = activeAttempt;
    sendController?.abort(); sendController = null; activeAttempt = null; session = null; ackId = null; composing = false;
    controller?.abort(); controller = null; report = null; comments = messageStore(); renderedVersion = -1;
    followLatest = true; unreadCount = 0;
  }
  function sync() {
    const head = timeline.querySelector('.live-head');
    if (!head || !isLive()) return;
    let button = document.getElementById('liveChatProbeBtn');
    if (!button) {
      button = document.createElement('button'); button.id = 'liveChatProbeBtn';
      button.className = 'live-mini-btn'; button.type = 'button';
      button.title = '영상 아래쪽에서 실제 LIVE 댓글을 보고 직접 입력해 보냅니다.';
      button.addEventListener('click', run); head.append(button);
    }
    const label = controller ? '댓글 숨기기' : '댓글 보기';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(!!controller));
    button.disabled = !state.live.config?.isStreaming || !!state.live.config?.mock;
  }
  function writeBlock() {
    if (!session?.current() || !['messages-received', 'connected-no-messages'].includes(report?.status)) return '댓글 수신 연결 후 입력할 수 있습니다';
    if (report.policy?.banned !== false) return sendLabels['send-banned'];
    if (report.policy?.frozen !== false) return sendLabels['send-frozen'];
    if (report.policy?.mutePresent !== false) return sendLabels['send-muted'];
    return '';
  }
  function uncertainDraft(content) {
    return uncertainAttempt && session && uncertainAttempt.roomId === session.roomId &&
      uncertainAttempt.token === session.token && uncertainAttempt.sequence === session.sequence && uncertainAttempt.content === content.trim();
  }
  function updateComposer(panel) {
    const input = panel.querySelector('.live-comment-input'), button = panel.querySelector('.live-comment-send');
    if (!input || !button) return;
    const block = writeBlock();
    input.disabled = !!block || !!sendController;
    input.placeholder = block || '댓글 입력 (최대 500자)';
    button.disabled = input.disabled || composing || !input.value.trim() || uncertainDraft(input.value);
    button.textContent = sendController ? '전송 중' : '전송';
    const status = panel.querySelector('.live-comment-send-status');
    const result = report?.send;
    const message = uncertainDraft(input.value) ? sendLabels['send-unconfirmed'] : result ? (sendLabels[result.status] || sendLabels['send-policy-unavailable']) +
      (result.httpStatus ? ' (HTTP ' + result.httpStatus + ')' : '') : block;
    if (status.textContent !== message) status.textContent = message;
    status.hidden = !message;
  }
  async function submitComment(input) {
    if (sendController || composing || writeBlock() || uncertainDraft(input.value)) return;
    const context = session, content = input.value.trim();
    if (!content) return;
    const owner = sendController = new AbortController();
    activeAttempt = {roomId: context.roomId, token: context.token, sequence: context.sequence, content};
    report.send = {status: 'sending'}; ackId = null; show();
    try {
      const result = await sendNormalComment({...context, content, signal: owner.signal});
      if (sendController !== owner || !context.current()) return;
      ackId = result.messageId;
      report.send = {status: comments.seen.has(ackId) ? 'delivered' : 'accepted'};
      input.value = '';
    } catch (error) {
      if (sendController !== owner || !context.current()) return;
      const status = error instanceof ProbeError && sendLabels[error.code] ? error.code : 'send-policy-unavailable';
      report.send = {status, ...(error instanceof ProbeError && error.httpStatus ? {httpStatus: error.httpStatus} : {}),
        ...(error instanceof ProbeError && error.shape ? {diagnostic: error.shape} : {})};
      if (status === 'send-unconfirmed') uncertainAttempt = activeAttempt;
      if (status === 'send-banned') report.policy.banned = true;
      if (status === 'send-frozen') report.policy.frozen = true;
      if (status === 'send-muted') report.policy.mutePresent = true;
    } finally {
      if (sendController === owner) {
        if (!context.current() && activeAttempt) uncertainAttempt = activeAttempt;
        sendController = null; activeAttempt = null; show();
      }
    }
  }
  function show() {
    const stage = timeline.querySelector('.live-stage');
    if (!stage || !report) return;
    let panel = document.getElementById('liveChatProbeStatus');
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'liveChatProbeStatus';
      panel.className = 'live-comments-overlay';
      panel.style.cssText = 'position:absolute;left:0;width:min(100%,560px);bottom:0;z-index:5;height:var(--live-comments-max);box-sizing:border-box;max-height:100%;padding:24px 12px 10px;background:linear-gradient(transparent,rgba(0,0,0,.76));color:#fff;font-size:12px;display:flex;flex-direction:column;gap:8px;pointer-events:none';
      const scroll = document.createElement('div'); scroll.className = 'live-comments-scroll';
      scroll.style.cssText = 'position:relative;display:flex;min-height:0;flex:1 1 auto;overflow:visible';
      const list = document.createElement('div'); list.className = 'live-comments-list';
      list.tabIndex = 0;
      list.setAttribute('aria-label', 'LIVE 댓글'); list.style.cssText = 'flex:1;min-width:0;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:7px;pointer-events:auto;text-shadow:0 1px 3px #000';
      const latest = document.createElement('button'); latest.className = 'live-comments-latest'; latest.type = 'button';
      latest.textContent = '↓';
      const unread = document.createElement('span'); unread.className = 'live-comments-unread'; latest.append(unread);
      latest.title = '최신 댓글로 이동'; latest.setAttribute('aria-label', '최신 댓글로 이동'); latest.hidden = true;
      let resizeAnchor = null;
      panel.rememberScrollAnchor = () => {
        const top = list.getBoundingClientRect().top;
        const row = [...list.children].find(row => row.getBoundingClientRect().bottom > top);
        resizeAnchor = row ? {row, offset: row.getBoundingClientRect().top - top} : null;
      };
      list.addEventListener('scroll', () => {
        followLatest = list.scrollHeight - list.clientHeight - list.scrollTop <= 2;
        if (followLatest) unreadCount = 0;
        latest.hidden = followLatest; unread.textContent = unreadCount ? '+' + unreadCount : '';
        panel.rememberScrollAnchor();
      }, {passive: true});
      // A resize changes the viewport, not the reader's intent. Keep the bottom
      // pinned only while following; paused readers retain their scroll offset.
      const resize = new ResizeObserver(() => {
        if (!panel.isConnected) { resize.disconnect(); return; }
        if (followLatest) list.scrollTop = list.scrollHeight;
        else if (resizeAnchor?.row.isConnected) {
          list.scrollTop += resizeAnchor.row.getBoundingClientRect().top - list.getBoundingClientRect().top - resizeAnchor.offset;
        }
        panel.rememberScrollAnchor();
      });
      resize.observe(list);
      latest.addEventListener('click', () => { followLatest = true; unreadCount = 0; unread.textContent = ''; list.scrollTop = list.scrollHeight; latest.hidden = true; });
      scroll.append(list, latest);
      const controls = document.createElement('div'); controls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;pointer-events:auto';
      const text = document.createElement('span'); text.className = 'live-chat-probe-text';
      text.style.cssText = 'flex:1;min-width:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'; text.setAttribute('role', 'status');
      const copy = document.createElement('button'); copy.className = 'live-mini-btn live-comment-copy'; copy.textContent = '진단 복사'; copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); copy.textContent = '복사됨'; }
        catch { copy.textContent = '복사 실패'; }
      });
      const dismiss = document.createElement('button'); dismiss.className = 'live-mini-btn'; dismiss.textContent = '닫기'; dismiss.type = 'button';
      dismiss.addEventListener('click', () => { cancel(); panel.remove(); sync(); });
      const form = document.createElement('form'); form.className = 'live-comment-form';
      form.style.cssText = 'display:flex;gap:6px;flex-shrink:0;pointer-events:auto';
      const input = document.createElement('input'); input.type = 'text'; input.disabled = true;
      input.className = 'live-comment-input'; input.maxLength = inputLimit; input.autocomplete = 'off';
      input.setAttribute('aria-label', 'LIVE 댓글 입력'); input.enterKeyHint = 'send';
      input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;height:34px;border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:0 12px;background:rgba(40,43,50,.82);color:#fff';
      const send = document.createElement('button'); send.type = 'submit'; send.className = 'live-mini-btn live-comment-send'; send.textContent = '전송';
      const sendStatus = document.createElement('span'); sendStatus.className = 'live-comment-send-status';
      sendStatus.id = 'liveCommentSendStatus'; sendStatus.setAttribute('role', 'status');
      sendStatus.style.cssText = 'line-height:1.4;flex-shrink:0;overflow-wrap:anywhere';
      input.setAttribute('aria-describedby', sendStatus.id);
      input.addEventListener('input', () => updateComposer(panel));
      input.addEventListener('compositionstart', () => { composing = true; updateComposer(panel); });
      input.addEventListener('compositionend', () => { composing = false; updateComposer(panel); });
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || composing || event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        form.requestSubmit();
      });
      form.addEventListener('submit', event => { event.preventDefault(); void submitComment(input); });
      form.append(input, send); controls.append(text, copy, dismiss); panel.append(scroll, controls, form, sendStatus); stage.append(panel);
    }
    const list = panel.querySelector('.live-comments-list');
    const wasFollowing = followLatest;
    const oldTop = list.scrollTop;
    // Capture visible row offsets before removals/edits. When retention evicts
    // the first visible row, the next surviving visible row is the anchor.
    const top = list.getBoundingClientRect().top;
    const anchors = [...list.children].filter(row => row.getBoundingClientRect().bottom > top)
      .map(row => ({row, offset: row.getBoundingClientRect().top - top}));
    if (renderedVersion !== comments.version) {
      const entries = [...comments.items].sort((a, b) => a[1].createdAt - b[1].createdAt);
      const rows = new Map([...list.children].map(row => [row.dataset.messageId, row]));
      let arriving = 0;
      for (const [id, row] of rows) if (!comments.items.has(id)) row.remove();
      let previous = null;
      for (const [id, message] of entries) {
        let row = rows.get(id);
        if (!row) {
          row = document.createElement('div'); row.className = 'live-comment-row'; row.dataset.messageId = id;
          row.style.cssText = 'display:flex;gap:10px;flex:0 0 auto;line-height:1.5';
          const name = document.createElement('strong'); name.style.cssText = 'flex:0 0 28%;max-width:140px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
          const content = document.createElement('span'); content.style.cssText = 'min-width:0;white-space:pre-wrap;overflow-wrap:anywhere';
          row.append(name, content); arriving++;
        }
        if (row.firstChild.textContent !== message.nickname) { row.firstChild.textContent = message.nickname; row.firstChild.title = message.nickname; }
        if (row.lastChild.textContent !== message.content) row.lastChild.textContent = message.content;
        const next = previous ? previous.nextSibling : list.firstChild;
        if (next !== row) list.insertBefore(row, next);
        previous = row;
      }
      if (!wasFollowing) unreadCount += arriving;
      renderedVersion = comments.version;
    }
    const baseLabel = controller && report.status === 'connected-no-messages' ? '새 댓글을 기다리고 있습니다' :
      controller && report.status === 'messages-received' ? '댓글 수신 중' : labels[report.status] || labels['network-error'];
    const label = baseLabel + (report.receivedCount ? ' · ' + report.receivedCount + '개' : '') +
      (report.httpStatus ? ' (HTTP ' + report.httpStatus + ')' : '');
    const text = panel.querySelector('.live-chat-probe-text');
    if (text.textContent !== label) { text.textContent = label; text.title = label; }
    updateComposer(panel);
    if (wasFollowing) list.scrollTop = list.scrollHeight;
    else {
      const anchor = anchors.find(({row}) => row.isConnected);
      list.scrollTop = anchor ? oldTop + anchor.row.getBoundingClientRect().top - list.getBoundingClientRect().top - anchor.offset : oldTop;
    }
    panel.querySelector('.live-comments-latest').hidden = wasFollowing;
    panel.querySelector('.live-comments-unread').textContent = unreadCount ? '+' + unreadCount : '';
    panel.rememberScrollAnchor();
  }
  async function run() {
    if (controller) { cancel(); document.getElementById('liveChatProbeStatus')?.remove(); sync(); return; }
    if (!isLive() || !state.live.config?.isStreaming || state.live.config?.mock) return;
    const live = state.live, roomId = live.currentLiveRoomId, sequence = live.connectionSeq, generation = state.scanGeneration;
    const token = live.liveChat?.chatToken;
    comments = messageStore(); renderedVersion = -1; followLatest = true; unreadCount = 0;
    report = {probeVersion: 4, mode: 'interactive-comments', pollIntervalMs: 1000, status: 'checking', receivedCount: 0, invalidMessageCount: 0, liveChatPresent: !!live.liveChat,
      chatTokenPresent: typeof token === 'string' && !!token, liveChatErrorPresent: !!live.liveChatError,
      provider: typeof live.chatProvider === 'string' && live.chatProvider.toLowerCase() === 'fromm' ? 'fromm' : live.chatProvider ? 'other' : 'missing'};
    if (live.entry?.kind !== 'channel' || typeof roomId !== 'string' || !roomId) {
      report.status = 'unsupported-room'; show(); return;
    }
    if (typeof token !== 'string' || !token) { report.status = 'missing-chat-context'; show(); return; }
    if (report.provider !== 'fromm') { report.status = 'unsupported-provider'; show(); return; }
    const owner = controller = new AbortController();
    const current = () => controller === owner && isLive() && state.live === live && live.config?.isStreaming && !live.config?.mock && generation === state.scanGeneration &&
      sequence === live.connectionSeq && roomId === live.currentLiveRoomId && token === live.liveChat?.chatToken;
    const fetcher = typeof nativeViewerFetch === 'function' ? nativeViewerFetch : fetch;
    session = {roomId, token, sequence, current, fetcher};
    sync(); show();
    try {
      // Keep the separate chat token out of the localhost account/API proxy.
      const result = await probe({roomId, token, signal: owner.signal, current, fetcher, sampleLimit: Infinity, onPage: page => {
        if (!current()) return;
        const updated = applyMessages(comments, page.messages, page.deletedMessages);
        report.receivedCount += updated.addedCount; report.invalidMessageCount += updated.invalidCount;
        Object.assign(report, {policy: page.policy, samples: page.samples,
          status: comments.items.size ? 'messages-received' : updated.invalidCount ? 'unrenderable-messages' : 'connected-no-messages'});
        if (ackId && comments.seen.has(ackId) && report.send?.status === 'accepted') report.send.status = 'delivered';
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

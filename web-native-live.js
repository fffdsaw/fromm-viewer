// Browser LIVE integration. The normal Viewer API/UI remains authoritative.
(() => {
  const pending = new Map();
  let id = 0, nativeSequence = 0, frames = 0;
  const installURL = 'https://github.com/fffdsaw/fromm-viewer/releases/download/native-live-0.2.0/fromm-native-live-windows-x64.zip';
  function call(method, params = {}, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('PC LIVE 연결 도구와 새 확장프로그램을 설치한 뒤 웹을 새로고침해주세요.')); }, timeout);
      pending.set(requestId, { resolve, reject, timer });
      window.postMessage({ protocol: 'fromm-native-v1', direction: 'page', value: { id: requestId, method, params } }, location.origin);
    });
  }
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.protocol !== 'fromm-native-v1' || m.direction !== 'extension') return;
    const value = m.value;
    if (Number.isSafeInteger(value?.id) && pending.has(value.id)) {
      const p = pending.get(value.id); clearTimeout(p.timer); pending.delete(value.id);
      value.ok ? p.resolve(value) : p.reject(new Error('PC LIVE 연결 실패 · ' + (/^[A-Z_]{1,64}$/.test(value.code) ? value.code : 'NATIVE_FAILED')));
      return;
    }
    if (value?.type === 'status' && value.value?.stage === 'native-disconnected') {
      for (const [key, p] of pending) { clearTimeout(p.timer); p.reject(new Error('PC LIVE 연결 도구를 설치하거나 다시 연결해주세요.')); pending.delete(key); }
    }
    if (!nativeSequence || nativeSequence !== state.live.connectionSeq || state.filter !== 'live' || state.live.centerMode !== 'live') return;
    if (value?.type === 'status') {
      const stage = /^[a-z0-9-]{1,64}$/.test(value.value?.stage) ? value.value.stage : 'unknown';
      const details = { stage };
      for (const key of ['code', 'width', 'height', 'keyBytes', 'saltBytes']) if (Number.isFinite(value.value[key])) details[key] = value.value[key];
      recordLiveDiagnostic('native-' + stage, details);
      if (stage === 'join-succeeded') liveStatusText('LIVE 연결됨 · 영상 스트림 대기 중');
      else if (stage === 'audio-frame') liveStatusText('LIVE 소리 수신됨 · PC 연결 도구에서 재생');
      else if (stage.includes('failed') || stage === 'encryption-error' || stage === 'native-disconnected') liveStatusText('PC LIVE ' + stage, true);
      else if (stage === 'left') state.live.client = null;
    }
    if (value?.type === 'frame' && typeof value.jpeg === 'string' && value.jpeg.length < 800000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value.jpeg)) {
      const grid = document.getElementById('liveVideoGrid'); if (!grid) return;
      let image = document.getElementById('nativeLiveVideo');
      if (!image) {
        grid.replaceChildren(); image = document.createElement('img'); image.id = 'nativeLiveVideo'; image.alt = 'LIVE 영상';
        image.style.cssText = 'display:block;width:100%;height:100%;max-height:75vh;object-fit:contain;background:#000'; grid.append(image);
      }
      image.src = value.jpeg;
      if (frames++ === 0) { recordLiveDiagnostic('native-web-frame', { mediaVerified: true }); liveStatusText('LIVE 재생 중 · PC 소리 출력'); }
    }
  });
  const originalEncryption = liveEncryptionCandidates;
  const originalConnect = connectAgoraLive;
  const originalStop = stopLivePlayback;
  const originalAudio = resumeLiveAudio;
  const originalRender = renderLiveView;
  liveEncryptionCandidates = room => {
    if (typeof room?.encryptionKey === 'string' && new TextEncoder().encode(room.encryptionKey).length > 62) {
      return [{ mode: 'aes-256-gcm2', key: room.encryptionKey, salt: decodeLiveEncryptionSalt(room.encryptionSalt), native: true }];
    }
    return originalEncryption(room);
  };
  stopLivePlayback = async options => {
    const wasNative = nativeSequence;
    nativeSequence = 0; frames = 0;
    const stopping = originalStop(options);
    if (wasNative) { try { await call('leave', {}, 3000); } catch {} }
    await stopping;
  };
  connectAgoraLive = async options => {
    const room = state.live.room;
    if (!room || typeof room.encryptionKey !== 'string' || new TextEncoder().encode(room.encryptionKey).length <= 62) return originalConnect(options);
    if (!/Windows/i.test(navigator.userAgent)) throw new Error('이 방송은 Windows PC LIVE 연결 도구로 시청할 수 있습니다.');
    resolveAgoraJoinArgs(room, state.live.tokenInfo, state.live.currentLiveRoomId);
    const requestSeq = state.live.requestSeq, generation = state.scanGeneration;
    await stopLivePlayback();
    if (requestSeq !== state.live.requestSeq || generation !== state.scanGeneration || state.filter !== 'live') return;
    await call('hello', {}, 4000);
    const auth = currentAuth();
    const seq = ++state.live.connectionSeq; nativeSequence = seq; frames = 0;
    state.live.phase = 'native-join';
    liveStatusText('PC LIVE 연결 중...');
    try {
      await call('join', { roomId: room.id, channelId: state.live.entry.channelId, uuid: auth.uuid, authToken: auth.token }, 35000);
      if (seq !== state.live.connectionSeq || requestSeq !== state.live.requestSeq) return;
      state.live.client = { removeAllListeners() {}, leave: async () => {}, remoteUsers: [] };
      document.getElementById('liveSoundBtn')?.removeAttribute('disabled');
      liveStatusText('LIVE 연결 요청됨 · 영상 스트림 대기 중');
    } catch (error) { nativeSequence = 0; throw error; }
  };
  resumeLiveAudio = () => nativeSequence ? call('show', {}, 3000) : originalAudio();
  renderLiveView = () => {
    originalRender();
    if (state.live.centerMode !== 'live' || !/Windows/i.test(navigator.userAgent)) return;
    const actions = document.querySelector('.live-head-actions');
    if (actions && !document.getElementById('nativeLiveInstall')) {
      const link = document.createElement('a'); link.id = 'nativeLiveInstall'; link.className = 'live-mini-btn';
      link.href = installURL; link.textContent = 'PC LIVE 설치'; actions.append(link);
    }
  };
  window.addEventListener('pagehide', () => { if (nativeSequence) window.postMessage({ protocol: 'fromm-native-v1', direction: 'page', value: { id: ++id, method: 'leave' } }, location.origin); });
})();

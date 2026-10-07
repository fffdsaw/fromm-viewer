(() => {
  const allowed = location.origin === 'https://fffdsaw.github.io' && location.pathname.startsWith('/fromm-viewer/');
  if (!allowed || window !== window.top) return;
  let port = null, suspended = false;
  function publish(value) {
    window.postMessage({ protocol: 'fromm-native-v1', direction: 'extension', value }, location.origin);
  }
  function disconnected() { publish({ type: 'status', value: { stage: 'native-disconnected' } }); }
  function connect() {
    if (port || suspended) return port;
    const current = chrome.runtime.connect({ name: 'fromm-native-web' });
    port = current;
    current.onMessage.addListener(value => { if (port === current && !suspended) publish(value); });
    current.onDisconnect.addListener(() => {
      // Chrome reports normal BFCache teardown through lastError as well.
      // Consume it inside the callback, without retaining or logging raw data.
      void chrome.runtime.lastError;
      if (port !== current) return;
      port = null;
      if (!suspended) disconnected();
    });
    return current;
  }
  connect();
  window.addEventListener('pagehide', () => {
    suspended = true;
    const previous = port; port = null;
    previous?.disconnect();
  });
  window.addEventListener('pageshow', event => {
    suspended = false;
    if (!event.persisted) return;
    try { connect(); } catch {}
    // Reconnect only the transport. Never replay credentials or resume a join.
    disconnected();
  });
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.protocol !== 'fromm-native-v1' || m.direction !== 'page') return;
    const request = m.value;
    if (!Number.isSafeInteger(request?.id) || !['hello', 'join', 'leave', 'show', 'frame-ack'].includes(request.method)) return;
    if (suspended || (!port && request.method === 'frame-ack')) return;
    try { connect()?.postMessage(request); } catch { disconnected(); }
  });
})();

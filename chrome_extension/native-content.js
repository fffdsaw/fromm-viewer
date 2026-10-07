(() => {
  const allowed = location.origin === 'https://fffdsaw.github.io' && location.pathname.startsWith('/fromm-viewer/');
  if (!allowed || window !== window.top) return;
  const port = chrome.runtime.connect({ name: 'fromm-native-web' });
  port.onMessage.addListener(value => window.postMessage({ protocol: 'fromm-native-v1', direction: 'extension', value }, location.origin));
  port.onDisconnect.addListener(() => window.postMessage({ protocol: 'fromm-native-v1', direction: 'extension', value: { type: 'status', value: { stage: 'native-disconnected' } } }, location.origin));
  window.addEventListener('message', event => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.protocol !== 'fromm-native-v1' || m.direction !== 'page') return;
    const request = m.value;
    if (!Number.isSafeInteger(request?.id) || !['hello', 'join', 'leave', 'show'].includes(request.method)) return;
    try { port.postMessage(request); } catch {}
  });
})();

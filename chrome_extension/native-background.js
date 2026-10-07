'use strict';
function allowedSender(sender) {
  if (sender.frameId !== 0 || !Number.isInteger(sender.tab?.id)) return false;
  try { const u = new URL(sender.url); return u.origin === 'https://fffdsaw.github.io' && u.pathname.startsWith('/fromm-viewer/'); } catch { return false; }
}
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'fromm-native-web' || !allowedSender(port.sender)) { port.disconnect(); return; }
  let nativePort;
  function open() {
    if (nativePort) return nativePort;
    nativePort = chrome.runtime.connectNative('com.fromm.viewer.native_live');
    nativePort.onMessage.addListener(value => { try { port.postMessage(value?.id && value?.ok ? { ...value, extensionVersion: chrome.runtime.getManifest().version } : value); } catch {} });
    nativePort.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      nativePort = null;
      try { port.postMessage({ type: 'status', value: { stage: 'native-disconnected' } }); } catch {}
    });
    return nativePort;
  }
  port.onMessage.addListener(message => {
    if (!Number.isSafeInteger(message?.id) || !['hello', 'join', 'leave', 'show', 'frame-ack'].includes(message.method)) return;
    let params = {};
    if (message.method === 'frame-ack') {
      if (!nativePort || Object.keys(message.params || {}).length !== 1 || !Number.isSafeInteger(message.params?.sequence) || message.params.sequence <= 0) return;
      nativePort.postMessage({ id: message.id, method: 'frame-ack', params: { sequence: message.params.sequence } }); return;
    }
    if (message.method === 'join') {
      const p = message.params;
      if (!p || Object.keys(p).some(k => !['roomId', 'channelId', 'uuid', 'authToken'].includes(k))) return;
      for (const k of ['roomId', 'channelId', 'uuid', 'authToken']) if (typeof p[k] !== 'string' || !p[k] || p[k].length > (k === 'authToken' ? 16384 : 255) || /[\r\n]/.test(p[k])) return;
      params = { roomId: p.roomId, channelId: p.channelId, uuid: p.uuid, authToken: p.authToken };
    }
    try { open().postMessage({ id: message.id, method: message.method, params }); }
    catch { port.postMessage({ id: message.id, ok: false, code: 'NATIVE_NOT_INSTALLED' }); }
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    nativePort?.disconnect(); nativePort = null;
  });
});

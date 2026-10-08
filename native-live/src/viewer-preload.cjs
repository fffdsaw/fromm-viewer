'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('frommDesktop', Object.freeze({
  request: (input) => ipcRenderer.invoke('fromm:request', input),
  join: (roomId) => ipcRenderer.invoke('live:join', { roomId }),
  leave: () => ipcRenderer.invoke('live:leave'),
  reset: () => ipcRenderer.invoke('live:reset'),
  renew: () => ipcRenderer.invoke('live:renew'),
  show: () => ipcRenderer.invoke('live:show'),
  nativeCall: (method, params = {}) => {
    if (method === 'hello') return Promise.resolve({ ok: true, frameAck: true, targetFps: 30, extensionVersion: '1.0.8', desktop: true });
    if (method === 'join') return ipcRenderer.invoke('live:join', { roomId: params.roomId });
    if (method === 'leave') return ipcRenderer.invoke('live:leave');
    if (method === 'show') return ipcRenderer.invoke('live:show');
    if (method === 'frame-ack' && Number.isSafeInteger(params.sequence) && params.sequence > 0) {
      ipcRenderer.send('live:frame-ack', { sequence: params.sequence }); return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: false, code: 'COMMAND_DENIED' });
  },
  onMessage: (fn) => {
    const handler = (_event, value) => fn(value);
    ipcRenderer.on('live:message', handler);
    return () => ipcRenderer.removeListener('live:message', handler);
  },
  onStatus: (fn) => {
    const handler = (_event, value) => fn(value);
    ipcRenderer.on('live:status', handler);
    return () => ipcRenderer.removeListener('live:status', handler);
  }
}));

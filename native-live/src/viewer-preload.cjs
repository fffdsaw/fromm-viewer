'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('frommDesktop', Object.freeze({
  request: (input) => ipcRenderer.invoke('fromm:request', input),
  join: (roomId) => ipcRenderer.invoke('live:join', { roomId }),
  leave: () => ipcRenderer.invoke('live:leave'),
  reset: () => ipcRenderer.invoke('live:reset'),
  renew: () => ipcRenderer.invoke('live:renew'),
  show: () => ipcRenderer.invoke('live:show'),
  onStatus: (fn) => {
    const handler = (_event, value) => fn(value);
    ipcRenderer.on('live:status', handler);
    return () => ipcRenderer.removeListener('live:status', handler);
  }
}));

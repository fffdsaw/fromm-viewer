'use strict';
const { ipcRenderer } = require('electron');
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin) return;
  const m = event.data;
  if (m?.protocol === 'fromm-native-v1' && m.direction === 'page') ipcRenderer.send('benchmark:request', m.value);
  if (m?.protocol === 'fromm-benchmark' && m.value?.stage === 'native-web-performance') ipcRenderer.send('benchmark:metric', m.value);
});
ipcRenderer.on('benchmark:message', (_event, value) => window.postMessage({ protocol: 'fromm-native-v1', direction: 'extension', value }, location.origin));

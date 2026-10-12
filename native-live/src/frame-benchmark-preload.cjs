'use strict';
const { ipcRenderer } = require('electron');
let sampleCanvas;
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin) return;
  const m = event.data;
  if (m?.protocol === 'fromm-native-v1' && m.direction === 'page') {
    if (m.value?.method === 'frame-ack') {
      // The production page sends ACK only after JPEG load/decode. Sample the
      // actual decoded image to reject a frozen/black capture that still ACKs.
      const image = document.getElementById('nativeLiveVideo');
      try {
        sampleCanvas ||= document.createElement('canvas'); sampleCanvas.width = sampleCanvas.height = 1;
        const context = sampleCanvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, image.naturalWidth / 2, image.naturalHeight / 160, 1, 1, 0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data[0];
        ipcRenderer.send('benchmark:decoded', { width: image.naturalWidth, height: image.naturalHeight, pixel });
      } catch { ipcRenderer.send('benchmark:decoded', { failed: true }); }
    }
    ipcRenderer.send('benchmark:request', m.value);
  }
  if (m?.protocol === 'fromm-benchmark' && m.value?.stage === 'native-web-performance') ipcRenderer.send('benchmark:metric', m.value);
});
ipcRenderer.on('benchmark:message', (_event, value) => window.postMessage({ protocol: 'fromm-native-v1', direction: 'extension', value }, location.origin));

'use strict';
// Offline-only CLI mode: no Fromm requests, RTC joins, credentials or SDK keys.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net'), crypto = require('node:crypto');
const { Decoder, encode } = require('./native-wire.cjs');
module.exports = async ({ app, ipcMain, session, senderIs, player, root, lockedWindow }) => {
  const pipeName = '\\\\.\\pipe\\fromm-frame-bench-' + crypto.randomBytes(24).toString('hex');
  const ses = session.fromPartition('fromm-frame-benchmark', { cache: false });
  ses.protocol.handle('fromm', request => {
    const u = new URL(request.url);
    const file = u.pathname === '/index.html' ? path.join(root, 'test/frame-benchmark.html') : u.pathname === '/web-native-live.js' ? path.join(root, '../web-native-live.js') : null;
    if (u.host !== 'benchmark' || !file) return new Response('', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html' } });
  });
  const browser = lockedWindow({ show: true, focusable: false, width: 390, height: 720, webPreferences: { session: ses, backgroundThrottling: false,
    sandbox: true, preload: path.join(root, 'src/frame-benchmark-preload.cjs') } });
  let host, consumer, received = 0, bytes = 0, started = 0, acknowledgements = 0, captureMs = 0, ackMs = 0;
  const flightTimes = new Map();
  const samples = [];
  const server = net.createServer(socket => {
    consumer = socket;
    const decoder = new Decoder(value => { if (value.type === 'frame') { received++; bytes += value.jpeg.length; } browser.webContents.send('benchmark:message', value); });
    socket.on('data', chunk => decoder.push(chunk));
  });
  await new Promise(resolve => server.listen(pipeName, resolve));
  host = net.connect(pipeName);
  await new Promise(resolve => host.on('connect', resolve));
  const decoder = new Decoder(message => {
    if (message.method === 'hello') host.write(encode({ id: message.id, ok: true, frameAck: true, targetFps: 30, extensionVersion: '1.0.7' }));
    else if (message.method === 'join') {
      host.write(encode({ id: message.id, ok: true }));
      started = performance.now(); player.webContents.send('player:command', { type: 'frame-benchmark' });
      setTimeout(() => {
        const displayFps = samples.length ? samples.reduce((a,b) => a+b, 0) / samples.length : 0;
        const passed = displayFps >= 27 && received >= 270;
        process.stdout.write(JSON.stringify({ stage: passed ? 'frame-benchmark-passed' : 'frame-benchmark-failed', targetFps: 30,
          displayFps: Math.round(displayFps * 10) / 10, receivedFrames: received, acknowledgements, averageFrameBytes: received ? Math.round(bytes / received) : 0,
          averageCaptureMs: Math.round(captureMs / Math.max(1,received)), averageAckMs: Math.round(ackMs / Math.max(1,acknowledgements)), width: 720, height: 1280, elapsedMs: Math.round(performance.now() - started), synthetic: true, mediaVerified: false }) + '\n');
        host.destroy(); consumer.destroy(); server.close(); app.exit(passed ? 0 : 1);
      }, 12000);
    } else if (message.method === 'frame-ack') { acknowledgements++; ackMs += performance.now() - (flightTimes.get(message.params.sequence) || performance.now()); flightTimes.delete(message.params.sequence); player.webContents.send('player:frame-ack', message.params); }
  });
  host.on('data', chunk => decoder.push(chunk));
  ipcMain.on('benchmark:request', (event, value) => {
    if (senderIs(event, browser, 'fromm://benchmark/index.html') && ['hello','join','frame-ack'].includes(value?.method)) consumer.write(encode(value));
  });
  ipcMain.on('benchmark:metric', (event, value) => { if (senderIs(event, browser, 'fromm://benchmark/index.html') && Number.isFinite(value?.displayFps)) samples.push(value.displayFps); });
  await browser.loadURL('fromm://benchmark/index.html');
  setTimeout(() => app.exit(2), 18000);
  return { frame(value) { captureMs += value.captureMs; flightTimes.set(value.sequence, performance.now()); host.write(encode({ type: 'frame', jpeg: value.jpeg, sequence: value.sequence })); } };
};

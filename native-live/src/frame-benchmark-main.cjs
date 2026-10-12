'use strict';
// Offline-only CLI mode: synthetic renderer input/local audio, no RTC joins,
// Fromm requests, credentials or real broadcast media.
const fs = require('node:fs'), path = require('node:path'), net = require('node:net'), crypto = require('node:crypto');
const { Decoder, encode } = require('./native-wire.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// Longer than the 50s loopback probe, so silence proves teardown, not EOF.
function testTone(seconds = 90) {
  const rate = 48000, samples = rate * seconds, wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let n = 0; n < samples; n++) wav.writeInt16LE(Math.round(4000 * Math.sin(2 * Math.PI * 697 * n / rate)), 44 + n * 2);
  return wav;
}
module.exports = async ({ app, ipcMain, session, senderIs, player, root, lockedWindow, stopPlayer, ensurePlayer, getPlayer }) => {
  const id = crypto.randomBytes(24).toString('hex'), pipeName = '\\\\.\\pipe\\fromm-frame-bench-' + id;
  const audioDirectory = fs.mkdtempSync(path.join(app.getPath('temp'), 'fromm-benchmark-'));
  const audioPath = path.join(audioDirectory, 'synthetic-697hz.wav'); fs.writeFileSync(audioPath, testTone());
  const ses = session.fromPartition('fromm-frame-benchmark', { cache: false });
  ses.protocol.handle('fromm', request => {
    const u = new URL(request.url);
    const file = u.pathname === '/index.html' ? path.join(root, 'test/frame-benchmark.html') : u.pathname === '/web-native-live.js' ? path.join(root, '../web-native-live.js') : null;
    if (u.host !== 'benchmark' || !file) return new Response('', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html' } });
  });
  const browser = lockedWindow({ show: false, focusable: false, width: 390, height: 720, webPreferences: { session: ses, backgroundThrottling: false,
    offscreen: true, sandbox: true, preload: path.join(root, 'src/frame-benchmark-preload.cjs') } });
  browser.webContents.setFrameRate(60); browser.webContents.startPainting();
  let host, consumer, measuring = false, finished = false, started = 0, received = 0, bytes = 0, acknowledgements = 0;
  let captureMs = 0, ackMs = 0, changedJpegs = 0, previousHash, allFrames = 0, playerEverVisible = player.isVisible();
  let decodedFrames = 0, changedPixels = 0, previousPixel, invalidDecodedFrames = 0;
  let visibleChecks = 0, lifecycle = {}, finishTimer, warmupTimer;
  const backgroundThrottling = player.webContents.getBackgroundThrottling(), audioMuted = player.webContents.isAudioMuted();
  const flightTimes = new Map(), displaySamples = [], playerSamples = [];
  const recordShown = () => { playerEverVisible = true; }; player.on('show', recordShown);
  const visibilityTimer = setInterval(() => { visibleChecks++; if (!player.isDestroyed() && player.isVisible()) playerEverVisible = true; }, 100);
  const server = net.createServer(socket => {
    consumer = socket;
    const decoder = new Decoder(value => {
      if (value.type === 'frame' && measuring) {
        received++; bytes += value.jpeg.length;
        const hash = crypto.createHash('sha256').update(value.jpeg).digest('hex');
        if (previousHash && hash !== previousHash) changedJpegs++; previousHash = hash;
      }
      if (!browser.isDestroyed()) browser.webContents.send('benchmark:message', value);
    });
    socket.on('data', chunk => { try { decoder.push(chunk); } catch { void finish('protocol-failed'); } });
    socket.on('error', () => { void finish('pipe-failed'); });
  });
  async function stop() {
    if (stopPlayer) await stopPlayer();
    else if (!player.isDestroyed()) { player.webContents.send('player:command', { type: 'leave' }); await delay(500); player.destroy(); }
  }
  async function finish(error) {
    if (finished) return;
    finished = true; measuring = false; clearTimeout(finishTimer); clearTimeout(warmupTimer); clearInterval(visibilityTimer); clearTimeout(watchdog);
    const elapsedMs = started ? Math.round(performance.now() - started) : 0;
    try {
      await stop();
      const stoppedFrames = allFrames; await delay(500);
      lifecycle.playerDestroyedAfterLeave = player.isDestroyed(); lifecycle.noFramesAfterLeave = allFrames === stoppedFrames;
      if (!error && ensurePlayer && getPlayer) {
        await ensurePlayer();
        const recreated = getPlayer();
        lifecycle.recreatedHidden = !!recreated && recreated !== player && !recreated.isDestroyed() && !recreated.isVisible();
        await stopPlayer(); lifecycle.recreatedDestroyedAfterLeave = recreated.isDestroyed();
      }
    } catch { error ||= 'teardown-failed'; }
    const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const round = n => Math.round(n * 10) / 10;
    const displayFps = average(displaySamples), rendererFps = average(playerSamples.map(v => v.rendererFps)), rafFps = average(playerSamples.map(v => v.rafFps));
    const audioPositions = playerSamples.filter(v => v.audioState === 710 && v.audioPositionMs >= 0).map(v => v.audioPositionMs);
    const audioAdvancedMs = audioPositions.length > 1 ? audioPositions.at(-1) - audioPositions[0] : 0;
    const audioPassed = playerSamples.length > 0 && playerSamples.every(v => v.audioStartCode === 0 && v.volumeCode === 0 && v.audioState === 710) && audioAdvancedMs >= 30000;
    const changingPixelFps = changedPixels * 1000 / Math.max(1, elapsedMs);
    const passed = !error && !playerEverVisible && !backgroundThrottling && !audioMuted && visibleChecks >= 300 && displayFps >= 27 && rendererFps >= 27 && rafFps >= 27 && changingPixelFps >= 26 &&
      received >= 945 && acknowledgements >= received - 1 && changedJpegs >= received * 0.86 && decodedFrames >= acknowledgements - 1 && invalidDecodedFrames === 0 &&
      audioPassed && Object.values(lifecycle).every(Boolean);
    process.stdout.write(JSON.stringify({ stage: passed ? 'frame-benchmark-passed' : 'frame-benchmark-failed', ...(error ? { error } : {}), targetFps: 30,
      displayFps: round(displayFps), minimumDisplayFps: displaySamples.length ? Math.min(...displaySamples) : 0, rendererFps: round(rendererFps), rafFps: round(rafFps),
      renderer: playerSamples.at(-1)?.renderer || 'unknown', receivedFrames: received, acknowledgements, changedJpegs, decodedFrames, changedPixels,
      changingPixelFps: round(changingPixelFps), invalidDecodedFrames, playerEverVisible, visibleChecks,
      playerBackgroundThrottling: backgroundThrottling, playerAudioMuted: audioMuted,
      averageFrameBytes: received ? Math.round(bytes / received) : 0, averageCaptureMs: round(captureMs / Math.max(1, received)), averageAckMs: round(ackMs / Math.max(1, acknowledgements)),
      width: 720, height: 1280, elapsedMs, audioMixingPassed: audioPassed, audioAdvancedMs, audioSamples: audioPositions.length,
      hardwareAudioVerified: false, lifecycle, synthetic: true, mediaVerified: false }) + '\n');
    host?.destroy(); consumer?.destroy(); server.close(); if (!browser.isDestroyed()) browser.destroy();
    try { fs.unlinkSync(audioPath); fs.rmdirSync(audioDirectory); } catch {}
    app.exit(passed ? 0 : 1);
  }
  const watchdog = setTimeout(() => { void finish('timeout'); }, 50000);
  server.on('error', () => { void finish('pipe-failed'); });
  await new Promise(resolve => server.listen(pipeName, resolve));
  host = net.connect(pipeName);
  host.on('error', () => { void finish('pipe-failed'); });
  await new Promise(resolve => host.once('connect', resolve));
  const decoder = new Decoder(message => {
    if (message.method === 'hello') host.write(encode({ id: message.id, ok: true, backgroundPlayer: true, frameAck: true, targetFps: 30, extensionVersion: '1.0.7' }));
    else if (message.method === 'join' && !warmupTimer) {
      host.write(encode({ id: message.id, ok: true }));
      player.webContents.send('player:command', { type: 'frame-benchmark', audioPath });
      warmupTimer = setTimeout(() => {
        started = performance.now(); measuring = true;
        process.stdout.write(JSON.stringify({ stage: 'frame-benchmark-measuring', durationMs: 35000, playerVisible: player.isVisible(), synthetic: true, mediaVerified: false }) + '\n');
        finishTimer = setTimeout(() => { void finish(); }, 35000);
      }, 3000);
    } else if (message.method === 'frame-ack') {
      if (measuring && flightTimes.has(message.params.sequence)) { acknowledgements++; ackMs += performance.now() - flightTimes.get(message.params.sequence); }
      flightTimes.delete(message.params.sequence);
      if (!player.isDestroyed()) player.webContents.send('player:frame-ack', message.params);
    }
  });
  host.on('data', chunk => { try { decoder.push(chunk); } catch { void finish('protocol-failed'); } });
  ipcMain.on('benchmark:request', (event, value) => {
    if (senderIs(event, browser, 'fromm://benchmark/index.html') && ['hello', 'join', 'frame-ack'].includes(value?.method) && consumer && !consumer.destroyed) consumer.write(encode(value));
  });
  ipcMain.on('benchmark:metric', (event, value) => { if (measuring && senderIs(event, browser, 'fromm://benchmark/index.html') && Number.isFinite(value?.displayFps)) displaySamples.push(value.displayFps); });
  ipcMain.on('benchmark:decoded', (event, value) => {
    if (!measuring || !senderIs(event, browser, 'fromm://benchmark/index.html')) return;
    if (value?.width !== 720 || value?.height !== 1280 || !Number.isFinite(value?.pixel)) { invalidDecodedFrames++; return; }
    decodedFrames++; if (previousPixel !== undefined && value.pixel !== previousPixel) changedPixels++; previousPixel = value.pixel;
  });
  ipcMain.on('benchmark:player-metric', (event, value) => {
    if (measuring && senderIs(event, player, 'fromm://player/player.html') && Number.isFinite(value?.rendererFps) && Number.isFinite(value?.rafFps)) playerSamples.push(value);
  });
  ipcMain.on('player:status', (event, value) => {
    if (senderIs(event, player, 'fromm://player/player.html') && ['native-failed', 'frame-benchmark-failed'].includes(value?.stage)) void finish('renderer-failed');
  });
  await browser.loadURL('fromm://benchmark/index.html');
  return { frame(value) {
    allFrames++;
    if (finished || !host || host.destroyed) return;
    if (measuring) { captureMs += value.captureMs; flightTimes.set(value.sequence, performance.now()); }
    host.write(encode({ type: 'frame', jpeg: value.jpeg, sequence: value.sequence }));
  } };
};

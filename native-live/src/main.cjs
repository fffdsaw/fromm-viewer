'use strict';
const { app, BrowserWindow, ipcMain, protocol, session, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { apiRequest, enterEnvelope, token007, safeDiagnostic, fail } = require('./contracts.cjs');
const ROOT = path.resolve(__dirname, '..');
const BASELINE_HASH = '12be0bed8cce3ecd5f32dda2ed0dd8dab96413159e143b0f398fb04d8b2ad481';
const SELF_TEST = process.argv.includes('--self-test');
const FRAME_BENCHMARK = process.argv.includes('--frame-benchmark');
const UI_SMOKE = process.argv.includes('--ui-smoke');
const MONITOR = process.argv.includes('--monitor');
const NATIVE_HOST = process.argv.includes('--fromm-native-bridge');
let nativeController;
let frameBenchmark;
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('log-level', '3');
// This app's hidden Native canvas must continue feeding the visible web page.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
protocol.registerSchemesAsPrivileged([{ scheme: 'fromm', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
let viewer, player, playerReady, resolvePlayerReady, cachedEntry = null, pendingRenew = null;
let auth = '', authEpoch = 0, enterSerial = 0, commandSerial = 0;
const statusHistory = [];
function status(value) {
  const safe = safeDiagnostic(value);
  statusHistory.push(safe); if (statusHistory.length > 100) statusHistory.shift();
  if (viewer && !viewer.isDestroyed()) viewer.webContents.send('live:status', safe);
  if (SELF_TEST || MONITOR || FRAME_BENCHMARK) process.stdout.write(JSON.stringify(safe) + '\n');
  nativeController?.status(safe);
}
function senderIs(event, window, url) {
  return window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && event.senderFrame.url === url;
}
function guardViewer(event) { if (!senderIs(event, viewer, 'fromm://viewer/index.html')) fail('IPC_SENDER_DENIED'); }
function clearEntry() {
  if (cachedEntry) { cachedEntry.payload.encryptionKdfSalt.fill(0); cachedEntry.payload.encryptionKey = ''; cachedEntry.payload.rtcToken = ''; }
  cachedEntry = null; pendingRenew = null;
}
function leavePlayer() {
  commandSerial++;
  if (player && !player.isDestroyed()) player.webContents.send('player:command', { type: 'leave' });
}
function lockedWindow(options) {
  const window = new BrowserWindow({ ...options, webPreferences: {
    ...options.webPreferences, nodeIntegration: false, contextIsolation: true, webSecurity: true,
    devTools: false, spellcheck: false
  } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  return window;
}
async function ensurePlayer() {
  if (player && !player.isDestroyed()) return playerReady;
  playerReady = new Promise(resolve => { resolvePlayerReady = resolve; });
  player = lockedWindow({ title: 'Fromm Native LIVE', width: 1000, height: 820, show: !(SELF_TEST || FRAME_BENCHMARK),
    webPreferences: { session: session.fromPartition('fromm-native-player', { cache: false }), backgroundThrottling: false,
      preload: path.join(__dirname, 'player-preload.cjs'), sandbox: false } });
  player.on('closed', () => { player = null; commandSerial++; clearEntry(); status({ stage: 'left' }); });
  player.webContents.on('render-process-gone', () => { clearEntry(); status({ stage: 'native-failed' }); });
  await player.loadURL('fromm://player/player.html');
  return Promise.race([playerReady, new Promise((_, reject) => setTimeout(() => reject(new Error('PLAYER_READY_TIMEOUT')), 10000))]);
}
ipcMain.on('player:ready', event => {
  if (senderIs(event, player, 'fromm://player/player.html')) resolvePlayerReady?.();
});
ipcMain.on('player:status', (event, value) => {
  if (!senderIs(event, player, 'fromm://player/player.html')) return;
  status(value);
  if (SELF_TEST && ['self-test-passed', 'self-test-failed'].includes(value?.stage)) setTimeout(() => app.exit(value.stage === 'self-test-passed' ? 0 : 1), 100);
});
ipcMain.on('player:frame', (event, value) => {
  if (senderIs(event, player, 'fromm://player/player.html')) { nativeController?.frame(value); frameBenchmark?.frame(value); }
});
// Network bridge is restricted to three official Fromm API hosts. No generic native fetch API.
ipcMain.handle('fromm:request', async (event, input) => {
  try {
    guardViewer(event);
    const req = apiRequest(input), authorization = req.headers.authorization || '';
    if (authorization && authorization !== auth) { auth = authorization; authEpoch++; enterSerial++; clearEntry(); leavePlayer(); }
    const epoch = authEpoch;
    const enterMatch = req.url.hostname === 'channel-api.frommyarti.com' && req.url.pathname.match(/^\/live\/agora\/rooms\/([^/]+)\/enter$/);
    const renewMatch = req.url.hostname === 'channel-api.frommyarti.com' && req.url.pathname.match(/^\/live\/agora\/rooms\/([^/]+)\/token\/renew$/);
    const isEnter = !!enterMatch && req.method === 'POST';
    const serial = isEnter ? ++enterSerial : enterSerial;
    if (isEnter) { clearEntry(); leavePlayer(); }
    // Match the existing 1.06 companion extension's normal API transport.
    const transportHeaders = { ...req.headers, origin: 'https://channel.frommyarti.com', referer: 'https://channel.frommyarti.com/' };
    if (req.url.hostname === 'account-api.frommyarti.com') transportHeaders['user-agent'] = 'okhttp/5.1.0';
    const response = await net.fetch(req.url.toString(), { method: req.method, headers: transportHeaders,
      body: req.body, cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    if (isEnter) status({ stage: 'enter-response', code: response.status });
    if (Buffer.byteLength(body) > 32 * 1024 * 1024) fail('API_RESPONSE_TOO_LARGE');
    if (response.ok && authorization && req.headers.uuid && epoch === authEpoch && authorization === auth) {
      let data; try { data = JSON.parse(body); } catch {}
      if (data && data.success !== false && data.ok !== false && isEnter && serial === enterSerial) {
        let sent; try { sent = JSON.parse(req.body); } catch {}
        const roomId = decodeURIComponent(enterMatch[1]);
        if (sent?.role === 'subscriber' && req.headers['channel-id'] && req.url.searchParams.get('channelId') === req.headers['channel-id']) {
          try { cachedEntry = { roomId, payload: enterEnvelope(data, roomId), epoch }; status({ stage: 'enter-authorized', tokenPresent: true }); }
          catch (e) { status({ stage: 'enter-validation-failed' }); }
        }
      }
      if (data && data.success !== false && data.ok !== false && renewMatch && req.method === 'POST' && cachedEntry && decodeURIComponent(renewMatch[1]) === cachedEntry.roomId) {
        for (const root of [data.data, data.result, data.payload, data]) {
          const token = root?.agoraToken?.token || root?.rtcToken?.token || (typeof root?.token === 'string' ? root.token : root?.token?.token);
          if (!token) continue;
          const parsed = token007(token);
          if (parsed.appId !== cachedEntry.payload.appId || parsed.channelName !== cachedEntry.roomId || parsed.userAccount !== cachedEntry.payload.userAccount || parsed.expiresAt <= Date.now() / 1000 || parsed.joinExpiresAt <= Date.now() / 1000) fail('RENEW_IDENTITY_MISMATCH');
          pendingRenew = { token, expiresAt: parsed.expiresAt, joinExpiresAt: parsed.joinExpiresAt }; break;
        }
      }
    }
    return { ok: true, status: response.status, contentType: response.headers.get('content-type') || 'application/json', body };
  } catch (e) { return { ok: false, code: /^[A-Z_]{1,64}$/.test(e?.code) ? e.code : 'DESKTOP_NETWORK_FAILED' }; }
});
ipcMain.handle('live:join', async (event, input) => {
  try {
    guardViewer(event);
    if (!cachedEntry || input?.roomId !== cachedEntry.roomId || cachedEntry.epoch !== authEpoch) fail('AUTHORIZED_ENTER_REQUIRED');
    if (cachedEntry.payload.joinExpiresAt <= Date.now() / 1000 || cachedEntry.payload.expiresAt <= Date.now() / 1000) fail('RTC_TOKEN_EXPIRED');
    const entry = cachedEntry, serial = ++commandSerial;
    await ensurePlayer();
    if (cachedEntry !== entry || serial !== commandSerial) fail('JOIN_CANCELLED');
    player.show(); player.focus();
    player.webContents.send('player:command', { type: 'join', payload: entry.payload });
    return { ok: true };
  } catch (e) { return { ok: false, code: /^[A-Z_]{1,64}$/.test(e?.code) ? e.code : 'NATIVE_JOIN_FAILED' }; }
});
ipcMain.handle('live:leave', event => { guardViewer(event); leavePlayer(); return { ok: true }; });
ipcMain.handle('live:reset', event => { guardViewer(event); authEpoch++; enterSerial++; auth = ''; clearEntry(); leavePlayer(); return { ok: true }; });
ipcMain.handle('live:show', event => { guardViewer(event); if (player && !player.isDestroyed()) { player.show(); player.focus(); } return { ok: true }; });
ipcMain.handle('live:renew', event => {
  guardViewer(event);
  if (!cachedEntry || !pendingRenew || !player || player.isDestroyed()) return { ok: false, code: 'AUTHORIZED_RENEW_REQUIRED' };
  player.webContents.send('player:command', { type: 'renew', token: pendingRenew.token });
  Object.assign(cachedEntry.payload, { rtcToken: pendingRenew.token, expiresAt: pendingRenew.expiresAt, joinExpiresAt: pendingRenew.joinExpiresAt });
  pendingRenew = null;
  return { ok: true };
});
function setupSession(partition) {
  const ses = session.fromPartition(partition, { cache: false }); // no persist: prefix; login session stays in memory
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.protocol.handle('fromm', request => {
    const u = new URL(request.url);
    const files = {
      'viewer/fetch-adapter.js': ['fetch-adapter.js', 'text/javascript'],
      'viewer/live-adapter.js': ['live-adapter.js', 'text/javascript'],
      'player/player.html': ['player.html', 'text/html']
    };
    if (u.host === 'viewer' && u.pathname === '/index.html') {
      const baseline = fs.readFileSync(path.join(ROOT, 'vendor', 'index.html'));
      if (crypto.createHash('sha256').update(baseline).digest('hex') !== BASELINE_HASH) return new Response('BASELINE_HASH_MISMATCH', { status: 409 });
      const html = baseline.toString('utf8').replace('<head>', '<head><script src="fromm://viewer/fetch-adapter.js"></script>')
        .replace('</body>', '<script src="fromm://viewer/live-adapter.js"></script></body>');
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    const item = files[u.host + u.pathname];
    if (!item) return new Response('', { status: 404 });
    return new Response(fs.readFileSync(path.join(__dirname, item[0])), { headers: { 'content-type': item[1] + '; charset=utf-8', 'cache-control': 'no-store' } });
  });
  // Only CDN media transport for this private Viewer session, same as its companion CORS extension.
  ses.webRequest.onHeadersReceived({ urls: ['https://*.frommyarti.com/*', 'https://*.cloudfront.net/*', 'https://*.amazonaws.com/*'] }, (details, callback) => {
    const headers = { ...details.responseHeaders };
    for (const k of Object.keys(headers)) if (k.toLowerCase() === 'access-control-allow-origin') delete headers[k];
    headers['Access-Control-Allow-Origin'] = ['fromm://viewer'];
    headers['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS'];
    headers['Access-Control-Allow-Headers'] = ['Authorization, Content-Type, Accept, uuid, channel-id, X-Requested-With'];
    headers['Access-Control-Expose-Headers'] = ['Content-Type, Content-Length, Content-Disposition, Accept-Ranges'];
    callback({ responseHeaders: headers });
  });
  return ses;
}
app.whenReady().then(async () => {
  if (process.platform !== 'win32' || process.arch !== 'x64') fail('WINDOWS_X64_REQUIRED');
  const viewerSession = setupSession('fromm-native-viewer');
  setupSession('fromm-native-player');
  if (FRAME_BENCHMARK) {
    await ensurePlayer();
    frameBenchmark = await require('./frame-benchmark-main.cjs')({ app, BrowserWindow, ipcMain, session,
      senderIs, player, root: ROOT, lockedWindow });
    return;
  }
  if (NATIVE_HOST) {
    const identity = require('../extension-identity.json');
    if (process.argv[process.argv.indexOf('--fromm-extension-id') + 1] !== identity.id) fail('NATIVE_ORIGIN_DENIED');
    const pipeId = process.argv[process.argv.indexOf('--fromm-channel') + 1];
    if (!/^[a-f0-9]{48}$/.test(pipeId)) fail('NATIVE_PIPE_DENIED');
    const pipe = require('node:net').connect('\\\\.\\pipe\\fromm-native-' + pipeId);
    const { encode } = require('./native-wire.cjs');
    nativeController = require('./native-controller.cjs').createController({
      input: pipe, sendMessage: value => pipe.write(encode(value)),
      join: async payload => { await ensurePlayer(); player.show(); player.webContents.send('player:command', { type: 'join', payload, inlineVideo: true }); },
      leave: leavePlayer,
      acknowledge: sequence => { if (player && !player.isDestroyed()) player.webContents.send('player:frame-ack', { sequence }); },
      show: () => { if (player && !player.isDestroyed()) { player.show(); player.focus(); } },
      renew: token => { if (player && !player.isDestroyed()) player.webContents.send('player:command', { type: 'renew', token }); },
      quit: () => app.quit()
    });
    return;
  }
  if (SELF_TEST) {
    await ensurePlayer();
    player.webContents.send('player:command', { type: 'self-test', payload: {
      appId: '0'.repeat(32), channelName: 'synthetic-room', userAccount: 'synthetic-account', rtcToken: '',
      encryptionKey: crypto.randomBytes(32).toString('hex'), encryptionKdfSalt: Array.from(crypto.randomBytes(32))
    } });
    setTimeout(() => app.exit(2), 25000);
  } else {
    viewer = lockedWindow({ title: 'Fromm Viewer 1.06 · Native prototype', width: 1360, height: 960,
      show: !UI_SMOKE,
      webPreferences: { session: viewerSession, preload: path.join(__dirname, 'viewer-preload.cjs'), sandbox: true } });
    viewer.on('closed', () => { viewer = null; clearEntry(); if (player && !player.isDestroyed()) player.close(); });
    await viewer.loadURL('fromm://viewer/index.html');
    if (!UI_SMOKE) { viewer.show(); viewer.focus(); status({ stage: 'viewer-ready' }); }
    if (UI_SMOKE) {
      const checks = await viewer.webContents.executeJavaScript(`(async () => ({ overlay: typeof frommDesktop === 'object' && document.querySelector('#viewerBuildLabel')?.textContent === '1.06 · Native 실험판' && connectAgoraLive.toString().includes('frommDesktop.join') && window.isSecureContext, joinCode: (await frommDesktop.join('synthetic-room')).code, apiCode: (await frommDesktop.request({url:'https://denied.invalid/'})).code, fetchOverlay: nativeViewerFetch.toString().includes('native code') === false }))()`);
      const ok = checks.overlay && checks.joinCode === 'AUTHORIZED_ENTER_REQUIRED' && checks.apiCode === 'API_TARGET_DENIED';
      process.stdout.write(JSON.stringify({ stage: ok ? 'ui-smoke-passed' : 'ui-smoke-failed', checks }) + '\n');
      app.exit(ok ? 0 : 1);
    }
  }
}).catch(() => { status({ stage: 'startup-failed' }); app.exit(1); });
app.on('window-all-closed', () => { clearEntry(); auth = ''; app.quit(); });
app.on('before-quit', () => { clearEntry(); auth = ''; });

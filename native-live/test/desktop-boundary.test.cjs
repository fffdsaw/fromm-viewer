'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
// Exercise main-process gates with an offline Electron double. No network,
// entitlement response, Native SDK or real credential is involved.
async function setup() {
  const handlers = new Map(), windows = [], partitions = new Map(); let networkCalls = 0;
  class Window {
    constructor() {
      this.webContents = { mainFrame: { url: 'fromm://viewer/index.html' }, send() {},
        getURL: () => 'fromm://viewer/index.html', setWindowOpenHandler() {}, on() {} };
      windows.push(this);
    }
    isDestroyed() { return false; } on() {} show() {} focus() {} async loadURL() {}
  }
  const electron = {
    app: { commandLine: { appendSwitch() {} }, whenReady: () => Promise.resolve(), on() {}, exit() {} },
    BrowserWindow: Window, protocol: { registerSchemesAsPrivileged() {} },
    ipcMain: { on: (name, fn) => handlers.set(name, fn), handle: (name, fn) => handlers.set(name, fn) },
    session: { fromPartition: name => {
      if (!partitions.has(name)) partitions.set(name, { setPermissionRequestHandler() {}, setPermissionCheckHandler() {},
        protocol: { handle() {} }, webRequest: { onBeforeSendHeaders() {}, onHeadersReceived() {} } });
      return partitions.get(name);
    } },
    net: { fetch: async () => { networkCalls++; return new Response('{"success":false}', { status: 403 }); } }
  };
  const root = path.resolve(__dirname, '../src');
  const context = vm.createContext({ require: name => name === 'electron' ? electron : name.startsWith('./') ? require(path.join(root, name)) : require(name),
    __dirname: root, process: { argv: [], platform: 'win32', arch: 'x64' }, URL, Response, Buffer, AbortSignal, performance, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(root, 'main.cjs'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(windows.length, 1);
  const event = { sender: windows[0].webContents, senderFrame: windows[0].webContents.mainFrame };
  return { handlers, event, networkCalls: () => networkCalls };
}
test('desktop main refuses direct RTC credentials, wrong renderer and iframe requests before network or Native startup', async () => {
  const h = await setup();
  const join = h.handlers.get('live:join');
  assert.equal((await join(h.event, { roomId: 'synthetic-room', rtcToken: 'SYNTHETIC_ONLY', encryptionKey: 'SYNTHETIC_ONLY' })).code, 'AUTHORIZED_ENTER_REQUIRED');
  assert.equal((await join({ sender: {}, senderFrame: h.event.senderFrame }, { roomId: 'synthetic-room' })).code, 'IPC_SENDER_DENIED');
  assert.equal((await join({ ...h.event, senderFrame: { url: 'fromm://viewer/index.html' } }, {})).code, 'IPC_SENDER_DENIED');
  assert.equal((await h.handlers.get('fromm:request')(h.event, { url: 'https://denied.invalid/' })).code, 'API_TARGET_DENIED');
  assert.equal(h.networkCalls(), 0);
});
test('a rejected normal enter response cannot authorize Native playback', async () => {
  const h = await setup();
  const result = await h.handlers.get('fromm:request')(h.event, {
    url: 'https://channel-api.frommyarti.com/live/agora/rooms/synthetic-room/enter?channelId=synthetic-channel', method: 'POST',
    headers: { authorization: 'SYNTHETIC_ONLY', uuid: 'synthetic-device', 'channel-id': 'synthetic-channel' }, body: '{"role":"subscriber"}'
  });
  assert.equal(result.status, 403); assert.equal(h.networkCalls(), 1);
  assert.equal((await h.handlers.get('live:join')(h.event, { roomId: 'synthetic-room' })).code, 'AUTHORIZED_ENTER_REQUIRED');
});

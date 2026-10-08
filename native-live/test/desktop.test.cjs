'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
test('desktop preload exposes only scoped IPC and strips arbitrary RTC secrets from join', async () => {
  const calls = [], events = new Map(); let bridge;
  const context = vm.createContext({ require: name => {
    assert.equal(name, 'electron'); return { contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } },
      ipcRenderer: { invoke: async (method, params) => { calls.push({ method, params }); return { ok: true }; },
        send: (method, params) => calls.push({ method, params }), on: (name, fn) => events.set(name, fn), removeListener: name => events.delete(name) } };
  } });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/viewer-preload.cjs'), 'utf8'), context);
  await bridge.nativeCall('join', { roomId: 'synthetic-room', rtcToken: 'DO_NOT_COPY', encryptionKey: 'DO_NOT_COPY', authToken: 'DO_NOT_COPY' });
  assert.equal(calls[0].method, 'live:join'); assert.deepEqual(Object.keys(calls[0].params), ['roomId']);
  assert.equal((await bridge.nativeCall('request-arbitrary-ipc')).code, 'COMMAND_DENIED');
  assert.equal((await bridge.nativeCall('frame-ack', { sequence: NaN })).code, 'COMMAND_DENIED');
  await bridge.nativeCall('frame-ack', { sequence: 1 }); assert.equal(calls.at(-1).method, 'live:frame-ack');
  const off = bridge.onMessage(() => {}); assert.ok(events.has('live:message')); off(); assert.equal(events.size, 0);
});
test('desktop login Storage is in-memory and Request input preserves its body and method', async () => {
  const requests = [], window = { fetch: async () => new Response('unchanged') };
  const context = vm.createContext({ window, document: { addEventListener() {} }, location: { href: 'fromm://viewer/index.html' },
    URL, Request, Response, Map, Object, console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    frommDesktop: { request: async r => { requests.push(r); return { ok: true, status: 200, contentType: 'application/json', body: '{}' }; } } });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/fetch-adapter.js'), 'utf8'), context);
  window.localStorage.setItem('synthetic-token', 'SYNTHETIC_ONLY');
  assert.equal(window.localStorage.getItem('synthetic-token'), 'SYNTHETIC_ONLY'); assert.equal(window.localStorage.length, 1);
  window.localStorage.clear(); assert.equal(window.localStorage.length, 0);
  await window.fetch(new Request('https://channel-api.frommyarti.com/test', { method: 'POST', body: 'synthetic-body', headers: { 'content-type': 'text/plain' } }));
  assert.equal(requests[0].method, 'POST'); assert.equal(requests[0].body, 'synthetic-body');
});
test('current Viewer bundle preserves all latest UI bytes except the additive transport script', () => {
  require('../scripts/prepare-ui.cjs');
  const source = fs.readFileSync(path.join(root, '../index.html'), 'utf8');
  const bundled = fs.readFileSync(path.join(root, 'ui/index.html'), 'utf8');
  assert.equal(bundled.replace('<script src="fromm://viewer/fetch-adapter.js"></script>', ''), source);
  assert.equal(fs.readFileSync(path.join(root, 'ui/web-native-live.js'), 'utf8'), fs.readFileSync(path.join(root, '../web-native-live.js'), 'utf8'));
});

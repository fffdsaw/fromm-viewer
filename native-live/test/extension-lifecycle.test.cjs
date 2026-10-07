'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup({ origin = 'https://fffdsaw.github.io', pathname = '/fromm-viewer/', iframe = false } = {}) {
  const listeners = new Map(), ports = [], posted = [];
  let errorReads = 0;
  const runtime = {
    get lastError() { errorReads++; return { message: 'Synthetic BFCache port closure' }; },
    connect() {
      const callbacks = {}, sent = [];
      const port = { sent, callbacks, onMessage: { addListener(fn) { callbacks.message = fn; } },
        onDisconnect: { addListener(fn) { callbacks.disconnect = fn; } },
        postMessage(value) { sent.push(value); }, disconnect() { port.closed = true; } };
      ports.push(port); return port;
    }
  };
  const window = { addEventListener(type, callback) { listeners.set(type, callback); },
    postMessage(value, target) { posted.push({ value, target }); } };
  window.top = iframe ? {} : window;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../chrome_extension/native-content.js'), 'utf8'),
    { window, location: { origin, pathname }, chrome: { runtime } });
  function send(value, override = {}) {
    listeners.get('message')({ source: window, origin, data: { protocol: 'fromm-native-v1', direction: 'page', value }, ...override });
  }
  return { listeners, ports, posted, window, send, errorReads: () => errorReads };
}

test('BFCache disconnect consumes runtime.lastError and restores one transport without replaying a join', () => {
  const h = setup();
  h.send({ id: 1, method: 'join', params: { authToken: 'synthetic-only' } });
  const old = h.ports[0];
  h.listeners.get('pagehide')({ persisted: true });
  assert.equal(old.closed, true);
  assert.equal(h.errorReads(), 0);
  h.send({ id: 2, method: 'hello' });
  assert.equal(h.ports.length, 1);
  h.listeners.get('pageshow')({ persisted: true });
  h.listeners.get('pageshow')({ persisted: true });
  assert.equal(h.ports.length, 2);
  assert.equal(h.ports[1].sent.length, 0);
  old.callbacks.disconnect();
  assert.equal(h.errorReads(), 1);
  old.callbacks.message({ type: 'frame', sequence: 1 });
  assert.equal(h.posted.some(v => v.value.value.type === 'frame'), false);
  h.send({ id: 3, method: 'hello' });
  assert.equal(h.ports[1].sent[0].method, 'hello');
  assert.equal(h.ports[1].sent.some(v => v.method === 'join'), false);
});

test('unexpected port closure is reported, does not reconnect on stale frame ACK, and reconnects on explicit request', () => {
  const h = setup(); h.ports[0].callbacks.disconnect();
  assert.equal(h.errorReads(), 1);
  assert.equal(h.posted[0].value.value.value.stage, 'native-disconnected');
  h.send({ id: 1, method: 'frame-ack', params: { sequence: 1 } });
  assert.equal(h.ports.length, 1);
  h.send({ id: 2, method: 'hello' });
  assert.equal(h.ports.length, 2);
});

test('content bridge still rejects other origins, iframes and unrecognized commands', () => {
  for (const options of [{ origin: 'https://evil.test' }, { pathname: '/elsewhere/' }, { iframe: true }]) {
    const h = setup(options); assert.equal(h.ports.length, 0); assert.equal(h.listeners.size, 0);
  }
  const h = setup();
  h.send({ id: 1, method: 'join' }, { origin: 'https://evil.test' });
  h.send({ id: 2, method: 'join' }, { source: {} });
  h.send({ id: 3, method: 'arbitrary' });
  assert.equal(h.ports[0].sent.length, 0);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
function worker() {
  const handlers = {}, calls = [];
  const scope = 'https://fffdsaw.github.io/fromm-viewer/';
  const cache = {addAll: async urls => calls.push(['add', urls]), match: async () => null,
    put: async (req) => calls.push(['put', req.url])};
  vm.runInNewContext(source, {URL, Set, Promise,
    self: {registration: {scope}, addEventListener: (type, fn) => handlers[type] = fn},
    caches: {open: async () => cache, keys: async () => ['fromm-viewer-public-art-v0', 'other-app-cache'],
      delete: async key => calls.push(['delete', key])},
    fetch: async () => ({ok:true, type:'basic', clone: () => ({})})});
  return {handlers, calls};
}
test('manifest scopes the standalone app to Pages, with real existing icon dimensions', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  assert.equal(m.start_url, '/fromm-viewer/'); assert.equal(m.scope, m.start_url);
  assert.equal(m.id, m.scope); assert.equal(m.display, 'standalone');
  for (const icon of m.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
    assert.equal(icon.purpose, 'any', 'prototype is not falsely claimed maskable');
  }
});
test('worker installs public artwork only and cleans only its own obsolete caches', async () => {
  const {handlers,calls} = worker();
  let task;
  handlers.install({waitUntil: p => task=p}); await task;
  assert.equal(calls[0][1].length, 4);
  assert.ok(calls[0][1].every(url => url.startsWith('https://fffdsaw.github.io/fromm-viewer/assets/glowme/')));
  handlers.activate({waitUntil: p => task=p}); await task;
  assert.deepEqual(calls.filter(c => c[0]==='delete'), [['delete','fromm-viewer-public-art-v0']]);
});
test('private API, HTML, scripts, media, signed and authenticated requests are not intercepted', () => {
  const {handlers} = worker();
  const base = 'https://fffdsaw.github.io/fromm-viewer/';
  const requests = [
    [base, 'GET'], [base+'index.html','GET'], [base+'web-native-live.js','GET'],
    ['https://api.frommyarti.com/chat', 'GET'], ['https://cdn.example/clip.m3u8?Signature=x','GET'],
    [base+'assets/glowme/logo.png?token=private','GET'],
    [base+'assets/glowme/logo.png','POST'],
    [base+'assets/glowme/logo.png','GET',{authorization:'private'}],
    [base+'assets/glowme/logo.png','GET',{range:'bytes=0-99'}],
    ['https://other.example/fromm-viewer/assets/glowme/logo.png','GET']
  ];
  for (const [url,method,headers] of requests) {
    let intercepted = false;
    handlers.fetch({request:{url,method,headers:new Headers(headers)},respondWith:()=>intercepted=true});
    assert.equal(intercepted,false,url);
  }
});
test('public artwork cache can serve an exact allowlisted request', async () => {
  const {handlers,calls} = worker(); let task;
  handlers.fetch({request:{url:'https://fffdsaw.github.io/fromm-viewer/assets/glowme/logo.png',method:'GET',headers:new Headers()},respondWith:p=>task=p});
  await task; assert.equal(calls.filter(c=>c[0]==='put').length,1);
});

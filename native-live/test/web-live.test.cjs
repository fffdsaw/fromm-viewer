'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(keyBytes = 64, platform = 'Windows', options = {}) {
  const listeners = new Map(), calls = [], diagnostics = [];
  let webJoins = 0;
  const state = { live: { room: { id: 'room', encryptionKey: 'x'.repeat(keyBytes), encryptionSalt: 'synthetic' }, tokenInfo: {}, currentLiveRoomId: 'room', entry: { channelId: 'channel' }, connectionSeq: 0, requestSeq: 1, centerMode: 'live' }, filter: 'live', scanGeneration: 1 };
  const window = { addEventListener(type, callback) { listeners.set(type, callback); }, postMessage(message) {
    calls.push(message.value);
    queueMicrotask(() => listeners.get('message')({ source: window, origin: 'https://fffdsaw.github.io', data: { protocol: 'fromm-native-v1', direction: 'extension', value: { id: message.value.id, ok: true, frameAck: true, targetFps: 30, extensionVersion: '1.0.7', ...options.hello } } }));
  } };
  const context = vm.createContext({ window, navigator: { userAgent: platform }, location: { origin: 'https://fffdsaw.github.io' },
    document: options.document || { getElementById: () => null, querySelector: () => null }, TextEncoder, Map, Promise, setTimeout, clearTimeout, performance, requestAnimationFrame: options.requestAnimationFrame || (callback => callback()), cancelAnimationFrame: options.cancelAnimationFrame || (()=>{}),
    state, currentAuth: () => ({ token: 'synthetic-auth', uuid: 'synthetic-device' }), resolveAgoraJoinArgs: () => {},
    decodeLiveEncryptionSalt: () => Array.from({ length: 32 }, (_, i) => i), recordLiveDiagnostic: (event, value) => diagnostics.push({ event, ...value }), liveStatusText() {},
    liveEncryptionCandidates(room) { if (room.encryptionKey.length > 62) throw new Error('WEB_LIMIT'); return [{ mode: 'web' }]; },
    connectAgoraLive: async () => { webJoins++; }, stopLivePlayback: async () => { state.live.connectionSeq++; }, resumeLiveAudio() {}, renderLiveView() {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../web-native-live.js'), 'utf8'), context);
  return { context, state, calls, listeners, window, diagnostics, webJoins: () => webJoins };
}
test('web-compatible keys keep original Web playback path', async () => {
  for (const size of [32, 62]) { const h = setup(size); await h.context.connectAgoraLive(); assert.equal(h.webJoins(), 1); assert.equal(h.calls.length, 0); }
});
test('RTC receive measurements stay separate from web display and arbitrary callback secrets are discarded', async () => {
  const h = setup(); await h.context.connectAgoraLive();
  const send = value => h.listeners.get('message')({ source: h.window, origin: 'https://fffdsaw.github.io', data: { protocol: 'fromm-native-v1', direction: 'extension', value: { type: 'status', value } } });
  send({ stage: 'rtc-video-stats', receivedWidth: 720, receivedHeight: 1280, decoderFps: 30, rendererFps: 30, receivedBitrateKbps: 1600, uid: 42, encryptionKey: 'DO_NOT_COPY', synthetic: false });
  const m = h.window.FrommLiveMetrics();
  assert.equal(m.sourceResolution, 'UNAVAILABLE'); assert.equal(m.rtc.decoderFps, 30); assert.equal(m.web, 'UNAVAILABLE');
  assert.equal(JSON.stringify(h.diagnostics).includes('DO_NOT_COPY'), false); assert.equal('uid' in m.rtc, false);
  await h.context.stopLivePlayback(); assert.equal(h.window.FrommLiveMetrics().rtc, 'UNAVAILABLE');
});
test('64-byte key stays unchanged; Native host receives login context rather than arbitrary RTC secrets', async () => {
  const h = setup();
  const candidates = h.context.liveEncryptionCandidates(h.state.live.room);
  assert.equal(candidates[0].key, 'x'.repeat(64)); assert.equal(candidates[0].salt.length, 32);
  await h.context.connectAgoraLive();
  assert.equal(h.webJoins(), 0);
  const join = h.calls.find(v => v.method === 'join');
  assert.deepEqual(Object.keys(join.params).sort(), ['authToken', 'channelId', 'roomId', 'uuid']);
  assert.equal(join.params.roomId, 'room');
  await h.context.stopLivePlayback(); assert.equal(h.calls.at(-1).method, 'leave');
});
test('mobile cannot accidentally launch Windows Native path', async () => {
  const h = setup(64, 'Android'); await assert.rejects(h.context.connectAgoraLive(), /Windows/); assert.equal(h.calls.length, 0);
});
test('older Native host or extension is rejected before submitting login credentials', async () => {
  for (const hello of [{frameAck:false}, {extensionVersion:'1.0.6'}, {targetFps:10}]) {
    const h = setup(64, 'Windows', { hello }); await assert.rejects(h.context.connectAgoraLive(), /0.3.0/);
    assert.equal(h.calls.some(v => v.method === 'join'), false);
  }
});

test('BFCache fix extension remains compatible with the current Native host', async () => {
  const h = setup(64, 'Windows', { hello: { extensionVersion: '1.0.8' } });
  await h.context.connectAgoraLive();
  assert.equal(h.calls.some(v => v.method === 'join'), true);
});
test('web acknowledges decoded frames only and ignores stale playback after leaving', async () => {
  let image;
  const grid = { replaceChildren(){image=null;}, append(value){image=value;} };
  const document = { querySelector:()=>null, getElementById:id=>id==='liveVideoGrid'?grid:id==='nativeLiveVideo'?image:null,
    createElement:()=>({style:{},isConnected:true}) };
  const h = setup(64, 'Windows', { document }); await h.context.connectAgoraLive();
  const dispatch = sequence => h.listeners.get('message')({ source:h.window,origin:'https://fffdsaw.github.io',data:{protocol:'fromm-native-v1',direction:'extension',value:{type:'frame',sequence,jpeg:'data:image/jpeg;base64,AQ=='}} });
  dispatch(1); assert.equal(h.calls.some(v=>v.method==='frame-ack'),false);
  image.onload(); assert.equal(h.calls.find(v=>v.method==='frame-ack').params.sequence,1);
  const src=image.src; await h.context.stopLivePlayback(); dispatch(2); assert.equal(image.src,src);
});
test('extension background accepts only the official Viewer top frame', () => {
  const context = vm.createContext({ URL, chrome: { runtime: { onConnect: { addListener() {} } } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../chrome_extension/native-background.js'), 'utf8'), context);
  assert.equal(context.allowedSender({ frameId: 0, tab: { id: 1 }, url: 'https://fffdsaw.github.io/fromm-viewer/?v=1.07' }), true);
  for (const url of ['https://evil.example/fromm-viewer/', 'https://fffdsaw.github.io/other/', 'http://fffdsaw.github.io/fromm-viewer/']) assert.equal(context.allowedSender({ frameId: 0, tab: { id: 1 }, url }), false);
  assert.equal(context.allowedSender({ frameId: 1, tab: { id: 1 }, url: 'https://fffdsaw.github.io/fromm-viewer/' }), false);
});
test('hidden web tab retains only one repaint and ACK waits for actual image decoding', async () => {
  let image, decode;
  const callbacks = new Map(); let next = 0;
  const grid = { replaceChildren(){image=null;}, append(value){image=value;} };
  const document = { querySelector:()=>null, getElementById:id=>id==='liveVideoGrid'?grid:id==='nativeLiveVideo'?image:null,
    createElement:()=>({style:{},isConnected:true,decode:()=>new Promise(resolve=>{decode=resolve;})}) };
  const h = setup(64,'Windows',{document,requestAnimationFrame:callback=>{callbacks.set(++next,callback);return next;},cancelAnimationFrame:id=>callbacks.delete(id)});
  await h.context.connectAgoraLive();
  for (let sequence=1;sequence<=5;sequence++) {
    h.listeners.get('message')({source:h.window,origin:'https://fffdsaw.github.io',data:{protocol:'fromm-native-v1',direction:'extension',value:{type:'frame',sequence,jpeg:'data:image/jpeg;base64,AQ=='}}});
    const loaded=image.onload(); assert.equal(h.calls.filter(v=>v.method==='frame-ack').length,sequence-1);
    decode(); await loaded; assert.equal(h.calls.filter(v=>v.method==='frame-ack').length,sequence); assert.equal(callbacks.size,1);
  }
  await h.context.stopLivePlayback(); assert.equal(callbacks.size,0);
});
test('a superseded image decoding error acknowledges its own sequence, never the newer pending frame', async () => {
  let image; const decoders=[];
  const grid={replaceChildren(){image=null;},append(value){image=value;}};
  const document={querySelector:()=>null,getElementById:id=>id==='liveVideoGrid'?grid:id==='nativeLiveVideo'?image:null,
    createElement:()=>({style:{},isConnected:true,decode:()=>new Promise((resolve,reject)=>decoders.push({resolve,reject}))})};
  const h=setup(64,'Windows',{document}); await h.context.connectAgoraLive();
  const frame=sequence=>h.listeners.get('message')({source:h.window,origin:'https://fffdsaw.github.io',data:{protocol:'fromm-native-v1',direction:'extension',value:{type:'frame',sequence,jpeg:'data:image/jpeg;base64,AQ=='}}});
  frame(1);const first=image.onload();frame(2);const second=image.onload();decoders[0].reject();await first;
  assert.deepEqual(h.calls.filter(v=>v.method==='frame-ack').map(v=>v.params.sequence),[1]);
  decoders[1].resolve();await second;assert.deepEqual(h.calls.filter(v=>v.method==='frame-ack').map(v=>v.params.sequence),[1,2]);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { encode } = require('../src/native-wire.cjs');

const SRC = path.join(__dirname, '../src');
const flush = () => new Promise(setImmediate);
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function syntheticPayload() {
  return { channelName: 'room', userAccount: 'synthetic-account', encryptionKey: 'synthetic-only',
    encryptionKdfSalt: Array(32).fill(1), rtcToken: 'synthetic-only', expiresAt: 4e9, joinExpiresAt: 4e9 };
}

// Exercise the production main-process functions with controllable Electron IPC
// and timers. These tests verify lifecycle/visibility, not real media playback.
function mainHarness({ argv = [], env = {} } = {}) {
  const windows = [], timers = new Map(), switches = [], ipc = new EventEmitter();
  ipc.handlers = new Map(); ipc.handle = (name, fn) => ipc.handlers.set(name, fn);
  const app = new EventEmitter();
  app.commandLine = { appendSwitch: (...args) => switches.push(args) };
  app.whenReady = () => new Promise(() => {});
  app.quit = () => { app.quits = (app.quits || 0) + 1; }; app.exit = () => {};
  class MockWindow extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.sent = []; this.shows = 0; this.focuses = 0;
      this.webContents = new EventEmitter(); this.webContents.mainFrame = { url: '' };
      this.webContents.setWindowOpenHandler = fn => { this.openHandler = fn; };
      this.webContents.setAudioMuted = value => { this.audioMuted = value; };
      this.webContents.setFrameRate = value => { this.frameRate = value; };
      this.webContents.startPainting = () => { this.painting = true; };
      this.webContents.send = (name, value) => this.sent.push({ name, value });
      windows.push(this);
    }
    async loadURL(url) { this.webContents.mainFrame.url = url; }
    isDestroyed() { return !!this.destroyed; }
    show() { this.shows++; } focus() { this.focuses++; }
    destroy() { if (!this.destroyed) { this.destroyed = true; this.emit('closed'); } }
    close() { this.destroy(); }
  }
  const electron = { app, BrowserWindow: MockWindow, ipcMain: ipc,
    protocol: { registerSchemesAsPrivileged() {} }, session: { fromPartition: () => ({}) }, net: {} };
  let timerId = 0;
  const context = vm.createContext({ __dirname: SRC, process: { argv, env, platform: 'win32', arch: 'x64', stdout: { write() {} } },
    require: name => name === 'electron' ? electron : name.startsWith('./') ? require(path.join(SRC, name)) : require(name),
    Buffer, URL, Response, AbortSignal, console,
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'main.cjs'), 'utf8') + `
    globalThis.testHooks = { ensurePlayer, leavePlayer,
      getPlayer: () => player,
      setViewer: value => { viewer = value; },
      setController: value => { nativeController = value; },
      authorize: payload => { cachedEntry = { roomId: 'room', payload, epoch: authEpoch }; }
    };`, context);
  const event = window => ({ sender: window.webContents, senderFrame: window.webContents.mainFrame });
  const hooks = context.testHooks;
  function viewer() {
    const window = new MockWindow({ webPreferences: {} }); window.webContents.mainFrame.url = 'fromm://viewer/index.html';
    hooks.setViewer(window); return window;
  }
  async function open() {
    const opening = hooks.ensurePlayer(); await flush(); const window = hooks.getPlayer();
    ipc.emit('player:ready', event(window)); await opening; return window;
  }
  return { app, ipc, switches, windows, timers, hooks, event, open, viewer,
    runTimer(ms) { const entry = [...timers].find(([, value]) => value.ms === ms); assert.ok(entry, `timer ${ms} exists`); timers.delete(entry[0]); entry[1].fn(); } };
}

test('Native player starts hidden with active 30fps offscreen painting and keeps timers/audio active', async () => {
  const h = mainHarness(); const player = await h.open();
  assert.equal(player.options.show, false); assert.equal(player.options.paintWhenInitiallyHidden, true);
  assert.equal(player.options.skipTaskbar, true); assert.equal(player.options.webPreferences.focusOnNavigation, false);
  assert.equal(player.options.webPreferences.backgroundThrottling, false);
  assert.equal(player.options.webPreferences.offscreen, true); assert.equal(player.frameRate, 30); assert.equal(player.painting, true);
  assert.equal(player.options.webPreferences.autoplayPolicy, 'no-user-gesture-required'); assert.equal(player.audioMuted, false);
  assert.equal(player.shows, 0); assert.equal(player.focuses, 0);
  for (const name of ['disable-background-timer-throttling', 'disable-renderer-backgrounding', 'disable-backgrounding-occluded-windows']) {
    assert.ok(h.switches.some(args => args[0] === name), name);
  }
  assert.equal(player.openHandler().action, 'deny');
});

test('leave waits for renderer dispose, destroys its window, and a concurrent next join gets a fresh hidden player', async () => {
  const h = mainHarness(); const viewer = h.viewer(); const first = await h.open();
  const leaving = h.hooks.leavePlayer(); let left = false; leaving.then(() => { left = true; });
  assert.equal(first.sent.at(-1).value.type, 'leave'); assert.equal(first.isDestroyed(), false);
  h.hooks.authorize(syntheticPayload());
  const joining = h.ipc.handlers.get('live:join')(h.event(viewer), { roomId: 'room' });
  await flush(); assert.equal(h.hooks.getPlayer(), first); assert.equal(left, false);
  h.ipc.emit('player:status', h.event(first), { stage: 'left' });
  await leaving; await flush(); assert.equal(first.isDestroyed(), true);
  const second = h.hooks.getPlayer(); assert.ok(second); assert.notEqual(second, first);
  h.ipc.emit('player:ready', h.event(second));
  const result = await joining; assert.equal(result.ok, true);
  assert.equal(second.sent.at(-1).value.type, 'join'); assert.equal(second.shows, 0); assert.equal(second.focuses, 0);
  assert.equal(second.options.webPreferences.offscreen, true); assert.equal(second.frameRate, 30); assert.equal(second.painting, true);
  h.ipc.emit('player:status', h.event(first), { stage: 'left' });
  assert.equal(second.isDestroyed(), false);
});

test('an unresponsive renderer has a bounded shutdown and does not block a later player', async () => {
  const h = mainHarness(); const first = await h.open(); const leaving = h.hooks.leavePlayer();
  const repeated = h.hooks.leavePlayer(); assert.equal(repeated, leaving);
  assert.equal([...h.timers.values()].filter(value => value.ms === 1500).length, 1);
  h.runTimer(1500); await leaving; assert.equal(first.isDestroyed(), true);
  assert.equal(h.timers.size, 0); const next = await h.open(); assert.notEqual(next, first);
});

test('leave cancels a desktop join waiting for player readiness', async () => {
  const h = mainHarness(); const viewer = h.viewer(); h.hooks.authorize(syntheticPayload());
  const joining = h.ipc.handlers.get('live:join')(h.event(viewer), { roomId: 'room' }); await flush();
  const player = h.hooks.getPlayer(); const leaving = h.hooks.leavePlayer();
  h.ipc.emit('player:ready', h.event(player)); const result = await joining;
  assert.equal(result.ok, false); assert.equal(result.code, 'JOIN_CANCELLED');
  assert.equal(player.sent.some(value => value.value.type === 'join'), false);
  h.ipc.emit('player:status', h.event(player), { stage: 'left' }); await leaving;
});

test('shutdown before player readiness settles the pending join without waiting for the startup timeout', async () => {
  const h = mainHarness(); const viewer = h.viewer(); h.hooks.authorize(syntheticPayload());
  let result;
  const joining = h.ipc.handlers.get('live:join')(h.event(viewer), { roomId: 'room' }).then(value => { result = value; });
  await flush(); const player = h.hooks.getPlayer(); const leaving = h.hooks.leavePlayer();
  h.runTimer(1500); await leaving; await flush();
  assert.equal(player.isDestroyed(), true);
  assert.ok(result, 'destroying an unready player must settle its pending startup');
  assert.equal(result.ok, false); assert.equal(result.code, 'JOIN_CANCELLED'); await joining;
});

test('player IPC accepts only the current top frame and rejects stale status/frame/ready events', async () => {
  const h = mainHarness(); const events = [];
  h.hooks.setController({ status: value => events.push(['status', value]), frame: value => events.push(['frame', value]) });
  const first = await h.open(); const valid = h.event(first);
  const wrongFrame = { sender: valid.sender, senderFrame: { url: 'fromm://player/player.html' } };
  h.ipc.emit('player:frame', wrongFrame, { sequence: 1 }); h.ipc.emit('player:status', wrongFrame, { stage: 'left' });
  assert.equal(events.length, 0);
  h.ipc.emit('player:frame', valid, { sequence: 2 }); assert.equal(events.length, 1);
  const leaving = h.hooks.leavePlayer(); h.ipc.emit('player:status', valid, { stage: 'left' }); await leaving;
  const opening = h.hooks.ensurePlayer(); await flush(); let ready = false; opening.then(() => { ready = true; });
  const count = events.length;
  h.ipc.emit('player:ready', valid); h.ipc.emit('player:frame', valid, { sequence: 3 }); h.ipc.emit('player:status', valid, { stage: 'left' });
  await flush(); assert.equal(ready, false); assert.equal(events.length, count);
  const second = h.hooks.getPlayer(); h.ipc.emit('player:ready', h.event(second)); await opening;
  assert.equal(second.isDestroyed(), false);
});

test('Native show requires an explicit debug flag or environment option and cannot interrupt default playback', async () => {
  for (const options of [{}, { env: { FROMM_NATIVE_DEBUG: '0' } }, { argv: ['--show-native-player'] }, { env: { FROMM_NATIVE_DEBUG: '1' } }]) {
    const h = mainHarness(options); const viewer = h.viewer(); const player = await h.open();
    const debug = !!options.argv || options.env?.FROMM_NATIVE_DEBUG === '1';
    assert.equal(player.options.show, false);
    assert.equal(player.options.webPreferences.offscreen, !debug);
    assert.equal(player.frameRate, debug ? undefined : 30); assert.equal(player.painting, debug ? undefined : true);
    const result = h.ipc.handlers.get('live:show')(h.event(viewer));
    assert.equal(result.ok, debug); assert.equal(player.shows, debug ? 1 : 0); assert.equal(player.focuses, debug ? 1 : 0);
    if (!debug) assert.equal(result.code, 'NATIVE_DEBUG_DISABLED');
    assert.equal(player.isDestroyed(), false); assert.equal(player.sent.some(value => value.value.type === 'leave'), false);
  }
});

test('closing the only hidden player keeps the native messaging host available for reconnection', () => {
  const host = mainHarness({ argv: ['--fromm-native-bridge'] }); host.app.emit('window-all-closed'); assert.equal(host.app.quits || 0, 0);
  const standalone = mainHarness(); standalone.app.emit('window-all-closed'); assert.equal(standalone.app.quits, 1);
});

test('renderer leave stops JPEG capture and releases Agora before sending its shutdown ACK', async () => {
  const ipc = new EventEmitter(), operations = [], posted = [], timers = new Map(); let callbacks, renderingFps, joinOptions;
  ipc.send = (name, value) => { posted.push({ name, value }); if (name === 'player:status' && value.stage === 'left') operations.push('left-ack'); };
  const engine = {
    initialize: () => 0, enableVideo: () => 0, enableLocalAudio: () => 0, enableLocalVideo: () => 0,
    setClientRole: () => 0, enableEncryption: () => 0,
    registerEventHandler(value) { callbacks = value; },
    joinChannelWithUserAccount(_token, _channel, _account, options) { joinOptions = options; return 0; },
    unregisterEventHandler() { operations.push('unregister'); }, leaveChannel() { operations.push('leave-channel'); },
    release() { operations.push('release'); }
  };
  const sdk = { createAgoraRtcEngine: () => engine, ChannelProfileType: { ChannelProfileLiveBroadcasting: 1 },
    ClientRoleType: { ClientRoleAudience: 2 }, EncryptionMode: { Aes256Gcm2: 8 }, LogLevel: { LogLevelNone: 0 },
    AgoraEnv: { AgoraRendererManager: { setRenderingFps(value) { renderingFps = value; } } } };
  const canvas = { width: 720, height: 1280, style: {}, toDataURL: () => 'data:image/jpeg;base64,AQ==' };
  const context = vm.createContext({ Buffer, performance: { now: () => 0 }, console: {},
    window: { addEventListener() {} },
    document: { getElementById: id => id === 'videos' ? { replaceChildren() { operations.push('clear-canvas'); } } : null,
      querySelector: () => canvas },
    setTimeout() {}, setInterval: (fn, ms) => { timers.set(1, { fn, ms }); return 1; },
    clearInterval: id => { if (timers.delete(id)) operations.push('stop-frame-pump'); },
    require: name => name === 'electron' ? { ipcRenderer: ipc } : name === 'agora-electron-sdk' ? sdk : require(path.join(SRC, name)) });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'player-preload.cjs'), 'utf8'), context);
  ipc.emit('player:command', {}, { type: 'join', payload: { ...syntheticPayload(), appId: '0'.repeat(32) }, inlineVideo: true });
  assert.equal(renderingFps, 30); assert.equal(timers.get(1).ms, 1000 / 30);
  assert.equal(joinOptions.autoSubscribeAudio, true); assert.equal(joinOptions.autoSubscribeVideo, true);
  assert.equal(joinOptions.enableAudioRecordingOrPlayout, true); assert.equal(joinOptions.publishMicrophoneTrack, false);
  const tick = timers.get(1).fn; await tick(); operations.length = 0;
  ipc.emit('player:command', {}, { type: 'leave' });
  assert.deepEqual(operations, ['stop-frame-pump', 'unregister', 'leave-channel', 'release', 'clear-canvas', 'left-ack']);
  assert.equal(timers.size, 0);
  const after = posted.length; callbacks.onFirstRemoteAudioDecoded(); callbacks.onFirstRemoteVideoFrame({}, 1, 720, 1280); await tick();
  assert.equal(posted.length, after, 'disposed renderer ignores old SDK callbacks and timer ticks');
});

function controllerHarness({ leave = async () => {}, show = async () => false, fetch } = {}) {
  const input = new EventEmitter(), sent = [], joined = [], acknowledgements = []; let quits = 0, fetches = 0;
  const contracts = require('../src/contracts.cjs');
  const context = vm.createContext({ module: { exports: {} }, process, Buffer, URL, AbortController, AbortSignal,
    require: name => name === 'electron' ? { net: { fetch: async (...args) => { fetches++; return fetch ? fetch(...args) : { ok: true, json: async () => ({ synthetic: true }) }; } } }
      : name === './contracts.cjs' ? { ...contracts, enterEnvelope: (_data, room) => { assert.equal(room, 'room'); return syntheticPayload(); } }
        : require(path.join(SRC, name)) });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'native-controller.cjs'), 'utf8'), context);
  const controller = context.module.exports.createController({ input, sendMessage: value => sent.push(value), leave, show,
    join: async payload => joined.push(payload), renew() {}, quit: () => { quits++; }, acknowledge: sequence => acknowledgements.push(sequence) });
  const send = (id, method, params = {}) => input.emit('data', encode({ id, method, params }));
  const join = id => send(id, 'join', { roomId: 'room', channelId: 'synthetic-channel', uuid: 'synthetic-device', authToken: 'synthetic-auth' });
  return { input, sent, joined, acknowledgements, controller, send, join, fetches: () => fetches, quits: () => quits };
}

test('hello advertises hidden 30fps/ACK playback; disabled debug show keeps an active stream and ACK path', async () => {
  const h = controllerHarness(); h.send(1, 'hello'); await flush(); const hello = h.sent.find(value => value.id === 1);
  for (const [key, value] of Object.entries({ version: 3, toolVersion: '0.4.0', backgroundPlayer: true, frameAck: true, targetFps: 30, inlineVideo: true })) assert.equal(hello[key], value);
  h.join(2); await flush(); assert.equal(h.joined.length, 1);
  h.send(3, 'show'); await flush(); assert.equal(h.sent.find(value => value.id === 3).code, 'NATIVE_DEBUG_DISABLED');
  h.controller.frame({ sequence: 1, jpeg: 'data:image/jpeg;base64,AQ==' }); h.send(4, 'frame-ack', { sequence: 1 });
  assert.equal(h.sent.at(-1).type, 'frame'); assert.deepEqual(h.acknowledgements, [1]);
});

test('native leave reply and subsequent join both wait for renderer shutdown', async () => {
  const ending = deferred(); let leaves = 0;
  const h = controllerHarness({ leave: () => ++leaves === 2 ? ending.promise : Promise.resolve() });
  h.join(1); await flush(); h.send(2, 'leave'); h.join(3); await flush();
  assert.equal(h.sent.some(value => value.id === 2), false); assert.equal(h.joined.length, 1); assert.equal(h.fetches(), 1);
  h.controller.frame({ sequence: 1, jpeg: 'data:image/jpeg;base64,AQ==' }); assert.equal(h.sent.some(value => value.type === 'frame'), false);
  ending.resolve(); await flush(); assert.equal(h.sent.find(value => value.id === 2).ok, true);
  assert.equal(h.joined.length, 2); assert.equal(h.sent.find(value => value.id === 3).ok, true);
});

test('leave cancels a native join while the authorized enter request is pending', async () => {
  const entering = deferred(), signals = [];
  const h = controllerHarness({ fetch: (_url, options) => {
    signals.push(options.signal);
    return signals.length === 1 ? entering.promise : { ok: true, json: async () => ({ synthetic: true }) };
  } });
  h.join(1); await flush(); assert.equal(h.fetches(), 1); h.send(2, 'leave');
  await flush(); assert.equal(signals[0].aborted, true);
  assert.equal(h.joined.length, 0); assert.equal(h.sent.find(value => value.id === 1).code, 'JOIN_CANCELLED');
  assert.equal(h.sent.find(value => value.id === 2).ok, true);
  h.join(3); await flush(); assert.equal(h.joined.length, 1); assert.equal(h.sent.find(value => value.id === 3).ok, true);
  entering.resolve({ ok: true, json: async () => ({ synthetic: true }) }); await flush(); assert.equal(h.joined.length, 1);
});

test('leave cancels a queued native join before an old renderer finishes teardown', async () => {
  const ending = deferred(); let leaves = 0;
  const h = controllerHarness({ leave: () => ++leaves === 1 ? ending.promise : Promise.resolve() });
  h.join(1); await flush(); h.send(2, 'leave'); ending.resolve(); await flush();
  assert.equal(h.fetches(), 0); assert.equal(h.joined.length, 0);
  assert.equal(h.sent.find(value => value.id === 1).code, 'JOIN_CANCELLED');
  assert.equal(h.sent.find(value => value.id === 2).ok, true);
});

test('disconnect invalidates an in-flight enter and quits only after hidden player shutdown', async () => {
  const entering = deferred(), ending = deferred(); let leaves = 0;
  const h = controllerHarness({ fetch: () => entering.promise, leave: () => ++leaves === 1 ? Promise.resolve() : ending.promise });
  h.join(1); await flush(); h.input.emit('end'); h.input.emit('error', new Error('synthetic-only')); await flush();
  assert.equal(h.quits(), 0);
  entering.resolve({ ok: true, json: async () => ({ synthetic: true }) }); await flush(); assert.equal(h.joined.length, 0);
  ending.resolve(); await flush(); assert.equal(h.quits(), 1); assert.equal(h.sent.some(value => value.id === 1), false);
});

test('relay EOF discards queued joins and ends a late Electron connection without replaying credentials', () => {
  const stdin = new EventEmitter(), child = new EventEmitter(), timers = new Map(), exits = [], spawnCalls = [];
  child.stdout = child.stderr = { resume() {} }; child.kill = () => { child.killed = true; };
  let connect;
  const net = { createServer: callback => {
    connect = callback;
    return { listen(_pipe, ready) { ready(); } };
  } };
  const identity = require('../extension-identity.json');
  const context = vm.createContext({ __dirname: SRC, Buffer,
    process: { argv: ['node', 'relay.cjs', `chrome-extension://${identity.id}/`], env: { ELECTRON_RUN_AS_NODE: '1' }, stdin,
      stdout: { write() {} }, exit: code => exits.push(code) },
    setTimeout: (fn, ms) => { timers.set(1, { fn, ms }); return 1; }, clearTimeout: id => timers.delete(id),
    require: name => name === 'node:net' ? net : name === 'node:child_process' ? { spawn: (...args) => { spawnCalls.push(args); return child; } }
      : name.startsWith('.') ? require(path.join(SRC, name)) : require(name) });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'native-relay.cjs'), 'utf8'), context);
  assert.equal(spawnCalls[0][2].windowsHide, true); assert.equal('ELECTRON_RUN_AS_NODE' in spawnCalls[0][2].env, false);
  stdin.emit('data', encode({ id: 1, method: 'join', params: { authToken: 'synthetic-only' } })); stdin.emit('end');
  const stream = new EventEmitter(); stream.writes = [];
  stream.write = value => stream.writes.push(value); stream.end = () => { stream.ended = true; }; stream.destroy = () => { stream.destroyed = true; };
  connect(stream);
  assert.equal(stream.ended, true); assert.equal(stream.writes.length, 0); assert.equal(child.killed, undefined);
  assert.equal(timers.get(1).ms, 3000); child.emit('exit', 0); assert.equal(timers.size, 0); assert.deepEqual(exits, [0]);
});

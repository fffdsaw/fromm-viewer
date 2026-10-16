'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '..', 'web-live-pip.js'), 'utf8');
const jpeg = 'data:image/jpeg;base64,AQ==';
function element(tag) {
  return {tagName: tag.toUpperCase(), children: [], listeners: new Map(), attributes: {}, style: {}, src: '', textContent: '',
    append(child) {this.children.push(child); child.parentElement = this;},
    replaceChildren(...children) {this.children = []; children.forEach(child => this.append(child));},
    addEventListener(type, callback) {this.listeners.set(type, callback);},
    removeEventListener(type) {this.listeners.delete(type);},
    remove() {if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);},
    setAttribute(key, value) {this.attributes[key] = value;},
    contains(child) {return this.children.includes(child);}};
}
function setup({supported = true, secure = true, topLevel = true, loaded = true, src = jpeg, videoPip = false} = {}) {
  const timeline = element('div'), head = element('div'), grid = element('div'), image = element('img');
  image.id = 'nativeLiveVideo'; image.src = src; image.naturalWidth = loaded ? 720 : 0;
  image.naturalHeight = loaded ? 1280 : 0; image.complete = loaded;
  grid.append(image);
  const listeners = new Map(), windows = [], requests = [];
  let observer, resolver, rejecter, webVideo = null, renders = 0, stops = 0, pipVideo, track, captures = 0;
  timeline.querySelector = selector => selector === '.live-head' ? head : null;
  const document = {pictureInPictureEnabled: true, pictureInPictureElement: null, body: element('body'),
    getElementById(id) {return id === 'timeline' ? timeline : id === 'nativeLiveVideo' ? grid.children.find(e => e.id === id) :
      id === 'liveVideoGrid' ? grid : id === 'livePipBtn' ? head.children.find(e => e.id === id) : null;},
    querySelector: () => webVideo,
    createElement(tag) {
      const el = element(tag);
      if (tag === 'canvas' && videoPip) {
        track = {readyState: 'live', requestFrame() {captures++;}, stop() {this.readyState = 'ended';}};
        el.captureStream = () => ({getTracks: () => [track], getVideoTracks: () => [track]});
        el.getContext = () => ({fillRect() {}, drawImage() {}});
      }
      if (tag === 'video' && videoPip) {
        pipVideo = el; el.pause = () => {};
        el.play = async () => {queueMicrotask(() => el.listeners.get('loadeddata')?.());};
        el.requestPictureInPicture = () => new Promise((resolve, reject) => {resolver = resolve; rejecter = reject;});
      }
      return el;
    },
    exitPictureInPicture: async () => {document.pictureInPictureElement = null;}};
  const window = {isSecureContext: secure, addEventListener(type, callback) {listeners.set(type, callback);}};
  window.top = topLevel ? window : {};
  if (supported) window.documentPictureInPicture = {requestWindow(options) {
    requests.push(options);
    return new Promise((resolve, reject) => {resolver = resolve; rejecter = reject;});
  }};
  const state = {filter: 'live', live: {client: {}, centerMode: 'live', connectionSeq: 1, currentLiveRoomId: 'room'}};
  const context = vm.createContext({window, document, state, WeakMap, setTimeout, clearTimeout,
    ...(videoPip ? {HTMLVideoElement: {prototype: {requestPictureInPicture() {}}}, HTMLCanvasElement: {prototype: {captureStream() {}}}} : {}),
    MutationObserver: class {constructor(callback) {observer = callback;} observe() {}},
    renderLiveView: () => {renders++;}, stopLivePlayback: () => {state.live.client = null; state.live.connectionSeq++; stops++; return Promise.resolve();}});
  vm.runInContext(code, context);
  function makeWindow() {
    const win = {closed: false, listeners: new Map(), document: {head: element('head'), body: element('body'), createElement: element},
      close() {if (this.closed) return; this.closed = true; this.listeners.get('pagehide')?.();},
      addEventListener(type, callback) {this.listeners.set(type, callback);}};
    windows.push(win); return win;
  }
  return {context, state, image, head, grid, document, requests, windows,
    button: () => document.getElementById('livePipBtn'), sync: () => observer([]),
    assign: () => observer([{type: 'attributes', target: image}]),
    click: () => document.getElementById('livePipBtn').listeners.get('click')(),
    finish: () => {const win = makeWindow(); resolver(win); return win;}, reject: error => rejecter(error),
    finishVideo: () => {document.pictureInPictureElement = pipVideo; resolver();},
    video: () => pipVideo, track: () => track, captures: () => captures,
    load: () => timeline.listeners.get('load')({target: image}), pagehide: () => listeners.get('pagehide')(),
    setWebVideo(value) {grid.replaceChildren(); webVideo = value; observer();},
    counts: () => ({renders, stops})};
}

test('Native PiP requires a decoded safe JPEG, top-level secure context and Document PiP support', () => {
  for (const options of [{loaded: false}, {supported: false}, {secure: false}, {topLevel: false}, {src: 'https://cdn.example/frame.jpg'}, {src: 'data:image/png;base64,AQ=='}, {src: jpeg + 'x'.repeat(800000)}]) {
    const h = setup(options); assert.equal(h.button().disabled, true);
  }
  const h = setup({loaded: false}); h.image.naturalWidth = 720; h.assign(); h.load(); assert.equal(h.button().disabled, false);
});

test('Native PiP mirrors only image pixels, preserves the original and stays ready between 30fps src swaps', async () => {
  const h = setup(), opening = h.click(), win = h.finish(); await opening;
  assert.deepEqual(win.document.body.children.map(child => child.tagName), ['IMG']);
  assert.equal(win.document.body.children[0].src, jpeg);
  assert.equal(win.document.title, 'LIVE 영상');
  assert.equal(h.grid.children[0], h.image);
  h.image.src = 'data:image/jpeg;base64,Ag=='; h.image.complete = false; h.assign();
  assert.equal(win.document.body.children[0].src, h.image.src);
  assert.equal(h.button().disabled, false); assert.equal(h.button().attributes['aria-pressed'], 'true');
  await h.click(); assert.equal(win.closed, true); assert.equal(h.grid.children[0], h.image);
  assert.equal(h.button().attributes['aria-pressed'], 'false');
});

for (const transition of ['stop', 'render', 'sequence', 'room', 'filter', 'centerMode', 'source']) test('pending Native PiP is discarded after ' + transition + ' changes', async () => {
  const h = setup(), opening = h.click();
  assert.equal(h.button().disabled, true);
  await h.click(); assert.equal(h.requests.length, 1, 'duplicate activation is ignored while opening');
  if (transition === 'stop') await h.context.stopLivePlayback();
  if (transition === 'render') h.context.renderLiveView();
  if (transition === 'sequence') h.state.live.connectionSeq++;
  if (transition === 'room') h.state.live.currentLiveRoomId = 'other';
  if (transition === 'filter') h.state.filter = 'all';
  if (transition === 'centerMode') h.state.live.centerMode = 'replay';
  if (transition === 'source') h.grid.replaceChildren();
  const stale = h.finish(); await opening;
  assert.equal(stale.closed, true); assert.equal(stale.document.body.children.length, 0);
});

test('stop, render and pagehide close active Native PiP without interfering with original wrappers', async () => {
  for (const transition of ['stop', 'render', 'pagehide']) {
    const h = setup(), opening = h.click(), win = h.finish(); await opening;
    if (transition === 'stop') await h.context.stopLivePlayback();
    if (transition === 'render') h.context.renderLiveView();
    if (transition === 'pagehide') h.pagehide();
    assert.equal(win.closed, true);
    assert.equal(h.counts().stops, transition === 'stop' ? 1 : 0);
    assert.equal(h.counts().renders, transition === 'render' ? 1 : 0);
  }
});

test('source removal closes active Native PiP; a new connection requires its own decoded frame', async () => {
  const h = setup(), opening = h.click(), win = h.finish(); await opening;
  h.grid.replaceChildren(); h.sync(); assert.equal(win.closed, true);
  h.grid.append(h.image); h.state.live.connectionSeq++; h.sync(); assert.equal(h.button().disabled, true);
  h.load(); assert.equal(h.button().disabled, true, 'old connection load cannot mark the source ready');
  h.image.src = 'data:image/jpeg;base64,Ag=='; h.assign(); h.load(); assert.equal(h.button().disabled, false);
});

test('late old Native image load stays unavailable after stop, including a new client before its first frame', async () => {
  const h = setup(); await h.context.stopLivePlayback(); h.load(); assert.equal(h.button().disabled, true);
  h.state.live.client = {}; h.load(); assert.equal(h.button().disabled, true);
  h.image.src = 'data:image/jpeg;base64,Ag=='; h.assign(); h.load(); assert.equal(h.button().disabled, false);
});

test('opening errors release the control and show a fixed safe message without raw exception text', async () => {
  const h = setup(), opening = h.click(); h.reject(new Error('sensitive fixture detail')); await opening;
  assert.equal(h.button().disabled, false); assert.match(h.button().title, /PiP 창을 열지 못했습니다/);
  assert.doesNotMatch(h.button().title, /sensitive/);
  const retry = h.click(), win = h.finish(); await retry; assert.equal(win.closed, false);
});

test('Web video uses browser video PiP and stop exits only the LIVE video', async () => {
  const h = setup(); let requests = 0;
  const video = {readyState: 2, disablePictureInPicture: false, async requestPictureInPicture() {requests++; h.document.pictureInPictureElement = video;}};
  h.setWebVideo(video); assert.equal(h.button().disabled, false);
  await h.click(); assert.equal(requests, 1); assert.equal(h.document.pictureInPictureElement, video);
  await h.context.stopLivePlayback(); assert.equal(h.document.pictureInPictureElement, null);
});

test('pending Web video PiP exits after playback stops instead of reopening a stale player', async () => {
  const h = setup(); let finish;
  const video = {readyState: 2, disablePictureInPicture: false, requestPictureInPicture() {
    return new Promise(resolve => {finish = () => {h.document.pictureInPictureElement = video; resolve();};});
  }};
  h.setWebVideo(video); const opening = h.click(); await h.context.stopLivePlayback(); finish(); await opening;
  assert.equal(h.document.pictureInPictureElement, null);
});

for (const transition of ['room', 'source']) test('pending Web video PiP is discarded after ' + transition + ' changes', async () => {
  const h = setup(); let finish;
  const video = {readyState: 2, disablePictureInPicture: false, requestPictureInPicture() {
    return new Promise(resolve => {finish = () => {h.document.pictureInPictureElement = video; resolve();};});
  }};
  h.setWebVideo(video); const opening = h.click();
  if (transition === 'room') h.state.live.currentLiveRoomId = 'other';
  if (transition === 'source') h.setWebVideo({...video});
  finish(); await opening; assert.equal(h.document.pictureInPictureElement, null);
});

test('Native canvas video PiP captures only decoded JPEGs, is silent and disposes its own stream', async () => {
  const h = setup({videoPip: true}), opening = h.click();
  await new Promise(setImmediate); h.finishVideo(); await opening;
  assert.equal(h.requests.length, 0, 'standard video PiP replaces the separate document window');
  assert.equal(h.video().muted, true); assert.equal(h.captures(), 1);
  h.image.src = 'data:image/jpeg;base64,Ag=='; h.image.complete = false; h.assign();
  assert.equal(h.captures(), 1, 'source mutation must not draw an undecoded JPEG');
  h.image.complete = true; h.load(); assert.equal(h.captures(), 2);
  await h.click(); await new Promise(setImmediate);
  assert.equal(h.document.pictureInPictureElement, null); assert.equal(h.track().readyState, 'ended');
  assert.equal(h.video().srcObject, null); assert.equal(h.grid.children[0], h.image);
});

for (const transition of ['stop', 'render', 'sequence', 'room', 'filter', 'source']) test('late Native video PiP request closes after ' + transition, async () => {
  const h = setup({videoPip: true}), opening = h.click();
  await new Promise(setImmediate);
  if (transition === 'stop') await h.context.stopLivePlayback();
  if (transition === 'render') h.context.renderLiveView();
  if (transition === 'sequence') h.state.live.connectionSeq++;
  if (transition === 'room') h.state.live.currentLiveRoomId = 'other';
  if (transition === 'filter') h.state.filter = 'all';
  if (transition === 'source') h.grid.replaceChildren();
  h.finishVideo(); await opening; await new Promise(setImmediate);
  assert.equal(h.document.pictureInPictureElement, null); assert.equal(h.track().readyState, 'ended');
});

test('rejected Native video PiP cleans up capture without raw error details or changing Native playback', async () => {
  const h = setup({videoPip: true}), opening = h.click();
  await new Promise(setImmediate); h.reject(new Error('private fixture value')); await opening;
  assert.equal(h.track().readyState, 'ended'); assert.equal(h.video().srcObject, null);
  assert.equal(h.grid.children[0], h.image); assert.equal(h.button().disabled, false);
  assert.doesNotMatch(h.button().title, /private/);
});

'use strict';
// History semantics only. This VM does not emulate Chrome's toolbar or Android Back.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script id="channelVideosScript">([\s\S]*?)<\/script>/)[1];
const popstate = html.match(/window.addEventListener\("popstate",event=>\{[^]*?\n\}\);/)[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(initial = null) {
  const posts = ['v1', 'v2'].map(id => ({id, type: 'video', _channelId: 'a'}));
  const entries = [{state: null, url: 'https://outside.test/'}, {state: initial, url: 'https://viewer.test/'}];
  let index = 1, listener, backCalls = 0;
  const location = {href: entries[index].url};
  const history = {
    get state() {return entries[index].state;},
    get length() {return entries.length;},
    replaceState(state, _, url) {entries[index] = {state, url}; location.href = url;},
    pushState(state, _, url) {entries.splice(++index); entries.push({state, url}); location.href = url;},
    back() {backCalls++; this.go(-1);},
    forward() {this.go(1);},
    go(delta) {index += delta; location.href = entries[index].url; listener({state: this.state});},
  };
  const state = {filter: 'live', live: {centerMode: 'channel', channels: [{id: 'a'}, {id: 'b'}], replaySelected: null}};
  const context = vm.createContext({state, history, location, URL, Blob, AbortController, setTimeout, clearTimeout,
    requestAnimationFrame: callback => callback(), currentAuth: () => ({token: 'fixture'}),
    document: {querySelector: () => null},
    window: {scrollY: 142, scrollTo() {}, crypto: require('node:crypto').webcrypto,
      addEventListener: (_, callback) => {listener = callback;}},
    renderLiveView() {}, safeErrorDetail: String,
    stopReplayPlayback() {state.live.replaySelected = null;},
    async setLiveCenterMode(mode) {state.live.centerMode = mode;},
  });
  vm.runInContext(script, context);
  vm.runInContext(popstate, context);
  const s = vm.runInContext('channelVideoState', context);
  s.channelId = 'a';
  s.pages.set('a', {posts, loaded: true});
  context.loadChannelVideos = async () => {};
  context.fetchChannelVideoDetail = async post => ({...post, _streamUrl: 'https://media.test/video.mp4'});
  return {context, s, state, history, entries, get backCalls() {return backCalls;}};
}
test('Channel explicitly records its list before the player, replacing stale Replay/Channel state', async () => {
  for (const initial of [null, {frommReplay: true}, {frommChannel: true, postId: 'old', channelId: 'a'}]) {
    const h = setup(initial);
    await h.context.playChannelVideo('v1');
    assert.equal(h.entries[1].state.frommChannelList, true);
    assert.equal(h.entries[1].state.channelId, 'a');
    assert.equal(h.history.state.listId, h.entries[1].state.listId);
    h.history.back(); await tick();
    assert.equal(h.s.selected, null);
    assert.equal(h.s.listScrollY, 142);
    h.history.forward(); await tick();
    assert.equal(h.s.selected.id, 'v1');
    assert.equal(h.history.length, 3);
  }
});
test('consecutive player opens replace the player; a single Back always reaches its list', async () => {
  const h = setup();
  await h.context.playChannelVideo('v1');
  await h.context.playChannelVideo('v2');
  assert.equal(h.history.length, 3);
  h.context.returnToChannelList(); await tick();
  assert.equal(h.s.selected, null);
  h.history.forward(); await tick();
  assert.equal(h.s.selected.id, 'v2');
  h.history.back(); await tick();
  await h.context.playChannelVideo('v1');
  assert.equal(h.history.length, 3, 're-entry discards the old Forward branch');
});
test('an orphan/restored PR #29 player state cannot make the in-page Back leave Viewer', async () => {
  const h = setup({frommChannel: true, postId: 'v1', channelId: 'a'});
  await h.context.playChannelVideo('v1', {pushHistory: false});
  h.context.returnToChannelList(); await tick();
  assert.equal(h.backCalls, 0);
  assert.equal(h.s.selected, null);
  assert.equal(h.history.state.frommChannelList, true);
});
test('Back invalidates a pending video detail response', async () => {
  const h = setup();
  let finish;
  h.context.fetchChannelVideoDetail = post => new Promise(resolve => {finish = () => resolve(post);});
  const pending = h.context.playChannelVideo('v1');
  h.history.back(); await tick();
  finish(); await pending;
  assert.equal(h.s.selected, null);
});
test('leaving Channel removes its list marker so Replay Back keeps the Replay list', async () => {
  const h = setup();
  await h.context.playChannelVideo('v1');
  h.history.back(); await tick();
  h.context.stopLivePlayback = async () => {};
  h.context.loadReplayCenter = async () => {};
  vm.runInContext(html.match(/^async function setLiveCenterMode\([^]*?^}/m)[0], h.context);
  await h.context.setLiveCenterMode('replay');
  assert.equal(h.history.state, null);
  h.history.pushState({frommReplay: true}, '', 'https://viewer.test/#replay=a:r1');
  h.state.live.replaySelected = {id: 'r1'};
  h.history.back(); await tick();
  assert.equal(h.state.live.centerMode, 'replay');
  assert.equal(h.state.live.replaySelected, null);
});
test('Forward restores the Channel tab/filter and rapid Back cancels delayed restoration', async () => {
  const h = setup();
  await h.context.playChannelVideo('v1');
  h.history.back(); await tick();
  h.state.live.centerMode = 'replay';
  h.s.channelId = 'b';
  h.history.forward(); await tick();
  assert.equal(h.state.live.centerMode, 'channel');
  assert.equal(h.s.channelId, 'a');
  assert.equal(h.s.selected.id, 'v1');
  h.history.back(); await tick();
  let finish, selects = 0;
  h.s.channelId = 'b';
  h.context.selectChannelVideos = async id => {
    if (++selects === 1) await new Promise(resolve => {finish = resolve;});
    h.s.channelId = id;
  };
  h.history.forward(); await tick();
  h.history.back(); await tick();
  finish(); await tick();
  assert.equal(h.s.selected, null);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function fn(name, source = html) {
  const match = source.match(new RegExp('^(?:async )?function ' + name + '\\([^]*?^}', 'm'));
  assert.ok(match, name); return match[0];
}
function setup(kind = 'channel') {
  const items = ['one', 'two', 'three'].map(id => ({id, _channelId: 'artist-a', title: id}));
  const button = {disabled: false, textContent: '저장'};
  const selected = new Set(items.map(p => JSON.stringify([kind, p._channelId, p.id])));
  const alerts = [], details = [], writes = [], aborted = [], files = new Set();
  let session = true, contextName = `${kind}:a`;
  const state = {postSelected: selected, scanGeneration: 1, postBulkSaving: false, live: {replayDownloading: false}};
  const channelVideoState = {downloading: false};
  const directory = {async getFileHandle(name, options) {
    if (!options?.create && !files.has(name)) throw Object.assign(new Error('missing'), {name: 'NotFoundError'});
    return {async createWritable() {return {async abort() {aborted.push(name);}};}};
  }};
  const c = vm.createContext({state, channelVideoState, Set, String, Math,
    window: {showDirectoryPicker: async () => directory, alert: message => alerts.push(message)},
    $: () => button, supportsDirectorySave: () => true, sleep: async () => {},
    channelVideoSession: () => () => session,
    downloadSelectionScope: () => ({kind, items, context: contextName}),
    syncDownloadSelection() {}, safeErrorDetail: String,
    replayDownloadFilename: post => `${post.title}.ts`, replayStreamUrl: post => post._streamUrl,
    fetchChannelVideoDetail: async post => {details.push(post.id); return {...post, _streamUrl: post.id};},
    fetchReplayPostDetail: async (post, options) => {
      assert.equal(post._streamUrl, ''); assert.equal(options.force, true);
      details.push(post.id); return {...post, _streamUrl: post.id};
    },
    downloadReplayStream: async (url, sink, progress) => {progress(1, 1); writes.push(url); files.add(sink.filename); sink.writable = null;}
  });
  for (const name of ['downloadSelectionKey', 'saveSelectedPosts']) vm.runInContext(fn(name), c);
  return {c, items, state, channelVideoState, button, alerts, details, writes, aborted, files,
    expire: () => {session = false;}, changeScope: () => {contextName = 'another';}};
}
function unlocked(h) {
  assert.equal(h.state.postBulkSaving, false); assert.equal(h.channelVideoState.downloading, false);
  assert.equal(h.state.live.replayDownloading, false); assert.equal(h.button.disabled, false);
  assert.equal(h.button.textContent, '저장');
}
test('folder cancellation preserves every selection and makes no detail/download requests', async () => {
  const h = setup();
  h.c.window.showDirectoryPicker = async () => {throw Object.assign(new Error('cancel'), {name: 'AbortError'});};
  await h.c.saveSelectedPosts();
  assert.equal(h.state.postSelected.size, 3); assert.equal(h.details.length, 0);
  assert.equal(h.writes.length, 0); assert.equal(h.alerts.length, 0); unlocked(h);
});
test('denied destination preserves selections and releases controls', async () => {
  const h = setup(); h.c.window.showDirectoryPicker = async () => {throw new Error('permission denied');};
  await h.c.saveSelectedPosts();
  assert.equal(h.state.postSelected.size, 3); assert.equal(h.details.length, 0);
  assert.match(h.alerts[0], /permission denied/); unlocked(h);
});
test('one forbidden detail retains that selection, successful files are deselected and retry works', async () => {
  const h = setup(), original = h.c.fetchChannelVideoDetail;
  h.c.fetchChannelVideoDetail = async p => {if (p.id === 'two') throw new Error('403'); return original(p);};
  await h.c.saveSelectedPosts();
  assert.deepEqual(h.writes, ['one', 'three']);
  assert.equal(h.state.postSelected.size, 1); assert.match(h.alerts[0], /실패 1개/); unlocked(h);
  h.c.fetchChannelVideoDetail = original;
  await h.c.saveSelectedPosts(); assert.equal(h.state.postSelected.size, 0); unlocked(h);
});
test('partial write failure aborts its writable and retains failed file for retry', async () => {
  const h = setup(); h.c.downloadReplayStream = async (url, sink, progress) => {
    if (url === 'two') throw new Error('disk full'); progress(1, 1); h.writes.push(url); sink.writable = null;
  };
  await h.c.saveSelectedPosts();
  assert.deepEqual(h.aborted, ['two (artist-a-two).ts']); assert.equal(h.state.postSelected.size, 1); unlocked(h);
});
test('same-title retry keeps each post filename stable after successful selections disappear', async () => {
  const h = setup(), original = h.c.fetchChannelVideoDetail;
  h.items.forEach(p => {p.title = 'same';});
  h.c.fetchChannelVideoDetail = async p => {if (p.id === 'two') throw new Error('403'); return original(p);};
  await h.c.saveSelectedPosts(); assert.equal(h.files.size, 2);
  h.c.fetchChannelVideoDetail = original;
  await h.c.saveSelectedPosts(); assert.equal(h.files.size, 3);
  assert.ok(h.files.has('same (artist-a-two).ts')); assert.equal(h.state.postSelected.size, 0); unlocked(h);
});
for (const reason of ['session', 'scope']) test(`changed ${reason} during detail fetch prevents writing and next requests`, async () => {
  const h = setup(); h.c.fetchChannelVideoDetail = async p => {
    h.details.push(p.id); reason === 'session' ? h.expire() : h.changeScope(); return {...p, _streamUrl: p.id};
  };
  await h.c.saveSelectedPosts(); assert.deepEqual(h.details, ['one']);
  assert.equal(h.writes.length, 0); assert.equal(h.state.postSelected.size, 3);
  assert.equal(h.alerts.length, 0); unlocked(h);
});
test('existing files are skipped without refetching; Replay forces fresh details for remaining files', async () => {
  const h = setup('replay'); h.files.add('one (artist-a-one).ts');
  await h.c.saveSelectedPosts(); assert.deepEqual(h.details, ['two', 'three']);
  assert.equal(h.state.postSelected.size, 1); assert.match(h.alerts[0], /기존 파일 1개/); unlocked(h);
});
test('existing media save, Channel playback/download and LIVE entry sources are preserved', () => {
  const baseline = execFileSync('git', ['show', 'd876793:index.html'], {cwd: root, encoding: 'utf8', maxBuffer: 4e6});
  for (const name of ['selectedMediaForSave', 'stableSelectedMediaForSave', 'saveSelectedToFolder',
    'downloadChannelVideo', 'fetchChannelVideoDetail', 'attachChannelVideo', 'playChannelVideo',
    'fetchLiveEntrances', 'refreshLiveStatus', 'connectAgoraLive']) {
    assert.equal(fn(name), fn(name, baseline), name);
  }
  // The sole new branch delegates post selection; the media implementation below is identical.
  const delegate = /\r?\n  if\(state.filter==="live"\)\{\r?\n    await saveSelectedPosts\(\);\r?\n    return;\r?\n  \}/;
  assert.equal(fn('saveSelectedDirect').replace(delegate, ''), fn('saveSelectedDirect', baseline));
});

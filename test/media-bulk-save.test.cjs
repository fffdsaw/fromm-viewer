'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function source(name) {
  const match = html.match(new RegExp('^(?:async )?function ' + name + '\\([^]*?^}', 'm'));
  assert.ok(match, `production helper ${name} exists`);
  return match[0];
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const fakeError = name => Object.assign(new Error(name), {name});

function directory(name, records, events, metrics, hooks = {}) {
  const children = new Map();
  return {
    kind: 'directory', name, children,
    async *entries() { for (const entry of children) yield entry; },
    async getDirectoryHandle(child, options) {
      const existing = children.get(child);
      if (existing?.kind === 'directory') return existing;
      if (!options?.create) throw fakeError('NotFoundError');
      const nested = directory(`${name}/${child}`, records, events, metrics, hooks);
      children.set(child, nested); return nested;
    },
    async getFileHandle(child, options) {
      const existing = children.get(child);
      if (!options?.create && !existing) throw fakeError('NotFoundError');
      const destination = `${name}/${child}`;
      if (hooks.denyFile) throw fakeError('NotAllowedError');
      // Real File System Access creates an empty directory entry immediately;
      // aborting its writable discards staged bytes, but leaves that new entry.
      const file = existing || {kind: 'file', size: 0, async getFile() {return {size: this.size};}};
      if (!existing) children.set(child, file);
      return {kind: 'file', getFile: () => file.getFile(), async createWritable() {
        let written = 0;
        return {
          async write(chunk) {
            metrics.pendingWrites++;
            metrics.maxPendingWrites = Math.max(metrics.maxPendingWrites, metrics.pendingWrites);
            try {
              events.push('write');
              await tick();
              if (hooks.writeFailure?.(destination)) throw new Error('synthetic disk failure');
              written += chunk.byteLength ?? chunk.size;
              hooks.afterWrite?.(destination, written);
            } finally { metrics.pendingWrites--; }
          },
          async close() {
            events.push('close');
            file.size = written;
            children.set(child, file);
            records.push({destination, bytes: written});
            hooks.afterClose?.(destination);
          },
          async abort() {metrics.aborts++; events.push('abort');}
        };
      }};
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted'
  };
}

function setup(options = {}) {
  const media = (options.types || ['image', 'video', 'sound']).map((type, index) => ({
    messageId: String(index + 1), type, artist: true,
    createdAt: `2026-10-15T12:00:0${index}Z`, fixtureUrl: `/synthetic-media/${index + 1}`
  }));
  const events = [], records = [], alerts = [], results = [], visual = [], progress = [], logs = [], downloads = [];
  const metrics = {fetches: 0, active: 0, maxActive: 0, readers: 0, cancels: 0, releases: 0,
    aborts: 0, blobCalls: 0, blobFetches: 0, objectUrls: 0, revokedUrls: 0,
    pendingWrites: 0, maxPendingWrites: 0, history: 0};
  const root = directory('backup', records, events, metrics, options);
  const state = {
    messages: media, chatMessages: [], selected: new Set(media.map(m => m.messageId)),
    sortDirection: 'asc', filter: 'image', room: {hostChatRoomId: 'fixture-room'},
    scanGeneration: 1, loadingMessages: false, hasMoreMessages: !!options.history,
    chatHistoryComplete: false, mediaBulkSaving: false, lastSaveRoot: null, lastSaveFailures: [],
    mediaSequence: new Map(), legacyMediaSequence: new Map(), typeMediaSequence: new Map()
  };
  const button = {disabled: false, textContent: '저장', classList: {add() {}, remove() {}}};
  let authenticated = true, activation = true;
  const auth = {token: 'fixture-only', uuid: 'fixture-only', accountKey: 'fixture-only'};
  const context = vm.createContext({
    state, Set, Map, String, Number, Math, Date, Promise, Uint8Array, ArrayBuffer, Blob,
    TextDecoder, AbortController, DOMException,
    setTimeout: (callback, delay) => delay === 30000 ? setImmediate(callback) : setTimeout(callback, delay), clearTimeout,
    console: {warn: (...args) => logs.push(args), error: (...args) => logs.push(args)},
    $: () => button,
    alert: message => alerts.push(String(message)),
    window: {
      alert: message => alerts.push(String(message)),
      showDirectoryPicker: pickerOptions => {
        events.push('picker');
        assert.equal(activation, true, 'picker is invoked during the original click');
        assert.equal(pickerOptions?.mode, 'readwrite');
        return options.picker ? options.picker(root) : Promise.resolve(root);
      }
    },
    currentAuth: () => authenticated ? auth : {token: '', uuid: '', accountKey: ''},
    channelVideoSession: () => () => authenticated,
    normType: type => ({photo: 'image', audio: 'sound'})[type] || type,
    isArtist: m => !!m.artist,
    isMedia: m => ['image', 'video', 'sound'].includes(m.type),
    hasUsableMedia: m => !!m.fixtureUrl && ['image', 'video', 'sound'].includes(m.type),
    dateKey: () => '2026-10-15',
    proxyUrl: m => m.fixtureUrl,
    localProxyUrl: value => value,
    safeErrorDetail: value => String(value),
    friendlyNetworkError: error => error,
    flushDownloadClick() {}, downloadClickGesture: null,
    sleep: async () => {},
    supportsDirectorySave: () => !options.mobile,
    URL: {createObjectURL: () => {metrics.objectUrls++; return 'blob:fixture-only';},
      revokeObjectURL: () => {metrics.revokedUrls++;}},
    document: {createElement: () => ({style: {},
      click() {downloads.push(this.download);}, remove() {}}), body: {appendChild() {}}},
    setBulkSaveButtonProgress: (_, ratio) => progress.push(ratio),
    setMediaDownloadVisual: (m, status, ratio) => visual.push({id: m.messageId, status, ratio}),
    showSaveResult: (ok, failures, total, skipped) => {
      state.lastSaveFailures = failures;
      results.push({ok, failures, total, skipped});
    },
    ensureAllHistory: async () => {
      events.push('history'); metrics.history++;
      if (options.historyHook) await options.historyHook(state);
      if (options.historyComplete !== false) state.hasMoreMessages = false;
    },
    fetchMediaBlob: async (m, onProgress) => {
      events.push('blobfetch'); metrics.blobFetches++;
      if (options.blobHook) await options.blobHook(m, state);
      if (options.blobFailure?.(m)) throw options.blobFailure(m);
      onProgress?.(1, 2048, 2048);
      return {blob: {size: 2048}, contentType: {image: 'image/jpeg', video: 'video/mp4', sound: 'audio/mp4'}[m.type]};
    },
    fetchMediaResponse: async url => {
      const m = media.find(item => item.fixtureUrl === url);
      assert.ok(m, 'only fixture media may be fetched');
      events.push('fetch'); metrics.fetches++;
      if (options.fetchFailure?.(m)) throw options.fetchFailure(m);
      metrics.active++; metrics.maxActive = Math.max(metrics.maxActive, metrics.active);
      if (options.fetchHook) await options.fetchHook(m, state);
      const chunks = options.chunks ?? 2, bytes = options.chunkBytes ?? 1024;
      const contentTypes = {image: 'image/jpeg', video: 'video/mp4', sound: 'audio/mp4'};
      let index = 0, released = false, cancelled = false, inFlight = false;
      const finish = () => {if (!released) {released = true; metrics.active--;}};
      return {
        ok: true, status: 200,
        headers: {get: name => name === 'content-type' ? contentTypes[m.type] : String(chunks * bytes)},
        body: {async cancel() {cancelled = true; metrics.cancels++; finish();}, getReader() {
          metrics.readers++;
          return {
            async read() {
              assert.equal(inFlight, false, 'one reader read is outstanding per stream');
              inFlight = true;
              await tick(); inFlight = false;
              if (cancelled || index++ === chunks) return {done: true};
              if (options.readFailure?.(m, index)) throw new Error('synthetic interrupted stream');
              return {done: false, value: new Uint8Array(bytes)};
            },
            async cancel() {cancelled = true; metrics.cancels++; finish();},
            releaseLock() {metrics.releases++; finish();}
          };
        }},
        async blob() {metrics.blobCalls++; throw new Error('streaming files must not be buffered');}
      };
    }
  });
  const helperNames = ['messageStableKey', 'compareMessages', 'mediaSequenceKey', 'baseName',
    'legacyBaseName', 'typeLegacyBaseName', 'mediaFolder', 'contentTypeExt', 'buildMediaSequences',
    'filenameStem', 'normalizeFrommBackupStem', 'backupTypeFromFilename', 'collectExistingMediaStems',
    'existingMediaNames', 'splitExistingItems', 'cleanFailureReason', 'responseErrorReason',
    'saveFailureRecord', 'mediaSaveSession', 'assertMediaSaveCurrent', 'saveOneMediaItem', 'runMediaSaveBatch', 'stableSelectedMediaForSave',
    'selectedMediaForSave', 'saveSelectedToFolder', 'saveSelectedToDownloads', 'saveSelectedDirect', 'ensureSaveRootPermission',
    'retryFailedSaves'];
  for (const name of helperNames) vm.runInContext(source(name), context);
  // A buffer slot release is held until its associated file has been written.
  if (/^async function acquireMediaBufferSlot\(/m.test(html)) {
    vm.runInContext('let mediaBufferTail = Promise.resolve();', context);
    vm.runInContext(source('acquireMediaBufferSlot'), context);
  }
  context.buildMediaSequences();
  return {context, state, root, media, button, events, records, alerts, results, metrics, visual, progress, logs, downloads,
    loseActivation: () => {activation = false;}, expire: () => {authenticated = false;}};
}
function unlocked(h) {
  assert.equal(h.state.mediaBulkSaving, false);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.textContent, '저장');
}

test('one original click opens destination before history lookup and saves mixed media', async () => {
  const picker = deferred();
  const h = setup({history: true, picker: () => picker.promise});
  const saving = h.context.saveSelectedDirect();
  assert.deepEqual(h.events, ['picker']);
  assert.equal(h.state.mediaBulkSaving, true);
  h.loseActivation(); picker.resolve(h.root);
  await saving;
  assert.equal(h.metrics.history, 1);
  assert.equal(h.metrics.fetches, 3);
  assert.deepEqual(h.records.map(record => record.destination).sort(), [
    'backup/2026-10-15_1.jpg', 'backup/2026-10-15_2.mp4', 'backup/audio/2026-10-15_1.m4a'
  ]);
  assert.equal(h.results[0].ok, 3); unlocked(h);
});

for (const name of ['AbortError', 'NotAllowedError', 'SecurityError']) {
  test(`picker ${name} preserves selection and avoids history, media requests and disk writes`, async () => {
    const h = setup({history: true, picker: () => Promise.reject(fakeError(name))});
    await h.context.saveSelectedToFolder();
    assert.equal(h.state.selected.size, 3);
    assert.equal(h.metrics.history, 0); assert.equal(h.metrics.fetches, 0);
    assert.equal(h.records.length, 0); assert.equal(h.results.length, 0);
    assert.equal(h.state.lastSaveRoot, null);
    if (name === 'AbortError') assert.equal(h.alerts.length, 0);
    unlocked(h);
  });
}

test('a second click while destination picker is pending cannot start another batch', async () => {
  const picker = deferred(), h = setup({picker: () => picker.promise});
  const first = h.context.saveSelectedToFolder();
  await h.context.saveSelectedToFolder();
  assert.equal(h.events.filter(event => event === 'picker').length, 1);
  picker.resolve(h.root); await first;
  assert.equal(h.metrics.fetches, 3); unlocked(h);
});

test('selection is snapshotted before awaiting destination and history', async () => {
  const picker = deferred(), h = setup({picker: () => picker.promise, history: true});
  h.state.selected = new Set(['1']);
  const saving = h.context.saveSelectedToFolder();
  h.state.selected = new Set(['2']);
  picker.resolve(h.root); await saving;
  assert.equal(h.metrics.fetches, 1);
  assert.deepEqual(h.records.map(record => record.destination), ['backup/2026-10-15_1.jpg']);
  assert.deepEqual([...h.state.selected], ['2']); unlocked(h);
});

test('same message present in media and chat collections is downloaded only once', async () => {
  const h = setup({types: ['image']});
  h.state.chatMessages = [{...h.media[0]}];
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.fetches, 1); assert.equal(h.records.length, 1);
  assert.equal(h.results[0].total, 1); unlocked(h);
});

test('history page already loading must finish before stable filename preparation', async () => {
  const h = setup({history: true});
  h.state.loadingMessages = true;
  let waits = 0;
  h.context.sleep = async () => {waits++; h.state.loadingMessages = false;};
  await h.context.saveSelectedToFolder();
  assert.equal(waits, 1); assert.equal(h.metrics.history, 1);
  assert.equal(h.results[0].ok, 3); unlocked(h);
});

test('full history fixes filenames before legacy duplicate detection and skips without fetch', async () => {
  const h = setup({history: true, historyHook: state => {
    state.messages.unshift({messageId: 'older', type: 'image', artist: true,
      createdAt: '2026-10-15T11:00:00Z', fixtureUrl: '/synthetic-media/older'});
  }});
  const photos = await h.root.getDirectoryHandle('photos', {create: true});
  photos.children.set('2026-10-15_2 (1).jpg', {kind: 'file'});
  const audio = await h.root.getDirectoryHandle('audio', {create: true});
  audio.children.set('2026-10-15_1.m4a', {kind: 'file'});
  await h.context.saveSelectedToFolder();
  assert.equal(h.results[0].skipped, 2); assert.equal(h.results[0].ok, 1);
  assert.equal(h.metrics.fetches, 1);
  assert.deepEqual(h.records.map(record => record.destination), ['backup/2026-10-15_3.mp4']); unlocked(h);
});

test('legacy same-number photo never suppresses a video and all existing items avoid media fetch', async () => {
  const h = setup({types: ['image', 'video']});
  const photos = await h.root.getDirectoryHandle('photos', {create: true});
  photos.children.set('2026-10-15_1.jpg', {kind: 'file'});
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.fetches, 1); assert.equal(h.results[0].skipped, 1);
  assert.deepEqual(h.records.map(record => record.destination), ['backup/2026-10-15_2.mp4']);
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.fetches, 1); assert.equal(h.results[1].skipped, 2); unlocked(h);
});

test('partial failure keeps only failed retry records and retry does not refetch successful items', async () => {
  let failing = true;
  const h = setup({fetchFailure: m => failing && m.messageId === '2' ? new Error('synthetic unavailable') : null});
  await h.context.saveSelectedToFolder();
  assert.equal(h.results[0].ok, 2); assert.equal(h.results[0].failures.length, 1);
  assert.equal(h.state.lastSaveFailures[0].message.messageId, '2');
  const before = h.metrics.fetches; failing = false;
  await h.context.retryFailedSaves();
  assert.equal(h.metrics.fetches, before + 1); assert.equal(h.results[1].ok, 1);
  assert.equal(h.state.lastSaveFailures.length, 0); assert.equal(h.records.length, 3); unlocked(h);
});

test('normal save downloads an empty entry left by an aborted partial write while skipping successful files', async () => {
  let failing = true, failedWrites = 0;
  const h = setup({writeFailure: destination => {
    if (!failing || !destination.endsWith('.mp4')) return false;
    return ++failedWrites === 2;
  }});
  await h.context.saveSelectedToFolder();
  assert.equal(h.results[0].ok, 2); assert.equal(h.results[0].failures.length, 1);
  const empty = h.root.children.get('2026-10-15_2.mp4');
  assert.equal(empty.kind, 'file'); assert.equal((await empty.getFile()).size, 0);
  assert.equal(h.metrics.aborts, 1);
  const before = h.metrics.fetches;
  failing = false;
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.fetches, before + 1);
  assert.equal(h.results[1].skipped, 2); assert.equal(h.results[1].ok, 1);
  assert.equal(h.results[1].failures.length, 0); assert.equal((await empty.getFile()).size, 2048);
  assert.equal(h.records.length, 3); unlocked(h);
});

test('denied retry permission preserves failure records and performs no media request', async () => {
  const h = setup();
  h.state.lastSaveRoot = h.root;
  h.state.lastSaveFailures = [h.context.saveFailureRecord(h.media[0], new Error('synthetic unavailable'))];
  h.root.queryPermission = async () => 'prompt';
  let requested = 0;
  h.root.requestPermission = () => {requested++; return Promise.resolve('denied');};
  const retry = h.context.retryFailedSaves();
  assert.equal(requested, 1, 'permission request starts synchronously on retry click');
  await retry;
  assert.equal(h.state.lastSaveFailures.length, 1); assert.equal(h.metrics.fetches, 0); unlocked(h);
});

test('destination write permission denial avoids scanning and fetching media', async () => {
  const h = setup({history: true});
  h.root.queryPermission = async () => 'denied';
  let scans = 0;
  h.root.entries = async function* () {scans++;};
  await h.context.saveSelectedToFolder();
  assert.equal(scans, 0); assert.equal(h.metrics.fetches, 0); assert.equal(h.records.length, 0);
  assert.equal(h.state.selected.size, 3); assert.equal(h.state.lastSaveRoot, null);
  assert.equal(h.alerts.length, 1); unlocked(h);
});

test('incomplete history aborts before names or media requests can be committed', async () => {
  const h = setup({history: true, historyComplete: false});
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.history, 1); assert.equal(h.metrics.fetches, 0); assert.equal(h.records.length, 0);
  assert.equal(h.state.selected.size, 3); assert.equal(h.results.length, 0);
  assert.equal(h.alerts.length, 1); unlocked(h);
});

test('unreadable backup scan aborts before any media request or writable', async () => {
  const h = setup();
  h.root.entries = async function* () {throw fakeError('NotAllowedError');};
  await h.context.saveSelectedToFolder();
  assert.equal(h.metrics.fetches, 0); assert.equal(h.records.length, 0); assert.equal(h.results.length, 0);
  assert.equal(h.state.selected.size, 3); assert.equal(h.state.lastSaveRoot, null);
  assert.equal(h.alerts.length, 1); unlocked(h);
});

test('changing artist after a failed batch prevents retry using the previous room destination', async () => {
  const h = setup({fetchFailure: () => new Error('synthetic unavailable')});
  await h.context.saveSelectedToFolder();
  const before = h.metrics.fetches;
  assert.equal(h.state.lastSaveFailures.length, 3);
  h.state.room = {hostChatRoomId: 'another-fixture-room'};
  await h.context.retryFailedSaves();
  assert.equal(h.metrics.fetches, before); assert.equal(h.state.lastSaveFailures.length, 3);
  assert.equal(h.results.length, 1); assert.equal(h.alerts.length, 1); unlocked(h);
});

test('bounded batch overlaps at most three files and completion progress never moves backwards', async () => {
  const h = setup({types: Array(12).fill('image')});
  const result = await h.context.runMediaSaveBatch(h.media, h.root, h.button);
  assert.equal(result.ok, 12); assert.equal(result.failures.length, 0);
  assert.equal(h.metrics.maxActive, 3); assert.ok(h.metrics.maxPendingWrites <= 3);
  const values = h.progress.filter(Number.isFinite);
  assert.ok(values.length >= 12);
  for (let i = 1; i < values.length; i++) assert.ok(values[i] >= values[i - 1]);
  assert.equal(values.at(-1), 1);
  assert.equal(h.metrics.releases, 12); assert.equal(h.metrics.active, 0);
});

test('rate limiting stops new jobs after the bounded in-flight group and retains unscheduled failures', async () => {
  const h = setup({types: Array(12).fill('image'),
    fetchFailure: m => m.messageId === '1' ? Object.assign(new Error('synthetic throttled'), {status: 429}) : null});
  const result = await h.context.runMediaSaveBatch(h.media, h.root, h.button);
  assert.ok(h.metrics.fetches <= 3); assert.ok(result.failures.length >= 9);
  assert.equal(result.ok + result.failures.length, 12);
});

test('companion XHR fallback buffers only one file until its writable closes', async () => {
  let held = 0, maxHeld = 0, fallbackRequests = 0;
  const h = setup({types: Array(9).fill('video'), afterClose: () => {held--;}});
  h.context.fetch = async () => undefined;
  h.context.fetchMediaViaXhr = async () => {
    fallbackRequests++; held++; maxHeld = Math.max(maxHeld, held);
    await tick();
    return {ok: true, status: 200, body: null,
      headers: {get: name => name === 'content-type' ? 'video/mp4' : '8388608'},
      blob: async () => ({size: 8 * 1024 * 1024})};
  };
  vm.runInContext(source('isUsableMediaResponse'), h.context);
  vm.runInContext(source('fetchMediaResponse'), h.context);
  const result = await h.context.runMediaSaveBatch(h.media, h.root, h.button);
  assert.equal(result.ok, 9); assert.equal(result.failures.length, 0);
  assert.equal(fallbackRequests, 9); assert.equal(maxHeld, 1); assert.equal(held, 0);
  assert.equal(h.metrics.maxPendingWrites, 1);
});

test('failed buffered fallback releases its slot so other files and retry can finish', async () => {
  const h = setup({types: Array(6).fill('sound')});
  let calls = 0;
  h.context.fetch = async () => undefined;
  h.context.fetchMediaViaXhr = async () => {
    if (++calls === 1) throw new Error('synthetic fallback unavailable');
    return {ok: true, status: 200, body: null,
      headers: {get: name => name === 'content-type' ? 'audio/mp4' : '1024'},
      blob: async () => ({size: 1024})};
  };
  vm.runInContext(source('isUsableMediaResponse'), h.context);
  vm.runInContext(source('fetchMediaResponse'), h.context);
  let timer;
  try {
    const result = await Promise.race([h.context.runMediaSaveBatch(h.media, h.root, h.button),
      new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('buffer slot was not released')), 2000);})]);
    assert.equal(result.ok, 5); assert.equal(result.failures.length, 1);
    const retry = await h.context.runMediaSaveBatch(result.failures.map(f => f.message), h.root, h.button);
    assert.equal(retry.ok, 1); assert.equal(retry.failures.length, 0);
  } finally {clearTimeout(timer);}
});

test('large file streams with backpressure and never allocates a full-file Blob', async () => {
  const h = setup({types: ['video'], chunks: 4096, chunkBytes: 65536});
  const filename = await h.context.saveOneMediaItem(h.media[0], h.root);
  assert.equal(filename, '2026-10-15_1.mp4');
  assert.equal(h.records[0].bytes, 256 * 1024 * 1024);
  assert.equal(h.metrics.maxPendingWrites, 1); assert.equal(h.metrics.blobCalls, 0);
  assert.equal(h.metrics.readers, 1); assert.equal(h.metrics.releases, 1); assert.equal(h.metrics.active, 0);
});

test('empty streamed response aborts its writable and never counts as a saved file', async () => {
  const h = setup({types: ['video'], chunks: 0});
  await assert.rejects(h.context.saveOneMediaItem(h.media[0], h.root));
  assert.equal(h.records.length, 0); assert.equal(h.metrics.aborts, 1);
  assert.equal(h.metrics.cancels, 1); assert.equal(h.metrics.releases, 1); assert.equal(h.metrics.active, 0);
  const empty = h.root.children.get('2026-10-15_1.mp4');
  assert.equal((await empty.getFile()).size, 0);
});

test('empty buffered response aborts its writable and never counts as a saved file', async () => {
  const h = setup({types: ['sound']});
  h.context.fetchMediaResponse = async () => ({ok: true, status: 200, body: null,
    headers: {get: name => name === 'content-type' ? 'audio/mp4' : '0'}, blob: async () => ({size: 0})});
  await assert.rejects(h.context.saveOneMediaItem(h.media[0], h.root));
  assert.equal(h.records.length, 0); assert.equal(h.metrics.aborts, 1);
  const audio = h.root.children.get('audio'), empty = audio.children.get('2026-10-15_1.m4a');
  assert.equal((await empty.getFile()).size, 0);
});

test('stream read and disk write failures cancel/release their reader and abort the unfinished file', async () => {
  for (const options of [{readFailure: () => true}, {writeFailure: () => true}]) {
    const h = setup({types: ['video'], ...options});
    await assert.rejects(h.context.saveOneMediaItem(h.media[0], h.root));
    assert.equal(h.records.length, 0); assert.equal(h.metrics.aborts, 1);
    assert.equal(h.metrics.cancels, 1); assert.equal(h.metrics.releases, 1); assert.equal(h.metrics.active, 0);
  }
});

for (const reason of ['generation', 'room', 'session']) {
  test(`${reason} changes while history loads prevent media requests and result mutation`, async () => {
    const h = setup({history: true, historyHook: state => {
      if (reason === 'generation') state.scanGeneration++;
      if (reason === 'room') state.room = {hostChatRoomId: 'another-fixture-room'};
      if (reason === 'session') h.expire();
    }});
    await h.context.saveSelectedToFolder();
    assert.equal(h.metrics.fetches, 0); assert.equal(h.records.length, 0);
    assert.equal(h.results.length, 0); assert.equal(h.state.selected.size, 3); unlocked(h);
  });
}

test('scope invalidation during streaming aborts the writable before final commit', async () => {
  const h = setup({types: ['video'], chunks: 6, afterWrite: () => {h.state.scanGeneration++;}});
  const generation = h.state.scanGeneration;
  await assert.rejects(h.context.saveOneMediaItem(h.media[0], h.root, null,
    () => h.state.scanGeneration === generation), error => error.name === 'AbortError');
  assert.equal(h.records.length, 0); assert.equal(h.metrics.aborts, 1);
  assert.equal(h.metrics.cancels, 1); assert.equal(h.metrics.releases, 1);
});

test('scope invalidation after fetch cancels the unopened response without creating a file', async () => {
  const h = setup({types: ['video'], fetchHook: (_, state) => {state.scanGeneration++;}});
  const generation = h.state.scanGeneration;
  await assert.rejects(h.context.saveOneMediaItem(h.media[0], h.root, null,
    () => h.state.scanGeneration === generation), error => error.name === 'AbortError');
  assert.equal(h.records.length, 0); assert.equal(h.metrics.readers, 0); assert.equal(h.metrics.aborts, 0);
  assert.equal(h.metrics.cancels, 1); assert.equal(h.metrics.active, 0);
});

test('failure diagnostics redact synthetic signed locations and credential pairs', () => {
  const h = setup();
  const hidden = ['fixture-secret', 'fixture-signature', 'fixture-cookie'];
  const reason = h.context.cleanFailureReason(
    'request https://fixture.invalid/media?signature=fixture-signature Authorization: Bearer fixture-secret cookie=fixture-cookie failed');
  assert.ok(!reason.includes('https://'), 'signed media location is omitted');
  for (const value of hidden) assert.ok(!reason.includes(value), 'credential fixture is omitted');
  assert.ok(reason.length <= 220);
});

test('mobile mixed-media path preserves filenames and completes without a folder picker', async () => {
  const h = setup({mobile: true, history: true});
  await h.context.saveSelectedDirect();
  assert.equal(h.events.includes('picker'), false); assert.equal(h.metrics.blobFetches, 3);
  assert.deepEqual(h.downloads, ['2026-10-15_1.jpg', '2026-10-15_2.mp4', '2026-10-15_1.m4a']);
  assert.equal(h.results[0].ok, 3); unlocked(h);
});

test('mobile second click during history preparation is ignored and uses original selection snapshot', async () => {
  const history = deferred(), h = setup({mobile: true, history: true, historyHook: () => history.promise});
  h.state.selected = new Set(['1']);
  const first = h.context.saveSelectedDirect();
  assert.equal(h.state.mediaBulkSaving, true); assert.equal(h.metrics.history, 1);
  h.state.selected = new Set(['2']);
  await h.context.saveSelectedDirect();
  assert.equal(h.metrics.history, 1); assert.equal(h.metrics.blobFetches, 0);
  history.resolve(); await first;
  assert.equal(h.metrics.blobFetches, 1); assert.deepEqual(h.downloads, ['2026-10-15_1.jpg']);
  assert.deepEqual([...h.state.selected], ['2']); unlocked(h);
});

test('mobile second click while file is buffering cannot start another download', async () => {
  const blob = deferred(), h = setup({mobile: true, types: ['video'], blobHook: () => blob.promise});
  const first = h.context.saveSelectedDirect();
  await tick();
  assert.equal(h.metrics.blobFetches, 1); assert.equal(h.state.mediaBulkSaving, true);
  await h.context.saveSelectedDirect();
  assert.equal(h.metrics.blobFetches, 1);
  blob.resolve(); await first;
  assert.equal(h.downloads.length, 1); unlocked(h);
});

test('mobile incomplete history releases its batch lock and does not download', async () => {
  const h = setup({mobile: true, history: true, historyComplete: false});
  await h.context.saveSelectedDirect();
  assert.equal(h.metrics.blobFetches, 0); assert.equal(h.downloads.length, 0);
  assert.equal(h.alerts.length, 1); assert.equal(h.results.length, 0); unlocked(h);
});

for (const reason of ['room', 'session']) {
  test(`mobile changed ${reason} during buffering prevents object URL, stale save and new requests`, async () => {
    const blob = deferred(), h = setup({mobile: true, blobHook: () => blob.promise});
    const first = h.context.saveSelectedDirect();
    await tick();
    assert.equal(h.metrics.blobFetches, 1);
    if (reason === 'room') h.state.room = {hostChatRoomId: 'another-fixture-room'};
    else h.expire();
    blob.resolve(); await first;
    assert.equal(h.metrics.objectUrls, 0); assert.equal(h.downloads.length, 0);
    assert.equal(h.metrics.blobFetches, 1); assert.equal(h.results.length, 0);
    assert.equal(h.alerts.length, 0); unlocked(h);
  });
  test(`mobile changed ${reason} during history prevents original batch from downloading`, async () => {
    const history = deferred(), h = setup({mobile: true, history: true, historyHook: () => history.promise});
    const first = h.context.saveSelectedDirect();
    if (reason === 'room') h.state.room = {hostChatRoomId: 'another-fixture-room'};
    else h.expire();
    history.resolve(); await first;
    assert.equal(h.metrics.blobFetches, 0); assert.equal(h.metrics.objectUrls, 0);
    assert.equal(h.results.length, 0); assert.equal(h.alerts.length, 0); unlocked(h);
  });
}

test('mobile batch freezes filenames before asynchronous buffering changes sequence maps', async () => {
  const blob = deferred(), h = setup({mobile: true, types: ['video'], blobHook: () => blob.promise});
  const saving = h.context.saveSelectedDirect();
  await tick();
  h.state.mediaSequence.set('1', 'synthetic-changed-name');
  blob.resolve(); await saving;
  assert.deepEqual(h.downloads, ['2026-10-15_1.mp4']); unlocked(h);
});

test('mobile save guard respects an active post batch without history or media requests', async () => {
  const h = setup({mobile: true, history: true}); h.state.postBulkSaving = true;
  await h.context.saveSelectedDirect();
  assert.equal(h.metrics.history, 0); assert.equal(h.metrics.blobFetches, 0);
  assert.equal(h.downloads.length, 0); unlocked(h);
});

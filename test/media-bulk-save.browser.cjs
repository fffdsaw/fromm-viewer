'use strict';
// Production save handlers; synthetic local HTTP media and real browser OPFS writes.
// A mocked picker cannot prove a native dialog opened. --native-picker deliberately
// keeps the real Chrome/Edge picker and waits for a human/UI cancellation only.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const channel = process.env.PLAYWRIGHT_CHANNEL;
const nativePicker = process.argv.includes('--native-picker');
const nativeBaseline = process.argv.includes('--native-baseline');
const benchmark = process.argv.includes('--benchmark');
const baseline = process.env.MEDIA_BASELINE_HTML;
const reportPath = process.env.MEDIA_REPORT_PATH;
const nativeWaitMs = Number(process.env.MEDIA_NATIVE_WAIT_MS || 120000);
const types = ['image', 'video', 'sound'];
const mime = {image: 'image/jpeg', video: 'video/mp4', sound: 'audio/mp4'};
const extension = {image: '.jpg', video: '.mp4', sound: '.m4a'};
const preview = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#445566"/></svg>';
let source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (nativeBaseline) {
  assert.ok(baseline, 'MEDIA_BASELINE_HTML is required for native baseline verification');
  source = fs.readFileSync(baseline, 'utf8');
}
let httpActive = 0, httpMax = 0, requests = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/index.html' || url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html'); return res.end(source);
  }
  if (url.pathname === '/web-native-live.js') {
    res.setHeader('Content-Type', 'text/javascript'); return res.end(fs.readFileSync(path.join(root, 'web-native-live.js')));
  }
  if (url.pathname === '/preview.svg') {res.setHeader('Content-Type', 'image/svg+xml'); return res.end(preview);}
  if (url.pathname === '/history') {
    await new Promise(resolve => setTimeout(resolve, Number(url.searchParams.get('delay') || 0)));
    res.setHeader('Content-Type', 'application/json'); return res.end('{}');
  }
  if (url.pathname === '/__fromm_proxy') {
    res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({success: true, data: {posts: [], channels: [], liveRooms: [], messages: [], isLast: true}}));
  }
  if (url.pathname.startsWith('/fixture/')) {
    requests++; httpActive++; httpMax = Math.max(httpMax, httpActive);
    res.once('close', () => httpActive--);
    await new Promise(resolve => setTimeout(resolve, 45));
    const status = Number(url.searchParams.get('status') || 200);
    if (status !== 200) {res.writeHead(status, {'Content-Type': 'text/plain'}); return res.end('Synthetic fixture failure');}
    const total = url.searchParams.has('bytes') ? Number(url.searchParams.get('bytes')) : 262144;
    const type = url.searchParams.get('type') || 'image';
    res.writeHead(200, {'Content-Type': mime[type], 'Content-Length': total});
    const chunk = Buffer.alloc(65536, 0x5a);
    for (let offset = 0; offset < total && !res.destroyed; offset += chunk.length) {
      await new Promise(resolve => setTimeout(resolve, 12));
      const value = chunk.subarray(0, Math.min(chunk.length, total - offset));
      if (!res.write(value)) await new Promise(resolve => {
        const done = () => {res.off('drain', done); res.off('close', done); resolve();};
        res.once('drain', done); res.once('close', done);
      });
    }
    res.end(); return;
  }
  res.statusCode = 404; res.end();
});

async function configure(page, origin, options = {}) {
  await page.evaluate(async ({origin, options}) => {
    setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account'); hideLoginGate();
    state.room = {id: 'fixture-artist', hostChatRoomId: 'fixture-artist', host: {nick: '로컬 저장 테스트'}};
    state.filter = 'media'; state.sortDirection = 'asc'; state.loadingMessages = false;
    state.hasMoreMessages = !!options.historyDelay; state.chatHistoryComplete = !options.historyDelay;
    state.messages = Array.from({length: options.count || 12}, (_, i) => {
      const type = ['image', 'video', 'sound'][i % 3];
      const bytes = options.emptyResponse ? 0 : options.large ? 24 * 1024 * 1024 : (type === 'video' ? 1048576 : 262144);
      const status = options.failIndex === i ? 503 : 200;
      return {messageId: `fixture-${i}`, userType: 'star', type, createdAt: 1792018800000 + i * 1000,
        content: `${origin}/fixture/${i}?type=${type}&bytes=${bytes}&status=${status}`, thumbnail: `${origin}/preview.svg`};
    });
    state.chatMessages = [...state.messages]; state.selected = new Set(state.messages.map(m => m.messageId));
    buildMediaSequences(); syncLiveToolbarControls(); updateSelectedCount();
    document.title = `Bulk save ${options.title || 'regression'}`;
    window.qa = {events: [], historyCalls: 0, responseCalls: 0, responseHeaderMs: 0, scanMs: 0, writeMs: 0,
      reads: 0, writtenBytes: 0, maxChunk: 0, chunkOutstanding: 0, maxChunkOutstanding: 0, maxOutstandingChunks: 0,
      active: 0, maxActive: 0, activeWriters: 0, maxWriters: 0, fileWrites: 0, progress: [], result: null,
      pickerCalls: 0, pickerActive: [], alerts: [], errors: [], startedAt: 0, finishedAt: 0, peakHeap: 0};
    const q = window.qa; q.failNextWrite = !!options.firstWriteFault;
    q.outstandingChunks = new Map();
    const releaseChunk = bytes => {
      const item = q.outstandingChunks.get(bytes);
      if (!item) return;
      q.chunkOutstanding -= item.length; item.owner.delete(bytes); q.outstandingChunks.delete(bytes);
    };
    window.alert = message => q.alerts.push(String(message));
    window.console.error = () => q.errors.push('redacted');
    window.console.warn = () => {};
    ensureAllHistory = async () => {
      q.historyCalls++; q.events.push('history-start');
      await fetch(`${origin}/history?delay=${options.historyDelay || 0}`);
      state.hasMoreMessages = false; state.chatHistoryComplete = true; q.events.push('history-end');
    };
    const nativeFetchResponse = fetchMediaResponse;
    fetchMediaResponse = async (...args) => {
      q.responseCalls++; q.active++; q.maxActive = Math.max(q.maxActive, q.active);
      const start = performance.now(), r = await nativeFetchResponse(...args);
      q.responseHeaderMs += performance.now() - start;
      if (!r.ok || !r.body) {q.active--; return r;}
      const reader = r.body.getReader(), ownedChunks = new Set(); let finished = false;
      const finish = () => {if (!finished) {finished = true; q.active--;}};
      return {ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers,
        arrayBuffer: r.arrayBuffer.bind(r), blob: r.blob.bind(r), text: r.text.bind(r),
        body: {getReader: () => ({read: async () => {
          const data = await reader.read();
          if (data.done) finish();
          else if (data.value) {q.reads++; q.maxChunk = Math.max(q.maxChunk, data.value.byteLength);
            ownedChunks.add(data.value); q.outstandingChunks.set(data.value, {length: data.value.byteLength, owner: ownedChunks});
            q.maxOutstandingChunks = Math.max(q.maxOutstandingChunks, q.outstandingChunks.size);
            q.chunkOutstanding += data.value.byteLength; q.maxChunkOutstanding = Math.max(q.maxChunkOutstanding, q.chunkOutstanding);}
          return data;
        }, cancel: async () => {
          finish(); for (const bytes of [...ownedChunks]) releaseChunk(bytes); await reader.cancel();
        }, releaseLock: () => reader.releaseLock()})}};
    };
    const nativeExisting = existingMediaNames;
    existingMediaNames = async (...args) => {const start = performance.now(); const value = await nativeExisting(...args); q.scanMs += performance.now() - start; return value;};
    const nativeProgress = setBulkSaveButtonProgress;
    setBulkSaveButtonProgress = (btn, progress) => {if (Number.isFinite(progress)) q.progress.push(progress); return nativeProgress(btn, progress);};
    const nativeResult = showSaveResult;
    showSaveResult = (ok, failures, total, skipped) => {
      q.result = {ok, failed: failures.length, total, skipped}; q.finishedAt = performance.now();
      return nativeResult(ok, failures, total, skipped);
    };
    const opfs = await navigator.storage.getDirectory();
    q.root = await opfs.getDirectoryHandle(`bulk-${Date.now()}-${Math.random()}`, {create: true});
    const wrapDirectory = (dir, prefix = '') => ({kind: dir.kind, name: dir.name,
      entries: dir.entries.bind(dir), queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      getDirectoryHandle: async (name, config) => wrapDirectory(await dir.getDirectoryHandle(name, config), `${prefix}${name}/`),
      getFileHandle: async (name, config) => {
        const fh = await dir.getFileHandle(name, config);
        return {kind: fh.kind, name: fh.name, getFile: fh.getFile.bind(fh), createWritable: async () => {
          if (options.writeDenied) throw new DOMException('Synthetic write denied', 'NotAllowedError');
          const writable = await fh.createWritable(); q.activeWriters++; q.maxWriters = Math.max(q.maxWriters, q.activeWriters);
          return {write: async bytes => {
            const length = bytes.byteLength ?? bytes.size ?? 0, start = performance.now();
            try {
              await new Promise(resolve => setTimeout(resolve, 8));
              if (q.failNextWrite) {q.failNextWrite = false; throw new DOMException('Synthetic first write disk failure', 'QuotaExceededError');}
              await writable.write(bytes); q.writtenBytes += length;
            } finally {q.writeMs += performance.now() - start; releaseChunk(bytes);}
          }, close: async () => {await writable.close(); q.activeWriters--; q.fileWrites++;},
          abort: async () => {await writable.abort(); q.activeWriters--;}};
        }};
      }});
    q.wrappedRoot = wrapDirectory(q.root);
    if (options.existing) {
      const m = state.messages[0], dir = mediaFolder(m.type) ? await q.root.getDirectoryHandle(mediaFolder(m.type), {create: true}) : q.root;
      const fh = await dir.getFileHandle(baseName(m) + ({image: '.jpg', video: '.mp4', sound: '.m4a'}[m.type]), {create: true});
      const w = await fh.createWritable(); await w.write(new Uint8Array([0x5a])); await w.close();
    }
    const realPicker = window.showDirectoryPicker?.bind(window);
    window.showDirectoryPicker = async config => {
      q.pickerCalls++; q.pickerActive.push(navigator.userActivation.isActive); q.events.push('picker');
      if (options.native) {
        try {return await realPicker(config);}
        catch (e) {q.nativeError = e.name; throw e;}
      }
      if (options.cancel) throw new DOMException('Synthetic cancel', 'AbortError');
      if (options.pickerDenied) throw new DOMException('Synthetic denied', 'NotAllowedError');
      if (options.activationGuard && !navigator.userActivation.isActive) throw new DOMException('Synthetic expired activation', 'SecurityError');
      return q.wrappedRoot;
    };
    const originalClick = document.querySelector('#saveSelectedBtn').onclick;
    document.querySelector('#saveSelectedBtn').onclick = function (event) {
      q.startedAt = performance.now(); q.trustedClick = event.isTrusted;
      q.clickFinished = false;
      return Promise.resolve(originalClick.call(this, event)).finally(() => {q.clickFinished = true;});
    };
    q.heapTimer = setInterval(() => {q.peakHeap = Math.max(q.peakHeap, performance.memory?.usedJSHeapSize || 0);}, 30);
  }, {origin, options});
}

async function summary(page) {
  return page.evaluate(async () => {
    clearInterval(qa.heapTimer);
    const files = [];
    async function walk(dir, prefix = '') {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'directory') await walk(handle, prefix + name + '/');
        else {const f = await handle.getFile(); files.push({name: prefix + name, size: f.size});}
      }
    }
    await walk(qa.root);
    return {trustedClick: qa.trustedClick, pickerCalls: qa.pickerCalls, pickerActive: qa.pickerActive, events: qa.events,
      historyCalls: qa.historyCalls, responseCalls: qa.responseCalls, maxActive: qa.maxActive, maxWriters: qa.maxWriters,
      maxChunk: qa.maxChunk, maxChunkOutstanding: qa.maxChunkOutstanding, maxOutstandingChunks: qa.maxOutstandingChunks,
      outstandingChunks: qa.outstandingChunks.size, chunkOutstanding: qa.chunkOutstanding, writtenBytes: qa.writtenBytes,
      fileWrites: qa.fileWrites, reads: qa.reads, scanMs: Math.round(qa.scanMs), responseHeaderMs: Math.round(qa.responseHeaderMs),
      writeMs: Math.round(qa.writeMs), elapsedMs: Math.round((qa.finishedAt || performance.now()) - qa.startedAt),
      peakHeapBytes: qa.peakHeap, result: qa.result, files, selection: state.selected.size,
      busy: !!state.mediaBulkSaving, disabled: document.querySelector('#saveSelectedBtn').disabled,
      progress: qa.progress, alerts: qa.alerts.length, nativeError: qa.nativeError || null};
  });
}

async function runCase(browser, origin, name, options = {}, record = () => {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 900}});
  const page = await context.newPage();
  await page.route('https://**/*', route => route.abort());
  await page.goto(origin + '/index.html'); await configure(page, origin, {...options, title: name});
  await page.locator('#saveSelectedBtn').click();
  await page.waitForFunction(() => qa.clickFinished, null, {timeout: nativePicker ? nativeWaitMs : 60000});
  let result = await summary(page); record(result);
  if (options.firstWriteFault) {
    const firstAttempt = result;
    assert.equal(firstAttempt.result.failed, 1); assert.equal(firstAttempt.result.ok, 2);
    assert.equal(firstAttempt.files.filter(f => f.size === 0).length, 1, 'an aborted first write leaves a real empty OPFS entry');
    await page.locator('#saveResultOkBtn').click();
    await page.evaluate(() => {qa.progress = []; qa.result = null;});
    await page.locator('#saveSelectedBtn').click(); await page.waitForFunction(() => qa.clickFinished);
    result = await summary(page); result.firstAttempt = firstAttempt; record(result);
    assert.deepEqual(result.result, {ok: 1, failed: 0, total: 3, skipped: 2});
    assert.equal(result.responseCalls, 4, 'fresh save fetches only the empty failed entry');
    assert.equal(result.files.filter(f => f.size === 0).length, 0); assert.equal(result.files.length, 3);
  }
  await context.close(); return result;
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless: !nativePicker, ...(channel ? {channel} : {}), args: ['--enable-precise-memory-info']});
  const report = {browser: channel || 'chromium', version: browser.version(), windowMode: nativePicker ? 'headed' : 'headless',
    fixture: 'synthetic local HTTP; real OPFS stream writes; no service account',
    sourceSha256: createHash('sha256').update(source).digest('hex'), cases: {}, benchmark: []};
  try {
    if (nativePicker || nativeBaseline) {
      report.currentCase = nativeBaseline ? 'nativeActivationExpired' : 'nativeCancellation';
      const result = await runCase(browser, origin, `${channel || 'chromium'} native picker QA`, {count: 3, historyDelay: 5500, native: true});
      report.cases[report.currentCase] = result;
      assert.equal(result.trustedClick, true); assert.equal(result.pickerCalls, 1);
      assert.deepEqual(result.pickerActive, [!nativeBaseline]);
      assert.equal(result.nativeError, nativeBaseline ? 'SecurityError' : 'AbortError');
      assert.equal(result.historyCalls, nativeBaseline ? 1 : 0);
      assert.equal(result.selection, 3); assert.equal(result.busy, false); assert.equal(result.disabled, false);
    } else if (benchmark) {
      assert.ok(baseline, 'MEDIA_BASELINE_HTML is required for same-condition comparison');
      report.fixtureSettings = {mediaItems: 12, mixedCounts: {image: 4, video: 4, sound: 4}, totalBytes: 6291456,
        historyDelayMs: 200, responseHeaderDelayMs: 45, chunkBytes: 65536, chunkDelayMs: 12, writeDelayMs: 8, trials: 3,
        stagesAreAggregateMs: ['responseHeaderMs', 'writeMs'], heapMetric: 'browser JS heap, not whole browser/process memory'};
      for (let trial = 1; trial <= 3; trial++) {
        for (const variant of ['baseline', 'updated']) {
          report.currentCase = `${variant}-benchmark-${trial}`;
          source = fs.readFileSync(variant === 'baseline' ? baseline : path.join(root, 'index.html'), 'utf8');
          requests = 0; httpMax = 0;
          const result = await runCase(browser, origin, `${variant} benchmark ${trial}`, {count: 12, historyDelay: 200});
          report.benchmark.push({variant, trial, sourceSha256: createHash('sha256').update(source).digest('hex'), ...result, httpRequests: requests, httpMax});
          assert.deepEqual(result.result, {ok: 12, failed: 0, total: 12, skipped: 0});
          assert.equal(result.writtenBytes, 6291456); assert.equal(result.files.length, 12); assert.equal(requests, 12);
        }
      }
    } else {
      const cases = [
        ['oneClickSlowHistory', {count: 3, historyDelay: 5500, activationGuard: true}],
        ['pickerCancel', {count: 3, historyDelay: 5500, cancel: true}],
        ['pickerDenied', {count: 3, historyDelay: 5500, pickerDenied: true}],
        ['mixedExisting', {count: 12, existing: true}],
        ['partialFailure', {count: 6, failIndex: 2}],
        ['writeDenied', {count: 3, writeDenied: true}],
        ['emptyResponse', {count: 3, emptyResponse: true}],
        ['emptyEntryFreshSave', {count: 3, firstWriteFault: true}],
        ['largeStream', {count: 3, large: true}]
      ];
      for (const [name, options] of cases) {
        report.currentCase = name;
        const r = await runCase(browser, origin, name, options, value => {report.cases[name] = value;});
        assert.equal(r.trustedClick, true); assert.equal(r.pickerCalls, options.firstWriteFault ? 2 : 1);
        assert.deepEqual(r.pickerActive, options.firstWriteFault ? [true, true] : [true]);
        assert.equal(r.events[0], 'picker'); assert.equal(r.busy, false); assert.equal(r.disabled, false);
        if (options.cancel || options.pickerDenied) {assert.equal(r.historyCalls, 0); assert.equal(r.responseCalls, 0); assert.equal(r.selection, 3);}
        else {
          assert.ok(r.result); assert.ok(r.maxActive <= 3); assert.ok(r.maxWriters <= 3);
          assert.ok(r.maxOutstandingChunks <= 3, 'at most one read chunk per worker waits for its write');
          assert.ok(r.maxChunkOutstanding <= r.maxChunk * 3, 'held bytes are bounded by three observed browser chunks');
          assert.equal(r.outstandingChunks, 0, 'all read chunk references release after success or failure');
          assert.equal(r.chunkOutstanding, 0);
          for (let i = 1; i < r.progress.length; i++) assert.ok(r.progress[i] >= r.progress[i - 1], 'bulk progress never decreases');
          if (name === 'oneClickSlowHistory') {assert.equal(r.historyCalls, 1); assert.equal(r.result.ok, 3);}
          if (name === 'mixedExisting') {assert.equal(r.result.ok, 11); assert.equal(r.result.skipped, 1); assert.equal(r.responseCalls, 11);}
          if (name === 'partialFailure') {assert.equal(r.result.ok, 5); assert.equal(r.result.failed, 1);}
          if (name === 'writeDenied') {assert.equal(r.result.ok, 0); assert.equal(r.result.failed, 3);}
          if (name === 'emptyResponse') {assert.equal(r.result.ok, 0); assert.equal(r.result.failed, 3); assert.equal(r.writtenBytes, 0);}
          if (name === 'largeStream') {
            assert.equal(r.writtenBytes, 75497472); assert.equal(r.result.ok, 3);
            assert.ok(r.reads >= 3, 'all three large response bodies use the stream reader');
          }
          if (name === 'mixedExisting') {
            const names = r.files.map(f => f.name); assert.equal(new Set(names).size, 12);
            assert.equal(names.filter(n => n.startsWith('audio/') && n.endsWith('.m4a')).length, 4);
            assert.equal(names.filter(n => !n.startsWith('audio/') && n.endsWith('.jpg')).length, 4);
            assert.equal(names.filter(n => !n.startsWith('audio/') && n.endsWith('.mp4')).length, 4);
          }
        }
      }
    }
    report.status = 'passed';
    const compact = {browser: report.browser, version: report.version, cases: Object.keys(report.cases), benchmark: report.benchmark.map(r => ({variant: r.variant, trial: r.trial, elapsedMs: r.elapsedMs, requests: r.httpRequests, maxActive: r.maxActive, maxChunkOutstanding: r.maxChunkOutstanding}))};
    console.log(JSON.stringify(compact, null, 2));
  } catch (error) {
    report.status = 'failed'; report.failure = {name: error.name || 'Error', currentCase: report.currentCase}; throw error;
  } finally {
    if (reportPath) {fs.mkdirSync(path.dirname(reportPath), {recursive: true}); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');}
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  const message = String(error.message || 'Browser bulk-save test failed').replace(/(?:https?|blob):[^\s'"\)]+/gi, '[redacted URL]');
  console.error(message); process.exitCode = 1; server.closeAllConnections(); server.close();
});

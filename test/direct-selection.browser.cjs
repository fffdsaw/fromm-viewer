'use strict';
// Production UI and HLS download logic with synthetic service/media/file handles.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const output = process.env.CHANNEL_SCREENSHOT_DIR;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#34435e"/><circle cx="320" cy="200" r="100" fill="#9c6473"/><text x="320" y="370" text-anchor="middle" fill="white" font-size="28">SELECTION TEST IMAGE</text></svg>';
async function shot(page, name) {
  if (output) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => [...document.images].filter(img => {
      const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
    }).every(img => img.complete && img.naturalWidth > 0));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    fs.mkdirSync(output, {recursive: true}); await page.screenshot({path: path.join(output, name + '.png')});
  }
}
async function selectionSize(page) {
  await page.waitForFunction(() => !downloadClickGesture || downloadClickGesture.applied);
  return page.evaluate(() => state.selected.size);
}
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900}, isMobile: mobile, hasTouch: mobile});
      const page = await context.newPage();
      const errors = [], downloads = [], details = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('download', d => downloads.push(d.suggestedFilename()));
      page.on('dialog', dialog => dialog.accept());
      await page.addInitScript(() => {
        window.Hls = class {
          static isSupported() {return true;}
          static Events = {MANIFEST_PARSED: 'ready', ERROR: 'error'};
          static ErrorTypes = {NETWORK_ERROR: 'network', MEDIA_ERROR: 'media'};
          loadSource() {} attachMedia() {} on() {} destroy() {}
        };
      });
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        const json = data => route.fulfill({contentType: 'application/json', body: JSON.stringify({success: true, data})});
        if (url.hostname === 'viewer.test') {
          if (url.pathname.endsWith('.js')) return route.fulfill({contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'web-native-live.js'))});
          return route.fulfill({contentType: 'text/html', body: html});
        }
        if (url.hostname === 'cdn.example') {
          const headers = {'access-control-allow-origin': '*'};
          if (url.pathname.endsWith('.m3u8')) return route.fulfill({headers, contentType: 'application/vnd.apple.mpegurl', body: '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nsegment.ts\n#EXT-X-ENDLIST'});
          if (url.pathname.endsWith('.ts')) return route.fulfill({headers, contentType: 'video/mp2t', body: Buffer.from([1, 2, 3, 4])});
          return route.fulfill({headers, contentType: 'image/svg+xml', body: svg});
        }
        if (url.hostname.endsWith('frommyarti.com')) {
          if (url.pathname.startsWith('/media/posts/')) {
            const id = url.pathname.split('/').at(-1);
            details.push({id, channel: route.request().headers()['channel-id']});
            return json({post: {id, type: id.startsWith('r') ? 'live_record' : 'video', isVisible: true, title: '동일한 제목 테스트', url: `https://cdn.example/${id}.m3u8`}});
          }
          return json({posts: [], isLast: true, channels: [], liveRooms: []});
        }
        return route.abort();
      });
      await page.goto('http://viewer.test/index.html');
      await page.evaluate(() => {
        setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account'); hideLoginGate();
        state.room = {id: 'artist-a', hostChatRoomId: 'artist-a', host: {nick: '테스트 아티스트'}};
        state.messages = Array.from({length: 300}, (_, i) => ({messageId: `m${String(i).padStart(3, '0')}`, userType: 'star', type: 'image', content: 'https://cdn.example/photo.svg', createdAt: 1791586800000 + i * 1000}));
        state.messages.push({messageId: 'video', userType: 'star', type: 'video', content: 'https://cdn.example/video.mp4', thumbnail: 'https://cdn.example/photo.svg', createdAt: 1791586799000});
        state.messages.push({messageId: 'sound', userType: 'star', type: 'sound', content: 'https://cdn.example/sound.wav', createdAt: 1791586798000});
        state.chatMessages = [...state.messages, {messageId: 'text', userType: 'star', type: 'text', content: '텍스트 복사 유지', createdAt: 1791586797000}, {messageId: 'missing', userType: 'star', type: 'image', content: '', createdAt: 1791586796000}];
        state.hasMoreMessages = false; state.chatHistoryComplete = true; buildMediaSequences();
        state.filter = 'image'; syncLiveToolbarControls(); render();
      });
      await page.locator('.media-card img').first().waitFor();
      assert.equal(await page.locator('.card-footer-select,.chat-select-pill').count(), 0);
      await page.locator('.media-card img').first().click();
      assert.equal(await selectionSize(page), 1);
      await page.locator('.infinite-sentinel').waitFor({state: 'attached'});
      // Plain wheel scrolling must never select additional files.
      await page.mouse.wheel(0, 500000);
      await page.waitForFunction(() => !!document.querySelector('[data-message-id="m019"]'));
      assert.equal(await page.evaluate(() => state.selected.size), 1);
      await page.locator('[data-message-id="m019"] img').click({modifiers: ['Shift']});
      assert.equal(await selectionSize(page), 281, 'range includes all items between endpoints after scrolling');
      await page.evaluate(() => scrollTo(0, 0));
      await shot(page, `direct-selection-${mobile ? 'mobile' : 'desktop'}`);
      await page.locator('.media-card').first().focus();
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => state.selected.size), 280, 'keyboard toggles selected card');
      await page.locator('#selectAllBtn').click();
      assert.equal(await page.evaluate(() => state.selected.size), 300);
      await page.locator('#selectAllBtn').click();
      assert.equal(await page.evaluate(() => state.selected.size), 0);
      await page.locator('.media-card img').first().dblclick();
      assert.equal(await page.locator('#imageLightbox.open').count(), 1, 'double click preview preserved');
      assert.equal(await selectionSize(page), 0, 'preview does not select');
      await page.locator('#lightboxClose').click();
      console.log(`${mobile ? 'Mobile' : 'Desktop'}: photo scroll/range/keyboard/preview PASS`);
      // Both media grouping and individual type tabs use the same interaction.
      for (const filter of ['media', 'video', 'sound', 'all']) {
        await page.evaluate(filter => {state.selected.clear(); state.selectionAnchor = null; state.filter = filter; syncLiveToolbarControls(); render(); scrollTo(0, 0);}, filter);
        const selectable = page.locator('[data-download-selection-kind="media"]').first();
        await selectable.waitFor();
        await selectable.locator(filter === 'all' ? '.stats' : '.card-title').click();
        assert.equal(await selectionSize(page), 1, filter);
        if (filter === 'all') {
          assert.equal(await page.locator('[data-message-id="text"] [data-download-selection-key]').count(), 0);
          assert.equal(await page.locator('[data-message-id="missing"] [data-download-selection-key]').count(), 0);
        }
        assert.equal(await page.locator('.card-footer-select,.chat-select-pill').count(), 0);
      }
      // Inline download and native playback controls do not toggle selection.
      await page.evaluate(() => {state.filter = 'media'; state.selected.clear(); render(); downloadSingleMedia = async m => {window.singleDownloaded = m.messageId;};});
      await page.locator('.card-download').first().click();
      assert.equal(await page.evaluate(() => state.selected.size), 0);
      assert.ok(await page.evaluate(() => window.singleDownloaded));
      await page.evaluate(() => {state.filter = 'video'; render();});
      const videoBox=await page.locator('#timeline video').boundingBox();
      await page.locator('#timeline video').click({position: {x: 100, y: videoBox.height-20}});
      assert.equal(await page.evaluate(() => state.selected.size), 0);
      console.log(`${mobile ? 'Mobile' : 'Desktop'}: media/chat/type selection and controls PASS`);
      await page.evaluate(mobile => {
        const posts = (kind, channel) => [1, 2, 3].map(i => ({id: `${kind === 'replay' ? 'r' : 'v'}${i}`, type: kind === 'replay' ? 'live_record' : 'video', title: '동일한 제목 테스트', _channelId: channel, _channelName: channel, thumbnail: {url: 'https://cdn.example/photo.svg'}, displayStartAt: 1791586800000 - i * 1000}));
        state.filter = 'live'; state.live.centerMode = 'channel'; state.live.channelsLoaded = true;
        state.live.channels = [{id: 'a', channelName: 'OH MY GIRL'}, {id: 'b', channelName: 'fromis_9'}];
        channelVideoState.channelId = 'a';
        for (const id of ['a', 'b']) channelVideoState.pages.set(id, {posts: posts('channel', id), loaded: true, isLast: true});
        state.live.replayPosts = [...posts('replay', 'a'), {...posts('replay', 'b')[0]}]; state.live.replayFilter = 'all';
        renderLiveView();
        window.writes = [];
        window.showDirectoryPicker = mobile ? undefined : async () => ({getFileHandle: async (name, options) => {
          if (!options?.create) throw new DOMException('missing', 'NotFoundError');
          return {createWritable: async () => ({write: async bytes => window.writes.push({name, bytes: [...bytes]}), close: async () => {}, abort: async () => {}})};
        }});
      }, mobile);
      for (const kind of ['channel', 'replay']) {
        if (kind === 'replay') await page.locator('[data-live-center-mode="replay"]').click();
        const cards = page.locator(`[data-download-selection-kind="${kind}"]`);
        await cards.first().locator('img').click();
        await cards.nth(2).locator('img').click({modifiers: ['Shift']});
        await page.waitForFunction(() => !downloadClickGesture || downloadClickGesture.applied);
        assert.equal(await cards.count(), kind === 'channel' ? 3 : 4);
        assert.equal(await page.locator('#selectedCount').textContent(), '선택 3개');
        assert.equal(await page.locator('#saveSelectedBtn').isVisible(), true);
        await shot(page, `${kind}-selection-${mobile ? 'mobile' : 'desktop'}`);
        const detailBefore = details.length, downloadBefore = downloads.length;
        await page.locator('#saveSelectedBtn').click();
        await page.waitForFunction(() => !state.postBulkSaving);
        assert.ok(details.length >= detailBefore + 3, 'fresh authorized detail for each selected post');
        assert.equal(await page.locator('#selectedCount').textContent(), '선택 0개');
        if (mobile) assert.equal(downloads.length - downloadBefore, 3);
        else {
          const writes = await page.evaluate(() => window.writes.splice(0));
          assert.equal(writes.length, 3);
          assert.equal(new Set(writes.map(w => w.name)).size, 3, 'same-title posts do not overwrite one another');
          assert.ok(writes.every(w => JSON.stringify(w.bytes) === '[1,2,3,4]'));
        }
        await cards.first().locator('button.replay-play').click();
        await page.locator(kind === 'channel' ? '#channelVideo' : '#replayVideo').waitFor();
        assert.equal(await page.locator('#selectedCount').isVisible(), false, 'player keeps space for video');
        await page.locator(kind === 'channel' ? '#channelBackToList' : '#replayBackToList').click();
        await page.locator(`[data-download-selection-kind="${kind}"]`).first().waitFor();
      }
      await page.locator('[data-live-center-mode="channel"]').click();
      await page.locator('[data-download-selection-kind="channel"]').first().locator('img').click();
      await page.locator('[data-channel-video-filter="b"]').click();
      assert.equal(await page.locator('#selectedCount').textContent(), '선택 0개', 'channel IDs isolate same post IDs');
      await page.locator('[data-download-selection-kind="channel"]').nth(2).locator('img').click({modifiers: ['Shift']});
      await page.waitForFunction(() => !downloadClickGesture || downloadClickGesture.applied);
      assert.equal(await page.locator('#selectedCount').textContent(), '선택 1개', 'range anchor is scoped to channel');
      await page.evaluate(() => forgetSavedAuth());
      assert.equal(await page.evaluate(() => state.postSelected.size), 0, 'logout clears selected posts');
      assert.equal(await page.evaluate(() => state.selectionAnchor), null);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      console.log(`${mobile ? 'Mobile' : 'Desktop'}: all downloadable tabs, click/Shift/scroll/keyboard, preview/playback, bulk bytes/names, channel isolation and logout PASS (synthetic service)`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});

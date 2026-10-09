'use strict';
// Mock service/browser smoke. This does not verify a real Fromm login or video.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'web-native-live.js'), 'utf8');
const output = process.env.CHANNEL_SCREENSHOT_DIR;
const thumbnail = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><defs><linearGradient id="g"><stop stop-color="#25334c"/><stop offset="1" stop-color="#714654"/></linearGradient></defs><rect width="640" height="440" fill="url(#g)"/><circle cx="320" cy="190" r="60" fill="#ffffff" opacity=".12"/><text x="320" y="290" fill="#ffffff" text-anchor="middle" font-family="sans-serif" font-size="24">CHANNEL VIDEO · TEST FIXTURE</text></svg>';
const upload = (id, title, timestamp = 1791534600000) => ({id, type: 'video', title, displayStartAt: timestamp, isVisible: true, thumbnail: {url: 'https://cdn.example/thumb.svg'}});
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 1000}, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1});
      const page = await context.newPage();
      const errors = [], requests = [];
      let denyDetail = false;
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        // Mock only the media engine, keeping the real Viewer UI/API/playlist logic.
        window.channelHlsFixture = [];
        window.Hls = class {
          static isSupported() {return true;}
          static Events = {MANIFEST_PARSED: 'ready', ERROR: 'error'};
          static ErrorTypes = {NETWORK_ERROR: 'network', MEDIA_ERROR: 'media'};
          constructor() {window.channelHlsFixture.push(this);}
          loadSource(url) {this.source = url;}
          attachMedia(video) {this.video = video;}
          on() {}
          destroy() {this.destroyed = true;}
        };
      });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        const json = (body, status = 200) => route.fulfill({status, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(body)});
        if (url.hostname === 'viewer.test') {
          if (url.pathname.endsWith('/web-native-live.js')) return route.fulfill({contentType: 'text/javascript', body: adapter});
          return route.fulfill({contentType: 'text/html', body: html});
        }
        if (url.hostname === 'cdn.example') {
          if (url.pathname === '/thumb.svg') return route.fulfill({contentType: 'image/svg+xml', body: thumbnail});
          requests.push({url: url.toString(), media: true});
          return route.fulfill({contentType: 'application/vnd.apple.mpegurl', headers: {'access-control-allow-origin': '*'}, body: '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nsegment.ts\n#EXT-X-ENDLIST'});
        }
        if (url.hostname.endsWith('frommyarti.com')) {
          requests.push({url: url.toString(), headers: route.request().headers()});
          if (url.pathname === '/channels') return json({success: true, data: {channels: [{id: 'a', channelName: '아티스트 A', isSubscribed: true}, {id: 'b', channelName: '아티스트 B', isSubscribed: true}, {id: 'locked', channelName: '미구독', isSubscribed: false}]}});
          if (url.pathname === '/media/posts') {
            const channel = url.searchParams.get('channelId');
            if (channel === 'b') return json({success: true, data: {posts: [], isLast: true}});
            if (url.searchParams.has('postId')) {
              assert.equal(url.searchParams.get('postId'), 'replay-cursor');
              return json({success: true, data: {posts: [upload('v3', '세 번째 업로드 영상')], isLast: true}});
            }
            return json({success: true, data: {posts: [upload('v1', '아티스트의 새로운 영상'), upload('v2', '긴 제목도 자연스럽게 표시되는 채널 업로드 영상'), {id: 'hidden', type: 'video', isVisible: false}, {id: 'replay-cursor', type: 'live_record', title: 'Replay 전용', num: 9, displayStartAt: 1791500000000}], isLast: false}});
          }
          if (url.pathname.startsWith('/media/posts/')) {
            if (denyDetail) return json({success: false, message: 'HTTP 403'}, 403);
            return json({success: true, data: {post: {...upload(url.pathname.split('/').at(-1), '아티스트의 새로운 영상'), url: 'https://cdn.example/upload_original.m3u8?CloudFront-Policy=synthetic&CloudFront-Key-Pair-Id=synthetic&CloudFront-Signature=synthetic'}}});
          }
          return json({success: true, data: {liveRooms: []}});
        }
        return route.abort();
      });
      await page.goto('http://viewer.test/index.html');
      await page.evaluate(() => {setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account'); hideLoginGate(); state.filter = 'live'; renderLiveView();});
      assert.deepEqual(await page.locator('[data-live-center-mode]').allTextContents(), ['LIVE', 'Replay', 'Channel']);
      await page.locator('[data-live-center-mode="channel"]').click();
      await page.locator('[data-channel-video-play="v1"]').waitFor();
      assert.equal(await page.locator('.channel-video-card').count(), 2);
      assert.equal(await page.locator('[data-channel-video-filter="locked"]').count(), 0);
      assert.equal(await page.getByText('Replay 전용', {exact: true}).count(), 0);
      const positions = await page.locator('[data-live-center-mode]').evaluateAll(els => els.map(e => ({text: e.textContent, x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y})));
      assert.ok(positions[0].x < positions[1].x && positions[1].x < positions[2].x);
      assert.equal(positions[0].y, positions[2].y);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      if (output) {fs.mkdirSync(output, {recursive: true}); await page.screenshot({path: path.join(output, `channel-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true});}
      await page.locator('#channelLoadMore').click();
      await page.locator('[data-channel-video-play="v3"]').waitFor();
      assert.equal(await page.locator('#channelLoadMore').count(), 0);
      await page.locator('[data-channel-video-filter="b"]').click();
      await page.getByText('이 페이지에 업로드된 비디오가 없습니다.').waitFor();
      await page.locator('[data-channel-video-filter="a"]').click();
      await page.locator('[data-channel-video-play="v1"]').click();
      await page.locator('#channelVideo').waitFor();
      await page.waitForFunction(() => channelVideoState.hls !== null);
      assert.equal(await page.evaluate(() => state.live.replaySelected), null);
      assert.ok(requests.some(r => r.media && r.url.includes('upload_original.m3u8') && r.url.includes('Policy=synthetic') && !r.url.includes('CloudFront-')));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.locator('#channelBackToList').click();
      assert.equal(await page.evaluate(() => channelVideoState.hls), null);
      assert.equal(await page.evaluate(() => channelVideoState.blobUrls.length), 0);
      denyDetail = true;
      await page.locator('[data-channel-video-play="v1"]').click();
      await page.locator('.channel-player .replay-error').waitFor();
      assert.equal(await page.locator('#channelVideo').count(), 0);
      await page.locator('[data-live-center-mode="replay"]').click();
      await page.getByText('Replay 전용', {exact: true}).waitFor();
      assert.equal(await page.getByText('아티스트의 새로운 영상', {exact: true}).count(), 0);
      await page.locator('[data-live-center-mode="live"]').click();
      assert.equal(await page.locator('[data-live-center-mode="live"].active').count(), 1);
      await page.locator('[data-live-center-mode="channel"]').click();
      await page.locator('[data-channel-video-play="v1"]').waitFor();
      await page.evaluate(() => forgetSavedAuth());
      assert.equal(await page.evaluate(() => channelVideoState.pages.size), 0);
      const apiRequests = requests.filter(r => r.headers && r.url.includes('/media/posts'));
      assert.ok(apiRequests.length > 0);
      assert.ok(apiRequests.every(r => r.headers.authorization === 'Bearer synthetic-session' && r.headers.uuid === 'synthetic-device' && ['a', 'b'].includes(r.headers['channel-id'])));
      assert.deepEqual(errors, []);
      console.log(`${mobile ? 'Mobile 390px' : 'Desktop 1440px'}: tab order, grid, pagination, selection, playback wiring, 403, cleanup, Replay isolation, logout, headers PASS (mock service/media)`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});

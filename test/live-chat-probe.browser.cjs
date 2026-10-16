'use strict';
// Isolated synthetic service, never a real account, clipboard or broadcast.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    for (const width of [1440, 320]) {
      const context = await browser.newContext({viewport: {width, height: 900}});
      const page = await context.newPage(), requests = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {value: {
        writeText: async text => { window.probeCopied = text; }
      }}));
      let slow = false, messagePages = 0;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'localhost') {
          const file = ['web-native-live.js', 'web-live-pip.js', 'web-live-chat-probe.js'].find(name => url.pathname === '/' + name);
          return route.fulfill({contentType: file ? 'text/javascript' : 'text/html', body: fs.readFileSync(path.join(root, file || 'index.html'))});
        }
        if (url.hostname === 'live-chat-api.frommyarti.com') {
          requests.push({path: url.pathname, method: route.request().method(), headers: route.request().headers()});
          if (slow) await new Promise(resolve => setTimeout(resolve, 200));
          const first = {messageId: 'private-id-A', content: '<img src=x onerror="window.chatXss=1">', nickname: 'private nickname A', createdAt: 100};
          const second = {messageId: 'private-id-B', content: 'private-comment-text-B', nickname: 'private nickname B', createdAt: 200};
          const data = url.pathname.startsWith('/live-chat/rooms/')
            ? {liveChatRoom: {isFrozen: false, isBanned: false, muteExpiresAt: null}}
            : (++messagePages < 3 ? {messages: [first], deletedMessages: [], cursor: 1792140000000 + messagePages}
              : {messages: [second], deletedMessages: ['private-id-A'], cursor: 1792140000000 + messagePages});
          try { return await route.fulfill({contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({success: true, data})}); }
          catch { return; }
        }
        return route.abort();
      });
      await page.goto('http://localhost:4175/index.html');
      async function prepare(token = 'synthetic-chat-token', provider = 'fromm') {
        await page.evaluate(({token, provider}) => {
          hideLoginGate(); state.filter = 'live'; state.live.centerMode = 'live';
          state.live.config = {isStreaming: true, liveRoomId: 'synthetic-room'};
          state.live.status = 'ready'; state.live.currentLiveRoomId = 'synthetic-room';
          state.live.room = {id: 'synthetic-room', title: 'LIVE', startedAt: '2026-10-16T12:00:00Z'};
          state.live.entry = {kind: 'channel', liveRoomId: 'synthetic-room', channelId: 'synthetic-channel'};
          state.live.discoveryLoaded = true; state.live.entrances = [];
          state.live.liveChat = token ? {chatToken: token} : null; state.live.chatProvider = provider;
          state.live.liveChatError = null; renderLiveView();
        }, {token, provider});
      }
      await prepare(null); await page.locator('#liveChatProbeBtn').click();
      assert.equal(await page.evaluate(() => FrommChatProbe().status), 'missing-chat-context');
      assert.equal(requests.length, 0, 'missing context does not rejoin or request a token');
      await prepare('synthetic-chat-token', 'unverified-provider'); await page.locator('#liveChatProbeBtn').click();
      assert.equal(await page.evaluate(() => FrommChatProbe().status), 'unsupported-provider'); assert.equal(requests.length, 0);
      await prepare(); assert.equal(requests.length, 0, 'no automatic requests on render');
      await page.locator('#liveChatProbeBtn').click();
      await page.waitForFunction(() => FrommChatProbe() && FrommChatProbe().status !== 'checking');
      assert.equal(await page.evaluate(() => FrommChatProbe().status), 'messages-received',
        JSON.stringify({report: await page.evaluate(() => FrommChatProbe()), requests: requests.map(request => request.path)}));
      await page.waitForFunction(() => FrommChatProbe()?.receivedCount === 2);
      assert.ok(requests.length >= 4); assert.ok(requests.every(request => request.method === 'GET'));
      assert.equal(await page.locator('.live-comment-row').count(), 1, 'duplicate/deleted comments do not remain');
      assert.match(await page.locator('.live-comments-list').innerText(), /private-comment-text-B/);
      assert.doesNotMatch(await page.locator('.live-comments-list').innerText(), /nickname A/);
      assert.equal(await page.evaluate(() => window.chatXss || 0), 0);
      assert.equal(await page.locator('.live-comments-list img, .live-comments-list script').count(), 0);
      assert.ok(requests.every(request => request.headers.authorization === 'Bearer synthetic-chat-token'));
      await page.locator('#liveChatProbeStatus button').first().click();
      const copied = await page.evaluate(() => window.probeCopied);
      assert.equal(JSON.parse(copied).status, 'messages-received');
      assert.doesNotMatch(copied, /synthetic|private|Bearer|1792140000000|http[s]?:/);
      assert.equal(await page.locator('#liveChatProbeStatus input:not(:disabled), #liveChatProbeStatus textarea').count(), 0);
      assert.equal(await page.locator('#liveChatProbeStatus input').isDisabled(), true);
      await page.evaluate(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640;
        const drawing = canvas.getContext('2d'); drawing.fillStyle = '#253b58'; drawing.fillRect(0, 0, 360, 640);
        drawing.fillStyle = '#fff'; drawing.font = '22px sans-serif'; drawing.fillText('SYNTHETIC LIVE', 55, 280);
        const image = document.createElement('img'); image.id = 'nativeLiveVideo'; image.alt = 'LIVE 영상';
        image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain';
        state.live.client = {}; document.getElementById('liveVideoGrid').replaceChildren(image);
        await new Promise(resolve => { image.addEventListener('load', resolve, {once: true}); image.src = canvas.toDataURL('image/jpeg'); });
      });
      await page.waitForFunction(() => !document.querySelector('#livePipBtn').disabled);
      await page.locator('#livePipBtn').click();
      await page.waitForFunction(() => document.pictureInPictureElement?.id === 'livePipVideo');
      assert.equal(await page.evaluate(() => document.pictureInPictureElement.tagName), 'VIDEO');
      assert.equal(await page.evaluate(() => document.pictureInPictureElement.querySelectorAll('.live-comments-overlay,input,button').length), 0);
      assert.equal(await page.locator('.live-comment-row').count(), 1, 'comments remain on the normal stage');
      await page.evaluate(() => document.exitPictureInPicture());
      const fit = await page.evaluate(() => {
        const panel = document.querySelector('#liveChatProbeStatus').getBoundingClientRect();
        const input = document.querySelector('#liveChatProbeStatus input').getBoundingClientRect();
        const stage = document.querySelector('.live-stage').getBoundingClientRect();
        return {left: panel.left, right: panel.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          stageBottom: stage.bottom, inputBottom: input.bottom, listHeight: document.querySelector('.live-comments-list').getBoundingClientRect().height};
      });
      assert.ok(fit.left >= 0 && fit.right <= fit.width + 1 && fit.scrollWidth <= fit.width, 'diagnostic fits viewport');
      assert.ok(fit.inputBottom <= fit.stageBottom + 1 && fit.listHeight > 0, 'comments/input stay inside video');
      if (process.env.LIVE_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, {recursive: true});
        await page.screenshot({path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'live-comments-' + width + '.png')});
      }
      await page.locator('#liveChatProbeStatus button').last().click();
      assert.equal(await page.locator('#liveChatProbeStatus').count(), 0);
      await prepare(); slow = true;
      await page.locator('#liveChatProbeBtn').click();
      await page.evaluate(() => stopLivePlayback());
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#liveChatProbeStatus').count(), 0);
      assert.equal(await page.evaluate(() => FrommChatProbe()), null);
      assert.deepEqual(errors, []);
      console.log(width + 'px: explicit read-only chat probe, missing/provider guards, safe copy, layout and stop cancellation PASS (synthetic)');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});

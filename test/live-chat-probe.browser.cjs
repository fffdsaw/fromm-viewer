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
      let slow = false;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'localhost') {
          const file = ['web-native-live.js', 'web-live-pip.js', 'web-live-chat-probe.js'].find(name => url.pathname === '/' + name);
          return route.fulfill({contentType: file ? 'text/javascript' : 'text/html', body: fs.readFileSync(path.join(root, file || 'index.html'))});
        }
        if (url.hostname === 'live-chat-api.frommyarti.com') {
          requests.push({path: url.pathname, method: route.request().method(), headers: route.request().headers()});
          if (slow) await new Promise(resolve => setTimeout(resolve, 200));
          const data = url.pathname.startsWith('/live-chat/rooms/')
            ? {liveChatRoom: {isFrozen: false, isBanned: false, muteExpiresAt: null}}
            : {messages: [{id: 'private-message-id', content: 'private-comment-text'}], deletedMessages: [], cursor: 1792140000000};
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
      assert.equal(requests.length, 3); assert.ok(requests.every(request => request.method === 'GET'));
      assert.ok(requests.every(request => request.headers.authorization === 'Bearer synthetic-chat-token'));
      await page.locator('#liveChatProbeStatus button').first().click();
      const copied = await page.evaluate(() => window.probeCopied);
      assert.equal(JSON.parse(copied).status, 'messages-received');
      assert.doesNotMatch(copied, /synthetic|private|Bearer|1792140000000|http[s]?:/);
      assert.equal(await page.locator('#liveChatProbeStatus input, #liveChatProbeStatus textarea').count(), 0);
      const fit = await page.evaluate(() => {
        const panel = document.querySelector('#liveChatProbeStatus').getBoundingClientRect();
        return {left: panel.left, right: panel.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth};
      });
      assert.ok(fit.left >= 0 && fit.right <= fit.width + 1 && fit.scrollWidth <= fit.width, 'diagnostic fits viewport');
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

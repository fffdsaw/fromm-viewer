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
      let slow = false, messagePages = 0, postMode = 'ack', echo = false, frozen = false, postCount = 0;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'localhost') {
          const file = ['web-native-live.js', 'web-live-pip.js', 'web-live-chat-probe.js'].find(name => url.pathname === '/' + name);
          return route.fulfill({contentType: file ? 'text/javascript' : 'text/html', body: fs.readFileSync(path.join(root, file || 'index.html'))});
        }
        if (url.hostname === 'live-chat-api.frommyarti.com') {
          requests.push({path: url.pathname, method: route.request().method(), headers: route.request().headers()});
          if (slow) await new Promise(resolve => setTimeout(resolve, 200));
          if (route.request().method() === 'POST') {
            postCount++;
            assert.equal(url.pathname, '/live-chat/messages/normal');
            const body = route.request().postDataJSON();
            assert.deepEqual(Object.keys(body).sort(), ['chatToken', 'content', 'liveChatRoomId']);
            assert.equal(body.liveChatRoomId, 'synthetic-room'); assert.equal(body.chatToken, 'synthetic-chat-token');
            await new Promise(resolve => setTimeout(resolve, 200));
            if (postMode === 'network') return route.abort();
            try { return await route.fulfill({status: postMode === 'denied' ? 403 : 200, contentType: 'text/xml',
              headers: {'access-control-allow-origin': '*'}, body: postMode === 'denied' ? 'private-error-body' :
                '<SendMessageResponse><SendMessageResult><MessageId>synthetic-echo-id</MessageId></SendMessageResult></SendMessageResponse>'}); }
            catch { return; }
          }
          const first = {messageId: 'private-id-A', content: '<img src=x onerror="window.chatXss=1">', nickname: 'private nickname A', createdAt: 100};
          const second = {messageId: 'private-id-B', content: 'private-comment-text-B', nickname: 'private nickname B', createdAt: 200};
          const data = url.pathname.startsWith('/live-chat/rooms/')
            ? {liveChatRoom: {isFrozen: frozen, isBanned: false, muteExpiresAt: null}}
            : (++messagePages < 3 ? {messages: [first], deletedMessages: [], cursor: 1792140000000 + messagePages}
              : {messages: [second], deletedMessages: ['private-id-A'], cursor: 1792140000000 + messagePages});
          if (echo && data.messages) data.messages.push({messageId: 'synthetic-echo-id', nickname: 'synthetic sender', content: '합성 전송 댓글', createdAt: 300});
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
      assert.equal(postCount, 0, 'opening/reading comments never posts anything');
      const input = page.locator('.live-comment-input'), send = page.locator('.live-comment-send');
      await page.waitForFunction(() => !document.querySelector('.live-comment-input').disabled);
      await input.fill('합성 전송 댓글');
      await input.dispatchEvent('compositionstart'); await input.press('Enter');
      assert.equal(postCount, 0, 'Korean IME confirmation cannot submit');
      await input.dispatchEvent('compositionend');
      await send.click();
      // Submit events while the same request is pending must not duplicate the POST.
      await page.locator('.live-comment-form').dispatchEvent('submit');
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'accepted');
      assert.equal(postCount, 1); assert.equal(await input.inputValue(), '');
      assert.equal(await page.locator('.live-comment-row').count(), 1, 'ACK does not insert a fake own comment');
      echo = true;
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'delivered');
      assert.equal(await page.locator('.live-comment-row').count(), 2, 'only a real GET echo adds the sent row');
      await page.locator('#liveChatProbeStatus button').first().click();
      assert.doesNotMatch(await page.evaluate(() => window.probeCopied), /synthetic|private|합성|messageId|chatToken"\s*:|Bearer/);
      postMode = 'denied'; await input.fill('합성 거절 댓글'); await input.press('Enter');
      await page.waitForFunction(() => FrommChatProbe()?.send?.httpStatus === 403);
      assert.equal(await input.inputValue(), '합성 거절 댓글'); assert.equal(postCount, 2);
      postMode = 'network'; await input.fill('합성 불확실 댓글'); await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'send-unconfirmed');
      assert.equal(await input.inputValue(), '합성 불확실 댓글'); assert.equal(await send.isDisabled(), true);
      await page.waitForTimeout(300); assert.equal(postCount, 3, 'unknown delivery never automatically retries');
      await input.fill('다른 합성 댓글'); frozen = true; await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'send-frozen');
      assert.equal(postCount, 3, 'a fresh frozen policy prevents posting even after an earlier allowed poll');
      frozen = false; postMode = 'ack';
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
      assert.equal(await page.locator('.live-comment-row').count(), 2, 'comments remain on the normal stage');
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
      await page.getByRole('button', {name: '닫기', exact: true}).click();
      assert.equal(await page.locator('#liveChatProbeStatus').count(), 0);
      await prepare(); await page.locator('#liveChatProbeBtn').click();
      await page.waitForFunction(() => !document.querySelector('.live-comment-input').disabled);
      const beforeClose = postCount;
      await input.fill('중단된 합성 전송'); await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'sending');
      // Wait for the mock service to observe the POST before dismissing its response.
      for (let check = 0; check < 20 && postCount === beforeClose; check++) await page.waitForTimeout(20);
      assert.equal(postCount, beforeClose + 1);
      await page.getByRole('button', {name: '닫기', exact: true}).click();
      await page.waitForTimeout(250); assert.equal(await page.evaluate(() => FrommChatProbe()), null);
      await page.locator('#liveChatProbeBtn').click();
      await page.waitForFunction(() => !document.querySelector('.live-comment-input').disabled);
      await input.fill('중단된 합성 전송'); assert.equal(await send.isDisabled(), true, 'dismissal cannot hide the uncertain-delivery duplicate guard');
      const beforeStale = postCount; slow = true;
      await input.fill('전환된 계정의 합성 입력'); await send.click();
      await page.evaluate(() => {state.live.liveChat = {chatToken: 'synthetic-new-account-token'};});
      await page.waitForTimeout(300); assert.equal(postCount, beforeStale, 'account change during the fresh policy check prevents the POST');
      await page.evaluate(() => stopLivePlayback()); slow = false;
      await prepare(); slow = true;
      await page.locator('#liveChatProbeBtn').click();
      await page.evaluate(() => stopLivePlayback());
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#liveChatProbeStatus').count(), 0);
      assert.equal(await page.evaluate(() => FrommChatProbe()), null);
      assert.deepEqual(errors, []);
      console.log(width + 'px: explicit chat read/send, IME, single POST, ACK/echo, deny/unknown/frozen, safe copy, video-only PiP, layout and stop cancellation PASS (synthetic)');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});

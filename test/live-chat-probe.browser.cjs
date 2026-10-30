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
      await page.addInitScript(() => {
        window.chatDiagnostics = [];
        const warn = console.warn.bind(console);
        console.warn = (...args) => {
          if (args[0] === '[Fromm LIVE comments]') window.chatDiagnostics.push(JSON.stringify(args[1]));
          warn(...args);
        };
      });
      let slow = false, messagePages = 0, postMode = 'ack', echo = false, frozen = false, postCount = 0, policyMode = 'full', burst = 0, extraMessages = [], deletedIds = [];
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'localhost') {
          const file = ['web-native-live.js', 'web-live-pip.js', 'web-live-controls.js', 'web-live-chat-probe.js'].find(name => url.pathname === '/' + name);
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
            ? {liveChatRoom: policyMode === 'full' ? {isFrozen: frozen, isBanned: false, muteExpiresAt: null} : {isFrozen: policyMode === 'malformed' ? 'private-bad-type' : frozen}}
            : (++messagePages < 3 ? {messages: [first], deletedMessages: [], cursor: 1792140000000 + messagePages}
              : {messages: [second], deletedMessages: ['private-id-A'], cursor: 1792140000000 + messagePages});
          if (echo && data.messages) data.messages.push({messageId: 'synthetic-echo-id', nickname: 'synthetic sender', content: '합성 전송 댓글', createdAt: 300});
          if (burst && data.messages) data.messages.push(...Array.from({length: 39 + burst}, (_, index) =>
            ({messageId: 'synthetic-burst-' + index, nickname: 'synthetic reader', content: 'synthetic row ' + index, createdAt: 400 + index})));
          if (data.messages) { data.messages.push(...extraMessages); data.deletedMessages.push(...deletedIds); }
          try { return await route.fulfill({contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({success: true, data})}); }
          catch { return; }
        }
        return route.abort();
      });
      await require('./helpers/shell-assets.cjs')(page); await page.goto('http://localhost:4175/index.html');
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
      assert.equal(await page.locator('.live-comment-copy').count(), 0, 'diagnostic copy button is removed');
      const copied = await page.evaluate(() => JSON.stringify(FrommChatProbe()));
      assert.equal(JSON.parse(copied).status, 'messages-received');
      assert.doesNotMatch(copied, /synthetic|private|Bearer|1792140000000|http[s]?:/);
      assert.equal(postCount, 0, 'opening/reading comments never posts anything');
      const input = page.locator('.live-comment-input'), send = page.locator('.live-comment-send');
      await page.waitForFunction(() => !document.querySelector('.live-comment-input').disabled);
      policyMode = 'omitted'; // Cached read allows writing, fresh send response omits nullable fields like the APK permits.
      await input.fill('합성 전송 댓글');
      await input.dispatchEvent('compositionstart'); await input.press('Enter');
      assert.equal(postCount, 0, 'Korean IME confirmation cannot submit');
      await input.dispatchEvent('compositionend');
      await send.click();
      // Submit events while the same request is pending must not duplicate the POST.
      await page.locator('.live-comment-form').dispatchEvent('submit');
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'accepted');
      assert.equal(postCount, 1); assert.equal(await input.inputValue(), '');
      assert.equal(await page.locator('.live-comment-send-status').isVisible(), false, 'successful acceptance needs no extra status line');
      assert.equal(await page.locator('.live-comment-row').count(), 1, 'ACK does not insert a fake own comment');
      echo = true;
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'delivered');
      assert.equal(await page.locator('.live-comment-row').count(), 2, 'only a real GET echo adds the sent row');
      assert.equal(await page.locator('.live-comment-send-status').isVisible(), false, 'delivered success line is hidden');
      assert.equal(await page.locator('.live-chat-probe-text').isVisible(), false, 'normal receive status/count is hidden');
      assert.equal(await page.getByRole('button', {name: '닫기', exact: true}).count(), 0, 'header hide button is the single visibility control');
      assert.doesNotMatch(await page.evaluate(() => JSON.stringify(FrommChatProbe())), /synthetic|private|합성|messageId|chatToken"\s*:|Bearer/);
      const beforeErrorLogs = await page.evaluate(() => window.chatDiagnostics.length);
      policyMode = 'malformed'; await input.fill('합성 권한형식 오류'); await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'send-policy-unavailable');
      assert.equal(postCount, 1); assert.equal(await input.inputValue(), '합성 권한형식 오류');
      const schemaCopy = await page.evaluate(() => JSON.stringify(FrommChatProbe()));
      assert.equal(JSON.parse(schemaCopy).send.diagnostic.stage, 'policy-schema');
      assert.equal(JSON.parse(schemaCopy).send.diagnostic.postStarted, false);
      assert.doesNotMatch(schemaCopy, /private|synthetic|합성|Bearer/);
      assert.equal(await page.evaluate(() => window.chatDiagnostics.length), beforeErrorLogs + 1, 'one diagnostic is emitted for a send error');
      const logged = await page.evaluate(() => JSON.parse(window.chatDiagnostics.at(-1)));
      assert.equal(logged.send.status, 'send-policy-unavailable');
      assert.equal(logged.send.diagnostic.stage, 'policy-schema');
      assert.equal(logged.send.diagnostic.postStarted, false);
      assert.doesNotMatch(await page.evaluate(() => window.chatDiagnostics.join(' ')), /private|synthetic|합성|Bearer|chatToken|messageId|https?:/);
      await input.fill('합성 권한형식 오류 수정');
      assert.equal(await page.evaluate(() => window.chatDiagnostics.length), beforeErrorLogs + 1, 'composer updates do not repeat the same diagnostic');
      policyMode = 'omitted';
      postMode = 'denied'; await input.fill('합성 거절 댓글'); await input.press('Enter');
      await page.waitForFunction(() => FrommChatProbe()?.send?.httpStatus === 403);
      assert.equal(await input.inputValue(), '합성 거절 댓글'); assert.equal(postCount, 2);
      assert.equal(await page.locator('.live-comment-send-status').isVisible(), true, 'send errors remain visible');
      postMode = 'network'; await input.fill('합성 불확실 댓글'); await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'send-unconfirmed');
      assert.equal(await input.inputValue(), '합성 불확실 댓글'); assert.equal(await send.isDisabled(), true);
      await page.waitForTimeout(300); assert.equal(postCount, 3, 'unknown delivery never automatically retries');
      const composer=await input.boundingBox(),bar=await page.locator('.live-player-controls .mvc-row').boundingBox();assert.ok(composer.y+composer.height<=bar.y,'LIVE composer cannot overlap bottom controls');
      await input.focus();await page.keyboard.type('rf');assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false,'typing comments cannot invoke player shortcuts');assert.equal(await page.locator('.mvc-angle').textContent(),'0°');
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
        return {left: panel.left, stageLeft: stage.left, right: panel.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          stageBottom: stage.bottom, inputBottom: input.bottom, listHeight: document.querySelector('.live-comments-list').getBoundingClientRect().height};
      });
      assert.ok(fit.left >= 0 && fit.right <= fit.width + 1 && fit.scrollWidth <= fit.width, 'diagnostic fits viewport');
      assert.ok(Math.abs(fit.left - fit.stageLeft) < 1, 'comments align with the video lower left');
      assert.ok(fit.inputBottom <= fit.stageBottom + 1 && fit.listHeight > 0, 'comments/input stay inside video');
      burst = 1;
      await page.waitForFunction(() => document.querySelectorAll('.live-comment-row').length === 42);
      await page.waitForFunction(() => {const list = document.querySelector('.live-comments-list'); return list.scrollHeight - list.clientHeight - list.scrollTop < 2;});
      await page.evaluate(() => {window.stableCommentRow = document.querySelector('.live-comment-row');});
      const list = page.locator('.live-comments-list');
      await list.focus(); await list.press('Home');
      await page.waitForFunction(() => !document.querySelector('.live-comments-latest').hidden);
      burst = 2;
      await page.waitForFunction(() => document.querySelector('.live-comments-list').textContent.includes('synthetic row 40'));
      assert.ok(await list.evaluate(element => element.scrollTop < 2), 'new comments preserve the reader position above latest');
      assert.ok(await page.evaluate(() => window.stableCommentRow === document.querySelector('.live-comment-row')), 'unchanged rows keep their DOM identity');
      assert.ok(await page.locator('.live-comments-unread').innerText(), 'paused reader sees new comment count');
      const firstBounds = await list.evaluate(element => {
        const row = element.firstElementChild; return {top: row.getBoundingClientRect().top, listTop: element.getBoundingClientRect().top};
      });
      assert.ok(Math.abs(firstBounds.top - firstBounds.listTop) < 1, 'first retained comment is fully reachable');
      // A long multiline row must wrap and retain its complete height.
      extraMessages = [{messageId: 'long-row', nickname: '긴 이름', content: ('긴댓글'.repeat(60) + '\n').repeat(8), createdAt: 1000}];
      await page.waitForFunction(() => !!document.querySelector('[data-message-id="long-row"]'));
      assert.ok(await list.evaluate(element => element.scrollTop < 2), 'long incoming row does not move paused reader');
      const longFit = await page.locator('[data-message-id="long-row"]').evaluate(row => ({
        row: row.clientHeight, content: row.lastChild.scrollHeight, width: row.lastChild.clientWidth, contentWidth: row.lastChild.scrollWidth
      }));
      assert.ok(longFit.row >= longFit.content - 1 && longFit.width >= longFit.contentWidth - 1, 'multiline content has no clipping');
      await page.setViewportSize({width: width === 1440 ? 1100 : 390, height: 720});
      assert.ok(await list.evaluate(element => element.scrollTop < 2), 'paused viewport resize preserves the top');
      await page.setViewportSize({width, height: 900});
      const circle = await page.locator('.live-comments-latest').evaluate(element => {
        const css = getComputedStyle(element); return {width: css.width, height: css.height, radius: css.borderRadius};
      });
      assert.deepEqual(circle, {width: '28px', height: '28px', radius: '50%'});
      assert.equal(await list.evaluate(element => getComputedStyle(element).scrollbarWidth), 'none');
      await page.getByRole('button', {name: '최신 댓글로 이동', exact: true}).focus();
      if (process.env.LIVE_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.LIVE_SCREENSHOT_DIR, {recursive: true});
        await page.screenshot({path: path.join(process.env.LIVE_SCREENSHOT_DIR, 'live-comments-' + width + '.png')});
      }
      await page.getByRole('button', {name: '최신 댓글로 이동', exact: true}).click();
      await page.waitForFunction(() => document.querySelector('.live-comments-latest').hidden);
      assert.ok(await list.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop < 2));
      // Scrolling back to the bottom (without the button) resumes following.
      await list.evaluate(element => {element.scrollTop = 0;});
      await page.waitForFunction(() => !document.querySelector('.live-comments-latest').hidden);
      await list.evaluate(element => {element.scrollTop = element.scrollHeight;});
      await page.waitForFunction(() => document.querySelector('.live-comments-latest').hidden);
      burst = 3;
      await page.waitForFunction(() => !!document.querySelector('[data-message-id="synthetic-burst-41"]'));
      await page.waitForFunction(() => {const el = document.querySelector('.live-comments-list');return el.scrollHeight - el.clientHeight - el.scrollTop < 2;});
      // Pause in the middle, then evict older rows with a large batch. The
      // surviving visible row must stay at the same pixel offset.
      await list.evaluate(element => {
        const row = element.querySelector('[data-message-id="synthetic-burst-25"]');
        element.scrollTop += row.getBoundingClientRect().top - element.getBoundingClientRect().top + 3;
      });
      await page.waitForFunction(() => !document.querySelector('.live-comments-latest').hidden);
      const anchorOffset = await page.locator('[data-message-id="synthetic-burst-25"]').evaluate(row => row.getBoundingClientRect().top - row.parentElement.getBoundingClientRect().top);
      burst = 80;
      await page.waitForFunction(() => !!document.querySelector('[data-message-id="synthetic-burst-118"]'));
      const retainedOffset = await page.locator('[data-message-id="synthetic-burst-25"]').evaluate(row => row.getBoundingClientRect().top - row.parentElement.getBoundingClientRect().top);
      assert.ok(Math.abs(retainedOffset - anchorOffset) <= 1, 'eviction above the viewport preserves the surviving visible anchor');
      const ids = await page.locator('.live-comment-row').evaluateAll(rows => rows.map(row => row.dataset.messageId));
      assert.equal(new Set(ids).size, ids.length, 'burst and duplicate polls do not duplicate rows');
      assert.deepEqual(ids.filter(id => id.startsWith('synthetic-burst-')).map(id => Number(id.split('-').at(-1))), Array.from({length: 99}, (_, i) => i + 20), 'retained comments stay ordered');
      deletedIds = ['synthetic-burst-20'];
      extraMessages.push({messageId: 'synthetic-burst-21', nickname: 'edited', content: '수정된 댓글\n'.repeat(12), createdAt: 421});
      await page.waitForFunction(() => document.querySelector('[data-message-id="synthetic-burst-21"]')?.textContent.includes('수정된 댓글'));
      assert.equal(await page.locator('[data-message-id="synthetic-burst-20"]').count(), 0);
      const editedOffset = await page.locator('[data-message-id="synthetic-burst-25"]').evaluate(row => row.getBoundingClientRect().top - row.parentElement.getBoundingClientRect().top);
      assert.ok(Math.abs(editedOffset - anchorOffset) <= 1, 'deletion and multiline edit above the reader preserve its position');
      await page.setViewportSize({width: width === 1440 ? 1000 : 390, height: 720});
      await page.waitForTimeout(100); // ResizeObserver delivery after layout, not a network readiness wait.
      const resizedOffset = await page.locator('[data-message-id="synthetic-burst-25"]').evaluate(row => row.getBoundingClientRect().top - row.parentElement.getBoundingClientRect().top);
      assert.ok(Math.abs(resizedOffset - editedOffset) <= 1, 'resize keeps the visible row anchored');
      await page.setViewportSize({width, height: 900});
      burst = 110;
      await page.waitForFunction(() => !!document.querySelector('[data-message-id="synthetic-burst-148"]'));
      // Row 25 is beyond the retained window: only server-received latest 100
      // remain. Start another session below to verify cancellation as before.
      assert.equal(await page.locator('.live-comment-row').count(), 100, 'retention remains bounded and every retained row is available');
      assert.equal(await page.locator('[data-message-id="synthetic-burst-25"]').count(), 0, 'evicted history is not fabricated');
      assert.ok(Number.isFinite(anchorOffset));
      burst = 0; extraMessages = []; deletedIds = [];
      await page.locator('#liveChatProbeBtn').click();
      assert.equal(await page.locator('#liveChatProbeStatus').count(), 0);
      await prepare(); await page.locator('#liveChatProbeBtn').click();
      await page.waitForFunction(() => !document.querySelector('.live-comment-input').disabled);
      const beforeClose = postCount;
      await input.fill('중단된 합성 전송'); await send.click();
      await page.waitForFunction(() => FrommChatProbe()?.send?.status === 'sending');
      // Wait for the mock service to observe the POST before dismissing its response.
      for (let check = 0; check < 20 && postCount === beforeClose; check++) await page.waitForTimeout(20);
      assert.equal(postCount, beforeClose + 1);
      await page.locator('#liveChatProbeBtn').click();
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
      console.log(width + 'px: explicit chat read/send, IME, single POST, ACK/echo, deny/unknown/frozen, safe console diagnostics, video-only PiP, layout and stop cancellation PASS (synthetic)');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});

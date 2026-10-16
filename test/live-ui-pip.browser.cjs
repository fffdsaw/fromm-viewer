'use strict';
// Real browser Document PiP and JPEG decode with synthetic Native bridge frames.
// Every network request is intercepted; no real account, RTC broadcast or audio.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = !!process.env.LIVE_BASELINE_HTML;
const html = fs.readFileSync(process.env.LIVE_BASELINE_HTML || path.join(root, 'index.html'), 'utf8');
const output = process.env.LIVE_SCREENSHOT_DIR;
const reports = [];
const channel = process.env.PLAYWRIGHT_CHANNEL;

async function openFixture(browser, viewport, nativeWindowViewport = false) {
  const context = await browser.newContext({viewport: nativeWindowViewport ? null : viewport,
    ...(nativeWindowViewport ? {} : {deviceScaleFactor: 1}), timezoneId: 'Asia/Seoul',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
  const page = await context.newPage();
  if (nativeWindowViewport) await page.setViewportSize(viewport);
  const errors = [], externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.nativeFixtureAcks = [];
    window.addEventListener('message', event => {
      const message = event.data;
      if (event.source !== window || message?.protocol !== 'fromm-native-v1' || message.direction !== 'page') return;
      const request = message.value;
      if (request.method === 'frame-ack') { window.nativeFixtureAcks.push(request.params.sequence); return; }
      if (!['hello', 'join', 'leave'].includes(request.method)) return;
      window.postMessage({protocol: 'fromm-native-v1', direction: 'extension', value: {
        id: request.id, ok: true, toolVersion: '0.4.0', backgroundPlayer: true,
        frameAck: true, targetFps: 30, extensionVersion: '1.0.8'
      }}, location.origin);
    });
  });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      if (['/web-native-live.js', '/web-live-pip.js', '/web-live-chat-probe.js'].includes(url.pathname)) {
        return route.fulfill({contentType: 'text/javascript', body: fs.readFileSync(path.join(root, path.basename(url.pathname)), 'utf8')});
      }
      if (url.pathname === '/index.html') return route.fulfill({contentType: 'text/html', body: html});
    }
    externalRequests.push(url.origin + url.pathname);
    return route.abort();
  });
  await page.goto('http://localhost:4173/index.html');
  await page.evaluate(() => {
    hideLoginGate();
    state.filter = 'live';
    state.live.centerMode = 'live';
    state.live.discoveryLoaded = true;
    state.live.discoveryError = '';
    state.live.status = 'ready';
    state.live.config = {isStreaming: true, liveRoomId: 'fixture-room'};
    state.live.currentLiveRoomId = 'fixture-room';
    state.live.entry = {kind: 'ordinary', channelId: 'fixture-channel', liveRoomId: 'fixture-room'};
    state.live.entrances = [{channelId: 'fixture-channel', liveRoomId: 'fixture-room', artiName: 'SONG HA YOUNG'}];
    state.live.room = {id: 'fixture-room', title: '따르르르릉', startedAt: '2026-10-14T14:27:00Z'};
    renderLiveView();
  });
  return {context, page, errors, externalRequests};
}

async function measure(page, label) {
  const data = await page.evaluate(() => {
    const rect = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height};
    };
    const title = document.querySelector('.live-title'), meta = document.querySelector('.live-sub');
    return {viewport: {width: innerWidth, height: innerHeight}, head: rect('.live-head'), stage: rect('.live-stage'),
      title: rect('.live-title'), meta: rect('.live-sub'),
      titleText: title.textContent, metaText: meta.textContent,
      titleOverflow: getComputedStyle(title).textOverflow, metaOverflow: getComputedStyle(meta).textOverflow,
      titleScrollWidth: title.scrollWidth, metaScrollWidth: meta.scrollWidth,
      scrollWidth: document.documentElement.scrollWidth};
  });
  reports.push({label, ...data});
  assert.ok(data.scrollWidth <= data.viewport.width, label + ': no horizontal overflow');
  assert.match(data.metaText, /SONG HA YOUNG/);
  assert.match(data.metaText, /시작/);
  if (!baseline && data.viewport.width > 700) {
    assert.ok(Math.abs(data.title.top + data.title.height / 2 - data.meta.top - data.meta.height / 2) <= 2, label + ': title and artist/time share one desktop row');
    assert.ok(data.meta.left >= data.title.right - 1, label + ': metadata is right of title');
    assert.ok(data.head.height <= 53, label + ': compact desktop header');
  }
  if (output) {
    fs.mkdirSync(output, {recursive: true});
    await page.screenshot({path: path.join(output, `${baseline ? 'before-' : ''}${label}-${channel || 'chromium'}.png`)});
  }
  return data;
}

async function sendFrame(page, sequence) {
  await page.evaluate(sequence => {
    const canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 1280;
    const drawing = canvas.getContext('2d');
    drawing.fillStyle = sequence % 2 ? '#25436e' : '#714754'; drawing.fillRect(0, 0, 720, 1280);
    drawing.fillStyle = '#fff'; drawing.font = '48px sans-serif';
    drawing.fillText('SYNTHETIC JPEG', 55, 560); drawing.fillText('FRAME ' + sequence, 55, 635);
    window.postMessage({protocol: 'fromm-native-v1', direction: 'extension', value: {
      type: 'frame', sequence, jpeg: canvas.toDataURL('image/jpeg', 0.85)
    }}, location.origin);
  }, sequence);
  await page.waitForFunction(sequence => nativeFixtureAcks.includes(sequence), sequence);
}

(async () => {
  const browser = await chromium.launch({headless: process.env.PLAYWRIGHT_HEADLESS !== 'false', ...(channel ? {channel} : {})});
  try {
    for (const viewport of [{width: 1920, height: 980}, {width: 1440, height: 900}, {width: 1366, height: 768}, {width: 768, height: 1024}, {width: 390, height: 844}, {width: 360, height: 640}, {width: 320, height: 568}]) {
      const fixture = await openFixture(browser, viewport), {context, page, errors, externalRequests} = fixture;
      assert.deepEqual(await page.locator('[data-live-center-mode]').allTextContents(), ['LIVE', 'Replay', 'Channel']);
      await measure(page, 'live-' + viewport.width + 'x' + viewport.height);
      await page.evaluate(() => {
        state.live.room.title = '아주 긴 방송 제목을 줄이지 않고 정보를 보존하는 LIVE 화면입니다 '.repeat(8);
        state.live.entrances[0].artiName = 'SONG HA YOUNG 아주 긴 아티스트 이름 '.repeat(8);
        renderLiveEntrances();
      });
      const long = await measure(page, 'live-long-' + viewport.width + 'x' + viewport.height);
      if (!baseline && viewport.width > 700) {
        assert.equal(long.titleOverflow, 'ellipsis'); assert.equal(long.metaOverflow, 'ellipsis');
        assert.ok(long.titleScrollWidth > long.title.width || long.metaScrollWidth > long.meta.width, 'long text is constrained');
      }
      assert.deepEqual(errors, []);
      assert.ok(externalRequests.every(url => !url.includes('frommyarti.com')), 'fixture does not even initiate official API calls');
      await context.close();
    }
    if (!baseline) {
      const {context, page, errors, externalRequests} = await openFixture(browser, {width: 1440, height: 900}, true);
      await page.evaluate(async () => {
        // Authoritative identity resolution is covered separately; only the Native
        // JPEG/ACK transport and PiP lifecycle are exercised by this fixture.
        setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account');
        resolveAgoraJoinArgs = () => {};
        state.live.room.encryptionKey = 'x'.repeat(64);
        state.live.room.encryptionSalt = 'synthetic';
        await connectAgoraLive();
      });
      await sendFrame(page, 1);
      const button = page.locator('#livePipBtn');
      await page.waitForFunction(() => !document.querySelector('#livePipBtn')?.disabled);
      if (output) await page.screenshot({path: path.join(output, 'live-native-jpeg-desktop-' + (channel || 'chromium') + '.png')});
      const documentPip = await page.evaluate(() => typeof window.documentPictureInPicture?.requestWindow === 'function');
      assert.equal(documentPip, true, 'Chromium supports Document PiP on localhost');
      await button.click();
      await page.waitForFunction(() => documentPictureInPicture.window && !documentPictureInPicture.window.closed);
      await page.waitForFunction(() => documentPictureInPicture.window.document.querySelector('img')?.naturalWidth > 0);
      const opened = await page.evaluate(() => {
        const doc = documentPictureInPicture.window.document;
        return {bodyTags: [...doc.body.children].map(e => e.tagName), text: doc.body.textContent,
          windowDimensions: {width: documentPictureInPicture.window.innerWidth, height: documentPictureInPicture.window.innerHeight},
          forms: doc.querySelectorAll('form,input,textarea,button,.live-sub,.live-title,.live-video-label').length,
          mainConnected: document.querySelector('#nativeLiveVideo').isConnected,
          mainParent: document.querySelector('#nativeLiveVideo').parentElement.id,
          intrinsic: [doc.querySelector('img').naturalWidth, doc.querySelector('img').naturalHeight],
          objectFit: documentPictureInPicture.window.getComputedStyle(doc.querySelector('img')).objectFit};
      });
      assert.deepEqual(opened.bodyTags, ['IMG']); assert.equal(opened.text, ''); assert.equal(opened.forms, 0);
      assert.equal(opened.mainConnected, true); assert.equal(opened.mainParent, 'liveVideoGrid');
      assert.deepEqual(opened.intrinsic, [720, 1280]);
      assert.equal(opened.objectFit, 'contain');
      await sendFrame(page, 2);
      await page.waitForFunction(() => documentPictureInPicture.window.document.querySelector('img').src === document.querySelector('#nativeLiveVideo').src);
      const pipPage = context.pages().find(candidate => candidate !== page);
      let openerHiddenDuringFrame = false;
      if (pipPage) {
        await pipPage.bringToFront();
        const coveringTab = await context.newPage();
        await coveringTab.goto('about:blank'); await coveringTab.bringToFront();
        openerHiddenDuringFrame = await page.evaluate(() => document.visibilityState === 'hidden');
        await sendFrame(page, 3);
        await page.waitForFunction(() => documentPictureInPicture.window.document.querySelector('img').src === document.querySelector('#nativeLiveVideo').src);
        if (output) await pipPage.screenshot({path: path.join(output, 'live-video-only-pip-' + (channel || 'chromium') + '.png')});
        await coveringTab.close();
      }
      await page.evaluate(() => documentPictureInPicture.window.close());
      await page.waitForFunction(() => !documentPictureInPicture.window);
      await sendFrame(page, 4);
      assert.equal(await page.locator('#nativeLiveVideo').count(), 1, 'PiP close preserves main Native image');
      await page.bringToFront(); await button.click();
      await page.waitForFunction(() => !!documentPictureInPicture.window);
      await page.evaluate(async () => { await stopLivePlayback(); });
      await page.waitForFunction(() => !documentPictureInPicture.window);
      await page.evaluate(() => renderLiveView());
      assert.deepEqual(errors, []);
      assert.ok(externalRequests.every(url => !url.includes('frommyarti.com')));
      reports.push({label: 'native-document-pip', browser: channel || 'chromium', synthetic: true, authenticatedMedia: false,
        actualBrowserWindow: true, bodyTags: opened.bodyTags, sourceImagePreserved: true,
        apiWindowDimensions: opened.windowDimensions,
        acknowledgements: await page.evaluate(() => nativeFixtureAcks), pipWindowObservedByPlaywright: !!pipPage,
        openerHiddenDuringFrame,
        closePreservesMain: true, stopClosesPip: true});
      await context.close();
    }
    if (output) fs.writeFileSync(path.join(output, `${baseline ? 'before-' : ''}live-ui-pip-${channel || 'chromium'}.json`), JSON.stringify(reports, null, 2));
    console.log(JSON.stringify({checks: 'LIVE layout / JPEG Document PiP', browser: channel || 'chromium', baseline,
      viewports: reports.filter(r => /^live-\d/.test(r.label)).map(r => ({label: r.label, headerHeight: r.head.height, stageHeight: r.stage.height})),
      pip: reports.find(r => r.label === 'native-document-pip')}, null, 2));
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});

'use strict';
// Real browser Document PiP and JPEG decode with synthetic Native bridge frames.
// Every network request is intercepted; no real account, RTC broadcast or audio.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const checkControlsFade = require('./helpers/player-controls-fade.cjs');
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
      if (['/web-native-live.js', '/web-live-pip.js', '/web-live-controls.js', '/web-live-chat-probe.js'].includes(url.pathname)) {
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
  await page.waitForFunction(sequence => nativeFixtureAcks.includes(sequence), sequence, {polling: 25});
}

(async () => {
  const browser = await chromium.launch({headless: process.env.PLAYWRIGHT_HEADLESS !== 'false', ...(channel ? {channel} : {})});
  try {
    for (const viewport of [{width: 1920, height: 980}, {width: 1440, height: 900}, {width: 1366, height: 768}, {width: 768, height: 1024}, {width: 390, height: 844}, {width: 360, height: 640}, {width: 320, height: 568}]) {
      const fixture = await openFixture(browser, viewport), {context, page, errors, externalRequests} = fixture;
      assert.deepEqual(await page.locator('[data-live-center-mode]').allTextContents(), ['LIVE', 'Replay', 'Channel']);
      await measure(page, 'live-' + viewport.width + 'x' + viewport.height);
      if (!baseline && viewport.width === 1440) {
        const before = await page.locator('.video-loading-ring').evaluate(el => getComputedStyle(el).transform);
        await page.waitForTimeout(180);
        const after = await page.locator('.video-loading-ring').evaluate(el => ({transform: getComputedStyle(el).transform,
          animations: el.getAnimations().map(animation => animation.playState)}));
        assert.notEqual(before, after.transform, 'LIVE connection spinner actually rotates over time');
        assert.deepEqual(after.animations, ['running']);
        reports.push({label: 'live-spinner', rotating: true, before, after: after.transform});
      }
      if(!baseline){
        const controls=page.locator('.live-player-controls');assert.equal(await controls.count(),1);
        assert.equal(await controls.locator('#livePipBtn svg').count(),1,'LIVE PiP is a stable bottom icon');assert.equal(await page.locator('.live-head #livePipBtn').count(),0);
        assert.equal(await controls.locator('.mvc-seek,.mvc-rate,.video-quality-select').count(),0,'live playback has no invented seek, speed or quality control');
        const ring=await page.locator('#livePlayerLoading .video-loading-ring').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.live-stage').getBoundingClientRect(),css=getComputedStyle(el);return {w:parseFloat(css.width),h:parseFloat(css.height),x:a.x+a.width/2,y:a.y+a.height/2,cx:b.x+b.width/2,cy:b.y+b.height/2};});
        assert.ok(Math.abs(ring.w-ring.h)<.1&&Math.abs(ring.x-ring.cx)<1&&Math.abs(ring.y-ring.cy)<1,'LIVE loading ring is circular and centered');
        await page.evaluate(async()=>{setActiveAuth('synthetic-session','synthetic-device','synthetic-account');resolveAgoraJoinArgs=()=>{};state.live.room.encryptionKey='x'.repeat(64);state.live.room.encryptionSalt='synthetic';await connectAgoraLive();});
        await sendFrame(page,1);await page.locator('#livePlayerLoading').waitFor({state:'hidden'});await page.locator('#livePipBtn').waitFor({state:'visible'});
        assert.equal(await controls.locator('.live-web-volume').isVisible(),false,'Native audio has no fake browser mute control');
        await page.evaluate(()=>{window.liveControlsNode=document.querySelector('.live-player-controls');window.livePipIcon=document.querySelector('#livePipBtn svg');});
        await controls.locator('summary').click();await controls.locator('[data-live-control="right"]').click();
        const fits=async()=>{const box=await page.locator('#liveVideoGrid').evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.live-stage').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,sl:s.left,st:s.top,sr:s.right,sb:s.bottom};});assert.ok(box.left>=box.sl-1&&box.top>=box.st-1&&box.right<=box.sr+1&&box.bottom<=box.sb+1,'rotated LIVE pixels stay in the viewport');};
        await fits();for(let sequence=2;sequence<=7;sequence++)await sendFrame(page,sequence);
        assert.equal(await page.evaluate(()=>window.liveControlsNode===document.querySelector('.live-player-controls')&&window.livePipIcon===document.querySelector('#livePipBtn svg')),true,'received frames cannot rebuild controls or the PiP icon');
        await page.keyboard.press('Escape');assert.equal(await controls.locator('details').evaluate(el=>el.open),false);
        await controls.locator('[data-live-control="full"]').click();await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('live-player-stage'));await fits();
        await page.locator('#liveVideoGrid').hover({force:true});assert.equal(await controls.isVisible(),true);await controls.locator('summary').click();await controls.locator('.mvc-popover').waitFor({state:'visible'});
        const popup=await controls.locator('.mvc-popover').boundingBox();assert.ok(popup.x>=10&&popup.y>=10&&popup.x+popup.width<=viewport.width-10&&popup.y+popup.height<=viewport.height-10,'LIVE settings stay inside fullscreen');
        if(output)await page.screenshot({path:path.join(output,`live-controls-fullscreen-${viewport.width}x${viewport.height}.png`)});
        await controls.locator('[data-live-control="left"]').click();await fits();await page.keyboard.press('Escape');assert.ok(await page.evaluate(()=>!!document.fullscreenElement),'Escape closes settings before fullscreen');
        await controls.locator('[data-live-control="full"]').click();await page.waitForFunction(()=>!document.fullscreenElement);
        await page.evaluate(async()=>{await stopLivePlayback({clearRoom:true});});await page.waitForTimeout(550);assert.equal(await controls.count(),0,'stop cleans the UI without observer remount');
        await page.evaluate(()=>{state.live.config={isStreaming:true,liveRoomId:'fixture-room'};state.live.currentLiveRoomId='fixture-room';state.live.room={id:'fixture-room',title:'따르르르릉',startedAt:'2026-10-14T14:27:00Z'};renderLiveView();});
        reports.push({label:`live-controls-${viewport.width}`,synthetic:true,loading:true,rotation:true,fullscreen:true,stableNativeAck:true,stopCleanup:true});
      }
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
    if(!baseline){
      const {context,page,errors}=await openFixture(browser,{width:844,height:390});
      await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.getContext('2d').fillRect(0,0,640,360);const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=canvas.captureStream(5);document.getElementById('liveVideoGrid').append(video);window.fixtureVolumes=[];state.live.client={connectionState:'CONNECTED',remoteUsers:[{audioTrack:{setVolume:v=>fixtureVolumes.push(v)}}],removeAllListeners(){},leave:async()=>{}};await video.play();});
      await page.locator('#livePlayerLoading').waitFor({state:'hidden'});await page.locator('.live-web-volume').waitFor({state:'visible'});
      await checkControlsFade(page,page.locator('.live-player-controls'),page.locator('.live-stage'),{touch:true,outsideQuiet:true});
      await page.locator('[data-live-control="sound"]').click();assert.equal(await page.evaluate(()=>fixtureVolumes.at(-1)),0);
      await page.locator('.live-player-controls .mvc-volume').evaluate(el=>{el.value='.4';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>fixtureVolumes.at(-1)),40);
      await page.evaluate(()=>state.live.client.connectionState='RECONNECTING');await page.locator('#livePlayerLoading').waitFor({state:'visible'});
      await page.evaluate(()=>state.live.client.connectionState='CONNECTED');await page.locator('#livePlayerLoading').waitFor({state:'hidden'});
      await page.evaluate(()=>{state.live.client.connectionState='DISCONNECTED';liveStatusText('합성 연결 오류',true);});assert.equal(await page.locator('#livePlayerLoading').isVisible(),false);assert.equal(await page.locator('.live-foot').isVisible(),true);await page.locator('.live-player-error').waitFor({state:'visible'});await page.locator('#liveVideoGrid').hover({force:true});await page.locator('[data-live-control="full"]').click();await page.waitForFunction(()=>!!document.fullscreenElement);assert.equal(await page.locator('.live-player-error').isVisible(),true,'terminal errors remain visible inside fullscreen');await page.evaluate(()=>document.exitFullscreen());
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.locator('.live-player-controls').count(),0);
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));assert.equal(await page.locator('.live-player-controls').count(),1,'BFCache presentation restoration does not duplicate controls');
      assert.deepEqual(errors,[]);await context.close();reports.push({label:'web-live-controls',synthetic:true,actualBrowserVideo:true,sdkVolumeRouting:true,reconnect:true});
    }
    if (!baseline) {
      const {context, page, errors} = await openFixture(browser, {width: 1440, height: 900}, true);
      await page.evaluate(async () => {
        setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account');
        resolveAgoraJoinArgs = () => {};
        state.live.room.encryptionKey = 'x'.repeat(64); state.live.room.encryptionSalt = 'synthetic';
        await connectAgoraLive();
      });
      await sendFrame(page, 1);
      await page.evaluate(() => document.addEventListener('enterpictureinpicture', event => {
        window.pipFixtureDimensions = {width: event.pictureInPictureWindow.width, height: event.pictureInPictureWindow.height};
      }, true));
      await page.locator('#livePipBtn').click();
      await page.waitForFunction(() => document.pictureInPictureElement?.id === 'livePipVideo');
      const pip = await page.evaluate(() => {
        const video = document.pictureInPictureElement;
        window.pipFixtureTrack = video.srcObject.getVideoTracks()[0];
        return {width: video.videoWidth, height: video.videoHeight, muted: video.muted,
          audioTracks: video.srcObject.getAudioTracks().length, trackCount: video.srcObject.getTracks().length,
          sourcePreserved: document.getElementById('nativeLiveVideo').parentElement.id === 'liveVideoGrid',
          documentWindow: !!window.documentPictureInPicture?.window};
      });
      assert.deepEqual(pip, {width: 640, height: 360, muted: true, audioTracks: 0, trackCount: 1,
        sourcePreserved: true, documentWindow: false});
      const windowDimensions = await page.evaluate(() => pipFixtureDimensions);
      assert.ok(Math.abs(windowDimensions.width / windowDimensions.height - 16 / 9) < 0.04, 'actual PiP window uses landscape video aspect');
      await sendFrame(page, 2);
      const before = await page.locator('#livePipVideo').evaluate(video => video.getVideoPlaybackQuality().totalVideoFrames);
      const coveringTab = await context.newPage(); await coveringTab.goto('about:blank'); await coveringTab.bringToFront();
      const openerHidden = await page.evaluate(() => document.visibilityState === 'hidden');
      const openerFocused = await page.evaluate(() => document.hasFocus());
      let openerWindowState = 'not-measured';
      let windowSession, openerWindowId;
      if (process.env.PLAYWRIGHT_HEADLESS === 'false') {
        windowSession = await context.newCDPSession(page);
        openerWindowId = (await windowSession.send('Browser.getWindowForTarget')).windowId;
        await windowSession.send('Browser.setWindowBounds', {windowId: openerWindowId, bounds: {windowState: 'minimized'}});
        openerWindowState = (await windowSession.send('Browser.getWindowBounds', {windowId: openerWindowId})).bounds.windowState;
        assert.equal(openerWindowState, 'minimized', 'isolated test browser opener is actually minimized');
      }
      // Chromium can keep a document with active video PiP "visible". Freeze
      // opener rAF explicitly so capture cannot accidentally depend on it.
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      for (let sequence = 3; sequence <= 18; sequence++) await sendFrame(page, sequence);
      await page.waitForFunction(before => document.getElementById('livePipVideo').getVideoPlaybackQuality().totalVideoFrames >= before + 5, before, {polling: 50});
      const after = await page.locator('#livePipVideo').evaluate(video => video.getVideoPlaybackQuality().totalVideoFrames);
      if (windowSession) {
        await windowSession.send('Browser.setWindowBounds', {windowId: openerWindowId, bounds: {windowState: 'normal'}});
        await windowSession.detach();
      }
      await coveringTab.close(); await page.bringToFront();
      const pixels = await page.locator('#livePipVideo').evaluate(video => {
        // Element screenshots show the browser's "playing in PiP" placeholder.
        // Sample the real decoded stream; this is not an OS-window screenshot.
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
        const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0);
        return {left: [...ctx.getImageData(10, 180, 1, 1).data], center: [...ctx.getImageData(320, 180, 1, 1).data], png: canvas.toDataURL('image/png')};
      });
      assert.ok(pixels.left.slice(0, 3).every(value => value < 3), 'portrait source is letterboxed');
      assert.ok(pixels.center.slice(0, 3).some(value => value > 30), 'actual decoded PiP stream contains video pixels');
      if (output) fs.writeFileSync(path.join(output, 'synthetic-captured-video-' + (channel || 'chromium') + '.png'), Buffer.from(pixels.png.split(',')[1], 'base64'));
      await page.evaluate(() => document.exitPictureInPicture());
      await page.waitForFunction(() => !document.getElementById('livePipVideo'));
      assert.equal(await page.evaluate(() => pipFixtureTrack.readyState), 'ended');
      await sendFrame(page, 19);
      await page.locator('#livePipBtn').click();
      await page.waitForFunction(() => !!document.pictureInPictureElement);
      await page.evaluate(async () => { await stopLivePlayback(); });
      await page.waitForFunction(() => !document.pictureInPictureElement && !document.getElementById('livePipVideo'));
      assert.deepEqual(errors, []);
      reports.push({label: 'native-video-pip', synthetic: true, actualBrowserVideoPip: true, ...pip,
        apiWindowDimensions: windowDimensions, decodedPixels: {left: pixels.left, center: pixels.center},
        openerHidden, openerFocused, openerWindowState, openerAnimationFrameFrozen: true,
        framesPresentedWithOpenerRafFrozen: after - before, acks: await page.evaluate(() => nativeFixtureAcks.length),
        closeStopsCaptureTrack: true, stopClosesPip: true, authenticatedMedia: false});
      await context.close();
    }
    if (!baseline) {
      const {context, page, errors, externalRequests} = await openFixture(browser, {width: 1440, height: 900}, true);
      await page.evaluate(async () => {
        // Retain the original Document PiP path when canvas/video PiP is unavailable.
        HTMLCanvasElement.prototype.captureStream = undefined;
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
    console.log(JSON.stringify({checks: 'LIVE layout / rotating spinner / JPEG video PiP and Document fallback', browser: channel || 'chromium', baseline,
      viewports: reports.filter(r => /^live-\d/.test(r.label)).map(r => ({label: r.label, headerHeight: r.head.height, stageHeight: r.stage.height})),
      videoPip: reports.find(r => r.label === 'native-video-pip'), pip: reports.find(r => r.label === 'native-document-pip')}, null, 2));
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});

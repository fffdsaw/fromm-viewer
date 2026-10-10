'use strict';
// Real pointer gestures and local MP4 decoding; service responses are synthetic.
const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const output = process.env.CHANNEL_SCREENSHOT_DIR;
const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'fromm-selection-gestures-'));
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#34435e"/><circle cx="320" cy="200" r="100" fill="#9c6473"/><text x="320" y="370" text-anchor="middle" fill="white" font-size="28">GESTURE TEST IMAGE</text></svg>';
async function settled(page) {await page.waitForFunction(() => !downloadClickGesture || downloadClickGesture.applied);}
async function selection(page, posts = false) {return page.evaluate(posts => [...(posts ? state.postSelected : state.selected)].sort(), posts);}
async function shot(page, name) {
  if (!output) return;
  fs.mkdirSync(output, {recursive: true}); await page.screenshot({path: path.join(output, name + '.png')});
}
(async () => {
  for (const [name, size] of [['landscape', '640x360'], ['portrait', '360x640']]) {
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=12`, '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(fixtures, name + '.mp4')]);
  }
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900}, isMobile: mobile, hasTouch: mobile});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {window.Hls = class {
        static isSupported() {return true;} static Events = {MANIFEST_PARSED: 'ready', ERROR: 'error'};
        static ErrorTypes = {NETWORK_ERROR: 'network', MEDIA_ERROR: 'media'};
        loadSource() {} attachMedia() {} on() {} destroy() {}
      };});
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        const json = data => route.fulfill({contentType: 'application/json', body: JSON.stringify({success: true, data})});
        if (url.hostname === 'viewer.test') {
          if (url.pathname.endsWith('.js')) return route.fulfill({contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'web-native-live.js'))});
          return route.fulfill({contentType: 'text/html', body: html});
        }
        if (url.hostname === 'cdn.example') {
          const headers = {'access-control-allow-origin': '*'};
          if (url.pathname.endsWith('.mp4')) return route.fulfill({headers, contentType: 'video/mp4', body: fs.readFileSync(path.join(fixtures, url.pathname.includes('portrait') ? 'portrait.mp4' : 'landscape.mp4'))});
          if (url.pathname.endsWith('.m3u8')) return route.fulfill({headers, contentType: 'application/vnd.apple.mpegurl', body: '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nsegment.ts\n#EXT-X-ENDLIST'});
          return route.fulfill({headers, contentType: 'image/svg+xml', body: svg});
        }
        if (url.hostname.endsWith('frommyarti.com')) {
          if (url.pathname.startsWith('/media/posts/')) {
            const id = url.pathname.split('/').at(-1);
            return json({post: {id, type: id.startsWith('r') ? 'live_record' : 'video', isVisible: true, title: '테스트 영상', url: `https://cdn.example/${id.startsWith('r') ? 'replay.m3u8' : 'landscape.mp4'}`}});
          }
          return json({posts: [], isLast: true, channels: [], liveRooms: []});
        }
        return route.abort();
      });
      await page.goto('http://viewer.test/index.html');
      await page.evaluate(() => {
        setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account'); hideLoginGate();
        state.room = {id: 'artist-a', hostChatRoomId: 'artist-a', host: {nick: '테스트 아티스트'}};
        state.messages = Array.from({length: 120}, (_, i) => ({messageId: `p${i}`, userType: 'star', type: 'image', content: 'https://cdn.example/photo.svg', createdAt: 1791586800000 + i * 1000}));
        state.messages.push(...['landscape', 'portrait'].map((id, i) => ({messageId: id, userType: 'star', type: 'video', content: `https://cdn.example/${id}.mp4`, thumbnail: 'https://cdn.example/photo.svg', createdAt: 1791586799000 - i * 1000})));
        state.chatMessages = [...state.messages]; state.hasMoreMessages = false; state.chatHistoryComplete = true;
        state.chunkSize = 8; state.initialChunks = 2;
        buildMediaSequences(); state.filter = 'image'; syncLiveToolbarControls(); render();
      });
      const photos = page.locator('.media-card img');
      await photos.first().waitFor();
      assert.equal(await photos.first().evaluate(img => getComputedStyle(img).cursor), 'default');
      assert.equal(await photos.first().evaluate(img => img.draggable), false);
      await photos.nth(2).click(); await settled(page);
      for (const index of [0, 2]) {
        const before = await selection(page);
        await photos.nth(index).dblclick(); await page.locator('#imageLightbox.open').waitFor();
        assert.equal(await page.locator('#lightboxImage').evaluate(img => getComputedStyle(img).cursor), 'default');
        assert.deepEqual(await selection(page), before, 'unselected and selected previews keep selection');
        await page.locator('#lightboxClose').click();
      }
      // A slow system-recognized double click may arrive after the selection delay.
      const beforeSlow = await selection(page);
      await photos.first().click(); await settled(page);
      const box = await photos.first().boundingBox();
      await page.mouse.move(box.x + 30,box.y + 30);
      await page.mouse.down({clickCount:2});await page.mouse.up({clickCount:2});
      await page.locator('#imageLightbox.open').waitFor();
      assert.deepEqual(await selection(page), beforeSlow, 'late double click reverses only its first click');
      await page.locator('#lightboxClose').click();
      const beforeRange = await selection(page);
      await photos.nth(4).dblclick({modifiers: ['Shift']});
      assert.deepEqual(await selection(page), beforeRange, 'Shift double click does not select a range');
      await page.locator('#lightboxClose').click();
      await page.evaluate(() => {state.filter = 'all'; syncLiveToolbarControls(); render(); scrollTo(0, 0);});
      const beforeChat = await selection(page);
      assert.equal(await page.locator('.media-wrap img').first().evaluate(img => getComputedStyle(img).cursor), 'default');
      await page.locator('.media-wrap img').first().dblclick();
      assert.deepEqual(await selection(page), beforeChat, 'chat photo preview keeps selection');
      await page.locator('#lightboxClose').click();
      if(!mobile){
        await page.locator('.media-wrap').first().scrollIntoViewIfNeeded();
        const timeline=await page.locator('#timeline').boundingBox(),media=await page.locator('.media-wrap').first().boundingBox();
        await page.mouse.move(timeline.x+timeline.width-5,media.y+10);await page.mouse.down();
        await page.mouse.move(media.x+10,media.y+media.height-10,{steps:6});
        await page.waitForFunction(()=>!!document.querySelector('.download-selection-box'));
        assert.equal((await selection(page)).length,1,'chat media can be selected from blank margin');
        await page.keyboard.press('Escape');await page.mouse.up();
        assert.deepEqual(await selection(page),beforeChat);
        await page.mouse.move(media.x+30,media.y+30);await page.mouse.down();
        await page.mouse.move(media.x+90,media.y+90,{steps:6});
        await page.waitForFunction(()=>!!document.querySelector('.download-selection-box'));
        assert.equal((await selection(page)).length,1,'chat photo-origin drag selects');
        await page.keyboard.press('Escape');await page.mouse.up();
        assert.deepEqual(await selection(page),beforeChat);
      }
      for (const id of ['landscape', 'portrait']) {
        await page.evaluate(() => {state.filter = 'video'; syncLiveToolbarControls(); render(); scrollTo(0, 0);});
        const card = page.locator(`[data-message-id="${id}"]`), video = card.locator('video');
        await video.waitFor();
        const beforeVideo = await selection(page);
        await video.dblclick({position: {x: 60, y: 30}});
        await page.waitForFunction(() => document.querySelector('#lightboxVideo').currentTime > 0.1);
        assert.deepEqual(await selection(page), beforeVideo, 'video double click keeps selection');
        const geometry = await page.locator('#lightboxVideo').evaluate(v => {
          const r = v.getBoundingClientRect(); return {bottom: r.bottom, top: r.top, height: innerHeight, fit: getComputedStyle(v).objectFit, controls: v.controls, width: v.videoWidth, videoHeight: v.videoHeight};
        });
        assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.height);
        assert.equal(geometry.fit, 'contain'); assert.equal(geometry.controls, true);
        assert.equal(geometry.width, id === 'portrait' ? 360 : 640);
        await shot(page, `video-preview-${id}-${mobile ? 'mobile' : 'desktop'}`);
        await page.locator('#lightboxVideo').evaluate(v => v.pause());
        await page.locator('#lightboxClose').click();
        assert.equal(await page.locator('#lightboxVideo').getAttribute('src'), null);
        await video.click({position: {x: 60, y: 30}}); await settled(page);
        assert.equal((await selection(page)).includes(id), !beforeVideo.includes(id), 'video picture single click selects');
        const selectedAfterClick = await selection(page), rect = await video.boundingBox();
        await video.click({position: {x: 25, y: rect.height - 20}});
        assert.deepEqual(await selection(page), selectedAfterClick, 'native video controls do not select');
      }
      if (!mobile) {
        await page.evaluate(() => {state.filter = 'image'; state.selected.clear(); state.selectionAnchor = null; syncLiveToolbarControls(); render(); scrollTo(0, 0);});
        const cards = page.locator('.media-card'); await cards.nth(5).waitFor();
        const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
        await page.evaluate(()=>{window.nativeImageDrags=0;document.addEventListener('dragstart',()=>window.nativeImageDrags++);});
        const photoStart={x:first.x+30,y:first.y+30};
        await page.mouse.move(photoStart.x,photoStart.y);await page.mouse.down();
        assert.equal(await page.locator('.download-selection-box').count(),0,'photo press alone does not start drag');
        await page.mouse.move(photoStart.x+2,photoStart.y+2);await page.mouse.up();await settled(page);
        assert.equal((await selection(page)).length,1,'tiny movement still allows single click');
        await page.evaluate(()=>{state.selected.clear();syncDownloadSelection();});
        await page.mouse.move(photoStart.x,photoStart.y);await page.mouse.down();
        await page.mouse.move(second.x+second.width-30,first.y+120,{steps:8});
        await page.waitForFunction(()=>state.selected.size===2);
        await shot(page,'photo-origin-region-desktop');await page.mouse.up();await settled(page);
        assert.equal((await selection(page)).length,2,'drag release does not toggle the last photo');
        assert.equal(await page.locator('#imageLightbox.open').count(),0,'photo drag does not open preview');
        assert.equal(await page.evaluate(()=>window.nativeImageDrags),0,'photo drag is not native image dragging');
        await page.mouse.move(photoStart.x,photoStart.y);await page.mouse.down();
        await page.mouse.move(second.x+30,895,{steps:10});
        await page.waitForFunction(()=>scrollY>700&&state.selected.size>=6&&state.infiniteRendered>16);
        await shot(page,'photo-origin-auto-scroll-desktop');await page.mouse.up();
        assert.equal(await page.locator('#imageLightbox.open').count(),0);
        assert.equal(await page.evaluate(()=>window.nativeImageDrags),0);
        await page.evaluate(()=>{scrollTo(0,0);state.selected.clear();syncDownloadSelection();});
        const start = {x: first.x + 10, y: first.y + first.height + 7};
        const end = {x: second.x + second.width - 10, y: first.y + 10};
        async function beginDrag(expected=2) {
          await page.mouse.move(start.x, start.y); await page.mouse.down();
          await page.mouse.move(end.x, end.y, {steps: 8});
          await page.waitForFunction(expected => state.selected.size === expected,expected);
        }
        await beginDrag(); await shot(page, 'drag-region-desktop'); await page.mouse.up();
        assert.equal((await selection(page)).length, 2);
        const beforeCancel = await selection(page);
        await page.mouse.move(start.x, start.y); await page.mouse.down();
        await page.mouse.move(first.x + first.width - 10, first.y + 10, {steps: 4});
        await page.keyboard.press('Escape'); await page.mouse.up();
        assert.deepEqual(await selection(page), beforeCancel, 'Escape restores original selection');
        await page.evaluate(() => {state.selected.clear();syncDownloadSelection();});
        await cards.nth(5).click(); await settled(page);
        const beforeAdd = await selection(page);
        await page.keyboard.down('Control'); await beginDrag(3); await page.mouse.up(); await page.keyboard.up('Control');
        const afterAdd=await selection(page);
        assert.ok(beforeAdd.every(key=>afterAdd.includes(key)), 'Ctrl drag retains existing selections');
        assert.equal(afterAdd.length,3,'Ctrl drag adds the two intersected cards');
        await page.mouse.move(start.x,start.y);await page.mouse.down();
        await page.mouse.move(end.x,end.y);
        await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel')));
        await page.mouse.up();assert.deepEqual(await selection(page),afterAdd,'pointer cancellation restores selection');
        await page.mouse.move(start.x, start.y); await page.mouse.down();
        await page.mouse.move(end.x, 895, {steps: 10});
        await page.waitForFunction(() => scrollY > 700 && state.selected.size >= 6 && state.infiniteRendered>16);
        await shot(page, 'drag-auto-scroll-desktop'); await page.mouse.up();
        const afterDrag = await selection(page);
        await page.mouse.wheel(0, 450); assert.deepEqual(await selection(page), afterDrag, 'plain wheel after drag is not selection');
        assert.equal(await page.locator('.download-selection-box').count(), 0);
        const priorY=await page.evaluate(()=>scrollY),visibleCard=await cards.nth(12).boundingBox();
        // Start in the vertical grid gap at the current scroll position.
        const adjacent=await cards.nth(13).boundingBox();
        await page.mouse.move(visibleCard.x+visibleCard.width+7,Math.min(850,Math.max(160,visibleCard.y+20)));await page.mouse.down();
        await page.mouse.move(adjacent.x+30,100,{steps:5});
        await page.waitForFunction(priorY=>scrollY<priorY-100,priorY);await page.mouse.up();
        // A context change must end the drag without restoring another artist's selection.
        await page.evaluate(() => scrollTo(0, 0));
        await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y);
        await page.evaluate(() => {state.filter = 'sound'; render();});
        await page.waitForFunction(() => !document.querySelector('.download-selection-box')); await page.mouse.up();
      } else {
        await page.evaluate(() => {state.filter = 'image'; syncLiveToolbarControls(); render(); scrollTo(0, 0);});
        const beforeTouch = await selection(page);
        await page.locator('#timeline').dispatchEvent('pointerdown', {pointerType: 'touch', button: 0, pointerId: 8, clientX: 15, clientY: 500});
        assert.equal(await page.locator('.download-selection-box').count(), 0, 'touch cannot start marquee');
        await page.mouse.wheel(0, 500); assert.deepEqual(await selection(page), beforeTouch, 'mobile ordinary scrolling preserves selection');
      }
      await page.evaluate(() => {
        state.filter = 'live'; state.live.channelsLoaded = true; state.live.centerMode = 'channel';
        state.live.channels = [{id: 'a', channelName: '테스트 채널'}]; channelVideoState.channelId = 'a';
        const posts = [1, 2, 3].map(i => ({id: `v${i}`, type: 'video', title: '테스트 영상', _channelId: 'a', _channelName: '테스트 채널', thumbnail: {url: 'https://cdn.example/photo.svg'}, displayStartAt: 1791586800000 - i * 1000}));
        channelVideoState.pages.set('a', {posts, loaded: true, isLast: true});
        state.live.replayPosts = posts.map(p => ({...p, id: p.id.replace('v', 'r'), type: 'live_record'})); state.live.replayFilter = 'all'; renderLiveView(); scrollTo(0, 0);
      });
      for (const kind of ['channel', 'replay']) {
        if (kind === 'replay') await page.locator('[data-live-center-mode="replay"]').click();
        const cards = page.locator(`[data-download-selection-kind="${kind}"]`);
        await cards.first().locator('img').waitFor({state:'visible'});
        await page.waitForFunction(kind=>{
          const img=document.querySelector(`[data-download-selection-kind="${kind}"] img`);
          return img && getComputedStyle(img).cursor==='default';
        },kind);
        await cards.nth(1).locator('img').click(); await settled(page);
        const before = await selection(page, true);
        if(!mobile){
          const first=await cards.first().boundingBox();
          await page.mouse.move(first.x+first.width+7,first.y+10);await page.mouse.down();
          await page.mouse.move(first.x+20,first.y+first.height-10,{steps:5});
          assert.equal((await selection(page,true)).filter(key=>key.startsWith(`["${kind}"`)).length,1,`${kind} marquee selection`);
          await page.keyboard.press('Escape');await page.mouse.up();
          assert.deepEqual(await selection(page,true),before,`${kind} marquee cancellation`);
          await page.mouse.move(first.x+30,first.y+30);await page.mouse.down();
          await page.mouse.move(first.x+90,first.y+90,{steps:5});
          assert.equal((await selection(page,true)).filter(key=>key.startsWith(`["${kind}"`)).length,1,`${kind} thumbnail-origin drag`);
          await page.keyboard.press('Escape');await page.mouse.up();
          assert.deepEqual(await selection(page,true),before);
        }
        await cards.first().locator('img').dblclick();
        await page.locator(kind === 'channel' ? '#channelVideo' : '#replayVideo').waitFor();
        assert.deepEqual(await selection(page, true), before, `${kind} double click opens without selection`);
        await page.locator(kind === 'channel' ? '#channelBackToList' : '#replayBackToList').click();
      }
      await page.evaluate(()=>{state.filter='image';syncLiveToolbarControls();render();scrollTo(0,0);});
      await page.locator('.media-card img').first().click();
      await page.evaluate(()=>forgetSavedAuth());
      await settled(page);
      assert.equal((await selection(page)).length,0,'logout invalidates a pending single click');
      assert.deepEqual(errors, []);
      console.log(`${mobile ? 'Mobile' : 'Desktop'}: default photo cursor, photo/card-origin drag and auto-scroll, double-click invariants, real MP4 preview, controls, drag/scroll/cancel PASS`);
      await context.close();
    }
  } finally {
    await browser.close();
    if (path.dirname(fixtures) === os.tmpdir() && path.basename(fixtures).startsWith('fromm-selection-gestures-')) fs.rmSync(fixtures, {recursive: true});
  }
})().catch(e => {console.error(e); process.exitCode = 1;});

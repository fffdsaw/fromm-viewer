'use strict';
// Real local MP4 decoding in the production UI; Fromm API responses are fixtures.
// Requires Playwright and ffmpeg. No real login, CDN, or LIVE service is exercised.
const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(process.env.CHANNEL_BASELINE_HTML || path.join(root, 'index.html'), 'utf8');
const baseline = !!process.env.CHANNEL_BASELINE_HTML;
const output = process.env.CHANNEL_SCREENSHOT_DIR;
const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'fromm-channel-layout-'));
const sizes = {landscape: '640x360', portrait: '360x640'};
const upload = id => ({id, type: 'video', title: `${id === 'portrait' ? '세로' : '가로'} 영상 · 긴 제목이 있는 Channel 플레이어 화면 검증`, displayStartAt: 1791534600000, isVisible: true});
const reports = [];
function makeFixtures() {
  for (const [id, size] of Object.entries(sizes)) {
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=12`, '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(fixtures, `${id}.mp4`)]);
  }
}
async function measure(page, label) {
  const geometry = await page.evaluate(() => {
    const rect = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height};
    };
    const video = document.querySelector('#channelVideo');
    const style = getComputedStyle(video);
    return {viewport: {width: innerWidth, height: innerHeight}, scrollY,
      scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth,
      player: rect('.channel-player'), video: rect('#channelVideo'), head: rect('.channel-player .replay-page-head'),
      intrinsic: {width: video.videoWidth, height: video.videoHeight}, objectFit: style.objectFit,
      controls: video.controls, currentTime: video.currentTime, paused: video.paused};
  });
  reports.push({label, ...geometry});
  if (output) {
    fs.mkdirSync(output, {recursive: true});
    await page.screenshot({path: path.join(output, `${baseline ? 'before-' : ''}${label}.png`)});
    fs.writeFileSync(path.join(output, `${baseline ? 'before-' : ''}channel-player-layout.json`), JSON.stringify(reports, null, 2));
  }
  if (!baseline) {
    assert.equal(geometry.scrollY, 0, `${label}: no scroll needed on open/resize`);
    assert.ok(geometry.video.top >= geometry.head.bottom - 1, `${label}: video below title`);
    assert.ok(geometry.player.bottom <= geometry.viewport.height - 8, `${label}: player bottom inside viewport`);
    assert.ok(geometry.video.bottom <= geometry.viewport.height - 8, `${label}: native controls inside viewport`);
    assert.ok(geometry.video.height >= 60, `${label}: visible video/control area`);
    assert.ok(geometry.scrollHeight <= geometry.viewport.height + 1, `${label}: no vertical overflow`);
    assert.ok(geometry.scrollWidth <= geometry.viewport.width, `${label}: no horizontal overflow`);
    assert.equal(geometry.objectFit, 'contain');
    assert.equal(geometry.controls, true);
    assert.ok(geometry.currentTime > 0, `${label}: decoded video advances`);
    assert.equal(geometry.paused, false);
  }
}
(async () => {
  makeFixtures();
  const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {})});
  try {
    const viewports = baseline ? [{width: 1920, height: 980}] : [
      {width: 1920, height: 980}, {width: 1440, height: 900}, {width: 1366, height: 768},
      {width: 1280, height: 600}, {width: 768, height: 1024}, {width: 390, height: 844},
      {width: 360, height: 640}, {width: 844, height: 390}, {width: 650, height: 600},
      {width: 667, height: 375}, {width: 740, height: 360}, {width: 568, height: 320},
    ];
    for (const viewport of viewports) {
      const mobile = viewport.width <= 700 || viewport.height <= 500;
      const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        const json = data => route.fulfill({contentType: 'application/json', body: JSON.stringify({success: true, data})});
        if (url.hostname === 'viewer.test') {
          if (url.pathname.endsWith('.mp4')) return route.fulfill({contentType: 'video/mp4', body: fs.readFileSync(path.join(fixtures, path.basename(url.pathname)))});
          if (url.pathname.endsWith('.js')) return route.fulfill({contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'web-native-live.js'))});
          return route.fulfill({contentType: 'text/html', body: html});
        }
        if (url.hostname.endsWith('frommyarti.com')) {
          if (url.pathname === '/channels') return json({channels: [{id: 'a', channelName: 'OH MY GIRL', isSubscribed: true}, {id: 'b', channelName: 'fromis_9', isSubscribed: true}]});
          if (url.pathname === '/media/posts') return json({posts: Object.keys(sizes).map(upload), isLast: true});
          if (url.pathname.startsWith('/media/posts/')) {
            const id = url.pathname.split('/').at(-1);
            return json({post: {...upload(id), url: `http://viewer.test/${id}.mp4`}});
          }
          return json({liveRooms: []});
        }
        return route.abort();
      });
      await page.goto('http://viewer.test/index.html');
      await page.evaluate(() => {setActiveAuth('synthetic-session', 'synthetic-device', 'synthetic-account'); hideLoginGate(); state.filter = 'live'; renderLiveView();});
      await page.locator('[data-live-center-mode="channel"]').click();
      await page.locator('[data-channel-video-play="landscape"]').waitFor();
      for (const id of Object.keys(sizes)) {
        await page.locator(`[data-channel-video-play="${id}"]`).click();
        await page.waitForFunction(() => document.querySelector('#channelVideo')?.readyState >= 2);
        await page.evaluate(async () => {const v = document.querySelector('#channelVideo'); v.muted = true; await v.play();});
        await page.waitForFunction(() => document.querySelector('#channelVideo').currentTime > 0.1);
        const intrinsic = await page.locator('#channelVideo').evaluate(v => `${v.videoWidth}x${v.videoHeight}`);
        assert.equal(intrinsic, sizes[id], 'actual source ratio retained');
        if (baseline) await page.mouse.move(viewport.width / 2, viewport.height - 30);
        else await page.locator('#channelVideo').hover();
        await measure(page, `channel-player-${viewport.width}x${viewport.height}-${id}`);
        assert.ok(await page.locator('#channelDownloadCurrent').isVisible());
        if (!baseline && viewport.width === 1440 && id === 'landscape') {
          await page.setViewportSize({width: 1280, height: 600});
          await measure(page, 'channel-player-resized-1280x600');
          await page.setViewportSize(viewport);
          // A taller toolbar must reduce the stage without fixed pixel deductions.
          await page.evaluate(() => document.querySelector('.viewer-header .toolbar').style.paddingBottom = '60px');
          await measure(page, 'channel-player-taller-header');
          await page.evaluate(() => document.querySelector('.viewer-header .toolbar').style.paddingBottom = '');
        }
        if (!baseline) {
          await page.evaluate(() => document.querySelector('#channelVideo').pause());
          assert.equal(await page.locator('#channelVideo').evaluate(v => v.paused), true);
          await page.evaluate(async () => {const v = document.querySelector('#channelVideo'); v.currentTime = 1; await v.play();});
          await page.waitForFunction(() => document.querySelector('#channelVideo').currentTime > 1.1);
        }
        await page.locator('#channelBackToList').click();
        assert.equal(await page.locator('.channel-video-card').count(), 2);
        assert.equal(await page.locator('.main').evaluate(e => getComputedStyle(e).display), 'block', 'list returns to its ordinary scrolling layout');
      }
      assert.deepEqual(errors, []);
      console.log(`${viewport.width}x${viewport.height}: landscape/portrait decoded, player/controls fit, back to list PASS${baseline ? ' (baseline observations only)' : ''}`);
      await context.close();
    }
    if (output) fs.writeFileSync(path.join(output, `${baseline ? 'before-' : ''}channel-player-layout.json`), JSON.stringify(reports, null, 2));
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;}).finally(() => fs.rmSync(fixtures, {recursive: true, force: true}));

'use strict';
// Production UI, local video and synthetic metadata only. Never contacts Fromm.
const {chromium}=require('playwright');
const axe=require('axe-core');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-a11y-'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=12','-t','2','-c:v','libx264','-preset','ultrafast','-threads','1','-pix_fmt','yuv420p',path.join(temp,'landscape.mp4')]);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=360x640:rate=12','-t','2','-c:v','libx264','-preset','ultrafast','-threads','1','-pix_fmt','yuv420p',path.join(temp,'portrait.mp4')]);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=8000:cl=mono','-t','1','-c:a','pcm_s16le',path.join(temp,'sound.wav')]);
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const viewport of [{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  const mobile=viewport.width<900,context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='viewer.test')return route.abort();
   if(u.pathname==='/sound.wav')return route.fulfill({contentType:'audio/wav',body:fs.readFileSync(path.join(temp,'sound.wav'))});
   if(u.pathname==='/photo.svg')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#536477"/></svg>'});
   if(u.pathname.endsWith('.mp4'))return route.fulfill({contentType:'video/mp4',body:fs.readFileSync(path.join(temp,path.basename(u.pathname)))});
   const file=u.pathname.endsWith('.js')?path.basename(u.pathname):'index.html';return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file))});});
  await page.goto('https://viewer.test/');await page.addScriptTag({content:axe.source});
  const audit=async label=>{const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[],label+': WCAG rules');};
  await audit('login');
  await page.evaluate(()=>{hideLoginGate();state.room={id:'a',host:{nick:'Test'}};state.chatHistoryComplete=true;state.hasMoreMessages=false;state.filter='all';state.messages=[{messageId:'photo',type:'image',userType:'star',content:'https://viewer.test/photo.svg',createdAt:1791534600000},{messageId:'audio',type:'sound',userType:'star',content:'https://viewer.test/sound.wav',createdAt:1791534600000}];state.chatMessages=state.messages;buildMediaSequences();state.filter='media';render();});
  await audit('media');
  const audio=page.locator('.media-card audio');
  if(process.env.ACCESSIBILITY_SCREENSHOT_DIR){fs.mkdirSync(process.env.ACCESSIBILITY_SCREENSHOT_DIR,{recursive:true});await page.locator('.media-card:has(audio)').screenshot({path:path.join(process.env.ACCESSIBILITY_SCREENSHOT_DIR,`native-audio-${viewport.width}.png`)});}
  assert.equal(await audio.evaluate(e=>getComputedStyle(e).colorScheme),'dark','native audio follows dark theme');
  await page.mouse.click(1,1);await audio.evaluate(async e=>{e.muted=true;await e.play();});await page.waitForFunction(()=>document.querySelector('.media-card audio').currentTime>.05);await audio.evaluate(e=>e.pause());
  assert.equal(await audio.evaluate(e=>e.paused),true);assert.equal(await audio.evaluate(e=>e.controls),true,'native audio controls retained');
  await page.evaluate(()=>{state.filter='all';render();});
  await page.locator('#chatToolsBtn').click();await page.locator('#datePickerBtn').click();await audit('search calendar');await page.locator('#chatToolsBtn').click();
  await page.evaluate(()=>{state.filter='media';render();});
  const first=page.locator('.download-selection-toggle').first();await first.focus();await page.keyboard.press('Space');assert.equal(await first.getAttribute('aria-checked'),'true');await page.keyboard.press('Enter');assert.equal(await first.getAttribute('aria-checked'),'false');
  await page.evaluate(()=>{state.filter='live';state.live.centerMode='replay';state.live.channelsLoaded=true;state.live.channels=[{id:'a',channelName:'Test'}];state.live.replayPosts=Array.from({length:16},(_,i)=>({id:'r'+i,type:'live_record',title:'긴 영상 제목과 아티스트 이름이 두 줄에서 식별되는지 확인하는 Replay '+i,displayStartAt:1791534600000,_channelId:'a',_channelName:'Test'}));Object.assign(replayPagingFor('a'),{loaded:true,isLast:true});renderLiveView();});
  await page.evaluate(()=>window.scrollTo(0,0));await audit('Replay list');
  assert.equal(await page.locator('.replay-title').first().evaluate(e=>getComputedStyle(e).webkitLineClamp),'2');
  assert.equal(await page.locator('.live-center-tabs').getAttribute('role'),'group');
  await page.locator('[data-live-center-mode="replay"]').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.liveCenterMode),'channel');
  await page.locator('.download-selection-toggle').first().click();
  await page.evaluate(()=>{window.savedSelection=[...state.postSelected];state.live.replayListScrollY=250;window.scrollTo(0,250);window.savedFilter=state.live.replayFilter;});
  for(const kind of ['replay','channel'])for(const orientation of ['landscape','portrait']){
   await page.evaluate(({kind,orientation})=>{window.auditCleanup?.();const selected={id:'r0',title:'긴 제목도 최대 두 줄로 읽을 수 있는 영상 제목과 아티스트 이름',_channelId:'a',_channelName:'Test',displayStartAt:1791534600000};
    if(kind==='replay'){state.live.centerMode='replay';state.live.replaySelected=selected;renderLiveView();}
    else{state.live.replaySelected=null;state.live.centerMode='channel';channelVideoState.channelId='a';channelVideoState.pages.set('a',{loaded:true,isLast:true,posts:[selected]});channelVideoState.selected=selected;renderLiveView();}
    const stage=document.querySelector(kind==='replay'?'.replay-page-stage':'.channel-player-stage');stage.innerHTML=`<video id="auditVideo" muted playsinline src="/${orientation}.mp4"></video>`;const video=stage.querySelector('video');window.auditPlayer={kind,video,owner:window,variants:[{width:1920,height:1080,bandwidth:5000000},{width:1280,height:720,bandwidth:2000000}],selectedIndex:0};window.auditCleanup=installModernVideoControls(window.auditPlayer);updateVideoQualityUi(window.auditPlayer,'',{loading:false});},{kind,orientation});
   await page.waitForFunction(()=>document.querySelector('#auditVideo').readyState>=2);await page.waitForTimeout(100);
   const video=page.locator('#auditVideo'),stage=video.locator('..');
   await page.locator('.replay-page-download').focus();await page.keyboard.press('Tab');
   assert.equal(await stage.evaluate(e=>document.activeElement===e&&e.matches(':focus-visible')),true,'Tab enters video shortcut surface');
   const focus=await stage.evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)}));
   if(process.env.ACCESSIBILITY_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.ACCESSIBILITY_SCREENSHOT_DIR,`${kind}-${orientation}-${viewport.width}-focus.png`)});
   assert.ok(focus.style!=='none'&&focus.width>=2,'keyboard entry has a visible focus indicator');
   await page.mouse.click(1,1);assert.equal(await stage.evaluate(e=>e.matches(':focus-visible')),false,'pointer use does not leave a video focus ring');
   if(mobile){
    assert.equal(await page.locator('.viewer-header').isVisible(),false,'watch mode hides global navigation');
    for(const selector of ['[data-mvc="play"]','.mvc-settings summary','.mvc-pip','[data-mvc="full"]']){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.width>=44&&r.height>=44,selector+' touch size');}
    const boxes=await page.locator('.mvc-row .mvc-button').evaluateAll(els=>els.filter(e=>getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom};}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x+.5||b.right<=a.x+.5||a.bottom<=b.top+.5||b.bottom<=a.top+.5,'control hit areas do not overlap');}
    assert.ok((await page.locator('.mvc-seek').boundingBox()).height>=32);
    assert.ok(parseFloat(await page.locator('.mvc-time').evaluate(e=>getComputedStyle(e).fontSize))>=12);
   }
   const geometry=await stage.evaluate(e=>{const r=e.getBoundingClientRect(),v=e.querySelector('video');return {top:r.top,bottom:r.bottom,fit:getComputedStyle(v).objectFit,w:r.width,h:r.height,ratio:getComputedStyle(e).getPropertyValue('--mvc-aspect-ratio')};});
   assert.equal(geometry.fit,'contain');assert.ok(geometry.w>0&&geometry.h>=150);assert.ok(geometry.bottom<=viewport.height+1,JSON.stringify(geometry));
   if(process.env.ACCESSIBILITY_SCREENSHOT_DIR){fs.mkdirSync(process.env.ACCESSIBILITY_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ACCESSIBILITY_SCREENSHOT_DIR,`${kind}-${orientation}-${viewport.width}-normal.png`)});}
   await page.locator('.mvc-settings summary').click();await page.locator('[data-mvc="right"]').click();await page.waitForTimeout(100);
   const menu=await page.locator('.mvc-popover').boundingBox();assert.ok(menu&&menu.x>=0&&menu.y>=0&&menu.x+menu.width<=viewport.width+1&&menu.y+menu.height<=viewport.height+1,'settings fit');
   const trigger=await page.locator('.mvc-settings summary').boundingBox();assert.ok(menu.y+menu.height<=trigger.y-8,'settings never covers its own toggle');
   await page.locator('.mvc-settings summary').click();assert.equal(await page.locator('.mvc-settings').evaluate(e=>e.open),false,'settings can close with its own toggle after rotation');
   await page.locator('.mvc-settings summary').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.mvc-settings').evaluate(e=>e.open),false);
   assert.equal(await page.locator('.mvc-pip').evaluate(e=>!!e.closest('.mvc-settings')),false,'PiP remains separate');
   await audit(kind+' '+orientation);
   if(process.env.ACCESSIBILITY_SCREENSHOT_DIR){fs.mkdirSync(process.env.ACCESSIBILITY_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ACCESSIBILITY_SCREENSHOT_DIR,`${kind}-${orientation}-${viewport.width}.png`)});}
   await page.evaluate(()=>window.auditCleanup());
  }
  await page.evaluate(()=>{channelVideoState.selected=null;state.live.centerMode='replay';returnToReplayList();});await page.waitForTimeout(100);
  assert.equal(await page.locator('.viewer-header').isVisible(),true,'list navigation restored');
  assert.deepEqual(await page.evaluate(()=>[...state.postSelected]),await page.evaluate(()=>savedSelection));assert.equal(await page.evaluate(()=>state.live.replayFilter),await page.evaluate(()=>savedFilter));
  assert.equal(Math.round(await page.evaluate(()=>scrollY)),250,'list scroll restored');
  await page.evaluate(()=>{state.live.centerMode='live';state.live.config={isStreaming:true,liveRoomId:'fixture'};state.live.discoveryLoaded=true;renderLiveView();});
  await page.locator('.live-player-controls').waitFor();
  if(mobile){
   assert.equal(await page.locator('.viewer-header .toolbar').isVisible(),false,'LIVE hides only the extra global tools');
   for(const selector of ['[data-live-control="settings"]','.live-player-controls summary','[data-live-control="full"]','#livePipBtn']){
    const control=page.locator(selector);if(!await control.count()||!await control.isVisible())continue;
    const box=await control.boundingBox();assert.ok(box.width>=44&&box.height>=44,selector+' LIVE target');
   }
  }
  await audit('LIVE waiting controls');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');assert.deepEqual(errors,[]);
  console.log(`${viewport.width}x${viewport.height}: a11y, card keyboard, control geometry, both video orientations/rotation, settings and list restoration PASS`);
  await context.close();
 }
}finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});

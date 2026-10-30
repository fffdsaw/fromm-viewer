'use strict';
// Actual pointer/touch event order and MP4 playback, using the production controls.
// No Fromm API, account, credentials or remote media.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const checkControlsFade=require('./helpers/player-controls-fade.cjs');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-menu-'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=12','-t','12','-c:v','libx264','-preset','ultrafast','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',path.join(temp,'fixture.mp4')]);
const media=fs.readFileSync(path.join(temp,'fixture.mp4'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])for(const kind of ['replay','channel']){
   const mobile=viewport.width<700||viewport.height<500;
   const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   if(viewport.width===844)await page.addInitScript(()=>{Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value:undefined});});
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='viewer.test')return route.abort();
    if(u.pathname==='/fixture.mp4')return route.fulfill({body:media,contentType:'video/mp4'});
    return route.fulfill({body:fs.readFileSync(path.join(root,u.pathname.endsWith('.js')?path.basename(u.pathname):'index.html')),contentType:u.pathname.endsWith('.js')?'text/javascript':'text/html'});
   });
   await page.goto('https://viewer.test/');
   await page.evaluate(({kind,height})=>{
    hideLoginGate();const timeline=document.querySelector('#timeline');timeline.style.width='calc(100vw - 64px)';
    timeline.innerHTML=`<div class="${kind==='replay'?'replay-player-page':'channel-player'}" style="width:100%;flex:none"><div class="${kind==='replay'?'replay-page-stage':'channel-player-stage'}" style="flex:none;height:${Math.max(160,height-260)}px"><video id="menuTestVideo" muted playsinline loop src="/fixture.mp4"></video></div></div>`;
    const video=document.querySelector('video#menuTestVideo');video.muted=true;
    const player={kind,video,owner:window,variants:[{width:640,height:360,bandwidth:1000000}],selectedIndex:0};
    window.menuControlsCleanup=installModernVideoControls(player);updateVideoQualityUi(player,'',{loading:false});
   },{kind,height:viewport.height});
   const video=page.locator('#menuTestVideo'),settings=page.locator('.mvc-settings'),summary=settings.locator('summary');
   await video.evaluate(async v=>{await v.play();});await page.waitForFunction(()=>document.querySelector('#menuTestVideo').readyState>=2);
   if(viewport.width===1440||viewport.width===844){
    await checkControlsFade(page,page.locator('.modern-video-controls'),video.locator('..'),{touch:viewport.width===844,cancelTouch:kind==='channel',resetPlayback:async()=>{await video.evaluate(async v=>{v.currentTime=0;await v.play();});}});
    console.log(`${kind} ${viewport.width}: real fade, interaction hold/release and reduced motion PASS`);
   }
   const hitVideo=async()=>{
    // Popover placement and aspect sizing finish in toggle/ResizeObserver frames.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const point=await video.evaluate(v=>{
     const r=v.getBoundingClientRect();
     for(const fy of [.05,.2,.5,.8])for(const fx of [.05,.5,.9]){
      const x=r.x+r.width*fx,y=r.y+r.height*fy;
      if(x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)===v)return {x,y};
     }
     throw new Error('No exposed video point: '+JSON.stringify({video:r.toJSON(),stage:v.closest('.modern-video-stage').getBoundingClientRect().toJSON(),parent:v.parentElement.parentElement.getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],top:document.elementFromPoint(r.x+r.width/2,Math.max(0,r.y+10))?.className}));
    });
    if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   };
   const dismiss=async paused=>{
    await video.evaluate(async(v,paused)=>{if(paused)v.pause();else await v.play();},paused);
    await video.locator('..').hover({position:{x:5,y:5}});await summary.click();assert.equal(await settings.evaluate(el=>el.open),true);
    await hitVideo();await page.waitForFunction(()=>!document.querySelector('.mvc-settings').open);assert.equal(await settings.evaluate(el=>el.open),false,'surface click dismisses settings');
    assert.equal(await video.evaluate(v=>v.paused),paused,'dismissing the menu must preserve playback state');
   };
   await dismiss(false);await dismiss(true);
   await hitVideo();assert.equal(await video.evaluate(v=>v.paused),false,'a later ordinary click still plays');
   await hitVideo();assert.equal(await video.evaluate(v=>v.paused),true,'ordinary surface click still pauses');
   await video.locator('..').hover({position:{x:5,y:5}});await summary.click();await page.locator('[data-mvc="right"]').click();await hitVideo();
   assert.equal(await video.evaluate(v=>v.paused),true,'rotated surface dismissal keeps paused state');
   assert.equal(await video.evaluate(v=>v.closest('.modern-video-stage').style.getPropertyValue('--mvc-video-angle')),'90deg');
   await summary.click();await page.mouse.click(1,1);assert.equal(await settings.evaluate(el=>el.open),false,'outside-player click still dismisses');
   await summary.click();await page.keyboard.press('Escape');assert.equal(await settings.evaluate(el=>el.open),false);
   await summary.click();await page.locator('[data-mvc="play"]').click();
   assert.equal(await video.evaluate(v=>v.paused),false,'the explicit play button still acts while dismissing settings');
   assert.equal(await settings.evaluate(el=>el.open),false);
   if(viewport.width===1440){
    await page.locator('[data-mvc="full"]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await dismiss(false);await dismiss(true);
    await page.locator('[data-mvc="full"]').click();await page.waitForFunction(()=>!document.fullscreenElement);
   }
   await page.evaluate(()=>window.menuControlsCleanup());assert.equal(await page.locator('.modern-video-controls').count(),0);
   assert.deepEqual(errors,[]);console.log(`${kind} ${viewport.width}x${viewport.height}: playing/paused dismissal, normal clicks, rotation, Escape and cleanup PASS`);
   await context.close();
  }
 }finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

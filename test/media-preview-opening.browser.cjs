'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-preview-')),file=path.join(temp,'clip.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=10','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',file]);
 const server=await serve(),browser=await chromium.launch({headless:true});try{
  for(const width of [1440,390]){
   const {page,context,errors}=await open(browser,server.url,{width,height:900});let releaseImage,releaseVideo,imageRequests=0;
   const imageGate=new Promise(resolve=>releaseImage=resolve),videoGate=new Promise(resolve=>releaseVideo=resolve);
   await page.route('**/original-image.svg',async route=>{imageRequests++;await imageGate;await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600"><rect width="900" height="1600" fill="#6b8099"/></svg>'}).catch(()=>{});});
   await page.route('**/slow-preview.mp4',async route=>{await videoGate;await route.fulfill({contentType:'video/mp4',body:fs.readFileSync(file)}).catch(()=>{});});
   await page.evaluate(()=>{state.messages=[{messageId:'preview-image',type:'image',userType:'star',content:'https://fixture.test/original-image.svg',thumbnail:'https://fixture.test/instant-preview.svg',createdAt:1791534600000},{messageId:'preview-video',type:'video',userType:'star',content:'https://fixture.test/slow-preview.mp4',thumbnail:'https://fixture.test/instant-preview.svg',createdAt:1791534600001}];state.chatMessages=state.messages;setFilter('image');FrommViewState.cancel();scrollTo(0,0);});
   const thumb=page.locator('.gallery-image');await thumb.evaluate(el=>el.complete&&el.naturalWidth?null:new Promise(resolve=>el.addEventListener('load',resolve,{once:true})));assert.equal(imageRequests,0,'gallery does not fetch originals to prepare expansion');
   await thumb.dblclick();await page.locator('#imageLightbox.open').waitFor();
   const original=page.locator('#lightboxImage'),placeholder=page.locator('#lightboxPlaceholder');
   assert.equal(await page.locator('#imageLightbox').getAttribute('aria-hidden'),'false');
   assert.equal(await page.evaluate(()=>state.selected.size),0,'double click does not leave a selected card');
   if(width>700){
    assert.equal(await placeholder.isVisible(),false,'the desktop viewer never paints the differently shaped thumbnail while the original loads');
    assert.equal(await placeholder.getAttribute('src'),null);
    assert.equal(await original.isVisible(),false);
    assert.equal(await page.locator('#lightboxCaption').textContent(),'원본 사진 불러오는 중…');
   }else{
    await page.waitForFunction(()=>document.querySelector('#lightboxPlaceholder').complete&&document.querySelector('#lightboxPlaceholder').naturalWidth>0);
    assert.equal(await placeholder.isVisible(),true,'touch preview still displays the cached thumbnail');
   }
   releaseImage();await page.waitForFunction(()=>!document.querySelector('#imageLightbox').classList.contains('preview-loading')&&document.querySelector('#lightboxImage').naturalWidth===900&&!document.querySelector('#lightboxImage').hidden);
   if(width>700){
    const first=await original.boundingBox();
    assert.ok(Math.abs(first.width/first.height-900/1600)<.002,'the first visible desktop image already uses the original aspect ratio');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await original.boundingBox(),first,'opening does not trigger a second resize');
    assert.equal(await placeholder.isVisible(),false);
   }
   await page.keyboard.press('Escape');
   if(width>700){
    await page.route('**/missing-original.svg',route=>route.fulfill({status:404,body:''}));
    await page.evaluate(()=>openImageLightbox('https://fixture.test/missing-original.svg','합성 사진','https://fixture.test/instant-preview.svg'));
    await placeholder.waitFor({state:'visible'});
    assert.match(await page.locator('#lightboxCaption').textContent(),/원본 이미지를 불러오지 못했습니다/);
    assert.equal(await original.isVisible(),false,'only the fallback is shown after an original load error');
    await page.keyboard.press('Escape');
   }
   await page.evaluate(()=>{setFilter('video');FrommViewState.cancel();scrollTo(0,0);});await page.locator('.media-card video').dblclick({position:{x:80,y:60}});
   await page.locator('#imageLightbox.open.video-preview').waitFor();assert.ok((await page.locator('#lightboxVideo').getAttribute('poster')).endsWith('/instant-preview.svg'),'enlarged video immediately reuses the gallery poster');assert.ok(await page.locator('#lightboxVideo').evaluate(el=>el.readyState<2),'the player opens before waiting for video bytes');
   releaseVideo();await page.waitForFunction(()=>document.querySelector('#lightboxVideo').readyState>=2);await page.locator('#lightboxVideo').evaluate(el=>el.pause());if(width>700){
    await page.locator('#lightboxVideoStage .modern-video-controls').waitFor();
    assert.equal(await page.locator('#imageLightbox .video-playlist-toggle').count(),0);
    assert.equal(await page.locator('#lightboxVideo').evaluate(el=>el.controls),false);
   }else await page.locator('#imageLightbox .video-playlist-toggle').waitFor();
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{openVideoLightbox('https://fixture.test/slow-preview.mp4');closeImageLightbox();});await page.waitForTimeout(150);assert.equal(await page.locator('#imageLightbox .video-playlist-toggle').count(),0,'closing before deferred queue preparation prevents late UI');
   await page.evaluate(()=>{setFilter('image');state.selected.add('preview-image');syncDownloadSelection();});
   for(const theme of ['sky','classic']){
    await page.evaluate(theme=>FrommThemes.set(theme),theme);await page.waitForFunction(()=>!document.querySelector('#saveSelectedBtn').disabled);await page.waitForFunction(()=>{const e=document.querySelector('#saveSelectedBtn'),probe=document.createElement('span');probe.style.color='var(--theme-accent)';document.body.append(probe);const ready=getComputedStyle(e).color===getComputedStyle(probe).color;probe.remove();return ready;});
    const colors=await page.locator('#saveSelectedBtn').evaluate(el=>{const probe=document.createElement('span');probe.style.color='var(--theme-accent)';document.body.append(probe);const value={actual:getComputedStyle(el).color,expected:getComputedStyle(probe).color,fill:getComputedStyle(el).backgroundColor};probe.remove();return value;});assert.equal(colors.actual,colors.expected,'native save keeps its themed label');await require('./helpers/clear-controls.cjs').plain(page,'#saveSelectedBtn');
    assert.equal(await page.locator('#saveSelectedBtn .control-glass-surface,#saveSelectedBtn .mobile-save-glass').count(),0,'save has no decorative engine face');

   }
   await page.evaluate(()=>{state.selected.clear();syncDownloadSelection();});if(width>700)assert.equal(await page.locator('#saveSelectedBtn').isDisabled(),true);else{await page.locator('#saveSelectedBtn').waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('#saveSelectedBtn .mobile-save-glass'));}
   assert.deepEqual(errors,[]);await context.close();console.log(`${width}: photo opening, poster before decode, selection/close cleanup and themed save optics PASS`);
  }
 }finally{await browser.close();await server.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

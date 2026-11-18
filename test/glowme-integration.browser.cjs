'use strict';
// Real shell + pinned Meapri SDK, synthetic posts/media only.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs'),{seedCollection,contentFilter,stableGeometry}=require('./helpers/collection-fixture.cjs'),{plain}=require('./helpers/clear-controls.cjs');
const out=process.env.GLOWME_INTEGRATION_DIR;
async function shot(p,name){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}}
async function optical(p){return p.locator('.morph-menu-glass').evaluate(e=>{const id=/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)?.[1],f=document.getElementById(id);return {id,scales:[...f?.querySelectorAll('feDisplacementMap')||[]].map(e=>Number(e.getAttribute('scale'))),blur:Number(f?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')),saturation:Number(f?.querySelector('feColorMatrix[type=saturate]')?.getAttribute('values')),images:f?.querySelectorAll('feImage').length||0};});}
async function menuReady(p){await p.waitForFunction(()=>FrommMorphMenus.snapshot.open&&FrommMorphMenus.snapshot.live===1&&document.querySelector('.morph-menu-glass')?.style.backdropFilter.includes('url('));await p.waitForTimeout(550);}
(async()=>{const s=await serve(),b=await chromium.launch(),recorded={newContext:options=>b.newContext({...options,...(out?{recordVideo:{dir:path.join(out,'recordings'),size:options.viewport}}:{})})};try{
 for(const width of [1440,390,320]){
  const {page:p,context,errors}=await open(recorded,s.url,{width,height:900});let saved=[],alerts=[];
  p.on('download',async d=>saved.push({name:d.suggestedFilename(),bytes:fs.readFileSync(await d.path())}));p.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  await p.route('**/*',async route=>{let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const posts=[{id:'v',type:'video',title:'합성 영상',displayStartAt:4},{id:'p',type:'image',title:'합성 사진',displayStartAt:3,urls:['https://fixture.test/photo.svg?album1','https://fixture.test/photo.svg?album2']},{id:'r',type:'live_record',title:'제외할 Replay',displayStartAt:2}].map(x=>({...x,thumbnail:'https://fixture.test/photo.svg'}));
   if(u.pathname==='/media/posts')return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{posts,isLast:true}})});
   if(u.pathname==='/media/posts/p')return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{post:posts[1]}})});return route.fallback();
  });
  await seedCollection(p,'channel');await p.evaluate(async()=>{window.showDirectoryPicker=undefined;await loadChannelVideos({refresh:true});});
  assert.equal(await p.locator('.replay-card').count(),2);assert.equal(await p.locator('.channel-photo-card').count(),1);assert.equal(await p.locator('.channel-photo-count-badge').textContent(),'2장');assert.equal(await p.locator('.channel-photo-badge').count(),0);
  const baseline=await stableGeometry(p),ordinary=await p.locator('#sortBtn').evaluate(e=>({fill:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow}));await plain(p,'[data-channel-content-menu]');await shot(p,width+'-channel-before');
  await p.locator('[data-channel-content-menu]').click();await menuReady(p);const low=await optical(p);assert.ok(low.images>0&&low.scales.length>0,'real Meapri map/filter installed');assert.deepEqual(await stableGeometry(p),baseline,'opening morph does not reflow header or list');
  if(width>700){
   const origin=await p.locator('[data-channel-content-menu]').boundingBox();
   const rows=await p.getByRole('menuitemradio').all();
   const first=await rows[0].boundingBox(),last=await rows[2].boundingBox();
   assert.ok(first.y>origin.y+origin.height&&last.y>first.y&&first.x===last.x,'the PC menu opens below the trigger in a single column');
   assert.ok(await p.locator('.morph-menu-glass').evaluate(e=>e.matches('.morph-menu-skin') && e.getAnimations().length>0),'the animated pane itself samples the background');
  }
  const content=await p.locator('.morph-menu-content').boundingBox();assert.ok(content.x>=0&&content.x+content.width<=width);assert.ok(await p.locator('[data-morph-value=image]').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'menu wins hit testing over sort');
  await p.evaluate(()=>FrommGlassSettings.set({refraction:55,thickness:28,chromatic:85,blur:2,saturation:135},{immediate:true,persist:false}));await p.waitForTimeout(600);const high=await optical(p);assert.notDeepEqual(high.scales,low.scales);assert.equal(high.blur,2);assert.equal(high.saturation,1.35);assert.ok(high.scales.length>=3,'shared chromatic preference updates real RGB filter');
  assert.deepEqual(await p.locator('#sortBtn').evaluate(e=>({fill:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow})),ordinary,'ordinary CSS controls ignore optical preferences');
  assert.equal(await p.locator('.morph-menu-glass').getAttribute('data-adaptive'),'');
  if(width>700)await p.locator('.morph-menu-glass').evaluate(e=>{
   const rect=e.getBoundingClientRect(),sample=document.createElement('div');
   sample.id='solid-glass-backdrop';
   Object.assign(sample.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',zIndex:'1199',backgroundColor:'#101316'});
   document.body.append(sample);
  });
  await p.evaluate(()=>FrommThemes.set('classic'));await p.waitForFunction(()=>document.querySelector('.morph-menu-glass')?.dataset.scheme==='dark');
  await p.evaluate(()=>{const sample=document.querySelector('#solid-glass-backdrop');if(sample)sample.style.backgroundColor='#effffb';FrommThemes.set('glow');});
  await p.waitForFunction(()=>document.querySelector('.morph-menu-glass')?.dataset.scheme==='light');
  await p.evaluate(()=>document.querySelector('#solid-glass-backdrop')?.remove());
  await shot(p,width+'-channel-menu');await p.keyboard.press('Escape');await p.waitForFunction(()=>FrommMorphMenus.snapshot.live===0);assert.equal(await p.evaluate(()=>document.activeElement.matches('[data-channel-content-menu]')),true);
  assert.equal(await p.locator('.morph-menu-skin,.morph-menu-content').count(),0);
  // SDK trigger toggle must reverse once, not double-toggle in document delegation.
  await p.locator('[data-channel-content-menu]').click();await menuReady(p);await p.locator('[data-channel-content-menu]').dispatchEvent('click');await p.waitForFunction(()=>!FrommMorphMenus.snapshot.open);await p.locator('[data-channel-content-menu]').dispatchEvent('click');await menuReady(p);await p.keyboard.press('End');assert.equal(await p.evaluate(()=>document.activeElement.dataset.morphValue),'image');await p.keyboard.press('Enter');await p.waitForFunction(()=>channelVideoState.mediaType==='image'&&!channelVideoState.loading);assert.equal(await p.locator('.replay-card').count(),1);assert.equal(await p.locator('[data-channel-content-menu]').textContent(),'사진 ');
  await contentFilter(p,'video');assert.equal(await p.locator('.channel-photo-card').count(),0);assert.equal(await p.locator('[data-channel-video-play]').count(),1);await contentFilter(p,'all');assert.equal(await p.locator('.replay-card').count(),2);
  // The mixed all scope delegates album transfer to the existing real blob saver.
  await p.evaluate(()=>{const q=downloadSelectionScope();chooseDownloadItem(q.kind,q.items.find(x=>x.type==='image'));});await p.waitForFunction(()=>FrommGlowME.capsule.phase==='shown');await shot(p,width+'-selected-capsule');await p.locator('#saveSelectedBtn').click();await p.waitForFunction(()=>!state.postBulkSaving&&state.postSelected.size===0);await p.waitForTimeout(100);assert.equal(saved.length,2);assert.ok(saved.every(x=>x.bytes.includes(Buffer.from('<svg'))));assert.match(await p.locator('.channel-photo-save-notice').textContent(),/다운로드 요청 완료.*2장/);assert.deepEqual(alerts,[]);
  if(width>700){
   assert.equal(await p.locator('.channel-photo-meta .channel-photo-count-badge').innerText(),'2장');
   const button=p.locator('[data-channel-photo-download="p"]');
   await button.click();
   await p.waitForFunction(()=>document.querySelector('[data-channel-photo-download="p"]')?.dataset.downloadPhase==='active');
   assert.equal(await button.innerText(),'');
   const feedback=await button.locator('.download-feedback-ring').evaluate(e=>({animation:getComputedStyle(e).animationName,display:getComputedStyle(e).display}));
   assert.equal(feedback.animation,'download-ring-spin');assert.notEqual(feedback.display,'none');
   await p.waitForFunction(()=>document.querySelector('[data-channel-photo-download="p"]')?.dataset.downloadPhase==='handed-off');
   assert.equal(saved.length,4);
   // A mixed selection still saves photos and reports a failed video without blocking.
   await p.evaluate(()=>selectAllMedia());
   await p.locator('#saveSelectedBtn').click();
   await p.waitForFunction(()=>!state.postBulkSaving&&state.postSelected.size===1);
   assert.equal(saved.length,6);
   assert.match(await p.locator('.channel-photo-save-notice').textContent(),/다운로드 요청 완료 1개.*실패 1개/);
   assert.deepEqual(alerts,[]);
   await p.evaluate(()=>clearDownloadSelection());
  }
  await p.locator('[data-channel-content-menu]').click();await menuReady(p);await p.mouse.click(width-5,850);await p.waitForFunction(()=>FrommMorphMenus.snapshot.live===0);assert.equal(await p.locator('.morph-menu-skin').count(),0);
  await p.locator('[data-channel-content-menu]').click();await menuReady(p);await p.setViewportSize({width:width-1,height:899});await p.waitForFunction(()=>FrommMorphMenus.snapshot.live===0);assert.equal(await p.locator('.morph-menu-content').count(),0);
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-channel-content-menu]').click();await p.waitForFunction(()=>FrommMorphMenus.snapshot.open);assert.equal(await p.evaluate(()=>FrommMorphMenus.snapshot.live),0);await p.keyboard.press('Escape');await p.waitForFunction(()=>!FrommMorphMenus.snapshot.open);await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>FrommGlassSettings.reset());await p.evaluate(()=>setFilter('image'));
  const ring=await p.locator('.card-download').first().evaluate(e=>{setDownloadButtonFeedback(e,'active');e.style.setProperty('--download-remaining','63');window.ringButton=e;return {direction:getComputedStyle(e.querySelector('.download-feedback-ring')).animationDirection};});
  await p.waitForTimeout(100);const timeline=await p.evaluate(()=>{const e=ringButton.querySelector('.download-feedback-ring');window.ringAnimation=e.getAnimations()[0];return {duration:ringAnimation.effect.getTiming().duration,rate:ringAnimation.playbackRate};});assert.deepEqual(timeline,{duration:1000,rate:1});
  const colors=[];for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){await p.evaluate(t=>FrommThemes.set(t),theme);await p.waitForTimeout(130);colors.push(await p.evaluate(()=>{const e=ringButton.querySelector('.download-feedback-ring');return {same:e.getAnimations()[0]===ringAnimation,color:getComputedStyle(e).stroke,phase:ringButton.dataset.downloadPhase,remaining:ringButton.style.getPropertyValue('--download-remaining')};}));await plain(p,'.card-download');}
  assert.ok(colors.every(x=>x.same&&x.phase==='active'&&x.remaining==='63'),'theme changes preserve original ring timeline/progress');assert.equal(new Set(colors.map(x=>x.color)).size,6,'all six ring colors follow palette');
  const download=p.locator('.card-download').first(),box=await download.boundingBox();await p.mouse.move(0,0);await p.waitForTimeout(180);const normal=await download.evaluate(e=>getComputedStyle(e).backgroundColor);await download.hover();await p.mouse.move(0,0);await p.waitForTimeout(180);assert.equal(await download.evaluate(e=>getComputedStyle(e).backgroundColor),normal,'hover leaves no dark/stuck state');
  assert.equal(await p.locator('.card-download :is(.fixed-glass-surface,.control-glass-surface)').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);const video=p.video();await context.close();if(out&&video)await video.saveAs(path.join(out,width+'-demo.webm'));console.log(width+': real morph/shared optics/cleanup/keyboard, mixed filters/album bytes, CSS independence and six-theme ring continuity PASS');
 }
 const fallback=await open(b,s.url,{login:true,width:390,height:900});await fallback.page.route('**/vendor/meapri/liquid-glass.js*',r=>r.abort());await require('./helpers/phase3-fixture.cjs').seed(fallback.page);await seedCollection(fallback.page,'channel');await fallback.page.locator('[data-channel-content-menu]').click();await fallback.page.locator('.morph-menu-content[data-optics="fallback"]').waitFor();assert.equal(await fallback.page.evaluate(()=>FrommMorphMenus.snapshot.live),0);await fallback.page.locator('[data-morph-value="image"]').click();await fallback.page.waitForFunction(()=>channelVideoState.mediaType==='image');await fallback.page.keyboard.press('Escape');assert.deepEqual(fallback.errors,[]);await fallback.context.close();console.log('Optional SDK load failure: native keyboard/filter actions remain usable, zero optics PASS');

}finally{await b.close();await s.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

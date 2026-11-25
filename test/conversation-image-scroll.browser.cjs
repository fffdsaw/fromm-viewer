'use strict';
// Delayed synthetic images and isolated browser contexts; no account files/caches.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve();let browser;try{browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});
 for(const width of [1440,900]){
  const {page,context,errors}=await open(browser,process.env.FROMM_SCROLL_TEST_URL||server.url,{width,height:900});
  await page.evaluate(theme=>FrommThemes.set(theme),width===900?'classic':'glow');
  let release=()=>{},gate=Promise.resolve(),requests=0;
  await page.route('**/scroll-photo.svg*',async route=>{requests++;const held=gate;await held;await route.fulfill({contentType:'image/svg+xml',headers:{'cache-control':'no-store'},body:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${route.request().url().includes('portrait')?1200:500}"><rect width="600" height="1200" fill="#94d9c4"/></svg>`}).catch(()=>{});});
  async function setup(){
   await page.evaluate(async()=>{
    FrommViewState.cancel();window.FrommChatLayout?.clear();state.chunkSize=20;state.filter='all';state.chatHistoryComplete=true;state.chatQuery='';
    state.chatMessages=Array.from({length:180},(_,i)=>({messageId:'photo-scroll-'+i,userType:'star',type:i>=20&&i<40?'image':'text',content:i>=20&&i<40?location.origin+'/scroll-photo.svg?i='+i:'합성 읽기 위치 '+i,createdAt:1791534600000+i*1000}));state.messages=state.chatMessages;FrommViewState.enter('all',{autoTop:false});
    renderChatWindow(filteredMessages(),80);FrommViewState.cancel();
    for(const key of ['chatRenderObserver','chatTopRenderObserver']){state[key]?.disconnect();state[key]=null;}
    document.querySelectorAll('.chat-render-sentinel,.chat-prepend-sentinel').forEach(el=>el.remove());
    window.reader=document.querySelector('[data-message-id="photo-scroll-45"]');
    for(let i=0;i<8;i++){scrollBy({top:reader.getBoundingClientRect().top-240,behavior:'instant'});await new Promise(requestAnimationFrame);}
   });
  }
  gate=new Promise(r=>release=r);await setup();
  const before=await page.evaluate(()=>{const y=reader.getBoundingClientRect().top;prependChatBatch(1);for(const img of document.querySelectorAll('#timeline .media-wrap img'))img.loading='eager';return{y,after:reader.getBoundingClientRect().top,height:document.documentElement.scrollHeight};});
  assert.ok(Math.abs(before.after-before.y)<2,'prepend keeps the actual visible reader in place');
  await page.waitForTimeout(200);release();
  await page.waitForFunction(()=>[...document.querySelectorAll('#timeline .media-wrap img')].length===20&&[...document.querySelectorAll('#timeline .media-wrap img')].every(i=>i.complete&&i.naturalWidth));
  await page.waitForTimeout(300);
  const after=await page.evaluate(()=>({y:reader.getBoundingClientRect().top,height:document.documentElement.scrollHeight,cache:window.FrommChatLayout?.cachedImages||0}));
  const output=process.env.CHAT_IMAGE_SCROLL_DIR;if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:output+'/resolved-'+width+'.png'});}
  if(process.env.FROMM_SCROLL_MEASURE_ONLY){console.log(JSON.stringify({width,before,after,drift:after.y-before.y,requests}));await context.close();continue;}
  console.log(JSON.stringify({width,before,after,drift:after.y-before.y,requests}));
  assert.ok(Math.abs(after.y-before.y)<3,JSON.stringify({before,after}));assert.equal(after.cache,20);
  await page.evaluate(()=>{render();window.reader=document.querySelector('[data-message-id="photo-scroll-45"]');});await page.waitForTimeout(80);
  assert.ok(Math.abs(await page.evaluate(()=>reader.getBoundingClientRect().top)-before.y)<3,'a background render during the media watch preserves the reader');
  // Same source and message: decoded image DOM survives both virtual and full renders.
  await page.evaluate(()=>{FrommViewState.cancel();renderChatWindow(filteredMessages(),40);window.keptImage=document.querySelector('[data-message-id="photo-scroll-30"] img');window.keptRow=keptImage.closest('.msg');keptImage.dataset.syntheticState='kept';});
  const oldRequests=requests;
  await page.evaluate(()=>{renderChatWindow(filteredMessages(),42);});
  assert.equal(await page.evaluate(()=>document.querySelector('[data-message-id="photo-scroll-30"] img')===keptImage),true);
  await page.evaluate(()=>render());await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>document.querySelector('[data-message-id="photo-scroll-30"] img')===keptImage),true);
  assert.equal(requests,oldRequests,'no repeated requests for retained decoded image nodes even with no-store');
  await page.setViewportSize({width:390,height:900});await page.waitForFunction(()=>!viewerDesktop.matches);
  assert.equal(await page.locator('[data-message-id="photo-scroll-30"] img').evaluate(img=>img.hasAttribute('width')||img.hasAttribute('height')),false,'narrow layout restores its original image sizing');
  assert.equal(await page.evaluate(()=>FrommViewState.beforePrepend()),null);
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>viewerDesktop.matches);
  // A changed source must not retain the old image. Previously learned sizes
  // reserve geometry before bytes arrive when returning from a disjoint window.
  await page.evaluate(()=>{FrommViewState.cancel();renderChatWindow(filteredMessages(),140);});
  gate=new Promise(r=>release=r);
  await page.evaluate(()=>{renderChatWindow(filteredMessages(),40);for(const img of document.querySelectorAll('#timeline .media-wrap img'))img.loading='eager';});
  const reserved=await page.locator('[data-message-id="photo-scroll-30"] img').evaluate(img=>({width:img.width,height:img.height,ratio:img.style.aspectRatio,complete:img.complete}));
  assert.ok(reserved.width>0&&reserved.height>0);assert.equal(reserved.ratio,'600 / 500');
  release();await page.waitForFunction(()=>[...document.querySelectorAll('#timeline .media-wrap img')].every(i=>i.complete&&i.naturalWidth));
  await page.evaluate(()=>{window.beforeChange=document.querySelector('[data-message-id="photo-scroll-30"] img');state.chatMessages[30]={...state.chatMessages[30],content:location.origin+'/scroll-photo.svg?changed'};renderChatWindow(filteredMessages(),40);});
  assert.equal(await page.evaluate(()=>document.querySelector('[data-message-id="photo-scroll-30"] img')===beforeChange),false,'source amendments are rendered');
  // Known portrait dimensions reserve the same aspect ratio while bytes wait.
  gate=new Promise(r=>release=r);
  await page.evaluate(()=>{state.chatMessages[30]={...state.chatMessages[30],content:location.origin+'/scroll-photo.svg?portrait',width:600,height:1200};renderChatWindow(filteredMessages(),40);document.querySelector('[data-message-id="photo-scroll-30"] img').loading='eager';});
  const portrait=await page.locator('[data-message-id="photo-scroll-30"] img').evaluate(img=>({width:img.width,height:img.height,ratio:img.style.aspectRatio}));assert.deepEqual(portrait,{width:280,height:560,ratio:'600 / 1200'});
  release();await page.waitForFunction(()=>document.querySelector('[data-message-id="photo-scroll-30"] img').naturalHeight===1200);
  const aspect=await page.locator('[data-message-id="photo-scroll-30"] img').evaluate(img=>{const r=img.getBoundingClientRect();return r.width/r.height;});assert.ok(Math.abs(aspect-.5)<.01,'portrait is not stretched');
  // A byte-fetch fallback is kept with its original decoded blob node. Leaving
  // that window releases its object URL instead of accumulating binary caches.
  let blobReads=0,releaseBlob=()=>{},blobGate=Promise.resolve();
  await page.route('**/broken-scroll.svg',async route=>{
   if(route.request().resourceType()==='image')return route.fulfill({status:503,body:'synthetic image failure'});
   blobReads++;await blobGate;return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="600" height="500" fill="#94d9c4"/></svg>'});
  });
  await page.evaluate(()=>{window.releasedImageURLs=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{releasedImageURLs.push(url);revoke(url);};state.chatMessages[30]={...state.chatMessages[30],content:location.origin+'/broken-scroll.svg'};renderChatWindow(filteredMessages(),40);document.querySelector('[data-message-id="photo-scroll-30"] img').loading='eager';});
  await page.waitForFunction(()=>{const img=document.querySelector('[data-message-id="photo-scroll-30"] img');return img.src.startsWith('blob:')&&img.complete&&img.naturalWidth;});
  const blobURL=await page.evaluate(()=>{window.blobImage=document.querySelector('[data-message-id="photo-scroll-30"] img');return blobImage.src;}),reads=blobReads;assert.ok(reads>0);
  await page.evaluate(()=>renderChatWindow(filteredMessages(),42));assert.equal(await page.evaluate(()=>document.querySelector('[data-message-id="photo-scroll-30"] img')===blobImage),true);assert.equal(blobReads,reads);
  await page.evaluate(()=>renderChatWindow(filteredMessages(),140));assert.ok(await page.evaluate(url=>releasedImageURLs.includes(url),blobURL),'discarded blob URLs are released');
  blobGate=new Promise(r=>releaseBlob=r);
  await page.evaluate(()=>{window.lateImageURLs=[];const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);lateImageURLs.push(url);return url;};renderChatWindow(filteredMessages(),40);document.querySelector('[data-message-id="photo-scroll-30"] img').loading='eager';});
  for(let i=0;i<100&&blobReads===reads;i++)await page.waitForTimeout(20);assert.ok(blobReads>reads,'fallback byte request is in flight');
  await page.evaluate(()=>renderChatWindow(filteredMessages(),140));releaseBlob();await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(()=>lateImageURLs),[],'retired images do not allocate a late blob URL');
  // A later wheel action ends the late-image watch: it cannot drag the reader back.
  await page.evaluate(()=>FrommChatLayout.clear());gate=new Promise(r=>release=r);await setup();
  await page.evaluate(()=>{prependChatBatch(1);for(const img of document.querySelectorAll('#timeline .media-wrap img'))img.loading='eager';});
  await page.mouse.wheel(0,320);await page.waitForTimeout(120);
  const manual=await page.evaluate(()=>scrollY);release();await page.waitForTimeout(400);
  const interrupted=await page.evaluate(()=>reader.getBoundingClientRect().top);assert.ok(Math.abs(interrupted-240)>150,'late media must not drag the reader back after a wheel action');
  // Account reset clears ephemeral geometry, with no IndexedDB mutation.
  await page.evaluate(()=>resetUserScopedMemory());assert.equal(await page.evaluate(()=>FrommChatLayout.cachedImages),0);
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}: delayed prepend drift <3px, node/request reuse, intrinsic reservation, source amendment, portrait fit, blob reuse/disposal, narrow-layout exclusion, manual cancellation and scoped geometry PASS (manual Y=${Math.round(manual)})`);
 }
}finally{await browser?.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const width of [1440,390]){
  const {page:p,context,errors}=await open(browser,server.url,{width,height:900});
  let active=0,peak=0;const counted=new Set();
  await p.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   const json=data=>route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:true,data})});
   if(u.hostname==='channel-contents.frommyarti.com'){
    const index=Number(/p_(\d+)/.exec(u.pathname)[1]);
    if(u.pathname.endsWith('.jpg'))await new Promise(r=>setTimeout(r,1100));
    return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${640+index*10}" height="400"><rect width="100%" height="100%" fill="${index%2?'#365caf':'#a33c52'}"/></svg>`});
   }
   if(u.pathname==='/media/posts')return json({posts:Array.from({length:24},(_,i)=>({id:'album-'+i,type:'image',title:'사진 '+i,thumbnail:'https://fixture.test/photo.svg'})),isLast:true});
   if(u.pathname.startsWith('/media/posts/')){
    active++;peak=Math.max(peak,active);const id=u.pathname.split('/').at(-1);counted.add(id);
    await new Promise(r=>setTimeout(r,80));active--;
    return json({post:{id,type:'image',urls:Array.from({length:5},(_,i)=>`https://channel-contents.frommyarti.com/p_${i}_640x400.webp`)}});
   }
   return route.fallback();
  });
  await p.evaluate(async()=>{state.filter='live';await setLiveCenterMode('channel');await selectChannelMediaType('image');});
  await p.waitForFunction(()=>document.querySelector('.channel-photo-count-badge')?.textContent==='5장');
  await p.waitForTimeout(200);assert.ok(counted.size<24,'offscreen albums must not all request detail metadata');assert.ok(peak<=2,'visible count lookups are bounded to two');
  await p.locator('[data-channel-photo-open="album-0"]').click();
  await p.waitForFunction(()=>FrommChannelPhotos.snapshot.readyPreviews>=2);
  const stageHeight=await p.locator('.channel-photo-stage').evaluate(e=>e.getBoundingClientRect().height);
  const firstFrame=await p.evaluate(async()=>{
   document.querySelector('[data-photo-action="next"]').click();
   await new Promise(requestAnimationFrame);
   const image=document.querySelector('.channel-photo-image img');return {ready:image.complete,width:image.naturalWidth,index:image.dataset.albumIndex,source:image.currentSrc};
  });
  assert.deepEqual({ready:firstFrame.ready,width:firstFrame.width,index:firstFrame.index},{ready:true,width:650,index:'1'},'decoded neighboring preview is visible on the first frame, before the slow original');
  assert.match(firstFrame.source,/p_1_640x400.webp$/);
  assert.equal(await p.locator('.channel-photo-stage').evaluate(e=>e.getBoundingClientRect().height),stageHeight,'image aspect changes do not resize/recenter the stage');
  await p.waitForFunction(()=>FrommChannelPhotos.snapshot.readyPreviews===3);
  for(let i=2;i<5;i++){
   await p.locator('[data-photo-action="next"]').click();
   await p.waitForFunction(index=>{const image=document.querySelector('.channel-photo-image img');return image.dataset.albumIndex===String(index)&&image.complete&&image.naturalWidth===640+index*10;},i);
   assert.ok(await p.evaluate(()=>FrommChannelPhotos.snapshot.cachedImages<=3),'cache retains only current and adjacent photos');
  }
  await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(1300);
  const final=await p.locator('.channel-photo-image img').evaluate(e=>({index:e.dataset.albumIndex,width:e.naturalWidth}));
  assert.deepEqual(final,{index:'2',width:660},'late original responses cannot replace the current photo with an older one');
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>FrommChannelPhotos.snapshot.cachedImages),0);
  await p.locator('[data-channel-content-menu]').click();await p.locator('[data-morph-value="video"]').click();
  await p.waitForFunction(()=>FrommChannelPhotos.snapshot.pendingCounts===0);
  assert.deepEqual(errors,[]);await context.close();console.log(width+': first-frame neighboring image, stable stage, bounded cache/count requests and stale-original rejection PASS');
 }
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

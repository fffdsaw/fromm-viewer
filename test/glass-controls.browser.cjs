'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.GLASS_CONTROLS_DIR;
async function shot(p,name){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}}
const ready=p=>p.waitForFunction(()=>window.FrommHeaderGlass?.snapshot.sidebar.mode==='svg'&&window.FrommControlGlass?.snapshot.live>2);
async function lens(p,selector){
 const target=p.locator(selector).first();await target.waitFor({state:'visible'});
 if(!['.rail-pointer-light','.glowme-nav button.active','.room.active'].includes(selector))await target.hover();
 await p.waitForFunction(selector=>{const e=document.querySelector(selector),face=e?.querySelector('.control-glass-surface')||e,id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return !!id&&!!document.getElementById(id);},selector);
}
async function collection(p,mode){await p.evaluate(mode=>{
 clearDownloadSelection();state.filter='live';state.live.centerMode=mode;state.live.replaySelected=null;channelVideoState.selected=null;
 state.live.channels=[{id:'a',channelName:'fromis_9'},{id:'b',channelName:'OH MY GIRL'}];state.live.channelsLoaded=true;state.live.replayFilter='a';
 const posts=(id)=>Array.from({length:18},(_,i)=>({id:id+i,type:mode==='replay'?'live_record':'video',title:'합성 영상 '+i,_channelId:id,_channelName:id==='a'?'fromis_9':'OH MY GIRL',thumbnail:{url:'https://fixture.test/photo.svg'},displayStartAt:1791534600000-i*60000}));
 state.live.replayPosts=[...posts('a'),...posts('b')];state.live.replayPaging=new Map(['a','b'].map(id=>[id,{loaded:true,isLast:true}]));
 channelVideoState.channelId='a';channelVideoState.pages=new Map(['a','b'].map(id=>[id,{loaded:true,isLast:true,posts:posts(id)}]));renderLiveView();syncLoadingUI();scrollTo(0,0);
 },mode);}
async function press(p,selector){
 const button=p.locator(selector).first();await button.scrollIntoViewIfNeeded();await button.hover();await p.waitForTimeout(230);const before=await button.boundingBox();await p.mouse.down();
 await p.waitForFunction(selector=>document.querySelector(selector)?.classList.contains('glass-pressed'),selector);
 assert.deepEqual(await button.boundingBox(),before,'press never moves the hit box');
 const squeezed=await button.locator('.control-glass-surface').evaluate(e=>getComputedStyle(e).transform);assert.notEqual(squeezed,'none');
 await p.mouse.move(before.x-15,before.y-15);await p.mouse.up();assert.equal(await button.evaluate(e=>e.classList.contains('glass-pressed')),false);
}
(async()=>{const s=await serve(),b=await chromium.launch(process.env.PUBLIC_SHA?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{});
 const url=process.env.PUBLIC_SHA?'https://fffdsaw.github.io/fromm-viewer/?deployment='+process.env.PUBLIC_SHA:s.url;
 const high={newContext:async options=>{const c=await b.newContext({...options,...(out&&options.viewport.width===1440?{recordVideo:{dir:path.join(out,'recording'),size:{width:1440,height:900}}}:{})});await c.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});return c;}};
 try{
 for(const opt of [{width:1440,height:900},{width:760,height:900},{width:900,height:700,installed:true}]){
  const{page:p,context,errors}=await open(high,url,opt);await p.evaluate(()=>setFilter('image'));await ready(p);await lens(p,'.card-download');await lens(p,'.glowme-nav button.active');await lens(p,'.room.active');
  const label=opt.width+(opt.installed?'-standalone':'');await shot(p,label+'-media');
  if(opt.width===1440){
   // Pixel evidence: a real SVG lens bends a diagnostic pattern under the
   // download face; the foreground icon is outside that filter.
   await p.locator('.card-download').first().focus();
   const restore=await p.locator('.media-card .thumb').first().evaluate(e=>{const image=e.querySelector('img'),old={background:e.style.background,opacity:image.style.opacity};e.style.background='repeating-conic-gradient(#173f32 0% 25%,#edf8f0 0% 50%) 0 0 / 8px 8px';image.style.opacity='0';return old;});
   const id=await p.locator('.card-download .control-glass-surface').first().evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]),map=p.locator(`#${id} feDisplacementMap`),scale=await map.getAttribute('scale');assert.ok(Number(scale)>0);await p.waitForTimeout(250);
   const clip=await p.locator('.card-download').first().boundingBox(),optical=await p.screenshot({clip});await map.evaluate(e=>e.setAttribute('scale','0'));await p.waitForTimeout(80);assert.equal(optical.equals(await p.screenshot({clip})),false,'actual control displacement changes backdrop pixels');await map.evaluate((e,s)=>e.setAttribute('scale',s),scale);
   await p.locator('.media-card .thumb').first().evaluate((e,old)=>{e.style.background=old.background;e.querySelector('img').style.opacity=old.opacity},restore);
  }
  // Every animation frame, including the first, keeps the same live sidebar map.
  const expanding=await p.evaluate(async()=>{
   const before=FrommHeaderGlass.snapshot.sidebar,rows=[];FrommGlowME.setRailOpen(true);const start=performance.now();
   await new Promise(resolve=>{function frame(t){const s=FrommHeaderGlass.snapshot.sidebar;rows.push({mode:s.mode,suspended:s.suspended,builds:s.builds,filter:getComputedStyle(document.querySelector('.sidebar-glass-surface')).backdropFilter,width:document.querySelector('#sidebar').clientWidth});t-start<400?requestAnimationFrame(frame):resolve()}requestAnimationFrame(frame)});
   return{before,rows,after:FrommHeaderGlass.snapshot.sidebar};
  });
  assert.ok(expanding.rows.length>5);assert.ok(new Set(expanding.rows.map(x=>x.width)).size>1);assert.ok(expanding.rows.every(x=>x.mode==='svg'&&!x.suspended&&x.builds===expanding.before.builds&&x.filter.includes('url(')),'lens stays attached from the first expansion frame');assert.equal(expanding.after.disposed,expanding.before.disposed);
  await p.locator('[data-glow-nav="sound"]').hover();await p.waitForFunction(()=>document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));await lens(p,'.rail-pointer-light');
  const light=await p.locator('.rail-pointer-light').boundingBox(),row=await p.locator('[data-glow-nav="sound"]').boundingBox();assert.ok(Math.abs(light.y-row.y)<1);await shot(p,label+'-sidebar');
  for(const key of ['media','image','sound','channel','all','video'])await p.locator(`[data-glow-nav="${key}"]`).hover();assert.equal(await p.locator('.rail-pointer-light').count(),1,'one cursor drop, no trails');
  await p.mouse.move(opt.width-30,350);await p.waitForFunction(()=>!document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));await p.evaluate(()=>FrommGlowME.setRailOpen(false));await p.waitForTimeout(240);
  await press(p,'.card-download');
  if(opt.width===1440){
   await p.evaluate(()=>{
    const original=fetchMediaBlob;
    fetchMediaBlob=async (media,progress)=>{
     fetchMediaBlob=original;
     progress(.46);
     await new Promise(resolve=>{window.finishDownloadFixture=resolve;});
     return original(media,progress);
    };
   });
  }
  const dl=p.waitForEvent('download');await p.locator('.card-download').first().focus();await p.keyboard.press('Enter');
  if(opt.width===1440){
   const button=p.locator('.card-download').first();
   await button.locator('.download-feedback-ring').waitFor({state:'visible'});
   assert.equal(await button.evaluate(e=>e.style.getPropertyValue('--download-remaining')),'54');
   assert.equal(await button.locator('.control-glass-surface').isVisible(),true);
   assert.equal(await p.locator('.card-download-panel').count(),0);
   await p.evaluate(()=>window.finishDownloadFixture());
  }
  assert.ok(fs.statSync(await(await dl).path()).size>0,'original download returns fixture bytes');
  assert.equal(await p.locator('.card-download .download-feedback-check').first().isVisible(),false,'browser handoff is not a confirmed save');
  await p.evaluate(()=>scrollTo(0,900));await p.locator('#scrollTopBtn.visible').waitFor();await lens(p,'#scrollTopBtn');await press(p,'#scrollTopBtn');await p.locator('#scrollTopBtn').click();await p.waitForFunction(()=>scrollY<2);
  for(const mode of ['replay','channel']){
   await collection(p,mode);await lens(p,'.replay-download');await lens(p,'.replay-play');const box=await p.locator('.replay-card').first().evaluate(e=>[e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight]);
   if(opt.width===1440){
    await p.evaluate(()=>{
     const original={createReplayDownloadSink,fetchReplayPostDetail,fetchChannelVideoDetail,downloadReplayStream};
     createReplayDownloadSink=async()=>({writable:{}});
     fetchReplayPostDetail=fetchChannelVideoDetail=async()=>({_streamUrl:'https://fixture.test/stream.m3u8'});
     downloadReplayStream=async (_url,_sink,progress)=>{
      progress(2,4);
      await new Promise(resolve=>{window.finishDownloadFixture=resolve;});
      progress(4,4);
      ({createReplayDownloadSink,fetchReplayPostDetail,fetchChannelVideoDetail,downloadReplayStream}=original);
     };
    });
    const button=p.locator('.replay-download').first();
    await button.click();
    await button.locator('.download-feedback-ring').waitFor({state:'visible'});
    assert.match(await button.getAttribute('title'),/50%/);
    assert.equal(await p.locator('.replay-download-progress').count(),0);
    await p.evaluate(()=>window.finishDownloadFixture());
    await button.locator('.download-feedback-check').waitFor({state:'visible'});
    assert.equal(await button.locator('.download-feedback-ring').isVisible(),false);
   }
   await press(p,'.replay-play');await p.evaluate(()=>scrollTo(0,0));await p.locator('#selectAllBtn').click();assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);await p.locator('#clearSelectionBtn').click();assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);assert.deepEqual(await p.locator('.replay-card').first().evaluate(e=>[e.offsetLeft,e.offsetTop,e.offsetWidth,e.offsetHeight]),box,'selection does not move the list');
   await shot(p,label+'-'+mode);await p.evaluate(()=>scrollTo(0,650));await p.waitForTimeout(220);assert.equal((await p.locator('.viewer-header').boundingBox()).y,12);assert.ok(await p.locator('.replay-download.glass-control').count()>0);await shot(p,label+'-'+mode+'-scrolled');
  }
  await p.evaluate(()=>{state.filter='all';syncLiveToolbarControls();render();scrollTo(0,0)});const photo=p.locator('.media-wrap img').first();await photo.scrollIntoViewIfNeeded();await lens(p,'.chat-media-download');assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);await shot(p,label+'-chat');
  const surfaces=await p.locator('.glass-control').evaluateAll(es=>es.map(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.control-glass-surface').getBoundingClientRect();return b.width<=a.width+1&&b.height<=a.height+1;}));assert.ok(surfaces.every(Boolean),'each lens fits only its own control');
  // Text/icons remain unfiltered even with a pane lens and nested button lens.
  assert.equal(await p.locator('#artistTitle').evaluate(e=>getComputedStyle(e).filter),'none');assert.equal(await p.locator('.glowme-nav button').first().evaluate(e=>getComputedStyle(e).filter),'none');
  for(let i=0;i<8;i++)await p.evaluate(async i=>{await setFilter(i%2?'image':'all');FrommGlowME.setRailOpen(i%2===0);},i);
  await p.waitForTimeout(500);const count=await p.evaluate(()=>FrommControlGlass.snapshot);assert.ok(count.live<=count.limit);assert.equal(count.builds-count.disposed,count.live,'no orphaned engines after rapid changes');
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0);await p.locator('#sortBtn').hover();await p.mouse.down();assert.equal(await p.locator('#sortBtn .control-glass-surface').evaluate(e=>getComputedStyle(e).transform),'none');await p.mouse.move(500,400);await p.mouse.up();await p.emulateMedia({reducedMotion:'no-preference'});await ready(p);
  await p.evaluate(()=>showLoginGate());await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0&&FrommControlGlass.snapshot.count===0);assert.equal(await p.locator('.control-glass-surface').count(),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(label+': expansion lens from first frame, rail drops/trails, real download, press with fixed hit boxes, Replay/Channel/chat/sticky, lifecycle/reduced motion PASS');
 }
 const noObserver={newContext:async options=>{const c=await high.newContext(options);await c.addInitScript(()=>{delete window.IntersectionObserver;});return c;}};
 const unsupported=await open(noObserver,url);await unsupported.page.evaluate(()=>setFilter('image'));await unsupported.page.waitForTimeout(160);assert.equal(await unsupported.page.evaluate(()=>FrommControlGlass.snapshot.live),0);assert.equal(await unsupported.page.locator('.control-glass-surface').count(),0);await unsupported.page.locator('.media-card').first().click({position:{x:30,y:30}});await unsupported.page.waitForFunction(()=>state.selected.size===1);assert.equal(await unsupported.page.locator('#saveSelectedBtn').isEnabled(),true);assert.deepEqual(unsupported.errors,[]);await unsupported.context.close();console.log('No IntersectionObserver: original controls and selection remain usable, no engine/exception PASS');
 const mobile=await open(high,url,{width:390,height:844});await mobile.page.evaluate(()=>setFilter('image'));await mobile.page.waitForTimeout(120);assert.equal(await mobile.page.locator('.control-glass-surface').count(),0);assert.equal(await mobile.page.evaluate(()=>FrommControlGlass.snapshot.live),0);assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(mobile.errors,[]);await mobile.context.close();console.log('390 touch: PC control material absent, original layout intact PASS');
 }finally{await b.close();await s.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

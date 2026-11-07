'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const output=process.env.COLLECTION_HEADER_DIR;
async function seed(p,mode,n=2,selected='all'){
 await p.evaluate(({mode,n,selected})=>{
  clearDownloadSelection();state.filter='live';state.live.centerMode=mode;state.live.replaySelected=null;channelVideoState.selected=null;
  state.live.channels=[{id:'a',channelName:'fromis_9'},{id:'b',channelName:'OH MY GIRL'}].slice(0,n);state.live.channelsLoaded=true;state.live.replayFilter=selected;
  const posts=(kind,id,count)=>Array.from({length:count},(_,i)=>({id:kind+id+i,title:'합성 '+id+' '+i,type:kind==='r'?'live_record':'video',_channelId:id,_channelName:id==='a'?'fromis_9':'OH MY GIRL',thumbnail:{url:'https://fixture.test/photo.svg'},displayStartAt:1791534600000-i*60000}));
  state.live.replayPosts=[...posts('r','a',13),...posts('r','b',7)];state.live.replayPaging=new Map([['a',{loaded:true,isLast:true}],['b',{loaded:true,isLast:true}]]);
  channelVideoState.channelId=selected;channelVideoState.pages=new Map(['a','b'].map(id=>[id,{loaded:true,isLast:true,posts:posts('v',id,id==='a'?13:7)}]));
  renderLiveView();syncLoadingUI();scrollTo(0,0);
 },{mode,n,selected});
}
async function snapshot(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.png')});}}
async function geometry(p){return p.evaluate(()=>Object.fromEntries(['.viewer-header','.pc-mode-heading','.pc-mode-count','.pc-list-host','.replay-filter-strip','.batch-selection-tools','#logoutMiniBtn','.header-icon-cluster :is(#channelRefresh,#scanBtn):not([style*="display: none"])'].map(s=>{let e=document.querySelector(s);if(s.includes('header-icon'))e=[...document.querySelectorAll('.header-icon-cluster button')].find(x=>x.id!=='logoutMiniBtn'&&x.getClientRects().length);return[s,e?.getBoundingClientRect().toJSON()||null];})));}
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const [width,installed] of [[1440,false],[900,false],[760,false],[701,false],[900,true]]){
  const {page:p,context,errors}=await open(browser,server.url,{width,height:900,installed});let replayGeometry;
  for(const mode of ['replay','channel']){
   const selector=mode==='replay'?'[data-replay-filter]':'[data-channel-video-filter]';
   for(const n of [0,1,2]){
    await seed(p,mode,n);assert.equal(await p.locator(selector).count(),n);assert.equal(await p.locator('[data-replay-filter="all"]').count(),0);
    const id=await p.evaluate(mode=>mode==='replay'?state.live.replayFilter:channelVideoState.channelId,mode);assert.equal(id,n?'a':'');assert.equal(await p.locator('.pc-mode-count').textContent(),n?'13개':'0개');
    assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.locator('#selectAllBtn').isEnabled(),true);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);
    if(n)assert.equal(await p.locator(selector+'.active').getAttribute('aria-pressed'),'true');
   }
   const g=await geometry(p);if(mode==='replay')replayGeometry=g;else for(const key of ['.viewer-header','.pc-mode-heading','.pc-list-host','.batch-selection-tools','#logoutMiniBtn']){
    for(const dim of ['x','y','width','height'])assert.ok(Math.abs(g[key][dim]-replayGeometry[key][dim])<1,`${width} same ${key} ${dim}`);
   }
   const bar=g['.viewer-header'],cap=g['.batch-selection-tools'],logout=g['#logoutMiniBtn'],filter=g['.replay-filter-strip'];assert.ok(filter.right<=cap.left+1);assert.ok(cap.right<logout.left);assert.ok(bar.height>=56&&bar.height<=64);
   const refresh=p.locator(mode==='channel'?'#channelRefresh':'#scanBtn');assert.equal(await refresh.isVisible(),true);assert.equal(await refresh.getAttribute('aria-label')!==null,true);
   const refreshBox=await refresh.boundingBox();assert.ok(refreshBox.x>=logout.right);assert.equal(Math.round(refreshBox.width),34);assert.equal(Math.round(refreshBox.height),34);
   const centers=await p.locator(selector+'.active,#saveSelectedBtn,#selectAllBtn,#logoutMiniBtn').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2;}));assert.ok(Math.max(...centers)-Math.min(...centers)<1,'same control centerline');
   const grid=await p.locator('.replay-grid').boundingBox();assert.ok(Math.abs(grid.x-bar.x)<1);assert.ok(Math.abs(grid.width-bar.width)<1);assert.equal(await p.locator('#selectedCount').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
   const original=await geometry(p);await p.locator('.pc-mode-count').evaluate(e=>e.textContent='1,000개');assert.deepEqual(await geometry(p),original,'count digits cannot shift tools');await p.evaluate(()=>FrommGlowME.syncNavigation());
   await snapshot(p,`${installed?'pwa-':''}${width}-${mode}-zero`);
   await p.locator('#selectAllBtn').click();assert.equal(await p.locator('#selectedCount').textContent(),'선택 13개');assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);assert.deepEqual(await geometry(p),original);await p.waitForFunction(()=>getComputedStyle(document.querySelector('#saveSelectedBtn')).color==='rgb(255, 255, 255)');await snapshot(p,`${installed?'pwa-':''}${width}-${mode}-selected`);await p.locator('#clearSelectionBtn').click();assert.deepEqual(await geometry(p),original);
   await p.locator(selector).nth(1).focus();await p.keyboard.press('Enter');await p.waitForFunction(mode=>(mode==='replay'?state.live.replayFilter:channelVideoState.channelId)==='b',mode);
   assert.equal(await p.locator('.pc-mode-count').textContent(),'7개');assert.equal(await p.locator('.replay-card').count(),7);assert.ok((await p.locator('.replay-title').allTextContents()).every(t=>t.startsWith('합성 b ')));
   assert.equal(await p.locator(selector+'.active').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.activeElement.dataset.replayFilter||document.activeElement.dataset.channelVideoFilter),'b');
   await p.evaluate(mode=>{if(mode==='replay')state.live.replayFilter='all';else channelVideoState.channelId='all';renderLiveView();},mode);assert.equal(await p.locator('.pc-mode-count').textContent(),'13개');
   await p.evaluate(mode=>{if(mode==='replay')state.live.replayFilter='b';else channelVideoState.channelId='b';renderLiveView();},mode);assert.equal(await p.locator('.pc-mode-count').textContent(),'7개','valid restored id survives');
   await p.evaluate(()=>{state.live.channels=state.live.channels.slice(0,1);renderLiveView();});assert.equal(await p.locator('.pc-mode-count').textContent(),'13개','removed subscription falls back to first');
   await p.evaluate(()=>scrollTo(0,600));assert.equal((await p.locator('.viewer-header').boundingBox()).y,12);await snapshot(p,`${installed?'pwa-':''}${width}-${mode}-scrolled`);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}: aligned header/count/filter/capsule/actions, 0/1/many subscriptions, all/valid/missing restore, selection scope, keyboard and sticky PASS`);
 }
 // Real loader selection after unknown subscriptions resolve. APIs only are mocked.
 const {page:p,context,errors}=await open(browser,server.url);const calls=[];let release,requested;
 const held=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
 await p.route('**/*',async route=>{let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
  if(u.pathname==='/channels'){requested();await held;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{channels:[{id:'a',channelName:'A',isSubscribed:true},{id:'b',channelName:'B',isSubscribed:true},{id:'locked',isSubscribed:false}]}})});}
  if(u.pathname==='/media/posts'){calls.push(u.searchParams.get('channelId'));return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{posts:[{id:'loaded',type:await p.evaluate(()=>state.live.centerMode)==='channel'?'video':'live_record',_channelId:u.searchParams.get('channelId'),title:'합성',displayStartAt:1791534600000}],isLast:true}})});}return route.fallback();
 });
 await p.evaluate(()=>{state.filter='live';state.live.centerMode='replay';state.live.channels=[];state.live.channelsLoaded=false;state.live.replayFilter='b';state.live.replayPosts=[];state.live.replayPaging.clear();void loadReplayCenter();});await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('channel request missing')),5000))]);assert.equal(await p.evaluate(()=>state.live.replayFilter),'b');release();await p.waitForFunction(()=>!state.live.replayLoading&&state.live.channelsLoaded);assert.deepEqual(calls,['b']);assert.equal(await p.locator('[data-replay-filter].active').getAttribute('data-replay-filter'),'b');
 calls.length=0;await p.evaluate(()=>{state.live.replayFilter='all';void loadReplayCenter({refresh:true});});await p.waitForFunction(()=>!state.live.replayLoading);assert.deepEqual(calls,['a']);assert.equal(await p.locator('[data-replay-filter="all"]').count(),0);await p.evaluate(()=>{state.live.centerMode='channel';channelVideoState.channelId='b';renderLiveView();videoListAuto.paused=true;videoListAuto.emptyPages=9;});calls.length=0;await p.locator('#channelRefresh').click();await p.waitForFunction(()=>!channelVideoState.loading&&channelVideoState.pages.get('b')?.loaded);assert.deepEqual(calls,['b']);assert.equal(await p.locator('.pc-mode-count').textContent(),'1개');assert.equal(await p.evaluate(()=>videoListAuto.paused),false);assert.equal(await p.evaluate(()=>videoListAuto.emptyPages),0);assert.deepEqual(errors,[]);await context.close();console.log('Real Channel refresh: scoped fetch, count update and pagination restart PASS');console.log('Replay loader: delayed valid selection and legacy all fetch only the selected subscribed channel PASS');
 const mobile=await open(browser,server.url,{width:390,height:844});for(const mode of ['replay','channel']){await seed(mobile.page,mode);assert.equal(await mobile.page.locator('.pc-mode-heading').isVisible(),false);assert.equal(await mobile.page.locator('.replay-card').count(),13);assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await snapshot(mobile.page,`390-${mode}`);}assert.deepEqual(mobile.errors,[]);await mobile.context.close();console.log('390 touch: existing headers/actions retained, shared scoped data correct, no overflow PASS');
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

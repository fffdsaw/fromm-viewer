'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const output=process.env.COLLECTION_HEADER_DIR;
const {seedCollection:seed,stableGeometry}=require('./helpers/collection-fixture.cjs');
async function snapshot(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.png')});}}
async function horizontalGap(section,following){
 const [left,right]=await Promise.all([section.boundingBox(),following.boundingBox()]);
 return Math.round(right.x-left.x-left.width);
}
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const [width,installed] of [[1440,false],[900,false],[760,false],[701,false],[900,true],[390,false],[320,false]]){
  const {page:p,context,errors}=await open(browser,server.url,{width,height:900,installed});await p.addStyleTag({content:'.replay-card,.media-card{transition:none!important;transform:none!important}'});await p.evaluate(()=>{for(const m of state.messages)if(['video','sound'].includes(m.type))m.content='https://fixture.test/header.'+(m.type==='video'?'mp4':'wav');});
  const headerGap=width>1100?21:15;
  for(const mode of ['replay','channel']){
   const selector=mode==='replay'?'[data-replay-filter]':'[data-channel-video-filter]';
   for(const n of [0,1,2]){
    await seed(p,mode,n);assert.equal(await p.locator(selector).count(),n);assert.equal(await p.locator('[data-replay-filter="all"]').count(),0);
    assert.equal(await p.evaluate(mode=>mode==='replay'?state.live.replayFilter:channelVideoState.channelId,mode),n?'a':'');assert.equal(await p.locator('.pc-mode-count').textContent(),n?'13개':'0개');
    assert.equal(await p.locator('.batch-selection-tools').isVisible(),false,'zero hides selection capsule');assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);
    if(n)assert.equal(await p.locator(selector+'.active').getAttribute('aria-pressed'),'true');
   }
   const header=await p.locator('.viewer-header').boundingBox(),row=await p.locator('.collection-action-row').boundingBox(),sort=await p.locator('#sortBtn').boundingBox();
   assert.ok(header.height>=110&&header.height<=128,'both collections share two-row header');assert.ok(row.y>header.y&&row.y+row.height<=header.y+header.height+1);assert.ok(sort.x+sort.width<=header.x+header.width-8);
   assert.equal(await p.locator('.pc-mode-heading').isVisible(),true);assert.equal(await p.locator(selector).first().isVisible(),true,'artist filters remain usable at every viewport');
   if(width>700)assert.equal(await horizontalGap(p.locator('.pc-mode-title'),p.locator(selector).first()),headerGap,'desktop title and filter use the shared header spacing');
   const refresh=p.locator(mode==='channel'?'#channelRefresh':'#scanBtn');assert.equal(await refresh.isVisible(),true);assert.ok(await refresh.getAttribute('aria-label'));
   if(mode==='channel'){assert.equal(await p.locator('[data-channel-content-menu]').textContent(),'전체 ');assert.equal(await p.locator('[data-channel-media-type]').count(),0);}
   await p.mouse.move(0,0);await p.waitForTimeout(180);const original=await stableGeometry(p);await snapshot(p,`${installed?'pwa-':''}${width}-${mode}-zero`);
   await p.locator('.replay-card').first().click({position:{x:24,y:24}});await p.waitForFunction(()=>FrommGlowME.capsule.phase==='shown');await p.mouse.move(0,0);await p.waitForTimeout(180);assert.equal(await p.locator('#selectedCount').textContent(),'선택 1개');
   assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);assert.deepEqual(await stableGeometry(p),original,'first selection does not move header, sort, list or scroll');
   const slot=await p.locator('#mediaSelectionSlot').boundingBox();assert.ok(slot.x>=0&&slot.x+slot.width<=width,'capsule stays in viewport');if(width>700)assert.ok(slot.x+slot.width<sort.x,'capsule grows to the left of fixed sort');
   await p.locator('#selectAllBtn').click();assert.equal(await p.locator('#selectedCount').textContent(),'선택 13개');assert.deepEqual(await stableGeometry(p),original);await snapshot(p,`${installed?'pwa-':''}${width}-${mode}-selected`);
   await p.locator('#clearSelectionBtn').click();await p.waitForFunction(()=>FrommGlowME.capsule.phase==='hidden');assert.deepEqual(await stableGeometry(p),original);assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);
   await p.locator(selector).nth(1).focus();await p.keyboard.press('Enter');await p.waitForFunction(mode=>(mode==='replay'?state.live.replayFilter:channelVideoState.channelId)==='b',mode);
   assert.equal(await p.locator('.pc-mode-count').textContent(),'7개');assert.equal(await p.locator('.replay-card').count(),7);assert.ok((await p.locator('.replay-title').allTextContents()).every(t=>t.startsWith('합성 b ')));
   assert.equal(await p.locator(selector+'.active').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.activeElement.dataset.replayFilter||document.activeElement.dataset.channelVideoFilter),'b');
   await p.evaluate(mode=>{if(mode==='replay')state.live.replayFilter='all';else channelVideoState.channelId='all';renderLiveView();},mode);assert.equal(await p.locator('.pc-mode-count').textContent(),'13개');
   await p.evaluate(mode=>{if(mode==='replay')state.live.replayFilter='b';else channelVideoState.channelId='b';renderLiveView();},mode);assert.equal(await p.locator('.pc-mode-count').textContent(),'7개','valid restored id survives');
   await p.evaluate(()=>{state.live.channels=state.live.channels.slice(0,1);renderLiveView();});assert.equal(await p.locator('.pc-mode-count').textContent(),'13개','removed subscription falls back to first');
   if(width===1440){
    const sort=p.locator('#sortBtn'),cards=p.locator('.replay-grid .replay-card');
    assert.equal(await p.locator('.collection-action-row > .pc-mode-count').innerText(),'13개');
    if(mode==='channel')assert.ok(await p.locator('.pc-mode-count + .channel-media-tabs').isVisible());
    const lastCard=await cards.last().boundingBox(),end=await p.locator('.video-list-end').boundingBox();
    assert.ok(end.y-(lastCard.y+lastCard.height)>=14,'terminal note clears the last card');
    assert.ok(await sort.evaluate(el=>{
     const label=el.querySelector('[data-sort-label]').getBoundingClientRect(),chevron=el.querySelector('svg').getBoundingClientRect();
     return Math.abs(label.top+label.height/2-chevron.top-chevron.height/2)<1;
    }));
    for(const [label,first] of [['과거순','합성 a 12'],['최신순','합성 a 0']]){
     await p.evaluate(()=>scrollTo(0,600));await sort.click();
     await p.waitForFunction(()=>scrollY===0);
     assert.equal(await sort.innerText(),label);
     assert.equal(await cards.first().locator('.replay-title').innerText(),first);
    }
   }
   await p.evaluate(()=>scrollTo(0,600));assert.equal((await p.locator('.viewer-header').boundingBox()).y,width<=700?8:12);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  for(const kind of ['media','sound','video','image']){
   await p.evaluate(kind=>{setFilter(kind);scrollTo(0,0);},kind);await p.mouse.move(0,0);await p.waitForTimeout(180);assert.equal(await p.locator('.collection-action-row').isVisible(),true);assert.equal(await p.locator('#sortBtn').isVisible(),true);assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);
   if(width>700)assert.equal(await horizontalGap(p.locator('#artistTitle'),p.locator('#artistMediaStats')),headerGap,'desktop artist title and statistics use the shared header spacing');
   if(width===1440){
    const sort=p.locator('#sortBtn'),list=p.locator('.media-card[data-message-id]');
    const endpoints=await p.evaluate(()=>{const items=filteredMessages();return [items.at(-1).messageId,items[0].messageId];});
    for(const [label,id] of [['과거순',endpoints[0]],['최신순',endpoints[1]]]){
     await p.evaluate(()=>scrollTo(0,600));
     await sort.click();
     await p.waitForFunction(()=>scrollY===0);
     assert.equal(await sort.innerText(),label);
     assert.equal(await list.first().getAttribute('data-message-id'),id);
    }
   }
   assert.equal(await p.locator('[data-channel-content-menu]').count(),0);const initial=await stableGeometry(p);await p.evaluate(()=>chooseDownloadItem('media',state.infiniteList[0]));await p.waitForFunction(()=>FrommGlowME.capsule.phase==='shown',null,{timeout:5000});await p.mouse.move(0,0);await p.waitForTimeout(180);assert.deepEqual(await stableGeometry(p),initial);await p.locator('#clearSelectionBtn').click();await p.waitForFunction(()=>FrommGlowME.capsule.phase==='hidden');assert.deepEqual(await stableGeometry(p),initial);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}${installed?' PWA':''}: six headers, subscriptions, real selection, keyboard, scope, fixed sort/scroll and responsive layout PASS`);
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

}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

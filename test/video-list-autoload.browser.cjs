'use strict';
// Real UI/observers and mocked API pages. No Fromm account or media originals.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]) for(const kind of ['replay','channel']){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
   const page=await context.newPage();
   const errors=[],requests=[];let active=0,maxActive=0,mode='normal',release,revision=0;
   const type=kind==='replay'?'live_record':'video';
   const post=(channel,i)=>({id:`${channel}-${i}`,num:100-i,type,title:`${kind} ${channel} ${i} v${revision}`,isVisible:true,displayStartAt:1791534600000-i*1000});
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='viewer.test')return route.fulfill({contentType:u.pathname.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,u.pathname.endsWith('.js')?path.basename(u.pathname):'index.html'))});
    if(!u.hostname.endsWith('frommyarti.com'))return route.abort();
    const json=data=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data})}).catch(()=>{});
    if(u.pathname!=='/media/posts')return json({liveRooms:[],channels:[]});
    const channel=u.searchParams.get('channelId'),cursor=u.searchParams.get('postId');
    requests.push({channel,cursor,mode});active++;maxActive=Math.max(maxActive,active);
    try{
     if(cursor&&mode==='hold'&&channel==='a')await new Promise(r=>{release=r;});
     else await wait(80);
     if(cursor&&mode==='empty')return await json({posts:[],isLast:false});
     if(cursor&&mode==='stuck')return await json({posts:Array.from({length:24},(_,i)=>post(channel,i)),isLast:false});
     // Next page repeats its boundary item; deduplication must preserve order.
     return await json({posts:Array.from({length:24},(_,i)=>post(channel,i+(cursor?23:0))),isLast:!!cursor});
    }finally{active--;}
   });
   await page.goto('https://viewer.test/index.html');
   await page.evaluate(({kind})=>{
    setActiveAuth('fixture','fixture','fixture');hideLoginGate();state.filter='live';
    state.live.channelsLoaded=true;state.live.channels=[{id:'a',channelName:'A'},{id:'b',channelName:'B'}];
    state.live.replayFilter='a';state.live.centerMode=kind;renderLiveView();
    if(kind==='replay')void loadReplayCenter();else void loadChannelVideos();
   },{kind});
   const cards=kind==='replay'?'[data-replay-post]':'[data-channel-video-card]';
   const more=kind==='replay'?'#replayLoadMore':'#channelLoadMore';
   const loaded=()=>page.waitForFunction(({kind,n})=>(kind==='replay'?visibleReplayPosts().length:channelVideoPage()?.posts.length)===n&&!(kind==='replay'?state.live.replayLoading:channelVideoState.loading),{kind,n:24});
   await loaded();
   assert.equal(await page.locator(more).isVisible(),false,'normal pagination has no visible button');
   assert.equal(await page.locator('.video-list-sentinel').count(),1,'one separate intersection target');
   // Plenty of rows: no eager DOM page commit before scrolling.
   await page.waitForTimeout(450);assert.equal(await page.locator(cards).count(),24);
   await page.locator(cards).last().scrollIntoViewIfNeeded();
   const anchor=await page.locator(cards).last().evaluate(el=>{window.pagingAnchor=el;return el.getBoundingClientRect().top;});
   await page.locator(cards).first().evaluate(el=>{window.firstCard=el;el.dataset.preserved='yes';el.classList.add('replay-downloading');el.querySelector('.replay-download-progress > span').style.width='37%';});
   await page.waitForFunction(cards=>document.querySelectorAll(cards).length===47,cards);
   assert.equal(await page.evaluate(()=>window.firstCard.isConnected&&window.firstCard.dataset.preserved==='yes'),true,'existing card DOM retained');
   const delta=await page.evaluate(top=>window.pagingAnchor.getBoundingClientRect().top-top,anchor);
   assert.ok(Math.abs(delta)<2,`append retains reading position: ${delta}`);
   const ids=await page.locator(cards).evaluateAll(els=>els.map(e=>e.dataset.replayPost||e.dataset.channelVideoCard));
   assert.equal(await page.evaluate(()=>window.firstCard.classList.contains('replay-downloading')&&window.firstCard.querySelector('.replay-download-progress > span').style.width==='37%'),true,'download progress survives page append');
   assert.equal(new Set(ids).size,47);assert.deepEqual(ids,Array.from({length:47},(_,i)=>`a-${i}`));
   assert.equal(await page.locator(more).count(),0,'end-of-list removes retry button');
   assert.equal(await page.locator('.video-list-sentinel').count(),0,'end-of-list removes observer target');
   const total=requests.length;await page.waitForTimeout(650);assert.equal(requests.length,total,'terminal page stops requests');
   assert.equal(requests.length,2,'initial and next page requested once, including Replay prefetch');
   assert.equal(maxActive,1,'one page per selected channel in flight, including prefetch reuse');
   // Preserved cards must not accumulate selection listeners on every render.
   await page.locator(cards).first().click();
   await page.waitForTimeout(350);
   assert.equal(await page.evaluate(kind=>downloadSelectionSet(kind).size,kind),1);
   // Same artist refresh, with a repeating cursor: stop automatically, allow manual retry.
   mode='stuck';revision++;
   await page.evaluate(kind=>{scrollTo(0,0);if(kind==='replay')void loadReplayCenter({refresh:true});else void loadChannelVideos({refresh:true});},kind);
   await loaded();
   assert.ok((await page.locator('.replay-title').first().textContent()).endsWith('v1'),'explicit refresh replaces stale metadata');
   await page.locator(cards).last().scrollIntoViewIfNeeded();
   await page.waitForFunction(kind=>videoListError(kind),kind);
   assert.equal(await page.locator(more).isVisible(),true,'failure exposes retry');
   assert.equal(await page.locator(more).textContent(),'다시 시도');
   const failed=requests.length;await page.waitForTimeout(850);assert.equal(requests.length,failed,'non-progress response cannot loop');
   mode='empty';await page.locator(more).click();
   await page.waitForFunction(kind=>videoListError(kind)&&!(kind==='replay'?state.live.replayLoading:channelVideoState.loading),kind);
   const empty=requests.length;await page.waitForTimeout(850);assert.equal(requests.length,empty,'empty nonterminal response cannot loop');
   mode='normal';await page.locator(more).click();
   assert.equal(await page.locator(more).isVisible(),false,'retry hides again when automatic loading resumes');
   await page.waitForFunction(cards=>document.querySelectorAll(cards).length===47,cards);
   // Opening the player while the next page is pending must keep that player mounted.
   // The detail fixture deliberately has no stream; real decode is covered by replay/channel-player tests.
   mode='hold';
   await page.evaluate(kind=>{scrollTo(0,0);if(kind==='replay')void loadReplayCenter({refresh:true});else void loadChannelVideos({refresh:true});},kind);
   await loaded();await page.locator(cards).last().scrollIntoViewIfNeeded();
   for(let attempt=0;!release&&attempt<400;attempt++)await wait(20);
   assert.ok(release,'pending page before opening player');
   await page.locator(kind==='replay'?'.replay-play':'.channel-video-play').last().click();
   const player=kind==='replay'?'.replay-player-page':'.channel-player';
   await page.locator(player+' .replay-error').waitFor();
   await page.locator(player).evaluate(el=>{window.pendingPagePlayer=el;});
   mode='normal';release();release=null;
   await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>window.pendingPagePlayer.isConnected),true,'list response cannot recreate an opened player');
   await page.locator(kind==='replay'?'#replayBackToList':'#channelBackToList').click();
   // A pending page from A must not overwrite B or clear B's loading state.
   mode='hold';
   await page.evaluate(kind=>{scrollTo(0,0);if(kind==='replay')void loadReplayCenter({refresh:true});else void loadChannelVideos({refresh:true});},kind);
   await loaded();
   await page.locator(cards).last().scrollIntoViewIfNeeded();
   for(let attempt=0;!release&&attempt<400;attempt++)await wait(20);
   assert.ok(release,"pending next-page request started");
   const filter=kind==='replay'?'[data-replay-filter="b"]':'[data-channel-video-filter="b"]';
   await page.locator(filter).click();
   await page.waitForFunction(({kind})=>kind==='replay'?state.live.replayFilter==='b'&&visibleReplayPosts().length===24&&!state.live.replayLoading:channelVideoState.channelId==='b'&&channelVideoPage()?.posts.length===24&&!channelVideoState.loading,{kind});
   mode='normal';release();release=null;
   await page.waitForTimeout(350);
   assert.ok((await page.locator(cards).evaluateAll(els=>els.map(e=>e.dataset.replayPost||e.dataset.channelVideoCard))).every(id=>id.startsWith('b-')),'stale artist response discarded');
   // Logout while observed: scrolling may not send another request.
   await page.evaluate(()=>{setActiveAuth();state.filter='all';document.querySelector('#timeline').replaceChildren();});
   const loggedOut=requests.length;await page.mouse.wheel(0,2000);await page.waitForTimeout(450);assert.equal(requests.length,loggedOut);
   assert.deepEqual(errors,[]);
   console.log(`${width} ${kind}: automatic append, dedup/order, DOM/scroll/selection, terminal/stuck cursor, manual retry, artist race and logout PASS`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

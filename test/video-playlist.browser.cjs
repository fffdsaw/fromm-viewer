'use strict';
// Real MP4 endings and the existing authenticated detail/history paths, all synthetic.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-queue-')),file=path.join(temp,'video.mp4');
 execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12','-t','8','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',file]);
 const host=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:568,height:320}]){
  const {page,context,errors}=await open(browser,host.url,viewport),detailCalls=[];
  await page.route('**/queue-*.mp4',route=>route.fulfill({contentType:'video/mp4',body:fs.readFileSync(file)}));
  let deny=false,listFailure=false,listed=[],listPages=[],listCursors=[],pagedPosts=null;
  await page.route('**/*',route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data})});
   if(u.pathname==='/media/posts'){const cursor=u.searchParams.get('postId');listCursors.push(cursor);if(pagedPosts){const start=cursor?pagedPosts.findIndex(p=>p.id===cursor)+1:0,end=start+Number(u.searchParams.get('limit')||50);return json({posts:pagedPosts.slice(start,end),isLast:end>=pagedPosts.length});}return json(listFailure?{posts:[],isLast:false}:listPages.shift()||{posts:listed,isLast:true},listFailure?503:200);}
   if(u.pathname.startsWith('/media/posts/')){
    const id=u.pathname.split('/').at(-1);detailCalls.push(id);
    return json({post:{id,type:id.startsWith('r')?'live_record':'video',isVisible:true,title:'합성 영상 '+id,url:host.url+'queue-'+id+'.mp4'}},deny?403:200);
   }
   return route.fallback();
  });
  for(const kind of ['replay','channel']){
   await page.evaluate(kind=>{
    stopReplayPlayback();stopChannelVideoPlayback();state.filter='live';state.live.centerMode=kind;state.live.channelsLoaded=true;state.live.channels=[{id:'fixture-channel',channelName:'합성 채널',isSubscribed:true}];state.live.replayFilter='fixture-channel';
    const posts=Array.from({length:3},(_,i)=>({id:(kind==='replay'?'r':'c')+i,type:kind==='replay'?'live_record':'video',title:'합성 영상 '+i,displayStartAt:1791534600000-i*1000,isVisible:true,_channelId:'fixture-channel',_channelName:'합성 채널'}));
    if(kind==='replay'){state.live.replayPosts=posts;replayPagingFor('fixture-channel').isLast=true;renderLiveView();}
    else{channelVideoState.channelId='fixture-channel';channelVideoState.pages.set('fixture-channel',{posts,isLast:true,loaded:true});renderLiveView();}
   },kind);
   const prefix=kind==='replay'?'r':'c';
   await page.evaluate(({kind,prefix})=>kind==='replay'?playReplay(prefix+'0','fixture-channel'):playChannelVideo(prefix+'0'),{kind,prefix});
   const video=page.locator(kind==='replay'?'#replayVideo':'#channelVideo'),toggle=page.getByRole('button',{name:'재생목록',exact:true});
   await video.evaluate(async el=>{if(el.readyState<2)await new Promise(r=>el.addEventListener('loadeddata',r,{once:true}));el.pause();});
   // The icon shares the existing fade carrier and idle clock. A real pointer
   // move reveals both; pausing also makes both available without another timer.
   await video.evaluate(el=>{el.muted=true;el.currentTime=0;void el.play();});await page.mouse.move(1,1);
   await page.waitForFunction(()=>document.querySelector('.modern-video-controls')?.classList.contains('mvc-hidden'));
   await toggle.waitFor({state:'hidden'});assert.equal(await toggle.isVisible(),false,'playlist icon disappears with idle transport controls');assert.equal(await video.evaluate(el=>getComputedStyle(el).cursor),'none','normal-size idle player hides the cursor too');
   await video.hover();await toggle.waitFor({state:'visible'});assert.notEqual(await video.evaluate(el=>getComputedStyle(el).cursor),'none','pointer movement restores the cursor');await video.evaluate(el=>el.pause());
   await toggle.click();await page.locator('.video-playlist-auto input').click();assert.equal(await toggle.getAttribute('aria-expanded'),'true','inside interactions do not dismiss the queue');await page.locator('.video-playlist-auto input').click();
   if(viewport.width===390)await page.touchscreen.tap(2,2);else await page.mouse.click(2,2);assert.equal(await toggle.getAttribute('aria-expanded'),'false','clicking outside the queue dismisses it without a video change');
   const surfacePoint=()=>video.evaluate(el=>{const r=el.getBoundingClientRect();for(const fy of [.02,.2,.5,.8])for(const fx of [.01,.1,.3,.5]){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(x>0&&y>0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)===el)return{x,y};}throw Error('No exposed video surface');});
   const hitSurface=async()=>{const p=await surfacePoint();if(viewport.width===390)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
   for(const paused of [false,true]){
    await video.evaluate(async(el,paused)=>{el.currentTime=0;if(paused)el.pause();else await el.play();},paused);await video.hover();await toggle.click();await hitSurface();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await video.evaluate(el=>el.paused),paused,'dismissing the queue preserves playing/paused state');
    await hitSurface();assert.equal(await video.evaluate(el=>el.paused),!paused,'a subsequent ordinary click still controls playback');
   }
   await video.evaluate(el=>el.pause());await toggle.click();await page.locator('[data-mvc="play"]').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await video.evaluate(el=>el.paused),false,'explicit play button still works while closing the queue');await video.evaluate(el=>el.pause());
   for(const button of [page.locator('.replay-page-back'),page.locator('.replay-page-download')]){assert.equal((await button.textContent()).trim(),'','header uses icons only');assert.ok(await button.getAttribute('aria-label'));await require('./helpers/clear-controls.cjs').plain(page,await button.getAttribute('class').then(c=>'.'+c.split(' ')[0]));}
   const before=await video.boundingBox();await toggle.click();await page.waitForTimeout(280);
   assert.deepEqual(await video.boundingBox(),before,'drawer never resizes the video');assert.equal(await toggle.textContent(),'','icon only');
   const drawer=page.locator('.video-playlist-drawer');assert.equal(await drawer.locator('[aria-current="true"]').count(),1);
   for(const theme of ['glow','sky','lavender','classic']){await page.evaluate(theme=>FrommThemes.set(theme),theme);const colors=await drawer.evaluate(el=>{const probe=document.createElement('span');probe.style.color='var(--theme-text)';probe.style.backgroundColor='var(--theme-card)';document.body.append(probe);const expected={text:getComputedStyle(probe).color,bg:getComputedStyle(probe).backgroundColor},actual={text:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor};probe.remove();return{expected,actual};});assert.deepEqual(colors.actual,colors.expected,theme+' updates the visible drawer palette');}
   const rect=await drawer.boundingBox();assert.ok(rect.height>200&&rect.x>=0&&rect.x+rect.width<=viewport.width+1&&rect.y>=0&&rect.y+rect.height<=viewport.height+1,JSON.stringify({viewport,rect}));
   assert.ok(await drawer.locator('.video-playlist-items').evaluate(el=>el.clientHeight>=50),'at least one scrollable queue row remains reachable');
   await drawer.locator('[data-queue-index="1"]').click();await page.waitForFunction(({kind,prefix})=>(kind==='replay'?state.live.replaySelected:channelVideoState.selected)?.id===prefix+'1',{kind,prefix});
   await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo')?.readyState>=2,kind);assert.ok(detailCalls.includes(prefix+'1'),'queue choice fetches fresh authenticated detail');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false','selecting a video closes the queue');
   await video.evaluate(el=>{el.dataset.completed='';el.addEventListener('ended',()=>el.dataset.completed='yes',{once:true});el.currentTime=el.duration-.2;el.playbackRate=8;void el.play();});
   await page.waitForFunction(({kind,prefix})=>(kind==='replay'?state.live.replaySelected:channelVideoState.selected)?.id===prefix+'2',{kind,prefix});
   await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo')?.readyState>=2,kind);
   assert.ok(detailCalls.includes(prefix+'2'),'closed drawer still advances through fresh detail');
   await toggle.click();await page.locator('.video-playlist-auto input').uncheck();
   await page.locator('[data-queue="prev"]').click();await page.waitForFunction(({kind,prefix})=>(kind==='replay'?state.live.replaySelected:channelVideoState.selected)?.id===prefix+'1',{kind,prefix});
   await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo')?.readyState>=2,kind);
   await video.evaluate(el=>{el.currentTime=el.duration-.2;el.playbackRate=8;void el.play();});
   await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo')?.ended,kind);
   assert.equal(await video.evaluate(el=>el.currentTime===el.duration),true,'large video retains its end position when automatic next is off');
   assert.equal(await page.evaluate(kind=>(kind==='replay'?state.live.replaySelected:channelVideoState.selected).id,kind),prefix+'1');
   await toggle.click();await page.locator('[data-queue="next"]').click();await page.waitForFunction(({kind,prefix})=>(kind==='replay'?state.live.replaySelected:channelVideoState.selected)?.id===prefix+'2',{kind,prefix});
   await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo')?.readyState>=2,kind);assert.equal(await page.locator('[data-queue="next"]').isDisabled(),true,'last item does not wrap');
   await toggle.click();await page.getByRole('button',{name:'재생목록 닫기'}).press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.click();await page.locator('.video-playlist-auto input').check();
   if(process.env.PLAYLIST_DIR){fs.mkdirSync(process.env.PLAYLIST_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.PLAYLIST_DIR,kind+'-'+viewport.width+'.png')});}
   if(kind==='channel'){deny=true;await page.locator('[data-queue="prev"]').click();await page.waitForFunction(()=>!!channelVideoState.playerError);assert.equal(await page.locator('#channelVideo').count(),0,'permission denial stops playback');assert.equal(await page.locator('.video-playlist-toggle').count(),0,'old queue owners are disposed after denial');deny=false;await page.goBack();await page.waitForFunction(()=>!channelVideoState.selected);assert.ok(!page.url().includes('#channel='),'one Back reaches Channel list after queue navigation');}
   else{await page.goBack();await page.waitForFunction(()=>!state.live.replaySelected);}
  }
  if(viewport.width===1440){
   // The entire queue is one scrollable list. Opening loads remaining pages;
   // failures preserve its cursor/video, and reopening follows the current row.
   await page.evaluate(()=>{
    state.filter='live';state.live.centerMode='channel';channelVideoState.channelId='fixture-channel';
    const posts=Array.from({length:51},(_,i)=>({id:'c'+i,num:100-i,type:'video',isVisible:true,title:'목록 영상 '+i,displayStartAt:1791534600000-i*1000,_channelId:'fixture-channel'}));
    channelVideoState.pages.set('fixture-channel',{posts,lastPost:posts.at(-1),isLast:false,loaded:true});
   });
   await page.evaluate(()=>playChannelVideo('c50'));await page.waitForFunction(()=>document.querySelector('#channelVideo')?.readyState>=2);
   await page.locator('#channelVideo').evaluate(el=>el.pause());listFailure=true;
   const toggle=page.locator('.video-playlist-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   const drawer=page.locator('.video-playlist-drawer');assert.equal(await drawer.locator('[data-queue-index]').count(),51,'no 50-row cutoff');assert.equal(await drawer.locator('.video-playlist-pages').count(),0);await page.waitForFunction(()=>document.querySelector('.video-playlist-notice')?.textContent.includes('다시 시도'));
   assert.equal(await page.evaluate(()=>channelVideoPage().posts.length),51);assert.equal(await page.evaluate(()=>channelVideoState.selected.id),'c50');
   listFailure=false;const extra=Array.from({length:20},(_,i)=>({id:'c'+(51+i),num:49-i,type:'video',isVisible:true,title:'추가 영상 '+i,displayStartAt:1791534600000-(51+i)*1000}));listPages=[{posts:extra.slice(0,15),isLast:false},{posts:extra.slice(15),isLast:true}];
   await drawer.locator('[data-queue="more"]').click();await page.waitForFunction(()=>channelVideoPage().posts.length===71&&!channelVideoState.loading);assert.equal(await drawer.locator('[data-queue-index]').count(),71,'all remaining pages append automatically');assert.ok(listCursors.includes('c65'),'raw cursor continues to the last page');assert.equal(detailCalls.includes('c51'),false,'loading a queue does not open its videos');
   await drawer.locator('.video-playlist-items').evaluate(el=>el.scrollTop=0);await drawer.locator('[data-queue="close"]').click();await toggle.click();
   await page.waitForFunction(()=>{const row=document.querySelector('.video-playlist-item[aria-current="true"]'),list=document.querySelector('.video-playlist-items'),r=row.getBoundingClientRect(),box=list.getBoundingClientRect();return list.scrollTop>0&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});
   await drawer.locator('[data-queue="close"]').click();
   await page.locator('#channelVideo').evaluate(el=>{el.currentTime=el.duration-.2;el.playbackRate=8;void el.play();});
   await page.waitForFunction(()=>channelVideoState.selected?.id==='c51');await page.waitForFunction(()=>document.querySelector('#channelVideo')?.readyState>=2);
   assert.ok(detailCalls.includes('c51'),'auto next crosses a fetched page through the permission detail API');
   await toggle.click();await page.locator('[data-queue-index="70"]').click();await page.waitForFunction(()=>channelVideoState.selected?.id==='c70'&&document.querySelector('#channelVideo')?.readyState>=2);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.click();await page.waitForFunction(()=>{const row=document.querySelector('.video-playlist-item[aria-current="true"]'),list=document.querySelector('.video-playlist-items'),r=row.getBoundingClientRect(),box=list.getBoundingClientRect();return list.scrollTop>0&&r.top>=box.top-1&&r.bottom<=box.bottom+1;});await page.getByRole('button',{name:'재생목록 닫기'}).click();
   await page.locator('#channelVideo').evaluate(el=>{el.currentTime=el.duration-.2;el.playbackRate=8;void el.play();});await page.waitForFunction(()=>document.querySelector('#channelVideo')?.ended);
   assert.equal(await page.evaluate(()=>channelVideoState.selected.id),'c70','automatic next stops at the actual queue end');
   // A late permission response cannot reopen a player after leaving its tab.
   let releaseDetail;const hold=new Promise(resolve=>releaseDetail=resolve);
   await page.route('**/*',async route=>{
    let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
    if(u.pathname!=='/media/posts/c0')return route.fallback();await hold;
    await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{post:{id:'c0',type:'video',isVisible:true,url:host.url+'queue-c0.mp4'}}})}).catch(()=>{});
   });
   if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   const pendingDetail=page.waitForRequest(request=>{let u=new URL(request.url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));return u.pathname==='/media/posts/c0';});await drawer.locator('[data-queue-index="0"]').click();await pendingDetail;
   await page.evaluate(()=>setFilter('image'));releaseDetail();await page.waitForTimeout(300);
   assert.equal(await page.locator('.video-playlist-toggle,#channelVideo').count(),0);assert.equal(await page.evaluate(()=>state.filter),'image');
  }
  if(viewport.width===1440){
   pagedPosts=Array.from({length:365},(_,i)=>({id:'r'+i,num:1000-i,type:'live_record',isVisible:true,title:'긴 Replay '+i,displayStartAt:1791534600000-i*1000,_channelId:'fixture-channel'}));
   await page.evaluate(posts=>{stopChannelVideoPlayback();stopReplayPlayback();state.filter='live';state.live.centerMode='replay';state.live.replayFilter='fixture-channel';state.live.replayPosts=posts;state.live.replayPaging.clear();Object.assign(replayPagingFor('fixture-channel'),{loaded:true,lastPost:posts.at(-1),isLast:false});},pagedPosts.slice(0,30));
   await page.evaluate(()=>playReplay('r14','fixture-channel'));await page.waitForFunction(()=>document.querySelector('#replayVideo')?.readyState>=2);await page.locator('#replayVideo').evaluate(el=>el.pause());
   const toggle=page.locator('.video-playlist-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   await page.waitForFunction(()=>state.live.replayPosts.length===365&&replayPagingFor('fixture-channel').isLast&&!state.live.replayLoading);
   assert.equal(await page.locator('.video-playlist-item').count(),365);assert.equal(await page.locator('.video-playlist-notice').textContent(),'');assert.equal(await page.locator('.video-playlist-count').textContent(),'15 / 365');
   assert.equal(detailCalls.includes('r364'),false,'large queue only loads metadata');await page.locator('[data-queue="close"]').click();pagedPosts=null;await page.evaluate(()=>stopReplayPlayback());
  }
  if(viewport.width===1440){
   // Hash/login restoration can create the existing player before this asset
   // arrives. Loading the real module late must attach to that engine too.
   await page.evaluate(()=>{window.FrommVideoPlaylist=undefined;state.filter='live';state.live.centerMode='channel';});
   await page.evaluate(()=>playChannelVideo('c1'));await page.waitForFunction(()=>document.querySelector('#channelVideo')?.readyState>=2);
   assert.equal(await page.locator('.video-playlist-toggle').count(),0);
   await page.addScriptTag({url:host.url+'web-video-playlist.js?late-asset-fixture=1'});
   assert.equal(await page.getByRole('button',{name:'재생목록',exact:true}).count(),1,'late asset attaches to the restored player');
   await page.getByRole('button',{name:'재생목록',exact:true}).click();await page.getByRole('button',{name:'재생목록 닫기'}).click();
   await page.evaluate(()=>stopChannelVideoPlayback());
  }
  // Enlarged conversation/gallery videos use the same drawer, not the compact reset.
  await page.evaluate(()=>{state.filter='video';state.messages=Array.from({length:2},(_,i)=>({messageId:'big-'+i,type:'video',userType:'star',content:new URL('queue-big'+i+'.mp4',location.href).href,createdAt:1791534600000+i*1000}));state.chatMessages=state.messages;state.chatHistoryComplete=true;buildMediaSequences();render();openVideoLightbox(proxyUrl(filteredMessages()[0],false));});
  await page.waitForFunction(()=>document.querySelector('#lightboxVideo').readyState>=2);
  if(viewport.width===1440){
   const video=page.locator('#lightboxVideo'),toggle=page.locator('#imageLightbox .video-playlist-toggle');
   await video.evaluate(async el=>{el.muted=true;el.currentTime=0;await el.play();});await page.mouse.move(1,1);await toggle.waitFor({state:'hidden'});
   assert.equal(await video.evaluate(el=>getComputedStyle(el).cursor),'none','enlarged native player hides idle cursor');
   await video.hover();await toggle.waitFor({state:'visible'});await video.evaluate(el=>el.pause());
   for(const paused of [false,true]){await video.evaluate(async(el,paused)=>{el.currentTime=0;if(paused)el.pause();else await el.play();},paused);await toggle.click();await video.click({position:{x:25,y:25}});assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await video.evaluate(el=>el.paused),paused,'native enlarged-player dismissal also preserves playback');}
  }
  await page.locator('#imageLightbox .video-playlist-toggle').click();await page.locator('#imageLightbox [data-queue="next"]').click();
  await page.waitForFunction(()=>document.querySelector('#lightboxVideo').getAttribute('src').includes('queue-big0.mp4'));assert.equal(await page.locator('#imageLightbox .video-playlist-toggle').getAttribute('aria-expanded'),'false','enlarged media also dismisses after choosing');
  await page.evaluate(()=>closeImageLightbox());assert.equal(await page.locator('#imageLightbox .video-playlist-drawer').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}x${viewport.height}: Replay/Channel drawer, real end→next, manual/off/last, fresh detail, history, enlarged media and cleanup PASS`);
 }}finally{await browser.close();await host.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

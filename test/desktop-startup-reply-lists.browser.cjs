'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();let release=()=>{};try{
 // A cold browser must build the navigation before a slow Native bridge loads.
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let nativeHeld=false,markNative;const nativeStarted=new Promise(r=>markNative=r);
 const held=new Promise(r=>release=r);await page.route('**/web-native-live.js*',async route=>{nativeHeld=true;markNative();await held;await route.continue();});
 await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#94d9c4"/></svg>'}));
 await page.goto(server.url,{waitUntil:'commit'});await page.waitForFunction(()=>document.documentElement.classList.contains('glowme-shell-ready'));await nativeStarted;assert.equal(nativeHeld,true);assert.equal(await page.locator('.glowme-nav button').count(),9);assert.equal(await page.locator('.toolbar > [data-filter]').count(),0);await seed(page);
 await page.locator('#sidebar').hover({position:{x:20,y:20}});await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().width>260);
 const logo=await page.locator('.rail-head .brand img').boundingBox(),rail=await page.locator('#sidebar').boundingBox();assert.ok(Math.abs(logo.x+logo.width/2-rail.x-rail.width/2)<2,'brand is centered in expanded rail');
 const sound=page.locator('[data-glow-nav="sound"]');await sound.hover();await page.waitForFunction(()=>document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));
 const selected=await page.locator('.glowme-nav [aria-current="page"]').evaluate(el=>({background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow,weight:getComputedStyle(el).fontWeight}));assert.equal(selected.background,'rgba(0, 0, 0, 0)');assert.equal(selected.shadow,'none');assert.equal(selected.weight,'700');
 if(process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR){fs.mkdirSync(process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR,{recursive:true});await page.waitForTimeout(200);await page.screenshot({path:process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR+'/sidebar-single-highlight.png'});}
 release();await page.waitForLoadState();assert.deepEqual(errors,[]);await context.close();console.log('PC cold Native delay: ready sidebar, centered logo and single hover background PASS');
 // Delayed shell JS never exposes raw wrapped room names or duplicate tabs.
 const boot=await browser.newContext({viewport:{width:1440,height:900}}),bp=await boot.newPage();const shellHeld=new Promise(r=>release=r);await bp.route('**/web-glowme.js',async route=>{await shellHeld;await route.continue();});
 await bp.goto(server.url,{waitUntil:'commit'});await bp.waitForFunction(()=>typeof state==='object'&&!!document.querySelector('.sidebar-toggle-slot'));
 assert.equal(await bp.locator('#sidebar .sub').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await bp.locator('.toolbar').evaluate(e=>getComputedStyle(e).visibility),'hidden');release();await bp.waitForFunction(()=>document.documentElement.classList.contains('glowme-shell-ready'));await boot.close();console.log('PC delayed shell: legacy rail/tabs stay hidden until ready PASS');
 const failed=await browser.newContext(),fp=await failed.newPage();await fp.route('**/web-glowme.js',route=>route.abort());await fp.goto(server.url);assert.equal(await fp.locator('#shellStartupNotice').isVisible(),true);await failed.close();console.log('PC shell network failure: explicit reload notice PASS');
 const fixture=await open(browser,server.url,{width:1440,height:900});const p=fixture.page;
 await p.evaluate(async()=>{
  Object.assign(replyIdentity,{context:replyAuthContext(),status:'ready',id:'mine'});
  state.chatMessages=Array.from({length:4000},(_,i)=>({messageId:'m'+i,type:'text',userType:'star',content:'합성 대화 '+i,createdAt:1791534600000+i*60000,...(i===2500?{mentionedMessage:{messageId:'original',userId:'mine',content:'내 합성 원문'}}:{})}));state.messages=state.chatMessages;
  renderChatWindow(filteredMessages(),1200);FrommViewState.enter('all',{autoTop:false});scrollTo(0,18000);FrommViewState.capture();await setOnlyMyReplies(true);
 });await p.waitForTimeout(450);assert.equal(await p.locator('.chat-match-active').getAttribute('data-message-id'),'m2500');const target=await p.locator('.chat-match-active').boundingBox();assert.ok(target.y>=10&&target.y<30);assert.equal(await p.locator('#chatMatchPosition').innerText(),'1 / 1');assert.ok(await p.locator('.msg').count()>1,'surrounding conversation remains visible');console.log('PC reply: pending scroll restore cancelled before first-match DOM jump PASS');
 await p.evaluate(()=>{state.filter='live';state.live.centerMode='channel';channelVideoState.channelId='c';state.live.channels=[{id:'c',channelName:'합성 채널'}];channelVideoState.pages.set('c',{posts:[{id:'v',type:'video',title:'합성 영상',_channelId:'c'}],loaded:true,isLast:true});channelVideoState.loading=false;channelVideoState.error='';channelVideoState.notice='';renderLiveView();});
 assert.equal(await p.locator('#channelLoadStatus').isVisible(),true);assert.match(await p.locator('#channelLoadStatus').innerText(),/더 불러올 영상이 없습니다/);assert.equal(await p.locator('#channelLoadMore').count(),0);
 await p.evaluate(()=>{channelVideoPage().isLast=false;renderLiveView();});assert.equal(await p.locator('#channelLoadStatus').isVisible(),false,'unfinished feed is not announced as exhausted');
 await p.evaluate(()=>{channelVideoPage().isLast=true;channelVideoState.error='합성 오류';renderLiveView();});assert.equal(await p.locator('#channelLoadStatus').isVisible(),false,'failure is not announced as exhaustion');
 await p.evaluate(()=>{state.live.centerMode='replay';state.live.replayFilter='all';state.live.replayPosts=[{id:'r',type:'live_record',title:'합성 Replay',_channelId:'c'}];state.live.replayPaging=new Map([['c',{isLast:true}]]);state.live.replayLoading=false;state.live.replayError='';renderLiveView();});
 assert.equal(await p.locator('.video-list-end').count(),1);assert.equal(await p.locator('#replayLoadMore').count(),0);
 await p.evaluate(()=>{replayPagingFor('c').isLast=false;renderLiveView();});assert.equal(await p.locator('.video-list-end').count(),0);await p.evaluate(()=>{replayPagingFor('c').isLast=true;state.live.replayError='합성 오류';renderLiveView();});assert.equal(await p.locator('.video-list-end').count(),0);
 assert.deepEqual(fixture.errors,[]);await fixture.context.close();console.log('PC Channel/Replay: confirmed exhaustion only; partial/error states preserved PASS');
}finally{release();await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

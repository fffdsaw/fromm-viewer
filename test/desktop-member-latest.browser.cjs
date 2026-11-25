'use strict';
// Public artist names and synthetic posts/history only. Never uses a signed-in session.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const {seedCollection}=require('./helpers/collection-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});try{
 const {page,context,errors}=await open(browser,server.url,{width:1440});
 await seedCollection(page,'channel',2,'a');
 await page.evaluate(()=>{
  channelVideoState.mediaType='artist';channelVideoState.pages.set(channelVideoPageKey(),{posts:[],loaded:true,isLast:true});renderLiveView();
 });
 await page.locator('[data-channel-member-menu]').click();await page.locator('[data-morph-value]').first().waitFor();
 const names=await page.locator('[data-morph-value]').allTextContents();
 assert.deepEqual(names,['멤버 전체','송하영','박지원','이채영','이나경','백지헌'],'full birthdate roster before any posts');
 const out=process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR;if(out){fs.mkdirSync(out,{recursive:true});await page.waitForTimeout(350);await page.screenshot({path:out+'/members-before-posts.png'});}
 await page.locator('[data-morph-value="artist:송하영"]').click();
 await page.evaluate(()=>{
  const card=author=>channelArtistCards({id:author.id,isVisible:true,isOfficialPost:false,author,createdAt:1791534600000,media:[{mediaType:'image',url:'https://fixture.test/photo.svg'}]},{id:'a',channelName:'fromis_9'});
  channelVideoPage().posts.push(...card({id:'synthetic-hayoung',name:'SONG HA YOUNG'}),...card({id:'synthetic-jiwon',name:'박지원'}));renderLiveView();
 });
 assert.deepEqual(await page.evaluate(()=>visibleChannelPosts().map(p=>p._artistMemberKey)),['artist:송하영'],'future post author IDs match pre-load selection');
 await page.evaluate(async()=>{await setFilter('media');state.messages=Array.from({length:2},(_,i)=>({messageId:'check-'+i,type:'image',userType:'star',content:'https://fixture.test/photo.svg',createdAt:1791534600000+i*1000}));state.chatMessages=state.messages;state.selected=new Set(['check-0']);buildMediaSequences();render();});
 assert.equal(await page.locator('#selectAllBtn').getAttribute('aria-pressed'),'false');
 const empty=await page.locator('#selectAllBtn').evaluate(el=>getComputedStyle(el,'::before').maskImage);if(out)await page.screenshot({path:out+'/selection-partial.png'});
 await page.locator('#selectAllBtn').click();
 assert.equal(await page.locator('#selectAllBtn').getAttribute('aria-pressed'),'true');
 const checked=await page.locator('#selectAllBtn').evaluate(el=>getComputedStyle(el,'::before').maskImage);assert.notEqual(checked,empty);if(out)await page.screenshot({path:out+'/selection-all.png'});
 await page.locator('#selectAllBtn').click();assert.equal(await page.locator('#selectAllBtn').getAttribute('aria-pressed'),'false');
 await page.evaluate(async()=>{
  await setFilter('all');state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'latest-'+i,userType:'star',type:'text',content:'합성 최신 이동 '+i,createdAt:1791534600000+i*60000}));state.messages=state.chatMessages;state.chatHistoryComplete=true;state.chatQuery='';render();
 });
 await page.waitForTimeout(400);
 async function start(){return page.evaluate(()=>{
  FrommViewState.cancel();renderChatWindow(filteredMessages(),300);scrollTo({top:2600,behavior:'instant'});
  const anchor=[...document.querySelectorAll('#timeline [data-message-id]')].find(el=>el.getBoundingClientRect().top>chatHeaderInset()),offset=anchor.getBoundingClientRect().top;
  window.latestJourney=[];FrommViewState.toLatest();const delta=anchor.getBoundingClientRect().top-offset;
  const sample=()=>{latestJourney.push(scrollY);if(FrommViewState.returning)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  return{delta,count:document.querySelectorAll('#timeline .msg').length};
 });}
 const first=await start();assert.ok(Math.abs(first.delta)<1);assert.ok(first.count<1000);
 await page.waitForFunction(()=>!FrommViewState.returning&&state.infiniteRendered===state.infiniteList.length);
 const frames=await page.evaluate(()=>latestJourney);
 assert.ok(new Set(frames.slice(0,-1).map(Math.round)).size>=3,'actual downward animation');
 assert.ok(frames.slice(0,-1).every((y,i)=>!i||y>=frames[i-1]-1),'no upward reversal during motion');
 assert.equal(await page.locator('#timeline .msg').last().getAttribute('data-message-id'),'latest-2999');if(out)await page.screenshot({path:out+'/latest-arrival.png'});
 await start();await page.waitForTimeout(100);await page.mouse.wheel(0,-250);await page.waitForFunction(()=>!FrommViewState.returning);await page.waitForTimeout(700);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight-scrollY-innerHeight>100),'manual movement cancels latest following');
 const count=await page.evaluate(()=>{const ids=[...document.querySelectorAll('#timeline .msg')].map(e=>e.dataset.messageId);return{unique:new Set(ids).size,count:ids.length,start:state.chatWindowStart,end:state.infiniteRendered,first:ids[0],last:ids.at(-1)};});
 assert.equal(count.unique,count.count);assert.equal(count.first,'latest-'+count.start);assert.equal(count.last,'latest-'+(count.end-1));
 await page.emulateMedia({reducedMotion:'reduce'});await start();assert.equal(await page.evaluate(()=>FrommViewState.returning),false);assert.equal(await page.evaluate(()=>state.infiniteRendered),3000);
 assert.deepEqual(errors,[]);await context.close();console.log('PC full member roster, canonical aliases, full birthdate order, checkbox truth, downward journey, bounded DOM, cancellation and reduced motion PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

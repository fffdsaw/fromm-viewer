'use strict';
// Saved-room and profile data are synthetic; no actual account or cache is used.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});try{
 for(const config of [{width:1440,delayed:false},{width:390,delayed:false},{width:1440,delayed:true}])for(const kind of ['replay','channel']){
  const {page,context,errors}=await open(browser,server.url,{width:config.width,height:900,login:true});
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(u.pathname!=='/v2/user/fan/profile')return route.fallback();
   if(config.delayed)await gate;
   await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{profile:{id:'startup-self'}}})}).catch(()=>{});
  });
  await page.evaluate(({kind,delayed})=>{
   resetUserScopedMemory();setActiveAuth('synthetic-startup','synthetic-device',delayed?'':'startup@example.test');
   FrommConversation.loadFirebase=async()=>{throw Error('Synthetic REST fallback');};
   state.rooms=[{id:'saved-room',hostChatRoomId:'saved-host',host:{nick:'합성 저장 아티스트'}}];state.room=null;state.filter='all';
   const b=document.createElement('button');b.className='room';b.textContent='합성 저장 아티스트';b.onclick=()=>selectRoom(0,b);document.querySelector('#rooms').replaceChildren(b);
   const scope=delayed?'user:startup-self':currentAccountScope();localStorage.setItem('fromm.conversation.lastRoom:'+scope,JSON.stringify({roomId:'saved-room',host:'saved-host'}));
   state.live.channelsLoaded=true;state.live.channels=[{id:'fixture-channel',channelName:'합성 채널',isSubscribed:true}];state.live.replayFilter='fixture-channel';replayPagingFor('fixture-channel').isLast=true;replayPagingFor('fixture-channel').loaded=true;
   channelVideoState.channelId='fixture-channel';channelVideoState.pages.set('fixture-channel',{posts:[],loaded:true,isLast:true});
   hideLoginGate();if(delayed)FrommConversation.sync();document.querySelector('[data-glow-nav="'+kind+'"]').click();
  },{kind,delayed:config.delayed});
  await page.waitForFunction(kind=>state.filter==='live'&&state.live.centerMode===kind,kind);
  release();if(config.delayed)await page.waitForFunction(()=>currentReplyUserId()==='startup-self');
  await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(()=>({filter:state.filter,mode:state.live.centerMode,room:state.room?.id||null})),{filter:'live',mode:kind,room:null},'saved-room restoration must not replace the latest menu choice');
  assert.equal(await page.locator('[data-glow-nav="'+kind+'"]').getAttribute('aria-current'),'page');
  await page.evaluate(()=>setFilter('all'));await page.waitForFunction(()=>state.room?.id==='saved-room');
  assert.equal(await page.evaluate(()=>state.filter),'all','returning to chat still restores the saved room');assert.deepEqual(errors,[]);
  await context.close();console.log(`${config.width} ${kind}, delayed identity=${config.delayed}: latest menu intent wins; saved chat still restores PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

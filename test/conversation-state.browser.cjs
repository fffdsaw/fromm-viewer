'use strict';
// Real browser IndexedDB and lifecycle races; all account and message traffic is synthetic.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const {page,context,errors}=await open(browser,server.url,{login:true});
  let identity='fan-A',mode='ok',posts=[],history=0,historyPausedRequests=0,holdRules=null,releaseRules=null,holdHistory=null,releaseHistory=null;
  const rows=Array.from({length:12},(_,i)=>({messageId:'star-'+i,userType:'star',type:'text',content:'대화 '+i,createdAt:Date.now()-60000+i*1000}));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(u.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:identity}}});
   if(u.pathname.startsWith('/v2/chat/fanChatRooms/')){
    if(holdRules){const wait=holdRules;holdRules=null;await wait;}
    return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   }
   if(u.pathname.endsWith('/messages')){
    const from=Date.parse(u.searchParams.get('findStartAt')),end=Date.parse(u.searchParams.get('findEndAt')),limit=Number(u.searchParams.get('limit'));
    if(from<946684800001)history++;if(holdHistory){historyPausedRequests++;await holdHistory;}
    return answer({success:true,data:{messages:rows.filter(m=>m.createdAt>=from&&m.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});
   }
   if(u.pathname.endsWith('/replies')){
    const body=route.request().postDataJSON();posts.push(body);
    if(mode==='unknown')return route.abort('failed');
    if(mode==='denied')return answer({success:false},403);
    // Deliberately omit the optional canonical record; the REST echo reconciles it.
    return answer({success:true,data:{}});
   }
   return route.fallback();
  });
  async function enter(token='account-A'){
   await page.evaluate(token=>{
    resetUserScopedMemory();setActiveAuth(token,'shared-device','');hideLoginGate();
    FrommConversation.loadFirebase=async()=>{throw new Error('Synthetic fallback only')};
    state.rooms=[{id:'fan-room',hostChatRoomId:'host-room',host:{nick:'테스트'}}];
    const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button);
   },token);
   try{await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected'&&document.querySelector('#conversationSend').getAttribute('aria-busy')!=='true',null,{timeout:10000});}catch(error){const current=await page.evaluate(()=>({room:state.room?.hostChatRoomId,complete:state.chatHistoryComplete,messages:state.messages.length,shown:state.chatMessages.length,hasMore:state.hasMoreMessages,historyError:state.historyError?.message||'',phase:FrommConversation.status.phase}));throw new Error(`synthetic room entry did not complete: ${JSON.stringify(current)} (history requests: ${history})`,{cause:error});}
  }
  async function read(account){return page.evaluate(async account=>{const s=FrommConversationCore.createStore();try{return await s.read(account,'host-room')}finally{await s.close()}},account)}
  await enter();await page.locator('#conversationInput').fill('A의 개인 초안');await page.evaluate(()=>FrommConversation.flush());
  assert.equal((await read('user:fan-A')).meta.draft,'A의 개인 초안');assert.equal(await read('shared-device'),null,'device ID is never a persistent account namespace');
  identity='fan-B';await enter('account-B');assert.equal(await page.locator('#conversationInput').inputValue(),'');await page.locator('#conversationInput').fill('B의 초안');await page.evaluate(()=>FrommConversation.flush());
  assert.equal((await read('user:fan-B')).meta.draft,'B의 초안');assert.equal((await read('user:fan-A')).meta.draft,'A의 개인 초안');
  identity='fan-A';await enter();assert.equal(await page.locator('#conversationInput').inputValue(),'A의 개인 초안');
  mode='unknown';await page.locator('#conversationInput').fill('결과 불명 메시지');await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationResolve').hidden===false);
  assert.equal(posts.length,1);await page.waitForTimeout(400);assert.equal(posts.length,1,'ambiguous POST is never retried');await page.evaluate(()=>FrommConversation.flush());
  await enter();assert.equal(await page.locator('#conversationInput').inputValue(),'결과 불명 메시지');assert.equal(await page.locator('#conversationSend').isDisabled(),true);assert.equal(posts.length,1);
  const unknown=posts[0];rows.push({messageId:'echo-unknown',userType:'fan',userId:'fan-A',type:'text',...unknown,createdAt:Date.now()-5});
  await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='echo-unknown'),{},{timeout:10000});assert.equal(await page.locator('#conversationResolve').isVisible(),false);assert.equal(posts.length,1);assert.equal(await page.locator('#conversationInput').inputValue(),'','confirmed receipt clears the unchanged draft');
  mode='ok';await page.locator('#conversationInput').fill('접수 후 반영');await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationInput').value==='');
  assert.equal(posts.length,2);assert.equal(await page.locator('#conversationPending').isVisible(),true);
  rows.push({messageId:'echo-accepted',userType:'fan',userId:'fan-A',type:'text',...posts[1],createdAt:Date.now()-5});
  await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='echo-accepted'),{},{timeout:10000});await page.waitForFunction(()=>!document.querySelector('#conversationPending'));
  assert.equal(await page.locator('[data-message-id="echo-accepted"]').count(),1);
  // Switching away while the fresh rules request is unresolved must not send.
  holdRules=new Promise(resolve=>releaseRules=resolve);await page.locator('#conversationInput').fill('화면 전환 중 전송 금지');await page.locator('#conversationSend').click();
  await page.waitForFunction(()=>document.querySelector('#conversationSend').getAttribute('aria-busy')==='true');await page.evaluate(()=>setFilter('image'));releaseRules();await page.waitForTimeout(250);assert.equal(posts.length,2);
  await page.evaluate(()=>setFilter('all'));await page.waitForFunction(()=>FrommConversation.status.phase==='connected');assert.equal(await page.locator('#conversationInput').inputValue(),'화면 전환 중 전송 금지');
  // A deliberate server refresh must not silently rehydrate the old disk cache.
  const before=history;await page.locator('#scanBtn').click();await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected');assert.ok(history>before);assert.equal(await page.evaluate(()=>state.messages.length),rows.length);
  // A partial snapshot must be visible while older server pages are still pending.
  const partial=await page.evaluate(async messages=>{const store=FrommConversationCore.createStore();try{const last=messages.slice().sort((a,b)=>a.createdAt-b.createdAt).slice(-6);await store.clearRoom('user:fan-C','host-room');await store.write('user:fan-C','host-room',last,{count:6,complete:false,cursorEnd:new Date(last[0].createdAt-1).toISOString()});const saved=await store.read('user:fan-C','host-room');return{count:saved?.messages.length,complete:saved?.meta.complete}}finally{await store.close()}},rows);assert.deepEqual(partial,{count:6,complete:false});
  // A separate synthetic account avoids racing another writer for the same key.
  identity='fan-C';historyPausedRequests=0;holdHistory=new Promise(resolve=>releaseHistory=resolve);const reenter=enter('account-C'),reenterResult=reenter.then(()=>({error:null}),error=>({error}));
  try{
   await page.waitForFunction(()=>FrommConversation.canShowCached()&&!state.chatHistoryComplete&&state.messages.length===6,null,{timeout:5000});
   const historyGateDeadline=Date.now()+5000;while(!historyPausedRequests&&Date.now()<historyGateDeadline)await new Promise(resolve=>setTimeout(resolve,25));
   assert.ok(historyPausedRequests>0,'at least one server history request remains blocked while partial cache rows are visible');
  }
  catch(error){
   let current;
   try{current=await page.evaluate(()=>({complete:state.chatHistoryComplete,messages:state.messages.length,shown:state.chatMessages.length,hasMore:state.hasMoreMessages,cache:FrommConversation.canShowCached(),phase:FrommConversation.status.phase,historyError:state.historyError?.message||'',requestCount:state.historyObservedPageLimit}));}
   catch(diagnosticError){current={pageClosed:page.isClosed(),diagnosticError:diagnosticError.message};}
   holdHistory=null;releaseHistory?.();const result=await reenterResult;
   throw new Error(`partial cache re-entry state: ${JSON.stringify(current)} (history requests: ${history}; room entry error: ${result.error?.message||'none'})`,{cause:error});
  }
  assert.equal(await page.locator('#timeline .msg').count(),6,'cached partial history visible before older requests finish');holdHistory=null;releaseHistory();const result=await reenterResult;if(result.error)throw result.error;assert.equal(await page.evaluate(()=>state.messages.length),rows.length);
  await page.evaluate(()=>FrommConversation.flush());await page.locator('#conversationStorage').click();await page.locator('#conversationClear').click();await page.waitForFunction(()=>document.querySelector('#conversationStorageState').textContent.includes('지우고'));
  assert.equal(await read('user:fan-A'),null);assert.ok(await read('user:fan-B'),'clearing A preserves B');await page.evaluate(()=>FrommConversation.flush());assert.equal(await read('user:fan-A'),null,'cleared account stays off');
  await page.locator('#conversationStorageClose').click();
  // Exercise chunked persistence and account isolation in the actual browser DB.
  const large=await page.evaluate(async()=>{const store=FrommConversationCore.createStore({name:'large-conversation-fixture'}),records=Array.from({length:10001},(_,i)=>({messageId:'m'+i,createdAt:Date.now()+i,content:'x'.repeat(200)}));try{await store.write('A','room',records,{count:records.length,complete:true});await store.write('B','room',[records[0]],{count:1});const value=await store.read('A','room');await store.clearRoom('A','room');return{count:value.messages.length,unique:new Set(value.messages.map(m=>m.messageId)).size,cleared:await store.read('A','room'),other:(await store.read('B','room')).messages.length}}finally{await store.close()}});
  assert.deepEqual(large,{count:10001,unique:10001,cleared:null,other:1});assert.deepEqual(errors,[]);
  console.log('Account isolation with shared device, ambiguous POST/no retry, receipt reconciliation, abort before POST, explicit refresh, clear/off and 10,001-record IndexedDB PASS');
  await context.close();
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

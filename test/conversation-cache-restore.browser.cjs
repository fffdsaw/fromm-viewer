'use strict';
// Complete IndexedDB history must win over a partial in-memory room snapshot.
// All identities and messages are synthetic; no authenticated Fromm data is used.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const {page,context,errors}=await open(browser,server.url,{login:true});
  let identity='cache-test-user',cacheHistoryRequests=0,cacheRequests=0,cacheServerRows=[],releaseCacheSync;
  const cacheSyncGate=new Promise(resolve=>releaseCacheSync=resolve);
  const baseRows=Array.from({length:4},(_,i)=>({messageId:`base-${i}`,userType:'star',type:'text',content:`기준 ${i}`,createdAt:Date.now()-120000+i*1000}));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
   if(!url.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(url.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:identity}}});
   if(url.pathname.startsWith('/v2/chat/fanChatRooms/'))return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   const match=url.pathname.match(/^\/v2\/chat\/message\/([^/]+)\/messages$/);
   if(match){
    const host=match[1];
    const start=Date.parse(url.searchParams.get('findStartAt')),end=Date.parse(url.searchParams.get('findEndAt')),limit=Number(url.searchParams.get('limit'));
    if(host==='cache-host'){cacheRequests++;if(start<946684800001)cacheHistoryRequests++;await cacheSyncGate;return answer({success:true,data:{messages:cacheServerRows.filter(row=>row.createdAt>=start&&row.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});}
    return answer({success:true,data:{messages:baseRows.filter(row=>row.createdAt>=start&&row.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});
   }
   return route.fallback();
  });
  await page.evaluate(()=>{
   resetUserScopedMemory();setActiveAuth('synthetic-token','synthetic-device','');hideLoginGate();
   FrommConversation.loadFirebase=async()=>{throw new Error('Synthetic REST fallback only')};
   state.rooms=[{id:'base-room',hostChatRoomId:'base-host',host:{nick:'기준 방'}}];
   const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button);
  });
  await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected');
  const cached=Array.from({length:24},(_,i)=>({messageId:`disk-${i}`,hostChatRoomId:'cache-host',userType:'star',type:'text',content:`디스크 ${i}`,createdAt:Date.now()-90000+i*1000}));
  cacheServerRows=[{...cached.at(-1),content:'서버에서 재확인한 최신 내용'},{messageId:'server-new',hostChatRoomId:'cache-host',userType:'star',type:'text',content:'서버 신규 메시지',createdAt:Date.now()-500}];
  const hotDuplicate={...cached.at(-1),content:'메모리의 최신 수정'};
  const hotNew={messageId:'hot-new',hostChatRoomId:'cache-host',userType:'star',type:'text',content:'메모리의 신규 메시지',createdAt:Date.now()-1000};
  await page.evaluate(async({cached,hotDuplicate,hotNew})=>{
   const store=FrommConversationCore.createStore();
   try{await store.write('user:cache-test-user','cache-host',cached,{count:cached.length,complete:true,cursorEnd:new Date(cached[0].createdAt-1).toISOString(),pageRequestLimit:500,view:{id:'disk-12',offset:96,latest:false}})}finally{await store.close()}
   const room={id:'cache-room',hostChatRoomId:'cache-host',host:{nick:'완전 캐시'}};state.rooms.push(room);
   const button=document.createElement('button');button.className='room';button.textContent=room.host.nick;button.onclick=()=>selectRoom(state.rooms.length-1,button);document.querySelector('#rooms').append(button);
   const key=`${currentAccountScope()}::cache-host`;
   state.roomCache.set(key,{messages:[hotDuplicate,hotNew],cursorEnd:new Date(hotNew.createdAt-1).toISOString(),hasMoreMessages:true,pageRequestLimit:500});
   state.chatCache.delete(key);
   window.__cacheRestoreStarted=performance.now();
   selectRoom(state.rooms.length-1,button,{restoreHistoryPosition:true});
  },{cached,hotDuplicate,hotNew});
  const restored=await page.waitForFunction(()=>state.room?.hostChatRoomId==='cache-host'&&state.chatHistoryComplete&&state.messages.some(message=>message.messageId==='disk-0')&&state.messages.some(message=>message.messageId==='hot-new'),null,{timeout:3000}).then(()=>true).catch(()=>false);
  const anchorRestored=await page.waitForFunction(()=>{const row=document.querySelector('[data-message-id="disk-12"]');return row&&Math.abs(row.getBoundingClientRect().top-96)<6},null,{timeout:3000}).then(()=>true).catch(()=>false);
  releaseCacheSync();
  const synced=await page.waitForFunction(()=>state.messages.some(message=>message.messageId==='server-new')&&state.messages.find(message=>message.messageId==='disk-23')?.content==='서버에서 재확인한 최신 내용',null,{timeout:5000}).then(()=>true).catch(()=>false);
  const restoreMs=await page.evaluate(()=>performance.now()-window.__cacheRestoreStarted);
  await page.waitForTimeout(200);
  console.log(`Complete-cache synthetic entry: ${restored?Math.round(restoreMs):'not restored within 3000'} ms; cache-room message requests=${cacheRequests}; historical requests=${cacheHistoryRequests}`);
  assert.equal(restored,true,'complete disk cache is restored before any full-history request');
  assert.equal(anchorRestored,true,'the saved reader anchor is restored before server synchronization');
  assert.equal(synced,true,'new server rows merge and a server-returned same-ID row is retained as a candidate');
  const beforeFlush=await page.evaluate(()=>({count:state.messages.length,unique:new Set(state.messages.map(message=>message.messageId)).size,complete:state.chatHistoryComplete,updated:state.messages.find(message=>message.messageId==='disk-23')?.content,newest:state.messages.at(-1)?.messageId}));
  assert.deepEqual(beforeFlush,{count:26,unique:26,complete:true,updated:'서버에서 재확인한 최신 내용',newest:'server-new'});
  assert.equal(cacheHistoryRequests,0,'a complete IndexedDB snapshot must prevent historical API requests');
  await page.evaluate(()=>FrommConversation.flush());
  const afterFlush=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:cache-test-user','cache-host');return{count:value.messages.length,complete:value.meta.complete,ids:new Set(value.messages.map(message=>message.messageId)).size,hot:value.messages.some(message=>message.messageId==='hot-new'),disk:value.messages.find(message=>message.messageId==='disk-23')?.content,conflicts:value.conflicts.map(conflict=>conflict.candidates.map(candidate=>candidate.content))}}finally{await store.close()}});
  assert.deepEqual(afterFlush,{count:26,complete:true,ids:26,hot:true,disk:'디스크 23',conflicts:[['서버에서 재확인한 최신 내용']]});
  await page.waitForFunction(()=>{const row=document.querySelector('[data-message-id="disk-12"]');return row&&Math.abs(row.getBoundingClientRect().top-96)<6},null,{timeout:3000});
  assert.deepEqual(errors,[]);
  console.log('Complete disk restore + ID merge/dedupe + server update/new message + saved reader anchor + zero history requests PASS');
  await context.close();
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

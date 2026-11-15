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
  const synced=await page.waitForFunction(()=>state.messages.some(message=>message.messageId==='server-new')&&state.messages.find(message=>message.messageId==='disk-23')?.content==='디스크 23'&&document.querySelector('#conversationStatus')?.textContent.includes('메시지 내용 충돌 1건'),null,{timeout:7000}).then(()=>true).catch(()=>false);
  const restoreMs=await page.evaluate(()=>performance.now()-window.__cacheRestoreStarted);
  await page.waitForTimeout(200);
  console.log(`Complete-cache synthetic entry: ${restored?Math.round(restoreMs):'not restored within 3000'} ms; cache-room message requests=${cacheRequests}; historical requests=${cacheHistoryRequests}`);
  assert.equal(restored,true,'complete disk cache is restored before any full-history request');
  assert.equal(anchorRestored,true,'the saved reader anchor is restored before server synchronization');
  assert.equal(synced,true,'new rows merge, conflicting server content stays out of canonical messages, and conflict status is visible');
  const beforeFlush=await page.evaluate(()=>({count:state.messages.length,unique:new Set(state.messages.map(message=>message.messageId)).size,complete:state.chatHistoryComplete,updated:state.messages.find(message=>message.messageId==='disk-23')?.content,newest:state.messages.at(-1)?.messageId}));
  assert.deepEqual(beforeFlush,{count:26,unique:26,complete:true,updated:'디스크 23',newest:'server-new'});
  assert.equal(cacheHistoryRequests,0,'a complete IndexedDB snapshot must prevent historical API requests');
  await page.evaluate(()=>FrommConversation.flush());
  const afterFlush=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:cache-test-user','cache-host');return{count:value.messages.length,complete:value.meta.complete,ids:new Set(value.messages.map(message=>message.messageId)).size,hot:value.messages.some(message=>message.messageId==='hot-new'),disk:value.messages.find(message=>message.messageId==='disk-23')?.content,conflicts:value.conflicts.map(conflict=>conflict.candidates.map(candidate=>candidate.content))}}finally{await store.close()}});
  assert.deepEqual(afterFlush,{count:26,complete:true,ids:26,hot:true,disk:'디스크 23',conflicts:[['메모리의 최신 수정','서버에서 재확인한 최신 내용']]});
  await page.waitForFunction(()=>{const row=document.querySelector('[data-message-id="disk-12"]');return row&&Math.abs(row.getBoundingClientRect().top-96)<6},null,{timeout:3000});
  await page.evaluate(async()=>{
   await FrommConversation.flush();
   const store=FrommConversationCore.createStore(),host='dual-cache-host',roomId='dual-cache-room';
   const disk=Array.from({length:24},(_,i)=>({messageId:`dual-${i}`,hostChatRoomId:host,userType:'star',type:'text',content:i===12?'disk canonical':'disk '+i,createdAt:Date.now()-90000+i*1000}));
   const memory=disk.map(message=>message.messageId==='dual-12'?{...message,content:'memory alternate'}:message);
   try{await store.write('user:cache-test-user',host,disk,{count:disk.length,complete:true,cursorEnd:new Date(disk[0].createdAt-1).toISOString(),pageRequestLimit:500})}finally{await store.close()}
   const room={id:roomId,hostChatRoomId:host,host:{nick:'완전 메모리 캐시'}};state.rooms.push(room);
   const button=document.createElement('button');button.className='room';button.textContent=room.host.nick;button.onclick=()=>selectRoom(state.rooms.length-1,button);document.querySelector('#rooms').append(button);
   const key=`${currentAccountScope()}::${host}`;state.roomCache.set(key,{messages:memory,cursorEnd:new Date(memory[0].createdAt-1).toISOString(),hasMoreMessages:false,pageRequestLimit:500});state.chatCache.set(key,memory);
   selectRoom(state.rooms.length-1,button,{restoreHistoryPosition:true});
  });
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='dual-cache-host'&&state.chatHistoryComplete,null,{timeout:3000});
  const dualDebug=await page.evaluate(()=>({count:state.messages.length,complete:state.chatHistoryComplete,notice:document.querySelector('#conversationStatus')?.textContent,cache:state.chatCache.get(`${currentAccountScope()}::dual-cache-host`)?.length,roomCache:state.roomCache.get(`${currentAccountScope()}::dual-cache-host`)?.messages?.length}));
  assert.ok(dualDebug.count>=24);assert.ok(dualDebug.notice.includes('메시지 내용 충돌 1건'));
  await page.waitForFunction(()=>FrommConversation.status.phase==='connected'&&document.querySelector('[data-message-id="dual-23"]'),null,{timeout:3000});
  // Recreate the dock's status-row growth during a cache write. The reader is
  // deliberately in history, so increasing the fixed composer inset must not
  // move the message under inspection in Blink/WebView or Edge.
  await page.evaluate(()=>{const dock=document.querySelector('#conversationDock');dock.querySelector('#conversationStatus').hidden=true;dock.querySelector('.conversation-meta').hidden=true;});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const dualPosition=await page.evaluate(()=>{const row=document.querySelector('[data-message-id="dual-12"]');row?.scrollIntoView({block:'center',behavior:'instant'});window.FrommViewState?.cancel();return row?{top:row.getBoundingClientRect().top,content:state.messages.find(message=>message.messageId==='dual-12')?.content}:null});
  assert.equal(dualPosition?.content,'disk canonical');
  const beforeFlushViewport=await page.evaluate(()=>{const dock=document.querySelector('#conversationDock'),height=dock?.offsetHeight||0,gap=document.documentElement.scrollHeight-(scrollY+innerHeight),status=document.querySelector('#conversationStatus');return{y:scrollY,gap,dockHeight:height,statusHeight:status?.getBoundingClientRect().height||0,oldLatestThreshold:Math.max(220,height+60),newLatestThreshold:Math.max(80,height+16),followingLatest:window.FrommViewState?.followingLatest,autoTop:state.chatAutoTopPending}});
  console.log('Reader before conflict flush: '+JSON.stringify(beforeFlushViewport));
  await page.evaluate(()=>FrommConversation.flush());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(expected=>{const row=document.querySelector('[data-message-id="dual-12"]');return row&&Math.abs(row.getBoundingClientRect().top-expected)<2},dualPosition.top,{timeout:1200});
  const dualAfter=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:cache-test-user','dual-cache-host');const row=document.querySelector('[data-message-id="dual-12"]'),dock=document.querySelector('#conversationDock'),status=document.querySelector('#conversationStatus'),main=document.querySelector('.main');return{canonical:value.messages.find(message=>message.messageId==='dual-12')?.content,candidates:value.conflicts.find(conflict=>conflict.messageId==='dual-12')?.candidates.map(candidate=>candidate.content),complete:value.meta.complete,conflictCount:value.meta.conflictCount,content:state.messages.find(message=>message.messageId==='dual-12')?.content,top:row?.getBoundingClientRect().top,y:scrollY,scrollHeight:document.documentElement.scrollHeight,dockHeight:dock?.offsetHeight||0,statusHeight:status?.getBoundingClientRect().height||0,mainPaddingBottom:getComputedStyle(main).paddingBottom}}finally{await store.close()}});
  assert.deepEqual({canonical:dualAfter.canonical,candidates:dualAfter.candidates,complete:dualAfter.complete,conflictCount:dualAfter.conflictCount,content:dualAfter.content},{canonical:'disk canonical',candidates:['memory alternate'],complete:true,conflictCount:1,content:'disk canonical'});
  assert.ok(dualAfter.statusHeight>beforeFlushViewport.statusHeight,'the cache conflict restores the composer status row');
  assert.ok(parseFloat(dualAfter.mainPaddingBottom)>parseFloat(beforeFlushViewport.mainPaddingBottom||'0px'),'the composer status row updates the document bottom inset');
  const candidateSearchCount=await page.evaluate(()=>{const previous=state.chatQuery;state.chatQuery='memory alternate';chatMatchCache=null;const count=chatMatches().length;state.chatQuery=previous;chatMatchCache=null;return count});
  assert.equal(candidateSearchCount,0,'unverified candidates do not enter normal conversation search/media state');
  assert.equal(await page.evaluate(()=>state.messages.some(message=>message.content==='memory alternate')),false,'unverified memory candidates do not enter normal conversation search/media state');
  const anchorDelta=Math.abs(dualAfter.top-dualPosition.top);
  console.log('Reader after conflict flush: '+JSON.stringify({top:dualAfter.top,y:dualAfter.y,scrollHeight:dualAfter.scrollHeight,dockHeight:dualAfter.dockHeight,statusHeight:dualAfter.statusHeight,mainPaddingBottom:dualAfter.mainPaddingBottom}));
  console.log(`Memory/disk conflict flush reader-anchor delta: ${anchorDelta.toFixed(2)} CSS px`);
  assert.ok(anchorDelta<2,`flushing a memory/disk conflict keeps the reading anchor within 2 CSS px (${dualPosition.top} -> ${dualAfter.top})`);
  assert.deepEqual(errors,[]);
  console.log('Complete disk restore + ID merge/dedupe + server update/new message + saved reader anchor + zero history requests PASS');
  await context.close();
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

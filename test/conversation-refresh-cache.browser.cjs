'use strict';
// Refresh keeps complete synthetic history, syncs the latest window, and
// resumes partial history from its stored cursor. No live account is used.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');

(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const {page,context,errors}=await open(browser,server.url,{login:true});
  let feedCalls=0,historyRequests=[],serverNew=null,galleryNew=null,partialBase=0;
  const answer=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
   if(!url.hostname.endsWith('frommyarti.com'))return route.fallback();
   if(url.pathname==='/v2/user/fan/profile')return answer(route,{success:true,data:{profile:{id:'synthetic-refresh-user'}}});
   if(url.pathname.startsWith('/v2/chat/fanChatRooms/'))return answer(route,{success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   const match=url.pathname.match(/^\/v2\/chat\/message\/([^/]+)\/messages$/);
   if(!match)return route.fallback();
   const host=match[1],start=Date.parse(url.searchParams.get('findStartAt')),end=Date.parse(url.searchParams.get('findEndAt')),limit=Number(url.searchParams.get('limit'));
   if(start>946684800001){
    if(host==='refresh-complete-host'){
     feedCalls++;
     if(feedCalls===2){serverNew={messageId:'server-new',hostChatRoomId:host,userType:'star',type:'text',content:'synthetic latest refresh row',createdAt:end-1};return answer(route,{success:true,data:{messages:[serverNew]}});}
     if(feedCalls===4){galleryNew={messageId:'gallery-new',hostChatRoomId:host,userType:'star',type:'image',content:'https://fixture.test/refresh-image.svg',createdAt:end-1};return answer(route,{success:true,data:{messages:[galleryNew]}});}
     if(feedCalls>=6)return answer(route,{success:false,message:'synthetic offline response'},503);
    }
    return answer(route,{success:true,data:{messages:[]}});
   }
   historyRequests.push({host,end,limit});
   if(host==='refresh-partial-host'){
    if(end<=partialBase-5000)return answer(route,{success:true,data:{messages:[]}});
    const rows=Array.from({length:5},(_,i)=>({messageId:`older-${i}`,hostChatRoomId:host,userType:'star',type:'text',content:`synthetic older row ${i}`,createdAt:partialBase-5000+i*1000}));
    return answer(route,{success:true,data:{messages:rows.filter(row=>row.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});
   }
   return answer(route,{success:true,data:{messages:[]}});
  });
  await page.evaluate(async()=>{
   setActiveAuth('synthetic-token','synthetic-device','');hideLoginGate();
   FrommConversation.loadFirebase=async()=>{throw new Error('synthetic REST-only fixture')};
   await ensureReplyIdentity();
   const host='refresh-complete-host',rows=Array.from({length:40},(_,i)=>({messageId:`cached-${i}`,hostChatRoomId:host,userType:'star',type:i===4?'image':'text',content:i===4?'https://fixture.test/cached-image.svg':`synthetic cached row ${i}`,createdAt:Date.now()-120000+i*1000}));
   const store=FrommConversationCore.createStore();try{await store.write('user:synthetic-refresh-user',host,rows,{count:rows.length,complete:true,cursorEnd:new Date(rows[0].createdAt-1).toISOString(),pageRequestLimit:500,syncedUntil:Date.now()-60000,view:{id:'cached-12',offset:80,latest:false}})}finally{await store.close()}
   state.rooms=[{id:'refresh-complete-room',hostChatRoomId:host,host:{nick:'Synthetic complete'}}];
   const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button,{restoreHistoryPosition:true});
  });
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='refresh-complete-host'&&state.chatHistoryComplete&&state.messages.length===40&&FrommConversation.status.phase==='connected',null,{timeout:5000});
  assert.equal(feedCalls,1,'opening a complete cache performs only the normal incremental latest check');
  const before=await page.locator('[data-message-id="cached-12"]').evaluate(node=>{node.scrollIntoView({block:'center'});FrommViewState.cancel();return node.getBoundingClientRect().top;});
  await page.locator('#scanBtn').click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="server-new"]')&&state.chatHistoryComplete&&FrommConversation.status.phase==='connected',null,{timeout:5000});
  const after=await page.locator('[data-message-id="cached-12"]').evaluate(node=>node.getBoundingClientRect().top);
  assert.equal(historyRequests.length,0,'complete-cache refresh must not restart historical collection');
  assert.ok(Math.abs(after-before)<12,`refresh preserves the reader anchor (${before} -> ${after})`);
  await page.evaluate(()=>FrommConversation.flush());
  const completeSnapshot=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:synthetic-refresh-user','refresh-complete-host');return{count:value.messages.length,complete:value.meta.complete,ids:new Set(value.messages.map(row=>row.messageId)).size,hasNew:value.messages.some(row=>row.messageId==='server-new'),hasOld:value.messages.some(row=>row.messageId==='cached-0')}}finally{await store.close()}});
  assert.deepEqual(completeSnapshot,{count:41,complete:true,ids:41,hasNew:true,hasOld:true},'latest sync merges into the retained complete cache');
  await page.evaluate(()=>setFilter('image'));
  await page.waitForFunction(()=>state.filter==='image'&&document.querySelector('[data-message-id="cached-4"]'));
  const galleryBefore=await page.locator('[data-message-id="cached-4"]').evaluate(node=>{node.scrollIntoView({block:'center'});FrommViewState.cancel();return node.getBoundingClientRect().top;});
  await page.locator('#scanBtn').click();
  await page.waitForFunction(()=>document.querySelector('[data-message-id="gallery-new"]')&&FrommConversation.status.phase==='connected',null,{timeout:5000});
  await page.waitForTimeout(250);
  const galleryAfter=await page.locator('[data-message-id="cached-4"]').evaluate(node=>node.getBoundingClientRect().top);
  assert.ok(Math.abs(galleryAfter-galleryBefore)<12,`media refresh preserves the reader anchor (${galleryBefore} -> ${galleryAfter})`);
  await page.evaluate(()=>FrommConversation.flush());
  const gallerySnapshot=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:synthetic-refresh-user','refresh-complete-host');return{count:value.messages.length,complete:value.meta.complete,hasNew:value.messages.some(row=>row.messageId==='gallery-new')}}finally{await store.close()}});
  assert.deepEqual(gallerySnapshot,{count:42,complete:true,hasNew:true},'refresh in a media tab merges latest items without clearing complete history');
  await page.locator('#scanBtn').click();
  await page.waitForFunction(()=>FrommConversation.status.phase==='retry',null,{timeout:5000});
  const failedRefreshSnapshot=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const value=await store.read('user:synthetic-refresh-user','refresh-complete-host');return{count:value.messages.length,complete:value.meta.complete,hasNew:value.messages.some(row=>row.messageId==='server-new')}}finally{await store.close()}});
  assert.deepEqual(failedRefreshSnapshot,{count:42,complete:true,hasNew:true},'a failed latest request leaves the complete cache intact');

  partialBase=await page.evaluate(async()=>{
   const host='refresh-partial-host',base=Date.now()-900000,rows=Array.from({length:20},(_,i)=>({messageId:`partial-${i}`,hostChatRoomId:host,userType:'star',type:'text',content:`synthetic partial row ${i}`,createdAt:base+i*1000}));
   const store=FrommConversationCore.createStore();try{await store.write('user:synthetic-refresh-user',host,rows,{count:rows.length,complete:false,cursorEnd:new Date(rows[0].createdAt-1).toISOString(),pageRequestLimit:500,syncedUntil:Date.now()-60000})}finally{await store.close()}
   state.rooms.push({id:'refresh-partial-room',hostChatRoomId:host,host:{nick:'Synthetic partial'}});
   const button=document.createElement('button');button.className='room';button.onclick=()=>selectRoom(state.rooms.length-1,button,{restoreHistoryPosition:true});document.querySelector('#rooms').append(button);selectRoom(state.rooms.length-1,button,{restoreHistoryPosition:true});
   return base;
  });
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='refresh-partial-host'&&state.messages.length===20&&!state.chatHistoryComplete,null,{timeout:5000});
  await page.locator('#scanBtn').click();
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='refresh-partial-host'&&state.chatHistoryComplete&&state.messages.length===25,null,{timeout:5000});
  assert.equal(historyRequests.filter(request=>request.host==='refresh-partial-host').length,2,'partial refresh requests the missing cursor range and its terminal page');
  assert.ok(historyRequests.find(request=>request.host==='refresh-partial-host').end<partialBase,'partial refresh resumes from its cached older boundary');
  const partialIds=await page.evaluate(()=>state.messages.map(row=>row.messageId));
  assert.ok(Array.from({length:20},(_,i)=>`partial-${i}`).every(id=>partialIds.includes(id)),'partial refresh retains cached messages');
  assert.deepEqual(errors,[]);
  console.log(`Complete synthetic refresh: ${completeSnapshot.count} rows retained, zero historical requests, reader anchor preserved; gallery refresh added one item; 503 retry kept the cache.`);
  console.log(`Partial synthetic refresh: 20 cached rows plus 5 older rows; two requests resumed from the stored boundary.`);
  await context.close();
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

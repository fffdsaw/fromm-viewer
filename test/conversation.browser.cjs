'use strict';
// Provider/POST replies are synthetic; IndexedDB, DOM, WebCrypto UUIDs and the
// pinned Firebase module imports are real. Never sends a real fan message.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const host=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})}),out=process.env.CONVERSATION_DIR;
 try{
  for(const cfg of [{width:1440},{width:780,installed:true},{width:390}]){
   const {page,context,errors}=await open(browser,host.url,cfg);let posts=[],historyRequests=0,ruleRequests=0,readerRequests=0,rejectSend=false;
   const base=Date.now()-2000000,rows=Array.from({length:1200},(_,i)=>({messageId:'a-'+i,userId:'artist',userType:'star',type:'text',content:'보관 대화 '+i,createdAt:base+i*1000}));
   const data={'host-a':rows,'host-b':[{messageId:'b-1',userType:'star',type:'text',content:'다른 아티스트 대화',createdAt:base}]};
   const requests=[];page.on('dialog',dialog=>dialog.accept());
   await page.route('**/*',async route=>{
    let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
    if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
    requests.push(u.pathname);const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
    if(u.pathname==='/v2/chat/fanFriendAndChatRooms')return answer({success:true,data:{chatRooms:[{id:'fan-room-a',hostChatRoomId:'host-a',host:{nick:'아티스트 A'}},{id:'fan-room-b',hostChatRoomId:'host-b',host:{nick:'아티스트 B'}}]}});
    if(u.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'fan-self'}}});
    if(u.pathname.startsWith('/v2/chat/fanChatRooms/')){ruleRequests++;return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,maxSendChatCount:10,chatCountInterval:86400,forbiddenWords:['금지어']}}}});}
    if(u.pathname==='/v2/auth/signin/firebase/secure/reader'){
     readerRequests++;const payload=Buffer.from(JSON.stringify({accessHostChatRoomIds:['host-a','host-b']})).toString('base64url');return answer({success:true,data:{accessToken:'fixture.'+payload+'.signature'}});
    }
    const match=u.pathname.match(/^\/v2\/chat\/message\/([^/]+)\/(messages|replies)$/);
    if(match){
     const hostId=match[1];
     if(match[2]==='messages'){
      const from=Date.parse(u.searchParams.get('findStartAt')||'2000-01-01'),to=Date.parse(u.searchParams.get('findEndAt')),limit=Number(u.searchParams.get('limit'));
      if(from<946684800001)historyRequests++;
      const messages=(data[hostId]||[]).filter(m=>Date.parse(m.createdAt)||typeof m.createdAt==='number').filter(m=>new Date(m.createdAt).getTime()>=from&&new Date(m.createdAt).getTime()<=to).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,limit);
      return answer({success:true,data:{messages}});
     }
     assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();posts.push({host:hostId,body});
     assert.equal(body.chatRoomId,hostId==='host-a'?'fan-room-a':'fan-room-b');assert.match(body.code,/^[\da-f-]{36}$/);assert.equal(typeof body.content,'string');
     if(rejectSend)return answer({success:false,message:'limit'},429);
     const message={messageId:'sent-'+posts.length,userId:'fan-self',userType:'fan',type:'text',content:body.content,code:body.code,createdAt:Date.now()};data[hostId].push(message);return answer({success:true,data:{message}});
    }
    return route.fallback();
   });
   async function enter(){
    await page.evaluate(()=>{
     setActiveAuth('auth-A-secret','device-A-secret','cache-a@example.test');hideLoginGate();
     state.rooms=[{id:'fan-room-a',hostChatRoomId:'host-a',host:{nick:'아티스트 A',profileUrlThumbnail:'https://fixture.test/avatar.svg'}},{id:'fan-room-b',hostChatRoomId:'host-b',host:{nick:'아티스트 B',profileUrlThumbnail:'https://fixture.test/avatar.svg'}}];
     const list=document.querySelector('#rooms');list.replaceChildren();state.rooms.forEach((room,i)=>{const button=document.createElement('button');button.className='room';button.textContent=room.host.nick;button.onclick=()=>selectRoom(i,button);list.append(button)});
     window.fakePush=null;window.pushClosed=0;window.authMemory=false;
     FrommConversation.loadFirebase=async()=>({inMemoryPersistence:'memory',initializeApp:()=>({}),initializeAuth:(_a,options)=>{authMemory=options.persistence==='memory';return{}},signInWithCustomToken:async()=>{},initializeFirestore:()=>({}),collection:(...args)=>args,where:(...args)=>args,query:(...args)=>args,onSnapshot:(_q,_options,callback)=>{window.fakePush=callback;callback({metadata:{fromCache:false},docChanges:()=>[]});return()=>{window.pushClosed++}},terminate:async()=>{},deleteApp:async()=>{}});
     selectRoom(0,list.firstChild);
    });
    await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected'&&typeof window.fakePush==='function');
   }
   // Import the actual vendored SDK without authenticating or contacting Firebase.
   assert.equal(await page.evaluate(async()=>typeof(await FrommConversation.loadFirebase()).onSnapshot),'function');
   await enter();assert.equal(await page.evaluate(()=>state.messages.length),1200);assert.equal(await page.locator('#conversationDock').isVisible(),true);
   assert.equal(await page.evaluate(()=>authMemory),true);assert.ok(historyRequests>=3);assert.ok(readerRequests>=1);
   await page.evaluate(()=>{localStorage.setItem(AUTH_TOKEN_KEY,'auth-A-secret');localStorage.setItem(AUTH_UUID_KEY,'device-A-secret');localStorage.setItem(AUTH_EMAIL_KEY,'cache-a@example.test');localStorage.removeItem(AUTH_EXPIRY_KEY)});
   await page.addInitScript(()=>Object.defineProperty(window,'FrommConversation',{configurable:true,set(api){Object.defineProperty(window,'FrommConversation',{value:api,writable:true,configurable:true});window.pushClosed=0;window.authMemory=false;api.loadFirebase=async()=>({inMemoryPersistence:'memory',initializeApp:()=>({}),initializeAuth:(_a,options)=>{window.authMemory=options.persistence==='memory';return{}},signInWithCustomToken:async()=>{},initializeFirestore:()=>({}),collection:(...args)=>args,where:(...args)=>args,query:(...args)=>args,onSnapshot:(_q,_options,callback)=>{const listeners=window.fakePushListeners||=new Set();listeners.add(callback);window.fakePush=event=>{for(const fn of [...listeners])fn(event);};callback({metadata:{fromCache:false},docChanges:()=>[]});return()=>{listeners.delete(callback);window.pushClosed++;}},terminate:async()=>{},deleteApp:async()=>{}})}}));
   await page.locator('#conversationInput').fill('재방문해도 남길 작성 중인 글');await page.evaluate(()=>FrommConversation.flush());
   const beforeRestore=historyRequests;await page.reload();await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected'&&typeof window.fakePush==='function');assert.equal(await page.evaluate(()=>state.room?.hostChatRoomId),'host-a','last artist restored after authenticated room discovery');
   assert.equal(historyRequests,beforeRestore,'restored full history does not scan the server from year 2000 again');
   assert.equal(await page.locator('#conversationInput').inputValue(),'재방문해도 남길 작성 중인 글');assert.equal(await page.evaluate(()=>state.messages.length),1200);
   // Push is only a hint; the authenticated REST response supplies canonical rows.
   const firstNew={messageId:'push-1',userType:'star',type:'text',content:'실시간 새 대화',createdAt:Date.now()-10};rows.push(firstNew);
   await page.evaluate(()=>fakePush({metadata:{fromCache:false},docChanges:()=>[{type:'added'}]}));
   await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='push-1'));assert.equal(await page.locator('[data-message-id="push-1"]').count(),1);
   await page.evaluate(()=>fakePush({metadata:{fromCache:false},docChanges:()=>[{type:'modified'}]}));await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>state.messages.filter(m=>m.messageId==='push-1').length),1);
   // Enter during Korean IME composition must not send.
   await page.locator('#conversationInput').fill('입력 중');await page.locator('#conversationInput').dispatchEvent('keydown',{key:'Enter',isComposing:true});await page.waitForTimeout(100);assert.equal(posts.length,0);
   const beforeRules=ruleRequests;await page.locator('#conversationInput').fill('첫 전송 메시지');await page.locator('#conversationSend').click();
   await page.waitForFunction(()=>state.messages.some(m=>m.content==='첫 전송 메시지'&&m.userType==='fan'));
   assert.equal(posts.length,1);assert.ok(ruleRequests>beforeRules,'each send fetches current rules first');assert.equal(await page.locator('#conversationInput').inputValue(),'');
   await page.locator('#conversationInput').fill('금지어 포함');await page.locator('#conversationSend').click();await page.waitForTimeout(100);assert.equal(posts.length,1);
   rejectSend=true;await page.locator('#conversationInput').fill('실패 후 유지할 글');await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationStatus').textContent.includes('전송 횟수 제한'));
   assert.equal(posts.length,2);assert.equal(await page.locator('#conversationInput').inputValue(),'실패 후 유지할 글');rejectSend=false;
   await page.evaluate(()=>setFilter('image'));assert.equal(await page.locator('#conversationDock').isVisible(),false);assert.ok(await page.evaluate(()=>pushClosed>=1));
   await page.evaluate(()=>setFilter('all'));await page.waitForFunction(()=>FrommConversation.status.phase==='connected');
   assert.equal(await page.locator('#conversationInput').inputValue(),'실패 후 유지할 글');
   // A reader away from the newest message gets a badge instead of a jump.
   await page.evaluate(()=>{FrommViewState.cancel();const list=filteredMessages();renderChatWindow(list,500);scrollTo(0,600);});
   await page.waitForTimeout(200);const anchor=page.locator('#timeline .msg').nth(3);const anchorId=await anchor.getAttribute('data-message-id'),beforeTop=await anchor.evaluate(el=>el.getBoundingClientRect().top);
   rows.push({messageId:'reader-new',userType:'star',type:'text',content:'읽던 자리 유지',createdAt:Date.now()-10});
   await page.evaluate(()=>fakePush({metadata:{fromCache:false},docChanges:()=>[{type:'added'}]}));await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='reader-new'));
   const afterTop=await page.locator(`[data-message-id="${anchorId}"]`).evaluate(el=>el.getBoundingClientRect().top);assert.ok(Math.abs(afterTop-beforeTop)<3,JSON.stringify({beforeTop,afterTop,anchorId,view:await page.evaluate(()=>({y:scrollY,start:state.chatWindowStart,end:state.infiniteRendered,count:state.infiniteList.length,gap:document.documentElement.scrollHeight-innerHeight-scrollY}))}));assert.equal(await page.locator('#conversationNew').isVisible(),true);
   await page.locator('#conversationNew').click();await page.locator('[data-message-id="reader-new"]').waitFor();
   await page.evaluate(()=>FrommConversation.flush());
   const saved=await page.evaluate(async()=>{const db=FrommConversationCore.createStore(),value=await db.read('cache-a@example.test','host-a');await db.close();return{count:value.messages.length,serialized:JSON.stringify(value)}});
   assert.equal(saved.count,rows.length);assert.equal(saved.serialized.includes('auth-A-secret'),false);assert.equal(saved.serialized.includes('device-A-secret'),false);
   // The older reading position is persisted, not merely the scroll height.
   await page.evaluate(()=>{FrommViewState.cancel();renderChatWindow(filteredMessages(),500);scrollTo(0,600)});await page.waitForTimeout(250);await page.evaluate(()=>FrommConversation.flush());
   const bookmark=await page.evaluate(async()=>{const db=FrommConversationCore.createStore(),value=await db.read('cache-a@example.test','host-a');await db.close();return value.meta.view});
   assert.equal(bookmark.latest,false);const beforeAgain=historyRequests;await page.reload();await page.waitForFunction(()=>FrommConversation.status.phase==='connected');await page.waitForTimeout(300);
   assert.equal(historyRequests,beforeAgain);assert.ok(Math.abs(await page.locator(`[data-message-id="${bookmark.id}"]`).evaluate(el=>el.getBoundingClientRect().top)-bookmark.offset)<4,'restores the same message and viewport offset');
   const layout=await page.locator('#conversationDock').boundingBox();assert.ok(layout.x>=0&&layout.x+layout.width<=cfg.width+1);assert.equal(await page.locator('#conversationSend').isVisible(),true);
   if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'chat-'+cfg.width+'.png')});}
   assert.deepEqual(errors,[]);console.log(`${cfg.width}${cfg.installed?' standalone':''}: real IndexedDB restore/no history rescan, Firebase hints, text/IME/rules/send/failure, tab cleanup, reader anchor and layout PASS`);
   await context.close();
  }
 }finally{await browser.close();await host.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

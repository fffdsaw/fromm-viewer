'use strict';
// Cache-free entry, partial-cache re-entry and full-cache re-entry use synthetic rows only.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=5000){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await pause(10);}assert.fail('timed out waiting for synthetic history request');}
function gate(){let release;const promise=new Promise(resolve=>release=resolve);return{promise,release};}
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const {page,context,errors}=await open(browser,server.url,{login:true});
  const base=Date.now()-700000,rows=Array.from({length:501},(_,i)=>({messageId:`progressive-${i}`,userId:'synthetic-artist',userType:'star',type:'text',content:`synthetic history ${i}`,createdAt:base+i*1000}));
  const historyCalls=new Map(),feedCalls=new Map(),gates=new Map([['progressive-host',{call:2,...gate()}],['partial-host',{call:1,...gate()}]]);
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
   if(!url.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(url.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'synthetic-user'}}});
   if(url.pathname.startsWith('/v2/chat/fanChatRooms/'))return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   const match=url.pathname.match(/^\/v2\/chat\/message\/([^/]+)\/messages$/);
   if(match){
    const host=match[1],start=Date.parse(url.searchParams.get('findStartAt')),end=Date.parse(url.searchParams.get('findEndAt')),limit=Number(url.searchParams.get('limit'));
    if(start>946684800001){feedCalls.set(host,(feedCalls.get(host)||0)+1);return answer({success:true,data:{messages:[]}});}
    const count=(historyCalls.get(host)||0)+1;historyCalls.set(host,count);
    const hold=gates.get(host);if(hold&&count===hold.call)await hold.promise;
    const source=host==='progressive-host'?rows:[];
    const messages=source.filter(message=>message.createdAt>=start&&message.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit);
    return answer({success:true,data:{messages}});
   }
   return route.fallback();
  });
  await page.evaluate(()=>{
   setActiveAuth('synthetic-token','synthetic-device','cache-a@example.test');hideLoginGate();
   FrommConversation.loadFirebase=async()=>{throw new Error('synthetic REST-only fixture')};
   state.rooms=[{id:'progressive-room',hostChatRoomId:'progressive-host',host:{nick:'synthetic artist'}}];
   const list=document.querySelector('#rooms'),button=document.createElement('button');button.className='room';button.textContent='synthetic artist';list.replaceChildren(button);
   window.__selectStarted=performance.now();selectRoom(0,button);
  });
  await until(()=>historyCalls.get('progressive-host')>=2);
  await page.waitForFunction(()=>document.querySelector('[data-message-id="progressive-500"]')&&state.messages.length===500&&state.chatMessages.length===300);
  const cold=await page.evaluate(()=>({elapsed:Math.round(performance.now()-window.__selectStarted),complete:state.chatHistoryComplete,loaded:state.infiniteList.length,rows:state.messages.length,latest:!!document.querySelector('[data-message-id="progressive-500"]'),status:document.querySelector('#scanState')?.textContent}));
  assert.deepEqual({complete:cold.complete,loaded:cold.loaded,rows:cold.rows,latest:cold.latest},{complete:false,loaded:300,rows:500,latest:true});
  await page.mouse.wheel(0,-24000); // Real reader input cancels the bounded first-entry latest alignment.
  await page.locator('[data-message-id="progressive-300"]').scrollIntoViewIfNeeded();
  const snapshot=()=>page.evaluate(()=>{const anchor=[...document.querySelectorAll('#timeline .msg')].find(node=>node.getBoundingClientRect().bottom>chatHeaderInset()+8);return{anchorId:anchor?.dataset.messageId,top:anchor?.getBoundingClientRect().top,scrollY,windowStart:state.chatWindowStart,rendered:state.infiniteRendered,list:state.infiniteList.length,autoTop:state.chatAutoTopPending};});
  const before=await snapshot();
  gates.get('progressive-host').release();
  await page.waitForFunction(()=>state.chatHistoryComplete&&state.messages.length===501,null,{timeout:10000});
  await page.waitForTimeout(1000); // Let viewport anchoring settle after virtual rows become measurable.
  const after=await snapshot();
  const retainedAnchor=await page.locator(`[data-message-id="${before.anchorId}"]`).evaluate(node=>{const rect=node.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;});
  assert.ok(Math.abs(after.scrollY-before.scrollY)<100&&retainedAnchor,`completion keeps the reader in the current chat window (${JSON.stringify({before,after,retainedAnchor})})`);
  assert.equal(historyCalls.get('progressive-host'),3,'the inclusive cursor overlap adds no lost row and completes after the final short boundary page');
  await page.evaluate(()=>FrommConversation.flush());
  const beforeFullRestore=historyCalls.get('progressive-host');
  const restored=await page.evaluate(async()=>{
   const key=`${currentAccountScope()}::progressive-host`;state.roomCache.delete(key);state.chatCache.delete(key);
   window.__restoreStarted=performance.now();selectRoom(0,document.querySelector('#rooms .room'));
  });
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='progressive-host'&&state.chatHistoryComplete&&state.messages.length===501&&document.querySelector('[data-message-id="progressive-500"]'),null,{timeout:5000});
  const fullRestoreMs=await page.evaluate(()=>Math.round(performance.now()-window.__restoreStarted));
  assert.equal(historyCalls.get('progressive-host'),beforeFullRestore,'a complete IndexedDB cache performs no historical scan');

  const partialRows=Array.from({length:500},(_,i)=>({messageId:`partial-${i}`,hostChatRoomId:'partial-host',userId:'synthetic-artist',userType:'star',type:'text',content:`partial cached history ${i}`,createdAt:base+i*1000}));
  await page.evaluate(async partialRows=>{
   const store=FrommConversationCore.createStore();try{await store.write(currentAccountScope(),'partial-host',partialRows,{count:partialRows.length,complete:false,cursorEnd:new Date(partialRows[0].createdAt-1).toISOString(),pageRequestLimit:500,observedPageLimit:500});}finally{await store.close();}
   const room={id:'partial-room',hostChatRoomId:'partial-host',host:{nick:'synthetic partial'}};state.rooms.push(room);
   const button=document.createElement('button');button.className='room';button.textContent=room.host.nick;button.onclick=()=>selectRoom(state.rooms.length-1,button);document.querySelector('#rooms').append(button);
   window.__partialSelectStarted=performance.now();selectRoom(state.rooms.length-1,button);
  },partialRows);
  await until(()=>historyCalls.get('partial-host')===1);
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='partial-host'&&state.messages.length===500&&state.chatMessages.length===300&&document.querySelector('[data-message-id="partial-499"]'));
  const partialRestore=await page.evaluate(()=>({elapsed:Math.round(performance.now()-window.__partialSelectStarted),complete:state.chatHistoryComplete,loaded:state.infiniteList.length,latest:!!document.querySelector('[data-message-id="partial-499"]')}));
  assert.deepEqual({complete:partialRestore.complete,loaded:partialRestore.loaded,latest:partialRestore.latest},{complete:false,loaded:300,latest:true});
  gates.get('partial-host').release();
  await page.waitForFunction(()=>state.room?.hostChatRoomId==='partial-host'&&state.chatHistoryComplete&&state.messages.length===500,null,{timeout:5000});
  assert.deepEqual(errors,[]);
  console.log(`Cold synthetic entry: first display ${cold.elapsed} ms with 300 of 500 cached-page rows visible; full scan remained pending.`);
  console.log(`Complete synthetic cache restore: ${fullRestoreMs} ms; historical requests unchanged (${beforeFullRestore}). Partial cache restore: ${partialRestore.elapsed} ms; recent 300 shown before the held history response.`);
  console.log('Background completion, inclusive-boundary deduplication, full/partial cache restore and viewport retention PASS');
  await context.close();
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

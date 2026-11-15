'use strict';
// Synthetic complete-cache scale checks; never uses a real account or chat data.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const {page,context,errors}=await open(browser,server.url,{login:true}),historyCalls=new Map(),feedCalls=new Map(),scanSources=new Map();
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
   if(!url.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(url.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'synthetic-scale-user'}}});
   if(url.pathname.startsWith('/v2/chat/fanChatRooms/'))return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   const match=url.pathname.match(/^\/v2\/chat\/message\/([^/]+)\/messages$/);
   if(match){const host=match[1],start=Date.parse(url.searchParams.get('findStartAt')),end=Date.parse(url.searchParams.get('findEndAt')),limit=Number(url.searchParams.get('limit')),source=scanSources.get(host);if(start<946684800001){historyCalls.set(host,(historyCalls.get(host)||0)+1);if(source){let left=0,right=source.length;while(left<right){const middle=(left+right)>>1;if(source[middle].createdAt>end)left=middle+1;else right=middle;}return answer({success:true,data:{messages:source.slice(left,left+limit).filter(row=>row.createdAt>=start)}});}}else feedCalls.set(host,(feedCalls.get(host)||0)+1);return answer({success:true,data:{messages:[]}});}
   return route.fallback();
  });
  const results=[];
  for(const count of [10000,50000]){
   const host=`scale-${count}`;
   await page.evaluate(async({host,count})=>{
    resetUserScopedMemory();setActiveAuth('synthetic-token','synthetic-device','scale@example.test');hideLoginGate();
    FrommConversation.loadFirebase=async()=>{throw new Error('synthetic REST-only scale fixture')};
    await ensureReplyIdentity();const account=currentAccountScope(),base=Date.now()-count*1000;
    const rows=Array.from({length:count},(_,index)=>({messageId:`${host}-${index}`,hostChatRoomId:host,userId:'synthetic-scale-user',userType:'star',type:'text',content:`Synthetic history row ${index}`,createdAt:base+index*1000}));
    const store=FrommConversationCore.createStore();const writeStarted=performance.now();
    try{await store.write(account,host,rows,{count,complete:true,cursorEnd:new Date(base-1).toISOString(),pageRequestLimit:500,observedPageLimit:500});}
    finally{await store.close();}
    const writeMs=Math.round(performance.now()-writeStarted),room={id:host,hostChatRoomId:host,host:{nick:`Synthetic ${count}`}};state.rooms=[room];
    const button=document.createElement('button');button.className='room';button.textContent=room.host.nick;document.querySelector('#rooms').replaceChildren(button);
    window.__scaleStarted=performance.now();window.__scaleWriteMs=writeMs;selectRoom(0,button);
   },{host,count});
   await page.waitForFunction(({host,count})=>state.room?.hostChatRoomId===host&&state.chatHistoryComplete&&state.messages.length===count&&document.querySelector(`[data-message-id="${host}-${count-1}"]`),{host,count},{timeout:30000});
   const metrics=await page.evaluate(({host,count})=>({count,writeMs:window.__scaleWriteMs,restoreMs:Math.round(performance.now()-window.__scaleStarted),cacheRows:state.messages.length,chatRows:state.chatMessages.length,virtualRows:document.querySelectorAll('#timeline .msg').length,latestVisible:!!document.querySelector(`[data-message-id="${host}-${count-1}"]`),usedHeapBytes:performance.memory?.usedJSHeapSize??null,documentHeight:document.documentElement.scrollHeight}),{host,count});
   assert.equal(metrics.cacheRows,count);assert.equal(metrics.chatRows,count);assert.equal(metrics.latestVisible,true);assert.ok(metrics.virtualRows<=500,`virtual window stays bounded at ${metrics.virtualRows} rows`);assert.equal(historyCalls.get(host)||0,0,'complete cache makes no historical requests');
   const frameSample=page.evaluate(()=>new Promise(resolve=>{const intervals=[];let previous=0;const sample=time=>{if(previous)intervals.push(time-previous);previous=time;if(intervals.length<36)requestAnimationFrame(sample);else resolve({meanMs:Math.round(intervals.reduce((sum,value)=>sum+value,0)/intervals.length*10)/10,worstMs:Math.round(Math.max(...intervals)*10)/10});};requestAnimationFrame(sample);}));
   await page.mouse.wheel(0,-1200);metrics.scrollFrameSample=await frameSample;metrics.historyRequests=historyCalls.get(host)||0;metrics.incrementalRequests=feedCalls.get(host)||0;
   results.push(metrics);
  }
  const crawlCount=50000,crawlHost='crawl-50000',crawlBase=Date.now()-crawlCount*1000;
  scanSources.set(crawlHost,Array.from({length:crawlCount},(_,offset)=>{const index=crawlCount-offset-1;return{messageId:`${crawlHost}-${index}`,hostChatRoomId:crawlHost,userId:'synthetic-scale-user',userType:'star',type:'text',content:`Synthetic history row ${index}`,createdAt:crawlBase+index*1000};}));
  await page.evaluate(host=>{resetUserScopedMemory();setActiveAuth('synthetic-token','synthetic-device','scale@example.test');hideLoginGate();FrommConversation.loadFirebase=async()=>{throw new Error('synthetic REST-only scale fixture')};state.rooms=[{id:host,hostChatRoomId:host,host:{nick:'Synthetic 50k scan'}}];const button=document.createElement('button');button.className='room';button.textContent='Synthetic 50k scan';document.querySelector('#rooms').replaceChildren(button);window.__crawlStarted=performance.now();selectRoom(0,button);},crawlHost);
  await page.waitForFunction(({host,count})=>state.room?.hostChatRoomId===host&&state.messages.length>=500&&state.chatMessages.length===300&&document.querySelector(`[data-message-id="${host}-${count-1}"]`),{host:crawlHost,count:crawlCount},{timeout:30000});
  const firstDisplayMs=await page.evaluate(()=>Math.round(performance.now()-window.__crawlStarted));
  const crawlComplete=await page.evaluate(()=>ensureFullChatHistory());assert.equal(crawlComplete,true,'the synthetic unique-timestamp history reaches a complete terminal state');
  const cacheFlushStart=Date.now();await page.evaluate(()=>FrommConversation.flush());const flushWaitMs=Date.now()-cacheFlushStart;
  const crawlMetrics=await page.evaluate(async({host,count,firstDisplayMs,scanStart,flushWaitMs})=>{const store=FrommConversationCore.createStore();try{const cached=await store.read(currentAccountScope(),host);return{count,firstDisplayMs,fullScanMs:Math.round(performance.now()-scanStart),flushWaitMs,cacheRows:cached?.messages.length||0,cacheComplete:cached?.meta.complete||false,chronological:state.messages.every((message,index)=>!index||new Date(state.messages[index-1].createdAt)<=new Date(message.createdAt)),visibleRows:document.querySelectorAll('#timeline .msg').length,latestVisible:!!document.querySelector(`[data-message-id="${host}-${count-1}"]`),usedHeapBytes:performance.memory?.usedJSHeapSize??null};}finally{await store.close();}},{host:crawlHost,count:crawlCount,firstDisplayMs,scanStart:await page.evaluate(()=>window.__crawlStarted),flushWaitMs});
  crawlMetrics.historyRequests=historyCalls.get(crawlHost)||0;crawlMetrics.incrementalRequests=feedCalls.get(crawlHost)||0;
  assert.equal(crawlMetrics.cacheRows,crawlCount);assert.equal(crawlMetrics.cacheComplete,true);assert.equal(crawlMetrics.chronological,true);assert.equal(crawlMetrics.latestVisible,true);assert.ok(crawlMetrics.visibleRows<=500);assert.ok(historyCalls.get(crawlHost)>100&&historyCalls.get(crawlHost)<=102,`history uses bounded 500-row inclusive pages (${historyCalls.get(crawlHost)})`);crawlMetrics.historyRequests=historyCalls.get(crawlHost);crawlMetrics.incrementalRequests=feedCalls.get(crawlHost)||0;
  results.push({syntheticColdScan:crawlMetrics});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({synthetic:true,browser:'Chromium',scale:results}));await context.close();
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

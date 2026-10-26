'use strict';
// Production loaders, real browser timers/DOM and OPFS; all service data is synthetic.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=process.env.MEDIA_PREP_BASELINE_HTML && fs.readFileSync(process.env.MEDIA_PREP_BASELINE_HTML,'utf8');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect width="100" height="120" fill="#5b6682"/></svg>';
const records=Array.from({length:3000},(_,i)=>({messageId:`synthetic-${i}`,createdAt:new Date(Date.UTC(2026,9,20)+i*1000).toISOString(),userType:'star',
 type:['image','text','video','text','sound','text'][i%6],content:i%2?'합성 대화':`https://cdn.example/original-${i}`,thumbnail:`https://cdn.example/preview-${i}.svg`}));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function fixture(browser,variant='after',width=1440){
 const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Seoul'});
 const page=await context.newPage(),metrics={history:0,active:0,maxActive:0,previews:0,previewActive:0,previewMax:0,originals:0,errors:[]};
 let fail=0,delay=30;
 page.on('pageerror',e=>metrics.errors.push(e.message));
 page.on('dialog',d=>d.dismiss());
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='viewer.test'){
   const file=url.pathname.split('/').pop()||'index.html';
   if(file==='index.html')return route.fulfill({contentType:'text/html',body:variant==='before'?baseline:current});
   if(['web-native-live.js','web-live-pip.js','web-live-chat-probe.js'].includes(file))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,file))});
   return route.abort();
  }
  if(url.hostname.endsWith('frommyarti.com')){
   assert.equal(route.request().method(),'GET');
   if(/\/v2\/chat\/message\/[^/]+\/messages$/.test(url.pathname)){
    metrics.history++;metrics.active++;metrics.maxActive=Math.max(metrics.maxActive,metrics.active);
    const status=fail,end=new Date(url.searchParams.get('findEndAt')).getTime();
    const messages=records.filter(m=>Date.parse(m.createdAt)<=end).slice(-Number(url.searchParams.get('limit'))).reverse();
    await new Promise(r=>setTimeout(r,delay));metrics.active--;
    return route.fulfill({status:status||200,contentType:'application/json',headers:{'retry-after':'2'},body:JSON.stringify({data:{messages:status?[]:messages},message:status?'synthetic error':undefined})}).catch(()=>{});
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{messages:[],liveRooms:[],channels:[],chatRooms:[],profile:{id:'synthetic-user'}}})});
  }
  if(url.hostname==='cdn.example'){
   if(url.pathname.startsWith('/preview-')){
    metrics.previews++;metrics.previewActive++;metrics.previewMax=Math.max(metrics.previewMax,metrics.previewActive);
    await new Promise(r=>setTimeout(r,70));metrics.previewActive--;
    return route.fulfill({contentType:'image/svg+xml',body:svg}).catch(()=>{});
   }
   metrics.originals++;
   return route.fulfill({contentType:'image/jpeg',body:Buffer.alloc(512,0x5a)}).catch(()=>{});
  }
  return route.abort();
 });
 await page.goto('https://viewer.test/index.html');
 await page.evaluate(()=>{
  setActiveAuth('synthetic-session','synthetic-device','synthetic-account');hideLoginGate();
  // Disable only automatic scroll intersection for this fixture: prove background without scrolling.
  window.IntersectionObserver=class{observe(){}disconnect(){}unobserve(){}};
  state.room={hostChatRoomId:'synthetic-room',host:{nick:'합성 아티스트'}};
  state.filter='image';state.sortDirection='desc';resetHistoryPaging();resetFullChatHistory();
  window.qa={};window.alert=()=>{};
 });
 return{page,context,metrics,setFailure:s=>fail=s,setDelay:d=>delay=d};
}
async function preparation(browser,variant,trial){
 const f=await fixture(browser,variant);
 try{
  // Match actual entry: latest page first, then 전체 대화 completes; no scrolling.
  await f.page.evaluate(async()=>{await loadMoreHistory({initial:true});await ensureFullChatHistory();});
  const before=f.metrics.history;
  const result=await f.page.evaluate(async()=>{
   state.filter='image';state.selected=new Set([state.messages.filter(m=>m.type==='image').at(-1).messageId]);
   const root=await navigator.storage.getDirectory();
   const dir=await root.getDirectoryHandle(`prep-${Date.now()}-${Math.random()}`,{create:true});
   // Test metadata latency without downloading any backup contents.
   for(let i=0;i<120;i++){
    const handle=await dir.getFileHandle(`2020-01-01_${i+1}.jpg`,{create:true});
    const w=await handle.createWritable();await w.write(new Uint8Array([1]));await w.close();
   }
   const wrap=(directory)=>({
    async *entries(){for await(const [name,h]of directory.entries())yield[name,{kind:h.kind,async getFile(){await new Promise(r=>setTimeout(r,2));return h.getFile();}}];},
    getFileHandle:directory.getFileHandle.bind(directory),getDirectoryHandle:directory.getDirectoryHandle.bind(directory),
    queryPermission:async()=> 'granted'
   });
   window.showDirectoryPicker=async()=>wrap(dir);
   const original=fetchMediaResponse;
   const started=performance.now();let firstRequest=0;
   fetchMediaResponse=async(...args)=>{if(!firstRequest)firstRequest=performance.now()-started;return original(...args);};
   const stamp=state.mediaSequenceStamp;
   await saveSelectedDirect();
   return{firstRequestMs:firstRequest,elapsedMs:performance.now()-started,filename:baseName(state.messages.filter(m=>m.type==='image').at(-1)),
    sequenceCacheReused:!!stamp&&stamp===state.mediaSequenceStamp,selected:state.selected.size,
    heap:performance.memory?.usedJSHeapSize||null,snapshotShared:state.messages===state.chatMessages};
  });
  assert.ok(result.firstRequestMs>0);assert.equal(f.metrics.maxActive,1);
  if(variant==='after'){assert.equal(f.metrics.history,before,'Save reuses prepared history');assert.equal(result.sequenceCacheReused,true);assert.equal(result.snapshotShared,true);}
  assert.deepEqual(f.metrics.errors,[]);
  return{variant,trial,...result,historyRequests:f.metrics.history,historyRequestsDuringSave:f.metrics.history-before};
 }finally{await f.context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true});const report={synthetic:true,records:records.length,apiDelayMs:30,backupFiles:120,trials:[],checks:[]};
 try{
  for(const width of[1440,390]){
   const f=await fixture(browser,'after',width);
   try{
    await f.page.evaluate(async()=>{await loadMoreHistory({initial:true});render();});
    await f.page.waitForFunction(()=>document.querySelectorAll('.media-card').length>0);
    const initial=await f.page.evaluate(()=>{window.savedCard=document.querySelector('.media-card');return{count:state.messages.length,y:scrollY};});
    assert.equal(initial.count,500);
    await f.page.evaluate(()=>{state.selected.add(state.infiniteList[0].messageId);syncDownloadSelection();});
    await f.page.waitForFunction(()=>!state.hasMoreMessages && state.chatHistoryComplete && !state.loadingMessages,null,{timeout:20000});
    const final=await f.page.evaluate(()=>({count:state.messages.length,same:window.savedCard===document.querySelector('.media-card'),y:scrollY,
     selected:state.selected.size,shared:state.chatMessages===state.messages,previews:state.prefetching.size,queued:previewQueue.length,previewActive}));
    assert.equal(await f.page.evaluate(()=>document.querySelector('.media-card .card-title').textContent===state.mediaSequence.get(document.querySelector('.media-card').dataset.messageId)),true,'provisional filename label updates without replacing the card');
    assert.equal(final.count,3000);assert.equal(final.same,true);assert.equal(final.y,initial.y);assert.equal(final.selected,1);assert.equal(final.shared,true);
    assert.ok(final.previews<=256);assert.ok(final.queued<=60);assert.ok(final.previewActive<=2);
    assert.equal(f.metrics.history,7);assert.equal(f.metrics.maxActive,1);assert.equal(f.metrics.originals,0,'no speculative originals/audio/video');
    const requests=f.metrics.history;
    await f.page.evaluate(async()=>{await ensureFullChatHistory();await setFilter('video');await setFilter('sound');await setFilter('image');});
    assert.equal(f.metrics.history,requests,'tab changes reuse metadata');
    assert.deepEqual(f.metrics.errors,[]);report.checks.push({width,...final,historyRequests:requests,originalRequests:0});
   }finally{await f.context.close();}
  }
  // Rate-limit, recovery and true in-flight AbortSignal at the browser fetch boundary.
  const f=await fixture(browser);
  try{
   f.setFailure(429);await f.page.evaluate(()=>loadMoreHistory({initial:true}));assert.equal(f.metrics.history,1);
   assert.equal(await f.page.evaluate(()=>state.hasMoreMessages),true);
   await f.page.evaluate(async()=>{try{await ensureAllHistory();}catch{}});assert.equal(f.metrics.history,1);
   f.setFailure(0);await f.page.evaluate(()=>{state.historyBlockedUntil=0;});
   f.setDelay(500);const pending=f.page.evaluate(()=>loadMoreHistory());
   await new Promise(r=>setTimeout(r,80));await f.page.evaluate(()=>{stopHistoryWork();state.scanGeneration++;resetHistoryPaging();});await pending;
   assert.equal(await f.page.evaluate(()=>state.messages.length),0);
   const logout=f.page.evaluate(()=>loadMoreHistory());await new Promise(r=>setTimeout(r,80));await f.page.evaluate(()=>resetUserScopedMemory());await logout;
   assert.equal(await f.page.evaluate(()=>state.room),null);assert.equal(await f.page.evaluate(()=>state.messages.length),0);
   assert.deepEqual(f.metrics.errors,[]);report.checks.push({rateLimitAndCancel:'passed'});
  }finally{await f.context.close();}
  // Data Saver has a smaller preview budget and a single speculative image slot.
  const limited=await fixture(browser);
  try{
   await limited.page.evaluate(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'2g'}}));
   await limited.page.evaluate(async()=>{await loadMoreHistory({initial:true});render();});
   assert.ok(await limited.page.evaluate(()=>previewActive<=1&&previewQueue.length<=12));
   await limited.page.evaluate(()=>{stopHistoryWork();resetPreviewWork();});assert.equal(limited.metrics.originals,0);
   report.checks.push({dataSaver:'passed'});
  }finally{await limited.context.close();}
  if(baseline){
   for(let trial=1;trial<=3;trial++)for(const variant of['before','after'])report.trials.push(await preparation(browser,variant,trial));
   const before=report.trials.filter(r=>r.variant==='before'),after=report.trials.filter(r=>r.variant==='after');
   report.beforeMs=median(before.map(r=>r.firstRequestMs));report.afterMs=median(after.map(r=>r.firstRequestMs));
   report.improvementPercent=(1-report.afterMs/report.beforeMs)*100;
   report.baselineAlreadyOptimized=baseline.includes('historyJob: null');
   if(!report.baselineAlreadyOptimized) assert.ok(report.afterMs<report.beforeMs*.7,'prepared Save should reduce click-to-request delay by at least 30% in controlled fixture');
   assert.equal(before[0].filename,after[0].filename,'backup filename numbering stays byte-compatible');
  }
  console.log(JSON.stringify(report,null,2));
  if(process.env.MEDIA_PREP_REPORT_PATH){fs.mkdirSync(path.dirname(process.env.MEDIA_PREP_REPORT_PATH),{recursive:true});fs.writeFileSync(process.env.MEDIA_PREP_REPORT_PATH,JSON.stringify(report,null,2));}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

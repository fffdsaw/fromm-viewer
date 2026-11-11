'use strict';
// Cache conflict contracts use synthetic rows and isolated IndexedDB databases.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');

const meta=(count,complete=true)=>({count,complete,cursorEnd:new Date(0).toISOString()});
const message=(content,id='same-id')=>({messageId:id,userType:'star',type:'text',content,createdAt:1791534600000});

(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 let context;
 try{
  ({context}=await open(browser,server.url,{login:false}));
  const page=context.pages()[0];
  async function write(name,rows,metadata,options){
   return page.evaluate(async({name,rows,metadata,options})=>{const store=FrommConversationCore.createStore({name});try{return await store.write('synthetic-account','synthetic-room',rows,metadata,options)}finally{await store.close()}},{name,rows,metadata,options});
  }
  async function read(name){
   return page.evaluate(async name=>{const store=FrommConversationCore.createStore({name});try{return await store.read('synthetic-account','synthetic-room')}finally{await store.close()}},name);
  }

  const legacy=await page.evaluate(async()=>{
   const name='cache-conflict-legacy-v1';
   await new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>{const db=request.result,rows=db.createObjectStore('messages',{keyPath:'key'});rows.createIndex('scope','scope');db.createObjectStore('rooms',{keyPath:'scope'});};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,scope=['synthetic-account','synthetic-room'],tx=db.transaction(['rooms','messages'],'readwrite');tx.objectStore('rooms').put({scope,count:1,complete:true,cursorEnd:new Date(0).toISOString()});tx.objectStore('messages').put({key:[...scope,'legacy-id'],scope,message:{messageId:'legacy-id',content:'existing v1 row',createdAt:1791534600000}});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
   });
   const store=FrommConversationCore.createStore({name});try{const value=await store.read('synthetic-account','synthetic-room');return{messages:value.messages.length,complete:value.meta.complete,content:value.messages[0].content,conflicts:value.conflicts.length}}finally{await store.close()}
  });
  assert.deepEqual(legacy,{messages:1,complete:true,content:'existing v1 row',conflicts:0},'opening the new cache protocol preserves legacy IndexedDB data');

  const upgrade=await page.evaluate(async()=>{
   const name='cache-conflict-live-v1-upgrade',scope=['synthetic-account','synthetic-room'];let versionchange=false;
   const legacyDb=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{const db=request.result,rows=db.createObjectStore('messages',{keyPath:'key'});rows.createIndex('scope','scope');db.createObjectStore('rooms',{keyPath:'scope'});};request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result)});
   const seed=legacyDb.transaction(['rooms','messages'],'readwrite');seed.objectStore('rooms').put({scope,count:1,complete:true,cursorEnd:new Date(0).toISOString()});seed.objectStore('messages').put({key:[...scope,'legacy-live'],scope,message:{messageId:'legacy-live',content:'live v1 row',createdAt:1791534600000}});await new Promise((resolve,reject)=>{seed.oncomplete=resolve;seed.onerror=()=>reject(seed.error)});
   legacyDb.onversionchange=()=>{versionchange=true;legacyDb.close()};
   const store=FrommConversationCore.createStore({name});let restored;try{restored=await store.read(...scope)}finally{await store.close()}
   const oldOpenError=await new Promise(resolve=>{const request=indexedDB.open(name,1);request.onerror=()=>resolve(request.error.name);request.onsuccess=()=>{request.result.close();resolve('opened')}});
   return{versionchange,content:restored.messages[0].content,complete:restored.meta.complete,oldOpenError};
  });
  assert.deepEqual(upgrade,{versionchange:true,content:'live v1 row',complete:true,oldOpenError:'VersionError'});

  const blockedUpgrade=await page.evaluate(async()=>{
   const name='cache-conflict-blocked-v1-upgrade',scope=['synthetic-account','synthetic-room'];
   const legacyDb=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{const db=request.result,rows=db.createObjectStore('messages',{keyPath:'key'});rows.createIndex('scope','scope');db.createObjectStore('rooms',{keyPath:'scope'});};request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result)});
   const seed=legacyDb.transaction(['rooms','messages'],'readwrite');seed.objectStore('rooms').put({scope,count:1,complete:true,cursorEnd:new Date(0).toISOString()});seed.objectStore('messages').put({key:[...scope,'blocked-live'],scope,message:{messageId:'blocked-live',content:'blocked v1 row',createdAt:1791534600000}});await new Promise((resolve,reject)=>{seed.oncomplete=resolve;seed.onerror=()=>reject(seed.error)});
   const store=FrommConversationCore.createStore({name});let blocked='';try{await store.read(...scope)}catch(error){blocked=error.message}legacyDb.close();
   const restored=await store.read(...scope);await store.close();return{blocked,content:restored.messages[0].content,complete:restored.meta.complete};
  });
  assert.deepEqual(blockedUpgrade,{blocked:'다른 창의 대화 저장소를 먼저 닫아주세요.',content:'blocked v1 row',complete:true});

  // A conflicting hot value cannot replace the pre-existing complete disk canonical.
  await write('cache-conflict-memory-old',[message('disk-new')],meta(1));
  await write('cache-conflict-memory-old',[message('memory-old')],meta(1));
  const memoryOld=await read('cache-conflict-memory-old');
  assert.equal(memoryOld.messages[0].content,'disk-new');
  assert.equal(memoryOld.meta.complete,true);
  assert.ok(memoryOld.conflicts.some(conflict=>conflict.candidates.some(candidate=>candidate.content==='memory-old')));

  // A conflicting hot value remains a candidate; content shape is not freshness proof.
  await write('cache-conflict-memory-new',[message('disk-old')],meta(1));
  await write('cache-conflict-memory-new',[message('memory-new')],meta(1));
  const memoryNew=await read('cache-conflict-memory-new');
  assert.equal(memoryNew.messages[0].content,'disk-old');
  assert.equal(memoryNew.meta.complete,true);
  assert.ok(memoryNew.conflicts.some(conflict=>conflict.candidates.some(candidate=>candidate.content==='memory-new')));

  // A partial writer cannot mutate either row content or completion metadata.
  await write('cache-conflict-incomplete',[message('complete-row')],meta(1));
  await write('cache-conflict-incomplete',[message('partial-row')],meta(1,false));
  const partial=await read('cache-conflict-incomplete');
  assert.equal(partial.messages[0].content,'complete-row');
  assert.equal(partial.meta.complete,true);
  assert.ok(partial.conflicts.some(conflict=>conflict.candidates.some(candidate=>candidate.content==='partial-row')));

  // Repeating the same server-shaped row or flushing the same value never
  // proves freshness and never changes the stored canonical value.
  await write('cache-conflict-server-check',[message('cached')],meta(1));
  await write('cache-conflict-server-check',[message('unverified')],meta(1));
  for(let i=0;i<4;i++)await write('cache-conflict-server-check',[message('server-current')],meta(1));
  const serverChecked=await read('cache-conflict-server-check');
  assert.equal(serverChecked.messages[0].content,'cached');
  assert.deepEqual(new Set(serverChecked.conflicts[0].candidates.map(candidate=>candidate.content)),new Set(['unverified','server-current']));
  assert.equal(serverChecked.meta.conflictCount,1);

  await write('cache-conflict-server-match',[message('server-value')],meta(1));
  await write('cache-conflict-server-match',[message('unverified-value')],meta(1));
  for(let i=0;i<4;i++)await write('cache-conflict-server-match',[message('server-value')],meta(1));
  const serverMatch=await read('cache-conflict-server-match');
  assert.equal(serverMatch.messages[0].content,'server-value');
  assert.deepEqual(serverMatch.conflicts[0].candidates.map(candidate=>candidate.content),['unverified-value']);
  assert.equal(serverMatch.meta.conflictCount,1);

  // A failed multi-chunk write followed by an identical retry is not a second
  // server observation and cannot promote or delete either stored value.
  const retry=await page.evaluate(async()=>{
   const name='cache-conflict-failed-retry',store=FrommConversationCore.createStore({name});
   await store.write('synthetic-account','synthetic-room',[{messageId:'same-id',content:'baseline',createdAt:1791534600000}],{count:1,complete:true,cursorEnd:new Date(0).toISOString()});
   const rows=[{messageId:'same-id',content:'candidate',createdAt:1791534600000},...Array.from({length:250},(_,i)=>({messageId:`retry-${i}`,content:`row-${i}`,createdAt:1791534601000+i}))];
   const nativePut=IDBObjectStore.prototype.put;let writes=0,errorName='';
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='messages'&&++writes===251)throw new DOMException('synthetic quota','QuotaExceededError');return nativePut.call(this,value,...args)};
   try{await store.write('synthetic-account','synthetic-room',rows,{count:rows.length,complete:false,cursorEnd:null});}catch(error){errorName=error.name;}finally{IDBObjectStore.prototype.put=nativePut;}
   const afterFailure=await store.read('synthetic-account','synthetic-room');
   await store.write('synthetic-account','synthetic-room',rows,{count:rows.length,complete:false,cursorEnd:null});
   const afterRetry=await store.read('synthetic-account','synthetic-room');await store.close();
   return{errorName,first:{canonical:afterFailure.messages.find(row=>row.messageId==='same-id').content,complete:afterFailure.meta.complete,candidates:afterFailure.conflicts.find(row=>row.messageId==='same-id')?.candidates.map(row=>row.content)},retry:{canonical:afterRetry.messages.find(row=>row.messageId==='same-id').content,complete:afterRetry.meta.complete,candidates:afterRetry.conflicts.find(row=>row.messageId==='same-id')?.candidates.map(row=>row.content)}};
  });
  assert.deepEqual(retry,{errorName:'QuotaExceededError',first:{canonical:'baseline',complete:true,candidates:['candidate']},retry:{canonical:'baseline',complete:true,candidates:['candidate']}});

  // Two separate tabs write different values for the same ID at once.
  const second=await context.newPage();await second.goto(server.url);await second.waitForFunction(()=>window.FrommConversationCore);
  const writes=await Promise.all([
   page.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',content:'tab-A',createdAt:1791534600000}],metadata)}finally{await s.close()}},meta(1,true)),
   second.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',content:'tab-B',createdAt:1791534600000}],metadata)}finally{await s.close()}},meta(1,false))
  ]);
  assert.deepEqual(writes,[true,true]);
  const multi=await read('cache-conflict-multitab');
  assert.ok(['tab-A','tab-B'].includes(multi.messages[0].content));
  const multiValues=new Set([multi.messages[0].content,...multi.conflicts.flatMap(conflict=>conflict.candidates.map(candidate=>candidate.content))]);
  assert.deepEqual(multiValues,new Set(['tab-A','tab-B']));
  assert.equal(multi.meta.conflictCount,1);

  await write('cache-conflict-multitab-server',[message('baseline')],meta(1));
  await Promise.all([
   page.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab-server'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',userType:'star',type:'text',content:'server-A',createdAt:1791534600000}],metadata)}finally{await s.close()}},meta(1,true)),
   second.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab-server'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',userType:'star',type:'text',content:'server-B',createdAt:1791534600000}],metadata)}finally{await s.close()}},meta(1,true))
  ]);
  const serverRace=await read('cache-conflict-multitab-server');
  assert.equal(serverRace.messages[0].content,'baseline','overlapping server observations cannot replace the complete baseline');
  assert.deepEqual(new Set(serverRace.conflicts.flatMap(conflict=>conflict.candidates.map(candidate=>candidate.content))),new Set(['server-A','server-B']));
  for(let i=0;i<4;i++)await write('cache-conflict-multitab-server',[message('server-B')],meta(1));
  const repeatedRace=await read('cache-conflict-multitab-server');
  assert.equal(repeatedRace.messages[0].content,'baseline','repeat writes cannot promote one racing tab value');
  assert.deepEqual(new Set(repeatedRace.conflicts.flatMap(conflict=>conflict.candidates.map(candidate=>candidate.content))),new Set(['server-A','server-B']));

  // Candidate storage is bounded. Overflow is visible and never replaces the
  // canonical row or removes candidates that were already committed.
  const overflow=await page.evaluate(async()=>{
   const name='cache-conflict-overflow',store=FrommConversationCore.createStore({name}),canonical={messageId:'same-id',content:'canonical',createdAt:1791534600000};
   await store.write('synthetic-account','synthetic-room',[canonical],{count:1,complete:true,cursorEnd:new Date(0).toISOString()});
   const candidates=Array.from({length:24},(_,i)=>({messageId:'same-id',content:`candidate-${i}`,createdAt:1791534600000}));let status;const started=performance.now();
   await store.write('synthetic-account','synthetic-room',[],{count:1,complete:true},{conflictCandidates:[{messageId:'same-id',canonical,candidates}],onConflictStatus:value=>status=value});
   const elapsed=Math.round(performance.now()-started),value=await store.read('synthetic-account','synthetic-room'),estimate=await navigator.storage.estimate();await store.close();
   return{elapsed,canonical:value.messages[0].content,candidates:value.conflicts[0].candidates.map(row=>row.content),overflow:value.conflicts[0].overflow,conflictCount:value.meta.conflictCount,overflowCount:value.meta.conflictOverflowCount,status,usage:Math.round(estimate.usageDetails?.indexedDB||0)};
  });
  assert.equal(overflow.canonical,'canonical');assert.equal(overflow.candidates.length,16);assert.equal(overflow.overflow,true);assert.equal(overflow.conflictCount,1);assert.equal(overflow.overflowCount,1);assert.equal(overflow.status.conflictOverflowCount,1);
  const byteOverflow=await page.evaluate(async()=>{
   const name='cache-conflict-byte-overflow',store=FrommConversationCore.createStore({name}),canonical={messageId:'same-id',content:'canonical',createdAt:1791534600000};
   await store.write('synthetic-account','synthetic-room',[canonical],{count:1,complete:true,cursorEnd:new Date(0).toISOString()});
   const candidate={messageId:'same-id',content:'x'.repeat(8*1024*1024+1024),createdAt:1791534600000};
   await store.write('synthetic-account','synthetic-room',[],{count:1,complete:true},{conflictCandidates:[{messageId:'same-id',canonical,candidates:[candidate]}]});
   const value=await store.read('synthetic-account','synthetic-room');await store.close();return{canonical:value.messages[0].content,candidates:value.conflicts[0].candidates.length,overflow:value.conflicts[0].overflow,overflowCount:value.meta.conflictOverflowCount};
  });
  assert.deepEqual(byteOverflow,{canonical:'canonical',candidates:0,overflow:true,overflowCount:1});

  // Large candidate sets remain readable without downgrading full-history coverage.
  const largeStart=performance.now();
  const large=await page.evaluate(async()=>{
   const name='cache-conflict-large',store=FrommConversationCore.createStore({name});
   const rows=Array.from({length:10000},(_,i)=>({messageId:'large-'+i,content:'synthetic-'+i,createdAt:1791534600000+i}));
   const changed=rows.map(row=>({...row,content:`candidate-${row.content}`}));
   try{await store.write('synthetic-account','synthetic-room',rows,{count:rows.length,complete:true,cursorEnd:new Date(0).toISOString()});const started=performance.now();await store.write('synthetic-account','synthetic-room',changed,{count:rows.length,complete:true,cursorEnd:new Date(0).toISOString()});const writeMs=Math.round(performance.now()-started),restored=await store.read('synthetic-account','synthetic-room'),estimate=await navigator.storage.estimate();return{count:restored.messages.length,unique:new Set(restored.messages.map(row=>row.messageId)).size,complete:restored.meta.complete,conflicts:restored.conflicts.length,candidateCount:restored.meta.conflictCandidateCount,overflow:restored.meta.conflictOverflowCount,canonical:restored.messages[0].content,candidate:restored.conflicts[0]?.candidates[0]?.content,writeMs,usage:Math.round(estimate.usageDetails?.indexedDB||0)}}finally{await store.close()}
  });
  const largeMs=Math.round(performance.now()-largeStart);
  assert.deepEqual({count:large.count,unique:large.unique,complete:large.complete,conflicts:large.conflicts,candidateCount:large.candidateCount,overflow:large.overflow,canonical:large.canonical,candidate:large.candidate},{count:10000,unique:10000,complete:true,conflicts:10000,candidateCount:10000,overflow:0,canonical:'synthetic-0',candidate:'candidate-synthetic-0'});
  console.log(`No auto-promotion after repeated writes/retry; v1 upgrade, multi-tab preservation, candidate overflow (${overflow.elapsed} ms / ${overflow.usage} bytes), 10k conflicts (${large.writeMs} ms / ${large.usage} bytes; total ${largeMs} ms) PASS`);
  await context.close();
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

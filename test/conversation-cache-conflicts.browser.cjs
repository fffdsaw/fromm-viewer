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

  // Older in-memory value must not replace a newer complete disk value.
  await write('cache-conflict-memory-old',[message('disk-new')],meta(1));
  await write('cache-conflict-memory-old',[message('memory-old')],meta(1));
  const memoryOld=await read('cache-conflict-memory-old');
  assert.equal(memoryOld.messages[0].content,'disk-new');
  assert.equal(memoryOld.meta.complete,true);
  assert.ok(memoryOld.conflicts.some(conflict=>conflict.candidates.some(candidate=>candidate.content==='memory-old')));

  // A newer-looking hot value is retained as a candidate, not treated as proof of freshness.
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

  // A direct server recheck is the only write allowed to resolve a conflict.
  await write('cache-conflict-server-check',[message('cached')],meta(1));
  await write('cache-conflict-server-check',[message('unverified')],meta(1));
  await write('cache-conflict-server-check',[message('server-current')],meta(1),{serverConfirmedIds:['same-id']});
  assert.equal((await read('cache-conflict-server-check')).messages[0].content,'cached','one server observation is tracked without replacing the complete row');
  await write('cache-conflict-server-check',[message('server-current')],meta(1),{serverConfirmedIds:['same-id']});
  const serverChecked=await read('cache-conflict-server-check');
  assert.equal(serverChecked.messages[0].content,'server-current');
  assert.deepEqual(serverChecked.conflicts,[]);
  assert.equal(serverChecked.meta.conflictCount,0);

  await write('cache-conflict-server-match',[message('server-value')],meta(1));
  await write('cache-conflict-server-match',[message('unverified-value')],meta(1));
  await write('cache-conflict-server-match',[message('server-value')],meta(1),{serverConfirmedIds:['same-id']});
  assert.equal((await read('cache-conflict-server-match')).conflicts.length,1,'one server observation cannot discard an alternate value');
  await write('cache-conflict-server-match',[message('server-value')],meta(1),{serverConfirmedIds:['same-id']});
  const serverMatch=await read('cache-conflict-server-match');
  assert.equal(serverMatch.messages[0].content,'server-value');
  assert.deepEqual(serverMatch.conflicts,[],'a server recheck matching the preserved value also resolves the conflict');
  assert.equal(serverMatch.meta.conflictCount,0);

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
   page.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab-server'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',userType:'star',type:'text',content:'server-A',createdAt:1791534600000}],metadata,{serverConfirmedIds:['same-id']})}finally{await s.close()}},meta(1,true)),
   second.evaluate(async metadata=>{const s=FrommConversationCore.createStore({name:'cache-conflict-multitab-server'});try{return await s.write('synthetic-account','synthetic-room',[{messageId:'same-id',userType:'star',type:'text',content:'server-B',createdAt:1791534600000}],metadata,{serverConfirmedIds:['same-id']})}finally{await s.close()}},meta(1,true))
  ]);
  const serverRace=await read('cache-conflict-multitab-server');
  assert.equal(serverRace.messages[0].content,'baseline','overlapping server observations cannot replace the complete baseline');
  assert.deepEqual(new Set(serverRace.conflicts.flatMap(conflict=>conflict.candidates.map(candidate=>candidate.content))),new Set(['server-A','server-B']));
  await write('cache-conflict-multitab-server',[message('server-B')],meta(1),{serverConfirmedIds:['same-id']});
  await write('cache-conflict-multitab-server',[message('server-B')],meta(1),{serverConfirmedIds:['same-id']});
  assert.equal((await read('cache-conflict-multitab-server')).messages[0].content,'server-B','a repeated server observation resolves to its stable value');

  // Large complete caches remain readable and are not silently downgraded.
  const largeStart=performance.now();
  const large=await page.evaluate(async()=>{
   const name='cache-conflict-large',store=FrommConversationCore.createStore({name});
   const rows=Array.from({length:10000},(_,i)=>({messageId:'large-'+i,content:'synthetic-'+i,createdAt:1791534600000+i}));
   try{await store.write('synthetic-account','synthetic-room',rows,{count:rows.length,complete:true,cursorEnd:new Date(0).toISOString()});const restored=await store.read('synthetic-account','synthetic-room');return{count:restored.messages.length,unique:new Set(restored.messages.map(row=>row.messageId)).size,complete:restored.meta.complete,conflicts:restored.conflicts.length,first:restored.messages[0].messageId,last:restored.messages.at(-1).messageId}}finally{await store.close()}
  });
  const largeMs=Math.round(performance.now()-largeStart);
  assert.deepEqual(large,{count:10000,unique:10000,complete:true,conflicts:0,first:'large-0',last:'large-9999'});
  console.log(`Same-ID preservation, v1 cache upgrade, incomplete writer, repeated server resolution, cross-tab writes and 10k restore PASS (${largeMs} ms)`);
  await context.close();
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

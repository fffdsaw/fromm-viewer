'use strict';
// IndexedDB crash/recovery contracts use synthetic accounts and messages only.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');

const makeRows=(prefix,count)=>Array.from({length:count},(_,i)=>({messageId:`${prefix}-${i}`,userType:'star',type:'text',content:`synthetic ${prefix} ${i}`,createdAt:Date.now()+i}));

(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 let context,page;
 try{
  ({page,context}=await open(browser,server.url,{login:false}));
  async function ready(next){await next.goto(server.url);await next.waitForFunction(()=>window.FrommConversationCore);return next;}
  async function readFrom(next,name,account='account-A'){
   return next.evaluate(async({name,account})=>{const store=FrommConversationCore.createStore({name});try{return await store.read(account,'room-A')}finally{await store.close()}},{name,account});
  }
  async function interruptAfterFirstChunk(next,name,{priorComplete=false}={}){
   const dialogPromise=new Promise(resolve=>next.once('dialog',resolve));
   const writing=next.evaluate(async({name,priorComplete})=>{
    const store=FrommConversationCore.createStore({name});
    if(priorComplete)await store.write('account-A','room-A',[{messageId:'old-complete',userType:'star',type:'text',content:'preserve me',createdAt:Date.now()-1000}],{count:1,complete:true,cursorEnd:new Date(Date.now()-2000).toISOString()});
    const nativePut=IDBObjectStore.prototype.put;let rowWrites=0;
    IDBObjectStore.prototype.put=function(value,...args){
     if(this.name==='messages'){
      rowWrites++;
      if(rowWrites===251)alert('stop after committed first batch');
     }
     return nativePut.call(this,value,...args);
    };
    const messages=Array.from({length:600},(_,i)=>({messageId:priorComplete&&i===0?'old-complete':`interrupted-${i}`,userType:'star',type:'text',content:priorComplete&&i===0?'attempted overwrite':'interrupted '+i,createdAt:Date.now()+i}));
    window.__interruptedWrite=store.write('account-A','room-A',messages,{count:messages.length,complete:false,cursorEnd:null}).catch(error=>{window.__writeError=error.name;});
   },{name,priorComplete});
   const dialog=await dialogPromise;
   assert.match(dialog.message(),/committed first batch/);
   // Close while the second batch is paused before its first IDB put.
   const closed=next.close({runBeforeUnload:false});
   await dialog.dismiss().catch(()=>{});
   await closed;
   await writing.catch(()=>{});
  }

  // Real Chromium tab close after the first 250-row transaction committed.
  await interruptAfterFirstChunk(page,'recovery-no-meta');
  page=await ready(await context.newPage());
  const orphan=await readFrom(page,'recovery-no-meta');
  assert.equal(orphan.messages.length,250);
  assert.equal(orphan.meta.complete,false,'orphaned rows are never reported as a complete history');
  assert.equal(orphan.meta.recoveredPartial,true);
  assert.equal(orphan.meta.count,250);

  // The same termination cannot downgrade a previously committed complete cache.
  await page.close();
  page=await ready(await context.newPage());
  await interruptAfterFirstChunk(page,'recovery-preserve-complete',{priorComplete:true});
  page=await ready(await context.newPage());
  const preserved=await readFrom(page,'recovery-preserve-complete');
  assert.equal(preserved.meta.complete,true);
  assert.equal(preserved.meta.count,1);
  assert.equal(preserved.messages.find(message=>message.messageId==='old-complete').content,'preserve me','an interrupted incomplete writer cannot overwrite a complete row');
  assert.ok(preserved.conflicts.some(conflict=>conflict.messageId==='old-complete'&&conflict.candidates.some(candidate=>candidate.content==='attempted overwrite')),'the interrupted collision remains available for later review');
  assert.equal(preserved.messages.filter(message=>message.messageId.startsWith('interrupted-')).length,249);

  // Separate tabs race a complete writer against a stale incomplete writer.
  const tabA=page,tabB=await ready(await context.newPage()),multi='recovery-multitab';
  const incompleteTabRows=makeRows('tab-incomplete',600);
  await Promise.all([
   tabA.evaluate(async({name,rows})=>{const s=FrommConversationCore.createStore({name});try{return await s.write('account-A','room-A',rows,{count:rows.length,complete:false,cursorEnd:null})}finally{await s.close()}},{name:multi,rows:incompleteTabRows}),
   tabB.evaluate(async name=>{const s=FrommConversationCore.createStore({name});try{return await s.write('account-A','room-A',[{messageId:'tab-complete',userType:'star',type:'text',content:'complete',createdAt:Date.now()}],{count:1,complete:true,cursorEnd:new Date().toISOString()})}finally{await s.close()}},multi)
  ]);
  await tabB.evaluate(async name=>{const s=FrommConversationCore.createStore({name});try{await s.write('account-A','room-A',[],{count:0,complete:false,cursorEnd:null})}finally{await s.close()}},multi);
  const raced=await readFrom(tabA,multi);
  assert.equal(raced.meta.complete,true,'an incomplete tab cannot downgrade a complete commit');
  assert.ok(raced.messages.some(message=>message.messageId==='tab-complete'));

  // A room/account switch at the first chunk boundary stops later writes.
  const switchName='recovery-account-switch';
  const switchRows=makeRows('switch',600);
  const switched=await tabA.evaluate(async({name,rows})=>{
   let activeAccount='account-A',checks=0;const store=FrommConversationCore.createStore({name});
   try{
    const result=await store.write('account-A','room-A',rows,{count:rows.length,complete:true},{current:()=>{checks++;if(checks>2)activeAccount='account-B';return activeAccount==='account-A'}});
    return{result,checks};
   }finally{await store.close()}
  },{name:switchName,rows:switchRows});
  assert.deepEqual(switched,{result:false,checks:3});
  const switchedRead=await readFrom(tabA,switchName);
  assert.equal(switchedRead.messages.length,250);
  assert.equal(switchedRead.meta.complete,false);
  assert.equal(await readFrom(tabA,switchName,'account-B'),null,'account A rows never enter the next account namespace');

  // Simulate a quota failure on the second chunk; the first committed chunk and
  // prior complete metadata remain readable. This is a deterministic quota fault,
  // not an actual device storage exhaustion test.
  const quotaName='recovery-quota';
  const quotaRows=makeRows('quota-new',600);
  const quota=await tabA.evaluate(async({name,rows})=>{
   const store=FrommConversationCore.createStore({name});
   await store.write('account-A','room-A',[{messageId:'quota-old',userType:'star',type:'text',content:'old',createdAt:Date.now()-10000}],{count:1,complete:true,cursorEnd:new Date(Date.now()-20000).toISOString()});
   const nativePut=IDBObjectStore.prototype.put;let rowWrites=0,errorName='';
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='messages'&&++rowWrites===251)throw new DOMException('synthetic quota','QuotaExceededError');return nativePut.call(this,value,...args)};
   try{await store.write('account-A','room-A',rows,{count:rows.length,complete:false,cursorEnd:null});}
   catch(error){errorName=error.name;}
   finally{IDBObjectStore.prototype.put=nativePut;}
   const result=await store.read('account-A','room-A');await store.close();
   return{errorName,count:result.messages.length,complete:result.meta.complete,metaCount:result.meta.count,old:result.messages.some(message=>message.messageId==='quota-old'),newRows:result.messages.filter(message=>message.messageId.startsWith('quota-new-')).length};
  },{name:quotaName,rows:quotaRows});
  assert.deepEqual(quota,{errorName:'QuotaExceededError',count:251,complete:true,metaCount:1,old:true,newRows:250});

  await context.close();
  console.log('IndexedDB mid-save tab close, partial-row recovery, complete-meta preservation, multi-tab race, account switch and simulated quota fault PASS');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

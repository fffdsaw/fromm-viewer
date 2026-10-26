'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=name=>{const m=html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm'));assert.ok(m,name);return m[0];};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function setup(response){
 const calls=[],warnings=[];
 const state={room:{hostChatRoomId:'fixture'},scanGeneration:1,messages:[],chatMessages:[],chatCache:new Map(),roomCache:new Map(),
  cursorEnd:new Date('2026-10-27'),pageTarget:500,pageRequestLimit:500,hasMoreMessages:true,seenMessageKeys:new Set(),
  infiniteList:[],infiniteRendered:0,filter:'all',historyBlockedUntil:0,historyLastRequestAt:0};
 const c=vm.createContext({state,Set,Map,Date,Math,Number,Promise,AbortController,DOMException,
  setTimeout,clearTimeout,navigator:{},document:{hidden:false},console:{warn:(...a)=>warnings.push(a)},
  $:()=>({textContent:''}),syncLoadingUI(){},updateHistoryStatus(){},renderCountsOnly(){},renderDateCalendar(){},
  cleanFailureReason:String,chatCacheKey:()=> 'fixture',saveRoomCache(){},buildMediaSequences(){state.built=(state.built||0)+1;},
  apiErrorStatus:e=>e?.status||0,extractMessages:data=>data.messages,
  compareMessages:(a,b)=>new Date(a.createdAt)-new Date(b.createdAt),
  requestHistoryPage:async(...args)=>{calls.push(args);return response(...args);},
 });
 for(const name of ['constrainedMediaConnection','historyAbortError','historyDelay','stopHistoryWork','scheduleHistoryBackground','publishCompleteHistory','loadMoreHistory','ensureAllHistory','ensureFullChatHistory']) vm.runInContext(source(name),c);
 return{c,state,calls,warnings,stop:()=>c.stopHistoryWork()};
}
const message=(id,time='2026-10-25T01:00:00Z')=>({messageId:id,type:'text',createdAt:time});
test('concurrent scroll/full-history/save callers share one cursor request and one metadata snapshot',async()=>{
 const gate=deferred();let n=0;
 const h=setup(async()=>{if(n++===0){await gate.promise;return{messages:[message('one'),message('one')]};}return{messages:[]};});
 try{
  const a=h.c.loadMoreHistory({initial:true}),b=h.c.ensureFullChatHistory(),d=h.c.ensureAllHistory();
  await new Promise(r=>setTimeout(r,20));assert.equal(h.calls.length,1);gate.resolve();await Promise.all([a,b,d]);
  assert.equal(h.calls.length,2);assert.equal(h.state.messages.length,1);
  assert.equal(h.state.chatMessages,h.state.messages);assert.equal(h.state.chatHistoryComplete,true);
  assert.equal(h.state.built,1,'complete numbering built once');
 }finally{h.stop();}
});
test('429 stops without a 100-limit retry and blocks foreground requests during Retry-After',async()=>{
 const h=setup(async()=>{throw Object.assign(new Error('HTTP 429'),{status:429,retryAfterMs:8000});});
 try{await h.c.loadMoreHistory();assert.equal(h.calls.length,1);assert.equal(h.state.pageRequestLimit,500);
  await assert.rejects(h.c.ensureAllHistory(),/429/);assert.equal(h.calls.length,1);assert.equal(h.state.hasMoreMessages,true);
  assert.equal(h.state.historyTimer,null);
 }finally{h.stop();}
});
test('only explicit limit rejection retries at 100; successful pages retain exact ordering/deduplication',async()=>{
 let n=0;const h=setup(async()=>{if(n++===0)throw Object.assign(new Error('limit'),{status:400});return{messages:[]};});
 try{await h.c.ensureAllHistory();assert.deepEqual(h.calls.map(c=>c[2]),[500,100]);assert.equal(h.state.hasMoreMessages,false);}finally{h.stop();}
});
test('account/artist cancellation aborts the in-flight request and rejects late metadata',async()=>{
 const gate=deferred();const h=setup(async()=>{await gate.promise;return{messages:[message('stale')]};});
 const p=h.c.loadMoreHistory();await new Promise(r=>setTimeout(r,10));const signal=h.calls[0][3];
 h.stop();h.state.scanGeneration++;h.state.room={hostChatRoomId:'new'};gate.resolve();await p;
 assert.equal(signal.aborted,true);assert.equal(h.state.messages.length,0);assert.equal(h.state.chatCache.size,0);
});
test('nonadvancing or invalid timestamps leave history incomplete and prevent unsafe filenames',async()=>{
 const h=setup(async()=>({messages:[message('bad','invalid')]}));
 try{await assert.rejects(h.c.ensureAllHistory(),/커서/);assert.equal(h.state.hasMoreMessages,true);assert.notEqual(h.state.chatHistoryComplete,true);}finally{h.stop();}
});
test('hidden pages and playback defer background metadata without issuing server requests',async()=>{
 const h=setup(async()=>({messages:[]}));
 try{h.c.document.hidden=true;h.c.scheduleHistoryBackground();await new Promise(r=>setTimeout(r,850));
  assert.equal(h.calls.length,0);assert.ok(h.state.historyTimer);h.stop();
  h.c.document.hidden=false;h.state.filter='live';h.c.scheduleHistoryBackground();await new Promise(r=>setTimeout(r,850));assert.equal(h.calls.length,0);
 }finally{h.stop();}
});

test('a stalled metadata request times out and releases its parent cancellation listener',async()=>{
 const signal=new AbortController().signal;
 const c=vm.createContext({Date,Number,AbortController,Promise,Error,clearTimeout,
  setTimeout:fn=>setTimeout(fn,5),state:{cursorEnd:new Date('2026-10-27')},
  FROMM_COMPAT:{endpoints:{messages:id=>'/messages/'+id}},
  frommApiJson:(_path,_query,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))});
 vm.runInContext(source('normalizeHistoryCursor'),c);vm.runInContext(source('requestHistoryPage'),c);
 await assert.rejects(c.requestHistoryPage('fixture',c.state.cursorEnd,500,signal),/시간이 초과/);
 assert.equal(signal.aborted,false,'timeout does not abort the caller/session');
});

test('a new full-history waiter joins final numbering even after the last empty API page',async()=>{
 const gate=deferred();const h=setup(async()=>({messages:[]}));
 h.c.buildMediaSequences=()=>gate.promise;
 const original=h.c.loadMoreHistory();
 await new Promise(r=>setTimeout(r,10));assert.equal(h.state.hasMoreMessages,false);assert.equal(h.state.loadingMessages,true);
 let finished=false;const waiter=h.c.ensureAllHistory().then(()=>{finished=true;});
 await new Promise(r=>setTimeout(r,10));assert.equal(finished,false);
 gate.resolve();await Promise.all([original,waiter]);assert.equal(h.calls.length,1);assert.equal(h.state.chatHistoryComplete,true);h.stop();
});

test('artist cache keeps at most two metadata snapshots and evicts the matching full-chat reference',()=>{
 const h=setup(async()=>({messages:[]}));
 h.c.roomCacheKey=()=>h.state.room.hostChatRoomId;
 vm.runInContext(source('saveRoomCache'),h.c);
 for(const id of ['a','b','c']){h.state.room={hostChatRoomId:id};h.state.chatCache.set(id,[]);h.c.saveRoomCache();}
 assert.deepEqual([...h.state.roomCache.keys()],['b','c']);assert.deepEqual([...h.state.chatCache.keys()],['b','c']);
});
for(const status of [401,500,503]) test(`HTTP ${status} pauses metadata instead of issuing a smaller-limit fallback`,async()=>{
 const h=setup(async()=>{throw Object.assign(new Error(`HTTP ${status}`),{status});});
 try{await h.c.loadMoreHistory();assert.equal(h.calls.length,1);assert.equal(h.state.historyTimer,null);assert.equal(h.state.hasMoreMessages,true);assert.notEqual(h.state.chatHistoryComplete,true);}finally{h.stop();}
});

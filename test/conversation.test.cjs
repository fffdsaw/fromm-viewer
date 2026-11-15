'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createFeed,createStore,readRules,validateText}=require('../web-conversation-core.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate){for(let i=0;i<1000&&!predicate();i++)await wait(4);assert.ok(predicate(),'expected condition before deadline');}
const rules=()=>({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:8,maxSendChatCount:5,chatCountInterval:86400,forbiddenWords:['금지','BLOCK']}}}});
test('verified room-rule envelope controls length and case-insensitive restricted words',()=>{
 const value=readRules(rules());assert.equal(value.max,8);assert.equal(value.maxCount,5);assert.equal(value.intervalSeconds,86400);
 assert.equal(validateText(' 안녕하세요 ',value),'안녕하세요');assert.throws(()=>validateText('         ',value));assert.throws(()=>validateText('123456789',value));assert.throws(()=>validateText('금지 문구',value));assert.throws(()=>validateText('block',value));
 for(const bad of [{},{data:{chatRoom:{}}},{data:{chatRoom:{sendChatRules:{chatMaxLength:-1}}}},{data:{chatRoom:{sendChatRules:{chatMaxLength:10001}}}}])assert.throws(()=>readRules(bad));
});
test('storage is optional and failure is explicit rather than silently claiming saved history',async()=>{
 const store=createStore({indexedDB:null});await assert.rejects(store.read('account','room'),/지원하지/);await assert.rejects(store.read('anonymous','room'),/계정/);
});
test('incremental read catches up 1200 messages in order despite a server cap below the requested limit',async t=>{
 const end=Date.now(),start=end-1300000,rows=Array.from({length:1200},(_,i)=>({messageId:'m'+i,createdAt:start+i*1000,content:String(i)}));
 const saved=new Map();let synced=0,inflight=0,peak=0,calls=0;
 const feed=createFeed({latest:()=>start,current:()=>true,interval:100000,
  requestPage:async({start,end})=>{calls++;inflight++;peak=Math.max(peak,inflight);await wait(1);inflight--;return rows.filter(m=>m.createdAt>=start&&m.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,50)},
  onMessages:messages=>{for(const row of messages)saved.set(row.messageId,row)},onSynced:time=>synced=time});t.after(()=>feed.stop());feed.start();
 await until(()=>synced>0);assert.equal(saved.size,1200);assert.equal(peak,1);assert.ok(calls>=24);assert.deepEqual([...saved.values()].sort((a,b)=>a.createdAt-b.createdAt).map(x=>x.messageId),rows.map(x=>x.messageId));
});
test('repeated push hints coalesce and cannot start overlapping GETs',async t=>{
 let release,calls=0,done=0;const gate=new Promise(r=>release=r);
 const feed=createFeed({requestPage:async()=>{calls++;if(calls===1)await gate;return[]},onMessages:()=>{},onSynced:()=>done++,interval:100000});t.after(()=>feed.stop());feed.start();await until(()=>calls===1);
 for(let i=0;i<50;i++)feed.poke();assert.equal(calls,1);release();await until(()=>done===2);assert.equal(calls,2);
});
for(const status of [401,403,404,410])test(`HTTP ${status} stops automatic reads without a retry loop`,async()=>{
 let calls=0,phase='';const feed=createFeed({requestPage:async()=>{calls++;throw Object.assign(new Error('denied'),{status})},onMessages:()=>{},onState:value=>phase=value});feed.start();await until(()=>phase==='denied');assert.equal(feed.active,false);feed.poke();await wait(20);assert.equal(calls,1);feed.stop();
});
test('429 Retry-After and temporary network failures remain delayed even after a push hint',async()=>{
 for(const error of [Object.assign(new Error('rate'),{status:429,retryAfterMs:60000}),new TypeError('network')]){
  let calls=0,phase='';const feed=createFeed({requestPage:async()=>{calls++;throw error},onMessages:()=>{},onState:value=>phase=value});feed.start();await until(()=>phase==='retry');feed.poke();await wait(30);assert.equal(calls,1);feed.stop();
 }
});
test('stop aborts a pending request and prevents stale rows or completion from publishing',async()=>{
 let signal,release,published=0;const gate=new Promise(r=>release=r);
 const feed=createFeed({requestPage:async options=>{signal=options.signal;await gate;return[{messageId:'late',createdAt:Date.now()}]},onMessages:()=>published++,onSynced:()=>published++});feed.start();await until(()=>signal);feed.stop();assert.equal(signal.aborted,true);release();await wait(20);assert.equal(published,0);
});
test('account/room validity gates a response even when its transport ignores AbortSignal',async()=>{
 let valid=true,release,started=false,published=false;const gate=new Promise(r=>release=r);
 const feed=createFeed({current:()=>valid,requestPage:async()=>{started=true;await gate;return[]},onMessages:()=>published=true});feed.start();await until(()=>started);valid=false;release();await wait(20);assert.equal(published,false);feed.stop();
});
test('a saturated same-timestamp boundary fails visibly instead of skipping messages',async()=>{
 const time=Date.now()-10;let phase='',synced=false;
 const feed=createFeed({latest:()=>time-1000,limit:3,requestPage:async()=>Array.from({length:3},(_,i)=>({messageId:'m'+i,createdAt:time})),onMessages:()=>{},onSynced:()=>synced=true,onState:value=>phase=value});feed.start();await until(()=>phase==='error');assert.equal(synced,false);assert.equal(feed.active,false);feed.stop();
});
test('a saturated tie exactly at the existing watermark is not silently marked synced',async()=>{
 const time=Date.now()-1000,serverRows=Array.from({length:4},(_,i)=>({messageId:'watermark-tie-'+i,createdAt:time}));
 let phase='',synced=false,calls=0,request;
 const saved=new Set();
 const feed=createFeed({latest:()=>time,limit:3,interval:100000,
  requestPage:async options=>{calls++;request=options;return serverRows.slice(0,3);},onMessages:rows=>rows.forEach(row=>saved.add(row.messageId)),
  onSynced:()=>synced=true,onState:value=>phase=value});feed.start();
 await until(()=>synced||phase==='error');feed.stop();
 assert.equal(synced,false,'a saturated page at the prior watermark cannot prove all same-time rows were fetched');
 assert.equal(phase,'error');assert.equal(calls,1);
 assert.equal(saved.size,3,'only rows actually returned by the server can be saved');
 assert.equal(request.start,time-120000);assert.ok(request.end>=time);assert.equal(request.limit,3);
});
test('production integration uses verified send fields, fresh rules and a single explicit POST',()=>{
 const js=fs.readFileSync(require.resolve('../web-conversation.js'),'utf8');
 assert.match(js,/\/v2\/chat\/fanChatRooms\//);assert.match(js,/\/replies/);assert.match(js,/const body=\{code,chatRoomId:c\.roomId,content:text\}/);assert.match(js,/if\(emoticon\)body\.emoticonItemId=emoticon\.apiId/);assert.match(js,/getRules\(c,\{fresh:true\}\)/);assert.match(js,/isComposing/);assert.match(js,/inMemoryPersistence/);
 assert.equal((js.match(/method:'POST'/g)||[]).length,1,'no background or retry send path');
});

test('emoticon payloads use verified envelopes and allow text-free sends only with a selection',()=>{
 const {cleanEmoticon,readEmoticonPacks,readEmoticonItems}=require('../web-conversation-core.js'),rule=readRules(rules());
 assert.throws(()=>validateText('',rule));assert.equal(validateText('',rule,{allowEmpty:true}),'');assert.throws(()=>validateText('금지',rule,{allowEmpty:true}));
 assert.throws(()=>readEmoticonPacks({data:{packs:[]}}));assert.throws(()=>readEmoticonItems({data:{items:[]}},'p'));
 assert.deepEqual(readEmoticonPacks({data:{emoticonPacks:[]}}),[]);assert.equal(readEmoticonPacks({data:{emoticonPacks:[{id:'p',titleNameOverseas:{ko:'인사'},tabIconUrl:'https://fixture.test/tab.svg'}]}})[0].name,'인사');
 const items=readEmoticonItems({data:{emoticonItems:[{id:'ok',imageUrl:'https://fixture.test/sticker.svg'},{id:'x',imageUrl:'javascript:alert(1)'},{imageUrl:'https://fixture.test/no-id.svg'}]}},'p');
 assert.equal(readEmoticonItems({data:{emoticonItems:[{id:12,imageUrl:'https://fixture.test/e.svg'}]}},'p')[0].apiId,12);assert.equal(items.length,1);assert.equal(items[0].packId,'p');assert.equal(cleanEmoticon({...items[0],packId:''}),null);assert.equal(cleanEmoticon({...items[0],imageUrl:'data:image/svg+xml,x',thumbnailUrl:''}),null);
});

'use strict';
// Isolated synthetic chat, delayed SVG/MP4/WAV bytes, real wheel input, DOM,
// HTMLMediaElements and IndexedDB. Never uses a production account or files.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const video=fs.readFileSync(path.join(__dirname,'fixtures/rich-card.mp4'));
function wav(){const b=Buffer.alloc(44+8000*2*24);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
const voice=wav(),svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000"><rect width="600" height="1000" fill="#94d9c4"/><circle cx="300" cy="240" r="100" fill="#edf8f0"/></svg>';
const output=process.env.CONVERSATION_DIR;
async function mediaRoutes(page,wait=()=>Promise.resolve()){
 const requested=new Set();
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(!url.pathname.startsWith('/rich-'))return route.fallback();
  requested.add(url.pathname);await wait();
  const body=url.pathname.endsWith('.mp4')?video:url.pathname.endsWith('.wav')?voice:svg;
  const contentType=url.pathname.endsWith('.mp4')?'video/mp4':url.pathname.endsWith('.wav')?'audio/wav':'image/svg+xml';
  const range=/bytes=(\d+)-(\d*)/.exec(route.request().headers().range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(body.length-1,Number(range[2])):body.length-1;
  await route.fulfill({status:range?206:200,contentType,headers:{'cache-control':'no-store','accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${body.length}`}:{})},body:typeof body==='string'?body:body.subarray(start,end+1)}).catch(()=>{});
 });return requested;
}
async function screenshot(page,name){if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png')});}}
async function scrolling(browser,url,width){
 const {page,context,errors}=await open(browser,url,{width});let release;
 const gate=new Promise(resolve=>release=resolve),requested=await mediaRoutes(page,()=>gate);
 await page.evaluate(async width=>{
  FrommThemes.set(width===900?'classic':'glow');FrommViewState.cancel();FrommChatLayout.clear();state.chunkSize=12;state.filter='all';state.chatHistoryComplete=true;state.chatAutoTopPending=false;
  state.messages=Array.from({length:180},(_,i)=>{
   const m={messageId:'rich-'+i,userType:'star',type:'text',content:'합성 대화 읽기 위치 '+i,createdAt:1791534600000+i*1000};
   if(i>=24&&i<48){const type=['image','sticker','video','sound'][i%4];m.type=type==='sticker'?'text':type;m.content=type==='sticker'?'':location.origin+`/rich-${type==='image'?'photo.svg':type==='video'?'video.mp4':'voice.wav'}?i=${i}`;if(type==='sticker')m.emoticonUrl=location.origin+'/rich-sticker.svg?i='+i;}
   return m;
  });state.chatMessages=state.messages;FrommViewState.enter('all',{autoTop:false});renderChatWindow(filteredMessages(),80);FrommViewState.cancel();
  window.initialStart=state.chatWindowStart;const reader=document.querySelector('[data-message-id="rich-65"]');reader.scrollIntoView({block:'center'});
  await new Promise(requestAnimationFrame);
 },width);
 // Exercise the real prepend observer rather than invoking prepend directly.
 await page.mouse.move(width*.6,450);await page.mouse.wheel(0,-1800);
 await page.waitForFunction(()=>state.chatWindowStart<initialStart&&document.querySelector('#timeline .chat-rich-message'));
 for(let i=0;i<4;i++){await page.mouse.wheel(0,-900);await page.waitForTimeout(90);if(await page.evaluate(()=>state.chatWindowStart<=24))break;}
 await page.waitForFunction(()=>document.querySelector('[data-message-id="rich-42"] video'));
 await page.evaluate(async()=>{
  document.querySelector('[data-message-id="rich-49"]').scrollIntoView({block:'center'});
  for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
 });
 await page.mouse.wheel(0,80);await page.waitForTimeout(120);
 const before=await page.evaluate(()=>{
  window.reader=document.querySelector('[data-message-id="rich-49"]');window.readerTop=reader.getBoundingClientRect().top;
  return{top:readerTop,rows:document.querySelectorAll('#timeline .msg').length,rich:[...document.querySelectorAll('#timeline .chat-rich-message')].map(el=>({visibility:getComputedStyle(el).contentVisibility,height:el.getBoundingClientRect().height}))};
 });
 assert.ok(before.rich.length>=12);assert.ok(before.rich.every(row=>row.visibility==='visible'&&row.height>0),'rich cards use their own layout instead of skipped 80px placeholders: '+JSON.stringify(before.rich));
 // A slow response can arrive after the old 12-second prepend watch expired,
 // and after wheel input. It must preserve the NEW reader, not an old bookmark.
 await page.waitForTimeout(width===1440?12500:250);
 await page.evaluate(()=>{window.maxRichDrift=0;window.richFrames=0;window.richLayoutObserver=new ResizeObserver(()=>{maxRichDrift=Math.max(maxRichDrift,Math.abs(reader.getBoundingClientRect().top-readerTop));});richLayoutObserver.observe(document.querySelector("#timeline"));const sample=()=>{if(++richFrames<60)requestAnimationFrame(sample);else richLayoutObserver.disconnect();};requestAnimationFrame(sample);});
 release();await page.waitForFunction(()=>richFrames===60);
 const drift=await page.evaluate(()=>maxRichDrift);assert.ok(drift<3,`late mixed-media layout drift ${drift}px at ${width}`);
 assert.ok(requested.has('/rich-photo.svg')&&requested.has('/rich-sticker.svg')&&requested.has('/rich-video.mp4')&&requested.has('/rich-voice.wav'),'real delayed photo/sticker/video/voice requests were exercised');
 console.log(`${width}px late-load anchor drift: ${drift.toFixed(3)}px`);
 await page.evaluate(async()=>{
  FrommViewState.cancel();renderChatWindow(filteredMessages(),44);document.querySelector('[data-message-id="rich-45"]').scrollIntoView({block:'center'});
  window.keptVideo=document.querySelector('[data-message-id="rich-42"] video');window.keptVoice=document.querySelector('[data-message-id="rich-43"] audio');window.keptSticker=document.querySelector('[data-message-id="rich-41"] img');
  keptVideo.muted=true;keptVideo.loop=true;keptVoice.muted=true;keptVoice.loop=true;
  await Promise.race([keptVideo.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('MP4 playback timeout')),8000))]);
  document.querySelector('[data-message-id="rich-43"] .chat-audio-play').click();
  window.mediaPauses=0;keptVideo.addEventListener('pause',()=>mediaPauses++);keptVoice.addEventListener('pause',()=>mediaPauses++);
  FrommViewState.cancel();
 });
 await page.waitForFunction(()=>keptVideo.currentTime>0&&keptVoice.currentTime>0);
 await page.evaluate(()=>renderChatWindow(filteredMessages(),46));await page.waitForTimeout(60);
 await page.evaluate(()=>render());await page.waitForTimeout(250);
 assert.deepEqual(await page.evaluate(()=>({video:document.querySelector('[data-message-id="rich-42"] video')===keptVideo,voice:document.querySelector('[data-message-id="rich-43"] audio')===keptVoice,sticker:document.querySelector('[data-message-id="rich-41"] img')===keptSticker,connected:keptVideo.isConnected&&keptVoice.isConnected,playing:!keptVideo.paused&&!keptVoice.paused,pauses:mediaPauses})),{video:true,voice:true,sticker:true,connected:true,playing:true,pauses:0});
 await screenshot(page,'rich-media-stable-'+width);assert.deepEqual(errors,[]);
 console.log(`${width}px: real wheel prepends, all four rich card layouts, ${width===1440?'12.5s':'250ms'} late responses after user input: max visible drift ${drift.toFixed(3)}px; retained MP4/WAV/sticker nodes and uninterrupted playback PASS`);
 await context.close();
}
async function live(browser,url){
 const {page,context,errors}=await open(browser,url,{login:true});await mediaRoutes(page);let reads=0,historyReads=0;
 const base=Date.now()-300000,rows=Array.from({length:180},(_,i)=>({messageId:'live-old-'+i,hostChatRoomId:'rich-host',userType:'star',type:['image','video','sound'][i%3],content:new URL(`/rich-${i%3===0?'photo.svg':i%3===1?'video.mp4':'voice.wav'}?old=${i}`,url).href,createdAt:base+i*1000}));
 await page.route('**/*',async route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
  const answer=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data})}).catch(()=>{});
  if(u.pathname==='/v2/user/fan/profile')return answer({profile:{id:'rich-synthetic-user'}});
  if(u.pathname==='/v2/auth/signin/firebase/secure/reader')return answer({accessToken:'fixture.'+Buffer.from(JSON.stringify({accessHostChatRoomIds:['rich-host']})).toString('base64url')+'.signature'});
  if(u.pathname.startsWith('/v2/chat/fanChatRooms/'))return answer({chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}});
  if(u.pathname==='/v2/chat/message/rich-host/messages'){
   reads++;const from=Date.parse(u.searchParams.get('findStartAt')),to=Date.parse(u.searchParams.get('findEndAt')),limit=Number(u.searchParams.get('limit'));if(from<946684800001)historyReads++;
   return answer({messages:rows.filter(row=>row.createdAt>=from&&row.createdAt<=to).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)});
  }return route.fallback();
 });
 await page.evaluate(async rows=>{
  setActiveAuth('synthetic-rich-token','synthetic-rich-device','');hideLoginGate();await ensureReplyIdentity();
  window.pushClosed=0;window.pushSubscriptions=0;
  FrommConversation.loadFirebase=async()=>({inMemoryPersistence:'memory',initializeApp:()=>({}),initializeAuth:()=>({}),signInWithCustomToken:async()=>{},initializeFirestore:()=>({}),collection:(...a)=>a,where:(...a)=>a,query:(...a)=>a,onSnapshot:(_q,_o,callback,error)=>{pushSubscriptions++;window.richPush=()=>callback({metadata:{fromCache:false},docChanges:()=>[{type:'added'}]});window.failRichPush=error;callback({metadata:{fromCache:false},docChanges:()=>[]});return()=>pushClosed++;},terminate:async()=>{},deleteApp:async()=>{}});
  const store=FrommConversationCore.createStore();try{await store.write('user:rich-synthetic-user','rich-host',rows,{count:rows.length,complete:true,syncedUntil:Date.now()-60000})}finally{await store.close()}
  state.chunkSize=12;state.rooms=[{id:'rich-room',hostChatRoomId:'rich-host',host:{nick:'합성 실시간 아티스트'}}];
  const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button);
 },rows);
 await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected'&&typeof richPush==='function');
 const latencies=[];
 for(const [filter,type] of [['media','image'],['image','image'],['video','video'],['sound','sound']]){
  await page.evaluate(filter=>setFilter(filter),filter);await page.waitForFunction(filter=>state.filter===filter&&document.querySelector('#timeline .media-card'),filter);
  await page.evaluate(()=>{FrommViewState.cancel();scrollTo({top:0,behavior:'instant'});});
  const id='live-'+filter,started=Date.now();rows.push({messageId:id,hostChatRoomId:'rich-host',userType:'star',type,content:new URL(`/rich-${type==='image'?'photo.svg':type==='video'?'video.mp4':'voice.wav'}?new=${id}`,url).href,createdAt:Date.now()-1});
  const count=reads;await page.evaluate(()=>richPush());await page.locator(`[data-message-id="${id}"]`).waitFor({state:'attached',timeout:5000});latencies.push({filter,ms:Date.now()-started});
  assert.ok(reads>count,'push hints use the existing REST reader');assert.equal(await page.locator('#timeline .media-card').first().getAttribute('data-message-id'),id,'newest media appears without manual refresh');
  assert.equal(await page.evaluate(()=>pushSubscriptions),1);assert.equal(await page.evaluate(()=>pushClosed),0,'tab switches retain one subscription');
 }
 // Away from the top, insert new cards around existing nodes. A playing audio
 // element must neither detach/pause nor move the reader to the newest card.
 await page.locator('#timeline .media-card').nth(10).scrollIntoViewIfNeeded();await page.mouse.wheel(0,80);await page.waitForTimeout(120);
 const anchor=await page.evaluate(async()=>{
  FrommViewState.cancel();window.liveAnchor=[...document.querySelectorAll('#timeline .media-card')].find(el=>el.getBoundingClientRect().bottom>chatHeaderInset()+8);window.liveVoice=liveAnchor.querySelector('audio');liveVoice.muted=true;liveVoice.loop=true;liveAnchor.querySelector('.chat-audio-play').click();window.livePauses=0;liveVoice.addEventListener('pause',()=>livePauses++);
  return{id:liveAnchor.dataset.messageId,top:liveAnchor.getBoundingClientRect().top};
 });
 rows.push({messageId:'live-away-sound',hostChatRoomId:'rich-host',userType:'star',type:'sound',content:new URL('/rich-voice.wav?away',url).href,createdAt:Date.now()-1});
 await page.evaluate(()=>richPush());await page.locator('[data-message-id="live-away-sound"]').waitFor({state:'attached'});await page.waitForTimeout(700);
 assert.ok(Math.abs(await page.evaluate(()=>liveAnchor.getBoundingClientRect().top)-anchor.top)<3,'live insert preserves the reader');
 assert.equal(await page.evaluate(()=>liveVoice.isConnected&&!liveVoice.paused&&livePauses===0),true,'live insert keeps real voice playback connected');
 const rendered=await page.locator('#timeline .media-card').count();rows.push({messageId:'live-text-only',hostChatRoomId:'rich-host',userType:'star',type:'text',content:'미디어 목록을 늘리지 않는 합성 텍스트',createdAt:Date.now()-1});
 await page.evaluate(()=>richPush());await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='live-text-only'));await page.waitForTimeout(150);
 assert.equal(await page.locator('#timeline .media-card').count(),rendered,'nonmedia arrivals never append extra old gallery chunks');
 // A failed push connection immediately hands over to the same bounded REST
 // reader; subsequent arrivals are picked up by its real three-second timer.
 await page.evaluate(()=>failRichPush(new Error('synthetic disconnected push')));await page.waitForTimeout(250);
 const fallbackStart=Date.now();rows.push({messageId:'live-rest-sound',hostChatRoomId:'rich-host',userType:'star',type:'sound',content:new URL('/rich-voice.wav?fallback',url).href,createdAt:Date.now()-1});
 await page.locator('[data-message-id="live-rest-sound"]').waitFor({state:'attached',timeout:5500});const fallbackMs=Date.now()-fallbackStart;
 await page.evaluate(()=>FrommConversation.flush());
 const cache=await page.evaluate(async()=>{const store=FrommConversationCore.createStore();try{const saved=await store.read('user:rich-synthetic-user','rich-host');return{count:saved.messages.length,complete:saved.meta.complete,unique:new Set(saved.messages.map(m=>m.messageId)).size}}finally{await store.close()}});
 assert.deepEqual(cache,{count:rows.length,complete:true,unique:rows.length});assert.equal(historyReads,0,'live media never rescans complete history');
 assert.equal(await page.locator('#artistMediaStats').innerText(),'미디어 186 · 사진 62 · 영상 61 · 음성 63','header counts update with live media');
 await screenshot(page,'live-gallery-reader');
 const beforeStop=reads;await page.evaluate(()=>setFilter('vote'));await page.waitForTimeout(3300);assert.equal(reads,beforeStop,'unrelated tabs pause the reader');
 assert.deepEqual(errors,[]);console.log(`Live PC media/image/video/sound push-to-DOM ${JSON.stringify(latencies)}; REST fallback ${fallbackMs}ms; one subscription, away-reader and playback continuity, no text-only growth, complete IDB ${cache.count} unique rows and zero history reads PASS`);
 await context.close();
}
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});try{for(const width of [1440,900])await scrolling(browser,server.url,width);await live(browser,server.url);}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

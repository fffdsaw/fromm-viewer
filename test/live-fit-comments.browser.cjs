'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.LIVE_FIT_DIR;
async function shot(p,name){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}}
(async()=>{const s=await serve(),b=await chromium.launch(process.env.PUBLIC_SHA?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{});
 const url=process.env.PUBLIC_SHA?'https://fffdsaw.github.io/fromm-viewer/?deployment='+process.env.PUBLIC_SHA:s.url;
 const fixture={newContext:async o=>{const c=await b.newContext({...o,...(out?{recordVideo:{dir:out,size:{width:1440,height:900}}}:{})});await c.addInitScript(()=>{
  const now=Date.now.bind(Date);Date.now=()=>now()+60000;
  window.liveFitAcks=[];
  addEventListener('message',e=>{const m=e.data;if(e.source!==window||m?.protocol!=='fromm-native-v1'||m.direction!=='page')return;const r=m.value;
   if(r.method==='frame-ack'){liveFitAcks.push(r.params.sequence);return;}
   if(['hello','join','leave','diagnostics'].includes(r.method))postMessage({protocol:'fromm-native-v1',direction:'extension',value:{id:r.id,ok:true,toolVersion:'0.5.0',backgroundPlayer:true,frameAck:true,targetFps:30,extensionVersion:'1.0.9',receiveMetrics:true}},location.origin);
  });
 });return c}};
 try{for(const opt of [{width:1440,height:900},{width:760,height:900},{width:900,height:700,installed:true},{width:390,height:844}]){
  const{page:p,context,errors}=await open(fixture,url,{...opt,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'});
  let posted=false,posts=0;const cursors=[];
  await p.route('https://live-chat-api.frommyarti.com/**',r=>{
   const u=new URL(r.request().url()),stamp=Date.now();let data;
   if(r.request().method()==='POST'){assert.equal(r.request().postDataJSON().content,'합성 전송 댓글');posted=true;posts++;return r.fulfill({contentType:'text/xml',body:'<SendMessageResponse><SendMessageResult><MessageId>own</MessageId></SendMessageResult></SendMessageResponse>'});}
   if(u.pathname.includes('/rooms/'))data={liveChatRoom:{isFrozen:false,isBanned:false,muteExpiresAt:null}};
   else{const cursor=Number(u.searchParams.get('cursor'));cursors.push(cursor);data={messages:cursor<=stamp?[{messageId:'recent',nickname:'합성 시청자',content:'바로 표시되는 최근 댓글',createdAt:stamp-1000},...(posted?[{messageId:'own',nickname:'합성 작성자',content:'합성 전송 댓글',createdAt:stamp}]:[])]:[],deletedMessages:[],cursor:stamp};}
   return r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data})});
  });
  await p.evaluate(async()=>{state.filter='live';state.live.centerMode='live';state.live.discoveryLoaded=true;state.live.status='ready';state.live.entry={kind:'channel',channelId:'s',liveRoomId:'s'};state.live.currentLiveRoomId='s';state.live.config={isStreaming:true};state.live.room={id:'s',title:'합성 LIVE',encryptionKey:'x'.repeat(64)};state.live.tokenInfo={};resolveAgoraJoinArgs=()=>{};renderLiveView();await connectAgoraLive();state.live.liveChat={chatToken:'synthetic-chat'};state.live.chatProvider='fromm';
   const c=document.createElement('canvas');c.width=720;c.height=1280;const d=c.getContext('2d');d.fillStyle='#365477';d.fillRect(0,0,720,1280);d.fillStyle='#fff';d.fillRect(0,0,720,12);d.fillRect(0,1268,720,12);d.font='40px sans-serif';d.fillText('SYNTHETIC LIVE',120,600);
   postMessage({protocol:'fromm-native-v1',direction:'extension',value:{type:'frame',sequence:1,jpeg:c.toDataURL('image/jpeg'),synthetic:true}},location.origin);
  });
  await p.waitForFunction(()=>liveFitAcks.includes(1));
  const fit=async()=>{const d=await p.locator('#nativeLiveVideo').evaluate(e=>({image:e.getBoundingClientRect().toJSON(),stage:e.closest('.live-stage').getBoundingClientRect().toJSON(),fit:getComputedStyle(e).objectFit,max:getComputedStyle(e).maxHeight}));assert.ok(Math.abs(d.image.height-d.stage.height)<1,'native image fills stage height');assert.ok(Math.abs(d.image.width-d.stage.width)<1);assert.equal(d.fit,'contain');};
  await fit();assert.equal(await p.locator('#nativeLiveMetrics,.live-control-badge').count(),0);
  await p.locator('#liveChatProbeBtn').click();await p.waitForFunction(()=>FrommChatProbe()?.status==='messages-received',null,{timeout:8000});
  assert.ok(cursors[0]<Date.now(),'first cursor excludes the one-minute-ahead client clock');assert.equal(await p.evaluate(()=>FrommChatProbe().clockSource),'device-lookback');
  const input=p.locator('.live-comment-input');await input.fill('합성 전송 댓글');await p.locator('.live-comment-send').click();await p.waitForFunction(()=>FrommChatProbe()?.send?.status==='delivered',null,{timeout:8000});
  assert.equal(posts,1);assert.equal(await input.inputValue(),'');assert.equal(await p.locator('[data-message-id="own"]').count(),1,'only real GET echo is shown');
  const times=await p.evaluate(()=>FrommChatProbe().send);assert.ok(times.acceptedAfterMs<5000&&times.echoAfterAckMs<5000);
  const bottom=async()=>{const d=await input.evaluate(e=>({input:e.getBoundingClientRect().toJSON(),stage:e.closest('.live-stage').getBoundingClientRect().toJSON(),controls:document.querySelector('.live-player-controls .mvc-row').getBoundingClientRect().toJSON()}));assert.ok(Math.abs(d.stage.bottom-d.input.bottom-10)<1,'composer is anchored at the bottom padding');assert.ok(d.controls.bottom<d.input.top,'top controls leave composer clear');};
  await bottom();const label=opt.width+(opt.installed?'-pwa':'');await shot(p,label+'-normal');
  await p.locator('[data-live-control="full"]').click();await p.waitForFunction(()=>!!document.fullscreenElement);await fit();await bottom();
  assert.ok(Math.abs((await p.locator('#nativeLiveVideo').boundingBox()).height-opt.height)<1,'fullscreen image reaches viewport height');await shot(p,label+'-fullscreen');
  await p.locator('.live-player-controls summary').click();const popup=await p.locator('.live-player-controls .mvc-popover').boundingBox();assert.ok(popup.y>=10&&popup.y+popup.height<=opt.height-10,'top settings popup fits');await p.keyboard.press('Escape');await p.evaluate(()=>document.exitFullscreen());
  assert.equal(await p.locator('#nativeLiveMetrics').count(),0);assert.deepEqual(errors,[]);await p.evaluate(()=>stopLivePlayback({clearRoom:true}));await context.close();console.log(label+': full native portrait height, contain, bottom composer/top controls, no diagnostics DOM, one-minute clock skew + ACK/real echo under5s PASS');
 }
 }finally{await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

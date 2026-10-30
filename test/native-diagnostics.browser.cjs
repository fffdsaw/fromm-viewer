'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true});try{
for(const width of[1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write'],userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.qa={requests:[],acks:[]};window.addEventListener('message',event=>{
  const m=event.data;if(event.source!==window||m?.protocol!=='fromm-native-v1'||m.direction!=='page')return;
  const r=m.value;qa.requests.push(r.method==='join'?{method:r.method}:{...r});
  if(r.method==='frame-ack'){qa.acks.push(r.params.sequence);return;}
  window.postMessage({protocol:'fromm-native-v1',direction:'extension',value:{id:r.id,ok:true,toolVersion:'0.5.0',backgroundPlayer:true,frameAck:true,targetFps:30,extensionVersion:'1.0.9',receiveMetrics:true}},location.origin);
 });});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='viewer.test'){
  const f=u.pathname.split('/').pop()||'index.html';if(['index.html','web-native-live.js','web-live-pip.js', 'web-live-controls.js','web-live-chat-probe.js'].includes(f))return route.fulfill({contentType:f.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,f))});
 }return route.abort();});
 await require('./helpers/shell-assets.cjs')(page); await page.goto('https://viewer.test/index.html');
 await page.evaluate(async()=>{
  hideLoginGate();setActiveAuth('SYNTHETIC_ONLY','synthetic-device','synthetic-account');state.filter='live';state.live.centerMode='live';state.live.discoveryLoaded=true;state.live.status='ready';
  state.live.entry={kind:'ordinary',channelId:'synthetic-channel',liveRoomId:'synthetic-room'};
  state.live.currentLiveRoomId='synthetic-room';state.live.tokenInfo={};state.live.config={isStreaming:true};
  state.live.room={id:'synthetic-room',title:'합성 진단 테스트',encryptionKey:'x'.repeat(64)};
  resolveAgoraJoinArgs=()=>{};renderLiveView();await connectAgoraLive();
 });
 assert.equal(await page.locator('#nativeLiveMetrics').evaluate(el=>el.open),false);
 assert.equal(await page.evaluate(()=>qa.requests.some(r=>r.method==='diagnostics')),false);
 await page.locator('#nativeLiveMetrics summary').click();await page.waitForFunction(()=>FrommLiveMetrics().enabled);
 await page.evaluate(()=>{
  const status=value=>window.postMessage({protocol:'fromm-native-v1',direction:'extension',value:{type:'status',value}},location.origin);
  status({stage:'rtc-video-stats',receivedWidth:720,receivedHeight:1280,decoderFps:30,rendererFps:29,receivedBitrateKbps:1500,packetLossPercent:0,rxStreamType:0,nativeAvSyncMs:-12,synthetic:false,encryptionKey:'FORBIDDEN_SECRET',uid:42});
  status({stage:'rtc-audio-stats',audioNetworkDelayMs:20,audioBitrateKbps:40,synthetic:false});
  status({stage:'pipeline-performance',captureFps:28,captureEncodeAvgMs:3,ackRoundTripAvgMs:15,synthetic:true});
  const c=document.createElement('canvas');c.width=720;c.height=1280;const ctx=c.getContext('2d');ctx.fillStyle='#567';ctx.fillRect(0,0,720,1280);
  window.postMessage({protocol:'fromm-native-v1',direction:'extension',value:{type:'frame',sequence:1,jpeg:c.toDataURL('image/jpeg'),synthetic:true,sentAt:performance.timeOrigin+performance.now()}},location.origin);
 });
 await page.waitForFunction(()=>qa.acks.includes(1));await page.waitForFunction(()=>document.querySelector('#nativeLiveMetrics pre').textContent.includes('720'));
 await page.getByRole('button',{name:'진단 JSON 복사'}).click();const copied=JSON.parse(await page.evaluate(()=>navigator.clipboard.readText()));
 assert.equal(copied.rtc.receivedWidth,720);assert.equal(copied.sourceResolution,'UNAVAILABLE');assert.equal(copied.pipeline.synthetic,true);assert.ok(copied.sources.transport.includes('estimate'));
 assert.equal(JSON.stringify(copied).includes('FORBIDDEN_SECRET'),false);assert.equal(JSON.stringify(copied).includes('synthetic-device'),false);assert.equal('uid' in copied.rtc,false);
 await page.locator('#nativeLiveMetrics summary').click();await page.waitForFunction(()=>!FrommLiveMetrics().enabled);
 assert.equal(await page.evaluate(()=>FrommLiveMetrics().rtc),'UNAVAILABLE');
 await page.locator('#nativeLiveMetrics summary').click();await page.waitForFunction(()=>FrommLiveMetrics().enabled);
 assert.equal(await page.evaluate(()=>FrommLiveMetrics().rtc),'UNAVAILABLE','reopening never reuses old stats');
 await page.evaluate(()=>window.postMessage({protocol:'fromm-native-v1',direction:'extension',value:{type:'status',value:{stage:'native-disconnected'}}},location.origin));
 await page.waitForFunction(()=>!FrommLiveMetrics().enabled);assert.equal(await page.evaluate(()=>FrommLiveMetrics().pipeline),'UNAVAILABLE');
 await page.evaluate(()=>stopLivePlayback());assert.equal(await page.locator('#nativeLiveMetrics').count(),0);assert.deepEqual(errors,[]);
 console.log(`${width}px: opt-in/collapse, 0.5.0 bridge, real 720x1280 JPEG decode/ACK, separate RTC/synthetic stages, JSON clipboard redaction, reconnect/stop PASS`);
 await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

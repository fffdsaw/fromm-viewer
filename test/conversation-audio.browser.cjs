'use strict';
// Real HTMLAudioElement decoding/seeking over synthetic WAV; no real account sends.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
function wav(seconds){const data=8000*2*seconds,b=Buffer.alloc(44+data);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data,40);return b;}
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})}),body=wav(24);
try{for(const cfg of [{width:1440},{width:780,installed:true},{width:390},{width:320}]){
 const {page,context,errors}=await open(browser,server.url,{...cfg,login:true});
 let requested=new Set(),release,gate=new Promise(resolve=>release=resolve),failed=false,repairFetches=0;
 await page.route('**/*',async route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(u.hostname!=='fixture.test'||!u.pathname.startsWith('/voice-'))return route.fallback();
  requested.add(u.pathname);if(route.request().resourceType()==='fetch')repairFetches++;
  try{await gate;await new Promise(resolve=>setTimeout(resolve,60));const range=/bytes=(\d+)-(\d*)/.exec(route.request().headers().range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(body.length-1,Number(range[2])):body.length-1;await route.fulfill({status:failed?403:range?206:200,contentType:'audio/wav',headers:{'access-control-allow-origin':'*','accept-ranges':'bytes',...(!failed&&range?{'content-range':`bytes ${start}-${end}/${body.length}`}:{})},body:failed?Buffer.from('denied'):body.subarray(start,end+1)});}catch{}
 });
 await page.evaluate(()=>{
  setActiveAuth('synthetic','synthetic','');hideLoginGate();state.room={id:'fan',hostChatRoomId:'host',host:{nick:'테스트 아티스트'}};state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;state.chatAutoTopPending=false;
  state.messages=Array.from({length:110},(_,i)=>({messageId:'sound-'+i,userType:'star',type:'sound',content:'https://fixture.test/voice-'+i+'.wav',createdAt:Date.now()-120000+i*1000}));state.chatMessages=state.messages;render();FrommViewState.cancel();scrollTo(0,0);
 });
 const first=page.locator('[data-message-id="sound-0"]'),player=first.locator('.chat-audio-player'),audio=first.locator('audio'),time=player.locator('output'),seek=player.locator('.chat-audio-seek');
 await first.scrollIntoViewIfNeeded();const maxProbes=await page.evaluate(async()=>{let max=0;for(let i=0;i<12;i++){max=Math.max(max,[...document.querySelectorAll('.media-wrap audio')].filter(a=>a.getAttribute('src')&&a.preload==='metadata'&&a.readyState===0&&a.paused).length);await new Promise(requestAnimationFrame);}return max;});
 assert.equal(await time.innerText(),'0:00 / —:—');assert.equal(await seek.isDisabled(),true);assert.equal(await first.locator('.type').count(),0,'media type label is hidden');assert.match(await first.locator('.chat-message-time').innerText(),/^\d{2}:\d{2}$/,'voice sent time appears below the bubble');
 assert.ok(requested.size>0&&requested.size<10,'only visible cards request metadata');assert.ok(maxProbes>0&&maxProbes<=3,'metadata cards in flight are bounded at three: '+maxProbes);
 // User playback wins even while metadata is pending.
 await player.getByRole('button',{name:'음성 재생',exact:true}).click();release();await page.waitForFunction(()=>document.querySelector('[data-message-id="sound-0"] audio').duration===24);
 await page.waitForFunction(()=>{const a=document.querySelector('[data-message-id="sound-0"] audio');return !a.paused&&a.currentTime>0;});await player.getByRole('button',{name:'음성 일시정지',exact:true}).click();await seek.press('Home');assert.equal(await time.innerText(),'0:00 / 0:24');
 assert.equal(await seek.isEnabled(),true);await time.click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>state.selected.size),0,'audio controls never select the media card');
 if(process.env.CONVERSATION_DIR){fs.mkdirSync(process.env.CONVERSATION_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-ready-'+cfg.width+'.png')});}
 const layout=await player.evaluate(e=>{const r=e.getBoundingClientRect(),seek=e.querySelector('.chat-audio-seek').getBoundingClientRect(),time=e.querySelector('output').getBoundingClientRect();return{r:r.toJSON(),seek:seek.toJSON(),time:time.toJSON(),scroll:e.scrollWidth,width:e.clientWidth}});
 assert.ok(Math.abs(layout.seek.width-layout.r.width)<1&&layout.seek.top>=layout.time.bottom,JSON.stringify(layout));
 assert.ok(layout.time.right<=layout.r.right+1&&layout.scroll<=layout.width+1,JSON.stringify(layout));assert.match(await seek.evaluate(e=>getComputedStyle(e).backgroundImage),/linear-gradient/,'the full mint seek track is painted');
 const play=player.getByRole('button',{name:'음성 재생',exact:true});await play.click();await page.waitForFunction(()=>{const a=document.querySelector('[data-message-id="sound-0"] audio');return !a.paused&&a.currentTime>0;});
 if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-playing-'+cfg.width+'.png')});
 await player.getByRole('button',{name:'음성 일시정지',exact:true}).click();assert.equal(await audio.evaluate(a=>a.paused),true);
 await seek.click({position:{x:(await seek.boundingBox()).width*.35,y:12}});await page.waitForTimeout(100);
 let position=await audio.evaluate(a=>a.currentTime);assert.ok(position>7&&position<10,'click seeks decoded audio '+JSON.stringify({position,range:await seek.inputValue(),state:await audio.evaluate(a=>({ready:a.readyState,duration:a.duration,seekable:[...Array(a.seekable.length)].map((_,i)=>[a.seekable.start(i),a.seekable.end(i)])}))}));assert.match(await time.innerText(),/^0:0[789] \/ 0:24$/);
 assert.ok(await seek.evaluate(e=>parseFloat(e.style.getPropertyValue('--audio-progress')))>25);if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-seek-'+cfg.width+'.png')});
 await seek.press('Home');assert.ok(await audio.evaluate(a=>a.currentTime)<.2);await seek.press('ArrowRight');assert.ok(Math.abs(await audio.evaluate(a=>a.currentTime)-5)<.2);await seek.press('End');assert.ok(Math.abs(await audio.evaluate(a=>a.currentTime)-24)<.2);
 if(cfg.width<=390){await seek.tap({position:{x:(await seek.boundingBox()).width*.5,y:12}});await page.waitForTimeout(100);position=await audio.evaluate(a=>a.currentTime);assert.ok(position>10&&position<14,'touch seeks decoded audio');}
 await player.locator('.chat-audio-level').fill('0.4');assert.ok(Math.abs(await audio.evaluate(a=>a.volume)-.4)<.01);await player.getByRole('button',{name:'음성 음소거',exact:true}).click();assert.equal(await audio.evaluate(a=>a.muted),true);await player.getByRole('button',{name:'음성 음소거 해제',exact:true}).click();assert.equal(await audio.evaluate(a=>a.muted),false);
 await audio.evaluate(a=>{a.currentTime=23.9;a.playbackRate=8;});await player.getByRole('button',{name:'음성 재생',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-message-id="sound-0"] audio').ended);assert.equal(await time.innerText(),'0:24 / 0:24');assert.equal(await player.getByRole('button',{name:'음성 재생',exact:true}).count(),1);assert.equal(await seek.inputValue(),'24');
 if(process.env.CONVERSATION_DIR){fs.mkdirSync(process.env.CONVERSATION_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-complete-'+cfg.width+'.png')});}
 // Leaving a paused card releases its network/buffer; duration remains available on return.
 await page.locator('[data-message-id="sound-20"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('[data-message-id="sound-0"] audio').getAttribute('src'));
 await first.scrollIntoViewIfNeeded();assert.equal(await time.innerText(),'0:24 / 0:24');await player.getByRole('button',{name:'음성 재생',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('[data-message-id="sound-0"] audio');return !a.paused&&a.currentTime<23;});await player.getByRole('button',{name:'음성 일시정지',exact:true}).click();
 // A paused position also survives buffer release and page lifecycle changes.
 await seek.press('Home');await seek.press('ArrowRight');await seek.press('ArrowRight');
 await page.locator('[data-message-id="sound-20"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('[data-message-id="sound-0"] audio').getAttribute('src'));
 await first.scrollIntoViewIfNeeded();assert.equal(await time.innerText(),'0:10 / 0:24');await player.getByRole('button',{name:'음성 재생',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('[data-message-id="sound-0"] audio');return !a.paused&&a.currentTime>=10;});await player.getByRole('button',{name:'음성 일시정지',exact:true}).click();
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await player.getByRole('button',{name:'음성 재생',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('[data-message-id="sound-0"] audio');return !a.paused&&a.currentTime>=10;});await player.getByRole('button',{name:'음성 일시정지',exact:true}).click();
 // Metadata failure stays unknown and never triggers whole-file MIME repair until user playback.
 failed=true;await page.evaluate(()=>{state.messages=[{messageId:'bad',type:'sound',userType:'star',content:'https://fixture.test/voice-denied.wav',createdAt:Date.now()}];state.chatMessages=state.messages;render();scrollTo(0,0)});
 const bad=page.locator('[data-message-id="bad"] .chat-audio-player');await bad.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-message-id="bad"] audio').error);assert.equal(await bad.locator('output').innerText(),'0:00 / —:—');assert.equal(repairFetches,0,'passive metadata failure does not fetch an original blob');
 await bad.getByRole('button',{name:'음성 재생',exact:true}).click();await bad.locator('.chat-audio-error').waitFor();assert.equal(await bad.locator('.chat-audio-seek').isDisabled(),true);
 await page.evaluate(()=>{window.removedAudio=document.querySelector('[data-message-id="bad"] audio');state.messages=[];state.chatMessages=[];render()});await page.waitForFunction(()=>removedAudio.paused&&!removedAudio.getAttribute('src'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
 console.log(`${cfg.width}${cfg.installed?' standalone simulation':''}: visible metadata <=3, 24s decoding, unknown/before/play/pause/click/touch/keyboard/end, volume/mute, offscreen resume and removal/error cleanup PASS`);
}}finally{await browser.close();await server.close()}})().catch(error=>{console.error(error);process.exitCode=1});

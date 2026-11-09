'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const wav=Buffer.alloc(1644);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(1600,40);
 try{for(const cfg of [{width:1440},{width:780,installed:true},{width:390}]){
  const {page,context,errors}=await open(browser,server.url,{...cfg,login:true});
  const room={id:'fan-room',hostChatRoomId:'host-room',host:{nick:'테스트 아티스트'}},rows=Array.from({length:1200},(_,i)=>({messageId:'m'+i,userType:'star',type:'text',content:'이전 대화 '+i,createdAt:Date.now()-1300000+i*1000}));
  rows.push({messageId:'sound',userType:'star',type:'sound',content:'https://fixture.test/sound.wav',createdAt:Date.now()-1000});
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(u.hostname==='fixture.test'&&u.pathname==='/sound.wav')return route.fulfill({contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav});
   if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(u.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'fan-self'}}});
   if(u.pathname==='/v2/chat/fanChatRooms/fan-room')return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   if(u.pathname==='/v2/chat/emoticons/host-room')return answer({success:true,data:{emoticonPacks:[]}});
   if(u.pathname.endsWith('/messages')){
    const start=Date.parse(u.searchParams.get('findStartAt')),end=Date.parse(u.searchParams.get('findEndAt')),limit=Number(u.searchParams.get('limit'));
    return answer({success:true,data:{messages:rows.filter(m=>m.createdAt>=start&&m.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});
   }
   return route.fallback();
  });
  await page.evaluate(room=>{setActiveAuth('synthetic','synthetic-device','controls@example.test');hideLoginGate();FrommConversation.loadFirebase=async()=>{throw new Error('Synthetic fallback')};state.rooms=[room];const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button)},room);
  await page.waitForFunction(()=>FrommConversation.status.phase==='connected'&&state.chatHistoryComplete&&!state.chatAutoTopPending);await page.waitForTimeout(1600);
  const input=await page.locator('#conversationInput').boundingBox(),emoji=await page.locator('#conversationEmoticonButton').boundingBox();
  assert.ok(emoji.x>input.x+input.width*.65&&emoji.x+emoji.width<=input.x+input.width+1,'emoticon button lives inside the right end of the input');assert.ok(Math.abs(emoji.y+emoji.height-(input.y+input.height))<2);
  assert.ok(Number(await page.locator('#conversationInput').evaluate(e=>parseFloat(getComputedStyle(e).paddingRight)))>=emoji.width+6,'text has room before the icon');
  await page.locator('#conversationEmoticonButton').click();await page.getByText('사용할 수 있는 이모티콘이 없습니다.',{exact:true}).waitFor();const popup=await page.locator('#conversationEmoticons').boundingBox();assert.ok(popup.x>=0&&popup.x+popup.width<=cfg.width+1);await page.keyboard.press('Escape');
  await page.locator('#conversationStorage').click();const alignment=await page.evaluate(()=>{const checkbox=document.querySelector('#conversationStoreEnabled'),label=checkbox.closest('label'),range=document.createRange();range.selectNode(label.lastChild);const text=range.getBoundingClientRect(),box=checkbox.getBoundingClientRect();return{width:box.width,height:box.height,right:box.right,textX:text.x,delta:Math.abs(box.y+box.height/2-text.y-text.height/2)}});
  assert.ok(alignment.width>=16&&alignment.width<=20&&alignment.height>=16&&alignment.height<=20);assert.ok(alignment.right+5<=alignment.textX&&alignment.delta<3,JSON.stringify(alignment));
  const checked=page.locator('#conversationStoreEnabled');await checked.uncheck();assert.equal(await checked.isChecked(),false);await checked.check();assert.equal(await checked.isChecked(),true);
  if(process.env.CONVERSATION_DIR){fs.mkdirSync(process.env.CONVERSATION_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'storage-aligned-'+cfg.width+'.png')});}
  await page.locator('#conversationStorageClose').click();
  const bubble=page.locator('[data-message-id="sound"] .bubble'),download=bubble.locator('.dl');await bubble.scrollIntoViewIfNeeded();
  assert.equal(await bubble.locator('audio').getAttribute('controls'),'');const filename=await bubble.locator('.stats').innerText();assert.ok(filename.length>0);
  if(cfg.width>700){
   const box=await bubble.boundingBox(),button=await download.boundingBox(),nativeAudio=await bubble.locator('audio').boundingBox(),inset=Number(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--thumb-download-inset').replace('px','')));
   assert.ok(Math.abs(button.y-box.y-inset)<2&&Math.abs(box.x+box.width-button.x-button.width-inset)<2,JSON.stringify({box,button,inset}));assert.ok(nativeAudio.y>=button.y+button.height,'download does not cover native audio controls');
   assert.equal(await download.evaluate(e=>getComputedStyle(e).position),'absolute');assert.ok(await download.locator('.download-feedback-label').evaluate(e=>getComputedStyle(e).clipPath.includes('50%')));
  }else assert.equal(await download.evaluate(e=>getComputedStyle(e).position),'static','mobile keeps its existing audio action row');
  const event=page.waitForEvent('download');await download.click();const saved=await event;assert.deepEqual(fs.readFileSync(await saved.path()),wav);assert.ok(saved.suggestedFilename().includes(filename));assert.equal(await bubble.locator('.stats').innerText(),filename);
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-corner-'+cfg.width+'.png')});
  await page.evaluate(()=>FrommViewState.cancel());await page.mouse.wheel(0,-1200);await page.getByRole('button',{name:'최신 대화로 이동',exact:true}).waitFor();assert.match(await page.locator('#conversationNew').innerText(),/최신 대화/);
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'latest-jump-'+cfg.width+'.png')});
  const beforeHeight=await page.locator('#conversationDock').evaluate(e=>e.getBoundingClientRect().height);await page.locator('#conversationNew').click();await page.waitForFunction(()=>document.documentElement.scrollHeight-scrollY-innerHeight<3&&document.querySelector('#conversationNew').hidden);
  assert.equal(await page.locator('#conversationDock').evaluate(e=>e.getBoundingClientRect().height),beforeHeight,'latest shortcut does not reserve another composer row');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
  console.log(`${cfg.width}${cfg.installed?' PWA simulation':''}: inline storage checkbox, input-right emoticon, audio download position/actual WAV bytes/name, scroll-up latest shortcut and no overflow PASS`);
 }}finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

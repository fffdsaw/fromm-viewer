'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const wav=Buffer.alloc(1644);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(1600,40);
 try{for(const cfg of [{width:1440},{width:780,installed:true},{width:390}]){
  const {page,context,errors}=await open(browser,server.url,{...cfg,login:true});
  await page.evaluate(()=>window.FrommGlassSettings?.set({enabled:false},{immediate:true,persist:false}));
  await page.waitForFunction(()=>!document.documentElement.classList.contains('pc-control-glass'));

  let echo=false,lastPost=null;
  const room={id:'fan-room',hostChatRoomId:'host-room',host:{nick:'테스트 아티스트'}},rows=Array.from({length:1200},(_,i)=>({messageId:'m'+i,userType:'star',type:'text',content:'이전 대화 '+i,createdAt:Date.now()-1300000+i*1000}));
  rows.push({messageId:'own-long',userType:'fan',type:'text',content:'가나다 abcdefghij '.repeat(30),createdAt:Date.now()-2000});
  rows.push({messageId:'own-url',userType:'fan',type:'text',content:'https://example.test/'+ 'abcdefgh'.repeat(50),createdAt:Date.now()-1500});
  rows.push({messageId:'sound',userType:'star',type:'sound',content:'https://fixture.test/sound.wav',createdAt:Date.now()-1000});
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(u.hostname==='fixture.test'&&u.pathname==='/sound.wav')return route.fulfill({contentType:'audio/wav',headers:{'access-control-allow-origin':'*'},body:wav});
   if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(u.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'fan-self'}}});
   if(u.pathname==='/v2/chat/fanChatRooms/fan-room')return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   if(u.pathname==='/v2/chat/emoticons/host-room')return answer({success:true,data:{emoticonPacks:[]}});
   if(u.pathname.endsWith('/replies')){lastPost=route.request().postDataJSON();if(!echo)return answer({success:true,data:{}});const message={messageId:'own-short',type:'text',userType:'fan',...lastPost,createdAt:Date.now()-1};rows.push(message);return answer({success:true,data:{message}});}
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
  const incomingText=page.locator('#timeline .msg:not(.me) .bubble:has(.text)').first(),outgoingText=page.locator('#timeline .msg.me .bubble:has(.text)').first();
  assert.equal(await incomingText.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(245, 250, 251)','incoming artist text has an aqua card');
  assert.equal(await incomingText.evaluate(el=>getComputedStyle(el).borderColor),'rgb(204, 230, 229)','incoming artist card has a subtle border');
  assert.notEqual(await incomingText.evaluate(el=>getComputedStyle(el).boxShadow),'none','incoming artist card has a soft shadow');
  assert.equal(await outgoingText.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(219, 243, 236)','outgoing mint bubble remains intact');

  assert.equal(await bubble.locator('.chat-audio-player').isVisible(),true);assert.equal(await bubble.locator('audio').getAttribute('controls'),null);
  const footer=page.locator('[data-message-id="sound"] .chat-message-foot');
  const filename=(await download.getAttribute('aria-label')).replace(/ 다운로드$/,'');
  assert.ok(filename.length>0);assert.equal(await bubble.locator('.meta').count(),0,'voice sender label removed');
  assert.equal(await footer.locator('.chat-message-filename').count(),0,'voice filename hidden without losing download name');
  assert.match(await footer.locator('time').innerText(),/^\d{2}:\d{2}$/);
  const extraMedia=await page.evaluate(()=>{
   return ['image','video'].map((type,i)=>{
    const row=renderMessage({messageId:'media-label-'+i,userType:'star',type,content:'https://fixture.test/sound.wav',createdAt:Date.now()});
    return{type,sender:row.querySelector('.bubble>.meta')?.textContent||'',file:row.querySelector('.chat-message-filename')?.textContent||'',time:row.querySelector('time')?.textContent||''};
   });
  });
  for(const row of extraMedia){assert.equal(row.sender,'',row.type+' sender hidden');assert.equal(row.file,'',row.type+' filename hidden');assert.match(row.time,/^\d{2}:\d{2}$/,row.type+' time retained');}
  const button=await download.boundingBox(),player=await bubble.locator('.chat-audio-player').boundingBox(),
   seek=await bubble.locator('.chat-audio-seek').boundingBox(),actions=await bubble.locator('.media-actions').boundingBox();
  assert.equal(await download.evaluate(el=>el.closest('.chat-audio-player')!==null),true,'voice download integrated into player');
  assert.equal(await download.evaluate(el=>el.classList.contains('chat-media-download')),false,'voice action avoids sticky thumbnail glass optics');
  assert.ok(Math.abs(button.width-button.height)<1,'download is circular: '+JSON.stringify(button));
   assert.ok(button.width>=35&&button.width<=37,'voice download matches 36px Replay download size: '+JSON.stringify(button));
  assert.ok(button.y>=seek.y-3&&button.y+button.height<=seek.y+seek.height+3,'download shares seek row: '+JSON.stringify({button,seek}));
  assert.ok(button.x>=seek.x+seek.width-1&&button.x+button.width<=player.x+player.width+2,'download is the right-side secondary action');
  assert.ok(Math.abs(button.x-actions.x)<3,'circle aligns with integrated action slot: '+JSON.stringify({button,actions}));
  const play=await bubble.locator('.chat-audio-play').evaluate(el=>({size:el.getBoundingClientRect().width,background:getComputedStyle(el).backgroundColor,padding:getComputedStyle(el).padding,border:getComputedStyle(el).borderColor,glyph:el.querySelector('path')?.getAttribute('d')}));
  assert.ok(play.size>=39&&play.size<=41,'Replay-family play button dimensions');
  assert.equal(play.background,'rgba(0, 0, 0, 0.72)','Replay-family play surface');
   assert.equal(play.padding,'0px','Replay play toggle uses edge-to-edge circular hit area');
   assert.equal(play.border,'rgba(255, 255, 255, 0.14)','Replay play border matches');
  assert.equal(play.glyph,'m8 5 11 7-11 7z','Channel play icon reused without changing Channel code');
  const appearance=await download.evaluate(e=>{const css=getComputedStyle(e);return{position:css.position,borderRadius:css.borderRadius,backdropFilter:css.backdropFilter,backgroundColor:css.backgroundColor,backgroundImage:css.backgroundImage,svgWidth:e.querySelector('svg').getBoundingClientRect().width,clipPath:getComputedStyle(e.querySelector('.download-feedback-label')).clipPath}});
  assert.equal(appearance.position,'relative');
  assert.equal(appearance.borderRadius,'50%');
  assert.equal(appearance.backdropFilter,'none','Channel-style solid surface');
  assert.equal(appearance.backgroundColor,'rgba(0, 0, 0, 0.72)','Channel-style dark surface');
  assert.equal(appearance.backgroundImage,'none','Channel-style flat surface');
  assert.ok(appearance.svgWidth>=button.width-3&&appearance.svgWidth<=button.width,'SVG progress ring fills the circular control');
  assert.ok(appearance.clipPath.includes('50%'),'visible download label must be hidden');
  assert.ok((await download.getAttribute('aria-label')).includes('다운로드'),'download remains accessible by name');
  const event=page.waitForEvent('download');await download.click();const saved=await event;assert.deepEqual(fs.readFileSync(await saved.path()),wav);assert.ok(saved.suggestedFilename().includes(filename));assert.equal(await footer.locator('.chat-message-filename').count(),0);
  await download.hover();await page.waitForTimeout(180);
  assert.equal(await download.evaluate(el=>el.matches(':active')),false,'hover alone does not latch pressed state');
  assert.equal(await download.evaluate(el=>getComputedStyle(el).transform),'none','hover does not visually press the voice download');
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'audio-corner-'+cfg.width+'.png')});
  await page.evaluate(()=>FrommViewState.cancel());await page.mouse.wheel(0,-1200);await page.getByRole('button',{name:'최신 대화로 이동',exact:true}).waitFor();assert.equal(await page.locator('#conversationNew svg').count(),1);const shortcut=await page.locator('#conversationNew').boundingBox();assert.equal(shortcut.width,34);assert.equal(shortcut.height,34);
  const placement=await page.locator('#conversationNew').evaluate(el=>{
   const input=document.querySelector('.conversation-input-shell').getBoundingClientRect(),compose=document.querySelector('.conversation-compose').getBoundingClientRect(),dock=document.querySelector('#conversationDock').getBoundingClientRect(),r=el.getBoundingClientRect();
   return{parent:el.parentElement.className,position:getComputedStyle(el).position,left:r.left,right:r.right,top:r.top,bottom:r.bottom,inputLeft:input.left,composeLeft:compose.left,inputCenter:input.top+input.height/2,buttonCenter:r.top+r.height/2,dockLeft:dock.left,dockTop:dock.top,dockBottom:dock.bottom,dockBackground:getComputedStyle(document.querySelector('#conversationDock')).backgroundColor};
  });
  assert.equal(placement.parent,'conversation-compose','latest arrow remains attached to the conversation dock');
  assert.equal(placement.position,'absolute','latest arrow does not participate in composer layout');
  assert.ok(Math.abs(placement.inputLeft-placement.composeLeft)<1,'latest arrow does not push the input field: '+JSON.stringify(placement));
  assert.equal(placement.dockBackground,'rgba(0, 0, 0, 0)','composer dock has no white backing panel');
  if(cfg.width>850){
   assert.ok(placement.right<=placement.dockLeft-4,'desktop arrow sits in the left gutter: '+JSON.stringify(placement));
   assert.ok(Math.abs(placement.buttonCenter-placement.inputCenter)<6,'desktop arrow aligns with the composer without taking its space: '+JSON.stringify(placement));
  }else{
   assert.ok(placement.bottom<=placement.dockTop-4,'compact arrow floats above the dock: '+JSON.stringify(placement));
  }
  assert.equal(await page.locator('#conversationNew').innerText(),'');
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'latest-jump-'+cfg.width+'.png')});
  const beforeHeight=await page.locator('#conversationDock').evaluate(e=>e.getBoundingClientRect().height);await page.locator('#conversationNew').click();await page.waitForFunction(()=>document.documentElement.scrollHeight-scrollY-innerHeight<3&&document.querySelector('#conversationNew').hidden);
  assert.equal(await page.locator('#conversationDock').evaluate(e=>e.getBoundingClientRect().height),beforeHeight,'latest shortcut does not reserve another composer row');
  // Both canonical replies and ACKed replies waiting for the REST echo stay in the chat column.
  for(const id of ['own-long','own-url']){
   const own=page.locator(`[data-message-id="${id}"]`);await own.scrollIntoViewIfNeeded();
   const bounds=await own.evaluate(e=>{const r=e.getBoundingClientRect(),b=e.querySelector('.bubble'),box=b.getBoundingClientRect();return{left:box.left-r.left,right:r.right-box.right,scroll:b.scrollWidth,width:b.clientWidth}});
   assert.ok(bounds.left>=-1&&bounds.right>=-1&&bounds.scroll<=bounds.width+1,JSON.stringify(bounds));
  }
  await page.locator('#conversationInput').fill('보낸 글 '.repeat(80));await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationPending .conversation-pending-bubble')&&document.querySelector('#conversationSend').getAttribute('aria-busy')==='false'&&document.querySelector('#conversationInput').value==='');
  await page.locator('#conversationPending').scrollIntoViewIfNeeded();
  const pending=await page.locator('#conversationPending').evaluate(e=>{const column=document.querySelector('#timeline').getBoundingClientRect(),r=e.getBoundingClientRect(),b=e.firstElementChild,box=b.getBoundingClientRect();return{column:column.toJSON(),rect:r.toJSON(),bubble:box.toJSON(),scroll:b.scrollWidth,width:b.clientWidth}});
  assert.ok(Math.abs(pending.column.left-pending.rect.left)<1&&Math.abs(pending.column.right-pending.rect.right)<1,JSON.stringify(pending));
  assert.ok(pending.bubble.left>=pending.column.left-1&&pending.bubble.right<=pending.column.right+1&&pending.scroll<=pending.width+1,JSON.stringify(pending));
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'sent-bounds-'+cfg.width+'.png')});
  const pendingBubble=await page.locator('#conversationPending .conversation-pending-bubble').boundingBox(),inputEnd=await page.locator('#conversationInput').boundingBox();assert.ok(pendingBubble.x+pendingBubble.width<=inputEnd.x+inputEnd.width+1,'pending reply ends before send/settings');
  rows.push({messageId:'own-reconciled',type:'text',userType:'fan',...lastPost,createdAt:Date.now()-1});await page.waitForFunction(()=>!document.querySelector('#conversationPending'));
  // A large pending reply may have been centred by scrollIntoView; explicitly
  // enter the latest view before asserting its follow behaviour.
  if(await page.locator('#conversationNew').isVisible())await page.locator('#conversationNew').click();
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.documentElement.scrollHeight-scrollY-innerHeight<3);
  echo=true;await page.locator('#conversationInput').fill('안녕?');await page.locator('#conversationSend').click();await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='own-short'));
  await page.waitForTimeout(200);
  const geometry=await page.evaluate(()=>{const bubble=document.querySelector('[data-message-id="own-short"] .bubble').getBoundingClientRect(),dock=document.querySelector('#conversationDock').getBoundingClientRect(),column=document.querySelector('#timeline').getBoundingClientRect(),input=document.querySelector('#conversationInput').getBoundingClientRect();return{bubble:bubble.toJSON(),dock:dock.toJSON(),column:column.toJSON(),input:input.toJSON()}});
  assert.ok(geometry.bubble.right<=geometry.input.right+1&&geometry.bubble.left>=geometry.column.left-1,JSON.stringify(geometry));
  assert.ok(geometry.bubble.bottom<=geometry.dock.top-8,'latest sent reply is above the fixed composer '+JSON.stringify(geometry));
  assert.ok(Math.abs(geometry.dock.right-geometry.column.right)<1,'fixed dock includes the scrollbar gutter correctly '+JSON.stringify(geometry));
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'sent-short-'+cfg.width+'.png')});


  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
  console.log(`${cfg.width}${cfg.installed?' PWA simulation':''}: inline storage checkbox, input-right emoticon, Replay-family audio/compact download/actual WAV bytes and latest shortcut PASS`);
 }}finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

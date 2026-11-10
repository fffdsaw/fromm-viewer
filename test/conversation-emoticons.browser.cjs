'use strict';
// Real DOM, IndexedDB and sender; catalog/auth/send responses are synthetic.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{for(const cfg of [{width:1440},{width:780,installed:true},{width:390}]){
  const {page,context,errors}=await open(browser,server.url,{...cfg,login:true});let posts=[],owned=true,rejectSend=false,packsRequests=0,itemsRequests=0,holdItems=null,releaseItems=null;
  const room={id:'fan-room',hostChatRoomId:'host-room',host:{nick:'테스트 아티스트'}},rows=Array.from({length:1200},(_,i)=>({messageId:'m'+i,userType:'star',type:'text',content:'이전 대화 '+i,createdAt:Date.now()-1300000+i*1000}));
  page.on('dialog',dialog=>dialog.accept());
  await page.addInitScript(()=>Object.defineProperty(window,'FrommConversation',{configurable:true,set(api){Object.defineProperty(window,'FrommConversation',{value:api,writable:true,configurable:true});api.loadFirebase=async()=>{throw new Error('Synthetic polling fallback')};}}));
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
   const answer=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(u.pathname==='/v2/chat/fanFriendAndChatRooms')return answer({success:true,data:{chatRooms:[room]}});
   if(u.pathname==='/v2/user/fan/profile')return answer({success:true,data:{profile:{id:'fan-self'}}});
   if(u.pathname==='/v2/chat/fanChatRooms/fan-room')return answer({success:true,data:{chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}}});
   if(u.pathname==='/v2/chat/emoticons/host-room'){
    packsRequests++;return answer({success:true,data:{emoticonPacks:owned?[{id:'p1',titleNameOverseas:{ko:'인사'},tabIconUrl:'https://fixture.test/tab.svg'},{id:'p2',nameAdmin:'응원',thumbnailUrl:'https://fixture.test/tab2.svg'}]:[]}});
   }
   if(u.pathname.startsWith('/v2/chat/emoticons/host-room/emoticon/')){
    itemsRequests++;if(holdItems){const wait=holdItems;holdItems=null;await wait;}
    const pack=u.pathname.split('/').at(-1);return answer({success:true,data:{emoticonItems:[{id:pack+'-item',imageUrl:'https://fixture.test/'+pack+'.svg',thumbnailUrl:'https://fixture.test/'+pack+'-thumb.svg'},{id:'unsafe',imageUrl:'javascript:alert(1)'}]}});
   }
   if(u.pathname==='/v2/chat/message/host-room/messages'){
    const start=Date.parse(u.searchParams.get('findStartAt')),end=Date.parse(u.searchParams.get('findEndAt')),limit=Number(u.searchParams.get('limit'));
    return answer({success:true,data:{messages:rows.filter(m=>m.createdAt>=start&&m.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit)}});
   }
   if(u.pathname==='/v2/chat/message/host-room/replies'){
    assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();posts.push(body);if(rejectSend)return answer({success:false,message:'synthetic rejection'},400);
    const message={messageId:'sent-'+posts.length,userType:'fan',userId:'fan-self',type:'text',...body,createdAt:Date.now()};rows.push(message);return answer({success:true,data:{message}});
   }
   return route.fallback();
  });
  await page.evaluate(room=>{
   setActiveAuth('synthetic-auth','synthetic-device','emoticons@example.test');hideLoginGate();FrommConversation.loadFirebase=async()=>{throw new Error('Synthetic polling fallback')};state.rooms=[room];
   const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button);
   localStorage.setItem(AUTH_TOKEN_KEY,'synthetic-auth');localStorage.setItem(AUTH_UUID_KEY,'synthetic-device');localStorage.setItem(AUTH_EMAIL_KEY,'emoticons@example.test');localStorage.removeItem(AUTH_EXPIRY_KEY);
  },room);
  await page.waitForFunction(()=>FrommConversation.status.phase==='connected'&&state.chatHistoryComplete);
  const compose=await page.locator('#conversationDock').boundingBox();assert.ok(compose.height<=54,JSON.stringify(compose));assert.equal(await page.locator('.conversation-meta').isVisible(),false);assert.equal(await page.locator('#conversationStorage').innerText(),'');assert.equal(await page.locator('#conversationStatus').isVisible(),false);
  // The latest-message control must live to the right of the input, not over chat.
  // Reveal it only for geometry inspection; restore its original scroll-dependent state.
  const latestLayout=await page.evaluate(()=>{
   const button=document.querySelector('#conversationNew'),row=document.querySelector('.conversation-compose');
   const shell=row.querySelector('.conversation-input-shell'),wasHidden=button.hidden;
   button.hidden=false;
   const a=button.getBoundingClientRect(),b=shell.getBoundingClientRect();
   const result={inside:button.parentElement===row,x:a.left,afterInput:b.right,bottom:a.bottom,inputBottom:b.bottom,css:getComputedStyle(button).position};
   button.hidden=wasHidden;return result;
  });
  assert.equal(latestLayout.inside,true,'latest button is an inline composer action');
  assert.equal(latestLayout.css,'relative','latest button is not an absolute overlay');
  assert.ok(latestLayout.x>=latestLayout.afterInput-1,'latest button is to the right of the input: '+JSON.stringify(latestLayout));
  assert.ok(Math.abs(latestLayout.bottom-latestLayout.inputBottom)<3,'latest button aligns with the input bottom: '+JSON.stringify(latestLayout));
  const seam=await page.locator('#sidebar').evaluate(el=>({
   borderColor:getComputedStyle(el).borderRightColor,
   pseudoImage:getComputedStyle(el,'::after').backgroundImage,
   pseudoBorder:getComputedStyle(el,'::after').borderRightWidth
  }));
  assert.equal(seam.borderColor,'rgba(0, 0, 0, 0)','sidebar right edge is not painted');
  assert.equal(seam.pseudoImage,'none','optical composition plane paints no mint stripe');
  assert.equal(seam.pseudoBorder,'0px','composition plane paints no separate vertical line');
  if(process.env.CONVERSATION_DIR){fs.mkdirSync(process.env.CONVERSATION_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'composer-'+cfg.width+'.png')});}
  await page.waitForTimeout(1800);await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="p1-item"]').waitFor();assert.equal(await page.locator('[data-emoticon="unsafe"]').count(),0);
  const popup=await page.locator('#conversationEmoticons').boundingBox();assert.ok(popup.x>=0&&popup.y>=0&&popup.x+popup.width<=cfg.width+1,JSON.stringify(popup));
  if(process.env.CONVERSATION_DIR)await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,'picker-'+cfg.width+'.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#conversationEmoticons').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'conversationEmoticonButton');
  await page.locator('#conversationInput').fill('사랑 ');
  await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="p1-item"]').waitFor();
  const emojiTab=page.locator('[data-emoji-tab="standard"]');assert.equal(await emojiTab.evaluate(e=>e===e.parentElement.lastElementChild),true,'standard emoji tab follows Fromm packs');
  await emojiTab.click();assert.ok(await page.locator('#conversationEmoticonItems').evaluate(e=>e.classList.contains('conversation-standard-emoji')));
  assert.equal(await emojiTab.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px','standard emoji tab has no visible border even when selected');
  await page.locator('[data-unicode-emoji="❤️"]').click();assert.equal(await page.locator('#conversationInput').inputValue(),'사랑 ❤️','standard emoji is inserted as draft text');
  assert.equal(await page.locator('#conversationEmoticons').isVisible(),true,'Unicode emoji picker stays open after selection');
  assert.equal(await page.locator('#conversationEmoticonButton').getAttribute('aria-expanded'),'true','picker toggle remains expanded');
  assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),false,'Unicode emoji is not a Fromm sticker');
  assert.equal(posts.length,0,'choosing Unicode emoji never sends a message');
  for(const emoji of ['🫳','🎂','🍮']){
   await page.locator('[data-unicode-emoji="'+emoji+'"]').click();
   assert.ok((await page.locator('#conversationInput').inputValue()).endsWith(emoji),'new standard emoji inserts as plain text: '+emoji);
   assert.equal(await page.locator('#conversationEmoticons').isVisible(),true,'picker stays open for the next emoji: '+emoji);
   assert.equal(posts.length,0,'selecting '+emoji+' must not submit a message');
  }
  assert.equal(await page.locator('#conversationInput').inputValue(),'사랑 ❤️🫳🎂🍮','consecutive emoji are appended in order');
  // Click outside to edit the draft, reopen, and insert at the newly chosen caret.
  await page.locator('#conversationInput').click();
  assert.equal(await page.locator('#conversationEmoticons').isVisible(),false,'editing draft closes the picker');
  await page.locator('#conversationInput').evaluate(input=>input.setSelectionRange(3,3));
  await page.locator('#conversationEmoticonButton').click();
  await page.locator('[data-emoji-tab="standard"]').click();
  await page.locator('[data-unicode-emoji="💚"]').click();
  assert.equal(await page.locator('#conversationInput').inputValue(),'사랑 💚❤️🫳🎂🍮','reopened picker respects new caret position');
  assert.equal(await page.locator('#conversationEmoticons').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#conversationEmoticons').isVisible(),false,'Escape closes the continuous picker');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'conversationEmoticonButton','Escape restores focus');
  await page.locator('#conversationInput').fill('');
  await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="p1-item"]').click();await page.waitForTimeout(150);const bounds=await page.evaluate(()=>({last:[...document.querySelectorAll('#timeline .msg')].at(-1).getBoundingClientRect().bottom,dock:document.querySelector('#conversationDock').getBoundingClientRect().top}));assert.ok(bounds.last<=bounds.dock-5,'preview keeps the latest message above the composer: '+JSON.stringify(bounds));assert.equal(posts.length,0,'choosing an emoticon never sends immediately');assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),true);assert.equal(await page.locator('#conversationSend').isEnabled(),true);
  await page.evaluate(()=>FrommConversation.flush());await page.reload();await page.waitForFunction(()=>FrommConversation.status.phase==='connected'&&state.chatHistoryComplete);assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),true,'unsent emoticon restored with the draft');
  const beforePacks=packsRequests,beforeItems=itemsRequests;await page.locator('#conversationSend').click();await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='sent-1'));
  assert.equal(posts.length,1);assert.equal(posts[0].content,'');assert.equal(posts[0].emoticonItemId,'p1-item');assert.equal(posts[0].chatRoomId,'fan-room');assert.ok(packsRequests>beforePacks&&itemsRequests>beforeItems,'current room ownership and item availability revalidated before POST');
  assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),false);assert.equal(await page.locator('[data-message-id="sent-1"] .emoticon-img').getAttribute('src'),'https://fixture.test/p1.svg');
  const sentSticker=page.locator('[data-message-id="sent-1"] .bubble');
  assert.equal(await sentSticker.locator('.meta .type').count(),0,'text/emoticon type label is hidden');
  assert.match(await page.locator('[data-message-id="sent-1"] .chat-message-time').innerText(),/^\d{2}:\d{2}$/,'sent time appears below sticker in 24-hour format');
  assert.ok(await sentSticker.evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft))>=12,'sticker card has room around name and rounded corner');
  await page.locator('#conversationEmoticonButton').click();await page.locator('[data-pack="p2"]').click();await page.locator('[data-emoticon="p2-item"]').click();await page.locator('#conversationInput').fill('함께 보내요 😊');
  rejectSend=true;await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationStatus').textContent.includes('보내지 못했습니다'));assert.equal(posts.length,2);assert.equal(await page.locator('#conversationInput').inputValue(),'함께 보내요 😊');assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),true);
  rejectSend=false;await page.locator('#conversationSend').click();await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='sent-3'));assert.equal(posts.length,3);assert.equal(posts[2].emoticonItemId,'p2-item');assert.equal(posts[2].content,'함께 보내요 😊');assert.equal(await page.locator('[data-message-id="sent-3"] .emoticon-img').count(),1);assert.equal(await page.locator('[data-message-id="sent-3"] .text').innerText(),'함께 보내요 😊');
  // Persisted metadata still renders when a later REST response omits image details.
  await page.evaluate(()=>FrommConversation.flush());await page.reload();await page.waitForFunction(()=>FrommConversation.status.phase==='connected');assert.equal(await page.locator('[data-message-id="sent-3"] .emoticon-img').count(),1);
  await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="p1-item"]').click();owned=false;await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationStatus').textContent.includes('사용할 수 없는 이모티콘'));assert.equal(posts.length,3,'revoked pack cannot send');assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),true);
  await page.getByRole('button',{name:'이모티콘 선택 해제',exact:true}).click();assert.equal(await page.locator('#conversationSend').isDisabled(),true);
  await page.locator('#conversationEmoticonButton').click();await page.getByText('사용할 수 있는 이모티콘이 없습니다.',{exact:true}).waitFor();await page.keyboard.press('Escape');owned=true;
  // Late catalog responses cannot reopen a closed picker or survive tab changes.
  holdItems=new Promise(resolve=>releaseItems=resolve);const previousItems=itemsRequests;await page.locator('#conversationEmoticonButton').click();while(itemsRequests===previousItems)await page.waitForTimeout(10);await page.evaluate(()=>setFilter('image'));releaseItems();await page.waitForTimeout(100);assert.equal(await page.locator('#conversationEmoticons').isVisible(),false);
  await page.evaluate(()=>setFilter('all'));await page.waitForFunction(()=>FrommConversation.status.phase==='connected');assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),false);
  await page.locator('#conversationInput').fill('일반 글 😊');await page.locator('#conversationSend').click();await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='sent-4'));assert.equal(posts[3].emoticonItemId,undefined,'plain text never inherits an old sticker');
  await page.evaluate(()=>{FrommViewState.cancel();renderChatWindow(filteredMessages(),500);scrollTo(0,800)});await page.waitForTimeout(200);
  const anchor=await page.evaluate(()=>{const row=[...document.querySelectorAll('#timeline .msg')].find(row=>row.getBoundingClientRect().bottom>chatHeaderInset()+8);return{id:row.dataset.messageId,top:row.getBoundingClientRect().top}});
  await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="p1-item"]').click();await page.waitForTimeout(100);
  assert.ok(Math.abs(await page.locator(`[data-message-id="${anchor.id}"]`).evaluate(row=>row.getBoundingClientRect().top)-anchor.top)<3,'preview does not move an older reader');
  await page.getByRole('button',{name:'이모티콘 선택 해제',exact:true}).click();await page.waitForTimeout(100);
  assert.ok(Math.abs(await page.locator(`[data-message-id="${anchor.id}"]`).evaluate(row=>row.getBoundingClientRect().top)-anchor.top)<3,'closing preview preserves an older reader');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
  console.log(`${cfg.width}${cfg.installed?' PWA simulation':''}: compact row/no persistent labels, owned catalog, picker/focus, draft restore, sticker-only/text+sticker/Unicode, reject/revoke and late tab response PASS`);
 }}finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

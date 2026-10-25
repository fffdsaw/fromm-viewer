'use strict';
// Synthetic profile/history responses through the production GET loaders only.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=(id,day,patch={})=>({messageId:id,userType:'star',type:'text',content:'일반 대화',createdAt:`2026-10-${day}T05:00:00Z`,...patch});
const quote=(userId,content='내가 쓴 합성 원문')=>({messageId:'original',userId,content});
const messages=[base('original','20',{userType:'fan',content:'내가 쓴 합성 원문'}),base('ordinary','21'),
 base('other-reply','22',{mentionedMessage:quote('fan-b')}),
 base('my-reply','23',{content:'내 답장 하나',embeddedMentionedMessage:{messageId:'original',content:'내가 쓴 합성 원문'},mentionedMessage:quote('fan-a')}),
 base('missing-author','24',{mentionedMessage:{messageId:'original',content:'동일한 원문'}}),
 base('my-image-reply','25',{type:'image',content:'https://cdn.example/synthetic.svg',mentionedMessage:quote('fan-a')}),
 base('mine-but-not-artist','25',{userType:'fan',mentionedMessage:quote('fan-a')})];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Asia/Seoul'});
   const page=await context.newPage(),errors=[],requests=[],dialogs=[];
   let profileStatus=200,profileDelay=400,profileId='fan-a',profileMissing=false;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='viewer.test'){
     const file=url.pathname.split('/').pop()||'index.html';
     if(!['index.html','web-native-live.js','web-live-pip.js','web-live-chat-probe.js','mobile-sync-test.js'].includes(file)) return route.abort();
     return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file))});
    }
    if(url.hostname.endsWith('frommyarti.com')){
     requests.push({method:route.request().method(),path:url.pathname});
     assert.equal(route.request().method(),'GET');
     const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:status===200,data})}).catch(()=>{});
     if(url.pathname==='/v2/user/fan/profile'){
      const id=profileId,status=profileStatus,missing=profileMissing;
      if(profileDelay) await new Promise(r=>setTimeout(r,profileDelay));
      return json({profile:missing?{}:{id}},status);
     }
     if(/^\/v2\/chat\/message\/[^/]+\/messages$/.test(url.pathname)){
      if(url.pathname.includes('/room-b/')) return json({messages:[base('room-b-reply','26',{mentionedMessage:quote('fan-b')})]});
      const end=new Date(url.searchParams.get('findEndAt')).getTime();
      return json({messages:messages.filter(m=>new Date(m.createdAt).getTime()<=end)});
     }
     return json({messages:[],liveRooms:[],channels:[],chatRooms:[]});
    }
    if(url.hostname==='cdn.example') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#354c70"/></svg>'});
    return route.abort();
   });
   await page.goto('http://viewer.test/index.html');
   await page.evaluate(()=>{
    setActiveAuth('synthetic-a','synthetic-device','synthetic-account');hideLoginGate();
    state.rooms=[{hostChatRoomId:'room-a',host:{nick:'합성 아티스트 A'}},{hostChatRoomId:'room-b',host:{nick:'합성 아티스트 B'}}];
    const rooms=document.getElementById('rooms');rooms.replaceChildren();
    state.rooms.forEach((r,i)=>{const b=document.createElement('button');b.className='room';b.textContent=r.host.nick;b.onclick=()=>selectRoom(i,b);rooms.append(b);});
   });
   await page.locator('#rooms .room').first().evaluate(el=>el.click());
   await page.waitForFunction(()=>state.chatHistoryComplete);
   await page.evaluate(()=>{window.originalNode=document.querySelector('[data-message-id="original"]');});
   await page.waitForFunction(()=>currentReplyUserId()==='fan-a');
   assert.equal(await page.evaluate(()=>window.originalNode===document.querySelector('[data-message-id="original"]')),true,'identity completion preserves existing conversation nodes');
   profileDelay=0;
   assert.equal(await page.locator('.msg').count(),messages.length);
   assert.equal(await page.locator('.reply-mine').count(),2);
   assert.match(await page.locator('[data-message-id="my-reply"] .reply-label').innerText(),/내 글에/);
   assert.doesNotMatch(await page.locator('[data-message-id="other-reply"] .reply-label').innerText(),/내 글에/);
   assert.equal(requests.filter(r=>r.path==='/v2/user/fan/profile').length,1);
   // Reusing the identity also leaves the existing conversation intact.
   await page.evaluate(()=>ensureReplyIdentity());
   assert.equal(await page.evaluate(()=>window.originalNode===document.querySelector('[data-message-id="original"]')),true);
   await page.locator('#chatToolsBtn').click();
   await page.locator('#datePickerBtn').click();
   await page.evaluate(()=>{state.calendarMonth=new Date(2026,9,1);renderDateCalendar();});
   const day=d=>page.locator(`.date-day[data-date="2026-10-${d}"]`);
   assert.equal(await day('23').getAttribute('class').then(x=>x.includes('has-my-reply')),true);
   assert.equal(await day('25').getAttribute('class').then(x=>x.includes('has-my-reply')),true);
   assert.equal(await day('20').getAttribute('class').then(x=>x.includes('has-my-reply')),false,'original date is not the received reply date');
   assert.equal(await day('22').getAttribute('class').then(x=>x.includes('has-my-reply')),false);
   const dotColor=loc=>loc.evaluate(el=>getComputedStyle(el,'::after').backgroundColor);
   assert.equal(await dotColor(day('23')),'rgb(255, 143, 168)');assert.equal(await dotColor(day('22')),'rgb(74, 163, 255)');
   await page.evaluate(()=>setSelectedDate('2026-10-23'));assert.equal(await dotColor(day('23')),'rgb(255, 143, 168)','selected days retain pink');
   await page.locator('#dateCalendarTitle').click();assert.equal(await page.locator('.date-year-option.has-my-reply').innerText(),'2026');
   await page.locator('.date-year-option.has-my-reply').click();assert.equal(await page.locator('.date-month-option.has-my-reply').innerText(),'10월');
   await page.locator('.date-month-option.has-my-reply').click();
   // Narrower/shorter viewports keep the larger search/calendar panel scrollable.
   await page.setViewportSize({width:width===1440?800:360,height:640});
   await page.waitForTimeout(100);
   const panelBox=await page.locator('#chatToolsPanel').boundingBox();
   if(panelBox.x<0 || panelBox.x+panelBox.width>(width===1440?800:360)+1){console.log('resize panel',width,panelBox,await page.locator('#chatToolsBtn').boundingBox());await page.screenshot({path:'/tmp/fromm-my-replies-resize-failure.png'});}
   assert.ok(panelBox.x>=0 && panelBox.x+panelBox.width<=(width===1440?800:360)+1);
   assert.ok(panelBox.y+panelBox.height<=641,'panel fits the resized viewport');
   assert.equal(await page.locator('#chatToolsPanel').evaluate(el=>getComputedStyle(el).overflowY),'auto');
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
   if(process.env.REPLY_SCREENSHOT_DIR){fs.mkdirSync(process.env.REPLY_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.REPLY_SCREENSHOT_DIR,`reply-calendar-${width}.png`)});}
   await page.locator('#myRepliesBtn').click();
   assert.equal(await page.locator('#myRepliesBtn').getAttribute('aria-pressed'),'true');
   await page.waitForFunction(()=>state.chatMatchKey==='my-reply');
   assert.equal(await page.locator('.msg').count(),messages.length,'context mode retains surrounding conversation');
   assert.equal(await page.locator('#chatMatchPosition').innerText(),'1 / 2');
   assert.equal(await page.locator('#chatMatchPrev').isDisabled(),true);
   await page.evaluate(()=>{window.contextNode=document.querySelector('[data-message-id="ordinary"]');});
   await page.locator('#chatMatchNext').click();
   await page.waitForFunction(()=>state.chatMatchKey==='my-image-reply');
   assert.equal(await page.locator('#chatMatchPosition').innerText(),'2 / 2');
   assert.equal(await page.locator('#chatMatchNext').isDisabled(),true);
   assert.equal(await page.evaluate(()=>window.contextNode===document.querySelector('[data-message-id="ordinary"]')),true,'nearby arrow jumps preserve existing DOM');
   await page.locator('#chatMatchPrev').click();await page.waitForFunction(()=>state.chatMatchKey==='my-reply');
   await page.locator('#chatToolsBtn').click();
   await page.locator('#chatContextBtn').click();
   assert.equal(await page.locator('#chatContextBtn').getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('.msg').count(),2);
   assert.equal(await page.locator('.reply-mine').count(),2);
   await page.locator('#chatSearchInput').fill('하나');
   await page.waitForFunction(()=>state.chatQuery==='하나');assert.equal(await page.locator('.msg').count(),1);
   assert.equal(await page.locator('#chatSearchCount').innerText(),'1개');
   await page.locator('#chatSearchClear').click();assert.equal(await page.locator('.msg').count(),2);
   await page.locator('#datePickerBtn').click();
   await day('25').click();await page.waitForFunction(()=>document.querySelector('[data-message-id="my-image-reply"]')?.classList.contains('date-target-flash'));
   assert.equal(await page.locator('.msg').count(),2,'date navigation retains the personal filter');
   await page.locator('[data-message-id="my-reply"] .reply-quote').click();
   await page.waitForFunction(()=>!state.onlyMyReplies && document.querySelector('[data-message-id="original"]')?.classList.contains('reply-target-flash'));
   assert.equal(await page.locator('.msg').count(),messages.length);
   // Plain text search can also navigate matches inside the complete conversation.
   await page.locator('#chatToolsBtn').click();await page.locator('#chatSearchInput').fill('일반 대화');
   await page.waitForFunction(()=>state.chatQuery==='일반 대화');
   const searchTotal=await page.evaluate(()=>chatMatches().length);assert.ok(searchTotal>1);
   await page.locator('#chatContextBtn').click();await page.waitForFunction(()=>state.chatMatchKey==='ordinary');
   assert.equal(await page.locator('.msg').count(),messages.length);
   await page.locator('#chatMatchNext').click();await page.waitForFunction(()=>state.chatMatchKey==='other-reply');
   assert.equal(await page.evaluate(()=>state.chatQuery),'일반 대화');
   await page.locator('#chatToolsBtn').click();await page.locator('#chatSearchClear').click();
   assert.equal(await page.locator('#chatMatchNav').isVisible(),false);
   await page.locator('[data-filter="media"]').click();assert.equal(await page.locator('.media-card').count(),1);
   await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('.msg').count(),messages.length);
   // Far-apart matches keep the full conversation but render a bounded window.
   await page.evaluate(()=>{
    window.smallHistory=state.chatMessages;
    state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'many-'+i,userType:'star',type:'text',content:'주변 대화 '+i,
     createdAt:new Date(Date.UTC(2026,0,1,0,i)).toISOString(),...([0,1500,2999].includes(i)?{mentionedMessage:{messageId:'original',userId:'fan-a',content:'내 원문'}}:{})}));
    state.chatContext=false;state.chatMatchKey='';state.onlyMyReplies=false;render();
   });
   await page.locator('#chatToolsBtn').click();await page.locator('#myRepliesBtn').click();
   await page.waitForFunction(()=>state.chatMatchKey==='many-0');
   await page.locator('#chatMatchNext').click();await page.waitForFunction(()=>state.chatMatchKey==='many-1500');
   assert.equal(await page.locator('[data-message-id="many-1499"]').count(),1);assert.equal(await page.locator('[data-message-id="many-1501"]').count(),1);
   assert.ok(await page.locator('.msg').count()<1200,'far jumps do not render all history');
   await page.locator('#chatMatchNext').click();await page.waitForFunction(()=>state.chatMatchKey==='many-2999');
   assert.equal(await page.locator('#chatMatchPosition').innerText(),'3 / 3');
   await page.locator('#chatMatchPrev').click();await page.waitForFunction(()=>state.chatMatchKey==='many-1500');
   assert.equal(await page.locator('#chatMatchPosition').innerText(),'2 / 3');
   await page.evaluate(()=>jumpToDate('2026-01-03'));
   await page.waitForFunction(()=>state.chatMatchKey==='many-2999');
   assert.equal(await page.locator('#chatMatchPosition').innerText(),'3 / 3','context date jump lands on a reply after thousands of earlier records');

   assert.equal(await page.locator('#chatToolsBtn svg.magnifier-icon circle').count(),1);
   if(process.env.REPLY_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.REPLY_SCREENSHOT_DIR,`reply-context-${width}.png`)});
   await page.evaluate(()=>{state.chatMessages=window.smallHistory;state.onlyMyReplies=false;state.chatContext=false;state.chatMatchKey='';render();});
   await page.locator('#chatToolsBtn').click();await page.locator('#myRepliesBtn').click();
   await page.locator('#rooms .room').last().evaluate(el=>el.click());
   await page.waitForFunction(()=>state.room.hostChatRoomId==='room-b' && state.chatHistoryComplete);
   assert.equal(await page.evaluate(()=>state.onlyMyReplies),false);assert.equal(await page.locator('.reply-mine').count(),0);
   assert.equal(requests.filter(r=>r.path==='/v2/user/fan/profile').length,1,'same account reuses identity across rooms');
   // Account transition clears every personal marker immediately, then uses B's actual ID.
   await page.evaluate(()=>{resetUserScopedMemory();setActiveAuth('synthetic-b','device-b','account-b');state.room={hostChatRoomId:'room-b',host:{nick:'B'}};});
   profileId='fan-b';await page.evaluate(()=>ensureReplyIdentity());
   await page.evaluate(async()=>{await ensureFullChatHistory();render();});
   assert.equal(await page.locator('.reply-mine').count(),1);
   // A failed profile never guesses from UUID; regular chat stays visible and retry works.
   profileStatus=503;
   await page.evaluate(()=>{resetReplyIdentity();render();});await page.evaluate(()=>ensureReplyIdentity());
   assert.equal(await page.locator('.reply-mine').count(),0);assert.equal(await page.locator('.msg').count(),1);
   await page.locator('#chatToolsBtn').click();assert.equal(await page.locator('#myReplyRetry').isVisible(),true);
   await page.locator('#myRepliesBtn').click();assert.equal(await page.locator('.msg').count(),1);assert.equal(await page.locator('#chatMatchNext').isDisabled(),true);assert.equal(await page.locator('#counts').innerText(),'내 답장 확인 불가');
   profileStatus=200;await page.locator('#myReplyRetry').click();await page.waitForFunction(()=>currentReplyUserId()==='fan-b');
   assert.equal(await page.locator('.msg').count(),1);assert.equal(await page.locator('#myReplyRetry').isVisible(),false);
   // Missing IDs follow the same recoverable path.
   profileMissing=true;await page.evaluate(()=>resetReplyIdentity());await page.evaluate(()=>ensureReplyIdentity());
   assert.equal(await page.evaluate(()=>currentReplyUserId()),'');profileMissing=false;
   // A delayed profile must not restore markers after logout, even if the response arrives.
   profileDelay=300;await page.evaluate(()=>{resetReplyIdentity();window.lateProfile=ensureReplyIdentity();});
   await page.waitForTimeout(60);await page.evaluate(()=>forgetSavedAuth());await page.evaluate(()=>window.lateProfile);
   await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>currentReplyUserId()),'');assert.equal(await page.locator('.reply-mine').count(),0);assert.equal(await page.locator('.has-my-reply').count(),0);
   assert.equal(await page.evaluate(()=>state.onlyMyReplies),false);
   assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);
   assert.ok(requests.every(r=>r.method==='GET'));
   console.log(`${width}px: profile/history GET loaders, exact author, filter/search, calendar day/month/year/color, date/original jumps, context arrows/list toggle/3000-message bounded jumps, SVG icon, media, room/account/reset/failure/retry/late logout PASS`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

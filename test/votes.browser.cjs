'use strict';
// Production UI + synthetic GET responses only. No real account or service.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const originalBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ncAAAAASUVORK5CYII=','base64');
const vote=(id,patch={})=>({id,topic:'합성 투표 '+id,status:'ended',endAt:'2026-10-24T12:00:00Z',
 isArtiPickExposed:true,hasArtiParticipated:true,artiPickOptionId:2,
 options:[{optionId:1,text:'선택 A',percentage:0,thumbnailImageUrl:'https://cdn.example/option.svg',originalImageUrl:'https://cdn.example/original.png'},{optionId:2,text:'선택 B',percentage:100},{optionId:3,text:'값 없음',percentage:null}],...patch});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900}});
   const page=await context.newPage(),errors=[],requests=[];
   let failPage=false,badCursor=false,listDelay=0,detailDelay=0,detailStatus=200,detailPatch={},brokenAvatar=false,failImage=false,imageDelay=0,downloadCount=0;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('download',()=>downloadCount++);
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='viewer.test'){
     const name=url.pathname.split('/').pop();
     const file=['web-native-live.js','web-live-pip.js','web-live-chat-probe.js','mobile-sync-test.js'].includes(name)?name:'index.html';
     return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file))});
    }
    if(url.hostname.endsWith('frommyarti.com')){
     requests.push({method:route.request().method(),url:url.pathname,query:url.search,auth:route.request().headers().authorization});
     assert.equal(route.request().method(),'GET','feature traffic must be read-only');
     const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:status===200,data})}).catch(()=>{});
     if(url.pathname.match(/^\/v2\/chat\/votes\/[^/]+\/\d+$/)){
      if(detailDelay) await new Promise(r=>setTimeout(r,detailDelay));
      return json({vote:vote(Number(url.pathname.split('/').pop()),detailPatch)},detailStatus);
     }
     if(url.pathname.startsWith('/v2/chat/votes/')){
      const delay=listDelay;if(delay) await new Promise(r=>setTimeout(r,delay));
      if(failPage) return json({},503);
      if(url.pathname.endsWith('/room-b')) return json({votes:[vote(9,{topic:'다른 아티스트 투표'})],nextCursor:null});
      if(url.searchParams.has('cursor')) return json({votes:[vote(2),vote(3)],nextCursor:badCursor?2:null});
      return json({votes:[vote(1,{topic:'<img src=x onerror=window.voteXss=1>'}),vote(2)],nextCursor:2});
     }
     return json({messages:[],liveRooms:[],channels:[],chatRooms:[]});
    }
    if(url.hostname==='cdn.example' && url.pathname==='/original.png'){
     assert.equal(route.request().headers().authorization,undefined,'photo fetch does not forward API credentials');
     const failure=failImage;if(imageDelay) await new Promise(r=>setTimeout(r,imageDelay));
     return route.fulfill({status:failure?503:200,contentType:failure?'text/plain':'image/png',headers:{'access-control-allow-origin':'*'},body:failure?'temporary failure':originalBytes}).catch(()=>{});
    }
    if(url.hostname==='cdn.example' && brokenAvatar && url.pathname.startsWith('/avatar-')) return route.fulfill({status:404,body:''});
    if(url.hostname==='cdn.example') return route.fulfill({contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="100"><rect width="180" height="100" fill="#355983"/></svg>'});
    return route.abort();
   });
   await page.goto('http://viewer.test:4175/index.html');
   await page.evaluate(()=>{
    setActiveAuth('synthetic-token','synthetic-device','synthetic-account');hideLoginGate();
    state.rooms=[{hostChatRoomId:'room-a',host:{nick:'합성 아티스트 A',profileUrlThumbnail:'https://cdn.example/avatar-a.svg'}},{hostChatRoomId:'room-b',host:{nick:'합성 아티스트 B',profileUrlThumbnail:'https://cdn.example/avatar-b.svg'}}];
    state.room=state.rooms[0];state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
    const base={userType:'star',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z'};
    state.chatMessages=[{...base,messageId:'before',type:'text',content:'일반 대화'},
     {...base,messageId:'vote-message',type:'vote',content:'',vote:{id:1,topic:'합성 검색 질문',status:'ended',endAt:'2026-10-24T12:00:00Z',options:[{optionId:1,text:'검색 선택지'}]}},
     {...base,messageId:'after',type:'text',content:'이후 대화'}];
    state.messages=state.chatMessages;render();
   });
   assert.equal(await page.locator('.msg').count(),3);
   assert.match(await page.locator('.vote-chat-card').innerText(),/합성 검색 질문/);
   if(process.env.VOTE_SCREENSHOT_DIR){fs.mkdirSync(process.env.VOTE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.VOTE_SCREENSHOT_DIR,`chat-${width}.png`),fullPage:true});}
   assert.equal(requests.filter(r=>r.url.includes('/votes/')).length,0,'rendering a chat card makes no extra request');
   await page.evaluate(()=>{state.chatQuery='검색 선택지';render();});
   assert.equal(await page.locator('.msg').count(),1,'vote question/options participate in chat search');
   assert.equal(await page.locator('#chatSearchCount').textContent(),'1개');
   await page.evaluate(()=>{state.chatQuery='';render();});
   const opener=page.locator('.vote-open');await opener.click();
   await page.getByRole('heading',{name:'합성 투표 1',exact:true}).waitFor();
   assert.equal(await page.locator('.vote-percentage').first().innerText(),'0%');
   assert.equal(await page.locator('.vote-percentage').last().innerText(),'미제공');
   assert.equal(await page.locator('.vote-artist-pick').count(),1);
   assert.match(await page.locator('.vote-artist-pick').innerText(),/합성 아티스트 A 선택/);
   await page.waitForFunction(()=>document.querySelector('.vote-artist-profile')?.naturalWidth>0);
   assert.match(await page.locator('.vote-artist-profile').getAttribute('src'),/avatar-a/);
   await page.waitForFunction(()=>document.querySelector('.vote-option img')?.naturalWidth>0);
   if(process.env.VOTE_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.VOTE_SCREENSHOT_DIR,`detail-${width}.png`)});
   assert.equal(await page.locator('.vote-close').count(),0,'explicit close button removed');
   assert.equal(await page.locator('#voteDetailDialog').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('vote-dialog-open')),true);
   await page.locator('#voteDetailTitle').click();assert.equal(await page.locator('#voteDetailDialog').evaluate(el=>el.open),true,'inside click stays open');
   const [photo]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'선택지 1 사진 저장'}).click()]);
   assert.equal(photo.suggestedFilename(),'투표_1_선택지_1.png');assert.deepEqual(fs.readFileSync(await photo.path()),originalBytes,'download contains original bytes, not the thumbnail');
   failImage=true;await page.getByRole('button',{name:'선택지 1 사진 저장'}).click();
   await page.waitForFunction(()=>document.querySelector('.vote-image-status')?.textContent.includes('저장하지 못'));
   assert.equal(await page.getByRole('button',{name:'선택지 1 사진 저장'}).isEnabled(),true);
   failImage=false;
   const [retryPhoto]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'선택지 1 사진 저장'}).click()]);
   assert.deepEqual(fs.readFileSync(await retryPhoto.path()),originalBytes);
   const dialogBox=await page.locator('#voteDetailDialog').boundingBox();
   await page.mouse.move(dialogBox.x+30,dialogBox.y+20);await page.mouse.down();await page.mouse.move(2,2);await page.mouse.up();
   assert.equal(await page.locator('#voteDetailDialog').evaluate(el=>el.open),true,'dragging from inside to backdrop must not dismiss');
   await page.mouse.click(2,2);await page.waitForFunction(()=>!document.querySelector('#voteDetailDialog').open);
   await page.waitForFunction(()=>!document.documentElement.classList.contains('vote-dialog-open'));
   await opener.click();await page.getByRole('heading',{name:'합성 투표 1',exact:true}).waitFor();

   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('voteDetailDialog').open);
   assert.equal(await opener.evaluate(el=>document.activeElement===el),true,'Escape restores opener focus');
   await page.locator('[data-filter="vote"]').click();
   await page.locator('.vote-list-item').first().waitFor();
   assert.equal(await page.locator('.vote-list-item').count(),2);
   assert.equal(await page.evaluate(()=>window.voteXss||0),0);
   assert.equal(await page.locator('.vote-list-item img').count(),0,'list titles stay escaped');
   assert.equal(await page.locator('#saveSelectedBtn').isVisible(),false);
   assert.equal(await page.locator('#sortControls').isVisible(),false);
   failPage=true;await page.locator('#voteLoadMore').click();await page.getByRole('alert').waitFor();
   assert.equal(await page.locator('.vote-list-item').count(),2,'failed pagination retains previous rows');
   failPage=false;badCursor=true;await page.locator('#voteLoadMore').click();await page.getByRole('alert').waitFor();
   assert.equal(await page.locator('.vote-list-item').count(),2,'a repeated cursor does not silently exhaust or loop');
   badCursor=false;await page.locator('#voteLoadMore').click();await page.waitForFunction(()=>document.querySelectorAll('.vote-list-item').length===3);
   assert.equal(await page.locator('#voteLoadMore').count(),0);
   if(process.env.VOTE_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.VOTE_SCREENSHOT_DIR,`list-${width}.png`),fullPage:true});
   await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   await page.keyboard.press('Escape');
   detailPatch={hasArtiParticipated:false,artiPickOptionId:0,options:[{optionId:0,text:'0번 ID 선택지',percentage:23},{optionId:1,text:'다른 선택지',percentage:77}]};
   await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   assert.match(await page.locator('.vote-option.artist-pick').innerText(),/0번 ID 선택지/);
   assert.equal(await page.locator('.vote-artist-profile').count(),1,'zero option and false participation flag follow native selection condition');
   assert.equal(await page.evaluate(()=>FrommVoteDiag().displayed),true);
   assert.doesNotMatch(await page.evaluate(()=>JSON.stringify(FrommVoteDiag())),/synthetic|room-a|합성|https?:|Bearer/);
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{state.room.host.profileUrlThumbnail='https://cdn.example/avatar-missing.svg';});
   brokenAvatar=true;await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelector('.vote-artist-pick') && !document.querySelector('.vote-artist-profile'));
   assert.match(await page.locator('.vote-artist-pick').innerText(),/합성 아티스트 A 선택/,'failed profile retains artist label/initial');
   assert.equal(await page.locator('.vote-artist-avatar').count(),1);
   await page.keyboard.press('Escape');brokenAvatar=false;
   await page.evaluate(()=>{state.room.host.profileUrlThumbnail='https://cdn.example/avatar-a.svg';});
   detailPatch={status:'ongoing',myPickOptionId:null};await page.locator('.vote-list-item').last().click();
   await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   assert.equal(await page.locator('.vote-artist-pick').count(),0);
   assert.deepEqual(await page.locator('.vote-percentage').allTextContents(),['미제공','미제공','미제공']);
   await page.keyboard.press('Escape');
   detailPatch={isArtiPickExposed:false};await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   assert.equal(await page.locator('.vote-artist-pick').count(),0,'private artist picks stay concealed');
   assert.equal(await page.locator('.vote-artist-profile').count(),0);
   assert.equal(await page.evaluate(()=>FrommVoteDiag().exposed),false);
   await page.keyboard.press('Escape');
   detailStatus=403;await page.locator('.vote-list-item').last().click();await page.getByRole('alert').waitFor();
   assert.match(await page.getByRole('alert').innerText(),/권한/);
   assert.equal(await page.locator('.vote-option').count(),0,'failed detail does not retain prior result');
   detailStatus=200;detailPatch={};await page.locator('.vote-retry').click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   const bounds=await page.locator('#voteDetailDialog').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,height:r.height,viewport:innerHeight};});
   assert.ok(bounds.left>=0 && bounds.right<=bounds.width+1 && bounds.height<=bounds.viewport,'dialog fits viewport');
   await page.keyboard.press('Escape');
   detailPatch={};
   await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   const downloadsBefore=downloadCount;imageDelay=200;
   await page.getByRole('button',{name:'선택지 1 사진 저장'}).click();await page.keyboard.press('Escape');
   await page.waitForTimeout(300);assert.equal(downloadCount,downloadsBefore,'dismissed vote cannot download after a late image response');imageDelay=0;
   detailPatch={options:[{optionId:1,text:'썸네일만 있는 항목',thumbnailImageUrl:'https://cdn.example/option.svg',percentage:100}]};
   await page.locator('.vote-list-item').last().click();await page.getByRole('heading',{name:'합성 투표 3',exact:true}).waitFor();
   const [fallbackPhoto]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'선택지 1 사진 저장'}).click()]);
   assert.equal(fallbackPhoto.suggestedFilename(),'투표_3_선택지_1.svg');assert.match(fs.readFileSync(await fallbackPhoto.path(),'utf8'),/<svg/);
   await page.keyboard.press('Escape');detailPatch={};
   detailDelay=200;await page.locator('.vote-list-item').last().click();await page.keyboard.press('Escape');
   await page.waitForTimeout(250);assert.equal(await page.locator('#voteDetailDialog').evaluate(el=>el.open),false,'late detail cannot reopen a closed dialog');detailDelay=0;
   listDelay=200;await page.evaluate(()=>{void loadVotes({refresh:true});});
   await page.evaluate(()=>{selectRoom(1,document.createElement('button'));});
   await page.waitForTimeout(250);listDelay=0;
   await page.locator('[data-filter="vote"]').click();
   await page.getByText('다른 아티스트 투표',{exact:true}).waitFor();
   assert.equal(await page.locator('.vote-list-item').count(),1,'room change rejects the delayed previous list');
   await page.locator('.vote-list-item').click();await page.getByRole('heading',{name:'합성 투표 9',exact:true}).waitFor();
   assert.match(await page.locator('.vote-artist-profile').getAttribute('src'),/avatar-b/,'room B never reuses room A profile');
   await page.evaluate(()=>resetUserScopedMemory());
   await page.waitForFunction(()=>!document.getElementById('voteDetailDialog').open);
   assert.equal(await page.evaluate(()=>voteView.items.length),0,'account reset clears vote cache');
   assert.equal(await page.locator('#voteDetailDialog .vote-detail-body').innerText(),'');
   assert.ok(requests.filter(r=>r.url.includes('/votes/')).every(r=>r.auth==='Bearer synthetic-token'));
   assert.deepEqual(errors,[]);
   console.log(`${width}px: chat/list/detail, GET-only, original-photo bytes/failure/retry/late download, backdrop/drag/Escape, themed scrollbar, search/paging, visibility, XSS, room/account races PASS`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

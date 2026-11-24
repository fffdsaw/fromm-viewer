'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const output=process.env.CHANNEL_PHOTO_DIR||'/tmp/fromm-channel-photos';
const {chromium}=require('playwright'),fixture=require('./helpers/phase3-fixture.cjs');
const {contentFilter}=require('./helpers/collection-fixture.cjs');
const photo=(id)=>({id,type:'image',title:'앨범 '+id,thumbnail:'https://fixture.test/photo.svg',displayStartAt:Date.parse('2026-09-07T15:00:00Z'),num:1});

async function checkArtistMedia(page) {
  const thumbnailUrl='https://fixture.test/photo.svg';
  const album={id:'p1',isVisible:true,createdAt:'2026-09-08T12:00:00+09:00',author:{name:'합성 아티스트'},content:'Artist 앨범\n두 번째 줄',mediaType:'image',media:[1,2].map(i=>({mediaType:'image',url:thumbnailUrl+'?artist='+i,thumbnailUrl}))};
  const video={id:'v',isVisible:true,createdAt:'2026-09-07T12:00:00+09:00',author:{id:'video-member',name:'영상 멤버'},content:'Artist 영상',mediaType:'video',mediaUrl:'https://fixture.test/artist.mp4',thumbnailUrl};
  const bytes=execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x90:rate=12','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1']);
  const requests=[];
  let allowAlbum=false;
  await page.route('**/artist.mp4',route=>route.fulfill({contentType:'video/mp4',body:bytes}));
  await page.route('**/*',route=>{
    const request=route.request();
    let url=new URL(request.url());
    if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
    if(url.hostname!=='channel-api.frommyarti.com'||!/^\/posts(?:\/|$)/.test(url.pathname))return route.fallback();
    const {pathname,searchParams}=url;
    const cursor=searchParams.get('postId');
    requests.push({pathname,cursor,first:searchParams.get('includeId'),channel:request.headers()['channel-id'],method:request.method()});
    let data;
    if(pathname==='/posts'){
      if(request.headers()['channel-id']==='other-channel')data={posts:[],isLast:true};
      else if(cursor==='text-tail')data={posts:[album,video],isLast:true};
      else data={posts:[{...album,id:'restricted',isVisible:false},{...album,id:'official',isOfficialPost:true},{id:'text-tail',isVisible:true,mediaType:'text'}],isLast:false};
    }else if(pathname==='/posts/p1')data={post:{...album,isVisible:allowAlbum}};
    else if(pathname==='/posts/v')data={post:video};
    return route.fulfill({headers:{'access-control-allow-origin':'*'},json:{success:true,data}});
  });
  await page.locator('#saveResultOkBtn').click();
  await page.locator('#saveResultModal').waitFor({state:'hidden'});
  const member=page.getByRole('combobox',{name:'멤버 선택'});
  const capsule=page.locator('.channel-member-capsule');
  const positions=()=>page.evaluate(()=>['[data-channel-content-menu]','#sortBtn'].map(selector=>document.querySelector(selector).getBoundingClientRect().x));
  const start=await positions();
  assert.equal(await capsule.isVisible(),false);
  await contentFilter(page,'artist');
  assert.equal(await page.locator('[data-channel-content-menu]').innerText(),'Artist');
  assert.deepEqual(await page.locator('.replay-card .replay-title').allTextContents(),['Artist 앨범','Artist 영상']);
  assert.deepEqual(requests.map(({cursor,first})=>[cursor,first]),[[null,'yes'],['text-tail',null]]);
  assert.match(await page.locator('.channel-photo-date').innerText(),/합성 아티스트/);
  assert.equal(await page.locator('.channel-photo-count-badge').innerText(),'2장');
  await page.waitForFunction(()=>document.querySelector('.channel-member-capsule').dataset.capsulePhase==='shown');
  assert.deepEqual(await positions(),start,'Artist and sort anchors keep their positions when the member capsule opens');
  assert.deepEqual(await member.locator('option').allTextContents(),['멤버 전체','영상 멤버','합성 아티스트']);
  assert.equal(await page.locator('.channel-media-tabs + .channel-member-capsule .capsule-horizontal-skin').count(),1);
  await member.selectOption({label:'영상 멤버'});
  assert.deepEqual(await page.locator('.replay-card .replay-title').allTextContents(),['Artist 영상']);
  assert.equal(await page.locator('.pc-mode-count').innerText(),'1개');
  assert.deepEqual(await positions(),start);
  await member.selectOption('');
  await page.evaluate(()=>{
    const page=channelVideoPage(),base=page.posts[1];
    page.posts.push(...Array.from({length:8},(_,i)=>({...base,id:'count-fixture-'+i})));
    renderLiveView();
  });
  assert.equal(await page.locator('.pc-mode-count').innerText(),'10개');
  assert.deepEqual(await positions(),start,'digit growth keeps the content filter and sort fixed');
  await page.evaluate(()=>{const page=channelVideoPage();page.posts=page.posts.filter(post=>!post.id.startsWith('count-fixture-'));renderLiveView();});
  await page.screenshot({path:`${output}/artist-1440.png`});
  await page.setViewportSize({width:760,height:900});
  const narrow=await positions();
  await member.selectOption({label:'합성 아티스트'});
  assert.deepEqual(await positions(),narrow,'narrow desktop keeps both controls anchored');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await member.selectOption('');
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Artist 앨범 앨범 열기'}).click();
  await page.getByRole('button',{name:'다시 불러오기',exact:true}).waitFor();
  assert.equal(await page.locator('.channel-photo-image img').getAttribute('src'),null,'a denied detail never opens cached list media');
  allowAlbum=true;
  await page.getByRole('button',{name:'다시 불러오기',exact:true}).click();
  await page.getByText('1 / 2',{exact:true}).waitFor();
  assert.equal(await page.locator('.channel-photo-dialog footer').isVisible(),false);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('.channel-photo-image img')?.currentSrc.endsWith('?artist=2'));
  assert.equal(await page.locator('.channel-photo-count').textContent(),'2 / 2');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Artist 영상 재생'}).click();
  await page.waitForFunction(()=>document.querySelector('#channelVideo')?.videoWidth===160);
  await page.locator('#channelBackToList').click();
  await page.getByRole('button',{name:'Artist 영상 재생'}).waitFor();
  await member.selectOption({label:'영상 멤버'});
  await page.evaluate(()=>{state.live.channels.push({id:'other-channel',channelName:'다른 채널'});renderLiveView();});
  await page.getByRole('button',{name:'다른 채널',exact:true}).click();
  await page.getByText('불러온 아티스트 게시물에 볼 수 있는 사진이나 영상이 없습니다.',{exact:true}).waitFor();
  assert.deepEqual(await member.locator('option').allTextContents(),['멤버 전체']);
  await page.getByRole('button',{name:'테스트 채널',exact:true}).click();
  assert.equal(await member.inputValue(),'');
  await contentFilter(page,'image');
  await capsule.waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-channel-photo-open="p1"]').count(),1,'official media remains separate even when the post IDs match');
  assert.deepEqual([...new Set(requests.map(r=>r.channel))],['fixture-channel','other-channel']);
  assert.ok(requests.every(r=>r.method==='GET'));
}

(async()=>{
 const server=await fixture.serve(),browser=await chromium.launch({headless:true});
 try{for(const width of [1440,390]){
  const {page,context,errors}=await fixture.open(browser,server.url,{width,height:900});
  const requests=[],downloads=[],alerts=[];let deny=false,delay=0;
  fs.mkdirSync(output,{recursive:true});
  page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  page.on('download',async d=>{const file=await d.path();downloads.push({name:d.suggestedFilename(),bytes:fs.readFileSync(file)});});
  await page.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
   const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:status===200,data})});
   if(u.hostname==='channel-contents.frommyarti.com'){
    if(u.pathname.endsWith('.jpg'))return route.fulfill({status:404,body:'missing original'});
    return route.fulfill({contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#a0bde8"/></svg>'});
   }
   if(u.hostname.endsWith('frommyarti.com')&&u.pathname==='/media/posts'){
    const cursor=u.searchParams.get('postId');requests.push(cursor);
    if(delay)await new Promise(r=>setTimeout(r,delay));
    if(!cursor)return json({posts:[{id:'v',type:'video',title:'영상'},photo('p1'),{id:'raw-tail',type:'live_record',num:2,displayStartAt:1}],isLast:false});
    if(cursor==='raw-tail')return json({posts:[{id:'empty-photo-page',type:'video',num:3,displayStartAt:0}],isLast:false});
    return json({posts:[photo('p2'),{...photo('hidden'),isVisible:false}],isLast:true});
   }
   if(u.hostname.endsWith('frommyarti.com')&&u.pathname.startsWith('/media/posts/')){
    if(deny)return json({},403);
    const id=u.pathname.split('/').at(-1);
    return json({post:{...photo(id),urls:['https://fixture.test/photo.svg?one','https://channel-contents.frommyarti.com/album/p_720x1080.webp']}});
   }
   return route.fallback();
  });
  await page.evaluate(async()=>{window.showDirectoryPicker=undefined;state.filter='live';await setLiveCenterMode('channel');});
  await page.locator('[data-channel-content-menu]').click();await page.locator('[data-morph-value="image"]').click();
  await page.locator('[data-channel-photo-open="p2"]').waitFor();
  assert.equal(await page.locator('.channel-photo-card').count(),2);
  await page.waitForFunction(()=>[...document.querySelectorAll('.channel-photo-count-badge')].every(e=>e.textContent==='2장'));
  assert.equal(await page.locator('[data-channel-video-play]').count(),0);
  assert.ok(requests.includes('raw-tail')&&requests.includes('empty-photo-page'),'cursor follows unfiltered raw tail through photo-empty page');
  await page.screenshot({path:`${output}/list-${width}.png`});
  await page.locator('[data-channel-photo-open="p1"]').click();
  await page.getByText('1 / 2',{exact:true}).waitFor();
  const missingOriginal=page.waitForResponse(response=>response.url().includes('/album/p.jpg')&&response.status()===404);
  await page.locator('[data-photo-action="next"]').click();
  assert.equal(await page.locator('.channel-photo-count').textContent(),'2 / 2');
  await page.waitForFunction(()=>document.querySelector('.channel-photo-image img').currentSrc.endsWith('.webp'));
  await missingOriginal;
  assert.equal(await page.locator('.channel-photo-status').textContent(),'','successful fallback shows the photo without a status message');
  await page.screenshot({path:`${output}/album-${width}.png`});
  await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('.channel-photo-count').textContent(),'1 / 2');
  if(width===1440){
    const dialog=page.getByRole('dialog',{name:'채널 사진 앨범'});
    for(const [key,count] of [['ArrowLeft','1 / 2'],['ArrowRight','2 / 2'],['ArrowRight','2 / 2'],['ArrowLeft','1 / 2']]){
      await page.keyboard.press(key);
      assert.equal(await dialog.locator('.channel-photo-count').textContent(),count);
      assert.equal(await dialog.evaluate(el=>getComputedStyle(el).outlineStyle),'none','arrow navigation must not outline the whole album');
    }
    await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(el=>{
      const button=document.activeElement;
      return el.contains(button)&&button.matches('button:focus-visible')&&getComputedStyle(button).outlineStyle!=='none';
    }),'Tab keeps a visible keyboard focus indicator on the active button');
  }
  if(width===390){
    const image=page.locator('.channel-photo-image');
    await image.dispatchEvent('pointerdown',{clientX:220,clientY:300});
    await image.dispatchEvent('pointerup',{clientX:80,clientY:300});
    assert.equal(await page.locator('.channel-photo-count').textContent(),'2 / 2');
    await page.keyboard.press('ArrowLeft');
  }
  await page.locator('[data-photo-action="save"]').click();
  await page.waitForFunction(()=>!state.postBulkSaving);await page.waitForTimeout(100);
  assert.equal(downloads.length,1);assert.equal(downloads[0].name,'260908_앨범 p1_001.svg');assert.ok(downloads[0].bytes.includes(Buffer.from('<svg')));
  const viewerNotice=page.locator('.channel-photo-dialog #saveResultModal.open #saveResultSummary');
  await viewerNotice.waitFor();
  assert.match(await viewerNotice.textContent(),/다운로드 요청 완료.*1장/);
  if(width===1440)await page.screenshot({path:`${output}/album-save-notice.png`});
  await page.locator('[data-photo-action="all"]').click();await page.waitForFunction(()=>!state.postBulkSaving);await page.waitForTimeout(100);
  assert.equal(downloads.length,3);assert.equal(downloads[2].name,'260908_앨범 p1_002.svg');
  assert.match(await viewerNotice.textContent(),/다운로드 요청 완료.*2장/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.channel-photo-dialog').count(),0);
  await page.evaluate(()=>{const post=channelVideoPage().posts[0];state.postSelected.add(downloadSelectionKey('channel-image',post));syncDownloadSelection();});
  await page.locator('[data-channel-photo-open="p1"]').click();await page.getByText('1 / 2',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>state.postSelected.size),1,'closing album must preserve selection');
  await page.locator('[data-channel-photo-open="p1"]').click();await page.getByText('1 / 2',{exact:true}).waitFor();
  await page.mouse.click(3,3);
  assert.equal(await page.locator('.channel-photo-dialog').count(),0,'outside click closes album');
  // Selection and bulk save use an image-only scope; video IDs cannot collide.
  await page.evaluate(()=>selectAllMedia());
  assert.equal(await page.evaluate(()=>downloadSelectionScope().kind),'channel-image');
  assert.equal(await page.evaluate(()=>downloadSelectionScope().items.filter(p=>state.postSelected.has(downloadSelectionKey('channel-image',p))).length),2);
  await page.evaluate(()=>saveSelectedPosts());await page.waitForFunction(()=>!state.postBulkSaving);await page.waitForTimeout(100);
  assert.equal(downloads.length,7);assert.match(await page.locator('body > #saveResultModal.open #saveResultSummary').textContent(),/다운로드 요청 완료.*4장/);
  assert.deepEqual(alerts,[],'single, album and selected photo downloads never show a browser alert');
  await page.locator('[data-channel-content-menu]').click();await page.locator('[data-morph-value="video"]').click();
  assert.equal(await page.locator('.channel-photo-card').count(),0);
  assert.ok(await page.locator('[data-channel-video-play="v"]').count());
  assert.equal(await page.evaluate(()=>downloadSelectionScope().items.filter(p=>state.postSelected.has(downloadSelectionKey('channel',p))).length),0);
  await page.locator('[data-channel-content-menu]').click();await page.locator('[data-morph-value="image"]').click();
  deny=true;await page.locator('[data-channel-photo-open="p1"]').click();
  await page.locator('[data-photo-action="retry"]:not([hidden])').waitFor();assert.equal(await page.locator('[data-photo-action="save"]').isDisabled(),true);
  deny=false;await page.locator('[data-photo-action="retry"]').click();await page.getByText('1 / 2',{exact:true}).waitFor();
  // Navigation invalidates a pending album and closes its modal.
  await page.evaluate(()=>setLiveCenterMode('replay'));await page.waitForFunction(()=>!document.querySelector('.channel-photo-dialog'));
  await page.evaluate(()=>setLiveCenterMode('channel'));
  delay=200;const switching=page.evaluate(()=>loadChannelVideos({refresh:true}));await page.waitForTimeout(30);
  await page.evaluate(()=>selectChannelMediaType('video'));await switching;
  assert.equal(await page.evaluate(()=>channelVideoState.mediaType),'video');
  assert.equal(await page.locator('.channel-photo-card').count(),0);
  if(width===1440)await checkArtistMedia(page);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await context.close();console.log('Channel photo albums passed',width);
 }}finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

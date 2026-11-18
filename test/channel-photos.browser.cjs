'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const output=process.env.CHANNEL_PHOTO_DIR||'/tmp/fromm-channel-photos';
const {chromium}=require('playwright'),fixture=require('./helpers/phase3-fixture.cjs');
const photo=(id)=>({id,type:'image',title:'앨범 '+id,thumbnail:'https://fixture.test/photo.svg',displayStartAt:1791500000000,num:1});
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
  await page.locator('[data-channel-media-type="image"]').click();
  await page.locator('[data-channel-photo-open="p2"]').waitFor();
  assert.equal(await page.locator('.channel-photo-card').count(),2);
  await page.waitForFunction(()=>[...document.querySelectorAll('.channel-photo-badge')].every(e=>e.textContent==='2장'));
  assert.equal(await page.locator('[data-channel-video-play]').count(),0);
  assert.ok(requests.includes('raw-tail')&&requests.includes('empty-photo-page'),'cursor follows unfiltered raw tail through photo-empty page');
  await page.screenshot({path:`${output}/list-${width}.png`});
  await page.locator('[data-channel-photo-open="p1"]').click();
  await page.getByText('1 / 2',{exact:true}).waitFor();
  await page.locator('[data-photo-action="next"]').click();
  assert.equal(await page.locator('.channel-photo-count').textContent(),'2 / 2');
  await page.waitForFunction(()=>document.querySelector('.channel-photo-image img').currentSrc.endsWith('.webp'));
  await page.getByText('원본 대신 제공된 사진을 표시합니다.',{exact:true}).waitFor();
  await page.screenshot({path:`${output}/album-${width}.png`});
  await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('.channel-photo-count').textContent(),'1 / 2');
  if(width===390){
    const image=page.locator('.channel-photo-image');
    await image.dispatchEvent('pointerdown',{clientX:220,clientY:300});
    await image.dispatchEvent('pointerup',{clientX:80,clientY:300});
    assert.equal(await page.locator('.channel-photo-count').textContent(),'2 / 2');
    await page.keyboard.press('ArrowLeft');
  }
  await page.locator('[data-photo-action="save"]').click();
  await page.waitForFunction(()=>!state.postBulkSaving);await page.waitForTimeout(100);
  assert.equal(downloads.length,1);assert.ok(downloads[0].name.endsWith('_001.svg'));assert.ok(downloads[0].bytes.includes(Buffer.from('<svg')));
  await page.locator('[data-photo-action="all"]').click();await page.waitForFunction(()=>!state.postBulkSaving);await page.waitForTimeout(100);
  assert.equal(downloads.length,3);assert.ok(downloads[2].name.endsWith('_002.svg'));
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
  assert.equal(downloads.length,7);assert.match(alerts.at(-1),/4장/);
  await page.locator('[data-channel-media-type="video"]').click();
  assert.equal(await page.locator('.channel-photo-card').count(),0);
  assert.ok(await page.locator('[data-channel-video-play="v"]').count());
  assert.equal(await page.evaluate(()=>downloadSelectionScope().items.filter(p=>state.postSelected.has(downloadSelectionKey('channel',p))).length),0);
  await page.locator('[data-channel-media-type="image"]').click();
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
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await context.close();console.log('Channel photo albums passed',width);
 }}finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
// Real browser WebCrypto, response streams, OPFS writers and browser downloads.
// Only provider replies, video bytes and the native picker gesture are fixtures.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto,createHash}=require('node:crypto'),{serve,open}=require('./helpers/phase3-fixture.cjs');
const hash=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
 const host=process.env.VIDEO_PUBLIC_URL?null:await serve(),url=process.env.VIDEO_PUBLIC_URL||host.url;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),...(process.env.VIDEO_PUBLIC_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
 const report=[],out=process.env.VIDEO_DOWNLOAD_DIR;
 try{
  const key=await webcrypto.subtle.importKey('raw',Buffer.alloc(16,7),'AES-CBC',false,['encrypt']);
  const plain=Array.from({length:128},(_,i)=>Buffer.alloc(4096,i)),encrypted=[];
  for(let i=0;i<plain.length;i++){const iv=new Uint8Array(16);new DataView(iv.buffer).setUint32(12,100+i);encrypted.push(Buffer.from(await webcrypto.subtle.encrypt({name:'AES-CBC',iv},key,plain[i])));}
  const expected=hash(Buffer.concat(plain));
  for(const cfg of [{width:1440},{width:780,installed:true},{width:390,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'}]){
   const {page,context,errors}=await open(browser,url,cfg);let release,gate=null,gateSeen=false,fail=false;const downloads=[],requests=[],alerts=[];
   page.on('dialog',d=>{alerts.push(d.message());return d.accept()});page.on('download',d=>downloads.push(d));
   await page.route('**/*',async route=>{
    let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
    if(u.hostname.endsWith('frommyarti.com')&&u.pathname.startsWith('/media/posts/')){
     const id=u.pathname.split('/').at(-1);return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{post:{id,type:id.startsWith('r')?'live_record':'video',isVisible:true,title:'영상',url:'https://download.fixture.test/master.m3u8?Policy=signed'}}})});
    }
    if(u.hostname!=='download.fixture.test')return route.fallback();
    requests.push(u.pathname);assert.equal(u.searchParams.get('Policy'),'signed');
    if(u.pathname==='/master.m3u8')return route.fulfill({body:'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100,RESOLUTION=320x180\nlow.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1920x1080\nhigh.m3u8'});
    if(u.pathname==='/high.m3u8')return route.fulfill({body:'#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:100\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n'+plain.map((_,i)=>`#EXTINF:4,\n${i}.ts`).join('\n')+'\n#EXT-X-ENDLIST'});
    if(u.pathname==='/key')return route.fulfill({body:Buffer.alloc(16,7)});
    const index=Number(u.pathname.match(/\/(\d+)\.ts$/)?.[1]);
    if(!Number.isInteger(index))throw Error('Unexpected rendition '+u.pathname);
    if(index===20&&gate){gateSeen=true;await gate;}
    await new Promise(r=>setTimeout(r,index%3*2));
    return route.fulfill({status:fail&&index===0?403:200,body:encrypted[index]});
   });
   await page.evaluate(()=>{
    window.testFiles=[];window.nativePicker=window.showSaveFilePicker;
    window.showSaveFilePicker=async options=>{
     const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('integration-output',{create:true});
     const handle=await dir.getFileHandle(options.suggestedName,{create:true});testFiles.push({handle,name:options.suggestedName});return handle;
    };
    const posts=kind=>[1,2].map(n=>({id:(kind==='replay'?'r':'v')+n,type:kind==='replay'?'live_record':'video',title:'영상 '+n,_channelId:'a',_channelName:'채널 A',displayStartAt:1791586800000+n*1000,thumbnail:{url:'https://fixture.test/photo.svg'}}));
    state.live.channels=[{id:'a',channelName:'채널 A'},{id:'b',channelName:'채널 B'}];state.live.channelsLoaded=true;
    channelVideoState.channelId='a';for(const id of ['a','b'])channelVideoState.pages.set(id,{loaded:true,isLast:true,posts:posts('channel').map(p=>({...p,_channelId:id}))});
    state.live.replayPosts=posts('replay');state.live.replayFilter='a';state.live.replayLoaded=true;
    window.testShow=kind=>{state.filter='live';state.live.centerMode=kind;channelVideoState.selected=null;state.live.replaySelected=null;syncLiveToolbarControls();render();};testShow('channel');
   });
   const card=kind=>page.locator(kind==='channel'?'[data-channel-video-download="v1"]':'[data-replay-download="r1"]');
   for(const kind of ['channel','replay']){
    await page.evaluate(k=>testShow(k),kind);gateSeen=false;gate=new Promise(r=>release=r);
    await card(kind).click();
    await page.waitForFunction(k=>{const b=document.querySelector(k==='channel'?'[data-channel-video-download="v1"]':'[data-replay-download="r1"]');return b?.dataset.downloadPhase==='active'&&Number(b.style.getPropertyValue('--download-remaining'))<100},kind).catch(async e=>{console.error({kind,errors,alerts,requests,phase:await card(kind).getAttribute('data-download-phase')});throw e});
    for(let n=0;!gateSeen&&n<1000;n++)await page.waitForTimeout(10);assert.ok(gateSeen,'slow segment reached');
    if(kind==='channel'){await page.locator('[data-channel-video-download="v2"]').click();await page.waitForFunction(()=>document.querySelector('[data-channel-video-download="v2"]')?.dataset.downloadPhase==='queued');}
    await page.evaluate(()=>{state.filter='image';render();});await page.evaluate(k=>testShow(k),kind);
    if(kind==='channel')assert.equal(await page.locator('[data-channel-video-download="v2"]').getAttribute('data-download-phase'),'queued');
    assert.equal(await card(kind).getAttribute('data-download-phase'),'active');assert.equal(await card(kind).isDisabled(),true);
    assert.ok(Number(await card(kind).evaluate(b=>b.style.getPropertyValue('--download-remaining')))<100,'restores actual progress after tab remount');
    if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`${cfg.width}-${kind}-restored.png`)});}
    release();gate=null;
    await page.waitForFunction(()=>!postDownloadRunning&&!channelVideoState.downloading&&!state.live.replayDownloading);
    assert.equal(await card(kind).getAttribute('data-download-phase'),'done');
    const file=await page.evaluate(async()=>{const item=testFiles.at(-1),f=await item.handle.getFile();return{name:item.name,bytes:Array.from(new Uint8Array(await f.arrayBuffer()))}});
    assert.equal(hash(Buffer.from(file.bytes)),expected);assert.ok(file.name.endsWith('.ts'));
   }
   // The shared engine also saves a selected channel list to a real directory,
   // preserves each filename and skips existing files before requesting detail.
   await page.evaluate(()=>{window.showDirectoryPicker=async()=>{const root=await navigator.storage.getDirectory();return root.getDirectoryHandle('integration-bulk',{create:true})};testShow('channel');const scope=downloadSelectionScope();for(const p of scope.items)state.postSelected.add(downloadSelectionKey(scope.kind,p));syncDownloadSelection()});
   await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>!state.postBulkSaving);
   const bulk=await page.evaluate(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('integration-bulk');const result=[];for await(const [name,h]of dir.entries())result.push({name,bytes:Array.from(new Uint8Array(await(await h.getFile()).arrayBuffer()))});return result});
   assert.equal(bulk.length,2);assert.equal(new Set(bulk.map(f=>f.name)).size,2);for(const f of bulk)assert.equal(hash(Buffer.from(f.bytes)),expected);
   const beforeSkip=requests.length;await page.evaluate(()=>{const scope=downloadSelectionScope();for(const p of scope.items)state.postSelected.add(downloadSelectionKey(scope.kind,p));syncDownloadSelection()});await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>!state.postBulkSaving);assert.equal(requests.length,beforeSkip);
   await page.evaluate(()=>testShow('replay'));
   // Real disk-backed browser handoff when the native picker is unavailable.
   await page.evaluate(()=>window.showSaveFilePicker=undefined);const before=downloads.length;
   await card('replay').click();await page.waitForFunction(()=>!postDownloadRunning);
   assert.equal(downloads.length,before+1);assert.equal(await card('replay').getAttribute('data-download-phase'),'handed-off');
   const filePath=await downloads.at(-1).path();assert.equal(hash(fs.readFileSync(filePath)),expected);
   assert.equal(await page.evaluate(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('fromm-video-downloads-v1');let n=0;for await(const [,h]of dir.entries())if((await h.getFile()).size>0)n++;return n>0}),true);
   // No-OPFS fallback still hands off exactly the same bytes.
   await page.evaluate(()=>prepareReplayDownloadStage=async()=>null);await page.waitForTimeout(1450);
   await card('replay').click();await page.waitForFunction(()=>!postDownloadRunning);assert.equal(hash(fs.readFileSync(await downloads.at(-1).path())),expected);
   // Permission failure is never retried or displayed as a completed file.
   fail=true;await page.evaluate(()=>{window.showSaveFilePicker=async options=>{const dir=await navigator.storage.getDirectory();return dir.getFileHandle('failure.ts',{create:true})};testShow('channel')});
   const count=requests.filter(p=>p==='/0.ts').length;await card('channel').click();await page.waitForFunction(()=>!postDownloadRunning);
   assert.equal(requests.filter(p=>p==='/0.ts').length,count+1);assert.equal(await card('channel').getAttribute('data-download-phase'),'error');fail=false;
   // Session switch cancels pending readers/writes; no stale completion UI.
   gateSeen=false;gate=new Promise(r=>release=r);await page.waitForTimeout(2250);await card('channel').click();
   for(let n=0;!gateSeen&&n<1000;n++)await page.waitForTimeout(10);assert.ok(gateSeen,'slow segment reached');
   await page.evaluate(()=>setActiveAuth('different-token','different-device','different-user'));
   await page.waitForFunction(()=>!postDownloadRunning);release();gate=null;
   assert.notEqual(await card('channel').getAttribute('data-download-phase'),'done');
   assert.equal(requests.includes('/low.m3u8'),false);assert.deepEqual(errors,[]);
   report.push({width:cfg.width,installed:!!cfg.installed,sha256:expected,segments:128,result:'PASS',coverage:['Replay/Channel real OPFS direct writes','highest AES rendition','progress and queue remount','real directory bulk and existing-file skip','staged and memory handoff','403 no retry','session abort']});
   console.log(`Video download ${cfg.width}${cfg.installed?' standalone':''}: PASS`);await context.close();
  }
  if(out)fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));
 }finally{await browser.close();await host?.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

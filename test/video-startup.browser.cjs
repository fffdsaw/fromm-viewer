'use strict';
// Synthetic media only. Actual Chromium presentation callbacks, not manifest-ready timing.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-startup-'));
const html=fs.readFileSync(process.env.STARTUP_HTML_PATH||path.join(root,'index.html'),'utf8');
const hlsPath=process.env.HLS_TEST_SCRIPT_PATH||'/tmp/fromm-hls/package/dist/hls.min.js';
const script=fs.existsSync(hlsPath)?fs.readFileSync(hlsPath):execFileSync('curl',['-fLsS','--max-time','40','https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js']);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rows=[],runs=Number(process.env.STARTUP_RUNS||3);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=1280x720:rate=12','-t','6','-an','-c:v','libx264','-preset','ultrafast','-crf','32','-threads','2','-pix_fmt','yuv420p','-g','12','-sc_threshold','0','-f','hls','-hls_time','1','-hls_playlist_type','vod','-hls_segment_filename',path.join(temp,'segment-%02d.ts'),path.join(temp,'index.m3u8')]);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180','-frames:v','1','-threads','1',path.join(temp,'thumb.jpg')]);
const leaf=fs.readFileSync(path.join(temp,'index.m3u8'));
const thumb=fs.readFileSync(path.join(temp,'thumb.jpg'));
const master=Buffer.from('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2200000,RESOLUTION=1280x720,CODECS="avc1.42c01f"\nhigh.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360\nlow.m3u8\n');
const post=(id,kind)=>({id,type:kind==='channel'?'video':'live_record',title:`Synthetic ${id}`,displayStartAt:1791534600000-Number(id)*1000,isVisible:true,thumbnail:{url:`https://media.test/thumb.jpg?id=${id}`}});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}])for(const profile of ['normal','slow'])for(const kind of ['replay','channel'])for(let run=1;run<=runs;run++){
   const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:viewport.width<700});
   const page=await context.newPage(),errors=[],requests=[];let thumbnailActive=0;const thumbnailQueue=[];
   const latency=profile==='slow'?240:90;
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.startupFrames=[];
    new MutationObserver(()=>{for(const video of document.querySelectorAll('#replayVideo,#channelVideo')){
     if(video.dataset.measured)continue;video.dataset.measured='true';video.muted=true;
     const record={created:performance.now(),first:null,waiting:0,lateWaiting:0};window.startupFrames.push(record);
     video.addEventListener('waiting',()=>{record.waiting++;if(record.first!==null)record.lateWaiting++;});
     video.requestVideoFrameCallback(()=>{record.first=performance.now();});
    }}).observe(document,{childList:true,subtree:true});
   });
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());let body,type='text/javascript',delay=0;
    if(url.hostname==='viewer.test'){
     body=url.pathname.endsWith('.js')?fs.readFileSync(path.join(root,path.basename(url.pathname))):html;
     type=url.pathname.endsWith('.js')?'text/javascript':'text/html';
    }else if(url.pathname.includes('hls.js@1.5.18')){body=script;delay=profile==='slow'?800:400;}
    else if(url.hostname==='channel-api.frommyarti.com'){
     type='application/json';delay=latency;
     const data=url.pathname==='/channels'?{channels:[{id:'a',channelName:'Synthetic',isSubscribed:true}]}:url.pathname==='/media/posts'?{posts:Array.from({length:60},(_,i)=>post(String(i+1),kind)),isLast:true}:url.pathname.startsWith('/media/posts/')?{post:{...post(url.pathname.split('/').at(-1),kind),url:'https://media.test/master.m3u8?CloudFront-Signature=synthetic&CloudFront-Key-Pair-Id=fixture'}}:{liveRooms:[]};
     body=JSON.stringify({success:true,data});
    }else if(url.hostname==='media.test'){
     if(url.pathname==='/thumb.jpg'){
      if(thumbnailActive>=4)await new Promise(resolve=>thumbnailQueue.push(resolve));thumbnailActive++;
      body=thumb;type='image/jpeg';delay=latency+50;
     }else if(url.pathname==='/master.m3u8'){body=master;type='application/vnd.apple.mpegurl';delay=latency;}
     else if(/high|low/.test(url.pathname)){assert.ok(!url.pathname.includes('low'),'default must never request low rendition');body=leaf;type='application/vnd.apple.mpegurl';delay=latency;}
     else if(url.pathname.endsWith('.ts')){body=fs.readFileSync(path.join(temp,path.basename(url.pathname)));type='video/mp2t';delay=latency+body.length/(profile==='slow'?600:3000);}
    }
    if(body===undefined)return route.abort();
    const record={path:url.pathname,bytes:Buffer.byteLength(body),at:Date.now(),end:null};requests.push(record);
    try{await wait(delay);await route.fulfill({body,contentType:type,headers:{'access-control-allow-origin':'*','timing-allow-origin':'*'}});record.end=Date.now();}
    catch{}finally{if(url.pathname==='/thumb.jpg'){thumbnailActive--;thumbnailQueue.shift()?.();}}
   });
   await page.goto('https://viewer.test/');
   await page.evaluate(()=>{setActiveAuth('synthetic','synthetic-device','synthetic-account');hideLoginGate();state.filter='live';renderLiveView();});
   const listStart=Date.now();await page.locator(`[data-live-center-mode="${kind}"]`).click();
   const cards=kind==='channel'?'[data-channel-video-card]':'[data-replay-post]';
   await page.locator(cards).first().waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('.replay-thumb img')].filter(img=>{const r=img.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).every(img=>img.complete&&img.naturalWidth>0));
   const listMs=Date.now()-listStart;
   const imageCount=requests.filter(r=>r.path==='/thumb.jpg').length;
   // Arm timing before the actual DOM click; include API, SDK, playlists and decode/presentation.
   const click=async()=>{
    const since=requests.length;
    await page.locator(kind==='channel'?'[data-channel-video-play]':'[data-replay-post] .replay-play').first().evaluate(button=>{window.startupClick=performance.now();window.startupFrames=[];button.click();});
    await page.waitForFunction(()=>window.startupFrames.at(-1)?.first!=null,null,{timeout:20000});
    const result=await page.evaluate(()=>({...window.startupFrames.at(-1),clickMs:window.startupFrames.at(-1).first-window.startupClick}));
    const media=requests.slice(since).filter(r=>r.path!=='/thumb.jpg');
    result.requests=media.length;result.requestedPayloadBytes=media.reduce((n,r)=>n+r.bytes,0);
    result.completedPayloadBytes=media.filter(r=>r.end!==null).reduce((n,r)=>n+r.bytes,0);
    result.playlistRequests=media.filter(r=>r.path.endsWith('.m3u8')).length;
    result.sdkRequests=media.filter(r=>r.path.includes('hls.min.js')).length;
    await wait(300);result.afterFrameWaiting=await page.evaluate(()=>window.startupFrames.at(-1).lateWaiting);
    return result;
   };
   const cold=await click();
   await page.locator(kind==='channel'?'#channelBackToList':'#replayBackToList').click();await page.locator(cards).first().waitFor();
   const warm=await click();
   if(!process.env.STARTUP_HTML_PATH){
    assert.equal(cold.playlistRequests,2,'one master and one highest media playlist');
    assert.equal(warm.playlistRequests,1,'reopen reuses only the master, media is freshly checked');
    assert.ok(imageCount<= (viewport.width<700?4:12),'outside-viewport thumbnail requests are bounded');
   }
   assert.equal(cold.afterFrameWaiting,0);assert.equal(warm.afterFrameWaiting,0);
   rows.push({viewport:`${viewport.width}x${viewport.height}`,profile,kind,run,listMs,thumbnailRequests:imageCount,thumbnailPayloadBytes:imageCount*thumb.length,cold,warm});
   assert.deepEqual(errors,[]);console.log(`PASS ${kind} ${viewport.width} ${profile} #${run}: first frame ${Math.round(cold.clickMs)}ms / reopen ${Math.round(warm.clickMs)}ms, thumbs ${imageCount}`);
   await context.close();
  }
 }finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
 if(process.env.STARTUP_RESULTS_PATH){fs.mkdirSync(path.dirname(process.env.STARTUP_RESULTS_PATH),{recursive:true});fs.writeFileSync(process.env.STARTUP_RESULTS_PATH,JSON.stringify(rows,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
// Real HTTP pages, synthetic data, and local video. Baseline and candidate use
// their own complete static assets; no CSS-only substitution or real account.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const root=path.resolve(__dirname,'..'),baseline='552bc556d8eaacbcc589cb9bfabab6383b9d4dba';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-phase3-visual-'));
const output=path.resolve(process.env.PHASE3_VISUAL_DIR||path.join(temp,'screenshots'));
fs.mkdirSync(output,{recursive:true});
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
async function capture(page,name){await page.waitForTimeout(260);await page.screenshot({path:path.join(output,name+'.png')});}
async function benchmark(browser,url,label){
 const rows=[];
 for(let run=0;run<3;run++){
  const start=performance.now(),{page,context,errors}=await open(browser,url);
  await page.waitForFunction(()=>document.querySelector('.msg'));
  const readyMs=performance.now()-start,cdp=await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  const before=await metrics();
  const frames=await page.evaluate(()=>new Promise(resolve=>{
   const times=[];let previous=performance.now(),i=0;
   function frame(now){times.push(now-previous);previous=now;scrollBy(0,12);if(++i<90)requestAnimationFrame(frame);else resolve(times.slice(3));}requestAnimationFrame(frame);
  }));
  const after=await metrics();
  await page.evaluate(()=>scrollTo(0,0));
  const menuStart=performance.now();await page.evaluate(()=>setSidebarOpen(true));await page.waitForTimeout(230);
  rows.push({readyMs:Math.round(readyMs),scrollFrameMedianMs:median(frames),scrollFrameP95Ms:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)],scrollTaskMs:(after.TaskDuration-before.TaskDuration)*1000,heapMB:after.JSHeapUsedSize/1048576,menuSettledMs:Math.round(performance.now()-menuStart)});
  assert.deepEqual(errors,[]);await context.close();
 }
 return {label,runs:rows,median:Object.fromEntries(Object.keys(rows[0]).map(k=>[k,Math.round(median(rows.map(r=>r[k]))*100)/100]))};
}
(async()=>{
 const beforeRoot=path.join(temp,'before');fs.mkdirSync(beforeRoot);
 const archive=execFileSync('git',['archive',baseline,'index.html','glowme.css','web-glowme.js','web-pwa.js','web-live-controls.js','web-live-pip.js','web-live-chat-probe.js','web-native-live.js','mobile-sync-test.js','sw.js','manifest.webmanifest','assets'],{cwd:root,maxBuffer:20*1024*1024});
 execFileSync('tar',['-x','-C',beforeRoot],{input:archive});
 const video=path.join(temp,'fixture.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=12','-t','3','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',video]);
 const before=await serve(beforeRoot),after=await serve(),browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const results={baseline,note:'Linux headless Chromium; synthetic local data, three serial runs. JS task/heap and rAF intervals are proxies, not physical GPU/CPU usage or authenticated server timing.',screens:[],performance:[]};
 try{
  for(const [label,server] of [['before',before],['after',after]]){
   for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390},{width:1440,height:900,installed:true}]){
    const {page,context,errors}=await open(browser,server.url,viewport),suffix=`${viewport.width}x${viewport.height}${viewport.installed?'-pwa':''}`;
    // The old shell updated its header only through this existing presentation hook.
    await page.evaluate(()=>{restoreArtistHeaderAfterLive();scrollTo(0,0);});
    await capture(page,`${label}-${suffix}-chat`);
    await page.evaluate(()=>setSidebarOpen(true));await capture(page,`${label}-${suffix}-menu`);
    await page.evaluate(()=>{setSidebarOpen(false);openChatToolsPanel();openDateCalendar();});await capture(page,`${label}-${suffix}-search`);
    if(viewport.width===844){
     await page.route('**/fixture.mp4',r=>r.fulfill({contentType:'video/mp4',body:fs.readFileSync(video)}));
     await page.route('**/media/posts/phase3-video',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{post:{id:'phase3-video',type:'video',title:'합성 Channel 영상',url:new URL('fixture.mp4',server.url).href}}})}));
     await page.route('**/media/posts?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{posts:[{id:'phase3-video',type:'video',title:'합성 Channel 영상',isVisible:true}],isLast:true}})}));
     await page.evaluate(url=>{closeChatToolsPanel();state.filter='live';state.live.centerMode='channel';channelVideoState.selected={id:'phase3-video',title:'합성 Channel 영상',_channelId:'fixture-channel',_streamUrl:url};renderLiveView();},new URL('fixture.mp4',server.url).href);
     await page.waitForFunction(()=>document.querySelector('#channelVideo')?.readyState>=2);
     await page.locator('#channelVideo').evaluate(async v=>{v.muted=true;await v.play();v.currentTime=1;v.pause();});
     await page.waitForTimeout(150);await capture(page,`${label}-${suffix}-channel`);
     if(label==='after'){
      const g=await page.evaluate(()=>{const v=document.querySelector('#channelVideo'),r=v.getBoundingClientRect();return {fit:getComputedStyle(v).objectFit,bottom:r.bottom,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.mvc-button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height];})};});
      assert.equal(g.fit,'contain');assert.equal(g.overflow,false);assert.ok(g.bottom<=viewport.height);assert.ok(g.buttons.every(([w,h])=>w>=44&&h>=44));results.screens.push({suffix,player:g});
     }
    }
    if(label==='after'){
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     const texture=await page.locator('.topbar').evaluate(el=>[getComputedStyle(el).backgroundImage,getComputedStyle(el,'::before').display]);
     assert.ok(!texture[0].includes('url('));assert.equal(texture[1],'none');
    }
    assert.deepEqual(errors,[]);await context.close();
   }
   results.performance.push(await benchmark(browser,server.url,label));
  }
  fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({screens:output,performance:results.performance.map(({label,median})=>({label,...median}))}));
 }finally{await browser.close();await before.close();await after.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

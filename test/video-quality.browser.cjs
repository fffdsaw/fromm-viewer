'use strict';
// Real hls.js 1.5.18 + MSE decoding of synthetic H264/AAC HLS. Service responses,
// signatures and all media are local fixtures, never real Fromm accounts/streams.
const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const output = process.env.QUALITY_SCREENSHOT_DIR || process.env.CHANNEL_SCREENSHOT_DIR;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fromm-quality-'));
const dimensions = {'land-1080':[1920,1080], 'land-720':[1280,720], 'land-360':[640,360], 'portrait-1080':[1080,1920], 'portrait-720':[720,1280], 'single-540':[960,540]};
const records = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixtures() {
  for (const [name,[width,height]] of Object.entries(dimensions)) {
    const dir = path.join(temp,name); fs.mkdirSync(dir);
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner','-loglevel','error','-f','lavfi','-i',`testsrc2=size=${width}x${height}:rate=8`,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','16','-c:v','libx264','-preset','ultrafast','-crf','32','-threads','2','-profile:v','baseline','-level:v','4.0','-pix_fmt','yuv420p','-g','16','-keyint_min','16','-sc_threshold','0','-c:a','aac','-b:a','48k','-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',path.join(dir,'segment-%03d.ts'),path.join(dir,'index.m3u8')]);
  }
}
function hlsScript() {
  const supplied = process.env.HLS_TEST_SCRIPT_PATH;
  if(supplied) return fs.readFileSync(supplied,'utf8');
  const installed = '/tmp/fromm-hls/package/dist/hls.min.js';
  if(fs.existsSync(installed)) return fs.readFileSync(installed,'utf8');
  for(const url of ['https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js','https://unpkg.com/hls.js@1.5.18/dist/hls.min.js']) {
    try {return execFileSync('curl',['--fail','--location','--silent','--show-error','--max-time','40',url],{encoding:'utf8',maxBuffer:2e6});} catch {}
  }
  throw new Error('Could not fetch the pinned test HLS engine; set HLS_TEST_SCRIPT_PATH to hls.js 1.5.18.');
}
function master(caseId) {
  const list = caseId==='portrait' ? ['portrait-720','portrait-1080'] : caseId==='single' ? ['single-540'] : caseId==='single720' ? ['land-720'] : ['land-360','land-1080','land-720'];
  return '#EXTM3U\n'+list.map(name=>{const [w,h]=dimensions[name];const bw=w*h>1500000?6000000:w*h>800000?3000000:850000;return `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${w}x${h},CODECS="avc1.42c028,mp4a.40.2"\n${name}/index.m3u8`;}).join('\n')+'\n';
}
const post = (id,type='live_record') => ({id,type,title:`${id} · 긴 제목과 실제 HLS 화질 선택 검증`,displayStartAt:1791534600000,isVisible:true});
(async()=>{
  fixtures(); const script=hlsScript();
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  try {
    const viewports=process.env.QUALITY_TEST_SMOKE==='1'?[{width:1440,height:900}]:[{width:1440,height:900},{width:1920,height:1080},{width:1366,height:768},{width:390,height:844},{width:844,height:390}];
    for(const viewport of viewports) {
      const mobile=viewport.width<700||viewport.height<500;
      const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage();page.setDefaultTimeout(20000);
      if(viewport.width===844)await page.addInitScript(()=>{Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value:undefined});});
      const errors=[],requests=[]; let delayLow=false,deny720=false,lowStarted=false,detailRevision=0,expireSignature="",holdDetail=false,holdMaster=false,holdLeaf=false;const detailWaiters=[],masterWaiters=[],leafWaiters=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        const serve=(body,contentType,status=200)=>route.fulfill({status,contentType,headers:{'access-control-allow-origin':'*'},body}).catch(()=>{});
        const json=data=>serve(JSON.stringify({success:true,data}),'application/json');
        if(url.hostname==='viewer.test') {
          if(url.pathname.endsWith('.js')) return serve(fs.readFileSync(path.join(root,path.basename(url.pathname))),'text/javascript');
          return serve(html,'text/html');
        }
        if(/(?:jsdelivr\.net|unpkg\.com)$/.test(url.hostname)&&url.pathname.includes('hls.js@1.5.18')) return serve(script,'text/javascript');
        if(url.hostname==='quality.test') {
          const caseId=url.searchParams.get('fixtureCase')||'multi';
          requests.push({path:url.pathname,caseId,signature:url.searchParams.get('Signature'),keyPair:url.searchParams.get('Key-Pair-Id')});
          if(url.pathname==='/master.m3u8'){if(holdMaster)await new Promise(resolve=>masterWaiters.push(resolve));return serve(master(caseId),'application/vnd.apple.mpegurl');}
          if(url.pathname.endsWith('/index.m3u8')) {
            if(holdLeaf)await new Promise(resolve=>leafWaiters.push(resolve));
            if(delayLow&&url.pathname.includes('land-360')) {lowStarted=true;await wait(450);}
            if(url.pathname.includes('land-720')&&((caseId==='denied'&&deny720)||(caseId==='expired'&&url.searchParams.get('Signature')===expireSignature))) return serve('Fixture signed playlist expired','text/plain',403);
            return serve(fs.readFileSync(path.join(temp,url.pathname.replace(/^\//,''))),'application/vnd.apple.mpegurl');
          }
          if(url.pathname.endsWith('.ts')) return serve(fs.readFileSync(path.join(temp,url.pathname.replace(/^\//,''))),'video/mp2t');
          return route.abort();
        }
        if(url.hostname.endsWith('frommyarti.com')) {
          if(url.pathname==='/channels') return json({channels:[{id:'a',channelName:'Quality fixture',isSubscribed:true}]});
          if(url.pathname==='/media/posts') return json({posts:[...['multi','portrait','single','single720','race','expired','denied','fatal'].map(id=>post(id)),post('channel','video')],isLast:true});
          if(url.pathname.startsWith('/media/posts/')) {
            const id=url.pathname.split('/').at(-1);detailRevision++;if(holdDetail)await new Promise(resolve=>detailWaiters.push(resolve));
            return json({post:{...post(id,id==='channel'?'video':'live_record'),url:`https://quality.test/master.m3u8?CloudFront-Signature=fixture-${detailRevision}&CloudFront-Key-Pair-Id=fixture&fixtureCase=${id==='channel'?'multi':id}&revision=${detailRevision}`}});
          }
          return json({liveRooms:[]});
        }
        return route.abort();
      });
      await require('./helpers/shell-assets.cjs')(page); await page.goto('https://viewer.test/index.html');
      await page.evaluate(()=>{setActiveAuth('synthetic-session','synthetic-device','synthetic-account');hideLoginGate();state.filter='live';renderLiveView();});
      await page.locator('[data-live-center-mode="replay"]').click();
      const select=kind=>page.locator(`#${kind}QualitySelect`);
      const video=kind=>page.locator(kind==='replay'?'#replayVideo':'#channelVideo');
      const ready=async(kind,size)=>{
        await page.waitForFunction(({kind,size})=>{const v=document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo');return v&&v.readyState>=2&&v.videoWidth===size[0]&&v.videoHeight===size[1];},{kind,size},{timeout:25000});
        await video(kind).evaluate(async v=>{v.muted=true;await v.play();});
        await page.waitForFunction(kind=>document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo').currentTime>.05,kind);
      };
      const choose=async(kind,label,options={})=>{
        await video(kind).hover({force:true});
        const chosen=await select(kind).locator('option').evaluateAll((items,label)=>items.find(x=>x.textContent.trim().startsWith(label))?.value,label);
        assert.notEqual(chosen,undefined,`${kind}: advertised ${label} option exists`);
        if(options.force)await select(kind).selectOption(chosen,options);
        else {
          const settings=page.locator('.mvc-settings');
          if(!await settings.evaluate(el=>el.open))await settings.locator('summary').click();
          await settings.locator(`.mvc-quality-option[data-quality="${chosen}"]`).click();
        }
        return chosen;
      };
      const fixed=async(kind,expectedLabels=null)=>{
        const snapshot=await page.evaluate(kind=>{const h=kind==='replay'?state.live.replayHls:channelVideoState.hls;return {version:window.Hls.version,levels:h?.levels?.length,auto:h?.autoLevelEnabled,level:h?.loadLevel};},kind);
        assert.equal(snapshot.version,'1.5.18');assert.equal(snapshot.levels,1,'the engine receives one rendition only');assert.equal(snapshot.auto,false,'ABR is disabled');assert.equal(snapshot.level,0,'engine stays manually pinned to its only rendition');
        const labels=await select(kind).locator('option').allTextContents();if(expectedLabels)assert.deepEqual(labels.map(x=>x.split(' · ')[0]),expectedLabels,'UI lists exactly the actual master variants');assert.ok(labels.every(x=>!/(?:자동|\bauto\b)/i.test(x)),'no misleading Auto choice');
      };
      const spinnerFits=async kind=>{
        const loader=page.locator('.video-loading');await loader.waitFor({state:'visible'});assert.equal(await loader.count(),1);
        const geometry=await loader.evaluate(el=>{const a=el.querySelector('svg').getBoundingClientRect(),b=el.parentElement.getBoundingClientRect(),css=getComputedStyle(el.querySelector('svg'));return {x:a.x+a.width/2,y:a.y+a.height/2,w:parseFloat(css.width),h:parseFloat(css.height),cx:b.x+b.width/2,cy:b.y+b.height/2,animation:css.animationName};});
        assert.ok(Math.abs(geometry.w-geometry.h)<.5,'the loader stays circular');assert.ok(geometry.w>=31&&geometry.w<=49,'loader size is restrained on desktop and mobile');
        assert.ok(Math.abs(geometry.x-geometry.cx)<1&&Math.abs(geometry.y-geometry.cy)<1,'loader is centered independently of controls/video rotation');
        assert.equal(geometry.animation,'video-loading-spin');
        const before=await loader.locator('svg').evaluate(el=>getComputedStyle(el).transform);await wait(110);assert.notEqual(await loader.locator('svg').evaluate(el=>getComputedStyle(el).transform),before,'the circular arc actually animates');
        assert.equal(await page.locator(`#${kind}QualityStatus`).count()?await page.locator(`#${kind}QualityStatus`).textContent():'','','routine loading does not print a bottom-left message');
      };
      const buffering=async kind=>{
        const v=video(kind);await page.locator('.video-loading').waitFor({state:'hidden'});
        await v.evaluate(v=>v.dispatchEvent(new Event('waiting')));await spinnerFits(kind);
        if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`loading-${kind}-${viewport.width}x${viewport.height}.png`)});}
        if(viewport.width===1440){await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.video-loading-ring').evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});}
        await v.evaluate(v=>v.pause());await page.locator('.video-loading').waitFor({state:'hidden'});
        await v.evaluate(v=>{v.dispatchEvent(new Event('playing'));v.dispatchEvent(new Event('waiting'));v.dispatchEvent(new Event('playing'));});await wait(180);assert.equal(await page.locator('.video-loading').isVisible(),false,'short buffer gaps cannot flash the spinner');
        await v.evaluate(v=>v.play());
        if(viewport.width===1440&&kind==='replay'){
          await v.evaluate(v=>{v.currentTime=v.duration-.1;});await page.waitForFunction(id=>document.getElementById(id).ended,'replayVideo');
          assert.equal(await page.locator('.video-loading').isVisible(),false,'actual playback end leaves no spinner');
          await v.evaluate(v=>{v.currentTime=0;return v.play();});
        }
      };
      const modernControls=async kind=>{
        const v=video(kind),bar=page.locator('.modern-video-controls');const portrait=await v.evaluate(v=>v.videoWidth<v.videoHeight);
        await v.hover();await buffering(kind);
        assert.equal(await page.locator('.replay-page-head .video-quality-control').count(),0,'quality is outside the title header');
        assert.equal(await bar.locator('.mvc-settings .mvc-quality-options').count(),1,'quality lives inside the settings menu');
        assert.equal(await select(kind).isVisible(),false,'the old bottom dropdown is hidden');
        assert.equal(await bar.locator('.mvc-right > .mvc-pip svg').count(),1,'PiP has an independent bottom-bar icon');
        assert.equal(await bar.locator('.mvc-popover .mvc-pip').count(),0,'PiP is outside settings');
        assert.equal(await bar.locator('.mvc-pip').textContent(),'');
        assert.ok(!(await bar.locator('.mvc-popover').textContent()).includes('자막'));
        await v.evaluate(v=>v.pause());await v.hover();
        await bar.locator('[data-mvc="play"]').click();await page.waitForFunction(id=>!document.getElementById(id).paused,kind==='replay'?'replayVideo':'channelVideo');
        await bar.locator('[data-mvc="play"]').click();assert.equal(await v.evaluate(v=>v.paused),true);
        await bar.locator('.mvc-seek').evaluate(el=>{el.value='4';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
        await page.waitForFunction(id=>Math.abs(document.getElementById(id).currentTime-4)<.5,kind==='replay'?'replayVideo':'channelVideo');
        const muted=await v.evaluate(v=>v.muted);await bar.locator('[data-mvc="sound"]').click();assert.equal(await v.evaluate(v=>v.muted),!muted);
        await bar.locator('summary').click();
        const rotationFits=async angle=>{
          await page.waitForFunction(({id,angle})=>Math.round(parseFloat(document.querySelector(id).closest('.modern-video-stage').style.getPropertyValue('--mvc-video-angle'))||0)===angle,{id:kind==='replay'?'#replayVideo':'#channelVideo',angle});
          await page.waitForTimeout(70);
          const g=await v.evaluate(v=>{const r=v.getBoundingClientRect(),s=v.closest('.modern-video-stage').getBoundingClientRect();return {r:{x:r.x,y:r.y,w:r.width,h:r.height},s:{x:s.x,y:s.y,w:s.width,h:s.height},fit:getComputedStyle(v).objectFit};});
          assert.equal(g.fit,'contain');assert.ok(g.r.x>=g.s.x-1&&g.r.y>=g.s.y-1&&g.r.x+g.r.w<=g.s.x+g.s.w+1&&g.r.y+g.r.h<=g.s.y+g.s.h+1,`rotation ${angle} stays completely inside the stage`);
        };
        await bar.locator('[data-mvc="right"]').click();await rotationFits(90);
        await bar.locator('[data-mvc="right"]').click();await rotationFits(180);
        await bar.locator('[data-mvc="left"]').click();await rotationFits(90);
        await bar.locator('[data-mvc="left"]').click();await rotationFits(0);
        await bar.locator('[data-mvc="left"]').click();await rotationFits(270);
        await bar.locator('[data-mvc="right"]').click();await rotationFits(0);
        await bar.locator('[data-mvc="right"]').click();await rotationFits(90);
        if(viewport.width===390){
          await page.setViewportSize({width:844,height:390});await rotationFits(90);await bar.locator('[data-mvc="right"]').click();await rotationFits(180);await bar.locator('[data-mvc="left"]').click();await rotationFits(90);
          await page.setViewportSize(viewport);await rotationFits(90);
        }
        const colors=await bar.locator('.mvc-rotation-title').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el.closest('.mvc-popover')).backgroundColor}));
        const luminance=color=>{const values=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
        assert.ok((luminance(colors.fg)+.05)/(luminance(colors.bg)+.05)>=4.5,'rotation label/icons remain readable in native Popover and fallback');
        const popup=await bar.locator('.mvc-popover').boundingBox();const size=page.viewportSize();
        assert.ok(popup.x>=10&&popup.y>=10&&popup.x+popup.width<=size.width-10&&popup.y+popup.height<=size.height-10,'settings fits the viewport');
        if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`settings-${kind}-${viewport.width}x${viewport.height}-rotated.png`)});}
        await bar.locator('.mvc-rate').selectOption('1.5');assert.equal(await v.evaluate(v=>v.playbackRate),1.5);
        const volumeControl=viewport.width<=600?bar.locator('.mvc-volume-extra'):bar.locator('.mvc-volume');await volumeControl.evaluate(el=>{el.value='.35';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.ok(Math.abs((await v.evaluate(v=>v.volume))-.35)<.01);await bar.locator('summary').click();
        await bar.locator('[data-mvc="full"]').click();await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('modern-video-stage'));
        await rotationFits(90);await bar.locator('summary').click();
        await bar.locator('.mvc-quality-options').waitFor({state:'visible'});assert.equal(await bar.locator('.mvc-quality-options').isVisible(),true,'quality is accessible inside container fullscreen');
        if(viewport.width===1440)holdLeaf=true;
        try{
        if(viewport.width===1440){
          await bar.locator('.mvc-quality-option[aria-checked="true"]').focus();await page.keyboard.press('ArrowDown');
          assert.equal(await bar.locator('details').evaluate(el=>el.open),true,'arrow-key quality selection keeps the menu open');
        }else await choose(kind,'720p');
        if(viewport.width===1440)await spinnerFits(kind);
        }finally{holdLeaf=false;for(const release of leafWaiters.splice(0))release();}
        await page.waitForFunction(({id,width})=>document.getElementById(id).videoWidth===width,{id:kind==='replay'?'replayVideo':'channelVideo',width:portrait?720:1280});
        await page.locator('.video-loading').waitFor({state:'hidden'});
        assert.equal(await page.evaluate(()=>document.fullscreenElement?.classList.contains('modern-video-stage')),true,'quality switch retains container fullscreen');await rotationFits(90);
        await choose(kind,'1080p');await page.waitForFunction(({id,width})=>document.getElementById(id).videoWidth===width,{id:kind==='replay'?'replayVideo':'channelVideo',width:portrait?1080:1920});
        await bar.locator('summary').click();await bar.locator('[data-mvc="left"]').click();await rotationFits(0);
        await page.keyboard.press('Escape');assert.equal(await bar.locator('details').evaluate(el=>el.open),false,'Escape closes settings without leaving fullscreen');
        assert.ok(await page.evaluate(()=>!!document.fullscreenElement));
        await bar.locator('[data-mvc="full"]').click();await page.waitForFunction(()=>!document.fullscreenElement);
        await bar.locator('summary').click();await page.mouse.click(1,1);
        assert.equal(await bar.locator('details').evaluate(el=>el.open),false,'clicking outside closes settings');
        if(viewport.width===1440&&await bar.locator('.mvc-pip').isVisible()){
          await v.evaluate(v=>{
            const doc=v.ownerDocument,originalRequest=Object.getOwnPropertyDescriptor(v,'requestPictureInPicture'),originalElement=Object.getOwnPropertyDescriptor(doc,'pictureInPictureElement'),originalExit=Object.getOwnPropertyDescriptor(doc,'exitPictureInPicture');
            let active=false;window.pipRouting={enters:0,exits:0};
            Object.defineProperty(doc,'pictureInPictureElement',{configurable:true,get:()=>active?v:null});
            Object.defineProperty(v,'requestPictureInPicture',{configurable:true,value:async()=>{window.pipRouting.enters++;active=true;v.dispatchEvent(new Event('enterpictureinpicture'));}});
            Object.defineProperty(doc,'exitPictureInPicture',{configurable:true,value:async()=>{window.pipRouting.exits++;active=false;v.dispatchEvent(new Event('leavepictureinpicture'));}});
            window.restorePipRouting=()=>{for(const [obj,key,descriptor] of [[v,'requestPictureInPicture',originalRequest],[doc,'pictureInPictureElement',originalElement],[doc,'exitPictureInPicture',originalExit]]){if(descriptor)Object.defineProperty(obj,key,descriptor);else delete obj[key];}};
          });
          await bar.locator('.mvc-pip').click();assert.equal(await bar.locator('.mvc-pip').getAttribute('aria-pressed'),'true');
          await bar.locator('.mvc-pip').click();assert.equal(await bar.locator('.mvc-pip').getAttribute('aria-pressed'),'false');
          assert.deepEqual(await page.evaluate(()=>window.pipRouting),{enters:1,exits:1});await page.evaluate(()=>window.restorePipRouting());
        }
        await v.evaluate(v=>v.closest('.modern-video-stage').focus());await page.keyboard.press('ArrowLeft');
        assert.ok((await v.evaluate(v=>v.currentTime))<1,'keyboard seek works');
        await v.evaluate(v=>{v.currentTime=0;v.muted=true;v.volume=1;v.playbackRate=1;return v.play();});
        if(viewport.width===1440){
          await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
          await page.waitForFunction(()=>document.querySelector('.modern-video-controls').classList.contains('mvc-hidden'),null,{timeout:6000});
          await v.hover();assert.equal(await bar.isVisible(),true);await v.evaluate(v=>v.pause());await page.waitForTimeout(3300);
          assert.equal(await bar.evaluate(el=>el.classList.contains('mvc-hidden')),false,'paused controls stay visible');
          await v.evaluate(v=>{v.currentTime=0;return v.play();});
        }
      };
      const layout=async(kind,label)=>{
        const g=await video(kind).evaluate(v=>{const r=v.getBoundingClientRect(),head=v.closest('.replay-player-page,.channel-player').querySelector('.replay-page-head').getBoundingClientRect();return {w:r.width,h:r.height,top:r.top,bottom:r.bottom,headBottom:head.bottom,objectFit:getComputedStyle(v).objectFit,controls:v.controls,viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};});
        assert.equal(g.objectFit,'contain');assert.equal(g.controls,false);assert.equal(await page.locator(".modern-video-controls").count(),1);assert.ok(g.h>=60);assert.ok(g.top>=g.headBottom-1);assert.ok(g.bottom<=viewport.height-8);assert.ok(g.scroll[0]<=viewport.width+1&&g.scroll[1]<=viewport.height+1);
        if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`quality-${kind}-${viewport.width}x${viewport.height}-${label}.png`)});}
      };
      const openReplay=async id=>{
        if(await page.locator('#replayBackToList').count()) await page.locator('#replayBackToList').click();
        await page.locator(`[data-replay-post="${id}"] .replay-play`).click();
      };
      const stateSwitch=async(kind,label,size,{playing=false,muted=true}={})=>{
        await video(kind).evaluate(async(v,{playing,muted})=>{v.volume=.37;v.muted=muted;v.playbackRate=1.25;v.currentTime=2.5;if(playing)await v.play();else v.pause();window.qualityNode=v;},{playing,muted});
        await page.waitForFunction(kind=>{const v=document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo');return Math.abs(v.currentTime-2.5)<.3;},kind);
        const before=await video(kind).evaluate(v=>v.currentTime);
        await choose(kind,label);
        await page.waitForFunction(({kind,size,playing,before})=>{const v=document.querySelector(kind==='replay'?'#replayVideo':'#channelVideo');return v===window.qualityNode&&v.videoWidth===size[0]&&v.videoHeight===size[1]&&v.readyState>=2&&v.paused===!playing&&v.currentTime>=before-.35;},{kind,size,playing,before});
        const saved=await video(kind).evaluate(v=>({time:v.currentTime,volume:v.volume,muted:v.muted,rate:v.playbackRate,paused:v.paused}));
        assert.equal(saved.volume,.37);assert.equal(saved.muted,muted);assert.equal(saved.rate,1.25);assert.equal(saved.paused,!playing);
        if(!playing)assert.ok(Math.abs(saved.time-2.5)<.35,'paused playhead preserved');
        await fixed(kind);
      };
      const downloadHighest=async(kind,expectedFolder='land-1080')=>{
        await video(kind).evaluate(v=>v.pause());
        await page.evaluate(kind=>(kind==='replay'?state.live.replayHls:channelVideoState.hls).stopLoad(),kind);
        const start=requests.length;
        const bytes=await page.evaluate(async kind=>{const selected=kind==='replay'?state.live.replaySelected:channelVideoState.selected;let total=0;const sink={writable:{write:async value=>{total+=value.byteLength;},close:async()=>{}}};await downloadReplayStream(selected._streamUrl,sink);return total;},kind);
        const parts=requests.slice(start).filter(x=>x.path.endsWith('.ts'));
        assert.ok(bytes>100000&&parts.length>0,'real TS download produces bytes');assert.ok(parts.every(x=>x.path.startsWith(`/${expectedFolder}/`)),'download always selects actual highest, independently of playback');
        const expectedBytes=fs.readdirSync(path.join(temp,expectedFolder)).filter(x=>x.endsWith('.ts')).reduce((n,x)=>n+fs.statSync(path.join(temp,expectedFolder,x)).size,0);
        assert.equal(bytes,expectedBytes,'downloaded TS bytes exactly match the highest available fixture');
        await page.evaluate(kind=>(kind==='replay'?state.live.replayHls:channelVideoState.hls).startLoad(),kind);
        return bytes;
      };
      holdDetail=true;holdMaster=true;
      try{
        await openReplay('multi');await spinnerFits('replay');if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`loading-initial-${viewport.width}x${viewport.height}.png`)});}
        holdDetail=false;for(const release of detailWaiters.splice(0))release();
        await video('replay').waitFor({state:'attached'});await spinnerFits('replay');
      }finally{holdDetail=false;holdMaster=false;for(const release of [...detailWaiters.splice(0),...masterWaiters.splice(0)])release();}
      await ready('replay',dimensions['land-1080']);await fixed('replay',['1080p','720p','360p']);await modernControls('replay');await layout('replay','landscape-highest');
      await stateSwitch('replay','720p',dimensions['land-720'],{muted:false});
      if(viewport.width===1440){
        await stateSwitch('replay','1080p',dimensions['land-1080'],{playing:true});
        delayLow=true;lowStarted=false;await choose('replay','360p');
        for(let i=0;!lowStarted&&i<100;i++)await wait(10);assert.ok(lowStarted,'slow rendition fetch began');
        await choose('replay','720p');await choose('replay','1080p');delayLow=false;
        await ready('replay',dimensions['land-1080']);await wait(550);assert.equal(await video('replay').evaluate(v=>v.videoWidth),1920,'late low response ignored');
        await video('replay').evaluate(v=>v.dispatchEvent(new Event('waiting')));await wait(200);await fixed('replay');assert.equal(await video('replay').evaluate(v=>v.videoWidth),1920);
        await stateSwitch('replay','360p',dimensions['land-360']);await downloadHighest('replay');
        const audio=await video('replay').evaluate(v=>{const s=v.captureStream?.();if(!s)return null;const n=s.getAudioTracks().length;s.getTracks().forEach(t=>t.stop());return n;});assert.equal(audio,1,'actual muxed AAC audio track is decoded');
        const support=await page.evaluate(()=>document.fullscreenEnabled);
        if(support){
          const fsBefore=await video('replay').evaluate(v=>({time:v.currentTime,paused:v.paused,volume:v.volume,muted:v.muted,rate:v.playbackRate}));
          await page.evaluate(()=>{const b=document.createElement('button');b.id='qualityFixtureFullscreen';b.textContent='Fixture fullscreen';b.style.cssText='position:fixed;top:1px;left:1px;z-index:99999';b.onclick=()=>document.querySelector('#replayVideo').requestFullscreen();document.body.appendChild(b);});
          await page.locator('#qualityFixtureFullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('#replayVideo'));
          await choose('replay','720p',{force:true});await page.waitForFunction(()=>document.querySelector('#replayVideo').videoWidth===1280);assert.equal(await page.evaluate(()=>document.fullscreenElement===document.querySelector('#replayVideo')),true,'same native fullscreen element retained');const fsAfter=await video('replay').evaluate(v=>({time:v.currentTime,paused:v.paused,volume:v.volume,muted:v.muted,rate:v.playbackRate}));assert.ok(Math.abs(fsAfter.time-fsBefore.time)<.35);assert.deepEqual({...fsAfter,time:0},{...fsBefore,time:0},'native fullscreen quality change preserves playback settings');await page.evaluate(()=>document.exitFullscreen());await page.locator('#qualityFixtureFullscreen').evaluate(el=>el.remove());
        }
        records.push({viewport,fullscreen:support?'container fullscreen keeps quality visible; native video API retention also tested':'unavailable'});
        for(const [id,size] of [['single',dimensions['single-540']],['single720',dimensions['land-720']]]){
          await openReplay(id);await ready('replay',size);
          if(await select('replay').count()){assert.ok(await select('replay').isDisabled()||!await select('replay').isVisible(),'single quality cannot suggest alternatives');assert.equal(await select('replay').locator('option').count(),1);}
          if(id==='single') records.push({viewport,single540DownloadBytes:await downloadHighest('replay','single-540'),highestAvailable:'540p'});
        }
        await openReplay('expired');await ready('replay',dimensions['land-1080']);
        const expiredDetail=detailRevision,expiredStart=requests.length;expireSignature=`fixture-${detailRevision}`;
        await stateSwitch('replay','720p',dimensions['land-720']);
        assert.equal(detailRevision,expiredDetail+1,'expired selection refreshes authorized detail once');
        const renewedParts=requests.slice(expiredStart).filter(x=>x.caseId==='expired'&&x.path.startsWith('/land-720/')&&x.path.endsWith('.ts'));
        assert.ok(renewedParts.length>0&&renewedParts.every(x=>x.signature===`fixture-${detailRevision}`),'fresh signature reaches selected real media segments');expireSignature='';
        await openReplay('denied');await ready('replay',dimensions['land-1080']);deny720=true;
        const deniedDetail=detailRevision;await choose('replay','720p');
        await page.waitForFunction(()=>/기존 화질/.test(document.querySelector('#replayQualityStatus')?.textContent||''));
        assert.equal(detailRevision,deniedDetail+1,'persistent403 cannot refresh forever');
        assert.equal(await video('replay').evaluate(v=>v.videoWidth),1920,'failed selection retains old actual rendition');
        assert.ok((await select('replay').locator('option:checked').textContent()).startsWith('1080p'),'failed selection rolls UI back');assert.equal(await page.locator('.video-loading').isVisible(),false,'failed quality preparation stops the spinner');
        deny720=false;const retryStart=requests.length;await stateSwitch('replay','720p',dimensions['land-720']);
        const retryManifest=requests.slice(retryStart).find(x=>x.caseId==='denied'&&x.path.includes('land-720/index.m3u8'));
        assert.equal(retryManifest?.signature,`fixture-${detailRevision}`,'explicit retry retains refreshed catalog, not expired signed URLs');
        // Bounded fault injection into the real engine: transport fixtures above
        // exercise actual HTTP403; here exhaust the UI's fatal-recovery path.
        await openReplay('fatal');await ready('replay',dimensions['land-1080']);
        await video('replay').evaluate(v=>{window.qualityFatalNode=v;const h=state.live.replayHls;for(let i=0;i<2;i++)h.trigger(Hls.Events.ERROR,{fatal:true,type:Hls.ErrorTypes.NETWORK_ERROR,details:Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,error:new Error('synthetic engine network fault')});});
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(()=>document.querySelector('#replayVideo')===window.qualityFatalNode),true,'fatal initial highest stream keeps manual quality controls');
        assert.equal(await select('replay').isEnabled(),true);await fixed('replay');
        assert.ok((await select('replay').locator('option:checked').textContent()).startsWith('1080p'),'fatal fault never chooses a lower rendition');assert.equal(await page.locator('.video-loading').isVisible(),false,'terminal HLS failure cannot leave an endless spinner');
        await stateSwitch('replay','720p',dimensions['land-720']);
        await openReplay('fatal');await ready('replay',dimensions['land-1080']);
        await video('replay').evaluate(v=>{window.qualityFatalNode=v;v.dispatchEvent(new Event('error'));});
        assert.equal(await page.evaluate(()=>document.querySelector('#replayVideo')===window.qualityFatalNode),true,'native error event keeps same selectable player');
        await stateSwitch('replay','360p',dimensions['land-360']);
        await openReplay('race');await ready('replay',dimensions['land-1080']);delayLow=true;lowStarted=false;await choose('replay','360p');
        for(let i=0;!lowStarted&&i<100;i++)await wait(10);assert.ok(lowStarted);await openReplay('portrait');delayLow=false;await ready('replay',dimensions['portrait-1080']);await wait(550);assert.equal(await video('replay').evaluate(v=>v.videoHeight),1920,'new-video highest selection survives stale response');
      }
      await openReplay('portrait');await ready('replay',dimensions['portrait-1080']);assert.equal(await video('replay').evaluate(v=>v.closest('.modern-video-stage').classList.contains('mvc-rotated')),false,'new video resets rotation');await fixed('replay',['1080p','720p']);await modernControls('replay');await layout('replay','portrait-highest');await stateSwitch('replay','720p',dimensions['portrait-720']);
      await page.locator('#replayBackToList').click();await page.locator('[data-live-center-mode="channel"]').click();await page.locator('[data-channel-video-play="channel"]').click();
      await ready('channel',dimensions['land-1080']);await fixed('channel',['1080p','720p','360p']);await modernControls('channel');await layout('channel','landscape-highest');await stateSwitch('channel','360p',dimensions['land-360']);
      if(viewport.width===1440)await downloadHighest('channel');
      assert.ok(requests.filter(x=>x.path.endsWith('.ts')).every(x=>/^fixture-\d+$/.test(x.signature)&&x.keyPair==='fixture'),'signature propagation to actual segments retained');
      assert.deepEqual(errors,[]);
      records.push({viewport,replay:'single/multiple actual HLS as applicable, highest default, manual state/races',channel:'highest default/manual state',audio:'synthetic AAC',realFromm:false});
      console.log(`${viewport.width}x${viewport.height}: real HLS highest/manual portrait+landscape, state retention, settings/rotation/PiP icon and fixed single-level engine PASS`);
      await context.close();
    }
    if(output)fs.writeFileSync(path.join(output,'video-quality-report.json'),JSON.stringify({records,realFromm:false,notes:['API responses/signatures and H264/AAC media are synthetic. Real hls.js MSE decoding is exercised.','Native video fullscreen hides external header; forced selection tests retention only.','Fatal engine/native-error events are injected; actual HTTP403 and MSE H264/AAC decode use real fixtures.','Physical audio, Safari/iOS native HLS and real Fromm authorization/expiry remain unverified.']},null,2));
  } finally {await browser.close();if(process.env.QUALITY_KEEP_FIXTURES!=='1')fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

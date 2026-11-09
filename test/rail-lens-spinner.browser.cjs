'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.RAIL_LENS_DIR;
async function shot(p,name,clip){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png'),...(clip?{clip}:{})});}}
async function cursorLens(p,label){
 await p.waitForFunction(()=>FrommControlGlass?.snapshot.live>=2);
 await p.locator('#sidebar').hover({position:{x:20,y:20}});await p.waitForTimeout(300);
 const artist=await p.locator('.room.active').evaluate(e=>({shadow:getComputedStyle(e).boxShadow,color:getComputedStyle(e).backgroundColor,border:getComputedStyle(e.querySelector('.rail-avatar')).outline}));
 await p.locator('[data-glow-nav="sound"]').hover();
 await p.waitForFunction(()=>{const face=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return document.getElementById(id)?.querySelector('feImage[result="specMap"]');});
 await p.waitForTimeout(320);
 const carrier=p.locator('.rail-pointer-light'),clip=await carrier.boundingBox();
 const id=await p.locator('.rail-lens-surface').evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]);
 const map=p.locator(`#${id} feDisplacementMap`),scale=await map.getAttribute('scale');assert.ok(Number(scale)>0);
 // A settled cursor now has a clear centre rather than warping the menu label.
 const text=await p.locator('[data-glow-nav="sound"] span').boundingBox(),centre={x:text.x,y:text.y,width:text.width,height:text.height};
 const optical=await p.screenshot({clip:centre});await shot(p,label+'-lens',clip);
 await map.evaluate(e=>e.setAttribute('scale','0'));await p.waitForTimeout(80);
 assert.equal(optical.equals(await p.screenshot({clip:centre})),true,'settled label stays clear inside the rim-only lens');
 await shot(p,label+'-zero-displacement',clip);await map.evaluate((e,s)=>e.setAttribute('scale',s),scale);
 const initial=await p.evaluate(()=>FrommControlGlass.snapshot.builds);
 for(const key of ['image','channel','video']){await p.locator(`[data-glow-nav="${key}"]`).hover();await p.waitForTimeout(280);}
 assert.equal(await p.locator('.rail-lens-surface').count(),1,'one translating carrier and one lens');
 assert.equal(await p.locator('.rail-lens-surface').evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]),id,'hover movement reuses the same SDK instance and map');
 assert.equal(await p.evaluate(()=>FrommControlGlass.snapshot.builds),initial);
 assert.deepEqual(await p.locator('.room.active').evaluate(e=>({shadow:getComputedStyle(e).boxShadow,color:getComputedStyle(e).backgroundColor,border:getComputedStyle(e.querySelector('.rail-avatar')).outline})),artist);
 await shot(p,label+'-sidebar');
 await p.mouse.move(600,350);await p.waitForFunction(()=>!document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));
 await p.evaluate(()=>FrommGlowME.setRailOpen(false));await p.waitForTimeout(260);
}
async function queuedRing(p,label){
 await p.evaluate(()=>{state.filter='live';state.live.centerMode='replay';state.live.replaySelected=null;state.live.channels=[{id:'a',channelName:'A'}];state.live.replayFilter='a';state.live.replayPosts=[{id:'one',_channelId:'a',_channelName:'A',title:'One',type:'live_record',thumbnail:{url:'https://fixture.test/photo.svg'}}];state.live.replayPaging=new Map([['a',{loaded:true,isLast:true}]]);renderLiveView();setDownloadButtonFeedback(document.querySelector('.replay-download'),'queued');});
 const button=p.locator('.replay-download').first(),ring=button.locator('.download-feedback-ring');
 assert.equal(await ring.isVisible(),true);assert.equal(await button.getAttribute('aria-busy'),'true');assert.match(await button.getAttribute('aria-label'),/대기 중/);
 assert.equal(await button.evaluate(e=>getComputedStyle(e,'::after').content),'none','no queued text overlays');
 const before=await button.boundingBox();
 if(out)await p.waitForTimeout(1100);
 const samples=await ring.evaluate(async e=>{const a=e.getAnimations()[0];if(!a)throw new Error('missing queued spinner animation');a.pause();await a.ready;return[0,250,500,750].map(t=>{a.currentTime=t;const m=e.getScreenCTM(),c=new DOMPoint(18,18).matrixTransform(m),tip=new DOMPoint(34,18).matrixTransform(m);return{x:tip.x-c.x,y:tip.y-c.y,cx:c.x,cy:c.y}})});
 assert.ok(samples[0].y<0&&samples[1].x>0&&samples[2].y>0&&samples[3].x<0,'queued ring visibly rotates clockwise');
 assert.ok(samples.every(s=>Math.hypot(s.cx-samples[0].cx,s.cy-samples[0].cy)<.1),'rotation stays centered');
 assert.deepEqual(await button.boundingBox(),before);await shot(p,label+'-queued');
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await ring.evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await ring.isVisible(),true);
 assert.equal(await p.locator('.rail-pointer-light').isVisible(),false);await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0);
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.evaluate(()=>setDownloadButtonFeedback(document.querySelector('.replay-download'),'active',.5));assert.equal(await ring.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await button.evaluate(e=>e.style.getPropertyValue('--download-remaining')),'50');
 await p.evaluate(()=>setDownloadButtonFeedback(document.querySelector('.replay-download'),'idle'));assert.equal(await ring.isVisible(),false);
}
(async()=>{const s=await serve(),b=await chromium.launch(process.env.PUBLIC_SHA?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{});
 const url=process.env.PUBLIC_SHA?'https://fffdsaw.github.io/fromm-viewer/?deployment='+process.env.PUBLIC_SHA:s.url;
 const high={newContext:async o=>{const c=await b.newContext({...o,...(out?{recordVideo:{dir:out,size:{width:1440,height:900}}}:{})});await c.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8})});return c}};
 try{for(const opt of [{width:1440,height:900},{width:760,height:900},{width:900,height:700,installed:true}]){const{page:p,context,errors}=await open(high,url,opt),label=opt.width+(opt.installed?'-pwa':'');await cursorLens(p,label);await queuedRing(p,label);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(label+': real cursor displacement/specular, retained lens/artist markers, centered queued rotation and reduced motion PASS')}
 const mobile=await open(high,url,{width:390,height:844});await mobile.page.evaluate(()=>setFilter('image'));await mobile.page.locator('.media-card').first().click({position:{x:30,y:30}});await mobile.page.waitForFunction(()=>state.selected.size===1);assert.equal(await mobile.page.locator('#saveSelectedBtn').isEnabled(),true);assert.equal(await mobile.page.locator('.rail-lens-surface').count(),0);await queuedRing(mobile.page,'390-touch');assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(mobile.errors,[]);await mobile.context.close();console.log('390 touch: selection/save and original layout, no PC cursor engine PASS');
 }finally{await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

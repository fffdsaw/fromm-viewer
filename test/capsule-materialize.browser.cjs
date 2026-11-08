'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {serve,seed,open}=require('./helpers/phase3-fixture.cjs');
// Fail visibly rather than hold a CI runner indefinitely if browser cleanup stalls.
const watchdog=setTimeout(()=>{console.error('capsule-materialize browser watchdog (6m)');process.exit(1);},360000);watchdog.unref();
// ffmpeg resolves concat entries relative to frames.txt, so record absolute paths.
const output=process.env.MATERIALIZE_SCREENSHOT_DIR?path.resolve(process.env.MATERIALIZE_SCREENSHOT_DIR):null;
async function snap(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.png'),clip:{x:0,y:0,width:p.viewportSize().width,height:190}});}}
async function start(p){await p.evaluate(()=>{setFilter('image');clearDownloadSelection();});await p.waitForFunction(()=>FrommGlowME.capsule!==null);}
async function select(p,i=0){await p.evaluate(i=>chooseDownloadItem('media',state.infiniteList[i]),i);}
async function settled(p,phase){await p.waitForFunction(phase=>FrommGlowME.capsule.phase===phase,phase);}
async function rects(p){return p.evaluate(()=>['.media-card','.card-download','#sortBtn','#saveSelectedBtn','#clearSelectionBtn'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return{s,x:r.x,y:r.y,width:r.width,height:r.height};}));}
(async()=>{
 const server=await serve(),browser=await chromium.launch();
 try{
  const {page:p,context,errors}=await open(browser,server.url,{width:900,height:700});await start(p);
  let cdp,frames=[],frameDir;
  if(output){
   frameDir=path.join(output,'frames');fs.mkdirSync(frameDir,{recursive:true});cdp=await context.newCDPSession(p);
   cdp.on('Page.screencastFrame',async f=>{const file=path.join(frameDir,String(frames.length).padStart(5,'0')+'.jpg');fs.writeFileSync(file,Buffer.from(f.data,'base64'));frames.push({file,time:f.metadata.timestamp});await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});
   await cdp.send('Page.startScreencast',{format:'jpeg',quality:82,maxWidth:900,maxHeight:700,everyNthFrame:1});
  }
  await p.evaluate(()=>{window.capsuleSamples=[];window.captureCapsule=true;const sample=()=>{const s=FrommGlowME.capsule,l=document.querySelector('.capsule-optics-lens');const id=l.style.backdropFilter.match(/url\(["']?#([^"')]+)/)?.[1];const filter=id?document.getElementById(id):null;capsuleSamples.push({...s,time:performance.now(),scale:filter?.querySelector('feDisplacementMap')?.getAttribute('scale')||null});if(captureCapsule)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.locator('#selectAllBtn').isEnabled(),true);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);assert.equal(await p.locator('#clearSelectionBtn').isDisabled(),true);await snap(p,'00-idle');
  const before=await rects(p);await select(p);assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);assert.equal(await p.locator('.batch-selection-tools').evaluate(e=>e.inert),false);
  await snap(p,'01-first-selection');await p.waitForTimeout(100);await snap(p,'02-lens-gathering');await p.waitForTimeout(100);await snap(p,'03-lens-expanding');
  await settled(p,'shown');await p.waitForFunction(()=>FrommGlowME.capsule.live===0);await snap(p,'04-settled');
  const mapWidth=await p.locator('.capsule-optics-lens').evaluate(e=>e.offsetWidth);const shown=await p.evaluate(()=>FrommGlowME.capsule);assert.equal(shown.builds,1);assert.equal(shown.disposed,1,'short highlight releases optics after settling');
  assert.equal(await p.locator('.capsule-optics').evaluate(e=>e.parentElement.className.includes('capsule-save-control')),true,'only save has a lens');
  assert.deepEqual(await rects(p),before,'cards, buttons and sort never move');
  await select(p,1);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),shown.builds,'count update does not initialize engine');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.phase),'shown','count update does not replay entrance');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),shown.builds,'visibility resume cannot replay a selected save');
  const stable=await rects(p);await p.locator('#clearSelectionBtn').click();assert.equal(await p.evaluate(()=>state.selected.size),0);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);assert.equal(await p.locator('#selectAllBtn').isEnabled(),true);await snap(p,'05-disabled');await settled(p,'hidden');
  await select(p);await p.waitForFunction(()=>FrommGlowME.capsule.mode==='svg'&&FrommGlowME.capsule.phase==='entering');
  const reversal=await p.evaluate(()=>{const before=FrommGlowME.capsule;clearDownloadSelection();chooseDownloadItem('media',state.infiniteList[0]);return{before,after:FrommGlowME.capsule};});
  assert.equal(reversal.after.builds,reversal.before.builds,'rapid reselect reuses current lens');assert.ok(Math.abs(reversal.after.progress-reversal.before.progress)<.001);await snap(p,'06-reselect');await settled(p,'shown');
  assert.deepEqual(await rects(p),stable,'save highlight never moves hit boxes');await snap(p,'07-active');
  await p.locator('#clearSelectionBtn').click();await settled(p,'hidden');assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds-FrommGlowME.capsule.disposed),0);assert.equal(await p.evaluate(()=>document.activeElement.id),'sortBtn');await snap(p,'08-idle');
  await p.evaluate(()=>window.captureCapsule=false);const samples=await p.evaluate(()=>window.capsuleSamples);const mapWidths=samples.filter(s=>s.mode==='svg'&&s.live).map(s=>s.mapWidth);assert.ok(mapWidths.length>0);assert.equal(Math.max(...mapWidths),mapWidth,'map prepared at final save-button geometry');
  assert.ok(samples.some(s=>s.progress>1.001),'spring overshoots and settles');const scales=samples.map(s=>s.scale).filter(s=>s!==null).map(Number);assert.ok(scales.length>5&&Math.max(...scales)-Math.min(...scales)>5,'actual SVG displacement strength changes through materialization');
  if(output){fs.writeFileSync(path.join(output,'samples.json'),JSON.stringify(samples,null,2));await cdp.send('Page.stopScreencast');await cdp.detach();const concat=frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.016,Math.min(2,(frames[i+1]?.time||f.time+.1)-f.time))}`).join('\n');fs.writeFileSync(path.join(output,'frames.txt'),concat);execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(output,'frames.txt'),'-vf','crop=iw:190:0:0,pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','23','-pix_fmt','yuv420p',path.join(output,'materialize.mp4')]);}
  // A late engine load cannot resurrect a capsule after navigation.
  await select(p);await p.evaluate(()=>setFilter('all'));await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.phase),'hidden');
  await start(p);await select(p);await p.evaluate(()=>selectRoom(1,document.querySelectorAll('#rooms .room')[1]));await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.phase),'hidden','artist change cancels entrance');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);assert.equal(await p.evaluate(()=>state.filter),'image','artist change keeps the photo tab');assert.equal(await p.evaluate(()=>state.selected.size),0,'old artist selection is cleared');assert.equal(await p.locator('.batch-selection-tools').isVisible(),true,'media tab keeps its idle toolbar');assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true,'save stays disabled until new selection');console.log('capsule: artist-switch test complete');await seed(p);
  await start(p);await select(p);await settled(p,'shown');await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);await p.waitForFunction(()=>FrommGlowME.capsule.live===0);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.reason),'reduced-motion');await p.locator('#clearSelectionBtn').click();assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);await p.emulateMedia({reducedMotion:'no-preference'});console.log('capsule: reduced-motion test complete');
  // Opaque surround must cover the top pixel and the curved corners, not clip popups.
  await p.evaluate(()=>{scrollTo(0,600);const h=document.querySelector('.viewer-header').getBoundingClientRect(),probe=document.createElement('div');probe.id='header-occlusion-probe';probe.style.cssText=`position:fixed;left:${h.left-8}px;top:0;width:${h.width+16}px;height:${h.bottom}px;background:rgb(255,0,255);z-index:400;pointer-events:none`;document.body.append(probe);});await p.waitForTimeout(50);await snap(p,'header-occlusion');
  const header=await p.locator('.viewer-header').boundingBox();assert.equal(header.y,12);assert.equal(await p.locator('.viewer-header').evaluate(e=>getComputedStyle(e).overflow),'visible','menus/focus are not clipped');
  const png=(await p.screenshot()).toString('base64');
  const pixels=await p.evaluate(async ({png,h})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return [[h.x+h.width/2,0],[h.x+1,h.y+1],[h.x+1,h.y+h.height-1]].map(([x,y])=>[...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data].slice(0,3));},{png,h:header});
  assert.deepEqual(pixels,[[240,248,243],[240,248,243],[240,248,243]],'opaque top/corner surround excludes vivid content behind header');
  if(output){fs.writeFileSync(path.join(output,'header-probe.json'),JSON.stringify({header,pixels}));}
  await p.locator('#header-occlusion-probe').evaluate(e=>e.remove());assert.deepEqual(errors,[]);await context.close();console.log('capsule: header-occlusion test complete');
  for(const options of [{lowPower:true},{userAgent:'Mozilla/5.0 Version/18.0 Safari/605.1.15'},{installed:true}]){
   const {page,context,errors}=await open(browser,server.url,{width:1440,height:900,...options});await start(page);await select(page);await settled(page,'shown');
   if(options.installed){await page.waitForFunction(()=>FrommGlowME.capsule.mode==='svg');await page.waitForFunction(()=>FrommGlowME.capsule.live===0);}
   else{await page.waitForFunction(()=>FrommGlowME.capsule.mode==='fallback'||FrommGlowME.capsule.mode==='reduced');assert.equal(await page.evaluate(()=>FrommGlowME.capsule.live),0);}
   await page.locator('#clearSelectionBtn').click();await settled(page,'hidden');assert.deepEqual(errors,[]);await context.close();
  }
  console.log('capsule: browser fallback scenarios complete');const late=await open(browser,server.url,{login:true});let release,requested;const held=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
  await late.page.route('**/vendor/meapri/liquid-glass.js',async route=>{requested();await held;await route.continue();});console.log('capsule: pending module fallback started');await seed(late.page);await start(late.page);await select(late.page);await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('engine request not intercepted')),5000))]);await late.page.waitForFunction(()=>FrommGlowME.capsule.mode==='fallback');assert.equal(await late.page.locator('#saveSelectedBtn').isVisible(),true,'stalled import keeps readable fallback');release();await late.page.waitForTimeout(500);assert.equal(await late.page.evaluate(()=>FrommGlowME.capsule.live),0);assert.equal(await late.page.evaluate(()=>FrommGlowME.capsule.mode),'fallback','late module does not replace settled fallback');await late.page.evaluate(()=>setFilter('all'));assert.equal(await late.page.evaluate(()=>FrommGlowME.capsule.phase),'hidden');await late.context.close();
  console.log('Persistent capsule: save-only SVG pulse, no count replay, stable controls, quick reselect, cleanup, reduced/fallback and installed-layout simulation PASS');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

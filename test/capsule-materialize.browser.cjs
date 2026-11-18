'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,seed,open}=require('./helpers/phase3-fixture.cjs');
const {plain}=require('./helpers/clear-controls.cjs');
const output=process.env.MATERIALIZE_SCREENSHOT_DIR;
async function snap(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.png'),clip:{x:0,y:0,width:p.viewportSize().width,height:190}});}}
async function start(p){await p.evaluate(()=>{setFilter('image');clearDownloadSelection();});await p.waitForFunction(()=>FrommGlowME.capsule!==null);}
async function select(p,i=0){await p.evaluate(i=>chooseDownloadItem('media',state.infiniteList[i]),i);}
async function settled(p,phase){await p.waitForFunction(phase=>FrommGlowME.capsule.phase===phase,phase);}
async function rects(p){return p.evaluate(()=>['.media-card','.card-download','#sortBtn'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return{s,x:r.x,y:r.y,width:r.width,height:r.height};}));}
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 const {page:p,context,errors}=await open(browser,server.url,{width:900,height:700});await start(p);
 assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);assert.equal(await p.locator('#selectAllBtn').isEnabled(),true);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);assert.equal(await p.locator('#clearSelectionBtn').isDisabled(),true);await snap(p,'00-idle');
 const horizontal=await p.evaluate(async()=>{
  chooseDownloadItem('media',state.infiniteList[0]);const animation=document.querySelector('.capsule-horizontal-skin').getAnimations()[0];animation.pause();animation.currentTime=80;
  const skin=document.querySelector('.capsule-horizontal-skin'),m=new DOMMatrix(getComputedStyle(skin).transform),native=[...document.querySelectorAll('#mediaSelectionSlot button')].map(e=>getComputedStyle(e).transform);
  const origin=getComputedStyle(skin).transformOrigin;clearDownloadSelection();animation.pause();animation.currentTime=60;chooseDownloadItem('media',state.infiniteList[0]);return {x:m.a,y:m.d,native,origin};
 });assert.ok(horizontal.x>0&&horizontal.x<1);assert.equal(horizontal.y,1);assert.ok(horizontal.native.every(x=>x==='none'));assert.ok(parseFloat(horizontal.origin)>250,'origin is the right edge next to sort');await settled(p,'shown');assert.ok(await p.evaluate(()=>FrommGlowME.capsule.reversals)>=2);await p.evaluate(()=>clearDownloadSelection());await settled(p,'hidden');
 const before=await rects(p);await select(p);await settled(p,'shown');await plain(p,'#saveSelectedBtn');
 assert.deepEqual(await p.evaluate(()=>({builds:FrommGlowME.capsule.builds,live:FrommGlowME.capsule.live,mode:FrommGlowME.capsule.mode})),{builds:0,live:0,mode:'css-horizontal'},'selection never starts a save engine');
 assert.equal(await p.locator('.capsule-horizontal-skin').isVisible(),true);assert.deepEqual(await rects(p),before);await snap(p,'01-selected');
 await select(p,1);assert.equal(await p.locator('#selectedCount').textContent(),'선택 2개');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),0);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});await settled(p,'shown');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),0);
 await p.locator('#clearSelectionBtn').click();await settled(p,'hidden');assert.equal(await p.evaluate(()=>state.selected.size),0);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);
 await select(p);await p.evaluate(()=>{clearDownloadSelection();chooseDownloadItem('media',state.infiniteList[0]);});await settled(p,'shown');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),0);assert.deepEqual(await rects(p),before,'rapid reselect never moves hit boxes');
 await p.locator('#clearSelectionBtn').click();await settled(p,'hidden');assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);assert.equal(await p.evaluate(()=>document.activeElement.closest?.('[inert]')!==null),false,'hidden capsule cannot retain focus');
 await select(p);await p.evaluate(()=>setFilter('all'));await settled(p,'hidden');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);
 await start(p);await select(p);await p.evaluate(()=>selectRoom(1,document.querySelectorAll('#rooms .room')[1]));await settled(p,'hidden');assert.equal(await p.evaluate(()=>state.filter),'image');assert.equal(await p.evaluate(()=>state.selected.size),0);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);await seed(p);
 await start(p);await p.emulateMedia({reducedMotion:'reduce'});await select(p);await settled(p,'shown');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);await p.locator('#clearSelectionBtn').click();await p.emulateMedia({reducedMotion:'no-preference'});
  // Opaque surround must cover the top pixel and the curved corners, not clip popups.
  await p.evaluate(()=>{scrollTo(0,600);const h=document.querySelector('.viewer-header').getBoundingClientRect(),probe=document.createElement('div');probe.id='header-occlusion-probe';probe.style.cssText=`position:fixed;left:${h.left-8}px;top:0;width:${h.width+16}px;height:${h.bottom}px;background:rgb(255,0,255);z-index:400;pointer-events:none`;document.body.append(probe);});await p.waitForTimeout(50);await snap(p,'header-occlusion');
  const header=await p.locator('.viewer-header').boundingBox();assert.equal(header.y,12);assert.equal(await p.locator('.viewer-header').evaluate(e=>getComputedStyle(e).overflow),'visible','menus/focus are not clipped');
  const png=(await p.screenshot()).toString('base64');
  const pixels=await p.evaluate(async ({png,h})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return [[h.x+h.width/2,0],[h.x+1,h.y+1],[h.x+1,h.y+h.height-1]].map(([x,y])=>[...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data].slice(0,3));},{png,h:header});
  // Browser rasterization can round solid RGB channels by a few units. Keep
  // testing all three occlusion probes, rejecting any visible magenta bleed.
  for(const pixel of pixels){
   assert.ok(pixel.every((channel,i)=>Math.abs(channel-[240,248,243][i])<=4),
    'opaque top/corner surround excludes vivid content behind header: '+JSON.stringify(pixels));
  }
  if(output){fs.writeFileSync(path.join(output,'header-probe.json'),JSON.stringify({header,pixels}));}
  await p.locator('#header-occlusion-probe').evaluate(e=>e.remove());assert.deepEqual(errors,[]);await context.close();console.log('capsule: header-occlusion test complete');

 for(const options of [{lowPower:true},{userAgent:'Mozilla/5.0 Version/18.0 Safari/605.1.15'},{installed:true}]){
  const {page,context,errors}=await open(browser,server.url,{width:1440,height:900,...options});await start(page);await select(page);await settled(page,'shown');await plain(page,'#saveSelectedBtn');assert.equal(await page.evaluate(()=>FrommGlowME.capsule.builds),0);await page.locator('#clearSelectionBtn').click();await settled(page,'hidden');assert.deepEqual(errors,[]);await context.close();
 }
 const late=await open(browser,server.url,{login:true});let release;const held=new Promise(r=>release=r);await late.page.route('**/vendor/meapri/liquid-glass.js*',async route=>{await held;await route.continue();});await seed(late.page);await start(late.page);await select(late.page);await settled(late.page,'shown');await plain(late.page,'#saveSelectedBtn');assert.equal(await late.page.evaluate(()=>FrommGlowME.capsule.builds),0,'Save remains usable without the engine module');release();await late.page.waitForTimeout(350);assert.equal(await late.page.evaluate(()=>FrommGlowME.capsule.live),0);await late.page.evaluate(()=>setFilter('all'));await settled(late.page,'hidden');await late.context.close();
 console.log('Horizontal CSS Save: zero engines, fixed geometry, selection/count/clear, artist/navigation/visibility cleanup, header occlusion, reduced/fallback/installed and stalled-engine usability PASS');
}finally{await browser.close();await server.close()}})().catch(e=>{console.error(e);process.exitCode=1});

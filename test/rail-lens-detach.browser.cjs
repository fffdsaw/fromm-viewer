'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true});try{
 const {page,context,errors}=await open(browser,server.url,{width:1440,height:900});
 await page.evaluate(()=>{FrommGlowME.setRailOpen(true);scrollTo(0,0);});await page.waitForTimeout(350);
 const all=page.locator('[data-glow-nav="all"]'),media=page.locator('[data-glow-nav="media"]'),liquid=page.locator('.rail-liquid-lens');
 assert.equal(await page.locator('.rail-lens-drop').count(),0,'no separate falling droplets');assert.equal(await page.locator('.rail-pointer-light').count(),1,'one existing optical lens');
 for(const theme of ['glow','sky','classic']){
  await page.evaluate(theme=>FrommThemes.set(theme),theme);
  await page.waitForFunction(()=>document.querySelector('.rail-lens-surface')?.style.backdropFilter.includes('url('));
  for(const [from,to,direction] of [[all,media,1],[media,all,-1]]){
  await from.hover();await page.waitForFunction(key=>{const lens=document.querySelector('.rail-pointer-light');return lens.dataset.phase==='idle'&&lens.dataset.target===key;},await from.getAttribute('data-glow-nav'));
  const before=await to.boundingBox();
  assert.equal(await page.locator('.rail-liquid-body').evaluate(el=>getComputedStyle(el).maskImage),'url("#railLiquidMask")','optical rim mask resolves against the document');
  await page.evaluate(()=>{
   window.__peelFrames=[];const until=performance.now()+1500;
   const sample=()=>{const el=document.querySelector('.rail-liquid-lens'),rect=name=>{const r=el.querySelector('.rail-liquid-'+name).getBoundingClientRect();return{y:r.y,h:r.height,cy:r.y+r.height/2};};
    __peelFrames.push({phase:el.dataset.phase,hidden:el.hidden,source:rect('source'),current:rect('current'),neck:rect('neck'),filter:el.querySelector('.rail-liquid-body').style.backdropFilter});
    if(performance.now()<until)window.__peelFrame=requestAnimationFrame(sample);
   };window.__peelFrame=requestAnimationFrame(sample);
  });
  await to.hover();
  await page.waitForFunction(()=>__peelFrames.some(f=>f.phase==='connected'&&f.neck.h>1));
  if(process.env.LENS_DETACH_DIR){fs.mkdirSync(process.env.LENS_DETACH_DIR,{recursive:true});await page.screenshot({path:process.env.LENS_DETACH_DIR+'/connected-'+theme+'-'+direction+'.png'});}
  await page.waitForFunction(()=>__peelFrames.some(f=>f.phase==='separating')&&document.querySelector('.rail-pointer-light').dataset.phase==='idle');
  const frames=await page.evaluate(()=>{cancelAnimationFrame(__peelFrame);return __peelFrames;});
  const connected=frames.filter(f=>f.phase==='connected'&&f.source.h>.5),split=frames.filter(f=>f.phase==='separating'&&f.source.h>.5);
  assert.ok(connected.length>=2&&connected.some(f=>f.neck.h>1),'old and moving body visibly join through a neck');
  const origins=connected.map(f=>f.source.cy);assert.ok(Math.max(...origins)-Math.min(...origins)<1,'source stays anchored rather than falling');
  assert.ok(Math.max(...connected.map(f=>f.current.cy))-Math.min(...connected.map(f=>f.current.cy))>16,'lens pulls toward the adjacent menu');
  assert.ok(connected.every(f=>f.filter.includes('url(')),'connected body reuses the real optical filter');
  assert.ok(split.some(f=>f.neck.h===0&&(direction>0?f.current.y>f.source.y+f.source.h:f.source.y>f.current.y+f.current.h)),'neck pinches off into separate source and destination bodies');
  assert.equal(await liquid.getAttribute('hidden'),'');assert.deepEqual(await to.boundingBox(),before,'menu hit boxes stay fixed');
  }
 }
 await all.hover();await page.waitForFunction(()=>document.querySelector('.rail-pointer-light').dataset.phase==='idle'&&document.querySelector('.rail-pointer-light').dataset.target==='all');await media.hover();await page.waitForFunction(()=>!document.querySelector('.rail-liquid-lens').hidden);await media.click();
 assert.equal(await page.evaluate(()=>state.filter),'media','connected decoration does not intercept selection');assert.equal(await liquid.getAttribute('hidden'),'','click ends the transient membrane');
 await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.waitForTimeout(250);await all.hover();await page.waitForFunction(()=>document.querySelector('.rail-pointer-light').dataset.target==='all');await media.hover();await page.waitForFunction(()=>!document.querySelector('.rail-liquid-lens').hidden);await page.mouse.move(900,850);assert.equal(await liquid.getAttribute('hidden'),'','leaving cancels the whole connection');
 await page.emulateMedia({reducedMotion:'reduce'});await all.hover();await media.hover();assert.equal(await liquid.getAttribute('hidden'),'');assert.equal(await liquid.evaluate(el=>getComputedStyle(el).display),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({forcedColors:'active'});assert.equal(await liquid.evaluate(el=>getComputedStyle(el).display),'none');
 assert.deepEqual(errors,[]);await context.close();console.log('Single lens: anchored source → connected pull → pinch-off → settle; three clear themes, fixed actions, cancellation/accessibility PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

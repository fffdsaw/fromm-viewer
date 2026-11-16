'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true});try{
 const {page,context,errors}=await open(browser,server.url,{width:1440,height:900});
 await page.evaluate(()=>{FrommGlowME.setRailOpen(true);scrollTo(0,0);});await page.waitForTimeout(350);
 const drops=page.locator('.rail-lens-drop'),all=page.locator('[data-glow-nav="all"]'),sound=page.locator('[data-glow-nav="sound"]');
 for(const theme of ['glow','sky','classic']){
  await page.evaluate(theme=>FrommThemes.set(theme),theme);
  await page.waitForFunction(()=>[...document.querySelectorAll('.rail-lens-drop')].length===2&&[...document.querySelectorAll('.rail-lens-drop')].every(el=>el.dataset.controlOptics==='engine'&&el.querySelector('.control-glass-surface')?.style.backdropFilter.includes('url(')));
  const before=await sound.boundingBox();await all.hover();await sound.hover();
  await page.waitForFunction(()=>[...document.querySelectorAll('.rail-lens-drop')].some(el=>Number(getComputedStyle(el).opacity)>.1));
  assert.equal(await drops.count(),2);assert.deepEqual(await sound.boundingBox(),before,'droplets never move navigation hit targets');
  assert.ok((await drops.evaluateAll(es=>es.map(el=>({pointer:getComputedStyle(el).pointerEvents,hidden:el.getAttribute('aria-hidden'),tint:el.querySelector('.control-glass-surface').style.backgroundColor})))).every(s=>s.pointer==='none'&&s.hidden==='true'&&['','rgba(255, 255, 255, 0)'].includes(s.tint)),'engine-backed droplets stay clear and decorative');
  await page.waitForTimeout(180);
  if(process.env.DROPLET_DIR){fs.mkdirSync(process.env.DROPLET_DIR,{recursive:true});await page.screenshot({path:process.env.DROPLET_DIR+'/drops-'+theme+'.png'});}
  await sound.click();assert.equal(await page.evaluate(()=>state.filter),'sound','falling decorations do not intercept menu clicks');
  await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.waitForTimeout(250);
 }
 await all.hover();await sound.hover();await page.mouse.move(900,850);assert.ok((await drops.evaluateAll(es=>es.map(el=>el.getAnimations().length))).every(n=>n===0),'pointer leave cancels all droplets');
 await page.emulateMedia({reducedMotion:'reduce'});assert.ok((await drops.evaluateAll(es=>es.map(el=>getComputedStyle(el).display))).every(value=>value==='none'));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({forcedColors:'active'});assert.ok((await drops.evaluateAll(es=>es.map(el=>getComputedStyle(el).display))).every(value=>value==='none'));
 assert.deepEqual(errors,[]);await context.close();console.log('Real SVG drops: three clear palettes, fixed two decorations, unchanged menu actions/geometry, leave and accessibility cleanup PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

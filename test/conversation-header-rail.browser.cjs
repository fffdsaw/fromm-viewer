'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:1440,height:900,installed:true}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  const shape=await page.evaluate(()=>{const h=document.querySelector('.viewer-header').getBoundingClientRect(),s=document.querySelector('#sidebar').getBoundingClientRect();return{toggleWidth:document.querySelector('#sidebarToggleBtn').getBoundingClientRect().width,client:document.body.getBoundingClientRect().right,left:h.left,right:h.right,rail:s.top,header:h.bottom,overflow:document.documentElement.scrollWidth>innerWidth,arrow:getComputedStyle(document.querySelector('.rail-toggle svg')).display};});
  assert.ok(Math.abs(shape.left-12)<1&&Math.abs(shape.right-(shape.client-12))<1,JSON.stringify(shape));assert.ok(shape.rail>=shape.header+11,JSON.stringify(shape));assert.equal(shape.arrow,'none');assert.ok(shape.toggleWidth<=1.1,'no permanently visible keyboard-entry button');assert.equal(shape.overflow,false);
  const content=await page.locator('#timeline').boundingBox();await page.locator('#sidebar').hover({position:{x:20,y:20}});await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().width>250);
  const video=page.locator('[data-glow-nav="video"]'),box=await video.boundingBox();await page.mouse.move(box.x+25,box.y+14);
  await page.waitForFunction(()=>document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));
  const before=await page.locator('.rail-pointer-light').evaluate(e=>e.style.getPropertyValue('--rail-light-x'));await page.mouse.move(box.x+180,box.y+25);
  await page.waitForFunction(value=>document.querySelector('.rail-pointer-light').style.getPropertyValue('--rail-light-x')!==value,before);
  assert.equal(await page.locator('[data-glow-nav="all"]').getAttribute('aria-current'),'page','pointer decoration must not select a route');
  if(process.env.RAIL_SCREENSHOT_DIR){await page.waitForTimeout(180);fs.mkdirSync(process.env.RAIL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.RAIL_SCREENSHOT_DIR}/hover-${viewport.width}${viewport.installed?'-pwa':''}.png`});}
  await page.mouse.move(700,450);await page.waitForFunction(()=>document.querySelector('#sidebarToggleBtn').getAttribute('aria-expanded')==='false');assert.equal(await page.locator('.glowme-nav').evaluate(e=>e.classList.contains('rail-pointer-tracking')),false);
  assert.ok(Math.abs((await page.locator('#timeline').boundingBox()).width-content.width)<1,'rail expansion must not shift content');
  await page.locator('#sidebarToggleBtn').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.dataset.glowNav),'all');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'sidebarToggleBtn');
  await page.locator('#sidebar').hover({position:{x:20,y:20}});await video.hover();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.rail-pointer-light').evaluate(e=>getComputedStyle(e).display),'none');
  assert.deepEqual(errors,[]);await context.close();console.log(`PC1440${viewport.installed?'-PWA':''}: full header, rail below, no arrow, pointer tracking and keyboard/reduced motion PASS`);
 }
 // Minimum touch-layout smoke only; no mobile redesign or broad mobile matrix.
 const mobile=await open(browser,server.url,{width:390,height:844});await mobile.page.locator('#sidebarToggleBtn').click();assert.equal(await mobile.page.locator('#sidebarToggleBtn').getAttribute('aria-expanded'),'true');await mobile.page.keyboard.press('Escape');await mobile.page.locator('#chatToolsBtn').click();assert.equal(await mobile.page.locator('#chatContextBtn').count(),0);assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(mobile.errors,[]);await mobile.context.close();console.log('390 touch: existing rail/search usable, no overflow PASS');
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

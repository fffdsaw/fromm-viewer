'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  const {page,context,errors}=await open(browser,server.url,viewport),toggle=page.locator('#sidebarToggleBtn');
  await require('./helpers/center-navigation.cjs')(page,'all');
  // A browser/screenshot restoring the old menu item's focus is not a new
  // keyboard navigation request after the menu was explicitly closed.
  await page.locator('[data-glow-nav="all"]').focus();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false','restored focus does not reopen the closed rail');
  await page.screenshot({fullPage:true});assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  if(await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches)){
   await page.mouse.move(35,35);await page.waitForFunction(()=>document.querySelector('#sidebarToggleBtn').getAttribute('aria-expanded')==='true');
   await page.mouse.move(700,200);await page.waitForFunction(()=>document.querySelector('#sidebarToggleBtn').getAttribute('aria-expanded')==='false');
  }
  await toggle.focus();await page.keyboard.press('Tab');assert.equal(await toggle.getAttribute('aria-expanded'),'true','real Tab navigation still expands the rail');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'sidebarToggleBtn');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}: restored focus stays closed; Tab/Escape and actual input navigation PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

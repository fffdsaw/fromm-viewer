'use strict';
// Final critique regressions: real hit targets, edge-state contrast and status.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const luminance=rgb=>rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:320,height:640},{width:844,height:390},{width:1440,height:900,installed:true}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  const paths=await page.locator('.glowme-nav svg path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));assert.equal(new Set(paths).size,9,'collapsed navigation has nine distinct icons');
  await page.evaluate(()=>{state.historyError='synthetic';FrommGlowME.syncHeader();});assert.equal(await page.locator('#artistLoadStatus').isVisible(),true);assert.match(await page.locator('#artistLoadStatus').textContent(),/재시도/);
  await page.evaluate(()=>{state.historyError='';FrommGlowME.syncHeader();openChatToolsPanel();});
  await page.locator('#chatSearchInput').fill('합성 대화');await page.waitForFunction(()=>state.chatQuery==='합성 대화');
  await page.locator('#chatToolsPanel #chatMatchNext').click();const first=await page.evaluate(()=>state.chatMatchKey);assert.ok(first);
  await page.locator('#chatToolsPanel #chatMatchNext').click();assert.notEqual(await page.evaluate(()=>state.chatMatchKey),first);
  await page.locator('#chatToolsPanel #chatMatchPrev').click();assert.equal(await page.evaluate(()=>state.chatMatchKey),first);
  if(!viewport.installed){await page.keyboard.press('Escape');await page.locator('.toolbar #chatMatchNext').click();assert.notEqual(await page.evaluate(()=>state.chatMatchKey),first);}
  await page.evaluate(()=>{state.chatQuery='';render();openChatToolsPanel();openDateCalendar();});await page.waitForTimeout(80);
  const calendarVisible=await page.locator('.date-day').first().evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('#chatToolsPanel').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;});
  assert.equal(calendarVisible,true,'opening calendar exposes a selectable date in short landscape');
  for(const selector of ['.media-missing','.artist-select-prompt']){
   if(selector.includes('artist'))await page.evaluate(()=>{state.room=null;render();});
   await page.locator(selector).first().scrollIntoViewIfNeeded();
   const color=await page.locator(selector).first().evaluate(e=>getComputedStyle(e).color.match(/\d+/g).slice(0,3).map(Number));
   // Conservative mint surface is darker than either actual reading surface.
   const contrast=(luminance([210,230,220])+.05)/(luminance(color)+.05);assert.ok(contrast>=4.5,selector+': '+contrast);
  }
  assert.deepEqual(errors,[]);console.log(`${viewport.width}${viewport.installed?'-PWA':''}: search arrows reachable, edge-state contrast and error visibility PASS`);await context.close();
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

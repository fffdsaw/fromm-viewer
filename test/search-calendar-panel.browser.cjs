'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch(),shots=process.env.CALENDAR_PANEL_SCREENSHOT_DIR;try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:980,height:2200},{width:844,height:390},{width:1440,height:900,installed:true}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  if(!viewport.installed)await page.locator('#chatToolsBtn').click();
  await page.locator('#dateCalendar.open').waitFor({state:'visible'});
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#chatToolsPanel')).opacity)>.99);
  assert.equal(await page.locator('#datePickerBtn').isVisible(),false,'no extra date picker activation step');
  assert.equal(await page.locator('.chat-tools-title').innerText(),'대화 검색 / 날짜 찾기');
  for(const id of ['myRepliesBtn']){assert.equal(await page.locator('#'+id).getAttribute('type'),'checkbox');assert.equal(await page.locator('#'+id).isChecked(),false);}
  await page.evaluate(()=>{state.calendarMonth=new Date(2026,9,1);renderDateCalendar();});
  const calendar=await page.locator('#dateCalendar').boundingBox(),move=await page.locator('#dateJumpBtn').boundingBox();const fields=await page.locator('.search-panel-scroll').boundingBox();assert.ok(move.y>=fields.y+fields.height-1,'move footer is below scrollable calendar area');
  const panel=await page.locator('#chatToolsPanel').boundingBox();assert.ok(move.width>=panel.width-50);assert.ok(move.y+move.height<=panel.y+panel.height,'Move remains visible on short screens');
  if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:shots+`/panel-${viewport.width}${viewport.installed?'-pwa':''}.png`});}
  const before=await page.evaluate(()=>({y:scrollY,key:state.chatMatchKey}));
  await page.locator('.date-day[data-date="2026-10-09"]').click();
  assert.equal(await page.evaluate(()=>state.selectedDate),'2026-10-09');assert.equal(await page.locator('#dateCalendar').getAttribute('aria-hidden'),'false');assert.equal(await page.evaluate(()=>state.chatMatchKey),before.key,'selecting does not navigate until Move');
  await page.locator('#dateJumpBtn').click();await page.waitForFunction(()=>document.querySelector('.date-target-flash'));
  if(!viewport.installed)await page.locator('#chatToolsBtn').click();
  await page.locator('#chatSearchInput').fill('합성 대화');await page.waitForFunction(()=>state.chatQuery==='합성 대화');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  if(viewport.width===1440&&!viewport.installed){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await axe.run('#chatToolsPanel',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);}
  await context.close();console.log(`${viewport.width}${viewport.installed?'-PWA':''}: inline calendar, native checkboxes, select/Move, panel layout PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

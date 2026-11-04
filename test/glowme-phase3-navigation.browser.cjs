'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const{page,context,errors}=await open(browser,server.url,viewport);
 await page.evaluate(()=>scrollTo(0,1800));await page.waitForTimeout(100);
 const original=await page.evaluate(()=>scrollY);await page.evaluate(()=>setFilter('image'));await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>scrollY)<10,'first visit to a different view starts at its beginning');
 await page.evaluate(()=>scrollTo(0,1200));await page.waitForTimeout(80);const gallery=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>setFilter('all'));await page.waitForTimeout(180);console.log('chat restore',original,await page.evaluate(()=>scrollY));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-original)<5,'conversation position restored');
 await page.evaluate(()=>setFilter('image'));await page.waitForTimeout(180);console.log('gallery restore',gallery,await page.evaluate(()=>scrollY));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-gallery)<5,'gallery position restored');
 assert.equal(await page.locator('#chatToolsBtn').isVisible(),false);assert.equal(await page.locator('#saveSelectedBtn').isVisible(),false);
 await page.evaluate(()=>{state.selected.add('m0');updateSelectedCount();});assert.equal(await page.locator('#saveSelectedBtn').isVisible(),true);
 const pos=await page.evaluate(()=>scrollY);await page.evaluate(()=>{state.selected.clear();updateSelectedCount();});assert.equal(await page.locator('#saveSelectedBtn').isVisible(),false);assert.equal(await page.evaluate(()=>scrollY),pos);
 await page.evaluate(()=>setFilter('all'));await page.waitForTimeout(150);await page.locator('#chatToolsBtn').click();await page.locator('#chatSearchInput').fill('인용');await page.waitForTimeout(500);assert.equal(await page.locator('#chatSearchInput').inputValue(),'인용');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'chatToolsBtn');
 await page.evaluate(()=>{state.chatQuery='';render();});await page.waitForTimeout(100);
 await page.evaluate(()=>jumpToDate('2026-10-09'));await page.waitForTimeout(600);assert.ok(await page.evaluate(()=>scrollY)<500,'explicit date navigation overrides restored position');
 assert.deepEqual(errors,[]);console.log(viewport.width+': filter scroll, selection layout, search/date/focus PASS');await context.close();
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

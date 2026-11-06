'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();const shots=process.env.SEARCH_DOCK_SCREENSHOT_DIR;
try{
 const early=await browser.newPage({viewport:{width:390,height:844}});let release;const held=new Promise(r=>release=r);
 await early.route('**/web-glowme.js',async route=>{await held;await route.continue();});
 const navigation=early.goto(server.url,{waitUntil:'domcontentloaded'});
 await early.locator('.topbar').waitFor({state:'attached'});
 await early.waitForFunction(()=>getComputedStyle(document.querySelector('.topbar')).backgroundImage.includes('237, 248, 240'));
 assert.equal(await early.evaluate(()=>!!window.FrommGlowME),false,'mint paints before shell JS loads');
 if(shots){fs.mkdirSync(shots,{recursive:true});await early.screenshot({path:shots+'/startup-before-shell.png'});}
 release();await navigation;await early.close();
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:980,height:2200},{width:1440,height:900}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  await page.evaluate(()=>scrollTo(0,1500));await page.waitForTimeout(100);
  const search=page.locator('#chatToolsBtn'),initial=await search.boundingBox();assert.ok(initial.y<30);assert.ok(initial.x>=0&&initial.x+initial.width<=viewport.width);
  await search.click();await page.locator('#chatSearchInput').fill('합성 대화');
  await page.waitForFunction(()=>state.chatQuery==='합성 대화');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.chat-match-slot').getAttribute('aria-hidden'),'true');
  await page.evaluate(()=>{state.onlyMyReplies=true;render();});
  await page.waitForFunction(()=>document.querySelector('.chat-match-slot').classList.contains('expanded'));
  await page.waitForTimeout(230);
  const nav=await page.locator('#chatMatchNav').boundingBox(),button=await search.boundingBox();
  assert.ok(nav&&nav.x>=0&&nav.y<70);assert.ok(nav.x+nav.width<=button.x,'navigation expands beside search without overlap');
  await page.evaluate(()=>scrollTo(0,0));const title=await page.locator('#artistTitle').boundingBox();assert.ok(nav.x+nav.width<=title.x||nav.x>=title.x+title.width||nav.y+nav.height<=title.y||nav.y>=title.y+title.height,'reply controls do not cover artist title');
  assert.ok(Math.abs(initial.x-button.x)<1&&Math.abs(initial.y-button.y)<1,'search does not move when arrows expand');
  await search.click();const panel=await page.locator('#chatToolsPanel').boundingBox();assert.ok(panel.y>=button.y+button.height,'panel clears dock');
  await page.keyboard.press('Escape');
  if(shots)await page.screenshot({path:shots+`/reply-dock-${viewport.width}.png`});
  await page.evaluate(()=>{state.onlyMyReplies=false;render();});await page.waitForTimeout(230);
  assert.equal(await page.locator('.chat-match-slot').getAttribute('aria-hidden'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.chat-match-slot').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}: upper search, reply-only expansion, stable anchor and panel clearance PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

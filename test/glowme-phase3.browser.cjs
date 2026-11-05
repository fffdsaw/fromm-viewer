'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch(),results=[];try{
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:900},{width:1440,height:900,installed:true}]){
 const{page,context,errors}=await open(browser,server.url,viewport);
 const base=await page.locator('#timeline').boundingBox();
 assert.equal(await page.locator('.glowme-nav button').count(),9);assert.equal(await page.locator('.toolbar [data-filter]').count(),0);
 assert.match(await page.locator('#artistMediaStats').textContent(),/미디어 71 · 사진 45 · 영상 15 · 음성 11/);
 assert.equal(await page.locator('#artistTitle').textContent(),'테스트 아티스트');
 await page.waitForFunction(()=>document.querySelector('.rail-avatar img')?.naturalWidth>0);
 assert.equal(await page.locator('#rooms .room').count(),30);
 await page.locator('#sidebarToggleBtn').focus();await page.keyboard.press('Enter');await page.waitForTimeout(230);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.glowNav),'all');
 const after=await page.locator('#timeline').boundingBox();assert.ok(Math.abs(after.width-base.width)<1);
 const pageY=await page.evaluate(()=>scrollY),navY=(await page.locator('.glowme-nav').boundingBox()).y;
 await page.locator('#rooms').hover();await page.mouse.wheel(0,250);await page.waitForTimeout(120);
 assert.ok(await page.locator('#rooms').evaluate(e=>e.scrollTop)>0,'wheel scrolls artists');
 await page.locator('#rooms').evaluate(e=>e.scrollTop=e.scrollHeight);await page.mouse.wheel(0,300);await page.waitForTimeout(120);
 assert.equal(await page.evaluate(()=>scrollY),pageY,'artist boundary does not scroll the conversation');
 assert.equal((await page.locator('.glowme-nav').boundingBox()).y,navY,'nine navigation entries remain fixed');
 const scroll=await page.evaluate(()=>{const e=document.querySelector('#rooms');e.scrollTop=200;return e.scrollTop;});assert.ok(scroll>0);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'sidebarToggleBtn');
 await page.keyboard.press('Enter');await page.waitForTimeout(230);assert.equal(await page.locator('#rooms').evaluate(e=>e.scrollTop),scroll);
 const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,rail:document.querySelector('#sidebar').getBoundingClientRect().toJSON(),artists:document.querySelector('#rooms').getBoundingClientRect().toJSON(),nav:document.querySelector('.glowme-nav').getBoundingClientRect().toJSON()}));
 assert.equal(geometry.overflow,false);assert.ok(geometry.artists.height>=40);assert.ok(geometry.nav.bottom<=geometry.artists.top);
 if(process.env.PHASE3_SCREENSHOT_DIR){fs.mkdirSync(process.env.PHASE3_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.PHASE3_SCREENSHOT_DIR,`rail-${viewport.width}${viewport.installed?'-pwa':''}.png`)});}
 await page.keyboard.press('Escape');
 if(!viewport.installed){await page.locator('#chatToolsBtn').click();assert.equal(await page.locator('#chatToolsPanel').getAttribute('aria-hidden'),'false');
 await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().width<=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-width'))+1);
 const panelBox=await page.locator('#chatToolsPanel').boundingBox(),railBox=await page.locator('#sidebar').boundingBox();
 assert.ok(panelBox.x>=railBox.x+railBox.width,'search preserves access to collapsed rail');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'chatToolsBtn');}
 await page.waitForTimeout(400);
 const optics=await page.locator('#sidebarToggleBtn').evaluate(e=>getComputedStyle(e).backdropFilter);assert.match(optics,/url\(/,'Chromium uses actual SVG refraction');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.FrommGlass.count),0);
 assert.deepEqual(errors,[]);results.push({viewport,geometry,optics:'SVG',keyboard:'pass'});await context.close();
 }
 for(const options of [{lowPower:true},{userAgent:'Mozilla/5.0 Version/18.0 Safari/605.1.15'}]){
  const {page,context,errors}=await open(browser,server.url,options);await page.waitForTimeout(150);
  const filter=await page.locator('#sidebarToggleBtn').evaluate(e=>getComputedStyle(e).backdropFilter);
  assert.ok(!filter.includes('url('),'low-power and Safari-UA fallback avoids SVG backdrop');
  if(options.lowPower)assert.equal(await page.evaluate(()=>FrommGlass.count),0);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

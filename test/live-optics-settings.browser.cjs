'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.GLASS_SETTINGS_DIR;
const preview='.glass-preview-lens';
async function show(page){await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.locator('#glassSettingsBtn').click();await page.locator('[data-settings-tab="glass"]').click();}
async function optics(page){return page.locator(preview).evaluate(el=>{
 const face=el.querySelector('.control-glass-surface')||el,id=/url\(["']?#([^"')]+)/.exec(face.style.backdropFilter)?.[1],filter=document.getElementById(id);
 return {scales:[...filter?.querySelectorAll('feDisplacementMap')||[]].map(node=>Number(node.getAttribute('scale'))),blur:Number(filter?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')),tint:face.style.backgroundColor};
});}
async function channels(page,expected){await page.waitForFunction(({selector,expected})=>{
 const el=document.querySelector(selector),face=el?.querySelector('.control-glass-surface')||el,id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1],filter=document.getElementById(id),scales=[...filter?.querySelectorAll('feDisplacementMap')||[]].map(e=>Number(e.getAttribute('scale')));
 return scales.length===expected.length&&scales.every((n,i)=>Math.abs(n-expected[i])<.001);
},{selector:preview,expected});}
(async()=>{const server=await serve(),browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const {page,context,errors}=await open(browser,server.url,{...viewport,lowPower:true});
  await page.evaluate(()=>setFilter('image'));
  await show(page);
  if(viewport.width>700){await page.waitForFunction(()=>FrommControlGlass.snapshot.live>0);const resources=await page.evaluate(()=>FrommControlGlass.snapshot);assert.equal(resources.limit,null,'no engine count limit');assert.equal(resources.builds-resources.disposed,resources.live);}
  else await page.waitForFunction(()=>FrommGlass.count>0,null,{timeout:3000});
  await channels(page,[68]);
  const box=await page.locator('#glassSettingsDialog').boundingBox();assert.ok(box.width<=400&&box.x>=0&&box.y>=0&&box.y+box.height<=viewport.height+1,'compact panel fits screen');
  assert.equal(await page.locator('#glassSettingsDialog').evaluate(el=>el.matches(':modal')),viewport.width<700);
  if(viewport.width>700){assert.ok(box.x>viewport.width/2,'desktop panel leaves the page in view');await page.locator('[data-glow-nav="video"]').hover();await page.waitForFunction(()=>document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));}
  assert.equal(await page.locator('#glassSettingsDialog').evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter),'none');
  await page.locator('[name="refraction"]').fill('80');await channels(page,[160]);
  await page.locator('[name="blur"]').fill('6');await page.waitForFunction(selector=>{const el=document.querySelector(selector),face=el?.querySelector('.control-glass-surface')||el,id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return Number(document.getElementById(id)?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation'))===6;},preview);assert.equal((await optics(page)).blur,6,'small-control blur is not silently reduced');
  await page.locator('[name="blur"]').fill('0');
  await page.locator('[name="chromatic"]').fill('1');await channels(page,[159.44,160,160.56]);
  await page.locator('[name="refraction"]').fill('20');await channels(page,[39.86,40,40.14]);
  await page.locator('[name="chromatic"]').fill('50');await channels(page,[33,40,47]);
  assert.match((await optics(page)).tint,/, 0\)$/,'RGB separation never adds a material tint');
  if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'live-settings-'+viewport.width+'.png')});}
  await page.locator('[name="chromatic"]').fill('0');await channels(page,[40]);
  // A range whose minimum is nonzero still paints exactly 0% at its minimum.
  for(const value of [80,150]){
   const slider=page.locator('[name="saturation"]');await slider.fill(String(value));await slider.scrollIntoViewIfNeeded();
   assert.equal(await slider.evaluate(el=>el.style.getPropertyValue('--glass-range-fill')),value===80?'0%':'100%');
   const rect=await slider.boundingBox(),png=(await page.screenshot()).toString('base64');
   const sample=await page.evaluate(async({rect,png,value})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixel=[...ctx.getImageData(Math.floor(rect.x+rect.width*.85),Math.floor(rect.y+rect.height/2),1,1).data].slice(0,3),probe=document.createElement('span');probe.style.color=value===80?'var(--theme-selected)':'var(--theme-accent)';document.body.append(probe);const expected=getComputedStyle(probe).color.match(/[\d.]+/g).slice(0,3).map(Number);probe.remove();return{pixel,expected};},{rect,png,value});
   assert.ok(sample.pixel.every((channel,i)=>Math.abs(channel-sample.expected[i])<5),'actual track pixels agree with min/max fill: '+JSON.stringify(sample));
  }
  for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){
   await page.evaluate(theme=>FrommThemes.set(theme),theme);
   await channels(page,[40]);assert.equal(await page.locator('#scrollTopBtn').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)',theme+' top button remains clear');
  }
  await page.locator('#glassEnabled').uncheck();await page.waitForFunction(()=>FrommControlGlass.snapshot.live===0&&FrommGlass.count===0);
  await page.locator('#glassEnabled').check();await channels(page,[40]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>FrommControlGlass.snapshot.live===0&&FrommGlass.count===0);
  assert.deepEqual(errors,[]);await context.close();console.log(viewport.width+': low-memory full-strength optics, 1%/50%/0% RGB, exact range endpoints, six clear themes, live preview and accessibility PASS');
 }
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

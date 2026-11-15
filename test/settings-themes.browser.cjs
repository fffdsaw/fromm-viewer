'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const out=process.env.UIUX_RESULTS_DIR;
async function show(p){await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.locator('#glassSettingsBtn').click();await p.locator('#glassSettingsDialog[open]').waitFor();}
async function inside(p){await p.waitForFunction(()=>{const r=document.querySelector('#glassSettingsDialog').getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;},null,{timeout:3000});const box=await p.locator('#glassSettingsDialog').boundingBox(),view=p.viewportSize();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=view.width+1&&box.y+box.height<=view.height+1,'settings fit viewport');return box;}
const contrast=(fg,bg)=>{const lum=rgb=>{const s=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return s[0]*.2126+s[1]*.7152+s[2]*.0722;};const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
(async()=>{const s=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});try{
 for(const [width,height]of [[1440,900],[900,560],[390,844]]){
  const {page:p,context,errors}=await open(browser,s.url,{width,height});
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});await show(p);await inside(p);
  assert.equal(await p.locator('[role="tab"]').count(),4);
  for(const category of ['general','theme','glass','advanced']){
   await p.locator(`[data-settings-tab="${category}"]`).click();
   assert.equal(await p.locator('[role="tabpanel"]:visible').count(),1);
   const violations=await p.evaluate(async()=>{const r=await axe.run('#glassSettingsDialog',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});assert.deepEqual(violations,[],category+' accessible');
  }
  await p.locator('[data-settings-tab="theme"]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('[data-settings-tab="glass"]').getAttribute('aria-selected'),'true','keyboard category navigation');
  const initial=await inside(p);await p.locator('[name="refraction"]').fill('52');await p.locator('[name="refraction"]').dispatchEvent('change');assert.equal(await p.evaluate(()=>FrommGlassSettings.value.refraction),52);assert.deepEqual(await inside(p),initial,'slider never drags dialog');
  if(width>700){
   const head=await p.locator('.glass-settings-head').boundingBox();await p.mouse.move(head.x+60,head.y+25);await p.mouse.down();await p.mouse.move(20,20,{steps:8});await p.mouse.up();const moved=await inside(p);assert.ok(Math.abs(moved.x-initial.x)>10,'titlebar moves panel');
   const again=await p.locator('.glass-settings-head').boundingBox();await p.mouse.move(again.x+60,again.y+25);await p.mouse.down();await p.mouse.move(width+300,height+300,{steps:8});await p.mouse.up();await inside(p);
  }
  await p.locator('[data-settings-tab="theme"]').click();
  for(const name of ['aqua','sky','lavender','neutral','glow']){
   await p.locator(`[data-theme-choice="${name}"]`).click();assert.equal(await p.evaluate(()=>FrommThemes.value),name);assert.equal(await p.locator(`[data-theme-choice="${name}"]`).getAttribute('aria-pressed'),'true');
   const resources=await p.evaluate(()=>FrommControlGlass.snapshot);assert.ok(resources.live<=resources.limit&&resources.builds-resources.disposed===resources.live,'theme changes retain bounded engine resources');
   const surfaces=await p.evaluate(()=>{const text=document.querySelector('.msg.star .bubble:has(>.text)'),sidebar=document.querySelector('#sidebar');return{background:getComputedStyle(document.body).backgroundColor,text:getComputedStyle(text).color,card:getComputedStyle(text).backgroundColor,sidebar:getComputedStyle(sidebar).backgroundColor}});assert.ok(contrast(surfaces.text,surfaces.card)>=4.5,name+' conversation text meets AA contrast');
   const colors=await p.locator('.glass-settings-body').evaluate(el=>{const p=el.querySelector('section:not([hidden]) p');return{fg:getComputedStyle(p).color,bg:getComputedStyle(document.querySelector('#glassSettingsDialog')).backgroundColor}});assert.ok(contrast(colors.fg,colors.bg)>=4.5,name+' settings text meets AA contrast');
  }
  await p.locator('[data-theme-choice="sky"]').click();
  if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'settings-'+width+'.png')});}
  const saved=await inside(p);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
  await p.reload();await seed(p);assert.equal(await p.evaluate(()=>FrommThemes.value),'sky');assert.equal(await p.evaluate(()=>FrommGlassSettings.value.refraction),52);
  await show(p);const restored=await inside(p);if(width>700)assert.ok(Math.abs(saved.x-restored.x)<1&&Math.abs(saved.y-restored.y)<1,'last position restored');
  await p.setViewportSize({width:390,height:500});await inside(p);await p.setViewportSize({width,height});await inside(p);
  await p.locator('.glass-settings-reset').click();assert.equal(await p.evaluate(()=>FrommThemes.value),'glow');assert.deepEqual(await p.evaluate(()=>FrommGlassSettings.value),await p.evaluate(()=>FrommGlassSettings.defaults));assert.equal(await p.evaluate(()=>state.messages.length),180,'presentation reset preserves conversation');
  for(let i=0;i<18;i++){await p.keyboard.press('Tab');assert.equal(await p.locator('#glassSettingsDialog').evaluate(el=>el.contains(document.activeElement)),true,'focus remains in modal');}
  await p.locator('.glass-settings-done').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await context.close();console.log(width+'x'+height+': settings categories/AA/keyboard, slider, drag bounds, themes, reload, resize, reset and preserved data PASS');
 }
 const context=await browser.newContext();await context.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError')}});const p=await context.newPage();await p.route('**/*',route=>new URL(route.request().url()).origin===new URL(s.url).origin?route.continue():route.abort());await p.goto(s.url);await seed(p);await show(p);await p.locator('[data-settings-tab="theme"]').click();await p.locator('[data-theme-choice="aqua"]').click();assert.equal(await p.evaluate(()=>FrommThemes.value),'aqua','theme usable without storage');assert.equal(await p.evaluate(()=>FrommThemes.persistent),false);await context.close();console.log('Blocked storage: current-window preferences remain usable PASS');
}finally{await browser.close();await s.close()}})().catch(error=>{console.error(error);process.exitCode=1});

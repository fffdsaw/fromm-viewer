'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const key='fromm.pcGlass.v1',out=process.env.GLASS_SETTINGS_DIR;
const ready=p=>p.waitForFunction(()=>window.FrommControlGlass?.snapshot.live>=2,null,{timeout:7000});
const navFace='.glowme-nav [aria-current="page"] .control-glass-surface';
function scale(p){return p.locator(navFace).evaluate(e=>{
 const id=/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)?.[1];
 return Number(document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale'));
});}
const geometry=p=>p.evaluate(()=>Object.fromEntries(['.viewer-header','#timeline','.media-card','.card-download','#sortBtn'].map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()])));
async function shot(p,name){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}}
(async()=>{const s=await serve(),b=await chromium.launch(process.env.PUBLIC_SHA?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{}),url=process.env.PUBLIC_SHA?'https://fffdsaw.github.io/fromm-viewer/?deployment='+process.env.PUBLIC_SHA:s.url;
 const high={newContext:async options=>{const c=await b.newContext(options);await c.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>8});});return c;}};
 try{
 for(const opt of [{width:1440,height:900},{width:760,height:900},{width:900,height:700,installed:true},{width:900,height:560}]){
  const{page:p,context,errors}=await open(high,url,opt);await p.evaluate(()=>setFilter('image'));await ready(p);
  assert.equal(await p.evaluate(()=>FrommGlass.count),0);
  assert.equal(await p.locator('.header-glass-surface,.sidebar-glass-surface').count(),0);
  assert.equal(await p.locator('.viewer-header').evaluate(e=>getComputedStyle(e,'::after').backgroundColor),'rgb(224, 241, 233)');
  assert.equal(await p.locator('#sidebar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(224, 241, 233)');
  await p.waitForFunction(selector=>document.querySelector(selector)?.style.backdropFilter.includes('url('),navFace);
  const originalScale=await scale(p);
  await p.locator('.media-card').first().click({position:{x:30,y:30}});await p.waitForFunction(()=>state.selected.size===1);
  const before=await geometry(p),label=opt.width+'x'+opt.height+(opt.installed?'-pwa':'');await shot(p,label+'-clear');
  await p.locator('#glassSettingsBtn').click();assert.equal(await p.locator('dialog[open]').count(),1);assert.deepEqual(await geometry(p),before);
  await shot(p,label+'-settings');
  const chosen={refraction:60,thickness:40,blur:4,saturation:120,opacity:40,specular:20};
  for(const[k,value]of Object.entries(chosen)){await p.locator(`[name="${k}"]`).fill(String(value));await p.locator(`[name="${k}"]`).dispatchEvent('change');}
  await p.waitForFunction(({selector,original})=>{
   const e=document.querySelector(selector),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1];
   const map=document.getElementById(id),value=Number(map?.querySelector('feDisplacementMap')?.getAttribute('scale'));
   return value>original&&!!map.querySelector('feImage[result="specMap"]');
  },{selector:navFace,original:originalScale});
  assert.deepEqual(await p.evaluate(()=>FrommGlassSettings.value),{enabled:true,...chosen});
  const strongerScale=await scale(p);
  await p.locator('[name="refraction"]').fill('10');
  await p.waitForFunction(({selector,previous})=>{
   const e=document.querySelector(selector),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1];
   const value=Number(document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale'));
   return value>0&&value<previous;
  },{selector:navFace,previous:strongerScale});
  await p.locator('[name="refraction"]').fill('60');
  await p.locator('[name="refraction"]').dispatchEvent('change');
  assert.deepEqual(await geometry(p),before,'material changes do not move cards or tools');
  for(let i=0;i<13;i++){await p.keyboard.press('Tab');assert.equal(await p.locator('#glassSettingsDialog').evaluate(e=>e.contains(document.activeElement)),true,'native dialog contains keyboard focus');}
  await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement.id),'glassSettingsBtn');assert.equal(await p.evaluate(()=>state.selected.size),1);
  await p.reload();await seed(p);await p.evaluate(()=>setFilter('image'));await ready(p);assert.deepEqual(await p.evaluate(()=>FrommGlassSettings.value),{enabled:true,...chosen},'sliders restore after reload');
  await p.locator('#glassSettingsBtn').click();await p.locator('#glassEnabled').uncheck();await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0);assert.equal(await p.locator('#glass-refraction').isDisabled(),true);assert.equal(await p.locator('.control-glass-surface').count(),0);
  await p.locator('.glass-settings-reset').click();await ready(p);assert.deepEqual(await p.evaluate(()=>FrommGlassSettings.value),await p.evaluate(()=>FrommGlassSettings.defaults));
  await p.locator('.glass-settings-done').click();
  await p.evaluate(()=>{for(let i=0;i<10;i++)FrommGlassSettings.set({enabled:i%2===0,refraction:30+i},{immediate:true});FrommGlassSettings.reset();});await ready(p);
  const live=await p.evaluate(()=>FrommControlGlass.snapshot);
  assert.ok(live.live<=live.limit&&live.builds-live.disposed===live.live,'rapid toggles leave only bounded live control maps');
  if(opt.width===1440){
   const second=await open({newContext:async()=>context},url,opt);await second.page.evaluate(()=>FrommGlassSettings.set({refraction:50},{immediate:true}));await p.waitForFunction(()=>FrommGlassSettings.value.refraction===50);await second.page.close();await p.evaluate(()=>FrommGlassSettings.reset());await ready(p);
   await p.locator('#glassSettingsBtn').click();await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await p.evaluate(async()=>{const r=await axe.run('#glassSettingsDialog',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>v.id)});assert.deepEqual(violations,[]);await p.keyboard.press('Escape');
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(label+': opaque panes, actual control sliders, reload/reset/off, focus and bounded cleanup PASS');
 }
 const invalid={newContext:async options=>{const c=await high.newContext(options);await c.addInitScript(()=>localStorage.setItem('fromm.pcGlass.v1',JSON.stringify({enabled:true,refraction:-99,thickness:900,blur:'bad',saturation:null,opacity:900,specular:-1})));return c;}};
 const malformed=await open(invalid,url);assert.deepEqual(await malformed.page.evaluate(()=>FrommGlassSettings.value),{enabled:true,refraction:0,thickness:60,blur:0,saturation:108,opacity:60,specular:0});assert.deepEqual(malformed.errors,[]);await malformed.context.close();console.log('Invalid saved values are clamped or restored without exposing unknown options PASS');
 const unavailable={newContext:async options=>{const c=await high.newContext(options);await c.addInitScript(()=>{for(const name of ['getItem','setItem']){const original=Storage.prototype[name];Storage.prototype[name]=function(k,...args){if(k==='fromm.pcGlass.v1')throw new DOMException('fixture blocked','SecurityError');return original.call(this,k,...args)}}});return c;}};
 const ephemeral=await open(unavailable,url);await ready(ephemeral.page);await ephemeral.page.locator('#glassSettingsBtn').click();await ephemeral.page.locator('[name="refraction"]').fill('50');await ephemeral.page.locator('[name="refraction"]').dispatchEvent('change');await ephemeral.page.waitForFunction(()=>FrommGlassSettings.value.refraction===50);assert.match(await ephemeral.page.locator('.glass-settings-note').textContent(),/현재 창/);assert.deepEqual(ephemeral.errors,[]);await ephemeral.context.close();console.log('Unavailable preference storage keeps usable live controls and current-window settings PASS');
 const mobile=await open(high,url,{width:390,height:844});assert.equal(await mobile.page.locator('#glassSettingsBtn').count(),0);assert.equal(await mobile.page.locator('.glass-pane-on').count(),0);await mobile.page.evaluate(()=>setFilter('image'));await mobile.page.locator('.media-card').first().click({position:{x:30,y:30}});await mobile.page.waitForFunction(()=>state.selected.size===1);assert.equal(await mobile.page.locator('#saveSelectedBtn').isEnabled(),true);assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(mobile.errors,[]);await mobile.context.close();console.log('Mobile representative: no PC settings/material changes, selection/save and viewport intact PASS');
 }finally{await b.close();await s.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

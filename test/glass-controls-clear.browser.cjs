'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const {plain}=require('./helpers/clear-controls.cjs');
const output=process.env.CLEAR_CONTROLS_DIR;
async function rail(page){return page.locator('.rail-lens-surface').evaluate(e=>{const id=/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)?.[1],f=document.getElementById(id);return {scales:[...f?.querySelectorAll('feDisplacementMap')||[]].map(e=>+e.getAttribute('scale')),blur:Number(f?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')),saturation:Number(f?.querySelector('feColorMatrix[type="saturate"]')?.getAttribute('values')),map:f?.querySelector('feImage[result="dispMap"]')?.getAttribute('href')}});}
(async()=>{const s=await serve(),b=await chromium.launch();try{
 for(const config of [{width:1440,height:900},{width:900,height:700,installed:true},{width:390,height:844}]){
  const {page:p,context,errors}=await open(b,s.url,config);await p.evaluate(()=>{setFilter('image');chooseDownloadItem('media',state.infiniteList[0]);});
  for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){
   await p.evaluate(t=>FrommThemes.set(t),theme);await p.mouse.move(config.width-2,config.height-2);
   for(const selector of ['.card-download','#saveSelectedBtn','#selectAllBtn','#sortBtn'])if(await p.locator(selector).first().isVisible())await plain(p,selector);
   assert.equal(await p.locator('.capsule-save-control').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.equal(await p.evaluate(()=>FrommGlowME.capsule.builds),0,'native Save never creates a capsule engine');
  }
  const action=await p.locator('.card-download').first().evaluate(e=>{window.preservedAction=e;const css=getComputedStyle(e);return {fill:css.backgroundColor,filter:css.backdropFilter,shadow:css.boxShadow};});
  const actionBuilds=await p.evaluate(()=>FrommFixedGlass.snapshot.builds);
  for(const patch of [{refraction:80,chromatic:100,blur:6,saturation:150,opacity:60,specular:60},{refraction:0,chromatic:0,blur:0,saturation:80,opacity:0,specular:0}]){
   await p.evaluate(patch=>FrommGlassSettings.set(patch,{immediate:true,persist:false}),patch);await p.waitForTimeout(120);
   assert.deepEqual(await p.locator('.card-download').first().evaluate(e=>{const css=getComputedStyle(e);return {fill:css.backgroundColor,filter:css.backdropFilter,shadow:css.boxShadow};}),action,'sliders cannot change CSS droplets');
  }
  assert.equal(await p.evaluate(()=>FrommFixedGlass.snapshot.builds),actionBuilds,'sliders do not bake ordinary action maps');assert.equal(await p.locator('.card-download').first().evaluate(e=>e===preservedAction),true);assert.equal(await p.locator('.card-download :is(feDisplacementMap,filter,.fixed-glass-surface)').count(),0);
  const selectAll=p.locator('#selectAllBtn');await selectAll.dispatchEvent('click');assert.ok(await p.evaluate(()=>state.selected.size)>1);assert.equal(await p.evaluate(()=>FrommFixedGlass.snapshot.builds),actionBuilds);
  if(config.width>700){
   const target=p.locator('#selectAllBtn'),box=await target.boundingBox();await p.mouse.move(box.x+4,box.y+6);await p.waitForTimeout(80);const first=await target.evaluate(e=>({x:e.style.getPropertyValue('--clear-pointer-x'),paint:getComputedStyle(e,'::before').backgroundImage}));await target.dispatchEvent('pointermove',{clientX:box.x+box.width-4,clientY:box.y+box.height-6,pointerType:'mouse'});await p.waitForFunction(x=>document.querySelector('#selectAllBtn').style.getPropertyValue('--clear-pointer-x')!==x,first.x);const second=await target.evaluate(e=>({x:e.style.getPropertyValue('--clear-pointer-x'),paint:getComputedStyle(e,'::before').backgroundImage}));assert.notEqual(first.x,second.x);assert.notEqual(first.paint,second.paint);assert.match(second.paint,/radial-gradient/);await plain(p,'#selectAllBtn');
   await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.waitForTimeout(300);await p.locator('[data-glow-nav="sound"]').hover();await p.waitForFunction(()=>{const e=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1];return !!document.querySelector('#'+id+' [data-rail-neutral]')});
   await p.waitForFunction(()=>{const e=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1],image=document.querySelector('#'+id+' feImage[result="dispMap"]');return image&&Math.abs(Number(image.getAttribute('width'))-(e.getBoundingClientRect().width-2*Number(image.getAttribute('x'))))<1;});
   const fixed=await rail(p);assert.deepEqual(fixed.scales,[110.72,160,209.28]);assert.equal(fixed.blur,0);assert.equal(fixed.saturation,.8);
   for(const patch of [{refraction:0,thickness:4,blur:6,saturation:150,chromatic:0,opacity:0,specular:0},{refraction:20,thickness:28,chromatic:100,opacity:28,specular:60}]){await p.evaluate(patch=>FrommGlassSettings.set(patch,{immediate:true,persist:false}),patch);await p.waitForTimeout(180);assert.deepEqual(await rail(p),fixed,'global sliders cannot change the sidebar preset');}
   await p.evaluate(()=>FrommGlassSettings.set({enabled:false},{immediate:true,persist:false}));await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0);await plain(p,'.card-download');await p.evaluate(()=>FrommGlassSettings.reset());
   await p.mouse.move(config.width-2,400);await p.evaluate(()=>scrollTo(0,900));await p.locator('#scrollTopBtn.visible').waitFor();await plain(p,'#scrollTopBtn');await p.locator('#scrollTopBtn').click();await p.waitForFunction(()=>scrollY<2);
  }
  const download=p.waitForEvent('download');await p.locator('.card-download').first().click();assert.ok(fs.statSync(await(await download).path()).size>0,'native download still returns fixture bytes');
  if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,'clear-'+config.width+'.png')});}
  await p.emulateMedia({reducedMotion:'reduce'});await plain(p,'.card-download');await p.emulateMedia({forcedColors:'active'});await p.waitForFunction(()=>FrommFixedGlass.snapshot.count===0);await p.emulateMedia({forcedColors:'none'});await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(160);await plain(p,'.card-download');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(config.width+': six palettes, native actions, immediate CSS droplets/zero optical maps, pointer glint, independent presets and accessibility PASS');
 }
}finally{await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

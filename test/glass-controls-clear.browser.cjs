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
  await p.waitForFunction(()=>document.querySelector('.card-download .fixed-glass-surface')?.dataset.fixedMaterial==='ready');
  const fixedAction=await p.locator('.card-download .fixed-glass-surface').first().evaluate(e=>{window.preservedFixedAction=e;return {map:e.style.backgroundImage,filter:e.style.backdropFilter};});
  assert.match(fixedAction.map,/url\(/,'actual SDK specular map is installed');assert.equal(fixedAction.filter,'blur(0.4px) saturate(1.17)');
  assert.deepEqual(await p.evaluate(()=>FrommFixedGlass.preset),{refraction:0,thickness:11,blur:.4,saturation:117,chromatic:0,opacity:51,specular:26});
  const actionBuilds=await p.evaluate(()=>FrommFixedGlass.snapshot.builds);
  for(const patch of [{refraction:80,chromatic:100,blur:6,saturation:150,opacity:60,specular:60},{refraction:0,chromatic:0,blur:0,saturation:80,opacity:0,specular:0}]){
   await p.evaluate(patch=>FrommGlassSettings.set(patch,{immediate:true,persist:false}),patch);await p.waitForTimeout(120);
   assert.deepEqual(await p.locator('.card-download .fixed-glass-surface').first().evaluate(e=>({map:e.style.backgroundImage,filter:e.style.backdropFilter})),fixedAction,'sliders cannot change fixed actions');
  }
  assert.equal(await p.evaluate(()=>FrommFixedGlass.snapshot.builds),actionBuilds,'slider input never rebuilds action maps');
  assert.equal(await p.locator('.card-download .fixed-glass-surface').first().evaluate(e=>e===preservedFixedAction),true);
  assert.equal(await p.locator('.card-download feDisplacementMap,.card-download filter').count(),0,'fixed chrome never constructs a displacement/RGB filter');
  const selectAll=p.locator('#selectAllBtn');await p.waitForFunction(()=>document.querySelector('#selectAllBtn .fixed-glass-surface')?.dataset.fixedMaterial==='ready');
  await selectAll.evaluate(e=>{window.fixedSelectFace=e.querySelector('.fixed-glass-surface');});
  const beforeToggle=await p.evaluate(()=>FrommFixedGlass.snapshot.builds);await selectAll.dispatchEvent('click');await p.waitForTimeout(120);
  assert.equal(await selectAll.evaluate(e=>e.querySelector('.fixed-glass-surface')===fixedSelectFace),true,'native text changes retain the exact fixed material');
  assert.equal(await p.evaluate(()=>FrommFixedGlass.snapshot.builds),beforeToggle,'selection does not bake another specular map');
  if(config.width>700){
   const target=p.locator('#selectAllBtn'),box=await target.boundingBox();await p.mouse.move(box.x+4,box.y+6);await p.waitForTimeout(80);const first=await target.evaluate(e=>({x:e.style.getPropertyValue('--clear-pointer-x'),paint:getComputedStyle(e).backgroundImage}));await p.mouse.move(box.x+box.width-4,box.y+box.height-6);await p.waitForTimeout(80);const second=await target.evaluate(e=>({x:e.style.getPropertyValue('--clear-pointer-x'),paint:getComputedStyle(e).backgroundImage}));assert.notEqual(first.x,second.x);assert.notEqual(first.paint,second.paint);assert.match(second.paint,/radial-gradient/);await plain(p,'#selectAllBtn');
   await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.waitForTimeout(300);await p.locator('[data-glow-nav="sound"]').hover();await p.waitForFunction(()=>{const e=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1];return !!document.querySelector('#'+id+' [data-rail-neutral]')});
   await p.waitForFunction(()=>{const e=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(e?.style.backdropFilter)?.[1],image=document.querySelector('#'+id+' feImage[result="dispMap"]');return image&&Math.abs(Number(image.getAttribute('width'))-(e.getBoundingClientRect().width-2*Number(image.getAttribute('x'))))<1;});
   const fixed=await rail(p);assert.deepEqual(fixed.scales,[110.72,160,209.28]);assert.equal(fixed.blur,0);assert.equal(fixed.saturation,.8);
   for(const patch of [{refraction:0,thickness:4,blur:6,saturation:150,chromatic:0,opacity:0,specular:0},{refraction:20,thickness:28,chromatic:100,opacity:28,specular:60}]){await p.evaluate(patch=>FrommGlassSettings.set(patch,{immediate:true,persist:false}),patch);await p.waitForTimeout(180);assert.deepEqual(await rail(p),fixed,'global sliders cannot change the sidebar preset');}
   await p.evaluate(()=>FrommGlassSettings.set({enabled:false},{immediate:true,persist:false}));await p.waitForFunction(()=>FrommControlGlass.snapshot.live===0);await plain(p,'.card-download');await p.evaluate(()=>FrommGlassSettings.reset());
   await p.mouse.move(config.width-2,400);await p.evaluate(()=>scrollTo(0,900));await p.locator('#scrollTopBtn.visible').waitFor();await plain(p,'#scrollTopBtn');await p.locator('#scrollTopBtn').click();await p.waitForFunction(()=>scrollY<2);
  }
  const download=p.waitForEvent('download');await p.locator('.card-download').first().click();assert.ok(fs.statSync(await(await download).path()).size>0,'native download still returns fixture bytes');
  if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,'clear-'+config.width+'.png')});}
  await p.emulateMedia({reducedMotion:'reduce'});await plain(p,'.card-download');await p.emulateMedia({forcedColors:'active'});await p.waitForFunction(()=>FrommFixedGlass.snapshot.count===0);await p.emulateMedia({forcedColors:'none'});await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>getComputedStyle(document.querySelector('.card-download')).backgroundColor==='rgba(0, 0, 0, 0)');await plain(p,'.card-download');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(config.width+': six palettes, native actions, real fixed SDK specular/zero distortion, pointer glint, independent presets and accessibility PASS');
 }
}finally{await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

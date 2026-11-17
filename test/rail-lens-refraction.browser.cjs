'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
async function pixelDifference(page,a,b){return page.evaluate(async([a,b])=>{const pixels=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {data:ctx.getImageData(0,0,c.width,c.height).data,width:c.width};};const [first,second]=await Promise.all([pixels(a),pixels(b)]),x=first.data,y=second.data;let count=0;const rows=new Set();for(let i=0;i<x.length;i+=4)if(Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]))>8){count++;rows.add(Math.floor(i/4/first.width));}return {count,rows:rows.size};},[a.toString('base64'),b.toString('base64')]);}
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true});try{
 const {page,context,errors}=await open(browser,server.url,{width:1440,height:900});
 await page.evaluate(()=>{FrommGlowME.setRailOpen(true);scrollTo(0,0)});await page.waitForTimeout(400);
 const all=page.locator('[data-glow-nav="all"]'),media=page.locator('[data-glow-nav="media"]'),lens=page.locator('.rail-pointer-light');
 assert.equal(await page.locator('.rail-liquid-layer,.rail-lens-drop').count(),0,'one real lens, no pinching membrane or falling drops');
 for(const theme of ['glow','sky','classic']){
  await page.evaluate(async()=>{await setFilter('all');FrommGlowME.setRailOpen(true)});await page.waitForTimeout(300);await page.evaluate(t=>FrommThemes.set(t),theme);await all.hover();await page.waitForFunction(()=>document.querySelector('.rail-lens-surface')?.style.backdropFilter.includes('url('));
  assert.equal(await page.locator('.rail-lens-surface').evaluate(el=>getComputedStyle(el).visibility),'visible','ordinary hover shows the actual lens without pressing');
  const selected=page.locator('.glowme-nav button[aria-current="page"]'),base=await selected.evaluate(el=>getComputedStyle(el).backgroundColor),before=await media.boundingBox();
  const id=await page.locator('.rail-lens-surface').evaluate(el=>/url\(["']?#([^"')]+)/.exec(el.style.backdropFilter)[1]),builds=await page.evaluate(()=>FrommControlGlass.snapshot.builds);
  const label=await all.locator('span').boundingBox(),box=await all.boundingBox();
  // Move the physical pointer through the label; the lens follows without a
  // settling animation and its top edge crosses the source text.
  const x=box.x+box.width/2,y=label.y+label.height/2+box.height/2;
  await page.mouse.move(x,y,{steps:12});await page.waitForTimeout(80);
  const pose=await lens.boundingBox();assert.ok(Math.abs(pose.y-(y-box.height/2))<1,'lens follows the input position');
  assert.equal(await lens.evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return m.a===1&&m.d===1&&m.b===0&&m.c===0}),true,'no scale, stretch or rotation');
  await page.waitForTimeout(180);assert.deepEqual(await lens.boundingBox(),pose,'stopped pointer has no spring or settling motion');assert.equal(await selected.evaluate(el=>getComputedStyle(el).backgroundColor),base,'selected marker remains');
  const maps=page.locator('#'+id+' feDisplacementMap'),scales=await maps.evaluateAll(es=>es.map(e=>Number(e.getAttribute('scale'))));assert.equal(scales.length,3);assert.ok(scales[0]<scales[1]&&scales[1]<scales[2]);assert.equal(scales[1],160,'menu uses the fixed screenshot preset');assert.equal(await page.locator('#'+id+' [data-rail-neutral]').count(),1,'continuous normalized field is installed');
  const clip=label,optical=await page.screenshot({clip});await maps.evaluateAll(es=>es.forEach(e=>e.setAttribute('scale','0')));await page.waitForTimeout(60);const plain=await page.screenshot({clip});const difference=await pixelDifference(page,optical,plain);assert.ok(difference.count>30&&difference.rows>=5,JSON.stringify({theme,difference})+' continuous refraction spans more than a thin two-pixel cut');
  await maps.evaluateAll((es,value)=>es.forEach(e=>e.setAttribute('scale',String(value))),scales[1]);await page.waitForTimeout(60);assert.ok((await pixelDifference(page,optical,await page.screenshot({clip}))).count>5,'RGB separation remains visible');await maps.evaluateAll((es,values)=>es.forEach((e,i)=>e.setAttribute('scale',String(values[i]))),scales);
  if(process.env.RAIL_REFRACTION_DIR){fs.mkdirSync(process.env.RAIL_REFRACTION_DIR,{recursive:true});await page.screenshot({path:process.env.RAIL_REFRACTION_DIR+'/glyph-'+theme+'.png',clip:{x:0,y:55,width:280,height:180}});}
  if(theme==='glow'){
   for(const value of [80,0,34]){
    await page.evaluate(refraction=>FrommGlassSettings.set({refraction},{immediate:true,persist:false}),value);await page.waitForTimeout(100);
    await page.waitForFunction(({id,value})=>Number(document.querySelectorAll('#'+id+' feDisplacementMap')[1]?.getAttribute('scale'))===160,{id,value});
    await page.waitForFunction(id=>!!document.querySelector('#'+id+' [data-rail-neutral]'),id);
    assert.equal(await page.locator('#'+id+' feDisplacementMap').evaluateAll(es=>es.every(e=>e.getAttribute('in2')==='railDispMap')),true,'global settings retain the fixed sidebar field');
   }
  }
  await media.hover();assert.deepEqual(await media.boundingBox(),before);assert.equal(await page.evaluate(()=>FrommControlGlass.snapshot.builds),builds);await media.click();assert.equal(await page.evaluate(()=>state.filter),'media');
 }
 await page.mouse.move(800,500);assert.equal(await page.locator('.glowme-nav').evaluate(el=>el.classList.contains('rail-pointer-tracking')),false);
 await page.emulateMedia({reducedMotion:'reduce'});await all.hover();assert.equal(await lens.isVisible(),false);await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({forcedColors:'active'});assert.equal(await lens.isVisible(),false);
 assert.deepEqual(errors,[]);await context.close();console.log('Three themes: direct pointer optics, no spring/stretch/settling, actual glyph refraction/RGB separation, retained selection, one reused lens, routes/accessibility PASS');
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
async function pixelDifference(page,a,b){return page.evaluate(async([a,b])=>{const pixels=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};const [x,y]=await Promise.all([pixels(a),pixels(b)]);let count=0;for(let i=0;i<x.length;i+=4)if(Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]))>8)count++;return count;},[a.toString('base64'),b.toString('base64')]);}
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true});try{
 const {page,context,errors}=await open(browser,server.url,{width:1440,height:900});
 await page.evaluate(()=>{FrommGlowME.setRailOpen(true);scrollTo(0,0)});await page.waitForTimeout(400);
 const all=page.locator('[data-glow-nav="all"]'),media=page.locator('[data-glow-nav="media"]'),lens=page.locator('.rail-pointer-light');
 assert.equal(await page.locator('.rail-liquid-layer,.rail-lens-drop').count(),0,'one real lens, no pinching membrane or falling drops');
 for(const theme of ['glow','sky','classic']){
  await page.evaluate(t=>FrommThemes.set(t),theme);await all.hover();await page.waitForFunction(()=>document.querySelector('.rail-pointer-light').dataset.phase==='idle'&&document.querySelector('.rail-lens-surface')?.style.backdropFilter.includes('url('));await page.waitForTimeout(150);
  const id=await page.locator('.rail-lens-surface').evaluate(el=>/url\(["']?#([^"')]+)/.exec(el.style.backdropFilter)[1]),builds=await page.evaluate(()=>FrommControlGlass.snapshot.builds),before=await media.boundingBox();
  await page.evaluate(()=>{window.__lensFrames=[];const end=performance.now()+1300;const sample=()=>{const el=document.querySelector('.rail-pointer-light'),r=el.getBoundingClientRect(),label=document.querySelector('[data-glow-nav="all"] span').getBoundingClientRect();__lensFrames.push({phase:el.dataset.phase,y:r.y,bottom:r.bottom,labelY:label.y,labelBottom:label.bottom,transform:el.style.transform,rim:el.style.getPropertyValue('--rail-pass-rim')});if(performance.now()<end)window.__lensRAF=requestAnimationFrame(sample);};window.__lensRAF=requestAnimationFrame(sample);});
  await media.hover();await page.waitForFunction(()=>document.querySelector('.rail-pointer-light').dataset.phase==='idle'&&document.querySelector('.rail-pointer-light').dataset.target==='media');
  const frames=await page.evaluate(()=>{cancelAnimationFrame(__lensRAF);return __lensFrames;});
  const crossing=frames.find(f=>f.phase==='moving'&&f.y>f.labelY&&f.y<f.labelBottom);
  assert.ok(crossing,'the real curved boundary passes through the source label');assert.ok(frames.filter(f=>f.phase==='moving').length>=3,'continuous travel between rows');
  assert.deepEqual(await media.boundingBox(),before,'optics never move menu hit targets');assert.equal(await page.evaluate(()=>FrommControlGlass.snapshot.builds),builds,'travel does not allocate engines');
  const maps=page.locator('#'+id+' feDisplacementMap'),scales=await maps.evaluateAll(es=>es.map(e=>Number(e.getAttribute('scale'))));
  assert.equal(scales.length,3,'actual RGB displacement paths');assert.ok(scales[0]<scales[1]&&scales[1]<scales[2],'dispersion separates channel sampling');
  // Replay one actually sampled moving frame, holding geometry stable while
  // comparing the real backdrop's pixels with displacement/chroma removed.
  await lens.evaluate((el,f)=>{el.style.transform=f.transform;el.style.setProperty('--rail-pass-rim',f.rim);el.classList.add('rail-light-moving');},crossing);
  const clip=await all.locator('span').boundingBox();await page.waitForTimeout(60);const optical=await page.screenshot({clip});
  await maps.evaluateAll(es=>es.forEach(e=>e.setAttribute('scale','0')));await page.waitForTimeout(60);const plain=await page.screenshot({clip});
  assert.ok(await pixelDifference(page,optical,plain)>10,'crossing lens visibly refracts actual label pixels');
  await maps.evaluateAll((es,value)=>es.forEach(e=>e.setAttribute('scale',String(value))),scales[1]);await page.waitForTimeout(60);const achromatic=await page.screenshot({clip});
  assert.ok(await pixelDifference(page,optical,achromatic)>5,'RGB separation is visible on actual label edges');
  await maps.evaluateAll((es,values)=>es.forEach((e,i)=>e.setAttribute('scale',String(values[i]))),scales);
  if(process.env.RAIL_REFRACTION_DIR){fs.mkdirSync(process.env.RAIL_REFRACTION_DIR,{recursive:true});await page.screenshot({path:process.env.RAIL_REFRACTION_DIR+'/glyph-'+theme+'.png',clip:{x:0,y:55,width:280,height:180}});}
  await page.mouse.move(800,500);await all.hover();await media.hover();await media.click();assert.equal(await page.evaluate(()=>state.filter),'media');assert.equal(await lens.getAttribute('data-phase'),'idle','click cancels motion');
  await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.waitForTimeout(300);
 }
 await page.mouse.move(800,500);assert.equal(await page.locator('.glowme-nav').evaluate(el=>el.classList.contains('rail-pointer-tracking')),false);
 await page.emulateMedia({reducedMotion:'reduce'});await all.hover();assert.equal(await lens.isVisible(),false);await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({forcedColors:'active'});assert.equal(await lens.isVisible(),false);
 assert.deepEqual(errors,[]);await context.close();console.log('Three themes: actual moving boundary refracts label pixels + visible RGB separation; one reused lens, fixed hits, click/leave/accessibility PASS');
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

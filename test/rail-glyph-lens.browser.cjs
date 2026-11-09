'use strict';
// The supplied calendar clip is reference only; recording contains synthetic Viewer data.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})}),out=process.env.CONVERSATION_DIR;
 const high={newContext:async options=>{const context=await browser.newContext({...options,...(out?{recordVideo:{dir:path.join(out,'rail-motion'),size:{width:1440,height:900}}}:{})});await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8})});return context}};
 try{for(const cfg of [{width:1440},{width:780,installed:true}]){
  const {page,context,errors}=await open(high,server.url,cfg);await page.locator('#sidebar').hover({position:{x:20,y:20}});await page.waitForTimeout(350);
  const artist=await page.locator('.room.active').evaluate(e=>({background:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow,outline:getComputedStyle(e.querySelector('.rail-avatar')).outline}));
  await page.locator('[data-glow-nav="sound"]').hover();await page.waitForFunction(()=>{const face=document.querySelector('.rail-lens-surface'),id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return document.querySelector('.rail-pointer-light')?.dataset.controlOptics==='engine'&&document.getElementById(id)?.querySelector('feImage[result="specMap"]')});await page.waitForTimeout(350);
  const mapId=await page.locator('.rail-lens-surface').evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]),before=await page.locator('.rail-pointer-light').boundingBox(),builds=await page.evaluate(()=>FrommControlGlass.snapshot.builds);
  await page.locator('[data-glow-nav="image"]').hover();
  const samples=await page.evaluate(async()=>{const light=document.querySelector('.rail-pointer-light'),samples=[],start=performance.now();return new Promise(resolve=>{function frame(){const box=light.getBoundingClientRect();samples.push({time:performance.now()-start,top:box.top,height:box.height});if(performance.now()-start<400)requestAnimationFrame(frame);else resolve(samples)}requestAnimationFrame(frame)})});
  const target=await page.locator('[data-glow-nav="image"]').boundingBox(),last=samples.at(-1);assert.ok(samples.length>=5);assert.ok(samples.some(sample=>sample.top<before.y-3&&sample.top>target.y+3),'lens visibly traverses intermediate positions');assert.ok(Math.abs(last.top-target.y)<4,JSON.stringify({last,target}));assert.ok(Math.max(...samples.map(sample=>sample.height))<=target.height*1.13,'stretch is bounded');
  assert.equal(await page.evaluate(()=>FrommControlGlass.snapshot.builds),builds);assert.equal(await page.locator('.rail-lens-surface').evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]),mapId);
  // Freeze the live carrier precisely where its top edge crosses a text glyph.
  await page.locator('[data-glow-nav="sound"]').hover();await page.waitForTimeout(350);
  const ready=page.waitForFunction(()=>{
   const light=document.querySelector('.rail-pointer-light'),label=document.querySelector('[data-glow-nav="video"] span'),r=light.getBoundingClientRect(),text=label.getBoundingClientRect();
   if(Math.abs(r.top-text.top-text.height/2)>12)return false;
   const style=document.createElement('style');style.id='freeze-rail-proof';style.textContent='.rail-pointer-light{transform:'+getComputedStyle(light).transform+'!important}.rail-pointer-light::before,.rail-pointer-light::after{background:none!important}';document.head.append(style);return true;
  },null,{timeout:3000});
  await page.locator('[data-glow-nav="video"]').hover();await ready.catch(async error=>{console.error(await page.evaluate(()=>({light:document.querySelector('.rail-pointer-light').getBoundingClientRect().toJSON(),label:document.querySelector('[data-glow-nav="video"]').innerHTML,spans:[...document.querySelectorAll('[data-glow-nav="video"] span')].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()}))})));throw error});await page.waitForTimeout(100);
  assert.equal(await page.locator('.rail-pointer-light').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  const label=await page.locator('[data-glow-nav="video"] span').boundingBox(),clip={x:Math.max(0,label.x-4),y:Math.max(0,label.y-5),width:label.width+8,height:label.height+10};
  const refracted=await page.screenshot({clip}),map=page.locator(`#${mapId} feDisplacementMap`),scale=await map.getAttribute('scale');assert.ok(Number(scale)>0);
  if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'glyph-refracted-'+cfg.width+'.png'),refracted)}
  await map.evaluate(e=>e.setAttribute('scale','0'));await page.waitForTimeout(80);const plain=await page.screenshot({clip});assert.equal(refracted.equals(plain),false,'real SVG displacement bends menu lettering, without an injected light field');
  if(out)fs.writeFileSync(path.join(out,'glyph-zero-'+cfg.width+'.png'),plain);
  await map.evaluate((e,value)=>e.setAttribute('scale',value),scale);await page.locator('#freeze-rail-proof').evaluate(e=>e.remove());
  await page.locator('[data-glow-nav="video"]').click();await page.waitForFunction(()=>state.filter==='video'&&document.querySelector('[data-glow-nav="video"]')?.getAttribute('aria-current')==='page');assert.equal(await page.locator('[data-glow-nav="video"]').getAttribute('aria-current'),'page','lens never intercepts menu clicks');
  assert.deepEqual(await page.locator('.room.active').evaluate(e=>({background:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow,outline:getComputedStyle(e.querySelector('.rail-avatar')).outline})),artist);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#sidebar').hover({position:{x:20,y:20}});await page.locator('[data-glow-nav="sound"]').hover();assert.equal(await page.locator('.rail-pointer-light').isVisible(),false);assert.deepEqual(errors,[]);
  await context.close();console.log(`${cfg.width}${cfg.installed?' PWA simulation':''}: spring traversal/settle, bounded stretch, real glyph refraction, one stable map, clickable routes, unchanged artists and reduced motion PASS`);
 }}finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

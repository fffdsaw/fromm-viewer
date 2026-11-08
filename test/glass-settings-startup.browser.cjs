'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict');
const{serve,open,seed}=require('./helpers/phase3-fixture.cjs');
(async()=>{const s=await serve(),b=await chromium.launch();let release=()=>{};try{
 const high={newContext:async options=>{const c=await b.newContext(options);await c.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});return c;}};
 const{page:p,context,errors}=await open(high,s.url,{login:true});
 assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/meapri/')).length),0,'login does not load unused optics');
 let requested;const seen=new Promise(r=>requested=r),held=new Promise(r=>release=r);await p.route('**/vendor/meapri/liquid-glass.js',async route=>{requested();await held;await route.continue()});
 await seed(p);await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('missing delayed optics request')),7000))]);
 await p.locator('#sidebar').hover({position:{x:20,y:20}});assert.equal(await p.locator('#sidebarToggleBtn').getAttribute('aria-expanded'),'true');
 assert.equal(await p.evaluate(()=>FrommControlGlass.snapshot.live),0);await p.keyboard.press('Escape');assert.equal(await p.locator('#sidebarToggleBtn').getAttribute('aria-expanded'),'false');
 await p.evaluate(()=>{setFilter('image');chooseDownloadItem('media',state.infiniteList[0]);});assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true,'selection works before maps are downloaded');
 release();await p.waitForFunction(()=>FrommControlGlass.snapshot.live>=2,null,{timeout:7000});
 assert.equal(await p.locator('.header-glass-surface,.sidebar-glass-surface').count(),0);
 await p.setViewportSize({width:900,height:560});await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.waitForTimeout(250);
 await p.locator('.glowme-nav').evaluate(e=>e.scrollTop=e.scrollHeight);await p.locator('[data-glow-nav="channel"]').hover();await p.waitForFunction(()=>document.querySelector('.glowme-nav').classList.contains('rail-pointer-tracking'));
 const light=await p.locator('.rail-pointer-light').boundingBox(),button=await p.locator('[data-glow-nav="channel"]').boundingBox();assert.ok(Math.abs(light.y-button.y)<1,'hover capsule follows the scrolled navigation row');
 assert.deepEqual(errors,[]);await context.close();console.log('Mint PC cold start: no login engine load, responsive delayed-import rail/selection, small controls ready and short-window hover alignment PASS');
}finally{release();await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const s=await serve(),b=await chromium.launch();try{const {page:p,context,errors}=await open(b,s.url,{width:1440,height:900});
 await p.evaluate(async()=>{await setFilter('image');const tl=document.querySelector('#timeline');for(const card of tl.querySelectorAll('.media-card')){const fixture=document.createElement('span');fixture.className='glass-switch-thumb';fixture.style.cssText='display:block;position:relative;width:40px;height:24px;pointer-events:auto';card.append(fixture);}const card=tl.querySelector('.media-card');for(let i=0;i<180;i++)tl.append(card.cloneNode(true));});
 assert.equal(await p.locator('.card-download .control-glass-surface').count(),0,'gallery downloads stay engine-free');
 const first=p.locator('#timeline .glass-switch-thumb').first();await p.waitForFunction(()=>document.querySelector('#timeline .glass-switch-thumb .control-glass-surface')?.style.backdropFilter.includes('url('));
 const original=await first.evaluate(el=>{window.__firstFace=el.querySelector('.control-glass-surface');return __firstFace.style.backdropFilter;});
 await p.waitForFunction(()=>[...document.querySelectorAll('#timeline .glass-switch-thumb')].some(el=>{const r=el.getBoundingClientRect();return r.top>innerHeight&&el.querySelector('.control-glass-surface')?.style.backdropFilter.includes('url(')}));
 for(const y of [1000,2100,3200,4300]){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(180);}
 await p.waitForFunction(()=>__firstFace.style.backdropFilter==='none');assert.ok(await p.evaluate(()=>FrommControlGlass.snapshot.parked>0),'distant filters park while retaining their maps');
 await p.evaluate(()=>scrollTo(0,0));await p.waitForFunction(()=>__firstFace.style.backdropFilter.includes('url('));assert.equal(await first.evaluate(el=>el.querySelector('.control-glass-surface')===__firstFace),true);assert.equal(await first.evaluate(el=>el.querySelector('.control-glass-surface').style.backdropFilter),original,'returning immediately reuses the same filter');
 // Warm the whole path, then repeat: no reconstruction and no full scan per frame.
 for(const y of [1000,2100,3200,4300,3200,2100,1000,0]){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(180);}await p.waitForTimeout(150);
 const before=await p.evaluate(()=>FrommControlGlass.snapshot);
 for(const y of [1000,2100,3200,4300,3200,2100,1000,0]){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(180);}await p.waitForTimeout(150);
 const after=await p.evaluate(()=>FrommControlGlass.snapshot);assert.equal(after.builds,before.builds,'revisiting a loaded path builds no engines');assert.equal(after.disposed,before.disposed,'scrolling does not dispose loaded engines');assert.ok(after.scans-before.scans<8,'discovery is not repeated at every scroll step');
 for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){
  await p.evaluate(t=>FrommThemes.set(t),theme);await p.waitForFunction(()=>document.querySelector('#timeline .glass-switch-thumb')?.dataset.controlOptics==='engine');
  await first.hover();await p.mouse.down();
  assert.ok(await p.locator('[data-control-optics="engine"]>.control-glass-surface').evaluateAll(es=>es.every(el=>{const c=getComputedStyle(el);return c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.backgroundImage==='none'})),theme+' optics stay transparent under press');await p.mouse.move(800,100);await p.mouse.up();
 }
 await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.waitForFunction(()=>document.querySelector('.room.active')?.dataset.controlOptics==='engine');await p.evaluate(()=>FrommGlowME.setRailOpen(false));await p.waitForTimeout(300);
 assert.equal(await p.locator('.room.active>.control-glass-surface').count(),0,'collapsed artists have no second optical face');
 const artist=await p.locator('.room.active').evaluate(el=>({background:getComputedStyle(el).backgroundColor,marker:getComputedStyle(el,'::before').display,outline:getComputedStyle(el.querySelector('.rail-avatar')).outlineWidth,border:getComputedStyle(el.querySelector('.rail-avatar')).borderWidth}));assert.equal(artist.background,'rgba(0, 0, 0, 0)');assert.equal(artist.marker,'none');assert.equal(artist.outline,'2px');assert.equal(artist.border,'0px');
 await p.evaluate(()=>setFilter('all'));await p.waitForFunction(()=>!document.querySelector('#timeline .glass-switch-thumb'));await p.waitForFunction(()=>!__firstFace.isConnected);assert.equal(await p.evaluate(filter=>document.getElementById(/#([^"')]+)/.exec(filter)[1])!==null,original),false,'unmounted controls release retained SVG maps');
 assert.deepEqual(errors,[]);await context.close();console.log('Scroll: ahead-of-view optics, same-filter return, zero warm rebuild/dispose, cached discovery, six clear palettes, one collapsed artist outline, unmount cleanup PASS');
}finally{await b.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

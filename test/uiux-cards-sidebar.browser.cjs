'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const s=await serve(),browser=await chromium.launch();try{
 for(const [width,height] of [[1440,900],[900,560],[390,844]]){
  const {page:p,context,errors}=await open(browser,s.url,{width,height});
  await p.evaluate(()=>FrommGlowME.setRailOpen(true));
  await p.locator('#rooms .room').last().scrollIntoViewIfNeeded();
  const last=await p.locator('#rooms .room').last().locator('.rail-avatar').boundingBox(),area=await p.locator('#rooms').boundingBox();
  assert.ok(last.y>=area.y&&last.y+last.height<=area.y+area.height,'last avatar fits completely within artist scroller');
  assert.equal(Math.round(last.width),32,'existing avatar size retained');
  assert.match(await p.locator('[data-glow-nav="sound"] path').getAttribute('d'),/M12 3v18/,'audio tab uses waveform');
  await p.evaluate(()=>{FrommGlowME.setRailOpen(false);state.filter='all';render();scrollTo(0,0)});
  const text=p.locator('.msg.star .bubble:has(>.text)').first();
  assert.equal(await text.locator(':scope > .meta').count(),0,'incoming text omits repeated artist name');
  assert.equal(await text.locator('..').locator('.chat-message-time').count(),1,'message time remains outside the card');
  const quote=p.locator('.reply-quote').first();assert.ok(await quote.count());assert.notEqual(await quote.evaluate(el=>getComputedStyle(el).borderInlineStartWidth),'0px');
  await p.evaluate(()=>{for(const m of state.messages)if(['video','sound'].includes(normType(m.type)))m.content='https://fixture.test/photo.svg';});
  for(const filter of ['media','image','video','sound']){
   await p.evaluate(filter=>setFilter(filter),filter);
   assert.ok(await p.locator('.media-card').count()>0);assert.equal(await p.locator('.card-badge').count(),0,'type badge removed in '+filter);
   assert.ok(await p.locator('.card-download').count()>0,'download retained in '+filter);
  }
  await p.locator('.media-card').first().click({position:{x:20,y:20}});await p.waitForFunction(()=>state.selected.size===1);
  assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  await context.close();console.log(width+'x'+height+': avatar clipping, waveform, text/reply/time and badge-free selectable media PASS');
 }
}finally{await browser.close();await s.close()}})().catch(e=>{console.error(e);process.exitCode=1});

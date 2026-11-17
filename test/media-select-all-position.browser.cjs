'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const width of [1440,390]){
  const {page,context,errors}=await open(browser,server.url,{width,height:900});
  for(const filter of ['media','image','video']){
   await page.evaluate(async filter=>{
    state.messages=Array.from({length:360},(_,i)=>({messageId:'selection-'+i,userType:'star',type:i%2?'video':'image',content:'https://fixture.test/media.svg',thumbnail:'https://fixture.test/avatar.svg',createdAt:1791534600000+i*60000}));
    state.chatMessages=state.messages;state.hasMoreMessages=false;state.chatHistoryComplete=true;state.selected.clear();setFilter(filter);
    await appendInfiniteBatch(5);scrollTo({top:1300,behavior:'instant'});
   },filter);
   await page.waitForTimeout(150);
   for(let toggle=0;toggle<3;toggle++){
    // Also exercise the real async history-completion path before selecting.
    if(toggle===2)await page.evaluate(()=>{state.hasMoreMessages=true;state.chatHistoryComplete=false;state.seenMessageKeys=new Set(state.messages.map(m=>String(m.messageId)));state.cursorEnd=new Date();});
    const before=await page.evaluate(()=>{
     window.selectionNodes=[...document.querySelectorAll('#timeline>.media-card')];window.selectionVersion=state.infiniteVersion;
     window.selectionY=scrollY;window.selectionSamples=[];
     let remaining=30;const sample=()=>{selectionSamples.push(scrollY);if(--remaining)requestAnimationFrame(sample);};requestAnimationFrame(sample);
     return {y:scrollY,count:selectionNodes.length};
    });
    // A real sticky-header click on desktop; never let the harness scroll a
    // nonsticky mobile header into view and mistake that for application motion.
    const button=page.locator('#selectAllBtn'),box=await button.boundingBox();
    if(box&&box.y>=0&&box.y+box.height<900)await button.click();else await button.dispatchEvent('click');
    await page.waitForFunction(()=>!document.querySelector('#selectAllBtn').disabled);await page.waitForTimeout(650);
    const result=await page.evaluate(()=>({y:scrollY,range:Math.max(...selectionSamples)-Math.min(...selectionSamples),same:selectionNodes.every((n,i)=>document.querySelectorAll('#timeline>.media-card')[i]===n),version:selectionVersion===state.infiniteVersion,selected:state.selected.size,expected:currentSelectableMedia().length,marked:document.querySelectorAll('#timeline>.media-card.selected').length}));
    assert.ok(Math.abs(result.y-before.y)<2&&result.range<2,filter+' select all must never jump: '+JSON.stringify(result));
    assert.ok(result.same&&result.version,filter+' preserves card/player nodes and render generation');
    assert.equal(result.selected,toggle===1?0:result.expected);assert.equal(result.marked,toggle===1?0:before.count);
   }
  }
  assert.deepEqual(errors,[]);await context.close();console.log(width+': media/photo/video select all/clear preserves scroll every frame and native card/player nodes PASS');
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

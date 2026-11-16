'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  await page.evaluate(()=>{state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'journey-'+i,userType:'star',type:'text',content:'합성 이동 확인 '+i,createdAt:1791534600000+i*60000}));state.messages=state.chatMessages;state.chatHistoryComplete=true;state.chatQuery='';render();});
  async function start(){return page.evaluate(()=>{
   FrommViewState.cancel();renderChatWindow(filteredMessages(),2500);scrollTo({top:2600,behavior:'instant'});
   const anchor=[...document.querySelectorAll('#timeline [data-message-id]')].find(el=>el.getBoundingClientRect().top>chatHeaderInset()),offset=anchor.getBoundingClientRect().top;
   window.topJourney=[];FrommViewState.toStart();
   const delta=anchor.getBoundingClientRect().top-offset;
   const sample=()=>{topJourney.push(scrollY);if(FrommViewState.returning)requestAnimationFrame(sample);};requestAnimationFrame(sample);
   return{delta,count:document.querySelectorAll('#timeline .msg').length};
  });}
  const before=await start();assert.ok(Math.abs(before.delta)<1,'destination insertion preserves the visible message');assert.ok(before.count<1000,'animation never mounts the full history');
  await page.waitForFunction(()=>!FrommViewState.returning&&scrollY<1&&state.chatWindowStart===0);
  const frames=await page.evaluate(()=>topJourney);assert.ok(new Set(frames.map(Math.round)).size>=3,'multiple actual scroll positions, not an instant jump');
  assert.ok(frames.every((y,i)=>!i||y<=frames[i-1]+1),'upward journey never jumps backward');assert.equal(await page.locator('#timeline .msg').first().getAttribute('data-message-id'),'journey-0');
  await start();await page.waitForTimeout(100);await page.mouse.wheel(0,250);await page.waitForFunction(()=>!FrommViewState.returning);await page.waitForTimeout(700);
  assert.ok(await page.evaluate(()=>scrollY>0),'manual movement cancels the jump');
  const windowState=await page.evaluate(()=>{const ids=[...document.querySelectorAll('#timeline .msg')].map(e=>e.dataset.messageId);return{first:ids[0],last:ids.at(-1),unique:new Set(ids).size,count:ids.length,start:state.chatWindowStart,end:state.infiniteRendered};});
  assert.equal(windowState.unique,windowState.count);assert.equal(windowState.first,'journey-'+windowState.start);assert.equal(windowState.last,'journey-'+(windowState.end-1),'cancel reconciles the virtual list');
  await page.emulateMedia({reducedMotion:'reduce'});await start();assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.evaluate(()=>FrommViewState.returning),false);
  assert.deepEqual(errors,[]);await context.close();console.log(viewport.width+': anchored first frame, animated true start, bounded DOM, user cancellation and reduced motion PASS');
 }
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

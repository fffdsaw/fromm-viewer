'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  await page.evaluate(async()=>{
   Object.assign(replyIdentity,{context:replyAuthContext(),status:'ready',id:'mine'});
   const quote=userId=>({messageId:'original',userId,content:'인용 원문'});
   state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'m'+i,userType:'star',type:'text',content:'합성 대화 '+i,createdAt:1791534600000+i*60000,...([500,1500].includes(i)?{mentionedMessage:quote('mine')}:i===700?{mentionedMessage:quote('other')}:i===900?{embeddedMentionedMessage:quote('mine'),mentionedMessage:quote('other')}:{} )}));
   state.messages=state.chatMessages;state.chatHistoryComplete=true;state.chatQuery='';render();
   await Promise.all([setOnlyMyReplies(true),setOnlyMyReplies(false),setOnlyMyReplies(true)]);
  });
  await page.waitForFunction(()=>state.chatMatchKey==='m500');assert.equal(await page.locator('#chatMatchPosition').innerText(),'1 / 2');assert.ok(await page.locator('.msg').count()>2);assert.equal(await page.locator('#chatContextBtn').count(),0);
  await page.locator('#chatMatchNext').click();await page.waitForFunction(()=>state.chatMatchKey==='m1500');
  await page.evaluate(async()=>{await setOnlyMyReplies(false);await setOnlyMyReplies(true);});await page.waitForFunction(()=>state.chatMatchKey==='m500');
  await page.evaluate(()=>{state.chatMessages[500].mentionedMessage.userId='other';render();});assert.ok(await page.locator('.msg').count()>1);assert.equal(await page.evaluate(()=>chatMatches()[0].messageId),'m1500','same-length author amendment invalidates matches');
  await page.evaluate(()=>{state.chatMessages[500].mentionedMessage.userId='mine';render();});assert.equal(await page.evaluate(()=>chatMatches().length),2);
  await page.evaluate(()=>{state.onlyMyReplies=false;state.chatQuery='';renderChatWindow(filteredMessages(),2500);scrollTo(0,2400);FrommViewState.capture();});
  await page.waitForFunction(()=>scrollY>650);assert.ok(await page.evaluate(()=>state.chatWindowStart>0));
  await page.locator('#scrollTopBtn').click();await page.waitForFunction(()=>scrollY<1&&state.chatWindowStart===0);
  await page.evaluate(()=>render());await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.locator('#timeline .msg').first().getAttribute('data-message-id'),'m0');
  await page.mouse.wheel(0,500);await page.waitForFunction(()=>scrollY>100);
  await page.evaluate(()=>{scrollTo(0,0);window.calendarFrames=[];const calendar=document.querySelector('#dateCalendar');calendar.addEventListener('animationstart',()=>{let count=0;const sample=()=>{calendarFrames.push(Number(getComputedStyle(calendar).opacity));if(++count<16)requestAnimationFrame(sample);};requestAnimationFrame(sample);},{once:true});});await page.locator('#chatToolsBtn').click();
  assert.equal(await page.locator('#dateCalendar').evaluate(e=>getComputedStyle(e).animationName),'calendar-unfold');
  await page.waitForFunction(()=>calendarFrames.some(value=>value>0&&value<1));await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#dateCalendar')).opacity)>.99);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#dateCalendar').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}: confirmed reply targets in full context, restart at 1, virtual start and user movement PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

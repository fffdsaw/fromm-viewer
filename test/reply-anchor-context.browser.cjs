'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  assert.equal(await page.locator('#chatContextBtn').count(),0,'no optional context switch remains');
  await page.evaluate(()=>{
   Object.assign(replyIdentity,{context:replyAuthContext(),status:'ready',id:'mine'});
   state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'m'+i,type:'text',userType:'star',content:'합성 대화 '+i,createdAt:1791534600000+i*60000,...(i===1500?{mentionedMessage:{messageId:'original',userId:'mine',content:'내 합성 원문'}}:{})}));
   state.messages=state.chatMessages;state.chatHistoryComplete=true;render();
  });
  await page.locator('#chatToolsBtn').click();await page.locator('#myRepliesBtn').check();await page.waitForFunction(()=>state.chatMatchKey==='m1500');
  assert.ok(await page.locator('.msg').count()>1);assert.equal(await page.evaluate(()=>chatMatches().length),1);await page.keyboard.press('Escape');
  await page.evaluate(()=>{
   const earlier=document.querySelector('[data-message-id="m1499"]');earlier.style.contentVisibility='visible';earlier.style.height='520px';
   void navigateChatMatch(0);setTimeout(()=>{earlier.style.height='24px';},350);
  });await page.waitForTimeout(650);
  const placement=await page.locator('.chat-match-active').evaluate(el=>{const r=el.getBoundingClientRect(),d=document.querySelector('#chatSearchDock').getBoundingClientRect();return{top:r.top,bottom:r.bottom,min:Math.max(chatHeaderInset()+12,r.left<d.right&&r.right>d.left?d.bottom+12:12)};});
  assert.ok(placement.top>=placement.min-2&&placement.top<=placement.min+3,JSON.stringify(placement));assert.ok(placement.bottom<=viewport.height,'reply visible without scrolling up');
  await page.mouse.wheel(0,300);await page.waitForTimeout(100);const manual=await page.evaluate(()=>scrollY);await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-manual)<2,'manual scroll wins');
  await page.locator('#chatToolsBtn').click();await page.locator('#myRepliesBtn').uncheck();
  await page.locator('#chatSearchInput').fill('합성 대화 1800');await page.waitForFunction(()=>state.chatMatchKey==='m1800');assert.equal(await page.evaluate(()=>chatMatches().length),1);assert.ok(await page.locator('.msg').count()>1,'search also keeps full context');
  await page.locator('#chatSearchInput').fill('검색 결과 없는 문장');await page.waitForFunction(()=>state.chatQuery==='검색 결과 없는 문장');assert.equal(await page.evaluate(()=>chatMatches().length),0);assert.ok(await page.locator('.msg').count()>1,'zero matches do not hide the conversation');
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}: always full conversation, first reply/search targets and delayed anchor PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

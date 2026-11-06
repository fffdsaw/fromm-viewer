'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const {page,context,errors}=await open(browser,server.url,viewport);let profileRequests=0;page.on('request',r=>{if(r.url().includes('/v2/user/fan/profile'))profileRequests++;});
  await page.locator('#chatToolsBtn').click();const choice=page.locator('#chatContextBtn');assert.equal(await choice.isEnabled(),true);
  await page.evaluate(()=>window.initialChatNode=document.querySelector('#timeline .msg'));
  await choice.check();assert.equal(await page.evaluate(()=>state.chatContext),true);assert.equal(await page.evaluate(()=>state.onlyMyReplies),false);assert.equal(await page.evaluate(()=>initialChatNode===document.querySelector('#timeline .msg')),true,'preference alone does not rebuild conversation');assert.equal(profileRequests,0);
  await page.evaluate(()=>{
   Object.assign(replyIdentity,{context:replyAuthContext(),status:'ready',id:'mine'});
   state.chatMessages=Array.from({length:3000},(_,i)=>({messageId:'m'+i,type:'text',userType:'star',content:'합성 대화 '+i,createdAt:1791534600000+i*60000,...(i===1500?{mentionedMessage:{messageId:'original',userId:'mine',content:'내 합성 원문'}}:{})}));
   state.messages=state.chatMessages;state.chatHistoryComplete=true;render();
  });
  await page.locator('#myRepliesBtn').check();await page.waitForFunction(()=>state.chatMatchKey==='m1500');assert.equal(await choice.isChecked(),true,'preselected context remains selected');assert.ok(await page.locator('.msg').count()>1);
  await page.keyboard.press('Escape');
  // Simulate earlier virtual rows/media settling after the initial jump frames.
  await page.evaluate(()=>{
   const earlier=document.querySelector('[data-message-id="m1499"]');earlier.style.contentVisibility='visible';earlier.style.height='520px';
   window.anchorJump=navigateChatMatch(0);
   setTimeout(()=>{earlier.style.height='24px';},350);
  });
  await page.waitForTimeout(650);
  const placement=await page.locator('.chat-match-active').evaluate(el=>{const r=el.getBoundingClientRect(),d=document.querySelector('#chatSearchDock').getBoundingClientRect();return{top:r.top,bottom:r.bottom,min:r.left<d.right&&r.right>d.left?d.bottom+12:12};});
  assert.ok(placement.top>=placement.min-2&&placement.top<=placement.min+3,JSON.stringify(placement));assert.ok(placement.bottom<=viewport.height,'reply is visible without scrolling up');
  await page.mouse.wheel(0,300);await page.waitForTimeout(100);const manual=await page.evaluate(()=>scrollY);await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-manual)<2,'anchor must not fight user scrolling');
  await page.locator('#chatToolsBtn').click();await page.locator('#myRepliesBtn').uncheck();assert.equal(await choice.isChecked(),true,'disabling personal filter keeps the independent choice');await choice.uncheck();assert.equal(await page.evaluate(()=>state.chatContext),false);
  assert.deepEqual(errors,[]);await context.close();console.log(`${viewport.width}: independent context preference, delayed row shrink and visible reply anchor PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

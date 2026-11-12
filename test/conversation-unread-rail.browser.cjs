'use strict';
// Verify preview-style unread badge presentation without changing production unread logic.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open}=require('./helpers/phase3-fixture.cjs');

(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const {page,context,errors}=await open(browser,server.url,viewport);
   try{
    await page.waitForFunction(()=>!!document.querySelectorAll('#rooms .room')[1]?.querySelector('.rail-avatar'));
    const artistColor=await page.locator('#timeline .msg.star .bubble:has(>.text)').first().evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(artistColor,'rgb(245, 250, 251)','artist text has an aqua card');
    const ownColor=await page.evaluate(()=>{
     const row=renderMessage({messageId:'synthetic-own',createdAt:Date.now(),type:'text',userType:'fan',content:'synthetic outgoing message'});
     document.querySelector('#timeline').append(row);
     return getComputedStyle(row.querySelector('.bubble')).backgroundColor;
    });
    assert.equal(ownColor,'rgb(219, 243, 236)','outgoing mint card remains unchanged');
    await page.evaluate(()=>{
     const button=document.querySelectorAll('#rooms .room')[1];
     let badge=button.querySelector('.rail-unread');
     if(!badge){badge=document.createElement('span');badge.className='rail-unread';badge.setAttribute('aria-hidden','true');button.append(badge);}
     badge.hidden=false;badge.textContent='3';button.classList.add('has-unread');
     button.setAttribute('aria-label','아티스트 2 · 새 메시지 3개');
     FrommGlowME.setRailOpen(false);
    });
    const button=page.locator('#rooms .room').nth(1),badge=button.locator('.rail-unread');
    const collapsed=await badge.evaluate(el=>{
     const cs=getComputedStyle(el),r=el.getBoundingClientRect(),a=el.parentElement.querySelector('.rail-avatar').getBoundingClientRect();
     return{color:cs.backgroundColor,font:cs.fontSize,width:r.width,height:r.height,left:r.left,avatarLeft:a.left,display:cs.display};
    });
    assert.equal(collapsed.color,'rgb(244, 81, 30)','collapsed dot uses preview red');
    assert.equal(collapsed.font,'0px','collapsed badge visually hides the number');
    assert.ok(collapsed.width>=10&&collapsed.width<=12&&collapsed.height>=10&&collapsed.height<=12,'collapsed badge is a small dot');
    assert.ok(collapsed.left>collapsed.avatarLeft+18,'dot overlays upper-right of avatar');
    assert.notEqual(collapsed.display,'none');
    await page.evaluate(()=>FrommGlowME.setRailOpen(true));
    const expanded=await badge.evaluate(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return{font:cs.fontSize,width:r.width,text:el.textContent,color:cs.backgroundColor};});
    assert.equal(expanded.text,'3','expanded badge retains unread count');
    assert.equal(expanded.font,'11px','expanded badge shows digits');
    assert.ok(expanded.width>=22,'expanded badge is a capsule');
    assert.equal(expanded.color,'rgb(244, 81, 30)');
    assert.equal(await button.getAttribute('aria-label'),'아티스트 2 · 새 메시지 3개');
    await badge.evaluate(el=>{el.textContent='99+';});
    assert.ok((await badge.boundingBox()).width>=22,'99+ count remains visible');
    await badge.evaluate(el=>{el.hidden=true;});
    assert.equal(await badge.evaluate(el=>getComputedStyle(el).display),'none','no unread hides indicator');
    assert.deepEqual(errors,[]);
    console.log(viewport.width+': artist text card and collapsed dot / expanded red count PASS');
   }finally{await context.close();}
  }
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

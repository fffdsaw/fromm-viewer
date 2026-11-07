'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve}=require('./helpers/phase3-fixture.cjs');
const output=process.env.LOGIN_SCREENSHOT_DIR;
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const mode of ['fresh','saved','invalid','expired','network','legacy','storage-blocked']){
  const context=await browser.newContext({viewport:{width:mode==='fresh'?390:1440,height:900}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(mode=>{
   if(mode==='storage-blocked'){Storage.prototype.getItem=function(){throw new DOMException('Blocked','SecurityError');};}
   else if(mode!=='fresh'){
    localStorage.setItem(mode==='legacy'?'fromm_access_token':'fromm_local_access_token_v1','synthetic-only');
    localStorage.setItem(mode==='legacy'?'fromm_device_id':'fromm_local_device_id_v1','synthetic-only');
    if(mode==='expired')localStorage.setItem('fromm_token_expiry',String(Math.floor(Date.now()/1000)-60));
   }
   window.loginPaints=0;const sample=()=>{const panel=document.querySelector('.login-panel'),gate=document.querySelector('#loginGate');if(panel&&gate&&!gate.classList.contains('hidden')&&getComputedStyle(panel).visibility==='visible')window.loginPaints++;requestAnimationFrame(sample);};requestAnimationFrame(sample);
  },mode);
  let release,requested;const held=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
  await p.route('**/*',async route=>{
   let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));if(u.origin===new URL(server.url).origin)return route.continue();
   if(u.hostname.endsWith('frommyarti.com')){
    requested();await held;
    if(mode==='network')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'temporary fixture failure'})});
    if(mode==='invalid')return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false,message:'unauthorized'})});
    return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{chatRooms:[],rooms:[],channels:[],liveRooms:[]}})});
   }
   return route.abort();
  });
  await p.goto(server.url);
  if(['saved','invalid','network','legacy'].includes(mode)){
   await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('restore not requested')),5000))]);
   await p.waitForTimeout(180);assert.equal(await p.locator('.login-panel').isVisible(),false,'no form during saved-session restore');
   assert.equal(await p.evaluate(()=>loginPaints),0,'no painted login frame before restore completes');
   assert.equal(await p.locator('#loginGate').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
   assert.equal(await p.locator('.app').evaluate(e=>e.inert),true);
   await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'loginGate','pending form is not tabbable');
   if(output&&mode==='saved'){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,'restoring.png')});}
   release();
  }else release();
  if(['saved','legacy','network'].includes(mode)){
   await p.locator('#loginGate').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>loginPaints),0,'valid/network session never paints a login form');
   assert.equal(await p.locator('.app').evaluate(e=>e.inert),false);
   if(mode==='saved'){await p.reload();await p.locator('#loginGate').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>loginPaints),0,'reload never paints login form');}
  }else{
   await p.locator('.login-panel').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>document.activeElement.id),'loginEmail');
   assert.equal(await p.locator('#loginGate').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
   if(mode==='expired'||mode==='invalid')assert.match(await p.locator('#loginStatus').textContent(),/유효|만료/);
   if(output&&mode==='fresh'){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,'login.png')});}
   if(mode==='fresh'){
    assert.equal(await p.evaluate(()=>document.documentElement.clientWidth),390,'no mint root scrollbar strip');
    await p.setViewportSize({width:844,height:390});await p.locator('#checkEmailBtn').focus();
    const button=await p.locator('#checkEmailBtn').boundingBox();assert.ok(button.y>=0&&button.y+button.height<=390,'short login viewport can scroll to controls');
   }
  }
  assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('auth-pending')),false);
  assert.deepEqual(errors,[]);await context.close();console.log(`${mode}: black background, correct form visibility/focus and existing auth outcome PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

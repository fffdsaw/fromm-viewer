'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve();let browser;try{browser=await chromium.launch(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{});
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{localStorage.setItem('fromm_local_access_token_v1','synthetic-startup');localStorage.setItem('fromm_local_device_id_v1','synthetic-startup-device');});
 let releaseRooms,releaseProfile,releaseEngine,roomsAt=0,profileAt=0,engineAt=0,roomDone=0;
 const rooms=new Promise(r=>releaseRooms=r),profile=new Promise(r=>releaseProfile=r),engine=new Promise(r=>releaseEngine=r);
 await page.route('**/*',async route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(u.origin===new URL(server.url).origin){if(u.pathname.endsWith('/vendor/meapri/liquid-glass.js')){engineAt=Date.now();await engine;}return route.continue();}
  if(u.pathname==='/v2/chat/fanFriendAndChatRooms'){roomsAt=Date.now();await rooms;roomDone=Date.now();return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{chatRooms:[]}})});}
  if(u.pathname==='/v2/user/fan/profile'){profileAt=Date.now();await profile;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{profile:{id:'synthetic-startup-self'}}})});}
  if(u.hostname.endsWith('frommyarti.com'))return route.fulfill({contentType:'application/json',body:'{"success":true,"data":{"channels":[],"liveRooms":[]}}'});
  return route.abort();
 });
 await page.goto(server.url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>replyIdentity.status==='loading');
 assert.ok(roomsAt&&profileAt&&!roomDone,'profile request starts while room request is pending');
 assert.equal(await page.locator('.app').evaluate(el=>el.inert),true,'prewarming never bypasses authentication gate');
 // Same 400 ms network wait in both requests: parallel critical path, not two serial waits.
 await page.waitForTimeout(400);assert.ok(engineAt&&!roomDone,'engine download starts while saved-session rooms are pending');releaseRooms();releaseProfile();
 await page.waitForFunction(()=>currentReplyUserId()==='synthetic-startup-self'&&document.querySelector('#loginGate').classList.contains('hidden'));
 assert.equal(await page.locator('.app').evaluate(el=>el.inert),false,'the viewer becomes usable even if the engine has not downloaded');
 releaseEngine();await page.waitForFunction(()=>window.FrommControlGlass?.snapshot.live>0);
 console.log(JSON.stringify({profileStartRelativeToRoomsMs:profileAt-roomsAt,engineStartRelativeToRoomsMs:engineAt-roomsAt,overlappedWaitingMs:roomDone-Math.max(roomsAt,profileAt)}));
 assert.deepEqual(errors,[]);await context.close();console.log('PC first-load engine and profile overlap pending room lookup; auth and rendering do not wait for the engine PASS');
}finally{await browser?.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

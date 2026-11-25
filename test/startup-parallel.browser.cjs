'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{localStorage.setItem('fromm_local_access_token_v1','synthetic-startup');localStorage.setItem('fromm_local_device_id_v1','synthetic-startup-device');});
 let releaseRooms,releaseProfile,roomsAt=0,profileAt=0,roomDone=0;
 const rooms=new Promise(r=>releaseRooms=r),profile=new Promise(r=>releaseProfile=r);
 await page.route('**/*',async route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(u.origin===new URL(server.url).origin)return route.continue();
  if(u.pathname==='/v2/chat/fanFriendAndChatRooms'){roomsAt=Date.now();await rooms;roomDone=Date.now();return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{chatRooms:[]}})});}
  if(u.pathname==='/v2/user/fan/profile'){profileAt=Date.now();await profile;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{profile:{id:'synthetic-startup-self'}}})});}
  if(u.hostname.endsWith('frommyarti.com'))return route.fulfill({contentType:'application/json',body:'{"success":true,"data":{"channels":[],"liveRooms":[]}}'});
  return route.abort();
 });
 await page.goto(server.url);await page.waitForFunction(()=>replyIdentity.status==='loading');
 assert.ok(roomsAt&&profileAt&&!roomDone,'profile request starts while room request is pending');
 assert.equal(await page.locator('.app').evaluate(el=>el.inert),true,'prewarming never bypasses authentication gate');
 // Same 400 ms network wait in both requests: parallel critical path, not two serial waits.
 await page.waitForTimeout(400);releaseRooms();releaseProfile();
 await page.waitForFunction(()=>currentReplyUserId()==='synthetic-startup-self'&&document.querySelector('#loginGate').classList.contains('hidden'));
 console.log(JSON.stringify({profileStartRelativeToRoomsMs:profileAt-roomsAt,overlappedWaitingMs:roomDone-Math.max(roomsAt,profileAt)}));
 assert.deepEqual(errors,[]);await context.close();console.log('PC saved-session identity prewarming overlaps room lookup; auth gate and existing profile ownership preserved PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

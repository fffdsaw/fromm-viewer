'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url()),f=u.pathname.split('/').at(-1)||'index.html';
  if(u.hostname!=='viewer.test'||!['index.html','web-native-live.js','web-live-pip.js','web-live-chat-probe.js','web-live-controls.js','mobile-sync-test.js'].includes(f))return route.abort();
  return route.fulfill({contentType:f.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(__dirname,'..',f))});});
 await require('./helpers/shell-assets.cjs')(page);await page.goto('http://viewer.test/');
 assert.equal(await page.locator('#loginGate').getAttribute('role'),'dialog');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'loginEmail');
 for(let i=0;i<16;i++){await page.keyboard.press(i%3===0?'Shift+Tab':'Tab');assert.equal(await page.evaluate(()=>document.querySelector('#loginGate').contains(document.activeElement)),true);}
 await page.evaluate(()=>{hideLoginGate();document.querySelector('#sidebarToggleBtn').focus();showLoginGate();});
 await page.evaluate(()=>hideLoginGate());assert.equal(await page.evaluate(()=>document.activeElement.id),'sidebarToggleBtn');
 assert.equal(await page.locator('.app').evaluate(e=>e.inert),false);
 await page.evaluate(()=>{setActiveAuth('fixture','fixture','fixture');state.room={hostChatRoomId:'fixture',host:{nick:'테스트'}};state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
  state.messages=[{messageId:'quote',type:'text',userType:'star',content:'인용 답장',createdAt:'2026-10-30T10:00:00Z',mentionedMessage:{messageId:'original',content:'밝은 표면의 원문',userId:'fixture-fan'}}];state.chatMessages=state.messages;render();});
 const color=await page.locator('.reply-content').evaluate(e=>getComputedStyle(e).color);
 const rgb=color.match(/\d+/g).slice(0,3).map(Number);const lum=xs=>xs.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 // Conservative light surface below the actual translucent quote background.
 const contrast=(lum([210,230,220])+.05)/(lum(rgb)+.05);assert.ok(contrast>=4.5);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 await page.evaluate(()=>showLoginGate());const violations=await page.evaluate(async()=>{const r=await axe.run('#loginGate',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({loginFocus:'pass',quoteColor:color,conservativeContrast:contrast.toFixed(2),axe:violations}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

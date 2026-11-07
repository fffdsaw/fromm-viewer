'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const{page,context,errors}=await open(browser,server.url,viewport);
 await page.evaluate(()=>scrollTo(0,1800));await page.waitForTimeout(100);
 const original=await page.evaluate(()=>scrollY);await page.evaluate(()=>setFilter('image'));await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>scrollY)<10,'first visit to a different view starts at its beginning');
 await page.evaluate(()=>scrollTo(0,1200));await page.waitForTimeout(80);const gallery=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>setFilter('all'));await page.waitForTimeout(180);console.log('chat restore',original,await page.evaluate(()=>scrollY));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-original)<5,'conversation position restored');
 await page.evaluate(()=>setFilter('image'));await page.waitForTimeout(180);console.log('gallery restore',gallery,await page.evaluate(()=>scrollY));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-gallery)<5,'gallery position restored');
 assert.equal(await page.locator('#chatToolsBtn').isVisible(),false);assert.equal(await page.locator('#saveSelectedBtn').isVisible(),viewport.width>700);if(viewport.width>700)assert.equal(await page.locator('#saveSelectedBtn').isDisabled(),true);
 const cardTop=await page.locator('.media-card').first().evaluate(e=>e.getBoundingClientRect().top);
 await page.evaluate(()=>{state.selected.add('m0');updateSelectedCount();});
 assert.equal(await page.locator('.media-card').first().evaluate(e=>e.getBoundingClientRect().top),cardTop,'batch tools never move the sorting row or cards');assert.equal(await page.locator('#saveSelectedBtn').isVisible(),true);
 const pos=await page.evaluate(()=>scrollY);
 // C: a gallery selection must be cleared on conversation entry, and the
 // batch toolbar must not remain in the chat header at either viewport.
 await page.evaluate(()=>setFilter('all'));await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>state.selected.size),0,'media selection cleared on conversation entry');
 assert.equal(await page.locator('.batch-selection-tools').isVisible(),false,'no gallery tools inside full conversation');
 assert.equal(await page.locator('#saveSelectedBtn').isVisible(),false,'no stale save button inside full conversation');
 assert.equal(await page.locator('.toolbar').evaluate(e=>e.classList.contains('has-download-selection')),false,'chat toolbar has no selection state');
 await page.evaluate(()=>setFilter('image'));await page.waitForTimeout(120);
 assert.equal(await page.locator('#saveSelectedBtn').isVisible(),viewport.width>700,'gallery toolbar stays available for new selections');
 if(viewport.width>700)assert.equal(await page.locator('#saveSelectedBtn').isDisabled(),true,'former selection is not restored');
 await page.evaluate(()=>setFilter('all'));await page.waitForTimeout(150);await page.locator('#chatToolsBtn').click();await page.locator('#chatSearchInput').fill('인용');await page.waitForTimeout(500);assert.equal(await page.locator('#chatSearchInput').inputValue(),'인용');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'chatToolsBtn');
 await page.evaluate(()=>{state.chatQuery='';render();});await page.waitForTimeout(100);
 await page.evaluate(()=>jumpToDate('2026-10-09'));await page.waitForTimeout(600);assert.ok(await page.evaluate(()=>scrollY)<500,'explicit date navigation overrides restored position');
 assert.deepEqual(errors,[]);console.log(viewport.width+': filter scroll, auto-clear selection, search/date/focus PASS');await context.close();
 // A true first visit should show the newest message without constructing
 // the entire archive. Returning to chat must restore the reading position.
 const fresh=await open(browser,server.url,viewport),p=fresh.page;
 await p.evaluate(async()=>{
  await setFilter('image');
  FrommViewState.clear();
  const messages=Array.from({length:700},(_,i)=>({messageId:'fresh'+i,type:i%4===0?'image':'text',userType:'star',content:i%4===0?'https://fixture.test/photo.svg':'최신 대화 '+i,createdAt:1791534600000+i*60000}));
  state.messages=messages;state.chatMessages=messages;state.chatHistoryComplete=true;state.hasMoreMessages=false;
  await setFilter('all');
 });
 await p.waitForFunction(()=>!state.chatAutoTopPending&&state.infiniteList.length===700);
 await p.waitForTimeout(160);
 const latest=await p.evaluate(()=>{
  const end=document.querySelector('#timeline [data-message-id="fresh699"]'),rect=end?.getBoundingClientRect();
  return {windowStart:state.chatWindowStart,lastVisible:!!rect&&rect.bottom<=innerHeight+2,lastTop:rect?.top,lastBottom:rect?.bottom,y:scrollY,max:document.documentElement.scrollHeight-innerHeight,sorted:state.infiniteList.at(-1).messageId,pending:FrommViewState.pending};
 });
 console.log('latest-first geometry',viewport.width,JSON.stringify(latest));
 assert.ok(latest.windowStart>0,'first conversation visit uses a bounded newest-message window');
 assert.equal(latest.sorted,'fresh699');
 assert.ok(latest.lastVisible,'newest message visible at first entry');
 assert.ok(Math.abs(latest.y-latest.max)<6,'initial viewport starts at latest messages');
 await p.evaluate(()=>scrollTo(0,Math.max(0,document.documentElement.scrollHeight-innerHeight-700)));
 await p.waitForTimeout(120);
 const read=await p.evaluate(()=>{
  const e=[...document.querySelectorAll('#timeline [data-message-id]')].find(el=>el.getBoundingClientRect().bottom>8);
  return {id:e?.dataset.messageId,top:e?.getBoundingClientRect().top,y:scrollY,windowStart:state.chatWindowStart};
 });
 assert.ok(read.id,'a reading anchor is visible before leaving chat');
 await p.evaluate(()=>setFilter('image'));await p.waitForTimeout(160);
 await p.evaluate(()=>setFilter('all'));
 await p.waitForFunction(({id,top})=>{
  const anchor=[...document.querySelectorAll('#timeline [data-message-id]')].find(el=>el.dataset.messageId===id);
  return anchor&&Math.abs(anchor.getBoundingClientRect().top-top)<10;
 },{id:read.id,top:read.top},{timeout:2500});
 const back=await p.evaluate(id=>{
  const e=[...document.querySelectorAll('#timeline [data-message-id]')].find(el=>el.dataset.messageId===id);
  return {present:!!e,top:e?.getBoundingClientRect().top,y:scrollY,windowStart:state.chatWindowStart};
 },read.id);
 console.log('reading-position restore',viewport.width,JSON.stringify({read,back}));
 assert.ok(back.present,viewport.width+': same reading message is rendered again');
 assert.ok(Math.abs(read.top-back.top)<10,viewport.width+': returning to chat restores the same message viewport offset');
 assert.deepEqual(fresh.errors,[]);await fresh.context.close();
 console.log(viewport.width+': latest first visit, bounded conversation rendering and read-position return PASS');
 }
 // Search panel must keep the fixed action visible on short viewports. The
 // day grid uses only required calendar weeks (Nov=5, Aug=6, Feb=4).
 for(const viewport of [{width:390,height:650},{width:1440,height:760}]){
  const cal=await open(browser,server.url,viewport),p=cal.page;
  await p.locator('#chatToolsBtn').click();
  await p.evaluate(()=>openDateCalendar());
  for(const [year,month,days] of [[2026,10,35],[2026,7,42],[2021,1,28]]){
   await p.evaluate(({year,month})=>{state.calendarMode='day';state.calendarMonth=new Date(year,month,1);renderDateCalendar();},{year,month});
   assert.equal(await p.locator('#dateCalendarGrid .date-day').count(),days,`${year}/${month+1}: only necessary weeks`);
   const layout=await p.evaluate(()=>{
    const panel=document.querySelector('#chatToolsPanel'),footer=panel.querySelector('.search-panel-footer'),scroller=panel.querySelector('.search-panel-scroll');
    const a=panel.getBoundingClientRect(),b=footer.getBoundingClientRect();
    return {open:panel.classList.contains('open'),panelBottom:a.bottom,footerBottom:b.bottom,viewport:innerHeight,scrollHeight:scroller.scrollHeight,clientHeight:scroller.clientHeight};
   });
   assert.ok(layout.open,`${viewport.width}: search panel open`);
   assert.ok(layout.panelBottom<=layout.viewport+2,`${viewport.width} ${year}/${month+1}: panel fits viewport ${JSON.stringify(layout)}`);
   assert.ok(layout.footerBottom<=layout.viewport+2,`${viewport.width} ${year}/${month+1}: move action visible ${JSON.stringify(layout)}`);
   await p.locator('.search-panel-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
   assert.equal(await p.locator('#dateCalendarGrid .date-day').last().isVisible(),true,'last calendar day remains accessible');
  }
  assert.deepEqual(cal.errors,[]);
  console.log(viewport.width+'x'+viewport.height+': calendar day count, scroll and fixed action PASS');
  await cal.context.close();
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

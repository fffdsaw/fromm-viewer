'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})}),shots=process.env.CALENDAR_PANEL_SCREENSHOT_DIR;try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:980,height:2200},{width:844,height:390},{width:1440,height:900,installed:true}]){
  const {page,context,errors}=await open(browser,server.url,viewport);
  if(!viewport.installed)await page.locator('#chatToolsBtn').click();
  await page.locator('#dateCalendar.open').waitFor({state:'visible'});
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#chatToolsPanel')).opacity)>.99);
  assert.equal(await page.locator('#datePickerBtn').isVisible(),false,'no extra date picker activation step');
  assert.equal(await page.locator('.chat-tools-title').innerText(),'대화 검색 / 날짜 찾기');
  for(const id of ['myRepliesBtn']){assert.equal(await page.locator('#'+id).getAttribute('type'),'checkbox');assert.equal(await page.locator('#'+id).isChecked(),false);}
  await page.evaluate(()=>{state.calendarMonth=new Date(2026,9,1);renderDateCalendar();});
  if(viewport.width===1440&&!viewport.installed||viewport.width===390){
   for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){
    await page.evaluate(theme=>FrommThemes.set(theme),theme);
    const palette=await page.evaluate(()=>{
     const probe=document.createElement('span');document.body.append(probe);const rgb=token=>{probe.style.color=`var(--theme-${token})`;return getComputedStyle(probe).color;};
     const expected={card:rgb('card'),soft:rgb('soft'),accent:rgb('accent'),selected:rgb('selected')};probe.remove();
     const input=document.querySelector('#myRepliesBtn');input.checked=true;
     const day=document.querySelector('.date-day.has-chat');day.classList.add('today','selected');
     const actual={calendar:getComputedStyle(document.querySelector('#dateCalendar')).backgroundColor,restDay:getComputedStyle(document.querySelector('.date-day:not(.selected):not(.today)')).backgroundColor,close:getComputedStyle(document.querySelector('.glowme-search-close')).backgroundColor,clear:getComputedStyle(document.querySelector('.chat-search-clear')).backgroundColor,footer:getComputedStyle(document.querySelector('.search-panel-footer')).backgroundColor,nav:getComputedStyle(document.querySelector('#chatMatchNav')).backgroundColor,check:getComputedStyle(input).backgroundColor,radius:getComputedStyle(input).borderRadius,tick:getComputedStyle(input,'::after').opacity,dot:getComputedStyle(day,'::after').backgroundColor,ring:getComputedStyle(day).boxShadow,selection:getComputedStyle(input.closest('label'),'::selection').backgroundColor};
     input.checked=false;day.classList.remove('today','selected');return{expected,actual};
    });
    for(const target of ['calendar','restDay','close','clear'])assert.equal(palette.actual[target],'rgba(0, 0, 0, 0)',theme+' '+target+' has no colored region');assert.equal(palette.actual.footer,palette.expected.card,theme+' calendar footer');assert.equal(palette.actual.nav,palette.expected.soft,theme+' search navigation');assert.equal(palette.actual.check,palette.expected.accent,theme+' checked control');assert.equal(palette.actual.radius,'50%','reply checkbox remains circular');assert.equal(palette.actual.tick,'1');assert.equal(palette.actual.dot,palette.expected.accent,theme+' calendar marker');assert.ok(palette.actual.ring.includes(palette.expected.accent),theme+' today ring');assert.equal(palette.actual.selection,palette.expected.selected,theme+' text selection');
    if(shots&&viewport.width===1440&&['sky','classic'].includes(theme)){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:shots+'/palette-'+theme+'.png'});}
   }
   await page.evaluate(()=>FrommThemes.set('glow'));
  }
  const calendar=await page.locator('#dateCalendar').boundingBox(),move=await page.locator('#dateJumpBtn').boundingBox();const fields=await page.locator('.search-panel-scroll').boundingBox();assert.ok(move.y>=fields.y+fields.height-1,'move footer is below scrollable calendar area');
  const panel=await page.locator('#chatToolsPanel').boundingBox();assert.ok(move.width>=panel.width-50);assert.ok(move.y+move.height<=panel.y+panel.height,'Move remains visible on short screens');
  // Six-week calendars must not overflow sideways, and the bottom row must
  // remain reachable in the INNER scrolling body, even in landscape mode.
  await page.evaluate(()=>{state.calendarMonth=new Date(2026,4,1);renderDateCalendar();});
  await page.waitForTimeout(250);
  const lastDay=page.locator('#dateCalendar .date-day').last();
  await lastDay.scrollIntoViewIfNeeded();
  const grid=await page.evaluate(()=>{
   const scroller=document.querySelector('.search-panel-scroll');
   const calendar=document.querySelector('#dateCalendar');
   const last=calendar.querySelector('.date-day:last-child');
   const s=scroller.getBoundingClientRect(),c=calendar.getBoundingClientRect(),l=last.getBoundingClientRect();
   return {scroller:s.toJSON(),calendar:c.toJSON(),last:l.toJSON(),scrollHeight:scroller.scrollHeight,clientHeight:scroller.clientHeight,scrollTop:scroller.scrollTop};
  });
  assert.ok(grid.calendar.left>=grid.scroller.left-3&&grid.calendar.right<=grid.scroller.right+3,'calendar fits search panel width');
  assert.ok(grid.last.left>=grid.scroller.left-3&&grid.last.right<=grid.scroller.right+3,'last date stays inside panel width');
  assert.ok(grid.last.top>=grid.scroller.top-3&&grid.last.bottom<=grid.scroller.bottom+3,
    'last calendar week is reachable through inner scroll at '+viewport.width+'x'+viewport.height+': '+JSON.stringify(grid));
  await page.evaluate(()=>{state.calendarMonth=new Date(2026,9,1);renderDateCalendar();document.querySelector('.search-panel-scroll').scrollTop=0;});
  if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:shots+`/panel-${viewport.width}${viewport.installed?'-pwa':''}.png`});}
  const before=await page.evaluate(()=>({y:scrollY,key:state.chatMatchKey}));
  await page.locator('.date-day[data-date="2026-10-09"]').click();
  assert.equal(await page.evaluate(()=>state.selectedDate),'2026-10-09');assert.equal(await page.locator('#dateCalendar').getAttribute('aria-hidden'),'false');assert.equal(await page.evaluate(()=>state.chatMatchKey),before.key,'selecting does not navigate until Move');
  await page.locator('#dateJumpBtn').click();await page.waitForFunction(()=>document.querySelector('.date-target-flash'));
  if(!viewport.installed)await page.locator('#chatToolsBtn').click();
  await page.locator('#chatSearchInput').fill('합성 대화');await page.waitForFunction(()=>state.chatQuery==='합성 대화');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  if(viewport.width===1440&&!viewport.installed){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await axe.run('#chatToolsPanel',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);}
  if([1440,390].includes(viewport.width)&&!viewport.installed){
   const alerts=[];page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.accept();});
   await page.evaluate(()=>jumpToDate('2026-10-08'));
   const sheet=page.locator('#saveResultModal');await sheet.waitFor({state:'visible'});
   assert.equal(await sheet.locator('#saveResultTitle').textContent(),'날짜 이동');
   assert.match(await sheet.locator('#saveResultSummary').textContent(),/대화를 찾지 못했습니다/);
   await page.evaluate(async()=>{
    await scrollToOriginalMessage('missing-fixture');
    showSaveNotice('저장 완료 · 2개');
   });
   assert.equal(await sheet.locator('#saveResultTitle').textContent(),'저장 결과');
   await sheet.getByRole('button',{name:'확인',exact:true}).click();
   assert.equal(await sheet.locator('#saveResultTitle').textContent(),'날짜 이동');
   await sheet.getByRole('button',{name:'닫기',exact:true}).click();
   assert.equal(await sheet.locator('#saveResultTitle').textContent(),'인용 원문');
   await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
   assert.deepEqual(alerts,[]);assert.deepEqual(errors,[]);
  }
  await context.close();console.log(`${viewport.width}${viewport.installed?'-PWA':''}: inline calendar, rounded native checkbox semantics, select/Move, panel layout PASS`);
 }
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

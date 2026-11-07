'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const output=process.env.PC_LAYOUT_SCREENSHOT_DIR;
async function shot(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.waitForTimeout(210);await p.screenshot({path:path.join(output,name+'.png')});}}
async function mode(p,name){
 await p.evaluate(name=>{
  clearDownloadSelection();
  if(['all','media','image','video','sound','vote'].includes(name)){setFilter(name);return;}
  state.filter='live';state.live.centerMode=name;state.live.replaySelected=null;channelVideoState.selected=null;
  state.live.channels=[{id:'c',channelName:'테스트 채널'},{id:'b',channelName:'두 번째 채널'}];state.live.replayFilter='all';
  state.live.replayPosts=Array.from({length:24},(_,i)=>({id:'r'+i,title:'합성 Replay '+i,_channelId:'c',type:'live_record'}));
  state.live.replayPaging=new Map([['c',{isLast:true}]]);channelVideoState.channelId='c';
  channelVideoState.pages.set('c',{loaded:true,isLast:true,posts:Array.from({length:24},(_,i)=>({id:'v'+i,title:'합성 Channel '+i,_channelId:'c',type:'video'}))});
  renderLiveView();syncLoadingUI();
 },name);
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(210);
}
async function boxes(p,selector){return p.locator(selector).evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({id:e.id||e.classList[0],...e.getBoundingClientRect().toJSON()})));}
function separate(a,b){return a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;}
(async()=>{
 const server=await serve(),browser=await chromium.launch();
 try{
  for(const width of (process.env.PC_LAYOUT_WIDTHS||'1440,900,760').split(',').map(Number)){
   const {page:p,context,errors}=await open(browser,server.url,{width,height:900});
   const geometry=()=>p.evaluate(()=>Object.fromEntries(['#sidebar','.glowme-nav','#rooms'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
   const baseline=await geometry();assert.equal(baseline['#sidebar'].top,12);
   for(const name of ['all','image','replay','channel','live']){
    await mode(p,name);const g=await geometry();
    for(const sel of Object.keys(g))for(const key of ['top','height'])assert.ok(Math.abs(g[sel][key]-baseline[sel][key])<1,`${width} ${name} stable ${sel} ${key}`);
    const h=await p.locator('.viewer-header').boundingBox();assert.ok(h.x>=g['#sidebar'].right+10,'header starts beside rail');
    const bar=await p.locator('.topbar').boundingBox();assert.ok(name==='live'||['replay','channel'].includes(name)?bar.height>=56&&bar.height<=64:bar.height>=70&&bar.height<=74);
    if(!['live','replay','channel'].includes(name)){
     const artist=await p.locator('#artistTitle').boundingBox(),stats=await p.locator('#artistMediaStats').boundingBox(),auth=await p.locator('.top-auth-controls').boundingBox();
     assert.ok(stats.width>0 && stats.x>=artist.x+artist.width-1,`${width} ${name}: metadata follows artist name`);
     assert.ok(Math.abs((stats.y+stats.height/2)-(artist.y+artist.height/2))<4,`${width} ${name}: artist name and metadata share a row`);
     assert.ok(stats.x+stats.width<=auth.x+1,`${width} ${name}: metadata does not overlap auth controls`);
     assert.ok(Math.abs((artist.y+artist.height/2)-(auth.y+auth.height/2))<4,`${width} ${name}: header information and auth controls share a centerline`);
    }
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${name} no overflow`);
    if(['live','replay','channel'].includes(name)){assert.equal(await p.locator('.title-line').isVisible(),false);assert.equal(await p.locator('#tokenLifeWrap').isVisible(),false);assert.equal(await p.locator('#scanBtn').isVisible(),name!=='channel');if(name==='channel')assert.equal(await p.locator('#channelRefresh').isVisible(),true);}
    await shot(p,`${width}-${name}-empty`);
    if(!['image','replay','channel'].includes(name))continue;
    const card=name==='image'?'.media-card':'.replay-card',download=name==='image'?'.card-download':'.replay-download';
    const before=await boxes(p,card+':first-child,'+card+':first-child '+download),position=await p.evaluate(()=>scrollY);
    await p.evaluate(()=>{const q=downloadSelectionScope();chooseDownloadItem(q.kind,q.items[0]);});await p.waitForTimeout(210);
    assert.deepEqual(await boxes(p,card+':first-child,'+card+':first-child '+download),before,'selection preserves cards and downloads');
    const controls=await boxes(p,'#clearSelectionBtn,#selectAllBtn,#saveSelectedBtn,#sortBtn,.pc-list-host .replay-count,#channelRefresh,.pc-list-host .replay-filter-strip');
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.ok(separate(controls[i],controls[j]),`${width} ${name}: ${controls[i].id} overlaps ${controls[j].id} ${JSON.stringify(controls)}`);
    const toolsVisual=await p.locator('.batch-selection-tools').evaluate(e=>({border:getComputedStyle(e).borderTopWidth,background:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow}));
    assert.equal(toolsVisual.border,'0px',`${width} ${name}: no framed selection capsule`);
    assert.equal(toolsVisual.background,'rgba(0, 0, 0, 0)',`${width} ${name}: selection tools blend into header`);
    assert.equal(toolsVisual.shadow,'none',`${width} ${name}: no separate capsule shadow`);
    if(name==='image'){
     const sort=await p.locator('#sortBtn').boundingBox();
     const headerRow=await p.locator('.pc-media-row').boundingBox();
     assert.ok(sort.height<=38 && sort.y>=headerRow.y+4,`${width}: sorting has vertical breathing room`);
     assert.ok(headerRow.y+headerRow.height-sort.y-sort.height>=4,`${width}: sorting does not hug row bottom`);
    }
    const row=await p.locator(name==='image'?'.pc-media-row':'.pc-list-host .replay-toolbar').boundingBox();
    assert.ok(row.height<=48,'single tool row');
    await shot(p,`${width}-${name}-selected`);
    const buttonsBefore=await boxes(p,'#selectAllBtn,#saveSelectedBtn,#clearSelectionBtn');
    await p.locator('#selectedCount').evaluate(e=>e.textContent='선택 1,000개');
    assert.deepEqual(await boxes(p,'#selectAllBtn,#saveSelectedBtn,#clearSelectionBtn'),buttonsBefore,'count digits do not move buttons');
    await p.locator('#clearSelectionBtn').click();assert.equal(await p.locator('.batch-selection-tools').evaluate(e=>e.inert),false);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);assert.equal(await p.locator('#clearSelectionBtn').isDisabled(),true);
    assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.notEqual(await p.evaluate(()=>document.activeElement.tagName),'BODY','X restores focus');
    assert.deepEqual(await boxes(p,card+':first-child,'+card+':first-child '+download),before,'dismissal preserves list');assert.equal(await p.evaluate(()=>scrollY),position);
    await p.evaluate(()=>{const q=downloadSelectionScope();chooseDownloadItem(q.kind,q.items[0]);clearDownloadSelection();chooseDownloadItem(q.kind,q.items[0]);});await p.waitForTimeout(240);
    assert.equal(await p.locator('#saveSelectedBtn').isVisible(),true,'rapid reselect cancels delayed hide');
    if(name!=='image'){
     await p.evaluate(()=>{renderLiveView();syncLoadingUI();updateSelectedCount();});assert.equal(await p.locator('#saveSelectedBtn').count(),1,'rerender keeps one real control');
     assert.equal(await p.locator('.pc-mode-count').isVisible(),true);
     assert.equal(await p.locator('[data-replay-filter],[data-channel-video-filter]').first().evaluate(e=>typeof e.onclick),'function','real filters retain handlers');
    }
    await p.evaluate(()=>scrollTo(0,600));await p.waitForTimeout(100);assert.equal((await p.locator('.viewer-header').boundingBox()).y,12);
    await shot(p,`${width}-${name}-scrolled`);
    await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>clearDownloadSelection());assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);await p.emulateMedia({reducedMotion:'no-preference'});
   }
   // The same artist header geometry also serves the remaining four filters.
   for(const name of ['media','video','sound','vote']){
    await mode(p,name);
    const artist=await p.locator('#artistTitle').boundingBox(),stats=await p.locator('#artistMediaStats').boundingBox();
    assert.ok(stats.width>0 && stats.x>=artist.x+artist.width-1,`${width} ${name}: single-row artist statistics`);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${name}: no overflow`);
   }
   await mode(p,'image');const header=await p.locator('.viewer-header').boundingBox(),auth=await boxes(p,'.top-auth-controls');
   await p.evaluate(()=>{state.loadingMessages=true;state.hasMoreMessages=true;FrommGlowME.syncHeader();});
   assert.match(await p.locator('#artistLoadStatus').textContent(),/불러오는 중/);
   const [stats,load]=await boxes(p,'#artistMediaStats,#artistLoadStatus');assert.ok(load.left>=stats.right&&Math.abs(load.top-stats.top)<2,'loading beside stats');
   assert.deepEqual(await p.locator('.viewer-header').boundingBox(),header);assert.deepEqual(await boxes(p,'.top-auth-controls'),auth);await shot(p,`${width}-loading`);
   await p.evaluate(()=>{state.loadingMessages=false;FrommGlowME.syncHeader();});assert.equal(await p.locator('#artistLoadStatus').isVisible(),false);
   await p.evaluate(()=>{state.historyError='fixture';FrommGlowME.syncHeader();});assert.match(await p.locator('#artistLoadStatus').textContent(),/재시도/);
   await p.evaluate(()=>{state.historyError='';state.scanGeneration++;state.room=state.rooms[1];state.loadingMessages=false;FrommGlowME.syncHeader();});assert.equal(await p.locator('#artistLoadStatus').textContent(),'');assert.equal(await p.locator('#artistTitle').textContent(),'아티스트 2');
   assert.deepEqual(errors,[]);await context.close();console.log(`PC ${width}: fixed rail, compact modes, aligned tools, animation/focus/loading and stable list PASS`);
  }
  // Only two affected touch screens; no mobile redesign or broad device matrix.
  const {page:p,context,errors}=await open(browser,server.url,{width:390,height:844});
  for(const name of ['all','image']){await mode(p,name);assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('pc-layout')),false);assert.equal(await p.locator('.title-line').isVisible(),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot(p,`390-${name}`);}
  assert.deepEqual(errors,[]);await context.close();console.log('390 touch: existing artist header and media controls preserved; no overflow PASS');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

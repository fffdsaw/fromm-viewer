'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs'),{stableGeometry}=require('./helpers/collection-fixture.cjs');
const output=process.env.CAPSULE_STATES_DIR;
async function shot(p,name){if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.png')});}}
async function controls(p){return p.locator('#mediaSelectionSlot').evaluate(e=>[...e.querySelectorAll('button,#selectedCount')].map(x=>({id:x.id,r:x.getBoundingClientRect().toJSON(),transform:getComputedStyle(x).transform})));}
(async()=>{const s=await serve(),b=await chromium.launch();try{
 for(const installed of [false,true])for(const width of [1440,900,760,390,320]){
  const {page:p,context,errors}=await open(b,s.url,{width,height:900,installed});await p.evaluate(()=>setFilter('image'));await p.waitForFunction(()=>FrommGlowME.capsule!==null);const label=`${installed?'pwa':'web'}-${width}`;
  const baseline=await stableGeometry(p);assert.equal(await p.locator('#selectedCount').textContent(),width>=701?'0개 선택':'선택 0개');assert.equal(await p.locator('#mediaSelectionSlot').isVisible(),false);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true);await shot(p,label+'-zero');
  await p.evaluate(()=>chooseDownloadItem('media',state.infiniteList[0]));await p.waitForFunction(()=>FrommGlowME.capsule.phase==='shown');assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);assert.equal(await p.locator('#clearSelectionBtn').isEnabled(),true);assert.deepEqual(await stableGeometry(p),baseline);
  const beforeControls=await controls(p);assert.ok(beforeControls.every(x=>x.transform==='none'),'native text and hit boxes never transform');const starts=await p.evaluate(()=>FrommGlowME.capsule.starts);await shot(p,label+'-one');
  await p.evaluate(()=>chooseDownloadItem('media',state.infiniteList[1]));assert.equal(await p.locator('#selectedCount').textContent(),width>=701?'2개 선택':'선택 2개');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.starts),starts);assert.deepEqual(await controls(p),beforeControls);assert.deepEqual(await stableGeometry(p),baseline);
  await p.evaluate(()=>FrommGlowME.syncSelection(1000));assert.deepEqual(await controls(p),beforeControls,'digit changes keep native geometry');
  await p.locator('#selectAllBtn').click();assert.ok(await p.evaluate(()=>state.selected.size)>2);assert.deepEqual(await stableGeometry(p),baseline);await p.locator('#selectAllBtn').click();await p.waitForFunction(()=>FrommGlowME.capsule.phase==='hidden');assert.equal(await p.evaluate(()=>state.selected.size),0);assert.equal(await p.locator('#mediaSelectionSlot').isVisible(),false);
  await p.evaluate(()=>{chooseDownloadItem('media',state.infiniteList[0]);state.mediaBulkSaving=true;const button=document.querySelector('#saveSelectedBtn');button.disabled=true;button.textContent='저장 6/16';setBulkSaveButtonProgress(button,6/16);});await p.waitForTimeout(40);assert.equal(await p.locator('#saveSelectedBtn').isDisabled(),true,'sync cannot enable busy save');assert.deepEqual(await stableGeometry(p),baseline);assert.equal(await p.locator('.capsule-horizontal-skin').count(),1);
  await p.waitForFunction(()=>FrommGlowME.capsule.phase==='shown');assert.deepEqual(await controls(p),beforeControls,'progress leaves all control hit boxes stable');
  if(width>=701){
   const close=await p.locator('#clearSelectionBtn').evaluate(button=>{
    const hit=button.getBoundingClientRect(),icon=button.querySelector('svg').getBoundingClientRect(),rim=button.closest('.media-selection-slot').getBoundingClientRect();
    return {offsetX:icon.left+icon.width/2-hit.left-hit.width/2,offsetY:icon.top+icon.height/2-rim.top-rim.height/2,right:rim.right-hit.right};
   });
   assert.deepEqual(close,{offsetX:0,offsetY:0,right:8},'close icon is centered inside the glass rim');
   const save=await p.locator('#saveSelectedBtn').evaluate(e=>{const probe=document.createElement('span');probe.style.color='var(--theme-accent)';e.append(probe);const theme=getComputedStyle(probe).color;probe.remove();return{fill:getComputedStyle(document.querySelector('.selection-save-track>span')).backgroundColor,theme,fit:e.scrollWidth<=e.clientWidth};});
   assert.equal(save.fill,save.theme,'the progress fill uses the active theme');assert.equal(save.fit,true,'the progress text fits the save button');
  }
  await shot(p,label+'-saving');
  await p.evaluate(()=>{state.mediaBulkSaving=false;const button=document.querySelector('#saveSelectedBtn');button.disabled=false;button.textContent='저장';setBulkSaveButtonProgress(button,null);clearDownloadSelection();});await p.waitForFunction(()=>FrommGlowME.capsule.phase==='hidden');
  await p.emulateMedia({reducedMotion:'reduce'});const prior=await p.evaluate(()=>FrommGlowME.capsule.starts);await p.evaluate(()=>chooseDownloadItem('media',state.infiniteList[0]));assert.equal(await p.evaluate(()=>FrommGlowME.capsule.phase),'shown');assert.equal(await p.evaluate(()=>FrommGlowME.capsule.starts),prior);assert.equal(await p.evaluate(()=>FrommGlowME.capsule.live),0);await p.locator('#clearSelectionBtn').click();assert.equal(await p.locator('#mediaSelectionSlot').isVisible(),false);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(label+': hidden-zero, one/many/count-only, fixed sort/scroll/hit-boxes, real select-all, busy save and reduced motion PASS');
 }
}finally{await b.close();await s.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

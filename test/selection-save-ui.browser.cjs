'use strict';
// Synthetic files only: the production saver writes to an isolated OPFS folder.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const output=process.env.SELECTION_SAVE_DIR;
async function geometry(page){return page.evaluate(()=>Object.fromEntries(['#mediaSelectionSlot','#saveSelectedBtn','.selection-save-icon','#selectedCount','#selectAllBtn','#clearSelectionBtn','#sortBtn'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,width:r.width,height:r.height}];})));}
function stationary(before,after){for(const key of Object.keys(before))for(const prop of ['x','y','width','height'])assert.ok(Math.abs(before[key][prop]-after[key][prop])<.6,`${key}.${prop}: ${before[key][prop]} -> ${after[key][prop]}`);}
async function shot(page,name){if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png')});}}
async function setupSave(page,{count=9,fail=-1,picker='granted'}={}){
 await page.route('**/save-ui-fixture/*',route=>route.fulfill({status:route.request().url().includes('/'+fail+'?')?503:200,contentType:route.request().url().includes('sound')?'audio/mp4':route.request().url().includes('video')?'video/mp4':'image/jpeg',body:Buffer.alloc(2048,0x5a)}));
 await page.evaluate(async({count,picker})=>{
  closeSaveResultModal();state.replayBulkSaveProgress=null;
  await setFilter('media');state.sortDirection='asc';state.chatHistoryComplete=true;state.hasMoreMessages=false;
  state.messages=Array.from({length:count+1},(_,i)=>({messageId:'save-ui-'+i,type:['image','video','sound'][i%3],userType:'star',createdAt:1792018800000+i*1000,content:location.origin+'/save-ui-fixture/'+i+'?type='+['image','video','sound'][i%3],thumbnail:'https://fixture.test/photo.svg'}));
  state.chatMessages=state.messages;state.selected=new Set(state.messages.slice(0,count).map(m=>m.messageId));buildMediaSequences();render();
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('selection-ui-'+crypto.randomUUID(),{create:true});
  window.saveQA={root,closed:0,closeTickets:0,waiting:[],released:false,results:null,pickerCalls:0};
  const q=saveQA;
  // Real writes happen before this gate; close() must resolve before counting.
  const wrap=directory=>({kind:'directory',name:directory.name,queryPermission:async()=> 'granted',
   entries:()=>directory.entries(),getDirectoryHandle:async(...args)=>wrap(await directory.getDirectoryHandle(...args)),
   getFileHandle:async(...args)=>{const file=await directory.getFileHandle(...args);return{getFile:()=>file.getFile(),createWritable:async()=>{
    const writer=await file.createWritable();return{write:value=>writer.write(value),abort:()=>writer.abort(),close:async()=>{
     if(!q.released&&q.closeTickets++>=3)await new Promise(resolve=>q.waiting.push(resolve));
     await writer.close();q.closed++;
    }};
   }}}});
  window.FrommSaveFolder={open:async()=>{q.pickerCalls++;if(picker!=='granted')throw new DOMException('Synthetic picker',picker==='cancel'?'AbortError':'NotAllowedError');return wrap(root);}};
  window.showDirectoryPicker=()=>FrommSaveFolder.open();
  const result=showSaveResult;showSaveResult=(...args)=>{q.results={ok:args[0],failures:args[1].length,total:args[2],skipped:args[3]};return result(...args);};
 },{count,picker});
 await page.waitForTimeout(380);
}
async function release(page){await page.evaluate(()=>{saveQA.released=true;saveQA.waiting.splice(0).forEach(resolve=>resolve());});await page.waitForFunction(()=>!state.mediaBulkSaving);}
async function header(page){return page.evaluate(()=>{
 const result={};for(const selector of ['#tokenLifeWrap','.token-life-clock','#tokenLifeText','.header-icon-cluster','#logoutMiniBtn','#scanBtn','#channelRefresh']){
  const e=document.querySelector(selector);if(!e||!e.checkVisibility())continue;
  const r=e.getBoundingClientRect();result[selector==='#channelRefresh'?'#scanBtn':selector]={x:r.x,y:r.y,width:r.width,height:r.height};
 }
 const e=document.querySelector('.header-icon-cluster'),r=e.getBoundingClientRect(),s=getComputedStyle(e,'::before');result.divider={x:r.x+parseFloat(s.left),y:r.y+parseFloat(s.top),width:parseFloat(s.width),height:r.height-parseFloat(s.top)-parseFloat(s.bottom)};
 return result;
});}
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const width of [1440,760])for(const theme of ['glow','classic']){
  const recording=output&&width===1440&&theme==='glow',began=Date.now();
  const client=recording?{newContext:options=>browser.newContext({...options,recordVideo:{dir:path.join(output,'recording'),size:{width,height:900}}})}:browser;
  const {page,context,errors}=await open(client,server.url,{width,height:900});
  let videoStart=0,videoEnd=0;
  await page.evaluate(theme=>FrommThemes.set(theme),theme);
  await setupSave(page);const idle=await geometry(page),idleLabel=await page.locator('.selection-save-label').boundingBox();await shot(page,`${width}-${theme}-idle`);
  videoStart=Date.now();await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>saveQA.closed===3&&saveQA.waiting.length>0);
  await page.waitForTimeout(320);
  assert.equal(await page.locator('.selection-save-number').textContent(),'3/9','only closed writers count');
  assert.equal(await page.locator('.capsule-save-control').getAttribute('data-save-state'),'saving');
  stationary(idle,await geometry(page));
  const layout=await page.evaluate(()=>{const label=document.querySelector('.selection-save-label').getBoundingClientRect(),n=document.querySelector('.selection-save-number').getBoundingClientRect(),bar=document.querySelector('.selection-save-track').getBoundingClientRect(),icon=document.querySelector('.selection-save-icon').getBoundingClientRect(),button=document.querySelector('#saveSelectedBtn').getBoundingClientRect();return{label:{x:label.x,y:label.y,right:label.right,bottom:label.bottom},n:{x:n.x,y:n.y,right:n.right},bar:{x:bar.x,y:bar.y,bottom:bar.bottom},iconRight:icon.right,buttonRight:button.right,buttonBottom:button.bottom,ratio:parseFloat(document.querySelector('.capsule-save-control').style.getPropertyValue('--selection-save-progress'))};});
  assert.ok(layout.label.x<idleLabel.x&&Math.abs(layout.label.y-idleLabel.y+4)<1,'save label moves up and left');
  assert.ok(Math.abs(layout.label.y-layout.n.y)<1,JSON.stringify(layout));assert.ok(layout.label.right+2<=layout.n.x,JSON.stringify(layout));
  assert.ok(layout.bar.x>layout.iconRight&&layout.bar.y>layout.label.bottom&&layout.bar.bottom<layout.buttonBottom,JSON.stringify(layout));
  assert.ok(layout.n.right<layout.buttonRight,JSON.stringify(layout));assert.ok(Math.abs(layout.ratio-100/3)<.01);
  await shot(page,`${width}-${theme}-saving`);
  // Duplicate activation cannot start a second picker or batch.
  await page.evaluate(()=>saveSelectedDirect());assert.equal(await page.evaluate(()=>saveQA.pickerCalls),1);
  await release(page);await page.waitForFunction(()=>document.querySelector('.capsule-save-control').dataset.saveState==='complete');
  await page.waitForTimeout(270);stationary(idle,await geometry(page));await shot(page,`${width}-${theme}-complete`);
  videoEnd=Date.now();
  assert.equal(await page.locator('.selection-save-complete').textContent(),'저장 완료');
  assert.equal(await page.locator('.save-icon-morph').evaluate(e=>getComputedStyle(e).d),'path("M 6 12 L 10 16 L 18 7")');
  assert.deepEqual(await page.evaluate(()=>saveQA.results),{ok:9,failures:0,total:9,skipped:0});
  const files=await page.evaluate(async()=>{const files=[];async function walk(dir,prefix=''){for await(const[name,handle]of dir.entries())if(handle.kind==='directory')await walk(handle,prefix+name+'/');else files.push({name:prefix+name,size:(await handle.getFile()).size});}await walk(saveQA.root);return files;});
  assert.equal(files.length,9);assert.ok(files.every(f=>f.size===2048));assert.equal(files.filter(f=>f.name.startsWith('audio/')).length,3,'preserve existing lowercase audio folder');assert.ok(files.filter(f=>/\.(jpg|mp4)$/.test(f.name)).every(f=>!f.name.includes('/')));
  await page.waitForFunction(()=>document.querySelector('.capsule-save-control').dataset.saveState==='idle');
  // Same production saver, same folder: existing-file skips, no additional write.
  await page.evaluate(()=>{state.selected=new Set(state.messages.slice(0,9).map(m=>m.messageId));updateSelectedCount();});await page.waitForTimeout(330);
  await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>!state.mediaBulkSaving&&saveQA.results?.skipped===9);assert.equal(await page.evaluate(()=>saveQA.closed),9);
  await page.waitForFunction(()=>document.querySelector('.capsule-save-control').dataset.saveState==='idle');
  // Stable space for digit lengths; these are presentation fixtures, no files.
  for(const total of [9,16,100,999]){
   await page.evaluate(total=>{state.selected=new Set(Array.from({length:total},(_,i)=>'digits-'+i));updateSelectedCount();FrommGlowME.setBulkSaveProgress(0);for(let i=0;i<total;i++)FrommGlowME.confirmBulkSaveItem('media',{messageId:'digits-'+i});},total);
   await page.waitForTimeout(270);
   const fits=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),l=r('.selection-save-label'),n=r('.selection-save-number'),b=r('#saveSelectedBtn');return l.right+2<n.x&&n.right<b.right&&document.documentElement.scrollWidth<=innerWidth;});
   assert.ok(await page.locator('#selectedCount').evaluate(e=>{const r=e.getBoundingClientRect(),n=e.querySelector('strong').getBoundingClientRect(),t=e.querySelector('span').getBoundingClientRect();return n.left>=r.left-.5&&t.right<=r.right+.5;}),`${width}/${theme}/${total} selected count fits its slot`);
   assert.ok(fits,`${width}/${theme}/${total} digits fit`);await page.evaluate(()=>FrommGlowME.setBulkSaveProgress(null));
  }
  // Header comparison uses the identical viewport, browser zoom, token text.
  let reference;
  for(const tab of ['media','all','image','video','sound','vote','channel','replay','live']){
   await page.evaluate(async tab=>{state.selected.clear();updateSelectedCount();if(['channel','replay','live'].includes(tab)){state.live.centerMode=tab;await setFilter('live');}else await setFilter(tab);document.querySelector('#tokenLifeText').textContent='194h 33m';},tab);
   await page.waitForTimeout(380);const value=await header(page);if(reference)stationary(reference,value);else reference=value;
   await shot(page,`${width}-${theme}-header-${tab}`);
  }
  assert.deepEqual(errors,[]);await context.close();
  if(recording){await page.video().saveAs(path.join(output,'state-transition.webm'));fs.writeFileSync(path.join(output,'recording.json'),JSON.stringify({start:Math.max(0,(videoStart-began)/1000-.3),duration:(videoEnd-videoStart)/1000+1.1}));}
  console.log(`${width}px ${theme}: actual writes, progress, geometry, repeat, skips, digits, shared headers PASS`);
 }
 const {page,context,errors}=await open(browser,server.url);
 await setupSave(page,{count:6,fail:4});await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>saveQA.waiting.length>0);await release(page);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>saveQA.results.failures),1);assert.equal(await page.evaluate(()=>state.selected.size),1);assert.notEqual(await page.locator('.capsule-save-control').getAttribute('data-save-state'),'complete');assert.equal(await page.locator('#saveResultModal').evaluate(e=>e.classList.contains('open')),true);
 for(const picker of ['cancel','denied']){await setupSave(page,{picker});await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>!state.mediaBulkSaving);assert.equal(await page.evaluate(()=>state.selected.size),9);assert.equal(await page.evaluate(()=>saveQA.closed),0);assert.notEqual(await page.locator('.capsule-save-control').getAttribute('data-save-state'),'complete');}
 await page.emulateMedia({reducedMotion:'reduce'});await setupSave(page);await page.locator('#saveSelectedBtn').click();await page.waitForFunction(()=>saveQA.waiting.length>0);assert.equal(await page.locator('.selection-save-label').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await release(page);
 assert.deepEqual(errors,[]);await context.close();console.log('Partial failure, picker cancel/denial, existing result sheet, reduced motion PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

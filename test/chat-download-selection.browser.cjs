'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.CHAT_DOWNLOAD_DIR;
async function shot(p,name){if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}}
(async()=>{const s=await serve(),b=await chromium.launch();try{
 for(const [width,installed] of [[1440,false],[760,false],[900,true]]){
  const{page:p,context,errors}=await open(b,s.url,{width,height:900,installed});const label=(installed?'pwa-':'web-')+width,iconInset=width>=851?9:10,iconSize=width>=851?34:38;
  await p.evaluate(()=>setFilter('image'));await p.locator('.media-card').first().click({position:{x:30,y:30}});await p.waitForFunction(()=>state.selected.size===1);
  const chosen=p.locator('.media-card.selected').first();assert.equal(await chosen.evaluate(e=>getComputedStyle(e).outlineWidth),'3px');assert.equal(await chosen.locator('.card-body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(201, 233, 218)');await shot(p,label+'-selected');
  // Real pointer drag/autoscroll recolor their border and fill with each palette.
  const card=await p.locator('.media-card').nth(1).boundingBox();await p.mouse.move(card.x+20,card.y+50);await p.mouse.down();await p.mouse.move(card.x+100,880,{steps:8});await p.waitForFunction(()=>!!document.querySelector('.download-selection-box'));
  const box=p.locator('.download-selection-box');
  for(const [theme,rgb] of Object.entries({glow:[22,123,101],aqua:[8,119,125],sky:[34,107,158],lavender:[117,81,152],neutral:[70,107,112],classic:[255,91,115]})){
   await p.evaluate(t=>FrommThemes.set(t),theme);const paint=await box.evaluate(el=>{const style=getComputedStyle(el),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d');c.fillStyle=style.backgroundColor;c.fillRect(0,0,1,1);return{border:style.borderTopColor,fill:[...c.getImageData(0,0,1,1).data]};});assert.equal(paint.border,`rgb(${rgb.join(', ')})`,theme+' drag border uses the theme accent');assert.ok(paint.fill.slice(0,3).every((v,i)=>Math.abs(v-rgb[i])<=3)&&Math.abs(paint.fill[3]-46)<=1,theme+' drag fill uses the same accent at 18% alpha');
  }
  await p.evaluate(()=>FrommThemes.set('glow'));
  const before=await p.evaluate(()=>scrollY);await p.waitForFunction(y=>scrollY>y+50,before);await shot(p,label+'-drag-scrolled');await p.mouse.up();assert.equal(await box.count(),0);
  assert.ok((await p.locator('.media-card.selected .card-body').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor))).every(c=>c==='rgb(201, 233, 218)'));
  const keys=await p.evaluate(()=>[...state.selected].sort());await p.evaluate(()=>{state.filter='all';syncLiveToolbarControls();render();scrollTo(0,0);});
  assert.equal(await p.locator('#timeline [data-download-selection-key]').count(),0);assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);
  const photo=p.locator('.media-wrap img').first();await photo.scrollIntoViewIfNeeded();await photo.click();await p.waitForTimeout(320);assert.deepEqual(await p.evaluate(()=>[...state.selected].sort()),keys);assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);
  const wrap=photo.locator('..'),dl=wrap.locator('.chat-media-download');assert.equal(await dl.count(),1);const visual=await photo.boundingBox(),button=await dl.boundingBox();assert.ok(Math.abs(button.x+button.width-(visual.x+visual.width-iconInset))<2);assert.ok(Math.abs(button.y-visual.y-iconInset)<2);assert.equal(Math.round(button.width),iconSize);assert.match(await dl.getAttribute('aria-label'),/다운로드/);
  const event=p.waitForEvent('download');await dl.focus();await p.keyboard.press('Enter');const downloaded=await event;const file=await downloaded.path();assert.ok(fs.statSync(file).size>0,'real individual download contains synthetic fixture bytes');assert.deepEqual(await p.evaluate(()=>[...state.selected].sort()),keys);assert.equal(await dl.getAttribute('aria-busy'),null);
  await photo.dblclick();await p.locator('#imageLightbox.open').waitFor();assert.deepEqual(await p.evaluate(()=>[...state.selected].sort()),keys);await p.locator('#lightboxClose').click();await shot(p,label+'-chat');
  await p.evaluate(()=>{const m={messageId:'chat-video',userType:'star',type:'video',content:'https://fixture.test/movie.mp4',createdAt:1791534600000};const row=renderMessage(m);document.querySelector('#timeline').prepend(row);});
  const video=p.locator('[data-message-id="chat-video"] video');await video.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-message-id="chat-video"] .mvc-compact-controls'));assert.equal(await video.evaluate(e=>e.controls),false,'visible video delegates native controls to the compact player');const controls=p.locator('[data-message-id="chat-video"] .mvc-compact-controls');assert.equal(await controls.getAttribute('aria-label'),'영상 재생 컨트롤');for(const action of ['play','sound'])assert.equal(await controls.locator('[data-compact="'+action+'"]').isVisible(),true);assert.equal(await controls.locator('.mvc-seek').count(),1);assert.deepEqual(await p.evaluate(()=>[...state.selected].sort()),keys,'mounting controls preserves gallery selection');const v=await video.boundingBox(),vdl=await p.locator('[data-message-id="chat-video"] .chat-media-download').boundingBox();assert.ok(Math.abs(vdl.y-v.y-iconInset)<2);assert.ok(Math.abs(vdl.x+vdl.width-v.x-v.width+iconInset)<2);assert.equal(await p.locator('.batch-selection-tools').isVisible(),false);
  await p.setViewportSize({width:650,height:900});await p.waitForFunction(()=>document.querySelector('#timeline [data-download-selection-key]'));await p.setViewportSize({width,height:900});await p.waitForFunction(()=>!document.querySelector('#timeline [data-download-selection-key]'));assert.equal(await p.locator('.batch-selection-tools').isVisible(),false,'breakpoint changes cannot revive PC chat selection tools');
  await p.evaluate(()=>{state.filter='image';syncLiveToolbarControls();render();});assert.deepEqual(await p.evaluate(()=>[...state.selected].sort()),keys);assert.equal(await p.locator('.batch-selection-tools').isVisible(),true);assert.equal(await p.locator('#saveSelectedBtn').isEnabled(),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(label+': strong selection/drag-autoscroll, chat no selection/capsule, top-right photo/video download, real download bytes, preview and gallery selection restore PASS');
 }
 const{page:p,context,errors}=await open(b,s.url,{width:390,height:844});await p.evaluate(()=>{state.filter='all';syncLiveToolbarControls();render();scrollTo(0,0);});const media=p.locator('.media-wrap[data-download-selection-key]').first();await media.scrollIntoViewIfNeeded();const toggle=media.locator('.selection-toggle');assert.equal(await toggle.count(),1,'mobile selection remains keyboard-accessible without the media filename');await media.click({position:{x:16,y:16}});await p.waitForFunction(()=>state.selected.size===1);assert.equal(await toggle.getAttribute('aria-pressed'),'true','the deferred touch selection settles before verifying its state');assert.equal(await p.locator('#saveSelectedBtn').isVisible(),true);const dl=media.locator('.dl');
 // A positioned decorative child is intentional; the native link must still
 // occupy the exact same inline layout with the fixed material enabled/off.
 await dl.locator('.fixed-glass-surface').waitFor({state:'attached'});
 const rects=()=>media.evaluate(e=>[e,e.querySelector('.dl'),e.querySelector('.selection-toggle')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
 const materialRects=await rects();
 assert.equal(await dl.evaluate(e=>getComputedStyle(e).position),'relative');
 assert.equal(await dl.locator('.fixed-glass-surface').getAttribute('aria-hidden'),'true');
 await p.evaluate(()=>FrommGlassSettings.set({enabled:false},{immediate:true,persist:false}));
 await p.waitForFunction(()=>FrommFixedGlass.snapshot.count===0);
 assert.equal(await dl.evaluate(e=>getComputedStyle(e).position),'static','without decoration the original inline link layout remains');
 assert.deepEqual(await rects(),materialRects,'fixed material cannot move the native link, media or selection hit target');
 await p.evaluate(()=>FrommGlassSettings.set({enabled:true},{immediate:true,persist:false}));
 await dl.locator('.fixed-glass-surface').waitFor({state:'attached'});
 assert.deepEqual(await rects(),materialRects,'re-enabling material preserves the exact hit targets');
 assert.equal(await dl.textContent(),'다운로드');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await shot(p,'390-existing-chat');await context.close();console.log('390 touch: accessible media selection without visible filename, download link and no overflow PASS');
}finally{await b.close();await s.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {serve,seed,open}=require('./helpers/phase3-fixture.cjs');
const output=process.env.GLASS_ENGINE_DIR;
const lens='.glass-preview-lens .webgl-glass-face';

async function settings(page){
 await page.evaluate(()=>FrommGlowME.setRailOpen(true));
 await page.locator('#glassSettingsBtn').click();await page.locator('[data-settings-tab="glass"]').click();
}
async function shot(page,name){
 if(!output)return;
 fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output, name+'.png')});
}
async function regionPixels(canvas){
 return canvas.evaluate(el=>{
  const cx=el.getContext('2d'),{width,height}=el;
  return {edge:[...cx.getImageData(10,0,width-20,Math.floor(height*.3)).data],centre:[...cx.getImageData(30,Math.floor(height*.4),width-60,Math.floor(height*.2)).data]};
 });
}
async function native(page){
 await page.waitForFunction(()=>document.querySelector('.glass-preview-lens')?.matches('[data-glass-material="convex"]')||!!document.querySelector('.glass-preview-lens [data-glass-material="convex"]'));
}
async function centred(sheet){
 await sheet.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
 const offset=await sheet.evaluate(el=>{
  const reference=document.createElement('div');
  reference.style.cssText='position:fixed;inset:0;visibility:hidden;pointer-events:none';
  document.body.append(reference);
  const r=el.getBoundingClientRect(),viewport=reference.getBoundingClientRect();
  reference.remove();
  return {x:r.left+r.width/2-viewport.left-viewport.width/2,y:r.top+r.height/2-viewport.top-viewport.height/2};
 });
 assert.ok(Math.abs(offset.x)<2&&Math.abs(offset.y)<2,JSON.stringify(offset));
}

(async()=>{
 const server=await serve();
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-glass-live-'));
 try{
  const clip=path.join(temp,'live.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-t','4','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',clip]);
  const bytes=fs.readFileSync(clip);
  for(const width of [1440,390]){
   const {page,context,errors}=await open(browser,server.url,{width,height:900});
   if(width===390){
    await page.evaluate(()=>localStorage.setItem('fromm.glassEngine.v1',JSON.stringify({engine:'ybouane'})));
    await page.reload();await seed(page);await settings(page);await native(page);
    assert.equal(await page.getByLabel('광학 엔진').count(),0);
    assert.equal(await page.locator('.glass-preview-caption').textContent(),'실제 엔진 미리보기');
    assert.ok(await page.locator('#saveSelectedBtn').getAttribute('title'));
    await page.locator('#glassSettingsDialog .glass-settings-done').click();
    await page.evaluate(()=>showSaveNotice('저장 완료 · 2개'));
    const sheet=page.locator('#saveResultModal');await sheet.waitFor();
    await sheet.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
    assert.equal(await sheet.evaluate(el=>getComputedStyle(el).animationName),'save-sheet-enter');
    assert.ok((await sheet.boundingBox()).y>450,'the mobile sheet retains its bottom placement');
    assert.equal(await page.locator('.webgl-glass-face').count(),0);
    await sheet.getByRole('button',{name:'확인',exact:true}).click();await sheet.waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);
    console.log(`${width}: original settings, Meapri preview, save tooltip and bottom sheet PASS`);
    await context.close();
    continue;
   }
   await page.route('**/glass-live.mp4',route=>route.fulfill({contentType:'video/mp4',body:bytes}));
   await settings(page);await native(page);
   const choice=page.getByLabel('광학 엔진');assert.equal(await choice.inputValue(),'meapri');
   await shot(page,`${width}-meapri`);
   await choice.selectOption('ybouane');
   const surface=page.locator(lens);await surface.waitFor();
   await page.waitForFunction(()=>document.querySelector('.glass-preview-caption')?.textContent.includes('ybouane'));
   const bent=await regionPixels(surface);
   await page.locator('#ybouane-glass-refraction').fill('0');
   await page.waitForTimeout(180);
   const flat=await regionPixels(surface);
   assert.ok(bent.centre.every(pixel=>pixel===0),'centre exposes the live backdrop');
   assert.deepEqual(flat.centre,bent.centre);
   assert.ok(bent.edge.some((value,index)=>Math.abs(value-flat.edge[index])>3),'the selected WebGL engine displaces the edge');
   await page.locator('#ybouane-glass-refraction').fill('0.55');await page.waitForTimeout(140);
   await shot(page,`${width}-ybouane`);
   await choice.selectOption('meapri');await surface.waitFor({state:'detached'});await native(page);
   await choice.selectOption('ybouane');await surface.waitFor();
   await page.reload();await page.evaluate(()=>{setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();});
   await settings(page);assert.equal(await choice.inputValue(),'ybouane');await surface.waitFor();
   await page.locator('#glassSettingsDialog .glass-settings-done').click();

   await page.evaluate(async()=>{
    const {LiquidGlass}=await import('./vendor/meapri/liquid-glass.js?v=convex-edge-20261124');
    const {createGlass,materialOptions}=await import('./web-glass-material.js?v=glass-engines-20261124');
    window.fixtureGlass=Array.from({length:12},(_,i)=>{
     const el=document.createElement('div');el.className='fixture-unlimited-glass';
     Object.assign(el.style,{position:'fixed',left:200+i*53+'px',top:'180px',width:'45px',height:'45px',borderRadius:'50%',zIndex:1700,pointerEvents:'none'});
     document.body.append(el);
     return createGlass(LiquidGlass,el,{radius:'pill',applyRadius:false,edges:false,...materialOptions(FrommGlassSettings.value)});
    });
   });
   await page.waitForFunction(()=>document.querySelectorAll('.fixture-unlimited-glass[data-glass-engine="ybouane"]').length===12);
   await page.evaluate(()=>{
    return new Promise(resolve=>{
     let count=0;const tick=()=>{window.dispatchEvent(new Event('scroll'));if(++count<8)requestAnimationFrame(tick);else resolve();};
     requestAnimationFrame(tick);
    });
   });
   assert.equal(await page.locator('.fixture-unlimited-glass[data-glass-engine="ybouane"]').count(),12,'scroll keeps every eligible surface rendered');
   await page.evaluate(()=>{for(const item of window.fixtureGlass){item.destroy();item.element.remove();}delete window.fixtureGlass;});
   await page.evaluate(async()=>{
    const video=document.createElement('video');video.id='glass-backdrop-video';video.src='glass-live.mp4';video.muted=true;video.loop=true;
    Object.assign(video.style,{position:'fixed',left:'0',top:'18vh',width:'100vw',height:'64vh',objectFit:'cover',zIndex:1700});
    document.body.append(video);await video.play();showSaveNotice('저장 완료 · 2개');
   });
   const sheet=page.locator('#saveResultModal');
   const canvas=sheet.locator('.webgl-glass-face');await canvas.waitFor();await centred(sheet);
   await page.waitForFunction(()=>document.querySelector('.save-result-card').dataset.glassBackdrop==='media');
   const first=await canvas.evaluate(el=>el.toDataURL());
   await page.waitForFunction(()=>document.querySelector('#glass-backdrop-video').currentTime>0.64);
   await page.waitForFunction(before=>document.querySelector('#saveResultModal .webgl-glass-face')?.toDataURL()!==before,first);
   assert.equal(await canvas.count(),1,'decoded video continues to update the optical surface');
   assert.match(await sheet.locator('#saveResultSummary').textContent(),/저장 완료/);
   await shot(page,`${width}-center-sheet`);
   await sheet.getByRole('button',{name:'확인',exact:true}).click();await sheet.waitFor({state:'hidden'});
   await canvas.waitFor({state:'detached'});
   await page.evaluate(()=>{const video=document.querySelector('#glass-backdrop-video');video.pause();video.remove();});
   await settings(page);await surface.waitFor();
   await page.setViewportSize({width:690,height:900});
   await choice.waitFor({state:'hidden'});await surface.waitFor({state:'detached'});await native(page);
   await page.setViewportSize({width,height:900});
   await choice.waitFor();await surface.waitFor();
   assert.equal(await choice.inputValue(),'ybouane');assert.deepEqual(errors,[]);
   console.log(`${width}: WebGL edge pixels, engine switching, persistence, centred sheet and live video sampling PASS`);
   await context.close();
  }
 }finally{await browser.close();await server.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

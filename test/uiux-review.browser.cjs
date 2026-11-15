'use strict';
// User-reported gallery, rail, theme and first-paint regressions. Synthetic only.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const out=process.env.UIUX_RESULTS_DIR;
async function shot(page,name){if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png')});}}
const voiceSelectors=['.chat-audio-play','.chat-sound-download'];
async function voiceLook(page){return page.evaluate(selectors=>selectors.map(selector=>{
 const el=document.querySelector(selector),face=el.querySelector('.control-glass-surface')||el,css=getComputedStyle(face);
 return {background:css.backgroundImage,color:css.backgroundColor,border:css.borderColor,shadow:css.boxShadow};
}),voiceSelectors);}
(async()=>{
 const s=await serve(process.env.UIUX_SOURCE_ROOT),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const high={newContext:async options=>{const context=await browser.newContext(options);await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});return context;}};
 try{
  for(const [width,height] of [[1536,838],[1440,900],[1280,720],[900,560],[390,844]]){
   const {page:p,context,errors}=await open(high,s.url,{width,height});
   await p.evaluate(()=>{state.rooms=state.rooms.slice(0,8);document.querySelectorAll('#rooms .room').forEach((r,i)=>{if(i>=8)r.remove()});});
   for(const expanded of [false,true]){
    await p.evaluate(value=>FrommGlowME.setRailOpen(value),expanded);await p.waitForTimeout(300);
    const geometry=await p.evaluate(()=>{const rooms=document.querySelector('#rooms'),last=rooms.lastElementChild.querySelector('.rail-avatar'),area=rooms.getBoundingClientRect(),avatar=last.getBoundingClientRect();return{top:avatar.top,bottom:avatar.bottom,areaTop:area.top,areaBottom:area.bottom,size:avatar.width};});
    assert.equal(geometry.size,32,'existing avatar size retained');
    if(width>700&&height>=838)assert.ok(geometry.top>=geometry.areaTop&&geometry.bottom<=geometry.areaBottom,'eight avatars fit without scrolling '+JSON.stringify({width,height,expanded,...geometry}));
    else {await p.locator('#rooms .room').last().scrollIntoViewIfNeeded();const bottom=await p.locator('#rooms .room .rail-avatar').last().boundingBox(),area=await p.locator('#rooms').boundingBox();assert.ok(bottom.y>=area.y&&bottom.y+bottom.height<=area.y+area.height,'short/mobile rail can reveal entire final avatar');}
   }
   for(const theme of ['glow','aqua','sky','lavender','neutral','glow']){
    await p.evaluate(theme=>FrommThemes.set(theme),theme);
    const lines=await p.evaluate(()=>({outer:getComputedStyle(document.querySelector('#sidebar')).borderRightWidth,divider:getComputedStyle(document.querySelector('.rail-artists')).borderTopWidth,seam:getComputedStyle(document.querySelector('#sidebar'),'::after').display}));
    assert.deepEqual(lines,{outer:'0px',divider:'0px',seam:'none'},theme+' preserves a seam-free sidebar');
   }
   await p.evaluate(()=>{FrommGlowME.setRailOpen(false);state.messages=[{messageId:'voice-cover',userType:'star',type:'sound',content:new URL('assets/glowme/mellow-glass.mp3',location.href).href,createdAt:1791534600000},{messageId:'photo-cover',userType:'star',type:'image',content:'https://fixture.test/photo.svg',createdAt:1791534599000}];state.chatMessages=state.messages;setFilter('media');scrollTo(0,0);});
   const cover=p.locator('[data-message-id="voice-cover"] .thumb'),photo=p.locator('[data-message-id="photo-cover"] .thumb');
   const a=await cover.boundingBox(),b=await photo.boundingBox();assert.ok(Math.abs(a.width/a.height-b.width/b.height)<.01,'voice and photo covers share the same ratio');
   assert.equal(await cover.locator('.audio-icon').isVisible(),true);
   assert.equal(await cover.locator('audio').evaluate(el=>el.controls&&!el.hidden),true,'native gallery audio controls are visible');
   const player=await cover.locator('audio').boundingBox();assert.ok(player.y>a.y+a.height/2&&player.y+player.height<=a.y+a.height,'gallery audio remains at the bottom of the cover');
   assert.equal(await cover.locator('audio').evaluate(el=>getComputedStyle(el).colorScheme),'light','native controls retain the main site light palette');
   await shot(p,'review-gallery-'+width);assert.deepEqual(errors,[]);await context.close();console.log(width+'x'+height+': gallery ratio/cover/native controls, eight-artist rail and all theme separators PASS');
  }
  // Hold the asynchronous optics module across a real reload. Voice material
  // must already be present before an observer can insert decorative spans.
  const context=await high.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),p=await context.newPage(),errors=[];
  p.on('pageerror',error=>errors.push(error.message));
  await p.route('**/*',route=>new URL(route.request().url()).origin===new URL(s.url).origin?route.continue():route.abort());
  let release,blocked;const resetGate=()=>{blocked=new Promise(resolve=>release=resolve);};resetGate();
  await p.route('**/web-glass-controls.js?*',async route=>{await blocked;await route.continue();});
  for(let reload=0;reload<3;reload++){
   if(reload===2)await p.evaluate(()=>FrommGlassSettings.set({enabled:false},{immediate:true}));
   if(reload)resetGate();
   await (reload?p.reload({waitUntil:'commit'}):p.goto(s.url,{waitUntil:'commit'}));
   await p.waitForFunction(()=>window.FrommGlowME&&window.FrommChatAudio&&typeof render==='function');await seed(p);
   await p.evaluate(()=>{state.messages=[{messageId:'voice-startup',userType:'star',type:'sound',content:new URL('assets/glowme/mellow-glass.mp3',location.href).href,createdAt:1791534600000}];state.chatMessages=state.messages;state.chatAutoTopPending=false;render();FrommViewState.cancel();scrollTo(0,0);});
   await p.mouse.move(1400,800);await p.waitForTimeout(250);
   assert.equal(await p.locator('.chat-audio-play .control-glass-surface').count(),0,'test observes the pre-initialization state');
   const before=await voiceLook(p);
   if(reload===2){
    assert.ok(before.every(x=>x.background==='none'&&x.color==='rgba(0, 0, 0, 0.72)'),'saved disabled setting paints the original flat voice buttons before modules load');
    release();await p.waitForFunction(()=>window.FrommControlGlass&&window.FrommGlassSettings?.value.enabled===false);await p.waitForTimeout(400);
    assert.deepEqual(await voiceLook(p),before,'disabled voice buttons stay flat after asynchronous setup');
    assert.equal(await p.locator('.chat-audio-play .control-glass-surface,.chat-sound-download .control-glass-surface').count(),0);
    await p.evaluate(()=>FrommGlassSettings.set({enabled:true},{immediate:true}));
    await p.waitForFunction(()=>document.querySelector('.chat-audio-play .control-glass-surface'));
    assert.ok((await voiceLook(p)).every(x=>x.background.includes('linear-gradient')),'switching back on restores the optical material');
    assert.deepEqual(errors,[]);continue;
   }
   assert.ok(before.every(x=>x.background.includes('linear-gradient')&&x.shadow!=='none'),'voice buttons have their final resting material on first paint');
   release();await p.waitForFunction(()=>document.querySelector('.chat-audio-play .control-glass-surface')&&document.querySelector('.chat-sound-download .control-glass-surface'));await p.waitForTimeout(400);
   assert.deepEqual(await voiceLook(p),before,'asynchronous setup preserves both resting colors and rims');
   for(const selector of voiceSelectors){
    const target=p.locator(selector),rest=await voiceLook(p),box=await target.boundingBox();
    await target.hover();await p.waitForFunction(selector=>document.querySelector(selector).dataset.controlOptics==='engine',selector);
    // Mouse focus must not keep an optical hover state alive after leaving.
    await p.mouse.down();await p.mouse.move(1400,800);await p.mouse.up();await p.waitForTimeout(650);
    assert.deepEqual(await voiceLook(p),rest,selector+' restores its baseline after press/leave');
    const illumination=await target.locator('.control-glass-surface').evaluate(face=>[getComputedStyle(face,'::before').opacity,getComputedStyle(face,'::after').opacity]);
    assert.deepEqual(illumination,['0','0'],selector+' leaves no hover illumination');
    assert.deepEqual(await target.boundingBox(),box,'voice hit box stays fixed');
   }
   await shot(p,'review-voice-reload-'+reload);assert.deepEqual(errors,[]);
  }
  await context.close();console.log('Real reload with delayed optics: enabled/disabled voice material, switch restoration and press/leave colors PASS');
 }finally{await browser.close();await s.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

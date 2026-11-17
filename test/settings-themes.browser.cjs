'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const out=process.env.UIUX_RESULTS_DIR;
async function show(p){await p.evaluate(()=>FrommGlowME.setRailOpen(true));await p.locator('#glassSettingsBtn').click();await p.locator('#glassSettingsDialog[open]').waitFor();}
async function inside(p){await p.waitForFunction(()=>{const r=document.querySelector('#glassSettingsDialog').getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;},null,{timeout:3000});const box=await p.locator('#glassSettingsDialog').boundingBox(),view=p.viewportSize();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=view.width+1&&box.y+box.height<=view.height+1,'settings fit viewport');return box;}
const contrast=(fg,bg)=>{const lum=rgb=>{const s=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return s[0]*.2126+s[1]*.7152+s[2]*.0722;};const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
(async()=>{const s=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});try{
 const device={newContext:async options=>{const c=await browser.newContext(options);await c.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});return c;}};
 for(const [width,height]of [[1440,900],[900,560],[390,844]]){
  const {page:p,context,errors}=await open(device,s.url,{width,height});
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});await show(p);await inside(p);
  assert.equal(await p.locator('[role="tab"]').count(),4);
  for(const category of ['general','theme','glass','advanced']){
   await p.locator(`[data-settings-tab="${category}"]`).click();
   assert.equal(await p.locator('[role="tabpanel"]:visible').count(),1);
   const violations=await p.evaluate(async()=>{const r=await axe.run('#glassSettingsDialog',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});assert.deepEqual(violations,[],category+' accessible');
  }
  await p.locator('[data-settings-tab="theme"]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('[data-settings-tab="glass"]').getAttribute('aria-selected'),'true','keyboard category navigation');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'glassEnabled','keyboard reaches glass switch');assert.ok(parseFloat(await p.locator('.glass-switch-track').evaluate(el=>getComputedStyle(el).outlineWidth))>0,'the visible track carries the keyboard focus ring on every viewport');
  const initial=await inside(p);await p.locator('[name="refraction"]').fill('52');await p.locator('[name="refraction"]').dispatchEvent('change');assert.equal(await p.evaluate(()=>FrommGlassSettings.value.refraction),52);assert.deepEqual(await inside(p),initial,'slider never drags dialog');
  if(width===390){
   await p.waitForFunction(()=>FrommGlass.count>0,null,{timeout:8000});
   const scale=()=>p.evaluate(()=>{const face=document.querySelector('.meapri-control'),id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return Number(document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale'));});
   await p.waitForFunction(()=>{const face=document.querySelector('.meapri-control'),id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return Number(document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale'))>0;},null,{timeout:8000});
   const beforeScale=await scale();assert.ok(beforeScale>0,'mobile uses a real optical map');
   await p.locator('#glassEnabled').uncheck();await p.waitForFunction(()=>FrommGlass.count===0,null,{timeout:3000});
   assert.equal(await p.locator('.meapri-control').count(),0,'mobile switch releases optical resources');
   await p.locator('#glassEnabled').check();await p.waitForFunction(()=>FrommGlass.count>0,null,{timeout:8000});
   await p.locator('[name="refraction"]').fill('60');await p.locator('[name="refraction"]').dispatchEvent('change');
   await p.waitForFunction(before=>{const face=document.querySelector('.meapri-control'),id=/url\(["']?#([^"')]+)/.exec(face?.style.backdropFilter)?.[1];return Number(document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale'))>before;},beforeScale,{timeout:5000});
   await p.locator('[name="refraction"]').fill('52');await p.locator('[name="refraction"]').dispatchEvent('change');
  }
  if(width>700){
   const head=await p.locator('.glass-settings-head').boundingBox();await p.mouse.move(head.x+60,head.y+25);await p.mouse.down();await p.mouse.move(20,20,{steps:8});await p.mouse.up();const moved=await inside(p);assert.ok(Math.abs(moved.x-initial.x)>10,'titlebar moves panel');
   const again=await p.locator('.glass-settings-head').boundingBox();await p.mouse.move(again.x+60,again.y+25);await p.mouse.down();await p.mouse.move(width+300,height+300,{steps:8});await p.mouse.up();await inside(p);
  }
  await p.locator('[data-settings-tab="theme"]').click();
  for(const name of ['aqua','sky','lavender','neutral','classic','glow']){
   await p.locator(`[data-theme-choice="${name}"]`).click();assert.equal(await p.evaluate(()=>FrommThemes.value),name);assert.equal(await p.locator(`[data-theme-choice="${name}"]`).getAttribute('aria-pressed'),'true');
   await p.waitForFunction(()=>innerWidth>700?FrommControlGlass.snapshot.live>0:FrommGlass.count>0);
   const material=await p.evaluate(()=>{const flat=document.querySelector('.glowme-nav [aria-current="page"]'),css=getComputedStyle(flat),layers=[...document.querySelectorAll('[data-control-optics="engine"]>.control-glass-surface,.meapri-control')];return{flat:{image:css.backgroundImage,shadow:css.boxShadow,filter:css.backdropFilter,faces:flat.querySelectorAll('.control-glass-surface').length},tints:layers.map(el=>el.style.backgroundColor),faces:layers.filter(el=>el.classList.contains('control-glass-surface')).map(el=>({color:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage}))};});
   assert.deepEqual(material.flat,{image:'none',shadow:'none',filter:'none',faces:0},name+' selected menu stays flat');assert.ok(material.tints.length>0&&material.tints.every(c=>/^rgba\([^)]*, 0\)$/.test(c)),name+' active PC/mobile engines use zero-alpha tint');assert.ok(material.faces.every(c=>c.color==='rgba(0, 0, 0, 0)'&&c.image==='none'),name+' optical faces stay clear');
   const resources=await p.evaluate(()=>FrommControlGlass.snapshot);assert.ok(resources.limit===null&&resources.live<=resources.count&&resources.builds-resources.disposed===resources.live,'theme changes retain bounded engine resources');
   const surfaces=await p.evaluate(()=>{const text=document.querySelector('.msg.star .bubble:has(>.text)'),sidebar=document.querySelector('#sidebar');return{background:getComputedStyle(document.body).backgroundColor,text:getComputedStyle(text).color,card:getComputedStyle(text).backgroundColor,sidebar:getComputedStyle(sidebar).backgroundColor}});assert.ok(contrast(surfaces.text,surfaces.card)>=4.5,name+' conversation text meets AA contrast');
   if(name!=='glow'){
    await p.waitForTimeout(300);
    const palette=await p.evaluate(()=>{const root=getComputedStyle(document.documentElement),probe=document.createElement('span');document.body.append(probe);const color=name=>{probe.style.color=root.getPropertyValue(name);return getComputedStyle(probe).color;};const get=(selector,property)=>getComputedStyle(document.querySelector(selector))[property];const expected={header:color('--theme-header'),soft:color('--theme-soft'),selected:color('--theme-selected'),text:color('--theme-text')};const actual={header:get('.viewer-header','backgroundColor'),sidebar:get('#sidebar','backgroundColor'),button:get('#tokenLifeWrap','backgroundColor'),artist:get('#rooms .room.active','backgroundColor'),nav:get('.glowme-nav button','color'),border:get('#sidebar','borderRightWidth'),shadow:get('#sidebar','boxShadow'),divider:get('.rail-artists','borderTopWidth')};probe.remove();return{expected,actual,collapsed:matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)').matches&&!document.documentElement.classList.contains('sidebar-open')};});
    assert.deepEqual(palette.actual,{header:palette.expected.header,sidebar:palette.expected.header,button:'rgba(0, 0, 0, 0)',artist:palette.collapsed?'rgba(0, 0, 0, 0)':palette.expected.selected,nav:palette.expected.text,border:'0px',shadow:'none',divider:'0px'},name+' synchronizes header/sidebar/buttons/selection without a sidebar seam');
   }
   const colors=await p.locator('.glass-settings-body').evaluate(el=>{const p=el.querySelector('section:not([hidden]) p');return{fg:getComputedStyle(p).color,bg:getComputedStyle(document.querySelector('#glassSettingsDialog')).backgroundColor}});assert.ok(contrast(colors.fg,colors.bg)>=4.5,name+' settings text meets AA contrast '+JSON.stringify(colors));
  }
  await p.locator('[data-theme-choice="sky"]').click();
  if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'settings-'+width+'.png')});}
  const saved=await inside(p);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
  await p.reload();await seed(p);assert.equal(await p.evaluate(()=>FrommThemes.value),'sky');assert.equal(await p.evaluate(()=>FrommGlassSettings.value.refraction),52);
  await p.evaluate(()=>FrommThemes.set('classic'));await p.reload();await seed(p);assert.equal(await p.evaluate(()=>FrommThemes.value),'classic','original gray/pink palette persists across reload');assert.equal(await p.locator('meta[name="theme-color"]').getAttribute('content'),'#171a21','PWA theme color follows the saved palette');
  await show(p);const restored=await inside(p);if(width>700)assert.ok(Math.abs(saved.x-restored.x)<1&&Math.abs(saved.y-restored.y)<1,'last position restored');
  await p.setViewportSize({width:390,height:500});await inside(p);await p.setViewportSize({width,height});await inside(p);
  await p.locator('.glass-settings-reset').click();assert.equal(await p.evaluate(()=>FrommThemes.value),'glow');assert.deepEqual(await p.evaluate(()=>FrommGlassSettings.value),await p.evaluate(()=>FrommGlassSettings.defaults));assert.equal(await p.evaluate(()=>state.messages.length),180,'presentation reset preserves conversation');
  if(await p.locator('#glassSettingsDialog').evaluate(el=>el.matches(':modal'))){for(let i=0;i<18;i++){await p.keyboard.press('Tab');assert.equal(await p.locator('#glassSettingsDialog').evaluate(el=>el.contains(document.activeElement)),true,'mobile modal contains focus');}}else{await p.locator('#chatToolsBtn').focus();assert.equal(await p.evaluate(()=>document.activeElement.id),'chatToolsBtn','desktop settings permit live page interaction');}
  await p.locator('.glass-settings-done').click();
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});await p.evaluate(()=>FrommThemes.set('classic'));await p.waitForTimeout(350);
  const classicViolations=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(classicViolations,[],'classic full conversation meets AA');await p.evaluate(()=>FrommThemes.reset());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  // Real collection and gallery renderers must share the chosen palette,
  // including selected bodies; the original Glow ME cascade stays untouched.
  for(const mode of ['replay','channel']){
   await p.evaluate(mode=>{
    const post={id:'theme-post',type:mode==='replay'?'live_record':'video',title:'Synthetic theme collection',_channelId:'fixture-channel',_channelName:'Synthetic channel',displayStartAt:1791534600000};
    state.filter='live';state.live.centerMode=mode;state.live.replaySelected=null;state.live.replayFilter='fixture-channel';state.live.replayPosts=[post];state.live.replayPaging=new Map([['fixture-channel',{loaded:true,isLast:true}]]);
    channelVideoState.selected=null;channelVideoState.channelId='fixture-channel';channelVideoState.pages=new Map([['fixture-channel',{loaded:true,isLast:true,posts:[post]}]]);renderLiveView();
    document.querySelector('.replay-card .selection-toggle').click();
    state.selected.add('theme-photo');document.querySelector('.replay-grid').append(renderMediaCard({messageId:'theme-photo',type:'image',content:'https://fixture.test/photo.svg',createdAt:1791534600000}));
   },mode);
   assert.equal(await p.locator('.replay-card').evaluate(el=>el.classList.contains('selected')),true);
   for(const theme of ['aqua','sky','lavender','neutral','classic']){
    await p.evaluate(theme=>FrommThemes.set(theme),theme);
    const collection=await p.locator('.replay-card .replay-body').evaluate(el=>getComputedStyle(el).backgroundColor),gallery=await p.locator('.media-card.selected .card-body').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(collection,gallery,mode+' and media selected bodies share '+theme+' palette');
   }
  }
  await p.evaluate(()=>FrommThemes.reset());await context.close();console.log(width+'x'+height+': settings categories/AA/keyboard, slider, drag bounds, themes, reload, resize, reset and preserved data PASS');
 }
 const context=await browser.newContext();await context.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError')}});const p=await context.newPage();await p.route('**/*',route=>new URL(route.request().url()).origin===new URL(s.url).origin?route.continue():route.abort());await p.goto(s.url);await seed(p);await show(p);await p.locator('[data-settings-tab="theme"]').click();await p.locator('[data-theme-choice="aqua"]').click();assert.equal(await p.evaluate(()=>FrommThemes.value),'aqua','theme usable without storage');assert.equal(await p.evaluate(()=>FrommThemes.persistent),false);await context.close();console.log('Blocked storage: current-window preferences remain usable PASS');
 const savedContext=await browser.newContext(),savedPage=await savedContext.newPage();await savedContext.addInitScript(()=>localStorage.setItem('fromm.theme.v1','classic'));await savedPage.route('**/*',route=>new URL(route.request().url()).origin===new URL(s.url).origin?route.continue():route.abort());await savedPage.goto(s.url);await savedPage.locator('.login-panel').waitFor({state:'visible'});await savedPage.addScriptTag({path:require.resolve('axe-core/axe.min.js')});for(const selector of ['#loginEmail','#loginPassword']){const colors=await savedPage.locator(selector).evaluate(el=>({fg:getComputedStyle(el,'::placeholder').color,bg:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));assert.ok(contrast(colors.fg,colors.bg)>=4.5,'saved classic input placeholder contrast '+JSON.stringify(colors));assert.ok(contrast(colors.text,colors.bg)>=4.5,'saved classic typed text contrast');}const loginViolations=await savedPage.evaluate(async()=>{const r=await axe.run('#loginGate',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));});assert.deepEqual(loginViolations,[],'saved classic login remains readable');await savedContext.close();console.log('Saved classic: fresh anonymous login AA PASS');
}finally{await browser.close();await s.close()}})().catch(error=>{console.error(error);process.exitCode=1});

'use strict';
// Real HTTP production assets and worker; synthetic account/media metadata only.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.GLOWME_SCREENSHOT_DIR;
const reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),rel=decodeURIComponent(url.pathname).replace(/^\/fromm-viewer\//,'');
 const file=path.resolve(root,rel||'index.html');
 if(!url.pathname.startsWith('/fromm-viewer/')||!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 if(url.searchParams.has('baseline')&&rel==='index.html')return res.end(execFileSync('git',['show','82e41b0:index.html'],{cwd:root}));
 res.end(fs.readFileSync(file));
});
async function seed(page){
 await page.evaluate(()=>{
  setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();
  state.room={id:'fixture-room',host:{nick:'UI 검증'}};state.rooms=[state.room];
  state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
  state.messages=Array.from({length:32},(_,i)=>({messageId:`m${i}`,type:'text',userType:'star',content:`레이아웃 검증 ${i+1}`,createdAt:1791534600000+i*60000}));
  state.chatMessages=state.messages;state.live.discoveryLoaded=true;state.live.channelsLoaded=true;
  state.live.channels=[{id:'fixture-channel',channelName:'UI 검증'}];
  document.querySelector('#artistTitle').textContent='UI 검증';
  document.querySelector("#rooms").innerHTML='<button class="room active" type="button">UI 검증</button>';render();
 });
}
async function screenshot(page,name){if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}}
async function geometry(page,label){
 const result=await page.evaluate(()=>{
  const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,
   layout:document.documentElement.dataset.glowLayout,header:rect('.viewer-header'),content:rect('#timeline'),sidebar:rect('#sidebar'),panel:rect('#chatToolsPanel')};
 });
 assert.equal(result.overflow,false,label+' horizontal overflow');reports.push({label,...result});
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width<900});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.goto(origin+'/fromm-viewer/index.html?baseline=1');await seed(page);await screenshot(page,`before-${viewport.width}`);
   await page.goto(origin+'/fromm-viewer/');
   await page.waitForFunction(()=>!!window.FrommGlowME);
   await screenshot(page,`login-${viewport.width}`);await seed(page);
   await geometry(page,`web-${viewport.width}`);await screenshot(page,`web-${viewport.width}`);
   const start=await page.locator('#sidebarToggleBtn').boundingBox();
   await page.locator('#chatToolsBtn').click();
   await page.locator('#sidebarToggleBtn').click();
   await page.waitForFunction(()=>document.body.classList.contains('sidebar-open'));
   assert.equal(await page.locator('#chatToolsPanel').evaluate(e=>e.classList.contains('open')),true,'menu does not close search');
   const opened=await page.locator('#sidebarToggleBtn').boundingBox();
   assert.ok(Math.abs(opened.x-start.x)<1&&Math.abs(opened.y-start.y)<1,'menu button never shifts on open');
   await page.locator('#sidebarToggleBtn').click();
   assert.equal(await page.locator('#chatToolsPanel').evaluate(e=>e.classList.contains('open')),true);
   await page.locator('#datePickerBtn').click();
   await geometry(page,`web-search-${viewport.width}`);await screenshot(page,`search-${viewport.width}`);
   await page.locator('.glowme-search-close').click();
   await page.locator('#sidebarToggleBtn').click();
   await screenshot(page,`menu-${viewport.width}`);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#sidebar').getAttribute('aria-hidden'),'true');
   // Existing filter dispatch remains the only entry to media, not a duplicate data path.
   await page.locator('#sidebarToggleBtn').click();
   await page.locator('[data-glow-nav="media"]').click();
   assert.equal(await page.evaluate(()=>state.filter),'media');
   await page.evaluate(()=>setFilter('all',{autoTop:false}));
   await page.evaluate(()=>window.scrollTo(0,500));
   await page.locator('#sidebarToggleBtn').click();
   await screenshot(page,`scrolled-menu-${viewport.width}`);
   await page.keyboard.press('Escape');
   await context.close();
  }
  // display-mode is simulated; this verifies layout, not a physical Chrome install.
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const original=window.matchMedia.bind(window),mode=new EventTarget();
   Object.defineProperties(mode,{matches:{get:()=>true},media:{value:'(display-mode: standalone)'}});
   window.matchMedia=query=>query==='(display-mode: standalone)'?mode:original(query);
  });
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/fromm-viewer/');await seed(page);
  await page.waitForFunction(()=>window.FrommGlowME?.pinned);
  assert.equal(await page.locator('#sidebarToggleBtn').isVisible(),false);
  assert.equal(await page.locator('.glowme-search-close').isVisible(),false);
  assert.equal(await page.locator('#chatToolsPanel').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#dateCalendar').getAttribute('aria-hidden'),'false');
  await geometry(page,'installed-1440');await screenshot(page,'installed-1440');
  await page.locator('[data-glow-nav="media"]').click();
  assert.equal(await page.locator('#sidebar').getAttribute('aria-hidden'),'false','artist/filter action keeps installed menu');
  assert.equal(await page.locator('.glowme-search-fields').evaluate(e=>e.disabled),true,'non-chat search cannot disturb video');
  await page.locator('[data-glow-nav="all"]').click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!window.FrommGlowME.pinned);
  assert.equal(await page.locator('#sidebarToggleBtn').isVisible(),true);
  await geometry(page,'installed-narrow-390');await screenshot(page,'installed-narrow-390');
  await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>window.FrommGlowME.pinned);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#sidebar').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#chatToolsPanel').getAttribute('aria-hidden'),'false');
  const sw=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,script:r.active.scriptURL};});
  assert.equal(sw.scope,origin+'/fromm-viewer/');
  await context.close();assert.deepEqual(errors,[],'production JS errors');
  if(out)fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(reports,null,2));
  console.log('Glow ME: 4 web viewports, independent drawers, fixed toggle, installed 3-column/narrow layout and real scoped worker PASS');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});

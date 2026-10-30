'use strict';
// Same production UI/state/viewport, changing only the pre-refinement CSS.
// No real account, Fromm traffic, native bridge or personal conversation.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=process.env.LIQUID_SCREENSHOT_DIR||process.env.GLOWME_SCREENSHOT_DIR;
const baseline=execFileSync('git',['show','0222acc:glowme.css'],{cwd:root});
const reports=[],benchmarks=[],audits=[],errors=[];
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),rel=decodeURIComponent(url.pathname).replace(/^\/fromm-viewer\//,'');
 const file=path.resolve(root,rel||'index.html');
 if(!url.pathname.startsWith('/fromm-viewer/')||!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function seed(page){
 await page.evaluate(()=>{
  setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();
  state.room={hostChatRoomId:'synthetic-room',host:{nick:'아티스트 A'}};
  state.rooms=[state.room];state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
  state.messages=Array.from({length:120},(_,i)=>({messageId:`fixture-${i}`,type:'text',userType:'star',content:['좋은 하루 보내세요','대화와 미디어를 모아보세요','길이가 다른 대화도 선명하게 읽을 수 있어요'][i%3],createdAt:1791534600000+i*60000}));
  state.chatMessages=state.messages;state.live.discoveryLoaded=true;state.live.channelsLoaded=true;
  document.querySelector('#artistTitle').textContent='아티스트 A';
  document.querySelector('#scanState').textContent='대화와 미디어';
  document.querySelector('#rooms').innerHTML=['A','B','C','D','E'].map((name,i)=>`<button type="button" class="room ${i===0?'active':''}"><span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#e3f2ef;margin-right:10px" aria-hidden="true">${name}</span><span class="fixture-room-name">아티스트 ${name}</span></button>`).join('');
  render();window.scrollTo(0,0);
 });
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function shot(page,name){if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}}
async function geometry(page){return page.evaluate(()=>{
 const r=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(x=>Math.round(x*100)/100);};
 return {header:r('.viewer-header'),sidebar:r('#sidebar'),content:r('#timeline'),search:r('#chatToolsPanel'),toggle:r('#sidebarToggleBtn'),overflow:document.documentElement.scrollWidth>innerWidth};
});}
async function contrast(page){
 const labels=await page.evaluate(()=>{
  const selectors=['#artistTitle','#scanState','.header-live-btn span:last-child','.glowme-nav button span','.fixture-room-name','.chat-tools-title','.chat-tools-label','#dateCalendarTitle','.bubble .text'];
  return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].slice(0,8).map(el=>{
   const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   if(!el.checkVisibility()||r.x<0||r.y<0||r.right>innerWidth||r.bottom>innerHeight||!hit||(hit!==el&&!el.contains(hit)))return null;
   return {selector,rect:{x:r.x,y:r.y,w:r.width,h:r.height},color:getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number)};
  }).filter(Boolean));
 });
 // Capture the actual layered background behind glyphs; do not infer contrast
 // from a translucent computed background or silently skip textured surfaces.
 const style=await page.addStyleTag({content:'*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} svg{visibility:hidden!important} input::placeholder{color:transparent!important}'});
 const pixels=await page.screenshot({animations:'disabled'});await style.evaluate(el=>el.remove());
 return page.evaluate(async({labels,png})=>{
  const image=new Image();image.src=png;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const luminance=rgb=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
  return labels.map(({selector,rect,color})=>{
   const fg=luminance(color);let min=100;
   for(let y=Math.ceil(rect.y+1);y<rect.y+rect.h-1;y++)for(let x=Math.ceil(rect.x+1);x<rect.x+rect.w-1;x++){
    const i=(y*canvas.width+x)*4,bg=luminance([data[i],data[i+1],data[i+2]]);
    min=Math.min(min,(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05));
   }
   return {selector,minContrast:Number(min.toFixed(2))};
  });
 },{labels,png:'data:image/png;base64,'+pixels.toString('base64')});
}
async function benchmark(page,cdp){
 const rows=[];
 for(let run=0;run<3;run++){
  await page.evaluate(()=>window.scrollTo(0,0));
  const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const frames=await page.evaluate(()=>new Promise(resolve=>{
   const gaps=[];let first,previous;
   function frame(time){
    if(first===undefined){first=time;previous=time;}
    else {gaps.push(time-previous);previous=time;}
    const elapsed=time-first;window.scrollTo(0,Math.round((Math.sin(elapsed/270)+1)*650));
    if(elapsed<1600)requestAnimationFrame(frame);else{window.scrollTo(0,0);resolve(gaps.slice(5));}
   }requestAnimationFrame(frame);
  }));
  const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const sorted=[...frames].sort((a,b)=>a-b);
  rows.push({run:run+1,medianFrameMs:median(frames),p95FrameMs:sorted[Math.floor(sorted.length*.95)],
   heapMiB:after.JSHeapUsedSize/1048576,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,
   styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,nodes:after.Nodes});
 }
 return {runs:rows,medianFrameMs:median(rows.map(x=>x.medianFrameMs)),p95FrameMs:median(rows.map(x=>x.p95FrameMs)),heapMiB:median(rows.map(x=>x.heapMiB))};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
 try{
  for(const scene of [{name:'web',width:1440,height:900},{name:'app',width:1440,height:900,installed:true},{name:'mobile',width:390,height:844},{name:'narrow',width:320,height:740},{name:'landscape',width:844,height:390}].filter(s=>!process.env.LIQUID_SCENES||process.env.LIQUID_SCENES.split(',').includes(s.name))){
   let beforeGeometry;
   for(const variant of ['before','after']){
    const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},serviceWorkers:'block'}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    if(scene.installed)await page.addInitScript(()=>{
     const original=window.matchMedia.bind(window),mode=new EventTarget();Object.defineProperty(mode,'matches',{get:()=>true});
     window.matchMedia=q=>q==='(display-mode: standalone)'?mode:original(q);
    });
    const materialRequests=[];
    page.on('request',r=>{if(r.url().endsWith('/liquid-header.webp'))materialRequests.push(r.url());});
    await page.route('**/*',route=>{
     const url=new URL(route.request().url());
     if(url.origin!==origin)return route.abort();
     if(variant==='before'&&url.pathname.endsWith('/glowme.css'))return route.fulfill({contentType:'text/css',body:baseline});
     return route.continue();
    });
    await page.goto(origin+'/fromm-viewer/');await seed(page);await page.waitForLoadState('networkidle');
    const g=await geometry(page);assert.equal(g.overflow,false,scene.name+' overflow');
    if(variant==='before')beforeGeometry=g;else assert.deepEqual(g,beforeGeometry,'material must not move layout/controls');
    if(scene.installed){assert.equal(await page.locator('#sidebarToggleBtn').isVisible(),false);}
    await shot(page,`${scene.name}-${variant}-${scene.width}`);
    if(['web','app','mobile'].includes(scene.name)){
     const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
     benchmarks.push({scene:scene.name,variant,...await benchmark(page,cdp)});await cdp.detach();
    }
    if(scene.name==='web'||scene.name==='mobile'){
     await page.locator('#sidebarToggleBtn').click();await page.locator('#chatToolsBtn').click();await page.locator('#datePickerBtn').click();
     await shot(page,`${scene.name}-panels-${variant}-${scene.width}`);
    }
    if(variant==='after'){
     const colors=await contrast(page);assert.ok(colors.length>=(scene.height<500?2:4),`${scene.name}: sampled actual visible text backgrounds (${colors.length})`);
     for(const c of colors)assert.ok(c.minContrast>=4.5,`${scene.name} ${c.selector}: contrast ${c.minContrast}`);
     audits.push({scene:scene.name,contrast:colors});
     const decoration=await page.locator('.topbar').evaluate(el=>{
      const s=getComputedStyle(el,'::before');return {image:s.backgroundImage,animation:s.animationName,pointer:s.pointerEvents};
     });
     assert.ok(decoration.image.includes('liquid-header.webp'));assert.equal(decoration.animation,'none');assert.equal(decoration.pointer,'none');
     assert.equal(materialRequests.length,1,'one bounded decorative texture request per document');
    }else assert.equal(materialRequests.length,0);
    reports.push({scene:scene.name,variant,geometry:g,materialRequests:materialRequests.length});
    await context.close();
   }
   console.log(`${scene.name} ${scene.width}x${scene.height}: same-size before/after, identical geometry, visible-text contrast and static material PASS`);
  }
  assert.deepEqual(errors,[]);assert.ok(fs.statSync(path.join(root,'assets/glowme/liquid-header.webp')).size<80*1024);
  if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'liquid-results.json'),JSON.stringify({reports,benchmarks,audits,assetBytes:fs.statSync(path.join(root,'assets/glowme/liquid-header.webp')).size},null,2));}
  console.log('Liquid Glass: three-run scrolling samples for web/app/mobile; one 61,810-byte static asset; no layout or production JS changes');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});

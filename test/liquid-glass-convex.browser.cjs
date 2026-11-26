'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const {seedCollection}=require('./helpers/collection-fixture.cjs');
const out=process.env.CONVEX_GLASS_DIR;
const card='.save-result-card';

async function capture(page,clip,name){
 const png=await page.screenshot({clip,scale:'css'});
 if(out&&name){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.png'),png);}
 return png.toString('base64');
}
async function compare(page,plain,lensed,regions){
 return page.evaluate(async({plain,lensed,regions})=>{
  async function pixels(png){
   const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
   const canvas=Object.assign(document.createElement('canvas'),{width:image.width,height:image.height});
   const cx=canvas.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0);
   return regions.map(({x,y,w,h})=>cx.getImageData(x,y,w,h).data);
  }
  const [a,b]=await Promise.all([pixels(plain),pixels(lensed)]);
  return a.map((data,r)=>{
   let changed=0;
   for(let i=0;i<data.length;i+=4)if([0,1,2].some(c=>Math.abs(data[i+c]-b[r][i+c])>8))changed++;
   return changed/(data.length/4);
  });
 },{plain,lensed,regions});
}
async function addGrid(page,zIndex=1700){
 await page.evaluate(zIndex=>{
  const grid=document.createElement('div');grid.id='optical-grid';
  Object.assign(grid.style,{position:'fixed',inset:'0',zIndex,pointerEvents:'none',backgroundColor:'#e9eef4',
   backgroundImage:'repeating-linear-gradient(90deg,#39475d 0 2px,transparent 2px 12px),repeating-linear-gradient(#39475d 0 2px,transparent 2px 12px)'});
  document.body.append(grid);
 },zIndex);
}
async function ready(page,selector,scale){
 await page.waitForFunction(({selector,scale})=>{
  const surface=document.querySelector(selector),id=/url\(["']?#([^"')]+)/.exec(surface?.style.backdropFilter)?.[1];
  return surface?.dataset.glassMaterial==='convex'&&document.getElementById(id)?.querySelector('feDisplacementMap')?.getAttribute('scale')===String(scale);
 },{selector,scale});
}
const optics=(page,refraction)=>page.evaluate(refraction=>FrommGlassSettings.set({refraction},{immediate:true,persist:false}),refraction);
async function gridClip(page,surface){
 const box=await surface.boundingBox();
 const clip={x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)};
 await page.evaluate(({x,y})=>{document.querySelector('#optical-grid').style.backgroundPosition=`${x+6}px ${y+6}px`;},clip);
 return clip;
}
const settled=surface=>surface.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});
const removeGrid=page=>page.evaluate(()=>document.querySelector('#optical-grid').remove());

(async()=>{const server=await serve(),browser=await chromium.launch();try{
 for(const width of [1440,390]){
  const {page,context,errors}=await open(browser,server.url,{width,height:900});
  await page.evaluate(()=>setFilter('image'));
  await addGrid(page);
  if(width===1440){
   const clip={x:100,y:100,width:260,height:82};
   await page.evaluate(async()=>{
    const {LiquidGlass}=await import('./vendor/meapri/liquid-glass.js?v=droplet-sheet-20261126');
    const {createGlass,materialOptions}=await import('./web-glass-material.js?v=droplet-sheet-20261126');
    const pane=document.createElement('div');pane.id='optical-pane';
    Object.assign(pane.style,{position:'fixed',left:'100px',top:'100px',width:'260px',height:'82px',borderRadius:'30px',zIndex:1701});
    document.body.append(pane);
    window.opticalPane=createGlass(LiquidGlass,pane,{...materialOptions(FrommGlassSettings.value),refraction:0,radius:'auto',edges:false,applyRadius:false});
   });
   await ready(page,'#optical-pane',0);
   const plain=await capture(page,clip,'grid-flat');
   await page.evaluate(()=>opticalPane.flexRefraction(34));await ready(page,'#optical-pane',68);
   const lensed=await capture(page,clip,'grid-convex');
   const [centre,left,top,corner]=await compare(page,plain,lensed,[{x:35,y:20,w:190,h:42},{x:3,y:26,w:9,h:30},{x:60,y:3,w:140,h:9},{x:5,y:5,w:21,h:21}]);
   assert.ok(centre<.01&&left>.08&&top>.04&&corner>.06,JSON.stringify({centre,left,top,corner}));
   console.log('Grid changed pixels:',{centre,left,top,corner});
   await page.evaluate(()=>{opticalPane.destroy();document.querySelector('#optical-pane').remove();});
  }

  await optics(page,0);
  await page.evaluate(()=>showSaveNotice('저장 완료 · 2개'));
  await ready(page,card,0);
  const sheet=page.locator('#saveResultModal');
  if(width===1440){
   const shape=await sheet.evaluate(async sheet=>{
    const card=sheet.querySelector('.save-result-card');
    await Promise.all(sheet.getAnimations({subtree:true}).map(animation=>animation.finished));
    sheet.classList.remove('open');void sheet.offsetWidth;sheet.classList.add('open');
    const animations=sheet.getAnimations({subtree:true});
    animations.forEach(animation=>{animation.pause();animation.currentTime=110;});
    return {opacity:getComputedStyle(sheet).opacity,clip:getComputedStyle(card).clipPath,content:getComputedStyle(card.querySelector('.save-result-head')).opacity};
   });
   assert.equal(shape.opacity,'1','the sheet remains a live backdrop during the morph');
   assert.notEqual(shape.clip,'none','a rounded smaller shape unfolds into the panel');
   assert.ok(Number(shape.content)>0&&Number(shape.content)<1,'only text and controls fade');
   const middle=await gridClip(page,page.locator(card));
   const flat=await capture(page,middle);
   await optics(page,34);await ready(page,card,68);
   const curved=await capture(page,middle,'save-desktop-unfold');
   const [live]=await compare(page,flat,curved,[{x:125,y:66,w:220,h:27}]);
   assert.ok(live>.03,'the backdrop remains refracted during the actual morph: '+live);
   console.log('Desktop middle frame changed pixels:',live);
   await sheet.evaluate(sheet=>sheet.getAnimations({subtree:true}).forEach(animation=>animation.finish()));
   await optics(page,0);await ready(page,card,0);
  }
  await settled(sheet);
  const clip=await gridClip(page,page.locator(card));
  const plain=await capture(page,clip);
  await optics(page,34);await ready(page,card,68);
  const lensed=await capture(page,clip);
  const [centre,edge]=await compare(page,plain,lensed,[{x:120,y:26,w:95,h:35},{x:4,y:24,w:10,h:36}]);
  assert.ok((width===1440?centre>.02:centre<.01)&&edge>.06,JSON.stringify({width,centre,edge}));
  const id=await page.locator(card).evaluate(e=>/url\(["']?#([^"')]+)/.exec(e.style.backdropFilter)[1]);
  await removeGrid(page);await page.evaluate(()=>showSaveNotice('저장 완료 · 3개'));
  assert.equal(await sheet.locator('#saveResultSummary').textContent(),'저장 완료 · 3개');
  assert.match(await page.locator(card).evaluate(e=>e.style.backdropFilter),new RegExp(id));
  await capture(page,undefined,`save-${width}-light`);
  await page.evaluate(()=>FrommThemes.set('classic'));await ready(page,card,68);
  await capture(page,undefined,`save-${width}-dark`);
  await sheet.getByRole('button',{name:'확인',exact:true}).click();
  await sheet.waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.querySelector('.save-result-card')?.dataset.glassMaterial);

  await page.evaluate(()=>FrommThemes.set('glow'));
  await seedCollection(page,'channel');await addGrid(page,1199);await optics(page,0);
  await page.locator('[data-channel-content-menu]').click();
  const menu=page.locator('.morph-menu-glass');
  await ready(page,'.morph-menu-glass',0);await settled(menu);
  const menuClip=await gridClip(page,menu);
  const flatMenu=await capture(page,menuClip);
  await optics(page,34);await ready(page,'.morph-menu-glass',68);
  const curvedMenu=await capture(page,menuClip);
  const [menuEdge]=await compare(page,flatMenu,curvedMenu,[{x:36,y:4,w:100,h:4}]);
  assert.ok(menuEdge>.08,JSON.stringify({width,menuEdge}));
  await removeGrid(page);await capture(page,undefined,`menu-${width}`);
  await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});

  // The same card remains usable inside a native modal and after an accessibility change.
  await page.evaluate(()=>{
   const dialog=document.createElement('dialog');dialog.id='save-host-fixture';document.body.append(dialog);dialog.showModal();
   showSaveNotice('저장 완료 · 1개');
  });
  await ready(page,card,68);
  assert.equal(await page.locator('#save-host-fixture #saveResultModal').count(),1);
  await page.emulateMedia({forcedColors:'active'});
  await page.waitForFunction(()=>!document.querySelector('.save-result-card')?.dataset.glassMaterial);
  assert.equal(await page.locator(card).evaluate(e=>getComputedStyle(e).backdropFilter),'none');
  await sheet.getByRole('button',{name:'닫기',exact:true}).click();
  await sheet.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log(`${width}px save result and menu changed pixels:`,{centre,edge,menuEdge});
  await context.close();
 }
 const fallback=await open(browser,server.url,{userAgent:'Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15'});
 await fallback.page.evaluate(()=>showSaveNotice('저장 완료 · 1개'));
 await fallback.page.waitForFunction(()=>document.querySelector('.save-result-card')?.style.backdropFilter==='blur(16px)');
 assert.equal(await fallback.page.locator(card).getAttribute('data-glass-material'),null);
 await fallback.page.getByRole('button',{name:'확인',exact:true}).click();
 await fallback.page.locator('#saveResultModal').waitFor({state:'hidden'});
 assert.deepEqual(fallback.errors,[]);await fallback.context.close();
 console.log('Unsupported SVG backdrop uses the readable CSS card and native dismissal');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

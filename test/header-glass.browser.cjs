'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.HEADER_GLASS_DIR,mint='rgb(224, 241, 233)';
function paneStyles(page){
 return page.evaluate(()=>{
  const header=document.querySelector('.viewer-header'),sidebar=document.querySelector('#sidebar');
  return [getComputedStyle(header,'::after').backgroundColor,getComputedStyle(sidebar).backgroundColor,getComputedStyle(header).backdropFilter,getComputedStyle(sidebar).backdropFilter];
 });
}
(async()=>{
 const server=await serve(),browser=await chromium.launch(process.env.PUBLIC_SHA?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{});
 const url=process.env.PUBLIC_SHA?'https://fffdsaw.github.io/fromm-viewer/?deployment='+process.env.PUBLIC_SHA:server.url;
 try{
  for(const viewport of [{width:1440,height:900},{width:760,height:900},{width:900,height:900,installed:true}]){
   const {page,context,errors}=await open(browser,url,viewport);
   await page.evaluate(()=>setFilter('image'));
   const header=page.locator('.viewer-header'),sidebar=page.locator('#sidebar');
   assert.deepEqual(await paneStyles(page),[mint,mint,'none','none']);
   assert.equal(await page.locator('.header-glass-surface,.sidebar-glass-surface').count(),0);
   await page.evaluate(()=>scrollTo(0,400));
   assert.equal((await header.boundingBox()).y,12);
   await page.evaluate(()=>FrommGlowME.setRailOpen(true));
   await page.waitForFunction(()=>!FrommGlowME.railAnimating);
   assert.deepEqual(await paneStyles(page),[mint,mint,'none','none']);

   // Change an actual backdrop beneath the panels. The captured pane pixels stay the same.
   await page.evaluate(()=>{
    const backdrop=document.createElement('div');
    backdrop.id='pane-fixture';
    Object.assign(backdrop.style,{position:'fixed',inset:'0',zIndex:'300',pointerEvents:'none',background:'#aa174e'});
    document.body.append(backdrop);
   });
   for(const pane of [header,sidebar]){
    const box=await pane.boundingBox();
    const clip={x:Math.ceil(box.x+16),y:Math.ceil(box.y+14),width:40,height:12};
    const first=await page.screenshot({clip,animations:'disabled'});
    await page.locator('#pane-fixture').evaluate(e=>e.style.background='#00682c');
    const second=await page.screenshot({clip,animations:'disabled'});
    assert.ok(first.equals(second),'background changes cannot bleed through a solid pane');
    await page.locator('#pane-fixture').evaluate(e=>e.style.background='#aa174e');
   }
   await page.locator('#pane-fixture').evaluate(e=>e.remove());
   await page.evaluate(()=>{FrommGlassSettings.set({enabled:false},{immediate:true});FrommGlowME.setRailOpen(false);});
   assert.deepEqual(await paneStyles(page),[mint,mint,'none','none']);
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.deepEqual(await paneStyles(page),[mint,mint,'none','none']);
   if(out){
    fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'mint-'+viewport.width+(viewport.installed?'-pwa':'')+'.png')});
   }
   assert.deepEqual(errors,[]);
   await context.close();
   console.log(viewport.width+': opaque mint through scrolling, expansion, backdrop changes and preference toggles PASS');
  }
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const assert=require('node:assert/strict');
// Sample the real CSS transition, including visibility. An opacity declaration
// alone is insufficient if visibility is hidden at the start of the fade.
module.exports=async function checkControlsFade(page,controls,stage,{touch=false,cancelTouch=false,outsideQuiet=false,resetPlayback=async()=>{}}={}){
 const state=()=>controls.evaluate(el=>{const css=getComputedStyle(el);return {opacity:Number(css.opacity),visibility:css.visibility,hidden:el.classList.contains('mvc-hidden')};});
 const reveal=async()=>{
  // A sticky header can cover the stage's top corner after touch scrolling.
  // Move over a genuinely exposed point, matching what a user can reach.
  const point=await stage.evaluate(el=>{
   const r=el.getBoundingClientRect();
   for(const fy of [.02,.25,.5,.75])for(const fx of [.02,.5,.9]){
    const x=r.x+r.width*fx,y=r.y+r.height*fy;
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
    const hit=document.elementFromPoint(x,y);if(hit&&(hit===el||el.contains(hit)))return {x,y};
   }
   throw new Error('Player has no exposed pointer target');
  });
  await page.mouse.move(point.x,point.y);
  await page.waitForFunction(()=>{const css=getComputedStyle(document.querySelector('.modern-video-controls'));return css.visibility==='visible'&&Number(css.opacity)>.99;});
 };
 await reveal();await controls.evaluate(el=>el.classList.add('mvc-hidden'));
 await page.waitForTimeout(80);const fading=await state();
 assert.equal(fading.visibility,'visible','visibility stays on during the opacity fade');
 assert.ok(fading.opacity>0&&fading.opacity<1,`a visible intermediate frame exists: ${fading.opacity}`);
 await controls.waitFor({state:'hidden'});assert.equal((await state()).opacity,0);
 await reveal();await resetPlayback();
 if(touch){
  const slider=controls.locator('input.mvc-volume');await slider.scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  const box=await slider.boundingBox();assert.ok(box,'touch hold uses the actual volume slider');
  assert.equal(await slider.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),true,'touch target is exposed in the viewport');
  const cdp=await page.context().newCDPSession(page);
  try{
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
   await page.waitForTimeout(3250);assert.equal((await state()).hidden,false,'a stationary touch hold keeps controls visible');
  }finally{await cdp.send('Input.dispatchTouchEvent',{type:cancelTouch?'touchCancel':'touchEnd',touchPoints:[]});await cdp.detach();}
 }else{
  await controls.locator('summary').hover();await page.waitForTimeout(3250);
  assert.equal((await state()).hidden,false,'hovering over controls keeps them visible without moving');
 }
 await resetPlayback();await page.mouse.move(0,0);
 await page.waitForFunction(()=>document.querySelector('.modern-video-controls').classList.contains('mvc-hidden'),null,{timeout:5000});
 await controls.waitFor({state:'hidden'});
 if(outsideQuiet){await page.mouse.click(1,1);assert.equal((await state()).hidden,true,'unrelated page clicks do not reveal LIVE controls');}
 await reveal();
 await page.emulateMedia({reducedMotion:'reduce'});
 await controls.evaluate(el=>el.classList.add('mvc-hidden'));
 const reduced=await state();assert.equal(reduced.visibility,'hidden');assert.equal(reduced.opacity,0,'reduced motion hides immediately');
 await controls.evaluate(el=>el.classList.remove('mvc-hidden'));
 assert.equal((await state()).visibility,'visible');
 await page.emulateMedia({reducedMotion:'no-preference'});await reveal();
};

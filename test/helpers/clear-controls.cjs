'use strict';
const assert=require('node:assert/strict');
const native=new Set(['.card-download','.replay-download','.replay-play','.chat-media-download','.chat-audio-play','.chat-sound-download','#scrollTopBtn','#tokenLifeWrap','#scanBtn','#logoutMiniBtn','#sortBtn','#saveSelectedBtn','#selectAllBtn','#clearSelectionBtn']);
async function plain(page,selector){
 const target=page.locator(selector).first();await target.waitFor({state:'visible'});
 assert.equal(await target.locator('.control-glass-surface,.mobile-save-glass').count(),0,selector+' has no refractive engine face');
 assert.equal(await target.getAttribute('data-control-optics'),null,selector+' is disconnected from adjustable optics');
 const look=await target.evaluate(e=>{const s=getComputedStyle(e);return{fill:s.backgroundColor,backdrop:s.backdropFilter,shadow:s.boxShadow}});
 assert.deepEqual(look,{fill:'rgba(0, 0, 0, 0)',backdrop:'none',shadow:'none'},selector+' is clear native styling');
 if(await page.evaluate(()=>window.FrommGlassSettings?.value.enabled&&!matchMedia('(prefers-reduced-transparency: reduce)').matches&&!matchMedia('(forced-colors: active)').matches)){
  const face=target.locator(':scope > .fixed-glass-surface');await face.waitFor({state:'attached'});
  assert.equal(await face.count(),1,selector+' has exactly one independent fixed material');
  assert.equal(await face.getAttribute('aria-hidden'),'true');
  const material=await face.evaluate(e=>{const s=getComputedStyle(e);return {fill:s.backgroundColor,filter:s.backdropFilter,shadow:s.boxShadow,pointer:s.pointerEvents};});
  assert.equal(material.fill,'rgba(0, 0, 0, 0)');assert.equal(material.pointer,'none');assert.notEqual(material.shadow,'none');
  assert.equal(material.filter,await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)?'none':'blur(0.4px) saturate(1.17)');
 }
}
module.exports={plain,native};

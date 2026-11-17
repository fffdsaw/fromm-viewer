'use strict';
const assert=require('node:assert/strict');
const native=new Set(['.card-download','.replay-download','.replay-play','.chat-media-download','.chat-audio-play','.chat-sound-download','#scrollTopBtn','#tokenLifeWrap','#scanBtn','#logoutMiniBtn','#sortBtn','#saveSelectedBtn','#selectAllBtn','#clearSelectionBtn']);
async function plain(page,selector){
 const target=page.locator(selector).first();await target.waitFor({state:'visible'});
 assert.equal(await target.locator('.control-glass-surface,.mobile-save-glass').count(),0,selector+' has no engine face');
 assert.equal(await target.getAttribute('data-control-optics'),null,selector+' is disconnected from optics');
 const look=await target.evaluate(e=>{const s=getComputedStyle(e);return{fill:s.backgroundColor,backdrop:s.backdropFilter,shadow:s.boxShadow}});
 assert.deepEqual(look,{fill:'rgba(0, 0, 0, 0)',backdrop:'none',shadow:'none'},selector+' is clear native styling');
}
module.exports={plain,native};

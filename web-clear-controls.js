/* Native clear controls: a cheap pointer highlight, never a refractive surface. */
export const clearControls='#scrollTopBtn,.card-download,.replay-download,.replay-play,.chat-media-download,.chat-sound-download,.chat-audio-play,.small-player-button,.replay-page-download,.replay-page-back,.mvc-button,.video-playlist-toggle,.vote-image-save,.dl,#tokenLifeWrap,#scanBtn,#logoutMiniBtn,#channelRefresh,#sortBtn,#selectAllBtn,#saveSelectedBtn,#clearSelectionBtn,.viewer-header button,.live-mini-btn';
const fine=matchMedia('(hover:hover) and (pointer:fine)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,point=null;
function paint(){
 frame=0;const {el,x,y}=point||{};point=null;
 if(!el?.isConnected||el.disabled||!fine.matches||motion.matches)return;
 const rect=el.getBoundingClientRect();
 el.style.setProperty('--clear-pointer-x',(x-rect.left)+'px');el.style.setProperty('--clear-pointer-y',(y-rect.top)+'px');
}
document.addEventListener('pointermove',event=>{
 if(event.pointerType==='touch'||!fine.matches||motion.matches)return;
 const el=event.target instanceof Element?event.target.closest(clearControls):null;if(!el)return;
 point={el,x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(paint);
},{passive:true});
function reset(){cancelAnimationFrame(frame);frame=0;point=null;}
window.addEventListener('pagehide',reset);window.addEventListener('blur',reset);
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});

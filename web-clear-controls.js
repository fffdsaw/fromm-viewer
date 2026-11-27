/* Native actions: fixed clear material + a cheap pointer light, never lensing. */
import {glassPreferences} from './web-glass-settings.js?v=white-handles-20261127';
import {createGlass,materialOptions} from './web-glass-material.js?v=droplet-sheet-20261126';
export const clearControls='[data-channel-media-type],#scrollTopBtn,.card-download,.replay-download,.replay-play,.chat-media-download,.chat-sound-download,.chat-audio-play,.small-player-button,.replay-page-download,.replay-page-back,.mvc-button,.video-playlist-toggle,.vote-image-save,.dl,#tokenLifeWrap,#scanBtn,#logoutMiniBtn,#channelRefresh,#sortBtn,#selectAllBtn,#saveSelectedBtn,#clearSelectionBtn,.viewer-header button,.live-mini-btn';
// Ordinary collection/media controls are immediate CSS droplets. Existing
// unrelated fixed actions retain their own material owner.
export const cssDropletControls='.viewer-header button,#mediaActionDock button,[data-channel-content-menu],.card-download,.replay-download,.replay-play,.replay-page-back,.replay-page-download,.small-player-button';
const plainPlayerControls='.modern-video-controls .mvc-button,.video-playlist-toggle';
const desktop=matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)');
const plainPlayer=el=>desktop.matches&&el.matches(plainPlayerControls);
const fixedAction=el=>!el.matches(cssDropletControls)&&!plainPlayer(el);
const fixedPreset=Object.freeze({refraction:0,thickness:11,blur:.4,saturation:117,chromatic:0,opacity:51,specular:26});
const opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const surfaces=new Map(),watched=new Set(),near=new Set();
let engine=null,loading=null,materialFrame=0,dirty=true,leaving=false,builds=0;
const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)entry.isIntersecting?near.add(entry.target):near.delete(entry.target);scheduleMaterial();},{rootMargin:innerHeight+'px 0px'}):null;
const enabled=()=>glassPreferences.value.enabled&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');
function scheduleMaterial(){if(!materialFrame&&!leaving)materialFrame=requestAnimationFrame(syncMaterial);}
function removeSurface(el,item){item.glass?.destroy();item.face.remove();el.classList.remove('fixed-glass-relative','fixed-glass-control');surfaces.delete(el);}
function syncMaterial(){
 materialFrame=0;
 if(!enabled()){for(const [el,item]of surfaces)removeSurface(el,item);return;}
 if(dirty){
  const targets=new Set([...document.querySelectorAll(clearControls)].filter(fixedAction));dirty=false;
  for(const el of watched)if(!targets.has(el)||!el.isConnected){visibility?.unobserve(el);watched.delete(el);near.delete(el);}
  for(const el of targets)if(!watched.has(el)){watched.add(el);visibility?.observe(el);if(!visibility)near.add(el);}
 }
 for(const [el,item]of surfaces){
  if(!el.isConnected||!watched.has(el))removeSurface(el,item);
  // Existing handlers replace button text/icons. Reuse the decorative surface
  // and baked specular instead of losing/rebuilding it after play or selection.
  else if(item.face.parentElement!==el)el.prepend(item.face);
 }
 // Read the batch before inserting decorative faces. One viewport ahead keeps
 // the rim ready during scroll; returning controls retain the same material.
 const additions=[...near].filter(el=>!surfaces.has(el)&&el.isConnected&&el.checkVisibility()&&el.clientWidth&&el.clientHeight).map(el=>({el,relative:getComputedStyle(el).position==='static'}));
 for(const {el,relative}of additions){
  const face=document.createElement('span');face.className='fixed-glass-surface';face.setAttribute('aria-hidden','true');face.inert=true;
  if(relative)el.classList.add('fixed-glass-relative');el.classList.add('fixed-glass-control');el.prepend(face);surfaces.set(el,{face,glass:null});
 }
 if(!visibility||document.hidden||motion.matches)return;
 if(!engine){if(!loading&&surfaces.size)loading=import('./vendor/meapri/liquid-glass.js?v=droplet-sheet-20261126').then(m=>{engine=m.LiquidGlass;scheduleMaterial();}).catch(()=>{});return;}
 for(const el of near){const item=surfaces.get(el);if(!item||item.glass||item.failed||!el.checkVisibility())continue;
  try{item.glass=createGlass(engine,item.face,{variant:'clear',profile:'control',preset:'balanced',radius:'auto',applyRadius:false,edges:false,fallbackFilter:'none',respectReducedMotion:true,...materialOptions(fixedPreset)});builds++;}catch{item.failed=true;/* Keep the immediate CSS rim; retry only with a new surface owner. */}
 }
}
new MutationObserver(records=>{
 if(records.some(r=>{
  if(r.target instanceof SVGElement||r.target.closest?.('.fixed-glass-surface,.control-glass-surface,.capsule-optics'))return false;
  const item=surfaces.get(r.target);if(item&&item.face.parentElement!==r.target)return true;
  if(r.type==='attributes')return r.target.matches?.(clearControls+',#loginGate')&&r.oldValue!==r.target.getAttribute(r.attributeName);
  return [...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&!n.matches('.fixed-glass-surface')&&(n.matches(clearControls)||n.querySelector(clearControls)));
 })){dirty=true;scheduleMaterial();}
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','hidden','disabled']});
glassPreferences.subscribe(scheduleMaterial);
for(const query of [opaque,contrast])query.addEventListener('change',scheduleMaterial);
window.addEventListener('pageshow',()=>{leaving=false;dirty=true;scheduleMaterial();});
window.addEventListener('pagehide',()=>{leaving=true;cancelAnimationFrame(materialFrame);materialFrame=0;for(const [el,item]of surfaces)removeSurface(el,item);visibility?.disconnect();watched.clear();near.clear();dirty=true;});
window.FrommFixedGlass=Object.freeze({preset:fixedPreset,get snapshot(){return {count:surfaces.size,live:[...surfaces.values()].filter(x=>x.glass).length,builds};}});
const fine=matchMedia('(hover:hover) and (pointer:fine)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,point=null,lit=null;
function clearLight(el){if(!el)return;el.style.removeProperty('--clear-pointer-x');el.style.removeProperty('--clear-pointer-y');if(lit===el)lit=null;}
function paint(){
 frame=0;const {el,x,y}=point||{};point=null;
 if(!el?.isConnected||el.disabled||!fine.matches||motion.matches)return;
 if(lit&&lit!==el)clearLight(lit);lit=el;
 const rect=el.getBoundingClientRect();
 el.style.setProperty('--clear-pointer-x',(x-rect.left)+'px');el.style.setProperty('--clear-pointer-y',(y-rect.top)+'px');
}
document.addEventListener('pointermove',event=>{
 if(event.pointerType==='touch'||!fine.matches||motion.matches)return;
 const el=event.target instanceof Element?event.target.closest(clearControls):null;if(!el||el.matches('.small-player-button')||plainPlayer(el))return;
 point={el,x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(paint);
},{passive:true});
document.addEventListener('pointerout',event=>{const el=event.target instanceof Element?event.target.closest(clearControls):null;if(el&&!(event.relatedTarget instanceof Node&&el.contains(event.relatedTarget))){if(point?.el===el){cancelAnimationFrame(frame);frame=0;point=null;}clearLight(el);}},{passive:true});
function reset(){cancelAnimationFrame(frame);frame=0;point=null;clearLight(lit);}
window.addEventListener('pagehide',reset);window.addEventListener('blur',reset);
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();scheduleMaterial();});
desktop.addEventListener('change',()=>{dirty=true;scheduleMaterial();});
motion.addEventListener('change',()=>{for(const item of surfaces.values()){item.glass?.destroy();item.glass=null;item.face.removeAttribute('style');delete item.face.dataset.fixedMaterial;}scheduleMaterial();});
scheduleMaterial();

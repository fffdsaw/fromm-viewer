import './web-morph-menu.js?v=droplet-sheet-20261126';
import './web-clear-controls.js?v=droplet-sheet-20261126';
import './web-glass-controls.js?v=droplet-sheet-20261126';
import {glassPC,glassPreferences,mountGlassSettings} from './web-glass-settings.js?v=droplet-sheet-20261126';
import {createGlass,materialOptions} from './web-glass-material.js?v=droplet-sheet-20261126';
mountGlassSettings();window.addEventListener('load',mountGlassSettings,{once:true});
import('./web-capsule-materialize.js?v=droplet-sheet-20261126').then(({createCapsuleMaterializer})=>{
 window.FrommCapsuleMaterializer=createCapsuleMaterializer;window.dispatchEvent(new Event('fromm-capsule-ready'));
}).catch(()=>{});
/* Visible mobile controls use the same material immediately, including while
 * playing media or using a low-memory device. Offscreen/lifecycle cleanup stays. */
const instances=new Map(),saveFaces=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const watched=new Set(),failed=new WeakSet(),versions=new WeakMap();
const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(()=>sync()):null;
const saveSheet=document.querySelector('#saveResultModal'),saveCard=saveSheet?.querySelector('.save-result-card');
let saveGlass=null,saveSettings=null,saveDesktop=false;
let preferences=glassPreferences.value,Engine=null,loading=null,importFailed=false,frame=0,leaving=false;
function eligible(){return preferences.enabled&&!document.hidden&&!reduce.matches&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');}
function sync(){if(!frame&&!leaving)frame=requestAnimationFrame(update);}
function release(el,glass){glass?.destroy();saveFaces.get(el)?.remove();saveFaces.delete(el);el.classList.remove('meapri-control','save-glass-control');}
function update(){
 frame=0;
 const controls=[...document.querySelectorAll('#chatToolsBtn,.glass-preview-lens')];
 for(const el of controls)if(visibility&&!watched.has(el)){watched.add(el);visibility.observe(el);}
 for(const el of watched)if(!el.isConnected){visibility?.unobserve(el);watched.delete(el);}
 const enabled=eligible(),showSave=enabled&&saveCard&&saveSheet.isConnected&&!saveSheet.hidden;
 const targets=enabled&&visibility&&!glassPC.matches?controls.filter(el=>{const r=el.getBoundingClientRect();return el.checkVisibility()&&!el.disabled&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&getComputedStyle(el).pointerEvents!=='none';}):[];
 for(const [el,glass]of instances)if(!targets.includes(el)||saveFaces.has(el)&&!saveFaces.get(el).isConnected){release(el,glass);instances.delete(el);}
 if(!showSave||saveDesktop!==glassPC.matches)releaseSave();
 if((targets.length||showSave)&&!Engine){if(!loading&&!importFailed)loading=import('./vendor/meapri/liquid-glass.js?v=droplet-sheet-20261126').then(module=>{Engine=module.LiquidGlass;}).catch(()=>{importFailed=true;}).finally(()=>{loading=null;if(Engine)sync();});return;}
 if(showSave&&saveSettings!==preferences){
  saveSettings=preferences;
  saveDesktop=glassPC.matches;
  saveCard.classList.toggle('save-result-depth',saveDesktop);
  try{
   const options=materialOptions(preferences);
   if(saveGlass)saveGlass.update(options);
   else saveGlass=createGlass(Engine,saveCard,{variant:'clear',profile:'panel',preset:'balanced',radius:'auto',edges:false,applyRadius:false,fallbackFilter:'blur(16px)',respectReducedMotion:true,...options});
  }catch{saveGlass?.destroy();saveGlass=null;}
 }
 for(const el of targets){
  if(failed.has(el))continue;
  let glass=instances.get(el);
  if(glass&&versions.get(glass)===preferences)continue;
  try{
   if(glass)glass.update(materialOptions(preferences));
   else{el.classList.add('meapri-control');let target=el;
    if(el.id==='saveSelectedBtn'){target=document.createElement('span');target.className='mobile-save-glass';target.setAttribute('aria-hidden','true');target.inert=true;el.prepend(target);el.classList.add('save-glass-control');saveFaces.set(el,target);}
    glass=createGlass(Engine,target,{variant:'regular',profile:'control',preset:'balanced',edges:false,applyRadius:false,fallbackFilter:'none',respectReducedMotion:true,...materialOptions(preferences)});instances.set(el,glass);}
   versions.set(glass,preferences);
  }catch{release(el,glass);instances.delete(el);failed.add(el);}
 }
}
function releaseSave(){saveGlass?.destroy();saveGlass=null;saveSettings=null;}
function clear(){for(const [el,glass]of instances)release(el,glass);instances.clear();releaseSave();}
window.FrommGlass=Object.freeze({sync,get count(){return instances.size;}});
glassPreferences.subscribe(()=>{preferences=glassPreferences.value;sync();});
window.addEventListener('fromm-theme-change',()=>{clear();sync();});
for(const query of [glassPC,reduce,opaque,contrast])query.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);
window.addEventListener('resize',sync,{passive:true});window.addEventListener('scroll',sync,{passive:true});
window.addEventListener('pageshow',()=>{leaving=false;sync();});
window.addEventListener('pagehide',()=>{leaving=true;cancelAnimationFrame(frame);frame=0;clear();visibility?.disconnect();watched.clear();});
new MutationObserver(records=>{if(glassPC.matches)return;if(records.some(r=>!(r.target instanceof SVGElement)&&!r.target.closest?.('.control-glass-surface,.lg-scroll-safe-layer')))sync();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open','disabled']});sync();
if(saveSheet)new MutationObserver(sync).observe(saveSheet,{attributes:true,attributeFilter:['hidden']});

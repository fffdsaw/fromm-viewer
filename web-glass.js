import './web-glass-controls.js?v=theme-surfaces-20261116';
import {glassPC,glassPreferences,mountGlassSettings} from './web-glass-settings.js?v=uiux-review-switch-20261115';
mountGlassSettings();window.addEventListener('load',mountGlassSettings,{once:true});
import('./web-capsule-materialize.js').then(({createCapsuleMaterializer})=>{
 window.FrommCapsuleMaterializer=createCapsuleMaterializer;window.dispatchEvent(new Event('fromm-capsule-ready'));
}).catch(()=>{}); // An unavailable optional adapter leaves the plain mint capsule usable.
/* Limited control optics: idle initialization, no content capture or media hooks. */
const instances=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const versions=new WeakMap();let preferences=glassPreferences.value;
const watched=new WeakSet(),failed=new WeakSet(),visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(()=>sync()):null;
const INPUT_QUIET_MS=800;
let Engine=null,loading=null,scheduled=false,idleTask=0,retry=0,permitBuild=false,lastInput=performance.now();
for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])window.addEventListener(type,()=>{lastInput=performance.now();},{passive:true,capture:true});
function eligible(){
 const lowPower=(navigator.deviceMemory>0&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2);
 return !glassPC.matches&&preferences.enabled&&!!visibility&&!lowPower&&!document.hidden&&!reduce.matches&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');
}
// Scale the same preferences to the existing small mobile profile. Default
// values reproduce its original 16/18/2.5/110/.42/.3 material; retain balanced
// quality, one-pixel maps and all accessibility/low-power/idle guards.
function mobileMaterial(){
 const theme=document.documentElement.dataset.frommTheme,hex=getComputedStyle(document.documentElement).getPropertyValue('--theme-header').trim();
 const rgb=theme&&theme!=='glow'&&/^#[0-9a-f]{6}$/i.test(hex)?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(','):'222,245,232';
 return {
 scheme:theme==='classic'?'dark':'light',
 refraction:16*preferences.refraction/34,thickness:Math.max(4,18*preferences.thickness/28),
 blur:Math.min(6,2.5+preferences.blur),saturation:Math.min(150,110+preferences.saturation-108),
 tint:'rgba('+rgb+','+Math.min(.9,.42*preferences.opacity/28)+')',
 specularIntensity:.3+preferences.specular/100
 };}
function queueBuild(){
 if(idleTask||retry||loading||!eligible())return;
 const run=()=>{
  idleTask=0;if(!eligible())return;
  const quietFor=performance.now()-lastInput;
  if(quietFor<INPUT_QUIET_MS||window.FrommGlowME?.railAnimating||navigator.scheduling?.isInputPending?.()){
   if(!retry)retry=setTimeout(()=>{retry=0;queueBuild();},Math.max(100,INPUT_QUIET_MS-quietFor));return;
  }
  if(!Engine){
   loading=import('./vendor/meapri/liquid-glass.js').then(module=>{Engine=module.LiquidGlass;}).catch(()=>{}).finally(()=>{loading=null;if(Engine)sync();});
   return;
  }
  permitBuild=true;sync();
 };
 idleTask=window.requestIdleCallback?requestIdleCallback(run,{timeout:1200}):setTimeout(run,100);
}
function sync(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{
  scheduled=false;
  const controls=[...document.querySelectorAll('#chatToolsBtn,.glowme-nav [aria-current="page"],#tokenLifeWrap,#scanBtn,#logoutMiniBtn')];
  for(const el of controls)if(visibility&&!watched.has(el)){watched.add(el);visibility.observe(el);}
  const targets=eligible()?controls.filter(el=>{
   const r=el.getBoundingClientRect();
   return !el.hidden&&!el.disabled&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&!(window.FrommGlowME?.railAnimating&&el.closest('.glowme-nav'));
  }):[];
  for(const [el,glass] of instances)if(!targets.includes(el)){glass.destroy();instances.delete(el);el.classList.remove('meapri-control');}
  for(const [el,glass]of instances)if(versions.get(glass)!==preferences){
   try{glass.update(mobileMaterial());versions.set(glass,preferences);}
   catch{glass.destroy();instances.delete(el);el.classList.remove('meapri-control');failed.add(el);}
  }
  const next=targets.find(el=>!instances.has(el)&&!failed.has(el));
  const build=permitBuild&&!window.FrommGlowME?.railAnimating&&performance.now()-lastInput>=INPUT_QUIET_MS;permitBuild=false;
  if(!next){if(window.FrommGlowME?.railAnimating)queueBuild();return;}
  if(!Engine||!build){queueBuild();return;}
  // At most one small control is initialized per idle/frame, after rail motion.
  try{
   next.classList.add('meapri-control');
   const glass=new Engine(next,{variant:'regular',profile:'control',preset:'balanced',scheme:'light',quality:'balanced',chromaticAberration:0,mapPixelRatio:1,edges:false,applyRadius:false,fallbackFilter:'blur(3px) saturate(1.1)',respectReducedMotion:true,...mobileMaterial()});
   instances.set(next,glass);versions.set(glass,preferences);
  }catch{next.classList.remove('meapri-control');failed.add(next);}
  if(targets.some(el=>!instances.has(el)&&!failed.has(el)))queueBuild();
 });
}
window.FrommGlass=Object.freeze({sync,get count(){return instances.size;}});
glassPreferences.subscribe(()=>{preferences=glassPreferences.value;sync();});
window.addEventListener('fromm-theme-change',()=>{for(const glass of instances.values())versions.delete(glass);sync();});
for(const query of [glassPC,reduce,opaque,contrast])query.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);
window.addEventListener('pagehide',()=>{
 for(const [el,glass] of instances){glass.destroy();el.classList.remove('meapri-control');}instances.clear();
 if(idleTask){if(window.cancelIdleCallback)cancelIdleCallback(idleTask);else clearTimeout(idleTask);idleTask=0;}
 clearTimeout(retry);retry=0;permitBuild=false;
});
new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});sync();

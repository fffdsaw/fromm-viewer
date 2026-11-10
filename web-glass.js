import './web-glass-controls.js?v=single-glass-20261110';
import {glassPC,mountGlassSettings} from './web-glass-settings.js?v=rail-top-settings-20261110';
mountGlassSettings();window.addEventListener('load',mountGlassSettings,{once:true});
import('./web-capsule-materialize.js').then(({createCapsuleMaterializer})=>{
 window.FrommCapsuleMaterializer=createCapsuleMaterializer;window.dispatchEvent(new Event('fromm-capsule-ready'));
}).catch(()=>{}); // An unavailable optional adapter leaves the plain mint capsule usable.
/* Limited control optics: idle initialization, no content capture or media hooks. */
const instances=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const watched=new WeakSet(),failed=new WeakSet(),visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(()=>sync()):null;
const INPUT_QUIET_MS=800;
let Engine=null,loading=null,scheduled=false,idleTask=0,retry=0,permitBuild=false,lastInput=performance.now();
for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])window.addEventListener(type,()=>{lastInput=performance.now();},{passive:true,capture:true});
function eligible(){
 const lowPower=(navigator.deviceMemory>0&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2);
 return !glassPC.matches&&!!visibility&&!lowPower&&!document.hidden&&!reduce.matches&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');
}
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
  const controls=[...document.querySelectorAll('#chatToolsBtn,.glowme-nav [aria-current="page"],#scanBtn,#logoutMiniBtn')];
  for(const el of controls)if(visibility&&!watched.has(el)){watched.add(el);visibility.observe(el);}
  const targets=eligible()?controls.filter(el=>{
   const r=el.getBoundingClientRect();
   return !el.hidden&&!el.disabled&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&!(window.FrommGlowME?.railAnimating&&el.closest('.glowme-nav'));
  }):[];
  for(const [el,glass] of instances)if(!targets.includes(el)){glass.destroy();instances.delete(el);el.classList.remove('meapri-control');}
  const next=targets.find(el=>!instances.has(el)&&!failed.has(el));
  const build=permitBuild&&!window.FrommGlowME?.railAnimating&&performance.now()-lastInput>=INPUT_QUIET_MS;permitBuild=false;
  if(!next){if(window.FrommGlowME?.railAnimating)queueBuild();return;}
  if(!Engine||!build){queueBuild();return;}
  // At most one small control is initialized per idle/frame, after rail motion.
  try{
   next.classList.add('meapri-control');
   instances.set(next,new Engine(next,{variant:'regular',profile:'control',preset:'balanced',scheme:'light',quality:'balanced',refraction:16,thickness:18,blur:2.5,saturation:110,chromaticAberration:0,mapPixelRatio:1,tint:'rgba(222,245,232,.42)',specularIntensity:.3,edges:false,applyRadius:false,fallbackFilter:'blur(3px) saturate(1.1)',respectReducedMotion:true}));
  }catch{next.classList.remove('meapri-control');failed.add(next);}
  if(targets.some(el=>!instances.has(el)&&!failed.has(el)))queueBuild();
 });
}
window.FrommGlass=Object.freeze({sync,get count(){return instances.size;}});
for(const query of [glassPC,reduce,opaque,contrast])query.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);
window.addEventListener('pagehide',()=>{
 for(const [el,glass] of instances){glass.destroy();el.classList.remove('meapri-control');}instances.clear();
 if(idleTask){if(window.cancelIdleCallback)cancelIdleCallback(idleTask);else clearTimeout(idleTask);idleTask=0;}
 clearTimeout(retry);retry=0;permitBuild=false;
});
new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});sync();

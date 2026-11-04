/* Small control optics only. No content capture, network fetch or media hooks. */
import {LiquidGlass} from './vendor/meapri/liquid-glass.js';
const instances=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
let scheduled=false;
function sync(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;
  const enabled=!document.hidden&&!reduce.matches&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');
  const targets=enabled?[...document.querySelectorAll('#sidebarToggleBtn,#chatToolsBtn')].filter(el=>!el.hidden&&el.getClientRects().length):[];
  for(const [el,glass] of instances)if(!targets.includes(el)){glass.destroy();instances.delete(el);el.classList.remove('meapri-control');}
  for(const el of targets)if(!instances.has(el)){
   try{el.classList.add('meapri-control');instances.set(el,new LiquidGlass(el,{variant:'regular',profile:'control',preset:'balanced',scheme:'light',quality:'balanced',refraction:16,thickness:18,blur:2.5,saturation:110,chromaticAberration:0,mapPixelRatio:1,tint:'rgba(222,245,232,.42)',specularIntensity:.3,edges:false,applyRadius:false,fallbackFilter:'blur(3px) saturate(1.1)',respectReducedMotion:true}));}
   catch{el.classList.remove('meapri-control');}
  }
 });
}
window.FrommGlass=Object.freeze({sync,get count(){return instances.size;}});
for(const query of [reduce,opaque,contrast])query.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);window.addEventListener('pagehide',()=>{for(const glass of instances.values())glass.destroy();instances.clear();});
new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});sync();

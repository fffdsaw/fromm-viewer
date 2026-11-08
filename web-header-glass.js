/* PC pane optics. Existing Meapri public APIs, no content capture. */
import {glassPreferences,glassPC} from './web-glass-settings.js?v=clear-20261108';
let engineModule=null;
export function createHeaderGlass(){
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
 let paused=false,lastInput=performance.now(),lastMask='';
 function headerMask(header){
  const w=header.clientWidth,h=header.clientHeight,r=parseFloat(getComputedStyle(header).borderTopLeftRadius)||24,key=[w,h,r].join(':');
  if(key===lastMask)return;lastMask=key;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w+24}" height="${h+14}" viewBox="0 0 ${w+24} ${h+14}"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/><rect x="12" y="13" width="${w}" height="${h}" rx="${r}" fill="black"/></mask></defs><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>`;
  header.style.setProperty('--header-glass-surround',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
 }
 function options(){
  const v=glassPreferences.value;
  return {variant:'regular',profile:'bar',preset:'balanced',scheme:'light',quality:'balanced',radius:'auto',applyRadius:false,thickness:v.thickness,refraction:v.refraction,blur:v.blur,saturation:v.saturation,chromaticAberration:0,mapPixelRatio:1,tint:`rgba(255,255,255,${v.opacity/100})`,specular:v.specular>0,specularIntensity:v.specular/100,edges:false,respectReducedMotion:true};
 }
 function pane(target,name){
  const surface=document.createElement('div');surface.className=name+'-glass-surface';surface.setAttribute('aria-hidden','true');surface.inert=true;target.prepend(surface);
  let glass=null,loading=false,blocked='',ticket=0,idle=0,retry=0,timer=0,observer=null,builds=0,disposed=0,mode='plain',reason='pending',lastOptions='',specular=false;
  function paint(){
   const look=glassPC.matches&&glassPreferences.value.enabled&&!paused&&!opaque.matches&&!contrast.matches;
   if(target.classList.contains('glass-pane-on')!==look)target.classList.toggle('glass-pane-on',look);
   if(target.dataset.headerGlass===mode&&target.dataset.headerGlassReason===reason)return;
   target.dataset.headerGlass=mode;target.dataset.headerGlassReason=reason;
   window.dispatchEvent(new Event('fromm-glass-status'));
  }
  function release(){
   ticket++;clearTimeout(timer);timer=0;observer?.disconnect();observer=null;
   if(glass){glass.destroy();glass=null;disposed++;}
   lastOptions='';surface.removeAttribute('style');target.classList.remove(name+'-glass-ready');
  }
  function unavailable(){
   if(paused)return 'paused';if(!glassPC.matches)return 'mobile';if(!glassPreferences.value.enabled)return 'disabled';
   if(!document.querySelector('#loginGate')?.classList.contains('hidden'))return 'login';
   if(document.hidden)return 'hidden';if(motion.matches)return 'motion';if(opaque.matches)return 'transparency';if(contrast.matches)return 'contrast';
   if(navigator.deviceMemory>0&&navigator.deviceMemory<=2||navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2)return 'low-power';
   if(!target.clientWidth||!target.clientHeight)return 'layout';
   if(target.clientWidth*target.clientHeight>360000)return 'area-budget';return blocked;
  }
  function busy(){
   if([...document.querySelectorAll('video')].some(v=>v.readyState>=2&&!v.paused&&!v.ended))return 'video';
   // Keep the existing map attached through width motion. The SDK resizes its
   // map in place after ResizeObserver settles; expansion never destroys it.
   return '';
  }
  function watchReady(generation){
   observer?.disconnect();clearTimeout(timer);
   const ready=()=>{
    if(!glass||generation!==ticket)return;
    const id=/url\(["']?#([^"')]+)/.exec(surface.style.backdropFilter)?.[1];
    if(id&&document.getElementById(id)){
     clearTimeout(timer);timer=0;observer?.disconnect();observer=null;
     mode='svg';reason='';target.classList.add(name+'-glass-ready');paint();sync();
    }
   };
   observer=new MutationObserver(ready);observer.observe(surface,{attributes:true,attributeFilter:['style']});
   timer=setTimeout(()=>{blocked='map-timeout';release();sync();},3000);ready();
  }
  function sync(){
   if(name==='header'&&target.clientWidth)headerMask(target);
   const stop=unavailable();
   if(stop){if(glass||observer)release();mode='plain';reason=stop;paint();return;}
   const work=busy();
   if(work==='video'){if(glass||observer)release();mode='plain';reason=work;paint();return;}
   if(glass){
    const next=options(),key=JSON.stringify(next);
    if(key!==lastOptions){
     const rebuild=specular!==next.specular;specular=next.specular;lastOptions=key;
     try{glass.update(next);if(rebuild){mode='pending';watchReady(ticket);}}catch{blocked='unavailable';release();mode='plain';reason=blocked;}
    }
    paint();return;
   }
   if(work){mode='plain';reason=work;paint();return;}
   if(loading||idle||retry){paint();return;}
   const quiet=performance.now()-lastInput;
   if(quiet<650){retry=setTimeout(()=>{retry=0;sync();},Math.max(100,650-quiet));paint();return;}
   const build=async()=>{
    idle=0;if(unavailable()||busy()||performance.now()-lastInput<650||navigator.scheduling?.isInputPending?.())return sync();
    const generation=ticket;loading=true;mode='pending';reason='';paint();
    try{
     engineModule||=import('./vendor/meapri/liquid-glass.js');const module=await engineModule;
     if(generation!==ticket||unavailable()||busy())return;
     const opts=options();glass=new module.LiquidGlass(surface,opts);builds++;specular=opts.specular;lastOptions=JSON.stringify(opts);
     if(glass.resolved.usesFallback){blocked='unsupported';release();return;}
     watchReady(generation);
    }catch{blocked='unavailable';release();}
    finally{loading=false;const stop=unavailable()||busy();if(stop&&!glass){mode='plain';reason=stop;paint();}else if(!glass)sync();}
   };
   idle=window.requestIdleCallback?requestIdleCallback(build,{timeout:1200}):setTimeout(build,80);paint();
  }
  new ResizeObserver(sync).observe(target);
  return {sync,hide(){release();if(idle){if(window.cancelIdleCallback)cancelIdleCallback(idle);else clearTimeout(idle);}idle=0;clearTimeout(retry);retry=0;mode='plain';reason='hidden';paint();},get live(){return !!glass;},get snapshot(){return {mode,reason,live:!!glass,suspended:false,builds,disposed,resolved:glass?.resolved||null};}};
 }
 const header=pane(document.querySelector('.viewer-header'),'header'),sidebar=pane(document.querySelector('#sidebar'),'sidebar');
 const sync=()=>{header.sync();sidebar.sync();};
 new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 for(const query of [glassPC,motion,opaque,contrast])query.addEventListener('change',sync);
 glassPreferences.subscribe(sync);
 for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])window.addEventListener(type,()=>{lastInput=performance.now();if(!header.live||!sidebar.live)sync();},{passive:true,capture:true});
 // Native backdrop sampling follows scrolling, without a scroll pause or JS animation.
 for(const type of ['play','playing','pause','ended','emptied','loadeddata'])document.addEventListener(type,sync,true);
 document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);
 window.addEventListener('pagehide',()=>{header.hide();sidebar.hide();});
 const api=Object.freeze({enabled:true,setPaused(value){paused=!!value;sync();},get snapshot(){const h=header.snapshot,s=sidebar.snapshot;return {...h,sidebar:s,liveCount:Number(h.live)+Number(s.live)};}});
 sync();return api;
}

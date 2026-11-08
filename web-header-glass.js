/* Opt-in PC header optics. Meapri Regular/bar, native SVG backdrop only. MIT vendor unchanged. */
export function createHeaderGlass(){
 const header=document.querySelector('.viewer-header'),pc=matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)'),motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
 const surface=document.createElement('div');surface.className='header-glass-surface';surface.setAttribute('aria-hidden','true');surface.inert=true;
 const face=document.createElement('div');face.className='header-glass-face';surface.append(face);header.prepend(surface);
 let glass=null,module=null,loading=false,blocked='',paused=false,ticket=0,idle=0,retry=0,readyTimer=0,styleObserver=null,lastInput=performance.now(),builds=0,disposed=0,mode='plain',reason='pending',lastSize='',suspended=false,frostSize='',busyTimer=0;
 function mark(){if(header.dataset.headerGlass!==mode)header.dataset.headerGlass=mode;if(header.dataset.headerGlassReason!==reason)header.dataset.headerGlassReason=reason;}
 function release(){
  ticket++;clearTimeout(readyTimer);readyTimer=0;styleObserver?.disconnect();styleObserver=null;
  if(glass){glass.destroy();glass=null;disposed++;}suspended=false;surface.removeAttribute('style');header.classList.remove('header-glass-ready');
 }
 function mask(){
  const w=header.clientWidth,h=header.clientHeight,r=parseFloat(getComputedStyle(header).borderTopLeftRadius)||24,key=[w,h,r].join(':');
  if(key===lastSize)return;lastSize=key;
  // Vector geometry only: keep the old opaque surround outside the rounded bar,
  // while allowing the actual scrolling backdrop into its narrow optical rim.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w+24}" height="${h+14}" viewBox="0 0 ${w+24} ${h+14}"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/><rect x="12" y="13" width="${w}" height="${h}" rx="${r}" fill="black"/></mask></defs><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>`;
  header.style.setProperty('--header-glass-surround',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
 }
 function unavailable(){
  if(paused)return 'paused';if(!pc.matches)return 'mobile';
  if(!document.querySelector('#loginGate')?.classList.contains('hidden'))return 'login';
  if(document.hidden)return 'hidden';if(motion.matches)return 'motion';if(opaque.matches)return 'transparency';if(contrast.matches)return 'contrast';
  if(navigator.deviceMemory>0&&navigator.deviceMemory<=2||navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2)return 'low-power';
  if(!header.clientWidth||!header.clientHeight)return 'layout';
  if(header.clientWidth*header.clientHeight>360000)return 'area-budget';
  return blocked;
 }
 function busy(){
  if([...document.querySelectorAll('video')].some(v=>v.readyState>=2&&!v.paused&&!v.ended))return 'video';
  if(window.FrommGlowME?.railAnimating)return 'rail';return '';
 }
 function wake(work){
  clearTimeout(busyTimer);busyTimer=0;
  if(work==='rail')busyTimer=setTimeout(()=>{busyTimer=0;sync();},240);
 }
 function sync(){
  const stop=unavailable();
  if(stop){if(glass||styleObserver)release();mode='plain';reason=stop;mark();return;}
  mask();const work=busy();wake(work);
  if(work==='video'){if(glass||styleObserver)release();mode='plain';reason='video';mark();return;}
  // A resize while suspended needs a fresh map once the interaction settles.
  if(glass&&suspended&&frostSize!==lastSize)release();
  if(glass){
   if(work && mode!=='pending'){
    if(!suspended){glass.suspend();suspended=true;frostSize=lastSize;surface.style.backdropFilter='blur(3px) saturate(1.08)';surface.style.webkitBackdropFilter=surface.style.backdropFilter;}
    mode='frost';reason=work;mark();
   }else if(!work&&suspended){glass.resume();suspended=false;mode='svg';reason='';mark();}
   return;
  }
  if(work){mode='plain';reason=work;mark();return;}
  if(loading||idle||retry)return;
  const quiet=performance.now()-lastInput;
  if(quiet<650||window.FrommGlowME?.railAnimating){retry=setTimeout(()=>{retry=0;sync();},Math.max(100,650-quiet));return;}
  const build=async()=>{
   idle=0;if(unavailable()||busy())return sync();
   if(performance.now()-lastInput<650||navigator.scheduling?.isInputPending?.())return sync();
   const generation=ticket;loading=true;mode='pending';reason='';mark();
   try{
    module||=await import('./vendor/meapri/liquid-glass.js');
    if(generation!==ticket||unavailable()||busy())return;
    // Keep real refraction attached while the backdrop scrolls. Zero Gaussian
    // blur and no extra specular-map blend reduce work without hiding the lens.
    glass=new module.LiquidGlass(surface,{variant:'regular',profile:'bar',preset:'balanced',scheme:'light',quality:'balanced',radius:'auto',applyRadius:false,thickness:28,refraction:34,blur:0,saturation:108,chromaticAberration:0,mapPixelRatio:1,tint:'rgba(224,241,233,.18)',specular:false,edges:false,respectReducedMotion:true});builds++;
    if(glass.resolved.usesFallback){blocked='unsupported';release();return;}
    const ready=()=>{
     if(!glass||generation!==ticket)return;
     if(surface.style.backdropFilter.includes('url(')){
      clearTimeout(readyTimer);readyTimer=0;styleObserver?.disconnect();styleObserver=null;mode='svg';reason='';header.classList.add('header-glass-ready');mark();sync();
     }
    };
    styleObserver=new MutationObserver(ready);styleObserver.observe(surface,{attributes:true,attributeFilter:['style']});
    readyTimer=setTimeout(()=>{if(mode!=='svg'){blocked='map-timeout';release();sync();}},2500);ready();
   }catch{blocked='unavailable';release();}
   finally{loading=false;const stop=unavailable()||busy();if(stop&&!glass){mode='plain';reason=stop;mark();}else if(!glass)sync();}
  };
  idle=window.requestIdleCallback?requestIdleCallback(build,{timeout:1200}):setTimeout(build,80);
 }
 const resize=new ResizeObserver(()=>{mask();sync();});resize.observe(header);
 new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
 for(const query of [pc,motion,opaque,contrast])query.addEventListener('change',sync);
 for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])window.addEventListener(type,()=>{lastInput=performance.now();if(!glass)sync();},{passive:true,capture:true});
 // The browser updates the live backdrop during scroll; no JS pause/rebuild.
 for(const type of ['play','playing','pause','ended','emptied','loadeddata'])document.addEventListener(type,sync,true);
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);
 window.addEventListener('pagehide',()=>{release();if(idle){if(window.cancelIdleCallback)cancelIdleCallback(idle);else clearTimeout(idle);idle=0;}clearTimeout(retry);retry=0;clearTimeout(busyTimer);busyTimer=0;mode='plain';reason='hidden';mark();});
 const api=Object.freeze({enabled:true,setPaused(value){paused=!!value;sync();},get snapshot(){return {mode,reason,live:!!glass,suspended,builds,disposed,resolved:glass?.resolved||null};}});
 mark();sync();return api;
}

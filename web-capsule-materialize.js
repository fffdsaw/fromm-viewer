/* Capsule-only adapter. Meapri MIT API + demo references: vendor/meapri/README.md. */
let engineModule;
const loadEngine=()=>engineModule||(engineModule=import('./vendor/meapri/liquid-glass.js'));
export function createCapsuleMaterializer(element,onHidden,onResume){
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
 const stage=document.createElement('span');stage.className='capsule-optics';stage.setAttribute('aria-hidden','true');
 const backdrop=document.createElement('span');backdrop.className='capsule-optics-backdrop';
 const lens=document.createElement('span');lens.className='capsule-optics-lens';stage.append(backdrop,lens);element.prepend(stage);
 let glass=null,observer=null,pending=false,frame=0,last=0,x=0,velocity=0,target=0,key='',enabled=false,phase='hidden',generation=0,builds=0,disposed=0,mode='plain',fallback=false,readyTimer=0,warmFrame=0;
 const lowPower=()=>navigator.deviceMemory>0&&navigator.deviceMemory<=2||navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=2;
 const staticMode=()=>motion.matches||opaque.matches||contrast.matches||lowPower();
 function mark(){element.dataset.capsulePhase=phase;element.dataset.capsuleMode=mode;}
 function destroyLens(){cancelAnimationFrame(warmFrame);warmFrame=0;clearTimeout(readyTimer);readyTimer=0;observer?.disconnect();observer=null;if(glass){glass.destroy();glass=null;disposed++;}lens.removeAttribute('style');}
 function reset(){generation++;cancelAnimationFrame(frame);frame=0;pending=false;destroyLens();x=0;velocity=0;target=0;phase='hidden';fallback=false;mode='plain';stage.removeAttribute('style');element.style.removeProperty('--capsule-content-alpha');element.classList.remove('capsule-materializing');mark();}
 function paint(){
  const p=Math.max(0,Math.min(1.08,x));
  stage.style.transform=`scale(${.88+.12*p},${.35+.65*p})`;
  stage.style.opacity=String(Math.min(1,p*3));
  stage.style.setProperty('--capsule-rim-alpha',String(.25+.6*Math.min(1,p)));
  element.style.setProperty('--capsule-content-alpha',String(Math.min(1,p*2.6)));
  // Supported public API: changes feDisplacementMap scale, not the map geometry.
  glass?.flexRefraction(glass.configuredRefraction*Math.max(0,p));
  element.dataset.capsuleProgress=x.toFixed(3);
 }
 function completeHidden(){
  cancelAnimationFrame(frame);frame=0;generation++;pending=false;destroyLens();phase='hidden';mode='plain';element.classList.remove('capsule-materializing');element.style.removeProperty('--capsule-content-alpha');mark();onHidden();
 }
 function tick(time){
  frame=0;const dt=Math.min(.032,Math.max(.001,(time-last)/1000));last=time;
  // Keep velocity when reversing. Fixed substeps make the damped spring stable.
  const k=target?280:340,damping=target?24:31,steps=Math.ceil(dt/.008),h=dt/steps;
  for(let i=0;i<steps;i++){velocity+=(k*(target-x)-damping*velocity)*h;x+=velocity*h;}
  paint();
  if(Math.abs(target-x)<.001&&Math.abs(velocity)<.015){
   x=target;velocity=0;paint();
   if(!target){completeHidden();return;}
   phase='shown';glass?.flexRefraction(null);mark();return;
  }
  frame=requestAnimationFrame(tick);
 }
 function usePlain(){
  generation++;pending=false;fallback=true;mode=staticMode()?'reduced':'fallback';destroyLens();cancelAnimationFrame(frame);frame=0;
  element.classList.remove('capsule-materializing');element.style.removeProperty('--capsule-content-alpha');phase=target?'shown':'hidden';x=target;velocity=0;mark();if(!target)completeHidden();
 }
 function ensureLens(){
  if(glass||pending||fallback)return;
  pending=true;const ticket=generation;
  readyTimer=setTimeout(()=>{if(ticket===generation&&mode==='pending')usePlain();},1200);
  loadEngine().then(({LiquidGlass})=>{
   if(ticket!==generation||!enabled||phase==='hidden')return;
   pending=false;
   // Build the map at the final layout size; only the decorative stage moves.
   stage.style.transform='none';
   try{glass=new LiquidGlass(lens,{variant:'regular',profile:'control',preset:'balanced',scheme:'light',quality:'balanced',refraction:22,thickness:16,blur:1.5,saturation:104,chromaticAberration:0,mapPixelRatio:1,specular:true,specularIntensity:.32,edges:false,applyRadius:false,tint:'rgba(218,243,231,.22)',respectReducedMotion:true});builds++;}
   catch{usePlain();return;}
   if(glass.resolved.usesFallback){usePlain();return;}
   const ready=()=>{if(!glass)return;if(lens.style.backdropFilter.includes('url(')){clearTimeout(readyTimer);readyTimer=0;mode='svg';mark();glass.flexRefraction(phase==='shown'?null:glass.configuredRefraction*Math.max(0,x));if(phase==='entering'&&!frame&&!warmFrame){warmFrame=requestAnimationFrame(()=>{warmFrame=requestAnimationFrame(()=>{warmFrame=0;if(ticket!==generation||!target)return;paint();last=performance.now();frame=requestAnimationFrame(tick);});});}}};
   observer=new MutationObserver(ready);observer.observe(lens,{attributes:true,attributeFilter:['style']});ready();
  }).catch(()=>{if(ticket===generation){pending=false;usePlain();}});
 }
 function sync(show,scope,active){
  if(scope!==key||!active){if(scope!==key||enabled!==active||phase!=='hidden'||glass||pending||frame)reset();key=scope;enabled=active;if(!active)return;}
  enabled=active;
  if(document.hidden){reset();return;}
  if(!show&&phase==='hidden')return;
  if(staticMode()){
   if(glass||frame||phase!==(show?'shown':'hidden')||mode!=='reduced'){
    generation++;pending=false;target=show?1:0;usePlain();
   }
   return;
  }
  if(target===(show?1:0)&&phase!=='hidden')return;
  if(!show&&phase==='hidden')return;
  target=show?1:0;
  if(fallback){usePlain();return;}
  phase=show?'entering':'exiting';mode=glass?mode:'pending';element.classList.add('capsule-materializing');mark();
  if(!show&&x===0){completeHidden();return;}
  paint();ensureLens();
  if(mode==='svg'&&!frame&&!warmFrame){last=performance.now();frame=requestAnimationFrame(tick);}
 }
 const preference=()=>{const show=!!target;reset();if(enabled)sync(show,key,true);};
 for(const q of [motion,opaque,contrast])q.addEventListener('change',preference);
 const hide=()=>reset();window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden){const exiting=phase==='exiting';reset();if(exiting)onHidden();}else onResume?.();});
 return {sync,reset,get snapshot(){return{phase,mode,progress:x,velocity,builds,disposed,mapWidth:glass?.resolved.width||0,reason:motion.matches?'reduced-motion':opaque.matches?'reduced-transparency':contrast.matches?'forced-colors':lowPower()?'low-power':fallback?'unsupported-or-load-error':null,live:glass?1:0};}};
}

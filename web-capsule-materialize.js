/* Capsule-only adapter. Meapri MIT API + demo references: vendor/meapri/README.md. */
import {glassPreferences} from './web-glass-settings.js?v=fixed-actions-20261117';
import {createGlass,materialOptions} from './web-glass-material.js?v=fixed-actions-20261117';
let engineModule;
const loadEngine=()=>engineModule||(engineModule=import('./vendor/meapri/liquid-glass.js?v=live-optics-20261116'));
export function createCapsuleMaterializer(element,onHidden,onResume,options={}){
 if(options.axis==='x')return createHorizontalCapsule(element,onHidden,onResume);
 // Header Save is now a native transparent control, with no optical entrance.
 const passive=element.classList.contains('capsule-save-control');
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
 const stage=document.createElement('span');stage.className='capsule-optics';stage.setAttribute('aria-hidden','true');
 const backdrop=document.createElement('span');backdrop.className='capsule-optics-backdrop';
 const lens=document.createElement('span');lens.className='capsule-optics-lens';stage.append(backdrop,lens);element.prepend(stage);
 let glass=null,observer=null,pending=false,frame=0,last=0,x=0,velocity=0,target=0,key='',enabled=false,phase='hidden',generation=0,builds=0,disposed=0,mode='plain',fallback=false,readyTimer=0,warmFrame=0,settleTimer=0,exitTimer=0,observedShow=false;
 const staticMode=()=>motion.matches||opaque.matches||contrast.matches||!glassPreferences.value.enabled;
 function mark(){element.dataset.capsulePhase=phase;element.dataset.capsuleMode=mode;}
 function destroyLens(){cancelAnimationFrame(warmFrame);warmFrame=0;clearTimeout(readyTimer);readyTimer=0;observer?.disconnect();observer=null;if(glass){glass.destroy();glass=null;disposed++;}lens.removeAttribute('style');}
 function reset(){generation++;clearTimeout(settleTimer);clearTimeout(exitTimer);cancelAnimationFrame(frame);frame=0;pending=false;destroyLens();x=0;velocity=0;target=0;phase='hidden';fallback=false;mode='plain';stage.removeAttribute('style');element.style.removeProperty('--capsule-content-alpha');element.classList.remove('capsule-materializing');mark();}
 function paint(){
  const p=Math.max(0,Math.min(1.08,x));
  stage.style.transform=`scale(${.88+.12*p},${.35+.65*p})`;
  stage.style.opacity=String(Math.min(1,p*3));
  stage.style.setProperty('--capsule-rim-alpha',String(.25+.6*Math.min(1,p)));
  // Supported public API: changes feDisplacementMap scale, not the map geometry.
  glass?.flexRefraction(glass.configuredRefraction*Math.max(0,p));
  element.dataset.capsuleProgress=x.toFixed(3);
 }
 function completeHidden(){
  cancelAnimationFrame(frame);frame=0;generation++;pending=false;destroyLens();x=0;velocity=0;target=0;phase='hidden';mode='plain';element.classList.remove('capsule-materializing');element.style.removeProperty('--capsule-content-alpha');mark();onHidden();
 }
 function tick(time){
  frame=0;const dt=Math.min(.032,Math.max(.001,(time-last)/1000));last=time;
  // Keep velocity when reversing. Fixed substeps make the damped spring stable.
  const k=500,damping=34,steps=Math.ceil(dt/.008),h=dt/steps;
  for(let i=0;i<steps;i++){velocity+=(k*(target-x)-damping*velocity)*h;x+=velocity*h;}
  paint();
  if(Math.abs(target-x)<.001&&Math.abs(velocity)<.015){
   x=target;velocity=0;paint();
   if(!target){completeHidden();return;}
   phase='shown';glass?.flexRefraction(null);mark();settleTimer=setTimeout(()=>{settleTimer=0;destroyLens();},140);return;
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
   try{glass=createGlass(LiquidGlass,lens,{variant:'regular',profile:'control',preset:'balanced',edges:false,applyRadius:false,fallbackFilter:'none',respectReducedMotion:true,...materialOptions(glassPreferences.value)});builds++;}
   catch{usePlain();return;}
   if(glass.resolved.usesFallback){usePlain();return;}
   const ready=()=>{if(!glass)return;if(lens.style.backdropFilter.includes('url(')){clearTimeout(readyTimer);readyTimer=0;mode='svg';mark();glass.flexRefraction(phase==='shown'?null:glass.configuredRefraction*Math.max(0,x));if(phase==='entering'&&!frame&&!warmFrame){warmFrame=requestAnimationFrame(()=>{warmFrame=requestAnimationFrame(()=>{warmFrame=0;if(ticket!==generation||!target)return;paint();last=performance.now();frame=requestAnimationFrame(tick);});});}}};
   observer=new MutationObserver(ready);observer.observe(lens,{attributes:true,attributeFilter:['style']});ready();
  }).catch(()=>{if(ticket===generation){pending=false;usePlain();}});
 }
 function sync(show,scope,active){
  if(passive){const wasShown=phase==='shown';key=scope;enabled=active;observedShow=show;target=show&&active&&!document.hidden?1:0;phase=target?'shown':'hidden';mode='plain';x=target;mark();if(wasShown&&phase==='hidden')onHidden();return;}
  const fresh=show&&!observedShow;observedShow=show;
  if(scope!==key||!active){if(scope!==key||enabled!==active||phase!=='hidden'||glass||pending||frame)reset();key=scope;enabled=active;if(!active)return;}
  enabled=active;
  if(document.hidden){reset();return;}
  // Returning to a selected list or changing preferences is not a first selection.
  if(show&&phase==='hidden'&&!fresh){target=1;phase='shown';mode=staticMode()?'reduced':'plain';mark();return;}
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
  clearTimeout(exitTimer);exitTimer=0;clearTimeout(settleTimer);settleTimer=0;
  if(fallback){usePlain();return;}
  phase=show?'entering':'exiting';mode=glass?mode:'pending';element.classList.add('capsule-materializing');mark();
  if(!show){cancelAnimationFrame(frame);frame=0;stage.style.opacity='0';exitTimer=setTimeout(()=>{exitTimer=0;completeHidden();},140);return;}
  if(!show&&x===0){completeHidden();return;}
  paint();ensureLens();
  if(mode==='svg'&&!frame&&!warmFrame){last=performance.now();frame=requestAnimationFrame(tick);}
 }
 const preference=()=>{const show=!!target;reset();if(enabled)sync(show,key,true);};
 glassPreferences.subscribe(()=>{if(staticMode())preference();else if(glass)glass.update(materialOptions(glassPreferences.value));});
 for(const q of [motion,opaque,contrast])q.addEventListener('change',preference);
 const hide=()=>reset();window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden){const exiting=phase==='exiting';reset();if(exiting)onHidden();}else onResume?.();});
 return {sync,reset,get snapshot(){return{phase,mode,progress:x,velocity,builds,disposed,mapWidth:glass?.resolved.width||0,reason:motion.matches?'reduced-motion':opaque.matches?'reduced-transparency':contrast.matches?'forced-colors':!glassPreferences.value.enabled?'disabled':fallback?'unsupported-or-load-error':null,live:glass?1:0};}};
}

// A CSS-only materializing skin. Native text/hit boxes never scale. This branch
// is intentionally independent of optical preferences and builds no SVG maps.
function createHorizontalCapsule(element,onHidden,onResume){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const skin=document.createElement('span');skin.className='capsule-optics capsule-horizontal-skin';skin.setAttribute('aria-hidden','true');skin.inert=true;element.prepend(skin);
 let animation=null,target=false,key='',phase='hidden',starts=0,reversals=0;
 function mark(){element.dataset.capsulePhase=phase;element.dataset.capsuleMode=reduced.matches?'reduced':'css-horizontal';}
 function finish(){
  animation?.cancel();animation=null;skin.style.transform=target?'scaleX(1)':'scaleX(0.03)';skin.style.opacity=target?'1':'0';
  phase=target?'shown':'hidden';element.hidden=!target;mark();if(!target)onHidden?.();
 }
 function reset(){animation?.cancel();animation=null;target=false;phase='hidden';skin.style.transform='scaleX(0.03)';skin.style.opacity='0';element.hidden=true;element.inert=true;element.setAttribute('aria-hidden','true');mark();}
 function sync(show,scope,active){
  const next=!!(show&&active&&!document.hidden);
  if(scope!==key||!active){animation?.cancel();animation=null;key=scope;target=next;phase=next?'shown':'hidden';element.hidden=!next;element.inert=!next;element.setAttribute('aria-hidden',String(!next));skin.style.transform=next?'scaleX(1)':'scaleX(0.03)';skin.style.opacity=next?'1':'0';mark();return;}
  if(next===target)return;
  target=next;element.inert=!next;element.setAttribute('aria-hidden',String(!next));element.hidden=false;phase=next?'entering':'exiting';mark();
  if(reduced.matches){finish();return;}
  if(animation){animation.playbackRate=next?1:-1;animation.play();reversals++;return;}
  starts++;
  animation=skin.animate([{transform:'scaleX(0.03)',opacity:0,filter:'blur(3px)'},{transform:'scaleX(1)',opacity:1,filter:'blur(0px)'}],{duration:300,easing:'cubic-bezier(.2,.85,.2,1)',fill:'both'});
  if(!next){animation.currentTime=300;animation.playbackRate=-1;}
  animation.onfinish=finish;
 }
 reduced.addEventListener('change',()=>{if(animation)finish();});
 window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();else onResume?.();});
 window.addEventListener('pageshow',()=>onResume?.());reset();
 return {sync,reset,get snapshot(){return {phase,mode:'css-horizontal',starts,reversals,builds:0,disposed:0,live:0,progress:animation?Math.max(0,Math.min(1,Number(animation.currentTime)/300)):target?1:0};}};
}

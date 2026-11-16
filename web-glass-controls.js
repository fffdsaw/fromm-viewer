/* PC control optics. Meapri demo: LiquidGlass + LiquidInteractive/PointerField.
 * Only decorative faces flex: native controls, hit boxes and handlers stay put.
 * MIT upstream is preserved in vendor/meapri/LICENSE. */
import {glassPC,glassPreferences} from './web-glass-settings.js?v=live-optics-20261116';
import {createGlass,materialOptions} from './web-glass-material.js?v=live-optics-20261116';
const controls='.card-download,.replay-download,.chat-media-download,.chat-audio-play:not(.small-player-button),.chat-sound-download,.replay-play,#conversationNew,#chatToolsBtn,#chatMatchPrev,#chatMatchNext,#tokenLifeWrap,#scanBtn,#logoutMiniBtn,#channelRefresh,#scrollTopBtn,#sortBtn,#selectAllBtn,#clearSelectionBtn,.replay-filter,.live-mini-btn,.replay-page-back,.replay-page-download,#glassSettingsBtn,.glass-switch-thumb,.glass-preview-lens';
const selected='#rooms .room.active,.replay-filter.active';
const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const faces=new Map(),inView=new Set(),watched=new Set(),failed=new WeakSet();
let settings=glassPreferences.value;
let module=null,loading=null,importFailed=false,frame=0,active=null,pressed=null,builds=0,disposed=0,leaving=false;
const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?inView.add(e.target):inView.delete(e.target);schedule();}):null;
function enabled(){return !!visibility&&glassPC.matches&&settings.enabled&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');}
function optics(){return enabled()&&!motion.matches&&!document.hidden;}
function visible(el){const r=el.getBoundingClientRect();return !el.hidden&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.left<innerWidth&&r.right>0&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).pointerEvents!=='none';}
function releaseEngine(item){if(item.glass){item.glass.destroy();item.glass=null;item.face.style.backgroundColor='';disposed++;}if(item.el.dataset.controlOptics!=='basic')item.el.dataset.controlOptics='basic';}
function stopInteractive(item){
 if(!item.interactive)return;
 item.interactive.destroy();item.interactive=null;
 // LiquidInteractive.destroy() cancels its settling frame. Reset its private
 // tilt values first so a pointer leave or visibility change cannot freeze a
 // control in its last hover pose.
 item.el.style.setProperty('--lg-tilt-x','0deg');item.el.style.setProperty('--lg-tilt-y','0deg');
}
function remove(el,item){releaseEngine(item);stopInteractive(item);el.removeAttribute('data-control-optics');item.face.remove();el.classList.remove('glass-control','glass-droplet','glass-control-relative','glass-on-image','glass-pressed');faces.delete(el);}
function create(el,relative){
 const rail=el.matches('.rail-pointer-light'),drop=rail||el.matches(selected);
 if(!rail&&relative)el.classList.add('glass-control-relative');
 // Keep the translating carrier separate from its lens. The rail lens
 // samples menu glyphs underneath it without owning their hit targets.
 const face=document.createElement('span');
 face.className='control-glass-surface'+(rail?' rail-lens-surface':'');face.setAttribute('aria-hidden','true');face.inert=true;el.prepend(face);
 el.classList.add(drop?'glass-droplet':'glass-control');
 if(el.matches('.card-download,.replay-download,.chat-media-download,.chat-audio-play:not(.small-player-button),.chat-sound-download,.replay-play'))el.classList.add('glass-on-image');
 if(rail||el.matches('.glowme-nav button'))face.style.setProperty('--rail-lens-radius',(Math.min(el.clientWidth,el.clientHeight)/2||20)+'px');
 const item={el,face,rail,drop,glass:null,interactive:null,settings:null};faces.set(el,item);return item;
}
function schedule(){if(!frame&&!leaving)frame=requestAnimationFrame(sync);}
function opticalSettings(item){
 const {el}=item;
 const menu=el.matches('.rail-pointer-light,.glowme-nav button');
 if(menu)item.face.style.setProperty('--rail-lens-radius',(Math.min(el.clientWidth,el.clientHeight)/2||20)+'px');
 return {...materialOptions(settings),specular:menu||settings.specular>0,
  specularIntensity:((menu?.22:0)+settings.specular/100)*settings.opacity/28};
}
function sync(){
 frame=0;
 const look=!!enabled();if(document.documentElement.classList.contains('pc-control-glass')!==look)document.documentElement.classList.toggle('pc-control-glass',look);
 if(!look){active=null;clearPress();for(const [el,item]of faces)remove(el,item);visibility?.disconnect();watched.clear();inView.clear();return;}
 const all=[...document.querySelectorAll(controls+','+selected+',.rail-pointer-light')];
 for(const el of all)if(!watched.has(el)){watched.add(el);visibility.observe(el);}
 for(const el of watched)if(!el.isConnected){visibility.unobserve(el);watched.delete(el);inView.delete(el);}
 const candidates=look?all.filter(el=>!el.matches('.rail-pointer-light')&&inView.has(el)&&visible(el)):[];
 const pointer=document.querySelector('.rail-pointer-light');
 // Prewarm the single cursor lens at the active row's size, before first hover.
 // Its existing rail position/scroll/leave logic remains authoritative.
 if(look&&pointer){
  if(!pointer.style.width){const r=document.querySelector('.glowme-nav button')?.getBoundingClientRect();if(r){pointer.style.width=r.width+'px';pointer.style.height=r.height+'px';}}
  candidates.unshift(pointer);
 }
 if(active&&(!active.isConnected||!inView.has(active)||!visible(active)))active=null;
 // Start interacted controls first without excluding other visible controls.
 const priority=el=>{
  if(el.disabled||el.getAttribute('aria-disabled')==='true')return 0;
  if(el===active||el===document.activeElement&&(!el.matches('.chat-audio-play:not(.small-player-button),.chat-sound-download')||el.matches(':focus-visible')))return 100;
  if(el.matches('.glass-switch-thumb'))return 90;
  if(el.id==='conversationNew')return 85;
  if(el.matches(selected)||el===pointer)return 80;
  if(el.id==='tokenLifeWrap')return 79;
  if(el.matches('#scanBtn,#logoutMiniBtn'))return 78;
  if(el.matches('#chatMatchPrev,#chatMatchNext'))return 74;
  if(el.id==='chatToolsBtn')return 72;
  return el.id==='scrollTopBtn'?50:0;
 };
 candidates.sort((a,b)=>priority(b)-priority(a));
 const targets=candidates,engineTargets=candidates.filter(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true'),useEngine=optics();
 // Batch reads before adding faces; reading computed position after each
 // insertion otherwise forces a layout per newly visible card while scrolling.
 const relative=new Set(targets.filter(el=>(!faces.has(el)||!faces.get(el).face.isConnected)&&(el.classList.contains('glass-control-relative')||getComputedStyle(el).position==='static')));
 for(const [el,item]of faces)if(!targets.includes(el)||!item.face.isConnected)remove(el,item);
 for(const el of targets)if(!faces.has(el))create(el,relative.has(el));
 if(!useEngine){for(const item of faces.values()){releaseEngine(item);stopInteractive(item);}return;}
 if(!module){
  if(!loading&&!importFailed)loading=import('./vendor/meapri/liquid-glass.js?v=live-optics-20261116').then(m=>{module=m;}).catch(()=>{importFailed=true;}).finally(()=>{loading=null;if(module)schedule();});
  return;
 }
 // Only visible controls own maps. There is no count or per-frame build cap.
 for(const item of faces.values()){
  const prioritized=engineTargets.includes(item.el);
  if(prioritized&&!item.rail&&!item.interactive&&typeof module.LiquidInteractive==='function')item.interactive=new module.LiquidInteractive(item.el);
  if(!prioritized){releaseEngine(item);stopInteractive(item);continue;}
  if(failed.has(item.el))continue;
  const height=item.el.clientHeight;
  if(item.glass&&item.settings===settings&&item.height===height)continue;
  const {el,face}=item;
  try{
   const options=opticalSettings(item);
   if(item.glass)item.glass.update(options);
   else{
    item.glass=createGlass(module.LiquidGlass,face,{variant:'regular',profile:'control',preset:'balanced',radius:'auto',applyRadius:false,edges:false,fallbackFilter:'none',respectReducedMotion:true,...options});
    builds++;
   }
   item.settings=settings;item.height=height;
   el.dataset.controlOptics=item.glass.resolved.usesFallback?'basic':'engine';
  }catch{releaseEngine(item);failed.add(el);el.dataset.controlOptics='basic';}
 }
}
function controlAt(target){return target instanceof Element?target.closest(controls+','+selected):null;}
function pressable(el){return !!el?.matches('button,a,[role="button"],summary')&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';}
function clearPress(){pressed?.classList.remove('glass-pressed');pressed=null;}
document.addEventListener('pointerover',event=>{const el=controlAt(event.target);if(el!==active){active=el;schedule();}},{passive:true});
document.addEventListener('pointerout',event=>{
 const from=controlAt(event.target),to=controlAt(event.relatedTarget);
 if(from&&from!==to&&active===from){active=to;schedule();}
},{capture:true,passive:true});
document.addEventListener('pointerdown',event=>{const el=controlAt(event.target);clearPress();if(enabled()&&event.button===0&&pressable(el)){pressed=el;el.classList.add('glass-pressed');}},{passive:true});
for(const type of ['pointerup','pointercancel','blur'])window.addEventListener(type,clearPress,{passive:true});
window.addEventListener('blur',()=>{active=null;clearPress();schedule();},{passive:true});
document.addEventListener('keydown',event=>{const el=controlAt(event.target);if(enabled()&&!event.repeat&&[' ','Enter'].includes(event.key)&&pressable(el)){clearPress();pressed=el;el.classList.add('glass-pressed');}});
document.addEventListener('keyup',clearPress);
document.addEventListener('focusin',schedule);
document.addEventListener('focusout',schedule);
// Never observe style: the engine's pointer light and tilt write style every frame.
new MutationObserver(records=>{
 for(const r of records){
  if(r.type==='attributes'){
   // Scroll helpers repeatedly set an unchanged class. Neither that nor our
   // press/decoration classes requires re-reading every visible control.
   const clean=value=>(value||'').replace(/\bglass-(?:control-relative|control|droplet|on-image|pressed)\b/g,'').replace(/\s+/g,' ').trim();
   if(r.attributeName==='class'&&clean(r.oldValue)===clean(r.target.getAttribute('class')))continue;
   if(r.target===document.body||r.target.matches(controls+',.room,.glowme-nav button,#loginGate,#glassSettingsDialog'))return schedule();
  }else{
   if(r.target instanceof SVGElement||r.target.closest?.('.control-glass-surface'))continue;
   if([...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&(n.matches(controls+','+selected)||n.querySelector(controls+','+selected))))return schedule();
   const item=faces.get(r.target);if(item&&!item.face.isConnected)return schedule();
  }
 }
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','hidden','aria-current','disabled','open']});
for(const query of [glassPC,motion,opaque,contrast])query.addEventListener('change',()=>{clearPress();schedule();});
glassPreferences.subscribe(()=>{settings=glassPreferences.value;schedule();});
// The SDK's update path refreshes tint but can reuse a specular map baked for
// the previous light/dark scheme. Rebuild only our bounded active engines.
window.addEventListener('fromm-theme-change',()=>{for(const item of faces.values()){releaseEngine(item);item.settings=null;failed.delete(item.el);}schedule();});
for(const type of ['playing','pause','ended','emptied'])document.addEventListener(type,schedule,true);
document.addEventListener('visibilitychange',()=>{clearPress();schedule();});
window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('pagehide',()=>{leaving=true;active=null;clearPress();cancelAnimationFrame(frame);frame=0;for(const [el,item]of faces)remove(el,item);visibility?.disconnect();watched.clear();inView.clear();});
window.addEventListener('pageshow',()=>{leaving=false;schedule();});
window.FrommControlGlass=Object.freeze({sync:schedule,get snapshot(){return{count:faces.size,live:[...faces.values()].filter(x=>x.glass).length,interactive:[...faces.values()].filter(x=>!!x.interactive).length,builds,disposed,limit:null};}});
schedule();

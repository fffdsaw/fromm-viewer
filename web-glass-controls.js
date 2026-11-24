/* PC control optics. Meapri demo: LiquidGlass + LiquidInteractive/PointerField.
 * Only decorative faces flex: native controls, hit boxes and handlers stay put.
 * MIT upstream is preserved in vendor/meapri/LICENSE. */
import {clearControls} from './web-clear-controls.js?v=convex-edge-20261124';
import {updateRailCrossing} from './web-rail-lens.js?v=continuous-lens-20261117';
import {glassPC,glassPreferences} from './web-glass-settings.js?v=convex-edge-20261124';
import {createGlass,materialOptions} from './web-glass-material.js?v=convex-edge-20261124';
const controls='.card-download,.replay-download,.chat-media-download,.chat-audio-play:not(.small-player-button),.chat-sound-download,.replay-play,#conversationNew,#chatToolsBtn,#chatMatchPrev,#chatMatchNext,#tokenLifeWrap,#scanBtn,#logoutMiniBtn,#channelRefresh,#scrollTopBtn,#sortBtn,#selectAllBtn,#saveSelectedBtn,#clearSelectionBtn,.live-mini-btn,.replay-page-back,.replay-page-download,#glassSettingsBtn,.glass-switch-thumb,.glass-preview-lens';
const selected='.sidebar-open #rooms .room.active';
const sidebarPreset=Object.freeze({refraction:80,thickness:60,blur:0,saturation:80,chromatic:88,opacity:60,specular:28});
const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
const faces=new Map(),inView=new Set(),watched=new Set(),failed=new WeakSet();
let settings=glassPreferences.value,discoveryDirty=true,allControls=[],allSet=new Set(),scans=0;
let module=null,loading=null,importFailed=false,frame=0,active=null,pressed=null,builds=0,disposed=0,leaving=false;
const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?inView.add(e.target):inView.delete(e.target);schedule();},{rootMargin:innerHeight+'px 0px'}):null;
function enabled(){return !!visibility&&glassPC.matches&&settings.enabled&&!opaque.matches&&!contrast.matches&&document.querySelector('#loginGate')?.classList.contains('hidden');}
function optics(){return enabled()&&!motion.matches&&!document.hidden;}
function visible(el){return !el.hidden&&el.checkVisibility()&&el.clientWidth>0&&el.clientHeight>0&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).pointerEvents!=='none';}
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
function invalidate(){discoveryDirty=true;schedule();}
function schedule(){if(!frame&&!leaving)frame=requestAnimationFrame(sync);}
function opticalSettings(item){
 const {el}=item;
 const menu=el.matches('.rail-pointer-light,.glowme-nav button');
 if(menu)item.face.style.setProperty('--rail-lens-radius',(Math.min(el.clientWidth,el.clientHeight)/2||20)+'px');
 // Sidebar optics are a dedicated preset; global sliders still tune the
 // preview and other optical controls. The master/accessibility switches remain.
 return materialOptions(el.closest('#sidebar')?sidebarPreset:settings);
}
function sync(){
 frame=0;
 const look=!!enabled();if(document.documentElement.classList.contains('pc-control-glass')!==look)document.documentElement.classList.toggle('pc-control-glass',look);
 if(!look){active=null;clearPress();for(const [el,item]of faces)remove(el,item);visibility?.disconnect();watched.clear();inView.clear();allControls=[];allSet.clear();discoveryDirty=true;return;}
 if(discoveryDirty){
  allControls=[...document.querySelectorAll(controls+','+selected+',.rail-pointer-light')].filter(el=>!el.matches(clearControls));allSet=new Set(allControls);discoveryDirty=false;scans++;
  for(const el of allControls)if(!watched.has(el)){watched.add(el);visibility.observe(el);}
  for(const el of watched)if(!allSet.has(el)||!el.isConnected){visibility.unobserve(el);watched.delete(el);inView.delete(el);}
 }
 const candidates=[...inView].filter(el=>allSet.has(el)&&!el.matches('.rail-pointer-light')&&visible(el));
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
 const targets=candidates,engineTargets=new Set(candidates.filter(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true')),useEngine=optics();
 // Batch reads before adding faces; reading computed position after each
 // insertion otherwise forces a layout per newly visible card while scrolling.
 const relative=new Set(targets.filter(el=>(!faces.has(el)||!faces.get(el).face.isConnected)&&(el.classList.contains('glass-control-relative')||getComputedStyle(el).position==='static')));
 for(const [el,item]of faces)if(!allSet.has(el)||!el.isConnected||!item.face.isConnected)remove(el,item);
 for(const el of targets)if(!faces.has(el))create(el,relative.has(el));
 if(!useEngine){for(const item of faces.values()){releaseEngine(item);stopInteractive(item);}return;}
 if(!module){
  if(!loading&&!importFailed)loading=import('./vendor/meapri/liquid-glass.js?v=convex-edge-20261124').then(m=>{module=m;}).catch(()=>{importFailed=true;}).finally(()=>{loading=null;if(module)schedule();});
  return;
 }
 // Prepare one viewport ahead. Retain completed maps on connected controls;
 // suspend distant filters instead of rebuilding them on every return. No count cap.
 for(const item of faces.values()){
  const prioritized=engineTargets.has(item.el);
  if(prioritized&&!item.rail&&!item.interactive&&typeof module.LiquidInteractive==='function')item.interactive=new module.LiquidInteractive(item.el);
  if(!prioritized){item.glass?.suspend();stopInteractive(item);continue;}
  if(item.glass?.suspended){
   const glass=item.glass;
   if(glass.filter||glass.usesFallback)glass.resume();
   else{glass.suspended=false;glass.scheduleBuild(()=>glass.installFilter());}
  }
  if(failed.has(item.el))continue;
  const height=item.el.clientHeight,width=item.el.clientWidth;
  if(item.glass&&item.settings===settings&&item.height===height&&item.width===width)continue;
  const {el,face}=item;
  try{
   const options=opticalSettings(item);
   if(item.glass){item.glass.update(options);if(item.height!==height||item.width!==width)item.glass.scheduleRegen();}
   else{
    item.glass=createGlass(module.LiquidGlass,face,{variant:'regular',profile:'control',preset:'balanced',radius:'auto',applyRadius:false,edges:false,fallbackFilter:'none',respectReducedMotion:true,...options});
    builds++;
   }
   item.settings=settings;item.height=height;item.width=width;
   el.dataset.controlOptics=item.glass.resolved.usesFallback?'basic':'engine';
  }catch{releaseEngine(item);failed.add(el);el.dataset.controlOptics='basic';}
 }
}
function controlAt(target){const el=target instanceof Element?target.closest(controls+','+selected):null;return el&&!el.matches(clearControls)?el:null;}
function pressable(el){return !!el?.matches('button,a,[role="button"],summary')&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';}
function syncRailLens(){const el=document.querySelector('.rail-pointer-light'),glass=faces.get(el)?.glass;if(glass)updateRailCrossing(glass);}
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
   if(r.target===document.body||r.target.matches(controls+',.room,.glowme-nav button,#loginGate,#glassSettingsDialog'))return invalidate();
  }else{
   if(r.target instanceof SVGElement||r.target.closest?.('.control-glass-surface'))continue;
   if([...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&(n.matches(controls+',.room,.rail-pointer-light')||n.querySelector(controls+',.room,.rail-pointer-light'))))return invalidate();
   const item=faces.get(r.target);if(item&&!item.face.isConnected)return invalidate();
  }
 }
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','hidden','aria-current','disabled','open']});
new MutationObserver(records=>{if(records.some(r=>(r.oldValue||'').includes('sidebar-open')!==document.documentElement.classList.contains('sidebar-open')))invalidate();}).observe(document.documentElement,{attributes:true,attributeOldValue:true,attributeFilter:['class']});
for(const query of [glassPC,motion,opaque,contrast])query.addEventListener('change',()=>{clearPress();invalidate();});
glassPreferences.subscribe(()=>{settings=glassPreferences.value;schedule();});
// The SDK's update path refreshes tint but can reuse a specular map baked for
// the previous light/dark scheme. Rebuild only our bounded active engines.
window.addEventListener('fromm-theme-change',()=>{for(const item of faces.values()){releaseEngine(item);item.settings=null;failed.delete(item.el);}schedule();});
for(const type of ['playing','pause','ended','emptied'])document.addEventListener(type,schedule,true);
document.addEventListener('visibilitychange',()=>{clearPress();schedule();});
window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('pagehide',()=>{leaving=true;active=null;clearPress();cancelAnimationFrame(frame);frame=0;for(const [el,item]of faces)remove(el,item);visibility?.disconnect();watched.clear();inView.clear();allControls=[];allSet.clear();discoveryDirty=true;});
window.addEventListener('pageshow',()=>{leaving=false;schedule();});
window.FrommControlGlass=Object.freeze({sync:schedule,syncRailLens,get snapshot(){return{scans,parked:[...faces.values()].filter(x=>x.glass?.suspended).length,count:faces.size,live:[...faces.values()].filter(x=>x.glass).length,interactive:[...faces.values()].filter(x=>!!x.interactive).length,builds,disposed,limit:null};}});
schedule();

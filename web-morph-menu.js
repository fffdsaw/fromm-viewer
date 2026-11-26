/* Pinned Meapri LiquidMenu drives only the decorative skin. Real menu buttons
 * stay at their final, untransformed hit boxes; normal triggers are CSS only. */
let engineModule;
const loadEngine=()=>engineModule||(engineModule=import('./vendor/meapri/liquid-glass.js?v=convex-edge-20261124'));
let LiquidGlass,pending=null;
import {glassPreferences} from './web-glass-settings.js?v=clear-motion-20261126';
import {createGlass,materialOptions} from './web-glass-material.js?v=meapri-folder-20261124';
let owner=null,serial=0,builds=0,disposed=0;
const motion=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
function release(o){if(o.glass){o.glass.destroy();o.glass=null;o.menu.glass=null;disposed++;}}
function destroy(o,focus=false){
 if(owner!==o)return;owner=null;clearTimeout(o.timer);o.reveal?.cancel();o.menu.destroy();release(o);o.trigger.removeEventListener('click',o.sync);
 o.trigger.classList.remove('morph-source-open');o.trigger.setAttribute('aria-expanded','false');o.content.remove();o.skin.remove();
 if(focus&&o.trigger.isConnected)o.trigger.focus({preventScroll:true});
}
function close(focus=true,immediate=false){
 pending=null;const o=owner;if(!o)return;o.focus=focus;o.menu.close();sync(o);
 if(immediate)destroy(o,focus);
}
function optics(o,opening=false){
 if(owner!==o||o.fallback||!opening&&!o.menu.isOpen)return;
 if(!glassPreferences.value.enabled||opaque.matches||contrast.matches||motion.matches){if(o.glass)close(true,true);return;}
 const settings={...materialOptions(glassPreferences.value),scheme:'adaptive'};
 try{if(o.glass)o.glass.update(settings);else{o.glass=createGlass(LiquidGlass,o.skin,{variant:'clear',profile:o.vertical?'panel':'control',preset:'balanced',radius:'auto',edges:false,applyRadius:false,fallbackFilter:'none',respectReducedMotion:true,...settings});o.menu.glass=o.glass;builds++;}}
 catch{o.menu.destroy();release(o);o.fallback=true;o.content.dataset.optics='fallback';}
}
function sync(o){
 if(owner!==o)return;clearTimeout(o.timer);
 const open=o.menu.isOpen;o.trigger.setAttribute('aria-expanded',String(open));o.trigger.classList.toggle('morph-source-open',open&&!o.vertical);
 o.content.inert=!open;o.content.setAttribute('aria-hidden',String(!open));o.content.classList.toggle('is-open',open);
 if(open){
  o.content.style.left=o.skin.style.left;o.content.style.top=o.skin.style.top;
  optics(o);o.glass?.syncToBackdrop();
 }
 if(o.vertical) syncReveal(o);
 if(!open){
  o.timer=setTimeout(()=>{if(owner===o&&!o.menu.isOpen)destroy(o,o.focus);},motion.matches?0:250);
 }
}
function syncReveal(owner){
 const animation=owner.skin.getAnimations()[0];
 owner.reveal?.cancel();
 if(!animation || motion.matches)return;
 const frames=animation.effect?.getKeyframes().map(({clipPath,opacity,offset})=>({clipPath,opacity,offset}));
 if(!frames?.length)return;
 const reveal=owner.content.animate(frames,animation.effect.getTiming());
 owner.reveal=reveal;
 animation.ready.then(()=>{
  if(owner.reveal===reveal && animation.startTime!==null)reveal.startTime=animation.startTime;
 }).catch(()=>{});
}
async function open(trigger,{items,onSelect,label='필터 선택'}={}){
 if(owner?.trigger===trigger){owner.focus=true;owner.menu.toggle();sync(owner);return;}
 if(owner)close(false,true);
 const request={trigger};pending=request;trigger.setAttribute('aria-busy','true');
 let LiquidMenu,timer;
 try{const sdk=await Promise.race([loadEngine(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);if(sdk)({LiquidMenu,LiquidGlass}=sdk);}catch{/* Native filtering stays usable if optional optics cannot load. */}finally{clearTimeout(timer);trigger.removeAttribute('aria-busy');}
 if(pending!==request||!trigger.isConnected||!trigger.checkVisibility())return;pending=null;
 const vertical=!!window.pcMediaPresentation?.();
 // Sample the backdrop from the animated surface itself. A nested lens would
 // be confined to the skin's own backdrop root during the morph.
 const skin=document.createElement('div');skin.className='morph-menu-skin morph-menu-glass';skin.setAttribute('aria-hidden','true');skin.inert=true;
 if(vertical)skin.classList.add('morph-menu-vertical');
 const content=document.createElement('div');content.className='morph-menu-content';if(vertical)content.classList.add('morph-menu-vertical');content.setAttribute('role','menu');content.setAttribute('aria-label',label);
 for(const item of items){
  const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitemradio');button.setAttribute('aria-checked',String(!!item.selected));button.textContent=item.label;button.dataset.morphValue=item.value;
  button.onclick=()=>{if(owner!==o)return;close(true);void onSelect(item.value);};content.append(button);
 }
 document.body.append(skin,content);
 const width=Math.min(vertical?196:280,innerWidth-20);
 const height=vertical?Math.min(16+items.length*38+Math.max(0,items.length-1)*4,Math.max(90,innerHeight-24)):56;
 skin.style.width=content.style.width=width+'px';
 skin.style.height=content.style.height=height+'px';
 const offset=vertical?6:-trigger.getBoundingClientRect().height;
 // The SDK positions/clips/scales only this inert surface, never native items.
 const menu=LiquidMenu?new LiquidMenu(trigger,skin,{placement:'bottom-start',offset,dismissOnOutside:false}):nativeMenu(trigger,skin,offset);
 if(!LiquidMenu)content.dataset.optics='fallback';
 const o={serial:++serial,trigger,skin,content,menu,glass:null,timer:0,focus:true,sync:null,vertical,reveal:null,fallback:!LiquidMenu};owner=o;
 o.sync=()=>sync(o);trigger.addEventListener('click',o.sync);optics(o,true);menu.open();sync(o);
 queueMicrotask(()=>{if(owner===o)content.querySelector('[aria-checked="true"]')?.focus({preventScroll:true});});
}
// A plain accessible fallback, not an alternate optical engine or fake SVG.
function nativeMenu(trigger,skin,offset){
 let isOpen=false;
 const api={get isOpen(){return isOpen;},open(){isOpen=true;const r=trigger.getBoundingClientRect();skin.style.left=Math.max(8,Math.min(r.left,innerWidth-parseFloat(skin.style.width)-8))+'px';skin.style.top=Math.max(8,r.bottom+offset)+'px';skin.style.visibility='visible';},close(){isOpen=false;skin.style.visibility='hidden';},toggle(){isOpen?api.close():api.open();},destroy(){api.close();}};
 return api;
}
function openChannel(trigger){
 if(!window.FrommChannelPhotos)return;
 const current=channelVideoState.mediaType;
 const items=Object.entries(CHANNEL_MEDIA_LABELS)
  .filter(([value])=>value!=='artist'||current==='artist'||window.pcMediaPresentation?.())
  .map(([value,label])=>({value,label,selected:current===value}));
 open(trigger,{label:'채널 콘텐츠 종류',items,onSelect:value=>selectChannelMediaType(value)});
}
function openChannelMember(trigger){
 const member=channelVideoState.artistMember;
 const selected=member?.channelId===channelVideoState.channelId?member.key:'';
 const entries=[['','멤버 전체'],...[...channelArtistMembers()].sort(([,a],[,b])=>window.FrommArtists?.compare(a,b)||a.localeCompare(b,'ko'))];
 open(trigger,{label:'Artist 멤버',items:entries.map(([value,label])=>({value,label,selected:value===selected})),onSelect:selectChannelArtistMember});
}
const channelTriggers='[data-channel-content-menu],[data-channel-member-menu]';
const openTrigger=trigger=>trigger.matches('[data-channel-member-menu]')?openChannelMember(trigger):openChannel(trigger);
document.addEventListener('click',event=>{
 if(owner?.trigger.matches('[data-channel-member-menu]')&&!owner.menu.isOpen&&owner.trigger.contains(event.target))close(false,true);
},{capture:true});
document.addEventListener('click',event=>{const trigger=event.target.closest?.(channelTriggers);if(trigger){event.preventDefault();if(owner?.trigger!==trigger)void openTrigger(trigger);else if(owner.fallback){owner.menu.toggle();sync(owner);}}});
document.addEventListener('pointerdown',event=>{
 if(pending&&!pending.trigger.contains(event.target))pending=null;const o=owner;if(!o||o.content.contains(event.target)||o.trigger.contains(event.target))return;
 close(false);if(event.target instanceof HTMLVideoElement){event.preventDefault();event.stopPropagation();}
},{capture:true});
document.addEventListener('keydown',event=>{
 const o=owner;
 if(o?.menu.isOpen){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'){close(false);return;}
  if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const buttons=[...o.content.querySelectorAll('button')],at=buttons.indexOf(document.activeElement),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
   const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+delta+buttons.length)%buttons.length;buttons[next].focus({preventScroll:true});
   const item=buttons[next].getBoundingClientRect(),menu=o.content.getBoundingClientRect();
   if(item.top<menu.top)o.content.scrollTop+=item.top-menu.top;
   else if(item.bottom>menu.bottom)o.content.scrollTop+=item.bottom-menu.bottom;
  }
 }else if(event.target.matches?.(channelTriggers)&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openTrigger(event.target);}
},{capture:true});
glassPreferences.subscribe(()=>{if(owner)optics(owner);});
window.addEventListener('fromm-theme-change',()=>{if(owner){optics(owner);owner?.glass?.syncToBackdrop();}});
for(const query of [motion,opaque,contrast])query.addEventListener('change',()=>{if(owner)close(true,true);});
for(const name of ['resize','pagehide'])window.addEventListener(name,()=>close(false,true));
window.addEventListener('scroll',()=>{if(owner)close(false,true);},{passive:true});
new MutationObserver(()=>{if(owner&&(!owner.trigger.isConnected||!owner.trigger.checkVisibility()))close(false,true);}).observe(document.body,{childList:true,subtree:true});
window.FrommMorphMenus=Object.freeze({open,close,openChannel,get snapshot(){return {open:!!owner?.menu.isOpen,live:owner?.glass?1:0,builds,disposed};}});

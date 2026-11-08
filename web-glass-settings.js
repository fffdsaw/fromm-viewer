/* PC material preferences. Values only; no account or media data is stored. */
export const GLASS_KEY='fromm.pcGlass.v1';
export const glassPC=matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)');
const controls=[
 ['refraction','굴절',0,80,1,34,''],
 ['thickness','유리 두께',4,60,1,28,''],
 ['blur','흐림',0,6,.2,0,''],
 ['saturation','채도',80,150,1,108,'%'],
 ['opacity','유리 밝기',0,60,1,28,'%'],
 ['specular','광택',0,60,2,0,'%']
];
const defaults=Object.freeze(Object.fromEntries([['enabled',true],...controls.map(([key,,,,,value])=>[key,value])]));
function normalize(input={}){
 const next={enabled:typeof input?.enabled==='boolean'?input.enabled:defaults.enabled};
 for(const[key,,min,max,step,value]of controls){
  const n=input?.[key];next[key]=typeof n==='number'&&Number.isFinite(n)?Number((Math.round(Math.max(min,Math.min(max,n))/step)*step).toFixed(2)):value;
 }
 return next;
}
let values={...defaults},stored=true,dialog=null,trigger=null,notifyTimer=0;
try{const saved=JSON.parse(localStorage.getItem(GLASS_KEY)||'null');if(saved)values=normalize(saved);}catch{stored=false;}
const listeners=new Set();
let lastEnabled=values.enabled;
function emit(){
 clearTimeout(notifyTimer);notifyTimer=0;
 for(const fn of listeners)fn();
 if(lastEnabled!==values.enabled){
  lastEnabled=values.enabled;
  window.dispatchEvent(new Event('fromm-glass-enabled'));
 }
}
function save(){try{localStorage.setItem(GLASS_KEY,JSON.stringify(values));stored=true;}catch{stored=false;}}
function set(patch,{immediate=false,persist=true}={}){
 const next=normalize({...values,...patch});if(JSON.stringify(next)===JSON.stringify(values))return;
 values=next;if(persist)save();renderControls();
 // Read the latest values at most every160ms, including during a long drag.
 if(immediate)emit();else if(!notifyTimer)notifyTimer=setTimeout(emit,160);
}
export const glassPreferences=Object.freeze({
 get value(){return {...values};},defaults,
 set,reset(){set(defaults,{immediate:true});},
 subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
 get persistent(){return stored;}
});
window.FrommGlassSettings=glassPreferences;
function statusText(){
 if(!stored)return '설정은 현재 창에 적용됩니다.';
 if(!values.enabled)return '기본 민트 화면을 사용합니다. 설정은 자동으로 저장됩니다.';
 if(['prefers-reduced-motion: reduce','prefers-reduced-transparency: reduce','forced-colors: active'].some(query=>matchMedia('('+query+')').matches))return '기기의 접근성 설정을 우선 적용합니다. 조절한 값은 저장됩니다.';
 return '선택 표시와 작은 조작부에 적용되며 자동으로 저장됩니다.';
}
function renderControls(){
 if(!dialog)return;
 dialog.querySelector('#glassEnabled').checked=values.enabled;
 dialog.querySelector('fieldset').disabled=!values.enabled;
 for(const[key,,,,,,unit]of controls){
  const input=dialog.querySelector(`[name="${key}"]`);if(input.value!==String(values[key]))input.value=values[key];
  dialog.querySelector(`[data-value="${key}"]`).textContent=values[key]+unit;
 }
 const note=dialog.querySelector('.glass-settings-note'),text=statusText();if(note.textContent!==text)note.textContent=text;
}
export function mountGlassSettings(){
 if(trigger||!glassPC.matches||!window.FrommGlowME)return;
 const sidebar=document.querySelector('#sidebar'),footer=document.createElement('div');footer.className='glass-settings-footer';
 trigger=document.createElement('button');trigger.type='button';trigger.id='glassSettingsBtn';trigger.className='glass-settings-trigger';
 trigger.title='화면 설정';trigger.setAttribute('aria-label','화면 설정');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','glassSettingsDialog');
 trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-.5 2-1.5.9L5 5.4 3.4 8l1.5 1.5v1.8L3.4 13 5 15.6l2-.5 1.5.9.5 2h3l.5-2 1.5-.9 2 .5 1.6-2.6-1.5-1.7V9.5L17.6 8 16 5.4l-2 .5-1.5-.9L12 3H9Z" transform="translate(1.5 1.5)"/><circle cx="12" cy="12" r="3"/></svg><span>화면 설정</span>';
 footer.append(trigger);sidebar.insertBefore(footer,document.querySelector('#installAppBtn'));
 dialog=document.createElement('dialog');dialog.id='glassSettingsDialog';dialog.setAttribute('aria-labelledby','glassSettingsTitle');dialog.setAttribute('aria-describedby','glassSettingsDescription');
 dialog.innerHTML=`<div class="glass-settings-head"><div><h2 id="glassSettingsTitle">화면 설정</h2><p id="glassSettingsDescription">조작부 유리 질감</p></div><button type="button" class="glass-settings-close" aria-label="화면 설정 닫기">×</button></div>
 <div class="glass-settings-body"><label class="glass-settings-switch"><span>투명 유리 사용</span><span class="glass-switch-track"><span class="glass-switch-thumb" aria-hidden="true"></span><input id="glassEnabled" type="checkbox" role="switch"></span></label>
 <fieldset aria-label="유리 효과 조절">${controls.map(([key,label,min,max,step,value,unit])=>`<div class="glass-setting"><label for="glass-${key}">${label}</label><output for="glass-${key}" data-value="${key}">${value}${unit}</output><input id="glass-${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`).join('')}</fieldset>
 <p class="glass-settings-note" role="status"></p></div><div class="glass-settings-actions"><button type="button" class="btn glass-settings-reset">기본값 복원</button><button type="button" class="btn glass-settings-done">완료</button></div>`;
 document.body.append(dialog);
 trigger.onclick=()=>{if(!glassPC.matches||!document.querySelector('#loginGate')?.classList.contains('hidden'))return;renderControls();if(!dialog.open)dialog.showModal();};
 const close=()=>dialog.close();dialog.querySelector('.glass-settings-close').onclick=close;dialog.querySelector('.glass-settings-done').onclick=close;
 dialog.querySelector('.glass-settings-reset').onclick=()=>glassPreferences.reset();
 dialog.querySelector('#glassEnabled').onchange=event=>set({enabled:event.target.checked},{immediate:true});
 for(const[key]of controls){const input=dialog.querySelector(`[name="${key}"]`);input.oninput=()=>set({[key]:Number(input.value)});input.onchange=()=>emit();}
 dialog.addEventListener('close',()=>{emit();if(glassPC.matches&&trigger.checkVisibility()&&!document.querySelector('.app')?.inert)trigger.focus({preventScroll:true});});
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button,input')].filter(e=>!e.matches(':disabled')&&e.checkVisibility()),first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 // The rail's global Escape handler must leave the modal to native dialog.
 document.addEventListener('keydown',event=>{if(dialog.open&&event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();close();}},true);
 new MutationObserver(()=>{if(!document.querySelector('#loginGate')?.classList.contains('hidden')&&dialog.open)close();}).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
 renderControls();
}
function viewport(){if(!glassPC.matches&&dialog?.open)dialog.close();mountGlassSettings();emit();}
glassPC.addEventListener('change',viewport);
window.addEventListener('storage',event=>{if(event.key!==GLASS_KEY&&event.key!==null)return;try{values=normalize(JSON.parse(event.newValue||'null')||defaults);renderControls();emit();}catch{}});

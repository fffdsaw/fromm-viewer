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
 if(!values.enabled)return '유리 효과를 끕니다. 설정은 자동으로 저장됩니다.';
 if(['prefers-reduced-motion: reduce','prefers-reduced-transparency: reduce','forced-colors: active'].some(query=>matchMedia('('+query+')').matches))return '기기의 접근성 설정을 우선 적용합니다. 조절한 값은 저장됩니다.';
 return glassPC.matches?'선택 표시와 작은 조작부에 적용되며 자동으로 저장됩니다.':'모바일 기본 효과를 기준으로 강도를 조절하며 자동으로 저장됩니다.';
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
const POSITION_KEY='fromm.settingsPosition.v1';
let footer=null,position=null,category='general';
try{const saved=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))position=saved;}catch{}
function bounds(){const v=window.visualViewport;return{x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||innerWidth,h:v?.height||innerHeight};}
function placePanel(){
 if(!dialog?.open)return;
 const area=bounds(),r=dialog.getBoundingClientRect(),margin=12;
 const desired=position||{x:area.x+(area.w-r.width)/2,y:area.y+Math.min(76,Math.max(margin,(area.h-r.height)/2))};
 const x=Math.max(area.x+margin,Math.min(desired.x,area.x+area.w-r.width-margin));
 const y=Math.max(area.y+margin,Math.min(desired.y,area.y+area.h-r.height-margin));
 dialog.style.left=x+'px';dialog.style.top=y+'px';
}
function persistPosition(){try{localStorage.setItem(POSITION_KEY,JSON.stringify(position));}catch{}}
function selectCategory(value,{focus=false}={}){
 category=value;
 for(const tab of dialog.querySelectorAll('[data-settings-tab]')){const active=tab.dataset.settingsTab===value;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
 for(const panel of dialog.querySelectorAll('[data-settings-panel]'))panel.hidden=panel.dataset.settingsPanel!==value;
 placePanel();
}
function renderThemes(){
 if(!dialog)return;
 const themes=window.FrommThemes;
 for(const button of dialog.querySelectorAll('[data-theme-choice]'))button.setAttribute('aria-pressed',String(button.dataset.themeChoice===themes?.value));
 const note=dialog.querySelector('.theme-storage-note');
 note.textContent=themes?.persistent===false?'테마는 현재 창에 적용됩니다.':'선택한 테마는 이 브라우저에 저장됩니다.';
}
function placeInstall(){
 const button=document.querySelector('#installAppBtn');
 if(button&&dialog)dialog.querySelector('.settings-install').prepend(button);
 // Keep the existing desktop header placement; touch layouts get a footer
 // action so settings remain reachable with the narrow rail collapsed.
 if(footer){if(glassPC.matches)document.querySelector('#sidebar .rail-head')?.append(footer);else document.querySelector('#sidebar')?.append(footer);}
}
export function mountGlassSettings(){
 if(trigger||!window.FrommGlowME)return;
 const sidebar=document.querySelector('#sidebar');footer=document.createElement('div');footer.className='glass-settings-footer';
 trigger=document.createElement('button');trigger.type='button';trigger.id='glassSettingsBtn';trigger.className='glass-settings-trigger';
 trigger.title='설정';trigger.setAttribute('aria-label','설정');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','glassSettingsDialog');
 trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-.5 2-1.5.9L5 5.4 3.4 8l1.5 1.5v1.8L3.4 13 5 15.6l2-.5 1.5.9.5 2h3l.5-2 1.5-.9 2 .5 1.6-2.6-1.5-1.7V9.5L17.6 8 16 5.4l-2 .5-1.5-.9L12 3H9Z" transform="translate(1.5 1.5)"/><circle cx="12" cy="12" r="3"/></svg>';
 footer.append(trigger);sidebar.querySelector('.rail-head')?.append(footer);
 dialog=document.createElement('dialog');dialog.id='glassSettingsDialog';dialog.setAttribute('aria-labelledby','glassSettingsTitle');dialog.setAttribute('aria-describedby','glassSettingsDescription');
 const categories={general:'일반',theme:'테마',glass:'유리 효과',advanced:'고급'};
 dialog.innerHTML=`<div class="glass-settings-head"><div><h2 id="glassSettingsTitle">설정</h2><p id="glassSettingsDescription">나에게 맞는 화면</p></div><button type="button" class="glass-settings-close" aria-label="설정 닫기">×</button></div>
 <div class="settings-layout"><nav class="settings-categories" role="tablist" aria-label="설정 카테고리">${Object.entries(categories).map(([id,label])=>`<button type="button" role="tab" id="settings-tab-${id}" aria-controls="settings-panel-${id}" data-settings-tab="${id}">${label}</button>`).join('')}</nav>
 <div class="glass-settings-body">
 <section role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general" data-settings-panel="general"><h3>일반</h3><section class="settings-install" aria-label="앱 설치"><h4>앱으로 사용하기</h4><p>설치 가능한 환경이면 설치 버튼이 표시됩니다.</p></section><p>대화 저장과 알림은 채팅 입력창의 설정에서 관리할 수 있습니다.</p></section>
 <section role="tabpanel" id="settings-panel-theme" aria-labelledby="settings-tab-theme" data-settings-panel="theme" hidden><h3>테마</h3><p>선택하면 화면 전체에 바로 적용됩니다.</p><div class="theme-choices">${Object.entries(window.FrommThemes?.names||{glow:'Glow ME'}).map(([id,label])=>`<button type="button" data-theme-choice="${id}" aria-pressed="false"><span class="theme-swatch theme-swatch-${id}" aria-hidden="true"></span><span>${label}</span></button>`).join('')}</div><p class="theme-storage-note"></p></section>
 <section role="tabpanel" id="settings-panel-glass" aria-labelledby="settings-tab-glass" data-settings-panel="glass" hidden><h3>유리 효과</h3><label class="glass-settings-switch"><span>투명 유리 사용</span><span class="glass-switch-track"><span class="glass-switch-thumb" aria-hidden="true"></span><input id="glassEnabled" type="checkbox" role="switch"></span></label>
 <fieldset aria-label="유리 효과 조절">${controls.map(([key,label,min,max,step,value,unit])=>`<div class="glass-setting"><label for="glass-${key}">${label}</label><output for="glass-${key}" data-value="${key}">${value}${unit}</output><input id="glass-${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`).join('')}</fieldset><p class="glass-settings-note" role="status"></p></section>
 <section role="tabpanel" id="settings-panel-advanced" aria-labelledby="settings-tab-advanced" data-settings-panel="advanced" hidden><h3>고급</h3><p>기기의 동작 줄이기·투명도 줄이기 설정을 우선합니다. 영상 재생 중에는 유리 렌더링 부하를 줄입니다.</p><button class="btn settings-position-reset" type="button">설정창 위치 초기화</button><p>기본값 복원은 화면 설정만 변경합니다. 저장된 대화는 유지됩니다.</p></section>
 </div></div><div class="glass-settings-actions"><button type="button" class="btn glass-settings-reset">기본값 복원</button><button type="button" class="btn glass-settings-done">완료</button></div>`;
 document.body.append(dialog);placeInstall();
 trigger.onclick=()=>{if(!document.querySelector('#loginGate')?.classList.contains('hidden'))return;renderControls();renderThemes();if(!dialog.open){dialog.showModal();selectCategory(category);placePanel();}};
 const close=()=>dialog.close();dialog.querySelector('.glass-settings-close').onclick=close;dialog.querySelector('.glass-settings-done').onclick=close;
 dialog.querySelector('.glass-settings-reset').onclick=()=>{glassPreferences.reset();window.FrommThemes?.reset();position=null;try{localStorage.removeItem(POSITION_KEY);}catch{}placePanel();};
 dialog.querySelector('.settings-position-reset').onclick=()=>{position=null;try{localStorage.removeItem(POSITION_KEY);}catch{}placePanel();};
 dialog.querySelector('#glassEnabled').onchange=event=>set({enabled:event.target.checked},{immediate:true});
 for(const[key]of controls){const input=dialog.querySelector(`[name="${key}"]`);input.oninput=()=>set({[key]:Number(input.value)});input.onchange=()=>emit();}
 for(const button of dialog.querySelectorAll('[data-theme-choice]'))button.onclick=()=>{window.FrommThemes?.set(button.dataset.themeChoice);renderThemes();};
 for(const button of dialog.querySelectorAll('[data-settings-tab]'))button.onclick=()=>selectCategory(button.dataset.settingsTab);
 const tabs=dialog.querySelector('.settings-categories');
 tabs.addEventListener('keydown',event=>{const ids=Object.keys(categories),i=ids.indexOf(event.target.closest('[data-settings-tab]')?.dataset.settingsTab||category);let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%ids.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+ids.length-1)%ids.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=ids.length-1;else return;event.preventDefault();selectCategory(ids[next],{focus:true});});
 const head=dialog.querySelector('.glass-settings-head');let drag=null;
 head.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.button!==0||event.target.closest('button,input,a,select,textarea'))return;const r=dialog.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};head.setPointerCapture(event.pointerId);event.preventDefault();});
 head.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;position={x:drag.left+event.clientX-drag.x,y:drag.top+event.clientY-drag.y};placePanel();});
 const endDrag=()=>{if(!drag)return;drag=null;const r=dialog.getBoundingClientRect();position={x:r.left,y:r.top};persistPosition();};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])head.addEventListener(name,endDrag);
 dialog.addEventListener('close',()=>{endDrag();emit();const restore=()=>{if(document.querySelector('.app')?.inert||dialog.open)return;if(!trigger.checkVisibility())window.FrommGlowME?.setRailOpen(true,{focus:false});if(trigger.checkVisibility())trigger.focus({preventScroll:true});};restore();requestAnimationFrame(restore);});
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=[...dialog.querySelectorAll('button,input')].filter(e=>!e.matches(':disabled')&&e.tabIndex>=0&&e.checkVisibility()),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 document.addEventListener('keydown',event=>{if(dialog.open&&event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();close();}},true);
 new MutationObserver(()=>{if(!document.querySelector('#loginGate')?.classList.contains('hidden')&&dialog.open)close();}).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
 window.addEventListener('fromm-theme-change',renderThemes);
 selectCategory(category);renderControls();renderThemes();
}
function viewport(){mountGlassSettings();placeInstall();placePanel();emit();}
glassPC.addEventListener('change',viewport);window.addEventListener('resize',placePanel);window.visualViewport?.addEventListener('resize',placePanel);
window.addEventListener('storage',event=>{if(event.key!==GLASS_KEY&&event.key!==null)return;try{values=normalize(JSON.parse(event.newValue||'null')||defaults);renderControls();emit();}catch{}});

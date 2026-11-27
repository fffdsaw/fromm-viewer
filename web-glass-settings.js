import {mountLiquidGlassSwitch,mountLiquidGlassRange} from './web-artist-folder-switch.js?v=clear-rail-morph-20261127';
/* PC material preferences. Values only; no account or media data is stored. */
export const GLASS_KEY='fromm.pcGlass.v1';
export const glassPC=matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)');
const controls=[
 ['refraction','굴절',0,80,1,34,''],
 ['thickness','유리 두께',4,60,1,28,''],
 ['blur','흐림',0,6,.2,0,''],
 ['saturation','채도',80,150,1,100,'%'],
 ['chromatic','색수차',0,100,1,0,'%'],
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
document.documentElement.classList.toggle('glass-disabled',!values.enabled);
const listeners=new Set();
let lastEnabled=values.enabled;
function emit(){
 cancelAnimationFrame(notifyTimer);notifyTimer=0;
 document.documentElement.classList.toggle('glass-disabled',!values.enabled);
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
 // Coalesce only within a paint; a held slider remains live throughout a drag.
 if(immediate)emit();else if(!notifyTimer)notifyTimer=requestAnimationFrame(emit);
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
 return '사이드바와 동작 버튼은 고정 효과로 표시합니다. 버튼에는 굴절·색수차를 적용하지 않습니다. 조절 값은 나머지 유리 효과에 적용하고 자동 저장합니다.';
}
const rangeFaces=new Map();
function renderControls(){
 if(!dialog)return;
 dialog.querySelector('#glassEnabled').checked=values.enabled;
 glassSwitch?.setChecked(values.enabled,{animate:dialog.open&&category==='glass'});
 dialog.querySelector('fieldset').disabled=!values.enabled;
 for(const[key,,min,max,,,unit]of controls){
  const input=dialog.querySelector(`[name="${key}"]`);if(input.value!==String(values[key]))input.value=values[key];
  const fraction=(values[key]-min)/(max-min);
  input.style.setProperty('--glass-range-fill',`${fraction*100}%`);
  const range=input.parentElement;
  range.style.setProperty('--glass-range-position',fraction);
  const fillWidth=fraction===0?'0px':fraction===1?'100%':'var(--glass-range-center)';
  range.style.setProperty('--glass-range-fill-width',fillWidth);
  rangeFaces.get(input)?.update(fraction);
  dialog.querySelector(`[data-value="${key}"]`).textContent=values[key]+unit;
 }
 const note=dialog.querySelector('.glass-settings-note'),text=statusText();if(note.textContent!==text)note.textContent=text;
}
const POSITION_KEY='fromm.settingsPosition.v1';
let glassSwitch=null,footer=null,position=null,category='general';
try{const saved=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){position={x:saved.x,y:saved.y};if(['general','theme','glass','advanced'].includes(saved.category))category=saved.category;}}catch{}
function bounds(){const v=window.visualViewport;return{x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||innerWidth,h:v?.height||innerHeight};}
function placePanel(){
 if(!dialog?.open)return;
 const area=bounds(),r=dialog.getBoundingClientRect(),margin=12;
 const desired=position||{x:area.x+area.w-r.width-margin,y:area.y+Math.min(76,Math.max(margin,area.h-r.height-margin))};
 const x=Math.max(area.x+margin,Math.min(desired.x,area.x+area.w-r.width-margin));
 const y=Math.max(area.y+margin,Math.min(desired.y,area.y+area.h-r.height-margin));
 dialog.style.left=x+'px';dialog.style.top=y+'px';
}
function persistPosition(){try{localStorage.setItem(POSITION_KEY,JSON.stringify(position?{...position,category}:null));}catch{}}
function selectCategory(value,{focus=false}={}){
 category=value;
 dialog.dataset.category=value;
 for(const tab of dialog.querySelectorAll('[data-settings-tab]')){const active=tab.dataset.settingsTab===value;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
 for(const panel of dialog.querySelectorAll('[data-settings-panel]'))panel.hidden=panel.dataset.settingsPanel!==value;
 if(position)persistPosition();
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
 if(button&&dialog)dialog.querySelector('.settings-install').append(button);
 // Keep the existing desktop header placement; touch layouts get a footer
 // action so settings remain reachable with the narrow rail collapsed.
 if(footer){if(glassPC.matches)document.querySelector('#sidebar .rail-head')?.append(footer);else document.querySelector('#sidebar')?.append(footer);}
}
function mountSaveFolderSettings(panel){
 const folder=window.FrommSaveFolder;
 if(!folder)return;
 const section=document.createElement('section');
 section.innerHTML='<h3>기본 저장 폴더</h3><p role="status"></p><button type="button" class="btn">폴더 선택</button>';
 panel.append(section);
 const status=section.querySelector('p'),button=section.querySelector('button');
 const artists=document.createElement('div');artists.className='artist-save-folders';section.append(artists);
 const heading=document.createElement('div');heading.className='artist-folders-heading';
 const title=document.createElement('h3');title.textContent='아티스트별 저장 폴더';title.id='artistFoldersLabel';heading.append(title);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='artist-folder-switch';toggle.id='artistFoldersEnabled';toggle.setAttribute('role','switch');toggle.setAttribute('aria-labelledby',title.id);toggle.setAttribute('aria-controls','artistFolderList');toggle.setAttribute('aria-checked','true');toggle.innerHTML='<canvas class="glass-switch-art" aria-hidden="true"></canvas>';heading.append(toggle);
 const switchControl=mountLiquidGlassSwitch(toggle,{onToggle:checked=>folder.setEnabled(currentAccountScope(),checked),effectsEnabled:()=>values.enabled,canRender:()=>glassPC.matches});
 let switchAccount=null,listAnimation=null,listTarget=null;
 glassPreferences.subscribe(()=>switchControl.refreshTheme());window.addEventListener('fromm-theme-change',()=>switchControl.refreshTheme());
 dialog.addEventListener('close',()=>{switchControl.setChecked(folder.enabled(currentAccountScope()),{animate:false});listAnimation?.cancel();});
 const note=document.createElement('p');note.textContent='별도 지정하지 않은 아티스트는 기본 저장 폴더를 사용합니다.';
 const list=document.createElement('div');list.className='artist-folder-list';list.id='artistFolderList';artists.append(heading,note,list);
 const folderIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/></svg>';
 const memory=new Map();let signature='',revision=0;
 function groupState(account){if(memory.has(account))return memory.get(account);let value={};try{value=JSON.parse(localStorage.getItem('fromm.artistFolderGroups.v1:'+account)||'{}')||{};}catch{}memory.set(account,value);return value;}
 function closeMenus(){for(const menu of artists.querySelectorAll('[role="menu"]')){if(menu.hidePopover)menu.hidePopover();menu.hidden=true;menu.previousElementSibling.setAttribute('aria-expanded','false');}}
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.artist-folder-menu-wrap'))closeMenus();});
 artists.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=artists.querySelector('[role="menu"]:not([hidden])');if(open){event.preventDefault();event.stopPropagation();open.previousElementSibling.focus();closeMenus();}}});
 function refreshArtists(){
  const account=currentAccountScope(),rows=subscribedSaveArtists();
  const next=JSON.stringify([account,rows.map(artist=>[artist.id,artist.name])]);
  if(signature!==next){
   signature=next;list.replaceChildren();
   const groups=new Map();
   for(const artist of rows){const group=window.FrommArtists?.group(artist.name)||'기타 아티스트';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(artist);}
   for(const [group,members] of groups){
    const details=document.createElement('details'),summary=document.createElement('summary'),label=document.createElement('span'),count=document.createElement('span'),body=document.createElement('div');
    details.className='artist-folder-group';details.dataset.folderGroup=group;details.open=groupState(account)[group]!==false;
    label.className='artist-folder-group-name';label.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 4v2"/></svg>';label.append(document.createTextNode(group));count.className='artist-folder-count';body.className='artist-folder-members';summary.append(label,count);details.append(summary,body);list.append(details);
    details.addEventListener('toggle',()=>{if(account!==currentAccountScope()||!details.isConnected)return;const value=groupState(account);value[group]=details.open;try{localStorage.setItem('fromm.artistFolderGroups.v1:'+account,JSON.stringify(value));}catch{}});
    for(const artist of members){
     const row=document.createElement('div'),copy=document.createElement('div'),name=document.createElement('h4'),path=document.createElement('p'),value=document.createElement('span'),choose=document.createElement('button'),menuWrap=document.createElement('div'),more=document.createElement('button'),menu=document.createElement('div'),reset=document.createElement('button');
     row.className='artist-folder-row';row.dataset.artistFolder=artist.id;copy.className='artist-folder-copy';name.textContent=window.FrommArtists?.find(artist.name)?.name||artist.name;
     path.className='artist-folder-path';path.tabIndex=0;path.setAttribute('role','status');path.innerHTML=folderIcon;value.dataset.folderValue='';path.append(value);copy.append(name,path);
     choose.type=more.type=reset.type='button';choose.className='btn artist-folder-choose';choose.setAttribute('aria-label',artist.name+' 저장 폴더 지정');
     more.className='artist-folder-more';more.innerHTML='<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>';more.setAttribute('aria-label',artist.name+' 저장 폴더 메뉴');more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');
     menuWrap.className='artist-folder-menu-wrap';menu.setAttribute('role','menu');menu.className='artist-folder-menu';menu.hidden=true;if(menu.showPopover)menu.setAttribute('popover','auto');reset.setAttribute('role','menuitem');reset.textContent='기본 폴더 사용';reset.setAttribute('aria-label',artist.name+' 기본 저장 폴더 사용');menu.append(reset);menuWrap.append(more,menu);
     more.onclick=()=>{const open=menu.hidden;closeMenus();menu.hidden=!open;more.setAttribute('aria-expanded',String(open));if(open){const rect=more.getBoundingClientRect();menu.style.left=Math.max(12,Math.min(innerWidth-160,rect.right-152))+'px';menu.style.top=Math.min(innerHeight-60,rect.bottom+4)+'px';menu.showPopover?.();reset.focus();}};
     choose.onclick=async()=>{choose.disabled=true;try{await folder.open(account,{change:true,artist:artist.id});}catch(error){if(error.name!=='AbortError')value.textContent='폴더를 열지 못했습니다. 다시 선택해주세요.';}finally{choose.disabled=false;}};
     reset.onclick=async()=>{reset.disabled=true;try{await folder.useDefault(account,artist.id);closeMenus();choose.focus();}finally{reset.disabled=false;}};
     row.append(copy,choose,menuWrap);body.append(row);
    }
   }
   if(!rows.length){const empty=document.createElement('p');empty.textContent='구독한 아티스트가 표시되면 개별 폴더를 지정할 수 있습니다.';list.append(empty);}
  }
  const ticket=++revision;
  for(const row of list.querySelectorAll('[data-artist-folder]')){
   const id=row.dataset.artistFolder,name=folder.name(account,id),value=row.querySelector('[data-folder-value]'),path=row.querySelector('.artist-folder-path');
   value.textContent=name||(folder.name(account)?folder.name(account)+' · 기본 폴더':'기본 저장 폴더 사용');path.title=value.textContent;path.dataset.assigned=String(!!name);
   row.querySelector('.artist-folder-choose').textContent=name?'변경':'지정';row.querySelector('.artist-folder-menu-wrap').hidden=!name;
   if(name)void folder.describe(account,id).then(text=>{if(ticket===revision&&account===currentAccountScope()&&row.isConnected){value.textContent=text;path.title=text;}});
  }
  for(const details of list.querySelectorAll('details')){const rows=[...details.querySelectorAll('[data-artist-folder]')],assigned=rows.filter(row=>folder.name(account,row.dataset.artistFolder)).length;details.querySelector('.artist-folder-count').textContent=assigned+'/'+rows.length+' 지정';}
 }
 function refresh({snap=false}={}){
  section.hidden=!glassPC.matches;const account=currentAccountScope(),name=folder.name(account),enabled=folder.enabled(account),initial=switchAccount!==account;
  status.textContent=name||'아직 선택한 폴더가 없습니다.';button.textContent=name?'폴더 변경':'폴더 선택';refreshArtists();
  const animate=!snap&&!initial&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&dialog.open&&glassPC.matches;
  switchControl.setChecked(enabled,{animate});switchAccount=account;
  if(snap||initial||listTarget!==enabled){
   listTarget=enabled;
   const height=list.hidden?0:list.getBoundingClientRect().height;listAnimation?.cancel();listAnimation=null;
   if(animate){list.hidden=false;const target=enabled?list.scrollHeight:0;listAnimation=list.animate([{height:height+'px',opacity:enabled?0:1},{height:target+'px',opacity:enabled?1:0}],{duration:200,easing:'ease-out'});const current=listAnimation;current.finished.then(()=>{if(listAnimation===current){list.hidden=!enabled;listAnimation=null;}}).catch(()=>{});}
   else list.hidden=!enabled;
  }
 }

 button.onclick=async()=>{button.disabled=true;try{await folder.open(currentAccountScope(),{change:true});refresh();}catch(error){if(error.name!=='AbortError')status.textContent='폴더를 열지 못했습니다. 다시 선택해주세요.';}finally{button.disabled=false;}};
 window.addEventListener('fromm-save-folder-change',refresh);glassPC.addEventListener('change',refresh);
 new ResizeObserver(()=>{if(!glassPC.matches||!dialog.open)return;const saved=position,rect=dialog.getBoundingClientRect();position={x:rect.left,y:rect.top};placePanel();position=saved;}).observe(section);
 return ()=>refresh({snap:true});
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
 dialog.innerHTML=`<div class="glass-settings-head"><div><h2 id="glassSettingsTitle">설정</h2><p id="glassSettingsDescription">실제 화면을 보면서 조절하세요</p></div><button type="button" class="glass-settings-close" aria-label="설정 닫기">×</button></div>
 <div class="settings-layout"><nav class="settings-categories" role="tablist" aria-label="설정 카테고리">${Object.entries(categories).map(([id,label])=>`<button type="button" role="tab" id="settings-tab-${id}" aria-controls="settings-panel-${id}" data-settings-tab="${id}">${label}</button>`).join('')}</nav>
 <div class="glass-settings-body">
 <section role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general" data-settings-panel="general"><section class="settings-install" aria-label="앱 설치"><h3>앱으로 사용하기</h3><p>설치 가능한 환경이면 설치 버튼이 표시됩니다.</p></section><h3>대화 저장 · 알림</h3><p>전체 대화 입력창의 설정에서 관리할 수 있습니다.</p></section>
 <section role="tabpanel" id="settings-panel-theme" aria-labelledby="settings-tab-theme" data-settings-panel="theme" hidden><h3>테마</h3><p>선택하면 화면 전체에 바로 적용됩니다.</p><div class="theme-choices">${Object.entries(window.FrommThemes?.names||{glow:'Glow ME'}).map(([id,label])=>`<button type="button" data-theme-choice="${id}" aria-pressed="false"><span class="theme-swatch theme-swatch-${id}" aria-hidden="true"></span><span>${label}</span></button>`).join('')}</div><p class="theme-storage-note"></p></section>
 <section role="tabpanel" id="settings-panel-glass" aria-labelledby="settings-tab-glass" data-settings-panel="glass" hidden><label class="glass-settings-switch"><span>투명 유리 사용</span><span class="glass-switch-track"><span class="glass-switch-thumb" aria-hidden="true"></span><canvas class="glass-switch-art" aria-hidden="true"></canvas><input id="glassEnabled" type="checkbox" role="switch"></span></label>
 <div class="glass-settings-preview" role="img" aria-label="실제 유리 엔진 미리보기"><span class="glass-preview-pattern" aria-hidden="true">Aa · Fromm · 123</span><span class="glass-preview-lens" aria-hidden="true"></span><span class="glass-preview-caption">실제 엔진 미리보기</span></div>
 <fieldset aria-label="유리 효과 조절">${controls.map(([key,label,min,max,step,value,unit])=>`<div class="glass-setting"><label for="glass-${key}">${label}</label><output for="glass-${key}" data-value="${key}">${value}${unit}</output><span class="glass-range"><input id="glass-${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><canvas class="glass-range-art" aria-hidden="true"></canvas></span></div>`).join('')}</fieldset><p class="glass-settings-note" role="status"></p></section>
 <section role="tabpanel" id="settings-panel-advanced" aria-labelledby="settings-tab-advanced" data-settings-panel="advanced" hidden><h3>효과 동작</h3><p>동시 효과 수와 저사양·영상 재생 중 자동 제한을 해제했습니다. 직접 끄기와 기기의 접근성 설정은 유지합니다.</p><button class="btn settings-position-reset" type="button">설정창 위치 초기화</button><p>기본값 복원은 화면 설정만 변경합니다. 저장된 대화는 유지됩니다.</p></section>
 </div></div><div class="glass-settings-actions"><button type="button" class="btn glass-settings-reset">기본값 복원</button><button type="button" class="btn glass-settings-done">완료</button></div>`;
 const refreshSaveFolder=mountSaveFolderSettings(dialog.querySelector('#settings-panel-general'));
 document.body.append(dialog);placeInstall();
 const glassInput=dialog.querySelector('#glassEnabled');
 glassSwitch=mountLiquidGlassSwitch(glassInput.parentElement,{input:glassInput,canRender:()=>glassPC.matches});
 window.addEventListener('fromm-theme-change',glassSwitch.refreshTheme);
 dialog.addEventListener('close',()=>glassSwitch.setChecked(values.enabled,{animate:false}));
 trigger.onclick=()=>{if(!document.querySelector('#loginGate')?.classList.contains('hidden'))return;renderControls();renderThemes();refreshSaveFolder?.();if(!dialog.open){dialog.dataset.modal=String(!glassPC.matches);if(glassPC.matches)dialog.show();else dialog.showModal();selectCategory(category);placePanel();dialog.querySelector(`[data-settings-tab="${category}"]`).focus({preventScroll:true});}};
 const close=()=>dialog.close();dialog.querySelector('.glass-settings-close').onclick=close;dialog.querySelector('.glass-settings-done').onclick=close;
 dialog.querySelector('.glass-settings-reset').onclick=()=>{glassPreferences.reset();window.FrommThemes?.reset();position=null;try{localStorage.removeItem(POSITION_KEY);}catch{}placePanel();};
 dialog.querySelector('.settings-position-reset').onclick=()=>{position=null;try{localStorage.removeItem(POSITION_KEY);}catch{}placePanel();};
 dialog.querySelector('#glassEnabled').onchange=event=>set({enabled:event.target.checked},{immediate:true});
 for(const [key] of controls){
  const input=dialog.querySelector(`[name="${key}"]`);
  const face=mountLiquidGlassRange(input);
  if(face)rangeFaces.set(input,face);
  input.oninput=()=>{set({[key]:Number(input.value)});face?.pulse();};
  input.onchange=()=>emit();
 }
 dialog.addEventListener('close',()=>{for(const face of rangeFaces.values())face.stop();});
 window.addEventListener('fromm-theme-change',()=>{for(const face of rangeFaces.values())face.refreshTheme();});
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
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab'||dialog.dataset.modal!=='true')return;const items=[...dialog.querySelectorAll('button,input')].filter(e=>!e.matches(':disabled')&&e.tabIndex>=0&&e.checkVisibility()),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 document.addEventListener('keydown',event=>{if(dialog.open&&event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();const menu=dialog.querySelector('.artist-folder-menu:not([hidden])');if(menu){menu.hidePopover?.();menu.hidden=true;const button=menu.previousElementSibling;button.setAttribute('aria-expanded','false');button.focus();}else close();}},true);
 new MutationObserver(()=>{if(!document.querySelector('#loginGate')?.classList.contains('hidden')&&dialog.open)close();}).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
 window.addEventListener('fromm-theme-change',renderThemes);
 selectCategory(category);renderControls();renderThemes();
}
function viewport(){mountGlassSettings();placeInstall();placePanel();emit();}
glassPC.addEventListener('change',viewport);window.addEventListener('resize',placePanel);window.visualViewport?.addEventListener('resize',placePanel);
window.addEventListener('storage',event=>{if(event.key!==GLASS_KEY&&event.key!==null)return;try{values=normalize(JSON.parse(event.newValue||'null')||defaults);renderControls();emit();}catch{}});

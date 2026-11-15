/* Presentation preferences only: no account, message or media storage changes. */
(() => {
 'use strict';
 const key='fromm.theme.v1',names={glow:'Glow ME',aqua:'Aqua',sky:'Sky',lavender:'Lavender',neutral:'Neutral',classic:'Classic · 그레이/핑크'};
 let current='glow',persistent=true;
 function apply(value,persist=true){
  current=Object.hasOwn(names,value)?value:'glow';
  document.documentElement.dataset.frommTheme=current;
  document.documentElement.style.colorScheme=current==='classic'?'dark':'light';
  const header=getComputedStyle(document.documentElement).getPropertyValue('--theme-header').trim();
  if(header)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',header);
  if(persist)try{localStorage.setItem(key,current);persistent=true;}catch{persistent=false;}
  window.dispatchEvent(new Event('fromm-theme-change'));
 }
 try{apply(localStorage.getItem(key)||'glow',false);}catch{persistent=false;apply('glow',false);}
 window.FrommThemes=Object.freeze({names:Object.freeze(names),get value(){return current;},get persistent(){return persistent;},set:value=>apply(value),reset:()=>apply('glow')});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(event.newValue,false);});
})();

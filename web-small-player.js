/* Shared compact video/audio presentation. Media loading and playback remain
 * owned by their existing controllers; this adapter owns only the volume UI. */
(() => {
 'use strict';
 let nextId=0;
 function markup({audio=false}={}){
  const id='small-volume-'+(++nextId),play=audio?'chat-audio-play':'mvc-button',seek=audio?'chat-audio-seek':'mvc-seek',time=audio?'chat-audio-time':'mvc-time',sound=audio?'chat-audio-mute':'mvc-button',volume=audio?'chat-audio-level':'mvc-volume';
  return `<div class="small-player-row${audio?' chat-audio-controls':''}"><button class="small-player-button ${play}" data-small="play" ${audio?'':'data-compact="play"'} type="button" aria-label="${audio?'음성 ':''}재생"></button><div class="small-player-seek-group"><output class="small-player-time ${time}" aria-label="${audio?'음성 ':''}재생 시간" aria-live="off">0:00 / —:—</output><input class="small-player-seek ${seek}" type="range" min="0" max="1" step="0.1" value="0" aria-label="${audio?'음성 ':''}재생 위치" disabled></div><div class="small-player-volume-group${audio?' chat-audio-volume':''}"><div class="small-player-volume-popup" id="${id}" hidden><input class="small-player-level ${volume}" type="range" min="0" max="1" step="0.05" value="1" aria-label="${audio?'음성 ':''}음량"></div><button class="small-player-button ${sound}" data-small="sound" ${audio?'':'data-compact="sound"'} type="button" aria-label="${audio?'음성 ':''}음량 조절" aria-expanded="false" aria-controls="${id}" title="음량 조절 · M 키로 음소거"></button></div></div>`;
 }
 function bindVolume(root,{signal,onChange=()=>{}}={}){
  const group=root.querySelector('.small-player-volume-group'),popup=group.querySelector('.small-player-volume-popup'),button=group.querySelector('[data-small="sound"]'),slider=popup.querySelector('input');
  let timer=0,dragging=false,keyboardMode=false,touchMode=false;
  const show=value=>{clearTimeout(timer);popup.hidden=!value;button.setAttribute('aria-expanded',String(value));root.classList.toggle('small-player-volume-open',value);onChange();};
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal});
  listen(button,'click',event=>{const open=popup.hidden;show(open);if(open&&event.detail===0)slider.focus();});
  listen(group,'pointerdown',event=>{keyboardMode=false;touchMode=event.pointerType==='touch';});
  listen(root.ownerDocument,'pointerdown',event=>{if(!popup.hidden&&!group.contains(event.target))show(false);});
  listen(slider,'pointerdown',()=>{dragging=true;});
  for(const type of ['pointerup','pointercancel'])listen(root.ownerDocument,type,()=>{if(dragging){dragging=false;if(!touchMode&&!group.matches(':hover')&&!keyboardMode)show(false);}});
  listen(group,'pointerenter',event=>{clearTimeout(timer);if(event.pointerType!=='touch'){touchMode=false;show(true);}});
  listen(group,'pointerleave',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!touchMode&&!dragging&&!(keyboardMode&&group.contains(document.activeElement)))show(false);},180);});
  listen(group,'focusin',event=>{clearTimeout(timer);if(event.target===slider)show(true);});
  listen(group,'focusout',event=>{if(!group.contains(event.relatedTarget))show(false);});
  listen(root,'keydown',event=>{if(group.contains(event.target))keyboardMode=true;if(event.key==='Escape'&&!popup.hidden){event.preventDefault();event.stopPropagation();show(false);button.focus();}});
  signal?.addEventListener('abort',()=>clearTimeout(timer),{once:true});
  return {show,slider,get open(){return !popup.hidden;}};
 }
 function progress(input,value){input.style.setProperty('--small-player-progress',Math.max(0,Math.min(100,Number(value)||0))+'%');}
 window.FrommSmallPlayer=Object.freeze({markup,bindVolume,progress});
})();

/* Chat-only controls over the existing HTMLAudioElement and signed media URL.
 * Visible metadata probes are bounded; detached/offscreen paused media release buffers. */
(() => {
 'use strict';
 const items=new Map(),roots=new WeakMap(),queued=new Set(),probing=new Set();
 let removalObserver=null,cleanupQueued=false;
 const clock=value=>{
  if(!Number.isFinite(value)||value<0)return '—:—';
  const seconds=Math.floor(value),minutes=Math.floor(seconds/60);
  return minutes>=60?`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${minutes}:${String(seconds%60).padStart(2,'0')}`;
 };
 const icon=(kind)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14M16 5v14" />',volume:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',muted:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 6 6m0-6-6 6"/>'}[kind])+'</svg>';
 function paint(item){
  const {audio,play,time,seek,mute,volume,root}=item,known=Number.isFinite(item.duration)&&item.duration>0;
  const current=Math.max(0,Math.min(item.position||0,known?item.duration:Infinity)),playing=!audio.paused&&!audio.ended;
  const display=`${clock(current)} / ${known?clock(item.duration):'—:—'}`;
  if(time.textContent!==display)time.textContent=display;
  if(play.dataset.playing!==String(playing)){play.dataset.playing=String(playing);play.innerHTML=icon(playing?'pause':'play');play.setAttribute('aria-label',playing?'음성 일시정지':'음성 재생');}
  seek.disabled=!known;seek.max=known?String(item.duration):'1';seek.value=String(current);
  seek.setAttribute('aria-valuetext',display);seek.style.setProperty('--audio-progress',(known?current/item.duration*100:0)+'%');
  const silent=audio.muted||audio.volume===0;
  if(mute.dataset.silent!==String(silent)){mute.dataset.silent=String(silent);mute.innerHTML=icon(silent?'muted':'volume');mute.setAttribute('aria-label',silent?'음성 음소거 해제':'음성 음소거');}
  mute.setAttribute('aria-pressed',String(silent));volume.value=String(audio.volume);
  root.dataset.playing=String(playing);
 }
 function finish(item){
  clearTimeout(item.timer);item.timer=0;queued.delete(item);probing.delete(item);
 }
 function unload(item){
  if(!item.loaded||!item.audio.paused)return;
  finish(item);item.loaded=false;
  item.audio.removeAttribute('src');item.audio.preload='none';item.audio.load();
 }
 function source(item){
  if(item.loaded)return;
  item.loaded=true;item.audio.src=item.audio.dataset.blobUrl||item.src;
 }
 function pump(){
  for(const item of queued){
   if(probing.size>=3)break;
   queued.delete(item);
   if(!item.visible||item.attempted||!item.root.isConnected||document.hidden)continue;
   probing.add(item);item.attempted=true;source(item);item.audio.preload='metadata';
   item.timer=setTimeout(()=>{finish(item);if(!item.activated)unload(item);pump();},8000);
   item.audio.load();
  }
 }
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){const item=roots.get(entry.target);if(!item)continue;
   item.visible=entry.isIntersecting;
   if(item.visible&&!item.attempted)queued.add(item);
   if(!item.visible){queued.delete(item);if(probing.has(item))item.attempted=false;unload(item);}
  }pump();
 },{rootMargin:'0px',threshold:0}):null;
 function dispose(item){
  finish(item);visibility?.unobserve(item.root);item.events.abort();item.audio.pause();unload(item);
  if(item.audio.dataset.blobUrl){URL.revokeObjectURL(item.audio.dataset.blobUrl);delete item.audio.dataset.blobUrl;}
  items.delete(item.audio);
 }
 function watchRemoval(){
  if(removalObserver)return;
  const timeline=document.querySelector('#timeline');if(!timeline)return;
  removalObserver=new MutationObserver(records=>{
   if(cleanupQueued||!records.some(record=>[...record.removedNodes].some(node=>node.nodeType===1&&(node.matches('.chat-audio-player')||node.querySelector('.chat-audio-player')))))return;
   cleanupQueued=true;queueMicrotask(()=>{cleanupQueued=false;for(const item of items.values())if(!item.root.isConnected)dispose(item);pump();});
  });removalObserver.observe(timeline,{childList:true,subtree:true});
 }
 function enhance(audio){
  if(!audio||items.has(audio))return;
  const root=document.createElement('div');root.className='chat-audio-player';root.setAttribute('role','group');root.setAttribute('aria-label','음성 플레이어');
  root.innerHTML='<div class="chat-audio-controls"><button class="chat-audio-play" type="button" aria-label="음성 재생"></button><output class="chat-audio-time" aria-label="음성 재생 시간" aria-live="off">0:00 / —:—</output><div class="chat-audio-volume"><button class="chat-audio-mute" type="button" aria-label="음성 음소거"></button><input class="chat-audio-level" type="range" min="0" max="1" step="0.05" value="1" aria-label="음성 음량"></div></div><input class="chat-audio-seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="음성 재생 위치" disabled><span class="chat-audio-error" role="status" hidden></span>';
  audio.after(root);audio.controls=false;audio.hidden=true;
  // Preserve the existing download link/handler, but place it beside the seek
  // track rather than leaving a mostly empty row below the whole player.
  const actions=audio.closest('.media-wrap')?.querySelector('.media-actions');
  if(actions?.querySelector('.chat-sound-download'))root.append(actions);
  audio.closest('.bubble')?.classList.add('chat-sound-bubble');
  const item={audio,root,src:audio.getAttribute('src'),loaded:!!audio.getAttribute('src'),duration:NaN,position:0,visible:false,attempted:false,activated:false,timer:0,events:new AbortController(),play:root.querySelector('.chat-audio-play'),time:root.querySelector('output'),seek:root.querySelector('.chat-audio-seek'),mute:root.querySelector('.chat-audio-mute'),volume:root.querySelector('.chat-audio-level'),error:root.querySelector('.chat-audio-error')};
  items.set(audio,item);roots.set(root,item);watchRemoval();
  const on=(el,name,handler)=>el.addEventListener(name,handler,{signal:item.events.signal});
  const notice=text=>{item.error.textContent=text;item.error.hidden=!text;};
  on(audio,'loadedmetadata',()=>{
   item.loaded=!!audio.getAttribute('src');if(!item.loaded)return;
   item.duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:NaN;
   if(item.position>0&&item.duration>0)audio.currentTime=Math.min(item.position,item.duration);
   finish(item);paint(item);pump();
   if(!item.visible&&!item.activated)unload(item);
  });
  on(audio,'durationchange',()=>{if(item.loaded&&Number.isFinite(audio.duration)&&audio.duration>0){item.duration=audio.duration;paint(item);}});
  for(const event of ['timeupdate','seeked','play','pause','ended','volumechange'])on(audio,event,()=>{if(item.loaded&&audio.readyState>=1)item.position=audio.currentTime;paint(item);if((event==='pause'||event==='ended')&&!item.visible)unload(item);});
  on(audio,'error',()=>{finish(item);if(item.activated)notice('음성을 불러오지 못했습니다. 재생 버튼으로 다시 시도해주세요.');paint(item);pump();});
  on(audio,'playing',()=>notice(''));
  on(item.play,'click',async()=>{
   item.activated=true;item.attempted=true;finish(item);pump();
   if(!audio.paused&&!audio.ended){audio.pause();return;}
   if(audio.ended||item.duration>0&&item.position>=item.duration){item.position=0;audio.currentTime=0;}
   source(item);audio.preload='metadata';notice('');if(audio.error)audio.load();
   try{await audio.play();}catch(error){if(error.name!=='AbortError'&&root.isConnected)notice('음성을 재생하지 못했습니다. 재생 버튼으로 다시 시도해주세요.');}paint(item);
  });
  const seekTo=value=>{
   if(!(item.duration>0))return;
   item.position=Math.max(0,Math.min(item.duration,Number(value)));if(item.loaded&&audio.readyState>=1)audio.currentTime=item.position;paint(item);
  };
  on(item.seek,'input',()=>seekTo(item.seek.value));
  on(item.seek,'keydown',event=>{
   const next={ArrowLeft:item.position-5,ArrowDown:item.position-5,ArrowRight:item.position+5,ArrowUp:item.position+5,PageDown:item.position-10,PageUp:item.position+10,Home:0,End:item.duration}[event.key];
   if(next===undefined)return;event.preventDefault();seekTo(next);
  });
  on(item.mute,'click',()=>{audio.muted=!audio.muted;paint(item);});
  on(item.volume,'input',()=>{audio.volume=Number(item.volume.value);audio.muted=false;paint(item);});
  paint(item);visibility?.observe(root);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const item of [...probing]){item.attempted=false;unload(item);}}else{for(const item of items.values())if(item.visible&&!item.attempted)queued.add(item);pump();}});
 window.addEventListener('pagehide',()=>{for(const item of items.values()){item.audio.pause();if(probing.has(item))item.attempted=false;unload(item);}});
 window.addEventListener('pageshow',()=>{for(const item of items.values())if(item.visible&&!item.attempted)queued.add(item);pump();});
 window.FrommChatAudio=Object.freeze({enhance,shouldRepair:audio=>!items.has(audio)||items.get(audio).activated});
})();

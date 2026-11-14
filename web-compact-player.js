/* Lazy compact controls for videos in conversation and media cards.
 * Replay, Channel and LIVE keep their specialized quality/streaming engines. */
(() => {
 'use strict';
 const watched=new Set(),players=new Map();
 let removalObserver=null;
 const icons={
  play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  volume:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
 };
 const icon=path=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
 const button=(name,label)=>`<button class="mvc-button" data-compact="${name}" type="button" aria-label="${label}" title="${label}">${icon(icons[name])}</button>`;
 const protectedVideo=video=>video.id==='lightboxVideo'||!!video.closest('.modern-video-stage,.live-player-stage,.live-stage,.replay-page-stage,.channel-player-stage');
 const format=value=>{
  if(!Number.isFinite(value)||value<0)return '—:—';
  const seconds=Math.floor(value),minutes=Math.floor(seconds/60);
  return minutes>=60?`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${minutes}:${String(seconds%60).padStart(2,'0')}`;
 };
 function dispose(video,item){
  clearTimeout(item.timer);item.events.abort();item.controls.remove();
  item.stage.classList.remove('mvc-compact-stage');
  if(item.changedTabIndex)item.stage.removeAttribute('tabindex');
  video.controls=item.nativeControls;players.delete(video);
 }
 function enhance(video){
  if(!video?.isConnected||protectedVideo(video)||players.has(video))return;
  const stage=video.closest('.thumb,.media-wrap')||video.parentElement;
  if(!stage)return;
  const doc=video.ownerDocument,events=new AbortController();
  const controls=doc.createElement('div');
  controls.className='modern-video-controls mvc-compact-controls';
  controls.setAttribute('role','group');controls.setAttribute('aria-label','영상 재생 컨트롤');
  controls.innerHTML=`<div class="mvc-panel"><input class="mvc-seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="재생 위치" disabled><div class="mvc-row"><div class="mvc-left">${button('play','재생')}<span class="mvc-time" aria-live="off">0:00 / —:—</span></div><div class="mvc-right">${button('sound','음량 및 음소거')}<input class="mvc-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="음량">${button('full','전체 화면')}</div></div></div>`;
  const item={stage,controls,events,nativeControls:video.controls,changedTabIndex:stage.tabIndex<0,timer:0,dragging:false,hovered:false,keyboardMode:false,visible:true};
  const $=selector=>controls.querySelector(selector),seek=$('.mvc-seek'),play=$('[data-compact="play"]'),sound=$('[data-compact="sound"]'),volume=$('.mvc-volume');
  const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
  const reveal=()=>{
   clearTimeout(item.timer);controls.classList.remove('mvc-hidden');
   const held=item.hovered||item.dragging||item.keyboardMode&&controls.contains(doc.activeElement);
   if(!video.paused&&!video.ended&&!held)item.timer=setTimeout(()=>controls.classList.add('mvc-hidden'),2600);
  };
  const sync=()=>{
   const duration=video.duration,valid=Number.isFinite(duration)&&duration>0;
   seek.disabled=!valid;if(valid)seek.max=String(duration);
   if(!item.dragging)seek.value=String(valid?Math.min(video.currentTime,duration):0);
   const shown=item.dragging?Number(seek.value):video.currentTime;
   const label=`${format(shown)} / ${format(duration)}`;
   seek.setAttribute('aria-valuetext',label);seek.style.setProperty('--played',`${valid?Math.min(100,Number(seek.value)/duration*100):0}%`);
   $('.mvc-time').textContent=label;
   const playing=!video.paused&&!video.ended;
   play.innerHTML=icon(playing?icons.pause:icons.play);play.setAttribute('aria-label',playing?'일시정지':'재생');play.title=playing?'일시정지':'재생';
   const muted=video.muted||video.volume===0;
   sound.innerHTML=icon(muted?icons.muted:icons.volume);sound.setAttribute('aria-label',muted?'음량 켜기':'음소거');sound.title=muted?'음량 켜기':'음소거';sound.setAttribute('aria-pressed',String(muted));sound.setAttribute('aria-expanded',String(volume.classList.contains('expanded')));
   volume.value=String(video.muted?0:video.volume);
   controls.dataset.playing=String(playing);
  };
  const toggle=()=>{if(video.paused||video.ended){if(video.ended)video.currentTime=0;video.play().catch(()=>{});}else video.pause();reveal();};
  const fullscreen=async()=>{try{if(doc.fullscreenElement===stage)await doc.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();}catch{}reveal();};
  stage.classList.add('mvc-compact-stage');if(item.changedTabIndex)stage.tabIndex=0;
  stage.append(controls);video.controls=false;
  players.set(video,item);
  listen(controls,'click',event=>event.stopPropagation());
  listen(play,'click',toggle);
  listen(sound,'click',()=>{
   const silent=video.muted||video.volume===0;video.muted=!silent;if(silent&&video.volume===0)video.volume=.5;
   volume.classList.toggle('expanded');sound.setAttribute('aria-expanded',String(volume.classList.contains('expanded')));sync();
  });
  listen(volume,'input',()=>{video.volume=Number(volume.value);video.muted=false;sync();});
  listen(seek,'pointerdown',()=>{item.dragging=true;reveal();});
  listen(seek,'input',()=>{if(!seek.disabled)video.currentTime=Number(seek.value);item.dragging=true;sync();reveal();});
  listen(seek,'change',()=>{item.dragging=false;sync();reveal();});
  listen(doc,'pointerup',()=>{if(item.dragging){item.dragging=false;sync();reveal();}});
  listen(controls.querySelector('[data-compact="full"]'),'click',fullscreen);
  listen(video,'click',event=>{event.stopPropagation();toggle();});
  listen(video,'dblclick',event=>{event.stopPropagation();void fullscreen();});
  listen(controls,'pointerenter',event=>{if(event.pointerType!=='touch')item.hovered=true;reveal();});
  listen(controls,'pointerleave',()=>{item.hovered=false;reveal();});
  listen(stage,'pointermove',reveal,{passive:true});
  listen(stage,'pointerdown',()=>{item.keyboardMode=false;if(!controls.contains(doc.activeElement))reveal();},{passive:true});
  listen(stage,'pointerleave',()=>{item.hovered=false;reveal();});
  listen(controls,'focusin',reveal);listen(controls,'focusout',reveal);
  listen(stage,'focusin',reveal);listen(stage,'focusout',reveal);
  listen(stage,'keydown',event=>{
   item.keyboardMode=true;
   if(event.altKey||event.ctrlKey||event.metaKey||/^(INPUT|BUTTON)$/.test(event.target.tagName))return;
   if(event.code==='Space'){event.preventDefault();toggle();}
   else if(event.key==='ArrowLeft'&&Number.isFinite(video.duration)){video.currentTime=Math.max(0,video.currentTime-5);reveal();}
   else if(event.key==='ArrowRight'&&Number.isFinite(video.duration)){video.currentTime=Math.min(video.duration,video.currentTime+5);reveal();}
   else if(event.key==='ArrowUp'){event.preventDefault();video.volume=Math.min(1,video.volume+.05);video.muted=false;sync();reveal();}
   else if(event.key==='ArrowDown'){event.preventDefault();video.volume=Math.max(0,video.volume-.05);video.muted=false;sync();reveal();}
   else if(event.key.toLowerCase()==='m'){video.muted=!video.muted;sync();reveal();}
   else if(event.key.toLowerCase()==='f'){void fullscreen();}
  });
  for(const type of ['loadedmetadata','durationchange','timeupdate','seeking','seeked','play','playing','volumechange','emptied'])listen(video,type,sync);
  for(const type of ['loadedmetadata','seeking','seeked','play','playing','pause','volumechange','emptied'])listen(video,type,reveal);
  listen(video,'pause',()=>{sync();reveal();if(!item.visible)dispose(video,item);});
  listen(video,'ended',()=>{sync();reveal();if(!item.visible)dispose(video,item);});
  listen(doc,'fullscreenchange',reveal);
  sync();
 }
 function eligible(video){return video instanceof HTMLVideoElement&&!protectedVideo(video);}
 function track(root){
  if(!root)return;
  const videos=[];if(root instanceof HTMLVideoElement)videos.push(root);root.querySelectorAll?.('video').forEach(video=>videos.push(video));
  for(const video of videos)if(eligible(video)&&!watched.has(video)){watched.add(video);visibility?.observe(video);}
 }
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){const video=entry.target,item=players.get(video);
   if(entry.isIntersecting){if(item)item.visible=true;enhance(video);}
   else if(item){item.visible=false;if(video.paused)dispose(video,item);}
  }
 }):null;
 function cleanupDetached(removed){
  const videos=new Set();
  for(const node of removed){
   if(!(node instanceof Element))continue;
   if(node instanceof HTMLVideoElement)videos.add(node);
   node.querySelectorAll('video').forEach(video=>videos.add(video));
  }
  for(const video of videos)if(!video.isConnected){const item=players.get(video);if(item)dispose(video,item);visibility?.unobserve(video);watched.delete(video);}
 }
 function observe(){
  if(!document.body||removalObserver)return;
  removalObserver=new MutationObserver(records=>{
   const removed=[];
   for(const record of records){for(const node of record.addedNodes)if(node instanceof Element)track(node);removed.push(...record.removedNodes);}
   cleanupDetached(removed);
  });removalObserver.observe(document.body,{childList:true,subtree:true});
 }
 track(document);observe();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const [video,item]of players)if(video.paused&&!item.controls.contains(document.activeElement))dispose(video,item);});
 window.addEventListener('pagehide',()=>{for(const [video,item]of players)dispose(video,item);visibility?.disconnect();removalObserver?.disconnect();removalObserver=null;watched.clear();});
 window.addEventListener('pageshow',()=>{if(!removalObserver){track(document);observe();}});
 window.FrommCompactPlayer=Object.freeze({track,get count(){return players.size;}});
})();

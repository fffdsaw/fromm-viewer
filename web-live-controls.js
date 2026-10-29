// LIVE presentation only. The Native/Agora receive, decode, ACK and PiP paths remain owned by their existing modules.
(() => {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  let mounted = null, suspended = false, shuttingDown = false;
  const icon = path => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const paths = {left:'M3 11a9 9 0 1 1 2.7 6.4M3 4v7h7',right:'M21 11a9 9 0 1 0-2.7 6.4M21 4v7h-7',full:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',sound:'M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',muted:'M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6',settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1zM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0'};
  const button = (name,label) => `<button type="button" class="mvc-button" data-live-control="${name}" aria-label="${label}" title="${label}">${icon(paths[name])}</button>`;
  function live() { return state.filter === 'live' && state.live.centerMode === 'live'; }
  function dispose() { const previous = mounted; mounted = null; try{previous?.dispose();}catch{} }
  function mount() {
    if (shuttingDown || suspended || !live()) { dispose(); return; }
    const stage = timeline.querySelector('.live-stage'), grid = document.getElementById('liveVideoGrid');
    if (!stage || !grid || !stage.contains(grid)) { dispose(); return; }
    if (mounted?.stage === stage) { mounted.sync(); return; }
    dispose();
    const removers = []; let dead = false, angle = 0, hideTimer, keyboard = false, previouslyLoading = null, volume = 1, muted = false, controlHovered = false, controlActive = false;
    const appliedTracks = new WeakMap();
    const controls = document.createElement('div');controls.className = 'modern-video-controls live-player-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','LIVE 재생 컨트롤');
    controls.innerHTML = `<div class="mvc-panel"><div class="mvc-row"><div class="mvc-left"><span class="live-control-badge">LIVE</span></div><div class="mvc-right"><span class="live-web-volume" hidden>${button('sound','음소거')}</span><input class="mvc-volume" type="range" min="0" max="1" step=".05" value="1" aria-label="LIVE 음량" hidden><details class="mvc-settings"><summary class="mvc-button" aria-label="LIVE 재생 설정" title="LIVE 재생 설정">${icon(paths.settings)}</summary><div class="mvc-popover"><div class="mvc-section mvc-rotation-row"><div class="mvc-rotation-title">${icon(paths.right)}<span>회전</span><span class="mvc-angle" aria-live="polite">0°</span></div><div class="mvc-rotation-actions">${button('left','왼쪽으로 90도 회전')}${button('right','오른쪽으로 90도 회전')}</div></div></div></details><span class="live-pip-slot"></span>${button('full','전체 화면')}</div></div></div>`;
    let loader = document.getElementById('liveControlsPending') || document.getElementById('liveWaiting');
    if (!loader) { const holder = document.createElement('div'); holder.innerHTML = videoLoadingIndicator(); loader = holder.firstElementChild; }
    loader.id = 'livePlayerLoading';
    const errorLabel=document.createElement('div');errorLabel.className='live-player-error';errorLabel.setAttribute('role','status');errorLabel.hidden=true;errorLabel.textContent='LIVE 연결 상태를 확인해주세요.';
    const $ = selector => controls.querySelector(selector), settings = $('details'), popup = $('.mvc-popover');
    const listen = (target,type,fn) => {target.addEventListener(type,fn);removers.push(()=>target.removeEventListener(type,fn));};
    const presentation = () => {const p=window.FrommLivePresentation;return p?.sequence===state.live.connectionSeq?p:null;};
    const error = () => state.live.status === 'error' || !!state.live.lastError;
    const busy = () => !error() && stage.dataset.liveFailed!=='true' && !!state.live.config?.isStreaming && (!presentation()?.ready || stage.dataset.liveWaiting==='true' || state.live.client?.connectionState === 'RECONNECTING');
    const canHide = () => !busy()&&!settings.open&&!controlHovered&&!controlActive&&!(keyboard&&controls.contains(document.activeElement));
    const reveal = () => {
      if(dead)return;clearTimeout(hideTimer);controls.classList.remove('mvc-hidden');
      if(canHide())hideTimer=setTimeout(()=>{if(!dead&&canHide())controls.classList.add('mvc-hidden');},3000);
    };
    const closePopup = () => {try{popup.hidePopover?.();}catch{}stage.classList.remove('mvc-menu-fallback');};
    const placePopup = () => {
      if(dead||!settings.open)return;
      if(popup.showPopover&&popup.hasAttribute('popover')&&!popup.matches(':popover-open'))try{popup.showPopover();}catch{popup.removeAttribute('popover');}
      stage.classList.toggle('mvc-menu-fallback',!popup.hasAttribute('popover'));
      const r=settings.getBoundingClientRect();popup.style.left=`${Math.max(12,Math.min(innerWidth-popup.offsetWidth-12,r.right-popup.offsetWidth))}px`;popup.style.top=`${Math.max(12,r.top-popup.offsetHeight-10)}px`;
    };
    const layout = () => {
      if(dead)return;stage.classList.toggle('live-rotated',angle!==0);
      stage.style.setProperty('--live-view-width',`${angle%180?stage.clientHeight:stage.clientWidth}px`);stage.style.setProperty('--live-view-height',`${angle%180?stage.clientWidth:stage.clientHeight}px`);stage.style.setProperty('--live-view-angle',`${angle}deg`);
      const label=$('.mvc-angle');if(label.textContent!==`${angle}°`)label.textContent=`${angle}°`;placePopup();
    };
    const applyVolume = () => {
      const level=muted?0:volume;
      for(const user of state.live.client?.remoteUsers||[]){const track=user.audioTrack;if(track?.setVolume&&appliedTracks.get(track)!==level){try{track.setVolume(level*100);appliedTracks.set(track,level);}catch{}}}
      for(const video of grid.querySelectorAll('video')){video.muted=muted;video.volume=volume;}
    };
    const sync = () => {
      if(dead)return;if(!stage.isConnected||!live()){dispose();return;}
      const pip=document.getElementById('livePipBtn');if(pip&&pip.parentElement!==$('.live-pip-slot'))$('.live-pip-slot').append(pip);
      const loading=busy();if(loader.hidden===loading)loader.hidden=!loading;
      const showError=error()&&(!presentation()?.ready||state.live.status==='error'||state.live.client?.connectionState==='DISCONNECTED');if(errorLabel.hidden===showError)errorLabel.hidden=!showError;
      const status=String(loading);if(stage.getAttribute('aria-busy')!==status)stage.setAttribute('aria-busy',status);
      const web=!!grid.querySelector('video')&&!document.getElementById('nativeLiveVideo');$('.live-web-volume').hidden=!web;$('.mvc-volume').hidden=!web;
      if(web){const sound=$('[data-live-control="sound"]'),mode=state.live.audioBlocked?'blocked':muted?'muted':'sound';if(sound.dataset.mode!==mode){sound.dataset.mode=mode;sound.innerHTML=icon(muted?paths.muted:paths.sound);sound.setAttribute('aria-label',mode==='blocked'?'LIVE 소리 재생':muted?'음소거 해제':'음소거');sound.title=sound.getAttribute('aria-label');sound.setAttribute('aria-pressed',String(muted));}if(volume!==1||muted)applyVolume();}
      if(loading || previouslyLoading!==loading)reveal();previouslyLoading=loading;
    };
    const full = async () => {try{if(document.fullscreenElement===stage)await document.exitFullscreen();else await stage.requestFullscreen();}catch{liveStatusText('전체 화면을 열지 못했습니다. 브라우저의 전체 화면 지원과 허용 설정을 확인해주세요.',true);}reveal();};
    stage.classList.add('live-controls-enabled','live-player-stage');stage.append(loader,errorLabel,controls);
    const cleanup = () => {if(dead)return;dead=true;clearTimeout(hideTimer);for(const remove of removers)try{remove();}catch{}closePopup();const pip=document.getElementById('livePipBtn'),head=timeline.querySelector('.live-head');if(pip&&controls.contains(pip)&&head)head.append(pip);controls.remove();loader.remove();errorLabel.remove();stage.classList.remove('live-controls-enabled','live-player-stage','live-rotated');stage.removeAttribute('aria-busy');delete stage.dataset.liveWaiting;delete stage.dataset.liveFailed;for(const property of ['--live-view-width','--live-view-height','--live-view-angle'])stage.style.removeProperty(property);};
    mounted={stage,sync,dispose:cleanup};
    try {
      if(popup.showPopover)popup.setAttribute('popover','manual');
      for(const [name,step] of [['left',-90],['right',90]])listen($(`[data-live-control="${name}"]`),'click',()=>{angle=(angle+step+360)%360;layout();});
      const fullButton=$('[data-live-control="full"]');fullButton.hidden=typeof stage.requestFullscreen!=='function';listen(fullButton,'click',full);
      listen($('[data-live-control="sound"]'),'click',async()=>{if(state.live.audioBlocked){try{await resumeLiveAudio();}catch{}if(dead)return;}else muted=!muted;applyVolume();sync();});
      listen($('.mvc-volume'),'input',event=>{volume=Number(event.target.value);muted=false;applyVolume();sync();});
      listen(settings,'toggle',()=>{if(settings.open)placePopup();else closePopup();reveal();});
      listen(document,'pointerdown',event=>{if(settings.open&&!settings.contains(event.target))settings.open=false;});
      listen(document,'keydown',()=>{keyboard=true;});
      listen($('.mvc-panel'),'pointerenter',event=>{if(event.pointerType!=='touch'){controlHovered=true;reveal();}});
      listen($('.mvc-panel'),'pointerleave',()=>{controlHovered=false;reveal();});
      listen(controls,'pointerdown',()=>{controlActive=true;reveal();});
      for(const event of ['pointerup','pointercancel'])listen(window,event,()=>{if(controlActive){controlActive=false;reveal();}});
      listen(stage,'pointerleave',()=>{controlHovered=false;reveal();});
      listen(stage,'pointerdown',()=>{keyboard=false;reveal();});listen(stage,'pointermove',reveal);listen(stage,'focusin',reveal);listen(stage,'focusout',reveal);
      listen(stage,'keydown',event=>{
        if(event.key==='Escape'&&settings.open){event.preventDefault();event.stopPropagation();settings.open=false;settings.querySelector('summary').focus({preventScroll:true});return;}
        if(event.altKey||event.ctrlKey||event.metaKey||/^(INPUT|SELECT|BUTTON|SUMMARY|TEXTAREA)$/.test(event.target.tagName)||event.target.isContentEditable)return;
        if(event.key==='f'){event.preventDefault();void full();}else if(event.key==='r'){event.preventDefault();angle=(angle+90)%360;layout();reveal();}
      });
      listen(window,'resize',layout);listen(document,'fullscreenchange',()=>{layout();fullButton.setAttribute('aria-label',document.fullscreenElement===stage?'전체 화면 종료':'전체 화면');reveal();});
      if(window.ResizeObserver){const observer=new ResizeObserver(layout);observer.observe(stage);removers.push(()=>observer.disconnect());}
      const timer=setInterval(()=>{try{sync();}catch{dispose();}},500);removers.push(()=>clearInterval(timer));
      layout();sync();reveal();
    }catch{dispose();}
  }
  const safeMount = () => {try{mount();}catch{dispose();}};
  const originalRender=renderLiveView,originalStop=stopLivePlayback;
  renderLiveView=function(...args){suspended=false;dispose();const result=originalRender.apply(this,args);safeMount();return result;};
  stopLivePlayback=function(...args){
    suspended=true;const stage=mounted?.stage;dispose();const result=originalStop.apply(this,args);
    try{if(!shuttingDown&&stage?.isConnected&&live()&&state.live.config?.isStreaming&&!args[0]?.clearRoom&&!state.live.lastError){const holder=document.createElement('div');holder.innerHTML=videoLoadingIndicator();const pending=holder.firstElementChild;pending.id='liveControlsPending';stage.append(pending);}}catch{}
    return result;
  };
  const observer=new MutationObserver(()=>{if(mounted){try{mounted.sync();}catch{dispose();}}else safeMount();});observer.observe(timeline,{childList:true,subtree:true});
  window.addEventListener('fromm-live-presentation',event=>{if(shuttingDown||event.detail?.sequence!==state.live.connectionSeq)return;if(suspended&&event.detail.ready&&state.live.client){suspended=false;safeMount();}else if(mounted)try{mounted.sync();}catch{dispose();}});
  for(const type of ['waiting','playing','loadeddata','error'])timeline.addEventListener(type,event=>{if(!mounted||event.target.tagName!=='VIDEO')return;/* readiness is still validated by the existing PiP source gate */if(type==='waiting')mounted.stage.dataset.liveWaiting='true';else delete mounted.stage.dataset.liveWaiting;if(type==='error')mounted.stage.dataset.liveFailed='true';else if(type==='playing'||type==='loadeddata')delete mounted.stage.dataset.liveFailed;try{mounted.sync();}catch{dispose();}},true);
  window.addEventListener('pagehide',()=>{shuttingDown=true;dispose();document.getElementById('liveControlsPending')?.remove();observer.disconnect();});
  window.addEventListener('pageshow',event=>{if(event.persisted){shuttingDown=false;suspended=false;observer.observe(timeline,{childList:true,subtree:true});safeMount();}});
  safeMount();
})();

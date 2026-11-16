/* Finite-video queues share existing list, permission, playback and history owners.
 * Real-time LIVE and standalone shared URLs have no archived-video queue. */
(() => {
 'use strict';
 const preferences=new Map(),mounted=new WeakMap();
 const paths={list:'M4 6h12M4 12h8M4 18h8m4-8 6 4-6 4z',close:'m6 6 12 12M18 6 6 18',prev:'M5 5v14m14-14L8 12l11 7z',next:'M19 5v14M5 5l11 7-11 7z'};
 const icon=name=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
 const postKey=p=>JSON.stringify([String(p._channelId||''),String(p.id)]);
 function collection(player){
  const kind=player.kind,selected=kind==='channel'?channelVideoState.selected:state.live.replaySelected;
  if(player.owner!==window||!selected)return null;
  const channel=selected._channelId,key=postKey(selected);
  const items=()=>kind==='channel'?(channelVideoPage()?.posts||[]):state.live.replayPosts.filter(p=>p._channelId===channel);
  return{
   kind,key,items,
   valid:()=>player.current()&&state.filter==='live'&&state.live.centerMode===kind&&postKey((kind==='channel'?channelVideoState.selected:state.live.replaySelected)||{})===key,
   title:p=>p.title||'영상',meta:p=>replayDateLabel(p.displayStartAt),thumb:replayThumb,
   more:()=>kind==='channel'?!channelVideoPage()?.isLast:!replayPagingFor(channel).isLast,
   loading:()=>kind==='channel'?channelVideoState.loading:state.live.replayLoading,
   progress:()=>JSON.stringify(kind==='channel'?channelVideoPage()?.lastPost:replayPagingFor(channel).lastPost),
   async load(){
    if(kind==='channel')await loadChannelVideos({loadMore:true});else await loadReplayCenter({loadMore:true});
    if(kind==='channel'?channelVideoState.error:state.live.replayError)throw new Error('목록을 불러오지 못했습니다. 다시 시도해주세요.');
   },
   async choose(post){
    if(kind==='channel')return playChannelVideo(post.id);
    // Moving within a queue replaces the player route. Back still reaches
    // the original list and retains its scroll position.
    history.replaceState({frommReplay:true,postId:String(post.id),channelId:String(post._channelId)},'',replayHistoryUrl(post.id,post._channelId));
    return playReplay(post.id,post._channelId,{pushHistory:false});
   }
  };
 }
 function attach({stage,video,adapter}){
  if(!stage||!video||!adapter)return()=>{};
  mounted.get(stage)?.();
  const doc=stage.ownerDocument,events=new AbortController(),pref=preferences.get(adapter.kind)||{open:false,auto:true};preferences.set(adapter.kind,pref);
  let dead=false,busy=false,loading=false,error='',closeTimer=0,alignFrame=0,loadJob=null,allJob=null;
  const rowsByKey=new Map();
  const current=()=>!dead&&stage.isConnected&&adapter.valid();
  const toggle=doc.createElement('button');toggle.type='button';toggle.className='video-playlist-toggle';toggle.setAttribute('aria-label','재생목록');toggle.innerHTML=icon('list');
  const drawer=doc.createElement('section');drawer.className='video-playlist-drawer';drawer.setAttribute('aria-label','영상 재생목록');
  drawer.innerHTML=`<header><strong>재생목록 <span class="video-playlist-count"></span></strong><button type="button" data-queue="close" aria-label="재생목록 닫기">${icon('close')}</button></header><label class="video-playlist-auto"><span>자동으로 다음 영상</span><input type="checkbox" aria-label="자동으로 다음 영상"></label><ol class="video-playlist-items"></ol><p class="video-playlist-notice" role="status"></p><button class="video-playlist-more" type="button" data-queue="more">전체 목록 불러오기</button><footer><button type="button" data-queue="prev">${icon('prev')}이전</button><button type="button" data-queue="next">다음${icon('next')}</button></footer>`;
  const $=s=>drawer.querySelector(s),on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:events.signal});
  const key=p=>adapter.keyOf?adapter.keyOf(p):postKey(p),index=items=>items.findIndex(p=>key(p)===adapter.key);
  // The shared controls own their existing idle timer, focus and fade states.
  // Put the icon in that carrier so it disappears/reappears with the seek bar.
  const carrier=stage.querySelector(':scope > .modern-video-controls');
  stage.classList.add('video-playlist-host');(carrier||stage).append(toggle);stage.append(drawer);
  function alignCurrent(){
   cancelAnimationFrame(alignFrame);alignFrame=requestAnimationFrame(()=>{
    if(!current()||!pref.open)return;
    const list=$('.video-playlist-items'),row=rowsByKey.get(adapter.key);if(!row)return;
    const r=row.getBoundingClientRect(),box=list.getBoundingClientRect();
    list.scrollTop+=r.top-box.top-(list.clientHeight-r.height)/2;
   });
  }
  function paint(){
   if(!current())return;
   clearTimeout(closeTimer);
   const short=doc.defaultView.matchMedia('(max-height:600px)').matches;
   if(short&&typeof drawer.showPopover==='function'){
    drawer.setAttribute('popover','manual');
    if(pref.open){if(!drawer.matches(':popover-open'))drawer.showPopover();}
    else closeTimer=setTimeout(()=>{if(!dead&&!pref.open)drawer.hidePopover();},260);
   }else{
    if(drawer.hasAttribute('popover')){drawer.hidePopover();drawer.removeAttribute('popover');}
    // Older browsers lack top-layer popovers; a viewport sheet must then
    // leave the stage's stacking context so sticky headers cannot cover it.
    const parent=short?(doc.fullscreenElement||doc.body):stage;if(drawer.parentNode!==parent)parent.append(drawer);
   }
   const items=adapter.items(),at=index(items),more=!!adapter.more?.();
   toggle.setAttribute('aria-expanded',String(pref.open));drawer.classList.toggle('is-open',pref.open);drawer.inert=!pref.open;drawer.setAttribute('aria-hidden',String(!pref.open));
   $('.video-playlist-count').textContent=`${Math.max(0,at+1)} / ${items.length}${more?'+':''}`;
   $('.video-playlist-auto input').checked=pref.auto;
   const list=$('.video-playlist-items'),top=list.scrollTop;
   if(pref.open)items.forEach((post,offset)=>{
    const id=key(post),existing=rowsByKey.get(id);
    if(existing){
     const button=existing.firstElementChild;button.dataset.queueIndex=String(offset);button.querySelector('.video-playlist-number').textContent=String(offset+1);
     button.querySelector('strong').textContent=adapter.title(post);button.querySelector('small').textContent=adapter.meta?.(post)||'';
     if(list.children[offset]!==existing)list.insertBefore(existing,list.children[offset]||null);return;
    }
    const li=doc.createElement('li'),button=doc.createElement('button'),thumb=adapter.thumb?.(post),copy=doc.createElement('span'),title=doc.createElement('strong'),meta=doc.createElement('small');
    button.type='button';button.className='video-playlist-item';button.dataset.queueIndex=String(offset);
    if(key(post)===adapter.key)button.setAttribute('aria-current','true');
    const number=doc.createElement('span');number.className='video-playlist-number';number.textContent=String(offset+1);button.append(number);
    if(thumb){const image=doc.createElement('img');image.src=thumb;image.alt='';image.loading='lazy';image.decoding='async';button.append(image);}
    title.textContent=adapter.title(post);meta.textContent=adapter.meta?.(post)||'';copy.append(title,meta);button.append(copy);li.append(button);rowsByKey.set(id,li);list.insertBefore(li,list.children[offset]||null);
   });
   list.scrollTop=top;
   $('[data-queue="prev"]').disabled=busy||at<=0;$('[data-queue="next"]').disabled=busy||at<0||at+1>=items.length&&!more;
   $('[data-queue="more"]').hidden=!more;$('[data-queue="more"]').disabled=busy||loading;
   $('[data-queue="more"]').textContent=error?'다시 불러오기':'전체 목록 불러오기';
   $('.video-playlist-notice').textContent=loading?`전체 목록 불러오는 중 · ${items.length}개`:busy?'불러오는 중…':error;
   drawer.setAttribute('aria-busy',String(busy||loading));
   for(const button of drawer.querySelectorAll('[data-queue-index]'))button.disabled=busy;
  }
  async function choose(post){
   if(!current()||busy||!post)return;
   pref.open=false;busy=true;error='';paint();
   try{await adapter.choose(post);}catch{if(current())error='영상을 열지 못했습니다. 다시 선택해주세요.';}
   finally{busy=false;paint();}
  }
  async function more(){
   if(!current()||busy)return false;if(loadJob)return loadJob;
   loading=true;error='';paint();
   loadJob=(async()=>{
    await Promise.resolve();
    const before=adapter.progress?.(),count=adapter.items().length,deadline=Date.now()+60000;
    try{
     // Another owner may still be completing a page started before this
     // video was selected. Wait for it rather than issuing duplicate requests.
     while(current()&&adapter.loading?.()){
      if(Date.now()>deadline)throw new Error('List busy');
      await new Promise(resolve=>{const done=()=>{clearTimeout(timer);events.signal.removeEventListener('abort',done);resolve();},timer=setTimeout(done,100);events.signal.addEventListener('abort',done,{once:true});});
     }
     if(!current())return false;
     if(adapter.more?.())await adapter.load();
     if(!current())return false;
     if(adapter.more?.()&&count===adapter.items().length&&before===adapter.progress?.())throw new Error('No cursor progress');
     return true;
    }catch{if(current())error='목록을 불러오지 못했습니다. 다시 시도해주세요.';return false;}
    finally{loading=false;loadJob=null;paint();}
   })();return loadJob;
  }
  async function loadAll(){
   if(allJob)return allJob;
   allJob=(async()=>{await Promise.resolve();while(current()&&pref.open&&adapter.more?.()){if(!await more())break;}})().finally(()=>{allJob=null;});return allJob;
  }
  async function advance(direction){
   if(!current()||busy)return;
   let items=adapter.items(),at=index(items);
   while(direction>0&&at+1>=items.length&&adapter.more?.()){
    if(!await more()||!current())return;items=adapter.items();at=index(items);
   }
   if(at>=0&&items[at+direction])await choose(items[at+direction]);
   else if(direction>0&&current()){error=adapter.more?.()?'다음 영상이 아직 없습니다. 더 불러오기를 눌러주세요.':'마지막 영상입니다.';paint();}
  }
  function close(focus=true){pref.open=false;paint();if(focus)toggle.focus({preventScroll:true});}
  on(doc,'click',event=>{
   if(!pref.open||event.composedPath().includes(drawer)||event.composedPath().includes(toggle))return;
   close(false);
   // The first surface click dismisses the overlay only. Explicit transport
   // buttons outside the drawer still perform their own action normally.
   if(event.target===video){event.preventDefault();event.stopPropagation();}
  },{capture:true});
  on(toggle,'click',event=>{event.stopPropagation();pref.open=!pref.open;paint();if(pref.open){alignCurrent();void loadAll();}});
  on(drawer,'click',event=>{
   event.stopPropagation();const button=event.target.closest('button');if(!button||button.disabled)return;
   if(button.hasAttribute('data-queue-index')){void choose(adapter.items()[Number(button.dataset.queueIndex)]);return;}
   const action=button.dataset.queue;
   if(action==='close')close();
   if(action==='prev'||action==='next')void advance(action==='prev'?-1:1);
   if(action==='more')void loadAll();
  });
  on(drawer,'keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}});
  on(toggle,'keydown',event=>{if(event.key==='Escape'&&pref.open){event.preventDefault();event.stopPropagation();close();}});
  on($('.video-playlist-auto input'),'change',event=>{pref.auto=event.target.checked;});
  on(video,'ended',()=>{if(current()&&pref.auto&&!video.error)void advance(1);});
  on(doc.defaultView,'resize',paint);on(doc,'fullscreenchange',paint);
  // Enlarged native-control media has no shared carrier. Match its normal
  // three-second idle behavior without changing its native controls/engine.
  let idleTimer=0;
  const revealNative=()=>{
   clearTimeout(idleTimer);toggle.classList.remove('is-idle');
   if(!video.paused&&!video.ended&&!toggle.matches(':focus-visible'))idleTimer=setTimeout(()=>{if(!dead&&!video.paused&&!video.ended)toggle.classList.add('is-idle');},3000);
  };
  if(!carrier){
   for(const event of ['pointermove','pointerdown','focusin','focusout'])on(stage,event,revealNative);
   for(const event of ['play','playing','pause','ended','seeking','waiting'])on(video,event,revealNative);
   revealNative();
  }
  const dispose=()=>{if(dead)return;dead=true;clearTimeout(closeTimer);clearTimeout(idleTimer);cancelAnimationFrame(alignFrame);events.abort();rowsByKey.clear();toggle.remove();drawer.remove();stage.classList.remove('video-playlist-host');if(mounted.get(stage)===dispose)mounted.delete(stage);};
  mounted.set(stage,dispose);paint();if(pref.open){alignCurrent();void loadAll();}return dispose;
 }
 function attachPlayer(player){const adapter=collection(player);return adapter?attach({stage:player.video.closest('.replay-page-stage,.channel-player-stage'),video:player.video,adapter}):()=>{};}
 function attachLightbox(video,src){
  const items=filteredMessages().filter(m=>normType(m.type)==='video'&&resolveMediaUrl(m));
  const selected=items.find(m=>resolveMediaUrl(m)===src||proxyUrl(m,false)===src);if(!selected)return()=>{};
  const room=state.room,account=currentAccountScope(),filter=state.filter;
  return attach({stage:document.querySelector('#imageLightbox'),video,adapter:{kind:'lightbox',key:messageStableKey(selected),keyOf:messageStableKey,items:()=>items,valid:()=>state.room===room&&currentAccountScope()===account&&state.filter===filter&&document.querySelector('#imageLightbox').classList.contains('video-preview'),title:baseName,meta:m=>`${dateKey(m)} · ${timeLabel(m)}`,thumb:m=>normalizeMediaUrl(m.thumbnailUrl||m.thumbnail?.url||''),choose:m=>openDownloadPreview("media",m)}});
 }
 window.FrommVideoPlaylist=Object.freeze({attachPlayer,attachLightbox});
 // Authenticated startup/hash restoration can finish while this presentation
 // asset is still downloading. Attach to that existing engine as well.
 for(const player of Object.values(videoQualityPlayers)){
  if(!player||player.disposed||!player.video?.isConnected)continue;
  const previous=player.controlsCleanup,cleanup=attachPlayer(player);
  player.controlsCleanup=()=>{cleanup();previous?.();};
 }
 const lightbox=document.querySelector('#lightboxVideo');
 if(lightbox&&document.querySelector('#imageLightbox')?.classList.contains('video-preview'))lightboxPlaylistCleanup=attachLightbox(lightbox,lightbox.getAttribute('src'));
})();

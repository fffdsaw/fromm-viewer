/* Channel image posts are albums, independent of video playback and HLS saves.
 * Keep signed URLs ephemeral; list cursors always belong to the raw mixed feed. */
'use strict';
async function selectChannelMediaType(type,{restoreHistory=false}={}) {
  const s=channelVideoState;
  type=type==='image'?'image':'video';
  if(s.mediaType===type)return;
  flushDownloadClick();downloadClickGesture=null;
  window.FrommChannelPhotos.close();
  if(!restoreHistory)channelHistoryNavigation++;
  stopChannelVideoPlayback();disconnectVideoListAuto();
  s.requestSeq++;s.requestAbort?.abort();s.loading=false;s.error='';s.notice='';
  s.mediaScrolls.set(JSON.stringify([s.channelId,s.mediaType]),scrollY);
  s.mediaType=type;state.selectionAnchor=null;
  // A list-mode change must not leave a player URL pointing at the wrong view.
  if(!restoreHistory&&(history.state?.frommChannel||history.state?.frommChannelList))history.replaceState(null,'',channelHistoryUrl());
  renderLiveView();
  const generation=s.playSeq;
  await loadChannelVideos();
  if(generation!==s.playSeq||s.mediaType!==type||!channelVideosActive())return;
  scrollTo({top:s.mediaScrolls.get(JSON.stringify([s.channelId,type]))||0,behavior:'auto'});
  document.querySelector(`[data-channel-media-type="${type}"]`)?.focus({preventScroll:true});
}
function renderChannelPhotoCard(post) {
  const thumb=replayThumb(post),title=post.title||'채널 사진';
  return `<article class="replay-card channel-video-card channel-photo-card" data-channel-video-card="${esc(post.id)}"><div class="replay-thumb">${thumb?`<img data-video-thumb="${esc(thumb)}" alt="" loading="lazy" decoding="async">`:'<span class="replay-thumb-empty">사진</span>'}<button class="replay-play" data-channel-photo-open="${esc(post.id)}" type="button" aria-label="${esc(title)} 앨범 열기"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 17 5-5 4 4 4-6 5 7"/><circle cx="8" cy="8" r="1"/></svg></button><button class="replay-download" data-channel-photo-download="${esc(post.id)}" type="button" aria-label="${esc(title)} 앨범 다운로드">${downloadFeedbackIcon()}</button><span class="channel-photo-badge">${Array.isArray(post.urls)&&post.urls.length?post.urls.length+'장':'사진'}</span></div><div class="replay-body"><div class="replay-title">${esc(title)}</div><div class="replay-meta">${esc(replayDateLabel(post.displayStartAt))}</div></div></article>`;
}
function channelPhotoContext() {
  const sameSession=channelVideoSession(),channel=channelVideoState.channelId,generation=channelVideoState.playSeq;
  return ()=>sameSession()&&generation===channelVideoState.playSeq&&channelVideosActive()&&channelVideoState.mediaType==='image'&&channelVideoState.channelId===channel;
}
async function fetchChannelPhotoDetail(post,{signal}={}) {
  const current=channelPhotoContext();
  if(!current()||post?._channelId!==channelVideoState.channelId||!state.live.channels.some(c=>c.id===post._channelId))throw new Error('사진을 볼 채널을 다시 선택해주세요.');
  const controller=new AbortController(),abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  const timer=setTimeout(abort,15000);
  let response;
  try{
    const cancelled=new Promise((_resolve,reject)=>{
      const rejectAbort=()=>reject(new Error('사진 응답이 늦어지거나 요청이 취소되었습니다.'));
      if(controller.signal.aborted)rejectAbort();else controller.signal.addEventListener('abort',rejectAbort,{once:true});
    });
    response=await Promise.race([frommApiRequest(`/media/posts/${encodeURIComponent(post.id)}`,{base:FROMM_CHANNEL_API_BASE,channelId:post._channelId,signal:controller.signal}),cancelled]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  if(!current()||signal?.aborted)throw new Error('채널 또는 로그인 세션이 변경되었습니다.');
  const detail=response?.data?.post||response?.result?.post||response?.post;
  if(!detail||String(detail.id)!==String(post.id)||detail.type!=='image'||detail.isVisible===false)throw new Error('이 사진을 볼 수 없습니다. 구독과 공개 상태를 확인해주세요.');
  if(!Array.isArray(detail.urls)||!detail.urls.length||!detail.urls.every(url=>typeof url==='string'&&isHttpMediaUrl(url)))throw new Error('사진 주소를 확인하지 못했습니다.');
  return {...post,...detail,_channelId:post._channelId,_channelName:post._channelName};
}
function channelPhotoOriginal(url) {
  const parsed=new URL(url);
  if(!/^(channel|store)(-dev)?-contents\.frommyarti\.com$/.test(parsed.hostname))return url;
  parsed.pathname=parsed.pathname.replace(/(?:_\d+x\d+)?\.[^/.]+$/,'.jpg');
  return parsed.href;
}
function channelPhotoFilename(post,index,contentType) {
  const clean=value=>String(value||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,70);
  const identity=clean(post._channelId)+'_'+clean(post.id);
  return `${clean(post._channelName)||'Channel'}_${clean(post.title)||'사진'}_${identity}_${String(index+1).padStart(3,'0')}${contentTypeExt(contentType,'image')}`;
}
async function fetchChannelPhotoBlob(url,current) {
  let failure;
  for(const candidate of [...new Set([channelPhotoOriginal(url),url])]){
    if(!current())throw new Error('채널 또는 로그인 세션이 변경되었습니다.');
    try{
      const result=await fetchMediaBlob({type:'image',content:candidate});
      if(!current())throw new Error('채널 또는 로그인 세션이 변경되었습니다.');
      if(!result.contentType.startsWith('image/'))throw new Error('사진 형식을 확인하지 못했습니다.');
      return result;
    }catch(error){failure=error;}
  }
  throw failure;
}
async function saveChannelPhotoPosts(posts,{button,index=null}={}) {
  if(!posts.length||state.postBulkSaving||postDownloadRunning||channelVideoState.downloading||state.live.replayDownloading)return;
  const current=channelPhotoContext(),oldHTML=button?.innerHTML;
  if(!current())return;
  state.postBulkSaving=true;channelVideoState.downloading=true;
  if(button)button.disabled=true;
  let directory,ok=0,skipped=0,failed=0,status='';
  try{
    // Ask while the original click still owns transient activation.
    if(supportsDirectorySave())directory=await window.showDirectoryPicker();
    for(const post of posts){
      if(!current())break;
      let detail;
      try{detail=await fetchChannelPhotoDetail(post);}catch{failed++;continue;}
      const indexes=index===null?detail.urls.map((_url,i)=>i):[index];
      let complete=true;
      for(const i of indexes){
        if(!current())break;
        if(!detail.urls[i]){complete=false;failed++;continue;}
        if(button)button.textContent=`저장 ${i+1}/${detail.urls.length}`;
        let writable;
        try{
          const {blob,contentType}=await fetchChannelPhotoBlob(detail.urls[i],current);
          if(!current())break;
          const filename=channelPhotoFilename(detail,i,contentType);
          if(directory){
            let existing;
            try{existing=await directory.getFileHandle(filename);}catch(e){if(e.name!=='NotFoundError')throw e;}
            if(!current())break;
            if(existing&&(await existing.getFile()).size===blob.size){skipped++;continue;}
            const handle=await directory.getFileHandle(filename,{create:true});
            if(!current())break;
            writable=await handle.createWritable();
            if(!current())throw new Error('SESSION_CHANGED');
            await writable.write(blob);
            if(!current())throw new Error('SESSION_CHANGED');
            await writable.close();writable=null;
          }else{
            const objectUrl=URL.createObjectURL(blob),anchor=document.createElement('a');
            anchor.href=objectUrl;anchor.download=filename;anchor.hidden=true;document.body.append(anchor);anchor.click();anchor.remove();
            setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
            if(indexes.length>1)await sleep(450);
          }
          ok++;
        }catch{try{await writable?.abort();}catch{}complete=false;failed++;}
      }
      // Leave a partly failed album selected so a later save can retry it.
      if(current()&&complete&&index===null)state.postSelected.delete(downloadSelectionKey('channel-image',post));
    }
    status=`${directory?'저장':'다운로드 요청'} ${ok}장${skipped?` · 기존 파일 ${skipped}장 건너뜀`:''}${failed?` · 실패 ${failed}개 (선택 유지)`:''}`;
    if(current())window.alert(status);
  }catch(error){if(current()&&error.name!=='AbortError')window.alert('사진을 저장하지 못했습니다. 다시 시도해주세요.');}
  finally{
    state.postBulkSaving=false;channelVideoState.downloading=false;
    if(button){button.disabled=false;button.innerHTML=oldHTML;}
    syncDownloadSelection();void drainPostDownloads();
  }
  return status;
}
function saveSelectedChannelPhotos() {
  const scope=downloadSelectionScope();
  return saveChannelPhotoPosts(scope.items.filter(post=>state.postSelected.has(downloadSelectionKey('channel-image',post))),{button:document.querySelector('#saveSelectedBtn')});
}
function openChannelPhotoAlbum(post) {return window.FrommChannelPhotos.open(post);}
window.FrommChannelPhotos=(()=>{
  let dialog=null,owner=null;
  function close(){
    if(!owner)return;
    const previous=owner;owner=null;previous.controller.abort();previous.observer.disconnect();
    if(dialog?.open)dialog.close();dialog?.remove();dialog=null;
    if(previous.trigger?.isConnected)previous.trigger.focus({preventScroll:true});
  }
  function ensure(){
    dialog=document.createElement('dialog');dialog.className='channel-photo-dialog';dialog.tabIndex=-1;dialog.setAttribute('aria-label','채널 사진 앨범');
    dialog.innerHTML='<header><div><strong class="channel-photo-title"></strong><span class="channel-photo-count"></span></div><button type="button" class="btn" data-photo-action="close" aria-label="앨범 닫기">×</button></header><div class="channel-photo-stage"><button type="button" class="btn" data-photo-action="prev" aria-label="이전 사진">‹</button><div class="channel-photo-image"><img alt="" draggable="false"></div><button type="button" class="btn" data-photo-action="next" aria-label="다음 사진">›</button></div><p class="channel-photo-status" role="status"></p><footer><button type="button" class="btn" data-photo-action="retry" hidden>다시 불러오기</button><button type="button" class="btn" data-photo-action="save">이 사진 저장</button><button type="button" class="btn" data-photo-action="all">앨범 전체 저장</button></footer>';
    document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('close',event=>{if(event.target===dialog)close();});
    dialog.addEventListener('click',e=>{
      const action=e.target.closest('[data-photo-action]')?.dataset.photoAction;
      if(action==='close'){close();return;}
      if(action==='prev'||action==='next'){move(action==='prev'?-1:1);return;}
      if(action==='retry'){void open(owner.post);return;}
      if(action==='save'||action==='all'){void saveChannelPhotoPosts([owner.post],{button:e.target.closest('button'),index:action==='save'?owner.index:null});return;}
      if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
    });
    dialog.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();move(e.key==='ArrowLeft'?-1:1);}
    });
    let start;
    const stage=dialog.querySelector('.channel-photo-image');
    stage.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});
    stage.addEventListener('pointerup',e=>{if(start&&Math.abs(e.clientX-start.x)>55&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)*1.5)move(e.clientX>start.x?-1:1);start=null;});
    dialog.showModal();
  }
  function paint(){
    const o=owner;if(!o||!o.detail)return;
    const image=dialog.querySelector('img'),url=o.detail.urls[o.index],version=++o.imageVersion;
    dialog.querySelector('.channel-photo-count').textContent=`${o.index+1} / ${o.detail.urls.length}`;
    dialog.querySelector('[data-photo-action="prev"]').disabled=o.index===0;
    dialog.querySelector('[data-photo-action="next"]').disabled=o.index===o.detail.urls.length-1;
    dialog.querySelector('.channel-photo-status').textContent='원본 사진 불러오는 중…';
    dialog.querySelector('[data-photo-action="retry"]').hidden=true;
    image.alt=(o.detail.title||'채널 사진')+` · ${o.index+1}번째 사진`;
    let fallback=false;
    image.onload=()=>{if(owner===o&&o.imageVersion===version)dialog.querySelector('.channel-photo-status').textContent=fallback?'원본 대신 제공된 사진을 표시합니다.':'';};
    image.onerror=()=>{
      if(owner!==o||o.imageVersion!==version)return;
      if(!fallback&&channelPhotoOriginal(url)!==url){fallback=true;image.src=url;}
      else {
        dialog.querySelector('.channel-photo-status').textContent='사진을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.';
        dialog.querySelector('[data-photo-action="retry"]').hidden=false;
      }
    };
    image.src=channelPhotoOriginal(url);
  }
  function move(delta){if(owner?.detail){owner.index=Math.max(0,Math.min(owner.detail.urls.length-1,owner.index+delta));paint();dialog.focus({preventScroll:true});}}
  async function open(post){
    close();const current=channelPhotoContext();if(!post||!current())return;
    const controller=new AbortController(),o={post,current,controller,index:0,imageVersion:0,trigger:document.activeElement};
    o.observer=new MutationObserver(()=>{if(owner===o&&!current())close();});
    owner=o;ensure();o.observer.observe(document.querySelector('#timeline'),{childList:true,subtree:true});
    dialog.querySelector('.channel-photo-title').textContent=post.title||'채널 사진';
    dialog.querySelector('.channel-photo-status').textContent='앨범 불러오는 중…';
    for(const button of dialog.querySelectorAll('footer button,[data-photo-action="prev"],[data-photo-action="next"]'))button.disabled=true;
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const timeout=new Promise((_resolve,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('사진 요청이 중단되었습니다. 다시 불러와 주세요.')),{once:true}));
      o.detail=await Promise.race([fetchChannelPhotoDetail(post,{signal:controller.signal}),timeout]);
      if(owner!==o||!current())return;
      for(const button of dialog.querySelectorAll('footer button'))button.disabled=false;
      paint();
    }catch{
      if(owner===o&&current()){
        dialog.querySelector('.channel-photo-status').textContent='앨범을 불러오지 못했습니다. 구독과 연결 상태를 확인해주세요.';
        const retry=dialog.querySelector('[data-photo-action="retry"]');retry.hidden=false;retry.disabled=false;
      }
    }finally{clearTimeout(timer);}
  }
  function bind(){
    for(const button of document.querySelectorAll('[data-channel-media-type]'))button.onclick=()=>selectChannelMediaType(button.dataset.channelMediaType);
    for(const button of document.querySelectorAll('[data-channel-photo-open]'))button.onclick=()=>open(channelVideoPage().posts.find(p=>String(p.id)===button.dataset.channelPhotoOpen));
    for(const button of document.querySelectorAll('[data-channel-photo-download]'))button.onclick=()=>saveChannelPhotoPosts([channelVideoPage().posts.find(p=>String(p.id)===button.dataset.channelPhotoDownload)],{button});
  }
  return {open,close,bind};
})();

// The shell/reader must initialize before this optional feature. Bind if an
// already-completed startup request rendered Channel while this file loaded.
window.addEventListener('DOMContentLoaded',()=>{if(channelVideosActive())window.FrommChannelPhotos.bind();},{once:true});

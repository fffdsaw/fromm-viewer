/* Channel image posts are albums, independent of video playback and HLS saves.
 * Keep signed URLs ephemeral; list cursors always belong to the raw mixed feed. */
'use strict';
async function selectChannelMediaType(type,{restoreHistory=false}={}) {
  const s=channelVideoState;
  type=Object.hasOwn(CHANNEL_MEDIA_LABELS,type)?type:'all';
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
  document.querySelector(`[data-channel-content-menu]`)?.focus({preventScroll:true});
}
function renderChannelPhotoCard(post) {
  const thumb=replayThumb(post),title=post.title||'채널 사진',count=channelPhotoCount(post);
  const download=`<button class="replay-download" data-channel-photo-download="${esc(post.id)}" type="button" aria-label="${esc(title)} 앨범 다운로드">${downloadFeedbackIcon()}</button>`;
  return `<article class="replay-card channel-video-card channel-photo-card" data-channel-video-card="${esc(post.id)}"><div class="replay-thumb">${thumb?`<img data-video-thumb="${esc(thumb)}" alt="" loading="lazy" decoding="async">`:'<span class="replay-thumb-empty">사진</span>'}<button class="replay-play" data-channel-photo-open="${esc(post.id)}" type="button" aria-label="${esc(title)} 앨범 열기"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 17 5-5 4 4 4-6 5 7"/><circle cx="8" cy="8" r="1"/></svg></button>${download}</div><div class="replay-body"><div class="replay-title">${esc(title)}</div><div class="replay-meta channel-photo-meta"><span class="channel-photo-date">${esc(channelPostMetadata(post))}</span><span class="channel-photo-count-badge" ${count===null?'hidden':''}>${count===null?'':count+'장'}</span></div></div></article>`;
}
function channelPhotoCount(post) {
  if(Array.isArray(post?.urls)&&post.urls.length)return post.urls.length;
  if(post?._channelId!==channelVideoState.channelId||channelVideoState.mediaType==='video')return null;
  return channelVideoPage()?.photoCounts?.get(String(post.id))??post._artistPhotoCount??null;
}
function rememberChannelPhotoCount(post,count) {
  if(post?._channelId!==channelVideoState.channelId||channelVideoState.mediaType==='video')return;
  const page=channelVideoPage();if(!page)return;
  (page.photoCounts??=new Map()).set(String(post.id),count);
  window.FrommChannelPhotos?.refreshCounts();
}
// Decoded neighbors are reused as DOM images, so advancing never waits for an
// original-URL probe. Only the current image plus its immediate neighbors live.
function prepareAlbumImage(url,priority='low') {
  const image=new Image();image.decoding='async';image.fetchPriority=priority;
  let finish,settled=false;
  const entry={image,ready:false,failed:false,promise:new Promise(resolve=>{finish=resolve;})};
  const complete=ok=>{if(settled)return;settled=true;entry.ready=ok;entry.failed=!ok;finish(ok);};
  image.onload=async()=>{try{await image.decode();}catch{}complete(image.naturalWidth>0);};
  image.onerror=()=>complete(false);
  entry.dispose=()=>{image.onload=null;image.onerror=null;image.removeAttribute('src');complete(false);};
  image.src=url;return entry;
}
function channelPhotoContext() {
  const sameSession=channelVideoSession(),{channelId,playSeq,mediaType,artistMember}=channelVideoState;
  return ()=>mediaType!=='video'&&sameSession()&&playSeq===channelVideoState.playSeq&&channelVideosActive()&&mediaType===channelVideoState.mediaType&&channelVideoState.channelId===channelId&&(mediaType!=='artist'||artistMember===channelVideoState.artistMember);
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
    const request=post._artistPostId!=null
      ? fetchChannelArtistMedia(post,controller.signal)
      : frommApiRequest(`/media/posts/${encodeURIComponent(post.id)}`,{base:FROMM_CHANNEL_API_BASE,channelId:post._channelId,signal:controller.signal});
    response=await Promise.race([request,cancelled]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  if(!current()||signal?.aborted)throw new Error('채널 또는 로그인 세션이 변경되었습니다.');
  if(post._artistPostId!=null){
    const urls=response.filter(item=>item.type==='image').map(item=>item.url);
    if(!urls.length)throw new Error('이 아티스트 사진을 볼 수 없습니다.');
    rememberChannelPhotoCount(post,urls.length);
    return {...post,urls};
  }
  const detail=response?.data?.post||response?.result?.post||response?.post;
  if(!detail||String(detail.id)!==String(post.id)||detail.type!=='image'||detail.isVisible===false)throw new Error('이 사진을 볼 수 없습니다. 구독과 공개 상태를 확인해주세요.');
  if(!Array.isArray(detail.urls)||!detail.urls.length||!detail.urls.every(url=>typeof url==='string'&&isHttpMediaUrl(url)))throw new Error('사진 주소를 확인하지 못했습니다.');
  rememberChannelPhotoCount(post,detail.urls.length);
  return {...post,...detail,_channelId:post._channelId,_channelName:post._channelName};
}
function channelPhotoOriginal(url) {
  const parsed=new URL(url);
  if(!/^(channel|store)(-dev)?-contents\.frommyarti\.com$/.test(parsed.hostname))return url;
  parsed.pathname=parsed.pathname.replace(/(?:_\d+x\d+)?\.[^/.]+$/,'.jpg');
  return parsed.href;
}
function channelPhotoFilename(post,index,contentType) {
  const date=replayDatePrefix(post.displayStartAt??'')||replayDatePrefix(post.createdAt??'')||'날짜없음';
  const title=String(post.title||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,70).replace(/[\uD800-\uDBFF]$/,'').trim()||'사진';
  return `${date}_${title}_${String(index+1).padStart(3,'0')}${contentTypeExt(contentType,'image')}`;
}
async function sameChannelPhotoFile(file,blob,current){
  if(file.size!==blob.size)return false;
  const chunkSize=1024*1024;
  for(let offset=0;offset<blob.size;offset+=chunkSize){
    if(!current())return false;
    const [existing,incoming]=await Promise.all([file,blob].map(source=>source.slice(offset,offset+chunkSize).arrayBuffer()));
    const bytes=new Uint8Array(incoming);
    if(new Uint8Array(existing).some((byte,index)=>byte!==bytes[index]))return false;
  }
  return true;
}
async function channelPhotoSaveHandle(directory,filename,blob,current){
  const sequence=filename.lastIndexOf('_');
  for(let suffix=1;current();suffix++){
    const name=suffix===1?filename:`${filename.slice(0,sequence)} (${suffix})${filename.slice(sequence)}`;
    let handle;
    try{handle=await directory.getFileHandle(name);}
    catch(error){
      if(error.name!=='NotFoundError')throw error;
      return current()?directory.getFileHandle(name,{create:true}):null;
    }
    const file=await handle.getFile();
    if(!file.size)return handle;
    if(await sameChannelPhotoFile(file,blob,current))return null;
  }
  return null;
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
async function saveChannelPhotoContents(post,{directory,current,index=null,onProgress}={}){
  const detail=await fetchChannelPhotoDetail(post),indexes=index===null?detail.urls.map((_url,i)=>i):[index];
  let ok=0,skipped=0,failed=0;
  for(const i of indexes){
    if(!current())break;
    if(!detail.urls[i]){failed++;continue;}
    onProgress?.(i+1,detail.urls.length);let writable;
    try{
      const {blob,contentType}=await fetchChannelPhotoBlob(detail.urls[i],current);if(!current())break;
      const filename=channelPhotoFilename(detail,i,contentType);
      if(directory){
        const handle=await channelPhotoSaveHandle(directory,filename,blob,current);
        if(!current())break;
        if(!handle){skipped++;continue;}
        writable=await handle.createWritable();if(!current())throw new Error('SESSION_CHANGED');
        await writable.write(blob);if(!current())throw new Error('SESSION_CHANGED');await writable.close();writable=null;
      }else{
        const objectUrl=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=filename;anchor.hidden=true;document.body.append(anchor);anchor.click();anchor.remove();
        setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);if(indexes.length>1)await sleep(450);
      }
      ok++;
    }catch{try{await writable?.abort();}catch{}failed++;}
  }
  return {ok,skipped,failed,complete:current()&&ok+skipped===indexes.length&&failed===0};
}
async function saveChannelPhotoPosts(posts,{button,index=null}={}){
  if(!posts.length||state.postBulkSaving||postDownloadRunning||channelVideoState.downloading||state.live.replayDownloading)return;
  const current=channelPhotoContext(),oldHTML=button?.innerHTML;if(!current())return;
  state.postBulkSaving=true;channelVideoState.downloading=true;if(button)button.disabled=true;
  const iconOnly=button?.matches?.('[data-channel-photo-download]')&&window.pcMediaPresentation?.();
  let directory,ok=0,skipped=0,failed=0,status='',phase="idle";
  try{
    if(supportsDirectorySave()){
      if(iconOnly)setDownloadButtonFeedback(button,"picker");
      directory=await window.showDirectoryPicker();
    }
    if(iconOnly)setDownloadButtonFeedback(button,"active");
    for(const post of posts){
      if(!current())break;
      try{
        const result=await saveChannelPhotoContents(post,{directory,current,index,onProgress:(done,total)=>{
          if(iconOnly){
            button.title=`다운로드 중 · ${done}/${total}장`;
            button.setAttribute('aria-label',button.title);
          }else if(button)button.textContent=`저장 ${done}/${total}`;
        }});
        ok+=result.ok;skipped+=result.skipped;failed+=result.failed;
        if(current()&&result.complete&&index===null)state.postSelected.delete(downloadSelectionKey('channel-image',post));
      }catch{failed++;}
    }
    status=[ok?`${directory?'저장 완료':'다운로드 요청 완료'} · ${ok}장`:'',
      skipped?`기존 파일 ${skipped}장 건너뜀`:'',failed?`저장 실패 ${failed}개`:''].filter(Boolean).join(' · ');
    if(current()){
      phase=failed?'error':directory?'done':'handed-off';
      if(iconOnly)setDownloadButtonFeedback(button,phase);
      showSaveNotice(status);
    }
  }catch(error){
    if(current()&&error.name!=='AbortError'){
      phase='error';
      if(iconOnly)setDownloadButtonFeedback(button,phase);
      showSaveNotice('사진을 저장하지 못했습니다. 다시 시도해주세요.');
    }
  }
  finally{state.postBulkSaving=false;channelVideoState.downloading=false;if(button){button.disabled=false;if(!iconOnly)button.innerHTML=oldHTML;}
    if(iconOnly&&phase==="idle")setDownloadButtonFeedback(button);
    syncDownloadSelection();void drainPostDownloads();}
  return status;
}

function saveSelectedChannelPhotos() {
  const scope=downloadSelectionScope();
  return saveChannelPhotoPosts(scope.items.filter(post=>state.postSelected.has(downloadSelectionKey('channel-image',post))),{button:document.querySelector('#saveSelectedBtn')});
}
function openChannelPhotoAlbum(post) {return window.FrommChannelPhotos.open(post);}
window.FrommChannelPhotos=(()=>{
  let dialog=null,owner=null,countOwner=null;
  function close(){
    if(!owner)return;
    const previous=owner;owner=null;previous.controller.abort();previous.observer.disconnect();
    for(const entry of previous.images.values()){entry.preview.dispose();entry.original?.dispose();}previous.images.clear();
    if(dialog?.open)dialog.close();
    restoreSaveResultHost(dialog);
    dialog?.remove();dialog=null;
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
  function cachedImage(o,index,priority='low'){
    let entry=o.images.get(index);if(entry){if(priority==='high')entry.preview.image.fetchPriority='high';return entry;}
    entry={preview:prepareAlbumImage(o.detail.urls[index],priority),original:null};o.images.set(index,entry);return entry;
  }
  function paint(){
    const o=owner;if(!o||!o.detail)return;
    const index=o.index,url=o.detail.urls[index],version=++o.imageVersion,entry=cachedImage(o,index,'high');
    const current=()=>owner===o&&o.current()&&o.imageVersion===version;
    const stage=dialog.querySelector('.channel-photo-image'),status=dialog.querySelector('.channel-photo-status');
    status.textContent='';
    dialog.querySelector('.channel-photo-count').textContent=`${index+1} / ${o.detail.urls.length}`;
    dialog.querySelector('[data-photo-action="prev"]').disabled=index===0;
    dialog.querySelector('[data-photo-action="next"]').disabled=index===o.detail.urls.length-1;
    dialog.querySelector('[data-photo-action="retry"]').hidden=true;
    const display=source=>{source.image.alt=(o.detail.title||'채널 사진')+` · ${index+1}번째 사진`;source.image.dataset.albumIndex=String(index);if(stage.firstElementChild!==source.image)stage.replaceChildren(source.image);};
    display(entry.original?.ready?entry.original:entry.preview);
    const originalUrl=channelPhotoOriginal(url);
    if(originalUrl!==url&&!entry.original)entry.original=prepareAlbumImage(originalUrl,'high');
    const update=()=>{
      if(!current())return;
      if(entry.original?.ready)display(entry.original);
      else if(entry.preview.ready)display(entry.preview);
      else if(entry.preview.failed&&(!entry.original||entry.original.failed)){
        status.textContent='사진을 불러오지 못했습니다. 다시 불러오기를 눌러주세요.';dialog.querySelector('[data-photo-action="retry"]').hidden=false;
      }
    };
    update();entry.preview.promise.then(update);entry.original?.promise.then(update);
    // Preview only: avoid speculative high-resolution downloads for the album.
    for(const neighbor of [index+1,index-1])if(neighbor>=0&&neighbor<o.detail.urls.length)cachedImage(o,neighbor);
    for(const [key,value]of o.images)if(Math.abs(key-index)>1){value.preview.dispose();value.original?.dispose();o.images.delete(key);}
  }
  function move(delta){if(owner?.detail){owner.index=Math.max(0,Math.min(owner.detail.urls.length-1,owner.index+delta));paint();dialog.focus({preventScroll:true});}}
  async function open(post){
    close();const current=channelPhotoContext();if(!post||!current())return;
    const controller=new AbortController(),o={post,current,controller,index:0,imageVersion:0,images:new Map(),trigger:document.activeElement};
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
  function stopCounts(){
    const c=countOwner;if(!c)return;countOwner=null;c.observer?.disconnect();for(const controller of c.controllers)controller.abort();c.queue.clear();
  }
  function countLabel(card,post){
    const label=card.querySelector('.channel-photo-count-badge'),count=channelPhotoCount(post);if(!label)return;
    const text=count===null?'':count+'장';if(label.textContent!==text)label.textContent=text;label.hidden=count===null;
    label.setAttribute('aria-label',count===null?'사진 앨범':'사진 '+count+'장');
  }
  function refreshCounts(){if(countOwner?.valid())for(const [card,post]of countOwner.cards)countLabel(card,post);}
  function countPump(c){
    if(countOwner!==c||!c.valid())return;
    while(c.active<2&&c.queue.size){
      const card=c.queue.values().next().value;c.queue.delete(card);const post=c.cards.get(card);
      if(!card.isConnected||!post||channelPhotoCount(post)!==null||c.requested.has(post))continue;
      c.requested.add(post);const controller=new AbortController();c.controllers.add(controller);c.active++;
      fetchChannelPhotoDetail(post,{signal:controller.signal}).then(()=>{if(countOwner===c&&c.valid())refreshCounts();}).catch(()=>{/* Keep a usable album card when count lookup fails. */}).finally(()=>{c.controllers.delete(controller);c.active--;countPump(c);});
    }
  }
  function bindCounts(){
    if(!channelVideosActive()||channelVideoState.mediaType==='video'||channelVideoState.selected){stopCounts();return;}
    if(countOwner&&!countOwner.valid())stopCounts();
    if(!countOwner){
      const c={valid:channelPhotoContext(),cards:new Map(),queue:new Set(),requested:new WeakSet(),controllers:new Set(),active:0,observer:null};
      if(typeof IntersectionObserver==='function')c.observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)c.queue.add(e.target);else c.queue.delete(e.target);countPump(c);});
      countOwner=c;
    }
    const c=countOwner,posts=channelVideoPage()?.posts||[],cards=new Set(document.querySelectorAll('.channel-photo-card'));
    for(const card of c.cards.keys())if(!cards.has(card)){c.observer?.unobserve(card);c.cards.delete(card);c.queue.delete(card);}
    for(const card of cards){
      const post=posts.find(p=>String(p.id)===card.dataset.channelVideoCard);if(!post)continue;
      const previous=c.cards.get(card);c.cards.set(card,post);countLabel(card,post);
      if(previous!==post){if(c.observer)c.observer.observe(card);else{const r=card.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)c.queue.add(card);}}
    }
    countPump(c);
  }
  function bind(){
    bindCounts();
    for(const button of document.querySelectorAll('[data-channel-photo-open]'))button.onclick=()=>open(channelVideoPage().posts.find(p=>String(p.id)===button.dataset.channelPhotoOpen));
    for(const button of document.querySelectorAll('[data-channel-photo-download]'))button.onclick=()=>saveChannelPhotoPosts([channelVideoPage().posts.find(p=>String(p.id)===button.dataset.channelPhotoDownload)],{button});
  }
  window.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{if(countOwner&&!countOwner.valid())stopCounts();}).observe(document.querySelector('#timeline'),{childList:true,subtree:true});},{once:true});
  window.addEventListener('pagehide',()=>{close();stopCounts();});
  window.addEventListener('pageshow',()=>{if(channelVideosActive())bind();});
  return {open,close,bind,refreshCounts,get snapshot(){return {cachedImages:owner?.images.size||0,readyPreviews:owner?[...owner.images.values()].filter(e=>e.preview.ready).length:0,pendingCounts:countOwner?.active||0};}};
})();

// The shell/reader must initialize before this optional feature. Bind if an
// already-completed startup request rendered Channel while this file loaded.
window.addEventListener('DOMContentLoaded',()=>{if(channelVideosActive())window.FrommChannelPhotos.bind();},{once:true});

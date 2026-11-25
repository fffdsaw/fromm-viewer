/* Ephemeral view positions only: no messages, credentials or account data persisted. */
(() => {
 'use strict';
 const positions=new Map();let pending=null,frame=0,restoring=false,serial=0,active='',anchorCleanup=null,motionCleanup=null,latestCleanup=null,latestFollowing=false;
 // Our message anchors own reload/navigation restoration, never raw browser Y.
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 const key=(filter=state.filter)=>[state.room?.hostChatRoomId||state.room?.id||'',filter].join(':');
 const chatWaiting=()=>state.filter==='all'&&(((state.chatHistoryLoading||!state.chatHistoryComplete)&&!state.chatMessages.length&&!window.FrommConversation?.canShowCached())||state.chatAutoTopPending);
 const row=()=>[...document.querySelectorAll('#timeline [data-message-id],#timeline [data-vote-id]')].find(el=>el.getBoundingClientRect().bottom>(state.filter==='all'?chatHeaderInset()+8:8));
 function capture(){
  if(state.filter==='live'||pending||restoring||chatWaiting())return false;
  const el=row();
  // A loading/empty notice is not a message the reader chose to keep.
  if(state.filter==='all'&&!el)return false;
  const dockHeight=state.filter==='all'?(document.querySelector('#conversationDock')?.offsetHeight||0):0;
  const latest=state.filter==='all'&&state.infiniteRendered>=state.infiniteList.length&&(latestFollowing||document.documentElement.scrollHeight-(window.scrollY+window.innerHeight)<=Math.max(80,dockHeight+16));
  positions.set(key(),{y:scrollY,id:el?.dataset.messageId||'',vote:el?.dataset.voteId||'',offset:el?.getBoundingClientRect().top||0,latest});
  // Navigation history is bounded; only scalar positions/IDs are retained.
  if(positions.size>120)positions.delete(positions.keys().next().value);
  return true;
 }
 function enter(filter=state.filter,options={}){
  cancel();active=key(filter);
  const saved=positions.get(active);
  latestFollowing=filter==='all'&&!!saved?.latest;
  // New conversation entry is handled by the latest-message virtual window,
  // not by an automatic restore to scrollY 0. Keep gallery's default top.
  pending=options.autoTop===false?null:saved?{key:active,position:saved,serial}:filter==='all'?null:{key:active,position:{y:0},serial};
  return !!saved&&options.autoTop!==false;
 }
 function navigate(filter,options){capture();return enter(filter,options);}
 function beforeRender(){
  if(motionCleanup || latestCleanup || anchorCleanup || chatWaiting())return;
  if(active===key()&&!pending&&capture()){pending={key:active,position:positions.get(active)||{y:scrollY},serial:++serial};}
 }
 function cancel(){anchorCleanup?.();anchorCleanup=null;motionCleanup?.();motionCleanup=null;latestCleanup?.();latestCleanup=null;latestFollowing=false;pending=null;serial++;}
 async function restore(){
  if(restoring||!pending||pending.key!==key()||state.filter==='live')return;
  if(state.filter==='all'&&(state.chatHistoryLoading||!state.chatHistoryComplete)&&!state.chatMessages.length&&!window.FrommConversation?.canShowCached())return;
  const job=pending,pos=job.position;restoring=true;
  try{
   let el=pos.id?document.querySelector(`#timeline [data-message-id="${CSS.escape(pos.id)}"]`):pos.vote?document.querySelector(`#timeline [data-vote-id="${CSS.escape(pos.vote)}"]`):null;
   if(!el&&pos.id&&!pos.latest){
    const index=state.infiniteList.findIndex(m=>String(m.messageId)===pos.id);
    if(index>=0){if(state.filter==='all'){renderChatWindow(state.infiniteList,index);}
     else await appendInfiniteBatch(Math.max(1,Math.ceil((index+1-state.infiniteRendered)/state.chunkSize)),state.infiniteVersion);
     el=document.querySelector(`#timeline [data-message-id="${CSS.escape(pos.id)}"]`);
    }
   }
   // A resumed gallery may initially contain just one batch. Restore only
   // after the saved offset is reachable; never clamp it to that short batch.
   if(!['all','vote','live'].includes(state.filter)){
    while(pending===job&&job.key===key()&&document.documentElement.scrollHeight-innerHeight<pos.y&&state.infiniteRendered<state.infiniteList.length){
     const before=state.infiniteRendered;await appendInfiniteBatch(1,state.infiniteVersion);
     if(state.infiniteRendered===before)break;
    }
   }
   if(pending!==job||job.serial!==serial||job.key!==key())return;
   if(pos.latest&&state.filter==='all'){
    pending=null;settleLatest(()=>job.key===key()&&state.filter==='all');
   }else if(el){
    scrollBy({top:el.getBoundingClientRect().top-pos.offset,behavior:'instant'});
    pending=null;
    settleRestoredMessage(el,pos.offset,()=>job.key===key()&&state.filter==='all');
   }else{
    scrollTo({top:pos.y,behavior:'instant'});
    pending=null;
   }
  }finally{restoring=false;}
 }
 // After rebuilding a virtual message window, images can gain height later.
 // Keep the same message at its prior viewport offset for a bounded period.
 function settleRestoredMessage(el,offset,valid){
  anchorCleanup?.();const ticket=serial,tl=document.querySelector('#timeline');
  let closed=false,queued=0,observer=null,timer=0,frames=0;
  const cleanup=()=>{
   if(closed)return;closed=true;cancelAnimationFrame(queued);
   observer?.disconnect();clearTimeout(timer);tl?.removeEventListener('load',schedule,true);
   document.fonts?.removeEventListener('loadingdone',schedule);
   document.fonts?.removeEventListener('loadingerror',schedule);
   if(anchorCleanup===cleanup)anchorCleanup=null;
  };
  const align=()=>{
   queued=0;
   if(closed||ticket!==serial||!el.isConnected||!valid()||document.hidden){cleanup();return;}
   const delta=el.getBoundingClientRect().top-offset;
   if(Math.abs(delta)>0.5)scrollBy({top:delta,behavior:'instant'});
   if(++frames<15)schedule();
  };
  function schedule(){if(!closed&&!queued)queued=requestAnimationFrame(align);}
  anchorCleanup=cleanup;
  if(typeof ResizeObserver==='function'&&tl){
   observer=new ResizeObserver(schedule);observer.observe(tl);
  }
  tl?.addEventListener('load',schedule,true);
  document.fonts?.addEventListener('loadingdone',schedule);
  document.fonts?.addEventListener('loadingerror',schedule);
  timer=setTimeout(()=>{align();cleanup();},4000);
  align();
 }
 function settleAnchor(el,inset,valid=()=>true,watchMs=0){
  cancel();watchMs=Math.max(0,Math.min(2000,Number(watchMs)||0));const ticket=serial;let count=0,queued=false,closed=false,observer=null,timer=0;
  const timeline=document.querySelector('#timeline'),header=document.querySelector('.viewer-header');
  const cleanup=()=>{closed=true;observer?.disconnect();clearTimeout(timer);timeline?.removeEventListener('load',schedule,true);document.fonts?.removeEventListener('loadingdone',schedule);document.fonts?.removeEventListener('loadingerror',schedule);document.removeEventListener('keydown',cleanup,true);document.removeEventListener('visibilitychange',visibility);if(anchorCleanup===cleanup)anchorCleanup=null;};
  const visibility=()=>{if(document.hidden)cleanup();};
  const align=()=>{queued=false;if(closed)return;
   if(ticket!==serial||!el?.isConnected||!valid()){cleanup();return;}
   const delta=el.getBoundingClientRect().top-inset()-12;
   if(Math.abs(delta)>.5)scrollBy({top:delta,behavior:'instant'});
   if(++count<12)schedule();else if(!watchMs)cleanup();
  };
  function schedule(){if(!closed&&!queued){queued=true;requestAnimationFrame(align);}}
  anchorCleanup=cleanup;
  // Replies can move again when nearby media/fonts finish after the first frames.
  // Observe only a few containers for a bounded period; user input cancels it.
  if(watchMs>0){
   if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);for(const node of [el,timeline,header])if(node)observer.observe(node);}
   timeline?.addEventListener('load',schedule,true);document.addEventListener('keydown',cleanup,true);document.addEventListener('visibilitychange',visibility);
   document.fonts?.addEventListener('loadingdone',schedule);document.fonts?.addEventListener('loadingerror',schedule);timer=setTimeout(()=>{align();cleanup();},watchMs);
  }
  schedule();
 }
 function travel(latest=false,valid=()=>true){
  cancel();state.chatAutoTopPending=false;
  const view=key(),chat=state.filter==='all',list=chat&&(latest||state.chatHistoryComplete)?filteredMessages():null;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
   if(list?.length)renderChatWindow(list,latest?list.length-1:0);
   if(latest)settleLatest(valid);else{positions.set(view,{y:0});scrollTo({top:0,behavior:'instant'});}return;
  }
  const ticket=serial,tl=document.querySelector('#timeline'),button=document.querySelector(latest?'#conversationNew':'#scrollTopBtn'),motionClass=latest?'is-returning-latest':'is-returning';
  let animation=0,finished=false,version=null,prefix=[];
  const cleanup=()=>{
   cancelAnimationFrame(animation);button?.classList.remove(motionClass);button?.style.removeProperty('--top-return-duration');
   // During the trip only two destination chunks are added, never the entire
   // history. Reconcile the virtual window on arrival OR manual interruption.
   if(prefix.some(el=>el.parentNode===tl)&&view===key()&&version===state.infiniteVersion){
    const anchor=finished?null:row(),offset=anchor?.getBoundingClientRect().top,current=filteredMessages();
    const index=finished?(latest?current.length-1:0):current.findIndex(message=>String(message.messageId)===anchor?.dataset.messageId);
    if(current.length)renderChatWindow(current,Math.max(0,index));
    if(finished)scrollTo({top:latest?document.documentElement.scrollHeight:0,behavior:'instant'});
    else if(anchor&&index>=0){const next=tl.querySelector(`[data-message-id="${CSS.escape(anchor.dataset.messageId)}"]`);if(next)scrollBy({top:next.getBoundingClientRect().top-offset,behavior:'instant'});}
   }
   if(motionCleanup===cleanup)motionCleanup=null;
  };
  motionCleanup=cleanup;
  if(list?.length&&(latest?state.infiniteRendered<list.length:state.chatWindowStart>0)){
   // Keep the exact current message in place while adding the destination
   // alongside it. Rebuilding first would clamp scrollY and flash another message.
   const anchor=row(),offset=anchor?.getBoundingClientRect().top;
   const start=latest?Math.max(state.infiniteRendered,list.length-state.chunkSize*2):0,end=latest?list.length:Math.min(state.chatWindowStart,state.chunkSize*2);
   disconnectInfiniteObserver();version=state.infiniteVersion;
   const fragment=buildChatRangeFragment(start,end,true);prefix=[...fragment.childNodes];if(latest)tl.append(fragment);else tl.prepend(fragment);
   if(anchor)scrollBy({top:anchor.getBoundingClientRect().top-offset,behavior:'instant'});
  }
  const origin=scrollY,started=performance.now(),distance=latest?Math.max(0,document.documentElement.scrollHeight-innerHeight-origin):origin,duration=Math.min(650,Math.max(260,distance/12));
  button?.style.setProperty('--top-return-duration',`${duration}ms`);button?.classList.add(motionClass);
  const animate=now=>{
   if(!valid()||ticket!==serial||view!==key()||document.hidden||version!==null&&version!==state.infiniteVersion){cleanup();return;}
   const t=Math.min(1,(now-started)/duration),ease=1-Math.pow(1-t,3),target=latest?Math.max(origin,document.documentElement.scrollHeight-innerHeight):0;scrollTo({top:origin+(target-origin)*ease,behavior:'instant'});
   if(t<1)animation=requestAnimationFrame(animate);
   else{finished=true;cleanup();if(latest)settleLatest(valid);else{positions.set(view,{y:0});scrollTo({top:0,behavior:'instant'});}}
  };
  animation=requestAnimationFrame(animate);
 }
 function toStart(){return travel();}
 function toLatest(valid=()=>true){return travel(true,valid);}
 // Only a first chat entry follows late image/font sizing. User input cancels it.
 function settleLatest(valid=()=>true){
  cancel();latestFollowing=true;const ticket=serial,tl=document.querySelector('#timeline');
  let closed=false,queued=0,observer=null,timer=0;
  const cleanup=()=>{
   if(closed)return;closed=true;cancelAnimationFrame(queued);observer?.disconnect();clearTimeout(timer);
   document.fonts?.removeEventListener('loadingdone',schedule);
   document.fonts?.removeEventListener('loadingerror',schedule);
   if(latestCleanup===cleanup)latestCleanup=null;
  };
  const align=()=>{
   queued=0;
   if(closed||ticket!==serial||!valid()||document.hidden){cleanup();return;}
   scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
   capture();
  };
  function schedule(){if(!closed&&!queued)queued=requestAnimationFrame(align);}
  latestCleanup=cleanup;
  if(typeof ResizeObserver==='function'&&tl){observer=new ResizeObserver(schedule);for(const node of [tl,document.querySelector('.main'),document.querySelector('#conversationDock')])if(node)observer.observe(node);}
  document.fonts?.addEventListener('loadingdone',schedule);
  document.fonts?.addEventListener('loadingerror',schedule);
  timer=setTimeout(()=>{align();cleanup();},4000);
  align();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;void restore();});}
 new MutationObserver(schedule).observe(document.querySelector('#timeline'),{childList:true,subtree:true});
 // User-directed movement always wins over an asynchronous restore.
 for(const type of ['wheel','touchstart','pointerdown'])window.addEventListener(type,()=>{cancel();},{passive:true});
 document.addEventListener('keydown',e=>{if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(e.key)&&!e.target.matches('input,select,textarea'))cancel();});
 function resume(position){cancel();active=key();positions.set(active,position);pending={key:active,position,serial};}
 window.FrommViewState=Object.freeze({capture,enter,navigate,beforeRender,cancel,resume,restore,settleAnchor,settleLatest,toStart,toLatest,clear(){cancel();positions.clear();active='';},get position(){return pending?.key===key()?pending.position:null;},get pending(){return !!pending;},get followingLatest(){return latestFollowing;},get returning(){return !!motionCleanup;}});
})();

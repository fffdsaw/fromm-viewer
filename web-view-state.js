/* Ephemeral view positions only: no messages, credentials or account data persisted. */
(() => {
 'use strict';
 const positions=new Map();let pending=null,frame=0,restoring=false,serial=0,active='',anchorCleanup=null;
 const key=(filter=state.filter)=>[state.room?.hostChatRoomId||state.room?.id||'',filter].join(':');
 const row=()=>[...document.querySelectorAll('#timeline [data-message-id],#timeline [data-vote-id]')].find(el=>el.getBoundingClientRect().bottom>8);
 function capture(){
  if(state.filter==='live'||pending||restoring)return;
  const el=row();positions.set(key(),{y:scrollY,id:el?.dataset.messageId||'',vote:el?.dataset.voteId||'',offset:el?.getBoundingClientRect().top||0});
  // Navigation history is bounded; only scalar positions/IDs are retained.
  if(positions.size>120)positions.delete(positions.keys().next().value);
 }
 function enter(filter=state.filter,options={}){
  active=key(filter);serial++;pending=options.autoTop===false?null:{key:active,position:positions.get(active)||{y:0},serial};
  return !!positions.get(active)&&options.autoTop!==false;
 }
 function navigate(filter,options){capture();return enter(filter,options);}
 function beforeRender(){if(active===key()&&!pending){capture();pending={key:active,position:positions.get(active)||{y:scrollY},serial:++serial};}}
 function cancel(){anchorCleanup?.();anchorCleanup=null;pending=null;serial++;}
 async function restore(){
  if(restoring||!pending||pending.key!==key()||state.filter==='live')return;
  if(state.filter==='all'&&(state.chatHistoryLoading||!state.chatHistoryComplete))return;
  const job=pending,pos=job.position;restoring=true;let windowed=false;
  try{
   let el=pos.id?document.querySelector(`#timeline [data-message-id="${CSS.escape(pos.id)}"]`):pos.vote?document.querySelector(`#timeline [data-vote-id="${CSS.escape(pos.vote)}"]`):null;
   if(!el&&pos.id){
    const index=state.infiniteList.findIndex(m=>String(m.messageId)===pos.id);
    if(index>=0){if(state.filter==='all'){renderChatWindow(state.infiniteList,index);windowed=true;}
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
   if(el&&windowed)scrollBy({top:el.getBoundingClientRect().top-pos.offset,behavior:'instant'});
   else scrollTo({top:pos.y,behavior:'instant'});
   pending=null;
  }finally{restoring=false;}
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
   document.fonts?.addEventListener('loadingdone',schedule);document.fonts?.addEventListener('loadingerror',schedule);timer=setTimeout(cleanup,watchMs);
  }
  schedule();
 }
 function toStart(){
  cancel();state.chatAutoTopPending=false;
  const view=key();
  if(state.filter==='all'&&state.chatHistoryComplete){
   const list=filteredMessages();if(list.length)renderChatWindow(list,0);
  }
  cancel();const ticket=serial;positions.set(view,{y:0});
  // Virtual prepend compensation and smooth scrolling fight over the viewport.
  // Reset the window to the true start and stabilize it for bounded frames.
  scrollTo({top:0,behavior:state.filter==='all'?'instant':'smooth'});
  if(state.filter!=='all')return;
  let count=0;const settle=()=>{if(ticket!==serial||view!==key())return;
   scrollTo({top:0,behavior:'instant'});
   if(++count<12)requestAnimationFrame(settle);
  };requestAnimationFrame(settle);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;void restore();});}
 new MutationObserver(schedule).observe(document.querySelector('#timeline'),{childList:true,subtree:true});
 // User-directed movement always wins over an asynchronous restore.
 for(const type of ['wheel','touchstart','pointerdown'])window.addEventListener(type,()=>{cancel();},{passive:true});
 document.addEventListener('keydown',e=>{if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(e.key)&&!e.target.matches('input,select,textarea'))cancel();});
 window.FrommViewState=Object.freeze({capture,enter,navigate,beforeRender,cancel,settleAnchor,toStart,clear(){cancel();positions.clear();active='';},get pending(){return !!pending;}});
})();

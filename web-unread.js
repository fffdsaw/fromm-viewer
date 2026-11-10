/* Scoped multi-room unread monitoring; independent of full-history loading.
   No credentials or message bodies are persisted. */
(()=>{
 'use strict';
 const PREFIX='fromm.viewer.unread.v1:',PREF='fromm.viewer.alerts.v1:';
 let scope='',seen={},prefs={sound:false,desktop:false},unread=new Map(),latest=new Map();
 let roomIds=[],session=0,started=false,closePush=null,app=null,db=null,library=null,online=false,pollBusy=false;
 let pollTimer=0,syncTimer=0,lastAlert=0,previewAudio=null;
 const $=s=>document.querySelector(s);
 const current=()=>{try{return currentAuth();}catch{return null;}};
 const authenticated=()=>!!current()?.token&&!!current()?.uuid&&$('#loginGate')?.classList.contains('hidden');
 const account=()=>{try{return currentAccountScope();}catch{return'';}};
 const rooms=()=>Array.isArray(state.rooms)?state.rooms:[];
 const hostFor=room=>String(room?.hostChatRoomId||'');
 const visibleRoom=host=>!document.hidden&&state.filter==='all'&&host===hostFor(state.room);
 const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}};
 const store=()=>{if(!scope)return;try{localStorage.setItem(PREFIX+scope,JSON.stringify({seen}));}catch{}};
 const prefStore=()=>{if(!scope)return;try{localStorage.setItem(PREF+scope,JSON.stringify(prefs));}catch{}};
 function setPrefs(patch){
  prefs={sound:typeof patch?.sound==='boolean'?patch.sound:prefs.sound,desktop:typeof patch?.desktop==='boolean'?patch.desktop:prefs.desktop};
  prefStore();window.dispatchEvent(new Event('fromm-unread-prefs'));return {...prefs};
 }
 function markSeen(host){
  if(!scope||!host||!roomIds.includes(host))return;
  const prev=Number(seen[host])||0;
  const next=Math.max(prev,latest.get(host)||0,Date.now());
  const had=unread.has(host);
  if(next===prev&&!had)return;
  seen[host]=next;unread.delete(host);store();paint();
 }
 function count(host){const e=unread.get(host);return e?Math.min(100,Math.max(e.rt.size,e.rest.size)):0;}
 function paint(){
  const list=$('#rooms');if(!list)return;
  const buttons=[...list.querySelectorAll('.room')];
  buttons.forEach((btn,i)=>{
   const room=rooms()[i],host=hostFor(room),n=count(host);
   if(!host)return;
   btn.dataset.unreadHost=host;
   let badge=btn.querySelector('.rail-unread');
   if(!badge){badge=document.createElement('span');badge.className='rail-unread';badge.setAttribute('aria-hidden','true');btn.append(badge);}
   badge.hidden=n===0;badge.textContent=n>=100?'99+':String(n);
   btn.classList.toggle('has-unread',n>0);
   const label=room?.host?.nick||room?.chatRoomName||'아티스트';
   btn.setAttribute('aria-label',n?label+' · 새 메시지 '+(n>=100?'99개 이상':n+'개'):label);
  });
 }
 function newKey(message,source){
  const id=String(message?.messageId||message?.id||message?.code||message?._id||'');
  if(id)return id;
  const time=Number(new Date(message?.createdAt).getTime())||Number(message?.createdAt)||0;
  return source+':'+time+':'+String(message?.type||message?.userType||'');
 }
 function record(host,msg,source,{fresh=false}={}){
  if(!roomIds.includes(host))return false;
  const raw=msg?.createdAt,ms=Number(new Date(raw).getTime())||Number(raw)||0;
  if(!Number.isFinite(ms)||!ms)return false;
  latest.set(host,Math.max(ms,latest.get(host)||0));
  if(visibleRoom(host)){markSeen(host);return false;}
  if(ms<=(Number(seen[host])||0))return false;
  let entry=unread.get(host);if(!entry){entry={rt:new Set(),rest:new Set()};unread.set(host,entry);}
  const set=entry[source],key=newKey(msg,source);
  if(set.has(key))return false;
  if(set.size>=100)return false;
  set.add(key);
  if(fresh)announce(host);
  return true;
 }
 function playSound(){
  if(!prefs.sound)return;
  try{
   if(!previewAudio)previewAudio=new Audio('assets/glowme/mellow-glass.mp3');
   previewAudio.pause();previewAudio.currentTime=0;
   void previewAudio.play().catch(()=>{});
  }catch{}
 }
 function preview(){try{
  if(!previewAudio)previewAudio=new Audio('assets/glowme/mellow-glass.mp3');
  previewAudio.pause();previewAudio.currentTime=0;return previewAudio.play().catch(()=>{});
 }catch{return Promise.resolve();}}
 function announce(host){
  const now=Date.now();if(now-lastAlert<3500)return;lastAlert=now;
  playSound();
  if(!prefs.desktop||!('Notification' in window)||Notification.permission!=='granted')return;
  const room=rooms().find(r=>hostFor(r)===host);
  try{const title=room?.host?.nick||room?.chatRoomName||'Fromm Viewer';const notice=new Notification(title,{body:'새 메시지가 도착했어요.',tag:'fromm-viewer-'+host});
   notice.onclick=()=>{window.focus();const index=rooms().findIndex(r=>hostFor(r)===host);if(index>=0)$('#rooms')?.querySelectorAll('.room')[index]?.click();notice.close();};
  }catch{}
 }
 function stop(){
  session++;closePush?.();closePush=null;online=false;
  if(db&&library)void library.terminate(db).catch(()=>{});db=null;
  if(app&&library)void library.deleteApp(app).catch(()=>{});app=null;library=null;
  started=false;pollBusy=false;
 }
 function reset(next){
  stop();scope=next;unread.clear();latest.clear();seen={};roomIds=[];
  if(next){
   const stored=load(PREFIX+next,{});seen=stored&&typeof stored.seen==='object'&&stored.seen?stored.seen:{};
   const saved=load(PREF+next,{});prefs={sound:saved.sound===true,desktop:saved.desktop===true};
  }else prefs={sound:false,desktop:false};
  paint();window.dispatchEvent(new Event('fromm-unread-prefs'));
 }
 async function startPush(version){
  if(started||!roomIds.length||!window.FrommConversation?.loadFirebase)return;
  started=true;
  let remove=null,model=null,base=null,lib=null;
  try{
   lib=await window.FrommConversation.loadFirebase();if(version!==session||!authenticated())return;
   const payload=await frommApiRequest('/v2/auth/signin/firebase/secure/reader');
   if(version!==session||!authenticated())return;
   const token=payload?.data?.accessToken;if(typeof token!=='string')throw Error('No reader token');
   const claims=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
   const permitted=(claims.accessHostChatRoomIds||[]).map(String);
   const allowed=roomIds.filter(id=>permitted.includes(id)).slice(0,10);
   if(!allowed.length)throw Error('No authorized rooms');
   base=lib.initializeApp({apiKey:'AIzaSyDtg4wP4wu7L39eWpdVWV7QQNmfR-Gbcgc',projectId:'fromm-fan-361704',appId:'1:693404733592:android:f2add53f3fd5257d71c0ed'},'fromm-unread-'+crypto.randomUUID());
   const auth=lib.initializeAuth(base,{persistence:lib.inMemoryPersistence});
   await lib.signInWithCustomToken(auth,token);if(version!==session||!authenticated())return;
   model=lib.initializeFirestore(base,{experimentalAutoDetectLongPolling:true},'chat5');
   const q=lib.query(lib.collection(model,'messages'),lib.where('hostChatRoomId','in',allowed),lib.where('userType','in',['star','bot']));
   let first=true;
   remove=lib.onSnapshot(q,{includeMetadataChanges:true},snapshot=>{
    if(version!==session||snapshot.metadata.fromCache)return;
    online=true;
    let changes=false;
    for(const diff of snapshot.docChanges()){
     if(diff.type!=='added')continue;
     const msg=diff.doc.data()||{},host=String(msg.hostChatRoomId||'');
     if(!allowed.includes(host))continue;
     if(!msg.messageId)msg.messageId=diff.doc.id;
     if(msg.createdAt&&typeof msg.createdAt.toMillis==='function')msg.createdAt=msg.createdAt.toMillis();
     changes=record(host,msg,'rt',{fresh:!first})||changes;
    }
    first=false;if(changes)paint();
   },()=>{if(version===session){online=false;remove?.();remove=null;}});
   if(version!==session)return;
   closePush=()=>remove?.();library=lib;app=base;db=model;
  }catch{online=false;}
  finally{
   if(version!==session){remove?.();if(model&&lib)void lib.terminate(model).catch(()=>{});if(base&&lib)void lib.deleteApp(base).catch(()=>{});}
  }
 }
 async function poll(){
  if(pollBusy||!scope||!authenticated()||document.hidden||!roomIds.length)return;
  pollBusy=true;const version=session;
  try{
   for(const host of roomIds){
    if(version!==session||!authenticated())break;
    const start=Number(seen[host])||Date.now();
    if(start>=Date.now())continue;
    try{
     const response=await frommApiJson(FROMM_COMPAT.endpoints.messages(host),{
      findStartAt:new Date(Math.max(start-1000,Date.now()-30*86400000)).toISOString(),
      findEndAt:new Date().toISOString(),limit:'100'
     });
     if(version!==session)break;
     const rows=extractMessages(response);
     let changed=false;
     for(const msg of rows)if(isArtist(msg))changed=record(host,msg,'rest')||changed;
     if(changed)paint();
    }catch(error){if(error?.status===401||error?.status===403)break;if(error?.status===429)break;}
   }
  }finally{if(version===session)pollBusy=false;}
 }
 function sync(){
  const now=authenticated()?account():'';
  if(now!==scope)reset(now);
  if(!scope)return;
  const next=[...new Set(rooms().map(hostFor).filter(Boolean))];
  if(next.join('|')!==roomIds.join('|')){
   roomIds=next;
   let newRoom=false;
   for(const host of next)if(!Number.isFinite(Number(seen[host]))||!(Number(seen[host])>0)){seen[host]=Date.now();newRoom=true;}
   if(newRoom)store();
   stop();void startPush(session);void poll();
  }
  paint();
  const active=hostFor(state.room);
  if(active&&visibleRoom(active)&&count(active)>0)markSeen(active);
  if(!started&&roomIds.length)void startPush(session);
 }
 window.FrommUnread=Object.freeze({
  sync,markSeen,previewSound:preview,get prefs(){return {...prefs};},
  setPrefs,getCount:host=>count(host),get connected(){return online;}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();void poll();}});
 window.addEventListener('pageshow',sync);
 window.addEventListener('storage',event=>{if(!scope)return;if(event.key===PREFIX+scope||event.key===PREF+scope){const remembered=load(PREFIX+scope,{});if(remembered.seen)seen=remembered.seen;const saved=load(PREF+scope,{});prefs={sound:saved.sound===true,desktop:saved.desktop===true};unread.clear();paint();window.dispatchEvent(new Event('fromm-unread-prefs'));}});
 syncTimer=setInterval(sync,4000);
 pollTimer=setInterval(()=>{void poll();if(!online){stop();void startPush(session);}},180000);
 // A bfcache-restored page receives pageshow again; preserve the monitor timers.
 window.addEventListener('pagehide',stop);
 sync();
})();

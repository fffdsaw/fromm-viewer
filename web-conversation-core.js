/* Conversation persistence and bounded incremental reads. No credentials stored. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FrommConversationCore=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const messageKey=m=>String(m?.messageId||m?.id||'');
 const messageTime=m=>new Date(m?.createdAt).getTime()||0;
 const aborted=()=>new DOMException('대화 연결이 중단되었습니다.','AbortError');
 function createStore({indexedDB=globalThis.indexedDB,name='fromm-conversations-v1'}={}){
  let opening=null,queue=Promise.resolve();
  function open(){
   if(opening)return opening;
   opening=new Promise((resolve,reject)=>{
    if(!indexedDB){reject(new Error('이 브라우저는 대화 저장을 지원하지 않습니다.'));return;}
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>{
     const db=request.result,rows=db.createObjectStore('messages',{keyPath:'key'});
     rows.createIndex('scope','scope');db.createObjectStore('rooms',{keyPath:'scope'});
    };
    request.onerror=()=>{opening=null;reject(request.error);};
    request.onblocked=()=>{opening=null;reject(new Error('다른 창의 대화 저장소를 먼저 닫아주세요.'));};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
   });return opening;
  }
  const scope=(account,room)=>{if(!account||!room||account==='anonymous')throw new Error('대화 저장 계정을 확인하지 못했습니다.');return[String(account),String(room)];};
  function transact(db,stores,mode,run){return new Promise((resolve,reject)=>{
   const tx=db.transaction(stores,mode);let value;
   tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('대화를 저장하지 못했습니다.'));
   try{run(tx,v=>value=v);}catch(e){try{tx.abort();}catch{}reject(e);}
  });}
  return{
   async read(account,room){
    const key=scope(account,room),db=await open();
    return transact(db,['rooms','messages'],'readonly',(tx,set)=>{
     let meta,rows;const finish=()=>{if(meta!==undefined&&rows!==undefined){
      if(meta)set({meta,messages:rows.map(r=>r.message)});
      else if(rows.length)set({meta:{count:rows.length,complete:false,cursorEnd:null,recoveredPartial:true},messages:rows.map(r=>r.message)});
      else set(null);
     }};
     const a=tx.objectStore('rooms').get(key);a.onsuccess=()=>{meta=a.result||null;finish();};
     const b=tx.objectStore('messages').index('scope').getAll(key);b.onsuccess=()=>{rows=b.result;finish();};
    });
   },
   write(account,room,messages,metadata,{current=()=>true}={}){
    const key=scope(account,room),rows=messages.filter(m=>messageKey(m)&&!m.__conversationLocal).slice();
    const work=queue.catch(()=>{}).then(async()=>{
     if(!current())return false;const db=await open();
     // Separate small transactions yield to typing/scrolling and bound cloning.
     for(let offset=0;offset<rows.length;offset+=250){
      if(!current())return false;
      await transact(db,['messages'],'readwrite',tx=>{const store=tx.objectStore('messages');for(const message of rows.slice(offset,offset+250))store.put({key:[...key,messageKey(message)],scope:key,message});});
     }
     if(!current())return false;
     await transact(db,['rooms'],'readwrite',tx=>{
      const rooms=tx.objectStore('rooms'),existing=rooms.get(key);
      existing.onsuccess=()=>{
       // A stale/incomplete writer in another tab cannot downgrade a committed
       // complete snapshot. IndexedDB serializes this read-modify-write transaction.
       if(existing.result?.complete===true&&metadata?.complete!==true)return;
       rooms.put({...metadata,scope:key,savedAt:Date.now()});
      };
     });return true;
    });queue=work;return work;
   },
   clear(account){
    const work=queue.catch(()=>{}).then(async()=>{const db=await open();return transact(db,['messages','rooms'],'readwrite',tx=>{
     for(const name of ['messages','rooms']){const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{const cursor=r.result;if(cursor){if(cursor.value.scope[0]===account)cursor.delete();cursor.continue();}};}
    });});queue=work;return work;
   },
   clearRoom(account,room){
    const key=scope(account,room),work=queue.catch(()=>{}).then(async()=>{const db=await open();return transact(db,['messages','rooms'],'readwrite',tx=>{
     tx.objectStore('rooms').delete(key);const rows=tx.objectStore('messages'),cursor=rows.index('scope').openCursor(key);
     cursor.onsuccess=()=>{const entry=cursor.result;if(entry){entry.delete();entry.continue();}};
    });});queue=work;return work;
   },
   async close(){await queue.catch(()=>{});if(opening){const db=await opening;db.close();opening=null;}}
  };
 }
 function readRules(payload){
  if(payload?.success===false||payload?.ok===false)throw new Error('메시지 전송 규칙을 확인하지 못했습니다.');
  const room=payload?.data?.chatRoom,raw=room?.sendChatRules;
  const max=Number(raw?.chatMaxLength);
  if(!room||!Number.isInteger(max)||max<=0||max>10000)throw new Error('메시지 전송 규칙을 확인하지 못했습니다.');
  return{max,forbidden:Array.isArray(raw.forbiddenWords)?raw.forbiddenWords.filter(w=>typeof w==='string'&&w.trim()).map(w=>w.toLowerCase()):[],maxCount:Number(raw.maxSendChatCount)||0,intervalSeconds:Number(raw.chatCountInterval)||0};
 }
 function validateText(text,rules,{allowEmpty=false}={}){
  if(typeof text!=='string'||!text.trim()&&!allowEmpty)throw new Error('메시지를 입력해주세요.');
  if(!rules||text.length>rules.max)throw new Error(`메시지는 최대 ${rules?.max||0}자까지 보낼 수 있습니다.`);
  if(rules.forbidden.some(word=>text.toLowerCase().includes(word)))throw new Error('전송 제한 단어가 포함되어 있습니다.');
  return text.trim();
 }
 const emoticonId=value=>(typeof value==='string'||typeof value==='number')&&String(value).trim().length>0&&String(value).length<=128?String(value):'';
 function imageUrl(value){try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return'';}}
 function cleanEmoticon(value){
  if(!value||!emoticonId(value.id)||!emoticonId(value.packId))return null;
  const image=imageUrl(value.imageUrl)||imageUrl(value.thumbnailUrl);if(!image)return null;
  const apiId=value.apiId!==undefined&&emoticonId(value.apiId)===emoticonId(value.id)?value.apiId:value.id;
  return{id:emoticonId(value.id),apiId,packId:emoticonId(value.packId),imageUrl:image,thumbnailUrl:imageUrl(value.thumbnailUrl)||image,name:String(value.name||'이모티콘').slice(0,128)};
 }
 function readEmoticonPacks(payload){
  const packs=payload?.data?.emoticonPacks;
  if(payload?.success===false||payload?.ok===false||!Array.isArray(packs))throw new Error('이모티콘 목록을 확인하지 못했습니다.');
  return packs.filter(p=>emoticonId(p?.id)).map(p=>({id:emoticonId(p.id),name:String(p.titleNameOverseas?.ko||p.nameAdmin||'이모티콘').slice(0,128),imageUrl:imageUrl(p.tabIconUrl)||imageUrl(p.thumbnailUrl)}));
 }
 function readEmoticonItems(payload,packId){
  const items=payload?.data?.emoticonItems;
  if(payload?.success===false||payload?.ok===false||!Array.isArray(items))throw new Error('이모티콘을 확인하지 못했습니다.');
  return items.map(item=>cleanEmoticon({...item,packId,name:item?.name||item?.titleNameOverseas?.ko||'이모티콘'})).filter(Boolean);
 }
 function createFeed({requestPage,onMessages,onState=()=>{},onSynced=()=>{},latest=()=>0,current=()=>true,now=Date.now,interval=3000,limit=100}){
  let timer=null,owner=null,stopped=true,running=false,poked=false,window=null,failures=0,notBefore=0;
  const schedule=ms=>{clearTimeout(timer);if(!stopped&&current())timer=setTimeout(run,Math.max(ms,notBefore-now(),0));};
  async function run(){
   if(stopped||!current())return;
   if(running){poked=true;return;}
   if(now()<notBefore){schedule(notBefore-now());return;}
   running=true;poked=false;owner=new AbortController();const active=owner;
   const valid=()=>!stopped&&current()&&owner===active&&!active.signal.aborted;
   let timeout=setTimeout(()=>active.abort(),15000);
   try{
    if(!window){const end=now();window={end,cursor:end,start:Math.max(0,(latest()||end)-120000),watermark:latest()||0,boundary:new Set()};}
    onState('syncing');
    // A long offline gap is resumed over successive bounded turns, never skipped.
    for(let page=0;page<4;page++){
     const rows=await requestPage({start:window.start,end:window.cursor,limit,signal:active.signal});
     if(!valid())throw aborted();
     if(!Array.isArray(rows))throw new Error('대화 응답 형식을 확인하지 못했습니다.');
     await onMessages(rows);if(!valid())throw aborted();
     const oldest=rows.reduce((n,m)=>Math.min(n,messageTime(m)||Infinity),Infinity);
     const repeatedBoundary=rows.every(row=>window.boundary.has(messageKey(row)));
     if(!rows.length||oldest<=window.start||oldest<=window.watermark||(oldest===window.cursor&&rows.length<limit&&repeatedBoundary)){const end=window.end;window=null;await onSynced(end);break;}
     if(!Number.isFinite(oldest)||oldest>window.cursor){const error=new Error('새 대화 커서가 진행되지 않습니다.');error.code='CURSOR_STALLED';throw error;}
     // Inclusive overlap retains boundary messages; IDs remove duplicates.
     // A same-timestamp saturated page must not silently skip its boundary.
     if(oldest===window.cursor){const error=new Error('같은 시각의 대화가 많아 동기화를 중단했습니다. 새로고침해주세요.');error.code='CURSOR_STALLED';throw error;}
     window.boundary=new Set(rows.filter(row=>messageTime(row)===oldest).map(messageKey));
     window.cursor=oldest;
    }
    failures=0;onState('connected');
   }catch(error){
    if(stopped||!current())return;
    failures++;const status=Number(error.status)||0;
    if(error.code==='CURSOR_STALLED'){stopped=true;onState('error',error);return;}
    if([401,403,404,410].includes(status)){stopped=true;onState('denied',error);return;}
    const wait=status===429?Math.max(30000,error.retryAfterMs||0):Math.min(60000,3000*2**Math.min(failures,5));
    notBefore=now()+wait;onState('retry',error);
   }finally{
    clearTimeout(timeout);if(owner===active)owner=null;running=false;
    if(!stopped&&current())schedule(failures?notBefore-now():window?250:poked?0:(typeof interval==='function'?interval():interval));
   }
  }
  return{
   start(){if(!stopped)return;stopped=false;schedule(0);},
   poke(){if(stopped)return;poked=true;if(!running)schedule(80);},
   stop(){stopped=true;clearTimeout(timer);owner?.abort();owner=null;},
   get active(){return!stopped;},get busy(){return running;}
  };
 }
 return Object.freeze({createStore,createFeed,readRules,validateText,messageKey,messageTime,cleanEmoticon,readEmoticonPacks,readEmoticonItems});
});

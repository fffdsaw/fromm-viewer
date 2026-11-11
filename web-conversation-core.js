/* Conversation persistence and bounded incremental reads. No credentials stored. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FrommConversationCore=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const messageKey=m=>String(m?.messageId||m?.id||'');
 const messageTime=m=>new Date(m?.createdAt).getTime()||0;
 const stableValue=value=>Array.isArray(value)?`[${value.map(stableValue).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`:JSON.stringify(value);
 const sameMessage=(a,b)=>{try{return stableValue(a)===stableValue(b);}catch{return false;}};
 const candidateMessage=candidate=>candidate?.message||candidate;
 const MAX_CONFLICT_CANDIDATES_PER_MESSAGE=16;
 const MAX_CONFLICT_CANDIDATE_BYTES=16*1024*1024;
 const candidateBytes=message=>{try{return JSON.stringify(message).length*2;}catch{return Infinity;}};
 const aborted=()=>new DOMException('대화 연결이 중단되었습니다.','AbortError');
 function createStore({indexedDB=globalThis.indexedDB,name='fromm-conversations-v1'}={}){
  let opening=null,queue=Promise.resolve();
  function open(){
   if(opening)return opening;
   opening=new Promise((resolve,reject)=>{
    if(!indexedDB){reject(new Error('이 브라우저는 대화 저장을 지원하지 않습니다.'));return;}
    // Close v1 connections in other tabs before they can keep writing with the old upsert policy.
    const request=indexedDB.open(name,2);
    request.onupgradeneeded=()=>{
     const db=request.result;
     if(!db.objectStoreNames.contains('messages')){const rows=db.createObjectStore('messages',{keyPath:'key'});rows.createIndex('scope','scope');}
     if(!db.objectStoreNames.contains('rooms'))db.createObjectStore('rooms',{keyPath:'scope'});
    };
    request.onerror=()=>{opening=null;reject(request.error);};
    request.onblocked=()=>{opening=null;reject(new Error('다른 창의 대화 저장소를 먼저 닫아주세요.'));};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
   });return opening;
  }
  const scope=(account,room)=>{if(!account||!room||account==='anonymous')throw new Error('대화 저장 계정을 확인하지 못했습니다.');return[String(account),String(room)];};
  function transact(db,stores,mode,run){return new Promise((resolve,reject)=>{
   const tx=db.transaction(stores,mode);let value,failure;const set=v=>value=v;set.fail=error=>{failure=error;try{tx.abort();}catch{}};
   tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(failure||tx.error||new Error('대화를 저장하지 못했습니다.'));
   try{run(tx,set);}catch(e){try{tx.abort();}catch{}reject(e);}
  });}
  return{
   async read(account,room){
    const key=scope(account,room),db=await open();
    return transact(db,['rooms','messages'],'readonly',(tx,set)=>{
     let meta,rows;const finish=()=>{if(meta!==undefined&&rows!==undefined){
      const conflicts=rows.filter(r=>(Array.isArray(r.conflicts)&&r.conflicts.length>0)||r.conflictOverflow===true).map(r=>({messageId:messageKey(r.message),canonical:r.message,candidates:(r.conflicts||[]).map(candidateMessage),overflow:r.conflictOverflow===true}));
      const conflictCandidateCount=conflicts.reduce((count,conflict)=>count+conflict.candidates.length,0),conflictCandidateBytes=conflicts.reduce((total,conflict)=>total+conflict.candidates.reduce((sum,message)=>sum+candidateBytes(message),0),0),conflictOverflowCount=conflicts.filter(conflict=>conflict.overflow).length;
      if(meta)set({meta:{...meta,conflictCount:conflicts.length,conflictCandidateCount,conflictCandidateBytes,conflictOverflowCount},messages:rows.map(r=>r.message),conflicts});
      else if(rows.length)set({meta:{count:rows.length,complete:false,cursorEnd:null,recoveredPartial:true,conflictCount:conflicts.length,conflictCandidateCount,conflictCandidateBytes,conflictOverflowCount},messages:rows.map(r=>r.message),conflicts});
      else set(null);
     }};
     const a=tx.objectStore('rooms').get(key);a.onsuccess=()=>{meta=a.result||null;finish();};
     const b=tx.objectStore('messages').index('scope').getAll(key);b.onsuccess=()=>{rows=b.result;finish();};
    });
   },
   write(account,room,messages,metadata,{current=()=>true,conflictCandidates=[],onConflictStatus=()=>{}}={}){
    const key=scope(account,room),groups=new Map();
    const groupFor=(id,message)=>{let group=groups.get(id);if(!group){group={message,candidates:[],preferredCanonical:null,overflow:false};groups.set(id,group);}else if(!sameMessage(group.message,message))group.candidates.push(message);return group;};
    for(const message of messages){if(!messageKey(message)||message.__conversationLocal)continue;groupFor(messageKey(message),message);}
    for(const conflict of conflictCandidates){
     const id=String(conflict?.messageId||messageKey(conflict?.canonical)||'');if(!id)continue;
     const canonical=conflict?.canonical,group=groups.get(id)||{message:canonical||conflict.candidates?.[0],candidates:[],preferredCanonical:canonical||null,overflow:false};groups.set(id,group);
     group.overflow=group.overflow||conflict?.overflow===true;
     if(canonical){group.preferredCanonical=canonical;if(!sameMessage(group.message,canonical))group.candidates.push(group.message);group.message=canonical;}
     for(const candidate of conflict?.candidates||[])if(candidate)group.candidates.push(candidate);
    }
    const rows=[...groups.entries()].map(([id,group])=>({id,...group}));
    const work=queue.catch(()=>{}).then(async()=>{
     if(!current())return false;const db=await open();
     const conflictIds=new Set(),overflowIds=new Set();
     // Separate small transactions yield to typing/scrolling and bound cloning.
     for(let offset=0;offset<rows.length;offset+=250){
      if(!current())return false;
      const batch=rows.slice(offset,offset+250);
      const result=await transact(db,['rooms','messages'],'readwrite',(tx,set)=>{
       const rooms=tx.objectStore('rooms'),store=tx.objectStore('messages'),roomRequest=rooms.get(key);
       const put=(objectStore,value)=>{try{objectStore.put(value);return true;}catch(error){set.fail(error);return false;}};
       roomRequest.onsuccess=()=>{
        const roomMeta=roomRequest.result||null;let pending=batch.length,newConflicts=0,newOverflows=0,statsChanged=false,candidateCount=Number(roomMeta?.conflictCandidateCount??metadata?.conflictCandidateCount)||0,candidateByteCount=Number(roomMeta?.conflictCandidateBytes??metadata?.conflictCandidateBytes)||0;
        const finish=()=>{
         if(pending)return;
         if(newConflicts||newOverflows||statsChanged){
          const conflictCount=Math.max(0,(Number(roomMeta?.conflictCount)||0)+newConflicts),conflictOverflowCount=Math.max(0,(Number(roomMeta?.conflictOverflowCount)||0)+newOverflows);
          try{rooms.put({...roomMeta,scope:key,conflictCount,conflictOverflowCount,conflictCandidateCount:candidateCount,conflictCandidateBytes:candidateByteCount});}catch(error){set.fail(error);return;}
         }
         set({conflictIds:[...conflictIds],overflowIds:[...overflowIds],conflictCandidateCount:candidateCount,conflictCandidateBytes:candidateByteCount});
        };
        if(!pending)return;
        for(const item of batch){
         const {id,preferredCanonical}=item,rowKey=[...key,id],request=store.get(rowKey);
         request.onsuccess=()=>{
          const existing=request.result,canonical=existing?.message||preferredCanonical||item.message,priorCandidates=(existing?.conflicts||[]).map(candidateMessage),candidates=priorCandidates.slice(),candidateValues=[item.message,...item.candidates],hadOverflow=existing?.conflictOverflow===true,hadConflict=priorCandidates.length>0||hadOverflow;let overflow=hadOverflow||item.overflow===true,changed=!existing||item.overflow===true&&!hadOverflow,addedConflict=item.overflow===true&&!hadConflict;
          if(item.overflow)overflowIds.add(id);
          for(const message of candidateValues){
           if(!message||sameMessage(canonical,message)||candidates.some(candidate=>sameMessage(candidate,message)))continue;
           const size=candidateBytes(message);
           if(candidates.length>=MAX_CONFLICT_CANDIDATES_PER_MESSAGE||candidateByteCount+size>MAX_CONFLICT_CANDIDATE_BYTES){
            overflow=true;addedConflict=true;overflowIds.add(id);
            changed=true;continue;
           }
           candidates.push(message);candidateCount++;candidateByteCount+=size;statsChanged=true;conflictIds.add(id);addedConflict=true;changed=true;
          }
          if(changed){
           if(overflow&&!hadOverflow)newOverflows++;
           if(!hadConflict&&addedConflict)newConflicts++;
           const next={key:rowKey,scope:key,message:canonical,conflicts:candidates.map(message=>({message})),...(overflow?{conflictOverflow:true}:{})};
           if(put(store,next)){
            if(addedConflict)conflictIds.add(id);
           }
          }
          pending--;finish();
         };
        }
       };
      });
      for(const id of result?.conflictIds||[])conflictIds.add(id);
      for(const id of result?.overflowIds||[])overflowIds.add(id);
     }
     if(!current())return false;
     await transact(db,['rooms'],'readwrite',tx=>{
      const rooms=tx.objectStore('rooms'),existing=rooms.get(key);
      existing.onsuccess=()=>{
       // A stale/incomplete writer in another tab cannot downgrade a committed
       // complete snapshot. The row transactions above use the same IndexedDB
       // transaction ordering and preserve conflicting values independently.
       const prior=existing.result||null,conflictCount=Number(prior?.conflictCount)||0,conflictOverflowCount=Number(prior?.conflictOverflowCount)||0;
       if(prior?.complete===true&&metadata?.complete!==true)return;
       // A first complete snapshot with unresolved same-ID variants cannot claim
       // full integrity. Keep it recoverable, but do not call it complete.
       if(metadata?.complete===true&&conflictCount>0){
        if(prior?.complete===true)return;
        try{rooms.put({...metadata,complete:false,conflictCount,conflictOverflowCount,conflictCandidateCount:Number(prior?.conflictCandidateCount??metadata?.conflictCandidateCount)||0,conflictCandidateBytes:Number(prior?.conflictCandidateBytes??metadata?.conflictCandidateBytes)||0,scope:key,savedAt:Date.now()});}catch(error){set.fail(error);}return;
       }
       try{rooms.put({...metadata,conflictCount,conflictOverflowCount,conflictCandidateCount:Number(prior?.conflictCandidateCount??metadata?.conflictCandidateCount)||0,conflictCandidateBytes:Number(prior?.conflictCandidateBytes??metadata?.conflictCandidateBytes)||0,scope:key,savedAt:Date.now()});}catch(error){set.fail(error);}
      };
     });
     const finalMeta=await transact(db,['rooms'],'readonly',(tx,set)=>{const request=tx.objectStore('rooms').get(key);request.onsuccess=()=>set(request.result||null);});
     try{onConflictStatus({conflictIds:[...conflictIds],overflowIds:[...overflowIds],conflictCount:Number(finalMeta?.conflictCount)||0,conflictOverflowCount:Number(finalMeta?.conflictOverflowCount)||0,conflictCandidateCount:Number(finalMeta?.conflictCandidateCount)||0,conflictCandidateBytes:Number(finalMeta?.conflictCandidateBytes)||0});}catch{}
     return true;
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
 return Object.freeze({createStore,createFeed,readRules,validateText,messageKey,messageTime,sameMessage,conflictCandidateBytes:candidateBytes,conflictCandidateLimits:Object.freeze({perMessage:MAX_CONFLICT_CANDIDATES_PER_MESSAGE,bytes:MAX_CONFLICT_CANDIDATE_BYTES}),cleanEmoticon,readEmoticonPacks,readEmoticonItems});
});

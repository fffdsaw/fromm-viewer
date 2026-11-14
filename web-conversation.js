/* Authenticated conversation UI. Protocol fields verified against supplied Fromm Chat. */
(()=>{
 'use strict';
 const core=window.FrommConversationCore;
 if(!core)return;
 const store=core.createStore(),memories=new Map();
 const memoryKey=c=>JSON.stringify([c.accountEmail||c.token,c.uuid,c.host]);
 function cleanPending(value){
  if(!value||typeof value.code!=='string'||value.code.length>128||typeof value.content!=='string'||value.content.length>10000)return null;
  const emoticon=core.cleanEmoticon(value.emoticon);
  return{code:value.code,content:value.content,createdAt:value.createdAt,...(emoticon?{emoticon,emoticonItemId:emoticon.id}:{})};
 }
 let mounted=false,context=null,dock,input,status,send,count,storage,newButton,dialog,emoteButton,emotePanel,emotePreview,restoreJob=null;
 let emoteVersion=0,emoteRequest=null;
 // Standard Unicode emoji remain plain message text, never a Fromm sticker payload.
 const STANDARD_EMOJI=['❤️','🩷','🧡','💛','💚','🩵','💙','💜','🤍','🖤','💕','💞','💖','💗','💘','💝','🥹','😂','🤣','😊','😍','🥰','😘','😭','😢','😆','😁','😄','😃','🙂','😉','😎','🤔','🥺','😳','😱','😴','😮','🤩','😋','😇','🙃','😌','🤗','🫶','🫳','👍','👏','🙌','🙏','💪','👀','🔥','✨','⭐','🌟','🎉','🎊','🎂','🍮','💐','🌸','🌷','🌹','🍀','🌈','☀️'];
 let saveTimer=0,layoutFrame=0,saving=Promise.resolve(),pendingCount=0,resumeIdentityPending=false,latestHideTimer=0,latestEnterTimer=0;
 const sdk=()=>import('./vendor/firebase/conversation-10.12.2.js');
 const newest=messages=>messages.reduce((time,message)=>Math.max(time,core.messageTime(message)),0);
 const storageKey=account=>'fromm.conversation.storage:'+account;
 const lastRoomKey=account=>'fromm.conversation.lastRoom:'+account;
 const cacheNamespace=()=>currentAuth().accountKey?currentAccountScope():(currentReplyUserId()?'user:'+currentReplyUserId():'');
 const epochKey=(account,room)=>'fromm.conversation.epoch:'+JSON.stringify([account,room]);
 function epoch(account,room){try{return localStorage.getItem(epochKey(account,room))||'';}catch{return'';}}
 function storageEnabled(account){try{return localStorage.getItem(storageKey(account))!=='off';}catch{return true;}}
 function requestOwner(c,ms=15000){
  const owner=new AbortController(),parent=c.owner,cancel=()=>owner.abort();
  if(parent.signal.aborted)cancel();else parent.signal.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,ms);
  return{signal:owner.signal,parent,abort(){owner.abort();},close(){clearTimeout(timer);parent.signal.removeEventListener('abort',cancel);}};
 }
 const authCurrent=c=>{const a=currentAuth();return!!c&&!!a.token&&c.token===a.token&&c.uuid===a.uuid&&c.account===currentAccountScope();};
 const roomCurrent=c=>authCurrent(c)&&context===c&&c.host===String(state.room?.hostChatRoomId||'')&&c.roomId===String(state.room?.id||'')&&c.generation===state.scanGeneration;
 const viewing=c=>roomCurrent(c)&&state.filter==='all'&&!document.hidden&&!document.querySelector('#loginGate:not(.hidden)');
 function viewPosition(c){
  if(state.filter==='all'&&!state.chatAutoTopPending){const row=[...document.querySelectorAll('#timeline .msg')].find(el=>el.getBoundingClientRect().bottom>chatHeaderInset()+8);
   if(row)c.lastView={id:row.dataset.messageId,offset:row.getBoundingClientRect().top,latest:atLatest()};
  }return c.lastView||null;
 }
 const copyMeta=c=>({count:state.messages.length,complete:!!state.chatHistoryComplete,cursorEnd:state.cursorEnd?.toISOString?.()||null,pageRequestLimit:state.pageRequestLimit,observedPageLimit:state.historyObservedPageLimit||0,
  conflictCandidateCount:c.conflictCandidateCount||0,conflictCandidateBytes:c.conflictCandidateBytes||0,
  syncedUntil:c.syncedUntil||0,draft:c.draft||'',emoticonDraft:c.selectedEmoticon||null,outbox:c.outbox||null,accepted:c.accepted||[],view:viewPosition(c)});
 function rememberConflict(c,id,canonical,candidates=[],{pending=false,overflow=false}={}){
  id=String(id||'');if(!id)return false;
  const previous=c.conflicts.get(id),base=previous?.canonical||canonical||null,values=[...(previous?.candidates||[])];let changed=false,overflowed=!!(previous?.overflow||overflow),added=[];
  for(const candidate of candidates){
   if(!candidate||base&&core.sameMessage(base,candidate)||values.some(value=>core.sameMessage(value,candidate)))continue;
   const bytes=core.conflictCandidateBytes(candidate),overLimit=values.length>=core.conflictCandidateLimits.perMessage||c.conflictCandidateBytes+c.pendingConflictCandidateBytes+c.volatileConflictCandidateBytes+bytes>core.conflictCandidateLimits.bytes;
   if(overLimit){overflowed=true;c.conflictOverflowIds.add(id);changed=true;continue;}
   values.push(candidate);added.push(candidate);c.pendingConflictCandidateBytes+=bytes;changed=true;
  }
  c.conflicts.set(id,{messageId:id,canonical:base,candidates:values,overflow:overflowed});
  if(pending&&(added.length||overflowed&&!previous?.overflow)){
   const pendingValue=c.pendingConflictCandidates.get(id)||{messageId:id,canonical:base,candidates:[],overflow:false};
   for(const candidate of added)if(!pendingValue.candidates.some(value=>core.sameMessage(value,candidate)))pendingValue.candidates.push(candidate);
   pendingValue.overflow=pendingValue.overflow||overflowed;c.pendingConflictCandidates.set(id,pendingValue);
  }
  return changed;
 }
 function showLatest(c){
  if(!viewing(c))return;
  c.restoreView=null;pendingCount=0;window.FrommViewState?.cancel();state.chatAutoTopPending=false;
  const list=filteredMessages();
  if(list.length&&state.infiniteRendered<list.length)renderChatWindow(list,list.length-1);
  if(window.FrommViewState?.settleLatest)FrommViewState.settleLatest(()=>viewing(c));
  else requestAnimationFrame(()=>{if(viewing(c))scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});});
 }
 function updateLatestButton(){
  if(!newButton)return;
  const c=context,list=state.infiniteList||[],away=roomCurrent(c)&&state.filter==='all'&&list.length>0&&(state.infiniteRendered<list.length||document.documentElement.scrollHeight-scrollY-innerHeight>100);
  if(!away&&roomCurrent(c)&&state.filter==='all'&&!state.chatAutoTopPending)pendingCount=0;
  const show=away&&!(emotePanel&&!emotePanel.hidden);
  if(show){
   clearTimeout(latestHideTimer);latestHideTimer=0;
   const entering=newButton.hidden||newButton.classList.contains('conversation-latest-leaving');
   if(entering){
    newButton.hidden=false;newButton.classList.remove('conversation-latest-leaving');newButton.classList.add('conversation-latest-entering');
    clearTimeout(latestEnterTimer);latestEnterTimer=setTimeout(()=>{latestEnterTimer=0;newButton?.classList.remove('conversation-latest-entering');},540);
   }
  }else if(!newButton.hidden&&!latestHideTimer){
   newButton.classList.remove('conversation-latest-entering');newButton.classList.add('conversation-latest-leaving');
   clearTimeout(latestEnterTimer);latestEnterTimer=0;
   latestHideTimer=setTimeout(()=>{latestHideTimer=0;if(newButton){newButton.hidden=true;newButton.classList.remove('conversation-latest-leaving');}},180);
  }
  const badge=newButton.querySelector('span');badge.hidden=!pendingCount;badge.textContent=pendingCount>99?'99+':String(pendingCount);
  newButton.setAttribute('aria-label',pendingCount?`새 메시지 ${pendingCount}개 · 최신 대화로 이동`:'최신 대화로 이동');
 }
 function layout(){
  cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{
   if(!dock||dock.hidden)return;
   const rect=document.querySelector('#timeline').getBoundingClientRect(),viewport=window.visualViewport;
   document.body.style.setProperty('--conversation-column-width',rect.width+'px');
   dock.style.width=rect.width+'px';dock.style.right='auto';
   dock.style.setProperty('--conversation-left',Math.max(6,rect.left)+'px');
   dock.style.setProperty('--conversation-keyboard',Math.max(0,viewport?innerHeight-viewport.height-viewport.offsetTop:0)+'px');
   const inputRect=input.getBoundingClientRect(),dockRect=dock.getBoundingClientRect();
   document.body.style.setProperty('--conversation-actions-width',Math.max(0,rect.right-inputRect.right)+'px');
   const height=dockRect.height,previous=parseFloat(document.body.style.getPropertyValue('--conversation-height')),position=scrollY,follow=atLatest();
   const anchor=!follow&&state.filter==='all'?[...document.querySelectorAll('#timeline .msg')].find(el=>el.getBoundingClientRect().bottom>chatHeaderInset()+8):null;
   const anchorTop=anchor?.getBoundingClientRect().top;
   document.body.style.setProperty('--conversation-height',height+'px');
   // Preserve the reading row if dock/status growth causes browser-specific
   // scroll anchoring while the page's bottom inset changes.
   if(anchor?.isConnected&&Number.isFinite(anchorTop)){
    const delta=anchor.getBoundingClientRect().top-anchorTop;
    if(Math.abs(delta)>.5)scrollBy({top:delta,behavior:'instant'});
   }
   // Preserve the gap to the newest message when the reader was following it.
   // An absolute target also avoids double scrolling after the browser clamps a shrink.
   if(follow&&previous>0&&Math.abs(height-previous)>.5)scrollTo({top:Math.max(0,position+height-previous),behavior:'instant'});
   updateLatestButton();
  });
 }
 function resizeInput(){
  if(!input||dock.hidden)return;
  input.style.height='34px';input.style.height=Math.min(104,Math.max(34,input.scrollHeight+2))+'px';
 }
 function clearSentEmoticon(c,item){
  if(item&&c.selectedEmoticon?.id===item.id&&c.selectedEmoticon?.packId===item.packId)c.selectedEmoticon=null;
 }
 function closeEmoticons(focus=false){
  emoteVersion++;emoteRequest?.abort();emoteRequest?.close();emoteRequest=null;
  const open=emotePanel&&!emotePanel.hidden;if(emotePanel)emotePanel.hidden=true;
  emoteButton?.setAttribute('aria-expanded','false');updateLatestButton();if(open&&focus)emoteButton.focus({preventScroll:true});
 }
 async function verifyEmoticon(c,choice){
  const owner=requestOwner(c);
  try{
   const packs=core.readEmoticonPacks(await frommApiRequest(`/v2/chat/emoticons/${encodeURIComponent(c.host)}`,{signal:owner.signal}));
   if(!roomCurrent(c)||owner.signal.aborted)throw new DOMException('대화방이 바뀌었습니다.','AbortError');
   if(!packs.some(pack=>pack.id===choice.packId))throw Object.assign(new Error('이 대화방에서 사용할 수 없는 이모티콘입니다. 다시 골라주세요.'),{code:'EMOTICON_UNAVAILABLE'});
   const items=core.readEmoticonItems(await frommApiRequest(`/v2/chat/emoticons/${encodeURIComponent(c.host)}/emoticon/${encodeURIComponent(choice.packId)}`,{signal:owner.signal}),choice.packId);
   if(!roomCurrent(c)||owner.signal.aborted)throw new DOMException('대화방이 바뀌었습니다.','AbortError');
   const item=items.find(item=>item.id===choice.id);if(!item)throw Object.assign(new Error('사용할 수 없는 이모티콘입니다. 다시 골라주세요.'),{code:'EMOTICON_UNAVAILABLE'});
   c.emoteItems.set(item.id,item);return item;
  }finally{owner.close();}
 }
 function showStandardEmoji(c){
  if(!viewing(c)||emotePanel.hidden)return;
  emoteVersion++;emoteRequest?.abort();emoteRequest?.close();emoteRequest=null;
  const packsBox=emotePanel.querySelector('#conversationEmoticonPacks'),itemsBox=emotePanel.querySelector('#conversationEmoticonItems');
  for(const button of packsBox.children)button.setAttribute('aria-pressed',String(button.dataset.emojiTab==='standard'));
  itemsBox.classList.add('conversation-standard-emoji');itemsBox.replaceChildren();
  emotePanel.querySelector('#conversationEmoticonStatus').hidden=true;
  emotePanel.querySelector('#conversationEmoticonRetry').hidden=true;
  // Picker buttons take focus away from the textarea. Remember the insertion
  // point explicitly so repeated taps append in order, including on mobile.
  const insertion={start:input.selectionStart,end:input.selectionEnd};
  for(const emoji of STANDARD_EMOJI){
   const button=document.createElement('button');button.type='button';button.textContent=emoji;button.title=emoji;
   button.setAttribute('aria-label',emoji);button.dataset.unicodeEmoji=emoji;
   button.onclick=()=>{
    if(!viewing(c)||c.sending||c.denied||input.disabled)return;
    const start=Math.min(insertion.start,input.value.length),end=Math.min(insertion.end,input.value.length),max=c.rules?.max||450;
    if(input.value.length-(end-start)+emoji.length>max){c.notice='메시지 최대 길이를 초과했습니다.';paint();return;}
    input.setRangeText(emoji,start,end,'end');
    insertion.start=insertion.end=start+emoji.length;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    // Unicode emoji are plain text: keep this panel open for consecutive picks.
    // Do not refocus the textarea after each tap (which opens the mobile keyboard).
    // Fromm sticker selection still closes its picker independently.
   };
   itemsBox.append(button);
  }
 }
 function appendStandardEmojiTab(c,packsBox){
  const button=document.createElement('button');button.type='button';button.className='conversation-emoji-tab';
  button.dataset.emojiTab='standard';button.textContent='😊';button.title='일반 이모지';
  button.setAttribute('aria-label','일반 이모지');button.setAttribute('aria-pressed','false');
  button.onclick=()=>showStandardEmoji(c);packsBox.append(button);return button;
 }
 async function loadEmoticons(c,pack=null){
  if(!viewing(c)||emotePanel.hidden)return;
  emoteRequest?.abort();emoteRequest?.close();const owner=requestOwner(c),version=++emoteVersion;emoteRequest=owner;
  const valid=()=>viewing(c)&&!emotePanel.hidden&&version===emoteVersion&&!owner.signal.aborted;
  const message=emotePanel.querySelector('#conversationEmoticonStatus'),retry=emotePanel.querySelector('#conversationEmoticonRetry');
  const packsBox=emotePanel.querySelector('#conversationEmoticonPacks'),itemsBox=emotePanel.querySelector('#conversationEmoticonItems');
  message.textContent='이모티콘 불러오는 중…';message.hidden=false;retry.hidden=true;itemsBox.classList.remove('conversation-standard-emoji');itemsBox.replaceChildren();
  try{
   if(!pack){
    packsBox.replaceChildren();
    const emojiTab=appendStandardEmojiTab(c,packsBox);
    const packs=core.readEmoticonPacks(await frommApiRequest(`/v2/chat/emoticons/${encodeURIComponent(c.host)}`,{signal:owner.signal}));if(!valid())return;
    c.emotePacks=packs;
    for(const entry of packs){
     const button=document.createElement('button');button.type='button';button.title=entry.name;button.setAttribute('aria-label',entry.name);button.dataset.pack=entry.id;
     if(entry.imageUrl){const image=document.createElement('img');image.src=entry.imageUrl;image.alt='';button.append(image);}else button.textContent=entry.name.slice(0,2);
     button.onclick=()=>void loadEmoticons(c,entry);packsBox.insertBefore(button,emojiTab);
    }
    pack=packs.find(entry=>entry.id===c.selectedEmoticon?.packId)||packs[0];
   }
   c.emotePack=pack||null;
   if(!pack){message.textContent='사용할 수 있는 이모티콘이 없습니다.';return;}
   for(const button of packsBox.children)button.setAttribute('aria-pressed',String(button.dataset.pack===pack.id));
   const items=core.readEmoticonItems(await frommApiRequest(`/v2/chat/emoticons/${encodeURIComponent(c.host)}/emoticon/${encodeURIComponent(pack.id)}`,{signal:owner.signal}),pack.id);if(!valid())return;
   for(const [index,item] of items.entries()){
    c.emoteItems.set(item.id,item);const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`${item.name} ${index+1}`);button.title=item.name;button.dataset.emoticon=item.id;
    const image=document.createElement('img');image.src=item.thumbnailUrl;image.alt='';image.loading='lazy';button.append(image);
    button.onclick=()=>{if(!viewing(c)||c.sending)return;c.selectedEmoticon=item;closeEmoticons();input.focus({preventScroll:true});saveSoon();paint();};itemsBox.append(button);
   }
   message.textContent=items.length?'':'이 팩에 이모티콘이 없습니다.';message.hidden=items.length>0;
  }catch(error){if(viewing(c)&&!emotePanel.hidden&&version===emoteVersion){message.textContent=[401,403].includes(error.status)?'이모티콘 이용 권한을 확인해주세요.':'이모티콘을 불러오지 못했습니다.';retry.hidden=[401,403].includes(error.status);}}
  finally{owner.close();if(emoteRequest===owner)emoteRequest=null;}
 }
 function mountEmoticons(){
  emoteButton=dock.querySelector('#conversationEmoticonButton');emotePanel=dock.querySelector('#conversationEmoticons');emotePreview=dock.querySelector('#conversationEmoticonPreview');
  emoteButton.onclick=()=>{const c=context;if(!viewing(c)||c.sending||c.denied)return;if(!emotePanel.hidden){closeEmoticons(true);return;}emotePanel.hidden=false;updateLatestButton();emoteButton.setAttribute('aria-expanded','true');emotePanel.querySelector('#conversationEmoticonClose').focus({preventScroll:true});void loadEmoticons(c);};
  emotePanel.querySelector('#conversationEmoticonClose').onclick=()=>closeEmoticons(true);
  emotePanel.querySelector('#conversationEmoticonRetry').onclick=()=>void loadEmoticons(context);
  emotePreview.querySelector('button').onclick=()=>{if(!roomCurrent(context)||context.sending)return;context.selectedEmoticon=null;saveSoon();paint();input.focus({preventScroll:true});};
  document.addEventListener('pointerdown',event=>{if(emotePanel&&!emotePanel.hidden&&!emotePanel.contains(event.target)&&!emoteButton.contains(event.target))closeEmoticons();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&emotePanel&&!emotePanel.hidden){event.preventDefault();event.stopImmediatePropagation();closeEmoticons(true);}},true);
 }
 function paint(){
  if(!dock)return;
  const c=context,show=roomCurrent(c)&&state.filter==='all'&&document.querySelector('#loginGate')?.classList.contains('hidden');
  dock.hidden=!show;document.body.classList.toggle('conversation-open',show);
  if(!show){closeEmoticons();document.querySelector('#conversationPending')?.remove();if(dialog?.open)dialog.close();return;}
  const labels={retry:'연결 재시도 중…',denied:'로그인·구독 권한을 확인해주세요.'};
  const conflictText=c.conflicts.size?`메시지 내용 충돌 ${c.conflicts.size}건 · 최신 여부 미확인`:'';
  const overflowText=c.conflictOverflowIds.size?'일부 후보는 저장 한도에 도달해 보존되지 않았습니다.':'';
  const statusText=[c.notice||labels[c.phase]||'',conflictText,overflowText].filter(Boolean).join(' · ');if(status.textContent!==statusText)status.textContent=statusText;
  status.hidden=!statusText;
  const max=c.rules?.max||450;count.textContent=`${input.value.length} / ${max}`;input.maxLength=max;
  resizeInput();input.disabled=c.denied;send.disabled=!!(c.sending||c.denied||!c.rules||!input.value.trim()&&!c.selectedEmoticon||input.value.length>max||c.outbox||c.accepted.length>=20||Date.now()<c.sendNotBefore);
  send.textContent='전송';send.setAttribute('aria-busy',String(!!c.sending));
  storage.title=c.storageError?'대화 저장 설정 · 저장 공간을 확인해주세요.':'대화 저장 설정';storage.classList.toggle('storage-error',!!c.storageError);
  emoteButton.disabled=!!(c.sending||c.denied);emotePreview.hidden=!c.selectedEmoticon||!!c.outbox;
  if(c.selectedEmoticon){const image=emotePreview.querySelector('img');if(image.getAttribute('src')!==c.selectedEmoticon.imageUrl)image.src=c.selectedEmoticon.imageUrl;}
  emotePreview.querySelector('button').disabled=!!c.sending;
  dock.querySelector('#conversationRetry').hidden=!!c.ruleJob||c.denied||!!c.rules&&!['error','retry'].includes(c.phase);
  const resolve=dock.querySelector('#conversationResolve');resolve.hidden=!c.outbox?.uncertain||c.sending;
  let pending=document.querySelector('#conversationPending');
  if(c.outbox||c.accepted.length){
   if(!pending){pending=document.createElement('div');pending.id='conversationPending';pending.className='conversation-pending';pending.setAttribute('role','status');document.querySelector('#timeline').after(pending);}
   const messages=[...c.accepted,...(c.outbox?[c.outbox]:[])],signature=JSON.stringify(messages.map(message=>[message.content||'',message.emoticon?.imageUrl||'',message===c.outbox?(c.sending?'메시지 전송 중':'전송 결과 확인 중'):'서버 접수 완료']));
   if(pending.dataset.signature!==signature){
    pending.dataset.signature=signature;pending.replaceChildren(...JSON.parse(signature).map(([content,imageUrl,label])=>{
     const bubble=document.createElement('div');bubble.className='conversation-pending-bubble';bubble.setAttribute('aria-label',label);
     if(imageUrl){const image=document.createElement('img');image.className='emoticon-img';image.width=160;image.height=160;image.src=imageUrl;image.alt='이모티콘';bubble.append(image);}
     if(content||!imageUrl){const text=document.createElement('div');text.className='text';text.textContent=content||'이모티콘';bubble.append(text);}return bubble;
    }));
   }
  }else pending?.remove();
  dock.querySelector('.conversation-meta').hidden=!statusText&&dock.querySelector('#conversationRetry').hidden&&resolve.hidden;
  updateLatestButton();
  layout();
 }
 function persist({force=false,metadataOnly=false}={}){
  const c=context;if(!roomCurrent(c)||!c.storageAccount||!c.enabled||c.cacheEpoch!==epoch(c.storageAccount,c.host)||c.restoring||c.storageError&&!force)return Promise.resolve(false);
  const rows=metadataOnly?[]:state.messages.filter(m=>core.messageKey(m)&&c.persisted.get(core.messageKey(m))!==m);
  const conflictCandidates=metadataOnly?[]:[...c.pendingConflictCandidates.values()];
  const meta=copyMeta(c);c.saving=true;paint();
  saving=store.write(c.storageAccount,c.host,rows,meta,{current:()=>authCurrent(c)&&c.enabled&&storageEnabled(c.storageAccount)&&c.cacheEpoch===epoch(c.storageAccount,c.host),conflictCandidates,onConflictStatus:result=>{
   if(!roomCurrent(c))return;c.conflictCandidateCount=result.conflictCandidateCount;c.conflictCandidateBytes=result.conflictCandidateBytes;
   for(const id of result.conflictIds)if(!c.conflicts.has(id)){const canonical=c.persisted.get(id)||state.messages.find(message=>core.messageKey(message)===id)||null;rememberConflict(c,id,canonical,[]);}
   for(const id of result.overflowIds){c.conflictOverflowIds.add(id);const conflict=c.conflicts.get(id);if(conflict)conflict.overflow=true;}
   paint();
  }}).then(ok=>{
   if(ok){
    for(const m of rows)c.persisted.set(core.messageKey(m),m);
    for(const conflict of conflictCandidates){
     const bytes=conflict.candidates.reduce((sum,message)=>sum+core.conflictCandidateBytes(message),0);
     c.pendingConflictCandidateBytes=Math.max(0,c.pendingConflictCandidateBytes-bytes);
     if(c.conflictOverflowIds.has(conflict.messageId))c.volatileConflictCandidateBytes+=bytes;
     c.pendingConflictCandidates.delete(conflict.messageId);
    }
    c.saved=true;c.storageError=false;
   }
   return ok;
  }).catch(error=>{c.storageError=true;c.notice=error?.name==='QuotaExceededError'?'저장 공간이 부족해 대화 충돌 내용을 저장하지 못했습니다. 기존 캐시는 보존했습니다.':'대화 캐시 저장에 실패했습니다. 기존 캐시는 보존했습니다.';return false;}).finally(()=>{c.saving=false;if(roomCurrent(c))paint();});return saving;
 }
 function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),450);}
 function stop(c=context,{includeRefresh=true}={}){
  if(!c)return;if(includeRefresh)c.finishRefresh?.(false);if(c===context)closeEmoticons();c.pushVersion=(c.pushVersion||0)+1;c.pushBusy=0;c.feed?.stop();c.feed=null;c.owner.abort();
  c.pushClose?.();c.pushClose=null;c.pushOnline=false;clearTimeout(c.pushRetry);c.pushRetry=0;
 }
 function beforeRoom(room,{restore=true,restoreViewOnEntry=true}={}){
  const previous=context,carry=roomCurrent(previous)&&String(room?.hostChatRoomId)===previous.host?{draft:input?.value||'',selectedEmoticon:previous.selectedEmoticon,outbox:previous.outbox,accepted:previous.accepted}:null;
  if(context&&roomCurrent(context)){context.draft=input?.value||'';memories.delete(memoryKey(context));memories.set(memoryKey(context),{draft:context.draft,selectedEmoticon:context.selectedEmoticon,outbox:context.outbox,accepted:context.accepted.slice(),lastView:viewPosition(context),sendNotBefore:context.sendNotBefore,readNotBefore:context.readNotBefore});if(memories.size>120)memories.delete(memories.keys().next().value);void persist();}
  stop();clearTimeout(saveTimer);pendingCount=0;if(input)input.value='';document.querySelector('#conversationPending')?.remove();
  const auth=currentAuth(),host=String(room?.hostChatRoomId||'');
  if(!host||!auth.token||!auth.uuid){context=null;restoreJob=null;paint();return;}
  const c={account:currentAccountScope(),accountEmail:auth.accountKey,host,roomId:String(room.id||''),generation:state.scanGeneration+1,token:auth.token,uuid:auth.uuid,
   owner:new AbortController(),persisted:new Map(),conflicts:new Map(),pendingConflictCandidates:new Map(),conflictOverflowIds:new Set(),conflictCandidateCount:0,conflictCandidateBytes:0,pendingConflictCandidateBytes:0,volatileConflictCandidateBytes:0,draft:'',selectedEmoticon:null,emoteItems:new Map(),emotePacks:[],outbox:null,accepted:[],saved:false,saving:false,storageError:false,restoring:true,cached:false,
   phase:'connecting',notice:'',denied:false,rules:null,ruleJob:null,sending:false,feed:null,refreshFeed:null,refreshPromise:null,finishRefresh:null,pushClose:null,pushOnline:false,pushBusy:false,syncedUntil:0,sendNotBefore:0,enabled:true,cacheEpoch:'',storageAccount:''};
  const remembered=memories.get(memoryKey(c))||carry;if(remembered)Object.assign(c,remembered);
  // Switching artists never replays a previous reading position, even from IndexedDB.
  if(!restoreViewOnEntry)c.restoreView=null;
  if(input)input.value=c.draft;
  context=c;
  restoreJob=(async()=>{
   try{
    await Promise.resolve();if(!roomCurrent(c))return;
    if(!cacheNamespace())await ensureReplyIdentity();if(!roomCurrent(c))return;
    c.storageAccount=cacheNamespace();if(!c.storageAccount)throw new Error('Account identity unavailable');
    c.enabled=storageEnabled(c.storageAccount);
    if(!restore)try{localStorage.setItem(epochKey(c.storageAccount,c.host),crypto.randomUUID());}catch{}
    c.cacheEpoch=epoch(c.storageAccount,c.host);
    try{localStorage.setItem(lastRoomKey(c.storageAccount),JSON.stringify({roomId:c.roomId,host:c.host}));}catch{}
    const cached=restore?await store.read(c.storageAccount,c.host):(await store.clearRoom(c.storageAccount,c.host),null);if(!roomCurrent(c))return;
    if(cached&&Array.isArray(cached.messages)){
     const diskMessages=cached.messages.filter(m=>core.messageKey(m)&&core.messageTime(m)&&(!m.hostChatRoomId||String(m.hostChatRoomId)===c.host)).sort((a,b)=>compareMessages(a,b,'asc'));
     for(const conflict of cached.conflicts||[]){
      c.conflicts.set(String(conflict.messageId),{...conflict,candidates:Array.isArray(conflict.candidates)?conflict.candidates:[]});
      if(conflict.overflow)c.conflictOverflowIds.add(String(conflict.messageId));
     }
     c.conflictCandidateCount=Number(cached.meta.conflictCandidateCount)||0;c.conflictCandidateBytes=Number(cached.meta.conflictCandidateBytes)||0;
     const hotComplete=state.chatHistoryComplete===true,diskById=new Map(diskMessages.map(message=>[core.messageKey(message),message])),merged=new Map(diskById),hotCanonicalUpdates=[];
     // Keep the persisted value as the storage canonical; preserve any hot
     // variant as an unresolved candidate without replacing the rendered row.
     for(const message of state.messages){
      if(!core.messageKey(message)||!core.messageTime(message)||(message.hostChatRoomId&&String(message.hostChatRoomId)!==c.host))continue;
      const disk=diskById.get(core.messageKey(message));
      if(disk&&!core.sameMessage(disk,message)){
       rememberConflict(c,core.messageKey(message),disk,[message],{pending:true});
       if(hotComplete)hotCanonicalUpdates.push(disk);
       continue;
      }
      merged.set(core.messageKey(message),message);
     }
     const messages=[...merged.values()].sort((a,b)=>compareMessages(a,b,'asc'));
     // Validate completeness against the disk snapshot itself; hot rows cannot
     // make an incomplete IndexedDB snapshot appear complete.
     if(diskMessages.length||(cached.meta.complete===true&&cached.meta.count===0)){
      const earliest=core.messageTime(diskMessages[0])||Date.now(),cursor=Date.parse(cached.meta.cursorEnd),validCount=Number.isInteger(cached.meta.count)&&cached.meta.count>=0&&cached.meta.count<=diskMessages.length,diskComplete=cached.meta.complete===true&&validCount;
      if(hotComplete){
       if(hotCanonicalUpdates.length){
        const oldList=state.infiniteList,follow=atLatest();
        for(const message of hotCanonicalUpdates){const index=state.messages.findIndex(value=>core.messageKey(value)===core.messageKey(message));if(index>=0)state.messages[index]=message;}
        state.chatMessages=state.messages;state.chatCache.set(chatCacheKey(),state.messages);saveRoomCache();chatMatchCache=null;
        state.seenMessageKeys=new Set(state.messages.map(message=>String(message.messageId||`${message.createdAt}|${message.type}|${message.content}`)));
        if(hotCanonicalUpdates.some(message=>isArtist(message)&&isMedia(message)))await buildMediaSequences(true,()=>roomCurrent(c));
        updateView(oldList,hotCanonicalUpdates,follow);renderCountsOnly();updateChatSearchCount();renderDateCalendar();
       }
       const hotKeys=new Set(state.messages.map(core.messageKey));
       const diskOnly=diskMessages.filter(message=>!hotKeys.has(core.messageKey(message)));
       if(diskOnly.length)await merge(c,diskOnly,{source:'cache'});
       state.chatMessages=state.messages;state.chatHistoryProgress=state.messages.length;state.chatCache.set(chatCacheKey(),state.messages);
      }else{
       restoreRoomCache({messages,cursorEnd:validCount?(Number.isFinite(cursor)&&cursor<=earliest?new Date(cursor).toISOString():new Date(earliest-1).toISOString()):new Date().toISOString(),hasMoreMessages:!diskComplete,pageRequestLimit:[100,500].includes(cached.meta.pageRequestLimit)?cached.meta.pageRequestLimit:500,observedPageLimit:Number(cached.meta.observedPageLimit)||0});
       state.chatHistoryComplete=diskComplete;state.chatMessages=diskComplete?state.messages:state.messages.slice(-300);state.chatHistoryProgress=messages.length;
       if(state.chatHistoryComplete)state.chatCache.set(chatCacheKey(),state.messages);
      }
      c.cached=true;c.saved=true;c.syncedUntil=Number.isFinite(cached.meta.syncedUntil)&&cached.meta.syncedUntil>0&&cached.meta.syncedUntil<Date.now()+60000?cached.meta.syncedUntil:newest(messages);
      for(const message of diskMessages)c.persisted.set(core.messageKey(message),message);
      if(!remembered){c.selectedEmoticon=core.cleanEmoticon(cached.meta.emoticonDraft);c.draft=typeof cached.meta.draft==='string'?cached.meta.draft.slice(0,10000):'';const pending=cleanPending(cached.meta.outbox);c.outbox=pending?{...pending,uncertain:true}:null;c.accepted=Array.isArray(cached.meta.accepted)?cached.meta.accepted.map(cleanPending).filter(Boolean).slice(0,20):[];}
      const view=remembered?.lastView||cached.meta.view;
      if(view&&typeof view.id==='string'&&Number.isFinite(view.offset)&&Math.abs(view.offset)<20000){c.lastView=view;if(restoreViewOnEntry&&!view.latest)c.restoreView=view;}
      input.value=c.draft;
      if(!hotComplete){buildMediaSequences();render();}
      if(c.pendingConflictCandidates.size||state.messages.some(message=>c.persisted.get(core.messageKey(message))!==message))saveSoon();
     }else if(!remembered){c.selectedEmoticon=core.cleanEmoticon(cached.meta.emoticonDraft);c.draft=typeof cached.meta.draft==='string'?cached.meta.draft.slice(0,10000):'';input.value=c.draft;const pending=cleanPending(cached.meta.outbox);c.outbox=pending?{...pending,uncertain:true}:null;c.accepted=Array.isArray(cached.meta.accepted)?cached.meta.accepted.map(cleanPending).filter(Boolean).slice(0,20):[];}
    }
   }catch{if(roomCurrent(c)){c.storageError=true;if(!c.storageAccount)c.enabled=false;}}
   finally{c.restoring=false;if(roomCurrent(c)){paint();sync();}}
  })();
 }
 async function getRules(c,{fresh=false}={}){
  if(c.ruleJob&&!fresh)return c.ruleJob;
  if(c.ruleJob)await c.ruleJob.catch(()=>{});
  if(!roomCurrent(c)||c.owner.signal.aborted)throw new DOMException('대화방이 바뀌었습니다.','AbortError');
  const owner=requestOwner(c);
  const job=(async()=>{
   const payload=await frommApiRequest(`/v2/chat/fanChatRooms/${encodeURIComponent(c.roomId)}`,{signal:owner.signal});
   if(!roomCurrent(c)||owner.signal.aborted||owner.parent!==c.owner)throw new DOMException('대화방이 바뀌었습니다.','AbortError');
   c.rules=core.readRules(payload);return c.rules;
  })();c.ruleJob=job;
  try{return await job;}catch(error){
   if(roomCurrent(c)&&owner.parent===c.owner&&!owner.parent.signal.aborted){c.rules=null;if([401,403].includes(error.status)){c.denied=true;stop(c);}c.notice='전송 규칙을 확인하지 못했습니다. 연결을 다시 확인해주세요.';paint();}
   throw error;
  }finally{owner.close();if(c.ruleJob===job)c.ruleJob=null;if(roomCurrent(c))paint();}
 }
 function atLatest(){
  // Selection inside the composer is editing, not a selected passage in history.
  const readingSelection=!dock?.contains(document.activeElement)&&getSelection()?.isCollapsed===false;
  // Keep the tolerance to one dock height plus a small layout margin. A 220px
  // floor can label a reader in the middle of a short cached conversation as
  // "latest" and make a data-only cache flush pull the viewport downward.
  return !readingSelection&&document.documentElement.scrollHeight-(scrollY+innerHeight)<Math.max(80,(dock?.offsetHeight||0)+16);
 }
 function updateView(oldList,changes,follow){
  if(state.filter!=='all'||!context)return;
  const c=context,next=filteredMessages(),timeline=document.querySelector('#timeline');
  const nodes=new Map([...timeline.querySelectorAll('.msg')].map(el=>[el.dataset.messageId,el]));
  const oldKeys=new Set(oldList.map(messageStableKey));
  const anchor=[...nodes.values()].find(el=>el.getBoundingClientRect().bottom>chatHeaderInset()+8),anchorId=anchor?.dataset.messageId,anchorTop=anchor?.getBoundingClientRect().top;
  const first=timeline.querySelector('.msg'),last=[...nodes.values()].at(-1);
  const oldEnd=last?oldList.findIndex(m=>messageStableKey(m)===last.dataset.messageId):-1;
  const start=first?next.findIndex(m=>messageStableKey(m)===first.dataset.messageId):-1;
  const end=last?next.findIndex(m=>messageStableKey(m)===last.dataset.messageId):-1;
  window.FrommViewState?.cancel();
  if(first&&last&&start>=0&&end>=start){
   state.infiniteList=next;state.chatWindowStart=start;state.infiniteRendered=end+1;
   if(follow&&oldEnd===oldList.length-1){
    let begin=Math.max(0,next.length-600);
    if([...timeline.querySelectorAll('video,audio')].some(media=>!media.paused&&!media.ended))begin=Math.min(begin,start);
    const dates=new Map([...timeline.querySelectorAll('.date-sep')].map(el=>[el.dataset.date,el]));
    const wanted=new Set();let position=timeline.firstChild;
    const place=node=>{wanted.add(node);if(node!==position)timeline.insertBefore(node,position);position=node.nextSibling;};
    for(let i=begin;i<next.length;i++){
     const message=next[i],day=dateKey(message);
     if(i===begin||day!==dateKey(next[i-1])){
      let separator=dates.get(day);if(!separator){separator=document.createElement('div');separator.className='date-sep';separator.dataset.date=day;separator.id='chat-date-'+day;separator.textContent=day;}
      separator.toggleAttribute('data-window-date',i===begin&&i>0&&day===dateKey(next[i-1]));place(separator);
     }
     place(nodes.get(messageStableKey(message))||renderMessage(message));
    }
    for(const node of [...timeline.childNodes])if(!wanted.has(node))node.remove();
    state.chatWindowStart=begin;state.infiniteRendered=next.length;
    // A new row can change height after its first content-visibility paint.
    // Reuse the bounded, user-cancellable latest alignment instead of one scroll.
    if(window.FrommViewState?.settleLatest)FrommViewState.settleLatest(()=>viewing(c));
    else requestAnimationFrame(()=>{if(viewing(c))window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});});
   }else pendingCount+=changes.filter(m=>!oldKeys.has(messageStableKey(m))).length;
   for(const message of changes){const node=nodes.get(messageStableKey(message));
    if(node?.isConnected){const activeMedia=[...node.querySelectorAll('audio,video')].some(media=>!media.paused&&!media.ended);if(activeMedia)continue;const replacement=renderMessage(message);node.replaceWith(replacement);nodes.set(messageStableKey(message),replacement);}
   }
   state.chatTopRenderObserver?.disconnect();state.chatRenderObserver?.disconnect();
   timeline.querySelectorAll('.chat-prepend-sentinel,.chat-render-sentinel').forEach(n=>n.remove());armChatTopRenderObserver();armChatRenderObserver();
   const stableAnchor=anchor?.isConnected?anchor:anchorId?timeline.querySelector(`.msg[data-message-id="${CSS.escape(anchorId)}"]`):null;
   if(!follow&&stableAnchor){const delta=stableAnchor.getBoundingClientRect().top-anchorTop;if(Math.abs(delta)>.5)scrollBy({top:delta,behavior:'instant'});}
  }else if(!first&&next.length){state.chatAutoTopPending=true;render();}
  else state.infiniteList=next;
  paint();
 }
 async function merge(c,rows,{source='unverified'}={}){
  if(!roomCurrent(c))return;
  const oldList=state.infiniteList,follow=atLatest(),byId=new Map(state.messages.map(m=>[core.messageKey(m),m])),changes=[];let reconciled=false,conflicted=false;
  for(let row of rows){
   const key=core.messageKey(row);if(!key||!core.messageTime(row)||(row.hostChatRoomId&&String(row.hostChatRoomId)!==c.host))continue;
   const previous=byId.get(key),emoticonId=String(row.emoticonItemId??'');
   const known=c.emoteItems.get(emoticonId)||[c.outbox,...c.accepted].map(value=>value?.emoticon).find(item=>item?.id===emoticonId);
   const image=known?.imageUrl||(String(previous?.emoticonItemId||'')===emoticonId?previous?.emoticonItem?.imageUrl:'');
   if(emoticonId&&image&&!resolveEmoticonUrl(row))row={...row,emoticonItem:{imageUrl:image}};
   if(c.outbox&&row.code===c.outbox.code){clearSentEmoticon(c,c.outbox.emoticon);if(input.value.trim()===c.outbox.content){input.value='';c.draft='';}c.outbox=null;reconciled=true;}
   const accepted=c.accepted.filter(message=>message.code!==row.code);if(accepted.length!==c.accepted.length){c.accepted=accepted;reconciled=true;}
   if(previous&&core.sameMessage(previous,row))continue;
   if(previous){
    // A repeated server response is not revision proof. Keep the row already
    // displayed and store every distinct version as an unresolved candidate.
    const canonical=c.conflicts.get(key)?.canonical||c.persisted.get(key)||previous;
    conflicted=rememberConflict(c,key,canonical,[previous,row],{pending:true})||conflicted;
    continue;
   }
   else state.seenMessageKeys.add(key);
   byId.set(key,row);changes.push(row);
  }
  if(reconciled)c.notice='';
  if(!changes.length){if(reconciled||conflicted){if(conflicted)saveSoon();paint();}return;}
  state.messages=mergeSortedMessages(state.messages,changes);
  if(state.chatHistoryComplete){state.chatMessages=state.messages;state.chatCache.set(chatCacheKey(),state.chatMessages);}
  else state.chatMessages=state.messages.slice(-300);
  chatMatchCache=null;saveRoomCache();
  if(changes.some(message=>isArtist(message)&&isMedia(message)))await buildMediaSequences(true,()=>roomCurrent(c));
  else if(state.mediaSequenceStamp?.source===state.messages)state.mediaSequenceStamp.length=state.messages.length;
  if(!roomCurrent(c))return;
  if(state.filter==='all')updateView(oldList,changes,follow||reconciled);
  else if(typeof refreshInfiniteListAfterFetch==='function')await refreshInfiniteListAfterFetch(state.infiniteVersion);
  // A pending sticker and its composer preview can change height before the
  // first follow frame. A confirmed own send must still enter the latest window.
  if(reconciled)showLatest(c);
  renderCountsOnly();updateChatSearchCount();renderDateCalendar();
  saveSoon();
 }
 async function connectPush(c){
  if(c.pushBusy||c.pushClose||c.denied||!viewing(c)||!state.messages.length)return;
  const version=(c.pushVersion||0)+1;c.pushVersion=version;c.pushBusy=version;const valid=()=>viewing(c)&&c.pushVersion===version;let app=null,db=null,off=null;
  const close=()=>{off?.();off=null;if(db){void library?.terminate(db).catch(()=>{});db=null;}if(app){void library?.deleteApp(app).catch(()=>{});app=null;}};
  let library=null;
  try{
   library=await api.loadFirebase();if(!valid())return;
   const owner=requestOwner(c);let result;
   try{result=await frommApiRequest('/v2/auth/signin/firebase/secure/reader',{signal:owner.signal});}finally{owner.close();}
   if(!valid())return;
   const custom=result?.data?.accessToken;if(typeof custom!=='string')throw new Error('Reader token missing');
   const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(custom.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0))));
   if(!Array.isArray(payload.accessHostChatRoomIds)||!payload.accessHostChatRoomIds.includes(c.host))throw new Error('Room is outside reader claims');
   app=library.initializeApp({apiKey:'AIzaSyDtg4wP4wu7L39eWpdVWV7QQNmfR-Gbcgc',projectId:'fromm-fan-361704',appId:'1:693404733592:android:f2add53f3fd5257d71c0ed'},'fromm-viewer-'+crypto.randomUUID());
   c.pushClose=close;
   const auth=library.initializeAuth(app,{persistence:library.inMemoryPersistence});
   await library.signInWithCustomToken(auth,custom);if(!valid()){close();return;}
   db=library.initializeFirestore(app,{experimentalAutoDetectLongPolling:true},'chat5');
   const query=library.query(library.collection(db,'messages'),library.where('hostChatRoomId','==',c.host),library.where('userType','in',['star','bot']));
   off=library.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
    if(!valid())return;c.pushOnline=!snapshot.metadata.fromCache;
    if(c.pushOnline&&snapshot.docChanges().length){c.pushHintUntil=Date.now()+15000;c.feed?.poke();}paint();
   },()=>{if(valid()){c.pushOnline=false;close();c.pushClose=null;paint();c.pushRetry=setTimeout(()=>{c.pushRetry=0;connectPush(c);},60000);}});
   c.pushClose=close;
  }catch{
   close();if(valid()){c.pushClose=null;c.pushOnline=false;paint();c.pushRetry=setTimeout(()=>{c.pushRetry=0;connectPush(c);},60000);}
  }finally{if(c.pushBusy===version)c.pushBusy=0;if(viewing(c)&&!c.denied&&!c.pushBusy&&!c.pushClose&&!c.pushRetry)c.pushRetry=setTimeout(()=>{c.pushRetry=0;connectPush(c);},500);}
 }
 async function requestFeedPage(c,{start,end,limit,signal}){
  if(c.readNotBefore>Date.now())throw Object.assign(new Error('Retry later'),{status:429,retryAfterMs:c.readNotBefore-Date.now(),localCooldown:true});
  return extractMessages(await frommApiJson(FROMM_COMPAT.endpoints.messages(c.host),{findStartAt:new Date(start).toISOString(),findEndAt:new Date(end).toISOString(),limit:String(limit)},{signal}));
 }
 function start(c){
  if(c.refreshFeed)return;
  const canSyncEmpty=state.chatHistoryComplete&&Number.isFinite(c.syncedUntil)&&c.syncedUntil>0;
  if(!viewing(c)||(!state.messages.length&&!canSyncEmpty)||c.denied||c.feed)return;
  if(c.owner.signal.aborted)c.owner=new AbortController();
  const codes=new Set(state.messages.map(message=>message.code).filter(Boolean));
  if(c.outbox&&codes.has(c.outbox.code))c.outbox=null;c.accepted=c.accepted.filter(message=>!codes.has(message.code));
  c.feed=core.createFeed({current:()=>viewing(c)&&(state.messages.length>0||state.chatHistoryComplete&&Number.isFinite(c.syncedUntil)&&c.syncedUntil>0),latest:()=>c.syncedUntil||newest(state.messages),interval:()=>c.outbox||c.accepted.length||c.pushHintUntil>Date.now()?3000:c.pushOnline?60000:3000,limit:c.feedLimit||100,
   requestPage:options=>requestFeedPage(c,options),
   onMessages:rows=>merge(c,rows,{source:'server'}),onSynced:time=>{c.syncedUntil=time;saveSoon();},
   onState:(phase,error)=>{if(!roomCurrent(c))return;if(error?.status===429&&!error.localCooldown)c.readNotBefore=Date.now()+Math.max(30000,error.retryAfterMs||0);if(phase!=='syncing'||c.phase!=='connected')c.phase=phase;if(phase==='error')c.notice=error?.message||'동기화를 확인해주세요.';if(phase==='denied'){c.denied=true;c.rules=null;stop(c);}if(phase!=='error'&&c.rules&&!c.sending&&!c.outbox)c.notice='';paint();}});
  c.feed.start();void connectPush(c);if(!c.rules)void getRules(c).catch(()=>{});
 }
 function refreshLatest(c){
  if(state.filter==='all'){
   if(c.feed&&!c.feed.active)c.feed=null;
   if(!c.feed)start(c);else c.feed.poke();
   return Promise.resolve(true);
  }
  const gallery=['media','image','video','sound'].includes(state.filter),canSyncEmpty=state.chatHistoryComplete&&Number.isFinite(c.syncedUntil)&&c.syncedUntil>0;
  if(!gallery||!roomCurrent(c)||(!state.messages.length&&!canSyncEmpty))return Promise.resolve(false);
  if(c.refreshPromise)return c.refreshPromise;
  let feed=null,timer=0,settled=false,resolveJob;
  const promise=new Promise(resolve=>resolveJob=resolve);
  const finish=success=>{
   if(settled)return;settled=true;clearTimeout(timer);
   if(c.refreshFeed===feed){c.refreshFeed=null;c.refreshPromise=null;}
   if(c.finishRefresh===finish)c.finishRefresh=null;
   feed?.stop();
   if(success){c.phase='connected';c.notice='';}
   if(viewing(c)&&!c.feed)start(c);
   resolveJob(success);
  };
  c.finishRefresh=finish;
  feed=core.createFeed({current:()=>roomCurrent(c)&&c.refreshFeed===feed&&!document.hidden&&['all','media','image','video','sound'].includes(state.filter)&&!document.querySelector('#loginGate:not(.hidden)'),latest:()=>c.syncedUntil||newest(state.messages),interval:60000,limit:c.feedLimit||100,
   requestPage:options=>requestFeedPage(c,options),
   onMessages:rows=>merge(c,rows,{source:'server'}),
   onSynced:time=>{c.syncedUntil=time;saveSoon();finish(true);paint();},
   onState:(phase,error)=>{
    if(!roomCurrent(c)){finish(false);return;}
    if(error?.status===429&&!error.localCooldown)c.readNotBefore=Date.now()+Math.max(30000,error.retryAfterMs||0);
    if(phase==='syncing'){c.phase=phase;paint();return;}
    if(phase==='denied'){c.denied=true;c.rules=null;}
    if(phase==='retry'||phase==='error'||phase==='denied'){c.phase=phase;c.notice=error?.message||'동기화를 확인해주세요.';finish(false);paint();}
   }});
  c.refreshFeed=feed;c.refreshPromise=promise;timer=setTimeout(()=>finish(false),16000);feed.start();
  return promise;
 }
 async function refresh(){
  let c=context;if(!c)return false;
  if(c.restoring)await restoreJob;
  if(!roomCurrent(c)||c.denied)return false;
  // Keep complete caches intact and fetch only the incremental latest window.
  // A partial cache advances by one older page, then resumes background fill.
  if(!state.messages.length&&state.chatHistoryComplete&&!c.syncedUntil){
   state.chatHistoryComplete=false;state.chatMessages=[];state.hasMoreMessages=true;state.cursorEnd=new Date();
  }
  if(!state.chatHistoryComplete&&state.hasMoreMessages){
   await loadMoreHistory({initial:true});
   if(!roomCurrent(c))return false;
   if(state.hasMoreMessages)scheduleHistoryBackground();
  }
  if(!roomCurrent(c)||c.denied)return false;
  if(state.messages.length||state.chatHistoryComplete&&c.syncedUntil)await refreshLatest(c);
  return true;
 }
 function sync(){
  if(!mounted)return;
  if(!context&&!state.room&&state.rooms.length&&document.querySelector('#loginGate')?.classList.contains('hidden')){
   if(!cacheNamespace()){if(!resumeIdentityPending){resumeIdentityPending=true;void ensureReplyIdentity().then(ready=>{resumeIdentityPending=false;if(ready)sync();});}return;}
   try{const saved=JSON.parse(localStorage.getItem(lastRoomKey(cacheNamespace()))||'null');
    const index=saved?state.rooms.findIndex(room=>String(room.id)===saved.roomId&&String(room.hostChatRoomId)===saved.host):-1;
    const button=document.querySelectorAll('#rooms .room')[index];if(index>=0&&button){selectRoom(index,button,{restoreHistoryPosition:true});return;}
   }catch{}
  }
  const c=context;
  if(!roomCurrent(c)){stop(c);paint();return;}
  if(!viewing(c)){const keepGalleryRefresh=['media','image','video','sound'].includes(state.filter)&&!document.hidden&&!document.querySelector('#loginGate:not(.hidden)');stop(c,{includeRefresh:!keepGalleryRefresh});c.phase='paused';paint();return;}
  if(c.owner.signal.aborted)c.owner=new AbortController();
  if(!c.rules&&!c.ruleJob&&!c.denied)void getRules(c).catch(()=>{});
  if(c.restoreView&&!c.restoring){
   cancelAnimationFrame(c.restoreFrame);c.restoreFrame=requestAnimationFrame(()=>{
    if(!viewing(c)||!c.restoreView)return;const view=c.restoreView;c.restoreView=null;
    const list=filteredMessages(),index=list.findIndex(message=>messageStableKey(message)===view.id);if(index<0)return;
    window.FrommViewState?.cancel();state.chatAutoTopPending=false;renderChatWindow(list,index);
    const row=[...document.querySelectorAll('#timeline .msg')].find(el=>el.dataset.messageId===view.id);
    if(row){scrollBy({top:row.getBoundingClientRect().top-view.offset,behavior:'instant'});window.FrommViewState?.settleAnchor(row,()=>view.offset-12,()=>viewing(c),1200);}
   });
  }
  start(c);paint();
 }
 async function submit(event){
  event?.preventDefault();const c=context;
  if(!viewing(c)||c.sending||c.denied||c.outbox||c.accepted.length>=20||Date.now()<c.sendNotBefore)return;
  const draft=input.value,choice=c.selectedEmoticon;let text,code='',emoticon=null;
  try{text=core.validateText(draft,c.rules,{allowEmpty:!!choice});}catch(error){c.notice=error.message;paint();return;}
  c.sending=true;c.notice='';paint();showLatest(c);
  const owner=c.owner;let requestStarted=false;
  try{
   const [rules,verified]=await Promise.all([getRules(c,{fresh:true}),choice?verifyEmoticon(c,choice):Promise.resolve(null)]);emoticon=verified;if(!viewing(c)||owner.signal.aborted)return;
   text=core.validateText(draft,rules,{allowEmpty:!!emoticon});
   code=crypto.randomUUID();c.outbox={code,content:text,...(emoticon?{emoticonItemId:emoticon.id,emoticon}:{}),createdAt:new Date().toISOString(),uncertain:true};
   await persist({metadataOnly:true});if(!viewing(c)||owner.signal.aborted){c.outbox=null;return;}
   showLatest(c);
   c.notice='';paint();requestStarted=true;
   const body={code,chatRoomId:c.roomId,content:text};if(emoticon)body.emoticonItemId=emoticon.apiId;
   const request=new AbortController(),cancel=()=>request.abort();owner.signal.addEventListener('abort',cancel,{once:true});
   const timer=setTimeout(()=>request.abort(),15000);let reply;
   try{reply=await frommApiRequest(`/v2/chat/message/${encodeURIComponent(c.host)}/replies`,{method:'POST',body,signal:request.signal});}finally{clearTimeout(timer);owner.signal.removeEventListener('abort',cancel);}
   if(!roomCurrent(c))return;
   if(!state.messages.some(message=>message.code===code))c.accepted.push({code,content:text,...(emoticon?{emoticonItemId:emoticon.id,emoticon}:{}),createdAt:new Date().toISOString(),uncertain:false});if(c.outbox?.code===code)c.outbox=null;c.notice='';
   if(input.value===draft){input.value='';c.draft='';}clearSentEmoticon(c,choice);
   const message=reply?.data?.message;
   if(message&&core.messageKey(message)&&core.messageTime(message)&&!state.historyJob)await merge(c,[{...message,code:message.code||code}],{source:'server'});
   c.feed?.poke();void persist({metadataOnly:true});
  }catch(error){
   if(!roomCurrent(c))return;
   if(requestStarted&&state.messages.some(message=>message.code===code)){c.outbox=null;c.notice='';if(input.value===draft){input.value='';c.draft='';}clearSentEmoticon(c,choice);void persist();return;}
   if(!requestStarted||(Number(error.status)>=400&&Number(error.status)<500&&Number(error.status)!==408)||error.status===200){c.outbox=null;c.notice=error.code==='EMOTICON_UNAVAILABLE'?error.message:error.status===429?'전송 횟수 제한입니다. 잠시 후 다시 시도해주세요.':'메시지를 보내지 못했습니다. 입력 내용은 유지됩니다.';
    if([401,403].includes(error.status)){c.denied=true;stop(c);}
    if(error.status===429){c.sendNotBefore=Date.now()+Math.max(30000,error.retryAfterMs||0);setTimeout(()=>{if(roomCurrent(c))paint();},c.sendNotBefore-Date.now());}
   }
   else{c.notice='전송 결과를 확인 중입니다. 중복 전송 없이 대화 목록을 먼저 확인해주세요.';c.feed?.poke();}
   void persist({metadataOnly:true});
  }finally{c.sending=false;if(roomCurrent(c))paint();}
 }
 function historyChanged(){
  if(!roomCurrent(context)||context.restoring)return;
  if(state.chatHistoryComplete){state.chatMessages=state.messages;context.syncedUntil||=newest(state.messages)||Date.now();}
  else exposeChatHistorySnapshot();
  saveSoon();sync();
 }
 function mount(){
  if(mounted)return;mounted=true;
  dock=document.createElement('form');dock.id='conversationDock';dock.hidden=true;dock.setAttribute('aria-label','메시지 보내기');
  dock.innerHTML='<div class="conversation-meta" hidden><span id="conversationStatus" role="status" aria-live="polite" hidden></span><button id="conversationRetry" type="button" class="btn" hidden>다시 확인</button><button id="conversationResolve" type="button" class="btn" hidden>전송 확인</button></div><button id="conversationNew" type="button" title="최신 대화로 이동" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg><span hidden aria-hidden="true"></span></button><div id="conversationEmoticonPreview" hidden><img alt="선택한 이모티콘"><button type="button" aria-label="이모티콘 선택 해제">×</button></div><div class="conversation-compose"><div class="conversation-input-shell"><textarea id="conversationInput" rows="1" aria-label="메시지 입력" aria-describedby="conversationCount" placeholder="메시지 입력" enterkeyhint="send"></textarea><button id="conversationEmoticonButton" class="conversation-icon" type="button" aria-label="이모티콘 고르기" aria-haspopup="dialog" aria-controls="conversationEmoticons" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0"/><path d="M8 9h1m6 0h1"/></svg></button></div><output id="conversationCount" class="conversation-sr-only"></output><button id="conversationSend" type="submit" disabled>전송</button><button id="conversationStorage" class="conversation-icon" type="button" aria-label="채팅 설정" title="채팅 설정" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg></button></div><section id="conversationEmoticons" role="dialog" aria-labelledby="conversationEmoticonTitle" hidden><div class="conversation-emoticon-head"><strong id="conversationEmoticonTitle">이모티콘</strong><button type="button" id="conversationEmoticonClose" aria-label="이모티콘 창 닫기">×</button></div><div id="conversationEmoticonPacks" aria-label="이모티콘 팩"></div><p id="conversationEmoticonStatus" role="status"></p><div id="conversationEmoticonItems" aria-label="이모티콘 목록"></div><button id="conversationEmoticonRetry" type="button" hidden>다시 불러오기</button></section>';
  document.body.append(dock);input=dock.querySelector('textarea');status=dock.querySelector('#conversationStatus');send=dock.querySelector('#conversationSend');count=dock.querySelector('output');storage=dock.querySelector('#conversationStorage');newButton=dock.querySelector('#conversationNew');
  // Place latest-message navigation before the input field while preserving its existing click and visibility behavior.
  dock.querySelector('.conversation-input-shell').before(newButton);
  mountEmoticons();
  dock.addEventListener('submit',submit);input.addEventListener('input',()=>{if(!roomCurrent(context))return;context.draft=input.value;resizeInput();clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),250);paint();});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();void submit();}});
  newButton.onclick=()=>{showLatest(context);paint();};
  dock.querySelector('#conversationRetry').onclick=()=>{const c=context;if(!roomCurrent(c))return;if(c.phase==='error'){c.feed?.stop();c.feed=null;c.feedLimit=500;}c.feed?.poke();c.notice='';sync();};
  dock.querySelector('#conversationResolve').onclick=()=>{const c=context;if(!roomCurrent(c)||!c.outbox)return;c.feed?.poke();if(confirm('전송 결과가 확인되지 않았습니다. 대화 목록을 확인한 뒤 보류 상태를 해제할까요? 같은 글을 다시 보내면 중복될 수 있습니다.')){c.outbox=null;c.notice='보류 상태를 해제했습니다. 입력 내용을 확인해주세요.';void persist();paint();}};
  dialog=document.createElement('dialog');dialog.id='conversationStorageDialog';dialog.setAttribute('aria-labelledby','conversationStorageTitle');dialog.innerHTML='<h2 id="conversationStorageTitle">설정</h2><h3>대화 저장</h3><p>이 브라우저에 계정·아티스트별 대화를 저장하고, 다시 방문하면 저장된 기록을 먼저 복원합니다. 원본 사진·영상 파일은 저장하지 않습니다.</p><label><input id="conversationStoreEnabled" type="checkbox">이 기기에 대화 자동 저장</label><p role="status" id="conversationStorageState"></p><section class="conversation-alert-settings" aria-label="알림 설정"><h3>알림</h3><label><input id="conversationSoundEnabled" type="checkbox">새 메시지 알림음</label><label><input id="conversationDesktopEnabled" type="checkbox">브라우저 알림</label><div class="conversation-alert-preview"><span>Mellow Glass · 기본 알림음</span><button class="btn" id="conversationSoundPreview" type="button">들어보기</button></div><p role="status" id="conversationAlertState">소리와 브라우저 알림을 꺼도 사이드바 숫자 배지는 유지됩니다.</p></section><div class="conversation-dialog-actions"><button class="btn" type="button" id="conversationClear">이 계정의 저장 기록 지우기</button><button class="btn good" type="button" id="conversationStorageClose">닫기</button></div>';
  document.body.append(dialog);storage.onclick=()=>{dialog.querySelector('#conversationStoreEnabled').disabled=!context?.storageAccount;dialog.querySelector('#conversationClear').disabled=!context?.storageAccount;dialog.querySelector('#conversationStoreEnabled').checked=!!context?.enabled;
   const alerts=window.FrommUnread?.prefs||{sound:false,desktop:false};
   dialog.querySelector('#conversationSoundEnabled').checked=alerts.sound;
   dialog.querySelector('#conversationDesktopEnabled').checked=alerts.desktop;
   dialog.querySelector('#conversationAlertState').textContent='소리와 브라우저 알림을 꺼도 사이드바 숫자 배지는 유지됩니다.';
   dialog.querySelector('#conversationStorageState').textContent=context?.storageError?'저장 공간 또는 브라우저 설정을 확인해주세요. 현재 대화 조회는 계속 사용할 수 있습니다.':'저장된 대화는 현재 기기에만 보관됩니다.';dialog.showModal();};
  dialog.querySelector('#conversationStoreEnabled').onchange=event=>{const c=context;if(!roomCurrent(c)||!c.storageAccount)return;c.enabled=event.target.checked;try{localStorage.setItem(storageKey(c.storageAccount),c.enabled?'on':'off');}catch{}if(c.enabled)void persist({force:true});paint();};
  dialog.querySelector('#conversationSoundEnabled').onchange=event=>window.FrommUnread?.setPrefs({sound:event.target.checked});
  dialog.querySelector('#conversationSoundPreview').onclick=()=>{void window.FrommUnread?.previewSound();};
  dialog.querySelector('#conversationDesktopEnabled').onchange=async event=>{
   const checkbox=event.target,status=dialog.querySelector('#conversationAlertState');
   if(!checkbox.checked){window.FrommUnread?.setPrefs({desktop:false});return;}
   if(!('Notification' in window)){checkbox.checked=false;status.textContent='이 브라우저는 데스크톱 알림을 지원하지 않습니다.';return;}
   let permission=Notification.permission;
   if(permission!=='granted')permission=await Notification.requestPermission();
   if(!dialog.isConnected)return;
   const enabled=permission==='granted';
   checkbox.checked=enabled;window.FrommUnread?.setPrefs({desktop:enabled});
   status.textContent=enabled?'브라우저 알림을 켰습니다.':'알림 권한을 허용해야 사용할 수 있습니다.';
  };
  dialog.querySelector('#conversationStorageClose').onclick=()=>dialog.close();dialog.querySelector('#conversationClear').onclick=async()=>{
   const c=context;if(!authCurrent(c)||!c.storageAccount||!confirm('이 계정의 기기에 저장된 대화와 작성 중인 글을 지울까요? 서버 대화는 유지됩니다.'))return;
   clearTimeout(saveTimer);memories.clear();c.enabled=false;try{localStorage.setItem(storageKey(c.storageAccount),'off');localStorage.removeItem(lastRoomKey(c.storageAccount));}catch{}await store.clear(c.storageAccount);if(roomCurrent(c)){c.persisted.clear();c.saved=false;c.storageError=false;c.draft='';c.selectedEmoticon=null;input.value='';dialog.querySelector('#conversationStoreEnabled').checked=false;dialog.querySelector('#conversationStorageState').textContent='기기 저장 기록을 지우고 자동 저장을 껐습니다. 다시 켜면 현재 대화를 저장합니다.';paint();}
  };
  dialog.addEventListener('close',()=>storage.focus({preventScroll:true}));
  new ResizeObserver(layout).observe(document.querySelector('.main'));new ResizeObserver(layout).observe(dock);
  window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);window.visualViewport?.addEventListener('scroll',layout);
  window.addEventListener('scroll',()=>{updateLatestButton();if(viewing(context)&&!context.restoring){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),500);}},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(roomCurrent(context)){context.draft=input.value;void persist();}stop();}else sync();});
  window.addEventListener('pagehide',()=>{if(roomCurrent(context)){context.draft=input.value;void persist();}stop();});window.addEventListener('pageshow',sync);window.addEventListener('online',sync);
  window.addEventListener('storage',event=>{const c=context;if(c&&event.key===epochKey(c.storageAccount,c.host)&&c.cacheEpoch!==epoch(c.storageAccount,c.host)){clearTimeout(saveTimer);c.notice='다른 창에서 저장 기록을 갱신했습니다. 이 창을 새로고침하면 이어서 저장합니다.';paint();}if(c&&event.key===storageKey(c.storageAccount)){c.enabled=storageEnabled(c.storageAccount);if(!c.enabled)clearTimeout(saveTimer);paint();}});
  new MutationObserver(sync).observe(document.querySelector('#loginGate'),{attributes:true,attributeFilter:['class']});
  const originalFilter=setFilter;setFilter=async function(...args){const promise=originalFilter.apply(this,args);sync();try{return await promise;}finally{sync();}};
  paint();
 }
 const api={mount,beforeRoom,sync,refresh,historyChanged,reconcileHistory(rows){if(!roomCurrent(context)||!Array.isArray(rows))return;return merge(context,rows,{source:'history'});},stop(){stop();memories.clear();context=null;restoreJob=null;clearTimeout(saveTimer);pendingCount=0;if(input)input.value='';document.querySelector('#conversationPending')?.remove();paint();},canShowCached:()=>roomCurrent(context)&&context.cached&&state.chatMessages.length>0,
  get restoring(){return!!context?.restoring;},get ready(){return restoreJob||Promise.resolve();},loadFirebase:sdk,
  get status(){return{phase:context?.phase||'idle',persisted:!!context?.saved,storageError:!!context?.storageError,push:!!context?.pushOnline};},flush:()=>persist({force:true})};
 window.FrommConversation=api;
})();

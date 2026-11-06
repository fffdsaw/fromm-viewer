/* Glow ME presentation shell: existing routes, data and media engines stay authoritative. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),sidebar=$('#sidebar'),panel=$('#chatToolsPanel'),toggle=$('#sidebarToggleBtn'),search=$('#chatToolsBtn');
  if(!sidebar||!panel||!toggle||!search)return;
  const installed=matchMedia('(display-mode: standalone)'),wide=matchMedia('(min-width:1200px)'),hover=matchMedia('(hover:hover) and (pointer:fine)');
  let appWindow=installed.matches,expanded=false,closeTimer=0,promptEvent=null,headerKey='',headerMessages=null,profileKey='',searchWasOpen=false,railMotionUntil=0,keyboardFocus=false;
  document.documentElement.classList.add('glowme','glowme-phase3');
  const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const paths={all:'M5 5h14v10H9l-4 4V5Z',media:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',image:'M4 4h16v16H4z M4 16l5-6 4 4 3-3 4 5 M15 8h.01',video:'M3 4h18v16H3z M10 8l6 4-6 4V8Z',sound:'M9 18V5l11-2v13 M9 9l11-2 M9 18a3 2 0 1 1-3-2h3 M20 16a3 2 0 1 1-3-2h3',vote:'M4 20V10h4v10 M10 20V4h4v16 M16 20v-7h4v7',live:'M3 6h12v12H3z M15 10l6-3v10l-6-3',replay:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M10 8l6 4-6 4V8Z',channel:'M3 10l9-7 9 7v11h-7v-7h-4v7H3V10Z'};
  const labels={all:'전체 대화',media:'미디어',image:'사진',video:'영상',sound:'음성',vote:'투표',live:'LIVE',replay:'Replay',channel:'Channel'};
  const brand=sidebar.querySelector('.brand');
  brand.replaceChildren(Object.assign(document.createElement('img'),{src:'assets/glowme/logo.png',alt:'Fromm Viewer',width:210,height:116}));
  sidebar.querySelector('.sub')?.remove();
  $('.sidebar-toggle-slot')?.remove();
  toggle.className='rail-toggle';toggle.innerHTML=svg('m9 6 6 6-6 6');toggle.removeAttribute('style');
  const railHead=document.createElement('div');railHead.className='rail-head';sidebar.prepend(railHead);railHead.append(toggle,brand);
  const nav=document.createElement('nav');nav.className='glowme-nav';nav.setAttribute('aria-label','주요 화면');
  for(const [key,label] of Object.entries(labels)){
    const button=document.createElement('button');button.type='button';button.dataset.glowNav=key;button.className='pill';
    if(!['live','replay','channel'].includes(key))button.dataset.filter=key;
    button.title=label;button.setAttribute('aria-label',label);button.innerHTML=svg(paths[key])+`<span>${label}</span>`;
    button.addEventListener('click',async()=>{
      if(button.disabled)return;button.disabled=true;
      try{if(['live','replay','channel'].includes(key)){
        if(state.filter==='live')await setLiveCenterMode(key);else{state.live.centerMode=key;await setFilter('live');}
      }else await setFilter(key);}finally{button.disabled=false;syncNavigation();setRailOpen(false);toggle.focus({preventScroll:true});}
    });nav.append(button);
  }
  railHead.after(nav);
  // A single decoration follows the pointer independently of the optional lens.
  const railLight=document.createElement('span');railLight.className='rail-pointer-light';railLight.setAttribute('aria-hidden','true');nav.append(railLight);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let lightFrame=0,lightPoint=null;
  function clearRailLight(){cancelAnimationFrame(lightFrame);lightFrame=0;lightPoint=null;nav.classList.remove('rail-pointer-tracking');}
  function paintRailLight(){
    lightFrame=0;if(!lightPoint||!hover.matches||reducedMotion.matches||document.hidden)return clearRailLight();
    const {button,x,y}=lightPoint;if(!button.isConnected)return clearRailLight();
    const box=button.getBoundingClientRect(),parent=nav.getBoundingClientRect();
    railLight.style.transform=`translate3d(${box.left-parent.left}px,${box.top-parent.top}px,0)`;
    railLight.style.width=`${box.width}px`;railLight.style.height=`${box.height}px`;
    railLight.style.setProperty('--rail-light-x',`${Math.max(0,Math.min(box.width,x-box.left))}px`);
    railLight.style.setProperty('--rail-light-y',`${Math.max(0,Math.min(box.height,y-box.top))}px`);
    nav.classList.add('rail-pointer-tracking');
  }
  function scheduleRailLight(){if(!lightFrame)lightFrame=requestAnimationFrame(paintRailLight);}
  nav.addEventListener('pointermove',event=>{
    const button=event.target.closest('button');
    if(event.pointerType==='touch'||!hover.matches||reducedMotion.matches||!button||!nav.contains(button))return clearRailLight();
    lightPoint={button,x:event.clientX,y:event.clientY};scheduleRailLight();
  },{passive:true});
  nav.addEventListener('pointerleave',clearRailLight);nav.addEventListener('pointercancel',clearRailLight);
  sidebar.addEventListener('transitionend',()=>{if(lightPoint)scheduleRailLight();});
  document.addEventListener('keydown',clearRailLight,true);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearRailLight();});
  reducedMotion.addEventListener('change',clearRailLight);hover.addEventListener('change',clearRailLight);window.addEventListener('resize',clearRailLight,{passive:true});
  // Remove duplicate controls, keeping their existing filters and routes on the rail.
  $('.toolbar').querySelectorAll(':scope > [data-filter]').forEach(el=>el.remove());
  const batchTools=document.createElement('div');batchTools.className='batch-selection-tools';batchTools.hidden=true;
  $('.toolbar').append(batchTools);
  for(const id of ['selectedCount','selectAllBtn','saveSelectedBtn'])batchTools.append($('#'+id));
  const artists=sidebar.querySelector('.card');artists.classList.add('rail-artists');
  $('#rooms').setAttribute('aria-label','아티스트 목록');
  function decorateRooms(){
    const rooms=$('#rooms'),scroll=rooms.scrollTop;
    [...rooms.querySelectorAll('.room')].forEach((button,index)=>{
      if(button.dataset.railArtist)return;
      const room=state.rooms[index],host=room?.host||{},name=host.nick||button.textContent.trim()||'아티스트';
      button.dataset.railArtist='1';button.title=name;button.setAttribute('aria-label',name);
      const avatar=document.createElement('span');avatar.className='rail-avatar';avatar.innerHTML=svg('M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8');
      const url=normalizeMediaUrl(host.profileUrlThumbnail||host.profileUrl||host.defaultProfileUrl||'');
      if(url){const img=new Image();img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();img.src=url;avatar.append(img);}
      const text=document.createElement('span');text.className='rail-artist-name';text.textContent=name;button.replaceChildren(avatar,text);
    });rooms.scrollTop=scroll;
  }
  new MutationObserver(decorateRooms).observe($('#rooms'),{childList:true});decorateRooms();
  const installButton=document.createElement('button');installButton.type='button';installButton.id='installAppBtn';installButton.className='btn glowme-install';installButton.textContent='앱으로 설치';installButton.hidden=true;sidebar.append(installButton);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;installButton.hidden=appWindow;});
  window.addEventListener('appinstalled',()=>{promptEvent=null;installButton.hidden=true;});
  installButton.onclick=async()=>{const pending=promptEvent;if(!pending)return;promptEvent=null;installButton.hidden=true;await pending.prompt();await pending.userChoice;};
  function setRailOpen(open,{focus=false,restore=false}={}){
    clearTimeout(closeTimer);if(!open)keyboardFocus=false;if(expanded!==!!open)railMotionUntil=performance.now()+220;expanded=!!open;document.body.classList.toggle('sidebar-open',expanded);document.documentElement.classList.toggle('sidebar-open',expanded);
    if(!expanded)clearRailLight();
    sidebar.inert=false;sidebar.setAttribute('aria-hidden','false');
    toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-controls','sidebar');toggle.setAttribute('aria-label',expanded?'탐색 메뉴 접기':'탐색 메뉴 펼치기');toggle.title=expanded?'메뉴 접기':'메뉴 펼치기';
    if(focus&&expanded)(nav.querySelector('[aria-current="page"]')||nav.firstElementChild).focus({preventScroll:true});
    if(restore&&!expanded)toggle.focus({preventScroll:true});
    window.FrommGlass?.sync();
  }
  toggle.onclick=event=>setRailOpen(!expanded,{focus:event.detail===0,restore:expanded});
  sidebar.addEventListener('pointerenter',event=>{if(hover.matches&&event.pointerType!=='touch')setRailOpen(true);});
  sidebar.addEventListener('pointerleave',()=>{if(hover.matches)closeTimer=setTimeout(()=>{if(!keyboardFocus||!sidebar.contains(document.activeElement)||document.activeElement===toggle)setRailOpen(false);},260);});
  // Restoring an old item focus after selection must not reopen the rail.
  document.addEventListener('keydown',()=>{keyboardFocus=true;document.documentElement.classList.add('rail-keyboard-entry');},true);
  document.addEventListener('pointerdown',()=>{keyboardFocus=false;document.documentElement.classList.remove('rail-keyboard-entry');},{capture:true,passive:true});
  sidebar.addEventListener('focusin',event=>{clearTimeout(closeTimer);if(event.target!==toggle&&(expanded||keyboardFocus))setRailOpen(true);});
  sidebar.addEventListener('focusout',()=>{closeTimer=setTimeout(()=>{if(!sidebar.contains(document.activeElement)&&!sidebar.matches(':hover'))setRailOpen(false);},160);});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(panel.contains(document.activeElement)&&panel.classList.contains('open')&&!isSearchPinned()){
      event.stopImmediatePropagation();closeChatToolsPanel();search.focus({preventScroll:true});
    }else if(expanded){event.stopImmediatePropagation();setRailOpen(false,{restore:true});}
  },true);
  document.addEventListener('pointerdown',event=>{if(expanded&&!sidebar.contains(event.target))setRailOpen(false);});
  const context=document.createElement('div');context.id='viewContext';$('.artist-copy').prepend(context);
  const stats=document.createElement('div');stats.id='artistMediaStats';stats.setAttribute('role','status');stats.setAttribute('aria-live','polite');$('#artistTitle').after(stats);
  const loadStatus=document.createElement('div');loadStatus.id='artistLoadStatus';loadStatus.setAttribute('role','status');stats.after(loadStatus);
  function syncHeader(){
    const key=state.filter==='live'?state.live.centerMode:state.filter,host=state.room?.host||{},name=host.nick||host.defaultNameOverseas?.ko||state.room?.chatRoomName||'';
    const setText=(el,text)=>{if(el.textContent!==text)el.textContent=text;};
    setText(context,key==='all'?'현재 보고 있는 대화':`현재 보고 있는 ${labels[key]||'대화'}`);
    setText(loadStatus,state.room&&state.historyError?'기록 준비 일시 중지 · 새로고침으로 재시도':state.room&&state.loadingMessages?'기록 불러오는 중…':'');
    setText($('#artistTitle'),name||(['live','replay','channel'].includes(key)?labels[key]:'아티스트를 선택하세요'));
    const profile=String(state.room?.hostChatRoomId||state.room?.id||'')+'|'+(host.profileUrlThumbnail||host.profileUrl||host.defaultProfileUrl||'');
    if(profile!==profileKey){profileKey=profile;syncArtistHeaderProfile();}$('#artistProfileWrap').style.display=name?'':'none';
    const signature=[profile,state.messages.length,state.hasMoreMessages,state.loadingMessages,state.historyError,state.scanGeneration].join('|');
    if(signature!==headerKey||headerMessages!==state.messages){headerKey=signature;headerMessages=state.messages;const counts={image:0,video:0,sound:0};
      for(const message of state.messages)if(isArtist(message)&&isMedia(message)){const type=normType(message.type);if(type in counts)counts[type]++;}
      const total=counts.image+counts.video+counts.sound,fmt=n=>n.toLocaleString();
      setText(stats,!state.room?'아티스트 선택 후 미디어 통계를 표시합니다.':state.loadingMessages&&!state.messages.length?'미디어 통계 불러오는 중…':`${state.hasMoreMessages?'현재 ':''}미디어 ${fmt(total)} · 사진 ${fmt(counts.image)} · 영상 ${fmt(counts.video)} · 음성 ${fmt(counts.sound)}`);
      stats.title=state.historyError?'기록 준비가 일시 중지되어 불러온 항목만 집계했습니다.':state.hasMoreMessages?'불러온 기록 기준 · 나머지 기록 준비 중':'불러온 전체 기록 기준';
    }
  }
  const fields=document.createElement('fieldset');fields.className='glowme-search-fields';
  const panelTitle=panel.querySelector('.chat-tools-title');panelTitle.remove();
  const legend=document.createElement('legend');legend.className='glowme-sr';legend.textContent='대화 검색 및 날짜 선택';fields.append(legend,...panel.childNodes);
  const close=document.createElement('button');close.type='button';close.className='glowme-search-close';close.setAttribute('aria-label','검색 패널 닫기');close.innerHTML=svg('m6 6 12 12M18 6 6 18');close.onclick=()=>{closeChatToolsPanel();search.focus({preventScroll:true});};
  const panelHeading=document.createElement('div');panelHeading.className='search-panel-heading';panelHeading.append(panelTitle,close);
  const fieldScroll=document.createElement('div');fieldScroll.className='search-panel-scroll';fieldScroll.append(fields);panel.append(panelHeading,fieldScroll);panel.setAttribute('role','complementary');panel.setAttribute('aria-label','대화 찾기');$('.main').append(panel);
  const searchDock=document.createElement('div');searchDock.id='chatSearchDock';
  const matchSlot=document.createElement('div');matchSlot.className='chat-match-slot';
  searchDock.append(search,matchSlot);document.body.append(searchDock);
  search.setAttribute('aria-controls','chatToolsPanel');search.classList.add('glowme-search-toggle');
  const matchNav=$('#chatMatchNav');
  function syncMatchNav(){
    const inside=!panel.hidden&&panel.classList.contains('open')&&(isSearchPinned()||!state.onlyMyReplies);
    const target=inside?fields:matchSlot;
    const focused=matchNav.contains(document.activeElement)?document.activeElement:null;
    if(matchNav.parentElement!==target){
      if(inside)fields.insertBefore(matchNav,$('#myReplyStatus'));else target.append(matchNav);
      focused?.focus({preventScroll:true});
    }
    const expanded=!inside&&state.filter==='all'&&state.onlyMyReplies&&!matchNav.hidden;
    matchSlot.classList.toggle('expanded',expanded);matchSlot.inert=!expanded;
    document.documentElement.classList.toggle('chat-reply-navigation',expanded);
    matchSlot.setAttribute('aria-hidden',String(!expanded));
    searchDock.hidden=search.hidden;
  }
  $('.chat-tools-title').textContent='대화 검색 / 날짜 찾기';
  const searchRow=$('#chatSearchInput').closest('.chat-tools-row'),searchLabel=searchRow.previousElementSibling;
  const searchLabelId='chatSearchLabel';searchLabel.id=searchLabelId;$('#chatSearchInput').setAttribute('aria-labelledby',searchLabelId);$('#chatSearchInput').placeholder='키워드를 입력하세요';
  searchRow.after($('#myRepliesBtn').closest('label'),$('#myReplyStatus'),$('#myReplyRetry'));
  const dateLabel=$('.date-picker-row').previousElementSibling;dateLabel.id='calendarSectionLabel';$('#dateCalendar').setAttribute('aria-labelledby',dateLabel.id);
  const dateAction=document.createElement('div');dateAction.className='search-panel-footer';dateAction.append($('#dateJumpBtn'));panel.append(dateAction);$('.date-picker-row').hidden=true;
  const status=$('#myReplyStatus');new MutationObserver(()=>{status.hidden=!['loading','error'].includes(replyIdentity.status);}).observe(status,{childList:true});

  function isSearchPinned(){return appWindow&&wide.matches&&state.filter==='all';}
  const calendar=$('#dateCalendar');
  new MutationObserver(()=>{
    if(window.FrommGlowME?.calendarInline||!calendar.classList.contains('open'))return;
    requestAnimationFrame(()=>{
      if(panel.hidden||!panel.classList.contains('open'))return;
      const firstDay=calendar.querySelector('.date-day'),box=panel.getBoundingClientRect();
      if(firstDay&&firstDay.getBoundingClientRect().bottom>box.bottom-12)
        panel.scrollTop+=calendar.getBoundingClientRect().top-box.top-12;
    });
  }).observe(calendar,{attributes:true,attributeFilter:['class']});
  function fitPanel(){
    const header=$('.viewer-header').getBoundingClientRect();
    sidebar.style.setProperty('--rail-top',`${Math.max(12,header.bottom+12)}px`);
    searchDock.style.top=`${Math.max(12,header.bottom+12)}px`;
    const dockBottom=searchDock.hidden?0:searchDock.getBoundingClientRect().bottom;const top=Math.max(dockBottom+12,12,Math.min(header.bottom+12,innerHeight-200));
    panel.style.setProperty('--glow-tools-top',`${top}px`);search.style.removeProperty('visibility');
  }
  function syncSelection(n){
    const toolbar=$(".toolbar");toolbar.classList.toggle("has-download-selection",n>0);batchTools.hidden=n===0;
    for(const id of ["selectedCount","selectAllBtn","saveSelectedBtn"]){const el=$("#"+id);el.hidden=n===0;el.inert=n===0;}
  }
  function syncNavigation(){
    const key=state.filter==='live'?state.live.centerMode:state.filter,all=state.filter==='all',pinned=isSearchPinned();
    for(const button of nav.querySelectorAll('button')){const selected=button.dataset.glowNav===key;button.setAttribute('aria-current',selected?'page':'false');button.classList.toggle('active',selected);}
    fields.disabled=!all;search.hidden=!all||pinned;panel.hidden=!all;
    document.documentElement.classList.toggle('chat-search-available',all&&!pinned);
    document.documentElement.dataset.glowLayout=pinned?'pinned':'web';
    if(pinned){if(!panel.classList.contains('open')){openChatToolsPanel();openDateCalendar();}}
    else if(!all&&panel.classList.contains('open')){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
    if(all&&panel.classList.contains('open')&&!calendar.classList.contains('open'))openDateCalendar();
    panel.inert=!all||!panel.classList.contains('open');search.setAttribute('aria-expanded',String(panel.classList.contains('open')));
    close.hidden=pinned;installButton.hidden=appWindow||!promptEvent;
    if(searchWasOpen&&!panel.classList.contains('open')&&panel.contains(document.activeElement)&&all)search.focus({preventScroll:true});searchWasOpen=panel.classList.contains('open');
    syncHeader();fitPanel();syncMatchNav();window.FrommGlass?.sync();
  }
  window.FrommGlowME=Object.freeze({get pinned(){return isSearchPinned();},get rail(){return true;},get railAnimating(){return performance.now()<railMotionUntil;},get calendarInline(){return true;},setRailOpen,fitPanel,syncNavigation,syncHeader,decorateRooms,syncSelection});
  installed.addEventListener('change',()=>{if(installed.matches)appWindow=true;syncNavigation();});wide.addEventListener('change',syncNavigation);
  window.addEventListener('resize',fitPanel,{passive:true});let frame=0;
  window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;fitPanel();});},{passive:true});
  new ResizeObserver(fitPanel).observe($('.viewer-header'));
  new MutationObserver(syncNavigation).observe($('.toolbar'),{subtree:true,attributes:true,attributeFilter:['class','style']});
  new MutationObserver(()=>{panel.inert=!panel.classList.contains('open')||panel.hidden;search.setAttribute('aria-expanded',String(!panel.inert));if(!panel.inert&&!calendar.classList.contains('open'))openDateCalendar();syncMatchNav();}).observe(panel,{attributes:true,attributeFilter:['class']});
  new MutationObserver(syncMatchNav).observe(matchNav,{attributes:true,attributeFilter:['hidden']});
  setRailOpen(false);syncNavigation();updateSelectedCount();
})();

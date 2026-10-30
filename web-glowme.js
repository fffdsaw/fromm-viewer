/* Presentation shell only; existing data, routes and media engines are reused. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const installed = matchMedia('(display-mode: standalone)');
  const wide = matchMedia('(min-width: 1200px)');
  const sidebar = $('#sidebar'), panel = $('#chatToolsPanel');
  const toggle = $('#sidebarToggleBtn'), search = $('#chatToolsBtn');
  if (!sidebar || !panel || !toggle || !search) return;
  let pinned = false, wasAll = null, webLeft = document.body.classList.contains('sidebar-open');
  // Fullscreen temporarily changes display-mode. It must not turn an app window
  // into a browser-tab layout while its current video is playing.
  let appWindow=installed.matches;
  let webRight = panel.classList.contains('open'), promptEvent = null;
  document.documentElement.classList.add('glowme');

  const brand = sidebar.querySelector('.brand');
  brand.replaceChildren(Object.assign(document.createElement('img'), {
    src: 'assets/glowme/logo.png', alt: 'Fromm Viewer', width: 210, height: 116
  }));
  const nav = document.createElement('nav');
  nav.className = 'glowme-nav'; nav.setAttribute('aria-label', '주요 화면');
  const paths = {
    all:'M5 5h14v10H9l-4 4V5Z', media:'M4 4h16v16H4z M4 16l5-6 4 4 3-3 4 5',
    live:'M3 6h12v12H3z M15 10l6-3v10l-6-3',
    replay:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M10 8l6 4-6 4V8Z',
    channel:'M3 10l9-7 9 7v11h-7v-7h-4v7H3V10Z'
  };
  for (const [key, label] of [['all','전체 대화'],['media','미디어'],['live','LIVE'],['replay','Replay'],['channel','Channel']]) {
    const button = document.createElement('button');
    button.type='button'; button.dataset.glowNav=key;
    button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/></svg><span>${label}</span>`;
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        if (['live','replay','channel'].includes(key)) {
          if (state.filter === 'live') await setLiveCenterMode(key);
          else { state.live.centerMode=key; await setFilter('live'); }
        } else await setFilter(key);
      } finally {
        button.disabled=false; syncNavigation();
        if (!pinned) { setSidebarOpen(false); toggle.focus({preventScroll:true}); }
      }
    });
    nav.append(button);
  }
  sidebar.querySelector('.sub').after(nav);
  const installButton = document.createElement('button');
  installButton.type='button'; installButton.id='installAppBtn'; installButton.className='btn glowme-install';
  installButton.textContent='앱으로 설치'; installButton.hidden=true;
  sidebar.append(installButton);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent=event; installButton.hidden=installed.matches;
  });
  window.addEventListener('appinstalled', () => {promptEvent=null; installButton.hidden=true;});
  installButton.addEventListener('click', async () => {
    const pending=promptEvent; if (!pending) return;
    promptEvent=null; installButton.hidden=true;
    await pending.prompt(); await pending.userChoice;
  });

  // Reparent the actual search controls, preserving all existing listeners/state.
  // A disabled fieldset prevents accidental searching while a video is playing.
  const fields=document.createElement('fieldset'); fields.className='glowme-search-fields';
  const legend=document.createElement('legend'); legend.className='glowme-sr'; legend.textContent='대화 검색 및 날짜 선택';
  fields.append(legend,...panel.childNodes);
  const close=document.createElement('button'); close.type='button'; close.className='glowme-search-close';
  close.setAttribute('aria-label','검색 패널 닫기');
  close.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  close.addEventListener('click', () => {closeChatToolsPanel(); search.focus({preventScroll:true});});
  const unavailable=document.createElement('p'); unavailable.className='glowme-search-notice';
  unavailable.textContent='대화 검색·날짜 찾기는 전체 대화 화면에서 사용할 수 있습니다.';
  unavailable.hidden=true;
  panel.append(close,unavailable,fields);
  panel.setAttribute('role','complementary'); panel.setAttribute('aria-label','대화 검색 및 달력');
  $('.main').append(panel);
  search.setAttribute('aria-controls','chatToolsPanel');
  // Like the hamburger, keep the search trigger above either independent drawer.
  // A real slot preserves toolbar geometry while the button stays at that spot.
  const searchSlot=document.createElement('span'); searchSlot.className='glowme-search-slot';
  searchSlot.setAttribute('aria-hidden','true'); search.before(searchSlot);
  document.body.append(search); search.classList.add('glowme-search-toggle');

  function fitPanel() {
    const slot=searchSlot.getBoundingClientRect();
    search.style.left=`${slot.left}px`; search.style.top=`${slot.top}px`;
    search.style.visibility=slot.bottom>0 ? 'visible':'hidden';
    const headerElement=$('.viewer-header'),header=headerElement.getBoundingClientRect();
    const gap=parseFloat(getComputedStyle(headerElement).rowGap)||12;
    const top=Math.max(12, Math.min(header.bottom+gap, innerHeight-180));
    panel.style.setProperty('--glow-tools-top', `${top}px`);
  }
  function syncNavigation() {
    const key=state.filter==='live' ? state.live.centerMode : state.filter;
    for (const button of nav.children) button.setAttribute('aria-current', button.dataset.glowNav===key ? 'page':'false');
    const all=state.filter==='all'; fields.disabled=!all; unavailable.hidden=all;
    panel.classList.toggle('glowme-search-unavailable', !all);
    if (pinned && all && wasAll!==true) openDateCalendar();
    wasAll=all;
    search.setAttribute('aria-expanded', String(panel.classList.contains('open')));
    panel.inert=!panel.classList.contains('open');
  }
  function syncLayout() {
    if(installed.matches) appWindow=true;
    const next=appWindow && wide.matches;
    if (next !== pinned) {
      if (next) { webLeft=document.body.classList.contains('sidebar-open'); webRight=panel.classList.contains('open'); }
      pinned=next;
      document.documentElement.dataset.glowLayout=pinned ? 'pinned':'web';
      if (pinned) {setSidebarOpen(true); openChatToolsPanel(); openDateCalendar();}
      else {setSidebarOpen(webLeft); if(webRight) openChatToolsPanel(); else closeChatToolsPanel();}
    }
    document.documentElement.dataset.glowLayout=pinned ? 'pinned':'web';
    toggle.hidden=pinned; search.hidden=pinned;
    installButton.hidden=appWindow || !promptEvent;
    fitPanel(); syncNavigation(); positionSidebarToggle();
  }
  window.FrommGlowME=Object.freeze({get pinned(){return pinned;},fitPanel,syncNavigation});
  installed.addEventListener('change',syncLayout); wide.addEventListener('change',syncLayout);
  window.addEventListener('resize',fitPanel,{passive:true});
  let scrollFrame=0;
  window.addEventListener('scroll',()=>{
    if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;fitPanel();});
  },{passive:true});
  new ResizeObserver(fitPanel).observe($('.viewer-header'));
  // Watch only toolbar presentation attributes, never incoming video frames/messages.
  new MutationObserver(syncNavigation).observe($('.toolbar'),{subtree:true,attributes:true,attributeFilter:['class','style']});
  new MutationObserver(syncNavigation).observe(panel,{attributes:true,attributeFilter:['class']});
  syncLayout();
})();

/* Phase 3 layout experiment; loaded after the original Glow ME presentation shell.
 * Preserves the existing filter/data/auth logic and the original room click handlers.
 * Intentionally separate from PR #53 for later Codex comparison.
 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const sidebar = $('#sidebar');
  const toolbar = $('.toolbar');
  const rooms = $('#rooms');
  const title = $('#artistTitle');
  if (!sidebar || !toolbar || !rooms || !title || !window.FrommGlowME) return;
  document.documentElement.classList.add('glowme-phase3-experiment');

  // Glow ME v3.3 has NO middle toolbar. The floating rail starts below only
  // the artist header. Measure that header because artist counts can wrap.
  const header = $('.viewer-header');
  let railTopFrame = 0;
  let previousRailTop = -1;
  function updateRailTop() {
    railTopFrame = 0;
    if (!header?.isConnected || !sidebar.isConnected) return;
    const headerBottom = header.getBoundingClientRect().bottom;
    // Below the *artist header alone*; never use the removed toolbar's bounds.
    const desired = Math.max(8, Math.ceil(headerBottom + 8));
    const top = Math.min(desired, Math.max(8, window.innerHeight - 120));
    if (Math.abs(top - previousRailTop) < 1) return;
    previousRailTop = top;
    document.documentElement.style.setProperty('--glow-rail-top', top + 'px');
  }
  function scheduleRailTop() {
    if (!railTopFrame) railTopFrame = requestAnimationFrame(updateRailTop);
  }
  if (header) {
    const heightObserver = new ResizeObserver(scheduleRailTop);
    heightObserver.observe(header);
    window.addEventListener('resize', scheduleRailTop, {passive:true});
    window.addEventListener('scroll', scheduleRailTop, {passive:true});
    document.fonts?.ready?.then(scheduleRailTop);
    scheduleRailTop();
  }

  // Keep the original filter buttons in the DOM for their existing listeners.
  // Only remove the previous duplicate five-item navigation created by Glow ME.
  sidebar.querySelector('.glowme-nav')?.remove();
  const nav = document.createElement('nav');
  nav.className = 'glowme-nav glowme-phase3-nav';
  nav.setAttribute('aria-label', '콘텐츠 탐색');
  const icons = {
    all:'M5 5h14v10H9l-4 4V5Z',
    media:'M4 4h16v16H4z M4 16l5-6 4 4 3-3 4 5',
    image:'M4 4h16v16H4z M4 16l5-6 4 4 3-3 4 5',
    video:'M4 6h12v12H4z M16 9l5-3v12l-5-3z',
    sound:'M9 7H5v10h4l5 4V3L9 7z M18 8q4 4 0 8',
    vote:'M4 20V10h4v10z M10 20V4h4v16z M16 20v-8h4v8z',
    live:'M3 6h12v12H3z M15 10l6-3v10l-6-3',
    replay:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M10 8l6 4-6 4V8Z',
    channel:'M3 10l9-7 9 7v11h-7v-7h-4v7H3V10Z'
  };
  const items = [
    ['all','전체 대화'],['media','미디어'],['image','사진'],['video','영상'],
    ['sound','음성'],['vote','투표'],['live','LIVE'],['replay','Replay'],['channel','Channel']
  ];
  items.forEach(([key,label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.glowNav = key;
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + icons[key] + '"/></svg><span>' + label + '</span>';
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        if (key === 'live' || key === 'replay' || key === 'channel') {
          if (state.filter === 'live') await setLiveCenterMode(key);
          else {
            state.live.centerMode = key;
            await setFilter('live');
          }
        } else {
          await setFilter(key);
        }
      } catch (error) {
        console.error('Glow ME phase 3: navigation failed', error);
      } finally {
        button.disabled = false;
        syncNavigation();
        if (matchMedia('(pointer:coarse)').matches) setExpanded(false);
      }
    });
    nav.append(button);
  });
  sidebar.querySelector('.sub').after(nav);

  // Calm navigation highlight: change target only when the hovered item
  // changes, not at every pixel of mouse movement. This also avoids repeated
  // layout reads/repaints caused by the old cursor-based light variables.
  const bubble = document.createElement('span');
  bubble.className = 'glowme-follow-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  nav.prepend(bubble);
  const motionDisabled = matchMedia('(prefers-reduced-motion: reduce)');
  let hoveredButton = null;
  let bubbleFrame = 0;
  let previousBubbleTarget = null;
  let previousBubbleY = null;
  function scheduleBubble() {
    if (bubbleFrame) return;
    bubbleFrame = requestAnimationFrame(() => {
      bubbleFrame = 0;
      const focused = nav.contains(document.activeElement) &&
        document.activeElement.matches(':focus-visible')
        ? document.activeElement.closest('button[data-glow-nav]') : null;
      const selected = nav.querySelector('button[aria-current="page"]');
      const target = hoveredButton || focused || selected || nav.querySelector('button[data-glow-nav]');
      if (!target) return;
      const navBox = nav.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const y = Math.round(rect.top - navBox.top);
      if (target !== previousBubbleTarget || y !== previousBubbleY) {
        bubble.style.transform = 'translate3d(1px,' + y + 'px,0)';
        previousBubbleTarget = target;
        previousBubbleY = y;
      }
      bubble.style.height = rect.height + 'px';
      bubble.style.opacity = '1';
    });
  }
  nav.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const button = event.target.closest('button[data-glow-nav]');
    if (button && nav.contains(button) && hoveredButton !== button) {
      hoveredButton = button;
      scheduleBubble();
    }
  });
  nav.addEventListener('pointerout', event => {
    const previous = event.target.closest?.('button[data-glow-nav]');
    if (previous && hoveredButton === previous &&
        !previous.contains(event.relatedTarget)) {
      hoveredButton = null;
      scheduleBubble();
    }
  });
  nav.addEventListener('pointerleave', () => {
    hoveredButton = null;
    scheduleBubble();
  });
  nav.addEventListener('focusin', scheduleBubble);
  nav.addEventListener('focusout', () => queueMicrotask(scheduleBubble));
  const sizeObserver = new ResizeObserver(scheduleBubble);
  sizeObserver.observe(nav);
  motionDisabled.addEventListener('change', scheduleBubble);

  // B v3.3: retain only the artist's name, with the existing live media-count
  // element immediately below it. Its owner renderCountsOnly() keeps updating it.
  const artistCopy = title.closest('.artist-copy');
  const countNode = $('#counts');
  if (artistCopy && countNode) {
    const context = document.createElement('span');
    context.className = 'glowme-artist-context';
    context.textContent = '전체 대화';
    // Name first, then state and the original live count beneath it.
    title.after(context);
    context.after(countNode);
  }
  // Preserve status announcements without a visual middle bar.
  // It appears below the counts only while records are actively loading.
  const runtimeStatus = $('#scanState');
  if (runtimeStatus && artistCopy) {
    runtimeStatus.classList.add('glowme-runtime-status');
    artistCopy.append(runtimeStatus);
  }

  // Keep the core app's original controls and click handlers, but relocate
  // them to contextual surfaces rather than retaining a visible toolbar.
  const main = $('.main');
  const timeline = $('#timeline');
  const sort = $('#sortControls');
  const selection = $('#selectedCount');
  const selectAll = $('#selectAllBtn');
  const save = $('#saveSelectedBtn');
  const sortHost = document.createElement('div');
  sortHost.className = 'glowme-context-sort';
  sortHost.setAttribute('role','group');
  sortHost.setAttribute('aria-label','미디어 정렬 및 선택 도구');
  sortHost.hidden = true;
  if (main && timeline) main.insertBefore(sortHost,timeline);
  if (sort) sortHost.append(sort);

  // The existing sorting button always remains at the far right. Selection
  // tools expand to its left instead of covering content at the bottom.
  const actionHost = document.createElement('div');
  actionHost.className = 'glowme-selection-actions';
  actionHost.setAttribute('role','group');
  actionHost.setAttribute('aria-label','선택한 미디어 저장');
  if (selection && selectAll && save) {
    actionHost.append(selection,selectAll,save);
    sortHost.insertBefore(actionHost,sort || null);
  }
  const sortVisible = () => !!sort && sort.style.display !== 'none' && !!sort.style.display;
  let syncSelectionControls = () => {};
  function syncContextToolbar() {
    const mode = state.filter === 'live' ? state.live.centerMode : state.filter;
    const selectable = ['media','image','video','sound'].includes(mode) ||
      (state.filter === 'live' && ['replay','channel'].includes(mode));
    const hasSelection = !!selection?.classList.contains('has-selection');
    const available = !!(selection && selectAll && save);
    const showActions = available && (selectable || hasSelection);
    actionHost.classList.toggle('is-open',showActions);
    actionHost.inert = !showActions;
    actionHost.setAttribute('aria-hidden',String(!showActions));
    if (save && !save.dataset.glowSelectionInProgress)
      save.disabled = !hasSelection;
    sortHost.hidden = !sortVisible() && !showActions;
  }
  syncSelectionControls = syncContextToolbar;
  if (sort) new MutationObserver(syncContextToolbar).observe(sort,{
    attributes:true,attributeFilter:['style']
  });
  if (selection) new MutationObserver(syncContextToolbar).observe(selection,{
    attributes:true,attributeFilter:['class'],childList:true,subtree:true
  });
  syncContextToolbar();

  // The floating search panel owns keyword/calendar/replies inputs. A separate
  // contextual dock (not inside the panel) keeps ↑·↓ usable while reading.
  // Reparent the REAL controls: their existing core event handlers survive.
  const searchButton = $('#chatToolsBtn');
  const searchPanel = $('#chatToolsPanel');
  const matchNavigation = $('#chatMatchNav');
  const matchDock = document.createElement('div');
  matchDock.className = 'glowme-chat-match-dock';
  matchDock.hidden = true;
  const matchLabel = document.createElement('span');
  matchLabel.className = 'glowme-chat-match-label';
  matchLabel.textContent = '검색 결과 이동';
  if (main && matchNavigation) {
    matchDock.setAttribute('role','group');
    matchDock.setAttribute('aria-label','대화 검색 및 답장 결과 이동');
    matchDock.append(matchLabel,matchNavigation);
    main.append(matchDock);
    function syncMatchDock() {
      const active = !matchNavigation.hidden && state.filter === 'all';
      matchDock.hidden = !active;
      const label = state.onlyMyReplies ? '내 글에 온 답장 이동' : '검색 결과 이동';
      if (matchLabel.textContent !== label) matchLabel.textContent = label;
    }
    new MutationObserver(syncMatchDock).observe(matchNavigation,{
      attributes:true,attributeFilter:['hidden'],childList:true,subtree:true
    });
    // A filter switch may hide this dock even if matchNavigation remained open.
    syncMatchDock();
  }
  const searchTitle = searchPanel?.querySelector('.chat-tools-title');
  if (searchTitle) searchTitle.textContent = '대화 찾기';

  // The legacy pinned PWA search drawer could never be closed through the
  // regular close function. Allow this experiment's floating magnifier to
  // toggle it explicitly while leaving the original app listeners untouched.
  function setSearchOpen(open) {
    if (!searchButton || !searchPanel) return;
    searchPanel.classList.toggle('open',open);
    searchPanel.setAttribute('aria-hidden',String(!open));
    searchButton.classList.toggle('active',open);
    searchButton.setAttribute('aria-expanded',String(open));
    searchPanel.inert = !open;
    window.FrommGlowME?.syncNavigation();
    if (open) {
      window.FrommGlowME?.fitPanel();
      requestAnimationFrame(() => $('#chatSearchInput')?.focus({preventScroll:true}));
    }
  }
  if (searchButton && searchPanel) {
    // Never leave a legacy pinned panel auto-open after initializing v3.3.
    setSearchOpen(false);
    // Handle both normal Chrome and installed/PWA layouts in one place.
    // Capture before the legacy toolbar click handler can double-toggle.
    searchButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.filter === 'all') setSearchOpen(!searchPanel.classList.contains('open'));
    },true);
    searchPanel.querySelector('.glowme-search-close')?.addEventListener('click',event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setSearchOpen(false);
      searchButton.focus({preventScroll:true});
    },true);
    document.addEventListener('pointerdown',event => {
      if (searchPanel.classList.contains('open') &&
          !searchPanel.contains(event.target) && !searchButton.contains(event.target))
        setSearchOpen(false);
    },{passive:true});
    document.addEventListener('keydown',event => {
      if (event.key === 'Escape' && searchPanel.classList.contains('open')) {
        setSearchOpen(false);
        searchButton.focus({preventScroll:true});
      }
    });
  }

  const roomSection = rooms.closest('.card');
  roomSection?.classList.add('glowme-artist-section');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'glowme-rail-trigger';
  trigger.setAttribute('aria-controls', 'sidebar');
  // Reuse the existing project logo, not a second letter-mark. The same
  // button remains the expand/collapse control for touch and keyboard users.
  const triggerLogo = document.createElement('img');
  triggerLogo.src = 'assets/glowme/logo.png';
  triggerLogo.alt = '';
  triggerLogo.decoding = 'async';
  trigger.append(triggerLogo);
  sidebar.prepend(trigger);
  const lowHeight = matchMedia('(max-height: 540px)');
  let expanded = false;
  let closeTimer = 0;

  function setExpanded(open) {
    expanded = Boolean(open || lowHeight.matches);
    sidebar.dataset.railExpanded = String(expanded);
    // The remaining vertical lens movement stays synchronized to its row.
    scheduleBubble();
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.setAttribute('aria-label', expanded ? '아티스트 메뉴 접기' : '아티스트 메뉴 펼치기');
    // A collapsed rail still contains clickable profile avatars.
    if (roomSection) roomSection.inert = false;
    const install = $('#installAppBtn');
    if (install) install.inert = !expanded;
  }
  function deferCollapse() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      // A mouse-clicked item may retain DOM focus after the pointer leaves.
      // Keep expanded only for real keyboard focus, not incidental mouse focus.
      const active = document.activeElement;
      const keyboardFocus = sidebar.contains(active) && active?.matches(':focus-visible');
      if (!sidebar.matches(':hover') && !keyboardFocus)
        setExpanded(false);
    }, 240);
  }
  trigger.addEventListener('click', () => {
    clearTimeout(closeTimer);
    setExpanded(!expanded);
  });
  sidebar.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') {
      clearTimeout(closeTimer);
      setExpanded(true);
    }
  });
  sidebar.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') deferCollapse();
  });
  sidebar.addEventListener('focusin', event => {
    clearTimeout(closeTimer);
    // Focusing the collapse/logo trigger itself must not reopen the rail.
    if (event.target !== trigger) setExpanded(true);
  });
  sidebar.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (!sidebar.contains(document.activeElement)) deferCollapse();
    });
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      setExpanded(false);
      trigger.focus({preventScroll:true});
    }
  });
  document.addEventListener('pointerdown', event => {
    if (expanded && event.pointerType !== 'mouse' && !sidebar.contains(event.target))
      setExpanded(false);
  });
  lowHeight.addEventListener('change', () => setExpanded(false));
  // Legacy setSidebarOpen(false) makes #sidebar inert, even when the floating
  // rail remains visible. Undo this in case any old code path runs.
  function keepRailInteractive() {
    if (sidebar.inert) sidebar.inert = false;
    if (sidebar.getAttribute('aria-hidden') !== 'false')
      sidebar.setAttribute('aria-hidden','false');
  }
  new MutationObserver(keepRailInteractive).observe(sidebar,{
    attributes:true,attributeFilter:['inert','aria-hidden']
  });
  setSidebarOpen(true);
  keepRailInteractive();
  setExpanded(false);

  function decorateRooms() {
    const buttons = [...rooms.querySelectorAll(':scope > .room')];
    buttons.forEach((button,index) => {
      if (button.classList.contains('glowme-room-enhanced')) return;
      const host = state.rooms?.[index]?.host || {};
      const name = button.textContent.trim();
      const avatar = document.createElement('span');
      avatar.className = 'glowme-room-avatar';
      avatar.setAttribute('aria-hidden','true');
      avatar.textContent = name.charAt(0) || 'F';
      const raw = host.profileUrlThumbnail || host.profileUrl || host.defaultProfileUrl;
      const url = raw ? normalizeMediaUrl(raw) : '';
      if (url) {
        const img = document.createElement('img');
        img.loading = index < 8 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.addEventListener('load', () => avatar.classList.add('has-photo'));
        img.addEventListener('error', () => img.remove());
        img.src = url;
        avatar.append(img);
      }
      const label = document.createElement('span');
      label.className = 'glowme-room-name';
      label.textContent = name;
      button.replaceChildren(avatar,label);
      button.classList.add('glowme-room-enhanced');
      button.setAttribute('aria-label',name);
    });
  }
  new MutationObserver(decorateRooms).observe(rooms,{childList:true});
  decorateRooms();

  // Missing room rows are not a reason to fabricate subscribed artists.
  // Explicitly explain the empty state and offer a scoped retry using the
  // application's original room loader. This status is outside #rooms so the
  // original position-based click handlers remain untouched.
  const roomsStatus = document.createElement('div');
  roomsStatus.className = 'glowme-room-empty-status';
  roomsStatus.hidden = true;
  const roomsStatusText = document.createElement('span');
  const roomsRetry = document.createElement('button');
  roomsRetry.type = 'button';
  roomsRetry.className = 'glowme-room-retry';
  roomsRetry.textContent = '목록 다시 불러오기';
  roomsStatus.append(roomsStatusText,roomsRetry);
  roomSection?.append(roomsStatus);
  function syncRoomStatus() {
    if (!roomSection) return;
    const count = rooms.querySelectorAll(':scope > .room').length;
    const authenticated = Boolean(currentAuth()?.token);
    // The existing local-only scrolling fixture is not an account error.
    const fixture = !!rooms.querySelector('.glowme-demo-room');
    roomsStatus.hidden = count > 0 || fixture;
    roomsStatusText.textContent = authenticated
      ? '아티스트 목록이 비어 있습니다. 연결 상태를 확인해 주세요.'
      : '로그인 후 구독 아티스트가 표시됩니다.';
    roomsRetry.hidden = !authenticated;
  }
  roomsRetry.addEventListener('click', async () => {
    if (!currentAuth()?.token || roomsRetry.disabled) return;
    roomsRetry.disabled = true;
    roomsStatusText.textContent = '아티스트 목록을 확인하는 중…';
    try {
      await loadRooms();
      decorateRooms();
      syncRoomStatus();
    } catch (error) {
      console.warn('Glow ME artist list refresh failed', error);
      roomsStatusText.textContent = '목록을 불러오지 못했습니다. 로그인·확장프로그램 연결을 확인해 주세요.';
    } finally {
      roomsRetry.disabled = false;
    }
  });
  new MutationObserver(syncRoomStatus).observe(rooms,{childList:true});
  syncRoomStatus();

  // A clearly labeled *local-only* scroll fixture, never real account data.
  // This is intentionally rendered only on localhost without an auth token,
  // and is removed automatically when loadRooms() replaces #rooms.
  const previewHost = ['127.0.0.1','localhost','::1'].includes(location.hostname);
  const hasRealSession = Boolean(currentAuth()?.token);
  if (previewHost && !hasRealSession && !rooms.children.length && !state.rooms?.length) {
    const note = document.createElement('div');
    note.className = 'glowme-demo-note';
    note.textContent = '샘플 목록 · 스크롤 테스트 전용';
    rooms.append(note);
    for (let i = 1; i <= 32; i++) {
      const item = document.createElement('div');
      item.className = 'glowme-demo-room';
      const avatar = document.createElement('span');
      avatar.className = 'glowme-demo-avatar';
      avatar.setAttribute('aria-hidden','true');
      avatar.textContent = String(i).padStart(2,'0');
      const label = document.createElement('span');
      label.className = 'glowme-demo-name';
      label.textContent = '샘플 아티스트 ' + String(i).padStart(2,'0');
      item.append(avatar,label);
      rooms.append(item);
    }
  }

  syncRoomStatus();

  function syncNavigation() {
    const key = state.filter === 'live' ? state.live.centerMode : state.filter;
    for (const button of nav.querySelectorAll('button[data-glow-nav]'))
      button.setAttribute('aria-current',button.dataset.glowNav === key ? 'page' : 'false');
    scheduleBubble();
    const context = $('.glowme-artist-context');
    const labels = {
      all:'전체 대화',media:'미디어',image:'사진',video:'영상',sound:'음성',
      vote:'투표',live:'LIVE',replay:'Replay',channel:'Channel'
    };
    if (context) context.textContent = state.filter === 'all'
      ? (state.onlyMyReplies ? '내 글에 온 답장' : (state.chatQuery?.trim() ? '대화 검색 중' : labels.all))
      : (labels[key] || labels.all);
    if (searchButton) searchButton.hidden = state.filter !== 'all';
    syncSelectionControls();
    if (matchDock) matchDock.hidden = state.filter !== 'all' || !!matchNavigation?.hidden;
    if (state.filter !== 'all' && searchPanel?.classList.contains('open')) {
      setSearchOpen(false);
    }
  }
  new MutationObserver(syncNavigation).observe(toolbar,{
    subtree:true,attributes:true,attributeFilter:['class','style']
  });
  const artistTitle = $('#artistTitle');
  if (artistTitle) new MutationObserver(syncNavigation).observe(artistTitle,{childList:true});
  if (countNode) new MutationObserver(syncNavigation).observe(countNode,{
    childList:true,subtree:true,characterData:true
  });
  syncNavigation();
  window.FrommGlowME.fitPanel();
  scheduleRailTop();
  // Logo/sidebar transitions can change row positions without a navigation event.
  sidebar.addEventListener('transitionend', event => {
    if (event.propertyName === 'width') scheduleBubble();
  });
})();
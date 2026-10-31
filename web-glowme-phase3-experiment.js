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

  // A single optical selection lens follows the cursor between navigation
  // rows, then returns to the actually selected filter when the pointer leaves.
  // It is decorative; keyboard focus and aria-current still carry the state.
  const bubble = document.createElement('span');
  bubble.className = 'glowme-follow-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  nav.prepend(bubble);
  const motionDisabled = matchMedia('(prefers-reduced-motion: reduce)');
  let hoveredButton = null;
  let focusedButton = null;
  let pointerX = null;
  let pointerY = null;
  let bubbleFrame = 0;

  function scheduleBubble() {
    if (bubbleFrame) return;
    bubbleFrame = requestAnimationFrame(() => {
      bubbleFrame = 0;
      const selected = nav.querySelector('button[aria-current="page"]');
      const target = hoveredButton || focusedButton || selected || nav.querySelector('button');
      if (!target) return;
      const navBox = nav.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const pointing = hoveredButton === target && pointerX !== null;
      const fractionX = pointing ? Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width)) : .5;
      const fractionY = pointing ? Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height)) : .36;
      // Width belongs to CSS as a percentage of the rail. A fixed inline
      // pixel width causes the lens to shrink *after* its parent has closed.
      // Only the row position animates; both glass and rail resize together.
      bubble.style.height = rect.height + 'px';
      bubble.style.transform = 'translate3d(1px,' +
        Math.round(rect.top - navBox.top) + 'px,0)';
      bubble.style.setProperty('--bubble-light-x', Math.round(fractionX * 100) + '%');
      bubble.style.setProperty('--bubble-light-y', Math.round(fractionY * 100) + '%');
      bubble.style.opacity = '1';
    });
  }
  nav.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const button = event.target.closest('button[data-glow-nav]');
    if (!button || !nav.contains(button)) return;
    hoveredButton = button;
    pointerX = event.clientX;
    pointerY = event.clientY;
    scheduleBubble();
  });
  nav.addEventListener('pointerleave', () => {
    hoveredButton = null;
    pointerX = pointerY = null;
    scheduleBubble();
  });
  nav.addEventListener('focusin', event => {
    const button = event.target.closest('button[data-glow-nav]');
    if (button) {
      focusedButton = button;
      scheduleBubble();
    }
  });
  nav.addEventListener('focusout', () => {
    queueMicrotask(() => {
      focusedButton = nav.contains(document.activeElement)
        ? document.activeElement.closest('button[data-glow-nav]') : null;
      scheduleBubble();
    });
  });
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
    context.textContent = '현재 보고 있는 대화';
    title.before(context);
    title.after(countNode);
  }
  // Operational history/loading messages are retained outside the identity block.
  const runtimeStatus = $('#scanState');
  if (runtimeStatus) {
    runtimeStatus.classList.add('glowme-runtime-status');
    toolbar.append(runtimeStatus);
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
    if (roomSection) roomSection.inert = !expanded;
    const install = $('#installAppBtn');
    if (install) install.inert = !expanded;
  }
  function deferCollapse() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!sidebar.matches(':hover') && !sidebar.contains(document.activeElement))
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
  setSidebarOpen(true);
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
        img.loading = 'lazy';
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

  function syncNavigation() {
    const key = state.filter === 'live' ? state.live.centerMode : state.filter;
    for (const button of nav.querySelectorAll('button[data-glow-nav]'))
      button.setAttribute('aria-current',button.dataset.glowNav === key ? 'page' : 'false');
    scheduleBubble();
    const context = $('.glowme-artist-context');
    const labels = {
      all:'대화',media:'미디어',image:'사진',video:'영상',sound:'음성',
      vote:'투표',live:'LIVE',replay:'Replay',channel:'Channel'
    };
    if (context) context.textContent = '현재 보고 있는 ' + (labels[key] || '대화');
  }
  new MutationObserver(syncNavigation).observe(toolbar,{
    subtree:true,attributes:true,attributeFilter:['class','style']
  });
  const artistTitle = $('#artistTitle');
  if (artistTitle) new MutationObserver(syncNavigation).observe(artistTitle,{childList:true});
  syncNavigation();
  // Logo/sidebar transitions can change row positions without a navigation event.
  sidebar.addEventListener('transitionend', event => {
    if (event.propertyName === 'width') scheduleBubble();
  });
})();
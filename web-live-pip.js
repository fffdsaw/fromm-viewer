// Video-only PiP. Native JPEG decoding, frame ACKs and helper audio stay in place.
(() => {
  let pipWindow = null, mirror = null, source = null, pending = false, version = 0, failed = false;
  const readySources = new WeakMap();
  const assignedSources = new WeakMap();
  const timeline = document.getElementById('timeline');
  if (!timeline) return;

  function isLive() {
    return state.filter === 'live' && state.live.centerMode === 'live';
  }
  function nativeSource() {
    if (!state.live.client) return null;
    const image = document.getElementById('nativeLiveVideo');
    if (!image || !document.getElementById('liveVideoGrid')?.contains(image) || image.src.length >= 800000 ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image.src)) return null;
    return readySources.get(image) === state.live.connectionSeq ? image : null;
  }
  function webSource() {
    if (!state.live.client) return null;
    return document.querySelector('#liveVideoGrid video');
  }
  function documentPipSupported() {
    return window.isSecureContext && window.top === window &&
      typeof window.documentPictureInPicture?.requestWindow === 'function';
  }
  function sync() {
    if (pipWindow && (pipWindow.closed || !isLive() || source !== nativeSource())) close();
    if (mirror && source && !pipWindow?.closed && mirror.src !== source.src) mirror.src = source.src;
    const head = timeline.querySelector('.live-head');
    if (!head || !isLive()) return;
    let button = document.getElementById('livePipBtn');
    if (!button) {
      button = document.createElement('button');
      button.id = 'livePipBtn';
      button.className = 'live-mini-btn live-pip-btn';
      button.type = 'button';
      button.addEventListener('click', toggle);
      head.append(button);
    }
    const native = nativeSource(), video = webSource();
    const supported = native ? documentPipSupported() :
      !!(document.pictureInPictureEnabled && video?.requestPictureInPicture);
    const ready = !!native || !!(video && video.readyState >= 2 && !video.disablePictureInPicture);
    const active = !!pipWindow || !!(video && document.pictureInPictureElement === video);
    button.disabled = pending || (!active && (!ready || !supported));
    const label = active ? 'PiP 닫기' : 'PiP';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-label', active ? 'LIVE 영상 PiP 닫기' : 'LIVE 영상만 PiP로 보기');
    button.setAttribute('aria-pressed', String(active));
    button.title = failed ? 'PiP 창을 열지 못했습니다. 브라우저의 PiP 지원과 허용 설정을 확인해주세요.' :
      native && !documentPipSupported() ? '영상 PiP는 최신 PC Chrome 또는 Edge의 보안 연결에서 지원됩니다.' :
      !ready ? 'LIVE 영상이 도착하면 PiP를 사용할 수 있습니다.' :
      !supported ? '이 브라우저는 LIVE 영상 PiP를 지원하지 않습니다.' : '댓글 없이 LIVE 영상만 표시합니다.';
  }
  function close() {
    version++;
    const win = pipWindow;
    pipWindow = null; mirror = null; source = null;
    if (win && !win.closed) win.close();
  }
  async function toggle() {
    if (pending) return;
    if (pipWindow) { close(); sync(); return; }
    const native = nativeSource(), video = webSource();
    if (!isLive() || (!native && !video)) return;
    if (!native && document.pictureInPictureElement === video) {
      try { await document.exitPictureInPicture(); } catch {}
      sync(); return;
    }
    const ticket = ++version, sequence = state.live.connectionSeq;
    const room = state.live.currentLiveRoomId;
    pending = true;
    failed = false;
    sync();
    try {
      if (native) {
        // requestWindow must run directly in the click's user activation.
        const win = await window.documentPictureInPicture.requestWindow({width: 480, height: 360});
        if (ticket !== version || sequence !== state.live.connectionSeq || room !== state.live.currentLiveRoomId ||
            !isLive() || native !== nativeSource() || win.closed) { win.close(); return; }
        pipWindow = win; source = native;
        win.addEventListener('pagehide', () => {
          if (pipWindow === win) { close(); sync(); }
        }, {once: true});
        win.document.title = 'LIVE 영상';
        const style = win.document.createElement('style');
        style.textContent = 'html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000}img{display:block;width:100%;height:100%;object-fit:contain}';
        win.document.head.append(style);
        mirror = win.document.createElement('img');
        mirror.alt = 'LIVE 영상';
        mirror.src = native.src;
        win.document.body.replaceChildren(mirror);
      } else {
        await video.requestPictureInPicture();
        if (ticket !== version || sequence !== state.live.connectionSeq || room !== state.live.currentLiveRoomId ||
            !isLive() || video !== webSource()) {
          if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
        }
      }
    } catch {
      close();
      failed = true;
    } finally {
      pending = false;
      sync();
    }
  }
  function closeAll() {
    close();
    const video = webSource();
    if (video && document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => {});
  }
  const originalRender = renderLiveView, originalStop = stopLivePlayback;
  renderLiveView = function (...args) { closeAll(); const result = originalRender.apply(this, args); sync(); return result; };
  stopLivePlayback = function (...args) { closeAll(); const result = originalStop.apply(this, args); sync(); return result; };
  new MutationObserver((records = []) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target.id === 'nativeLiveVideo') {
        assignedSources.set(record.target, state.live.connectionSeq);
      }
    }
    sync();
  }).observe(timeline, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
  for (const type of ['load', 'loadeddata', 'enterpictureinpicture', 'leavepictureinpicture']) timeline.addEventListener(type, event => {
    if (type === 'load' && event.target.id === 'nativeLiveVideo' && event.target.naturalWidth > 0 &&
        assignedSources.get(event.target) === state.live.connectionSeq) {
      readySources.set(event.target, state.live.connectionSeq);
    }
    sync();
  }, true);
  window.addEventListener('pagehide', closeAll);
  const existing = document.getElementById('nativeLiveVideo');
  if (existing?.naturalWidth > 0) {
    assignedSources.set(existing, state.live.connectionSeq);
    readySources.set(existing, state.live.connectionSeq);
  }
  sync();
})();

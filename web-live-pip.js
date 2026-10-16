// Video-only PiP. Native JPEG decoding, frame ACKs and helper audio stay in place.
(() => {
  let pipWindow = null, mirror = null, source = null, pending = false, version = 0, failed = false;
  let canvasPlayer = null;
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
  function videoPipSupported() {
    return window.isSecureContext && window.top === window && document.pictureInPictureEnabled &&
      typeof HTMLVideoElement !== 'undefined' && typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function' &&
      typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }
  function drawFrame(player) {
    if (player !== canvasPlayer || player.image !== nativeSource() || !player.image.complete) return;
    const image = player.image, scale = Math.min(640 / image.naturalWidth, 360 / image.naturalHeight);
    if (!Number.isFinite(scale) || scale <= 0) return;
    const ctx = player.canvas.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 640, 360);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    ctx.drawImage(image, (640 - width) / 2, (360 - height) / 2, width, height);
    player.stream.getVideoTracks()[0].requestFrame?.();
  }
  function disposePlayer(player) {
    if (!player) return;
    player.stream?.getTracks().forEach(track => track.stop());
    player.video.pause(); player.video.srcObject = null; player.video.remove();
  }
  async function prepareVideo(image) {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    const stream = canvas.captureStream(0);
    // A load event drives each capture, independently of tab visibility/rAF.
    if (typeof stream.getVideoTracks()[0]?.requestFrame !== 'function') {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('CANVAS_FRAME_UNAVAILABLE');
    }
    const video = document.createElement('video');
    video.id = 'livePipVideo'; video.muted = true; video.playsInline = true;
    video.disableRemotePlayback = true;
    video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
    video.style.cssText = 'position:fixed;width:1px;height:1px;left:0;bottom:0;opacity:0;pointer-events:none';
    const player = {image, canvas, stream, video};
    canvasPlayer = player;
    video.addEventListener('leavepictureinpicture', () => {
      if (canvasPlayer === player) { close(); sync(); }
    });
    document.body.append(video); video.srcObject = stream;
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('PIP_VIDEO_TIMEOUT')); }, 2500);
      const cleanup = () => { clearTimeout(timer); video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', error); };
      const loaded = () => { cleanup(); resolve(); };
      const error = () => { cleanup(); reject(new Error('PIP_VIDEO_FAILED')); };
      video.addEventListener('loadeddata', loaded, {once: true}); video.addEventListener('error', error, {once: true});
    });
    drawFrame(player);
    video.play().catch(() => {});
    await ready;
    return player;
  }
  function sync() {
    if (pipWindow && (pipWindow.closed || !isLive() || source !== nativeSource())) close();
    if (canvasPlayer && (!isLive() || canvasPlayer.image !== nativeSource())) close();
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
    const supported = native ? videoPipSupported() || documentPipSupported() :
      !!(document.pictureInPictureEnabled && video?.requestPictureInPicture);
    const ready = !!native || !!(video && video.readyState >= 2 && !video.disablePictureInPicture);
    const active = !!pipWindow || !!(canvasPlayer && document.pictureInPictureElement === canvasPlayer.video) ||
      !!(video && document.pictureInPictureElement === video);
    button.disabled = pending || (!active && (!ready || !supported));
    const label = active ? 'PiP 닫기' : 'PiP';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-label', active ? 'LIVE 영상 PiP 닫기' : 'LIVE 영상만 PiP로 보기');
    button.setAttribute('aria-pressed', String(active));
    button.title = failed ? 'PiP 창을 열지 못했습니다. 브라우저의 PiP 지원과 허용 설정을 확인해주세요.' :
      native && !videoPipSupported() && !documentPipSupported() ? '영상 PiP는 최신 PC Chrome 또는 Edge의 보안 연결에서 지원됩니다.' :
      !ready ? 'LIVE 영상이 도착하면 PiP를 사용할 수 있습니다.' :
      !supported ? '이 브라우저는 LIVE 영상 PiP를 지원하지 않습니다.' : '댓글 없이 LIVE 영상만 표시합니다.';
  }
  function close() {
    version++;
    const win = pipWindow;
    pipWindow = null; mirror = null; source = null;
    if (win && !win.closed) win.close();
    const player = canvasPlayer;
    canvasPlayer = null;
    if (player && document.pictureInPictureElement === player.video) {
      document.exitPictureInPicture().catch(() => {}).finally(() => disposePlayer(player));
    } else disposePlayer(player);
  }
  async function toggle() {
    if (pending) return;
    if (pipWindow || canvasPlayer) { close(); sync(); return; }
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
      if (native && videoPipSupported()) {
        const player = await prepareVideo(native);
        if (ticket !== version || sequence !== state.live.connectionSeq || room !== state.live.currentLiveRoomId ||
            !isLive() || native !== nativeSource() || player !== canvasPlayer) { close(); return; }
        await player.video.requestPictureInPicture();
        if (ticket !== version || sequence !== state.live.connectionSeq || room !== state.live.currentLiveRoomId ||
            !isLive() || native !== nativeSource() || player !== canvasPlayer) {
          if (document.pictureInPictureElement === player.video) await document.exitPictureInPicture();
          close();
        }
      } else if (native) {
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
      if (canvasPlayer && canvasPlayer.image === event.target) {
        try { drawFrame(canvasPlayer); } catch { close(); failed = true; }
      }
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

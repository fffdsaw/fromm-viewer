'use strict';
// Offline synthetic input exercises the same Agora RendererCache/WebGL canvas
// and audio playout engine as LIVE. It never joins RTC or uses account data.
function startBackgroundMediaBenchmark({ sdk, engine, audioPath, sendMetric, onError, width = 720, height = 1280 }) {
  if (!((width === 720 && height === 1280) || (width === 360 && height === 640))) throw new Error('BENCHMARK_SIZE_INVALID');
  const caches = sdk.AgoraEnv.AgoraRendererManager.getRendererCaches();
  if (caches.length !== 1 || caches[0].cacheContext.sourceType !== sdk.VideoSourceType.VideoSourceRemote) throw new Error('BENCHMARK_RENDER_CACHE');
  const cache = caches[0];
  const yBuffer = Buffer.alloc(width * height), uBuffer = Buffer.alloc(width * height / 4, 128), vBuffer = Buffer.alloc(width * height / 4, 128);
  const base = Buffer.alloc(yBuffer.length);
  const markerWidth = width / 12, markerTop = height * 5 / 32, markerBottom = height * 27 / 32, markerHeight = height / 80;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) base[y * width + x] = 16 + (x * 7 + y * 3) % 220;
  Object.assign(cache.shareVideoFrame, { width, height, yStride: width, uStride: width / 2, vStride: width / 2,
    yBuffer, uBuffer, vBuffer, alphaBuffer: Buffer.alloc(0), rotation: 0 });
  let stopped = false, frame = 0, rendered = 0, raf = 0, rafHandle, metricsTimer;
  let audioState = 0, audioReason = 0;
  const audioHandlers = { onAudioMixingStateChanged(state, reason) { audioState = state; audioReason = reason; } };
  engine.registerEventHandler(audioHandlers);
  // Replace only the offline input boundary. The SDK's own cache timer,
  // renderFrame(), color conversion and renderer selection remain in use.
  cache.fetchVideoFrame = () => {
    base.copy(yBuffer);
    yBuffer.fill(16 + (frame * 73) % 220, 0, width * markerHeight);
    const left = (frame++ * Math.round(width * 13 / 720)) % (width - markerWidth);
    for (let y = markerTop; y < markerBottom; y++) yBuffer.fill(235, y * width + left, y * width + left + markerWidth);
    return { hasMoreFrame: false, needRender: true };
  };
  const render = cache.renderFrame.bind(cache);
  cache.renderFrame = () => { try { render(); rendered++; } catch { onError(); } };
  const tick = () => { if (!stopped) { raf++; rafHandle = requestAnimationFrame(tick); } };
  rafHandle = requestAnimationFrame(tick);
  const audioStartCode = engine.startAudioMixing(audioPath, true, 1, 0);
  const volumeCode = engine.adjustAudioMixingPlayoutVolume(20);
  let lastTime = performance.now(), lastRendered = 0, lastRaf = 0;
  metricsTimer = setInterval(() => {
    if (stopped) return;
    const now = performance.now(), elapsed = now - lastTime;
    const canvas = document.querySelector('#videos canvas');
    sendMetric({ renderer: cache.renderers[0]?.constructor?.name || 'unknown', rendererFps: (rendered - lastRendered) * 1000 / elapsed,
      rafFps: (raf - lastRaf) * 1000 / elapsed, renderedFrames: rendered, rafFrames: raf,
      documentVisibility: document.visibilityState, canvasWidth: canvas?.width || 0, canvasHeight: canvas?.height || 0,
      audioState, audioReason, audioStartCode, volumeCode, audioPositionMs: engine.getAudioMixingCurrentPosition(),
      synthetic: true, mediaVerified: false });
    lastTime = now; lastRendered = rendered; lastRaf = raf;
  }, 1000);
  return () => {
    if (stopped) return;
    stopped = true; clearInterval(metricsTimer); cancelAnimationFrame(rafHandle); cache.stopRendering();
    try { engine.stopAudioMixing(); engine.unregisterEventHandler(audioHandlers); } catch {}
  };
}
module.exports = { startBackgroundMediaBenchmark };

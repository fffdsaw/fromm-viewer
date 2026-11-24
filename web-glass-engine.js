import {backdropPlan, paintBackdrop} from './web-glass-backdrop.js?v=glass-engines-20261124';

export const glassPC = matchMedia('(min-width:701px) and (hover:hover) and (pointer:fine)');
const STORAGE_KEY = 'fromm.glassEngine.v1';
const defaults = Object.freeze({refraction: 0.55, zRadius: 11, edgeHighlight: 0.11, blurAmount: 0, chromAberration: 0});
const ranges = {refraction: [0, 1], zRadius: [3, 24], edgeHighlight: [0, .3], blurAmount: [0, .3], chromAberration: [0, .15]};
function normalize(value) {
  return {engine: value?.engine === 'ybouane' ? 'ybouane' : 'meapri', settings: Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const n = value?.settings?.[key], [min, max] = ranges[key];
    return [key, typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback];
  }))};
}

let selected = normalize();
try { selected = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { /* Keep in-memory selection. */ }
const subscribers = new Set();
const surfaces = new Set();
const videoFollowers = new Map();
const videoDirty = new Set();
const restrictions = ['prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce', 'forced-colors: active'].map(query => matchMedia(`(${query})`));
const source = document.createElement('canvas');
const sample = source.getContext('2d');
let modulePromise, rendererModule, renderer, observer, failed = false, frame = 0, sceneDirty = false;
const active = () => glassPC.matches && selected.engine === 'ybouane' && !document.hidden && !document.documentElement.classList.contains('glass-disabled') && !restrictions.some(query => query.matches);
const announce = () => { for (const listener of subscribers) listener(); };

export const glassEngine = {
  ranges,
  get value() { return {engine: selected.engine, settings: {...selected.settings}}; },
  get snapshot() {
    return {engine: selected.engine, active: [...surfaces].filter(surface => surface.output?.isConnected).length, available: !!renderer, failed};
  },
  set(patch) {
    selected = normalize({...selected, ...patch, settings: {...selected.settings, ...patch.settings}});
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selected)); } catch { /* Session selection still works. */ }
    refreshSelection();
  },
  reset() { this.set({engine: 'meapri', settings: defaults}); },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
};

function freeRenderer() {
  if (!renderer) return;
  const retired = renderer;
  renderer = null;
  retired.destroy();
  if (!retired.gl.isContextLost()) retired.gl.getExtension('WEBGL_lose_context')?.loseContext();
  source.width = source.height = 0;
}

function refreshSelection() {
  if (active()) {
    if (!observer) {
      observer = new MutationObserver(records => {
        if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof HTMLElement && !node.matches('.webgl-glass-face')))) scheduleGlassPaint();
      });
      observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open']});
    }
    scheduleGlassPaint();
  } else {
    observer?.disconnect();observer = null;
    cancelAnimationFrame(frame);frame = 0;sceneDirty = false;videoDirty.clear();
    for (const surface of surfaces) surface.useNative();
    freeRenderer();
  }
  announce();
}

function queueFrame() {
  if (!active() || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const changed = sceneDirty, frames = new Set(videoDirty);
    sceneDirty = false;videoDirty.clear();
    paint(changed, frames);
  });
}

export function scheduleGlassPaint() {
  if (!active()) return;
  sceneDirty = true;
  queueFrame();
}

function watchVideoFrame(video, watched) {
  if (watched.cancel || video.paused || video.ended || !active()) return;
  const draw = () => {
    watched.cancel = null;
    if (videoFollowers.get(video) !== watched) return;
    for (const surface of watched.surfaces) videoDirty.add(surface);
    queueFrame();
    watchVideoFrame(video, watched);
  };
  if (video.requestVideoFrameCallback) {
    const id = video.requestVideoFrameCallback(draw);
    watched.cancel = () => video.cancelVideoFrameCallback(id);
  } else {
    const id = requestAnimationFrame(draw);
    watched.cancel = () => cancelAnimationFrame(id);
  }
}

function updateVideos(surface, videos) {
  for (const video of surface.videos) {
    if (videos.includes(video)) continue;
    const watched = videoFollowers.get(video);
    watched.surfaces.delete(surface);
    if (!watched.surfaces.size) { watched.cancel?.();videoFollowers.delete(video); }
  }
  surface.videos = videos;
  for (const video of videos) {
    if (!videoFollowers.has(video)) videoFollowers.set(video, {surfaces: new Set(), cancel: null});
    const watched = videoFollowers.get(video);
    watched.surfaces.add(surface);
    watchVideoFrame(video, watched);
  }
}

function paint(changed, frames) {
  if (!active() || failed) return;
  const visible = [];
  for (const surface of surfaces) {
    const {element} = surface;
    if (!surface.suspended && element.isConnected && element.checkVisibility()) {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.right > 0 && box.bottom > 0 && box.top < innerHeight && box.left < innerWidth) {
        visible.push({surface, box});
        continue;
      }
    }
    if (surface.output) surface.useNative();
  }
  if (!visible.length) { freeRenderer();return; }
  if (!rendererModule) {
    if (!modulePromise) modulePromise = Promise.all([import('./vendor/ybouane/GlassRenderer.js'), import('./vendor/ybouane/defaults.js')]).then(([display, material]) => {
      rendererModule = {...display, ...material};
      scheduleGlassPaint();
    }).catch(() => { failed = true;announce(); });
    return;
  }
  if (!renderer) {
    try {
      const current = renderer = new rendererModule.GlassRenderer();
      current.canvas.addEventListener('webglcontextlost', () => {
        if (renderer !== current) return;
        for (const surface of surfaces) surface.useNative();
        freeRenderer();failed = true;announce();
      }, {once: true});
    } catch { failed = true;announce();return; }
  }
  for (const {surface, box} of visible) {
    if (!changed && !frames.has(surface)) continue;
    try {
      if (!render(surface, box, changed)) surface.useNative();
    } catch { surface.useNative(); }
  }
  if (changed) announce();
}

function render(surface, box, changed) {
  const {element} = surface;
  const dpr = devicePixelRatio || 1;
  const pad = Math.round(rendererModule.SHADOW_PAD * dpr);
  const width = Math.max(1, Math.round(box.width * dpr)), height = Math.max(1, Math.round(box.height * dpr));
  const stage = element.closest('.glass-settings-preview')?.querySelector('[data-glass-scene]');
  const sceneBox = stage?.getBoundingClientRect();
  const signature = sceneBox ? [stage.dataset.glassPaint, width, height, box.left - sceneBox.left, box.top - sceneBox.top, surface.ramp, ...Object.values(selected.settings)].join(':') : null;
  if (signature && surface.output?.isConnected && surface.signature === signature) return true;
  if (changed || !surface.plan) {
    surface.plan = backdropPlan(element, {x: box.left - pad / dpr, y: box.top - pad / dpr}, (width + pad * 2) / dpr, (height + pad * 2) / dpr);
  }
  const plan = surface.plan;
  if (!plan) return false;
  source.width = width + pad * 2;source.height = height + pad * 2;
  sample.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintBackdrop(sample, plan);
  if (element.classList.contains('save-result-card')) {
    sample.fillStyle = getComputedStyle(element).backgroundColor;
    sample.fillRect(0, 0, plan.width, plan.height);
  }
  const cornerRadius = Math.min(box.width / 2, box.height / 2, Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0);
  const config = {...rendererModule.DEFAULTS, ...selected.settings, refraction: selected.settings.refraction * surface.ramp, cornerRadius, shadowOpacity: 0, fresnel: .16, specular: .045};
  renderer.uploadAndBlur(source, 0, 0, source.width, source.height, config.blurAmount);
  renderer.clear();renderer.renderGlassPanel(config, width / dpr, height / dpr, dpr);
  surface.draw(renderer.canvas, pad, width, height, plan.type);
  surface.signature = signature;
  updateVideos(surface, plan.videos);
  return true;
}

class SwitchableGlass {
  constructor(element, options, makeNative) {
    this.element = element;this.options = options;this.makeNative = makeNative;
    this.suspended = false;this.destroyed = false;this.ramp = 1;this.videos = [];
    this.native = makeNative(options);
    surfaces.add(this);scheduleGlassPaint();
  }
  get resolved() { return this.native?.resolved ?? {usesFallback: !this.output}; }
  get filter() { return this.native?.filter ?? this.output; }
  get usesFallback() { return this.native?.usesFallback ?? !this.output; }
  get configuredRefraction() { return this.options.refraction ?? 0; }
  useNative() {
    updateVideos(this, []);
    this.plan = null;
    this.output?.remove();this.output = null;
    delete this.element.dataset.glassEngine;delete this.element.dataset.glassBackdrop;
    if (this.destroyed || this.suspended || !this.element.isConnected || this.native) return;
    try { this.native = this.makeNative(this.options); } catch { /* The styled surface still works. */ }
  }
  draw(webgl, pad, width, height, type) {
    const output = this.output || document.createElement('canvas');
    if (!this.output) { output.className = 'webgl-glass-face';output.setAttribute('aria-hidden', 'true'); }
    if (output.width !== width || output.height !== height) { output.width = width;output.height = height; }
    const ctx = output.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(webgl, pad, pad, width, height, 0, 0, width, height);
    if (this.native) { this.native.destroy();this.native = null; }
    if (!this.output) { this.output = output;this.element.prepend(output); }
    this.element.dataset.glassEngine = 'ybouane';this.element.dataset.glassBackdrop = type;
  }
  update(next) { this.options = {...this.options, ...next};this.native?.update(next);scheduleGlassPaint(); }
  syncToBackdrop() { this.native?.syncToBackdrop();scheduleGlassPaint(); }
  flexRefraction(value) {
    const strength = this.configuredRefraction;
    this.ramp = value == null ? 1 : strength ? Math.max(0, Math.min(1, value / strength)) : 0;
    this.native?.flexRefraction(value);scheduleGlassPaint();
  }
  scheduleRegen() { this.native?.scheduleRegen();scheduleGlassPaint(); }
  scheduleBuild(build) { queueMicrotask(() => { if (!this.destroyed && !this.suspended) build(); }); }
  installFilter() { this.useNative();this.native?.resume();scheduleGlassPaint(); }
  suspend() { this.suspended = true;this.useNative();this.native?.suspend(); }
  resume() { this.suspended = false;this.installFilter(); }
  destroy() {
    this.destroyed = true;this.native?.destroy();this.native = null;
    this.useNative();surfaces.delete(this);videoDirty.delete(this);
    if (!surfaces.size) freeRenderer();
    else scheduleGlassPaint();
  }
}

export function createSwitchableGlass(element, options, makeNative) {
  // The rail glyph field and the older animated capsule have their own SVG
  // sampling targets and use the native material for those interactions.
  if (element.matches('.rail-lens-surface,.capsule-optics-lens')) return makeNative(options);
  return new SwitchableGlass(element, options, makeNative);
}

for (const event of ['resize', 'scroll', 'load', 'loadeddata', 'playing', 'pause', 'seeked', 'transitionend', 'animationend', 'fromm-theme-change']) window.addEventListener(event, scheduleGlassPaint, {capture: true, passive: true});
for (const query of restrictions) query.addEventListener('change', refreshSelection);
glassPC.addEventListener('change', refreshSelection);
window.addEventListener('fromm-glass-enabled', refreshSelection);
document.addEventListener('visibilitychange', refreshSelection);
window.addEventListener('pageshow', refreshSelection);
window.addEventListener('pagehide', () => { for (const surface of surfaces) surface.useNative();freeRenderer(); });
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try { selected = normalize(JSON.parse(event.newValue)); } catch { selected = normalize(); }
  refreshSelection();
});
window.FrommGlassEngine = glassEngine;
refreshSelection();

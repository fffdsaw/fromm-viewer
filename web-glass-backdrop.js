/* Sample the visible paint and decoded media in a pane's padded rectangle. */
const access = new WeakMap();
const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const mediaArea = '.replay-thumb,.media-thumb,.media-thumb-wrap,.channel-photo-image,.video-stage';
const overlay = '.morph-menu-skin,.morph-menu-content,#saveResultModal,.webgl-glass-face';

function paintStyle(element, cache) {
  if (!cache.has(element)) {
    const style = getComputedStyle(element);
    cache.set(element, {color: style.backgroundColor, opacity: Number(style.opacity), fit: style.objectFit, position: style.objectPosition});
  }
  return cache.get(element);
}

function opaque(color) {
  return color && color !== 'transparent' && !color.startsWith('rgba(') && !color.includes(' / ');
}

function mediaSize(source) {
  return source instanceof HTMLVideoElement ? [source.videoWidth, source.videoHeight] : [source.naturalWidth, source.naturalHeight];
}

function canSample(source) {
  const [width, height] = mediaSize(source);
  if (!width || !height || source instanceof HTMLVideoElement && source.readyState < 2) return false;
  const url = source.currentSrc, cached = access.get(source);
  if (cached?.url === url) return cached.readable;
  // Drawing can succeed even when origin isolation disallows pixel reads.
  // Probe the already-decoded media without a new request or a proxy.
  probe.width = 1;
  const ctx = probe.getContext('2d', {willReadFrequently: true});
  try {
    ctx.drawImage(source, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
  } catch (error) {
    if (error.name === 'SecurityError') access.set(source, {url, readable: false});
    return false;
  }
  access.set(source, {url, readable: true});
  return true;
}

function mediaAt(element, x, y, candidates) {
  if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) return element;
  const area = element.closest(mediaArea);
  if (!area) return null;
  if (!candidates.has(area)) candidates.set(area, [...area.querySelectorAll('img,video')].map(el => ({el, rect: el.getBoundingClientRect()})));
  return candidates.get(area).find(({rect}) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom)?.el ?? null;
}

function mediaGeometry(source, rect, paint, origin) {
  const [width, height] = mediaSize(source);
  const xScale = rect.width / width, yScale = rect.height / height;
  const scale = paint.fit === 'cover' ? Math.max(xScale, yScale) : Math.min(xScale, yScale);
  const w = paint.fit === 'fill' ? rect.width : width * scale;
  const h = paint.fit === 'fill' ? rect.height : height * scale;
  const [px, py] = paint.position.split(' ').map(part => part.endsWith('%') ? Number.parseFloat(part) / 100 : 0.5);
  return [rect.left - origin.x + (rect.width - w) * (px ?? 0.5), rect.top - origin.y + (rect.height - h) * (py ?? 0.5), w, h];
}

export function backdropPlan(surface, origin, width, height) {
  const background = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim() || '#eff4f3';
  const plan = {background, width, height, type: 'ui', colors: [], media: new Map(), videos: []};
  const stage = surface.closest('.glass-settings-preview')?.querySelector('[data-glass-scene]');
  if (stage?.width > 0 && stage.height > 0) {
    const rect = stage.getBoundingClientRect();
    plan.type = 'settings';
    plan.stage = {source: stage, x: rect.left - origin.x, y: rect.top - origin.y, width: rect.width, height: rect.height};
    return plan;
  }

  const styles = new Map(), candidates = new Map();
  const cell = 14;
  const owner = surface.closest('button,[role="button"]');
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const w = Math.min(cell, width - x), h = Math.min(cell, height - y);
      const vx = Math.max(0, Math.min(innerWidth - 1, origin.x + x + w / 2));
      const vy = Math.max(0, Math.min(innerHeight - 1, origin.y + y + h / 2));
      for (const el of document.elementsFromPoint(vx, vy)) {
        if (el === surface || surface.contains(el) || el === owner || el.closest(overlay)) continue;
        const paint = paintStyle(el, styles);
        if (!paint.opacity) continue;
        const source = mediaAt(el, vx, vy, candidates);
        if (source) {
          if (!plan.media.has(source)) {
            if (!canSample(source)) return null;
            const rect = source.getBoundingClientRect();
            plan.media.set(source, {cells: [], geometry: mediaGeometry(source, rect, paintStyle(source, styles), origin)});
            if (source instanceof HTMLVideoElement) plan.videos.push(source);
          }
          plan.media.get(source).cells.push([x, y, w, h]);
          plan.type = 'media';
          break;
        }
        if (opaque(paint.color) && paint.opacity === 1) {
          plan.colors.push([paint.color, x, y, w, h]);
          break;
        }
      }
    }
  }
  return plan;
}

export function paintBackdrop(ctx, plan) {
  const {background, width, height, stage, colors, media} = plan;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  if (stage) {
    ctx.drawImage(stage.source, stage.x, stage.y, stage.width, stage.height);
    return;
  }
  for (const [color, x, y, w, h] of colors) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  for (const [source, {cells, geometry}] of media) {
    ctx.save();
    ctx.beginPath();
    for (const bounds of cells) ctx.rect(...bounds);
    ctx.clip();
    ctx.drawImage(source, ...geometry);
    ctx.restore();
  }
}

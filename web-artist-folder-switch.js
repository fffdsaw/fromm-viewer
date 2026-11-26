/* Shared settings switch. Sample the rail locally, with an always-visible glass thumb. */
export function mountLiquidGlassSwitch(button, { input, onToggle, effectsEnabled = () => true, canRender = () => true } = {}) {
    const designWidth = 164;
    const designHeight = 96;
    const track = { x: 20, cy: 48, width: 124, height: 55 };
    const fullDuration = 520;
    const startCenter = track.x + 4 + 73 / 2;
    const endCenter = track.x + 47 + 73 / 2;

    const canvas = button.querySelector('canvas');
    const context=(canvas,options)=>{try{return canvas.getContext('2d',options);}catch{return null;}};
    const output = context(canvas);
    const railCanvas = document.createElement('canvas');
    const railContext = context(railCanvas, { willReadFrequently: true });
    const colorsCanvas = document.createElement('canvas');
    colorsCanvas.width = colorsCanvas.height = 1;
    const colorContext = context(colorsCanvas, { willReadFrequently: true });
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const transparency=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(forced-colors: active)');
    const available=()=>effectsEnabled()&&!transparency.matches&&!contrast.matches;

    let target = Number(input ? input.checked : button.getAttribute('aria-checked') === 'true');
    let progress = target;
    let animationFrame = null;
    let previousTime = null;
    let railAlpha;
    let pixels;
    let scaleX;
    let scaleY;
    let theme;

    const clamp = value => Math.max(0, Math.min(1, value));
    const mix = (a, b, t) => a + (b - a) * t;

    function smooth(start, end, value) {
      const t = clamp((value - start) / (end - start));
      return t * t * (3 - 2 * t);
    }

    function color(token, fallback, styles) {
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = fallback;
      colorContext.fillStyle = styles.getPropertyValue(token).trim() || fallback;
      colorContext.fillRect(0, 0, 1, 1);
      return Array.from(colorContext.getImageData(0, 0, 1, 1).data.slice(0, 3));
    }

    function capsule(context, left, centerY, width, height, fill) {
      const radius = height / 2;
      context.beginPath();
      context.arc(left + radius, centerY, radius, Math.PI / 2, 3 * Math.PI / 2);
      context.arc(left + width - radius, centerY, radius, -Math.PI / 2, Math.PI / 2);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
    }

    function sampleRail(x, y) {
      x = Math.max(0, Math.min(canvas.width - 1.001, x));
      y = Math.max(0, Math.min(canvas.height - 1.001, y));
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const row = y0 * canvas.width + x0;
      const nextRow = row + canvas.width;
      return mix(
        mix(railAlpha[row], railAlpha[row + 1], x - x0),
        mix(railAlpha[nextRow], railAlpha[nextRow + 1], x - x0),
        y - y0,
      ) / 255;
    }

    function drawLens(left, centerY, width, height, glass, railColor) {
      const radius = height / 2;
      const right = left + width;
      const bounds = {
        x0: Math.max(0, Math.floor((left - 2) * scaleX)),
        x1: Math.min(canvas.width, Math.ceil((right + 2) * scaleX)),
        y0: Math.max(0, Math.floor((centerY - radius - 2) * scaleY)),
        y1: Math.min(canvas.height, Math.ceil((centerY + radius + 2) * scaleY)),
      };
      const outputPixels = pixels.data;
      for (let y = bounds.y0; y < bounds.y1; y++) {
        const py = (y + 0.5) / scaleY - centerY;
        for (let x = bounds.x0; x < bounds.x1; x++) {
          const px = (x + 0.5) / scaleX;
          const nearestX = Math.max(left + radius, Math.min(right - radius, px));
          const dx = px - nearestX;
          const distance = Math.hypot(dx, py);
          const depth = radius - distance;
          const length = Math.max(distance, 0.001);
          const nx = dx / length;
          const ny = py / length;

          // The flat center has little displacement. The curved rim samples
          // the rail farther outward and pinches its two shoulders inward.
          const immersion = smooth(-0.65, 1.35, depth);
          const rim = Math.exp(-((depth - 10) ** 2) / 111) * smooth(0, 3, depth) * glass;
          const refraction = sampleRail(x + nx * 48 * rim * scaleX, y + ny * 14 * rim * scaleY);
          const base = railAlpha[y * canvas.width + x] / 255;
          const rail = mix(base, refraction, immersion * glass);

          // The clear bands form a C around the refracted rail. Their width
          // follows the rail's silhouette as it moves through the lens.
          const towardFarCap = smooth(0.13, 0.35, (px - left) / width);
          const diffuse = 0.065 * immersion;
          const band = (1 - refraction) * smooth(1, 5, depth) * towardFarCap *
            (0.22 + 0.18 * smooth(-0.2, 0.8, ny));
          const edge = 0.38 * Math.exp(-((depth - 1.05) ** 2) / 1.7) *
            (0.62 + 0.38 * Math.abs(ny));
          const light = clamp((diffuse + band + edge) * glass);
          const tinted = rail * (1 - light);
          const alpha = tinted + light;
          const offset = (y * canvas.width + x) * 4;

          for (let channel = 0; channel < 3; channel++) {
            outputPixels[offset + channel] = alpha > 0
              ? (railColor[channel] * tinted + theme.glint[channel] * light) / alpha
              : 0;
          }
          outputPixels[offset + 3] = alpha * 255;
        }
      }
      output.putImageData(pixels, 0, 0, bounds.x0, bounds.y0,
        bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    }

    function render() {
      if (!pixels) return;
      const colorProgress = smooth(0.30, 0.75, progress);
      const railColor = theme.off.map((value, i) => Math.round(mix(value, theme.on[i], colorProgress)));
      const optical = available();
      const position = smooth(0, 1, progress);
      const swell = optical ? Math.sin(Math.PI * progress) ** 2 : 0;
      const width = 73 + 42 * swell;
      const height = 48 + 25 * swell;
      const left = mix(startCenter, endCenter, position) - width / 2;
      const cy = track.cy - 2 * swell;

      output.clearRect(0, 0, designWidth, designHeight);
      capsule(output, track.x, track.cy, track.width, track.height, `rgb(${railColor.join(',')})`);
      if (swell > 0.002) drawLens(left, cy, width, height, swell * 0.78, railColor);

      const rgb = theme.thumb.join(',');
      if (!optical) {
        capsule(output, left, cy, width, height, `rgb(${rgb})`);
        return;
      }
      // Keep a continuous silhouette and rounded lip even at peak expansion.
      const glaze = output.createLinearGradient(0, cy - height / 2, 0, cy + height / 2);
      glaze.addColorStop(0, `rgba(${rgb}, ${0.91 - 0.22 * swell})`);
      glaze.addColorStop(0.35, `rgba(${rgb}, ${0.57 - 0.27 * swell})`);
      glaze.addColorStop(0.72, `rgba(${rgb}, ${0.39 - 0.17 * swell})`);
      glaze.addColorStop(1, `rgba(${rgb}, ${0.66 - 0.22 * swell})`);
      capsule(output, left, cy, width, height, glaze);
      const rim = output.createLinearGradient(0, cy - height / 2, 0, cy + height / 2);
      rim.addColorStop(0, 'rgba(255,255,255,.95)');
      rim.addColorStop(0.52, 'rgba(255,255,255,.31)');
      rim.addColorStop(1, 'rgba(255,255,255,.68)');
      output.lineWidth = 2.2;
      output.strokeStyle = rim;
      output.stroke();
    }

    function refreshTheme() {
      if (!colorContext) return;
      const styles = getComputedStyle(button);
      theme = {
        off: color('--fromm-switch-track-off', '#524f66', styles),
        on: color('--fromm-switch-track-on', '#9777f0', styles),
        thumb: color('--fromm-switch-thumb', '#f4edf9', styles),
        glint: color('--fromm-switch-glint', '#f9f6ff', styles),
      };
      if(!available())snap();else render();
    }

    function resize() {
      if (!output || !railContext || !theme) return;
      if (!canRender()) {
        delete button.dataset.glassReady;
        pixels = null;
        snap();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) { snap(); return; }
      refreshTheme();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.height * dpr));
      railCanvas.width = canvas.width;
      railCanvas.height = canvas.height;
      scaleX = canvas.width / designWidth;
      scaleY = canvas.height / designHeight;
      railContext.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      output.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      capsule(railContext, track.x, track.cy, track.width, track.height, '#fff');
      const source = railContext.getImageData(0, 0, canvas.width, canvas.height).data;
      railAlpha = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < railAlpha.length; i++) railAlpha[i] = source[i * 4 + 3];
      pixels = output.createImageData(canvas.width, canvas.height);
      render();
      button.dataset.glassReady = '';
    }

    function snap() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
      progress = target;
      render();
    }

    function tick(time) {
      if (previousTime !== null) {
        const step = Math.max(0, time - previousTime) / fullDuration;
        progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
      }
      render();
      if (progress === target) {
        animationFrame = null;
        previousTime = null;
      } else {
        previousTime = time;
        animationFrame = requestAnimationFrame(tick);
      }
    }

    function setChecked(checked, { animate = true } = {}) {
      target = checked ? 1 : 0;
      if (!input) button.setAttribute('aria-checked', String(Boolean(checked)));
      if (!animate || motionPreference.matches || !available() || !pixels) {
        snap();
      } else if (animationFrame === null && progress !== target) {
        animationFrame = requestAnimationFrame(tick);
      }
    }

    const activate = () => onToggle?.(target === 0);
    const motionChanged = () => { if (motionPreference.matches) snap(); };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (!input) button.addEventListener('click', activate);
    motionPreference.addEventListener('change', motionChanged);
    transparency.addEventListener('change', refreshTheme);contrast.addEventListener('change', refreshTheme);
    window.addEventListener('resize', resize);
    refreshTheme();
    resize();
    observer?.observe(button);

    return {
      setChecked,
      refreshTheme,
      destroy() {
        snap();
        observer?.disconnect();
        button.removeEventListener('click', activate);
        motionPreference.removeEventListener('change', motionChanged);
        transparency.removeEventListener('change', refreshTheme);contrast.removeEventListener('change', refreshTheme);
        window.removeEventListener('resize', resize);
        delete button.dataset.glassReady;
      },
    };
  }

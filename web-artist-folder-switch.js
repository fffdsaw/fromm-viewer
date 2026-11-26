/* Shared settings switch. The moving thumb samples the underlying rail in one pass. */
export function mountLiquidGlassSwitch(button, { input, onToggle, effectsEnabled = () => true, canRender = () => true } = {}) {
    const designWidth = 164;
    const designHeight = 96;
    const track = { x: 20, cy: 48, width: 124, height: 55 };
    const fullDuration = 520;
    const thumbWidth = 68;
    const thumbHeight = 46;
    const startCenter = track.x + 4 + thumbWidth / 2;
    const endCenter = track.x + track.width - 4 - thumbWidth / 2;

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

    function drawLens(left, centerY, width, height, clarity, railColor) {
      const radius = height / 2;
      const right = left + width;
      const antialias = Math.max(1 / scaleX, 1 / scaleY) / 2;
      const x0 = Math.max(0, Math.floor((left - antialias) * scaleX));
      const x1 = Math.min(canvas.width, Math.ceil((right + antialias) * scaleX));
      const y0 = Math.max(0, Math.floor((centerY - radius - antialias) * scaleY));
      const y1 = Math.min(canvas.height, Math.ceil((centerY + radius + antialias) * scaleY));
      const film = mix(0.76, 0.064, clarity);
      const outputPixels = pixels.data;

      for (let y = y0; y < y1; y++) {
        const py = (y + 0.5) / scaleY - centerY;
        for (let x = x0; x < x1; x++) {
          const px = (x + 0.5) / scaleX;
          const dx = px - Math.max(left + radius, Math.min(right - radius, px));
          const distance = Math.hypot(dx, py);
          const depth = radius - distance;
          const length = Math.max(distance, 0.001);
          const nx = dx / length;
          const ny = py / length;
          const coverage = smooth(-antialias, antialias, depth);
          const rim = Math.exp(-((depth - 7) ** 2) / 65) * smooth(0, 3, depth) * clarity;
          const index = y * canvas.width + x;
          const base = railAlpha[index] / 255;
          const shifted = rim > 0.002 ? sampleRail(x + nx * 32 * rim * scaleX, y + ny * 21 * rim * scaleY) : base;
          const rail = mix(base, shifted, coverage * clarity);

          // The middle transmits the rail. Reflections stay on the curved lip,
          // with a stronger top highlight and a smaller reflection beneath it.
          const reflection = Math.exp(-((depth - 1.25) ** 2) / 2.9) * (0.38 + 0.38 * Math.max(0, -ny));
          const highlight = coverage * reflection;
          const front = coverage * film * (1 - highlight);
          const behind = rail * (1 - front - highlight);
          const alpha = behind + front + highlight;
          const offset = index * 4;

          for (let channel = 0; channel < 3; channel++) {
            outputPixels[offset + channel] = alpha > 0
              ? (railColor[channel] * behind + theme.thumb[channel] * front + theme.glint[channel] * highlight) / alpha
              : 0;
          }
          outputPixels[offset + 3] = alpha * 255;
        }
      }
      output.putImageData(pixels, 0, 0, x0, y0, x1 - x0, y1 - y0);
    }

    function render() {
      if (!pixels) return;
      const position = smooth(0, 1, progress);
      const colorProgress = smooth(0.24, 0.76, position);
      const railColor = theme.off.map((value, i) => Math.round(mix(value, theme.on[i], colorProgress)));
      const optical = available();
      const clarity = optical ? smooth(0, 0.19, progress) * (1 - smooth(0.81, 1, progress)) : 0;
      const swell = optical ? Math.sin(Math.PI * position) ** 2 : 0;
      // Leave rail exposed at both ends even at peak expansion.
      const width = thumbWidth + 18 * swell;
      const height = thumbHeight + 18 * swell;
      const left = mix(startCenter, endCenter, position) - width / 2;
      const cy = track.cy - swell;

      output.clearRect(0, 0, designWidth, designHeight);
      capsule(output, track.x, track.cy, track.width, track.height, `rgb(${railColor.join(',')})`);
      if (optical) drawLens(left, cy, width, height, clarity, railColor);
      else capsule(output, left, cy, width, height, `rgb(${theme.thumb.join(',')})`);
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
      const rect = canRender() ? canvas.getBoundingClientRect() : null;
      if (!rect?.width || !rect.height) {
        delete button.dataset.glassReady;
        pixels = null;
        snap();
        return;
      }
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
    transparency.addEventListener('change', refreshTheme);contrast.addEventListener('change', resize);
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
        transparency.removeEventListener('change', refreshTheme);contrast.removeEventListener('change', resize);
        window.removeEventListener('resize', resize);
        delete button.dataset.glassReady;
      },
    };
  }

/* The settings controls bend a local copy of their own track. */
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
function smooth(start, end, value) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
}

function color(context, token, fallback, styles) {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = fallback;
    context.fillStyle = styles.getPropertyValue(token).trim() || fallback;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
}

function capsule(context, left, cy, width, height, fill) {
    if (width <= 0) return;
    context.beginPath();
    context.roundRect(left, cy - height / 2, width, height, height / 2);
    context.fillStyle = fill;
    context.fill();
}

function capsuleDepth(x, y, halfWidth, radius) {
    return radius - Math.hypot(Math.max(0, Math.abs(x) - halfWidth + radius), y);
}

function paintLens(context, lens, palette, sampleTrack) {
    const { cx, cy, width, height, clarity, bendFilledSide } = lens;
    const { a: scaleX, d: scaleY } = context.getTransform();
    const antialias = Math.max(1 / scaleX, 1 / scaleY) / 2;
    const halfWidth = width / 2;
    const radius = height / 2;
    const left = Math.max(0, Math.floor((cx - halfWidth - antialias) * scaleX));
    const right = Math.min(context.canvas.width, Math.ceil((cx + halfWidth + antialias) * scaleX));
    const top = Math.max(0, Math.floor((cy - radius - antialias) * scaleY));
    const bottom = Math.min(context.canvas.height, Math.ceil((cy + radius + antialias) * scaleY));
    const picture = context.getImageData(left, top, right - left, bottom - top);

    for (let y = top; y < bottom; y++) {
        const py = (y + 0.5) / scaleY - cy;
        for (let x = left; x < right; x++) {
            const px = (x + 0.5) / scaleX - cx;
            const depth = capsuleDepth(px, py, halfWidth, radius);
            const coverage = smooth(-antialias, antialias, depth);
            if (!coverage) continue;

            // Range optics deflect the colored line at the left rim. Switches
            // bend both ends of their rail and keep the center flat.
            const side = (bendFilledSide ? -px : Math.abs(px)) / halfWidth;
            const band = bendFilledSide ? 4.5 : 14;
            const rimDepth = depth / band;
            const bend = clarity * smooth(0.70, 0.88, side) *
                smooth(0, .28, rimDepth) * (1 - smooth(.44, 1, rimDepth));
            const sampleX = bendFilledSide ? px : px - Math.sign(px) * 9 * bend;
            const sampleY = py - (bendFilledSide ? 1.8 : 5) * bend;
            const [red, green, blue, sampledAlpha] = sampleTrack(cx + sampleX, cy + sampleY, antialias);
            const rim = (depth - antialias) / (antialias + radius * .045);
            const shine = Math.exp(-rim * rim) *
                (0.2 + 0.51 * clamp(-py / radius));
            const clearFilm = bendFilledSide ? .06 : mix(.045, .16, 1 - sampledAlpha) * (.9 + .2 * clamp(-py / radius));
            const front = mix(1, clearFilm, clarity) * (1 - shine);
            const behind = (1 - front - shine) * sampledAlpha;
            const offset = ((y - top) * picture.width + x - left) * 4;
            const targetAlpha = behind + front + shine;
            const baseAlpha = picture.data[offset + 3] / 255 * (1 - coverage);
            const alpha = baseAlpha + targetAlpha * coverage;
            for (const [channel, fromTrack] of [red, green, blue].entries()) {
                const shaded = fromTrack * behind + palette.thumb[channel] * front + palette.glint[channel] * shine;
                picture.data[offset + channel] = (picture.data[offset + channel] * baseAlpha + shaded * coverage) / alpha;
            }
            picture.data[offset + 3] = alpha * 255;
        }
    }
    context.putImageData(picture, left, top);
}

export function mountLiquidGlassSwitch(button, { input, onToggle, effectsEnabled = () => true, canRender = () => true } = {}) {
    const designWidth = 204;
    const designHeight = 96;
    const track = { x: 40, cy: 48, width: 124, height: 55 };
    const fullDuration = 520;
    const thumbWidth = 68;
    const thumbHeight = 46;
    const startCenter = track.x + 4 + thumbWidth / 2;
    const endCenter = track.x + track.width - 4 - thumbWidth / 2;

    const canvas = button.querySelector('canvas');
    const context=(canvas,options)=>{try{return canvas.getContext('2d',options);}catch{return null;}};
    const output = context(canvas);
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
    let travel = 0;
    let ready = false;
    let theme;

    function render() {
      if (!ready) return;
      const position = smooth(0, 1, progress);
      const colorProgress = smooth(0.24, 0.76, position);
      const railColor = theme.off.map((value, i) => Math.round(mix(value, theme.on[i], colorProgress)));
      const optical = available();
      const clarity = optical ? smooth(0, 0.19, progress) * (1 - smooth(0.81, 1, progress)) : 0;
      const swell = optical ? Math.sin(Math.PI * position) ** 2 : 0;
      const width = thumbWidth + 66 * swell;
      const height = thumbHeight + 32 * swell;
      // Let the expanded lens lead the motion so it uncovers the trailing
      // end of the rail and remains visible beyond the leading end.
      const left = mix(startCenter, endCenter, position) + 24 * travel * swell - width / 2;
      const cy = track.cy;

      output.clearRect(0, 0, designWidth, designHeight);
      capsule(output, track.x, track.cy, track.width, track.height, `rgb(${railColor.join(',')})`);
      if (optical) {
        paintLens(output, { cx: left + width / 2, cy, width, height, clarity }, theme, (x, y, aa) => {
          const depth = capsuleDepth(x - designWidth / 2, y - track.cy, track.width / 2, track.height / 2);
          return [...railColor, smooth(-aa, aa, depth)];
        });
      }
      else capsule(output, left, cy, width, height, `rgb(${theme.thumb.join(',')})`);
    }

    function refreshTheme() {
      if (!colorContext) return;
      const styles = getComputedStyle(button);
      theme = {
        off: color(colorContext, '--fromm-switch-track-off', '#524f66', styles),
        on: color(colorContext, '--fromm-switch-track-on', '#9777f0', styles),
        thumb: color(colorContext, '--fromm-switch-thumb', '#f4edf9', styles),
        glint: color(colorContext, '--fromm-switch-glint', '#f9f6ff', styles),
      };
      if(!available())snap();else render();
    }

    function resize() {
      if (!output?.roundRect || !theme) return;
      const rect = canRender() ? canvas.getBoundingClientRect() : null;
      if (!rect?.width || !rect.height) {
        delete button.dataset.glassReady;
        ready = false;
        snap();
        return;
      }
      refreshTheme();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.height * dpr));
      output.setTransform(canvas.width / designWidth, 0, 0, canvas.height / designHeight, 0, 0);
      ready = true;
      render();
      button.dataset.glassReady = '';
    }

    function snap() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
      travel = 0;
      progress = target;
      render();
    }

    function tick(time) {
      if (previousTime !== null) {
        const step = Math.max(0, time - previousTime) / fullDuration;
        travel = mix(travel, Math.sign(target - progress), clamp(step * 9));
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
      if (!animate || motionPreference.matches || !available() || !ready) {
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

export function mountLiquidGlassRange(input) {
    const range = input.parentElement;
    const canvas = range.querySelector('canvas');
    const output = canvas.getContext('2d', { willReadFrequently: true });
    const swatch = document.createElement('canvas');
    swatch.width = swatch.height = 1;
    const colorContext = swatch.getContext('2d', { willReadFrequently: true });
    if (!output?.roundRect || !colorContext || typeof ResizeObserver !== 'function') return null;

    let width = 0, height = 0, gutter = 0, fraction = 0, growth = 0;
    let pressed = null, pulse = 0, frame = 0, lastTime = 0;
    let palette;

    function render() {
        if (!width || !height) return;
        const cy = height / 2;
        const trackWidth = width - 2 * gutter;
        if (trackWidth < 16) return;
        const cx = gutter + 8 + (trackWidth - 16) * fraction;
        const fillWidth = fraction === 1 ? trackWidth : fraction === 0 ? 0 : cx - gutter;
        output.clearRect(0, 0, width, height);
        capsule(output, gutter, cy, trackWidth, 6, `rgb(${palette.rail.join(',')})`);
        capsule(output, gutter, cy, fillWidth, 6, `rgb(${palette.fill.join(',')})`);
        const swell = smooth(0, 1, growth);
        paintLens(output, { cx, cy, width: 16 + 22 * swell, height: 12 + 14 * swell, clarity: swell, bendFilledSide: true }, palette, (x, y, aa) => {
            const railDepth = capsuleDepth(x - width / 2, y - cy, trackWidth / 2, 3);
            const rail = smooth(-aa, aa, railDepth);
            const fillDepth = capsuleDepth(x - gutter - fillWidth / 2, y - cy, fillWidth / 2, 3);
            const fill = fillWidth > 0 ? smooth(-aa, aa, fillDepth) : 0;
            return [...palette.fill.map((value, i) => mix(palette.rail[i], value, rail ? fill / rail : 0)), rail];
        });
    }

    function refreshTheme() {
        const styles = getComputedStyle(range);
        palette = {
            rail: color(colorContext, '--theme-selected', '#c9e9da', styles),
            fill: color(colorContext, '--theme-accent', '#167b65', styles),
            thumb: [255, 255, 255],
            glint: [255, 255, 255],
        };
        render();
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        if (!width || !height) {
            delete range.dataset.glassReady;
            stop();
            cancelAnimationFrame(frame);
            frame = lastTime = growth = 0;
            return;
        }
        gutter = (width - range.getBoundingClientRect().width) / 2;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        output.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        render();
        range.dataset.glassReady = '';
    }

    function tick(time) {
        const active = pressed !== null || pulse !== 0;
        const step = Math.min(40, time - (lastTime || time)) / 150;
        lastTime = time;
        growth = clamp(growth + (active ? step : -step));
        render();
        if (growth !== Number(active)) frame = requestAnimationFrame(tick);
        else frame = lastTime = 0;
    }

    function animate() {
        if (width && !frame) frame = requestAnimationFrame(tick);
    }
    function stop() {
        pressed = null;
        clearTimeout(pulse);
        pulse = 0;
        animate();
    }
    input.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !width) return;
        pressed = event.pointerId;
        animate();
    });
    const release = event => { if (event.pointerId === pressed) stop(); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', stop);
    input.addEventListener('blur', stop);
    refreshTheme();
    new ResizeObserver(resize).observe(canvas);

    return {
        update(value) {
            if (fraction === value) return;
            fraction = value;
            render();
        },
        pulse() {
            if (pressed !== null || !width) return;
            clearTimeout(pulse);
            pulse = setTimeout(stop, 160);
            animate();
        },
        refreshTheme,
        stop,
    };
}

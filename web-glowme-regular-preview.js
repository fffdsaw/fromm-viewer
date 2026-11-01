/* Meapri Regular — opt-in, experiment branch only.
 * Uses the real upstream LiquidGlass constructor, never a CSS-only imitation.
 * Engine bundle is built from the pinned MIT-licensed source into vendor/meapri/.
 */
(() => {
  'use strict';
  if (!document.documentElement.classList.contains('glowme-phase3-experiment')) return;
  if (document.querySelector('#glowme-regular-toggle')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'glowme-regular-toggle';
  button.className = 'glowme-regular-toggle';
  button.setAttribute('aria-pressed', 'false');
  button.textContent = 'Regular: OFF';
  button.title = 'Meapri 실제 Liquid Glass Regular 엔진 비교 (실험판 전용)';
  document.body.append(button);

  const status = document.createElement('span');
  status.id = 'glowme-regular-status';
  status.className = 'glowme-regular-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  document.body.append(status);

  // Real optical presets, not CSS screenshots. The slider drives the actual
  // Meapri engine update() API; the same values power the three preset buttons.
  const presets = [
    { label:'약하게', value:18 },
    { label:'중간', value:50 },
    { label:'강하게', value:90 },
  ];
  let strength = 18;
  let updateFrame = 0;
  const controls = document.createElement('section');
  controls.id = 'glowme-regular-controls';
  controls.className = 'glowme-regular-controls';
  controls.setAttribute('aria-label', 'Meapri Regular 효과 강도 조절');
  controls.hidden = true;
  const heading = document.createElement('div');
  heading.className = 'glowme-regular-heading';
  heading.textContent = 'Liquid Glass 굴절 강도';
  const strengthValue = document.createElement('output');
  strengthValue.id = 'glowme-regular-value';
  strengthValue.textContent = strength + '%';
  const headingRow = document.createElement('div');
  headingRow.className = 'glowme-regular-heading-row';
  headingRow.append(heading, strengthValue);
  const steps = document.createElement('div');
  steps.className = 'glowme-regular-presets';
  const presetButtons = presets.map(preset => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'glowme-regular-preset';
    item.dataset.strength = String(preset.value);
    item.textContent = preset.label;
    item.setAttribute('aria-pressed', String(strength === preset.value));
    steps.append(item);
    return item;
  });
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'glowme-regular-range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.value = String(strength);
  slider.setAttribute('aria-label', 'Liquid Glass 굴절 강도 0에서 100퍼센트');
  slider.setAttribute('aria-controls', 'glowme-regular-value');
  const hint = document.createElement('p');
  hint.className = 'glowme-regular-hint';
  hint.textContent = '슬라이더를 움직이면 실제 엔진이 변경됩니다.';
  controls.append(headingRow, steps, slider, hint);
  document.body.append(controls);

  function optics(value) {
    const t = value / 100;
    // Stronger glass remains light mint: no new palette, no water photography.
    // Chromium's SVG displacement map is actually recomputed as needed.
    return {
      refraction: Math.round(10 + 76 * t),
      blur: Math.round((4 + 6 * t) * 10) / 10,
      tint: 'rgba(234,251,232,' + (0.54 - 0.42 * t).toFixed(3) + ')',
    };
  }
  function syncStrengthUI() {
    slider.value = String(strength);
    strengthValue.textContent = strength + '%';
    slider.setAttribute('aria-valuetext', strength + '퍼센트');
    for (const item of presetButtons) {
      const value = Number(item.dataset.strength);
      item.setAttribute('aria-pressed', String(strength === value));
    }
  }
  function applyStrength() {
    updateFrame = 0;
    if (!enabled || !instances.length) return;
    const settings = optics(strength);
    for (const item of instances) item.glass.update(settings);
  }
  function setStrength(value) {
    strength = Math.max(0, Math.min(100, Number(value) || 0));
    syncStrengthUI();
    if (enabled && !updateFrame) updateFrame = requestAnimationFrame(applyStrength);
  }
  slider.addEventListener('input', () => setStrength(slider.value));
  // Use the same real-engine settings for mouse, touch and keyboard input.
  for (const item of presetButtons) {
    item.addEventListener('click', () => setStrength(item.dataset.strength));
  }
  syncStrengthUI();

  let instances = [];
  let enabled = false;
  let pending = false;
  let modulePromise = null;
  let stylesheet = null;

  const fields = ['backgroundColor','backdropFilter','webkitBackdropFilter',
    'boxShadow','borderRadius','overflow','position','isolation'];

  function message(value) {
    status.textContent = value;
    status.hidden = !value;
  }

  function restore() {
    if (updateFrame) cancelAnimationFrame(updateFrame);
    updateFrame = 0;
    controls.hidden = true;
    for (const item of instances.reverse()) {
      try { item.glass.destroy(); } catch (error) { console.warn('Meapri cleanup', error); }
      for (const name of fields) item.element.style[name] = item.before[name];
      item.element.classList.remove('liquid-glass');
      delete item.element.dataset.glowmeRegular;
    }
    instances = [];
    enabled = false;
    document.documentElement.classList.remove('glowme-engine-on');
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'Regular: OFF';
    message('');
    if (stylesheet) {
      stylesheet.remove();
      stylesheet = null;
    }
  }

  function ensureCSS() {
    if (stylesheet) return;
    stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'vendor/meapri/liquid-glass.css';
    stylesheet.dataset.glowmeMeapri = '1';
    document.head.append(stylesheet);
  }

  function loadEngine() {
    if (!modulePromise) {
      modulePromise = import('./vendor/meapri/liquid-glass.js').catch(error => {
        modulePromise = null;
        throw error;
      });
    }
    return modulePromise;
  }

  function glassFor(element, ctor, profile) {
    if (!element || !element.isConnected) return;
    const before = {};
    const settings = optics(strength);
    for (const name of fields) before[name] = element.style[name];
    // Preserve the existing layout and interactive children while allowing
    // the real engine to own transparent tint and native SVG backdrop filtering.
    element.classList.add('liquid-glass');
    element.dataset.glowmeRegular = profile;
    try {
      const glass = new ctor(element, {
        variant: 'regular',
        profile,
        preset: 'subtle',
        scheme: 'light',
        quality: 'auto',
        radius: 20,
        tint: settings.tint,
        thickness: 30,
        refraction: settings.refraction,
        blur: settings.blur,
        chromaticAberration: 0.015,
        specularIntensity: 0.32,
        edges: true,
      });
      instances.push({ element, glass, before });
    } catch (error) {
      for (const name of fields) element.style[name] = before[name];
      element.classList.remove('liquid-glass');
      delete element.dataset.glowmeRegular;
      throw error;
    }
  }

  async function enable() {
    pending = true;
    button.disabled = true;
    button.textContent = 'Regular: 준비 중';
    message('실제 Meapri 엔진을 불러오는 중…');
    try {
      // No third-party runtime CDN or token-bearing endpoint is requested.
      // The self-hosted, pinned-source module must be installed before toggling.
      const { LiquidGlass } = await loadEngine();
      if (typeof LiquidGlass !== 'function') throw new Error('LiquidGlass export missing');
      ensureCSS();
      document.documentElement.classList.add('glowme-engine-on');
      glassFor(document.querySelector('.topbar'), LiquidGlass, 'bar');
      glassFor(document.querySelector('#sidebar'), LiquidGlass, 'panel');
      if (!instances.length) throw new Error('No suitable panels are present');
      enabled = true;
      controls.hidden = false;
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Regular: ON';
      message('Meapri Regular 적용 중 · 슬라이더로 강도 조절');
    } catch (error) {
      console.error('Glow ME Regular preview failed', error);
      restore();
      message('엔진 실행 실패 · 파일 설치 또는 브라우저 콘솔 확인');
    } finally {
      pending = false;
      button.disabled = false;
    }
  }

  button.addEventListener('click', () => {
    if (pending) return;
    if (enabled) restore();
    else void enable();
  });
  window.addEventListener('pagehide', () => {
    if (enabled) restore();
  }, { once: true });
})();

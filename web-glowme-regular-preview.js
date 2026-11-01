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
        tint: 'rgba(234,251,232,0.26)',
        thickness: 30,
        refraction: 35,
        blur: 7,
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
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Regular: ON';
      message('Meapri Regular 적용됨 · 버튼으로 원래 화면과 비교');
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

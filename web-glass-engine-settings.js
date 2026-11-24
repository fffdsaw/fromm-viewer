import {glassEngine, scheduleGlassPaint} from './web-glass-engine.js?v=glass-engines-20261124';

const labels = {refraction: '굴절 강도', zRadius: '가장자리 폭', edgeHighlight: '가장자리 반사광', blurAmount: '가장자리 흐림', chromAberration: '색수차'};

function paintPattern(pattern) {
  const {width, height} = pattern.getBoundingClientRect();
  if (!width || !height) return;
  const dpr = devicePixelRatio || 1;
  pattern.width = Math.round(width * dpr);
  pattern.height = Math.round(height * dpr);
  const ctx = pattern.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = theme.getPropertyValue('--theme-card').trim();
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = theme.getPropertyValue('--theme-line').trim();
  for (let x = 0; x < width; x += 12) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y < height; y += 12) ctx.fillRect(0, y, width, 1);
  ctx.textAlign = 'center';ctx.textBaseline = 'middle';
  ctx.font = '20px system-ui';ctx.fillStyle = theme.getPropertyValue('--theme-text').trim();
  ctx.fillText('Aa · Fromm · 123', width / 2, height / 2);
  pattern.dataset.glassPaint = String(Number(pattern.dataset.glassPaint || 0) + 1);
  scheduleGlassPaint();
}

export function mountGlassEngineSettings(dialog, preferences) {
  const panel = dialog.querySelector('#settings-panel-glass');
  const nativeControls = panel.querySelector('fieldset');
  const nativeNote = panel.querySelector('.glass-settings-note');
  const stage = panel.querySelector('.glass-settings-preview');
  const caption = stage.querySelector('.glass-preview-caption');
  const label = document.createElement('label');label.className = 'glass-engine-choice';label.append('광학 엔진');
  const select = document.createElement('select');
  select.add(new Option('Meapri Liquid Glass', 'meapri'));
  select.add(new Option('ybouane LiquidGlass', 'ybouane'));
  label.append(select);stage.before(label);
  select.onchange = () => glassEngine.set({engine: select.value});

  const shaderControls = document.createElement('fieldset');
  shaderControls.setAttribute('aria-label', 'ybouane 유리 효과 조절');
  const inputs = new Map();
  for (const [key, text] of Object.entries(labels)) {
    const row = document.createElement('div');row.className = 'glass-setting';
    const name = document.createElement('label');name.htmlFor = `ybouane-glass-${key}`;name.textContent = text;
    const output = document.createElement('output');output.setAttribute('for', name.htmlFor);
    const input = document.createElement('input');input.type = 'range';input.id = name.htmlFor;
    [input.min, input.max] = glassEngine.ranges[key];input.step = key === 'zRadius' ? '1' : '.01';
    input.oninput = () => glassEngine.set({settings: {[key]: Number(input.value)}});
    inputs.set(key, {input, output});row.append(name, output, input);shaderControls.append(row);
  }
  nativeControls.after(shaderControls);
  const status = document.createElement('p');status.className = 'glass-engine-status';status.setAttribute('role', 'status');
  shaderControls.after(status);
  const pattern = document.createElement('canvas');pattern.dataset.glassScene = '';pattern.setAttribute('aria-hidden', 'true');
  stage.prepend(pattern);stage.querySelector('.glass-preview-pattern').hidden = true;
  const redraw = () => paintPattern(pattern);
  new ResizeObserver(redraw).observe(stage);
  window.addEventListener('fromm-theme-change', redraw);
  dialog.querySelector('.glass-settings-reset').addEventListener('click', () => glassEngine.reset());

  function sync() {
    const value = glassEngine.value, webgl = value.engine === 'ybouane';
    const enabled = preferences.value.enabled;
    select.value = value.engine;
    nativeControls.hidden = nativeNote.hidden = webgl;
    shaderControls.hidden = !webgl;shaderControls.disabled = !enabled;
    for (const [key, {input, output}] of inputs) {
      const v = value.settings[key], [min, max] = glassEngine.ranges[key];
      if (input.value !== String(v)) input.value = v;
      input.style.setProperty('--glass-range-fill', `${(v - min) / (max - min) * 100}%`);
      const text = String(Number(v.toFixed(2))) + (key === 'zRadius' ? ' px' : '');
      if (output.value !== text) output.value = text;
    }
    const rendered = stage.querySelector('[data-glass-engine="ybouane"]') ? 'ybouane' : stage.querySelector('[data-glass-material="convex"]') ? 'Meapri' : '';
    const label = enabled && rendered ? `${rendered} 미리보기` : '유리 효과 미리보기';
    if (caption.textContent !== label) caption.textContent = label;
    stage.setAttribute('aria-label', label);
    const text = !webgl ? '' : !enabled ? '유리 효과가 꺼져 있습니다.' : rendered === 'ybouane' ? 'ybouane으로 렌더링 중입니다.' : glassEngine.snapshot.failed ? '이 환경에서 WebGL을 사용할 수 없어 기존 효과를 표시합니다.' : 'ybouane을 표시할 수 없는 배경에는 기존 효과가 적용됩니다.';
    if (status.textContent !== text) status.textContent = text;
  }
  new MutationObserver(sync).observe(stage, {subtree: true, attributes: true, attributeFilter: ['data-glass-engine', 'data-glass-material']});
  preferences.subscribe(sync);glassEngine.subscribe(sync);sync();
}

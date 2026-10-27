'use strict';
// Windows runtime verification. Synthetic media only; never uses account data.
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const exe = path.join(root, 'node_modules/electron/dist/electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; delete env.FROMM_NATIVE_DEBUG;
const parseLines = value => value.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
function run(args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [root, ...args], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('WINDOWS_CHECK_TIMEOUT')); }, timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) { process.stderr.write(stderr.slice(-3000)); reject(new Error('WINDOWS_CHECK_FAILED')); }
      else resolve(parseLines(stdout));
    });
  });
}
function startLoopback() {
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/measure-loopback.ps1'), '-Seconds', '50'],
    { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const readyTimer = setTimeout(() => { child.kill(); readyReject(new Error('LOOPBACK_READY_TIMEOUT')); }, 15000);
  child.stdout.on('data', chunk => {
    stdout += chunk;
    if (parseLines(stdout).some(v => v.stage === 'audio-loopback-ready')) { clearTimeout(readyTimer); readyResolve(); }
  });
  const complete = new Promise(resolve => {
    child.on('error', () => { clearTimeout(readyTimer); readyReject(new Error('LOOPBACK_UNAVAILABLE')); resolve([]); });
    child.on('close', () => {
      clearTimeout(readyTimer);
      if (!parseLines(stdout).some(v => v.stage === 'audio-loopback-ready')) readyReject(new Error('LOOPBACK_UNAVAILABLE'));
      resolve(parseLines(stdout));
    });
  });
  return { ready, complete, stop: () => child.kill() };
}
function checkRelay() {
  const { Decoder, encode } = require('../src/native-wire.cjs');
  const identity = require('../extension-identity.json');
  return new Promise((resolve, reject) => {
    const child = spawn(exe, [path.join(root, 'src/native-relay.cjs'), `chrome-extension://${identity.id}/`],
      { cwd: root, env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let hello = false, left = false;
    const timer = setTimeout(() => { child.kill(); reject(new Error('RELAY_TIMEOUT')); }, 12000);
    const decoder = new Decoder(value => {
      if (value.id === 1 && value.ok && value.backgroundPlayer && value.frameAck && value.targetFps === 30 && value.toolVersion === '0.5.0') {
        hello = true; child.stdin.write(encode({ id: 2, method: 'leave' }));
      } else if (value.id === 2 && value.ok) { left = true; child.stdin.end(); }
    });
    child.stdout.on('data', chunk => { try { decoder.push(chunk); } catch { child.kill(); } });
    child.stderr.resume(); child.stdin.on('error', () => {});
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || !hello || !left) reject(new Error('RELAY_HANDSHAKE_FAILED'));
      else { process.stdout.write(JSON.stringify({ stage: 'native-relay-passed', toolVersion: '0.5.0', backgroundPlayer: true, frameAck: true, targetFps: 30 }) + '\n'); resolve(); }
    });
    child.stdin.write(encode({ id: 1, method: 'hello' }));
  });
}
async function main() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('WINDOWS_X64_REQUIRED');
  require('../src/benchmark-size.cjs').benchmarkSize(process.argv);
  for (const file of [exe, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node', 'node_modules/agora-electron-sdk/build/Release/agora_rtc_sdk.dll']) {
    if (!fs.existsSync(path.resolve(root, file))) throw new Error('RUNTIME_MISSING');
  }
  const self = await run(['--self-test'], 30000);
  if (!self.some(v => v.stage === 'self-test-passed')) throw new Error('SELF_TEST_FAILED');
  await checkRelay();
  const loopback = process.argv.includes('--require-loopback') ? startLoopback() : null;
  try {
    if (loopback) await loopback.ready;
    const frames = await run(['--frame-benchmark', ...process.argv.filter(arg => arg.startsWith('--benchmark-size=') || ['--diagnostics','--delivery-only'].includes(arg))], 65000);
    if (!frames.some(v => v.stage === 'frame-benchmark-passed')) throw new Error('FRAME_BENCHMARK_FAILED');
    if (loopback) {
      const audio = (await loopback.complete).find(v => v.stage === 'audio-loopback-complete');
      if (!audio?.hardwareAudioVerified || !audio.toneStoppedAfterLeave) throw new Error('HIDDEN_AUDIO_OUTPUT_FAILED');
      process.stdout.write(JSON.stringify(audio) + '\n');
    }
  } finally { loopback?.stop(); }
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });

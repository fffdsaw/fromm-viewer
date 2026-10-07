'use strict';
const { ipcRenderer } = require('electron');
const { safeDiagnostic } = require('./contracts.cjs');
// Some SDK exception paths use console.error without enableLogging checks.
for (const method of ['log', 'info', 'debug', 'warn', 'error']) console[method] = () => {};
let sdk, engine, handlers, active = false, joined = false, generation = 0;
let frameTimer;
const tiles = new Map(), diagnostics = [];
function emit(value) {
  const safe = safeDiagnostic(value);
  diagnostics.push(safe); if (diagnostics.length > 80) diagnostics.shift();
  const status = document.getElementById('stage'), log = document.getElementById('diagnostics');
  if (status) status.textContent = `${safe.stage}${safe.code == null ? '' : ` · code ${safe.code}`}`;
  if (log) log.textContent = diagnostics.map(v => JSON.stringify(v)).join('\n');
  ipcRenderer.send('player:status', safe);
}
function checked(stage, call) {
  let code;
  try { code = call(); } catch { emit({ stage: `${stage}-failed` }); throw new Error('SDK_CALL_FAILED'); }
  if (code !== 0) { emit({ stage: `${stage}-failed`, code }); throw new Error('SDK_CALL_FAILED'); }
  emit({ stage, code });
}
function dispose() {
  clearInterval(frameTimer); frameTimer = undefined;
  generation++; active = false; joined = false;
  if (engine) {
    try { engine.unregisterEventHandler(handlers); } catch {}
    try { engine.leaveChannel(); } catch {}
    try { engine.release(); } catch {}
  }
  engine = null; handlers = null; tiles.clear();
  document.getElementById('videos')?.replaceChildren();
}
function startInlineVideo() {
  let sending = false;
  frameTimer = setInterval(() => {
    if (!active || sending) return;
    const canvas = document.querySelector('#videos canvas');
    if (!canvas || canvas.style.display === 'none' || canvas.width < 1 || canvas.height < 1) return;
    sending = true;
    try {
      const jpeg = canvas.toDataURL('image/jpeg', 0.65);
      if (jpeg.length < 800000) ipcRenderer.send('player:frame', { jpeg });
    } catch { emit({ stage: 'inline-frame-failed' }); clearInterval(frameTimer); }
    sending = false;
  }, 100);
}
function loadEngine(appId) {
  if (!sdk) sdk = require('agora-electron-sdk');
  engine = sdk.createAgoraRtcEngine({ enableLogging: false, enableDebugLogging: false, enableArgusCounters: false });
  // Windows NUL device + LogLevelNone: no RTC argument log file.
  checked('initialized', () => engine.initialize({ appId, channelProfile: sdk.ChannelProfileType.ChannelProfileLiveBroadcasting,
    logConfig: { filePath: 'NUL', level: sdk.LogLevel.LogLevelNone } }));
}
function attachRemoteVideo(uid, view, connection) {
  // Explicit remote source + callback connection avoids an unqualified cache
  // in SDK 4.6.2's renderer preset when sourceType is omitted.
  checked('render-attached', () => engine.setupRemoteVideoEx({ uid, view,
    sourceType: sdk.VideoSourceType.VideoSourceRemote, renderMode: sdk.RenderModeType.RenderModeFit }, connection));
}
function start(payload, synthetic = false) {
  dispose();
  const seq = generation;
  loadEngine(payload.appId);
  checked('video-enabled', () => engine.enableVideo());
  checked('local-audio-disabled', () => engine.enableLocalAudio(false));
  checked('local-video-disabled', () => engine.enableLocalVideo(false));
  checked('audience-configured', () => engine.setClientRole(sdk.ClientRoleType.ClientRoleAudience));
  checked('encryption-configured', () => engine.enableEncryption(true, {
    encryptionMode: sdk.EncryptionMode.Aes256Gcm2,
    encryptionKey: payload.encryptionKey,
    encryptionKdfSalt: payload.encryptionKdfSalt,
    datastreamEncryptionEnabled: false
  }));
  emit({ stage: 'encryption-input', keyBytes: Buffer.byteLength(payload.encryptionKey), saltBytes: payload.encryptionKdfSalt.length,
    channelBytes: Buffer.byteLength(payload.channelName), accountBytes: Buffer.byteLength(payload.userAccount), tokenPresent: !!payload.rtcToken, synthetic });
  if (synthetic) {
    const view = document.createElement('div'); document.getElementById('videos').append(view);
    attachRemoteVideo(12345, view, { channelId: payload.channelName, localUid: 67890 });
    const caches = sdk.AgoraEnv.AgoraRendererManager.getRendererCaches();
    if (caches.length !== 1 || caches[0].cacheContext.channelId !== payload.channelName || caches[0].cacheContext.sourceType !== sdk.VideoSourceType.VideoSourceRemote) throw new Error('RENDER_CACHE_INVALID');
    emit({ stage: 'render-cache-verified', synthetic: true });
    dispose(); emit({ stage: 'self-test-passed', keyBytes: 64, saltBytes: 32, synthetic: true, mediaVerified: false }); return;
  }
  active = true;
  const valid = () => active && seq === generation;
  handlers = {
    onJoinChannelSuccess: () => { if (valid()) { joined = true; emit({ stage: 'join-succeeded', mediaVerified: false }); } },
    onError: code => { if (valid()) emit({ stage: 'sdk-failed', code }); },
    onEncryptionError: (_connection, code) => { if (valid()) emit({ stage: 'encryption-error', code }); },
    onConnectionStateChanged: (_connection, state, reason) => { if (valid()) emit({ stage: 'connection-state', code: reason }); },
    onUserJoined: (connection, uid) => {
      if (!valid() || tiles.has(uid)) return;
      const view = document.createElement('div'); view.className = 'video';
      document.getElementById('videos').append(view); tiles.set(uid, view);
      try { attachRemoteVideo(uid, view, connection); } catch {}
      setTimeout(() => {
        if (!valid()) return;
        const canvas = view.querySelector('canvas');
        const visible = canvas && canvas.style.display !== 'none' && canvas.width > 0 && canvas.height > 0;
        emit({ stage: visible ? 'render-canvas-visible' : 'render-canvas-waiting', width: canvas?.width || 0, height: canvas?.height || 0 });
      }, 2500);
    },
    onUserOffline: (_connection, uid) => { if (valid()) { tiles.get(uid)?.remove(); tiles.delete(uid); } },
    onFirstRemoteVideoDecoded: (_connection, _uid, width, height) => { if (valid()) emit({ stage: 'video-decoded', width, height }); },
    onFirstRemoteVideoFrame: (_connection, _uid, width, height) => { if (valid()) emit({ stage: 'video-frame', width, height, mediaVerified: true }); },
    onFirstRemoteAudioDecoded: () => { if (valid()) emit({ stage: 'audio-frame', mediaVerified: false }); },
    onTokenPrivilegeWillExpire: () => { if (valid()) emit({ stage: 'token-renew-needed' }); },
    onRequestToken: () => { if (valid()) emit({ stage: 'token-renew-needed' }); }
  };
  engine.registerEventHandler(handlers);
  checked('join-requested', () => engine.joinChannelWithUserAccount(payload.rtcToken, payload.channelName, payload.userAccount, {
    channelProfile: sdk.ChannelProfileType.ChannelProfileLiveBroadcasting,
    clientRoleType: sdk.ClientRoleType.ClientRoleAudience,
    autoSubscribeAudio: true, autoSubscribeVideo: true,
    publishCameraTrack: false, publishMicrophoneTrack: false, enableAudioRecordingOrPlayout: true
  }));
  setTimeout(() => { if (valid() && !joined) emit({ stage: 'join-timeout', mediaVerified: false }); }, 20000);
}
ipcRenderer.on('player:command', (_event, command) => {
  try {
    if (command.type === 'leave') { dispose(); emit({ stage: 'left' }); }
    else if (command.type === 'renew' && active) checked('token-renewed', () => engine.renewToken(command.token));
    else if (command.type === 'join') { start(command.payload); if (command.inlineVideo) startInlineVideo(); }
    else if (command.type === 'self-test') start(command.payload, true);
  } catch { dispose(); emit({ stage: command.type === 'self-test' ? 'self-test-failed' : 'native-failed' }); }
  finally { if (command.payload) { command.payload.encryptionKey = ''; command.payload.rtcToken = ''; command.payload.encryptionKdfSalt?.fill(0); } command.token = ''; }
});
window.addEventListener('DOMContentLoaded', () => ipcRenderer.send('player:ready'));
window.addEventListener('beforeunload', dispose);
